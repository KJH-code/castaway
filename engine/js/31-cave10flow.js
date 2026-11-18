/* ── 동굴 판 10 — 석회암 굴의 입체 유석 덮개 (안 A — 껍데기 따라 부풀린 막) ─────────────────────────────────────────
   굴 껍데기(31-cave10.js A2)가 다 지어지고 장식(31-cave10deco.js)과 가림 굽기(31-cave10mat.js cmAoWork)가 끝나면, 석회암 굴(karst)의 벽을 타고
   흘러내린 유석을 **두께가 있는 막**으로 덮는다. 껍데기 셰이더가 칠하던 유석(CM_BODY 의 부채)은 덮개가 켜져 있으면 karst 전체에서 끈다(CM_FSO).
   · 자리(자리-1) — 스밈 = 절리 면(굴 씨 방위 · 단조 휨 간격 1.2~4.3 m) × 켜 경계(y = off + (j+0.12)·b) 가 껍데기 벽 세모를 함께 가로지르는 점 ·
     켜 스밈(절리 없이 켜를 따라 넓게 나오는 판 유석 — 직각 방위 5 m · 낮은 몫) · 있음 = cv10H(칸, 켜, 굴 씨) < 젖음 몫(굴 층 마름 · 보통 · 화려) × 깊이 몫 × 지붕 몫
   · 흐름 — 0.1 m 걸음으로 중력의 접평면 쪽 · 걸음마다 지어진 껍데기 위 가장 가까운 점으로 되붙인다 · 처마(떨어짐) · 바닥(격자 F 의 내리막 · 판판하면 둥근 혀) · 입구 · 휴석 웅덩이 · 껍데기 밖에서 멈춘다
   · 꼴 — 흐름마다 두께 장(둥근 볼록 단면 · 아래 끝 둥근 혀 여럿 · 볼록 덩이 · 비탈 테라스) → p-노름(4)으로 합친다(합류에 이음매 없음) · 막 밖은 −1.5 cm(4 cm 안에 묻힘) ·
     덮인 껍데기 세모(+ h>0 인 변을 가진 이웃 — 닫힐 때까지)를 k×k 로 나눠(변 위의 점은 나눠 쓴다) 밑점(껍데기 세모 평면 위) + 보간 법선 × h 로 띄운다 · 세 점이 다 h≤0 인 작은 세모는 버린다
     → 막의 열린 모서리는 늘 두 끝이 묻힌 데에만 생긴다
   · 그리기 — 램버트 + onBeforeCompile + envPatch(직접 — 섬을 다 지은 뒤 만드는 재질) · 빛 투과(빛깔마다 감싸기 · 얇은 가장자리의 호박빛 비침) · 화소 무늬(세로 홈 결 · 둥근 턱 · 바닥 미세 휴석)
     · renderOrder −1(껍데기보다 먼저 — 덮인 껍데기 화소는 깊이 시험에서 떨어진다) · 8 m 덩이로 나눠 한 프레임에 하나씩 붙인다
   · 결정론 — 제 해시(cv10H(정수, 정수, c.seed^상수)) · 흐름마다 mulberry32((c.seed^0xf105^열쇠)>>>0) 만 쓴다. X.rnd · X.prnd · Math.random 없음 ·
     결과는 짓는 차례 · 시간 조각 · 예산과 상관없다 · 굴 격자 · 껍데기 position/normal/index · rec.cols · CV10.picks · 장식은 읽기만 한다(줍기 · 몸 막기 없음 — 껍데기 겉으로 친다)
   이름은 cvfs · CVFS · cv10Flow 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다). 설계는 docs/notes/caves.md */
const CVFS={ on:true, budget:1.0, maxTri:30000, k:3, cell:8, q:[], cur:null, tEnd:0, hooked:false, mat:null, geo:null, dbg:false,
  /* 꼴 상수(사진 판정 뒤 손질하기 쉽게 여기 모은다 · 길이 m) */
  SH:{
    jSp:1.9, bSp:5.0, bK:0.35,                       // 절리 칸(휨 전 1.9 m → 1.2~4.3 m) · 켜 스밈 칸(직각 방위) · 켜 스밈 몫
    tier:[0.05,0.40,0.80], cap:[[0,6],[15,40],[40,80]],   // 굴 층(마름 · 보통 · 화려 — 셰이더 wsh 와 같은 갈래)마다 젖음 몫 · 흐름 수 상한
    fhLo:0.8, fhHi:7.5, nyLo:-0.35, dIn:10.6, sep:0.8,    // 스밈 걸러냄 — 바닥 위 높이 · 처마 밑 아님 · 입구에서 10.6 m(aSky<0.12) · 서로 떨어짐
    step:0.1, L:[2.5,8], drip:-0.35, flNy:0.7, flL:[0.6,2.0], flSl:0.03, ent:6, dam:2.5,   // 따라가기
    w0:[0.12,0.25], w1:[0.4,1.2], wB:[0.4,0.8], fan:[1.1,1.5],   // 너비 — 목 · 아래 · 켜 스밈의 목 · 바닥 부채 배율
    T:[0.03,0.12], Tfl:0.03, tng:[0.25,0.35], tngL:0.8,  // 두께 — 벽 막 · 바닥 · 처마 혀(얼어붙은 폭포) · 혀 길이
    lobe:0.5, lobeC:0.35, terA:0.30, terSp:[0.3,0.6],    // 볼록 덩이(+50%) · 덩이 칸 · 비탈 테라스 세기 · 간격
    ext:[0.10,0.45],                                      // 아래 끝 둥근 혀가 나가는 길이(끝 너비 비)
    capW:0.35, eye:[1.0,2.2], capEye:0.10, capFl:0.04, curv:0.45, hIn:0.005, bury:-0.015, buryW:0.04, ring:0.35 },
  /* 빛 상수(#define 으로 박는다 — 바꾸면 재질을 다시 짜야 먹는다 · 열쇠에 든다). 바탕은 선형 · 휘도는 껍데기가 칠하던 유석(fcol ≈ 0.80)에 맞춤 */
  OPT:{
    /* 사진의 비(p4 1 : 0.84 : 0.62 · p1 · p2 1 : 0.62 : 0.32)는 따뜻한 관광 조명이 든 값이라 횃불((1, 0.56, 0.25))을 한 번 더 곱하면 R 만 넘쳐 납작한 주황이 됐다 —
       바탕은 거의 무채(석회암 CP_LIME 쯤) · 꿀 쪽만 채도를 남긴다 · 휘도는 fcol(0.80) 대신 0.50 · 0.45 — 껍데기는 가림 · 오목 · 젖음으로 바탕이 0.4~0.5 까지
       내려가는데 덮개는 그 짐이 없다. 잰 값(굴 9 · 벽 2.5 m · 횃불): 바탕 (0.58,0.54,0.47) 에서 덮개 화소 평균 (219,117,44) ↔ 같은 자리 껍데기 (189,128,56) — 덮개가 더 밝고 더 붉었다 */
    alb:[0.50,0.50,0.46],         // 얇은 데 · 크림(1 : 1 : 0.92 — 횃불 앞에서 1 : 0.6 : 0.25 쯤)
    albT:[0.52,0.44,0.32],        // 두꺼운 데 · 꿀(1 : 0.85 : 0.62) — 홈 골 · 굵은 줄 · 턱 그늘도 이쪽으로
    thick:[0.05,0.25],            // 크림 → 꿀로 넘어가는 두께
    sigA:[2.0,6.0,14.0],          // 흡수(1/m) — 투과 빛깔이 두께대로 짙어진다(Beer–Lambert)
    mfp:0.008,                    // 산란 거리(m) — 투과 감쇠
    wrap:[0.40,0.26,0.19],        // 감싸기(빛깔마다 — Jensen 2001 대리석 확산 길이 R 8.5 · G 5.6 · B 4.0 mm 에 비례)
    soft:0.45,                    // 난반사에서 잔 결을 지우는 몫(산란 거리보다 잔 결)
    tcol:[1.0,0.55,0.12], tDelta:0.35, tPow:3.0, tK:1.6, edge:0.10,   // 투과 빛깔(사진 p5 · p6) · 굽힘 · 모임 · 세기 · 자유 가장자리 폭(m)
    rDry:0.55, rWet:0.20, f0Dry:0.045, f0Wet:0.02, wetD:0.58, wetSat:0.25 } };
const cvfsT=()=>performance.now()>CVFS.tEnd;
const cvfsSS=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const cvfsOn=()=>CVFS.on&&typeof cmOK==='function'&&cmOK();

