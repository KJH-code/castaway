/* 97-temples.js — CASTAWAY
   옛 신전 둘(지형 판 8 · 사용자 요청) — 섬 한가운데의 계단 신전 · 깊은 바다 낭떠러지의 해저 신전 · 들판의 바위 솎기 · 험한 데의 더 나은 소출
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   옛 신전(사용자 요청: 섬 한가운데에 좋은 것을 두어 사람이 움직이게 — 옛 신전 · 깊은 바다의 해저 신전에 백금 반지)
   ----------------------------------------------------------------------------
   · **뭍의 신전** — 섬 뭍의 무게중심에서 가장 가까운, 물길에서 떨어지고 고른 땅에 선다. 그 둘레(반지름 36 m)를 판판하게 다지고
     (높이 지도 — 자원을 놓기 전에) 정글 계단 신전을 세운다: 넓은 기단 · 다섯 켜 계단 탑(켜마다 돌덩이 두 켜 · 윗면 판돌) ·
     앞쪽 큰 계단(38°) · 꼭대기 사당(문 · 계단식 지붕) · 마당의 판돌 · 둘레의 돌기둥(서 있거나 부러지거나 쓰러졌다).
     사당 제단 위의 **상자**와 계단 둘레의 **항아리** 넷에 좋은 것이 들었다.
   · **해저 신전** — 섬 밖 바다 밑, 해구(검은 낭떠러지 — 10-worldgen.js seaTrenches) 가장자리의 수심 30~45 m 턱에 선다.
     그리스식 — 세 단 기단 · 둘레 기둥 스물넷(반은 부러지고 몇은 쓰러졌다) · 무너진 안채(돌덩이 벽 · 윗단이 빠졌다) · 제단의 상자에
     **백금 반지**(섬에서 백금 반지가 나는 데는 여기뿐이다 — 예전엔 처음부터 지녔다) · 둘레의 항아리. 기둥에 핀 푸른 빛이끼가 어둠 속에서 길잡이가 된다.
     잠수 장비(대통 공기통 · 잠수 돌 · 오리발 — 80-player.js)가 있어야 닿는다.
   · 둘 다 시드가 정한다(제 난수 — 다른 지형의 난수 차례를 안 건드린다). 연 상자·항아리는 저장에 남는다(`temples`).
   · 몸 막힘은 돌덩이마다 상자(방향이 돌아간 직육면체) — 주상절리 기둥과 같은 규칙(밑이 발에서 1.9 m 안이면 그 윗면이 바닥 ·
     높으면 벽 · 머리 위면 천장 — 34-coast.js coastFloor · coastSolid 가 먼저 이것을 본다)
   ========================================================================== */
