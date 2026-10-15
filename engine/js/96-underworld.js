/* 96-underworld.js — CASTAWAY
   땅속 세계 — 섬 밑 40 m 아래에 이어진 굴 방과 굴길 · 그 속의 생물(지형 판 7)
   (island_world.html 이 이 차례로 읽는다 — 아이템·딸 것·제작 표에 보태므로 95-flora.js · 96-dishes.js 다음이다) */
"use strict";

/* ============================================================================
   땅속 세계(사용자 요청: 섬 전체 밑에 땅속 세계가 있는 동굴계 바이옴 · 그에 맞는 동물)
   ----------------------------------------------------------------------------
   땅은 높이 지도 한 장이라 그 속을 팔 수 없다. 그래서 땅속은 **높이 지도 두 장 — 바닥과 천장**이다:
     · 섬 밑에 **굴 방**(지름 50~160 m · 높이 12~28 m)을 300 m 마다 하나쯤 두고, 가까운 방끼리 **굴길**(폭 9~15 m · 높이 6~9 m ·
       구불구불)로 잇는다. 그 자리의 '빈 높이' g 가 방·굴길의 단면(렌즈 꼴 — 가운데가 높고 가장자리로 0)이다.
     · 기준 높이 Y0 는 땅 위(둘레 50 m 의 가장 낮은 땅을 넓게 흐린 것)를 따라가되 늘 땅 밑 40 m 아래다.
       바닥 = Y0 − 0.3g (+ 잔 기복) · 천장 = Y0 + 0.7g (+ 울퉁불퉁). g 가 0 인 데는 바위 속이다(바닥과 천장이 맞붙는다).
   · 사람 둘레 190 m 의 바닥·천장을 48 m 칸으로 그린다(2 m 격자 · 벼랑 바위와 같은 사진 재질). 땅속에 있을 때만 그린다.
   · **드나드는 길 — 수직굴**: 땅 위 굴(32-caves.js) 둘에 하나꼴로 마지막 방 바닥에 구멍이 나 있고 밧줄이 드리워 있다.
     구멍 위에서 Space — 밧줄을 타고 내려간다(30~60 m). 밑에서 밧줄 곁에 서서 Space — 올라간다(기력이 든다 · 다하면 미끄러진다).
     밑에서 올려다보면 굴 구멍으로 하늘빛이 보인다.
   · **어둡다** — 땅속에 들면 해·하늘빛이 꺼지고 짙은 어둠 안개가 낀다. 방마다 빛나는 버섯·결정·반딧불이 유충이 희미하게 밝힌다.
     횃불·전등을 들고 다녀야 한다.
   · **생물** — 박쥐 떼(천장을 돌다 사람이 다가오면 흩어진다 · 밑에 구아노 더미 → 초석) · 동굴어(못 속의 하얀 눈먼 물고기 — 맨손으로 건진다)
     · 동굴영원(못가를 기는 하얀 도롱뇽 — 구경만) · 꼽등이(바닥을 뛰어다닌다 — 잡아 구워 먹는다) · 동굴거미와 거미줄(→ 거미 실)
     · **큰 동굴지네**(어둠 속에서 다가와 문다 · 독 — 켠 횃불·전등을 들고 있으면 가까이 오지 않는다)
   · 자리는 시드가 정한다(저장에 안 넣는다). 지형 판 7 밑(옛 저장)에는 없다. 땅속에서는 집을 지을 수 없다.
   ========================================================================== */
const UNDER={ok:false, ch:[], tu:[], pits:[], G:160, grid:new Map(), B:null, tiles:new Map(), T:48, S:2, R:190, mat:null,
  u:0, cx:1e9, cz:1e9, deco:new Map(), picks:[], grp:null, rope:null, sp0:false, hint:false, bats:null, fish:null, crick:null, cent:null, t:0};
