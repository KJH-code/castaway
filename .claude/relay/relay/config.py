"""Load and validate `.relay/config.toml` (spec 4.2)."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from .errors import ERR, RelayError

DEFAULT_EXCLUDE = [
    "node_modules/**", ".venv/**", "venv/**", "dist/**", "build/**",
    "*.lock", "*.min.js", "*.png", "*.jpg", "*.zip", "*.pdf",
]
DEFAULT_DENY = [".env", ".env.*", "*.pem", "*.key", "id_rsa*", ".git/**", ".relay/**"]


@dataclass
class Config:
    max_chars: int = 60000
    max_file_chars: int = 40000
    log_tail_chars: int = 8000
    exclude: list = field(default_factory=lambda: list(DEFAULT_EXCLUDE))
    deny: list = field(default_factory=lambda: list(DEFAULT_DENY))
    post_apply: list = field(default_factory=list)
    test: str = ""
    test_quick: str = ""       # optional fast tests run before `test` (a failure skips the full run)
    syntax_check: bool = True  # parse the changed files (Python, JSON, TOML, JavaScript) before the tests
    map_chars: int = 6000      # budget for the repository map in a full request (0 = plain file list)
    timeout_sec: int = 300
    auto_commit: bool = True
    auto_branch: bool = True
    branch_prefix: str = "relay/"
    allow_dirty: bool = False
    allow_delete: bool = False
    max_files_per_response: int = 30


_SCHEMA = {
    "context": {"max_chars": int, "max_file_chars": int, "log_tail_chars": int, "map_chars": int,
                "exclude": list, "deny": list},
    "hooks": {"post_apply": list, "test": str, "test_quick": str, "syntax_check": bool, "timeout_sec": int},
    "git": {"auto_commit": bool, "auto_branch": bool, "branch_prefix": str, "allow_dirty": bool},
    "apply": {"allow_delete": bool, "max_files_per_response": int},
}


def load_config(root) -> Config:
    path = Path(root) / ".relay" / "config.toml"
    cfg = Config()
    if not path.exists():
        return cfg
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        raise RelayError(f"config.toml is not valid TOML: {exc}", ERR)
    for section, keys in _SCHEMA.items():
        values = data.get(section, {})
        if not isinstance(values, dict):
            raise RelayError(f"config.toml: [{section}] must be a table", ERR)
        for key, typ in keys.items():
            if key not in values:
                continue
            val = values[key]
            wrong_bool = typ is int and isinstance(val, bool)
            if wrong_bool or not isinstance(val, typ):
                raise RelayError(f"config.toml: [{section}] {key} must be {typ.__name__}", ERR)
            if typ is list and not all(isinstance(x, str) for x in val):
                raise RelayError(f"config.toml: [{section}] {key} must be a list of strings", ERR)
            if typ is int and (val < 0 if key == "map_chars" else val <= 0):
                raise RelayError(f"config.toml: [{section}] {key} must be positive", ERR)
            setattr(cfg, key, val)
    return cfg
