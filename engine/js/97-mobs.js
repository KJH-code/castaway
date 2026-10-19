/* 97-mobs.js — CASTAWAY
   몬스터(사용자 요청) — 다지류 · 스킨워커 · 가고일을 본편 섬에 들인다. 몸(뼈 · 껍데기)은 97-mob-rigs.js(시험장에서 옮긴 것)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   몬스터
   ----------------------------------------------------------------------------
   · **다지류** — 우거진 숲(활엽수림 · 대숲) 곁의 굴이 둥지다(`MON.lairs` — 지형 판 8 · 섬을 지을 때 정한다 · 그 굴은 불빛 · 빛나는 것이
     없다 — 32-caves.js `c.dark`). 낮에는 굴 속에 똬리를 틀고 자고(건드리면 깬다), 밤에는 둥지 둘레 숲을 휘젓고 돌아다니며
     자꾸 돌진한다(돌진 사이 평균 6초). 사람이 50 m 안에 들면 쫓고, 새벽이면 둥지로 돌아간다. 몸 마디에 닿으면 다치고 튕겨 난다.
     그 숲(둥지 420 m 안의 우거진 숲)은 캐고 따는 몫이 더 나온다(`mobLairBonus` → 97-temples.js yieldK).
   · **스킨워커** — 숲(낮에는 어두운 숲 속에만)과 밤의 들판. **빛에 안 들어간다** — 모닥불 · 화덕 둘레, 횃불 · 전등을 든 사람 둘레,
     낮의 트인 땅. 빛 가장자리에서 멈춰 돌며 노려보다가, 빛이 꺼지면 다가와 늘어나는 앞다리로 후려친다. 빛 속에 갇히면 물러난다.
   · **가고일** — 풀밭과 탁상지에 무리로 산다. 낮게 떠 배회하다 30 m 안에 들면 쫓고, 멈춰 노려본 뒤 돌진한다 — 끝나면 3.5초 굳는다.
   · **몸끼리 겹치지 않는다**(`mobSeparate` — 몸 반지름으로 서로 밀어낸다 · 다지류 마디도 · 사람도 몸 안으로 못 들어간다).
   · **떨림** — 관절마다 가끔 홱 꺾인다(`mobJerk` — 계단처럼 뛰는 값을 빠르게 따라간다 · 맞으면 크게 떤다).
   · **맞으면** 뒤로 밀리고(넉백) 움찔하며 비명을 지른다 · 사람이 맞으면 튕겨 나고 화면이 흔들린다.
   · 소리는 합성이다(`mobVoice` — 다지류 딸깍임 · 쇳소리 비명 / 가고일 날카로운 울음 / 스킨워커 사람 소리를 비튼 울부짖음) · 거리와 방향으로 줄이고 가른다.
   · 수는 설정 '몬스터 수'(MON.k — 0 없음 ~ 2.4)를 따른다 · 사람 둘레에만 세우고 멀어지면 거둔다(저장하지 않는다).
   · 근접 · 총 · 폭발 · 화상은 본편 무기 판정(CREATURES — 70-weapons.js · 74-icons-guns.js)을 그대로 탄다 — 몸마다 맞는 공(대역)을 건다.
   ========================================================================== */
const MON={k:1, built:false, crawl:[], garg:[], mim:[], lairs:[], picks:[], spawnT:0, shake:0, roll:0, pk:new THREE.Vector3(),
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
  else if(kind==='hurt'){                                                    // 맞았다 — 짧게 찢어지는 소리
    const o=osc('sawtooth',900,300,0.18,0), f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1400; f.Q.value=2; o.connect(f); env(f,0.005,0.22,0,0.6); o.start(t); o.stop(t+0.25);
    noise(0.15,0,1800,1.5,0.5); }
  else if(kind==='thud'){ noise(0.12,0,220,0.8,0.9); noise(0.06,0,1500,1,0.4); }   // 몸에 박히는 소리(사람 쪽)
}

/* ── 떨림 — 계단처럼 뛰는 목표를 빠르게 따라간다(홱홱 꺾인다) ───────────────────── */
const _moJ=[0,0,0];
function mobJerk(st,dt,amp,calm){
  if(st.t===undefined){ st.t=Math.random()*0.4; st.x=st.y=st.z=st.tx=st.ty=st.tz=0; }
  st.t-=dt;
  if(st.t<=0){ st.t=0.05+Math.random()*(calm?2.2:0.5);
    if(Math.random()<0.38){ st.tx=st.ty=st.tz=0; }
    else{ const a=amp*(Math.random()<0.22?2.6:1); st.tx=(Math.random()-0.5)*a; st.ty=(Math.random()-0.5)*a*1.3; st.tz=(Math.random()-0.5)*a; } }
  const s=Math.min(1,dt*30); st.x+=(st.tx-st.x)*s; st.y+=(st.ty-st.y)*s; st.z+=(st.tz-st.z)*s;
  _moJ[0]=st.x; _moJ[1]=st.y; _moJ[2]=st.z; return _moJ;
}
/* 다지류 모듈의 갈고리(97-mob-rigs.js stepCrawler) */
function crwJerk(cr,i,dt){ const J=cr.jk||(cr.jk=[]); return mobJerk(J[i]||(J[i]={}),dt,0.11*(cr.jerkK||1),cr.mode==='sleep'); }
function crwLegJerk(cr,Lg,dt){ const st=Lg.jst||(Lg.jst={}); return mobJerk(st,dt,0.5*(cr.jerkK||1),cr.mode==='sleep')[0]; }

