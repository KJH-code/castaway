/* 10-worldgen.js — CASTAWAY
   섬 만들기 — 융기 → 안식각 → 물방울 침식 → 수계 → 경사·거리장 → 기후 → 바이옴 분류 → 자원 배치 · 샘플링(heightAt …)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   1) 기반 지형
   ========================================================================== */
function genBase(seed){
  const n1=makePerlin(seed), n2=makePerlin(seed^0x9e3779b9), n3=makePerlin(seed^0x85ebca6b);
  const fbm=(nz,x,z,oct,lac,gain)=>{
    let a=1,f=1,s=0,t=0;
    for(let i=0;i<oct;i++){ s+=nz(x*f,z*f)*a; t+=a; a*=gain; f*=lac; }
    return s/t;
  };
  const ridged=(nz,x,z,oct)=>{
    let a=1,f=1,s=0,t=0;
    for(let i=0;i<oct;i++){ s+=(1-Math.abs(nz(x*f,z*f)))*a; t+=a; a*=0.5; f*=2.05; }
    return s/t;
  };

  for(let z=0;z<N;z++){
    for(let x=0;x<N;x++){
      const nx=(x/(N-1))*2-1, nz=(z/(N-1))*2-1;
      // 해안선 도메인 워핑 — 원형 섬이 되지 않도록 거리 자체를 흔든다
      const warp = fbm(n2,nx*1.7+37.1,nz*1.7-19.7,4,2.1,0.5)*0.24;
      const bays = fbm(n3,nx*0.85-8.3,nz*0.85+4.9,2,2.0,0.5)*0.16;
      const d = Math.sqrt(nx*nx+nz*nz)+warp+bays;
      const mask = 1-smoothstep(P.size*0.40, P.size*1.38, d);

      const cont  = fbm(n1,nx*1.6,nz*1.6,5,2.03,0.5)*0.5+0.5;       // 완만한 구릉
      const rMask = clamp(fbm(n3,nx*0.8+61,nz*0.8-23,3,2.0,0.5)*1.7+0.45,0,1); // 산맥 분포
      const ridge = Math.pow(ridged(n1,nx*1.45+12,nz*1.45-5,4),2.4); // 산릉 (파장을 길게)

      const land = mask*mask*(3-2*mask);
      const h01  = cont*0.30 + ridge*rMask*P.ridge*0.80;
      let e = h01*100*land - (1-land)*26 - P.sea;
      // 해안 완만화: 해수면 ±BAND 구간을 압축 → 넓은 해빈·간석지·완사면 형성
      const BAND=15;
      if(Math.abs(e)<BAND) e=Math.sign(e)*Math.pow(Math.abs(e)/BAND,2.3)*BAND;
      if(e<0) e*=1.6;   // 바다를 더 깊게 — 해안선(0)은 그대로이고 물 밑만 1.6배
      F.elev[IDX(x,z)]=e;
    }
  }
}

/* ============================================================================
   2) 열적 침식 — 안식각 초과분 이동
   ========================================================================== */
function thermal(iters,talus,rate){
  const h=F.elev, tmp=new Float32Array(h.length);
  for(let it=0;it<iters;it++){
    tmp.set(h);
    for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){
      const i=IDX(x,z), hi=tmp[i];
      let li=-1, ld=0;
      for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz) continue;
        const j=i+dz*N+dx, d=hi-tmp[j];
        if(d>ld){ ld=d; li=j; }
      }
      if(li>=0 && ld>talus){
        const move=(ld-talus)*rate;
        h[i]-=move; h[li]+=move;
      }
    }
  }
}

/* ============================================================================
   3) 수적 침식 — 물방울 시뮬레이션
   ========================================================================== */
