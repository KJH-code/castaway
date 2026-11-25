"""Apply a RELAY response (or a plain patch) to the working tree (spec section 9)."""
from __future__ import annotations

import posixpath
import re
import shlex
import stat
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from . import checks, clip, snapshot, symbols
from . import state as st
from .config import Config
from .errors import ERR, GIT, OK, PARSE, SAFETY, TESTFAIL, RelayError
from .fsutil import atomic_write
from .edit import EditError, apply_search_replace, fuzzy_patch
from .parse import (
    Delete, Edit, ParseError, ParsedResponse, Patch, SymbolEdit, TruncatedError, Write, merge_partial,
    parse_patch_file, parse_response,
)
from .repo import current_branch, dirty_paths, head_sha, relay_dir, run_git
from .safety import validate_ops

REPAIR = (
    "Your previous reply could not be parsed: {err}. Re-send the complete reply as ONE fenced "
    "code block following the RELAY grammar exactly. Do not add text outside the block."
)
REPAIR_CUT = (
    "Your previous reply could not be parsed completely: it was cut off before <<<RELAY:END>>> "
    "(probably the output limit). {kept}Reply with ONE new fenced RELAY block (BEGIN ... END) that "
    "contains ONLY the remaining operations, starting again with {cut}. Keep it short: change "
    "existing files with EDIT blocks instead of whole files; if it is still long, send the first "
    "part, end it properly with <<<RELAY:END>>>, and list what is left in NOTE."
)
OWNED_STATES = ("failed", "applied_no_commit")  # dirty trees that relay itself left behind


@dataclass
class ApplyOptions:
    no_test: bool = False
    no_commit: bool = False
    dry_run: bool = False
    allow_delete: bool = False


def _err(msg: str) -> None:
    print(msg, file=sys.stderr)


def _norm(path: str) -> str:
    return posixpath.normpath(path)


def _tail(text: str, n: int) -> str:
    return text if len(text) <= n else "[...]\n" + text[-n:]


class OpError(RelayError):
    """An EDIT or PATCH did not fit the current file; `paths` are the files involved."""

    def __init__(self, message: str, paths):
        super().__init__(message, GIT)
        self.paths = list(paths)


def _read_text(root: Path, rel: str):
    path = root / _norm(rel)
    if not path.is_file():
        return None
    data = path.read_bytes()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        raise OpError(f"{rel} is not a UTF-8 text file", [rel])


def _write_text(root: Path, rel: str, text: str) -> None:
    dest = root / _norm(rel)
    mode = stat.S_IMODE(dest.stat().st_mode) if dest.is_file() else None
    atomic_write(dest, text.encode("utf-8"), mode)


GIT_APPLY = ["apply", "--recount", "--whitespace=nowarn"]


def _plan_patch(root: Path, op: Patch):
    """None if git can apply the patch as it is, else {path: new_text} from the fuzzy fallback."""
    check = run_git(root, *GIT_APPLY, "--check", input=op.diff, check=False)
    if check.returncode == 0:
        return None
    try:
        results = fuzzy_patch(lambda p: _read_text(root, p), op.diff)
    except EditError as exc:
        reason = check.stderr.strip().splitlines()
        raise OpError(
            f"patch for {', '.join(op.paths)} does not apply: {reason[0] if reason else 'git apply failed'}"
            f" (fuzzy match: {exc})", op.paths,
        )
    allowed = {_norm(p) for p in op.paths}
    stray = [p for p in results if _norm(p) not in allowed]
    if stray:  # never write a path that the safety check did not see
        raise OpError(f"patch headers disagree about the file names ({stray[0]})", op.paths)
    return results


def _plan_edit(root: Path, op: Edit, report=None) -> tuple:
    current = _read_text(root, op.path)
    if current is None:
        raise OpError(f"edit for {op.path} did not match: the file does not exist (use FILE write)", [op.path])
    for number, (search, replace) in enumerate(op.sections, 1):
        lazy = checks.lazy_lines("\n".join(replace), "\n".join(search))
        if lazy:
            raise OpError(
                f"edit for {op.path} section {number} puts a placeholder where code should be ({lazy[0]!r}); "
                "write out the real lines", [op.path],
            )
    try:
        return apply_search_replace(current, op.sections, report)
    except EditError as exc:
        raise OpError(f"edit for {op.path} did not match: {exc}", [op.path])


