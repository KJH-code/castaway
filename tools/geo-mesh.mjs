/* tools/geo-mesh.mjs — Meshy STL(바위 · 벼랑 · 봉우리) → 본편 자료 engine/js/data-geo-meshes.js
   쓰는 법: node tools/geo-mesh.mjs meshes/*.stl
   · STL 은 Z 위 · 높이 50 · 밑면 z=0 (Meshy 내보내기) → Y 위로 돌린다 · 높이 1 로 줄인다(게임이 키운다)
   · **줄이기는 QEM 모서리 접기**(Garland–Heckbert · 2026-11-05) — 꼭짓점마다 면 평면의 오차(4×4 이차식)를 모으고, 접었을 때 오차가 가장 작은 모서리부터
     그 오차를 가장 작게 하는 자리로 접는다. **구멍이 안 생기게** 접기 전에 둘을 본다:
       ① 고리 조건 — 두 끝의 이웃 가운데 같은 것이 정확히 둘(그 모서리를 낀 두 세모의 맞은편 꼭짓점)이어야 한다(아니면 접은 뒤 면이 꼬이거나 뚫린다)
       ② 뒤집힘 — 둘레 세모의 법선이 접은 뒤 크게 돌거나(내적 0.2 밑) 넓이가 사라지면 접지 않는다
     예전(tools/geo-mesh.py)은 격자 칸마다 꼭짓점을 하나로 묶었다 — 가는 데가 끊겨 줄인 모형마다 구멍 테두리가 수백 개 · 면 셋이 한 모서리에 붙은 꼬임이
     수천 개였다(원본 STL 은 열 개 모두 닫혀 있다 — 사용자 지적 '산 메시에 구멍이 있다').
   · 단계: 아주 곱게(ultra — 봉우리 9만 · 큰 벼랑 5만 세모 · 곁에서) · 가까이(near 1.6만) · 멀리(far 2.5천) · 아주 멀리(tiny 600) — 한 번 접어 내려가며 차례로 떠 둔다
   · 정점마다 오목한 정도(aCav 0~255 — 이웃 평균이 법선 반대쪽이면 틈) — 셰이더가 갈라진 틈을 짙게 칠한다
   · 자리 16비트(밑면 기준 상자 안) · 번호 16/32비트 → base64 · 원본 STL 은 레포에 안 담는다(.gitignore) */
import fs from 'fs';
import path from 'path';

const ULTRA = name => /peak/.test(name) ? 90000 : /cliffside|plateau/.test(name) ? 50000 : 0;

function loadSTL(p) {
  const b = fs.readFileSync(p), n = b.readUInt32LE(80), map = new Map(), P = [], I = new Int32Array(n * 3);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const o = 84 + t * 50 + 12 + k * 12, x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8);
    const key = x + ',' + y + ',' + z; let id = map.get(key);
    if (id === undefined) { id = P.length / 3; map.set(key, id); P.push(x / 50, z / 50, -y / 50); }   // Z 위 → Y 위 · 높이 1
    I[t * 3 + k] = id;
  }
  return { P: new Float64Array(P), I };
}

