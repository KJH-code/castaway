/* 97-mobs.js — CASTAWAY
   몬스터(사용자 요청) — 다지류 · 스킨워커 · 가고일을 본편 섬에 들인다. 몸(뼈 · 껍데기)은 97-mob-rigs.js(시험장에서 옮긴 것)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   몬스터
   ----------------------------------------------------------------------------
   · **다지류** — 우거진 숲(활엽수림 · 대숲) 곁의 굴이 둥지다(`MON.lairs` — 지형 판 8 · 섬을 지을 때 정한다 · 그 굴은 불빛 · 빛나는 것이
     없다 — 32-caves.js `c.dark`). 낮에는 굴 속에 똬리를 틀고 자고(건드리면 깬다), 밤에는 둥지 둘레 숲을 휘젓고 돌아다닌다.
     사람이 50 m 안에 들면 쫓고, 새벽이면 둥지로 돌아간다. 몸짓 · 빠르기 · 돌진 · 닿기 · 체력은 아레나(beta/crawler_arena.html — `CRWP`)와 같다(크기만 1.0).
     그 숲(둥지 420 m 안의 우거진 숲)은 캐고 따는 몫이 더 나온다(`mobLairBonus` → 97-temples.js yieldK).
   · **스킨워커** — 숲과 밤의 들판. 아레나(beta/mimic_arena.html)와 같다 — 본체는 때리지 않고 손 둘이 잡기 · 채찍을 쓴다 ·
     두 손에 잡히면 삼킨다 · 손은 잘리고 되살아난다 · 궁지에 몰리면 새끼 거미를 뱉는다(아래 '스킨워커의 몸').
   · **아르크토스**(흰 곰) — 침엽수림 · 덤불 · 바위 비탈을 어슬렁거린다. 아레나(beta/bear_arena.html — `BEAR_P`/`BEAR_Q` = 아레나 P · Q)와 같다 —
     34 m 안에 들면 달리기보다 빠르게(×1.3) 네 발로 쫓아와 4.5 m 에서 뒷발로 일어서 앞발로 내려찍는다(40 · 앞 120°) · 찍고 나면 1.05초 굳는다.
     몸(뼈 21 · 몸짓)은 97-mob-rigs.js 의 공용 구역 그대로다.
   · **애쉬스케일** — 탁 트인 데 하늘에서 한 마리가 내려온다(97-wyvern.js — 아레나 beta/wyvern_arena.html 을 함수로 감싸 옮겼다).
   · **가고일** — 풀밭과 탁상지에 무리로 산다. 아레나(beta/gargoyle_arena.html — `GP2` = 아레나 `P`)와 같다 — 낮게 떠 배회하다 30 m 안에 들면 쫓고,
     멈춰 노려본 뒤 돌진한다 — 끝나면 3.5초 굳는다(본편은 돌진 명중에 높이 차 2.2 m 안을 더 본다 — 사용자가 정함).
   · **몸끼리 겹치지 않는다**(`mobSeparate` — 몸 반지름으로 서로 밀어낸다 · 다지류 마디도 · 사람도 몸 안으로 못 들어간다).
   · **맞으면** 비명을 지른다(아레나처럼 밀리지 않는다 · 해머 기절은 굳은 시간에 더해진다) · 사람이 맞으면 화면이 흔들린다(밀려나지 않는다).
   · 소리는 합성이다(`mobVoice` — 다지류 딸깍임 · 쇳소리 비명 / 가고일 날카로운 울음 / 스킨워커 사람 소리를 비튼 울부짖음) · 거리와 방향으로 줄이고 가른다.
   · 수는 설정 '몬스터 수'(MON.k — 0 없음 ~ 2.4)를 따른다 · 사람 둘레에만 세우고 멀어지면 거둔다(저장하지 않는다).
   · 근접 · 총 · 폭발 · 화상은 본편 무기 판정(CREATURES — 70-weapons.js · 74-icons-guns.js)을 그대로 탄다 — 몸마다 맞는 공(대역)을 건다.
   ========================================================================== */
const MON={k:1, frame:0, built:false, crawl:[], garg:[], mim:[], spd:[], bear:[], lairs:[], picks:[], spawnT:0, shake:0, roll:0,
  gGeo:null, gTex:null, mGeo:null, mTex:null, mSkin:null, mSc:1, seq:0, voiceT:0, blob:null};
function mobsSetK(k){ MON.k=k; }
const mobNight=()=>hourOfDay<5.0||hourOfDay>19.6;
const _moV=new THREE.Vector3(), _moV2=new THREE.Vector3(), _moQ=new THREE.Quaternion(), _moQ2=new THREE.Quaternion(), _moE=new THREE.Euler();
const mobForestB=b=>b===B.BROADLEAF||b===B.CONIFER||b===B.BAMBOO;
const mobLushB=b=>b===B.BROADLEAF||b===B.BAMBOO;
function mobBiome(x,z){ const gx=clamp(Math.round(x/CELL+N/2),0,N-1), gz=clamp(Math.round(z/CELL+N/2),0,N-1); return F.biome[IDX(gx,gz)]; }
function crwGround(x,z){ return Math.max(heightAt(x,z),-0.6); }

/* ── 둥지(섬을 지을 때 — 자원을 놓은 뒤 · 굴을 짓기 전) ──────────────────────── */
function mobsSites(seed){
  MON.lairs.length=0;
  if((P.tv|0)<8||typeof CAVES==='undefined'||!CAVES.length) return;
  const cand=[];
  for(const c of CAVES){ const r=c.rooms[0], gx=Math.round(r.x/CELL+N/2), gz=Math.round(r.z/CELL+N/2), R=Math.ceil(220/CELL);
    let n=0, sx=0, sz=0;
    for(let dz=-R;dz<=R;dz+=2) for(let dx=-R;dx<=R;dx+=2){ const x=gx+dx, z=gz+dz; if(x<0||z<0||x>=N||z>=N) continue;
      if(mobLushB(F.biome[IDX(x,z)])){ n++; sx+=(x-N/2)*CELL; sz+=(z-N/2)*CELL; } }
    if(n>=6) cand.push({c,n,fx:sx/n,fz:sz/n}); }
  cand.sort((a,b)=>b.n-a.n||a.c.x-b.c.x);
  for(const e of cand){ if(MON.lairs.length>=8) break;
    if(MON.lairs.some(l=>Math.hypot(l.x-e.c.x,l.z-e.c.z)<700)) continue;
    const r=e.c.rooms[e.c.rooms.length-1];                                   // 가장 안쪽 방에서 잔다
    e.c.dark=1; MON.lairs.push({cave:e.c, x:r.x, z:r.z, y:r.y, R:r.R, fx:e.fx, fz:e.fz, id:MON.lairs.length, cr:null}); }
}
/* 둥지 둘레의 우거진 숲 — 더 나온다(97-temples.js yieldK 가 더한다) */
function mobLairBonus(x,z){
  for(const l of MON.lairs) if(Math.hypot(x-l.x,z-l.z)<420&&mobLushB(mobBiome(x,z))) return 0.6;
  return 0;
}

/* ── 소리(합성) ───────────────────────────────────────────────────────────── */
function mobVoice(kind,x,y,z,vol){
  if(!A.ctx||!A.master) return;
  const dx=x-PL.pos.x, dz=z-PL.pos.z, d=Math.hypot(dx,dz,y-PL.pos.y); if(d>150) return;
  const ctx=A.ctx, t=ctx.currentTime, g=ctx.createGain(), pan=ctx.createStereoPanner?ctx.createStereoPanner():null;
  const rx=Math.cos(PL.yaw)*dx-Math.sin(PL.yaw)*dz;                         // 사람 오른쪽(+)
  if(pan){ pan.pan.value=clamp(rx/Math.max(4,d),-1,1); g.connect(pan); pan.connect(A.master); } else g.connect(A.master);
  const v=(vol||1)*0.55/Math.pow(1+d/14,1.4);
  const osc=(type,f0,f1,dur,at)=>{ const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t+at); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+at+dur); return o; };
  const env=(node,a,dur,at,peak)=>{ const e=ctx.createGain(); e.gain.setValueAtTime(0.0001,t+at); e.gain.exponentialRampToValueAtTime(peak,t+at+a); e.gain.exponentialRampToValueAtTime(0.0001,t+at+dur); node.connect(e); e.connect(g); return e; };
  const noise=(dur,at,f,q,peak)=>{ const s=ctx.createBufferSource(); s.buffer=A.noise; s.loop=true; const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q;
    s.connect(bp); env(bp,0.005,dur,at,peak); s.start(t+at,Math.random()*1.2); s.stop(t+at+dur+0.05); };
  g.gain.value=v;
  if(kind==='click'){                                                        // 다지류 다리 딸깍임
    for(let i=0;i<4;i++) noise(0.03,i*0.045+Math.random()*0.02,2600+Math.random()*1800,9,0.7); }
  else if(kind==='screech'){                                                 // 다지류 쇳소리 비명 — 톱니파 두 줄이 엇갈려 떨며 치솟는다
    for(const det of [0,37]){ const o=osc('sawtooth',700+det,2600+det*3,0.55,0), lfo=ctx.createOscillator(), lg=ctx.createGain();
      lfo.frequency.value=31+det*0.3; lg.gain.value=180; lfo.connect(lg); lg.connect(o.frequency);
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2200; f.Q.value=3; o.connect(f); env(f,0.02,0.75,0,0.55);
      o.start(t); o.stop(t+0.8); lfo.start(t); lfo.stop(t+0.8); }
    noise(0.6,0,3500,2,0.35); }
  else if(kind==='shriek'){                                                  // 가고일 — 날카롭게 꺾이는 울음
    const o=osc('square',1500,900,0.35,0), lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=47; lg.gain.value=260; lfo.connect(lg); lg.connect(o.frequency);
    const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=700; o.connect(f); env(f,0.01,0.42,0,0.45); o.start(t); o.stop(t+0.45); lfo.start(t); lfo.stop(t+0.45);
    noise(0.25,0.05,5000,4,0.2); }
  else if(kind==='wail'){                                                    // 스킨워커 — 사람 목소리를 비틀어 늘인 울부짖음(모음 꼴이 미끄러진다 · 고리 변조)
    const base=180+Math.random()*60, o1=osc('sawtooth',base,base*0.62,1.3,0), o2=osc('sawtooth',base*1.013,base*0.66,1.3,0);
    const rm=ctx.createGain(), car=ctx.createOscillator(); car.frequency.value=63+Math.random()*30; car.connect(rm.gain); rm.gain.value=0;
    const mix=ctx.createGain(); o1.connect(mix); o2.connect(mix); mix.connect(rm);
    for(const [f0,f1,q,pk] of [[800,350,8,0.5],[1200,2400,10,0.35],[2600,1100,12,0.22]]){ const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=q;
      f.frequency.setValueAtTime(f0,t); f.frequency.linearRampToValueAtTime(f1,t+1.2); rm.connect(f); env(f,0.15,1.35,0,pk); }
    o1.start(t); o2.start(t); car.start(t); o1.stop(t+1.4); o2.stop(t+1.4); car.stop(t+1.4); }
  else if(kind==='roar'){                                                    // 아르크토스 — 목 깊은 데서 끓는 포효(낮은 톱니파 둘 · 거친 숨)
    const base=70+Math.random()*20, o1=osc('sawtooth',base*1.6,base,1.1,0), o2=osc('sawtooth',base*1.62*1.01,base*1.04,1.1,0), lfo=ctx.createOscillator(), lg=ctx.createGain();
    lfo.frequency.value=23; lg.gain.value=18; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    for(const [f0,q,pk] of [[420,4,0.55],[900,6,0.3]]){ const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=f0; f.Q.value=q; o1.connect(f); o2.connect(f); env(f,0.08,1.15,0,pk); }
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(t+1.2); o2.stop(t+1.2); lfo.stop(t+1.2);
    noise(0.9,0.02,350,0.7,0.45); }
  else if(kind==='wyv'){                                                     // 애쉬스케일 — 쇳소리 섞인 긴 포효(내려가며 갈라진다)
    const base=230+Math.random()*40, o1=osc('sawtooth',base*1.5,base*0.55,1.4,0), o2=osc('square',base*1.52,base*0.6,1.4,0), lfo=ctx.createOscillator(), lg=ctx.createGain();
    lfo.frequency.value=29; lg.gain.value=40; lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    for(const [f0,f1,q,pk] of [[700,380,5,0.5],[1700,900,7,0.28],[3200,2000,9,0.12]]){ const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=q;
      f.frequency.setValueAtTime(f0,t); f.frequency.linearRampToValueAtTime(f1,t+1.3); o1.connect(f); o2.connect(f); env(f,0.06,1.45,0,pk); }
    o1.start(t); o2.start(t); lfo.start(t); o1.stop(t+1.5); o2.stop(t+1.5); lfo.stop(t+1.5);
    noise(1.1,0.05,1200,0.8,0.3); }
  else if(kind==='flap'){ for(let i=0;i<3;i++) noise(0.22,i*0.55,160,0.6,0.7); }   // 날갯짓 — 둔하게 치는 바람
  else if(kind==='fire'){ noise(0.6,0,900,0.5,0.6); noise(0.35,0,240,0.7,0.5); }   // 화염구 — 뿜는 소리
  else if(kind==='boom'){ noise(0.9,0,70,0.6,1.0); noise(0.4,0,300,0.8,0.6); noise(0.2,0,1800,1,0.3); }   // 터짐
  else if(kind==='slam'){ noise(0.25,0,90,0.7,1.0); noise(0.12,0,600,1,0.5); }   // 앞발이 땅을 찍는 소리
  else if(kind==='hurt'){                                                    // 맞았다 — 짧게 찢어지는 소리
    const o=osc('sawtooth',900,300,0.18,0), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1400; f.Q.value=2; o.connect(f); env(f,0.005,0.22,0,0.6); o.start(t); o.stop(t+0.25);
    noise(0.15,0,1800,1.5,0.5); }
  else if(kind==='thud'){ noise(0.12,0,220,0.8,0.9); noise(0.06,0,1500,1,0.4); }   // 몸에 박히는 소리(사람 쪽)
}

