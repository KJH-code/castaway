/* ── 동굴 — 지형 판 10 (자리 · 종류 · 생김새 자료 · 굴 부피) ────────────────────────────────────────────────────
   판 9 까지의 굴은 땅 위에 바위를 쌓은 집이었다(32-caves.js). 판 10 은 **비탈에 입구가 뚫리고 안은 땅 밑으로 이어지는 굴**이다 —
   이 파일은 그 굴의 자료(입구 · 굴길 · 방)와 '굴 부피 함수'를 만든다. 메시(A2) · 걷기(B) · 땅 뚫기(C) · 재질(D) · 장식(E)은 모두
   이 파일의 `cv10Field` 를 읽는다. 설계와 까닭은 docs/notes/caves.md.
   · 굴 종류는 그 자리 바위대로(`cv10Kind` — surfaceRocks 와 같은 식): 석회암 종유굴 karst · 현무암 용암굴 lava · 화강암 바위틈 굴 talus · 사암 바위그늘 shelter
   · 굴은 위아래로 겹치지 않는다 → (x,z) 마다 바닥 f 와 천장 c 로 적는다(`cv10Field`). g=c−f>0 이 빈 데
   · 굴 하나의 난수는 전부 `c.seed` 에서(지어 두는 차례와 상관없이 같은 굴) · `Math.random` 없음 · 크기는 섬 배율과 상관없이 미터 그대로
   · 이름은 cv10 · CV10 으로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다) */
const CV10={
  L:0.18,                                   // 굴길 바닥의 마디 사이 비탈 상한(잡음이 얹혀도 30% 안)
  reach:12,                                 // 주 입구에서 길 거리 12 m 안 = 입구 마당(이마가 서는 곳 · 여기서는 열린 데가 나와도 된다)
  hi:null,                                  // 섬에서 가장 높은 표고(cv10Kind 가 처음 부를 때 재고, 섬을 새로 지을 때 caveSites 가 비운다)
  NAME:{karst:'석회암 종유굴', lava:'용암굴', talus:'바위틈 굴', shelter:'바위그늘'},
  /* 종류별 값 — 너비 w · 높이 h · 길이 len · 방 반지름 roomR · 방 천장 roomH · 이마 두께 browT(지붕이 이보다 얇으면 열린 데) · 최소 지붕 두께 minCover(열린 데 밖) */
  K:{
    karst:  {w:[2.5,5],  h:[3.0,4.5], len:[50,110],  roomR:[6,11], roomH:[5,9], browT:2.2, minCover:2.5},
    lava:   {w:[6,12],   h:[3.5,7],   len:[80,160],  cover:[3,6],  browT:2.2, minCover:2.5},
    talus:  {w:[1.6,3],  h:[1.8,3],   len:[25,50],   roomR:[3,5],  roomH:[3,4], browT:1.2, minCover:1.2},
    shelter:{W:[12,20],  D:[6,10],    h:[4,7],       browT:1.5, minCover:2.5}
  },
  /* 단면 틀 — fl(u)=0.5(1−(1−u^p)^½) · ce(u)=0.5+0.5(1−u^q)^½ — u=1 에서 둘 다 0.5 로 만나 벽에서 닫힌다 */
  PQ:{tube:[4,2], keyhole:[4,2], canyon:[10,10], lava:[8,1.6], talus:[6,6], shelter:[6,1.3], dome:[3,1.5]}
};
const cv10Smin=(a,b,k)=>{ const h=Math.max(k-Math.abs(a-b),0)/k; return Math.min(a,b)-h*h*k*0.25; };
const cv10Smax=(a,b,k)=>-cv10Smin(-a,-b,k);
const cv10Pow=(u,p)=>p===4?(u*=u,u*u):p===2?u*u:p===3?u*u*u:Math.pow(u,p);
/* 정수 두 개(+씨)에서 [0,1) — 보로노이 덩이용 */
const cv10H=(i,j,s)=>{ let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(s|0,1274126177); h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))>>>0)/4294967296; };

/* ── 종류 — 그 자리 바위(10-worldgen.js surfaceRocks 와 같은 식) ───────────────────────────────────────────── */
function cv10Kind(x,z){
  if(CV10.hi===null){ let hi=0; for(let i=0;i<F.elev.length;i++) if(F.elev[i]>hi) hi=F.elev[i]; CV10.hi=hi; }
  const gx=clamp(Math.round(x/CELL+N/2),0,N-1), gz=clamp(Math.round(z/CELL+N/2),0,N-1), i=IDX(gx,gz), b=F.biome[i], h=F.elev[i], hi=CV10.hi;
  const fd=Math.hypot(x-fumaCenter.x,z-fumaCenter.z)/Math.max(1,fumaCenter.r);
  return (F.fuma[i]>0.10||fd<2.4) ? 'lava'
       : (h<hi*0.20&&(b===B.BEACH||b===B.DUNE||F.dWater[i]<25)) ? 'shelter'
       : (h<hi*0.35||(h<hi*0.50&&b!==B.ROCK&&b!==B.SCREE)) ? 'karst' : 'talus';
}
/* 그 자리 둘레 반지름 r 안의 가장 낮은 땅(가운데 + 여덟 방위) — 지붕 두께를 보수적으로 잰다 */
function cv10Hm(x,z,r){ let m=heightAt(x,z); for(let k=0;k<8;k++){ const a=k*0.7853982, v=heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r); if(v<m) m=v; } return m; }
/* 굴을 낼 수 있는 자리인가 — 섬 안 · 바다 위 아님(땅 높이 1 m 위) · (rv>0 이면) 둘레 rv m 에 강 칸 없음 */
function cv10Free(x,z,r,rv){
  const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2);
  if(gx<6||gz<6||gx>N-7||gz>N-7) return false;
  if(heightAt(x,z)<=1) return false;
  if(rv>0){ const k=Math.ceil(rv/CELL)+1;
    for(let dz=-k;dz<=k;dz++) for(let dx=-k;dx<=k;dx++){ const X=gx+dx, Z=gz+dz; if(X<0||Z<0||X>=N||Z>=N||!F.river[IDX(X,Z)]) continue;
      if(Math.hypot((X-N/2)*CELL-x,(Z-N/2)*CELL-z)<=rv+CELL*0.75) return false; } }
  return true;
}

/* ── 굴 부피 ─────────────────────────────────────────────────────────────────────────────────────────────────
   준비: 굴길 토막(같은 길 pid 끼리 묶음)과 방·빛구멍의 상자를 미리 구해 둔다(c._P — 저장에 안 든다). 한 점마다 상자 밖은 곧바로 거른다 */
