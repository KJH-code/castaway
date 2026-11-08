/* tools/qem.mjs — QEM 모서리 접기(Garland–Heckbert) — geo-mesh.mjs(큰 지형 모형) · animals/stl2mesh.mjs(짐승) 가 같이 쓴다
   decimate(P, I, [[이름, 세모 수], …]) → {이름: {P, I}} — 구멍이 안 생기게 접는다(고리 조건 · 뒤집힘) */
/* ── QEM ── */
export function decimate(P0, I0, targets) {
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

/* 이진 STL → 붙은 꼭짓점(P Float64 · I Int32) — 축은 그대로 */
import fs from 'fs';
export function readSTL(p) {
  const b = fs.readFileSync(p), n = b.readUInt32LE(80), map = new Map(), P = [], I = new Int32Array(n * 3);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const o = 84 + t * 50 + 12 + k * 12, x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8);
    const key = x + ',' + y + ',' + z; let id = map.get(key);
    if (id === undefined) { id = P.length / 3; map.set(key, id); P.push(x, y, z); }
    I[t * 3 + k] = id;
  }
  return { P: new Float64Array(P), I };
}
