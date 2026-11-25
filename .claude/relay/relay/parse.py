"""RELAY response parser (spec section 8)."""
from __future__ import annotations

import posixpath
import re
from dataclasses import dataclass, field

MARKER_RE = re.compile(r"^<<<RELAY:(BEGIN|COMMIT|FILE|EDIT|SYMBOL|PATCH|NEED|NOTE|END)(?:[ \t]+(.*?))?>>>[ \t]*$")
ATTR_RE = re.compile(r'(\w+)=(?:"([^"]*)"|\'([^\']*)\'|(\S+))')
SMART_QUOTES = str.maketrans({"\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'"})
SEARCH_RE = re.compile(r"^\s*<{5,9} ?SEARCH\s*$")
DIVIDER_RE = re.compile(r"^\s*={5,9}\s*$")
REPLACE_RE = re.compile(r"^\s*>{5,9} ?REPLACE\s*$")


class ParseError(Exception):
    def __init__(self, message: str, line: int | None = None):
        super().__init__(message if line is None else f"{message} (line {line})")
        self.message = message
        self.line = line


class TruncatedError(ParseError):
    """BEGIN without END: the reply was cut off (usually the chat's output limit).

    `complete` holds the raw text of the blocks that arrived whole (the last block is dropped
    because it may be cut in the middle), `cut` names the block that was dropped.
    """

    def __init__(self, complete: str, done: list, cut: str):
        super().__init__("the reply was cut off before <<<RELAY:END>>>")
        self.complete = complete
        self.done = done
        self.cut = cut


@dataclass
class Write:
    path: str
    text: str


@dataclass
class Delete:
    path: str


@dataclass
class Edit:
    path: str
    sections: list  # [(search_lines, replace_lines)]


@dataclass
class SymbolEdit:
    """Replace a whole function/class/method, found by name (v0.3)."""
    path: str
    name: str
    text: str


@dataclass
class Patch:
    diff: str
    paths: list
    binary: bool = False
    deletes: bool = False


@dataclass
class ParsedResponse:
    commit: str | None = None
    ops: list = field(default_factory=list)
    notes: list = field(default_factory=list)
    needs: list = field(default_factory=list)


def _attrs(raw) -> dict:
    result = {}
    for m in ATTR_RE.finditer((raw or "").translate(SMART_QUOTES)):
        result[m.group(1)] = next(g for g in (m.group(2), m.group(3), m.group(4)) if g is not None)
    return result


def _edit_sections(body, lineno) -> list:
    """Parse the SEARCH/REPLACE sections of an EDIT block."""
    sections, state, search, replace = [], "out", [], []
    for k, line in enumerate(body, lineno + 1):
        if state == "out":
            if SEARCH_RE.match(line):
                state, search, replace = "search", [], []
            elif line.strip():
                raise ParseError("text outside a SEARCH/REPLACE section in EDIT", k)
        elif state == "search":
            if DIVIDER_RE.match(line):
                state = "replace"
            elif SEARCH_RE.match(line) or REPLACE_RE.match(line):
                raise ParseError("SEARCH section without a ======= divider", k)
            else:
                search.append(line)
        else:
            if REPLACE_RE.match(line):
                if not any(s.strip() for s in search):
                    raise ParseError("empty SEARCH section (use FILE write for new files)", k)
                sections.append((search, replace))
                state = "out"
            elif SEARCH_RE.match(line):
                raise ParseError("REPLACE section without a >>>>>>> REPLACE line", k)
            else:
                replace.append(line)
    if state != "out":
        raise ParseError("unfinished SEARCH/REPLACE section in EDIT", lineno)
    if not sections:
        raise ParseError("EDIT block has no SEARCH/REPLACE section", lineno)
    return sections


def _describe(kind, attrs) -> str:
    return f'{kind} {attrs["path"]}' if attrs.get("path") else kind


def _op_path(op):
    return getattr(op, "path", None)


def analyze_patch(diff: str):
    """Return (paths, has_binary, has_deletions) for a unified diff."""
    paths = []

    def add(p):
        if p and p != "/dev/null" and p not in paths:
            paths.append(p)

    for m in re.finditer(r"^diff --git a/(.+?) b/(.+)$", diff, re.M):
        add(m.group(1))
        add(m.group(2))
    if not paths:
        for m in re.finditer(r"^(?:---|\+\+\+) [ab]/(.+?)(?:\t.*)?$", diff, re.M):
            add(m.group(1))
    binary = "GIT binary patch" in diff or re.search(r"^Binary files .* differ$", diff, re.M) is not None
    deletes = re.search(r"^deleted file mode ", diff, re.M) is not None
    return paths, binary, deletes


def parse_patch_file(text: str) -> ParsedResponse:
    """Wrap a plain unified diff (sandbox mode) as a one-op response."""
    diff = text.replace("\r\n", "\n").replace("\r", "\n").strip("\n") + "\n"
    paths, binary, deletes = analyze_patch(diff)
    if not paths:
        raise ParseError("patch has no file headers")
    return ParsedResponse(ops=[Patch(diff, paths, binary, deletes)])