/* ── 바탕 — 껍데기 세모 · 3 차원 칸 해시 · 꼭짓점 둘레(CSR) · 법선 부호 · 꼭짓점 굽이 ───────────────────────────── */
const cvfsCK=(ix,iy,iz)=>((ix+32768)*65536+(iy+32768))*65536+(iz+32768);
function* cvfsCtx(rec){
  const g=rec.mesh.geometry, P=g.attributes.position.array, N=g.attributes.normal.array, I=g.index.array, nv=g.attributes.position.count, nt=I.length/3;
  const X={rec,c:rec.c,P,N,I,nv,nt,sky:g.attributes.aSky.array,deep:g.attributes.aDeep.array,ao:g.attributes.aAo?g.attributes.aAo.array:null,
    FN:new Float32Array(nt*3), cells:new Map(), deg:new Int32Array(nv+1), vt:null, kap:new Float32Array(nv), bv:new Uint8Array(nv), sign:1, eLen:0};
  const FN=X.FN, cells=X.cells, M=0.35; let el=0, en=0;
  for(let t=0;t<nt;t++){ if((t&15)===0&&t&&cvfsT()) yield;
    const a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
    const ux=P[b]-P[a], uy=P[b+1]-P[a+1], uz=P[b+2]-P[a+2], vx=P[c]-P[a], vy=P[c+1]-P[a+1], vz=P[c+2]-P[a+2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.hypot(nx,ny,nz)||1; FN[t*3]=nx/l; FN[t*3+1]=ny/l; FN[t*3+2]=nz/l;
    el+=Math.hypot(ux,uy,uz)+Math.hypot(vx,vy,vz); en+=2;
    const x0=Math.floor(Math.min(P[a],P[b],P[c])-M), x1=Math.floor(Math.max(P[a],P[b],P[c])+M), y0=Math.floor(Math.min(P[a+1],P[b+1],P[c+1])-M), y1=Math.floor(Math.max(P[a+1],P[b+1],P[c+1])+M),
      z0=Math.floor(Math.min(P[a+2],P[b+2],P[c+2])-M), z1=Math.floor(Math.max(P[a+2],P[b+2],P[c+2])+M);
    for(let ix=x0;ix<=x1;ix++) for(let iy=y0;iy<=y1;iy++) for(let iz=z0;iz<=z1;iz++){ const k=cvfsCK(ix,iy,iz); let L=cells.get(k); if(!L) cells.set(k,L=[]); L.push(t); }
    X.deg[I[t*3]+1]++; X.deg[I[t*3+1]+1]++; X.deg[I[t*3+2]+1]++; }
  X.eLen=el/Math.max(1,en);
  yield; const dg=X.deg; for(let v=0;v<nv;v++) dg[v+1]+=dg[v];
  const vt=X.vt=new Int32Array(dg[nv]), fp=dg.slice(0,nv);
  for(let t=0;t<nt;t++){ vt[fp[I[t*3]]++]=t; vt[fp[I[t*3+1]]++]=t; vt[fp[I[t*3+2]]++]=t; }
  yield;
  /* 꼭짓점 굽이 κ(변마다 |Δn|/|Δp| 의 큰 값) · 껍데기 가장자리 변(세모 하나만 가진 변)의 꼭짓점 */
  for(let t=0;t<nt;t++){ if((t&63)===0&&t&&cvfsT()) yield;
    for(let e=0;e<3;e++){ const a=I[t*3+e], b=I[t*3+(e+1)%3], pa=a*3, pb=b*3;
      const dp=Math.hypot(P[pa]-P[pb],P[pa+1]-P[pb+1],P[pa+2]-P[pb+2]), dn=Math.hypot(N[pa]-N[pb],N[pa+1]-N[pb+1],N[pa+2]-N[pb+2]), k=dp>1e-6?dn/dp:0;
      if(k>X.kap[a]) X.kap[a]=k; if(k>X.kap[b]) X.kap[b]=k;
      if(cvfsEdgeN(X,a,b)<2){ X.bv[a]=1; X.bv[b]=1; } } }
  /* 법선이 굴 안쪽을 보는지 — 벽 세모 예순 개의 안쪽 0.3 m 가 빈 데인지 투표(31-cave10deco.js cvdTris 와 같은 법) */
  let vote=0, nw=0; const wall=[]; for(let t=0;t<nt;t++) if(Math.abs(FN[t*3+1])<0.6) wall.push(t);
  for(let k=0;k<Math.min(60,wall.length);k++){ const t=wall[(k*wall.length/60)|0], a=I[t*3]*3, mx=P[a], my=P[a+1], mz=P[a+2], nx=N[a], nz=N[a+2];
    const s1=cv10Samp(rec,mx+nx*0.3,mz+nz*0.3), in1=s1.n>0&&my>s1.f&&my<s1.c, s2=cv10Samp(rec,mx-nx*0.3,mz-nz*0.3), in2=s2.n>0&&my>s2.f&&my<s2.c; vote+=(in1?1:0)-(in2?1:0); nw++; }
  X.sign=vote>=0?1:-1;
  return X;
}
/* 변 (a,b) 를 가진 세모 수 · 목록(out 에) */
function cvfsEdgeN(X,a,b,out){ const vt=X.vt, I=X.I; let n=0; for(let k=X.deg[a];k<X.deg[a+1];k++){ const t=vt[k]; if(I[t*3]===b||I[t*3+1]===b||I[t*3+2]===b){ n++; if(out) out.push(t); } } return n; }

/* 껍데기 위 가장 가까운 점 — o.{x,y,z,t,u,v,w(무게중심),nx,ny,nz(보간 법선 · 안쪽)} · 칸에 아무것도 없으면 둘레 27 칸 · 그래도 없으면 −1 */
function cvfsClosest(X,x,y,z,o){
  let best=1e18; const P=X.P, I=X.I;
  for(let pass=0;pass<2&&best>=1e18;pass++){
    const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z), R=pass;
    for(let dx=-R;dx<=R;dx++) for(let dy=-R;dy<=R;dy++) for(let dz=-R;dz<=R;dz++){ const L=X.cells.get(cvfsCK(ix+dx,iy+dy,iz+dz)); if(!L) continue;
      for(let q=0;q<L.length;q++){ const t=L[q], a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
        const r=cvfsTriPt(P[a],P[a+1],P[a+2],P[b],P[b+1],P[b+2],P[c],P[c+1],P[c+2],x,y,z);
        if(r<best){ best=r; o.t=t; o.u=_cvfsB[0]; o.v=_cvfsB[1]; o.w=_cvfsB[2]; } } } }
  if(best>=1e18) return -1;
  const t=o.t, a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3, N=X.N, u=o.u, v=o.v, w=o.w;
  o.x=P[a]*u+P[b]*v+P[c]*w; o.y=P[a+1]*u+P[b+1]*v+P[c+1]*w; o.z=P[a+2]*u+P[b+2]*v+P[c+2]*w;
  let nx=N[a]*u+N[b]*v+N[c]*w, ny=N[a+1]*u+N[b+1]*v+N[c+1]*w, nz=N[a+2]*u+N[b+2]*v+N[c+2]*w; const l=(Math.hypot(nx,ny,nz)||1)*X.sign;
  o.nx=nx/l; o.ny=ny/l; o.nz=nz/l; return Math.sqrt(best);
}
/* 점–세모 가장 가까운 점(Ericson 5.1.5) — 거리² · 무게중심은 _cvfsB */
const _cvfsB=new Float64Array(3);
function cvfsTriPt(ax,ay,az,bx,by,bz,cx,cy,cz,px,py,pz){
  const abx=bx-ax, aby=by-ay, abz=bz-az, acx=cx-ax, acy=cy-ay, acz=cz-az, apx=px-ax, apy=py-ay, apz=pz-az, B=_cvfsB;
  const d1=abx*apx+aby*apy+abz*apz, d2=acx*apx+acy*apy+acz*apz; let u,v,w;
  if(d1<=0&&d2<=0){ u=1; v=0; w=0; }
  else{ const bpx=px-bx, bpy=py-by, bpz=pz-bz, d3=abx*bpx+aby*bpy+abz*bpz, d4=acx*bpx+acy*bpy+acz*bpz;
    if(d3>=0&&d4<=d3){ u=0; v=1; w=0; }
    else{ const vc=d1*d4-d3*d2;
      if(vc<=0&&d1>=0&&d3<=0){ const s=d1/(d1-d3); u=1-s; v=s; w=0; }
      else{ const cpx=px-cx, cpy=py-cy, cpz=pz-cz, d5=abx*cpx+aby*cpy+abz*cpz, d6=acx*cpx+acy*cpy+acz*cpz;
        if(d6>=0&&d5<=d6){ u=0; v=0; w=1; }
        else{ const vb=d5*d2-d1*d6;
          if(vb<=0&&d2>=0&&d6<=0){ const s=d2/(d2-d6); u=1-s; v=0; w=s; }
          else{ const va=d3*d6-d5*d4;
            if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){ const s=(d4-d3)/((d4-d3)+(d5-d6)); u=0; v=1-s; w=s; }
            else{ const dn=1/(va+vb+vc); v=vb*dn; w=vc*dn; u=1-v-w; } } } } } }
  B[0]=u; B[1]=v; B[2]=w;
  const qx=ax*u+bx*v+cx*w-px, qy=ay*u+by*v+cy*w-py, qz=az*u+bz*v+cz*w-pz; return qx*qx+qy*qy+qz*qz;
}

