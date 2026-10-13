/* 80-player.js — CASTAWAY
   사람 — 몹 표(파워레벨) · 1인칭 플레이어(걷기·헤엄·기력·배고픔·체력) · 소리 합성 · 발소리
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12-d) 몹 스폰 — 파워레벨
   ----------------------------------------------------------------------------
   리썰 컴퍼니의 방식을 땄다. 섬에는 날마다 정해진 '파워레벨' 예산이 있고 몹은
   저마다 값을 갖는다. 예산이 남아 있는 동안에만 새 몹이 들어서므로, 약한 것이
   깔려 있으면 강한 것이 설 자리가 없다 — 머릿수와 질이 하나의 저울에 얹힌다.

   · 1일차는 0. 표류 첫날은 아무것도 나오지 않는다.
   · 예산은 15·(6/5)^(d-2). 섬이 1920 m 나 되어 예산이 얕으면 하루 종일 걸어도
     아무것도 못 만난다 — 그래서 2일차를 15로 잡았다.
   · 38일(10632)에서 멎는다. 가장 무거운 몹이 500이니 그쯤이면 수십 마리가
     같이 설 자리가 나온다.
   ========================================================================== */
const START_HOUR=8.5;                        // 표류 첫날 눈을 뜬 시각
const dayNo=()=>1+Math.floor((gameHours+START_HOUR)/24);
/* 날짜별 파워레벨 예산 — 첨자가 곧 날짜다(0번은 자리 채움).
   2일차부터 round(15 · (6/5)^(d-2)) — 나흘에 갑절꼴로 불어난다.
   밑값 5 에서 15 로 올렸다(3배). 섬이 2.5배로 넓어져 예전 예산으로는
   하루 종일 걸어도 아무것도 못 만난다. */
const POWER_BASE=15;
const DAY_POWER=[0,
    0,  15,  18,  22,  26,  31,  37,  45,  54,  64,   //  1 ~ 10일
   77,  93, 111, 134, 160, 193, 231, 277, 333, 399,   // 11 ~ 20일
  479, 575, 690, 828, 994,1192,1431,1717,2061,2473];  // 21 ~ 30일
const POWER_LAST=38;                         // 예산이 자라는 마지막 날
const POWER_CAP=Math.round(POWER_BASE*Math.pow(6/5,POWER_LAST-2));   // = 10632
const powerBudget=d=>d<=30 ? DAY_POWER[clamp(d,1,30)]
       : Math.min(POWER_CAP, Math.round(POWER_BASE*Math.pow(6/5,d-2)));

/* 몹 명세
   ----------------------------------------------------------------------------
   power  예산에서 차지하는 값
   first  처음 나올 수 있는 날. 예산이 그 몹을 감당하는 날보다 앞설 수 없다
   peak   전성기. 이 날 가중치가 100 으로 가장 높다
   rise   전성기 전, 며칠마다 가중치가 갑절이 되는가
   fall   전성기 후, 며칠마다 절반이 되는가 (길게 두면 오래 남아 잡몹 노릇을 한다)
   hold   표에만 있고 아직 섬에 나오지 않는다 — 모델이 붙으면 이 줄을 지운다

   가중치는 전성기에서 멀어질수록 반씩 줄어드는 종 모양이라 날마다 값이 바뀐다.
   그래서 몹들이 저절로 순서대로 들어왔다 물러난다.
   아르크토스의 전성기 16일·배증 3일은 12일에 가고일과 개체수가 맞도록 맞춘 값이다.
   가중치는 가고일 25 대 아르크토스 40 으로 곰이 높은데, 예산이 바닥날 무렵엔 값싼
   가고일만 들어갈 수 있어 마지막 자리를 가고일이 쓸어가기 때문이다. 그만큼을
   곰 쪽에 얹어야 실제 마릿수가 같아진다 (12일 실측 3.16 대 3.12). */
/* drop — 한 마리를 잡으면 나오는 것. 그 재료로 만드는 무기 두 자루 분이 기준이다
   (키틴 검 3 · 키틴 도끼 3 → 키틴 6 / 뼈 창 3 · 뼈 해머 4 → 뼈 8 에 가죽 3). */
