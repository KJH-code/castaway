/* 97-wyvern.js — CASTAWAY
   애쉬스케일(사용자 요청 '드래곤도 본편에') — beta/wyvern_arena.html 의 와이번을 그대로 옮겼다.
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다 · 모델은 data-mob-wyvern.js)
   시험장 코드는 W · BONE · bone() · rotBone · ccd · REST 처럼 짧은 전역 이름을 쓴다 — 본편 전역과 겹치지 않게 **함수 하나로 감싸**
   쓰는 것만 밖으로 내놓는다(wyvMake — 개체 하나 · wyvBuild · wyvReset · wyvTick · WYVS — 돌려 쓰는 몸 둘). '자세' 구역은 시험장 글자 그대로다 — node tools/wyv-sync.mjs 가
   battle · night · siege 와 함께 여기도 바꿔 끼운다(여기서 고치지 말 것).
   ----------------------------------------------------------------------------
   · 몇 마리가 어디에 사는지는 그날의 파워레벨 명단(97-mobs.js mobRoster)이 정한다 — 사람이 420 m 안에 들면 명단 칸에 몸을 입혀
     그 자리 상공 20 m 에 세우고(spawn) 그 둘레를 돈다 · 몸은 둘(WYVS)을 돌려 쓰고 모델 · 그림은 나눠 쓴다(wyvShared · 뼈만 개체마다 복제).
   · 거동은 아레나(updateW)와 같다 — 상공 20 m 선회 → 60 m 안에 사람이 보이면(또는 맞으면) 5초 노려봄 → 머리부터 내리꽂기(곁 4.9 m 면 30) →
     3초 굳음 → 걸어서 쫓으며 화염구(2.6초 젖혀 겨눈 데로 · 46 · 8초마다) · 할퀴기(34) · 물기(54) — 팔 · 목을 실제로 돌려 닿는 각을 푼다 →
     사람이 60 m 밖으로 나가면 다시 날아오른다(웅크렸다 뛰어올라 초당 5 m).
   · 체력 700 · 불에 안 탄다 · 죽으면 5초 동안 배부터 달아오르며 부풀다 터진다(17.5 m 안 255 — 갑옷이 깎는다) — 잡고도 물러나야 한다.
     터진 자리에 잔해가 남는다(화약 1 · 잿불 비늘 12 — 80-player.js MOBS 표와 같다).
   · 맞는 자리는 뼈를 따라가는 캡슐(아레나 rebuildCaps)을 1 m 마다 공으로 늘어놓아 본편 무기 판정(CREATURES)에 건다 —
     날고 있으면 높아서 근접이 안 닿는다(총 · 활은 닿는다). 사람은 그 캡슐에 막혀 몸 속으로 못 들어간다.
   · 아레나와 다른 것: 지어 놓은 집은 노리지 않는다(시험장의 오두막 셋 대신 본편 건축은 아직 표적에 없다) · 460 m 넘게 멀어지면 자리 · 체력을 명단에 적고 거둔다. */
"use strict";
/* 개체 하나 — 부를 때마다 제 상태(W) · 뼈 · 재질 · 화염구를 갖는 애쉬스케일을 만든다. S 는 나눠 쓰는 모델(wyvShared) */
function wyvMake(S){
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=t=>t*t*(3-2*t);                    // 부드럽게 시작하고 끝난다
const easeIn=t=>t*t*t;                        // 뒤로 갈수록 빨라진다
const h=(x,z)=>Math.max(heightAt(x,z),-0.3);  // 땅(바다 위에서는 물낯 조금 밑)
const msg=t=>toast(t);
let bRig=null, bMesh=null, bMat=null, bScale=1, fbGeo=null, fbMat=null, BONE=null, SKROOT=null, blob=null;

/* ── 몸 · 설정(아레나 그대로) ─────────────────────────────────────────────── */
const WYV_H=4.4;                              // 어깨 높이
const WYV_R=2.30;                             // 가슴 굵기 — 닿는 거리를 겉면에서 잰다
const MOUTH=new THREE.Vector3(0,1.09,2.14);   // 입 — 모델 좌표(화염구가 나오는 자리)
const W={
  pos:new THREE.Vector3(), yaw:0, y:20,       // y 는 지면 위 높이
  hp:700, hpMax:700, alive:false, active:false, flash:0,
  state:'fly', t:0, frz:0, alerted:false, speed:0, walkPh:0,
  target:new THREE.Vector3(), fbCd:0, atkCd:0, wingPh:0, fbAim:null, aimPt:null, pendHit:null, clawAng:0.3, lunge:0, solveGate:0.75, scan:0, lookPh:0,
  dieT:0, boom:0, prey:null, voiceT:6, entry:null
};
const WP={
  see:60, fov:140*Math.PI/180,                // 시야 — 위에서 내려다본다
  cruise:20, flySpd:11, wander:2.2,           // 순항 고도 · 나는 속도
  spotHold:5.0,                               // 발견하고 멈춰 서는 시간
  diveSpd:19, landStun:3.0,                   // 내리꽂는 속도 · 착지 경직
  walk:2.7, turn:2.6,                         // 걷는 속도
  fbWind:2.6, fbCd:8.0, fbSpd:24,             // 화염구 — 젖히는 시간
  fbDmg:46, fbBlast:2.6, fbRange:39,          // 피해 · 터지는 반경 · 쏘는 거리
  clawRange:2.1, clawDmg:34, clawCd:1.5,      // 팔
  clawDur:0.93, clawHit:0.59,                 // 휘두르는 시간 · 닿는 때
  biteRange:1.5, biteDmg:54, biteCd:2.4,      // 물기
  biteDur:0.75, biteHit:0.44,                 // 무는 시간 · 닿는 때
  clawPad:0.83, bitePad:0.68,                 // 닿았다고 보는 여유
  clawSolve:0.75, biteSolve:0.68,             // 이보다 멀면 아예 안 휘두른다
  clawLunge:1.2, biteLunge:1.0,               // 치면서 달려드는 거리
  scan:2.6,                                   // 배회 중 한 자리에서 둘러보는 시간
  wreck:26,                                   // 집을 알아보는 거리(본편은 아직 안 쓴다)
  dieTime:5.0, boomDmg:255, boomR:17.5        // 터질 때까지 · 터지는 힘과 반경
};
/* 뼈 사슬 — 모델에서 실측해 적었다(+z 가 앞) */
const CH_SPINE=['Bone_000','Bone_001','Bone_003','Bone_002'];
const CH_HEAD =['Bone_036','Bone_035','Bone_034','Bone_033','Bone_032'];
const CH_ARM_L=['Bone_026','Bone_025','Bone_024','Bone_023','Bone_022'];
const CH_ARM_R=['Bone_031','Bone_030','Bone_029','Bone_028','Bone_027'];
const CH_LEG_L=['Bone_008','Bone_007','Bone_006','Bone_005','Bone_004'];
const CH_LEG_R=['Bone_013','Bone_012','Bone_011','Bone_010','Bone_009'];
const CH_WING_L=['Bone_039','Bone_038','Bone_037','Bone_066','Bone_065','Bone_064'];
const CH_WING_R=['Bone_042','Bone_041','Bone_040','Bone_072','Bone_071','Bone_070'];
const CH_TAIL =['Bone_021','Bone_020','Bone_019','Bone_018','Bone_017','Bone_016',
                'Bone_015','Bone_014'];
const BODYCH=[CH_SPINE, CH_HEAD, CH_TAIL];
const LIMBCH=[CH_ARM_L, CH_ARM_R, CH_LEG_L, CH_LEG_R, CH_WING_L, CH_WING_R];
/* 쉼 자세 — 자세를 만들 때마다 여기서 다시 시작한다 */
const REST=new Map(), RPOS=new Map();
function bindLimbs(){
  if(!BONE) return;
  for(const nm of Object.keys(BONE)){
    const b=BONE[nm];
    REST.set(nm,b.quaternion.clone());
    b.updateWorldMatrix(true,false);
    RPOS.set(nm,new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));
  }
}
const bone=nm=>BONE&&BONE[nm];
function restPose(){
  if(!BONE) return;
  for(const nm of Object.keys(BONE)){ const q=REST.get(nm); if(q) BONE[nm].quaternion.copy(q); }
}
/* 세계 기준 축으로 뼈 하나를 돌린다 */
const _rq=new THREE.Quaternion(), _rp=new THREE.Quaternion();
function rotBone(bn,axis,ang){
  if(!bn||!bn.parent||!ang) return;
  _rq.setFromAxisAngle(axis,ang);
  bn.parent.getWorldQuaternion(_rp);
  bn.quaternion.premultiply(_rp.clone().invert().multiply(_rq).multiply(_rp));
  bn.updateWorldMatrix(false,true);
}
/* ── 맞는 자리(캡슐) — 굵기는 껍데기에서 잰다(아레나 fitBoneRadii · slimCaps 그대로) ── */
const BR=new Map();
function fitBoneRadii(geo,skin){
  const pos=geo.attributes.position, si=geo.attributes.skinIndex, sw=geo.attributes.skinWeight;
  if(!si||!sw) return;
  const bones=skin.bones;
  const rest=bones.map(bn=>bRig.worldToLocal(bn.getWorldPosition(new THREE.Vector3())));
  const ix=new Map(); bones.forEach((bn,k)=>ix.set(bn,k));
  const seg=bones.map((bn,k)=>{ const kid=(bn.children||[]).find(o=>o.isBone&&ix.has(o)); return kid?rest[ix.get(kid)]:rest[k]; });
  const bag=bones.map(()=>[]);
  const v=new THREE.Vector3(), ab=new THREE.Vector3(), q=new THREE.Vector3();
  const SI=si.array, SW=sw.array;
  for(let i=0;i<pos.count;i++){
    let bi=-1,bw=0;
    for(let c=0;c<4;c++){ const w=SW[i*4+c]; if(w>bw){ bw=w; bi=SI[i*4+c]; } }
    if(bi<0||bw<0.35||!rest[bi]) continue;
    v.fromBufferAttribute(pos,i);
    const A=rest[bi], B=seg[bi];
    ab.copy(B).sub(A);
    const l2=ab.lengthSq();
    const t=l2<1e-9?0:clamp(v.clone().sub(A).dot(ab)/l2,0,1);
    q.copy(A).addScaledVector(ab,t);
    bag[bi].push(v.distanceTo(q));
  }
  bag.forEach((ds,k)=>{ if(ds.length<12) return; ds.sort((a,b)=>a-b); BR.set(bones[k], clamp(ds[Math.floor(ds.length*0.58)],0.03,0.42)); });
  slimCaps();
}
function slimCaps(){
  const cap=(chs,mx)=>{ for(const ch of chs) for(const nm of ch){ const b=BONE&&BONE[nm]; if(!b) continue; const r=BR.get(b); if(r!==undefined) BR.set(b, Math.min(r,mx)); } };
  cap([CH_SPINE],0.335); cap([CH_HEAD],0.215); cap([CH_WING_L,CH_WING_R],0.085);
  cap([CH_ARM_L,CH_ARM_R],0.155); cap([CH_LEG_L,CH_LEG_R],0.185); cap([CH_TAIL],0.165);
  CH_TAIL.slice(4).forEach(nm=>{ const b=BONE&&BONE[nm]; if(b&&BR.get(b)!==undefined) BR.set(b, Math.min(BR.get(b),0.10)); });
}
function capsFrom(bones){
  const out=[], k=bRig?bRig.scale.x:1, dflt=0.28;
  for(let i=0;i+1<bones.length;i++){
    const A=bones[i], B=bones[i+1];
    if(!A||!B) continue;
    out.push({a:A.getWorldPosition(new THREE.Vector3()), b:B.getWorldPosition(new THREE.Vector3()), r:(BR.get(A)||dflt)*k});
  }
  const L=bones[bones.length-1];
  if(L) out.push({a:L.getWorldPosition(new THREE.Vector3()), b:L.getWorldPosition(new THREE.Vector3()), r:(BR.get(L)||dflt)*k});
  return out;
}
/* ── 몸 기준 축 ── */
const _AXS=new THREE.Vector3(), _AXF=new THREE.Vector3(), _AXU=new THREE.Vector3(0,1,0);
function bodyAxes(){
  const s=Math.sin(W.yaw), c=Math.cos(W.yaw);
  _AXF.set(s,0,c);          // 앞(모델 +z)
  _AXS.set(c,0,-s);         // 오른쪽
}
const wGround=()=>h(W.pos.x,W.pos.z);
function wSet(s){ W.state=s; W.t=0; W.hitDone=false; }
/* 달려드는 몫을 닿는 때까지 나눠 옮긴다 */
function lungeStep(dt,hitT){
  if(!W.lunge||W.t>=hitT) return;
  const v=W.lunge/hitT, d=Math.min(v*dt, W.lunge);
  W.pos.x+=Math.sin(W.yaw)*d; W.pos.z+=Math.cos(W.yaw)*d;
  W.walkPh+=dt*v*1.9;
}
/* 선회 목표 — 본편은 사람 둘레 20~80 m 에서 고른다(아레나는 판 안 아무 데나) */
function wWander(){
  const a=rnd(0,6.283), r=rnd(20,80);
  W.target.set(PL.pos.x+Math.cos(a)*r,0,PL.pos.z+Math.sin(a)*r);
}

