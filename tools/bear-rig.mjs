/* 아르크토스 리그 — 뼈 가중치(BEAR_SKIN)를 세고, 공용 구역을 다른 시험장에 그대로 옮긴다.

     node tools/bear-rig.mjs

   원본은 beta/bear_arena.html 의 '아르크토스 뼈대 · 몸짓' 구역이다(표지
   `/* ==== 아르크토스 뼈대 · 몸짓 ====` ~ `/* ==== 아르크토스 뼈대 · 몸짓 끝 ==== *\/`).
   관절 자리(BEAR_J)나 몸짓을 거기서 고친 뒤 이걸 돌리면
     ① BEAR_J 를 읽어 가중치를 다시 세 그 구역의 BEAR_SKIN 줄을 바꾸고
     ② 구역 통째로 mixed · trio · siege · battle · night 시험장에 옮긴다(구역이 없으면 건너뛰고 알린다 — 처음 넣는 일은 손으로 했다).
   모델(bear 시험장 GLB_B64 · mixed GLB_B64 · 나머지 GLB_BEAR)은 여섯 곳이 같다 — 다르면 멈춘다.

   가중치 셈 — tools/garg-rig.mjs 와 같다:
     1) 세모로 2.5 cm 칸 부피를 채운다(칸 가운데를 지나는 x·y·z 세 줄에 세모를 꿰어 회전수를 세고 둘 이상이
        속이라 하면 속) · 겉 칸도 한 칸 불려 더한다(가시 · 발톱처럼 얇은 데).
     2) 뼈(머리→꼬리 선분)마다 칸 속을 따라 다익스트라로 거리를 잰다(26 이웃 · 2 m 까지).
     3) 정점마다 가장 가까운 뼈 b1 과 그 이웃 뼈(부모 · 자식)에 1/d⁴ 몫을 준다. 뼈에서 정점으로 가는 쪽이 정점 법선과
        어긋나면(뼈 반대편 겉) 거리에 1.6 배 벌점. 위팔 뼈는 관절 뒤(몸통 쪽)로 갈수록 벌점(0.25 m 에 4 배) — 어깨 위 등 가시가 팔을 따라 늘어났다.
     4) 몫을 겉(세모 이웃)을 따라 SMOOTH 번 고르게 편다 — 처음 뼈가 이웃(같음 · 부모 · 자식 · 형제 · 위팔↔허리 · 몸통·머리끼리)인 정점끼리만.
        안 펴고 가까운 둘만 골랐더니 이웃 정점끼리 둘째 뼈가 갈려 변이 30 배까지 늘었다(펴고 넷을 쓰니 7 배 · 가시 끝뿐).
     5) 몫이 큰 뼈 넷을 남긴다(Three 가 정점마다 받는 수).
     6) 가시 · 발톱처럼 얇은 덩이는 밑동 고리 한가운데 정점의 몫을 통째로 받는다(끝과 밑동이 다른 뼈를 따르면 가시가 비틀렸다).
   빗장(clav)처럼 noskin 을 단 뼈는 가중치를 안 받는다. */
import {readFileSync, writeFileSync} from 'node:fs';

const SRC = 'beta/bear_arena.html';
const TARGETS = [['mixed', 'GLB_B64'], ['trio', 'GLB_BEAR'], ['siege', 'GLB_BEAR'], ['battle', 'GLB_BEAR'], ['night', 'GLB_BEAR']]
  .map(([n, g]) => [`beta/${n}_arena.html`, g]);
const B0 = '/* ==== 아르크토스 뼈대 · 몸짓 ====', B1 = '/* ==== 아르크토스 뼈대 · 몸짓 끝 ==== */';

const findBlock = txt => {
  const a = txt.indexOf(B0), b = txt.indexOf(B1);
  if (a < 0 || b < 0) return null;
  const e = b + B1.length;
  return {a, e, text: txt.slice(a, e)};
};
const glbOf = (txt, name) => {
  const m = txt.match(new RegExp('^const ' + name + '="([^"]+)";?$', 'm'));
  if (!m) throw new Error(name + ' 줄이 없다');
  return m[1];
};