function cv10Prep(c){
  const P={G:[],R:[],S:[]}, byPid=new Map();
  for(const g of c.segs){
    const dx=g.bx-g.ax, dz=g.bz-g.az, len=Math.hypot(dx,dz)||1e-6, pq=CV10.PQ[g.prof]||CV10.PQ.tube, m=g.w*0.66+0.6;
    const e={ax:g.ax,az:g.az,ux:dx/len,uz:dz/len,len,p:pq[0],q:pq[1],w:g.w,H:g.h,ay:g.ay,by:g.by,s0:g.s0,out:!!g.out,lava:g.prof==='lava',
      pit:g.pit||0,tl:g.tl||0,tnx:g.tnx||0,tnz:g.tnz||0,
      x0:Math.min(g.ax,g.bx)-m,x1:Math.max(g.ax,g.bx)+m,z0:Math.min(g.az,g.bz)-m,z1:Math.max(g.az,g.bz)+m};
    const pid=g.pid|0; let G=byPid.get(pid); if(!G){ G={segs:[],x0:1e9,x1:-1e9,z0:1e9,z1:-1e9}; byPid.set(pid,G); P.G.push(G); }
    G.segs.push(e); G.x0=Math.min(G.x0,e.x0); G.x1=Math.max(G.x1,e.x1); G.z0=Math.min(G.z0,e.z0); G.z1=Math.max(G.z1,e.z1);
  }
  for(const r of c.rooms){ const m=r.R*1.3+0.5; P.R.push({r,x0:r.x-m,x1:r.x+m,z0:r.z-m,z1:r.z+m}); }
  for(const m of c.mouths) if(m.sky){ const q=m.r*1.3+0.5; P.S.push({m,x0:m.x-q,x1:m.x+q,z0:m.z-q,z1:m.z+q}); }
  const fr=((c.seed>>>5)%100)/100;
  P.b=0.9+0.4*fr; P.off=((c.seed>>>9)%100)/100*P.b;                          // 켜 사이(m) · 켜의 기준 높이
  P.bT=(CV10.K[c.kind]||CV10.K.karst).browT;
  P.layer=c.kind==='karst'||c.kind==='shelter'; P.vor=c.kind==='talus';
  P.vs=(c.seed>>>2)&0xffff;
  c._n=makePerlin(((c.seed^0x9e3779b1)>>>0)); c._P=P;
  return P;
}
const _cvE=new Array(12), _cvA=new Float64Array(12), _cvU=new Float64Array(12);
const _cv10None=(Y)=>({f:Y+0.1,c:Y-0.1,g:-0.2,s:0,open:false,u:1,h:NaN,fb:Y+0.1,rp:false});
/* 한 점의 굴 — {f 바닥, c 천장, g=c−f(빈 데가 아니면 ≤0), s 주 입구로부터 길 거리, open 위가 하늘인가(그때 c=h+6), u 가로 자리(0 가운데 ~ 1 벽),
   h 땅 높이, fb 단 · 선반을 뺀 바닥(비탈을 잴 때), rp 무너진 돌 비탈 위인가} */