const TEMPLE={hi:60, land:null, sea:null, boxes:[], grid:new Map(), meshes:[], picks:[], taken:new Set(), G:8, glow:null};
const templeKey=(x,z)=>(Math.floor(x/TEMPLE.G)+4096)*8192+(Math.floor(z/TEMPLE.G)+4096);
function templeClear(){
  for(const m of TEMPLE.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); }
  TEMPLE.meshes.length=0; TEMPLE.boxes.length=0; TEMPLE.grid.clear(); TEMPLE.picks.length=0; TEMPLE.land=TEMPLE.sea=null;
}
/* ── 자리 ── */
/* 뭍의 신전 — 섬을 키운 뒤(worldRescale) · 자원을 놓기 전. 둘레를 다진다 */
function templeLandSite(seed){
  templeClear(); TEMPLE.taken.clear();
  { let hi=1; for(let i=0;i<F.elev.length;i++) if(F.elev[i]>hi) hi=F.elev[i]; TEMPLE.hi=hi; }
  if((P.tv|0)<8) return;
  const E=F.elev; let HI=1; for(let i=0;i<E.length;i++) if(E[i]>HI) HI=E[i];   // 섬을 키운 뒤의 꼭대기(stats.hi 는 키우기 전 값이다)
  TEMPLE.hi=HI;
  let sx=0, sz=0, n=0; for(let z=0;z<N;z++) for(let x=0;x<N;x++){ if(E[IDX(x,z)]>0.5){ sx+=x; sz+=z; n++; } }
  if(!n) return;
  const cx=sx/n, cz=sz/n, rnd=mulberry32((seed^0x7e3a1e)>>>0), RC=Math.ceil(36/CELL)+1;
  let best=-1, bs=1e18;
  const R=Math.round(Math.min(N*0.22,1400/CELL));
  for(let z=Math.max(RC+2,Math.round(cz-R));z<Math.min(N-RC-2,Math.round(cz+R));z++)
    for(let x=Math.max(RC+2,Math.round(cx-R));x<Math.min(N-RC-2,Math.round(cx+R));x++){
      const i=IDX(x,z), e=E[i]; if(e<4||e>HI*0.75||F.river[i]||F.dRiver[i]<70||F.dWater[i]<90||F.biome[i]===B.FUMAROLE) continue;
      let lo=1e9, hi=-1e9; for(let dz=-RC;dz<=RC;dz++) for(let dx=-RC;dx<=RC;dx++){ const v=E[i+dz*N+dx]; if(v<lo) lo=v; if(v>hi) hi=v; }
      const d=Math.hypot(x-cx,z-cz)*CELL, sc=d/350+(hi-lo)/5+rnd()*0.3;
      if(sc<bs){ bs=sc; best=i; } }
  if(best<0) return;
  const gx=best%N, gz=(best/N)|0, wx=(gx-N/2)*CELL, wz=(gz-N/2)*CELL;
  /* 앞(계단)은 내리막 쪽 — 사람이 아래에서 올라온다 */
  const ex=E[best+3]-E[best-3], ez=E[best+3*N]-E[best-3*N], yaw=Math.atan2(-ex,-ez);
  /* 다지기 — 반지름 36 m 는 고른 높이(가운데 둘레의 가운데값), 그 밖 40 m 에 걸쳐 원래 땅으로 이어진다 */
  const vals=[]; for(let dz=-2;dz<=2;dz++) for(let dx=-2;dx<=2;dx++) vals.push(E[best+dz*N+dx]); vals.sort((a,b)=>a-b);
  const y0=vals[(vals.length/2)|0], RP=36, RB=40, K=Math.ceil((RP+RB)/CELL)+1;
  for(let dz=-K;dz<=K;dz++) for(let dx=-K;dx<=K;dx++){ const x=gx+dx, z=gz+dz; if(x<1||z<1||x>=N-1||z>=N-1) continue;
    const i=IDX(x,z); if(F.river[i]||E[i]<=0.3) continue; const d=Math.hypot(dx,dz)*CELL;
    if(d<RP) E[i]=y0; else if(d<RP+RB){ const t=(d-RP)/RB, s=t*t*(3-2*t); E[i]=y0+(E[i]-y0)*s; } }
  computeSlope();
  TEMPLE.land={x:wx,z:wz,y:y0,yaw,R:RP};
}
/* 해저 신전 — 바다 바닥을 다 빚은 뒤(shapeSeabed · seaTrenches). 해구 가장자리의 30~45 m 턱 */
function templeSeaSite(seed){
  if((P.tv|0)<8) return;
  const E=F.elev, rnd=mulberry32((seed^0x5ea7e1)>>>0), land=12, deepR=Math.ceil(90/CELL);
  let best=-1, bs=1e18;
  for(let z=land+2;z<N-land-2;z+=2) for(let x=land+2;x<N-land-2;x+=2){
    const i=IDX(x,z), e=E[i]; if(e>-30||e<-46) continue;
    let near=false; for(let a=0;a<16&&!near;a++){ const an=a/16*6.283; for(let r=3;r<=land;r+=3){ const xx=Math.round(x+Math.cos(an)*r), zz=Math.round(z+Math.sin(an)*r); if(E[IDX(xx,zz)]>-2){ near=true; break; } } }
    if(near) continue;                                                       // 뭍에서 180 m 넘게 떨어진다
    let lo=0; for(let dz=-deepR;dz<=deepR;dz+=2) for(let dx=-deepR;dx<=deepR;dx+=2){ const xx=x+dx, zz=z+dz; if(xx<0||zz<0||xx>=N||zz>=N) continue; lo=Math.min(lo,E[IDX(xx,zz)]); }
    let fl=0; for(let dz=-2;dz<=2;dz++) for(let dx=-2;dx<=2;dx++) fl=Math.max(fl,Math.abs(E[IDX(x+dx,z+dz)]-e));
    /* 낭떠러지 가까이 · 바닥이 고르고 · 섬에서 너무 멀지 않게(가까운 뭍까지 — 대략 바깥으로 갈수록 깊다) */
    const sc=(lo<-70?0:1.5)+fl/6+Math.hypot(x-N/2,z-N/2)/N*1.2+rnd()*0.4;
    if(sc<bs){ bs=sc; best=i; } }
  if(best<0) return;
  const gx=best%N, gz=(best/N)|0, y0=Math.max(-44,Math.min(-30,E[best])), RP=26, RB=24, K=Math.ceil((RP+RB)/CELL)+1;
  for(let dz=-K;dz<=K;dz++) for(let dx=-K;dx<=K;dx++){ const x=gx+dx, z=gz+dz; if(x<1||z<1||x>=N-1||z>=N-1) continue;
    const i=IDX(x,z); if(E[i]>-6) continue; const d=Math.hypot(dx,dz)*CELL;
    if(d<RP) E[i]=y0; else if(d<RP+RB){ const t=(d-RP)/RB, s=t*t*(3-2*t); E[i]=Math.min(-6,y0+(E[i]-y0)*s); } }
  /* 낭떠러지 쪽을 등지고 선다(앞은 섬 쪽 — 올라온 쪽) */
  const yaw=Math.atan2(-(gx-N/2),-(gz-N/2))+Math.PI;
  TEMPLE.sea={x:(gx-N/2)*CELL, z:(gz-N/2)*CELL, y:y0, yaw, R:RP};
}
/* 신전 터의 자원·나무를 치운다(자원을 다 놓은 뒤 — placeResources 끝) */
function templeNear(x,z,pad){
  for(const T of [TEMPLE.land,TEMPLE.sea]) if(T){ const dx=x-T.x, dz=z-T.z, r=T.R+(pad||0); if(dx*dx+dz*dz<r*r) return true; }
  return false;
}
function templeClearProps(){ if(TEMPLE.land||TEMPLE.sea) PROPS=PROPS.filter(p=>p.cave||!templeNear(p.x,p.z,3)); }

/* ── 돌덩이와 몸 막힘 ─────────────────────────────────────────────────────────
   돌덩이 하나 = 방향이 돌아간 직육면체(꼭짓점마다 몇 cm 흔들어 모서리가 깨진 듯) · 면마다 제 법선 · 덩이마다 빛깔과 이끼 */
