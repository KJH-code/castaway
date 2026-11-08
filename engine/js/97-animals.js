/* 97-animals.js — CASTAWAY
   들짐승(사용자 요청 2026-11-08 '동물을 들여라' → 같은 날 '준 메시를 써라 · 뼈를 심고 · 몸짓을 미리 짜서 흔들고 · 종마다 털빛을 사진에서 · 너무 많지 않게').
   (island_world.html 이 이 차례로 읽는다 — 97-sheep.js 다음 · 자료 data-animal-meshes.js · data-animal-coats.js · data-animal-clips.js 가 먼저 · 차례와 묶음은 CODEMAP.md) */
"use strict";

/* ============================================================================
   들짐승 — 소 · 사슴(암 · 수) · 멧돼지(새끼) · 들양 · 토끼 · 꿩 · 개구리 · 도마뱀 · 상어
   ----------------------------------------------------------------------------
   · 몸 — 사용자가 준 STL(meshes/organic)을 줄이고 뼈를 심었다(tools/animals/rig.py → data-animal-meshes.js · 가까이 · 멀리 두 단계).
     쉼 자세는 곧다(걷던 다리를 세우고 옆으로 돌린 고개를 앞으로) — 몸짓 표의 각이 그 자세에서 잰 것이다.
   · 털빛 — 종 · 품종마다(바이옴에 맞는 종이 선다) 사진에서 잰 빛깔 갈래(data-animal-coats.js · tools/animals/coats.py — 사진 출처 docs/notes/animal-credits.md).
     게임이 켜질 때 메시의 뼈 무게로 머리 · 다리 · 꼬리 · 배 · 등을 갈라 옆 · 위 두 그림에 칠하고(aniPaint) 셰이더가 법선으로 둘을 섞는다 · 사진에서 오린 털 결을 곱한다.
   · 몸짓 — 미리 짜 둔 표(data-animal-clips.js · tools/animals/clips.mjs — 걸음새 조사 값)를 고르고 섞고(빠르기로 걸음 · 빠른걸음 · 달리기) 흔든다(aniPose):
     마리마다 폭 · 빠르기 · 다리마다 어긋남이 다르고, 걸음마다 폭이 조금씩 바뀌고, 고개 · 꼬리 · 귀 · 등은 느리게 떤다.
   · 수 — 먹을 수 있는 뭍짐승은 사람 둘레에 다 합쳐 `ANI_CAP` 마리까지(종류마다 max) · 잡으면 그 종류는 2분 동안 새로 안 선다(`ANI_COOL`).
     물고기 · 낚시를 찾는 일이 줄지 않게(사용자 요청). 양(97-sheep.js)은 따로 센다.
   · 사람 둘레 60~140 m(보는 쪽 뒤)에 무리로 세우고 240 m 넘게 멀어지면 거둔다 · 저장하지 않는다 · 맞는 공은 몬스터와 같은 대역(`mobProxy`) · 쓰러지면 사체(`a.loot` 또는 `MOB_LOOT`).
   ========================================================================== */
MON.ani = [];
const ANI_DEF = {
  cow:      {mesh:['cow'],          coat:'cow',      rig:'quad',   pool:4, max:4, hp:140, r:0.85, cy:1.0,  herd:[2,4], name:'소를',     voice:'moo',
             v:{walk:1.0, trot:2.6, run:6.0}, runClip:'gallop', scare:[2.5, 4], alert:10, loot:[['meat_beef', 3], ['hide', 2], ['bone', 2]]},
  deer:     {mesh:['doe', 'stag'],  coat:'deer',     rig:'quad',   pool:5, max:3, hp:70,  r:0.5,  cy:0.95, herd:[1,3], name:'사슴을',   voice:'bark',
             v:{walk:1.1, trot:3.0, run:10}, runClip:'rotary', scare:[24, 40], alert:48, loot:[['meat_venison', 2], ['hide', 1], ['bone', 1]]},
  boar:     {mesh:['boar'],         coat:'boar',     rig:'quad',   pool:5, max:3, hp:110, r:0.55, cy:0.5,  herd:[1,1], name:'멧돼지를', voice:'grunt',
             v:{walk:0.9, trot:2.6, run:7.5}, runClip:'gallop', scare:[3, 6], alert:14, loot:[['meat_pork', 2], ['hide', 1], ['bone', 1]], mean:16},
  wsheep:   {mesh:['sheep'],        coat:'sheep',    rig:'quad',   pool:4, max:3, hp:60,  r:0.45, cy:0.55, herd:[2,3], name:'들양을',   voice:'baa',
             v:{walk:0.9, trot:2.3, run:6.0}, runClip:'gallop', scare:[3, 5], alert:12, loot:[['meat_mutton', 2], ['wool', 2]]},
  hare:     {mesh:['hare'],         coat:'hare',     rig:'hare',   pool:2, max:2, hp:12,  r:0.26, cy:0.2,  herd:[1,1], name:'토끼를',   voice:'squeak',
             v:{walk:1.4, trot:1.4, run:10}, scare:[11, 18], alert:22, loot:[['meat_hare', 1], ['hide', 1]]},
  pheasant: {mesh:['pheasant'],     coat:'pheasant', rig:'bird',   pool:3, max:2, hp:10,  r:0.3,  cy:0.3,  herd:[1,2], name:'꿩을',     voice:'cackle',
             v:{walk:0.7, trot:0.7, run:4.0}, scare:[6, 12], alert:14, loot:[['meat_bird', 1], ['feather', 6]]},
  frog:     {mesh:['frog'],         coat:'frog',     rig:'frog',   pool:4, max:3, hp:3,   r:0.14, cy:0.05, herd:[1,2], name:'개구리를', voice:'croak', small:1,
             v:{walk:0.6, trot:0.6, run:1.6}, scare:[1.6, 3], alert:4, loot:[['meat_frog', 1]]},
  lizard:   {mesh:['lizard'],       coat:'lizard',   rig:'lizard', pool:3, max:2, hp:8,   r:0.2,  cy:0.08, herd:[1,1], name:'도마뱀을', voice:'hiss', small:1,
             v:{walk:0.35, trot:0.35, run:2.6}, scare:[3, 6], alert:7, loot:[['meat_lizard', 1]]},
  shark:    {mesh:['shark'],        coat:'shark',    rig:'fish',   pool:2, max:2, hp:160, r:0.7,  cy:0.33, herd:[1,1], name:'상어를',   voice:null, sea:1,
             v:{walk:1.2, trot:1.2, run:4.5}, scare:[0, 0], alert:35, loot:[['meat_shark', 3], ['shark_tooth', 2]], mean:22}
};
const ANI_KINDS = Object.keys(ANI_DEF);
const ANI_FOOD = ['cow', 'deer', 'boar', 'wsheep', 'hare', 'pheasant'], ANI_CAP = 7;   // 먹을 뭍짐승은 다 합쳐 일곱까지
const ANI_COOL = {};                                                                   // 잡은 종류는 2분 동안 새로 안 선다
let ANI_T = 0, ANI_K = 0, ANI_HERD = 0, ANI_BUILT = false;

/* 아이템 · 굽기 */
Object.assign(ITEMS, {
  meat_beef:    {n:'쇠고기',     kg:1.6, c:0xa8443c, use:'날고기 — 구워 먹어야 탈이 없다', food:9, raw:true, tags:['meat']},
  meat_hare:    {n:'토끼고기',   kg:0.6, c:0xb86a5e, use:'날고기 — 구워 먹어야 탈이 없다', food:4, raw:true, tags:['meat']},
  meat_bird:    {n:'꿩고기',     kg:0.5, c:0xc4786a, use:'날고기 — 구워 먹어야 탈이 없다', food:4, raw:true, tags:['meat']},
  meat_venison: {n:'사슴고기',   kg:1.2, c:0x8a3a34, use:'날고기 — 구워 먹어야 탈이 없다', food:7, raw:true, tags:['meat']},
  meat_pork:    {n:'멧돼지고기', kg:1.3, c:0xb05a50, use:'날고기 — 구워 먹어야 탈이 없다', food:8, raw:true, tags:['meat']},
  meat_frog:    {n:'개구리 뒷다리', kg:0.08, c:0xd8b8a0, use:'날고기 — 작지만 구우면 먹을 만하다', food:2, raw:true, tags:['meat']},
  meat_frog_toxic: {n:'독개구리', kg:0.03, c:0xe8c020, use:'살갗에 독이 있다 — 먹으면 안 된다', food:1, raw:true, poison:35, poisonMsg:'살갗의 독은 구워도 안 빠진다 — 먹지 말 것'},
  meat_lizard:  {n:'도마뱀 고기', kg:0.2, c:0xc8a090, use:'날고기 — 구워 먹어야 탈이 없다', food:3, raw:true, tags:['meat']},
  meat_shark:   {n:'상어 고기',  kg:2.0, c:0xd8c8c0, use:'날고기 — 구워 먹어야 탈이 없다', food:8, raw:true, tags:['meat']}
});
if (typeof FIRING !== 'undefined') for (const id of ['meat_beef', 'meat_hare', 'meat_bird', 'meat_venison', 'meat_pork', 'meat_frog', 'meat_lizard', 'meat_shark'])
  if (!FIRING[id]) FIRING[id] = {out:'meat_cooked', hours:/beef|shark|pork|venison/.test(id) ? 0.25 : 0.12, count:1};
for (const k of ANI_KINDS) MOB_LOOT[k] = ANI_DEF[k].loot;

