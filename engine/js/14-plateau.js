/* 14-plateau.js — CASTAWAY
   지형 판 11 — **층층 대지 섬**(사용자 요청 2026-11-06)
   '섬은 여러 층의 대지 · 대지마다 바이옴 하나 · 대지는 산에 밑동을 두고 버섯처럼 퍼진다 · 강은 대지에서 대지로 흐른다 ·
    산맥 한가운데 큰 호수가 강과 폭포의 시작 · 산맥은 섬을 가로지른다 · 땅 위의 굴은 없앤다 · 닿기 어려운 데일수록 좋은 것'
   ----------------------------------------------------------------------------
   만드는 차례(섬을 만들 때의 칸 2.5 m · 높이 m — 다 만든 뒤 worldRescale 이 섬 배율만큼 통째로 키운다):
     ① **등뼈**(plSpine) — 섬을 끝에서 끝까지 가로지르는 산맥의 줄기. 바다에서 솟아 바다로 들어간다(양 끝은 곶)
     ② **바탕** — 바닷가의 낮은 들(1~6 m) · 바다
     ③ **대지**(선반) — 등뼈 양쪽에 '더미'를 줄지어 세운다. 더미 하나는 산허리에 밑동을 둔 높은 대지부터 바깥으로 갈수록 낮고 넓은
        대지가 겹겹이 이어진 것이다(나무에 층층이 돋은 구름버섯처럼). 층 높이 7 · 16 · 27 · 39 m(±1.8). 윗면은 판판하고(가운데가 조금
        봉긋한 갓) 가장자리는 벼랑이다. 대지마다 바이옴이 하나(높을수록 침엽수림 · 고산 풀밭 · 너덜 — 낮을수록 활엽수림 · 대숲 · 사바나 · 늪)
     ④ **산** — 등뼈를 따라 솟은 능선(높이 64~95 m · 들쭉날쭉한 마루). 대지의 안쪽은 산허리에 묻힌다(밑동)
     ⑤ **호수 대지**(가운데) — 산맥 한가운데의 가장 높은 대지(53.6 m) · 그 안의 큰 호수(수면 52 m · 반지름 105~135 m) · 호수 가운데 작은 섬.
        등뼈 쪽은 산이 둘러싸고, 옆쪽은 벼랑이다. 둘레 언덕은 물이 넘치는 데(물목)만 비운다
     ⑥ **강** — 호수의 물목 두셋~넷에서 나가 대지 가장자리에서 폭포로 아래 대지에 떨어지고, 그 대지를 굽이쳐 건너 다시 떨어지기를
        거듭하다 낮은 들을 지나 바다로 간다(PLAT.drops — 폭포 자리 · 36-falls.js 가 그린다). 폭포 밑에는 소
     ⑦ **비탈길**(plRamps) — 대지마다 아래층에서 올라오는 너덜 비탈(무너진 돌이 쌓인 길) 하나~둘. 높은 대지일수록 좁고 가파르다
   시드가 정한다(제 난수 — mulberry32(seed^상수)). 판 11 밑의 섬은 이 파일을 안 쓴다(genBase … 예전 길 그대로) */
"use strict";
const PLAT={on:false, sp:[], spLen:0, lake:null, crown:-1, list:[], id:null, ramp:null, drops:[], paths:[], islet:null,
  reach:null, caches:[], looks:[], dens:[], meshes:[], spot:new Set(), seen:new Set(), ws:1, lookT:0};
const PL_TIER=[0,7,16,27,39], PL_LAKE=52;
const ROCKY_BIG={granite:1,basalt:1,karst:1,sandstone:1};   // 벼랑에 남겨도 되는 큰 바위(그 밖의 잔것은 가파른 데서 걷는다)
/* 바이옴마다 습도(대지 윗면 — 식생 · 자원 · 사바나 풀이 읽는다) */
const PL_MOIST=(()=>{ const m=new Float32Array(16).fill(0.45); m[B.SCRUB]=0.14; m[B.MEADOW]=0.42; m[B.BROADLEAF]=0.66; m[B.BAMBOO]=0.72;
  m[B.CONIFER]=0.60; m[B.MARSH]=0.90; m[B.SCREE]=0.30; m[B.ROCK]=0.25; return m; })();
/* 층마다 고를 바이옴(무게) — 높을수록 서늘하다 */
const PL_BIO=[null,
  [[B.SCRUB,3],[B.MEADOW,2],[B.BROADLEAF,2],[B.BAMBOO,1],[B.MARSH,1]],
  [[B.BROADLEAF,2],[B.BAMBOO,2],[B.MEADOW,2],[B.SCRUB,2],[B.MARSH,1],[B.CONIFER,1]],
  [[B.CONIFER,2],[B.BROADLEAF,2],[B.MEADOW,2],[B.BAMBOO,1],[B.SCRUB,1]],
  [[B.CONIFER,3],[B.MEADOW,2],[B.SCREE,1],[B.BROADLEAF,1]]];

/* ── ① 등뼈 ── */
function plSpine(rnd){
  const a=rnd()*Math.PI, ux=Math.cos(a), uz=Math.sin(a), vx=-uz, vz=ux, L=HALF*0.86;
  const A1=(28+rnd()*40)*(rnd()<0.5?-1:1), A2=(8+rnd()*16)*(rnd()<0.5?-1:1), p1=(rnd()-0.5)*1.2, p2=rnd()*6.283, off=(rnd()-0.5)*50;
  const pts=[], K=120;
  for(let k=0;k<=K;k++){ const t=k/K*2-1, o=off+A1*Math.sin(Math.PI*t+p1)+A2*Math.sin(Math.PI*t*2.2+p2);
    pts.push({x:ux*t*L+vx*o, z:uz*t*L+vz*o, s:0}); }
  let s=0; for(let k=1;k<=K;k++){ s+=Math.hypot(pts[k].x-pts[k-1].x,pts[k].z-pts[k-1].z); pts[k].s=s; }
  for(const p of pts) p.s/=s;
  PLAT.sp=pts; PLAT.spLen=s;
}
/* 등뼈의 s(0~1) 자리와 진행 방향(단위) */
function plSpAt(s){
  const Q=PLAT.sp; let k=1; while(k<Q.length-1&&Q[k].s<s) k++;
  const a=Q[k-1], b=Q[k], t=clamp((s-a.s)/Math.max(1e-9,b.s-a.s),0,1), dx=b.x-a.x, dz=b.z-a.z, l=Math.hypot(dx,dz)||1;
  return {x:a.x+dx*t, z:a.z+dz*t, tx:dx/l, tz:dz/l};
}
/* 칸마다 등뼈까지의 거리 D · 가장 가까운 자리 S(0~1) · 어느 쪽 G(±1) */
function plSpineField(){
  const Q=PLAT.sp, D=new Float32Array(N*N).fill(1e12), S=new Float32Array(N*N), G=new Int8Array(N*N), MAXD=380;
  for(let k=0;k<Q.length-1;k++){ const a=Q[k], b=Q[k+1], dx=b.x-a.x, dz=b.z-a.z, L2=dx*dx+dz*dz||1;
    const x0=Math.max(0,Math.floor((Math.min(a.x,b.x)-MAXD)/CELL+N/2)), x1=Math.min(N-1,Math.ceil((Math.max(a.x,b.x)+MAXD)/CELL+N/2));
    const z0=Math.max(0,Math.floor((Math.min(a.z,b.z)-MAXD)/CELL+N/2)), z1=Math.min(N-1,Math.ceil((Math.max(a.z,b.z)+MAXD)/CELL+N/2));
    for(let gz=z0;gz<=z1;gz++){ const z=(gz-N/2)*CELL;
      for(let gx=x0;gx<=x1;gx++){ const x=(gx-N/2)*CELL; let t=((x-a.x)*dx+(z-a.z)*dz)/L2; t=t<0?0:t>1?1:t;
        const px=a.x+dx*t-x, pz=a.z+dz*t-z, d=px*px+pz*pz, i=gz*N+gx;
        if(d<D[i]){ D[i]=d; S[i]=a.s+(b.s-a.s)*t; G[i]=(dx*(z-a.z)-dz*(x-a.x))>0?1:-1; } } } }
  for(let i=0;i<N*N;i++) D[i]=Math.sqrt(D[i]);
  return {D,S,G};
}
const plGi=(x,z)=>clamp(Math.round(z/CELL+N/2),0,N-1)*N+clamp(Math.round(x/CELL+N/2),0,N-1);
const plGx=i=>(i%N-N/2)*CELL, plGz=i=>(((i/N)|0)-N/2)*CELL;

