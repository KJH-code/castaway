/* 30-props.js — CASTAWAY
   세상에 놓인 것 — 거리 단계·칸 켜고 끄기 · 먼 나무 · buildProps(풀·나무·바위·둔덕) · 돌 흩뿌리기 · 열매 · 보급선
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ── 눈에 보이는 거리 ─────────────────────────────────────────────────────
   VIEW_DIST(150 m) 밖의 나무는 그리지 않는다. 인스턴스 메시는 통째로만
   껐다 켤 수 있으므로 가지·잎을 TILE(128 m) 칸마다 따로 담아 두고
   칸 단위로 끈다. 칸의 어느 구석이라도 150 m 안에 들면 켠다 —
   칸 반지름(대각선 절반 + 나무 가지가 칸 밖으로 나가는 여유 12 m)을 빼고 잰다. */
/* 땅 안개가 물리값(가시거리 수십 km)이 되어 150 m 에서 나무가 사라지는 경계가 드러났다 —
   임포스터(나무당 판 4장)를 450 m 까지 그린다 */
const VIEW_DIST=450, NEAR_DIST=55, TILE=64, COPY_DIST=125;   // 칸 가장자리가 125 m 안인 칸은 그루마다 입체(아래 'TL') — 그 밖은 그림 판때기. 연무가 차이를 가린다
const TREE_TILES=[];
const WIND_ON=false;
/* 풀·갈대·자갈처럼 작은 것은 멀면 안 보인다 — 섬 전체를 한 인스턴스 메시로 들고 있으면 발밑 풀
   한 포기 때문에 1920 m 섬의 풀 4만 포기(삼각형 220만)를 매 프레임 다 그렸다. 64 m 칸으로 쪼개
   `PROP_DIST` 밖 칸을 통째로 끈다(updateTileVis). 가까운 풀의 빽빽함은 그대로다. */
const PROP_TILE=64, PROP_TILES=[];
/* 나무(oak·fir)는 줄기 메시 — 섬 전체 4천 그루를 늘 그렸다(70만). 그 밖은 그림 판때기 속 줄기가 대신한다.
   COPY_DIST + 12: 나무 칸은 반경 TILE·0.71+12, 프롭 칸은 PROP_TILE·0.71 이라 12 m 를 더해야
   판때기가 켜지는 바로 그 거리에서 줄기 메시가 꺼진다(둘 다 같은 64 m 격자). */
const TRUNK_DIST=COPY_DIST+12;
/* 점토 노출지·모래 언덕(지름 3 m 남짓 · 땅에 반쯤 묻힌 원반)도 칸에 담는다 — 예전엔 섬 전체(모래 561 · 점토 316)를 한 메시로
   거리·시야와 상관없이 늘 그려서 본 패스·그림자 패스에 프레임마다 40만 삼각형이 들었다. 300 m 밖은 몇 화소다 */
const PROP_DIST={grass:200, reed:110, pebble:90, flint:110, oak:TRUNK_DIST, fir:TRUNK_DIST, clay:300, sand:300};
const tileKey=(x,z)=>Math.floor(x/TILE)+'|'+Math.floor(z/TILE);
/* 참나무·전나무 칸 — 칸 가장자리가 COPY_DIST(125 m) 안이면 그루마다 거리로 단계를 고르고(아래 'TL'),
   그 밖 VIEW_DIST(450 m) 까지는 **수관 그림 판때기** 하나로(나무당 4면), 그 밖은 안 그린다. */
const ROCK_TILE=64, ROCK_DIST=200, ROCK_SMALL=70, ROCK_KEEP=90, ROCK_TILES=[], ROCK_MAT={};
/* **자동 품질**(`QUAL`) — 프레임이 떨어지면 '어디까지 자세히 그리나' 를 스스로 당긴다(마인크래프트의 그리는 거리처럼).
   `QUAL.k`(0.45~1)가 나무의 제 가지·복제 단계 거리 · 풀과 소품이 보이는 거리 · 덤불·작은 나무를 까는 반경에 곱해진다.
   문턱은 아래 `qualTick` — 50 FPS 를 지키는 쪽으로 잡았다. 설정의 '자동 품질' 로 끈다(끄면 늘 1) */
const QUAL={k:1, on:true, ema:16, t:0, lo:0.4};
function qualTick(dtMs,dt){
  const Q=QUAL;
  if(!Q.on){ if(Q.k!==1){ Q.k=1; qualApply(); } return; }
  Q.ema+=(Math.min(dtMs,100)-Q.ema)*0.05;
  /* **50 FPS 를 지킨다**(사용자 요청) — 프레임 시간의 느린 평균이 19.5 ms(51 FPS)를 넘는 채로 1.5초가 가면 한 단계 내린다.
     올리는 것은 15.2 ms 밑으로 8초(60 Hz 화면에서 꽉 찬 60 FPS 는 16.7 ms 라 저절로는 안 오른다 — 넉넉할 때만 오른다) */
  if(Q.ema>19.5&&Q.k>Q.lo){ Q.t+=dt; if(Q.t>1.5){ Q.t=0; Q.k=Math.max(Q.lo,+(Q.k-0.1).toFixed(2)); qualApply(); } }
  else if(Q.ema<15.2&&Q.k<1){ Q.t-=dt; if(Q.t<-8){ Q.t=0; Q.k=Math.min(1,+(Q.k+0.05).toFixed(2)); qualApply(); } }
  else Q.t*=0.9;
}
function qualApply(){ _tvForce=true; if(typeof FLORA!=='undefined'){ FLORA.far.cx=1e9; FLORA.near.cx=1e9; } }
/* 화면 밖 칸 거르기 — 칸을 경계구(가로 반경 + 높이 몫 30 m)로 보고 시야 절두체에 안 걸리면 끈다.
   가장자리가 `CULL_NEAR`(10 m) 안인 칸은 늘 그린다(몸을 돌리는 순간 곁의 나무가 튀어나오지 않게). */
const CULL_NEAR=10, _tFr=new THREE.Frustum(), _tPM=new THREE.Matrix4(), _tSp=new THREE.Sphere();
function tileSeen(t,d,top){
  if(d<=CULL_NEAR) return true;
  if(t._cy===undefined) t._cy=heightAt(t.cx,t.cz)+10;
  _tSp.center.set(t.cx,t._cy,t.cz); _tSp.radius=t.r+30;
  return _tFr.intersectsSphere(_tSp)&&!tileOcc(t,top||30);
}
/* ── 산 너머 거르기 ─────────────────────────────────────────────────────────
   시야 절두체 안이라도 **등성이 뒤에 가려 안 보이는 칸**은 그리지 않는다(사용자 요청: 같은 비탈·같은 시야에 든 것만).
   눈에서 칸 꼭대기(가장 높은 땅 + 그 칸에서 가장 키 큰 것 `top`)까지 땅 위로 줄을 그어, 사이의 땅이 그 줄보다 2.5 m 넘게
   높으면 가린 것이다. 칸 가운데와 시선에 가로로 양 끝 — 세 줄이 다 막혀야 감춘다(한쪽이라도 보이면 그린다).
   눈앞 12 m 와 칸 앞 40 m 는 안 본다(발밑 둔덕 · 그 칸이 선 비탈 자체). 70 m 안의 칸은 늘 그린다.
   가림은 **눈의 자리**로만 정해진다(고개를 돌려도 같다) — 그래서 눈이 4 m(세로 1.5 m) 움직였을 때만 다시 세고,
   그 사이엔 칸마다 적어 둔 답을 쓴다. 한 번에 칸 300개 × 줄 셋 × 많아야 28점 — 재 보니 0.5 ms 안쪽이다(`occBench()`) */
const OCC={on:true, x:1e9, y:0, z:1e9, gen:0, n:0, hid:0};
function occTick(){
  const e=camera.position, dx=e.x-OCC.x, dy=e.y-OCC.y, dz=e.z-OCC.z;
  if(dx*dx+dz*dz>16||dy*dy>2.25){ OCC.x=e.x; OCC.y=e.y; OCC.z=e.z; OCC.gen++; OCC.n=OCC.hid=0; }
}
function sightBlocked(ex,ey,ez,tx,ty,tz){
  const dx=tx-ex, dz=tz-ez, d=Math.sqrt(dx*dx+dz*dz); if(d<70) return false;
  const n=Math.min(28,Math.max(6,Math.ceil(d/(CELL*2)))), inv=1/n;
  for(let i=1;i<n;i++){ const t=i*inv, dd=t*d; if(dd<12||d-dd<40) continue;
    if(heightAt(ex+dx*t,ez+dz*t)>ey+(ty-ey)*t+2.5) return true; }
  return false;
}
function tileOcc(t,top){
  if(!OCC.on) return false;
  if(t._og===OCC.gen) return t._oc;
  t._og=OCC.gen; OCC.n++;
  if(t._oy===undefined){ const r=t.r*0.6;                // 칸에서 가장 높은 땅(가운데와 네 귀)
    t._oy=Math.max(heightAt(t.cx,t.cz),heightAt(t.cx+r,t.cz+r),heightAt(t.cx-r,t.cz+r),heightAt(t.cx+r,t.cz-r),heightAt(t.cx-r,t.cz-r)); }
  const ex=OCC.x, ey=OCC.y, ez=OCC.z, ty=t._oy+top, dx=t.cx-ex, dz=t.cz-ez, d=Math.sqrt(dx*dx+dz*dz)||1, sx=-dz/d*t.r, sz=dx/d*t.r;
  t._oc=sightBlocked(ex,ey,ez,t.cx,ty,t.cz)&&sightBlocked(ex,ey,ez,t.cx+sx,ty,t.cz+sz)&&sightBlocked(ex,ey,ez,t.cx-sx,ty,t.cz-sz);
  if(t._oc) OCC.hid++;
  return t._oc;
}
/* 가림 세기에 드는 시간 — 지금 자리에서 나무 칸 전부를 reps 번 다시 센다(ms/번 · 칸 수 · 가려진 수) */
function occBench(reps){
  reps=reps||20; let n=0, hid=0; const t0=performance.now();
  for(let r=0;r<reps;r++){ OCC.gen++; n=hid=0; for(const t of TREE_TILES){ const d=tileGap(t,PL.pos.x,PL.pos.z); if(d>VIEW_DIST) continue; n++; if(tileOcc(t,30)) hid++; } }
  return ((performance.now()-t0)/reps).toFixed(3)+' ms · 칸 '+n+' · 가려진 칸 '+hid;
}
/* 사람 자리·시야(투영×보기 행렬)가 지난번과 **똑같으면** 결과도 똑같다 — 멈춰 서 있거나 창을 열어 둔 동안
   칸 1,400개를 다시 볼 까닭이 없다. 칸이 새로 생기면(buildProps · buildFarTrees) `_tvForce` 로 다시 본다 */
const _tvLast=new Float64Array(18); let _tvForce=true;
/* 나무 칸의 가지·잎 — 가까워질 때 짓고(`build` 는 buildProps 가 칸마다 달아 둔다) 250 m 넘게 멀어지면 비운다 */
let _treeBudget=1;
const TREE_DROP=250;
function ensureTreeTile(t){
  if(t.built) return;
  t.build(); t.built=true;
}
/* 원본(그리지 않는 가지·잎 자료)을 비운다 — 장면에도 GPU 에도 안 올라가 있다 */
function dropTreeTile(t){
  if(!t.built) return;
  t.lm=t.ls=t.fm=null; t.built=false;
  for(const p of t.ps){ p._lb=p._ls=p._lf=null; p._lmap=null; }
  if(t.lod){ tlFreeFull(t); t.lod.ev=true; }
}
/* ── 참나무·전나무 단계 — **그루마다 거리로** 고른다(새 식물 `floraFar` 와 같은 길) ──────────────────────
   예전엔 64 m 칸이 통째로 단계를 바꿨고(칸 가장자리 2.5 m 안이면 칸 전부 제 가지 · 14 m 안 복제 22% · 72 m 30%…),
   먼 단계는 **기준 나무 한 그루를 복제**한 것이었다 — 칸 가장자리를 넘는 순간 3~60 m 앞 나무 수십 그루가 한꺼번에 딴 나무로
   바뀌었다(재 보니 화면의 18~26% 가 바뀜 · 사용자 요청 '식생처럼'). 이제
   ① 그루마다 사람과의 거리로 단계를 고른다 — 18 m(`TL.hi`) 안 제 가지 그대로(촘촘한 판) · 45 m(`TL.full`) 안 제 가지(성긴 판 ·
      잎·잔가지는 다) · 그 밖은 **그 나무 제 것을 솎은 것** — 58 · 75 · 95 m 까지 65 · 35 · 18% · 그 뒤 7%(`TL.F`). 긴 가지는 긴 차례로
      남기고 잔가지는 뺀다 · 잎은 고루 남겨 1/√몫 배로 키운다(전나무는 1.45배까지 — 바늘 다발을 크게 키우면 가시가 섰다).
      경계에서 오락가락하지 않게 2 m(`TL.hyst`) 넘어야 바뀐다. 125 m(`COPY_DIST`) 밖 칸은 예전처럼 그림 판때기.
   ② 칸마다 단계별 **묶음 메시**(`tlPack` — 원본과 같은 압축 인스턴스·재질)를 두고, 그루의 단계가 바뀐 칸만 다시 채운다(`tlRepack`).
      제 가지 단계는 원본(`tile.build`)에서 그루 몫을 그대로 베끼고, 솎은 단계는 그루마다 따로 지어 둔 자료(`p._thin` · `tlThin`)에서.
   ③ 원본은 45 m 안 그루가 있는 칸만 짓고(한 프레임에 한 칸) 125 m 넘게 멀어지면 비운다. 솎은 자료는 그림이 되기 40 m 앞부터
      프레임마다 3 ms 씩 그루마다 짓는다(섬을 지을 때는 한꺼번에). 원본·솎은 자료가 아직 없으면 한 단계 굵은 것(또는 그림)으로 선다. */
const TL={hi:18, full:45, thin:[58,75,95], hyst:2, step:0.7, px:1e9, pz:1e9, qk:-1, noShort:false,
  F:{oak:{L:[0.65,0.35,0.18,0.07], F:[0.65,0.35,0.18,0.08], cap:9},
     fir:{L:[0.65,0.35,0.18,0.07], F:[0.75,0.5,0.32,0.18], cap:1.45}},
  der:3, pack:3, stat:{derive:0, pack:0, packMs:0}};
const _tlS={L:{iA:{array:null},iB:{array:null}}, S:{iA:{array:null},iB:{array:null}}, F:{iA:{array:null},iB:{array:null}}};
const _tlZero={nL:[0,0,0,0], nF:[0,0,0,0], LA:null, LB:null, FA:null, FB:null};
function _tlGrow(o,n){ if(!o.iA.array||o.iA.array.length<n*4){ o.iA.array=new Float32Array(n*4+256); o.iB.array=new Float32Array(n*4+256); } }
/* 그루 하나를 빈 그릇에 다 채운 뒤(원본과 같은 `fillLimbs`) 꺾인 가지를 빼고 솎을 차례대로 담는다 */
function tlThin(p,TR,LPB,fill,cfg){
  if(p.felled) return _tlZero;
  const sv=[p._lb,p._ls,p._lf,p._lbBase,p._lbL,p._lbS,p._lmap,p.limbN];
  let n=0, ns=0; growLimbs(p,TR,(a,bq,len)=>{ n++; if(len<SHORT_LIMB) ns++; });
  const N=p.brMax+n, S=_tlS;
  _tlGrow(S.L,N-ns); _tlGrow(S.S,ns); _tlGrow(S.F,N*LPB);
  p._lb=S.L; p._ls=S.S; p._lf=S.F; p._lbBase=0; p._lbL=0; p._lbS=0; p._lmap=new Int32Array(N); p.limbN=N;
  fill(p);
  const map=p._lmap;
  [p._lb,p._ls,p._lf,p._lbBase,p._lbL,p._lbS,p._lmap,p.limbN]=sv;
  const a=S.L.iA.array, b=S.L.iB.array, fa=S.F.iA.array, fb=S.F.iB.array, br=p.br===undefined?p.brMax:p.br;
  const L=[], F=[];
  for(let j=0;j<N;j++){
    if(j>=br&&j<p.brMax) continue;                              // 꺾인 아래 가지 — 잎도 같이 없다
    const v=map[j]; if(v>=0&&b[v*4+3]>0) L.push(v);
    for(let q=0;q<LPB;q++){ const i=j*LPB+q; if(fa[i*4+3]>0) F.push(i); }
  }
  L.sort((x,y)=>b[y*4+3]-b[x*4+3]);                           // 긴 가지부터
  const rk=new Float32Array(N*LPB); let h=(p._hash>>>0)^0x2c1b3c6d;
  for(let i=0;i<rk.length;i++){ h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0; h=(h+0x6d2b79f5)>>>0; rk[i]=h/4294967296; }
  F.sort((x,y)=>rk[x]-rk[y]);                                 // 잎은 고루(씨앗 차례)
  const nL=cfg.L.map(f=>Math.min(L.length,Math.ceil(L.length*f))), nF=cfg.F.map(f=>Math.min(F.length,Math.round(F.length*f)));
  const o={nL, nF, LA:new Float32Array(nL[0]*4), LB:new Float32Array(nL[0]*4), FA:new Float32Array(nF[0]*4), FB:new Float32Array(nF[0]*4)};
  for(let k=0;k<nL[0];k++){ const s=L[k]*4; for(let c=0;c<4;c++){ o.LA[k*4+c]=a[s+c]; o.LB[k*4+c]=b[s+c]; } }
  for(let k=0;k<nF[0];k++){ const s=F[k]*4; for(let c=0;c<4;c++){ o.FA[k*4+c]=fa[s+c]; o.FB[k*4+c]=fb[s+c]; } }
  return o;
}
/* 꺾기·벌목 뒤 — 그 그루의 솎은 자료를 다시 짓고 칸을 다시 채운다(shrinkFoliage 가 부른다) */
function tlTreeChanged(p){
  const t=p._tile; if(!t||!t.lod) return;
  if(p._thin&&t.thin1) p._thin=t.thin1(p);
  t.lod.sig={}; t.lod.pend=true; t.lod.ev=true; _tvForce=true;
}
function tlInit(t){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9,sm=0;
  t.ps.forEach((p,i)=>{ p._ti=i; p._lv=null; x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); z0=Math.min(z0,p.z); z1=Math.max(z1,p.z); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); sm=Math.max(sm,p.s); });
  const c=new THREE.Vector3((x0+x1)/2,(y0+y1)/2+6*sm,(z0+z1)/2);
  const R=Math.hypot(x1-x0,y1-y0+12*sm,z1-z0)/2+9*sm+BOUND_PAD;
  t.lod={packs:{}, np:0, sig:{}, ready:false, ev:true, pend:false, want:false, seen:false, d:1e9, bs:new THREE.Sphere(c,R)};
  return t.lod;
}
/* 묶음 메시 — 밑 지오메트리·재질은 원본과 같고 인스턴스 자료(iA·iB)만 제 것. 모자라면 1.3배로 다시 잡는다 */
const TL_KEYS={hi:['hi','lm'], lo:['lo','lm'], sh:['sh','lm'], lf:['leaf','fm'],
  L0:['lo','lm'], L1:['lo','lm'], L2:['lo','lm'], L3:['lo','lm'], F0:['leaf','fm'], F1:['leaf','fm'], F2:['leaf','fm'], F3:['leaf','fm']};
