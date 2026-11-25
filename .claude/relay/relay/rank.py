"""Which files matter for a task (v0.3) — standard library only.

An index of every text file (its functions/classes and the identifiers it uses) is kept in
`.relay/index.json` and refreshed by size + modification time. For a task it gives:

* BM25 over identifier parts (camelCase / snake_case split) and path words,
* exact hits: a function or class named in the task or the failure log,
* a personalized PageRank over "file A uses a name that file B defines" — the files the task's
  files lean on rise (the idea behind Aider's repository map),
* test files paired with source files by name.
"""
from __future__ import annotations

import json
import math
import os
import re
from collections import Counter

from . import symbols
from .fsutil import atomic_write
from .repo import relay_dir

INDEX_VERSION = 1
MAX_INDEX_BYTES = 300_000
MAX_IDS = 200
MAX_INDEX_FILES = 4000
IDENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]{2,}")
# code only — documents and data add noise (and size) to the identifier index
TEXT_EXT = symbols.PY_EXT + symbols.BRACE_EXT + (
    ".rb", ".lua", ".sh", ".ps1", ".sql", ".html", ".htm", ".css", ".scss", ".vue", ".svelte", ".gradle",
    ".r", ".jl", ".ex", ".exs",
)
STOP = {
    "the", "and", "for", "with", "this", "that", "from", "return", "const", "let", "var", "function", "def",
    "class", "import", "export", "self", "true", "false", "none", "null", "undefined", "new", "public",
    "private", "static", "void", "int", "str", "string", "async", "await", "else", "elif", "while", "print",
    "require", "module", "exports", "default", "type", "interface", "value", "data", "file", "files", "test",
    "tests", "add", "get", "set", "make", "use", "fix", "should", "please", "when", "then", "into", "not",
}


def parts(word: str) -> list:
    """`getUserName` → ['getusername', 'get', 'user', 'name']; `max_file_chars` → [..., 'max', 'file', 'chars']."""
    low = word.lower()
    bits = re.findall(r"[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+", word)
    out = [low] + [b.lower() for b in bits if len(b) >= 3]
    return list(dict.fromkeys(out))


def query_terms(text: str) -> list:
    terms = []
    for ident in IDENT.findall(text or ""):
        for p in parts(ident):
            if p not in STOP and p not in terms:
                terms.append(p)
    return terms


def _index_path(root):
    return relay_dir(root) / "index.json"


def load_index(root, universe) -> dict:
    """{path: {"syms": [[name, qual, kind, head, end, sig], ...], "ids": [...]}} for text files."""
    try:
        data = json.loads(_index_path(root).read_text(encoding="utf-8"))
        files = data.get("files", {}) if data.get("version") == INDEX_VERSION else {}
    except (OSError, ValueError, AttributeError):
        files = {}
    out, changed = {}, False
    for path in universe:
        if len(out) >= MAX_INDEX_FILES:
            break
        if not path.lower().endswith(TEXT_EXT):
            continue
        full = os.path.join(str(root), path)
        try:
            st = os.stat(full)
        except OSError:
            continue
        if st.st_size > MAX_INDEX_BYTES:
            continue
        key = [st.st_mtime_ns, st.st_size]
        hit = files.get(path)
        if hit and hit.get("k") == key:
            out[path] = hit
            continue
        try:
            with open(full, "rb") as fh:
                raw = fh.read()
        except OSError:
            continue
        if b"\0" in raw[:8192]:
            continue
        text = raw.decode("utf-8", errors="replace").replace("\r\n", "\n")
        syms = [[s.name, s.qual, s.kind, s.head, s.end, s.sig] for s in symbols.extract(path, text)]
        ids = [w for w, _ in Counter(IDENT.findall(text)).most_common(MAX_IDS)]
        out[path] = {"k": key, "syms": syms, "ids": ids}
        changed = True
    if changed or len(out) != len(files):
        try:
            atomic_write(_index_path(root), json.dumps({"version": INDEX_VERSION, "files": out}).encode("utf-8"))
        except OSError:
            pass
    return out


def _pagerank(nodes, edges, seeds, rounds=20, damping=0.85) -> dict:
    """edges: {a: {b: weight}}. seeds: {node: weight} (personalization)."""
    if not nodes:
        return {}
    total = sum(seeds.values()) or 0
    pers = {n: (seeds.get(n, 0) / total if total else 1 / len(nodes)) for n in nodes}
    rank = dict(pers)
    out_w = {a: sum(bs.values()) for a, bs in edges.items()}
    for _ in range(rounds):
        nxt = {n: (1 - damping) * pers[n] for n in nodes}
        dangling = sum(rank[n] for n in nodes if not out_w.get(n))
        for n in nodes:
            nxt[n] += damping * dangling * pers[n]
        for a, bs in edges.items():
            if not out_w.get(a):
                continue
            share = damping * rank.get(a, 0) / out_w[a]
            for b, w in bs.items():
                nxt[b] += share * w
        rank = nxt
    return rank


