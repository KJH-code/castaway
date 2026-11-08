# tools/animals/rig.py — 짐승 STL 을 줄인 메시(stl2mesh.mjs) → 뼈 심은 게임 자료(engine/js/data-animal-meshes.js)
#
#   node tools/animals/stl2mesh.mjs <작업> meshes/organic/*.stl
#   env/py/bin/python -I tools/animals/rig.py <작업> [이름 …]      # 이름을 안 주면 열 마리 전부 · <작업>/chk_<이름>.png 로 확인 그림
#
# ① 세운다(meshio.orient — +y 위 · +z 앞 · m) ② 뼈(아래 SPEC — 몸 꼴마다 이름이 같다: quad · frog · lizard · bird · fish)
# ③ 무게 — tools/sheep/rig.py 와 같은 법: 몸을 칸으로 채워(겉 칠 → 바깥 채우기 → 속) 뼈 마디에서 몸 속을 따라 잰 거리(6방 BFS) · 가까운 뼈 넷을 1/d⁴
# ④ 쉼 자세 바로잡기 — 걷는 중이던 다리를 곧게 세우고(윗마디를 돌려 발이 엉덩이 · 어깨 바로 밑에) · 옆으로 돌린 고개를 앞으로(목을 y 축으로)
#    — 그 자세로 정점을 옮겨(선형 섞기) 새 쉼 자세로 삼는다. 몸짓 표(data-animal-clips.js)는 이 곧은 자세에서 잰 각이다
# ⑤ 몸통 가운데를 x 0 에 · 발바닥 y 0 ⑥ 두 단계(가까이 · 멀리)를 16비트 자리 · 8비트 법선 · 8비트 뼈 번호 · 8비트 무게로 → base64
import sys, json, base64, struct, numpy as np
sys.path.insert(0, 'tools/animals'); from meshio import load, orient, grid_view, shade, HEIGHT

def mirror(bones):
    out = []; have = {b[0] for b in bones}
    for n, p, h, t in bones:
        if n.endswith('L') and n[:-1] + 'R' not in have:
            out.append((n[:-1] + 'R', p[:-1] + 'R' if p and p.endswith('L') else p, (-h[0], h[1], h[2]), (-t[0], t[1], t[2])))
    return bones + out

def quad(pelvis, spine, chest, neck, head, tail, ear, fl, hl, extra=()):
    """quad 뼈 — 다리는 [윗마디 머리, 무릎/뒷무릎, 발목, 발끝] (왼쪽 · +x)"""
    B = [('root', None, (0, 0, 0), (0, 0, 0)),
         ('pelvis', 'root', pelvis[0], pelvis[1]), ('spine', 'pelvis', spine[0], spine[1]), ('chest', 'spine', chest[0], chest[1]),
         ('neck', 'chest', neck[0], neck[1]), ('head', 'neck', head[0], head[1]), ('tail', 'pelvis', tail[0], tail[1]),
         ('earL', 'head', ear[0], ear[1]),
         ('fUpL', 'chest', fl[0], fl[1]), ('fLowL', 'fUpL', fl[1], fl[2]), ('fFootL', 'fLowL', fl[2], fl[3]),
         ('hUpL', 'pelvis', hl[0], hl[1]), ('hLowL', 'hUpL', hl[1], hl[2]), ('hFootL', 'hLowL', hl[2], hl[3])] + list(extra)
    return B