function tlGeo(base,cap,bs){
  const g=new THREE.BufferGeometry();
  for(const k in base.attributes) g.setAttribute(k,base.attributes[k]);
  if(base.index) g.setIndex(base.index);
  g.setAttribute('iA',new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4));
  g.setAttribute('iB',new THREE.InstancedBufferAttribute(new Float32Array(cap*4),4));
  g.boundingSphere=bs; return g;
}
/* 묶음 지오메트리를 버린다 — 밑 지오메트리의 정점·인덱스는 다른 칸과 나눠 쓰므로 떼고 나서 dispose(제 iA·iB 만 GPU 에서 지운다) */
function tlDisposeGeo(g){ for(const k of Object.keys(g.attributes)) if(k!=='iA'&&k!=='iB') g.deleteAttribute(k); g.setIndex(null); g.dispose(); }
function tlPack(t,key,n){
  const L=t.lod, K=t.kit, [gk,mk]=TL_KEYS[key];
  let m=L.packs[key];
  if(m&&m.userData.cap>=n) return m;
  const cap=Math.ceil(n*1.3)+64, g=tlGeo(K[gk],cap,L.bs);
  if(m){ const old=m.geometry; m.geometry=g; tlDisposeGeo(old); }
  else{
    m=new THREE.InstancedMesh(g,K[mk],1);                       // 행렬 버퍼는 한 칸짜리(압축 — instMesh 와 같다)
    m.userData.instC=true; m.userData.noCull=true; m.customDepthMaterial=mk==='lm'?K.ld:K.fd; m.customDistanceMaterial=mk==='lm'?K.lx:K.fx;   // noCull — 경계구는 칸 전체(L.bs) · boundTiles 가 지금 그루로 좁히면 나중에 든 그루가 잘린다
    if(/[123]$/.test(key)) m.userData.lightRole='recv';        // 58 m 밖 솎은 단계는 그림자를 안 드리운다
    m.count=0; m.visible=false; m.frustumCulled=true; m.matrixAutoUpdate=false; m.updateMatrix();
    L.packs[key]=m; L.np++; propGroup.add(m);
  }
  m.iA=g.attributes.iA; m.iB=g.attributes.iB; m.userData.cap=cap;
  return m;
}
function tlFree(t,key){ const m=t.lod.packs[key]; if(!m) return; propGroup.remove(m); tlDisposeGeo(m.geometry); delete t.lod.packs[key]; delete t.lod.sig[key]; t.lod.np--; }
function tlFreeFull(t){ for(const k of ['hi','lo','sh','lf']) tlFree(t,k); }
/* 칸을 통째로 놓는다 — 범위를 벗어났다. 솎은 자료도 버린다(all) */
function tlDrop(t,all){
  const L=t.lod; if(!L) return;
  for(const k of Object.keys(L.packs)) tlFree(t,k);
  L.sig={}; L.want=false; L.ev=true; L.pend=true;
  if(all){ for(const p of t.ps){ p._thin=null; p._lv=null; } L.ready=false; if(t.built&&!t.pin) dropTreeTile(t); }
}
/* 그루마다 단계를 고른다 — 바뀐 그루가 있으면 참 */
function tlEval(t,px,pz,QK){
  const fk=Math.max(QK,0.6), hasM=!!t.lm, R0=QK<0.7?0:TL.hi*fk, R1=TL.full*fk, R2=TL.thin[0]*QK, R3=TL.thin[1]*QK, R4=TL.thin[2]*QK;
  const lvOf=d=>d<R0?0:d<R1?1:d<R2?2:d<R3?3:d<R4?4:5;
  let ch=false;
  for(const p of t.ps){
    if(p.felled){ if(p._lv!==-1){ p._lv=-1; ch=true; } continue; }
    const dx=p.x-px, dz=p.z-pz, d=Math.sqrt(dx*dx+dz*dz), c=p._lv;
    let v=lvOf(d);
    if(c!=null&&c>=0&&v!==c){ if(v>c&&lvOf(d-TL.hyst)<=c) v=c; else if(v<c&&lvOf(d+TL.hyst)>=c) v=c; }
    if(v<=1&&!hasM) v=2;                                       // 원본이 아직 없다 — 솎은 첫 단계로
    if(v!==c){ p._lv=v; ch=true; }
  }
  return ch;
}
/* 칸의 묶음을 단계대로 다시 채운다 — 단계 모둠이 바뀐 묶음만 */
function tlRepack(t){
  const L=t.lod, LPB=LEAF_PER[t.kind]||1, cfg=TL.F[t.kind];
  const mem={hi:[],lo:[],sh:[],lf:[],L0:[],L1:[],L2:[],L3:[]};
  for(const p of t.ps){ const v=p._lv; if(v==null||v<0) continue;
    if(v<=1){ if(!t.lm) continue; mem[v===0?'hi':'lo'].push(p); if(!TL.noShort) mem.sh.push(p); mem.lf.push(p); }
    else if(p._thin) mem['L'+(v-2)].push(p); }
  let cast=false;
  for(const key in mem){
    const ps=mem[key]; let sig=ps.length*7919+(TL.noShort?1:0); for(const p of ps) sig=(sig*31+p._ti+1)|0;
    if(L.sig[key]===sig&&(key[0]!=='L'||L.sig['F'+key[1]]===sig)) continue;
    if(key[0]!=='L'||key==='L0') cast=true;
    if(!ps.length){ for(const k of key[0]==='L'?[key,'F'+key[1]]:[key]){ const m=L.packs[k]; if(m){ m.count=0; } L.sig[k]=sig; } continue; }
    if(key[0]!=='L'){                                          // 제 가지 — 원본에서 그루 몫을 그대로
      const src=key==='sh'?t.ls:key==='lf'?t.fm:t.lm;
      const rng=p=>key==='sh'?[p._lbS,p._nS]:key==='lf'?[p._lbBase*LPB,p.limbN*LPB]:[p._lbL,p.limbN-p._nS];
      let n=0; for(const p of ps) n+=rng(p)[1];
      const m=tlPack(t,key,n), A=m.iA.array, B=m.iB.array, SA=src.iA.array, SB=src.iB.array; let w=0;
      for(const p of ps){ const [o,c]=rng(p); A.set(SA.subarray(o*4,(o+c)*4),w*4); B.set(SB.subarray(o*4,(o+c)*4),w*4); w+=c; }
      tlUp(m,w); L.sig[key]=sig;
    }else{                                                     // 솎은 것 — 가지는 그대로 · 잎은 키워서
      const k=+key[1], fs=Math.min(1/Math.sqrt(cfg.F[k]),cfg.cap);
      let nl=0, nf=0; for(const p of ps){ nl+=p._thin.nL[k]; nf+=p._thin.nF[k]; }
      const ml=tlPack(t,key,nl), mf=tlPack(t,'F'+k,nf);
      let w=0; for(const p of ps){ const c=p._thin.nL[k]; if(!c) continue; ml.iA.array.set(p._thin.LA.subarray(0,c*4),w*4); ml.iB.array.set(p._thin.LB.subarray(0,c*4),w*4); w+=c; }
      tlUp(ml,w); w=0;
      const A=mf.iA.array, B=mf.iB.array;
      for(const p of ps){ const c=p._thin.nF[k], SA=p._thin.FA, SB=p._thin.FB;
        A.set(SA.subarray(0,c*4),w*4); B.set(SB.subarray(0,c*4),w*4);
        for(let i=0;i<c;i++){ A[(w+i)*4+3]*=fs; B[(w+i)*4+3]*=fs; }
        w+=c; }
      tlUp(mf,w); L.sig[key]=L.sig['F'+k]=sig;
    }
  }
  return cast;
}
function tlUp(m,n){ m.count=n; for(const A of [m.iA,m.iB]){ A.updateRange.offset=0; A.updateRange.count=n*4; A.needsUpdate=true; } }
/* 사람에서 칸 가장자리까지 */
function tileGap(t,px,pz){ const dx=t.cx-px, dz=t.cz-pz; return Math.sqrt(dx*dx+dz*dz)-t.r; }
/* **칸을 512 m 구역으로 묶는다** — 섬의 칸은 4만 개(바위 1.4만 · 소품 1.9만 · 나무 0.7만)인데, 눈이 움직일 때마다 그 전부의 거리를
   쟀다(걷거나 고개를 돌리는 동안 프레임당 6 ms — CPU 프로파일). 칸이 보이는 거리는 길어야 500 m 남짓이니, 사람 둘레 760 m 에
   걸친 구역(열여섯 안팎)의 칸만 본다. 구역이 범위를 벗어나는 순간에는 한 번 더 돌려 그 칸들을 끄고 비운다 */
const TREG={S:512, R:760, map:new Map(), n:[-1,-1,-1], r0:null, last:[], act:[], fr:0};
function tileRegions(){
  const T=TREG;
  if(T.n[0]===ROCK_TILES.length&&T.n[1]===PROP_TILES.length&&T.n[2]===TREE_TILES.length&&T.r0===(TREE_TILES[0]||ROCK_TILES[0]||null)) return;
  T.n=[ROCK_TILES.length,PROP_TILES.length,TREE_TILES.length]; T.r0=TREE_TILES[0]||ROCK_TILES[0]||null; T.map.clear(); T.last.length=0;
  const put=(t,k)=>{ const key=(Math.floor(t.cx/T.S)+64)*128+(Math.floor(t.cz/T.S)+64); let R=T.map.get(key);
    if(!R) T.map.set(key,R={rock:[],prop:[],tree:[],st:-1}); R[k].push(t); };
  for(const t of ROCK_TILES) put(t,'rock'); for(const t of PROP_TILES) put(t,'prop'); for(const t of TREE_TILES) put(t,'tree');
  for(const R of T.map.values()) T.last.push(R);        // 처음 한 번은 섬 전체를 돈다 — 갓 지은 칸 메시는 켜진 채라, 먼 것을 다 꺼야 한다
}
function updateTileVis(){
  const px=PL.pos.x, pz=PL.pos.z;
  camera.updateMatrixWorld(); _tPM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  { const e=_tPM.elements; let same=!_tvForce&&_tvLast[16]===px&&_tvLast[17]===pz;
    for(let i=0;same&&i<16;i++) if(_tvLast[i]!==e[i]) same=false;
    if(same) return;
    for(let i=0;i<16;i++) _tvLast[i]=e[i];
    _tvLast[16]=px; _tvLast[17]=pz; _tvForce=false; }
  _tFr.setFromProjectionMatrix(_tPM);
  occTick();                                          // 눈이 움직였으면 산 너머 가림을 다시 센다
  /* 칸이 켜지거나 꺼지면 그 칸이 드리우던 그림자도 바뀐다 — 그림자 지도를 매 프레임 안 그리므로(LIGHT)
     바뀐 칸 둘레만 다시 그리게 알린다 */
  // 바위 — 칸 가장자리가 200 m 밖이면 통째로 안 그린다
  tileRegions();
  const act=TREG.act; act.length=0; let nIn=0;
  { const T=TREG, S=T.S, x0=Math.floor((px-T.R)/S), x1=Math.floor((px+T.R)/S), z0=Math.floor((pz-T.R)/S), z1=Math.floor((pz+T.R)/S); T.fr++;
    for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const R=T.map.get((gx+64)*128+(gz+64)); if(R){ R.st=T.fr; act.push(R); } }
    nIn=act.length;
    for(const R of T.last) if(R.st!==T.fr) act.push(R);     // 방금 범위를 벗어난 구역 — 한 번 더 돌려 끈다
    T.last.length=0; for(let i=0;i<nIn;i++) T.last.push(act[i]); }
  const SHR=(LIGHT.QUAL[LIGHT.q].R||40)+8;          // 해 그림자 상자 반경 + 8 m — 그 밖 칸은 그림자를 안 드리운다(castNear)
  let rockBudget=3;                                  // 노는 중에는 한 프레임에 바위 칸 셋까지만 빚는다
  for(const RG of act) for(const t of RG.rock){
    const g=tileGap(t,px,pz), want=g<=t.d;
    if(want&&!t.m){
      if(busy||rockBudget>0){ rockBudget--; t.m=t.build(); }
      else _tvForce=true;                              // 다음 프레임에 이어서
    }else if(t.m&&g>t.d+ROCK_KEEP){                    // 멀어졌다 — 버린다(다시 가까워지면 같은 모양으로 빚는다)
      propGroup.remove(t.m); t.m.geometry.dispose(); t.m=null;
      for(const p of t.ps){ p._batch=null; p._k=1; }
    }
    if(t.m&&(setVis(t.m,want&&!tileOcc(t,8))|castNear(t.m,g<=SHR))) LIGHT.dirtyAt(t.cx,t.cz,t.r);   // 산 너머의 바위 칸은 거른다
  }
  const QK=QUAL.k;
  for(const RG of act) for(const t of RG.prop){ const d=tileGap(t,px,pz), v=d<=t.d*QK&&tileSeen(t,d,6);
    let f=false; for(const m of t.ms){ if(setVis(m,v)) f=true; if(castNear(m,d<=SHR)) f=true; }
    if(f) LIGHT.dirtyAt(t.cx,t.cz,t.r); }
  /* 참나무·전나무 — 그루마다 단계(위 'TL'). 사람이 0.7 m 넘게 움직였거나 품질이 바뀌면 단계를 다시 고르고,
     바뀐 칸만 다시 채운다(가까운 칸부터 · 노는 중엔 프레임마다 3 ms 남짓). 원본은 한 프레임에 한 칸, 솎은 자료는 3 ms 씩 짓는다 */
  _treeBudget=1;
  const tlMv=(px-TL.px)**2+(pz-TL.pz)**2>=TL.step*TL.step||QK!==TL.qk;
  if(tlMv){ if(QK!==TL.qk||(QK<0.7)!==TL.noShort) for(const RG of act) for(const t of RG.tree) if(t.lod){ t.lod.sig={}; t.lod.pend=true; }
    TL.px=px; TL.pz=pz; TL.qk=QK; TL.noShort=QK<0.7; }
  const fk=Math.max(QK,0.6), tl0=performance.now(), rq=[];
  for(let ri=0;ri<act.length;ri++){ const gone=ri>=nIn;
  for(const t of act[ri].tree){
    const d=tileGap(t,px,pz), L=t.lod||tlInit(t);
    L.seen=tileSeen(t,d); L.d=d;
    if(gone||d>TREE_DROP){ if(L.ready||L.np||t.built) tlDrop(t,true); L.want=false; if(gone) L.seen=false; continue; }   // 범위를 벗어났다 — 통째로 비운다
    /* 원본(제 가지 자료) — 45 m 안 그루가 있을 만한 칸만 짓고, 멀어지면 비운다 */
    if(!t.built&&d<=TL.full*fk+16){ if(busy||_treeBudget>0){ _treeBudget--; ensureTreeTile(t); L.ev=true; } else _tvForce=true; }
    else if(t.built&&!t.pin&&d>TL.full+80) dropTreeTile(t);
    /* 솎은 자료 — 그림에서 입체로 넘어가기 40 m 앞부터(가까운 칸은 기다리지 않고 한꺼번에) */
    if(!L.ready&&d<=COPY_DIST+40){
      let done=true;
      for(const p of t.ps){ if(p._thin) continue;
        if(!busy&&d>TL.full&&performance.now()-tl0>TL.der){ done=false; _tvForce=true; break; }
        p._thin=t.thin1(p); TL.stat.derive++; }
      if(done){ L.ready=true; L.ev=true; }
    }
    const was=L.want; L.want=L.ready&&d<=COPY_DIST*QK;
    if(L.want&&!was) L.ev=true;                                  // 그림에서 입체로 — 단계를 새로 고른다
    else if(!L.want&&L.np&&d>COPY_DIST+30) tlDrop(t,false);      // 그림이 된 지 오래 — 묶음(GPU)은 놓고 솎은 자료만 둔다
    if(L.want){ if(tlMv||L.ev){ L.ev=false; if(tlEval(t,px,pz,QK)) L.pend=true; } if(L.pend) rq.push(t); }
  }
  }
  /* 다시 채우기 — 가까운 칸부터 */
  if(rq.length){ rq.sort((a,b)=>a.lod.d-b.lod.d); const t1=performance.now();
    for(const t of rq){ if(!busy&&rq[0]!==t&&performance.now()-t1>TL.pack){ _tvForce=true; break; }
      t.lod.pend=false; if(tlRepack(t)) LIGHT.dirtyAt(t.cx,t.cz,t.r); TL.stat.pack++; }
    TL.stat.packMs=performance.now()-t1; }
  /* 보이기 — 입체 칸은 묶음을, 그 밖(또는 솎은 자료가 아직 없는 칸)은 그림 판때기를 */
  for(const RG of act) for(const t of RG.tree){ const L=t.lod; if(!L) continue;
    const show=L.want&&L.seen, sn=L.d<=SHR; let f=false;
    for(const k in L.packs){ const m=L.packs[k]; if(setVis(m,show&&m.count>0)) f=true; if(castNear(m,sn)) f=true; }
    if(t.bb){ if(setVis(t.bb,L.seen&&L.d<=VIEW_DIST&&!L.want)) f=true; if(castNear(t.bb,sn)) f=true; }
    if(f) LIGHT.dirtyAt(t.cx,t.cz,t.r);
  }
}
/* 보이기를 바꿨으면 참 — 바뀐 칸만 그림자 지도를 다시 그리게 알린다 */
function setVis(m,v){ if(m.visible===v) return false; m.visible=v; return true; }
/* **해 그림자 상자 밖의 칸은 그림자를 안 드리운다** — 칸 메시는 화면 거르기를 꺼 두어(frustumCulled false — 인스턴스가 칸 밖으로
   삐져나온다) 그림자 지도를 그릴 때도 보이는 칸 전부가 그려졌다. 상자는 사람 둘레 36~64 m 인데, 125 m 밖 나무 복제·200 m 밖
   바위까지 그림자 지도에 그렸다(숲에서 그림자 한 번에 5 ms — FPS 측정). 칸 가장자리가 상자 반경 + 8 m 밖이면 드리우기를 끈다.
   배역(LIGHT.apply)이 드리우게 한 것만 다시 켠다(`_cast0`). 바뀌었으면 참 */
function castNear(m,near){ if(!m||m._cast0===undefined) return false; const v=near&&m._cast0; if(m.castShadow===v) return false; m.castShadow=v; return true; }
/* 광물별 생김새 배합.
   amp  혹의 세기 · bump 혹의 잔주름 수(주파수 상한) · nb 혹 개수
   cuts 잘라 낼 평면 수 · deep 평면이 파고드는 깊이(0.72 면 반지름의 0.72 까지 깎는다)
   cube 정육면체로 당기는 정도(방연석의 정벽 쪼개짐)
   smooth 굽은 자리를 둥글리는 정도(0 이면 면마다 각진다). **깎인 면은 이 값과 무관하게
          늘 각진다** — 자르기 평면 위에 나란히 놓인 삼각형은 따로 가려낸다
   flat 위아래로 누르는 정도(1 이면 안 누른다) · st 축별 신축 폭 */
/* **둥근 바위에 깨진 면 몇 장** — 꼭짓점마다 들쭉날쭉 밀어 면마다 각지게 세운 낮은 다각형 바위(sh 1 · jit · smooth 0)는
   가까이서 삼각형 조각이 그대로 보였다(사용자 지적: 사면체 메시가 멋없다). 이제 껍질을 곱게 쪼개(sh 2~3) 굽은 자리는
   법선을 이어 매끈하게 두고, **자르기 평면이 지나간 자리만** 각지게 남긴다 — 빛이 둥근 면에서는 부드럽게 넘어가고
   깨진 면에서 또렷이 꺾인다.
   sh  껍질 단계(1 = 80면 · 2 = 180면 · 3 = 320면)   jit 꼭짓점마다 반지름을 흔드는 폭(안 쓴다) */
const HABIT={
  // 화강암 — 둥글게 닳은 큰 덩어리. 크게 쪼개진 면이 두어 장, 넓적하게 앉는다
  granite :{amp:0.17,bump:2.6,nb:4,cuts:3,deep:0.84,cube:0.00,smooth:0.94,flat:0.76,st:0.34,sh:4,rough:0.11},   // 잔 울퉁불퉁이 보이게 4단계(500면)
  // 부싯돌 — 조개 껍질처럼 움푹한 날카로운 조각. 면이 적고 깊게 깎인다
  flint   :{amp:0.14,bump:3.0,nb:3,cuts:5,deep:0.60,cube:0.00,smooth:0.90,flat:0.80,st:0.40,sh:1},
  // 자갈 — 물에 닳은 조약돌. 거의 안 깨진다
  pebble  :{amp:0.20,bump:3.2,nb:3,cuts:1,deep:0.92,cube:0.00,smooth:1.00,flat:0.70,st:0.34,sh:1},
  // 방연석 — 정육면체로 쪼개진다. 계단처럼 어긋난 면
  galena  :{amp:0.08,bump:2.4,nb:2,cuts:4,deep:0.82,cube:0.82,smooth:0.80,flat:0.94,st:0.22,sh:2},
  // 황 — 포도송이처럼 둥근 혹이 엉긴 껍질. 잔혹이 많고 안 잘린다
  sulfur  :{amp:0.34,bump:9.0,nb:6,cuts:0,deep:1.00,cube:0.00,smooth:1.00,flat:0.72,st:0.28,sh:3},
  // 진사 — 바위에 얇게 앉은 딱지. 납작하게 눌리고 가장자리가 깨져 있다
  cinnabar:{amp:0.18,bump:4.0,nb:3,cuts:3,deep:0.78,cube:0.00,smooth:0.92,flat:0.50,st:0.34,sh:2},
  // 석탄 — 결을 따라 판으로 깨진다. 넓은 면 여럿에 살짝 납작
  coal    :{amp:0.10,bump:3.0,nb:3,cuts:5,deep:0.76,cube:0.25,smooth:0.90,flat:0.70,st:0.32,sh:2},
  // 자철석 · 공작석 · 주석석 · 섬아연석 — 모암에 박힌 광맥 덩이.
  // 둥근 바탕에 깨진 면이 몇 장 섞인다
  iron    :{amp:0.16,bump:3.2,nb:3,cuts:3,deep:0.84,cube:0.00,smooth:0.92,flat:0.82,st:0.34,sh:2},
  copper  :{amp:0.18,bump:3.6,nb:3,cuts:2,deep:0.86,cube:0.00,smooth:0.94,flat:0.80,st:0.36,sh:2},
  tin     :{amp:0.15,bump:3.0,nb:3,cuts:4,deep:0.82,cube:0.00,smooth:0.92,flat:0.84,st:0.34,sh:2},
  zinc    :{amp:0.14,bump:3.0,nb:3,cuts:4,deep:0.80,cube:0.20,smooth:0.92,flat:0.82,st:0.32,sh:2},
  /* 지형 판 6 의 바위(10-worldgen.js surfaceRocks)
     현무암 — 용암이 식으며 오그라들어 기둥 결로 갈라진다. 모난 면이 많고 위가 평평하다
     석회암 — 빗물에 녹아 둥글게 닳고 잔 구멍이 숭숭하다
     사암   — 모래가 켜로 굳었다. 납작한 판이 포개진 꼴 */
  basalt  :{amp:0.07,bump:2.4,nb:2,cuts:6,deep:0.80,cube:0.35,smooth:0.86,flat:0.92,st:0.24,sh:3},
  karst   :{amp:0.20,bump:4.2,nb:5,cuts:2,deep:0.86,cube:0.00,smooth:0.96,flat:0.72,st:0.36,sh:3,rough:0.12},
  sandstone:{amp:0.10,bump:2.2,nb:3,cuts:3,deep:0.80,cube:0.15,smooth:0.90,flat:0.55,st:0.40,sh:3}
};
const HABIT0={amp:0.24,bump:5.0,nb:3,cuts:0,deep:1,cube:0,smooth:0.90,flat:1,st:0.36};

/* 나무 한 그루를 옆에서 찍어 임포스터 그림으로 — 가지·잎 인스턴스를 그 나무 몫만 떼어
   임시 장면에 세우고, 정투영 카메라로 256×512 에 한 번 그린다. 알파는 잎이 있는 자리만 1.
   조명은 고르게(환경광 + 위에서 약하게) — 판때기가 게임 안에서 다시 램버트로 빛을 받는다. */
function bakeTreeImpostor(list,kind){
  const p=list.find(q=>Math.abs(q.s-1)<0.08&&q._lb)||list.find(q=>q._lb);
  if(!p) return null;
  const n=p.limbN, LPB=LEAF_PER[kind]||1, M=new THREE.Matrix4(), v=new THREE.Vector3();
  const lm0=p._lb, fm0=p._lf;
  const lm=new THREE.InstancedMesh(lm0.geometry,new THREE.MeshLambertMaterial({color:lm0.material.color}),n);
  const fmat=fm0.material.map
    ? new THREE.MeshLambertMaterial({map:fm0.material.map,alphaTest:0.5,side:THREE.DoubleSide})
    : new THREE.MeshLambertMaterial({color:fm0.material.color,side:THREE.DoubleSide});
  const fm=new THREE.InstancedMesh(fm0.geometry,fmat,n*LPB);
  const off=new THREE.Matrix4().makeTranslation(-p.x,-p.y,-p.z);
  const box=new THREE.Box3(); const pt=new THREE.Vector3(), q=new THREE.Quaternion(), sc=new THREE.Vector3();
  for(let j=0;j<n;j++){
    getLimbM(p,j,M); M.premultiply(off); lm.setMatrixAt(j,M);
    M.decompose(pt,q,sc); if(sc.y>0){ box.expandByPoint(pt); v.set(0,1,0).applyQuaternion(q).multiplyScalar(sc.y).add(pt); box.expandByPoint(v); }
    for(let k=0;k<LPB;k++){ instGetM(fm0,(p._lbBase+j)*LPB+k,M); M.premultiply(off); fm.setMatrixAt(j*LPB+k,M);
      M.decompose(pt,q,sc); if(sc.x>0) box.expandByScalar(0), box.expandByPoint(pt); }
  }
  if(box.isEmpty()) return null;
  box.expandByScalar(0.35*p.s);              // 잎 판때기 반 폭만큼
  /* 줄기도 그림에 넣는다 — 줄기 메시는 칸마다 TRUNK_DIST 까지만 그리므로(그 밖은 끈다) 그림 판때기가
     넘겨받는 거리부터는 그림 속 줄기가 대신한다. 두 거리를 맞춰 둬서 겹쳐 깜빡이지 않는다. */
  let trunk=null;
  if(p._tm){
    const tm=new THREE.Matrix4(); p._tm.getMatrixAt(p._fi,tm); tm.premultiply(off);
    trunk=new THREE.Mesh(p._tm.geometry,new THREE.MeshLambertMaterial({color:p._tm.material.color}));
    trunk.matrixAutoUpdate=false; trunk.matrix.copy(tm);
    p._tm.geometry.computeBoundingBox();
    const tb=p._tm.geometry.boundingBox.clone().applyMatrix4(tm); tb.min.y=Math.max(tb.min.y,0);
    box.union(tb);
  }
  const hw=Math.max(Math.abs(box.min.x),box.max.x,Math.abs(box.min.z),box.max.z);
  const y0=Math.max(0,box.min.y), y1=box.max.y;
  const sc0=new THREE.Scene();
  sc0.add(lm); sc0.add(fm); if(trunk) sc0.add(trunk);
  sc0.add(new THREE.AmbientLight(0xffffff,0.72));
  const dl=new THREE.DirectionalLight(0xffffff,0.45); dl.position.set(0.3,1,0.6); sc0.add(dl);
  const cam=new THREE.OrthographicCamera(-hw,hw,y1,y0,-50,50); cam.position.set(0,0,20); cam.lookAt(0,0,0);
  cam.position.set(0,0,20); cam.updateMatrixWorld();
  const W=256,H=512;
  const rt=new THREE.WebGLRenderTarget(W,H,{format:THREE.RGBAFormat,depthBuffer:true});
  rt.texture.generateMipmaps=true; rt.texture.minFilter=THREE.LinearMipmapLinearFilter;
  const oc=renderer.getClearColor(new THREE.Color()), oa=renderer.getClearAlpha(), ot=renderer.getRenderTarget(), osh=renderer.shadowMap.enabled;
  renderer.shadowMap.enabled=false;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x2c3a22,0); renderer.clear(true,true,true);
  renderer.render(sc0,cam);
  renderer.setRenderTarget(ot); renderer.setClearColor(oc,oa); renderer.shadowMap.enabled=osh;
  lm.material.dispose(); fmat.dispose(); lm.dispose&&lm.dispose(); fm.dispose&&fm.dispose();
  const s=p.s;
  return {tex:rt.texture, rt, can:{y0:y0/s, y1:y1/s, w:2*hw/s}};
}
/* ── 먼 나무 = 기준 나무 복제 ─────────────────────────────────────────────
   55 m 밖 나무를 그림 판때기(임포스터) 대신 **진짜 나무 한 그루를 그대로 복제한 입체**로 그린다.
   상륙 직후 사람에게서 가장 가까운 참나무·전나무 한 그루씩을 기준으로 삼고(`FAR_REF`), 그 나무의
   가지·잎 인스턴스를 제 밑동 기준 좌표로 옮겨 **한 덩어리 지오메트리로 굳힌다.** 먼 나무는 종류에 따라
   그 덩어리를 제 자리·크기(q.s/기준.s)·방향으로 한 번씩 찍는다(칸마다 가지·잎 인스턴스 메시 둘).
   줄기는 나무마다 제 것이 늘 그려진다. 기준 나무 자신은 복제본이 곧 제 모습이라 멀어져도 그대로다.
   삼각형: 참나무 한 그루 약 1.8만(가지 3각 기둥 6 · 잎 판 4) — 55~150 m 에 선 나무 수만큼 곱해진다. */
