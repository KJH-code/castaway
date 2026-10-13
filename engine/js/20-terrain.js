/* 20-terrain.js — CASTAWAY
   땅과 물 — 가지·잎 인스턴스 자료 · 나무껍질 · 땅 셰이더(바이옴 결·자갈밭) · 암석 재질 · 지형 청크(LOD) · 바다·하천 물
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   9) 3D 월드 렌더링
   ----------------------------------------------------------------------------
   · 지형은 16×16 셀 청크 144개로 분할한다. 청크마다 별도 Mesh라서 three.js의
     프레임 컬링이 그대로 먹고, 나중에 청크 단위 LOD·스트리밍으로 확장하기 쉽다.
   · 정점 색 + flatShading으로 텍스처 없이 바이옴을 표현하고,
     저해상도 렌더 타깃을 확대해 리썰 컴퍼니풍 픽셀 질감을 낸다.
   ========================================================================== */
const CH=32, NC=N/CH;                 // 32 × 24 = 768 → 청크 576개 (한 변 80 m)
let renderer,scene,camera,sun,hemi,amb,flash,ocean,riverMesh,propGroup;
const chunks=[];
/* renderScale — 그리는 캔버스를 창 크기의 몇 배로 잡는가. 가로·세로에 각각
   곱하므로 픽셀 수는 이 값의 제곱으로 간다(0.5 → 창의 1/4 픽셀).
   0.5 에서 1.0 으로 올렸다 = 픽셀 수 네 배. */
let renderScale=1.0, farScale=1.0, showProps=true;

const cv=document.getElementById('c');

/* 여러 조각을 한 덩어리로 합친다. InstancedMesh 는 지오메트리 하나만 인스턴스할 수
   있으므로, 참나무 수관처럼 여러 덩어리로 된 실루엣은 미리 합쳐 둬야 한다. */
/* ── 가지 치기 ───────────────────────────────────────────────────────────
   줄기에서 나온 원가지가 제 몸에서 곁가지를 치고, 곁가지가 또 곁가지를 친다.
   **몇 개를 치는가는 그 가지의 길이에 비례한다** — LIMB_SPACE 마다 하나씩.

   곁가지 길이 = 부모 가지의 길이 − 부모 밑동에서 곁가지가 붙은 데까지의 거리,
   거기에 ±0.1 m. 실제 나무에서 갈라진 두 가지의 끝이 대충 같은 높이에
   모이는 까닭이 이것이다 — 갈라진 자리에서 남은 만큼씩 더 자란다.

   잎은 곁가지를 치지 않은 **끝가지**에만 단다. 가지마다 달면 줄기 한복판에도
   잎덩이가 박혀 속이 꽉 찬 공처럼 보인다.

   길이는 전부 세계 단위(m)다 — ±0.1 m 이 글자 그대로 10 cm 이어야 하므로
   나무 크기(p.s)를 먼저 곱해 두고 센다. */
const _lbV=new THREE.Vector3(), _lbS=new THREE.Vector3(), _lbD=new THREE.Vector3(),
      _lbQ=new THREE.Quaternion(), _lbQ2=new THREE.Quaternion(),
      _lbE=new THREE.Euler(), _lbB=new THREE.Vector3();
const leafGeoTris={}, TREE_N={}, TREE_T={};   // 검사용 창구
const LIMB_MIN=0.06;
/* 짧은 가지(SHORT_LIMB 밑, m)는 3각 2마디(12 삼각형) 지오메트리로 따로 담는다 — 긴 가지는 4각 6마디(48).
   잔가지는 꺾임이 안 보이는데 똑같이 48 을 먹었다. 가지 j 가 어느 메시 몇 번인지는 p._lmap
   (≥0 긴 메시 p._lb 의 번호 · <0 이면 −(번호+1) 로 짧은 메시 p._ls). 잎 번호는 그대로 (_lbBase+j)*LPB. */
const SHORT_LIMB=0.5;
/* ── 가지·잎 인스턴스 자료 줄이기 ────────────────────────────────────────
   가지·잎은 섬 전체에 인스턴스가 900만(잎 608만 · 가지 320만)이고, 인스턴스마다 4×4 행렬(16 float = 64 B)을
   들고 있어 잎만 389 MB · 가지 205 MB 였다(JS 에 다 들고 있고, 다가간 칸은 GPU 에도 올라간다).
   그런데 가지·잎 행렬은 전부 **자리 · 회전 · 크기(가로 x=z, 세로 y)** 로 짠 것이다(가지는 굵기·길이, 잎은 0.82 비).
   그래서 **8 float(32 B)** 로 담는다: iA = (자리 x,y,z, 가로 크기) · iB = (회전 사원수 x,y,z, 세로 크기).
   사원수는 q 와 −q 가 같은 회전이므로 w 를 늘 0 이상으로 맞춰 두고 w = √(1−x²−y²−z²) 로 되살린다.
   셰이더가 정점마다 행렬을 다시 짠다(`INST_DECL` · `iCompose` — Matrix4.compose 와 같은 식).
   **Three 의 인스턴싱 조각 셋(defaultnormal·project·worldpos)은 `instanceMatrix` 대신 매크로 `INST_MAT` 를
   쓰게 고쳐 두었다** — 재질에 `INST_C` 를 정의하면 iMat, 아니면 원래 instanceMatrix 다(다른 재질은 그대로).
   우리 셰이더(`barkMat`·`envPatch`)도 `INST_MAT` 를 쓴다. Three 는 인스턴스 메시면 instanceMatrix 를 꼭 선언하므로
   압축 메시는 **한 칸짜리 행렬 버퍼**를 달아 두고(셰이더가 안 쓰니 묶이지도 않는다) `count` 만 진짜로 준다.
   그림자도 같은 식이어야 한다 — 압축 메시는 깊이·거리 재질(`customDepthMaterial`·`customDistanceMaterial`)을 꼭 단다
   (없으면 Three 기본 재질이 한 칸짜리 instanceMatrix 를 읽다 넘친다).
   **가지·잎 행렬은 `getLimbM`/`setLimbM`·`instGetM`/`instSetM` 으로만 읽고 쓸 것** — getMatrixAt/setMatrixAt 은
   한 칸짜리 빈 버퍼를 건드린다. 먼 나무 복제·임포스터는 예전 그대로의 InstancedMesh 다. */
const INST_GUARD=`
#ifndef INST_MAT
#ifdef INST_C
#define INST_MAT iMat
#else
#define INST_MAT instanceMatrix
#endif
#endif
`;
for(const k of ['defaultnormal_vertex','project_vertex','worldpos_vertex'])
  THREE.ShaderChunk[k]=INST_GUARD+THREE.ShaderChunk[k].replace(/instanceMatrix/g,'INST_MAT');
const INST_DECL=`attribute vec4 iA; attribute vec4 iB; mat4 iMat;
mat4 iCompose(vec4 a, vec4 b){
  vec3 q=b.xyz; float w=sqrt(max(0.0,1.0-dot(q,q)));
  float x2=q.x+q.x, y2=q.y+q.y, z2=q.z+q.z;
  float xx=q.x*x2, xy=q.x*y2, xz=q.x*z2, yy=q.y*y2, yz=q.y*z2, zz=q.z*z2, wx=w*x2, wy=w*y2, wz=w*z2;
  float sx=a.w, sy=b.w;
  return mat4((1.0-(yy+zz))*sx, (xy+wz)*sx, (xz-wy)*sx, 0.0,
              (xy-wz)*sy, (1.0-(xx+zz))*sy, (yz+wx)*sy, 0.0,
              (xz+wy)*sx, (yz-wx)*sx, (1.0-(xx+yy))*sx, 0.0,
              a.x, a.y, a.z, 1.0);
}
`;
/* 재질을 압축 인스턴스용으로 — INST_C 를 정의하고, main 첫머리에서 iMat 을 짠다 */
function instCompact(m){
  m.defines=Object.assign({},m.defines||{},{INST_C:''});
  const prev=m.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{
    if(prev&&prev!==THREE.Material.prototype.onBeforeCompile) prev(sh,r);
    sh.vertexShader=sh.vertexShader.replace('void main() {',INST_DECL+'void main() {\n  iMat=iCompose(iA,iB);');
  };
  const pk=Object.prototype.hasOwnProperty.call(m,'customProgramCacheKey')?m.customProgramCacheKey:null;
  m.customProgramCacheKey=()=>'instC'+(pk?'-'+pk.call(m):'');
  return m;
}
/* 압축 인스턴스 메시 — 밑 지오메트리의 정점·인덱스를 나눠 쓰고 iA·iB 만 제 것 */
function instMesh(base,mat,n,depth,dist){
  const g=new THREE.BufferGeometry();
  for(const k in base.attributes) g.setAttribute(k,base.attributes[k]);
  if(base.index) g.setIndex(base.index);
  if(!base.boundingSphere) base.computeBoundingSphere();
  g.boundingSphere=base.boundingSphere;
  const A=new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1,n)*4),4),
        B=new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1,n)*4),4);
  g.setAttribute('iA',A); g.setAttribute('iB',B);
  const m=new THREE.InstancedMesh(g,mat,1);         // 행렬 버퍼는 한 칸짜리(셰이더가 안 쓴다)
  m.count=n; m.iA=A; m.iB=B; m.userData.instC=true;
  m.customDepthMaterial=depth; m.customDistanceMaterial=dist;
  return m;
}
const _iP=new THREE.Vector3(), _iQ=new THREE.Quaternion(), _iS=new THREE.Vector3();
/* 자리 · 회전 · 가로(x=z) · 세로 크기를 그대로 적는다 — 짓는 동안 */
function instPut(m,i,P,Q,sx,sy){
  const a=m.iA.array, b=m.iB.array, o=i*4;
  a[o]=P.x; a[o+1]=P.y; a[o+2]=P.z; a[o+3]=sx;
  if(Q.w<0){ b[o]=-Q.x; b[o+1]=-Q.y; b[o+2]=-Q.z; } else { b[o]=Q.x; b[o+1]=Q.y; b[o+2]=Q.z; }
  b[o+3]=sy;
}
function instGetM(m,i,M){
  const a=m.iA.array, b=m.iB.array, o=i*4, qx=b[o], qy=b[o+1], qz=b[o+2];
  _iQ.set(qx,qy,qz,Math.sqrt(Math.max(0,1-qx*qx-qy*qy-qz*qz)));
  _iP.set(a[o],a[o+1],a[o+2]); _iS.set(a[o+3],b[o+3],a[o+3]);
  return M.compose(_iP,_iQ,_iS);
}
/* 행렬을 받아 적는다 — 놀 때(꺾기·벌목). 바뀐 칸만 올리게 구간을 넓히고, 그림자도 다시 그리게 한다 */
function instSetM(m,i,M){
  M.decompose(_iP,_iQ,_iS);
  if(!(Math.abs(_iS.x*_iS.y*_iS.z)>1e-12)){ _iQ.set(0,0,0,1); _iS.set(0,0,0); }
  instPut(m,i,_iP,_iQ,_iS.x,_iS.y);
  for(const A of [m.iA,m.iB]){
    const r=A.updateRange, lo=i*4;
    if(r.count<0){ r.offset=lo; r.count=4; }
    else{ const hi=Math.max(r.offset+r.count,lo+4); r.offset=Math.min(r.offset,lo); r.count=hi-r.offset; }
    A.needsUpdate=true;
  }
  if(LIGHT.live&&m.castShadow) LIGHT.dirtyAt(_iP.x,_iP.z,2);
}
function limbAt(p,j){ const v=p._lmap[j]; return v>=0?[p._lb,v]:[p._ls,-v-1]; }
function getLimbM(p,j,M){ const [m,i]=limbAt(p,j); return instGetM(m,i,M); }
/* 가지 위 u(0 밑동 → 1 끝) 자리가 곧은 중심선에서 얼마나 비켜 있나 — 세계 좌표 벡터로 더해 준다.
   가지는 곧은 선이 아니다: 지오메트리가 활(1.25)·S(0.5, 긴 가지만) 로 굽고, 셰이더(barkMat 'limb')가 안쪽
   정점 줄마다 ±1.2 를 민다(전부 굵기 단위 — 인스턴스가 x·z 를 굵기로 늘린다). 곁가지를 곧은 선에 붙였더니
   어미 가지에서 떨어져 허공에 떴다. 셰이더와 **같은 식**(같은 씨앗 = 인스턴스 자리, float32)으로 줄 사이를 잇는다. */
const _lbX=new THREE.Vector3(), _lbZ=new THREE.Vector3();
function limbBend(wx,wy,wz,q,len,rad,u,out){
  const sh=len<SHORT_LIMB, rows=sh?2:6, f=Math.fround;
  const sx=f(wx), sy=f(wy), sz=f(wz), b=sx*0.0371+sy*0.0213+sz*0.0517;
  const at=(i)=>{ const t=i/rows, seg=Math.round(t*6);
    let x=1.25*Math.sin(Math.PI*t), z=sh?0:0.5*Math.sin(2*Math.PI*t);
    if(seg>=1&&seg<=5){ let h=b+seg*0.3183; h-=Math.floor(h);
      const k=h*137.13+0.123, k2=h*71.37+0.567; x+=(k-Math.floor(k)-0.5)*2.4; z+=(k2-Math.floor(k2)-0.5)*2.4; }
    return [x,z]; };
  const fi=u*rows, i0=Math.min(rows-1,Math.floor(fi)), w=fi-i0, a=at(i0), c=at(i0+1);
  const dx=(a[0]+(c[0]-a[0])*w)*rad, dz=(a[1]+(c[1]-a[1])*w)*rad;
  _lbX.set(1,0,0).applyQuaternion(q); _lbZ.set(0,0,1).applyQuaternion(q);
  return out.copy(_lbX).multiplyScalar(dx).addScaledVector(_lbZ,dz);
}
function setLimbM(p,j,M){ const [m,i]=limbAt(p,j); instSetM(m,i,M); }                 // 곁가지가 가질 수 있는 가장 짧은 길이 (m)
/* 곁가지 하나가 차지하는 가지 길이(m). 나무마다 다르다(TREE[].space).
   작을수록 촘촘하다 — 0.56/0.505 에서 0.40/0.355 로 내려 가지 수를 두 배로
   올렸다(참나무 345 → 678 · 전나무 329 → 652). 아래 값은 못 찾았을 때의 기본. */
