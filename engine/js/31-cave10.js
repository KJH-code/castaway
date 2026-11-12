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
function cv10Hm(x,z,r){ let m=cv10Sfc(x,z); for(let k=0;k<8;k++){ const a=k*0.7853982, v=cv10Sfc(x+Math.cos(a)*r,z+Math.sin(a)*r); if(v<m) m=v; } return m; }
/* 굴을 낼 수 있는 자리인가 — 섬 안 · 바다 위 아님(땅 높이 1 m 위) · (rv>0 이면) 둘레 rv m 에 강 칸 없음 */
/* 굴이 딛는 겉 높이 — 땅과 큰 지형 모형(37-geo-meshes.js — 매끈한 땅 섬의 산 · 벼랑 · 시스택) 윗면 가운데 높은 것. 모형 밑의 땅은 1~2 m 아래 묻혀 있어,
   땅 높이로 굴을 지으면 입구가 모형 속에 묻혔다(화강암 비탈은 거의 다 모형 밑 — 바위틈 굴이 0 개가 됐다). 굴의 꼴 · 덮개 · 열림 · 입구 높이 · 껍데기 윗면이 다 이걸 읽는다.
   모형 쪽은 굴 자리 그림의 구멍(cv10Hole)을 모형 재질도 읽어 입구를 연다(geoMat) · 묻힌 땅이 빈 데 안에 들면 그 칸도 구멍(A 192~254) */
function cv10Sfc(x,z){ const h=heightAt(x,z); if(typeof GEO_LF==='undefined'||!GEO_LF.list.length) return h; const g=cv10GeoTop(x,z); return g>h?g:h; }
/* 큰 지형 모형만의 윗면(geoFloor 에서 바위 조각 GEO_DT 를 뺀 것) — 바위 조각은 굴 자리를 고른 뒤(geoBuild)에 놓여, 굴을 짤 때와 지을 때 겉이 달라졌다(입구 앞에 9 m 바위 날) */
function cv10GeoTop(x,z){
  let best=-1e9; for(const L of GEO_LF.list){ if(L.hw===undefined){ const W=GEO_MESH_DATA[L.name].w; L.hw=Math.max(W[0],W[2])*L.S*0.75; L.cy=Math.cos(L.yaw); L.sy=Math.sin(L.yaw); }
    const wx=x-L.x, wz=z-L.z; if(wx*wx+wz*wz>L.hw*L.hw) continue;
    const t=geoTopAt(geoTop(L.name),(wx*L.cy-wz*L.sy)/L.S,(wx*L.sy+wz*L.cy)/L.S,false); if(t<0) continue; const y=L.y+t*L.S; if(y>best) best=y; }
  return best;
}
/* 바위 조각(37-geo-meshes.js geoDetailBuild)이 판 10 굴 상자(+조각 반지름 · 4 m)에 걸치나 — 걸치면 안 놓는다(굴 천장으로 박히거나 입구를 덮지 않게) */
function cv10DetailBlocked(x,z,r){
  if((P.tv|0)<10||typeof CAVES==='undefined') return false;
  for(const c of CAVES){ if(c.tv!==10||c.off||!c.box) continue; const b=c.box, m=r+4; if(x>b.x0-m&&x<b.x1+m&&z>b.z0-m&&z<b.z1+m) return true; }
  return false;
}
/* 지어 둔 굴의 상자 안이면 cv10Sfc, 밖이면 heightAt — 눈 · 몸이 바위 속인지 볼 때(80-player.js eyeHit · solidAt). 큰 지형 모형 밑 굴은 땅이 2 m 묻혀 있어 땅 높이로는 벽을 못 잡았다 */
function cv10BoxSfc(x,z){ for(const c of CV10.built.keys()){ const b=c.box; if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&!c.off) return cv10Sfc(x,z); } return heightAt(x,z); }
/* 지금 섬이 판 10 인가 — 지역 이름 P 가 섬 인자를 가리는 함수(90-init.js precompPlan 의 P=PRECOMP) 안에서 쓴다(smOn 과 같은 까닭) */
function cv10On(){ return (P.tv|0)>=10; }
/* 판 10 굴 고침 묶음(2026-11-10 review B) — 판 10(시험 섬)과 12 부터. 판 11 섬은 옛 저장이 같은 섬을 열도록 예전 그대로 */
function cv10V2(){ const t=P.tv|0; return t===10||t>=12; }
/* 판 15 — 굴 꼴을 실제처럼 울퉁불퉁하게(cv10Eval · 껍데기 다듬기 한 쌍). 판 14 이하 굴은 한 비트도 안 바뀐다 — cv10Prep 이 이 값을 굴 표(P.v15)로 받는다(그 안의 지역 이름 P 가 섬 인자를 가린다) */
function cv10V15(){ return (P.tv|0)>=15; }
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
/* 판 15 — 종류마다 꼴의 진폭(메인이 사진을 보고 고르는 손잡이 한 곳). 값이 0 이면 그 몫은 판 14 와 같은 값이다(그 갈래를 아예 안 탄다).
   원칙: 파장 2 m 넘는 굴곡만 꼴에 넣는다(더 잔 것은 껍데기 다듬기가 지운다 — 판 15 는 Taubin 한 쌍). 걷기 · 하늘 구멍 안전 제약은 cv10Eval 끝(cv10R15)에 */
CV10.R={
  karst:  {wall:0.08, ped:0.45, step:0.35, slab:0.5},  // 벽 u 잡음(비율 · 2.5 m — 설계 ±0.14~0.18 은 갇힌 틈(rec.unreach 28)과 지느러미(이웃 면 60° 넘는 몫 ×3.5)가 서서 ½ · 0.10 부터 갇힌 틈이 난다 · 바닥 쪽과 천장 쪽이 다른 높이를 읽는다) · 천장 펜던트(m · g>3 m 인 데만) · 켜 따른 천장 붕락 계단(±m · 3 m 칸) · 방 · 넓은 길 벽 쪽(u>0.5) 판상 덩이(최대 두께 m · 보로노이 2.2 m · 윗면 ±8°)
  lava:   {wall:0.06, shelf:1, step:0.6, fall:0.5},    // 벽 u 잡음(4 m — 용암관은 매끈) · 선반 1~2 개 더(1 이면 u 0.80~0.88 · 0.08~0.15H) · 붕락 구간(n(s/18)>0.35)만 천장 계단(최대 m) · 채광창 밑 붕락 덩이(최대 m)
  talus:  {wall:0.35, ceil:0, floor:0.25},             // 보로노이 두 겹(1.4 · 3.2 m — 씨 P.vs+16 · P.vs+32 · cv10H) 벽 평면(±m · 덩이 면 평평) · 천장(±m — 설계 ±0.8 은 입구 하늘 틈을 판 14 의 2559 → 2728 px 로 늘려 0 · 0 이면 2400) · 바닥 u>0.55(±m)
  shelter:{back:0.06, lay:1, slab:0.3},                // 뒷벽(±D 비율 · 3 m — 설계 ±0.12 는 지느러미 ×1.7 이라 ½) · 켜 두께를 켜마다 0.6~1.6 m(1 이면 그대로 · 0 이면 굴마다 하나) · 낙반 판(최대 m · 0.1~0.3)
  mouth:  {ceil:0.5, brow:0}                           // 입구 마당 천장을 각지게(±m · 보로노이 1.2 m) · 이마 두께 browT(±m — 설계 ±0.4 는 석회암 입구 하늘 틈을 판 14 의 4112 → 4252 px 로 늘려 0 · 0 이면 3959)
};
/* 판 15 — 굴 잡음(c._n)을 높이로 비튼 3차원 잡음(칸 1 · 대략 −1~1 로 자름) — 벽의 바닥 쪽과 천장 쪽이 다른 높이를 읽어 다른 굴곡이 되고(한 잡음이면 벽이 세로 기둥 꼴),
   둘이 만나는 데(벽 가운데 높이)에서는 같은 높이를 읽어 이어진다 */
const cv10N3=(n,x,y,z)=>{ const v=0.5*(n(x+0.6*y+3.1,z-0.45*y+5.3)+n(z-0.55*y+7.7,x+0.5*y+1.9))/0.35; return v<-1?-1:v>1?1:v; };
const cv10N2=(n,x,z)=>{ const v=n(x,z)/0.5; return v<-1?-1:v>1?1:v; };
/* 판 15 — 보로노이 칸 값(칸 크기 1 · 판 14 바위틈 천장과 같은 cv10H 꼴 — 자리 씨 sd · sd+1, 값 sd+2 · sd+3). 칸 안은 평평하고 경계 e(칸 단위) 폭에서 이웃 칸 값으로 매끈하게 넘어간다.
   돌려주는 것은 공유 객체 — v(−1~1) · w(0~1) */