const UGK=(gx,gz)=>(gx+2048)*4096+(gz+2048);
function underClear(){
  for(const t of UNDER.tiles.values()) underTileDrop(t); UNDER.tiles.clear();
  for(const d of UNDER.deco.values()) underDecoDrop(d); UNDER.deco.clear();
  if(UNDER.grp){ scene.remove(UNDER.grp); UNDER.grp.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); UNDER.grp=null; }
  UNDER.ok=false; UNDER.ch.length=0; UNDER.tu.length=0; UNDER.pits.length=0; UNDER.grid.clear(); UNDER.B=null; UNDER.picks.length=0;
  UNDER.rope=null; UNDER.u=0; UNDER.cx=UNDER.cz=1e9; if(typeof PL!=='undefined') PL.under=false;
}
/* ── 자리 정하기(섬을 지을 때 · placeResources 다음) ──────────────────────────── */
function underSites(seed){
  underClear(); if((P.tv|0)<7) return;
  const rnd=mulberry32((seed^0x0bd3e7)>>>0), E=F.elev;
  /* ① 기준 높이 — 둘레 50 m 의 가장 낮은 땅(최소 거르기) → 넓게 흐린 것과 '가장 낮은 땅 − 24 m' 가운데 낮은 쪽 − 16 m.
       그래서 천장(Y0 + 0.7g · g ≤ 28)도 늘 땅 밑 20 m 아래다 */
  const r0=Math.max(1,Math.ceil(50/CELL)), A=new Float32Array(N*N), M=new Float32Array(N*N);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ let m=1e9; for(let k=-r0;k<=r0;k++){ const xx=clamp(x+k,0,N-1); const v=E[z*N+xx]; if(v<m) m=v; } A[z*N+x]=m; }
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ let m=1e9; for(let k=-r0;k<=r0;k++){ const zz=clamp(z+k,0,N-1); const v=A[zz*N+x]; if(v<m) m=v; } M[z*N+x]=m; }
  const rb=Math.max(1,Math.ceil(120/CELL)), T1=new Float32Array(N*N), T2=new Float32Array(N*N);
  const blur=(src,dst,dx)=>{ for(let z=0;z<N;z++){ let s=0, n=0; const row=i=>dx?z*N+i:i*N+z;
      for(let i=-rb;i<=rb;i++){ const q=clamp(i,0,N-1); s+=src[row(q)]; n++; }
      for(let i=0;i<N;i++){ dst[row(i)]=s/n; const a=clamp(i-rb,0,N-1), b=clamp(i+rb+1,0,N-1); s+=src[row(b)]-src[row(a)]; } } };
  blur(M,T1,true); blur(T1,T2,false); blur(T2,T1,true); blur(T1,T2,false);
  const Bm=new Float32Array(N*N); for(let i=0;i<N*N;i++) Bm[i]=Math.min(T2[i],M[i]-24)-16;
  UNDER.B=Bm; UNDER.M=M;
  const landAt=(x,z)=>{ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); return gx>2&&gz>2&&gx<N-3&&gz<N-3&&M[gz*N+gx]>5; };
  /* ② 굴 방 — 300 m 칸마다 하나(뭍 밑에만) */
  const S=300, n=Math.floor(HALF/S);
  for(let gz=-n;gz<n;gz++) for(let gx=-n;gx<n;gx++){
    const x=(gx+0.2+0.6*rnd())*S, z=(gz+0.2+0.6*rnd())*S, R=26+rnd()*44, H=12+rnd()*16, sd=(rnd()*1e9)|0;
    const f={pool:rnd()<0.45, bats:rnd()<0.45, crys:rnd()<0.35, shroom:rnd()<0.6, web:rnd()<0.5, cent:rnd()<0.30};
    if(!landAt(x,z)||!landAt(x+R*0.7,z)||!landAt(x-R*0.7,z)||!landAt(x,z+R*0.7)||!landAt(x,z-R*0.7)) continue;
    UNDER.ch.push({x,z,R,H,sd,p:[rnd()*6.283,rnd()*6.283,rnd()*6.283],...f});
  }
  /* ③ 수직굴 — 땅 위 굴 둘에 하나꼴, 마지막 방 바닥(광석이 없는 자리). 밑에는 작은 방을 하나 둔다 */
  for(const c of CAVES){ if(c.off||rnd()<0.45) continue;
    /* 광석에서 가장 먼 자리(열두 번 뽑아) — 그래도 2.4 m 안에 걸리는 광석은 방 가장자리로 비켜 놓는다 */
    const rm=c.rooms[c.rooms.length-1], ore=PROPS.filter(p=>p.cave&&Math.hypot(p.x-rm.x,p.z-rm.z)<rm.R+1); let px=rm.x, pz=rm.z, best=-1;
    for(let t=0;t<12;t++){ const a=rnd()*6.283, d=rm.R*(0.25+0.3*rnd()), x=rm.x+Math.cos(a)*d, z=rm.z+Math.sin(a)*d;
      let m=1e9; for(const p of ore) m=Math.min(m,Math.hypot(p.x-x,p.z-z)); if(m>best){ best=m; px=x; pz=z; } }
    for(const p of ore){ const dx=p.x-px, dz=p.z-pz, d=Math.hypot(dx,dz); if(d>=2.4) continue;
      const a=d>0.01?Math.atan2(dz,dx):rnd()*6.283; p.x=px+Math.cos(a)*2.6; p.z=pz+Math.sin(a)*2.6; p.y=heightAt(p.x,p.z); }
    UNDER.ch.push({x:px,z:pz,R:13+rnd()*5,H:10+rnd()*3,sd:(rnd()*1e9)|0,p:[rnd()*6.283,rnd()*6.283,rnd()*6.283],pit:1,shroom:true,web:rnd()<0.3});
    UNDER.pits.push({x:px,z:pz,cave:c,rm,ys:heightAt(px,pz)});
  }
  /* ④ 굴길 — 방마다 가까운 둘(700 m 안)에. 길은 여섯 토막으로 굽힌다 */
  const C=UNDER.ch, seen=new Set();
  for(let i=0;i<C.length;i++){ const near=[];
    for(let j=0;j<C.length;j++) if(j!==i){ const d=Math.hypot(C[i].x-C[j].x,C[i].z-C[j].z); if(d<1100) near.push([d,j]); }
    near.sort((a,b)=>a[0]-b[0]);
    for(const [d,j] of near.slice(0,C[i].pit?1:2)){ if(d>(C[i].pit||C[j].pit?1100:700)) continue; const k=i<j?i*65536+j:j*65536+i; if(seen.has(k)) continue; seen.add(k);
      const a=C[i], b=C[j], dx=(b.x-a.x)/d, dz=(b.z-a.z)/d, w=4.5+rnd()*3, h=6+rnd()*3, amp=Math.min(60,d*0.12)*(rnd()<0.5?-1:1), ph=rnd()*6.283, pts=[];
      for(let s=0;s<=6;s++){ const t=s/6, o=amp*Math.sin(Math.PI*t)*Math.sin(t*3+ph)*(s&&s<6?1:0); pts.push([a.x+dx*d*t-dz*o,a.z+dz*d*t+dx*o]); }
      for(let s=0;s<6;s++) UNDER.tu.push({x0:pts[s][0],z0:pts[s][1],x1:pts[s+1][0],z1:pts[s+1][1],w,h,ph:ph+s}); } }
  /* ⑤ 칸에 건다(160 m) */
  const put=(o,x0,z0,x1,z1)=>{ for(let gz=Math.floor(z0/UNDER.G);gz<=Math.floor(z1/UNDER.G);gz++) for(let gx=Math.floor(x0/UNDER.G);gx<=Math.floor(x1/UNDER.G);gx++){
      const k=UGK(gx,gz); let a=UNDER.grid.get(k); if(!a) UNDER.grid.set(k,a=[]); a.push(o); } };
  for(const c of C){ const r=c.R*1.3; put(c,c.x-r,c.z-r,c.x+r,c.z+r);
    if(c.pool){ c.pr=c.R*0.32; const q=underQ(c.x,c.z,true); c.wl=q.f0+0.7; } }
  for(const t of UNDER.tu){ const r=t.w*1.3; t.L=Math.hypot(t.x1-t.x0,t.z1-t.z0)||1; put(t,Math.min(t.x0,t.x1)-r,Math.min(t.z0,t.z1)-r,Math.max(t.x0,t.x1)+r,Math.max(t.z0,t.z1)+r); }
  for(const p of UNDER.pits){ const q=underQ(p.x,p.z,true); p.yf=q.f; p.yc=q.c; }
  UNDER.ok=C.length>0;
}
/* ── 그 자리의 땅속 — {f 바닥, c 천장, g 빈 높이, w 못의 수면(없으면 −1e9)} ─────────── */
const _uq={x:NaN,z:NaN,f:0,c:0,g:0,w:-1e9,f0:0};
function uBase(x,z){ const B=UNDER.B, gx=clamp(x/CELL+N/2,0,N-1.001), gz=clamp(z/CELL+N/2,0,N-1.001), ix=Math.floor(gx), iz=Math.floor(gz), fx=gx-ix, fz=gz-iz, i=iz*N+ix;
  return (B[i]*(1-fx)+B[i+1]*fx)*(1-fz)+(B[i+N]*(1-fx)+B[i+N+1]*fx)*fz; }
