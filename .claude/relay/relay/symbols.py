"""Functions, classes and methods of a source file (v0.3) — standard library only.

Python files are read with the `ast` module (exact ranges). Brace languages (JavaScript/TypeScript,
Java, C#, Go, Rust, Kotlin, Swift, PHP, C/C++, Dart, Scala) use declaration patterns and a small
scanner that skips strings and comments to find the closing brace. Other files have no symbols.

Used for the repository map, outline views of large files, and SYMBOL edits (replace a whole
function by name).
"""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass

PY_EXT = (".py", ".pyi")
BRACE_EXT = (
    ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts", ".java", ".cs", ".go", ".rs", ".kt",
    ".kts", ".swift", ".php", ".c", ".h", ".cc", ".cpp", ".cxx", ".hpp", ".hh", ".dart", ".scala",
)
KEYWORDS = {
    "if", "for", "while", "switch", "catch", "return", "function", "else", "do", "try", "new",
    "typeof", "await", "yield", "with", "case", "throw", "sizeof", "foreach", "using", "lock", "match",
}


@dataclass
class Symbol:
    name: str
    qual: str        # Class.method for members
    kind: str        # function | class | method
    start: int       # first line (0-based), decorators/annotations included
    head: int        # the declaration line
    end: int         # last line (inclusive)
    sig: str         # the declaration, one line


def supported(path: str) -> bool:
    return path.lower().endswith(PY_EXT + BRACE_EXT)


def extract(path: str, text: str) -> list:
    low = path.lower()
    try:
        if low.endswith(PY_EXT):
            return _python(text)
        if low.endswith(BRACE_EXT):
            return _brace(text)
    except (RecursionError, ValueError):
        return []
    return []


# ---------------------------------------------------------------- Python

def _python(text: str) -> list:
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return _python_regex(text)
    lines = text.split("\n")
    out = []

    def sig_of(node):
        i = node.lineno - 1
        sig = lines[i].strip()
        k = i
        while not sig.rstrip().endswith(":") and k + 1 < len(lines) and k - i < 6:
            k += 1
            sig += " " + lines[k].strip()
        return sig[:200]

    def visit(body, parent):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                start = min([node.lineno] + [d.lineno for d in node.decorator_list]) - 1
                kind = "class" if isinstance(node, ast.ClassDef) else ("method" if parent else "function")
                qual = f"{parent}.{node.name}" if parent else node.name
                out.append(Symbol(node.name, qual, kind, start, node.lineno - 1, node.end_lineno - 1, sig_of(node)))
                if isinstance(node, ast.ClassDef) and not parent:
                    visit(node.body, node.name)

    visit(tree.body, "")
    return out


_PY_DEF = re.compile(r"^(\s*)(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)")


def _python_regex(text: str) -> list:
    """Files that do not parse (the code is being edited): indentation decides where a block ends."""
    lines = text.split("\n")
    out, stack = [], []
    for i, line in enumerate(lines):
        m = _PY_DEF.match(line)
        if not m:
            continue
        indent = len(m.group(1))
        end = i
        for k in range(i + 1, len(lines)):
            if lines[k].strip() and len(lines[k]) - len(lines[k].lstrip()) <= indent:
                break
            if lines[k].strip():
                end = k
        while stack and stack[-1][1] >= indent:
            stack.pop()
        parent = stack[-1][0] if stack else ""
        kind = "class" if m.group(2) == "class" else ("method" if parent else "function")
        name = m.group(3)
        out.append(Symbol(name, f"{parent}.{name}" if parent else name, kind, i, i, end, line.strip()[:200]))
        if kind == "class":
            stack.append((name, indent))
    return out


# ---------------------------------------------------------------- brace languages

_MOD = r"(?:(?:export|default|public|private|protected|internal|static|final|abstract|override|virtual|async|" \
       r"synchronized|sealed|partial|readonly|open|inline|suspend|unsafe|extern|pub(?:\([^)]*\))?|const|data|" \
       r"inner|operator|mutating|fileprivate|declare)\s+)*"
_DECLS = [
    ("class", re.compile(r"^\s*" + _MOD + r"(?:class|interface|struct|enum|trait|record|object|protocol|"
                         r"extension|impl(?:<[^>]*>)?)\s+([A-Za-z_$][\w$]*)")),
    ("class", re.compile(r"^\s*type\s+([A-Za-z_]\w*)(?:\[[^\]]*\])?\s+(?:struct|interface)\b")),  # Go
    ("function", re.compile(r"^\s*" + _MOD + r"(?:function\s*\*?|func|fun|fn|def)\s+(?:\([^)]*\)\s*)?"
                            r"(?:<[^>]*>\s*)?([A-Za-z_$][\w$]*)\s*[(<]")),
    ("function", re.compile(r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*"
                            r"(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=]+)?=>|[A-Za-z_$][\w$]*\s*=>)")),
    # Java / C# / C++ style: modifiers or a return type before the name, a body that opens on this line
    # or the next one (prototypes ending in ';' are skipped)
    ("method", re.compile(r"^\s*" + _MOD + r"(?:[\w<>\[\],.?*&:]+\s+)+([A-Za-z_~][\w]*)\s*\([^;{}]*\)?"
                          r"[^;{}]*\{?\s*$")),
    # methods inside a class body (JS/TS): name(args) {
    ("method", re.compile(r"^\s+" + _MOD + r"(?:get\s+|set\s+|\*\s*)?([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*"
                          r"(?::\s*[^{;]+)?\{")),
]