function templeBuilder(T,base,moss){
  const cs=Math.cos(T.yaw), sn=Math.sin(T.yaw), P=[], Nn=[], C=[], M=[];
  const W=(lx,lz)=>[T.x+lx*cs+lz*sn, T.z-lx*sn+lz*cs];                 // 신전 좌표(앞 +z) → 세계
  const rnd=mulberry32(hashStr('tmpl|'+Math.round(T.x)+'|'+Math.round(T.z)));
  const B={rnd,W,
    /* lx,ly,lz — 밑면 가운데(신전 좌표 · ly 는 신전 바닥에서의 높이) · w,h,d — 크기 · ya — 덩이의 돌림 · col 빛깔 배율 · solid 몸 막힘 · jit 깨짐(m) */
    block(lx,ly,lz,w,h,d,o){ o=o||{};
      const ya=o.ya||0, jit=o.jit===undefined?0.05:o.jit, k=(o.col||1)*(0.86+0.24*rnd()), tl=o.tilt||0;
      const ca=Math.cos(ya), sa=Math.sin(ya), [wx,wz]=W(lx,lz), y=T.y+ly;
      const cor=[]; for(let q=0;q<8;q++){ const sx=(q&1?0.5:-0.5)*w, sy=(q&2?1:0)*h, sz=(q&4?0.5:-0.5)*d;
        const jx=(rnd()-0.5)*2*jit, jy=(rnd()-0.5)*2*jit*(sy>0?1:0.3), jz=(rnd()-0.5)*2*jit;
        let ax=sx+jx, az=sz+jz, ay=sy+jy+tl*sx;                         // tl — 기울어진 덩이(쓰러진 돌)
        const bx=ax*ca+az*sa, bz=-ax*sa+az*ca;                          // 덩이 돌림 → 신전 돌림
        cor.push([wx+bx*cs+bz*sn, y+ay, wz-bx*sn+bz*cs]); }
      const F_=[[0,2,6,4],[1,5,7,3],[0,1,3,2],[4,6,7,5],[2,3,7,6],[0,4,5,1]];   // −x +x −z +z +y −y
      for(let f=0;f<6;f++){ if(o.noBottom&&f===5) continue; const q=F_[f], a=cor[q[0]], b=cor[q[1]], c=cor[q[2]], d2=cor[q[3]];
        const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2], vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
        let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
        const top=ny>0.6, cc=k*(top?1.06:f===5?0.6:0.95);
        const mg=top?moss*(0.4+0.6*rnd()):moss*0.25*rnd();              // 윗면에 이끼(정점 빛깔 — 푸르게 · 어둡게)
        const cr=base[0]*cc*(1-mg*0.45), cg=base[1]*cc*(1-mg*0.12), cb=base[2]*cc*(1-mg*0.55);
        for(const v of [a,b,c,a,c,d2]){ P.push(v[0],v[1],v[2]); Nn.push(nx,ny,nz); C.push(cr,cg,cb); M.push(0); } }
      if(o.solid!==false) templeBox(T,lx,ly,lz,w,h,d,ya);
    },
    mesh(mat){ if(!P.length) return null;
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
      g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setAttribute('aMelt',new THREE.Float32BufferAttribute(M,1)); g.computeBoundingSphere();
      const m=new THREE.Mesh(g,mat); m.castShadow=m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); TEMPLE.meshes.push(m); return m; }
  };
  return B;
}
/* 몸 막힘 상자 — 신전 좌표 → 세계(가운데 · 반폭 · 돌림) */
function templeBox(T,lx,ly,lz,w,h,d,ya){
  const cs=Math.cos(T.yaw), sn=Math.sin(T.yaw), x=T.x+lx*cs+lz*sn, z=T.z-lx*sn+lz*cs, r=T.yaw+(ya||0);
  const b={x,z,c:Math.cos(r),s:Math.sin(r),hw:w/2,hd:d/2,b:T.y+ly,t:T.y+ly+h};
  TEMPLE.boxes.push(b);
  const R=Math.hypot(w,d)/2, x0=Math.floor((x-R)/TEMPLE.G), x1=Math.floor((x+R)/TEMPLE.G), z0=Math.floor((z-R)/TEMPLE.G), z1=Math.floor((z+R)/TEMPLE.G);
  for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const k=(gx+4096)*8192+(gz+4096); let a=TEMPLE.grid.get(k); if(!a) TEMPLE.grid.set(k,a=[]); a.push(b); }
}
const _tIn=(b,x,z)=>{ const dx=x-b.x, dz=z-b.z, lx=dx*b.c-dz*b.s, lz=dx*b.s+dz*b.c; return Math.abs(lx)<=b.hw&&Math.abs(lz)<=b.hd; };
/* 딛는 높이 — 주상절리 기둥과 같은 규칙(34-coast.js coastFloor) */
function templeFloor(x,z,fromY,t){
  const a=TEMPLE.grid.get(templeKey(x,z)); if(!a) return t;
  const ref=fromY===undefined?-1e9:fromY;
  let more=true;
  while(more){ more=false; for(const b of a){ if(b.t>t&&b.b<=Math.max(t,ref)+1.9&&_tIn(b,x,z)){ t=b.t; more=true; } } }   // 쌓인 덩이는 차례로 이어 올린다
  return t;
}
function templeSolid(x,z,y0,y1){
  const a=TEMPLE.grid.get(templeKey(x,z)); if(!a) return false;
  if(y1===undefined) y1=y0;
  for(const b of a) if(b.b<y1&&b.t>y0&&_tIn(b,x,z)) return true;
  return false;
}

