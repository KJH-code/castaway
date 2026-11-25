/* tools/player-mesh.mjs — 사람 모형(사용자 Meshy FBX) → engine/js/data-player-mesh.js(98-player-body.js 가 푼다)
   쓰는 법:  node tools/player-mesh.mjs [원본.fbx]        기본 meshes/player/Player1.fbx(레포 밖 — 작업 트리면 본 저장소에서 찾는다)
            node tools/player-mesh.mjs --debug            .ci-tmp/player-debug.json 도 쓴다(꼭지점 · 재질 · 뼈 자리를 눈으로 볼 때)
   ① 세운다 — Meshy 는 누운 채(머리 +z · 얼굴 −y)로 나온다 → 머리 +Y · 얼굴 −Z(게임의 앞)
   ② 키 1.80 m · 발바닥 0 · QEM 으로 14,000 세모(tools/qem.mjs)
   ③ 뼈 17 — 자리를 모양에서 잰다: 가랑이(다리가 갈라지는 높이) · 겨드랑이(팔이 몸통에서 떨어지는 높이) · 목(가장 가는 곳) ·
      팔 줄기(바깥 40% 의 주성분) · 손목(소맷부리 다음 가장 가는 곳) · 발목(발이 앞뒤로 길어지는 높이)
   ④ 재질 셋 — 바지(허리 밑 · 신발까지) · 셔츠(몸통 · 팔 · 깃) · 살갗(머리 · 목 · 손)
   ⑤ 무게 — 갈래(몸통 · 팔 · 다리)마다 후보 뼈만, 뼈 마디까지 거리 1/d⁴ 로 둘까지
   ⑥ 셔츠 결을 입힐 uv — 세모마다 상자 투영(법선의 큰 축) · 정점을 그 축으로 가른다 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readFBX } from './fbx.mjs';
import { decimate } from './qem.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), DEBUG = args.includes('--debug');
let MAIN = null; try { MAIN = path.resolve(execSync('git rev-parse --git-common-dir', { cwd: ROOT }).toString().trim(), '..'); } catch (e) { /* */ }
const want = args.find(a => !a.startsWith('--')) || 'meshes/player/Player1.fbx';
const src = [ROOT, MAIN].filter(Boolean).map(b => path.resolve(b, want)).find(p => fs.existsSync(p));
if (!src) { console.error('원본이 없다:', want); process.exit(1); }
const H = 1.80, TRIS = 14000;

/* ── ① ② 세우기 · 줄이기 ── */
const F0 = readFBX(src);
let P = new Float64Array(F0.P.length);
for (let i = 0; i < P.length; i += 3) { P[i] = -F0.P[i]; P[i + 1] = F0.P[i + 2]; P[i + 2] = F0.P[i + 1]; }   // (x,y,z) → (−x, z, y)
const bb = P => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); } return { mn, mx }; };
{ const b = bb(P), s = H / (b.mx[1] - b.mn[1]), cx = (b.mn[0] + b.mx[0]) / 2;
  for (let i = 0; i < P.length; i += 3) { P[i] = (P[i] - cx) * s; P[i + 1] = (P[i + 1] - b.mn[1]) * s; P[i + 2] *= s; } }
{ // 몸통 가운데를 z 0 에 — 허리 높이 띠의 가운데
  let s = 0, n = 0; for (let i = 0; i < P.length / 3; i++) { const y = P[i * 3 + 1]; if (y > 0.5 * H && y < 0.6 * H && Math.abs(P[i * 3]) < 0.15) { s += P[i * 3 + 2]; n++; } }
  const cz = n ? s / n : 0; for (let i = 0; i < P.length / 3; i++) P[i * 3 + 2] -= cz;
}
/* 재는 점 — 원본 겉에 넓이 비례로 30만 점(줄인 메시는 얇은 높이 띠를 재기엔 성기다) */
const NS = 300000, SP = new Float64Array(NS * 3);
{ const T = F0.I, nt0 = T.length / 3, A = new Float64Array(nt0 + 1);
  for (let t = 0; t < nt0; t++) { const a = T[t * 3] * 3, b = T[t * 3 + 1] * 3, c = T[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    A[t + 1] = A[t] + 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); }
  let r = 12345; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < NS; i++) { const x = rnd() * A[nt0]; let lo = 0, hi = nt0 - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m + 1] < x) lo = m + 1; else hi = m; }
    let u = rnd(), w = rnd(); if (u + w > 1) { u = 1 - u; w = 1 - w; } const a = T[lo * 3] * 3, b = T[lo * 3 + 1] * 3, c = T[lo * 3 + 2] * 3;
    for (let k = 0; k < 3; k++) SP[i * 3 + k] = P[a + k] + u * (P[b + k] - P[a + k]) + w * (P[c + k] - P[a + k]); } }
