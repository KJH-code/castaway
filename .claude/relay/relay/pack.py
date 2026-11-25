"""Assemble the request that gets pasted into the chat (spec sections 6 and 7)."""
from __future__ import annotations

import math
import posixpath
import re
from dataclasses import dataclass, field
from importlib import resources
from pathlib import Path

from . import rank
from . import state as st
from .config import Config
from .errors import ERR, RelayError
from .redact import redact
from .repo import (
    head_sha, is_denied, is_excluded, list_universe, pathspec_excludes, porcelain, relay_dir, run_git,
)

DIFF_CAP = 15000
MAX_FILES = 25
MAX_TREE_LINES = 400
MAX_OMITTED_LINES = 30
TREE_WIDTH = 160
DIFF_DUP_MAX = 1500  # a hunk of a file sent in full is dropped only above this size

CONT_HEAD = """\
Same conversation as before: the earlier instructions (OUTPUT FORMAT (strict)) and project
rules still apply. Files named under "unchanged" are exactly as you last saw or wrote them, so
they are not repeated. Reply with ONE fenced RELAY block; prefer EDIT blocks (SYMBOL for a whole
function).
"""


@dataclass
class PackResult:
    text: str
    included: list = field(default_factory=list)
    omitted: list = field(default_factory=list)       # [(path, reason)]
    redactions: dict = field(default_factory=dict)    # {label: {rule: count}}
    over_budget: bool = False
    sections: dict = field(default_factory=dict)      # {name: chars}
    unchanged: list = field(default_factory=list)     # files skipped because the chat has them
    mode: str = "full"

    @property
    def chars(self) -> int:
        return len(self.text)

    @property
    def est_tokens(self) -> int:
        return est_tokens(self.text)


def est_tokens(text: str) -> int:
    """Rough token count: ~3.5 ASCII characters per token, about one token per other character
    (Korean and other non-Latin scripts tokenize far less densely)."""
    other = sum(1 for ch in text if ord(ch) > 127)
    return math.ceil((len(text) - other) / 3.5 + other)


def template(*parts: str) -> str:
    return resources.files("relay").joinpath("templates", *parts).read_text(encoding="utf-8")


def _sec(tag: str, body: str, attrs: str = "") -> str:
    return f"<{tag}{attrs}>\n{body.rstrip(chr(10))}\n</{tag}>\n"


def _fit(tag: str, body: str, room: int, keep: str = "head") -> str:
    """Return a section that fits in `room` chars (truncating the body), or ''."""
    overhead = len(_sec(tag, ""))
    avail = room - overhead - 2
    if avail <= 0 or not body.strip():
        return ""
    if len(body) > avail:
        body = body[-avail:] if keep == "tail" else body[:avail]
    return _sec(tag, body)


def render_tree_compact(paths, width: int = TREE_WIDTH) -> list:
    """One line per directory: `dir/: a.py b.py ...` (root files first, without a label).

    The indented tree repeats a newline and indentation for every file; this form carries the
    same information in roughly half the characters for typical repositories.
    """
    groups: dict = {}
    for path in paths:
        directory, _, name = path.rpartition("/")
        groups.setdefault(directory, []).append(name)
    lines = []
    for directory in sorted(groups, key=lambda d: (d != "", d.lower())):
        label = f"{directory}/: " if directory else ""
        line = label
        for name in sorted(groups[directory], key=str.lower):
            piece = name if line in (label, "  ") else " " + name
            if len(line) + len(piece) > width and line not in (label, "  "):
                lines.append(line)
                line, piece = "  ", name
            line += piece
        lines.append(line)
    return lines


def _split_diff(diff: str) -> list:
    """[(path, block)] for each `diff --git` section."""
    blocks = []
    for chunk in re.split(r"(?m)^(?=diff --git )", diff):
        if not chunk.strip():
            continue
        m = re.match(r"diff --git a/(.+?) b/(.+)", chunk)
        blocks.append((m.group(2) if m else "", chunk))
    return blocks