def _plan_symbol(root: Path, op: SymbolEdit) -> str:
    current = _read_text(root, op.path)
    if current is None:
        raise OpError(f"SYMBOL for {op.path}: the file does not exist (use FILE write)", [op.path])
    lazy = checks.lazy_lines(op.text, current)
    if lazy:
        raise OpError(f"SYMBOL {op.name} in {op.path} puts a placeholder where code should be ({lazy[0]!r})", [op.path])
    try:
        return symbols.replace(op.path, current, op.name, op.text)
    except symbols.SymbolError as exc:
        raise OpError(f"SYMBOL {op.name} in {op.path}: {exc}", [op.path])


def _check_lazy_write(root: Path, op: Write) -> None:
    """A FILE write of an existing file that leaves parts out ("// ... existing code ...") would delete them."""
    try:
        old = _read_text(root, op.path)
    except OpError:
        return
    if old is None:
        return
    lazy = checks.lazy_lines(op.text, old)
    if lazy and (op.text.count("\n") < 0.9 * old.count("\n") or old.count("\n") >= 20):
        raise OpError(
            f"FILE write for {op.path} leaves code out ({lazy[0]!r}); send the complete file, or EDIT/SYMBOL "
            "blocks for the parts that change", [op.path],
        )


def _execute(root: Path, ops, report=None) -> set:
    """Run the operations in order. Returns the paths that needed fuzzy matching."""
    fuzzy = set()
    for op in ops:
        if isinstance(op, Write):
            _check_lazy_write(root, op)
            dest = root / _norm(op.path)
            data, mode = op.text.encode("utf-8"), None
            if dest.is_file():
                if b"\r\n" in dest.read_bytes():  # C-6: preserve CRLF files
                    data = data.replace(b"\n", b"\r\n")
                mode = stat.S_IMODE(dest.stat().st_mode)
            atomic_write(dest, data, mode)
        elif isinstance(op, Delete):
            dest = root / _norm(op.path)
            if not dest.is_file():
                raise RelayError(f"cannot delete missing file: {op.path}", ERR)
            dest.unlink()
        elif isinstance(op, Edit):
            notes = [] if report is not None else None
            text, was_fuzzy = _plan_edit(root, op, notes)
            _write_text(root, op.path, text)
            if was_fuzzy:
                fuzzy.add(_norm(op.path))
            if notes:
                report.extend(f"{op.path}: {n}" for n in notes)
        elif isinstance(op, SymbolEdit):
            _write_text(root, op.path, _plan_symbol(root, op))
        elif isinstance(op, Patch):
            planned = _plan_patch(root, op)
            if planned is None:
                run_git(root, *GIT_APPLY, input=op.diff)
            else:
                for path, text in planned.items():
                    _write_text(root, path, text)
                    fuzzy.add(_norm(path))
    return fuzzy


