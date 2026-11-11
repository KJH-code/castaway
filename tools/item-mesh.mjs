/* tools/item-mesh.mjs — 손에 드는 것의 모형(사용자 STL) → engine/js/data-item-meshes.js(73-item-meshes.js 가 푼다)
   쓰는 법:  node tools/item-mesh.mjs               설정(tools/item-meshes.json)의 전부
            node tools/item-mesh.mjs axe_stone     그것만 — 나머지는 지난 자료 그대로 둔다
            node tools/item-mesh.mjs --list        설정 · 원본이 있나 · 지금 자료에 든 것
   원본(STL)은 레포에 안 담는다(meshes/ 는 무시 목록) — 작업 트리에 없으면 본 저장소(git common dir)의 meshes/ 에서 찾는다.

   하는 일
   ① STL 을 QEM(tools/qem.mjs)으로 줄인다 — 설정의 tris(기본 6000)
   ② **코드로 빚은 모형(WEAPON_FX — 70-weapons.js 를 vm 에서 돌린다)에 맞춘다** — 축을 바꾸는 24 돌림마다 긴 축 길이로 크기를
      맞추고 상자 가운데를 겹친 뒤, 겉 점끼리의 거리(챔퍼)가 가장 작은 돌림을 고른다. 그래서 STL 의 축 · 단위는 아무래도 된다.
      쥐는 자리(grip) · 총구(muzzle) · 세워 들기(rest)는 게임이 코드 모형 것을 그대로 쓴다.
   ③ **빛깔 · 재질도 코드 모형에서** — STL 엔 빛깔이 없다. 세모마다 가장 가까운 코드 모형 부품의 재질(나무 · 돌 · 쇠 · 노끈)을 받고
      이웃 다수결 · 작은 섬 지우기로 얼룩을 없앤다. 재질마다 한 메시(잿불 감싸기 emberClad 가 쇠 재질 메시를 알아본다).
   ④ 각진 모서리(crease°)에서 정점을 갈라 법선을 따로 — 총의 모서리가 뭉개지지 않게.

   설정 한 줄(tools/item-meshes.json): "<아이템 id>": {
     "src": "meshes/items/x.stl",   원본
     "tris": 6000,                  줄일 세모 수
     "rot": [x°, y°, z°],           돌림을 손으로(주면 ② 의 찾기를 안 한다 — 오일러 XYZ · 원본 축 기준)
     "mirror": true,                좌우를 뒤집어 본다(48 돌림 중에서 찾는다)
     "flip": true,                  다 맞춘 뒤 긴 축으로 반 바퀴(위아래가 뒤집혀 보이면)
     "color": "0x2b2d30",           재질을 한 빛깔로(코드 모형 빛깔을 안 받는다)
     "crease": 35,                  모서리로 칠 각(°)
     "len": 1.0,                    긴 축 길이를 코드 모형의 몇 배로
     "isle": 80                     세모 수 / isle 보다 작은 재질 얼룩은 둘레 재질로 지운다(작게 하면 더 크게 뭉친다)
   }
   자료 꼴(ITEM_MESH[id]): {src, tris, fit:{R(3×3 · 원본 → 아이템), s, t, err}, mats:[{k:'w',c} | {k:'p'|'b',c,e,s,sp,d}],
     parts:[{m 재질 번호, mn, mx, nv, nt, i32, b — 자리 u16×3 · 법선 i8×3(4 맞춤) · 번호 u16|u32}]} */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { decimate, readSTL } from './qem.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CFG = path.join(ROOT, 'tools/item-meshes.json');
const OUT = path.join(ROOT, 'engine/js/data-item-meshes.js');
const HEAD = `/* data-item-meshes.js — CASTAWAY · 자료(base64) — 읽지 말 것
   사용자 STL(meshes/items/ — 레포 밖) → tools/item-mesh.mjs(QEM · 코드 모형에 맞춤 · 재질 받기) — 73-item-meshes.js 가 푼다
   설정은 tools/item-meshes.json · 다시 만들기: node tools/item-mesh.mjs */
const ITEM_MESH=`;