function hydraulic(seed, drops){
  if(drops<=0) return;
  const h=F.elev, rnd=mulberry32(seed^0xdeadbeef);
  const R=2;                    // 침식 브러시 반경
  const bo=[], bw=[]; let bsum=0;
  for(let dz=-R;dz<=R;dz++) for(let dx=-R;dx<=R;dx++){
    const d=Math.hypot(dx,dz); if(d>R) continue;
    const w=1-d/R; bo.push([dx,dz]); bw.push(w); bsum+=w;
  }
  for(let i=0;i<bw.length;i++) bw[i]/=bsum;

  const inertia=0.05, capFac=3.2, minCap=0.01,
        eroRate=0.32, depRate=0.28, evap=0.02, grav=4, life=26;

  for(let d=0;d<drops;d++){
    let px=1+rnd()*(N-3), pz=1+rnd()*(N-3);
    let dx=0, dz=0, speed=1, water=1, sed=0;
    for(let l=0;l<life;l++){
      const nx=px|0, nz=pz|0;
      if(nx<1||nz<1||nx>=N-2||nz>=N-2) break;
      const fx=px-nx, fz=pz-nz, i=IDX(nx,nz);
      const h00=h[i],h10=h[i+1],h01=h[i+N],h11=h[i+N+1];
      const gx=(h10-h00)*(1-fz)+(h11-h01)*fz;
      const gz=(h01-h00)*(1-fx)+(h11-h10)*fx;
      const hOld=h00*(1-fx)*(1-fz)+h10*fx*(1-fz)+h01*(1-fx)*fz+h11*fx*fz;

      dx=dx*inertia-gx*(1-inertia);
      dz=dz*inertia-gz*(1-inertia);
      const len=Math.hypot(dx,dz);
      if(len<1e-5) break;
      dx/=len; dz/=len;
      px+=dx; pz+=dz;
      if(px<1||pz<1||px>=N-2||pz>=N-2) break;

      const mx=px|0, mz=pz|0, j=IDX(mx,mz);
      const jx=px-mx, jz=pz-mz;
      const hNew=h[j]*(1-jx)*(1-jz)+h[j+1]*jx*(1-jz)+h[j+N]*(1-jx)*jz+h[j+N+1]*jx*jz;
      const dh=hNew-hOld;

      const cap=Math.max(-dh*speed*water*capFac, minCap);
      if(sed>cap || dh>0){
        // 퇴적: 오르막이면 웅덩이를 메우는 만큼만
        const dep=(dh>0)?Math.min(dh,sed):(sed-cap)*depRate;
        sed-=dep;
        h[i]      += dep*(1-fx)*(1-fz);
        h[i+1]    += dep*fx*(1-fz);
        h[i+N]    += dep*(1-fx)*fz;
        h[i+N+1]  += dep*fx*fz;
      }else{
        const ero=Math.min((cap-sed)*eroRate, -dh);
        for(let b=0;b<bo.length;b++){
          const bx=nx+bo[b][0], bz=nz+bo[b][1];
          if(bx<0||bz<0||bx>=N||bz>=N) continue;
          const k=IDX(bx,bz), amt=ero*bw[b];
          h[k]-=amt; sed+=amt;
        }
      }
      speed=Math.sqrt(Math.max(0, speed*speed - dh*grav));
      water*=(1-evap);
      if(water<0.02) break;
    }
  }
}

/* 침식이 남긴 셀 단위 잡티만 걷어낸다. 3×3 가중 평균에 계수 k 만큼만 섞으므로
   골짜기·능선 같은 큰 형태는 그대로 두고 표면만 매끄러워진다. */
function smoothTerrain(passes,k){
  const h=F.elev, t=new Float32Array(h.length);
  for(let it=0;it<passes;it++){
    t.set(h);
    for(let z=1;z<N-1;z++){
      const r=z*N;
      for(let x=1;x<N-1;x++){
        const i=r+x;
        const avg=(t[i]*4
          +(t[i-1]+t[i+1]+t[i-N]+t[i+N])*2
          + t[i-N-1]+t[i-N+1]+t[i+N-1]+t[i+N+1])/16;
        h[i]=t[i]+(avg-t[i])*k;
      }
    }
  }
}

/* ============================================================================
   4) 수문 — D8 흐름 누적 → 하천 추출
   ========================================================================== */
