/* 96-foam.js — CASTAWAY
   바다 거품의 결 — 물 셰이더(20-terrain.js waterMat)가 수면에 거품을 그릴 때 읽는 텍스처 하나(`WATER_U.uFoam`).
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   바다 거품(2026-11-11 사용자 요청 — '거품이 뭍으로 올라온다 · 사면체 거품 메시를 없애고 진짜 거품처럼')
   ----------------------------------------------------------------------------
   예전 거품은 물가를 따라 깐 메시 조각이었다(사람 둘레 44 m 의 물가를 8 m 마다 훑어 찾고(자바스크립트 · C 두 판) · 조각마다 둥근 방울 뭉치
   + 그 밑의 레이스 판). 방울은 20면 · 8면체라 세모로 보였고, 조각은 땅 높이를 어림해 물머리 위아래로 움직여 모래 위로 올라갔다.
   이제 거품은 **수면의 일부**다 — 물 셰이더가 물 판을 그리는 자리에서만 칠한다. 물 판은 바닥이 수면보다 낮은 데만 보이므로 거품이
   뭍에 설 수 없다(뭍 속의 낮은 들은 seaReachMask 가 판째 끈다). 무엇을 어디에 그리나는 waterMat 의 '거품' 대목:
     ① 물가 — 물머리에 붙은 흰 띠 · 물이 빠질 때 성긴 레이스와 바다 쪽으로 끌리는 줄
     ② 부서지는 물결 — 수심 1.7 m 안에서 뭍 쪽으로 밀려오는 흰 띠(앞머리가 짙고 뒤로 성겨진다)
     ③ 지나간 자리의 성긴 레이스
   셋 다 '덮는 몫'(0~1)만 정하고, 모양은 이 텍스처를 그 몫으로 문턱 지어 낸다.

   **결 텍스처** — 256×256 · 이어 붙는다(되풀이 무늬). 실제 바다 거품은 방울 막이 셋씩 만나 굽은 다각형 칸을 이룬 그물이다(플라토 법칙):
   큰 방울이 먼저 터져 칸 속이 비고, 막의 그물이 남고, 막이 만나는 마디가 가장 오래 남는다. 그래서 값을
     굵은 · 가운데 · 잔 방울의 막(보로노이 F2 − F1 이 작은 데 — 두께가 잡음으로 들쭉날쭉) × 거품 덩이(큰 잡음) + 덩이 − 큰 칸의 속
   으로 짓고 **순위로 고르게 편다**(값 v 위가 꼭 1 − v 만큼) — 셰이더는 '덮는 몫 c' 를 그대로 문턱 1 − c 로 쓴다:
   c 가 크면(갓 부서진 거품) 거의 다 희고 큰 방울 자리만 뚫리며, 줄어들수록 그물 → 마디와 굵은 막 조각 → 사라짐 차례로 꺼진다.
     R · G — 칸 크기가 다른 두 벌(칸 6 · 13 · 29 / 5 · 11 · 23 개/장) · B — 고르게 편 큰 얼룩(물결이 부서지는 구간 · 거품이 많고 적은 데)
   잰 값(Apple M1): 짓는 데 0.2 초 남짓 — 불러올 때 한 번. 메시 · 그리기 호출 · 프레임마다의 CPU 일이 없다(예전: 조각 최대 3,600 + 판 3,600 ·
   물가 찾기 8 m 마다)
   ========================================================================== */