/* ── 스밈 — 절리 × 켜 경계 ────────────────────────────────────────────────────────────────────────────────── */
function cvfsSeedCtx(X){
  const c=X.c, P=c._P||cv10Prep(c), cs=cv10H(c.seed|0,71,0x5eed), SH=CVFS.SH, tier=(cs*3.3)%1, ti=tier<0.35?0:(tier<0.80?1:2);
  const a=cs*6.283185307179586, cr=SH.cap[ti];
  return {cs, b:Math.max(P.b||1,0.3), off:P.off||0, ti, wsh:SH.tier[ti], dx:Math.cos(a), dz:Math.sin(a), ph:cs*17, sk:0.2*(((cs*3.1)%1)-0.5),
    nMax:Math.round(cr[0]+(cr[1]-cr[0])*cv10H(c.seed|0,7,0xf1c3)), sd:(c.seed|0)};
}
/* 갈래 f 의 칸 좌표 u(x,y,z) — 0 절리(굴 씨 방위 · 단조 휨 — 셰이더 가짜 절리와 같은 방위) · 1 켜 스밈(직각 방위 · 고른 칸) */
const cvfsU=(S,f,x,y,z)=>{ if(f===0){ const q=(x*S.dx+z*S.dz+S.sk*y)/CVFS.SH.jSp; return q+0.2*Math.sin(1.3*q+S.ph)+0.08*Math.sin(3.7*q+S.ph); } return (-x*S.dz+z*S.dx)/CVFS.SH.bSp; };
function* cvfsSeeps(X){
  const S=X.S=cvfsSeedCtx(X), SH=CVFS.SH, P=X.P, I=X.I, FN=X.FN, rec=X.rec, cand=[], sd=S.sd;
  const U=new Float64Array(3), Y=new Float64Array(3), o={};
  for(let t=0;t<X.nt;t++){ if((t&127)===0&&t&&cvfsT()) yield;
    if(Math.abs(FN[t*3+1])>=0.6) continue;
    const a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
    Y[0]=P[a+1]; Y[1]=P[b+1]; Y[2]=P[c+1]; const y0=Math.min(Y[0],Y[1],Y[2]), y1=Math.max(Y[0],Y[1],Y[2]);
    const j0=Math.ceil((y0-S.off)/S.b-0.12), j1=Math.floor((y1-S.off)/S.b-0.12); if(j1<j0) continue;
    for(let f=0;f<2;f++){
      U[0]=cvfsU(S,f,P[a],P[a+1],P[a+2]); U[1]=cvfsU(S,f,P[b],P[b+1],P[b+2]); U[2]=cvfsU(S,f,P[c],P[c+1],P[c+2]);
      const u0=Math.min(U[0],U[1],U[2]), u1=Math.max(U[0],U[1],U[2]);
      for(let kk=Math.floor(u0);kk<=Math.floor(u1);kk++){
        const Uc=kk+0.5+0.4*(cv10H(kk,f,sd^0x51f)-0.5); if(Uc<u0||Uc>u1) continue;
        for(let j=j0;j<=j1;j++){ const Yj=S.off+(j+0.12)*S.b;
          /* 무게중심 (1−β1−β2, β1, β2) 에서 u = Uc · y = Yj 를 함께 푼다(세모 안에서 선형) */
          const fa=U[0]-Uc, fb=U[1]-Uc, fc=U[2]-Uc, ga=Y[0]-Yj, gb=Y[1]-Yj, gc=Y[2]-Yj;
          const m11=fb-fa, m12=fc-fa, m21=gb-ga, m22=gc-ga, det=m11*m22-m12*m21; if(Math.abs(det)<1e-12) continue;
          const b1=(-fa*m22+ga*m12)/det, b2=(-ga*m11+fa*m21)/det, b0=1-b1-b2; if(b0<0||b1<0||b2<0) continue;
          const x=P[a]*b0+P[b]*b1+P[c]*b2, y=P[a+1]*b0+P[b+1]*b1+P[c+1]*b2, z=P[a+2]*b0+P[b+2]*b1+P[c+2]*b2;
          const N=X.N; let nx=N[a]*b0+N[b]*b1+N[c]*b2, ny=N[a+1]*b0+N[b+1]*b1+N[c+1]*b2, nz=N[a+2]*b0+N[b+2]*b1+N[c+2]*b2; const nl=(Math.hypot(nx,ny,nz)||1)*X.sign; nx/=nl; ny/=nl; nz/=nl;
          if(ny<=SH.nyLo) continue;
          if(cv10V(rec,x,y,z)>0.3) continue;                                         // 땅 겉 면
          const hl=Math.hypot(nx,nz)||1, s=cv10Samp(rec,x+nx/hl*0.5,z+nz/hl*0.5); if(s.n<=0) continue;
          const fh=y-s.f; if(fh<SH.fhLo||fh>SH.fhHi||s.d<SH.dIn) continue;
          const vq=Math.floor((f===0?(-x*S.dz+z*S.dx):(x*S.dx+z*S.dz))/4), ki=kk*131+f, kj=j*977+vq;
          const pr=S.wsh*cvfsSS(6,16,s.d)*(0.75+0.25*(1-cvfsSS(3,15,s.h-s.c)))*(f?SH.bK:1);
          if(cv10H(ki,kj,sd^0xf1a5)>=pr) continue;
          cand.push({x,y,z,t,f,ki,kj,pri:cv10H(ki,kj,sd^0xf1b7),key:(Math.imul(ki,73856093)^Math.imul(kj,19349663))>>>0}); } } } }
  cand.sort((p,q)=>p.pri-q.pri||p.t-q.t||p.y-q.y);
  const out=[]; for(const p of cand){ if(out.length>=S.nMax) break; let ok=true; for(const q of out){ const d=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z); if(d<SH.sep){ ok=false; break; } } if(ok) out.push(p); }
  X.nCand=cand.length; return out;
}

/* ── 흐름 따라가기 ─────────────────────────────────────────────────────────────────────────────────────────── */
function* cvfsTrace(X,sp){
  const SH=CVFS.SH, rec=X.rec, rnd=mulberry32((X.c.seed^0xf105^sp.key)>>>0), o={};
  const L=SH.L[0]+(SH.L[1]-SH.L[0])*rnd(), flMax=SH.flL[0]+(SH.flL[1]-SH.flL[0])*rnd();
  const r1=rnd(), r2=rnd(), r3=rnd(), r4=rnd(), r5=rnd(), r6=rnd();
  if(cvfsClosest(X,sp.x,sp.y,sp.z,o)<0) return null;
  const dams=rec.deco&&rec.deco.log?rec.deco.log.filter(e=>e.t==='dam'):[];
  const pts=[{x:o.x,y:o.y,z:o.z,nx:o.nx,ny:o.ny,nz:o.nz,s:0,fl:0}]; let s=0, fl=0, end='len', x=o.x, y=o.y, z=o.z, nx=o.nx, ny=o.ny, nz=o.nz;
  for(let it=0;it<240;it++){ if((it&7)===7&&cvfsT()) yield;
    let dx,dy,dz;
    if(ny>SH.flNy){                                                          // 바닥 — 격자 F 의 내리막
      const e=0.25, f1=cv10Samp(rec,x+e,z).f, f2=cv10Samp(rec,x-e,z).f, f3=cv10Samp(rec,x,z+e).f, f4=cv10Samp(rec,x,z-e).f, gx=(f1-f2)/(2*e), gz=(f3-f4)/(2*e), sl=Math.hypot(gx,gz);
      if(sl<SH.flSl){ end='pool'; break; }
      dx=-gx/sl; dz=-gz/sl; dy=-sl; const dn=dx*nx+dy*ny+dz*nz; dx-=nx*dn; dy-=ny*dn; dz-=nz*dn; }
    else{ dx=nx*ny; dy=-1+ny*ny; dz=nz*ny; }
    const dl=Math.hypot(dx,dy,dz); if(dl<1e-4){ end='stuck'; break; }
    const tx=x+dx/dl*SH.step, ty=y+dy/dl*SH.step, tz=z+dz/dl*SH.step;
    if(cvfsClosest(X,tx,ty,tz,o)<0){ end='out'; break; }
    const mv=Math.hypot(o.x-x,o.y-y,o.z-z); if(mv<0.03){ end='stuck'; break; }
    if(o.ny<SH.drip){ end='drip'; break; }
    if(cv10V(rec,o.x,o.y,o.z)>0.3){ end='out'; break; }
    const sm=cv10Samp(rec,o.x+o.nx*0.3,o.z+o.nz*0.3); if(sm.n>0&&sm.d<SH.ent){ end='ent'; break; }
    let dam=false; for(const e of dams){ if(Math.hypot(e.x-o.x,e.z-o.z)<SH.dam+(e.r||0)&&o.y<e.y1+1.0){ dam=true; break; } } if(dam){ end='dam'; break; }
    s+=mv; if(o.ny>SH.flNy) fl+=mv;
    x=o.x; y=o.y; z=o.z; nx=o.nx; ny=o.ny; nz=o.nz; pts.push({x,y,z,nx,ny,nz,s,fl:o.ny>SH.flNy?1:0});
    if(fl>=flMax){ end='floor'; break; }
    if(s>=L&&fl<=0){ end='len'; break; }
  }
  if(s<0.3) return null;
  { const d=[]; for(let i=0;i<pts.length;i++) if(i%3===0||i===pts.length-1) d.push(pts[i]); pts.length=0; pts.push(...d); }   // 두께 장은 0.3 m 마디로(점–마디 질의를 덜기)
  /* 너비 w(s) · 두께 T(s) — 목에서 아래로 넓어진다 · 바닥에선 부채 · 처마에서 떨어지면 끝 tngL 이 두꺼운 혀 */
  const bed=sp.f===1, w0=bed?SH.wB[0]+(SH.wB[1]-SH.wB[0])*r1:SH.w0[0]+(SH.w0[1]-SH.w0[0])*r1, w1=Math.max(w0*1.2,SH.w1[0]+(SH.w1[1]-SH.w1[0])*r2), Lw=0.6*s;
  const T0=SH.T[0]+(SH.T[1]-SH.T[0])*r3, fan=SH.fan[0]+(SH.fan[1]-SH.fan[0])*r4, Tt=SH.tng[0]+(SH.tng[1]-SH.tng[0])*r5;
  let sF=-1; for(const p of pts){ if(p.fl&&sF<0) sF=p.s;
    const wf=sF>=0?1+(fan-1)*cvfsSS(0,1.2,p.s-sF):1;
    p.w=(w0+(w1-w0)*cvfsSS(0,Math.max(Lw,0.3),p.s))*wf;
    let T=T0*(0.45+0.55*cvfsSS(0,0.8,p.s)); if(p.fl) T=Math.min(T,SH.Tfl);
    if(end==='drip') T=T+(Tt-T)*cvfsSS(s-SH.tngL,s,p.s);
    p.T=T; }
  return {pts,s,end,key:sp.key,pri:sp.pri,f:sp.f,wet:0.4+0.6*r6,ext:end==='drip'?0.12:SH.ext[0]+(SH.ext[1]-SH.ext[0])*r5,sd:(Math.imul(sp.key|0,0x9e3779b1)^X.S.sd)|0};
}