/* ── 맞는 공(대역) — 본편 무기 판정(CREATURES)에 건다. 체력은 몸의 것을 쓴다 ──────── */
function mobProxy(m,pos,r){
  const o={r, fish:false, _m:m, burn:null, fireproof:false};
  Object.defineProperty(o,'x',{get:()=>pos().x}); Object.defineProperty(o,'z',{get:()=>pos().z});
  Object.defineProperty(o,'y',{get:()=>pos().y-1.0});                       // rayCreature 가 y+1 을 가운데로 친다
  Object.defineProperty(o,'hp',{get:()=>m.alive?m.hp:0, set:v=>{ if(!m.alive) return; let d=m.hp-v;
    /* 한 프레임에 같은 몸의 공 여럿이 맞으면(폭발 · 산탄) 가장 큰 것 하나만 — 공마다 다 들면 다지류가 수류탄 하나에 녹는다 */
    if(m.dF===MON.frame){ const x=Math.max(0,d-m.dMax); m.dMax=Math.max(m.dMax,d); d=x; } else { m.dF=MON.frame; m.dMax=d; }
    mobDamage(m,d); }});
  Object.defineProperty(o,'stun',{get:()=>0, set:v=>{ if(v>0) m.frz=Math.max(m.frz||0,Math.min(v,6)); }});   // 해머 기절(무기 쪽 시계는 안 쓴다)
  Object.defineProperty(o,'alerted',{get:()=>!!m.alerted, set:v=>{ if(v) m.alerted=true; }});
  return o;
}
function mobRegister(m,on){
  for(const p of m.prox){ const i=CREATURES.indexOf(p); if(on&&i<0) CREATURES.push(p); else if(!on&&i>=0) CREATURES.splice(i,1); }
}
/* 맞았다 — 체력 · 넉백 · 움찔 · 비명. 쓰러지면 사체(뒤질 수 있다) */
function mobDamage(m,d){
  if(!m.alive||!(d>0)) return;
  m.hp-=d; m.alerted=true; m.hitT=0.4; m.jerkK=Math.min(4,(m.jerkK||1)+1.6);
  const dx=m.pos.x-PL.pos.x, dz=m.pos.z-PL.pos.z, L=Math.hypot(dx,dz)||1, kb=(m.kind==='garg'?8:m.kind==='mim'?3.6:0.9)*Math.min(1.6,0.4+d/45);
  m.kv.x+=dx/L*kb; m.kv.z+=dz/L*kb;
  MON.shake=Math.min(1,MON.shake+0.12); ATK.hitStop=0.06;
  mobVoice('hurt',m.pos.x,m.pos.y+1,m.pos.z,1.2);
  if(m.hp<=0) mobKill(m);
}
const MOB_LOOT={crawl:[['chitin',8],['spider_silk',2]], garg:[['chitin',6]], mim:[['spider_silk',6],['mimic_flesh',2]]};   // 가고일 · 스킨워커는 80-player.js 의 MOBS(떨구는 것 표 — 사전이 읽는다)와 같다
function mobKill(m){
  m.alive=false; m.hp=0; m.deadT=0; mobRegister(m,false);
  mobVoice(m.kind==='crawl'?'screech':m.kind==='garg'?'shriek':'wail',m.pos.x,m.pos.y+1,m.pos.z,1.6);
  toast(({crawl:'다지류를',garg:'가고일을',mim:'스킨워커를'})[m.kind]+' 쓰러뜨렸다 — 사체를 뒤지면 무엇인가 나온다');
  const p=m.kind==='crawl'?m.cr.head:m.pos, key='M'+(++MON.seq);
  const pick={kind:'mobloot', x:p.x, y:heightAt(p.x,p.z), z:p.z, ay:heightAt(p.x,p.z)+0.6, r:1.4, key, mob:m.kind,
    lootFn:()=>{ let msg=''; for(const [id,n] of MOB_LOOT[m.kind]){ if(!ITEMS[id]) continue; let g=0; for(let k=0;k<n;k++) if(invAdd(id,1)) g++; if(g) msg+=(msg?' · ':'')+ITEMS[id].n+' +'+g; }
      const i=MON.picks.indexOf(pick); if(i>=0) MON.picks.splice(i,1); return msg||'가방이 가득 찼다'; }};
  MON.picks.push(pick); m.pick=pick;
}
/* 사람이 맞았다 — 튕겨 나고 화면이 흔들린다(맞는 몸짓) */
function mobHurtPlayer(m,dmg,why,kb){
  hurtPL(dmg,why,true);
  const dx=PL.pos.x-m.pos.x, dz=PL.pos.z-m.pos.z, L=Math.hypot(dx,dz)||1;
  MON.pk.set(dx/L*kb,0,dz/L*kb);
  if(PL.grounded&&!PL.swim){ PL.vel.y=Math.max(PL.vel.y,2.2+kb*0.15); PL.grounded=false; }
  MON.shake=1; MON.roll=(Math.random()<0.5?-1:1)*0.16;
  mobVoice('thud',PL.pos.x,PL.pos.y+1,PL.pos.z,1);
}