def _run_hooks(root: Path, cfg: Config, no_test: bool):
    """Run post_apply hooks then the test command. Returns (ok, failed_cmd, output)."""
    commands = list(cfg.post_apply)
    if cfg.test_quick and not no_test:
        commands.append(cfg.test_quick)  # fast, focused tests first: a failure here skips the full run
    if cfg.test and not no_test:
        commands.append(cfg.test)
    sections, ok, failed, failed_output = [], True, None, ""
    for cmd in commands:
        started = time.time()
        try:
            proc = subprocess.run(  # hooks come from config only (C-3); the one shell=True use
                cmd, shell=True, cwd=str(root), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", timeout=cfg.timeout_sec,
            )
            code, output = proc.returncode, proc.stdout or ""
        except subprocess.TimeoutExpired as exc:
            raw = exc.stdout or ""
            raw = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw
            code, output = 124, raw + f"\n[timed out after {cfg.timeout_sec}s]"
        header = f"$ {cmd}\n# exit: {code}  duration: {time.time() - started:.1f}s\n"
        if code != 0:
            ok, failed, failed_output = False, cmd, output
            summary = checks.summarize(output, cfg.log_tail_chars)
            sections.append(header + "# failing lines (summarized by relay; full output: .relay/last_run_full.log)\n" + summary)
            atomic_write(relay_dir(root) / "last_run_full.log", (header + output).encode("utf-8"))
            break
        sections.append(header + "(output omitted)\n")
    stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
    body = "\n".join(sections) if sections else "(no hooks configured)\n"
    log = f"# relay run {stamp}\n{body}"
    atomic_write(relay_dir(root) / "last_run.log", log.encode("utf-8"))
    return ok, failed, failed_output


def _stageable(root: Path, paths) -> list:
    """Paths that `git add` may take: not ignored, and either present or tracked (two git calls)."""
    if not paths:
        return []
    out = run_git(root, "check-ignore", "--stdin", "-z", input="\0".join(paths) + "\0", check=False).stdout
    ignored = {p for p in out.split("\0") if p}
    out = run_git(root, "--literal-pathspecs", "ls-files", "-z", "--", *paths, check=False).stdout
    tracked = {p for p in out.split("\0") if p}
    return [p for p in paths if p not in ignored and ((root / p).exists() or p in tracked)]


def _commit(root: Path, paths, message: str):
    stage = _stageable(root, list(paths))
    if stage:
        run_git(root, "--literal-pathspecs", "add", "-A", "--", *stage)
    if run_git(root, "diff", "--cached", "--quiet", check=False).returncode == 0:
        return None  # nothing staged
    line = re.sub(r"[\x00-\x1f\x7f]", "", message.splitlines()[0] if message.strip() else "")[:72]
    run_git(root, "commit", "-m", line or "relay: update files")
    return head_sha(root)


def _new_branch(root: Path, cfg: Config) -> str:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    name, n = f"{cfg.branch_prefix}{stamp}", 1
    while run_git(root, "rev-parse", "--verify", "-q", f"refs/heads/{name}", check=False).returncode == 0:
        n += 1
        name = f"{cfg.branch_prefix}{stamp}-{n}"
    run_git(root, "checkout", "-b", name)
    return name


def _rollback(root: Path, snap_id: str) -> None:
    snapshot.restore(root, snap_id)
    snapshot.discard(root, snap_id)


def _report_no_ops(root: Path, parsed: ParsedResponse) -> int:
    for note in parsed.notes:
        print(f"NOTE:\n{note}")
    if parsed.needs:
        cmd = "relay pack --cont --files " + " ".join(shlex.quote(p) for p in parsed.needs)
        where = clip.copy(cmd, root)
        print("The reply asks for more files:\n  " + "\n  ".join(parsed.needs))
        print(f"Next step (copied to {'the clipboard' if where == 'clipboard' else where}): {cmd}")
    elif not parsed.notes:
        print("The reply contains no file operations; nothing to apply.")
    return OK


def _dry_run(root: Path, parsed: ParsedResponse) -> int:
    for op in parsed.ops:
        if isinstance(op, Write):
            print(f"would write  {op.path}")
        elif isinstance(op, Delete):
            print(f"would delete {op.path}")
        elif isinstance(op, Edit):
            try:
                _, was_fuzzy = _plan_edit(root, op)
            except OpError as exc:
                _err(f"relay: {exc}")
                return GIT
            print(f"would edit   {op.path}{' (fuzzy match)' if was_fuzzy else ''}")
        elif isinstance(op, SymbolEdit):
            try:
                _plan_symbol(root, op)
            except OpError as exc:
                _err(f"relay: {exc}")
                return GIT
            print(f"would replace {op.name} in {op.path}")
        elif isinstance(op, Patch):
            try:
                planned = _plan_patch(root, op)
            except OpError as exc:
                _err(f"relay: {exc}")
                return GIT
            print(f"would patch  {', '.join(op.paths)}{'' if planned is None else ' (fuzzy match)'}")
    print("dry run: nothing was changed.")
    return OK


