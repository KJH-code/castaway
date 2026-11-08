/* 97-animals.js — CASTAWAY
   들짐승(사용자 요청 2026-11-08 '동물을 들여라') — 소 · 토끼 · 꿩.
   (island_world.html 이 이 차례로 읽는다 — 97-sheep.js 다음 · 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   들짐승
   ----------------------------------------------------------------------------
   · 양(97-sheep.js)과 같은 틀 — 사람 둘레 60~140 m(보는 쪽 뒤)에 무리로 세우고 240 m 넘게 멀어지면 거둔다 · 저장하지 않는다 ·
     '몬스터 수' 설정과 따로. 맞는 공은 몬스터와 같은 대역(`mobProxy` — 근접 · 총 · 화살 · 폭발이 다 듣는다) · 쓰러지면 사체(`MOB_LOOT`).
   · 몸은 모형 없이 조각을 묶어 짓는다(몸통 · 목 · 머리 · 다리 · 꼬리 · 날개) — 조각을 돌려 움직인다. 그리기 호출을 아끼려고
     한 조각 안의 작은 것(코 · 귀 · 뿔 · 발굽)은 정점 빛깔로 합친다. 110 m 밖은 그리지 않는다.
   · **소**(풀밭 · 덤불 땅 · 넓은잎숲 가 · 둘~넷 무리) — 사용자가 준 사진 셋(`textures/` → data-animal-textures.js)의 몸통 · 머리를 잘라
     무늬로 입힌다: 황소(누런 한우) · 칡소(짙은 밤색 · 뿔) · 얼룩소(흰 바탕에 밤색 얼룩). 풀 뜯기 → 몇 걸음 → 뜯기 · 사람이 곁에 오면 쳐다본다 ·
     맞으면 무리가 달아난다(초속 6 m · 6초). 음매(톱니파 · 낮게 끌다 올라간다).
   · **토끼**(풀밭 · 덤불 땅 · 숲 · 혼자나 둘) — 앉아서 오물거리다 깡충 몇 번. 사람이 22 m 안이면 굳어 귀를 세우고, 11 m 안이거나
     뛰어오면 갈지자로 내뺀다(초속 9 m · 0.6~1초마다 꺾는다). 찍찍.
   · **꿩**(풀밭 · 덤불 · 숲 · 대숲 · 하나~셋) — 걸으며 고개를 까딱이고 땅을 쫀다. 수꿩은 구릿빛 몸 · 초록 머리 · 붉은 볏 · 흰 목테 · 긴 꼬리,
     까투리는 얼룩진 밤색. 6 m 안이거나 뛰어오면 푸드덕 날아올라(꿩꿩) 40~70 m 를 미끄러져 내려앉는다.
   ========================================================================== */
MON.ani = [];
const ANI_DEF = {
  cow:      {max:5, hp:140, r:0.85, herd:[2,4], name:'소를',   voice:'moo',    cy:1.0},
  hare:     {max:4, hp:12,  r:0.26, herd:[1,2], name:'토끼를', voice:'squeak', cy:0.2},
  pheasant: {max:4, hp:10,  r:0.30, herd:[1,3], name:'꿩을',   voice:'cackle', cy:0.3}
};
const ANI_KINDS = ['cow', 'hare', 'pheasant'];
let ANI_T = 0, ANI_K = 0, ANI_HERD = 0, ANI_BUILT = false;

/* 아이템 · 굽기 · 떨구는 것 */
Object.assign(ITEMS, {
  meat_beef: {n:'쇠고기',   kg:1.6,  c:0xa8443c, use:'날고기 — 구워 먹어야 탈이 없다', food:9, raw:true, tags:['meat']},
  meat_hare: {n:'토끼고기', kg:0.6,  c:0xb86a5e, use:'날고기 — 구워 먹어야 탈이 없다', food:4, raw:true, tags:['meat']},
  meat_bird: {n:'꿩고기',   kg:0.5,  c:0xc4786a, use:'날고기 — 구워 먹어야 탈이 없다', food:4, raw:true, tags:['meat']}
});
if (typeof FIRING !== 'undefined') for (const id of ['meat_beef', 'meat_hare', 'meat_bird']) if (!FIRING[id]) FIRING[id] = {out:'meat_cooked', hours:id === 'meat_beef' ? 0.25 : 0.15, count:1};
MOB_LOOT.cow = [['meat_beef', 4], ['hide', 2], ['bone', 2]];
MOB_LOOT.hare = [['meat_hare', 1], ['hide', 1]];
MOB_LOOT.pheasant = [['meat_bird', 1], ['feather', 6]];