/* ── 그리기 ── */
let _tMat=null, _tSeaMat=null, _tWood=null;
function templeMat(){ if(_tMat) return _tMat; const m=rockMat('templestone',0xc4bba6); m.vertexColors=true; m.userData.melt=0; m.userData.meltAttr=false; return _tMat=m; }
function templeSeaMat(){ if(_tSeaMat) return _tSeaMat; const m=rockMat('templesea',0xc8c2b4); m.vertexColors=true; m.userData.melt=0; m.userData.meltAttr=false; return _tSeaMat=m; }
function templeWood(){ return _tWood||(_tWood=new THREE.MeshLambertMaterial({color:0x6a4a2c})); }
/* 줍는 자리 — 상자(chest) · 항아리(urn). 상자·항아리의 꼴은 따로 그린다 */
function templePick(T,kind,lx,ly,lz,id,deep){
  const cs=Math.cos(T.yaw), sn=Math.sin(T.yaw), x=T.x+lx*cs+lz*sn, z=T.z-lx*sn+lz*cs, y=T.y+ly;
  TEMPLE.picks.push({kind,x,z,y,ay:y+(kind==='tchest'?0.35:0.4),r:kind==='tchest'?0.55:0.4,key:'T'+(deep?'s':'l')+id,deep:!!deep,swim:!!deep});
  return {x,y,z};
}
function templeBuild(){
  for(const m of TEMPLE.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); }
  TEMPLE.meshes.length=0; TEMPLE.boxes.length=0; TEMPLE.grid.clear(); TEMPLE.picks.length=0;
  if(TEMPLE.land) templeBuildLand(TEMPLE.land);
  if(TEMPLE.sea) templeBuildSea(TEMPLE.sea);
}
/* 정글 계단 신전 — 앞이 +z(신전 좌표) */
function templeBuildLand(T){
  const S=templeBuilder(T,[1.02,0.98,0.90],0.55), r=S.rnd, wood=[], urns=[];
  /* 마당 — 판돌(2.2 m · 군데군데 빠지고 들렸다). 기단 밖 22 m 네모 */
  for(let z=-21;z<=21;z+=2.2) for(let x=-21;x<=21;x+=2.2){ if(Math.abs(x)<15.5&&Math.abs(z)<15.5) continue; if(r()<0.14) continue;
    S.block(x+(r()-0.5)*0.15,-0.22+(r()-0.5)*0.06,z+(r()-0.5)*0.15,2.1,0.34,2.1,{ya:(r()-0.5)*0.08,solid:false,jit:0.04,col:0.95}); }
  /* 기단 — 30 m 네모 · 0.8 m(돌덩이 한 켜) */
  const blk=(x,y,z,w,h,d,o)=>S.block(x,y,z,w,h,d,o);
  const ring=(s,y,h,dep,len)=>{ // 네모 둘레를 돌덩이로 — 한 변 s · 높이 h · 깊이 dep
    for(let side=0;side<4;side++){ const n=Math.max(1,Math.round(s/len)), L=s/n;
      for(let k=0;k<n;k++){ const u=-s/2+L*(k+0.5)+(side&1?0:0);
        const off=(side>>1)?-1:1, ax=side&1;                              // 0 앞 · 1 오른쪽 · 2 뒤 · 3 왼쪽
        const x=ax?off*(s/2-dep/2):u, z=ax?u:off*(s/2-dep/2);
        blk(x,y,z,ax?dep:L-0.04,h,ax?L-0.04:dep,{solid:false,jit:0.06}); } } };
  ring(30,-0.5,0.8,1.6,2.5); blk(0,-0.5,0,26.6,0.8,26.6,{solid:false,jit:0}); templeBox(T,0,-0.5,0,30,0.8,30,0);
  /* 다섯 켜 — 켜마다 2.2 m(돌덩이 두 켜) · 1.8 m 씩 들어간다 */
  const TOP=0.3+2.2*5;
  for(let k=0;k<5;k++){ const s=24-3.6*k, y=0.3+2.2*k;
    ring(s,y,1.1,1.6,2.4); ring(s-0.12,y+1.1,1.1,1.6,2.6);
    blk(0,y,0,s-3.0,2.18,s-3.0,{solid:false,jit:0});                      // 속(안 보인다 — 윗면만 판돌이 덮는다)
    templeBox(T,0,y,0,s,2.2,s,0);
    const sN=s-3.6;                                                       // 윗면 판돌(다음 켜와 이 켜 사이 1.8 m 띠)
    for(let side=0;side<4;side++) for(let u=-s/2+0.9;u<s/2-0.8;u+=1.8){ const off=(side>>1)?-1:1, ax=side&1;
      const x=ax?off*(s/2-0.9):u, z=ax?u:off*(s/2-0.9); if(k<4&&Math.abs(ax?z:x)<sN/2-0.2&&Math.abs(ax?x:z)<sN/2) continue;
      blk(x,y+2.2-0.02,z,1.76,0.2,1.76,{solid:false,jit:0.03,col:1.03}); } }
  /* 꼭대기 판돌 */
  for(let z=-4.2;z<=4.2;z+=1.8) for(let x=-4.2;x<=4.2;x+=1.8) blk(x,TOP-0.02,z,1.76,0.2,1.76,{solid:false,jit:0.03});
  /* 앞 계단 — 너비 4.4 m · 38°(오르기 0.275 · 디딤 0.355) · 땅에서 꼭대기까지 */
  const NS=40, rise=(TOP-0.3)/NS, z0=12+7.0, z1=4.8, run=(z0-z1)/NS;
  for(let i=0;i<NS;i++){ const zf=z0-i*run, zb=Math.min(zf,12-1.8*Math.floor(i*rise/2.2))-0.01, zz=Math.max(z1-0.3,zb-2.5);
    const len=zf-zz; blk(0,-0.3,zf-len/2,4.4,0.6+(i+1)*rise,len,{jit:0.025,col:0.98}); }
  /* 계단 양옆 난간(비스듬한 돌덩이 줄) — 몸 막힘은 계단 옆 낮은 벽 */
  for(const s of [-1,1]) for(let i=0;i<NS;i+=2){ const zf=z0-i*run; blk(s*2.65,-0.3+i*rise,zf-0.4,0.9,0.95,1.1,{jit:0.04,col:0.9}); }
  /* 계단 밑 돌짐승 둘(머리 · 몸 · 다리 덩이) */
  for(const s of [-1,1]){ const x=s*3.6, z=z0+0.6;
    blk(x,-0.3,z,1.3,1.1,2.0,{jit:0.08}); blk(x,0.8,z+0.5,1.0,0.9,1.0,{jit:0.08,col:1.05}); blk(x,0.8,z+1.1,0.7,0.45,0.5,{jit:0.05,col:0.9,solid:false}); }
  /* 사당 — 7.2 m 네모 · 벽 두께 0.7 · 높이 3.0 · 앞에 문(1.8 × 2.4) · 계단식 지붕 */
  { const y=TOP+0.18, s=7.2, t=0.7, H=3.0;
    /* 벽은 다듬은 돌을 켜켜이 쌓았다(켜 0.6 m · 돌 1.1~1.6 m · 켜마다 이음매가 엇갈린다) — 한 장짜리 판은 레고처럼 보였다 */
    const dw=1.8, course=(x0,z0,x1,z1,door)=>{ const L=Math.hypot(x1-x0,z1-z0), ux=(x1-x0)/L, uz=(z1-z0)/L, ax=Math.abs(ux)>0.5;
      for(let c=0;c<5;c++){ let u=(c&1)?-0.55:0; const yc=y+c*0.6;
        while(u<L-0.05){ let w=1.1+r()*0.5; if(u+w>L-0.3) w=L-u; const mid=u+w/2-L/2;
          if(door&&c<4&&Math.abs(mid)<dw/2+w/2-0.05){ if(mid<0&&u+w>L/2-dw/2){ w=L/2-dw/2-u; } else if(mid>=0&&u<L/2+dw/2){ const nu=L/2+dw/2; w-=nu-u; u=nu; } if(w<0.2){ u+=Math.max(w,0)+0.01; continue; } }
          const cx=x0+ux*(u+Math.max(0,w)/2), cz=z0+uz*(u+Math.max(0,w)/2);
          if(w>0.15) blk(cx,yc,cz,ax?w-0.03:t,0.6,ax?t:w-0.03,{jit:0.03,col:0.95+0.1*r()});
          u+=w; } } };
    course(-s/2,-s/2+t/2,s/2,-s/2+t/2); course(-s/2+t/2,-s/2+t,-s/2+t/2,s/2-t); course(s/2-t/2,-s/2+t,s/2-t/2,s/2-t);
    course(-s/2,s/2-t/2,s/2,s/2-t/2,true); blk(0,y+2.4,s/2-t/2,dw+0.9,0.65,t+0.1,{jit:0.03,col:1.06});   // 앞벽(문) · 상인방
    blk(0,y+H,0,7.8,0.5,7.8,{jit:0.05}); blk(0,y+H+0.5,0,6.2,0.5,6.2,{jit:0.05}); blk(0,y+H+1.0,0,4.4,0.5,4.4,{jit:0.05}); blk(0,y+H+1.5,0,1.6,1.1,1.6,{jit:0.08,col:1.08});
    for(const sx of [-1,1]) for(const sz of [-1,1]) blk(sx*(s/2+0.25),y,sz*(s/2+0.25),0.7,H+0.2,0.7,{jit:0.04,col:1.04});   // 모서리 기둥
    blk(0,y,-1.9,2.0,0.9,1.2,{jit:0.03,col:1.1});                        // 제단
    wood.push([0,y+0.9,-1.9]); templePick(T,'tchest',0,y+0.9,-1.9,'chest',false); }
  /* 항아리 넷 — 계단 밑 양옆 · 꼭대기 앞 두 귀퉁이 */
  for(const [ux,uy,uz] of [[-5.0,-0.3,15.2],[5.4,-0.3,15.6],[-3.7,TOP+0.18,4.3],[3.6,TOP+0.18,4.2]]){ urns.push([ux,uy,uz]); templePick(T,'turn',ux,uy,uz,'urn'+urns.length,false); }
  /* 둘레 돌기둥 — 40 m 네모를 따라 4.4 m 마다. 서 있거나(머리 돌 · 4.6 m) · 부러졌거나 · 쓰러졌거나 · 없다 */
  for(let side=0;side<4;side++) for(let u=-19.8;u<=19.8;u+=4.4){ const off=(side>>1)?-1:1, ax=side&1, x=ax?off*19.8:u, z=ax?u:off*19.8;
    if(Math.abs(ax?z:x)<4&&side===0) continue;                            // 앞 계단 쪽은 트였다
    const q=r();
    if(q<0.40){ blk(x,-0.2,z,1.1,0.4,1.1,{jit:0.04}); blk(x,0.2,z,0.85,4.0,0.85,{jit:0.03}); blk(x,4.2,z,1.2,0.5,1.2,{jit:0.05,col:1.05}); }
    else if(q<0.72){ const h=0.8+r()*2.6; blk(x,-0.2,z,1.1,0.4,1.1,{jit:0.04}); blk(x,0.2,z,0.85,h,0.85,{jit:0.10}); }
    else if(q<0.90){ const a=r()*6.283, L=3.2+r()*1.2; blk(x+Math.cos(a)*1.8,-0.25,z+Math.sin(a)*1.8,0.85,0.85,L,{ya:a,tilt:0.05,jit:0.06}); blk(x,-0.2,z,1.1,0.55,1.1,{jit:0.08}); } }
  /* 흩어진 돌덩이 */
  for(let i=0;i<14;i++){ const a=r()*6.283, d=16+r()*5; blk(Math.cos(a)*d,-0.3,Math.sin(a)*d,0.8+r()*1.2,0.5+r()*0.6,0.8+r()*1.0,{ya:r()*3,jit:0.12,col:0.9}); }
  S.mesh(templeMat());
  templeProps(T,wood,urns,false);
}
/* 해저 신전 — 그리스식 · 앞이 +z */
function templeBuildSea(T){
  const S=templeBuilder(T,[1.0,0.98,0.92],0.45), r=S.rnd, blk=(x,y,z,w,h,d,o)=>S.block(x,y,z,w,h,d,o), wood=[], urns=[];
  /* 세 단 기단 — 22 × 30 m */
  for(let k=0;k<3;k++){ const w=22-1.2*k, d=30-1.2*k, y=-0.4+0.5*k;
    for(let z=-d/2+1;z<d/2;z+=2.0) for(let x=-w/2+1;x<w/2;x+=2.0){ const edge=Math.abs(x)>w/2-2.2||Math.abs(z)>d/2-2.2; if(!edge&&k<2) continue; if(r()<0.06) continue;
      blk(x,y,z,1.96,0.5,1.96,{jit:0.05,solid:false}); }
    templeBox(T,0,y,0,w,0.5,d,0); }
  const FL=-0.4+1.5;                                                      // 기단 윗면
  /* 둘레 기둥 — 짧은 변 6 · 긴 변 8 · 지름 1.5 m · 7.5 m. 반은 부러지고 몇은 쓰러져 북(돌 마디)이 굴렀다 */
  const colGeo=[]; const cols=[];
  for(let i=0;i<6;i++) for(const z of [-12.8,12.8]) cols.push([-8.5+i*3.4,z]);
  for(let i=1;i<7;i++) for(const x of [-8.5,8.5]) cols.push([x,-12.8+i*25.6/7]);
  for(const [x,z] of cols){ const q=r(), H=q<0.45?7.5:q<0.8?1.2+r()*4.5:0;
    blk(x,FL,z,1.8,0.35,1.8,{jit:0.04});                                  // 받침
    if(H>0){ colGeo.push([x,z,H]); templeBox(T,x,FL+0.35,z,1.3,H,1.3,0); if(H>=7.5) blk(x,FL+0.35+H,z,2.0,0.55,2.0,{jit:0.05,col:1.05}); }
    else{ const a=r()*6.283; for(let k=0;k<3;k++){ const dd=1.4+k*1.65; colGeo.push([x+Math.cos(a)*dd,z+Math.sin(a)*dd,1.5,a,FL+0.75]); } } }
  /* 처마 — 선 기둥 위에 남은 들보 몇 */
  for(let i=0;i<5;i++){ const x=-8.5+i*3.4; if(r()<0.55) blk(x+1.7,FL+8.4,12.8,3.6,0.9,1.4,{jit:0.06}); if(r()<0.4) blk(x+1.7,FL+8.4,-12.8,3.6,0.9,1.4,{jit:0.06}); }
  /* 안채 — 10 × 16 m · 벽 두께 0.8 · 높이 6 m(돌덩이 여섯 켜 · 위로 갈수록 빠졌다) · 앞에 문 2.2 m */
  { const w=10, d=16, t=0.8, H=1.0;
    const wall=(x0,z0,x1,z1,gap)=>{ const L=Math.hypot(x1-x0,z1-z0), n=Math.round(L/2), ux=(x1-x0)/L, uz=(z1-z0)/L;
      for(let c=0;c<6;c++){ const sh=(c&1)?0.5:0; for(let k=0;k<n;k++){ const s=(k+0.5+sh)*L/n; if(s>L) continue; if(gap&&Math.abs(s-L/2)<1.3) continue;
        if(r()<c*0.13) continue;                                          // 위 켜일수록 빠졌다
        const x=x0+ux*s, z=z0+uz*s; blk(x,FL+c*H,z,Math.abs(ux)>0.5?L/n-0.05:t,H,Math.abs(ux)>0.5?t:L/n-0.05,{jit:0.05}); } } };
    wall(-w/2,-d/2,w/2,-d/2); wall(-w/2,-d/2,-w/2,d/2); wall(w/2,-d/2,w/2,d/2); wall(-w/2,d/2,w/2,d/2,true);
    blk(0,FL,-5.0,2.4,1.1,1.4,{jit:0.03,col:1.1});                        // 제단
    wood.push([0,FL+1.1,-5.0]); templePick(T,'tchest',0,FL+1.1,-5.0,'chest',true); }
  /* 항아리 — 기단 둘레 · 안채 앞 */
  for(const [ux,uy,uz] of [[-3.2,FL,9.5],[3.6,FL,10.2],[-12.6,-0.4,4.0],[12.4,-0.4,-6.5],[1.8,FL,-6.6]]){ urns.push([ux,uy,uz]); templePick(T,'turn',ux,uy,uz,'urn'+urns.length,true); }
  /* 무너져 흩어진 돌덩이 — 낭떠러지 쪽(뒤)으로 더 */
  for(let i=0;i<22;i++){ const a=r()*6.283, d=12+r()*12; blk(Math.cos(a)*d,-0.5,Math.sin(a)*d-(r()<0.5?6:0),0.9+r()*1.4,0.5+r()*0.8,0.9+r()*1.2,{ya:r()*3,jit:0.14,col:0.92,tilt:(r()-0.5)*0.3}); }
  S.mesh(templeSeaMat());
  templeColumns(T,colGeo);
  templeProps(T,wood,urns,true);
}
/* 기둥 — 홈이 파인 원기둥(스무 모 · 홈은 정점 법선으로) · 쓰러진 북은 눕힌다 */
function templeColumns(T,list){
  if(!list.length) return;
  const cs=Math.cos(T.yaw), sn=Math.sin(T.yaw), parts=[], M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), Sc=new THREE.Vector3(1,1,1);
  const base=new THREE.CylinderGeometry(0.62,0.68,1,20,3,true); base.translate(0,0.5,0);
  { const p=base.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), z=p.getZ(i), a=Math.atan2(z,x), k=1-0.045*Math.pow(Math.abs(Math.cos(a*10)),0.6); p.setX(i,x*k); p.setZ(i,z*k); } base.computeVertexNormals(); }
  const rnd=mulberry32(hashStr('tcol|'+Math.round(T.x)));
  for(const c of list){ const [lx,lz,H,a,fy]=c, wx=T.x+lx*cs+lz*sn, wz=T.z-lx*sn+lz*cs;
    const g=base.clone();
    if(a===undefined){ E.set((rnd()-0.5)*0.03,rnd()*6.283,(rnd()-0.5)*0.03); V.set(wx,T.y+1.1+0.35,wz); Sc.set(1,H,1); }
    else{ E.set(Math.PI/2,0,T.yaw+a,'ZYX'); V.set(wx,T.y+fy-0.6,wz); Sc.set(1,1.5,1); }
    Q.setFromEuler(E); M4.compose(V,Q,Sc); g.applyMatrix4(M4);
    const n=g.attributes.position.count, cc=new Float32Array(n*3), k=0.85+0.25*rnd();
    for(let i=0;i<n;i++){ const y=g.attributes.position.getY(i)-T.y, al=clamp(1-(y-1)/5,0,1)*0.5;   // 밑동에 바닷말
      cc[i*3]=0.74*k*(1-al*0.5); cc[i*3+1]=0.72*k*(1-al*0.1); cc[i*3+2]=0.66*k*(1-al*0.55); }
    g.setAttribute('color',new THREE.BufferAttribute(cc,3)); g.setAttribute('aMelt',new THREE.BufferAttribute(new Float32Array(n),1)); g.deleteAttribute('uv'); parts.push(g); }
  /* 하나로 합친다(색인을 풀어 이어 붙인다) */
  let tot=0; const flat=parts.map(q=>{ const f=q.index?q.toNonIndexed():q; tot+=f.attributes.position.count; return f; });
  const Pp=new Float32Array(tot*3), Np=new Float32Array(tot*3), Cp=new Float32Array(tot*3), Mp=new Float32Array(tot); let o=0;
  for(const f of flat){ const n=f.attributes.position.count; Pp.set(f.attributes.position.array,o*3); Np.set(f.attributes.normal.array,o*3); Cp.set(f.attributes.color.array,o*3); o+=n; }
  for(const q of parts) q.dispose(); for(const f of flat) f.dispose();
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(Pp,3)); geo.setAttribute('normal',new THREE.BufferAttribute(Np,3));
  geo.setAttribute('color',new THREE.BufferAttribute(Cp,3)); geo.setAttribute('aMelt',new THREE.BufferAttribute(Mp,1)); geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,templeSeaMat()); m.castShadow=m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); TEMPLE.meshes.push(m);
  /* 빛이끼 — 기둥마다 푸른 점 몇(안개에 안 묻힌다 · 어둠 속 길잡이) */
  const pts=[]; for(const c of list){ if(c[3]!==undefined) continue; const [lx,lz,H]=c, wx=T.x+lx*cs+lz*sn, wz=T.z-lx*sn+lz*cs;
    for(let k=0;k<5;k++){ const a=rnd()*6.283, y=T.y+1.5+rnd()*Math.min(H,6); pts.push(wx+Math.cos(a)*0.66,y,wz+Math.sin(a)*0.66); } }
  if(pts.length){ const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    const cv=document.createElement('canvas'); cv.width=cv.height=32; { const g=cv.getContext('2d'), gr=g.createRadialGradient(16,16,0,16,16,16);
      gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.35,'rgba(255,255,255,0.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,32,32); }
    const pm=new THREE.PointsMaterial({color:0x6fe8ff,size:0.45,map:new THREE.CanvasTexture(cv),transparent:true,opacity:0.95,depthWrite:false,fog:false,blending:THREE.AdditiveBlending});
    const p=new THREE.Points(pg,pm); p.userData.lightRole='none'; scene.add(p); TEMPLE.meshes.push(p); TEMPLE.glow=p; }
}
/* 상자 · 항아리 꼴 */
function templeProps(T,chests,urns,sea){
  const cs=Math.cos(T.yaw), sn=Math.sin(T.yaw), W=(lx,lz)=>[T.x+lx*cs+lz*sn, T.z-lx*sn+lz*cs];
  const wood=templeWood(), band=new THREE.MeshLambertMaterial({color:sea?0x4f7a6a:0x8a6a2e}), clay=new THREE.MeshLambertMaterial({color:sea?0x8a6c58:0xa0643a});
  for(const [lx,ly,lz] of chests){ const [x,z]=W(lx,lz), g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.55,0.62),wood); b.position.y=0.28; g.add(b);
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.31,0.31,1.0,10,1,false,0,Math.PI),wood); lid.rotation.z=Math.PI/2; lid.rotation.y=Math.PI/2; lid.position.y=0.55; g.add(lid);
    for(const s of [-0.32,0.32]){ const bd=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.6,0.66),band); bd.position.set(s,0.3,0); g.add(bd); }
    g.position.set(x,T.y+ly,z); g.rotation.y=T.yaw; scene.add(g); TEMPLE.meshes.push(g); }
  const urnG=new THREE.LatheGeometry([[0,0],[0.16,0.02],[0.26,0.18],[0.30,0.38],[0.22,0.62],[0.10,0.74],[0.12,0.84],[0.0,0.84]].map(v=>new THREE.Vector2(v[0],v[1])),14);
  for(const [lx,ly,lz] of urns){ const [x,z]=W(lx,lz), m=new THREE.Mesh(urnG,clay); m.position.set(x,T.y+ly,z); m.rotation.set(sea?0.25:0,lx*3.1,sea?0.2:0); scene.add(m); TEMPLE.meshes.push(m); }
}

