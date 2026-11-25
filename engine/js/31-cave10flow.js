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
     · 투명 패스(얇은 가장자리가 비친다 · diffuseColor.a) · renderOrder −1(투명 가운데 맨 먼저 — 물 · 불티보다 앞) · 8 m 덩이로 나눠 한 프레임에 하나씩 붙인다
   · 결정론 — 제 해시(cv10H(정수, 정수, c.seed^상수)) · 흐름마다 mulberry32((c.seed^0xf105^열쇠)>>>0) 만 쓴다. X.rnd · X.prnd · Math.random 없음 ·
     결과는 짓는 차례 · 시간 조각 · 예산과 상관없다 · 굴 격자 · 껍데기 position/normal/index · rec.cols · CV10.picks · 장식은 읽기만 한다(줍기 · 몸 막기 없음 — 껍데기 겉으로 친다)
   이름은 cvfs · CVFS · cv10Flow 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다). 설계는 docs/notes/caves.md */
const CVFS={ on:true, budget:1.0, maxTri:30000, k:3, cell:8, q:[], cur:null, tEnd:0, hooked:false, mat:null, geo:null, dbg:false,
  /* 꼴 상수(사진 판정 뒤 손질하기 쉽게 여기 모은다 · 길이 m) */
  SH:{
    jSp:1.9, bSp:5.0, bK:0.35,                       // 절리 칸(휨 전 1.9 m → 1.2~4.3 m) · 켜 스밈 칸(직각 방위) · 켜 스밈 몫
    tier:[0.12,0.40,0.80], cap:[[2,10],[15,40],[40,80]],   // (A) 마른 층도 조금은(흙 적은 굴 — 흰 유석이 드물게)   // 굴 층(마름 · 보통 · 화려 — 셰이더 wsh 와 같은 갈래)마다 젖음 몫 · 흐름 수 상한
    fhLo:0.8, fhHi:7.5, nyLo:-0.35, dIn:10.6, sep:0.8,    // 스밈 걸러냄 — 바닥 위 높이 · 처마 밑 아님 · 입구에서 10.6 m(aSky<0.12) · 서로 떨어짐
    step:0.1, L:[2.5,8], drip:-0.35, flNy:0.7, flL:[0.6,2.0], flSl:0.03, ent:6, dam:2.5,   // 따라가기
    w0:[0.12,0.25], w1:[0.4,1.2], wB:[0.4,0.8], fan:[1.1,1.5],   // 너비 — 목 · 아래 · 켜 스밈의 목 · 바닥 부채 배율
    T:[0.03,0.12], Tfl:0.03, tng:[0.25,0.35], tngL:0.8,  // 두께 — 벽 막 · 바닥 · 처마 혀(얼어붙은 폭포) · 혀 길이
    lobe:0.5, lobeC:0.35, terA:0.30, terSp:[0.3,0.6],    // 볼록 덩이(+50%) · 덩이 칸 · 비탈 테라스 세기 · 간격
    ext:[0.10,0.45], tap:[0.15,0.30],                    // 아래 끝 둥근 혀 길이(끝 너비 비) · 바닥 판 가장자리가 녹아드는 너비(m)                                      // 아래 끝 둥근 혀가 나가는 길이(끝 너비 비)
    capW:0.35, eye:[1.0,2.2], capEye:0.10, capFl:0.04, curv:0.45, hIn:0.005, bury:-0.015, buryW:0.04, ring:0.35 },
  /* 빛 상수(#define 으로 박는다 — 바꾸면 재질을 다시 짜야 먹는다 · 열쇠에 든다). 바탕은 선형 · 휘도는 껍데기가 칠하던 유석(fcol ≈ 0.80)에 맞춤 */
  OPT:{
    /* 사진의 비(p4 1 : 0.84 : 0.62 · p1 · p2 1 : 0.62 : 0.32)는 따뜻한 관광 조명이 든 값이라 횃불((1, 0.56, 0.25))을 한 번 더 곱하면 R 만 넘쳐 납작한 주황이 됐다 —
       바탕은 거의 무채(석회암 CP_LIME 쯤) · 꿀 쪽만 채도를 남긴다 · 휘도는 fcol(0.80) 대신 0.50 · 0.45 — 껍데기는 가림 · 오목 · 젖음으로 바탕이 0.4~0.5 까지
       내려가는데 덮개는 그 짐이 없다. 잰 값(굴 9 · 벽 2.5 m · 횃불): 바탕 (0.58,0.54,0.47) 에서 덮개 화소 평균 (219,117,44) ↔ 같은 자리 껍데기 (189,128,56) — 덮개가 더 밝고 더 붉었다 */
    /* (3차) 그려진 빛깔로 맞췄다 — 목표: 벽 2.5 m 덮개 화소 평균 선형 비 G/R 0.62~0.75 · B/R 0.38~0.50(사진 p1 1 : 0.70 : 0.46).
       잰 값(굴 9 · 횃불): (0.50,0.50,0.46) → 0.58 · 0.25 / (0.40,0.48,0.66) → 0.64 · 0.36 / 아래 값 → 0.66 · 0.42. 횃불이 (1, 0.56, 0.25)라 바탕은 차가워야 한다 */
    alb:[0.36,0.46,0.74],         // 얇은 데
    albT:[0.40,0.45,0.60],        // 두꺼운 데(조금 덜 차갑게 — 그려지면 더 따뜻하다)
    /* (A) 굴마다 빛깔(겉흙 몫 → 정점 속성 aFk — 0 크림 · 1 황갈 · 2 꿀 · 3 적갈 · 사이는 섞음). 1 은 위 alb 그대로 · 두꺼운 데는 alb → albT 비를 곱한다.
       새 프로그램 없이(정의는 늘 같다 — 값은 정점마다). 비율 · 양은 실측 근거 없음(원리만) — 화소 비는 그려서 맞췄다 */
    pal:[[0.26,0.45,0.82],[0.36,0.46,0.74],[0.337,0.37,0.49],[0.36,0.29,0.35]],
    /* (B) 장식 겉칠(31-cave10deco.js 가 읽는다) — 정점 빛 남길 몫 · 화소 횃불 세기 · 갈래마다 빛깔 배율(크림 · 황갈 · 꿀 — 같은 굴 덮개와 그려진 화소 비를 맞춤: 겉칠은 젖음 · 두께 · 가림이 없어 그대로면 밝고 옅었다) */
    coat:{amb:0.15,k:1.0,s:[[0.90,0.83,0.80],[0.67,0.62,0.56],[0.56,0.50,0.47]]},
    thick:[0.05,0.25],            // 크림 → 꿀로 넘어가는 두께
    sigA:[2.0,6.0,14.0],          // 흡수(1/m) — 투과 빛깔이 두께대로 짙어진다(Beer–Lambert)
    mfp:0.008,                    // 산란 거리(m) — 투과 감쇠
    wrap:[0.40,0.26,0.19],        // 감싸기(빛깔마다 — Jensen 2001 대리석 확산 길이 R 8.5 · G 5.6 · B 4.0 mm 에 비례)
    soft:0.08,                    // 난반사에서 잔 결을 지우는 몫(산란 거리보다 잔 결)
    tcol:[1.0,0.55,0.12], tDelta:0.35, tPow:3.0, tK:1.6, edge:0.10,   // 투과 빛깔(사진 p5 · p6) · 굽힘 · 모임 · 세기 · 자유 가장자리 폭(m)
    rDry:0.85, rWet:0.20, f0Dry:0.045, f0Wet:0.02, wetD:0.58, wetSat:0.25 } };
const cvfsT=()=>performance.now()>CVFS.tEnd;
const cvfsSS=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const cvfsOn=()=>CVFS.on&&typeof cmOK==='function'&&cmOK();

/* ── 바탕 — 껍데기 세모 · 3 차원 칸 해시 · 꼭짓점 둘레(CSR) · 법선 부호 · 꼭짓점 굽이 ───────────────────────────── */
const cvfsCK=(ix,iy,iz)=>((ix+32768)*65536+(iy+32768))*65536+(iz+32768);
/* 칸 → 목록(사슬) — 칸마다 배열을 만들면 굴 하나에 수십만 개의 작은 배열이 생겨 GC 가 조각 시간을 튀게 했고(4~9.5 ms),
   Map 으로 머리를 두면 커질 때 다시 해시하는 한 번이 수십 ms 였다(마른 굴 ctx 72 ms) → 미리 크게 잡은 열린 주소 해시(형 배열) + 형 배열 사슬 */
function cvfsGrid(cells,ents){ let cap=4096; while(cap<cells*2) cap*=2; const keys=new Float64Array(cap);   // 빈 칸은 0(열쇠는 늘 > 0 — 채우기 없이 새 형 배열 그대로)
  return {cap,keys,head:new Int32Array(cap),cnt:0,nx:new Int32Array(Math.max(1024,ents)),val:new Int32Array(Math.max(1024,ents)),n:0}; }
const cvfsGSlot=(G,k)=>{ const m=G.cap-1, K=G.keys; let i=(Math.imul(k>>>0,0x9e3779b1)^Math.imul(Math.floor(k/4294967296)|0,0x85ebca77))&m;
  while(K[i]!==0&&K[i]!==k) i=(i+1)&m; return i; };
/* 열쇠 → 수 표(열린 주소 · 미리 크게) — 점 열쇠 · 변 셈에 Map 대신(커질 때 다시 해시하는 튐) */
function cvfsTab(n){ let cap=4096; while(cap<n*2) cap*=2; const keys=new Float64Array(cap); return {cap,keys,val:new Int32Array(cap),cnt:0}; }
function cvfsTSlot(T,k){ if(T.cnt*10>=T.cap*7){ const ok=T.keys, ov=T.val, oc=T.cap; T.cap*=2; T.keys=new Float64Array(T.cap); T.val=new Int32Array(T.cap);
    for(let q=0;q<oc;q++) if(ok[q]!==0){ const s2=cvfsGSlot(T,ok[q]); T.keys[s2]=ok[q]; T.val[s2]=ov[q]; } }
  return cvfsGSlot(T,k); }
/* 자라는 형 배열(두 배씩 — 옮기는 일은 드물다) */
const cvfsGrow=(a,n)=>{ if(n<=a.length) return a; let c=a.length*2; while(c<n) c*=2; const b=new a.constructor(c); b.set(a); return b; };
const cvfsGHead=(G,k)=>{ const i=cvfsGSlot(G,k); return G.keys[i]===k?G.head[i]:-1; };
function cvfsGAdd(G,k,v){
  if(G.n>=G.val.length){ const c=G.val.length*2, a=new Int32Array(c), b=new Int32Array(c); a.set(G.nx); b.set(G.val); G.nx=a; G.val=b; }
  if(G.cnt*10>=G.cap*7){ const ok=G.keys, oh=G.head, oc=G.cap; G.cap*=2; G.keys=new Float64Array(G.cap); G.head=new Int32Array(G.cap);   // 드물게 — 어림이 모자랄 때만
    for(let q=0;q<oc;q++) if(ok[q]!==0){ const s2=cvfsGSlot(G,ok[q]); G.keys[s2]=ok[q]; G.head[s2]=oh[q]; } }
  const i=cvfsGSlot(G,k); if(G.keys[i]===0){ G.keys[i]=k; G.head[i]=-1; G.cnt++; }
  G.nx[G.n]=G.head[i]; G.val[G.n]=v; G.head[i]=G.n++; }