def render_tree(paths) -> list:
    tree: dict = {}
    for path in paths:
        node = tree
        parts = path.split("/")
        for directory in parts[:-1]:
            node = node.setdefault(directory + "/", {})
        node[parts[-1]] = None
    lines: list = []

    def walk(node, depth):
        for name in sorted(node, key=str.lower):
            lines.append("  " * depth + name)
            if node[name] is not None:
                walk(node[name], depth + 1)

    walk(tree, 0)
    return lines


SPEC_RE = re.compile(r"^(?P<path>.+?)(?:#(?P<names>[\w.$,]+)|:(?P<a>\d+)-(?P<b>\d+))$")


def _split_spec(raw: str):
    """`path#name,name2` or `path:120-180` (part of a large file) → (path, names, (a, b) or None)."""
    raw = (raw or "").strip().strip("\"'")
    m = SPEC_RE.match(raw)
    if not m or re.match(r"^[A-Za-z]$", m.group("path")):  # C:\... is a drive, not a range
        return raw, [], None
    names = [n for n in (m.group("names") or "").split(",") if n]
    rng = (int(m.group("a")), int(m.group("b"))) if m.group("a") else None
    return m.group("path"), names, rng


def _norm_rel(root: Path, raw: str):
    raw = raw.strip().strip("\"'")
    if not raw:
        return None
    candidate = Path(raw)
    if candidate.is_absolute():
        try:
            return candidate.resolve().relative_to(root.resolve()).as_posix()
        except ValueError:
            return None
    norm = posixpath.normpath(raw.replace("\\", "/"))
    if norm == ".." or norm.startswith("../"):
        return None
    return norm


def _paths_from_log(log: str) -> list:
    found = re.findall(r'File "([^"]+)", line', log) + re.findall(r"(\S+\.\w+):\d+", log)
    return list(dict.fromkeys(found))


def _git_diff(root: Path, cfg: Config) -> str:
    ref = ["HEAD"] if head_sha(root) else []
    proc = run_git(
        root, "--no-pager", "diff", "--no-color", "--no-ext-diff", *ref, "--", ".",
        *pathspec_excludes(cfg), check=False,
    )
    return proc.stdout if proc.returncode == 0 else ""


MAX_OUTLINES = 8          # related files shown as declarations only
MAX_SLICES = 12           # functions shown in full from a file too large to send whole
SLICE_CHARS = 6000        # one function
SLICE_BUDGET = 24000      # all slices of one file
ASKED_WHOLE_SHARE = 0.8   # a file the chat asked for by name is sent whole up to this share of max_chars
OUTLINE_NOTE = "(declarations only — ask with NEED for the whole file before editing it)"
SLICE_NOTE = ("(a large file: its declarations, then the named parts in full. Copy SEARCH lines only from the "
              "text shown, or replace a whole function with SYMBOL)")
CLOSING = "Reply now with ONE fenced RELAY block as described in OUTPUT FORMAT (strict)."