def run_apply(root, cfg: Config, text: str, *, is_patch: bool = False, opts: ApplyOptions | None = None) -> int:
    opts = opts or ApplyOptions()
    root = Path(root)
    relay_dir(root).mkdir(parents=True, exist_ok=True)

    # A-2: parse (a reply that was cut off keeps its complete blocks for the next reply)
    state = st.load(root)
    try:
        parsed = parse_patch_file(text) if is_patch else parse_response(text)
    except TruncatedError as exc:
        if exc.complete and not opts.dry_run:
            state["partial"] = list(state["partial"]) + [exc.complete]
            st.save(root, state)
        kept = f"relay kept the complete part ({', '.join(exc.done)}); " if exc.done else ""
        atomic_write(relay_dir(root) / "last_error.txt", (str(exc) + "\n").encode("utf-8"))
        where = clip.copy(REPAIR_CUT.format(kept=kept, cut=exc.cut), root)
        _err(f"relay: the response could not be parsed: {exc} (last block: {exc.cut})")
        if exc.done:
            _err(f"Kept for the next reply: {', '.join(exc.done)}")
        _err(f"A repair prompt was placed on {'the clipboard' if where == 'clipboard' else where}.")
        return PARSE
    except ParseError as exc:
        atomic_write(relay_dir(root) / "last_error.txt", (str(exc) + "\n").encode("utf-8"))
        where = clip.copy(REPAIR.format(err=exc), root)
        _err(f"relay: the response could not be parsed: {exc}")
        _err(f"A repair prompt was placed on {'the clipboard' if where == 'clipboard' else where}.")
        return PARSE
    if state["partial"] and not is_patch and parsed.ops:  # a NEED/NOTE-only reply leaves them waiting
        try:
            parsed = merge_partial(state["partial"], parsed)
        except ParseError:
            state["partial"] = []  # saved blocks went stale; drop them
        else:
            print(f"Merged {len(state['partial'])} saved part(s) of earlier cut-off replies.")

    # A-3: nothing to apply
    if not parsed.ops:
        return _report_no_ops(root, parsed)

    # A-4: safety validation before any write
    violations = validate_ops(root, cfg, parsed.ops, opts.allow_delete or cfg.allow_delete)
    if violations:
        for rule, path, msg in violations:
            _err(f"relay: {rule} {path}: {msg}")
        _err("Nothing was changed.")
        return SAFETY

    # A-5: dry run
    if opts.dry_run:
        return _dry_run(root, parsed)

    # A-6: git pre-flight (untracked files only matter if the reply would overwrite them)
    writes = [_norm(o.path) for o in parsed.ops if isinstance(o, Write)]
    deletes = [_norm(o.path) for o in parsed.ops if isinstance(o, Delete)]
    patched = [_norm(p) for o in parsed.ops if isinstance(o, Patch) for p in o.paths]
    edited = [_norm(o.path) for o in parsed.ops if isinstance(o, (Edit, SymbolEdit))]
    touched = list(dict.fromkeys(writes + edited + deletes + patched))
    dirty = dirty_paths(root)
    tracked_dirty = [(xy, path) for xy, path in dirty if xy != "??"]
    if tracked_dirty and not (cfg.allow_dirty or state["status"] in OWNED_STATES):
        _err("relay: the working tree has uncommitted changes (commit, stash, or set git.allow_dirty):")
        for xy, path in tracked_dirty[:10]:
            _err(f"  {xy} {path}")
        return GIT
    clobber = [path for xy, path in dirty if xy == "??" and path in touched and path not in state["pending_paths"]]
    if clobber:
        _err("relay: the reply would overwrite untracked files; move or commit them first:")
        for path in clobber[:10]:
            _err(f"  ?? {path}")
        return GIT
    branch = current_branch(root)
    if cfg.auto_branch and branch is None:
        _err("relay: HEAD is detached; check out a branch or set git.auto_branch = false")
        return GIT

    # A-8: snapshot
    snap_id = snapshot.create(
        root, touched=touched, deletes=set(deletes), head=head_sha(root),
        prior_pending=state["pending_paths"], prior_status=state["status"],
        prior_snapshot=state["last_snapshot"],
    )

    # A-9: execute (all-or-nothing)
    report = []
    try:
        fuzzy = _execute(root, parsed.ops, report)
        need_branch = (
            cfg.auto_branch and branch is not None and not tracked_dirty and branch != state["branch"]
            and not branch.startswith(cfg.branch_prefix)
        )
        if need_branch:  # A-7 (done after the ops so a failed apply leaves no stray branch)
            state["branch"] = _new_branch(root, cfg)
        elif branch and branch.startswith(cfg.branch_prefix):
            state["branch"] = branch
    except OpError as exc:  # an EDIT/PATCH did not fit: keep the rest of the reply for the fix
        _rollback(root, snap_id)
        if not is_patch:
            others = [op for op in parsed.ops if not {_norm(p) for p in _op_paths(op)} & set(map(_norm, exc.paths))]
            state["partial"] = [_blocks_text(others)] if others else []
        state["reject_note"] = str(exc)
        state["retry_files"] = list(dict.fromkeys(_norm(p) for p in exc.paths))
        st.save(root, state)
        _err(f"relay: apply failed, changes rolled back: {exc}")
        _err("Run `relay pack --cont` to send the problem and the current file(s) back to the same chat.")
        return exc.code
    except RelayError as exc:
        _rollback(root, snap_id)
        _err(f"relay: apply failed, changes rolled back: {exc}")
        return exc.code
    except Exception as exc:  # I/O errors etc.
        _rollback(root, snap_id)
        _err(f"relay: apply failed, changes rolled back: {exc}")
        return ERR

    state["last_snapshot"] = snap_id
    state["last_commit"] = None
    state.update(partial=[], reject_note=None, retry_files=[])
    pending = list(dict.fromkeys(state["pending_paths"] + touched))
    _remember_seen(root, touched, set(deletes), fuzzy, set(writes))
    extra = f", edited {len(edited)}" if edited else ""
    print(f"Applied: wrote {len(writes)}, deleted {len(deletes)}, patched {len(patched)} file(s){extra}.")
    if fuzzy:
        print(f"Fuzzy-matched (re-sent next round): {', '.join(sorted(fuzzy))}")
    for line in report:
        print(f"Edit note: {line}")
    for note in parsed.notes:  # e.g. "part 1 of 2 — next: …" (delegate-manager reads it to continue)
        print(f"NOTE:\n{note}")

    # A-10a: a quick syntax check of the changed files (faster and more precise than a failing test run)
    if cfg.syntax_check and not opts.no_test:
        bad = checks.syntax_errors(root, [p for p in touched if p not in deletes])
        if bad:
            body = "\n".join(f"{p}: {msg}" for p, msg in bad)
            stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
            atomic_write(relay_dir(root) / "last_run.log",
                         f"# relay run {stamp}\n$ (relay syntax check)\n# the changed files do not parse:\n{body}\n".encode("utf-8"))
            state.update(status="failed", pending_paths=pending)
            st.save(root, state)
            _err("relay: syntax check failed:")
            _err(body)
            _err("Changes stay applied. Run `relay pack --cont` to send the error to the same chat, or `relay undo`.")
            return TESTFAIL

    # A-10: hooks and tests
    ok, failed_cmd, failed_output = _run_hooks(root, cfg, opts.no_test)
    if not ok:  # A-11
        state.update(status="failed", pending_paths=pending)
        st.save(root, state)
        _err(f"relay: `{failed_cmd}` failed. Last output:")
        _err("\n".join(failed_output.splitlines()[-40:]))
        _err("Changes stay applied. Run `relay pack --cont` to send the failure to the same chat, or `relay undo`.")
        return TESTFAIL

    # A-12: commit
    if cfg.auto_commit and not opts.no_commit:
        message = parsed.commit or f"relay: update {len(touched)} files"
        try:
            sha = _commit(root, pending, message)
        except RelayError as exc:
            state.update(status="applied_no_commit", pending_paths=pending)
            st.save(root, state)
            _err(f"relay: tests passed but the commit failed: {exc}")
            return exc.code
        state.update(status="ok", last_commit=sha, pending_paths=[])
        st.save(root, state)
        if sha:
            print(f"Committed {sha[:8]} on {current_branch(root) or '(detached)'}: {message.splitlines()[0][:72]}")
        else:
            print("Nothing to commit (the working tree already matches HEAD).")
    else:
        state.update(status="applied_no_commit", pending_paths=pending)
        st.save(root, state)
        print("Applied without committing (auto_commit is off or --no-commit was given).")
    return OK