function hydrology(){
  const h=F.elev;
  F.flow.fill(1); F.river.fill(0);
  const order=new Uint32Array(N*N);
  for(let i=0;i<N*N;i++) order[i]=i;
  const arr=Array.from(order);
  arr.sort((a,b)=>h[b]-h[a]);               // 높은 곳부터

  const dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1];
  const dl=[1,1,1,1,1.414,1.414,1.414,1.414];
  for(let s=0;s<arr.length;s++){
    const i=arr[s];
    const x=i%N, z=(i/N)|0;
    if(x<1||z<1||x>=N-1||z>=N-1) continue;
    if(h[i]<=0) continue;                    // 바다는 종점
    let best=-1, bestSlope=0;
    for(let k=0;k<8;k++){
      const j=i+dn[k], sl=(h[i]-h[j])/dl[k];
      if(sl>bestSlope){ bestSlope=sl; best=j; }
    }
    if(best>=0) F.flow[best]+=F.flow[i];
  }

  // 하천 판정 → 유량에 따라 하폭을 정하고, 넓고 얕은 하도를 판다
  const thr=110*(16/(CELL*CELL))/Math.max(0.35,P.rain);   // 셀 면적에 맞춰 정규화
  const MAXD=0.85;                      // 하도 최대 수심 (m) — 걸어서 건널 수 있는 깊이
  const depth=new Float32Array(N*N);
  const surf =new Float32Array(N*N);
  F.wlev.fill(0);
  const core=[];
  for(let i=0;i<N*N;i++) if(h[i]>0.4 && F.flow[i]>thr) core.push(i);

  for(const i of core){
    // 하폭 4~19 m — 유량이 많을수록 넓다
    const rM=clamp(2.2+Math.log(F.flow[i]/thr+1)*2.9, 2.2, 9.5);   // 예전 1.6~7 m 에서 1.35배로 넓혔다
    const rC=rM/CELL, rc=Math.ceil(rC);
    const cx=i%N, cz=(i/N)|0;
    for(let dz=-rc;dz<=rc;dz++) for(let dx=-rc;dx<=rc;dx++){
      const x=cx+dx, z=cz+dz;
      if(x<0||z<0||x>=N||z>=N) continue;
      const d=Math.hypot(dx,dz);
      if(d>rC) continue;
      const j=z*N+x;
      if(h[j]<=0.1) continue;
      // 가운데가 깊고 가장자리로 갈수록 얕아지는 접시 단면
      const dp=MAXD*(1-(d/rC)*(d/rC));
      if(dp>depth[j]){ depth[j]=dp; surf[j]=h[i]; }
      F.river[j]=1;
    }
  }
  let count=0;
  for(let i=0;i<N*N;i++){
    if(!F.river[i]) continue;
    count++;
    h[i]-=depth[i];
    // 수면은 중심선 지형고보다 조금 낮게 — 하도 전체에 걸쳐 평평하다
    F.wlev[i]=Math.max(h[i]+0.05, surf[i]-0.18);
  }
  // 수면은 가장 가까운 중심선 셀에서 값을 받아오므로 셀 단위 계단이 생긴다.
  // 하도 안에서만 몇 번 평활화하되, 원래 값에서 크게 벗어나지 않게 묶어 둔다.
  const w0=Float32Array.from(F.wlev), tw=new Float32Array(N*N);
  for(let it=0;it<20;it++){
    tw.set(F.wlev);
    for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){
      const i=z*N+x; if(!F.river[i]) continue;
      let sm=0,n=0;
      for(const o of [-1,1,-N,N,-N-1,-N+1,N-1,N+1])
        if(F.river[i+o]){ sm+=tw[i+o]; n++; }
      if(!n) continue;
      let v=tw[i]*0.25+(sm/n)*0.75;
      v=clamp(v, w0[i]-0.55, w0[i]+0.45);      // 둑을 넘거나 바닥을 뚫지 않게
      F.wlev[i]=Math.max(v, h[i]+0.03);
    }
  }
  stats.riverCells=count;
}

// 지형습윤지수 — 토양 수분·배수불량 예측에 쓰는 표준 지표
function computeTWI(){
  for(let i=0;i<N*N;i++){
    F.twi[i]=Math.log((F.flow[i]*CELL)/Math.max(0.004,F.slope[i]));
  }
}

/* ============================================================================
   5) 경사 · 거리장
   ========================================================================== */
function computeSlope(){
  const h=F.elev;
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const xm=Math.max(0,x-1), xp=Math.min(N-1,x+1);
    const zm=Math.max(0,z-1), zp=Math.min(N-1,z+1);
    const gx=(h[IDX(xp,z)]-h[IDX(xm,z)])/((xp-xm)*CELL);
    const gz=(h[IDX(x,zp)]-h[IDX(x,zm)])/((zp-zm)*CELL);
    F.slope[IDX(x,z)]=Math.hypot(gx,gz);
  }
}
// 다중 시작점 BFS 거리장 (m)
function distanceField(out, isSource){
  out.fill(1e9);
  const q=new Int32Array(N*N); let qs=0,qe=0;
  for(let i=0;i<N*N;i++) if(isSource(i)){ out[i]=0; q[qe++]=i; }
  while(qs<qe){
    const i=q[qs++], x=i%N, z=(i/N)|0, d=out[i]+CELL;
    for(let k=0;k<4;k++){
      const nx=x+[1,-1,0,0][k], nz=z+[0,0,1,-1][k];
      if(nx<0||nz<0||nx>=N||nz>=N) continue;
      const j=IDX(nx,nz);
      if(out[j]>d){ out[j]=d; q[qe++]=j; }
    }
  }
}

/* ============================================================================
   6) 기후 — 탁월풍 라인 스윕 지형성 강수
   ========================================================================== */
