/* 41-terrain-light.js — CASTAWAY
   섬 크기의 빛 — 산이 드리우는 그림자 · 하늘 트임(골짜기의 어둑함) · 숲 그늘
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   섬 크기의 빛
   ----------------------------------------------------------------------------
   해 그림자 지도(40-light.js)는 사람 둘레 36~64 m 만 덮는다. 그 밖은 그림자가 없어 — 해가 기울어도 산 뒤가 환했고,
   피오르 바닥과 능선이 같은 밝기였고, 먼 숲 바닥이 한낮 풀밭처럼 밝았다. 섬 전체를 덮는 텍스처 한 장에 세 가지를 담는다
   (격자 한 칸 = 텍셀 하나 · 쌍선형으로 읽는다):
     R **산 그림자** — 표고장을 빛 쪽에서부터 한 줄씩 훑으며 '그림자 면의 높이'를 넘겨 준다(줄마다 빛의 기울기만큼 내려간다).
       땅이 그 높이보다 낮으면 그늘이다. 칸 수에 비례하는 일(59만 칸) — 빛이 0.7° 넘게 움직이면 여러 프레임에 나눠 다시 훑는다.
       달이 뜨면 달빛으로 훑는다(`TERR_U.uSunDir` 이 지금 비추는 빛이다).
     G **하늘 트임** — 칸마다 여덟 방위의 지평선 높이를 재어 하늘이 얼마나 보이는지(0~1). 간접광(하늘빛)에 곱한다:
       골짜기 바닥·벼랑 밑·피오르는 어둑하고 능선은 밝다. 벽에서 되비치는 빛을 셈해 바닥은 0.45 를 남긴다. 섬을 지을 때 한 번.
     A 잔 기복의 가림막(10-worldgen.js `RELIEF.M` 을 그대로 — 사람 둘레의 덧판이 읽는다).
     B **숲 덮임** — 나무(소품 참나무·전나무 · 군락의 나무 · 노거수)의 수관이 그 칸을 덮는 비율. 그림자 지도 밖의 땅에서
       햇빛을 깎고(해 쪽으로 나무 키만큼 밀어 읽는다 — 그늘이 해 반대쪽으로 눕는다), 하늘빛도 조금 깎는다.
   R·G 는 빛을 받는 모든 재질이 읽는다(envPatch — 45-sky.js: 구름 그림자 자리에 같이 곱한다). B 는 땅 셰이더만(22-ground-textures.js).
   ========================================================================== */
const TLIT={px:null, tex:null, S:null, job:null, dir:new THREE.Vector3(0,-1,0), G:{value:new THREE.Vector2(768,2.5)}};
TERR_U.uTL={value:null}; TERR_U.uShR={value:46}; TERR_U.uWet={value:0};
{ const t=new THREE.DataTexture(new Uint8Array([255,255,0,255]),1,1,THREE.RGBAFormat); t.needsUpdate=true; TERR_U.uTL.value=t; }

