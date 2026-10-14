/* 24-shapes.js — CASTAWAY
   매끈한 모양 도구 — 대롱(가지·뿌리·산호) · 울퉁불퉁한 덩이(바위·잎 뭉치) · 휘는 잎(바닷말·고사리·야자) · 돌림판(항아리꼴)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   왜 따로 두나
   ----------------------------------------------------------------------------
   덤불·산호·바닷말·잔돌을 3각 뿔과 20면체(면마다 각진 것)로 지었더니 어디를 봐도 삼각형 조각이 그대로 보였다
   (사용자 지적: 사면체 메시가 멋없다). 여기 도구는 전부 **이웃 면끼리 법선을 이은** 모양을 낸다 — 면 수는 비슷해도
   빛이 둥글게 넘어가고 윤곽만 또렷이 남는다. 뭍의 식생(95-flora.js)과 바다(96-sea.js)가 같이 쓴다.
   ========================================================================== */
const SHP={};

/* 대롱 — 점들을 따라 굵기가 변하는 관. pts [[x,y,z]…] · rad [r…](점마다) · sides 단면 각 수.
   끝은 둥글게 오므려 막는다(cap 0 이면 열어 둔다). 밑은 열려 있다(땅·어미 가지에 묻힌다) */
SHP.tube=function(pts,rad,sides,cap){
  const n=pts.length, S=sides||6, P=[], Nn=[], I=[], U=[];
  const T=new THREE.Vector3(), Nv=new THREE.Vector3(), Bv=new THREE.Vector3(), prevT=new THREE.Vector3(), q=new THREE.Quaternion(),
        a=new THREE.Vector3(), b=new THREE.Vector3();
  for(let i=0;i<n;i++){
    const p0=pts[Math.max(0,i-1)], p1=pts[Math.min(n-1,i+1)];
    T.set(p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]).normalize();
    if(i===0){                                         // 첫 틀 — 접선에 수직인 아무 축
      a.set(Math.abs(T.y)<0.9?0:1, Math.abs(T.y)<0.9?1:0, 0);
      Nv.crossVectors(T,a).normalize(); Bv.crossVectors(T,Nv).normalize();
    }else{                                             // 틀을 접선 따라 굴려 옮긴다(꼬이지 않게)
      q.setFromUnitVectors(prevT,T); Nv.applyQuaternion(q); Bv.applyQuaternion(q);
    }
    prevT.copy(T);
    const r=rad[i], p=pts[i];
    for(let s=0;s<S;s++){
      const th=s/S*6.2832, cs=Math.cos(th), sn=Math.sin(th);
      b.set(Nv.x*cs+Bv.x*sn, Nv.y*cs+Bv.y*sn, Nv.z*cs+Bv.z*sn);
      P.push(p[0]+b.x*r, p[1]+b.y*r, p[2]+b.z*r); Nn.push(b.x,b.y,b.z); U.push(s/S,i/(n-1));
    }
  }
  for(let i=0;i<n-1;i++) for(let s=0;s<S;s++){
    const a0=i*S+s, a1=i*S+(s+1)%S, b0=a0+S, b1=a1+S;
    I.push(a0,b0,a1, a1,b0,b1);
  }
  if(cap!==0){                                         // 끝 — 꼭짓점 하나로 오므린다
    const p=pts[n-1], r=rad[n-1]*(cap||0.7), tip=P.length/3;
    P.push(p[0]+prevT.x*r,p[1]+prevT.y*r,p[2]+prevT.z*r); Nn.push(prevT.x,prevT.y,prevT.z); U.push(0.5,1);
    for(let s=0;s<S;s++) I.push((n-1)*S+s, tip, (n-1)*S+(s+1)%S);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(Nn),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(U),2));
  g.setIndex(I);
  return g;
};
/* 휘어 오르는 대롱 — 밑동 o 에서 방향 d 로 len 만큼, 위로(또는 아래로) bend 만큼 굽는다. r0 → r1 로 가늘어진다 */
SHP.limb=function(o,d,len,r0,r1,segs,sides,bend,cap){
  const pts=[], rad=[], n=segs||3;
  for(let i=0;i<=n;i++){ const t=i/n;
    pts.push([o[0]+d[0]*len*t, o[1]+d[1]*len*t+(bend||0)*len*t*t, o[2]+d[2]*len*t]);
    rad.push(r0+(r1-r0)*t); }
  return SHP.tube(pts,rad,sides||5,cap);
};