/* ── 원본 찾기 — 작업 트리(.claude/worktrees/…)엔 무시된 meshes/ 가 없다 ── */
let MAIN = null;
try { MAIN = path.resolve(execSync('git rev-parse --git-common-dir', { cwd: ROOT }).toString().trim(), '..'); } catch (e) { /* git 밖 */ }
function srcPath(s) {
  for (const base of [ROOT, MAIN]) if (base) { const p = path.resolve(base, s); if (fs.existsSync(p)) return p; }
  return null;
}

/* ── 코드 모형 — three + 70-weapons.js 를 vm 에서(총의 불꽃 muzzleFlash 는 62-build.js 것이라 빈 묶음으로 대신한다) ── */
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/three.min.js'), 'utf8'), ctx);
vm.runInContext('var muzzleFlash=()=>new THREE.Group();', ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/js/70-weapons.js'), 'utf8'), ctx, { filename: '70-weapons.js' });
const THREE = ctx.THREE, WEAPON_FX = vm.runInContext('WEAPON_FX', ctx), WM = vm.runInContext('_WM', ctx);
const wmKey = new Map(Object.entries(WM).map(([k, v]) => [v, k]));

function matDesc(m) {
  const k = wmKey.get(m);
  if (k !== undefined && /^\d+$/.test(k)) return { k: 'w', c: +k };          // WMAT(빛깔) — 게임에서도 같은 재질을 나눠 쓴다
  return { k: m.isMeshBasicMaterial ? 'b' : 'p', c: m.color.getHex(), e: m.emissive ? m.emissive.getHex() : 0,
           s: m.shininess ?? 8, sp: m.specular ? m.specular.getHex() : 0x111111, d: m.side === THREE.DoubleSide ? 1 : 0 };
}
/* 코드 모형의 세모(뿌리 묶음 좌표) — 총구 불꽃 · 비침 · 그물(선) 재질은 뺀다 */
function procOf(id) {
  const r = WEAPON_FX[id](), root = r.mesh; root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), skip = new Set();
  root.traverse(o => { if (o.name === 'flash') o.traverse(c => skip.add(c)); });
  const T = [], L = [], mats = [], key = new Map(), v = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o)) return;
    const m = o.material;
    if (Array.isArray(m) || m.wireframe || m.transparent || m.isShaderMaterial) return;
    const d = matDesc(m), dk = JSON.stringify(d);
    if (!key.has(dk)) { key.set(dk, mats.length); mats.push(d); }
    const li = key.get(dk), M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, p = g.attributes.position;
    for (let i = 0; i + 2 < p.count; i += 3) {
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(p, i + k).applyMatrix4(M); T.push(v.x, v.y, v.z); }
      L.push(li);
    }
  });
  return { T: Float64Array.from(T), L: Int32Array.from(L), mats, gun: !!r.muzzle };
}