/* ── 섬 만들기(genBase 대신 · 침식 없이) ── */
function genPlateau(seed){
  PLAT.on=true; PLAT.list.length=0; PLAT.drops.length=0; PLAT.paths.length=0; PLAT.islet=null; PLAT.ws=1;
  const rnd=mulberry32((seed^0x9a7ea0)>>>0), E=F.elev;
  const n1=makePerlin(seed), n2=makePerlin(seed^0x9e3779b9), n3=makePerlin(seed^0x85ebca6b);
  const nR=makePerlin((seed^0x51e7)>>>0), nW=makePerlin((seed^0x51e8)>>>0), nC=makePerlin((seed^0x51e9)>>>0), nE=makePerlin((seed^0x51ea)>>>0), nU=makePerlin((seed^0x51eb)>>>0);
  const fbm=(nz,x,z,oct,lac,gain)=>{ let a=1,f=1,s=0,t=0; for(let i=0;i<oct;i++){ s+=nz(x*f,z*f)*a; t+=a; a*=gain; f*=lac; } return s/t; };
  const ridged=(nz,x,z,oct)=>{ let a=1,f=1,s=0,t=0; for(let i=0;i<oct;i++){ s+=(1-Math.abs(nz(x*f,z*f)))*a; t+=a; a*=0.5; f*=2.05; } return s/t; };
  plSpine(rnd);
  const SF=plSpineField(), SD=SF.D, SS=SF.S, SG=SF.G;
  const id=PLAT.id=new Int16Array(N*N).fill(-1), LAND=new Float32Array(N*N);
  const ridgeH=s=>(64+26*Math.pow(Math.sin(Math.PI*s),0.6)+9*nR(s*9.0,0.5));
  const ridgeW=s=>(112+44*Math.sin(Math.PI*s))*(0.88+0.26*(nW(s*7,1.5)*0.5+0.5));
  const endT=s=>smoothstep(0.0,0.09,s)*smoothstep(1.0,0.91,s);
  /* ② 바탕 — 해안선은 genBase 와 같은 결(도메인 휨 · 만) + 산맥이 바다로 뻗는 곶 */
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=z*N+x, nx=(x/(N-1))*2-1, nz=(z/(N-1))*2-1;
    const warp=fbm(n2,nx*1.7+37.1,nz*1.7-19.7,4,2.1,0.5)*0.24, bays=fbm(n3,nx*0.85-8.3,nz*0.85+4.9,2,2.0,0.5)*0.16;
    const d=Math.sqrt(nx*nx+nz*nz)+warp+bays, mask=1-smoothstep(P.size*0.52,P.size*1.48,d);   // 대지가 들어설 자리 — genBase 의 섬보다 조금 넓다
    let land=mask*mask*(3-2*mask);
    const s=SS[i], W=ridgeW(s), cape=(1-smoothstep(W*0.45,W*1.05,SD[i]))*smoothstep(0.0,0.07,s)*smoothstep(1.0,0.93,s);
    land=Math.max(land,cape*0.98); LAND[i]=land;
    const cont=fbm(n1,nx*1.6,nz*1.6,5,2.03,0.5)*0.5+0.5, hill=fbm(n2,nx*7+3.1,nz*7-1.7,3,2.0,0.5);
    const low=2.4+2.6*cont+1.4*hill;
    let e=low*land-(1-land)*26-P.sea;
    const BAND=5; if(e>0&&e<BAND) e=Math.pow(e/BAND,1.6)*BAND;
    if(e<0) e*=1.6;
    E[i]=e;
  }
  const landAt=(x,z)=>LAND[plGi(x,z)];
  /* 바닷가 벼랑(사용자 요청 2026-11-06) — 바닷가 몇 굽이(셋~다섯 · 너비 20~40°)는 낮은 들 대신 바다에서 곧게 솟은 대지(38~64 m)다.
     물가 쪽 금(land 0.86)에서 곧게 서고 · 안쪽(0.95~0.99)으로 낮은 들에 비스듬히 이어진다. 그 밑동에 바닷가 굴이 난다(96-underworld.js) */
  { const nA=3+((rnd()*3)|0), arcs=[];
    for(let k=0;k<nA;k++){ arcs.push({a:rnd()*6.283, w:0.17+rnd()*0.18, H:9+rnd()*6}); }
    PLAT.heads=arcs;
    const angD=(a,b)=>{ let d=Math.abs(a-b)%(2*Math.PI); return d>Math.PI?2*Math.PI-d:d; };
    for(let i=0;i<N*N;i++){ const ld=LAND[i]; if(ld<0.855||ld>0.995) continue;
      const x=plGx(i), z=plGz(i), th=Math.atan2(z,x); let f=0, H=0;
      for(const A of arcs){ const q=1-smoothstep(A.w*0.75,A.w,angD(th,A.a)); if(q>f){ f=q; H=A.H; } }
      if(f<=0) continue;
      const wig=0.012*nE(x*0.035+9,z*0.035-4)+0.006*nE(x*0.11,z*0.11);                // 벼랑 금이 곧지 않게
      const k=smoothstep(0.855+wig,0.872+wig,ld)*(1-smoothstep(0.93,0.995,ld))*f, v=H*(0.75+0.5*(nE(x*0.02+50,z*0.02-20)*0.5+0.5)+0.12*nE(x*0.07,z*0.07))*k+E[i]*(1-k);
      if(v>E[i]) E[i]=v; } }
  /* ⑤ 호수 대지 — 등뼈 가운데 */
  const sL=0.5+(rnd()-0.5)*0.12, Lp=plSpAt(sL), RL=105+rnd()*30, RC=RL+42+rnd()*22, crownTop=PL_LAKE+1.6;
  PLAT.lake={x:Lp.x, z:Lp.z, s:sL, RL, RC, WL:PL_LAKE, tx:Lp.tx, tz:Lp.tz, outs:[]};
  /* 물목(호수에서 물이 넘쳐 나가는 쪽) — 등뼈 옆쪽 둘(양쪽에 하나씩) + 더러 하나둘 더 · 등뼈 방향(산)은 피한다 */
  { const perp=Math.atan2(Lp.tx,-Lp.tz), outs=[];
    for(const sd of [0,Math.PI]){ const c=perp+sd+(rnd()-0.5)*0.4;
      if(rnd()<0.5){ const o=0.42+rnd()*0.16; outs.push(c-o,c+o); } else outs.push(c); }
    PLAT.lake.outs=outs.map(a=>Math.atan2(Math.sin(a),Math.cos(a))); }
  /* ③ 대지 더미 — 등뼈 양쪽 */
  const shelves=[];
  const crownD=(x,z)=>{ const dx=x-Lp.x, dz=z-Lp.z, a=dx*Lp.tx+dz*Lp.tz, b=-dx*Lp.tz+dz*Lp.tx; return Math.hypot(a/1.12,b); };   // 등뼈 방향으로 조금 긴 원
  for(const side of [-1,1]){
    let s=0.10+rnd()*0.04;
    while(s<0.90){
      const Pa=plSpAt(s), nx=-Pa.tz*side, nz=Pa.tx*side, W=ridgeW(s);
      let dist=W*(0.40+rnd()*0.10);
      const nearC=Math.hypot(Pa.x-Lp.x,Pa.z-Lp.z)<RC*1.7;
      if(nearC){ let t=0; while(t<RC*1.6&&crownD(Pa.x+nx*t,Pa.z+nz*t)<RC*1.02) t+=4; dist=Math.max(dist,t-14); }
      const endish=s<0.2||s>0.8;
      let top=nearC?4:endish?(rnd()<0.5?2:3):(rnd()<0.28?3:4);
      for(let t=top;t>=1;t--){
        let R=(46+15*(top-t)+rnd()*32)*(t===1?1.2:1);
        const ex=1.25+rnd()*0.6, lat=(rnd()-0.5)*R*0.5;
        let cx=Pa.x+nx*(dist+R*0.78)+Pa.tx*lat, cz=Pa.z+nz*(dist+R*0.78)+Pa.tz*lat;
        if(landAt(cx+nx*R*0.75,cz+nz*R*0.75)<0.80){ R*=0.68; cx=Pa.x+nx*(dist+R*0.78)+Pa.tx*lat; cz=Pa.z+nz*(dist+R*0.78)+Pa.tz*lat;
          if(landAt(cx+nx*R*0.75,cz+nz*R*0.75)<0.80||R<26) break; }
        shelves.push({x:cx,z:cz,R,ex,ya:Math.atan2(nz,nx),h:PL_TIER[t]+(rnd()-0.5)*3.6,tier:t,side,s,dome:0.8+rnd()*1.3,
                      o1:rnd()*200,o2:rnd()*200,b:-1,nx,nz,ramps:0});
        dist+=R*(0.95+rnd()*0.4);
      }
      s+=(165+rnd()*75)/PLAT.spLen;
    }
  }
  /* 호수 대지는 가장 높은 대지다 */
  shelves.push({x:Lp.x,z:Lp.z,R:RC,ex:1.12,ya:Math.atan2(-Lp.tx,Lp.tz)/*등뼈의 수직 — 아래 R 은 그쪽 반지름*/,h:crownTop,tier:5,side:0,s:sL,dome:0.4,
                o1:rnd()*200,o2:rnd()*200,b:B.MEADOW,nx:0,nz:0,ramps:0,crown:1});
  /* 바이옴 — 층마다 무게로 뽑되 겹치거나 맞닿은 대지와는 다르게 */
  shelves.forEach((S,j)=>{ if(S.b>=0) return;
    const opts=PL_BIO[S.tier], near=shelves.filter((q,k)=>k!==j&&q.b>=0&&Math.hypot(q.x-S.x,q.z-S.z)<(q.R*q.ex+S.R*S.ex)*0.85).map(q=>q.b);
    let tot=0; const w=opts.map(([b,v])=>{ const ww=near.indexOf(b)>=0?v*0.08:v; tot+=ww; return ww; });
    let r=rnd()*tot, k=0; for(;k<opts.length-1;k++){ r-=w[k]; if(r<=0) break; } S.b=opts[k][0]; });
  /* 대지를 낮은 것부터 얹는다 — 가장자리는 벼랑(EW m 에 걸쳐 아래 땅으로) */
  const order=shelves.map((S,j)=>j).sort((a,b)=>shelves[a].h-shelves[b].h);
  const EW=6.5;
  for(const j of order){ const S=shelves[j], c=Math.cos(S.ya), sn=Math.sin(S.ya), Rb=S.R*S.ex*1.3;
    const x0=Math.max(1,Math.floor((S.x-Rb)/CELL+N/2)), x1=Math.min(N-2,Math.ceil((S.x+Rb)/CELL+N/2)), z0=Math.max(1,Math.floor((S.z-Rb)/CELL+N/2)), z1=Math.min(N-2,Math.ceil((S.z+Rb)/CELL+N/2));
    for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const i=gz*N+gx, x=(gx-N/2)*CELL, z=(gz-N/2)*CELL, dx=x-S.x, dz=z-S.z;
      const a=dx*c+dz*sn, b=-dx*sn+dz*c, r0=Math.hypot(a/S.R,b/(S.R*S.ex));
      if(r0>1.35) continue;
      const r=r0*(1+0.13*nE(x*0.021+S.o1,z*0.021+S.o2)+0.06*nE(x*0.06-S.o2,z*0.06+S.o1));
      if(r>=1) continue;
      if(!S.crown&&LAND[i]<0.55) continue;                                       // 바다 위엔 안 선다
      /* 바닷가 쪽은 곧은 벽으로 자르지 않고 해변으로 비스듬히 내려선다(2026-11-06 사용자 사진 — 바닷가에 둑 같은 곧은 벽이 섰다) */
      const w=(1-smoothstep(1-EW/S.R,1,r))*(S.crown?1:smoothstep(0.62,0.86,LAND[i]));
      const top=S.h+S.dome*(1-r*r)+0.55*fbm(nU,x*0.022+S.o1,z*0.022,3,2.0,0.5);
      if(top<=E[i]) continue;
      E[i]=E[i]+(top-E[i])*w;
      if(w>0.5) id[i]=j; } }
  /* ④ 산 — 등뼈를 따라 · 호수 둘레에서는 호수 대지 높이로 누른다 */
  let rimS=0;
  for(let i=0;i<N*N;i++){ const s=SS[i], W=ridgeW(s), d=SD[i]; if(d>=W) continue;
    const x=plGx(i), z=plGz(i), u=1-d/W, rg=ridged(nC,x*0.011,z*0.011,4);
    let m=ridgeH(s)*endT(s)*Math.pow(u,1.3)+20*(rg-0.62)*u*u+5*fbm(n3,x*0.03,z*0.03,3,2.0,0.5)*u;
    const dl=Math.hypot(x-Lp.x,z-Lp.z), fc=smoothstep(RL*1.05,RC*1.45,dl), cap=crownTop+2;
    if(m>cap) m=cap+(m-cap)*fc;
    if(m>E[i]+0.3){ if(m>E[i]+0.6) id[i]=-2; E[i]=m; if(m>rimS) rimS=m; } }
  /* 호수 대지 둘레의 언덕 — 물목만 비운다 */
  { const L=PLAT.lake, angD=(a,b)=>{ let d=Math.abs(a-b)%(2*Math.PI); return d>Math.PI?2*Math.PI-d:d; };
    const ext=RC*1.25;
    for(let gz=Math.floor((Lp.z-ext)/CELL+N/2);gz<=Math.ceil((Lp.z+ext)/CELL+N/2);gz++) for(let gx=Math.floor((Lp.x-ext)/CELL+N/2);gx<=Math.ceil((Lp.x+ext)/CELL+N/2);gx++){
      if(gx<1||gz<1||gx>N-2||gz>N-2) continue; const i=gz*N+gx, x=plGx(i), z=plGz(i), dx=x-Lp.x, dz=z-Lp.z, r=crownD(x,z), th=Math.atan2(dz,dx);
      const cth=Math.cos(th), sth=Math.sin(th), R0=RC*(0.90+0.10*nE(cth*1.7+2.2,sth*1.7+5.5)), Rw=18+14*(nE(cth*2.9-3.1,sth*2.9+0.7)*0.5+0.5);
      const u=Math.abs(r-R0)/Rw; if(u>=1) continue;
      let gap=1; for(const o of L.outs) gap=Math.min(gap,smoothstep(0.22,0.55,angD(th,o)));
      const hh=(3+19*Math.pow(nE(cth*3.1+4.1,sth*3.1-1.3)*0.5+0.5,1.6)+6*nE(x*0.05,z*0.05))*gap; if(hh<0.3) continue;
      const v=crownTop+hh*(1-u*u)*(1-u*u); if(v>E[i]){ E[i]=v; } } }
  /* 호수 — 물가는 0.18 의 비탈로 · 가운데 13 m 깊이 */
  const L=PLAT.lake, R=F.river, Wl=F.wlev; R.fill(0); Wl.fill(0);
  const RLa=th=>RL*(1+0.10*nE(Math.cos(th)*1.3+9.1,Math.sin(th)*1.3-2.2));
  { const ext=RL*1.35+16;
    for(let gz=Math.floor((Lp.z-ext)/CELL+N/2);gz<=Math.ceil((Lp.z+ext)/CELL+N/2);gz++) for(let gx=Math.floor((Lp.x-ext)/CELL+N/2);gx<=Math.ceil((Lp.x+ext)/CELL+N/2);gx++){
      if(gx<1||gz<1||gx>N-2||gz>N-2) continue; const i=gz*N+gx, x=plGx(i), z=plGz(i), dx=x-Lp.x, dz=z-Lp.z, r=Math.hypot(dx,dz), rl=RLa(Math.atan2(dz,dx));
      if(r<rl){ const q=r/rl, fl=PL_LAKE-(2.5+10.5*(1-q*q)); E[i]=Math.min(E[i],fl); }
      else if(r<rl+16+40){ const v=PL_LAKE-0.3+Math.min(r-rl,16)*0.18+Math.max(0,r-rl-16)*0.9; if(E[i]>v) E[i]=v; } } }   // 16 m 뒤로는 가파른 비탈(0.9)로 — 예전엔 거기서 곧은 벽이 서서 칸 모양 톱니가 졌다(2026-11-08 사용자 사진 · 호수 물가)
  /* 호수 가운데 작은 섬(헤엄쳐 가야 한다) */
  { const a=rnd()*6.283, d=RL*(0.18+rnd()*0.25), ix=Lp.x+Math.cos(a)*d, iz=Lp.z+Math.sin(a)*d, ri=10+rnd()*6;
    /* 물가는 완만하게(1~2.4 ri 에 걸쳐 5 m) — 예전엔 0.6 ri 에 4 m 를 떨어져 물속 비탈이 칸 모양 톱니로 비쳤다(2026-11-08 사용자 사진 '호수 섬과 물이 만나는 데가 들쭉날쭉') */
    for(let gz=Math.floor((iz-ri*2.4)/CELL+N/2);gz<=Math.ceil((iz+ri*2.4)/CELL+N/2);gz++) for(let gx=Math.floor((ix-ri*2.4)/CELL+N/2);gx<=Math.ceil((ix+ri*2.4)/CELL+N/2);gx++){
      const i=gz*N+gx, r=Math.hypot(plGx(i)-ix,plGz(i)-iz)/ri; if(r>=2.4) continue;
      const v=r<1?PL_LAKE+0.6+2.6*(1-r*r):PL_LAKE+0.6-7.0*smoothstep(1,1.7,r); if(v>E[i]) E[i]=v; }   // 물가는 무르게 넘고(물금 둘레) 물 밑은 곧 깊어진다(얕은 띠가 넓으면 칸 모양이 비쳤다)
    PLAT.islet={x:ix,z:iz,r:ri}; }
  /* 물 — 호수 가운데에서 수면보다 낮은 칸을 이어 채운다(벼랑 밖의 낮은 대지까지 물이 번지지 않게) */
  { const q=[plGi(Lp.x,Lp.z)], seen=new Uint8Array(N*N), Rm=RL*1.4+18; seen[q[0]]=1;
    const LM=PLAT.lakeM=new Uint8Array(N*N);                                     // 호수 칸 — 물 판이 수면을 판판하게 그린다(20-terrain.js buildWater)
    while(q.length){ const i=q.pop(); if(E[i]>=PL_LAKE-0.02) continue; R[i]=1; Wl[i]=PL_LAKE; LM[i]=1;
      for(const o of [-1,1,-N,N]){ const k=i+o; if(k<0||k>=N*N||seen[k]) continue; seen[k]=1; if(Math.hypot(plGx(k)-Lp.x,plGz(k)-Lp.z)<Rm) q.push(k); } } }
  /* 호수 둘레의 벼랑을 무르게(2026-11-08 사용자 사진 — 호수 물가가 칸 모양 톱니) — 격자(2.5 m)에서 몇 m 씩 뚝 떨어지는 벼랑이 비스듬히 지나면 칸마다 계단이 섰다.
     호수 칸이 아닌 데서 이웃과 2.5 m 넘게 다른 칸만 3×3 평균으로 두 번 · 물보다 높던 칸은 물 위에 남긴다(새 웅덩이가 안 생기게) */
  { const LM=PLAT.lakeM, ext=RL*1.6+24, x0=Math.max(1,Math.floor((Lp.x-ext)/CELL+N/2)), x1=Math.min(N-2,Math.ceil((Lp.x+ext)/CELL+N/2)), z0=Math.max(1,Math.floor((Lp.z-ext)/CELL+N/2)), z1=Math.min(N-2,Math.ceil((Lp.z+ext)/CELL+N/2));
    for(let pass=0;pass<2;pass++){ const T=new Map();
      for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const i=gz*N+gx; if(LM[i]||Math.hypot(plGx(i)-Lp.x,plGz(i)-Lp.z)>ext) continue;
        let mx=0, sm=0; for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const v=E[i+dz*N+dx]; sm+=v; mx=Math.max(mx,Math.abs(v-E[i])); }
        if(mx>2.5){ let v=sm/9; if(E[i]>=PL_LAKE) v=Math.max(v,PL_LAKE+0.05); T.set(i,v); } }
      for(const [i,v] of T) E[i]=v; } }
  PLAT.list=shelves; PLAT.crown=shelves.length-1;
  /* 뭍 안의 바닷물 웅덩이를 메운다(2026-11-06 사용자 사진 — 모래벌 한가운데 파도 거품이 둘린 바닷물 못): 바다(가장자리에서 이어진 0 m 밑)에 닿지 않는
     0 m 밑 칸은 0.4~0.9 m 로 올린다(낮은 들의 얕은 움푹이 해수면 밑으로 내려가 있었다) */
  { const sea=new Uint8Array(N*N), q=[]; for(let k=0;k<N;k++) for(const i of [k,(N-1)*N+k,k*N,k*N+N-1]) if(E[i]<=0&&!sea[i]){ sea[i]=1; q.push(i); }
    while(q.length){ const i=q.pop(), gx=i%N; for(const o of [-1,1,-N,N]){ const k=i+o; if(k<0||k>=N*N||sea[k]) continue; if((o===-1&&gx===0)||(o===1&&gx===N-1)) continue; if(E[k]<=0){ sea[k]=1; q.push(k); } } }
    let filled=0; for(let i=0;i<N*N;i++) if(E[i]<=0&&!sea[i]&&!R[i]){ E[i]=0.4+0.5*(nE(plGx(i)*0.05,plGz(i)*0.05)*0.5+0.5); filled++; }
    PLAT.filled=filled; }
  /* ⑥ 강 · ⑦ 비탈길 */
  plRivers(mulberry32((seed^0x9a7ea1)>>>0));
  plRamps(mulberry32((seed^0x9a7ea2)>>>0));
  plFlow();
  PLAT.LAND=LAND;
}