/* 복제 단계마다 [가지 몫, 잎 몫] — 가까운 것(칸 테두리 10 m 밖 ~ 55 m) · 55~90 m · 90~150 m.
   예전 값(0.6·0.3·0.1)은 창 크기 그대로 그리던 때의 것이다. 캠코더 화면(세로 480줄)에서는 40 m 밖 나무가 100 화소 남짓이라
   잔가지가 화소 하나보다 가늘다 — 몫을 절반쯤으로 줄여도 윤곽은 같다 */
/* **광석은 땅에 박혀 있다**(사용자 요청) — 노두가 땅 위에 얹힌 돌처럼 보였다. 가운데를 반지름의 0.20 높이까지만 올리고(예전 0.5),
   밑동이 땅 빛깔로 녹아드는 띠를 두 배 가까이 높인다. 화강암 노두·자갈·부싯돌은 그대로 */
const ORE_LODGE={iron:1,copper:1,tin:1,zinc:1,galena:1,coal:1,sulfur:1,cinnabar:1};
const FAR_REF={}, FULL_DIST=25;   // FAR_REF — 그림 판때기를 찍는 기준 나무 · FULL_DIST — 새 식물(95-flora.js) 머리말이 쓰는 이름
/* ── 칸 메시의 경계구 ────────────────────────────────────────────────────
   r128 의 InstancedMesh 는 거르기(frustumCulled)를 끈 채 태어나고, 켜도 **밑 지오메트리 한 개**의 경계구로 잰다
   (인스턴스가 흩어진 넓이를 모른다). 그래서 칸 메시(나무 가지·잎·복제·판때기 · 풀·갈대·자갈·베리…)는 늘 통째로
   그려졌다 — 화면 밖이어도, 그림자 지도에도. 불 그림자(정육면체 여섯 면 · 사거리 24 m)를 한 번 그릴 때마다
   보이는 칸 전부(706만 삼각형)를 여섯 번 그렸다.
   섬을 다 지은 뒤(`generateWorld` 가 `buildFarTrees` 바로 뒤에) 칸 메시마다 **인스턴스로 실제 경계구**를 재서 달고 거르기를 켠다.
   시야 · 해 그림자 상자 · 불 사거리 밖에 **통째로** 있는 칸만 빠지므로 화면은 그대로다.
   구는 넉넉하게 — 인스턴스마다 '자리 + (밑 구 중심까지 + 반지름) × 가장 큰 크기' 에 셰이더가 미는 몫 2 m 를 더한다.
   일반 인스턴스 메시는 늘 감싸개(속성·인덱스는 그대로 나눠 씀)를 씌워 구를 단다 — 밑 지오메트리는 칸끼리(또는 다른 물체와)
   나눠 쓰므로 건드리지 않는다. 압축 메시(`instMesh`)는 지오메트리가 칸마다 제 것이라 구만 새로 단다.
   인스턴스는 그 뒤로 줄기만 한다(캐기 · 벌목 · 다시 자람은 처음 크기까지) — 처음 구가 늘 넉넉하다.
   **칸 메시를 새로 만들거나 인스턴스를 처음보다 크게·멀리 옮기면 `boundTiles()` 를 다시 부를 것.** */