def _op_paths(op) -> list:
    return list(op.paths) if isinstance(op, Patch) else [op.path]


def _blocks_text(ops) -> str:
    """Serialize operations back into RELAY blocks (kept across a rejected reply)."""
    out = []
    for op in ops:
        if isinstance(op, Write):
            out.append(f'<<<RELAY:FILE path="{op.path}" action="write">>>\n{op.text.rstrip(chr(10))}')
        elif isinstance(op, Delete):
            out.append(f'<<<RELAY:FILE path="{op.path}" action="delete">>>')
        elif isinstance(op, Edit):
            body = [f'<<<RELAY:EDIT path="{op.path}">>>']
            for search, replace in op.sections:
                body += ["<<<<<<< SEARCH", *search, "=======", *replace, ">>>>>>> REPLACE"]
            out.append("\n".join(body))
        elif isinstance(op, SymbolEdit):
            out.append(f'<<<RELAY:SYMBOL path="{op.path}" name="{op.name}">>>\n{op.text.rstrip(chr(10))}')
        elif isinstance(op, Patch):
            out.append("<<<RELAY:PATCH>>>\n" + op.diff.rstrip("\n"))
    return "\n".join(out)


def _remember_seen(root: Path, touched, deletes: set, fuzzy: set, full_writes=frozenset()) -> None:
    """The chat knows what it just wrote: mark those contents as seen (not fuzzy results). A file it
    only knew in part (an outline or slices) stays unseen unless the reply wrote it whole."""
    seen = st.load_seen(root)
    if seen is None:
        return
    for path in touched:
        if path in deletes or path in fuzzy or (path not in seen and path not in full_writes):
            seen.pop(path, None)
            continue
        try:
            text = _read_text(root, path)
        except OpError:
            text = None
        if text is None:
            seen.pop(path, None)
        else:
            seen[path] = st.text_hash(text)
    st.save_seen(root, seen)


def run_undo(root, cfg: Config) -> int:
    """Undo exactly one apply (U-1, U-2)."""
    root = Path(root)
    state = st.load(root)
    head = head_sha(root)
    if state["last_commit"]:
        if state["last_commit"] != head:
            _err("relay: HEAD moved since the last apply; revert it yourself with `git revert`.")
            return GIT
        run_git(root, "revert", "--no-edit", "HEAD")
        state.update(status="undone", last_commit=None, pending_paths=[], last_snapshot=None)
        st.save(root, state)
        print("Reverted the last relay commit.")
        return OK
    snap_id = state["last_snapshot"]
    if not snapshot.exists(root, snap_id):
        _err("relay: nothing to undo.")
        return ERR
    manifest = snapshot.restore(root, snap_id)
    prior_status = manifest.get("prior_status", "none")
    prior_pending = manifest.get("prior_pending", [])
    if prior_status in OWNED_STATES and prior_pending:
        state.update(status=prior_status, pending_paths=prior_pending, last_snapshot=manifest.get("prior_snapshot"))
    else:
        state.update(status="undone", pending_paths=[], last_snapshot=None)
    snapshot.discard(root, snap_id)
    st.save(root, state)
    print("Restored the files from before the last apply.")
    return OK