/* ── 자세 ─────────────────────────────────────────────────────────────────
   쉼 자세에서 시작해 마디를 세계 축으로 돌린다(rotBone — _AXS 옆 축: + 면 머리·발이 뒤/아래로 ·
   _AXF 앞 축 · _AXU 위 축). 매 프레임 새로 짠다.
   이 구역은 wyvern · battle · night · siege 시험장에 글자 그대로 들어 있다 —
   wyvern_arena.html 에서 고치고 node tools/wyv-sync.mjs 로 옮긴다.
   더 자연스럽게(사용자 요청 '애쉬스케일도 더 자연스러운 애니메이션으로'):
   ① 상태 사이 섞기 — 상태가 바뀌는 순간의 자세를 적어 두고 WX_XF(0.3초)에 걸쳐 새 자세로 넘어간다.
      예전엔 한 프레임에 툭 바뀌었다. 할퀴기·물기는 맞는 순간(0.44초 넘어)엔 다 넘어가 있어
      그린 자세가 곧 판정 자세다(resolveHit 가 그린 뒤에 잰다).
   ② 날갯짓 — 내려치기가 빠르고(위상을 비튼다) 바깥 마디일수록 늦게 따라온다(물결) ·
      올릴 때 손목을 접어 날개 끝을 뒤로 젖힌다 · 몇 번 치고 날개를 편 채 미끄러진다(활공) ·
      내려칠 때 몸이 뜬다 · 도는 만큼 몸을 눕힌다(뱅크).
   ③ 나는 동안 뒷다리를 뒤로 붙이고 앞발을 가슴에 모은다 · 꼬리는 늦게 따라오는 물결.
   ④ 노려볼 때(제자리 날기) 깊고 빠르게 치며 다리를 늘어뜨리고, 고개를 숙여 노리는 것을 본다.
   ⑤ 내리꽂을 때 날개를 뒤로 접고, 땅이 가까우면 날개를 펴 앞으로 버티며 다리를 내민다.
   ⑥ 착지 — 쿵 주저앉았다가 고개를 흔들고(어지러움) 날개를 접으며 일어선다.
   ⑦ 걷기 — 뒷다리·앞다리가 차례로(왼뒤 → 왼앞 → 오른뒤 → 오른앞) 내딛는다. 옮기는 다리만 무릎을
      접어 들어 올리고 디딘 다리는 뒤로 민다 · 몸이 걸음마다 오르내리고 좌우로 흔들린다 ·
      머리는 흔들림을 덜어 노리는 것을 본다. 서 있을 때는 숨을 쉰다.
   ⑧ 숨 모으기 — 상체를 젖히고 목을 S 자로 당기며 날개를 들어 편다 · 끝에 떨고 · 쏘는 순간
      목을 앞으로 내지른다(반동).
   ⑨ 할퀴기·물기 — 뒤로 당겼다가(예비 동작) 맞는 순간 끝까지 뻗고 잠깐 머문 뒤 돌아온다.
      판정 자세(applyClawPose · applyBitePose)는 그대로 — 진행 곡선만 바꿨다.
   ⑩ 맞으면 움찔 · 죽을 때(부푸는 5초)는 울부짖으며 일어섰다가 옆으로 무너져 경련한다.
   ⑪ 이륙 — 땅에서 뜰 때 웅크렸다(0.55초) 뛰어올라 크고 빠르게 치며 오른다. 높이·웅크림은 AI 의 wClimb 가
      준다(W.lift · W.vy — 이 구역 밖이라 시험장마다 따로 들어 있다).
   개체마다 쓰는 값은 W.an 에 둔다(battle 처럼 여럿이면 W 를 갈아 끼울 때 같이 바뀐다). */
const WALKSW=0.42, KNEESW=0.20, WINGSW=0.72;
const WX_XF=0.3;                               // 상태 사이 섞는 시간(초)
const _wxq=new THREE.Quaternion();
function wAnim(){
  if(!W.an) W.an={t:0, st:W.state, xt:WX_XF, snap:null, wp:Math.random()*6.283, glide:0, glT:3,
    hp:W.hp, fl:0, yaw:W.yaw, turn:0, rec:0, ly:0, lx:0, dy:0, dyT:0};
  return W.an;
}
function poseWyv(dt){
  const A=wAnim();
  if(A.st!==W.state){                          // 상태가 바뀌었다 — 지금 자세를 적어 두고 섞어 넘어간다
    if(A.st==='fbwind') A.rec=1;               // 쏜 순간 — 목을 내지른다
    A.st=W.state; A.xt=0;
    /* 출발점은 지난 프레임에 그린 자세(A.last) — 지금 뼈는 아니다. 상태를 바꾸기 전에 AI 가
       휘두를 각을 푸느라(solveClaw · solveBite) 뼈를 쉼 자세로 돌려놓아 버린다 */
    if(A.last){ if(!A.snap) A.snap=new Map(); for(const [nm,q] of A.last){ let s=A.snap.get(nm); if(!s) A.snap.set(nm,s=new THREE.Quaternion()); s.copy(q); } }
  }
  poseWyv_(dt);
  if(A.snap&&A.xt<WX_XF&&BONE){
    A.xt+=dt;
    const w=ease(Math.min(1,A.xt/WX_XF));
    /* 목표를 따로 옮겨 두고 섞는다 — slerpQuaternions(q0, 자기) 는 먼저 q0 를 자기에 복사해 버려
       섞는 내내 옛 자세에 멈췄다가 끝에 한꺼번에 튀었다 */
    for(const nm in BONE){ const q0=A.snap.get(nm); if(q0){ const q=BONE[nm].quaternion; _wxq.copy(q); q.slerpQuaternions(q0,_wxq,w); } }
  }
  if(BONE){ if(!A.last) A.last=new Map(); for(const nm in BONE){ let q=A.last.get(nm); if(!q) A.last.set(nm,q=new THREE.Quaternion()); q.copy(BONE[nm].quaternion); } }
  rebuildCaps();
  resolveHit();
}
/* 때린 것이 닿았는지는 자세를 다 잡은 뒤에 본다 — updateW 에서 바로 재면
   한 프레임 전 자세로 재게 되어, 가장 뻗은 순간을 놓친다. */