/* ── 맞는 공(대역) — 본편 무기 판정(CREATURES)에 건다. 체력은 몸의 것을 쓴다 ──────── */
function mobProxy(m,pos,r){
  const o={r, fish:false, _m:m, burn:null, fireproof:false};
  Object.defineProperty(o,'x',{get:()=>pos().x}); Object.defineProperty(o,'z',{get:()=>pos().z});
  Object.defineProperty(o,'y',{get:()=>pos().y-1.0});                       // rayCreature 가 y+1 을 가운데로 친다
  Object.defineProperty(o,'hp',{get:()=>m.alive?m.hp:0, set:v=>{ if(!m.alive) return; let d=m.hp-v;
    /* 한 프레임에 같은 몸의 공 여럿이 맞으면(폭발 · 산탄) 가장 큰 것 하나만 — 공마다 다 들면 다지류가 수류탄 하나에 녹는다 */
    if(m.dF===MON.frame){ const x=Math.max(0,d-m.dMax); m.dMax=Math.max(m.dMax,d); d=x; } else { m.dF=MON.frame; m.dMax=d; }
    mobDamage(m,d); }});
  Object.defineProperty(o,'stun',{get:()=>0, set:v=>{ if(v>0) m.frz=(m.frz||0)+v; }});   // 해머 기절 — 아레나처럼 굳은 시간에 더한다
  Object.defineProperty(o,'alerted',{get:()=>!!m.alerted, set:v=>{ if(v) m.alerted=true; }});
  return o;
}
function mobRegister(m,on){
  for(const p of m.prox){ const i=CREATURES.indexOf(p); if(on&&i<0) CREATURES.push(p); else if(!on&&i>=0) CREATURES.splice(i,1); }
}
/* 맞았다 — 체력 · 움찔 · 비명. 쓰러지면 사체(뒤질 수 있다) */
function mobDamage(m,d){
  if(!m.alive||!(d>0)) return;
  m.hp-=d; m.alerted=true; m.hitT=0.4;                                       // 밀리지 않는다(아레나 셋 다 넉백이 없다)
  MON.shake=Math.min(1,MON.shake+0.12); ATK.hitStop=0.06;
  mobVoice('hurt',m.pos.x,m.pos.y+1,m.pos.z,1.2);
  if(m.hp<=0) mobKill(m);
}
const MOB_LOOT={crawl:[['chitin',8],['spider_silk',2]], garg:[['chitin',6]], mim:[['spider_silk',6],['mimic_flesh',2]],
  bear:[['bone',8],['hide',3],['meat_bear',5]], wyv:[['gunpowder',1],['ember_scale',12]]};   // 가고일 · 스킨워커는 80-player.js 의 MOBS(떨구는 것 표 — 사전이 읽는다)와 같다
function mobKill(m){
  m.alive=false; m.hp=0; m.deadT=0; mobRegister(m,false);
  mobVoice(({crawl:'screech',garg:'shriek',bear:'roar'})[m.kind]||'wail',m.pos.x,m.pos.y+1,m.pos.z,1.6);
  toast(({crawl:'다지류를',garg:'가고일을',mim:'스킨워커를',bear:'아르크토스를'})[m.kind]+' 쓰러뜨렸다 — 사체를 뒤지면 무엇인가 나온다');
  const p=m.kind==='crawl'?m.cr.head:m.pos, key='M'+(++MON.seq);
  const pick={kind:'mobloot', x:p.x, y:heightAt(p.x,p.z), z:p.z, ay:heightAt(p.x,p.z)+0.6, r:1.4, key, mob:m.kind,
    lootFn:()=>{ let msg=''; for(const [id,n] of MOB_LOOT[m.kind]){ if(!ITEMS[id]) continue; let g=0; for(let k=0;k<n;k++) if(invAdd(id,1)) g++; if(g) msg+=(msg?' · ':'')+ITEMS[id].n+' +'+g; }
      const i=MON.picks.indexOf(pick); if(i>=0) MON.picks.splice(i,1); return msg||'가방이 가득 찼다'; }};
  MON.picks.push(pick); m.pick=pick;
}

/* ── 몸 만들기(섬을 다 지은 뒤 한 번 — 모델은 섬이 바뀌어도 다시 안 읽는다) ─────────── */
function mobBlob(r){
  if(!MON.blob){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,2,32,32,31);
    gr.addColorStop(0,'rgba(0,0,0,0.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64);
    MON.blob={geo:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), mat:new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false})}; }
  const m=new THREE.Mesh(MON.blob.geo,MON.blob.mat); m.scale.set(r*2,1,r*2); m.userData.lightRole='none'; m.renderOrder=3; m.visible=false; scene.add(m); return m;
}
function mobsBuild(){
  for(const m of [...MON.crawl,...MON.garg,...MON.mim,...MON.bear]){ mobRegister(m,false); m.active=false; m.alive=false; mobHide(m); }
  for(const sp of MON.spd) mimSpiderOff(sp);
  if(typeof wyvReset==='function') wyvReset();
  MON.picks.length=0;
  if((P.tv|0)<8) return;
  for(const l of MON.lairs){ l.cr=null; l.skip=typeof LANDING!=='undefined'&&Math.hypot(l.x-LANDING.x,l.z-LANDING.z)<450; }   // 상륙 자리 곁 굴은 비운다
  if(MON.built) return;
  try{
    /* 다지류 둘(돌려 쓴다) */
    for(let i=0;i<2;i++){ const cr=makeCrawler(scene,CRWP.hp); cr.mesh.visible=false; cr.mesh.userData.lightRole='recv'; placeCrawler(cr,0,0,0);
      const m={kind:'crawl', cr, pos:cr.head, kv:new THREE.Vector3(), hp:CRWP.hp, hpMax:CRWP.hp, alive:false, active:false, frz:0, mode:'sleep', lair:null,
        wp:null, wpT:0, touchT:0, voiceT:0, clickT:0, prox:[]};
      for(const S of cr.SPINE) m.prox.push(mobProxy(m,()=>S.p,CRWP.rad*crwK()));   // 아레나처럼 마디 구 전부(한 프레임에 여럿 맞으면 가장 큰 것 하나)
      MON.crawl.push(m); }
    /* 가고일 여섯 */
    const {geometry,textureURL}=parseGLB_garg(mobB64(GARG_GLB));
    MON.gGeo=geometry; MON.gTex=new THREE.TextureLoader().load(textureURL); MON.gTex.flipY=false;
    for(let i=0;i<6;i++){ const mat=new THREE.MeshLambertMaterial({map:MON.gTex,side:THREE.DoubleSide});
      const g={kind:'garg', pos:new THREE.Vector3(), kv:new THREE.Vector3(), yaw:0, hp:120, hpMax:120, frz:0, alerted:false, state:'wander', t:0,
        target:new THREE.Vector3(), dir:new THREE.Vector3(0,0,1), dashLeft:0, speed:0, wing:0, wingPh:0, hitDone:false, alive:false, active:false,
        home:new THREE.Vector3(), mat, prox:[], voiceT:0};
      g.body=gargBody(geometry,mat); g.mesh=g.body.mesh; g.mesh.visible=false; g.mesh.userData.lightRole='recv'; scene.add(g.mesh);
      g.blob=mobBlob(0.8); g.prox.push(mobProxy(g,()=>_moV.set(g.pos.x,g.pos.y+0.8,g.pos.z),0.9));
      MON.garg.push(g); }
    /* 스킨워커 셋 — 뼈는 마리마다, 지오메트리 · 그림은 나눠 쓴다 */
    const M=parseGLB_mob(mobB64(MIMIC_GLB));
    MON.mGeo=M.geometry; MON.mTex=new THREE.TextureLoader().load(M.textureURL); MON.mTex.flipY=false; MON.mSkin=M.skin;
    M.geometry.computeBoundingBox(); const bb=M.geometry.boundingBox; MON.mSc=MIM_H/(bb.max.y-bb.min.y);
    for(let i=0;i<3;i++) MON.mim.push(mimMake());
    /* 새끼 거미 — 그림 하나를 열다섯이 나눠 쓴다(다리 폭 1 m) */
    { const {geometry,textureURL}=parseGLB_garg(mobB64(SPIDERLING_GLB)); const tex=new THREE.TextureLoader().load(textureURL); tex.flipY=false;
      MON.sGeo=geometry; MON.sMat=new THREE.MeshLambertMaterial({map:tex,side:THREE.DoubleSide}); geometry.computeBoundingBox(); const sb=geometry.boundingBox;
      MON.sSc=MIM_SPIDER_SPAN/Math.max(sb.max.x-sb.min.x,sb.max.z-sb.min.z); for(let i=0;i<15;i++) MON.spd.push(mimSpiderMake()); }
    /* 아르크토스 셋 — 기하는 나눠 쓰고 뼈 · 재질(맞으면 붉게 뜬다)은 마리마다 */
    { const geo=parseGLB_bear(mobB64(BEAR_GLB)); for(let i=0;i<3;i++) MON.bear.push(bearMake(geo)); }
    if(typeof wyvBuild==='function') wyvBuild();                               // 애쉬스케일 — 97-wyvern.js
    MON.built=true;
  }catch(e){ console.error('[몬스터]',e); }
}
function mobHide(m){
  if(m.kind==='crawl'){ m.cr.mesh.visible=false; if(m.lair) m.lair.cr=null; m.lair=null; }
  else if(m.kind==='garg'){ m.mesh.visible=false; m.blob.visible=false; }
  else if(m.kind==='bear'){ m.body.mesh.visible=false; m.blob.visible=false; }
  else { m.rig.visible=false; m.blob.visible=false; }
}