/* 그 칸이 대지 j 의 벼랑 끝인가 — 두 칸 안에 4 m 넘게 낮은 칸이 있다 */
function plRimCell(i,drop){ const E=F.elev, e=E[i], gx=i%N, gz=(i/N)|0; if(gx<3||gz<3||gx>N-4||gz>N-4) return false;
  for(let dz=-2;dz<=2;dz++) for(let dx=-2;dx<=2;dx++){ if(!dx&&!dz) continue; if(E[i+dz*N+dx]<e-drop) return true; } return false; }
/* 아래로 떨어질 자리 — p 에서 dir 로 가며 물높이 w 보다 3 m 낮아지고 비탈이 누그러진 데 */
function plLanding(px,pz,dx,dz,w){
  const E=F.elev; let below=false;
  for(let t=1.5;t<160;t+=1.25){ const x=px+dx*t, z=pz+dz*t, i=plGi(x,z), e=E[i];
    if(e<=0.25) return {x,z,sea:true,i};
    if(e<w-3) below=true;
    if(below){ const ex=E[plGi(x+2.5,z)]-E[plGi(x-2.5,z)], ez=E[plGi(x,z+2.5)]-E[plGi(x,z-2.5)];
      if(Math.hypot(ex,ez)/5<0.33){ const lx=x+dx*3, lz=z+dz*3; return {x:lx,z:lz,i:plGi(lx,lz),sea:false}; } } }
  return null;
}
/* 강물을 판다 — pts: [{x,z,w}] · hw 반폭 */
function plCarve(pts,hw){
  const E=F.elev, R=F.river, Wl=F.wlev, ext=hw+9;
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; for(const p of pts){ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); z0=Math.min(z0,p.z); z1=Math.max(z1,p.z); }
  const gx0=Math.max(1,Math.floor((x0-ext)/CELL+N/2)), gx1=Math.min(N-2,Math.ceil((x1+ext)/CELL+N/2)), gz0=Math.max(1,Math.floor((z0-ext)/CELL+N/2)), gz1=Math.min(N-2,Math.ceil((z1+ext)/CELL+N/2));
  for(let gz=gz0;gz<=gz1;gz++) for(let gx=gx0;gx<=gx1;gx++){ const i=gz*N+gx, x=(gx-N/2)*CELL, z=(gz-N/2)*CELL;
    let bd=1e18, bw=0;
    for(let k=0;k<pts.length-1;k++){ const a=pts[k], b=pts[k+1], dx=b.x-a.x, dz=b.z-a.z, L2=dx*dx+dz*dz||1; let t=((x-a.x)*dx+(z-a.z)*dz)/L2; t=t<0?0:t>1?1:t;
      const qx=a.x+dx*t-x, qz=a.z+dz*t-z, d=qx*qx+qz*qz; if(d<bd){ bd=d; bw=a.w+(b.w-a.w)*t; } }
    const d=Math.sqrt(bd); if(d>=ext) continue;
    if(d<hw){ const bed=bw-0.85*(1-(d/hw)*(d/hw))-0.15; if(bed<E[i]) E[i]=bed; R[i]=1; Wl[i]=Wl[i]>0?Math.min(Wl[i],bw):bw; continue; }
    if(R[i]) continue;
    const v=bw+0.3+(d-hw)*0.45; if(E[i]>v&&E[i]<bw+14) E[i]=v;                   // 골 — 둑에서 0.45 의 비탈로 올라간다(대지 윗면까지)
    else if(d<hw+2.5&&E[i]<bw+0.2&&E[i]>bw-2.5) E[i]=bw+0.2; }                  // 둑 — 물이 넘쳐 보이지 않게
}
/* 소 — 폭포가 떨어지는 웅덩이 */
function plPool(x,z,r,w){
  const E=F.elev, R=F.river, Wl=F.wlev;
  for(let gz=Math.floor((z-r-3)/CELL+N/2);gz<=Math.ceil((z+r+3)/CELL+N/2);gz++) for(let gx=Math.floor((x-r-3)/CELL+N/2);gx<=Math.ceil((x+r+3)/CELL+N/2);gx++){
    if(gx<1||gz<1||gx>N-2||gz>N-2) continue; const i=gz*N+gx, d=Math.hypot(plGx(i)-x,plGz(i)-z);
    if(d<r){ const bed=w-0.4-1.8*(1-(d/r)*(d/r)); if(bed<E[i]) E[i]=bed; R[i]=1; Wl[i]=Wl[i]>0?Math.min(Wl[i],w):w; }
    else if(d<r+3&&!R[i]&&E[i]<w+0.2) E[i]=w+0.2; }
}
/* 물높이 — 길을 따라 둘레 땅(반폭 안의 가장 낮은 데) − 0.55 를 넘지 않고 내려가기만 */
function plWl(pts,hw,w0){
  const E=F.elev; let w=w0;
  for(let l=0;l<pts.length;l++){ const p=pts[l], q=pts[Math.min(pts.length-1,l+1)], r=pts[Math.max(0,l-1)], dx=q.x-r.x, dz=q.z-r.z, dl=Math.hypot(dx,dz)||1, nx=-dz/dl, nz=dx/dl;
    /* 이미 판 물(소 · 다른 강)은 땅으로 안 친다 — 소를 판 뒤에 재면 소 바닥을 따라 물높이가 3 m 꺼졌다(물이 둑 밑에 숨어 마른 도랑으로 보였다) */
    let lo=1e9; for(const s of [0,-1,1]){ const k=plGi(p.x+nx*s*hw*0.7,p.z+nz*s*hw*0.7); if(!F.river[k]) lo=Math.min(lo,E[k]); }
    w=lo<1e9?Math.min(w-0.004*CELL,lo-0.55):w-0.004*CELL; p.w=w; }
  return w;
}
/* 대지 j 에서 바깥(od)으로 떨어질 벼랑 끝 — 이미 흐르는 강 곁은 피한다 */
function plExit(j,fx,fz,odx,odz,rnd){
  const S=PLAT.list[j], E=F.elev, id=PLAT.id, Rb=S.R*S.ex*1.3;
  const gx0=Math.max(3,Math.floor((S.x-Rb)/CELL+N/2)), gx1=Math.min(N-4,Math.ceil((S.x+Rb)/CELL+N/2)), gz0=Math.max(3,Math.floor((S.z-Rb)/CELL+N/2)), gz1=Math.min(N-4,Math.ceil((S.z+Rb)/CELL+N/2));
  let best=-1e9, bi=-1;
  for(let gz=gz0;gz<=gz1;gz+=1) for(let gx=gx0;gx<=gx1;gx+=1){ const i=gz*N+gx; if(id[i]!==j||F.river[i]) continue;
    const x=plGx(i), z=plGz(i), vx=x-fx, vz=z-fz, d=Math.hypot(vx,vz); if(d<S.R*0.45) continue;
    if(!plRimCell(i,4)) continue;
    /* 벼랑 너머(바깥으로 14 m)가 뭍이어야 — 바다로 곧장 떨어지는 것은 덜 고른다 */
    const ox=x-S.x, oz=z-S.z, ol=Math.hypot(ox,oz)||1, qi=plGi(x+ox/ol*14,z+oz/ol*14);
    let sc=(vx*odx+vz*odz)/d*1.0+(ox*odx+oz*odz)/ol*0.6+d/(S.R*2)*0.3+rnd()*0.25;
    if(E[qi]<=0.3) sc-=0.5; const lj=id[qi]; if(lj>=0&&PLAT.list[lj].h<S.h-3) sc+=0.35;
    if(sc>best){ best=sc; bi=i; } }
  return bi;
}
/* 굽이 — a→b 를 대지 j 안에서 사인 굽이로(밖으로 나가면 굽이를 줄인다) */
function plMeander(ax,az,bx,bz,j,hw,rnd){
  const L=Math.hypot(bx-ax,bz-az), n=Math.max(4,Math.ceil(L/3)), px=-(bz-az)/(L||1), pz=(bx-ax)/(L||1), id=PLAT.id;
  let A=Math.min(L*0.22,40)*(rnd()<0.5?-1:1); const ph=rnd()*6.283, fq=1.6+rnd()*1.4;
  for(let tr=0;tr<4;tr++){ const pts=[]; let ok=true;
    for(let k=0;k<=n;k++){ const t=k/n, o=A*Math.sin(Math.PI*t)*Math.sin(fq*Math.PI*t+ph), x=ax+(bx-ax)*t+px*o, z=az+(bz-az)*t+pz*o;
      if(j>=0&&k>1&&k<n-1){ const i=plGi(x,z); if(id[i]!==j&&!F.river[i]) ok=false; }
      pts.push({x,z,w:0}); }
    if(ok||tr===3) return pts; A*=0.45; }
}
/* 낮은 들 · 산허리 — 바다까지 내려간다(가장 가파른 내리막 · 판판하면 바다까지 거리가 줄어드는 쪽) */
function plDescend(sx,sz,w0,D2S){
  const E=F.elev, R=F.river, cells=[]; let i=plGi(sx,sz), w=w0; const seen=new Set();
  for(let st=0;st<900;st++){ cells.push(i); seen.add(i); if(E[i]<=0.2) break;
    if(st>3&&R[i]&&F.wlev[i]<=w+0.3) break;                                     // 다른 강에 합친다
    let nb=-1, be=E[i], bd=D2S[i];
    for(const o of [-1,1,-N,N,-N-1,-N+1,N-1,N+1]){ const k=i+o; if(seen.has(k)) continue; if(E[k]<be-0.05){ be=E[k]; nb=k; } }
    if(nb<0) for(const o of [-1,1,-N,N,-N-1,-N+1,N-1,N+1]){ const k=i+o; if(seen.has(k)||E[k]>E[i]+1.2) continue; if(D2S[k]<bd){ bd=D2S[k]; nb=k; } }
    if(nb<0) break; i=nb; }
  /* 칸 길을 고르게(이동 평균) */
  const pts=[]; for(let k=0;k<cells.length;k+=2){ let sx2=0,sz2=0,n=0; for(let q=Math.max(0,k-3);q<=Math.min(cells.length-1,k+3);q++){ sx2+=plGx(cells[q]); sz2+=plGz(cells[q]); n++; } pts.push({x:sx2/n,z:sz2/n,w:0}); }
  if(pts.length<2) return null;
  pts[0].x=sx; pts[0].z=sz;
  return pts;
}
function plRivers(rnd){
  const L=PLAT.lake, E=F.elev, id=PLAT.id;
  /* 바다까지의 거리(칸) — 낮은 들에서 길을 잃지 않게 */
  const D2S=new Float32Array(N*N).fill(1e9), q=new Int32Array(N*N); let qh=0, qt=0;
  for(let i=0;i<N*N;i++) if(E[i]<=0){ D2S[i]=0; q[qt++]=i; }
  while(qh<qt){ const i=q[qh++], gx=i%N; for(const o of [-1,1,-N,N]){ const k=i+o; if(k<0||k>=N*N) continue; if((o===-1&&gx===0)||(o===1&&gx===N-1)) continue; if(D2S[k]>D2S[i]+1){ D2S[k]=D2S[i]+1; q[qt++]=k; } } }
  for(const th of L.outs){
    const dx=Math.cos(th), dz=Math.sin(th);
    /* 호수 → 호수 대지 끝(물목) — 수면 그대로 */
    let t=L.RL*0.7; while(t<L.RC*1.6&&F.river[plGi(L.x+dx*t,L.z+dz*t)]) t+=1.5;          // 물가
    while(t<L.RC*1.6){ const k=plGi(L.x+dx*t,L.z+dz*t); if(id[k]!==PLAT.crown&&!F.river[k]||E[k]<PL_LAKE-3) break; t+=1.5; }   // 호수 대지의 끝
    const ex=L.x+dx*(t-2.5), ez=L.z+dz*(t-2.5), hw=4.6;
    const p0=[{x:L.x+dx*L.RL*0.8,z:L.z+dz*L.RL*0.8,w:PL_LAKE},{x:ex,z:ez,w:PL_LAKE-0.05}];
    plCarve(p0,hw); PLAT.paths.push({pts:p0,hw});
    let cx=ex, cz=ez, w=PL_LAKE-0.05, odx=dx, odz=dz, hwc=hw, from=PLAT.crown;
    for(let step=0;step<14;step++){
      const ld=plLanding(cx,cz,odx,odz,w); if(!ld) break;
      if(ld.sea){ PLAT.drops.push({x0:cx,z0:cz,w0:w,x1:ld.x,z1:ld.z,w1:0.2,hw:hwc,sea:1,from}); break; }
      const li=ld.i, j=id[li], wp=Math.min(E[li],E[plGi(ld.x+3,ld.z)],E[plGi(ld.x-3,ld.z)],E[plGi(ld.x,ld.z+3)],E[plGi(ld.x,ld.z-3)])-0.6;
      if(F.river[li]&&F.wlev[li]<w-2){ PLAT.drops.push({x0:cx,z0:cz,w0:w,x1:ld.x,z1:ld.z,w1:F.wlev[li],hw:hwc,from,join:1}); break; }   // 다른 강에 떨어진다
      const rp=Math.max(4.5,hwc*1.15);
      plPool(ld.x,ld.z,rp,wp);
      PLAT.drops.push({x0:cx,z0:cz,w0:w,x1:ld.x,z1:ld.z,w1:wp,hw:hwc,rp,from});
      hwc=Math.max(3.4,hwc*0.94);
      if(j>=0&&!PLAT.list[j].crown){
        const S=PLAT.list[j], ox=ld.x-L.x, oz=ld.z-L.z, ol=Math.hypot(ox,oz)||1;
        const xi=plExit(j,ld.x,ld.z,(ox/ol+S.nx)*0.5,(oz/ol+S.nz)*0.5,rnd);
        if(xi>=0){ const bx=plGx(xi), bz=plGz(xi), pts=plMeander(ld.x,ld.z,bx,bz,j,hwc,rnd);
          w=plWl(pts,hwc,wp); plCarve(pts,hwc); PLAT.paths.push({pts,hw:hwc}); S.river=1;
          const sx=bx-S.x, sz=bz-S.z, sl=Math.hypot(sx,sz)||1, tx=bx-pts[pts.length-2].x, tz=bz-pts[pts.length-2].z, tl=Math.hypot(tx,tz)||1;
          odx=sx/sl*0.6+tx/tl*0.4; odz=sz/sl*0.6+tz/tl*0.4; const ol2=Math.hypot(odx,odz)||1; odx/=ol2; odz/=ol2;
          cx=bx; cz=bz; from=j; continue; } }
      /* 낮은 들(또는 산허리)이다 — 바다까지 */
      const pts=plDescend(ld.x,ld.z,wp,D2S);
      if(pts){ plWl(pts,hwc,wp); pts[pts.length-1].w=Math.min(pts[pts.length-1].w,0.2); plCarve(pts,hwc); PLAT.paths.push({pts,hw:hwc}); }
      break;
    }
  }
}
/* ⑦ 비탈길 — 대지마다 아래층에서 올라오는 너덜 비탈. 강 · 폭포 · 다른 비탈 곁은 피한다 */
function plRamps(rnd){
  const E=F.elev, id=PLAT.id, RM=PLAT.ramp=new Uint8Array(N*N), placed=[];
  PLAT.list.forEach((S,j)=>{
    const want=S.crown?2:S.tier===1?2:S.tier===2?(rnd()<0.5?2:1):1;
    const g=S.crown?0.92:S.tier>=4?0.78:S.tier===3?0.62:0.50, wR=S.crown?3.4:S.tier>=4?4.2:S.tier===3?5:6;
    const Rb=S.R*S.ex*1.3, cand=[];
    const gx0=Math.max(4,Math.floor((S.x-Rb)/CELL+N/2)), gx1=Math.min(N-5,Math.ceil((S.x+Rb)/CELL+N/2)), gz0=Math.max(4,Math.floor((S.z-Rb)/CELL+N/2)), gz1=Math.min(N-5,Math.ceil((S.z+Rb)/CELL+N/2));
    for(let gz=gz0;gz<=gz1;gz+=2) for(let gx=gx0;gx<=gx1;gx+=2){ const i=gz*N+gx; if(id[i]!==j||F.river[i]||!plRimCell(i,3)) continue;
      const x=plGx(i), z=plGz(i), ox=x-S.x, oz=z-S.z, ol=Math.hypot(ox,oz)||1, qi=plGi(x+ox/ol*16,z+oz/ol*16);
      if(E[qi]<0.8||E[qi]>E[i]-3) continue;
      if(PLAT.drops.some(d=>Math.hypot(d.x0-x,d.z0-z)<40||Math.hypot(d.x1-x,d.z1-z)<30)) continue;
      if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<45)) continue;
      cand.push([i,ox/ol,oz/ol]); }
    for(let k=cand.length-1;k>0;k--){ const r=(rnd()*(k+1))|0, t=cand[k]; cand[k]=cand[r]; cand[r]=t; }
    let got=0;
    for(const [i,nx,nz] of cand){ if(got>=want) break; const x=plGx(i), z=plGz(i); if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<60)) continue;
      const turn=(rnd()<0.5?-1:1)*(0.45+rnd()*0.35), dx=nx*Math.cos(turn)-nz*Math.sin(turn), dz=nx*Math.sin(turn)+nz*Math.cos(turn);
      const top=E[i]+0.2, sx=x-nx*2.5, sz=z-nz*2.5;
      /* 길이 — 아래 땅에 닿을 때까지 */
      let Lr=0; for(let u=4;u<140;u+=1.5){ const lo=E[plGi(sx+dx*u,sz+dz*u)]; if(lo<=0.3){ Lr=-1; break; } if(top-g*u<=lo+0.2){ Lr=u; break; } }
      if(Lr<=0) continue;
      /* 길 위에 강이 있으면 안 된다 */
      let wet=false; for(let u=0;u<=Lr&&!wet;u+=2){ for(const o of [-wR,0,wR]){ const k=plGi(sx+dx*u-dz*o,sz+dz*u+dx*o); if(F.river[k]){ wet=true; break; } } }
      if(wet) continue;
      const ext=wR+Math.max(4,(top-E[plGi(sx+dx*Lr,sz+dz*Lr)])/1.1)+3, ax=sx, az=sz, bx=sx+dx*Lr, bz=sz+dz*Lr;
      const gx0=Math.max(1,Math.floor((Math.min(ax,bx)-ext)/CELL+N/2)), gx1=Math.min(N-2,Math.ceil((Math.max(ax,bx)+ext)/CELL+N/2)), gz0=Math.max(1,Math.floor((Math.min(az,bz)-ext)/CELL+N/2)), gz1=Math.min(N-2,Math.ceil((Math.max(az,bz)+ext)/CELL+N/2));
      for(let gz=gz0;gz<=gz1;gz++) for(let gx=gx0;gx<=gx1;gx++){ const k=gz*N+gx; if(F.river[k]) continue; const px=plGx(k)-ax, pz=plGz(k)-az, u=px*dx+pz*dz;
        if(u<-1||u>Lr+1) continue; const lat=Math.abs(-px*dz+pz*dx), hr=top-g*clamp(u,0,Lr), v=hr-Math.max(0,lat-wR)*1.1;
        if(v>E[k]+0.05){ E[k]=v; RM[k]=lat<wR+1?1:2; } }
      placed.push({x,z}); S.ramps++; got++; }
  });
}
/* 흐름 누적(F.flow) — 지형습윤지수 · 협곡이 읽는다. 강은 위에서 판 것 그대로 */
function plFlow(){
  const h=F.elev; F.flow.fill(1);
  const arr=new Uint32Array(N*N); for(let i=0;i<N*N;i++) arr[i]=i;
  const ord=Array.from(arr).sort((a,b)=>h[b]-h[a]);
  const dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1], dl=[1,1,1,1,1.414,1.414,1.414,1.414];
  for(const i of ord){ const x=i%N, z=(i/N)|0; if(x<1||z<1||x>=N-1||z>=N-1||h[i]<=0) continue;
    let best=-1, bs=0; for(let k=0;k<8;k++){ const j=i+dn[k], sl=(h[i]-h[j])/dl[k]; if(sl>bs){ bs=sl; best=j; } }
    if(best>=0) F.flow[best]+=F.flow[i]; }
  let c=0; for(let i=0;i<N*N;i++) if(F.river[i]) c++; stats.riverCells=c;
}
/* 바이옴 — 대지는 제 바이옴 · 벼랑은 바위 · 산은 높이로 · 낮은 들은 바닷가 규칙과 습도로 */
function classifyPlateau(){
  const h=F.elev, s=F.slope, m=F.moist, b=F.biome, id=PLAT.id, RM=PLAT.ramp;
  let peak=0; for(let i=0;i<N*N;i++) if(h[i]>peak) peak=h[i];
  const HI=Math.max(30,peak), cells=[];
  for(let i=0;i<N*N;i++) if(h[i]>0) cells.push(s[i]);
  cells.sort((a,b)=>a-b); const rockSlope=cells.length?cells[Math.floor(cells.length*0.87)]:1;
  const seedH=hashStr(String(P.seed))&0xffff;
  let land=0, coast=0;
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ const i=z*N+x, e=h[i];
    if(e<=0){ b[i]=e<-12?B.DEEP:B.SHELF; continue; }
    land++; if(F.dWater[i]<=6) coast++;
    if(F.fuma[i]>0.28&&!F.river[i]){ b[i]=B.FUMAROLE; continue; }
    if(F.river[i]){ b[i]=B.RIVER; continue; }
    const sl=s[i], j=id[i];
    if(RM&&RM[i]){ b[i]=B.SCREE; continue; }
    if(sl>1.05){ b[i]=e>HI*0.62?B.SCREE:B.ROCK; continue; }                    // 벼랑
    if(j>=0){ const S=PLAT.list[j]; b[i]=S.b; if(sl>0.7) b[i]=B.ROCK;
      m[i]=clamp(PL_MOIST[S.b]+0.06*SHP.vn3(x*0.05,z*0.05,2.3,seedH),0,1);
      continue; }
    if(j===-2){                                                                     // 산
      if(e>HI*0.80) b[i]=B.SCREE; else if(sl>0.75) b[i]=B.ROCK;
      else if(e>HI*0.60) b[i]=SHP.vn3(x*0.04,z*0.04,1.1,seedH)>0.1?B.SCREE:B.ROCK;
      else b[i]=e>HI*0.42?B.CONIFER:m[i]>0.5?B.BROADLEAF:B.CONIFER;
      continue; }
    /* 낮은 들 — 바닷가 규칙은 classify 와 같다 */
    if(e<1.8&&sl<0.08&&F.dWater[i]<=8&&SHP.vn3(x*0.045,z*0.045,0.5,seedH)>0.18) b[i]=B.MARSH;
    else if(e<2.6&&sl<0.42&&F.dWater[i]<=40) b[i]=B.BEACH;
    else if(e<5&&sl<0.25&&m[i]<0.35&&F.dWater[i]<=70) b[i]=B.DUNE;
    else if(m[i]>0.62) b[i]=SHP.vn3(x*0.03,z*0.03,3.3,seedH)>0.15?B.BAMBOO:B.BROADLEAF;
    else if(m[i]>0.30) b[i]=B.MEADOW;
    else b[i]=B.SCRUB;
  }
  stats.landCells=land; stats.peak=peak; stats.coastCells=coast; stats.hi=HI; stats.rockSlope=rockSlope;
}