const _cv10Vo={v:0,w:0};
function cv10Vor(X,Z,sd,e){
  const ix=Math.floor(X), iz=Math.floor(Z); let d1=1e9,d2=1e9,a1=0,a2=0,b1=0,b2=0;
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const i=ix+dx, j=iz+dz, px=i+0.15+0.7*cv10H(i,j,sd), pz=j+0.15+0.7*cv10H(i,j,sd+1), d=(X-px)*(X-px)+(Z-pz)*(Z-pz);
    if(d<d1){ d2=d1; a2=a1; b2=b1; d1=d; a1=cv10H(i,j,sd+2); b1=cv10H(i,j,sd+3); } else if(d<d2){ d2=d; a2=cv10H(i,j,sd+2); b2=cv10H(i,j,sd+3); } }
  const t=0.5+0.5*smoothstep(0,e,Math.sqrt(d2)-Math.sqrt(d1));
  _cv10Vo.v=(a2+(a1-a2)*t)*2-1; _cv10Vo.w=b2+(b1-b2)*t; return _cv10Vo;
}
/* 판 15 — 판상 덩이(보로노이 칸 하나에 판 하나 · 몫 fr 만큼의 칸에 · 두께 t0~t1 m · 윗면 ±8° 기울기) — 칸 크기 cs(m) · 경계 0.25 칸에서 이웃 판으로 매끈하게 */
function cv10Slab(x,z,cs,sd,fr,t0,t1){
  const X=x/cs, Z=z/cs, ix=Math.floor(X), iz=Math.floor(Z); let d1=1e9,d2=1e9,h1=0,h2=0;
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const i=ix+dx, j=iz+dz, px=i+0.15+0.7*cv10H(i,j,sd), pz=j+0.15+0.7*cv10H(i,j,sd+1), d=(X-px)*(X-px)+(Z-pz)*(Z-pz);
    if(d>=d2) continue;
    let hv=0; if(cv10H(i,j,sd+2)<fr){ const a=cv10H(i,j,sd+4)*6.2832; hv=t0+(t1-t0)*cv10H(i,j,sd+3)+0.14*(2*cv10H(i,j,sd+5)-1)*((X-px)*Math.cos(a)+(Z-pz)*Math.sin(a))*cs; if(hv<0) hv=0; }
    if(d<d1){ d2=d1; h2=h1; d1=d; h1=hv; } else { d2=d; h2=hv; } }
  return h2+(h1-h2)*(0.5+0.5*smoothstep(0,0.25,Math.sqrt(d2)-Math.sqrt(d1)));
}
function cv10Prep(c){
  const P={G:[],R:[],S:[]}, byPid=new Map();
  /* 판 15 — 이 굴의 꼴 진폭(ra: 받아들이기 늦은 시도(att≥4)는 ½ — cv10Layout) · aw 벽 비율 · wl 벽 잡음 칸(1/m) · tw 바위틈 벽 평면(m) */
  P.v15=cv10V15(); P.aw=0; P.tw=0; P.wl=1;
  if(P.v15){ const R=CV10.R[c.kind]||{}, ra=c._ra||1; P.ra=ra; P.rk=R; P.rm=CV10.R.mouth||{};
    if(c.kind==='karst'){ P.aw=(R.wall||0)*ra; P.wl=1/2.5; }
    else if(c.kind==='lava'){ P.aw=(R.wall||0)*ra; P.wl=1/4;
      P.ls=[]; const ns=1+(cv10H(c.seed|0,7,0x15b1)<0.5?1:0);                 // 선반 더 — 1~2 개(굴마다 · 정수 해시)
      for(let k=0;k<ns;k++) P.ls.push({u:0.80+0.08*cv10H(c.seed|0,k,0x15b2),h:0.08+0.07*cv10H(c.seed|0,k,0x15b3),o:37.1*k+11.3+5*cv10H(c.seed|0,k,0x15b4)}); }
    else if(c.kind==='shelter'){ P.aw=2*(R.back||0)*ra; P.wl=1/3;               // 뒷벽 ±0.12D = 반너비(D/2)의 ±24%
      const rm=c.rooms[0]; if(rm){ P.shx=rm.x; P.shz=rm.z; P.shD=2*rm.R; } else { P.shx=c.x; P.shz=c.z; P.shD=8; }
      P.bkx=-Math.cos(c.yaw); P.bkz=-Math.sin(c.yaw); }                          // 뒤쪽(입구가 보는 쪽의 반대)
    else if(c.kind==='talus'){ P.tw=(R.wall||0)*ra; P.tvor=(R.wall||0)>0||(R.ceil||0)>0||(R.floor||0)>0; }
  }
  const ew=P.aw*0.66, et=P.tw;                                                    // 판 15 — 벽이 밀려 나가는 만큼 미리 거르는 상자를 넓힌다(판 14 이하는 0)
  for(const g of c.segs){
    const dx=g.bx-g.ax, dz=g.bz-g.az, len=Math.hypot(dx,dz)||1e-6, pq=CV10.PQ[g.prof]||CV10.PQ.tube, m=(ew||et)?g.w*(0.66+ew)+0.6+et:g.w*0.66+0.6;
    const e={ax:g.ax,az:g.az,ux:dx/len,uz:dz/len,len,p:pq[0],q:pq[1],w:g.w,H:g.h,ay:g.ay,by:g.by,s0:g.s0,out:!!g.out,lava:g.prof==='lava',
      pit:g.pit||0,tl:g.tl||0,tnx:g.tnx||0,tnz:g.tnz||0,
      x0:Math.min(g.ax,g.bx)-m,x1:Math.max(g.ax,g.bx)+m,z0:Math.min(g.az,g.bz)-m,z1:Math.max(g.az,g.bz)+m};
    const pid=g.pid|0; let G=byPid.get(pid); if(!G){ G={segs:[],x0:1e9,x1:-1e9,z0:1e9,z1:-1e9}; byPid.set(pid,G); P.G.push(G); }
    G.segs.push(e); G.x0=Math.min(G.x0,e.x0); G.x1=Math.max(G.x1,e.x1); G.z0=Math.min(G.z0,e.z0); G.z1=Math.max(G.z1,e.z1);
  }
  for(const r of c.rooms){ const m=(ew||et)?r.R*1.3*(1+P.aw)+0.5+et:r.R*1.3+0.5; P.R.push({r,x0:r.x-m,x1:r.x+m,z0:r.z-m,z1:r.z+m}); }
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
/* 판 15 — 뒷벽 무게(바위그늘 — 방 가운데에서 뒤쪽으로 0.05D~0.4D 에 걸쳐 0→1) */
const cv10Back=(P,x,z)=>smoothstep(0.05*P.shD,0.4*P.shD,(x-P.shx)*P.bkx+(z-P.shz)*P.bkz);
/* 판 15 — 벽 비율 s(u 를 s 로 나눈다 — s>1 이면 벽이 밖으로). y 는 그 기둥의 벽 쪽 높이(바닥 쪽이면 바닥 곡선 · 천장 쪽이면 천장 곡선) · t 높이 자리(0 바닥 가운데 · 0.5 벽 가운데 · 1 천장 가운데) ·
   half 그 자리 반너비(m) · gw 들머리(s 4→10 m) · 뒷벽 무게. 바위틈은 덩이 면(보로노이 두 겹 — 아래 덩이 tL · 위 덩이 tU 가 벽 가운데 높이 둘레에서 평균으로 이어진다) */
function cv10WallS(c,P,x,y,z,t,half,gw,tL,tU){
  let s;
  if(P.tw>0){ const vM=0.5*(tL+tU), v=t<0.5?tL+(vM-tL)*smoothstep(0.25,0.5,t):tU+(vM-tU)*smoothstep(0.75,0.5,t); s=1+P.tw*gw*v/half; }
  else s=1+P.aw*gw*cv10N3(c._n,x*P.wl,y*P.wl,z*P.wl);
  return s<0.72?0.72:s>1.3?1.3:s;                                     // 0.72~1.3 — 좁은 바위틈이 덩이에 막히지 않게 · 벽이 u 0.7 밖에 서게(cv10Eval 의 kb)
}
/* 한 점의 굴 — {f 바닥, c 천장, g=c−f(빈 데가 아니면 ≤0), s 주 입구로부터 길 거리, open 위가 하늘인가(그때 c=h+6), u 가로 자리(0 가운데 ~ 1 벽),
   h 땅 높이, fb 단 · 선반을 뺀 바닥(비탈을 잴 때), rp 무너진 돌 비탈 위인가}.
   판 15(P.v15)는 벽 · 천장 · 바닥에 굴곡을 더한다(CV10.R) — 판 14 이하는 그 갈래를 하나도 안 타 값이 그대로다(uF=uC=u · um=1) */
function cv10Eval(c,P,x,z){
  const n=c._n; let F_=0,C_=0,Fb=0,cnt=0,bg=-1e9,S=0,U=1,Yn=c.y,ub=1e9,inSky=false,rp=false;
  const V15=P.v15, aw=P.aw, tw=P.tw; let Wd=0, sk=0, tL=0, tU=0;                // 판 15 — Wd 그 자리 굴길 너비(방은 지름) · sk 채광창 밑 무게 · tL/tU 바위틈 덩이 값(아래 · 위)
  let wS=1;                                                            // 판 15 — 빛구멍 · 채광창 둘레(rd 1.2→2.0)는 굴곡을 끈다(구멍 테 밑 껍데기가 내려앉아 하늘 틈이 늘었다 — 바위틈)
  if(V15) for(let si=0;si<P.S.length;si++){ const m=P.S[si].m, rd=Math.hypot(x-m.x,z-m.z)/m.r; if(rd<2){ const k=smoothstep(1.2,2.0,rd); if(k<wS) wS=k; } }
  if(V15&&P.tvor){ const A=cv10Vor(x/1.4,z/1.4,P.vs+16,0.3), a1=A.v, a2=A.w*2-1, B=cv10Vor(x/3.2,z/3.2,P.vs+32,0.3).v; tL=0.6*a1+0.4*B; tU=0.6*a2+0.4*B; }
  for(let gi=0;gi<P.G.length;gi++){
    const G=P.G[gi]; if(x<G.x0||x>G.x1||z<G.z0||z>G.z1) continue;
    let bu=1e9,be=null,ba=0,bqx=0,bqz=0,nc=0,bwn=0;
    for(let si=0;si<G.segs.length;si++){
      const e=G.segs[si]; if(x<e.x0||x>e.x1||z<e.z0||z>e.z1) continue;
      const px=x-e.ax, pz=z-e.az; let a=px*e.ux+pz*e.uz; a=a<0?0:a>e.len?e.len:a;
      const qx=px-e.ux*a, qz=pz-e.uz*a, s=e.s0+a;
      let wN=e.w*(1+0.2*n(s/7+11.3,1.7)+0.1*n(s/2.3+4.9,8.3)); if(wN<e.w*0.55) wN=e.w*0.55;
      const u=Math.sqrt(qx*qx+qz*qz)/(wN*0.5);
      if(u<bu){ bu=u; be=e; ba=a; bqx=qx; bqz=qz; bwn=wN; }
      if(nc<12){ _cvE[nc]=e; _cvA[nc]=a; _cvU[nc]=u; nc++; }
    }
    if(!be) continue;
    const e=be;
    /* 바닥 가운데 높이 yc · 높이 H — 꺾이는 길의 안쪽에서 두 토막이 서로 다른 값을 내므로, 가장 가까운 토막과 u 가 0.15 안에 드는 토막을 거리에 따라 섞는다(안 그러면 이음매에서 바닥이 툭 뛴다) */
    let sw=0,syc=0,sH=0;
    for(let k=0;k<nc;k++){ const wk=1-(_cvU[k]-bu)/0.15; if(wk<=0) continue; const ek=_cvE[k], ak=_cvA[k];
      const y=ek.out?cv10Sfc(ek.ax+ek.ux*ak,ek.az+ek.uz*ak)-0.2:ek.ay+(ek.by-ek.ay)*(ak/ek.len);
      sw+=wk; syc+=wk*y; sH+=wk*ek.H; }
    let yc=syc/sw;
    const um=aw>0?1+aw:tw>0?Math.min(1.3,1+tw/(0.5*bwn)):1;                          // 판 15 — 벽이 밀려 나갈 수 있는 데까지 본다(판 14 이하 1)
    if(bu>=um){ if(bu<ub){ ub=bu; Yn=yc; } continue; }
    if(e.tl) yc+=e.tl*(bqx*e.tnx+bqz*e.tnz);
    const H=sH/sw; let uF=bu, uC=bu, uE=bu;
    if(um>1){                                                            // 판 15 — 벽 굴곡: 바닥 쪽은 uF · 천장 쪽은 uC 로(다른 높이의 잡음)
      const gw=(P.shx!==undefined?cv10Back(P,x,z):smoothstep(4,10,e.s0+ba))*wS;
      if(gw>0){ const hw=0.5*bwn, kb=smoothstep(0.3,0.7,bu), sM=cv10WallS(c,P,x,yc+0.5*H,z,0.5,hw,gw,tL,tU), uM=bu*(1+(1/sM-1)*kb), u1=uM<1?uM:1;   // 벽 높이는 벽 가운데 높이의 비율로 민 u 에서 — 벽 끝(u1→1)에서 바닥 쪽 · 천장 쪽이 같은 높이를 읽어 이어진다
        /* 잡음을 읽는 높이는 u 를 따라 천천히 바뀌는 0.5·u²(바닥 쪽) · 1−0.5·u²(천장 쪽) — 실제 단면 곡선(벽 끝에서 √ 로 가파르다)을 읽으면 u 를 따라 s 가 너무 빨리 바뀌어
           벽이 앞뒤로 접혀 지느러미 · 갇힌 틈이 섰다. 벽 끝 둘레(높이 차 0.03~0.15)는 둘이 sM 으로 모여 한 자리에서 닫힌다 */
        const tF=0.5*u1*u1, tC=1-tF, qF=smoothstep(0.03,0.15,0.5-tF), qC=qF;
        const sF=qF>0?sM+(cv10WallS(c,P,x,yc+H*tF,z,tF,hw,gw,tL,tU)-sM)*qF:sM, sC=qC>0?sM+(cv10WallS(c,P,x,yc+H*tC,z,tC,hw,gw,tL,tU)-sM)*qC:sM;
        uF=bu*(1+(1/sF-1)*kb); uC=bu*(1+(1/sC-1)*kb); uE=uF>uC?uF:uC; if(uE>1) uE=1; }   // u 0.3 안(가운데 길 바닥)은 그대로 · 0.7 밖은 u/s — 벽은 u=s 에 선다 · 가로 자리는 벽에 더 가까운 쪽(바닥 비탈 문 · 광석 u≤0.75 · 켜 무게)   // 가로 자리는 벽에 더 가까운 쪽(바닥 비탈 문 · 광석 u≤0.75 · 켜 무게가 벽 쪽 굴곡을 넉넉히 피한다)
      if(uF>=1&&uC>=1){ if(bu<ub){ ub=bu; Yn=yc; } continue; }
    }
    const u=uE, uf=uF<1?uF:1, uc=uC<1?uC:1, fl=0.5*(1-Math.sqrt(1-cv10Pow(uf,e.p))), ce=0.5+0.5*Math.sqrt(1-cv10Pow(uc,e.q)), w1=1-uf, w1c=1-uc;
    let fb=yc+H*fl+w1*0.08*n(x/2+3.3,z/2+7.1), ff=fb, cc=yc+H*ce;
    if(e.pit) ff-=e.pit*(1-smoothstep(0.3,0.38,uf))*smoothstep(12,16,e.s0+ba);   // 열쇠 구멍 홈 — s 12~16 m 에 걸쳐 깊어진다(곧장 1.2~1.8 m 로 꺼지면 들어갈 수는 있어도 되돌아 오르지 못했다)
    if(e.lava) ff+=0.18*H*smoothstep(0.70,0.74,uf)*(1-smoothstep(0.86,1,uf));
    if(V15&&e.lava&&P.ls){ const sp=e.s0+ba, gs=smoothstep(4,10,sp)*(P.rk.shelf||0)*P.ra;   // 판 15 — 용암 선반 1~2 개 더(u 0.80~0.88 · 0.08~0.15H · 길을 따라 나타났다 사라진다)
      if(gs>0) for(const L of P.ls) ff+=gs*L.h*H*smoothstep(L.u-0.015,L.u+0.015,uf)*(1-smoothstep(0.93,1,uf))*smoothstep(-0.1,0.15,n(sp/15+L.o,L.o*1.7)); }
    cc+=w1c*(H*0.08*n(x/3+1.9,z/3+5.5)+0.15*n(x/1.1+9.1,z/1.1+4.4));
    const g=cc-ff;
    if(cnt===0){ F_=ff; C_=cc; Fb=fb; } else { F_=cv10Smin(F_,ff,0.8); C_=cv10Smax(C_,cc,0.8); Fb=cv10Smin(Fb,fb,0.8); }
    cnt++; if(g>bg){ bg=g; S=e.s0+ba; U=u; Wd=e.w; }
  }
  for(let ri=0;ri<P.R.length;ri++){
    const B_=P.R[ri]; if(x<B_.x0||x>B_.x1||z<B_.z0||z>B_.z1) continue;
    const r=B_.r, dx=x-r.x, dz=z-r.z, rr=Math.sqrt(dx*dx+dz*dz), ca=rr>1e-6?dx/rr:1, sa=rr>1e-6?dz/rr:0;
    const nb=1+0.15*n(ca*0.5+r.x*0.013+5.5,sa*0.5+r.z*0.013+2.2)+0.07*n(ca*1.4+r.z*0.011+7.7,sa*1.4+r.x*0.017+3.1);
    const u0=rr/(r.R*nb), umR=aw>0?1+aw:tw>0?Math.min(1.3,1+tw/(r.R*nb)):1; if(u0>=umR) continue;
    let uF=u0, uC=u0, uE=u0;
    if(umR>1){                                                           // 판 15 — 방 벽도 굴길과 같은 굴곡
      const gw=(P.shx!==undefined?cv10Back(P,x,z):smoothstep(4,10,r.s))*wS;
      if(gw>0){ const hw=r.R*nb, kb=smoothstep(0.3,0.7,u0), sM=cv10WallS(c,P,x,r.y+0.5*r.H,z,0.5,hw,gw,tL,tU), uM=u0*(1+(1/sM-1)*kb), u1=uM<1?uM:1, tF=0.5*u1*u1, tC=1-tF;
        const qF=smoothstep(0.03,0.15,0.5-tF), qC=qF;
        const sF=qF>0?sM+(cv10WallS(c,P,x,r.y+r.H*tF,z,tF,hw,gw,tL,tU)-sM)*qF:sM, sC=qC>0?sM+(cv10WallS(c,P,x,r.y+r.H*tC,z,tC,hw,gw,tL,tU)-sM)*qC:sM;
        uF=u0*(1+(1/sF-1)*kb); uC=u0*(1+(1/sC-1)*kb); uE=uF>uC?uF:uC; if(uE>1) uE=1; }
      if(uF>=1&&uC>=1) continue;
    }
    const u=uE, uf=uF<1?uF:1, uc=uC<1?uC:1;
    const w1=1-uf, w1c=1-uc, rub=Math.max(0,n(x/1.8+6.6,z/1.8+1.4)), pl=(r.gx||0)*dx+(r.gz||0)*dz;     // pl: 굴길 바닥의 비탈을 따라 방 전체를 기울인다(안 그러면 방 바닥이 비탈진 굴길 바닥보다 낮아 가장자리에서 툭 꺼진다)
    const Hf=Math.min(r.H,0.55*r.R);                                 // 바닥이 벽 쪽으로 오르는 높이는 방 크기에 맞춰 낮추고(비탈 한도) 나머지는 벽 바로 앞에서 오른다 — 벽에서 천장과 만나는 것은 그대로
    const fb=r.y+pl+Hf*0.5*(1-Math.sqrt(1-uf*uf*uf))+0.5*(r.H-Hf)*smoothstep(0.75,1,uf)+w1*(0.1*rub*rub+0.07*n(x/2+3.3,z/2+7.1));
    const cc=r.y+pl+r.H*(0.5+0.5*Math.sqrt(1-cv10Pow(uc,1.5)))+w1c*(r.H*0.08*n(x/3+1.9,z/3+5.5)+0.15*n(x/1.1+9.1,z/1.1+4.4));
    const g=cc-fb;
    if(cnt===0){ F_=fb; C_=cc; Fb=fb; } else { F_=cv10Smin(F_,fb,0.8); C_=cv10Smax(C_,cc,0.8); Fb=cv10Smin(Fb,fb,0.8); }
    cnt++; if(g>bg){ bg=g; S=r.s; U=u; Wd=2*r.R; }
  }
  const Us=U;                                                         // 판 15 — 채광창이 U 를 덮어쓰기 전 굴길 · 방의 가로 자리(바닥 덧붙임 제약)
  for(let si=0;si<P.S.length;si++){                                   // 천장 구멍(채광창 · 빛구멍) — 가운데에서 r(1+0.25n) 안은 하늘까지 열린 데
    const B_=P.S[si]; if(x<B_.x0||x>B_.x1||z<B_.z0||z>B_.z1) continue;
    const m=B_.m, dx=x-m.x, dz=z-m.z, rr=Math.sqrt(dx*dx+dz*dz), ca=rr>1e-6?dx/rr:1, sa=rr>1e-6?dz/rr:0;
    const rN=m.r*(1+0.25*n(ca*0.6+m.x*0.019+1.3,sa*0.6+m.z*0.023+8.8)), rd=rr/rN; if(rd>=1) continue;
    inSky=true; const hadC=cnt>0;
    if(V15&&(m.s||0)>0){ const wk=1-smoothstep(0.55,0.9,rd); if(wk>sk) sk=wk; }   // 판 15 — 주 입구가 아닌 채광창 밑(붕락 덩이)
    /* 구멍 밑 바닥 — 큰 구멍(채광창)은 가장자리 안쪽에서 평평한 구멍 바닥(m.y)으로 바뀌고, 가장자리에서 굴길 바닥과 매끈하게 이어진다. 가운데 둘레는 무너진 돌로 조금 둔덕 */
    const rise=Math.min(0.4,0.05*m.r), bump=rise*smoothstep(0.3,0.6,rd)*(1-smoothstep(0.6,1,rd));
    if(cnt===0){ F_=m.y+bump; C_=F_+1; Fb=F_; }
    else{ const mw=(1-smoothstep(0.5,1,rd))*smoothstep(1.5,3,m.r); F_=F_+(m.y-F_)*mw+bump; Fb=Fb+(m.y-Fb)*mw+bump; }
    cnt++; if(rd<U||bg<0){ U=rd; S=m.s||0; bg=Math.max(bg,1); }
    if(m.ramp!==null&&m.ramp!==undefined){                           // 무너진 돌 비탈 — 굴길이 이미 있는 데(hadC)서는 구멍 가장자리 쪽으로 굴길 바닥에 녹아든다(안 그러면 가장자리에서 바닥이 1 m 넘게 툭 뛰었다 — B 검수) — 구멍 가장자리(땅)에서 안쪽으로 내려간다
      const ca2=Math.cos(m.ramp), sa2=Math.sin(m.ramp), a=dx*ca2+dz*sa2, l=-dx*sa2+dz*ca2;
      let ry=m.he-m.kr*Math.max(0,m.r-a)-5*smoothstep(0.55,1,Math.abs(l)/m.r);
      { const tt=smoothstep(0.3*m.r,m.r,a)*(1-smoothstep(0.55,1,Math.abs(l)/m.r)); if(tt>0){ const hh=cv10Sfc(x,z)-0.06; if(ry<hh) ry+=(hh-ry)*tt; } }   // 땅 쪽 가장자리는 그 자리 땅에 이어 붙는다(구멍 반지름이 he 를 잰 데보다 멀면 비탈 끝이 땅 밑에 남아 1 m 넘는 턱이 섰다)
      if(ry>F_){ const wr=hadC?1-smoothstep(0.55,1,rd):1; F_+=(ry-F_)*wr; Fb=F_; rp=true; }
    }
  }
  if(cnt===0) return _cv10None(Yn);
  if(P.layer){                                                        // 켜 — 천장을 켜 선반 쪽으로 70% 당긴다(벽에서는 0)
    const g0=C_-F_, wgt=(1-U)*0.7*clamp((g0-2.4)/1.2,0,1);
    if(wgt>0){
      if(V15&&P.shx!==undefined&&(P.rk.lay||0)>0){                    // 판 15 바위그늘 — 켜 두께를 켜마다 0.6~1.6 m(켜 경계를 정수 해시로 ±J/2 흔든다 · J≤min(b−0.6, 1.6−b))
        const b=P.b, J=Math.min(b-0.6,1.6-b)*Math.min(1,P.rk.lay)*P.ra, yb=i=>P.off+b*i+J*(cv10H(i,0,P.vs+48)-0.5);
        let i=Math.floor((C_-P.off)/b); if(C_<yb(i)) i--; else if(C_>=yb(i+1)) i++;
        const y0=yb(i), y1=yb(i+1), lay=y0+(y1-y0)*smoothstep(0.75,1,(C_-y0)/(y1-y0)); C_+=wgt*(lay-C_);
      } else { const q=(C_-P.off)/P.b, fq=q-Math.floor(q), lay=P.off+P.b*(Math.floor(q)+smoothstep(0.75,1,fq)); C_+=wgt*(lay-C_); }
    }
  }
  if(P.vor){                                                          // 바위틈 — 보로노이 덩이마다 천장 ±0.6 m(모난 면)
    const X=x/1.8, Z=z/1.8, ix=Math.floor(X), iz=Math.floor(Z); let bd=1e9,bv=0;
    for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const i=ix+dx, j=iz+dz, px=i+0.15+0.7*cv10H(i,j,P.vs), pz=j+0.15+0.7*cv10H(i,j,P.vs+1), d=(X-px)*(X-px)+(Z-pz)*(Z-pz);
      if(d<bd){ bd=d; bv=cv10H(i,j,P.vs+2)*2-1; } }
    C_+=(1-U)*0.6*bv;
  }
  const h=cv10Sfc(x,z);
  let bT=P.bT;
  if(V15&&wS>0){ bT=cv10R15(c,P,x,z,h,S,U,Us,Wd,sk,tL,tU,F_,C_,_cv10R,wS); F_=_cv10R.f; C_=_cv10R.c; }
  let open=inSky;
  if(!open&&h-C_<bT) open=true;
  if(open) C_=h+6;
  if(F_>=h-0.1||C_-F_<=0.05) return _cv10None(Yn);
  return {f:F_,c:C_,g:C_-F_,s:S,open,u:U,h,fb:Fb,rp};
}
/* 판 15 — 굴 안쪽 굴곡(입구 마당 각진 천장 · 이마 · 펜던트 · 붕락 계단 · 판상 덩이 · 채광창 밑 덩이 · 바위틈 덩이 천장/바닥 · 낙반 판)과 안전 제약.
   제약: 가운데 길(u<0.5) 바닥 덧붙임 ≤0.1 m · 천장 내림 ≤max(0, g−2.1) · 천장 올림 ≤max(0, h−C−덮개−0.3)(덮개 = max(browT, minCover+0.2) — 새 하늘 구멍 · 얇은 지붕 막기) ·
   들머리 s<4 m 는 0(smoothstep(4,10,s) · 바위그늘은 뒷벽 쪽 무게). 바뀐 f · c 는 out 에 담고 이마 두께(browT)를 돌려준다 */