def parse_response(text: str) -> ParsedResponse:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    # P-1: first BEGIN, last END; everything outside is ignored (fences, prose).
    begin = end = None
    for i, line in enumerate(lines):
        m = MARKER_RE.match(line)
        if not m:
            continue
        if m.group(1) == "BEGIN" and begin is None:
            begin = i
        elif m.group(1) == "END":
            end = i
    if begin is None:
        raise ParseError("missing BEGIN marker")
    if _attrs(MARKER_RE.match(lines[begin]).group(2)).get("v") != "1":
        raise ParseError("BEGIN requires v=1", begin + 1)
    truncated = end is None or end < begin
    if truncated:
        end = len(lines)

    # P-2: blocks run from a marker to the next marker.
    blocks, current = [], None
    for i in range(begin + 1, end):
        line = lines[i]
        if line.startswith("<<<RELAY:"):
            m = MARKER_RE.match(line)
            if not m or m.group(1) in ("BEGIN", "END"):
                raise ParseError("malformed, unknown or misplaced marker", i + 1)
            current = [m.group(1), _attrs(m.group(2)), [], i + 1]
            blocks.append(current)
        elif current is None:
            if line.strip():
                raise ParseError("text before the first block marker", i + 1)
        else:
            current[2].append(line)

    if truncated:
        if not blocks:
            raise ParseError("missing END marker")
        cut = blocks.pop()  # may stop in the middle
        start, stop = begin + 1, cut[3] - 1
        complete = "\n".join(lines[start:stop]).strip("\n")
        done = [_describe(b[0], b[1]) for b in blocks if b[0] in ("FILE", "EDIT", "SYMBOL", "PATCH")]
        if complete:
            parse_response("<<<RELAY:BEGIN v=1>>>\n" + complete + "\n<<<RELAY:END>>>")  # must be valid
        raise TruncatedError(complete, done, _describe(cut[0], cut[1]))

    resp = ParsedResponse()
    file_keys = set()
    for kind, attrs, body, lineno in blocks:
        if kind == "COMMIT":
            if resp.commit is not None:
                raise ParseError("more than one COMMIT block", lineno)
            first = next((b.strip() for b in body if b.strip()), "")
            if not first:
                raise ParseError("empty COMMIT block", lineno)
            resp.commit = first
        elif kind == "FILE":
            path, action = attrs.get("path"), attrs.get("action")
            if not path:
                raise ParseError("FILE block needs a path attribute", lineno)
            if action not in ("write", "delete"):
                raise ParseError('FILE action must be "write" or "delete"', lineno)
            key = posixpath.normpath(path)
            if key in file_keys:
                raise ParseError(f"duplicate FILE block for {path}", lineno)
            file_keys.add(key)
            if action == "delete":
                if any(b.strip() for b in body):
                    raise ParseError("delete block must be empty", lineno)
                resp.ops.append(Delete(path))
            else:
                content = "\n".join(body).rstrip("\n")  # P-3
                resp.ops.append(Write(path, content + "\n" if content.strip() else ""))
        elif kind == "EDIT":
            path = attrs.get("path")
            if not path:
                raise ParseError("EDIT block needs a path attribute", lineno)
            sections = _edit_sections(body, lineno)
            same = next((op for op in resp.ops if isinstance(op, Edit) and op.path == path), None)
            if same:  # several EDIT blocks for one file: one op, applied in order
                same.sections.extend(sections)
            else:
                resp.ops.append(Edit(path, sections))
        elif kind == "SYMBOL":
            path, name = attrs.get("path"), attrs.get("name")
            if not path or not name:
                raise ParseError("SYMBOL block needs path and name attributes", lineno)
            code = "\n".join(body).strip("\n")
            if not code.strip():
                raise ParseError("empty SYMBOL block", lineno)
            resp.ops.append(SymbolEdit(path, name, code + "\n"))
        elif kind == "PATCH":
            diff = "\n".join(body).strip("\n") + "\n"
            paths, binary, deletes = analyze_patch(diff)
            if not paths:
                raise ParseError("PATCH has no file headers", lineno)
            resp.ops.append(Patch(diff, paths, binary, deletes))
        elif kind == "NEED":
            resp.needs.extend(b.strip() for b in body if b.strip())
        elif kind == "NOTE":
            note = "\n".join(body).strip()
            if note:
                resp.notes.append(note)

    # P-5: a PATCH must not touch a path that also has a FILE block; EDIT likewise.
    edit_keys = {posixpath.normpath(op.path) for op in resp.ops if isinstance(op, (Edit, SymbolEdit))}
    clash = edit_keys & file_keys
    if clash:
        raise ParseError(f"EDIT and FILE both touch {sorted(clash)[0]}")
    for op in resp.ops:
        if isinstance(op, Patch):
            touched = {posixpath.normpath(p) for p in op.paths}
            clash = touched & file_keys
            if clash:
                raise ParseError(f"PATCH and FILE both touch {sorted(clash)[0]}")
            clash = touched & edit_keys
            if clash:
                raise ParseError(f"PATCH and EDIT both touch {sorted(clash)[0]}")
    return resp


def merge_partial(parts: list, newer: ParsedResponse) -> ParsedResponse:
    """Put the blocks saved from cut-off replies in front of `newer`; newer wins per path."""
    taken = set()
    for op in newer.ops:
        for p in (op.paths if isinstance(op, Patch) else [op.path]):
            taken.add(posixpath.normpath(p))
    early, commit, notes = [], None, []
    for raw in parts:
        old = parse_response("<<<RELAY:BEGIN v=1>>>\n" + raw + "\n<<<RELAY:END>>>")
        commit = old.commit or commit
        notes.extend(old.notes)
        for op in old.ops:
            paths = op.paths if isinstance(op, Patch) else [op.path]
            if not {posixpath.normpath(p) for p in paths} & taken:
                early = [e for e in early if _op_path(e) is None or _op_path(e) != _op_path(op)]
                early.append(op)
    newer.ops = early + newer.ops
    newer.commit = newer.commit or commit
    newer.notes = notes + newer.notes
    return newer