const MOBS=[
  //  id            이름              power first peak rise fall
  {id:'gargoyle',  n:'가고일', power:   1, first: 2, peak: 4, rise:2, fall: 4,
   drop:[{id:'chitin',n:6}]},
  {id:'bear',      n:'아르크토스',        power:   3, first: 2, peak:16, rise:3, fall: 8,
   drop:[{id:'bone',n:8},{id:'hide',n:3},{id:'meat_bear',n:5}]},
  /* 애쉬스케일 — 소금게 자리를 넘겨받았다. 상공을 돌다 내리꽂고, 화염구를 뱉고,
     쫓기는 길에 지어 놓은 집부터 부순다. 죽을 때 터지므로 잡고도 물러나야 한다.
     거동은 wyvern_arena.html 에 있다. */
  {id:'emberwyvern',n:'애쉬스케일',  power:   4, first: 3, peak:18, rise:3, fall: 6,
   /* 비늘 12 — 한 마리분으로 복합 갑옷(6)과 복합 투구(3)를 다 꿰고 3 이 남는다.
      잿불 비늘 갑옷(6)·투구(3) 한 벌로 가도 셈이 맞는다. */
   drop:[{id:'gunpowder',n:1},{id:'ember_scale',n:12}]},
  /* 스킨워커 — 먹은 것의 모습을 흉내 낸다. 멀티플레이가 붙으면 시신이나 산 사람을
     삼켜 그 사람으로 변신한다(계획). 지금은 혼자 하는 게임이라 변신할 대상이 없다. */
  {id:'mimicspider', n:'스킨워커',   power:  10, first: 6, peak:21, rise:3, fall: 6,
   drop:[{id:'spider_silk',n:6},{id:'mimic_flesh',n:2}]},
  {id:'sulfnewt',  n:'유황 도롱뇽',   power:  20, first:10, peak:24, rise:3, fall: 6},
  {id:'stonewing', n:'석화 가고일',   power:  35, first:13, peak:27, rise:3, fall: 6},
  {id:'stormwyrm', n:'번개비늘 와이엄',power:  60, first:16, peak:29, rise:3, fall: 6},
  {id:'lavagolem', n:'용암 골렘',     power: 100, first:19, peak:31, rise:3, fall: 6},
  {id:'ironfang',  n:'철니 늑대',     power: 130, first:20, peak:33, rise:3, fall: 6},
  {id:'deeparm',   n:'심해 촉수',     power: 200, first:23, peak:35, rise:3, fall: 8},
  {id:'plutonspawn',n:'관입체의 것',  power: 500, first:28, peak:38, rise:3, fall:60}
];
/* 모델이 있는 것은 아르크토스뿐이다. 나머지는 표만 있고 섬에는 나오지 않는다 —
   개체를 붙일 때마다 그 줄의 hold 를 지운다. */
for(const M of MOBS) if(M.id!=='bear') M.hold=true;
function mobWeight(M,d){
  if(d<M.first) return 0;
  const H=(d<=M.peak)?M.rise:M.fall;     // 전성기 전후로 기울기가 다르다
  return 100*Math.pow(2,-Math.abs(d-M.peak)/H);
}
/* 그날 섬에 깔 몹을 뽑는다. 예산이 모자라 못 들어가는 몹은 후보에서 빠지므로
   마지막 한 자리는 값싼 쪽으로 채워진다. rnd 를 주면 결정론적으로 재현된다. */
function rollSpawns(d,rnd){
  rnd=rnd||Math.random;
  const out=[]; let left=powerBudget(d);
  for(let guard=0; guard<200; guard++){
    const pool=MOBS.filter(M=>!M.hold && M.power<=left && mobWeight(M,d)>0);
    if(!pool.length) break;
    let sum=0; for(const M of pool) sum+=mobWeight(M,d);
    let r=rnd()*sum, pick=pool[pool.length-1];
    for(const M of pool){ r-=mobWeight(M,d); if(r<=0){ pick=M; break; } }
    out.push(pick.id); left-=pick.power;
  }
  return out;
}

/* ============================================================================
   13) 1인칭 플레이어
   ========================================================================== */
/* 배고픔이 줄어드는 빠르기(초당). 실시간 1분이 게임 1시간이므로 하루는 24분.
   그냥 걸어 다니면 하루 반쯤에 바닥난다 — 하루에 한 번은 먹어야 한다. */
const FOOD_DRAIN=0.035;
/* 목마름은 배고픔보다 두 배쯤 빨리 온다 — 물가를 끼고 도는 것이 탐사 반경을 정한다.
   가만히 서 있어도 가득 찬 목이 17분(게임 17시간)이면 바닥난다. */
const WATER_DRAIN=0.072;
/* 체력 — 아직 몹이 되받아치지 않으므로, 지금 이 섬에서 사람을 죽일 수 있는 것은
   높이 · 물 · 굶주림 셋뿐이다. 먹고 쉬면 더디게 아문다. */
const HPMAX=100;
const HP_FALL_V=17,  HP_FALL_K=6;    // 이보다 빨리 떨어지면 그 초과분만큼 다친다
                                     // 한 층 2.4 m — 세 층(7.2 m)에서 뛰어내려도 거의 안 다친다
const HP_DROWN=14, HP_STARVE=0.8, HP_THIRST=1.2, HP_REGEN=0.7;   // 초당
const GRAV=-22, WALK=4.3, RUN=7.4, CROUCH=2.0, SWIMSP=2.3, JUMP=7.6,
      EYE=1.66, EYE_C=0.98, PRAD=0.42, MAXSLOPE=1.15,   // 49° 넘는 사면은 오르지 못함
      STEPUP=0.55;                                      // 이 높이 이하 턱은 그냥 올라선다
const PL={pos:new THREE.Vector3(),vel:new THREE.Vector3(),yaw:0,pitch:0,
  grounded:false,crouch:false,run:false,swim:false,wade:0,
  hp:100,stam:100,oxy:100,food:100,water:100,ill:0,bob:0,dist:0,eye:EYE};
