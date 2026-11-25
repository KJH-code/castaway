/* ==========================================================================
   AI 플레이어 — 멀티플레이를 넣기 전에 '같은 섬의 다른 사람들'을 흉내 낸다(사용자 요청 2026-11-25 —
   '캐릭터를 넣은 뒤 AI 캐릭터가 게임을 하게 하고 들판에 둘 것 · 나중에 들어올 플레이어들처럼')
   · 몸은 사람과 같은 모형 · 같은 몸짓(98-player-body.js 의 pbMakeBody · pbStep) — 상태(pbState)만 제 머리가 채운다
   · 하는 일: 걷기 · 달리기(가끔 구르기) · 숲 나무 베기(군락 줄기 FLORA.*.cols 앞에서 도끼) · 바위 캐기(곡괭이) · 줍기(무릎 꿇기) ·
     둘러보기 · 먹기 · 깡충 뛰기 · 혼자 주먹 연습 · 총 들고 둘러보기 · 밤엔 횃불 · 사람이 가까이 오면 돌아보고 손 흔들기
   · **보이기만 한다** — 섬을 바꾸지 않는다(나무가 안 넘어지고 바위가 안 깎인다 · 저장에 안 든다 · 몬스터와 싸우지 않는다).
     멀티플레이가 들어오면 이 머리 자리를 네트워크에서 온 상태로 바꾸면 된다(`b.S` 를 채우는 쪽만 바뀐다)
   · 사람 둘레에 둔다 — 처음엔 20~90 m 안 뭍에 흩어 놓고, 420 m 넘게 멀어지면 사람 뒤쪽 70~140 m 로 옮긴다.
     260 m 밖은 몸짓을 쉬고 숨긴다 · 60 m 밖은 테두리 · 45 m 밖은 이름표를 끈다 · 그림자는 받기만(드리우지 않는다)
   · 수 `?bots=N`(0~16 · 기본 6) · 끄기 `?bots=0`
   ========================================================================== */
const BOTS={n:6, list:[], group:null, built:false, far:420, live:260,
  names:['driftwood','Mango_Kim','coconutJ','raftmaker','Nari','island_dad','tidepool','sora_99','flintboy','Haneul','castaway42','bamboo_jo','yuna.k','seashell','RJ_wanders','minjun'],
  rockK:{granite:1,basalt:1,karst:1,sandstone:1,copper:1,iron:1,coal:1,zinc:1,galena:1,flint:1,malachite:1,cassiterite:1,sphalerite:1,cinnabar:1}};
try{ const q=new URLSearchParams(location.search).get('bots'); if(q!==null&&q!=='') BOTS.n=Math.max(0,Math.min(16,(+q)|0)); }catch(e){}

const _btV=new THREE.Vector3();
const botGround=(x,z)=>typeof mobGround==='function'?mobGround(x,z):heightAt(x,z);
const botLand=(x,z)=>heightAt(x,z)>0.6;                              // 물(바다 · 강)에는 안 들어간다
const botRnd=(a,b)=>a+Math.random()*(b-a);
/* 뭍에서 (cx,cz) 둘레 r0~r1 m 의 한 점 — 여러 번 던져 보고 못 찾으면 null */
function botSpot(cx,cz,r0,r1,away){
  for(let i=0;i<24;i++){
    let a=Math.random()*Math.PI*2;
    if(away!==undefined) a=away+botRnd(-1.1,1.1);                       // 그쪽으로(사람 뒤 · 보지 않는 쪽)
    const r=botRnd(r0,r1), x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r;
    if(Math.abs(x)>HALF-40||Math.abs(z)>HALF-40||!botLand(x,z)) continue;
    const g=botGround(x,z), gx=botGround(x+1.5,z)-g, gz=botGround(x,z+1.5)-g;
    if(Math.hypot(gx,gz)>0.9) continue;                                // 가파른 데는 버린다
    return {x,z};
  }
  return null;
}
function botMake(i){
  const B=pbMakeBody('bot'+i); B.rig.userData.lightRole='recv';
  const name=BOTS.names[i%BOTS.names.length];
  const tag=makeTagSprite(name); tag.scale.set(0.34*tag.userData.aspect,0.34,1); tag.position.y=2.12; B.rig.add(tag);
  const b={i, name, B, S:pbState(), tag, x:0, y:0, z:0, vy:0, yaw:Math.random()*6.28, task:'idle', t:0, dur:2, tx:0, tz:0,
    speed:0, look:0, lookT:0, stuck:0, lx:0, lz:0, waveT:0, waveCd:botRnd(0,20), hop:0, punchT:0, eatT:0, near:false};
  BOTS.group.add(B.rig);
  return b;
}
function botPlace(b,x,z){
  b.x=x; b.z=z; b.y=botGround(x,z); b.vy=0; b.lx=x; b.lz=z; b.stuck=0;
  b.S.vel.set(0,0,0); b.S.grounded=true; botTask(b);
}