/* ── 폭포 자리(섬을 키운 뒤 — 36-falls.js fallsSites 가 부른다) ── 물이 벼랑 끝(입술)에서 포물선으로 떨어져 소에 닿는다 */
function plFalls(){
  const S=CELL/GCELL; PLAT.ws=S;
  for(const d of PLAT.drops){
    const x0=d.x0*S, z0=d.z0*S, y0=d.w0*S, x1=d.x1*S, z1=d.z1*S, y1=Math.max(0.2,d.w1*S);
    let ux=x0-x1, uz=z0-z1; const ul=Math.hypot(ux,uz)||1; ux/=ul; uz/=ul;
    let aF=0, aH=ul; for(let a=0;a<ul+40;a+=0.5){ const y=heightAt(x1+ux*a,z1+uz*a); if(y<y1+1.5) aF=a; if(y>y0-0.6){ aH=a; break; } }
    if(aH<aF+1) aH=aF+1;
    const w=clamp(d.hw*S*1.15,6,24);
    FALLS.list.push({res:1, pl:1, x0, z0, y0, x1, z1, y1, drop:y0-y1, w, dx:-ux, dz:-uz, px:x1, pz:z1, py:y1, Lc:aF, aF, aH, Rp:(d.rp||4)*S,
                     rx:x0, rz:z0, rR:d.hw*S, ux, uz, Wc:w*0.8, sea:!!d.sea});
  }
}
/* ── 산맥의 봉우리(큰 지형 모형 — 37-geo-meshes.js geoLandforms 가 판 11 이면 geoRange 대신 부른다) ──
   등뼈의 마루를 따라 크기 0.5 배 간격으로 세운다. 밑면은 모형 자락(가장 넓은 폭의 0.42 배 둘레 여덟 점)의 땅보다 낮게 — 자락이 땅 위에 뜨거나
   옆 대지를 묻지 않게. 호수 대지 둘레 · 강 곁은 비운다 */
