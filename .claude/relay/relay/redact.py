"""Secret redaction (spec 10.1)."""
from __future__ import annotations

import re

RULES = [
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----")),
    ("aws_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("gh_token", re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}")),
    ("api_token", re.compile(r"sk-[A-Za-z0-9_\-]{20,}")),
    ("assign", re.compile(
        r"(?i)(api[_-]?key|secret|token|passwd|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-\.\/+=]{12,}"
    )),
]


def redact(text: str):
    """Return (redacted_text, {rule: count})."""
    counts = {}
    for name, rx in RULES:
        text, n = rx.subn(f"[REDACTED:{name}]", text)
        if n:
            counts[name] = counts.get(name, 0) + n
    return text, counts