const BOUND_PAD=2;
function boundTiles(){
  if(!propGroup) return;
  let nb=0;
  for(const m of (propGroup._all||propGroup.children)) if(boundMesh(m)) nb++;      // 숨은 것까지(children 은 보이는 것만이다)
  return nb;
}
/* 인스턴스 메시 하나의 경계구 — 섬을 다 지은 뒤 한꺼번에(boundTiles), 또는 나무 칸을 뒤늦게 지을 때(tile.build) */
function boundMesh(m){
  {
    if(!m.isInstancedMesh||m.userData.noCull) return false;
    const n=m.count; if(!n) return false;
    let g=m.geometry;
    if(!g.boundingSphere) g.computeBoundingSphere();
    const s0=g.boundingSphere, k0=s0.center.length()+s0.radius;
    const A=m.iA?m.iA.array:null, B=m.iB?m.iB.array:null, E=A?null:m.instanceMatrix.array;
    let x0=Infinity,y0=Infinity,z0=Infinity,x1=-Infinity,y1=-Infinity,z1=-Infinity;
    const at=new Float64Array(4);
    const get=i=>{
      if(A){ const o=i*4; at[0]=A[o]; at[1]=A[o+1]; at[2]=A[o+2]; at[3]=k0*Math.max(Math.abs(A[o+3]),Math.abs(B[o+3])); }
      else{ const o=i*16;
        /* Math.hypot 은 인자를 배열로 받아 느리다 — 인스턴스 수백만 개에 여섯 번씩 부르던 것이 1.3초였다 */
        const sx=Math.sqrt(E[o]*E[o]+E[o+1]*E[o+1]+E[o+2]*E[o+2]), sy=Math.sqrt(E[o+4]*E[o+4]+E[o+5]*E[o+5]+E[o+6]*E[o+6]),
              sz=Math.sqrt(E[o+8]*E[o+8]+E[o+9]*E[o+9]+E[o+10]*E[o+10]);
        at[0]=E[o+12]; at[1]=E[o+13]; at[2]=E[o+14]; at[3]=k0*Math.max(sx,sy,sz); }
      return at;
    };
    for(let i=0;i<n;i++){ const v=get(i), r=v[3];
      if(v[0]-r<x0) x0=v[0]-r; if(v[0]+r>x1) x1=v[0]+r;
      if(v[1]-r<y0) y0=v[1]-r; if(v[1]+r>y1) y1=v[1]+r;
      if(v[2]-r<z0) z0=v[2]-r; if(v[2]+r>z1) z1=v[2]+r; }
    if(!(x1>=x0)) return false;
    const cx=(x0+x1)/2, cy=(y0+y1)/2, cz=(z0+z1)/2; let R=0;
    for(let i=0;i<n;i++){ const v=get(i); const ax=v[0]-cx, ay=v[1]-cy, az=v[2]-cz, d=Math.sqrt(ax*ax+ay*ay+az*az)+v[3]; if(d>R) R=d; }
    if(!m.iA&&!g.userData._bnd){                   // 감싸개 — 밑 지오메트리는 칸끼리(또는 다른 물체와) 나눠 쓰므로 건드리지 않는다
      const w=new THREE.BufferGeometry(); w.userData._bnd=1;
      for(const k in g.attributes) w.setAttribute(k,g.attributes[k]);
      if(g.index) w.setIndex(g.index);
      for(const gr of g.groups) w.addGroup(gr.start,gr.count,gr.materialIndex);
      w.drawRange.start=g.drawRange.start; w.drawRange.count=g.drawRange.count;
      m.geometry=g=w;
    }
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,cy,cz),R+BOUND_PAD);   // 새 구(압축 메시는 밑 구를 나눠 썼다)
    m.frustumCulled=true;
  }
  return true;
}
function buildFarTrees(){
  _tvForce=true;                             // 칸에 그림이 새로 붙는다 — 보이기를 다시 센다
  if(!TREE_TILES.length) return;
  const px=PL.pos.x, pz=PL.pos.z;
  /* 125 m(`COPY_DIST`) 밖 칸은 **기준 나무 한 그루를 찍은 그림**(임포스터) — 450 m 까지 입체로 세우면 나무 수천 그루 ×
     수천 삼각형으로 수천만이 되어 헤드리스가 죽었다(실제 그래픽 카드도 못 버틴다). 그 안은 그루마다 제 것(위 'TL') */
  for(const kind of ['oak','fir']){
    let best=null, bd=1e18;
    for(const t of TREE_TILES) if(t.kind===kind) for(const p of t.ps){
      if(p.felled) continue;
      const d=(p.x-px)**2+(p.z-pz)**2; if(d<bd){ bd=d; best=p; }
    }
    if(!best) continue;
    ensureTreeTile(best._tile); best._tile.pin=true;   // 기준 나무의 칸은 가지가 있어야 본을 뜬다 — 비우지도 않는다
    FAR_REF[kind]={p:best};
  }
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler();
  const bak={};
  if(renderer) for(const kind in FAR_REF){ const bk=bakeTreeImpostor([FAR_REF[kind].p],kind); if(bk) bak[kind]=bk; }
  for(const t of TREE_TILES){
    const bk=bak[t.kind]; if(!bk||!t.bb) continue;
    const bm=t.bb.material; bm.map=bk.tex; bm.alphaTest=0.35; bm.needsUpdate=true;
    if(t.bb.customDepthMaterial){ const dm=t.bb.customDepthMaterial; dm.map=bk.tex; dm.alphaTest=0.35; dm.needsUpdate=true; }
    for(const q of t.ps){                                     // 그림 판때기 — 그루마다 방향·크기
      const yaw=q===FAR_REF[t.kind].p?0:((q._hash>>>9)%628)/100;
      E.set(0,yaw,0); Q.setFromEuler(E);
      _lbV.set(q.x, q.y+bk.can.y0*q.s, q.z);
      _lbS.set(q.felled?0:bk.can.w*q.s, q.felled?0:(bk.can.y1-bk.can.y0)*q.s, q.felled?0:bk.can.w*q.s);
      M.compose(_lbV,Q,_lbS); t.bb.setMatrixAt(q._bbi,M);
    }
    t.bb.instanceMatrix.needsUpdate=true;
  }
}
function buildProps(){
  _tvForce=true;
  /* **비탈의 참나무·전나무는 밑동을 묻는다**(사용자 지적: 경사진 곳의 나무가 떠 있다) — 줄기 가운데의 땅 높이에 세우면 아래쪽 밑동이
     허공에 뜬다. 줄기 반지름(뿌리 퍼짐 포함 1.4배) × 기울기만큼 나무째 내린다(가지·잎도 같이 — p.y 를 한 번만 고친다 · 1.2 m 까지) */
  for(const p of PROPS) if((p.k==='oak'||p.k==='fir')&&p._sunk===undefined){
    const g=groundSlope(p.x,p.z,Math.max(0.5,0.6*p.s)), sl=Math.hypot(g[0],g[1]);
    p._sunk=Math.min(1.2*p.s,((p.k==='oak'?0.46:0.40)*p.s*1.4+0.1)*sl); p.y-=p._sunk; }
  TREE_TILES.length=0; ROCK_TILES.length=0; PROP_TILES.length=0;
  for(const k in ROCK_MAT) delete ROCK_MAT[k];
  if(propGroup){
    scene.remove(propGroup);
    (propGroup._all||propGroup.children).forEach(m=>{ m.geometry.dispose(); m.material.dispose(); });
  }
  propGroup=new THREE.Group(); propGroup.matrixAutoUpdate=false; scene.add(propGroup);
  /* 자식(칸 메시)이 수만 개다(6배 섬에서 7만) — Three 는 프레임마다 그 전부의 updateMatrixWorld 를 부른다. 굳힌 잎은 할 일이
     없는데도 **7만 개를 한 번씩 건드리는 것만으로 5~7 ms** 다(물체마다 메모리를 새로 읽는다). 그래서 전부를 훑지 않는다:
       · 새로 붙은 것(`_fresh`)은 다음 프레임에 한 번 센다. 굳힌 잎(자식이 없고 제 행렬을 스스로 안 고치는 것)이면 그것으로 끝이다.
       · 움직이는 것(제 행렬을 스스로 고치는 것 · 자식을 가진 것)은 `_live` 에 두고 예전처럼 프레임마다 센다.
       · 굳힌 잎을 뒤늦게 옮긴 것(updateMatrix 가 matrixWorldNeedsUpdate 를 세운다)은 프레임마다 1,500 개씩 돌아가며 살펴 잡는다
         (7만 개면 0.8 초에 한 바퀴 — 지금 그런 코드는 없다. 안전망이다).
     이 묶음도 장면도 안 움직인다(둘 다 제자리) — 그래서 위에서 내려오는 '강제'는 볼 필요가 없다 */
  /* **그릴 것만 children 에 둔다** — Three 는 프레임마다 장면의 자식을 다 훑는다: 그릴 것을 모을 때 한 번(`projectObject`), 그림자
     지도를 그릴 때마다 또 한 번. 자식이 7만 개면 꺼진 것을 '꺼졌네' 하고 넘기는 것만으로 프레임당 6 ms 였다(CPU 프로파일 —
     tools/prof-window.js). 그래서 **꺼진 자식은 children 에서 빼 둔다**: 자식마다 `visible` 을 접근자로 바꿔, 끄면 children 에서
     빠지고(끝 것과 자리를 바꿔 한 번에) 켜면 도로 든다. 코드 어디서 `m.visible=…` 을 쓰든 그대로 듣는다.
       · 전부는 `propGroup._all`(Set)에 있다 — 자식을 다 돌아야 하는 코드(굳히기 · 버리기 · 장면 훑기)는 이것을 쓴다.
         `propGroup.children` 은 **지금 보이는 것만**이다.
       · `traverse` 는 숨은 것까지 돈다(장면을 훑어 배역을 주는 LIGHT.refresh 따위가 다 보게). 떼어 내면 보통 속성으로 되돌린다 */
  propGroup._fresh=[]; propGroup._live=[]; propGroup._scan=0; propGroup._all=new Set();
  { const G=propGroup, add0=G.add;
    const hide=o=>{ const ch=G.children, i=o._ci; if(i<0) return; const last=ch[ch.length-1]; ch[i]=last; last._ci=i; ch.pop(); o._ci=-1; };
    const show=o=>{ if(o._ci>=0) return; o._ci=G.children.length; G.children.push(o); if(o.matrixAutoUpdate||o.matrixWorldNeedsUpdate||!o._mwSeen) G._fresh.push(o); };
    const VIS={configurable:true, enumerable:true, get(){ return this._pv; },
               set(x){ x=!!x; if(x===this._pv) return; this._pv=x; if(this._pg){ if(x) show(this); else hide(this); } }};
    G.add=function(o){
      if(arguments.length>1){ for(let i=0;i<arguments.length;i++) this.add(arguments[i]); return this; }
      if(!o||!o.isObject3D||o===this||o._pg===this) return this;
      const v=o.visible!==false;
      add0.call(this,o);                                // children 끝에 붙는다(LIGHT 의 갈고리도 여기서 돈다)
      o._pg=this; o._pv=v; o._ci=this.children.length-1; this._all.add(o);
      Object.defineProperty(o,'visible',VIS);
      this._fresh.push(o);
      if(!v) hide(o);
      return this; };
    G.remove=function(o){
      if(arguments.length>1){ for(let i=0;i<arguments.length;i++) this.remove(arguments[i]); return this; }
      if(!o||o._pg!==this) return this;
      hide(o); this._all.delete(o); o._pg=null; o.parent=null;
      { const pv=o._pv; delete o.visible; o.visible=pv; }       // 보통 속성으로 되돌린다
      if(o._mwLive){ const i=this._live.indexOf(o); if(i>=0) this._live.splice(i,1); o._mwLive=false; }
      if(o.castShadow) LIGHT.dirty();                   // 드리우던 것이 떨어졌다 — 그림자를 다시(Object3D.remove 의 갈고리가 하던 일)
      o.dispatchEvent({type:'removed'});
      return this; };
    G.traverse=function(cb){ cb(this); for(const o of this._all) o.traverse(cb); };
  }
  propGroup.updateMatrixWorld=function(){
    const fr=this._fresh, lv=this._live, ch=this.children;
    if(fr.length){ for(const c of fr){ if(c.parent!==this) continue; c.updateMatrixWorld(true); c._mwSeen=true;
        if((c.matrixAutoUpdate||c.children.length)&&!c._mwLive){ c._mwLive=true; lv.push(c); } }
      fr.length=0; }
    for(let i=lv.length-1;i>=0;i--){ const c=lv[i]; c.updateMatrixWorld(true);
      if(!c.matrixAutoUpdate&&!c.children.length){ c._mwLive=false; lv.splice(i,1); } }   // 그새 굳힌 것(freezeStatics)은 내려놓는다
    const n=ch.length; let k=this._scan;
    for(let i=Math.min(1500,n);i>0;i--){ if(k>=n) k=0; const c=ch[k++];
      if(c._mwLive) continue;
      if(c.matrixAutoUpdate||c.children.length){ c._mwLive=true; lv.push(c); }
      else if(c.matrixWorldNeedsUpdate) c.updateMatrixWorld(true); }
    this._scan=k;
  };
  propGroup.visible=showProps;
  COLLIDERS.length=0;

  /* ---- 잔디 포기: 얇은 사각뿔(잎날) 여러 장을 부채꼴로 세운다 ---- */
  /* 잎날은 포기 **바깥쪽으로** 눕는다 — 방위 a 쪽으로 tilt 만큼.
     예전엔 Euler(rx, ry=a, rz) 로 눕혔는데, 오일러는 Z→Y→X 차례로 돌므로 z 로 눕힌 것이 y 회전에 한 번 더
     돌아가 **모든 잎날의 x 성분이 +쪽(cos²a)** 이 됐다 — 뒤쪽 잎날이 포기 안쪽을 가로질러 앞으로 누워
     풀이 한쪽으로 쏠려 보였다. 이제 '제자리 돌리기(y) → 바깥 방향으로 눕히기' 를 사원수로 곧바로 짠다. */
  const _bUp=new THREE.Vector3(0,1,0);
  const blade=(a,tilt,h,w,r)=>{
    const out=new THREE.Vector3(Math.cos(a),0,Math.sin(a));           // 바깥 방향
    const axis=new THREE.Vector3().crossVectors(_bUp,out).normalize();  // 이 축으로 돌리면 +Y 가 바깥으로 눕는다
    const q=new THREE.Quaternion().setFromAxisAngle(axis,tilt)
             .multiply(new THREE.Quaternion().setFromAxisAngle(_bUp,-a));
    /* 뿔의 가운데가 원점이므로, 눕힌 뒤에도 밑동이 땅(포기 둘레 r)에 닿게 가운데를 옮긴다 */
    const hx=Math.sin(tilt)*h*0.5;
    return { g:new THREE.ConeGeometry(w,h,4,1,true),      // 밑면 없는 4각뿔 = 잎날 한 장
      x:Math.cos(a)*(r+hx), y:h*0.5*Math.cos(tilt)-0.02, z:Math.sin(a)*(r+hx), q };
  };
  const grassTuft=mergeParts([
    blade(0.0,  0.10, 0.78, 0.030, 0.02),
    blade(0.9,  0.34, 0.62, 0.026, 0.07),
    blade(1.9,  0.46, 0.50, 0.024, 0.10),
    blade(2.8,  0.26, 0.70, 0.028, 0.06),
    blade(3.7,  0.52, 0.44, 0.022, 0.11),
    blade(4.6,  0.30, 0.66, 0.026, 0.07),
    blade(5.5,  0.44, 0.55, 0.024, 0.09)
  ]);
  // 갈대: 같은 잎날 구조지만 키가 3~4배이고 거의 곧추선다.
  // 물가 식생이라 위쪽만 살짝 휜다.
  const reedTuft=mergeParts([
    blade(0.0,  0.05, 2.55, 0.045, 0.03),
    blade(0.7,  0.13, 2.20, 0.042, 0.08),
    blade(1.4,  0.20, 1.85, 0.038, 0.13),
    blade(2.1,  0.09, 2.40, 0.044, 0.06),
    blade(2.8,  0.24, 1.60, 0.036, 0.15),
    blade(3.5,  0.15, 2.05, 0.040, 0.10),
    blade(4.2,  0.07, 2.30, 0.043, 0.05),
    blade(4.9,  0.27, 1.45, 0.034, 0.16),
    blade(5.6,  0.17, 1.95, 0.039, 0.11)
  ]);

  /* ---- 나무: 수관 덩어리를 쓰지 않고 가지만으로 형태를 만든다.
         · 전나무 — 아래 가지가 길고 위로 갈수록 짧아져 원뿔이 된다
         · 참나무 — 줄기 윗부분에서만 가지가 사방으로 뻗어 둥근 우듬지가 된다
         가지 하나하나가 인스턴스라 꺾으면 실제로 그 가지가 사라진다. ---- */
  // 길이 1, 밑동이 원점, +Y 로 뻗는 가지. 방향과 길이는 인스턴스에서 준다
  // 가지가 빽빽해지므로 단면을 3각으로 낮춰 정점 수를 아낀다
  /* 가지는 곧은 원기둥이 아니다 — 마디 여섯으로 쪼개 위로 휘고(빛을 찾아 굽는다) 옆으로 살짝
     S 자로 굽힌다. 굽힘은 양 끝에서 0 이라 밑동·끝 자리는 그대로다(곁가지·잎이 붙는 자리가 안 바뀐다).
     굽는 폭은 가지 굵기 단위(인스턴스가 x·z 를 굵기로 늘린다) — 굵은 원가지일수록 크게 굽는다.
     단면은 4각, 마디마다 굵기를 ±8% 흔들어 옹이 진 결을 낸다. */
  /* FPS: 마디 여섯 → 셋(48 → 24 삼각형). 숲에서 사람이 든 칸의 긴 가지만 81만 삼각형이었다(한 프레임 380만 가운데). 굽힘(활 · S 자)은
     마디 셋의 네 고리로도 그대로 잡힌다. 단면 4각은 그대로라 가까이서의 모양은 같다 */
  const limbUnit=(()=>{
    const g=new THREE.CylinderGeometry(0.5,1,1,4,3,true); g.translate(0,0.5,0);
    return gnarl(g,(t,th,r)=>[r*(1+0.08*Math.sin(th*2+t*9)), 1.25*Math.sin(Math.PI*t), 0.5*Math.sin(2*Math.PI*t)]);
  })();
  /* 짧은 가지(SHORT_LIMB 밑) — 3각 2마디, 활 모양만. 12 삼각형 */
  /* FPS: 마디 둘 → 하나(12 → 6 삼각형) — 사람이 든 칸에 2.6만 개다. 잔가지는 짧아 굽힘이 거의 안 보인다 */
  const limbShort=(()=>{
    const g=new THREE.CylinderGeometry(0.5,1,1,3,1,true); g.translate(0,0.5,0);
    return gnarl(g,(t,th,r)=>[r, 1.25*Math.sin(Math.PI*t), 0]);
  })();
  /* 성긴 가지판 — 3각 3마디로 같은 활 모양만(18 삼각형 · 촘촘한 것은 24). 18~45 m 의 제 가지와 솎은 단계가 쓴다(TL) */
  const limbLo=(()=>{
    const g=new THREE.CylinderGeometry(0.5,1,1,3,3,true); g.translate(0,0.5,0);
    return gnarl(g,(t,th,r)=>[r, 1.25*Math.sin(Math.PI*t), 0]);
  })();
  /* ---- 잎 ----------------------------------------------------------------
     예전에는 정20면체 공 하나였다. 멀리서는 수관으로 읽히는데 가까이 가면
     초록 자갈이 가지 끝에 박힌 꼴이었다.

     이제 잎을 실제로 만든다. 한 장은 가운데 잎맥이 솟은 얕은 V 판이고,
     그것을 가지 끝에 부챗살로 여러 장 모아 한 덩이로 굳힌다.
     참나무는 끝이 둥근 넓은 잎 넉 장, 전나무는 가는 바늘잎 스물일곱 개를
     가지에 붙어 뒤로 눕도록 단다.                                        */
  /* ---- 참나무 잎: 알파 카드 --------------------------------------------
     잎을 삼각형으로 빚던 것을 그만두었다. 한 장이 56면이었고 가지마다
     다섯 장이 달려 나무 한 그루에 19만 면이 잎으로만 들었다 —
     100 m 밖에서 60×120 픽셀을 차지하는 물건에 픽셀당 27면이다.

     현실 엔진(UE4 폴리지·SpeedTree 따위)이 나뭇잎을 다루는 방식은
     **잎 한 줌을 그린 투명 그림을 판때기에 붙이는 것**이다. 잎 모양도
     잎맥도 가장자리의 들쭉날쭉함도 전부 그림 안에 있고, 기하는 판때기뿐이다.

     여기서도 같이 한다. 그림은 **캔버스에 그려서 만든다** — 접지 그림자를
     만드는 makeShadowTex 와 같은 방식이라 바깥 파일이 늘지 않는다.
     판때기는 십자로 두 장 겹친다(4면) — 한 장이면 옆에서 볼 때 사라진다.
     잎 한 덩이 56면 → 4면. */
  function makeLeafTex(){
    const S=256, c=document.createElement('canvas'); c.width=c.height=S;
    const g=c.getContext('2d');
    const rnd=mulberry32(hashStr('oakleaf'));
    /* 잎 한 장 — 밑동에서 위로 뻗는 타원. 끝이 뭉툭하다.
       주맥을 한 줄 긋고 곁맥을 다섯 쌍 앞쪽으로 비스듬히 낸다. */
    const leaf=(x,y,len,w,ang,body,vein)=>{
      g.save(); g.translate(x,y); g.rotate(ang);
      g.beginPath();
      g.moveTo(0,0);
      g.bezierCurveTo( w,-len*0.26,  w*0.74,-len*0.84, 0,-len);
      g.bezierCurveTo(-w*0.74,-len*0.84, -w,-len*0.26, 0,0);
      g.closePath();
      g.fillStyle=body; g.fill();
      g.clip();               // 잎맥은 잎 안에서만 — 안 자르면 곁맥 끝·둥근 붓끝이 테두리 밖으로 삐져 알파 카드에 가시처럼 남았다
      g.strokeStyle=vein; g.lineCap='round';
      g.lineWidth=Math.max(1.1,len*0.030);
      g.beginPath(); g.moveTo(0,-len*0.02); g.lineTo(0,-len*0.94); g.stroke();
      g.lineWidth=Math.max(0.9,len*0.016);
      for(let i=1;i<=5;i++){
        const t=i/6, yy=-len*t, ww=w*(0.52+0.48*Math.sin(Math.PI*t))*0.84;
        g.beginPath(); g.moveTo(0,yy); g.lineTo( ww, yy-len*0.10); g.stroke();
        g.beginPath(); g.moveTo(0,yy); g.lineTo(-ww, yy-len*0.10); g.stroke();
      }
      g.restore();
    };
    /* 한 줌 — 아래쪽 한 점에서 부챗살로 아홉 장. 잎마다 빛깔을 조금씩
       달리해야 한 덩이가 단색 얼룩으로 안 보인다. */
    const BODY=['#3d5a2c','#456133','#4e6b37','#395427','#51733a'];
    const VEIN=['#859c45','#7b9140','#90a74e'];
    for(let i=0;i<9;i++){
      const t=i/8;
      const ang=(t-0.5)*2.15 + (rnd()-0.5)*0.22;
      const len=S*(0.40+rnd()*0.22), w=len*(0.30+rnd()*0.10);
      leaf(S*(0.5+(rnd()-0.5)*0.16), S*(0.96-rnd()*0.10), len, w, ang,
           BODY[(rnd()*BODY.length)|0], VEIN[(rnd()*VEIN.length)|0]);
    }
    const tx=new THREE.CanvasTexture(c);
    tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping;
    return tx;
  }
  /* 십자로 겹친 판때기 두 장. 밑동이 원점, +Y 로 뻗는다 */
  /* 십자 판때기 — **인덱스 지오메트리**(판 하나에 정점 넷 · 세모 둘). 예전엔 세모마다 정점 셋을 따로 둬서
     정점 셰이더(램버트는 조명을 정점에서 센다)가 판 하나에 여섯 번 돌았다 — 이제 네 번이다. */
  function leafCard(hw,h){
    const pos=[], uv=[], idx=[];
    const quad=(a,b,c2,d)=>{
      const o=pos.length/3;
      for(const [q,u] of [[a,[0,0]],[b,[1,0]],[c2,[1,1]],[d,[0,1]]]){ pos.push(q[0],q[1],q[2]); uv.push(u[0],u[1]); }
      idx.push(o,o+1,o+2, o,o+2,o+3);
    };
    quad([-hw,0,0],[hw,0,0],[hw,h,0],[-hw,h,0]);          // XY 면
    quad([0,0,-hw],[0,0,hw],[0,h,hw],[0,h,-hw]);          // ZY 면
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  /* 전나무 바늘잎 — 2.6 cm 굵기에서는 뭉툭한 끝이 안 보인다.
     밑동이 넓고 끝이 한 점으로 모이는 **삼각형 한 장**이면 그대로 바늘이다.
     장수를 세 배로 늘리는 값을 여기서 치른다 — 한 장이 예전의 1/4 이라
     스물일곱 장이 예전 아홉 장보다도 싸다(27면 대 36면). */
  function needle(w,len){
    const v=[ -w,0,0,  w,0,0,  0,len,0 ];
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    g.computeVertexNormals();
    return g;
  }
  function leafSpray(kind){
    /* 참나무는 판때기 하나가 곧 한 인스턴스다. mergeParts 는 uv 를 옮기지
       않으므로 거치지 않고 그대로 쓴다. */
    if(kind==='oak') return leafCard(0.60,1.35);
    /* 바늘잎 — 가지를 따라 뒤로 눕는 솔이다. 두 줄로 갈라 붙여
       가까이서 보면 잎이 마주나는 결이 보인다. 열네 개를 한 다발로 굳혀
       가지 끝에 하나 단다. */
    const parts=[], N=14;
    for(let i=0;i<N;i++){
      const t=i/(N-1), side=(i%2)?1:-1;
      parts.push({g:needle(0.026,0.88),
                  y:-0.58+t*1.12, ry:i*1.21+(side>0?0:Math.PI),
                  rz:1.16+side*0.16+t*0.10+((i%3)-1)*0.09,
                  s:0.82+0.34*(1-Math.abs(t-0.5)*2)});
    }
    return mergeParts(parts);
  }
  const leafUnitOak=leafSpray('oak'), leafUnitFir=leafSpray('fir');
  const leafTexOak=makeLeafTex();
  /* ---- 멀리서 쓸 수관 임포스터 -------------------------------------------
     55 m 밖에서는 가지도 잎도 그리지 않고 이 판때기 하나로 갈음한다.
     수관 덩이를 여럿 겹쳐 그려 윤곽을 만든다 — 참나무는 둥글게 퍼지고
     전나무는 층층이 좁아지는 원뿔이다. 줄기는 안 그린다(진짜 줄기가
     늘 그려지므로 겹치면 깜빡인다).                                      */
  function makeTreeTex(kind){
    const S=256, c=document.createElement('canvas'); c.width=c.height=S;
    const g=c.getContext('2d');
    const rnd=mulberry32(hashStr('tree|'+kind));
    const blob=(x,y,r,col)=>{
      g.beginPath();
      /* 매끈한 원이 아니라 가장자리가 들쭉날쭉해야 잎덩이로 읽힌다 */
      for(let i=0;i<=14;i++){
        const a=i/14*6.283, rr=r*(0.72+rnd()*0.5);
        const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr*0.86;
        i?g.lineTo(px,py):g.moveTo(px,py);
      }
      g.closePath(); g.fillStyle=col; g.fill();
    };
    if(kind==='oak'){
      const COL=['#31491f','#3d5a2c','#456133','#4e6b37','#2b4019'];
      // 아래쪽이 넓고 위가 둥근 덩어리. 안쪽 짙은 것부터 겹쳐 올린다
      for(let i=0;i<46;i++){
        const t=rnd(), a=rnd()*6.283;
        const rx=S*0.40*Math.sqrt(rnd()), yy=S*(0.18+0.72*Math.pow(t,0.7));
        const x=S*0.5+Math.cos(a)*rx*(1-Math.abs(yy/S-0.5)*0.7);
        blob(x, yy, S*(0.07+rnd()*0.07), COL[(rnd()*COL.length)|0]);
      }
    }else{
      const COL=['#22392c','#2f4a3a','#375443','#1c3025'];
      // 층층이 — 아래 단이 넓고 위로 갈수록 좁아진다
      for(let tier=0;tier<7;tier++){
        const t=tier/6, yy=S*(0.93-t*0.80), wid=S*0.42*(1-t*0.82)+S*0.03;
        for(let i=0;i<9;i++){
          const x=S*0.5+(rnd()*2-1)*wid;
          blob(x, yy+(rnd()-0.5)*S*0.05, S*(0.05+rnd()*0.05),
               COL[(rnd()*COL.length)|0]);
        }
      }
    }
    const tx=new THREE.CanvasTexture(c);
    tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping;
    return tx;
  }
  const treeTexOak=makeTreeTex('oak'), treeTexFir=makeTreeTex('fir');
  const bbUnit=leafCard(0.5,1);     // 십자 판때기 — 크기는 인스턴스가 준다
  leafGeoTris.oak=leafUnitOak.attributes.position.count/3;
  leafGeoTris.fir=leafUnitFir.attributes.position.count/3;
  // n: 구조 가지 수 · y0~y1: 붙는 높이 · L0~L1: 밑/위 길이 · t0~t1: 밑/위 기울기
  // 가지 수를 늘린 만큼 잎뭉치와 굵기를 줄여 우듬지 부피는 유지한다
  const LD=P.limb;
  /* n 은 이제 줄기에서 바로 나오는 **원가지** 수다. 예전에는 이것이 곧 가지
     총수였는데(참나무 126·전나무 176), 가지 하나하나가 따로 서 있어 빗자루
     같았다. 원가지를 1/3 로 줄이고 그 대신 곁가지를 치게 했다 —
     곁가지가 평균 2.0개씩 더 붙으므로 총수는 예전과 비슷하다.
     잎은 더 이상 가지마다 달지 않는다. 곁가지가 없는 **끝가지**에만 달린다. */
  const TREE={
    oak:{form:'oak', sc:Math.max(5,Math.round(22.5*LD)), depth:3, y0:2.5, y1:4.9, L0:1.42, L1:1.18,
         rad:0.20, leaf:0.36, hy:2.50, hL:2.50, hT:1.32, space:0.58, brR:0.07},
    fir:{n:Math.round(89*LD), y0:2.20, y1:6.45, L0:2.20, L1:0.50, t0:1.36, t1:0.68,
         rad:0.036, leaf:0.40, hy:1.60, hL:2.40, hT:1.44, space:0.355}
  };
  TREE_N.oak=TREE.oak.sc; TREE_N.fir=TREE.fir.n;      // 검사용 창구
  TREE_T.oak=TREE.oak;   TREE_T.fir=TREE.fir;

  const geoFor={
    /* 줄기 — 곧은 5각 기둥이던 것을 8각 10마디로 쪼개 ① 밑동을 뿌리 쪽으로 벌리고(판근 —
       참나무 다섯 갈래·전나무 여섯 갈래) ② 위로 갈수록 한쪽으로 살짝 굽히고 ③ 세로 골(나무껍질 결)을
       판다. 굽는 폭은 가지가 붙는 높이에서도 줄기 반지름 안이라 가지가 줄기에서 떨어져 보이지 않는다.
       나무마다 줄기를 돌려 세우므로 굽는 쪽은 나무마다 다르다. */
    oak:    [gnarl(new THREE.CylinderGeometry(0.26,0.5,5.2,8,10),(t,th,r)=>{
              const flare=1+0.6*Math.exp(-t*9)*(1+0.35*Math.cos(5*th));
              return [r*flare*(1+0.045*Math.sin(th*9+t*7)), 0.16*Math.sin(2.2*t+0.3)*t, 0.10*Math.sin(3.7*t)*t];
            },5.2)],
    fir:    [gnarl(new THREE.CylinderGeometry(0.2,0.44,7.0,8,10),(t,th,r)=>{
              const flare=1+0.45*Math.exp(-t*10)*(1+0.3*Math.cos(6*th));
              return [r*flare*(1+0.04*Math.sin(th*11+t*5)), 0.07*Math.sin(2.6*t)*t, 0.05*Math.sin(4.1*t)*t];
            },7.0)],
    flint:  [new THREE.IcosahedronGeometry(0.18,0)],
    pebble: [new THREE.IcosahedronGeometry(0.13,0)],
    granite:[new THREE.IcosahedronGeometry(1.8,0)],
    sulfur: [new THREE.IcosahedronGeometry(0.55,0)],
    /* 점토 노출지 · 모래 언덕 — 예전엔 6·7각 납작 원기둥이라 땅에 놓인 과자 같았다(볕을 받으면 흰 판때기로 떴다).
       울퉁불퉁한 반구를 눌러 둔덕으로 만든다(밑은 평평 — 땅에 묻는다) */
    clay:   [moundGeo(1.3,0.30,0x51a7)],
    sand:   [moundGeo(1.6,0.40,0x5a4d)],
    grass:  [grassTuft],
    reed:   [reedTuft],
    copper: [new THREE.IcosahedronGeometry(1.05,0)],
    tin:    [new THREE.IcosahedronGeometry(0.8,0)],
    iron:   [new THREE.IcosahedronGeometry(0.95,0)],
    coal:   [new THREE.IcosahedronGeometry(0.95,0)],
    zinc:   [new THREE.IcosahedronGeometry(0.85,0)],
    galena: [new THREE.BoxGeometry(0.95,0.85,0.95)],  // 방연석은 정육면체로 쪼개진다
    cinnabar:[new THREE.DodecahedronGeometry(0.75,0)],
    basalt: [new THREE.IcosahedronGeometry(1.4,0)],
    karst:  [new THREE.IcosahedronGeometry(1.5,0)],
    sandstone:[new THREE.IcosahedronGeometry(1.5,0)]
  };
  /* 둔덕 — 반구를 눌러 만든 **매끈한** 언덕. 예전엔 면마다 각진 다각형이라 볕을 받으면 종이접기처럼 조각조각 나뉘어
     흰 모래 위에 둥둥 떠 보였다(사용자 지적: 모래가 기괴하다). 색인 있는 구라 법선이 이웃 면끼리 이어진다.
     가장자리는 땅에 스며들게 얇게 눕힌다 */
  function moundGeo(r,h,seed){
    const g=new THREE.SphereGeometry(1,18,7,0,Math.PI*2,0,Math.PI/2), p=g.attributes.position;
    const bump=(x,z)=>0.86+0.14*Math.sin(x*2.3+seed)+0.10*Math.sin(z*3.1+seed*1.7)+0.06*Math.sin((x+z)*5.2);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i), y=p.getY(i), z=p.getZ(i), f=bump(x,z);
      /* 종 모양 — 꼭대기와 가장자리에서 기울기가 0 이다. 가장자리의 법선이 땅과 같아져 둘레 땅에 스며든다
         (반구를 누른 꼴은 가장자리가 가팔라 모래밭에 얹은 덩이로 보였다 — 사용자 지적).
         (1−r²)³ — 자락이 길게 눕는다. cos² 꼴을 깊이 묻었더니 비탈 한가운데에서 잘려 땅과 만나는 데에 꺾인 금이 섰다 */
      const rr=Math.min(1,Math.sqrt(x*x+z*z)), t1=1-rr*rr;
      p.setXYZ(i,x*r*(0.9+0.1*f),(y>0?t1*t1*t1*h*f:0)-0.03,z*r*(0.9+0.1*f));
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
  /* 광석·바위는 개체마다 그 자리에서 형상을 만든다.
     20면체를 한 단계 세분한 80면 껍질을 기준으로,
       ① 매끄러운 혹으로 반지름을 흔들고(둥근 결)
       ② 무작위 평면 여러 장으로 잘라 내고(쪼개진 면 — 볼록 다면체가 된다)
       ③ 광물에 따라 정육면체 쪽으로 당긴다(정벽 쪼개짐)
     세 가지를 광물마다 다르게 섞는다. `HABIT` 이 그 배합표다.
     같은 돌이 두 번 나오지 않는다.
     인스턴싱 대신 종류별로 정점을 한 버퍼에 이어 붙여 드로우콜은 1개로 유지한다. */
  const ROCK_R={granite:1.8,copper:1.05,iron:0.95,coal:0.95,zinc:0.85,galena:0.85,
               cinnabar:0.8,tin:0.8,basalt:1.4,karst:1.5,sandstone:1.5,
                sulfur:0.55,flint:0.18,pebble:0.13};
  // 기준 껍질의 '중복 없는 꼭짓점' 목록을 한 번만 뽑아 둔다 (80면 → 꼭짓점 42개)
  function makeShell(detail){
    const g=new THREE.IcosahedronGeometry(1,detail);
    const sp=g.attributes.position;
    const uniqDir=[], vertU=new Int32Array(sp.count), dirKey=new Map();
    const px=new Float32Array(sp.count*3);
    for(let i=0;i<sp.count;i++){
      const x=sp.getX(i), y=sp.getY(i), z=sp.getZ(i);
      px[i*3]=x; px[i*3+1]=y; px[i*3+2]=z;
      const k=x.toFixed(4)+','+y.toFixed(4)+','+z.toFixed(4);
      let u=dirKey.get(k);
      if(u===undefined){ u=uniqDir.length; dirKey.set(k,u); uniqDir.push([x,y,z]); }
      vertU[i]=u;
    }
    g.dispose();
    return {px, uniqDir, vertU, V:sp.count, U:uniqDir.length};
  }
  /* 껍질 단계 — 큰 돌일수록 곱게 쪼갠다.
     1단계는 80면이라 화강암(반지름 1.8 m)에서는 삼각형이 그대로 눈에 띈다.
     2단계(320면)면 가까이서도 면이 안 보인다. 자갈·부싯돌은 손톱만 하니 1단계로
     둔다 — 자갈만 3,000개라 곱게 쪼개면 정점만 늘고 보이는 건 그대로다. */
  /* 20면체 세분 단계 n 은 면 20·(n+1)² — 1단계 80 · 2단계 180 · 3단계 320.
     큰 암석 3단계(320면) · 자갈·부싯돌 2단계(180면) — 예전(180·80)의 약 2배 */
  const SHELLS={1:makeShell(1), 2:makeShell(2), 3:makeShell(3), 4:makeShell(4)};
  const shellFor=k=>SHELLS[(HABIT[k]&&HABIT[k].sh)||3];

  function buildRockBatch(list,R){
    const r0=ROCK_R[R.k], H=HABIT[R.k]||HABIT0, amp=H.amp;
    const SH=shellFor(R.k), SHELL_V=SH.V, UNIQ=SH.U,
          uniqDir=SH.uniqDir, vertU=SH.vertU, spx=SH.px;
    const total=list.length*SHELL_V;
    const pos=new Float32Array(total*3), nor=new Float32Array(total*3), mel=new Float32Array(total);   // mel — 땅에 녹아드는 높이(바위마다 제 크기만큼)
    const fac=new Float32Array(UNIQ);
    /* own[u] — 그 자리의 반지름을 누가 정했나.
         −1  혹(굽은 자리)        0..  몇 번째 자르기 평면       100+  정육면체 몇 번째 면
       삼각형 셋이 같은 평면 위에 있으면 그 면은 '깎인 면'이니 각지게 두고,
       그렇지 않으면 이웃 면들의 법선을 모아 매끈하게 잇는다. 이 한 가지로
       "굽은 데는 매끈, 깨진 데는 날카롭게" 가 동시에 나온다. */
    const own=new Int16Array(UNIQ);
    const acc=new Float32Array(UNIQ*3);
    /* 돌마다 새로 잡던 임시 배열 — 묶음에 한 번만 잡는다(자갈만 3,000개다) */
    const tmp=[0,0,0], loc=new Float32Array(SHELL_V*3),
          fn=new Float32Array(SHELL_V),           // 삼각형마다 면 법선(3개씩)
          isFlat=new Uint8Array(SHELL_V/3);
    let o=0;
    for(const p of list){
      const hh=p._hash;
      const rnd=mulberry32(hh^0x517cc1b7);
      // ① 매끄러운 혹 — 축·주기·위상·세기를 개체마다 새로 뽑는다
      const lobe=[];
      for(let l=0;l<H.nb;l++){
        let ax=rnd()*2-1, ay=rnd()*2-1, az=rnd()*2-1;
        const L=Math.sqrt(ax*ax+ay*ay+az*az)||1; ax/=L; ay/=L; az/=L;
        lobe.push([ax,ay,az, 1.6+rnd()*(H.bump-1.6<0?0:H.bump-1.6), rnd()*6.283, (rnd()*2-1)]);
      }
      let wsum=0; for(const l of lobe) wsum+=Math.abs(l[5]);
      wsum=wsum||1;
      /* ①' 움푹 팬 자리(사용자 요청: 바위가 늘 둥글지는 않다 — 금과 팬 데가 있다) — 큰 돌은 1~3 군데, 사발처럼 부드럽게 판다 */
      const dent=[];
      if(r0>=0.4) for(let c=0,nd=1+((rnd()*3)|0);c<nd;c++){ let ax=rnd()*2-1, ay=rnd()*2-1, az=rnd()*2-1; const L=Math.sqrt(ax*ax+ay*ay+az*az)||1;
        dent.push([ax/L,ay/L,az/L, 0.80+rnd()*0.13, 0.06+rnd()*0.09]); }
      // ② 쪼개진 면 — 중심에서 deep 쯤 떨어진 평면으로 잘라 낸다(볼록 다면체)
      const cut=[];
      for(let c=0;c<H.cuts;c++){
        let ax=rnd()*2-1, ay=rnd()*2-1, az=rnd()*2-1;
        const L=Math.sqrt(ax*ax+ay*ay+az*az)||1;
        cut.push([ax/L,ay/L,az/L, H.deep*(0.86+rnd()*0.34)]);
      }
      for(let u=0;u<UNIQ;u++){
        const d=uniqDir[u];
        let f=0;
        for(const l of lobe)
          f+=l[5]*Math.sin(l[3]*(d[0]*l[0]+d[1]*l[1]+d[2]*l[2])+l[4]);
        let r=1+(f/wsum)*amp;
        /* 잔 울퉁불퉁 — 겹친 값잡음으로 겉을 거칠게(사용자 요청: 바위가 너무 매끈하다). 화강암 11% · 나머지 5% · 자갈·부싯돌 3% */
        const RG=H.rough!==undefined?H.rough:(R.k==='pebble'||R.k==='flint'?0.03:0.05);
        r*=1+RG*SHP.rough(d[0],d[1],d[2],hh,1.9,4)+RG*1.1*(SHP.jag(d[0],d[1],d[2],hh^0x3c,2.6,3)-0.25);   // + 날카로운 능선(들쭉날쭉한 모서리)
        if(H.jit) r*=1+(rnd()*2-1)*H.jit;           // 꼭짓점마다 들쭉날쭉 — 낮은 다각형 바위의 모난 결
        let ow=-1;
        // ③ 정벽 쪼개짐 — 정육면체 쪽으로 당긴다
        if(H.cube>0){
          const ax=Math.abs(d[0]), ay=Math.abs(d[1]), az=Math.abs(d[2]);
          const m=Math.max(ax,ay,az);
          r=r*(1-H.cube)+r*(1/m)*H.cube;
          // 많이 당겼으면 그 면은 정벽이다 — 모서리를 살려 둔다
          if(H.cube>=0.5) ow=100+(m===ax?(d[0]>0?0:1):m===ay?(d[1]>0?2:3):(d[2]>0?4:5));
        }
        for(let ci=0;ci<cut.length;ci++){
          const c=cut[ci];
          const dot=d[0]*c[0]+d[1]*c[1]+d[2]*c[2];
          if(dot>1e-3){ const lim=c[3]/dot; if(lim<r){ r=lim; ow=ci; } }
        }
        if(ow>=0&&ow<100) r*=1+RG*0.35*SHP.vn3(d[0]*7.0,d[1]*7.0,d[2]*7.0,hh^0x55);   // 쪼개진 면도 판판하지만은 않다
        for(const dd of dent){ const q=d[0]*dd[0]+d[1]*dd[1]+d[2]*dd[2]; if(q>dd[3]){ const t=(q-dd[3])/(1-dd[3]); r*=1-dd[4]*t*t*(3-2*t); } }
        fac[u]=r; own[u]=ow;
      }
      // 개체별 회전 · 축별 신축
      const ex=rnd()*6.283, ey=rnd()*6.283, ez=rnd()*6.283;
      const st=H.st, s1=1-st/2;
      const sx=s1+rnd()*st, sy=(s1+rnd()*st)*H.flat, sz=s1+rnd()*st;
      const cx=Math.cos(ex),sxr=Math.sin(ex), cy=Math.cos(ey),syr=Math.sin(ey),
            cz=Math.cos(ez),szr=Math.sin(ez);
      const rot=(x,y,z,out)=>{                       // Rz → Ry → Rx
        let a=x*cz-y*szr, b=x*szr+y*cz, c=z;
        const a2=a*cy+c*syr, c2=-a*syr+c*cy;
        out[0]=a2; out[1]=b*cx-c2*sxr; out[2]=b*sxr+c2*cx;
      };
      let off;
      if(R.k==='flint') off=0.15*p.s; else if(R.k==='pebble') off=0.11*p.s; else if(R.k==='sulfur') off=0.02*p.s; else if(ORE_LODGE[R.k]) off=0.20*p.s; else off=0.5*p.s;   // 유황은 더 깊이(사용자 요청 — 겉만 드러난 딱지)   // 광석은 땅에 박혀 있다(사용자 요청)
      /* 비탈에서는 더 묻는다 — 곧추 얹으면 아래쪽 밑면이 허공에 뜬다(사용자 지적). 반지름 × 기울기의 0.6, 반지름의 0.45 까지 */
      { const gs=groundSlope(p.x,p.z,Math.max(0.4,r0*p.s*0.7)); off-=Math.min(0.45*r0*p.s,r0*p.s*Math.hypot(gs[0],gs[1])*0.6); }
      const oy=p.y+off, S0=p.s;
      p._vs=o/3; p._vn=SHELL_V; p._cy=oy; p._k=1;
      mel.fill(R.k==='sulfur'?clamp(0.95*S0*r0,0.15,1.3):ORE_LODGE[R.k]?clamp(0.62*S0*r0,0.12,1.1):clamp(0.34*S0*r0,0.05,0.8),o/3,o/3+SHELL_V);   // 유황은 땅 빛깔이 더 높이(넓게 녹아든다)   // 광석은 땅 빛깔이 더 높이 올라온다

      for(let i=0;i<SHELL_V;i++){
        const f=fac[vertU[i]];
        rot(spx[i*3]*r0*f*sx, spx[i*3+1]*r0*f*sy, spx[i*3+2]*r0*f*sz, tmp);
        loc[i*3]=tmp[0]*S0; loc[i*3+1]=tmp[1]*S0; loc[i*3+2]=tmp[2]*S0;
      }
      /* 법선 — 두 번 훑는다.
         1) 삼각형마다 면 법선을 구하고, '깎인 면'이 아닌 것만 꼭짓점에 모은다.
            (깎인 면을 같이 모으면 날카로워야 할 모서리가 뭉개진다)
         2) 깎인 면은 제 면 법선을 그대로 쓰고, 나머지는 모아 둔 것을 정규화해
            쓴다 — 이웃 삼각형끼리 법선이 이어지므로 굽은 자리에서 면이 안 보인다. */
      acc.fill(0);
      for(let t=0,ti=0;t<SHELL_V;t+=3,ti++){
        const ax=loc[t*3],ay=loc[t*3+1],az=loc[t*3+2];
        const bx=loc[t*3+3],by=loc[t*3+4],bz=loc[t*3+5];
        const cx2=loc[t*3+6],cy2=loc[t*3+7],cz2=loc[t*3+8];
        const ux=bx-ax,uy=by-ay,uz=bz-az, vx=cx2-ax,vy=cy2-ay,vz=cz2-az;
        let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
        const nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; nx/=nl; ny/=nl; nz/=nl;
        fn[ti*3]=nx; fn[ti*3+1]=ny; fn[ti*3+2]=nz;
        const o0=own[vertU[t]], o1=own[vertU[t+1]], o2=own[vertU[t+2]];
        const flat=(o0>=0&&o0===o1&&o1===o2);
        isFlat[ti]=flat?1:0;
        if(!flat) for(let e=0;e<3;e++){
          const u=vertU[t+e]*3;
          acc[u]+=nx; acc[u+1]+=ny; acc[u+2]+=nz;    // 면 넓이는 안 잰다 — 껍질이 고르다
        }
      }
      const sm=H.smooth;
      for(let t=0,ti=0;t<SHELL_V;t+=3,ti++){
        const nx=fn[ti*3], ny=fn[ti*3+1], nz=fn[ti*3+2];
        for(let e=0;e<3;e++){
          const j=t+e, u=vertU[j]*3;
          let mx=nx,my=ny,mz=nz;
          if(isFlat[ti]){                             // **필렛** — 깎인 면의 가장자리 꼭짓점은 몸통 쪽 법선과 35% 섞어 모서리를 둥글린다(속은 판판한 그대로)
            const al=Math.sqrt(acc[u]*acc[u]+acc[u+1]*acc[u+1]+acc[u+2]*acc[u+2]);
            if(al>1e-6){ mx=nx+(acc[u]/al-nx)*0.35; my=ny+(acc[u+1]/al-ny)*0.35; mz=nz+(acc[u+2]/al-nz)*0.35; }
          }
          if(!isFlat[ti]){
            const al=Math.sqrt(acc[u]*acc[u]+acc[u+1]*acc[u+1]+acc[u+2]*acc[u+2]);
            if(al>1e-6){                              // 면 법선 ↔ 이은 법선 사이를 smooth 로
              mx=nx+(acc[u]/al-nx)*sm;
              my=ny+(acc[u+1]/al-ny)*sm;
              mz=nz+(acc[u+2]/al-nz)*sm;
            }
          }
          const ml=Math.sqrt(mx*mx+my*my+mz*mz)||1;
          nor[(o/3+j)*3]=mx/ml; nor[(o/3+j)*3+1]=my/ml; nor[(o/3+j)*3+2]=mz/ml;
          const lx=loc[j*3],ly=loc[j*3+1],lz=loc[j*3+2];
          pos[o+j*3]=p.x+lx; pos[o+j*3+1]=oy+ly; pos[o+j*3+2]=p.z+lz;
        }
      }
      /* 몸이 막히는 테두리 — 발목~머리 높이(땅 위 0.1~2.1 m)에 든 꼭짓점이 방위마다 어디까지 나와 있나 */
      if(p._col){
        const K=16, prof=new Float32Array(K); let mx=0;
        for(let i=0;i<SHELL_V;i++){ const ly=off+loc[i*3+1]; if(ly<0.1||ly>2.1) continue;
          const lx=loc[i*3], lz=loc[i*3+2], r=Math.sqrt(lx*lx+lz*lz), k=Math.floor((Math.atan2(lz,lx)/6.2832+1)%1*K)%K;
          if(r>prof[k]) prof[k]=r; }
        for(let k=0;k<K;k++){ const a=prof[(k+K-1)%K], b=prof[(k+1)%K]; fac[k]=Math.max(prof[k],0.5*(a+b)); }   // 빈 방위는 이웃으로 메운다(fac 는 이때 임시 칸)
        for(let k=0;k<K;k++){ prof[k]=fac[k]*0.96; if(prof[k]>mx) mx=prof[k]; }
        if(mx>0.2){ p._col.prof=prof; p._col.r=mx; p._col.p0=prof.slice(); p._col.r0=mx; }   // p0·r0: 다 큰 때의 테두리(캐서 줄면 여기에 비율을 곱한다 — 50-items.js)
      }
      o+=SHELL_V*3;
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
    g.setAttribute('aMelt',new THREE.BufferAttribute(mel,1));
    g.computeBoundingSphere();
    if(!ROCK_MAT[R.k]) ROCK_MAT[R.k]=rockMat(R.k,R.c);   // 칸마다 나눠도 재질은 종류당 하나
    return new THREE.Mesh(g,ROCK_MAT[R.k]);
  }

  /* 몸이 막히는 반지름(×크기). **암석은 전부 막는다** — 예전 표에 화강암·구리·철·석탄만
     있어 아연·방연석·진사·주석·황 광석은 그냥 걸어서 뚫고 지나갔다. 값은 보이는 반지름
     `ROCK_R` 의 0.85(울퉁불퉁한 겉보다 조금 안쪽). 자갈·부싯돌은 발목 아래라 넘어간다. */
  const RAD={oak:0.6,fir:0.5};
  for(const k in ROCK_R) if(ROCK_R[k]>=0.4) RAD[k]=ROCK_R[k]*0.85;
  const trunkMat=barkMat(0x4a3d31,'trunk'); trunkMat.userData.melt=0.50; trunkMat.userData.meltTex=true;   // 줄기 밑동이 땅에 녹아든다(envPatch). 높이는 표고 텍스처로 잰다 — 이 줄기는 인스턴스 원점이 밑동이 아니라서, 원점에서 재면 줄기가 통째로 땅빛이 됐다
  const limbMat =barkMat(0x4f4033,'limb');
  limbMat.userData.wind='limb';                // 바람에 가지 끝이 흔들린다(envPatch)
  LIMB_MAT_C=instCompact(barkMat(0x4f4033,'limb')); LIMB_MAT_C.userData.wind='limb';   // 칸 가지(압축 인스턴스)
  LIMB_DEPTH_C=instCompact(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}));
  LIMB_DIST_C=instCompact(new THREE.MeshDistanceMaterial());
  LIMB_FAR_MAT=barkMat(0x4f4033,'far');       // 먼 복제(굳힌 지오메트리) — 꺾기는 이미 굳힌 활 모양만

  const byKind={};
  for(const p of PROPS){ (byKind[p.k]=byKind[p.k]||[]).push(p); }

  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3(),
        S=new THREE.Vector3(),E=new THREE.Euler();
  /* 땅에 눕는 넓적한 것(점토 노출지·모래 언덕)은 지름이 3 m 가까운 원반이라
     비탈에서 가장자리가 공중에 뜬다. 두 가지로 막는다 —
     ① 임의로 기울이지 말고 지면 법선에 맞춰 눕힌다
     ② 원반 두께의 절반보다 깊게 파묻어 지형이 굽어도 밑이 안 드러난다.
     예전 값(점토 +0.4 · 모래 +0.22)은 원반 밑면을 아예 지면 위로 띄워 놓고 있었다
     — 점토는 두께가 0.5 라 밑면이 늘 0.15 m 떠 있었다.
     **이제 둔덕은 땅에 덮어씌운다**(moundMat 의 정점 셰이더 — 높이 = 그 자리 그려진 땅 + 둔덕의 키). 묻어 두던 때는 땅 위로 8 cm 남짓만
     나와 땅의 잔 기복(2 m 안에서 수 cm)이 가운데를 뚫고 올라와 두 쪽으로 갈라졌고, 비탈 한가운데에서 잘려 땅과 만나는 데에 금이 섰다.
     그래서 아래 propOff 의 점토·모래 값은 이제 가로 자리 말고는 쓰이지 않는다(채집 표시 높이 정도). 키 점토 0.30 · 모래 0.40 m(크기 배율 곱) */
  const FLAT_PROP={clay:1, sand:1};
  const propOff=(k,sc)=>(k==='fir'?3.3:k==='oak'?2.4:     // 줄기 밑동을 0.2 m 땅에 묻는다(판근이 비탈에서 뜨지 않게)
     
      k==='clay'?-0.05:k==='sand'?-0.05:
      (k==='grass'||k==='reed')?0:
      k==='flint'?0.15:k==='pebble'?0.11:0.5)*sc;
  const _pN=new THREE.Vector3(), _pUP=new THREE.Vector3(0,1,0),
        _pQt=new THREE.Quaternion();

  for(const R of RESOURCES){
    const list=byKind[R.k]; if(!list||!list.length) continue;
    if(!geoFor[R.k]){ showErr('프롭','geoFor 에 '+R.k+' 모양이 없다'); continue; }
    const geos=geoFor[R.k], tree=(R.k==='oak'||R.k==='fir');
    /* 모래·점토 둔덕은 한 톤 낮춘다 — 표의 색 그대로는 한낮 볕에 하얗게 날아 땅과 따로 놀았다 */
    /* 모래·점토 둔덕은 둘레 땅과 같은 빛깔·같은 사진 결을 입는다 — 모래 언덕은 해변 색 그대로(땅 셰이더가 모래를
       0.80 으로 낮추므로 같은 값), 점토는 진흙 결 */
    const tintK=R.k==='sand'?0.80:R.k==='clay'?0.88:1;      // 모래: 땅 셰이더의 0.74 에 사진 결 차이를 얹은 값
    /* 모래·점토 둔덕은 땅 셰이더를 그대로 쓴다(moundMat — 22-ground-textures.js) — 가장자리가 둘레 땅과 같아 스티커처럼 뜨지 않는다 */
    const mats=tree?[trunkMat,new THREE.MeshLambertMaterial({color:R.c})]
              :FLAT_PROP[R.k]?[moundMat(R.k==='clay'?1:0,R.k==='clay'?1.3:1.6,new THREE.Color(R.k==='sand'?BIOME_INFO[B.BEACH].c:R.c).multiplyScalar(tintK).getHex(),
                                     R.k==='clay'?0.30:0.40,-0.02)]   // 반지름 · 높이 · 묻힌 깊이 — geoFor 의 moundGeo · propOff 와 같은 값
              :[new THREE.MeshLambertMaterial({color:R.c})];
    const ms=geos.map((g,gi)=>new THREE.InstancedMesh(g,mats[gi],list.length));

    // 1차: 채집 횟수·통나무 수·베리를 먼저 정한다 (가지 총량을 알아야 하므로)
    list.forEach(p=>{
      p.y=p.top!==undefined?p.top:heightAt(p.x,p.z);   // 바위섬 꼭대기의 전나무는 제 높이(34-coast.js coastIsle)
      if(HARVEST[R.k]||MINE[R.k]){
        const hh=hashStr(R.k+'|'+Math.round(p.x)+'|'+Math.round(p.z));
        p.vanish=!!(HARVEST[R.k]&&HARVEST[R.k].vanish);
        // 덩치가 클수록 더 많이 나온다. 부피(s³)는 편차가 너무 커서 s^1.4 로 완만하게.
        // 한 번 주우면 사라지는 단괴·자갈은 크기와 무관하게 1회다.
        const sf = p.vanish ? 1 : Math.pow(p.s,1.4);
        const scaled=(n)=>Math.max(1,Math.round(n*sf));

        if(MINE[R.k]){
          const O=MINE[R.k].uses;
          p.oreMax=scaled(O[0]+(hh%(O[1]-O[0]+1))); p.ore=p.oreMax;
        }
        const U=(HARVEST[R.k]||MINE[R.k]).uses;
        p.brMax=scaled(U[0]+(hh%(U[1]-U[0]+1)));
        p.br=HARVEST[R.k]?p.brMax:0;
        if(CHOP[R.k]){
          const L=CHOP[R.k].logs;
          p.logsMax=scaled(L[0]+((hh>>>3)%(L[1]-L[0]+1)));
          p.logs=p.logsMax; p.felled=false;
        }
        p.berry=p.berryMax=0;
        if(R.k==='grass'){
          const sm=sampleAt(p.x,p.z);
          let ch = sm.biome===B.BROADLEAF?0.30 : sm.biome===B.MEADOW?0.18 :
                   sm.biome===B.MARSH?0.12 : sm.biome===B.CONIFER?0.10 : 0.03;
          ch*=clamp(sm.moist*1.4,0,1);
          if(((hh>>>7)%1000)/1000 < ch) p.berry=p.berryMax=2+((hh>>>17)%3);
        }
        p._hash=hh;
      }
    });

    /* 가지·잎뭉치 — 나무 종류마다 하나로 몰아 담던 것을 TILE(128 m) 칸마다
       따로 담는다. 인스턴스 메시는 통째로만 껐다 켤 수 있으므로, 섬 전체를
       한 덩이로 들고 있으면 발밑에 선 나무 하나 때문에 온 섬의 잎을 다 그린다.
       칸으로 쪼개 두면 멀리 있는 칸을 통째로 끌 수 있다(updateTileVis).
       앞쪽 brMax 개가 꺾을 수 있는 아래 가지, 나머지는 형태를 이루는 구조 가지. */
    let fillLimbs=null;
    if(tree){
      const TR=TREE[R.k], LPB=LEAF_PER[R.k]||1;
      /* 곁가지는 씨앗에서 자라므로 수를 미리 알 수 없다. 같은 씨앗으로
         재귀를 한 번 헛돌려 세고, 두 번째에 행렬을 쓴다. */
      /* **가지·잎은 칸마다, 그 칸이 가까워졌을 때 짓는다**(`ensureTreeTile`). 예전엔 섬의 나무 4,000 그루 전부의
         가지·잎 인스턴스 320만 개를 섬을 만들 때 한꺼번에 지었다 — 섬 생성 10초 가운데 5초, 메모리 수백 MB 가
         여기서 나왔는데, 제 가지를 그대로 보이는 것은 25 m 안의 칸뿐이다(그 밖은 기준 나무 복제·그림).
         여기서는 나무를 칸에 나눠 담기만 한다. */
      const bins=new Map();
      for(const p of list){
        const k=tileKey(p.x,p.z);
        let b=bins.get(k);
        if(!b){ b={ps:[], gx:Math.floor(p.x/TILE), gz:Math.floor(p.z/TILE)}; bins.set(k,b); }
        b.ps.push(p);
        p._lb=p._ls=p._lf=null; p._lmap=null; p.limbN=0;
      }
      /* 참나무 잎은 알파 그림을 붙인 판때기다. alphaTest 로 잘라야 한다 —
         transparent:true 로 하면 깊이 정렬이 어그러져 먼 잎이 앞에 뜬다. */
      const leafMat=R.k==='oak'
        ? new THREE.MeshLambertMaterial({map:leafTexOak, alphaTest:0.5,
                                         side:THREE.DoubleSide})
        : new THREE.MeshLambertMaterial({color:0x2f4a3a, side:THREE.DoubleSide});
      /* 멀리서 쓸 수관 임포스터 — 십자 판때기에 수관 그림을 붙인다.
         줄기는 넣지 않는다. 진짜 줄기(원기둥)는 늘 그려지므로 그림에도
         줄기가 있으면 둘이 겹쳐 깜빡인다. */
      const bbMat=new THREE.MeshLambertMaterial({
        map:R.k==='oak'?treeTexOak:treeTexFir, alphaTest:0.4,
        side:THREE.DoubleSide});
      var CAN=R.k==='oak'?{y0:2.2,y1:7.6,w:5.4}:{y0:1.4,y1:8.4,w:4.4};
      /* 알파 카드는 깊이 재질을 따로 줘야 한다 — 안 주면 그림자 지도에
         판때기 네모가 통째로 찍혀 잎 사이로 빛이 새지 않는다. */
      const depthOf=(m)=>m.map?new THREE.MeshDepthMaterial({
        depthPacking:THREE.RGBADepthPacking, map:m.map, alphaTest:m.alphaTest}):null;
      const leafDepth=depthOf(leafMat), bbDepth=depthOf(bbMat);
      leafMat.userData.wind='leaf';            // 잎은 통째로 흔들리고 잘게 떤다
      if(leafDepth) leafDepth.userData.wind='leaf';   // 그림자도 같이 흔든다
      /* 칸의 가지·잎은 압축 인스턴스(위 '가지·잎 인스턴스 자료 줄이기') — 재질도 압축용을 따로 둔다.
         예전 재질(leafMat · leafDepth · limbMat)은 먼 나무 복제와 임포스터가 그대로 쓴다 */
      const leafC=instCompact(R.k==='oak'
        ? new THREE.MeshLambertMaterial({map:leafTexOak, alphaTest:0.5, side:THREE.DoubleSide})
        : new THREE.MeshLambertMaterial({color:0x2f4a3a, side:THREE.DoubleSide}));
      leafC.userData.wind='leaf';
      const leafDC=instCompact(new THREE.MeshDepthMaterial(leafMat.map
        ? {depthPacking:THREE.RGBADepthPacking, map:leafMat.map, alphaTest:leafMat.alphaTest}
        : {depthPacking:THREE.RGBADepthPacking}));
      const leafXC=instCompact(new THREE.MeshDistanceMaterial(leafMat.map?{map:leafMat.map, alphaTest:leafMat.alphaTest}:{}));
      const leafUnit=R.k==='oak'?leafUnitOak:leafUnitFir;
      /* 단계 묶음(`tlPack`)이 쓰는 밑 지오메트리·재질 — 원본과 같은 압축 재질이라 셰이더가 늘지 않는다 */
      const KIT={hi:limbUnit, lo:limbLo, sh:limbShort, leaf:leafUnit,
                 lm:LIMB_MAT_C, ld:LIMB_DEPTH_C, lx:LIMB_DIST_C, fm:leafC, fd:leafDC, fx:leafXC};
      for(const b of bins.values()){
        const bb=new THREE.InstancedMesh(bbUnit,bbMat,b.ps.length);
        bb.frustumCulled=false;
        if(bbDepth)   bb.customDepthMaterial=bbDepth;
        const tile={lm:null, ls:null, fm:null, bb, ps:b.ps, kind:R.k, leafStd:leafMat, leafDepthStd:leafDepth,
          cx:(b.gx+0.5)*TILE, cz:(b.gz+0.5)*TILE, r:TILE*0.71+12, built:false, pin:false};
        b.ps.forEach((p,i)=>{
          p._bb=bb; p._bbi=i; p._tile=tile;
          _lbV.set(p.x, p.y+CAN.y0*p.s, p.z);
          _lbQ.set(0,0,0,1);
          _lbS.set(CAN.w*p.s, (CAN.y1-CAN.y0)*p.s, CAN.w*p.s);
          M.compose(_lbV,_lbQ,_lbS); bb.setMatrixAt(i,M);
        });
        bb.instanceMatrix.needsUpdate=true;
        propGroup.add(bb);
        /* 이 칸의 가지·잎을 짓는다 — ① 곁가지 수를 세고(씨앗으로 한 번 헛돌린다) ② 그만큼 메시를 잡고 ③ 채운다
           ④ 이미 꺾었거나 벤 나무는 그 모습으로 맞춘다(지어지기 전에 불러온 저장) */
        /* 칸의 가지·잎 **원본**(그루마다 제 가지 전부) — 그리지 않는다. 45 m 안 그루의 '제 생김새' 묶음(`tlRepack`)이
           여기서 그루 몫을 베껴 간다. 꺾기·벌목(`hideLimb`)도 여기에 적는다 */
        tile.build=()=>{
          let total=0, tl=0, ts=0;
          for(const p of b.ps){
            let n=0, ns=0; growLimbs(p,TR,(a,bq,len)=>{ n++; if(len<SHORT_LIMB) ns++; });
            p.limbN=p.brMax+n; p._nS=ns;
            p._lbBase=total; total+=p.limbN;
            p._lbL=tl; tl+=p.limbN-ns; p._lbS=ts; ts+=ns; p._lmap=new Int32Array(p.limbN);
          }
          const lm=instMesh(limbUnit,LIMB_MAT_C,tl,LIMB_DEPTH_C,LIMB_DIST_C);
          const ls=instMesh(limbShort,LIMB_MAT_C,ts,LIMB_DEPTH_C,LIMB_DIST_C);
          const fm=instMesh(leafUnit,leafC,total*LPB,leafDC,leafXC);
          for(const p of b.ps){ p._lb=lm; p._ls=ls; p._lf=fm; }
          for(const p of b.ps) fillLimbs(p);
          tile.lm=lm; tile.ls=ls; tile.fm=fm;
          for(const p of b.ps) if(p.felled||p.br<p.brMax) shrinkFoliage(p);
        };
        /* 그루 하나를 **솎은 것**(30 m 밖 단계) — 원본 칸을 짓지 않고 그 그루 몫만 빈 그릇에 채워 고른다(`tlThin`) */
        tile.thin1=(p)=>tlThin(p,TR,LPB,fillLimbs,TL.F[R.k]);
        tile.kit=KIT;
        TREE_TILES.push(tile);
      }
      /* 나무 한 그루의 가지·잎 행렬을 채운다(칸을 지을 때 그루마다 부른다) */
      fillLimbs=(p)=>{
        const gy=p.y;
        const limbMesh=p._lb, leafMesh=p._lf, li=p._lbBase;
        let nL=0, nS=0;
        /* 잎 자리 — 가지 끝에서 LEAF_BACK(0.1 m) 앞부터 밑동 쪽으로 무작위.
           다섯 장을 가지 끝 한 점에 몰아 달면 가지마다 똑같은 술이 달린 꼴이라
           어색하다. 한 장씩 가지 위 다른 자리에, 축을 도는 각과 바깥으로 눕는
           각을 따로 뽑아 세운다. 뒤로 물러나는 폭은 가지 길이의 70% 를 넘지
           않게 막는다 — 짧은 잔가지에서 잎이 밑동 뒤로 넘어가지 않게. */
        const lrnd=mulberry32((p._hash||0)^0x51ed270b);
        const putLeaf=(slot,base,quat,len,leafS)=>{
          for(let q=0;q<LPB;q++){
            const i=slot*LPB+q;
            if(leafS<=0){ instPut(leafMesh,i,base,quat,0,0); continue; }
            _lbD.set(0,1,0).applyQuaternion(quat);
            /* 짧은 잔가지에서는 0.1 m 를 그대로 물리면 다섯 장이 몽땅 밑동으로
               밀려 한자리에 겹친다 — 시작 자리도 가지 길이에 맞춰 줄인다. */
            const off=Math.min(LEAF_BACK, len*0.35);
            const back=(LPB>1) ? off+lrnd()*Math.min(0.80,(len-off)*0.85) : 0;
            _lbB.copy(base).addScaledVector(_lbD,len-back);
            if(LPB>1){
              _lbE.set(0,lrnd()*6.283,0.55+lrnd()*0.62);
              _lbQ2.setFromEuler(_lbE);
              _lbQ.copy(quat).multiply(_lbQ2);
            }else _lbQ.copy(quat);
            const ls=leafS*(LPB>1?(0.85+lrnd()*0.35)*1.2:1);     // 판이 둘이라 1.2배(셋일 때와 덮는 넓이가 같다)
            instPut(leafMesh,i,_lbB,_lbQ,ls,ls*0.82);
          }
        };
        // Euler(0, az, tilt) 로 세운 가지의 끝 방향은
        //   (-sin(tilt)·cos(az), cos(tilt), sin(tilt)·sin(az))
        const put=(j,az,ay,len,tilt,leafS)=>{
          E.set(0,az,tilt); Q.setFromEuler(E);
          V.set(p.x,gy+ay,p.z);
          p._lmap[j]=p._lbL+nL; instPut(limbMesh,p._lbL+nL++,V,Q,(TR.brR||TR.rad)*p.s,len*p.s);
          putLeaf(li+j, V, Q, len*p.s, leafS*p.s);
        };
        // 꺾을 수 있는 아래 가지 — 길고 가장 눕는다. 곁가지를 치지 않는다:
        // 한 번에 하나씩 꺾어 가는 것이라 인스턴스 하나에 가지 하나여야 한다
        for(let j=0;j<p.brMax;j++){
          const az=j*2.399+((p._hash>>>(j+3))%100)/100*0.6;
          const jt=((p._hash>>>(j+5))%100)/100;
          put(j, az, (TR.hy+jt*0.55)*p.s, TR.hL*(0.85+jt*0.3), TR.hT-jt*0.12,
              TR.leaf*(0.85+jt*0.3));
        }
        // 구조 가지 — 원가지에서 곁가지가 뻗는다
        let k=p.brMax;
        p._org=new THREE.Vector3(p.x,gy,p.z);       // 곁가지를 굽은 어미 가지에 붙이려면 세계 자리가 필요하다
        growLimbs(p,TR,(pos,quat,len,rad,leafS)=>{
          // growLimbs 는 나무 밑동을 원점으로 센다 — 여기서 세계 자리로 옮긴다
          _lbV.set(p.x+pos.x, gy+pos.y, p.z+pos.z);
          if(len<SHORT_LIMB){ p._lmap[k]=-(p._lbS+nS)-1; instPut(p._ls,p._lbS+nS++,_lbV,quat,rad,len); }
          else{ p._lmap[k]=p._lbL+nL; instPut(limbMesh,p._lbL+nL++,_lbV,quat,rad,len); }
          putLeaf(li+k, _lbV, quat, len, leafS);
          k++;
        });
      };
    }

    // 2차: 행렬 배치
    list.forEach((p,ix)=>{
      const gy=p.y;
      const lh=hashStr('lean|'+Math.round(p.x*7)+'|'+Math.round(p.z*7));
      const leanK=tree?0.10:(R.k==='grass'||R.k==='reed')?0.20:0.5;   // 풀·갈대는 ±6° 까지만(예전 ±14° — 포기째 쓰러져 보였다)
      const lx=((lh%100)/100-0.5)*leanK;
      const lz=(((lh>>>9)%100)/100-0.5)*leanK;
      geos.forEach((g,gi)=>{
        const off=propOff(R.k,p.s);
        if(FLAT_PROP[R.k]){                       // 비탈에 맞춰 눕힌다
          terrainNormal(p.x,p.z,_pN);
          E.set(0,p.r,0); Q.setFromEuler(E);
          _pQt.setFromUnitVectors(_pUP,_pN);
          Q.premultiply(_pQt);
        }else{ E.set(lx,p.r,lz); Q.setFromEuler(E); }
        V.set(p.x,gy+off,p.z); S.set(p.s,p.s,p.s);
        M.compose(V,Q,S); ms[gi].setMatrixAt(ix,M);
      });

      /* 나무의 가지·잎은 여기서 안 짓는다 — 칸이 가까워질 때 `ensureTreeTile` 이 짓는다(위 tile.build) */

      if(HARVEST[R.k]||MINE[R.k]){
        p._fi=ix;
        if(tree){ p._fm=null; p._tm=ms[0]; p._toff=propOff(R.k,p.s); }
        else{
          p._fm=ms[0];
          p._foff=propOff(R.k,p.s);
        }
      }
      if(RAD[R.k]){
        const col={x:p.x,z:p.z,r:RAD[R.k]*p.s};
        COLLIDERS.push(col); p._col=col;
      }
    });

    // 암석류는 인스턴싱 대신, 개체마다 새로 만든 형상을 한 버퍼에 이어 붙인다
    // 풀·갈대는 '보통' 이상에서만 드리운다 — 4만 포기라 낮은 품질에서는 버겁다
    if(R.k==='grass'||R.k==='reed') ms.forEach(m=>{ m.userData.lightRole='soft';
      m.material.userData.wind=R.k; });         // 바람에 잎날 끝이 휜다(envPatch)
    if(ROCK_R[R.k]){
      ms.forEach(m=>{ m.geometry.dispose(); m.material.dispose(); });
      /* 바위를 ROCK_TILE 칸마다 따로 담는다 — 한 덩어리였을 땐 섬 전체 53만 삼각형을 늘 그렸다.
         칸마다 따로 있어야 멀리 있는 칸을 통째로 끌 수 있다(updateTileVis · ROCK_DIST).
         정점 구간(_vs)은 칸 묶음 안에서 센다 — 캐기가 제 묶음만 고친다. */
      const bins=new Map();
      for(const p of list){
        const gx=Math.floor(p.x/ROCK_TILE), gz=Math.floor(p.z/ROCK_TILE), key=gx+','+gz;
        let b=bins.get(key); if(!b){ b={gx,gz,ps:[]}; bins.set(key,b); } b.ps.push(p);
      }
      /* **바위 칸은 가까워질 때 빚는다**(마인크래프트의 청크처럼 — 나무 칸의 가지·잎과 같은 방식). 예전엔 섬의 바위·자갈을
         전부 섬을 만들 때 빚어 들고 있었다(자갈 3,000개만 정점 72만). 섬을 2~3배로 키우면 그것이 4~9배가 된다.
         보이는 거리(큰 바위 200 m · 자갈 70 m) 안에 들면 빚고(`build`), 90 m 더 멀어지면 버린다(updateTileVis).
         캐서 오므라든 것·주워 간 것은 다시 빚을 때 `shrinkFoliage` 가 그 모습으로 되돌린다 */
      for(const b of bins.values()){
        const tile={m:null, ps:b.ps, cx:(b.gx+0.5)*ROCK_TILE, cz:(b.gz+0.5)*ROCK_TILE, r:ROCK_TILE*0.71+4,
                    d:ROCK_R[R.k]<0.3?ROCK_SMALL:ROCK_DIST};
        b.ps.forEach(p=>{ p._batch=null; p._fm=null; p._k=1; });
        tile.build=()=>{
          const batch=buildRockBatch(b.ps,R);
          batch.frustumCulled=true;          // 경계구로 화면 밖 칸도 거른다(캐면 안쪽으로만 오므라든다)
          batch.visible=false; batch.matrixAutoUpdate=false; batch.updateMatrix();
          propGroup.add(batch);
          for(const p of b.ps){ p._batch=batch; shrinkFoliage(p); }
          return batch;
        };
        ROCK_TILES.push(tile);
      }
    }else if(PROP_DIST[R.k]){
      const bins=new Map(), _TM=new THREE.Matrix4();
      list.forEach((p,ix)=>{
        const k=Math.floor(p.x/PROP_TILE)+'|'+Math.floor(p.z/PROP_TILE);
        let b=bins.get(k);
        if(!b){ b={ix:[], gx:Math.floor(p.x/PROP_TILE), gz:Math.floor(p.z/PROP_TILE)}; bins.set(k,b); }
        b.ix.push(ix);
      });
      for(const b of bins.values()){
        const tms=geos.map((g,gi)=>{
          const t=new THREE.InstancedMesh(g,mats[gi],b.ix.length);
          b.ix.forEach((ix,j)=>{ ms[gi].getMatrixAt(ix,_TM); t.setMatrixAt(j,_TM); });
          t.instanceMatrix.needsUpdate=true; t.frustumCulled=false;
          t.userData.lightRole=ms[gi].userData.lightRole;
          propGroup.add(t); return t;
        });
        b.ix.forEach((ix,j)=>{ const p=list[ix]; if(p._fm){ p._fm=tms[0]; p._fi=j; } if(p._tm){ p._tm=tms[0]; p._fi=j; } });
        PROP_TILES.push({ms:tms, cx:(b.gx+0.5)*PROP_TILE, cz:(b.gz+0.5)*PROP_TILE,
                         r:PROP_TILE*0.71, d:PROP_DIST[R.k]});
      }
      ms.forEach(m=>m.dispose&&m.dispose());
    }else{
      ms.forEach(m=>{ m.instanceMatrix.needsUpdate=true; m.frustumCulled=false; propGroup.add(m); });
    }
    /* 임포스터를 **진짜 나무 한 그루를 찍은 사진**으로 바꾼다 — 그림(`makeTreeTex`)은 55 m 에서
       갈아 끼우는 순간 모양이 딴판이라 티가 났다. 한 그루를 골라 가지·잎을 그대로 옆에서
       한 번 그려 두고(불러올 때 한 번), 모든 나무의 판때기가 그 사진을 쓴다. 돌아가는 비용은
       예전과 같다(판때기 하나). 판때기 크기(CAN)도 그 나무의 실제 폭·높이로 다시 잡는다. */
    if(false&&tree&&renderer){    // 그림 임포스터는 안 쓴다 — 상륙 뒤 buildFarTrees 가 기준 나무 복제로 갈아 끼운다
      const bk=bakeTreeImpostor(list,R.k);
      if(bk){
        CAN=bk.can; const bbMat=list[0]._bb.material;
        bbMat.map=bk.tex; bbMat.alphaTest=0.35; bbMat.needsUpdate=true;
        if(list[0]._bb.customDepthMaterial){ const dm=list[0]._bb.customDepthMaterial; dm.map=bk.tex; dm.alphaTest=0.35; dm.needsUpdate=true; }
        for(const p of list){
          // 나무마다 판때기를 제자리에서 돌려 세운다 — 같은 사진이라도 보는 쪽이 달라 덜 똑같다
          _lbV.set(p.x, p.y+CAN.y0*p.s, p.z);
          _lbE.set(0,((p._hash>>>9)%628)/100,0); _lbQ.setFromEuler(_lbE);
          _lbS.set(CAN.w*p.s, (CAN.y1-CAN.y0)*p.s, CAN.w*p.s);
          M.compose(_lbV,_lbQ,_lbS); p._bb.setMatrixAt(p._bbi,M);
        }
        for(const t of TREE_TILES) t.bb.instanceMatrix.needsUpdate=true;
      }
    }
  }

  buildBerries();

  buildColliderGrid();
  buildPropGrid();
}