const keys={};
/* 뚫고 내려가기 — 이 시간 동안에는 DROP.y 아래의 지은 바닥만 밟는다.
   Ctrl+Space 로 지붕을 뚫고 내려올 때 쓴다. */
const DROP={t:0, y:0};
let flyMode=false, paused=true;
const fly={r:520,th:0.8,ph:0.95,tx:0,ty:0,tz:0};

/* 다치기 — 갑옷이 조금 받아 준다. 아레나와 같은 식으로 최대 72%까지 덜어낸다.
   숨이 막히고 굶주리는 것은 갑옷이 막아 주지 못한다. */
let hurtFlash=0, lastHurtMsg=0;
function hurtPL(dmg,why,armored){
  if(PL.dead||dmg<=0) return;
  if(armored) dmg*=armorMul();
  PL.hp-=dmg;
  hurtFlash=Math.min(1,hurtFlash+Math.min(0.9,dmg/30));
  if(why && dmg>=1 && performance.now()-lastHurtMsg>900){
    lastHurtMsg=performance.now(); toast(why+' — 체력 '+Math.max(0,Math.round(PL.hp)));
  }
  if(PL.hp<=0) diePL(why||'쓰러졌다');
}
function diePL(why){
  if(PL.dead) return;
  PL.hp=0; PL.dead=true; paused=true;
  try{ if(document.pointerLockElement===cv) document.exitPointerLock(); }catch(e){}
  const ov=document.getElementById('ov');
  ov.querySelector('h1').textContent='쓰러졌다';
  ov.querySelector('.s').textContent=why+'. 눈을 떠 보니 표류물 곁이다 — '
    +'가진 것은 그대로지만 배는 절반만 차 있다.';
  document.getElementById('bStart').textContent='깨어나기';
  ov.style.display='flex';
}
/* 깨어나기 — 짐은 그대로 두고 표류물 곁으로 돌려보낸다. 죽음이 가벼우면
   높이도 물도 무섭지 않으니, 배를 절반으로 깎아 대가를 남긴다. */
function revivePL(){
  shipGone();                                                  // 깨어났을 때 배는 이미 떠나고 없다(30-props.js)
  PL.pos.set(LANDING.sx, podPos.y+1, LANDING.sz);              // 늘 같은 자리(착륙 자리 — 30-props.js placePod)
  PL.pos.y=Math.max(0.2,heightAt(PL.pos.x,PL.pos.z))+0.2;
  PL.vel.set(0,0,0); PL.camY=undefined;
  PL.hp=HPMAX; PL.stam=60; PL.oxy=100; PL.ill=0; PL.water=Math.min(PL.water,50);
  PL.food=Math.min(PL.food,50);
  PL.dead=false; hurtFlash=0;
  toast('깨어났다');
}
function spawnPlayer(){
  PL.pos.set(LANDING.sx, podPos.y+1, LANDING.sz);              // 늘 배 뒤 같은 자리에서 배를 보며 깬다(30-props.js placePod)
  PL.pos.y=Math.max(0.2,heightAt(PL.pos.x,PL.pos.z))+0.2;
  for(let i=0;i<4;i++){ shipCollide(PL.pos,PRAD+0.3,PL.eye+0.15,PL.pos.y); PL.pos.y=Math.max(0.2,heightAt(PL.pos.x,PL.pos.z))+0.2; }   // 배 몸 속에서 깨지 않게
  PL.vel.set(0,0,0); PL.hp=HPMAX; PL.stam=100; PL.oxy=100; PL.food=100; PL.water=100; PL.ill=0;
  PL.dead=false; hurtFlash=0;
  PL.yaw=Math.atan2(LANDING.x-PL.pos.x, LANDING.z-PL.pos.z)+Math.PI;   // 배 가운데를 본다
  PL.pitch=-0.05;
}

// 지형 자체의 경사(F.slope, 2셀 중앙차분)를 본다.
// 프레임당 이동거리로 나누면 셀 경계의 미세한 단차마저 급경사로 잡혀
// 평지에서도 발이 걸린다. 게다가 프레임률에 따라 판정이 달라진다.
function slopeAt(wx,wz){
  const gx=clamp(Math.round(wx/CELL+N/2),0,N-1), gz=clamp(Math.round(wz/CELL+N/2),0,N-1);
  return F.slope[IDX(gx,gz)];
}
/* fromH 는 반드시 '지금 발이 딛고 선 높이'여야 한다.
   예전에는 z 축만 지형 높이(heightAt)를 넘겨서, 토대·지붕·경사면 위에서는
   턱 높이를 땅바닥부터 재고 있었다. 경사 지붕 초입에서 0.55 m 를 넘는 순간
   앞으로 못 가고 걸리던 것이 이 때문이다.
   공중에 뜬 동안에는 발 높이(p.y)를 기준으로 봐서, 뛰어서 턱을 넘을 수 있다. */