function resolveHit(){
  if(!W.pendHit) return;
  const k=W.pendHit; W.pendHit=null;
  const T=W.hitTgt||curTgt(); W.hitTgt=null;
  const claw=(k==='claw');
  const ch=claw?(W.clawSide<0?CH_ARM_L:CH_ARM_R):CH_HEAD;
  const d=chainDist(chainCaps(ch),T.cap());
  if(claw) W.lastClawD=d;
  if(d<=(claw?WP.clawPad:WP.bitePad)) T.hurt(claw?WP.clawDmg:WP.biteDmg, claw?'할퀴기':'물어뜯기');
  else msg(claw?'발톱이 허공을 갈랐다':'이빨이 허공을 물었다');
}
/* 휘두르는 곡선 — 뒤로 당겼다가(−pre) 맞는 순간(hit) 1 · 잠깐 머물고 돌아온다 */
function wSwing(t,hit,dur,pre){
  const a=hit*0.5;
  if(t<a) return -pre*ease(t/a);
  if(t<hit) return -pre+(1+pre)*easeIn((t-a)/(hit-a));
  const h2=Math.min(dur,hit+0.1);
  if(t<h2) return 1;
  return 1-ease(Math.min(1,(t-h2)/Math.max(0.05,dur-h2)));
}
const WR=(nm,ax,a)=>{ if(a) rotBone(bone(nm),ax,a); };
/* 날개 한 쌍 — up: 어깨에서 든 각(+ 위) · sweep: 앞(−)/뒤(+)로 젖힘 · open: 손목·손가락을 펴는 몫 */
function wWingPose(up,sweep,open,flapA,ph,fold){
  for(const [ch,sg] of [[CH_WING_L,-1],[CH_WING_R,1]]){
    const u=a=>a*sg;                                 // 이 쪽에서 위가 되는 부호
    const s0=Math.sin(ph), s1=Math.sin(ph-0.55), s2=Math.sin(ph-1.1), s3=Math.sin(ph-1.6);
    WR(ch[0],_AXF,u(up+s0*flapA));
    WR(ch[0],_AXU,sg*sweep);
    WR(ch[1],_AXF,u(s1*flapA*0.35));
    WR(ch[1],_AXU,-sg*open*0.35);                    // 위팔을 앞으로 내밀어 편다
    WR(ch[2],_AXF,u(s2*flapA*0.25+open*0.15));
    WR(ch[2],_AXU,sg*(fold||0));                     // 올릴 때 손목을 접어 끝을 뒤로
    WR(ch[3],_AXF,u(s3*flapA*0.18));
    WR(ch[4],_AXU,-sg*open*0.30);                    // 손가락 — 펴면 바깥으로
  }
}
/* 목·머리를 노리는 쪽으로 — 몸 기준 좌우·위아래 각을 천천히 따라간다(세 마디에 나눔) */
const _wlv=new THREE.Vector3();
function wLook(A,dt,on,down){
  let ty=0,tx=0;
  if(on){
    const T=curTgt();
    if(T&&!T.idle&&T.pt){
      bone(CH_HEAD[0]).getWorldPosition(_wlv);
      let a=Math.atan2(T.pt.x-_wlv.x,T.pt.z-_wlv.z)-W.yaw;
      while(a>Math.PI) a-=6.283; while(a<-Math.PI) a+=6.283;
      ty=clamp(a,-1.1,1.1);
      tx=clamp(Math.atan2(_wlv.y-T.pt.y,Math.hypot(T.pt.x-_wlv.x,T.pt.z-_wlv.z)),-0.6,down||0.8);
    }
  }
  const k=1-Math.exp(-4*dt);
  A.ly+=(ty-A.ly)*k; A.lx+=(tx-A.lx)*k;
  for(let i=0;i<3;i++){ WR(CH_HEAD[i],_AXU,A.ly*0.33); WR(CH_HEAD[i],_AXS,A.lx*0.3); }
}
function poseWyv_(dt){
  if(!bRig) return;
  bodyAxes();
  const A=wAnim(); A.t+=dt;
  const gy=wGround();
  bRig.position.set(W.pos.x, gy+W.y+A.dy, W.pos.z);
  bRig.rotation.y=W.yaw;
  restPose();
  if(!BONE) return;
  bRig.updateMatrixWorld(true);
  const t=A.t, k=r=>1-Math.exp(-r*dt);
  const flying=(W.state==='fly'||W.state==='spot'||W.state==='dive');
  const dead=(W.state==='dying'||W.state==='dead');
  /* 도는 빠르기 — 몸을 눕히는 데 쓴다 */
  let dyaw=W.yaw-A.yaw; while(dyaw>Math.PI) dyaw-=6.283; while(dyaw<-Math.PI) dyaw+=6.283;
  A.yaw=W.yaw; A.turn+=((dt>0?clamp(dyaw/dt,-2,2):0)-A.turn)*k(4);
  /* 맞으면 움찔 — 체력이 준 것으로 안다 */
  if(W.hp<A.hp-0.5) A.fl=1;
  A.hp=W.hp; A.fl=Math.max(0,A.fl-dt*3); A.rec=Math.max(0,A.rec-dt*2.2);
  const fl=A.fl>0?Math.sin((1-A.fl)*Math.PI)*A.fl*1.4:0;
  const rec=A.rec>0?Math.sin((1-A.rec)*Math.PI)*A.rec*1.6:0;
  let dyT=0;

  if(dead){                                      // 부풀어 오르는 5초 — 일어섰다가 옆으로 무너져 떤다
    const u=clamp((W.dieT||0)/WP.dieTime,0,1);
    const rise=ease(clamp(u/0.18,0,1))*(1-ease(clamp((u-0.22)/0.2,0,1)));
    const fall=ease(clamp((u-0.22)/0.25,0,1));
    const sh=clamp((u-0.35)/0.65,0,1);
    WR(CH_SPINE[0],_AXS,-0.5*rise+0.22*fall);
    WR(CH_SPINE[0],_AXF,0.5*fall+Math.sin(t*17)*0.03*sh);
    WR(CH_HEAD[0],_AXS,-0.55*rise+0.45*fall+Math.sin(t*9)*0.25*sh);
    WR(CH_HEAD[1],_AXU,Math.sin(t*7.3)*0.35*sh);
    WR(CH_HEAD[2],_AXS,-0.3*rise);
    wWingPose(0.45*rise-0.5*fall,0.1,rise*0.8,0.12*sh,t*9,0);
    for(const [ch,ph] of [[CH_ARM_L,0],[CH_ARM_R,1.7],[CH_LEG_L,0.8],[CH_LEG_R,2.4]]){
      WR(ch[0],_AXS,-0.35*fall+Math.sin(t*11+ph)*0.3*sh);
      WR(ch[1],_AXS,0.4*fall);
    }
    CH_TAIL.forEach((nm,i)=>{ if(i<6) WR(nm,_AXU,Math.sin(t*6-i*0.6)*(0.05+0.25*sh)*(i<3?0.6:1)); });
    dyT=-0.9*fall;
  }
  else if(flying){
    /* 이륙 — AI(wClimb)가 땅에서 뜰 때 웅크림(W.lift)을 주고 뛰어올라 오른다(W.vy).
       웅크리는 동안은 땅을 디딘 채 앞뒤 다리를 굽혀 몸을 낮추고(깊이 cd) 날개를 높이 펴 들고 고개를 든다 ·
       뛰는 순간 날개가 맨 위에서 첫 내려치기를 시작하고(A.wp) 웅크림이 0.1초에 풀린다(다리가 땅을 찬다) ·
       오르는 동안(cl) 크고 빠르게 치며 머리를 들고 · 땅 가까이(low)는 다리를 늘어뜨렸다가 높이 따라 접는다 */
    if(W.lift>0){ if(!A.lf){ A.lf=1; A.crT=0; } A.crT+=dt; A.cr=1; }
    else{ if(A.lf){ A.lf=0; A.wp=1.98; } A.cr=(A.cr||0)*Math.exp(-10*dt); }   // 1.98 — 비튼 위상이 π/2(날개 맨 위)
    const cr=A.cr||0, cd=cr*ease(Math.min(1,(A.crT||0)/0.4));
    A.cl=(A.cl||0)+(clamp((W.vy||0)/5,0,1)-(A.cl||0))*k(3);
    const cl=A.cl, low=clamp(1-(W.y-2)/10,0,1);
    /* 날갯짓 빠르기 · 폭 — 노려볼 땐 제자리에 떠 있느라 깊고 빠르다 */
    let hz=0.95, amp=0.5;
    if(W.state==='fly'){
      /* 활공 — 쳤다 미끄러졌다를 되풀이한다. 둘러보며 느리게 날 때·오를 때는 쉬지 않고 친다 */
      A.glT-=dt;
      if(A.glT<=0){ A.glide=A.glide>0.5?0:1; A.glT=A.glide?rnd(1.8,3.2):rnd(2.6,4.2); }
      if(W.scan>0||cl>0.2||cr>0.05) A.glide=0;
      A.gl=(A.gl||0)+((A.glide?1:0)-(A.gl||0))*k(1.6);
      amp*=1-0.88*A.gl;
    }
    if(W.state==='spot'){ hz=1.3; amp=0.66; }
    if(W.state==='dive'){ hz=2.2; amp=0.05; }
    else{
      /* 오를 때 — 땅 가까이선 날개가 땅을 치지 않게 폭을 줄인다 */
      hz+=(1.6-hz)*cl; amp+=(Math.min(0.85,0.55+W.y*0.05)-amp)*cl;
      amp*=1-cr;
    }
    A.wp+=dt*hz*6.2832;
    const ph=A.wp-0.45*Math.sin(A.wp);              // 내려치기가 빠르다(위상이 π 근처에서 빨리 흐른다)
    const fold=Math.max(0,Math.cos(ph))*0.45*amp;    // 올리는 동안 손목을 접는다
    if(W.state==='dive'){
      /* 내리꽂기 — 날개를 뒤로 접고 머리를 내린다 · 땅이 가까우면(5 m) 날개를 펴 버티고 다리를 내민다 */
      const f=clamp((5-W.y)/4.5,0,1);
      WR(CH_SPINE[0],_AXS,1.15*(1-f)-0.38*f);
      wWingPose(0.55*(1-f)+0.35*f,0.75*(1-f)-0.45*f,f,0.04+0.25*f,ph+t*12*(1-f),0);
      for(const ch of [CH_LEG_L,CH_LEG_R]){ WR(ch[0],_AXS,0.85*(1-f)-0.55*f); WR(ch[3],_AXS,0.7*(1-f)); }
      for(const ch of [CH_ARM_L,CH_ARM_R]){ WR(ch[1],_AXS,-0.6*f); WR(ch[2],_AXS,-0.7*(1-f)); }
      CH_TAIL.forEach((nm,i)=>{ WR(nm,_AXS,0.06*(1-f)); WR(nm,_AXU,Math.sin(t*9-i*0.7)*0.05); });
      WR(CH_HEAD[0],_AXS,-0.35*(1-f));
    }else{
      const spot=W.state==='spot', fr=1-cr;
      /* 몸 — 내려칠 때 뜨고(몸무게를 받친다) · 날갯짓에 맞춰 살짝 끄덕인다 · 도는 쪽으로 눕는다 · 오를 땐 머리를 든다 */
      dyT=-0.35*amp*Math.sin(ph-0.6)-0.6*cd;
      WR(CH_SPINE[0],_AXS,((spot?-0.18:0.04)+0.05*amp*Math.cos(ph)-0.24*cl)*fr+0.12*cd);
      WR(CH_SPINE[0],_AXF,-A.turn*0.32*fr);
      let wc=spot?-0.12:-0.24; wc+=(-0.02-wc)*cl; wc+=(0.62-wc)*cr;
      wWingPose(wc,(spot?-0.12:0.05)*fr-0.15*cr,1,amp,ph,fold);
      /* 다리 — 날 때는 뒷다리를 뒤로 붙이고 앞발을 모은다 · 노려볼 때·땅 가까이선 늘어뜨린다 ·
         웅크릴 땐 쉼 자세(땅을 디딤)에서 굽힌다(착지의 주저앉기와 같은 굽힘) */
      const dg=spot?1:low, mx=(a,b)=>a+(b-a)*dg;
      for(const [ch,i] of [[CH_LEG_L,0],[CH_LEG_R,1]]){
        const lag=Math.sin(ph-1.2+i*0.3)*0.06;
        WR(ch[0],_AXS,(mx(0.95,0.15)+lag)*fr-0.3*cd); WR(ch[1],_AXS,mx(-0.25,0.15)*fr+0.25*cd); WR(ch[3],_AXS,mx(0.75,0.45)*fr);
      }
      for(const ch of [CH_ARM_L,CH_ARM_R]){ WR(ch[1],_AXS,mx(0.2,-0.25)*fr-0.35*cd); WR(ch[2],_AXS,mx(-0.95,-0.5)*fr+0.4*cd); WR(ch[3],_AXS,mx(0.6,0.35)*fr); }
      /* 꼬리 — 물결이 뒤로 갈수록 늦게 · 노려볼 땐 늘어진다 */
      CH_TAIL.forEach((nm,i)=>{
        WR(nm,_AXU,Math.sin(t*1.3-i*0.55)*(0.03+i*0.012)+A.turn*0.05);
        WR(nm,_AXS,(spot?-0.07:0.015)-0.03*amp*Math.sin(ph-0.9-i*0.35));
      });
      /* 머리 — 몸이 끄덕이는 만큼 거슬러 앞을 지키고, 노리는 것을 본다(날 때는 아래를 훑는다) */
      WR(CH_HEAD[0],_AXS,-0.05*amp*Math.cos(ph)+0.12*cl*fr-0.3*cd);
      if(W.state==='fly'){
        W.lookPh=(W.lookPh||0)+dt*(W.scan>0?0.9:0.5);
        const sa=(W.scan>0?0.62:0.26)*fr;
        WR(CH_HEAD[0],_AXU,Math.sin(W.lookPh)*sa);
        WR(CH_HEAD[1],_AXU,Math.sin(W.lookPh*1.3)*sa*0.5);
        WR(CH_HEAD[2],_AXS,(0.18+Math.sin(W.lookPh*0.7)*0.12)*fr);
        wLook(A,dt,false);
      }else wLook(A,dt,true,1.3);
    }
  }
  else{
    /* ── 땅 위 ── 날개는 반쯤 편 채 걸음에 맞춰 일렁인다 */
    const st=W.state;
    W.walkPh+=dt*W.speed*1.9;
    const ph=W.walkPh, amt=clamp(W.speed/WP.walk,0,1.2);
    const br=Math.sin(t*1.25);                       // 숨
    let wUp=-0.18, wSw=0, wOpen=0, wFl=0;
    let look=true, lookDown=0.8;
    /* 다리 — 왼뒤 → 왼앞 → 오른뒤 → 오른앞 차례로 내딛는다(무거운 네발짐승의 걸음) */
    const legs=[[CH_LEG_L,0,0],[CH_ARM_L,Math.PI*0.5,1],[CH_LEG_R,Math.PI,0],[CH_ARM_R,Math.PI*1.5,1]];
    const stepLeg=(ch,p,front,a)=>{
      const s=Math.sin(p), c=Math.cos(p);
      const hip=s*0.36*a, lift=Math.max(0,-c)*a;     // 다리가 앞으로 가는 동안(cos<0) 들어 올린다
      if(front){
        WR(ch[1],_AXS,hip*0.9);
        WR(ch[2],_AXS,lift*0.75);
        WR(ch[3],_AXS,-hip*0.5+lift*0.7);
      }else{
        WR(ch[0],_AXS,hip);
        WR(ch[1],_AXS,-lift*0.5);
        WR(ch[2],_AXS,lift*0.8);
        WR(ch[3],_AXS,-hip*0.6+lift*0.3);
      }
    };
    if(st==='land'){
      /* 착지 — 쿵 주저앉았다가 고개를 흔들며 일어선다 */
      const u=W.t;
      const imp=Math.exp(-u*5)*Math.min(1,u*25+0.3);
      dyT=-0.75*imp-0.25*(1-ease(clamp(u/WP.landStun,0,1)));
      WR(CH_SPINE[0],_AXS,0.25*imp);
      for(const ch of [CH_LEG_L,CH_LEG_R]){ WR(ch[0],_AXS,-0.3*imp); WR(ch[1],_AXS,0.25*imp); }
      for(const ch of [CH_ARM_L,CH_ARM_R]){ WR(ch[1],_AXS,-0.35*imp); WR(ch[2],_AXS,0.4*imp); }
      const dz=clamp((u-0.25)/0.4,0,1)*(1-clamp((u-WP.landStun+0.6)/0.5,0,1));
      WR(CH_HEAD[0],_AXU,Math.sin(t*6.5)*0.32*dz);
      WR(CH_HEAD[0],_AXF,Math.sin(t*4.7)*0.18*dz);
      WR(CH_HEAD[1],_AXS,0.35*imp+0.15*dz);
      /* 날개 — 땅에 펼쳐졌다가 천천히 접는다 · 끝에 한 번 털어 낸다 */
      const opn=1-ease(clamp(u/(WP.landStun*0.8),0,1));
      const shake=clamp((u-WP.landStun+0.55)/0.55,0,1);
      wUp=-0.18-0.35*opn+Math.sin(shake*Math.PI*2)*0.25*shake; wOpen=opn; wSw=-0.2*opn;
      look=dz<0.5;
    }
    else if(st==='fbwind'){
      /* 숨 모으기 — 젖히고 목을 S 자로 당기며 날개를 들어 편다 · 끝에 떤다 */
      const u=clamp(W.t/WP.fbWind,0,1), e=ease(Math.min(1,u/0.8));
      const tr=clamp((u-0.75)/0.25,0,1)*Math.sin(t*38)*0.025;
      WR(CH_SPINE[0],_AXS,-0.55*e+tr);
      WR(CH_SPINE[2],_AXS,-0.12*e);
      WR(CH_HEAD[0],_AXS,-0.5*e); WR(CH_HEAD[1],_AXS,-0.12*e+tr); WR(CH_HEAD[2],_AXS,0.38*e);
      for(const ch of [CH_LEG_L,CH_LEG_R]) WR(ch[0],_AXS,-0.18*e);
      wUp=-0.18+0.6*e; wSw=-0.2*e; wOpen=e; wFl=0.05*e;
      CH_TAIL.forEach((nm,i)=>{ WR(nm,_AXS,0.05*e); WR(nm,_AXU,Math.sin(t*4.5-i*0.6)*0.09*e); });
      look=false;
    }
    else if(st==='claw'){
      /* 할퀴기 — 판정 자세(applyClawPose) 그대로, 진행만 당겼다 뻗었다 머물게 */
      const sw=wSwing(W.t,WP.clawHit,WP.clawDur,0.35);
      applyClawPose(W.clawSide<0?CH_ARM_L:CH_ARM_R,(W.clawAng===undefined?0.3:W.clawAng),(W.clawTw||0),sw);
      const other=W.clawSide<0?CH_ARM_R:CH_ARM_L;
      WR(other[1],_AXS,-0.15*Math.max(0,sw));           // 다른 앞발로 버틴다
      wUp=-0.18+0.2*Math.max(0,sw); wOpen=0.4*Math.max(0,sw);
      CH_TAIL.forEach((nm,i)=>WR(nm,_AXU,-(W.clawSide||1)*0.06*sw*(i<5?1:0.5)));   // 꼬리로 균형
      lookDown=1.0;
    }
    else if(st==='bite'){
      /* 물기 — 목을 뒤로 당겼다가 내지른다 */
      const sw=wSwing(W.t,WP.biteHit,WP.biteDur,0.4);
      applyBitePose(W.biteAng===undefined?0.6:W.biteAng,sw);
      for(const ch of [CH_ARM_L,CH_ARM_R]) WR(ch[1],_AXS,-0.12*Math.max(0,sw));
      wUp=-0.18+0.15*Math.max(0,sw); wOpen=0.3*Math.max(0,sw);
      look=false;
    }
    else{
      /* 걷기·서 있기 */
      for(const [ch,off,front] of legs) stepLeg(ch,ph+off,front,amt);
      dyT=0.05*amt*Math.cos(2*ph)-0.02*(1-amt)*br;
      WR(CH_SPINE[0],_AXU,0.05*amt*Math.sin(ph));
      WR(CH_SPINE[0],_AXF,0.035*amt*Math.sin(ph+0.5)+0.02*(1-amt)*Math.sin(t*0.35));
      WR(CH_SPINE[3],_AXU,-0.04*amt*Math.sin(ph));
      WR(CH_SPINE[2],_AXS,-0.025*br*(1-amt*0.5));    // 숨 — 가슴이 오르내린다
      WR(CH_HEAD[0],_AXU,-0.06*amt*Math.sin(ph));     // 머리는 흔들림을 덜어 앞을 본다
      WR(CH_HEAD[0],_AXS,-0.03*amt*Math.cos(2*ph));
      wSw=0; wFl=0.04*br;
    }
    /* 날개 — 걸음·숨에 맞춰 늦게 일렁인다(땅 위에서도 다 접지 않는다 — 덩치를 그대로 보여 준다) */
    const sway=Math.sin(ph*0.9+t*0.3)*0.12*Math.max(amt,0.25);
    wWingPose(wUp+sway+wFl,wSw,wOpen,0,0,0);
    for(const [ch,sg] of [[CH_WING_L,-1],[CH_WING_R,1]]){
      WR(ch[2],_AXF,(-0.30+sway*0.7)*(1-wOpen)*sg);     // 손목을 더 접어 둔다(펴는 동안 풀린다)
      WR(ch[1],_AXU,0.10*sg*(1-wOpen));
    }
    if(look) wLook(A,dt,true,lookDown);
  }
  /* 반동 · 움찔 — 덧붙인다 */
  if(rec){ WR(CH_HEAD[0],_AXS,0.45*rec); WR(CH_HEAD[2],_AXS,-0.2*rec); WR(CH_SPINE[0],_AXS,-0.06*rec); }
  if(fl){ WR(CH_SPINE[0],_AXS,-0.12*fl); WR(CH_HEAD[0],_AXS,-0.3*fl); WR(CH_HEAD[1],_AXU,0.2*fl); }
  /* 몸 높이 덧붙임 — 바로 따라가되 튀지 않게 */
  A.dy+=(dyT-A.dy)*k(14);
  bRig.position.y=gy+W.y+A.dy;
}

