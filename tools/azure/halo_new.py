# ⑫-b 머리 위 고리를 새로 빚는다(사용자 참고 그림: 검은 돌 조각이 고리로 이어지고 틈·금에서 푸른 에너지가 새며, 끊긴 데와 둘레에 부스러기)
#   옛 고리(매끈한 원환 4,358 세모)는 export.py 가 뺀다. 여기서 빚는 것: 돌덩이 조각(둘레를 따라 굽은 각기둥) · 조각마다 바깥으로 삐친 파편 ·
#   윗면 비늘 판 · 속을 지나는 에너지 관 · 떠 있는 부스러기. 전부 고리 뼈(halo)에 몫 1.
#   그림은 옛 고리가 쓰던 UV 자리(regions.png 의 G 칸)에 조각 셋을 그려 쓴다 — A 가는 금 간 돌 · B 빛 새는 돌(안쪽 면·끊긴 끝) · C 에너지.
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree
from bones import hc, hn, hr

rng = np.random.default_rng(7)
TEX = 2048
def maxrect(Mk):  # 참인 칸으로만 된 가장 큰 네모(막대그래프 방법) → (x,y,w,h)
    h = np.zeros(Mk.shape[1], int); best = (0, None)
    for yy in range(Mk.shape[0]):
        h = np.where(Mk[yy], h + 1, 0); st = []
        for xx in range(len(h) + 1):
            cur = h[xx] if xx < len(h) else 0; start = xx
            while st and st[-1][1] >= cur:
                sx, sh = st.pop(); a = sh * (xx - sx)
                if a > best[0]: best = (a, (sx, yy - sh + 1, xx - sx, sh))
                start = sx
            st.append((start, cur))
    return best[1]
# 옛 고리만 쓰던 그림 칸(세 꼭짓점이 다 고리인 세모 — G 255)에서 큰 네모 셋
_g = np.asarray(Image.open('regions.png').convert('RGBA'))
_free = (_g[..., 1] >= 250) & (_g[..., 3] > 200); rects = []
for _ in range(3):
    r = maxrect(_free); rects.append(r); _free[r[1]:r[1] + r[3], r[0]:r[0] + r[2]] = False
rects.sort(key=lambda r: -r[2] * r[3])      # (x,y,w,h) 화소 — 그림 위가 y 0
RA, RC, RB = rects[0], rects[1], rects[2]   # 104×162 · 172×54 · 84×93 (넓이 차례)
M = 6                                       # 테두리 여백(밉맵 번짐)

# ---------- 그림 조각 ----------
alb = np.asarray(Image.open('alb.png').convert('RGB')).astype(np.float32) / 255
emi = np.asarray(Image.open('emi.png').convert('RGB')).astype(np.float32) / 255
def noise(h, w, sc, oct=4):
    out = np.zeros((h, w)); amp = 1; tot = 0
    for o in range(oct):
        g = rng.random((int(h / sc) + 3, int(w / sc) + 3))
        y = np.linspace(0, g.shape[0] - 2.001, h); x = np.linspace(0, g.shape[1] - 2.001, w)
        yi = y.astype(int); xi = x.astype(int); fy = (y - yi)[:, None]; fx = (x - xi)[None, :]
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        a = g[yi][:, xi]; b = g[yi][:, xi + 1]; c = g[yi + 1][:, xi]; dd = g[yi + 1][:, xi + 1]
        out += amp * (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + dd * fx * fy); tot += amp
        amp *= 0.5; sc /= 2
    return out / tot
def cracks(h, w, cell):
    n = max(4, int(h * w / cell ** 2)); seeds = rng.random((n, 2)) * [h, w]
    yy, xx = np.mgrid[0:h, 0:w]; q = np.c_[yy.ravel(), xx.ravel()]
    d, _ = cKDTree(seeds).query(q, 2); e = (d[:, 1] - d[:, 0]).reshape(h, w)
    return e                                                    # 0 = 금 위