# 자리는 세운 메시(m · 바로잡기 전)에서 쟀다 — tools/animals/probe.py · 살펴보기 그림
SPEC = {
 'cow': dict(kind='quad', near='hi', bones=quad(
     ((0, 1.05, -0.85), (0, 1.08, -0.35)), ((0, 1.08, -0.35), (0, 1.10, 0.15)), ((0, 1.10, 0.15), (0, 1.15, 0.60)),
     ((0, 1.15, 0.60), (-0.10, 1.32, 0.95)), ((-0.10, 1.32, 0.95), (-0.30, 1.09, 1.27)), ((0, 1.33, -1.25), (0, 0.66, -1.29)),
     ((0.02, 1.42, 1.00), (0.16, 1.43, 0.96)),
     [(0.12, 0.80, 0.40), (0.12, 0.33, 0.27), (0.12, 0.09, 0.26), (0.12, 0.0, 0.32)],
     [(0.17, 1.00, -0.86), (0.18, 0.42, -0.99), (0.17, 0.10, -0.94), (0.18, 0.0, -0.85)],
     extra=[('earR', 'head', (-0.22, 1.42, 1.02), (-0.36, 1.43, 1.00))])),
 'boar': dict(kind='quad', near='hi', bones=quad(
     ((0, 0.62, -0.60), (0, 0.64, -0.25)), ((0, 0.64, -0.25), (0, 0.66, 0.05)), ((0, 0.66, 0.05), (0, 0.66, 0.30)),
     ((0, 0.66, 0.30), (0, 0.70, 0.50)), ((0, 0.70, 0.50), (0, 0.47, 0.83)), ((0, 0.74, -0.80), (0, 0.31, -0.85)),
     ((0.08, 0.80, 0.50), (0.18, 0.80, 0.50)),
     [(0.10, 0.50, 0.25), (0.10, 0.20, 0.20), (0.10, 0.06, 0.19), (0.10, 0.0, 0.23)],
     [(0.12, 0.60, -0.58), (0.13, 0.22, -0.72), (0.13, 0.06, -0.69), (0.13, 0.0, -0.66)])),
 'doe': dict(kind='quad', near='hi', shift=(0.22, 0, 0), bones=quad(          # 몸통이 x −0.22 — 옆으로 돌린 고개가 상자를 끌었다(옮겨서 잰 자리)
     ((0, 0.95, -0.70), (0, 0.95, -0.30)), ((0, 0.95, -0.30), (0, 0.95, 0.10)), ((0, 0.95, 0.10), (0.02, 1.00, 0.45)),
     ((0.02, 1.00, 0.45), (0.37, 1.30, 0.75)), ((0.37, 1.30, 0.75), (0.70, 1.16, 0.87)), ((0.02, 1.08, -0.84), (0.06, 0.95, -0.90)),
     ((0.42, 1.38, 0.72), (0.46, 1.50, 0.68)),
     [(0.10, 0.78, 0.40), (0.10, 0.40, 0.42), (0.10, 0.10, 0.44), (0.10, 0.0, 0.48)],
     [(0.10, 0.90, -0.65), (0.10, 0.45, -0.75), (0.10, 0.12, -0.70), (0.10, 0.0, -0.64)],
     extra=[('earR', 'head', (0.36, 1.38, 0.80), (0.34, 1.50, 0.84))])),
 'stag': dict(kind='quad', near='hi', bones=quad(
     ((0, 1.10, -0.85), (0, 1.12, -0.40)), ((0, 1.12, -0.40), (0, 1.12, 0.05)), ((0, 1.12, 0.05), (0, 1.20, 0.45)),
     ((0, 1.20, 0.45), (0, 1.62, 0.80)), ((0, 1.62, 0.80), (0, 1.44, 1.14)), ((0, 1.25, -1.08), (0, 1.00, -1.15)),
     ((0.07, 1.74, 0.82), (0.20, 1.78, 0.78)),
     [(0.10, 0.85, 0.30), (0.10, 0.45, 0.23), (0.10, 0.12, 0.23), (0.10, 0.0, 0.27)],
     [(0.15, 1.00, -0.82), (0.15, 0.50, -0.93), (0.15, 0.12, -0.80), (0.16, 0.0, -0.70)]), feet='auto'),
 'sheep': dict(kind='quad', near='hi', bones=quad(
     ((0, 0.62, -0.55), (0, 0.64, -0.20)), ((0, 0.64, -0.20), (0, 0.66, 0.10)), ((0, 0.66, 0.10), (0, 0.70, 0.35)),
     ((0, 0.70, 0.35), (0, 0.85, 0.55)), ((0, 0.85, 0.55), (0, 0.76, 0.84)), ((0, 0.70, -0.80), (0, 0.45, -0.84)),
     ((0.08, 0.92, 0.62), (0.21, 0.95, 0.63)),
     [(0.09, 0.45, 0.20), (0.09, 0.24, 0.15), (0.09, 0.07, 0.15), (0.09, 0.0, 0.18)],
     [(0.11, 0.50, -0.52), (0.11, 0.25, -0.62), (0.11, 0.07, -0.58), (0.11, 0.0, -0.52)]), feet='auto'),
 'hare': dict(kind='quad', near='mid', straight=False, bones=quad(
     ((0, 0.13, -0.17), (0, 0.20, -0.05)), ((0, 0.20, -0.05), (0, 0.25, 0.05)), ((0, 0.25, 0.05), (0, 0.30, 0.10)),
     ((0, 0.30, 0.10), (0, 0.36, 0.15)), ((0, 0.36, 0.15), (0, 0.34, 0.27)), ((0, 0.15, -0.23), (0, 0.18, -0.27)),
     ((0.02, 0.42, 0.12), (0.035, 0.54, 0.07)),
     [(0.045, 0.24, 0.10), (0.045, 0.10, 0.135), (0.045, 0.02, 0.14), (0.045, 0.0, 0.17)],
     [(0.07, 0.15, -0.14), (0.08, 0.10, -0.04), (0.07, 0.04, -0.21), (0.07, 0.0, 0.02)])),
 'frog': dict(kind='frog', near='mid', straight=False, bones=[
     ('root', None, (0, 0, 0), (0, 0, 0)),
     ('pelvis', 'root', (0, 0.035, -0.055), (0, 0.05, -0.01)), ('spine', 'pelvis', (0, 0.05, -0.01), (0, 0.06, 0.035)),
     ('head', 'spine', (0, 0.06, 0.035), (0, 0.065, 0.08)),
     ('fUpL', 'spine', (0.025, 0.045, 0.035), (0.04, 0.025, 0.045)), ('fLowL', 'fUpL', (0.04, 0.025, 0.045), (0.04, 0.005, 0.05)),
     ('fFootL', 'fLowL', (0.04, 0.005, 0.05), (0.055, 0.0, 0.065)),
     ('hUpL', 'pelvis', (0.02, 0.035, -0.05), (0.06, 0.03, 0.0)), ('hLowL', 'hUpL', (0.06, 0.03, 0.0), (0.07, 0.02, -0.06)),
     ('hFootL', 'hLowL', (0.07, 0.02, -0.06), (0.10, 0.003, 0.0))]),
 'lizard': dict(kind='lizard', near='mid', straight=False, bones=[
     ('root', None, (0, 0, 0), (0, 0, 0)),
     ('pelvis', 'root', (0, 0.06, 0.10), (0, 0.07, 0.20)), ('spine', 'pelvis', (0, 0.07, 0.20), (0, 0.08, 0.30)),
     ('chest', 'spine', (0, 0.08, 0.30), (0, 0.09, 0.38)), ('neck', 'chest', (0, 0.09, 0.38), (0, 0.11, 0.45)),
     ('head', 'neck', (0, 0.11, 0.45), (0, 0.13, 0.60)),
     ('tail1', 'pelvis', (0, 0.06, 0.10), (0, 0.045, -0.08)), ('tail2', 'tail1', (0, 0.045, -0.08), (0, 0.035, -0.24)),
     ('tail3', 'tail2', (0, 0.035, -0.24), (0, 0.03, -0.42)), ('tail4', 'tail3', (0, 0.03, -0.42), (0, 0.03, -0.608)),
     ('fUpL', 'chest', (0.04, 0.06, 0.35), (0.10, 0.05, 0.35)), ('fLowL', 'fUpL', (0.10, 0.05, 0.35), (0.12, 0.01, 0.36)),
     ('fFootL', 'fLowL', (0.12, 0.01, 0.36), (0.14, 0.0, 0.39)),
     ('hUpL', 'pelvis', (0.04, 0.05, 0.13), (0.09, 0.05, 0.14)), ('hLowL', 'hUpL', (0.09, 0.05, 0.14), (0.10, 0.01, 0.12)),
     ('hFootL', 'hLowL', (0.10, 0.01, 0.12), (0.105, 0.0, 0.08))]),
 'pheasant': dict(kind='bird', near='mid', straight=False, bones=[
     ('root', None, (0, 0, 0), (0, 0, 0)),
     ('pelvis', 'root', (0, 0.22, 0.08), (0, 0.24, 0.18)), ('spine', 'pelvis', (0, 0.24, 0.18), (0, 0.26, 0.27)),
     ('chest', 'spine', (0, 0.26, 0.27), (0, 0.30, 0.33)), ('neck', 'chest', (0, 0.30, 0.33), (0, 0.38, 0.38)),
     ('neck2', 'neck', (0, 0.38, 0.38), (0, 0.42, 0.42)), ('head', 'neck2', (0, 0.42, 0.42), (0, 0.415, 0.488)),
     ('tail', 'pelvis', (0, 0.22, 0.04), (0, 0.18, -0.20)), ('tail2', 'tail', (0, 0.18, -0.20), (0, 0.09, -0.487)),
     ('wingL', 'chest', (0.06, 0.27, 0.27), (0.07, 0.24, 0.05)),
     ('hUpL', 'pelvis', (0.04, 0.17, 0.24), (0.045, 0.10, 0.26)), ('hLowL', 'hUpL', (0.045, 0.10, 0.26), (0.045, 0.02, 0.25)),
     ('hFootL', 'hLowL', (0.045, 0.02, 0.25), (0.045, 0.0, 0.33))]),
 'shark': dict(kind='fish', near='hi', straight=False, bones=[
     ('root', None, (0, 0, 0), (0, 0, 0)),
     ('s1', 'root', (0, 0.33, 0.45), (0, 0.33, 0.20)), ('head', 's1', (0, 0.33, 0.45), (0, 0.34, 0.783)),
     ('s2', 's1', (0, 0.33, 0.20), (0, 0.33, -0.05)), ('s3', 's2', (0, 0.33, -0.05), (0, 0.32, -0.30)),
     ('s4', 's3', (0, 0.32, -0.30), (0, 0.31, -0.55)), ('tail', 's4', (0, 0.31, -0.55), (0, 0.38, -0.78)),
     ('finL', 's1', (0.10, 0.24, 0.18), (0.24, 0.02, 0.12))]),
}
for k, s in SPEC.items(): s['bones'] = mirror(s['bones'])