function cv10Eval(c,P,x,z){
  const n=c._n; let F_=0,C_=0,Fb=0,cnt=0,bg=-1e9,S=0,U=1,Yn=c.y,ub=1e9,inSky=false,rp=false;
  for(let gi=0;gi<P.G.length;gi++){
    const G=P.G[gi]; if(x<G.x0||x>G.x1||z<G.z0||z>G.z1) continue;
    let bu=1e9,be=null,ba=0,bqx=0,bqz=0,nc=0;
    for(let si=0;si<G.segs.length;si++){
      const e=G.segs[si]; if(x<e.x0||x>e.x1||z<e.z0||z>e.z1) continue;
      const px=x-e.ax, pz=z-e.az; let a=px*e.ux+pz*e.uz; a=a<0?0:a>e.len?e.len:a;
      const qx=px-e.ux*a, qz=pz-e.uz*a, s=e.s0+a;
      let wN=e.w*(1+0.2*n(s/7+11.3,1.7)+0.1*n(s/2.3+4.9,8.3)); if(wN<e.w*0.55) wN=e.w*0.55;
      const u=Math.sqrt(qx*qx+qz*qz)/(wN*0.5);
      if(u<bu){ bu=u; be=e; ba=a; bqx=qx; bqz=qz; }
      if(nc<12){ _cvE[nc]=e; _cvA[nc]=a; _cvU[nc]=u; nc++; }
    }
    if(!be) continue;
    const e=be;
    /* 바닥 가운데 높이 yc · 높이 H — 꺾이는 길의 안쪽에서 두 토막이 서로 다른 값을 내므로, 가장 가까운 토막과 u 가 0.15 안에 드는 토막을 거리에 따라 섞는다(안 그러면 이음매에서 바닥이 툭 뛴다) */
    let sw=0,syc=0,sH=0;
    for(let k=0;k<nc;k++){ const wk=1-(_cvU[k]-bu)/0.15; if(wk<=0) continue; const ek=_cvE[k], ak=_cvA[k];
      const y=ek.out?heightAt(ek.ax+ek.ux*ak,ek.az+ek.uz*ak)-0.2:ek.ay+(ek.by-ek.ay)*(ak/ek.len);
      sw+=wk; syc+=wk*y; sH+=wk*ek.H; }
    let yc=syc/sw;
    if(bu>=1){ if(bu<ub){ ub=bu; Yn=yc; } continue; }
    if(e.tl) yc+=e.tl*(bqx*e.tnx+bqz*e.tnz);
    const u=bu, H=sH/sw, fl=0.5*(1-Math.sqrt(1-cv10Pow(u,e.p))), ce=0.5+0.5*Math.sqrt(1-cv10Pow(u,e.q)), w1=1-u;
    let fb=yc+H*fl+w1*0.08*n(x/2+3.3,z/2+7.1), ff=fb, cc=yc+H*ce;
    if(e.pit) ff-=e.pit*(1-smoothstep(0.3,0.38,u));
    if(e.lava) ff+=0.18*H*smoothstep(0.70,0.74,u)*(1-smoothstep(0.86,1,u));
    cc+=w1*(H*0.08*n(x/3+1.9,z/3+5.5)+0.15*n(x/1.1+9.1,z/1.1+4.4));
    const g=cc-ff;
    if(cnt===0){ F_=ff; C_=cc; Fb=fb; } else { F_=cv10Smin(F_,ff,0.8); C_=cv10Smax(C_,cc,0.8); Fb=cv10Smin(Fb,fb,0.8); }
    cnt++; if(g>bg){ bg=g; S=e.s0+ba; U=u; }
  }
  for(let ri=0;ri<P.R.length;ri++){
    const B_=P.R[ri]; if(x<B_.x0||x>B_.x1||z<B_.z0||z>B_.z1) continue;
    const r=B_.r, dx=x-r.x, dz=z-r.z, rr=Math.sqrt(dx*dx+dz*dz), ca=rr>1e-6?dx/rr:1, sa=rr>1e-6?dz/rr:0;
    const nb=1+0.15*n(ca*0.5+r.x*0.013+5.5,sa*0.5+r.z*0.013+2.2)+0.07*n(ca*1.4+r.z*0.011+7.7,sa*1.4+r.x*0.017+3.1);
    const u=rr/(r.R*nb); if(u>=1) continue;
    const w1=1-u, rub=Math.max(0,n(x/1.8+6.6,z/1.8+1.4)), pl=(r.gx||0)*dx+(r.gz||0)*dz;     // pl: 굴길 바닥의 비탈을 따라 방 전체를 기울인다(안 그러면 방 바닥이 비탈진 굴길 바닥보다 낮아 가장자리에서 툭 꺼진다)
    const Hf=Math.min(r.H,0.55*r.R);                                 // 바닥이 벽 쪽으로 오르는 높이는 방 크기에 맞춰 낮추고(비탈 한도) 나머지는 벽 바로 앞에서 오른다 — 벽에서 천장과 만나는 것은 그대로
    const fb=r.y+pl+Hf*0.5*(1-Math.sqrt(1-u*u*u))+0.5*(r.H-Hf)*smoothstep(0.75,1,u)+w1*(0.1*rub*rub+0.07*n(x/2+3.3,z/2+7.1));
    const cc=r.y+pl+r.H*(0.5+0.5*Math.sqrt(1-cv10Pow(u,1.5)))+w1*(r.H*0.08*n(x/3+1.9,z/3+5.5)+0.15*n(x/1.1+9.1,z/1.1+4.4));
    const g=cc-fb;
    if(cnt===0){ F_=fb; C_=cc; Fb=fb; } else { F_=cv10Smin(F_,fb,0.8); C_=cv10Smax(C_,cc,0.8); Fb=cv10Smin(Fb,fb,0.8); }
    cnt++; if(g>bg){ bg=g; S=r.s; U=u; }
  }
  for(let si=0;si<P.S.length;si++){                                   // 천장 구멍(채광창 · 빛구멍) — 가운데에서 r(1+0.25n) 안은 하늘까지 열린 데
    const B_=P.S[si]; if(x<B_.x0||x>B_.x1||z<B_.z0||z>B_.z1) continue;
    const m=B_.m, dx=x-m.x, dz=z-m.z, rr=Math.sqrt(dx*dx+dz*dz), ca=rr>1e-6?dx/rr:1, sa=rr>1e-6?dz/rr:0;
    const rN=m.r*(1+0.25*n(ca*0.6+m.x*0.019+1.3,sa*0.6+m.z*0.023+8.8)), rd=rr/rN; if(rd>=1) continue;
    inSky=true;
    /* 구멍 밑 바닥 — 큰 구멍(채광창)은 가장자리 안쪽에서 평평한 구멍 바닥(m.y)으로 바뀌고, 가장자리에서 굴길 바닥과 매끈하게 이어진다. 가운데 둘레는 무너진 돌로 조금 둔덕 */
    const rise=Math.min(0.4,0.05*m.r), bump=rise*smoothstep(0.3,0.6,rd)*(1-smoothstep(0.6,1,rd));
    if(cnt===0){ F_=m.y+bump; C_=F_+1; Fb=F_; }
    else{ const mw=(1-smoothstep(0.5,1,rd))*smoothstep(1.5,3,m.r); F_=F_+(m.y-F_)*mw+bump; Fb=Fb+(m.y-Fb)*mw+bump; }
    cnt++; if(rd<U||bg<0){ U=rd; S=m.s||0; bg=Math.max(bg,1); }
    if(m.ramp!==null&&m.ramp!==undefined){                           // 무너진 돌 비탈 — 구멍 가장자리(땅)에서 안쪽으로 내려간다
      const ca2=Math.cos(m.ramp), sa2=Math.sin(m.ramp), a=dx*ca2+dz*sa2, l=-dx*sa2+dz*ca2;
      const ry=m.he-m.kr*Math.max(0,m.r-a)-5*smoothstep(0.55,1,Math.abs(l)/m.r);
      if(ry>F_){ F_=ry; Fb=ry; rp=true; }
    }
  }
  if(cnt===0) return _cv10None(Yn);
  if(P.layer){                                                        // 켜 — 천장을 켜 선반 쪽으로 70% 당긴다(벽에서는 0)
    const g0=C_-F_, wgt=(1-U)*0.7*clamp((g0-2.4)/1.2,0,1);
    if(wgt>0){ const q=(C_-P.off)/P.b, fq=q-Math.floor(q), lay=P.off+P.b*(Math.floor(q)+smoothstep(0.75,1,fq)); C_+=wgt*(lay-C_); }
  }
  if(P.vor){                                                          // 바위틈 — 보로노이 덩이마다 천장 ±0.6 m(모난 면)
    const X=x/1.8, Z=z/1.8, ix=Math.floor(X), iz=Math.floor(Z); let bd=1e9,bv=0;
    for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const i=ix+dx, j=iz+dz, px=i+0.15+0.7*cv10H(i,j,P.vs), pz=j+0.15+0.7*cv10H(i,j,P.vs+1), d=(X-px)*(X-px)+(Z-pz)*(Z-pz);
      if(d<bd){ bd=d; bv=cv10H(i,j,P.vs+2)*2-1; } }
    C_+=(1-U)*0.6*bv;
  }
  const h=heightAt(x,z);
  let open=inSky;
  if(!open&&h-C_<P.bT) open=true;
  if(open) C_=h+6;
  if(F_>=h-0.1||C_-F_<=0.05) return _cv10None(Yn);
  return {f:F_,c:C_,g:C_-F_,s:S,open,u:U,h,fb:Fb,rp};
}
function cv10Field(c,x,z){
  const b=c.box;
  if(x<b.x0||x>b.x1||z<b.z0||z>b.z1) return {f:c.y,c:c.y-1,g:-1,s:0,open:false,u:1};
  return cv10Eval(c,c._P||cv10Prep(c),x,z);
}

