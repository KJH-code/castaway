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
import { decimate } from './qem.mjs';

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