/* ── 두께 장 ─────────────────────────────────────────────────────────────────────────────────────────────────── */
/* 3 차원 값잡음(0~1) — 칸 꼭짓점 해시(cv10H) · smoothstep 보간 */
function cvfsVN(x,y,z,sd){
  const ix=Math.floor(x), iy=Math.floor(y), iz=Math.floor(z), fx=x-ix, fy=y-iy, fz=z-iz, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), w=fz*fz*(3-2*fz);
  const h=(i,j,k)=>cv10H(i,j,sd^Math.imul(k,0x27d4eb2d));
  const a=h(ix,iy,iz)*(1-u)+h(ix+1,iy,iz)*u, b=h(ix,iy+1,iz)*(1-u)+h(ix+1,iy+1,iz)*u, c=h(ix,iy,iz+1)*(1-u)+h(ix+1,iy,iz+1)*u, d=h(ix,iy+1,iz+1)*(1-u)+h(ix+1,iy+1,iz+1)*u;
  return (a*(1-v)+b*v)*(1-w)+(c*(1-v)+d*v)*w;
}
const cvfsVN1=(x,sd)=>{ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return cv10H(i,7,sd)*(1-u)+cv10H(i+1,7,sd)*u; };
/* 흐름 마디를 1 m 칸에(덩이 · 둘레 띠 몫까지 넓혀) — 칸 → [흐름 번호 × 4096 + 마디] */
function* cvfsSegCells(X,flows){
  const cells=new Map(), SH=CVFS.SH;
  for(let fi=0;fi<flows.length;fi++){ const F=flows[fi], p=F.pts;
    for(let i=0;i+1<p.length;i++){ if(cvfsT()) yield; const A=p[i], B=p[i+1], R=Math.max(A.w,B.w)*(1+F.ext)+0.05+SH.ring+SH.buryW;
      const x0=Math.floor(Math.min(A.x,B.x)-R), x1=Math.floor(Math.max(A.x,B.x)+R), y0=Math.floor(Math.min(A.y,B.y)-R), y1=Math.floor(Math.max(A.y,B.y)+R), z0=Math.floor(Math.min(A.z,B.z)-R), z1=Math.floor(Math.max(A.z,B.z)+R);
      for(let ix=x0;ix<=x1;ix++) for(let iy=y0;iy<=y1;iy++) for(let iz=z0;iz<=z1;iz++){ const k=cvfsCK(ix,iy,iz); let L=cells.get(k); if(!L) cells.set(k,L=[]); L.push(fi*4096+i); } } }
  return cells;
}
/* 한 점(밑점 x,y,z · 안쪽 법선 · 바닥 위 높이 fh · 굽이 kap)의 두께 h · 가장자리까지 e · 흐름 길이 s · 젖음 w · 막 밖 거리 out · 막 안 in */
function cvfsH(X,x,y,z,nx,ny,nz,fh,kap,o){
  const SH=CVFS.SH, F=X.fl, L=X.segC.get(cvfsCK(Math.floor(x),Math.floor(y),Math.floor(z)));
  o.h=SH.bury; o.e=0; o.s=0; o.w=0; o.out=9; o.in=false; if(!L) return o;
  const st=++X.stamp, bd=X.bd, bi=X.bi, bt=X.bt, sm=X.stm, tch=X.tch; let nt=0;
  for(let q=0;q<L.length;q++){ const id=L[q], fi=(id/4096)|0, i=id-fi*4096, p=F[fi].pts, A=p[i], B=p[i+1];
    const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=ex*ex+ey*ey+ez*ez; let t=ll>1e-12?((x-A.x)*ex+(y-A.y)*ey+(z-A.z)*ez)/ll:0; t=t<0?0:t>1?1:t;
    const qx=x-A.x-ex*t, qy=y-A.y-ey*t, qz=z-A.z-ez*t, d2=qx*qx+qy*qy+qz*qz;
    if(sm[fi]!==st){ sm[fi]=st; tch[nt++]=fi; bd[fi]=d2; bi[fi]=i; bt[fi]=t; } else if(d2<bd[fi]){ bd[fi]=d2; bi[fi]=i; bt[fi]=t; } }
  let s4=0, ss=0, sw=0, em=0, out=9, lob=-1;
  for(let k=0;k<nt;k++){ const fi=tch[k], Fl=F[fi], p=Fl.pts, i=bi[fi], t=bt[fi], A=p[i], B=p[i+1];
    const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=Math.sqrt(ex*ex+ey*ey+ez*ez)||1e-6, tx=ex/ll, ty=ey/ll, tz=ez/ll;
    const cx=A.x+ex*t, cy=A.y+ey*t, cz=A.z+ez*t, qx=x-cx, qy=y-cy, qz=z-cz, d=Math.sqrt(bd[fi]);
    const pnx=A.nx+(B.nx-A.nx)*t, pny=A.ny+(B.ny-A.ny)*t, pnz=A.nz+(B.nz-A.nz)*t;
    if(nx*pnx+ny*pny+nz*pnz<-0.2) continue;                                      // 마주 보는 벽 · 반대쪽 면은 안 덮는다
    const w=A.w+(B.w-A.w)*t, T=A.T+(B.T-A.T)*t, s=A.s+(B.s-A.s)*t, al=qx*tx+qy*ty+qz*tz;
    const last=i===p.length-2&&t>=1, first=i===0&&t<=0;
    let tk=0, e=0, o2=9;
    if(first){ const r=d/Math.max(w,1e-3); if(r<1){ tk=T*Math.sqrt(1-r*r); e=w-d; } else o2=d-w; }
    else{ const bey=last?Math.max(0,al):0, lat=Math.sqrt(Math.max(0,d*d-bey*bey));
      const sx=pny*tz-pnz*ty, sy=pnz*tx-pnx*tz, sz=pnx*ty-pny*tx, ls=(qx*sx+qy*sy+qz*sz)>=0?1:-1, ln=lat/Math.max(w,1e-3);
      let E=1e9; if(last){ E=w*(Fl.ext*(0.4+1.2*cvfsVN1(ls*ln*2.2+3.7,Fl.sd)))*(1-0.15*ln*ln); }
      if(ln<1&&bey<E){ tk=T*Math.sqrt(1-ln*ln)*(bey>0?Math.sqrt(Math.max(0,1-(bey/E)*(bey/E))):1); e=Math.min(w-lat,E-bey); }
      else o2=Math.max(lat-w,bey-E,0); }
    if(tk>0){ const t4=tk*tk*tk*tk; s4+=t4; ss+=t4*s; sw+=t4*Fl.wet*(0.6+0.4*Math.min(1,s/Math.max(Fl.s,0.3))); if(e>em) em=e; }
    else if(o2<out) out=o2; }
  if(s4>0){
    let h=Math.pow(s4,0.25);
    h*=1-SH.lobe*0.4+SH.lobe*1.4*cvfsVN(x/SH.lobeC,y/SH.lobeC,z/SH.lobeC,X.S.sd^0x10be);   // 볼록 덩이(평균 ≈ +30% · 0.8~1.5 배)
    const sl=cvfsSS(0.25,0.40,ny)*(1-cvfsSS(0.70,0.85,ny));                                     // 비탈 테라스 — 둥근 턱
    if(sl>0){ const sp=SH.terSp[0]+(SH.terSp[1]-SH.terSp[0])*cvfsVN(x/3,0.5,z/3,X.S.sd^0x7e7), u=y/sp+0.8*cvfsVN(x/2,y/2,z/2,X.S.sd^0x7e9), f=u-Math.floor(u);
      h*=1+SH.terA*sl*(cvfsSS(0,0.18,f)*(1-cvfsSS(0.18,1,f))-0.4); }
    const eye=cvfsSS(SH.eye[0]-0.2,SH.eye[0],fh)*(1-cvfsSS(SH.eye[1],SH.eye[1]+0.2,fh)), flo=Math.max(cvfsSS(0.45,0.65,ny),1-cvfsSS(0.15,0.35,fh));
    let cap=SH.capW+(SH.capEye-SH.capW)*eye; cap=cap+(SH.capFl-cap)*flo; if(kap>1e-6) cap=Math.min(cap,SH.curv/kap);
    o.h=Math.max(Math.min(h,cap),SH.hIn); o.e=em; o.s=ss/s4; o.w=sw/s4; o.out=0; o.in=true; }
  else{ o.out=out; o.h=SH.bury*cvfsSS(0,SH.buryW,out); }
  return o;
}

