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
  if(nativeOn()){ nativeRun(X=>X.cw_thermal(N,iters,talus,rate)); return; }   // C 판(12-native.js) — 결과는 아래와 한 비트도 다르지 않다
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
  if(nativeOn()){ nativeRun(X=>X.cw_hydraulic(N,seed>>>0,drops)); return; }   // C 판(12-native.js)
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
  if(nativeOn()){ nativeRun(X=>X.cw_smooth(N,passes,k)); return; }             // C 판(12-native.js)
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

    /* **염습지**(지형 판 5 · 사용자 요청) — 바닷가의 낮고 평평한 땅(1.8 m 밑 · 비탈 0.08 밑) 가운데 큰 잡음이 높은 데는 모래 해변 대신
       갯벌·갈대의 습지다(진흙 결 · 갈대 — 바이옴이 정한다) */
    if((P.tv|0)>=5 && e<1.8 && sl<0.08 && F.dWater[i]<=8 && SHP.vn3(x*0.045,z*0.045,0.5,hashStr(String(P.seed))&0xffff)>0.18) b[i]=B.MARSH;
    else if(e<3.5 && sl<0.42)                  b[i]=B.BEACH;
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

/* ── 바이옴마다 비탈을 다스린다(지형 판 5 · 사용자 요청) ─────────────────────────────
   바이옴마다 버틸 수 있는 비탈(높이/거리)이 다르다 — 모래 해변 12% · 습지 4% · 사구 30% · 풀밭 35% · 덤불 50% · 활엽수림 60% ·
   침엽수림 85% · 바위·너덜은 그대로. 그보다 가파른 칸은 이웃 낮은 칸으로 흙을 넘겨(열 침식처럼) 고르게 한다(여섯 번).
   하천과 그 둑(이웃 칸) · 바다는 손대지 않는다(물높이가 하천 판과 어긋나지 않게). 섬 배율을 키운 **뒤에** 부른다(CELL 이 m 다) */
function biomeSlopes(){
  const MAXS={}; MAXS[B.BEACH]=0.12; MAXS[B.MARSH]=0.04; MAXS[B.DUNE]=0.30; MAXS[B.MEADOW]=0.35; MAXS[B.SCRUB]=0.50;
  MAXS[B.BROADLEAF]=0.60; MAXS[B.CONIFER]=0.85; MAXS[B.FUMAROLE]=0.45;
  const h=F.elev, b=F.biome, R=F.river, keep=new Uint8Array(N*N);
  for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){ const i=IDX(x,z); if(R[i]||R[i-1]||R[i+1]||R[i-N]||R[i+N]||h[i]<=0.3) keep[i]=1; }
  for(let pass=0;pass<6;pass++){
    for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){ const i=IDX(x,z); if(keep[i]) continue; const m=MAXS[b[i]]; if(m===undefined) continue;
      const lim=m*CELL;
      for(const j of [i-1,i+1,i-N,i+N]){ if(keep[j]&&h[j]<=0.3) continue; const d=h[i]-h[j]; if(d>lim){ const mv=(d-lim)*0.25; h[i]-=mv; if(!R[j]) h[j]+=mv; } } }
  }
  computeSlope();
}
/* ============================================================================
   8) 자원 배치 — 지질 규칙
   ========================================================================== */
let PROPS=[];
/* 다 만든 섬(표고 · 하천 · 거리장)을 통째로 S 배로 키운다 — 바이옴을 정한 **뒤**, 자원을 놓기 **전**에 부른다.
   격자는 그대로 두고 칸 한 변(CELL)과 높이·거리(m)만 S 배가 된다. 비탈(F.slope — 비율)과 바이옴은 안 바뀐다.
   S 가 1 이면 아무것도 안 한다(예전 섬과 한 비트도 다르지 않다) */
/* ── 지형 판 2 — 피오르 · 골짜기 · 절벽과 단구 · 산릉과 탁상지 ─────────────────
   침식을 다 돌린 높이 지도에 큰 지형을 덧새긴다(사용자 요청). 하천·기후·식생·자원은 이 뒤에 정해지므로 물길은 새 골짜기를 따라 흐른다.
   **섬의 생김새가 바뀐다** — 그래서 지형 판(P.tv)이 2 일 때만 돈다. 판이 없는 옛 저장은 1 로 읽혀 예전 섬 그대로 열린다.
   크기는 만들 때의 칸(2.5 m)으로 적었다 — 6배 섬에서는 여섯 배다(피오르 너비 100 m 남짓 · 길이 2~5 km · 절벽 단 40 m 안팎).
     ① **산릉** — 얼룩진 구역마다 날 선 능선을 돋운다(알프스 꼴).  **탁상지** — 가장자리가 절벽인 평평한 꼭대기 셋.
     ② **단구와 절벽** — 얼룩진 구역의 높이를 계단으로 접는다: 평평한 턱과 그 사이의 벼랑.
     ③ **바닷가 절벽** — 얼룩진 구역에서는 뭍이 바다에서 곧장 솟는다(나머지는 예전처럼 완만한 해변).
     ④ **골짜기** — 높은 데서 가장 가파른 쪽으로 내려가며 U 자 꼴로 판다(빙하곡). 아래로 갈수록 넓어진다.
     ⑤ **피오르** — 바다에서 뭍 안쪽으로 굽이치며 파고드는 좁고 깊은 물길. 벽이 가파르다. */