const _cv10R={f:0,c:0};
function cv10R15(c,P,x,z,h,S,U,Us,Wd,sk,tL,tU,F_,C_,out,wS){
  const rk=P.rk, rm=P.rm, ra=P.ra*wS, n=c._n, sh=P.shx!==undefined, bk=sh?cv10Back(P,x,z)*wS:0, ge=sh?bk:smoothstep(4,10,S)*wS, g0=C_-F_, w1=U<1?1-U:0, wu=smoothstep(0.5,0.62,Us);
  let dF=0, dC=0, bT=P.bT;
  /* 입구 마당 — 천장을 각지게(보로노이 1.2 m) · 이마 두께를 들쭉날쭉(바위그늘은 앞쪽 · 그 밖은 s 4~11 m) */
  const wy=sh?smoothstep(0.1*P.shD,-0.25*P.shD,(x-P.shx)*P.bkx+(z-P.shz)*P.bkz):smoothstep(4,7,S)*(1-smoothstep(11,15,S));
  if(wy>0&&((rm.ceil||0)>0||(rm.brow||0)>0)){ const o=cv10Vor(x/1.2,z/1.2,P.vs+64,0.45), v=o.v, w=o.w*2-1;
    dC+=(rm.ceil||0)*ra*wy*v*w1;
    bT+=(rm.brow||0)*ra*w*(sh?wy:smoothstep(4,7,S)*(1-smoothstep(9,11,S))); }
  if(c.kind==='karst'){
    if((rk.ped||0)>0&&g0>3){ const p=cv10N2(n,x/2.2+17.3,z/2.2+4.1); if(p>0.25) dC-=rk.ped*ra*ge*(p-0.25)/0.75*smoothstep(3,3.6,g0)*w1; }   // 천장 펜던트(2 m 넘는 파장)
    if((rk.step||0)>0){ const wl=w1*clamp((g0-2.4)/1.2,0,1); if(wl>0) dC+=rk.step*ra*ge*wl*cv10Vor(x/3,z/3,P.vs+80,0.35).v; }               // 켜를 따른 천장 붕락 계단(켜 당김과 같은 무게)
    if((rk.slab||0)>0&&wu>0){ const wd=smoothstep(3.2,4.2,Wd)*smoothstep(1.0,1.6,g0); if(wd>0) dF+=ge*wu*wd*cv10Slab(x,z,2.2,P.vs+96,0.55,0.3*rk.slab*ra,rk.slab*ra); }   // 방 · 넓은 길 벽 쪽 판상 덩이
  } else if(c.kind==='lava'){
    if((rk.step||0)>0){ const wz=smoothstep(0.30,0.40,n(S/18+21.7,3.9)); if(wz>0) dC+=rk.step*ra*ge*wz*w1*(0.5+0.5*cv10Vor(x/2.5,z/2.5,P.vs+112,0.35).w); }   // 붕락 구간만 천장 계단 0.3~0.6 m
    if((rk.fall||0)>0&&sk>0) dF+=ge*sk*cv10Slab(x,z,1.5,P.vs+128,0.6,0.3*rk.fall*ra,rk.fall*ra);                                         // 채광창 밑 붕락 덩이
  } else if(c.kind==='talus'){
    if((rk.ceil||0)>0) dC+=rk.ceil*ra*ge*w1*tU;                                                                                             // 덩이마다 천장 — 벽이 밀려 나간 덩이는 천장도 높다
    if((rk.floor||0)>0) dF-=rk.floor*ra*ge*smoothstep(0.55,0.65,Us)*tL;                                                                   // 바닥 u>0.55
  } else if(sh){
    if((rk.slab||0)>0&&wu>0) dF+=bk*wu*cv10Slab(x,z,1.6,P.vs+144,0.45,rk.slab*ra/3,rk.slab*ra);                                          // 뒷벽 쪽 낙반 판 0.1~0.3 m
  }
  if(dF>0.1) dF=0.1+(dF-0.1)*wu;                                       // 가운데 길 바닥 덧붙임 ≤0.1 m
  F_+=dF;
  const g1=C_-F_;
  if(dC<0){ const lim=g1>2.1?g1-2.1:0; if(dC<-lim) dC=-lim; }
  else if(dC>0){ const lim=h-C_-Math.max(P.bT,((CV10.K[c.kind]||CV10.K.karst).minCover||0)+0.2)-0.3; dC=lim>0?(dC<lim?dC:lim):0; }
  out.f=F_; out.c=C_+dC; return bT;
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
  /* 입구 앞 접근로(ap) — 입구가 보는 쪽으로 12 m · 벼랑 덩이(33-crags.js · 벼랑 모형)와 나무가 들머리를 막지 않게(caveAt 를 쓰는 것들이 비킨다).
     바이옴 이름 · 굴 판정에는 안 쓴다(82-hud.js 가 ap 를 거른다) */
  for(const m of c.mouths){ if(m.s>0) continue; const ca=Math.cos(m.yaw), sa=Math.sin(m.yaw), d0=m.sky?m.r:0, R=Math.max(4,(m.w||4)/2+2.5);
    for(let d=2;d<=12+1e-6;d+=2) Z.push({x:m.x+ca*(d0+d),z:m.z+sa*(d0+d),R,ap:1}); }
  return Z;
}
/* 굴 바위 껍데기(지어 둔 메시)에 (x0,y0,z0)→(x1,y1,z1) 선분이 닿나 — 닿으면 {x,y,z,nx,ny,nz}(바깥쪽 = 빈 데 쪽 법선), 아니면 null.
   던진 것(수류탄)이 굴 벽에서 튀게 — 바위틈 굴 · 바위그늘의 벽은 땅 위에 쌓인 바위라 땅 높이로는 못 잡는다. 메시는 세계 좌표 그대로다 */
