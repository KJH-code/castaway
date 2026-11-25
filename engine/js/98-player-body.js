/* ==========================================================================
   사람 몸 · 3인칭(사용자 요청 2026-11-11 — '캐릭터 메시로 3인칭 · 검은 반들 바지 · 흰 천 셔츠 · 흰 살갗(만화처럼)')
   모형: 사용자 Meshy FBX(meshes/player/Player1.fbx — 레포 밖) → `node tools/player-mesh.mjs` → data-player-mesh.js(PLAYER_MESH)
   · 뼈 17 · 무게 둘 · 재질 셋(0 바지 · 1 셔츠 · 2 살갗) · 셔츠 결 uv(상자 투영 · 미터)
   · 몸짓은 미리 짠 동작이 아니라 **목표 방향**으로 짓는다 — 팔·다리 마디마다 '어느 쪽을 가리켜라'를 정하면 위팔→아래팔 차례로
     돌림을 구한다(`pbAim`). 걷기·달리기(걸음 위상은 간 거리로) · 앉아 걷기 · 무릎 꿇기(앉아 멈춤 · 따기) · 구르기(돌진) · 뛰기 ·
     헤엄 · 벼랑 오르기 · 주먹(P 오른 · O 왼) · 든 것(총 겨누기 · 휘두르기 · 캐기 · 먹기 · 횃불 들기)
   · 발은 땅에 붙인다 — 다리 각에서 엉덩이 높이를 센다(디딘 발 · 꿇은 무릎 가운데 가장 낮은 곳이 땅)
   · 3인칭 카메라는 **그릴 때만** 옮긴다(`tpvBegin`/`tpvEnd` — renderFrame 이 부른다). 놀이(겨누기 · 캐기 · 줍기 · 짓기)는
     그대로 1인칭 눈에서 잰다 — 카메라를 어깨 뒤에서 1인칭 시선의 14 m 앞 점을 보게 두어 화면 가운데가 같은 곳을 가리킨다.
   · 시점 바꾸기 K(`view`) · 저장 'castaway.view' · 조준경을 들여다보는 동안 · 사람이 땅에 서기 전엔 1인칭
   ========================================================================== */
const TPV={on:true, d:0, dWant:3.3, side:0.5, up:0.3, aim:14};
try{ TPV.on=localStorage.getItem('castaway.view')!=='1p'; }catch(e){}
const PB={built:false, rig:null, mesh:null, line:null, bone:{}, rest:{}, dir:{}, hold:null, holdId:undefined, holdFx:null,
  t:0, ph:0, lunge0:0, roll:-1, punch:null, chop:0, cur:null, tg:null, Lt:0.22, Ls:0.19, footH:0.11, hip0:0.52, shT:0};

