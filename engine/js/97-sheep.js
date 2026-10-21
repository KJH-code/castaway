/* 97-sheep.js — CASTAWAY
   양(사용자 요청 — Meshy 'Woolly Sheep' 을 리깅해 들였다 · 모델 data-mob-sheep.js · 뼈 심기 tools/sheep/rig.py)
   (island_world.html 이 이 차례로 읽는다 — 97-mobs.js 다음 · 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   양
   ----------------------------------------------------------------------------
   · 풀밭 · 덤불 땅에 3~5 마리씩 무리로 산다(사람 둘레 70~150 m 에 세우고 260 m 넘게 멀어지면 거둔다 · 저장하지 않는다 ·
     '몬스터 수' 설정과 따로 — 지형 판과도 상관없이 선다). 한꺼번에 많아야 `SHEEP_MAX`.
   · 하는 일: 풀 뜯기(고개를 숙이고 우물거린다) → 무리 가운데 둘레로 몇 걸음 → 다시 뜯기. 사람이 9 m 안으로 오면 고개를 들어 쳐다보고,
     4 m 안으로 뛰어들거나 2.5 m 안까지 오면 · 맞으면 달아난다(맞으면 무리 전체가 · 5~8초 · 초속 5 m). 밤엔 덜 돌아다닌다.
   · 몸짓(뼈 21 — 쉼 자세 회전 0 이라 프레임마다 0 에서 새로 짠다): 대각선 다리 짝(왼앞+오른뒤 · 오른앞+왼뒤)이 번갈아 걷고 뛴다(간 거리로 민다) ·
     드는 다리는 무릎(뒷다리는 뒷무릎)을 접는다 · 고개 숙여 뜯기 · 귀 털기 · 꼬리 흔들기 · 숨 · 맞으면 움찔 · 쓰러지면 옆으로 눕는다.
   · 맞는 공은 몬스터와 같은 대역(`mobProxy` — 97-mobs.js)이라 근접 · 총 · 폭발이 다 듣는다. 쓰러지면 사체(양고기 2 · 양털 3 — `MOB_LOOT.sheep`).
   · **산 양의 털을 깎는다** — 빈손(무기 · 도구를 안 들고) · 가방에 날붙이를 지니고 양을 보고 좌클릭을 누르고 있으면(2.4초) 양털 2~3.
     깎은 양은 이틀(게임 시간) 뒤에 다시 깎인다. 깎는 동안 양은 선다.
   · 소리 — 매애(`mobVoice('baa')` — 톱니파 + 떨림 + 모음 꼴 둘).
   ========================================================================== */
MON.sheep = [];
const SHEEP_MAX = 10, SHEEP_HP = 60, SHEEP_SHEAR_H = 48;
let SHEEP_GEO = null, SHEEP_TEX = null, SHEEP_SKIN = null, SHEEP_T = 0, SHEEP_SEQ = 0, SHEEP_HERD = 0;

/* 아이템 · 굽기 · 만들기 */
Object.assign(ITEMS, {
  meat_mutton: {n:'양고기', kg:1.4, c:0xb0605a, use:'날고기 — 구워 먹어야 탈이 없다', food:8, raw:true, tags:['meat']},
  wool:        {n:'양털',   kg:0.3, c:0xe8e0cc, use:'깎거나 벗긴 양털 — 꼬아서 노끈, 감아서 붕대'},
  bandage_wool:{n:'양털 붕대', kg:0.12, c:0xf0ead8, use:'양털을 감아 만든 두툼한 붕대 — 섬유 붕대보다 잘 아문다', heal:{hp:18, stam:12}}
});
if (typeof FIRING !== 'undefined' && !FIRING.meat_mutton) FIRING.meat_mutton = {out:'meat_cooked', hours:0.2, count:1};
RECIPES.push(
  {id:'cord_wool', tier:'풀과 돌', n:'노끈(양털)', out:{id:'cord',n:2}, time:3.0, stam:3,
   note:'양털을 손바닥으로 비벼 꼬면 섬유보다 빨리 노끈이 된다.', in:[{id:'wool',n:1}]},
  {id:'bandage_wool', tier:'불', n:'양털 붕대', out:{id:'bandage_wool',n:2}, time:5, stam:3,
   note:'양털을 얇게 펴서 감는다 — 두툼해 피를 잘 막는다.', in:[{id:'wool',n:2}]}
);
MOB_LOOT.sheep = [['meat_mutton', 2], ['wool', 3]];
MOB_LOOT.shear = [['wool', 3]];                                              // 털 깎기 안내 글이 읽는다(82-hud.js)
MOB_R.sheep = 0.45;
if (typeof FLORA_PICK !== 'undefined')
  FLORA_PICK.sheepshear = {item:'wool', n:'양', verb:'털 깎기', regrow:1e9, cnt:[2,3], dur:2.4, stam:4, need:'sharp', mob:1};