/* 새긴 큰 지형의 자리(격자 칸) — k: fjord 피오르 · valley 골짜기 · mesa 탁상지. 길은 점의 줄(pts)이다. 시험·지도 표시에 쓴다 */
let LANDFORMS=[];
function terrainFeatures(seed){
  LANDFORMS=[];
  const e=F.elev, rnd=mulberry32((seed^0x7e44a1)>>>0), nA=makePerlin(seed^0x51ab7), nB=makePerlin(seed^0x99c31);
  let hi=0; for(let i=0;i<e.length;i++) if(e[i]>hi) hi=e[i];
  if(hi<8) return;
  const fb=(nz,x,z,o)=>{ let a=1,f=1,sm=0,t=0; for(let i=0;i<o;i++){ sm+=nz(x*f,z*f)*a; t+=a; a*=0.5; f*=2.03; } return sm/t; };
  /* ① 산릉 · ② 단구 · ③ 바닷가 절벽 — 칸마다 */
  for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){
    const i=IDX(x,z); let h=e[i]; if(h<=0.2) continue;
    const u=x/N, v=z/N;
    const kR=smoothstep(0.08,0.40,fb(nA,u*4.2+3.1,v*4.2-7.7,3));                    // 산릉이 서는 구역
    if(kR>0&&h>2){ const r=1-Math.abs(fb(nB,u*13+11,v*13+5,4)); h+=kR*Math.pow(r,3.2)*hi*0.62*smoothstep(2,hi*0.22,h); }
    /* 단구 — 높이를 계단으로 접되, 접기 전에 높이를 잔물결로 흔든다(안 흔들면 벼랑이 등고선을 그대로 따라 논두렁처럼 보인다).
       턱은 살짝 기울고(원래 비탈의 1/4) 벼랑은 단 높이의 끝 1할에 몰린다 */
    const kT=smoothstep(0.15,0.40,fb(nB,u*3.4-9.2,v*3.4+2.6,3));
    if(kT>0&&h>2.5){ const wv=hi*0.075*fb(nA,u*15+4.4,v*15-8.8,3), st=hi*0.19, hq=(h+wv)/st, q=Math.floor(hq), f=hq-q;
      h=lerp(h,Math.max(0.8,(q+0.25*f+0.75*smoothstep(0.88,0.99,f))*st-wv),kT); }
    const kC=smoothstep(0.14,0.40,fb(nA,u*5.0+21.4,v*5.0+13.9,3));                  // 바닷가가 절벽인 구역
    if(kC>0&&h<hi*0.30) h+=kC*hi*0.14*smoothstep(0.25,1.5,h)*(1-smoothstep(hi*0.18,hi*0.30,h));
    e[i]=h;
  }
  /* 탁상지 넷 — 꼭대기는 평평하고 둘레는 벼랑. 테두리는 길쭉하고 들쭉날쭉하다(둥근 원반이면 지어낸 티가 난다) */
  for(let k=0,tries=0;k<4&&tries<4000;tries++){
    const cx=40+rnd()*(N-80), cz=40+rnd()*(N-80), h0=e[IDX(cx|0,cz|0)]; if(h0<hi*0.12||h0>hi*0.5) continue;
    const R=8+rnd()*12, el=0.55+rnd()*0.9, rot=rnd()*3.1416, cr=Math.cos(rot), sr=Math.sin(rot), top=h0+hi*(0.16+rnd()*0.12), X=R*2.1; k++;
    LANDFORMS.push({k:'mesa',x:cx,z:cz,R});
    for(let dz=-X;dz<=X;dz++) for(let dx=-X;dx<=X;dx++){ const x=(cx+dx)|0, z=(cz+dz)|0; if(x<1||z<1||x>=N-1||z>=N-1) continue;
      const wob=1+0.62*fb(nA,x*0.045+k*9.3,z*0.045-k*4.1,3), d=Math.hypot(dx*cr+dz*sr,(dz*cr-dx*sr)/el)/wob, pf=1-smoothstep(R*0.86,R*1.05,d), i=IDX(x,z);
      if(pf>0&&e[i]>0.5) e[i]=Math.max(e[i],lerp(e[i],top+1.2*fb(nB,x*0.07,z*0.07,3)+(dx*cr+dz*sr)*0.03,pf)); } }
  /* 길을 따라 파는 도장 — 가운데 w0 칸은 바닥(floor), 그 밖 wall 칸에 걸쳐 벽이 선다(pw<1 가파른 벽 · >1 U 자) */
  const stamp=(cx,cz,w0,wall,floor,pw,cap)=>{ const R=Math.ceil(w0+wall);
    for(let dz=-R;dz<=R;dz++){ const z=Math.round(cz)+dz; if(z<1||z>=N-1) continue;
      for(let dx=-R;dx<=R;dx++){ const x=Math.round(cx)+dx; if(x<1||x>=N-1) continue;
        const d=Math.hypot(x-cx,z-cz); if(d>R) continue;
        const t=d<=w0?0:(d-w0)/wall, tg=floor+Math.pow(t,pw)*cap, i=IDX(x,z); if(tg<e[i]) e[i]=tg; } } };
  /* 뭉갠 높이(여섯 칸 평균을 두 번 흐린 것) — 골짜기 길은 큰 흐름을 따른다. 칸마다의 가장 가파른 쪽을 따르면 단구 모서리에서 직각으로 꺾였다 */
  const CS=6, CN=(N/CS)|0, sm=new Float32Array(CN*CN), tmp=new Float32Array(CN*CN);
  for(let cz=0;cz<CN;cz++) for(let cx=0;cx<CN;cx++){ let a=0; for(let dz=0;dz<CS;dz++) for(let dx=0;dx<CS;dx++) a+=e[IDX(cx*CS+dx,cz*CS+dz)]; sm[cz*CN+cx]=a/(CS*CS); }
  for(let it=0;it<2;it++){ tmp.set(sm); for(let cz=1;cz<CN-1;cz++) for(let cx=1;cx<CN-1;cx++){ const i=cz*CN+cx; sm[i]=(tmp[i]*2+tmp[i-1]+tmp[i+1]+tmp[i-CN]+tmp[i+CN])/6; } }
  const smAt=(x,z)=>{ const fx=clamp(x/CS-0.5,0,CN-1.001), fz=clamp(z/CS-0.5,0,CN-1.001), ix=fx|0, iz=fz|0, tx=fx-ix, tz=fz-iz, i=iz*CN+ix;
    return lerp(lerp(sm[i],sm[i+1],tx),lerp(sm[i+CN],sm[i+CN+1],tx),tz); };
  const eAt=(x,z)=>e[IDX(clamp(Math.round(x),1,N-2),clamp(Math.round(z),1,N-2))];
  /* 길 하나를 긋는다 — 뭉갠 높이의 비탈을 따라(up: 오르막 · 아니면 내리막) 굽이치며. 관성이 있어 급히 꺾이지 않는다 */
  const trace=(x,z,an,steps,up,stop)=>{ const pts=[], ph=rnd()*6.283, f1=0.045+rnd()*0.03;
    for(let st=0;st<steps;st++){ pts.push([x,z]); if(stop&&stop(x,z,st)) break;
      let gx=smAt(x+3,z)-smAt(x-3,z), gz=smAt(x,z+3)-smAt(x,z-3); const gl=Math.hypot(gx,gz);
      if(gl>1e-4){ const ga=Math.atan2(up?gz:-gz,up?gx:-gx); let d=(ga-an)%6.2832; if(d>3.1416) d-=6.2832; if(d<-3.1416) d+=6.2832; an+=clamp(d,-0.5,0.5)*0.16; }
      const a2=an+0.55*Math.sin(st*f1+ph)+0.22*Math.sin(st*f1*2.7+ph*1.7);
      x+=Math.cos(a2)*1.5; z+=Math.sin(a2)*1.5; if(x<4||z<4||x>N-5||z>N-5) break; }
    return pts; };
  /* ④ 걸린 골짜기 셋 — 높은 데서 바다(나 피오르)까지. 위는 좁고 아래로 갈수록 넓다 */
  for(let k=0,tries=0;k<3&&tries<6000;tries++){
    const x=30+rnd()*(N-60), z=30+rnd()*(N-60); if(eAt(x,z)<hi*0.42) continue;
    const pts=trace(x,z,Math.atan2(-(smAt(x,z+3)-smAt(x,z-3)),-(smAt(x+3,z)-smAt(x-3,z))),640,false,(px,pz)=>eAt(px,pz)<0.4);
    if(pts.length<60) continue; k++; LANDFORMS.push({k:'valley',pts});
    let fl=1e9; const wl=9+rnd()*4;
    pts.forEach((p,i)=>{ const sN=i/(pts.length-1); fl=Math.max(-0.4,Math.min(fl,eAt(p[0],p[1])-(1+hi*0.10*Math.sin(Math.PI*clamp(sN*1.1,0,1)))));
      stamp(p[0],p[1],(1.4+3.4*sN)*(1+0.25*Math.sin(i*0.09+k)),wl,fl,1.9,hi*0.8); });
  }
  /* ⑤ 피오르 다섯 — 섬 둘레를 고르게 나눠 바다에서 뭍 안쪽으로. 어귀는 넓고 깊으며 안으로 갈수록 좁아지고, 가지가 하나 갈라진다.
     끝머리는 U 자 골짜기로 이어져 산으로 올라간다(빙하가 판 골의 아랫도리가 물에 잠긴 것이 피오르다) */
  const fjord=(x,z,an,L,w,deep,arm)=>{
    const pts=trace(x,z,an,L,true,null); if(pts.length<12) return;
    LANDFORMS.push({k:'fjord',pts,arm:!arm});
    pts.forEach((p,i)=>{ const sN=i/(pts.length-1); stamp(p[0],p[1],(0.9+w*Math.pow(1-sN,0.8))*(1+0.28*Math.sin(i*0.13+w)),8.5,-(1.2+deep*(1-sN)),0.85,hi*0.75); });
    const q=pts[pts.length-1], q0=pts[Math.max(0,pts.length-6)], ha=Math.atan2(q[1]-q0[1],q[0]-q0[0]);
    if(arm){ const m=pts[(pts.length*(0.4+rnd()*0.2))|0], m0=pts[Math.max(0,((pts.length*0.4)|0)-5)];
      fjord(m[0],m[1],Math.atan2(m[1]-m0[1],m[0]-m0[0])+(rnd()<0.5?1:-1)*(0.75+rnd()*0.4),(L*0.42)|0,w*0.5,deep*0.55,false); }
    const vp=trace(q[0],q[1],ha,arm?(L*0.9)|0:(L*0.5)|0,true,(px,pz)=>eAt(px,pz)>hi*0.62); if(vp.length<10) return;
    const top=eAt(vp[vp.length-1][0],vp[vp.length-1][1])*0.8; LANDFORMS.push({k:'valley',pts:vp});
    vp.forEach((p,i)=>{ const sN=i/(vp.length-1); stamp(p[0],p[1],2.6-1.8*sN,11,-1.2+(top+1.2)*Math.pow(sN,1.5),1.9,hi*0.8); });
  };
  { const nF=5, a0=rnd()*6.283;
    for(let k=0;k<nF;k++){ const th=a0+(k+rnd()*0.6)/nF*6.283, cx=Math.cos(th), cz=Math.sin(th);
      let rc=0; for(let r=8;r<N/2-4;r++){ if(e[IDX((N/2+cx*r)|0,(N/2+cz*r)|0)]>0.5) rc=r; }
      if(rc<60) continue;
      fjord(N/2+cx*(rc+10),N/2+cz*(rc+10),th+Math.PI,Math.round(rc*(0.30+rnd()*0.22)/1.5),3.6+rnd()*2.4,3.4+rnd()*1.8,true); } }
}
/* ── 동굴 ───────────────────────────────────────────────────────────────────
   높이 지도로는 땅속 굴을 팔 수 없다. 대신 가파른 바위 비탈에 **바위 굴집**을 세운다 — 집채만 한 바위들이 둥글게 기대어 지붕을
   이룬 굴(32-caves.js 가 짓는다 · 입구는 비탈 아래쪽). **금속 광석은 그 안에 모인다**: 굴마다 가장 가까운 광석 열 몇 개를 굴 속
   바닥으로 옮긴다. 바깥에는 그만큼 화강암이 흔하다(placeResources 의 TVM). 자리는 섬마다 같다(시드) */