/* ── 겉을 비워 둘 원 — 주 입구 들머리(바깥 4 m ~ 안쪽 12 m 를 2 m 마다) · 빛구멍 · 바위그늘의 처마 ──────────────────────── */
function cv10Zones(c){
  const Z=[], at=(pid,s)=>{ for(const g of c.segs){ if((g.pid|0)!==pid) continue; const len=Math.hypot(g.bx-g.ax,g.bz-g.az);
      if(s>=g.s0-1e-6&&s<=g.s0+len+1e-6){ const t=len>0?(s-g.s0)/len:0; return {x:g.ax+(g.bx-g.ax)*t,z:g.az+(g.bz-g.az)*t,R:g.w/2+1}; } } return null; };
  for(const m of c.mouths) if(m.sky) Z.push({x:m.x,z:m.z,R:m.r*1.3+1});
  for(const g of c.segs) if(g.zone){ const len=Math.hypot(g.bx-g.ax,g.bz-g.az), k=Math.max(1,Math.ceil(len/2.5));
    for(let i=0;i<=k;i++){ const t=i/k; Z.push({x:g.ax+(g.bx-g.ax)*t,z:g.az+(g.bz-g.az)*t,R:g.w/2+1}); } }
  if(!c.mouths[0].sky&&c.kind!=='shelter') for(let s=-4;s<=CV10.reach+1e-6;s+=2){ const p=at(0,s); if(p) Z.push(p); }
  return Z;
}
/* 상자를 step(기본 1 m) 격자로 훑어 센다 — cells 빈 칸 · open 열린 칸 · thin(입구 마당 · 빛구멍 밖인데 지붕이 얇아 열린 칸) · minCover(마당 밖 닫힌 칸의 h−c 최솟값)
   · maxSlope(바닥 가운데 쪽 u≤0.55 인 이웃 빈 칸 사이 |Δf|/거리 — 들머리 · 무너진 돌 비탈 · 단(열쇠 구멍 · 선반) 뺀다) · len(굴길 길이 합) */
function cv10Stats(c,step,noReach){
  step=step||1; const P=c._P||cv10Prep(c), b=c.box, Z=cv10Zones(c), nx=Math.floor((b.x1-b.x0)/step)+1, nz=Math.floor((b.z1-b.z0)/step)+1;
  let cells=0,open=0,thin=0,minCover=1e9,maxSlope=0,len=0; const fa=new Float32Array(nx*nz).fill(NaN);
  const inZ=(x,z)=>{ for(let k=0;k<Z.length;k++){ const q=Z[k], dx=x-q.x, dz=z-q.z; if(dx*dx+dz*dz<q.R*q.R) return true; } return false; };
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){
    const x=b.x0+i*step, z=b.z0+j*step, o=cv10Eval(c,P,x,z); if(!(o.g>0)) continue;
    cells++; const zn=inZ(x,z);
    if(o.open){ open++; if(!zn) thin++; } else if(!zn){ const cv=o.h-o.c; if(cv<minCover) minCover=cv; }
    if(o.u<=0.55&&!o.rp&&o.s>=0) fa[j*nx+i]=o.fb;
  }
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const a=fa[j*nx+i]; if(a!==a) continue;
    if(i+1<nx){ const d=fa[j*nx+i+1]; if(d===d){ const s=Math.abs(d-a)/step; if(s>maxSlope) maxSlope=s; } }
    if(j+1<nz){ const d=fa[(j+1)*nx+i]; if(d===d){ const s=Math.abs(d-a)/step; if(s>maxSlope) maxSlope=s; } } }
  for(const g of c.segs) if(!g.out) len+=Math.hypot(g.bx-g.ax,g.bz-g.az);
  const R=noReach?{}:cv10Reach(c);
  return {cells,open,thin,minCover:minCover===1e9?99:minCover,maxSlope,len,reach:R.reach,reachStand:R.reachStand};
}
/* 이어짐 — 주 입구(용암굴은 채광창 가장자리 땅 높이)에서 빈 데 칸을 따라(0.5 m 격자 · 이웃 단차 ≤0.5 m) 머리 위가 PG 이상으로 모든 방 가운데(2 m 안)에 닿는가.
   reach: 쪼그려(≥1.3 m)로 닿는 방 수 · reachStand: 선 채로(≥1.9 m)로 닿는 방 수 (방 총수는 c.rooms.length) */
function cv10Reach(c){
  const P=c._P||cv10Prep(c), b=c.box, st=0.5, nx=Math.floor((b.x1-b.x0)/st)+1, nz=Math.floor((b.z1-b.z0)/st)+1, A=new Array(nx*nz), m=c.mouths[0];
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++) A[j*nx+i]=cv10Eval(c,P,b.x0+i*st,b.z0+j*st);
  const out=[];
  for(const PG of [1.3,1.9]){
    const seen=new Uint8Array(nx*nz), q=[];
    for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const o=A[j*nx+i]; if(!(o.g>=PG)) continue; const x=b.x0+i*st, z=b.z0+j*st;
      if(o.f>=o.h-0.6&&Math.hypot(x-m.x,z-m.z)<(m.sky?m.r*1.3+1:3)&&(m.sky?o.open:true)){ seen[j*nx+i]=1; q.push(j*nx+i); } }
    while(q.length){ const k=q.pop(), i=k%nx, j=(k/nx)|0, a=A[k];
      for(let d=0;d<4;d++){ const I=i+(d===0?1:d===1?-1:0), J=j+(d===2?1:d===3?-1:0); if(I<0||J<0||I>=nx||J>=nz) continue; const kk=J*nx+I; if(seen[kk]) continue; const o=A[kk];
        if(!(o.g>=PG)||Math.abs(o.f-a.f)>0.5) continue; seen[kk]=1; q.push(kk); } }
    let n=0; for(const r of c.rooms){ let ok=false;
      for(let dz=-2;dz<=2&&!ok;dz+=0.5) for(let dx=-2;dx<=2&&!ok;dx+=0.5){ const i=Math.round((r.x+dx-b.x0)/st), j=Math.round((r.z+dz-b.z0)/st); if(i>=0&&j>=0&&i<nx&&j<nz&&seen[j*nx+i]) ok=true; }
      if(ok) n++; }
    out.push(n); }
  return {reach:out[0],reachStand:out[1]};
}

/* ── 자리 짜기 ───────────────────────────────────────────────────────────────────────────────────────────────
   길 하나 = 마디(node) 열 — 4 m 간격 · 마디마다 {x,z,s 길 거리,w 너비,H 높이,y 바닥 가운데 높이,prof,room}.
   ① cv10Route 가 평면 위 길을 깔고(굽이는 leg 마다) ② 방 · 너비 · 높이를 붙인 뒤 ③ cv10Floor 가 바닥을 정한다:
   바닥은 '땅 − 지붕 두께 − 높이' 를 넘지 못하게(마디마다 상한 ymax) 하고 마디 사이 비탈 L 안으로 퍼뜨린다(상한을 두 방향으로 L 씩 눌러 내린다) */
