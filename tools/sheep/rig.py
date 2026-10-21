# tools/sheep/rig.py — Meshy 양(FBX) → 뼈 심은 GLB (numpy 만 씀 — scipy · pymeshlab · PIL 없이 돈다)
#
#   python3 tools/azure/fbx2obj.py <양.fbx> <작업>/orig.npz        # FBX 바이너리 → 정점 · 세모 · uv
#   sips -s format jpeg -s formatOptions 85 -Z 1024 <양>_texture.png --out <작업>/alb1024.jpg
#   python3 tools/sheep/rig.py <작업> <나갈.glb>
#
# ① uv 이음매로 정점을 다시 나눈다(GLB 는 정점마다 uv 하나) ② 세운다 — FBX 는 Z 위 · 머리가 −Y 다 → (x, z, −y): +y 위 · +z 앞(머리) ·
#    몸길이 1.40 m · 발바닥 y 0 · 가운데 x·z 0 ③ 뼈 22(아래 BONES — 다리 기둥 · 머리 · 귀 · 꼬리를 재서 박았다 · 쉼 자세 회전 0)
# ④ 8 mm 칸으로 겉을 칠하고(세모마다 촘촘히 점을 찍음) 한 칸 키워 틈을 막은 뒤 바깥을 채워 속을 얻는다
# ⑤ 뼈마다 그 마디(머리→끝)의 칸에서 몸 속을 따라 잰 거리(6방 BFS) — 곧은 거리로 재면 맞닿은 앞다리끼리 · 다리와 배가 섞인다
# ⑥ 정점마다 가까운 뼈 넷을 1/d⁴ 로 섞는다(그 뼈 셋째 몫까지만) ⑦ 바탕색 JPEG 를 담은 GLB(뼈 · 역묶음 행렬 · JOINTS_0 · WEIGHTS_0)
import sys, json, struct, numpy as np
W = sys.argv[1]; OUT = sys.argv[2]
d = np.load(W + '/orig.npz'); V, F, UV, FU = d['V'], d['F'], d['UV'], d['FU']
key = F.astype(np.int64) * 1000000 + FU
u, inv = np.unique(key.ravel(), return_inverse=True)
P = V[(u // 1000000).astype(int)].astype(np.float64); T = UV[(u % 1000000).astype(int)].astype(np.float32); I = inv.reshape(-1, 3).astype(np.uint32)
T[:, 1] = 1 - T[:, 1]                                # FBX uv 는 v 가 위로 — glTF(게임은 flipY=false)는 아래로
P = np.stack([P[:, 0], P[:, 2], -P[:, 1]], 1)
P *= 1.40 / (P[:, 2].max() - P[:, 2].min())
P[:, 1] -= P[:, 1].min(); P[:, 0] -= (P[:, 0].max() + P[:, 0].min()) / 2; P[:, 2] -= (P[:, 2].max() + P[:, 2].min()) / 2

# ── 뼈: 이름 · 부모 · 머리 자리 · 끝 자리(가중치를 잴 마디) ────────────────────────────
def M(b):  # L → R (x 뒤집기)
    r = lambda s: s[:-1] + 'R' if s and s.endswith('L') else s
    return [(r(n), r(p), (-h[0], h[1], h[2]), (-t[0], t[1], t[2])) for n, p, h, t in b]
CORE = [
    ('root',   None,     (0, 0, 0),            (0, 0, 0)),
    ('pelvis', 'root',   (0, 0.58, -0.40),     (0, 0.60, -0.10)),
    ('spine',  'pelvis', (0, 0.60, -0.10),     (0, 0.62, 0.18)),
    ('chest',  'spine',  (0, 0.62, 0.18),      (0, 0.70, 0.32)),
    ('neck',   'chest',  (0, 0.70, 0.32),      (0, 0.84, 0.44)),
    ('head',   'neck',   (0, 0.84, 0.44),      (0, 0.82, 0.68)),
    ('tail',   'pelvis', (0, 0.63, -0.60),     (0, 0.58, -0.68)),
]
LEFT = [
    ('earL',   'head',   (0.10, 0.93, 0.37),   (0.22, 0.96, 0.35)),
    ('fUpL',   'chest',  (0.10, 0.44, 0.11),   (0.100, 0.25, 0.082)),
    ('fLowL',  'fUpL',   (0.100, 0.25, 0.082), (0.120, 0.07, 0.083)),
    ('fFootL', 'fLowL',  (0.120, 0.07, 0.083), (0.128, 0.0, 0.115)),
    ('hUpL',   'pelvis', (0.095, 0.47, -0.47), (0.092, 0.25, -0.585)),
    ('hLowL',  'hUpL',   (0.092, 0.25, -0.585),(0.103, 0.08, -0.545)),
    ('hFootL', 'hLowL',  (0.103, 0.08, -0.545),(0.106, 0.0, -0.49)),
]
BONES = CORE + LEFT + M(LEFT)
NB = len(BONES); name = [b[0] for b in BONES]; ix = {n: i for i, n in enumerate(name)}
head = np.array([b[2] for b in BONES], float); tip = np.array([b[3] for b in BONES], float)

# ── 칸 ───────────────────────────────────────────────────────────────────────
h = 0.008; lo = P.min(0) - 3 * h; dims = np.ceil((P.max(0) - lo) / h).astype(int) + 4
print('grid', dims, dims.prod())
A, B, C = P[I[:, 0]], P[I[:, 1]], P[I[:, 2]]
emax = np.max([np.linalg.norm(A - B, axis=1), np.linalg.norm(B - C, axis=1), np.linalg.norm(C - A, axis=1)], 0)
nsub = np.clip(np.ceil(emax / (h * 0.5)).astype(int), 1, 64)
surf = np.zeros(dims, bool)
for n in np.unique(nsub):
    t = np.where(nsub == n)[0]
    ii, jj = np.meshgrid(np.arange(n + 1), np.arange(n + 1), indexing='ij'); m = ii + jj <= n
    a = (ii[m] / n)[None, :, None]; b = (jj[m] / n)[None, :, None]
    pts = A[t][:, None] * (1 - a - b) + B[t][:, None] * a + C[t][:, None] * b
    q = np.floor((pts.reshape(-1, 3) - lo) / h).astype(int); surf[q[:, 0], q[:, 1], q[:, 2]] = True
def dil(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; y[:, :, 1:] |= x[:, :, :-1]; y[:, :, :-1] |= x[:, :, 1:]; return y
wall = dil(surf)
out = np.zeros(dims, bool); out[0] = out[-1] = True; out[:, 0] = out[:, -1] = True; out[:, :, 0] = out[:, :, -1] = True; out &= ~wall
while True:
    nx = dil(out) & ~wall
    if nx.sum() == out.sum(): break
    out = nx
dom = ~out
print('surface', surf.sum(), 'domain', dom.sum())

# ── 몸 속을 따라 잰 거리 ───────────────────────────────────────────────────────────
def vox(p): return np.floor((np.asarray(p) - lo) / h).astype(int)
dv = np.argwhere(dom)
D = np.full((NB,) + tuple(dims), np.float32(1e4))
for k in range(1, NB):
    seg = head[k][None] + (tip[k] - head[k])[None] * np.linspace(0, 1, 40)[:, None]
    q = vox(seg); q = q[dom[q[:, 0], q[:, 1], q[:, 2]]]
    if not len(q):  # 뼈가 몸 밖이면 가장 가까운 속 칸에서
        q = dv[np.argmin(((dv - vox(head[k])) ** 2).sum(1))][None]
    fr = np.zeros(dims, bool); fr[q[:, 0], q[:, 1], q[:, 2]] = True
    seen = fr.copy(); dist = D[k]; dist[fr] = 0; step = 0
    while fr.any():
        step += 1; fr = dil(fr) & dom & ~seen; seen |= fr; dist[fr] = step
    D[k] *= h
    print(f'{name[k]:7s} steps {step}')

# ── 가중치 ─────────────────────────────────────────────────────────────────────
qv = vox(P); qv = np.clip(qv, 0, dims - 1)
Dv = D[:, qv[:, 0], qv[:, 1], qv[:, 2]].T          # (정점, 뼈) — 정점 칸이 속 밖이면 둘레 칸
bad = Dv[:, 1:].min(1) > 5
if bad.any():
    for vi in np.where(bad)[0]:
        best = None
        for o in np.argwhere(np.ones((5, 5, 5))) - 2:
            c = np.clip(qv[vi] + o, 0, dims - 1)
            if dom[tuple(c)]:
                v = D[:, c[0], c[1], c[2]]
                if best is None or v[1:].min() < best[1:].min(): best = v
        if best is not None: Dv[vi] = best
Dv[:, 0] = 1e4                                       # root 는 안 쓴다
# 다리 윗마디가 옆구리 털까지 끌고 가지 않게 · 꼬리가 엉덩이 전체를 갖지 않게 — 배 높이(0.40 m) 위 · 꼬리 밑동 앞은 그만큼 멀게 친다
for k, n in enumerate(name):
    if n[1:3] == 'Up': Dv[:, k] += np.maximum(0, P[:, 1] - 0.40) * 2.0
    if n == 'tail':    Dv[:, k] += np.maximum(0, P[:, 2] + 0.62) * 2.5
order = np.argsort(Dv, 1)[:, :4]
dd = np.take_along_axis(Dv, order, 1)
w = 1.0 / (dd + 0.012) ** 4
w[dd > dd[:, :1] * 2.2 + 0.03] = 0                   # 첫째보다 한참 먼 뼈는 안 섞는다
w /= w.sum(1, keepdims=True)
J = order.astype(np.uint16); Wt = w.astype(np.float32)
print('vertices', len(P), 'tris', len(I), 'bones', NB)
dom_b = np.bincount(J[:, 0], minlength=NB); print({name[k]: int(dom_b[k]) for k in range(NB)})

# ── 법선 ───────────────────────────────────────────────────────────────────────
Nn = np.zeros_like(P); fn = np.cross(B - A, C - A)
for c in range(3): np.add.at(Nn, I[:, c], fn)
# uv 이음매로 나뉜 정점도 같은 자리면 법선을 나눠 쓴다(이음매 금이 안 보이게)
pk = np.round(P / 1e-5).astype(np.int64); pk = pk[:, 0] * 73856093 ^ pk[:, 1] * 19349663 ^ pk[:, 2] * 83492791
_, g = np.unique(pk, return_inverse=True); acc = np.zeros((g.max() + 1, 3)); np.add.at(acc, g, Nn); Nn = acc[g]
Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-12

# ── GLB ────────────────────────────────────────────────────────────────────────
img = open(W + '/alb1024.jpg', 'rb').read()
blobs = []; views = []; accs = []
def add(arr, target=None):
    b = arr if isinstance(arr, bytes) else arr.tobytes(); off = sum(len(x) for x in blobs); pad = (-len(b)) % 4
    blobs.append(b + b'\0' * pad); v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
    if target: v['target'] = target
    views.append(v); return len(views) - 1
def acc_(arr, ctype, typ, target=None, mm=False):
    v = add(arr, target); a = {'bufferView': v, 'componentType': ctype, 'count': len(arr), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
aP = acc_(P.astype(np.float32), 5126, 'VEC3', 34962, True)
aN = acc_(Nn.astype(np.float32), 5126, 'VEC3', 34962)
aT = acc_(T, 5126, 'VEC2', 34962)
aJ = acc_(J, 5123, 'VEC4', 34962)
aW = acc_(Wt, 5126, 'VEC4', 34962)
aI = acc_(I.ravel(), 5125, 'SCALAR', 34963)
ibm = np.zeros((NB, 16), np.float32)
for k in range(NB):
    m = np.eye(4); m[:3, 3] = -head[k]; ibm[k] = m.T.ravel()   # 열 우선
aB = acc_(ibm, 5126, 'MAT4')
vI = add(img)
nodes = []
for k, (n, p, hh, tt) in enumerate(BONES):
    ph = head[ix[p]] if p else np.zeros(3)
    nodes.append({'name': n, 'translation': (head[k] - ph).tolist(), 'children': [j for j, b in enumerate(BONES) if b[1] == n]})
nodes.append({'name': 'sheep', 'mesh': 0, 'skin': 0})
nodes.append({'name': 'scene_root', 'children': [0, NB]})
gl = {'asset': {'version': '2.0', 'generator': 'castaway tools/sheep/rig.py'},
      'scene': 0, 'scenes': [{'nodes': [NB + 1]}], 'nodes': nodes,
      'meshes': [{'primitives': [{'attributes': {'POSITION': aP, 'NORMAL': aN, 'TEXCOORD_0': aT, 'JOINTS_0': aJ, 'WEIGHTS_0': aW}, 'indices': aI, 'material': 0}]}],
      'skins': [{'joints': list(range(NB)), 'inverseBindMatrices': aB, 'skeleton': 0}],
      'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}],
      'textures': [{'source': 0}], 'images': [{'bufferView': vI, 'mimeType': 'image/jpeg'}],
      'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': sum(len(x) for x in blobs)}]}
js = json.dumps(gl, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
bin_ = b''.join(blobs)
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bin_
open(OUT, 'wb').write(glb)
np.savez(W + '/rig.npz', P=P, J=J, W=Wt, head=head, name=np.array(name))
print('wrote', OUT, len(glb), 'bytes')