const SX = i => SP[i * 3], SY = i => SP[i * 3 + 1], SZ = i => SP[i * 3 + 2];
const D = decimate(P, F0.I, [['x', TRIS]]).x;
P = Float64Array.from(D.P); const I = Uint32Array.from(D.I), nv = P.length / 3, nt = I.length / 3;
const X = i => P[i * 3], Y = i => P[i * 3 + 1], Z = i => P[i * 3 + 2];

/* ── ③ 뼈 자리 ── */
/* 높이 띠마다 x 칸(1 cm)을 칠해 덩이(3 cm 넘게 비면 끊긴다)를 찾는다 */
function blocksAt(y0, y1) {
  const occ = new Set();
  for (let i = 0; i < NS; i++) { const y = SY(i); if (y < y0 || y >= y1) continue; occ.add(Math.round(SX(i) * 100)); }
  const cs = [...occ].sort((a, b) => a - b), out = [];
  for (const c of cs) { const l = out[out.length - 1]; if (l && c - l[1] <= 3) l[1] = c; else out.push([c, c]); }
  return out.map(([a, b]) => [a / 100, b / 100]);
}
const step = 0.01, midOf = B => B.find(([a, b]) => a <= 0.005 && b >= -0.005);
// 가랑이 — 아래에서 올라가며 x 0 을 덮는 넓은 덩이가 처음 생기는 높이
let crotchY = 0.45 * H;
for (let y = 0.25 * H; y < 0.6 * H; y += step) { const m = midOf(blocksAt(y, y + step)); if (m && m[1] - m[0] > 0.12) { crotchY = y; break; } }
// 겨드랑이 — 위에서 내려오며 넓은 가운데 덩이 바깥에 덩이(팔)가 처음 생기는 높이
let armpitY = 0.68 * H, chestHalf = 0.16;
for (let y = 0.82 * H; y > crotchY + 0.1; y -= step) {
  const B = blocksAt(y, y + step), m = midOf(B);
  if (m && m[1] - m[0] > 0.16 && B.some(([a, b]) => a > m[1]) && B.some(([a, b]) => b < m[0])) { armpitY = y; chestHalf = Math.max(-m[0], m[1]); break; }
}
// 목 — 겨드랑이 위 가운데 덩이가 가장 좁은 높이
let neckY = armpitY + 0.1 * H, neckW = 1e9;
for (let y = armpitY + 0.03 * H; y < 0.92 * H; y += step) {
  const m = midOf(blocksAt(y, y + step)); if (!m) continue; const w = m[1] - m[0]; if (w < neckW) { neckW = w; neckY = y; }
}
// 팔 — 어깨는 겨드랑이와 목 사이(가슴 반폭 0.75) · 손끝은 어깨에서 가장 먼 점 · 팔꿈치 · 손목은 팔의 가운데 줄(마디마다 점들의 가운데)
const zAt = y => { let s = 0, n = 0; for (let i = 0; i < NS; i++) if (Math.abs(SY(i) - y) < 0.02 && Math.abs(SX(i)) < 0.08) { s += SZ(i); n++; } return n ? s / n : 0; };
/* 몸통 덩이의 가장자리(높이 칸마다 · 양쪽) — 겨드랑이 밑에선 이 바깥만 팔이다(셔츠 밑단이 퍼져 팔로 잡히지 않게) */
const EDGE = new Map();
const edgeAt = (y, side) => { const k = Math.floor(y / step); if (!EDGE.has(k)) { const m = midOf(blocksAt(k * step, (k + 1) * step)); EDGE.set(k, m ? [m[1] + 0.01, -m[0] + 0.01] : [0.4, 0.4]); }          // 가랑이 밑(가운데 덩이 없음)은 팔이 아니다
  return EDGE.get(k)[side > 0 ? 0 : 1]; };