let CAVES=[];
const CAVE_ORE=['iron','copper','tin','zinc','galena','coal'];
const CAVE_GRID=new Map(), CAVE_G=48, caveKey=(gx,gz)=>(gx+2048)*4096+(gz+2048);
/* 그 자리가 굴(방 반지름 + pad) 안인가 — 그 방을 돌려준다. 덤불·나무·노거수가 굴 속에 서지 않게 하는 데, 화면의 바이옴 이름에 쓴다 */
function caveAt(x,z,pad){
  if(!CAVES.length) return null; pad=pad||0;
  const gx=Math.floor(x/CAVE_G), gz=Math.floor(z/CAVE_G);
  for(let az=-1;az<=1;az++) for(let ax=-1;ax<=1;ax++){ const a=CAVE_GRID.get(caveKey(gx+ax,gz+az)); if(!a) continue;
    for(const r of a){ const dx=x-r.x, dz=z-r.z, q=r.R+pad; if(dx*dx+dz*dz<q*q) return r; } }
  return null;
}
function caveSites(seed){
  CAVES=[]; CAVE_GRID.clear(); if((P.tv|0)<2) return;
  const rnd=mulberry32((seed^0xca7e5)>>>0), WS=CELL/GCELL, want=Math.round(9*WS*WS/4+6);
  let hi=0; for(let i=0;i<F.elev.length;i++) if(F.elev[i]>hi) hi=F.elev[i];
  const okAt=(x,z)=>{ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); if(gx<4||gz<4||gx>N-5||gz>N-5) return false;
    const i=IDX(gx,gz); return F.elev[i]>2.5&&!F.river[i]&&F.slope[i]<0.6; };
  /* 지형 판 6: 방 안으로 비탈이 솟아 들어오는 자리는 버린다 — 87 굴 중 4 개에서 산허리가 방 바닥을 뚫고 올라왔다(사용자 지적).
     방 가운데 바닥보다 0.55R 고리에서 1.2 m · 0.85R 고리에서 2.0 m 넘게 높은 데가 있으면 그 방은 안 된다 */
  const TV6=(P.tv|0)>=6;
  const bulge=rm=>{ for(let k=0;k<16;k++){ const a=k/16*6.283, c=Math.cos(a), s=Math.sin(a);
      if(heightAt(rm.x+c*rm.R*0.55,rm.z+s*rm.R*0.55)-rm.y>1.2||heightAt(rm.x+c*rm.R*0.85,rm.z+s*rm.R*0.85)-rm.y>2.0) return true; }
    return false; };
  for(let tries=0;tries<90000&&CAVES.length<want;tries++){
    const gx=6+((rnd()*(N-12))|0), gz=6+((rnd()*(N-12))|0), i=IDX(gx,gz), h=F.elev[i];
    if(h<3*WS||h>hi*0.8||F.river[i]||F.slope[i]<0.14||F.slope[i]>0.46) continue;
    const x=(gx-N/2)*CELL+(rnd()-0.5)*CELL*0.6, z=(gz-N/2)*CELL+(rnd()-0.5)*CELL*0.6;
    if(CAVES.some(c=>Math.hypot(c.x-x,c.z-z)<200)) continue;
    const yaw=Math.atan2(-(F.elev[i+N]-F.elev[i-N]),-(F.elev[i+1]-F.elev[i-1]));   // 내리막 쪽 — 입구가 그리로 난다
    /* 굴 하나는 방 1~3 개가 등고선을 따라 이어진 것이다. 방마다 터진 데(open): 입구 · 이웃 방 쪽 */
    const rooms=[{x,z,y:heightAt(x,z),R:5.4+rnd()*1.6,open:[yaw]}], nR=1+((rnd()*3)|0);
    let dir=yaw+(rnd()<0.5?1:-1)*(1.45+rnd()*0.25);
    if(TV6&&bulge(rooms[0])) continue;
    for(let k=1;k<nR;k++){ const a=rooms[k-1], R=4.6+rnd()*1.6, D=a.R+R+0.8, bx=a.x+Math.cos(dir)*D, bz=a.z+Math.sin(dir)*D;
      if(!okAt(bx,bz)) break;
      const rm={x:bx,z:bz,y:heightAt(bx,bz),R,open:[dir+Math.PI]}; if(TV6&&bulge(rm)) break;
      a.open.push(dir); rooms.push(rm); dir+=(rnd()-0.5)*1.1; }
    CAVES.push({x,z,y:rooms[0].y,yaw,rooms,seed:(rnd()*1e9)|0});
  }
  for(const c of CAVES) for(const r of c.rooms){ const k=caveKey(Math.floor(r.x/CAVE_G),Math.floor(r.z/CAVE_G)); let a=CAVE_GRID.get(k); if(!a) CAVE_GRID.set(k,a=[]); a.push(r); r.cave=c; }
  /* 광석을 굴 속으로 — 굴마다 600 m 안의 가장 가까운 것부터 방 하나에 여덟~열두 개 */
  const ore=[]; for(let k=0;k<PROPS.length;k++){ const p=PROPS[k]; if(CAVE_ORE.indexOf(p.k)>=0) ore.push(p); }
  for(const c of CAVES){
    const near=[]; for(const p of ore){ if(p.cave) continue; const d=(p.x-c.x)*(p.x-c.x)+(p.z-c.z)*(p.z-c.z); if(d<600*600) near.push([d,p]); }
    near.sort((a,b)=>a[0]-b[0]);
    const n=Math.min(near.length,c.rooms.length*(8+((rnd()*5)|0))), put=[];
    for(let k=0;k<n;k++){ const p=near[k][1], rm=c.rooms[k%c.rooms.length]; let px=rm.x, pz=rm.z;
      for(let t=0;t<14;t++){ const a=rnd()*6.283, r=0.8+rnd()*(rm.R-2.4); px=rm.x+Math.cos(a)*r; pz=rm.z+Math.sin(a)*r; if(!put.some(q=>Math.hypot(q[0]-px,q[1]-pz)<1.6)) break; }
      put.push([px,pz]); p.x=px; p.z=pz; p.y=heightAt(px,pz); p.s=Math.min(p.s,0.95); p.cave=1; }
    c.ore=n;
  }
  if(TV6) oreToCaves(rnd);
  PROPS=PROPS.filter(p=>p.cave||!caveAt(p.x,p.z,4.4));   // 굴 자리에 서 있던 나무·바위는 치운다(지붕을 뚫고 나온다)
  if(TV6) surfaceRocks();
}
/* 지형 판 6 — **광석은 굴 속에만**(늪철광은 늪에). 굴마다 가까운 것을 채우고도 남은 바깥 광석 중 굴에 너무 적게 든 광종(열둘
   아래)은 가장 가까운 굴 방으로 더 옮기고, 나머지는 surfaceRocks 가 그 자리의 바위로 바꾼다 */