/* ── 몸 ─────────────────────────────────────────────────────────────────── */
function sheepBuild() {
  for (const s of MON.sheep) sheepOff(s);
  if (SHEEP_GEO || typeof SHEEP_GLB === 'undefined') return;
  try {
    const M = parseGLB_mob(mobB64(SHEEP_GLB));
    SHEEP_GEO = M.geometry; SHEEP_SKIN = M.skin;
    SHEEP_TEX = new THREE.TextureLoader().load(M.textureURL); SHEEP_TEX.flipY = false;
    for (let i = 0; i < SHEEP_MAX; i++) MON.sheep.push(sheepMake(i));
  } catch (e) { console.error('[양]', e); }
}
function sheepMake(i) {
  const S = SHEEP_SKIN, map = {};
  const rec = b => { const n = new THREE.Bone(); n.name = b.name; n.position.copy(b.position);
    map[b.name] = n; for (const c of b.children) if (c.isBone) n.add(rec(c)); return n; };
  const root = rec(S.root), rig = new THREE.Group(); rig.visible = false; scene.add(rig);
  const mat = new THREE.MeshLambertMaterial({map:SHEEP_TEX, skinning:true});
  const mesh = new THREE.SkinnedMesh(SHEEP_GEO, mat); mesh.frustumCulled = false; mesh.userData.lightRole = 'recv';
  rig.add(mesh); rig.add(root); rig.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(S.bones.map(b => map[b.name]), S.boneInverses), new THREE.Matrix4());
  const s = {kind:'sheep', id:i, rig, mesh, bone:map, bones:Object.values(map), pos:new THREE.Vector3(), yaw:0, hp:SHEEP_HP, hpMax:SHEEP_HP,
    alive:false, active:false, alerted:false, frz:0, state:'graze', t:0, dur:5, target:new THREE.Vector3(), speed:0, ph:Math.random() * 6.283,
    herd:null, flee:null, graze:1, look:0, lookY:0, earT:0, ear:[0, 0], tailT:0, hitT:0, hp0:SHEEP_HP, deadT:0, voiceT:3 + Math.random() * 10,
    shornAt:-1e9, prox:[], pick:null, shear:null};
  s.blob = mobBlob(0.5);
  s.prox.push(mobProxy(s, () => _shV.set(s.pos.x, s.pos.y + 1.45, s.pos.z), 0.55));   // 대역의 y 는 가운데−1 — 몸통 가운데가 땅 위 0.45 m
  s.shear = {kind:'sheepshear', live:true, mob:'shear', key:'SH' + i, x:0, y:0, z:0, ay:0, r:0.55, lootFn:() => sheepShear(s)};
  return s;
}
const _shV = new THREE.Vector3();
function sheepOff(s) {
  if (!s) return;
  mobRegister(s, false); s.active = false; s.alive = false; s.rig.visible = false; s.blob.visible = false;
  for (const p of [s.pick, s.shear]) { const i = MON.picks.indexOf(p); if (i >= 0) MON.picks.splice(i, 1); }
  s.pick = null;
}
function sheepShear(s) {
  let g = 0; const n = 2 + ((Math.random() * 2) | 0);
  for (let k = 0; k < n; k++) if (invAdd('wool', 1)) g++;
  s.shornAt = gameHours; const i = MON.picks.indexOf(s.shear); if (i >= 0) MON.picks.splice(i, 1);
  mobVoice('baa', s.pos.x, s.pos.y + 0.8, s.pos.z, 0.9);
  return g ? '양털 +' + g + ' — 이틀 뒤면 다시 자란다' : '가방이 가득 찼다';
}

/* ── 세우고 거두기 ─────────────────────────────────────────────────────────── */
const sheepLand = (x, z) => { const h = heightAt(x, z); if (h < 0.8) return false;
  const b = mobBiome(x, z); if (b !== B.MEADOW && b !== B.SCRUB) return false;
  return Math.abs(heightAt(x + 3, z) - h) + Math.abs(heightAt(x, z + 3) - h) < 2.2; };