function plGeoRange(rnd){
  if(!PLAT.on||!PLAT.sp.length) return 0;
  const S=CELL/GCELL, L=PLAT.lake, NM=['jagged_stone_peak','solitary_stone_peak','jagged_stone_peak','granite_peaks'];
  let top=0, s=0.05;
  while(s<0.95){
    const p=plSpAt(s), x0=p.x*S, z0=p.z*S, nx=-p.tz, nz=p.tx;
    if(L&&Math.hypot(x0-L.x*S,z0-L.z*S)<L.RC*S*1.25){ s+=40*S/(PLAT.spLen*S); continue; }
    /* 마루 — 옆으로 ±60 m 안에서 가장 높은 데 */
    let bx=x0, bz=z0, bh=-1e9; for(let o=-60;o<=60;o+=10){ const x=x0+nx*o, z=z0+nz*o, h=heightAt(x,z); if(h>bh){ bh=h; bx=x; bz=z; } }
    const nm=NM[(rnd()*NM.length)|0], Wm=GEO_MESH_DATA[nm].w, wmax=Math.max(Wm[0],Wm[2]);
    let Sz=Math.min(420,Math.max(150,bh*(0.75+rnd()*0.4))), ok=false, base=0;
    for(let tr=0;tr<6&&!ok;tr++){ let lo=1e9; for(let k=0;k<8;k++){ const a=k/8*6.283, r=Sz*wmax*0.42; lo=Math.min(lo,heightAt(bx+Math.cos(a)*r,bz+Math.sin(a)*r)); }
      base=lo-4; if(bh-base<Sz*0.78&&lo>bh*0.35) ok=true; else Sz*=0.82; if(Sz<110) break; }
    let wet=false; for(let k=0;k<12&&!wet;k++){ const a=k/12*6.283; for(const r of [0.15,0.3,0.45]){ const i=plGi(bx+Math.cos(a)*Sz*wmax*r,bz+Math.sin(a)*Sz*wmax*r); if(F.river[i]){ wet=true; break; } } }
    if(ok&&!wet&&bh>40){ geoStamp(nm,bx,bz,base,Sz,Math.atan2(p.tx,p.tz)+(rnd()-0.5)*0.6,[0.97,0.95,0.92],{biome:B.SCREE}); top=Math.max(top,base+Sz); }
    s+=Sz*(0.52+0.14*rnd())/(PLAT.spLen*S);
  }
  GEO_LF.ridge=PLAT.sp.map(q=>({x:q.x*S,z:q.z*S}));
  return top;
}