const LIMB_SPACE=0.8;
/* 가지 하나에 달리는 잎 인스턴스 수. 참나무는 한 장씩 다섯을 가지 위에
   흩어 달고, 전나무는 바늘 한 다발을 끝에 하나 단다.
   참나무는 판때기 하나가 잎 아홉 장짜리 한 줌이라 다섯에서 셋으로 줄였다. */
const LEAF_PER={oak:3, fir:1};
const LEAF_BACK=0.10;                // 가지 끝에서 이만큼 앞부터 달기 시작한다 (m)
const LIMB_DEPTH=4;                  // 안전장치 — 길이가 먼저 재귀를 멎게 한다
function growLimbs(p,TR,emit){
  const rnd=mulberry32((p._hash||0)^0x7a5d1c9b);
  const S=p.s;
  if(TR.form==='oak') return growOak(p,TR,emit,rnd);
  const LAYER=[1.0,0.76,0.55];       // 겉가지·속가지 층 — 속이 비어 보이지 않게
  for(let j=0;j<TR.n;j++){
    const t=(j+0.5)/TR.n;
    const az=(p.brMax+j)*2.399+rnd()*0.35;
    const jt=rnd()-0.5;
    const lay=LAYER[j%3];
    _lbE.set(0,az,TR.t0+(TR.t1-TR.t0)*t+jt*0.16);
    const q=new THREE.Quaternion().setFromEuler(_lbE);
    const base=new THREE.Vector3(0,(TR.y0+(TR.y1-TR.y0)*t)*S,0);
    const len=(TR.L0+(TR.L1-TR.L0)*t)*lay*(1+jt*0.22)*S;
    grow(base,q,len,TR.rad*S,0);
  }
  function grow(base,q,len,rad,depth){
    /* 곁가지 수 — 가지 길이에 비례한다. 깊이별로 정해 둔 확률을 쓰지 않는다.
       곁가지 하나가 가지 LIMB_SPACE(m)를 차지한다고 보고 len/LIMB_SPACE 개를
       낸다. 정수부는 그대로 내고 소수부는 그 확률로 한 개 더 낸다 —
       1.6 이면 둘이 60%, 하나가 40% 다.

       이러면 긴 가지가 많이, 짧은 가지가 적게 갈라진다(실제 나무가 그렇다).
       곁가지는 부모의 0.2~0.58 로 짧아지므로 대를 거듭할수록 기댓값이
       빠르게 0 으로 간다 — 재귀가 길이로 저절로 멎는다. LIMB_DEPTH 는
       이제 규칙이 아니라 안전장치다. */
    const want=len/(TR.space||LIMB_SPACE);
    let nc=Math.floor(want);
    if(rnd()<want-nc) nc++;
    if(depth>=LIMB_DEPTH) nc=0;
    const kids=[];
    for(let c=0;c<nc;c++){
      // 붙는 자리 — 밑동 쪽에 붙으면 곁가지가 부모만큼 길어져 Y 자가 된다.
      // 가운데보다 조금 위(0.42~0.80)에서 갈라지게 둔다.
      const u=0.42+rnd()*0.38;
      /* 짧아졌다고 버리지 않는다 — 잔가지가 없으면 우듬지 끝이 휑하다.
         길이가 0 이나 음수로 내려가는 것만 막는다. */
      const kl=Math.max(LIMB_MIN, len*(1-u)+(rnd()-0.5)*0.2);   // ±0.1 m
      _lbE.set(0,rnd()*6.283,(0.55+rnd()*0.42)*(rnd()<0.5?1:-1));
      _lbQ2.setFromEuler(_lbE);
      const kq=q.clone().multiply(_lbQ2);
      _lbD.set(0,1,0).applyQuaternion(q);
      const kb=base.clone().addScaledVector(_lbD,len*u);
      if(p._org) kb.add(limbBend(p._org.x+base.x,p._org.y+base.y,p._org.z+base.z,q,len,rad,u,_lbB));
      kids.push([kb,kq,kl]);
    }
    /* 잎은 모든 가지에 단다. 예전에는 끝가지에만 달아 속가지가 맨 나무처럼
       드러났다. 대신 곁가지를 친 가지는 덩이를 작게 준다 — 실제로도 속에
       든 가지일수록 잎이 성기다. */
    const leafS=TR.leaf*S*(kids.length?0.62:1.0)*(0.8+rnd()*0.5);
    emit(base,q,len,rad,leafS);
    for(const [kb,kq,kl] of kids) grow(kb,kq,kl,rad*0.72,depth+1);
  }
}

/* ── 참나무 가지: 굵은 원가지가 갈라지며 가늘어진다 ─────────────────────
   예전에는 참나무도 전나무처럼 줄기에 굵기 4.6 cm 짜리 가는 막대 50개를 빗살처럼
   꽂았다 — 실제 참나무와 가장 다른 점이었다. 실제 참나무는
   ① 줄기 위쪽에서 **굵은 원가지 몇 개**(줄기 굵기의 절반 남짓)가 비스듬히 위·바깥으로 뻗고
   ② 가지 끝이 **두셋으로 갈라지며**(차례로 짧아지고 가늘어진다 — 갈라진 굵기의 제곱 합 ≈ 어미)
   ③ 몸통 중간에서도 잔가지를 치고 ④ 바깥 가지일수록 옆으로 눕는다 — 그래서 수관이 넓은 우산꼴이다.
   가지 지오메트리가 밑동 1 → 끝 0.5 로 가늘어지므로, 끝에서 갈라지는 자식은 어미 끝 굵기에서 시작한다.
   굵은 가지(4 cm 넘게)에는 잎을 달지 않는다. */
function growOak(p,TR,emit,rnd){
  const S=p.s, n=TR.sc;
  const up=new THREE.Vector3(0,1,0);
  const qFrom=(d)=>new THREE.Quaternion().setFromUnitVectors(up,d);
  for(let j=0;j<n;j++){
    const t=j/(n-1||1);
    const az=(p.brMax+j)*2.399+rnd()*0.5;
    const lead=(j===n-1);                         // 맨 위 하나는 줄기를 잇는 우듬지
    const tilt=lead?0.12+rnd()*0.15:(1.05-0.45*t)+(rnd()-0.5)*0.25;   // 수직에서 기운 각
    const d=new THREE.Vector3(-Math.sin(tilt)*Math.cos(az),Math.cos(tilt),Math.sin(tilt)*Math.sin(az));
    const base=new THREE.Vector3(0,(TR.y0+(TR.y1-TR.y0)*t)*S,0);
    const len=(lead?TR.L1:TR.L0*(0.85+rnd()*0.3))*S;
    grow(base,d,len,TR.rad*(lead?0.85:1)*(0.85+rnd()*0.25)*S,0);
  }
  function grow(base,d,len,rad,depth){
    const q=qFrom(d);
    const kids=[];
    const end=base.clone().addScaledVector(d,len);
    if(depth<TR.depth && len>0.3*S){
      // ② 끝에서 갈래 — 둘, 가끔 셋. 한쪽이 더 굵고 곧다(주축을 잇는다)
      const nf=rnd()<0.25?3:2;
      const side=new THREE.Vector3().crossVectors(d,Math.abs(d.y)>0.95?new THREE.Vector3(1,0,0):up).normalize();
      side.applyAxisAngle(d,rnd()*6.283);
      for(let c=0;c<nf;c++){
        const main=(c===0);
        const ang=main?0.18+rnd()*0.2:0.45+rnd()*0.4;
        const ax=side.clone().applyAxisAngle(d,c*6.283/nf);
        const kd=d.clone().applyAxisAngle(ax,ang);
        // ④ 바깥으로 눕기 · 끝은 빛 쪽으로 살짝 든다
        const out=new THREE.Vector3(kd.x,0,kd.z); if(out.lengthSq()>1e-6) out.normalize();
        kd.addScaledVector(out,0.12).addScaledVector(up,0.05*(depth>=2?1:-1)).normalize();
        const kl=len*(main?0.72+rnd()*0.12:0.55+rnd()*0.15);
        const kr=rad*0.5*(main?0.85:0.62);
        kids.push([end,kd,kl,kr]);
      }
      // ③ 몸통 중간의 잔가지 — 길이에 비례
      const want=len/(TR.space*S);
      let ns=Math.floor(want); if(rnd()<want-ns) ns++;
      for(let c=0;c<ns;c++){
        const u=0.3+rnd()*0.55;
        const kb=base.clone().addScaledVector(d,len*u);
        if(p._org) kb.add(limbBend(p._org.x+base.x,p._org.y+base.y,p._org.z+base.z,q,len,rad,u,_lbB));
        const ax=new THREE.Vector3().crossVectors(d,up);
        if(ax.lengthSq()<1e-6) ax.set(1,0,0); ax.normalize().applyAxisAngle(d,rnd()*6.283);
        const kd=d.clone().applyAxisAngle(ax,0.7+rnd()*0.4);
        kd.addScaledVector(up,0.15).normalize();
        kids.push([kb,kd,Math.max(0.25*S,len*(1-u)*(0.45+rnd()*0.25)),rad*(1-0.5*u)*0.45,true]);
      }
    }
    const leafS=rad>0.04*S?0:TR.leaf*S*(kids.length?0.7:1.0)*(0.8+rnd()*0.5);
    emit(base,q,len,rad,leafS);
    for(const [kb,kd,kl,kr,tw] of kids) grow(kb,kd,kl,kr,depth+(tw?2:1));
  }
}

/* 원기둥을 휘고 굵기를 흔든다. f(t,θ,r) → [새 반지름, x 밀기, z 밀기].
   t 는 밑동 0 → 끝 1. H 를 주면 가운데가 원점인 높이 H 원기둥(줄기)이고, 안 주면 밑동이 원점인 길이 1(가지)다. */
/* ── 나무껍질 · 꺾인 가지 ─────────────────────────────────────────────────
   ① **꺾임**(가지만 · 정점 셰이더): 가지는 6마디인데, 마디 경계(정점 줄)마다 인스턴스 자리로 씨앗을
      뽑아 옆으로 ±1.2 굵기씩 밀어 **마디 사이가 곧고 마디에서 꺾인** 지그재그를 만든다(참나무 큰 가지가
      팔꿈치처럼 꺾이는 것). 양 끝 줄은 0 이라 붙는 자리·끝은 그대로다. 정점 줄에서만 셈하므로 따로
      정점이 늘지 않고, 가지마다 꺾임이 다르다(한 지오메트리를 나눠 쓰는 인스턴스라 CPU 로는 못 한다).
   ② **껍질**(조각 셰이더): 세로로 길게 갈라진 골(늘인 잡음의 능선) + 골 사이 판(가로 금으로 끊긴
      조각) + 판마다 밝기 흔들기 + 골은 짙게. 램버트라 화소 법선을 못 흔드니 골 옆 해 쪽 면을 조금
      밝혀 요철을 흉내 낸다. 좌표는 가지 둘레각 × 길이(m) — 굵기가 달라도 결 간격이 m 단위로 같다. */