def rodrigues(a, b):
    """a → b 로 돌리는 3×3"""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = float(a @ b)
    if np.linalg.norm(v) < 1e-9: return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)
def roty(t):
    c, s = np.cos(t), np.sin(t); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])

def weights_field(P, I, head, tip, name, h):
    lo = P.min(0) - 3 * h; dims = np.ceil((P.max(0) - lo) / h).astype(int) + 4
    A, B, C = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]
    emax = np.max([np.linalg.norm(A - B, axis=1), np.linalg.norm(B - C, axis=1), np.linalg.norm(C - A, axis=1)], 0)
    nsub = np.clip(np.ceil(emax / (h * 0.5)).astype(int), 1, 64); surf = np.zeros(dims, bool)
    for n in np.unique(nsub):
        t = np.where(nsub == n)[0]; ii, jj = np.meshgrid(np.arange(n + 1), np.arange(n + 1), indexing='ij'); m = ii + jj <= n
        a = (ii[m] / n)[None, :, None]; b = (jj[m] / n)[None, :, None]
        pts = A[t][:, None] * (1 - a - b) + B[t][:, None] * a + C[t][:, None] * b
        q = np.floor((pts.reshape(-1, 3) - lo) / h).astype(int); surf[q[:, 0], q[:, 1], q[:, 2]] = True
    def dil(x):
        y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; y[:, :, 1:] |= x[:, :, :-1]; y[:, :, :-1] |= x[:, :, 1:]; return y
    wall = dil(surf); out = np.zeros(dims, bool); out[0] = out[-1] = True; out[:, 0] = out[:, -1] = True; out[:, :, 0] = out[:, :, -1] = True; out &= ~wall
    while True:
        nx = dil(out) & ~wall
        if nx.sum() == out.sum(): break
        out = nx
    dom = ~out; dv = np.argwhere(dom); NB = len(head)
    vox = lambda p: np.clip(np.floor((np.asarray(p) - lo) / h).astype(int), 0, dims - 1)
    D = np.full((NB,) + tuple(dims), np.float32(1e4))
    for k in range(1, NB):
        seg = head[k][None] + (tip[k] - head[k])[None] * np.linspace(0, 1, 40)[:, None]
        q = vox(seg); q = q[dom[q[:, 0], q[:, 1], q[:, 2]]]
        if not len(q): q = dv[np.argmin(((dv - vox(head[k])) ** 2).sum(1))][None]
        fr = np.zeros(dims, bool); fr[q[:, 0], q[:, 1], q[:, 2]] = True; seen = fr.copy(); dist = D[k]; dist[fr] = 0; step = 0
        while fr.any():
            step += 1; fr = dil(fr) & dom & ~seen; seen |= fr; dist[fr] = step
        D[k] *= h
    return D, dom, vox