/* ── 조각 ─────────────────────────────────────────────────────────────────── */
const _aM = new THREE.Matrix4(), _aQ = new THREE.Quaternion(), _aE = new THREE.Euler(), _aV = new THREE.Vector3(), _aS = new THREE.Vector3(), _aC = new THREE.Color();
/* 타원체 — 무늬를 옆에서 비춘다(u: 앞→뒤 · v: 아래→위) */
function aniEll(rx, ry, rz, ws, hs) {
  const g = new THREE.SphereGeometry(1, ws || 14, hs || 10), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); uv.setXY(i, 0.5 - 0.44 * z, 0.5 + 0.42 * y); p.setXYZ(i, x * rx, y * ry, z * rz); }   // 끝은 사진 안쪽에서(가장자리 흰 바탕 · 둥근 끝의 고리 무늬가 안 보이게)
  g.computeVertexNormals(); return g;
}
/* 여러 조각을 정점 빛깔로 한 꼴에 — [꼴, 빛깔, [x,y,z], [rx,ry,rz], [sx,sy,sz]] */
function aniMerge(parts) {
  const P = [], Nn = [], C = [];
  for (const [g0, col, pos, rot, sc] of parts) {
    const g = g0.index ? g0.toNonIndexed() : g0.clone();
    _aE.set(...(rot || [0, 0, 0])); _aQ.setFromEuler(_aE); _aV.set(...(pos || [0, 0, 0])); _aS.set(...(sc || [1, 1, 1]));
    _aM.compose(_aV, _aQ, _aS); g.applyMatrix4(_aM); _aC.set(col);
    const a = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < a.length; i++) { P.push(a[i]); Nn.push(n[i]); }
    for (let i = 0; i < a.length / 3; i++) C.push(_aC.r, _aC.g, _aC.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeBoundingSphere(); return g;
}
const aniCyl = (r0, r1, len, seg) => { const g = new THREE.CylinderGeometry(r1, r0, len, seg || 6, 1); g.translate(0, -len / 2, 0); return g; };   // 위 끝이 원점 · 아래로
const _aniMats = {};
const aniVC = () => _aniMats.vc || (_aniMats.vc = new THREE.MeshLambertMaterial({vertexColors:true}));
function aniMesh(g, mat, parent) { const m = new THREE.Mesh(g, mat); m.userData.lightRole = 'recv'; parent.add(m); return m; }

/* 사진에서 몸통 · 머리 자리를 잘라 무늬로 — 사진은 머리가 왼쪽(밤색 소는 오른쪽이라 뒤집는다). 평균 빛깔도 잰다(다리 · 목) */
const ANI_CROP = {
  yellow:  {body:[0.34, 0.17, 0.82, 0.54], head:[0.15, 0.12, 0.29, 0.38], flip:false, horn:false},
  brown:   {gen:0x6a3a22, horn:true},                                       // 사용자 사진(organics/browncow.jpg)에 스톡 사진 워터마크가 비쳐 그 빛깔로 무늬를 짓는다
  spotted: {body:[0.31, 0.16, 0.84, 0.54], head:[0.13, 0.11, 0.24, 0.32], flip:false, horn:false}
};
/* 사진 없이 털 무늬 — 한 빛깔에 잔 얼룩 · 등은 짙게 */
function aniGenTex(col, W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), c = new THREE.Color(col), r = mulberry32(0x5eed ^ col);
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#' + c.clone().multiplyScalar(0.78).getHexString()); grd.addColorStop(0.6, '#' + c.getHexString()); grd.addColorStop(1, '#' + c.clone().multiplyScalar(0.9).getHexString());
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let k = 0; k < W * H / 40; k++) { const t = 0.85 + r() * 0.3; g.fillStyle = '#' + c.clone().multiplyScalar(t).getHexString(); g.globalAlpha = 0.35; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }
  g.globalAlpha = 1; const t = new THREE.CanvasTexture(cv); return t;
}
function aniCowTex(breed, done) {
  const C0 = ANI_CROP[breed];
  if (C0.gen) { done({body:aniGenTex(C0.gen, 256, 128), head:aniGenTex(new THREE.Color(C0.gen).multiplyScalar(0.85).getHex(), 128, 96), avg:C0.gen}); return; }
  const img = new Image();
  img.onload = () => {
    const out = {}, C = ANI_CROP[breed];
    for (const part of ['body', 'head']) {
      const [x0, y0, x1, y1] = C[part], W = part === 'body' ? 256 : 128, H = part === 'body' ? 128 : 96;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      if (C.flip) { g.translate(W, 0); g.scale(-1, 1); }
      g.drawImage(img, x0 * img.width, y0 * img.height, (x1 - x0) * img.width, (y1 - y0) * img.height, 0, 0, W, H);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; out[part] = t;
      if (part === 'body') { const d = g.getImageData(0, H * 0.55, W, H * 0.4).data; let r = 0, gg = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } out.avg = (Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n); }
    }
    done(out);
  };
  img.src = ANIMAL_TEX[breed];
}