def stone(h, w, crackCell, crackW, glowK, base, keep=1.0):
    n = noise(h, w, 18); n2 = noise(h, w, 5)
    s = np.clip(0.35 + 0.9 * (n - 0.5) + 0.35 * (n2 - 0.5), 0, 1)[..., None]
    dark = np.array([0.075, 0.07, 0.095]) * base; light = np.array([0.36, 0.345, 0.43]) * base
    a = dark + (light - dark) * s
    e = cracks(h, w, crackCell); c = np.clip(1 - e / crackW, 0, 1) ** 1.5      # 금
    c *= np.clip((noise(h, w, crackCell * 1.5) - (1 - keep)) * 4, 0, 1)        # 금을 군데군데 끊는다
    halo_ = np.clip(1 - e / (crackW * 3.5), 0, 1) ** 2 * 0.35                   # 금 둘레 번짐
    a = a * (1 - c[..., None]) + np.array([0.55, 0.86, 1.0]) * c[..., None]
    a += halo_[..., None] * np.array([0.03, 0.09, 0.16])
    m = (c + halo_ * 0.6) * glowK
    em = m[..., None] * np.array([0.2, 0.58, 1.0])
    return a, em
def put(r, a, em):
    x, y, w, h = r; alb[y:y + h, x:x + w] = a; emi[y:y + h, x:x + w] = em
x, y, w, h = RA; put(RA, *stone(h, w, 62, 1.7, 1.0, 0.85, keep=0.55))   # A 검은 돌 · 드문 금
x, y, w, h = RB
_a, _e = stone(h, w, 22, 3.2, 1.0, 0.6)
_g = noise(h, w, 12)[..., None]
put(RB, _a * 0.35 + np.array([0.45, 0.78, 1.0]) * 0.65 * (0.7 + 0.5 * _g),            # B 빛 새는 면(밑·안·끊긴 끝) — 거의 빛
    np.array([0.16, 0.5, 1.0]) * (0.55 + 0.6 * _g) + _e * 0.6)
x, y, w, h = RC
gn = noise(h, w, 10)[..., None]
put(RC, np.array([0.62, 0.9, 1.0]) * (0.92 + 0.16 * gn), np.array([0.32, 0.72, 1.0]) * (0.95 + 0.25 * gn))
Image.fromarray((np.clip(alb, 0, 1) * 255).astype(np.uint8)).save('alb.png')
Image.fromarray((np.clip(emi, 0, 1) * 255).astype(np.uint8)).save('emi.png')