function walkable(x,z,fromH){
  if(Math.abs(x)>HALF-6||Math.abs(z)>HALF-6) return false;
  const rise=floorAt(x,z,fromH)-fromH;         // 토대·지붕 윗면도 바닥으로 친다
  if(rise<=0.02) return true;                 // 평지·내리막은 항상 통과
  if(rise>STEPUP) return false;               // 한 번에 오르기엔 너무 높은 턱
  return slopeAt(x,z)<=MAXSLOPE;              // 지속적인 급사면만 막는다
}

const NO_KEYS={};
function updatePlayer(dt){
  if(PL.dead) return;                              // 쓰러져 있는 동안에는 아무것도 안 한다
  if(climbTick(dt)) return;                        // 나무를 오르는 중 — 몸은 줄기에 붙어 있다(97-wildlife.js)
  const p=PL.pos;
  /* 가방(소지품·제작)을 연 동안에는 세상은 흐르지만 몸은 선다 — 누르고 있던 걷기·뛰기 키를 안 받는다 */
  const K=(invOpen||craftOpen)?NO_KEYS:keys;
  const fwd=(K.KeyW?1:0)-(K.KeyS?1:0);
  const str=(K.KeyD?1:0)-(K.KeyA?1:0);
  PL.crouch=!!(K.ControlLeft||K.KeyC)&&!PL.swim;
  PL.run=!!K.ShiftLeft && !PL.crouch && PL.stam>1 && fwd>0 && PL.food>0 && PL.water>0;

  const gy=floorAt(p.x,p.z,p.y);
  // 바다는 해수면 0, 하천은 하도별 수면 표고를 쓴다
  const sm=sampleAt(p.x,p.z);
  const wl=(sm.river&&sm.elev>0)?waterLevelAt(p.x,p.z):0;
  const depth=Math.max(0,wl-gy);          // 수심
  const sub=Math.max(0,wl-p.y);           // 플레이어 발이 잠긴 깊이
  // 헤엄은 가슴 넘게 잠겨야 — 하천(수심 1 m 안팎)은 걸어서 건넌다. 예전 1.7 m 는 하천 판 경사에서도 걸렸다
  const SWIMD=(sm.river&&sm.elev>0)?2.6:2.2;
  /* 한번 헤엄치기 시작하면 발이 수면 밑 0.25 m 에 올 때까지는 헤엄이다. 예전엔 들 때도 날 때도 1.0 m 였는데,
     부력이 몸을 띄우는 자리(발 0.45 m)가 그보다 얕아 **뜨자마자 헤엄이 풀리고 → 가라앉아 다시 헤엄 → …** 을
     프레임마다 되풀이했다. 그래서 눈이 딱 수면에 걸려 물속 안개가 깜빡였고, 헤엄 기력도 세 번에 한 번은 안 빠졌다. */
  PL.swim = depth>SWIMD && sub>(PL.swim?0.25:1.0);
  PL.depth = depth;                       // 그물질 판정에 쓴다
  PL.wade = clamp(depth/SWIMD,0,1);

  // 하중 페널티 — 만재에서 속도 55%, 80% 이상이면 달릴 수 없다
  const load=invLoad();
  if(load>0.8) PL.run=false;
  /* 헤엄 장비는 지니고만 있으면 듣는다 — 오리발(빠르고 덜 지친다) · 스노클(수면 밑에서 숨) · 물안경(시야) */
  const fins=PL.swim&&hasGear('fins'), spent=PL.swim&&PL.stam<1;
  let sp = PL.swim?SWIMSP*(fins?1.5:1)*(spent?0.45:1) : (PL.crouch?CROUCH : (PL.run?RUN:WALK));
  sp*=1-0.45*load;
  if(!PL.swim && depth>0.5) sp*=1-0.45*PL.wade;      // 물속 저항

  const s=Math.sin(PL.yaw), c=Math.cos(PL.yaw);
  let dx=(-s*fwd+c*str), dz=(-c*fwd-s*str);
  const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l;
  const moving=!!(fwd||str);
  const acc=(PL.grounded||PL.swim)?15:4;
  PL.vel.x+=((moving?dx*sp:0)-PL.vel.x)*clamp(acc*dt,0,1);
  PL.vel.z+=((moving?dz*sp:0)-PL.vel.z)*clamp(acc*dt,0,1);

  if(PL.swim){
    // 부력으로 수면 근처에 뜬다. Space로 잠수 해제, Ctrl로 하강
    /* 기력이 다하면 몸이 가라앉는다 — 머리가 잠겨 숨이 닳기 시작한다(떠오르기도 안 먹는다). 발이 닿는 데로 나와야 산다 */
    const target=wl-(spent?1.75:0.45);
    PL.vel.y += (((K.Space&&!spent)?1.6:(K.ControlLeft?-1.4:(target-p.y)*3.2))-PL.vel.y)*clamp(6*dt,0,1);
    /* 숨 — 머리가 잠기면 닳는다. 스노클이 있으면 수면 바로 밑(대롱 길이 0.5 m)까지는 숨을 쉰다 */
    PL.oxy=clamp(PL.oxy + (p.y<wl-(hasGear('snorkel')?1.7:1.2)?-9*dt:14*dt),0,100);
    if(spent){ if(!PL._spentMsg){ PL._spentMsg=true; toast('기력이 다했다 — 몸이 가라앉는다! 발 닿는 데로 나가라'); } }
    else{ PL._spentMsg=false;
      if(PL.stam<25){ if(!PL._tiredMsg){ PL._tiredMsg=true; toast('팔다리가 무겁다 — 기력이 떨어지기 전에 뭍으로 돌아가라'); } }
      else if(PL.stam>40) PL._tiredMsg=false; }
  }else{
    PL.vel.y+=GRAV*dt;
    // 지붕 위에서 Ctrl(앉기) + Space → 그 자리에서 아래로 떨어진다.
    // 가장자리까지 걸어갈 자리가 없는 좁은 지붕에서도 내려올 수 있게 하는 길이다.
    // 보통 점프보다 먼저 본다 — 안 그러면 점프가 먼저 걸려 위로 뛴다.
    if(K.Space&&K.ControlLeft&&PL.grounded&&p.y>heightAt(p.x,p.z)+0.9){
      DROP.t=0.45; DROP.y=p.y; PL.grounded=false; PL.vel.y=-1.2;
    }
    else if(K.Space&&PL.grounded){ PL.vel.y=JUMP; PL.grounded=false; DROP.t=0; }
    PL.oxy=clamp(PL.oxy+18*dt,0,100);
  }

  // 축별로 나눠 이동시켜 급사면에서 미끄러지듯 막히게 한다
  const mx=PL.vel.x*dt, mz=PL.vel.z*dt;
  // 두 축 모두 같은 기준을 쓴다. 떠 있는 동안에는 발 높이가 기준이라 뛰어 넘을 수 있다
  const fh=PL.grounded?gy:Math.max(gy,p.y);
  if(walkable(p.x+mx,p.z,fh)) p.x+=mx; else PL.vel.x*=0.4;
  if(walkable(p.x,p.z+mz,fh)) p.z+=mz; else PL.vel.z*=0.4;
  resolveProps(p,PRAD);
  floraCollide(p,PRAD);                        // 어린 나무·자작·야자의 줄기(95-flora.js)
  const y0=p.y;
  p.y+=PL.vel.y*dt;
  shipCollide(p,PRAD,PL.eye+0.15,y0,PL.vel);   // 보급선 몸에 막힌다 · 머리가 밑면에 닿는다(30-props.js)

  if(DROP.t>0){ DROP.t-=dt; }
  let ng=Math.max(floorAt(p.x,p.z,p.y),shipFloor(p.x,p.z,p.y));   // 지은 바닥 · 보급선 날개·몸 위에 선다
  if(DROP.t>0) ng=Math.min(ng, floorAt(p.x,p.z,DROP.y-1.0));   // 뚫고 내려가는 중
  if(p.y<=ng){
    if(PL.vel.y<-13 && !PL.swim && depth<0.5){
      PL.stam=clamp(PL.stam-Math.abs(PL.vel.y+13)*4,0,100);
      const v=-PL.vel.y;
      if(v>HP_FALL_V) hurtPL((v-HP_FALL_V)*HP_FALL_K, '떨어졌다');
    }
    p.y=ng; PL.vel.y=0; PL.grounded=true; DROP.t=0;
  }else PL.grounded=false;

  /* 배고픔 — 가만히 있어도 줄고, 움직이고 일할수록 빨리 준다.
     굶으면 기력 한도가 내려가고, 바닥나면 달리지 못하고 기력이 도로 빠진다. */
  const work=(PL.run&&moving)?2.2:(moving?1.3:1)+(HARV.active?1.1:0);
  PL.food=clamp(PL.food-FOOD_DRAIN*work*dt*(1+load*0.4),0,100);
  /* 목마름 — 일할수록 빨리 마르고, 속병이 나면 더 빨리 마른다. */
  PL.water=clamp(PL.water-WATER_DRAIN*work*dt*(PL.ill>0?1.5:1),0,100);
  if(PL.ill>0) PL.ill=Math.max(0,PL.ill-dt);        // 날것을 먹고 앓는 동안

  // 기력 — 굶으면 차오르는 한도가 내려간다
  const cap=Math.min(PL.food<=0?45:(PL.food<30?60+PL.food*4/3:100),
                     PL.water<=0?35:(PL.water<30?55+PL.water*1.5:100));
  const drain=1+load*1.1;                            // 짐이 무거울수록 빨리 지친다
  if(PL.run&&moving) PL.stam-=17*dt*drain;
  /* 헤엄은 기력을 **천천히** 판다 — 저어 가면 초당 2.2(45초쯤), 떠 있기만 해도 0.6. 물에서는 쉬어도 안 찬다.
     오리발이 있으면 절반. 예전엔 저을 때만 초당 6 이 빠지고 떠 있으면 도로 찼다(다해도 아무 일이 없었다). */
  else if(PL.swim) PL.stam-=(moving?2.2:0.6)*(fins?0.5:1)*dt*drain;
  else if(!HARV.active) PL.stam+=(PL.grounded?12:5)*dt*(1-load*0.5)
                                *(PL.food<=0?0:(PL.ill>0?0.45:1));
  if(PL.food<=0) PL.stam-=3.5*dt;                    // 굶으면 도로 빠진다
  if(PL.water<=0) PL.stam-=5*dt;                     // 목이 마르면 더 빨리 빠진다
  PL.stam=clamp(PL.stam,0,cap);

  /* 체력 — 물에 잠겨 숨이 다하거나, 굶어 바닥나면 깎인다.
     배가 웬만큼 차 있고 앓지 않으면 더디게 아문다. */
  if(PL.oxy<=0)       hurtPL(HP_DROWN*dt,  '숨이 막힌다');
  else if(PL.water<=0)hurtPL(HP_THIRST*dt, '목이 탄다');
  else if(PL.food<=0) hurtPL(HP_STARVE*dt, '굶주린다');
  else if(PL.food>35 && PL.water>25 && PL.ill<=0 && PL.hp<HPMAX)
    PL.hp=Math.min(HPMAX, PL.hp+HP_REGEN*dt);

  // 헤드밥 + 발소리
  const hs=Math.hypot(PL.vel.x,PL.vel.z);
  if(PL.grounded&&!PL.swim){
    PL.dist+=hs*dt;
    PL.bob+=dt*hs*(PL.run?2.3:1.7);
    if(PL.dist>(PL.run?2.0:2.6)){ PL.dist=0; footstep(); }
  }
  const bob=(PL.grounded&&!PL.swim)?Math.sin(PL.bob*2)*Math.min(hs*0.013,0.055):0;
  PL.eye+=(((PL.crouch?EYE_C:EYE)+(PL.swim?-0.9:0))-PL.eye)*clamp(10*dt,0,1);
  // 작은 턱을 올라설 때 시점이 톡톡 튀지 않게 세로만 부드럽게 따라간다
  if(PL.camY===undefined||!PL.grounded||Math.abs(p.y-PL.camY)>1.2) PL.camY=p.y;
  else PL.camY+=(p.y-PL.camY)*clamp(16*dt,0,1);
  camera.position.set(p.x,PL.camY+PL.eye+bob,p.z);
  camera.rotation.set(PL.pitch,PL.yaw,Math.sin(PL.bob)*hs*0.0016,'YXZ');

  // 수중이면 안개를 진하게 — 물 밖과 확실히 구분되게
  const head=p.y+PL.eye;
  if(head<wl){
    /* 물속 — 안개를 **물빛**으로 바꾼다. 예전엔 색은 그대로(지평선의 흰 잿빛) 두고 짙기만 올려, 물속이 잿빛 연기 속 같았다
       (사용자 지적: 물속이 진짜 같지 않다). 볕이 있는 만큼 밝은 청록, 밤에는 검푸르다. 물안경이 있으면 멀리까지 맑다 */
    const lum=clamp(hemi.intensity*1.1+sun.intensity*0.55,0.03,1.1), rv=(sm.river&&sm.elev>0);
    scene.fog.color.setRGB((rv?0.10:0.03)*lum,(rv?0.22:0.30)*lum,(rv?0.16:0.37)*lum);
    scene.fog.density=hasGear('goggles')?0.030:0.060; skyUnder=true;
  }
}
/* 지니고 있나 — 헤엄 장비처럼 '갖고만 있으면 듣는' 것을 본다 */
const hasGear=id=>{ for(const s of INV.slots) if(s.id===id) return true; return false; };

