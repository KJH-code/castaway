"""Command-line interface (spec section 5)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__, clip, zipper
from .apply import ApplyOptions, run_apply, run_undo
from .config import load_config
from .errors import ERR, OK, RelayError
from .pack import build_request, template
from .repo import find_root, relay_dir, run_git


class _Parser(argparse.ArgumentParser):
    def error(self, message):  # usage errors exit with code 1, not argparse's default 2
        self.print_usage(sys.stderr)
        raise RelayError(message, ERR)


def build_parser() -> argparse.ArgumentParser:
    parser = _Parser(prog="relay", description="Relay between a manual chat session and a git repository.")
    parser.add_argument("--repo", metavar="PATH", help="repository path (default: current directory)")
    parser.add_argument("--version", action="version", version=f"relay {__version__}")
    sub = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)

    p_init = sub.add_parser("init", help="create .relay/ with default files")
    p_init.add_argument("--force", action="store_true", help="overwrite existing files")

    p_pack = sub.add_parser("pack", help="build the request and copy it to the clipboard")
    p_pack.add_argument("task", nargs="?", help="what you want done (or pipe text / write .relay/task.txt)")
    p_pack.add_argument("--skill", help="name of a template in .relay/prompts/")
    p_pack.add_argument("--files", nargs="+", metavar="PATH", help="extra repo-relative files to include")
    p_pack.add_argument("--no-diff", action="store_true", help="leave out the git diff")
    p_pack.add_argument(
        "-c", "--cont", action="store_true",
        help="continue the same chat: skip the instructions, rules and tree, and files it already has",
    )
    p_pack.add_argument("--out", default="clipboard", metavar="clipboard|stdout|FILE")
    p_pack.add_argument("--model", default="", help="the chat model (haiku: small files may be sent whole)")

    p_apply = sub.add_parser("apply", help="apply a reply from the chat, run tests, commit")
    p_apply.add_argument("--from", dest="source", default=None, metavar="clipboard|FILE|-")
    p_apply.add_argument("--patch", metavar="FILE", help="apply a plain unified diff (sandbox mode)")
    p_apply.add_argument("--no-test", action="store_true")
    p_apply.add_argument("--no-commit", action="store_true")
    p_apply.add_argument("--dry-run", action="store_true")
    p_apply.add_argument("--allow-delete", action="store_true")

    sub.add_parser("undo", help="undo the last apply")

    p_zip = sub.add_parser("zip", help="build an upload bundle for the chat's code sandbox")
    p_zip.add_argument("--out", metavar="FILE")
    return parser


def cmd_init(root: Path, force: bool) -> int:
    rd = relay_dir(root)
    (rd / "prompts").mkdir(parents=True, exist_ok=True)
    for rel in ("rules.md", "config.toml", "prompts/review.md", "prompts/tdd.md"):
        dest = rd / rel
        if dest.exists() and not force:
            print(f"exists, skipped (use --force): .relay/{rel}")
            continue
        dest.write_text(template(*rel.split("/")), encoding="utf-8")
        print(f"created: .relay/{rel}")
    raw = run_git(root, "rev-parse", "--git-path", "info/exclude").stdout.strip()
    exclude = Path(raw) if Path(raw).is_absolute() else root / raw
    exclude.parent.mkdir(parents=True, exist_ok=True)
    existing = exclude.read_text(encoding="utf-8") if exclude.exists() else ""
    if ".relay/" not in existing.splitlines():
        prefix = "" if not existing or existing.endswith("\n") else "\n"
        exclude.write_text(existing + prefix + ".relay/\n", encoding="utf-8")
        print("added .relay/ to .git/info/exclude")
    print("Next: edit .relay/rules.md and set hooks.test in .relay/config.toml.")
    return OK


def _read_task(root: Path, arg) -> str:
    if arg and arg.strip():
        return arg.strip()
    try:
        if not sys.stdin.isatty():
            data = sys.stdin.read()
            if data.strip():
                return data.strip()
    except (OSError, ValueError):
        pass
    task_file = relay_dir(root) / "task.txt"
    if task_file.exists() and task_file.read_text(encoding="utf-8").strip():
        return task_file.read_text(encoding="utf-8").strip()
    raise RelayError("no task given: pass TASK, pipe text on stdin, or write .relay/task.txt", ERR)


def cmd_pack(root: Path, cfg, args) -> int:
    task = _read_task(root, args.task)
    result = build_request(root, cfg, task, skill=args.skill, files=args.files, no_diff=args.no_diff,
                           cont=args.cont, model=args.model)
    if args.out == "clipboard":
        where = clip.copy(result.text, root)
        if where != "clipboard":
            print(f"warning: no clipboard backend; the request was written to {where}", file=sys.stderr)
    elif args.out == "stdout":
        sys.stdout.write(result.text)
    else:
        Path(args.out).write_text(result.text, encoding="utf-8")
    print(
        f"packed {result.chars} chars (~{result.est_tokens} tokens, est.), "
        f"{len(result.included)} file(s) included, {len(result.omitted)} omitted",
        file=sys.stderr,
    )
    if args.cont and result.mode != "continue":
        print("note: nothing was sent before, so this is a full request (start of a chat)", file=sys.stderr)
    if result.sections:
        detail = " · ".join(f"{k} {v / 1000:.1f}k" for k, v in result.sections.items())
        print(f"  {result.mode} request: {detail}", file=sys.stderr)
    if result.unchanged:
        print(f"  not repeated (the chat has them): {len(result.unchanged)} file(s)", file=sys.stderr)
    for path, reason in result.omitted:
        print(f"  omitted: {path} (reason: {reason})", file=sys.stderr)
    for label, counts in result.redactions.items():
        detail = ", ".join(f"{rule}: {n}" for rule, n in counts.items())
        print(f"  redacted in {label}: {detail}", file=sys.stderr)
    if result.over_budget:
        print("warning: the fixed sections alone exceed context.max_chars", file=sys.stderr)
    elif result.chars > 0.8 * cfg.max_chars:
        print("warning: the request uses more than 80% of context.max_chars", file=sys.stderr)
    return OK


def cmd_apply(root: Path, cfg, args) -> int:
    if args.patch and args.source:
        raise RelayError("use either --patch or --from, not both", ERR)
    if args.patch:
        text, is_patch = Path(args.patch).read_text(encoding="utf-8"), True
    else:
        is_patch = False
        source = args.source or "clipboard"
        if source == "clipboard":
            try:
                text = clip.paste()
            except clip.ClipboardUnavailable:
                raise RelayError("no clipboard available here; use --from FILE or --from -", ERR)
        elif source == "-":
            text = sys.stdin.read()
        else:
            text = Path(source).read_text(encoding="utf-8")
    opts = ApplyOptions(
        no_test=args.no_test, no_commit=args.no_commit, dry_run=args.dry_run, allow_delete=args.allow_delete,
    )
    return run_apply(root, cfg, text, is_patch=is_patch, opts=opts)


def cmd_zip(root: Path, cfg, args) -> int:
    path, size, count = zipper.make_bundle(root, cfg, args.out)
    print(f"Bundle: {path}  ({count} files, {size} bytes)")
    print("Upload it to the chat, ask for the change, and apply the returned patch with `relay apply --patch FILE`.")
    return OK


def _dispatch(args) -> int:
    root = find_root(args.repo)
    cfg = load_config(root)
    if args.command == "init":
        return cmd_init(root, args.force)
    if args.command == "pack":
        return cmd_pack(root, cfg, args)
    if args.command == "apply":
        return cmd_apply(root, cfg, args)
    if args.command == "undo":
        return run_undo(root, cfg)
    if args.command == "zip":
        return cmd_zip(root, cfg, args)
    raise RelayError(f"unknown command {args.command}", ERR)


def main(argv=None) -> int:
    try:
        args = build_parser().parse_args(argv)
        return _dispatch(args)
    except RelayError as exc:
        print(f"relay: {exc}", file=sys.stderr)
        return exc.code
    except KeyboardInterrupt:
        print("relay: interrupted", file=sys.stderr)
        return ERR