/* ── 나누기 — 덮인 세모(+ h>0 인 변의 이웃 — 닫힐 때까지)를 k×k 로 · 변 위의 점은 나눠 쓴다 ─────────────────────────── */
function* cvfsTess(X){
  const SH=CVFS.SH, P=X.P, N=X.N, I=X.I, nv=X.nv, rec=X.rec;
  for(let tries=0;tries<10;tries++){
    const flows=X.flows.slice(0,X.nUse), k=X.k;
    CVFS.ph='seg'; X.fl=flows; X.segC=yield* cvfsSegCells(X,flows); CVFS.ph='cand'; X.stamp=0; const nf=flows.length;
    X.bd=new Float64Array(nf); X.bi=new Int32Array(nf); X.bt=new Float64Array(nf); X.stm=new Int32Array(nf); X.tch=new Int32Array(nf);
    /* 후보 — 흐름 마디 칸에 든 세모 가운데 무게중심이 마디에서 (너비 + 끝 혀 + 세모 반지름) 안 */
    const mark=new Uint8Array(X.nt), cand=[];
    for(const [ck,L] of X.segC){ const T=X.cells.get(ck); if(!T) continue;
      for(const t of T){ if(mark[t]) continue; if(cvfsT()) yield; const a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3, mx=(P[a]+P[b]+P[c])/3, my=(P[a+1]+P[b+1]+P[c+1])/3, mz=(P[a+2]+P[b+2]+P[c+2])/3;
        const rr=Math.sqrt(Math.max((P[a]-mx)**2+(P[a+1]-my)**2+(P[a+2]-mz)**2,(P[b]-mx)**2+(P[b+1]-my)**2+(P[b+2]-mz)**2,(P[c]-mx)**2+(P[c+1]-my)**2+(P[c+2]-mz)**2));
        for(const id of L){ const fi=(id/4096)|0, i=id-fi*4096, p=flows[fi].pts, A=p[i], B=p[i+1], R=Math.max(A.w,B.w)*(1+flows[fi].ext)+rr+0.05;
          const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=ex*ex+ey*ey+ez*ez; let q=ll>1e-12?((mx-A.x)*ex+(my-A.y)*ey+(mz-A.z)*ez)/ll:0; q=q<0?0:q>1?1:q;
          if((mx-A.x-ex*q)**2+(my-A.y-ey*q)**2+(mz-A.z-ez*q)**2<R*R){ mark[t]=1; cand.push(t); break; } } }
      if(cvfsT()) yield; }
    cand.sort((a,b)=>a-b); CVFS.ph='close';
    /* 점 — 열쇠: 꼭짓점 −(v+1) · 변 (작은 번호, 큰 번호, 작은 쪽에서 i) · 세모 안 nv²·8 + t·16 + i·4 + j */
    const pk=new Map(), PB=[], PN=[], PA=[], PH=[], PF=[], PT=[], PV=[]; const o={};
    const evalPt=(key,t,b0,b1,b2,va,vb,vc)=>{ let id=pk.get(key); if(id!==undefined) return id; id=PH.length/1; pk.set(key,id);
      const x=P[va*3]*b0+P[vb*3]*b1+P[vc*3]*b2, y=P[va*3+1]*b0+P[vb*3+1]*b1+P[vc*3+1]*b2, z=P[va*3+2]*b0+P[vb*3+2]*b1+P[vc*3+2]*b2;
      let nx=N[va*3]*b0+N[vb*3]*b1+N[vc*3]*b2, ny=N[va*3+1]*b0+N[vb*3+1]*b1+N[vc*3+1]*b2, nz=N[va*3+2]*b0+N[vb*3+2]*b1+N[vc*3+2]*b2; const nl=(Math.hypot(nx,ny,nz)||1)*X.sign; nx/=nl; ny/=nl; nz/=nl;
      const hl=Math.hypot(nx,nz), s=hl>0.2?cv10Samp(rec,x+nx/hl*0.5,z+nz/hl*0.5):cv10Samp(rec,x,z), fh=s.n>0?y-s.f:0;
      const kap=X.kap[va]*b0+X.kap[vb]*b1+X.kap[vc]*b2;
      /* 껍데기 가장자리(세모 하나만 가진 변 위의 점 · 그런 변에 닿은 꼭짓점) — 늘 묻는다(이웃이 없어 막을 닫을 수 없다) */
      const bnd=key<0?X.bv[va]===1:(b2===0&&X.bv[va]&&X.bv[vb]&&cvfsEdgeN(X,va,vb)<2);
      cvfsH(X,x,y,z,nx,ny,nz,fh,kap,o);
      let h=o.h, inn=o.in; if(bnd){ h=SH.bury; inn=false; }
      const sk=X.sky, dp=X.deep, ao=X.ao;
      PB.push(x,y,z); PN.push(nx,ny,nz); PH.push(h); PF.push(h>0?o.e:0,h>0?o.s:0,h>0?o.w:0,inn?0:o.out);
      PA.push(sk[va]*b0+sk[vb]*b1+sk[vc]*b2, dp[va]*b0+dp[vb]*b1+dp[vc]*b2, ao?ao[va]*b0+ao[vb]*b1+ao[vc]*b2:1); PT.push(t); PV.push(key<0?va:-1);
      return id; };
    /* 세모 t 의 (i,j) 점 — A=I[t*3] 무게 (k−i−j) · B i · C j */
    const ptOf=(t,i,j)=>{ const A=I[t*3], B=I[t*3+1], C=I[t*3+2], m=k-i-j;
      if(i===0&&j===0) return evalPt(-(A+1),t,1,0,0,A,A,A); if(i===k) return evalPt(-(B+1),t,1,0,0,B,B,B); if(j===k) return evalPt(-(C+1),t,1,0,0,C,C,C);
      const ed=(a,b,ia)=>{ const lo=a<b?a:b, hi=a<b?b:a, ii=a<b?ia:k-ia; return evalPt((lo*nv+hi)*8+ii,t,(k-ii)/k,ii/k,0,lo,hi,hi); };
      if(j===0) return ed(A,B,i); if(i===0) return ed(A,C,j); if(m===0) return ed(B,C,j);
      return evalPt(nv*nv*8+t*16+i*4+j,t,m/k,i/k,j/k,A,B,C); };
    const inS=new Uint8Array(X.nt), set=[], Q=cand.slice(); let qi=0, nb=[];
    while(qi<Q.length){ const t=Q[qi++]; if(inS[t]) continue; inS[t]=1; set.push(t);
      if(cvfsT()) yield;
      const pt=[]; for(let j=0;j<=k;j++) for(let i=0;i+j<=k;i++) pt[j*(k+1)+i]=ptOf(t,i,j);
      const A=I[t*3], B=I[t*3+1], C=I[t*3+2], eg=[[A,B,i=>pt[i]],[A,C,j=>pt[j*(k+1)]],[B,C,j=>pt[j*(k+1)+(k-j)]]];
      for(const [a,b,f] of eg){ let pos=false; for(let q=0;q<=k;q++) if(PH[f(q)]>0){ pos=true; break; }
        if(!pos) continue; nb.length=0; cvfsEdgeN(X,a,b,nb); for(const t2 of nb) if(!inS[t2]) Q.push(t2); } }
    set.sort((a,b)=>a-b); CVFS.ph='tris';
    /* 작은 세모 — 세 점이 다 h≤0 이면 버린다 · 감는 차례는 껍데기와 같다(앞면이 빈 데 쪽) */
    const tri=[], own=[];
    for(const t of set){ for(let j=0;j<k;j++) for(let i=0;i+j<k;i++){
        const a=ptOf(t,i,j), b=ptOf(t,i+1,j), c=ptOf(t,i,j+1);
        if(PH[a]>0||PH[b]>0||PH[c]>0){ tri.push(a,b,c); own.push(t); }
        if(i+j<k-1){ const d=ptOf(t,i+1,j+1); if(PH[b]>0||PH[d]>0||PH[c]>0){ tri.push(b,d,c); own.push(t); } } }
      if(cvfsT()) yield; }
    const ntri=tri.length/3;
    if(ntri>CVFS.maxTri&&tries<9){ if(X.k>2) X.k--; else X.nUse=Math.max(1,Math.floor(X.nUse*0.85)); continue; }
    Object.assign(X,{set,tri,own,PB,PN,PH,PF,PA,PT,PV,ntri,cand:cand.length});
    return;
  }
}