/* ── 소 ─────────────────────────────────────────────────────────────────── */
function aniMakeCow(i, breed) {
  const T = _aniMats['cow_' + breed], rig = new THREE.Group(); rig.visible = false; scene.add(rig);
  const C = ANI_CROP[breed], legC = breed === 'spotted' ? 0xe6dfd2 : T.avg, dark = new THREE.Color(T.avg).multiplyScalar(0.62).getHex();
  aniMesh(aniEll(0.40, 0.46, 0.98), T.body, rig).position.set(0, 1.04, 0);                                   // 몸통(사진 무늬)
  /* 젖 · 엉덩이 아래 — 정점 빛깔 */
  aniMesh(aniMerge([[new THREE.SphereGeometry(0.13, 8, 6), 0xd8a89a, [0, 0.62, -0.42], null, [1, 0.7, 1.3]]]), aniVC(), rig);
  const neck = new THREE.Group(); neck.position.set(0, 1.26, 0.78); rig.add(neck);                         // 목 — 숙이면 머리가 따라 내려간다
  aniMesh(aniMerge([[aniCyl(0.24, 0.17, 0.55, 8), T.avg, [0, 0, 0], [-1.15, 0, 0]]]), aniVC(), neck);
  const head = new THREE.Group(); head.position.set(0, -0.08, 0.5); neck.add(head);
  aniMesh(aniEll(0.17, 0.2, 0.3, 12, 8), T.head, head).position.set(0, -0.06, 0.12);
  const hx = [[new THREE.SphereGeometry(0.12, 8, 6), 0x3a2a28, [0, -0.13, 0.36], null, [1, 0.8, 0.8]],                // 코
              [new THREE.SphereGeometry(0.07, 6, 4), legC, [0.17, 0.06, 0.0], [0, 0, -0.5], [1.6, 0.45, 1]],           // 귀
              [new THREE.SphereGeometry(0.07, 6, 4), legC, [-0.17, 0.06, 0.0], [0, 0, 0.5], [1.6, 0.45, 1]]];
  if (C.horn) hx.push([new THREE.ConeGeometry(0.035, 0.22, 6), 0xe0d6bc, [0.12, 0.17, 0.0], [0, 0, -0.7]], [new THREE.ConeGeometry(0.035, 0.22, 6), 0xe0d6bc, [-0.12, 0.17, 0.0], [0, 0, 0.7]]);
  aniMesh(aniMerge(hx), aniVC(), head);
  const legs = [];
  for (const [x, z] of [[0.22, 0.62], [-0.22, 0.62], [0.22, -0.66], [-0.22, -0.66]]) {
    const L = new THREE.Group(); L.position.set(x, 0.86, z); rig.add(L);
    aniMesh(aniMerge([[aniCyl(0.085, 0.06, 0.78, 6), legC, [0, 0, 0]], [aniCyl(0.065, 0.07, 0.1, 6), 0x2a2420, [0, -0.78, 0]]]), aniVC(), L);
    legs.push(L); }
  const tail = new THREE.Group(); tail.position.set(0, 1.3, -0.96); rig.add(tail);
  aniMesh(aniMerge([[aniCyl(0.03, 0.02, 0.7, 5), T.avg, [0, 0, 0], [0.12, 0, 0]], [new THREE.SphereGeometry(0.06, 6, 4), dark, [0, -0.72, -0.08], null, [1, 1.8, 1]]]), aniVC(), tail);
  return {rig, neck, head, legs, tail, breed};
}
/* ── 토끼 ────────────────────────────────────────────────────────────────── */
function aniMakeHare(i) {
  const rig = new THREE.Group(); rig.visible = false; scene.add(rig);
  const fur = 0x8a7456, belly = 0xcab89a, body = new THREE.Group(); rig.add(body);
  aniMesh(aniMerge([[new THREE.SphereGeometry(1, 10, 8), fur, [0, 0.19, 0], null, [0.12, 0.13, 0.21]],
                    [new THREE.SphereGeometry(1, 8, 6), belly, [0, 0.15, 0.02], null, [0.1, 0.09, 0.17]],
                    [new THREE.SphereGeometry(0.045, 6, 4), 0xf2eee6, [0, 0.23, -0.21]],                                   // 흰 꼬리
                    [aniCyl(0.022, 0.018, 0.14, 5), fur, [0.06, 0.12, 0.13]], [aniCyl(0.022, 0.018, 0.14, 5), fur, [-0.06, 0.12, 0.13]]]), aniVC(), body);   // 앞다리
  const head = new THREE.Group(); head.position.set(0, 0.27, 0.17); body.add(head);
  aniMesh(aniMerge([[new THREE.SphereGeometry(1, 8, 6), fur, [0, 0, 0.03], null, [0.07, 0.07, 0.09]],
                    [new THREE.SphereGeometry(0.014, 4, 3), 0x111111, [0.05, 0.02, 0.06]], [new THREE.SphereGeometry(0.014, 4, 3), 0x111111, [-0.05, 0.02, 0.06]],
                    [new THREE.SphereGeometry(1, 6, 4), 0x9a8466, [0.03, 0.13, -0.03], [-0.35, 0, -0.12], [0.022, 0.12, 0.04]],   // 긴 귀
                    [new THREE.SphereGeometry(1, 6, 4), 0x9a8466, [-0.03, 0.13, -0.03], [-0.35, 0, 0.12], [0.022, 0.12, 0.04]]]), aniVC(), head);
  const legs = [];
  for (const x of [0.07, -0.07]) { const L = new THREE.Group(); L.position.set(x, 0.17, -0.1); body.add(L);   // 뒷다리 — 뛸 때 뻗는다
    aniMesh(aniMerge([[new THREE.SphereGeometry(1, 6, 5), fur, [0, -0.04, 0.02], null, [0.04, 0.08, 0.1]], [new THREE.SphereGeometry(1, 5, 4), fur, [0, -0.14, 0.07], null, [0.03, 0.02, 0.08]]]), aniVC(), L);
    legs.push(L); }
  return {rig, body, head, legs};
}
/* ── 꿩 ─────────────────────────────────────────────────────────────────── */
function aniMakePheasant(i) {
  const rig = new THREE.Group(); rig.visible = false; scene.add(rig);
  const male = Math.random() < 0.6, B0 = male ? 0x9a4a24 : 0x8a6a48, body = new THREE.Group(); rig.add(body);
  const parts = [[new THREE.SphereGeometry(1, 10, 8), B0, [0, 0.27, 0], null, [0.11, 0.11, 0.2]],
                 [aniCyl(0.008, 0.006, 0.16, 4), 0x8a8478, [0.04, 0.17, 0.02]], [aniCyl(0.008, 0.006, 0.16, 4), 0x8a8478, [-0.04, 0.17, 0.02]]];
  if (!male) parts.push([new THREE.SphereGeometry(1, 8, 6), 0x6a4e34, [0, 0.33, -0.02], null, [0.09, 0.05, 0.16]]);   // 까투리 등 얼룩
  aniMesh(aniMerge(parts), aniVC(), body);
  const head = new THREE.Group(); head.position.set(0, 0.36, 0.15); body.add(head);
  const hp = [[new THREE.SphereGeometry(1, 8, 6), male ? 0x1f4a3e : 0x7a5e40, [0, 0.03, 0.02], null, [0.045, 0.06, 0.05]],
              [new THREE.ConeGeometry(0.015, 0.05, 5), 0xc8b88a, [0, 0.02, 0.08], [Math.PI / 2, 0, 0]]];
  if (male) hp.push([new THREE.SphereGeometry(1, 6, 4), 0xc02a20, [0, 0.04, 0.04], null, [0.05, 0.035, 0.03]],       // 붉은 볏
                    [aniCyl(0.05, 0.05, 0.02, 10), 0xf0ece4, [0, -0.02, 0]]);                                         // 흰 목테
  aniMesh(aniMerge(hp), aniVC(), head);
  const tail = new THREE.Group(); tail.position.set(0, 0.3, -0.17); body.add(tail);
  aniMesh(aniMerge([[new THREE.BoxGeometry(0.05, 0.012, male ? 0.55 : 0.32), male ? 0x8a6a44 : 0x7a6044, [0, 0, -(male ? 0.27 : 0.16)]]]), aniVC(), tail);
  const wings = [];
  for (const s of [1, -1]) { const W = new THREE.Group(); W.position.set(0.08 * s, 0.31, 0.02); body.add(W);
    aniMesh(aniMerge([[new THREE.SphereGeometry(1, 8, 5), male ? 0x7a6a50 : 0x7a6044, [0.17 * s, 0, -0.02], null, [0.19, 0.015, 0.11]]]), aniVC(), W);
    W.visible = false; wings.push(W); }
  return {rig, body, head, tail, wings, male};
}

