"""`.relay/state.json` handling (spec 4.3)."""
from __future__ import annotations

import json
from pathlib import Path

from .fsutil import atomic_write

DEFAULT = {
    "version": 1,
    "status": "none",  # none | ok | failed | applied_no_commit | undone
    "last_snapshot": None,
    "last_commit": None,
    "branch": None,
    "pending_paths": [],
    "reject_note": None,   # why the last reply could not be applied (sent with the next pack)
    "retry_files": [],     # files to resend with the next pack because an edit of them failed
    "partial": [],         # complete blocks saved from replies that were cut off
}


def state_path(root) -> Path:
    return Path(root) / ".relay" / "state.json"


def load(root) -> dict:
    state = json.loads(json.dumps(DEFAULT))
    path = state_path(root)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        if isinstance(data, dict):
            for key in DEFAULT:
                if key in data:
                    state[key] = data[key]
    return state


def save(root, state: dict) -> None:
    text = json.dumps(state, indent=2, ensure_ascii=False) + "\n"
    atomic_write(state_path(root), text.encode("utf-8"))


def seen_path(root) -> Path:
    return Path(root) / ".relay" / "seen.json"


def load_seen(root):
    """{path: hash} of file contents the chat has already seen, or None (no conversation yet)."""
    path = seen_path(root)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    files = data.get("files") if isinstance(data, dict) else None
    return dict(files) if isinstance(files, dict) else None


def save_seen(root, files: dict) -> None:
    text = json.dumps({"version": 1, "files": files}, indent=1, sort_keys=True) + "\n"
    atomic_write(seen_path(root), text.encode("utf-8"))


def text_hash(text: str) -> str:
    import hashlib

    return hashlib.sha1(text.replace("\r\n", "\n").encode("utf-8", "replace")).hexdigest()[:16]