/* ── 돌 흩뿌리기(자갈밭의 입체) ──────────────────────────────────────────────
   자갈밭(애추 사면 · 노출 암반 · 하천 가 · 분기공)이 색만 다른 매끈한 땅이었다 — 땅 셰이더가 잔돌 무늬를 깔아도
   **솟은 것이 없어** 납작해 보였다. 사람 둘레 40 m 안에 낮은 다각형 돌(20면)을 인스턴스로 흩는다.
   · 자리는 1.3 m 칸마다 칸 번호의 해시로 정한다 — 같은 섬 같은 자리에는 늘 같은 돌이 놓인다(저장할 것이 없다).
   · 칸의 자갈밭 정도(`gravelAt`)가 높을수록 돌이 선다. 크기는 주먹~수박, 20개에 하나는 무릎 높이 바위.
   · 7 m 넘게 걸으면 그 둘레로 다시 깐다(칸 3,800개를 훑는 일 — 1 ms 안팎).
   · 줍거나 캐는 것이 아니다(그건 자갈 'pebble'·화강암이 한다). 그림자는 받기만 한다.
   · **무릎을 넘는 큰 돌은 단단하다**(사용자 지적: 돌을 뚫고 지나간다 · 25 m 안 · `RUBBLE.cols`) — 턱(0.55 m)보다 높으면 몸이 막히고
     낮으면 그 위에 올라선다(`rubbleCollide` · `rubbleFloor` — 80-player.js 가 부른다). 주울 만한 작은 돌은 그대로 밟고 지나간다. */