def _candidates(root, cfg, universe, task, explicit, log_text, status_entries, retry=(), index=None):
    """Files to send in full (priority order, spec 7.1 + v0.3 retrieval), related files to show as
    outlines, files omitted up front, and the ranked list for the repository map."""
    universe_set = set(universe)
    order, omitted = [], []

    def add(path):
        if path in universe_set and path not in order:
            order.append(path)

    for path in retry:  # an edit of these did not fit: the chat needs their current text
        add(path)
    for raw in explicit or []:
        path = _norm_rel(root, _split_spec(raw)[0])
        if path is None:
            omitted.append((raw, "outside_repository"))
        elif is_denied(path, cfg):
            omitted.append((path, "denied"))
        elif is_excluded(path, cfg):
            omitted.append((path, "excluded"))
        elif path not in universe_set:
            omitted.append((path, "not_found"))
        else:
            add(path)
    for xy, path in status_entries:
        if "D" not in xy:
            add(path)
    for raw in _paths_from_log(log_text):
        path = _norm_rel(root, raw)
        if path:
            add(path)
    lowered = task.lower()
    for path in universe:
        stem = posixpath.splitext(posixpath.basename(path))[0]
        if len(stem) >= 4 and stem.lower() in lowered:
            add(path)

    ranked, outlines = [], []
    if index:
        scores = rank.score_files(index, task, log_text, seeds=list(order))
        ranked = sorted(scores, key=lambda p: (-scores[p], p))
        # a function or class named in the task / failure log: its file is sent whole
        named = {w for w in rank.IDENT.findall(task + "\n" + log_text) if len(w) >= 4}
        owners = {}
        for path, entry in index.items():
            for sym in entry["syms"]:
                if sym[0] in named:
                    owners.setdefault(sym[0], set()).add(path)
        for name, paths in owners.items():
            if len(paths) <= 3:
                for path in sorted(paths, key=lambda p: -scores.get(p, 0)):
                    add(path)
        # tests that go with the files being changed
        paired = 0
        for path in list(order):
            for test in rank.test_pairs(path, universe):
                if paired < 3 and test not in order:
                    add(test)
                    paired += 1
        top = scores[ranked[0]] if ranked else 0
        extra = [p for p in ranked if p not in order and scores[p] >= 0.3 * top]
        if not order and extra:  # nothing named at all: the best matches go in whole
            for path in extra[:2]:
                add(path)
            extra = extra[2:]
        outlines = [p for p in extra if index.get(p, {}).get("syms")][:MAX_OUTLINES]
    for extra_path in order[MAX_FILES:]:
        omitted.append((extra_path, "budget"))
    return order[:MAX_FILES], outlines, omitted, ranked


def _outline_text(index, path) -> str:
    entry = index.get(path) or {}
    lines = []
    for name, qual, kind, head, end, sig in entry.get("syms", [])[:120]:
        pad = "  " if kind == "method" else ""
        lines.append(f"L{head + 1}: {pad}{sig}")
    return "\n".join(lines)


def _slices_text(index, path, text, task, log_text, names=(), ranges=()) -> str:
    """Outline of a large file plus, in full, the line ranges the chat asked for and the functions
    the task, the log or the chat name."""
    entry = index.get(path) or {}
    lines = text.split("\n")
    parts_out = [_outline_text(index, path)]
    used = 0
    for a, b in ranges:
        a, b = max(1, a), min(len(lines), b)
        body = "\n".join(lines[a - 1:b])
        if not body or used + len(body) > SLICE_BUDGET:
            continue
        parts_out.append(f"--- lines {a}-{b} ---\n{body}")
        used += len(body)
    for sym in rank.wanted_symbols(entry, task, log_text, MAX_SLICES, names):
        name, qual, kind, head, end, sig = sym
        body = "\n".join(lines[head:end + 1])
        if used + len(body) > SLICE_BUDGET:
            break
        if len(body) > SLICE_CHARS:
            body = body[:SLICE_CHARS] + "\n[... cut; ask with NEED for the whole file]"
        parts_out.append(f"--- {qual}: lines {head + 1}-{end + 1} ---\n{body}")
        used += len(body)
    return "\n".join(parts_out)