/* ── 짓기(섬을 다 지은 뒤 한 번 — 97-mobs.js mobsBuild) ─────────────────────── */
function animalsBuild() {
  for (const a of MON.ani) aniOff(a);
  if (ANI_BUILT || typeof ANIMAL_TEX === 'undefined') return;
  ANI_BUILT = true;
  const breeds = ['yellow', 'brown', 'spotted']; let ready = 0;
  for (const br of breeds) aniCowTex(br, T => {
    _aniMats['cow_' + br] = {body:new THREE.MeshLambertMaterial({map:T.body}), head:new THREE.MeshLambertMaterial({map:T.head}), avg:T.avg};
    if (++ready === breeds.length) {
      let id = 0;
      for (let k = 0; k < ANI_DEF.cow.max; k++) MON.ani.push(aniWrap('cow', id++, aniMakeCow(k, breeds[k % 3])));
      for (let k = 0; k < ANI_DEF.hare.max; k++) MON.ani.push(aniWrap('hare', id++, aniMakeHare(k)));
      for (let k = 0; k < ANI_DEF.pheasant.max; k++) MON.ani.push(aniWrap('pheasant', id++, aniMakePheasant(k)));
    } });
}
function aniWrap(kind, id, body) {
  const D = ANI_DEF[kind];
  const a = Object.assign(body, {kind, id, pos:new THREE.Vector3(), yaw:0, hp:D.hp, hp0:D.hp, hpMax:D.hp, alive:false, active:false, alerted:false, frz:0,
    state:'idle', t:0, dur:3, target:new THREE.Vector3(), speed:0, ph:Math.random() * 6.283, herd:null, flee:null, lookY:0, graze:0, hitT:0, deadT:0,
    voiceT:4 + Math.random() * 12, prox:[], pick:null, fly:null, zz:0, hop:0, air:0});
  a.blob = mobBlob(kind === 'cow' ? 0.9 : 0.25);
  a.prox.push(mobProxy(a, () => _aniP.set(a.pos.x, a.pos.y + a.air + D.cy + 1, a.pos.z), D.r));   // 대역의 y 는 가운데 − 1
  return a;
}
const _aniP = new THREE.Vector3();
function aniOff(a) {
  if (!a) return;
  mobRegister(a, false); a.active = false; a.alive = false; a.rig.visible = false; a.blob.visible = false;
  const i = MON.picks.indexOf(a.pick); if (i >= 0) MON.picks.splice(i, 1); a.pick = null;
}

