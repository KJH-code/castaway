# tools/animals/probe.py — 뼈 자리를 잡으려고 메시를 잰다(다리 기둥 · 코 · 꼬리 · 등)
import sys, numpy as np; sys.path.insert(0, 'tools/animals'); from meshio import load, orient, HEIGHT
S, name = sys.argv[1], sys.argv[2]
P, I = load(f'{S}/{name}_hi.bin'); Q = orient(P, name); H = Q[:, 1].max(); L = np.ptp(Q[:, 2])
print(name, 'H', round(H, 3), 'len', round(L, 3), 'z', Q[:, 2].min().round(3), Q[:, 2].max().round(3))
low = Q[Q[:, 1] < 0.06 * H]
# 다리 넷 — 낮은 점을 z 로 둘(앞 · 뒤), x 부호로 둘
zs = np.sort(low[:, 2]); gap = np.argmax(np.diff(zs)); zc = (zs[gap] + zs[gap + 1]) / 2
for fr, sel in (('front', low[:, 2] > zc), ('hind', low[:, 2] <= zc)):
    G = low[sel]
    for side, s2 in (('L', G[:, 0] > 0), ('R', G[:, 0] <= 0)):
        g = G[s2]
        if not len(g): print(fr, side, 'none'); continue
        c = np.array([g[:, 0].mean(), g[:, 2].mean()]); r = max(np.ptp(g[:, 0]), 0.02) * 0.9; base_w = np.ptp(g[:, 0])
        out = []
        for y in np.linspace(0.02 * H, 0.75 * H, 30):
            sl = Q[np.abs(Q[:, 1] - y) < 0.012 * H]
            d = np.hypot(sl[:, 0] - c[0], sl[:, 2] - c[1]); m = sl[d < r * 1.6]
            if len(m) < 3: break
            w = np.ptp(m[:, 0])
            c = np.array([m[:, 0].mean(), m[:, 2].mean()])
            out.append((round(y, 3), round(c[0], 3), round(c[1], 3), round(w, 3)))
            # 몸통에 닿았다 — 그 높이의 단면 전체가 넓어졌다
            whole = sl[np.abs(sl[:, 2] - c[1]) < 0.05 * L]
            if len(whole) and np.ptp(whole[:, 0]) > 4 * base_w + 0.02: break
        print(fr, side, 'n', len(g), 'path', out[::3] + out[-1:])
# 몸통 단면(등 · 배)
for z in np.linspace(Q[:, 2].min(), Q[:, 2].max(), 13):
    sl = Q[np.abs(Q[:, 2] - z) < 0.02 * L]
    if len(sl): print('z', round(z, 3), 'y', round(sl[:, 1].min(), 3), round(sl[:, 1].max(), 3), 'x', round(sl[:, 0].min(), 3), round(sl[:, 0].max(), 3))