/* ── 재질 ── */
function pbWeave(){                                    // 흰 천 — 평직 결(실이 엇갈려 지나간다) · 아주 옅게
  const N=64, cv=document.createElement('canvas'); cv.width=cv.height=N;
  const g=cv.getContext('2d'), im=g.createImageData(N,N);
  let r=7; const rnd=()=>((r=(r*1664525+1013904223)>>>0)/4294967296);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const cx=x%4, cy=y%4, over=(((x>>2)+(y>>2))&1)===0;
    const th=over?Math.cos((cy-1.5)/2*Math.PI*0.9):Math.cos((cx-1.5)/2*Math.PI*0.9);   // 실 가운데가 밝다
    const v=Math.round(255*(0.84+0.13*th+0.03*rnd()));
    const o=(y*N+x)*4; im.data[o]=im.data[o+1]=v; im.data[o+2]=Math.min(255,v+2); im.data[o+3]=255;
  }
  g.putImageData(im,0,0);
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1/0.035,1/0.035);   // 결 한 칸 3.5 cm(uv 는 미터)
  t.anisotropy=4; return t;
}
function pbMats(){
  return [
    new THREE.MeshPhongMaterial({color:0x111114, specular:0xc4c4cc, shininess:110, skinning:true}),   // 바지 — 검고 반들(신발까지)
    new THREE.MeshLambertMaterial({color:0xf4f4f0, map:pbWeave(), skinning:true}),                    // 셔츠 — 흰 천
    new THREE.MeshLambertMaterial({color:0xffffff, emissive:0x2e2e2e, skinning:true}),                // 살갗 — 하얗고 납작하게(만화)
  ];
}
/* 만화 테두리 — 같은 몸을 법선 쪽으로 1.1 cm 부풀려 뒷면만 검게(뒤집은 껍데기). 기본 재질은 환경 지도가 없으면 법선을 안 세므로 직접 굴린다 */
function pbLineMat(){
  const m=new THREE.MeshBasicMaterial({color:0x121214, side:THREE.BackSide, skinning:true});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uOut={value:0.011};
    sh.vertexShader='uniform float uOut;\n'+sh.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
  vec3 oN=normal;
  #ifdef USE_SKINNING
    mat4 sM=skinWeight.x*boneMatX+skinWeight.y*boneMatY+skinWeight.z*boneMatZ+skinWeight.w*boneMatW;
    sM=bindMatrixInverse*sM*bindMatrix; oN=(sM*vec4(oN,0.0)).xyz;
  #endif
  transformed+=normalize(oN)*uOut;`);
  };
  m.customProgramCacheKey=()=>'pbLine';
  return m;
}

/* ── 짓기 ── */
function pbBuild(){
  if(PB.built) return true;
  if(typeof PLAYER_MESH==='undefined'||typeof scene==='undefined'||!scene) return false;
  try{
    const D=PLAYER_MESH, nv=D.nv, raw=Uint8Array.from(atob(D.b),c=>c.charCodeAt(0)), buf=raw.buffer;
    const pb=(nv*6+3)&~3, nb=(nv*3+3)&~3, ub=nv*4, sb=nv*4;
    const q=new Uint16Array(buf,0,nv*3), nq=new Int8Array(buf,pb,nv*3), uq=new Uint16Array(buf,pb+nb,nv*2);
    const si=new Uint8Array(buf,pb+nb+ub,nv*4), sw=new Uint8Array(buf,pb+nb+ub+sb,nv*4);
    const ix=D.i32?new Uint32Array(buf,pb+nb+ub+sb*2,D.nt*3):new Uint16Array(buf,pb+nb+ub+sb*2,D.nt*3);
    const pos=new Float32Array(nv*3), nrm=new Float32Array(nv*3), uv=new Float32Array(nv*2);
    for(let i=0;i<nv*3;i++){ const k=i%3; pos[i]=D.mn[k]+q[i]/65535*(D.mx[k]-D.mn[k]); nrm[i]=nq[i]/127; }
    for(let i=0;i<nv*2;i++) uv[i]=uq[i]/65535*4-2;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
    geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geo.setAttribute('skinIndex',new THREE.BufferAttribute(new Uint8Array(si),4));
    geo.setAttribute('skinWeight',new THREE.BufferAttribute(new Uint8Array(sw),4,true));
    geo.setIndex(new THREE.BufferAttribute(ix,1));
    for(const [st,cnt,m] of D.groups) geo.addGroup(st,cnt,m);
    geo.computeBoundingSphere();
    /* 뼈 — 쉼 자세는 돌림 없이 자리만(그래서 마디 방향 = 세계 방향) */
    const bones=[], R={};
    for(const [n,p,at] of D.bones){
      const b=new THREE.Bone(); b.name=n; PB.bone[n]=b; R[n]=new THREE.Vector3(at[0],at[1],at[2]);
      if(p){ b.position.copy(R[n]).sub(R[p]); PB.bone[p].add(b); } else b.position.copy(R[n]);
      bones.push(b);
    }
    PB.rest=R;
    const rig=new THREE.Group(); rig.name='playerBody';
    const mesh=new THREE.SkinnedMesh(geo,pbMats()); mesh.frustumCulled=false;
    rig.add(mesh); rig.add(PB.bone.hips); rig.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    const line=new THREE.SkinnedMesh(geo,pbLineMat()); line.frustumCulled=false; line.userData.lightRole='none';
    line.bind(mesh.skeleton,mesh.bindMatrix); rig.add(line);
    /* 마디의 쉼 방향 — 목표 방향으로 돌릴 때 쓴다 */
    const d=(a,b)=>new THREE.Vector3().subVectors(b,a).normalize();
    const toe=s=>new THREE.Vector3(...D.toe[s]), tip=s=>new THREE.Vector3(...D.hand[s]);
    for(const s of ['L','R']){
      PB.dir['upperArm'+s]=d(R['upperArm'+s],R['foreArm'+s]); PB.dir['foreArm'+s]=d(R['foreArm'+s],R['hand'+s]);
      PB.dir['hand'+s]=d(R['hand'+s],tip(s));
      PB.dir['thigh'+s]=d(R['thigh'+s],R['shin'+s]); PB.dir['shin'+s]=d(R['shin'+s],R['foot'+s]); PB.dir['foot'+s]=d(R['foot'+s],toe(s));
    }
    PB.Lt=R.thighR.distanceTo(R.shinR); PB.Ls=R.shinR.distanceTo(R.footR); PB.footH=R.footR.y; PB.hip0=R.hips.y;
    /* 손에 든 것 — 주먹 가운데(손목 → 손끝의 0.42) */
    PB.hold=new THREE.Group(); PB.hold.position.copy(tip('R')).sub(R.handR).multiplyScalar(0.42); PB.bone.handR.add(PB.hold);
    rig.visible=false;
    PB.rig=rig; PB.mesh=mesh; PB.line=line; scene.add(rig);
    PB.cur=pbPose(); PB.tg=pbPose();
    PB.built=true;
  }catch(e){ console.error('[사람 몸]',e); PB.built=false; PB.failed=true; }
  return PB.built;
}

/* ── 자세 — 팔: [앞으로 든 각(아래 0 · 앞 π/2 · 위 π), 바깥으로 벌린 각, 팔꿈치 굽힘] · 다리: [허벅지 앞 각, 벌린 각, 무릎 굽힘] ── */
function pbPose(){ return {lean:0, twist:0, side:0, hipY:0, autoH:1, roll:0, head:0, headY:0, chest:0, armR:[0.05,0.12,0.2], armL:[0.05,0.12,0.2], legR:[0,0.04,0.05], legL:[0,0.04,0.05], footR:0, footL:0}; }
const _pbV=new THREE.Vector3(), _pbV2=new THREE.Vector3(), _pbQ=new THREE.Quaternion(), _pbQ2=new THREE.Quaternion(), _pbM=new THREE.Matrix4(),
      _pbX=new THREE.Vector3(), _pbY=new THREE.Vector3(), _pbZ=new THREE.Vector3(), _pbE=new THREE.Euler();
/* 앞 각 p · 벌린 각 o 의 방향(몸 쪽 좌표 — 앞 −Z · 위 +Y · 몸의 오른쪽 +X) */
function pbDir(p,o,side,out){ const c=Math.cos(o); return out.set(side*Math.sin(o),-Math.cos(p)*c,-Math.sin(p)*c); }
/* 두 마디를 목표 방향으로 — 위 마디 b1 은 g1 을, 아래 마디 b2 는 g2 를(둘 다 b1 의 부모 좌표) */
function pbAim(b1,b2,r1,r2,g1,g2){
  b1.quaternion.setFromUnitVectors(r1,g1);
  _pbQ.copy(b1.quaternion).invert(); _pbV2.copy(g2).applyQuaternion(_pbQ).normalize();
  b2.quaternion.setFromUnitVectors(r2,_pbV2);
}

/* ── 이 프레임의 목표 자세 ── */
function pbTarget(dt){
  const T=PB.tg, t=PB.t, v=PL.vel, sp=Math.hypot(v.x,v.z);
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw), fwd=v.x*fx+v.z*fz;
  Object.assign(T,{lean:0.02, twist:0, side:0, hipY:0, autoH:1, roll:0, head:clamp(PL.pitch,-0.9,0.7)*0.55, headY:0, chest:0});
  const A=(a,p,o,e)=>{ a[0]=p; a[1]=o; a[2]=e; }, L=(l,p,o,k)=>{ l[0]=p; l[1]=o; l[2]=k; };
  const breath=Math.sin(t*1.7);
  A(T.armR,0.06+0.02*breath,0.13,0.22); A(T.armL,0.06+0.02*breath,0.13,0.22);
  L(T.legR,0,0.04,0.06); L(T.legL,0,0.04,0.06); T.lean=0.02+0.01*breath;
  const held=weaponFxId&&ITEMS[weaponFxId]?ITEMS[weaponFxId]:null, HT=held&&held.tool||{};
  const swimming=PL.swim, air=!PL.grounded&&!swimming&&!(typeof WALL!=='undefined'&&WALL.on);
  /* 걸음 위상 — 간 거리로(프레임과 상관없이) · 뒷걸음이면 거꾸로 */
  const a=clamp(sp/WALK,0,1.8), run=clamp((sp-WALK)/(RUN-WALK),0,1);
  if(PL.grounded&&!swimming) PB.ph+=(fwd<-0.3?-1:1)*sp*dt/(0.62+0.09*sp)*Math.PI;
  const s=Math.sin(PB.ph), c=Math.cos(PB.ph);
  const kneeling=PL.grounded&&!swimming&&((PL.crouch&&sp<0.4)||(typeof GATHER!=='undefined'&&GATHER.on));

  if(PL.dead){                                                       // 쓰러짐 — 등을 대고 눕는다
    T.lean=-1.5; T.hipY=-0.30; T.autoH=0; A(T.armR,0.4,0.9,0.3); A(T.armL,0.3,0.8,0.5); L(T.legR,0.15,0.1,0.2); L(T.legL,0.05,0.12,0.1);
  }else if(typeof WALL!=='undefined'&&WALL.on){                      // 벼랑에 매달려 오르기
    const w=Math.sin(t*5);
    A(T.armR,2.75+0.25*w,0.25,0.5); A(T.armL,2.75-0.25*w,0.25,0.5); L(T.legR,0.7+0.35*w,0.12,1.2); L(T.legL,0.7-0.35*w,0.12,1.2);
    T.lean=-0.1; T.autoH=0;
  }else if(swimming){                                                // 헤엄 — 몸을 눕히고 발차기 · 평영 팔
    const k=Math.sin(t*7), st=t*2.4;
    T.lean=sp>0.3?1.25:0.35; T.autoH=0; T.hipY=0.1; T.head=sp>0.3?-0.9:T.head;
    L(T.legR,0.15+0.3*k,0.1,0.35); L(T.legL,0.15-0.3*k,0.1,0.35);
    const sw=0.5+0.5*Math.sin(st);
    A(T.armR,sp>0.3?2.9-1.2*sw:0.9+0.3*Math.sin(t*2),0.25+0.9*sw,0.5); A(T.armL,sp>0.3?2.9-1.2*sw:0.9-0.3*Math.sin(t*2),0.25+0.9*sw,0.5);
  }else if(air){                                                     // 뛰기 — 오를 땐 무릎을 당기고 내릴 땐 편다
    const u=clamp(v.y/6,-1,1), up=Math.max(0,u), dn=Math.max(0,-u);
    L(T.legR,0.25+0.75*up+0.1*dn,0.08,0.45+0.9*up); L(T.legL,0.1+0.25*up,0.08,0.25+0.45*up+0.2*dn);
    A(T.armR,0.45+0.6*up,0.35+0.5*dn,0.5); A(T.armL,0.45+0.6*up,0.35+0.5*dn,0.5); T.autoH=0; T.lean=0.08*up;
  }else if(kneeling){                                                // 무릎 꿇기 — 오른 무릎을 땅에
    L(T.legR,0.05,0.06,1.6); L(T.legL,1.4,0.06,1.4); T.lean=0.18; T.footR=-1.0;
    A(T.armR,0.5,0.1,0.6); A(T.armL,0.95,0.05,1.3);
    if(typeof GATHER!=='undefined'&&GATHER.on){ const g=Math.sin(t*6); A(T.armR,0.95+0.12*g,0.0,0.25+0.1*g); T.lean=0.4; T.head-=0.4; }
  }else if(PL.crouch){                                               // 앉아 걷기
    L(T.legR,0.95+0.38*s,0.08,1.45+0.45*Math.max(0,c)); L(T.legL,0.95-0.38*s,0.08,1.45+0.45*Math.max(0,-c));
    T.lean=0.38; A(T.armR,0.55-0.25*s,0.15,0.8); A(T.armL,0.55+0.25*s,0.15,0.8);
  }else if(sp>0.3){                                                  // 걷기 · 달리기
    const sw=0.42+0.3*run, kn=0.55+0.9*run;
    L(T.legR,a*sw*s,0.04,0.08+kn*Math.max(0,c)*Math.min(1,a)); L(T.legL,-a*sw*s,0.04,0.08+kn*Math.max(0,-c)*Math.min(1,a));
    const as=a*(0.35+0.25*run), el=0.25+1.1*run;
    A(T.armR,0.08-as*s,0.14,el); A(T.armL,0.08+as*s,0.14,el);
    T.lean=0.05*a+0.14*run; T.twist=0.10*a*s; T.hipY=-0.03*a*Math.abs(s)+0.012*a;
  }

  /* 든 것 — 오른팔이 맡는다(주먹 · 구르기가 먼저) */
  const gun=!!HT.gun, aimP=clamp(PL.pitch,-1.0,1.1);
  if(!PL.dead&&!swimming&&!(typeof WALL!=='undefined'&&WALL.on)){
    if(gun){                                                         // 총 — 두 팔로 겨눈다(보는 곳으로)
      A(T.armR,Math.PI/2+aimP-0.15,-0.12,0.35); A(T.armL,Math.PI/2+aimP-0.05,-0.62,0.55); T.chest=aimP*0.3; T.twist=-0.12;
      if(ATK.flash>0) T.armR[0]+=0.12, T.armL[0]+=0.08;               // 쏠 때 튄다
    }else if(USE_T>0){                                               // 먹기 · 마시기 — 손을 입으로
      const k=Math.sin(clamp(1-USE_T/USE_DUR,0,1)*Math.PI); A(T.armR,0.4+0.75*k,-0.2*k,0.4+1.9*k);
    }else if(held&&(HT.weapon||HT.axe||HT.pick||HT.drill)&&(ATK.swing>0||HARV.active)){   // 휘두르기 · 캐기 — 들어 올렸다 내리친다
      let u;
      if(ATK.swing>0) u=1-ATK.swing/Math.max(0.01,ATK.swingMax);
      else { PB.chop=(PB.chop+dt*1.5)%1; u=PB.chop; }
      const style=HT.swing||'slash';
      if(style==='thrust'){ const k=u<0.35?u/0.35:1-(u-0.35)/0.65; A(T.armR,0.9+0.6*k,-0.1,1.6-1.5*k); T.twist=-0.3*k; }
      else{ const up=u<0.4?u/0.4:0, dn=u<0.4?0:(u-0.4)/0.6, e=dn*dn*(3-2*dn);
        A(T.armR,u<0.4?0.55+2.2*up:2.75-2.35*e,0.1,u<0.4?1.1+0.6*up:1.7-1.4*e); A(T.armL,0.5+0.9*(u<0.4?up:1-e),0.0,1.0);
        T.lean+=u<0.4?-0.08*up:0.25*e; T.twist=u<0.4?0.15*up:-0.2*e; }
    }else if(held&&HT&&weaponFx&&weaponFx.userData.rest){            // 횃불 · 등잔 · 그물 — 앞에 세워 든다
      A(T.armR,0.75,0.2,0.95);
    }else if(held){ A(T.armR,0.45,0.15,0.95); }                      // 그 밖의 든 것 — 앞으로 든다
  }
  /* 주먹 — 당겼다가 곧게 뻗고 돌아온다 · 다른 팔은 얼굴을 막는다 */
  if(PB.punch){
    const P=PB.punch, u=clamp(P.t/P.dur,0,1), arm=P.side>0?T.armR:T.armL, other=P.side>0?T.armL:T.armR;
    const k=u<0.22?0:(u<0.45?(u-0.22)/0.23:1-(u-0.45)/0.55), e=k*k*(3-2*k);
    A(arm,1.0+0.55*e,0.3-0.45*e,2.1-2.05*e); A(other,1.05,-0.15,2.0);
    T.twist=P.side*0.35*e; T.lean+=0.06*e; if(PL.grounded&&!PL.crouch&&sp<0.3){ L(T.legR,P.side>0?-0.15:0.2,0.08,0.15); L(T.legL,P.side>0?0.2:-0.15,0.08,0.15); }
  }
  /* 구르기 — 돌진(Q)하면 앞으로 한 바퀴 · 몸을 옹송그린다 */
  if(PB.roll>=0){
    const u=PB.roll, e=u*u*(3-2*u);
    T.roll=-e*Math.PI*2; T.autoH=0; T.hipY=0.1+0.4*Math.sin(Math.PI*u);
    L(T.legR,1.9,0.12,2.3); L(T.legL,1.9,0.12,2.3); A(T.armR,1.2,0.25,2.0); A(T.armL,1.2,0.25,2.0); T.lean=0.7; T.head=-0.6;
  }
}

/* ── 자세를 뼈에 ── */
function pbApply(P){
  const B=PB.bone, D=PB.dir;
  /* 엉덩이 높이 — 다리 각에서(디딘 발 · 꿇은 무릎 가운데 가장 낮은 것이 땅에 닿는다) */
  let h=PB.hip0;
  if(P.autoH>0.5){
    const reach=l=>{ const th=l[0], kn=l[2]; return Math.max(PB.Lt*Math.cos(th)+PB.Ls*Math.cos(th-kn)+PB.footH, PB.Lt*Math.cos(th)+0.06); };
    h=Math.max(reach(P.legR),reach(P.legL));
  }
  B.hips.position.y=h+P.hipY;
  B.hips.rotation.set(-P.lean*0.55+P.roll,P.twist*0.4,0,'YXZ');
  B.spine.rotation.set(-P.lean*0.25,P.twist*0.3,0,'YXZ');
  B.chest.rotation.set(-P.lean*0.2+P.chest,P.twist*0.5,0,'YXZ');
  B.neck.rotation.set(P.head*0.4+P.lean*0.35,-P.twist*0.5,0,'YXZ');
  B.head.rotation.set(P.head*0.6+P.lean*0.4,P.headY,0,'YXZ');
  /* 팔 · 다리 — 몸 쪽 좌표의 목표는 부모(가슴 · 엉덩이) 좌표다(위 몸통 돌림을 이미 탄다) */
  for(const [s,sg] of [['R',1],['L',-1]]){
    const a=P['arm'+s], l=P['leg'+s];
    pbDir(a[0],a[1],sg,_pbX); pbDir(a[0]+a[2],a[1]*0.5,sg,_pbY);
    pbAim(B['upperArm'+s],B['foreArm'+s],D['upperArm'+s],D['foreArm'+s],_pbX,_pbY);
    B['hand'+s].quaternion.identity();
    pbDir(l[0],l[1],sg,_pbX); pbDir(l[0]-l[2],l[1]*0.6,sg,_pbY);
    pbAim(B['thigh'+s],B['shin'+s],D['thigh'+s],D['shin'+s],_pbX,_pbY);
    // 발 — 몸 쪽 좌표에서 앞으로 반듯이(꿇은 발은 발등을 땅에)
    const f=P['foot'+s]||0; _pbZ.set(0,Math.sin(-0.12+f),-Math.cos(-0.12+f));
    _pbQ.copy(B['thigh'+s].quaternion).multiply(B['shin'+s].quaternion).invert(); _pbZ.applyQuaternion(_pbQ);
    B['foot'+s].quaternion.setFromUnitVectors(D['foot'+s],_pbZ.normalize());
  }
}
/* 든 것 — 주먹 축(아래팔을 몸의 오른쪽 축으로 90° 돌린 방향)이 물건의 +Y. 총은 아래팔 방향이 총열(+Y) */
function pbHold(){
  const id=weaponFxId||null;
  if(PB.holdId!==id){
    PB.holdId=id; if(PB.holdFx){ PB.hold.remove(PB.holdFx); PB.holdFx=null; }
    const F=id&&WEAPON_FX[id];
    if(F){ try{ const r=F(); r.mesh.position.y-=r.grip||0; const g=new THREE.Group(); g.add(r.mesh); PB.holdFx=g; PB.hold.add(g);
      g.userData.gun=!!(ITEMS[id]&&ITEMS[id].tool&&ITEMS[id].tool.gun);
      g.traverse(o=>{ if(o.name==='flash'||o.name==='tip') o.visible=false; }); }catch(e){ console.warn('[사람 몸] 든 것',e); } }
  }
  if(!PB.holdFx) return;
  const B=PB.bone; PB.rig.updateMatrixWorld(true);
  const e=_pbV.setFromMatrixPosition(B.foreArmR.matrixWorld), h=_pbV2.setFromMatrixPosition(B.handR.matrixWorld);
  const f=_pbY.subVectors(h,e).normalize();                                        // 아래팔(세계)
  const rt=_pbX.set(1,0,0).applyQuaternion(PB.rig.quaternion);                     // 몸의 오른쪽(세계)
  const fist=_pbZ.copy(f).applyAxisAngle(rt,Math.PI/2); fist.addScaledVector(f,-fist.dot(f)).normalize();
  let X,Y,Zv;
  if(PB.holdFx.userData.gun){ Y=f; Zv=fist; X=_pbV.crossVectors(Y,Zv).normalize(); }   // 총열 = 아래팔 · 위 = 주먹 축
  else{ Y=fist; X=f; Zv=_pbV.crossVectors(X,Y).normalize(); }                          // 자루 = 주먹 축 · 날 = 아래팔 쪽
  _pbM.makeBasis(X,Y,Zv); _pbQ.setFromRotationMatrix(_pbM);
  B.handR.getWorldQuaternion(_pbQ2); PB.hold.quaternion.copy(_pbQ2.invert().multiply(_pbQ));
}

/* ── 매 프레임(99-main.js) ── */
function updatePlayerBody(dt){
  const want=(tpvActive()||flyMode)&&landed;
  if(!want){ if(PB.rig) PB.rig.visible=false; return; }
  if(!PB.built&&!pbBuild()) return;
  PB.t+=dt;
  if(PL.lungeCd>PB.lunge0+0.3) PB.roll=0;                             // 돌진이 막 시작됐다
  PB.lunge0=PL.lungeCd;
  if(PB.roll>=0){ PB.roll+=dt/0.55; if(PB.roll>=1) PB.roll=-1; }
  if(PB.punch){ PB.punch.t+=dt; if(PB.punch.t>=PB.punch.dur) PB.punch=null; }
  pbTarget(dt);
  /* 부드럽게 — 구르기 · 주먹은 빠르게 */
  const k=1-Math.exp(-dt*(PB.roll>=0||PB.punch?30:16)), C=PB.cur, T=PB.tg;
  for(const n in T){ const v=T[n]; if(Array.isArray(v)) for(let i=0;i<v.length;i++) C[n][i]+=(v[i]-C[n][i])*k; else C[n]+=(v-C[n])*k; }
  C.roll=T.roll; C.autoH=T.autoH;                                   // 구르기 각은 한 바퀴를 넘어가므로 그대로
  pbApply(C);
  const r=PB.rig; r.visible=true;
  const y=(PL.camY!==undefined&&PL.grounded)?PL.camY:PL.pos.y;
  r.position.set(PL.pos.x,y,PL.pos.z); r.rotation.set(0,PL.yaw,0);
  pbHold();
  /* 그림자 — dirtyAt 은 해 그림자를 통째로 다시 그린다: 움직이는 동안 초당 8번 · 서 있으면 초당 1번(숨 쉬기만) */
  const busy=Math.hypot(PL.vel.x,PL.vel.y,PL.vel.z)>0.1||PB.roll>=0||PB.punch||ATK.swing>0||HARV.active||!PL.grounded;
  PB.shT-=dt; if(PB.shT<=0){ PB.shT=busy?0.12:1.0; if(LIGHT.dirtyAt) LIGHT.dirtyAt(PL.pos.x,PL.pos.z,2); }
}

/* ── 주먹(P 오른 · O 왼) — 빈손 근접 공격(74-icons-guns.js meleeResolve 를 그대로 · 무기 내구는 안 닳는다) ── */
const FIST={dmg:7, reach:0.9, rate:0.42, stam:3, swing:'thrust'};
function punch(side){
  if(PL.dead||ATK.cd>0||PL.stam<FIST.stam) return;
  ATK.cd=FIST.rate; PL.stam=clamp(PL.stam-FIST.stam,0,100);
  ATK.pend={w:null, W:FIST, style:'thrust', v:0, t:0.14};
  PB.punch={side, t:0, dur:0.38};
  sfx('swish');
}

/* ── 3인칭 카메라 — 그리는 동안만 어깨 뒤로(45-sky.js renderFrame) ── */
function tpvActive(){ return TPV.on&&!flyMode&&landed&&!PB.failed&&typeof PLAYER_MESH!=='undefined'&&!(SCOPE.k>0.05); }
function tpvToggle(){ TPV.on=!TPV.on; try{ localStorage.setItem('castaway.view',TPV.on?'3p':'1p'); }catch(e){} toast(TPV.on?'3인칭':'1인칭'); }
const _tpS={p:new THREE.Vector3(), q:new THREE.Quaternion(), f:new THREE.Vector3(), r:new THREE.Vector3(), b:new THREE.Vector3(), c:new THREE.Vector3(), a:new THREE.Vector3(), t:0};
/* 카메라가 들어가면 안 되는 곳 — 땅 · 바위 · 큰 바위 · 바닷가 기둥(solidAt) · 나무 줄기와 세운 것(충돌 원 CGRID) */
function tpvHit(x,y,z){
  if(solidAt(x,z,y-0.25)) return true;
  if(typeof CGRID==='undefined') return false;
  const gx=Math.floor(x/CG), gz=Math.floor(z/CG);
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
    const a=CGRID.get(cgKey(gx+dx,gz+dz)); if(!a) continue;
    for(const c of a){ if(c.y0!==undefined&&(y>c.y1+0.3||y<c.y0-0.3)) continue;
      const r=(c.r||0)+0.22, ex=x-c.x, ez=z-c.z; if(ex*ex+ez*ez<r*r) return true; }
  }
  return false;
}
function tpvBegin(){
  if(!tpvActive()||!PB.built) return null;
  const S=_tpS, now=performance.now(), dt=S.t?Math.min(0.1,(now-S.t)/1000):0; S.t=now;
  S.p.copy(camera.position); S.q.copy(camera.quaternion);
  const f=S.f.set(0,0,-1).applyQuaternion(S.q), r=S.r.set(1,0,0).applyQuaternion(S.q); r.y=0; r.normalize();
  const tight=PL.under||PL.cave||PL.cvUnder||PL.caveQ;
  const want=tight?1.3:TPV.dWant;
  /* 바랄 자리 = 눈 + 오른쪽 · 위 · 뒤 — 눈에서 그 자리까지 곧게 16 걸음 재고 땅 · 바위 · 나무 줄기에 드는 곳 앞에서 멈춘다.
     이 길이 곧 카메라에서 머리로 가는 시선이라 사이에 무엇이 끼지 않는다 */
  const e=S.b.copy(r).multiplyScalar(tight?0.25:TPV.side).addScaledVector(f,-want); e.y+=tight?0.05:TPV.up;   // 눈 → 바랄 자리
  let k=1;
  for(let i=1;i<=16;i++){ const u=i/16, x=S.p.x+e.x*u, y=S.p.y+e.y*u, z=S.p.z+e.z*u;
    if(y<heightAt(x,z)+0.3||tpvHit(x,y,z)){ k=Math.max(0,(i-1)/16-0.04); break; } }
  const d=k*want;
  TPV.d=d<TPV.d||!dt?d:TPV.d+(d-TPV.d)*Math.min(1,dt*4);
  camera.position.copy(S.p).addScaledVector(e,TPV.d/want);
  camera.lookAt(S.a.copy(S.p).addScaledVector(f,TPV.aim));
  camera.updateMatrixWorld(true);
  if(weaponFx) weaponFx.visible=false;
  if(PB.rig) PB.rig.visible=TPV.d>0.8;                                 // 바짝 붙으면 몸을 숨긴다(머리 속이 보이지 않게)
  return S;
}
function tpvEnd(S){
  if(!S) return;
  camera.position.copy(S.p); camera.quaternion.copy(S.q); camera.updateMatrixWorld(true);
  if(weaponFx) weaponFx.visible=true;
}