function* cvfsCtx(rec){
  const g=rec.mesh.geometry, P=g.attributes.position.array, N=g.attributes.normal.array, I=g.index.array, nv=g.attributes.position.count, nt=I.length/3;
  const X={rec,c:rec.c,P,N,I,nv,nt,sky:g.attributes.aSky.array,deep:g.attributes.aDeep.array,ao:g.attributes.aAo?g.attributes.aAo.array:null,
    FN:new Float32Array(nt*3), cells:null, deg:new Int32Array(nv+1), vt:null, kap:new Float32Array(nv), bv:new Uint8Array(nv), sign:1, eLen:0};
  /* 큰 형 배열은 제 조각에서(짓기 튐 — ctx 12.6 ms) · 칸 수 어림 — 껍데기 겉넓이(m²) × 2 쯤이라 nt/2 면 넉넉하다(예전 nt×4 는 30 배 컸다) */
  yield; X.cells=cvfsGrid(nt>>1,nt*10); yield;
  const FN=X.FN, cells=X.cells, M=0.35; let el=0, en=0;
  for(let t=0;t<nt;t++){ if((t&15)===0&&t&&cvfsT()) yield;
    const a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
    const ux=P[b]-P[a], uy=P[b+1]-P[a+1], uz=P[b+2]-P[a+2], vx=P[c]-P[a], vy=P[c+1]-P[a+1], vz=P[c+2]-P[a+2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; const l=Math.hypot(nx,ny,nz)||1; FN[t*3]=nx/l; FN[t*3+1]=ny/l; FN[t*3+2]=nz/l;
    el+=Math.hypot(ux,uy,uz)+Math.hypot(vx,vy,vz); en+=2;
    const x0=Math.floor(Math.min(P[a],P[b],P[c])-M), x1=Math.floor(Math.max(P[a],P[b],P[c])+M), y0=Math.floor(Math.min(P[a+1],P[b+1],P[c+1])-M), y1=Math.floor(Math.max(P[a+1],P[b+1],P[c+1])+M),
      z0=Math.floor(Math.min(P[a+2],P[b+2],P[c+2])-M), z1=Math.floor(Math.max(P[a+2],P[b+2],P[c+2])+M);
    for(let ix=x0;ix<=x1;ix++) for(let iy=y0;iy<=y1;iy++) for(let iz=z0;iz<=z1;iz++) cvfsGAdd(cells,cvfsCK(ix,iy,iz),t);
    X.deg[I[t*3]+1]++; X.deg[I[t*3+1]+1]++; X.deg[I[t*3+2]+1]++; }
  X.eLen=el/Math.max(1,en);
  yield; const dg=X.deg; for(let v=0;v<nv;v++){ if((v&8191)===8191&&cvfsT()) yield; dg[v+1]+=dg[v]; }
  yield; const vt=X.vt=new Int32Array(dg[nv]), fp=dg.slice(0,nv); yield;
  for(let t=0;t<nt;t++){ if((t&2047)===2047&&cvfsT()) yield; vt[fp[I[t*3]]++]=t; vt[fp[I[t*3+1]]++]=t; vt[fp[I[t*3+2]]++]=t; }
  yield; const wall=new Int32Array(nt); let nwall=0;
  /* 꼭짓점 굽이 κ(변마다 |Δn|/|Δp| 의 큰 값) · 껍데기 가장자리 변(세모 하나만 가진 변)의 꼭짓점 */
  for(let t=0;t<nt;t++){ if((t&63)===0&&t&&cvfsT()) yield;
    for(let e=0;e<3;e++){ const a=I[t*3+e], b=I[t*3+(e+1)%3], pa=a*3, pb=b*3;
      const dp=Math.hypot(P[pa]-P[pb],P[pa+1]-P[pb+1],P[pa+2]-P[pb+2]), dn=Math.hypot(N[pa]-N[pb],N[pa+1]-N[pb+1],N[pa+2]-N[pb+2]), k=dp>1e-6?dn/dp:0;
      if(k>X.kap[a]) X.kap[a]=k; if(k>X.kap[b]) X.kap[b]=k;
      if(cvfsEdgeN(X,a,b)<2){ X.bv[a]=1; X.bv[b]=1; } }
    if(Math.abs(FN[t*3+1])<0.6) wall[nwall++]=t; }
  /* 법선이 굴 안쪽을 보는지 — 벽 세모 예순 개의 안쪽 0.3 m 가 빈 데인지 투표(31-cave10deco.js cvdTris 와 같은 법) */
  let vote=0, nw=0;
  for(let k=0;k<Math.min(60,nwall);k++){ const t=wall[(k*nwall/60)|0], a=I[t*3]*3, mx=P[a], my=P[a+1], mz=P[a+2], nx=N[a], nz=N[a+2];
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
    for(let dx=-R;dx<=R;dx++) for(let dy=-R;dy<=R;dy++) for(let dz=-R;dz<=R;dz++){ const G=X.cells, h0=cvfsGHead(G,cvfsCK(ix+dx,iy+dy,iz+dz)); if(h0<0) continue;
      for(let q=h0;q>=0;q=G.nx[q]){ const t=G.val[q], a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
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
/* (A) 굴 위 겉흙 몫 0~2 — 굴 상자 3×3 점과 입구의 섬 격자 바이옴(시드에서 나오니 결정론 · 옛 저장도 같다).
   유석의 양 · 빛깔은 위 흙 · 식생(부식산 · 풀빅산 · 흙 CO2)이 가른다는 원리만 쓴다 — 바이옴마다의 양 · 빛깔 비율은 실측 근거 없음 */
const CVFS_SOIL=(()=>{ const t=[]; t[B.BROADLEAF]=2; t[B.CONIFER]=2; t[B.BAMBOO]=2; t[B.MARSH]=2; t[B.MEADOW]=1; t[B.SCRUB]=1; t[B.RIVER]=1; return t; })();   // 그 밖(해변 · 사구 · 맨바위 · 너덜 · 지열 · 바다) 0
function cvfsSoil(c){
  const b=c.box, pts=[[c.mouths[0].x,c.mouths[0].z]]; for(let j=0;j<3;j++) for(let i=0;i<3;i++) pts.push([b.x0+(b.x1-b.x0)*(i+0.5)/3,b.z0+(b.z1-b.z0)*(j+0.5)/3]);
  let s=0; for(const [x,z] of pts){ const gx=clamp(Math.round(x/CELL+N/2),0,N-1), gz=clamp(Math.round(z/CELL+N/2),0,N-1); s+=CVFS_SOIL[F.biome[IDX(gx,gz)]]||0; }
  return s/pts.length;
}
function cvfsSeedCtx(X){
  const c=X.c, P=c._P||cv10Prep(c), cs=cv10H(c.seed|0,71,0x5eed), SH=CVFS.SH, soil=cvfsSoil(c);
  /* 굴 층(양) — 겉흙 몫 + 해시 흔들림(예전엔 해시만) · 빛깔 값 k(0 크림 · 1 황갈 · 2 꿀 · 3 적갈) — 겉흙 몫 + 흔들림 */
  const u=soil/2+0.30*(((cs*3.3)%1)-0.5), ti=u<0.33?0:(u<0.67?1:2), kc=Math.max(0,Math.min(2.2,soil+0.6*(cv10H(c.seed|0,13,0xc01a)-0.5)));
  const a=cs*6.283185307179586, cr=SH.cap[ti];
  return {cs, soil, k:kc, b:Math.max(P.b||1,0.3), off:P.off||0, ti, wsh:SH.tier[ti], dx:Math.cos(a), dz:Math.sin(a), ph:cs*17, sk:0.2*(((cs*3.1)%1)-0.5),
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
  const r1=rnd(), r2=rnd(), r3=rnd(), r4=rnd(), r5=rnd(), r6=rnd(), r7=rnd(), r8=rnd();
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
  const fk=Math.max(0,X.S.k+0.35*(r7-0.5)+(X.S.k>1.5&&r8<0.25?0.8:0));   // 흐름마다 빛깔이 조금씩 · 흙 많은 굴은 흐름 넷에 하나가 적갈 띠
  return {pts,s,end,key:sp.key,pri:sp.pri,f:sp.f,fk,wet:0.4+0.6*r6,tap:SH.tap[0]+(SH.tap[1]-SH.tap[0])*r2,ext:end==='drip'?0.12:SH.ext[0]+(SH.ext[1]-SH.ext[0])*r5,sd:(Math.imul(sp.key|0,0x9e3779b1)^X.S.sd)|0};
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
  let np=0; for(const F of flows) np+=F.pts.length; const cells=cvfsGrid(np*16,np*64), SH=CVFS.SH;
  for(let fi=0;fi<flows.length;fi++){ const F=flows[fi], p=F.pts;
    for(let i=0;i+1<p.length;i++){ if(cvfsT()) yield; const A=p[i], B=p[i+1], R=Math.max(A.w,B.w)*(1+F.ext)+0.05+SH.ring+SH.buryW;
      const x0=Math.floor(Math.min(A.x,B.x)-R), x1=Math.floor(Math.max(A.x,B.x)+R), y0=Math.floor(Math.min(A.y,B.y)-R), y1=Math.floor(Math.max(A.y,B.y)+R), z0=Math.floor(Math.min(A.z,B.z)-R), z1=Math.floor(Math.max(A.z,B.z)+R);
      for(let ix=x0;ix<=x1;ix++) for(let iy=y0;iy<=y1;iy++) for(let iz=z0;iz<=z1;iz++) cvfsGAdd(cells,cvfsCK(ix,iy,iz),fi*4096+i); } }
  return cells;
}
/* 단면 — 벽은 둥근 볼록(√(1−r²)) · 바닥(fk 1)은 가장자리 tp(너비 비)에 걸쳐 완만히 녹아드는 판 */
function cvfsProf(r,fk,tp){ const dome=Math.sqrt(Math.max(0,1-r*r)); if(fk<=0) return dome; const ramp=cvfsSS(0,1,(1-r)/tp); return dome+(ramp-dome)*fk; }
/* 한 점(밑점 x,y,z · 안쪽 법선 · 바닥 위 높이 fh · 굽이 kap)의 두께 h · 가장자리까지 e · 흐름 길이 s · 젖음 w · 막 밖 거리 out · 막 안 in */
function cvfsH(X,x,y,z,nx,ny,nz,fh,kap,o){
  const SH=CVFS.SH, F=X.fl, SG=X.segC, h0=cvfsGHead(SG,cvfsCK(Math.floor(x),Math.floor(y),Math.floor(z)));
  o.h=SH.bury; o.e=0; o.s=0; o.w=0; o.k=X.S.k; o.out=9; o.in=false; o.fl=0; if(h0<0) return o;
  const st=++X.stamp, bd=X.bd, bi=X.bi, bt=X.bt, sm=X.stm, tch=X.tch; let nt=0;
  for(let q=h0;q>=0;q=SG.nx[q]){ const id=SG.val[q], fi=(id/4096)|0, i=id-fi*4096, p=F[fi].pts, A=p[i], B=p[i+1];
    const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=ex*ex+ey*ey+ez*ez; let t=ll>1e-12?((x-A.x)*ex+(y-A.y)*ey+(z-A.z)*ez)/ll:0; t=t<0?0:t>1?1:t;
    const qx=x-A.x-ex*t, qy=y-A.y-ey*t, qz=z-A.z-ez*t, d2=qx*qx+qy*qy+qz*qz;
    if(sm[fi]!==st){ sm[fi]=st; tch[nt++]=fi; bd[fi]=d2; bi[fi]=i; bt[fi]=t; } else if(d2<bd[fi]){ bd[fi]=d2; bi[fi]=i; bt[fi]=t; } }
  let s4=0, ss=0, sw=0, sk=0, em=0, out=9, lob=-1;
  for(let k=0;k<nt;k++){ const fi=tch[k], Fl=F[fi], p=Fl.pts, i=bi[fi], t=bt[fi], A=p[i], B=p[i+1];
    const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=Math.sqrt(ex*ex+ey*ey+ez*ez)||1e-6, tx=ex/ll, ty=ey/ll, tz=ez/ll;
    const cx=A.x+ex*t, cy=A.y+ey*t, cz=A.z+ez*t, qx=x-cx, qy=y-cy, qz=z-cz, d=Math.sqrt(bd[fi]);
    const pnx=A.nx+(B.nx-A.nx)*t, pny=A.ny+(B.ny-A.ny)*t, pnz=A.nz+(B.nz-A.nz)*t;
    if(nx*pnx+ny*pny+nz*pnz<-0.2) continue;                                      // 마주 보는 벽 · 반대쪽 면은 안 덮는다
    const w=A.w+(B.w-A.w)*t, T=A.T+(B.T-A.T)*t, s=A.s+(B.s-A.s)*t, al=qx*tx+qy*ty+qz*tz, fk=A.fl+(B.fl-A.fl)*t;
    const tpr=Math.min(0.9,Fl.tap/Math.max(w,1e-3));                            // 바닥 — 가장자리 tap m 에 걸쳐 녹아든다(cvfsProf)
    const last=i===p.length-2&&t>=1, first=i===0&&t<=0;
    let tk=0, e=0, o2=9;
    if(first){ const r=d/Math.max(w,1e-3); if(r<1){ tk=T*cvfsProf(r,fk,tpr); e=w-d; } else o2=d-w; }
    else{ const bey=last?Math.max(0,al):0, lat=Math.sqrt(Math.max(0,d*d-bey*bey));
      const sx=pny*tz-pnz*ty, sy=pnz*tx-pnx*tz, sz=pnx*ty-pny*tx, ls=(qx*sx+qy*sy+qz*sz)>=0?1:-1, ln=lat/Math.max(w,1e-3);
      let E=1e9; if(last){ E=w*(Fl.ext*(0.4+1.2*cvfsVN1(ls*ln*2.2+3.7,Fl.sd)))*(1-0.15*ln*ln); }
      if(ln<1&&bey<E){ tk=T*cvfsProf(ln,fk,tpr)*(bey>0?Math.sqrt(Math.max(0,1-(bey/E)*(bey/E))):1); e=Math.min(w-lat,E-bey); }
      else o2=Math.max(lat-w,bey-E,0); }
    if(tk>0){ const t4=tk*tk*tk*tk; s4+=t4; if(fk>o.fl) o.fl=fk; ss+=t4*s; sk+=t4*Fl.fk; sw+=t4*Fl.wet*(0.6+0.4*Math.min(1,s/Math.max(Fl.s,0.3))); if(e>em) em=e; }
    else if(o2<out) out=o2; }
  if(s4>0){
    let h=Math.pow(s4,0.25);
    h*=1-SH.lobe*0.4+SH.lobe*1.4*cvfsVN(x/SH.lobeC,y/SH.lobeC,z/SH.lobeC,X.S.sd^0x10be);   // 볼록 덩이(평균 ≈ +30% · 0.8~1.5 배)
    const sl=cvfsSS(0.25,0.40,ny)*(1-cvfsSS(0.70,0.85,ny));                                     // 비탈 테라스 — 둥근 턱
    if(sl>0){ const sp=SH.terSp[0]+(SH.terSp[1]-SH.terSp[0])*cvfsVN(x/3,0.5,z/3,X.S.sd^0x7e7), u=y/sp+0.8*cvfsVN(x/2,y/2,z/2,X.S.sd^0x7e9), f=u-Math.floor(u);
      h*=1+SH.terA*sl*(cvfsSS(0,0.35,f)*(1-cvfsSS(0.35,1,f))-0.4); }   // 턱이 솟는 몫을 넓게(꺾임을 덜게)
    const eye=cvfsSS(SH.eye[0]-0.6,SH.eye[0],fh)*(1-cvfsSS(SH.eye[1],SH.eye[1]+0.6,fh)),   // 상한이 바뀌는 띠를 0.6 m 로(0.2 m 였을 때 눈높이 위 2.2~2.4 m 에 막이 꺾인 가는 가로 줄이 섰다)
      flo=Math.max(cvfsSS(0.45,0.65,ny),1-cvfsSS(0.15,0.35,fh));
    let cap=SH.capW+(SH.capEye-SH.capW)*eye; cap=cap+(SH.capFl-cap)*flo; if(kap>1e-6) cap=Math.min(cap,SH.curv/kap);
    o.h=Math.max(cv10Smin(h,cap,0.04),SH.hIn); o.e=em; o.s=ss/s4; o.k=sk/s4; o.w=Math.max(sw/s4,0.85*flo); o.out=0; o.in=true; }   // 상한은 부드러운 최소로(꺾임 없이 붙는다)
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
    yield;
    const mark=new Uint8Array(X.nt), cand=[];
    const SG=X.segC, CG=X.cells;
    for(let sl=0;sl<SG.cap;sl++){ const ck=SG.keys[sl]; if(ck===0) continue; const s0=SG.head[sl], t0=cvfsGHead(CG,ck); if(t0<0){ if((sl&255)===0&&cvfsT()) yield; continue; }
      for(let qt=t0;qt>=0;qt=CG.nx[qt]){ const t=CG.val[qt]; if(mark[t]) continue; if(cvfsT()) yield; const a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3, mx=(P[a]+P[b]+P[c])/3, my=(P[a+1]+P[b+1]+P[c+1])/3, mz=(P[a+2]+P[b+2]+P[c+2])/3;
        const rr=Math.sqrt(Math.max((P[a]-mx)**2+(P[a+1]-my)**2+(P[a+2]-mz)**2,(P[b]-mx)**2+(P[b+1]-my)**2+(P[b+2]-mz)**2,(P[c]-mx)**2+(P[c+1]-my)**2+(P[c+2]-mz)**2));
        for(let qs=s0;qs>=0;qs=SG.nx[qs]){ const id=SG.val[qs], fi=(id/4096)|0, i=id-fi*4096, p=flows[fi].pts, A=p[i], B=p[i+1], R=Math.max(A.w,B.w)*(1+flows[fi].ext)+rr+0.05;
          const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=ex*ex+ey*ey+ez*ez; let q=ll>1e-12?((mx-A.x)*ex+(my-A.y)*ey+(mz-A.z)*ez)/ll:0; q=q<0?0:q>1?1:q;
          if((mx-A.x-ex*q)**2+(my-A.y-ey*q)**2+(mz-A.z-ez*q)**2<R*R){ mark[t]=1; cand.push(t); break; } } }
      if(cvfsT()) yield; }
    cand.sort((a,b)=>a-b); CVFS.ph='close';
    /* 점 — 열쇠: 꼭짓점 −(v+1) · 변 (작은 번호, 큰 번호, 작은 쪽에서 i) · 세모 안 nv²·8 + t·16 + i·4 + j */
    /* 점 자료는 미리 잡은 형 배열(자라면 두 배) — JS 배열 push 가 GC 로 조각 시간을 튀게 했다 */
    const est=Math.max(1024,Math.ceil(cand.length*(k+1)*(k+2)/2*1.6)), pk=cvfsTab(est*2); let np=0;   // pk 를 두 배로 — 닫기가 후보보다 넓어져도 다시 해시(한 번에 10 ms 넘게)가 안 나게
    let PB=new Float64Array(est*3), PN=new Float64Array(est*3), PA=new Float32Array(est*3), PH=new Float64Array(est), PF=new Float32Array(est*4), PT=new Int32Array(est), PV=new Int32Array(est), PK=new Float32Array(est); const o={};
    const evalPt=(key,t,b0,b1,b2,va,vb,vc)=>{ const kk=key<0?2251799813685248-key:key, sl=cvfsTSlot(pk,kk); if(pk.keys[sl]===kk) return pk.val[sl]; const id=np++; pk.keys[sl]=kk; pk.val[sl]=id; pk.cnt++;
      if(np>PH.length){ PB=cvfsGrow(PB,np*3); PN=cvfsGrow(PN,np*3); PA=cvfsGrow(PA,np*3); PH=cvfsGrow(PH,np); PF=cvfsGrow(PF,np*4); PT=cvfsGrow(PT,np); PV=cvfsGrow(PV,np); PK=cvfsGrow(PK,np); }
      const x=P[va*3]*b0+P[vb*3]*b1+P[vc*3]*b2, y=P[va*3+1]*b0+P[vb*3+1]*b1+P[vc*3+1]*b2, z=P[va*3+2]*b0+P[vb*3+2]*b1+P[vc*3+2]*b2;
      let nx=N[va*3]*b0+N[vb*3]*b1+N[vc*3]*b2, ny=N[va*3+1]*b0+N[vb*3+1]*b1+N[vc*3+1]*b2, nz=N[va*3+2]*b0+N[vb*3+2]*b1+N[vc*3+2]*b2; const nl=(Math.hypot(nx,ny,nz)||1)*X.sign; nx/=nl; ny/=nl; nz/=nl;
      const hl=Math.hypot(nx,nz), s=hl>0.2?cv10Samp(rec,x+nx/hl*0.5,z+nz/hl*0.5):cv10Samp(rec,x,z), fh=s.n>0?y-s.f:0;
      const kap=X.kap[va]*b0+X.kap[vb]*b1+X.kap[vc]*b2;
      /* 껍데기 가장자리(세모 하나만 가진 변 위의 점 · 그런 변에 닿은 꼭짓점) — 늘 묻는다(이웃이 없어 막을 닫을 수 없다) */
      const bnd=key<0?X.bv[va]===1:(b2===0&&X.bv[va]&&X.bv[vb]&&cvfsEdgeN(X,va,vb)<2);
      cvfsH(X,x,y,z,nx,ny,nz,fh,kap,o);
      let h=o.h, inn=o.in; if(bnd){ h=SH.bury; inn=false; }
      const sk=X.sky, dp=X.deep, ao=X.ao;
      PB[id*3]=x; PB[id*3+1]=y; PB[id*3+2]=z; PN[id*3]=nx; PN[id*3+1]=ny; PN[id*3+2]=nz; PH[id]=h; PF[id*4]=h>0?o.e:0; PF[id*4+1]=h>0?o.s:0; PF[id*4+2]=h>0?o.w:0; PF[id*4+3]=inn?0:o.out; PK[id]=o.k;
      PA[id*3]=sk[va]*b0+sk[vb]*b1+sk[vc]*b2; PA[id*3+1]=dp[va]*b0+dp[vb]*b1+dp[vc]*b2; PA[id*3+2]=ao?ao[va]*b0+ao[vb]*b1+ao[vc]*b2:1; PT[id]=t; PV[id]=key<0?va:-1;
      return id; };
    const edPt=(t,a,b,ia)=>{ const lo=a<b?a:b, hi=a<b?b:a, ii=a<b?ia:k-ia; return evalPt((lo*nv+hi)*8+ii,t,(k-ii)/k,ii/k,0,lo,hi,hi); };   // 변 위의 점(작은 번호에서 ii)
    /* 세모 t 의 (i,j) 점 — A=I[t*3] 무게 (k−i−j) · B i · C j */
    const ptOf=(t,i,j)=>{ const A=I[t*3], B=I[t*3+1], C=I[t*3+2], m=k-i-j;
      if(i===0&&j===0) return evalPt(-(A+1),t,1,0,0,A,A,A); if(i===k) return evalPt(-(B+1),t,1,0,0,B,B,B); if(j===k) return evalPt(-(C+1),t,1,0,0,C,C,C);
      if(j===0) return edPt(t,A,B,i); if(i===0) return edPt(t,A,C,j); if(m===0) return edPt(t,B,C,j);
      return evalPt(nv*nv*8+t*16+i*4+j,t,m/k,i/k,j/k,A,B,C); };
    yield;
    const inS=new Uint8Array(X.nt), set=[], Q=cand.slice(), ptB=new Int32Array((k+1)*(k+1)); let qi=0, nb=[];
    while(qi<Q.length){ const t=Q[qi++]; if(inS[t]) continue; inS[t]=1; set.push(t);
      if(cvfsT()) yield;
      for(let j=0;j<=k;j++) for(let i=0;i+j<=k;i++) ptB[j*(k+1)+i]=ptOf(t,i,j);
      for(let e=0;e<3;e++){ const a=I[t*3+(e===2?1:0)], b=I[t*3+(e===0?1:2)]; let pos=false;   // 변 AB(j 0) · AC(i 0) · BC(i+j k)
        for(let q=0;q<=k;q++){ const id=e===0?ptB[q]:(e===1?ptB[q*(k+1)]:ptB[q*(k+1)+(k-q)]); if(PH[id]>0){ pos=true; break; } }
        if(!pos) continue; nb.length=0; cvfsEdgeN(X,a,b,nb); for(const t2 of nb) if(!inS[t2]) Q.push(t2); } }
    set.sort((a,b)=>a-b); CVFS.ph='tris';
    /* 작은 세모 — 세 점이 다 h≤0 이면 버린다 · 감는 차례는 껍데기와 같다(앞면이 빈 데 쪽) */
    let tri=new Int32Array(Math.max(3072,set.length*k*k*3)), own=new Int32Array(Math.max(1024,set.length*k*k)), nq=0;   // 작은 세모(형 배열)
    /* 다 덮인 껍데기 세모 — 나눈 점이 모두 h ≥ 1 cm(막이 묻힌 데가 없다). 껍데기는 꼭짓점 aFc 셋이 다 1 인 세모를 안 그리듯 칠하니(CM_FSO) 그 세모는 반드시 다 덮여야 한다 */
    yield;
    const full=new Uint8Array(X.nt);
    for(const t of set){ if(cvfsT()) yield; let ok=1; for(let j=0;j<=k&&ok;j++) for(let i=0;i+j<=k;i++) if(PH[ptOf(t,i,j)]<0.01){ ok=0; break; } full[t]=ok; }
    for(const t of set){ for(let j=0;j<k;j++) for(let i=0;i+j<k;i++){
        const a=ptOf(t,i,j), b=ptOf(t,i+1,j), c=ptOf(t,i,j+1);
        if(PH[a]>0||PH[b]>0||PH[c]>0){ if(nq*3+3>tri.length){ tri=cvfsGrow(tri,nq*3+3); own=cvfsGrow(own,nq+1); } tri[nq*3]=a; tri[nq*3+1]=b; tri[nq*3+2]=c; own[nq++]=t; }
        if(i+j<k-1){ const d=ptOf(t,i+1,j+1); if(PH[b]>0||PH[d]>0||PH[c]>0){ if(nq*3+3>tri.length){ tri=cvfsGrow(tri,nq*3+3); own=cvfsGrow(own,nq+1); } tri[nq*3]=b; tri[nq*3+1]=d; tri[nq*3+2]=c; own[nq++]=t; } } }
      if(cvfsT()) yield; }
    const ntri=nq; tri=tri.subarray(0,nq*3); own=own.subarray(0,nq);
    if(ntri>CVFS.maxTri&&tries<9){ if(X.k>2) X.k--; else X.nUse=Math.max(1,Math.floor(X.nUse*0.85)); continue; }
    Object.assign(X,{full,set,tri,own,PB:PB.subarray(0,np*3),PN:PN.subarray(0,np*3),PH:PH.subarray(0,np),PF:PF.subarray(0,np*4),PA:PA.subarray(0,np*3),PT:PT.subarray(0,np),PV:PV.subarray(0,np),PK:PK.subarray(0,np),ntri,cand:cand.length});
    return;
  }
}

/* ── 메시 — 법선 · 8 m 덩이 · 껍데기 aFc ─────────────────────────────────────────────────────────────────────── */
function* cvfsMesh(X){
  const SH=CVFS.SH, np=X.PH.length, PB=X.PB, PN=X.PN, PH=X.PH, tri=X.tri, rec=X.rec;
  CVFS.ph='mesh'; yield; const pos=new Float64Array(np*3); yield;
  for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const h=PH[p]; pos[p*3]=PB[p*3]+PN[p*3]*h; pos[p*3+1]=PB[p*3+1]+PN[p*3+1]*h; pos[p*3+2]=PB[p*3+2]+PN[p*3+2]*h; }
  yield; const nrm=new Float64Array(np*3); let flip=0; yield;
  for(let q=0;q<tri.length;q+=3){ if((q%6144)===0&&q&&cvfsT()) yield; const a=tri[q]*3, b=tri[q+1]*3, c=tri[q+2]*3;
    const ux=pos[b]-pos[a], uy=pos[b+1]-pos[a+1], uz=pos[b+2]-pos[a+2], vx=pos[c]-pos[a], vy=pos[c+1]-pos[a+1], vz=pos[c+2]-pos[a+2];
    const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    nrm[a]+=nx; nrm[a+1]+=ny; nrm[a+2]+=nz; nrm[b]+=nx; nrm[b+1]+=ny; nrm[b+2]+=nz; nrm[c]+=nx; nrm[c+1]+=ny; nrm[c+2]+=nz;
    const t=X.own[q/3]; if(nx*X.FN[t*3]+ny*X.FN[t*3+1]+nz*X.FN[t*3+2]<0) flip++; }   // 스스로 접힌 세모(오목한 모서리)
  for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const o=p*3, l=Math.hypot(nrm[o],nrm[o+1],nrm[o+2]); if(l>1e-12){ nrm[o]/=l; nrm[o+1]/=l; nrm[o+2]/=l; } else { nrm[o]=PN[o]; nrm[o+1]=PN[o+1]; nrm[o+2]=PN[o+2]; } }
  yield;
  /* 막 시험 — 열린 모서리(작은 세모 하나만 가진 변) 가운데 한 끝이라도 h>0 · 밑점이 껍데기 세모 평면에서 벗어난 것(f32 자리 − h·보간 법선) · 막 안쪽 두께 최솟값 */
  const st={open:0,openPos:0,baseOff:0,baseMax:0,hInMin:1e9,flip,hMax:0};
  /* 변 수 ≈ 작은 세모 × 1.5 */
  yield; { const em=cvfsTab(tri.length*2/3); yield; for(let q=0;q<tri.length;q+=3){ if((q%3072)===0&&q&&cvfsT()) yield; for(let e=0;e<3;e++){ const a=tri[q+e], b=tri[q+(e+1)%3], k2=a<b?a*np+b:b*np+a, sl=cvfsTSlot(em,k2); if(em.keys[sl]!==k2){ em.keys[sl]=k2; em.val[sl]=0; em.cnt++; } em.val[sl]++; } }
    for(let sl=0;sl<em.cap;sl++){ if((sl&8191)===0&&sl&&cvfsT()) yield; const k2=em.keys[sl]; if(k2===0||em.val[sl]!==1) continue; st.open++; const a=Math.floor(k2/np), b=k2-a*np; if(PH[a]>0||PH[b]>0) st.openPos++; } }
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
  if(fc){ const A=fc.array; A.fill(0); for(let p=0;p<np;p++){ if((p&4095)===0&&p&&cvfsT()) yield; const v=X.PV[p]; if(v<0) continue; let all=1; for(let q=X.deg[v];q<X.deg[v+1];q++) if(!X.full[X.vt[q]]){ all=0; break; }
      let hl=0; if(!(PH[p]>0)){ const bx=X.PB[p*3], by=X.PB[p*3+1], bz=X.PB[p*3+2], R=SH.ring*(0.6+1.1*cvfsVN(bx/0.5,by/0.5,bz/0.5,X.S.sd^0x4a1)), o2=X.ho||(X.ho={});
        hl=1-cvfsSS(0,R,X.PF[p*4+3]);
        if(X.PF[p*4+3]<1.2){ cvfsH(X,bx,by+0.45,bz,X.PN[p*3],X.PN[p*3+1],X.PN[p*3+2],1.5,0,o2); const st=cvfsSS(0.45,0.70,cvfsVN(bx/0.25,by/3,bz/0.25,X.S.sd^0x4a3));   // 흐름 아래로 번진 혀 — 0.45 m 위가 막 속이거나 가까우면(줄기 몇 가닥)
          hl=Math.max(hl,(1-cvfsSS(0,R*1.5,o2.in?0:o2.out))*st*0.85); } }
      A[v]=(PH[p]>0&&all)?1:Math.min(0.98,PH[p]>0?0.98:hl); } X.fcPend=true; }   // aFc 1 은 둘레 세모가 모두 다 덮였을 때만(아니면 0.98 — 젖은 자국은 그대로 · 건너뛰기만 막는다)
  if(fc){ const A=fc.array; let bad=0, one=0; for(let v=0;v<A.length;v++){ if(A[v]<=0.999) continue; one++; for(let q=X.deg[v];q<X.deg[v+1];q++) if(!X.full[X.vt[q]]){ bad++; break; } } X.test.fcBad=bad; X.test.fcOne=one; }   // 시험 — aFc 1 인데 둘레가 다 덮이지 않은 꼭짓점(0 이어야)
  /* 덩이 — 껍데기 세모 무게중심의 8 m 칸 · 열쇠 차례로 */
  const ch=new Map(), cs=CVFS.cell;
  for(let q=0;q<X.own.length;q++){ if((q&4095)===0&&q&&cvfsT()) yield; const t=X.own[q], a=I[t*3]*3, b=I[t*3+1]*3, c=I[t*3+2]*3;
    const k2=cvfsCK(Math.floor((P[a]+P[b]+P[c])/3/cs),Math.floor((P[a+1]+P[b+1]+P[c+1])/3/cs),Math.floor((P[a+2]+P[b+2]+P[c+2])/3/cs));
    let L=ch.get(k2); if(!L) ch.set(k2,L=[]); L.push(q); }
  const keys=[...ch.keys()].sort((a,b)=>a-b), geos=[];
  for(const k2 of keys){ const L=ch.get(k2), rm=new Map(), vlist=[];
    for(const q of L) for(let e=0;e<3;e++){ const p=tri[q*3+e]; if(!rm.has(p)){ rm.set(p,vlist.length); vlist.push(p); } }
    const n=vlist.length, Po=new Float32Array(n*3), No=new Float32Array(n*3), Sk=new Float32Array(n), Dp=new Float32Array(n), Ao=new Float32Array(n), Fs=new Float32Array(n*4), Fk=new Float32Array(n), Ix=n>65535?new Uint32Array(L.length*3):new Uint16Array(L.length*3);
    for(let v=0;v<n;v++){ const p=vlist[v]; Po[v*3]=pos[p*3]; Po[v*3+1]=pos[p*3+1]; Po[v*3+2]=pos[p*3+2]; No[v*3]=nrm[p*3]; No[v*3+1]=nrm[p*3+1]; No[v*3+2]=nrm[p*3+2];
      Sk[v]=X.PA[p*3]; Dp[v]=X.PA[p*3+1]; Ao[v]=X.PA[p*3+2]; Fs[v*4]=PH[p]; Fs[v*4+1]=X.PF[p*4]; Fs[v*4+2]=X.PF[p*4+1]; Fs[v*4+3]=X.PF[p*4+2]; Fk[v]=X.PK[p]; }
    for(let i=0;i<L.length;i++){ if((i&2047)===2047&&cvfsT()) yield; for(let e=0;e<3;e++) Ix[i*3+e]=rm.get(tri[L[i]*3+e]); }
    const gg=new THREE.BufferGeometry();
    gg.setAttribute('position',new THREE.BufferAttribute(Po,3)); gg.setAttribute('normal',new THREE.BufferAttribute(No,3));
    gg.setAttribute('aSky',new THREE.BufferAttribute(Sk,1)); gg.setAttribute('aDeep',new THREE.BufferAttribute(Dp,1)); gg.setAttribute('aAo',new THREE.BufferAttribute(Ao,1)); gg.setAttribute('aFs',new THREE.BufferAttribute(Fs,4)); gg.setAttribute('aFk',new THREE.BufferAttribute(Fk,1));
    gg.setIndex(new THREE.BufferAttribute(Ix,1)); gg.computeBoundingSphere(); geos.push(gg);
    if(cvfsT()) yield; }
  X.geos=geos; X.verts=0; for(const gg of geos) X.verts+=gg.attributes.position.count; X.pts=np;
}

/* ── 재질 — 모든 석회암 굴이 나눠 쓴다 ────────────────────────────────────────────────────────────────────── */
const CVFS_VERT=`attribute float aSky, aDeep, aAo;
attribute vec4 aFs;
attribute float aFk;
varying float vFsK;
varying float vCv10Sky, vCv10Deep;
varying vec3 vFsW, vFsN;
varying vec4 vFsA;
varying float vFsO, vFsD;
varying vec4 vFsZ, vFsGx, vFsGz;
uniform vec3 cmTPv;
uniform mediump sampler3D cmZ;
`;
const CVFS_VMAIN=`#include <begin_vertex>
  { vec4 w4=modelMatrix*vec4(transformed,1.0); vFsW=w4.xyz; vFsN=mat3(modelMatrix)*objectNormal; vFsD=length((modelViewMatrix*vec4(transformed,1.0)).xyz);
    vCv10Sky=aSky; vCv10Deep=aDeep; vFsA=aFs; vFsO=aAo; vFsK=aFk;
#ifdef FS_DBG_VS
    vFsZ=vec4(0.5); vFsGx=vec4(0.5); vFsGz=vec4(0.5);
#else
    vFsZ=textureLod(cmZ,w4.xyz/6.0,0.0); vFsGx=textureLod(cmZ,vec3(w4.x/3.0,w4.y/4.0,0.53),0.0); vFsGz=textureLod(cmZ,vec3(w4.z/3.0,w4.y/4.0,0.53),0.0);
#endif
  }`;   // (값) 큰 얼룩 잡음(0.375~3 m) · 벽 무늬의 낮은 잡음(Gl)은 정점에서(정점 간격 ≈ 17 cm) — 화소마다 3 차원 읽기 셋을 던다
const CVFS_FRAG=`varying float vCv10Sky, vCv10Deep;
uniform vec4 uCv10Glow;
varying vec3 vFsW, vFsN;
varying vec4 vFsA;
varying float vFsO, vFsD;
varying vec4 vFsZ, vFsGx, vFsGz;
varying float vFsK;
uniform mediump sampler2DArray cmC;
uniform mediump sampler3D cmZ;
uniform vec4 cmT; uniform vec3 cmTP, cmTC, cmEye;
float fsLum(vec3 c){ return dot(c,vec3(0.30,0.59,0.11)); }
/* (A) 빛깔 값 k → 얇은 데 바탕(크림 · 황갈 · 꿀 · 적갈을 차례로 섞음 — 갈래 없음) */
vec3 fsPal(float k){ return mix(mix(mix(FS_P0,FS_P1,clamp(k,0.0,1.0)),FS_P2,clamp(k-1.0,0.0,1.0)),FS_P3,clamp(k-2.0,0.0,1.0)); }
float fsWarp(float u,float ph){ return u+0.3*sin(1.3*u+ph)+0.12*sin(3.7*u+ph); }
/* 정수 해시(pcg3d) — 칸 번호마다 0~1(sin 해시는 세계 좌표 수천 m 에서 망가진다) */
uvec3 fsPcg(uvec3 v){ v=v*1664525u+1013904223u; v.x+=v.y*v.z; v.y+=v.z*v.x; v.z+=v.x*v.y; v^=v>>16u; v.x+=v.y*v.z; v.y+=v.z*v.x; v.z+=v.x*v.y; return v; }
vec3 fsH3(float a,float b,float s){ return vec3(fsPcg(uvec3(ivec3(int(a),int(b),int(s)))))*(1.0/4294967296.0); }
/* (값) 보로노이 씨용 값싼 정수 해시(곱 둘 · 셋) — 칸마다 3 · 9 번 부르니 pcg3d 는 비쌌다 */
#ifdef FS_DBG_HASH
float fsH1(float a,float s){ return fract(a*0.618); }
#else
float fsH1(float a,float s){ uint h=uint(int(a))*0x9E3779B1u^uint(int(s))*0x85EBCA77u; h^=h>>15u; h*=0x2C1B3C6Du; h^=h>>12u; return float(h)*(1.0/4294967296.0); }
#endif
vec3 fsH2(vec2 c,float s){ uint h=uint(int(c.x))*0x9E3779B1u^uint(int(c.y))*0x85EBCA77u^uint(int(s))*0xC2B2AE3Du; h^=h>>15u; h*=0x2C1B3C6Du; h^=h>>12u; uint g=h*0x297A2D39u; g^=g>>15u; uint e=g*0x165667B1u; e^=e>>13u; return vec3(float(h),float(g),float(e))*(1.0/4294967296.0); }
/* 1 차원 보로노이 홈 — 칸 st(씨 흔들기 jit)마다 둥근 골 하나. x = 골 꼴(−1 골 밑 ~ 0 칸 경계의 등) · y = 칸 너비(m) */
vec2 fsGroove(float u,float st,float jit,float sd){
  /* 가장 가까운 씨 둘(둘레 세 칸) — 끼고 있는 두 씨만 보면 씨 자리에서 깊이(칸 너비 비례)가 뛰어 가는 검은 줄이 섰다 */
  float c=floor(u/st), a=abs(u-(c-0.5+jit*(fsH1(c-1.0,sd)-0.5))*st), b=abs(u-(c+0.5+jit*(fsH1(c,sd)-0.5))*st), e=abs(u-(c+1.5+jit*(fsH1(c+1.0,sd)-0.5))*st);
  float d1=min(a,min(b,e)), d2=max(min(a,b),min(max(a,b),e)), t=d1/max(d1+d2,1e-5);
  return vec2(0.0-(1.0-4.0*t*t),d1+d2);
}
/* 벽 무늬 한 벌 — 가로 u · 세로 y(세계 고정 축). A = (잔 홈 높이 · 굵은 골 높이 · 석회암 사진 결 · 성장 띠) · B = (낮은 잡음 넷).
   잔 홈: 1 차원 보로노이(칸 1~6 cm) · 굵은 골: 보로노이(칸 7~30 cm — 규칙 간격 없음) · 칸 경계는 낮은 잡음으로 휜다(휨 기울기 < 0.7 — 위상이 거꾸로 돌지 않게) ·
   홈은 흐름 따라 생겼다 사라졌다(세기 잡음 0~1) · 깊이는 칸 너비에 비례 · 사진(층 0)은 가로 0.5 · 세로 0.8 m 한 장 · 성장 띠는 세로 15 cm 칸 · 가로 0.5 m(수평에 가깝다) */
/* (값) 갈래 안에서 불러도 되게 — cmZ 는 밉맵이 없고(미분 불필요) 사진(cmC · 밉맵)은 바깥에서 센 미분(gx · gy = (du, dy) 의 화면 미분)으로 textureGrad ·
   화소가 잔 홈 칸보다 크면(kF 0) 잔 홈 · 굵은 골 칸보다 크면(kMe 0) 그 보로노이를 건너뛴다(어차피 0 을 곱한다) */
void fsWall(float u,float y,float kF,float kMe,vec2 gx,vec2 gy,vec4 Zc,vec4 Gl,out vec4 A,out vec4 B){
  // (값) Gl(가로 3 · 세로 4 m 판의 낮은 잡음)은 정점에서 읽어 온다(vFsGx · vFsGz) — 화소마다 3 차원 읽기가 없다   // (값) 3 차원 잡음 읽기는 이것 하나 — 세기 · 끊김의 둘째 잡음은 바깥의 큰 얼룩 Zc 를 쓴다
  float uw=u+0.06*(Gl.a-0.5)+0.12*(Gl.r-0.5);
#ifdef FS_NO_GROOVE
  vec2 gf=vec2(0.0), gc=vec2(0.0);
#else
  vec2 gf=fsGroove(uw,0.035,0.85,11.0), gc=fsGroove(uw+0.25*(Gl.b-0.5),0.17,0.85,23.0);
#endif
  float fineS=smoothstep(0.30,0.70,Gl.g+0.35*(Zc.r-0.5)), coarseS=smoothstep(0.30,0.70,Gl.b+0.25*(Zc.g-0.5));
  float Hfine=gf.x*min(gf.y,0.06)*0.18*fineS*kF, Hco=gc.x*min(gc.y,0.30)*0.11*coarseS;
#ifdef FS_NO_PHL
  float phl=0.0;
#else
  const vec2 PS=vec2(1.0/0.5,1.0/0.8); vec2 g2=max(abs(gx),abs(gy))*PS*512.0; float phl=fsLum(textureLod(cmC,vec3(vec2(u,y)*PS,0.0),max(0.0,log2(max(g2.x,g2.y)))).rgb)*2.0-1.0;   // (값) 밉 단계를 직접(textureGrad 보다 싸다)
#endif
  float bv=y/0.15+1.2*Gl.r, bk=floor(bv), bf=bv-bk; bf=bf*bf*(3.0-2.0*bf); float bnd=mix(fsH1(bk,37.0),fsH1(bk+1.0,37.0),bf);   // 성장 띠 — 띠마다 해시 톤(15 cm · 수평에 가깝게 · 낮은 잡음으로 기울고 휜다 · 사인 띠는 고른 물결이 됐다)
  A=vec4(Hfine,Hco,phl,bnd); B=vec4(Gl.a,Zc.a,Gl.b,Zc.b);
}
/* 2 차원 보로노이(바닥 미세 휴석 칸) — x F1 · y F2(칸 단위) · z 칸 해시 */
/* (바닥 휴석 칸) 칸마다 무게(0.65~1.35 · 12 % 는 1.5 — 큰 칸)로 나눈 거리(곱 무게 보로노이 — 칸 크기가 들쭉날쭉) ·
   내리막 dd 쪽으로 an 만큼 늘인 거리(칸이 흐름 아래로 길어진다 — 씨까지의 작은 벡터에만 쓰니 세계 좌표 정밀도와 상관없다) */
vec3 fsVor2(vec2 q,float sd,vec2 dd,float an){
  vec2 ib=floor(q); float d1=9.0, d2=9.0, hz=0.0;
  for(int b=-1;b<=1;b++) for(int a=-1;a<=1;a++){ vec2 c=ib+vec2(float(a),float(b)); vec3 hh=fsH2(c,sd); vec2 v=q-c-0.05-0.9*hh.xy; float al=dot(v,dd);
    float d=sqrt(max(dot(v,v)-an*al*al,0.0))/(hh.z<0.12?1.5:0.65+0.7*hh.z);
    if(d<d1){ d2=d1; d1=d; hz=hh.z; } else if(d<d2) d2=d; }
  return vec3(d1,d2,hz);
}
`;
/* 조각 본문 — color_fragment 뒤. 바탕 · 무늬 · 범프 → diffuseColor(정점 빛은 감싸기로 받는다) · 횃불 난반사(감싸기) · 투과 · 정반사 → totalEmissiveRadiance */
const CVFS_BODY=`#include <color_fragment>
  {
    vec3 p=vFsW, n0=normalize(vFsN)*(gl_FrontFacing?1.0:-1.0);
    float h=max(vFsA.x,0.0), ed=vFsA.y, sF=vFsA.z, wt=clamp(vFsA.w,0.0,1.0), ao=vFsO, dist=vFsD;
    vec3 dpx=dFdx(p), dpy=dFdy(p);
    vec3 ngm=cross(dpx,dpy); ngm=dot(ngm,ngm)>1e-20?normalize(ngm):n0; ngm*=dot(ngm,n0)<0.0?(0.0-1.0):1.0;   // 꼴 법선(화면 미분 — 막 두께 기울기까지 든다)
    float fp=max(length(dpx),length(dpy)), kF=1.0-smoothstep(0.004,0.009,fp), kMi=1.0-smoothstep(0.004,0.012,fp), kMe=1.0-smoothstep(0.012,0.040,fp), nrmK=clamp(1.0-dist/14.0,0.0,1.0);
    float flo=smoothstep(0.45,0.75,n0.y), wal=1.0-flo;
    vec4 Z=vFsZ;                                                                  // 큰 얼룩 r 0.75 · g 1.5 · b 3 · a 0.375 m
    /* 벽 무늬는 세계 고정 축 두 벌(가로 = x 또는 z · 세로 = y)로 세어 법선 쪽 무게로 섞는다 — 화소마다 바뀌는 흐름 틀에 세계 좌표(수백 m)를 투영하면
       법선이 0.001 만 흔들려도 가로 자리가 수십 cm 뛰어 무늬가 화소 잡음 · 물결무늬가 됐다 */
    float wx=smoothstep(0.40,0.60,n0.z*n0.z/(n0.x*n0.x+n0.z*n0.z+1e-5));   // (값) 섞임 띠를 좁게(두 축을 다 세는 몫 27 % → 13 %)
    /* (값) 바닥(wal 0)은 벽 무늬를 안 센다 · 한 축의 무게가 1(섞임 띠 밖)이면 그 축 하나만 — 두 번은 섞임 띠에서만 */
    vec4 WA=vec4(0.0,0.0,0.0,0.5), WB=vec4(0.5);
#ifndef FS_NO_WALL
    if(wal>0.001){
      if(wx>0.999) fsWall(p.x,p.y,kF,kMe,dpx.xy,dpy.xy,Z,vFsGx,WA,WB);
      else if(wx<0.001) fsWall(p.z,p.y,kF,kMe,dpx.zy,dpy.zy,Z,vFsGz,WA,WB);
      else { vec4 Ax, Bx, Az, Bz; fsWall(p.x,p.y,kF,kMe,dpx.xy,dpy.xy,Z,vFsGx,Ax,Bx); fsWall(p.z,p.y,kF,kMe,dpx.zy,dpy.zy,Z,vFsGz,Az,Bz); WA=mix(Az,Ax,wx); WB=mix(Bz,Bx,wx); }
    }
#endif
    vec3 an=abs(n0); vec2 pd=an.x>an.y&&an.x>an.z?p.zy:(an.y>an.z?p.xz:p.xy);
    vec2 pdx=dFdx(pd), pdy=dFdy(pd); float phF=0.0;
    float gr=0.0;   // 잔 알갱이(층 8 sand) — (값) 바닥에서만 읽는다(벽은 석회암 사진 결 phl 이 잔 결을 준다)
    if(flo>0.001){ float lw=log2(max(max(length(pdx),length(pdy))*512.0,1.0)); phF=fsLum(textureLod(cmC,vec3(pd/0.6,0.0),max(0.0,lw-log2(0.6))).rgb)*2.0-1.0; gr=fsLum(textureLod(cmC,vec3(pd/0.9,8.0),max(0.0,lw-log2(0.9))).rgb)*2.0-1.0; }   // (값) 밉 단계를 직접   // 바닥 거친 껍질 결(층 0)
    float phl=mix(phF,WA.z,wal);
    /* 홈 — 빛깔 교대 없이 범프(법선)로만 · 골 밑만 가림으로 ×0.85 */
    float fluK=wal*smoothstep(0.10,0.40,1.0-abs(n0.y))*mix(0.55,1.0,WB.x);
    float Hf=fluK*(WA.x*kMi+WA.y*kMe), occG=smoothstep(0.004,0.014,0.0-Hf);
    /* (p2) 둥근 턱 — 범프만 · 볼록 덩이 몫에만 */
    /* (값) 턱 몫을 먼저 — 몫이 0 인 화소(대부분)는 턱(사인 둘)을 안 센다 · 화소 크기 문턱은 fwidth(tu) 대신 fp/0.15 */
    float terK=wal*smoothstep(0.55,0.80,Z.b+0.25*(smoothstep(0.06,0.20,h)-0.5)+0.5*(n0.y-0.10))*smoothstep(0.30,0.62,Z.a+0.35*(WB.y-0.5))*(1.0-smoothstep(0.3,0.7,fp/0.15));
    float Hter=0.0;
    if(terK*kMe>0.0){ float tf=fract(fsWarp(p.y/0.15+2.0*Z.g+0.8*WB.z,Z.b*6.0)); Hter=terK*(smoothstep(0.0,0.30,tf)*(1.0-smoothstep(0.30,1.0,tf))-0.4)*0.008*kMe; }
    /* (B) 바닥 미세 휴석 칸 — 2 차원 보로노이(칸 ≈ 8 cm · 4~12 cm) · 테두리는 둥글게 솟은 밝은 둑(폭 2~4 cm) · 칸 속은 짙고 젖음 · 거친 껍질 결 */
#ifdef FS_NO_FLOOR
    float gK=0.0;
#else
    float gK=smoothstep(0.70,0.85,min(n0.y,ngm.y))*(1.0-smoothstep(0.006,0.016,fp))*smoothstep(0.20,0.45,Z.g+0.3*(Z.r-0.5));
#endif
    float dl=length(n0.xz); vec2 dd=dl>1e-4?n0.xz/dl:vec2(1.0,0.0); float van=0.6*smoothstep(0.03,0.20,dl);   // 내리막(법선의 수평 몫) · 기울수록 길게
    vec3 vr=gK>0.0?fsVor2(p.xz/0.08+vec2(0.7*(Z.r-0.5),0.7*(Z.a-0.5)),41.0,dd,van):vec3(0.0,1.0,0.5);   // (값) 칸이 화소보다 작거나 벽이면 건너뛴다
    float vE=(vr.y-vr.x)*0.08, rimV=1.0-smoothstep(0.004,0.022,vE), innV=smoothstep(0.010,0.030,vE);
    float rimA=0.5+0.9*fract(vr.z*5.37);                                               // 칸마다 둑 높이 · 밝기
    rimV*=rimA*mix(1.0,smoothstep(0.35,0.60,Z.a+0.5*(fract(vr.z*9.13)-0.5)),step(fract(vr.z*3.71),0.30));   // 30 % 칸은 둑이 군데군데 끊긴다
    float Hg=gK*(rimV*0.006-innV*0.0015);
    /* 높이 합 — 홈 · 턱 · 둑 · 사진 · 알갱이 */
    float Ht=Hf+Hter+Hg+phl*0.0025*kMi+gr*0.0008*kMi;
    /* 빛깔 — 바탕(크림 → 두꺼운 데 꿀) · 사진 결 · 성장 띠(가로 · ±8 % · 끊김) · 골 밑 가림 · 큰 얼룩 */
    float tk=smoothstep(FS_THK0,FS_THK1,h+0.04*(Z.r-0.5));
    float cr=1.0-clamp(vFsK,0.0,1.0);                                                   // 크림 몫(흙 적은 굴) — 속에서 퍼지는 빛 세게 · 홈 그늘 약하게
    vec3 cA=fsPal(vFsK), c=mix(cA,cA*FS_TKR,tk*0.7);
    float bcut=smoothstep(0.30,0.70,Z.a+0.3*(WB.w-0.5));
    c*=1.0+0.32*(WA.w-0.5)*bcut*wal;
    c*=1.0-0.15*occG*(1.0-0.6*cr);
    c*=clamp(0.95+0.45*(1.0-0.4*cr)*phl,0.70,1.20)*(1.0+(0.15+0.20*flo)*gr*kMi)*(1.0+0.18*(Z.g-0.5));
    c*=1.0+0.14*gK*rimV-0.20*gK*innV;
    /* (무늬 · 사진 p4 · p2 — 사용자 요청) 한 흐름 안에서도 빛깔이 여럿 · 흰 · 회색 굴일수록 대비 크게(pa) · 꿀 · 적갈 굴은 짙은 빛 안의 엷은 띠.
       ① 가장자리까지 거리 e 의 등고선을 따르는 성장 켜 띠 — 크림 · 흰 ↔ 꿀 · 호박(폭 1~5 cm 들쭉날쭉 · 잡음으로 휘고 끊김 · 경계는 띠 사이 섞기 · 가장자리 쪽일수록 호박)
       ② 흐름 쪽 줄기 — 굵은 골(물이 모이는 데)은 젖은 꿀 · 황갈 · 등은 흰 결정빛(줄기 세기는 흐름 따라 길게 · 군데군데)
       ③ 흰 분필 딱지(문밀크 · 팝콘 껍질) — 마르고 위를 보는 두꺼운 데 · 입구 쪽 */
    float pa=mix(0.35,1.0,cr);
    float bu=ed/0.028+2.2*Z.a+1.3*Z.r+0.8*WB.z, bk=floor(bu), fwB=fwidth(bu);
    float tone=mix(fsH1(bk,53.0),fsH1(bk+1.0,53.0),smoothstep(0.25,0.75,bu-bk));
    float bcut2=smoothstep(0.30,0.60,Z.b+0.35*(WB.y-0.5))*(1.0-smoothstep(0.35,0.90,fwB));
    float ambK=smoothstep(0.45,0.85,tone)*(0.55+0.45*(1.0-smoothstep(0.0,0.18,ed)))*bcut2*pa;
    c=mix(c,c*vec3(1.02,0.80,0.56),0.75*ambK); c*=1.0+0.14*(1.0-smoothstep(0.15,0.45,tone))*bcut2*pa;
    float Hc=fluK*WA.y*kMe, sv=smoothstep(0.35,0.65,WB.x+0.3*(Z.g-0.5));
    c=mix(c,c*vec3(0.95,0.80,0.62),smoothstep(0.0,0.014,0.0-Hc)*sv*(0.30+0.35*pa)); c*=1.0+0.06*smoothstep(0.0,0.014,Hc)*sv*pa;   // 넓은 경사(좁으면 고른 흰 줄이 섰다)
    float chalk=smoothstep(0.58,0.78,0.5*Z.r+0.25*(1.0+phl)+0.2*(Z.a-0.5))*(1.0-wt)*max(smoothstep(0.15,0.55,n0.y)*smoothstep(0.03,0.10,h),smoothstep(0.02,0.10,vCv10Sky))*pa;
    c=mix(c,FS_P0*1.30,0.75*chalk);
    /* 가장자리 — 막이 바위에 닿는 데는 그늘 · 바닥 판 가장자리 25 cm 는 짙고 젖게(껍데기 aFc 자국과 이어진다) */
    float rimF=flo*(1.0-smoothstep(0.0,0.25,ed+0.05*(Z.a-0.5)));
    { float l=fsLum(c); c=mix(vec3(l),c,0.70); }
    /* (가장자리 — 사용자 요청 '경계가 이질적') 얇아지는 가장자리는 밑 바위가 비친다 — 막을 반투명으로 그려(투명 패스 · renderOrder −1 이라 물보다 먼저)
       e 0 에서 불투명 0 → 15~40 cm(잡음)에서 1: 비치는 것은 껍데기 그 자체라 빛(둘레빛 가림 · 깊이 · 횃불)과 사진 결이 경계에서 그대로 이어진다.
       얇은 쪽은 무늬 범프도 잦아들고 젖은 막 · 가장 바깥 1~3 cm 는 조금 솟은 밝은 테(실제 유석 끝의 작은 둑 — 선이 아니라 폭 있는 테) */
    float tE=smoothstep(0.0,0.15+0.25*Z.g,ed+0.06*(Z.a-0.5)+0.04*(WB.x-0.5));
    float rimE=smoothstep(0.002,0.008,ed)*(1.0-smoothstep(0.012,0.030,ed+0.01*(Z.r-0.5)));
    float aE=clamp(tE*tE*(3.0-2.0*tE)*0.85+0.15*tE+0.08*rimE,0.0,1.0);
    c*=1.0+0.08*rimE;
    Ht=Ht*tE+0.003*rimE;
    /* 젖음 — 바탕 어둡게는 막 전체에 조금 · 물막 반짝임(wS)은 바닥 · 휴석 칸 속 · 벽은 사진 결 · 잡음으로 끊긴 작은 점만 */
    float w=clamp(wt*(0.6+0.6*Z.b),0.0,1.0);
    float spot=0.0; if(wal*w>0.001) spot=smoothstep(0.72,0.86,texture(cmZ,p*1.6).a+0.25*phl);   // 벽 젖은 점(작은 점 — 사진 결로만 세면 세로로 늘어난 짙은 줄이 됐다)
    float wS=clamp(max(max(flo*w,gK*innV),max(rimF,wal*w*spot*0.8)),0.0,1.0);
    float wD=clamp(0.45*w+0.55*wS,0.0,1.0);
    c*=mix(1.0,FS_WETD,wD); { float l=fsLum(c); c=max(vec3(0.0),vec3(l)+(c-vec3(l))*(1.0+FS_WETSAT*wD)); }
    Ht*=1.0-0.6*wS*flo;
#ifdef FS_NO_BUMP
    Ht=0.0;
#endif
    float hb=Ht*nrmK, hx=dFdx(hb), hy=dFdy(hb);
    vec3 r1=cross(dpy,n0), r2=cross(n0,dpx); float det=dot(dpx,r1);
    vec3 nb=abs(det)>1e-12?normalize(abs(det)*n0-sign(det)*(hx*r1+hy*r2)):n0;
    vec3 nd=normalize(mix(nb,n0,FS_SOFT));
    float occA=mix(0.35,1.0,ao*ao), occD=mix(0.70,1.0,ao), occS=clamp(ao*1.3-0.3,0.0,1.0);
    /* 정점 빛(감싸기)에 화소 결 — 둘레빛 가림 · 범프가 정점 법선에서 기운 만큼 */
    diffuseColor.rgb=c*occA*(0.70+0.30*clamp(dot(nd,n0),0.0,1.0));
    diffuseColor.a=aE;
    /* 횃불 — 정점 묶음에서 뺐으니 여기서(껍데기와 같은 유니폼 · 같은 감쇠 (1−d/거리)²) · 빛깔마다 감싸기 */
    vec3 tv=cmTP-p; float tl=length(tv); vec3 Lt=tv/max(tl,1e-4), V=normalize(cmEye-p);
    float at=clamp(1.0-tl/max(cmT.x,1e-3),0.0,1.0); at*=at;
    float nl=dot(nd,Lt);
    vec3 E=clamp((vec3(nl)+FS_WRAP)/(1.0+FS_WRAP),0.0,1.0);
    totalEmissiveRadiance+=c*occD*cmTC*(cmT.w*at)*E;
    /* 투과 — 얇은 자유 가장자리(e 작음 · 두께 수 mm)와 처마 혀 끝 · 빛이 막 앞쪽일 때만 · 두께대로 파랑부터 먹힌다 */
    float frK=smoothstep(0.0,0.05,dot(Lt,n0)+0.05);
    float edK=1.0-smoothstep(0.0,FS_EDGE,ed);
    if(edK*frK*at>0.0){   // (값) 얇은 가장자리 · 빛 앞쪽에서만
      float bk=pow(clamp(dot(V,0.0-normalize(Lt+nd*FS_TDELTA)),0.0,1.0),FS_TPOW)+0.25*clamp(1.0-dot(V,n0),0.0,1.0);
      vec3 tr=FS_TCOL*exp(0.0-FS_SIGA*h)*exp(0.0-h/FS_MFP);
      totalEmissiveRadiance+=tr*cmTC*(cmT.w*at*FS_TK*(1.0+1.2*cr)*edK*frK*bk*occD); }
    /* 정반사 — 마른 방해석(F0 0.045 · 아주 거칠게 — 플라스틱 반짝임 없음) ↔ 물막(F0 0.02 · 매끈 — 바닥 · 고인 데 · 골만) */
#ifndef FS_NO_SPEC
    float rg=mix(FS_RDRY,FS_RWET,wS), f0=mix(FS_F0DRY,FS_F0WET,wS);
    /* (값) 화소 안 법선 흩어짐은 범프 높이의 화면 기울기로 어림(법선 미분 둘 대신) · 마른 데(wS 0.02 밑)는 정반사를 안 센다(rDry 0.85 · ×0.35 라 거의 0 이었다) */
    float sg2=min(0.25,0.5*(hx*hx+hy*hy)*nrmK/max(fp*fp,1e-10));
    if(wS>0.02&&cmT.w>0.0){
    vec3 ns=normalize(mix(nb,n0,0.85*wS));
    vec3 Hv=normalize(Lt+V); float a2=min(1.0,rg*rg*rg*rg+sg2), sn=clamp(2.0/a2-2.0,1.0,80.0);
    float nls=max(dot(ns,Lt),0.0), nh=max(dot(ns,Hv),0.0), x=1.0-max(dot(V,Hv),0.0), x2=x*x, Fs=f0+(1.0-f0)*x2*x2*x;
    totalEmissiveRadiance+=cmTC*(cmT.w*at*nls*(sn+8.0)*0.125*exp2(sn*1.4427*(nh-1.0))*Fs*occS*mix(0.35,1.0,wS)); }
#endif
#ifdef FS_DBG_GK
    diffuseColor.rgb=vec3(0.0); totalEmissiveRadiance=vec3(gK,ngm.y,n0.y);   // 시험 — 휴석 칸 몫 · 꼴 법선 y · 정점 법선 y
#endif
  }`;
const cvfsV3=a=>'vec3('+a.map(v=>(+v).toFixed(4)).join(',')+')';
function cv10FlowMat(){
  if(CVFS.mat) return CVFS.mat;
  cmPhotos();
  const O=CVFS.OPT, m=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,depthWrite:true});   // 얇은 가장자리가 비치게(diffuseColor.a)
  const gl=(typeof CV10_GLOW!=='undefined'&&(CV10_GLOW.karst||CV10_GLOW.shelter))||[0,0,0,0];
  const U={cmC:CMAT.tex, cmZ:cmNoise3(), cmT:CMAT.torch, cmTP:CMAT.tpos, cmTPv:CMAT.tpv, cmEye:CMAT.eye, cmTC:CMAT.tcol, uCv10Glow:{value:new THREE.Vector4(gl[0],gl[1],gl[2],gl[3])}};
  const f=v=>'('+(+v).toFixed(4)+')';
  const D=`#define FS_P0 ${cvfsV3(O.pal[0])}\n#define FS_P1 ${cvfsV3(O.pal[1])}\n#define FS_P2 ${cvfsV3(O.pal[2])}\n#define FS_P3 ${cvfsV3(O.pal[3])}\n#define FS_TKR ${cvfsV3(O.albT.map((v,i)=>v/O.alb[i]))}\n#define FS_THK0 ${f(O.thick[0])}\n#define FS_THK1 ${f(O.thick[1])}\n#define FS_SIGA ${cvfsV3(O.sigA)}\n#define FS_MFP ${f(O.mfp)}\n`+
    `#define FS_WRAP ${cvfsV3(O.wrap)}\n#define FS_SOFT ${f(O.soft)}\n#define FS_TCOL ${cvfsV3(O.tcol)}\n#define FS_TDELTA ${f(O.tDelta)}\n#define FS_TPOW ${f(O.tPow)}\n#define FS_TK ${f(O.tK)}\n#define FS_EDGE ${f(O.edge)}\n`+
    `#define FS_RDRY ${f(O.rDry)}\n#define FS_RWET ${f(O.rWet)}\n#define FS_F0DRY ${f(O.f0Dry)}\n#define FS_F0WET ${f(O.f0Wet)}\n#define FS_WETD ${f(O.wetD)}\n#define FS_WETSAT ${f(O.wetSat)}\n#define CM_SUNCUT\n`+(CVFS.dbg||'');
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
  const dk=CVFS.dbg||''; m.customProgramCacheKey=()=>'cv10fs-'+(hh>>>0).toString(36)+dk;   // CVFS.dbg — 시험용 정의(값을 갈래마다 잴 때 · 예 '#define FS_NO_WALL\n')
  envPatch(m);
  return CVFS.mat=m;
}
/* 미리 짜기(90-init.js precompPlan) — 덮개 메시와 같은 꼴 */
function cvfsPrecompGeo(){
  if(CVFS.geo) return CVFS.geo;
  const g=new THREE.BufferGeometry(), z9=new Float32Array(9);
  g.setAttribute('position',new THREE.Float32BufferAttribute(z9,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(z9.slice(),3));
  for(const a of ['aSky','aDeep','aAo']) g.setAttribute(a,new THREE.Float32BufferAttribute(new Float32Array(3),1));
  g.setAttribute('aFs',new THREE.Float32BufferAttribute(new Float32Array(12),4)); g.setAttribute('aFk',new THREE.Float32BufferAttribute(new Float32Array(3),1));
  return CVFS.geo=g;
}

/* ── 짓기 · 돌리기 · 버리기 ──────────────────────────────────────────────────────────────────────────────────── */
/* ── (B) 장식 겉칠 — 덮개 흐름 · 막이 지나는 자리 둘레(그리고 처마에서 떨어지는 흐름 끝 밑)의 장식 바위 조각(종유석 · 석순 · 기둥)에
   몫 aFo.x(0~1 · 거리로 부드럽게)와 그 흐름의 빛깔 값 aFo.y 를 정점 속성으로 붙인다. 장식 개수 · 자리 · position/color 배열 · 난수 · 줍기 열쇠는 그대로 ─ */
function cvfsCoatAt(X,x,y,z,drips,o){
  const F=X.fl, SG=X.segC, h0=cvfsGHead(SG,cvfsCK(Math.floor(x),Math.floor(y),Math.floor(z))); let best=0, bk=X.S.k;
  for(let q=h0;q>=0;q=SG.nx[q]){ const id=SG.val[q], fi=(id/4096)|0, i=id-fi*4096, Fl=F[fi], A=Fl.pts[i], B=Fl.pts[i+1];
    const ex=B.x-A.x, ey=B.y-A.y, ez=B.z-A.z, ll=ex*ex+ey*ey+ez*ez; let t=ll>1e-12?((x-A.x)*ex+(y-A.y)*ey+(z-A.z)*ez)/ll:0; t=t<0?0:t>1?1:t;
    const d=Math.hypot(x-A.x-ex*t,y-A.y-ey*t,z-A.z-ez*t)-(A.w+(B.w-A.w)*t), c=1-cvfsSS(0,0.30,d);
    if(c>best){ best=c; bk=Fl.fk; } }
  for(const e of drips){ const hd=Math.hypot(x-e.x,z-e.z), dy=e.y-y; if(dy<-0.1||dy>1.6||hd>e.w+0.25) continue;
    const c=(1-cvfsSS(e.w*0.6,e.w+0.25,hd))*(1-cvfsSS(0.5,1.6,dy)); if(c>best){ best=c; bk=e.fk; } }
  o.c=best; o.k=bk; return o;
}
function* cvfsCoat(X,rec){
  const D=rec.deco; if(!D||!D.meshes||typeof CVD==='undefined'||!CVD.mats) return [];
  const drips=X.fl.filter(F=>F.end==='drip').map(F=>{ const e=F.pts[F.pts.length-1]; return {x:e.x,y:e.y,z:e.z,w:e.w,fk:F.fk}; }), o={}, out=[];
  for(const m of D.meshes){ if(m.material!==CVD.mats.rock) continue; yield;
    const g=m.geometry, P=g.attributes.position.array, n=P.length/3, A=new Float32Array(n*2); let any=0;
    for(let v=0;v<n;v++){ if((v&127)===0&&cvfsT()) yield; cvfsCoatAt(X,P[v*3],P[v*3+1],P[v*3+2],drips,o); if(o.c>0.002){ A[v*2]=o.c; A[v*2+1]=o.k; any=1; } }
    if(!any) continue;
    for(const it of D.items) if(it.mesh===m&&it.vis===false){ it.savedFo=A.slice(it.v0*2,it.v1*2); for(let v=it.v0;v<it.v1;v++) A[v*2]=0; }   // 이미 딴(접어 숨긴) 조각은 0 — 되살릴 때 cvdSet 이 돌려놓는다
    g.setAttribute('aFo',new THREE.BufferAttribute(A,2)); out.push({g,keep:null}); }
  return out;
}
function cvfsCoatShow(rec,on){ const fs=rec.fs; if(!fs||!fs.coat) return;
  for(const c of fs.coat){ const at=c.g.attributes.aFo; if(!at) continue; if(!on){ if(!c.keep){ c.keep=at.array.slice(); for(let i=0;i<at.array.length;i+=2) at.array[i]=0; } } else if(c.keep){ at.array.set(c.keep); c.keep=null; } at.needsUpdate=true; } }
function* cvfsGen(rec){
  /* 기다림 — 장식(휴석 웅덩이 기록)과 가림 굽기(aAo)가 끝날 때까지(읽기만 한다) */
  while(rec.decoGen||!rec.deco||(CMAT.ao.q.some(J=>J.rec===rec))){ if(!rec.decoGen&&!rec.deco) return; yield 'wait'; }   // 장식이 던져 버려졌으면(cv10DecoDrop — deco null) 덮개도 안 짓는다(끝없이 기다리지 않게)
  const T0={ms:0};
  CVFS.ph='ctx'; const X=yield* cvfsCtx(rec); yield;
  CVFS.ph='seep'; const seeps=yield* cvfsSeeps(X); yield; CVFS.ph='trace';
  const flows=[], ends={};
  for(const sp of seeps){ const F=yield* cvfsTrace(X,sp); if(F){ flows.push(F); ends[F.end]=(ends[F.end]||0)+1; } if(cvfsT()) yield; }
  X.flows=flows; X.nUse=flows.length; X.ends=ends;
  X.k=Math.max(2,Math.min(4,Math.round(X.eLen/0.17)));
  const fs=rec.fs={flows:flows.length,seeps:seeps.length,cand:X.nCand,tier:X.S.ti,soil:X.S.soil,kc:X.S.k,ends,tri:0,verts:0,chunks:0,k:X.k,meshes:[],test:null,sign:X.sign,
    fl:flows.map(F=>{ const p=F.pts, m=p[p.length>>1]; const e=p[p.length-1]; return {x:m.x,y:m.y,z:m.z,nx:m.nx,ny:m.ny,nz:m.nz,w:m.w,s:F.s,end:F.end,x0:p[0].x,y0:p[0].y,z0:p[0].z,xe:e.x,ye:e.y,ze:e.z}; })};   // 시험 · 사진 자리(흐름마다 가운데 마디)
  if(flows.length){
    /* k — 껍데기 세모 변 길이에서(나눈 점 간격 ≈ 0.17 m) · 실제 세모가 상한 maxTri 를 넘으면 나누기가 k 를 낮추고, 그래도 넘으면 우선순위 낮은 흐름부터 뺀다 */
    yield* cvfsTess(X);
    yield* cvfsMesh(X);
    fs.k=X.k; fs.used=X.nUse; fs.tri=X.ntri; fs.verts=X.verts; fs.covered=X.set.length; fs.test=X.test;
    for(const gg of X.geos){ const m=new THREE.Mesh(gg,cv10FlowMat());
      m.matrixAutoUpdate=false; m.castShadow=false; m.receiveShadow=true; m.renderOrder=-1; m.userData.cvFs=1; m.userData.lightRole='recv'; m.onBeforeRender=cmTick;
      m.visible=CVFS.on; rec.mesh.add(m); fs.meshes.push(m); fs.chunks++;
      CVFS.ph='attach'; yield 'frame'; }                                                          // 덩이 하나씩 — 첫 그리기의 버퍼 올리기가 한 프레임에 몰리지 않게
    if(X.fcPend){ const fc=rec.mesh.geometry.attributes.aFc; if(fc) fc.needsUpdate=true; }
    CVFS.ph='coat'; fs.coat=yield* cvfsCoat(X,rec); fs.coatN=fs.coat.length; if(!CVFS.on) cvfsCoatShow(rec,false);   // 덩이를 다 붙인 뒤에 — 껍데기는 aFc 1 인 데를 안 그리듯 칠하니(CM_FSO) 덮개보다 먼저 올리면 그 틈이 비쳤다
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
  if(rec.mesh){ for(const m of rec.mesh.children.slice()) if(m.userData.cvFs){ rec.mesh.remove(m); m.geometry.dispose(); }
    const fc=rec.mesh.geometry&&rec.mesh.geometry.attributes.aFc; if(fc&&rec.fs){ fc.array.fill(0); fc.needsUpdate=true; } }   // 덮개를 떼면 껍데기가 다시 그 자리를 칠한다
  if(rec.fs&&rec.fs.coat) for(const c of rec.fs.coat){ const at=c.g.attributes.aFo; if(at){ at.array.fill(0); at.needsUpdate=true; } }   // 장식이 남으면 겉칠도 걷는다
  rec.fs=null;
}
/* 시험 — 흐름 수 · 덮개 세모 · 정점 · 덩이 · 짓기 ms(합 · 가장 긴 조각) · 막 시험 · 덮개 자리 · 속성 해시 */
function cvfsStats(rec){
  const f=rec&&rec.fs; if(!f) return null;
  let hp=0, ha=0; const mix=(h,v)=>(Math.imul(h^Math.round(v*1e4),16777619)+0x9e3779b9)|0;
  for(const m of f.meshes){ const g=m.geometry; for(const v of g.attributes.position.array) hp=mix(hp,v); for(const nm of ['normal','aFs','aSky','aDeep','aFk']) for(const v of g.attributes[nm].array) ha=mix(ha,v); for(const v of g.index.array) ha=mix(ha,v); }
  const r3=v=>Math.round((v||0)*1000)/1000;
  return {flows:f.flows,seeps:f.seeps,cand:f.cand,tier:f.tier,soil:f.soil,kc:f.kc,ends:f.ends,used:f.used,k:f.k,tri:f.tri,verts:f.verts,chunks:f.chunks,covered:f.covered,sign:f.sign,
    ms:r3(f.ms),maxSlice:r3(f.maxSlice),maxPh:f.maxPh,slices:f.slices,test:f.test&&Object.assign({},f.test,{baseMax:r3(f.test.baseMax*1000)/1000,hInMin:f.test.hInMin<1e9?r3(f.test.hInMin*1000)/1000:null,hMax:r3(f.test.hMax)}),
    hashPos:hp>>>0,hashAttr:ha>>>0};
}
/* 시험 — 덮개 켬/끔(덮개 보이기 · karst 껍데기 재질 CM_FSO 를 함께) */
function cvfsSet(on){
  CVFS.on=!!on;
  for(const rec of CV10.built.values()){ if(rec.c.kind!=='karst'||!rec.mesh) continue;
    if(CV10.mat) rec.mesh.material=CV10.mat('karst');
    if(rec.fs){ for(const m of rec.fs.meshes) m.visible=CVFS.on; cvfsCoatShow(rec,CVFS.on); }
    else if(CVFS.on&&!rec.fsGen&&rec.onb) cvfsQueue(rec); }
  return CVFS.on;
}
CV10.onBuild.push(cvfsQueue); CV10.onDrop.push(cvfsDrop);