function climate(seed){
  const rnd=mulberry32(seed^0x1b873593);
  const dirs=[{x:1,z:0,name:'서풍'},{x:-1,z:0,name:'동풍'},{x:0,z:1,name:'북풍'},{x:0,z:-1,name:'남풍'}];
  windDir=dirs[(rnd()*4)|0];
  const h=F.elev, m=F.moist; m.fill(0);

  const horiz = windDir.x!==0;
  const lines = horiz?N:N;
  for(let l=0;l<lines;l++){
    let hum=1.0, prev=-10;
    for(let s=0;s<N;s++){
      const t = (horiz ? (windDir.x>0?s:N-1-s) : (windDir.z>0?s:N-1-s));
      const x = horiz? t : l;
      const z = horiz? l : t;
      const i = IDX(x,z);
      const e = h[i];
      if(e<=0){                              // 해상 — 수증기 공급
        hum=Math.min(1.4, hum+0.10);
        m[i]=1;
      }else{
        const rise=Math.max(0, e-Math.max(prev,0));
        // 강수량 = 보유 수증기 × (기저 + 상승률) — 상승할수록 많이 뿌리고 넘으면 마름
        const rain=hum*(0.020+rise*0.020)*P.rain;
        m[i]=clamp(rain*7,0,1);
        hum=Math.max(0, hum-rain);
        hum+=0.006;                          // 증발산 재공급
      }
      prev=e;
    }
  }
  // 수역 근접 보정 + 미세 변동
  const n=makePerlin(seed^0xc2b2ae35);
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=IDX(x,z);
    if(h[i]<=0) continue;
    const near=Math.exp(-F.dWater[i]/110)*0.40 + Math.exp(-F.dRiver[i]/45)*0.60;
    const jitter=n(x*0.035,z*0.035)*0.15;
    m[i]=m[i]*0.9 + near*0.8 + jitter;
  }
  // 분위수 정규화 — 절대 강수량과 무관하게 습윤/건조 대비를 확보하고,
  // 강수량 슬라이더는 전체 분포를 습한 쪽/마른 쪽으로 감마 이동시킨다
  const land=[];
  for(let i=0;i<N*N;i++) if(h[i]>0) land.push(i);
  land.sort((a,b)=>m[a]-m[b]);
  const cnt=Math.max(1,land.length-1), g=1/clamp(P.rain,0.3,1.6);
  for(let r=0;r<land.length;r++) m[land[r]]=Math.pow(r/cnt,g);
}

/* 분기공 지대 — 섬 어딘가에 열수 활동이 남은 자리를 만든다.
   화강암 관입체가 식으면서 남긴 열이 지표로 새어 나오는 곳으로 설정했다.
   유황이 여기에만 침전하므로 섬에서 딱 한 군데를 찾아가야 한다. */
let fumaCenter={x:0,z:0,r:0};
function hydrothermal(seed){
  F.fuma.fill(0);
  const rnd=mulberry32(seed^0x3c6ef372);
  // 암반이 드러난 고지대 가장자리를 우선한다 — 관입체 노출부
  const cand=[];
  for(let z=6;z<N-6;z+=2) for(let x=6;x<N-6;x+=2){
    const i=IDX(x,z);
    if(F.elev[i]<4||F.elev[i]>stats.hi*0.75) continue;
    if(F.slope[i]>0.55) continue;
    const b=F.biome[i];
    let w=(b===B.ROCK||b===B.SCREE)?3:(b===B.SCRUB||b===B.MEADOW)?1.5:0.4;
    cand.push([i,w]);
  }
  if(!cand.length){ fumaCenter={x:0,z:0,r:0}; return; }
  let tot=0; for(const c of cand) tot+=c[1];
  let pick=rnd()*tot, ci=cand[0][0];
  for(const c of cand){ pick-=c[1]; if(pick<=0){ ci=c[0]; break; } }
  const cx=ci%N, cz=(ci/N)|0;
  const R=(26+rnd()*14)/CELL;                    // 반경 26~40 m
  fumaCenter={x:(cx-N/2)*CELL, z:(cz-N/2)*CELL, r:R*CELL};
  const n=makePerlin(seed^0x2545f491);
  const rc=Math.ceil(R);
  for(let dz=-rc;dz<=rc;dz++) for(let dx=-rc;dx<=rc;dx++){
    const x=cx+dx, z=cz+dz;
    if(x<1||z<1||x>=N-1||z>=N-1) continue;
    const i=IDX(x,z);
    if(F.elev[i]<=0.5) continue;
    // 가장자리를 노이즈로 헐게 해 원형 자국이 보이지 않게 한다
    const d=Math.hypot(dx,dz)/R + n(x*0.05,z*0.05)*0.22;
    if(d>1) continue;
    F.fuma[i]=clamp(1-d*d,0,1);
  }
}

/* ============================================================================
   7) 바이옴 분류
   ========================================================================== */
