"""Small filesystem helpers (C-7: atomic writes)."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path


def get_umask() -> int:
    mask = os.umask(0)
    os.umask(mask)
    return mask


def atomic_write(dest, data: bytes, mode: int | None = None) -> None:
    """Write bytes to dest via a temp file in the same directory + os.replace."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(dest.parent), prefix=".relay-tmp-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
        os.chmod(tmp, mode if mode is not None else (0o666 & ~get_umask()))
        os.replace(tmp, dest)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
