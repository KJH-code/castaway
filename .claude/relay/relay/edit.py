"""Tolerant text edits: SEARCH/REPLACE sections and a fuzzy fallback for unified diffs.

Chat models copy code well but count lines badly, and they sometimes change the indentation or
the trailing whitespace of the lines they quote. Both helpers here therefore look for the quoted
lines by content, not by line number, in three passes: exact, ignoring trailing whitespace, and
ignoring all leading/trailing whitespace (the replacement is then re-indented to match the file).
A match that needed the second or third pass is reported as "fuzzy" so the caller can treat the
result with a little more suspicion (relay re-sends such files on the next round).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field


class EditError(Exception):
    pass


_MODES = (
    ("exact", lambda s: s),
    ("rstrip", str.rstrip),
    ("strip", str.strip),
)


def _indent(line: str) -> str:
    return line[: len(line) - len(line.lstrip(" \t"))]


def find_block(lines, needle, hint=None, *, unique=True):
    """Locate `needle` (a list of lines) inside `lines`.

    Returns (start, mode). With several matches: the one nearest to `hint` when given, an error
    when `unique` is set and there is no hint.
    """
    n = len(needle)
    if n == 0 or not any(x.strip() for x in needle):
        raise EditError("the search text is empty or blank")
    for mode, key in _MODES:
        kn = [key(x) for x in needle]
        kl = [key(x) for x in lines]
        first = kn[0]
        hits = [i for i in range(len(lines) - n + 1) if kl[i] == first and kl[i:i + n] == kn]
        if len(hits) == 1:
            return hits[0], mode
        if len(hits) > 1:
            if hint is not None:
                return min(hits, key=lambda i: abs(i - hint)), mode
            if unique:
                raise EditError(
                    f"the search text matches {len(hits)} places; include a few more surrounding lines"
                )
            return hits[0], mode
    raise EditError("the search text was not found (it must copy existing lines exactly)")


def _reindent(file_lines, start, needle, new_lines):
    """Shift `new_lines` by the indentation difference between `needle` and the file."""
    for j, line in enumerate(needle):
        if line.strip():
            have, want = _indent(file_lines[start + j]), _indent(line)
            break
    else:
        return list(new_lines)
    if have == want:
        return list(new_lines)
    out = []
    if have.startswith(want):  # the file is indented deeper than the quote
        extra = have[len(want):]
        for line in new_lines:
            out.append(extra + line if line.strip() else line)
    elif want.startswith(have):  # the quote is indented deeper than the file
        cut = want[len(have):]
        for line in new_lines:
            out.append(line[len(cut):] if line.startswith(cut) else line.lstrip(" \t") if line.strip() else line)
    else:  # tabs vs spaces: leave the model's indentation alone
        out = list(new_lines)
    return out


def split_text(text: str):
    """Text -> (lines without newline, uses_crlf). A trailing newline shows up as a last ''."""
    crlf = "\r\n" in text
    return text.replace("\r\n", "\n").split("\n"), crlf


def join_text(lines, crlf: bool) -> str:
    text = "\n".join(lines)
    return text.replace("\n", "\r\n") if crlf else text


# ---------------------------------------------------------------- SEARCH/REPLACE (v0.3)
# More passes after exact / trailing / surrounding whitespace (all marked "fuzzy" so the file is
# re-sent next round): blank lines ignored, characters normalized (no-break and zero-width spaces,
# curly quotes, tabs, runs of spaces), then a unique high-similarity window. A search text that
# matches several places is not rejected when an earlier section of the same edit already fixed
# the position (the first match after it is taken), and a section whose replacement is already in
# the file is skipped ("already applied") instead of failing the whole reply.

_ZW = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff"), None)
_SP = {ord(c): " " for c in "\u00a0\u2007\u202f\u3000"}
_QUOTES = str.maketrans({"\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'"})
SIMILAR_MIN = 0.92     # a fuzzy window must be at least this similar ...
SIMILAR_MARGIN = 0.05  # ... and this much better than any other place that does not overlap it


def _loose(line: str) -> str:
    line = line.translate(_ZW).translate(_SP).translate(_QUOTES).replace("\t", "    ")
    return " ".join(line.split())


class AmbiguousError(EditError):
    def __init__(self, starts):
        lines = ", ".join(str(s + 1) for s in starts[:6])
        super().__init__(
            f"the search text matches {len(starts)} places (lines {lines}); include a few more "
            "surrounding lines so it matches only one"
        )
        self.starts = list(starts)


def _spans_contiguous(lines, needle, key):
    n = len(needle)
    kn = [key(x) for x in needle]
    kl = [key(x) for x in lines]
    first = kn[0]
    return [(i, i + n) for i in range(len(lines) - n + 1) if kl[i] == first and kl[i:i + n] == kn]


def _spans_nonblank(lines, needle, key):
    """Match the non-blank lines only (blank lines may differ). Spans cover the file lines used."""
    nb = [i for i, x in enumerate(lines) if x.strip()]
    kl = [key(lines[i]) for i in nb]
    kn = [key(x) for x in needle if x.strip()]
    m = len(kn)
    if not m:
        return []
    return [(nb[p], nb[p + m - 1] + 1) for p in range(len(nb) - m + 1) if kl[p] == kn[0] and kl[p:p + m] == kn]


def _covers(window, want) -> bool:
    """Every non-blank quoted line has a look-alike in the window — a window that leaves out a quoted
    line (say a short `return`) would make the replacement drop or duplicate code."""
    import difflib

    for w in want:
        if not w:
            continue
        if w in window:
            continue
        if not any(difflib.SequenceMatcher(None, w, x, autojunk=False).ratio() >= 0.8 for x in window if x):
            return False
    return True


def _spans_similar(lines, needle):
    """One window clearly more similar than every other non-overlapping one, or nothing."""
    import difflib

    want = [x.strip() for x in needle]
    if sum(1 for x in want if x) < 2:
        return []  # one line is too little to guess from
    target = "\n".join(want)
    sizes = sorted({max(1, len(needle) + d) for d in (0, -1, 1)})
    keys = [x.strip() for x in lines]
    scored = []
    for size in sizes:
        for i in range(0, len(lines) - size + 1):
            window = "\n".join(keys[i:i + size])
            sm = difflib.SequenceMatcher(None, window, target, autojunk=False)
            if sm.real_quick_ratio() < SIMILAR_MIN or sm.quick_ratio() < SIMILAR_MIN:
                continue
            ratio = sm.ratio()
            if ratio >= SIMILAR_MIN and _covers(keys[i:i + size], want):
                scored.append((ratio, i, i + size))
    if not scored:
        return []
    scored.sort(reverse=True)
    best = scored[0]
    if best[0] < SIMILAR_MIN:
        return []
    rival = next((s for s in scored[1:] if s[2] <= best[1] or s[1] >= best[2]), None)
    if rival and rival[0] > best[0] - SIMILAR_MARGIN:
        return []
    return [(best[1], best[2])]


def _partial_spans(lines, needle):
    """The quoted text starts in the middle of its first line and/or stops in the middle of its last
    line (`  return` for `  return { ...line }`): match it character for character. Returns
    [(start, end, head, tail)] — `head`/`tail` are the parts of the first/last file line outside the
    quote, kept around the replacement."""
    n = len(needle)
    first, last = needle[0], needle[-1]
    if not first.strip() or not last.strip():
        return []
    out = []
    if n == 1:
        if len(first.strip()) < 10:
            return []
        for i, line in enumerate(lines):
            at = line.find(first)
            if at >= 0 and line != first:
                if line.find(first, at + 1) >= 0:
                    return []  # twice on one line: too ambiguous
                out.append((i, i + 1, line[:at], line[at + len(first):]))
        return out
    for i in range(len(lines) - n + 1):
        a, b = lines[i], lines[i + n - 1]
        if not a.endswith(first) or not b.startswith(last) or lines[i + 1:i + n - 1] != needle[1:-1]:
            continue
        head, tail = a[: len(a) - len(first)], b[len(last):]
        if head or tail:
            out.append((i, i + n, head, tail))
    return out


_PASSES = (
    ("exact", lambda ls, nd: _spans_contiguous(ls, nd, lambda s: s)),
    ("rstrip", lambda ls, nd: _spans_contiguous(ls, nd, str.rstrip)),
    ("strip", lambda ls, nd: _spans_contiguous(ls, nd, str.strip)),
    ("blank", lambda ls, nd: _spans_nonblank(ls, nd, str.strip)),
    ("loose", lambda ls, nd: _spans_nonblank(ls, nd, _loose)),
    ("similar", _spans_similar),
)


def locate(lines, needle, after=None, *, passes=None):
    """(start, end, mode, picked) for `needle` in `lines`. `after`: where the previous section of the
    same edit ended — with several matches the first one at or after it is taken (`picked` True)."""
    if not any(x.strip() for x in needle):
        raise EditError("the search text is empty or blank")
    for mode, finder in _PASSES:
        if passes and mode not in passes:
            continue
        if mode == "rstrip" and not passes:
            part = _partial_spans(lines, needle)
            later = [sp for sp in part if after is not None and sp[0] >= after]
            if len(part) == 1 or later:
                sp = part[0] if len(part) == 1 else later[0]
                return sp[0], sp[1], "partial", (sp[2], sp[3])
        spans = finder(lines, needle)
        if len(spans) == 1:
            return spans[0][0], spans[0][1], mode, False
        if len(spans) > 1:
            later = [sp for sp in spans if after is not None and sp[0] >= after]
            if later:
                return later[0][0], later[0][1], mode, True
            raise AmbiguousError([sp[0] for sp in spans])
    raise EditError("the search text was not found (it must copy existing lines exactly)")


def _lead_spaces(line: str) -> str:
    """No-break spaces in the indentation (copied from a web page) count as plain spaces."""
    body = line.lstrip(" \t\u00a0\u2007\u202f")
    return line[: len(line) - len(body)].translate(_SP) + body


def _reindent_span(file_lines, start, end, needle, new_lines):
    """Shift `new_lines` by the indentation difference between the quoted and the file's first
    non-blank line."""
    needle = [_lead_spaces(x) for x in needle]
    have = next((_indent(x) for x in file_lines[start:end] if x.strip()), None)
    want = next((_indent(x) for x in needle if x.strip()), None)
    if have is None or want is None or have == want:
        return list(new_lines)
    out = []
    if have.startswith(want):
        extra = have[len(want):]
        for line in new_lines:
            out.append(extra + line if line.strip() else line)
    elif want.startswith(have):
        cut = want[len(have):]
        for line in new_lines:
            out.append(line[len(cut):] if line.startswith(cut) else line.lstrip(" \t") if line.strip() else line)
    else:
        out = list(new_lines)
    return out


def _already_there(lines, replace, search) -> bool:
    """The replacement text is already in the file (the same edit was applied before)."""
    if not any(x.strip() for x in replace) or [x.strip() for x in replace] == [x.strip() for x in search]:
        return False
    try:
        locate(lines, replace, passes=("exact", "rstrip", "strip"))
        return True
    except AmbiguousError:
        return True
    except EditError:
        return False


def apply_search_replace(text: str, sections, report=None) -> tuple:
    """Apply [(search_lines, replace_lines), ...] in order. Returns (new_text, fuzzy).
    `report` (a list) receives one line for each section that needed a decision."""
    lines, crlf = split_text(text)
    fuzzy, after = False, None
    for number, (search, replace) in enumerate(sections, 1):
        preview = next((s.strip() for s in search if s.strip()), "")[:60]
        try:
            start, end, mode, picked = locate(lines, search, after)
        except EditError as exc:
            if _already_there(lines, replace, search):
                if report is not None:
                    report.append(f"section {number} ({preview!r}) is already applied; skipped")
                continue
            raise EditError(f"section {number} ({preview!r}): {exc}")
        new = [_lead_spaces(x) for x in replace]
        if mode == "partial":
            head, tail = picked
            new = list(replace) or [""]
            new[0] = head + new[0]
            new[-1] = new[-1] + tail
            if report is not None:
                report.append(f"section {number} ({preview!r}): matched part of a line; the rest of the line was kept")
            lines[start:end] = new
            after = start + len(new)
            continue
        if mode != "exact" or picked:
            fuzzy = True
            if mode not in ("exact", "rstrip"):
                new = _reindent_span(lines, start, end, search, new)
            if report is not None:
                why = "picked the match after the previous section" if picked else f"matched loosely ({mode})"
                report.append(f"section {number} ({preview!r}): {why}")
        lines[start:end] = new
        after = start + len(new)
    return join_text(lines, crlf), fuzzy


# ---------------------------------------------------------------- unified diff fallback

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


@dataclass
class FileDiff:
    old: str | None
    new: str | None
    hunks: list = field(default_factory=list)  # [(old_start or None, [(tag, text), ...])]
    meta: list = field(default_factory=list)


def _strip_prefix(path: str) -> str | None:
    path = path.split("\t")[0].strip()
    if path == "/dev/null":
        return None
    if path[:2] in ("a/", "b/"):
        path = path[2:]
    return path


def parse_unified(diff: str) -> list:
    lines = diff.replace("\r\n", "\n").split("\n")
    files, cur, hunk = [], None, None
    i = 0
    while i < len(lines):
        line = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if line.startswith("diff --git "):
            cur, hunk = FileDiff(None, None), None
            files.append(cur)
            m = re.match(r"^diff --git a/(.+?) b/(.+)$", line)
            if m:
                cur.old, cur.new = m.group(1), m.group(2)
        elif line.startswith("--- ") and nxt.startswith("+++ "):
            if cur is None or cur.hunks:
                cur = FileDiff(None, None)
                files.append(cur)
            cur.old, cur.new = _strip_prefix(line[4:]), _strip_prefix(nxt[4:])
            hunk = None
            i += 1
        elif line.startswith("@@"):
            if cur is None:
                raise EditError("hunk without file headers")
            m = HUNK_RE.match(line)
            hunk = [int(m.group(1)) if m else None, []]
            cur.hunks.append(hunk)
        elif hunk is not None and (line[:1] in (" ", "-", "+") or line == ""):
            hunk[1].append((line[:1] or " ", line[1:]))
        elif line.startswith("\\"):
            pass  # "\ No newline at end of file": keep the file's own ending
        elif cur is not None:
            cur.meta.append(line)
        i += 1
    # a diff body usually ends with "\n": drop the empty context line that produces
    for f in files:
        for h in f.hunks:
            while h[1] and h[1][-1] == (" ", ""):
                h[1].pop()
    return files


def _apply_hunks(text: str, hunks) -> tuple:
    lines, crlf = split_text(text)
    fuzzy, offset, floor = False, 0, 0
    for number, (old_start, ops) in enumerate(hunks, 1):
        old = [t for tag, t in ops if tag in (" ", "-")]
        hint = None if old_start is None else max(0, old_start - 1 + offset)
        if not old:  # pure insertion: trust the line number
            if hint is None:
                raise EditError(f"hunk {number} adds lines but has no line number or context")
            new = [t for tag, t in ops if tag == "+"]
            lines[hint:hint] = new
            offset += len(new)
            fuzzy = True
            continue
        try:
            start, mode = find_block(lines, old, hint, unique=False)
        except EditError as exc:
            raise EditError(f"hunk {number}: {exc}")
        if start < floor:
            raise EditError(f"hunk {number} matches before the previous hunk")
        if mode != "exact" or (hint is not None and start != hint):
            fuzzy = True
        plus = [t for tag, t in ops if tag == "+"]
        plus = _reindent(lines, start, old, plus) if mode == "strip" else plus
        out, k, p = [], start, 0
        for tag, _ in ops:
            if tag == " ":
                out.append(lines[k])  # keep the file's own context line
                k += 1
            elif tag == "-":
                k += 1
            else:
                out.append(plus[p])
                p += 1
        lines[start:start + len(old)] = out
        offset += len(out) - len(old)
        floor = start + len(out)
    return join_text(lines, crlf), fuzzy


def fuzzy_patch(read, diff: str) -> dict:
    """Apply a unified diff by content. `read(path)` returns the current text or None.

    Returns {path: new_text}. Only edits of existing files and new files are handled; deletions,
    renames and mode changes are left to git (raise EditError).
    """
    results = {}
    for f in parse_unified(diff):
        if any(m.startswith(("rename ", "copy ", "old mode", "new mode", "similarity")) for m in f.meta):
            raise EditError("renames and mode changes need an exact patch")
        if f.new is None:
            raise EditError("file deletions need an exact patch")
        if f.old is not None and f.old != f.new:
            raise EditError("renames need an exact patch")
        path = f.new
        if f.old is None:  # new file
            if read(path) is not None or path in results:
                raise EditError(f"{path} already exists")
            body = [t for h in f.hunks for tag, t in h[1] if tag == "+"]
            results[path] = "\n".join(body) + "\n"
            continue
        current = results.get(path, read(path))
        if current is None:
            raise EditError(f"{path} does not exist")
        try:
            results[path], _ = _apply_hunks(current, f.hunks)
        except EditError as exc:
            raise EditError(f"{path}: {exc}")
    if not results:
        raise EditError("the patch changes nothing")
    return results