function sheepSpawner() {
  const px = PL.pos.x, pz = PL.pos.z;
  for (const s of MON.sheep) if (s.active) {
    const d = Math.hypot(s.pos.x - px, s.pos.z - pz);
    if (d > 260 || (!s.alive && s.deadT > 90)) sheepOff(s);
  }
  if (PL.under || PL.swim) return;
  const live = MON.sheep.filter(s => s.active).length;
  if (live > SHEEP_MAX - 3 || Math.random() > 0.3) return;
  const fx = -Math.sin(PL.yaw), fz = -Math.cos(PL.yaw);
  for (let t = 0; t < 16; t++) {
    const a = Math.random() * 6.283, r = 70 + Math.random() * 80, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
    if (Math.cos(a) * fx + Math.sin(a) * fz > 0.45 || !sheepLand(x, z)) continue;
    const herd = {id:++SHEEP_HERD, x, z}, n = Math.min(SHEEP_MAX - live, 3 + ((Math.random() * 3) | 0));
    for (let k = 0; k < n; k++) { const s = MON.sheep.find(q => !q.active); if (!s) break;
      const sx = x + (Math.random() - 0.5) * 9, sz = z + (Math.random() - 0.5) * 9; if (!sheepLand(sx, sz)) continue;
      sheepSpawn(s, sx, sz, herd); }
    return;
  }
}
function sheepSpawn(s, x, z, herd) {
  s.active = s.alive = true; s.hp = s.hp0 = SHEEP_HP; s.herd = herd; s.alerted = false; s.frz = 0; s.deadT = 0; s.hitT = 0; s.flee = null;
  s.pos.set(x, heightAt(x, z), z); s.yaw = Math.random() * 6.283; s.state = 'graze'; s.t = 0; s.dur = 2 + Math.random() * 8; s.graze = 1;
  s.shornAt = -1e9; s.rig.visible = true; s.rig.rotation.set(0, s.yaw, 0);
  mobRegister(s, true);
  if (MON.picks.indexOf(s.shear) < 0) MON.picks.push(s.shear);
}