/* ── 스킨워커의 몸 ─────────────────────────────────────────────────────────── */
/* 아레나(beta/mimic_arena.html · battle_arena.html)와 같다 — 키 5 m · 본체 체력 800 · 손 둘(잡기 · 채찍) · 새끼 거미.
   본체는 스스로 때리지 않는다. 손 둘이 저마다 움직이고, 궁지에 몰리면 입에서 새끼를 뱉는다.
   · 손은 저마다 체력 85 · 기절 시계도 따로다. 잘리면 4초 뒤 본체 체력 60 을 깎아 되살아난다. 양손이 통틀어 6번 잘릴 때마다 본체가 5초 굳는다.
   · 두 손이 1초 안에 잇달아 덤비지 않는다 · 두 손에 잡히면 3초 뒤 삼킨다.
   · 본체 체력이 100 이하로 떨어지면 제 살을 깎는 짓(손 재생 · 새끼 소환)을 멈춘다.
   섬에 맞춘 것은 생기고 거두기 · 배회(제 자리 둘레) · 쓰러진 사체 · 울부짖는 소리뿐이다(빛 피하기 · 떨림 · 넉백은 아레나에 없어 뺐다 — 사용자 요청). */
const MIM_H=5.0, MIM_SPIDER_SPAN=1.0;
const MIM_P={see:70, fov:150*Math.PI/180, walk:1.5, chase:4.2, reach:10,
  whipDmg:38, whipWind:0.75, whipSwing:0.34, grabWind:2.0, grabShoot:0.35, grabHold:6.0,
  handHp:85, handRegen:4, handCost:60, cutsForStun:6, bodyStun:5.0,
  spawnCost:250, spawnCd:25, spawnN:5, lowHp:100, spawnStun:5.0, eat:3.0};
const MIM_SPD={hp:100, speed:0.56, bite:14, biteCd:1.2, near:1.3, body:0.7};
const MIM_MAXSTRETCH=6, MIM_SWING=0.30, MIM_KNEE=0.16, MIM_GRABUP=1.15, MIM_WHIPYAW=1.30;
const mimEase=t=>t*t*(3-2*t);
const MIM_LIMBS=[
  {id:'la', side:-1, front:true , names:['Bone_027','Bone_026','Bone_025','Bone_024','Bone_023']},
  {id:'ra', side:+1, front:true , names:['Bone_022','Bone_021','Bone_020','Bone_019','Bone_018']},
  {id:'ll', side:-1, front:false, names:['Bone_009','Bone_008','Bone_007','Bone_006','Bone_005']},
  {id:'rl', side:+1, front:false, names:['Bone_014','Bone_013','Bone_012','Bone_011','Bone_010']}];
/* 맞는 공 — 몸 · 손 · 새끼가 저마다 제 체력을 든다(무기 판정 CREATURES 에 거는 대역) */
function mimProxy(tgt,posfn,r,hit){
  const o={r, fish:false, _m:tgt, burn:null, fireproof:false};
  Object.defineProperty(o,'x',{get:()=>posfn().x}); Object.defineProperty(o,'z',{get:()=>posfn().z});
  Object.defineProperty(o,'y',{get:()=>posfn().y-1.0});
  Object.defineProperty(o,'hp',{get:()=>tgt.alive?tgt.hp:0, set:v=>{ if(!tgt.alive) return; let d=tgt.hp-v;
    if(tgt.dF===MON.frame){ const x=Math.max(0,d-tgt.dMax); tgt.dMax=Math.max(tgt.dMax,d); d=x; } else { tgt.dF=MON.frame; tgt.dMax=d; }
    if(d>0) hit(d); }});
  Object.defineProperty(o,'stun',{get:()=>0, set:v=>{ if(v>0) tgt.frz=(tgt.frz||0)+Math.min(v,6); }});
  Object.defineProperty(o,'alerted',{get:()=>true, set:()=>{}});
  return o;
}
function mimMake(){
  const S=MON.mSkin, map={};
  const rec=b=>{ const n=new THREE.Bone(); n.name=b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale);
    map[b.name]=n; for(const c of b.children) if(c.isBone) n.add(rec(c)); return n; };
  const root=rec(S.root), rig=new THREE.Group(); rig.scale.setScalar(MON.mSc); rig.visible=false; scene.add(rig);
  const mat=new THREE.MeshLambertMaterial({map:MON.mTex,side:THREE.DoubleSide,skinning:true,emissive:0x050302});
  const mesh=new THREE.SkinnedMesh(MON.mGeo,mat); mesh.frustumCulled=false; mesh.userData.lightRole='recv';
  rig.add(mesh); rig.add(root); rig.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(S.bones.map(b=>map[b.name]),S.boneInverses),new THREE.Matrix4());
  const rest=new Map(), rpos=new Map(); root.traverse(o=>{ if(o.isBone){ rest.set(o,o.quaternion.clone()); rpos.set(o,o.position.clone()); } });
  const hands=[-1,1].map(side=>({side, hp:MIM_P.handHp, hpMax:MIM_P.handHp, alive:true, frz:0, state:'idle', t:0, kind:'grab', reachT:0, held:false,
    regen:0, armT:null, drive:null, hitDone:false, limb:null}));
  const limbs=MIM_LIMBS.map(L=>{ const chain=L.names.map(n=>map[n]).filter(Boolean), tip=chain[chain.length-1]; let nat=0; for(let i=1;i<chain.length;i++) nat+=chain[i].position.length();
    const o=Object.assign({},L,{chain, tip, nat});
    if(tip){ o.restSh=rig.worldToLocal(chain[0].getWorldPosition(new THREE.Vector3()));
      const wp=tip.getWorldPosition(new THREE.Vector3()); let far=null, fd=0;
      tip.traverse(b=>{ if(!b.isBone||b===tip) return; const d=b.getWorldPosition(new THREE.Vector3()).distanceTo(wp); if(d>fd){ fd=d; far=b; } });
      o.hitChain=far?chain.concat([far]):chain; }
    o.hand=L.front?hands.find(h=>h.side===L.side):null; if(o.hand) o.hand.limb=o;
    return o; });
  const m={kind:'mim', rig, mesh, mat, bone:map, root, rest, rpos, limbs, hands,
    pos:new THREE.Vector3(), kv:new THREE.Vector3(), yaw:0, hp:800, hpMax:800, frz:0, alerted:false, alive:false, active:false, state:'wander', t:0,
    target:new THREE.Vector3(), home:new THREE.Vector3(), speed:0, walkPh:0, spawnCd:0, cuts:0, eatT:-1, clock:0, lastAct:-99, voiceT:3, deadT:0, prox:[]};
  m.blob=mobBlob(2.0);
  /* 본체 — 몸통 공(키의 가운데 · 아레나 BODY_R) · 손 — 어깨부터 손가락 끝까지 마디마다 공 */
  m.prox.push(mobProxy(m,()=>_moV.set(m.pos.x,m.pos.y+MIM_H*0.5,m.pos.z),2.02));
  for(const L of limbs) if(L.hand&&L.hitChain) for(const b of L.hitChain){ const v=new THREE.Vector3(), hd=L.hand;
    m.prox.push(mimProxy(hd,()=>b.getWorldPosition(v),0.6,d=>mimHandHit(m,hd,d))); }
  return m;
}
/* 새끼 거미 — 몸 열다섯(스킨워커 셋 × 다섯)을 돌려 쓴다 */
function mimSpiderMake(){
  const sp={kind:'spd', pos:new THREE.Vector3(), yaw:0, hp:MIM_SPD.hp, hpMax:MIM_SPD.hp, alive:false, active:false, frz:0, cd:0, prox:[]};
  sp.mesh=new THREE.Mesh(MON.sGeo,MON.sMat); sp.mesh.scale.setScalar(MON.sSc); sp.mesh.visible=false; sp.mesh.userData.lightRole='recv'; scene.add(sp.mesh);
  sp.blob=mobBlob(0.5);
  sp.prox.push(mimProxy(sp,()=>_moV.set(sp.pos.x,sp.pos.y+0.2,sp.pos.z),0.6,d=>{ sp.hp-=d; mobVoice('hurt',sp.pos.x,sp.pos.y,sp.pos.z,0.6);
    if(sp.hp<=0){ sp.hp=0; mimSpiderOff(sp); toast('새끼 거미를 밟았다'); } }));
  return sp;
}
function mimSpiderOff(sp){ sp.alive=false; sp.active=false; mobRegister(sp,false); sp.mesh.visible=false; sp.blob.visible=false; }
const _moA=new THREE.Vector3(), _moB=new THREE.Vector3(), _moC=new THREE.Vector3(), _moI=new THREE.Quaternion(), _moW=new THREE.Quaternion();
function mobCcd(chain,target,iters,damp){
  const tip=chain[chain.length-1];
  for(let it=0;it<iters;it++) for(let i=0;i<chain.length-1;i++){ const bn=chain[i];
    _moB.setFromMatrixPosition(bn.matrixWorld); _moA.setFromMatrixPosition(tip.matrixWorld).sub(_moB); _moC.copy(target).sub(_moB);
    if(_moA.lengthSq()<1e-8||_moC.lengthSq()<1e-8) continue;
    _moQ.setFromUnitVectors(_moA.normalize(),_moC.normalize()); if(damp<1) _moQ.slerp(_moI,1-damp);
    bn.parent.getWorldQuaternion(_moW); _moQ2.copy(_moW).invert().multiply(_moQ).multiply(_moW); bn.quaternion.premultiply(_moQ2); bn.updateWorldMatrix(false,true); }
}
function mobRotBone(bn,axis,ang){
  if(!bn||!bn.parent||!ang) return;
  _moQ.setFromAxisAngle(axis,ang); bn.parent.getWorldQuaternion(_moW); _moQ2.copy(_moW).invert().multiply(_moQ).multiply(_moW);
  bn.quaternion.premultiply(_moQ2); bn.updateWorldMatrix(false,true);
}
const _mSide=new THREE.Vector3(), _mUp=new THREE.Vector3(0,1,0);
/* 자세 — 아레나 poseMimic 그대로(걷기 · 늘어나는 앞다리 · 어깨를 먼저 돌리고 CCD) */
function mimPose(m,dt){
  const R=m.rig;
  const bob=m.alive?Math.sin(m.walkPh*2)*0.035*clamp(m.speed/MIM_P.chase,0,1):0;
  R.position.set(m.pos.x,m.pos.y+bob,m.pos.z); R.rotation.set(0,m.yaw,0);
  if(!m.alive){ const k=Math.min(1,m.deadT/1.2); R.rotation.z=k*1.35; R.position.y=m.pos.y-k*0.6-Math.max(0,m.deadT-60)*0.05; }   // 쓰러짐(섬에서 사체가 남는다)
  m.root.traverse(o=>{ if(!o.isBone) return; const q=m.rest.get(o); if(q) o.quaternion.copy(q); const v=m.rpos.get(o); if(v) o.position.copy(v); });
  R.updateMatrixWorld(true);
  const gait=clamp(m.speed/MIM_P.chase,0,1), amp=0.35+0.65*gait;
  _mSide.set(Math.cos(m.yaw),0,-Math.sin(m.yaw));
  for(const L of m.limbs){ if(!L.tip) continue;
    const hd=L.hand; let tgt=null;
    if(hd&&hd.alive&&hd.armT) tgt=hd.armT;
    else if(hd&&!hd.alive) continue;                                          // 잘린 앞다리는 늘어져 있다
    if(L.front){ const need=tgt?mimHandOrigin(m,hd).distanceTo(tgt):0, nat=L.nat*MON.mSc;
      const k=tgt?clamp(need/Math.max(nat,1e-4),1,MIM_MAXSTRETCH):1;
      for(let i=1;i<L.chain.length;i++) L.chain[i].position.copy(m.rpos.get(L.chain[i])).multiplyScalar(k);
      if(k!==1) R.updateMatrixWorld(true); }
    if(!tgt){
      const ph=m.walkPh+(L.front?0:Math.PI)+(L.side<0?0:Math.PI), sw=Math.sin(ph);
      mobRotBone(L.chain[0],_mSide,sw*MIM_SWING*amp); mobRotBone(L.chain[1],_mSide,-sw*MIM_SWING*amp*0.30+Math.max(0,sw)*MIM_KNEE*amp);
      continue; }
    const drv=hd&&hd.drive;
    if(drv){ mobRotBone(L.chain[0],drv.up?_mSide:_mUp,drv.ang*(drv.up?1:L.side)); mobCcd(L.chain.slice(1),tgt,3,0.85); }
    else mobCcd(L.chain,tgt,3,0.85);
  }
}