def skin(Pv, D, dom, vox, NB, bones=None, head=None, tip=None):
    qv = vox(Pv); Dv = D[:, qv[:, 0], qv[:, 1], qv[:, 2]].T.copy()
    bad = Dv[:, 1:].min(1) > 5
    for vi in np.where(bad)[0]:
        best = None
        for o in np.argwhere(np.ones((5, 5, 5))) - 2:
            c = np.clip(qv[vi] + o, 0, np.array(dom.shape) - 1)
            if dom[tuple(c)]:
                v = D[:, c[0], c[1], c[2]]
                if best is None or v[1:].min() < best[1:].min(): best = v
        if best is not None: Dv[vi] = best
    Dv[:, 0] = 1e4
    # 다리 윗마디가 옆구리 · 가슴까지 끌고 가지 않게 — 어깨/엉덩이 높이에서 마디 길이의 1/3 위부터는 그만큼 멀게 친다(tools/sheep/rig.py 와 같은 뜻)
    if bones is not None:
        for k, b in enumerate(bones):
            if 'Up' in b[0] or b[0].startswith('wing'):
                cut = head[k][1] - 0.33 * abs(head[k][1] - tip[k][1])
                Dv[:, k] += np.maximum(0, Pv[:, 1] - cut) * 2.5
    order = np.argsort(Dv, 1)[:, :4]; dd = np.take_along_axis(Dv, order, 1)
    sc = dd[:, :1] + 1e-6
    w = 1.0 / (dd / sc + 0.15) ** 4
    w[dd > dd[:, :1] * 2.0 + 0.012 * HSCALE] = 0
    w /= w.sum(1, keepdims=True)
    return order, w