/* ── 돌보기(매 프레임 — 97-mobs.js updateMobs 가 부른다) ────────────────────────── */
function sheepUpdate(dt) {
  if (!SHEEP_GEO) return;
  SHEEP_T -= dt; if (SHEEP_T <= 0) { SHEEP_T = 1.5; sheepSpawner(); }
  for (const s of MON.sheep) if (s.active) sheepTick(s, dt);
}
function sheepPanic(herd, from) {                                           // 무리 전체가 달아난다
  for (const s of MON.sheep) if (s.active && s.alive && s.herd === herd) { s.state = 'flee'; s.t = 0; s.dur = 5 + Math.random() * 3; s.flee = from; }
}
const _shAng = (a) => { while (a > Math.PI) a -= 6.2832; while (a < -Math.PI) a += 6.2832; return a; };
function sheepTick(s, dt) {
  if (!s.alive) { s.deadT += dt; s.blob.visible = false; const i = MON.picks.indexOf(s.shear); if (i >= 0) MON.picks.splice(i, 1); sheepPose(s, dt); return; }
  if (s.hp < s.hp0) { s.hitT = 0.45; sheepPanic(s.herd, {x:PL.pos.x, z:PL.pos.z}); mobVoice('baa', s.pos.x, s.pos.y + 0.8, s.pos.z, 1.4); }
  s.hp0 = s.hp; if (s.hitT > 0) s.hitT -= dt;
  const night = typeof mobNight === 'function' && mobNight();
  const dx = PL.pos.x - s.pos.x, dz = PL.pos.z - s.pos.z, dist = Math.hypot(dx, dz) || 1;
  const plSpd = Math.hypot(PL.vel.x, PL.vel.z), beingShorn = typeof GATHER !== 'undefined' && GATHER.on && GATHER.p === s.shear;
  if (s.state !== 'flee' && !PL.dead && !beingShorn && (dist < 2.5 && plSpd > 1.5 || dist < 4.5 && plSpd > 5)) sheepPanic(s.herd, {x:PL.pos.x, z:PL.pos.z});
  const h = s.herd; s.t += dt; let spd = 0, face = null;
  if (s.frz > 0) { s.frz = Math.max(0, s.frz - dt); s.state = 'graze'; }
  else if (beingShorn) { s.state = 'graze'; face = Math.atan2(dx, dz) + Math.PI * 0.5; }
  else if (s.state === 'flee') {
    let fx = s.pos.x - s.flee.x, fz = s.pos.z - s.flee.z; const L = Math.hypot(fx, fz) || 1; fx /= L; fz /= L;
    s.target.set(s.pos.x + fx * 6, 0, s.pos.z + fz * 6); spd = 5.0;
    if (s.t > s.dur) { s.state = 'walk'; s.t = 0; s.dur = 6; h.x = s.pos.x; h.z = s.pos.z; s.target.set(s.pos.x + fx * 3, 0, s.pos.z + fz * 3); }
  } else if (s.state === 'walk') {
    spd = 0.9; if (Math.hypot(s.target.x - s.pos.x, s.target.z - s.pos.z) < 0.4 || s.t > s.dur) { s.state = 'graze'; s.t = 0; s.dur = (night ? 10 : 4) + Math.random() * 10; }
  } else {                                                                   // graze · alert
    s.state = dist < 9 && !PL.dead ? 'alert' : 'graze';
    if (s.state === 'alert') face = Math.atan2(dx, dz);
    if (s.t > s.dur && s.state === 'graze') {
      h.x += (Math.random() - 0.5) * 6; h.z += (Math.random() - 0.5) * 6;   // 무리 가운데가 천천히 옮겨 간다
      for (let k = 0; k < 6; k++) { const a = Math.random() * 6.283, r = 1 + Math.random() * 6, x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r;
        if (sheepLand(x, z)) { s.target.set(x, 0, z); s.state = 'walk'; s.t = 0; s.dur = 12; break; } }
      if (s.state !== 'walk') { s.t = 0; s.dur = 3 + Math.random() * 6; }
    }
  }
  if (spd > 0) {
    const tx = s.target.x - s.pos.x, tz = s.target.z - s.pos.z, L = Math.hypot(tx, tz) || 1;
    const want = Math.atan2(tx, tz); s.yaw += _shAng(want - s.yaw) * clamp((spd > 2 ? 6 : 2.5) * dt, 0, 1);
    const st = Math.min(spd * dt, L), nx = s.pos.x + Math.sin(s.yaw) * st, nz = s.pos.z + Math.cos(s.yaw) * st, nh = heightAt(nx, nz);
    if (nh > 0.4 && Math.abs(nh - s.pos.y) < st * 1.6 + 0.05 && !solidAt(nx, nz, nh + 0.6)) { s.pos.x = nx; s.pos.z = nz; }
    else if (s.state === 'flee') { s.flee = {x:s.pos.x - Math.sin(s.yaw + 1.2) * 5, z:s.pos.z - Math.cos(s.yaw + 1.2) * 5}; }   // 막혔다 — 옆으로 꺾어 달아난다
    else { s.state = 'graze'; s.t = 0; s.dur = 3; }
    s.ph += st / (spd > 2 ? 1.6 : 0.85) * 6.2832;
  } else if (face !== null) s.yaw += _shAng(face - s.yaw) * clamp(1.6 * dt, 0, 1);
  s.speed += (spd - s.speed) * clamp(dt * 6, 0, 1);
  s.pos.y = heightAt(s.pos.x, s.pos.z);
  if ((s.voiceT -= dt) < 0) { s.voiceT = 8 + Math.random() * 18; if (dist < 70) mobVoice('baa', s.pos.x, s.pos.y + 0.8, s.pos.z, 0.7 + Math.random() * 0.3); }
  /* 털 깎기 줍기 — 깎은 지 이틀이 지나면 다시 */
  const sh = s.shear; sh.x = s.pos.x; sh.z = s.pos.z; sh.y = s.pos.y; sh.ay = s.pos.y + 0.55;
  if (gameHours - s.shornAt > SHEEP_SHEAR_H && MON.picks.indexOf(sh) < 0) MON.picks.push(sh);
  sheepPose(s, dt);
  s.blob.visible = true; s.blob.position.set(s.pos.x, s.pos.y + 0.04, s.pos.z);
}