/* ── 닿기 어려운 정도(섬을 키운 뒤 · 땅속 세계를 정한 뒤) ─────────────────────────────────────────────
   바닷가 모래(상륙할 수 있는 데)에서 걸어서 드는 품을 칸마다 잰다(데이크스트라): 걷는 걸음은 거리 × (1 + 1.5 × 비탈) · 49° 넘는 벼랑을
   오르는 걸음은 오른 높이 × 30(매달려 올라야 한다) · 내려서는 벼랑은 높이 × 4 · 물(강 · 호수)은 헤엄이라 2배.
   PLAT.reach(0~1) = 품(95% 분위로 나눈 것) 0.55 + 높이 0.45 — 높고 멀고 벼랑에 막힌 데일수록 1 에 가깝다.
   닿기 어려운 데일수록 더 나오고(97-temples.js yieldK) · 보급 상자가 놓인다(plCaches) */
function plReachBuild(){
  const E=F.elev, B0=F.biome, R=F.river, n=N*N, C=new Float32Array(n).fill(1e30), heap=new Int32Array(n*4), hk=new Float32Array(n*4); let hn=0;
  const push=(i,c)=>{ let k=hn++; heap[k]=i; hk[k]=c; while(k>0){ const p=(k-1)>>1; if(hk[p]<=hk[k]) break; const ti=heap[p], tc=hk[p]; heap[p]=heap[k]; hk[p]=hk[k]; heap[k]=ti; hk[k]=tc; k=p; } };
  const pop=()=>{ const top=heap[0]; hn--; if(hn>0){ heap[0]=heap[hn]; hk[0]=hk[hn]; let k=0; for(;;){ const l=k*2+1, r=l+1; let m=k; if(l<hn&&hk[l]<hk[m]) m=l; if(r<hn&&hk[r]<hk[m]) m=r; if(m===k) break; const ti=heap[m], tc=hk[m]; heap[m]=heap[k]; hk[m]=hk[k]; heap[k]=ti; hk[k]=tc; k=m; } } return top; };
  for(let i=0;i<n;i++) if(B0[i]===B.BEACH&&E[i]>0.3&&E[i]<8){ C[i]=0; if(hn<heap.length-8) push(i,0); }
  const dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1], dl=[1,1,1,1,1.414,1.414,1.414,1.414];
  while(hn){ const i=pop(), ci=C[i], x=i%N;
    for(let k=0;k<8;k++){ const j=i+dn[k], xj=j%N; if(j<0||j>=n||Math.abs(xj-x)>1) continue; const ej=E[j]; if(ej<=0.1&&!R[j]) continue;
      const d=dl[k]*CELL, dh=ej-E[i], sl=Math.abs(dh)/d;
      let c=sl<=1.1?d*(1+1.5*sl):(dh>0?d+dh*30:d+(-dh)*4);
      if(R[j]) c*=2;
      const nc=ci+c; if(nc<C[j]){ C[j]=nc; if(hn<heap.length-8) push(j,nc); } } }
  const vals=[]; let hi=1; for(let i=0;i<n;i+=7){ if(E[i]>0.3&&C[i]<1e29) vals.push(C[i]); if(E[i]>hi) hi=E[i]; }
  vals.sort((a,b)=>a-b); const c95=vals.length?vals[Math.floor(vals.length*0.95)]:1;
  const RE=PLAT.reach=new Float32Array(n);
  for(let i=0;i<n;i++){ if(E[i]<=0.3&&!R[i]) continue; RE[i]=clamp(0.55*Math.min(1,(C[i]<1e29?C[i]:c95*1.5)/c95)+0.45*clamp(E[i]/hi,0,1),0,1); }
  PLAT.reachCost=C; PLAT.c95=c95;
}
function plReachAt(x,z){ const R=PLAT.reach; if(!R) return 0; const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); return (gx<0||gz<0||gx>=N||gz>=N)?0:R[gz*N+gx]; }
/* ── 땅속 세계를 정한 뒤(90-init.js — underSites 다음 · 다지류 둥지 mobsSites 앞) ── */
/* 굴 입구(함몰 입구 · 바닷가 굴)의 굴길 앞쪽 · 모래턱을 막는 벼랑 큰 바위 덩이를 걷는다(2026-11-06 사용자 '굴 입구에 바위가 떠 있다 · 들어가면 막혀 못 나온다') —
   33-crags.js cragCaveClear(판 10 굴 것)와 같은 길을 굴길 처음 세 토막에 쓴다(그 함수는 안 건드린다) */
function plCragClear(){
  if(typeof CRAG==='undefined'||!CRAG.tiles||!CRAG.tiles.size||!UNDER.dol.length) return;
  const T=CRAG.T, F_=CRAG.F, kill=new Set(), pts=[];
  for(const d of UNDER.dol){ for(const sg of d.segs.slice(0,3)){ for(let s=0;s<=sg.L;s+=2.5){ const t=s/sg.L, cx=sg.x0+(sg.x1-sg.x0)*t, cz=sg.z0+(sg.z1-sg.z0)*t, f=sg.f0+(sg.f1-sg.f0)*t, vx=-(sg.z1-sg.z0)/sg.L, vz=(sg.x1-sg.x0)/sg.L;
        for(const o of [-1.4,-0.7,0,0.7,1.4]) pts.push([cx+vx*o*sg.w,cz+vz*o*sg.w,f,sg.h]); } }
    if(d.sea) for(let k=0;k<12;k++){ const a=k/12*6.283; pts.push([d.mx-d.ux*6+Math.cos(a)*12,d.mz-d.uz*6+Math.sin(a)*12,0.3,6]); } }
  PLAT.cragKill=plCragKill(pts);
}
/* **폭포가 지나는 벼랑 바위를 걷는다**(2026-11-09 사용자 '폭포 강 버그가 그대로다'): 대지 폭포의 물살 판(36-falls.js fallsBuildPl)은 땅 높이를 따라 떨어지는데,
   벼랑에 박힌 큰 바위 덩이(33-crags.js)는 땅 위로 솟아 있어 물살이 바위 속으로 묻혔다 — 잰 값(CASTAWAY 섬 폭포 9): 7 곳에서 물길 점의 30~90% 가 바위 속 ·
   가장 깊이 25~38 m. 그래서 폭포는 안 보이고 밑의 소 거품만 보였다. 물길(fallsPlPath — 그리는 것과 같은 식)을 따라 물살 폭(아래로 1.4 배) + 2 m 의 띠에서
   물살 높이를 가로지르는 덩이를 걷는다 — 벼랑 면에 물이 흘러내리는 골이 패인다 */
function plFallsClear(){
  if(typeof CRAG==='undefined'||!CRAG.tiles||!CRAG.tiles.size||typeof fallsPlPath!=='function') return;
  const pts=[];
  for(const f of FALLS.list){ if(!f.pl) continue;
    const P=fallsPlPath(f), tx=-f.uz, tz=f.ux;
    for(let i=0;i<P.length;i+=2){ const [x,z,y]=[P[i][0],P[i][2],P[i][1]], hw=f.w*(0.55+0.2*i/P.length)+2;
      for(let o=-1;o<=1.001;o+=0.25) pts.push([x+tx*o*hw,z+tz*o*hw,y-0.5,2.5]); } }
  if(pts.length) PLAT.fallKill=plCragKill(pts);
}
/* 점 [x, z, 바닥 f, 높이 h] 마다 그 높이 띠(f+0.3 ~ f+h+2)를 가로지르는 벼랑 바위 덩이와 몸 막기 원을 걷는다 — 굴길(plCragClear) · 폭포(plFallsClear)가 같이 쓴다 */
function plCragKill(pts){
  const T=CRAG.T, F_=CRAG.F, kill=new Set();
  for(const [x,z] of pts){ const tx=Math.floor(x/T), tz=Math.floor(z/T);
    for(let a=tz-1;a<=tz+1;a++) for(let b=tx-1;b<=tx+1;b++){ const t=CRAG.tiles.get((b+512)*1024+(a+512)); if(t&&!t.ixd) cragIndex(t); } }
  for(const [x,z,f,h] of pts){ const n=cragSpan(x,z); for(let i=0;i<n;i++){ const sp=_cgS[i]; if(sp.t>f+0.3&&sp.b<f+h+2) kill.add(sp.r); } }
  if(kill.size){ const byT=new Map(); for(const r of kill){ let a=byT.get(r.t); if(!a) byT.set(r.t,a=new Set()); a.add(r.o); }
    for(const [t,os] of byT){ const B=t.b, K=[]; for(let o=0;o<B.length;o+=F_){ if(os.has(o)) continue; for(let j=0;j<F_;j++) K.push(B[o+j]); } B.length=0; for(const v of K) B.push(v); }
    CRAG.ix.clear(); for(const t of CRAG.tiles.values()) t.ixd=false; }
  /* 몸 막기 원도 굴길 자리 것은 걷는다 */
  const C=CRAG.cols, K=[]; for(let i=0;i<C.length;i+=3){ const x=C[i], z=C[i+1]; if(pts.some(q=>(q[0]-x)*(q[0]-x)+(q[1]-z)*(q[1]-z)<(C[i+2]+2)*(C[i+2]+2))) continue; K.push(C[i],C[i+1],C[i+2]); }
  C.length=0; for(const v of K) C.push(v);
  { const G=CRAG.cg; G.clear();                                                    // 16 m 칸 색인은 원의 차례 번호를 담는다 — 다시 건다(33-crags.js cragSites 와 같은 식)
    for(let i=0;i<C.length;i+=3){ const r=C[i+2], x0=Math.floor((C[i]-r)/16), x1=Math.floor((C[i]+r)/16), z0=Math.floor((C[i+1]-r)/16), z1=Math.floor((C[i+1]+r)/16);
      for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const k=(gx+2048)*4096+(gz+2048); let a=G.get(k); if(!a) G.set(k,a=[]); a.push(i); } } }
  return kill.size;
}
function plAfterUnder(seed){
  if(!PLAT.on) return;
  plCragClear();
  plFallsClear();
  /* 벼랑 면에 붙은 잔돌 · 풀 · 덤불(2026-11-06 사용자 사진 — 벼랑에 돌덩이가 떠 있다)과 큰 지형 모형 속에 묻힌 나무(바위섬 꼭대기의 전나무가 모형 속에 섰다)를 걷는다 */
  { const W=new Set(['oak','fir']); let cut=0;
    PROPS=PROPS.filter(p=>{ if(p.cave||p.ug) return true; const i=plGi(p.x,p.z);
      if(F.slope[i]>1.25&&!(ROCKY_BIG[p.k])){ cut++; return false; }
      if(F.river[i]&&F.wlev[i]>heightAt(p.x,p.z)+0.8){ cut++; return false; }
      if(underHoleAt(p.x,p.z,heightAt(p.x,p.z),1.0)){ cut++; return false; }   // 굴 입구 구멍 위(땅이 뚫려 떠 보였다 — 2026-11-08 사용자 사진)   // 물속 깊이 선 갈대 · 부싯돌(2026-11-08 사용자 사진 — 호수 바닥 50 m 밑에 갈대가 섰다)
      if(p.top!==undefined){ cut++; return false; }   // 바위섬 꼭대기의 전나무(34-coast.js) — 시스택 모형 속에 묻히거나 바다 위에 떠 보였다(2026-11-06 사용자 '바위 속의 나무 · 떠 있는 것')
      if(W.has(p.k)&&GEO_LF.mask&&GEO_LF.mask[i]&&geoFloor(p.x,p.z)>heightAt(p.x,p.z)+3){ cut++; return false; }
      if(W.has(p.k)&&treeCliff(p.x,p.z,heightAt(p.x,p.z),1.5+1.8*(p.s||1),2.2)){ cut++; return false; }   // 벼랑 곁 나무(우듬지가 벼랑 · 바위에 파고들었다 — 2026-11-08 사용자)
      return true; });
    PLAT.cut=cut; }
  plReachBuild();
  plOres(mulberry32((seed^0x9a7ea3)>>>0));
  /* 다지류 둥지는 판 10 굴(31-cave10.js — 판 11 도 같이 쓴다)이 맡는다 · plDens 는 굴이 하나도 없을 때만 */
  if(!CAVES.length) plDens(mulberry32((seed^0x9a7ea4)>>>0));
}
/* 광석은 굴 속으로(사용자 요청 2026-11-06 '땅 위 광석은 줄이고 광석이 잔뜩 든 굴') —
   입구(함몰 입구 · 바닷가 굴)에서 굴길로 닿는 방 가운데 ① 입구 방은 스물넷 ② 다섯 걸음 안의 방 셋에 둘은 여덟~열다섯을 광맥 두셋에 모아 놓는다
   (광종은 방마다 고루 섞는다). 땅 위에는 열에 하나 · 닿기 어려운 데(reach 0.6 넘게)는 셋에 하나를 남기고, 굴에 못 든 나머지는 그 자리의 바위로(surfaceRocks) */