/* ── 상자 · 항아리 속 ──────────────────────────────────────────────────────── */
const TEMPLE_LOOT={
  /* 뭍 — 쇠붙이 연장과 총 한 자루(먼 길을 오게 하는 값) */
  lchest:[['axe_steel',1],['pick_steel',1],['sword_steel',1],['rifle_bolt',1],['cartridge',18],['bandage_clean',3],['lamp_electric',1],['battery_li',1]],
  lurn:[[['rope',2],['can_food',2]],[['gunpowder',4],['cord',6]],[['ingot_steel',2],['glass',3]],[['fins',1],['goggles',1],['snorkel',1]],[['jar',3],['bandage_clean',2]]],
  /* 해저 — 백금 반지(섬에서 여기뿐) · 깊은 데는 더 많이 준다 */
  schest:[['ring_platinum',3],['ingot_bronze',4],['battery_li',1],['primer',6]],
  surn:[[['ingot_tin',4],['mercury',2]],[['ingot_copper',5],['ingot_zinc',3]],[['ring_platinum',1],['glass',4]],[['ingot_lead',4],['salt',4]],[['spodumene',4],['graphite',2]]]
};
function templeLoot(p){
  const sea=p.deep, out=[];
  if(p.kind==='tchest') for(const [id,n] of TEMPLE_LOOT[sea?'schest':'lchest']) out.push([id,n]);
  else{ const L=TEMPLE_LOOT[sea?'surn':'lurn'], i=(hashStr(p.key+'|'+P.seed)>>>0)%L.length; for(const e of L[i]) out.push(e); }
  let msg=''; for(const [id,n] of out){ if(!ITEMS[id]) continue; let g=0; for(let k=0;k<n;k++) if(invAdd(id,1)) g++; if(g) msg+=(msg?' · ':'')+ITEMS[id].n+' +'+g; }
  return msg||'가방이 가득 차 아무것도 못 꺼냈다';
}