/* ── 세우고 거두기 ─────────────────────────────────────────────────────────── */
function aniLand(kind, x, z) {
  const h = heightAt(x, z); if (h < 0.8) return false;
  const b = mobBiome(x, z);
  const ok = kind === 'cow' ? (b === B.MEADOW || b === B.SCRUB || b === B.BROADLEAF)
           : kind === 'hare' ? (b === B.MEADOW || b === B.SCRUB || b === B.BROADLEAF || b === B.CONIFER || b === B.DUNE)
           : (b === B.MEADOW || b === B.SCRUB || b === B.BROADLEAF || (B.BAMBOO !== undefined && b === B.BAMBOO));
  if (!ok) return false;
  if (Math.abs(heightAt(x + 3, z) - h) + Math.abs(heightAt(x, z + 3) - h) > (kind === 'cow' ? 2.0 : 3.0)) return false;
  if (typeof boulderAt === 'function' && boulderAt(x, z, kind === 'cow' ? 1.2 : 0.4)) return false;
  return true;
}
function aniSpawner() {
  const px = PL.pos.x, pz = PL.pos.z;
  for (const a of MON.ani) if (a.active) { const d = Math.hypot(a.pos.x - px, a.pos.z - pz); if (d > 240 || (!a.alive && a.deadT > 90)) aniOff(a); }
  if (PL.under || PL.swim || PL.cave) return;
  const kind = ANI_KINDS[(ANI_K++) % ANI_KINDS.length], D = ANI_DEF[kind];
  const free = MON.ani.filter(a => a.kind === kind && !a.active); if (!free.length || Math.random() > 0.45) return;
  const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
  for (let t = 0; t < 14; t++) {
    const an = Math.random() * 6.283, r = 60 + Math.random() * 80, x = px + Math.cos(an) * r, z = pz + Math.sin(an) * r;
    if (Math.cos(an) * fx + Math.sin(an) * fz > 0.45 || !aniLand(kind, x, z)) continue;
    const herd = {id:++ANI_HERD, x, z}, n = Math.min(free.length, D.herd[0] + ((Math.random() * (D.herd[1] - D.herd[0] + 1)) | 0));
    for (let k = 0; k < n; k++) { const sx = x + (Math.random() - 0.5) * (kind === 'cow' ? 10 : 6), sz = z + (Math.random() - 0.5) * (kind === 'cow' ? 10 : 6);
      if (aniLand(kind, sx, sz)) aniSpawn(free[k], sx, sz, herd); }
    return;
  }
}
function aniSpawn(a, x, z, herd) {
  a.active = a.alive = true; a.hp = a.hp0 = a.hpMax; a.herd = herd; a.alerted = false; a.frz = 0; a.deadT = 0; a.hitT = 0; a.flee = null; a.fly = null; a.air = 0;
  a.pos.set(x, heightAt(x, z), z); a.yaw = Math.random() * 6.283; a.state = 'idle'; a.t = 0; a.dur = 2 + Math.random() * 6; a.graze = 0;
  a.rig.visible = true; a.rig.rotation.set(0, a.yaw, 0);
  mobRegister(a, true);
}