function armAxis(side) {
  const sh = [side * chestHalf * 0.75, armpitY + 0.45 * (neckY - armpitY), zAt(armpitY)];
  const reg = []; for (let i = 0; i < NS; i++) { const y = SY(i); if (y <= crotchY + 0.15) continue;
    const e = y < armpitY ? edgeAt(y, side) : chestHalf * 0.95; if (SX(i) * side > e) reg.push(i); }
  let tip = sh, dm = 0;
  for (const i of reg) { const d = Math.hypot(SX(i) - sh[0], SY(i) - sh[1], SZ(i) - sh[2]); if (d > dm) { dm = d; tip = [SX(i), SY(i), SZ(i)]; } }
  const v = tip.map((t, k) => (t - sh[k]) / dm), tMax = dm, NB = 60;
  const cen = Array.from({ length: NB }, () => [0, 0, 0, 0]), prof = new Array(NB).fill(0), tof = [];
  for (const i of reg) { const d = [SX(i) - sh[0], SY(i) - sh[1], SZ(i) - sh[2]], t = d[0] * v[0] + d[1] * v[1] + d[2] * v[2], b = Math.floor(t / tMax * NB);
    if (b < 0 || b >= NB) continue; tof.push([i, b]); cen[b][0] += SX(i); cen[b][1] += SY(i); cen[b][2] += SZ(i); cen[b][3]++; }
  for (const c of cen) if (c[3]) for (let k = 0; k < 3; k++) c[k] /= c[3];
  for (const [i, b] of tof) { const c = cen[b], d = [SX(i) - c[0], SY(i) - c[1], SZ(i) - c[2]], t = d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
    const r = Math.hypot(d[0] - v[0] * t, d[1] - v[1] * t, d[2] - v[2] * t); if (r > prof[b]) prof[b] = r; }
  // 손목 — 0.55~0.88 에서 소맷부리(가장 굵은 곳) 다음 가장 가는 곳
  let cuff = 33; for (let b = 33; b < 53; b++) if (prof[b] > prof[cuff]) cuff = b;
  let wrist = Math.min(58, cuff + 1); for (let b = cuff + 1; b < 56; b++) if (prof[b] < prof[wrist]) wrist = b;
  const cAt = b => { for (let d = 0; d < 6; d++) for (const bb of [b - d, b + d]) if (cen[bb] && cen[bb][3] > 20) return cen[bb].slice(0, 3); return sh.map((s, k) => s + v[k] * (b + 0.5) / NB * tMax); };
  const tw = (wrist + 0.5) / NB * tMax;
  if (process.env.ARMDBG) console.log(side, "tip", tip.map(x => x.toFixed(2)), "cuff", cuff, "wrist", wrist, cen.map((c, b) => b + ":" + c.slice(0, 3).map(x => x.toFixed(2)).join(",") + "/" + c[3]).filter((_, b) => b % 4 === 0).join(" "));
  return { dir: v, shoulder: sh, elbow: cAt(Math.round(wrist * 0.5)), wrist: cAt(wrist), tip, tWrist: tw, tMax, prof };
}
const armR = armAxis(1), armL = armAxis(-1);                 // 얼굴이 −Z 라 몸의 오른쪽이 +X 다
// 다리 — 갈래마다 그 높이의 가운데
function legAt(side, y, h = 0.02) {
  let sx = 0, sz = 0, n = 0;
  for (let i = 0; i < NS; i++) if (SX(i) * side > 0 && Math.abs(SY(i) - y) < h && Math.abs(SX(i)) < chestHalf * 1.3) { sx += SX(i); sz += SZ(i); n++; }
  return n ? [sx / n, y, sz / n] : [side * 0.1, y, 0];
}
// 발목 — 아래에서 올라가며 앞뒤 길이가 정강이 굵기의 1.5배 밑으로 줄어드는 높이
let ankleY = 0.07 * H;
{ const zl = y => { let a = 1e9, b = -1e9; for (let i = 0; i < NS; i++) if (SX(i) > 0 && Math.abs(SY(i) - y) < 0.01 && Math.abs(SX(i)) < chestHalf * 1.3) { a = Math.min(a, SZ(i)); b = Math.max(b, SZ(i)); } return b - a; };
  const legW = zl(0.25 * H); for (let y = 0.02; y < 0.2 * H; y += step) if (zl(y) < legW * 1.5) { ankleY = y; break; } }
ankleY = Math.max(0.05 * H, Math.min(0.12 * H, ankleY));
// 셔츠 밑단 — 가랑이 위로 올라가며 가운데 덩이가 앞 칸보다 4 cm 넘게 넓어지는 높이(셔츠가 바지 위로 퍼진다)
let hemY = crotchY + 0.07 * H;
{ let w0 = null; for (let y = crotchY + 0.03; y < armpitY - 0.1; y += step) { const m = midOf(blocksAt(y, y + step)); if (!m) continue; const w = m[1] - m[0];
    if (w0 !== null && w - w0 > 0.04) { hemY = y; break; } w0 = w0 === null ? w : Math.min(w0, w); } }