const RUBBLE={mesh:null, cap:2200, cx:1e9, cz:1e9, R:40, cell:1.3, seed:0, picks:[], cols:[]};
function rubbleInit(){
  /* 물에 닳은 둥근 돌 — 예전엔 각진 20면체(면 20장)라 가까이서 사면체 조각처럼 보였다. 혹 진 공(면 64장)에 법선을 이어
     빛이 둥글게 넘어간다 */
  const g=SHP.blob(1,0x5eed,{w:10,h:7,amp:0.30,nb:4,sy:0.86,rough:0.16}); g.computeBoundingSphere();   // 잔 울퉁불퉁(rough)이 보이게 조금 촘촘히
  const m=new THREE.MeshLambertMaterial({color:0xffffff});
  m.onBeforeCompile=sh=>{                              // 밑동은 어둡게 — 땅에 앉은 느낌
    sh.vertexShader='varying float vRubY;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRubY=position.y;');
    sh.fragmentShader='varying float vRubY;\n'+sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb*=mix(0.50,1.10,smoothstep(-0.55,0.45,vRubY));');
  };
  m.customProgramCacheKey=()=>'rubble';
  m.userData.melt=0.14;                                // 잔돌은 반쯤 묻힌 듯 — 아래 반이 땅 빛깔로 녹아든다(envPatch)
  rockDetailPatch(m,0.8,0.5);                          // 진짜 바위 사진 — 돌마다 다른 장 · 세 방향 · 결의 높낮이(22-ground-textures.js)
  const im=new THREE.InstancedMesh(g,m,RUBBLE.cap);
  /* 인스턴스 색 칸을 처음부터 만들어 둔다(셰이더가 한 가지로 짜인다). **count 를 0 으로 내리기 전에** 불러야 한다 —
     r128 의 setColorAt 은 그때의 count 크기로 버퍼를 잡는다. 0 인 채로 부르면 길이 0 짜리가 생겨 돌이 하나도 안 보였다 */
  im.setColorAt(0,new THREE.Color(1,1,1));
  im.count=0; im.frustumCulled=false; im.userData.lightRole='recv';
  im.matrixAutoUpdate=false; im.updateMatrix();
  scene.add(im); RUBBLE.mesh=im;
}
const _rbM=new THREE.Matrix4(), _rbQ=new THREE.Quaternion(), _rbE=new THREE.Euler(), _rbV=new THREE.Vector3(),
      _rbS=new THREE.Vector3(), _rbC=new THREE.Color();
const RUB_PAL=[[0.46,0.45,0.43],[0.56,0.52,0.45],[0.40,0.39,0.38],[0.29,0.30,0.33],[0.62,0.60,0.56],[0.50,0.45,0.38]];   // 한낮 볕에 하얗게 날지 않을 만큼만 밝게
/* 큰 돌에 몸이 막힌다 — 꼭대기가 발보다 턱(STEPUP) 넘게 높은 것만(낮은 것은 rubbleFloor 로 올라선다) */
function rubbleCollide(p,rad){
  for(const c of RUBBLE.cols){
    if(c.top-p.y<=STEPUP) continue;
    const dx=p.x-c.x, dz=p.z-c.z, rr=c.r+rad*0.8, d2=dx*dx+dz*dz;
    if(d2>=rr*rr||d2<1e-8) continue;
    const d=Math.sqrt(d2); p.x=c.x+dx/d*rr; p.z=c.z+dz/d*rr;
  }
}
/* 발밑의 큰 돌 윗면(둥근 등) — 발에서 턱 높이 안의 것만 딛는다 */
function rubbleFloor(x,z,y){
  let best=-1e9;
  for(const c of RUBBLE.cols){
    const dx=x-c.x, dz=z-c.z, q=(dx*dx+dz*dz)/(c.r*c.r); if(q>=1) continue;
    const h=c.cy+(c.top-c.cy)*Math.sqrt(1-q);
    if(h<=y+STEPUP&&h>best) best=h;
  }
  return best;
}
function updateRubble(force){
  const U=RUBBLE;
  if(!scene) return;
  if(!U.mesh) rubbleInit();
  const px=PL.pos.x, pz=PL.pos.z;
  if(!force && Math.hypot(px-U.cx,pz-U.cz)<7) return;
  U.cx=px; U.cz=pz;
  const C=U.cell, R=U.R, im=U.mesh;
  const x0=Math.floor((px-R)/C), x1=Math.floor((px+R)/C), z0=Math.floor((pz-R)/C), z1=Math.floor((pz+R)/C);
  let n=0; U.picks.length=0; U.cols.length=0;
  for(let gz=z0;gz<=z1&&n<U.cap;gz++) for(let gx=x0;gx<=x1&&n<U.cap;gx++){
    let h=(Math.imul(gx,374761393)+Math.imul(gz,668265263)+U.seed)|0;
    h=Math.imul(h^(h>>>13),1274126177); h=(h^(h>>>16))>>>0;
    const wx=(gx+(h&255)/255)*C, wz=(gz+((h>>>8)&255)/255)*C;
    const d=Math.hypot(wx-px,wz-pz); if(d>R) continue;
    const ix=clamp(Math.round(wx/CELL+N/2),1,N-2), iz=clamp(Math.round(wz/CELL+N/2),1,N-2), ci=IDX(ix,iz);
    if(F.elev[ci]<=0.25) continue;                     // 물 밑·물가는 뺀다
    /* 벼랑 밑의 돌무더기(지형 판 3) — 가파른 칸과 그 이웃 칸에는 굴러떨어진 돌이 쌓인다(바이옴이 자갈밭이 아니어도).
       가파를수록 촘촘하고, 큰 돌이 섞이는 비율도 는다(열여섯에 하나 → 여덟에 셋) */
    /* **소금 더께**(지형 판 3 · 사용자 요청) — 모래 해변의 물가 위(0.35~1.6 m)에 드문드문 흰 더께가 앉는다. 곡괭이로 캔다(95-flora.js `salt`) */
    const salt=(P.tv|0)>=3&&F.biome[ci]===B.BEACH&&F.elev[ci]>0.35&&F.elev[ci]<1.6&&((h>>>16)&1023)<30;
    let gk=salt?1:(GRAVEL_K[F.biome[ci]]||0), tal=0;
    if((P.tv|0)>=3){ tal=smoothstep(0.42,0.95,Math.max(F.slope[ci],F.slope[ci-1],F.slope[ci+1],F.slope[ci-N],F.slope[ci+N])); if(tal*0.85>gk) gk=tal*0.85; }
    if(!(gk>0)) continue;
    if(!salt&&((h>>>16)&1023)/1023 > gk*0.66) continue;
    const u=((h>>>26)&63)/63;
    let r=salt?0.24+0.16*u:0.09+0.22*u*u;              // 주먹 ~ 수박(소금 더께는 넓적하다)
    let h2=Math.imul(h^0x9e3779b9,2246822519)>>>0;
    if(!salt&&((h2&15)===0||(tal>0.5&&(h2&7)<3))) r=0.36+0.34*((h2>>>5)&15)/15;      // 열여섯에 하나는 무릎~허리 높이 바위(벼랑 밑은 더 자주)
    /* 주먹~수박만 한 돌은 주울 수 있다(95-flora.js 의 `floraPick` — 얻는 것은 돌멩이). 주운 자리는 사흘 뒤 다시 찬다 */
    const pk=salt||r<0.34, key='S'+gx+','+gz;
    if(pk){ const tk=FLORA.taken.get(key); if(tk!==undefined){ if(gameHours-tk<72) continue; FLORA.taken.delete(key); } }
    r*=clamp((R-d)/8,0.2,1);                            // 가장자리에서 갑자기 생기지 않게 작게 시작
    const gs0=groundSlope(wx,wz,Math.max(0.25,r)), sl0=Math.hypot(gs0[0],gs0[1]);
    if(sl0>1.25) continue;                              // 52° 넘는 벽에는 돌이 얹혀 있을 수 없다(벽에 붙어 떠 보였다)
    const sy=salt?0.26:0.5+0.35*((h2>>>9)&15)/15;
    _rbE.set(((h2>>>13)&63)/63*0.7-0.35,((h2>>>19)&255)/255*6.283,((h2>>>27)&31)/31*0.7-0.35);
    _rbQ.setFromEuler(_rbE);
    _rbV.set(wx,heightAt(wx,wz)+r*sy*0.42-r*Math.min(0.9,sl0)*0.55,wz);   // 비탈에서는 더 묻는다(아래쪽이 뜨지 않게)
    _rbS.set(r*(0.85+0.4*((h>>>4)&15)/15),r*sy,r);
    _rbM.compose(_rbV,_rbQ,_rbS); im.setMatrixAt(n,_rbM);
    /* 주울 돌 여섯에 하나는 **석회석**(희다) — 구우면 석회, 시멘트의 바탕(사용자 요청). 자리의 해시로 정하니 섬의 생김새는 그대로다 */
    const lime=!salt&&pk&&((h2>>>22)%6)===0;
    if(pk&&d<16) U.picks.push({kind:salt?'salt':lime?'limerock':'stone',x:wx,y:_rbV.y,z:wz,key,r,tree:false});
    if(!pk&&d<25) U.cols.push({x:wx,z:wz,r:r*0.95,cy:_rbV.y,top:_rbV.y+0.9*r*sy});   // 큰 돌 — 몸이 막히거나 올라선다
    const pc=salt?[1.05,1.05,1.02]:lime?[0.92,0.90,0.84]:RUB_PAL[(h2>>>3)%RUB_PAL.length], tv=0.86+0.28*((h>>>12)&15)/15;
    im.setColorAt(n,_rbC.setRGB(pc[0]*tv,pc[1]*tv,pc[2]*tv));
    n++;
  }
  im.count=n;
  im.instanceMatrix.needsUpdate=true;
  if(im.instanceColor) im.instanceColor.needsUpdate=true;
}