/* 사슬 하나가 어떤 점에 닿았는가 — 머리로 물고 팔로 치는 판정에 쓴다 */
function chainCaps(ch){
  const bs=ch.map(bone).filter(Boolean);
  return bs.length>1?capsFrom(bs):[];
}
/* 사람은 점이 아니라 선다 — 발끝에서 정수리까지의 통으로 잰다 */
const PL_R=0.32;
function plCap(){
  return {a:new THREE.Vector3(PL.pos.x,PL.pos.y+0.25,PL.pos.z), b:new THREE.Vector3(PL.pos.x,PL.pos.y+EYE,PL.pos.z), r:PL_R};
}
/* 선분 둘 사이의 가장 가까운 거리 */
function segSeg(p1,q1,p2,q2){
  const d1=q1.clone().sub(p1), d2=q2.clone().sub(p2), r=p1.clone().sub(p2);
  const a=d1.dot(d1), e=d2.dot(d2), f=d2.dot(r);
  let sc,tc;
  if(a<1e-9&&e<1e-9) return r.length();
  if(a<1e-9){ sc=0; tc=clamp(f/e,0,1); }
  else{
    const c=d1.dot(r);
    if(e<1e-9){ tc=0; sc=clamp(-c/a,0,1); }
    else{
      const b=d1.dot(d2), den=a*e-b*b;
      sc=den>1e-9?clamp((b*f-c*e)/den,0,1):0;
      tc=(b*sc+f)/e;
      if(tc<0){ tc=0; sc=clamp(-c/a,0,1); }
      else if(tc>1){ tc=1; sc=clamp((b-c)/a,0,1); }
    }
  }
  return p1.clone().addScaledVector(d1,sc).distanceTo(p2.clone().addScaledVector(d2,tc));
}
/* 캡슐 무리에서 표적 통까지, 껍데기 사이의 거리 (표적을 안 주면 사람) */
function chainDist(caps,T){
  const P=T||plCap(); let bd=1e9;
  for(const c of caps) bd=Math.min(bd, segSeg(c.a,c.b,P.a,P.b)-c.r-P.r);
  return bd;
}
const plPoint=()=>new THREE.Vector3(PL.pos.x, PL.pos.y+EYE*0.55, PL.pos.z);
/* 지금 노리는 것 — 본편은 사람뿐이다(아레나는 26 m 안의 집을 먼저 친다) */
function curTgt(){
  return {b:null, x:PL.pos.x, z:PL.pos.z, idle:PL.dead, cap:()=>plCap(), pt:plPoint(),
          hurt:(d,w)=>hurtPL(d,'애쉬스케일의 '+(w||'공격'),true), n:'사람'};
}
function shellGap(T){
  const t=T||curTgt();
  if(!W.caps||!W.caps.length) return Math.hypot(t.x-W.pos.x,t.z-W.pos.z)-WYV_R;
  return chainDist(W.caps,t.cap());
}
/* 얼마나 달려들어야 닿는가 — 몸을 앞으로 옮겨 보며 푼다 */
function solveLunge(maxL, solve){
  if(maxL<=1e-3){ const ang=solve(); return W.solveD<=W.solveGate?{L:0,ang}:null; }
  const fwd=new THREE.Vector3(Math.sin(W.yaw),0,Math.cos(W.yaw));
  const save=W.pos.clone();
  for(let L=0;L<=maxL+1e-6;L+=maxL/4){
    W.pos.copy(save).addScaledVector(fwd,L);
    const ang=solve();
    if(W.solveD<=W.solveGate){ W.pos.copy(save); return {L,ang}; }
  }
  W.pos.copy(save);
  return null;
}
/* 무는 자세 하나 — 목을 얼마나 숙일지만 고른다 */
function applyBitePose(a,sw){
  const nk=bone(CH_HEAD[0]); if(!nk) return;
  rotBone(bone(CH_SPINE[0]), _AXS, a*0.45*sw);
  rotBone(nk,                _AXS, a*sw);
  rotBone(bone(CH_HEAD[2]),  _AXS, a*0.55*sw);
}
function solveBite(T){
  if(!bRig) return 0.6;
  bRig.position.set(W.pos.x, wGround()+W.y, W.pos.z);
  bRig.rotation.y=W.yaw; bRig.updateMatrixWorld(true);
  let best=0.6, bd=1e9;
  for(let a=-0.6;a<=1.61;a+=0.1){
    restPose(); bodyAxes();
    applyBitePose(a,1);
    bRig.updateMatrixWorld(true);
    const d=chainDist(chainCaps(CH_HEAD),T);
    if(d<bd){ bd=d; best=a; }
  }
  restPose(); bRig.updateMatrixWorld(true);
  W.biteD=bd;
  return best;
}
/* 발톱 자세 하나 — 각을 풀 때도 실제로 그릴 때도 이것만 쓴다 */
function applyClawPose(ch,a,tw,sw){
  const sh=bone(ch[0]); if(!sh) return;
  rotBone(sh,          _AXS, a*sw);
  rotBone(bone(ch[1]), _AXS, a*0.6*sw);
  rotBone(bone(ch[2]), _AXS, -0.35*sw);
  rotBone(bone(CH_SPINE[0]), _AXU, tw*sw);
  rotBone(bone(CH_SPINE[1]), _AXS, 0.18*sw);
}
function solveClaw(ch, T){
  const sh=bone(ch[0]), e1=bone(ch[1]);
  if(!sh||!e1||!bRig) return 0.3;
  bRig.position.set(W.pos.x, wGround()+W.y, W.pos.z);
  bRig.rotation.y=W.yaw; bRig.updateMatrixWorld(true);
  let best=0, bestTw=0, bd=1e9;
  for(let a=-1.25;a<=1.26;a+=0.125)
  for(const tw of [-0.34,-0.17,0,0.17,0.34]){
    restPose(); bodyAxes();
    applyClawPose(ch,a,tw,1);
    bRig.updateMatrixWorld(true);
    const d=chainDist(chainCaps(ch),T);
    if(d<bd){ bd=d; best=a; bestTw=tw; }
  }
  W.clawTw=bestTw;
  restPose(); bRig.updateMatrixWorld(true);
  W.solveD=bd;
  return best;
}
/* 맞는 자리 — 뼈를 따라가는 캡슐. 자세를 다 잡은 뒤에 다시 잰다 */
function rebuildCaps(){
  if(!BONE||!SKROOT){ W.caps=null; return; }
  if(bRig) bRig.updateMatrixWorld(true); else SKROOT.updateMatrixWorld(true);
  const caps=[];
  const push=ch=>{ const bs=ch.map(bone).filter(Boolean); if(bs.length>1) caps.push(...capsFrom(bs)); };
  for(const ch of BODYCH) push(ch);
  for(const ch of LIMBCH) push(ch);
  W.caps=caps;
}

