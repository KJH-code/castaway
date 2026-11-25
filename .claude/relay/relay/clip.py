"""Clipboard wrapper with a file fallback (spec 5.2)."""
from __future__ import annotations

from pathlib import Path


class ClipboardUnavailable(Exception):
    pass


def copy(text: str, root=None) -> str:
    """Copy text to the clipboard. Returns "clipboard" or the fallback file path."""
    try:
        import pyperclip  # imported lazily so the tool works without it

        pyperclip.copy(text)
        return "clipboard"
    except Exception:
        base = Path(root) if root else Path.cwd()
        target = base / ".relay"
        target.mkdir(parents=True, exist_ok=True)
        fallback = target / "clipboard.txt"
        fallback.write_text(text, encoding="utf-8")
        return str(fallback)


def paste() -> str:
    try:
        import pyperclip

        return pyperclip.paste()
    except Exception as exc:
        raise ClipboardUnavailable(str(exc))