function plOres(rnd){
  const C=UNDER.ch; if(!UNDER.ok||!C.length) return;
  const adj=new Map(), link=(a,b)=>{ let l=adj.get(a); if(!l) adj.set(a,l=[]); l.push(b); };
  for(const [a,b] of (UNDER.adj||[])){ if(a<0||b<0) continue; link(a,b); link(b,a); }
  const hop=new Map(), q=[]; C.forEach((c,i)=>{ if(c.adit){ hop.set(i,0); q.push(i); } });
  while(q.length){ const i=q.shift(); for(const j of adj.get(i)||[]) if(!hop.has(j)){ hop.set(j,hop.get(i)+1); q.push(j); } }
  const rooms=[];
  for(const [i,h] of [...hop].sort((a,b)=>a[1]-b[1]||a[0]-b[0])){ const c=C[i];
    if(c.adit){ c.cap=24; rooms.push(c); } else if(h<=5&&((c.sd>>>3)%3)!==0){ c.cap=8+((c.sd>>>5)%8); rooms.push(c); } }
  PLAT.oreRooms=rooms.length;
  const kinds=CAVE_ORE.slice(), Q={}; for(const k of kinds) Q[k]=[];
  const hs=p=>(hashStr('ore|'+p.k+'|'+Math.round(p.x)+'|'+Math.round(p.z))>>>0)/4294967296;
  for(const p of PROPS){ if(p.vein||kinds.indexOf(p.k)<0||(p.k==='iron'&&bogAt(p.x,p.z))) continue;   // p.vein — 판 13 굴 광맥(10-worldgen.js caveVeins)은 제 굴에 그대로   // 판 10 굴에 놓인 광석(p.cave)도 든다 — 그 굴과 땅속 방이 반씩 나눠 갖는다(?ws=2 · 굴 247 · 땅속 232)
    const u=hs(p), r=plReachAt(p.x,p.z); if(u<0.05||(r>0.7&&u<0.15)){ p.keep=1; continue; }
    Q[p.k].push(p); }
  for(const k of kinds) Q[k].sort((a,b)=>hs(a)-hs(b));
  let ri=0, placed=0;
  for(const c of rooms){
    /* 광맥 — 방마다 두셋(물 · 석주가 없는 바닥) */
    const veins=[]; for(let t=0;t<30&&veins.length<2+(c.cap>12?1:0);t++){ const a=rnd()*6.283, d=c.R*Math.sqrt(rnd())*0.7, x=c.x+Math.cos(a)*d, z=c.z+Math.sin(a)*d, g=underQ(x,z,true);
      if(g.g<4||g.w>-1e8||underWallAt(x,z,2)) continue; veins.push([x,z]); }
    if(!veins.length) continue;
    const put=[];
    for(let n=0;n<c.cap;n++){ const k=kinds[(n+ri)%kinds.length]; let p=Q[k].pop(); if(!p){ for(const k2 of kinds){ if(Q[k2].length){ p=Q[k2].pop(); break; } } } if(!p) break;
      const v=veins[n%veins.length], fp=(PROP_FOOT[p.k]||1)*Math.min(p.s,1.05);
      let bx=v[0], bz=v[1], best=-1e9;
      for(let t=0;t<16;t++){ const a=rnd()*6.283, r=1.2+rnd()*4.5, x=v[0]+Math.cos(a)*r, z=v[1]+Math.sin(a)*r, g=underQ(x,z,true); if(g.g<3||g.w>-1e8||g.c-g.f<3.2||underWallAt(x,z,fp)) continue;
        let m=1e9; for(const o of put){ const d=Math.hypot(o[0]-x,o[1]-z)-(fp+o[2])*0.8; if(d<m) m=d; } if(m>best){ best=m; bx=x; bz=z; } if(m>=0) break; }
      const g=underQ(bx,bz,true); if(g.g<3||underWallAt(bx,bz,fp*0.8)) continue;
      p.x=bx; p.z=bz; p.y=g.f; p.s=Math.min(p.s,1.05); p.cave=1; p.ug=1; p._cy=undefined; p.top=undefined; put.push([bx,bz,fp]); placed++; }
    ri++; }
  PLAT.oreUG=placed;
  /* 늪철광(땅 위 늪에만)도 셋에 하나만 남긴다 — 늪마다 수십 덩이씩 깔려 있었다 */
  PROPS=PROPS.filter(p=>!(p.k==='iron'&&!p.cave&&!p.keep&&bogAt(p.x,p.z)&&hs(p)>0.35));
  surfaceRocks();                                                         // 굴에 못 든 바깥 광석 → 그 자리의 바위(10-worldgen.js)
}
/* 다지류 둥지 — 땅 위 굴이 없으니(판 11) 우거진 대지(활엽수림 · 대숲)의 벼랑 밑 우묵한 데를 둥지로 친다(그리지 않는 '굴' — 32-caves.js 가 거른다 ·
   97-mobs.js mobsSites 가 그대로 읽는다). 여덟까지 · 서로 700 m 넘게 */
function plDens(rnd){
  const E=F.elev, b=F.biome, id=PLAT.id, cand=[];
  for(let gz=6;gz<N-6;gz+=2) for(let gx=6;gx<N-6;gx+=2){ const i=gz*N+gx; if(id[i]<0||F.river[i]||F.slope[i]>0.25||!(b[i]===B.BROADLEAF||b[i]===B.BAMBOO)) continue;
    let up=null; for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){ if(E[i+dz*N+dx]>E[i]+8){ up=[dx,dz]; break; } }
    if(up) cand.push([i,up]); }
  for(let k=cand.length-1;k>0;k--){ const j=(rnd()*(k+1))|0, t=cand[k]; cand[k]=cand[j]; cand[j]=t; }
  PLAT.dens.length=0;
  for(const [i,up] of cand){ if(PLAT.dens.length>=8) break; const x=plGx(i), z=plGz(i); if(PLAT.dens.some(d=>Math.hypot(d.x-x,d.z-z)<700)) continue;
    const yaw=Math.atan2(-up[1],-up[0]), y=heightAt(x,z), room={x,z,y,R:7,open:[yaw]};
    const c={ghost:1,x,z,y,yaw,seed:(rnd()*1e9)|0,rooms:[room]}; room.cave=c; CAVES.push(c); PLAT.dens.push(c); }
}

/* ── 보급 상자 · 망대(사용자 요청 2026-11-06 '닿기 어려운 데일수록 좋은 것 · 이점') ─────────────────────────────────────
   ① **보급 상자** — 먼저 이 섬에 왔던 사람들이 높은 데에 숨겨 둔 상자(돌무더기 곁의 나무 상자). 닿기 어려울수록(reach) 좋은 것이 든다:
      대지마다 가장 닿기 어려운 판판한 자리(그 대지의 품이 0.45 넘게 · 대지 가장자리 6 m 안쪽) · 호수 섬 · 산 마루의 가장 높은 판판한 데 ·
      땅속 깊은 방(입구에서 굴길로 세 걸음 넘게). 한 번 열면 끝(저장 — TEMPLE.taken 에 'C…' 열쇠)
   ② **망대**(돌탑) — 가장 높은 대지 · 호수 둘레 언덕 · 산 마루에 선다. 그 곁(8 m)에 서면 섬을 내려다보아 2.6 km 안의 보급 상자를 지도에 적는다
      (PLAT.spot · 저장). 높은 데에 오른 값 — 상자를 찾아가는 길잡이다 */