def build_request(root, cfg: Config, task: str, *, skill=None, files=None, no_diff=False,
                  cont=False, model: str = "") -> PackResult:
    """Build the request. `cont=True` continues the same chat: the instructions, rules, tree and
    diff are left out and files the chat already has (same content) are only named.

    Order (v0.3): long material first (map, files, diff, failure), the task and a one-line format
    reminder last — models answer long prompts better when the question comes at the end."""
    root = Path(root)
    state = st.load(root)
    redactions: dict = {}
    seen = st.load_seen(root) if cont else None
    if cont and seen is None:
        cont = False  # nothing was sent yet: a continuation needs a first full request

    instructions = template("instructions.txt")
    rules_path = relay_dir(root) / "rules.md"
    rules = rules_path.read_text(encoding="utf-8") if rules_path.exists() else ""
    skill_text = ""
    if skill:
        skill_path = relay_dir(root) / "prompts" / f"{skill}.md"
        if not skill_path.is_file():
            raise RelayError(f"skill '{skill}' not found at {skill_path}", ERR)
        skill_text = skill_path.read_text(encoding="utf-8")

    log_text = ""
    if state["status"] == "failed":
        log_path = relay_dir(root) / "last_run.log"
        if log_path.exists():
            log_text, counts = redact(log_path.read_text(encoding="utf-8", errors="replace")[-cfg.log_tail_chars:])
            if counts:
                redactions["last_failure"] = counts
    if state.get("reject_note"):
        note = (
            "The last reply was NOT applied: " + state["reject_note"] + "\n"
            "Re-send only the operation(s) for the file(s) named above, written against the current "
            "text in <files> (the reply's other operations were kept and are applied together with "
            "the fix). Copy SEARCH lines exactly from <files>, or replace the whole function with SYMBOL."
        )
        log_text = (log_text + "\n" if log_text else "") + note

    status_entries = [
        (xy, p) for xy, p in porcelain(root)
        if not p.startswith(".relay/") and not is_denied(p, cfg) and not is_excluded(p, cfg)
    ]
    status_text = "\n".join(f"{xy} {p}" for xy, p in status_entries)

    universe = list_universe(root, cfg)
    try:
        index = rank.load_index(root, universe)
    except Exception:  # the index only improves the choice of files; never block a request on it
        index = {}
    retry = state.get("retry_files") or []
    candidates, outline_paths, omitted, ranked = _candidates(
        root, cfg, universe, task, files, log_text, status_entries, retry, index)
    explicit, asked_whole, asked_names, asked_ranges = set(), set(), {}, {}
    for raw in files or []:
        spec_path, names, rng = _split_spec(raw)
        norm = _norm_rel(root, spec_path)
        if norm:
            explicit.add(norm)
            if names:
                asked_names.setdefault(norm, []).extend(names)
            elif rng:
                asked_ranges.setdefault(norm, []).append(rng)
            else:
                asked_whole.add(norm)  # the chat (NEED) or the person named the whole file

    file_items, unchanged, hashes = [], [], {}
    small = []
    for path in candidates:
        data = (root / path).read_bytes()
        if b"\0" in data[:8192]:
            omitted.append((path, "binary"))
            continue
        text = data.decode("utf-8", errors="replace").replace("\r\n", "\n")
        hashes[path] = st.text_hash(text)
        if cont and seen.get(path) == hashes[path] and path not in explicit and path not in retry:
            unchanged.append(path)
            continue
        too_big = len(text) > cfg.max_file_chars
        alt = None
        if too_big or path in asked_names or path in asked_ranges:
            if index.get(path, {}).get("syms") or path in asked_ranges:
                alt, counts = redact(_slices_text(index, path, text, task, log_text,
                                                  asked_names.get(path, ()), asked_ranges.get(path, ())))
                if counts:
                    redactions[path] = counts
                alt += "\n"
        # a large file is sent whole only when it was asked for by name and fits the request budget
        whole_ok = not too_big or (path in asked_whole and len(text) <= cfg.max_chars * ASKED_WHOLE_SHARE)
        if not whole_ok or (alt is not None and path not in asked_whole and (path in asked_names or path in asked_ranges)):
            if alt is not None:
                file_items.append((path, alt, "slices", None))
            else:
                omitted.append((path, "too_large"))
            continue
        text, counts = redact(text)
        if counts:
            redactions[path] = counts
        if text.count("\n") <= 150:
            small.append(path)
        file_items.append((path, text if text.endswith("\n") else text + "\n", "full", alt))
    if not cont:
        for path in outline_paths:
            body = _outline_text(index, path)
            if body:
                file_items.append((path, body + "\n", "outline", None))

    # A file sent in full already shows its text; its diff only adds what changed. Keep small
    # hunks (cheap, and they say what is new), drop big ones (paid twice). Skipped when continuing.
    diff_blocks = []
    if not no_diff and not cont:
        raw_diff, counts = redact(_git_diff(root, cfg))
        if counts:
            redactions["git_diff"] = counts
        diff_blocks = _split_diff(raw_diff)
    sent_paths = {p for p, b in diff_blocks if len(b) > DIFF_DUP_MAX} & {p for p, _, v, _ in file_items if v == "full"}

    def diff_of(blocks):
        text = "".join(b for _, b in blocks)
        return text[:DIFF_CAP] + "\n[truncated]" if len(text) > DIFF_CAP else text

    diff_text = diff_of([(p, b) for p, b in diff_blocks if p not in sent_paths])

    # ---- budget allocation (spec 7.2) ----
    if cont:
        head, tail = '<relay_request version="1" mode="continue">\n', "</relay_request>\n"
        fixed = _sec("reminder", CONT_HEAD)
        if skill_text.strip():
            fixed += _sec("skill", skill_text, f' name="{skill}"')
    else:
        head, tail = '<relay_request version="1">\n', "</relay_request>\n"
        fixed = _sec("instructions", instructions)
        if rules.strip():
            fixed += _sec("project_rules", rules)
        if skill_text.strip():
            fixed += _sec("skill", skill_text, f' name="{skill}"')
    task_body = task
    if model == "haiku" and small:
        task_body += ("\n\n(Small files in this request — a complete FILE write is fine for these: "
                      + ", ".join(small[:12]) + ")")
    task_sec = _sec("task", task_body) + CLOSING + "\n"
    remaining = cfg.max_chars - len(head) - len(tail) - len(fixed) - len(task_sec)

    last_failure = _fit("last_failure", log_text, remaining, "tail")
    remaining -= len(last_failure)
    git_status = _fit("git_status", status_text, remaining)
    remaining -= len(git_status)
    git_diff = _fit("git_diff", diff_text, remaining)
    remaining -= len(git_diff)

    def file_section(path, text, view):
        if view == "full":
            return f'<file path="{path}">\n{text}</file>\n'
        note = OUTLINE_NOTE if view == "outline" else SLICE_NOTE
        return f'<file path="{path}" view="{view}">\n{note}\n{text}</file>\n'

    kept = []
    files_room = remaining - len("<files>\n</files>\n")
    for path, text, view, alt in file_items:
        section = file_section(path, text, view)
        if len(section) > files_room and alt is not None:  # whole does not fit: its slices may
            view, section = "slices", file_section(path, alt, "slices")
        if len(section) <= files_room:
            kept.append((path, section, view))
            files_room -= len(section)
        elif view != "outline":
            omitted.append((path, "budget"))
    files_used = sum(len(s) for _, s, _ in kept) + (len("<files>\n</files>\n") if kept else 0)
    remaining -= files_used

    # files that did not fit get their diff hunks back, if there is room
    kept_paths = {p for p, _, v in kept if v == "full"}
    late = [(p, b) for p, b in diff_blocks if p in sent_paths and p not in kept_paths]
    if late:
        more = _fit("git_diff", diff_of([(p, b) for p, b in diff_blocks if p not in kept_paths]),
                    remaining + len(git_diff))
        if len(more) > len(git_diff):
            remaining -= len(more) - len(git_diff)
            git_diff = more

    unchanged_sec = ""
    if unchanged:
        unchanged_sec = _fit("unchanged", "\n".join(unchanged), remaining)
        remaining -= len(unchanged_sec)

    # repository map: the ranked files' functions and classes (full requests only)
    map_lines = []
    if not cont and cfg.map_chars and index:
        shown = {p for p, _, _ in kept}
        order_for_map = ranked + sorted(p for p in index if p not in set(ranked))
        room = min(cfg.map_chars, remaining - len(_sec("repo_map", "")) - 20)
        for line in rank.map_lines(index, order_for_map, skip=shown):
            if room - len(line) - 1 < 0:
                break
            map_lines.append(line)
            room -= len(line) + 1
        remaining -= sum(len(x) + 1 for x in map_lines) + (len(_sec("repo_map", "")) if map_lines else 0)

    full_tree = [] if cont else render_tree_compact(universe)
    all_tree = full_tree[:MAX_TREE_LINES]
    tree_lines, used = [], len(_sec("repo_tree", "")) + 20
    for line in all_tree:
        if used + len(line) + 1 > remaining:
            break
        tree_lines.append(line)
        used += len(line) + 1
    total_tree = len(full_tree)
    omitted_list = list(omitted)

    def assemble() -> str:
        parts = [head, fixed]
        if map_lines:
            parts.append(_sec("repo_map", "\n".join(map_lines)))
        if tree_lines:
            body = "\n".join(tree_lines)
            if len(tree_lines) < total_tree:
                body += f"\n... {total_tree - len(tree_lines)} more"
            parts.append(_sec("repo_tree", body))
        if kept:
            parts.append("<files>\n" + "".join(s for _, s, _ in kept) + "</files>\n")
        parts += [unchanged_sec, git_status, git_diff]
        if omitted_list:
            lines = [f"{p} (reason: {r})" for p, r in omitted_list[:MAX_OMITTED_LINES]]
            if len(omitted_list) > MAX_OMITTED_LINES:
                lines.append(f"... {len(omitted_list) - MAX_OMITTED_LINES} more omitted")
            parts.append(_sec("omitted", "\n".join(lines)))
        parts += [last_failure, task_sec, tail]
        return "".join(parts)

    text = assemble()
    over_budget = False
    while len(text) > cfg.max_chars:  # final trim so the budget always holds
        if tree_lines:
            tree_lines = tree_lines[: len(tree_lines) // 2]
        elif map_lines:
            map_lines = map_lines[: len(map_lines) // 2]
        elif kept:
            path, _, view = kept.pop()
            if view != "outline":
                omitted_list.append((path, "budget"))
        elif git_diff:
            git_diff = ""
        elif unchanged_sec:
            unchanged_sec = ""
        elif git_status:
            git_status = ""
        elif last_failure:
            last_failure = ""
        else:
            over_budget = True
            break
        text = assemble()

    omitted_final = list(omitted_list)
    included = [p for p, _, v in kept if v == "full"]
    # remember what this chat now has (a full request starts a new conversation); outlines and
    # slices are not the file, so they are not remembered
    if cont:
        known = dict(seen)
    else:
        known = {}
        st.save(root, {**state, "partial": []})  # blocks saved for the old chat no longer apply
    for path in included:
        known[path] = hashes[path]
    for path, _, view in kept:
        if view != "full":
            known.pop(path, None)
    st.save_seen(root, known)
    sections = {
        "fixed": len(fixed) + len(task_sec), "last_failure": len(last_failure), "git_status": len(git_status),
        "git_diff": len(git_diff), "files": sum(len(s) for _, s, v in kept if v == "full"),
        "outlines": sum(len(s) for _, s, v in kept if v != "full"),
        "repo_map": sum(len(x) + 1 for x in map_lines),
        "repo_tree": sum(len(x) + 1 for x in tree_lines), "unchanged": len(unchanged_sec),
    }
    return PackResult(
        text=text, included=included, omitted=omitted_final, redactions=redactions,
        over_budget=over_budget, sections={k: v for k, v in sections.items() if v},
        unchanged=list(unchanged), mode="continue" if cont else "full",
    )