function classify(){
  const h=F.elev, s=F.slope, m=F.moist, b=F.biome;
  let peak=0;
  for(let i=0;i<N*N;i++) if(h[i]>peak) peak=h[i];
  const HI=Math.max(30,peak);            // 임계값을 섬의 실제 기복에 맞춰 상대화

  // 육지 경사 분포에서 '노출 암반' 임계를 분위수로 잡는다 —
  // 침식 강도를 바꿔도 절벽 비율이 무너지지 않게 하기 위함
  const cells=[];
  for(let i=0;i<N*N;i++) if(h[i]>0) cells.push(i);
  const sv=cells.map(i=>s[i]).sort((a,b)=>a-b);
  const rockSlope = sv.length ? sv[Math.floor(sv.length*0.87)] : 1;

  // TWI 상위 = 물이 모이는데 빠지지 않는 곳 → 이탄지/습지
  const marshSet=new Uint8Array(N*N);
  const cand=cells.filter(i=>!F.river[i] && s[i]<rockSlope*0.55 && h[i]<HI*0.5);
  cand.sort((a,b)=>F.twi[b]-F.twi[a]);
  const nMarsh=Math.floor(cand.length*0.11);
  for(let k=0;k<nMarsh;k++) marshSet[cand[k]]=1;

  let land=0, coast=0;

  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=IDX(x,z), e=h[i];
    if(e<=0){ b[i] = e<-12 ? B.DEEP : B.SHELF; continue; }
    land++;
    if(F.dWater[i]<=6) coast++;
    if(F.fuma[i]>0.28 && !F.river[i]){ b[i]=B.FUMAROLE; continue; }
    if(F.river[i]){ b[i]=B.RIVER; continue; }
    const sl=s[i], mo=m[i];

    if(e<3.5 && sl<0.42)                       b[i]=B.BEACH;
    else if(e<8 && sl<0.25 && mo<0.35)         b[i]=B.DUNE;
    else if(sl>rockSlope)                      b[i]= e>HI*0.65 ? B.SCREE : B.ROCK;
    else if(e>HI*0.90)                         b[i]=B.SCREE;
    else if(marshSet[i] && mo>0.35)            b[i]=B.MARSH;
    else if(mo>0.50)                           b[i]= e>HI*0.45 ? B.CONIFER : B.BROADLEAF;
    else if(mo>0.22)                           b[i]= e>HI*0.62 ? B.CONIFER : B.MEADOW;
    else                                       b[i]=B.SCRUB;
  }
  stats.landCells=land; stats.peak=peak; stats.coastCells=coast;
  stats.hi=HI; stats.rockSlope=rockSlope;
}

/* ============================================================================
   8) 자원 배치 — 지질 규칙
   ========================================================================== */