_GO_RECV = re.compile(r"^\s*func\s+\(\s*\w*\s*\*?\s*([A-Za-z_]\w*)")


def _code_mask(text: str) -> str:
    """The same text with strings and comments blanked out (newlines kept), so braces can be counted."""
    out, i, n = list(text), 0, len(text)
    mode = None
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if mode is None:
            if c == "/" and nxt == "/":
                mode = "line"
            elif c == "/" and nxt == "*":
                mode = "block"
            elif c in "\"'`":
                mode = c
                i += 1
                continue
            else:
                i += 1
                continue
        if mode == "line":
            if c == "\n":
                mode = None
            else:
                out[i] = " "
        elif mode == "block":
            if c == "*" and nxt == "/":
                out[i] = out[i + 1] = " "
                mode = None
                i += 2
                continue
            if c != "\n":
                out[i] = " "
        else:  # inside a string
            if c == "\\":
                out[i] = " "
                if i + 1 < n and text[i + 1] != "\n":
                    out[i + 1] = " "
                i += 2
                continue
            if c == mode:
                mode = None
            elif c == "\n" and mode != "`":
                mode = None  # unterminated string: stop at the line end
            else:
                out[i] = " "
        i += 1
    return "".join(out)


def _block_end(masked_lines, head: int):
    """Line of the brace that closes the block opened on `head` (or within the next 3 lines)."""
    depth, opened = 0, False
    for k in range(head, len(masked_lines)):
        line = masked_lines[k]
        if not opened and k > head + 3:
            return None
        for ch in line:
            if ch == "{":
                depth += 1
                opened = True
            elif ch == "}":
                depth -= 1
                if opened and depth == 0:
                    return k
            elif ch == ";" and not opened and depth == 0:
                return None  # a prototype / statement, not a body
    return None


def _brace(text: str) -> list:
    lines = text.split("\n")
    masked = _code_mask(text).split("\n")
    found = []
    for i, line in enumerate(lines):
        if not masked[i].strip():
            continue
        for kind, rx in _DECLS:
            m = rx.match(masked[i])
            if not m:
                continue
            name = m.group(1)
            if name in KEYWORDS:
                continue
            end = _block_end(masked, i)
            if end is None:
                if kind != "function":  # arrow functions without braces still count
                    continue
                end = i
            start = i
            while start > 0 and lines[start - 1].strip().startswith(("@", "#[", "[")):
                start -= 1  # decorators / annotations / attributes
            qual = name
            recv = _GO_RECV.match(masked[i])
            if recv:  # Go method: func (s *Server) Start() → Server.Start
                qual = f"{recv.group(1)}.{name}"
            found.append(Symbol(name, qual, kind, start, i, end, line.strip()[:200]))
            break
    # members: symbols inside a class range get the class as parent
    classes = [s for s in found if s.kind == "class"]
    out = []
    for s in found:
        parent = next((c for c in reversed(classes) if c is not s and c.head < s.head and s.end <= c.end), None)
        if parent and s.kind != "class":
            s.kind, s.qual = "method", f"{parent.name}.{s.name}"
        elif s.qual != s.name:
            s.kind = "method"  # Go receiver
        elif s.kind == "method":
            s.kind = "function"
        out.append(s)
    return out


# ---------------------------------------------------------------- lookup and replace

class SymbolError(Exception):
    pass


def find(path: str, text: str, name: str) -> Symbol:
    syms = extract(path, text)
    if not syms:
        raise SymbolError(f"no functions or classes could be read from {path}; use EDIT")
    want = name.strip()
    hits = [s for s in syms if s.qual == want] or [s for s in syms if s.name == want.split(".")[-1]]
    if not hits:
        known = ", ".join(s.qual for s in syms[:12])
        raise SymbolError(f"{want} is not defined in {path} (found: {known}); use EDIT, or FILE for a new function")
    if len(hits) > 1:
        raise SymbolError(f"{want} is defined {len(hits)} times in {path}; name it as Class.method or use EDIT")
    return hits[0]


def replace(path: str, text: str, name: str, new_text: str) -> str:
    """Replace the whole definition `name` with `new_text` (re-indented to where it sits)."""
    sym = find(path, text, name)
    lines = text.split("\n")
    new = new_text.rstrip("\n").split("\n")
    while new and not new[0].strip():
        new.pop(0)
    if not new:
        raise SymbolError("the SYMBOL block is empty (to delete a function use EDIT)")
    # keep the file's decorators/annotations when the new text does not bring its own
    first = new[0].lstrip()
    start = sym.start if first.startswith(("@", "#[", "[")) else sym.head
    want = re.match(r"[ \t]*", lines[sym.head]).group(0)
    have = re.match(r"[ \t]*", new[0]).group(0)
    if have != want:
        fixed = []
        for line in new:
            if not line.strip():
                fixed.append(line)
            elif line.startswith(have):
                fixed.append(want + line[len(have):])
            else:
                fixed.append(want + line.lstrip(" \t"))
        new = fixed
    lines[start:sym.end + 1] = new
    return "\n".join(lines)


def outline(path: str, text: str, limit: int = 120) -> list:
    """`L<line>: <declaration>` for each symbol (members indented)."""
    out = []
    for s in extract(path, text)[:limit]:
        pad = "  " if s.kind == "method" else ""
        out.append(f"L{s.head + 1}: {pad}{s.sig}")
    return out