/* ── 화염구 — 입에서 곧게 날아가 부딪히면 터진다(빛은 발광 재질로만 — 움직이는 광원은 셰이더를 다시 짜게 한다) ── */
const FBS=[];
function mouthWorld(){
  const v=MOUTH.clone().multiplyScalar(bRig?bRig.scale.x:1);
  v.applyAxisAngle(_AXU,W.yaw);
  return v.add(new THREE.Vector3(W.pos.x, wGround()+W.y, W.pos.z));
}
function spawnFire(){
  if(!fbGeo) return;
  const o=mouthWorld();
  const aim=W.fbAim||new THREE.Vector3(PL.pos.x, PL.pos.y+EYE*0.6, PL.pos.z);   // 겨눈 자리는 숨을 모으기 시작할 때 굳었다
  const d=new THREE.Vector3(aim.x-o.x, aim.y-o.y, aim.z-o.z).normalize();
  const m=new THREE.Mesh(fbGeo, fbMat); m.userData.lightRole='none';
  m.scale.setScalar(0.62); m.position.copy(o); scene.add(m);
  FBS.push({mesh:m, dir:d, t:0, spin:rnd(-2,2)});
  mobVoice('fire',o.x,o.y,o.z,1.3);
}
function updateFB(dt){
  for(let i=FBS.length-1;i>=0;i--){
    const f=FBS[i], p=f.mesh.position;
    f.t+=dt;
    p.addScaledVector(f.dir, WP.fbSpd*dt);
    f.mesh.rotation.y+=f.spin*dt; f.mesh.rotation.x+=f.spin*0.6*dt;
    f.mesh.scale.setScalar(0.62+Math.sin(f.t*22)*0.05+Math.sin(f.t*37)*0.03);   // 일렁이게
    const hitPL=!PL.dead&&Math.hypot(p.x-PL.pos.x,p.y-(PL.pos.y+EYE*0.5),p.z-PL.pos.z)<WP.fbBlast;
    if(hitPL||p.y<=heightAt(p.x,p.z)+0.2||solidAt(p.x,p.z,p.y)||f.t>3.0){
      blast(p.clone());
      if(hitPL) hurtPL(WP.fbDmg,'애쉬스케일의 화염구',true);
      scene.remove(f.mesh); FBS.splice(i,1);
    }
  }
}
/* 터짐 — 주황 고리가 퍼지고 잠깐 불빛(불빛 풀의 대역 — 광원 수는 안 바뀐다) */
const BLASTS=[], BL_LIGHT=WYV_BL;          // 터지는 불빛 대역은 모든 개체가 나눠 쓴다(셋까지)
let ringGeo=null;
function blast(p,scale){
  if(!ringGeo){ ringGeo=new THREE.RingGeometry(0.4,0.75,24); ringGeo.rotateX(-Math.PI/2); }
  const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xff8a28,transparent:true,opacity:0.85,depthWrite:false,side:THREE.DoubleSide}));
  m.userData.lightRole='none'; m.position.copy(p); scene.add(m);
  let li=BL_LIGHT.find(l=>!l.userData.busy);
  if(!li&&BL_LIGHT.length<3){ li=LIGHT.addFire(scene,{color:0xff8a28,intensity:0,dist:26}); BL_LIGHT.push(li); }
  if(li){ li.userData.busy=true; li.position.copy(p); li.updateMatrixWorld(); }
  BLASTS.push({m,li,t:0,k:scale||1});
  const d=Math.hypot(PL.pos.x-p.x,PL.pos.z-p.z);
  if(d<40) MON.shake=Math.min(1,MON.shake+0.35*(scale||1)*(1-d/40));
  mobVoice('boom',p.x,p.y,p.z,Math.min(2,0.6+(scale||1)*0.3));
}
function updateBlasts(dt){
  for(let i=BLASTS.length-1;i>=0;i--){
    const b=BLASTS[i]; b.t+=dt;
    const u=b.t/0.5;
    if(u>=1){ scene.remove(b.m); b.m.material.dispose(); if(b.li){ b.li.intensity=0; b.li.userData.busy=false; } BLASTS.splice(i,1); continue; }
    b.m.scale.setScalar((1+u*5)*b.k);
    b.m.material.opacity=0.85*(1-u);
    if(b.li) b.li.intensity=7*(1-u)*Math.min(2,b.k);
  }
}