/* ── GLB ── */
const src = readFileSync(SRC, 'utf8');
const blk = findBlock(src);
if (!blk) throw new Error(SRC + ' 에 아르크토스 구역이 없다');
const b64 = glbOf(src, 'GLB_B64');
const buf = Buffer.from(b64, 'base64');
const jl = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jl).toString());
const bin = 20 + jl + 8;
const acc = i => {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const n = {SCALAR: 1, VEC2: 2, VEC3: 3}[a.type] * a.count;
  const C = a.componentType === 5126 ? Float32Array : Uint32Array;
  return new C(buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + n * 4));
};
const pr = json.meshes[0].primitives[0];
const P = acc(pr.attributes.POSITION), NRM = acc(pr.attributes.NORMAL), I = acc(pr.indices);
const N = P.length / 3;

/* ── 관절 표 — 구역 안의 BEAR_J 를 그대로 읽는다 ── */
const jm = blk.text.match(/const BEAR_J=(\[[\s\S]*?\n\]);/);
if (!jm) throw new Error('BEAR_J 를 못 찾았다');
const JX = new Function('return ' + jm[1])();

/* ── 1) 칸 부피 ── */
const VOX = 0.025, PAD = 3;
const SMOOTH = 24;                  // 가중치를 겉을 따라 펴는 번수(한 번에 이웃 평균과 반반)
let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
for (let i = 0; i < N; i++) {
  x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]);
  y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]);
  z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]);
}
const ox = x0 - PAD * VOX, oy = y0 - PAD * VOX, oz = z0 - PAD * VOX;
const NX = Math.ceil((x1 - x0) / VOX) + 2 * PAD + 1, NY = Math.ceil((y1 - y0) / VOX) + 2 * PAD + 1, NZ = Math.ceil((z1 - z0) / VOX) + 2 * PAD + 1;
const NV = NX * NY * NZ, id = (a, b, c) => a + NX * (b + NY * c);
const surf = new Uint8Array(NV);
for (let t = 0; t < I.length; t += 3) {
  const A = I[t], B = I[t + 1], C = I[t + 2];
  const ax = P[A * 3], ay = P[A * 3 + 1], az = P[A * 3 + 2], bx = P[B * 3], by = P[B * 3 + 1], bz = P[B * 3 + 2], cx = P[C * 3], cy = P[C * 3 + 1], cz = P[C * 3 + 2];
  const L = Math.max(Math.hypot(bx - ax, by - ay, bz - az), Math.hypot(cx - ax, cy - ay, cz - az), Math.hypot(cx - bx, cy - by, cz - bz));
  const n = Math.max(1, Math.ceil(L / (VOX * 0.45)));
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
    const u = i / n, v = j / n, w = 1 - u - v;
    surf[id(Math.floor((ax * w + bx * u + cx * v - ox) / VOX), Math.floor((ay * w + by * u + cy * v - oy) / VOX), Math.floor((az * w + bz * u + cz * v - oz) / VOX))] = 1;
  }
}
const vote = new Uint8Array(NV);
const dims = [NX, NY, NZ], org = [ox, oy, oz];
for (let ax = 0; ax < 3; ax++) {
  const u = (ax + 1) % 3, v = (ax + 2) % 3, NU = dims[u], NW = dims[v], NA = dims[ax];
  const lists = new Array(NU * NW);
  for (let t = 0; t < I.length; t += 3) {
    const p = [I[t], I[t + 1], I[t + 2]].map(i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
    const us = p.map(q => (q[u] - org[u]) / VOX - 0.5), vs = p.map(q => (q[v] - org[v]) / VOX - 0.5);
    const u0 = Math.max(0, Math.ceil(Math.min(...us))), u1 = Math.min(NU - 1, Math.floor(Math.max(...us)));
    const v0 = Math.max(0, Math.ceil(Math.min(...vs))), v1 = Math.min(NW - 1, Math.floor(Math.max(...vs)));
    if (u0 > u1 || v0 > v1) continue;
    const d1u = us[1] - us[0], d1v = vs[1] - vs[0], d2u = us[2] - us[0], d2v = vs[2] - vs[0];
    const den = d1u * d2v - d2u * d1v;
    if (Math.abs(den) < 1e-12) continue;
    const sgn = den > 0 ? 1 : -1;
    for (let cu = u0; cu <= u1; cu++) for (let cv = v0; cv <= v1; cv++) {
      const pu = cu - us[0], pv = cv - vs[0];
      const b1 = (pu * d2v - d2u * pv) / den, b2 = (d1u * pv - pu * d1v) / den;
      if (b1 < 0 || b2 < 0 || b1 + b2 > 1) continue;
      const a3 = p[0][ax] + (p[1][ax] - p[0][ax]) * b1 + (p[2][ax] - p[0][ax]) * b2;
      const k = cu + NU * cv;
      (lists[k] || (lists[k] = [])).push((a3 - org[ax]) / VOX - 0.5, sgn);
    }
  }
  for (let cu = 0; cu < NU; cu++) for (let cv = 0; cv < NW; cv++) {
    const L = lists[cu + NU * cv]; if (!L) continue;
    const ev = []; for (let i = 0; i < L.length; i += 2) ev.push([L[i], L[i + 1]]);
    ev.sort((x, y) => x[0] - y[0]);
    let w = 0, e = 0;
    for (let ca = 0; ca < NA; ca++) {
      while (e < ev.length && ev[e][0] <= ca) { w += ev[e][1]; e++; }
      if (w !== 0) { const c = [0, 0, 0]; c[ax] = ca; c[u] = cu; c[v] = cv; vote[id(c[0], c[1], c[2])]++; }
    }
  }
}
const solid = new Uint8Array(NV);
let nSolid = 0;
for (let c = 1; c < NZ - 1; c++) for (let b = 1; b < NY - 1; b++) for (let a = 1; a < NX - 1; a++) {
  const k = id(a, b, c);
  let f = vote[k] >= 2 || surf[k];
  for (let dc = -1; dc <= 1 && !f; dc++) for (let db = -1; db <= 1 && !f; db++) for (let da = -1; da <= 1 && !f; da++)
    if (surf[k + da + NX * (db + NY * dc)]) f = 1;
  if (f) { solid[k] = 1; nSolid++; }
}

/* ── 2) 뼈마다 칸 속 거리 ── */
const body = [];
JX.forEach((e, i) => { if (!(e[4] && e[4].noskin)) body.push(i); });
const dist = new Float64Array(NV), D = new Map();
const CAP = 1 << 23, hk = new Int32Array(CAP), hv = new Float64Array(CAP);
const OFF = [];
for (let dc = -1; dc <= 1; dc++) for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++)
  if (da || db || dc) OFF.push(da + NX * (db + NY * dc), Math.hypot(da, db, dc));