/* ── 할 일 고르기 ── */
function botTask(b){
  const S=b.S; S.crouch=false; S.gather=false; S.harv=false; S.eat=-1; S.swing=-1; S.held=null; S.rest=false; S.wave=false; S.pitch=0;
  b.t=0; b.speed=0;
  const night=typeof _sd3!=='undefined'&&_sd3.y<-0.04;
  const r=Math.random();
  if(r<0.38){                                                          // 걷기 · 달리기 — 뭍의 한 점으로
    const p=botSpot(b.x,b.z,15,70); if(!p){ b.task='idle'; b.dur=botRnd(2,4); return; }
    b.task='walk'; b.tx=p.x; b.tz=p.z; b.speed=Math.random()<0.3?RUN:WALK; b.dur=60;
    if(night) S.held='torch', S.rest=true;
  }else if(r<0.55){                                                    // 나무 베기 — 가까운 숲 줄기로 걸어가서
    const c=botNearTree(b,35);
    if(c){ b.task='toTree'; b.tree=c; b.tx=c.x; b.tz=c.z; b.speed=WALK; b.dur=40; S.held='axe_stone'; }
    else { b.task='chop'; b.dur=botRnd(5,10); S.held='axe_stone'; S.harv=true; }
  }else if(r<0.66){                                                    // 바위 캐기 — 가까운 바위로
    const p=botNearRock(b,40);
    if(p){ b.task='toRock'; b.rock=p; b.tx=p.x; b.tz=p.z; b.speed=WALK; b.dur=40; S.held='pick_stone'; }
    else { b.task='gather'; b.dur=botRnd(3,6); S.gather=true; }
  }else if(r<0.76){ b.task='gather'; b.dur=botRnd(3,6); S.gather=true; }  // 줍기 — 무릎 꿇고 손을 놀린다
  else if(r<0.83){ b.task='eat'; b.dur=botRnd(1.5,3); }                // 먹기
  else if(r<0.88){ b.task='hop'; b.dur=botRnd(2,4); }                  // 깡충깡충
  else if(r<0.92){ b.task='spar'; b.dur=botRnd(2.5,4.5); }             // 혼자 주먹 연습
  else if(r<0.96){ b.task='aim'; b.dur=botRnd(4,8); S.held=Math.random()<0.5?'rifle_bolt':'shotgun'; }   // 총 들고 둘러보기
  else { b.task='idle'; b.dur=botRnd(2,5); S.crouch=Math.random()<0.3; if(night) S.held='torch', S.rest=true; }
}
function botNearTree(b,R){
  if(typeof FLORA==='undefined') return null;
  let best=null, bd=R*R;
  for(const L of [FLORA.near,FLORA.far]) for(const c of L.cols){
    const dx=c.x-b.x, dz=c.z-b.z, d=dx*dx+dz*dz; if(d<bd&&d>4&&c.r>0.08&&botLand(c.x,c.z)){ bd=d; best=c; }
  }
  return best;
}
function botNearRock(b,R){
  if(typeof PROPS==='undefined') return null;
  let best=null, bd=R*R;
  for(const p of PROPS){
    if(!BOTS.rockK[p.k]||p.dead||p.mined||p.ug) continue;
    const dx=p.x-b.x, dz=p.z-b.z; if(Math.abs(dx)>R||Math.abs(dz)>R) continue;
    const d=dx*dx+dz*dz; if(d<bd&&botLand(p.x,p.z)){ bd=d; best=p; }
  }
  return best;
}