/* ── 몸짓 ─────────────────────────────────────────────────────────────────── */
const _shU = new THREE.Vector3(), _shY = new THREE.Vector3(0, 1, 0);
function sheepPose(s, dt) {
  const R = s.rig, b = s.bone, k = clamp(dt * 5, 0, 1), tm = performance.now() * 0.001 + s.id * 1.7;
  for (const n of s.bones) n.quaternion.set(0, 0, 0, 1);
  R.position.set(s.pos.x, s.pos.y, s.pos.z); R.rotation.set(0, s.yaw, 0);
  if (!s.alive) {                                                             // 옆으로 쓰러져 다리를 뻗는다 · 1분 뒤 가라앉는다
    const e = Math.min(1, s.deadT / 0.7), ee = e * e * (3 - 2 * e);
    R.rotation.z = 1.45 * ee; R.position.y = s.pos.y + 0.18 * ee - Math.max(0, s.deadT - 60) * 0.03;
    b.neck.rotateX(0.5 * ee); b.head.rotateX(0.3 * ee);
    b.fUpL.rotateX(-0.45 * ee); b.fUpR.rotateX(-0.3 * ee); b.hUpL.rotateX(0.4 * ee); b.hUpR.rotateX(0.25 * ee);
    if (s.deadT < 1.6) { const j = Math.sin(s.deadT * 40) * 0.12 * (1 - s.deadT / 1.6); b.hLowL.rotateX(j); b.fLowR.rotateX(-j); }   // 경련
    R.updateMatrixWorld(true); return;
  }
  /* 걸음 — 대각선 짝. 빠르면 크게 · 뒷무릎은 앞무릎과 거꾸로 접힌다 */
  const g = clamp(s.speed / 1.0, 0, 1), run = clamp((s.speed - 1.5) / 3, 0, 1), A = 0.32 * g + 0.28 * run;
  const legs = [['fUpL', 'fLowL', 'fFootL', 0, 1], ['hUpR', 'hLowR', 'hFootR', 0, -1], ['fUpR', 'fLowR', 'fFootR', Math.PI, 1], ['hUpL', 'hLowL', 'hFootL', Math.PI, -1]];
  for (const [u, l, f, off, fr] of legs) {
    const p = s.ph + off + (run > 0.5 && fr < 0 ? 0.6 : 0), sw = Math.sin(p), lift = Math.max(0, Math.cos(p)) * g;
    b[u].rotateX(-A * sw);
    b[l].rotateX((fr > 0 ? 0.7 : 0.55) * lift * (0.6 + run));
    b[f].rotateX(-0.35 * lift);
  }
  R.position.y += (0.012 * g + 0.04 * run) * Math.abs(Math.sin(s.ph)) + Math.sin(tm * 1.7) * 0.004;   // 걸음 들썩 · 숨
  b.spine.rotateX(-0.06 * run * Math.sin(s.ph * 2));
  /* 고개 — 뜯을 때 숙이고 우물거림 · 쳐다볼 때 들고 돌림 · 달아날 때 앞으로 뺌 */
  const grazeT = s.state === 'graze' && s.speed < 0.2 ? 1 : 0; s.graze += (grazeT - s.graze) * clamp(dt * 2.2, 0, 1);
  let ly = 0;
  if (s.state === 'alert') { _shU.set(PL.pos.x - s.pos.x, 0, PL.pos.z - s.pos.z); ly = clamp(_shAng(Math.atan2(_shU.x, _shU.z) - s.yaw), -1.0, 1.0); }
  s.lookY += (ly - s.lookY) * k;
  b.neck.rotateY(s.lookY * 0.6); b.head.rotateY(s.lookY * 0.4);
  b.neck.rotateX(s.graze * 0.95 - (s.state === 'alert' ? 0.22 : 0) - run * 0.25 - s.hitT * 0.6);
  b.head.rotateX(s.graze * (0.32 + Math.sin(tm * 6.5) * 0.04));
  /* 귀 털기 · 꼬리 */
  if ((s.earT -= dt) < 0) { s.earT = 1.5 + Math.random() * 4; s.ear[(Math.random() * 2) | 0] = 0.6; }
  s.ear[0] *= Math.exp(-6 * dt); s.ear[1] *= Math.exp(-6 * dt);
  b.earL.rotateZ(Math.sin(tm * 30) * s.ear[0] * 0.4 - 0.1 * run); b.earR.rotateZ(-Math.sin(tm * 30) * s.ear[1] * 0.4 + 0.1 * run);
  if ((s.tailT -= dt) < -3) s.tailT = 1 + Math.random();
  b.tail.rotateY(s.tailT > 0 ? Math.sin(tm * 14) * 0.5 : 0); b.tail.rotateX(-0.3 * run);
  if (s.hitT > 0) b.spine.rotateZ(Math.sin(tm * 50) * 0.08 * s.hitT);
  R.updateMatrixWorld(true);
}