function cv10Route(ctx,o){
  const rnd=ctx.rnd, ds=4, nodes=[]; nodes.par=o.par||null; nodes.pid=o.pid;
  let x=o.x, z=o.z, hd=o.hd, s=o.s0, total=0, first=true, leg=0;
  nodes.push({x,z,s,pid:o.pid,leg:0});
  const clear=(nx,nz,idx)=>{
    for(const arr of ctx.paths){ if(arr===nodes.par&&idx<=3) continue;
      for(let j=0;j<arr.length;j++){ const q=arr[j], d=Math.hypot(q.x-nx,q.z-nz); if(d>=(q.room?q.room.R+o.w/2+2:(q.w+o.w)/2+3)) continue; return false; } }
    for(let j=0;j<nodes.length&&j<idx-3;j++){ const q=nodes[j]; if(Math.hypot(q.x-nx,q.z-nz)<(q.w||o.w)/2+o.w/2+3) return false; }
    return true; };
  while(total<o.len-0.5){
    leg++;
    let legL, cands=[];
    if(o.entry&&first){ legL=o.entry; cands=[hd]; }
    else{ legL=Math.min(o.len-total,8+rnd()*8);
      for(let k=0;k<5;k++) cands.push(hd+(o.turn[0]+rnd()*(o.turn[1]-o.turn[0]))*0.017453*(rnd()<0.5?-1:1)); }
    let best=null, bs=-1e9;
    const nn=Math.max(1,Math.round(legL/ds));
    for(const a of cands){
      const sx=Math.cos(a), sz=Math.sin(a), pts=[]; let ok=true;
      for(let k=1;k<=nn;k++){ const px=x+sx*ds*k, pz=z+sz*ds*k;
        if(!cv10Free(px,pz,o.w/2+1.5,(o.river&&s+ds*k<=CV10.reach+4)?4+o.w/2:0)||!clear(px,pz,nodes.length+k-1)){ ok=false; break; } pts.push([px,pz]); }
      if(!ok) continue;
      const e=pts[pts.length-1];
      const sc=o.mode==='contour' ? -Math.abs((heightAt(e[0],e[1])-heightAt(x,z))/(ds*nn)+0.12)*10+rnd()*0.05
                                  : cv10Hm(e[0],e[1],o.w/2+1)+rnd()*0.3;
      if(sc>bs){ bs=sc; best={a,pts}; }
    }
    if(!best) break;
    for(const p of best.pts){ s+=ds; total+=ds; nodes.push({x:p[0],z:p[1],s,pid:o.pid,leg}); }
    x=best.pts[best.pts.length-1][0]; z=best.pts[best.pts.length-1][1]; hd=best.a; first=false;
  }
  return nodes;
}
/* 바닥 — o.y0 이 있으면 첫 마디를 그 높이에 박는다(없으면 o.y0f(첫 마디)와 상한 가운데 낮은 쪽) · o.target(i,앞 마디 y,간격) 이 바라는 높이 · o.exempt 보다 가까운 마디는 지붕 상한을 안 본다 */
function cv10Floor(nodes,o){
  const n=nodes.length, L=CV10.L, d=i=>Math.hypot(nodes[i].x-nodes[i-1].x,nodes[i].z-nodes[i-1].z), E=new Array(n);
  for(let i=0;i<n;i++){ const q=nodes[i];
    E[i]=(o.exempt&&q.s<o.exempt)?1e9:cv10Hm(q.x,q.z,Math.max(q.w/2,q.room?q.room.R:0)+1.2)-Math.max(q.H,q.room?q.room.H:0)-o.cov; }
  for(let i=1;i<n;i++) E[i]=Math.min(E[i],E[i-1]+L*d(i));
  for(let i=n-2;i>=0;i--) E[i]=Math.min(E[i],E[i+1]+L*d(i+1));
  const y0=o.y0!==undefined&&o.y0!==null?o.y0:Math.min(E[0],o.y0f(nodes[0]));
  if(y0>E[0]+0.02) return false;
  nodes[0].y=y0;
  for(let i=1;i<n;i++) nodes[i].y=Math.min(o.target(i,nodes[i-1].y,d(i)),E[i]);
  return true;
}
/* 방을 마디에 얹는다 — 길 거리 s≥sMin 인 마디에서 고르게 count 개. 다른 길 마디와 R+너비/2+2 이상 떨어지게 R 을 줄이고, Rmin 도 안 되면 그 마디는 건너뛴다 */
function cv10Rooms(ctx,nodes,count,Rr,Hr,sMin,shrink,other){
  const rnd=ctx.rnd, put=[]; if(!nodes.length) return put;
  const smax=nodes[nodes.length-1].s, span=smax-sMin; if(span<2) return put;
  for(let k=0;k<count;k++){
    const st=sMin+span*(k+0.5)/count+(rnd()-0.5)*Math.min(6,span/count*0.5);
    let bi=-1,bd=1e9; for(let i=0;i<nodes.length;i++){ const dd=Math.abs(nodes[i].s-st); if(dd<bd&&!nodes[i].room){ bd=dd; bi=i; } }
    const rr=Rr[0]+rnd()*(Rr[1]-Rr[0]), hh=Hr[0]+rnd()*(Hr[1]-Hr[0]); if(bi<0) continue;
    let R=Rr[0]+(rr-Rr[0])*shrink; const q=nodes[bi];
    for(;R>=Rr[0]-1e-6;R-=0.5){ let ok=true;
      for(const arr of [nodes].concat(other||[])) for(let j=0;j<arr.length&&ok;j++){ const p=arr[j]; if(arr===nodes&&Math.abs(j-bi)<=Math.ceil(R/4)+1) continue;
        if(Math.hypot(p.x-q.x,p.z-q.z)<R+(p.room?p.room.R:p.w/2)+2) ok=false; }
      if(ok&&cv10Free(q.x,q.z,R,0)) break; if(R-0.5<Rr[0]-1e-6){ R=-1; break; } }
    if(R<0) continue;
    q.room={R,H:Hr[0]+(hh-Hr[0])*Math.max(shrink,0.35)}; put.push(q);
  }
  return put;
}
/* 마디 열 → 굴길 토막 */
function cv10Segs(c,nodes,extra){
  for(let i=0;i<nodes.length-1;i++){ const a=nodes[i], b=nodes[i+1];
    const g={ax:a.x,az:a.z,ay:a.y,bx:b.x,bz:b.z,by:b.y,w:(a.w+b.w)/2,h:(a.H+b.H)/2,prof:a.prof,s0:a.s,out:false,pid:nodes.pid|0};
    if(a.pit) g.pit=a.pit; if(extra) Object.assign(g,extra); c.segs.push(g); }
}
function cv10Finish(c){
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9; const grow=(x,z,r)=>{ x0=Math.min(x0,x-r); x1=Math.max(x1,x+r); z0=Math.min(z0,z-r); z1=Math.max(z1,z+r); };
  for(const g of c.segs){ const r=g.w*0.66+0.6; grow(g.ax,g.az,r); grow(g.bx,g.bz,r); }
  for(const r of c.rooms) grow(r.x,r.z,r.R*1.3+0.5);
  for(const m of c.mouths) if(m.sky) grow(m.x,m.z,m.r*1.3+0.5);
  c.box={x0:x0-4,z0:z0-4,x1:x1+4,z1:z1+4};
  c.rooms.sort((a,b)=>a.s-b.s);                                                  // 입구에서 가까운 방부터(다지류 둥지 · 수직굴이 첫째 · 마지막 방을 읽는다)
  for(let i=0;i<c.rooms.length;i++){ const r=c.rooms[i], a=c.rooms[i-1], b=c.rooms[i+1]; r.open=[];
    r.open.push(a?Math.atan2(a.z-r.z,a.x-r.x):c.yaw); if(b) r.open.push(Math.atan2(b.z-r.z,b.x-r.x)); }
  c.ore=0; cv10Prep(c);
}
const _cv10Ang=(nodes,i)=>{ const a=nodes[Math.max(0,i-1)], b=nodes[Math.min(nodes.length-1,i+1)]; return Math.atan2(b.z-a.z,b.x-a.x); };