/* ── 돌보기(매 프레임 · 놀이 중) ─────────────────────────────────────────────── */
function updateMobs(dt){
  MON.frame=(MON.frame|0)+1;
  mobCamera(dt);
  if(!MON.built||(P.tv|0)<8) return;
  const k=MON.k;
  MON.spawnT-=dt; if(MON.spawnT<=0){ MON.spawnT=1.2; mobSpawner(k); }
  for(const m of MON.crawl) if(m.active) crawlTick(m,dt);
  for(const g of MON.garg) if(g.active) gargTick(g,dt);
  for(const m of MON.mim) if(m.active) mimTick(m,dt);
  for(const b of MON.bear) if(b.active) bearTick(b,dt);
  if(typeof wyvTick==='function') wyvTick(dt,k);
  for(const sp of MON.spd) if(sp.active) mimSpiderTick(sp,dt);
  mimSpiderSeparate();
  mobSeparate(dt);
}
/* 화면 흔들림(맞았을 때) · 휘두를 때의 시점 움찔(ATK.kick — 74-icons-guns.js) — 사람 시점(updatePlayer)을 세운 뒤에 얹는다 */
function mobCamera(dt){
  if(!flyMode&&!PL.dead){
    if(MON.shake>0.002){ const s=MON.shake*MON.shake, t=performance.now()*0.001; camera.rotation.x+=Math.sin(t*61)*0.035*s; camera.rotation.y+=Math.sin(t*47+1.3)*0.03*s; MON.shake*=Math.exp(-4.5*dt); }
    if(Math.abs(MON.roll)>0.002){ camera.rotation.z+=MON.roll; MON.roll*=Math.exp(-7*dt); }
    if(ATK.kick){ camera.rotation.x+=ATK.kick.x; camera.rotation.y+=ATK.kick.y; camera.rotation.z+=ATK.kick.z; const d=Math.exp(-11*dt); ATK.kick.x*=d; ATK.kick.y*=d; ATK.kick.z*=d; }
  }
}
/* 세우고 거두기 — 1.2초마다 */
function mobSpawner(k){
  const px=PL.pos.x, pz=PL.pos.z, night=mobNight(), under=!!PL.under;
  /* 다지류 — 둥지마다 하나 · 켜는 둥지 수는 몬스터 수에 따른다 */
  const nL=k<=0?0:Math.min(MON.lairs.length,Math.max(1,Math.round(4*k)));
  for(const l of MON.lairs){ const d=Math.hypot(l.x-px,l.z-pz), want=l.id<nL&&!l.skip&&d<650&&!under;
    if(want&&!l.cr){ const m=MON.crawl.find(c=>!c.active); if(m) crawlAttach(m,l,night); }
    else if(!want&&l.cr&&d>800){ const m=l.cr; mobRegister(m,false); m.active=false; mobHide(m); } }
  for(const m of MON.crawl) if(m.active&&!m.alive&&m.deadT>90){ mobRegister(m,false); m.active=false; mobHide(m); }
  /* 가고일 · 스킨워커 — 사람 둘레에만, 멀어지면 거둔다 */
  for(const list of [MON.garg,MON.mim,MON.bear]) for(const m of list){ if(!m.active) continue;
    const d=Math.hypot(m.pos.x-px,m.pos.z-pz);
    if(d>340||(!m.alive&&m.deadT>90)||k<=0){ mobRegister(m,false); m.active=false; mobHide(m); if(m.pick){ const i=MON.picks.indexOf(m.pick); if(i>=0) MON.picks.splice(i,1); m.pick=null; } } }
  for(const sp of MON.spd) if(sp.active&&(Math.hypot(sp.pos.x-px,sp.pos.z-pz)>340||k<=0)) mimSpiderOff(sp);
  if(k<=0||under||PL.swim) return;
  const fwdX=-Math.sin(PL.yaw), fwdZ=-Math.cos(PL.yaw);
  const spot=(ok,rmin,rmax)=>{ for(let t=0;t<14;t++){ const a=Math.random()*6.283, r=rmin+Math.random()*(rmax-rmin), x=px+Math.cos(a)*r, z=pz+Math.sin(a)*r;
      if(Math.cos(a)*fwdX+Math.sin(a)*fwdZ>0.45) continue;                   // 눈앞에 불쑥 서지 않게
      if(heightAt(x,z)>=0.5&&ok(x,z)) return [x,z]; } return null; };   // 물 위 자리는 버린다(예전엔 조건이 거꾸로라 스킨워커 41% · 가고일 17% 가 물속에 섰다)
  /* 가고일 — 풀밭 · 탁상지 */
  const gAlive=MON.garg.filter(g=>g.active).length, gWant=Math.min(6,Math.round(4*k));
  if(gAlive<gWant&&Math.random()<0.35){
    const mesa=(x,z)=>(typeof LANDFORMS!=='undefined')&&LANDFORMS.some(L=>L.k==='mesa'&&Math.hypot(x-(L.x-N/2)*CELL,z-(L.z-N/2)*CELL)<L.R*CELL*1.2);
    const s=spot((x,z)=>heightAt(x,z)>0.5&&(mobBiome(x,z)===B.MEADOW||mesa(x,z)),70,170);
    if(s){ const n=Math.min(gWant-gAlive,2+((Math.random()*2)|0)); for(let i=0;i<n;i++){ const g=MON.garg.find(q=>!q.active); if(!g) break; gargSpawn(g,s[0]+(Math.random()-0.5)*14,s[1]+(Math.random()-0.5)*14); } } }
  /* 아르크토스 — 침엽수림 · 덤불 · 바위 비탈(우거진 활엽수림 · 대숲은 다지류 몫) · 낮이고 밤이고 */
  const bAlive=MON.bear.filter(b=>b.active).length, bWant=Math.min(3,Math.round(1.5*k));
  if(bAlive<bWant&&Math.random()<0.25){
    const s=spot((x,z)=>{ const b=mobBiome(x,z); return heightAt(x,z)>0.5&&(b===B.CONIFER||b===B.SCRUB||b===B.ROCK||b===B.SCREE); },70,170);
    if(s){ const b=MON.bear.find(q=>!q.active); if(b) bearSpawn(b,s[0],s[1]); } }
  /* 스킨워커 — 숲(낮엔 숲 속만) · 밤의 들판 · 빛이 없는 데 */
  const mAlive=MON.mim.filter(m=>m.active).length, mWant=Math.min(3,Math.round(2*k));
  if(mAlive<mWant&&Math.random()<0.25){
    const s=spot((x,z)=>{ const b=mobBiome(x,z); return heightAt(x,z)>0.5&&(mobForestB(b)||(night&&(b===B.MEADOW||b===B.SCRUB))); },70,140);
    if(s){ const m=MON.mim.find(q=>!q.active); if(m) mimSpawn(m,s[0],s[1]); } }
}