/* 3차원 값잡음 — 격자점 해시를 부드럽게 이은 것(−1~1). s 는 씨앗 */
SHP.vn3=function(x,y,z,s){
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z), fx=x-ix, fy=y-iy, fz=z-iz;
  const u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), w=fz*fz*(3-2*fz);
  const h=(a,b,c)=>{ let n=(Math.imul(a,374761393)+Math.imul(b,668265263)+Math.imul(c,1274126177)+Math.imul(s|0,144269))|0;
    n=Math.imul(n^(n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295*2-1; };
  const l=(a,b,t)=>a+(b-a)*t;
  return l(l(l(h(ix,iy,iz),h(ix+1,iy,iz),u),l(h(ix,iy+1,iz),h(ix+1,iy+1,iz),u),v),
           l(l(h(ix,iy,iz+1),h(ix+1,iy,iz+1),u),l(h(ix,iy+1,iz+1),h(ix+1,iy+1,iz+1),u),v),w);
};
/* 바위 겉의 잔 울퉁불퉁(사용자 요청: 바위가 너무 매끈하다) — 값잡음을 n 겹(주파수 2배 · 세기 0.5배) 겹친 것(대략 −1~1).
   둘째 겹부터는 접힌 잡음(0.5−|v|)을 반 섞어 능선과 패인 금이 진다. 단위 공 위의 방향(x,y,z)으로 부르면 이음매가 없다 */
SHP.rough=function(x,y,z,s,f0,n){
  let a=1, f=f0, t=0, sum=0;
  for(let i=0;i<n;i++){ let v=SHP.vn3(x*f+i*7.1,y*f-i*3.7,z*f+i*5.3,(s|0)+i*31);
    if(i>0) v=0.5*v+(0.5-Math.abs(v));
    t+=v*a; sum+=a; a*=0.5; f*=2.03; }
  return t/sum;
};
/* 날카로운 능선 — 접힌 잡음(1−|v|)을 세제곱해 좁은 날만 세운다(사용자 요청: 바위 모서리를 들쭉날쭉하게). 0~1 · 평균 0.25 쯤 */
SHP.jag=function(x,y,z,s,f0,n){
  let a=1, f=f0, t=0, sum=0;
  for(let i=0;i<n;i++){ const v=1-Math.abs(SHP.vn3(x*f+i*3.3,y*f-i*1.9,z*f+i*4.7,(s|0)+i*57)); t+=v*v*v*a; sum+=a; a*=0.5; f*=2.1; }
  return t/sum;
};
/* 덩이 — 공을 큰 혹 몇 개로 밀고 당긴 것. 이웃 면끼리 법선이 이어져 둥글게 보인다.
   o: w·h 쪼갬 수 · amp 혹의 세기 · sx·sy·sz 축별 크기 · base 밑을 자를 높이(반지름 비 — 땅에 앉히는 것) · freq 혹의 잔 정도 */
SHP.blob=function(r,seed,o){
  o=o||{};
  const g=new THREE.SphereGeometry(1,o.w||12,o.h||8), p=g.attributes.position, rnd=mulberry32((seed|0)^0x2f6b1d);
  const L=[], nb=o.nb||4, fq=o.freq||2.6, amp=o.amp===undefined?0.2:o.amp;
  let ws=0;
  for(let i=0;i<nb;i++){ let x=rnd()*2-1, y=rnd()*2-1, z=rnd()*2-1; const l=Math.sqrt(x*x+y*y+z*z)||1;
    const w=rnd()*2-1; ws+=Math.abs(w); L.push([x/l,y/l,z/l,1.4+rnd()*fq,rnd()*6.283,w]); }
  ws=ws||1;
  const sx=o.sx||1, sy=o.sy||1, sz=o.sz||1, base=o.base;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    let f=0; for(const l of L) f+=l[5]*Math.sin(l[3]*(x*l[0]+y*l[1]+z*l[2])+l[4]);
    const k=r*(1+f/ws*amp)*(o.rough?1+o.rough*SHP.rough(x,y,z,seed,2.2,3):1);   // 잔 울퉁불퉁(SHP.rough)
    let yy=y*k*sy; if(base!==undefined&&yy<-base*r) yy=-base*r;
    p.setXYZ(i,x*k*sx,yy,z*k*sz);
  }
  g.computeVertexNormals(); SHP.weldSeam(g,o.w||12);
  return g;
};
/* 공·돌림판의 이음매 — 한 줄의 첫 점과 끝 점은 같은 자리인데 법선을 따로 셈해 금이 간다. 둘을 평균한다 */
SHP.weldSeam=function(g,w){
  const n=g.attributes.normal, row=w+1, rows=n.count/row;
  for(let j=0;j<rows;j++){
    const a=j*row, b=a+w;
    let x=n.getX(a)+n.getX(b), y=n.getY(a)+n.getY(b), z=n.getZ(a)+n.getZ(b); const l=Math.sqrt(x*x+y*y+z*z)||1;
    n.setXYZ(a,x/l,y/l,z/l); n.setXYZ(b,x/l,y/l,z/l);
  }
};

