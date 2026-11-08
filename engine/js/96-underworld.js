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
   · **드나드는 길 — 함몰 입구**(2026-11-05 · underDolines): 산 사면이 꺼진 우묵땅의 벼랑 밑에서 굴길로 걸어 내려간다(예전 수직굴은 없앴다 — 아래 밧줄 코드는 남겨 둔다).
     구멍 위에서 Space — 밧줄을 타고 내려간다(30~60 m). 밑에서 밧줄 곁에 서서 Space — 올라간다(기력이 든다 · 다하면 미끄러진다).
     밑에서 올려다보면 굴 구멍으로 하늘빛이 보인다.
   · **어둡다** — 땅속에 들면 해·하늘빛이 꺼지고 짙은 어둠 안개가 낀다. 방마다 빛나는 버섯·결정·반딧불이 유충이 희미하게 밝힌다.
     횃불·전등을 들고 다녀야 한다.
   · **생물** — 박쥐 떼(천장을 돌다 사람이 다가오면 흩어진다 · 밑에 구아노 더미 → 초석) · 동굴어(못 속의 하얀 눈먼 물고기 — 맨손으로 건진다)
     · 동굴영원(못가를 기는 하얀 도롱뇽 — 구경만) · 꼽등이(바닥을 뛰어다닌다 — 잡아 구워 먹는다) · 동굴거미와 거미줄(→ 거미 실)
     · **큰 동굴지네**(어둠 속에서 다가와 문다 · 독 — 켠 횃불·전등을 들고 있으면 가까이 오지 않는다)
   · 자리는 시드가 정한다(저장에 안 넣는다). 지형 판 7 밑(옛 저장)에는 없다. 땅속에서는 집을 지을 수 없다.
   ========================================================================== */
const UNDER={ok:false, ch:[], tu:[], pits:[], ad:[], dol:[], G:160, grid:new Map(), B:null, tiles:new Map(), T:48, S:2, R:190, mat:null,
  u:0, cx:1e9, cz:1e9, deco:new Map(), picks:[], grp:null, rope:null, sp0:false, hint:false, bats:null, fish:null, crick:null, cent:null, t:0};
const UGK=(gx,gz)=>(gx+2048)*4096+(gz+2048);
function underClear(){
  for(const t of UNDER.tiles.values()) underTileDrop(t); UNDER.tiles.clear();
  for(const d of UNDER.deco.values()) underDecoDrop(d); UNDER.deco.clear();
  if(UNDER.grp){ scene.remove(UNDER.grp); UNDER.grp.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); UNDER.grp=null; }
  UNDER.ok=false; UNDER.ch.length=0; UNDER.tu.length=0; UNDER.pits.length=0; UNDER.ad.length=0; UNDER.dol.length=0; UNDER.grid.clear(); UNDER.B=null; UNDER.picks.length=0;
  UNDER.rope=null; UNDER.u=0; UNDER.cx=UNDER.cz=1e9; UNDER.map=null; if(typeof PL!=='undefined') PL.under=false; if(TERR_U.uUdN) TERR_U.uUdN.value=0;
}
/* ── 자리 정하기(섬을 지을 때 · placeResources 다음) ──────────────────────────── */
/* 기준 높이의 자바스크립트 판 — C 판(engine/native/light.c cw_under_base)이 못 켜졌을 때. 두 판은 같은 값을 낸다 */
function underBaseJS(E,r0,rb){
  const A=new Float32Array(N*N), M=new Float32Array(N*N);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ let m=1e9; for(let k=-r0;k<=r0;k++){ const xx=clamp(x+k,0,N-1); const v=E[z*N+xx]; if(v<m) m=v; } A[z*N+x]=m; }
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ let m=1e9; for(let k=-r0;k<=r0;k++){ const zz=clamp(z+k,0,N-1); const v=A[zz*N+x]; if(v<m) m=v; } M[z*N+x]=m; }
  const T1=new Float32Array(N*N), T2=new Float32Array(N*N);
  const blur=(src,dst,dx)=>{ for(let z=0;z<N;z++){ let s=0, n=0; const row=i=>dx?z*N+i:i*N+z;
      for(let i=-rb;i<=rb;i++){ const q=clamp(i,0,N-1); s+=src[row(q)]; n++; }
      for(let i=0;i<N;i++){ dst[row(i)]=s/n; const a=clamp(i-rb,0,N-1), b=clamp(i+rb+1,0,N-1); s+=src[row(b)]-src[row(a)]; } } };
  blur(M,T1,true); blur(T1,T2,false); blur(T2,T1,true); blur(T1,T2,false);
  const Bm=new Float32Array(N*N); for(let i=0;i<N*N;i++) Bm[i]=Math.min(T2[i],M[i]-24)-16;
  UNDER.B=Bm; UNDER.M=M;
}
function underSites(seed){
  underClear(); if((P.tv|0)<7) return;
  const rnd=mulberry32((seed^0x0bd3e7)>>>0), E=F.elev;
  /* ① 기준 높이 — 둘레 50 m 의 가장 낮은 땅(최소 거르기) → 넓게 흐린 것과 '가장 낮은 땅 − 24 m' 가운데 낮은 쪽 − 16 m.
       그래서 천장(Y0 + 0.7g · g ≤ 28)도 늘 땅 밑 20 m 아래다 */
  const r0=Math.max(1,Math.ceil(50/CELL)), rb=Math.max(1,Math.ceil(120/CELL));
  if(typeof nativeOn==='function'&&nativeOn()&&NATIVE.x.cw_under_base){         // C 판(engine/native/light.c — 같은 식)
    const X=NATIVE.x; new Float32Array(X.memory.buffer,X.cw_elev(),N*N).set(E); X.cw_under_base(N,r0,rb);
    UNDER.M=new Float32Array(X.memory.buffer,X.cw_under_m(),N*N).slice(); UNDER.B=new Float32Array(X.memory.buffer,X.cw_under_b(),N*N).slice();
  }else underBaseJS(E,r0,rb);
  const M=UNDER.M;
  const landAt=(x,z)=>{ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); return gx>2&&gz>2&&gx<N-3&&gz<N-3&&M[gz*N+gx]>5; };
  /* ② 굴 방 — 300 m 칸마다 하나(뭍 밑에만) */
  const S=300, n=Math.floor(HALF/S);
  for(let gz=-n;gz<n;gz++) for(let gx=-n;gx<n;gx++){
    const x=(gx+0.2+0.6*rnd())*S, z=(gz+0.2+0.6*rnd())*S, R=26+rnd()*44, H=12+rnd()*16, sd=(rnd()*1e9)|0;
    const f={pool:rnd()<0.45, bats:rnd()<0.45, crys:rnd()<0.35, shroom:rnd()<0.6, web:rnd()<0.5, cent:rnd()<0.30};
    if(!landAt(x,z)||!landAt(x+R*0.7,z)||!landAt(x-R*0.7,z)||!landAt(x,z+R*0.7)||!landAt(x,z-R*0.7)) continue;
    UNDER.ch.push({x,z,R,H,sd,p:[rnd()*6.283,rnd()*6.283,rnd()*6.283],...f});
  }
  /* ③ 수직굴은 없앴다(2026-11-05 사용자 요청 '구멍으로 들어가는 게 아니라 산 사면을 함몰시켜 그 아래로 동굴계') — 드나드는 길은 ⑥ 함몰 입구 */
  /* ④ 굴길 — 방마다 가까운 둘(700 m 안)에. 길은 여섯 토막으로 굽힌다 · 이은 방 짝은 UNDER.adj(지형 판 11 — 입구에서 닿는 방을 센다) */
  const C=UNDER.ch, seen=new Set(); UNDER.adj=[];
  for(let i=0;i<C.length;i++){ const near=[];
    for(let j=0;j<C.length;j++) if(j!==i){ const d=Math.hypot(C[i].x-C[j].x,C[i].z-C[j].z); if(d<1100) near.push([d,j]); }
    near.sort((a,b)=>a[0]-b[0]);
    for(const [d,j] of near.slice(0,C[i].pit?1:2)){ if(d>(C[i].pit||C[j].pit?1100:700)) continue; const k=i<j?i*65536+j:j*65536+i; if(seen.has(k)) continue; seen.add(k);
      UNDER.adj.push([i,j]);
      const a=C[i], b=C[j], dx=(b.x-a.x)/d, dz=(b.z-a.z)/d, w=4.5+rnd()*3, h=6+rnd()*3, amp=Math.min(60,d*0.12)*(rnd()<0.5?-1:1), ph=rnd()*6.283, pts=[];
      for(let s=0;s<=6;s++){ const t=s/6, o=amp*Math.sin(Math.PI*t)*Math.sin(t*3+ph)*(s&&s<6?1:0); pts.push([a.x+dx*d*t-dz*o,a.z+dz*d*t+dx*o]); }
      const wet=rnd()<0.35;                                                  // 지하수 — 굴길 셋에 하나꼴은 바닥 가운데로 물이 흐른다
      for(let s=0;s<6;s++) UNDER.tu.push({x0:pts[s][0],z0:pts[s][1],x1:pts[s+1][0],z1:pts[s+1][1],w,h,ph:ph+s,wet}); } }
  /* ⑥ 함몰 입구 — 산 사면이 꺼진 우묵땅과 그 밑으로 내려가는 굴길(underDolines) */
  underDolines(mulberry32((seed^0x7c0de5)>>>0));
  if(typeof PLAT!=='undefined'&&PLAT.on){ underSeaCaves(mulberry32((seed^0x5eacae)>>>0)); underPortals(); }   // 지형 판 11 — 바닷가 벼랑 밑의 굴(아래)
  /* ⑤ 칸에 건다(160 m) */
  const put=(o,x0,z0,x1,z1)=>{ for(let gz=Math.floor(z0/UNDER.G);gz<=Math.floor(z1/UNDER.G);gz++) for(let gx=Math.floor(x0/UNDER.G);gx<=Math.floor(x1/UNDER.G);gx++){
      const k=UGK(gx,gz); let a=UNDER.grid.get(k); if(!a) UNDER.grid.set(k,a=[]); a.push(o); } };
  for(const c of C){ const r=c.R*1.3; put(c,c.x-r,c.z-r,c.x+r,c.z+r);
    if(c.pool){ c.pr=c.R*0.32; const q=underQ(c.x,c.z,true); c.wl=q.f0+0.7; } }
  for(const t of UNDER.tu){ const r=t.w*1.3; t.L=Math.hypot(t.x1-t.x0,t.z1-t.z0)||1; put(t,Math.min(t.x0,t.x1)-r,Math.min(t.z0,t.z1)-r,Math.max(t.x0,t.x1)+r,Math.max(t.z0,t.z1)+r); }
  for(const t of UNDER.ad){ const r=t.w*1.4; put(t,Math.min(t.x0,t.x1)-r,Math.min(t.z0,t.z1)-r,Math.max(t.x0,t.x1)+r,Math.max(t.z0,t.z1)+r); }
  for(const p of UNDER.pits){ const q=underQ(p.x,p.z,true); p.yf=q.f; p.yc=q.c; }
  /* 석주 — 방마다 바닥에서 천장까지(사용자가 준 종유석 · 석순 모형 · 2026-11-05) · 자리는 시드 · 그 자리는 바위로 친다(underQ — 뚫고 못 지나간다) */
  /* 지형 판 11 — 석주는 무리 지어(사용자 요청 2026-11-06 '종유석 · 석순은 모여야') — 방마다 무리 한둘, 무리 둘레 0.28R 안에 */
  const BUNCH=typeof PLAT!=='undefined'&&PLAT.on;
  for(const c of C){ const rr=mulberry32((c.sd^0x2c01)>>>0), n=Math.round(c.R*0.30), cols=[];
    const cl=[]; if(BUNCH){ for(let k=0,m=1+(rr()<0.5?1:0);k<m;k++){ const a=rr()*6.283, d=c.R*Math.sqrt(rr())*0.5; cl.push([c.x+Math.cos(a)*d,c.z+Math.sin(a)*d]); } }
    for(let k=0;k<n;k++){ let a=rr()*6.283, d=c.R*Math.sqrt(rr())*0.72, x=c.x+Math.cos(a)*d, z=c.z+Math.sin(a)*d;
      if(cl.length){ const o=cl[k%cl.length], rd=c.R*0.28*Math.sqrt(rr()); x=o[0]+Math.cos(a)*rd; z=o[1]+Math.sin(a)*rd; }
      const q=underQ(x,z,true), gap=q.c-q.f;
      if(gap<4||q.w>-1e8||(c.pr&&Math.hypot(x-c.x,z-c.z)<c.pr+3)) continue;
      const sxz=Math.min(9,Math.max(2.5,gap*0.42)); cols.push({x,z,f:q.f,gap,s:sxz,r:sxz*0.40,yaw:rr()*6.283}); }   // 몸 반지름 — 모형 폭(가로 ±0.47 · 세로 ±0.30)의 가운데쯤(예전 0.33 이라 모형 가장자리를 지나갔다)
    c.cols=cols; }
  /* 방 둘레의 벽 바위(벼랑 면 모형 — underDeco 가 그린다)를 **섬을 지을 때** 정한다(2026-11-08 사용자 사진 — 굴의 큰 바위를 몸이 지나가고 · 광석이 바위 속에 박혀 보였다).
     예전엔 꾸밈을 지을 때 0.95 R 에 세워 큰 것(6~22 m)이 방 안으로 수 m 씩 들어왔는데 몸이 없었다. 이제 안쪽 면이 방 끝(R)에서 2 m 안으로만 들어오게 바깥으로 물리고,
     몸(원 — underWallAt)을 준다 · 광석 · 석순 · 꾸밈은 그 속에 안 놓는다. 난수는 방마다 제 것(c.sd^0x3a11 — 다른 차례를 안 건드린다) */
  for(const c of C){ const wr=mulberry32((c.sd^0x3a11)>>>0), walls=[], P0=c.R*6.283;
    for(let s=0;s<P0;s+=4.5+wr()*2.5){ const a=s/c.R, Rn=c.R*(1+0.14*Math.sin(3*a+c.p[0])+0.09*Math.sin(5*a+c.p[1])+0.05*Math.sin(9*a+c.p[2]));
      const q=underQ(c.x+Math.cos(a)*Rn*0.85,c.z+Math.sin(a)*Rn*0.85,true); if(q.g<2) continue;
      const S=Math.max(2.5,(q.c-q.f)*(0.55+0.3*wr())), hw=0.86*S, rc=Rn+hw*0.92-2.0, x=c.x+Math.cos(a)*rc, z=c.z+Math.sin(a)*rc;
      walls.push({x,z,S,y0:q.f-S*0.15,r:hw*0.88,yaw:Math.atan2(c.x-x,c.z-z)+(wr()-0.5)*0.5,tx:(wr()-0.5)*0.15,tz:(wr()-0.5)*0.15}); }
    c.walls=walls; }
  /* 구멍 둘레 5 m 는 치운다(사용자 요청 2026-11-05) — 자원은 자리로 찾으므로(92-save.js findSavedProp) 빼도 저장이 어긋나지 않는다 */
  if(UNDER.pits.length) PROPS=PROPS.filter(q=>!UNDER.pits.some(p=>(q.x-p.x)*(q.x-p.x)+(q.z-p.z)*(q.z-p.z)<25));
  if(UNDER.dol.length) PROPS=PROPS.filter(q=>!UNDER.dol.some(d=>Math.hypot(q.x-d.x,q.z-d.z)<d.R*1.25));   // 우묵땅 안의 자원은 치운다
  UNDER.ok=C.length>0;
}
/* ── 함몰 입구(2026-11-05 사용자 요청 '산 사면을 함몰시켜 그 아래로 동굴계 · 지하수 · 종유석 · 석주') ─────────────────
   산의 사면(큰 지형 모형 둘레의 드러난 땅 — 모형이 없으면 높은 땅의 비탈)이 밑의 빈 굴로 꺼져 내린 우묵땅(붕괴 돌리네):
   오르막 쪽은 가파른 벼랑(드러난 바위 — 벼랑 모형을 박는다) · 내리막 쪽은 무너진 돌 비탈(자갈밭 바이옴). 벼랑 밑에 굴 입구가 있고
   거기서 굴길이 비탈 속으로 0.30 의 내리막으로 내려가 땅속 방(지하수 못)에 닿는다 · 그 방은 가까운 굴 방과 굴길로 잇는다.
   자리는 시드(제 난수 — 앞의 방 · 굴길 차례를 안 건드린다) */