function oreToCaves(rnd){
  const rooms=[]; for(const c of CAVES) for(const r of c.rooms) rooms.push(r);
  if(!rooms.length) return;
  for(const k of CAVE_ORE){
    let have=0; const out=[];
    for(const p of PROPS) if(p.k===k){ if(p.cave) have++; else if(!(k==='iron'&&bogAt(p.x,p.z))) out.push(p); }
    for(let j=0;have<12&&j<out.length;j++,have++){ const p=out[j];
      let best=rooms[0], bd=1e18; for(const r of rooms){ const d=(r.x-p.x)*(r.x-p.x)+(r.z-p.z)*(r.z-p.z); if(d<bd){ bd=d; best=r; } }
      const a=rnd()*6.283, rr=0.8+rnd()*(best.R-2.4);
      p.x=best.x+Math.cos(a)*rr; p.z=best.z+Math.sin(a)*rr; p.y=heightAt(p.x,p.z); p.s=Math.min(p.s,0.95); p.cave=1; best.cave.ore=(best.cave.ore|0)+1; }
  }
}
function bogAt(x,z){ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2);
  return gx>=0&&gz>=0&&gx<N&&gz<N&&F.biome[IDX(gx,gz)]===B.MARSH; }
/* 바깥에 남은 광석 · 낮은 데 화강암을 그 자리의 바위로 — 어느 바위인지는 땅이 정한다.
   · 분기공 언저리(fuma · 분기공 중심에서 반지름의 2.4 배 안) → 현무암: 화산이 흘린 용암이 식은 검은 돌. 기둥 결로 쪼개진다
   · 바다 가까운 낮은 모래땅(해빈·사구 · 물에서 25 m 안) → 사암: 모래가 굳어 켜가 진 돌
   · 낮은 땅(높이 0.35 아래 · 바위밭이 아니면 0.5 아래) → 석회암: 얕은 바다 밑에 쌓인 조개껍데기가 굳어 솟은 흰 돌
   · 그 밖은 화강암. 크기는 원래 몸 반지름을 넘지 않게 줄인다(겹침 정리를 다시 하지 않아도 이웃과 안 부딪힌다).
   화강암은 섬에 예순 개 넘게 남긴다(화입법 · 석재가 끊기지 않게) */