def track_legs(P, bones, head, tip):
    """걷는 중이던 다리 — 발을 메시에서 찾고(낮은 점을 넷으로 묶음 · 첫 자리는 SPEC 발) 무릎 높이까지 다리 기둥을 따라 올라가 마디 자리를 고친다.
       왼쪽을 거울로 비춘 오른쪽은 앞뒤가 어긋난 다리를 놓친다(암사슴 · 소 · 양)"""
    ix = {b[0]: i for i, b in enumerate(bones)}; H = P[:, 1].max()
    legs = ['fUpL', 'fUpR', 'hUpL', 'hUpR']
    seed = np.array([[tip[ix[l.replace('Up', 'Foot')]][0], tip[ix[l.replace('Up', 'Foot')]][2]] for l in legs])
    low = P[P[:, 1] < 0.035 * H][:, [0, 2]]; c = seed.copy()
    for _ in range(20):
        a = np.argmin(((low[:, None] - c[None]) ** 2).sum(2), 1)
        c = np.array([low[a == k].mean(0) if (a == k).any() else c[k] for k in range(4)])
    for k, l in enumerate(legs):
        up, lo_, ft = ix[l], ix[l.replace('Up', 'Low')], ix[l.replace('Up', 'Foot')]
        knee_y = head[lo_][1]; fet_y = head[ft][1]; path = {}
        cur = c.copy()
        for y in np.linspace(0.01 * H, knee_y, 14):
            sl = P[np.abs(P[:, 1] - y) < 0.015 * H][:, [0, 2]]
            if not len(sl): continue
            a = np.argmin(((sl[:, None] - cur[None]) ** 2).sum(2), 1)
            m = sl[(a == k) & (np.hypot(*(sl - cur[k]).T) < 0.12 * H)]
            if len(m) >= 3: cur[k] = m.mean(0)
            path[y] = cur[k].copy()
        ys = np.array(sorted(path)); xz = np.array([path[y] for y in ys])
        at = lambda y: np.array([np.interp(y, ys, xz[:, 0]), y, np.interp(y, ys, xz[:, 1])])
        toe = tip[ft].copy(); toe[0] = c[k][0]; toe[2] = c[k][1] + (tip[ft][2] - head[ft][2]) * 0.6
        tip[ft] = toe; head[ft] = at(fet_y); tip[lo_] = head[ft]
        head[lo_] = at(knee_y); tip[up] = head[lo_]
        print(f'   {l} foot', np.round(c[k], 3), 'knee', np.round(head[lo_], 3))