/* 휘는 잎 — 밑동(원점)에서 +Y 로 뻗다 +Z 쪽으로 curl(라디안)만큼 굽는 띠. 가운데 잎맥이 살짝 꺼진 V 꼴(cup).
   o: segs 마디 · curl 굽는 각 · cup 꺼지는 깊이(폭 비) · wave 가장자리 물결(폭 비) · waves 물결 수 · p 폭이 가장 넓은 자리(0~1)
      twist 끝으로 가며 비트는 각 · tip 끝 폭(0 이면 뾰족) */
SHP.frond=function(len,wid,o){
  o=o||{};
  const n=o.segs||6, curl=o.curl||0, cup=o.cup===undefined?0.25:o.cup, wave=o.wave||0, wn=o.waves||3, pk=o.p||0.4,
        tw=o.twist||0, tip=o.tip||0, P=[], I=[], U=[];
  let y=0, z=0;
  for(let i=0;i<=n;i++){
    const t=i/n, ang=curl*t;
    if(i){ y+=Math.cos(curl*(t-0.5/n))*len/n; z+=Math.sin(curl*(t-0.5/n))*len/n; }
    /* 폭 — 밑동은 좁고 pk 에서 가장 넓고 끝으로 다시 좁아진다 */
    const prof=t<pk?0.25+0.75*Math.sin(t/pk*1.5708):tip+(1-tip)*Math.cos((t-pk)/(1-pk)*1.5708);
    const w=wid*0.5*prof*(1+wave*Math.sin(t*wn*6.283));
    const ta=tw*t, cx=Math.cos(ta), sx=Math.sin(ta);
    const ny=-Math.sin(ang), nz=Math.cos(ang);         // 잎 겉면의 법선(굽은 만큼 눕는다)
    const side=(k,lift)=>{                              // k = -1 · 0 · 1
      const ox=k*w*cx, on=k*w*sx+lift;
      P.push(ox, y+ny*on, z+nz*on); U.push(0.5+k*0.5*(o.uvw?prof:1),t);
    };
    side(-1,cup*w+wave*w*0.6*Math.cos(t*wn*6.283)); side(0,0); side(1,cup*w-wave*w*0.6*Math.cos(t*wn*6.283));
  }
  for(let i=0;i<n;i++){ const a=i*3, b=a+3;
    I.push(a,a+1,b, a+1,b+1,b, a+1,a+2,b+1, a+2,b+2,b+1); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(U),2));
  g.setIndex(I); g.computeVertexNormals();
  return g;
};

/* 매개 곡면 — (u,v) 0~1 격자에 fn 이 돌려준 [x,y,z] 를 놓고 잇는다. loopU 면 u 방향을 한 바퀴 닫는다(이음매 법선도 잇는다) */
SHP.grid=function(nu,nv,fn,loopU){
  const P=[], I=[], U=[], row=nu+1;
  for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){ const q=fn(i/nu,j/nv); P.push(q[0],q[1],q[2]); U.push(i/nu,j/nv); }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const a=j*row+i, b=a+1, c=a+row, d=c+1; I.push(a,c,b, b,c,d); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(U),2));
  g.setIndex(I); g.computeVertexNormals();
  if(loopU) SHP.weldSeam(g,nu);
  return g;
};

