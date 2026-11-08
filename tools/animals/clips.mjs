/* tools/animals/clips.mjs — 짐승 몸짓 표(미리 짜 둔 마디 각) → engine/js/data-animal-clips.js
   쓰는 법: node tools/animals/clips.mjs
   · 뼈마다 쉼 자세 회전이 0 이다(tools/animals/rig.py — 다리는 곧게 · 고개는 앞으로) — 여기 각은 그 자세에서 마디가 도는 오일러각(XYZ · 라디안).
     x 양수 = 앞을 보던 끝이 아래로(다리면 발이 뒤로) · y 양수 = 왼쪽(+x)으로 · z 양수 = 왼쪽이 아래로.
   · 근거(조사 2026-11-08):
     - 네발 걸음: 같은 쪽 뒷발 → 앞발 25% 뒤에 딛는 옆 순서 걸음 · 발이 땅에 있는 몫 0.65(흰꼬리사슴 0.69 · 들소 0.71 — Usherwood & Self, eLife 2017 의 표) ·
       빠르면 대각 짝 빠른걸음(50%) · 더 빠르면 비대칭 달리기 — 소 · 양 · 멧돼지는 가로(transverse) · 사슴은 돌림(rotary) 습보.
       풀을 뜯을 때는 거의 늘 네 발이 땅에(몫 1 에 가깝다).
     - 토끼: 반쯤 뜀(half-bound) — 뒷발 둘은 거의 함께, 앞발은 조금 엇갈려 딛는다(잭토끼 · 우는토끼).
     - 도마뱀: 퍼진 다리 대각 짝 걸음 · 등뼈는 서 있는 물결(마디가 어깨 · 골반에 하나씩 — Reilly & Delancey 1997 Sceloporus) · 빠르면 꼬리로 물결이 흐른다.
     - 상어: 몸 물결의 길이 ≈ 몸길이 · 꼬리 흔들림 위아래 폭 ≈ 몸길이의 0.2 · 진폭은 머리에서 꼬리로 제곱으로 커진다 · 빨라지면 진폭보다 빠르기가 는다.
     - 꿩: 놀라면 거의 곧게 머리 높이까지 솟아 짧게(8초 안) 세게 치고 날개를 굳혀 미끄러진다 · 오를 수 있는 기울기는 30° 남짓.
     - 개구리: 뒷다리를 한꺼번에 펴서 뛴다(차기) · 앞다리로 내려앉는다.
   · 같은 동작도 마리마다 · 걸음마다 다르게 — 표는 바탕만 주고 흔들기는 게임이 한다(97-animals.js aniClip — 폭 · 빠르기 · 좌우 어긋남 · 고개 · 꼬리 · 귀의 느린 떨림). */