/* ── 다지류 ──────────────────────────────────────────────────────────────── */
function crawlCoil(m){                                                       // 둥지 방에 똬리 — 가운데에 머리, 바깥으로 감긴 길
  const cr=m.cr, l=m.lair, T=cr.TRAIL; T.length=0; let th=Math.random()*6.283, r=0.8, len=0, px=l.x+Math.cos(th)*r, pz=l.z+Math.sin(th)*r;
  cr.head.set(px,0,pz); T.push([px,pz]);
  while(len<cr.restLen+3){ th+=CRW.STEP/Math.max(r,0.6); r=Math.min(l.R*0.9,0.8+th*0.32); const x=l.x+Math.cos(th)*r, z=l.z+Math.sin(th)*r; len+=Math.hypot(x-px,z-pz); px=x; pz=z; T.push([x,z]); }
  cr.hdg=th+Math.PI; cr.state='chase';
}
function crawlAttach(m,l,night){
  m.lair=l; l.cr=m; m.cr.mesh.position.y=0; m.active=true; m.alive=true; m.hp=m.hpMax; m.cr.alive=true; m.cr.hp=m.hpMax; m.alerted=false; m.deadT=0; m.frz=0; m.kv.set(0,0,0);
  if(night){ const w=crawlWaypoint(m); placeCrawler(m.cr,w.x,w.z,Math.random()*6.283); m.mode='roam'; }
  else{ crawlCoil(m); m.mode='sleep'; }
  m.cr.mesh.visible=true; mobRegister(m,true);
}
function crawlWaypoint(m){
  const l=m.lair;
  for(let t=0;t<24;t++){ const a=Math.random()*6.283, r=40+Math.random()*340, x=l.fx+(l.x-l.fx)*0.3+Math.cos(a)*r, z=l.fz+(l.z-l.fz)*0.3+Math.sin(a)*r;
    if(heightAt(x,z)>1&&mobLushB(mobBiome(x,z))) return {x,y:heightAt(x,z),z}; }
  return {x:l.fx,y:heightAt(l.fx,l.fz),z:l.fz};
}
/* 아레나(beta/crawler_arena.html 의 P)와 같은 값 — 보폭 · 닿는 구 반지름은 크기(CRW.SIZE ÷ 아레나 1.5)에 맞춰 줄인다 */
const CRWP={spd:1.0, turn:55, dmg:40, tick:0.5, rad:1.1, stride:1.8, dashEvery:20, dashLen:50, hp:1500};
const crwK=()=>CRW.SIZE/1.5;
const _crwT={x:0,y:0,z:0};
function crawlTick(m,dt){
  const cr=m.cr, night=mobNight();
  if(!m.alive){ m.deadT+=dt; cr.alive=false; stepCrawler(cr,dt,null,{hold:true,stride:CRWP.stride*crwK(),lim:HALF}); cr.mesh.position.y=-Math.max(0,m.deadT-40)*0.04; return; }
  if(m.hitT>0) m.hitT-=dt;
  const dP=Math.hypot(PL.pos.x-cr.head.x,PL.pos.z-cr.head.z);
  let tg=null, dashE=CRWP.dashEvery;
  if(m.mode==='sleep'){
    if(night||m.alerted){ m.mode=m.alerted?'hunt':'roam'; m.wp=crawlWaypoint(m); mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,1.3); }
  }else if(m.mode==='roam'){
    if(!night&&!m.alerted) m.mode='return';
    else{ if(!m.wp||Math.hypot(m.wp.x-cr.head.x,m.wp.z-cr.head.z)<14||(m.wpT-=dt)<0){ m.wp=crawlWaypoint(m); m.wpT=25; } tg=m.wp;
      if(dP<50&&!PL.under&&!PL.dead){ m.mode='hunt'; mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,1.5); } }
  }else if(m.mode==='hunt'){
    tg=_crwT; _crwT.x=PL.pos.x; _crwT.y=PL.pos.y; _crwT.z=PL.pos.z;
    if(dP>120||PL.dead||PL.under){ m.mode=night?'roam':'return'; m.alerted=false; }
    else if(!night&&!m.alerted) m.mode='return';
  }else if(m.mode==='return'){
    tg=_crwT; _crwT.x=m.lair.x; _crwT.y=m.lair.y; _crwT.z=m.lair.z; dashE=1e9;
    if(Math.hypot(m.lair.x-cr.head.x,m.lair.z-cr.head.z)<4){ crawlCoil(m); m.mode='sleep'; }
    if(dP<25&&!PL.dead) m.mode='hunt';
  }
  if(m.frz>0){ m.frz=Math.max(0,m.frz-dt); cr.frz=Math.max(cr.frz,m.frz); }
  stepCrawler(cr,dt,tg,{spd:CRWP.spd, turn:CRWP.turn, stride:CRWP.stride*crwK(), dashEvery:dashE, dashLen:CRWP.dashLen, lim:HALF-40, hold:m.mode==='sleep'});
  /* 소리 — 다리 딸깍임(움직이는 동안) · 가끔 쇳소리 */
  if(cr.speed>0.5&&(m.clickT-=dt)<0){ m.clickT=0.18+Math.random()*0.25; if(dP<70) mobVoice('click',cr.head.x,cr.head.y,cr.head.z,cr.state==='dash'?1.5:0.8); }
  if(m.mode!=='sleep'&&(m.voiceT-=dt)<0){ m.voiceT=6+Math.random()*10; if(dP<110) mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,0.9); }
  /* 닿기(아레나 updateCrawler 그대로) — 마디 구에 사람이 들면 밀어내고 0.5초마다 40(갑옷이 깎는다) · 떨어지면 다음 닿는 순간 바로 한 번 */
  if(m.mode!=='sleep'&&!PL.dead){ let hit=null; const R=CRWP.rad*crwK()+0.35;
    for(const S of cr.SPINE){ const dx=PL.pos.x-S.p.x, dz=PL.pos.z-S.p.z, d=Math.hypot(dx,dz);
      if(d<R&&PL.pos.y<S.p.y+1.5){ hit=S; if(d>1e-3){ PL.pos.x=S.p.x+dx/d*R; PL.pos.z=S.p.z+dz/d*R; } } }
    if(hit){ m.touchT-=dt; if(m.touchT<=0){ m.touchT=CRWP.tick; hurtPL(CRWP.dmg,'다지류에 받혔다',true); mobVoice('thud',PL.pos.x,PL.pos.y+1,PL.pos.z,1); } }
    else m.touchT=Math.min(m.touchT,0); }
}

/* ── 가고일 ──────────────────────────────────────────────────────────────── */
const GP2={wander:1.6, chase:1.1, see:30, trig:10, prep:1.0, dash:20, dspd:1.8, stun:3.5, hover:0.3, dmg:28};
function gargSpawn(g,x,z){
  g.active=true; g.alive=true; g.hp=g.hpMax; g.frz=0; g.alerted=false; g.state='wander'; g.t=0; g.an=null; g.kv.set(0,0,0);
  g.pos.set(x,heightAt(x,z)+GP2.hover,z); g.home.set(x,0,z); g.yaw=Math.random()*6.283; gargWander(g);
  mobRegister(g,true);
}
function gargWander(g){ for(let t=0;t<8;t++){ const a=Math.random()*6.283, r=8+Math.random()*55, x=g.home.x+Math.cos(a)*r, z=g.home.z+Math.sin(a)*r; if(heightAt(x,z)>0.5){ g.target.set(x,0,z); return; } } g.target.copy(g.home); }
function gargSet(g,s){ g.state=s; g.t=0; g.hitDone=false; }
function gargTick(g,dt){
  const gy=Math.max(heightAt(g.pos.x,g.pos.z),-0.3);
  if(!g.alive){ g.deadT=(g.deadT||0)+dt; gargDraw(g,dt,null,gy); g.blob.visible=false; return; }
  if(g.hitT>0) g.hitT-=dt;
  const dx=PL.pos.x-g.pos.x, dz=PL.pos.z-g.pos.z, dist=Math.hypot(dx,dz);
  /* 아레나 updateG 그대로 — 굳어 있는 동안(돌진 뒤 경직 · 해머 기절이 같은 시계 g.frz 를 쓰고 더해진다)은 아무것도 안 한다 */
  if(g.frz>0){ g.frz=Math.max(0,g.frz-dt); g.speed=0; if(g.frz<=0&&g.state==='stun') gargSet(g,dist<GP2.see?'chase':'wander'); }
  else{
    let mx=0, mz=0, spd=0;
    g.t+=dt;
    if(g.state==='wander'){ if((dist<GP2.see&&!PL.under)||g.alerted){ gargSet(g,'chase'); mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,1.2); }
      else{ const tx=g.target.x-g.pos.x, tz=g.target.z-g.pos.z, l=Math.hypot(tx,tz); if(l<2.5) gargWander(g); else{ mx=tx/l; mz=tz/l; spd=GP2.wander; } } }
    else if(g.state==='chase'){ if((dist>GP2.see*1.35&&!g.alerted)||PL.dead){ gargSet(g,'wander'); gargWander(g); g.alerted=false; }
      else if(dist<GP2.trig){ gargSet(g,'prep'); mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,1.4); } else{ mx=dx/dist; mz=dz/dist; spd=RUN*GP2.chase; } }
    else if(g.state==='prep'){ if(g.t>=GP2.prep){ g.dir.set(dx/dist,0,dz/dist); g.dashLeft=GP2.dash; gargSet(g,'dash'); } }
    else if(g.state==='dash'){ const s=Math.min(RUN*GP2.chase*GP2.dspd*dt,g.dashLeft); mx=g.dir.x; mz=g.dir.z; spd=s/Math.max(dt,1e-6); g.dashLeft-=s;
      /* 경로에 사람이 있으면 팔을 휘두른다(돌진 한 번에 한 대) — 본편은 높이 차 2.2 m 안도 본다(사용자가 정함) */
      if(!g.hitDone&&dist<2.3&&Math.abs(PL.pos.y+0.9-g.pos.y)<2.2){ g.hitDone=true; hurtPL(GP2.dmg,'가고일의 발톱',true); mobVoice('thud',PL.pos.x,PL.pos.y+1,PL.pos.z,1); }
      if(g.dashLeft<=0.001){ gargSet(g,'stun'); g.frz+=GP2.stun; } }
    else if(g.state==='stun') gargSet(g,dist<GP2.see?'chase':'wander');
    /* 막히면(아레나의 벽 대신 물 · 바위) 배회는 새 목표 · 돌진은 끊고 굳는다 */
    if(spd>0){ const nx=g.pos.x+mx*spd*dt, nz=g.pos.z+mz*spd*dt;
      if(heightAt(nx,nz)>-0.5&&!solidAt(nx,nz,heightAt(nx,nz)+1.2)){ g.pos.x=nx; g.pos.z=nz; } else if(g.state==='dash'){ g.dashLeft=0; gargSet(g,'stun'); g.frz+=GP2.stun; } else if(g.state==='wander') gargWander(g);
      let d=Math.atan2(mx,mz)-g.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; g.yaw+=d*clamp((g.state==='dash'?18:6)*dt,0,1); }
    else if(g.state==='prep'||g.state==='stun'){ let d=Math.atan2(dx,dz)-g.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; g.yaw+=d*clamp((g.state==='prep'?7:1.5)*dt,0,1); }
    g.speed=spd;
    /* 저공비행 — 땅에서 일정 높이 · 위아래로 살짝(개체마다 위상만 다르게) */
    g.pos.y=Math.max(heightAt(g.pos.x,g.pos.z),-0.3)+GP2.hover+(g.state==='stun'?0:Math.sin(performance.now()*0.004+g.home.x)*0.05);
  }
  if((g.voiceT-=dt)<0){ g.voiceT=5+Math.random()*9; if(dist<90) mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,0.7); }
  const gy2=Math.max(heightAt(g.pos.x,g.pos.z),-0.3);
  _moV.set(PL.pos.x,PL.pos.y+EYE*0.8,PL.pos.z);                               // 아레나처럼 늘 사람을 본다
  gargDraw(g,dt,_moV,gy2);
  g.blob.visible=true; g.blob.position.set(g.pos.x,gy2+0.05,g.pos.z);
}