/* ── 메시 — 법선 · 8 m 덩이 · 껍데기 aFc ─────────────────────────────────────────────────────────────────────── */
function* cvfsMesh(X){
  const SH=CVFS.SH, np=X.PH.length, PB=X.PB, PN=X.PN, PH=X.PH, tri=X.tri, rec=X.rec;
  CVFS.ph='mesh'; const pos=new Float64Array(np*3);
  for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const h=PH[p]; pos[p*3]=PB[p*3]+PN[p*3]*h; pos[p*3+1]=PB[p*3+1]+PN[p*3+1]*h; pos[p*3+2]=PB[p*3+2]+PN[p*3+2]*h; }
  const nrm=new Float64Array(np*3); let flip=0;
  for(let q=0;q<tri.length;q+=3){ if((q%6144)===0&&q&&cvfsT()) yield; const a=tri[q]*3, b=tri[q+1]*3, c=tri[q+2]*3;
    const ux=pos[b]-pos[a], uy=pos[b+1]-pos[a+1], uz=pos[b+2]-pos[a+2], vx=pos[c]-pos[a], vy=pos[c+1]-pos[a+1], vz=pos[c+2]-pos[a+2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    nrm[a]+=nx; nrm[a+1]+=ny; nrm[a+2]+=nz; nrm[b]+=nx; nrm[b+1]+=ny; nrm[b+2]+=nz; nrm[c]+=nx; nrm[c+1]+=ny; nrm[c+2]+=nz;
    const t=X.own[q/3]; if(nx*X.FN[t*3]+ny*X.FN[t*3+1]+nz*X.FN[t*3+2]<0) flip++; }   // 스스로 접힌 세모(오목한 모서리)
  for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const o=p*3, l=Math.hypot(nrm[o],nrm[o+1],nrm[o+2]); if(l>1e-12){ nrm[o]/=l; nrm[o+1]/=l; nrm[o+2]/=l; } else { nrm[o]=PN[o]; nrm[o+1]=PN[o+1]; nrm[o+2]=PN[o+2]; } }
  yield;
  /* 막 시험 — 열린 모서리(작은 세모 하나만 가진 변) 가운데 한 끝이라도 h>0 · 밑점이 껍데기 세모 평면에서 벗어난 것(f32 자리 − h·보간 법선) · 막 안쪽 두께 최솟값 */
  const st={open:0,openPos:0,baseOff:0,baseMax:0,hInMin:1e9,flip,hMax:0};
  { const em=new Map(); for(let q=0;q<tri.length;q+=3){ if((q%3072)===0&&q&&cvfsT()) yield; for(let e=0;e<3;e++){ const a=tri[q+e], b=tri[q+(e+1)%3], k2=a<b?a*np+b:b*np+a; em.set(k2,(em.get(k2)||0)+1); } }
    let c2=0; for(const [k2,n] of em){ if((++c2&4095)===0&&cvfsT()) yield; if(n!==1) continue; st.open++; const a=Math.floor(k2/np), b=k2-a*np; if(PH[a]>0||PH[b]>0) st.openPos++; } }
  yield;
  const f32=new Float32Array(3), P=X.P, I=X.I;
  for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const h=PH[p]; if(h>0){ if(h<st.hInMin) st.hInMin=h; if(h>st.hMax) st.hMax=h; }
    const t=X.PT[p], A=I[t*3]*3, fx=X.FN[t*3], fy=X.FN[t*3+1], fz=X.FN[t*3+2];
    f32[0]=pos[p*3]; f32[1]=pos[p*3+1]; f32[2]=pos[p*3+2];
    const bx=f32[0]-PN[p*3]*h, by=f32[1]-PN[p*3+1]*h, bz=f32[2]-PN[p*3+2]*h, dv=Math.abs((bx-P[A])*fx+(by-P[A+1])*fy+(bz-P[A+2])*fz);
    if(dv>st.baseMax) st.baseMax=dv; if(dv>0.001) st.baseOff++; }
  X.test=st; yield; CVFS.ph='chunk';
  /* 껍데기 aFc — 덮개 안 1 · 밖 ring m 에서 0(꼭짓점 점만 · 나머지는 0 그대로) */
  const g=rec.mesh.geometry, fc=g.attributes.aFc;
  if(fc){ const A=fc.array; A.fill(0); for(let p=0;p<np;p++){ const v=X.PV[p]; if(v<0) continue; A[v]=PH[p]>0?1:1-cvfsSS(0,SH.ring,X.PF[p*4+3]); } X.fcPend=true; }
  /* 덩이 — 껍데기 세모 무게중심의 8 m 칸 · 열쇠 차례로 */
  const ch=new Map(), cs=CVFS.cell;
  for(let q=0;q<X.own.length;q++){ if((q&4095)===0&&q&&cvfsT()) yield; const t=X.own[q], a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
    const k2=cvfsCK(Math.floor((P[a]+P[b]+P[c])/3/cs),Math.floor((P[a+1]+P[b+1]+P[c+1])/3/cs),Math.floor((P[a+2]+P[b+2]+P[c+2])/3/cs));
    let L=ch.get(k2); if(!L) ch.set(k2,L=[]); L.push(q); }
  const keys=[...ch.keys()].sort((a,b)=>a-b), geos=[];
  for(const k2 of keys){ const L=ch.get(k2), rm=new Map(), vlist=[];
    for(const q of L) for(let e=0;e<3;e++){ const p=tri[q*3+e]; if(!rm.has(p)){ rm.set(p,vlist.length); vlist.push(p); } }
    const n=vlist.length, Po=new Float32Array(n*3), No=new Float32Array(n*3), Sk=new Float32Array(n), Dp=new Float32Array(n), Ao=new Float32Array(n), Fs=new Float32Array(n*4), Ix=n>65535?new Uint32Array(L.length*3):new Uint16Array(L.length*3);
    for(let v=0;v<n;v++){ const p=vlist[v]; Po[v*3]=pos[p*3]; Po[v*3+1]=pos[p*3+1]; Po[v*3+2]=pos[p*3+2]; No[v*3]=nrm[p*3]; No[v*3+1]=nrm[p*3+1]; No[v*3+2]=nrm[p*3+2];
      Sk[v]=X.PA[p*3]; Dp[v]=X.PA[p*3+1]; Ao[v]=X.PA[p*3+2]; Fs[v*4]=PH[p]; Fs[v*4+1]=X.PF[p*4]; Fs[v*4+2]=X.PF[p*4+1]; Fs[v*4+3]=X.PF[p*4+2]; }
    for(let i=0;i<L.length;i++){ if((i&2047)===2047&&cvfsT()) yield; for(let e=0;e<3;e++) Ix[i*3+e]=rm.get(tri[L[i]*3+e]); }
    const gg=new THREE.BufferGeometry();
    gg.setAttribute('position',new THREE.BufferAttribute(Po,3)); gg.setAttribute('normal',new THREE.BufferAttribute(No,3));
    gg.setAttribute('aSky',new THREE.BufferAttribute(Sk,1)); gg.setAttribute('aDeep',new THREE.BufferAttribute(Dp,1)); gg.setAttribute('aAo',new THREE.BufferAttribute(Ao,1)); gg.setAttribute('aFs',new THREE.BufferAttribute(Fs,4));
    gg.setIndex(new THREE.BufferAttribute(Ix,1)); gg.computeBoundingSphere(); geos.push(gg);
    if(cvfsT()) yield; }
  X.geos=geos; X.verts=0; for(const gg of geos) X.verts+=gg.attributes.position.count; X.pts=np;
}

/* ── 재질 — 모든 석회암 굴이 나눠 쓴다 ────────────────────────────────────────────────────────────────────── */
const CVFS_VERT=`attribute float aSky, aDeep, aAo;
attribute vec4 aFs;
varying float vCv10Sky, vCv10Deep;
varying vec3 vFsW, vFsN;
varying vec4 vFsA;
varying float vFsO, vFsD;
uniform vec3 cmTPv;
`;
const CVFS_VMAIN=`#include <begin_vertex>
  { vec4 w4=modelMatrix*vec4(transformed,1.0); vFsW=w4.xyz; vFsN=mat3(modelMatrix)*objectNormal; vFsD=length((modelViewMatrix*vec4(transformed,1.0)).xyz);
    vCv10Sky=aSky; vCv10Deep=aDeep; vFsA=aFs; vFsO=aAo; }`;