/* 마디에 얹은 방 → 방 자료 — gx · gz 는 그 마디 둘레 굴길 바닥의 비탈(m/m) */
function cv10RoomAt(nodes,q){
  const i=nodes.indexOf(q), a=nodes[Math.max(0,i-1)], b=nodes[Math.min(nodes.length-1,i+1)], d=Math.hypot(b.x-a.x,b.z-a.z)||1, sl=(b.y-a.y)/d;
  return {x:q.x,z:q.z,y:q.y,R:q.room.R,H:q.room.H,open:[],s:q.s,gx:sl*(b.x-a.x)/d,gz:sl*(b.z-a.z)/d};
}

/* 석회암 종유굴 · 바위틈 굴 — 입구에서 비탈 속으로 파고드는 굽이굽이 굴길 */
function cv10Tunnel(ctx,talus){
  const c=ctx.c, rnd=ctx.rnd, k=talus?ctx.K.talus:ctx.K.karst, att=ctx.att, hM=heightAt(c.x,c.z);
  const w0=k.w[0]+rnd()*(k.w[1]-k.w[0]), Hb=k.h[0]+rnd()*(k.h[1]-k.h[0]);
  const pr=talus?'talus':(rnd()<0.25?'keyhole':rnd()<0.2?'canyon':'tube');
  const w=pr==='canyon'?Math.max(2.5,w0*0.7):w0, Hm=pr==='canyon'?Math.max(Hb,4.0):Hb;
  const entry=talus?6+rnd()*4:8+rnd()*6, rate0=Math.min(0.2,0.12+rnd()*0.08+att*0.01), len=k.len[0]+rnd()*(k.len[1]-k.len[0]);
  const main=cv10Route(ctx,{x:c.x,z:c.z,hd:c.yaw+Math.PI,s0:0,pid:0,w,len,entry,turn:[20,70],mode:'cover',river:true});
  if(main[main.length-1].s<k.len[0]*0.8) return false;
  const pit=1.2+rnd()*0.6, h0=talus?0.85:0.62;
  for(const q of main){ q.w=w; q.prof=pr; q.H=Hm*(h0+(1-h0)*smoothstep(6,20,q.s)); if(pr==='keyhole'&&q.s>=12) q.pit=pit; }
  const nRoom=talus?2+((rnd()*2)|0):2+((rnd()*3)|0), lr={};
  let ok=false;
  for(const shrink of [1,0.5,0]){
    if(ok) break;
    for(const q of main) q.room=null;
    const placed=cv10Rooms(ctx,main,nRoom,k.roomR,k.roomH,talus?10:16,shrink,[]);
    if(!placed.length) continue;
    ok=cv10Floor(main,{y0:hM-0.2,cov:k.minCover+0.6,exempt:10,
      target:(i,yp,d)=>yp-(main[i].leg<=1?rate0:(lr[main[i].leg]!==undefined?lr[main[i].leg]:(lr[main[i].leg]=-0.02+0.09*rnd())))*d});
  }
  if(!ok) return false;
  ctx.paths.push(main);
  const rooms=main.filter(q=>q.room);
  const branches=[];
  if(!talus){                                                                     // 곁가지 1~2 — 10~25 m 막다른 길
    const nb=rnd()<0.6?1:2;
    for(let b=0;b<nb;b++){
      const cand=main.map((q,i)=>i).filter(i=>main[i].s>=20&&main[i].s<=main[main.length-1].s-10&&!main[i].room&&main[i].y!==undefined);
      if(!cand.length) break;
      const bi=cand[(rnd()*cand.length)|0], base=_cv10Ang(main,bi), sg=rnd()<0.5?-1:1, q0=main[bi];
      for(const sgn of [sg,-sg]){
        const hd=base+sgn*(60+rnd()*50)*0.017453, bw=Math.max(2.0,w*0.8), blen=10+rnd()*15;
        const br=cv10Route(ctx,{x:q0.x,z:q0.z,hd,s0:q0.s,pid:1+b,w:bw,len:blen,entry:null,turn:[10,40],mode:'cover',par:main});
        if(br[br.length-1].s-q0.s<8) continue;
        const bH=Math.max(2.6,Hm*0.75);
        for(const q of br){ q.w=bw; q.prof=pr==='keyhole'?'tube':pr; q.H=bH; }
        if(!cv10Floor(br,{y0:q0.y,cov:k.minCover+0.6,exempt:0,target:(i,yp,d)=>yp-0.03*d})) continue;
        ctx.paths.push(br); branches.push(br); break;
      }
    }
  }
  /* 바위틈 — 지붕이 얇은 마디에 빛구멍 2~4 */
  const mouths=[{x:c.x,z:c.z,y:hM-0.2,yaw:c.yaw,w,h:main[0].H,sky:false,r:0,ramp:null}];
  if(talus){
    const cand=main.map((q,i)=>({q,i,cv:cv10Hm(q.x,q.z,1)-(q.y+q.H)})).filter(e=>e.q.s>=8&&e.cv<=6.5).sort((a,b)=>a.cv-b.cv||a.q.s-b.q.s), pick=[];
    for(const e of cand){ if(pick.length>=2+((rnd()*3)|0)) break; if(pick.every(p=>Math.abs(p.q.s-e.q.s)>=9)&&cv10Free(e.q.x,e.q.z,2,4)) pick.push(e); }
    if(pick.length<2) return false;
    for(const e of pick){ const r=Math.min(0.8+rnd()*0.7,e.q.w/2*0.9); mouths.push({x:e.q.x,z:e.q.z,y:e.q.y,yaw:rnd()*6.2832,w:r*2,h:e.q.H,sky:true,r,ramp:null,s:e.q.s}); }
  }
  c.mouths=mouths; c.segs=[]; c.rooms=[];
  c.segs.push({ax:c.x+Math.cos(c.yaw)*4,az:c.z+Math.sin(c.yaw)*4,ay:hM-0.2,bx:c.x,bz:c.z,by:hM-0.2,w,h:main[0].H,prof:pr==='keyhole'?'tube':pr,s0:-4,out:true,pid:0});
  cv10Segs(c,main); for(const br of branches) cv10Segs(c,br);
  for(const q of rooms) c.rooms.push(cv10RoomAt(main,q));
  return true;
}