let PROPS=[];
function placeResources(seed){
  PROPS=[];
  const rnd=mulberry32(seed^0x27d4eb2f);
  const h=F.elev, s=F.slope, m=F.moist, b=F.biome, tw=F.twi;
  const HI=stats.hi||60, RS=stats.rockSlope||0.7;

  // 적합도 0..1 — 각 광종의 실제 산출 환경을 근거로 함
  const suit={
    oak:i=> b[i]===B.BROADLEAF?1 : (b[i]===B.MEADOW?0.16:0),
    fir:i=> b[i]===B.CONIFER?1 : (b[i]===B.SCRUB&&h[i]>HI*0.55?0.15:0),
    // 부싯돌: 처트 단괴가 해빈 자갈·하상 자갈에 잔류
    flint:i=> (b[i]===B.BEACH?0.8:0) + (F.dRiver[i]<8&&h[i]>0?1:0),
    // 돌멩이: 하상 자갈, 해빈 원력, 애추 사면과 급사면 아래 붕적층
    pebble:i=> ((F.river[i]||F.dRiver[i]<8)?1:0) + (b[i]===B.BEACH?0.8:0)
             + (b[i]===B.SCREE?0.9:0) + (b[i]===B.ROCK?0.5:0) + (s[i]>RS*0.8?0.35:0),
    // 유황: 분기공에서 새어 나온 황화수소가 지표에서 산화해 노랗게 굳는다
    sulfur:i=> b[i]===B.FUMAROLE ? clamp(F.fuma[i]*1.5,0,1) : 0,
    // 화강암: 침식으로 드러난 급사면·암반 노두
    granite:i=> (b[i]===B.ROCK?1:0) + (b[i]===B.SCREE?0.8:0) + (s[i]>RS*0.7?0.4:0),
    // 점토: 하천 범람원의 세립 퇴적 — 저지·완경사·하천 근접
    clay:i=> ((h[i]<HI*0.35 && s[i]<0.26 && F.dRiver[i]<20)?1:0) + (b[i]===B.MARSH?0.6:0),
    // 모래: 해빈과 사구. 파도와 바람이 골라 쌓아 둔 규사다
    sand:i=> (b[i]===B.BEACH?1:0) + (b[i]===B.DUNE?0.85:0),
    reed:i=> (b[i]===B.MARSH?1:0) + (F.dRiver[i]<6&&h[i]>0?0.6:0),
    // 풀숲: 초원이 본진, 활엽수림 임상 하층과 습지 가장자리까지. 암반·해빈에는 안 남
    grass:i=> b[i]===B.MEADOW?1 : (b[i]===B.BROADLEAF?0.55 :
              (b[i]===B.MARSH?0.40 : (b[i]===B.SCRUB?0.35 :
              (b[i]===B.DUNE?0.18 : (b[i]===B.CONIFER?0.22:0))))),
    // 공작석: 구리 광화대의 산화대 — 중고도 암반에 소규모 맥
    copper:i=> ((b[i]===B.ROCK||b[i]===B.SCREE) && h[i]>HI*0.35)?1:0,
    // 석석: 비중이 커 하류 사광(placer)에 농집
    tin:i=> ((F.river[i]||F.dRiver[i]<6) && h[i]>0.5 && h[i]<HI*0.42)?1:0,
    // 늪철광: 혐기성 습지에서 철이 침전 — 이탄지 한정
    iron:i=> (b[i]===B.MARSH?1:0) + (m[i]>0.72&&h[i]<HI*0.28&&s[i]<0.22?0.45:0),
    // 석탄/이탄: 두꺼운 유기 퇴적이 압밀된 절벽 노두
    coal:i=> ((b[i]===B.ROCK&&h[i]<HI*0.7&&s[i]>RS*1.1)?1:0) + (b[i]===B.MARSH?0.3:0),
    // 섬아연석: 열수 광맥 광물 — 분기공 언저리 암반에 구리를 따라 붙는다
    zinc:i=> ((b[i]===B.ROCK||b[i]===B.SCREE)?1:0)*(0.45+clamp(F.fuma[i]*1.6,0,1)),
    // 방연석: 같은 열수 광맥이되 섬아연석보다 분기공에 덜 붙는다
    galena:i=> ((b[i]===B.ROCK||b[i]===B.SCREE)?1:0)*(0.35+clamp(F.fuma[i]*1.2,0,1)),
    // 진사: 유황과 같이 분기공 둘레에만 — 열수가 식으며 앉은 붉은 딱지다
    cinnabar:i=> F.fuma[i]>0.25 ? clamp(F.fuma[i]*1.5,0,1) : 0
  };

  // 정규화 보조값 — 보정 배치 점수 계산용
  let tmin=1e9,tmax=-1e9;
  for(let i=0;i<N*N;i++) if(h[i]>0){ if(tw[i]<tmin)tmin=tw[i]; if(tw[i]>tmax)tmax=tw[i]; }
  const tRange=Math.max(1e-3,tmax-tmin);
  const nS=i=>clamp(s[i]/RS,0,1), nE=i=>clamp(h[i]/HI,0,1),
        nT=i=>clamp((tw[i]-tmin)/tRange,0,1),
        dW=i=>Math.exp(-F.dWater[i]/50), dR=i=>Math.exp(-F.dRiver[i]/40);

  // 이상적인 환경이 없을 때 '그나마 가장 그럴듯한' 곳을 고르는 연속 점수.
  // suit와 달리 절대 0이 되지 않으므로 어떤 지형에서도 순위를 매길 수 있다.
  const fallback={
    oak:     i=> m[i]*0.6 + (1-nE(i))*0.4,
    fir:     i=> m[i]*0.4 + nE(i)*0.6,
    flint:   i=> dW(i)*0.6 + dR(i)*0.6 + nS(i)*0.2,
    granite: i=> nS(i)*0.7 + nE(i)*0.3,
    sulfur:  i=> F.fuma[i],
    pebble:  i=> dR(i)*0.6 + nS(i)*0.4 + dW(i)*0.3,
    clay:    i=> (1-nS(i))*0.5 + dR(i)*0.5 + (1-nE(i))*0.3,
    sand:    i=> dW(i)*0.9 + (1-nE(i))*0.4 + (1-nS(i))*0.3,
    reed:    i=> m[i]*0.5 + (1-nS(i))*0.3 + dW(i)*0.4,
    grass:   i=> m[i]*0.5 + (1-nS(i))*0.3 + (1-nE(i))*0.2,
    copper:  i=> nE(i)*0.6 + nS(i)*0.5,
    tin:     i=> dR(i)*0.8 + (1-nE(i))*0.3,
    iron:    i=> nT(i)*0.5 + m[i]*0.4 + (1-nS(i))*0.3,
    coal:    i=> nS(i)*0.6 + (1-nE(i))*0.3 + nT(i)*0.2,
    zinc:    i=> nS(i)*0.5 + nE(i)*0.4 + F.fuma[i]*0.6,
    galena:  i=> nS(i)*0.45 + nE(i)*0.45 + F.fuma[i]*0.5,
    cinnabar:i=> F.fuma[i]
  };

  // 육지가 좁으면 점유 반경을 줄인다 — 먼저 배치된 자원이 자리를 다 먹는 것을 방지
  const LAND=Math.max(1,stats.landCells||1);
  const occR = LAND>6000 ? 1 : 0;
  // 셀이 작아지면 셀당 확률을 그만큼 낮춰야 면적당 밀도가 유지된다
  const DSCALE=(CELL*CELL)/16;
  const occ=new Uint8Array(N*N);          // 노드 과밀 방지 격자
  // 암석류는 크기 편차를 훨씬 크게 준다 — 자갈부터 큰 바위까지 섞여야 자연스럽다
  const ROCKY={granite:1,pebble:1,flint:1,copper:1,iron:1,coal:1,zinc:1,galena:1,
               cinnabar:1};
  const push=(k,x,z)=>{
    const i=IDX(x,z);
    let sc=0.75+rnd()*0.6;                 // 공통 편차 0.75~1.35
    if(ROCKY[k]) sc*=0.7+rnd()*0.8;        // 암석은 여기에 0.7~1.5배를 더 곱한다
    PROPS.push({k, x:(x-N/2)*CELL+(rnd()-0.5)*CELL, z:(z-N/2)*CELL+(rnd()-0.5)*CELL,
                y:h[i], s:sc, r:rnd()*Math.PI*2});
  };
  const markOcc=(x,z,r)=>{
    for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){
      const nx=x+dx, nz=z+dz;
      if(nx>=0&&nz>=0&&nx<N&&nz<N) occ[IDX(nx,nz)]=1;
    }
  };

  const counts={}, forced={};

  // --- 1차: 지질 규칙에 따른 자연 배치 ---
  for(const R of RESOURCES){
    const fn=suit[R.k], isTree=(R.k==='oak'||R.k==='fir');
    let placed=0;
    for(let z=2;z<N-2 && placed<R.max;z++){
      for(let x=2;x<N-2 && placed<R.max;x++){
        const i=IDX(x,z);
        if(h[i]<=0.3) continue;
        const p=Math.min(1,fn(i))*R.d*DSCALE;
        if(p<=0 || rnd()>p) continue;
        push(R.k,x,z);
        if(!isTree) markOcc(x,z,occR);
        placed++;
      }
    }
    counts[R.k]=placed;
  }

  // --- 2차: 하한 미달 광종을 가장 적합한 잔여 지점에 보충 ---
  if(GUARANTEE){
    const land=[];
    for(let z=2;z<N-2;z++) for(let x=2;x<N-2;x++){
      const i=IDX(x,z); if(h[i]>0.3) land.push(i);
    }
    // 섬이 작으면 하한도 함께 줄인다. 단 절대 0이 되지는 않게 해
    // 어떤 지형에서도 제작 트리가 끊기지 않도록 한다.
    const scale=clamp(land.length/9000,0,1);
    const minOf=R=>Math.max(Math.ceil(R.min*0.35), Math.round(R.min*scale));

    // 광물부터 채운다 — 나무가 먼저 자리를 다 먹으면 좁은 섬에서 광물이 밀린다
    const order=RESOURCES.slice().sort((a,b)=>
      ((a.k==='oak'||a.k==='fir')?1:0)-((b.k==='oak'||b.k==='fir')?1:0));

    for(const R of order){
      if(!land.length) break;
      const need=minOf(R)-counts[R.k];
      if(need<=0) continue;
      const score=fallback[R.k];
      // 동점 구간이 한 곳에 뭉치지 않도록 미세 난수를 섞어 정렬
      const ranked=land.map(i=>({i,v:score(i)+rnd()*0.02})).sort((a,b)=>b.v-a.v);
      let add=0;
      // 간격을 넓은 쪽부터 좁혀가며 재시도
      for(let spread=Math.max(occR,1); spread>=0 && add<need; spread--){
        for(const c of ranked){
          if(add>=need) break;
          if(occ[c.i]) continue;
          const x=c.i%N, z=(c.i/N)|0;
          push(R.k,x,z); markOcc(x,z,spread);
          add++;
        }
      }
      // 그래도 모자라면 점유를 무시하고 최적지에 겹쳐 놓는다.
      // 육지 셀이 하나라도 있으면 이 단계에서 반드시 하한을 채운다.
      for(let k=0; add<need && ranked.length; k++){
        const c=ranked[k%ranked.length];
        const x=c.i%N, z=(c.i/N)|0;
        push(R.k,x,z); add++;
      }
      counts[R.k]+=add;
      if(add>0) forced[R.k]=add;
    }
  }

  stats.props=PROPS.length; stats.counts=counts; stats.forced=forced;
}

