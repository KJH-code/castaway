"""Sandbox bundle for the chat's code-execution sandbox (spec section 11)."""
from __future__ import annotations

import sys
import time
import zipfile
from pathlib import Path

from .config import Config
from .errors import SIZE, RelayError
from .repo import list_universe, relay_dir

LIMIT_BYTES = 30 * 1024 * 1024
WARN_BYTES = 28 * 1024 * 1024

README = """\
This bundle is a snapshot of a git repository, uploaded by the user.

Please:
1. Unpack it, install the dependencies the project needs, and run the project's tests.
2. Make the requested change (or fix the failing tests) in the unpacked copy.
3. Re-run the tests until they pass, or explain why they cannot pass here.
4. Produce a file named changes.patch: a unified diff relative to the bundle root
   (git format, a/ and b/ prefixes) containing ONLY your changes, and offer it for download.
5. Summarise what you changed in a few sentences. Do not include secrets.
"""


def make_bundle(root, cfg: Config, out=None):
    """Create the zip. Returns (path, size_bytes, file_count)."""
    root = Path(root)
    files = list_universe(root, cfg)
    if out:
        out_path = Path(out)
    else:
        out_path = relay_dir(root) / f"bundle_{time.strftime('%Y%m%d-%H%M%S')}.zip"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in files:
            zf.write(root / rel, arcname=rel)
        zf.writestr("RELAY_README.txt", README)
    size = out_path.stat().st_size
    if size > LIMIT_BYTES:
        out_path.unlink()
        largest = sorted(files, key=lambda p: (root / p).stat().st_size, reverse=True)[:10]
        listing = "\n".join(f"  {(root / p).stat().st_size:>10}  {p}" for p in largest)
        raise RelayError(
            f"bundle is {size} bytes, over the {LIMIT_BYTES} byte limit. Largest files:\n{listing}\n"
            "Add them to context.exclude in .relay/config.toml and try again.",
            SIZE,
        )
    if size > WARN_BYTES:
        print(f"warning: bundle is {size} bytes, close to the {LIMIT_BYTES} byte limit", file=sys.stderr)
    return out_path, size, len(files)