const hipY = crotchY + 0.04 * H, kneeY = ankleY + (hipY - ankleY) * 0.48;
const joints = {};
joints.hips = [0, hipY, 0];
joints.spine = [0, hipY + (armpitY - hipY) * 0.35, 0];
joints.chest = [0, hipY + (armpitY - hipY) * 0.78, 0];
joints.neck = [0, neckY - 0.01 * H, 0];
joints.head = [0, neckY + 0.035 * H, 0];
for (const [s, a, n] of [[1, armR, 'R'], [-1, armL, 'L']]) {
  joints['upperArm' + n] = a.shoulder; joints['foreArm' + n] = a.elbow; joints['hand' + n] = a.wrist;
  const hp = legAt(s, crotchY - 0.03 * H); joints['thigh' + n] = [hp[0], hipY, hp[2]];
  joints['shin' + n] = legAt(s, kneeY); joints['foot' + n] = legAt(s, ankleY + 0.02, 0.015);
}
// 몸통 뼈의 z 는 그 높이 가운데 띠의 가운데
for (const k of ['neck', 'head', 'chest', 'spine', 'hips']) { let s = 0, n = 0; for (let i = 0; i < NS; i++) if (Math.abs(SY(i) - joints[k][1]) < 0.02 && Math.abs(SX(i)) < 0.06) { s += SZ(i); n++; } if (n) joints[k][2] = s / n; }
const BONES = [['hips', null], ['spine', 'hips'], ['chest', 'spine'], ['neck', 'chest'], ['head', 'neck'],
  ['upperArmL', 'chest'], ['foreArmL', 'upperArmL'], ['handL', 'foreArmL'], ['upperArmR', 'chest'], ['foreArmR', 'upperArmR'], ['handR', 'foreArmR'],
  ['thighL', 'hips'], ['shinL', 'thighL'], ['footL', 'shinL'], ['thighR', 'hips'], ['shinR', 'thighR'], ['footR', 'shinR']];
const BI = Object.fromEntries(BONES.map(([n], i) => [n, i]));
// 마디(무게를 잴 선분) — 뼈 머리 → 끝
const topY = H, toe = s => { const f = joints['foot' + s]; return [f[0], 0.03, f[2] - 0.16]; };
const SEG = {
  hips: [joints.hips, joints.spine], spine: [joints.spine, joints.chest], chest: [joints.chest, joints.neck], neck: [joints.neck, joints.head], head: [joints.head, [0, topY, joints.head[2]]],
  upperArmL: [armL.shoulder, armL.elbow], foreArmL: [armL.elbow, armL.wrist], handL: [armL.wrist, armL.tip],
  upperArmR: [armR.shoulder, armR.elbow], foreArmR: [armR.elbow, armR.wrist], handR: [armR.wrist, armR.tip],
  thighL: [joints.thighL, joints.shinL], shinL: [joints.shinL, joints.footL], footL: [joints.footL, toe('L')],
  thighR: [joints.thighR, joints.shinR], shinR: [joints.shinR, joints.footR], footR: [joints.footR, toe('R')],
};
const segD = (p, [a, b]) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = L > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L)) : 0; return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); };
const armT = (p, a) => (p[0] - a.shoulder[0]) * a.dir[0] + (p[1] - a.shoulder[1]) * a.dir[1] + (p[2] - a.shoulder[2]) * a.dir[2];