/* 용암굴 — 비탈 위쪽 채광창(무너진 돌 비탈로 내려간다)에서 내리막을 따라 부드럽게 굽이치는 넓은 반원 관 */
function cv10Lava(ctx){
  const c=ctx.c, rnd=ctx.rnd, k=ctx.K.lava, att=ctx.att, hM=heightAt(c.x,c.z);
  const w=k.w[0]+rnd()*(k.w[1]-k.w[0]), H=k.h[0]+rnd()*(k.h[1]-k.h[0]), len=k.len[0]+rnd()*(k.len[1]-k.len[0]);
  const cover0=att>=3?k.cover[0]:k.cover[0]+rnd()*(k.cover[1]-k.cover[0]), rS=6.5+rnd()*2.5;
  const main=cv10Route(ctx,{x:c.x,z:c.z,hd:c.yaw,s0:0,pid:0,w,len,entry:null,turn:[0,30],mode:'contour',river:true});
  if(main[main.length-1].s<k.len[0]*0.7) return false;
  for(const q of main){ q.w=w; q.prof='lava'; q.H=H; }
  const placed=cv10Rooms(ctx,main,2+((rnd()*2)|0),[w/2+1,w/2+1],[H,H],24,1,[]);
  if(!placed.length) return false;
  const ystar=q=>cv10Hm(q.x,q.z,w/2)-cover0-H;
  if(!cv10Floor(main,{y0:null,y0f:q=>hM-cover0-H,cov:k.minCover+0.6,exempt:rS+2,
      target:(i,yp,d)=>Math.min(yp,Math.max(ystar(main[i]),yp-0.12*d))})) return false;
  const y0=main[0].y, ry=c.yaw+Math.PI, he=heightAt(c.x+Math.cos(ry)*rS,c.z+Math.sin(ry)*rS), kr=(he-y0)/(1.8*rS);
  if(kr>1.2) return false;
  const mouths=[{x:c.x,z:c.z,y:y0,yaw:ry,w:rS*2,h:H,sky:true,r:rS,ramp:ry,he,kr:Math.max(0.5,kr),s:0}];
  if(!cv10Free(c.x,c.z,rS+1,4+rS)) return false;
  ctx.paths.push(main);
  /* 채광창 더 — 1~2 (사람이 못 올라오는 구멍) */
  const nS=1+((rnd()*2)|0), cand=main.filter(q=>q.s>=30&&!q.room);
  for(let i=0;i<nS&&cand.length;i++){ const q=cand[(rnd()*cand.length)|0], r=4+rnd()*2;
    if(mouths.some(m=>Math.hypot(m.x-q.x,m.z-q.z)<22)||!cv10Free(q.x,q.z,r+1,4+r)) continue;
    mouths.push({x:q.x,z:q.z,y:q.y,yaw:rnd()*6.2832,w:r*2,h:H,sky:true,r,ramp:null,s:q.s}); }
  c.mouths=mouths; c.segs=[]; c.rooms=[];
  cv10Segs(c,main);
  for(const q of main) if(q.room) c.rooms.push(cv10RoomAt(main,q));
  return true;
}

/* 바위그늘 — 비탈의 너른 처마(굴길 한 토막을 둥근 끝으로 · 안쪽으로 내려앉는 바닥) · 반은 뒤에 작은 굴길 */
function cv10Shelter(ctx){
  const c=ctx.c, rnd=ctx.rnd, k=ctx.K.shelter, att=ctx.att;
  const W=k.W[0]+rnd()*(k.W[1]-k.W[0]), D=k.D[0]+rnd()*(k.D[1]-k.D[0]), H=k.h[0]+rnd()*(k.h[1]-k.h[0]);
  const ca=Math.cos(c.yaw), sa=Math.sin(c.yaw), cx=c.x-ca*D*0.35, cz=c.z-sa*D*0.35, ax=-sa, az=ca, half=Math.max(1,(W-D)/2);
  const tl=-(0.2+att*0.01), hF=heightAt(c.x+ca*D*0.15,c.z+sa*D*0.15), yc=hF-0.4+tl*D/2;     // 앞 가장자리 바닥이 땅에 닿게
  const A={x:cx-ax*half,z:cz-az*half}, Bp={x:cx+ax*half,z:cz+az*half};
  for(const p of [A,Bp,{x:cx,z:cz},{x:c.x,z:c.z}]) if(!cv10Free(p.x,p.z,D/2+1,4+D/2)) return false;
  c.mouths=[{x:c.x,z:c.z,y:yc,yaw:c.yaw,w:W,h:H,sky:false,r:0,ramp:null}];
  c.segs=[{ax:A.x,az:A.z,ay:yc,bx:Bp.x,bz:Bp.z,by:yc,w:D,h:H,prof:'shelter',s0:0,out:false,pid:0,zone:true,tl,tnx:-ca,tnz:-sa}];
  c.rooms=[{x:cx,z:cz,y:yc,R:D/2,H,open:[],s:0,gx:tl*-ca,gz:tl*-sa}];
  if(rnd()<0.5){                                                                  // 뒤에 작은 굴길
    const bx=cx-ca*(D/2-1), bz=cz-sa*(D/2-1), w=2+rnd()*1.5, len=10+rnd()*15, Hh=2.8+rnd()*0.8;
    const yb=yc+tl*(D/2-1);
    const br=cv10Route(ctx,{x:bx,z:bz,hd:c.yaw+Math.PI,s0:D/2,pid:1,w,len,entry:null,turn:[10,40],mode:'cover'});
    if(br[br.length-1].s-D/2>=8){
      for(const q of br){ q.w=w; q.prof='tube'; q.H=Hh; }
      if(cv10Floor(br,{y0:yb,cov:k.minCover+0.6,exempt:0,target:(i,yp,d)=>yp-0.04*d})){ cv10Segs(c,br); } }
  }
  return true;
}