const PL_LOOT=[
  [[['rope',1],['can_food',1],['bandage_fiber',3]],[['cord',6],['jerky',2],['torch',1]],[['bandage_clean',2],['herb_tea',2]],[['gunpowder',2],['flint',4],['cord',4]]],
  [[['ingot_bronze',3],['gunpowder',3],['bandage_clean',2]],[['pick_iron',1],['rope',2]],[['cartridge',12],['primer',4]],[['lamp_oil',1],['can_food',2],['ingot_steel',1]],[['axe_iron',1],['glass',3],['salt',3]]],
  [[['ingot_steel',3],['spring_steel',1],['barrel_rifled',1]],[['rifle_semi',1],['cartridge_smokeless',14]],[['axe_steel',1],['pick_steel',1],['battery_li',1]],
   [['plate_steel',1],['bandage_clean',3]],[['drill',1],['battery_li',1],['lamp_electric',1]],[['powder_smokeless',6],['primer',10],['cartridge_brass',10]]]
];
function plCachePlan(seed){
  PLAT.caches.length=0; PLAT.looks.length=0; if(!PLAT.on||!PLAT.reach) return;
  const rnd=mulberry32((seed^0x9a7ea5)>>>0), E=F.elev, id=PLAT.id, RE=PLAT.reach, S=CELL/GCELL, L=PLAT.lake;
  const add=(x,z,y,tier,why,ug)=>{ if(PLAT.caches.some(c=>Math.hypot(c.x-x,c.z-z)<120)) return; if(!ug) y=geoGround(x,z,heightAt(x,z)); /* 큰 지형 모형(산 겉의 바위 조각) 위면 그 윗면 */ PLAT.caches.push({x,z,y,tier,why,ug:!!ug,yaw:rnd()*6.283,key:'C'+Math.round(x)+'_'+Math.round(z),loot:(rnd()*1000)|0}); };
  const flat=i=>F.slope[i]<0.3&&!F.river[i]&&!(PLAT.ramp&&PLAT.ramp[i]);
  /* 대지 — 그 대지 윗면에서 가장 닿기 어려운 자리(가장자리 두 칸 안쪽) */
  PLAT.list.forEach((Sh,j)=>{ let best=-1, br=0, sum=0, n=0; const Rb=Sh.R*Sh.ex*1.2;
    for(let gz=Math.max(3,Math.floor((Sh.z-Rb)/GCELL+N/2));gz<=Math.min(N-4,Math.ceil((Sh.z+Rb)/GCELL+N/2));gz++) for(let gx=Math.max(3,Math.floor((Sh.x-Rb)/GCELL+N/2));gx<=Math.min(N-4,Math.ceil((Sh.x+Rb)/GCELL+N/2));gx++){
      const i=gz*N+gx; if(id[i]!==j||!flat(i)) continue; let inner=true; for(const o of [-2,2,-2*N,2*N]) if(id[i+o]!==j){ inner=false; break; } if(!inner) continue;
      sum+=RE[i]; n++; if(RE[i]>br){ br=RE[i]; best=i; } }
    if(best<0||sum/n<0.45) return;
    add(plGx(best),plGz(best),heightAt(plGx(best),plGz(best)),br>0.66?2:br>0.52?1:0,'대지');
    if(Sh.tier>=4||Sh.crown) PLAT.looks.push({x:plGx(best),z:plGz(best),key:'L'+j}); });
  /* 호수 섬 */
  if(PLAT.islet){ const x=PLAT.islet.x*S, z=PLAT.islet.z*S; add(x,z,heightAt(x,z),2,'호수 섬'); }
  /* 산 마루 — 등뼈 가까이(80 m)의 판판하고 가장 높은 데 다섯 */
  { const top=[]; for(let i=0;i<N*N;i+=3){ if(id[i]!==-2||F.slope[i]>0.45||F.river[i]||(GEO_LF.mask&&GEO_LF.mask[i])) continue; top.push(i); }
    top.sort((a,b)=>E[b]-E[a]);
    for(const i of top){ if(PLAT.looks.filter(l=>l.mt).length>=5) break; const x=plGx(i), z=plGz(i); if(PLAT.looks.some(l=>Math.hypot(l.x-x,l.z-z)<900)) continue;
      PLAT.looks.push({x,z,key:'M'+i,mt:1}); add(x+6,z+6,heightAt(x+6,z+6),2,'산 마루'); } }
  /* 땅속 깊은 방 — 입구에서 굴길로 셋 넘게 */
  if(UNDER.ok&&UNDER.adj){ const C=UNDER.ch, adj=new Map(), link=(a,b)=>{ let l=adj.get(a); if(!l) adj.set(a,l=[]); l.push(b); };
    for(const [a,b] of UNDER.adj){ if(a<0||b<0) continue; link(a,b); link(b,a); }
    const hop=new Map(), q=[]; C.forEach((c,i)=>{ if(c.adit){ hop.set(i,0); q.push(i); } });
    while(q.length){ const i=q.shift(); for(const j of adj.get(i)||[]) if(!hop.has(j)){ hop.set(j,hop.get(i)+1); q.push(j); } }
    let k=0; for(const [i,h] of [...hop].sort((a,b)=>b[1]-a[1]||a[0]-b[0])){ if(h<3||k>=4) break; const c=C[i]; const g=underQ(c.x+c.R*0.3,c.z,true); if(g.g<3||g.w>-1e8) continue;
      add(c.x+c.R*0.3,c.z,g.f,h>=5?2:1,'땅속',true); k++; } }
  /* 호수 둘레 언덕 — 망대 */
  if(L){ for(let k=0;k<12;k++){ const a=k/12*6.283; let bi=-1, bh=-1; for(let r=L.RC*0.8;r<L.RC*1.05;r+=3){ const i=plGi((L.x+Math.cos(a)*r)*S,(L.z+Math.sin(a)*r)*S); if(E[i]>bh&&F.slope[i]<0.5){ bh=E[i]; bi=i; } }   // 호수 자리는 만들 때의 좌표(× 섬 배율)
      if(bi>=0&&bh>PL_LAKE*S+20&&!PLAT.looks.some(l=>Math.hypot(l.x-plGx(bi),l.z-plGz(bi))<500)) PLAT.looks.push({x:plGx(bi),z:plGz(bi),key:'R'+k}); } }
  for(const l of PLAT.looks) l.y=geoGround(l.x,l.z,heightAt(l.x,l.z));
}
/* 상자 · 돌탑을 그리고 줍는 자리를 단다(placeProps_ — templeBuild 다음: 그것이 TEMPLE.picks 를 비운다) */
function plCacheBuild(){
  for(const m of PLAT.meshes){ scene.remove(m); if(m.geometry&&m.userData.own) m.geometry.dispose(); } PLAT.meshes.length=0;
  if(!PLAT.on) return;
  /* 그리기 셋 — 상자 · 돌탑(땅 위) · 돌탑(땅속)을 인스턴스 하나씩으로(돌 하나하나가 그리기 한 번이면 170번이 는다) */
  if(!PLAT.mat){ PLAT.mat={wood:new THREE.MeshLambertMaterial({color:0x6a4a2c}), stone:rockMat('cairn',0x8a857a), stoneU:rockMat('cairnug',0x7a756a)};
    PLAT.mat.stone.userData.melt=0.25; PLAT.mat.stoneU.userData.melt=0; PLAT.mat.stoneU.userData.meltAttr=false; }
  if(!PLAT.geo){ const a=new THREE.BoxGeometry(0.9,0.5,0.6), b=new THREE.BoxGeometry(0.96,0.08,0.66); b.translate(0,0.28,0);
    PLAT.geo={crate:mergeParts([{g:a,x:0,y:0.25,z:0},{g:b,x:0,y:0.25,z:0}]), rock:new THREE.IcosahedronGeometry(1,1)}; }
  const crates=[], st=[], stU=[];
  const cairn=(x,y,z,n,s,L)=>{ const rn=mulberry32(hashStr('cairn'+Math.round(x)+'|'+Math.round(z))); let yy=y;
    for(let k=0;k<n;k++){ const r=(1-k/n*0.6)*s*(0.8+rn()*0.3); L.push([x+(rn()-0.5)*0.2*s,yy+r*0.5,z+(rn()-0.5)*0.2*s,r*1.2,r*0.62,r,rn()*6.283]); yy+=r*1.05; } };
  for(const c of PLAT.caches){
    crates.push([c.x,c.y-0.05,c.z,1,1,1,c.yaw]);
    cairn(c.x+Math.cos(c.yaw)*1.1,c.y-0.1,c.z+Math.sin(c.yaw)*1.1,4,0.42,c.ug?stU:st);
    TEMPLE.picks.push({kind:'cache',x:c.x,z:c.z,y:c.y,ay:c.y+0.35,r:0.6,key:c.key,deep:false,swim:false,tier:c.tier,loot:c.loot}); }
  for(const l of PLAT.looks) cairn(l.x,l.y-0.2,l.z,7,0.9,st);
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), V=new THREE.Vector3(), Sc=new THREE.Vector3(), Y=new THREE.Vector3(0,1,0);
  const im=(geo,mat,L)=>{ if(!L.length) return; const m=new THREE.InstancedMesh(geo,mat,L.length);
    L.forEach((o,i)=>{ Q.setFromAxisAngle(Y,o[6]); V.set(o[0],o[1],o[2]); Sc.set(o[3],o[4],o[5]); M.compose(V,Q,Sc); m.setMatrixAt(i,M); });
    m.instanceMatrix.needsUpdate=true; m.computeBoundingSphere&&m.computeBoundingSphere(); m.frustumCulled=false; m.userData.lightRole='recv'; scene.add(m); PLAT.meshes.push(m); };
  im(PLAT.geo.crate,PLAT.mat.wood,crates); im(PLAT.geo.rock,PLAT.mat.stone,st); im(PLAT.geo.rock,PLAT.mat.stoneU,stU);
}
function plCacheLoot(p){
  const T=PL_LOOT[clamp(p.tier|0,0,2)], L=T[(p.loot|0)%T.length]; let msg='';
  for(const [id,n] of L){ if(!ITEMS[id]) continue; let g=0; for(let k=0;k<n;k++) if(invAdd(id,1)) g++; if(g) msg+=(msg?' · ':'')+ITEMS[id].n+' +'+g; }
  return (msg?['보급 상자','튼튼한 보급 상자','귀한 보급 상자'][clamp(p.tier|0,0,2)]+' — '+msg:'가방이 가득 차 아무것도 못 꺼냈다');
}
/* 망대 곁에 서면 둘레 2.6 km 의 상자를 지도에 적는다(0.5초마다 본다) */
function updatePlateau(dt){
  if(!PLAT.on||!PLAT.looks.length||!landed) return;
  if((PLAT.lookT+=dt)<0.5) return; PLAT.lookT=0;
  for(const l of PLAT.looks){ if(PLAT.seen.has(l.key)) continue; if(Math.hypot(PL.pos.x-l.x,PL.pos.z-l.z)>8||Math.abs(PL.pos.y-l.y)>6) continue;
    PLAT.seen.add(l.key); let n=0;
    for(const c of PLAT.caches){ if(Math.hypot(c.x-l.x,c.z-l.z)<2600&&!PLAT.spot.has(c.key)){ PLAT.spot.add(c.key); n++; } }
    toast(n?'망대에 올라 섬을 내려다보았다 — 숨은 보급 상자 '+n+'곳을 지도에 적었다':'망대에 올라 섬을 내려다보았다 — 둘레의 상자는 이미 다 안다');
    if(typeof mapBaseT!=='undefined') mapBaseT=0; }
}
/* 지도 — 알아낸 상자(금빛 마름모 · 연 것은 잿빛) · 망대(돌탑 점) */
function plMapDraw(ctx,ps){
  if(!PLAT.on) return;
  for(const c of PLAT.caches){ if(!PLAT.spot.has(c.key)) continue; const x=c.x/CELL+N/2, z=c.z/CELL+N/2, r=ps*0.5, open=TEMPLE.taken.has(c.key);
    ctx.fillStyle=open?'rgba(150,150,150,.8)':(c.ug?'#b88cff':'#ffcf4a'); ctx.beginPath(); ctx.moveTo(x,z-r); ctx.lineTo(x+r,z); ctx.lineTo(x,z+r); ctx.lineTo(x-r,z); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle='rgba(235,228,210,.9)'; for(const l of PLAT.looks){ const x=l.x/CELL+N/2, z=l.z/CELL+N/2; ctx.fillRect(x-ps*0.18,z-ps*0.18,ps*0.36,ps*0.36); }
}