/* 지형 판 11 — 새 입구 굴길이 이미 있는 방 · 굴길에 닿는가(m m 여유). 닿으면 바닥 높이가 달라 굴길 한가운데 구덩이가 패었다 */
function underOverlap(x,z,m,skip){
  for(const c of UNDER.ch){ if(c===skip) continue; if(Math.hypot(x-c.x,z-c.z)<c.R*1.3+m) return true; }
  for(const t of UNDER.tu){ const vx=t.x1-t.x0, vz=t.z1-t.z0, L2=vx*vx+vz*vz||1, u=clamp(((x-t.x0)*vx+(z-t.z0)*vz)/L2,0,1), dx=t.x0+vx*u-x, dz=t.z0+vz*u-z; if(dx*dx+dz*dz<(t.w*1.3+m)*(t.w*1.3+m)) return true; }
  return false;
}
function underDolines(rnd){
  const h=F.elev, cand=[]; let hi=1; for(let i=0;i<N*N;i++) if(h[i]>hi) hi=h[i];
  const peaks=(typeof GEO_LF!=='undefined'&&GEO_LF.list)?GEO_LF.list.filter(L=>L.stamped&&/peak/.test(L.name)&&L.S>200):[];
  const gi=(x,z)=>clamp(Math.round(z/CELL+N/2),1,N-2)*N+clamp(Math.round(x/CELL+N/2),1,N-2), elev=(x,z)=>h[gi(x,z)];
  const masked=i=>!!(GEO_LF.mask&&GEO_LF.mask[i]);
  for(let gz=8;gz<N-8;gz+=2) for(let gx=8;gx<N-8;gx+=2){ const i=gz*N+gx, e=h[i]; if(e<18||F.river[i]||F.slope[i]<0.18||F.slope[i]>0.95||masked(i)) continue;
    const x=(gx-N/2)*CELL, z=(gz-N/2)*CELL; let near=false;
    if(peaks.length){ for(const L of peaks){ const W=GEO_MESH_DATA[L.name].w, r=Math.max(W[0],W[2])*L.S*0.5, d=Math.hypot(x-L.x,z-L.z); if(d>r*0.55&&d<r*1.3){ near=true; break; } } }
    else near=e>hi*0.35;
    if(!near||(LANDING&&Math.hypot(LANDING.x-x,LANDING.z-z)<300)) continue;
    cand.push([gx,gz]); }
  for(let i=cand.length-1;i>0;i--){ const j=(rnd()*(i+1))|0, t=cand[i]; cand[i]=cand[j]; cand[j]=t; }
  for(const [gx,gz] of cand){ if(UNDER.dol.length>=4) break;
    const x=(gx-N/2)*CELL, z=(gz-N/2)*CELL; if(UNDER.dol.some(d=>Math.hypot(d.x-x,d.z-z)<700)) continue;
    const e=CELL*2, hx=elev(x+e,z)-elev(x-e,z), hz=elev(x,z+e)-elev(x,z-e), hl=Math.hypot(hx,hz); if(hl<1e-3) continue;
    const ux=hx/hl, uz=hz/hl, vx=-uz, vz=ux;                                      // 오르막 · 옆
    const Rb=42+rnd()*18, D=11+rnd()*6;
    let ok=true; for(let a=0;a<12&&ok;a++){ const xx=x+Math.cos(a*0.524)*Rb*1.4, zz=z+Math.sin(a*0.524)*Rb*1.4, k=gi(xx,zz); if(masked(k)||F.river[k]||h[k]<4) ok=false; }
    if(!ok) continue;
    /* 굴길 — 입구(벼랑 밑)에서 오르막 쪽으로 · 바닥은 0.30 내리막 · 끝은 새 방 한가운데 */
    const Eb=elev(x,z)-D;                                                        // 우묵땅 바닥(평평)
    const mx=x+ux*Rb*0.26, mz=z+uz*Rb*0.26, Fm=Eb;                                 // 입구 — 벼랑 밑, 바닥 높이
    const w=3.4+rnd()*0.9, ah=5.0+rnd()*1.5, Hr=13+rnd()*5, bend=(rnd()-0.5)*0.5;
    const at=(L,t)=>{ const a=bend*Math.sin(Math.PI*t)*L*0.25; return [mx+ux*L*t+vx*a, mz+uz*L*t+vz*a]; };
    let L=0, Fe=0;
    for(let l=50;l<=330;l+=6){ const [ex,ez]=at(l,1); Fe=uBase(ex,ez)-0.3*(PLAT.on?Math.min(Hr,6):Hr); if(Fm-0.30*l<=Fe){ L=l; break; } }
    if(!L){ L=330; const [ex,ez]=at(L,1); Fe=uBase(ex,ez)-0.3*(PLAT.on?Math.min(Hr,6):Hr); if((Fm-Fe)/L>0.45) continue; }
    if(PLAT.on){ let hit=false; for(let l=0;l<=L&&!hit;l+=6){ const [qx,qz]=at(L,l/L); if(underOverlap(qx,qz,w+3+(l>L-30?Hr*1.4:0))) hit=true; } if(hit) continue; }   // 굴길 · 끝 방이 다른 굴에 닿지 않게
    /* 우묵땅을 판다 — 오르막 쪽은 짧게(가파른 벼랑) · 내리막 쪽은 길게(너덜 비탈) · 그 안은 자갈밭 */
    const r=Rb*1.4;
    for(let zz=Math.floor((z-r)/CELL+N/2);zz<=Math.ceil((z+r)/CELL+N/2);zz++) for(let xx=Math.floor((x-r)/CELL+N/2);xx<=Math.ceil((x+r)/CELL+N/2);xx++){
      if(xx<1||zz<1||xx>N-2||zz>N-2) continue; const wx=(xx-N/2)*CELL-x, wz=(zz-N/2)*CELL-z, s2=wx*ux+wz*uz, l2=wx*vx+wz*vz;
      const u=Math.hypot(l2/Rb,s2>0?s2/(Rb*0.62):s2/(Rb*1.15)); if(u>=1) continue;
      /* 바닥은 평평(Eb) · 가장자리로 갈수록 본디 땅으로 — 오르막 쪽은 짧게 올라 벼랑이 되고 내리막 쪽은 골짜기로 열린다(본디 땅이 바닥보다 낮으면 그대로) */
      const k=zz*N+xx, w2=Math.pow(Math.max(0,(u-0.42)/0.58),1.6), ne=Eb+(h[k]-Eb)*w2+(s2>0?0:Math.max(0,-s2-Rb*0.3)*0.0);
      if(ne<h[k]){ h[k]=ne; if(u<0.95){ F.biome[k]=B.SCREE; F.river[k]=0; F.wlev[k]=0; } } }
    const segs=[], NS=4;
    for(let k=0;k<NS;k++){ const [x0,z0]=at(L,k/NS), [x1,z1]=at(L,(k+1)/NS), f0=Fm+(Fe-Fm)*k/NS, f1=Fm+(Fe-Fm)*(k+1)/NS;
      const sg={ad:1,x0,z0,x1,z1,f0,f1,w,h:ah,ph:rnd()*6.283,L:Math.hypot(x1-x0,z1-z0)||1,s0:L*k/NS}; segs.push(sg); UNDER.ad.push(sg); }
    const [ex,ez]=at(L,1), room={x:ex,z:ez,R:16+rnd()*8,H:Hr,sd:(rnd()*1e9)|0,p:[rnd()*6.283,rnd()*6.283,rnd()*6.283],pool:true,bats:rnd()<0.4,crys:rnd()<0.35,shroom:true,web:rnd()<0.4,cent:false,adit:segs,aL:L};
    UNDER.ch.push(room);
    /* 그 방을 가까운 굴 방과 잇는다 */
    let bj=null, bd=1e9; for(const c of UNDER.ch){ if(c===room) continue; const d=Math.hypot(c.x-ex,c.z-ez); if(d<bd){ bd=d; bj=c; } }
    if(bj&&bd<1000) UNDER.adj.push([UNDER.ch.indexOf(room),UNDER.ch.indexOf(bj)]);
    if(bj&&bd<1000){ const d=bd, dx=(bj.x-ex)/d, dz=(bj.z-ez)/d, tw=4.5+rnd()*3, th=6+rnd()*3, amp=Math.min(60,d*0.12)*(rnd()<0.5?-1:1), ph=rnd()*6.283, pts=[], wet=rnd()<0.5;
      for(let s=0;s<=6;s++){ const t=s/6, o=amp*Math.sin(Math.PI*t)*Math.sin(t*3+ph)*(s&&s<6?1:0); pts.push([ex+dx*d*t-dz*o,ez+dz*d*t+dx*o]); }
      for(let s=0;s<6;s++) UNDER.tu.push({x0:pts[s][0],z0:pts[s][1],x1:pts[s+1][0],z1:pts[s+1][1],w:tw,h:th,ph:ph+s,wet}); }
    /* 벼랑 — 입구 양옆에 벼랑 모형 · 입구 위 비탈엔 판판한 벼랑 모형(드러난 바위) — 큰 지형 모형으로 그리고 딛는다(37-geo-meshes.js) */
    if(!(typeof PLAT!=='undefined'&&PLAT.on)&&typeof GEO_LF!=='undefined'&&typeof GEO_MESH_DATA!=='undefined'&&GEO_MESH_DATA.cliffside_rock_face){   // 지형 판 11 은 뺀다 — 떠 보이고 굴길을 덮었다(2026-11-06 사용자)
      const S=Math.min(16,Math.max(9,D*0.9)), yaw=Math.atan2(-ux,-uz), T=[0.94,0.92,0.88];
      for(const sd of [-1,1]){ const off=w+1.2+S*0.95, px=mx+vx*sd*off+ux*S*0.2, pz=mz+vz*sd*off+uz*S*0.2;
        let lo=1e9; for(let k=0;k<9;k++){ const aa=k/9*6.283; lo=Math.min(lo,elev(px+Math.cos(aa)*S*0.8,pz+Math.sin(aa)*S*0.8)); }
        GEO_LF.list.push({name:'cliffside_rock_face',x:px,z:pz,y:(typeof PLAT!=='undefined'&&PLAT.on)?Math.min(elev(px,pz)-S*0.45,lo-S*0.2):elev(px,pz)-S*0.45,S,yaw:yaw+sd*0.35+(rnd()-0.5)*0.2,tint:T}); }
    }
    UNDER.dol.push({x,z,R:Rb,D,mx,mz,ux,uz,Fm,w,ah,segs,room}); }
  if(UNDER.dol.length) computeSlope();
  underPortals();
}
/* 땅 셰이더가 입구 쪽 땅을 굴 모양으로 뚫는다(20-terrain.js TERR_HOLE — 입구마다 굴길 처음 두 토막 · 스물까지) */
function underPortals(){
  const A=TERR_U.uUdA.value, Bv=TERR_U.uUdB.value, Cv=TERR_U.uUdC.value; let n=0;
  /* 너비는 굴길과 같은 굽이(underQ — w·(1+0.18·sin(t·L/9+ph)))로 — 예전엔 고른 w 라 굴길이 좁은 데서 땅만 뚫리고 굴 벽이 없어 섬 속(하늘)이 들여다보였다(2026-11-08 사용자 사진) */
  for(const d of UNDER.dol) for(const sg of d.segs.slice(0,2)){ if(n>=20) break; A[n].set(sg.x0,sg.z0,sg.x1,sg.z1); Bv[n].set(sg.f0,sg.f1,sg.s0===0?-sg.w:sg.w,sg.h); Cv[n].set(sg.L,sg.ph,0,0); n++; }   // 너비가 음수면 첫 토막(입구 뒤는 안 뚫는다)
  TERR_U.uUdN.value=n;
}
/* ── 바닷가 굴(지형 판 11 · 사용자 요청 2026-11-06 '바닷가 벼랑과 그 속의 바닷가 굴 — 산의 굴처럼 · 광석이 잔뜩 든 굴') ─────────────────
   바다에 곧게 선 벼랑(뭍이 14 m 넘게 높고, 바다 쪽 두 칸 안이 물이나 물가 모래) 밑동에 굴 입구가 있다 — 파도가 벼랑 밑을 파 들어간 해식동굴.
   입구 바닥은 물보다 1.5 m 위 · 거기서 굴길이 벼랑 속으로 0.24 의 내리막으로 들어가 광석 굴 방(ore — 14-plateau.js 가 광석을 모은다)에 닿고,
   그 방은 가까운 굴 방과 굴길로 잇는다. 넷~여섯 · 서로 900 m 넘게 · 상륙 자리 350 m 밖. 입구 양옆에 벼랑 모형 · 땅 셰이더가 입구를 뚫는다(underPortals) */