/* c = {x,z,y,yaw,seed} (주 입구 자리) → 종류를 정하고 굴을 짜 넣는다. 못 짜면 false(그 자리를 버린다) */
function cv10Layout(c){
  const kind=cv10Kind(c.x,c.z); c.kind=kind; c.tv=10;
  const rnd=mulberry32(c.seed>>>0), K=CV10.K[kind];
  c._n=null; const yaw0=c.yaw;
  for(let att=0;att<8;att++){
    c.yaw=yaw0;
    const ctx={c,rnd,kind,K:CV10.K,att,paths:[]};
    c.mouths=[]; c.segs=[]; c.rooms=[];
    let ok;
    try{ ok=kind==='lava'?cv10Lava(ctx):kind==='shelter'?cv10Shelter(ctx):cv10Tunnel(ctx,kind==='talus'); }catch(e){ ok=false; CV10.err=e; }
    if(!ok) continue;
    const m0=c.mouths[0];
    c.x=m0.x; c.z=m0.z; c.y=m0.y; c.yaw=m0.yaw;
    if(kind==='shelter'){ c.y=m0.y; }
    cv10Finish(c);
    const st=cv10Stats(c,1,true);
    if(st.cells>150&&st.thin===0&&st.minCover>=K.minCover+0.1&&st.maxSlope<=0.30&&(kind!=='shelter'||st.open<=st.cells*0.8)&&cv10Reach(c).reach===c.rooms.length) return true;
  }
  return false;
}

/* 굴 광석 — 놓은 자리가 그 방의 빈 데 안(g≥2.0 · u≤0.75)이 아니면 방 가운데 쪽으로 0.5 m 씩 당긴다(난수 없이). p.top = 굴 바닥 높이 */
const cv10OreNeed=(a,b)=>((PROP_FOOT[a.k]||1)*a.s+(PROP_FOOT[b.k]||1)*b.s)*0.75;
const cv10OreOk=(c,x,z)=>{ const o=cv10Field(c,x,z); return o.g>=2.0&&o.u<=0.75&&!o.open; };
/* p 를 방 rm 안 빈 데에서 다른 광석(others)과 가장 덜 겹치는 자리로 — 방 가운데에서 0.5 m 간격 고리(방 밖 10 m 까지 — 굴길 바닥도 후보)에 16~24 방위 후보 · 난수 없음.
   avoid={x,z,r} 이면 그 원 안은 뺀다(수직굴). 같은 점수면 지금 자리에 가까운 쪽. 후보가 하나도 없으면 null */
function cv10OreSpot(c,rm,p,others,avoid){
  let best=null,bs=-1e9;
  const sc=(x,z)=>{ let m=1e9; for(const q of others){ if(q===p) continue; const d=Math.hypot(q.x-x,q.z-z)-cv10OreNeed(p,q); if(d<m) m=d; } return Math.min(m,0.5); };
  for(let r=0;r<=rm.R+10;r+=0.5) for(let k=0;k<(r===0?1:r<=rm.R?16:24);k++){ const a=k*(r<=rm.R?0.3927:0.2618), x=rm.x+Math.cos(a)*r, z=rm.z+Math.sin(a)*r;
    if(avoid&&Math.hypot(x-avoid.x,z-avoid.z)<avoid.r) continue;
    if(!cv10OreOk(c,x,z)) continue;
    const v=sc(x,z)-Math.hypot(x-p.x,z-p.z)*0.01; if(v>bs){ bs=v; best=[x,z]; } }
  return best;
}
function cv10OreFix(){
  const rooms=[]; for(const c of CAVES) if(c.tv===10) for(const r of c.rooms) rooms.push(r);
  if(!rooms.length) return;
  const by=new Map();
  for(const p of PROPS){ if(!p.cave) continue;
    let b=null,bd=1e18; for(const r of rooms){ const d=(r.x-p.x)*(r.x-p.x)+(r.z-p.z)*(r.z-p.z); if(d<bd){ bd=d; b=r; } }
    if(!b) continue; const c=b.cave;
    for(let t=0;t<80&&!cv10OreOk(c,p.x,p.z);t++){ const dx=b.x-p.x, dz=b.z-p.z, d=Math.hypot(dx,dz); if(d<0.5){ p.x=b.x; p.z=b.z; break; } p.x+=dx/d*0.5; p.z+=dz/d*0.5; }
    let L=by.get(b); if(!L) by.set(b,L=[]); L.push(p); }
  for(const [rm,L] of by){ const c=rm.cave;                                       // 겹친 광석은 방 안 빈 데에서 덜 겹치는 자리로(난수 없이 · 여섯 번까지)
    for(let pass=0;pass<6;pass++){ let moved=false;
      for(const p of L){ let m=1e9; for(const q of L) if(q!==p){ const d=Math.hypot(q.x-p.x,q.z-p.z)-cv10OreNeed(p,q); if(d<m) m=d; }
        if(m>=0) continue; const at=cv10OreSpot(c,rm,p,L,null); if(!at) continue; p.x=at[0]; p.z=at[1]; moved=true; }
      if(!moved) break; } }
  for(const p of PROPS){ if(!p.cave) continue; let b=null,bd=1e18; for(const r of rooms){ const d=(r.x-p.x)*(r.x-p.x)+(r.z-p.z)*(r.z-p.z); if(d<bd){ bd=d; b=r; } }
    if(!b) continue; const o=cv10Field(b.cave,p.x,p.z); p.top=o.f; p.y=p.top; }
}
/* 놓은 직후 검사 — 굴 광석 수 · 바닥 높이(p.top)·빈 데(g≥2.0)·가로 자리(u≤0.75)가 어긋난 수. 땅속 세계(96-underworld.js underSites)가 나중에 몇 개를 옮긴다 */
function cv10OreCheck(){
  const rooms=[]; for(const c of CAVES) if(c.tv===10) for(const r of c.rooms) rooms.push(r);
  const R={n:0,bad:0};
  for(const p of PROPS){ if(!p.cave) continue; let b=null,bd=1e18; for(const r of rooms){ const d=(r.x-p.x)*(r.x-p.x)+(r.z-p.z)*(r.z-p.z); if(d<bd){ bd=d; b=r; } }
    if(!b) continue; const o=cv10Field(b.cave,p.x,p.z); R.n++; if(!(Math.abs(p.top-o.f)<0.05&&o.g>=2.0&&o.u<=0.75)) R.bad++; }
  return R;
}
