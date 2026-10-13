#!/usr/bin/env python3
"""tools/make-font.py — CASTAWAY

Builds the game's digital-clock typeface and writes it into engine/css/font.css as a data: URL
(so it also loads from file:// and inside the packaged app).

    python3 tools/make-font.py

The face is a 14-segment display: every glyph is a set of hexagonal bars (plus a few diagonals
and dots) on one fixed-width cell, like the digits of a digital clock. It covers A–Z (lower case
maps to the same shapes), 0–9 and common punctuation. Anything else — all Korean text — falls
through to the next font in the CSS stack.

No font library is used: this writes the TrueType tables directly (glyf/loca, cmap format 4,
head, hhea, hmtx, maxp, name, OS/2, post).
"""
import base64, struct, os, sys

EM, ADV = 1000, 620
X0, X1, Y0, Y1 = 62, 558, 0, 700
XM, YM = (X0 + X1) // 2, (Y0 + Y1) // 2
T = 96; H = T // 2; G = 13          # bar thickness, half thickness, gap between bars
VW = 34                             # half width of the thin centre bars and diagonals


def hbar(xa, xb, y, h=H):
    return [(xa, y), (xa + h, y + h), (xb - h, y + h), (xb, y), (xb - h, y - h), (xa + h, y - h)]


def vbar(x, ya, yb, h=H):
    return [(x, ya), (x - h, ya + h), (x - h, yb - h), (x, yb), (x + h, yb - h), (x + h, ya + h)]


def diag(px, py, qx, qy, w=VW):     # P is the upper end, Q the lower end
    return [(px - w, py), (px + w, py), (qx + w, qy), (qx - w, qy)]


def box(x0, y0, x1, y1):
    return [(x0, y0), (x0, y1), (x1, y1), (x1, y0)]