function underSeaCaves(rnd){
  const h=F.elev, cand=[], want=4+((rnd()*3)|0), dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let gz=8;gz<N-8;gz+=2) for(let gx=8;gx<N-8;gx+=2){ const i=gz*N+gx, e=h[i]; if(e<14||F.river[i]) continue;
    for(const [dx,dz] of dirs){ const k1=i+dz*N+dx, k2=i+2*dz*N+2*dx; if(h[k2]<1.0&&h[k1]<e*0.6){ cand.push([gx,gz,dx,dz]); break; } } }
  for(let i=cand.length-1;i>0;i--){ const j=(rnd()*(i+1))|0, t=cand[i]; cand[i]=cand[j]; cand[j]=t; }
  for(const [gx,gz,sx,sz] of cand){ if(UNDER.dol.filter(d=>d.sea).length>=want) break;
    const sl=Math.hypot(sx,sz), ux=-sx/sl, uz=-sz/sl, vx=-uz, vz=ux;                           // 뭍 쪽(안) · 옆
    const cx=(gx-N/2)*CELL, cz=(gz-N/2)*CELL;
    /* 벼랑 밑동 — 바다 쪽으로 걸어 나가며 땅이 2.2 m 밑으로 내려선 첫 자리 */
    let a=0; while(a<CELL*2.5&&heightAt(cx-ux*a,cz-uz*a)>1.9) a+=0.5;
    if(a>=CELL*2.5) continue;
    /* 입구는 벼랑 발치보다 바깥(모래 · 얕은 물 위)에 둔다 — 벼랑 속에 두면 굴에 든 뒤 돌아 나올 때 입구 앞이 바위로 막혔다(2026-11-06 사용자 '들어가면 벽이 생겨 못 나온다') */
    const mx=cx-ux*(a+2.5), mz=cz-uz*(a+2.5);
    if(UNDER.dol.some(d=>Math.hypot(d.mx-mx,d.mz-mz)<900)||(LANDING&&Math.hypot(LANDING.x-mx,LANDING.z-mz)<350)) continue;
    const Fm=0.6, w=3.6+rnd()*1.2, ah=5.5+rnd()*2, Hr=14+rnd()*5, g=0.24;
    /* 지붕 — 안으로 40 m 까지 땅이 굴 천장보다 4 m 넘게 높아야 */
    let roof=true; for(let t=9;t<=46&&roof;t+=3) if(heightAt(mx+ux*t,mz+uz*t)<Fm-g*t+ah+4) roof=false;   // 입구에서 벼랑 발치(2.5 m)를 지난 뒤부터
    if(!roof) continue;
    const bend=(rnd()-0.5)*0.6, Rr=17+rnd()*7, FD=0.3*Math.min(Hr,6), LT=240;
    /* 굴길은 0.24 로 고르게 내려가 끝 방의 가장자리에 닿는다 · **끝 방의 바닥은 굴길 끝 높이로 정한다**(room.fy — underQ). 땅속 바탕(Y0)은 바닷가 벼랑 뒤에서
       15 m 에 56 m 씩 솟을 만큼 가팔라, 바탕을 따르면 굴길 · 방 사이에 턱과 구덩이가 섰다(2026-11-06 걸어 본 시험). 방 위로는 땅이 천장보다 6 m 넘게 덮어야 한다 */
    const pathAt=(Lt,l)=>{ const t=Math.min(1,l/Lt), o=bend*Math.sin(Math.PI*t)*Lt*0.25; return [mx+ux*l+vx*o, mz+uz*l+vz*o]; };
    let L=0, rcx=0, rcz=0;
    for(let l=36;l<=200&&!L;l+=4){ const fe=Fm-g*l, [ax,az]=pathAt(LT,l), bx=ax+ux*Rr*0.95, bz=az+uz*Rr*0.95;
      let ok=true; for(let k=0;k<9&&ok;k++){ const a=k/8*6.283, r=k?Rr*0.9:0; if(heightAt(bx+Math.cos(a)*r,bz+Math.sin(a)*r)<fe+Hr+6) ok=false; }
      for(let t=9;t<=l&&ok;t+=6){ const [qx,qz]=pathAt(LT,t); if(heightAt(qx,qz)<Fm-g*t+ah+3) ok=false; }
      for(let t=0;t<=l&&ok;t+=6){ const [qx,qz]=pathAt(LT,t); if(underOverlap(qx,qz,w+3)) ok=false; }
      if(ok&&underOverlap(bx,bz,Rr*1.3+4)) ok=false;
      if(ok){ L=l; rcx=bx; rcz=bz; } }
    if(!L) continue;
    const NS=Math.max(4,Math.ceil(L/12)), ex=rcx, ez=rcz, Fe=Fm-g*L;
    const segs=[];
    /* 들머리 — 입구 바깥 모래턱 위 9 m 를 판판한 굴 바닥으로(물에서 걸어 들 수 있게 · 땅 셰이더도 거기서부터 뚫는다) */
    { const sg={ad:1,x0:mx-ux*9,z0:mz-uz*9,x1:mx,z1:mz,f0:Fm,f1:Fm,w,h:ah,ph:rnd()*6.283,L:9,s0:0,sea:1}; segs.push(sg); UNDER.ad.push(sg); }
    for(let k=0;k<NS;k++){ const l0=L*k/NS, l1=L*(k+1)/NS, [x0,z0]=pathAt(LT,l0), [x1,z1]=pathAt(LT,l1);
      const sg={ad:1,x0,z0,x1,z1,f0:Fm-g*l0,f1:Fm-g*l1,w,h:ah,ph:rnd()*6.283,L:Math.hypot(x1-x0,z1-z0)||1,s0:9+l0,sea:1}; segs.push(sg); UNDER.ad.push(sg); }
    const room={fy:Fe,x:ex,z:ez,R:Rr,H:Hr,sd:(rnd()*1e9)|0,p:[rnd()*6.283,rnd()*6.283,rnd()*6.283],pool:rnd()<0.5,bats:rnd()<0.5,crys:rnd()<0.6,shroom:true,web:rnd()<0.3,cent:false,adit:segs,aL:L,ore:2,sea:1};
    UNDER.ch.push(room);
    /* 끝 방은 굴길 하나로만 드나든다(바닥 높이를 굴길 끝에 맞춘 방 — 다른 굴과 잇지 않는다) */
    if(false&&typeof GEO_LF!=='undefined'&&typeof GEO_MESH_DATA!=='undefined'&&GEO_MESH_DATA.cliffside_rock_face){   // 입구 양옆 벼랑 모형은 뺐다(2026-11-06 사용자 — 떠 보이고 · 그 윗면이 굴길을 덮어 들어가면 눈이 막혀 못 나왔다)
      const S=Math.min(18,Math.max(10,ah*1.8)), yaw=Math.atan2(-ux,-uz), T=[0.86,0.84,0.80];
      for(const sd of [-1,1]){ const off=w+1.0+S*0.9, px=mx+vx*sd*off+ux*S*0.25, pz=mz+vz*sd*off+uz*S*0.25;
        let lo=1e9; for(let k=0;k<9;k++){ const aa=k/9*6.283; lo=Math.min(lo,heightAt(px+Math.cos(aa)*S*0.8,pz+Math.sin(aa)*S*0.8)); }   // 자락 둘레의 가장 낮은 땅 밑에 — 떠 보였다(사용자 사진)
        GEO_LF.list.push({name:'cliffside_rock_face',x:px,z:pz,y:Math.min(heightAt(px,pz)-S*0.5,lo-S*0.2),S,yaw:yaw+sd*0.3+(rnd()-0.5)*0.2,tint:T}); } }
    /* 입구 앞 모래턱 — 벼랑이 깊은 물로 곧게 떨어지면 헤엄쳐 와서 설 데가 없었다(2026-11-06 사용자 '바닷가 벼랑에서 갇힌다'). 입구 바다 쪽 반지름 16 m 를 물 위 0.35 m 로 돋운다 */
    { const ax=mx-ux*6, az=mz-uz*6, Ra=16, h=F.elev;
      for(let gz=Math.floor((az-Ra)/CELL+N/2);gz<=Math.ceil((az+Ra)/CELL+N/2);gz++) for(let gx=Math.floor((ax-Ra)/CELL+N/2);gx<=Math.ceil((ax+Ra)/CELL+N/2);gx++){
        if(gx<1||gz<1||gx>N-2||gz>N-2) continue; const k=gz*N+gx, dd=Math.hypot((gx-N/2)*CELL-ax,(gz-N/2)*CELL-az)/Ra; if(dd>=1.4) continue;
        const v=dd<1?0.35+0.3*(1-dd*dd):0.35-3.5*(dd-1)/0.4; if(v>h[k]){ h[k]=v; F.river[k]=0; F.biome[k]=B.BEACH; } } }
    UNDER.dol.push({x:mx,z:mz,R:10,D:0,mx,mz,ux,uz,Fm,w,ah,segs,room,sea:1}); }
  if(UNDER.dol.some(d=>d.sea)) computeSlope();
}
/* 그 자리가 입구 굴길 안(바닥 높이 y 근처)인가 — 땅 위에서 굴로 걸어 드는 길(62-build.js floorAt) */
function underAditAt(x,z,y){
  if(!UNDER.ad.length) return false;
  for(const o of UNDER.ad){ const vx=o.x1-o.x0, vz=o.z1-o.z0, t0=((x-o.x0)*vx+(z-o.z0)*vz)/(o.L*o.L); if(o.s0===0&&t0<0) continue; const t=clamp(t0,0,1), px=o.x0+vx*t-x, pz=o.z0+vz*t-z;
    if(px*px+pz*pz>o.w*o.w*0.81) continue; const f=o.f0+(o.f1-o.f0)*t; if(Math.abs(f-y)<1.6) return true; }
  return false;
}
/* 땅 셰이더가 뚫는 입구 구멍(underPortals — 입구마다 굴길 처음 두 토막 · 스물까지 · TERR_HOLE 과 같은 식)에 그 점이 드나 —
   구멍 위에 돌 · 자갈 · 풀이 떠 보이지 않게(2026-11-08 사용자 사진 — 함몰 입구 위에 돌이 떠 있다). pad 만큼 넉넉히 */