const CVFS_FRAG=`varying float vCv10Sky, vCv10Deep;
uniform vec4 uCv10Glow;
varying vec3 vFsW, vFsN;
varying vec4 vFsA;
varying float vFsO, vFsD;
uniform mediump sampler2DArray cmC;
uniform mediump sampler3D cmZ;
uniform vec4 cmT; uniform vec3 cmTP, cmTC, cmEye;
float fsLum(vec3 c){ return dot(c,vec3(0.30,0.59,0.11)); }
float fsWarp(float u,float ph){ return u+0.3*sin(1.3*u+ph)+0.12*sin(3.7*u+ph); }
`;
/* 조각 본문 — color_fragment 뒤. 바탕 · 무늬 · 범프 → diffuseColor(정점 빛은 감싸기로 받는다) · 횃불 난반사(감싸기) · 투과 · 정반사 → totalEmissiveRadiance */
const CVFS_BODY=`#include <color_fragment>
  {
    vec3 p=vFsW, n0=normalize(vFsN)*(gl_FrontFacing?1.0:-1.0);
    float h=max(vFsA.x,0.0), ed=vFsA.y, sF=vFsA.z, wt=clamp(vFsA.w,0.0,1.0), ao=vFsO, dist=vFsD;
    vec3 dpx=dFdx(p), dpy=dFdy(p);
    float fp=max(length(dpx),length(dpy)), kF=1.0-smoothstep(0.003,0.008,fp), kMi=1.0-smoothstep(0.004,0.012,fp), kMe=1.0-smoothstep(0.012,0.040,fp), nrmK=clamp(1.0-dist/14.0,0.0,1.0);
    /* 흐름 틀 — 중력의 접평면 쪽 fd · 가로 ac(바닥은 x 축으로 물러남) */
    vec3 dn=vec3(0.0,-1.0,0.0)+n0*n0.y; float dl=length(dn);
    vec3 fd=dl>0.05?dn/dl:normalize(cross(n0,vec3(1.0,0.0,0.0))), ac=normalize(cross(n0,fd));
    float ua=dot(p,ac), ub=dot(p,fd), flo=smoothstep(0.45,0.75,n0.y);
    vec4 Z=texture(cmZ,p/6.0);                                                       // 큰 얼룩 r 0.75 · g 1.5 · b 3 · a 0.375 m
    /* (p1) 세로 홈 결 — 흐름 쪽으로 20 배 늘인 잡음이 휘게 한 홈(간격 2~4 cm) + 굵은 골(4.5 cm 칸) · 홈은 짙은 꿀빛 · 등은 크림 */
    vec4 G=texture(cmZ,vec3(ua/0.36,ub/7.0,dot(p,n0)/0.6+0.37));
    vec4 Gs=texture(cmZ,vec3(ua/2.4,ub/30.0,0.71));                                  // 흐름 따라 늘어진 굵은 줄무늬(10~30 cm 너비)
    float fph=ua/(0.022+0.018*G.g)+3.0*G.b+1.5*Gs.r;
    float fl1=0.5+0.5*sin(6.2832*fph), flu=mix(G.a-0.5,fl1-0.5,0.65*kF)+0.45*(G.r-0.5);   // −0.5~0.5 · 등 +
    float strk=smoothstep(0.42,0.78,Gs.g+0.25*(G.r-0.5));                            // 굵은 갈색 줄(폭 있는 얼룩 — 잡음으로 끊김)
    /* (p2) 둥근 턱 — 가로로 겹겹(간격 8~22 cm · 단조 휨) · 턱 아래 폭 있는 그늘 · 위에 밝은 테 · 잡음으로 끊김 */
    float tu=fsWarp(p.y/0.15+2.0*Z.g+0.8*G.b,Z.b*6.0), tf=fract(tu);
    float lip=smoothstep(0.0,0.22,tf)*(1.0-smoothstep(0.22,1.0,tf));                 // 0.22 가 턱 끝(위는 둥글게 · 아래로 처진다)
    float dbl=fract(0.22-tf), shd=smoothstep(0.0,0.06,dbl)*(1.0-smoothstep(0.16,0.55,dbl)), rim=1.0-smoothstep(0.0,0.14,fract(tf-0.22));
    float cutT=smoothstep(0.30,0.62,Z.a+0.35*(G.g-0.5))*(1.0-smoothstep(0.3,0.7,fwidth(tu)));
    /* 갈래 몫 — 볼록 덩이(두께 · 완만한 면)는 턱 · 가파른 벽은 홈 · 바닥은 미세 휴석 */
    float terK=smoothstep(0.55,0.80,Z.b+0.25*(smoothstep(0.06,0.20,h)-0.5)+0.5*(n0.y-0.10))*(1.0-flo);
    float fluK=(1.0-terK)*(1.0-flo);
    /* 바닥 미세 휴석 — 잡음을 크게 얹은 높이의 등고선(간격 2~8 cm) · 턱마다 밝은 둑 · 낮은 쪽에 폭 있는 그늘 · 화소보다 잘면 끈다 */
    float gh=p.y+0.10*(Z.a-0.5)+0.06*(Z.r-0.5)+0.02*(G.r-0.5), gu=gh/(0.02+0.05*Z.g), gf=fract(gu), gw=fwidth(gu);
    float dam=smoothstep(0.60,0.86,gf)*(1.0-smoothstep(0.90,1.0,gf)), dsh=smoothstep(0.0,0.08,gf)*(1.0-smoothstep(0.14,0.45,gf));
    float gK=flo*(1.0-smoothstep(0.25,0.6,gw))*smoothstep(0.25,0.50,Z.g+0.3*(G.a-0.5));
    /* 잔 알갱이 — 사진 층 8(G0 sand_01) 한 장 · 많이 섞인 면으로 */
    vec3 an=abs(n0); vec2 pd=an.x>an.y&&an.x>an.z?p.zy:(an.y>an.z?p.xz:p.xy);
    float gr=fsLum(texture(cmC,vec3(pd/0.9,8.0)).rgb)*2.0-1.0;
    /* 바탕 — 얇은 데 크림 → 두꺼운 데 꿀 · 홈 골 · 굵은 줄 · 턱 그늘은 꿀 쪽으로 짙게(빛깔 선이 아니라 폭 있는 톤) */
    float tk=smoothstep(FS_THK0,FS_THK1,h+0.04*(Z.r-0.5));
    float hon=clamp(tk+fluK*(0.55*strk+0.9*max(0.0,0.0-flu)*kMe)+terK*cutT*0.6*shd+gK*0.5*dsh,0.0,1.0);
    vec3 c=mix(FS_ALB,FS_ALBT,hon);
    c*=1.0+0.24*(Z.g-0.5)+0.14*(Z.a-0.5);
    c*=1.0+fluK*kMe*(0.85*flu)-0.16*fluK*strk+0.03*sin(6.2832*(ub/0.11+3.0*Z.g))*fluK;   // 홈 등 밝게 · 골 짙게 · 엷은 가로 성장 띠
    c*=1.0-terK*cutT*(0.32*shd-0.16*rim);
    c*=1.0-gK*(0.30*dsh-0.15*dam);
    c*=1.0+0.22*gr*kMi;
    c*=0.70+0.30*smoothstep(0.0,0.07,ed+0.02*(G.a-0.5));                             // 가장자리 — 막이 바위에 닿는 데는 그늘(폭 7 cm)
    /* 젖음 — 바탕 ×wetD · 채도 조금 오름 · 물막은 잔 결을 메운다 */
    float w=clamp(wt*(0.6+0.6*Z.b),0.0,1.0);
    c*=mix(1.0,FS_WETD,w); { float l=fsLum(c); c=max(vec3(0.0),vec3(l)+(c-vec3(l))*(1.0+FS_WETSAT*w)); }
    /* 미분 범프 — 홈(5 mm) · 턱(2 cm) · 둑(6 mm) · 알갱이(1.5 mm) · 14 m 밖은 0 */
    float Ht=fluK*flu*0.005*kMi+terK*cutT*lip*0.020*kMe+gK*(dam-0.4*dsh)*0.006*kMe+gr*0.0008*kMi;
    Ht*=1.0-0.5*w;
    float hb=Ht*nrmK, hx=dFdx(hb), hy=dFdy(hb);
    vec3 r1=cross(dpy,n0), r2=cross(n0,dpx); float det=dot(dpx,r1);
    vec3 nb=abs(det)>1e-12?normalize(abs(det)*n0-sign(det)*(hx*r1+hy*r2)):n0;
    vec3 nd=normalize(mix(nb,n0,FS_SOFT));
    float occA=mix(0.35,1.0,ao*ao), occD=mix(0.70,1.0,ao), occS=clamp(ao*1.3-0.3,0.0,1.0);
    /* 정점 빛(감싸기)에 화소 결 — 둘레빛 가림 · 범프가 정점 법선에서 기운 만큼 */
    diffuseColor.rgb=c*occA*(0.80+0.20*clamp(dot(nd,n0),0.0,1.0));
    /* 횃불 — 정점 묶음에서 뺐으니 여기서(껍데기와 같은 유니폼 · 같은 감쇠 (1−d/거리)²) · 빛깔마다 감싸기 */
    vec3 tv=cmTP-p; float tl=length(tv); vec3 Lt=tv/max(tl,1e-4), V=normalize(cmEye-p);
    float at=clamp(1.0-tl/max(cmT.x,1e-3),0.0,1.0); at*=at;
    float nl=dot(nd,Lt);
    vec3 E=clamp((vec3(nl)+FS_WRAP)/(1.0+FS_WRAP),0.0,1.0);
    totalEmissiveRadiance+=c*occD*cmTC*(cmT.w*at)*E;
    /* 투과 — 얇은 자유 가장자리(e 작음 · 두께 수 mm)와 처마 혀 끝 · 빛이 막 앞쪽일 때만 · 두께대로 파랑부터 먹힌다 */
    float frK=smoothstep(0.0,0.05,dot(Lt,n0)+0.05);
    float edK=1.0-smoothstep(0.0,FS_EDGE,ed);
    float bk=pow(clamp(dot(V,0.0-normalize(Lt+nd*FS_TDELTA)),0.0,1.0),FS_TPOW)+0.25*clamp(1.0-dot(V,n0),0.0,1.0);
    vec3 tr=FS_TCOL*exp(0.0-FS_SIGA*h)*exp(0.0-h/FS_MFP);
    totalEmissiveRadiance+=tr*cmTC*(cmT.w*at*FS_TK*edK*frK*bk*occD);
    /* 정반사 — 마른 방해석(F0 0.045 · 거칠게) ↔ 젖은 물막(F0 0.02 · 매끈) · 화소 안 법선 흩어짐으로 거칠기를 넓힌다 */
    float rg=mix(FS_RDRY,FS_RWET,w), f0=mix(FS_F0DRY,FS_F0WET,w);
    vec3 ns=normalize(mix(nb,n0,0.85*w));
    float sg2=min(0.25,0.5*(dot(dFdx(ns),dFdx(ns))+dot(dFdy(ns),dFdy(ns))));
    vec3 Hv=normalize(Lt+V); float a2=min(1.0,rg*rg*rg*rg+sg2), sn=clamp(2.0/a2-2.0,1.0,80.0);
    float nls=max(dot(ns,Lt),0.0), nh=max(dot(ns,Hv),0.0), x=1.0-max(dot(V,Hv),0.0), x2=x*x, Fs=f0+(1.0-f0)*x2*x2*x;
    totalEmissiveRadiance+=cmTC*(cmT.w*at*nls*(sn+8.0)*0.125*pow(nh,sn)*Fs*occS);
  }`;