/* ── 몸 — 자료를 풀어 꼴 · 뼈 ─────────────────────────────────────────────── */
const ANI_GEO = {}, ANI_LAB = {}, ANI_MAT = {}, ANI_GRAIN = {};
function aniGeo(key, part) {
  const ck = key + '|' + part; if (ANI_GEO[ck]) return ANI_GEO[ck];
  const M = ANIMAL_MESH[key], D = M[part], N0 = M.near, nv = D.nv, nt = D.nt;
  const raw = Uint8Array.from(atob(D.b), c => c.charCodeAt(0)), buf = raw.buffer;
  const q = new Uint16Array(buf, 0, nv * 3); let o = nv * 6;
  const n8 = new Int8Array(buf, o, nv * 3); o += nv * 3;
  const J = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const W = new Uint8Array(buf, o, nv * 4); o += nv * 4; o += (4 - (nv * 17) % 4) % 4;
  const I = new Uint16Array(buf, o, nt * 3);
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), uvT = new Float32Array(nv * 2), top = new Float32Array(nv);
  const mn = D.mn, mx = D.mx, a = N0.mn, b = N0.mx;
  for (let i = 0; i < nv; i++) {
    for (let k = 0; k < 3; k++) { P[i * 3 + k] = mn[k] + q[i * 3 + k] / 65535 * (mx[k] - mn[k]); Nn[i * 3 + k] = n8[i * 3 + k] / 127; }
    const xn = (P[i * 3] - a[0]) / (b[0] - a[0]), yn = (P[i * 3 + 1] - a[1]) / (b[1] - a[1]), zn = (P[i * 3 + 2] - a[2]) / (b[2] - a[2]);
    uv[i * 2] = zn; uv[i * 2 + 1] = 0.5 + 0.498 * clamp(yn, 0, 1); uvT[i * 2] = zn; uvT[i * 2 + 1] = 0.498 * clamp(xn, 0, 1);
    const ny = Nn[i * 3 + 1]; top[i] = clamp((ny - 0.35) / 0.45, 0, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('uvT', new THREE.BufferAttribute(uvT, 2)); g.setAttribute('aTop', new THREE.BufferAttribute(top, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(J), 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(W), 4, true));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(I), 1)); g.computeBoundingSphere();
  g.userData = {J, W, I, P};
  return ANI_GEO[ck] = g;
}
/* 한 마리의 뼈 · 꼴 둘(가까이 · 멀리 — 같은 뼈를 나눠 쓴다) */
function aniRig(key) {
  const M = ANIMAL_MESH[key], rig = new THREE.Group(); rig.visible = false; scene.add(rig);
  const bones = [], byName = {}, heads = [];
  for (const [n, p, h] of M.bones) {
    const b = new THREE.Bone(); b.name = n; const par = p ? byName[p] : null, ph = p ? heads[M.bones.findIndex(x => x[0] === p)] : [0, 0, 0];
    b.position.set(h[0] - ph[0], h[1] - ph[1], h[2] - ph[2]); (par || rig).add(b); bones.push(b); byName[n] = b; heads.push(h);
  }
  rig.updateMatrixWorld(true);
  const inv = heads.map(h => new THREE.Matrix4().makeTranslation(-h[0], -h[1], -h[2])), skel = new THREE.Skeleton(bones, inv);
  const mk = part => { const m = new THREE.SkinnedMesh(aniGeo(key, part), aniVC()); m.frustumCulled = false; m.userData.lightRole = 'recv'; rig.add(m); m.bind(skel, new THREE.Matrix4()); return m; };
  const near = mk('near'), far = mk('far'); far.visible = false;
  /* 꿩 — 메시의 날개는 몸에 접혀 있다(펴면 혹이 된다). 날 때만 깃 판 둘을 가슴에 펼쳐 친다(aniDraw — 몸짓 표의 날개 각을 받는다) */
  let wings = null;
  if (M.kind === 'bird' && byName.chest) {
    const sh = new THREE.Shape([[0, 0.05], [0.10, 0.085], [0.22, 0.07], [0.33, 0.03], [0.38, -0.04], [0.33, -0.08], [0.27, -0.12], [0.2, -0.11], [0.13, -0.14], [0.06, -0.12], [0, -0.07]].map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);                    // x 바깥 · z 앞뒤 · 판은 xz 평면
    const P = g.attributes.position, C = [];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), t = clamp(x / 0.38, 0, 1); C.push(1 - 0.45 * t, 1 - 0.45 * t, 1 - 0.45 * t); }   // 끝이 짙다
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const mat = new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide, color:0x8a6a44});
    const hd = heads[M.bones.findIndex(b => b[0] === 'chest')], wl = heads[M.bones.findIndex(b => b[0] === 'wingL')] || [0.06, 0.27, 0.27];
    wings = [1, -1].map(sd => { const w = new THREE.Mesh(g, mat); w.scale.x = sd; w.position.set(wl[0] * sd - hd[0], wl[1] - hd[1] + 0.01, wl[2] - hd[2] - 0.04); w.visible = false; w.userData.lightRole = 'recv'; byName.chest.add(w); return w; });
    wings.mat = mat; if (typeof envPatch === 'function') envPatch(mat);
  }
  return {rig, near, far, bones, byName, key, size:M.size, wings, bi:Object.fromEntries(M.bones.map((b, i) => [b[0], i]))};
}
const _aniMats = {};
const aniVC = () => _aniMats.vc || (_aniMats.vc = new THREE.MeshLambertMaterial({color:0x8a7a6a, skinning:true}));

/* ── 털빛 칠하기 ─────────────────────────────────────────────────────────────
   메시의 정점마다 가장 무거운 뼈로 자리를 가른다 — 1 몸 · 2 머리 · 3 목 · 4 다리 끝 · 5 꼬리 · 6 귀 · 7 날개 · 8 지느러미
   옆 그림(z, y)과 위 그림(z, x)에 세모를 그려 자리 지도를 만들고(가장 바깥 면이 이긴다) 무늬를 칠한다 · 빈 칸은 옆 칸으로 메워 이음매가 안 보이게 */
const ANI_TW = 256, ANI_TH = 128;
function aniRegion(n) {
  if (n === 'head') return 2; if (/^neck/.test(n)) return 3; if (/^ear/.test(n)) return 6; if (/^wing/.test(n)) return 7;
  if (/^fin/.test(n)) return 8; if (/^tail/.test(n)) return 5; if (/(Low|Foot)[LR]$/.test(n)) return 4; return 1;
}
function aniLabels(key) {
  if (ANI_LAB[key]) return ANI_LAB[key];
  const M = ANIMAL_MESH[key], g = aniGeo(key, 'near'), {J, W, I, P} = g.userData, nv = P.length / 3, a = M.near.mn, b = M.near.mx, fish = M.kind === 'fish';
  const reg = new Uint8Array(nv);
  for (let i = 0; i < nv; i++) { let best = 0; for (let k = 1; k < 4; k++) if (W[i * 4 + k] > W[i * 4 + best]) best = k; reg[i] = aniRegion(M.bones[J[i * 4 + best]][0]); if (fish && reg[i] === 5) reg[i] = 8; }
  const mk = (ax, sideMax) => {
    const L = new Uint8Array(ANI_TW * ANI_TH), Z = new Float32Array(ANI_TW * ANI_TH).fill(-1e9);
    const U = i => (P[i * 3 + 2] - a[2]) / (b[2] - a[2]) * ANI_TW, V = i => (1 - (P[i * 3 + ax] - a[ax]) / (b[ax] - a[ax])) * ANI_TH;
    const dep = i => ax === 1 ? P[i * 3] : P[i * 3 + 1];
    for (let t = 0; t < I.length; t += 3) {
      const i0 = I[t], i1 = I[t + 1], i2 = I[t + 2], x0 = U(i0), y0 = V(i0), x1 = U(i1), y1 = V(i1), x2 = U(i2), y2 = V(i2);
      const d = (dep(i0) + dep(i1) + dep(i2)) / 3, r = reg[i0] === reg[i1] ? reg[i0] : reg[i2];
      const X0 = Math.max(0, Math.floor(Math.min(x0, x1, x2))), X1 = Math.min(ANI_TW - 1, Math.ceil(Math.max(x0, x1, x2))), Y0 = Math.max(0, Math.floor(Math.min(y0, y1, y2))), Y1 = Math.min(ANI_TH - 1, Math.ceil(Math.max(y0, y1, y2)));
      const den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2); if (Math.abs(den) < 1e-9) continue;
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
        const px = x + 0.5, py = y + 0.5, l0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / den, l1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / den;
        if (l0 < -0.02 || l1 < -0.02 || l0 + l1 > 1.02) continue;
        const k = y * ANI_TW + x; if (d > Z[k]) { Z[k] = d; L[k] = r; }
      }
    }
    // 빈 칸 메우기(여섯 번 넓힌다)
    for (let it = 0; it < 6; it++) { const C = L.slice(); for (let y = 0; y < ANI_TH; y++) for (let x = 0; x < ANI_TW; x++) { const k = y * ANI_TW + x; if (C[k]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < ANI_TW && yy < ANI_TH && C[yy * ANI_TW + xx]) { L[k] = C[yy * ANI_TW + xx]; break; } } } }
    return L;
  };
  const S = mk(1), T = mk(0);
  // 옆 그림의 칸마다 몸통의 배 · 등 줄(몸통 자리의 맨 아래 · 맨 위 줄)
  const lo = new Float32Array(ANI_TW).fill(-1), hi = new Float32Array(ANI_TW).fill(-1);
  for (let x = 0; x < ANI_TW; x++) for (let y = 0; y < ANI_TH; y++) if (S[y * ANI_TW + x] === 1 || (fish && S[y * ANI_TW + x] === 2)) { if (hi[x] < 0) hi[x] = y; lo[x] = y; }
  let z0 = ANI_TW, z1 = 0; for (let x = 0; x < ANI_TW; x++) if (hi[x] >= 0) { z0 = Math.min(z0, x); z1 = Math.max(z1, x); }
  return ANI_LAB[key] = {S, T, lo, hi, z0, z1};
}
/* 잡음 — 씨앗 있는 값 잡음 · 세 겹 */
function aniHash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function aniNoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, f = t => t * t * (3 - 2 * t);
  const a = aniHash(xi, yi, s), b = aniHash(xi + 1, yi, s), c = aniHash(xi, yi + 1, s), d = aniHash(xi + 1, yi + 1, s);
  return a + (b - a) * f(u) + (c - a) * f(v) + (a - b - c + d) * f(u) * f(v); }