/* ── 거동(아레나 그대로 — 표적은 사람뿐 · 판 테두리 대신 섬) ─────────────── */
function seesPlayer(){
  if(PL.dead||PL.under) return false;
  const dx=PL.pos.x-W.pos.x, dz=PL.pos.z-W.pos.z;
  const d=Math.hypot(dx,dz);
  if(d>WP.see) return false;
  if(W.state==='fly') return true;             // 위에서는 다 내려다본다
  const dot=(dx/d)*Math.sin(W.yaw)+(dz/d)*Math.cos(W.yaw);
  return dot>Math.cos(WP.fov/2);
}
function faceTo(tx,tz,dt,rate){
  const want=Math.atan2(tx-W.pos.x, tz-W.pos.z);
  let d=want-W.yaw;
  while(d>Math.PI) d-=Math.PI*2;
  while(d<-Math.PI) d+=Math.PI*2;
  W.yaw+=clamp(d,-(rate||WP.turn)*dt,(rate||WP.turn)*dt);
}
/* 오르내리기 — 아레나 wClimb 그대로(땅에서 뜰 때 웅크렸다 뛰어올라 초당 5 m 까지 오른다) */
const WCL={crouch:0.55, leap:7, climb:5, acc:8};
function wClimb(dt,goal){
  if(W.flyK===undefined) W.flyK=1;
  if(W.y!==W.cy) W.vy=0;                       // 내리꽂기처럼 다른 데서 높이를 옮겼으면 새로 센다
  if(W.lift>0){                                // 웅크림 — 제자리에서 몸을 낮춘다
    W.lift-=dt; W.vy=0; W.flyK=0;
    if(W.lift<=0) W.vy=WCL.leap;               // 뛰어오른다
  }else if(W.y<0.05&&!(W.vy>0.01)&&goal>1){
    W.lift=WCL.crouch; W.vy=0; W.flyK=0;
  }else{
    const want=clamp((goal-W.y)*1.4,-WCL.climb,WCL.climb);
    W.vy+=clamp(want-W.vy,-WCL.acc*dt,WCL.acc*dt);
    W.y=Math.max(0,W.y+W.vy*dt);
    W.flyK+=(1-W.flyK)*(1-Math.exp(-0.9*dt));
  }
  W.cy=W.y;
}
function updateW(dt){
  W.t+=dt;
  W.fbCd=Math.max(0,W.fbCd-dt);
  W.atkCd=Math.max(0,W.atkCd-dt);
  if(W.frz>0){ W.frz-=dt; W.speed=0; return; }
  const dx=PL.pos.x-W.pos.x, dz=PL.pos.z-W.pos.z;
  const dist=Math.hypot(dx,dz)||1e-6;
  switch(W.state){
  case 'fly': {
    wClimb(dt,WP.cruise);
    const td=Math.hypot(W.target.x-W.pos.x,W.target.z-W.pos.z);
    if(td<6){ wWander(); W.scan=WP.scan; }     // 한 바퀴 돌았으면 둘러본다
    faceTo(W.target.x,W.target.z,dt,1.4);
    if(W.scan>0){ W.scan-=dt; W.speed=WP.flySpd*0.35; }
    else W.speed=WP.flySpd;
    W.speed*=W.flyK;
    W.pos.x+=Math.sin(W.yaw)*W.speed*dt;
    W.pos.z+=Math.cos(W.yaw)*W.speed*dt;
    if((W.alerted||seesPlayer())&&!PL.dead&&!PL.under){ W.alerted=true; wSet('spot'); mobVoice('wyv',W.pos.x,wGround()+W.y,W.pos.z,1.6); }
    break; }
  case 'spot': {                               // 5초 — 제자리에 멈춰 노려본다
    W.speed=0;
    faceTo(PL.pos.x,PL.pos.z,dt,2.2);
    wClimb(dt,WP.cruise+2);
    if(W.t>=WP.spotHold){ wSet('dive'); W.diveTo=new THREE.Vector3(PL.pos.x,0,PL.pos.z); mobVoice('wyv',W.pos.x,wGround()+W.y,W.pos.z,1.8); }
    break; }
  case 'dive': {                               // 머리부터 떨어진다
    const tx=W.diveTo.x, tz=W.diveTo.z;
    faceTo(tx,tz,dt,3.0);
    const hx=tx-W.pos.x, hz=tz-W.pos.z, hd=Math.hypot(hx,hz);
    W.y=Math.max(0,W.y-WP.diveSpd*dt);
    if(hd>0.4){ const step=Math.min(hd, WP.diveSpd*0.55*dt); W.pos.x+=hx/hd*step; W.pos.z+=hz/hd*step; }
    W.speed=WP.diveSpd;
    if(W.y<=0.01){
      W.y=0; wSet('land'); W.frz=WP.landStun;
      blast(new THREE.Vector3(W.pos.x,wGround()+0.2,W.pos.z),2.0);
      MON.shake=Math.min(1,MON.shake+0.7);
      if(dist<WYV_R+2.6&&!PL.dead) hurtPL(30,'애쉬스케일의 내리꽂기',true);
    }
    break; }
  case 'land':
    W.speed=0;
    if(W.t>=WP.landStun) wSet('chase');
    break;
  case 'fbwind':
    W.speed=0;
    if(W.t>=WP.fbWind){ spawnFire(); W.fbCd=WP.fbCd; wSet('chase'); }
    break;
  case 'claw':
    W.speed=0;
    lungeStep(dt, WP.clawHit);
    if(!W.hitDone && W.t>=WP.clawHit){ W.hitDone=true; W.pendHit='claw'; }
    if(W.t>=WP.clawDur) wSet('chase');
    break;
  case 'bite':
    W.speed=0;
    lungeStep(dt, WP.biteHit);
    if(!W.hitDone && W.t>=WP.biteHit){ W.hitDone=true; W.pendHit='bite'; }
    if(W.t>=WP.biteDur) wSet('chase');
    break;
  default: {                                   // chase
    const T=curTgt();
    /* 사람이 시야 밖으로 나갔으면 다시 날아오른다 — 경계도 같이 푼다 */
    if(dist>WP.see||PL.under){ W.speed=0; W.alerted=false; wSet('fly'); wWander(); break; }
    faceTo(T.x,T.z,dt,WP.turn);
    if(PL.dead){ W.speed=0; break; }
    const tdist=Math.hypot(T.x-W.pos.x,T.z-W.pos.z)||1e-6;
    const gap=shellGap(T);
    /* 쿨이 끝났으면 무조건 화염구다 — 붙어 있든 멀리 있든 먼저 쏜다 */
    if(W.fbCd<=0 && tdist<WP.fbRange){
      wSet('fbwind'); W.fbAim=T.pt.clone(); W.yaw=Math.atan2(T.x-W.pos.x, T.z-W.pos.z);
      mobVoice('wyv',W.pos.x,wGround()+3,W.pos.z,1.0);
      break;
    }
    if(gap<=WP.biteRange && W.atkCd<=0){
      W.solveGate=WP.biteSolve;
      const r=solveLunge(Math.min(WP.biteLunge,Math.max(0,gap)), ()=>{ W.biteAng=solveBite(T.cap()); W.solveD=W.biteD; return W.biteAng; });
      if(r){ W.biteAng=r.ang; W.lunge=r.L; W.hitTgt=T; W.atkCd=WP.biteCd; W.aimPt=T.pt; wSet('bite'); break; }
    }
    if(gap<=WP.clawRange && W.atkCd<=0){
      const L=bRig.worldToLocal(T.pt.clone());
      W.clawSide=(L.x<0?-1:1);
      W.solveGate=WP.clawSolve;
      const ch=W.clawSide<0?CH_ARM_L:CH_ARM_R;
      const r=solveLunge(Math.min(WP.clawLunge,Math.max(0,gap)), ()=>solveClaw(ch, T.cap()));
      if(r){ W.clawAng=r.ang; W.lunge=r.L; W.hitTgt=T; W.atkCd=WP.clawCd; W.aimPt=T.pt; wSet('claw'); break; }
    }
    if(gap<=WP.biteRange){ W.speed=0; break; }
    /* 걷기 — 깊은 물에는 안 들어간다(날아오른다) */
    const nx=W.pos.x+Math.sin(W.yaw)*WP.walk*dt, nz=W.pos.z+Math.cos(W.yaw)*WP.walk*dt;
    if(heightAt(nx,nz)<-1.2){ W.speed=0; wSet('fly'); wWander(); break; }
    W.speed=WP.walk; W.pos.x=nx; W.pos.z=nz;
    break; }
  }
  const lim=HALF-60;
  W.pos.x=clamp(W.pos.x,-lim,lim); W.pos.z=clamp(W.pos.z,-lim,lim);
}