/* ============================================================================
   음향 — 물리 모델 합성
   ----------------------------------------------------------------------------
   녹음 샘플 대신 재료의 물리적 거동을 층으로 쌓아 만든다.
     · 타격 순간의 광대역 트랜지언트(click)
     · 재료 고유의 공진 모드(ring) — 나무는 낮고 길게, 돌은 높고 짧게
     · 섬유·자갈이 찢기고 부서지는 잡음층(noise)
   매번 주파수와 시작 위치를 흔들어 같은 소리가 두 번 나지 않게 한다.
   ========================================================================== */
const A={ctx:null, noise:null, master:null};
let VOL=0.9, SENS=1;            // 음량 · 마우스 감도 — 설정 창(applySettings)이 채운다
function initAudio(){
  if(A.ctx) return;
  try{
    A.ctx=new (window.AudioContext||window.webkitAudioContext)();
    const len=Math.floor(A.ctx.sampleRate*2);       // 2초 백색잡음 — 임의 지점부터 재생
    A.noise=A.ctx.createBuffer(1,len,A.ctx.sampleRate);
    const d=A.noise.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    A.master=A.ctx.createGain();
    A.master.gain.value=VOL;
    A.master.connect(A.ctx.destination);
  }catch(e){}
}
const rr=(a,b)=>a+Math.random()*(b-a);
const T0=()=>A.ctx.currentTime;