/* ── 들판의 바위를 솎는다(지형 판 8 · 사용자 지적: 열린 들판에 광석·바위가 너무 많다 — 이상하다) ──────────────────────
   섬을 6배로 키우면서 자원 상한도 넓이만큼(36배) 늘어, 풀밭·숲 바닥 곳곳에 화강암·현무암·석회암·사암 노두와 돌멩이가 흩어졌다.
   바위는 **험한 데**(가파른 비탈 · 높은 데 · 바위밭 · 너덜)에 남기고, 판판하고 낮은 들판에서는 대부분 걷는다. 돌멩이·부싯돌은 물가·바위밭에.
   거의 곧은 벼랑(56° 넘게)에 붙어 떠 보이던 바위는 다 뺀다. 솎는 데는 난수를 안 쓴다(자리의 해시) — 같은 시드면 같은 섬이다 */
function thinOpenRocks(){
  const HI=TEMPLE.hi||60, RS=stats.rockSlope||0.7, MIN={granite:90,pebble:400,flint:80,basalt:20,karst:30,sandstone:20};
  const BIG={granite:1,basalt:1,karst:1,sandstone:1};
  const score=p=>{
    const gx=clamp(Math.round(p.x/CELL+N/2),0,N-1), gz=clamp(Math.round(p.z/CELL+N/2),0,N-1), i=IDX(gx,gz), b=F.biome[i], sl=F.slope[i], h=F.elev[i];
    if(BIG[p.k]&&sl>1.5) return -1;                                          // 거의 곧은 벽 — 떠 보인다
    const rug=clamp((sl-RS*0.35)/(RS*0.9),0,1), high=clamp((h/HI-0.35)/0.4,0,1), rocky=(b===B.ROCK||b===B.SCREE)?1:0;
    if(BIG[p.k]) return Math.max(rug*rug*0.9,high*high*0.6,rocky*0.75,b===B.FUMAROLE?0.8:0);
    const wet=(F.river[i]||F.dRiver[i]<10)?0.85:b===B.BEACH?0.55:0;
    return Math.max(rug*rug*0.8,wet,rocky*0.7);
  };
  const keep=new Set(), byK={};
  for(const p of PROPS){ if(p.cave||!(BIG[p.k]||p.k==='pebble'||p.k==='flint')) continue;
    const s=score(p); (byK[p.k]||(byK[p.k]=[])).push([s,p]);
    /* 남기는 몫 — 판판한 들판 5%(돌멩이 8%) · 가장 험한 데라도 절반(부싯돌은 연장의 시작이라 넉넉히) */
    const base=BIG[p.k]?0.05:p.k==='flint'?0.30:0.08, top=BIG[p.k]?0.50:p.k==='flint'?0.80:0.45, u=(hashStr('thin|'+p.k+'|'+Math.round(p.x*10)+'|'+Math.round(p.z*10))>>>0)/4294967296;
    if(s>=0&&u<base+(top-base)*s) keep.add(p); }
  for(const k in byK){ let n=0; for(const [,p] of byK[k]) if(keep.has(p)) n++;          // 모자라면 험한 차례로 더 남긴다
    if(n<(MIN[k]||0)){ byK[k].sort((a,b)=>b[0]-a[0]); for(const [s,p] of byK[k]){ if(n>=MIN[k]) break; if(s>=0&&!keep.has(p)){ keep.add(p); n++; } } } }
  PROPS=PROPS.filter(p=>p.cave||!(BIG[p.k]||p.k==='pebble'||p.k==='flint')||keep.has(p));
}