/* ── 겉 점 뿌리기(넓이 비례 · 고정 씨앗) ── */
function sampler(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function sample(T, n, L, seed) {             // T: 세모마다 9 수 → n 점(+ 그 세모의 꼬리표)
  const nt = T.length / 9, A = new Float64Array(nt + 1), rnd = sampler(seed);
  for (let t = 0; t < nt; t++) {
    const o = t * 9, ax = T[o + 3] - T[o], ay = T[o + 4] - T[o + 1], az = T[o + 5] - T[o + 2],
          bx = T[o + 6] - T[o], by = T[o + 7] - T[o + 1], bz = T[o + 8] - T[o + 2];
    A[t + 1] = A[t] + 0.5 * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  }
  const P = new Float64Array(n * 3), Lab = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const x = rnd() * A[nt]; let lo = 0, hi = nt - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (A[mid + 1] < x) lo = mid + 1; else hi = mid; }
    let u = rnd(), w = rnd(); if (u + w > 1) { u = 1 - u; w = 1 - w; }
    const o = lo * 9;
    for (let k = 0; k < 3; k++) P[i * 3 + k] = T[o + k] + u * (T[o + 3 + k] - T[o + k]) + w * (T[o + 6 + k] - T[o + k]);
    if (L) Lab[i] = L[lo];
  }
  return { P, L: Lab };
}
function bbox(P) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { if (P[i + k] < mn[k]) mn[k] = P[i + k]; if (P[i + k] > mx[k]) mx[k] = P[i + k]; }
  return { mn, mx, ext: mx.map((v, k) => v - mn[k]), c: mx.map((v, k) => (v + mn[k]) / 2) };
}
/* 한 점 무리에서 다른 무리로 가장 가까운 거리 — 칸 격자로 찾는다 */
function grid(P, h) {
  const m = new Map(), K = (x, y, z) => x + ',' + y + ',' + z;
  for (let i = 0; i < P.length / 3; i++) {
    const k = K(Math.floor(P[i * 3] / h), Math.floor(P[i * 3 + 1] / h), Math.floor(P[i * 3 + 2] / h));
    let a = m.get(k); if (!a) m.set(k, a = []); a.push(i);
  }
  return { near(x, y, z) {                    // → [번호, 거리²] — 칸을 한 겹씩 넓혀 본다
    const cx = Math.floor(x / h), cy = Math.floor(y / h), cz = Math.floor(z / h);
    let best = -1, bd = Infinity;
    for (let r = 0; r < 12; r++) {
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
        if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
        const a = m.get(K(cx + i, cy + j, cz + k)); if (!a) continue;
        for (const q of a) { const dx = P[q * 3] - x, dy = P[q * 3 + 1] - y, dz = P[q * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = q; } }
      }
      if (best >= 0 && Math.sqrt(bd) <= r * h) return [best, bd];   // 다음 겹은 r·h 보다 멀다
    }
    for (let q = 0; q < P.length / 3; q++) { const dx = P[q * 3] - x, dy = P[q * 3 + 1] - y, dz = P[q * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = q; } }
    return [best, bd];                         // 멀리 떨어진 점 — 다 잰다
  } };
}
/* 챔퍼 — 맞지 않는 돌림은 점이 멀리 흩어져 격자가 헛돈다: 점 1,500 개끼리는 그냥 다 잰다 */
function nearAll(A, B) {
  let s = 0; const na = A.length / 3, nb = B.length / 3;
  for (let i = 0; i < na; i++) {
    const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2]; let bd = Infinity;
    for (let j = 0; j < nb; j++) { const dx = B[j * 3] - x, dy = B[j * 3 + 1] - y, dz = B[j * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd) bd = d; }
    s += Math.sqrt(bd);
  }
  return s;
}
const chamfer = (A, B) => (nearAll(A, B) + nearAll(B, A)) / (A.length / 3 + B.length / 3);

/* ── 돌림 — 축을 바꾸는 24(거울 넣으면 48) ── */
function rotations(mirror) {
  const out = [], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms) for (let sg = 0; sg < 8; sg++) {
    const R = new Array(9).fill(0);
    for (let r = 0; r < 3; r++) R[r * 3 + p[r]] = (sg >> r & 1) ? -1 : 1;
    const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
    if (det > 0 || mirror) out.push(R);
  }
  return out;
}
const rotP = (R, P) => { const Q = new Float64Array(P.length);
  for (let i = 0; i < P.length; i += 3) for (let r = 0; r < 3; r++) Q[i + r] = R[r * 3] * P[i] + R[r * 3 + 1] * P[i + 1] + R[r * 3 + 2] * P[i + 2];
  return Q; };
function eulerR(deg) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...deg.map(d => d * Math.PI / 180), 'XYZ')).elements;
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];   // 열 우선 → 행 우선
}
/* R 로 돌린 무리를 코드 모형 상자에 맞추는 크기 · 옮김 — 긴 축 길이로 크기, 상자 가운데로 자리 */
function fitST(Q, pb, len) {
  const qb = bbox(Q), L = pb.ext.indexOf(Math.max(...pb.ext)), s = pb.ext[L] / qb.ext[L] * len;
  return { s, t: pb.c.map((c, k) => c - qb.c[k] * s) };
}
const applyST = (Q, s, t) => { const O = new Float64Array(Q.length); for (let i = 0; i < Q.length; i++) O[i] = Q[i] * s + t[i % 3]; return O; };