/* ── 아르크토스 ─────────────────────────────────────────────────────────────
   아레나(beta/bear_arena.html updateB)와 같다 — 배회(1.5 m/s) → 34 m 안에 들면(또는 맞으면) 쫓는다(달리기 × 1.3 = 9.6 m/s ·
   45.9 m 밖이면 놓음) → 4.5 m 에서 내려찍기(1초 — 치켜듦 0.5 · 정점 0.08 · 앞으로 1.2 m 던지며 내려찍음 · 0.68 에 명중) → 1.05초 굳음.
   찍는 동안에도 초당 6 rad 까지 사람 쪽으로 돈다(옆으로 돌아서는 못 흘린다 — 사거리 밖으로 빠져야 한다).
   맞는 자리는 뼈 캡슐(bearHitCaps)의 몸통 · 목 · 머리 · 팔다리 마디 가운데 공 열하나. 섬에 맞춘 것은 생기고 거두기 · 물 · 바위에
   막힘 · 사체 · 소리뿐이다. */
const BEAR_SC=2.6*1.32/3.003;                                                 // 모델 3.0 → 3.43 m(아레나 SCL)
const BEAR_BODY_R=1.07*BEAR_SC+0.42;                                          // 이보다 사람에게 붙지 않는다(아레나 BODY_R)
const BEAR_HP=400;
const BEAR_PROX=['hips','spine','chest','neck','head','armR','foreR','armL','foreL','thighR','thighL'];
/* 곰 GLB — 위치 · 법선 · 정점색(핏자국)뿐이다(아레나 parseGLB 그대로 · 정점색은 Three 의 color 로) */
function parseGLB_bear(buf){
  const dv=new DataView(buf); let off=12, json=null, bin=null;
  while(off<dv.byteLength){ const len=dv.getUint32(off,true), type=dv.getUint32(off+4,true);
    if(type===0x4E4F534A) json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,off+8,len))); else bin=off+8; off+=8+len; }
  const CT={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}, NC={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const acc=i=>{ const a=json.accessors[i], bv=json.bufferViews[a.bufferView]; return new CT[a.componentType](buf,bin+(bv.byteOffset||0)+(a.byteOffset||0),a.count*NC[a.type]); };
  const pr=json.meshes[0].primitives[0], g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(acc(pr.attributes.POSITION),3));
  g.setAttribute('normal',new THREE.BufferAttribute(acc(pr.attributes.NORMAL),3));
  g.setAttribute('color',new THREE.BufferAttribute(acc(pr.attributes.COLOR_0),3));
  g.setIndex(new THREE.BufferAttribute(acc(pr.indices),1));
  return g;
}
function bearMake(geo){
  const mat=new THREE.MeshLambertMaterial({vertexColors:true});
  const b={kind:'bear', mat, pos:new THREE.Vector3(), kv:new THREE.Vector3(), yaw:0, hp:BEAR_HP, hpMax:BEAR_HP, frz:0, alerted:false,
    state:'wander', t:0, target:new THREE.Vector3(), dir:new THREE.Vector3(0,0,1), speed:0, walkPh:0, hitDone:false, alive:false, active:false,
    home:new THREE.Vector3(), flash:0, deadT:0, voiceT:4, prox:[], sph:BEAR_PROX.map(()=>new THREE.Vector3()), sr:BEAR_PROX.map(()=>0.6)};
  b.body=bearBody(geo,mat,BEAR_SC); b.body.mesh.visible=false; b.body.mesh.userData.lightRole='recv'; scene.add(b.body.mesh);
  b.blob=mobBlob(1.5);
  BEAR_PROX.forEach((nm,i)=>b.prox.push(mobProxy(b,()=>b.sph[i],0.6)));
  return b;
}
function bearSpawn(b,x,z){
  b.active=true; b.alive=true; b.hp=b.hpMax; b.frz=0; b.alerted=false; b.state='wander'; b.t=0; b.speed=0; b.an=null; b.deadT=0; b.flash=0;
  b.pos.set(x,heightAt(x,z),z); b.home.set(x,0,z); b.yaw=Math.random()*6.283; bearWander(b);
  for(let i=0;i<b.sph.length;i++) b.sph[i].set(x,b.pos.y+1.5,z);
  mobRegister(b,true);
}
function bearWander(b){ for(let t=0;t<10;t++){ const a=Math.random()*6.283, r=10+Math.random()*60, x=b.home.x+Math.cos(a)*r, z=b.home.z+Math.sin(a)*r;
  if(heightAt(x,z)>0.5){ b.target.set(x,0,z); return; } } b.target.copy(b.home); }
function bearSet(b,s){ b.state=s; b.t=0; b.hitDone=false; }
/* 앞발이 땅에 닿는 순간 — 곰 앞 120° 부채꼴 · 사거리 × 1.05 안이면 맞는다(아레나 slamLand) */
function bearSlam(b){
  const fx=Math.sin(b.yaw), fz=Math.cos(b.yaw), dx=PL.pos.x-b.pos.x, dz=PL.pos.z-b.pos.z, d=Math.hypot(dx,dz)||1;
  mobVoice('slam',b.pos.x+fx*2.5,b.pos.y,b.pos.z+fz*2.5,1.4);
  if(d<30) MON.shake=Math.min(1,MON.shake+0.55*Math.max(0,1-d/30));
  if(d<=BEAR_P.reach*1.05&&(dx/d)*fx+(dz/d)*fz>0.5&&Math.abs(PL.pos.y-b.pos.y)<2.6&&!PL.dead) hurtPL(BEAR_P.dmg,'아르크토스의 내려찍기',true);
}
function bearTick(b,dt){
  const gy=heightAt(b.pos.x,b.pos.z);
  b.flash=Math.max(0,b.flash-dt*5); if(b.hitT>0){ b.hitT-=dt; b.flash=Math.max(b.flash,b.hitT*2); }
  b.mat.emissive.setRGB(b.flash*0.45,b.flash*0.08,b.flash*0.05);
  if(!b.alive){ b.deadT+=dt; b.speed=0; bearDraw(b,dt,null,gy-Math.max(0,b.deadT-60)*0.04); b.blob.visible=false; return; }
  const dx=PL.pos.x-b.pos.x, dz=PL.pos.z-b.pos.z, dist=Math.hypot(dx,dz);
  /* 굳어 있는 동안(찍고 난 경직 · 해머 기절이 같은 시계 b.frz 를 쓰고 더해진다)은 아무것도 안 한다 */
  if(b.frz>0){ b.frz=Math.max(0,b.frz-dt); b.speed=0; if(b.frz<=0&&b.state==='stun') bearSet(b,dist<BEAR_P.see?'chase':'wander'); }
  else{
    b.t+=dt;
    if(b.state==='wander'){
      const tx=b.target.x-b.pos.x, tz=b.target.z-b.pos.z, td=Math.hypot(tx,tz);
      if(td<2||b.t>40){ bearWander(b); b.t=0; } else{ b.dir.set(tx/td,0,tz/td); b.speed=BEAR_P.wander; }
      if((dist<BEAR_P.see&&!PL.under&&!PL.dead)||b.alerted){ bearSet(b,'chase'); mobVoice('roar',b.pos.x,b.pos.y+2,b.pos.z,1.4); }
    }else if(b.state==='chase'){
      if((dist>BEAR_P.see*1.35&&!b.alerted)||PL.dead||PL.under){ bearSet(b,'wander'); bearWander(b); b.alerted=false; }
      else{ b.dir.set(dx/(dist||1),0,dz/(dist||1)); b.speed=RUN*BEAR_P.mul; if(dist<=BEAR_P.reach){ bearSet(b,'attack'); mobVoice('roar',b.pos.x,b.pos.y+2.5,b.pos.z,1.6); } }
    }else if(b.state==='attack'){
      const u=clamp(b.t/BEAR_P.atk,0,1), Q=BEAR_Q;
      if(u<Q.rise){ b.speed=0.6; b.dir.set(dx/(dist||1),0,dz/(dist||1)); }          // 치켜드는 동안은 아주 느리게 따라 돈다
      else if(u<Q.rise+Q.hold) b.speed=0;                                        // 정점
      else if(u<Q.rise+Q.hold+Q.drop){ b.dir.set(Math.sin(b.yaw),0,Math.cos(b.yaw)); b.speed=BEAR_P.lunge/Math.max(0.001,Q.drop*BEAR_P.atk); }   // 몸이 향한 쪽으로 던진다
      else b.speed=0;
      if(!b.hitDone&&u>=Q.hit){ b.hitDone=true; bearSlam(b); }
      if(u>=1){ bearSet(b,'stun'); b.frz+=BEAR_P.stun; }
    }else if(b.state==='stun'){ b.speed=0; bearSet(b,dist<BEAR_P.see?'chase':'wander'); }
    /* 움직임 — 깊은 물 · 바위에 막힌다(배회는 새 목표) */
    if(b.speed>0){ const nx=b.pos.x+b.dir.x*b.speed*dt, nz=b.pos.z+b.dir.z*b.speed*dt, hN=heightAt(nx,nz);
      if((hN>-0.4||hN>gy)&&!solidAt(nx,nz,hN+1.4)){ b.pos.x=nx; b.pos.z=nz; b.walkPh+=dt*b.speed*1.5; }
      else if(b.state==='wander'){ bearWander(b); b.t=0; } }
    /* 사람을 뚫고 들어가지 않는다 — 앞으로 던진 몸을 몸통 반지름에서 멈춘다 */
    { const sx=b.pos.x-PL.pos.x, sz=b.pos.z-PL.pos.z, sd=Math.hypot(sx,sz);
      if(sd<BEAR_BODY_R&&Math.abs(PL.pos.y-b.pos.y)<2.5){ const a=sd>1e-4?sx/sd:0, c=sd>1e-4?sz/sd:1; b.pos.x=PL.pos.x+a*BEAR_BODY_R; b.pos.z=PL.pos.z+c*BEAR_BODY_R; } }
    /* 늘 가는 쪽을 보고, 찍는 동안엔 사람 쪽으로(초당 BEAR_P.turn rad 까지) */
    { const want=b.state==='attack'?Math.atan2(dx,dz):Math.atan2(b.dir.x,b.dir.z);
      let d=want-b.yaw; while(d>Math.PI) d-=6.283; while(d<-Math.PI) d+=6.283;
      if(b.state==='attack'){ const lim=BEAR_P.turn*dt; b.yaw+=clamp(d,-lim,lim); } else b.yaw+=d*clamp(7*dt,0,1); }
  }
  b.pos.y=heightAt(b.pos.x,b.pos.z);
  if(b.state==='wander'&&(b.voiceT-=dt)<0){ b.voiceT=9+Math.random()*12; if(dist<80) mobVoice('roar',b.pos.x,b.pos.y+2,b.pos.z,0.5); }
  _moV.set(PL.pos.x,PL.pos.y+EYE*0.8,PL.pos.z);
  bearDraw(b,dt,_moV,b.pos.y);
  /* 맞는 공 — 이번 자세의 뼈 캡슐 가운데(반지름은 캡슐 굵기 + 길이의 0.35) */
  const caps=bearHitCaps(b,b.pos.y);
  if(!b.capIx) b.capIx=BEAR_PROX.map(nm=>Object.keys(BEAR_CAPR).indexOf(nm));   // bearHitCaps 는 BEAR_CAPR 차례로 내준다
  BEAR_PROX.forEach((nm,i)=>{ const c=caps[b.capIx[i]]; if(!c) return; b.sph[i].copy(c.a).lerp(c.b,0.5); b.prox[i].r=c.r+c.a.distanceTo(c.b)*0.35; });
  b.blob.visible=true; b.blob.position.set(b.pos.x,b.pos.y+0.05,b.pos.z);
}