const MAXD = 80;
const outside = {};
for (const bi of body) {
  const [nm, , h, t] = JX[bi];
  dist.fill(Infinity);
  let hn = 0;
  const push = (k, v) => {
    if (hn >= CAP) throw new Error('큐가 넘쳤다');
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
    hk[i] = k; hv[i] = v;
  };
  const L = Math.hypot(t[0] - h[0], t[1] - h[1], t[2] - h[2]), n = Math.max(2, Math.ceil(L / (VOX * 0.3)));
  let out = 0;
  for (let s = 0; s <= n; s++) {
    const u = s / n;
    const k = id(Math.floor((h[0] + (t[0] - h[0]) * u - ox) / VOX), Math.floor((h[1] + (t[1] - h[1]) * u - oy) / VOX), Math.floor((h[2] + (t[2] - h[2]) * u - oz) / VOX));
    if (dist[k] === 0) continue;
    dist[k] = 0; push(k, 0); if (!solid[k]) out++;
  }
  if (out) outside[nm] = out;
  while (hn > 0) {
    const k = hk[0], dk = hv[0];
    hn--;
    if (hn > 0) {
      const lk = hk[hn], lv = hv[hn]; let i = 0;
      for (;;) { const l = i * 2 + 1; if (l >= hn) break; let m = l; if (l + 1 < hn && hv[l + 1] < hv[l]) m = l + 1; if (hv[m] >= lv) break; hk[i] = hk[m]; hv[i] = hv[m]; i = m; }
      hk[i] = lk; hv[i] = lv;
    }
    if (dk > dist[k]) continue;
    if (dk > MAXD) break;
    for (let o = 0; o < OFF.length; o += 2) {
      const kk = k + OFF[o];
      if (kk < 0 || kk >= NV || !solid[kk]) continue;
      const nd = dk + OFF[o + 1];
      if (nd < dist[kk]) { dist[kk] = nd; push(kk, nd); }
    }
  }
  D.set(bi, Float32Array.from(dist));
}