const cvfsV3=a=>'vec3('+a.map(v=>(+v).toFixed(4)).join(',')+')';
function cv10FlowMat(){
  if(CVFS.mat) return CVFS.mat;
  cmPhotos();
  const O=CVFS.OPT, m=new THREE.MeshLambertMaterial({color:0xffffff});
  const gl=(typeof CV10_GLOW!=='undefined'&&(CV10_GLOW.karst||CV10_GLOW.shelter))||[0,0,0,0];
  const U={cmC:CMAT.tex, cmZ:cmNoise3(), cmT:CMAT.torch, cmTP:CMAT.tpos, cmTPv:CMAT.tpv, cmEye:CMAT.eye, cmTC:CMAT.tcol, uCv10Glow:{value:new THREE.Vector4(gl[0],gl[1],gl[2],gl[3])}};
  const f=v=>'('+(+v).toFixed(4)+')';
  const D=`#define FS_ALB ${cvfsV3(O.alb)}\n#define FS_ALBT ${cvfsV3(O.albT)}\n#define FS_THK0 ${f(O.thick[0])}\n#define FS_THK1 ${f(O.thick[1])}\n#define FS_SIGA ${cvfsV3(O.sigA)}\n#define FS_MFP ${f(O.mfp)}\n`+
    `#define FS_WRAP ${cvfsV3(O.wrap)}\n#define FS_SOFT ${f(O.soft)}\n#define FS_TCOL ${cvfsV3(O.tcol)}\n#define FS_TDELTA ${f(O.tDelta)}\n#define FS_TPOW ${f(O.tPow)}\n#define FS_TK ${f(O.tK)}\n#define FS_EDGE ${f(O.edge)}\n`+
    `#define FS_RDRY ${f(O.rDry)}\n#define FS_RWET ${f(O.rWet)}\n#define FS_F0DRY ${f(O.f0Dry)}\n#define FS_F0WET ${f(O.f0Wet)}\n#define FS_WETD ${f(O.wetD)}\n#define FS_WETSAT ${f(O.wetSat)}\n#define CM_SUNCUT\n`;
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    let vs=CVFS_VERT+sh.vertexShader.replace('#include <begin_vertex>',CVFS_VMAIN);
    /* 정점 빛 — 점광 고리에서 횃불(눈 좌표 cmTPv)만 0(화소에서 센다 · 31-cave10mat.js CM_PXT 와 같은 법) · 모든 정점 빛을 빛깔마다 감싼다(밀랍처럼 그늘이 따뜻하게) */
    const LV=THREE.ShaderChunk.lights_lambert_vertex, G='getPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );', W='vLightFront += saturate( dotNL ) * directLightColor_Diffuse;';
    if(LV.split(G).length===2&&vs.split('#include <lights_lambert_vertex>').length===2)
      vs=vs.replace('#include <lights_lambert_vertex>',LV.replace(G,G+'\n\t\tdirectLight.color *= step( 0.001, distance( pointLights[ i ].position, cmTPv ) );')
        .split(W).join('vLightFront += clamp( ( vec3( dotNL ) + FS_WRAP ) / ( 1.0 + FS_WRAP ), 0.0, 1.0 ) * directLightColor_Diffuse;'));
    sh.vertexShader=D+vs;
    sh.fragmentShader=D+CVFS_FRAG+sh.fragmentShader.replace('#include <color_fragment>',CVFS_BODY);
  };
  const hk=JSON.stringify(O); let hh=0; for(let i=0;i<hk.length;i++) hh=(Math.imul(hh,31)+hk.charCodeAt(i))|0;
  m.customProgramCacheKey=()=>'cv10fs-'+(hh>>>0).toString(36);
  envPatch(m);
  return CVFS.mat=m;
}
/* 미리 짜기(90-init.js precompPlan) — 덮개 메시와 같은 꼴 */
function cvfsPrecompGeo(){
  if(CVFS.geo) return CVFS.geo;
  const g=new THREE.BufferGeometry(), z9=new Float32Array(9);
  g.setAttribute('position',new THREE.Float32BufferAttribute(z9,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(z9.slice(),3));
  for(const a of ['aSky','aDeep','aAo']) g.setAttribute(a,new THREE.Float32BufferAttribute(new Float32Array(3),1));
  g.setAttribute('aFs',new THREE.Float32BufferAttribute(new Float32Array(12),4));
  return CVFS.geo=g;
}

/* ── 짓기 · 돌리기 · 버리기 ──────────────────────────────────────────────────────────────────────────────────── */
function* cvfsGen(rec){
  /* 기다림 — 장식(휴석 웅덩이 기록)과 가림 굽기(aAo)가 끝날 때까지(읽기만 한다) */
  while(rec.decoGen||!rec.deco||(CMAT.ao.q.some(J=>J.rec===rec))) yield 'wait';
  const T0={ms:0};
  CVFS.ph='ctx'; const X=yield* cvfsCtx(rec); yield;
  CVFS.ph='seep'; const seeps=yield* cvfsSeeps(X); yield; CVFS.ph='trace';
  const flows=[], ends={};
  for(const sp of seeps){ const F=yield* cvfsTrace(X,sp); if(F){ flows.push(F); ends[F.end]=(ends[F.end]||0)+1; } if(cvfsT()) yield; }
  X.flows=flows; X.nUse=flows.length; X.ends=ends;
  X.k=Math.max(2,Math.min(4,Math.round(X.eLen/0.17)));
  const fs=rec.fs={flows:flows.length,seeps:seeps.length,cand:X.nCand,tier:X.S.ti,ends,tri:0,verts:0,chunks:0,k:X.k,meshes:[],test:null,sign:X.sign,
    fl:flows.map(F=>{ const p=F.pts, m=p[p.length>>1]; const e=p[p.length-1]; return {x:m.x,y:m.y,z:m.z,nx:m.nx,ny:m.ny,nz:m.nz,w:m.w,s:F.s,end:F.end,x0:p[0].x,y0:p[0].y,z0:p[0].z,xe:e.x,ye:e.y,ze:e.z}; })};   // 시험 · 사진 자리(흐름마다 가운데 마디)
  if(flows.length){
    /* k — 껍데기 세모 변 길이에서(나눈 점 간격 ≈ 0.17 m) · 실제 세모가 상한 maxTri 를 넘으면 나누기가 k 를 낮추고, 그래도 넘으면 우선순위 낮은 흐름부터 뺀다 */
    yield* cvfsTess(X);
    yield* cvfsMesh(X);
    fs.k=X.k; fs.used=X.nUse; fs.tri=X.ntri; fs.verts=X.verts; fs.covered=X.set.length; fs.test=X.test;
    for(const gg of X.geos){ const m=new THREE.Mesh(gg,cv10FlowMat());
      m.matrixAutoUpdate=false; m.castShadow=false; m.receiveShadow=true; m.renderOrder=-1; m.userData.cvFs=1; m.userData.lightRole='recv'; m.onBeforeRender=cmTick;
      m.visible=CVFS.on; rec.mesh.add(m); fs.meshes.push(m); fs.chunks++;
      if(fs.chunks===1&&X.fcPend){ const fc=rec.mesh.geometry.attributes.aFc; if(fc) fc.needsUpdate=true; }
      CVFS.ph='attach'; yield 'frame'; }                                                          // 덩이 하나씩 — 첫 그리기의 버퍼 올리기가 한 프레임에 몰리지 않게
    try{ LIGHT.dirtyAt(rec.c.x,rec.c.z,60); }catch(e){}
  }
  fs.done=true;
}
/* 한 굴의 제너레이터를 한 조각 — 다 됐으면 true · 'wait' 이면 'wait' · 'frame' 이면 'frame' */
function cvfsStep(rec,ms){
  CVFS.tEnd=performance.now()+ms; const t0=performance.now(); let st;
  try{ st=rec.fsGen.next(); }catch(e){ showErr('굴 유석 덮개',e); cvfsDrop(rec); return true; }
  const dt=performance.now()-t0;
  if(st.value!=='wait'){ rec.fsMs=(rec.fsMs||0)+dt; if(dt>(rec.fsMax||0)){ rec.fsMax=dt; rec.fsMaxPh=CVFS.ph; } rec.fsN=(rec.fsN||0)+1; }
  if(st.done){ rec.fsGen=null; if(rec.fs){ rec.fs.ms=rec.fsMs; rec.fs.maxSlice=rec.fsMax; rec.fs.maxPh=rec.fsMaxPh; rec.fs.slices=rec.fsN; } return true; }
  return st.value||false;
}
function cvfsRun(ms){
  const end=performance.now()+ms; let spin=0;
  for(;;){
    while(!CVFS.cur&&CVFS.q.length){ const r=CVFS.q.shift(); if(r.fsGen&&CV10.built.get(r.c)===r) CVFS.cur=r; }
    const r=CVFS.cur; if(!r) return;
    if(!r.fsGen||CV10.built.get(r.c)!==r){ CVFS.cur=null; continue; }
    const v=cvfsStep(r,Math.max(0.05,end-performance.now()));
    if(v===true){ CVFS.cur=null; }
    else if(v==='wait'){ CVFS.cur=null; CVFS.q.push(r); if(++spin>CVFS.q.length) return; continue; }
    else if(v==='frame') return;
    if(performance.now()>=end) return;
  }
}
/* 시험 · 개발자 이동 — 이 굴을 예산 ms 조각으로 끝까지(장식 · 가림 굽기가 안 끝났으면 null) */
function cvfsFlush(rec,ms){
  if(!rec||!rec.fsGen) return rec&&rec.fs||null;
  const qi=CVFS.q.indexOf(rec); if(qi>=0) CVFS.q.splice(qi,1); if(CVFS.cur===rec) CVFS.cur=null;
  for(let i=0;i<1e6;i++){ const v=cvfsStep(rec,ms===undefined?CVFS.budget:ms); if(v===true) break; if(v==='wait') return null; }
  return rec.fs;
}
function cvfsQueue(rec){
  if(rec.c.kind!=='karst'||!cvfsOn()||!rec.mesh) return;
  cvfsDrop(rec); rec.fsGen=cvfsGen(rec); rec.fsMs=0; rec.fsMax=0; rec.fsN=0; CVFS.q.push(rec);
  if(!CVFS.hooked&&typeof floraFindLook==='function'){                       // 장식(31-cave10deco.js)이 건 것 바깥에 건다 — 장식이 도는 틱엔 쉰다(합이 틱당 2 ms 를 안 넘게)
    CVFS.hooked=true; const f0=floraFindLook;
    floraFindLook=function(){ const busy=typeof CVD!=='undefined'&&(CVD.cur||CVD.q.length); f0(); if(!busy&&(CVFS.cur||CVFS.q.length)){ try{ cvfsRun(CVFS.budget); }catch(e){ showErr('굴 유석 덮개',e); } } };
  }
}
function cvfsDrop(rec){
  rec.fsGen=null; if(CVFS.cur===rec) CVFS.cur=null; { const qi=CVFS.q.indexOf(rec); if(qi>=0) CVFS.q.splice(qi,1); }
  if(rec.mesh) for(const m of rec.mesh.children.slice()) if(m.userData.cvFs){ rec.mesh.remove(m); m.geometry.dispose(); }
  rec.fs=null;
}
/* 시험 — 흐름 수 · 덮개 세모 · 정점 · 덩이 · 짓기 ms(합 · 가장 긴 조각) · 막 시험 · 덮개 자리 · 속성 해시 */
function cvfsStats(rec){
  const f=rec&&rec.fs; if(!f) return null;
  let hp=0, ha=0; const mix=(h,v)=>(Math.imul(h^Math.round(v*1e4),16777619)+0x9e3779b9)|0;
  for(const m of f.meshes){ const g=m.geometry; for(const v of g.attributes.position.array) hp=mix(hp,v); for(const nm of ['normal','aFs','aSky','aDeep']) for(const v of g.attributes[nm].array) ha=mix(ha,v); for(const v of g.index.array) ha=mix(ha,v); }
  const r3=v=>Math.round((v||0)*1000)/1000;
  return {flows:f.flows,seeps:f.seeps,cand:f.cand,tier:f.tier,ends:f.ends,used:f.used,k:f.k,tri:f.tri,verts:f.verts,chunks:f.chunks,covered:f.covered,sign:f.sign,
    ms:r3(f.ms),maxSlice:r3(f.maxSlice),maxPh:f.maxPh,slices:f.slices,test:f.test&&Object.assign({},f.test,{baseMax:r3(f.test.baseMax*1000)/1000,hInMin:f.test.hInMin<1e9?r3(f.test.hInMin*1000)/1000:null,hMax:r3(f.test.hMax)}),
    hashPos:hp>>>0,hashAttr:ha>>>0};
}
/* 시험 — 덮개 켬/끔(덮개 보이기 · karst 껍데기 재질 CM_FSO 를 함께) */
function cvfsSet(on){
  CVFS.on=!!on;
  for(const rec of CV10.built.values()){ if(rec.c.kind!=='karst'||!rec.mesh) continue;
    if(CV10.mat) rec.mesh.material=CV10.mat('karst');
    if(rec.fs) for(const m of rec.fs.meshes) m.visible=CVFS.on;
    else if(CVFS.on&&!rec.fsGen&&rec.onb) cvfsQueue(rec); }
  return CVFS.on;
}
CV10.onBuild.push(cvfsQueue); CV10.onDrop.push(cvfsDrop);