/* ── 돌보기(매 프레임 — 97-mobs.js updateMobs) ──────────────────────────────── */
function animalsUpdate(dt) {
  if (!MON.ani.length) return;
  ANI_T -= dt; if (ANI_T <= 0) { ANI_T = 1.6; aniSpawner(); }
  for (const a of MON.ani) if (a.active) aniTick(a, dt);
}
const _aAng = a => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
function aniPanic(a, from) {
  if (a.kind === 'cow') { for (const b of MON.ani) if (b.active && b.alive && b.kind === 'cow' && b.herd === a.herd) { b.state = 'flee'; b.t = 0; b.dur = 5 + Math.random() * 3; b.flee = from; } return; }
  if (a.kind === 'pheasant') { aniFlush(a, from); return; }
  a.state = 'flee'; a.t = 0; a.dur = 4 + Math.random() * 2.5; a.flee = from; a.zz = 0;
  if (a.kind === 'hare') aniVoice('squeak', a.pos, 0.6);
}
/* 꿩이 날아오른다 — 사람 반대쪽(조금 비껴)으로 40~70 m 를 미끄러진다. 내려앉을 자리가 땅이 아니면 더 간다 */
function aniFlush(a, from) {
  if (a.fly) return;
  let fx = a.pos.x - from.x, fz = a.pos.z - from.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
  const sk = (Math.random() - 0.5) * 0.9, c = Math.cos(sk), s = Math.sin(sk), dx = fx * c - fz * s, dz = fx * s + fz * c;
  let d = 40 + Math.random() * 30, ex = a.pos.x + dx * d, ez = a.pos.z + dz * d;
  for (let k = 0; k < 6 && !aniLand('pheasant', ex, ez); k++) { d += 12; ex = a.pos.x + dx * d; ez = a.pos.z + dz * d; }
  a.fly = {x0:a.pos.x, z0:a.pos.z, y0:a.pos.y, ex, ez, T:d / 9, t:0}; a.state = 'fly'; a.yaw = Math.atan2(dx, dz);
  aniVoice('cackle', a.pos, 1.0); mobVoice('flap', a.pos.x, a.pos.y + 0.5, a.pos.z, 0.5);
}
function aniTick(a, dt) {
  if (!a.alive) { a.deadT += dt; a.blob.visible = false; a.air = Math.max(0, a.air - dt * 6); aniPose(a, dt); return; }
  if (a.hp < a.hp0) { a.hitT = 0.4; aniPanic(a, {x:PL.pos.x, z:PL.pos.z}); if (a.kind === 'cow') aniVoice('moo', a.pos, 1.3); }
  a.hp0 = a.hp; if (a.hitT > 0) a.hitT -= dt;
  const night = typeof mobNight === 'function' && mobNight();
  const dx = PL.pos.x - a.pos.x, dz = PL.pos.z - a.pos.z, dist = Math.hypot(dx, dz) || 1, plSpd = Math.hypot(PL.vel.x, PL.vel.z), K = a.kind;
  /* 사람이 다가오면 — 소는 바짝(2.5 m · 뛰어오면 4 m) · 토끼는 11 m(뛰면 18 m) · 꿩은 6 m(뛰면 12 m) */
  if (a.state !== 'flee' && a.state !== 'fly' && !PL.dead) {
    const scare = K === 'cow' ? (dist < 2.5 && plSpd > 1.5 || dist < 4 && plSpd > 5) : K === 'hare' ? (dist < 11 || dist < 18 && plSpd > 5) : (dist < 6 || dist < 12 && plSpd > 4);
    if (scare) aniPanic(a, {x:PL.pos.x, z:PL.pos.z});
  }
  a.t += dt; let spd = 0, face = null; const h = a.herd;
  if (a.frz > 0) { a.frz = Math.max(0, a.frz - dt); a.state = 'idle'; }
  else if (a.state === 'fly') {
    const F = a.fly; F.t += dt; const u = Math.min(1, F.t / F.T), x = F.x0 + (F.ex - F.x0) * u, z = F.z0 + (F.ez - F.z0) * u, g = heightAt(x, z);
    a.pos.x = x; a.pos.z = z; a.pos.y = g; a.air = Math.max(0, (F.y0 + (g - F.y0) * u) - g + Math.sin(Math.PI * u) * (5 + F.T) + (u < 0.15 ? u / 0.15 * 1.5 : 1.5) * (1 - u));
    a.ph += dt * (u < 0.3 ? 26 : u > 0.85 ? 22 : 6);
    if (u >= 1) { a.fly = null; a.air = 0; a.state = 'idle'; a.t = 0; a.dur = 4 + Math.random() * 6; h.x = a.pos.x; h.z = a.pos.z; }
  } else if (a.state === 'flee') {
    let fx = a.pos.x - a.flee.x, fz = a.pos.z - a.flee.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
    if (K === 'hare') { a.zz -= dt; if (a.zz <= 0) { a.zz = 0.6 + Math.random() * 0.4; a.zs = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.4); }   // 갈지자
      const c = Math.cos(a.zs), s = Math.sin(a.zs); const ox = fx * c - fz * s, oz = fx * s + fz * c; fx = ox; fz = oz; }
    a.target.set(a.pos.x + fx * 6, 0, a.pos.z + fz * 6); spd = K === 'cow' ? 6.0 : 9.0;
    if (a.t > a.dur) { a.state = 'idle'; a.t = 0; a.dur = 3 + Math.random() * 4; h.x = a.pos.x; h.z = a.pos.z; }
  } else if (a.state === 'walk') {
    spd = K === 'cow' ? 1.0 : K === 'hare' ? 1.6 : 0.7;
    if (Math.hypot(a.target.x - a.pos.x, a.target.z - a.pos.z) < 0.35 || a.t > a.dur) { a.state = 'idle'; a.t = 0; a.dur = (night ? 9 : 3) + Math.random() * 8; }
  } else {                                                                   // idle · alert
    const al = K === 'cow' ? 10 : K === 'hare' ? 22 : 14;
    a.state = dist < al && !PL.dead ? 'alert' : 'idle';
    if (a.state === 'alert') face = Math.atan2(dx, dz) + (K === 'hare' ? Math.PI * 0.5 : 0);   // 토끼는 옆으로 서서 한 눈으로 본다
    if (a.t > a.dur && a.state === 'idle') {
      h.x += (Math.random() - 0.5) * 5; h.z += (Math.random() - 0.5) * 5;
      for (let k = 0; k < 6; k++) { const an = Math.random() * 6.283, r = 1 + Math.random() * (K === 'cow' ? 7 : 4), x = h.x + Math.cos(an) * r, z = h.z + Math.sin(an) * r;
        if (aniLand(K, x, z)) { a.target.set(x, 0, z); a.state = 'walk'; a.t = 0; a.dur = 10; break; } }
      if (a.state !== 'walk') { a.t = 0; a.dur = 2 + Math.random() * 5; }
    }
  }
  if (spd > 0) {
    const tx = a.target.x - a.pos.x, tz = a.target.z - a.pos.z, L = Math.hypot(tx, tz) || 1;
    a.yaw += _aAng(Math.atan2(tx, tz) - a.yaw) * clamp((spd > 3 ? 7 : 2.8) * dt, 0, 1);
    const st = Math.min(spd * dt, L), nx = a.pos.x + Math.sin(a.yaw) * st, nz = a.pos.z + Math.cos(a.yaw) * st, nh = heightAt(nx, nz);
    if (nh > 0.4 && Math.abs(nh - a.pos.y) < st * 1.8 + 0.05 && !solidAt(nx, nz, nh + 0.5) && !(typeof boulderAt === 'function' && boulderAt(nx, nz, 0.2))) { a.pos.x = nx; a.pos.z = nz; }
    else if (a.state === 'flee') { a.flee = {x:a.pos.x - Math.sin(a.yaw + 1.3) * 5, z:a.pos.z - Math.cos(a.yaw + 1.3) * 5}; }
    else { a.state = 'idle'; a.t = 0; a.dur = 2; }
    a.ph += st / (K === 'cow' ? (spd > 3 ? 2.2 : 1.1) : K === 'hare' ? (spd > 3 ? 1.6 : 0.5) : 0.28) * 6.2832;
  } else if (face !== null) a.yaw += _aAng(face - a.yaw) * clamp(1.8 * dt, 0, 1);
  a.speed += (spd - a.speed) * clamp(dt * 6, 0, 1);
  if (a.state !== 'fly') a.pos.y = heightAt(a.pos.x, a.pos.z);
  if ((a.voiceT -= dt) < 0) { a.voiceT = (K === 'cow' ? 10 : 14) + Math.random() * 20; if (dist < 70 && K !== 'hare') aniVoice(ANI_DEF[K].voice, a.pos, 0.6 + Math.random() * 0.3); }
  aniPose(a, dt);
  a.blob.visible = a.rig.visible; a.blob.position.set(a.pos.x, a.pos.y + 0.04, a.pos.z); const bs = 1 / (1 + a.air * 0.4); a.blob.scale.set(bs * (K === 'cow' ? 1.8 : 0.5), 1, bs * (K === 'cow' ? 1.8 : 0.5));
}