def fk(bones, head, R_local):
    """바로잡기 — 뼈마다 제 머리에서 돈다(쉼 자세 축) · 세계 회전 · 새 머리"""
    ix = {b[0]: i for i, b in enumerate(bones)}; NB = len(bones)
    Rw = [np.eye(3)] * NB; hw = head.copy()
    for k, (n, p, _, _) in enumerate(bones):
        if p is None: Rw[k] = R_local[k]; continue
        j = ix[p]; Rw[k] = Rw[j] @ R_local[k]; hw[k] = Rw[j] @ (head[k] - head[j]) + hw[j]
    return Rw, hw

def lbs(P, J, W, Rw, head, hw):
    out = np.zeros_like(P)
    for c in range(4):
        j = J[:, c]; w = W[:, c][:, None]
        R = np.stack([Rw[k] for k in range(len(Rw))])[j]
        out += w * (np.einsum('nij,nj->ni', R, P - head[j]) + hw[j])
    return out

def normals(P, I):
    A, B, C = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]; fn = np.cross(B - A, C - A); N = np.zeros_like(P)
    for c in range(3): np.add.at(N, I[:, c], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)

def pack(P, I, J, W, Nn):
    mn = P.min(0); mx = P.max(0); q = np.round((P - mn) / np.maximum(mx - mn, 1e-9) * 65535).astype(np.uint16)
    n8 = np.round(np.clip(Nn, -1, 1) * 127).astype(np.int8)
    w8 = np.round(W * 255).astype(np.int32); w8[:, 0] += 255 - w8.sum(1); w8 = np.clip(w8, 0, 255).astype(np.uint8)
    idx = I.astype(np.uint16).ravel()
    blob = q.tobytes() + n8.tobytes() + J.astype(np.uint8).tobytes() + w8.tobytes() + b'\0' * ((-(len(P) * 17)) % 4) + idx.tobytes()
    return dict(nv=len(P), nt=len(I), mn=[round(float(x), 5) for x in mn], mx=[round(float(x), 5) for x in mx], b=base64.b64encode(blob).decode())