const aniFbm = (x, y, s) => (aniNoise(x, y, s) * 0.55 + aniNoise(x * 2.1, y * 2.1, s + 7) * 0.3 + aniNoise(x * 4.3, y * 4.3, s + 13) * 0.15);
const _hx = h => [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
const _mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
const _sc = (p, k) => [p[0] * k, p[1] * k, p[2] * k];
/* 한 칸의 빛깔 — r 자리 · zn(뒤 0 → 앞 1) · yn(아래 0 → 위 1 · 옆 그림) · yr(몸통 안의 높이 몫 · 배 0 → 등 1 · 몸통 밖은 -1) · xr(등줄에서 옆으로 0 → 1 · 위 그림) */
function aniPix(pat, C, r, zn, yn, yr, xr, side, s, M) {
  const {b, a, d, f, l, x} = C; let c = b;
  const back = side ? clamp((yr - 0.72) / 0.28, 0, 1) : clamp(1 - xr * 1.4, 0, 1);       // 등 쪽
  const belly = side ? (yr >= 0 ? clamp((0.24 - yr) / 0.16, 0, 1) : 0) : 0;
  c = _mix(c, d, back * 0.55);
  if (r === 2) c = f; else if (r === 3) c = _mix(b, f, 0.35); else if (r === 4) c = l; else if (r === 6) c = _mix(f, b, 0.3); else if (r === 5) c = _mix(b, d, 0.4);
  const fb = aniFbm(zn * 7, (side ? yn : xr) * 4, s), fb2 = aniFbm(zn * 14, (side ? yn : xr) * 8, s + 3);
  switch (pat) {
    case 'countershade': if (r === 1 || r === 3) c = _mix(c, a, belly); if (r === 6 && (side ? yn > 0.9 : false)) c = x; break;
    case 'solid': if (r === 1) c = _mix(c, a, belly * 0.5); break;
    case 'patches': if (r !== 4 || fb > 0.6) { if (fb > 0.53) c = a; else if (r === 4) c = l; } if (r === 2 && fb2 > 0.6) c = a; break;
    case 'belted': if ((r === 1) && Math.abs(zn - 0.5) < 0.11 + (fb2 - 0.5) * 0.06) c = a; break;
    case 'whiteface': if (r === 1 || r === 3) c = _mix(c, a, belly); if (r === 3 && side && yn < 0.62) c = _mix(c, a, 0.8); break;
    case 'brindle': if (r === 1 || r === 3 || r === 5) { const st = Math.sin(zn * 90 + fb * 9 + (side ? yn : xr) * 6); if (st > 0.35) c = _mix(c, a, 0.75); } break;
    case 'rump': if (r === 1) { c = _mix(c, a, belly); if (zn < M.zr0 + 0.07 && (side ? yr > 0.35 : true)) c = a; } if (r === 5) c = _mix(a, b, 0.4); break;
    case 'spots': if (r === 1) { c = _mix(c, a, belly);
      const sx = zn * 34, sy = (side ? yr : xr) * 9, cx = Math.floor(sx), cy = Math.floor(sy), jx = aniHash(cx, cy, s) - 0.5, jy = aniHash(cx, cy, s + 1) - 0.5;
      const dd = Math.hypot(sx - cx - 0.5 - jx * 0.5, (sy - cy - 0.5 - jy * 0.5) * 1.4); if (dd < 0.22 && (side ? yr > 0.35 : xr > 0.12 && xr < 0.8)) c = a; } break;
    case 'grizzle': c = _mix(c, a, Math.max(0, fb2 - 0.55) * 1.6); if (r === 1 && side && yr > 0.8) c = _mix(c, d, 0.5); break;
    case 'stripes': if (r === 1 || r === 3) { const st = side ? Math.sin(yr * 26) : Math.sin(xr * 22); if (st > 0.3) c = a; } break;
    case 'tiger': if (r === 1 || r === 3) { c = _mix(c, a, belly); const st = Math.sin(zn * 70 + fb * 7); if (st > 0.55 && (side ? yr > 0.3 : true)) c = _mix(c, d, 0.6); } break;
    case 'tipfin': if (r === 1 || r === 2 || r === 3) c = _mix(c, a, belly); if (r === 8 && (side ? (yn > 0.88 || yn < 0.2 || zn < 0.04) : xr > 0.8)) c = x; break;
    case 'blotch': if (r === 1 || r === 3) c = _mix(c, a, belly * 0.8); if (r !== 4 && fb > 0.58 && !(side && yr >= 0 && yr < 0.25)) c = _mix(c, d, 0.85); if (r === 4 && fb2 > 0.6) c = _mix(c, d, 0.6); break;
    case 'bands': if (r === 1 || r === 3 || r === 2) { const bd = side ? Math.sin(yn * 18 + fb * 4) : Math.sin(xr * 14 + zn * 6 + fb * 4); if (bd > 0.25) c = a; } break;
    case 'mask': if (r === 1 || r === 3) c = _mix(c, a, belly); if (fb > 0.6 && r === 1) c = _mix(c, d, 0.6); if (r === 2 && side && yn > 0.55 && yn < 0.8) c = f; else if (r === 2) c = b; break;
    case 'reticulate': if (r !== 4) { const v = Math.abs(aniNoise(zn * 26, (side ? yn : xr) * 12, s) - aniNoise(zn * 26 + 0.5, (side ? yn : xr) * 12 + 0.5, s + 5)); if (v < 0.08) c = _mix(c, a, 0.8); } break;
    case 'lines': if (r === 1 || r === 3 || r === 5) { if (side ? Math.abs(yr - 0.55) < 0.07 : (Math.abs(xr - 0.3) < 0.07 || xr < 0.05)) c = a; else if (!side) c = _mix(c, d, 0.5); }
      if (r === 5 && C.x) c = _mix(c, x, 0.6); break;
    case 'scaled': { const sx = zn * 40, sy = (side ? yn : xr) * 16, fx = sx - Math.floor(sx), fy = sy - Math.floor(sy) + (Math.floor(sx) % 2) * 0.5;
      if (r === 1 || r === 7 || r === 5) { c = _mix(b, d, (fy % 1) * 0.6); if ((fy % 1) > 0.82 || fx < 0.08) c = a; } if (r === 2) c = (side && yn > 0.9) ? b : f; break; }
    case 'bird_hen': if (r !== 4) { const sx = zn * 46, sy = (side ? yn : xr) * 20, fy = sy - Math.floor(sy) + (Math.floor(sx) % 2) * 0.5; c = _mix(b, a, ((fy % 1) > 0.7 ? 0.8 : 0) + fb2 * 0.2); if (r === 5) c = _mix(b, a, Math.sin(zn * 120) > 0.5 ? 0.8 : 0.1); } break;
    case 'bird_colchicus': if (r === 2) c = (side && yn > 0.9) ? f : a; else if (r === 3) { c = a; if (zn < M.zNeck + 0.02) c = x; }
      else if (r === 1) { c = b; if ((Math.floor(zn * 60) + Math.floor((side ? yn : xr) * 30)) % 2 === 0 && fb2 > 0.5) c = _mix(b, [0.1, 0.06, 0.04], 0.6); if (!side && xr < 0.4) c = _mix(c, d, 0.5); }
      else if (r === 7) c = _mix(d, [0.55, 0.5, 0.42], fb2 * 0.6); else if (r === 5) c = _mix(_mix(b, d, 0.4), [0.1, 0.08, 0.06], Math.sin(zn * 110) > 0.6 ? 0.8 : 0); break;
    case 'bird_golden': if (r === 2) c = a; else if (r === 3) c = Math.sin(zn * 140) > 0.4 ? [0.08, 0.06, 0.05] : d; else if (r === 1) c = side ? (yr > 0.75 ? a : b) : (xr < 0.5 ? a : b);
      else if (r === 7) c = x; else if (r === 5) c = _mix([0.72, 0.58, 0.36], [0.2, 0.16, 0.1], Math.sin(zn * 90) > 0.5 ? 0.7 : 0); break;
    case 'bird_amherst': if (r === 2) c = f; else if (r === 3) c = Math.sin(zn * 150) > 0.2 ? a : b; else if (r === 1) c = side ? (yr > 0.6 ? d : b) : d;
      else if (r === 7) c = d; else if (r === 5) c = Math.sin(zn * 90) > 0.4 ? a : b; break;
    case 'bird_silver': if (r === 2) c = side && yn > 0.85 ? a : f; else if (r === 1 || r === 7 || r === 3) { c = side ? (yr < 0.4 ? a : b) : b; if ((side ? yr > 0.4 : true) && Math.sin(zn * 120 + (side ? yn : xr) * 50) > 0.85) c = a; }
      else if (r === 5) c = Math.sin(zn * 120 + (side ? yn : xr) * 40) > 0.8 ? a : b; break;
    case 'bird_green': if (r === 2) c = side && yn > 0.85 ? a : f; else if (r === 3) c = a; else if (r === 1 || r === 7) c = _mix(b, a, fb2 * 0.6); else if (r === 5) c = _mix(d, [0.15, 0.12, 0.08], Math.sin(zn * 110) > 0.5 ? 0.7 : 0); break;
  }
  return c;
}
function aniPaint(key, coat, sid, vi) {
  const ck = key + '|' + sid + '|' + vi; if (ANI_MAT[ck]) return ANI_MAT[ck];
  const SP = ANIMAL_COATS[coat].sp[sid], V = SP.v[vi % SP.v.length], C = {};
  for (const k of ['b', 'a', 'd', 'f', 'l', 'x']) C[k] = _hx(V[k] || V.b);
  const Lb = aniLabels(key), cv = document.createElement('canvas'); cv.width = ANI_TW; cv.height = ANI_TH * 2;
  const g = cv.getContext('2d'), im = g.createImageData(ANI_TW, ANI_TH * 2), px = im.data, s = (sid.length * 977 + vi * 131) | 0;
  const zr0 = Lb.z0 / ANI_TW, M = {zr0, zNeck:0};
  // 꿩 목테 자리 — 목 자리의 가장 뒤쪽
  for (let x = 0; x < ANI_TW; x++) { let has = false; for (let y = 0; y < ANI_TH; y++) if (Lb.S[y * ANI_TW + x] === 3) { has = true; break; } if (has) { M.zNeck = x / ANI_TW; break; } }
  for (let y = 0; y < ANI_TH; y++) for (let x = 0; x < ANI_TW; x++) {
    const zn = (x + 0.5) / ANI_TW;
    // 옆 그림(위 절반)
    let r = Lb.S[y * ANI_TW + x], yn = 1 - (y + 0.5) / ANI_TH, yr = Lb.hi[x] >= 0 && Lb.lo[x] > Lb.hi[x] ? (Lb.lo[x] - y) / (Lb.lo[x] - Lb.hi[x]) : -1;
    let c = aniPix(SP.pat, C, r || 1, zn, yn, yr, 0, true, s, M), k = (y * ANI_TW + x) * 4;
    const j = 0.94 + aniNoise(x * 0.4, y * 0.4, s + 21) * 0.12;
    px[k] = clamp(c[0] * j, 0, 1) * 255; px[k + 1] = clamp(c[1] * j, 0, 1) * 255; px[k + 2] = clamp(c[2] * j, 0, 1) * 255; px[k + 3] = 255;
    // 위 그림(아래 절반)
    r = Lb.T[y * ANI_TW + x]; const xn = 1 - (y + 0.5) / ANI_TH, xr = Math.abs(xn - 0.5) * 2;
    c = aniPix(SP.pat, C, r || 1, zn, 1, 1, xr, false, s, M); k = ((y + ANI_TH) * ANI_TW + x) * 4;
    px[k] = clamp(c[0] * j, 0, 1) * 255; px[k + 1] = clamp(c[1] * j, 0, 1) * 255; px[k + 2] = clamp(c[2] * j, 0, 1) * 255; px[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 2;
  if (!ANI_GRAIN[coat]) { const t = new THREE.TextureLoader().load(ANIMAL_COATS[coat].grain); t.wrapS = t.wrapT = THREE.RepeatWrapping; ANI_GRAIN[coat] = t; }
  const size = ANIMAL_MESH[key].size, tile = coat === 'shark' ? 0.35 : coat === 'frog' || coat === 'lizard' ? 0.03 : coat === 'pheasant' ? 0.1 : 0.18;
  const mat = new THREE.MeshLambertMaterial({map:tex, skinning:true});
  const gk = new THREE.Vector4(size[2] / tile, size[1] * 2 / tile, size[0] * 2 / tile, coat === 'shark' || coat === 'frog' ? 0.45 : 0.7);
  mat.userData.aniScale = gk;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uGrain = {value:ANI_GRAIN[coat]}; sh.uniforms.uGK = {value:mat.userData.aniScale};
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 uvT; attribute float aTop; varying vec2 vUvT; varying float vTop;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n  vUvT = uvT; vTop = aTop;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uGrain; uniform vec4 uGK; varying vec2 vUvT; varying float vTop;')
      .replace('#include <map_fragment>', [
        'vec4 tS = texture2D( map, vUv ); vec4 tT = texture2D( map, vUvT );',
        'vec4 texelColor = mix( tS, tT, vTop );',
        'vec2 gu = mix( vec2( vUv.x * uGK.x, vUv.y * uGK.y ), vec2( vUvT.x * uGK.x, vUvT.y * uGK.z ), vTop );',
        'texelColor.rgb *= clamp( 1.0 + ( texture2D( uGrain, gu ).r - 0.5 ) * uGK.w, 0.45, 1.6 );',
        'texelColor = mapTexelToLinear( texelColor );',
        'diffuseColor *= texelColor;'].join('\n'));
  };
  mat.customProgramCacheKey = () => 'aniCoat';
  if (typeof envPatch === 'function') envPatch(mat);                       // 하늘빛 · 숲 덮임 · 굴 속(41-terrain-light.js) — 섬을 다 지은 뒤 생긴 재질이라 LIGHT.refresh 를 안 거쳤다
  return ANI_MAT[ck] = mat;
}

/* ── 몸짓 — 미리 짠 표를 고르고 섞고 흔든다 ───────────────────────────────────── */
const _aE = new THREE.Euler();
const ANI_PIV = {hare:-0.38, frog:-0.3};                                // 몸 기울기 받침점 — 몸길이에 대한 몫(앞 + · 뒤 −)
function aniSample(arr, t, loop) {                              // 캣멀-롬 — 열쇠 사이를 부드럽게
  const n = arr.length, f = t * n; let i = Math.floor(f); const u = f - i;
  const at = j => loop ? arr[((j % n) + n) % n] : arr[clamp(j, 0, n - 1)];
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
const ANI_LEGI = {fUpL:0, fLowL:0, fFootL:0, fUpR:1, fLowR:1, fFootR:1, hUpL:2, hLowL:2, hFootL:2, hUpR:3, hLowR:3, hFootR:3};
/* 표 하나를 무게 w 로 더한다 — t 는 0~1 · 다리마다 어긋남(pk.leg) · 마리마다 폭(pk.amp) */
function aniAdd(a, clip, t, w) {
  if (!clip || w < 1e-3) return;
  const acc = a.acc, bi = a.bi, loop = !!clip.l;
  for (const bn in clip.ch) {
    const c = clip.ch[bn], li = ANI_LEGI[bn], tt = li !== undefined ? t + a.pk.leg[li] : t, ww = w * (li !== undefined ? a.pk.ampL * a.amp : a.pk.amp);
    if (bn === 'root') { if (c.x) a.root[0] += aniSample(c.x, loop ? tt % 1 : Math.min(tt, 0.999), loop) * w; if (c.y) a.root[1] += aniSample(c.y, loop ? tt % 1 : Math.min(tt, 0.999), loop) * w; continue; }
    const i = bi[bn]; if (i === undefined) continue; const T = loop ? ((tt % 1) + 1) % 1 : Math.min(tt, 0.999);
    if (c.x) acc[i * 3] += aniSample(c.x, T, loop) * ww; if (c.y) acc[i * 3 + 1] += aniSample(c.y, T, loop) * ww; if (c.z) acc[i * 3 + 2] += aniSample(c.z, T, loop) * ww;
  }
}
/* 하는 짓(풀 뜯기 · 쳐다보기 · 눕기 …) — 하나만 · 0.4초에 걸쳐 바뀐다 · 한 번짜리(l 0)는 끝나면 null */
function aniAct(a, name) { if ((a.act ? a.act.name : null) === (name || null)) return; a.actPrev = a.act; if (a.actPrev) a.actPrev.fade = 1; a.act = name ? {name, t:0, w:0} : null; }
function aniOnce(a, name) { a.once = {name, t:0}; }
function aniPose(a, dt) {
  const R = a.rig, K = a.kind, D = ANI_DEF[K], CL = ANIMAL_CLIPS[D.rig], s = a.scale;
  a.acc.fill(0); a.root[0] = a.root[1] = 0;
  /* 걸음 — 빠르기로 걸음 · 빠른걸음 · 달리기를 섞는다. 한 박의 길이도 섞어 박자가 이어진다 · 큰 몸은 느리게(√배율) */
  const v = a.speed, V = D.v, ts = Math.sqrt(s) * a.pk.tempo;
  let gw = [];
  if (D.rig === 'quad') { const run = a.charge ? 'charge' : a.stot > 0 ? 'stot' : D.runClip;
    if (v < V.walk) gw = [['walk', v / V.walk]]; else if (v < V.trot) { const u = (v - V.walk) / (V.trot - V.walk); gw = [['walk', 1 - u], ['trot', u]]; }
    else { const u = clamp((v - V.trot) / (V.run - V.trot) * 1.6, 0, 1); gw = [['trot', 1 - u], [run, u]]; } }
  else if (D.rig === 'hare') gw = v < 3 ? [['hop', clamp(v / 1.2, 0, 1)]] : [['run', 1]];
  else if (D.rig === 'bird') gw = a.state === 'fly' ? [] : v < 1.5 ? [['walk', clamp(v / 0.5, 0, 1)]] : [['run', 1]];
  else if (D.rig === 'lizard') gw = v < 0.8 ? [['walk', clamp(v / 0.3, 0, 1)]] : [['run', 1]];
  else if (D.rig === 'fish') gw = [[v > 2.5 ? 'burst' : 'cruise', 1]];
  else if (D.rig === 'frog') gw = a.swimT > 0 ? [['swim', 1]] : [];
  let fr = 0, wsum = 0; for (const [c, w] of gw) if (CL[c] && w > 0) { fr += w / (CL[c].d * ts); wsum += w; }
  if (wsum > 0) a.ph = (a.ph + dt * fr / Math.max(wsum, 1e-3) * (D.rig === 'fish' ? 0.6 + v * 0.35 : 1)) % 1;
  if (a.ph < a.phPrev) a.ampT = 0.88 + Math.random() * 0.24;                 // 걸음마다 폭이 조금씩 바뀐다
  a.phPrev = a.ph; a.amp += (a.ampT - a.amp) * clamp(dt * 3, 0, 1);
  for (const [c, w] of gw) aniAdd(a, CL[c], a.ph, w);
  /* 하는 짓 · 한 번짜리 */
  const fadeIn = clamp(dt * 2.5, 0, 1);
  if (a.actPrev) { a.actPrev.fade -= fadeIn; a.actPrev.t += dt / (CL[a.actPrev.name] ? CL[a.actPrev.name].d * ts : 1); aniAdd(a, CL[a.actPrev.name], a.actPrev.t, Math.max(0, a.actPrev.fade) * a.actPrev.w); if (a.actPrev.fade <= 0) a.actPrev = null; }
  if (a.act) { const C = CL[a.act.name]; if (C) { a.act.t += dt / (C.d * ts); a.act.w += (1 - a.act.w) * fadeIn; aniAdd(a, C, a.act.t, a.act.w); if (!C.l && a.act.t >= 1) a.act = null; } else a.act = null; }
  if (a.once) { const C = CL[a.once.name]; if (C) { a.once.t += dt / (C.d * ts); aniAdd(a, C, a.once.t, 1); if (a.once.t >= 1) a.once = null; } else a.once = null; }
  /* 흔들기 — 고개 · 목 · 꼬리 · 귀 · 등이 느리게 떤다(마리마다 다른 빠르기 셋) · 쳐다보는 고개 */
  const tm = (a.tm += dt), nz = a.pk.nz, bi = a.bi, acc = a.acc;
  const wob = (k, amp) => amp * (Math.sin(tm * nz[k] + nz[k + 3]) * 0.6 + Math.sin(tm * nz[k] * 2.3 + nz[k + 4]) * 0.4);
  for (const [n, ax, amp, k] of [['neck', 1, 0.07, 0], ['neck', 0, 0.04, 1], ['head', 1, 0.08, 2], ['tail', 1, 0.2, 3], ['tail1', 1, 0.08, 1], ['tail2', 1, 0.06, 2], ['spine', 2, 0.015, 0],
    ['earL', 2, 0.12, 4], ['earR', 2, 0.12, 5], ['neck2', 0, 0.04, 2], ['s1', 1, 0.02, 3]]) { const i = bi[n]; if (i !== undefined) acc[i * 3 + ax] += wob(k, amp); }
  if (a.earFlick > 0) { a.earFlick -= dt; const i = bi[a.earSide ? 'earL' : 'earR']; if (i !== undefined) acc[i * 3 + 2] += Math.sin(tm * 34) * 0.5 * a.earFlick; }
  else if (Math.random() < dt * 0.25) { a.earFlick = 0.4; a.earSide = Math.random() < 0.5; }
  if (a.lookY && bi.neck !== undefined) { acc[bi.neck * 3 + 1] += a.lookY * 0.55; if (bi.head !== undefined) acc[bi.head * 3 + 1] += a.lookY * 0.4; }
  if (a.hitT > 0 && bi.spine !== undefined) acc[bi.spine * 3 + 2] += Math.sin(tm * 50) * 0.1 * a.hitT;
  if (a.wings) { const L = bi.wingL, Rr = bi.wingR; a.wingA = [acc[L * 3 + 2], acc[Rr * 3 + 2]]; acc[L * 3 + 2] *= 0.12; acc[Rr * 3 + 2] *= 0.12; acc[L * 3 + 1] *= 0.2; acc[Rr * 3 + 1] *= 0.2; }
  for (let i = 0; i < a.bones.length; i++) { _aE.set(acc[i * 3], acc[i * 3 + 1], acc[i * 3 + 2], 'XYZ'); a.bones[i].quaternion.setFromEuler(_aE); }
  return a.root;
}

/* ── 짓기(섬을 다 지은 뒤 한 번 — 97-mobs.js mobsBuild) ─────────────────────── */
function animalsBuild() {
  for (const a of MON.ani) aniOff(a);
  if (ANI_BUILT || typeof ANIMAL_MESH === 'undefined' || typeof ANIMAL_COATS === 'undefined' || typeof ANIMAL_CLIPS === 'undefined') return;
  ANI_BUILT = true; let id = 0;
  try {
    for (const k of ANI_KINDS) { const D = ANI_DEF[k];
      for (let i = 0; i < D.pool; i++) { const key = D.mesh.length > 1 ? (i < Math.ceil(D.pool * 0.6) ? D.mesh[0] : D.mesh[1]) : D.mesh[0];
        MON.ani.push(aniWrap(k, id++, aniRig(key))); } }
  } catch (e) { console.error('[들짐승]', e); }
}
function aniWrap(kind, id, body) {
  const D = ANI_DEF[kind], r = mulberry32(0xa11 + id * 7919);
  const a = Object.assign(body, {kind, id, pos:new THREE.Vector3(), yaw:0, pitch:0, hp:D.hp, hp0:D.hp, hpMax:D.hp, alive:false, active:false, alerted:false, frz:0,
    state:'idle', t:0, dur:3, target:new THREE.Vector3(), speed:0, ph:r(), phPrev:0, amp:1, ampT:1, herd:null, flee:null, lookY:0, hitT:0, deadT:0,
    voiceT:4 + r() * 12, skipDt:0, lastRt:[0, 0], prox:[], pick:null, fly:null, zz:0, air:0, scale:1, sid:'', vi:0, loot:null, act:null, actPrev:null, once:null, tm:r() * 100,
    acc:new Float32Array(body.bones.length * 3), root:[0, 0], earFlick:0, earSide:false, charge:false, chargeN:0, stot:0, hop:null, swimT:0, biteT:0, cool:0,
    pk:{amp:0.88 + r() * 0.24, ampL:0.9 + r() * 0.2, tempo:0.92 + r() * 0.16, leg:[0, 1, 2, 3].map(() => (r() - 0.5) * 0.06),
        nz:null}});
  a.pk.nz = [0.3 + r(), 0.4 + r(), 0.35 + r() * 0.8, 0.5 + r() * 1.2, 0.8 + r() * 1.5, 1 + r() * 1.5, r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];   // 빠르기 여섯 · 위상(k+3 · k+4 — k 는 5 까지)
  a.blob = mobBlob(D.r * 1.6);
  a.prox.push(mobProxy(a, () => _aniP.set(a.pos.x, a.pos.y + a.air + D.cy * a.scale + 1, a.pos.z), D.r));
  return a;
}
const _aniP = new THREE.Vector3();
function aniOff(a) {
  if (!a) return;
  mobRegister(a, false); a.active = false; a.alive = false; a.rig.visible = false; a.blob.visible = false;
  const i = MON.picks.indexOf(a.pick); if (i >= 0) MON.picks.splice(i, 1); a.pick = null;
}

/* ── 세우고 거두기 ────────────────────────────────────────────────────────── */
const ANI_BNAME = Object.fromEntries(Object.entries(typeof B !== 'undefined' ? B : {}).map(([k, v]) => [v, k]));
/* 이 바이옴에 사는 종(털빛 표의 bio) — [종, 갈래 수] 목록 */
function aniSpeciesAt(kind, biome) {
  const D = ANI_DEF[kind], T = ANIMAL_COATS[D.coat].sp, bn = ANI_BNAME[biome], out = [];
  for (const sid in T) { if (sid === 'piglet') continue; if (T[sid].bio.includes(bn)) out.push(sid); }
  return out;
}
const aniNearWater = (x, z, r) => { for (let k = 0; k < 8; k++) { const an = k * 0.785, xx = x + Math.cos(an) * r, zz = z + Math.sin(an) * r; if (heightAt(xx, zz) < 0.15) return true;
  if (typeof waterAt === 'function') { const w = waterAt(xx, zz, heightAt(xx, zz)); if (w.river) return true; } } return false; };
function aniLand(kind, x, z, sid) {
  const D = ANI_DEF[kind], h = heightAt(x, z), b = mobBiome(x, z);
  if (D.sea) return h < -3.5 && (b === B.SHELF || b === B.DEEP);
  if (h < 0.5) return false;
  if (!(sid ? ANIMAL_COATS[D.coat].sp[sid].bio.includes(ANI_BNAME[b]) : aniSpeciesAt(kind, b).length)) return false;
  if (kind === 'frog' && b !== B.MARSH && !aniNearWater(x, z, 7)) return false;
  if (Math.abs(heightAt(x + 3, z) - h) + Math.abs(heightAt(x, z + 3) - h) > (kind === 'cow' ? 2.0 : kind === 'lizard' ? 4.5 : 3.0)) return false;
  if (typeof boulderAt === 'function' && boulderAt(x, z, kind === 'cow' ? 1.2 : 0.4)) return false;
  return true;
}
function aniSpawner() {
  const px = PL.pos.x, pz = PL.pos.z;
  for (const a of MON.ani) if (a.active) { const d = Math.hypot(a.pos.x - px, a.pos.z - pz); if (d > 240 || (!a.alive && a.deadT > 90)) aniOff(a); }
  if (PL.under || PL.cave) return;
  const kind = ANI_KINDS[(ANI_K++) % ANI_KINDS.length], D = ANI_DEF[kind];
  if ((ANI_COOL[kind] || 0) > 0) return;
  if (D.sea ? !PL.swim && !(typeof BOAT !== 'undefined' && BOAT.on) && heightAt(px, pz) > 2 : PL.swim) return;
  const live = MON.ani.filter(a => a.kind === kind && a.active).length;
  if (live >= D.max || Math.random() > (D.sea ? 0.25 : 0.35)) return;
  const room = ANI_FOOD.includes(kind) ? ANI_CAP - MON.ani.filter(a => a.active && a.alive && ANI_FOOD.includes(a.kind)).length : 99;
  if (room <= 0) return;
  const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
  for (let t = 0; t < 14; t++) {
    const an = Math.random() * 6.283, rr = D.small ? 25 + Math.random() * 45 : 60 + Math.random() * 80, x = px + Math.cos(an) * rr, z = pz + Math.sin(an) * rr;
    if (Math.cos(an) * fx + Math.sin(an) * fz > 0.45 || !aniLand(kind, x, z)) continue;
    const list = D.sea ? Object.keys(ANIMAL_COATS.shark.sp).filter(s => ANIMAL_COATS.shark.sp[s].bio.includes(ANI_BNAME[mobBiome(x, z)])) : aniSpeciesAt(kind, mobBiome(x, z));
    if (!list.length) continue;
    const sid = list[(Math.random() * list.length) | 0];
    aniGroup(kind, sid, x, z, Math.min(D.max - live, room, D.herd[0] + ((Math.random() * (D.herd[1] - D.herd[0] + 1)) | 0)), Math.min(room, D.max - live));
    return;
  }
}
/* 무리를 세운다 — 같은 종 · 갈래는 마리마다 · 멧돼지(멧돼지 종)는 새끼를 데리고 다닌다 */
function aniGroup(kind, sid, x, z, n, room) {
  const D = ANI_DEF[kind], herd = {id:++ANI_HERD, x, z}, out = [];
  const spread = kind === 'cow' ? 10 : kind === 'deer' || kind === 'wsheep' ? 8 : 4;
  const free = MON.ani.filter(a => a.kind === kind && !a.active);
  const want = [];
  for (let k = 0; k < n; k++) want.push(sid);
  if (kind === 'boar' && sid === 'scrofa') for (let k = 0; k < 2 && want.length < (room || 99); k++) want.push('piglet');   // 새끼도 먹을 짐승 수 · 종류의 max 에 든다(room 이 둘 다 본다)
  for (const s of want) {
    let pool = free.filter(a => !out.includes(a));
    if (kind === 'deer') { const doeOnly = s === 'hydropotes' || Math.random() < 0.55; const p2 = pool.filter(a => a.key === (doeOnly ? 'doe' : 'stag')); if (p2.length) pool = p2; }
    const a = pool[0]; if (!a) break;
    for (let k = 0; k < 6; k++) { const sx = x + (Math.random() - 0.5) * spread, sz = z + (Math.random() - 0.5) * spread;
      if (aniLand(kind, sx, sz, s === 'piglet' ? undefined : s) || (s === 'piglet' && aniLand(kind, sx, sz))) { aniSpawn(a, sx, sz, herd, s); out.push(a); break; } }
  }
  return out;
}
function aniSpawn(a, x, z, herd, sid, vi) {
  const D = ANI_DEF[a.kind], SP = ANIMAL_COATS[D.coat].sp;
  if (!sid || !SP[sid]) sid = aniSpeciesAt(a.kind, mobBiome(x, z))[0] || Object.keys(SP)[0];
  a.sid = sid; a.vi = vi !== undefined ? vi : (Math.random() * SP[sid].v.length) | 0;
  a.scale = SP[sid].s * (0.93 + Math.random() * 0.14) * (a.key === 'stag' ? 1.05 : 1);
  const mat = aniPaint(a.key, D.coat, sid, a.vi); a.near.material = a.far.material = mat;
  if (a.wings) { const V = SP[sid].v[a.vi % SP[sid].v.length]; a.wings.mat.color.set('#' + (/golden|amherst|green/.test(SP[sid].pat) ? V.x || V.d : V.d || V.b)); }
  a.rig.scale.setScalar(a.scale);
  a.loot = sid === 'mouflon' ? [['meat_mutton', 2], ['hide', 1]] : (sid === 'tinctorius' || sid === 'marina') ? [['meat_frog_toxic', 1]]
         : sid === 'piglet' ? [['meat_pork', 1]] : a.key === 'stag' ? [['meat_venison', 3], ['hide', 1], ['bone', 2]]
         : a.kind === 'lizard' && a.scale > 1 ? [['meat_lizard', 3], ['hide', 1]] : null;
  a.hpMax = Math.round(D.hp * (D.small ? 1 : Math.max(0.35, a.scale)) * (a.kind === 'shark' ? a.scale : 1));
  a.prox[0].r = D.r * Math.max(0.6, a.scale);
  a.active = a.alive = true; a.hp = a.hp0 = a.hpMax; a.herd = herd; a.alerted = false; a.frz = 0; a.deadT = 0; a.hitT = 0; a.flee = null; a.fly = null; a.air = 0;
  a.charge = false; a.chargeN = 0; a.stot = 0; a.demoV = 0; a.skipDt = 0; a.hop = null; a.swimT = 0; a.act = null; a.actPrev = null; a.once = null; a.speed = 0; a.cool = 0;
  a.pos.set(x, D.sea ? clamp(-1.5 - Math.random() * 3, heightAt(x, z) + 1.2, -0.8) : heightAt(x, z), z); a.yaw = Math.random() * 6.283; a.pitch = 0;
  a.state = 'idle'; a.t = 0; a.dur = 2 + Math.random() * 6;
  a.rig.visible = true; a.rig.rotation.set(0, a.yaw, 0);
  mobRegister(a, true);
}

/* ── 돌보기(매 프레임 — 97-mobs.js updateMobs) ──────────────────────────────── */
function animalsUpdate(dt) {
  if (!MON.ani.length) return;
  for (const k in ANI_COOL) if (ANI_COOL[k] > 0) ANI_COOL[k] -= dt;
  ANI_T -= dt; if (ANI_T <= 0) { ANI_T = 2.5; aniSpawner(); }
  for (const a of MON.ani) if (a.active) aniTick(a, dt);
}
const _aAng = a => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
function aniPanic(a, from) {
  const K = a.kind, D = ANI_DEF[K];
  if (K === 'shark') { if (a.hp >= a.hpMax * 0.4) { a.state = 'hunt'; a.t = 0; } return; }
  if (K === 'boar' && a.sid !== 'piglet' && a.hp > a.hpMax * 0.35 && (a.hp < a.hpMax || Math.random() < 0.35)) { a.state = 'charge'; a.charge = true; a.t = 0; a.dur = 5; aniVoice('grunt', a.pos, 1.4); return; }
  if (D.herd[1] > 1 && K !== 'pheasant') { for (const b of MON.ani) if (b.active && b.alive && b.kind === K && b.herd === a.herd && b !== a && b.state !== 'charge') aniFlee(b, from); }
  if (K === 'pheasant') { aniFlush(a, from); return; }
  aniFlee(a, from);
}
function aniFlee(a, from) {
  if (a.state === 'flee' || a.state === 'fly') return;
  a.state = 'flee'; a.t = 0; a.dur = (a.kind === 'deer' ? 7 : 4) + Math.random() * 3; a.flee = from; a.zz = 0; a.charge = false; aniAct(a, null);
  if (a.kind === 'deer' && (a.sid === 'axis' || a.sid === 'dama' || a.sid === 'virginianus') && Math.random() < 0.6) a.stot = 1.2;      // 처음 몇 걸음은 네 발로 튄다
  if (a.kind === 'hare') aniVoice('squeak', a.pos, 0.6); else if (a.kind === 'deer') aniVoice('bark', a.pos, 1.0); else if (a.kind === 'lizard') aniVoice('hiss', a.pos, 0.6);
}
/* 꿩이 날아오른다 — 거의 곧게 솟아 짧게 세게 치고 · 날개를 굳혀 미끄러져 내려앉는다(40~70 m) */
function aniFlush(a, from) {
  if (a.fly) return;
  let fx = a.pos.x - from.x, fz = a.pos.z - from.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
  const sk = (Math.random() - 0.5) * 0.9, c = Math.cos(sk), s = Math.sin(sk), dx = fx * c - fz * s, dz = fx * s + fz * c;
  let d = 40 + Math.random() * 30, ex = a.pos.x + dx * d, ez = a.pos.z + dz * d;
  for (let k = 0; k < 6 && !aniLand('pheasant', ex, ez); k++) { d += 12; ex = a.pos.x + dx * d; ez = a.pos.z + dz * d; }
  a.fly = {x0:a.pos.x, z0:a.pos.z, y0:a.pos.y, ex, ez, T:d / 9, t:0}; a.state = 'fly'; a.yaw = Math.atan2(dx, dz); aniAct(a, 'flap');
  aniVoice('cackle', a.pos, 1.0); mobVoice('flap', a.pos.x, a.pos.y + 0.5, a.pos.z, 0.5);
}
function aniTick(a, dt) {
  const K = a.kind, D = ANI_DEF[K];
  if (!a.alive) { if (a.deadT === 0) ANI_COOL[K] = 120; a.deadT += dt; a.blob.visible = false; a.air = Math.max(0, a.air - dt * 6); aniDraw(a, dt, true); return; }
  if (a.hp < a.hp0) { a.hitT = 0.4; aniPanic(a, {x:PL.pos.x, z:PL.pos.z}); if (K === 'cow') aniVoice('moo', a.pos, 1.3); }
  a.hp0 = a.hp; if (a.hitT > 0) a.hitT -= dt; if (a.stot > 0) a.stot -= dt; if (a.cool > 0) a.cool -= dt;
  const night = typeof mobNight === 'function' && mobNight();
  const dx = PL.pos.x - a.pos.x, dz = PL.pos.z - a.pos.z, dist = Math.hypot(dx, dz) || 1, plSpd = Math.hypot(PL.vel.x, PL.vel.z), s = a.scale;
  if (K === 'shark') { aniShark(a, dt, dx, dz, dist); return; }
  /* 사람이 다가오면 — 종류마다 놀라는 거리(scare: 걸어올 때 · 뛰어올 때) */
  if (a.state !== 'flee' && a.state !== 'fly' && a.state !== 'charge' && !PL.dead) {
    const [s0, s1] = D.scare, scare = dist < s0 * (K === 'hare' || K === 'deer' ? 1 : 1) && (K === 'cow' || K === 'wsheep' ? plSpd > 1.5 : true) || dist < s1 && plSpd > 4.5;
    if (scare && !PL.calm) aniPanic(a, {x:PL.pos.x, z:PL.pos.z});   // PL.calm — 시험장의 '놀라지 않게' · 관찰 모드(본편엔 없다)
  }
  a.t += dt; let spd = 0, face = null; const h = a.herd, V = D.v, vs = Math.sqrt(D.small ? Math.pow(s, 0.6) : s);
  if (a.frz > 0) { a.frz = Math.max(0, a.frz - dt); a.state = 'idle'; }
  else if (a.state === 'fly' && !a.fly) { a.state = 'idle'; a.air = 0; }
  else if (a.state === 'fly') {
    const F = a.fly; F.t += dt; const u = Math.min(1, F.t / F.T), x = F.x0 + (F.ex - F.x0) * u, z = F.z0 + (F.ez - F.z0) * u, g = heightAt(x, z);
    a.pos.x = x; a.pos.z = z; a.pos.y = g;
    a.air = Math.max(0, (F.y0 + (g - F.y0) * u) - g + Math.sin(Math.PI * u) * (5 + F.T) + (u < 0.15 ? u / 0.15 * 1.5 : 1.5) * (1 - u));
    aniAct(a, u > 0.28 && u < 0.86 ? 'glide' : 'flap');
    if (u >= 1) { a.fly = null; a.air = 0; a.state = 'idle'; a.t = 0; a.dur = 4 + Math.random() * 6; h.x = a.pos.x; h.z = a.pos.z; aniAct(a, null); }
  } else if (a.state === 'charge') {                                         // 멧돼지 — 사람에게 내달려 받는다 · 지나쳐 돌아서 다시(세 번까지)
    a.target.set(PL.pos.x, 0, PL.pos.z); spd = V.run * vs; aniAct(a, null);
    if (dist < D.r * s + 0.9 && a.cool <= 0) { if (typeof hurtPL === 'function') hurtPL(D.mean * Math.max(0.5, s), '멧돼지'); a.cool = 1.6; a.chargeN++;
      a.flee = {x:PL.pos.x, z:PL.pos.z}; a.state = 'flee'; a.t = 0; a.dur = 1.6 + Math.random(); a.charge = false; aniVoice('grunt', a.pos, 1.5); }
    if (a.t > 7 || PL.dead) { a.charge = false; aniFlee(a, {x:PL.pos.x, z:PL.pos.z}); }
  } else if (a.state === 'flee') {
    let fx = a.pos.x - a.flee.x, fz = a.pos.z - a.flee.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
    if (K === 'hare' || K === 'lizard') { a.zz -= dt; if (a.zz <= 0) { a.zz = 0.5 + Math.random() * 0.5; a.zs = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5); }   // 갈지자
      const c = Math.cos(a.zs), sn = Math.sin(a.zs); const ox = fx * c - fz * sn, oz = fx * sn + fz * c; fx = ox; fz = oz; }
    if (K === 'frog') { aniFrogHop(a, fx, fz, 1.6); }
    else { a.target.set(a.pos.x + fx * 6, 0, a.pos.z + fz * 6); spd = V.run * vs * (a.sid === 'piglet' ? 0.75 : 1); }
    if (a.t > a.dur) {
      if (K === 'boar' && a.chargeN > 0 && a.chargeN < 3 && a.hp > a.hpMax * 0.35 && dist < 25) { a.state = 'charge'; a.charge = true; a.t = 0; }
      else { a.state = 'idle'; a.t = 0; a.dur = 3 + Math.random() * 4; h.x = a.pos.x; h.z = a.pos.z; }
    }
  } else if (a.state === 'walk') {
    if (K === 'frog') { const tx = a.target.x - a.pos.x, tz = a.target.z - a.pos.z, L = Math.hypot(tx, tz) || 1; if (!a.hop) aniFrogHop(a, tx / L, tz / L, 0.7); if (L < 0.2 || a.t > a.dur) { a.state = 'idle'; a.t = 0; a.dur = 4 + Math.random() * 10; } }
    else { spd = (a.demoV || V.walk) * vs; if (Math.hypot(a.target.x - a.pos.x, a.target.z - a.pos.z) < 0.35 * Math.max(0.3, s) || a.t > a.dur) { a.state = 'idle'; a.t = 0; a.dur = (night ? 9 : 3) + Math.random() * 8; } }
  } else {                                                                   // idle · alert — 무엇을 할지(풀 뜯기 · 눕기 · 털기 · 울기 …)
    a.state = dist < D.alert * (K === 'deer' && a.scale < 0.7 ? 0.8 : 1) && !PL.dead && !PL.calm ? 'alert' : 'idle';
    if (a.state === 'alert') { face = Math.atan2(dx, dz) + (K === 'hare' ? Math.PI * 0.5 : 0);
      aniAct(a, K === 'hare' ? (dist < D.scare[1] * 1.3 ? 'freeze' : 'upright') : K === 'pheasant' || K === 'frog' ? 'idle' : K === 'lizard' ? 'idle' : 'alert'); }
    else if (!a.act || a.t > a.dur) aniIdle(a, night);
    if (a.t > a.dur && a.state === 'idle') {
      a.t = 0; a.dur = 3 + Math.random() * 7;
      if (Math.random() < (night ? 0.2 : 0.55)) {
        h.x += (Math.random() - 0.5) * 5; h.z += (Math.random() - 0.5) * 5;
        for (let k = 0; k < 6; k++) { const an = Math.random() * 6.283, r = (0.5 + Math.random() * (K === 'cow' ? 7 : 4)) * Math.max(0.3, s), x = h.x + Math.cos(an) * r, z = h.z + Math.sin(an) * r;
          if (aniLand(K, x, z, a.sid === 'piglet' ? undefined : a.sid)) { a.target.set(x, 0, z); a.state = 'walk'; a.t = 0; a.dur = 10; aniAct(a, null); break; } }
      }
    }
  }
  if (a.hop) aniHopStep(a, dt);
  else if (spd > 0) {
    const tx = a.target.x - a.pos.x, tz = a.target.z - a.pos.z, L = Math.hypot(tx, tz) || 1;
    a.yaw += _aAng(Math.atan2(tx, tz) - a.yaw) * clamp((spd > 3 ? 6 : 2.8) * dt, 0, 1);
    const st = Math.min(spd * dt, L), nx = a.pos.x + Math.sin(a.yaw) * st, nz = a.pos.z + Math.cos(a.yaw) * st, nh = heightAt(nx, nz);
    /* 오를 수 있나 — 앞쪽 일정한 거리의 기울기로 잰다(프레임마다 간 거리로 나누면 프레임률에 따라 판정이 바뀐다) · 딛는 높이는 mobGround(큰 지형 모형 위도) */
    const ah = 0.6 * Math.max(0.5, s), ax = a.pos.x + Math.sin(a.yaw) * ah, az = a.pos.z + Math.cos(a.yaw) * ah, len = D.r * 1.8 * Math.max(0.3, s);
    const slope = Math.abs(mobGround(ax, az, a.yaw, len) - a.pos.y) / ah, maxS = K === 'cow' ? 0.9 : K === 'lizard' ? 3 : K === 'wsheep' && a.sid === 'mouflon' ? 2.2 : 1.4;
    if (nh > 0.3 && slope < maxS && !solidAt(nx, nz, nh + 0.5 * Math.max(0.3, s)) && !(typeof boulderAt === 'function' && boulderAt(nx, nz, 0.2))) { a.pos.x = nx; a.pos.z = nz; }
    else if (a.state === 'flee' || a.state === 'charge') { a.flee = {x:a.pos.x - Math.sin(a.yaw + 1.3) * 5, z:a.pos.z - Math.cos(a.yaw + 1.3) * 5}; if (a.state === 'charge') { a.state = 'flee'; a.t = 0; a.dur = 1.5; a.charge = false; } }
    else { a.state = 'idle'; a.t = 0; a.dur = 2; }
  } else if (face !== null) a.yaw += _aAng(face - a.yaw) * clamp(1.8 * dt, 0, 1);
  a.speed += (spd - a.speed) * clamp(dt * 5, 0, 1);
  let ly = 0; if (a.state === 'alert') ly = clamp(_aAng(Math.atan2(dx, dz) - a.yaw), -1, 1); a.lookY += (ly - a.lookY) * clamp(dt * 4, 0, 1);
  if (a.state !== 'fly') a.pos.y = a.swimT > 0 ? Math.max(heightAt(a.pos.x, a.pos.z), -0.03) : mobGround(a.pos.x, a.pos.z, a.yaw, (D.r * 1.8) * Math.max(0.3, s));
  if ((a.voiceT -= dt) < 0) { a.voiceT = (K === 'frog' ? (night ? 3 : 14) : K === 'cow' ? 10 : 16) + Math.random() * 20;
    if (dist < (K === 'frog' ? 40 : 70) && K !== 'hare' && K !== 'lizard' && D.voice) { aniVoice(D.voice, a.pos, 0.6 + Math.random() * 0.3); if (K === 'frog') aniOnce(a, 'croak'); } }
  aniDraw(a, dt, false);
  a.blob.visible = a.rig.visible && a.swimT <= 0; a.blob.position.set(a.pos.x, a.pos.y + 0.04, a.pos.z); const bs = a.scale / (1 + a.air * 0.4); a.blob.scale.set(bs * D.r * 3.2, 1, bs * D.r * 3.2);
}
/* 서 있을 때 하는 짓 — 종류마다 고르는 몫이 다르다 */
function aniIdle(a, night) {
  const K = a.kind, r = Math.random();
  if (a.state === 'alert') return;
  if (K === 'cow' || K === 'wsheep' || K === 'deer') {
    if (night && r < 0.5 || r < 0.08) aniAct(a, 'lie'); else if (r < 0.8) aniAct(a, 'graze'); else aniAct(a, null);
    if (Math.random() < 0.15) aniOnce(a, 'shake');
    if (K === 'deer' && a.key === 'stag' && (a.sid === 'elaphus' || a.sid === 'nippon' || a.sid === 'dama') && typeof gameHours !== 'undefined' && (gameHours % 24 < 7.5 && gameHours % 24 > 5 || gameHours % 24 > 18 && gameHours % 24 < 20.5) && Math.random() < 0.5) { aniOnce(a, 'roar'); aniVoice('roar', a.pos, 1.2); }
  } else if (K === 'boar') aniAct(a, r < 0.7 ? 'root' : r < 0.85 ? 'graze' : night ? 'lie' : null);
  else if (K === 'hare') aniAct(a, r < 0.25 ? 'groom' : r < 0.35 ? 'upright' : 'sit');
  else if (K === 'pheasant') { aniAct(a, 'idle'); if (r < 0.5) aniOnce(a, 'peck'); else if (r < 0.58 && !night) { aniOnce(a, 'crow'); aniVoice('cackle', a.pos, 1); } }
  else if (K === 'frog') aniAct(a, 'sit');
  else if (K === 'lizard') { aniAct(a, !night && r < 0.6 ? 'bask' : 'idle'); if (r > 0.85) aniOnce(a, 'pushup'); }
}
/* 개구리 — 한 번 뛰기(0.5 초) · 물에 닿으면 헤엄 */
function aniFrogHop(a, fx, fz, k) {
  if (a.hop) return;
  const L = (0.35 + Math.random() * 0.4) * k * Math.max(0.5, Math.sqrt(a.scale) * 2.2) * 0.5, x1 = a.pos.x + fx * L, z1 = a.pos.z + fz * L;
  a.yaw = Math.atan2(fx, fz);
  a.hop = {x0:a.pos.x, z0:a.pos.z, y0:a.pos.y, x1, z1, t:0, T:0.45, H:L * 0.35}; if (heightAt(x1, z1) > 0.1) aniOnce(a, 'hop');
}
function aniHopStep(a, dt) {
  const H = a.hop; H.t += dt; const u = Math.min(1, H.t / H.T), x = H.x0 + (H.x1 - H.x0) * u, z = H.z0 + (H.z1 - H.z0) * u, g = heightAt(x, z);
  a.pos.x = x; a.pos.z = z; a.air = Math.sin(Math.PI * u) * H.H;
  a.swimT = g < 0.05 ? 1 : 0;
  if (u >= 1) { a.hop = null; a.air = 0; }
}
/* 상어 — 깊은 물을 돌다 사람이 헤엄치면 다가와 문다 · 다치면 깊은 데로 */
function aniShark(a, dt, dx, dz, dist) {
  const D = ANI_DEF.shark, s = a.scale, plY = PL.pos.y;
  a.t += dt; let spd = D.v.walk * Math.sqrt(s), ty = a.pos.y;
  const swimming = PL.swim && !PL.dead && !PL.calm;
  const strong = a.hp >= a.hpMax * 0.4;                                   // 다치면 깊은 데로 물러나 다시 안 쫓는다
  if (!strong && a.state !== 'retreat') { a.state = 'retreat'; a.t = 0; const L = dist || 1;
    a.target.set(a.pos.x - dx / L * 60, clamp(-4 - Math.random() * 4, heightAt(a.pos.x, a.pos.z) + 1.5, -1), a.pos.z - dz / L * 60); }
  if (a.state === 'retreat') { spd = D.v.run * 0.7 * Math.sqrt(s); ty = a.target.y || a.pos.y; if (a.t > 15) { a.state = 'wander'; a.t = 99; } }
  else if (strong && (a.state === 'hunt' || (swimming && dist < D.alert))) {
    if (a.state !== 'hunt') { a.state = 'hunt'; a.t = 0; }
    a.target.set(PL.pos.x, 0, PL.pos.z); ty = plY - 0.6; spd = (dist < 12 ? D.v.run : D.v.walk * 2) * Math.sqrt(s);
    if (dist < 1.4 + s * 0.6 && Math.abs(plY - a.pos.y) < 2 && a.biteT <= 0 && swimming) {
      aniOnce(a, 'bite'); a.biteT = 2.6; if (typeof hurtPL === 'function') hurtPL(D.mean * Math.sqrt(s), '상어'); a.state = 'circle'; a.t = 0; }
    if (!swimming && a.t > 6) { a.state = 'idle'; a.t = 0; }
  } else if (a.state === 'circle') {                                         // 문 뒤 — 크게 돌아 다시
    const an = Math.atan2(a.pos.x - PL.pos.x, a.pos.z - PL.pos.z) + 0.9; a.target.set(PL.pos.x + Math.sin(an) * 9, 0, PL.pos.z + Math.cos(an) * 9); spd = D.v.walk * 2 * Math.sqrt(s);
    if (a.t > 3.5) { a.state = swimming ? 'hunt' : 'idle'; a.t = 0; }
  } else if (Math.hypot(a.target.x - a.pos.x, a.target.z - a.pos.z) < 3 || a.t > 15) {
    for (let k = 0; k < 8; k++) { const an = Math.random() * 6.283, r = 10 + Math.random() * 30, x = a.pos.x + Math.cos(an) * r, z = a.pos.z + Math.sin(an) * r;
      if (heightAt(x, z) < -3) { a.target.set(x, clamp(-1.2 - Math.random() * 4, heightAt(x, z) + 1.5, -0.9), z); a.t = 0; break; } }
    ty = a.target.y || a.pos.y;
  } else ty = a.target.y || a.pos.y;
  if (a.biteT > 0) a.biteT -= dt;
  const tx = a.target.x - a.pos.x, tz = a.target.z - a.pos.z;
  a.yaw += _aAng(Math.atan2(tx, tz) - a.yaw) * clamp(1.6 * dt, 0, 1);
  const st = spd * dt, nx = a.pos.x + Math.sin(a.yaw) * st, nz = a.pos.z + Math.cos(a.yaw) * st, gh = heightAt(nx, nz);
  if (gh < -1.8) { a.pos.x = nx; a.pos.z = nz; } else a.yaw += 1.2 * dt;
  ty = clamp(ty, heightAt(a.pos.x, a.pos.z) + 0.8 * s, -0.5);
  const vy = clamp((ty - a.pos.y) * 0.8, -1.5, 1.5); a.pos.y += vy * dt; a.pitch += (-Math.atan2(vy, Math.max(0.5, spd)) - a.pitch) * clamp(dt * 3, 0, 1);
  a.speed += (spd - a.speed) * clamp(dt * 3, 0, 1);
  aniDraw(a, dt, false); a.blob.visible = false;
}
/* 그리기 — 거리로 꼴을 고르고(가까이 · 멀리 · 안 그림) 몸짓을 짠다 */
function aniDraw(a, dt, dead) {
  const R = a.rig, K = a.kind, D = ANI_DEF[K], d = Math.hypot(a.pos.x - PL.pos.x, a.pos.z - PL.pos.z), s = a.scale;
  const far = (D.small ? 45 : 130) * Math.max(0.6, Math.sqrt(s)), nearD = (D.small ? 9 : 32) * Math.max(0.5, Math.sqrt(s));
  R.visible = d < far; if (!R.visible) return;
  a.near.visible = d < nearD; a.far.visible = !a.near.visible;
  R.position.set(a.pos.x, a.pos.y + a.air, a.pos.z); R.rotation.set(K === 'shark' ? a.pitch : 0, a.yaw, 0, 'YXZ');
  if (dead && a.wings) a.wings[0].visible = a.wings[1].visible = false;
  if (dead) {                                                                // 옆으로 쓰러진다(상어는 배를 위로 · 가라앉는다) · 1분 뒤 땅으로
    const e = Math.min(1, a.deadT / 0.7), ee = e * e * (3 - 2 * e);
    if (K === 'shark') { R.rotation.z = Math.PI * ee; R.position.y = Math.max(heightAt(a.pos.x, a.pos.z) + 0.3 * s, a.pos.y - a.deadT * 0.4); }
    else { R.rotation.z = (K === 'frog' ? Math.PI * 0.9 : 1.45) * ee; R.position.y = a.pos.y + (ANI_DEF[K].cy * 0.35 * s) * ee - Math.max(0, a.deadT - 60) * 0.03 * s; }
    if (a.deadT < 1.2) { a.speed = 0; aniPose(a, dt); }
    return;
  }
  /* 멀면 몸짓은 두 프레임에 한 번 — 건너뛴 프레임은 지난 몸 높이 · 기울기를 그대로 쓰고(안 쓰면 누운 소가 0.8 m 씩 오르내렸다) 그 시간은 다음 몸짓에 더한다 */
  let rt;
  if (d > 70 && (MON.frame + a.id) % 2) { a.skipDt += dt; rt = a.lastRt; }
  else { rt = aniPose(a, dt + a.skipDt); a.skipDt = 0; a.lastRt[0] = rt[0]; a.lastRt[1] = rt[1]; }
  const H = ANIMAL_MESH[a.key].size[1] * s;
  R.position.y += rt[1] * H; R.rotation.x += rt[0];
  /* 몸 기울기의 받침점 — 토끼 · 개구리는 뒷발(앉은 꼴에서 일어서고 뛴다) · 나머지는 몸 가운데 */
  const pz = (ANI_PIV[K] || 0) * ANIMAL_MESH[a.key].size[2] * s;
  if (pz && rt[0]) { const sp = Math.sin(rt[0]), dz = pz * (Math.cos(rt[0]) - 1); R.position.y += pz * sp; R.position.x -= Math.sin(a.yaw) * dz; R.position.z -= Math.cos(a.yaw) * dz; }
  if (a.hitT > 0) R.rotation.z = Math.sin(performance.now() * 0.05) * 0.04 * a.hitT;
  if (a.wings) { const fly = a.state === 'fly'; a.wings[0].visible = a.wings[1].visible = fly;
    if (fly && a.wingA) { a.wings[0].rotation.z = a.wingA[0] - 1.1; a.wings[1].rotation.z = a.wingA[1] + 1.1; } }
}

/* ── 소리 — 음매 · 찍찍 · 꿩꿩 · 사슴 짖음 · 꿀꿀 · 개굴 · 쉭(톱니파 · 잡음 · 거르개 — 97-mobs.js mobVoice 와 같은 소리판 · 거리로 줄인다) ─── */
function aniVoice(kind, p, vol) {
  if (!kind) return;                                                        // 상어는 소리가 없다(쓰러질 때 빈 소리판을 남겼다)
  if (kind === 'baa') { if (typeof mobVoice === 'function') mobVoice('baa', p.x, p.y + 0.8, p.z, vol); return; }
  if (typeof A === 'undefined' || !A.ctx || !A.master) return;
  const dx = p.x - PL.pos.x, dz = p.z - PL.pos.z, d = Math.hypot(dx, dz); if (d > 150) return;
  const ctx = A.ctx, t = ctx.currentTime, g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const rx = Math.cos(PL.yaw) * dx - Math.sin(PL.yaw) * dz;
  if (pan) { pan.pan.value = clamp(rx / Math.max(4, d), -1, 1); g.connect(pan); pan.connect(A.master); } else g.connect(A.master);
  g.gain.value = (vol || 1) * 0.5 / Math.pow(1 + d / 14, 1.4);
  const tone = (type, f0, f1, dur, at, fc, q, pk) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q; const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t + at);
    e.gain.exponentialRampToValueAtTime(pk, t + at + Math.min(0.08, dur * 0.3)); e.gain.setValueAtTime(pk, t + at + dur * 0.7); e.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(f); f.connect(e); e.connect(g); o.start(t + at); o.stop(t + at + dur + 0.05); };
  if (kind === 'moo') { const f0 = 105 + Math.random() * 25; tone('sawtooth', f0 * 0.9, f0 * 1.25, 1.5, 0, 420, 3, 0.6); tone('sawtooth', f0 * 1.8, f0 * 2.4, 1.5, 0, 900, 5, 0.25); }   // 낮게 끌다 올라간다
  else if (kind === 'squeak') { for (let i = 0; i < 2; i++) tone('square', 2600, 1900, 0.09, i * 0.12, 2400, 6, 0.35); }
  else if (kind === 'cackle') { for (let i = 0; i < 2; i++) tone('sawtooth', 1350, 900, 0.16, i * 0.22, 1300, 4, 0.55); }   // 꿩꿩 — 짧게 두 번 쉰 소리
  else if (kind === 'bark') { tone('sawtooth', 620, 380, 0.22, 0, 900, 2.5, 0.7); }                                          // 사슴 — 짧고 거칠게 한 번
  else if (kind === 'roar') { tone('sawtooth', 160, 120, 1.8, 0, 380, 2, 0.7); tone('sawtooth', 320, 240, 1.8, 0, 760, 3, 0.25); }   // 수사슴 울음 — 길게 낮게
  else if (kind === 'grunt') { for (let i = 0; i < 3; i++) tone('sawtooth', 95, 70, 0.14, i * 0.2, 260, 2, 0.7); }               // 꿀꿀
  else if (kind === 'croak') { for (let i = 0; i < 4; i++) tone('square', 240, 200, 0.06, i * 0.09, 500, 3, 0.4); }              // 개굴 — 짧게 떨며
  else if (kind === 'hiss' && A.noise) { const sN = ctx.createBufferSource(); sN.buffer = A.noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3200;
    const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.35, t + 0.03); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    sN.connect(f); f.connect(e); e.connect(g); sN.start(t); sN.stop(t + 0.5); }
}