/* ── 험하고 닿기 어려운 데일수록 더 나온다(지형 판 8 · 사용자 요청) ─────────────────────
   높은 산(섬 꼭대기의 45% 위) · 가파른 데 · 굴과 땅속 · 깊은 물 밑 — 캐고 따는 몫에 곱한다(1 ~ 2.5배) */
function yieldK(x,z,y){
  if((P.tv|0)<8) return 1;
  const HI=TEMPLE.hi||60, g=heightAt(x,z), sm=sampleAt(x,z);
  let k=1;
  if(y!==undefined&&y<g-3) k+=0.8;                                         // 땅속
  if(typeof caveAt==='function'&&caveAt(x,z,-0.5)) k+=0.5;                 // 굴
  if(g>0) k+=clamp((g/HI-0.45)/0.45,0,1)*0.8+clamp((sm.slope-0.6)/0.8,0,1)*0.4;
  else k+=clamp((-g-6)/30,0,1)*0.9;                                        // 깊은 물 밑
  return Math.min(2.5,k);
}
/* 몫에 곱한다 — 소수부는 그 확률로 하나 더 */
const yieldMul=(n,k)=>{ const v=n*k, w=Math.floor(v); return w+(Math.random()<v-w?1:0); };
/* 물속에서 겨눈 해저 신전의 상자 · 항아리(95-flora.js floraFindLook 이 헤엄칠 때 부른다) — 조준선이 그 둘레를 지나야 한다 */
function templeLookSwim(){
  if(!TEMPLE.sea) return;
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z; if(Math.hypot(ex-TEMPLE.sea.x,ez-TEMPLE.sea.z)>60) return;
  const cp=Math.cos(PL.pitch), fx=-Math.sin(PL.yaw)*cp, fy=Math.sin(PL.pitch), fz=-Math.cos(PL.yaw)*cp;
  let bd=1e9;
  for(const p of TEMPLE.picks){ if(!p.swim) continue;
    const dx=p.x-ex, dy=p.ay-ey, dz=p.z-ez, d=Math.sqrt(dx*dx+dy*dy+dz*dz); if(d>3.0||d<0.05) continue;
    const t=dx*fx+dy*fy+dz*fz; if(t<0.1) continue;
    const qx=dx-fx*t, qy=dy-fy*t, qz=dz-fz*t, rr=p.r*1.3; if(qx*qx+qy*qy+qz*qz>rr*rr) continue;
    if(t<bd){ bd=t; FLORA.look=p; } }
}
