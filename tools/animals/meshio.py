# tools/animals/meshio.py — stl2mesh.mjs 가 쓴 .bin 읽기 · 그림자 그림(살펴보기용)
import numpy as np
def load(path):
    b = open(path, 'rb').read(); nv, nt = np.frombuffer(b[:8], np.uint32)
    P = np.frombuffer(b[8:8 + nv * 12], np.float32).reshape(-1, 3).astype(np.float64)
    I = np.frombuffer(b[8 + nv * 12:8 + nv * 12 + nt * 12], np.uint32).reshape(-1, 3).astype(np.int64)
    return P, I
def shade(P, I, ax_u, ax_v, ax_d, size=220, flip_v=True, col=None):
    """정사영 음영 그림 — ax_u 가 가로 · ax_v 가 세로 · ax_d 쪽에서 본다(z 버퍼). (H,W,3) uint8"""
    from PIL import Image, ImageDraw
    u = P[:, ax_u]; v = P[:, ax_v]; d = P[:, ax_d]
    lo = np.array([u.min(), v.min()]); span = max(np.ptp(u), np.ptp(v)) * 1.05
    pu = (u - lo[0]) / span * size + (size - np.ptp(u) / span * size) / 2
    pv = (v - lo[1]) / span * size + (size - np.ptp(v) / span * size) / 2
    if flip_v: pv = size - pv
    A, B, C = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]; n = np.cross(B - A, C - A); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    L = np.zeros(3); L[ax_d] = 1; L[ax_v] += 0.6; L /= np.linalg.norm(L)
    sh = np.clip(np.abs(n @ L), 0, 1) * 0.8 + 0.2
    order = np.argsort(d[I].mean(1))
    im = Image.new('RGB', (size, size), (40, 44, 52)); dr = ImageDraw.Draw(im)
    for t in order:
        a, b, c = I[t]; g = int(sh[t] * 255)
        cc = (g, g, g) if col is None else tuple(int(g * x) for x in col[t])
        dr.polygon([(pu[a], pv[a]), (pu[b], pv[b]), (pu[c], pv[c])], fill=cc)
    return im

# 몸 크기(m) — 그림의 맨 위(귀 · 뿔 포함)까지. 종마다 rig 바깥에서 배율을 더 준다(97-animals.js)
HEIGHT = dict(cow=1.55, boar=0.95, doe=1.55, stag=2.15, sheep=1.0, hare=0.55, frog=0.10, lizard=0.16, pheasant=0.45, shark=0.62)
def orient(P, name):
    """STL(Z 위 · 머리 −Y) → 게임(+y 위 · +z 앞) · 발바닥 y 0 · 가운데 x·z 0 · m"""
    Q = np.stack([P[:, 0], P[:, 2], -P[:, 1]], 1)
    Q *= HEIGHT[name] / (Q[:, 1].max() - Q[:, 1].min())
    Q[:, 1] -= Q[:, 1].min(); Q[:, 0] -= (Q[:, 0].max() + Q[:, 0].min()) / 2; Q[:, 2] -= (Q[:, 2].max() + Q[:, 2].min()) / 2
    return Q
def grid_view(P, I, ax_u, ax_v, ax_d, size=520, step=0.1, bones=None, flip_u=False):
    """meter 격자를 깐 정사영 그림 · bones=[(머리, 끝, 이름)] 를 겹쳐 그린다"""
    from PIL import ImageDraw
    Pu = P.copy()
    if flip_u: Pu[:, ax_u] *= -1
    im = shade(Pu, I, ax_u, ax_v, ax_d, size)
    u = Pu[:, ax_u]; v = Pu[:, ax_v]; span = max(np.ptp(u), np.ptp(v)) * 1.05
    ou = u.min() - (span - np.ptp(u)) / 2; ov = v.min() - (span - np.ptp(v)) / 2
    X = lambda a: (a - ou) / span * size; Y = lambda b: size - (b - ov) / span * size
    dr = ImageDraw.Draw(im)
    g = np.arange(np.floor(ou / step) * step, ou + span, step)
    for a in g: dr.line([(X(a), 0), (X(a), size)], fill=(90, 120, 90) if abs(a) > 1e-6 else (200, 80, 80))
    g = np.arange(np.floor(ov / step) * step, ov + span, step)
    for b in g: dr.line([(0, Y(b)), (size, Y(b))], fill=(90, 120, 90) if abs(b) > 1e-6 else (200, 80, 80))
    if bones:
        for h, t, n in bones:
            hu = -h[ax_u] if flip_u else h[ax_u]; tu = -t[ax_u] if flip_u else t[ax_u]
            dr.line([(X(hu), Y(h[ax_v])), (X(tu), Y(t[ax_v]))], fill=(255, 60, 200), width=3)
            dr.ellipse([X(hu) - 4, Y(h[ax_v]) - 4, X(hu) + 4, Y(h[ax_v]) + 4], fill=(255, 220, 0))
    dr.text((4, 4), f'grid {step} m', fill=(255, 200, 0))
    return im