/* ── 열매 ────────────────────────────────────────────────────────────────
   예전에는 덤불 꼭대기에 붉은 점 하나를 얹었다. 멀리서 구분은 됐지만
   가까이 가면 공 하나가 떠 있는 꼴이고, 따 먹어도 그대로 남아 있었다.

   이제 덤불마다 열매를 여러 알 달되 한자리에 뭉치지 않는다. 실제 덤불은
   가지 끝마다 몇 알씩 송이로 달리고, 익은 것과 덜 익은 것이 섞여 있으며,
   무게 때문에 잎 사이로 처져 나온다. 셋을 다 흉내 낸다:
     · 송이 — 알을 잎 사이 여러 곳에 나눠 달고, 한 곳마다 2~3알을 붙인다
     · 익는 차이 — 짙은 붉은빛부터 덜 익은 주홍·연둣빛까지 섞는다
     · 처짐 — 바깥으로 갈수록 낮게 달리고, 알은 세로로 조금 납작하다
   따면 그만큼 사라진다(refreshBerry). 알 하나가 p.berry 하나다. */
let berryMesh=null;
/* 임시 그릇 — buildProps 안의 V/Q/E/S/M 은 그 함수의 지역 변수라 여기서 못 쓴다 */
const _bV=new THREE.Vector3(), _bQ=new THREE.Quaternion(), _bE=new THREE.Euler(),
      _bS=new THREE.Vector3(), _bM=new THREE.Matrix4();
