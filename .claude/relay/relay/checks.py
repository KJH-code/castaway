"""Checks around an apply (v0.3): placeholder ("lazy") code, a quick syntax check of the files that
changed, and a compact summary of a failing test run for the next request."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tomllib

# ---------------------------------------------------------------- placeholders instead of code

_LAZY = re.compile(
    r"^\s*(?:#|//|/\*+|\*|<!--|--|;|%)?\s*(?:\.\.\.|…)\s*(?:\(|\[)?\s*"
    r"(?:existing|unchanged|rest|remaining|same as|previous|omitted|생략|기존|나머지|동일|이전|그대로|위와|아래와)"
    r"|^\s*(?:#|//|/\*+|<!--)\s*(?:rest of (?:the )?(?:file|code|class|function)|remaining (?:code|methods)|"
    r"existing code|(?:code|methods?) (?:unchanged|omitted)|unchanged code|나머지 (?:코드|부분)?\s*(?:생략|동일|그대로)|"
    r"(?:이하|이전|기존) (?:코드 )?(?:생략|동일|그대로))",
    re.I,
)


def lazy_lines(new_text: str, old_text: str | None) -> list:
    """Lines that stand in for code ("// ... existing code ...") and are not in the old file."""
    old = set((old_text or "").split("\n"))
    return [ln.strip() for ln in new_text.split("\n") if _LAZY.search(ln) and ln not in old][:3]


# ---------------------------------------------------------------- syntax check

def _node_cmd():
    """Node for `--check`: RELAY_NODE (the app's own runtime) or `node` on PATH."""
    exe = os.environ.get("RELAY_NODE") or shutil.which("node")
    if not exe:
        return None, None
    env = dict(os.environ)
    if os.environ.get("RELAY_NODE_ELECTRON") == "1":
        env["ELECTRON_RUN_AS_NODE"] = "1"
    return exe, env


def _head_text(root, rel):
    """The committed version of a file (None when it is new)."""
    try:
        proc = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=str(root), capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return proc.stdout.decode("utf-8", "replace") if proc.returncode == 0 else None


def _node_check(root, full, node):
    exe, env = node
    proc = subprocess.run([exe, "--check", full], cwd=str(root), env=env, capture_output=True,
                          text=True, encoding="utf-8", errors="replace", timeout=30)
    if proc.returncode == 0:
        return ""
    return "\n".join(ln for ln in (proc.stderr or "").splitlines() if ln.strip())[:600] or "syntax error"


def syntax_errors(root, paths) -> list:
    """[(path, message)] for changed files that do not even parse. Unknown kinds are skipped.

    A checker that does not understand a project's dialect (JSX or TypeScript-only syntax in .js,
    Python 2) must never block applies: an error only counts when the committed version of the
    same file passes the same check (or, for a new file, when it is not a JSX-looking error)."""
    errors = []
    node = None
    for rel in paths:
        full = os.path.join(str(root), rel)
        if not os.path.isfile(full):
            continue
        low = rel.lower()
        try:
            if low.endswith((".py", ".pyi")):
                with open(full, encoding="utf-8", errors="replace") as fh:
                    source = fh.read()
                try:
                    compile(source, rel, "exec", dont_inherit=True)
                except SyntaxError as exc:
                    before = _head_text(root, rel)
                    if before is not None:
                        try:
                            compile(before, rel, "exec", dont_inherit=True)
                        except SyntaxError:
                            continue  # it did not parse before either: not this checker's business
                    errors.append((rel, f"line {exc.lineno}: {exc.msg}"))
            elif low.endswith(".json"):
                with open(full, encoding="utf-8") as fh:
                    try:
                        json.load(fh)
                    except ValueError as exc:
                        errors.append((rel, str(exc)))
            elif low.endswith(".toml"):
                with open(full, "rb") as fh:
                    try:
                        tomllib.load(fh)
                    except tomllib.TOMLDecodeError as exc:
                        errors.append((rel, str(exc)))
            elif low.endswith((".js", ".mjs", ".cjs")):
                if node is None:
                    node = _node_cmd()
                if not node[0]:
                    continue
                msg = _node_check(root, full, node)
                if not msg:
                    continue
                before = _head_text(root, rel)
                if before is None:
                    if "Unexpected token '<'" in msg:
                        continue  # JSX in a .js file: node cannot read it
                else:
                    import tempfile
                    with tempfile.TemporaryDirectory() as tmp:
                        probe = os.path.join(tmp, os.path.basename(rel))
                        with open(probe, "w", encoding="utf-8") as fh:
                            fh.write(before)
                        if _node_check(root, probe, node):
                            continue  # the committed file fails too: node does not understand this dialect
                errors.append((rel, msg.replace(full, rel)))
        except (OSError, subprocess.SubprocessError) as exc:
            continue  # a checker that cannot run never blocks the apply
    return errors


# ---------------------------------------------------------------- failing test output

_ANSI = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
_PASS = re.compile(
    r"^\s*(?:ok \d+\b|✓|✔|PASS(?:ED)?\b|\.+\s*$|# (?:pass|tests|suites|todo|skipped|duration_ms)\b|"
    r"test .* \.\.\. ok$|.*\bPASSED\b|=+ \d+ passed)", re.I,
)
_FAIL = re.compile(
    r"(?:\bFAIL(?:ED|URE)?\b|\bERROR\b|Error\b|Exception\b|Traceback|assert|not ok\b|expected|actual|"
    r"panicked|✗|✖|×|\bE\s{2,}|SyntaxError|TypeError|ReferenceError|undefined|cannot find|no such)", re.I,
)
_NOISE = re.compile(r"node_modules[/\\]|site-packages[/\\]|node:internal|<frozen |internal/|\bat process\.|"
                    r"\bat Module\.|\bat Object\.<anonymous>|\bat new Promise|\bat async Promise")


def summarize(output: str, limit: int = 4000) -> str:
    """Failing lines with a little context, library stack frames dropped, repeats folded. Falls back to
    the tail when nothing looks like a failure."""
    lines = [_ANSI.sub("", ln).rstrip() for ln in (output or "").replace("\r\n", "\n").split("\n")]
    keep = set()
    for i, ln in enumerate(lines):
        if _FAIL.search(ln) and not _PASS.match(ln):
            for k in range(max(0, i - 2), min(len(lines), i + 6)):
                keep.add(k)
    picked, last, prev, repeat = [], -2, None, 0
    for i in sorted(keep):
        ln = lines[i]
        if not ln.strip() or _PASS.match(ln) or _NOISE.search(ln):
            continue
        if ln == prev:
            repeat += 1
            continue
        if repeat:
            picked.append(f"    (same line {repeat} more time{'s' if repeat > 1 else ''})")
            repeat = 0
        if i > last + 1 and picked:
            picked.append("...")
        picked.append(ln[:400])
        prev, last = ln, i
    if repeat:
        picked.append(f"    (same line {repeat} more time{'s' if repeat > 1 else ''})")
    text = "\n".join(picked).strip()
    if not text:
        text = "\n".join(ln for ln in lines if ln.strip())[-limit:]
    if len(text) > limit:
        text = text[: limit // 2] + "\n...\n" + text[-limit // 2:]
    return text