function surfaceRocks(){
  let hi=0; for(let i=0;i<F.elev.length;i++) if(F.elev[i]>hi) hi=F.elev[i];
  let gran=0; for(const p of PROPS) if(p.k==='granite') gran++;
  for(const p of PROPS){
    if(p.cave||!(CAVE_ORE.indexOf(p.k)>=0||p.k==='granite')) continue;
    if(p.k==='iron'&&bogAt(p.x,p.z)) continue;                       // 늪철광은 늪에 그대로
    const gx=Math.round(p.x/CELL+N/2), gz=Math.round(p.z/CELL+N/2); if(gx<0||gz<0||gx>=N||gz>=N) continue;
    const i=IDX(gx,gz), b=F.biome[i], h=F.elev[i];
    const fd=Math.hypot(p.x-fumaCenter.x,p.z-fumaCenter.z)/Math.max(1,fumaCenter.r);
    const k = (F.fuma[i]>0.10||fd<2.4) ? 'basalt'
            : (h<hi*0.20&&(b===B.BEACH||b===B.DUNE||F.dWater[i]<25)) ? 'sandstone'
            : (h<hi*0.35||(h<hi*0.50&&b!==B.ROCK&&b!==B.SCREE)) ? 'karst' : 'granite';
    if(k===p.k) continue;
    /* 화강암은 일부만 바꾼다 — 현무암 지대 넷에 셋 · 낮은 땅 넷에 하나 · 바닷가 여덟에 하나(바닷가 벼랑 밑 바위가 몽땅 사암이 되면 화강암 섬이 아니다) */
    if(p.k==='granite'){ if(gran<=60||(hashStr('rk|'+Math.round(p.x)+'|'+Math.round(p.z))&7)>=(k==='basalt'?6:k==='karst'?2:1)) continue; gran--; }
    else if(k==='granite') gran++;
    p.s=Math.min(p.s,p.s*PROP_FOOT[p.k]/PROP_FOOT[k]); p.k=k;
  }
}
function worldRescale(S){
  S=(S>=1&&S<=6)?Math.round(S):1;                      // 1~6배(6배 = 한 변 11.5 km)
  setWorldScale(S);
  if(S===1) return;
  const e=F.elev, w=F.wlev, a=F.dWater, b=F.dRiver;
  for(let i=0;i<e.length;i++){ e[i]*=S; w[i]*=S; a[i]*=S; b[i]*=S; }
  fumaCenter.x*=S; fumaCenter.z*=S; fumaCenter.r*=S;
}
async function placeResources(seed){    // async — 긴 고리 사이 숨을 돌린다(breathe — 90-init.js · 난수 차례는 그대로)
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
               cinnabar:1,basalt:1,karst:1,sandstone:1};
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
    await breathe();
    const fn=suit[R.k], isTree=(R.k==='oak'||R.k==='fir');
    let placed=0;
    if(!fn){ counts[R.k]=0; continue; }                 // 현무암 · 석회암 · 사암은 흩뿌리지 않는다 — surfaceRocks 가 바꿔 세운다
    /* 키운 섬(배율 2·3)은 칸 하나가 4·9배 넓다 — 넓이당 밀도를 지키려면 칸에 여럿이 서야 하고(DSCALE 이 확률을 그만큼 올린다 ·
       1 을 넘는 몫은 그 수만큼 세운다), 상한(max)도 넓이만큼 는다. 배율 1 은 예전 코드 그대로다(난수 차례가 같아야 같은 섬이다) */
    /* 지형 판 2: 금속 광석은 겉에 절반만 나고(나머지는 굴 속에 모인다 — caveSites) 화강암이 그만큼 흔하다 */
    const TVM=(P.tv|0)>=2?(R.k==='granite'?1.7:CAVE_ORE.indexOf(R.k)>=0?0.6:1):1;
    const WS=CELL/GCELL, cap=R.max*WS*WS*Math.max(1,TVM);
    for(let z=2;z<N-2 && placed<cap;z++){
      if(!(z&63)) await breathe();
      for(let x=2;x<N-2 && placed<cap;x++){
        const i=IDX(x,z);
        if(h[i]<=0.3) continue;
        const p=Math.min(1,fn(i))*R.d*DSCALE*TVM;
        if(WS===1){
          if(p<=0 || rnd()>p) continue;
          push(R.k,x,z);
          if(!isTree) markOcc(x,z,occR);
          placed++;
        }else{
          if(p<=0) continue;
          const whole=Math.floor(p), n=whole+(rnd()<p-whole?1:0);
          for(let k=0;k<n&&placed<cap;k++){ push(R.k,x,z); placed++; }
          if(n&&!isTree) markOcc(x,z,occR);
        }
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

  await breathe(); resolveOverlaps();
  await breathe(); caveSites(seed);                                     // 동굴 자리를 잡고 광석을 그 안으로 옮긴다(지형 판 2)
  await breathe(); cragSites(seed);                                     // 벼랑에 박힌 큰 바위 무리(33-crags.js)
  await breathe(); if(typeof geoSites==='function') geoSites(seed);     // 지열 지대 — 온천 · 간헐천 · 진흙 웅덩이 · 석회화 단구(35-geo.js · 지형 판 5)
  for(const k in counts) counts[k]=0; for(const p of PROPS) counts[p.k]=(counts[p.k]||0)+1;
  stats.props=PROPS.length; stats.counts=counts; stats.forced=forced;
}

/* ============================================================================
   8-a) 자원끼리 겹치지 않게
   ----------------------------------------------------------------------------
   위 배치는 칸마다 주사위만 굴려서, 먼저 선 자원이 있는 칸에도 또 세웠다(빈자리 표시는 '하한 채우기' 에만 썼다) —
   한 섬에 몸이 있는 자원 5,387 개 중 224 쌍이 서로 파고들었다(화강암+화강암 · 공작석+화강암 · 전나무+화강암 …).
   **배치를 다 정한 뒤에** 고친다. 난수를 더 뽑지 않으므로 지형·다른 자원의 자리는 예전 그대로다(같은 시드 = 같은 섬).
   · 드문 것(표의 max 가 작은 것)부터 자리를 잡고, 뒤에 오는 것이 앞의 것과 겹치면 **비켜 놓는다** — 부딪친 것에서
     멀어지는 쪽부터 30° 씩 돌려 열세 방향, 처음 자리에서 4 m 안 · 뭍(높이 0.3 m 위)이어야 한다. 끝내 자리가 없으면 뺀다.
   · 반지름은 생김새 크기(`PROP_FOOT` × 크기) — 바위는 30-props.js `ROCK_R` 를 다 빚은 겉의 최댓값까지 키운 것 · 나무 줄기 · 점토/모래 둔덕.
   · 점토·모래(납작한 둔덕)는 저희끼리만 겹침을 본다 — 바위·나무가 그 위에 서는 것은 자연스럽다.
   · 풀·갈대는 옮기지 않고, 바위·줄기 속(반지름의 0.85 안)에 난 것만 뺀다.
   · 저장과 맞추기 — 뺀 것은 `gone`, 옮긴 것은 처음 자리(`ox`·`oz`)를 적어 둔다. `PROP_ORIG` 는 고치기 전 차례 그대로라
     번호만 적힌 옛 저장이 이걸로 찾고, 자리로 찾는 저장(92-save.js `findSavedProp`)은 처음 자리로도 찾는다.
   ========================================================================== */
/* 바위는 다 빚은 뒤 울퉁불퉁한 겉이 `ROCK_R` 보다 최대 1.25배(방연석은 정육면체로 당겨 1.67배) 나간다 — 섬 하나에서 잰 몸 반지름의 최댓값 */
const PROP_FOOT={granite:2.25,copper:1.31,iron:1.19,coal:1.19,zinc:1.06,galena:1.42,cinnabar:1.0,tin:1.0,sulfur:0.73,
                 basalt:1.75,karst:1.9,sandstone:1.9,
                 flint:0.18,pebble:0.13, oak:0.6,fir:0.5, clay:1.9,sand:2.0};
const PROP_FLAT={clay:1,sand:1}, PROP_SOFT={grass:1,reed:1};
let PROP_ORIG=[];
function resolveOverlaps(){
  PROP_ORIG=PROPS.slice();
  const rank={}; RESOURCES.forEach(R=>rank[R.k]=R.max);
  const order=PROPS.map((p,i)=>i).filter(i=>PROP_FOOT[PROPS[i].k]).sort((a,b)=>(rank[PROPS[a].k]-rank[PROPS[b].k])||(a-b));
  const C=4, G=new Map(), key=(x,z)=>(x+4096)*8192+(z+4096), MAXR=3.8;
  const add=p=>{ const k=key(Math.floor(p.x/C),Math.floor(p.z/C)); let a=G.get(k); if(!a){ a=[]; G.set(k,a); } a.push(p); };
  const rOf=p=>PROP_FOOT[p.k]*p.s;
  const near=(x,z,R,fn)=>{ for(let gz=Math.floor((z-R)/C);gz<=Math.floor((z+R)/C);gz++) for(let gx=Math.floor((x-R)/C);gx<=Math.floor((x+R)/C);gx++){
      const a=G.get(key(gx,gz)); if(a) for(const q of a){ const r=fn(q); if(r) return r; } } return null; };
  const hit=(p,x,z)=>near(x,z,rOf(p)+MAXR,q=>{
    const fp=!!PROP_FLAT[p.k]; if(fp!==!!PROP_FLAT[q.k]) return null;
    const r=rOf(p)+rOf(q)+(fp?0:0.15); return (x-q.x)*(x-q.x)+(z-q.z)*(z-q.z)<r*r?q:null; });
  const elevAt=(x,z)=>{ const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2);
    return (gx<2||gz<2||gx>N-3||gz>N-3)?-1:F.elev[IDX(gx,gz)]; };
  let moved=0, dropped=0;
  for(const i of order){
    const p=PROPS[i], q=hit(p,p.x,p.z);
    if(q){
      let a0=Math.atan2(p.z-q.z,p.x-q.x); if(p.x===q.x&&p.z===q.z) a0=(i*2.39996)%6.2832;
      const D=rOf(p)+rOf(q)+0.2; let ok=false;
      for(let t=0;t<13&&!ok;t++){
        const a=a0+(t&1?1:-1)*Math.ceil(t/2)*0.5236, nx=q.x+Math.cos(a)*D, nz=q.z+Math.sin(a)*D;
        if((nx-p.x)*(nx-p.x)+(nz-p.z)*(nz-p.z)>16) continue;
        const e=elevAt(nx,nz); if(e<=0.3||hit(p,nx,nz)) continue;
        p.ox=p.x; p.oz=p.z; p.x=nx; p.z=nz; p.y=e; ok=true;
      }
      if(!ok){ p.gone=true; dropped++; continue; }
      moved++;
    }
    add(p);
  }
  for(const p of PROPS) if(PROP_SOFT[p.k]&&near(p.x,p.z,MAXR,q=>!PROP_FLAT[q.k]&&!q.gone&&
      (p.x-q.x)*(p.x-q.x)+(p.z-q.z)*(p.z-q.z)<(rOf(q)*0.85)**2)){ p.gone=true; dropped++; }
  PROPS=PROPS.filter(p=>!p.gone);
  stats.overlap={moved,dropped};
}
/* 착륙 자리 — 보급선(30-props.js `makeShip`)이 앉는 네모와 사람이 깨는 자리 둘레의 자원을 뺀다.
   배 로컬(앞 −z) 네모 |x|<9.2 · −8.6<z<9 와 깨는 자리 3 m 안. 풀은 배 몸통 밑(|x|<3.4)과 깨는 자리만 뺀다(날개 밑 풀은 둔다) */
