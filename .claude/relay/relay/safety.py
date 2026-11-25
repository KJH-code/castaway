"""Safety validation for response operations (spec section 10)."""
from __future__ import annotations

import posixpath
import re
from pathlib import Path

from .config import Config
from .parse import Delete, Edit, Patch, SymbolEdit, Write
from .repo import is_denied

MAX_WRITE_BYTES = 1_000_000


def check_path(root, cfg: Config, raw: str) -> list:
    """SEC-1 .. SEC-3 for one path. Returns [(rule, message)]."""
    if not raw or not raw.strip():
        return [("SEC-1", "empty path")]
    if "\x00" in raw:
        return [("SEC-1", "path contains a NUL byte")]
    if raw.startswith("/") or re.match(r"^[A-Za-z]:", raw) or "\\" in raw:
        return [("SEC-1", "absolute, drive-letter or backslash path")]
    if ".." in raw.split("/"):
        return [("SEC-1", "path contains a '..' segment")]
    norm = posixpath.normpath(raw)
    if norm in (".", ""):
        return [("SEC-1", "path does not name a file")]

    problems = []
    root_resolved = Path(root).resolve()
    target = root_resolved / norm
    try:
        target.resolve().relative_to(root_resolved)
    except ValueError:
        problems.append(("SEC-1", "resolves outside the repository"))
    if is_denied(norm, cfg):
        problems.append(("SEC-2", "matches a deny pattern"))
    if target.is_symlink():
        problems.append(("SEC-3", "target is a symlink"))
    current = root_resolved
    for part in norm.split("/")[:-1]:
        current = current / part
        if current.is_symlink():
            try:
                current.resolve().relative_to(root_resolved)
            except ValueError:
                problems.append(("SEC-3", "parent directory is a symlink pointing outside the repository"))
                break
    return problems


def validate_ops(root, cfg: Config, ops, allow_delete: bool) -> list:
    """Return [(rule, path, message)]; an empty list means the ops are safe."""
    violations, all_paths = [], set()

    def collect(path):
        all_paths.add(posixpath.normpath(path))
        for rule, msg in check_path(root, cfg, path):
            violations.append((rule, path, msg))

    for op in ops:
        if isinstance(op, Write):
            collect(op.path)
            if "[REDACTED:" in op.text:
                violations.append(("SEC-5", op.path, "content contains a [REDACTED:...] placeholder"))
            if len(op.text.encode("utf-8")) > MAX_WRITE_BYTES:
                violations.append(("SEC-6", op.path, "file content exceeds 1 MB"))
        elif isinstance(op, Edit):
            collect(op.path)
            if any("[REDACTED:" in line for _, rep in op.sections for line in rep):
                violations.append(("SEC-5", op.path, "replacement contains a [REDACTED:...] placeholder"))
        elif isinstance(op, SymbolEdit):
            collect(op.path)
            if "[REDACTED:" in op.text:
                violations.append(("SEC-5", op.path, "replacement contains a [REDACTED:...] placeholder"))
        elif isinstance(op, Delete):
            collect(op.path)
            if not allow_delete:
                violations.append(("SEC-4", op.path, "delete is disabled (apply.allow_delete / --allow-delete)"))
        elif isinstance(op, Patch):
            for path in op.paths:
                collect(path)
            if op.binary:
                violations.append(("SEC-7", ",".join(op.paths), "binary patches are not allowed"))
            if op.deletes and not allow_delete:
                violations.append(("SEC-4", ",".join(op.paths), "patch deletes a file but delete is disabled"))
            if "[REDACTED:" in op.diff:
                violations.append(("SEC-5", ",".join(op.paths), "patch contains a [REDACTED:...] placeholder"))
    if len(all_paths) > cfg.max_files_per_response:
        violations.append(("SEC-6", "-", f"{len(all_paths)} files exceed max_files_per_response={cfg.max_files_per_response}"))
    return violations