/* ── 한 프레임 ── */
function botTick(b,dt){
  const S=b.S; b.t+=dt;
  /* 사람이 가까이 오면 돌아보고 손 흔들기(1분에 한 번쯤) */
  const pdx=PL.pos.x-b.x, pdz=PL.pos.z-b.z, pd=Math.hypot(pdx,pdz);
  b.waveCd-=dt;
  if(pd<7&&b.waveCd<=0&&b.task!=='wave'&&!PL.dead){ b.task='wave'; b.t=0; b.dur=2.2; b.speed=0; S.wave=true; S.gather=false; S.crouch=false; S.harv=false; S.swing=-1; b.waveCd=botRnd(40,80); }
  let want=0, face=null;
  switch(b.task){
    case 'walk': case 'toTree': case 'toRock': {
      const dx=b.tx-b.x, dz=b.tz-b.z, d=Math.hypot(dx,dz), stop=b.task==='toTree'?b.tree.r+0.75:b.task==='toRock'?1.25:0.6;
      face=Math.atan2(-dx,-dz);
      if(d<stop){
        if(b.task==='toTree'){ b.task='chop'; b.t=0; b.dur=botRnd(6,12); S.harv=true; }
        else if(b.task==='toRock'){ b.task='mine'; b.t=0; b.dur=botRnd(5,10); S.harv=true; }
        else botTask(b);
        break;
      }
      want=b.speed;
      if(b.speed>=RUN&&Math.random()<dt*0.08&&b.B.roll<0&&S.grounded) b.B.roll=0;     // 달리다 가끔 구른다
      break; }
    case 'chop': case 'mine': {
      const tg=b.task==='chop'?b.tree:b.rock; if(tg) face=Math.atan2(-(tg.x-b.x),-(tg.z-b.z));
      S.harv=true; break; }
    case 'gather': S.gather=true; break;
    case 'eat': { b.eatT=(b.eatT+dt/0.9)%1; S.eat=b.eatT; break; }
    case 'hop': if(S.grounded&&b.hop<=0){ b.vy=JUMP*0.8; S.grounded=false; b.hop=botRnd(0.5,1.1); } b.hop-=dt; break;
    case 'spar': b.punchT-=dt; if(b.punchT<=0&&!b.B.punch){ b.B.punch={side:Math.random()<0.5?1:-1, t:0, dur:0.38}; b.punchT=botRnd(0.35,0.7); } break;
    case 'aim': b.lookT-=dt; if(b.lookT<=0){ b.look=b.yaw+botRnd(-1.2,1.2); S.pitch=botRnd(-0.15,0.35); b.lookT=botRnd(1,2.5); } face=b.look; break;
    case 'wave': face=Math.atan2(-pdx,-pdz); S.wave=true; break;
    case 'idle': b.lookT-=dt; if(b.lookT<=0){ b.look=b.yaw+botRnd(-0.9,0.9); b.lookT=botRnd(1.5,3); } face=b.look; break;
  }
  if(b.t>=b.dur) botTask(b);
  /* 돌기 — 초당 3 rad 까지 */
  if(face!==null){ let da=face-b.yaw; da=Math.atan2(Math.sin(da),Math.cos(da)); b.yaw+=clamp(da,-3*dt,3*dt); }
  /* 걷기 — 가는 쪽이 물이면 멈추고 새 일 */
  const fx=-Math.sin(b.yaw), fz=-Math.cos(b.yaw);
  let vx=fx*want, vz=fz*want;
  if(want>0&&!botLand(b.x+fx*1.2,b.z+fz*1.2)){ vx=vz=0; botTask(b); }
  const ax=1-Math.exp(-dt*8);
  S.vel.x+=(vx-S.vel.x)*ax; S.vel.z+=(vz-S.vel.z)*ax;
  if(b.B.roll>=0){ S.vel.x=fx*Math.max(want,5); S.vel.z=fz*Math.max(want,5); }
  b.x+=S.vel.x*dt; b.z+=S.vel.z*dt;
  /* 나무 · 바위 · 세운 것 · 숲 줄기 · 사람에 막힌다 */
  _btV.set(b.x,b.y,b.z);
  if(typeof resolveProps==='function') resolveProps(_btV,0.38);
  if(typeof floraCollide==='function') floraCollide(_btV,0.38);
  if(pd<0.8&&pd>1e-3){ const k=(0.8-pd)/pd; _btV.x-=pdx*k; _btV.z-=pdz*k; }
  b.x=_btV.x; b.z=_btV.z;
  /* 땅 · 뛰기 */
  const g=botGround(b.x,b.z);
  if(!S.grounded||b.vy>0){ b.vy+=GRAV*dt; b.y+=b.vy*dt; if(b.y<=g){ b.y=g; b.vy=0; S.grounded=true; } else S.grounded=false; }
  else b.y+=(g-b.y)*Math.min(1,dt*14);
  S.vel.y=b.vy;
  /* 걸어도 안 나아가면(막힘) 새 일 */
  if(want>0){ const m=Math.hypot(b.x-b.lx,b.z-b.lz); b.stuck=m<want*dt*0.25?b.stuck+dt:0; if(b.stuck>1.5){ b.stuck=0; if(S.grounded&&Math.random()<0.5){ b.vy=JUMP*0.8; S.grounded=false; } else botTask(b); } }
  b.lx=b.x; b.lz=b.z;
  S.yaw=b.yaw;
  S.swing=-1;
  pbStep(b.B,S,dt,b.x,b.y,b.z);
}