function clearLanding(L){
  const c=Math.cos(L.th), s=Math.sin(L.th);
  for(const p of PROPS){
    const dx=p.x-L.x, dz=p.z-L.z, lx=dx*c-dz*s, lz=dx*s+dz*c, soft=!!PROP_SOFT[p.k];
    const inBox=Math.abs(lx)<(soft?3.4:9.2)+(soft?0:(PROP_FOOT[p.k]||0)*p.s)&&lz>-8.6-(soft?0:2)&&lz<9+(soft?0:2);
    const sp=Math.hypot(p.x-L.sx,p.z-L.sz)<3+(PROP_FOOT[p.k]||0)*p.s;
    if(inBox||sp) p.gone=true;
  }
  PROPS=PROPS.filter(p=>!p.gone);
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
  if((P.tv|0)>=4) seaTrenches(seed);
}
/* ── 바다 밑의 갈라진 틈과 해구(지형 판 4 · 사용자 요청) ─────────────────────────────
   피오르·골짜기를 판 것과 같은 도장으로 **바다 밑을 판다** — 물 밑 칸만, 더 깊게만 고친다(뭍과 해안선은 그대로).
     ① **해저 협곡** — 피오르의 어귀에서 바깥 바다로 이어지는 깊고 좁은 골. 바깥으로 갈수록 깊어져(−12 → −95 m) 끝은 검푸른 낭떠러지다.
     ② **갈라진 틈** — 섬 둘레의 대륙붕을 물가와 나란히 가르는 좁은 금(폭 10~20 m · 바닥 −95 m). 거의 곧게 뻗다 꺾이고, 가끔 가지를 친다.
   깊이는 표고 텍스처의 밑(−100 m)에 맞춰 −95 m 에서 멈춘다. 물 셰이더가 깊이만큼 빛을 먹어 검게 가라앉는다 */