/* ── 스킨워커 ─────────────────────────────────────────────────────────────── */
function mimSpawn(m,x,z){
  m.active=true; m.alive=true; m.hp=m.hpMax; m.frz=0; m.alerted=false; m.state='wander'; m.t=0; m.kv.set(0,0,0); m.deadT=0;
  m.spawnCd=0; m.cuts=0; m.eatT=-1; m.clock=0; m.lastAct=-99;
  for(const hd of m.hands){ hd.alive=true; hd.hp=hd.hpMax; hd.frz=0; hd.held=false; hd.regen=0; hd.state='idle'; hd.t=0; hd.reachT=0; hd.armT=null; hd.drive=null; }
  m.pos.set(x,heightAt(x,z),z); m.home.set(x,0,z); m.yaw=Math.random()*6.283; mimWander(m); m.rig.visible=true;
  mobRegister(m,true);
}
function mimWander(m){ for(let t=0;t<10;t++){ const a=Math.random()*6.283, r=10+Math.random()*60, x=m.home.x+Math.cos(a)*r, z=m.home.z+Math.sin(a)*r;
  if(heightAt(x,z)>0.5){ m.target.set(x,0,z); return; } } m.target.copy(m.home); }
function mimSet(m,s){ m.state=s; m.t=0; }
function mimSees(m){
  if(PL.dead||PL.under) return false;
  const dx=PL.pos.x-m.pos.x, dz=PL.pos.z-m.pos.z, d=Math.hypot(dx,dz);
  if(d>MIM_P.see) return false;
  return (dx/d)*Math.sin(m.yaw)+(dz/d)*Math.cos(m.yaw) >= Math.cos(MIM_P.fov/2);
}
const mimLow=m=>m.hp<=MIM_P.lowHp;                                           // 이 아래로는 제 살을 안 깎는다
const mimHeld=m=>m.hands.filter(h=>h.alive&&h.held).length;
function mimHandOrigin(m,hd){                                                 // 어깨 — 쉴 때의 자리를 지금 몸의 자리 · 방향으로 옮긴다
  const r=hd.limb.restSh, k=MON.mSc, s=Math.sin(m.yaw), c=Math.cos(m.yaw), x=r.x*k, y=r.y*k, z=r.z*k;
  return _moC.set(m.pos.x+x*c+z*s, m.pos.y+y, m.pos.z-x*s+z*c);
}
const mimBodyPt=(m,a,d,y)=>new THREE.Vector3(m.pos.x+Math.sin(a)*d, m.pos.y+y, m.pos.z+Math.cos(a)*d);
const mimWhipA0=(m,hd)=>m.yaw+hd.side*1.75, mimWhipA1=(m,hd)=>m.yaw-hd.side*0.85;
function mimHandSet(hd,st){ hd.state=st; hd.t=0; }
/* 손이 맞았다 — 손의 체력만 깎는다. 다 깎이면 잘린다 */
function mimHandHit(m,hd,d){
  if(!m.alive||!hd.alive) return;
  hd.hp-=d; m.alerted=true; if(m.state==='wander') mimSet(m,'chase');
  mobVoice('hurt',m.pos.x,m.pos.y+2,m.pos.z,1);
  if(hd.hp>0) return;
  hd.hp=0; hd.alive=false; hd.held=false; hd.regen=MIM_P.handRegen; hd.armT=null; hd.drive=null; m.cuts++;
  let msg='앞다리를 잘랐다';
  if(m.cuts%MIM_P.cutsForStun===0){ m.frz+=MIM_P.bodyStun; mimSet(m,'stun'); msg+=' — '+MIM_P.cutsForStun+'번째다. 본체가 '+MIM_P.bodyStun+'초 굳는다'; }
  else msg+=' ('+(MIM_P.cutsForStun-m.cuts%MIM_P.cutsForStun)+'번 더 자르면 본체가 굳는다)';
  if(!mimLow(m)) msg+=' · '+MIM_P.handRegen+'초 뒤 되살아난다';
  toast(msg);
}
function mimHand(m,hd,dt){
  if(!hd.alive){
    if(mimLow(m)) return;
    hd.regen-=dt;
    if(hd.regen<=0){ hd.alive=true; hd.hp=hd.hpMax; hd.frz=0; hd.held=false; mimHandSet(hd,'idle'); m.hp=Math.max(1,m.hp-MIM_P.handCost); toast('손이 되살아났다 — 본체 체력 −'+MIM_P.handCost); }
    return; }
  if(hd.frz>0){ hd.frz=Math.max(0,hd.frz-dt); return; }
  hd.t+=dt;
  const O=mimHandOrigin(m,hd).clone(), dist=Math.hypot(PL.pos.x-O.x,PL.pos.z-O.z), P=_moV2.set(PL.pos.x,PL.pos.y+0.9,PL.pos.z);
  if(hd.state==='idle'){
    hd.armT=null; hd.drive=null;
    if(m.state!=='chase'&&m.state!=='spawn') return;
    if(dist>MIM_P.reach*1.15||PL.dead) return;
    if(m.clock-m.lastAct<1.0) return;                                        // 다른 손이 방금 움직였다 — 1초는 기다린다
    m.lastAct=m.clock;
    hd.kind=Math.random()<0.7?'grab':'whip';
    mimHandSet(hd,hd.kind==='grab'?'wind':'whipwind'); mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,1.2);
    return; }
  if(hd.state==='wind'){                                                      // 잡기 — 2초 앞다리를 치켜든다
    const u=clamp(hd.t/MIM_P.grabWind,0,1);
    hd.drive={up:true, ang:MIM_GRABUP*mimEase(u)};
    hd.armT=mimBodyPt(m,m.yaw+hd.side*0.55,1.6+1.4*u,MIM_H*(0.45+0.42*u));
    if(hd.t>=MIM_P.grabWind){ hd.reachT=0; mimHandSet(hd,'reach'); }
  }else if(hd.state==='reach'){
    hd.reachT=Math.min(1,hd.t/MIM_P.grabShoot);
    if(hd.t>=MIM_P.grabShoot){
      if(dist<=MIM_P.reach&&!PL.dead){ hd.held=true; mimHandSet(hd,'hold'); toast('손에 붙잡혔다 — 이 손을 부숴야 풀린다'); }
      else mimHandSet(hd,'back'); }
  }else if(hd.state==='hold'){
    hd.held=true;
    if(hd.t>=MIM_P.grabHold||PL.dead){ hd.held=false; mimHandSet(hd,'back'); }
  }else if(hd.state==='whipwind'){                                           // 채찍 — 옆으로 쭉 뻗어 잠깐 멈춘다
    const u=clamp(hd.t/MIM_P.whipWind,0,1);
    hd.drive={up:false, ang:MIM_WHIPYAW*mimEase(u)};
    hd.armT=mimBodyPt(m,mimWhipA0(m,hd),MIM_P.reach*(0.45+0.55*u),MIM_H*(0.36+0.06*u));
    if(hd.t>=MIM_P.whipWind){ hd.hitDone=false; mimHandSet(hd,'whip'); }
  }else if(hd.state==='whip'){                                               // 부채꼴로 휩쓴다 — 뛰어 있으면 밑으로 빠진다
    const u=clamp(hd.t/MIM_P.whipSwing,0,1), a=mimWhipA0(m,hd)+(mimWhipA1(m,hd)-mimWhipA0(m,hd))*mimEase(u);
    hd.drive={up:false, ang:MIM_WHIPYAW*(1-2*mimEase(u))};
    hd.armT=mimBodyPt(m,a,MIM_P.reach,MIM_H*0.34);
    hd.reachT=Math.sin(u*Math.PI);
    if(!hd.hitDone&&!PL.dead){
      const dx=PL.pos.x-m.pos.x, dz=PL.pos.z-m.pos.z, dd=Math.hypot(dx,dz), pa=Math.atan2(dx,dz), off=Math.abs(((pa-a+Math.PI*3)%(Math.PI*2))-Math.PI);
      if(dd<=MIM_P.reach&&off<0.42){ hd.hitDone=true; if(PL.grounded) hurtPL(MIM_P.whipDmg,'스킨워커의 채찍',true); else toast('뛰어 넘겼다'); } }
    if(hd.t>=MIM_P.whipSwing) mimHandSet(hd,'back');
  }else if(hd.state==='back'){
    hd.reachT=Math.max(0,1-hd.t/0.3);
    hd.armT=O.clone().lerp(P,hd.reachT*0.6);
    hd.drive={up:true, ang:MIM_GRABUP*0.3*hd.reachT};
    if(hd.t>=0.3){ hd.armT=null; mimHandSet(hd,'idle'); }
  }
  if(hd.state==='reach'||hd.state==='hold'){                                  // 뻗기 · 붙잡음은 사람을 그대로 겨눈다
    hd.armT=hd.state==='hold'?P.clone():O.clone().lerp(P,clamp(hd.reachT,0,1));
    hd.drive={up:true, ang:MIM_GRABUP*(hd.state==='hold'?0.25:1-0.75*clamp(hd.reachT,0,1))}; }
}
/* 새끼 뱉기 — 부챗살로 벌려 다섯 */
function mimSpawnSpiders(m){
  if(mimLow(m)) return;
  m.hp=Math.max(1,m.hp-MIM_P.spawnCost); m.spawnCd=MIM_P.spawnCd;
  const live=MON.spd.filter(s=>s.active);
  for(let i=0;i<MIM_P.spawnN;i++){
    const sp=MON.spd.find(s=>!s.active); if(!sp) break;
    const a=((i+0.5)/MIM_P.spawnN-0.5)*2.2, rad=2.6+(i%2)*1.3;
    let x=m.pos.x+Math.sin(m.yaw+a)*rad, z=m.pos.z+Math.cos(m.yaw+a)*rad;
    for(let t=0;t<24;t++){ let px=0,pz=0,hit=false;
      for(const o of live){ const dx=x-o.pos.x, dz=z-o.pos.z, d=Math.hypot(dx,dz), need=MIM_SPD.body*2; if(d<need){ hit=true; const k=(need-d)/(d||1e-4); px+=dx*k; pz+=dz*k; } }
      if(!hit) break; x+=px*0.6+(Math.random()-0.5)*0.1; z+=pz*0.6+(Math.random()-0.5)*0.1; }
    sp.active=true; sp.alive=true; sp.hp=sp.hpMax; sp.frz=0; sp.cd=0; sp.pos.set(x,heightAt(x,z),z); sp.mesh.visible=true; mobRegister(sp,true); live.push(sp);
  }
  toast('입에서 새끼 거미 '+MIM_P.spawnN+'마리 — 본체 체력 −'+MIM_P.spawnCost+' · 뱉느라 '+MIM_P.spawnStun+'초 굳는다');
}
function mimSpiderTick(sp,dt){
  if(sp.frz>0){ sp.frz=Math.max(0,sp.frz-dt); }
  else{
    const dx=PL.pos.x-sp.pos.x, dz=PL.pos.z-sp.pos.z, d=Math.hypot(dx,dz)||1;
    if(sp.cd>0) sp.cd-=dt;
    if(d>MIM_SPD.near){ const v=RUN*MIM_SPD.speed; sp.pos.x+=dx/d*v*dt; sp.pos.z+=dz/d*v*dt; }   // 무조건 따라온다
    else if(sp.cd<=0&&!PL.dead){ sp.cd=MIM_SPD.biteCd; hurtPL(MIM_SPD.bite,'새끼 거미',true); }
    sp.yaw=Math.atan2(dx,dz);
  }
  sp.pos.y=heightAt(sp.pos.x,sp.pos.z);
  sp.mesh.position.copy(sp.pos); sp.mesh.rotation.set(0,sp.yaw,0);
  sp.blob.visible=true; sp.blob.position.set(sp.pos.x,sp.pos.y+0.04,sp.pos.z);
}
function mimSpiderSeparate(){
  const L=MON.spd.filter(s=>s.active);
  for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const A=L[i], B=L[j], dx=B.pos.x-A.pos.x, dz=B.pos.z-A.pos.z, d=Math.hypot(dx,dz), need=MIM_SPD.body*2;
    if(d>=need||d<1e-5) continue; const p=(need-d)*0.5, ux=dx/d, uz=dz/d; A.pos.x-=ux*p; A.pos.z-=uz*p; B.pos.x+=ux*p; B.pos.z+=uz*p; }
}
/* 본체 — 아레나 updateM 그대로(배회 → 다가옴 · 새끼 뱉기 · 굳음) */
function mimTick(m,dt){
  if(!m.alive){ m.deadT+=dt; m.speed=0; m.blob.visible=false; for(const hd of m.hands){ hd.held=false; hd.armT=null; } mimPose(m,dt); return; }
  m.clock+=dt;
  const dx=PL.pos.x-m.pos.x, dz=PL.pos.z-m.pos.z, dist=Math.hypot(dx,dz)||1;
  let mx=0, mz=0, spd=0;
  if(m.frz>0){
    m.frz=Math.max(0,m.frz-dt);
    if(m.frz<=0&&m.state==='stun') mimSet(m,mimSees(m)?'chase':'wander');
  }else{
    m.t+=dt; if(m.spawnCd>0) m.spawnCd-=dt;
    if(m.state==='stun') mimSet(m,'chase');
    if(m.state==='wander'){
      if(mimSees(m)||m.alerted){ mimSet(m,'chase'); mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,1); }
      else{ const tx=m.target.x-m.pos.x, tz=m.target.z-m.pos.z, l=Math.hypot(tx,tz); if(l<3||m.t>30){ mimWander(m); m.t=0; } else{ mx=tx/l; mz=tz/l; spd=MIM_P.walk; } } }
    else if(m.state==='chase'){
      if((dist>MIM_P.see*1.4&&!m.alerted)||PL.dead||PL.under){ mimSet(m,'wander'); mimWander(m); m.alerted=false; }
      else{
        const want=MIM_P.reach*0.42, tooClose=1.8;
        if(dist>want){ mx=dx/dist; mz=dz/dist; spd=MIM_P.chase; }
        else if(dist<tooClose&&!m.hands.some(h=>h.held)){ mx=-dx/dist; mz=-dz/dist; spd=MIM_P.chase*0.45; }
        if(m.spawnCd<=0&&!mimLow(m)&&!MON.spd.some(s=>s.active)&&m.hp<m.hpMax*0.8&&dist<MIM_P.see*0.5) mimSet(m,'spawn');
      } }
    else if(m.state==='spawn'){
      if(m.t>=1.2){ mimSpawnSpiders(m); m.frz+=MIM_P.spawnStun; mimSet(m,'stun');
        for(const hd of m.hands){ hd.frz=Math.max(hd.frz,MIM_P.spawnStun); hd.held=false; hd.armT=null; hd.drive=null; mimHandSet(hd,'idle'); } } }
  }
  if(spd>0){ const nx=m.pos.x+mx*spd*dt, nz=m.pos.z+mz*spd*dt, hN=heightAt(nx,nz), hC=heightAt(m.pos.x,m.pos.z);
    if((hN>0.3||hC<=0.3)&&!solidAt(nx,nz,hN+1.5)){ m.pos.x=nx; m.pos.z=nz; m.walkPh+=dt*spd*0.85; }   // 물에 들어가 있으면 어디로든 걸어 나온다
    else if(m.state==='wander') mimWander(m); }
  m.speed=spd;
  /* 늘 사람 쪽을 본다(시야각이 몸이 향한 쪽 기준이라서) — 배회 중엔 가는 쪽 */
  let face=null, rate=2.4;
  if(m.state!=='wander'||mimSees(m)) face=Math.atan2(dx,dz); else if(spd>0){ face=Math.atan2(mx,mz); rate=1.6; }
  if(face!==null){ let d=face-m.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; m.yaw+=d*clamp(rate*dt,0,1); }
  m.pos.y=heightAt(m.pos.x,m.pos.z);
  /* 두 손에 잡히면 삼켜진다 */
  if(mimHeld(m)>=2){ if(m.eatT<0){ m.eatT=MIM_P.eat; toast('두 손에 붙잡혔다 — 한 손이라도 부숴야 한다'); }
    m.eatT-=dt; if(m.eatT<=0&&!PL.dead){ hurtPL(99999,'스킨워커에게 삼켜졌다',false); m.eatT=-1; } }
  else m.eatT=-1;
  if(m.frz<=0) for(const hd of m.hands) mimHand(m,hd,dt);                   // 본체가 굳으면 손도 멈춘다
  if(m.state==='wander'&&(m.voiceT-=dt)<0){ m.voiceT=8+Math.random()*12; if(dist<100) mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,0.6); }
  mimPose(m,dt);
  m.blob.visible=true; m.blob.position.set(m.pos.x,m.pos.y+0.05,m.pos.z);
}