/* ── QEM ── */
function decimate(P0, I0, targets) {
  const nv = P0.length / 3, P = Float64Array.from(P0), F = Int32Array.from(I0), nf = F.length / 3;
  const Q = new Float64Array(nv * 10), alive = new Uint8Array(nv).fill(1), fAlive = new Uint8Array(nf).fill(1), ver = new Uint32Array(nv);
  const vf = Array.from({ length: nv }, () => []);
  const nrm = (a, b, c, out) => {
    const ax = P[b * 3] - P[a * 3], ay = P[b * 3 + 1] - P[a * 3 + 1], az = P[b * 3 + 2] - P[a * 3 + 2];
    const bx = P[c * 3] - P[a * 3], by = P[c * 3 + 1] - P[a * 3 + 1], bz = P[c * 3 + 2] - P[a * 3 + 2];
    out[0] = ay * bz - az * by; out[1] = az * bx - ax * bz; out[2] = ax * by - ay * bx; return Math.hypot(out[0], out[1], out[2]);
  };
  const tmp = [0, 0, 0];
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2]; vf[a].push(f); vf[b].push(f); vf[c].push(f);
    const L = nrm(a, b, c, tmp); if (L < 1e-14) continue;
    const nx = tmp[0] / L, ny = tmp[1] / L, nz = tmp[2] / L, d = -(nx * P[a * 3] + ny * P[a * 3 + 1] + nz * P[a * 3 + 2]), w = L * 0.5;
    const q = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d];
    for (const v of [a, b, c]) for (let k = 0; k < 10; k++) Q[v * 10 + k] += q[k] * w;
  }
  /* 쌓기(최소 힙) — 항목: 값 · u · v · 그때의 판(ver) · 접을 자리 */
  let hc = 0, cap = 1 << 20; let H = new Int32Array(cap), Ec = new Float64Array(cap), Eu = new Int32Array(cap), Ev = new Int32Array(cap), Esu = new Uint32Array(cap), Esv = new Uint32Array(cap), Ep = new Float64Array(cap * 3);
  let ne = 0, hn = 0;
  const grow = () => {
    cap *= 2; const r = (A, C) => { const B = new C(cap * (A === Ep ? 3 : 1)); B.set(A); return B; };
    H = r(H, Int32Array); Ec = r(Ec, Float64Array); Eu = r(Eu, Int32Array); Ev = r(Ev, Int32Array); Esu = r(Esu, Uint32Array); Esv = r(Esv, Uint32Array);
    const B = new Float64Array(cap * 3); B.set(Ep); Ep = B;
  };
  const up = i => { const e = H[i]; while (i > 0) { const p = (i - 1) >> 1; if (Ec[H[p]] <= Ec[e]) break; H[i] = H[p]; i = p; } H[i] = e; };
  const down = i => { const e = H[i]; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && Ec[H[c + 1]] < Ec[H[c]]) c++; if (Ec[H[c]] >= Ec[e]) break; H[i] = H[c]; i = c; } H[i] = e; };
  const qerr = (q, x, y, z) => q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x + q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y + q[7] * z * z + 2 * q[8] * z + q[9];
  const qq = new Float64Array(10);
  function push(u, v) {
    for (let k = 0; k < 10; k++) qq[k] = Q[u * 10 + k] + Q[v * 10 + k];
    const ux = P[u * 3], uy = P[u * 3 + 1], uz = P[u * 3 + 2], vx = P[v * 3], vy = P[v * 3 + 1], vz = P[v * 3 + 2];
    const mx = (ux + vx) / 2, my = (uy + vy) / 2, mz = (uz + vz) / 2, el = Math.hypot(ux - vx, uy - vy, uz - vz);
    let bx = mx, by = my, bz = mz, best = qerr(qq, mx, my, mz);
    for (const [x, y, z] of [[ux, uy, uz], [vx, vy, vz]]) { const e = qerr(qq, x, y, z); if (e < best) { best = e; bx = x; by = y; bz = z; } }
    /* 가장 좋은 자리 — A x = −b (3×3) · 모서리 길이만큼 넘게 벗어나면 버린다(뾰족한 가시가 서지 않게) */
    const a = qq[0], b = qq[1], c = qq[2], d = qq[4], e2 = qq[5], f = qq[7], det = a * (d * f - e2 * e2) - b * (b * f - e2 * c) + c * (b * e2 - d * c);
    if (Math.abs(det) > 1e-18) {
      const r0 = -qq[3], r1 = -qq[6], r2 = -qq[8];
      const x = (r0 * (d * f - e2 * e2) - b * (r1 * f - e2 * r2) + c * (r1 * e2 - d * r2)) / det;
      const y = (a * (r1 * f - e2 * r2) - r0 * (b * f - e2 * c) + c * (b * r2 - r1 * c)) / det;
      const z = (a * (d * r2 - r1 * e2) - b * (b * r2 - r1 * c) + r0 * (b * e2 - d * c)) / det;
      if (Math.hypot(x - mx, y - my, z - mz) < el) { const e = qerr(qq, x, y, z); if (e < best) { best = e; bx = x; by = y; bz = z; } }
    }
    if (ne >= cap) grow();
    const id = ne++; Ec[id] = Math.max(0, best); Eu[id] = u; Ev[id] = v; Esu[id] = ver[u]; Esv[id] = ver[v]; Ep[id * 3] = bx; Ep[id * 3 + 1] = by; Ep[id * 3 + 2] = bz;
    if (hn >= H.length) grow();
    H[hn] = id; up(hn++);
  }
  const live = v => { const a = vf[v]; let j = 0; for (let i = 0; i < a.length; i++) if (fAlive[a[i]]) a[j++] = a[i]; a.length = j; return a; };
  const nbrs = (v, out) => { out.length = 0; for (const f of live(v)) for (let k = 0; k < 3; k++) { const w = F[f * 3 + k]; if (w !== v && !out.includes(w)) out.push(w); } return out; };
  const N1 = [], N2 = [];
  for (let v = 0; v < nv; v++) { nbrs(v, N1); for (const w of N1) if (w > v) push(v, w); }
  let faces = nf; const snaps = {}, order = targets.slice().sort((a, b) => b[1] - a[1]);
  const n0 = [0, 0, 0], n1 = [0, 0, 0];
  const snap = name => {
    const used = new Int32Array(nv).fill(-1), Pp = [], Ii = []; let k = 0;
    for (let f = 0; f < nf; f++) if (fAlive[f]) for (let j = 0; j < 3; j++) { const v = F[f * 3 + j]; if (used[v] < 0) { used[v] = k++; Pp.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); } Ii.push(used[v]); }
    snaps[name] = { P: new Float64Array(Pp), I: new Int32Array(Ii) };
  };
  let oi = 0; while (oi < order.length && faces <= order[oi][1]) snap(order[oi++][0]);
  while (oi < order.length && hn > 0) {
    const id = H[0]; H[0] = H[--hn]; if (hn > 0) down(0);
    const u = Eu[id], v = Ev[id];
    if (!alive[u] || !alive[v] || ver[u] !== Esu[id] || ver[v] !== Esv[id]) continue;
    nbrs(u, N1); nbrs(v, N2); let common = 0; for (const w of N1) if (N2.includes(w)) common++;
    if (common !== 2) continue;                                                         // ① 고리 조건
    const px = Ep[id * 3], py = Ep[id * 3 + 1], pz = Ep[id * 3 + 2]; let ok = true;
    for (const [s, o] of [[u, v], [v, u]]) {                                            // ② 뒤집힘 — 둘레 세모를 새 자리로 옮겨 본다
      for (const f of vf[s]) { if (!fAlive[f]) continue; const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2]; if (a === o || b === o || c === o) continue;
        const L0 = nrm(a, b, c, n0); const sx = P[s * 3], sy = P[s * 3 + 1], sz = P[s * 3 + 2]; P[s * 3] = px; P[s * 3 + 1] = py; P[s * 3 + 2] = pz;
        const L1 = nrm(a, b, c, n1); P[s * 3] = sx; P[s * 3 + 1] = sy; P[s * 3 + 2] = sz;
        if (L1 < 1e-12 || (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) / (L0 * L1 + 1e-30) < 0.2) { ok = false; break; } }
      if (!ok) break;
    }
    if (!ok) continue;
    /* 접기 — u 를 v 로 */
    P[v * 3] = px; P[v * 3 + 1] = py; P[v * 3 + 2] = pz; for (let k = 0; k < 10; k++) Q[v * 10 + k] += Q[u * 10 + k];
    for (const f of vf[u]) { if (!fAlive[f]) continue; const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
      if (a === v || b === v || c === v) { fAlive[f] = 0; faces--; continue; }
      for (let k = 0; k < 3; k++) if (F[f * 3 + k] === u) F[f * 3 + k] = v; vf[v].push(f); }
    alive[u] = 0; vf[u].length = 0; ver[v]++;
    nbrs(v, N2); for (const w of N2) push(v, w);
    while (oi < order.length && faces <= order[oi][1]) snap(order[oi++][0]);
  }
  while (oi < order.length) snap(order[oi++][0]);                                       // 더 못 접으면 거기서 뜬다
  return snaps;
}
function cavity(P, I) {
  const nv = P.length / 3, n = new Float64Array(nv * 3), s = new Float64Array(nv * 3), cnt = new Float64Array(nv);
  for (let t = 0; t < I.length; t += 3) { const a = I[t], b = I[t + 1], c = I[t + 2];
    const ax = P[b * 3] - P[a * 3], ay = P[b * 3 + 1] - P[a * 3 + 1], az = P[b * 3 + 2] - P[a * 3 + 2], bx = P[c * 3] - P[a * 3], by = P[c * 3 + 1] - P[a * 3 + 1], bz = P[c * 3 + 2] - P[a * 3 + 2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    for (const v of [a, b, c]) { n[v * 3] += fx; n[v * 3 + 1] += fy; n[v * 3 + 2] += fz; }
    for (const [i, j] of [[a, b], [b, c], [c, a]]) { for (let k = 0; k < 3; k++) { s[i * 3 + k] += P[j * 3 + k]; s[j * 3 + k] += P[i * 3 + k]; } cnt[i]++; cnt[j]++; } }
  const dl = new Float64Array(nv), dd = new Float64Array(nv);
  for (let v = 0; v < nv; v++) { const L = Math.hypot(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]) + 1e-12, c = Math.max(cnt[v], 1);
    const dx = s[v * 3] / c - P[v * 3], dy = s[v * 3 + 1] / c - P[v * 3 + 1], dz = s[v * 3 + 2] / c - P[v * 3 + 2];
    dl[v] = Math.hypot(dx, dy, dz); dd[v] = (dx * n[v * 3] + dy * n[v * 3 + 1] + dz * n[v * 3 + 2]) / L; }
  const med = Float64Array.from(dl).sort()[nv >> 1] + 1e-9, out = new Uint8Array(nv);
  for (let v = 0; v < nv; v++) out[v] = Math.round(Math.min(1, Math.max(0, 0.5 + 0.5 * dd[v] / (med * 2.5))) * 255);   // 1 = 오목(틈) · 0 = 볼록(모서리)
  return out;
}
function pack({ P, I }) {
  const nv = P.length / 3, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let v = 0; v < nv; v++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[v * 3 + k]); mx[k] = Math.max(mx[k], P[v * 3 + k]); }
  const q = new Uint16Array(nv * 3); for (let v = 0; v < nv; v++) for (let k = 0; k < 3; k++) q[v * 3 + k] = Math.round((P[v * 3 + k] - mn[k]) / Math.max(mx[k] - mn[k], 1e-9) * 65535);
  const i32 = nv >= 65536, idx = i32 ? Uint32Array.from(I) : Uint16Array.from(I), cav = cavity(P, I);
  const blob = Buffer.concat([Buffer.from(q.buffer), Buffer.from(cav), Buffer.alloc(nv % 2), Buffer.from(idx.buffer)]);
  return { nv, nt: I.length / 3, i32: +i32, mn: mn.map(x => +x.toFixed(5)), mx: mx.map(x => +x.toFixed(5)), b: blob.toString('base64') };
}
function holes({ I }) {                                                                 // 구멍 테두리(한 세모에만 붙은 모서리) · 꼬임(셋 넘게)
  const m = new Map(); for (let t = 0; t < I.length; t += 3) for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) { const k = a < b ? a * 4194304 + b : b * 4194304 + a; m.set(k, (m.get(k) || 0) + 1); }
  let one = 0, many = 0; for (const c of m.values()) { if (c === 1) one++; else if (c > 2) many++; } return [one, many];
}
const out = {};
for (const p of process.argv.slice(2)) {
  const name = path.basename(p).replace(/^Meshy_AI_|_\d{8}_generate\.stl$/g, '').toLowerCase(), t0 = Date.now();
  const M = loadSTL(p), U = ULTRA(name), T = [['near', 16000], ['far', 2500], ['tiny', 600]]; if (U) T.unshift(['ultra', U]);
  const S = decimate(M.P, M.I, T), w = [0, 1, 2].map(k => { let a = 1e9, b = -1e9; for (let v = 0; v < M.P.length / 3; v++) { a = Math.min(a, M.P[v * 3 + k]); b = Math.max(b, M.P[v * 3 + k]); } return +(b - a).toFixed(4); });
  out[name] = { w }; const rep = [];
  for (const [l] of T) { const s = S[l]; if (l === 'ultra' && s.P.length / 3 >= 65536) console.warn('  ultra 꼭짓점이 65,536 을 넘는다 — 32비트 번호'); out[name][l] = pack(s); const h = holes(s); rep.push(`${l} ${s.I.length / 3}(구멍 ${h[0]} · 꼬임 ${h[1]})`); }
  console.log(name, 'tris', M.I.length / 3, '→', rep.join(' · '), 'size', w, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
const js = '/* data-geo-meshes.js — tools/geo-mesh.mjs 가 Meshy STL 에서 만든다(읽지 말 것 · base64) — 37-geo-meshes.js 가 푼다 */\nconst GEO_MESH_DATA=' + JSON.stringify(out) + ';\n';
fs.writeFileSync('engine/js/data-geo-meshes.js', js); console.log('bytes', js.length);