const BERRY_RIPE=[0x7e1e2e,0x8e2438,0xa02c40,0xb0364a];   // 익은 것 — 짙은 붉은빛
const BERRY_RAW =[0xc0764e,0xa8894a,0x8a9a52];            // 덜 익은 것 — 주홍·연둣빛
function buildBerries(){
  berryMesh=null;
  const ALL=PROPS.filter(p=>p.k==='grass'&&p.berryMax>0);
  if(!ALL.length) return;
  /* 64 m 칸(PROP_TILE)마다 따로 담는다 — 섬 전체 1만 5천 알이 한 메시라 거리와 상관없이 늘 전부
     그려졌다(130만 삼각형). 칸마다 알 메시·꼭지 줄기 메시를 두고 PROP_TILES 에 넣어 BERRY_DIST 밖·화면 밖을 끈다.
     덤불은 제 칸 메시 p._bm 의 p._bi 번부터 쓴다. */
  const byTile=new Map();
  for(const p of ALL){ const k=Math.floor(p.x/PROP_TILE)+','+Math.floor(p.z/PROP_TILE);
    let a=byTile.get(k); if(!a){ a=[]; byTile.set(k,a); } a.push(p); }
  for(const bushes of byTile.values()) buildBerryTile(bushes);
  refreshAllBerries();
}
const BERRY_DIST=90;
function buildBerryTile(bushes){
  let total=0;
  for(const p of bushes){
    /* 딸 수 있는 알(berryMax) 뒤에 덜 익은 알 둘을 덤으로 붙인다. 이것은
       따지지 않고 늘 남는다 — 덤불이 휑해 보이지 않고, "아직 안 익었다" 는
       말이 눈에 보인다. 따는 쪽은 앞의 berryMax 개만 센다. */
    p._bi=total; p._bn=p.berryMax+2; total+=p._bn;
  }
  if(!total) return;
  const gx=Math.floor(bushes[0].x/PROP_TILE), gz=Math.floor(bushes[0].z/PROP_TILE);
  /* 알 하나는 반지름 1 의 공으로 만들고 인스턴스 배율로 크기를 준다.
     가로보다 세로를 조금 눌러야 매달린 열매처럼 보인다. */
  /* 8×6 공(삼각형 80) — 12×9(216)이던 것을 줄였다. 지름 4~7 cm 라 두세 걸음만 떨어져도 몇 화소이고,
     섬 전체 1만 5천 알이 삼각형 316만을 먹어 한 프레임 삼각형의 1/5 이었다. 매끈함은 셰이더 명암이 맡는다 */
  const geo=new THREE.SphereGeometry(1,8,6);
  const bmat=new THREE.MeshLambertMaterial({color:0xffffff});
  /* 열매답게 — ① 껍질이 매끄러워 해를 받는 한 점이 반짝이고(좁은 반사광)
     ② 얇은 껍질 밑 과육이 빛을 머금어 가장자리가 붉게 비치고(역광 투과 흉내)
     ③ 꼭지 반대편 아래 끝에 꽃받침 자국이 짙게 남는다. 알은 거의 곧추 달리므로
     제 몸 좌표의 아래(−y)가 곧 땅쪽이다. */
  bmat.onBeforeCompile=sh=>{
    sh.uniforms.uSunDir=TERR_U.uSunDir;
    sh.vertexShader='attribute float aH;\nvarying vec3 vBN;\nvarying vec3 vBV;\nvarying vec3 vBP;\n'+
      sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n  vBN=normalize(transformedNormal); vBV=mvPosition.xyz; vBP=position;');
    sh.fragmentShader='uniform vec3 uSunDir;\nvarying vec3 vBN;\nvarying vec3 vBV;\nvarying vec3 vBP;\n'+
      sh.fragmentShader.replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',`
      vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
      {
        vec3 N=normalize(vBN), V=-normalize(vBV), L=normalize(mat3(viewMatrix)*uSunDir);
        float up=max(uSunDir.y,0.0);
        float cal=smoothstep(-0.78,-0.95,vBP.y);                       // 꽃받침 자국
        outgoingLight*=1.0-0.55*cal;
        float rim=pow(1.0-max(dot(N,V),0.0),2.5);                        // 가장자리 과육 비침
        outgoingLight+=diffuseColor.rgb*vec3(1.0,0.45,0.4)*rim*0.14*(0.4+0.6*up);
        float sp=pow(max(dot(reflect(-L,N),V),0.0),90.0)*up;             // 매끈한 껍질의 반짝임
        outgoingLight+=vec3(sp*0.55*(1.0-cal));
      }`);
  };
  bmat.customProgramCacheKey=()=>'berry';
  bmat.userData.wind='berry';   // 'leaf' 는 정점마다 떨어 알이 우글쭈글했다 — 덤불과 같은 식으로 통째로 민다
  const bm=new THREE.InstancedMesh(geo,bmat,total);
  const C=new THREE.Color(), stems=[], aH=new Float32Array(total);
  for(const p of bushes){
    const rnd=mulberry32((p._hash||0)^0x2f6b1a3d);
    p._bs=[];
    let cl=null, cn=0;                       // 지금 붙이고 있는 송이와 남은 알 수
    for(let k=0;k<p._bn;k++){
      if(cn<=0){                             // 새 송이 — 잎 사이 한 곳을 고른다
        const a=rnd()*6.283, t=rnd(), rr=(0.09+t*0.19)*p.s;
        /* 바깥으로 갈수록 낮게 — 무게에 처져 잎 밖으로 나온다.
           잎날이 0.44~0.78 이므로 그 가운데 위쪽에 걸리게 잡는다. */
        cl={x:Math.cos(a)*rr, z:Math.sin(a)*rr,
            y:(0.62-0.28*t+rnd()*0.12)*p.s};
        cn=2+((rnd()*3)|0); cl.i=0;
        stems.push([p.x+cl.x,p.y+cl.y+0.03*p.s,p.z+cl.z,p.x,p.y+0.30*p.s,p.z,0.30,cl.y/p.s+0.03]);
        cl.hue=rnd();                        // 한 송이는 익는 정도가 비슷하다
      }
      cn--;
      const raw=(k>=p.berryMax) || rnd()<0.18;   // 뒤의 둘은 늘 덜 익은 것
      const pal=raw?BERRY_RAW:BERRY_RIPE;
      const sc=(raw?0.022:0.027+rnd()*0.010)*(0.85+p.s*0.3);   // 지름 4~7 cm — 예전엔 자두만 했다
      // 같은 송이는 가까운 빛깔 — 무작위로 섞으면 알마다 따로 논다
      const ci=Math.min(pal.length-1,Math.max(0,Math.round(cl.hue*(pal.length-1)+(rnd()-0.5)*1.2)));
      C.setHex(pal[ci]); C.offsetHSL((rnd()-0.5)*0.02,0,(rnd()-0.5)*0.05);
      bm.setColorAt(p._bi+k,C);
      /* 송이는 꼭지에서 아래로 늘어진다 — 첫 알이 꼭지 밑, 다음 알들이 둘레를 돌며
         조금씩 아래에 붙는다(알끼리 닿을 만큼) */
      const ga=cl.i*2.4+rnd()*0.6, gr=cl.i?0.032*p.s:0;
      _bV.set(p.x+cl.x+Math.cos(ga)*gr+(rnd()-0.5)*0.015*p.s,
              p.y+cl.y-cl.i*0.022*p.s+(rnd()-0.5)*0.015*p.s,
              p.z+cl.z+Math.sin(ga)*gr+(rnd()-0.5)*0.015*p.s);
      cl.i++;
      _bE.set((rnd()-0.5)*0.4,rnd()*6.283,(rnd()-0.5)*0.4); _bQ.setFromEuler(_bE);   // 거의 곧추 — 꽃받침 자국이 아래로
      _bS.set(sc,sc*(0.80+rnd()*0.14),sc);     // 세로로 조금 납작하게
      _bM.compose(_bV,_bQ,_bS); bm.setMatrixAt(p._bi+k,_bM);
      aH[p._bi+k]=Math.max(0,(_bV.y-p.y)/p.s);
      p._bs[k]=[_bV.x,_bV.y,_bV.z,_bS.x,_bS.y,_bS.z,_bQ.x,_bQ.y,_bQ.z,_bQ.w];
    }
  }
  geo.setAttribute('aH',new THREE.InstancedBufferAttribute(aH,1));
  bm.instanceMatrix.needsUpdate=true;
  if(bm.instanceColor) bm.instanceColor.needsUpdate=true;
  bm.frustumCulled=false;
  berryMesh=bm; propGroup.add(bm);
  for(const p of bushes) p._bm=bm;
  const tile={ms:[bm], cx:(gx+0.5)*PROP_TILE, cz:(gz+0.5)*PROP_TILE, r:PROP_TILE*0.71, d:BERRY_DIST};
  PROP_TILES.push(tile);
  /* 송이마다 꼭지 줄기 — 덤불 밑동 가운데에서 송이 꼭대기까지 가는 줄기 하나.
     없으면 알이 잎 사이 허공에 떠 있었다. 줄기는 따도 남는다(덤불의 일부). */
  if(stems.length){
    const sg=new THREE.CylinderGeometry(0.5,0.5,1,4,1,true); sg.translate(0,0.5,0);
    const smat=new THREE.MeshLambertMaterial({color:0x4a5a2a}); smat.userData.wind='stalk';
    smat.onBeforeCompile=sh=>{ sh.vertexShader='attribute float aH0;\nattribute float aH1;\n'+sh.vertexShader; };
    smat.customProgramCacheKey=()=>'stalk';
    const h0=new Float32Array(stems.length), h1=new Float32Array(stems.length);
    stems.forEach((t,i)=>{ h0[i]=t[6]; h1[i]=t[7]; });
    sg.setAttribute('aH0',new THREE.InstancedBufferAttribute(h0,1));
    sg.setAttribute('aH1',new THREE.InstancedBufferAttribute(h1,1));
    
    const sm=new THREE.InstancedMesh(sg,smat,stems.length);
    const a=new THREE.Vector3(), d=new THREE.Vector3(), up=new THREE.Vector3(0,1,0);
    stems.forEach((t,i)=>{
      a.set(t[3],t[4],t[5]); d.set(t[0]-t[3],t[1]-t[4],t[2]-t[5]);
      const L=d.length(); d.normalize(); _bQ.setFromUnitVectors(up,d);
      _bS.set(0.006,L,0.006); _bM.compose(a,_bQ,_bS); sm.setMatrixAt(i,_bM);
    });
    sm.instanceMatrix.needsUpdate=true; sm.frustumCulled=false; propGroup.add(sm);
    tile.ms.push(sm);
  }
}
/* 딴 만큼 사라진다 — 남은 알만 세워 두고 나머지는 배율 0 으로 접는다 */
function refreshBerry(p){
  const bm=p._bm; if(!bm||p._bi===undefined||!p._bs) return;
  for(let k=0;k<(p._bn||p.berryMax);k++){
    const d=p._bs[k]; if(!d) continue;
    const on=(k>=p.berryMax) || k<(p.berry|0);   // 덜 익은 알은 따지지 않으니 늘 남는다
    _bV.set(d[0],d[1],d[2]);
    _bQ.set(d[6],d[7],d[8],d[9]);
    _bS.set(on?d[3]:0, on?d[4]:0, on?d[5]:0);
    _bM.compose(_bV,_bQ,_bS); bm.setMatrixAt(p._bi+k,_bM);
  }
  bm.instanceMatrix.needsUpdate=true;
}
function refreshAllBerries(){
  if(!berryMesh) return;
  for(const p of PROPS) if(p.k==='grass'&&p.berryMax>0) refreshBerry(p);
}

/* 충돌체 공간 해시 — 매 프레임 2000개를 전부 도는 대신 8 m 셀만 본다 */
const CGRID=new Map(), CG=8;
const cgKey=(x,z)=>((x+2048)|0)*4096+((z+2048)|0);
function buildColliderGrid(){
  CGRID.clear();
  for(const c of COLLIDERS){
    const k=cgKey(Math.floor(c.x/CG),Math.floor(c.z/CG));
    let a=CGRID.get(k); if(!a){a=[];CGRID.set(k,a);} a.push(c);
  }
}
/* 충돌체 하나를 옮긴다 — 칸이 바뀌면 그 칸 목록만 고친다(밀기 · 60-stations.js) */
function cgMove(c,x,z){
  const k0=cgKey(Math.floor(c.x/CG),Math.floor(c.z/CG)), k1=cgKey(Math.floor(x/CG),Math.floor(z/CG));
  c.x=x; c.z=z; if(k0===k1) return;
  const a=CGRID.get(k0); if(a){ const i=a.indexOf(c); if(i>=0) a.splice(i,1); }
  let b=CGRID.get(k1); if(!b){ b=[]; CGRID.set(k1,b); } b.push(c);
}
/* 충돌체는 원이다({x,z,r}). `prof`(방위별 반지름 표)가 있으면 그 방위의 반지름을 쓴다 — 바위는 길쭉하고 한쪽이 깎여 있어
   원 하나로는 넓은 쪽에서 **눈이 바위 속으로 들어가 안이 들여다보였다**(사용자 지적). 표는 실제 메시의 꼭짓점에서 뽑는다 */
function resolveProps(p,radius){
  const gx=Math.floor(p.x/CG), gz=Math.floor(p.z/CG);
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
    const a=CGRID.get(cgKey(gx+dx,gz+dz)); if(!a) continue;
    for(const c of a){
      const ddx=p.x-c.x, ddz=p.z-c.z; let rr=c.r+radius;
      const d2=ddx*ddx+ddz*ddz;
      if(d2>=rr*rr||d2<1e-8) continue;
      if(c.y0!==undefined&&p.y!==undefined&&(p.y>c.y1||p.y+1.7<c.y0)) continue;   // 높이가 있는 것(토대·지붕 위 상자 등) — 위층·아래층은 안 막는다
      if(c.prof){                                     // 둥글지 않은 것(바위 · 노거수의 판근) — 그 방위의 반지름
        const K=c.prof.length, a=(Math.atan2(ddz,ddx)/6.2832+1)%1*K, i=Math.floor(a), f=a-i;
        rr=c.prof[i%K]*(1-f)+c.prof[(i+1)%K]*f+radius;
        if(d2>=rr*rr) continue;
      }
      const d=Math.sqrt(d2);
      p.x=c.x+ddx/d*rr; p.z=c.z+ddz/d*rr;
    }
  }
}

/* 상륙 지점 — 해변 셀 하나를 골라 화물 컨테이너를 놓는다 */
let podPos=new THREE.Vector3();
function placePod(seed){
  const rnd=mulberry32(seed^0x5bf03635);
  const beaches=[];
  for(let i=0;i<N*N;i++) if(F.biome[i]===B.BEACH) beaches.push(i);
  let i = beaches.length ? beaches[(rnd()*beaches.length)|0] : IDX(N>>1,N>>1);
  // 해변이 없으면 가장 낮은 육지로 대체
  if(!beaches.length){
    let best=-1,bv=1e9;
    for(let k=0;k<N*N;k++) if(F.elev[k]>0.4&&F.elev[k]<bv){bv=F.elev[k];best=k;}
    if(best>=0) i=best;
  }
  const x=(i%N-N/2)*CELL, z=(((i/N)|0)-N/2)*CELL;
  podPos.set(x,Math.max(0.3,heightAt(x,z)),z);
  /* 여기 서 있던 '구명 캡슐'은 치웠다 — 상자 하나에 전구를 붙인 옛 모형인데,
     제대로 만든 보급선이 같은 자리에 내려앉는다. 등불이 사거리 26 m 짜리
     그림자 광원이라, **시작 지점에서 밤낮없이 두 번째 그림자를 드리우고 있었다**
     (허허벌판 아침에 그림자가 둘 보이던 것이 이것이다).
     `podPos` 는 남긴다 — 시작 자리 · 지도 표시 · '캡슐에서 몇 m' 안내가 쓴다. */
  /* 착륙 자리(`LANDING`) — 배는 캡슐에서 바다 쪽으로 9 m · 머리를 바다로. 사람은 **늘 배 뒤 같은 자리**에서 깬다
     (예전엔 캡슐 둘레 3 m 의 무작위 각도라 켤 때마다 배가 화면의 다른 데 있었고, 배 꼬리 엔진 속에서 깨기도 했다).
     배 로컬(앞 −z · 꼬리 +z)로 왼쪽 뒤 (−4.5, 13.5) 에서 배 가운데를 비스듬히 본다 — 거기가 물·급사면이면 정해 둔
     차례대로 다음 후보. 자원 배치가 끝난 뒤 buildProps 전에 불러 배 · 깨는 자리의 자원을 뺀다(clearLanding) */
  const away=new THREE.Vector3(podPos.x,0,podPos.z).normalize();
  if(!isFinite(away.x)||away.lengthSq()<1e-6) away.set(0,0,1);
  const sx=podPos.x+away.x*9, sz=podPos.z+away.z*9, th=Math.atan2(away.x,away.z)+Math.PI, c=Math.cos(th), sn=Math.sin(th);
  const W=(lx,lz)=>[sx+lx*c+lz*sn, sz-lx*sn+lz*c];
  let spot=null;
  for(const [lx,lz] of [[-4.5,13.5],[4.5,13.5],[0,15],[-9,11],[9,11],[-12,4],[12,4],[0,19],[-6,18],[6,18]]){
    const [x,z]=W(lx,lz), gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2);
    if(gx<2||gz<2||gx>N-3||gz>N-3) continue;
    const i=IDX(gx,gz); if(F.elev[i]<0.4||F.slope[i]>0.6||F.river[i]) continue;
    spot=[x,z]; break;
  }
  if(!spot) spot=W(0,13.5);
  LANDING={x:sx,z:sz,th,away,sx:spot[0],sz:spot[1]};
  clearLanding(LANDING);
}
let LANDING=null;
/* 착륙 자리 안인가 — 배 네모(배 로컬 |x|<9.2 · −8.6<z<9)나 깨는 자리 3 m 안. pad 만큼 넓혀 본다(군락 나무 · 노거수가 피한다) */
function inLanding(x,z,pad){
  const L=LANDING; if(!L) return false; pad=pad||0;
  const c=Math.cos(L.th), s=Math.sin(L.th), dx=x-L.x, dz=z-L.z, lx=dx*c-dz*s, lz=dx*s+dz*c;
  return (Math.abs(lx)<9.2+pad&&lz>-8.6-pad&&lz<9+pad)||Math.hypot(x-L.sx,z-L.sz)<3+pad;
}

/* ── 보급선 ───────────────────────────────────────────────────────────────
   상륙하면 보급선이 캡슐을 내려놓은 자리에 잠시 서 있다가 떠오른다.
   여섯 밤을 기다려 주지 않는다 — 좌표만 남기고 간다는 것이 이 게임의 첫 줄이다.
   상태는 셋: 'wait' 잠시 머무름 → 'rise' 떠오름 → 'away' 멀어짐, 그 뒤 지운다. */
let shipMesh=null, SHIP={st:'wait', t:0, from:new THREE.Vector3(), dir:new THREE.Vector3()};
function makeShip(){
  if(shipMesh){ scene.remove(shipMesh); shipMesh=null; }
  if(SHIP.parked){ scene.remove(SHIP.parked); SHIP.parked=null; }   // 지난 배가 남긴 광원(세기 0) — 새 배가 하나를 더하니 수는 그대로
  /* 수직 이착륙 수송선 — 앞이 −z. 둥근 동체(돌림체) · 유리 조종석 · 뒤로 젖힌 날개 끝에
     엔진 통 둘 · 꼬리 엔진 · 기운 수직 꼬리 둘 · 세 발 착륙 다리 · 뒤쪽 화물 경사판.
     판금 이음을 짙은 띠로 끊고, 날개 끝에 빨강·초록 항법등을 깜박인다.
     쇠는 퐁으로 해를 받아 번뜩인다(WMAT 과 같은 규칙). */
  const g=new THREE.Group(); SHIP.navs=[];
  const P=(c,sh)=>new THREE.MeshPhongMaterial({color:c,specular:0x777777,shininess:sh||40});
  const HULL=P(0x7d858f), DARK=P(0x3e444c,20), PANEL=P(0x5f6770,30), ACC=P(0xc0762a,30);
  const Y=3.2;                                                   // 동체 중심 높이
  // 동체 — 앞은 둥글게 모이고 뒤는 넓게 끝나는 돌림체를 z 축으로 눕힌다
  const prof=[[0,-7.2],[0.9,-6.8],[1.7,-5.8],[2.2,-4.2],[2.4,-1.5],[2.45,2.5],[2.3,4.8],[2.0,6.0],[0,6.0]]
    .map(q=>new THREE.Vector2(q[0],q[1]));
  const hull=new THREE.Mesh(new THREE.LatheGeometry(prof,24),HULL);
  hull.rotation.x=Math.PI/2; hull.scale.set(1.25,1,0.62); hull.position.y=Y; g.add(hull);  // 옆으로 넓고 위아래로 눌러 — 양력 몸통 꼴
  for(const z of [-3.2,-0.4,2.4,4.6]){                           // 판금 이음 띠
    const r=z<-2?2.25:2.46;
    const band=new THREE.Mesh(new THREE.TorusGeometry(r,0.05,4,28),DARK);
    band.scale.set(1.25,0.62,1); band.position.set(0,Y,z); g.add(band);
  }
  const belly=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.5,8.5),PANEL);   // 배 밑 판
  belly.position.set(0,Y-1.85,0.6); g.add(belly);
  // 조종석 유리 — 앞 윗면에 덮은 짙은 반구
  const glass=new THREE.Mesh(new THREE.SphereGeometry(1.25,20,12,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshPhongMaterial({color:0x18252e,specular:0xbfd8ff,shininess:120,transparent:true,opacity:0.88}));
  glass.scale.set(1.15,0.75,1.9); glass.position.set(0,Y+0.95,-4.6); g.add(glass);
  const frame=new THREE.Mesh(new THREE.TorusGeometry(1.25,0.07,4,24,Math.PI),DARK);
  frame.scale.set(1.15,1.9,0.75); frame.rotation.x=-Math.PI/2; frame.rotation.z=Math.PI/2;
  frame.position.set(0,Y+0.95,-4.6); g.add(frame);
  // 날개 — 뒤로 젖힌 평면을 뽑아 낸다
  const ws=new THREE.Shape(); ws.moveTo(0,-2.6); ws.lineTo(5.4,1.0); ws.lineTo(5.4,2.9); ws.lineTo(0,3.6); ws.lineTo(0,-2.6);   // 뿌리 6.2 m · 끝 1.9 m
  const wg=new THREE.ExtrudeGeometry(ws,{depth:0.42,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.06,bevelSegments:1});
  wg.rotateX(Math.PI/2);
  SHIP.jets=[];
  /* 엔진 통 — 늘 앞뒤(z)로 눕는다. down 이면 통 배에 노즐을 달아 아래로 뿜고(수직 이착륙),
     아니면 꽁무니 노즐로 뒤로 뿜는다 */
  const addEngine=(x,y,z,rad,len,down)=>{
    const body=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad*1.05,len,16),PANEL);
    body.rotation.x=Math.PI/2; body.position.set(x,y,z); g.add(body);
    const cone=new THREE.Mesh(new THREE.SphereGeometry(rad,14,8,0,Math.PI*2,0,Math.PI/2),HULL);
    cone.rotation.x=-Math.PI/2; cone.scale.set(1,1.4,1); cone.position.set(x,y,z-len/2); g.add(cone);   // 둥근 앞
    const intake=new THREE.Mesh(new THREE.TorusGeometry(rad*1.02,rad*0.12,6,16),DARK);
    intake.position.set(x,y,z-len/2+0.15); g.add(intake);
    const noz=new THREE.Mesh(new THREE.CylinderGeometry(rad*0.62,rad*0.78,rad*0.8,16,1,true),DARK);
    noz.material.side=THREE.DoubleSide;
    const nzY=down?y-rad-rad*0.3:y, nzZ=down?z+len*0.12:z+len/2+rad*0.35;
    if(!down) noz.rotation.x=-Math.PI/2;
    noz.position.set(x,nzY,nzZ); g.add(noz);
    const pl=makePlume(len*(down?3.2:2.6),rad*(down?0.7:0.8));
    if(down) pl.position.set(x,nzY-rad*0.4,nzZ);
    else { pl.rotation.x=-Math.PI/2; pl.position.set(x,y,nzZ+rad*0.4); }
    g.add(pl); SHIP.jets.push(pl);
    const hot=new THREE.Mesh(new THREE.CircleGeometry(rad*(down?0.58:0.72),16),new THREE.MeshBasicMaterial({color:0x2a1a10}));
    if(down){ hot.rotation.x=Math.PI/2; hot.position.set(x,nzY+rad*0.1,nzZ); }   // 노즐 속 — 켜지면 달아오른다
    else hot.position.set(x,y,nzZ-rad*0.1);
    g.add(hot); SHIP.hots.push(hot);
  };
  SHIP.hots=[];
  for(const sx of [-1,1]){
    const w=new THREE.Mesh(wg,HULL); w.scale.set(sx,1,1); w.position.set(sx*1.9,Y-0.4,0.4);
    w.rotation.z=sx*0.08; g.add(w);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.06,0.5),ACC);   // 날개 위 주황 띠
    stripe.position.set(sx*4.0,Y-0.12,0.2); stripe.rotation.y=-sx*0.42; g.add(stripe);
    addEngine(sx*7.7,Y-0.35,1.4,0.85,4.2,true);                // 날개 끝 엔진 통 — 배의 노즐로 내려 뿜는다
    const nav=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),new THREE.MeshBasicMaterial({color:sx<0?0xff3030:0x30ff60}));
    nav.position.set(sx*8.55,Y-0.35,3.6); g.add(nav); SHIP.navs.push(nav);
    // 꼬리 날개 — 바깥으로 기운 두 장
    const fs=new THREE.Shape(); fs.moveTo(0,0); fs.lineTo(2.4,0); fs.lineTo(1.3,2.6); fs.lineTo(0.5,2.6); fs.lineTo(0,0);
    const fin=new THREE.Mesh(new THREE.ExtrudeGeometry(fs,{depth:0.18,bevelEnabled:false}),HULL);
    fin.rotation.y=Math.PI/2; fin.rotation.z=-sx*0.35; fin.position.set(sx*1.2,Y+1.5,5.9); g.add(fin);
    // 착륙 다리 — 버팀대 · 완충기 · 받침
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,Y-1.4,8),DARK);
    leg.position.set(sx*1.9,(Y-1.4)/2+0.2,2.8); leg.rotation.z=sx*0.18; g.add(leg);
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.65,0.18,12),DARK);
    foot.position.set(sx*2.2,0.1,2.8); g.add(foot);
  }
  const nleg=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.17,Y-1.6,8),DARK);
  nleg.position.set(0,(Y-1.6)/2+0.2,-4.0); g.add(nleg);
  const nfoot=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.5,0.16,12),DARK);
  nfoot.position.set(0,0.08,-4.0); g.add(nfoot);
  addEngine(0,Y+0.2,6.6,1.15,1.6,false);                        // 꼬리 주 엔진(뒤로 뿜는다)
  // 화물 경사판 · 안테나
  const ramp=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.14,2.2),PANEL);
  ramp.position.set(0,Y-1.7,5.6); ramp.rotation.x=0.25; g.add(ramp);
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,1.6,5),DARK);
  ant.position.set(0.6,Y+2.4,-1.5); g.add(ant);
  // 이륙 먼지 — 엔진이 땅을 때려 일으킨다(연기 셰이더를 크게)
  const dust=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,0.5,0),fireMats().smoke);
  dust.scale.set(22,9,1); dust.position.set(0,-0.3,1.5); dust.frustumCulled=false; dust.visible=false; dust.userData.lightRole='none';
  g.add(dust); SHIP.dust=dust;
  /* 총알이 맞는 몸 — 불꽃·먼지·노즐 속·항법등은 뺀다(직접 붙인 메시만 · 불꽃은 묶음이라 저절로 빠진다) */
  SHIP.solids=g.children.filter(o=>o.isMesh&&o!==dust&&!SHIP.hots.includes(o)&&!SHIP.navs.includes(o)&&o!==glass);
  SHIP.solids.push(glass);
  SHIP.box=shipBoxes(Y,prof.map(v=>[v.x,v.y]));
  const li=LIGHT.addPoint(g,{color:0x9fd8ff,intensity:0,dist:40,pos:[0,1.0,2.0]});
  SHIP.light=li;
  /* 캡슐 옆에 내려앉는다 — 바다 쪽으로 머리를 두게 놓는다(자리는 placePod 가 정한 LANDING) */
  const L=LANDING;
  SHIP.dir.copy(L.away);
  SHIP.from.set(L.x,Math.max(0.3,heightAt(L.x,L.z)),L.z);
  g.position.copy(SHIP.from);
  g.rotation.y=L.th;
  scene.add(g); shipMesh=g;
  SHIP.st='wait'; SHIP.t=0;
}
/* ── 보급선 히트박스 ────────────────────────────────────────────────────
   배 자리 기준(로컬 — 앞이 −z · 배 중심 x 0 · 바닥 y 0)의 **볼록 다각형 + 높이 구간**(y0~y1)으로 몸을 적는다(`SHIP.box`).
   예전엔 아무 판정이 없어 배를 그냥 걸어서 뚫었고, 상륙 자리(캡슐 둘레 3 m · 배는 캡슐에서 9 m)가 배 몸 속일 때도 있었다.
   · 몸통 — 납작한 양력 몸통이라 옆구리 밑면이 2.5 m 넘게 떠 있다. 그래서 **밑면 높이로 잘라 층을 낸다**: 밑면이 c 보다
     낮은 곳의 윤곽을 c 마다(1.9 · 2.5 · 3.1 · 3.2 m) 하나씩 — 서 있는 사람은 옆구리 밑을 지나 배 밑판에서 막히고,
     뛰면 머리가 옆구리 밑면에 닿는다. 배 밑판(1.1 m) · 날개(2.3~3.3 m) · 날개 끝 엔진 · 꼬리 엔진 · 경사판 · 다리 셋.
   · 사람 — `shipCollide`: 발~머리가 겹치는 다각형마다 가장 얕게 들어간 변 쪽으로 밀어낸다. 지난 프레임에 머리가 그 밑면
     아래였으면 옆으로 밀지 않고 머리를 막는다(천장). `shipFloor`: 날개 윗면 · 몸통 윗면에 설 수 있다(떠나는 중엔 못 선다).
   · 총알 `rayShip`(메시에 광선 — `SHIP.solids`) · 로켓 `shipInside`(닿으면 터짐) · 수류탄(튕긴다).
   배가 오르거나 돌면 같이 따라간다(배 자리·요각으로 로컬 좌표를 낸다 — 배는 기울지 않는다). */
function shipBoxes(Y,prof){
  const B=[], poly=(pts,y0,y1,top)=>{                        // 변마다 바깥 법선 · 거리(볼록 · 어느 쪽으로 돌든)
    let cx=0, cz=0; for(const q of pts){ cx+=q[0]; cz+=q[1]; } cx/=pts.length; cz/=pts.length;
    const E=[]; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length];
      let nx=b[1]-a[1], nz=-(b[0]-a[0]); const l=Math.hypot(nx,nz)||1; nx/=l; nz/=l;
      if(nx*(cx-a[0])+nz*(cz-a[1])>0){ nx=-nx; nz=-nz; }
      E.push([nx,nz,nx*a[0]+nz*a[1]]); }
    B.push({pts,E,y0,y1,top:top||null}); };     // top(x,z) — 윗면에 설 수 있는 것만(날개·몸통)
  /* 몸통 — 돌림체 옆모습 r(z)(가로 1.25배 · 세로 0.62배). 밑면이 c 보다 낮은 곳의 반폭 */
  const rAt=z=>{ for(let i=0;i<prof.length-1;i++){ const a=prof[i], b=prof[i+1]; if(z>=a[1]&&z<=b[1]&&b[1]>a[1]) return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]); } return 0; };
  SHIP.rAt=rAt; SHIP.Y=Y;
  const hullTop=(x,z)=>{ const r=rAt(z), w=1.25*r; return Math.abs(x)<w?Y+0.62*r*Math.sqrt(1-(x/w)*(x/w)):-1e9; };
  const wingTop=x=>Y-0.34+0.08*(Math.abs(x)-1.9);
  for(const c of [1.9,2.5,3.1,3.2]){
    const R=[], L=[];
    for(let z=-7.2;z<=6.0001;z+=0.4){ const r=rAt(z), hh=0.62*r, dy=Y-c; if(hh<=dy) continue;
      const hw=1.25*r*Math.sqrt(1-(dy/hh)*(dy/hh)); R.push([hw,z]); L.unshift([-hw,z]); }
    if(R.length>1) poly(R.concat(L),c,Y+0.62*2.45,hullTop);
  }
  poly([[-1.6,-3.65],[1.6,-3.65],[1.6,4.85],[-1.6,4.85]],1.1,Y,false);          // 배 밑판
  for(const sx of [-1,1]){
    poly([[sx*1.9,-2.2],[sx*7.3,1.4],[sx*7.3,3.3],[sx*1.9,4.0]],Y-0.88,Y+0.1,wingTop);   // 날개(끝이 0.43 m 들린다)
    poly([[sx*6.85,-1.4],[sx*7.2,-1.95],[sx*8.2,-1.95],[sx*8.55,-1.4],[sx*8.55,3.65],[sx*6.85,3.65]],1.4,Y+0.55,false);   // 날개 끝 엔진 통
    const o=[]; for(let k=0;k<8;k++){ const a=k/8*6.2832; o.push([sx*2.05+Math.cos(a)*0.68,2.8+Math.sin(a)*0.68]); }
    poly(o,0,Y-1.3,false);                                                        // 뒷다리 · 받침
  }
  { const o=[]; for(let k=0;k<8;k++){ const a=k/8*6.2832; o.push([Math.cos(a)*0.52,-4.0+Math.sin(a)*0.52]); } poly(o,0,Y-1.5,false); }   // 앞다리
  poly([[-1.2,5.7],[1.2,5.7],[1.2,7.9],[-1.2,7.9]],Y-0.95,Y+1.35,false);        // 꼬리 주 엔진
  poly([[-1.3,4.5],[1.3,4.5],[1.3,6.7],[-1.3,6.7]],1.2,1.85,false);              // 화물 경사판
  return B;
}
/* 세계 좌표 → 배 로컬(배는 y 축으로만 돈다) */
const _sl={x:0,z:0,y:0,c:1,s:0};
function shipLocal(x,y,z){
  const P=shipMesh.position, th=shipMesh.rotation.y, c=Math.cos(th), s=Math.sin(th), dx=x-P.x, dz=z-P.z;
  _sl.x=dx*c-dz*s; _sl.z=dx*s+dz*c; _sl.y=y-P.y; _sl.c=c; _sl.s=s; return _sl;
}
const shipSD=(b,x,z)=>{ let sd=-1e9, k=0; for(let i=0;i<b.E.length;i++){ const e=b.E[i], d=e[0]*x+e[1]*z-e[2]; if(d>sd){ sd=d; k=i; } } SHIP._k=k; return sd; };
/* 사람 — p 발 자리(옮김) · rad 몸 반지름 · h 키 · prevY 지난 발 높이 · vel 속도(머리를 막을 때 위로 가는 몫을 지운다) */
function shipCollide(p,rad,h,prevY,vel){
  if(!shipMesh||!SHIP.box||SHIP.st==='away') return;
  const P=shipMesh.position; if((p.x-P.x)*(p.x-P.x)+(p.z-P.z)*(p.z-P.z)>15*15) return;
  const L=shipLocal(p.x,p.y,p.z), fy=L.y, py=prevY-P.y; let lx=L.x, lz=L.z, hit=false;
  for(const b of SHIP.box){
    if(fy+h<=b.y0||fy>=b.y1) continue;
    const sd=shipSD(b,lx,lz); if(sd>=rad) continue;
    if(py+h<=b.y0+0.02){                                   // 밑에서 머리를 들이밀었다 — 천장
      p.y=P.y+b.y0-h-0.01; if(vel&&vel.y>0) vel.y=0; continue; }
    if(b.top&&py>=b.top(lx,lz)-0.05) continue;             // 위에 서 있다(shipFloor 가 받친다)
    const e=b.E[SHIP._k]; lx+=e[0]*(rad-sd); lz+=e[1]*(rad-sd); hit=true;
  }
  if(hit){ const c=L.c, s=L.s; p.x=P.x+lx*c+lz*s; p.z=P.z-lx*s+lz*c; }
}
/* 설 자리 — 날개 윗면 · 몸통 윗면. y 에서 0.6 m 위까지만 올라선다(floorAt 과 같은 규칙) */
function shipFloor(x,z,y){
  if(!shipMesh||!SHIP.box||SHIP.st==='away') return -1e9;
  const P=shipMesh.position; if((x-P.x)*(x-P.x)+(z-P.z)*(z-P.z)>15*15) return -1e9;
  const L=shipLocal(x,y,z); let best=-1e9;
  for(const b of SHIP.box) if(b.top&&shipSD(b,L.x,L.z)<0){ const t=b.top(L.x,L.z); if(t<=L.y+0.6) best=Math.max(best,t); }
  return best>-1e9?P.y+best:-1e9;
}
/* 점이 배 몸 속인가 — 로켓·수류탄 */
function shipInside(x,y,z){
  if(!shipMesh||!SHIP.box) return false;
  const P=shipMesh.position; if((x-P.x)*(x-P.x)+(z-P.z)*(z-P.z)>15*15||y<P.y-0.5||y>P.y+7) return false;
  const L=shipLocal(x,y,z);
  for(const b of SHIP.box) if(L.y>b.y0&&L.y<b.y1&&shipSD(b,L.x,L.z)<0) return true;
  return false;
}
/* 총알 — 배 메시에 광선을 쏴 맞은 거리(없으면 Infinity) */
const _shipRay=new THREE.Raycaster();
function rayShip(o,dir,range){
  if(!shipMesh||!SHIP.solids) return Infinity;
  const P=shipMesh.position, ox=P.x-o.x, oz=P.z-o.z, t=ox*dir.x+oz*dir.z;
  if(t<-12||t>range+12) return Infinity;
  shipMesh.updateMatrixWorld(true);
  _shipRay.set(o,dir); _shipRay.far=range;
  const h=_shipRay.intersectObjects(SHIP.solids,false);
  return h.length?h[0].distance:Infinity;
}
/* 엔진 세기 k(0~1) — 불꽃 길이·밝기, 노즐 속 달아오름, 광원을 한꺼번에 맞춘다 */
function shipPower(k,dust){
  SHIP.jets.forEach(j=>{ j.userData.pow.value=k; });
  SHIP.hots.forEach(h=>h.material.color.setRGB(0.16+0.84*k,0.10+0.55*k,0.06+0.5*k));
  SHIP.light.intensity=k*5.0;
  if(SHIP.dust){ SHIP.dust.visible=dust>0.01; SHIP.dust.scale.set(22*(0.6+0.4*dust),9*dust+0.01,1); }
}
/* 떠나는 동안만 움직인다. 다 가면 장면에서 지운다. */
function updateShip(dt){
  if(!shipMesh) return;
  SHIP.t+=dt;
  // 움직이는 배 — 그림자를 매 프레임 다시. '기다림'(4 cm 출렁임)은 그림자에서 안 보이니 오를 때부터
  if(SHIP.st!=='wait') LIGHT.dirtyAt(shipMesh.position.x,shipMesh.position.z,14);
  if(SHIP.navs) SHIP.navs.forEach(n=>n.visible=((SHIP.t*1.2)%1)<0.25);   // 항법등 깜박임
  if(SHIP.st==='away'&&SHIP.dust) SHIP.dust.visible=false;
  if(SHIP.st==='wait'){
    // 잠시 엔진을 데운다
    const k=clamp(SHIP.t/2.6,0,1);
    shipPower(k*0.35,k*0.5);
    shipMesh.position.y=SHIP.from.y+Math.sin(SHIP.t*2.2)*0.04*k;
    if(SHIP.t>=2.6){ SHIP.st='rise'; SHIP.t=0; sfx('ignite'); }
    return;
  }
  if(SHIP.st==='rise'){
    const k=clamp(SHIP.t/3.4,0,1);
    shipPower(0.35+k*0.65, Math.max(0,1-k*k*1.4));      // 오를수록 먼지는 가라앉는다
    if(SHIP.dust) SHIP.dust.position.y=-0.3-(shipMesh.position.y-SHIP.from.y);   // 먼지는 땅에 남는다
    shipMesh.position.y=SHIP.from.y+k*k*26;      // 처음엔 더디게, 갈수록 빠르게
    shipMesh.rotation.y+=dt*0.16;
    if(k>=1){ SHIP.st='away'; SHIP.t=0; }
    return;
  }
  // 멀어진다 — 20초면 안개 너머로 사라진다
  const sp=34+SHIP.t*26;
  shipMesh.position.x+=SHIP.dir.x*sp*dt;
  shipMesh.position.z+=SHIP.dir.z*sp*dt;
  shipMesh.position.y+=(14+SHIP.t*6)*dt;
  if(SHIP.t>12) shipGone();
}
/* 배를 치운다 — 다 떠났을 때, 그리고 **쓰러졌다 깨어날 때**(배가 아직 뜨는 중에 물에 빠져 죽으면, 멈춘 화면 동안 배도 그 자리에
   멈춰 있다가 깨어난 사람 머리 위에 그대로 떠 있었다 — 사용자 지적).
   광원은 장면에 세기 0 으로 남긴다 — 배와 같이 빼면 점광원 수가 바뀌어 모든 재질의 셰이더를 다시 짜느라 멈칫한다.
   세기 0 이라 화면은 뺀 것과 같다. 다음 섬의 배(makeShip)가 치운다 */
function shipGone(){
  if(!shipMesh) return;
  const li=SHIP.light; if(li){ li.intensity=0; scene.attach(li); SHIP.parked=li; }
  LIGHT.dirtyAt(shipMesh.position.x,shipMesh.position.z,14);
  scene.remove(shipMesh); shipMesh=null; SHIP.st='away';
}