HSCALE = 1.0
def rig(S, name):
    global HSCALE
    sp = SPEC[name]; bones = sp['bones']; NB = len(bones)
    L = {l: load(f'{S}/{name}_{l}.bin') for l in ('hi', 'mid', 'lo')}
    L = {l: (orient(P, name) + np.array(sp.get('shift', (0, 0, 0))), I) for l, (P, I) in L.items()}
    P, I = L['hi']; HSCALE = np.ptp(P, 0).max()
    head = np.array([b[2] for b in bones], float); tip = np.array([b[3] for b in bones], float)
    if sp.get('straight', True): track_legs(P, bones, head, tip)
    h = HSCALE / 170
    D, dom, vox = weights_field(P, I, head, tip, name, h)
    sk = {l: skin(Q, D, dom, vox, NB, bones, head, tip) for l, (Q, _) in L.items()}
    ix = {b[0]: i for i, b in enumerate(bones)}
    # ── 바로잡기 ──
    R = [np.eye(3) for _ in range(NB)]
    if sp.get('straight', True):
        for leg in ('fUpL', 'fUpR', 'hUpL', 'hUpR'):
            k = ix[leg]; foot = tip[ix[leg.replace('Up', 'Foot')]] ; ankle = head[ix[leg.replace('Up', 'Foot')]]
            v = ankle - head[k]; R[k] = rodrigues(v, np.array([0, -1.0, 0]))
        k = ix['neck']; nose = tip[ix['head']]; v = nose - head[k]
        R[k] = roty(np.arctan2(-v[0], v[2]))
    Rw, hw = fk(bones, head, R)
    tipw = np.array([Rw[k] @ (tip[k] - head[k]) + hw[k] for k in range(NB)])
    out = {}
    for l, (Q, Ii) in L.items():
        J, W = sk[l]; out[l] = lbs(Q, J, W, Rw, head, hw)
    # 가운데 · 바닥
    A0 = out['hi']; zr = np.ptp(A0[:, 2]); mid = A0[np.abs(A0[:, 2] - np.median(A0[:, 2])) < zr * 0.2]
    dx = -np.median(mid[:, 0]) if sp['kind'] != 'fish' else -np.median(A0[:, 0]); dy = -A0[:, 1].min()
    for l in out: out[l] = out[l] + np.array([dx, dy, 0])
    hw = hw + np.array([dx, dy, 0]); tipw = tipw + np.array([dx, dy, 0])
    # ── 확인 그림 — 뼈 겹침(옆 · 앞 · 위) · 시험 자세(고개 숙임 · 다리 앞뒤 · 꼬리) ──
    Q, Ii = out['hi'], L['hi'][1]; bl = [(hw[k], tipw[k], bones[k][0]) for k in range(1, NB)]
    from PIL import Image
    a = grid_view(Q, Ii, 2, 1, 0, size=420, bones=bl, step=0.1 if HEIGHT[name] > 0.3 else 0.02)
    b = grid_view(Q, Ii, 0, 1, 2, size=420, bones=bl, step=0.1 if HEIGHT[name] > 0.3 else 0.02)
    c = grid_view(Q, Ii, 2, 0, 1, size=420, bones=bl, step=0.1 if HEIGHT[name] > 0.3 else 0.02)
    T = [np.eye(3) for _ in range(NB)]
    def rx(t): c_, s_ = np.cos(t), np.sin(t); return np.array([[1, 0, 0], [0, c_, -s_], [0, s_, c_]])
    for n, ang in (('neck', 0.7), ('fUpL', -0.6), ('hUpR', 0.6), ('tail', -0.6), ('tail2', -0.5), ('head', 0.4), ('earL', 0.0)):
        if n in ix: T[ix[n]] = rx(ang)
    if 'wingL' in ix: T[ix['wingL']] = rodrigues(np.array([0, 0, -1.0]), np.array([1.0, 0.2, 0]))
    for n, ang in (('s2', 0.3), ('s3', 0.35), ('s4', 0.4), ('tail', 0.4), ('tail1', 0.4), ('tail3', 0.4)):
        if n in ix and SPEC[name]['kind'] in ('fish', 'lizard'): T[ix[n]] = roty(ang)
    J, W = sk['hi']
    R2w, h2 = fk(bones, hw, T); Qp = lbs(Q, J, W, R2w, hw, h2)
    d = grid_view(Qp, Ii, 2, 1, 0, size=420, step=0.1 if HEIGHT[name] > 0.3 else 0.02)
    e = grid_view(Qp, Ii, 2, 0, 1, size=420, step=0.1 if HEIGHT[name] > 0.3 else 0.02)
    # 뼈마다 빛깔(가장 큰 무게)
    pal = np.array([[0.9, 0.3, 0.3], [0.3, 0.9, 0.3], [0.3, 0.4, 0.95], [0.95, 0.85, 0.2], [0.8, 0.3, 0.9], [0.2, 0.9, 0.9], [1, 0.6, 0.2], [0.6, 0.6, 0.6]])
    dom_b = J[np.arange(len(J)), np.argmax(W, 1)]; tc = pal[dom_b[Ii[:, 0]] % len(pal)]
    f = shade(Q, Ii, 2, 1, 0, 420, col=tc)
    sh = Image.new('RGB', (1260, 840)); [sh.paste(im, (x, y)) for im, x, y in ((a, 0, 0), (b, 420, 0), (c, 840, 0), (d, 0, 420), (e, 420, 420), (f, 840, 420))]
    sh.save(f'{S}/chk_{name}.png')
    # ── 내보내기 ──
    near = sp['near']; res = dict(kind=sp['kind'], bones=[[bones[k][0], bones[k][1] or '', [round(float(x), 5) for x in hw[k]]] for k in range(NB)],
                                  size=[round(float(x), 4) for x in np.ptp(out['hi'], 0)])
    for tag, l in (('near', near), ('far', 'lo')):
        Qx, Ix = out[l], L[l][1]; J, W = sk[l]
        res[tag] = pack(Qx, Ix, J, W, normals(Qx, Ix))
    print(name, 'near', res['near']['nv'], 'v', res['near']['nt'], 't · far', res['far']['nt'], 't · b64', len(res['near']['b']) + len(res['far']['b']))
    return res