/* ── 빛 — 스킨워커가 안 들어가는 데 ─────────────────────────────────────────── */
function mobPlayerLight(){ return (torchLight&&torchLight.intensity>0.05)||(typeof flash!=='undefined'&&flash&&flash.intensity>0.05); }
function mobLitAt(x,z){
  if(mobPlayerLight()&&Math.hypot(x-PL.pos.x,z-PL.pos.z)<12) return 2;
  if(typeof FIRES!=='undefined') for(const f of FIRES) if(f.lit&&Math.hypot(x-f.x,z-f.z)<14) return 2;
  if(!mobNight()&&hourOfDay>6.2&&hourOfDay<18.8&&!mobForestB(mobBiome(x,z))) return 1;   // 낮의 트인 땅
  return 0;
}

/* ── 몸 만들기(섬을 다 지은 뒤 한 번 — 모델은 섬이 바뀌어도 다시 안 읽는다) ─────────── */
function mobBlob(r){
  if(!MON.blob){ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'), gr=g.createRadialGradient(32,32,2,32,32,31);
    gr.addColorStop(0,'rgba(0,0,0,0.55)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64);
    MON.blob={geo:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2), mat:new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false})}; }
  const m=new THREE.Mesh(MON.blob.geo,MON.blob.mat); m.scale.set(r*2,1,r*2); m.userData.lightRole='none'; m.renderOrder=3; m.visible=false; scene.add(m); return m;
}
function mobsBuild(){
  for(const m of [...MON.crawl,...MON.garg,...MON.mim]){ mobRegister(m,false); m.active=false; m.alive=false; mobHide(m); }
  MON.picks.length=0;
  if((P.tv|0)<8) return;
  for(const l of MON.lairs){ l.cr=null; l.skip=typeof LANDING!=='undefined'&&Math.hypot(l.x-LANDING.x,l.z-LANDING.z)<450; }   // 상륙 자리 곁 굴은 비운다
  if(MON.built) return;
  try{
    /* 다지류 둘(돌려 쓴다) */
    for(let i=0;i<2;i++){ const cr=makeCrawler(scene,1100); cr.mesh.visible=false; cr.mesh.userData.lightRole='recv'; placeCrawler(cr,0,0,0);
      const m={kind:'crawl', cr, pos:cr.head, kv:new THREE.Vector3(), hp:1100, hpMax:1100, alive:false, active:false, frz:0, mode:'sleep', lair:null,
        wp:null, wpT:0, touchT:0, voiceT:0, clickT:0, prox:[]};
      for(let s=2;s<cr.SPINE.length;s+=4){ const S=cr.SPINE[s]; m.prox.push(mobProxy(m,()=>S.p,0.85)); }
      MON.crawl.push(m); }
    /* 가고일 여섯 */
    const {geometry,textureURL}=parseGLB_garg(mobB64(GARG_GLB));
    MON.gGeo=geometry; MON.gTex=new THREE.TextureLoader().load(textureURL); MON.gTex.flipY=false;
    for(let i=0;i<6;i++){ const mat=new THREE.MeshLambertMaterial({map:MON.gTex,side:THREE.DoubleSide});
      const g={kind:'garg', pos:new THREE.Vector3(), kv:new THREE.Vector3(), yaw:0, hp:120, hpMax:120, frz:0, alerted:false, state:'wander', t:0,
        target:new THREE.Vector3(), dir:new THREE.Vector3(0,0,1), dashLeft:0, speed:0, wing:0, wingPh:0, hitDone:false, alive:false, active:false,
        home:new THREE.Vector3(), mat, prox:[], js:{}, voiceT:0};
      g.body=gargBody(geometry,mat); g.mesh=g.body.mesh; g.mesh.visible=false; g.mesh.userData.lightRole='recv'; scene.add(g.mesh);
      g.blob=mobBlob(0.8); g.prox.push(mobProxy(g,()=>_moV.set(g.pos.x,g.pos.y+0.8,g.pos.z),0.9));
      MON.garg.push(g); }
    /* 스킨워커 셋 — 뼈는 마리마다, 지오메트리 · 그림은 나눠 쓴다 */
    const M=parseGLB_mob(mobB64(MIMIC_GLB));
    MON.mGeo=M.geometry; MON.mTex=new THREE.TextureLoader().load(M.textureURL); MON.mTex.flipY=false; MON.mSkin=M.skin;
    M.geometry.computeBoundingBox(); const bb=M.geometry.boundingBox; MON.mSc=4.2/(bb.max.y-bb.min.y);
    for(let i=0;i<3;i++) MON.mim.push(mimMake());
    MON.built=true;
  }catch(e){ console.error('[몬스터]',e); }
}
function mobHide(m){
  if(m.kind==='crawl'){ m.cr.mesh.visible=false; if(m.lair) m.lair.cr=null; m.lair=null; }
  else if(m.kind==='garg'){ m.mesh.visible=false; m.blob.visible=false; }
  else { m.rig.visible=false; m.blob.visible=false; }
}

/* ── 스킨워커의 몸 ─────────────────────────────────────────────────────────── */
const MIM_LIMBS=[
  {id:'la', side:-1, front:true , names:['Bone_027','Bone_026','Bone_025','Bone_024','Bone_023']},
  {id:'ra', side:+1, front:true , names:['Bone_022','Bone_021','Bone_020','Bone_019','Bone_018']},
  {id:'ll', side:-1, front:false, names:['Bone_009','Bone_008','Bone_007','Bone_006','Bone_005']},
  {id:'rl', side:+1, front:false, names:['Bone_014','Bone_013','Bone_012','Bone_011','Bone_010']}];