let LIMB_FAR_MAT=null, LIMB_MAT_C=null, LIMB_DEPTH_C=null, LIMB_DIST_C=null;
function barkMat(col,kind){
  const m=new THREE.MeshLambertMaterial({color:col});
  m.onBeforeCompile=sh=>{
    sh.vertexShader='varying vec3 vBk;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float bkLen=1.0, bkR=1.0;
      ${INST_GUARD}
      #ifdef USE_INSTANCING
        bkLen=length(INST_MAT[1].xyz); bkR=length(INST_MAT[0].xyz);
      #endif
      ${kind==='limb'?`
      #ifdef USE_INSTANCING
      {
        float seg=floor(transformed.y*6.0+0.5);
        vec3 sd=INST_MAT[3].xyz;
        float h=fract(dot(sd,vec3(0.0371,0.0213,0.0517))+seg*0.3183);   // limbBend() 와 같은 식 — CPU 가 곁가지 자리를 맞춘다
        float k=fract(h*137.13+0.123), k2=fract(h*71.37+0.567);
        float on=step(0.5,seg)*step(seg,5.5);
        transformed.x+=(k-0.5)*2.4*on;
        transformed.z+=(k2-0.5)*2.4*on;
      }
      #endif`:''}
      vBk=vec3(atan(position.z,position.x), transformed.y*bkLen, length(position.xz)*bkR);`);
    sh.fragmentShader=`varying vec3 vBk;
float bh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float bn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(bh(i),bh(i+vec2(1,0)),f.x),mix(bh(i+vec2(0,1)),bh(i+vec2(1,1)),f.x),f.y); }
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      {
        /* 둘레 길이(m) = 각 × 반지름 — 굵은 줄기는 골이 많고 가는 가지는 적다 */
        float circ=6.2832*max(vBk.z,0.02);
        float nAround=max(2.0,floor(circ/0.13));
        vec2 q=vec2(vBk.x/6.2832*nAround, vBk.y);
        q.x+=(bn(vec2(q.y*1.3,q.x*0.4))-0.5)*1.4+(bn(vec2(q.y*4.1,q.x*1.7))-0.5)*0.35;   // 골이 구불구불
        float id=floor(q.x), col=fract(q.x);
        float fw=0.10+0.12*bn(vec2(id*3.1,q.y*2.0));                   // 골 너비도 자리마다 다르다
        float fis=smoothstep(0.0,fw,col)*smoothstep(1.0,1.0-fw,col);   // 0 = 골 · 1 = 판 가운데
        float pl=0.35+0.6*bh(vec2(id,7.0));                            // 판 길이 — 골 줄마다 다르다
        float qy=q.y/pl+bh(vec2(id,3.0))*5.0+(bn(vec2(id,q.y*2.0))-0.5)*0.6;
        float cut=fract(qy), plate=bh(vec2(id,floor(qy)));
        float br=0.70+0.40*plate;
        br*=mix(0.38,1.0,fis);
        br*=mix(0.62,1.0,smoothstep(0.0,0.05,cut)*smoothstep(1.0,0.97,cut)*(0.6+0.4*fis)+ (1.0-fis)*0.0);
        br*=1.0+0.22*(col-0.5)*fis;                                    // 판 한쪽 면이 밝다(요철 흉내)
        br*=0.82+0.30*bn(vec2(vBk.x*14.0,vBk.y*24.0));                  // 잔 세로 결
        br*=0.9+0.2*bn(vBk.xy*vec2(1.1,0.9));                          // 큰 얼룩
        diffuseColor.rgb*=br;
      }`);
  };
  m.customProgramCacheKey=()=>'bark-'+kind;
  return m;
}
function gnarl(g,f,H){
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const t=H?(y+H/2)/H:y, r=Math.hypot(x,z), th=Math.atan2(z,x);
    const [nr,dx,dz]=f(t,th,r), k=r>1e-6?nr/r:0;
    p.setXYZ(i,x*k+dx,y,z*k+dz);
  }
  g.computeVertexNormals();
  return g;
}
function mergeParts(parts){
  const M=new THREE.Matrix4(), NM=new THREE.Matrix3(), V=new THREE.Vector3();
  const chunks=[]; let total=0;
  for(const pt of parts){
    const g=pt.g.index?pt.g.toNonIndexed():pt.g;
    const pos=Float32Array.from(g.attributes.position.array);
    const nor=Float32Array.from(g.attributes.normal.array);
    M.compose(new THREE.Vector3(pt.x||0,pt.y||0,pt.z||0),
      pt.q||new THREE.Quaternion().setFromEuler(new THREE.Euler(pt.rx||0,pt.ry||0,pt.rz||0)),
      new THREE.Vector3(pt.s||1,pt.sy||pt.s||1,pt.s||1));
    NM.getNormalMatrix(M);
    for(let i=0;i<pos.length;i+=3){
      V.set(pos[i],pos[i+1],pos[i+2]).applyMatrix4(M);
      pos[i]=V.x; pos[i+1]=V.y; pos[i+2]=V.z;
      V.set(nor[i],nor[i+1],nor[i+2]).applyMatrix3(NM).normalize();
      nor[i]=V.x; nor[i+1]=V.y; nor[i+2]=V.z;
    }
    chunks.push([pos,nor]); total+=pos.length;
  }
  const P=new Float32Array(total), N=new Float32Array(total);
  let o=0; for(const c of chunks){ P.set(c[0],o); N.set(c[1],o); o+=c[0].length; }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.BufferAttribute(N,3));
  out.computeBoundingSphere();
  return out;
}

// 해당 지점의 지형 법선 — 그림자를 비탈에 눕히는 데 쓴다
const _UP=new THREE.Vector3(0,1,0);
function terrainNormal(wx,wz,out){
  const x=clamp(Math.round(wx/CELL+N/2),1,N-2), z=clamp(Math.round(wz/CELL+N/2),1,N-2);
  const dx=(F.elev[IDX(x+1,z)]-F.elev[IDX(x-1,z)])/(2*CELL);
  const dz=(F.elev[IDX(x,z+1)]-F.elev[IDX(x,z-1)])/(2*CELL);
  return out.set(-dx,1,-dz).normalize();
}
/* 예전에는 여기 `makeShadowTex` 가 있었다 — 나무 밑에 깔던 반투명 원반이다.
   이제 그림자는 `LIGHT` 가 그림자 지도로 실제로 드리우므로 걷어냈다. */

function biomeColorAt(i,out){
  out.setHex(BIOME_INFO[F.biome[i]].c);
  const e=F.elev[i];
  // 습도·경사로 명도를 흔들어 같은 바이옴이 단색 판때기로 보이지 않게 한다
  let v=1+(F.moist[i]-0.5)*0.12-clamp(F.slope[i],0,1)*0.14;
  /* 셀마다 어긋나던 ±2% 얼룩은 뺐다 — 2.5 m 칸이 그대로 바둑판으로 보였다. 잔 얼룩은 셰이더 잡음이 한다 */
  out.multiplyScalar(clamp(v,0.68,1.32));
  // 물가 젖은 띠: 수면 위 1.2 m 까지는 어둡고 푸르게
  if(e>0&&e<1.2){
    const w=1-e/1.2;
    out.lerp(TMP_WET.setHex(0x3a4a4a),w*0.55).multiplyScalar(1-w*0.18);
  }
  return out;
}
const TMP_WET=new THREE.Color();

/* ── 땅 표면 ──────────────────────────────────────────────────────────────
   정점 색(바이옴)만으로는 2.5 m 격자보다 잘게 아무것도 없어, 가까이서 보면 색 판때기였다.
   셰이더가 화소마다 세 가지를 더한다(`terrainMat`):
   ① **얼룩** — 값잡음 세 겹(40 m · 6 m · 0.8 m). 큰 얼룩은 명도·색조를 조금, 잔 얼룩은
      흙·풀의 결을 낸다. 잔 겹은 멀수록 흐린다(멀리서 들끓지 않게).
   ② **바위** — 비탈이 가팔라지면(법선 y 0.82 → 0.62) 흙·풀 대신 바위가 드러난다. 바위에는
      높이를 따라 층리(가로 띠)를 새긴다 — 퇴적·용암층이 층층이 쌓인 결.
   ③ **잔 요철 명암** — 램버트는 빛을 정점마다 세므로 화소 법선을 흔들어도 소용없다.
      대신 잔 얼룩의 **기울기와 해 방향의 내적**으로 밝기를 곱해, 햇빛 쪽 면이 밝고 반대가
      어두운 요철을 흉내 낸다(해가 낮을수록 짙다 — 저녁 땅이 거칠어 보이는 것). */
const TERR_U={uSunDir:{value:new THREE.Vector3(0,1,0)}, uBio:{value:null}, uBio2:{value:null},
  uBioN:{value:768}, uCell:{value:2.5}};
/* 바이옴 색을 정점이 아니라 **텍스처**로 — 정점 색은 삼각형 안에서 직선으로 섞이므로 바이옴이 바뀌는
   자리(2.5 m 칸)마다 삼각형 톱니가 그대로 보였다. 격자 한 칸 = 텍셀 하나로 담아 두고, 셰이더가
   잡음으로 비튼 자리(±3 m)에서 쌍선형으로 읽는다 — 경계가 물결치듯 구불구불해진다. */
/* 자갈밭 정도(0~1) — 애추 사면은 돌무더기, 노출 암반은 반쯤, 하천 바닥·분기공은 조금.
   땅 셰이더(잔돌 무늬)와 돌 흩뿌리기(`RUBBLE`)가 같은 값을 쓴다 */
const GRAVEL_K=(()=>{ const a=new Float32Array(16); a[B.SCREE]=1.0; a[B.ROCK]=0.55; a[B.RIVER]=0.6; a[B.FUMAROLE]=0.4; return a; })();
const gravelAt=i=>F.elev[i]>0.15?GRAVEL_K[F.biome[i]]:(F.biome[i]===B.RIVER?0.6:0);
/* 바이옴 결 가림막(`bioTex2`) — 색만으로는 숲 바닥도 모래밭도 같은 잔 얼룩이었다. 바이옴마다 제 결을 그리려고
   셰이더에 '여기가 무슨 땅인가'를 네 채널로 넘긴다: R 모래(해변·사구·바다 바닥) · G 활엽수림 낙엽 ·
   B 침엽수림 솔잎 · A 진흙(습지·하천). 자갈밭은 `bioTex` 의 알파, 풀밭·관목지는 남은 자리다. */
let bioTex=null, bioTex2=null;
function buildBioTex(){
  if(bioTex) bioTex.dispose();
  if(bioTex2) bioTex2.dispose();
  const d=new Uint8Array(N*N*4), d2=new Uint8Array(N*N*4), col=new THREE.Color();
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=IDX(x,z), o=(z*N+x)*4, bi=F.biome[i];
    d2[o]  =(bi===B.BEACH||bi===B.DUNE)?255:(bi===B.SHELF?235:(bi===B.DEEP?150:0));
    d2[o+1]=bi===B.BROADLEAF?255:0;
    d2[o+2]=bi===B.CONIFER?255:0;
    d2[o+3]=bi===B.MARSH?255:(bi===B.RIVER?110:0);
    biomeColorAt(i,col);
    d[o]=clamp(col.r*255,0,255); d[o+1]=clamp(col.g*255,0,255); d[o+2]=clamp(col.b*255,0,255);
    d[o+3]=Math.round(gravelAt(i)*255);          // 알파 = 자갈밭 정도(셰이더가 잔돌을 깐다)
  }
  bioTex=new THREE.DataTexture(d,N,N,THREE.RGBAFormat);
  bioTex.magFilter=bioTex.minFilter=THREE.LinearFilter; bioTex.generateMipmaps=false;
  bioTex.wrapS=bioTex.wrapT=THREE.ClampToEdgeWrapping; bioTex.needsUpdate=true;
  bioTex2=new THREE.DataTexture(d2,N,N,THREE.RGBAFormat);
  bioTex2.magFilter=bioTex2.minFilter=THREE.LinearFilter; bioTex2.generateMipmaps=false;
  bioTex2.wrapS=bioTex2.wrapT=THREE.ClampToEdgeWrapping; bioTex2.needsUpdate=true;
  TERR_U.uBio.value=bioTex; TERR_U.uBio2.value=bioTex2; TERR_U.uBioN.value=N; TERR_U.uCell.value=CELL;
}
/* 심플렉스 잡음(애시마 · MIT) — 값잡음은 정사각 격자 모서리에 값을 두고 섞어, 두 겹을 돌려
   평균해도 네모난 덩이가 남았다. 심플렉스는 삼각 격자에 기울기를 두므로 축 방향 결이 없다. */
const SIMPLEX2=`
vec3 sxp(vec3 x){ return mod(((x*34.0)+1.0)*x,289.0); }
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0);
  vec3 p=sxp(sxp(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}`;
function terrainMat(){
  const m=new THREE.MeshLambertMaterial({vertexColors:true});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,TERR_U);
    sh.vertexShader='varying vec3 vTW;\nvarying vec3 vTN;\nvarying float vTD;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvTW=(modelMatrix*vec4(transformed,1.0)).xyz;\nvTN=normal;\nvTD=length((modelViewMatrix*vec4(transformed,1.0)).xyz);');
    /* 사진 결(22-ground-textures.js)을 쓸 수 있으면 조각 쪽은 그쪽 것을 쓴다 — 훨씬 가볍다. 아래 수식 판은 WebGL1 용으로 남긴다 */
    if(GND_OK()){ sh.fragmentShader=gndTerrainFrag(sh.fragmentShader); return; }
    sh.fragmentShader=`uniform vec3 uSunDir;
uniform sampler2D uBio; uniform sampler2D uBio2; uniform float uBioN, uCell;
varying vec3 vTW;
varying vec3 vTN;
varying float vTD;
${SIMPLEX2}
/* 0..1 로 옮긴 심플렉스 — 예전 값잡음 두 겹 평균과 퍼짐(표준편차 ≈ 0.2)을 맞춘다 */
float vn(vec2 p){ return 0.5+0.36*snoise(p); }
vec2 th2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      {
        float nearK=clamp(1.0-vTD/120.0,0.0,1.0);
        vec2 p=vTW.xz;
        /* 바이옴 색 — 비튼 자리에서 텍스처로 읽는다(경계가 칸·삼각형을 따르지 않고 굽이친다) */
        vec2 wp=p+vec2(snoise(p/16.0),snoise(p/16.0+31.7))*2.6+vec2(snoise(p/3.5+5.1),snoise(p/3.5+9.3))*0.8;
        /* 경계를 부드럽게 — 가운데 + 둘레 여섯 점(반경 3.5 m)을 평균한다. 한 점만 읽으면 칸 폭(2.5 m)만큼의 띠로 뚝 바뀐다 */
        vec2 bu=(wp/uCell+uBioN*0.5+0.5)/uBioN; float br=3.5/uCell/uBioN;
        vec4 bc=texture2D(uBio,bu)*2.0;
        for(int k=0;k<6;k++){ float an=float(k)*1.0472+0.5; bc+=texture2D(uBio,bu+vec2(cos(an),sin(an))*br); }
        diffuseColor.rgb=bc.rgb/8.0;
        float grav=smoothstep(0.08,0.60,bc.a/8.0);          // 자갈밭 정도(바이옴 텍스처의 알파)
        /* 바이옴 결 가림막 — 모래 · 낙엽 · 솔잎 · 진흙(120 m 안에서만 읽는다) */
        float mSand=0.0, mLeaf=0.0, mNeed=0.0, mMud=0.0;
        if(nearK>0.0){
          vec4 m2=texture2D(uBio2,bu)*2.0;
          for(int k=0;k<3;k++){ float an=float(k)*2.0944+0.5; m2+=texture2D(uBio2,bu+vec2(cos(an),sin(an))*br); }
          m2/=5.0;
          mSand=smoothstep(0.2,0.7,m2.r); mLeaf=smoothstep(0.2,0.7,m2.g); mNeed=smoothstep(0.2,0.7,m2.b); mMud=smoothstep(0.2,0.7,m2.a);
        }
        /* 얼룩은 비튼 좌표에서 읽는다 — 곧은 잡음은 둥근 얼룩이 고르게 늘어서 무늬로 읽혔다 */
        vec2 pw=p+vec2(snoise(p/23.0+1.7),snoise(p/23.0+8.2))*9.0;
        float big=vn(pw/40.0)*0.65+vn(pw/17.0+4.4)*0.35, mid=vn(pw/6.0+7.3)*0.7+vn(pw/2.6+1.9)*0.3;
        /* 잔 얼룩·잔 요철은 120 m 밖에서 nearK 가 정확히 0 이라 곱해도 1 이다 — 그 밖에선 심플렉스 여섯 번을
           아예 안 센다(먼 땅이 화면의 대부분이다). 값은 그대로다: mix(1,x,0)=1 · 1−x·0=1 */
        float fine=0.5;
        if(nearK>0.0) fine=vn(p/0.8+3.1)*0.6+vn(p/0.3+9.7)*0.4;
        vec3 c=diffuseColor.rgb;
        // 큰 얼룩은 밝기와 색조를 함께 흔든다(마른 데는 누렇게, 젖은 데는 푸르게)
        // 대비는 옅게 — 두 겹 평균이라 값이 가운데로 몰리므로 (v−0.5) 로 흔든다
        c*=1.0+0.16*(big-0.5);
        c*=mix(vec3(0.96,0.99,1.04),vec3(1.05,1.01,0.93),vn(p/70.0+2.0));
        c*=1.0+0.08*(mid-0.5);
        c*=mix(1.0,1.0+0.12*(fine-0.5),nearK);
        // 바위 — 가파를수록 드러난다. 높이를 따라 층리
        float steep=1.0-smoothstep(0.62,0.82,normalize(vTN).y);
        float strata=0.5+0.5*sin(vTW.y*2.3+vn(p/9.0)*5.0)*0.6+vn(vec2(vTW.y*1.7,p.x/12.0))*0.4;
        vec3 rock=vec3(0.36,0.34,0.31)*(0.78+0.3*strata)*(0.9+0.2*mid);
        c=mix(c,rock,steep*0.85);
        /* ── 자갈밭 — 예전엔 애추 사면이 모래처럼 매끈한 한 가지 색이었다(사용자 지적: 자갈이 납작하고 결이 없다).
           120 m 안에서는 돌무더기 얼룩(0.5 m · 1.6 m 두 겹)으로 밝고 어두운 돌밭 결을 내고, 색도 찬 회색 ↔ 누런 회색으로
           흔든다. 낱낱의 돌은 아래 '발밑 결'이 가까이서 그린다 */
        if(grav>0.0&&nearK>0.0){
          float g1=vn(p/0.5+2.2), g2=vn(p/1.6+6.1);
          c*=1.0+grav*nearK*(0.34*(g1-0.5)+0.26*(g2-0.5));
          c=mix(c,c*mix(vec3(0.90,0.94,1.02),vec3(1.08,1.02,0.90),vn(p/3.3+4.0)),grav*nearK);
        }
        /* ── 바이옴마다 제 결(120 m 안) ────────────────────────────────────────
           모래는 바람·물결이 빗은 잔물결, 활엽수림 바닥은 낙엽 얼룩과 검은 흙, 침엽수림은 붉은 솔잎 융단,
           습지는 검은 진흙과 물 고인 자리. 색을 섞는 방식(바탕색에 얼룩 색을 잡음으로 섞기)은 Babylon.js 의
           절차적 풀 텍스처(grassProceduralTexture — fbm 으로 풀빛 셋을 섞는다 · Apache-2.0)에서 생각을 얻었다. */
        if(nearK>0.0){
          float fl=1.0-steep;
          float rp=sin((p.x*0.82+p.y*0.57)*5.5+snoise(p/3.1)*2.6+snoise(p/0.9+4.0)*0.7);
          c*=1.0+mSand*fl*nearK*nearK*0.085*rp;
          c=mix(c,c*vec3(1.06,1.03,0.95),mSand*nearK*0.5*vn(p/5.0+1.3));
          float lf=vn(p/1.3+3.0)*0.6+vn(p/0.45+6.0)*0.4;
          c=mix(c,vec3(0.36,0.27,0.14)*(0.8+0.5*lf),mLeaf*fl*nearK*smoothstep(0.42,0.62,lf)*0.55);
          c=mix(c,vec3(0.13,0.11,0.08),mLeaf*fl*nearK*smoothstep(0.40,0.26,lf)*0.45);
          c=mix(c,vec3(0.33,0.20,0.11)*(0.75+0.5*lf),mNeed*fl*nearK*(0.35+0.4*smoothstep(0.35,0.65,lf)));
          float pud=smoothstep(0.56,0.70,vn(p/2.1+8.0)*0.7+vn(p/0.7+2.0)*0.3);
          c=mix(c,vec3(0.10,0.11,0.09),mMud*fl*nearK*0.45*(1.0-pud));
          c=mix(c,vec3(0.16,0.21,0.22)+vec3(0.12)*pow(max(uSunDir.y,0.0),2.0),mMud*fl*nearK*pud*0.8);
        }
        // 잔 요철 명암 — 잔 얼룩의 기울기 · 해 방향
        if(nearK>0.0){
          vec2 e=vec2(0.25,0.0);
          vec2 gr=vec2(vn((p+e.xy)/0.8+3.1)-vn((p-e.xy)/0.8+3.1), vn((p+e.yx)/0.8+3.1)-vn((p-e.yx)/0.8+3.1));
          float lowSun=1.0-clamp(uSunDir.y,0.0,1.0);
          c*=1.0-dot(gr,normalize(uSunDir.xz+1e-4))*(0.18+0.32*lowSun)*nearK*(0.5+steep);
        }
        /* ── 발밑 결(30 m 안) — 가까이서 보면 물감 칠한 언덕처럼 매끈하던 것 ──────────
           ① 흙 알갱이(3·8 cm 두 겹) ② 잔돌 — 22 cm 보로노이 칸의 일부만 돌이 되고, 돌마다
           해 쪽 면은 밝고 반대쪽·밑동은 그늘(오목한 테두리) ③ 풀빛 땅엔 한 방향으로 늘인
           잡음으로 풀잎 결 ④ 오목한 데 그늘 — 잔 요철이 낮은 자리를 어둡게(흙 틈·발자국 자리).
           비탈 바위 위에서는 ①④만 남기고 풀 결은 뺀다. */
        float dK=clamp(1.0-vTD/30.0,0.0,1.0); dK*=dK;
        dK=max(dK,grav*clamp(1.0-vTD/48.0,0.0,1.0));        // 자갈밭의 돌은 48 m 까지 보인다
        if(dK>0.001){
          float gA=vn(p/0.03+11.3), gB=vn(p/0.08+5.7);
          c*=1.0+(0.26*(gA-0.5)+0.18*(gB-0.5))*dK;
          /* 칸 자리를 잡음으로 비틀어(±5 cm) 돌 둘레가 반듯한 다각형이 되지 않게 한다 — 안 비틀면 포장석처럼 보인다 */
          vec2 q=(p+(vec2(vn(p/0.31+1.7),vn(p/0.31+8.3))-0.5)*0.11)/0.19, qi=floor(q), qf=fract(q); float d1=9.0, d2=9.0; vec2 cid=vec2(0.0), dv=vec2(0.0);
          for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
            vec2 o=vec2(float(x),float(y)), r=o+th2(qi+o)-qf; float d=dot(r,r);
            if(d<d1){ d2=d1; d1=d; cid=qi+o; dv=r; } else if(d<d2) d2=d;
          }
          vec2 hs=th2(cid+7.1); d1=sqrt(d1);
          float edge=sqrt(d2)-d1;                                 // 이웃 칸 경계까지 — 자갈밭에선 칸 하나가 돌 하나다
          float green=clamp((c.g-max(c.r,c.b))*8.0,0.0,1.0);
          float stoneP=mix(0.08,0.025,green)+steep*0.18;          // 풀밭엔 돌이 드물고 비탈엔 많다
          stoneP=mix(stoneP,0.84,grav);                           // 자갈밭은 칸마다 거의 다 돌이다(여섯에 하나는 흙·잔자갈 틈)
          /* 돌은 둥근 동전이 아니다 — 칸마다 납작하게 눕히고 돌려, 둘레를 각진 잡음으로 깎는다 */
          vec2 ax=normalize(th2(cid+5.5)-0.5+1e-3); vec2 dl=vec2(dot(dv,ax),dot(dv,vec2(-ax.y,ax.x))*(1.3+0.9*hs.y));
          float ang=atan(dl.y,dl.x);
          d1=length(dl)/(0.78+0.22*sin(ang*3.0+hs.x*17.0)+0.12*sin(ang*5.0+hs.y*9.0));
          float rad=mix(0.13+0.2*hs.y*hs.y,0.55,grav);
          float st=step(1.0-stoneP,hs.x)*smoothstep(rad,rad-0.05,d1);
          /* 자갈밭 — 돌이 드문드문 박힌 흙이 아니라 **돌이 서로 맞닿아 깔린 밭**이다. 보로노이 칸 하나를 돌 하나로 치고
             (경계에서 3 cm 안쪽부터 돌) 칸 사이 경계가 돌 틈이 된다 */
          st=mix(st,step(1.0-stoneP,hs.x)*smoothstep(0.03,0.13,edge),grav);
          vec2 h3=th2(cid+3.3);
          vec3 sc=mix(vec3(0.42,0.40,0.37),vec3(0.55,0.50,0.43),h3.x)*(0.85+0.3*gB);
          /* 자갈밭의 돌은 색이 여럿이다 — 회색 · 누런 회색 바탕에 검푸른 돌(22%)과 흰 돌(10%)이 섞인다 */
          vec3 gp=mix(vec3(0.47,0.46,0.44),vec3(0.58,0.54,0.47),h3.x);
          gp=mix(gp,vec3(0.34,0.34,0.35),step(0.80,h3.y)); gp=mix(gp,vec3(0.66,0.64,0.60),step(h3.y,0.10));
          gp*=0.62+0.46*smoothstep(0.0,0.30,edge);                // 가운데는 밝고 둘레는 어둡게 — 납작한 타일이 아니라 둥근 돌로 읽힌다
          sc=mix(sc,gp*(0.9+0.2*gB),grav);
          c*=1.0-0.38*grav*dK*(1.0-st);                           // 돌 사이 틈은 그늘진 흙
          float lit=clamp(0.5-dot(normalize(-dv+1e-4),normalize(uSunDir.xz+1e-4))*0.5*(d1/rad),0.0,1.0);
          sc*=0.75+0.5*lit;
          c=mix(c,sc,st*dK);
          float rim=step(1.0-stoneP,hs.x)*smoothstep(rad+0.05,rad,d1)*(1.0-smoothstep(rad,rad-0.04,d1));
          c*=1.0-0.2*rim*dK;
          /* ── 바이옴마다 발밑의 것 ── 같은 보로노이 칸을 돌 대신 낙엽·조개 부스러기·들꽃으로도 쓴다 */
          float flat1=1.0-steep;
          /* 낙엽 — 활엽수림 바닥은 칸의 절반이 떨어진 잎 한 장(뾰족한 타원 + 가운데 잎맥) */
          /* step(hs.x, 0) 은 hs.x 가 정확히 0 일 때 1 이다 — float32 의 fract 는 256칸에 하나꼴로 딱 0 이 나와,
             낙엽이 없어야 할 자갈밭·모래에도 잎이 드문드문 찍혔다. 그래서 '작다(<)'로 엄격하게 가른다 */
          float isLeaf=((hs.x<0.5*mLeaf*flat1)?1.0:0.0)*(1.0-st);
          if(isLeaf>0.0){
            vec2 ld=vec2(dot(dv,ax),dot(dv,vec2(-ax.y,ax.x)));
            float lsh=smoothstep(1.0,0.80,length(vec2(ld.x/0.46,ld.y/0.22)));
            vec3 lc=mix(vec3(0.52,0.36,0.14),vec3(0.36,0.20,0.09),h3.x);
            lc=mix(lc,vec3(0.62,0.50,0.16),step(0.72,h3.y)); lc=mix(lc,vec3(0.30,0.33,0.12),step(h3.y,0.14));
            lc*=1.0-0.45*smoothstep(0.035,0.0,abs(ld.y))*step(abs(ld.x),0.40);
            c=mix(c,lc*(0.85+0.3*gB),lsh*isLeaf*dK);
          }
          /* 솔잎 — 두 방향으로 흩어진 가는 바늘 */
          if(mNeed>0.01){
            vec2 n1=vec2(p.x*0.8+p.y*0.6,-p.x*0.6+p.y*0.8), n2=vec2(p.x*0.3-p.y*0.95,p.x*0.95+p.y*0.3);
            float nd=max(smoothstep(0.62,0.80,vn(vec2(n1.x/0.006,n1.y/0.07))),smoothstep(0.64,0.82,vn(vec2(n2.x/0.006,n2.y/0.07)+9.0)));
            c=mix(c,vec3(0.50,0.30,0.14),nd*mNeed*flat1*dK*0.6*(1.0-st));
          }
          /* 모래 — 반짝이는 알갱이와 드문 조개 부스러기 */
          if(mSand>0.01){
            c+=vec3(0.16,0.15,0.12)*step(0.965,th2(floor(p/0.014)).x)*mSand*dK*(1.0-st);
            c=mix(c,vec3(0.90,0.86,0.78),step(hs.x,0.03)*smoothstep(0.20,0.14,length(dv))*(1.0-st)*mSand*dK);
          }
          /* 풀밭 — 드문드문 핀 들꽃(흰·노랑·보라) */
          float flw=step(hs.x,0.022)*smoothstep(0.35,0.75,green)*(1.0-mLeaf)*(1.0-mNeed)*(1.0-grav)*(1.0-mSand)*flat1;   // 풀빛이 뚜렷한 데만(자갈밭·모래엔 안 핀다)
          if(flw>0.0){
            float fr=length(dv);
            vec3 fcol=h3.x<0.4?vec3(0.95,0.95,0.90):(h3.x<0.75?vec3(0.95,0.80,0.20):vec3(0.62,0.45,0.85));
            c=mix(c,fcol,smoothstep(0.17,0.12,fr)*flw*dK);
            c=mix(c,vec3(0.85,0.60,0.10),smoothstep(0.06,0.04,fr)*flw*dK);
          }
          /* 마른 땅(관목지) — 갈라진 금 */
          float dry=clamp(1.0-green*1.5-mSand-mLeaf-mNeed-mMud-grav-steep,0.0,1.0);
          c*=1.0-0.30*dry*smoothstep(0.045,0.0,edge)*dK;
          vec2 gq=vec2(p.x*0.6+p.y*0.8,-p.x*0.8+p.y*0.6);
          float blade=vn(vec2(gq.x/0.012,gq.y/0.12)+vn(p/0.5)*3.0);
          c*=1.0+0.30*(blade-0.5)*green*(1.0-steep)*dK*(1.0-st);
          float cav=smoothstep(0.42,0.25,fine*0.6+gB*0.4);
          c*=1.0-0.25*cav*dK;
        }
        diffuseColor.rgb=c;
      }`);
  };
  m.customProgramCacheKey=()=>'terrain'+(GND_OK()?'-photo':'');
  return m;
}
/* ── 암석 재질 ──────────────────────────────────────────────────────────
   광물 색 한 가지로 칠하던 암석에 화소마다 네 겹을 얹는다(`rockMat`, 광물마다 셰이더 하나):
   ① 얼룩 — 값잡음 두 겹(1.2 m · 0.25 m)으로 명도·색조를 흔든다
   ② 결 — `LUSTRE[k].tex` 를 따른다: speck(화강암·자갈 — 검고 흰 알갱이), vein(구리 — 공작석
      녹색 줄), crack(석탄 — 가는 검은 금), step(방연석·섬아연석 — 층층 어긋난 띠),
      grain(철·주석 — 잔 알갱이 반짝임), botry(황·진사 — 둥근 혹 그늘), conch(부싯돌 — 조개 무늬 물결)
   ③ 윗면 이끼·지의류 — 위를 향한 면(법선 y>0.55)에 얼룩덜룩 회녹색. 황·진사는 안 낀다
   ④ 밑동 그늘 — 땅에 닿은 아래쪽은 빛이 덜 든다(앰비언트 오클루전 흉내)
   금속 광택(`met`)은 해 방향 반사 하이라이트로 얹는다 — 램버트는 반사가 없어서다. */
function rockMat(k,col){
  const m=new THREE.MeshLambertMaterial({color:col});
  const L=LUSTRE[k]||{met:0.05,tex:'speck'};
  const TEX={speck:0,vein:1,crack:2,step:3,grain:4,botry:5,conch:6,smooth:7}[L.tex]||0;
  const moss=(k==='sulfur'||k==='cinnabar')?0:1;
  const FACET=(HABIT[k]&&HABIT[k].smooth===0)?1:0;      // 면마다 각진 바위만 면별 톤을 준다
  const PHOTO=GND_OK();                                 // 사진 결을 쓸 수 있나(22-ground-textures.js)
  const big=!(k==='pebble'||k==='flint');
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,TERR_U);
    sh.vertexShader='varying vec3 vRW;\nvarying vec3 vRN;\nvarying vec3 vRV;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvRW=(modelMatrix*vec4(transformed,1.0)).xyz;\nvRN=normal;\nvRV=(modelViewMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader=`uniform vec3 uSunDir;