const _cv10Rc=new THREE.Raycaster(), _cv10Ro=new THREE.Vector3(), _cv10Rd=new THREE.Vector3(), _cv10Rh={x:0,y:0,z:0,nx:0,ny:0,nz:0};
function cv10Ray(x0,y0,z0,x1,y1,z1){
  const L=Math.hypot(x1-x0,y1-y0,z1-z0); if(L<1e-6) return null;
  for(const [c,r] of CV10.built){ if(!r.mesh||c.off) continue; const b=c.box; if(x1<b.x0-1||x1>b.x1+1||z1<b.z0-1||z1>b.z1+1) continue;
    _cv10Ro.set(x0,y0,z0); _cv10Rd.set((x1-x0)/L,(y1-y0)/L,(z1-z0)/L); _cv10Rc.set(_cv10Ro,_cv10Rd); _cv10Rc.far=L+0.08;
    const h=_cv10Rc.intersectObject(r.mesh,false); if(!h.length||!h[0].face) continue;
    const q=_cv10Rh, n=h[0].face.normal; q.x=h[0].point.x; q.y=h[0].point.y; q.z=h[0].point.z; q.nx=n.x; q.ny=n.y; q.nz=n.z; return q; }
  return null;
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
      const sc=o.mode==='contour' ? -Math.abs((cv10Sfc(e[0],e[1])-cv10Sfc(x,z))/(ds*nn)+0.12)*10+rnd()*0.05
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
  const c=ctx.c, rnd=ctx.rnd, k=talus?ctx.K.talus:ctx.K.karst, att=ctx.att, hM=cv10Sfc(c.x,c.z);
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
  const c=ctx.c, rnd=ctx.rnd, k=ctx.K.lava, att=ctx.att, hM=cv10Sfc(c.x,c.z);
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
  const y0=main[0].y, ry=c.yaw+Math.PI, he=cv10Sfc(c.x+Math.cos(ry)*rS,c.z+Math.sin(ry)*rS), kr=(he-y0)/(1.8*rS);
  if(kr>0.8) return false;                                           // 무너진 돌 비탈이 걸을 수 있는 기울기(MAXSLOPE 1.15 안 · 가장자리 흐림을 더해도)
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

/* 입구 밖 접근 — 입구 앞 3~10 m 의 입구가 보는 쪽 ±30° 땅이 걸을 수 있는 기울기(≤1.0)인가(B 검수 — 6 m 밖에서 미끄러져 못 들어가던 굴). 채광창이면 구멍 가장자리 밖에서 잰다 */
function cv10Approach(c){
  const m=c.mouths[0], r0=m.sky?m.r:0;
  for(const d of [3,5,7,10]) for(const da of [-0.5236,0,0.5236]){
    const a=m.yaw+da, x=m.x+Math.cos(a)*(r0+d), z=m.z+Math.sin(a)*(r0+d);
    const gx=(cv10Sfc(x+0.5,z)-cv10Sfc(x-0.5,z)), gz=(cv10Sfc(x,z+0.5)-cv10Sfc(x,z-0.5));
    if(Math.hypot(gx,gz)>1.0) return false; }
  /* 문턱 — 입구에서 밖으로 나가며 빈 데가 끝나기 0.5 m 앞 바닥과 끝 0.25 · 0.5 m 밖 겉 높이의 차가 0.75 m 를 넘으면 버린다(0.3 · 0.45 면 바위그늘이 섬에서 없어졌다 — 그 사이 턱은 걷기가 입구 4 m 안에서 0.8 m 까지 받는다 · 80-player.js caveWalk)
     (바위그늘은 앞 너비를 다섯 점 · 빛구멍 입구는 돌 비탈이 받는다). 매끈한 땅 섬에서 바위그늘 들머리 땅이 굴 바닥보다 0.93 m 높았다 */
  if(!m.sky){ const P=c._P||cv10Prep(c), ca=Math.cos(m.yaw), sa=Math.sin(m.yaw), hw=c.kind==='shelter'?(m.w||4)*0.4:0;
    for(const l of hw>0?[-1,-0.5,0,0.5,1]:[0]){ const bx=m.x-sa*l*hw, bz=m.z+ca*l*hw, fs=[]; let d=-6, got=false;
      for(;d<=14;d+=0.25){ const o=cv10Eval(c,P,bx+ca*d,bz+sa*d); if(o.g>0.05){ fs.push(o.f); got=true; } else if(got) break; }
      if(!got) continue;
      for(let i=1;i<fs.length-2;i++) if(Math.abs(fs[i]-fs[i-1])>0.6) return false;   // 들머리 바닥이 0.25 m 사이에 0.6 m 넘게 튄다 — 입구 앞 겉에 얇은 벼랑 날(큰 지형 모형)이 서서 바닥이 9 m 벽을 넘게 짜였다(기본 섬 바위틈)
      const f=fs[Math.max(0,fs.length-3)], sf=Math.max(cv10Sfc(bx+ca*(d+0.25),bz+sa*(d+0.25)),cv10Sfc(bx+ca*(d+0.5),bz+sa*(d+0.5)));   // 걷는 격자(0.5 m · 빈 데 점만)는 끝 0.5 m 의 가파른 바닥을 못 받는다 — 그 안쪽 바닥과 견준다
      if(sf-f>0.75) return false; } }
  return true;
}
/* 바위그늘 — 비탈의 너른 처마(굴길 한 토막을 둥근 끝으로 · 안쪽으로 내려앉는 바닥) · 반은 뒤에 작은 굴길 */
function cv10Shelter(ctx){
  const c=ctx.c, rnd=ctx.rnd, k=ctx.K.shelter, att=ctx.att;
  const W=k.W[0]+rnd()*(k.W[1]-k.W[0]), D=k.D[0]+rnd()*(k.D[1]-k.D[0]), H=k.h[0]+rnd()*(k.h[1]-k.h[0]);
  const ca=Math.cos(c.yaw), sa=Math.sin(c.yaw), cx=c.x-ca*D*0.35, cz=c.z-sa*D*0.35, ax=-sa, az=ca, half=Math.max(1,(W-D)/2);
  const tl=-(0.2+att*0.01), hF=cv10Sfc(c.x+ca*D*0.15,c.z+sa*D*0.15), yc=hF-0.4+tl*D/2;     // 앞 가장자리 바닥이 땅에 닿게
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
    if(cv10V15()) c._ra=att>=4?0.5:1;                                  // 판 15 — 받아들이기에 막혀 늦게 붙는 시도는 꼴 진폭 ½(cv10Prep)
    cv10Finish(c);
    const st=cv10Stats(c,1,true);
    if(st.cells>150&&st.thin===0&&st.minCover>=K.minCover+0.1&&st.maxSlope<=0.30&&(kind!=='shelter'||st.open<=st.cells*0.8)&&cv10Reach(c).reach===c.rooms.length&&cv10Approach(c)) return true;
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


/* ══ A2 — 격자 · 바위 껍데기 메시 · 굴 자리 그림 · 질의 ═══════════════════════════════════════════════════════════
   사람이 320 m 안이면 굴 하나씩 프레임마다 3 ms 예산으로 0.5 m 격자(F 바닥 · C 천장 · Hh 땅 · O 열린 데 · M 땅 뚫기 자리 · D 열린 데까지의 거리)를 굽고
   surface nets 로 이음매 없는 껍데기를 짓는다(밀도 ρ=min(Hh−y, max(F−y,y−C)) — ρ>0 이 바위). 500 m 밖이면 버린다.
   surface nets 의 칸 → 꼭짓점 하나 · 부호가 바뀐 모서리마다 네모라는 얼개는 mikolalysenko/isosurface `lib/surfacenets.js`(MIT)에서 가져왔고,
   칸의 y 범위를 기둥 위아래로만 좁히는 생각은 NW2 의 '단면을 한 번 세고 y 에 다시 쓰기'를 따랐다. 땅 겉 면 버리기 · 속성은 이 게임의 것.
   짓는 차례와 프레임에 상관없이 같은 굴은 같은 메시다(굴 자료와 cv10Field 만 읽는다). */
CV10.built=new Map(); CV10.onBuild=[]; CV10.onDrop=[]; CV10.mat=null;
CV10.near=320; CV10.far=500; CV10.budget=1.5; CV10.maxTri=80000; CV10.cur=null; CV10.maxFrame=0;
const _cv10Smooth=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
const _cv10Cols={karst:0x9a917f,lava:0x3b3836,talus:0x8d8a86,shelter:0xb88a5c}, _cv10Mats={};
function cv10SeatMat(kind){ return _cv10Mats[kind]||(_cv10Mats[kind]=new THREE.MeshLambertMaterial({color:_cv10Cols[kind]||0x8d8a86})); }

function cv10Init(rec,S){
  const c=rec.c, b=c.box; rec.S=S; rec.x0=b.x0; rec.z0=b.z0; rec.nx=Math.floor((b.x1-b.x0)/S)+1; rec.nz=Math.floor((b.z1-b.z0)/S)+1;
  const n=rec.nx*rec.nz; rec.F=new Float32Array(n); rec.C=new Float32Array(n); rec.Hh=new Float32Array(n);
  rec.gF=new Float32Array(n); rec.gC=new Float32Array(n); rec.gH=new Float32Array(n); rec.O=new Uint8Array(n); rec.M=new Uint8Array(n); rec.D=new Float64Array(n).fill(1e9);   // D 는 Float64 — 힙 키와 같은 정밀도여야 'dk>D[q]' 가 살아 있는 마디를 안 버린다
  rec.state='grid'; rec.ph='grid'; rec.pr=0; rec.ready=false; rec.vmin=1e9; rec.nvoid=0; rec.H=null; rec.Hb=null; rec.mdist=null; rec.unreach=0; rec.onb=false;
  rec.vp=null; rec.vnrm=null; rec.vn=0; rec.idx=null; rec.ni=0; rec.vi=null; rec.cbase=null; rec.ck0=null; rec.cn=null; rec.tdata=null; rec.mkR=cv10MKr(rec);
}
function cv10Rec(c){
  let r=CV10.built.get(c); if(r) return r;
  r={c,state:'grid',S:0.5,mesh:null,tex:null,texInfo:null,cols:[],retried:false,q0:null,texOver:0,tris:0,verts:0,msGrid:0,msMesh:0};
  cv10Init(r,0.5); CV10.built.set(c,r); return r;
}
const cv10Dist=(c,px,pz)=>{ const b=c.box, dx=Math.max(b.x0-px,0,px-b.x1), dz=Math.max(b.z0-pz,0,pz-b.z1); return Math.hypot(dx,dz); };
const cv10Ready=c=>{ const r=CV10.built.get(c); return !!(r&&(r.ready||r.q0)); };   // 다시 짓는 동안(q0)도 질의는 된다

/* 한 단계를 줄 단위로 — rec.pr 부터 t1 까지. 다 했으면 true */
function cv10Rows(rec,n,fn,t1,every){
  const ev=every||1; let c=0;
  while(rec.pr<n){ fn(rec.pr++); if(++c>=ev){ c=0; if(performance.now()>t1) return rec.pr>=n; } }
  return true;
}
/* 최소 힙 — 굴마다 제 것(rec.H)을 쓴다. 하나를 나눠 쓰면 한 굴의 dijk 도중 다른 굴을 cv10Force 할 때 힙이 비워져 D 가 달라졌다 */
function cv10Push(H,k,v){ const hk=H.k, hv=H.v; let i=hk.length; hk.push(k); hv.push(v);
  while(i>0){ const p=(i-1)>>1; if(hk[p]<=k) break; hk[i]=hk[p]; hv[i]=hv[p]; i=p; } hk[i]=k; hv[i]=v; }
function cv10Pop(H){ const hk=H.k, hv=H.v, tv=hv[0], lk=hk.pop(), lv=hv.pop(), n=hk.length;
  if(n>0){ let i=0; for(;;){ let l=2*i+1; if(l>=n) break; if(l+1<n&&hk[l+1]<hk[l]) l++; if(hk[l]>=lk) break; hk[i]=hk[l]; hv[i]=hv[l]; i=l; } hk[i]=lk; hv[i]=lv; }
  return tv; }

/* ρ — 기둥 q 의 높이 y 에서 */
/* 밀도를 기울기 크기로 나눠 거리처럼 만든다(gF·gC·gH = 1/√(1+|∇|²) — 벽 가까이에서 F·C 가 기둥마다 크게 바뀌어도 0 지점이 고르다) */
const cv10Rho=(rec,q,y)=>{ const h=(rec.Hh[q]-y)*rec.gH[q], a=(rec.F[q]-y)*rec.gF[q], b=(y-rec.C[q])*rec.gC[q]; const v=a>b?a:b; return h<v?h:v; };
/* M 을 한 칸 넓힌 것(둘레 여덟 점 가운데 M 이 있나) — 땅 겉 면(윗면)을 남기는 범위. 땅 구멍(32-caves.js cv10Hole — M 을 매끄럽게 섞은 테)은
   M 칸 경계를 오목한 모서리에서 0.23 칸까지 넘으므로 그 밖 한 칸까지 윗면이 있어야 하늘이 안 비친다(2026-11-11) */
/* 그림 묶음이 솎는 굴(점 512 넘음 · st>1 — 32-caves.js cv10Pick)은 A 를 ±(st−1) 점의 최댓값으로 담아 구멍이 (st−1)+0.73·st 칸까지 나간다 — 그만큼 넓힌다(st 2 → 3 칸 · 3 → 5 칸 — 합성 시험에서 2 칸은 오목한 모서리 표본 17 개가 덮이지 않았다) */
const cv10MKr=rec=>{ const st=Math.max(1,Math.ceil(Math.max(rec.nx,rec.nz)/512)); return st===1?1:Math.ceil(1.73*st-1); };
/* 큰 모형 밑 점(Hb 있음)은 CV10_MKG 칸까지 — 모형 윗면이 cv10Sfc 표보다 0.1~0.2 m 높은 데(바위틈)에서 입구로 드는 비스듬한 선이 모형과 껍데기 윗면 사이로 빠져
   모형 속(뒷면)을 지나 하늘이 비쳤다(2026-11-11) — 껍데기 윗면을 넓혀 받는다(모형이 높으면 모형이 덮는다) */
const CV10_MKG=3;
const cv10MK=(rec,q,r)=>{ const nx=rec.nx, i=q%nx, j=(q/nx)|0, M=rec.M, R=Math.max(rec.mkR||1,r||0);
  for(let dj=-R;dj<=R;dj++){ const jj=j+dj; if(jj<0||jj>=rec.nz) continue; for(let di=-R;di<=R;di++){ const ii=i+di; if(ii<0||ii>=nx) continue; if(M[jj*nx+ii]) return true; } }
  return false; };
/* 칸 모서리 12 — 꼭짓점 비트: 1=+x · 2=+z · 4=+y */
const _cv10Edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
const _cv10Nb=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function cv10Step(rec,t1){
  const nx=rec.nx, nz=rec.nz, n=nx*nz, c=rec.c, S=rec.S, F=rec.F, C=rec.C, Hh=rec.Hh, O=rec.O, M=rec.M, D=rec.D;
  for(;;){
    switch(rec.ph){
    case 'grid':{
      const T=performance.now();
      if(!cv10Rows(rec,nz,j=>{ const z=rec.z0+j*S; for(let i=0;i<nx;i++){ const x=rec.x0+i*S, o=cv10Field(c,x,z), q=j*nx+i;
          F[q]=o.f; C[q]=o.c; { const hb=heightAt(x,z), hs=cv10Sfc(x,z); Hh[q]=hs; if(hs>hb+0.05){ if(!rec.Hb) rec.Hb=new Float32Array(n).fill(1e9); rec.Hb[q]=hb; } } if(o.g>0.05){ O[q]=o.open?1:0; if(o.f<rec.vmin) rec.vmin=o.f; rec.nvoid++; } else { O[q]=0; } } },t1)) { rec.msGrid+=performance.now()-T; return false; }
      rec.msGrid+=performance.now()-T; rec.ph='grad'; rec.pr=0; break; }
    case 'grad':{
      const T=performance.now(), gF=rec.gF, gC=rec.gC, gH=rec.gH;
      if(!cv10Rows(rec,nz,j=>{ const j0=j>0?j-1:j, j1=j<nz-1?j+1:j;
          for(let i=0;i<nx;i++){ const i0=i>0?i-1:i, i1=i<nx-1?i+1:i, q=j*nx+i, dx=(i1-i0)*S, dz=(j1-j0)*S;
            const a=j*nx+i0, b=j*nx+i1, c0=j0*nx+i, c1=j1*nx+i;
            let gx=(F[b]-F[a])/dx, gz=(F[c1]-F[c0])/dz; gF[q]=1/Math.sqrt(1+gx*gx+gz*gz);
            gx=(C[b]-C[a])/dx; gz=(C[c1]-C[c0])/dz; gC[q]=1/Math.sqrt(1+gx*gx+gz*gz);
            gx=(Hh[b]-Hh[a])/dx; gz=(Hh[c1]-Hh[c0])/dz; gH[q]=1/Math.sqrt(1+gx*gx+gz*gz); } },t1)) { rec.msGrid+=performance.now()-T; return false; }
      rec.msGrid+=performance.now()-T; rec.ph='dinit'; break; }
    case 'dinit':{
      const T=performance.now();
      const isV=q=>C[q]-F[q]>0.05; let any=false; const H=rec.H={k:[],v:[]};
      for(let q=0;q<n;q++) if(O[q]&&isV(q)){ D[q]=0; cv10Push(H,0,q); any=true; }
      if(!any&&rec.nvoid){ const m=c.mouths[0]; let bq=-1,bd=1e18;
        for(let q=0;q<n;q++) if(isV(q)){ const dx=rec.x0+(q%nx)*S-m.x, dz=rec.z0+((q/nx)|0)*S-m.z, d=dx*dx+dz*dz; if(d<bd){ bd=d; bq=q; } }
        if(bq>=0){ D[bq]=0; cv10Push(H,0,bq); } }
      rec.msGrid+=performance.now()-T; rec.ph='dijk'; break; }
    case 'dijk':{
      const T=performance.now(), R2=S*1.4142135623730951, H=rec.H; let cnt=0;
      while(H.k.length){
        const dk=H.k[0], q=cv10Pop(H); if(dk>D[q]) continue;
        const i=q%nx, j=(q/nx)|0;
        for(let e=0;e<8;e++){ const ni=i+_cv10Nb[e][0], nj=j+_cv10Nb[e][1]; if(ni<0||nj<0||ni>=nx||nj>=nz) continue;
          const r=nj*nx+ni; if(!(C[r]-F[r]>0.05)) continue; const d=dk+(e<4?S:R2); if(d<D[r]){ D[r]=d; cv10Push(H,d,r); } }
        if((++cnt&511)===0&&performance.now()>t1) { rec.msGrid+=performance.now()-T; return false; }
      }
      rec.H=null; let un=0; for(let q=0;q<n;q++) if(C[q]-F[q]>0.05&&D[q]>=1e8) un++; rec.unreach=un;   // 입구에서 못 닿은 빈 데 기둥(시험이 0 인지 본다)
      rec.msGrid+=performance.now()-T; rec.ph='mdil'; rec.pr=0; break; }
    case 'mdil':{
      const T=performance.now();
      if(!cv10Rows(rec,nz,j=>{ for(let i=0;i<nx;i++){ let m=0;
          for(let dj=-1;dj<=1&&!m;dj++){ const jj=j+dj; if(jj<0||jj>=nz) continue; for(let di=-1;di<=1;di++){ const ii=i+di; if(ii<0||ii>=nx) continue; if(O[jj*nx+ii]){ m=1; break; } } }
          M[j*nx+i]=m; } },t1)) { rec.msGrid+=performance.now()-T; return false; }
      rec.msGrid+=performance.now()-T; rec.ph='near1'; rec.pr=0; rec.tmp=new Uint8Array(n); rec.near=new Uint8Array(n); break; }
    case 'near1':{   /* 빈 데에서 가로로 두 칸(솎는 큰 굴은 cv10MK 가 넓은 만큼 더 — 1+mkR) */
      const T=performance.now(), NR=1+Math.max(rec.mkR||1,rec.Hb?CV10_MKG:0);
      if(!cv10Rows(rec,nz,j=>{ for(let i=0;i<nx;i++){ let m=0; for(let di=-NR;di<=NR;di++){ const ii=i+di; if(ii<0||ii>=nx) continue; const q=j*nx+ii; if(C[q]-F[q]>0.05){ m=1; break; } } rec.tmp[j*nx+i]=m; } },t1)) { rec.msGrid+=performance.now()-T; return false; }
      rec.msGrid+=performance.now()-T; rec.ph='near2'; rec.pr=0; rec.ymin=1e9; rec.ymax=-1e9; break; }
    case 'near2':{
      const T=performance.now(), NR=1+Math.max(rec.mkR||1,rec.Hb?CV10_MKG:0);
      if(!cv10Rows(rec,nz,j=>{ for(let i=0;i<nx;i++){ let m=0; for(let dj=-NR;dj<=NR;dj++){ const jj=j+dj; if(jj<0||jj>=nz) continue; if(rec.tmp[jj*nx+i]){ m=1; break; } }
          const q=j*nx+i; rec.near[q]=m; if(m){ const lo=C[q]-F[q]>0.05?F[q]:Hh[q]; if(lo<rec.ymin) rec.ymin=lo; if(Hh[q]>rec.ymax) rec.ymax=Hh[q]; } } },t1)) { rec.msGrid+=performance.now()-T; return false; }
      rec.tmp=null; rec.ready=true; rec.q0=null; rec.msGrid+=performance.now()-T;
      if(!rec.nvoid){ rec.state='done'; rec.ph='done'; return true; }
      rec.ymin=Math.min(rec.ymin,rec.vmin)-1; rec.ymax+=1; rec.ny=Math.ceil((rec.ymax-rec.ymin)/S)+1;
      rec.cbase=new Int32Array((nx-1)*(nz-1)); rec.ck0=new Int16Array((nx-1)*(nz-1)); rec.cn=new Int16Array((nx-1)*(nz-1)); rec.slot=0;
      rec.ph='crange'; rec.pr=0; rec.state='mesh'; break; }
    case 'crange':{
      const T=performance.now(), ny=rec.ny, ymin=rec.ymin, nxc=nx-1;
      if(!cv10Rows(rec,nxc,i=>{ for(let j=0;j<nz-1;j++){ const q0=j*nx+i; let any=false, lo=1e9, hi=-1e9;
          for(let a=0;a<4;a++){ const q=q0+(a&1)+(a>>1)*nx; if(rec.near[q]) any=true; const v=C[q]-F[q]>0.05; const l=v?F[q]:Hh[q]; let h=v?Math.min(C[q],Hh[q]+1):Hh[q];
            if(v&&h<Hh[q]&&(rec.Hb&&rec.Hb[q]<1e8?cv10MK(rec,q,CV10_MKG):cv10MK(rec,q))) h=Hh[q];   // 지붕 덮인 빈 데라도 땅 구멍 둘레면 지붕 윗면(겉)까지 — 예전엔 천장+1 칸까지만 세어 바위그늘 지붕 윗면이 없어 구멍으로 하늘이 비쳤다
            if(l<lo) lo=l; if(h>hi) hi=h; }
          const ci=j*nxc+i; if(!any){ rec.cn[ci]=0; continue; }
          const k0=Math.max(0,Math.floor((lo-ymin)/S)-1), k1=Math.min(ny-2,Math.ceil((hi-ymin)/S)+1);
          if(k1<k0){ rec.cn[ci]=0; continue; } rec.ck0[ci]=k0; rec.cn[ci]=k1-k0+1; rec.cbase[ci]=rec.slot; rec.slot+=k1-k0+1; } },t1)) { rec.msMesh+=performance.now()-T; return false; }
      rec.vi=new Int32Array(rec.slot).fill(-1); rec.cap=4096; rec.vp=new Float32Array(rec.cap*3); rec.vnrm=new Float32Array(rec.cap*3); rec.vn=0;
      rec.ph='vtx'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'vtx':{
      const T=performance.now(), ymin=rec.ymin, nxc=nx-1, rho=new Float64Array(8), EX=_cv10Edges;
      const nzc=nz-1;
      if(!cv10Rows(rec,nxc*nzc,u=>{ { const i=(u/nzc)|0, j=u-i*nzc, ci=j*nxc+i, cnn=rec.cn[ci]; if(!cnn) return;
          const q0=j*nx+i;
          for(let kk=0;kk<cnn;kk++){ const k=rec.ck0[ci]+kk, y0=ymin+k*S, y1=y0+S;
            let mask=0; for(let a=0;a<4;a++){ const q=q0+(a&1)+(a>>1)*nx, r0=cv10Rho(rec,q,y0), r1=cv10Rho(rec,q,y1); rho[a]=r0; rho[a+4]=r1; if(r0>0) mask|=1<<a; if(r1>0) mask|=1<<(a+4); }
            if(mask===0||mask===255) continue;
            let px=0,py=0,pz=0,cnt=0;
            for(let e=0;e<12;e++){ const a=EX[e][0], b=EX[e][1], ra=rho[a], rb=rho[b]; if((ra>0)===(rb>0)) continue; const t=ra/(ra-rb);
              const ax=a&1, az=(a>>1)&1, ay=a>>2, bx=b&1, bz=(b>>1)&1, by=b>>2;
              px+=ax+(bx-ax)*t; pz+=az+(bz-az)*t; py+=ay+(by-ay)*t; cnt++; }
            let gx=0,gy=0,gz=0; for(let a=0;a<8;a++){ const r=rho[a]; gx+=(a&1)?r:-r; gz+=((a>>1)&1)?r:-r; gy+=(a>>2)?r:-r; }
            const gl=Math.hypot(gx,gy,gz)||1;
            if(rec.vn>=rec.cap){ rec.cap*=2; const np=new Float32Array(rec.cap*3), nn=new Float32Array(rec.cap*3); np.set(rec.vp); nn.set(rec.vnrm); rec.vp=np; rec.vnrm=nn; }
            const o=rec.vn*3; rec.vp[o]=rec.x0+(i+px/cnt)*S; rec.vp[o+1]=y0+(py/cnt)*S; rec.vp[o+2]=rec.z0+(j+pz/cnt)*S;
            rec.vnrm[o]=-gx/gl; rec.vnrm[o+1]=-gy/gl; rec.vnrm[o+2]=-gz/gl;
            rec.vi[rec.cbase[ci]+kk]=rec.vn++; } } },t1,8)) { rec.msMesh+=performance.now()-T; return false; }
      rec.idx=new Uint32Array(6*4096); rec.ni=0; rec.ph='quad'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'quad':{
      const T=performance.now(), ymin=rec.ymin, ny=rec.ny, nxc=nx-1, nzc=nz-1, q4=[0,0,0,0];
      const cv=(ci,cj,k)=>{ if(ci<0||cj<0||ci>=nxc||cj>=nzc) return -1; const c0=cj*nxc+ci, k0=rec.ck0[c0], cn=rec.cn[c0]; if(!cn||k<k0||k>=k0+cn) return -1; return rec.vi[rec.cbase[c0]+k-k0]; };
      const near=(x,z)=>Math.min(nz-1,Math.max(0,Math.round((z-rec.z0)/S)))*nx+Math.min(nx-1,Math.max(0,Math.round((x-rec.x0)/S)));
      const emit=(rev)=>{ if(q4[0]<0||q4[1]<0||q4[2]<0||q4[3]<0) return;
        /* 땅 겉 버리기 — 네 꼭짓점이 다 v>0.3 이고 가운데가 M 을 한 칸 넓힌 것 밖 */
        let allv=true,mx=0,mz=0;
        for(let a=0;a<4;a++){ const o=q4[a]*3, x=rec.vp[o], y=rec.vp[o+1], z=rec.vp[o+2]; mx+=x; mz+=z;
          if(cv10V(rec,x,y,z)<=0.3) allv=false; }
        if(allv){ const qc=near(mx/4,mz/4); if(!(rec.Hb&&rec.Hb[qc]<1e8?cv10MK(rec,qc,CV10_MKG):cv10MK(rec,qc))) return; }   // M 을 한 칸 넓힌 데까지 남긴다(cv10MK — 매끄러운 구멍 테 밑)
        if(rec.ni+6>rec.idx.length){ const ni=new Uint32Array(rec.idx.length*2); ni.set(rec.idx); rec.idx=ni; }
        const I=rec.idx; let p=rec.ni;
        if(rev){ I[p++]=q4[0]; I[p++]=q4[2]; I[p++]=q4[1]; I[p++]=q4[0]; I[p++]=q4[3]; I[p++]=q4[2]; }
        else   { I[p++]=q4[0]; I[p++]=q4[1]; I[p++]=q4[2]; I[p++]=q4[0]; I[p++]=q4[2]; I[p++]=q4[3]; }
        rec.ni=p; };
      if(!cv10Rows(rec,nx*nz,u=>{ { const i=u%nx, j=(u/nx)|0;
          const qa=u; let lo=1e9, hi=-1;
          for(let di=-1;di<=0;di++) for(let dj=-1;dj<=0;dj++){ const ci=i+di, cj=j+dj; if(ci<0||cj<0||ci>=nxc||cj>=nzc) continue; const c0=cj*nxc+ci; if(!rec.cn[c0]) continue; if(rec.ck0[c0]<lo) lo=rec.ck0[c0]; const h=rec.ck0[c0]+rec.cn[c0]; if(h>hi) hi=h; }
          if(hi<0) return;
          for(let k=lo;k<=hi&&k<ny;k++){ const y=ymin+k*S, s0=cv10Rho(rec,qa,y)>0;
            if(i+1<nx){ if(s0!==(cv10Rho(rec,qa+1,y)>0)){ q4[0]=cv(i,j-1,k-1); q4[1]=cv(i,j,k-1); q4[2]=cv(i,j,k); q4[3]=cv(i,j-1,k); emit(s0); } }
            if(j+1<nz){ if(s0!==(cv10Rho(rec,qa+nx,y)>0)){ q4[0]=cv(i-1,j,k-1); q4[1]=cv(i,j,k-1); q4[2]=cv(i,j,k); q4[3]=cv(i-1,j,k); emit(!s0); } }
            if(k+1<ny){ if(s0!==(cv10Rho(rec,qa,y+S)>0)){ q4[0]=cv(i-1,j-1,k); q4[1]=cv(i,j-1,k); q4[2]=cv(i,j,k); q4[3]=cv(i-1,j,k); emit(s0); } }
          } } },t1,16)) { rec.msMesh+=performance.now()-T; return false; }
      rec.vi=null; rec.cbase=rec.ck0=rec.cn=null; rec.tris=rec.ni/3;
      if(rec.tris>CV10.maxTri&&!rec.retried){ const ms=rec.msMesh+performance.now()-T, mg=rec.msGrid;
        /* 옛 격자(0.5 m)를 떼어 두고 다시 짓는 동안 질의는 그것으로 답한다 — 안 그러면 굴 안의 사람 발밑이 잠깐 빈다(cv10Init 은 새 배열을 만들어 옛것은 그대로다) */
        const q0={S:rec.S,x0:rec.x0,z0:rec.z0,nx:rec.nx,nz:rec.nz,F:rec.F,C:rec.C,Hh:rec.Hh,O:rec.O,D:rec.D}; cv10Init(rec,0.6); rec.q0=q0; rec.retried=true; rec.msMesh=ms; rec.msGrid=mg; rec.tris=0; return cv10Step(rec,t1); }
      rec.ph='remap'; rec.pr=0; rec.rm=new Int32Array(rec.vn).fill(-1); rec.used=0; rec.msMesh+=performance.now()-T; break; }
    case 'remap':{
      const T=performance.now(); let p=rec.pr;
      while(p<rec.ni){ const e=Math.min(rec.ni,p+8192); for(;p<e;p++){ const v=rec.idx[p]; if(rec.rm[v]<0) rec.rm[v]=rec.used++; } rec.pr=p; if(performance.now()>t1&&p<rec.ni) { rec.msMesh+=performance.now()-T; return false; } }
      rec.pos=new Float32Array(rec.used*3); rec.nor=new Float32Array(rec.used*3); rec.aDeep=new Float32Array(rec.used); rec.aSky=new Float32Array(rec.used); rec.aFl=new Float32Array(rec.used); rec.wall=new Uint8Array(rec.used);
      rec.ord=new Int32Array(rec.used); rec.ph='ord'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'ord':{
      const T=performance.now();
      if(!cv10Rows(rec,Math.ceil(rec.vn/2048),b=>{ const e=Math.min(rec.vn,(b+1)*2048); for(let v=b*2048;v<e;v++) if(rec.rm[v]>=0) rec.ord[rec.rm[v]]=v; },t1)) { rec.msMesh+=performance.now()-T; return false; }
      rec.ph='attr'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'attr':{
      const T=performance.now();
      if(!cv10Rows(rec,Math.ceil(rec.used/128),b=>{ const e=Math.min(rec.used,(b+1)*128);
          for(let m=b*128;m<e;m++){ const v=rec.ord[m], o=v*3, x=rec.vp[o], y=rec.vp[o+1], z=rec.vp[o+2], s=cv10Samp(rec,x,z);
            const vw=cv10V(rec,x,y,z), lower=vw>0.3?0.03:0; rec.wall[m]=vw>0.3?0:1;
            rec.pos[m*3]=x; rec.pos[m*3+1]=y-lower; rec.pos[m*3+2]=z; rec.nor[m*3]=rec.vnrm[o]; rec.nor[m*3+1]=rec.vnrm[o+1]; rec.nor[m*3+2]=rec.vnrm[o+2];
            const d=s.d; rec.aDeep[m]=_cv10Smooth(2,16,d); rec.aSky[m]=Math.exp(-d/5);
            rec.aFl[m]=Math.min(1,Math.max(0,(y-s.f)/Math.max(Math.min(s.c,s.h+1)-s.f,0.1))); } },t1,4)) { rec.msMesh+=performance.now()-T; return false; }
      rec.ph='tri'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    /* 껍데기 다듬기 — 벽 꼭짓점에 Taubin(λ 0.5 · μ −0.53) 두 번(판 15 는 한 번 — smooth) · 법선은 세모에서 다시 센다(0.5 m 격자의 지느러미를 눕힌다) */
    case 'tri':{
      const T=performance.now(); if(!rec.tri) rec.tri=new Uint32Array(rec.ni);
      if(!cv10Rows(rec,Math.ceil(rec.ni/8192),b=>{ const e=Math.min(rec.ni,(b+1)*8192); for(let p=b*8192;p<e;p++) rec.tri[p]=rec.rm[rec.idx[p]]; },t1)) { rec.msMesh+=performance.now()-T; return false; }
      rec.deg=new Int32Array(rec.used+1); rec.ph='adjc'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'adjc':{
      const T=performance.now(), tr=rec.tri, dg=rec.deg;
      if(!cv10Rows(rec,Math.ceil(rec.ni/8192),b=>{ const e=Math.min(rec.ni,(b+1)*8192); for(let p=b*8192;p<e;p++) dg[tr[p]+1]+=2; },t1)) { rec.msMesh+=performance.now()-T; return false; }
      for(let v=0;v<rec.used;v++) dg[v+1]+=dg[v];
      rec.adj=new Int32Array(dg[rec.used]); rec.fillp=dg.slice(0,rec.used); rec.ph='adjf'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'adjf':{
      const T=performance.now(), tr=rec.tri, ad=rec.adj, fp=rec.fillp;
      if(!cv10Rows(rec,Math.ceil(rec.ni/3/4096),b=>{ const e=Math.min(rec.ni/3,(b+1)*4096); for(let t=b*4096;t<e;t++){ const a=tr[t*3], c1=tr[t*3+1], c2=tr[t*3+2];
          ad[fp[a]++]=c1; ad[fp[a]++]=c2; ad[fp[c1]++]=a; ad[fp[c1]++]=c2; ad[fp[c2]++]=a; ad[fp[c2]++]=c1; } },t1)) { rec.msMesh+=performance.now()-T; return false; }
      rec.fillp=null; rec.sp=0; rec.pos2=new Float32Array(rec.used*3); rec.ph='smooth'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'smooth':{
      const T=performance.now(), dg=rec.deg, ad=rec.adj, P0=rec.pos, P1=rec.pos2, wl=rec.wall, nu=rec.used, NS=(c._P||cv10Prep(c)).v15?2:4;   // 판 15 는 한 쌍(파장 2 m 굴곡을 남긴다 — 두 쌍은 2 m 를 0.59 로 · 한 쌍은 0.76)
      while(rec.sp<NS){ const lam=(rec.sp&1)?-0.53:0.5, src=(rec.sp&1)?P1:P0, dst=(rec.sp&1)?P0:P1;
        if(!cv10Rows(rec,Math.ceil(nu/1024),b=>{ const e=Math.min(nu,(b+1)*1024);
            for(let v=b*1024;v<e;v++){ const o=v*3, a=dg[v], z=dg[v+1];
              if(!wl[v]||z===a){ dst[o]=src[o]; dst[o+1]=src[o+1]; dst[o+2]=src[o+2]; continue; }
              let sx=0,sy=0,sz=0; for(let k=a;k<z;k++){ const w=ad[k]*3; sx+=src[w]; sy+=src[w+1]; sz+=src[w+2]; } const inv=1/(z-a);
              dst[o]=src[o]+lam*(sx*inv-src[o]); dst[o+1]=src[o+1]+lam*(sy*inv-src[o+1]); dst[o+2]=src[o+2]+lam*(sz*inv-src[o+2]); } },t1)) { rec.msMesh+=performance.now()-T; return false; }
        rec.sp++; rec.pr=0; if(performance.now()>t1&&rec.sp<NS){ rec.msMesh+=performance.now()-T; return false; } }
      /* 짝수 번(네 번 P0→P1→P0→P1→P0 · 판 15 두 번 P0→P1→P0)이라 결과는 P0 = rec.pos */
      rec.pos2=null; rec.adj=null; rec.deg=null; rec.nor.fill(0); rec.ph='nrm'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'nrm':{
      const T=performance.now(), tr=rec.tri, P=rec.pos, N=rec.nor, nt=rec.ni/3;
      if(rec.pr<Math.ceil(nt/4096)){ if(!cv10Rows(rec,Math.ceil(nt/4096),b=>{ const e=Math.min(nt,(b+1)*4096); for(let t=b*4096;t<e;t++){ const a=tr[t*3]*3, c1=tr[t*3+1]*3, c2=tr[t*3+2]*3;
            const ux=P[c1]-P[a],uy=P[c1+1]-P[a+1],uz=P[c1+2]-P[a+2],vx=P[c2]-P[a],vy=P[c2+1]-P[a+1],vz=P[c2+2]-P[a+2];
            const nx_=uy*vz-uz*vy, ny_=uz*vx-ux*vz, nz_=ux*vy-uy*vx;
            N[a]+=nx_; N[a+1]+=ny_; N[a+2]+=nz_; N[c1]+=nx_; N[c1+1]+=ny_; N[c1+2]+=nz_; N[c2]+=nx_; N[c2+1]+=ny_; N[c2+2]+=nz_; } },t1)) { rec.msMesh+=performance.now()-T; return false; } }
      for(let v=0;v<rec.used;v++){ const o=v*3, l=Math.hypot(N[o],N[o+1],N[o+2]); if(l>1e-12){ N[o]/=l; N[o+1]/=l; N[o+2]/=l; } else { N[o]=0; N[o+1]=1; N[o+2]=0; } }
      rec.ph='tex'; rec.pr=0; rec.msMesh+=performance.now()-T; break; }
    case 'tex':{
      const T=performance.now();
      if(!rec.tdata){ rec.tdata=new Uint8Array(n*4); rec.texOver=0; }
      if(rec.Hb&&!rec.mdist){ const md=rec.mdist=new Uint8Array(n).fill(255);   // M 까지의 칸 거리(두 번 훑기 · 255 에서 자름) — 묻힌 땅을 비울 범위
        for(let q=0;q<n;q++) if(M[q]) md[q]=0;
        for(let j=0;j<nz;j++) for(let i=0;i<nx;i++){ const q=j*nx+i; let v=md[q]; if(i>0&&md[q-1]+1<v) v=md[q-1]+1; if(j>0&&md[q-nx]+1<v) v=md[q-nx]+1; md[q]=v; }
        for(let j=nz-1;j>=0;j--) for(let i=nx-1;i>=0;i--){ const q=j*nx+i; let v=md[q]; if(i<nx-1&&md[q+1]+1<v) v=md[q+1]+1; if(j<nz-1&&md[q+nx]+1<v) v=md[q+nx]+1; md[q]=v; } }
      const base=rec.vmin-1, td=rec.tdata;
      if(!cv10Rows(rec,nz,j=>{ for(let i=0;i<nx;i++){ const q=j*nx+i, o=q*4, v=C[q]-F[q]>0.05; let r=0,g=0;
          if(v){ r=(F[q]-base)/0.25; g=(Math.min(C[q],Hh[q]+1)-base)/0.25; if(r>255||g>255) rec.texOver++; r=Math.min(255,Math.max(0,Math.round(r))); g=Math.min(255,Math.max(0,Math.round(g))); }
          const d=D[q]; td[o]=r; td[o+1]=g; td[o+2]=Math.round(255*_cv10Smooth(2,16,d)); td[o+3]=M[q]?255:Math.round(127*Math.exp(-d/5));
          if(!v){ const hc=Math.round((Hh[q]-base+64)/0.004), ok=hc>0&&hc<65535; td[o]=ok?hc>>8:0; td[o+1]=0; td[o+2]=ok?hc&255:0; }   // 빈 데 아닌 점 — 겉 높이 Hh 를 R·B 16 비트로(4 mm · G 0 이라 빈 데 시험 g>r 은 그대로 거짓 · 32-caves.js cv10Top)
          if(!M[q]&&rec.Hb){ const hb=rec.Hb[q]; if(hb<Hh[q]-0.3&&((v&&hb>F[q]-0.3&&hb<C[q]+0.3)||rec.mdist[q]<=16)) td[o+3]=192+Math.round(62*Math.exp(-Math.min(d,60)/5)); } }  },t1)) { rec.msMesh+=performance.now()-T; return false; }
      rec.msMesh+=performance.now()-T; rec.ph='fin'; break; }
    case 'fin':{
      const T=performance.now();
      const geo=new THREE.BufferGeometry(), nv=rec.used, I=nv>65535?new Uint32Array(rec.ni):new Uint16Array(rec.ni);
      for(let p=0;p<rec.ni;p++) I[p]=rec.tri[p];
      geo.setAttribute('position',new THREE.BufferAttribute(rec.pos,3)); geo.setAttribute('normal',new THREE.BufferAttribute(rec.nor,3));
      geo.setAttribute('aDeep',new THREE.BufferAttribute(rec.aDeep,1)); geo.setAttribute('aSky',new THREE.BufferAttribute(rec.aSky,1)); geo.setAttribute('aFl',new THREE.BufferAttribute(rec.aFl,1));
      geo.setIndex(new THREE.BufferAttribute(I,1)); geo.computeBoundingSphere();
      const tex=new THREE.DataTexture(rec.tdata,nx,nz,THREE.RGBAFormat,THREE.UnsignedByteType);
      tex.magFilter=tex.minFilter=THREE.LinearFilter; tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping; tex.generateMipmaps=false; tex.needsUpdate=true;
      rec.tex=tex; rec.texInfo={x0:rec.x0,z0:rec.z0,w:(nx-1)*S,d:(nz-1)*S,base:rec.vmin-1,step:0.25};
      const mesh=new THREE.Mesh(geo,CV10.mat?CV10.mat(c.kind):cv10SeatMat(c.kind));
      mesh.matrixAutoUpdate=false; mesh.castShadow=false; mesh.receiveShadow=true; mesh.userData.lightRole='recv'; mesh.userData.cave=c;
      scene.add(mesh); rec.mesh=mesh; rec.verts=nv; rec.tris=rec.ni/3;
      rec.tri=rec.wall=rec.vp=rec.vnrm=rec.idx=rec.rm=rec.ord=rec.pos=rec.nor=rec.aDeep=rec.aSky=rec.aFl=rec.tdata=rec.Hb=rec.mdist=null;
      try{ LIGHT.dirtyAt(c.x,c.z,60); }catch(e){}
      rec.state='done'; rec.ph='done'; rec.onb=true;
      for(const f of CV10.onBuild){ try{ f(rec); }catch(e){ showErr('굴 onBuild',e); } }
      rec.msMesh+=performance.now()-T; return true; }
    default: return true;
    }
    if(performance.now()>t1) return rec.state==='done';
  }
}

/* 빈 데 점만으로 쌍선형 — 모서리 넷 가운데 빈 데가 하나도 없으면 n=0 */
const _cv10S={f:0,c:0,h:0,d:1e9,open:false,n:0};
function cv10Samp(rec,x,z){
  const S=rec.S, nx=rec.nx, nz=rec.nz; let fx=(x-rec.x0)/S, fz=(z-rec.z0)/S;
  let i=Math.floor(fx), j=Math.floor(fz); fx-=i; fz-=j; if(i<0){ i=0; fx=0; } if(j<0){ j=0; fz=0; } if(i>nx-2){ i=nx-2; fx=1; } if(j>nz-2){ j=nz-2; fz=1; }
  const q0=j*nx+i;
  let w=0,f=0,c=0,h=0,d=0,bw=-1,bq=q0; const F=rec.F, C=rec.C, Hh=rec.Hh, D=rec.D;
  for(let a=0;a<4;a++){ const q=q0+(a&1)+(a>>1)*nx, wa=((a&1)?fx:1-fx)*((a>>1)?fz:1-fz); if(wa>bw){ bw=wa; bq=q; } if(!(C[q]-F[q]>0.05)||wa<=0) continue; w+=wa; f+=F[q]*wa; c+=C[q]*wa; h+=Hh[q]*wa; d+=Math.min(D[q],1e4)*wa; }
  const s=_cv10S; s.open=!!rec.O[bq];
  if(w>0){ s.f=f/w; s.c=c/w; s.h=h/w; s.d=d/w; s.n=w; } else { s.f=F[bq]; s.c=C[bq]; s.h=Hh[bq]; s.d=1e9; s.n=0; }
  return s;
}

/* 굴 껍데기에서 이 점까지의 v=max(F−y,y−C) — 빈 데 기둥만으로 보간(빈 데가 둘레에 없으면 땅 겉이라 9) */
function cv10V(rec,x,y,z){ const s=cv10Samp(rec,x,z); if(s.n<=0) return 9; const a=s.f-y, b=y-s.c; return a>b?a:b; }

/* ── 질의 — 지어 둔(격자가 다 된) 굴에서 이 점이 빈 데인가 ─────────────────────────────────────────────────────── */
function cv10Q(x,z,y){
  for(const [c,r] of CV10.built){
    const g=r.ready?r:r.q0; if(!g||c.off) continue; const b=c.box; if(x<b.x0||x>b.x1||z<b.z0||z>b.z1) continue;   // g — 지금 격자 · 다시 짓는 동안은 옛 격자
    const S=g.S; if(x>=g.x0+(g.nx-1)*S||z>=g.z0+(g.nz-1)*S) continue;
    const s=cv10Samp(g,x,z); if(s.n<=0) continue;
    if(y<s.f-0.6||y>s.c+0.3) continue;
    return {c,rec:r,f:s.f,ce:s.c,open:s.open,deep:_cv10Smooth(2,16,s.d)};
  }
  return null;
}
function cv10FloorAt(x,z,y){ const q=cv10Q(x,z,y); return q?q.f:null; }

/* ── 짓기와 버리기 ───────────────────────────────────────────────────────────────────────────────────────── */
function cv10Drop(rec){
  if(rec.onb) for(const f of CV10.onDrop){ try{ f(rec); }catch(e){ showErr('굴 onDrop',e); } }   // onBuild 를 받은 굴에만(짓다 만 굴은 받은 것이 없다)
  if(rec.mesh){ scene.remove(rec.mesh); rec.mesh.geometry.dispose(); rec.mesh=null; try{ LIGHT.dirtyAt(rec.c.x,rec.c.z,60); }catch(e){} }
  if(rec.tex){ rec.tex.dispose(); rec.tex=null; }
  CV10.built.delete(rec.c); if(CV10.cur===rec) CV10.cur=null;
}
/* 지어 둔 굴을 전부 버린다 — 섬을 새로 짓거나 불러올 때(generateWorld 첫머리). 판 10 섬에서 판 9 섬으로 가면 틱이 안 돌아 옛 메시가 남았다 */
function cv10Clear(){ for(const r of CV10.built.values()) cv10Drop(r); CV10.cur=null; }
function cv10Tick(){
  if((P.tv|0)<10||typeof CAVES==='undefined') return;
  const px=PL.pos.x, pz=PL.pos.z, T0=performance.now();
  for(const [c,r] of CV10.built) if(c.off||!CAVES.includes(c)||cv10Dist(c,px,pz)>CV10.far) cv10Drop(r);   // 도는 중에 지워도 된다(Map)
  let rec=CV10.cur;
  if(!rec||rec.state==='done'||!CV10.built.has(rec.c)){
    CV10.cur=rec=null; let bd=CV10.near, bc=null;
    for(const c of CAVES){ if(c.tv!==10||c.off||CV10.built.has(c)) continue; const d=cv10Dist(c,px,pz); if(d<bd){ bd=d; bc=c; } }
    if(!bc) return; rec=cv10Rec(bc); CV10.cur=rec;
  }
  const ph=rec.ph;
  cv10Step(rec,T0+CV10.budget);
  const dt=performance.now()-T0; if(dt>CV10.maxFrame){ CV10.maxFrame=dt; CV10.maxPh=ph; }
}
function cv10Force(c){
  if(c.off) return null;                // 상륙 자리와 겹쳐 끈 굴은 안 짓는다(buildCaves)
  const rec=cv10Rec(c); while(rec.state!=='done') cv10Step(rec,1e18);
  return rec;
}

/* ── 시험 도구 — 사진 · 재기 자리(yaw · pitch 는 PL.yaw · PL.pitch 와 같은 뜻) ───────────────────────────────── */
function cv10Views(c){
  const rec=CV10.built.get(c), m=c.mouths[0], out=[], yawOf=(dx,dz)=>Math.atan2(-dx,-dz);
  const ex=m.x+Math.cos(m.yaw)*10, ez=m.z+Math.sin(m.yaw)*10;
  out.push({name:'입구 밖',x:ex,y:cv10Sfc(ex,ez)+1.6,z:ez,yaw:yawOf(m.x-ex,m.z-ez),pitch:-0.05});
  const g0=c.segs.find(g=>!g.pid&&!g.out)||c.segs[0], dx0=g0.bx-g0.ax, dz0=g0.bz-g0.az, l0=Math.hypot(dx0,dz0)||1;
  const ix=g0.ax+dx0/l0*2, iz=g0.az+dz0/l0*2, f0=cv10Field(c,ix,iz);
  out.push({name:'입구 안',x:ix,y:(f0.g>0?f0.f:g0.ay)+1.6,z:iz,yaw:yawOf(dx0,dz0),pitch:-0.03});
  let bg=null,bl=0; for(const g of c.segs){ if(g.out) continue; const l=Math.hypot(g.bx-g.ax,g.bz-g.az); if(l>bl){ bl=l; bg=g; } }
  if(bg){ const mx=(bg.ax+bg.bx)/2, mz=(bg.az+bg.bz)/2, fo=cv10Field(c,mx,mz);
    out.push({name:'굴길',x:mx,y:(fo.g>0?fo.f:(bg.ay+bg.by)/2)+1.6,z:mz,yaw:yawOf(bg.bx-bg.ax,bg.bz-bg.az),pitch:-0.03}); }
  if(rec&&rec.ready){ let bq=-1,bd=-1; const n=rec.nx*rec.nz; for(let q=0;q<n;q++){ if(rec.C[q]-rec.F[q]>0.05&&rec.D[q]<1e8&&rec.D[q]>bd){ bd=rec.D[q]; bq=q; } }
    if(bq>=0){ const x=rec.x0+(bq%rec.nx)*rec.S, z=rec.z0+((bq/rec.nx)|0)*rec.S; let ba=0,bl2=-1;
      for(let a=0;a<16;a++){ const an=a*Math.PI/8; let l=0; for(;l<60;l+=1){ if(cv10Samp(rec,x+Math.cos(an)*l,z+Math.sin(an)*l).n<=0) break; } if(l>bl2){ bl2=l; ba=an; } }
      out.push({name:'깊은 방',x,y:rec.F[bq]+1.6,z,yaw:yawOf(Math.cos(ba),Math.sin(ba)),pitch:-0.03}); } }
  return out;
}