const MIM_BODY=['Bone_001','Bone_004','Bone_003','Bone_002','Bone_017','Bone_016','Bone_015'];
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
  const limbs=MIM_LIMBS.map(L=>{ const chain=L.names.map(n=>map[n]).filter(Boolean); let nat=0; for(let i=1;i<chain.length;i++) nat+=chain[i].position.length();
    return Object.assign({},L,{chain, tip:chain[chain.length-1], nat, js:{}}); });
  const m={kind:'mim', rig, mesh, mat, bone:map, root, rest, rpos, limbs, body:MIM_BODY.map(n=>map[n]).filter(Boolean), bjs:MIM_BODY.map(()=>({})),
    pos:new THREE.Vector3(), kv:new THREE.Vector3(), yaw:0, hp:520, hpMax:520, frz:0, alerted:false, alive:false, active:false, state:'wander', t:0,
    target:new THREE.Vector3(), home:new THREE.Vector3(), speed:0, walkPh:0, atkCd:2, arm:0, armT:new THREE.Vector3(), hitDone:false, voiceT:3, deadT:0, prox:[]};
  m.blob=mobBlob(2.0);
  m.prox.push(mobProxy(m,()=>_moV.set(m.pos.x,m.pos.y+1.9,m.pos.z),1.9));
  m.prox.push(mobProxy(m,()=>m.limbs[0].tip?m.limbs[0].tip.getWorldPosition(_moV2):m.pos,0.7));
  m.prox.push(mobProxy(m,()=>m.limbs[1].tip?m.limbs[1].tip.getWorldPosition(_moV2):m.pos,0.7));
  return m;
}
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
function mimPose(m,dt){
  const R=m.rig;
  R.position.set(m.pos.x,m.pos.y,m.pos.z); R.rotation.set(0,m.yaw,0);
  if(!m.alive){ const k=Math.min(1,m.deadT/1.2); R.rotation.z=k*1.35*(m.arm?1:-1); R.position.y=m.pos.y-k*0.6-Math.max(0,m.deadT-60)*0.05; }
  m.root.traverse(o=>{ if(!o.isBone) return; const q=m.rest.get(o); if(q) o.quaternion.copy(q); const v=m.rpos.get(o); if(v) o.position.copy(v); });
  R.updateMatrixWorld(true);
  const gait=clamp(m.speed/3.8,0,1), amp=0.35+0.65*gait;
  _mSide.set(Math.cos(m.yaw),0,-Math.sin(m.yaw));
  const jk=(m.jerkK||1)*(m.alive?1:0.3);
  /* 몸통 · 목 — 홱홱 꺾인다(사람 흉내를 내는 것이라 관절이 어긋나게 움직인다) · 맞으면 뒤로 젖힌다 */
  m.body.forEach((b,i)=>{ const J=mobJerk(m.bjs[i],dt,0.16*jk,!m.alive); _moE.set(J[0]-(m.hitT>0?m.hitT*0.9:0)*(i<3?1:0.4),J[1],J[2]); _moQ.setFromEuler(_moE); b.quaternion.multiply(_moQ); });
  R.updateMatrixWorld(true);
  for(const L of m.limbs){ if(!L.tip) continue;
    const atk=L.front&&m.alive&&(m.state==='wind'||m.state==='strike')&&((L.side<0)===(m.arm===0));
    if(L.front){ const need=atk&&m.state==='strike'?L.chain[0].getWorldPosition(_moV).distanceTo(m.armT):0, nat=L.nat*MON.mSc;
      const k=atk&&m.state==='strike'?clamp(need/Math.max(nat,1e-4),1,5):1;
      for(let i=1;i<L.chain.length;i++) L.chain[i].position.copy(m.rpos.get(L.chain[i])).multiplyScalar(k);
      if(k!==1) R.updateMatrixWorld(true); }
    if(atk){
      if(m.state==='wind'){ mobRotBone(L.chain[0],_mSide,-1.1*clamp(m.t/0.6,0,1)); mobRotBone(L.chain[1],_mSide,-0.6); }
      else mobCcd(L.chain,m.armT,3,0.9);
    }else{
      const ph=m.walkPh+(L.front?0:Math.PI)+(L.side<0?0:Math.PI), sw=Math.sin(ph);
      mobRotBone(L.chain[0],_mSide,sw*0.30*amp); mobRotBone(L.chain[1],_mSide,-sw*0.09*amp+Math.max(0,sw)*0.16*amp);
    }
    const J=mobJerk(L.js,dt,0.22*jk,!m.alive); mobRotBone(L.chain[1],_mSide,J[0]); mobRotBone(L.chain[2],_mUp,J[1]);   // 다리마다 경련
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
  mobSeparate(dt);
  /* 사람이 맞아 밀려난다 — 막히는 데로는 안 밀린다 */
  if(MON.pk.lengthSq()>0.01){ const p=PL.pos, nx=p.x+MON.pk.x*dt, nz=p.z+MON.pk.z*dt;
    if(!solidAt(nx,nz,p.y+0.9)){ p.x=nx; p.z=nz; } MON.pk.multiplyScalar(Math.exp(-6*dt)); } else MON.pk.set(0,0,0);
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
  for(const list of [MON.garg,MON.mim]) for(const m of list){ if(!m.active) continue;
    const d=Math.hypot(m.pos.x-px,m.pos.z-pz);
    if(d>340||(!m.alive&&m.deadT>90)||k<=0){ mobRegister(m,false); m.active=false; mobHide(m); if(m.pick){ const i=MON.picks.indexOf(m.pick); if(i>=0) MON.picks.splice(i,1); m.pick=null; } } }
  if(k<=0||under||PL.swim) return;
  const fwdX=-Math.sin(PL.yaw), fwdZ=-Math.cos(PL.yaw);
  const spot=(ok,rmin,rmax)=>{ for(let t=0;t<14;t++){ const a=Math.random()*6.283, r=rmin+Math.random()*(rmax-rmin), x=px+Math.cos(a)*r, z=pz+Math.sin(a)*r;
      if(Math.cos(a)*fwdX+Math.sin(a)*fwdZ>0.45) continue;                   // 눈앞에 불쑥 서지 않게
      if(heightAt(x,z)<0.5||ok(x,z)) return [x,z]; } return null; };
  /* 가고일 — 풀밭 · 탁상지 */
  const gAlive=MON.garg.filter(g=>g.active).length, gWant=Math.min(6,Math.round(4*k));
  if(gAlive<gWant&&Math.random()<0.35){
    const mesa=(x,z)=>(typeof LANDFORMS!=='undefined')&&LANDFORMS.some(L=>L.k==='mesa'&&Math.hypot(x-(L.x-N/2)*CELL,z-(L.z-N/2)*CELL)<L.R*CELL*1.2);
    const s=spot((x,z)=>heightAt(x,z)>0.5&&(mobBiome(x,z)===B.MEADOW||mesa(x,z)),70,170);
    if(s){ const n=Math.min(gWant-gAlive,2+((Math.random()*2)|0)); for(let i=0;i<n;i++){ const g=MON.garg.find(q=>!q.active); if(!g) break; gargSpawn(g,s[0]+(Math.random()-0.5)*14,s[1]+(Math.random()-0.5)*14); } } }
  /* 스킨워커 — 숲(낮엔 숲 속만) · 밤의 들판 · 빛이 없는 데 */
  const mAlive=MON.mim.filter(m=>m.active).length, mWant=Math.min(3,Math.round(2*k));
  if(mAlive<mWant&&Math.random()<0.25){
    const s=spot((x,z)=>{ const b=mobBiome(x,z); return heightAt(x,z)>0.5&&(mobForestB(b)||(night&&(b===B.MEADOW||b===B.SCRUB)))&&!mobLitAt(x,z); },70,140);
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
  m.lair=l; l.cr=m; m.cr.mesh.position.y=0; m.active=true; m.alive=true; m.hp=m.hpMax; m.cr.alive=true; m.cr.hp=m.hpMax; m.alerted=false; m.deadT=0; m.frz=0; m.kv.set(0,0,0); m.jerkK=1;
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
const _crwT={x:0,y:0,z:0};
function crawlTick(m,dt){
  const cr=m.cr, night=mobNight();
  if(!m.alive){ m.deadT+=dt; cr.alive=false; stepCrawler(cr,dt,null,{hold:true,stride:1,lim:HALF}); cr.mesh.position.y=-Math.max(0,m.deadT-40)*0.04; return; }
  m.jerkK=Math.max(1,(m.jerkK||1)-dt*2); if(m.hitT>0) m.hitT-=dt;
  const dP=Math.hypot(PL.pos.x-cr.head.x,PL.pos.z-cr.head.z);
  let tg=null, spd=1.0, dashE=6;
  if(m.mode==='sleep'){
    if(night||m.alerted){ m.mode=m.alerted?'hunt':'roam'; m.wp=crawlWaypoint(m); mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,1.3); }
  }else if(m.mode==='roam'){
    if(!night&&!m.alerted) m.mode='return';
    else{ if(!m.wp||Math.hypot(m.wp.x-cr.head.x,m.wp.z-cr.head.z)<14||(m.wpT-=dt)<0){ m.wp=crawlWaypoint(m); m.wpT=25; } tg=m.wp;
      if(dP<50&&!PL.under&&!PL.dead){ m.mode='hunt'; mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,1.5); } }
  }else if(m.mode==='hunt'){
    tg=_crwT; _crwT.x=PL.pos.x; _crwT.y=PL.pos.y; _crwT.z=PL.pos.z; spd=1.12; dashE=8;
    if(dP>120||PL.dead||PL.under){ m.mode=night?'roam':'return'; m.alerted=false; }
    else if(!night&&!m.alerted) m.mode='return';
  }else if(m.mode==='return'){
    tg=_crwT; _crwT.x=m.lair.x; _crwT.y=m.lair.y; _crwT.z=m.lair.z; dashE=1e9;
    if(Math.hypot(m.lair.x-cr.head.x,m.lair.z-cr.head.z)<4){ crawlCoil(m); m.mode='sleep'; }
    if(dP<25&&!PL.dead) m.mode='hunt';
  }
  if(m.frz>0){ m.frz=Math.max(0,m.frz-dt); cr.frz=Math.max(cr.frz,m.frz); }
  stepCrawler(cr,dt,tg,{spd, turn:70, stride:0.95, dashEvery:dashE, dashLen:28, dashTurn:22, lim:HALF-40, hold:m.mode==='sleep'});
  /* 맞아 밀린 몫 — 머리만 조금(몸이 길다) */
  if(m.kv.lengthSq()>0.01){ cr.head.x+=m.kv.x*dt; cr.head.z+=m.kv.z*dt; m.kv.multiplyScalar(Math.exp(-5*dt)); }
  /* 소리 — 다리 딸깍임(움직이는 동안) · 가끔 쇳소리 */
  if(cr.speed>0.5&&(m.clickT-=dt)<0){ m.clickT=0.18+Math.random()*0.25; if(dP<70) mobVoice('click',cr.head.x,cr.head.y,cr.head.z,cr.state==='dash'?1.5:0.8); }
  if(m.mode!=='sleep'&&(m.voiceT-=dt)<0){ m.voiceT=6+Math.random()*10; if(dP<110) mobVoice('screech',cr.head.x,cr.head.y+1,cr.head.z,0.9); }
  /* 닿기 — 마디(반지름 0.85 m)에 들면 밀려나고 0.5초마다 다친다(갑옷이 깎는다) */
  if(m.mode!=='sleep'&&!PL.dead){ let hit=null;
    for(let i=0;i<cr.SPINE.length;i+=2){ const S=cr.SPINE[i], dx=PL.pos.x-S.p.x, dz=PL.pos.z-S.p.z, d=Math.hypot(dx,dz), R=0.85+PRAD;
      if(d<R&&Math.abs(PL.pos.y+0.8-S.p.y)<1.8){ hit=S; if(d>1e-3){ PL.pos.x=S.p.x+dx/d*R; PL.pos.z=S.p.z+dz/d*R; } } }
    if(hit){ m.touchT-=dt; if(m.touchT<=0){ m.touchT=0.5; const pseudo={pos:hit.p}; mobHurtPlayer(pseudo,cr.state==='dash'?34:20,'다지류에 받혔다',cr.state==='dash'?13:7); } }
    else m.touchT=Math.min(m.touchT,0); }
}

/* ── 가고일 ──────────────────────────────────────────────────────────────── */
const GP2={wander:1.6, chase:1.1, see:30, trig:10, prep:1.0, dash:20, dspd:1.8, stun:3.5, hover:0.3, dmg:28};
function gargSpawn(g,x,z){
  g.active=true; g.alive=true; g.hp=g.hpMax; g.frz=0; g.alerted=false; g.state='wander'; g.t=0; g.an=null; g.kv.set(0,0,0); g.jerkK=1;
  g.pos.set(x,heightAt(x,z)+GP2.hover,z); g.home.set(x,0,z); g.yaw=Math.random()*6.283; gargWander(g);
  mobRegister(g,true);
}
function gargWander(g){ for(let t=0;t<8;t++){ const a=Math.random()*6.283, r=8+Math.random()*55, x=g.home.x+Math.cos(a)*r, z=g.home.z+Math.sin(a)*r; if(heightAt(x,z)>0.5){ g.target.set(x,0,z); return; } } g.target.copy(g.home); }
function gargSet(g,s){ g.state=s; g.t=0; g.hitDone=false; }
function gargTick(g,dt){
  const gy=Math.max(heightAt(g.pos.x,g.pos.z),-0.3);
  if(!g.alive){ g.deadT=(g.deadT||0)+dt; gargDraw(g,dt,null,gy); g.blob.visible=false; return; }
  if(g.hitT>0) g.hitT-=dt; g.jerkK=Math.max(1,(g.jerkK||1)-dt*2);
  const dx=PL.pos.x-g.pos.x, dz=PL.pos.z-g.pos.z, dist=Math.hypot(dx,dz);
  let mx=0, mz=0, spd=0;
  if(g.frz>0){ g.frz=Math.max(0,g.frz-dt); if(g.frz<=0&&g.state==='stun') gargSet(g,dist<GP2.see?'chase':'wander'); if(g.state!=='stun') g.state='stun'; }
  else{
    g.t+=dt;
    if(g.state==='wander'){ if((dist<GP2.see&&!PL.under)||g.alerted){ gargSet(g,'chase'); mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,1.2); }
      else{ const tx=g.target.x-g.pos.x, tz=g.target.z-g.pos.z, l=Math.hypot(tx,tz); if(l<2.5) gargWander(g); else{ mx=tx/l; mz=tz/l; spd=GP2.wander; } } }
    else if(g.state==='chase'){ if((dist>GP2.see*1.4&&!g.alerted)||PL.dead){ gargSet(g,'wander'); gargWander(g); g.alerted=false; }
      else if(dist<GP2.trig){ gargSet(g,'prep'); mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,1.4); } else{ mx=dx/dist; mz=dz/dist; spd=RUN*GP2.chase; } }
    else if(g.state==='prep'){ if(g.t>=GP2.prep){ g.dir.set(dx/dist,0,dz/dist); g.dashLeft=GP2.dash; gargSet(g,'dash'); } }
    else if(g.state==='dash'){ const s=Math.min(RUN*GP2.chase*GP2.dspd*dt,g.dashLeft); mx=g.dir.x; mz=g.dir.z; spd=s/Math.max(dt,1e-6); g.dashLeft-=s;
      if(!g.hitDone&&dist<2.6&&Math.abs(PL.pos.y+0.9-g.pos.y)<2.2){ g.hitDone=true; mobHurtPlayer(g,GP2.dmg,'가고일의 발톱',10); }
      if(g.dashLeft<=0.001){ gargSet(g,'stun'); g.frz+=GP2.stun; } }
    else if(g.state==='stun') gargSet(g,dist<GP2.see?'chase':'wander');
  }
  if(spd>0){ const nx=g.pos.x+mx*spd*dt, nz=g.pos.z+mz*spd*dt;
    if(heightAt(nx,nz)>-0.5&&!solidAt(nx,nz,heightAt(nx,nz)+1.2)){ g.pos.x=nx; g.pos.z=nz; } else if(g.state==='dash'){ g.dashLeft=0; gargSet(g,'stun'); g.frz+=GP2.stun; } else gargWander(g);
    let d=Math.atan2(mx,mz)-g.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; g.yaw+=d*clamp((g.state==='dash'?18:6)*dt,0,1); }
  else if(g.state==='prep'||g.state==='stun'){ let d=Math.atan2(dx,dz)-g.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; g.yaw+=d*clamp((g.state==='prep'?7:1.5)*dt,0,1); }
  g.speed=spd;
  if(g.kv.lengthSq()>0.01){ g.pos.x+=g.kv.x*dt; g.pos.z+=g.kv.z*dt; g.kv.multiplyScalar(Math.exp(-5*dt)); }
  const gy2=Math.max(heightAt(g.pos.x,g.pos.z),-0.3);
  g.pos.y=gy2+GP2.hover+(g.state==='stun'?0:Math.sin(performance.now()*0.004+g.home.x)*0.05);
  if((g.voiceT-=dt)<0){ g.voiceT=5+Math.random()*9; if(dist<90) mobVoice('shriek',g.pos.x,g.pos.y+1,g.pos.z,0.7); }
  _moV.set(PL.pos.x,PL.pos.y+EYE,PL.pos.z);
  gargDraw(g,dt,dist<40?_moV:null,gy2);
  /* 떨림 — 고개 · 목 · 손 · 날개가 홱 꺾인다 */
  const by=g.body.by, jk=g.jerkK||1;
  for(const [nm,a] of [['head',0.22],['neck',0.14],['handL',0.35],['handR',0.35],['foreL',0.18],['foreR',0.18],['wingL',0.10],['wingR',0.10]]){ const b=by[nm]; if(!b) continue;
    const J=mobJerk(g.js[nm]||(g.js[nm]={}),dt,a*jk,g.state==='stun'); _moE.set(J[0],J[1],J[2]); _moQ.setFromEuler(_moE); b.quaternion.multiply(_moQ); }
  g.blob.visible=true; g.blob.position.set(g.pos.x,gy2+0.05,g.pos.z);
}