/* ── 한 아이템 ── */
function build(id, c) {
  if (!WEAPON_FX[id]) throw new Error(`WEAPON_FX 에 ${id} 가 없다(손에 드는 것만 갈아 끼운다)`);
  const sp = srcPath(c.src); if (!sp) throw new Error(`원본이 없다: ${c.src}`);
  const t0 = Date.now(), M = readSTL(sp), nt0 = M.I.length / 3, want = Math.min(c.tris || 6000, nt0);
  const D = want < nt0 ? decimate(M.P, M.I, [['x', want]]).x : { P: M.P, I: M.I };
  const P0 = Float64Array.from(D.P), I = Uint32Array.from(D.I), nt = I.length / 3;
  const Tm = new Float64Array(nt * 9);
  for (let f = 0; f < nt; f++) for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) Tm[f * 9 + k * 3 + a] = P0[I[f * 3 + k] * 3 + a];

  const pr = procOf(id), pb = bbox(pr.T), h = Math.max(...pb.ext) / 24;
  const pS = sample(pr.T, 1500, null, 7).P, mS = sample(Tm, 1500, null, 11).P;
  let best = null;
  /* 총은 원본의 가장 얇은 축이 너비(아이템 x)여야 한다 — 노리쇠 손잡이가 옆으로 튀어나온 코드 모형은 x 가 더 넓어 챔퍼가 총을 옆으로 눕혔다 */
  const mb = bbox(mS), thin = mb.ext.indexOf(Math.min(...mb.ext));
  const cands = c.rot ? [eulerR(c.rot)] : rotations(!!c.mirror).filter(R => !pr.gun || R[thin] !== 0);
  for (const R of cands) {
    const Q = rotP(R, mS), { s, t } = fitST(Q, pb, c.len || 1), err = chamfer(applyST(Q, s, t), pS);
    if (!best || err < best.err) best = { R, s, t, err };
  }
  /* 총은 위아래가 헷갈린다(코드 모형이 상자라 챔퍼가 못 가른다) — 총열 줄에서 더 멀리 매달린 쪽(손잡이 · 탄창)이 아래(−z).
     게임에선 아이템 +z 가 위다(조준경이 +z). flip 은 그 뒤에 긴 축으로 반 바퀴 */
  const roll = R => [-R[0], -R[1], -R[2], R[3], R[4], R[5], -R[6], -R[7], -R[8]];   // y 축으로 180° 를 앞에 곱함
  if (pr.gun && !c.rot) {
    const hang = R => {
      const Q = applyST(rotP(R, mS), best.s, best.t), b = bbox(Q), top = b.mx[1] - b.ext[1] * 0.12, zs = [];
      for (let i = 0; i < Q.length; i += 3) if (Q[i + 1] > top) zs.push(Q[i + 2]);
      zs.sort((a, b) => a - b); const zb = zs[zs.length >> 1];                   // 총구 쪽 12% 의 가운데 높이 = 총열 줄
      return (zb - b.mn[2]) - (b.mx[2] - zb);                                    // 아래로 매달린 길이 − 위로 솟은 길이
    };
    if (hang(best.R) < 0) { const R2 = roll(best.R), f2 = fitST(rotP(R2, mS), pb, c.len || 1); best = { ...best, R: R2, ...f2, err: chamfer(applyST(rotP(R2, mS), f2.s, f2.t), pS), hang: 1 }; }
  }
  if (c.flip) { const R2 = roll(best.R), f2 = fitST(rotP(R2, mS), pb, c.len || 1); best = { ...best, R: R2, ...f2 }; }
  const { R, s, t } = best, P = applyST(rotP(R, P0), s, t);
  const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
  if (det < 0) for (let f = 0; f < nt; f++) { const a = I[f * 3 + 1]; I[f * 3 + 1] = I[f * 3 + 2]; I[f * 3 + 2] = a; }   // 거울이면 면 차례도

  /* 재질 — 세모 가운데에서 가장 가까운 코드 모형 겉 점의 꼬리표 → 이웃 다수결 → 작은 섬 지우기 */
  let mats, lab = new Int32Array(nt);
  if (c.color) mats = [{ k: 'w', c: parseInt(c.color, 16) }];
  else {
    mats = pr.mats;
    const dense = sample(pr.T, 40000, pr.L, 3), g = grid(dense.P, h / 3);
    for (let f = 0; f < nt; f++) {
      const a = I[f * 3] * 3, b = I[f * 3 + 1] * 3, d = I[f * 3 + 2] * 3;
      lab[f] = dense.L[g.near((P[a] + P[b] + P[d]) / 3, (P[a + 1] + P[b + 1] + P[d + 1]) / 3, (P[a + 2] + P[b + 2] + P[d + 2]) / 3)[0]];
    }
    const em = new Map(), nb = Array.from({ length: nt }, () => []);
    for (let f = 0; f < nt; f++) for (let k = 0; k < 3; k++) {
      const u = I[f * 3 + k], v = I[f * 3 + (k + 1) % 3], key = u < v ? u + ',' + v : v + ',' + u, o = em.get(key);
      if (o === undefined) em.set(key, f); else { nb[f].push(o); nb[o].push(f); }
    }
    for (let pass = 0; pass < 6; pass++) {
      const nl = lab.slice();
      for (let f = 0; f < nt; f++) {
        const cnt = new Map(); for (const o of nb[f]) cnt.set(lab[o], (cnt.get(lab[o]) || 0) + 1);
        for (const [l, n] of cnt) if (l !== lab[f] && n >= 2) nl[f] = l;
      }
      lab = nl;
    }
    const minIsle = Math.max(12, nt / (c.isle || 80));          // 이보다 작은 얼룩은 둘레 재질로
    for (let pass = 0; pass < 3; pass++) {
      const seen = new Int32Array(nt).fill(-1);
      for (let f0 = 0; f0 < nt; f0++) {
        if (seen[f0] >= 0) continue;
        const comp = [f0]; seen[f0] = f0;
        for (let i = 0; i < comp.length; i++) for (const o of nb[comp[i]]) if (seen[o] < 0 && lab[o] === lab[f0]) { seen[o] = f0; comp.push(o); }
        if (comp.length >= minIsle) continue;
        const cnt = new Map();
        for (const f of comp) for (const o of nb[f]) if (lab[o] !== lab[f0]) cnt.set(lab[o], (cnt.get(lab[o]) || 0) + 1);
        let bl = lab[f0], bn = 0; for (const [l, n] of cnt) if (n > bn) { bn = n; bl = l; }
        for (const f of comp) lab[f] = bl;
      }
    }
  }

  /* 재질마다 한 메시 · 모서리에서 정점 가르기 · 쪼개 담기 */
  const cosC = Math.cos((c.crease ?? 35) * Math.PI / 180), FN = new Float64Array(nt * 3), FA = new Float64Array(nt);
  for (let f = 0; f < nt; f++) {
    const a = I[f * 3] * 3, b = I[f * 3 + 1] * 3, d = I[f * 3 + 2] * 3;
    const ax = P[b] - P[a], ay = P[b + 1] - P[a + 1], az = P[b + 2] - P[a + 2], bx = P[d] - P[a], by = P[d + 1] - P[a + 1], bz = P[d + 2] - P[a + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, L = Math.hypot(nx, ny, nz) || 1;
    FN[f * 3] = nx / L; FN[f * 3 + 1] = ny / L; FN[f * 3 + 2] = nz / L; FA[f] = L / 2;
  }
  const used = [...new Set(lab)].sort((a, b) => a - b), parts = [], outMats = [];
  for (const li of used) {
    const faces = []; for (let f = 0; f < nt; f++) if (lab[f] === li) faces.push(f);
    const vf = new Map();                     // 원래 정점 → 그 정점을 쓰는 세모들
    for (const f of faces) for (let k = 0; k < 3; k++) { const v = I[f * 3 + k]; let a = vf.get(v); if (!a) vf.set(v, a = []); a.push(f); }
    const VP = [], VN = [], corner = new Map();    // (세모, 꼭짓점) → 새 정점
    for (const [v, fs] of vf) {
      const cl = [];                          // 무리: {n 합, fs}
      for (const f of fs) {
        const n = [FN[f * 3], FN[f * 3 + 1], FN[f * 3 + 2]];
        let hit = null;
        for (const q of cl) { const L = Math.hypot(...q.n) || 1; if ((q.n[0] * n[0] + q.n[1] * n[1] + q.n[2] * n[2]) / L >= cosC) { hit = q; break; } }
        if (!hit) cl.push(hit = { n: [0, 0, 0], fs: [] });
        for (let k = 0; k < 3; k++) hit.n[k] += n[k] * FA[f];
        hit.fs.push(f);
      }
      for (const q of cl) {
        const ni = VP.length / 3, L = Math.hypot(...q.n) || 1;
        VP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); VN.push(q.n[0] / L, q.n[1] / L, q.n[2] / L);
        for (const f of q.fs) for (let k = 0; k < 3; k++) if (I[f * 3 + k] === v) corner.set(f * 3 + k, ni);
      }
    }
    const nv = VP.length / 3, i32 = nv > 65535 ? 1 : 0, b = bbox(VP);
    const mn = b.mn.map(x => +x.toFixed(5)), mx = b.mx.map((x, k) => Math.max(+x.toFixed(5), mn[k] + 1e-5));
    const pb4 = (nv * 6 + 3) & ~3, nb4 = (nv * 3 + 3) & ~3, buf = Buffer.alloc(pb4 + nb4 + faces.length * 3 * (i32 ? 4 : 2));
    for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) {
      buf.writeUInt16LE(Math.max(0, Math.min(65535, Math.round((VP[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535))), (i * 3 + k) * 2);
      buf.writeInt8(Math.max(-127, Math.min(127, Math.round(VN[i * 3 + k] * 127))), pb4 + i * 3 + k);
    }
    faces.forEach((f, j) => { for (let k = 0; k < 3; k++) {
      const v = corner.get(f * 3 + k), o = pb4 + nb4 + (j * 3 + k) * (i32 ? 4 : 2);
      if (i32) buf.writeUInt32LE(v, o); else buf.writeUInt16LE(v, o);
    } });
    parts.push({ m: outMats.length, mn, mx, nv, nt: faces.length, i32, b: buf.toString('base64') });
    outMats.push(mats[li]);
  }
  const share = parts.map((p, i) => `${(p.nt / nt * 100).toFixed(0)}% ${JSON.stringify(outMats[i].c.toString(16))}`).join(' · ');
  console.log(`${id.padEnd(13)} ${path.basename(c.src)} · 세모 ${nt0} → ${nt}${best.hang ? ' · 총 위아래 뒤집음' : ''} · 맞춤 오차 ${(best.err / Math.max(...pb.ext) * 100).toFixed(2)}% · 재질 ${share} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { src: path.basename(c.src), tris: nt, fit: { R, s: +s.toPrecision(6), t: t.map(v => +v.toFixed(5)), err: +(best.err / Math.max(...pb.ext)).toFixed(5) }, mats: outMats, parts };
}

/* ── 차례 ── */
const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
delete cfg._;                                 // 설명 줄
let old = {};
if (fs.existsSync(OUT)) { const s = fs.readFileSync(OUT, 'utf8'), M = 'const ITEM_MESH=', i = s.indexOf(M); if (i >= 0) old = JSON.parse(s.slice(i + M.length).replace(/;\s*$/, '')); }
const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const [id, c] of Object.entries(cfg)) console.log(id.padEnd(13), srcPath(c.src) ? '원본 있음' : '원본 없음', old[id] ? `자료 있음(${old[id].tris} 세모)` : '자료 없음', c.src);
  for (const id of Object.keys(old)) if (!cfg[id]) console.log(id.padEnd(13), '설정에 없다 — 다음에 전부 만들면 빠진다');
  process.exit(0);
}
const ids = args.length ? args : Object.keys(cfg), out = args.length ? old : {};
for (const id of Object.keys(out)) if (!cfg[id]) delete out[id];
let bad = 0;
for (const id of ids) {
  if (!cfg[id]) { console.error(`${id}: 설정에 없다`); bad++; continue; }
  try { out[id] = build(id, cfg[id]); } catch (e) { console.error(`${id}: ${e.message}`); bad++; if (old[id]) out[id] = old[id]; }
}
fs.writeFileSync(OUT, HEAD + JSON.stringify(out) + ';\n');
console.log(`→ ${path.relative(ROOT, OUT)} · ${Object.keys(out).length} 개 · ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
process.exit(bad ? 1 : 0);