/* 갈래 — 0 몸통 · 1 오른팔(+X) · 2 왼팔 · 3 오른다리 · 4 왼다리 */
function part(p) {
  const s = p[0] >= 0 ? 1 : -1, a = s > 0 ? armR : armL;
  if (p[1] > crotchY + 0.15 && p[0] * s > (p[1] < armpitY ? edgeAt(p[1], s) - 0.01 : chestHalf * 0.92) && armT(p, a) > 0) return s > 0 ? 1 : 2;
  if (p[1] < crotchY + 0.01) return s > 0 ? 3 : 4;
  return 0;
}
/* ④ 재질 — 0 바지 · 1 셔츠 · 2 살갗. 허리선(셔츠 밑단)은 가랑이 위 0.07H */
function matOf(p) {
  const g = part(p);
  if (g === 1 || g === 2) { const a = g === 1 ? armR : armL; return armT(p, a) > a.tWrist ? 2 : 1; }
  if (p[1] < hemY) return 0;
  if (p[1] > neckY) return 2;                                                  // 목 위는 다 살갗(머리 · 얼굴)
  if (p[1] > neckY - 0.07) {                                                   // 목 둘레 — 목 줄기 가까이는 살갗, 멀면 깃(셔츠)
    const r = Math.hypot(p[0], p[2] - joints.neck[2]); return r > neckW * 0.5 * 1.2 ? 1 : 2; }
  return 1;
}
/* ⑤ 무게 */
const CAND = [['hips', 'spine', 'chest', 'neck', 'head', 'upperArmR', 'upperArmL'], ['chest', 'upperArmR', 'foreArmR', 'handR'], ['chest', 'upperArmL', 'foreArmL', 'handL'],
  ['hips', 'thighR', 'shinR', 'footR'], ['hips', 'thighL', 'shinL', 'footL']];