/* ── 몸끼리 겹치지 않게 ─────────────────────────────────────────────────────── */
const MOB_R={garg:0.8, mim:2.0, bear:1.35};
function mobSeparate(dt){
  const L=[]; for(const g of MON.garg) if(g.active&&g.alive) L.push(g); for(const m of MON.mim) if(m.active&&m.alive) L.push(m);
  for(const b of MON.bear) if(b.active&&b.alive) L.push(b);
  for(let i=0;i<L.length;i++){ const a=L[i], ra=MOB_R[a.kind];
    for(let j=i+1;j<L.length;j++){ const b=L[j], dx=b.pos.x-a.pos.x, dz=b.pos.z-a.pos.z, d=Math.hypot(dx,dz), R=ra+MOB_R[b.kind];
      if(d<R&&d>1e-4&&Math.abs(a.pos.y-b.pos.y)<3.5){ const p=(R-d)*0.5; a.pos.x-=dx/d*p; a.pos.z-=dz/d*p; b.pos.x+=dx/d*p; b.pos.z+=dz/d*p; } }
    for(const c of MON.crawl){ if(!c.active||!c.alive) continue;               // 다지류 마디에서도 밀려난다
      for(let s=0;s<c.cr.SPINE.length;s+=2){ const S=c.cr.SPINE[s].p, dx=a.pos.x-S.x, dz=a.pos.z-S.z, d=Math.hypot(dx,dz), R=ra+CRWP.rad*crwK(); if(d<R&&d>1e-4){ a.pos.x=S.x+dx/d*R; a.pos.z=S.z+dz/d*R; } } }
    /* 사람 — 몸 안으로 못 들어온다(사람을 민다) */
    const dx=PL.pos.x-a.pos.x, dz=PL.pos.z-a.pos.z, d=Math.hypot(dx,dz), R=ra+PRAD;
    if(d<R&&d>1e-4&&Math.abs(PL.pos.y-a.pos.y)<3){
      if(a.kind==='garg'){ a.pos.x=PL.pos.x-dx/d*R; a.pos.z=PL.pos.z-dz/d*R; }   // 가벼운 가고일이 비켜난다 — 사람을 밀면 돌진하는 몸에 실려 10 m 넘게 끌려갔다
      else if(a.kind==='bear'){}                                               // 곰은 bearTick 이 몸통 반지름에서 멈춰 세운다(아레나 그대로)
      else { PL.pos.x=a.pos.x+dx/d*R; PL.pos.z=a.pos.z+dz/d*R; } }
  }
}