/* 돌림판 — 옆모습 [[r,y]…] 을 Y 축으로 돌린다(항아리 · 버섯갓 · 산호 상판). 법선은 이어서 낸다 */
SHP.lathe=function(prof,sides){
  const S=sides||10, g=new THREE.LatheGeometry(prof.map(a=>new THREE.Vector2(Math.max(1e-4,a[0]),a[1])),S);
  g.userData.lathe=[prof.length,S];
  return SHP.latheNormals(g);
};
/* 돌림판의 법선을 다시 셈하고 이음매를 잇는다(모양을 더 주무른 뒤에도 부른다).
   LatheGeometry 는 돌리는 방향으로 줄을 센다 — 줄마다 점 m 개, 줄이 S+1 개. 첫 줄과 끝 줄이 같은 자리다 */
SHP.latheNormals=function(g){
  g.computeVertexNormals();
  const n=g.attributes.normal, m=g.userData.lathe[0], S=g.userData.lathe[1];
  for(let j=0;j<m;j++){ const a=j, b=S*m+j;
    let x=n.getX(a)+n.getX(b), y=n.getY(a)+n.getY(b), z=n.getZ(a)+n.getZ(b); const l=Math.sqrt(x*x+y*y+z*z)||1;
    n.setXYZ(a,x/l,y/l,z/l); n.setXYZ(b,x/l,y/l,z/l); }
  return g;
};

/* 잎 판때기 — 알파 그림(잎 한 줌)을 붙일 네모 두 장을 십자로. uv 가 있다. w 폭 · h 높이 · 밑변 가운데가 원점 */
SHP.card=function(w,h,cross){
  const P=[], U=[], Nn=[], I=[];
  const quad=(ax,az)=>{ const o=P.length/3, x=ax*w/2, z=az*w/2;
    P.push(-x,0,-z, x,0,z, x,h,z, -x,h,-z); U.push(0,0, 1,0, 1,1, 0,1);
    for(let i=0;i<4;i++) Nn.push(0,1,0);               // 잎 판은 위를 본 것으로 친다 — 옆을 보게 두면 해를 등진 면이 새까매진다
    I.push(o,o+1,o+2, o,o+2,o+3); };
  quad(1,0); if(cross!==false) quad(0,1);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(Nn),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(U),2));
  g.setIndex(I);
  return g;
};

/* 부품들을 한 지오메트리로 — 자리(x·y·z) · 돌림(q 또는 rx·ry·rz) · 크기(s · sy) · 빛깔.
   빛깔은 부품마다 하나(c) 또는 **높이에 따라 섞을 둘**(c 밑 · c2 위 — 밑동이 짙고 끝이 밝아 덩이가 입체로 읽힌다).
   uv 를 켜면 uv 도 잇는다. 부품에 cell(0~15)을 적으면 uv 를 4×4 그림 묶음의 그 칸으로 옮긴다(95-flora.js 의 잎·껍질 그림).
   법선은 부품의 것을 그대로 돌려 쓴다(매끈한 것은 매끈하게 남는다).
   grad [밑, 위] 를 주면 다 이은 뒤 전체 높이에 따라 명암을 한 번 더 곱한다 */