varying vec3 vRW;
varying vec3 vRN;
varying vec3 vRV;
${PHOTO?'uniform mediump sampler2DArray uGnd;':''}
float rh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float rn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z); }
/* 광물 알갱이 — 격자 칸마다 흔든 씨앗점 하나를 두고 가장 가까운 씨앗이 그 자리의 알갱이다
   (보로노이). floor(p) 로 칸을 통째로 칠하면 알갱이가 정육면체라 네모가 줄지어 보였다.
   x = 그 알갱이의 난수(무슨 광물인지), y = 알갱이 경계까지 거리(가장 가까운 둘의 차) */
vec2 grain(vec3 p){
  vec3 i=floor(p), f=fract(p); float d1=9.0, d2=9.0, id=0.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 c=vec3(float(x),float(y),float(z));
    vec3 o=vec3(rh(i+c),rh(i+c+17.3),rh(i+c+41.9));
    float d=length(c+o-f);
    if(d<d1){ d2=d1; d1=d; id=rh(i+c+7.7); } else if(d<d2) d2=d;
  }
  return vec2(id,d2-d1);
}
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      {
        vec3 p=vRW; vec3 n=normalize(vRN);
        float dist=length(vRV), nearK=clamp(1.0-dist/60.0,0.0,1.0);   // 카메라 공간에서 잰다(세계 cameraPosition 으로 쟀더니 0 이 나왔다)
        vec3 c=diffuseColor.rgb;
        float a=rn(p/1.2), b=rn(p/0.25+3.7);
        /* 만화풍 — 얼룩은 옅게, 대신 **면마다 한 톤**(법선을 굵게 끊어 뽑은 난수)을 달리 칠한다.
           바위가 면마다 각져 있어(HABIT smooth 0) 면 하나가 한 가지 밝기의 판으로 읽힌다 */
        c*=0.92+0.16*a;
        c*=mix(1.0,0.95+0.10*b,nearK);
        c*=mix(vec3(1.04,1.0,0.95),vec3(0.95,0.98,1.05),rn(p/3.0+9.1));
        c*=mix(1.0,0.90+0.20*rh(floor(n*5.0+0.5)+floor(p/4.0)),${FACET}.0);
        int T=${TEX};
        float f=rn(p/0.05+1.3);
        /* 알갱이(화강암·자갈) — 예전엔 3.5 cm 칸을 검정·흰색으로 빽빽이 칠해 QR 코드 같았다.
           이제 12 cm 칸에 **드문드문 둥근 점**만 찍는다(어두운 점 9% · 밝은 점 8%, 가장자리는 부드럽게) */
        ${PHOTO?`/* 사진 결 — 진짜 바위 사진(4번 층)을 x·y·z 세 방향에서 읽어 면이 보는 쪽대로 섞는다(늘어짐 없이 감긴다).
           큰 바위는 0.9 m 에 한 장, 자갈·부싯돌은 손바닥만 하니 0.3 m 에 한 장. 그린 점무늬(예전)는 모자이크 같았다 */
        { vec3 tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4; float RS=${big?'0.9':'0.3'};
          vec3 rk=texture(uGnd,vec3(p.zy/RS,4.0)).rgb*tw.x+texture(uGnd,vec3(p.xz/RS,4.0)).rgb*tw.y+texture(uGnd,vec3(p.xy/RS,4.0)).rgb*tw.z;
          c*=mix(vec3(1.0),rk*2.0,0.9); }`
        :`if(T==0){ vec2 gr=grain(p/0.12+rn(p/0.5)*0.5); float g=gr.x; float dot0=smoothstep(0.10,0.30,gr.y);
          c=mix(c,c*0.55,step(0.91,g)*dot0*0.8*nearK); c=mix(c,min(c*1.45,vec3(0.92)),step(g,0.08)*dot0*0.7*nearK); }`}
        /* 줄무늬 셋 — 예전엔 셋 다 세계 높이 p.y 에 맨 곧은 띠라 모든 바위가 같은 가로 줄무늬(얼룩말)였다.
           이제 광물마다 실제 결을 따른다. 결의 방향은 6 m 짜리 잡음으로 천천히 돌려 바위마다 다르게 눕는다. */
        vec3 ax=normalize(vec3(rn(p/6.0+0.5)-0.5,0.6,rn(p/6.0+3.5)-0.5));   // 이어지는 잡음이라 한 바위 안에서 끊기지 않는다
        if(T==1){
          /* 공작석 — 사진처럼 **가는 띠가 촘촘히 겹겹이** 굽이친다. 짙은 녹색 바탕에 밝은 녹색 가는 선,
             중심(눈)이 여럿이라 띠가 서로 밀어 휘고, 곳곳에 작은 동그란 눈이 박힌다.
             띠 간격 약 1.5 cm(주파수 420) · 선 굵기는 띠의 12% 안팎으로 가늘게 · 잡음으로 크게 휘게 한다 */
          vec3 q=p+(vec3(rn(p/0.45),rn(p/0.45+2.1),rn(p/0.45+4.3))-0.5)*0.30
                  +(vec3(rn(p/0.12+7.0),rn(p/0.12+9.0),rn(p/0.12+11.0))-0.5)*0.03;
          /* 띠의 중심(눈)은 0.9 m 칸마다 하나 — **가장 가까운 눈을 둘레 27칸에서 찾는다**(보로노이).
             제 칸 눈만 쓰면 칸 경계에서 띠가 뚝 끊겨 바위에 네모 조각이 졌다. */
          vec3 qi=floor(q/0.9); float r=9.0;
          for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
            vec3 ci=qi+vec3(float(x),float(y),float(z));
            vec3 cc=ci*0.9+0.45+(vec3(rh(ci),rh(ci+5.0),rh(ci+9.0))-0.5)*0.5;
            r=min(r,length(q-cc));
          }
          /* 띠 간격 약 1.4 cm(주파수 70). 예전 420(2.4 mm)은 화소보다 가늘어 뭉개졌다.
             화소 하나가 덮는 길이(거리×0.0016)가 띠 폭에 가까워지면 무늬를 평균색으로 녹인다 */
          float FQ=140.0;   // 띠 간격 약 7 mm
          float t=r*FQ+rn(p/0.2)*3.0;
          float w=fract(t), idb=floor(t);
          float line=1.0-smoothstep(0.0,0.14+0.08*rh(vec3(idb,1.0,2.0)),abs(w-0.5)*2.0-0.70);
          float tone=rh(vec3(idb,3.0,4.0));
          vec3 mal=mix(vec3(0.008,0.07,0.035),vec3(0.015,0.17,0.085),smoothstep(0.2,0.9,tone));
          mal=mix(mal,vec3(0.07,0.30,0.17),clamp(1.0-line,0.0,1.0)*step(0.35,tone)*0.9);
          mal=mix(mal,vec3(0.05,0.26,0.15),(1.0-smoothstep(0.0,0.02,r))*0.9);
          c=mal*mix(1.0,0.9+0.2*a,0.5);                                                          // 온 바위가 공작석 — 본래 색은 안 남긴다
        }
        else if(T==2){
          /* 석탄 — 반짝이는 띠(비트레인)와 흐린 띠(듀레인)가 켜켜이 · 층에 수직으로 두 갈래 결리(갈라진 금) */
          float t=dot(p,ax)*9.0+rn(p/0.6)*2.5;
          float layer=rn(vec3(floor(t),0.0,3.1));
          float lf=fract(t);
          c*=mix(0.78,1.25,step(0.62,layer))*(0.92+0.08*smoothstep(0.0,0.15,lf)*smoothstep(1.0,0.85,lf));
          vec3 b1=normalize(cross(ax,vec3(0.0,0.0,1.0))), b2=cross(ax,b1);
          float k1=abs(fract(dot(p,b1)*2.6+rn(p/0.4)*0.3)-0.5), k2=abs(fract(dot(p,b2)*1.7+rn(p/0.5+2.0)*0.3)-0.5);
          float crackk=(1.0-smoothstep(0.0,0.035,k1))*step(0.45,rn(p/0.7+5.0))
                      +(1.0-smoothstep(0.0,0.03,k2))*step(0.6,rn(p/0.9+9.0));
          c*=1.0-clamp(crackk,0.0,1.0)*0.65*mix(0.4,1.0,nearK);
        }
        else if(T==3){
          /* 방연석·섬아연석 — 정육면체 쪼개짐. 돌린 좌표에서 크기가 들쭉날쭉한 네모 조각(두 겹 크기)이
             계단처럼 어긋나고, 조각마다 볕을 받는 정도가 달라 면이 반짝인다. 조각 사이는 가는 금. */
          vec3 bx=normalize(cross(ax,vec3(0.3,0.1,1.0))), by=cross(ax,bx);
          vec3 q=vec3(dot(p,bx),dot(p,ax),dot(p,by));
          float sz=mix(0.22,0.09,step(0.5,rn(floor(q/0.66)+1.9)));        // 큰 조각 사이사이 잔 조각
          vec3 qc=q/sz; vec3 id=floor(qc), f=fract(qc);
          float face=rn(id*1.7+0.3);
          float e=min(min(min(f.x,1.0-f.x),min(f.y,1.0-f.y)),min(f.z,1.0-f.z));
          c*=mix(1.0,0.78+0.42*face,mix(0.55,1.0,nearK));
          c*=1.0-(1.0-smoothstep(0.0,0.04,e))*0.25*nearK;                 // 조각 사이 금
          c+=vec3(0.18)*step(0.86,face)*nearK*${L.met.toFixed(2)};        // 볕 받은 면의 번쩍임
        }
        else if(T==4){ vec2 gr=grain(p/0.07); c*=1.0+step(0.955,gr.x)*smoothstep(0.08,0.25,gr.y)*0.45*nearK; }   // 잔 반짝임 — 드물고 옅게
        else if(T==5){ c*=0.7+0.5*smoothstep(0.2,0.7,rn(p/0.12)); }
        else if(T==6){ c*=0.85+0.25*sin(length(p.xz-floor(p.xz/0.4)*0.4)*40.0)*nearK; }
        // 이끼·지의류 — 위를 향한 면
        float up=smoothstep(0.55,0.85,n.y)*${moss}.0;
        /* 이끼는 둥근 얼룩이 아니라 방석이 번져 붙은 꼴이다 — 자리를 잡음으로 비틀고(도메인 워프)
           세 겹 잡음을 문턱으로 잘라 가장자리를 들쭉날쭉하게, 안쪽엔 방석 결과 빈틈을 둔다 */
        vec3 wq=p+(vec3(rn(p/0.9),rn(p/0.9+5.3),rn(p/0.9+8.1))-0.5)*0.9;
        float mm=rn(wq/0.8+2.2)*0.55+rn(wq/0.28+1.7)*0.30+rn(wq/0.09+4.4)*0.15;
        float lichen=smoothstep(0.50,0.56,mm+0.18*(up-1.0))*up;
        float tuft=mix(0.8,0.55+0.7*rn(p/0.035+6.1),nearK);                 // 방석마다 도톰한 결
        vec3 mc=mix(vec3(0.24,0.34,0.13),vec3(0.33,0.40,0.15),rn(wq/1.6+7.7)); // 짙은 풀빛 ↔ 누런 풀빛
        mc*=0.75+0.35*smoothstep(0.50,0.75,mm);                               // 가장자리는 얇아 어둡다
        c=mix(c,mc*tuft,lichen*0.92);
        // 밑동 그늘 — 만화처럼 **단을 지어** 칠한다: 아래를 보는 면은 짙게, 위를 보는 면은 한 톤 밝게
        c*=mix(0.64,1.0,smoothstep(-0.38,-0.22,n.y))*mix(1.0,1.10,smoothstep(0.42,0.56,n.y));
        // 테두리 — 눈에서 비껴 선 면(윤곽 쪽)을 어둡게 눌러 잉크 선 같은 가장자리를 낸다
        { vec3 Vr=-normalize(vRV), nr=normalize(mat3(viewMatrix)*n);
          c*=mix(0.60,1.0,smoothstep(0.04,0.38,abs(dot(nr,Vr)))); }
        // 금속 광택 — 해 쪽 반사
        vec3 V=-normalize(vRV), nv=normalize(mat3(viewMatrix)*n), sv=normalize(mat3(viewMatrix)*uSunDir);
        float sp=pow(max(dot(reflect(-sv,nv),V),0.0),24.0)*${L.met.toFixed(2)}*max(uSunDir.y,0.0);
        c+=vec3(sp*0.7);
        diffuseColor.rgb=c;
      }`);
  };
  m.customProgramCacheKey=()=>'rock-'+k+(PHOTO?'-photo':'');
  return m;
}
/* ── 지형 청크 · 거리 단계(LOD) ──────────────────────────────────────────
   청크(80 m · 32×32 칸)는 **인덱스 지오메트리**다 — 격자점 33×33 = 1,089 정점을 세모들이 나눠 쓴다.
   예전엔 세모마다 정점 셋을 따로 둬서(6,144 정점) 정점 셰이더(램버트는 조명을 정점에서 센다)가
   5.6배 더 돌았고 메모리도 청크 576 개에 127 MB 였다(이제 22 MB).
   **먼 청크는 속 격자를 건너뛴다**(`TERR_LOD` — 2·4·8 칸마다 한 점). 이웃 청크와 맞닿는 테두리 한 줄은
   어느 단계든 **늘 촘촘한 그대로** 두고, 그 테두리와 성긴 속 격자 사이만 지퍼처럼 세모로 잇는다 —
   그래서 이웃끼리 단계가 달라도 틈(갈라진 금)이 안 생기고 치마도 필요 없다. 단계마다 세모 수:
   1칸 2,048 · 2칸 576 · 4칸 224 · 8칸 144. 네 단계의 인덱스를 한 버퍼에 이어 담아 모든 청크가 나눠 쓰고,
   청크는 `setDrawRange` 로 제 단계 구간만 그린다(버퍼를 갈아 끼우지 않는다).
   단계는 **화면 오차**로 고른다(`updateTerrainLOD`) — 지을 때 단계마다 '성긴 면이 참 높이에서 벗어나는
   가장 큰 값'(m)을 재 두고(`lodErr`), 그 오차가 화면에서 `TERR_LOD_PX`(1 화소) 밑이 되는 가장 성긴 단계를 쓴다.
   평평한 데는 일찍, 험한 데는 늦게 성겨진다. `TERR_LOD_NEAR`(60 m) 안은 늘 촘촘하다.
   섬 끝 청크는 격자가 31 칸이라 마지막 줄을 되풀이해 32 칸으로 맞춘다(넓이 0 세모 — 안 보인다). */
const TERR_LOD=[1,2,4,8], TERR_LOD_PX=1.0, TERR_LOD_NEAR=60;
let TERR_IDX=null;               // {attr, ranges:[[처음,개수]…]} — 모든 청크가 나눠 쓴다
function terrainLodIndex(n){
  const nv=n+1, V=(i,j)=>j*nv+i, out=[], ranges=[];
  const tri=(a,b,c)=>{
    // 위(+y)를 보게 — 세모 (a,b,c) 의 (b−a)×(c−a) 의 y 성분이 양수여야 앞면이 위다
    const ax=a%nv, az=(a/nv)|0, bx=b%nv, bz=(b/nv)|0, cx=c%nv, cz=(c/nv)|0;
    const cy=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);
    if(cy===0) return; if(cy>0) out.push(a,b,c); else out.push(a,c,b);
  };
  for(const st of TERR_LOD){
    const s0=out.length;
    if(st===1){
      for(let j=0;j<n;j++) for(let i=0;i<n;i++){ tri(V(i,j),V(i,j+1),V(i+1,j)); tri(V(i+1,j),V(i,j+1),V(i+1,j+1)); }
    }else{
      const M=n/st-2;                     // 속 격자 칸 수(한 변)
      for(let b=st;b<=n-2*st;b+=st) for(let a=st;a<=n-2*st;a+=st){
        tri(V(a,b),V(a,b+st),V(a+st,b)); tri(V(a+st,b),V(a,b+st),V(a+st,b+st));
      }
      /* 테두리 띠 넷 — 바깥 촘촘한 줄(0..n)과 안쪽 성긴 줄(st..n−st)을 지퍼로 잇는다.
         side 는 (바깥 점, 안쪽 점) 을 매개 t 로 돌려준다 */
      const sides=[
        [k=>V(k,0),   m=>V(st+m*st,st)],
        [k=>V(n,k),   m=>V(n-st,st+m*st)],
        [k=>V(n-k,n), m=>V(n-st-m*st,n-st)],
        [k=>V(0,n-k), m=>V(st,n-st-m*st)]];
      for(const [O,I] of sides){
        let o=0, q=0;
        while(o<n||q<M){
          if(q>=M||(o<n&&(o+1)/n<=(st+(q+1)*st)/n)){ tri(O(o),O(o+1),I(q)); o++; }
          else{ tri(O(o),I(q+1),I(q)); q++; }
        }
      }
    }
    ranges.push([s0,out.length-s0]);
  }
  const arr=nv*nv>65535?new Uint32Array(out):new Uint16Array(out);
  return {attr:new THREE.BufferAttribute(arr,1), ranges};
}
function buildChunks(){
  _tlK=NaN;                                  // 새 청크 — 다음 updateTerrainLOD 가 단계를 다시 고른다
  for(const m of chunks){ scene.remove(m); m.geometry.dispose(); }
  chunks.length=0;
  const col=new THREE.Color();
  // 면 단위 각짐을 없앤다 — 법선과 색을 정점마다 따로 주고 부드럽게 보간한다
  const mat=terrainMat();
  const n=CH, nv=CH+1;
  if(!TERR_IDX) TERR_IDX=terrainLodIndex(n);
  const H=new Float32Array(nv*nv);
  for(let cz=0;cz<NC;cz++) for(let cx=0;cx<NC;cx++){
    const x0=cx*CH, z0=cz*CH;
    const pos=new Float32Array(nv*nv*3), c=new Float32Array(nv*nv*3), nor=new Float32Array(nv*nv*3);
    // 정점마다 높이장의 기울기에서 법선을 직접 구한다.
    // 이웃 청크도 같은 전역 격자를 보므로 경계에서 이음매가 생기지 않는다.
    for(let j=0;j<nv;j++) for(let i=0;i<nv;i++){
      const x=Math.min(N-1,x0+i), z=Math.min(N-1,z0+j), id=IDX(x,z), p=(j*nv+i)*3;
      pos[p]=(x-N/2)*CELL; pos[p+1]=F.elev[id]; pos[p+2]=(z-N/2)*CELL; H[j*nv+i]=F.elev[id];
      // ±2 셀 스텐실 — 폭을 넓히면 셀 단위 요철이 조명에 덜 드러난다
      const xm=Math.max(0,x-2), xp=Math.min(N-1,x+2);
      const zm=Math.max(0,z-2), zp=Math.min(N-1,z+2);
      const gx=(F.elev[IDX(xp,z)]-F.elev[IDX(xm,z)])/((xp-xm)*CELL);
      const gz=(F.elev[IDX(x,zp)]-F.elev[IDX(x,zm)])/((zp-zm)*CELL);
      const inv=1/Math.sqrt(gx*gx+1+gz*gz);
      nor[p]=-gx*inv; nor[p+1]=inv; nor[p+2]=-gz*inv;
      biomeColorAt(id,col);
      c[p]=col.r; c[p+1]=col.g; c[p+2]=col.b;
    }
    /* 단계마다 오차 — 성긴 칸(st×st) 네 모서리의 쌍선형 면이 그 안 격자점 참 높이에서 벗어나는 가장 큰 값.
       테두리 띠는 세모가 다르지만 어림으로 같이 잰다 */
    const err=[0];
    for(let k=1;k<TERR_LOD.length;k++){
      const st=TERR_LOD[k]; let e=0;
      for(let b=0;b<n;b+=st) for(let a=0;a<n;a+=st){
        const h00=H[b*nv+a], h10=H[b*nv+a+st], h01=H[(b+st)*nv+a], h11=H[(b+st)*nv+a+st];
        for(let j=0;j<=st;j++) for(let i=0;i<=st;i++){
          const u=i/st, v=j/st, hb=(h00*(1-u)+h10*u)*(1-v)+(h01*(1-u)+h11*u)*v;
          const d=Math.abs(H[(b+j)*nv+a+i]-hb); if(d>e) e=d;
        }
      }
      err.push(e);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.BufferAttribute(c,3));
    g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    g.setIndex(TERR_IDX.attr);
    g.setDrawRange(TERR_IDX.ranges[0][0],TERR_IDX.ranges[0][1]);
    g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat);
    m.userData.lodErr=err; m.userData.lod=0;
    scene.add(m); chunks.push(m);
  }
}
/* 청크마다 단계를 고른다 — 카메라에서 청크 경계구까지 거리 d, 오차 e 가 화면에서 e·K/d 화소
   (K = 화면 높이 / (2·tan(화각/2))). 1 화소 밑이 되는 가장 성긴 단계 */
const TERR_STAT=[0,0,0,0];
let _tlX=NaN, _tlY=NaN, _tlZ=NaN, _tlK=NaN;     // 지난번 카메라 자리·화면 배율 — 같으면 단계도 같다
function updateTerrainLOD(){
  if(!TERR_IDX||!chunks.length) return;
  const K=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360)), cp=camera.position;
  if(cp.x===_tlX&&cp.y===_tlY&&cp.z===_tlZ&&K===_tlK) return;
  _tlX=cp.x; _tlY=cp.y; _tlZ=cp.z; _tlK=K;
  TERR_STAT.fill(0);
  for(const m of chunks){
    const bs=m.geometry.boundingSphere, d=Math.max(1,cp.distanceTo(bs.center)-bs.radius), E=m.userData.lodErr;
    let lv=0;
    if(d>TERR_LOD_NEAR) for(let k=E.length-1;k>0;k--) if(E[k]*K/d<TERR_LOD_PX){ lv=k; break; }
    if(lv!==m.userData.lod){ m.userData.lod=lv; const r=TERR_IDX.ranges[lv]; m.geometry.setDrawRange(r[0],r[1]); }
    TERR_STAT[lv]++;
  }
}

/* ── 물 ─────────────────────────────────────────────────────────────────
   예전 물은 단색 반투명 판에, CPU 가 매 프레임 정점을 흔들고 법선을 다시 셌다.
   이제 **셰이더가 물을 계산한다**(`waterMat`):
   ① **파도** — 방향·파장이 다른 사인파 여덟 겹. 빠르기는 심해파 분산 ω=√(g·k) 로
      파장에서 나온다(긴 파도가 빠르다). 굵은 셋은 정점을 들어 올리고, 잔 다섯은
      화소마다 법선만 흔든다(멀수록 흐려 반짝임이 들끓지 않게).
   ② **반사** — 프레넬(슐릭, 물 F0 0.02): 내려다보면 물속이 보이고, 비스듬히 볼수록
      하늘이 비친다. 비치는 하늘은 반사 방향의 높이로 지평선색↔천정색을 섞는다.
   ③ **해 반짝임** — 반사 방향이 해와 맞는 화소(물결 하나하나가 작은 거울).
   ④ **물속** — 수심 d(지형 높이 텍스처 `waterElevTex` 로 잰다)만큼 빛이 빠진다.
      물은 빨강을 가장 빨리 먹는다(흡수 0.45·0.07·0.04 /m) — 얕은 데는 모래가 비친
      청록, 깊은 데는 남색이다. 오가는 길이라 2d 로 센다.
   ⑤ **거품** — 물가 얕은 띠(0.5 m 안)에 밀려왔다 빠지는 흰 거품.
   ⑥ 물가에서는 알파를 0 으로 내려 땅과 이음매 없이 섞는다.
   빛은 스스로 계산한다(MeshBasic + 손수 조명) — 셰이더 물에는 램버트 조명이 안 맞는다.
   그래서 물 위에는 물체·구름 그림자가 지지 않는다. */
let waterElevTex=null;
const WATER_U={uTime:{value:0}, uSunDir:{value:new THREE.Vector3(0,1,0)},
  uSunCol:{value:new THREE.Color(1,1,1)}, uAmb:{value:new THREE.Color(0.3,0.35,0.4)},
  uSkyZ:{value:new THREE.Color(0.3,0.5,0.9)}, uSkyH:{value:new THREE.Color(0.7,0.8,0.9)},
  uElev:{value:null}, uGrid:{value:new THREE.Vector2(768,2.5)}};
function waterMat(river){
  /* 램버트로 세우는 까닭은 오직 그림자다 — 조명은 아래에서 손수 센다. 램버트여야 그림자 지도
     유니폼이 붙고 `envPatch` 가 구름 그림자(`cloudSh`)를 얹는다. 예전엔 MeshBasic 이라 물에
     바위·나무·구름 그림자가 하나도 안 졌다 */
  const m=new THREE.MeshLambertMaterial({transparent:true,depthWrite:true});
  m.userData.lightRole='recv';
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,WATER_U);
    sh.uniforms.uWT=WATER_U.uTime;   // envPatch 가 제 uTime(바람 시계)을 따로 선언하므로 이름을 가른다
    sh.uniforms.uRiver={value:river?1:0};
    const WAVES=`
    const float G=9.81;
    // (방향 각, 파장 m, 진폭 m) — 굵은 셋은 정점, 잔 다섯은 법선만
    vec3 wv(int i){
      if(i==0) return vec3(0.35,62.0,0.30); if(i==1) return vec3(-0.55,37.0,0.20);
      if(i==2) return vec3(1.20,21.0,0.10); if(i==3) return vec3(0.05,8.7,0.045);
      if(i==4) return vec3(-1.10,5.3,0.028); if(i==5) return vec3(0.80,3.1,0.017);
      if(i==6) return vec3(2.30,1.7,0.009); return vec3(-2.60,0.9,0.005); }
    `;
    sh.vertexShader='uniform float uWT;\nuniform float uRiver;\nvarying vec3 vWW;\nvarying vec3 vVD;\nvarying vec3 vWN;\nattribute float aEdge;\nvarying float vEdge;\n'+WAVES+
      sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 wp0=(modelMatrix*vec4(transformed,1.0)).xyz;
      if(uRiver<0.5){
        for(int i=0;i<3;i++){ vec3 w=wv(i); vec2 d=vec2(cos(w.x),sin(w.x)); float k=6.2832/w.y;
          transformed.y+=w.z*sin(k*dot(d,wp0.xz)-sqrt(G*k)*uWT); }
      }
      vWW=(modelMatrix*vec4(transformed,1.0)).xyz;
      vWN=normalize(mat3(modelMatrix)*normal);       // 수면의 기울기 — 바다는 곧게 위, 하천은 물길을 따라 눕는다
      vEdge=aEdge;
      // 눈→물 방향(세계) — 카메라 공간 위치를 뷰 행렬의 회전으로 되돌린다(cameraPosition 은 믿지 않는다)
      vec3 mvp=(modelViewMatrix*vec4(transformed,1.0)).xyz;
      vVD=vec3(dot(viewMatrix[0].xyz,mvp),dot(viewMatrix[1].xyz,mvp),dot(viewMatrix[2].xyz,mvp));`);
    sh.fragmentShader=`uniform float uWT;
uniform float uRiver;
varying float vEdge;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uAmb;
uniform vec3 uSkyZ;
uniform vec3 uSkyH;
uniform sampler2D uElev;
uniform sampler2D uNz;
uniform vec2 uGrid;
varying vec3 vWW;
varying vec3 vVD;
varying vec3 vWN;
`+WAVES+`
float elev1(vec2 g){ vec4 t=texture2D(uElev,(g+0.5)/uGrid.x); return (t.r*255.0*256.0+t.g*255.0)/65535.0*300.0-100.0; }
// 16비트를 나눠 담았으니 텍스처 보간은 못 쓴다 — 네 점을 직접 섞는다
float elevAt(vec2 xz){ vec2 g=xz/uGrid.y+uGrid.x*0.5; vec2 i=floor(g), f=g-i;
  return mix(mix(elev1(i),elev1(i+vec2(1,0)),f.x),mix(elev1(i+vec2(0,1)),elev1(i+vec2(1,1)),f.x),f.y); }
`+sh.fragmentShader.replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',`
      // 직사광만 가린다 — 하늘 반사·하늘빛은 그늘에서도 그대로다
      float shM=getShadowMask()*cloudSh();
      float dist=length(vVD);
      // 법선 — 여덟 겹 파도의 기울기를 더한다(잔 파도는 멀수록 흐리게)
      vec2 grad=vec2(0.0);
      float ampK=uRiver>0.5?0.25:1.0;
      /* 화소 하나가 덮는 수면 길이(발자국) — 멀수록, 스치듯 볼수록(1/sinθ) 길어진다.
         물결 한 파장이 화소 몇 개보다 작아지면 눈은 그 물결을 **따로 보지 못하고 평균**만 본다.
         그런데 법선을 그 자리 한 점에서만 뽑으면 화소마다 제멋대로 튀어(에일리어싱) 수평선에
         자글자글한 무늬가 섰다. 그래서 파장이 발자국의 4배보다 짧은 물결은 법선에서 걷어 내고,
         걷어 낸 기울기의 분산(σ²)은 **거칠기**로 돌린다 — 반사가 뭉개지고 반짝임이 넓게 번진다
         (실제 먼 바다가 매끈한 광택 띠로 보이는 까닭). */
      vec3 V=-normalize(vVD);
      float foot=dist*0.0016/max(abs(V.y),0.04);
      float lost=0.0;
      for(int i=0;i<8;i++){ vec3 w=wv(i); vec2 d=vec2(cos(w.x),sin(w.x)); float k=6.2832/w.y;
        float fade=clamp(w.y/(foot*4.0)-1.0,0.0,1.0);
        float sl=w.z*k*ampK;                                   // 이 물결의 기울기 진폭
        if(fade>0.0) grad+=d*(sl*cos(k*dot(d,vWW.xz)-sqrt(G*k)*uWT))*fade;   // 다 걷어 낸 물결(먼 물)은 cos 를 안 센다 — 0 을 더하던 것
        lost+=0.5*sl*sl*(1.0-fade*fade); }
      /* 물결 기울기를 **수면의 기울기 위에** 얹는다. 예전엔 수면이 늘 수평이라고 쳤다 — 비탈을 타고 내려오는 하천을
         아래쪽(하류)에서 올려다보면 눈이 수면보다 낮아 '밑에서 본 것'으로 잘못 갈려, 프레넬이 1 이 되고 물길 전체가
         하늘을 통째로 비추는 흰 띠로 빛났다(사용자 지적: 하천에서 오르막을 볼 때 물빛이 기괴하다). */
      vec3 Ng=normalize(vWN);
      vec3 Nw=normalize(Ng+vec3(-grad.x,0.0,-grad.y));
      float under=step(dot(Ng,V),0.0);                 // 정말로 수면 밑(물속)에서 올려다보는가
      if(under>0.5){ Nw=Ng; }
      vec3 Rr=reflect(-V,Nw); Rr.y=abs(Rr.y);
      /* ① 프레넬 — 쉴릭 어림 대신 **편광 없는 빛의 프레넬 식 그대로**(공기 1 → 물 1.333).
         수직으로 내려다보면 2% 만 비치고, 스치는 각일수록 하늘이 거울처럼 비친다. */
      float ci=clamp(dot(Nw,V),1e-4,1.0);
      float st2=(1.0-ci*ci)/1.7769, ct=sqrt(max(0.0,1.0-st2));
      float rs=(ci-1.333*ct)/(ci+1.333*ct), rp=(ct-1.333*ci)/(ct+1.333*ci);
      float F=0.5*(rs*rs+rp*rp);
      /* 비치는 하늘 — 하늘빛은 지평선에서 몇 도만 올라가도 천정색에 가까워진다(지평선이 흰 건
         공기를 길게 지나서다). 높이에 곧게 섞었더니 물결에 비친 하늘이 온통 지평선 흰빛이라
         한낮 바다가 회색 거울이었다 */
      vec3 sky=mix(uSkyH,uSkyZ,1.0-exp(-Rr.y*9.0));
      /* 하천은 거울이 아니다 — 좁고 물살이 잘아 하늘이 통째로 비치지 않고, 둑·나무 그늘이 섞여 비친다.
         비치는 몫을 0.42 에서 막고, 비치는 빛도 하늘과 둘레 어둠을 반씩 섞는다 */
      /* **비치는 것이 하늘인가 뭍인가**(사용자 지적: 물빛을 죽이지 말고 비치는 얼개를 고쳐라) — 예전엔 하천이 하늘을
         통째로 비추지 않게 비치는 몫을 0.42 로 막고 잿빛을 반 섞었다. 그래서 물이 칙칙했다. 이제 반사된 빛줄기를 따라
         네 걸음(3 · 9 · 27 · 81 m) 나가 보고, 그 자리의 땅(뭍이면 나무 키 3 m 를 더해)이 빛줄기보다 높으면 **뭍이 비친
         것**으로 친다 — 둑과 숲에 싸인 하천은 어두운 풀빛이 비치고, 트인 데서는 하늘이 그대로 비친다. 바닷가 얕은 물에도
         섬이 비친다. 땅 높이 텍스처를 네 번 읽는 값이다 */
      float hitK=0.0;
      { float tt=3.0;
        for(int i=0;i<4;i++){ vec2 g=floor((vWW.xz+Rr.xz*tt)/uGrid.y+uGrid.x*0.5); float e=elev1(g);
          hitK=max(hitK,smoothstep(0.0,2.0,e+step(0.4,e)*3.0-(vWW.y+Rr.y*tt))); tt*=3.0; }
        vec3 land=(uAmb*0.9+uSunCol*max(uSunDir.y,0.0)*0.22)*vec3(0.12,0.16,0.085);
        sky=mix(sky,land,hitK*0.92); }
      if(uRiver>0.5) F=min(F,0.85);
      /* ② 해 반짝임 — 물결 사면 하나하나가 해를 반사하는 몫. 세기도 그 자리의 프레넬을 따른다
         (해가 낮을수록 물결이 금빛으로 번뜩이는 까닭) */
      float sd=max(dot(Rr,uSunDir),0.0);
      // 거칠기(걷어 낸 기울기 분산)만큼 반짝임 꼬리를 넓히고 에너지는 지킨다(넓어진 만큼 낮게)
      float e1=700.0/(1.0+lost*700.0), e2=90.0/(1.0+lost*90.0);
      vec3 spec=uSunCol*F*(pow(sd,e1)*e1+pow(sd,e2)*e2*0.024)*step(0.0,uSunDir.y)*shM;
      /* 하천의 해 반짝임 — 잔물결이 작아 해가 거의 한 점 거울로 비쳐 눈을 찔렀다. 넓고 옅게 흩는다 */
      /* 반사를 눌러 끄는 대신 **잘게 부순다** — 물살을 따라 흐르는 잡음으로 반짝이는 자리를 조각내 윤슬로 만든다 */
      if(uRiver>0.5){
        float gl=texture2D(uNz,vWW.xz/0.9+vec2(uWT*0.05,uWT*0.03)).r*texture2D(uNz,vWW.xz/2.3-vec2(uWT*0.04,0.0)).g;
        spec=uSunCol*F*(pow(sd,60.0)*smoothstep(0.16,0.40,gl)*9.0+pow(sd,14.0)*0.16)*step(0.0,uSunDir.y)*shM; }
      spec*=1.0-hitK;                                   // 뭍이 비치는 자리에는 해가 안 비친다
      /* ③ 물속 — **스넬 굴절**: 보는 빛줄기·햇빛이 물에 들어가며 꺾인다(비스듬할수록 물속
         경로가 길다 — 1/μ). 물의 고유 광학량(1/m, 680·550·440 nm):
           흡수 a — 순수 바닷물(0.45·0.057·0.015) + 용존유기물(CDOM, 파랑을 먹는다)
           산란 b — 물 분자(0.0022·(550/λ)^4.32) + 떠다니는 입자(λ⁻¹)
           뒤로 흩는 몫 b_b — 분자 0.5 · 입자 0.019
         깊은 물의 반사(고든): R∞ = 0.0949u + 0.0794u², u = b_b/(a+b_b) — 파랑이 남아 바다가 남색이다.
         얕으면 바닥이 비친다: R = R∞(1−e^−Kd) + (바닥 반사/π)·e^−Kd, K = (a+b_b)(1/μ해 + 1/μ눈).
         물 밖으로 나올 때(리 등): R↑ = 0.52·R/(1−1.7·R). 들어오는 빛(해+하늘)에 π·R↑ 를 곱한다. */
      vec3 tv=refract(-V,Nw,0.7502); float muV=max(-tv.y,0.08);
      vec3 ts=refract(-uSunDir,vec3(0.0,1.0,0.0),0.7502); float muS=max(-ts.y,0.08);
      float bed=elevAt(vWW.xz);
      float d=max(0.0,vWW.y-bed);
      vec3 aW=vec3(0.45,0.0565,0.0145), bW=0.0022*vec3(0.401,1.0,2.622);
      vec3 aX=vec3(0.001,0.004,0.02), bP=vec3(0.81,1.0,1.25)*0.05, bot=vec3(0.46,0.41,0.30);             // 맑은 연안 · 모래 바닥
      if(uRiver>0.5){                                   // 유기물이 든 개울 — 깊은 소도 새까맣지는 않게
        /* **강어귀** — 수면이 바다 높이(0)에 가까워질수록 물빛을 바닷물로 잇는다. 예전엔 어귀에서 갈색 개울과 남색 바다가
           금을 긋고 만났다(사용자 지적: 하천과 바닷가가 만나는 데가 기괴하다) */
        float fr=smoothstep(0.2,1.7,vWW.y);
        aX=mix(aX,vec3(0.05,0.22,0.75),fr); bP=mix(bP,vec3(0.81,1.0,1.25)*1.2,fr); bot=mix(bot,vec3(0.27,0.24,0.18),fr); }
      vec3 aT=aW+aX, bb=0.5*bW+0.019*bP;
      vec3 u=bb/(aT+bb);
      vec3 Rinf=0.0949*u+0.0794*u*u;
      vec3 Kt=(aT+bb)*(1.0/muS+1.0/muV);
      vec3 Tb=exp(-Kt*d);
      vec3 rr=Rinf*(1.0-Tb)+(bot/3.14159)*Tb;
      vec3 Rup=0.52*rr/(1.0-1.7*rr);
      vec3 light=uAmb+uSunCol*max(uSunDir.y,0.0)*(1.0-F)*shM;
      vec3 body=3.14159*Rup*light;
      vec3 col=body*(1.0-F)+sky*F+spec;
      /* 물속에서 올려다본 수면 — 머리 위 좁은 원(스넬의 창, 수직에서 48.6° 안)으로만 하늘이 들어오고,
         그 밖은 전반사라 어두운 물빛이 되비친다. 예전엔 밑에서 봐도 하늘 거울이라 수면이 하얗게 빛났다 */
      if(under>0.5){
        float up=clamp(dot(-V,Ng),0.0,1.0);              // 올려다보는 각의 코사인(눈→수면 방향과 수면 법선)
        /* 수면은 가만있지 않다 — 잔물결이 창의 테두리를 일렁이게 하고, 창 안의 하늘과 창 밖의 물빛을 얼룩지게 한다 */
        vec2 rq=vWW.xz/2.6+vec2(uWT*0.030,uWT*0.021);
        float rip=texture2D(uNz,rq).r-0.5+0.5*(texture2D(uNz,rq*2.7+0.3).g-0.5);
        float win=smoothstep(0.60,0.76,up+rip*0.10);
        vec3 deep=(uRiver>0.5?vec3(0.09,0.12,0.08):vec3(0.02,0.16,0.20))*(uAmb+uSunCol*max(uSunDir.y,0.0)*0.6);
        vec3 skyU=mix(uSkyH,uSkyZ,0.6)*(0.80+0.55*rip);
        /* 창 안의 해 — 굴절돼 들어온 햇빛이 물결에 부서져 번쩍인다(해가 보이는 쪽 = 굴절된 햇빛을 거슬러 올려다본 쪽) */
        vec3 sIn=refract(-uSunDir,vec3(0.0,1.0,0.0),0.7502);
        float sg=pow(max(dot(normalize(vVD),-sIn),0.0),36.0);
        skyU+=uSunCol*sg*(0.5+1.8*smoothstep(-0.1,0.4,rip))*step(0.0,uSunDir.y);
        col=mix(deep*(0.85+0.7*rip),skyU,win*0.88);
      }
      // 거품 — 물가 0.5 m 안, 밀려왔다 빠진다
      /* 거품 — 예전엔 물가 0.5 m 띠가 통째로 밝아졌다 어두워졌다 했다(매끈한 흰 띠). 이제
           ① 물가 가장자리에 레이스처럼 뚫린 거품 띠가 밀려왔다 빠지고(땅 셰이더의 젖은 띠와 같은 박자)
           ② 그 바깥 1.8 m 까지 얕아질수록 촘촘해지는 **파도 줄**이 뭍 쪽으로 밀려온다
           ③ 하천은 물길이 가파른 데(여울)에서 물살을 따라 흰 줄이 흘러내린다.
         무늬는 잡음 텍스처 두 번으로 낸다 */
      float surf=0.5+0.5*sin(uWT*0.9+sin(vWW.x*0.07)*2.0+sin(vWW.z*0.05)*2.0);
      float lace=texture2D(uNz,vWW.xz/2.3+vec2(uWT*0.013,0.0)).r*0.6+texture2D(uNz,vWW.xz/0.83+vec2(0.0,uWT*0.021)).g*0.4;
      float fringe=smoothstep(0.34+0.22*surf,0.02,d)*smoothstep(0.34,0.60,lace+0.22*surf);
      float lines=smoothstep(0.62,0.96,sin(d*6.5+uWT*1.15+lace*3.0))*smoothstep(1.8,0.25,d)*smoothstep(0.38,0.66,lace);
      float foam=max(fringe,lines*0.8);
      if(uRiver>0.5){
        vec2 fd=normalize(Ng.xz+vec2(1e-4));                              // 물이 흘러내리는 쪽(수면 법선이 눕는 쪽)
        float rapid=smoothstep(0.05,0.22,1.0-Ng.y);                       // 물길이 가파를수록
        vec2 fu=vec2(dot(vWW.xz,fd)*0.30-uWT*0.55,dot(vWW.xz,vec2(-fd.y,fd.x))*1.5);
        float streak=texture2D(uNz,fu).b*0.65+texture2D(uNz,fu*2.3+0.4).a*0.35;
        foam=max(fringe*0.55,rapid*smoothstep(0.50,0.72,streak)*smoothstep(0.04,0.20,d));
      }
      col=mix(col,(uAmb+uSunCol*max(uSunDir.y,0.0)*shM)*0.9,foam*0.8);   // 거품은 흰 알베도 0.9
      /* 물가 — 지형 텍스처(쌍선형)와 땅 메시(삼각형)의 높이가 몇 cm 어긋나 물가가 삼각형 톱니로 보였다.
         알파를 0.06 m 부터 올려 메시와 만나는 금을 투명한 데로 밀고, 잔물결 잡음으로 물가를 굽이치게 한다 */
      float wig=sin(vWW.x*0.9+sin(vWW.z*0.7)*1.6)*sin(vWW.z*1.1+sin(vWW.x*0.5)*1.3)
               +0.5*sin(vWW.x*2.7-vWW.z*2.1+uWT*0.6);
      diffuseColor.a=smoothstep(0.03,0.55,d+wig*0.06);   // 물가를 넓게 녹인다
      // 하천 판의 볼록한 모서리 — 판의 삼각형 끝이 땅 위에 세모로 드러나지 않게 녹인다(aEdge 0.25 → 0 · 0.5 이상 → 1)
      if(uRiver>0.5){
        diffuseColor.a*=smoothstep(0.0,0.5,vEdge+wig*0.04);
        /* 강어귀 — 바닥이 바다 밑으로 내려간 데서는 하천 판을 바다 높이에서 녹여 없앤다(그 자리는 바닷물 판이 덮는다).
           두 판이 같은 높이에서 겹쳐 금이 서던 것이 사라진다 */
        diffuseColor.a*=mix(1.0,smoothstep(0.03,0.32,vWW.y+wig*0.03),smoothstep(0.0,-0.25,bed));
      }
      vec3 outgoingLight=col;`);
  };
  m.customProgramCacheKey=()=>'water';
  envPatch(m);   // cloudSh 를 붙인다 — 위 셰이더가 부르므로 LIGHT.refresh 를 기다리지 않는다
  return m;
}
function buildWaterElev(){
  if(waterElevTex) waterElevTex.dispose();
  /* 실수 텍스처는 그래픽 장치에 따라 못 읽는다(헤드리스에선 0 이 나와 물이 온통 거품이었다).
     높이를 −100~200 m 로 16비트에 담아 8비트 두 칸(R 위·G 아래)에 나눠 넣는다 — 3 mm 눈금 */
  const px=new Uint8Array(N*N*4);
  for(let i=0;i<N*N;i++){
    const v=Math.round(clamp((F.elev[i]+100)/300,0,1)*65535);
    px[i*4]=v>>8; px[i*4+1]=v&255; px[i*4+3]=255;
  }
  waterElevTex=new THREE.DataTexture(px,N,N,THREE.RGBAFormat,THREE.UnsignedByteType);
  waterElevTex.magFilter=waterElevTex.minFilter=THREE.NearestFilter;
  waterElevTex.needsUpdate=true;
  WATER_U.uElev.value=waterElevTex; WATER_U.uGrid.value.set(N,CELL);
}
let oceanBase=null;
function buildWater(){
  if(!ocean){
    // 굵은 파도(파장 21~62 m)만 정점을 움직이므로 격자는 15 m 면 된다
    const g=new THREE.PlaneGeometry(WORLD*1.7,WORLD*1.7,220,220); g.rotateX(-Math.PI/2);
    oceanBase=Float32Array.from(g.attributes.position.array);
    ocean=new THREE.Mesh(g,waterMat(false));
    ocean.userData.lightRole='recv';
    scene.add(ocean);
  }
  buildWaterElev();
  // 하천 수면 — 하도 셀 위에 얇은 판을 덮어 물길이 눈에 보이게 한다
  if(riverMesh){ scene.remove(riverMesh); riverMesh.geometry.dispose(); }
  // 정점 수위 = 그 격자점을 공유하는 하도 셀들의 평균.
  // 이웃한 사각형이 같은 모서리 높이를 쓰게 되므로 계단이 사라지고 하나로 이어진다.
  const vw=(x,z)=>{
    let sm=0,n=0;
    for(let d=0;d<4;d++){
      const xx=x-(d&1), zz=z-((d>>1)&1);
      if(xx<0||zz<0||xx>=N||zz>=N) continue;
      const j=IDX(xx,zz);
      if(F.river[j]){ sm+=F.wlev[j]; n++; }
    }
    return n?sm/n:null;
  };
  const tris=[], edg=[];
  /* 가장자리 값 — 이 격자점을 둘러싼 네 칸 중 물길 몫(0~1). 셰이더가 0→0.5 사이에서 알파를 녹인다.
     **판을 물길 밖으로 한 칸 더 깐다**(둘레 칸) — 물길 칸만 깔면 판이 끝나는 둑에서 물이 아직 깊어
     알파가 1 인 채로 끊겨 칸 모양 계단·세모가 그대로 보였다. 바깥 둘레 점은 0 이라 한 칸(2.5 m)에 걸쳐 스러진다 */
  const inner=(x,z)=>{ let n=0; for(let d=0;d<4;d++){ const xx=x-(d&1), zz=z-((d>>1)&1);
    if(xx>=0&&zz>=0&&xx<N&&zz<N&&F.river[IDX(xx,zz)]) n++; } return n/4; };
  // 둘레 점의 수위 — 가까운(4×4 칸) 물길 칸 수위의 평균
  const vw2=(x,z)=>{ const v=vw(x,z); if(v!==null) return v; let sm=0,n=0;
    for(let zz=z-2;zz<=z+1;zz++) for(let xx=x-2;xx<=x+1;xx++){
      if(xx<0||zz<0||xx>=N||zz>=N) continue; const j=IDX(xx,zz); if(F.river[j]){ sm+=F.wlev[j]; n++; } }
    return n?sm/n:null; };
  const nearRiver=(x,z)=>{ for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const xx=x+dx, zz=z+dz;
    if(xx>=0&&zz>=0&&xx<N&&zz<N&&F.river[IDX(xx,zz)]) return true; } return false; };
  for(let z=0;z<N-1;z++) for(let x=0;x<N-1;x++){
    if(!nearRiver(x,z)) continue;
    const a=vw2(x,z), b=vw2(x,z+1), c=vw2(x+1,z), d=vw2(x+1,z+1);
    if(a===null||b===null||c===null||d===null) continue;
    const X=(x-N/2)*CELL, Z=(z-N/2)*CELL, S=CELL;
    tris.push(X,a,Z, X,b,Z+S, X+S,c,Z,
              X+S,c,Z, X,b,Z+S, X+S,d,Z+S);
    const ea=inner(x,z), eb=inner(x,z+1), ec=inner(x+1,z), ed=inner(x+1,z+1);
    edg.push(ea,eb,ec, ec,eb,ed);
  }
  if(tris.length){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(tris),3));
    // 수면은 거의 수평이므로 법선을 전부 위로 고정한다.
    // 면마다 법선을 계산하면 미세한 기울기 차이가 각진 무늬로 드러난다.
    /* 법선 — 수위의 기울기를 격자점마다(이웃 점과의 차이로) 재서 준다. 같은 격자점은 같은 법선이라 면마다 각지지 않고
       매끈하게 이어진다. 예전엔 전부 위(0,1,0)로 못박아 셰이더가 비탈진 물길을 수평면으로 알았다 */
    const nrm=new Float32Array(tris.length), ncache=new Map();
    const wAt=(x,z,fb)=>{ const v=vw2(x,z); return v===null?fb:v; };
    for(let i=0;i<tris.length;i+=3){
      const gx=Math.round(tris[i]/CELL+N/2), gz=Math.round(tris[i+2]/CELL+N/2), key=gx*4096+gz;
      let n3=ncache.get(key);
      if(!n3){
        const w0=tris[i+1];
        const dx=(wAt(gx+1,gz,w0)-wAt(gx-1,gz,w0))/(2*CELL), dz=(wAt(gx,gz+1,w0)-wAt(gx,gz-1,w0))/(2*CELL);
        const l=Math.hypot(dx,1,dz); n3=[-dx/l,1/l,-dz/l]; ncache.set(key,n3);
      }
      nrm[i]=n3[0]; nrm[i+1]=n3[1]; nrm[i+2]=n3[2];
    }
    g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
    g.setAttribute('aEdge',new THREE.BufferAttribute(new Float32Array(edg),1));
    g.computeBoundingSphere();
    riverMesh=new THREE.Mesh(g,waterMat(true));
    riverMesh.userData.lightRole='recv';
    scene.add(riverMesh);
  }else riverMesh=null;
}

/* 자원 프롭 — 종류별 InstancedMesh 하나씩이라 드로우콜이 10여 개로 끝난다 */
const COLLIDERS=[];                    // {x,z,r} 나무·바위 충돌체