/* ── 3) 정점마다 ── */
const near = (i, b) => {
  const a = Math.floor((P[i * 3] - ox) / VOX), bb = Math.floor((P[i * 3 + 1] - oy) / VOX), c = Math.floor((P[i * 3 + 2] - oz) / VOX), d = D.get(b);
  let best = Infinity;
  for (let r = 0; r <= 3 && best === Infinity; r++)
    for (let dc = -r; dc <= r; dc++) for (let db = -r; db <= r; db++) for (let da = -r; da <= r; da++) {
      const k = id(a + da, bb + db, c + dc);
      if (d[k] < Infinity) best = Math.min(best, d[k] + Math.hypot(da, db, dc));
    }
  return best;
};
const facing = (i, b) => {
  const [, , h, t] = JX[b], x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
  const dx = t[0] - h[0], dy = t[1] - h[1], dz = t[2] - h[2];
  const u = Math.max(0, Math.min(1, ((x - h[0]) * dx + (y - h[1]) * dy + (z - h[2]) * dz) / (dx * dx + dy * dy + dz * dz)));
  const vx = x - (h[0] + dx * u), vy = y - (h[1] + dy * u), vz = z - (h[2] + dz * u);
  return NRM[i * 3] * vx + NRM[i * 3 + 1] * vy + NRM[i * 3 + 2] * vz > 0;
};
/* 위팔 뼈는 관절 뒤(몸통 쪽)로 갈수록 거리를 늘린다 — 어깨 위 등 가시가 팔을 따라 늘어났다(넓적다리엔 안 건다 —
   엉덩이 관절 뒤의 큰 궁둥이 살이 정강이로 넘어갔다).
   축을 따라 관절 뒤로 0.25 m 면 4 배 */
const behind = (i, b) => {
  if (!/^arm/.test(JX[b][0])) return 1;
  const [, , h, t] = JX[b], dx = t[0] - h[0], dy = t[1] - h[1], dz = t[2] - h[2], L = Math.hypot(dx, dy, dz);
  const s = ((P[i * 3] - h[0]) * dx + (P[i * 3 + 1] - h[1]) * dy + (P[i * 3 + 2] - h[2]) * dz) / L;
  return 1 + 3 * Math.min(1, Math.max(0, -s / 0.25));
};
/* 섞는 짝은 이웃한 뼈끼리만(부모 · 자식 — 형제는 안 된다: 팔과 목이 섞이면 어깨가 둘 다 따라 늘어났다) — 엉덩이와 정강이가 섞인 정점이 넓적다리를 건너 늘어났다.
   가중치 없는 뼈(빗장)는 건너뛰어 그 위의 뼈를 부모로 친다 */