function foamTex(){
  const W=256, n=W*W, rnd=mulberry32(0xf0a3);
  const wrap=v=>v-Math.floor(v);
  /* 방울 자리 — 격자 칸마다 0~3 개(칸 크기가 들쭉날쭉한 그물 · 고른 벌집이 아니게). 칸 k 마다 [개수, x0, y0, x1, y1, x2, y2] */
  const pts=k=>{ const P=new Float32Array(k*k*7); for(let j=0;j<k;j++) for(let i=0;i<k;i++){ const o=(j*k+i)*7, r=rnd(), m=r<0.16?0:r<0.70?1:r<0.93?2:3;
      P[o]=m; for(let q=0;q<m;q++){ P[o+1+q*2]=(i+0.04+0.92*rnd())/k; P[o+2+q*2]=(j+0.04+0.92*rnd())/k; } } return P; };
  /* 이어 붙는 보로노이 — 가장 가까운 두 점까지의 거리(칸 크기 단위) · 빈 칸이 있어 두 칸 둘레까지 본다 */
  const wor=(P,k,u,v,out)=>{ const ci=Math.floor(u*k), cj=Math.floor(v*k); let f1=9, f2=9;
    for(let dj=-2;dj<=2;dj++){ let jj=cj+dj, oy=0; if(jj<0){ jj+=k; oy=-1; } else if(jj>=k){ jj-=k; oy=1; }
      for(let di=-2;di<=2;di++){ let ii=ci+di, ox=0; if(ii<0){ ii+=k; ox=-1; } else if(ii>=k){ ii-=k; ox=1; }
        const o=(jj*k+ii)*7, m=P[o];
        for(let q=0;q<m;q++){ const dx=P[o+1+q*2]+ox-u, dy=P[o+2+q*2]+oy-v, dd=dx*dx+dy*dy; if(dd<f1){ f2=f1; f1=dd; } else if(dd<f2) f2=dd; } } }
    out[0]=Math.sqrt(f1)*k; out[1]=Math.sqrt(f2)*k; };
  /* 이어 붙는 값잡음(주기 p) */
  const vn=(u,v,p,sd)=>{ const x=u*p, y=v*p, X=Math.floor(x), Y=Math.floor(y), fx=x-X, fy=y-Y;
    const h=(a,b)=>{ a=((a%p)+p)%p; b=((b%p)+p)%p; let q=Math.imul(a,374761393)+Math.imul(b,668265263)+sd|0; q=Math.imul(q^(q>>>13),1274126177); return ((q^(q>>>16))>>>0)/4294967296; };
    const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy); return (h(X,Y)*(1-ux)+h(X+1,Y)*ux)*(1-uy)+(h(X,Y+1)*(1-ux)+h(X+1,Y+1)*ux)*uy; };
  const fbm=(u,v,sd)=>vn(u,v,4,sd)*0.5+vn(u,v,8,sd+7)*0.3+vn(u,v,16,sd+13)*0.2;
  const big=(u,v,sd)=>vn(u,v,2,sd)*0.55+vn(u,v,4,sd+5)*0.30+vn(u,v,8,sd+9)*0.15;      // 거품 덩이(한 장에 둘 남짓)
  const ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  /* 값을 순위로 고르게 편다(0~1) */
  const even=a=>{ const id=new Uint32Array(n); for(let i=0;i<n;i++) id[i]=i; id.sort((x,y)=>a[x]-a[y]); const o=new Float32Array(n); for(let r=0;r<n;r++) o[id[r]]=r/(n-1); return o; };
  /* 한 벌 — 굵은 · 가운데 · 잔 방울의 막(세 크기) + 거품 덩이. 덩이 속은 막이 촘촘하고 희며, 덩이 밖은 성긴 그물만 · 큰 방울 속은 빈다 */
  const WA=new Float32Array(2), WB=new Float32Array(2), WC=new Float32Array(2);
  const layer=(kA,kB,kC,sd)=>{ const PA=pts(kA), PB=pts(kB), PC=pts(kC), a=new Float32Array(n);
    for(let y=0;y<W;y++) for(let x=0;x<W;x++){ const u=x/W, v=y/W;
      const wu=wrap(u+(fbm(u,v,sd+1)-0.5)*0.08), wv=wrap(v+(fbm(u,v,sd+2)-0.5)*0.08);   // 막이 곧지 않게 비튼다
      wor(PA,kA,wu,wv,WA); wor(PB,kB,wu,wv,WB); wor(PC,kC,wu,wv,WC);
      const a1=WA[0], a2=WA[1], b1=WB[0], b2=WB[1], c1=WC[0], c2=WC[1], nz=fbm(u,v,sd+3), cl=big(u,v,sd+4);
      const gap=ss(0.22,0.50,fbm(u*1.0,v*1.0,sd+6));                                           // 막이 군데군데 끊긴다(다 이어진 그물이 아니게)
      const wallA=(1-ss(0,0.10+0.20*nz,a2-a1))*(0.35+0.65*gap), wallB=1-ss(0,0.10+0.08*cl,b2-b1), wallC=1-ss(0,0.16,c2-c1), core=ss(0.10,0.55,a1);
      a[y*W+x]=0.40*wallA*(0.55+0.45*cl)+0.26*wallB*(0.40+0.60*cl)+0.12*wallC*(0.5+0.5*cl)+0.30*Math.pow(cl,1.5)+0.16*nz-0.24*core*(1-cl); }   // 덩이(cl)는 장마다 되풀이되므로 조금만 — 큰 얼룩은 셰이더가 따로 얹는다
    return even(a); };
  const R=layer(6,13,29,11), G=layer(5,11,23,23), Bf=new Float32Array(n);
  for(let y=0;y<W;y++) for(let x=0;x<W;x++) Bf[y*W+x]=fbm(x/W,y/W,41);
  const Bv=even(Bf), px=new Uint8Array(n*4);
  for(let i=0;i<n;i++){ px[i*4]=Math.round(R[i]*255); px[i*4+1]=Math.round(G[i]*255); px[i*4+2]=Math.round(Bv[i]*255); px[i*4+3]=255; }
  const t=new THREE.DataTexture(px,W,W,THREE.RGBAFormat,THREE.UnsignedByteType);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true; t.anisotropy=4; t.needsUpdate=true;
  return t;
}