# ---------- 모양 ----------
e1 = np.cross(hn, [1, 0, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(hn, e1)
def frame(t):  # 둘레 각 t 의 (바깥, 위, 둘레쪽)
    r = np.cos(t) * e1 + np.sin(t) * e2; tg = -np.sin(t) * e1 + np.cos(t) * e2; return r, hn, tg
P = []; KIND = []; OID = []   # 세모마다 정점 셋 · 그림 갈래 0 A · 1 B · 2 C · 덩이 번호(−1 = 에너지 관)
OBJ = [0]
def newobj(): OBJ[0] += 1
def tri(a, b, c, k):
    P.extend([a, b, c]); KIND.append(k); OID.append(OBJ[0])
def quad(a, b, c, d, k):
    tri(a, b, c, k); tri(a, c, d, k)

# 둘레를 조각으로: 보통 틈 2~6° · 크게 끊긴 데 둘(12~20°)
spans = []; t = rng.uniform(0, 2 * np.pi); end = t + 2 * np.pi
big = set(rng.choice(18, 2, replace=False))
i = 0
while t < end - 0.15:
    L = np.radians(rng.uniform(13, 21)); spans.append((t, min(t + L, end - np.radians(3))))
    t += L + np.radians(rng.uniform(12, 20) if i in big else rng.uniform(2, 6)); i += 1
CEN = hc
for (a0, a1) in spans:
    newobj()
    S = 3; ts = np.linspace(a0, a1, S + 1)
    wr = rng.uniform(0.021, 0.03); wh = rng.uniform(0.018, 0.026)      # 반폭(바깥쪽 · 위쪽)
    dr = rng.uniform(-0.006, 0.006); dh = rng.uniform(-0.004, 0.004)
    tilt = rng.uniform(-0.25, 0.25)                                    # 둘레 축으로 기울임
    rings = []
    for j, tt in enumerate(ts):
        R_, U_, T_ = frame(tt)
        ca, sa = np.cos(tilt), np.sin(tilt); Rr = ca * R_ + sa * U_; Uu = -sa * R_ + ca * U_
        c0 = CEN + R_ * (hr + dr) + U_ * dh
        jit = lambda: rng.uniform(-0.35, 0.35)
        # 바깥-위 · 안-위 · 안-아래 · 바깥-아래
        cs = [c0 + Rr * wr * (1 + jit()) + Uu * wh * (1 + jit()), c0 - Rr * wr * (1 + jit()) + Uu * wh * (1 + jit()),
              c0 - Rr * wr * (1 + jit()) - Uu * wh * (1 + jit()), c0 + Rr * wr * (1 + jit()) - Uu * wh * (1 + jit())]
        rings.append(cs)
    for j in range(S):
        A, Bq = rings[j], rings[j + 1]
        quad(A[0], Bq[0], Bq[1], A[1], 0)     # 윗면
        quad(A[1], Bq[1], Bq[2], A[2], 1)     # 안쪽 면(빛이 샌다)
        quad(A[2], Bq[2], Bq[3], A[3], 1)     # 아랫면
        quad(A[3], Bq[3], Bq[0], A[0], 0)     # 바깥 면
    f, l = rings[0], rings[-1]
    quad(f[0], f[1], f[2], f[3], 1); quad(l[3], l[2], l[1], l[0], 1)   # 끊긴 끝(빛이 샌다)
    # 바깥으로 삐친 파편(비늘처럼 둘레 쪽으로 누움) 1~2
    for _ in range(rng.integers(2, 4)):
        # 비늘 파편: 둘레 쪽으로 눕고(앞 조각을 덮듯) 바깥으로 조금 · 가끔 위로 솟는 날
        newobj(); tt = rng.uniform(a0, a1); R_, U_, T_ = frame(tt)
        up = rng.random() < 0.15; sg = rng.choice([-1, 1])
        base = CEN + R_ * (hr + dr + wr * rng.uniform(0.2, 0.7)) + U_ * (dh + rng.uniform(0.2, 0.9) * wh)
        if up:
            tip = base + U_ * rng.uniform(0.022, 0.035) + R_ * rng.uniform(0.0, 0.012) + T_ * rng.uniform(-0.01, 0.01)
        else:
            tip = base + T_ * sg * rng.uniform(0.028, 0.045) + R_ * rng.uniform(0.008, 0.022) + U_ * rng.uniform(-0.004, 0.01)
        s1 = (R_ if not up else T_) * rng.uniform(0.009, 0.015); s2 = (U_ if not up else R_) * rng.uniform(0.004, 0.007)
        b0, b1, b2, b3 = base + s1 + s2, base - s1 + s2, base - s1 - s2, base + s1 - s2
        tri(b0, b1, tip, 0); tri(b1, b2, tip, 1); tri(b2, b3, tip, 1); tri(b3, b0, tip, 0); quad(b3, b2, b1, b0, 1)
    # 윗면 비늘 판 2~3(조금 겹쳐 덮는다)
    for _ in range(rng.integers(2, 4)):
        newobj(); tt = rng.uniform(a0, a1); R_, U_, T_ = frame(tt)
        c = CEN + R_ * (hr + dr + rng.uniform(-0.4, 0.4) * wr) + U_ * (dh + wh * 1.05)
        L1 = T_ * rng.uniform(0.012, 0.02); L2 = R_ * rng.uniform(0.008, 0.013); th = U_ * 0.004
        p = [c + L1, c + L2, c - L1 * 0.8, c - L2]
        top = [q + th for q in p]; bot = [q - th for q in p]
        tri(top[0], top[1], top[2], 0); tri(top[0], top[2], top[3], 0)
        for k in range(4):
            quad(bot[k], bot[(k + 1) % 4], top[(k + 1) % 4], top[k], 1)
# 속을 지나는 에너지 관(틈에서 비친다)
NA, NB, rt = 96, 8, 0.013
OBJ[0] = -1
for a in range(NA):
    for b in range(NB):
        def pt(ia, ib):
            t_ = 2 * np.pi * ia / NA; u_ = 2 * np.pi * ib / NB; R_, U_, T_ = frame(t_)
            return CEN + R_ * (hr + rt * np.cos(u_)) + U_ * rt * np.sin(u_)
        quad(pt(a, b), pt(a + 1, b), pt(a + 1, b + 1), pt(a, b + 1), 2)
# 떠 있는 부스러기 — 끊긴 데 둘레에 더 많이
gaps = [(spans[k][1], spans[(k + 1) % len(spans)][0] + (2 * np.pi if k == len(spans) - 1 else 0)) for k in range(len(spans))]
gapw = np.array([g1 - g0 for g0, g1 in gaps]); gp = gapw ** 2 / (gapw ** 2).sum()
OBJ[0] = 10000
for k in range(44):
    newobj()
    if rng.random() < 0.6:
        g0, g1 = gaps[rng.choice(len(gaps), p=gp)]; tt = rng.uniform(g0 - 0.1, g1 + 0.1)
    else:
        tt = rng.uniform(0, 2 * np.pi)
    R_, U_, T_ = frame(tt)
    c = CEN + R_ * (hr + rng.normal(0, 0.03)) + U_ * rng.normal(0, 0.025) + T_ * rng.normal(0, 0.01)
    s = rng.uniform(0.004, 0.011); kk = 2 if rng.random() < 0.18 else 0
    ax = [rng.normal(size=3) for _ in range(3)]
    v = [c + s * rng.uniform(0.6, 1.3) * sgn * a / np.linalg.norm(a) for a in ax for sgn in (1, -1)]   # 비뚤어진 팔면체
    for (i0, i1, i2) in [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]:
        tri(v[i0], v[i1], v[i2], kk)
P = np.array(P); KIND = np.array(KIND); OID = np.array(OID)
T = P.reshape(-1, 3, 3)
N = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
# 면이 덩이 바깥을 보게 바로잡는다(지터로 뒤집힌 것) — 덩이 가운데 기준 · 에너지 관은 고리 원 기준
cen = T.mean(1); ref = np.zeros_like(cen)
for o in np.unique(OID):
    m = OID == o
    if o == -1:
        ref[m] = [CEN + frame(np.arctan2((c - CEN) @ e2, (c - CEN) @ e1))[0] * hr for c in cen[m]]
    else:
        ref[m] = T[m].reshape(-1, 3).mean(0)
flip = ((cen - ref) * N).sum(1) < 0
T[flip] = T[flip][:, [0, 2, 1]]; N[flip] *= -1
# ---------- UV: 면마다 제 평면에 투영 → 그림 조각 안 아무 데나 ----------
UV = np.zeros((len(T), 3, 2))
for f in range(len(T)):
    rx, ry, rw, rh = (RA, RB, RC)[KIND[f]]
    n = N[f]; a = np.cross(n, [0, 1, 0] if abs(n[1]) < 0.9 else [1, 0, 0]); a /= np.linalg.norm(a); b = np.cross(n, a)
    q = np.stack([(T[f] - T[f, 0]) @ a, (T[f] - T[f, 0]) @ b], 1) * 1500        # 화소
    q -= q.min(0); span = q.max(0)
    room = np.array([rw - 2 * M, rh - 2 * M], float)
    if (span > room).any(): q *= (room / np.maximum(span, 1e-6)).min(); span = q.max(0)
    off = np.array([rx + M, ry + M]) + rng.random(2) * (room - span)
    px = q + off
    UV[f, :, 0] = px[:, 0] / TEX; UV[f, :, 1] = 1 - px[:, 1] / TEX
np.savez('halo_new.npz', P=T.reshape(-1, 3), N=np.repeat(N, 3, 0), UV=UV.reshape(-1, 2))
print('조각', len(spans), '· 세모', len(T), '(A %d · B %d · C %d)' % tuple((KIND == k).sum() for k in range(3)))