SHP.merge=function(parts,withUV,grad){
  const M=new THREE.Matrix4(), NM=new THREE.Matrix3(), V=new THREE.Vector3();
  let total=0; const tmp=[];
  for(const pt of parts){ const g=pt.g.index?pt.g.toNonIndexed():pt.g; tmp.push(g); total+=g.attributes.position.count; }
  const P=new Float32Array(total*3), Nn=new Float32Array(total*3), C=new Float32Array(total*3), U=withUV?new Float32Array(total*2):null;
  let o=0; const ranges=[];
  parts.forEach((pt,pi)=>{
    const g=tmp[pi], p=g.attributes.position.array, nr=g.attributes.normal.array, uv=g.attributes.uv?g.attributes.uv.array:null, cnt=p.length/3;
    ranges.push({o,n:cnt,cell:pt.cell,x:pt.x||0,y:pt.y||0,z:pt.z||0});   // 부품마다 정점 구간 — 줄인 복제(95-flora.js `floraLodGeo`)가 잎 판만 솎는다
    M.compose(new THREE.Vector3(pt.x||0,pt.y||0,pt.z||0),
      pt.q||new THREE.Quaternion().setFromEuler(new THREE.Euler(pt.rx||0,pt.ry||0,pt.rz||0)),
      new THREE.Vector3(pt.s||1,pt.sy||pt.s||1,pt.s||1));
    NM.getNormalMatrix(M);
    let y0=1e9, y1=-1e9;
    for(let i=0;i<cnt;i++){
      V.set(p[i*3],p[i*3+1],p[i*3+2]).applyMatrix4(M);
      P[(o+i)*3]=V.x; P[(o+i)*3+1]=V.y; P[(o+i)*3+2]=V.z;
      if(V.y<y0) y0=V.y; if(V.y>y1) y1=V.y;
      if(pt.nrm) V.set(pt.nrm[0],pt.nrm[1],pt.nrm[2]);          // 부품 전체에 법선 하나(잎 판때기 — 수관 바깥을 본다)
      else V.set(nr[i*3],nr[i*3+1],nr[i*3+2]).applyMatrix3(NM).normalize();
      Nn[(o+i)*3]=V.x; Nn[(o+i)*3+1]=V.y; Nn[(o+i)*3+2]=V.z;
      if(U){                                           // 그림 묶음(4×4 칸)의 제 칸으로 — 칸 테두리 4% 는 비워 이웃 칸이 번지지 않게
        const u=uv?uv[i*2]:0.5, v=uv?uv[i*2+1]:0.5;
        if(pt.cell===undefined){ U[(o+i)*2]=u; U[(o+i)*2+1]=v; }
        else{ U[(o+i)*2]=((pt.cell&3)+0.04+0.92*u)/4; U[(o+i)*2+1]=1-((pt.cell>>2)+1)/4+(0.04+0.92*v)/4; }
      }
    }
    const a=pt.c||[1,1,1], b=pt.c2||a, span=Math.max(1e-4,y1-y0);
    for(let i=0;i<cnt;i++){ const t=pt.c2?(P[(o+i)*3+1]-y0)/span:0;
      C[(o+i)*3]=a[0]+(b[0]-a[0])*t; C[(o+i)*3+1]=a[1]+(b[1]-a[1])*t; C[(o+i)*3+2]=a[2]+(b[2]-a[2])*t; }
    o+=cnt;
    if(g!==pt.g) g.dispose();
  });
  if(grad){                                            // 통째로 한 번 더 — 맨 밑은 grad[0] 배, 맨 위는 grad[1] 배(밑동이 짙고 끝이 밝게)
    let y0=1e9, y1=-1e9; for(let i=0;i<total;i++){ const y=P[i*3+1]; if(y<y0) y0=y; if(y>y1) y1=y; }
    const span=Math.max(1e-4,y1-y0);
    for(let i=0;i<total;i++){ const k=grad[0]+(grad[1]-grad[0])*(P[i*3+1]-y0)/span; C[i*3]*=k; C[i*3+1]*=k; C[i*3+2]*=k; }
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(P,3));
  out.setAttribute('normal',new THREE.BufferAttribute(Nn,3));
  out.setAttribute('color',new THREE.BufferAttribute(C,3));
  if(U) out.setAttribute('uv',new THREE.BufferAttribute(U,2));
  out.computeBoundingSphere();
  out.userData.parts=ranges;
  return out;
};
/* 방위 a 쪽으로 t 만큼 눕히는 회전(+Y 로 선 것을 바깥으로 눕힌다) */
SHP.lean=function(a,t){
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(Math.sin(a),0,-Math.cos(a)),t);
};
/* 정점을 따로 둔(면마다 각진) 지오메트리의 법선을 잇는다 — 같은 자리에 놓인 정점끼리 법선을 평균한다 */
SHP.smooth=function(g){
  g.computeVertexNormals();
  const p=g.attributes.position, n=g.attributes.normal, acc=new Map();
  const key=i=>Math.round(p.getX(i)*2000)+'|'+Math.round(p.getY(i)*2000)+'|'+Math.round(p.getZ(i)*2000);
  for(let i=0;i<p.count;i++){ const k=key(i); let a=acc.get(k); if(!a){ a=[0,0,0]; acc.set(k,a); } a[0]+=n.getX(i); a[1]+=n.getY(i); a[2]+=n.getZ(i); }
  for(let i=0;i<p.count;i++){ const a=acc.get(key(i)), l=Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2])||1; n.setXYZ(i,a[0]/l,a[1]/l,a[2]/l); }
  return g;
};