// 공진 모드 하나 — 재료의 '울림'
function ring(freq,dur,gain,t,type,drop){
  if(!A.ctx) return;
  const o=A.ctx.createOscillator(), g=A.ctx.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(freq,t);
  o.frequency.exponentialRampToValueAtTime(freq*(drop||0.9),t+dur);
  g.gain.setValueAtTime(Math.max(1e-4,gain),t);
  g.gain.exponentialRampToValueAtTime(0.0004,t+dur);
  o.connect(g); g.connect(A.master);
  o.start(t); o.stop(t+dur+0.02);
}
// 필터를 통과한 잡음 버스트 — 찢김·부스러짐·마찰
function nz(t,dur,gain,type,freq,Q,rate){
  if(!A.ctx||!A.noise) return;
  const s=A.ctx.createBufferSource(); s.buffer=A.noise; s.loop=true;
  s.playbackRate.value=rate||rr(0.85,1.2);
  const f=A.ctx.createBiquadFilter();
  f.type=type; f.frequency.value=freq; f.Q.value=Q||1;
  const g=A.ctx.createGain();
  g.gain.setValueAtTime(Math.max(1e-4,gain),t);
  g.gain.exponentialRampToValueAtTime(0.0004,t+dur);
  s.connect(f); f.connect(g); g.connect(A.master);
  s.start(t,Math.random()*1.5); s.stop(t+dur+0.02);
}
// 타격 트랜지언트
const click=(t,gain,freq)=>nz(t,0.011,gain,'highpass',freq||1500,0.7);

