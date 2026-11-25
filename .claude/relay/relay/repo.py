"""Repository helpers: git wrapper, file universe, glob matching."""
from __future__ import annotations

import fnmatch
import subprocess
from pathlib import Path

from .config import Config
from .errors import GIT, RelayError


def _cmd_name(args) -> str:
    return next((a for a in args if not a.startswith("-")), args[0] if args else "")


def run_git(root, *args, input=None, check=True):
    """Run git with an argument list (SEC-8: never shell=True)."""
    try:
        proc = subprocess.run(
            ["git", *args], cwd=str(root), input=input, capture_output=True,
            text=True, encoding="utf-8", errors="replace",
        )
    except FileNotFoundError:
        raise RelayError("git executable not found", GIT)
    if check and proc.returncode != 0:
        msg = (proc.stderr or proc.stdout).strip()
        raise RelayError(f"git {_cmd_name(args)} failed: {msg}", GIT)
    return proc


def find_root(start=None) -> Path:
    cwd = str(start or Path.cwd())
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"], cwd=cwd, capture_output=True,
            text=True, encoding="utf-8", errors="replace",
        )
    except FileNotFoundError:
        raise RelayError("git executable not found", GIT)
    except (NotADirectoryError, PermissionError) as exc:
        raise RelayError(f"cannot use --repo path: {exc}", GIT)
    if proc.returncode != 0:
        raise RelayError("not inside a git repository", GIT)
    return Path(proc.stdout.strip()).resolve()


def relay_dir(root) -> Path:
    return Path(root) / ".relay"


def matches_any(path: str, patterns) -> bool:
    path = path.removeprefix("./")
    parts = path.split("/")
    base = parts[-1]
    for pat in patterns:
        if fnmatch.fnmatchcase(path, pat) or fnmatch.fnmatchcase(base, pat):
            return True
        if pat.endswith("/**"):
            directory = pat[:-3]
            if "/" not in directory and directory in parts[:-1]:
                return True
    return False


def is_denied(path: str, cfg: Config) -> bool:
    parts = path.removeprefix("./").split("/")
    if ".git" in parts or ".relay" in parts:
        return True
    return matches_any(path, cfg.deny)


def is_excluded(path: str, cfg: Config) -> bool:
    return matches_any(path, cfg.exclude)


def list_universe(root, cfg: Config) -> list:
    """Tracked + untracked-not-ignored regular files, minus exclude and deny."""
    root = Path(root)
    out = run_git(root, "ls-files", "-co", "--exclude-standard", "-z").stdout
    seen, result = set(), []
    for path in out.split("\0"):
        if not path or path in seen:
            continue
        seen.add(path)
        full = root / path
        if full.is_symlink() or not full.is_file():
            continue  # symlinks could leak files from outside the repo
        if is_denied(path, cfg) or is_excluded(path, cfg):
            continue
        result.append(path)
    return sorted(result)


def porcelain(root) -> list:
    """Return [(XY, path)] from `git status --porcelain -z`."""
    out = run_git(root, "status", "--porcelain", "-z", "--untracked-files=all").stdout
    entries = out.split("\0")
    result, i = [], 0
    while i < len(entries):
        entry = entries[i]
        i += 1
        if len(entry) < 4:
            continue
        xy, path = entry[:2], entry[3:]
        if xy[0] in "RC":
            i += 1  # skip the original-path entry of a rename/copy
        result.append((xy, path))
    return result


def dirty_paths(root) -> list:
    return [(xy, p) for xy, p in porcelain(root) if not p.startswith(".relay/")]


def current_branch(root):
    proc = run_git(root, "symbolic-ref", "--short", "-q", "HEAD", check=False)
    return proc.stdout.strip() or None if proc.returncode == 0 else None


def head_sha(root):
    proc = run_git(root, "rev-parse", "--verify", "-q", "HEAD", check=False)
    return proc.stdout.strip() if proc.returncode == 0 else None


def pathspec_excludes(cfg: Config) -> list:
    return [f":(exclude,glob)**/{pat}" for pat in [*cfg.deny, *cfg.exclude]]