/* ── 죽음 — 배부터 달아오르며 부풀다(5초) 터진다 ── */
function startDying(){
  W.alive=false; wSet('dying'); W.dieT=0; W.boom=0; if(W.entry) W.entry.dead=true;   // 그날 명단에서 빠진다
  mobRegister({prox:PROX},false);
  mobVoice('wyv',W.pos.x,wGround()+3,W.pos.z,2);
  msg('애쉬스케일이 부풀어 오른다 — 물러나라!');
}
function updateDying(dt){
  W.dieT+=dt;
  const u=clamp(W.dieT/WP.dieTime,0,1);
  W.boom=u;
  if(bMat&&bMat.userData.sh) bMat.userData.sh.uniforms.uBoom.value=u;
  if(bRig) bRig.scale.setScalar(bScale*(1+u*u*0.38));   // 부푼다
  if(u>=1) explodeWyv();
}
function explodeWyv(){
  const p=new THREE.Vector3(W.pos.x, wGround()+WYV_H*0.55, W.pos.z);
  blast(p,6.5); blast(p.clone().setY(p.y+2.4),4.5);
  MON.shake=1;
  const d=Math.hypot(PL.pos.x-p.x,PL.pos.z-p.z);
  if(d<WP.boomR&&!PL.dead) hurtPL(WP.boomDmg*(1-d/WP.boomR),'애쉬스케일이 터졌다',true);
  if(bRig) bRig.visible=false; if(blob) blob.visible=false;
  if(bMat&&bMat.userData.sh) bMat.userData.sh.uniforms.uBoom.value=0;
  if(bRig) bRig.scale.setScalar(bScale);
  wyvLoot(W.pos.x,W.pos.z);
  wSet('boom');
}
/* 잔해 — 터진 자리에서 뒤진다(다른 몹 사체와 같은 줍기 · 90초 뒤 거둔다) */
function wyvLoot(x,z){
  const key='M'+(++MON.seq), y=heightAt(x,z);
  const pick={kind:'mobloot', x, y, z, ay:y+0.6, r:2.2, key, mob:'wyv',
    lootFn:()=>{ let s=''; for(const [id,n] of MOB_LOOT.wyv){ if(!ITEMS[id]) continue; let g=0; for(let k=0;k<n;k++) if(invAdd(id,1)) g++; if(g) s+=(s?' · ':'')+ITEMS[id].n+' +'+g; }
      const i=MON.picks.indexOf(pick); if(i>=0) MON.picks.splice(i,1); return s||'가방이 가득 찼다'; }};
  MON.picks.push(pick); W.pick=pick;
  toast('애쉬스케일을 쓰러뜨렸다 — 터진 자리를 뒤지면 무엇인가 나온다');
}

/* ── 맞는 공 — 캡슐을 따라 1 m 마다 공 하나(본편 무기 판정 CREATURES 에 건다). 몸 하나라 한 프레임에 여럿이 맞으면 가장 큰 것만 ── */
const NPROX=72, SAMP=[], SAMPR=[], PROX=[];
let sampN=0;
function wyvHurt(d){
  if(!W.alive||!(d>0)) return;
  W.hp-=d; W.flash=1; W.alerted=true;
  if(W.state==='fly') wSet('spot');           // 맞으면 바로 노려본다
  MON.shake=Math.min(1,MON.shake+0.1); ATK.hitStop=0.06;
  mobVoice('hurt',W.pos.x,wGround()+W.y+2,W.pos.z,1.3);
  if(W.hp<=0){ W.hp=0; startDying(); }
}
function makeProx(i){
  const o={r:0.6, fish:false, _m:W, burn:null, fireproof:true};   // 불에 안 탄다(setBurn — 74-icons-guns.js)
  Object.defineProperty(o,'x',{get:()=>SAMP[i].x}); Object.defineProperty(o,'z',{get:()=>SAMP[i].z});
  Object.defineProperty(o,'y',{get:()=>SAMP[i].y-1.0});   // rayCreature 가 y+1 을 가운데로 친다
  Object.defineProperty(o,'r',{get:()=>SAMPR[i]||0.6});
  Object.defineProperty(o,'hp',{get:()=>(W.alive&&i<sampN)?W.hp:0, set:v=>{ if(!W.alive||i>=sampN) return; let d=W.hp-v;
    if(W.dF===MON.frame){ const x=Math.max(0,d-W.dMax); W.dMax=Math.max(W.dMax,d); d=x; } else { W.dF=MON.frame; W.dMax=d; }
    wyvHurt(d); }});
  Object.defineProperty(o,'stun',{get:()=>0, set:v=>{ if(v>0) W.frz=Math.max(W.frz,v); }});
  Object.defineProperty(o,'alerted',{get:()=>!!W.alerted, set:v=>{ if(v) W.alerted=true; }});
  return o;
}
function sampleCaps(){
  sampN=0;
  if(!W.caps) return;
  for(const c of W.caps){ const len=c.a.distanceTo(c.b), n=Math.max(1,Math.round(len/1.0));
    for(let k=0;k<n&&sampN<NPROX;k++){ SAMP[sampN].copy(c.a).lerp(c.b,(k+0.5)/n); SAMPR[sampN]=c.r+len/n*0.5; sampN++; } }
}
/* ── 사람을 몸 밖으로 민다 — 뼈 캡슐을 벽으로(아레나 pushOutOfWyv) ── */
function pushOut(){
  if(!W.alive||!W.caps||!W.caps.length||PL.dead) return;
  const lo=PL.pos.y+0.25, hi=PL.pos.y+EYE;
  for(let it=0; it<2; it++){
    let mx=0, ox=0, oz=0;
    for(const c of W.caps){
      const len=c.a.distanceTo(c.b), n=Math.max(1,Math.ceil(len/Math.max(0.2,c.r)));
      for(let i=0;i<=n;i++){
        const t=i/n, qy=c.a.y+(c.b.y-c.a.y)*t;
        if(qy<lo-c.r||qy>hi+c.r) continue;
        const qx=c.a.x+(c.b.x-c.a.x)*t, qz=c.a.z+(c.b.z-c.a.z)*t;
        const dx=PL.pos.x-qx, dz=PL.pos.z-qz, d=Math.hypot(dx,dz), R=c.r+PL_R;
        if(d>=R) continue;
        const pen=R-d;
        if(pen>mx){ mx=pen; if(d>1e-4){ ox=dx/d; oz=dz/d; } else { ox=Math.sin(W.yaw+1.57); oz=Math.cos(W.yaw+1.57); } }
      }
    }
    if(mx<=0) break;
    PL.pos.x+=ox*mx; PL.pos.z+=oz*mx;
    const into=PL.vel.x*ox+PL.vel.z*oz;
    if(into<0){ PL.vel.x-=into*ox; PL.vel.z-=into*oz; }
  }
}