const SFX={
  // 폭발 — 낮은 쿵 + 거친 잡음이 퍼져 나가며 사그라든다
  boom(){ const t=T0();
    ring(48,0.9,0.9,t,'sine',0.35);
    nz(t,0.9,0.8,'lowpass',900,0.7);
    nz(t+0.02,0.35,0.5,'bandpass',2400,0.8); },
  // 노거수가 넘어가기 시작한다 — 섬유가 찢기며 길게 삐걱인다(크랙이 다섯 번 · 낮은 톱니 울림)
  timber(){ const t=T0();
    for(let i=0;i<5;i++){ const k=t+i*0.34+rr(0,0.12);
      click(k,0.3,900); ring(rr(85,130),0.55,0.22,k,'sawtooth',0.7); nz(k,0.45,0.14,'bandpass',rr(450,900),3); } },
  // 노거수가 땅을 친다 — 아주 낮은 쿵 + 가지가 부서지는 잡음 + 잔 크랙들
  thud(){ const t=T0();
    ring(36,1.5,1.0,t,'sine',0.5); ring(68,0.9,0.5,t,'triangle',0.6);
    nz(t,1.3,0.9,'lowpass',480,0.7); nz(t+0.05,1.0,0.45,'bandpass',1700,1.2);
    for(let i=0;i<7;i++) click(t+0.03+i*0.08*rr(0.6,1.4),0.22,1500); },
  // 마른 가지가 꺾인다: 날카로운 크랙 + 목질 공진 + 섬유 찢김
  branch(){ const t=T0(), p=rr(0.85,1.2);
    click(t,0.34,1400*p);
    ring(330*p,0.14,0.15,t,'triangle',0.72);
    ring(880*p,0.085,0.08,t+0.004,'sine',0.8);
    nz(t+0.012,0.075,0.09,'bandpass',2600*p,2.6); },

  // 도끼로 찍는다: 낮고 둔한 타격 + 쪼개짐. 가지보다 크고 느리다
  chop(){ const t=T0(), p=rr(0.9,1.1);
    click(t,0.26,900*p);
    ring(150*p,0.22,0.24,t,'triangle',0.66);
    ring(410*p,0.13,0.11,t+0.006,'sine',0.74);
    nz(t+0.008,0.13,0.11,'bandpass',1100*p,1.5);
    nz(t+0.05,0.10,0.05,'bandpass',3000,2.2); },

  // 풀을 뜯는다: 순수 잡음. 짧은 찢김이 서너 번 겹친다
  grass(){ const t=T0(), n=3+((Math.random()*3)|0);
    for(let i=0;i<n;i++)
      nz(t+i*rr(0.010,0.030), rr(0.035,0.065), rr(0.035,0.065),
         'bandpass', rr(2600,5600), rr(1.2,2.4));
    nz(t,0.17,0.022,'lowpass',850,0.7); },

  // 돌을 집는다: 돌끼리 부딪는 짧고 밝은 딱 소리
  stone(){ const t=T0(), p=rr(0.85,1.25);
    click(t,0.22,3000*p);
    ring(1900*p,0.045,0.10,t,'sine',0.85);
    ring(3400*p,0.030,0.06,t+0.002,'sine',0.85);
    nz(t,0.05,0.05,'bandpass',1400*p,1.4); },

  // 점토를 판다: 축축하고 둔탁. 공진이 거의 없다
  dig(){ const t=T0(), p=rr(0.9,1.1);
    nz(t,0.14,0.20,'lowpass',260*p,0.6);
    ring(95*p,0.09,0.10,t,'sine',0.6);
    nz(t+0.03,0.09,0.04,'bandpass',700,1.0); },

  // 젖은 자갈층을 헤집는다 (늪철광 · 사광 석석)
  gravel(){ const t=T0(), n=4+((Math.random()*4)|0);
    nz(t,0.13,0.10,'lowpass',420,0.7);
    for(let i=0;i<n;i++)
      nz(t+i*rr(0.012,0.035), 0.035, rr(0.03,0.06),'bandpass',rr(1400,3200),3.0); },

  // 잘 부스러지는 것 (석탄): 작은 파편이 연달아 떨어진다
  brittle(){ const t=T0();
    click(t,0.20,1800);
    ring(240,0.10,0.10,t,'triangle',0.7);
    for(let i=0;i<6;i++)
      nz(t+rr(0.01,0.16), 0.028, rr(0.02,0.05),'bandpass',rr(1800,4200),4.0); },

  // 단단한 암반을 친다 (공작석 · 화강암): 높고 쨍한 반향 + 낮은 몸통
  hardrock(){ const t=T0(), p=rr(0.9,1.15);
    click(t,0.30,4000*p);
    ring(2500*p,0.075,0.13,t,'sine',0.9);
    ring(5200*p,0.045,0.07,t+0.002,'sine',0.92);
    ring(170*p,0.16,0.13,t+0.002,'triangle',0.7);
    nz(t+0.01,0.09,0.06,'bandpass',1600,1.6); },

  // 뗀석기 타격: 규질암 특유의 유리 같은 소리. 아주 짧고 높다
  knap(){ const t=T0(), p=rr(0.9,1.2);
    click(t,0.28,5000*p);
    ring(3800*p,0.038,0.12,t,'sine',0.95);
    ring(6400*p,0.022,0.06,t+0.001,'sine',0.95);
    nz(t+0.004,0.035,0.05,'highpass',3000,1.0); },

  // 결속·조립 (노끈 감기, 자루 끼우기)
  bind(){ const t=T0();
    for(let i=0;i<3;i++) nz(t+i*0.06,0.07,0.045,'bandpass',rr(1400,2600),1.4);
    ring(300,0.10,0.05,t+0.14,'triangle',0.8); },

  // 불이 붙는 순간: 낮은 데서 부풀어 오르는 잡음
  ignite(){ const t=T0();
    if(!A.ctx) return;
    const s=A.ctx.createBufferSource(); s.buffer=A.noise; s.loop=true;
    const f=A.ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=0.8;
    f.frequency.setValueAtTime(280,t);
    f.frequency.exponentialRampToValueAtTime(1500,t+0.28);
    const g=A.ctx.createGain();
    g.gain.setValueAtTime(0.001,t);
    g.gain.exponentialRampToValueAtTime(0.13,t+0.12);
    g.gain.exponentialRampToValueAtTime(0.0004,t+0.7);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t,Math.random()); s.stop(t+0.75); },

  // 창으로 찌른다: 바람 가르는 소리
  thrust(){ const t=T0();
    nz(t,0.16,0.07,'bandpass',rr(700,1100),1.1,rr(0.5,0.8)); }
};
function sfx(n){ if(A.ctx&&SFX[n]) SFX[n](); }