/* ── 스킨워커 ─────────────────────────────────────────────────────────────── */
function mimSpawn(m,x,z){
  m.active=true; m.alive=true; m.hp=m.hpMax; m.frz=0; m.alerted=false; m.state='wander'; m.t=0; m.kv.set(0,0,0); m.deadT=0; m.atkCd=2; m.jerkK=1;
  m.pos.set(x,heightAt(x,z),z); m.home.set(x,0,z); m.yaw=Math.random()*6.283; mimWander(m); m.rig.visible=true;
  mobRegister(m,true);
}
function mimWander(m){ for(let t=0;t<10;t++){ const a=Math.random()*6.283, r=10+Math.random()*60, x=m.home.x+Math.cos(a)*r, z=m.home.z+Math.sin(a)*r;
  if(heightAt(x,z)>0.5&&!mobLitAt(x,z)){ m.target.set(x,0,z); return; } } m.target.copy(m.home); }
function mimSet(m,s){ m.state=s; m.t=0; m.hitDone=false; }
function mimTick(m,dt){
  if(!m.alive){ m.deadT+=dt; m.blob.visible=false; mimPose(m,dt); return; }
  if(m.hitT>0) m.hitT-=dt; m.jerkK=Math.max(1,(m.jerkK||1)-dt*1.5); m.atkCd-=dt;
  const dx=PL.pos.x-m.pos.x, dz=PL.pos.z-m.pos.z, dist=Math.hypot(dx,dz)||1;
  const plLit=!!mobLitAt(PL.pos.x,PL.pos.z), meLit=mobLitAt(m.pos.x,m.pos.z);
  let mx=0, mz=0, spd=0, face=null;
  if(m.frz>0){ m.frz=Math.max(0,m.frz-dt); m.speed=0; m.state='stun'; }
  else{
    m.t+=dt;
    if(m.state==='stun') mimSet(m,'stalk');
    if(meLit===2&&m.state!=='shun'){ mimSet(m,'shun'); mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,1.2); }   // 불빛에 닿았다 — 물러난다
    if(m.state==='shun'){                                                     // 빛에서 벗어날 때까지 빛의 반대쪽으로
      let sx=-dx/dist, sz=-dz/dist;
      if(typeof FIRES!=='undefined') for(const f of FIRES) if(f.lit){ const fx=m.pos.x-f.x, fz=m.pos.z-f.z, fl=Math.hypot(fx,fz); if(fl<16){ sx=fx/fl; sz=fz/fl; } }
      mx=sx; mz=sz; spd=4.2; face=Math.atan2(dx,dz);
      if(!meLit&&m.t>1.2) mimSet(m,'stalk'); }
    else if(m.state==='wander'){
      if((dist<45&&!PL.under&&!PL.dead)||m.alerted){ mimSet(m,'stalk'); mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,1); }
      else{ const tx=m.target.x-m.pos.x, tz=m.target.z-m.pos.z, l=Math.hypot(tx,tz); if(l<3||(m.t>30)){ mimWander(m); m.t=0; } else{ mx=tx/l; mz=tz/l; spd=1.5; } } }
    else if(m.state==='stalk'){
      face=Math.atan2(dx,dz);
      if((dist>70&&!m.alerted)||PL.dead||PL.under){ mimSet(m,'wander'); mimWander(m); m.alerted=false; }
      else if(plLit){                                                         // 빛 속의 사람 — 가장자리에서 맴돌며 노려본다
        const want=13.5; mx=-dz/dist; mz=dx/dist; spd=1.6; if(dist<want){ mx-=dx/dist*1.5; mz-=dz/dist*1.5; spd=2.6; }
        if((m.voiceT-=dt)<0){ m.voiceT=4+Math.random()*5; mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,0.9); } }
      else if(dist>5.5){ mx=dx/dist; mz=dz/dist; spd=3.8; }
      if(!plLit&&dist<8.5&&m.atkCd<=0){ m.arm=Math.random()<0.5?0:1; mimSet(m,'wind'); mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,1.4); } }
    else if(m.state==='wind'){ face=Math.atan2(dx,dz); if(m.t>=0.62){ m.armT.set(PL.pos.x,PL.pos.y+1.1,PL.pos.z); mimSet(m,'strike'); } }
    else if(m.state==='strike'){ face=Math.atan2(dx,dz);
      m.armT.lerp(_moV.set(PL.pos.x,PL.pos.y+1.1,PL.pos.z),Math.min(1,dt*4));          // 휘두르는 동안 조금 따라온다
      const L=m.limbs[m.arm]; if(!m.hitDone&&L.tip&&m.t>0.12){ L.tip.getWorldPosition(_moV2); if(_moV2.distanceTo(_moV.set(PL.pos.x,PL.pos.y+1.0,PL.pos.z))<1.7){ m.hitDone=true; mobHurtPlayer(m,30,'스킨워커의 앞다리',11); } }
      if(m.t>=0.38){ mimSet(m,'recover'); m.atkCd=2.0+Math.random()*1.2; } }
    else if(m.state==='recover'){ face=Math.atan2(dx,dz); if(m.t>=0.55) mimSet(m,'stalk'); }
  }
  if(spd>0){ const len=Math.hypot(mx,mz)||1; mx/=len; mz/=len;
    const nx=m.pos.x+mx*spd*dt, nz=m.pos.z+mz*spd*dt;
    const lit=mobLitAt(nx,nz);
    if(heightAt(nx,nz)>0.3&&(m.state==='shun'||lit<1||(lit===1&&meLit))&&!solidAt(nx,nz,heightAt(nx,nz)+1.5)){ m.pos.x=nx; m.pos.z=nz; m.walkPh+=dt*spd*0.9; }   // 빛으로는 안 들어간다
    else if(m.state==='wander') mimWander(m);
    if(face===null) face=Math.atan2(mx,mz); }
  m.speed=spd;
  if(face!==null){ let d=face-m.yaw; while(d>Math.PI)d-=6.283; while(d<-Math.PI)d+=6.283; m.yaw+=d*clamp(2.6*dt,0,1); }
  if(m.kv.lengthSq()>0.01){ m.pos.x+=m.kv.x*dt; m.pos.z+=m.kv.z*dt; m.kv.multiplyScalar(Math.exp(-4*dt)); }
  m.pos.y=heightAt(m.pos.x,m.pos.z);
  if(m.state!=='stalk'&&m.state!=='shun'&&(m.voiceT-=dt)<0){ m.voiceT=8+Math.random()*12; if(dist<100) mobVoice('wail',m.pos.x,m.pos.y+3,m.pos.z,0.6); }
  mimPose(m,dt);
  m.blob.visible=true; m.blob.position.set(m.pos.x,m.pos.y+0.05,m.pos.z);
}