function underHoleAt(x,z,y,pad){
  if(!UNDER.dol.length) return false; pad=pad||0; let n=0;
  for(const d of UNDER.dol) for(const sg of d.segs.slice(0,2)){ if(n++>=20) return false;
    const vx=sg.x1-sg.x0, vz=sg.z1-sg.z0, t0=((x-sg.x0)*vx+(z-sg.z0)*vz)/Math.max(vx*vx+vz*vz,1e-4); if(sg.s0===0&&t0<0) continue;
    const t=clamp(t0,0,1), px=sg.x0+vx*t-x, pz=sg.z0+vz*t-z, dd=Math.sqrt(px*px+pz*pz), Rw=sg.w*(1+0.18*Math.sin(t*sg.L/9+sg.ph)); if(dd>=Rw+pad) continue;
    const u=Math.min(1,dd/Rw), f=sg.f0+(sg.f1-sg.f0)*t, c=f+sg.h*0.45+sg.h*0.55*Math.sqrt(Math.max(0,1-u*u)), fl=f+(1-Math.pow(Math.max(0,1-Math.pow(u,8)),0.25))*sg.h*0.45;
    if(y<c+0.4+pad&&y>fl-0.3-pad) return true; }
  return false;
}
TERR_U.uUdA={value:Array.from({length:20},()=>new THREE.Vector4())}; TERR_U.uUdB={value:Array.from({length:20},()=>new THREE.Vector4())}; TERR_U.uUdC={value:Array.from({length:20},()=>new THREE.Vector4())}; TERR_U.uUdN={value:0};   // 함몰 입구 · 바닷가 굴 입구(굴길 처음 두 토막씩 · 열까지)
/* 그 자리가 수직굴 구멍 둘레(r m 안)인가 — 굴 꾸밈(석순 · 버섯)이 구멍 위에 안 서게(32-caves.js) */
function underPitNear(x,z,r){ for(const p of UNDER.pits) if((x-p.x)*(x-p.x)+(z-p.z)*(z-p.z)<r*r) return true; return false; }
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
  let g=0, pool=null, pd=0, adg=0, adf=0, adc=0, ads=0, wetT=-1, gO=null;
  if(a) for(const o of a){
    if(o.R!==undefined){ const dx=x-o.x, dz=z-o.z, d2=dx*dx+dz*dz, rm=o.R*1.3; if(d2>rm*rm) continue;
      const d=Math.sqrt(d2), an=Math.atan2(dz,dx), Rn=o.R*(1+0.14*Math.sin(3*an+o.p[0])+0.09*Math.sin(5*an+o.p[1])+0.05*Math.sin(9*an+o.p[2]));
      let inCol=false; if(o.cols) for(const cl of o.cols){ const ex=x-cl.x, ez=z-cl.z; if(ex*ex+ez*ez<cl.r*cl.r){ inCol=true; break; } }
      if(d<Rn&&!inCol){ const u=d/Rn, v=o.H*Math.pow(1-Math.pow(u,8),0.25); if(v>g){ g=v; gO=o; } }   // 벽은 수직에 가깝게(2026-11-05 사용자 요청 — 예전 렌즈 꼴 √(1−u²)) · 석주 속은 바위
      if(o.pool&&o.pr&&d<o.pr*1.4){ pool=o; pd=d; } }
    else if(o.ad){ const vx=o.x1-o.x0, vz=o.z1-o.z0, t0=((x-o.x0)*vx+(z-o.z0)*vz)/(o.L*o.L); if(o.s0===0&&t0<0) continue;   // 입구 뒤(바깥)는 안 연다
      const t=clamp(t0,0,1), px=o.x0+vx*t-x, pz=o.z0+vz*t-z, d=Math.sqrt(px*px+pz*pz);
      const Rw=o.w*(1+0.18*Math.sin(t*o.L/9+o.ph)); if(d<Rw){ const u=d/Rw, pr=Math.pow(1-Math.pow(u,8),0.25), fa=o.f0+(o.f1-o.f0)*t+uN(x*1.3,z*1.3)*0.18;
        const ar=Math.sqrt(Math.max(0,1-u*u)), ga=o.h*pr; if(ga>adg){ adg=ga; adf=fa+(1-pr)*o.h*0.45; adc=fa+o.h*0.45+o.h*0.55*ar+uN(x*2.1+7,z*2.1)*0.25*ar; ads=o.s0+o.L*t; } } }   // 아래는 곧은 벽 · 위는 둥근 아치
    else{ const vx=o.x1-o.x0, vz=o.z1-o.z0, t=clamp(((x-o.x0)*vx+(z-o.z0)*vz)/(o.L*o.L),0,1), px=o.x0+vx*t-x, pz=o.z0+vz*t-z, d=Math.sqrt(px*px+pz*pz);
      const Rw=o.w*(1+0.22*Math.sin(t*o.L/23+o.ph)); if(d<Rw){ const u=d/Rw, v=o.h*Math.pow(1-Math.pow(u,8),0.25); if(v>g){ g=v; wetT=o.wet?u:-1; } } }
  }
  const Y0=(gO&&gO.fy!==undefined)?gO.fy+0.3*Math.min(gO.H,6):uBase(x,z), n=uN(x,z);   // 바닷가 굴의 끝 방은 제 바닥 높이(fy — underSeaCaves)
  /* 지형 판 11 — 바닥 깊이는 1.8 m 에서 멈춘다(빈 높이가 6 m 넘는 데는 천장만 높다). 예전엔 바닥 = Y0 − 0.3 × 빈 높이라 굴길(6~9 m)이 방(12~28 m)에 닿는 데마다
     바닥이 4~6 m 꺼진 턱이 서서 이유 없이 떨어지고 되돌아 못 올랐다(2026-11-06 사용자 '굴에서 이유 없이 떨어진다') */
  const gF=(typeof PLAT!=='undefined'&&PLAT.on)?Math.min(g,6):g;
  q.g=g; q.f0=Y0-0.3*gF; q.as=-1; q.st=false;
  if(g<=0){ q.f=q.c=Y0; }
  else{
    const k=Math.min(1,g/4);
    q.f=Y0-0.3*gF+n*0.45*k;
    q.c=Y0-0.3*gF+g+(uN(x*1.7+31,z*1.7-17)*1.1+uN(x*4.1,z*4.1)*0.35)*k;
    /* 못 — 물 판(반지름 0.98 pr)의 가장자리가 늘 바닥 밑에 묻히게 둘레를 둑으로 올린다(2026-11-08 사용자 사진 — 굴 못이 허공에 떠 뚝 끊겼다):
       0.85 pr 안은 물 밑(가운데 1.6 m) · 0.85~1.1 pr 은 물보다 0.1 m 밑에서 0.5 m 위로 오르는 둑 · 1.1~1.4 pr 은 둑에서 제 바닥으로 */
    if(pool){ const r=pd/pool.pr, wl=pool.wl;
      if(r<0.85){ const s=1-(r/0.85)*(r/0.85); q.f=Math.min(q.f,wl-0.1-1.5*s); }
      else if(r<1.1) q.f=wl-0.1+0.6*smoothstep(0.85,1.1,r);
      else q.f=Math.max(q.f,wl+0.5+(q.f-wl-0.5)*clamp((r-1.1)/0.3,0,1));
      if(r<0.92) q.w=wl; }
    else if(wetT>=0&&wetT<0.42){ const s=1-(wetT/0.42)*(wetT/0.42), f0=q.f; q.f-=0.7*s; q.w=f0-0.12; q.st=true; }   // 물길 — 바닥 가운데를 판 고랑에 물이 흐른다(지하수)
  }
  /* 입구 굴길(함몰 입구에서 내려가는 길) — 제 바닥 · 천장(방 · 굴길과 겹치면 둘을 합친 빈 데) */
  if(adg>0.05){ if(g<=0){ q.f=adf; q.c=adc; q.w=-1e9; } else { q.f=Math.min(q.f,adf); q.c=Math.max(q.c,adc); } if(adg>g){ q.g=adg; q.as=ads; } }
  return q;
}
/* ── 몸 · 눈 · 물 ───────────────────────────────────────────────────────── */
const underIn=(x,z,y)=>UNDER.ok&&y<heightAt(x,z)-3;                       // 땅 밑 3 m 아래면 땅속으로 친다
function underFloorAt(x,z){ const q=underQ(x,z); return (q.g>0.05&&q.c-q.f>1.0)?q.f:1e4; }   // 바위 속이면 아주 높은 벽
/* 그 자리가 방 둘레 벽 바위(c.walls — underSites) 속인가(pad 만큼 넉넉히). y 를 주면 바위 높이 안일 때만 */
function underWallAt(x,z,pad,y){
  const a=UNDER.grid.get(UGK(Math.floor(x/UNDER.G),Math.floor(z/UNDER.G))); if(!a) return false; pad=pad||0;
  for(const o of a){ if(!o.walls) continue; const dx=x-o.x, dz=z-o.z, rm=o.R*1.3+12; if(dx*dx+dz*dz>rm*rm) continue;
    for(const w of o.walls){ const ex=x-w.x, ez=z-w.z, r=w.r+pad; if(ex*ex+ez*ez<r*r&&(y===undefined||(y>w.y0-0.5&&y<w.y0+w.S))) return true; } }
  return false;
}
function underWalk(x,z,fromH){
  if(Math.abs(x)>HALF-6||Math.abs(z)>HALF-6) return false;
  const q=underQ(x,z); if(q.g<=0.05) return false;
  if(underWallAt(x,z,0.25,fromH+0.5)) return false;                       // 방 둘레 벽 바위
  let f=q.f; const c=q.c; if(c-f<2.05) return false;                      // 머리가 닿는다
  { const rt=rockTop(x,z); if(rt>f&&fromH>RKF.bot-0.6&&rt-fromH<=1.35&&c-rt>1.9) return true; }   // 광석 — 1.35 m 까지 넘어 오른다(30-props.js) · 땅속에선 더 높은 것도 막지 않는다(좁은 굴에서 광맥 무리에 갇혔다 — 2026-11-06 사용자 '굴 속 움직임이 이상하다')
  const rise=f-fromH; if(rise>STEPUP) return false; if(rise<=0.02) return true;
  const e=1.5, gx=(underQ(x+e,z).f-underQ(x-e,z).f)/(2*e), gz=(underQ(x,z+e).f-underQ(x,z-e).f)/(2*e);
  return Math.hypot(gx,gz)<=MAXSLOPE;
}
function underSolid(x,z,y){ const q=underQ(x,z); return q.g<=0.05||y<q.f||y>q.c||underWallAt(x,z,0,y); }
function underEyeHit(x,y,z){
  for(const o of _eyeO){ const q=underQ(x+o[0],z+o[1]); if(q.g<=0.3||y<q.f+0.15||y>q.c-0.22||underWallAt(x+o[0],z+o[1],0.1,y)) return true; }
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
function underRockIM(){
  if(UNDER.rkm) return UNDER.rkm;
  const base=geoMat(), m=base.clone(); m.onBeforeCompile=base.onBeforeCompile; m.customProgramCacheKey=base.customProgramCacheKey; if(base.userData.rkU) m.userData=Object.assign({},base.userData);
  m.color.setRGB(0.40,0.39,0.37); m.shadowSide=THREE.BackSide;                 // 젖은 돌 — 짙게(물이 스민 석회암 · 화강암)
  return UNDER.rkm=m;
}
function underTileDrop(t){ for(const m of [t.fl,t.ce,t.wa]) if(m){ UNDER.grp&&UNDER.grp.remove(m); m.geometry.dispose(); } }
function underTile(tx,tz){
  const T=UNDER.T, S=UNDER.S, n=T/S+1, x0=tx*T, z0=tz*T, NV=n*n;
  const F0=new Float32Array(NV), C0=new Float32Array(NV), G0=new Float32Array(NV), A0=new Float32Array(NV), W0=new Float32Array(NV), H0=new Float32Array(NV); let any=false, wet=false;
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const q=underQ(x0+i*S,z0+j*S), k=j*n+i; F0[k]=q.f; C0[k]=q.c; G0[k]=q.g; A0[k]=q.as; H0[k]=q.as>=0?heightAt(x0+i*S,z0+j*S):1e9; W0[k]=q.st?q.w:-1e9; if(q.g>0) any=true; if(q.st&&q.w>q.f+0.05) wet=true; }
  const t={tx,tz,fl:null,ce:null}; if(!any) return t;
  const mk=(Y,down)=>{ const P=new Float32Array(NV*3), Cc=new Float32Array(NV*3), Ml=new Float32Array(NV), I=[];
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i, x=x0+i*S, z=z0+j*S; P[k*3]=x; P[k*3+1]=Y[k]; P[k*3+2]=z;
      const ao=0.42+0.58*clamp(G0[k]/7,0,1), wt=(down?0.82:(0.9+0.12*uN(x*0.7+5,z*0.7)))*(A0[k]>=0?0.32+0.68*Math.exp(-Math.max(0,A0[k]-4)/14):1)*0.86;   // 벽 밑·구석은 어둡다 · 입구 굴길은 들어갈수록 어둡다(밖의 빛이 못 닿는다) · 젖은 돌(×0.86)
      Cc[k*3]=ao*wt*(down?0.92:1.0); Cc[k*3+1]=ao*wt*(down?0.92:0.96); Cc[k*3+2]=ao*wt*(down?0.95:0.90); }
    for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){ const a=j*n+i, b=a+1, c=a+n, d=c+1;
      if(G0[a]<=0&&G0[b]<=0&&G0[c]<=0&&G0[d]<=0) continue;
      /* 입구 굴길 — 천장은 언덕이 덮는 데만 · 바닥은 땅이 그 높이로 덮는 데(바깥)는 안 그린다(문틀처럼 삐져나왔다) */
      if(down){ if(H0[a]<C0[a]+0.3||H0[b]<C0[b]+0.3||H0[c]<C0[c]+0.3||H0[d]<C0[d]+0.3) continue; }
      else if(H0[a]<=F0[a]+0.5&&H0[b]<=F0[b]+0.5&&H0[c]<=F0[c]+0.5&&H0[d]<=F0[d]+0.5) continue;
      if(down) I.push(a,b,c, b,d,c); else I.push(a,c,b, b,c,d); }
    if(!I.length) return null;
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('color',new THREE.BufferAttribute(Cc,3));
    g.setAttribute('aMelt',new THREE.BufferAttribute(Ml,1)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,underMat()); m.matrixAutoUpdate=false; m.updateMatrix(); m.userData.lightRole='recv'; UNDER.grp.add(m); return m; };
  t.fl=mk(F0,false); t.ce=mk(C0,true);
  /* 물길의 물(지하수 — 굴길 바닥 가운데 고랑) — 네 꼭짓점이 다 물인 칸만 */
  if(wet){ const P=new Float32Array(NV*3), I=[];
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const k=j*n+i; P[k*3]=x0+i*S; P[k*3+1]=W0[k]>-1e8?W0[k]:F0[k]-1; P[k*3+2]=z0+j*S; }
    for(let j=0;j<n-1;j++) for(let i=0;i<n-1;i++){ const a=j*n+i, b=a+1, c=a+n, d=c+1; if(W0[a]>-1e8&&W0[b]>-1e8&&W0[c]>-1e8&&W0[d]>-1e8) I.push(a,c,b, b,c,d); }
    if(I.length){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
      t.wa=new THREE.Mesh(g,underGeos().pool); t.wa.matrixAutoUpdate=false; t.wa.updateMatrix(); t.wa.renderOrder=3; UNDER.grp.add(t.wa); } }
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
    im.instanceMatrix.needsUpdate=true; im.frustumCulled=false; im.userData.lightRole='recv'; grp.add(im); };   // 인스턴스는 화면 거르기를 끈다(꼴의 경계구는 원점에 있다)
  const spot=(k)=>{ const a=rnd()*6.283, r=c.R*Math.sqrt(rnd())*k; return [c.x+Math.cos(a)*r,c.z+Math.sin(a)*r]; };
  /* 종유석(천장에서 아래로) · 석순(바닥에서 위로) — 방이 클수록 많다 */
  const st=[], sm=[], nS=Math.round(c.R*0.9);
  if(typeof PLAT!=='undefined'&&PLAT.on){
    /* 지형 판 11 — **무리 지어**(사용자 요청 2026-11-06): 물이 스며 떨어지는 금을 따라 모이므로 무리 가운데가 길고 굵고 가장자리로 잘아진다 ·
       석순은 종유석 밑에 짝지어 · 석주(위 c.cols) 둘레에도 무리 하나씩 */
    const ctr=[]; for(let k=0,nC=2+Math.round(c.R*0.07);k<nC;k++) ctr.push(spot(0.82));
    for(const o of (c.cols||[]).slice(0,3)) ctr.push([o.x,o.z]);
    for(const [cx,cz] of ctr){ const nB=8+((rnd()*12)|0), rad=2.2+rnd()*4.5;
      for(let i=0;i<nB;i++){ const a=rnd()*6.283, rr=rad*Math.pow(rnd(),0.75), x=cx+Math.cos(a)*rr, z=cz+Math.sin(a)*rr, q=underQ(x,z,true); if(q.g<3||q.w>-1e8||underWallAt(x,z,0.3)) continue;
        const gap=q.c-q.f, cen=1-rr/rad, L=Math.min(gap*0.40,(0.4+cen*3.6)*(0.55+rnd()*0.9)), r=0.09+L*0.12, qc=q.c, qf=q.f;
        st.push([x,qc+0.3,z,r,-L-0.3,r,0,rnd()*6,0]);
        if(rnd()<0.72){ const h=Math.min(gap*0.32,(0.3+cen*2.4)*(0.55+rnd()*0.9)); sm.push([x+(rnd()-0.5)*0.3,qf-0.15,z+(rnd()-0.5)*0.3,0.15+h*0.17,h+0.15,0.15+h*0.17,0,rnd()*6,0]); } } }
  }else
  for(let i=0;i<nS;i++){ const [x,z]=spot(0.9), q=underQ(x,z,true); if(q.g<3||q.w>-1e8) continue;
    const L=Math.min((q.c-q.f)*0.32,0.8+rnd()*rnd()*4.5), r=0.12+L*0.11;
    st.push([x,q.c+0.3,z,r,-L-0.3,r,0,rnd()*6,0]);
    if(rnd()<0.55){ const h=Math.min((q.c-q.f)*0.25,0.4+rnd()*rnd()*2.6); sm.push([x+(rnd()-0.5)*0.4,q.f-0.15,z+(rnd()-0.5)*0.4,0.18+h*0.16,h+0.15,0.18+h*0.16,0,rnd()*6,0]); } }
  inst(G.cone,G.lime,st); inst(G.cone,G.rock,sm);
  /* 석주 · 젖은 바닥 · 천장(사용자가 준 모형을 잘라 붙인다 — 2026-11-05 '종유석 · 석주는 준 모형으로 · 천장 · 바닥은 젖은 돌로 절벽 모형 일부를 잘라 합성') */
  if(typeof geoMeshGeo==='function'&&typeof GEO_MESH_DATA!=='undefined'){
    const RM=underRockIM(), im=(nm,lod,list)=>{ if(!list.length||!GEO_MESH_DATA[nm]) return; const m=new THREE.InstancedMesh(geoMeshGeo(nm,lod,true),RM,list.length);
      list.forEach((o,i)=>{ E.set(o[6]||0,o[7]||0,o[8]||0); Q.setFromEuler(E); V.set(o[0],o[1],o[2]); Sc.set(o[3],o[4],o[5]); M.compose(V,Q,Sc); m.setMatrixAt(i,M); });
      m.instanceMatrix.needsUpdate=true; m.frustumCulled=false; m.userData.lightRole='recv'; grp.add(m); };
    im('cave_stalactites_and_stalagmites','far',(c.cols||[]).map(o=>[o.x,o.f-0.3,o.z,o.s,o.gap+0.6,o.s*0.9,0,o.yaw,0]));
    const fl=[], ce=[], put=(x,z,big)=>{ if(underWallAt(x,z,0.6)) return; const q=underQ(x,z,true); if(q.g<1.5) return;
      const hh=heightAt(x,z); if(q.as>=0&&hh<q.c+1.5) return;                          // 입구 굴길 — 언덕이 덮는 데만(밖에선 허공에 떴다)
      if(q.w<-1e8&&rnd()<0.75){ const S=(0.5+rnd()*0.6)*(big?1:0.8); fl.push([x,q.f-S*0.6,z,S,S,S,(rnd()-0.5)*0.2,rnd()*6.283,(rnd()-0.5)*0.2]); }
      if(q.c-q.f>4.5&&rnd()<0.7){ const S=(1.5+rnd()*2.0)*(big?1:0.6); if(hh<q.c+S*1.7) return; ce.push([x,q.c+S*0.55,z,S,S,S,Math.PI+(rnd()-0.5)*0.3,rnd()*6.283,(rnd()-0.5)*0.3]); } };
    for(let k=0,nP=Math.round(c.R*0.55);k<nP;k++){ const [x,z]=spot(0.92); put(x,z,true); }
    /* 벽 — 방 둘레에 벼랑 면 모형을 세워 박는다(곧은 벽의 바위 결 · 2026-11-05) */
    const wl=(c.walls||[]).map(w=>[w.x,w.y0,w.z,w.S*0.9,w.S,w.S*0.9,w.tx,w.yaw,w.tz]);   // 벽 바위 — 섬을 지을 때 정한 자리(underSites)
    im('cliffside_rock_face','far',wl);
    if(c.adit) for(const sg of c.adit) for(let s=0;s<sg.L;s+=5){ const t=s/sg.L, l=(rnd()-0.5)*sg.w*1.2; put(sg.x0+(sg.x1-sg.x0)*t-(sg.z1-sg.z0)/sg.L*l,sg.z0+(sg.z1-sg.z0)*t+(sg.x1-sg.x0)/sg.L*l,false); }
    im('stonecliff_plateau','tiny',fl); im('cliffside_rock_face','tiny',ce); }
  const GP=[], GA=[], lamps=[];
  /* 결정 무리 — 바닥 가장자리에서 비스듬히 솟는다 · 보랏빛으로 은은히 빛난다 */
  if(c.crys){ const cr=[]; for(let k=0;k<3;k++){ const a=rnd()*6.283, x0=c.x+Math.cos(a)*c.R*0.7, z0=c.z+Math.sin(a)*c.R*0.7, q0=underQ(x0,z0,true), y0=q0.f; if(q0.g<2||underWallAt(x0,z0,1.6)) continue;   // underQ 는 같은 그릇을 돌려준다 — 값은 바로 받아 둔다
      for(let i=0;i<9;i++){ const x=x0+(rnd()-0.5)*2.2, z=z0+(rnd()-0.5)*2.2, q=underQ(x,z,true), h=0.4+rnd()*1.6, r=0.08+h*0.07;
        cr.push([x,q.f-0.1,z,r,h,r,(rnd()-0.5)*0.9,rnd()*6,(rnd()-0.5)*0.9]); }
      lamps.push([x0,y0+1.2,z0,0x8c70ff,2.6,30]); }
    inst(G.crys,G.crysM,cr); }
  /* 빛나는 버섯 무더기 */
  if(c.shroom){ const sh=[]; for(let k=0;k<4;k++){ const [x0,z0]=spot(0.85), q0=underQ(x0,z0,true), y0=q0.f; if(q0.g<2||q0.w>-1e8||underWallAt(x0,z0,1.2)) continue;
      for(let i=0;i<10;i++){ const x=x0+(rnd()-0.5)*1.6, z=z0+(rnd()-0.5)*1.6, q=underQ(x,z,true), r=0.06+rnd()*0.16;
        sh.push([x,q.f+0.05+r*0.6,z,r,r*0.7,r,0,0,0]); }
      GP.push(x0,y0+0.25,z0); GA.push(2.2,rnd(),0.34); if(k===0) lamps.push([x0,y0+1.0,z0,0x58ffd0,2.4,28]);
      d.picks.push({kind:'glowshroom',x:x0,y:y0,z:z0,ay:y0+0.15,key:'UM'+c.sd+'_'+k,r:0.8,tree:false}); }   // 빛버섯 — 캔다(사용자 요청 2026-11-06 '버섯을 캘 수 있게' · 95-flora.js glowshroom)
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
  const rope=new THREE.MeshLambertMaterial({color:0x8a6a3a}), wood=new THREE.MeshLambertMaterial({color:0x5a4228});
  /* **구멍**(2026-11-05 사용자 지적 — 구멍이 아니라 검은 점 같다 · 둘레를 치우고 파낸 흙을 조금 쌓아 흙빛으로 · 구멍 벽은 바위처럼 울퉁불퉁하고 젖게):
     ① 구멍 판 — 검은 판 대신 **판 아래의 굴뚝을 셰이더가 그린다**(속 비추기 · interior mapping): 눈에서 판을 지나는 선이 굴뚝 벽(반지름이 깊이 · 방위마다
        울퉁불퉁)에 닿는 데를 풀어, 그 벽을 바위 사진으로 칠한다. 위 1 m 는 흙켜(뿌리 · 자갈) · 그 밑은 그 굴의 바위 · 물이 스며 흘러내린 세로 줄은 짙고
        번들거린다 · 깊을수록 빛이 줄어 30 m 밑은 캄캄하다 · 벽의 혹은 위쪽(구멍 쪽 빛)이 밝다
     ② 테 — 파낸 흙을 둘레 1.5~3.8 m 에 둥글게 쌓은 낮은 둔덕(높이 0.3~0.5 m · 안쪽 끝은 판보다 조금 낮게 내려 이음매를 덮는다). 속흙 빛(붉은 갈색) · 진흙 사진 결
     ③ 테 위의 돌 — 파내다 나온 바위 조각(그 굴의 바위 재질) · 둘레 5 m 안의 자원은 치운다(underSites) */
  const KL={karst:[0,[1.10,1.08,1.02],'karst'],lava:[4,[0.62,0.62,0.64],'basalt'],talus:[2,[0.95,0.93,0.90],'granite'],shelter:[1,[1.02,0.90,0.76],'sandstone']};
  const dirtM=new THREE.MeshLambertMaterial({vertexColors:true}); gndDetailPatch(dirtM,6,1.6);
  for(const p of UNDER.pits){
    if((P.tv|0)<10) p.ys=heightAt(p.x,p.z);                                  // 판 10 은 underSites 가 굴 바닥으로 정했다(cv10Field.f)
    const gH=(x,z)=>(P.tv|0)>=10?p.ys:heightAt(x,z);                          // 테 · 돌 높이 — 판 10 구멍은 굴 바닥에 있다
    const kk=KL[(p.cave&&p.cave.kind)||'karst']||KL.karst, R0=1.55, D=Math.max(6,p.ys-p.yc+0.5);
    const hm=new THREE.ShaderMaterial({
      uniforms:{uC:{value:new THREE.Vector3(p.x,p.ys+0.03,p.z)}, uR:{value:R0}, uD:{value:D}, uLay:{value:kk[0]}, uTint:{value:new THREE.Vector3(...kk[1])},
        uRk:TERR_U.uRk||{value:null}, uL:UNDER_HOLE_L, uRP:{value:(p.x*0.37+p.z*0.11)%6.283}},
      vertexShader:`varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader:`precision highp float; precision mediump sampler2DArray;
uniform vec3 uC; uniform float uR, uD, uLay, uRP; uniform vec3 uTint; uniform vec3 uL; ${TERR_U.uRk?'uniform sampler2DArray uRk;':''}
varying vec3 vW;
float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
/* 벽 반지름 — 방위 · 깊이마다 울퉁불퉁(바위 덩이가 튀어나오고 들어간다) */
float wallR(float an,float y){ return uR*(1.0+0.20*(vn(vec2(an*2.6+uRP,y*0.45))-0.5)*2.0+0.08*(vn(vec2(an*7.0,y*1.3+5.0))-0.5)*2.0); }
void main(){
  vec3 rd=normalize(vW-cameraPosition);
  vec2 o=vW.xz-uC.xz, d=rd.xz; float dd=max(dot(d,d),1e-7), od=dot(o,d);
  float R=uR, t=0.0; vec3 h=vW;
  for(int k=0;k<4;k++){ float c0=dot(o,o)-R*R; float dsc=max(od*od-dd*c0,0.0); t=(-od+sqrt(dsc))/dd; h=vW+rd*t;
    vec2 hw=h.xz-uC.xz; R=max(wallR(atan(hw.y,hw.x),h.y),length(o)+0.02); }
  float dep=uC.y-h.y; vec2 hw=h.xz-uC.xz; float an=atan(hw.y,hw.x);
  if(dep>uD){ gl_FragColor=vec4(vec3(0.0),1.0); return; }                     // 바닥까지 — 캄캄하다
  vec2 uw=vec2(an*uR/1.9,h.y/1.9);
  ${TERR_U.uRk?'vec3 rk=texture(uRk,vec3(uw,uLay)).rgb;':'vec3 rk=vec3(0.5);'}
  rk=mix(vec3(dot(rk,vec3(0.30,0.59,0.11))),rk,0.25)*2.0*uTint*0.55;
  /* 흙켜(위 1 m — 붉은 갈색 속흙 · 자갈 점 · 맨 위는 검은 겉흙) */
  float soil=smoothstep(0.85,0.45,dep+0.25*(vn(vec2(an*5.0,1.0))-0.5));
  vec3 sc=mix(vec3(0.30,0.21,0.14),vec3(0.17,0.13,0.10),smoothstep(0.35,0.0,dep))*(0.85+0.3*vn(vec2(an*40.0,h.y*25.0)));
  sc=mix(sc,vec3(0.45,0.43,0.40),step(0.86,hh(floor(vec2(an*60.0,h.y*40.0))))*0.6);
  vec3 c=mix(rk,sc,soil);
  /* 바위 덩이 — 반지름의 기울기로 혹의 위쪽이 밝다(빛은 구멍에서 내려온다) */
  float r1=wallR(an,h.y+0.25), r0=wallR(an,h.y-0.25); float up=clamp((r0-r1)*3.0+0.5,0.0,1.0);
  c*=0.70+0.55*up;
  /* 젖음 — 물이 스며 흘러내린 세로 줄은 짙고 번들거린다 · 깊을수록 축축하다 */
  float st=smoothstep(0.55,0.85,vn(vec2(an*9.0+uRP,h.y*0.18)))*(1.0-soil*0.6), wet=clamp(st+smoothstep(2.0,10.0,dep)*0.35,0.0,1.0);
  c*=mix(1.0,0.55,wet);
  float lit=exp(-dep/6.0)*(0.35+0.65*smoothstep(-1.0,3.0,-dep+3.0*up));
  vec3 col=c*uL*lit;
  col+=uL*wet*pow(vn(vec2(an*30.0,h.y*6.0)),6.0)*0.9*exp(-dep/4.0)*up;          // 물 번들거림
  gl_FragColor=vec4(col,1.0);
}`});
    const h=new THREE.Mesh(new THREE.CircleGeometry(R0+0.15,32).rotateX(-Math.PI/2),hm); h.position.set(p.x,p.ys+0.03,p.z); h.renderOrder=1; pg.add(h);
    /* 테 — 파낸 흙 둔덕 */
    { const NA=40, NR=7, P=[], C=[], I=[], rr=mulberry32((Math.round(p.x*7)^Math.round(p.z*13))>>>0);
      const lump=[]; for(let k=0;k<NA;k++) lump.push(0.75+0.5*rr());
      for(let j=0;j<=NR;j++){ const f=j/NR, r=R0*0.92+Math.pow(f,1.25)*2.5;   // 안쪽 끝은 구멍 판 밑으로 — 둔덕이 구멍 가장자리에서 바로 솟는다
        for(let k=0;k<NA;k++){ const a=k/NA*6.2832, x=p.x+Math.cos(a)*r, z=p.z+Math.sin(a)*r;
          const lm=(lump[k]+lump[(k+1)%NA]+lump[(k+NA-1)%NA])/3, prof=j===0?-0.25:0.48*Math.pow(Math.sin(Math.PI*Math.min(1,(f-0.02)/0.98)),0.7)*lm*(1.0-0.25*f);
          P.push(x,gH(x,z)+prof+(j===NR?-0.06:0),z);
          const sub=0.85+0.3*rr(), top=f>0.75?0.6:0.0, gv=rr()<0.12?1:0;
          const cr=(0.40*(1-top)+0.26*top)*sub, cg=(0.29*(1-top)+0.21*top)*sub, cb=(0.19*(1-top)+0.15*top)*sub;
          C.push(gv?0.46:cr,gv?0.44:cg,gv?0.41:cb); } }
      for(let j=0;j<NR;j++) for(let k=0;k<NA;k++){ const a=j*NA+k, b2=j*NA+(k+1)%NA, c2=(j+1)*NA+k, d2=(j+1)*NA+(k+1)%NA; I.push(a,b2,c2,b2,d2,c2); }   // 위를 보게(반지름 × 방위 차례면 아래를 봐 위에서 안 보였다)
      const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setIndex(I); g.computeVertexNormals();
      const m=new THREE.Mesh(g,dirtM); pg.add(m); }
    /* 테 위의 돌 — 그 굴의 바위 */
    { const rm=rockMat(kk[2],0x8a857c), rr=mulberry32((Math.round(p.x*11)^Math.round(p.z*5)^0x5a5a)>>>0);
      for(let k=0;k<11;k++){ const a=rr()*6.283, d=R0+0.5+rr()*2.4, r=0.14+0.30*rr()*rr(), x=p.x+Math.cos(a)*d, z=p.z+Math.sin(a)*d;
        const gg=new THREE.DodecahedronGeometry(r,0), ga=gg.attributes.position;                       // 모난 조각 — 꼭짓점마다 흔들고 납작하게(둥근 알처럼 보였다)
        { const seen=new Map(); for(let i=0;i<ga.count;i++){ const key=Math.round(ga.getX(i)*1e3)+','+Math.round(ga.getY(i)*1e3)+','+Math.round(ga.getZ(i)*1e3); let k=seen.get(key); if(k===undefined){ k=0.72+0.5*rr(); seen.set(key,k); } ga.setXYZ(i,ga.getX(i)*k,ga.getY(i)*k*0.55,ga.getZ(i)*k); } gg.computeVertexNormals(); }
        const s=new THREE.Mesh(gg,rm); s.rotation.set((rr()-0.5)*0.6,rr()*6.283,(rr()-0.5)*0.6);
        s.position.set(x,gH(x,z)+0.36*Math.pow(Math.sin(Math.PI*Math.min(1,(d-R0)/2.3)),0.7)+r*0.12,z); pg.add(s); } }
    const stake=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,1.1,6),wood); stake.position.set(p.x+1.9,p.ys+0.75,p.z); pg.add(stake);
    const L=p.ys-p.yf, rp=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,L+0.9,5),rope); rp.position.set(p.x+0.55,p.ys-L/2+0.45,p.z); pg.add(rp);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.4,5),rope); top.rotation.z=Math.PI/2; top.position.set(p.x+1.2,p.ys+0.9,p.z); pg.add(top);
    /* 굴뚝(속에서 볼 때 — 밧줄을 타는 동안) — 그 굴의 바위 재질 · 안쪽 면 */
    const shaftM=rockMat(kk[2],0x6a665e); shaftM.side=THREE.BackSide;
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.9,D,18,Math.max(1,Math.round(D/2)),true),shaftM);
    { const a=sh.geometry.attributes.position; for(let i=0;i<a.count;i++){ const x=a.getX(i), y=a.getY(i), z=a.getZ(i), an=Math.atan2(z,x), k=1+0.12*Math.sin(y*0.7+an*3)+0.06*Math.sin(y*1.9+an*7+1.3); a.setXYZ(i,x*k,y,z*k); } sh.geometry.computeVertexNormals(); }
    sh.position.set(p.x,p.ys-D/2+0.02,p.z); pg.add(sh);
  }
}
const UNDER_HOLE_L={value:new THREE.Vector3(0.5,0.5,0.5)};   // 구멍 속 빛 — 하늘빛 · 고른 빛의 세기(updateUnder 가 맞춘다)
/* 수직굴 오르내리기 — Space 를 누른 순간 구멍(땅 위) 또는 밧줄(밑) 곁이면 탄다. 타는 동안은 몸 움직임을 대신 맡는다(80-player.js) */
function underRopeTick(dt){
  if(!UNDER.ok) return false;
  const p=PL.pos, spTap=!!keys.jump&&!UNDER.sp0; UNDER.sp0=!!keys.jump;
  const R=UNDER.rope;
  if(R){
    if(R.dir>0){ PL.stam-=7*dt*(1+invLoad()); if(PL.stam<=0){ PL.stam=0; R.dir=-1; R.y0=p.y; R.y1=R.p.yf; R.t=0; R.T=Math.max(1.2,(p.y-R.y1)/9); toast('팔에 힘이 다했다 — 미끄러져 내려간다'); } }
    R.t+=dt; const s=clamp(R.t/R.T,0,1), e=s*s*(3-2*s);
    p.set(R.p.x+0.4,R.y0+(R.y1-R.y0)*e,R.p.z+0.05); PL.vel.set(0,0,0);
    PL.under=p.y<R.p.ys-4;
    camera.position.set(p.x,p.y+PL.eye,p.z); camera.rotation.set(PL.pitch,PL.yaw,0,'YXZ');
    if(s>=1){ UNDER.rope=null;
      if(R.dir>0){ const a=Math.atan2(R.p.rm.z-R.p.z,R.p.rm.x-R.p.x), ax=R.p.x+Math.cos(a)*2.4, az=R.p.z+Math.sin(a)*2.4;
        p.set(ax,((P.tv|0)>=10&&R.p.cave&&R.p.cave.tv===10?cv10Field(R.p.cave,ax,az).f:heightAt(ax,az))+0.05,az); PL.under=false; toast((P.tv|0)>=10?'굴로 올라왔다':'땅 위로 올라왔다'); }   // 판 10 은 굴 바닥에 선다
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
  if(typeof amb!=='undefined'&&amb){ const L=UNDER_HOLE_L.value; L.set(amb.color.r*amb.intensity+hemi.color.r*hemi.intensity*0.6,amb.color.g*amb.intensity+hemi.color.g*hemi.intensity*0.6,amb.color.b*amb.intensity+hemi.color.b*hemi.intensity*0.6).multiplyScalar(1.1); }
  const p=PL.pos;
  if(!UNDER.rope&&!PL.dead) PL.under=!PL.cave&&underIn(p.x,p.z,p.y)&&underQ(p.x,p.z).g>0.2;     // 판 10 굴 속은 땅속 세계가 아니다(굴 밑에 땅속 세계 방이 있어도)
  const inW=PL.under||(UNDER.rope&&p.y<UNDER.rope.p.ys-6);
  const want=inW?1:(PL.caveQ&&!PL.dead?PL.caveQ.deep:0);                                         // 판 10 굴 — 깊을수록 어둡다(입구 거리 deep: 2 m 0 ~ 16 m 1)
  UNDER.u+=(want-UNDER.u)*clamp(dt*(PL.caveQ&&!PL.under?3.2:1.6),0,1); if(Math.abs(UNDER.u-want)<0.002) UNDER.u=want;
  /* 땅속 세계 칸 묶음(UNDER.grp)은 땅속 세계에 있을 때(밧줄 포함)만 — 굴 속에서 u 가 올라도 땅속 세계 칸은 안 짓는다. 땅 위로 올라오는 동안 어둠이 걷히는 사이는 그대로 보인다 */
  if(inW||UNDER.rope) UNDER.wf=true; else if(UNDER.u<=0.01||PL.caveQ) UNDER.wf=false;     // 굴로 올라오면(밧줄 끝) 땅속 세계 칸은 곧바로 숨긴다
  const nearDol=UNDER.dol.some(d=>Math.hypot(d.mx-p.x,d.mz-p.z)<100);           // 함몰 입구 · 바닷가 굴 곁 — 땅 위에서도 굴 속을 그린다(입구로 들여다보인다)
  const u=UNDER.u, show=!!UNDER.rope||(UNDER.wf&&u>0.01)||(nearDol&&!PL.cave);   // 판 10 굴 속에선 땅속 세계를 안 그린다 — 굴과 땅속 방이 겹친 데(17곳)에서 물길 · 바위가 굴 바닥에 비쳤다(2026-11-08 사용자 사진 '굴 바닥의 검은 띠')
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
      if(d<220+c.R+(c.aL||0)&&!has){ const dd=underDeco(c); UNDER.deco.set(c,dd); underPopulate(dd); }   // 입구 굴길이 딸린 방은 굴길 길이만큼 더 멀리서부터
      else if(d>300+c.R+(c.aL||0)&&has){ underUnpopulate(has); underDecoDrop(has); UNDER.deco.delete(c); } }
    UNDER.picks.length=0; for(const d of UNDER.deco.values()) for(const q of d.picks) UNDER.picks.push(q); }
  if(PL.under) underCreatures(dt);
}
/* ── 지도 — 땅속에 있으면 굴 방(원) · 굴길(굵은 선) · 못 · 수직굴(흰 점)을 그린다. 처음 한 번 굽는다(82-hud.js drawMap) ── */
function underMapImg(){
  if(UNDER.map) return UNDER.map;
  const c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'), k=1/CELL, o=N/2;
  g.strokeStyle=g.fillStyle='#5f8e86'; g.lineCap='round';
  for(const t of UNDER.tu){ g.lineWidth=Math.max(1.2,t.w*2*k); g.beginPath(); g.moveTo(t.x0*k+o,t.z0*k+o); g.lineTo(t.x1*k+o,t.z1*k+o); g.stroke(); }
  for(const ch of UNDER.ch){ g.beginPath(); g.arc(ch.x*k+o,ch.z*k+o,Math.max(1.5,ch.R*k),0,6.283); g.fill(); }
  g.fillStyle='#2c6e8a'; for(const ch of UNDER.ch) if(ch.pool&&ch.pr){ g.beginPath(); g.arc(ch.x*k+o,ch.z*k+o,Math.max(1,ch.pr*k),0,6.283); g.fill(); }
  g.fillStyle='#f4f0e0'; for(const p of UNDER.pits){ g.beginPath(); g.arc(p.x*k+o,p.z*k+o,Math.max(1.6,3*k),0,6.283); g.fill(); }
  return UNDER.map=c;
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