/* ── 매 프레임(99-main.js) ── */
function updateBots(dt){
  if(!BOTS.n||!landed) return;
  if(!BOTS.built){
    if(!pbShared()) return;
    BOTS.group=new THREE.Group(); BOTS.group.name='bots'; scene.add(BOTS.group);
    for(let i=0;i<BOTS.n;i++){ const b=botMake(i), p=botSpot(PL.pos.x,PL.pos.z,20,90)||{x:PL.pos.x+botRnd(-6,6),z:PL.pos.z+botRnd(-6,6)}; botPlace(b,p.x,p.z); BOTS.list.push(b); }
    BOTS.built=true;
  }
  const cx=camera.position.x, cz=camera.position.z;
  for(const b of BOTS.list){
    let d=Math.hypot(b.x-PL.pos.x,b.z-PL.pos.z);
    if(d>BOTS.far){                                                      // 너무 멀어졌다 — 사람 뒤쪽(보지 않는 쪽)으로 옮긴다
      const p=botSpot(PL.pos.x,PL.pos.z,70,140,Math.atan2(Math.cos(PL.yaw),Math.sin(PL.yaw)));
      if(p){ botPlace(b,p.x,p.z); d=Math.hypot(b.x-PL.pos.x,b.z-PL.pos.z); }
    }
    const live=d<BOTS.live;
    b.B.rig.visible=live;
    if(!live) continue;
    botTick(b,dt);
    const dc=Math.hypot(b.x-cx,b.z-cz);
    b.B.line.visible=dc<60; b.tag.visible=dc<45;
  }
}