import fs from 'fs';
const N = 16, TAU = Math.PI * 2;
const r2 = v => Math.round(v * 1000) / 1000;
const sm = t => t * t * (3 - 2 * t);
const wrap = t => ((t % 1) + 1) % 1;
/* 한 다리의 걸음 — φ: 디딘 때가 0 · β: 땅에 있는 몫 · 디딘 동안 발이 앞(-A)에서 뒤(+A)로 · 든 동안 앞으로 돌아오며 무릎을 접는다 */
function leg(phi, beta, A) {
  const p = wrap(phi);
  if (p < beta) { const u = p / beta; return { up: -A + 2 * A * u, lift: 0 }; }
  const u = (p - beta) / (1 - beta); return { up: A - 2 * A * sm(u), lift: Math.sin(Math.PI * u) };
}
function clip(name, dur, loop, fn, n = N) {
  const ch = {};
  for (let i = 0; i < n; i++) {
    const out = fn(i / n);
    for (const [b, v] of Object.entries(out)) {
      const c = ch[b] || (ch[b] = { x: [], y: [], z: [] });
      c.x[i] = r2(v[0] || 0); c.y[i] = r2(v[1] || 0); c.z[i] = r2(v[2] || 0);
    }
  }
  for (const c of Object.values(ch)) for (const k of ['x', 'y', 'z']) if (c[k].every(v => Math.abs(v) < 1e-3)) delete c[k];
  return [name, { d: dur, l: loop ? 1 : 0, n, ch }];
}
const L4 = ['fL', 'fR', 'hL', 'hR'];
const bn = (k, s) => (k[0] === 'f' ? 'f' : 'h') + s + k[1];
/* ── 네발(소 · 사슴 · 멧돼지 · 양) ───────────────────────────────────── */
function quadGait(ph, beta, A, opt = {}) {
  return t => {
    const o = {};
    for (const k of L4) {
      const g = leg(t - ph[k], beta, A * (k[0] === 'f' ? 1 : 0.9)), fr = k[0] === 'f';
      o[bn(k, 'Up')] = [g.up - (fr ? 0 : 0.12 * g.lift), 0, 0];
      o[bn(k, 'Low')] = [(fr ? 1.05 : -0.85) * g.lift * (opt.knee || 1), 0, 0];
      o[bn(k, 'Foot')] = [(fr ? -0.45 : 0.5) * g.lift, 0, 0];
    }
    const b = opt.bob || 0.01, sp = opt.spine || 0;
    o.root = [opt.pitch ? opt.pitch * Math.sin(TAU * t + 0.6) : 0, -b * Math.cos(TAU * t * (opt.bounce ? 1 : 2)) * (opt.bounce ? 3 : 1), 0];
    o.spine = [sp * Math.sin(TAU * t), 0, (opt.roll || 0.02) * Math.sin(TAU * t)];
    o.pelvis = [-sp * 0.6 * Math.sin(TAU * t + 0.4), 0, -(opt.roll || 0.02) * Math.sin(TAU * t)];
    o.neck = [(opt.nod || 0.05) * Math.sin(TAU * t * 2 + 1.2) + (opt.neck || 0), 0, 0];
    o.head = [-(opt.nod || 0.05) * 0.6 * Math.sin(TAU * t * 2 + 1.2) + (opt.headx || 0), 0, 0];
    o.tail = [0.15 + (opt.tail || 0), 0.18 * Math.sin(TAU * t), 0];
    return o;
  };
}
const QUAD = Object.fromEntries([
  clip('walk', 1.25, 1, quadGait({ hL: 0, fL: 0.25, hR: 0.5, fR: 0.75 }, 0.65, 0.30)),
  clip('trot', 0.62, 1, quadGait({ hL: 0, fR: 0.02, hR: 0.5, fL: 0.52 }, 0.42, 0.42, { bob: 0.018, nod: 0.03, roll: 0.03 })),
  clip('gallop', 0.44, 1, quadGait({ hL: 0, hR: 0.1, fL: 0.5, fR: 0.6 }, 0.30, 0.62, { bob: 0.03, spine: 0.14, pitch: 0.06, nod: 0.12, neck: -0.12, tail: 0.3, bounce: 1, knee: 1.25 })),
  clip('rotary', 0.40, 1, quadGait({ hL: 0, hR: 0.1, fR: 0.5, fL: 0.6 }, 0.28, 0.68, { bob: 0.035, spine: 0.18, pitch: 0.08, nod: 0.14, neck: -0.15, tail: 0.5, bounce: 1, knee: 1.35 })),
  clip('stot', 0.55, 1, t => {                      // 네 발이 함께 — 뻣뻣하게 튀어 오른다(사슴이 놀랐을 때)
    const o = {}, air = Math.max(0, Math.sin(TAU * t)), k = Math.max(0, -Math.sin(TAU * t));
    for (const k4 of L4) { o[bn(k4, 'Up')] = [0.05 * Math.sin(TAU * t), 0, 0]; o[bn(k4, 'Low')] = [(k4[0] === 'f' ? 0.35 : -0.3) * k, 0, 0]; }
    o.root = [0, 0.32 * air, 0]; o.neck = [-0.25, 0, 0]; o.tail = [-0.6, 0, 0]; return o; }),
  clip('graze', 3.2, 1, t => {                      // 고개를 숙여 뜯는다 · 우물거림 · 걸음 하나 옮기기
    const ch = Math.max(0, Math.sin(TAU * t * 6)) ** 2;
    const step = t > 0.55 && t < 0.75 ? Math.sin(Math.PI * (t - 0.55) / 0.2) : 0;
    return { neck: [0.95 + 0.04 * Math.sin(TAU * t), 0.12 * Math.sin(TAU * t * 0.5), 0], head: [0.32 + 0.06 * ch, 0.05 * Math.sin(TAU * t * 3), 0],
      fUpL: [-0.18 * step, 0, 0], fLowL: [0.55 * step, 0, 0], tail: [0.12, 0.25 * Math.sin(TAU * t * 2), 0], earL: [0, 0, -0.2], earR: [0, 0, 0.2], root: [0, -0.01, 0] }; }),
  clip('alert', 2.0, 1, t => ({ neck: [-0.28, 0.06 * Math.sin(TAU * t), 0], head: [-0.08, 0, 0], earL: [-0.3, 0.2, 0.25], earR: [-0.3, -0.2, -0.25],
      tail: [-0.15, 0, 0], spine: [-0.02, 0, 0], root: [0, 0.004 * Math.sin(TAU * t * 2), 0] })),
  clip('lie', 4.0, 1, t => ({ fUpL: [-0.35, 0, 0], fLowL: [2.5, 0, 0], fFootL: [0.3, 0, 0], fUpR: [-0.3, 0, 0], fLowR: [2.45, 0, 0], fFootR: [0.3, 0, 0],
      hUpL: [-1.15, 0, 0.25], hLowL: [-1.9, 0, 0], hFootL: [1.2, 0, 0], hUpR: [-1.1, 0, -0.25], hLowR: [-1.9, 0, 0], hFootR: [1.2, 0, 0],
      neck: [0.15, 0.25 * Math.sin(TAU * t * 0.5), 0], head: [0.05 + 0.04 * Math.max(0, Math.sin(TAU * t * 8)), 0, 0], tail: [0.4, 0, 0], root: [0, -0.52, 0], spine: [0, 0, 0.04] })),
  clip('shake', 0.7, 0, t => { const e = Math.sin(Math.PI * t); return { neck: [-0.1 * e, 0.55 * e * Math.sin(TAU * t * 3), 0], head: [0, 0.4 * e * Math.sin(TAU * t * 3 - 0.6), 0.3 * e * Math.sin(TAU * t * 3)],
      earL: [0, 0, 0.6 * e * Math.sin(TAU * t * 6)], earR: [0, 0, -0.6 * e * Math.sin(TAU * t * 6)] }; }),
  clip('root', 1.4, 1, t => ({ neck: [0.85, 0.15 * Math.sin(TAU * t), 0], head: [0.45 + 0.22 * Math.max(0, Math.sin(TAU * t * 3)), 0.12 * Math.sin(TAU * t * 1.5), 0],
      fUpL: [-0.08 * Math.max(0, Math.sin(TAU * t)), 0, 0], tail: [0.1, 0.4 * Math.sin(TAU * t * 2), 0], root: [0.04, -0.015, 0] })),       // 멧돼지가 주둥이로 땅을 판다
  clip('roar', 2.4, 0, t => { const e = sm(Math.min(1, t * 4)) * sm(Math.min(1, (1 - t) * 4)); return { neck: [-0.55 * e, 0, 0], head: [-0.65 * e, 0, 0], tail: [-0.3 * e, 0, 0], spine: [-0.05 * e, 0, 0] }; }),
  clip('charge', 0.42, 1, quadGait({ hL: 0, hR: 0.08, fL: 0.5, fR: 0.58 }, 0.30, 0.66, { bob: 0.03, spine: 0.14, pitch: 0.05, nod: 0.05, neck: 0.35, headx: 0.25, tail: 0.6, bounce: 1, knee: 1.2 })),
]);
/* ── 토끼(앉은 꼴이 쉼 자세) ──────────────────────────────────────── */
function halfBound(dur, A) {
  return t => {
    const o = {};
    // 0~0.22 뒷발로 찬다(뒷다리를 쫙 편다) · 0.22~0.5 공중 · 0.5~0.68 앞발이 엇갈려 딛는다 · 0.68~1 뒷발이 앞발 앞까지 와서 딛는다
    const push = t < 0.22 ? Math.sin(Math.PI * t / 0.22) : 0, ext = t < 0.5 ? sm(Math.min(1, t / 0.22)) * (1 - sm(Math.max(0, (t - 0.3) / 0.2))) : 0;
    const tuck = t > 0.6 ? Math.sin(Math.PI * (t - 0.6) / 0.4) : 0;
    for (const s of ['L', 'R']) {
      const d = s === 'L' ? 0 : 0.03;
      o['hUp' + s] = [1.0 * ext * A - 0.5 * tuck, 0, 0]; o['hLow' + s] = [1.3 * ext * A, 0, 0]; o['hFoot' + s] = [-0.9 * ext * A + 0.2 * tuck, 0, 0];
      const f = leg(t - 0.5 - (s === 'L' ? 0 : 0.08), 0.18, 0.7 * A); o['fUp' + s] = [f.up - 0.5 * ext, 0, 0]; o['fLow' + s] = [0.9 * f.lift, 0, 0];
      void d;
    }
    // 앉은 꼴이 쉼 자세라 몸을 펴면 코가 내려간다(+) · 뒷발이 받침점(97-animals.js ANI_PIV)
    o.root = [0.38 * ext * A - 0.12 * tuck, 0.18 * A * Math.sin(Math.PI * Math.min(1, t / 0.6)), 0];
    o.spine = [0.15 * ext - 0.1 * tuck, 0, 0]; o.pelvis = [-0.25 * ext + 0.2 * tuck, 0, 0];
    o.neck = [0.35 * ext * A, 0, 0]; o.earL = [0.6 * A, 0, 0]; o.earR = [0.6 * A, 0, 0];
    return o;
  };
}
const HARE = Object.fromEntries([
  clip('hop', 0.55, 1, halfBound(0.55, 0.55)),
  clip('run', 0.30, 1, halfBound(0.3, 1.0)),
  clip('sit', 3.0, 1, t => ({ head: [0.06 * Math.max(0, Math.sin(TAU * t * 9)), 0.1 * Math.sin(TAU * t), 0], neck: [0.05, 0, 0],
      earL: [0.1 * Math.sin(TAU * t * 0.5), 0, 0.08], earR: [0.1 * Math.sin(TAU * t * 0.5 + 1), 0, -0.08], root: [0, 0.003 * Math.sin(TAU * t * 2), 0] })),
  clip('upright', 2.5, 1, t => ({ root: [-0.32, 0.02, 0], pelvis: [-0.1, 0, 0], spine: [-0.25, 0, 0], neck: [0.45, 0.15 * Math.sin(TAU * t), 0], head: [0.1, 0, 0],
      fUpL: [-0.5, 0, 0], fUpR: [-0.5, 0, 0], fLowL: [0.9, 0, 0], fLowR: [0.9, 0, 0], earL: [-0.15, 0, 0.05], earR: [-0.15, 0, -0.05] })),     // 뒷발로 서서 둘러본다
  clip('groom', 1.6, 1, t => { const w = Math.sin(TAU * t * 3); return { neck: [0.35, 0, 0], head: [0.3 + 0.08 * w, 0, 0],
      fUpL: [-1.1 + 0.25 * w, 0, -0.1], fUpR: [-1.1 - 0.25 * w, 0, 0.1], fLowL: [1.2, 0, 0], fLowR: [1.2, 0, 0], earL: [0.5, 0, 0.3], earR: [0.5, 0, -0.3] }; }),
  clip('freeze', 2.0, 1, t => ({ root: [0.05, -0.05, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0], earL: [0.9, 0, 0.1], earR: [0.9, 0, -0.1] })),    // 납작 엎드려 귀를 눕힌다
]);
/* ── 개구리 ──────────────────────────────────────────────────────── */
const FROG = Object.fromEntries([
  clip('sit', 3.0, 1, t => ({ root: [0, 0.03 * Math.max(0, Math.sin(TAU * t * 1.5)) ** 4, 0], head: [-0.03 * Math.sin(TAU * t * 1.5), 0, 0] })),
  clip('hop', 0.5, 0, t => {                        // 0~0.18 뒷다리를 한꺼번에 편다 · 공중에서 뻗은 채 · 0.6~ 앞발로 받고 다시 접는다
    const ext = t < 0.18 ? sm(t / 0.18) : 1 - sm(Math.max(0, (t - 0.55) / 0.45)), land = t > 0.55 ? Math.sin(Math.PI * (t - 0.55) / 0.45) : 0;
    return { hUpL: [0.9 * ext, -0.7 * ext, 0], hUpR: [0.9 * ext, 0.7 * ext, 0], hLowL: [1.4 * ext, 0, 0], hLowR: [1.4 * ext, 0, 0], hFootL: [-0.9 * ext, 0, 0], hFootR: [-0.9 * ext, 0, 0],
      fUpL: [-0.8 * ext + 0.4 * land, 0, 0], fUpR: [-0.8 * ext + 0.4 * land, 0, 0], root: [-0.45 * ext + 0.3 * land, 0, 0], pelvis: [-0.15 * ext, 0, 0] }; }),
  clip('swim', 0.7, 1, t => { const k = Math.max(0, Math.sin(TAU * t)); return { hUpL: [1.0 * k, -0.6 * k, 0], hUpR: [1.0 * k, 0.6 * k, 0], hLowL: [1.3 * k, 0, 0], hLowR: [1.3 * k, 0, 0],
      hFootL: [-0.7 * k, 0, 0], hFootR: [-0.7 * k, 0, 0], fUpL: [0.6, 0, 0], fUpR: [0.6, 0, 0], root: [-0.1, 0, 0] }; }),
  clip('croak', 1.2, 0, t => { const p = Math.sin(Math.PI * t) * Math.max(0, Math.sin(TAU * t * 3)); return { spine: [-0.08 * p, 0, 0], head: [-0.12 * p, 0, 0], root: [0, 0.06 * p, 0] }; }),
]);
/* ── 도마뱀 ─────────────────────────────────────────────────────── */
function sprawl(A, W, travel) {
  return t => {
    const o = {}, s = Math.sin(TAU * t);
    // 서 있는 물결 — 어깨 · 골반이 마디(가슴 · 골반이 거꾸로 돈다) · 빠르면 꼬리로 흐르는 물결
    o.pelvis = [0, -W * s, 0]; o.spine = [0, W * 1.1 * s, 0]; o.chest = [0, W * 0.9 * s, 0]; o.neck = [0, -W * 0.8 * s, 0]; o.head = [0, -W * 0.5 * s, 0];
    for (let i = 1; i <= 4; i++) o['tail' + i] = [0, W * (0.5 + 0.25 * i) * Math.sin(TAU * t - (travel ? i * 0.9 : 0)) * (i === 1 ? -1 : 1), 0];
    // 대각 짝(앞오른 + 뒤왼) — 윗마디를 수평으로 돌려(앞뒤) · 든 동안 들어 올린다
    for (const [k, ph] of [['fR', 0], ['hL', 0], ['fL', 0.5], ['hR', 0.5]]) {
      const g = leg(t - ph, 0.6, A), side = k[1] === 'L' ? 1 : -1;
      o[bn(k, 'Up')] = [0, -side * g.up * 1.2, side * 0.6 * g.lift]; o[bn(k, 'Low')] = [0, 0, -side * 0.5 * g.lift]; o[bn(k, 'Foot')] = [0, side * 0.3 * g.up, 0];
    }
    o.root = [0, 0.004 * Math.sin(TAU * t * 2), 0];
    return o;
  };
}
const LIZARD = Object.fromEntries([
  clip('walk', 0.9, 1, sprawl(0.45, 0.16, false)),
  clip('run', 0.38, 1, sprawl(0.6, 0.24, true)),
  clip('idle', 4.0, 1, t => ({ tail3: [0, 0.08 * Math.sin(TAU * t), 0], tail4: [0, 0.15 * Math.sin(TAU * t + 0.6), 0], head: [0, 0.1 * Math.sin(TAU * t * 0.5), 0], root: [0, 0, 0] })),
  clip('pushup', 1.4, 0, t => { const b = Math.max(0, Math.sin(TAU * t * 3)) * Math.sin(Math.PI * t); return { fLowL: [0, 0, -0.5 * b], fLowR: [0, 0, 0.5 * b], fUpL: [0, 0, -0.4 * b], fUpR: [0, 0, 0.4 * b],
      chest: [-0.15 * b, 0, 0], neck: [-0.2 * b, 0, 0], root: [0, 0.03 * b, 0] }; }),     // 앞다리를 펴 몸을 들었다 놓는다(세력 과시)
  clip('bask', 4.0, 1, t => ({ fUpL: [0, 0, -0.3], fUpR: [0, 0, 0.3], hUpL: [0, 0, -0.3], hUpR: [0, 0, 0.3], root: [0, -0.012, 0], head: [-0.1, 0, 0] })),
]);
/* ── 꿩 ──────────────────────────────────────────────────────────── */
function birdWalk(A, bob) {
  return t => {
    const o = {};
    for (const [s, ph] of [['L', 0], ['R', 0.5]]) { const g = leg(t - ph, 0.6, A); o['hUp' + s] = [g.up * 0.6 - 0.4 * g.lift, 0, 0]; o['hLow' + s] = [0.9 * g.lift, 0, 0]; o['hFoot' + s] = [-0.8 * g.lift, 0, 0]; }
    // 고개 까딱 — 머리를 제자리에 붙들었다가(톱니) 앞으로 내민다 · 걸음 하나에 한 번
    const saw = wrap(t * 2), push = saw < 0.3 ? sm(saw / 0.3) : 1 - sm((saw - 0.3) / 0.7);
    o.neck = [-0.25 * bob * push, 0, 0]; o.neck2 = [0.35 * bob * push, 0, 0]; o.head = [-0.1 * bob * push, 0, 0];
    o.root = [0, 0.006 * Math.cos(TAU * t * 2), 0]; o.pelvis = [0, 0, 0.05 * Math.sin(TAU * t)]; o.tail = [0.05, 0.06 * Math.sin(TAU * t), 0];
    return o;
  };
}
const BIRD = Object.fromEntries([
  clip('walk', 0.7, 1, birdWalk(0.45, 1)),
  clip('run', 0.32, 1, t => Object.assign(birdWalk(0.75, 0.3)(t), { spine: [0.25, 0, 0], tail: [-0.15, 0, 0] })),
  clip('idle', 3.0, 1, t => ({ neck: [0.04 * Math.sin(TAU * t), 0.3 * Math.sin(TAU * t * 0.5), 0], head: [0, 0.25 * Math.sin(TAU * t * 0.5 + 0.5), 0], tail: [0.05, 0, 0] })),
  clip('peck', 0.9, 0, t => { const s = t < 0.35 ? sm(t / 0.35) : t < 0.5 ? 1 : 1 - sm((t - 0.5) / 0.5); return { neck: [0.9 * s, 0, 0], neck2: [0.4 * s, 0, 0], head: [0.4 * s, 0, 0], spine: [0.3 * s, 0, 0], tail: [-0.2 * s, 0, 0] }; }),
  clip('flap', 0.12, 1, t => { const w = Math.sin(TAU * t); return { wingL: [0, 0.2, 1.1 + 0.9 * w], wingR: [0, -0.2, -1.1 - 0.9 * w], spine: [-0.2, 0, 0], tail: [-0.1, 0, 0],
      hUpL: [0.9, 0, 0], hUpR: [0.9, 0, 0], hLowL: [1.2, 0, 0], hLowR: [1.2, 0, 0], neck: [-0.2, 0, 0] }; }),          // 솟을 때 — 세게 · 빠르게
  clip('glide', 1.0, 1, t => ({ wingL: [0, 0.15, 1.35 + 0.05 * Math.sin(TAU * t)], wingR: [0, -0.15, -1.35 - 0.05 * Math.sin(TAU * t)], spine: [-0.1, 0, 0],
      hUpL: [0.9, 0, 0], hUpR: [0.9, 0, 0], hLowL: [1.2, 0, 0], hLowR: [1.2, 0, 0], tail: [-0.05, 0, 0] })),
  clip('crow', 1.6, 0, t => { const up = sm(Math.min(1, t * 5)) * sm(Math.min(1, (1 - t) * 5)), w = t > 0.25 && t < 0.55 ? Math.sin(TAU * (t - 0.25) / 0.15) : 0;
      return { spine: [-0.35 * up, 0, 0], chest: [-0.2 * up, 0, 0], neck: [-0.4 * up, 0, 0], head: [-0.3 * up, 0, 0], wingL: [0, 0, 0.5 * Math.abs(w)], wingR: [0, 0, -0.5 * Math.abs(w)] }; }),   // 꿩꿩 — 가슴을 펴고 날개를 푸드득
]);
/* ── 상어 ────────────────────────────────────────────────────────── */
function swim(amp, recoil) {
  // 마디 자리(머리에서 잰 몸길이의 몫) — s1 0.2 · s2 0.36 · s3 0.52 · s4 0.68 · tail 0.86 · 물결 길이 ≈ 몸길이 · 진폭은 제곱으로
  const X = { s1: 0.2, s2: 0.36, s3: 0.52, s4: 0.68, tail: 0.86 }, order = ['s1', 's2', 's3', 's4', 'tail'];
  return t => {
    const o = {}, ang = {};
    for (const k of order) { const x = X[k], a = amp * (0.15 + x * x * 1.6); ang[k] = a * Math.sin(TAU * (t - x)); }
    let prev = 0; for (const k of order) { o[k] = [0, ang[k] - prev, 0]; prev = ang[k]; }
    o.head = [0, -recoil * Math.sin(TAU * t), 0]; o.finL = [0.05 * Math.sin(TAU * t), 0, 0]; o.finR = [-0.05 * Math.sin(TAU * t), 0, 0];
    return o;
  };
}
const FISH = Object.fromEntries([
  clip('cruise', 1.6, 1, swim(0.22, 0.03)),
  clip('burst', 0.5, 1, swim(0.3, 0.05)),
  clip('bite', 0.8, 0, t => { const e = Math.sin(Math.PI * t); return { head: [-0.35 * e, 0, 0], s1: [-0.1 * e, 0, 0], finL: [0, 0, -0.3 * e], finR: [0, 0, 0.3 * e] }; }),
]);
const all = { quad: QUAD, hare: HARE, frog: FROG, lizard: LIZARD, bird: BIRD, fish: FISH };
const js = '/* data-animal-clips.js — CASTAWAY · 자료 — tools/animals/clips.mjs 가 만든다(근거와 각의 뜻은 그 파일 머리말 · 손으로 고치지 말 것)\n' +
  '   몸 꼴 → 동작 → {d 길이(초) · l 되풀이 · n 열쇠 수 · ch{뼈: {x,y,z: 열쇠마다 각}} · root = [몸 기울기 x, 높이 y(키의 몫), 0]} */\n' +
  'const ANIMAL_CLIPS=' + JSON.stringify(all) + ';\n';
fs.writeFileSync('engine/js/data-animal-clips.js', js);
console.log('clips', Object.entries(all).map(([k, v]) => k + ':' + Object.keys(v).length).join(' '), 'bytes', js.length);