/* 섬을 다 지은 뒤 한 번 — 하늘 트임과 숲 덮임을 세고, 산 그림자를 지금 빛으로 한 번에 훑는다 */
function tlitBuild(){
  const n=N*N, h=F.elev;
  if(!TLIT.px){ TLIT.px=new Uint8Array(n*4); TLIT.S=new Float32Array(n);
    const t=new THREE.DataTexture(TLIT.px,N,N,THREE.RGBAFormat,THREE.UnsignedByteType);
    t.magFilter=t.minFilter=THREE.LinearFilter; t.generateMipmaps=false;
    if(TERR_U.uTL.value) TERR_U.uTL.value.dispose(); TLIT.tex=TERR_U.uTL.value=t; }
  const px=TLIT.px; px.fill(255);
  TLIT.G.value.set(N,CELL);
  /* G 하늘 트임 — 방위마다 1·2·3·5·8·12·18 칸 밖의 땅이 만드는 가장 높은 지평선. 1 − sin(지평선 각)의 평균 */
  const DX=[1,1,0,-1,-1,-1,0,1], DZ=[0,1,1,1,0,-1,-1,-1], ST=[1,2,3,5,8,12,18];
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=z*N+x, h0=h[i]>0?h[i]:0; let op=0;
    for(let d=0;d<8;d++){ const dl=((d&1)?1.4142:1)*CELL; let mt=0;
      for(let k=0;k<7;k++){ const s=ST[k], xx=x+DX[d]*s, zz=z+DZ[d]*s; if(xx<0||zz<0||xx>=N||zz>=N) break;
        const hj=h[zz*N+xx], t=((hj>0?hj:0)-h0)/(s*dl); if(t>mt) mt=t; }
      op+=1-mt/Math.sqrt(1+mt*mt); }
    px[i*4+1]=Math.round(255*op/8);
  }
  /* B 숲 덮임 — 수관 넓이를 칸에 나눠 얹고(쌍선형), 겹침을 셈해 1 − e^(−넓이 비) */
  const cov=new Float32Array(n);
  const add=(x,z,r)=>{ const gx=x/CELL+N/2, gz=z/CELL+N/2, ix=Math.floor(gx), iz=Math.floor(gz); if(ix<0||iz<0||ix>=N-1||iz>=N-1) return;
    const fx=gx-ix, fz=gz-iz, a=Math.PI*r*r/(CELL*CELL), i=iz*N+ix;
    cov[i]+=a*(1-fx)*(1-fz); cov[i+1]+=a*fx*(1-fz); cov[i+N]+=a*(1-fx)*fz; cov[i+N+1]+=a*fx*fz; };
  for(const p of PROPS){ if(p.k==='oak') add(p.x,p.z,3.4*p.s); else if(p.k==='fir') add(p.x,p.z,2.0*p.s); }
  if(typeof FLORA!=='undefined'&&FLORA.P) for(const p of FLORA.P) add(p.x,p.z,2.6*(p.s||1));
  if(typeof GIANT!=='undefined') for(const g of GIANT.list) add(g.x,g.z,8.5*(g.s||1));
  for(let z=1;z<N-1;z++) for(let x=1;x<N-1;x++){ const i=z*N+x;                              // 한 번 흐린다(칸 가장자리가 계단지지 않게)
    const c=(cov[i]*4+cov[i-1]+cov[i+1]+cov[i-N]+cov[i+N])/8; px[i*4+2]=Math.round(255*(1-Math.exp(-1.35*c))); }
  for(let i=0;i<n;i++) if(h[i]<=0) px[i*4+2]=0;
  { const M=RELIEF.M; for(let i=0;i<n;i++) px[i*4+3]=M?M[i]:0; }        // A 잔 기복의 가림막 — 덧판 셰이더가 읽는다(20-terrain.js)
  /* R 산 그림자 — 지금 빛으로 */
  TLIT.job=null; TLIT.dir.set(0,-1,0);
  const J=tlitSweepStart(); if(J){ tlitSweepStep(J,N); TLIT.dir.copy(J.dir); }
  TLIT.tex.needsUpdate=true;
}
/* 훑기 한 판을 연다 — 빛의 수평 방향에서 큰 축을 줄 차례로 삼는다. f: 한 줄 가는 동안 작은 축으로 밀리는 칸 수(0~1) */
function tlitSweepStart(){
  const d=TERR_U.uSunDir.value, hl=Math.hypot(d.x,d.z);
  if(d.y<0.02) return null;                            // 빛이 지평선 아래
  const ax=Math.abs(d.x)>=Math.abs(d.z), M=ax?d.x:d.z, m=ax?d.z:d.x, f=hl<1e-5?0:Math.abs(m/M);
  return {ax, f, sM:M>=0?1:-1, sm:m>=0?1:-1, drop:hl<1e-5?1e6:CELL*Math.sqrt(1+f*f)*d.y/hl, k:0, dir:d.clone()};
}
/* 줄 lines 개를 훑는다 — 빛 쪽 가장자리부터. S: 그 칸 위의 그림자 면 높이(빛 쪽 이웃 줄의 두 칸에서 넘겨받는다) */
function tlitSweepStep(J,lines){
  const h=F.elev, S=TLIT.S, px=TLIT.px, W=CELL*0.25+1, ax=J.ax, f=J.f, sm=J.sm, drop=J.drop;
  for(let n=0;n<lines&&J.k<N;n++,J.k++){
    const a=J.sM>0?N-1-J.k:J.k, up=a+J.sM, edge=up<0||up>=N;
    for(let b=0;b<N;b++){
      const i=ax?b*N+a:a*N+b; let s=-1e9;
      if(!edge){ const i0=ax?b*N+up:up*N+b, b2=b+sm; let v0=S[i0]>h[i0]?S[i0]:h[i0], v1=v0;
        if(b2>=0&&b2<N){ const i1=ax?b2*N+up:up*N+b2; v1=S[i1]>h[i1]?S[i1]:h[i1]; }
        s=v0+(v1-v0)*f-drop; }
      S[i]=s;
      const lit=(h[i]-s)/W+0.5; px[i*4]=lit<=0?0:lit>=1?255:(lit*255)|0;
    }
  }
}
/* 프레임마다 — 빛이 0.7° 넘게 움직였으면 96 줄씩 다시 훑고(여덟 프레임), 다 훑으면 텍스처를 올린다 */
function updateTlit(dt){
  if(!TLIT.tex) return;
  TERR_U.uShR.value=LIGHT.QUAL[LIGHT.q].R||40;
  if(typeof WEA!=='undefined'){ const w=TERR_U.uWet, to=clamp(WEA.rain*1.6,0,1); w.value+=(to-w.value)*clamp((dt||0.016)*(to>w.value?0.25:0.02),0,1); }   // 비가 오면 15초에 젖고 3분에 마른다
  const J=TLIT.job;
  if(J){ tlitSweepStep(J,96); if(J.k>=N){ TLIT.tex.needsUpdate=true; TLIT.dir.copy(J.dir); TLIT.job=null; } return; }
  const d=TERR_U.uSunDir.value;
  if(d.y>=0.02&&d.dot(TLIT.dir)<0.99992) TLIT.job=tlitSweepStart();
}