if __name__ == '__main__':
    S = sys.argv[1]; names = sys.argv[2:] or list(SPEC)
    import os; outp = 'engine/js/data-animal-meshes.js'; allv = {}
    if os.path.exists(f'{S}/rig.json'): allv = json.load(open(f'{S}/rig.json'))
    for n in names: allv[n] = rig(S, n)
    json.dump(allv, open(f'{S}/rig.json', 'w'))
    if set(allv) >= set(SPEC):
        js = ('/* data-animal-meshes.js — CASTAWAY · 자료(base64) — 읽지 말 것\n   사용자 STL(meshes/organic/*.stl) → tools/animals/stl2mesh.mjs(QEM) → tools/animals/rig.py(뼈 · 무게 · 곧은 쉼 자세) — 97-animals.js 가 푼다\n'
              '   한 마리: kind · bones[[이름, 부모, 머리 자리]] · size · near/far {nv, nt, mn, mx, b — 자리 u16×3 · 법선 i8×3 · 뼈 u8×4 · 무게 u8×4 · (4 맞춤) · 번호 u16} */\n'
              'const ANIMAL_MESH=' + json.dumps({k: allv[k] for k in SPEC}, separators=(',', ':')) + ';\n')
        open(outp, 'w').write(js); print('wrote', outp, len(js))