/* ============================================================================
   8-b) 바다 바닥 — 모래톱 · 바위 등성이 · 골
   ----------------------------------------------------------------------------
   바다 밑은 뭍에서 멀어질수록 깊어지는 매끈한 비탈 하나뿐이었다(사용자 지적: 물밑 지형이 단조롭다).
   세 가지 기복을 얹는다 — ① 느리게 굽이치는 모래톱 ② 날 선 바위 등성이(접힌 잡음 — 얕은 데서는 수면 밑 암초가 된다)
   ③ 길게 파인 골(해저 협곡). 그 위에 잔 울퉁불퉁.
   **뭍과 해안선은 건드리지 않는다** — 수심 1.2 m 보다 얕은 칸은 그대로 두고 거기서 3 m 더 깊어지며 차츰 듣게 하며,
   바닥이 물 밖(−0.9 m 위)으로 솟지도 않는다. 자원 배치(placeResources)가 끝난 뒤에 부르므로 같은 시드의 섬 · 자원 ·
   저장은 예전과 똑같다 — 달라지는 것은 물밑 모양뿐이다. 잡음도 제 씨앗을 따로 쓴다.
   ========================================================================== */
function shapeSeabed(seed){
  const a=makePerlin(seed^0x51ed270b), b=makePerlin(seed^0x2f0b4a13), c=makePerlin(seed^0x7a3d91c5), h=F.elev;
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=IDX(x,z), e=h[i];
    if(e>-1.2) continue;
    const k=clamp((-1.2-e)/3.0,0,1), wx=x*CELL, wz=z*CELL;
    let d=a(wx/90,wz/90)*1.6;                                   // ① 모래톱
    d+=Math.pow(1-Math.abs(b(wx/55,wz/55)),3)*4.6-1.0;          // ② 바위 등성이
    d-=Math.pow(1-Math.abs(c(wx/140,wz/140)),6)*5.5;            // ③ 골
    d+=a(wx/14+7.3,wz/14+3.1)*0.5;                              // 잔 울퉁불퉁
    /* ④ 암벽 — 얕은 모래 턱은 수심 2~5 m 에서 끝나고 거기서 5~8 m 뚝 떨어진다(사용자 요청: 모래가 끝나고 바위 절벽·암초가
       돼야 한다). 턱의 깊이는 섬을 돌며 달라진다. 땅 셰이더가 이 깊이 밑과 가파른 면을 바위로 칠한다 */
    const brk=3.6+1.6*b(wx/210+5.1,wz/210+2.7);
    d-=clamp((-e-brk)/0.5,0,1)*(5.0+3.0*a(wx/120+9.3,wz/120+4.1));
    h[i]=Math.min(e+d*k,-0.9);
  }
}