function seaTrenches(seed){
  const h=F.elev, rnd=mulberry32((seed^0x5ea7c1)>>>0), FLOOR=-95;
  const stamp=(cx,cz,w0,wall,floor)=>{ const R=Math.ceil(w0+wall);
    for(let dz=-R;dz<=R;dz++){ const z=Math.round(cz)+dz; if(z<1||z>=N-1) continue;
      for(let dx=-R;dx<=R;dx++){ const x=Math.round(cx)+dx; if(x<1||x>=N-1) continue;
        const i=IDX(x,z), e=h[i]; if(e>-1.5) continue;                                // 물 밑만
        const d=Math.hypot(x-cx,z-cz); if(d>R) continue;
        const t=d<=w0?0:(d-w0)/wall, tg=floor+(e-floor)*Math.pow(Math.min(1,t),0.55);   // 가파른 벽 — 둘레의 바닥에 이어진다
        if(tg<e) h[i]=Math.max(FLOOR,tg); } } };
  const line=(x,z,an,steps,w,f0,f1,zig,branch)=>{
    for(let st=0;st<steps;st++){ const s=st/steps; if(x<4||z<4||x>N-5||z>N-5) break;
      stamp(x,z,w*(1-0.4*s)+0.3,2.2,f0+(f1-f0)*Math.min(1,s*1.6));
      an+=(rnd()-0.5)*zig; if(rnd()<0.03) an+=(rnd()<0.5?1:-1)*0.6;                     // 이따금 꺾인다
      if(branch&&rnd()<0.012) line(x,z,an+(rnd()<0.5?1:-1)*(0.6+rnd()*0.5),(steps-st)*0.4|0,w*0.6,f0,f1,zig,false);
      x+=Math.cos(an)*1.3; z+=Math.sin(an)*1.3; } };
  /* ① 피오르 어귀에서 바깥으로 */
  if(typeof LANDFORMS!=='undefined') for(const L of LANDFORMS){ if(L.k!=='fjord'||L.arm) continue;
    const p0=L.pts[0], an=Math.atan2(p0[1]-N/2,p0[0]-N/2);
    line(p0[0],p0[1],an,90+((rnd()*80)|0),1.6+rnd()*1.4,-14,FLOOR+3,0.25,true); }
  /* ② 대륙붕을 가르는 틈 — 섬 둘레의 얕은 바다(−6~−45 m)에서 물가와 나란히 뻗는 좁고 깊은 금. 바깥 바다는 이미 깊어(−95 m 남짓)
     거기 판 금은 안 보인다 */
  for(let k=0,tries=0;k<9&&tries<8000;tries++){ const x=8+rnd()*(N-16), z=8+rnd()*(N-16), i=IDX(x|0,z|0); if(h[i]>-6||h[i]<-45) continue; k++;
    line(x,z,Math.atan2(z-N/2,x-N/2)+(rnd()<0.5?1:-1)*(1.571+(rnd()-0.5)*0.6),40+((rnd()*60)|0),0.7+rnd()*0.5,FLOOR,FLOOR,0.12,true); }
}

/* ============================================================================
   샘플링 API
   ========================================================================== */
/* ── 잔 기복(지형 판 3) ─────────────────────────────────────────────────────
   격자 한 칸은 15 m(6배 섬)다 — 그 안은 판판한 쌍선형 면이라 발밑이 운동장 같았다. 칸 안에 **둔덕과 골**을 더한다:
   되풀이되는 높이 텍스처(22-ground-textures.js `gndReliefTex` · 31 m 에 한 장 — 8 m·4 m 둔덕, 2 m 골, 1 m 잔 굴곡)를
   ±0.35 m 로 얹는다. 물가·하천·바다 밑은 뺀다(`RELIEF.M` — 가림막 0~255 · 물에서 한 칸 반까지 0).
   · **`heightAt` 이 이 높이를 돌려준다** — 사람이 걷는 땅 · 나무·바위·풀이 앉는 자리 · 짓는 자리가 다 이 면이다.
   · 그리는 쪽은 사람 둘레의 촘촘한 **덧판**(20-terrain.js `terrainPatch` — 0.75 m 격자)이 같은 식으로 그린다.
     먼 땅(칸마다 정점 하나)에는 안 보인다 — 46 m 밖의 30 cm 는 두 화소가 안 된다.
   · 표고장(`F.elev`)은 그대로다. 그래서 하천·물·그림자·지도는 안 바뀐다.
   · 지형 판 3 부터(`P.tv`). 그 전 판의 섬은 기복이 없다(물체의 높이가 저장과 달라지지 않게) */