// 자원 종류와 작업 방식으로 어떤 소리를 낼지 고른다
function harvestSfx(kind,field){
  if(field==='logs') return 'chop';
  switch(kind){
    case 'oak': case 'fir':   return 'branch';
    case 'grass': case 'reed':return 'grass';
    case 'flint': case 'pebble': return 'stone';
    case 'clay': case 'sand':  return 'dig';
    case 'iron': case 'tin':  return 'gravel';
    case 'coal':              return 'brittle';
    case 'copper': case 'granite': return 'hardrock';
  }
  return 'stone';
}

/* ---------------- 발소리 (지면 재질별) ---------------- */
/* [저역 충격, 재질 잡음 중심주파수, Q, 세기] */
const STEP={};
STEP[B.BEACH] =[120,1900,1.0,0.9];   STEP[B.DUNE]  =[115,1750,1.0,0.85];
STEP[B.MARSH] =[85, 420, 0.8,1.35];  STEP[B.RIVER] =[95, 800, 0.9,1.5];
STEP[B.ROCK]  =[170,2900,2.2,0.8];   STEP[B.SCREE] =[160,2500,2.6,1.0];
STEP[B.MEADOW]=[110,1200,1.1,0.8];   STEP[B.SCRUB] =[110,1400,1.2,0.85];
STEP[B.BROADLEAF]=[105,1000,0.9,0.9];STEP[B.CONIFER]=[100,900,0.9,0.9];
function footstep(){
  if(!A.ctx) return;
  const c=STEP[sampleAt(PL.pos.x,PL.pos.z).biome]||[110,1200,1.1,0.85];
  const t=T0(), p=rr(0.88,1.14), wet=PL.wade>0.3?1.5:1;
  ring(c[0]*p,0.075,0.045*c[3]*wet,t,'sine',0.6);          // 발이 닿는 저역 충격
  nz(t,0.10,0.045*c[3]*wet,'bandpass',c[1]*p,c[2]);        // 지면 재질
  if(PL.wade>0.3) nz(t+0.01,0.14,0.05,'bandpass',rr(900,2200),1.2);  // 물 튀는 소리
  if(c===STEP[B.SCREE]) for(let i=0;i<3;i++)               // 자갈이 굴러간다
    nz(t+rr(0.02,0.12),0.03,0.02,'bandpass',rr(1800,3600),3.5);
}