/* ============================================================================
   샘플링 API
   ========================================================================== */
function heightAt(wx,wz){
  const gx=clamp(wx/CELL+N/2,0,N-1.001), gz=clamp(wz/CELL+N/2,0,N-1.001);
  const x=gx|0, z=gz|0, fx=gx-x, fz=gz-z, i=IDX(x,z);
  const h=F.elev;
  return h[i]*(1-fx)*(1-fz)+h[i+1]*fx*(1-fz)+h[i+N]*(1-fx)*fz+h[i+N+1]*fx*fz;
}
// 하도 수면 표고 (이중선형)
function waterLevelAt(wx,wz){
  const gx=clamp(wx/CELL+N/2,0,N-1.001), gz=clamp(wz/CELL+N/2,0,N-1.001);
  const x=gx|0, z=gz|0, i=IDX(x,z);
  let best=0;
  for(const j of [i,i+1,i+N,i+N+1]) if(F.wlev[j]>best) best=F.wlev[j];
  return best;
}
function sampleAt(wx,wz){
  const gx=clamp(Math.round(wx/CELL+N/2),0,N-1), gz=clamp(Math.round(wz/CELL+N/2),0,N-1);
  const i=IDX(gx,gz);
  return {elev:F.elev[i],slope:F.slope[i],moist:F.moist[i],twi:F.twi[i],
          biome:F.biome[i],river:!!F.river[i],flow:F.flow[i]};
}