const RELIEF={on:false, amp:0.70, M:null, G:null};   // G: 땅의 거칠기(0 고운 모래·진흙 ~ 255 자갈·암반) — 프랙털의 비를 정한다
/* 높이 텍스처를 그 자리에서 읽는다(0~1) — 덧판 셰이더의 textureLod(uRel,(M2·p+(17,3))/31).r 과 같은 값(쌍선형 · 되풀이) */
function reliefT(wx,wz){
  const Q=GND.relQ, u=(0.8253*wx+0.5646*wz+17)/31*256-0.5, v=(-0.5646*wx+0.8253*wz+3)/31*256-0.5;
  const ix=Math.floor(u), iy=Math.floor(v), fx=u-ix, fy=v-iy, x0=ix&255, x1=(ix+1)&255, y0=(iy&255)<<8, y1=((iy+1)&255)<<8;
  return (Q[y0+x0]*(1-fx)+Q[y0+x1]*fx)*(1-fy)+(Q[y1+x0]*(1-fx)+Q[y1+x1]*fx)*fy;
}
/* 둘째 겹(7.5 m 에 한 장 — 2 m·1 m 둔덕, 반 미터 골) — 셰이더의 textureLod(uRel,(M3·p+(5,41))/7.5).r 과 같은 값 */
function reliefT2(wx,wz){
  const Q=GND.relQ, u=(-0.3233*wx+0.9463*wz+5)/7.5*256-0.5, v=(-0.9463*wx-0.3233*wz+41)/7.5*256-0.5;
  const ix=Math.floor(u), iy=Math.floor(v), fx=u-ix, fy=v-iy, x0=ix&255, x1=(ix+1)&255, y0=(iy&255)<<8, y1=((iy+1)&255)<<8;
  return (Q[y0+x0]*(1-fx)+Q[y0+x1]*fx)*(1-fy)+(Q[y1+x0]*(1-fx)+Q[y1+x1]*fx)*fy;
}
/* **프랙털의 비는 땅의 거칠기를 따른다**(사용자 요청) — 겹을 하나 내려갈 때마다 높이가 줄어드는 비(r)가 고운 땅(모래·진흙·습지)은
   0.20, 거친 땅(자갈밭·암반·가파른 비탈)은 0.75 다. 고운 땅은 큰 둔덕만 순하게 굽이치고, 거친 땅은 잔 굴곡이 살아 울퉁불퉁하다.
   거칠기(`RELIEF.G`)는 바이옴과 비탈에서 정한다. 사람 둘레의 덧판이 같은 식으로 그린다(20-terrain.js — 표고 텍스처의 B) */
const RELIEF_GRAIN=(()=>{ const a=new Uint8Array(16).fill(70); a[B.BEACH]=18; a[B.DUNE]=28; a[B.MARSH]=22; a[B.MEADOW]=60; a[B.BROADLEAF]=95; a[B.CONIFER]=95;
  a[B.SCRUB]=125; a[B.RIVER]=150; a[B.ROCK]=205; a[B.SCREE]=255; a[B.FUMAROLE]=170; a[B.SHELF]=18; a[B.DEEP]=18; return a; })();
/* 가림막 — 물(바다·하천)에서 한 칸은 0 · 그다음 칸은 절반 · 그 밖은 1. 낮은 뭍(0.6~2.6 m)에서 차츰 선다 */
function reliefMask(){
  const M=RELIEF.M||(RELIEF.M=new Uint8Array(N*N)), h=F.elev, W=new Uint8Array(N*N);
  M.fill(0); RELIEF.on=false; TERR_U.uTri.value=0;
  if((P.tv|0)<3||typeof GND==='undefined'||!GND.relQ) return;
  for(let i=0;i<N*N;i++) W[i]=(h[i]<=0.3||F.river[i])?2:0;
  for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){ const i=z*N+x; if(W[i]) continue;
    if(W[i-1]===2||W[i+1]===2||W[i-N]===2||W[i+N]===2||W[i-N-1]===2||W[i-N+1]===2||W[i+N-1]===2||W[i+N+1]===2) W[i]=1; }
  for(let z=2;z<N-2;z++) for(let x=2;x<N-2;x++){ const i=z*N+x; if(W[i]) continue;
    const near=W[i-1]===1||W[i+1]===1||W[i-N]===1||W[i+N]===1;
    M[i]=Math.round(255*(near?0.5:1)*smoothstep(0.6,2.6,h[i])); }
  { const G=RELIEF.G||(RELIEF.G=new Uint8Array(N*N)), T=new Uint8Array(N*N);                // 거칠기 — 바이옴 + 비탈, 한 번 흐린다
    for(let i=0;i<N*N;i++) T[i]=Math.min(255,RELIEF_GRAIN[F.biome[i]]+Math.max(0,F.slope[i]-0.3)*190);
    G.set(T); for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){ const i=z*N+x; G[i]=(T[i]*4+T[i-1]+T[i+1]+T[i-N]+T[i+N])>>3; } }
  RELIEF.on=true; TERR_U.uTri.value=1;
}
function heightAt(wx,wz){
  const gx=clamp(wx/CELL+N/2,0,N-1.001), gz=clamp(wz/CELL+N/2,0,N-1.001);
  const x=gx|0, z=gz|0, fx=gx-x, fz=gz-z, i=IDX(x,z);
  const h=F.elev, a=(1-fx)*(1-fz), b=fx*(1-fz), c=(1-fx)*fz, d=fx*fz;
  if(!RELIEF.on) return h[i]*a+h[i+1]*b+h[i+N]*c+h[i+N+1]*d;
  /* 지형 판 3 — 바탕은 **그려지는 세모 면**이다(칸의 빗금은 10–01 — 20-terrain.js `terrainLodIndex`). 쌍선형 면은 칸이 뒤틀린 데서
     메시와 한 뼘~1 m 어긋나, 먼 비탈의 나무·바위·풀이 뜨거나 묻혔다(사용자 지적). 사람 둘레의 덧판도 같은 면을 쓴다(`uTri`) */
  const y=fx+fz<=1?h[i]+(h[i+1]-h[i])*fx+(h[i+N]-h[i])*fz:h[i+N+1]+(h[i+N]-h[i+N+1])*(1-fx)+(h[i+1]-h[i+N+1])*(1-fz);
  const M=RELIEF.M, m=M[i]*a+M[i+1]*b+M[i+N]*c+M[i+N+1]*d;
  if(!(m>0)) return y;
  const G=RELIEF.G, r=0.20+0.55/255*(G[i]*a+G[i+1]*b+G[i+N]*c+G[i+N+1]*d);         // 프랙털의 비 — 거칠수록 잔 겹이 크다
  return y+m*(RELIEF.amp/255)*((reliefT(wx,wz)-0.5)+r*0.5*(reliefT2(wx,wz)-0.5));
}
/* 그 자리의 땅 기울기(∂h/∂x · ∂h/∂z) — heightAt 의 차분이라 잔 기복까지 든다. e: 재는 폭(m). 돌려주는 배열은 돌려 쓴다 */
const _gSl=[0,0];
function groundSlope(wx,wz,e){ _gSl[0]=(heightAt(wx+e,wz)-heightAt(wx-e,wz))/(2*e); _gSl[1]=(heightAt(wx,wz+e)-heightAt(wx,wz-e))/(2*e); return _gSl; }
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