SEG = {
    'a': hbar(X0 + G, X1 - G, Y1 - H),
    'd': hbar(X0 + G, X1 - G, Y0 + H),
    'g1': hbar(X0 + G, XM - G // 2 + H // 2, YM),
    'g2': hbar(XM + G // 2 - H // 2, X1 - G, YM),
    'f': vbar(X0 + H, YM + G // 2, Y1 - G),
    'e': vbar(X0 + H, Y0 + G, YM - G // 2),
    'b': vbar(X1 - H, YM + G // 2, Y1 - G),
    'c': vbar(X1 - H, Y0 + G, YM - G // 2),
    'i': vbar(XM, YM + H // 2 + G, Y1 - T - G, VW),
    'l': vbar(XM, Y0 + T + G, YM - H // 2 - G, VW),
    'h': diag(X0 + T + G + VW, Y1 - T - G, XM - VW * 2 - G, YM + H + G),
    'j': diag(X1 - T - G - VW, Y1 - T - G, XM + VW * 2 + G, YM + H + G),
    'k': diag(XM - VW * 2 - G, YM - H - G, X0 + T + G + VW, Y0 + T + G),
    'm': diag(XM + VW * 2 + G, YM - H - G, X1 - T - G - VW, Y0 + T + G),
    # dots and small marks
    'dot': box(XM - 52, 0, XM + 52, 104),
    'dotL': box(X0 + 20, 0, X0 + 124, 104),
    'dotU': box(XM - 52, 440, XM + 52, 544),
    'dotD': box(XM - 52, 130, XM + 52, 234),
    'dotM': box(XM - 52, YM - 52, XM + 52, YM + 52),
    'dotTL': box(X0 + 10, 560, X0 + 130, 680),
    'dotBR': box(X1 - 130, 20, X1 - 10, 140),
    'tick': box(XM - 40, 500, XM + 40, 700),
    'tickL': box(XM - 130, 500, XM - 50, 700),
    'tickR': box(XM + 50, 500, XM + 130, 700),
    'tail': diag(XM + 30, 110, XM - 60, -110, 40),
}

GLYPHS = {
    '0': 'a b c d e f j k', '1': 'b c j', '2': 'a b g1 g2 e d', '3': 'a b g2 c d', '4': 'f g1 g2 b c',
    '5': 'a f g1 g2 c d', '6': 'a f g1 g2 e c d', '7': 'a b c', '8': 'a b c d e f g1 g2', '9': 'a b c d f g1 g2',
    'A': 'a b c e f g1 g2', 'B': 'a b c d g2 i l', 'C': 'a d e f', 'D': 'a b c d i l', 'E': 'a d e f g1 g2',
    'F': 'a e f g1 g2', 'G': 'a c d e f g2', 'H': 'b c e f g1 g2', 'I': 'a d i l', 'J': 'b c d e',
    'K': 'e f g1 j m', 'L': 'd e f', 'M': 'b c e f h j', 'N': 'b c e f h m', 'O': 'a b c d e f',
    'P': 'a b e f g1 g2', 'Q': 'a b c d e f m', 'R': 'a b e f g1 g2 m', 'S': 'a c d f g1 g2', 'T': 'a i l',
    'U': 'b c d e f', 'V': 'e f k j', 'W': 'b c e f k m', 'X': 'h j k m', 'Y': 'h j l', 'Z': 'a d j k',
    '-': 'g1 g2', '_': 'd', '=': 'g1 g2 d', '+': 'g1 g2 i l', '/': 'j k', '\\': 'h m', '*': 'g1 g2 h i j k l m',
    '<': 'j m', '>': 'h k', '|': 'i l',          # brackets are left to the fallback font — as segments they read as C and J
    '.': 'dot', ',': 'tail', ':': 'dotU dotD', ';': 'dotU tail', '!': 'i dot', '?': 'a b g2 l dotL',
    "'": 'tick', '"': 'tickL tickR', '%': 'j k dotTL dotBR', '^': 'h j',
    '·': 'dotM', '—': 'g1 g2', '–': 'g1 g2', '×': 'h j k m', '−': 'g1 g2',
    ' ': '',
}


def glyph_data(contours):
    if not contours:
        return b''
    pts = [p for c in contours for p in c]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    out = struct.pack('>hhhhh', len(contours), min(xs), min(ys), max(xs), max(ys))
    end = -1
    for c in contours:
        end += len(c); out += struct.pack('>H', end)
    out += struct.pack('>H', 0)                       # no instructions
    out += bytes([0x01] * len(pts))                   # on-curve, long x and y
    px = py = 0
    dx = b''; dy = b''
    for x, y in pts:
        dx += struct.pack('>h', x - px); dy += struct.pack('>h', y - py); px, py = x, y
    out += dx + dy
    return out + b'\0' * (-len(out) % 4)


def checksum(data):
    data += b'\0' * (-len(data) % 4)
    return sum(struct.unpack('>%dI' % (len(data) // 4), data)) & 0xFFFFFFFF


def build():
    chars = sorted(GLYPHS)                                             # glyph 0 = .notdef, then one per character
    glyphs = [[box(X0, 0, X1, 700), list(reversed(box(X0 + 60, 60, X1 - 60, 640)))]]   # .notdef: a hollow box
    for ch in chars:
        glyphs.append([SEG[s] for s in GLYPHS[ch].split()])
    n = len(glyphs)
    gid = {ch: i + 1 for i, ch in enumerate(chars)}
    cmap = dict(gid)
    for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        cmap[ch.lower()] = gid[ch]

    glyf = b''; loca = [0]
    for g in glyphs:
        glyf += glyph_data(g); loca.append(len(glyf))
    loca_t = struct.pack('>%dI' % len(loca), *loca)
    allpts = [p for g in glyphs for c in g for p in c]
    xmin = min(p[0] for p in allpts); xmax = max(p[0] for p in allpts)
    ymin = min(p[1] for p in allpts); ymax = max(p[1] for p in allpts)
    maxpts = max(sum(len(c) for c in g) for g in glyphs); maxcont = max(len(g) for g in glyphs)

    head = struct.pack('>IIIIHHqqhhhhHHhhh', 0x00010000, 0x00010000, 0, 0x5F0F3CF5, 0x0003, EM, 0, 0,
                       xmin, ymin, xmax, ymax, 0, 8, 2, 1, 0)
    hhea = struct.pack('>IhhhHhhhhhhhhhhhH', 0x00010000, 800, -200, 0, ADV, xmin, ADV - xmax, xmax, 1, 0, 0, 0, 0, 0, 0, 0, n)
    maxp = struct.pack('>IHHHHHHHHHHHHHH', 0x00010000, n, maxpts, maxcont, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)
    hmtx = b''
    for g in glyphs:
        pts = [p for c in g for p in c]
        hmtx += struct.pack('>Hh', ADV, min((p[0] for p in pts), default=0))

    codes = sorted(ord(c) for c in cmap)
    segs = [(c, c, (cmap[chr(c)] - c) & 0xFFFF) for c in codes] + [(0xFFFF, 0xFFFF, 1)]
    sc = len(segs); sr = 2
    while sr * 2 <= sc: sr *= 2
    es = sr.bit_length() - 1
    sub = struct.pack('>HHHHHHH', 4, 16 + sc * 8, 0, sc * 2, sr * 2, es, sc * 2 - sr * 2)
    sub += struct.pack('>%dH' % sc, *[s[1] for s in segs]) + struct.pack('>H', 0)
    sub += struct.pack('>%dH' % sc, *[s[0] for s in segs])
    sub += struct.pack('>%dH' % sc, *[s[2] for s in segs])
    sub += struct.pack('>%dH' % sc, *([0] * sc))
    cmap_t = struct.pack('>HH', 0, 2) + struct.pack('>HHI', 0, 3, 20) + struct.pack('>HHI', 3, 1, 20) + sub

    names = {1: 'CastawaySeg', 2: 'Regular', 3: 'CastawaySeg 1.0', 4: 'CastawaySeg', 5: 'Version 1.0', 6: 'CastawaySeg'}
    strs = b''; recs = b''
    for nid in sorted(names):
        s = names[nid].encode('utf-16-be')
        recs += struct.pack('>HHHHHH', 3, 1, 0x409, nid, len(s), len(strs)); strs += s
    name_t = struct.pack('>HHH', 0, len(names), 6 + 12 * len(names)) + recs + strs

    os2 = struct.pack('>HhHHH', 4, ADV, 500, 5, 0)
    os2 += struct.pack('>10h', 650, 600, 0, 75, 650, 600, 0, 350, 50, 300)
    os2 += struct.pack('>h', 0) + bytes([2, 0, 5, 9, 0, 0, 0, 0, 0, 0])
    os2 += struct.pack('>IIII', 1, 0, 0, 0) + b'CAST'
    os2 += struct.pack('>HHH', 0x0040, min(codes), min(max(codes), 0xFFFF))
    os2 += struct.pack('>hhhHH', 800, -200, 0, 800, 200)
    os2 += struct.pack('>II', 1, 0) + struct.pack('>hhHHH', 350, 700, 0, 32, 1)
    post = struct.pack('>IIhhIIIII', 0x00030000, 0, -100, 50, 1, 0, 0, 0, 0)

    tables = {'OS/2': os2, 'cmap': cmap_t, 'glyf': glyf, 'head': head, 'hhea': hhea, 'hmtx': hmtx,
              'loca': loca_t, 'maxp': maxp, 'name': name_t, 'post': post}
    tags = sorted(tables)
    nt = len(tags); sr = 1
    while sr * 2 <= nt: sr *= 2
    out = struct.pack('>IHHHH', 0x00010000, nt, sr * 16, sr.bit_length() - 1, nt * 16 - sr * 16)
    off = 12 + 16 * nt; body = b''; dirs = b''; head_off = 0
    for t in tags:
        d = tables[t]
        if t == 'head': head_off = off + len(body)
        dirs += struct.pack('>4sIII', t.encode(), checksum(d), off + len(body), len(d))
        body += d + b'\0' * (-len(d) % 4)
    font = bytearray(out + dirs + body)
    adj = (0xB1B0AFBA - checksum(bytes(font))) & 0xFFFFFFFF
    font[head_off + 8:head_off + 12] = struct.pack('>I', adj)
    return bytes(font), n


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    font, n = build()
    css = ('/* font.css — CASTAWAY\n'
           '   디지털 시계 같은 글꼴(14-세그먼트 · 영문 대문자 꼴 · 숫자 · 흔한 문장 부호). 손으로 고치지 말 것 —\n'
           '   python3 tools/make-font.py 가 다시 쓴다. 한글은 여기에 없으니 다음 글꼴로 넘어간다. */\n'
           '@font-face{font-family:"CastawaySeg";font-display:block;src:url(data:font/ttf;base64,'
           + base64.b64encode(font).decode() + ') format("truetype")}\n')
    path = os.path.join(root, 'engine', 'css', 'font.css')
    open(path, 'w', encoding='utf-8', newline='\n').write(css)
    print('wrote engine/css/font.css — %d glyphs, %d bytes of TrueType' % (n, len(font)))


if __name__ == '__main__':
    sys.exit(main())