def score_files(index: dict, task: str, log_text: str = "", seeds=()) -> dict:
    """{path: score} — higher is more relevant. `seeds`: files already known to matter."""
    terms = query_terms(task) + [t for t in query_terms(log_text) if len(t) > 3][:40]
    terms = list(dict.fromkeys(terms))
    exact = {w for w in IDENT.findall((task or "") + "\n" + (log_text or ""))}
    defs = {}
    docs = {}
    for path, entry in index.items():
        words = set()
        for w in entry["ids"]:
            words.update(parts(w))
        for w in re.split(r"[/._\-]+", path):
            if len(w) >= 3:
                words.update(parts(w))
        for s in entry["syms"]:
            defs.setdefault(s[0], set()).add(path)
            words.update(parts(s[0]))
        docs[path] = words
    n = len(docs) or 1
    avg = sum(len(d) for d in docs.values()) / n if docs else 1
    df = Counter()
    for d in docs.values():
        for t in terms:
            if t in d:
                df[t] += 1
    bm25 = {}
    k1, b = 1.2, 0.75
    for path, d in docs.items():
        s = 0.0
        for t in terms:
            if t in d:
                idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
                s += idf * (k1 + 1) / (1 + k1 * (1 - b + b * len(d) / (avg or 1)))
        if s:
            bm25[path] = s
    hits = Counter()
    for w in exact:
        for path in defs.get(w, ()):
            hits[path] += 1
    # graph: A uses a name that B defines
    edges = {}
    for path, entry in index.items():
        for w in entry["ids"]:
            owners = defs.get(w)
            if not owners or len(owners) > 5:
                continue
            for o in owners:
                if o != path:
                    edges.setdefault(path, {})
                    edges[path][o] = edges[path].get(o, 0) + 1 / len(owners)
    seed_w = {p: 1.0 for p in seeds if p in index}
    top_bm = sorted(bm25.items(), key=lambda kv: -kv[1])[:8]
    for p, v in top_bm:
        seed_w[p] = seed_w.get(p, 0) + 0.5
    for p, v in hits.items():
        seed_w[p] = seed_w.get(p, 0) + 1.0 + 0.5 * v
    pr = _pagerank(list(index), edges, seed_w) if seed_w else {}
    pr_max = max(pr.values()) if pr else 0
    bm_max = max(bm25.values()) if bm25 else 0
    out = {}
    for path in index:
        s = 0.0
        if bm_max:
            s += 3.0 * bm25.get(path, 0) / bm_max
        if pr_max:
            s += 2.0 * pr.get(path, 0) / pr_max
        s += 2.5 * min(hits.get(path, 0), 3)
        if s > 0.05:
            out[path] = round(s, 4)
    return out


TEST_NAME = re.compile(r"(^|[/_.\-])(test|tests|spec|__tests__)([/_.\-]|$)", re.I)


def is_test(path: str) -> bool:
    return bool(TEST_NAME.search(path))


def test_pairs(path: str, universe) -> list:
    """Test files that look like they test `path` (cart.js ↔ cart.test.js · test_cart.py · CartTest.java)."""
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    if len(stem) < 3 or is_test(path):
        return []
    out = []
    for p in universe:
        if p == path or not is_test(p):
            continue
        base = os.path.splitext(os.path.basename(p))[0].lower()
        if stem in re.split(r"[._\-]|test|spec", base) or base in (f"test_{stem}", f"{stem}_test", f"{stem}test"):
            out.append(p)
    return out[:2]


def wanted_symbols(entry: dict, task: str, log_text: str = "", limit: int = 12, names=()) -> list:
    """Symbols of one file that the task, the log or the chat (`names`: asked for by name) point at —
    for slices of a large file. A name counts when it is the symbol, or is contained in it
    (`deleteOrder` → `handleDeleteOrder`); words that only overlap fill up to three slices."""
    text = (task or "") + "\n" + (log_text or "")
    exact = set(IDENT.findall(text)) | set(names)
    low = {w.lower() for w in exact if len(w) >= 4}
    terms = set(query_terms(task))
    strong, weak = [], []
    for s in entry.get("syms", []):
        name, qual = s[0], s[1]
        if name in exact or qual in exact:
            strong.append((5, s))
        elif any(w in name.lower() for w in low):
            strong.append((4, s))
        else:
            overlap = len(set(parts(name)) & terms)
            if overlap:
                weak.append((overlap, s))
    strong.sort(key=lambda x: -x[0])
    weak.sort(key=lambda x: -x[0])
    picked = [s for _, s in strong[:limit]]
    for _, s in weak:
        if len(picked) >= 3:
            break
        picked.append(s)
    return picked


def map_lines(index: dict, ranked: list, skip=(), width: int = 160) -> list:
    """`path: class Cart [total, add] · load() · mul()` for ranked files that have symbols."""
    lines = []
    for path in ranked:
        if path in skip:
            continue
        syms = index.get(path, {}).get("syms") or []
        if not syms:
            continue
        members = {}
        tops = []
        for name, qual, kind, *_ in syms:
            if kind == "method" and "." in qual:
                members.setdefault(qual.split(".")[0], []).append(name)
            else:
                tops.append((name, kind))
        bits = []
        for name, kind in tops:
            if kind == "class":
                inner = members.get(name, [])
                bits.append(f"class {name}" + (f" [{', '.join(inner[:8])}{', …' if len(inner) > 8 else ''}]" if inner else ""))
            else:
                bits.append(f"{name}()")
        for cls, inner in members.items():
            if not any(n == cls for n, _ in tops):
                bits.append(f"{cls} [{', '.join(inner[:8])}]")
        line = f"{path}: " + " · ".join(bits)
        lines.append(line if len(line) <= width else line[: width - 1] + "…")
    return lines