/* ── 몸짓 ─────────────────────────────────────────────────────────────────── */
function aniPose(a, dt) {
  const R = a.rig, tm = performance.now() * 0.001 + a.id * 1.37, K = a.kind;
  R.visible = Math.hypot(a.pos.x - PL.pos.x, a.pos.z - PL.pos.z) < 110;                                       // 110 m 밖은 그리지 않는다
  if (!R.visible) return;
  R.position.set(a.pos.x, a.pos.y + a.air, a.pos.z); R.rotation.set(0, a.yaw, 0);
  if (!a.alive) {                                                             // 옆으로 쓰러진다 · 1분 뒤 가라앉는다
    const e = Math.min(1, a.deadT / 0.7), ee = e * e * (3 - 2 * e); R.rotation.z = 1.45 * ee;
    R.position.y = a.pos.y + (K === 'cow' ? 0.35 : 0.08) * ee - Math.max(0, a.deadT - 60) * 0.03;
    if (a.wings) for (const w of a.wings) w.visible = false;
    return;
  }
  const g = clamp(a.speed / 1.0, 0, 1), run = clamp((a.speed - 2) / 4, 0, 1), k = clamp(dt * 5, 0, 1);
  const grazeT = a.state === 'idle' && a.speed < 0.15 ? 1 : 0; a.graze += (grazeT - a.graze) * clamp(dt * 2, 0, 1);
  let ly = 0; if (a.state === 'alert') ly = clamp(_aAng(Math.atan2(PL.pos.x - a.pos.x, PL.pos.z - a.pos.z) - a.yaw), -1, 1);
  a.lookY += (ly - a.lookY) * k;
  if (K === 'cow') {
    const A = 0.36 * g + 0.25 * run, offs = [0, Math.PI, Math.PI, 0];                                        // 대각선 짝
    a.legs.forEach((L, i) => { L.rotation.set(-A * Math.sin(a.ph + offs[i] + (run > 0.5 && i > 1 ? 0.7 : 0)), 0, 0); });
    R.position.y += (0.015 * g + 0.06 * run) * Math.abs(Math.sin(a.ph)) + Math.sin(tm * 1.5) * 0.005;
    a.neck.rotation.set(a.graze * 0.95 - (a.state === 'alert' ? 0.18 : 0) - run * 0.2 - a.hitT * 0.5, a.lookY * 0.55, 0);
    a.head.rotation.set(a.graze * (0.25 + Math.sin(tm * 5.5) * 0.04), a.lookY * 0.35, 0);
    a.tail.rotation.set(0.1 + run * 0.6, Math.sin(tm * 1.9) * 0.35, Math.sin(tm * 3.1) * 0.15);
    R.rotation.z = a.hitT > 0 ? Math.sin(tm * 50) * 0.04 * a.hitT : 0;
  } else if (K === 'hare') {
    /* 깡충 — 걸음 한 번이 뜀 한 번: 뒷다리를 차며 몸이 둥글게 떴다 내려선다. 앉으면 몸을 세운다 · 굳으면 귀를 꼿꼿이 */
    const hop = Math.max(0, Math.sin(a.ph)), sit = a.speed < 0.2 ? 1 : 0;
    a.body.position.y = hop * (0.06 + 0.16 * run) * g;
    a.body.rotation.set(-0.25 * sit + (Math.cos(a.ph) * 0.35) * g, 0, 0);
    for (const L of a.legs) L.rotation.set(g * (Math.cos(a.ph) > 0 ? -0.9 * Math.cos(a.ph) : 0.3), 0, 0);
    a.head.rotation.set(a.graze * (0.45 + Math.sin(tm * 9) * 0.05) - (a.state === 'alert' ? 0.25 : 0) + run * 0.4, a.lookY * 0.6, 0);
    a.head.children[0].scale.y = 1;                                                                       // (귀 꼴은 머리 꼴에 들었다)
  } else {
    /* 꿩 — 걸음마다 고개를 앞뒤로 까딱 · 서면 땅을 쫀다 · 날면 날개를 펴 친다(오를 때 빠르게 · 미끄러질 땐 펴 둔 채) */
    const flying = a.state === 'fly';
    for (const w of a.wings) w.visible = flying;
    if (flying) { const fl = Math.sin(a.ph) * (a.fly && a.fly.t / a.fly.T > 0.3 && a.fly.t / a.fly.T < 0.85 ? 0.15 : 0.9);
      a.wings[0].rotation.set(0, 0, fl); a.wings[1].rotation.set(0, 0, -fl);
      a.body.rotation.set(-0.15, 0, 0); a.tail.rotation.set(-0.15, 0, 0); a.head.rotation.set(-0.2, 0, 0); a.head.position.z = 0.15; }
    else {
      const bob = g > 0.1 ? Math.sin(a.ph) * 0.035 : 0, peck = a.graze * Math.max(0, Math.sin(tm * 4.2)) ** 6;
      a.head.position.z = 0.15 + bob; a.head.rotation.set(peck * 1.2 + (a.state === 'alert' ? -0.3 : 0), a.lookY * 0.7, 0);
      a.body.rotation.set(peck * 0.25, 0, Math.sin(a.ph) * 0.06 * g); a.tail.rotation.set(0.12 + Math.sin(tm * 2) * 0.03, 0, 0);
    }
  }
}

/* ── 소리 — 음매 · 찍찍 · 꿩꿩(톱니파 · 거르개 — 97-mobs.js mobVoice 와 같은 소리판 · 거리로 줄인다) ───────── */
function aniVoice(kind, p, vol) {
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
}
