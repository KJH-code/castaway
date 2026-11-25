"""Snapshots of original files so apply can roll back and undo (spec 4.4)."""
from __future__ import annotations

import json
import shutil
import time
from pathlib import Path


def _base(root) -> Path:
    return Path(root) / ".relay" / "snapshots"


def create(root, *, touched, deletes, head, prior_pending, prior_status, prior_snapshot) -> str:
    root = Path(root)
    base = _base(root)
    base.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    sid, n = stamp, 1
    while (base / sid).exists():
        n += 1
        sid = f"{stamp}-{n}"
    sdir = base / sid
    (sdir / "files").mkdir(parents=True)
    created, modified, deleted = [], [], []
    for rel in touched:
        src = root / rel
        if src.is_file():
            dest = sdir / "files" / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            (deleted if rel in deletes else modified).append(rel)
        else:
            created.append(rel)
    manifest = {
        "id": sid, "head": head, "created": created, "modified": modified, "deleted": deleted,
        "prior_pending": list(prior_pending), "prior_status": prior_status,
        "prior_snapshot": prior_snapshot,
    }
    (sdir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    prune(root)
    return sid


def exists(root, sid) -> bool:
    return bool(sid) and (_base(root) / sid / "manifest.json").is_file()


def restore(root, sid) -> dict:
    """Put originals back and remove files the apply created. Returns the manifest."""
    root = Path(root)
    sdir = _base(root) / sid
    manifest = json.loads((sdir / "manifest.json").read_text(encoding="utf-8"))
    for rel in [*manifest["modified"], *manifest["deleted"]]:
        dest = root / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(sdir / "files" / rel, dest)
    for rel in manifest["created"]:
        target = root / rel
        if target.exists() or target.is_symlink():
            target.unlink()
        parent = target.parent
        while parent != root and parent.exists() and not any(parent.iterdir()):
            parent.rmdir()
            parent = parent.parent
    return manifest


def discard(root, sid) -> None:
    shutil.rmtree(_base(root) / sid, ignore_errors=True)


def prune(root, keep: int = 20) -> None:
    base = _base(root)
    dirs = sorted(d for d in base.iterdir() if d.is_dir())
    for old in dirs[:-keep] if len(dirs) > keep else []:
        shutil.rmtree(old, ignore_errors=True)