const jIx = n => JX.findIndex(e => e[0] === n);
const skParent = JX.map((e, i) => { let p = e[1]; while (p !== -1) { const k = jIx(p); if (!(JX[k][4] && JX[k][4].noskin)) return k; p = JX[k][1]; } return -1; });
const nextTo = (a, b) => a === b || skParent[a] === b || skParent[b] === a;
const SK = 7;                         // 정점마다 [뼈0, 뼈1, 뼈2, 뼈3, 몫0, 몫1, 몫2](×255 · 몫3 = 255 − 나머지)
const skin = Buffer.alloc(N * SK);
let lost = 0;
const cnt = {};
/* ① 정점마다 가장 가까운 뼈 b1 과 그 이웃 뼈들의 몫 1/d⁴(합 1) */
const NB = JX.length, W = new Float32Array(N * NB), prim = new Int16Array(N);
for (let i = 0; i < N; i++) {
  let b1 = -1, d1 = Infinity;
  const dd = new Float64Array(NB).fill(Infinity);
  for (const b of body) {
    let d = near(i, b);
    if (!facing(i, b)) d *= 1.6;
    d *= behind(i, b);
    dd[b] = d;
    if (d < d1) { b1 = b; d1 = d; }
  }
  if (b1 < 0 || d1 === Infinity) { lost++; b1 = body[0]; dd[b1] = 1; }
  prim[i] = b1;
  let s = 0;
  for (const b of body) if (nextTo(b, b1) && dd[b] < Infinity) { const q = 1 / Math.pow(Math.max(dd[b], 0.5), 4); W[i * NB + b] = q; s += q; }
  for (const b of body) W[i * NB + b] /= s;
}
/* ② 겉을 따라 고르게 편다 — 가까운 두 뼈만 골라 섞으면 둘째 뼈가 이웃 정점끼리 갈려(팔뚝 한가운데서 위팔 · 손이 엇갈렸다)
   변이 수십 배로 늘었다. 맞닿아 조각된 딴 덩이(팔꿈치와 넓적다리)끼리는 안 섞는다 — 처음 뼈가 이웃(같음 · 부모 · 자식 · 형제)일 때만 */
const adjU = new Array(N);
for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
  if (a !== b) { const u = I[t + a], v = I[t + b]; (adjU[u] || (adjU[u] = new Set())).add(v); }
const root = a => /^(arm|thigh)/.test(JX[a][0]);
const trunk = a => !/^(arm|fore|hand|thigh|shin|foot)/.test(JX[a][0]);   // 몸통 · 목 · 머리 · 턱 — 한 덩이라 서로 다 섞는다(턱 밑 목살)
const sib = (a, b) => nextTo(a, b) || (skParent[a] >= 0 && skParent[a] === skParent[b]) || (trunk(a) && trunk(b)) ||
  (root(a) && skParent[skParent[a]] === b) || (root(b) && skParent[skParent[b]] === a);   // 위팔 ↔ 허리(어깨 뒤 등)