/* ── 몸끼리 겹치지 않게 ─────────────────────────────────────────────────────── */
const MOB_R={garg:0.8, mim:2.0};
function mobSeparate(dt){
  const L=[]; for(const g of MON.garg) if(g.active&&g.alive) L.push(g); for(const m of MON.mim) if(m.active&&m.alive) L.push(m);
  for(let i=0;i<L.length;i++){ const a=L[i], ra=MOB_R[a.kind];
    for(let j=i+1;j<L.length;j++){ const b=L[j], dx=b.pos.x-a.pos.x, dz=b.pos.z-a.pos.z, d=Math.hypot(dx,dz), R=ra+MOB_R[b.kind];
      if(d<R&&d>1e-4&&Math.abs(a.pos.y-b.pos.y)<3.5){ const p=(R-d)*0.5; a.pos.x-=dx/d*p; a.pos.z-=dz/d*p; b.pos.x+=dx/d*p; b.pos.z+=dz/d*p; } }
    for(const c of MON.crawl){ if(!c.active||!c.alive) continue;               // 다지류 마디에서도 밀려난다
      for(let s=0;s<c.cr.SPINE.length;s+=2){ const S=c.cr.SPINE[s].p, dx=a.pos.x-S.x, dz=a.pos.z-S.z, d=Math.hypot(dx,dz), R=ra+0.85; if(d<R&&d>1e-4){ a.pos.x=S.x+dx/d*R; a.pos.z=S.z+dz/d*R; } } }
    /* 사람 — 몸 안으로 못 들어온다(사람을 민다) */
    const dx=PL.pos.x-a.pos.x, dz=PL.pos.z-a.pos.z, d=Math.hypot(dx,dz), R=ra+PRAD;
    if(d<R&&d>1e-4&&Math.abs(PL.pos.y-a.pos.y)<3){
      if(a.kind==='garg'){ a.pos.x=PL.pos.x-dx/d*R; a.pos.z=PL.pos.z-dz/d*R; }   // 가벼운 가고일이 비켜난다 — 사람을 밀면 돌진하는 몸에 실려 10 m 넘게 끌려갔다
      else { PL.pos.x=a.pos.x+dx/d*R; PL.pos.z=a.pos.z+dz/d*R; } }
  }
}