const uN=(x,z)=>Math.sin(x*0.071+z*0.043)*0.5+Math.sin(x*0.13-z*0.11+1.7)*0.3+Math.sin(x*0.29+z*0.31+4.1)*0.2;   // 잔 기복(−1~1)
function underQ(x,z,fresh){
  const q=_uq; if(!fresh&&q.x===x&&q.z===z) return q;
  q.x=x; q.z=z; q.w=-1e9;
  if(!UNDER.ok&&!fresh){ q.g=0; q.f=q.c=-1e4; return q; }
  const a=UNDER.grid.get(UGK(Math.floor(x/UNDER.G),Math.floor(z/UNDER.G)));
  let g=0, pool=null, pd=0;
  if(a) for(const o of a){
    if(o.R!==undefined){ const dx=x-o.x, dz=z-o.z, d2=dx*dx+dz*dz, rm=o.R*1.3; if(d2>rm*rm) continue;
      const d=Math.sqrt(d2), an=Math.atan2(dz,dx), Rn=o.R*(1+0.14*Math.sin(3*an+o.p[0])+0.09*Math.sin(5*an+o.p[1])+0.05*Math.sin(9*an+o.p[2]));
      if(d<Rn){ const v=o.H*Math.sqrt(1-(d/Rn)*(d/Rn)); if(v>g) g=v; }
      if(o.pool&&o.pr&&d<o.pr){ pool=o; pd=d; } }
    else{ const vx=o.x1-o.x0, vz=o.z1-o.z0, t=clamp(((x-o.x0)*vx+(z-o.z0)*vz)/(o.L*o.L),0,1), px=o.x0+vx*t-x, pz=o.z0+vz*t-z, d=Math.sqrt(px*px+pz*pz);
      const Rw=o.w*(1+0.22*Math.sin(t*o.L/23+o.ph)); if(d<Rw){ const v=o.h*Math.sqrt(1-(d/Rw)*(d/Rw)); if(v>g) g=v; } }
  }
  const Y0=uBase(x,z), n=uN(x,z);
  q.g=g; q.f0=Y0-0.3*g;
  if(g<=0){ q.f=q.c=Y0; return q; }
  const k=Math.min(1,g/4);
  q.f=Y0-0.3*g+n*0.45*k;
  q.c=Y0+0.7*g+(uN(x*1.7+31,z*1.7-17)*1.1+uN(x*4.1,z*4.1)*0.35)*k;
  if(pool){ const s=1-(pd/pool.pr)*(pd/pool.pr); q.f-=1.5*s; q.w=pool.wl; }
  return q;
}
/* ── 몸 · 눈 · 물 ───────────────────────────────────────────────────────── */
const underIn=(x,z,y)=>UNDER.ok&&y<heightAt(x,z)-3;                       // 땅 밑 3 m 아래면 땅속으로 친다
function underFloorAt(x,z){ const q=underQ(x,z); return (q.g>0.05&&q.c-q.f>1.0)?q.f:1e4; }   // 바위 속이면 아주 높은 벽
function underWalk(x,z,fromH){
  if(Math.abs(x)>HALF-6||Math.abs(z)>HALF-6) return false;
  const q=underQ(x,z); if(q.g<=0.05) return false;
  const f=q.f, c=q.c; if(c-f<2.05) return false;                          // 머리가 닿는다
  const rise=f-fromH; if(rise>STEPUP) return false; if(rise<=0.02) return true;
  const e=1.5, gx=(underQ(x+e,z).f-underQ(x-e,z).f)/(2*e), gz=(underQ(x,z+e).f-underQ(x,z-e).f)/(2*e);
  return Math.hypot(gx,gz)<=MAXSLOPE;
}
function underSolid(x,z,y){ const q=underQ(x,z); return q.g<=0.05||y<q.f||y>q.c; }
function underEyeHit(x,y,z){
  for(const o of _eyeO){ const q=underQ(x+o[0],z+o[1]); if(q.g<=0.3||y<q.f+0.15||y>q.c-0.22) return true; }
  return false;
}
function underWater(x,z,gy){ const q=underQ(x,z); return (q.w>gy+0.02)?{wl:q.w,river:true}:{wl:-1e9,river:false}; }
/* ── 그리기 — 사람 둘레 190 m 를 48 m 칸으로(2 m 격자 · 바닥과 천장) ─────────────── */
function underMat(){
  if(UNDER.mat) return UNDER.mat;
  const m=rockMat('underrock',0x77726a); m.vertexColors=true;
  m.userData.melt=0; m.userData.meltAttr=false;          // '땅에 녹아들기'(45-sky.js envPatch)는 땅 위 표고를 잰다 — 땅속에서는 온통 묻힌 것으로 쳐서 바닥을 흙빛으로 칠하고 천장의 법선을 위로 눕혔다
  return UNDER.mat=m;
}
function underTileDrop(t){ for(const m of [t.fl,t.ce]) if(m){ UNDER.grp&&UNDER.grp.remove(m); m.geometry.dispose(); } }
function underTile(tx,tz){
  const T=UNDER.T, S=UNDER.S, n=T/S+1, x0=tx*T, z0=tz*T, NV=n*n;
  const F0=new Float32Array(NV), C0=new Float32Array(NV), G0=new Float32Array(NV); let any=false;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const q=underQ(x0+i*S,z0+j*S), k=j*n+i; F0[k]=q.f; C0[k]=q.c; G0[k]=q.g; if(q.g>0) any=true; }
  const t={tx,tz,fl:null,ce:null}; if(!any) return t;
  const mk=(Y,down)=>{ const P=new Float32Array(NV*3), Cc=new Float32Array(NV*3), Ml=new Float32Array(NV), I=[];
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i, x=x0+i*S, z=z0+j*S; P[k*3]=x; P[k*3+1]=Y[k]; P[k*3+2]=z;
      const ao=0.42+0.58*clamp(G0[k]/7,0,1), wt=down?0.82:(0.9+0.12*uN(x*0.7+5,z*0.7));      // 벽 밑·구석은 어둡다
      Cc[k*3]=ao*wt*(down?0.92:1.0); Cc[k*3+1]=ao*wt*(down?0.92:0.96); Cc[k*3+2]=ao*wt*(down?0.95:0.90); }
    for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){ const a=j*n+i, b=a+1, c=a+n, d=c+1;
      if(G0[a]<=0&&G0[b]<=0&&G0[c]<=0&&G0[d]<=0) continue;
      if(down) I.push(a,b,c, b,d,c); else I.push(a,c,b, b,c,d); }
    if(!I.length) return null;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('color',new THREE.BufferAttribute(Cc,3));
    g.setAttribute('aMelt',new THREE.BufferAttribute(Ml,1)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,underMat()); m.matrixAutoUpdate=false; m.updateMatrix(); m.userData.lightRole='recv'; UNDER.grp.add(m); return m; };
  t.fl=mk(F0,false); t.ce=mk(C0,true);
  return t;
}
/* ── 방의 꾸밈 — 종유석·석순 · 결정 · 빛나는 버섯 · 반딧불이 유충 · 못 · 거미줄 · 구아노 · 불빛(가까운 방만 짓는다) ── */
let _uGeo=null;
function underGeos(){
  if(_uGeo) return _uGeo;
  const cone=new THREE.ConeGeometry(1,1,7,1,true); cone.translate(0,0.5,0);
  const crys=new THREE.CylinderGeometry(0.6,1,1,6,1); crys.translate(0,0.5,0);
  const shr=new THREE.SphereGeometry(1,8,5,0,Math.PI*2,0,Math.PI/2);
  const mound=new THREE.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2);
  /* 거미줄 — 바퀴살 열둘과 소용돌이 실을 그린 그림 */
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); g.strokeStyle='rgba(235,240,245,0.85)'; g.lineWidth=1.3;
  for(let k=0;k<12;k++){ const a=k/12*6.283; g.beginPath(); g.moveTo(128,128); g.lineTo(128+Math.cos(a)*124,128+Math.sin(a)*124); g.stroke(); }
  g.lineWidth=0.9; g.beginPath(); for(let t=0;t<52;t+=0.05){ const r=8+t*2.2, a=t*1.0; const x=128+Math.cos(a)*r, y=128+Math.sin(a)*r; if(t===0) g.moveTo(x,y); else g.lineTo(x,y); } g.stroke();
  const web=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:0.55});
  return _uGeo={cone,crys,shr,mound,web,
    rock:new THREE.MeshLambertMaterial({color:0x8a857a}), lime:new THREE.MeshLambertMaterial({color:0xb8b2a2}),
    crysM:new THREE.MeshLambertMaterial({color:0x9a8cff,emissive:0x4a38c8,transparent:true,opacity:0.88}),
    shrM:new THREE.MeshLambertMaterial({color:0x5ae0c0,emissive:0x1fa88a}),
    guano:new THREE.MeshLambertMaterial({color:0x3a2c20}),
    pool:new THREE.MeshLambertMaterial({color:0x0c2a30,emissive:0x05242a,transparent:true,opacity:0.82,depthWrite:false})};
}
function underDecoDrop(d){ if(d.g){ UNDER.grp&&UNDER.grp.remove(d.g); d.g.traverse(o=>{ if(o.geometry&&o.userData.own) o.geometry.dispose(); }); } }
function underDeco(c){
  const G=underGeos(), rnd=mulberry32(c.sd>>>0), grp=new THREE.Group(), d={c,g:grp,picks:[],roost:null};
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), V=new THREE.Vector3(), Sc=new THREE.Vector3(), E=new THREE.Euler();
  const inst=(geo,mat,list)=>{ if(!list.length) return; const im=new THREE.InstancedMesh(geo,mat,list.length);
    list.forEach((o,i)=>{ E.set(o[6]||0,o[7]||0,o[8]||0); Q.setFromEuler(E); V.set(o[0],o[1],o[2]); Sc.set(o[3],o[4],o[5]); M.compose(V,Q,Sc); im.setMatrixAt(i,M); });
    im.instanceMatrix.needsUpdate=true; im.userData.lightRole='recv'; grp.add(im); };
  const spot=(k)=>{ const a=rnd()*6.283, r=c.R*Math.sqrt(rnd())*k; return [c.x+Math.cos(a)*r,c.z+Math.sin(a)*r]; };
  /* 종유석(천장에서 아래로) · 석순(바닥에서 위로) — 방이 클수록 많다 */
  const st=[], sm=[], nS=Math.round(c.R*0.9);
  for(let i=0;i<nS;i++){ const [x,z]=spot(0.9), q=underQ(x,z,true); if(q.g<3||q.w>-1e8) continue;
    const L=Math.min((q.c-q.f)*0.32,0.8+rnd()*rnd()*4.5), r=0.12+L*0.11;
    st.push([x,q.c+0.3,z,r,-L-0.3,r,0,rnd()*6,0]);
    if(rnd()<0.55){ const h=Math.min((q.c-q.f)*0.25,0.4+rnd()*rnd()*2.6); sm.push([x+(rnd()-0.5)*0.4,q.f-0.15,z+(rnd()-0.5)*0.4,0.18+h*0.16,h+0.15,0.18+h*0.16,0,rnd()*6,0]); } }
  inst(G.cone,G.lime,st); inst(G.cone,G.rock,sm);
  const GP=[], GA=[], lamps=[];
  /* 결정 무리 — 바닥 가장자리에서 비스듬히 솟는다 · 보랏빛으로 은은히 빛난다 */
  if(c.crys){ const cr=[]; for(let k=0;k<3;k++){ const a=rnd()*6.283, x0=c.x+Math.cos(a)*c.R*0.7, z0=c.z+Math.sin(a)*c.R*0.7, q0=underQ(x0,z0,true), y0=q0.f; if(q0.g<2) continue;   // underQ 는 같은 그릇을 돌려준다 — 값은 바로 받아 둔다
      for(let i=0;i<9;i++){ const x=x0+(rnd()-0.5)*2.2, z=z0+(rnd()-0.5)*2.2, q=underQ(x,z,true), h=0.4+rnd()*1.6, r=0.08+h*0.07;
        cr.push([x,q.f-0.1,z,r,h,r,(rnd()-0.5)*0.9,rnd()*6,(rnd()-0.5)*0.9]); }
      lamps.push([x0,y0+1.2,z0,0x8c70ff,2.6,30]); }
    inst(G.crys,G.crysM,cr); }
  /* 빛나는 버섯 무더기 */
  if(c.shroom){ const sh=[]; for(let k=0;k<4;k++){ const [x0,z0]=spot(0.85), q0=underQ(x0,z0,true), y0=q0.f; if(q0.g<2||q0.w>-1e8) continue;
      for(let i=0;i<10;i++){ const x=x0+(rnd()-0.5)*1.6, z=z0+(rnd()-0.5)*1.6, q=underQ(x,z,true), r=0.06+rnd()*0.16;
        sh.push([x,q.f+0.05+r*0.6,z,r,r*0.7,r,0,0,0]); }
      GP.push(x0,y0+0.25,z0); GA.push(2.2,rnd(),0.34); if(k===0) lamps.push([x0,y0+1.0,z0,0x58ffd0,2.4,28]); }
    inst(G.shr,G.shrM,sh); }
  /* 반딧불이 유충 — 천장에 청록 점(32-caves.js 와 같은 재질) */
  for(let i=0,nG=Math.round(c.R*7);i<nG;i++){ const [x,z]=spot(0.85), q=underQ(x,z,true); if(q.g<3) continue;
    if(rnd()>0.65+0.35*Math.sin(x*0.21+c.p[0])*Math.sin(z*0.17+c.p[1])) continue;   // 무리를 지어 — 천장이 별밤처럼
    GP.push(x,q.c-0.15,z); GA.push(0.16+rnd()*0.2,rnd(),0.75+rnd()*0.25); }
  if(GP.length){ const gg=new THREE.BufferGeometry(); gg.setAttribute('position',new THREE.Float32BufferAttribute(GP,3)); gg.setAttribute('aG',new THREE.Float32BufferAttribute(GA,3));
    gg.computeBoundingSphere(); const pt=new THREE.Points(gg,caveGlowMat()); pt.userData.own=1; pt.frustumCulled=false; grp.add(pt); }
  /* 못 — 검푸른 물 · 둘레에 동굴어를 건지는 자리 넷 */
  if(c.pool&&c.pr){ const pm=new THREE.Mesh(new THREE.CircleGeometry(c.pr*0.98,32).rotateX(-Math.PI/2),G.pool); pm.geometry.userData=0; pm.userData.own=1; pm.position.set(c.x,c.wl,c.z); pm.renderOrder=3; grp.add(pm);
    for(let k=0;k<4;k++){ const a=k/4*6.283+rnd(), r=c.pr*0.82; d.picks.push({kind:'cavefish',x:c.x+Math.cos(a)*r,y:c.wl-0.15,z:c.z+Math.sin(a)*r,ay:c.wl,key:'UF'+c.sd+'_'+k,r:0.6,tree:false}); }
    lamps.push([c.x,c.wl+2.0,c.z,0x3ab8c8,2.2,c.pr+22]); }
  /* 박쥐 잠자리 — 천장 높은 데. 그 밑 바닥에 구아노 더미 */
  if(c.bats){ const [x,z]=spot(0.35), q=underQ(x,z,true); if(q.g>6){ d.roost={x,y:q.c-1.2,z,r:Math.min(c.R*0.5,18)};
      const gu=[]; for(let i=0;i<3;i++){ const gx=x+(rnd()-0.5)*3, gz=z+(rnd()-0.5)*3, gq=underQ(gx,gz,true), r=0.5+rnd()*0.6; gu.push([gx,gq.f-0.05,gz,r,r*0.35,r,0,0,0]);
        d.picks.push({kind:'guano',x:gx,y:gq.f+0.05,z:gz,ay:gq.f+0.15,key:'UG'+c.sd+'_'+i,r:0.55,tree:false}); }
      inst(G.mound,G.guano,gu); } }
  /* 거미줄 — 벽 가까이 천장 밑에 걸린다 · 가운데에 거미 */
  if(c.web){ for(let k=0;k<3;k++){ const a=rnd()*6.283, r=c.R*0.78, x=c.x+Math.cos(a)*r, z=c.z+Math.sin(a)*r, q=underQ(x,z,true); if(q.c-q.f<2.4) continue;
      const s=0.7+rnd()*0.6, y=q.f+Math.min(2.1,(q.c-q.f)*0.6), w=new THREE.Mesh(new THREE.PlaneGeometry(s*2,s*2),G.web); w.geometry.userData=0; w.userData.own=1;
      w.position.set(x,y,z); w.lookAt(c.x,y,c.z); grp.add(w);
      const sp=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,4),new THREE.MeshLambertMaterial({color:0x221c18})); sp.userData.own=1; sp.position.set(x,y+0.05,z); grp.add(sp);
      d.picks.push({kind:'web',x,y,z,ay:y,key:'UW'+c.sd+'_'+k,r:s*0.7,tree:false}); } }
  for(const l of lamps) LIGHT.addFire(grp,{color:l[3],intensity:l[4],dist:l[5],pos:[l[0],l[1],l[2]]});
  UNDER.grp.add(grp);
  return d;
}
/* ── 생물 ──────────────────────────────────────────────────────────────────── */
/* 박쥐 — 몸 하나에 날개 둘. 날갯짓은 정점 셰이더가 한다(날개 끝일수록 크게 · 마리마다 박자가 다르다) */
function batGeo(){
  const P=[0,0,0.07, 0.025,0,-0.05, -0.025,0,-0.05], W=[0,0,0];
  for(const s of [1,-1]) P.push(0.02*s,0,0.03, 0.24*s,0.01,-0.02, 0.11*s,0,-0.10, 0.02*s,0,0.03, 0.17*s,0.01,0.05, 0.24*s,0.01,-0.02), W.push(0,1,0.45,0,0.7,1);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('aW',new THREE.Float32BufferAttribute(W,1)); g.computeVertexNormals(); return g;
}
function underFauna(){
  if(UNDER.bats) return;
  const bm=new THREE.MeshLambertMaterial({color:0x2a2420,side:THREE.DoubleSide}); bm.onBeforeCompile=sh=>{ sh.uniforms.uBT=UNDER_U.t;
    sh.vertexShader='uniform float uBT;\nattribute float aW;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    { float ph=instanceMatrix[3].x*1.7+instanceMatrix[3].z*2.3; transformed.y+=aW*sin(uBT*17.0+ph)*0.11; }`); };
  bm.customProgramCacheKey=()=>'ubat';
  const bats=new THREE.InstancedMesh(batGeo(),bm,90); bats.count=0; bats.frustumCulled=false; UNDER.grp.add(bats);
  UNDER.bats={m:bats,list:[]};
  const fm=new THREE.InstancedMesh(fishGeo({id:'cavefish',len:0.16,tall:0.035,thick:0.028,c:[0xe8d4d0,0xf4e8e4,0xd8b8b4],pat:'none'}),new THREE.MeshLambertMaterial({vertexColors:true,emissive:0x221816}),48);
  fm.count=0; fm.frustumCulled=false; UNDER.grp.add(fm); UNDER.fish={m:fm,list:[]};
  /* 동굴영원 — 하얗고 가늘다(몸 · 꼬리 · 다리 넷) */
  const og=new THREE.SphereGeometry(1,8,6); og.scale(0.018,0.012,0.11);
  const om=new THREE.InstancedMesh(og,new THREE.MeshLambertMaterial({color:0xf0d8d4,emissive:0x281c1a}),16); om.count=0; om.frustumCulled=false; UNDER.grp.add(om); UNDER.olm={m:om,list:[]};
  /* 꼽등이 — 굽은 몸에 긴 다리(몸 덩이 + 긴 뒷다리 두 개로 줄여 그린다) */
  const cg=new THREE.SphereGeometry(1,7,5); cg.scale(0.013,0.016,0.028); cg.translate(0,0.022,0);
  const cm=new THREE.InstancedMesh(cg,new THREE.MeshLambertMaterial({color:0x8a7258}),60); cm.count=0; cm.frustumCulled=false; UNDER.grp.add(cm); UNDER.crick={m:cm,list:[]};
  /* 큰 동굴지네 — 마디 열여섯(몸 마디마다 다리 한 쌍을 납작한 판으로) */
  const sg=new THREE.SphereGeometry(1,8,5); sg.scale(0.07,0.035,0.075);
  const lg=new THREE.BoxGeometry(0.30,0.012,0.02); lg.translate(0,0,0);
  const geo=THREE.BufferGeometryUtils?THREE.BufferGeometryUtils.mergeBufferGeometries([sg,lg]):sg;
  const zm=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:0x6a2a18}),16*8); zm.count=0; zm.frustumCulled=false; UNDER.grp.add(zm); UNDER.cent={m:zm,list:[]};
}
const UNDER_U={t:{value:0}};
const _uM=new THREE.Matrix4(), _uQt=new THREE.Quaternion(), _uE=new THREE.Euler(), _uV=new THREE.Vector3(), _uS=new THREE.Vector3(1,1,1);
const underLit=()=>{ const e=equippedTool(); return !!(e&&e.lit); };
/* 가까운 방에 생물을 들인다(방의 꾸밈을 지을 때) */
function underPopulate(d){
  const c=d.c, rnd=mulberry32((c.sd^0x51)>>>0);
  if(d.roost) for(let i=0;i<14;i++) UNDER.bats.list.push({d,a:rnd()*6.283,r:d.roost.r*(0.3+0.7*rnd()),h:(rnd()-0.5)*3,sp:0.6+rnd()*0.5,sc:0,x:d.roost.x,y:d.roost.y,z:d.roost.z});
  if(c.pool&&c.pr){ for(let i=0;i<6;i++) UNDER.fish.list.push({d,a:rnd()*6.283,r:c.pr*(0.2+0.6*rnd()),sp:0.25+rnd()*0.3,key:'UF'+c.sd+'_'+(i&3)});
    for(let i=0;i<2;i++) UNDER.olm.list.push({d,a:rnd()*6.283,t:rnd()*100}); }
  for(let i=0;i<8;i++){ const a=rnd()*6.283, r=c.R*0.75*Math.sqrt(rnd()), x=c.x+Math.cos(a)*r, z=c.z+Math.sin(a)*r, q=underQ(x,z,true); if(q.g<1.5||q.w>-1e8) continue;
    const k={d,x,z,y:q.f,yaw:rnd()*6.283,hop:-1,hx:0,hz:0,t:rnd()*5}; k.pick={kind:'cricket',x,y:q.f,z,ay:q.f+0.03,key:'UC'+c.sd+'_'+i,r:0.18,tree:false,ref:k}; d.picks.push(k.pick); UNDER.crick.list.push(k); }
  if(c.cent&&!c.pit) for(let i=0;i<2;i++){ const a=rnd()*6.283, x=c.x+Math.cos(a)*c.R*0.5, z=c.z+Math.sin(a)*c.R*0.5;
    const s={d,x,z,yaw:rnd()*6.283,tr:[],cd:0,hp:3,flee:0}; for(let k=0;k<16;k++) s.tr.push([x,z]); UNDER.cent.list.push(s); }
}
function underUnpopulate(d){ for(const k of ['bats','fish','olm','crick','cent']) if(UNDER[k]) UNDER[k].list=UNDER[k].list.filter(o=>o.d!==d); }
function underCreatures(dt){
  const px=PL.pos.x, py=PL.pos.y, pz=PL.pos.z, t=UNDER.t, lit=underLit();
  /* 박쥐 — 잠자리 둘레를 돈다. 사람이 8 m 안(불을 들었으면 14 m)에 오면 흩어져 빨리 난다 */
  { const B=UNDER.bats; let n=0;
    for(const b of B.list){ const R=b.d.roost, dP=Math.hypot(R.x-px,R.z-pz), scare=dP<(lit?14:8)?1:0;
      b.sc+=(scare-b.sc)*clamp(dt*2,0,1); b.a+=dt*b.sp*(1+b.sc*2.2)/Math.max(2,b.r*(1+b.sc*0.6))*8;
      const rr=b.r*(1+b.sc*0.6), x=R.x+Math.cos(b.a)*rr, z=R.z+Math.sin(b.a)*rr, y=R.y+b.h*(1-b.sc*0.5)+Math.sin(b.a*3)*0.6;
      _uE.set(0,-b.a,0.4*(1+b.sc),'YXZ'); _uQt.setFromEuler(_uE); _uV.set(x,y,z); _uM.compose(_uV,_uQt,_uS); B.m.setMatrixAt(n++,_uM); if(n>=90) break; }
    B.m.count=n; B.m.instanceMatrix.needsUpdate=true; }
  /* 동굴어 — 못 속을 천천히 맴돈다(건진 자리는 다시 날 때까지 비운다) */
  { const Fh=UNDER.fish; let n=0;
    for(const f of Fh.list){ if(floraWait({kind:'cavefish',key:f.key})>0) continue; const c=f.d.c; f.a+=dt*f.sp/Math.max(0.6,f.r);
      _uE.set(0,-f.a-Math.PI,0,'YXZ'); _uQt.setFromEuler(_uE); _uV.set(c.x+Math.cos(f.a)*f.r,c.wl-0.35,c.z+Math.sin(f.a)*f.r); _uM.compose(_uV,_uQt,_uS); Fh.m.setMatrixAt(n++,_uM); if(n>=48) break; }
    Fh.m.count=n; Fh.m.instanceMatrix.needsUpdate=true; }
  /* 동굴영원 — 못가를 아주 느리게 긴다 */
  { const O=UNDER.olm; let n=0;
    for(const o of O.list){ const c=o.d.c; o.t+=dt; o.a+=dt*0.03*Math.sin(o.t*0.2); const r=c.pr*1.02, x=c.x+Math.cos(o.a)*r, z=c.z+Math.sin(o.a)*r;
      _uE.set(0,-o.a,0,'YXZ'); _uQt.setFromEuler(_uE); _uV.set(x,c.wl+0.01,z); _uM.compose(_uV,_uQt,_uS); O.m.setMatrixAt(n++,_uM); if(n>=16) break; }
    O.m.count=n; O.m.instanceMatrix.needsUpdate=true; }
  /* 꼽등이 — 가만있다 가끔 뛴다 · 사람이 1.6 m 안에 오면 바로 뛰어 달아난다 */
  { const K=UNDER.crick; let n=0;
    for(const k of K.list){ if(floraWait(k.pick)>0) continue;
      k.t-=dt; const dP=Math.hypot(k.x-px,k.z-pz);
      if(k.hop<0&&(k.t<0||dP<1.6)){ const away=dP<1.6?Math.atan2(k.z-pz,k.x-px):Math.random()*6.283, L=0.6+Math.random()*1.0;
        const nx=k.x+Math.cos(away)*L, nz=k.z+Math.sin(away)*L, q=underQ(nx,nz); if(q.g>1.2&&q.w<-1e8){ k.hop=0; k.hx=nx; k.hz=nz; k.ox=k.x; k.oz=k.z; k.oy=k.y; k.ny=q.f; k.yaw=-away+Math.PI/2; } k.t=2+Math.random()*6; }
      let y=k.y, x=k.x, z=k.z;
      if(k.hop>=0){ k.hop+=dt/0.35; const s=Math.min(1,k.hop); x=k.ox+(k.hx-k.ox)*s; z=k.oz+(k.hz-k.oz)*s; y=k.oy+(k.ny-k.oy)*s+Math.sin(Math.PI*s)*0.35;
        if(k.hop>=1){ k.hop=-1; k.x=k.hx; k.z=k.hz; k.y=k.ny; } }
      k.pick.x=x; k.pick.z=z; k.pick.y=y; k.pick.ay=y+0.03;
      _uE.set(0,k.yaw,0,'YXZ'); _uQt.setFromEuler(_uE); _uV.set(x,y,z); _uM.compose(_uV,_uQt,_uS); K.m.setMatrixAt(n++,_uM); if(n>=60) break; }
    K.m.count=n; K.m.instanceMatrix.needsUpdate=true; }
  /* 큰 동굴지네 — 방 바닥을 구불구불 기어 다닌다. 불빛(켠 횃불·전등) 7 m 안으로는 안 온다. 어둠 속이면 사람에게 다가와 문다(독) */
  { const Z=UNDER.cent; let n=0;
    for(const s of Z.list){ const c=s.d.c, dx=px-s.x, dz=pz-s.z, dP=Math.hypot(dx,dz);
      let want=s.yaw+Math.sin(t*0.7+c.sd)*0.9*dt;
      if(dP<16&&Math.abs(py-underQ(s.x,s.z).f)<3){ const to=Math.atan2(dz,dx); want=lit&&dP<9?to+Math.PI:(dP<12?to:want); }
      if(Math.hypot(s.x-c.x,s.z-c.z)>c.R*0.8) want=Math.atan2(c.z-s.z,c.x-s.x);
      let da=((want-s.yaw+Math.PI*3)%(Math.PI*2))-Math.PI; s.yaw+=clamp(da,-2.2*dt,2.2*dt);
      const sp=(lit&&dP<9)?2.6:(dP<12?1.8:0.7), nx=s.x+Math.cos(s.yaw)*sp*dt, nz=s.z+Math.sin(s.yaw)*sp*dt, q=underQ(nx,nz);
      if(q.g>1.0&&q.w<-1e8){ s.x=nx; s.z=nz; } else s.yaw+=1.5;
      s.tr.unshift([s.x,s.z]); if(s.tr.length>16*3) s.tr.length=16*3;
      s.cd-=dt; if(dP<1.5&&!lit&&s.cd<=0&&PL.under){ s.cd=3.5; hurtPL(9,'큰 동굴지네에게 물렸다'); PL.ill=Math.max(PL.ill||0,40); toast('큰 동굴지네에게 물렸다 — 독이 퍼진다(켠 횃불·전등을 들면 다가오지 않는다)'); }
      for(let k=0;k<16&&n<16*8;k++){ const a=s.tr[Math.min(s.tr.length-1,k*3)], b=s.tr[Math.min(s.tr.length-1,k*3+1)], yy=underQ(a[0],a[1]).f+0.03;
        _uE.set(0,-Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2,0,'YXZ'); _uQt.setFromEuler(_uE); _uV.set(a[0],yy,a[1]); _uS.setScalar(1-k*0.025); _uM.compose(_uV,_uQt,_uS); Z.m.setMatrixAt(n++,_uM); }
      _uS.setScalar(1); }
    Z.m.count=n; Z.m.instanceMatrix.needsUpdate=true; }
}
/* ── 수직굴 — 땅 위 굴 바닥의 구멍 · 밧줄 · 굴뚝 ──────────────────────────────── */
function underBuild(){
  if(UNDER.grp){ scene.remove(UNDER.grp); }
  UNDER.grp=new THREE.Group(); UNDER.grp.visible=false; scene.add(UNDER.grp);
  UNDER.pitGrp&&scene.remove(UNDER.pitGrp);
  if(!UNDER.ok) return;
  const pg=new THREE.Group(); UNDER.pitGrp=pg; scene.add(pg);
  const hole=new THREE.MeshBasicMaterial({color:0x020303}), rope=new THREE.MeshLambertMaterial({color:0x8a6a3a}), wood=new THREE.MeshLambertMaterial({color:0x5a4228});
  const shaftM=new THREE.MeshLambertMaterial({color:0x4a4640,side:THREE.BackSide});
  for(const p of UNDER.pits){
    p.ys=heightAt(p.x,p.z);
    const h=new THREE.Mesh(new THREE.CircleGeometry(1.55,24).rotateX(-Math.PI/2),hole); h.position.set(p.x,p.ys+0.04,p.z); pg.add(h);
    for(let k=0;k<9;k++){ const a=k/9*6.283, r=0.24+0.12*Math.sin(k*2.3), s=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),wood.clone()); s.material.color.setHex(0x6e6a62);
      s.position.set(p.x+Math.cos(a)*1.75,p.ys+r*0.4,p.z+Math.sin(a)*1.75); pg.add(s); }
    const stake=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,1.1,6),wood); stake.position.set(p.x+1.9,p.ys+0.5,p.z); pg.add(stake);
    const L=p.ys-p.yf, rp=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,L+0.9,5),rope); rp.position.set(p.x+0.55,p.ys-L/2+0.45,p.z); pg.add(rp);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.4,5),rope); top.rotation.z=Math.PI/2; top.position.set(p.x+1.2,p.ys+0.9,p.z); pg.add(top);
    const D=p.ys-p.yc+0.5, sh=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,D,14,Math.max(1,Math.round(D/4)),true),shaftM);
    { const a=sh.geometry.attributes.position; for(let i=0;i<a.count;i++){ const x=a.getX(i), y=a.getY(i), z=a.getZ(i), k=1+0.12*Math.sin(y*0.7+Math.atan2(z,x)*3); a.setXYZ(i,x*k,y,z*k); } sh.geometry.computeVertexNormals(); }
    sh.position.set(p.x,p.ys-D/2+0.02,p.z); pg.add(sh);
  }
}
/* 수직굴 오르내리기 — Space 를 누른 순간 구멍(땅 위) 또는 밧줄(밑) 곁이면 탄다. 타는 동안은 몸 움직임을 대신 맡는다(80-player.js) */
function underRopeTick(dt){
  if(!UNDER.ok) return false;
  const p=PL.pos, spTap=!!keys.Space&&!UNDER.sp0; UNDER.sp0=!!keys.Space;
  const R=UNDER.rope;
  if(R){
    if(R.dir>0){ PL.stam-=7*dt*(1+invLoad()); if(PL.stam<=0){ PL.stam=0; R.dir=-1; R.y0=p.y; R.y1=R.p.yf; R.t=0; R.T=Math.max(1.2,(p.y-R.y1)/9); toast('팔에 힘이 다했다 — 미끄러져 내려간다'); } }
    R.t+=dt; const s=clamp(R.t/R.T,0,1), e=s*s*(3-2*s);
    p.set(R.p.x+0.4,R.y0+(R.y1-R.y0)*e,R.p.z+0.05); PL.vel.set(0,0,0);
    PL.under=p.y<R.p.ys-4;
    camera.position.set(p.x,p.y+PL.eye,p.z); camera.rotation.set(PL.pitch,PL.yaw,0,'YXZ');
    if(s>=1){ UNDER.rope=null;
      if(R.dir>0){ const a=Math.atan2(R.p.rm.z-R.p.z,R.p.rm.x-R.p.x); p.set(R.p.x+Math.cos(a)*2.4,heightAt(R.p.x+Math.cos(a)*2.4,R.p.z+Math.sin(a)*2.4)+0.05,R.p.z+Math.sin(a)*2.4); PL.under=false; toast('땅 위로 올라왔다'); }
      else{ p.y=R.p.yf; PL.under=true; toast('땅속 — 어둡다. 횃불이나 전등을 들어라 · 밧줄 곁에서 Space 로 올라간다'); }
      PL.camY=undefined; PL.grounded=true; }
    return true;
  }
  if(DEV.on||PL.swim) return false;
  for(const q of UNDER.pits){ const d=Math.hypot(p.x-q.x,p.z-q.z); if(d>2.2) continue;
    const top=Math.abs(p.y-q.ys)<1.6, bot=Math.abs(p.y-q.yf)<1.6;
    if(!top&&!bot) continue;
    if(!UNDER.hint||UNDER.hint!==q){ UNDER.hint=q; toast(top?'수직굴 — Space 로 밧줄을 타고 내려간다(깊이 '+Math.round(q.ys-q.yf)+' m)':'밧줄 — Space 로 타고 올라간다(기력이 든다)'); }
    if(spTap&&d<1.8){ UNDER.rope=top?{p:q,dir:-1,t:0,y0:p.y,y1:q.yf,T:Math.max(3,(q.ys-q.yf)/9)}:{p:q,dir:1,t:0,y0:p.y,y1:q.ys,T:Math.max(4,(q.ys-q.yf)/5)};
      sfx('bind'); return true; }
    return false; }
  if(UNDER.hint&&Math.hypot(p.x-UNDER.hint.x,p.z-UNDER.hint.z)>3) UNDER.hint=false;
  return false;
}
/* ── 프레임마다 — 땅속인가 · 빛 · 칸과 방 짓기 · 생물 ─────────────────────────── */
const _uC=new THREE.Color();
function updateUnder(dt){
  if(!UNDER.ok||!UNDER.grp) return;
  const p=PL.pos;
  if(!UNDER.rope&&!PL.dead) PL.under=underIn(p.x,p.z,p.y)&&underQ(p.x,p.z).g>0.2;
  const want=(PL.under||(UNDER.rope&&p.y<UNDER.rope.p.ys-6))?1:0;
  UNDER.u+=(want-UNDER.u)*clamp(dt*1.6,0,1); if(Math.abs(UNDER.u-want)<0.002) UNDER.u=want;
  const u=UNDER.u, show=u>0.01||!!UNDER.rope;
  if(u===0&&UNDER.g0){ hemi.groundColor.copy(UNDER.g0); UNDER.g0=null; }              // 땅 위로 — 하늘빛의 땅 쪽 색을 되돌린다
  UNDER.grp.visible=show;
  if(u>0){                                          // 해·하늘빛을 끄고 어둠 안개(updateSky 다음 — 그 값에 곱한다)
    /* 땅속의 희미한 빛 — 반딧불이 유충·버섯·결정이 내는 청록빛이 굴 전체에 아주 엷게 돈다(그래야 굴의 생김새가 어렴풋이 보인다) */
    sun.intensity*=1-u; amb.intensity=lerp(amb.intensity,0.08,u); hemi.intensity=lerp(hemi.intensity,0.58,u);
    _uC.setRGB(0.34,0.50,0.52); hemi.color.lerp(_uC,u);                                   // 하늘 쪽 색은 updateSky 가 프레임마다 다시 쓴다
    if(!UNDER.g0) UNDER.g0=hemi.groundColor.clone();                                     // 땅 쪽 색은 아무도 다시 안 쓴다 — 처음 것을 두고 거기서 섞는다
    hemi.groundColor.copy(UNDER.g0).lerp(_uC,u);                                         // 천장(아래를 보는 면)도 같은 빛을 받는다
    _uC.setRGB(0.010,0.012,0.014); scene.fog.color.lerp(_uC,u); scene.fog.density=lerp(scene.fog.density,0.018,u);
    if(typeof rainMesh!=='undefined'&&rainMesh) rainMesh.visible=rainMesh.visible&&u<0.5;
  }
  if(!show) return;
  UNDER.t+=dt; UNDER_U.t.value=UNDER.t;
  /* 칸 — 사람 둘레 R 안을 짓고 밖은 버린다(한 프레임에 둘까지) */
  const T=UNDER.T, R=UNDER.R, ctx=Math.floor(p.x/T), ctz=Math.floor(p.z/T), rn=Math.ceil(R/T);
  let built=0;
  for(let dz=-rn;dz<=rn&&built<2;dz++) for(let dx=-rn;dx<=rn&&built<2;dx++){ const tx=ctx+dx, tz=ctz+dz, k=UGK(tx,tz);
    if(UNDER.tiles.has(k)) continue; const cx=(tx+0.5)*T-p.x, cz=(tz+0.5)*T-p.z; if(cx*cx+cz*cz>(R+T)*(R+T)) continue;
    UNDER.tiles.set(k,underTile(tx,tz)); built++; }
  if(UNDER.t%1<dt) for(const [k,t] of UNDER.tiles){ const cx=(t.tx+0.5)*T-p.x, cz=(t.tz+0.5)*T-p.z; if(cx*cx+cz*cz>(R+T*2)*(R+T*2)){ underTileDrop(t); UNDER.tiles.delete(k); } }
  /* 방의 꾸밈 · 생물 — 220 m 안의 방 */
  if(!UNDER.bats) underFauna();
  if(Math.hypot(p.x-UNDER.cx,p.z-UNDER.cz)>12){ UNDER.cx=p.x; UNDER.cz=p.z;
    for(const c of UNDER.ch){ const d=Math.hypot(c.x-p.x,c.z-p.z), has=UNDER.deco.get(c);
      if(d<220+c.R&&!has){ const dd=underDeco(c); UNDER.deco.set(c,dd); underPopulate(dd); }
      else if(d>300+c.R&&has){ underUnpopulate(has); underDecoDrop(has); UNDER.deco.delete(c); } }
    UNDER.picks.length=0; for(const d of UNDER.deco.values()) for(const q of d.picks) UNDER.picks.push(q); }
  if(PL.under) underCreatures(dt);
}
/* ── 아이템 · 딸 것 · 제작 ─────────────────────────────────────────────────── */
Object.assign(ITEMS,{
  guano:      {n:'박쥐 구아노', kg:0.5,  c:0x4a3a2a, use:'박쥐 똥이 쌓여 삭은 것 — 재·물과 우려 졸이면 초석이 된다(화약의 바탕)'},
  cavefish:   {n:'동굴어',     kg:0.12, c:0xecd8d4, use:'땅속 못의 눈먼 하얀 물고기 — 구워 먹는다', food:3, raw:true, fishy:1, tags:['fish','finfish'], rot:72},
  cavefish_cooked:{n:'구운 동굴어', kg:0.1, c:0xc8a888, use:'살이 희고 부드럽다(허기 12)', food:12, fishy:1},
  cricket:    {n:'꼽등이',     kg:0.01, c:0x8a7258, use:'땅속 바닥을 뛰어다니는 벌레 — 구우면 고소하다', food:1, raw:true},
  cricket_roast:{n:'구운 꼽등이', kg:0.01, c:0x6a4a2a, use:'바삭하다(허기 5)', food:5}
});
FIRING.cavefish={out:'cavefish_cooked',hours:0.12,count:1};
FIRING.cricket={out:'cricket_roast',hours:0.05,count:1};
Object.assign(FLORA_PICK,{
  guano   :{item:'guano',      n:'구아노 더미', verb:'긁어 담기',   regrow:96, cnt:[1,3], dur:1.6, stam:3},
  cavefish:{item:'cavefish',   n:'못의 동굴어', verb:'맨손으로 건지기', regrow:30, cnt:[1,1], dur:2.4, stam:4},
  cricket :{item:'cricket',    n:'꼽등이',     verb:'덮쳐 잡기',   regrow:20, cnt:[1,1], dur:0.5, stam:2},
  web     :{item:'spider_silk',n:'동굴거미의 줄', verb:'감아 걷기', regrow:72, cnt:[1,2], dur:1.4, stam:2}
});
RECIPES.push({id:'saltpeter_guano', tier:'화학', n:'구아노로 초석 우리기', out:{id:'saltpeter',n:2}, time:20, stam:6, station:'fire',
  note:'박쥐 구아노와 재를 물 담은 토기에 우려 거르고 졸이면 흰 초석이 앉는다(옛날 화약은 굴의 박쥐 똥에서 나왔다).',
  in:[{id:'guano',n:3},{id:'ash',n:1},{id:'pot_water',n:1}]});
{ const g=CHEM_GROUPS.find(g=>g[0]==='산 · 염'); if(g) g[1].splice(g[1].indexOf('saltpeter')+1,0,'saltpeter_guano'); }