/* ── 만들기 · 세우기 · 거두기 ── */
/* 달아오르는 살 — 배부터 빨강→주황→노랑으로 번지고, 그 경계는 들쭉날쭉하다(아레나 patchEmber 그대로 · 본편은 캐시 열쇠를 따로 준다) */
function patchEmber(mat){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uBoom={value:0};
    mat.userData.sh=sh;
    sh.vertexShader='varying vec3 vObj;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  vObj = position;');
    sh.fragmentShader='varying vec3 vObj;\nuniform float uBoom;\n'
      +'float eHash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }\n'
      +'float eNoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n'
      +'  float a=eHash(i), b=eHash(i+vec3(1,0,0)), c=eHash(i+vec3(0,1,0)), d=eHash(i+vec3(1,1,0));\n'
      +'  float e=eHash(i+vec3(0,0,1)), g=eHash(i+vec3(1,0,1)), h2=eHash(i+vec3(0,1,1)), k=eHash(i+vec3(1,1,1));\n'
      +'  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h2,k,f.x),f.y), f.z); }\n'
      +sh.fragmentShader.replace('#include <dithering_fragment>',
      `#include <dithering_fragment>
       if(uBoom > 0.001){
         vec3 belly = vec3(0.0, 0.55, 0.60);
         float d = distance(vObj, belly);
         float n = eNoise(vObj*3.1)*0.42 + eNoise(vObj*9.7)*0.16;
         float front = uBoom*3.30 - (d + n);
         if(front > 0.0){
           float t = clamp(front/1.15, 0.0, 1.0);
           vec3 hot = mix(vec3(0.80,0.05,0.01), vec3(1.00,0.38,0.03), smoothstep(0.0,0.55,t));
           hot = mix(hot, vec3(1.00,0.90,0.26), smoothstep(0.55,1.0,t));
           float m = clamp(front*4.0, 0.0, 1.0);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, hot, m);
           gl_FragColor.rgb += hot * pow(uBoom,4.0) * 0.8 * m;
         }
       }`);
  };
  mat.customProgramCacheKey=()=>'wyvEmber';
}
function build(){
  if(bRig) return;
  bMat=new THREE.MeshLambertMaterial({map:S.tex,side:THREE.DoubleSide,skinning:true});   // 개체마다 — 맞은 빛 · 달아오름이 따로다
  patchEmber(bMat);
  bScale=S.scale;
  /* 크기는 껍데기가 아니라 바깥 마디(bRig)에 준다 — 껍데기를 직접 키우면 뼈까지 같이 커져 살이 두 번 늘어난다 */
  bRig=new THREE.Group(); bRig.scale.setScalar(bScale); bRig.visible=false; bRig.userData.lightRole='recv'; scene.add(bRig);
  const skin=wyvSkinClone(S.skin);                                       // 뼈는 개체마다(기하 · 역묶음 행렬은 나눠 쓴다)
  bMesh=new THREE.SkinnedMesh(S.geo,bMat); bMesh.frustumCulled=false;
  bRig.add(bMesh); bRig.add(skin.root); bRig.updateMatrixWorld(true);
  bMesh.bind(new THREE.Skeleton(skin.bones,skin.boneInverses), new THREE.Matrix4());
  BONE=skin.byName; SKROOT=skin.root;
  bindLimbs(); fitBoneRadii(S.geo,skin);
  fbGeo=S.fbGeo; fbMat=S.fbMat;
  blob=mobBlob(4.6);
  for(let i=0;i<NPROX;i++){ SAMP.push(new THREE.Vector3()); SAMPR.push(0.6); PROX.push(makeProx(i)); }
}
function hide(){
  W.active=false; W.alive=false; mobRegister({prox:PROX},false);
  if(bRig) bRig.visible=false; if(blob) blob.visible=false;
  for(const f of FBS) scene.remove(f.mesh); FBS.length=0;
  for(const b of BLASTS){ scene.remove(b.m); b.m.material.dispose(); if(b.li){ b.li.intensity=0; b.li.userData.busy=false; } } BLASTS.length=0;
}
function reset(){
  hide(); W.entry=null;
  if(W.pick){ const i=MON.picks.indexOf(W.pick); if(i>=0) MON.picks.splice(i,1); W.pick=null; }
}
/* 세우기 — 그날 명단(97-mobs.js mobRoster)의 한 자리. 상공 순항 고도에 나타난다 · hp 는 앞서 다쳤으면 그 값 */
function spawn(x,z,hp,entry){
  W.active=true; W.alive=true; W.hp=hp>0?Math.min(hp,W.hpMax):W.hpMax; W.frz=0; W.alerted=false; W.flash=0; W.an=null; W.caps=null; W.entry=entry||null;
  W.pos.set(x,0,z); W.y=WP.cruise; W.cy=W.y; W.vy=0; W.lift=0; W.flyK=1; W.fbCd=0; W.atkCd=0; W.dieT=0; W.boom=0; W.pendHit=null;
  W.yaw=Math.atan2(PL.pos.x-x,PL.pos.z-z); wWander(); wSet('fly');
  if(bRig){ bRig.scale.setScalar(bScale); bRig.visible=true; }
  if(bMat&&bMat.userData.sh) bMat.userData.sh.uniforms.uBoom.value=0;
  mobRegister({prox:PROX},true);
  mobVoice('wyv',x,h(x,z)+W.y,z,1.2);
}
/* 매 프레임 — 세워진 개체만(97-mobs.js updateMobs → wyvTick). 거두기(멀어짐 · 몬스터 끔)는 명단 쪽이 정한다 */
function tick(dt){
  if(!bRig||!W.active) return;
  const dP=Math.hypot(W.pos.x-PL.pos.x,W.pos.z-PL.pos.z);
  /* 터지고 2초 · 잔해는 90초 뒤 거둔다 */
  if(!W.alive&&W.state==='boom'){ W.t+=dt; if(W.t>2){ wSet('dead'); } updateFB(dt); updateBlasts(dt); return; }
  if(!W.alive&&W.state==='dead'){ W.t+=dt; if(W.t>90){ reset(); } updateBlasts(dt); return; }
  if(W.alive) updateW(dt); else if(W.state==='dying') updateDying(dt);
  updateFB(dt); updateBlasts(dt);
  poseWyv(dt);                                 // 몸 자리 · 캡슐 · 때린 것 판정까지
  sampleCaps(); pushOut();
  W.flash=Math.max(0,W.flash-dt*5);
  bMat.emissive.setRGB(W.flash*0.5,0,0);
  const gy=wGround();
  blob.visible=bRig.visible; blob.position.set(W.pos.x,gy+0.06,W.pos.z);
  blob.scale.setScalar(9.2*(1+clamp(W.y/WP.cruise,0,1)*1.2));     // 높이 뜰수록 넓어진다
  if(W.alive&&(W.voiceT-=dt)<0){ W.voiceT=7+Math.random()*9; if(dP<160) mobVoice(W.state==='fly'?'flap':'wyv',W.pos.x,gy+W.y+2,W.pos.z,0.7); }
}
return {kind:'wyv', W, WP, build, hide, reset, tick, spawn, PROX};
}
/* 나눠 쓰는 것 — 모델(기하 · 그림 · 뼈 틀 · 역묶음 행렬)은 한 번만 풀고, 개체는 뼈만 복제한다 */
const WYV_BL=[];
let WYV_S=null;
const WYVS=[];                                 // 개체 둘 — 한 자리에 둘까지 선다(명단엔 더 있어도 가까운 둘만 몸을 입는다)
function wyvSkinClone(sk){
  const map=new Map();
  const rec=b=>{ const n=new THREE.Bone(); n.name=b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale);
    map.set(b,n); for(const c of b.children) if(c.isBone) n.add(rec(c)); return n; };
  const root=rec(sk.root), bones=sk.bones.map(b=>map.get(b)||b.clone()), byName={};
  for(const b of bones) byName[b.name]=b;
  return {root, bones, boneInverses:sk.boneInverses, byName};
}
function wyvShared(){
  if(WYV_S) return WYV_S;
  const {geometry,textureURL,skin}=parseGLB_mob(mobB64(WYV_GLB));
  const tex=new THREE.TextureLoader().load(textureURL); tex.flipY=false;
  geometry.computeBoundingBox(); const bb=geometry.boundingBox;
  const F=parseGLB_mob(mobB64(WYV_FB_GLB)), ft=new THREE.TextureLoader().load(F.textureURL); ft.flipY=false;
  /* 화염구 — 하나를 모든 개체가 나눠 쓴다 · 주황 발광으로 어두운 데서도 빛난다 */
  const fbMat=new THREE.MeshLambertMaterial({map:ft, emissive:new THREE.Color(0xff6a18), emissiveIntensity:1.0, side:THREE.DoubleSide});
  { const w=new THREE.Mesh(F.geometry,fbMat); w.visible=false; w.userData.lightRole='none'; scene.add(w); }   // 셰이더 미리 짜기가 보게 숨겨 둔다(첫 화염구에 멈칫하지 않게)
  return WYV_S={geo:geometry, tex, skin, scale:4.4/(bb.max.y-bb.min.y), fbGeo:F.geometry, fbMat};
}
function wyvBuild(){ try{ const S=wyvShared(); while(WYVS.length<2){ const w=wyvMake(S); w.build(); WYVS.push(w); } }catch(e){ console.error('[애쉬스케일]',e); } }
function wyvReset(){ for(const w of WYVS) w.reset(); }
function wyvTick(dt){ for(const w of WYVS) if(w.W.active) w.tick(dt); }