const SW = new Uint8Array(nv * 4), SI = new Uint8Array(nv * 4);
for (let i = 0; i < nv; i++) {
  const p = [X(i), Y(i), Z(i)], g = part(p);
  let cand = CAND[g];
  if (g === 0 && (p[1] < armpitY - 0.04 * H || Math.abs(p[0]) < chestHalf * 0.55)) cand = cand.slice(0, 5);   // 어깨 둘레만 위팔을 따른다
  const w = cand.map(n => [n, 1 / (segD(p, SEG[n]) ** 4 + 1e-7)]).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const sum = w[0][1] + w[1][1]; let w0 = Math.round(w[0][1] / sum * 255);
  SI[i * 4] = BI[w[0][0]]; SI[i * 4 + 1] = BI[w[1][0]]; SW[i * 4] = w0; SW[i * 4 + 1] = 255 - w0;
}
/* 세모마다 재질(가운데 점으로) · 상자 투영 축 · 정점 가르기 */
const fm = new Uint8Array(nt), fa = new Uint8Array(nt), FN = [];
for (let f = 0; f < nt; f++) {
  const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
  fm[f] = matOf([(X(a) + X(b) + X(c)) / 3, (Y(a) + Y(b) + Y(c)) / 3, (Z(a) + Z(b) + Z(c)) / 3]);
  const ux = X(b) - X(a), uy = Y(b) - Y(a), uz = Z(b) - Z(a), vx = X(c) - X(a), vy = Y(c) - Y(a), vz = Z(c) - Z(a);
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], L = Math.hypot(...n) || 1; FN.push(n.map(x => x / L), L / 2);
  const an = n.map(Math.abs); fa[f] = an[0] >= an[1] && an[0] >= an[2] ? 0 : an[1] >= an[2] ? 1 : 2;
}
// 정점 법선(부드럽게 — 같은 재질 · 같은 축 안에서는 나눠 쓴다)
const vn = new Float64Array(nv * 3);
for (let f = 0; f < nt; f++) for (let k = 0; k < 3; k++) { const v = I[f * 3 + k], n = FN[f * 2], A = FN[f * 2 + 1]; for (let j = 0; j < 3; j++) vn[v * 3 + j] += n[j] * A; }
const key = new Map(), OP = [], ON = [], OUV = [], OSI = [], OSW = [], byMat = [[], [], []];
for (let f = 0; f < nt; f++) {
  const tri = [];
  for (let k = 0; k < 3; k++) {
    const v = I[f * 3 + k], kk = v * 8 + fm[f] * 3 + (fm[f] === 1 ? fa[f] : 0);   // 셔츠만 축으로 가른다(결은 셔츠에만 입힌다)
    let o = key.get(kk);
    if (o === undefined) {
      o = OP.length / 3; key.set(kk, o);
      OP.push(X(v), Y(v), Z(v));
      const L = Math.hypot(vn[v * 3], vn[v * 3 + 1], vn[v * 3 + 2]) || 1; ON.push(vn[v * 3] / L, vn[v * 3 + 1] / L, vn[v * 3 + 2] / L);
      const ax = fa[f], u = ax === 0 ? Z(v) : X(v), w = ax === 1 ? Z(v) : Y(v); OUV.push(u, w);
      for (let j = 0; j < 4; j++) { OSI.push(SI[v * 4 + j]); OSW.push(SW[v * 4 + j]); }
    }
    tri.push(o);
  }
  byMat[fm[f]].push(...tri);
}
const onv = OP.length / 3, idx = [].concat(...byMat), groups = []; let st = 0;
for (let m = 0; m < 3; m++) { groups.push([st, byMat[m].length, m]); st += byMat[m].length; }
/* 담기 — 자리 u16×3 · 법선 i8×3(4 맞춤) · uv u16×2(−2..2 m) · 뼈 u8×4 · 무게 u8×4 · 번호 u16|u32 */
const mn = [0, 1, 2].map(k => Math.min(...OP.filter((_, i) => i % 3 === k))), mx = [0, 1, 2].map(k => Math.max(...OP.filter((_, i) => i % 3 === k)));
const i32 = onv > 65535, pb = (onv * 6 + 3) & ~3, nb = (onv * 3 + 3) & ~3, ub = onv * 4, sb = onv * 4;
const buf = Buffer.alloc(pb + nb + ub + sb * 2 + idx.length * (i32 ? 4 : 2));
for (let i = 0; i < onv; i++) {
  for (let k = 0; k < 3; k++) { buf.writeUInt16LE(Math.round((OP[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535), (i * 3 + k) * 2); buf.writeInt8(Math.round(ON[i * 3 + k] * 127), pb + i * 3 + k); }
  for (let k = 0; k < 2; k++) buf.writeUInt16LE(Math.max(0, Math.min(65535, Math.round((OUV[i * 2 + k] + 2) / 4 * 65535))), pb + nb + (i * 2 + k) * 2);
  for (let k = 0; k < 4; k++) { buf[pb + nb + ub + i * 4 + k] = OSI[i * 4 + k]; buf[pb + nb + ub + sb + i * 4 + k] = OSW[i * 4 + k]; }
}
idx.forEach((v, j) => i32 ? buf.writeUInt32LE(v, pb + nb + ub + sb * 2 + j * 4) : buf.writeUInt16LE(v, pb + nb + ub + sb * 2 + j * 2));
const r5 = a => a.map(v => +(+v).toFixed(4));
const OUT = {
  src: path.basename(src), H, nv: onv, nt: idx.length / 3, i32: i32 ? 1 : 0, mn: r5(mn), mx: r5(mx), groups,
  bones: BONES.map(([n, p]) => [n, p, r5(n === 'upperArmL' ? armL.shoulder : n === 'upperArmR' ? armR.shoulder : joints[n])]),
  armDir: { L: r5(armL.dir), R: r5(armR.dir) }, hand: { L: r5(armL.tip), R: r5(armR.tip) }, toe: { L: r5(toe('L')), R: r5(toe('R')) },
  info: { crotchY: +crotchY.toFixed(3), armpitY: +armpitY.toFixed(3), neckY: +neckY.toFixed(3), hemY: +hemY.toFixed(3), ankleY: +ankleY.toFixed(3), chestHalf: +chestHalf.toFixed(3) },
  b: buf.toString('base64'),
};
const head = `/* data-player-mesh.js — CASTAWAY · 자료(base64) — 읽지 말 것
   사용자 사람 모형(meshes/player/Player1.fbx — 레포 밖) → tools/player-mesh.mjs(세우기 · QEM · 뼈 17 · 바지/셔츠/살갗 · 무게) — 98-player-body.js 가 푼다 */
const PLAYER_MESH=`;
fs.writeFileSync(path.join(ROOT, 'engine/js/data-player-mesh.js'), head + JSON.stringify(OUT) + ';\n');
const cnt = [0, 1, 2].map(m => byMat[m].length / 3);
console.log(`${path.basename(src)} · 세모 ${F0.I.length / 3} → ${idx.length / 3} · 정점 ${onv} · 바지/셔츠/살갗 ${cnt.join('/')}`);
console.log('높이', OUT.info, '팔 방향 L', OUT.armDir.L, '손목 t', armL.tWrist.toFixed(3), '/', armL.tMax.toFixed(3));
console.log('뼈', OUT.bones.map(([n, , p]) => n + ' ' + p.join(',')).join(' | '));
console.log(`→ engine/js/data-player-mesh.js · ${(fs.statSync(path.join(ROOT, 'engine/js/data-player-mesh.js')).size / 1024).toFixed(0)} KB`);
if (DEBUG) fs.writeFileSync(path.join(ROOT, '.ci-tmp/player-debug.json'), JSON.stringify({ P: OP.map(v => +v.toFixed(4)), I: idx, groups, bones: OUT.bones, SI: OSI, SW: OSW, prof: armL.prof }));