const nbr = Array.from({length: N}, (_, i) => adjU[i] ? [...adjU[i]].filter(j => sib(prim[i], prim[j])) : []);
const W2 = new Float32Array(N * NB);
for (let it = 0; it < SMOOTH; it++) {
  for (let i = 0; i < N; i++) {
    const o = i * NB, L = nbr[i];
    if (!L.length) { for (let b = 0; b < NB; b++) W2[o + b] = W[o + b]; continue; }
    for (let b = 0; b < NB; b++) { let a = 0; for (const j of L) a += W[j * NB + b]; W2[o + b] = 0.5 * W[o + b] + 0.5 * a / L.length; }
  }
  W.set(W2);
}
/* ③ 몫이 큰 뼈 넷(Three 가 정점마다 받는 수) — 둘만 고르면 셋째 뼈가 이웃 정점에서 갈려 변이 늘어났다 */
for (let i = 0; i < N; i++) {
  const o = i * NB, top = [];
  for (const b of body) if (W[o + b] > 1e-4) top.push([W[o + b], b]);
  top.sort((x, y) => y[0] - x[0]);
  const t4 = top.slice(0, 4); while (t4.length < 4) t4.push([0, t4[0][1]]);
  const sum = t4.reduce((a, x) => a + x[0], 0);
  const q = t4.map(x => Math.round(x[0] / sum * 255));
  q[0] += 255 - (q[0] + q[1] + q[2] + q[3]);
  for (let k = 0; k < 4; k++) skin[i * SK + k] = t4[k][1];
  for (let k = 0; k < 3; k++) skin[i * SK + 4 + k] = q[k];
  cnt[JX[t4[0][1]][0]] = (cnt[JX[t4[0][1]][0]] || 0) + 1;
}
/* 가시 · 발톱처럼 얇은 데는 밑동의 가중치를 그대로 물려받는다 — 끝과 밑동이 다른 뼈를 따르면 가시가 비틀리고 납작해졌다.
   얇음: 정점에서 법선 반대로 15 cm 까지 들어가며 만나는 칸의 '겉에서 깊이'가 7 cm 를 못 넘으면 얇다(칸 부피는 겉을 한 칸 불렸으므로 실제보다 2.5 cm 두껍다).
   얇은 덩이는 밑동 고리 한가운데 정점 하나의 뼈 · 몫을 통째로 받는다. */
{
  // 칸 깊이(겉에서 몇 칸) — 3-4-5 챔퍼 두 번 쓸기
  const dep = new Uint16Array(NV);
  for (let k = 0; k < NV; k++) dep[k] = solid[k] ? 65535 : 0;
  const nb = [];
  for (let dc = -1; dc <= 0; dc++) for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) {
    const o = da + NX * (db + NY * dc); if (o >= 0) continue;
    nb.push(o, [3, 4, 5][Math.abs(da) + Math.abs(db) + Math.abs(dc) - 1]);
  }
  for (let k = 0; k < NV; k++) if (dep[k]) { let m = dep[k]; for (let j = 0; j < nb.length; j += 2) { const kk = k + nb[j]; if (kk >= 0) m = Math.min(m, dep[kk] + nb[j + 1]); } dep[k] = m; }
  for (let k = NV - 1; k >= 0; k--) if (dep[k]) { let m = dep[k]; for (let j = 0; j < nb.length; j += 2) { const kk = k - nb[j]; if (kk < NV) m = Math.min(m, dep[kk] + nb[j + 1]); } dep[k] = m; }
  const depthAt = (x, y, z) => { const a = Math.floor((x - ox) / VOX), b = Math.floor((y - oy) / VOX), c = Math.floor((z - oz) / VOX);
    return a < 0 || b < 0 || c < 0 || a >= NX || b >= NY || c >= NZ ? 0 : dep[id(a, b, c)] / 3 * VOX; };
  const thin = new Uint8Array(N);
  let nThin = 0;
  for (let i = 0; i < N; i++) {
    let m = 0;
    for (let d = 0; d <= 0.15; d += VOX * 0.5) m = Math.max(m, depthAt(P[i * 3] - NRM[i * 3] * d, P[i * 3 + 1] - NRM[i * 3 + 1] * d, P[i * 3 + 2] - NRM[i * 3 + 2] * d));
    if (m < 0.07) { thin[i] = 1; nThin++; }
  }
  const adj = new Array(N);
  for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
    if (a !== b) (adj[I[t + a]] || (adj[I[t + a]] = [])).push(I[t + b]);
  /* 얇은 정점끼리 이어진 덩이(가시 하나 · 발톱 하나)마다, 그 덩이에 맞닿은 두꺼운 정점(밑동 고리) 가운데
     고리 한가운데에 가장 가까운 것 하나의 뼈 · 몫을 덩이 전체에 준다 — 정점마다 다른 밑동을 받으면 가시 끝이 따로 놀았다 */
  const comp = new Int32Array(N).fill(-1);
  let nComp = 0, moved = 0;
  for (let i0 = 0; i0 < N; i0++) {
    if (!thin[i0] || comp[i0] >= 0) continue;
    const mem = [i0], ring = new Set(); comp[i0] = nComp;
    for (let q = 0; q < mem.length; q++) for (const j of adj[mem[q]] || []) {
      if (thin[j]) { if (comp[j] < 0) { comp[j] = nComp; mem.push(j); } } else ring.add(j);
    }
    nComp++;
    if (!ring.size) continue;
    let cx = 0, cy = 0, cz = 0;
    for (const j of ring) { cx += P[j * 3]; cy += P[j * 3 + 1]; cz += P[j * 3 + 2]; }
    cx /= ring.size; cy /= ring.size; cz /= ring.size;
    let best = -1, bd = Infinity;
    for (const j of ring) { const d = Math.hypot(P[j * 3] - cx, P[j * 3 + 1] - cy, P[j * 3 + 2] - cz); if (d < bd) { bd = d; best = j; } }
    for (const i of mem) { skin.copy(skin, i * SK, best * SK, best * SK + SK); moved++; }
  }
  console.log(`  얇은 정점(가시 · 발톱) ${nThin} · 덩이 ${nComp} — 밑동 가중치로 ${moved}`);
  {   /* 이웃 정점끼리 몫이 크게 갈린 변(합 차이 0.9 넘게) — 맞닿게 조각된 딴 덩이(팔꿈치 · 넓적다리)가 한 겉면으로 이어진 데다.
         지금은 0 이라 시험장은 세모를 하나도 빼지 않는다. 생기면 그 세모가 판처럼 늘어나니 관절 자리부터 볼 것(BEAR_DIAG=20 이면 자리를 찍는다) */
    const wv = i => { const v = new Float32Array(NB); let r = 255; for (let k = 0; k < 4; k++) { const w = k < 3 ? skin[i * SK + 4 + k] : r; v[skin[i * SK + k]] += w / 255; r -= w; } return v; };
    const bad = [];
    for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = I[t + e], b = I[t + (e + 1) % 3]; if (a > b) continue;
      const A = wv(a), Bv = wv(b); let d = 0; for (let k = 0; k < NB; k++) d += Math.abs(A[k] - Bv[k]);
      if (d > 0.9) bad.push([d, a, b]); }
    bad.sort((x, y) => y[0] - x[0]);
    console.log('  몫이 갈린 변 ' + bad.length + (bad.length ? ' — 늘어난다!' : ''));
    for (const [d, a, b] of bad.slice(0, +(process.env.BEAR_DIAG || 0))) console.log(`   ${d.toFixed(2)} ${thin[a]}${thin[b]} c${comp[a]}/${comp[b]} (${[0,1,2].map(k=>P[a*3+k].toFixed(2))}) (${[0,1,2].map(k=>P[b*3+k].toFixed(2))})`);
  }
}
const skinB64 = skin.toString('base64');
console.log(`아르크토스 리그 — 정점 ${N} · 뼈 ${JX.length} · 칸 ${NX}×${NY}×${NZ} (속 ${nSolid})` +
  (lost ? ` · 뼈를 못 찾은 정점 ${lost}` : '') +
  (Object.keys(outside).length ? ` · 몸 밖으로 나간 뼈 칸 ${JSON.stringify(outside)}` : ''));
console.log('  뼈마다 정점: ' + Object.entries(cnt).map(([k, v]) => k + ' ' + v).join(' · '));

/* ── 쓰기 ── */
const newBlk = blk.text.replace(/^const BEAR_SKIN="[^"]*";/m, `const BEAR_SKIN="${skinB64}";`);
if (newBlk === blk.text && !blk.text.includes(skinB64)) throw new Error('BEAR_SKIN 줄을 못 찾았다');
writeFileSync(SRC, src.slice(0, blk.a) + newBlk + src.slice(blk.e));
console.log(`  ${SRC} — 가중치 ${skinB64.length.toLocaleString()} 자`);
for (const [f, g] of TARGETS) {
  const t = readFileSync(f, 'utf8');
  if (glbOf(t, g) !== b64) throw new Error(f + ' 의 곰 모델이 원본과 다르다 — 가중치가 안 맞는다');
  const b = findBlock(t);
  if (!b) { console.log(`  ${f} — 구역이 없어 건너뜀`); continue; }
  writeFileSync(f, t.slice(0, b.a) + newBlk + t.slice(b.e));
  console.log(`  ${f} — 구역 바꿔 끼움`);
}
