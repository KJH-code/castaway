/* 95-giants.js — CASTAWAY
   노거수 — 숲의 '노거수 숲' 군락에 서는 30~40 m 큰 나무. 판근(뿌리)이 사방으로 뻗어 **밟고 오르는 땅**이 된다
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   노거수
   ----------------------------------------------------------------------------
   · 자리 — 26 m 칸마다 한 번 굴려, 그 자리가 '노거수 숲' 군락(95-flora.js `FLORA_COMM` 의 giant)이면 세운다.
     칸 번호의 해시로 정하므로 같은 섬에는 늘 같은 자리에 선다. 섬 생성(자원 배치)·저장과 무관하다.
     큰 나무·바위와 줄기가 겹치면 자리를 조금 옮겨 보고, 안 되면 그 칸은 비운다.
   · 생김새 셋 — 0 판근이 높은 케이폭(우산 같은 수관) · 1 가지에서 공기뿌리가 늘어지는 반얀 · 2 붉은 껍질의 삼나무.
     종류마다 네 벌(`GIANT_VARS`) — 키 ±10% · 큰 가지 수 · 공기뿌리 수 · 가지 층이 벌마다 다르고 판근 짜임은 같다(충돌 테두리가 따른다).
     줄기·수관은 종류 × 벌마다 한 벌을 지어 인스턴스로 세우고, **200 m 밖은 종류마다 가장 가까운 그루의 벌 하나로 찍는다**
     (`GIANT.ref` · `updateGiants` — 참나무·전나무의 기준 나무와 같은 방식). **뿌리는 나무마다 그 자리의 땅을 따라 따로 짓고** 200 m 안만 그린다.
   · 뿌리가 땅이다 — `giantRootAt(x,z)` 가 그 자리의 뿌리 높이를 돌려주고, 설 자리(`floorAt`)가 그만큼 높아진다.
     뿌리 끝에서 걸어 오르면 줄기 곁 허리 높이까지 올라선다. 옆구리는 턱이 높아 막힌다. 줄기는 충돌 원으로 막는다.
   · 벤다 — **철 도끼 이상**(`tool.axe` 2 · 철·강철 도끼)으로만 날이 박힌다. 줄기를 보고 좌클릭을 누르고 있으면 통나무가 하나씩
     나오고(캐기 틀 `HARV` 를 그대로 탄다 — 그루마다 단 `g.prop`), 다 베면 쓰러져 판근 그루터기만 남는다(아래 '베기').
   ========================================================================== */
const GIANT={list:[], grid:new Map(), meshes:[], geo:null, G:26, cell:32, near:null, far:null, ref:null, cut:new Map(), falls:[]};
/* 종류마다 — r 줄기 반지름(가슴 높이) · nb 판근 수 · rootL 뿌리 길이 · rootH 줄기 곁 뿌리 높이 */
const GIANT_KIND=[
  {n:'케이폭', r:1.5, nb:6, rootL:9.0, rootH:1.5},
  {n:'반얀',   r:1.9, nb:7, rootL:7.5, rootH:1.1},
  {n:'삼나무', r:1.7, nb:5, rootL:6.5, rootH:1.0}
];
/* 줄기 — 종류마다 키 H(벌마다 hk 배) · 밑동 굵기 r0 · 꼭대기 r1 · 판근 수 nb · 판근 부풂 but · 껍질 빛깔(밑 c · 위 c2).
   줄기(`giantShapes` 의 bole)와 그루터기(`giantStumpGeo`)가 같은 식(`giantBoleR`)을 쓴다 */
const GIANT_BOLE=[
  {H:19, r0:1.5, r1:0.9,  nb:6, but:1.7, c:[0.46,0.40,0.34], c2:[0.62,0.56,0.48]},
  {H:11, r0:1.9, r1:1.3,  nb:7, but:1.2, c:[0.42,0.36,0.30], c2:[0.58,0.50,0.42]},
  {H:38, r0:1.7, r1:0.25, nb:5, but:1.0, c:[0.52,0.33,0.24], c2:[0.66,0.44,0.32]}];
function giantBoleR(B,th,y,H){
  const t=clamp(y/H,0,1), ridge=Math.pow(0.5+0.5*Math.cos(B.nb*th),3);
  return (B.r0+(B.r1-B.r0)*t)*(1+B.but*Math.exp(-Math.max(0,y)/2.2)*ridge+0.05*Math.sin(th*9+y*0.7));
}
/* 종류마다 생김새 벌 수 — 줄기(판근 수·굵기)는 종류마다 같고(충돌 테두리가 이걸 따른다) 높이·가지·공기뿌리·가지 층이 벌마다 다르다 */
const GIANT_VARS=4;
function giantGeos(){
  GIANT.geo=[[],[],[]]; GIANT.hk=[[],[],[]];
  for(let w=0;w<GIANT_VARS;w++){ const G=giantShapes(mulberry32((0x61a47+w*0x9e3779b1)>>>0)); G.forEach((g,v)=>{ GIANT.geo[v].push(g); GIANT.hk[v].push(G.hk[v]); }); }
}
function giantShapes(rnd){
  const K=floraKit(rnd), {unit,face,card,grow,fin}=K, rf=(a,b)=>a+(b-a)*rnd(), ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
  /* 줄기 — 밑동에서 판근이 날개처럼 벌어진다. 판근 방향은 뿌리(`giantRoots`)와 같은 각이다 */
  const HK=[];                                         // 벌마다의 키 배율 — 그루터기가 같은 굵기를 내려고 적어 둔다
  const bole=(v,hk,sway)=>{ const B=GIANT_BOLE[v], H=B.H*hk; HK[v]=hk;
    return {g:SHP.grid(22,11,(u,q)=>{
      const th=u*6.2832, y=-0.8+(H+0.8)*Math.pow(q,1.7), t=clamp(y/H,0,1), rad=giantBoleR(B,th,y,H);
      return [Math.cos(th)*rad+sway*Math.sin(t*2.4)*t*H*0.04, y, Math.sin(th)*rad+sway*Math.sin(t*3.1+1)*t*H*0.03];
    },true),cell:FC.BARK,c:B.c,c2:B.c2}; };
  const G=[]; G.hk=HK;
  { // 0 케이폭 — 줄기가 16 m 까지 매끈하고 그 위로 큰 가지 일곱이 우산처럼 퍼진다(키 30 m · 수관 지름 24 m)
    const hk=rf(0.9,1.1), parts=[bole(0,hk,rf(0.5,1.5))];
    const S={taper:0.66,split:[2,3],spread:1.4,up:0.5,lift:0.30,shrink:0.70,bend:0.06,leafN:5,leafW:4.2,leafH:3.6,leafCell:FC.LEAF,leafTilt:0.9,leafC:[0.84,1,0.84],tips:[],bark:[0.46,0.40,0.34],bark2:[0.62,0.56,0.48]};
    for(let i=0,nb=ri(6,8);i<nb;i++){ const a=i/nb*6.283+rnd()*0.5;
      grow(parts,[Math.cos(a)*0.5,(16.5+rnd()*2.5)*hk,Math.sin(a)*0.5],unit(Math.cos(a),0.55,Math.sin(a)),7.5+rnd()*2.5,0.55,2,S); }
    /* 수관에서 늘어진 굵은 덩굴 — 끝가지에서 땅 위 2~7 m 까지, 그리고 끝가지 사이에 처져 걸린 것 */
    for(let i=0,nl=ri(5,7);i<nl;i++){ const p=S.tips[(rnd()*S.tips.length)|0]; K.liana(parts,p,[p[0]+(rnd()-0.5)*2,2+rnd()*5,p[2]+(rnd()-0.5)*2],0.6,0.07,6); }
    for(let i=0;i<2;i++){ const p=S.tips[(rnd()*S.tips.length)|0], q=S.tips[(rnd()*S.tips.length)|0]; if(p!==q) K.liana(parts,p,q,3+rnd()*3,0.08,6); }
    G.push(fin(parts)); }
  { // 1 반얀 — 굵고 낮은 줄기, 넓게 누운 가지에서 공기뿌리가 땅까지 늘어진다(키 22 m · 수관 지름 28 m)
    const BB=GIANT_BOLE[1].c, BB2=GIANT_BOLE[1].c2, hk=rf(0.9,1.12), parts=[bole(1,hk,rf(0.2,0.8))];
    const S={taper:0.68,split:[2,3],spread:1.5,up:0.4,lift:0.28,shrink:0.72,bend:0.03,leafN:5,leafW:3.8,leafH:3.2,leafCell:FC.MANG,leafTilt:1.0,leafC:[0.86,1,0.88],bark:BB,bark2:BB2};
    for(let i=0,nb=ri(7,9);i<nb;i++){ const a=i/nb*6.283+rnd()*0.5, y0=(8.5+rnd()*2.5)*hk, L=8+rnd()*3, d=unit(Math.cos(a),0.38,Math.sin(a));
      grow(parts,[Math.cos(a)*0.8,y0,Math.sin(a)*0.8],d,L,0.6,2,S);
      for(let k=0,na=ri(1,3);k<na;k++){ const t=0.45+k*0.7/na+rnd()*0.1, x=Math.cos(a)*0.8+d[0]*L*t, z=Math.sin(a)*0.8+d[2]*L*t, y=y0+d[1]*L*t;   // 공기뿌리
        parts.push({g:SHP.tube([[x,y,z],[x+0.1,y*0.55,z-0.08],[x,y*0.15,z+0.05],[x,-0.8,z]],[0.10,0.08,0.09,0.13],5,0),cell:FC.BARK,c:BB,c2:BB2}); } }
    G.push(fin(parts)); }
  { // 2 삼나무 — 붉은 껍질의 곧은 줄기, 위로 갈수록 짧아지는 가지 층(키 40 m)
    const RB=GIANT_BOLE[2].c, RB2=GIANT_BOLE[2].c2, hk=rf(0.9,1.1), parts=[bole(2,hk,rf(0.1,0.5))], NC=[0.86,1,0.92], nl=ri(10,12);
    for(let j=0;j<nl;j++){ const y=(13+j*25.3/nl)*hk, L=7.5*rf(0.9,1.1)*(1-j/(nl+2));
      for(let i=0,nk=ri(4,6);i<nk;i++){ const a=i/nk*6.283+j*0.9+rnd()*0.3, d=unit(Math.cos(a),-0.12,Math.sin(a));
        parts.push({g:SHP.limb([Math.cos(a)*0.4,y,Math.sin(a)*0.4],d,L*0.9,0.20*(1-j/14),0.05,2,5,-0.03,0.6),cell:FC.BARK,c:RB,c2:RB2});
        for(let k=0;k<3;k++){ const t=0.35+k*0.3; parts.push(card([Math.cos(a)*0.4+d[0]*L*0.9*t,y+d[1]*L*0.9*t-0.6,Math.sin(a)*0.4+d[2]*L*0.9*t],L*0.55,L*0.55,FC.NEEDLE,a+(k-1)*0.5,1.3,NC)); } } }
    parts.push(card([0,36.5*hk,0],2.5,4.5,FC.NEEDLE,0,0,NC));
    G.push(fin(parts)); }
  return G;
}
/* 한 그루의 뿌리 모양 — 뿌리 k 의 방향 · 길이 · 높이 · 구불거림(나무의 해시로 정한다) */
function giantRoots(g){
  const KD=GIANT_KIND[g.v], roots=[];
  for(let k=0;k<KD.nb;k++){
    const h=floraHash(g.gx*8+k,g.gz*8+k,93);
    roots.push({a:g.yaw+k/KD.nb*6.2832, L:KD.rootL*g.s*(0.75+0.5*(h&255)/255), H:KD.rootH*g.s*(0.8+0.4*((h>>>8)&255)/255),
                W:0.55*g.s, wig:(((h>>>16)&255)/255-0.5)*1.6*g.s, ph:((h>>>24)&255)/255*6.283});
  }
  return roots;
}
/* 뿌리 위의 한 점 — t(0 줄기 곁 → 1 끝)에서의 가운데 자리 · 높이 · 반폭 */
function giantRootPt(g,r,t,out){
  const r0=GIANT_KIND[g.v].r*g.s*0.75, along=r0+r.L*t, side=r.wig*Math.sin(t*4.2+r.ph)*t;
  const ca=Math.cos(r.a), sa=Math.sin(r.a);
  out.x=g.x+ca*along-sa*side; out.z=g.z+sa*along+ca*side;
  out.h=r.H*Math.pow(1-t,1.5); out.w=r.W*(1-0.7*t)+0.10;
  return out;
}
/* 섬의 노거수를 전부 세운다 — 섬을 만들 때 한 번(generateWorld) */
async function giantsBuild(){        // async — 칸 줄 · 그루 사이 숨을 돌린다(breathe — 90-init.js)
  for(const m of GIANT.meshes){ scene.remove(m); if(m.userData.own) m.geometry.dispose(); if(m.isInstancedMesh) m.dispose(); }   // 인스턴스 버퍼도 돌려준다
  GIANT.meshes.length=0; GIANT.list.length=0; GIANT.grid.clear();
  for(const f of GIANT.falls) giantFallEnd(f); GIANT.falls.length=0;
  GIANT.cut.clear();                                   // 새 섬 — 벤 것은 없다(불러오기는 섬을 다 지은 뒤 `giantRestore` 가 채운다)
  if(!FLORA.m) floraBuild();                          // 그림 묶음·재질을 같이 쓴다
  if(!GIANT.geo) giantGeos();
  const S=GIANT.G, n=Math.floor(HALF/S)-1;
  for(let gz=-n;gz<=n;gz++){ await breathe(); for(let gx=-n;gx<=n;gx++){
    const h=floraHash(gx,gz,91); if((h&255)>140) continue;
    let placed=null;
    for(let tr=0;tr<3&&!placed;tr++){
      const h2=floraHash(gx*3+tr,gz*3+tr,92);
      const wx=(gx+0.15+0.7*(h2&1023)/1023)*S, wz=(gz+0.15+0.7*((h2>>>10)&1023)/1023)*S;
      const ci=IDX(clamp(Math.round(wx/CELL+N/2),1,N-2),clamp(Math.round(wz/CELL+N/2),1,N-2));
      if(F.elev[ci]<1.5||F.river[ci]||F.slope[ci]>0.5) continue;
      const cm=floraCommAt(wx,wz,F.biome[ci]); if(!cm||!cm.giant||_fp.edge<6) continue;
      const v=cm.giant===2?2:((h>>>8)&1), s=0.8+0.5*((h2>>>20)&255)/255, rr=GIANT_KIND[v].r*s*1.25+0.8;
      let hit=false; const cgx=Math.floor(wx/CG), cgz=Math.floor(wz/CG);
      for(let az=-1;az<=1&&!hit;az++) for(let ax=-1;ax<=1&&!hit;ax++){
        const a=CGRID.get(cgKey(cgx+ax,cgz+az)); if(!a) continue;
        for(const o of a){ const ox=wx-o.x, oz=wz-o.z, q=o.r+rr; if(ox*ox+oz*oz<q*q){ hit=true; break; } }
      }
      if(hit||caveAt(wx,wz,rr+6)||cragNear(wx,wz,rr)||templeNear(wx,wz,rr+4)||fallsAt(wx,wz,rr)||inLanding(wx,wz,rr+GIANT_KIND[v].rootL*s*1.3)) continue;   // 착륙 자리엔 판근까지 안 닿게
      placed={gx,gz,x:wx,z:wz,y:heightAt(wx,wz),s,v,w:floraHash(gx,gz,96)%GIANT_VARS,yaw:((h>>>12)&1023)/1023*6.283};
    }
    if(!placed) continue;
    placed.roots=giantRoots(placed);
    /* 벨 거리 — 캐기 틀(HARV)이 다루는 소품처럼 생긴 것. logs 남은 통나무(크기만큼) */
    placed.prop={k:'giant', giant:placed, x:placed.x, y:placed.y, z:placed.z, br:0, ore:0,
                 logs:Math.round(GIANT_LOGS[placed.v]*placed.s), n:'노거수('+GIANT_KIND[placed.v].n+')'};
    placed.reach=GIANT_KIND[placed.v].r*placed.s+GIANT_KIND[placed.v].rootL*placed.s*1.3+1;
    GIANT.list.push(placed);
    /* 줄기의 충돌 테두리 — 눈높이(1.5 m)에서 판근이 날개처럼 나온 만큼 방위마다 다르다 */
    { const KD=GIANT_KIND[placed.v], Kp=48, prof=new Float32Array(Kp), but=[1.7,1.2,1.0][placed.v]*Math.exp(-1.5/placed.s/2.2); let mx=0;
      for(let i=0;i<Kp;i++){ const th=i/Kp*6.2832-placed.yaw; prof[i]=KD.r*placed.s*(1+but*Math.pow(0.5+0.5*Math.cos(KD.nb*th),3))*0.97; if(prof[i]>mx) mx=prof[i]; }
      const col={x:placed.x,z:placed.z,r:mx,prof}; COLLIDERS.push(col); placed.col=col; }
    const k=cgKey(Math.floor(placed.x/GIANT.cell),Math.floor(placed.z/GIANT.cell));
    let a=GIANT.grid.get(k); if(!a){ a=[]; GIANT.grid.set(k,a); } a.push(placed);
  } }
  buildColliderGrid();
  /* ── 메시 — 200 m(`GIANT_FAR`) 안은 그루마다 제 생김새(종류 × 벌마다 인스턴스 메시 하나), 밖은 **종류마다 사람에게서 가장 가까운
     그루의 벌 하나**로 모두 찍는다(참나무·전나무의 기준 나무 `FAR_REF` 와 같은 방식 · `GIANT.ref`). 예전엔 128 m 칸 × 종류 × 벌로
     나눠 섬 전체를 늘 그렸다(인스턴스 메시 62 · 뿌리 메시 33 — 그림자 패스까지 그리기 호출이 그 두 배). 이제 먼 노거수는 종류마다
     한 번(셋)이고, 뿌리는 200 m 안의 그루만 그린다(땅에 누운 1 m 남짓한 등성이라 그 밖에선 안 보인다). 고르는 일은 `updateGiants` */
  if(!GIANT.rootMat){ GIANT.rootMat=FLORA.mat.clone(); GIANT.rootMat.userData.melt=0.35; }
  const px=PL.pos.x, pz=PL.pos.z, cnt=GIANT.geo.map(a=>a.map(()=>0)), kcnt=GIANT.geo.map(()=>0);
  GIANT.ref=GIANT.geo.map((a,v)=>{ let best=0, bd=Infinity;
    for(const g of GIANT.list) if(g.v===v){ const d=(g.x-px)**2+(g.z-pz)**2; if(d<bd){ bd=d; best=g.w; } }
    return best; });
  { const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), Sc=new THREE.Vector3();
    for(const g of GIANT.list){ cnt[g.v][g.w]++; kcnt[g.v]++; g.near=false;
      g.tint=0.88+0.2*((floraHash(g.gx,g.gz,94)&255)/255);          // 그루마다 살짝 다른 톤(인스턴스 색 칸이 꼭 있어야 한다)
      E.set(0,-g.yaw,0); Q.setFromEuler(E); V.set(g.x,g.y,g.z); Sc.set(g.s,g.s,g.s); M.compose(V,Q,Sc); g.mat=Float32Array.from(M.elements);
      const bs=(GIANT.geo[g.v][GIANT.ref[g.v]].boundingSphere||(GIANT.geo[g.v][GIANT.ref[g.v]].computeBoundingSphere(),GIANT.geo[g.v][GIANT.ref[g.v]].boundingSphere));
      g.fc=[g.x+bs.center.x*g.s, g.y+bs.center.y*g.s, g.z+bs.center.z*g.s]; g.fr=bs.radius*g.s+2; } }   // 먼 그루의 경계구(시야 거르기)
  const add=(m,own)=>{ m.userData.own=own; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); GIANT.meshes.push(m); return m; };
  const mk=(geo,n,far)=>{ const im=new THREE.InstancedMesh(geo,FLORA.mat,n);
    im.setColorAt(0,new THREE.Color(1,1,1)); im.count=0; im.visible=false;          // 색 버퍼는 count 가 가득일 때 만든다
    if(far){ im.frustumCulled=false; im.userData.lightRole='recv'; }               // 200 m 밖은 그림자를 안 드리운다(먼 참나무 복제와 같다)
    else im.customDepthMaterial=FLORA.depth;
    return add(im,false); };
  /* 가까운 쪽은 제 경계구를 다는 감싸개 지오메트리(속성은 나눠 쓴다 — 밑 지오메트리는 먼 쪽과 다음 섬이 같이 쓰므로 버리지 않는다) */
  const wrap=g=>{ const w=new THREE.BufferGeometry(); for(const k in g.attributes) w.setAttribute(k,g.attributes[k]); if(g.index) w.setIndex(g.index); return w; };
  GIANT.near=GIANT.geo.map((a,v)=>a.map((geo,w)=>{ if(!cnt[v][w]) return null;
    if(!geo.boundingSphere) geo.computeBoundingSphere();
    const im=mk(wrap(geo),cnt[v][w],false); im.userData.k0=geo.boundingSphere.center.length()+geo.boundingSphere.radius; return im; }));
  /* 먼 쪽은 **줄인 복제**로 — 예전엔 200 m 밖의 노거수도 제 생김새 그대로(그루마다 삼각형 수천)였다. 새 식물의 줄인 복제와 같은 길
     (`floraLodGeo` — 잎 판을 30% 만 남겨 키우고 잔가지를 솎는다 · 큰 줄기는 그대로). 연무 속이라 차이가 안 보인다 */
  GIANT.far=GIANT.geo.map((a,v)=>{ if(!kcnt[v]) return null;
    const base=a[GIANT.ref[v]], lod=floraLodGeo(base,0.3), im=mk(lod,kcnt[v],true); im.userData.own=lod!==base; return im; });
  /* 뿌리는 그루마다 보통 메시 하나 — r128 은 재질 하나에 셰이더가 하나라, 인스턴스 메시와 재질을 나눠 쓰면 그릴 때마다
     셰이더를 갈아 끼운다(인스턴스 색이 없는 메시가 섞이면 아예 죽는다). 그래서 뿌리는 제 재질을 쓴다 */
  const o={x:0,z:0,h:0,w:0};
  for(const g of GIANT.list){
    await breathe();
    const parts=[], RB=g.v===2?[0.52,0.33,0.24]:[0.44,0.38,0.32], RB2=g.v===2?[0.66,0.44,0.32]:[0.60,0.53,0.45];
    for(const r of g.roots)
      /* 땅을 따라 누운 등성이 — 단면 다섯 점(양 끝은 땅에 0.25 m 묻는다) */
      parts.push({g:SHP.grid(4,10,(u,t)=>{ giantRootPt(g,r,t,o);
          const k=u*2-1, ca=Math.cos(r.a), sa=Math.sin(r.a), x=o.x-sa*k*o.w, z=o.z+ca*k*o.w;
          return [x, heightAt(x,z)+(Math.abs(k)>0.99?-0.25:o.h*Math.cos(k*1.5708)), z]; }),cell:FC.BARK,c:RB,c2:RB2});
    if(parts.length){ const m=new THREE.Mesh(SHP.merge(parts,true),GIANT.rootMat); m.frustumCulled=true; m.visible=false; g.rootM=add(m,true); }
  }
  GIANT.farSig=null; updateGiants(true);
}
/* 200 m 안팎 가르기 — 매 프레임(updateFlora 가 부른다). 75그루 남짓의 거리만 재고, 안팎이 바뀐 그루가 있을 때만 인스턴스를 다시 채운다.
   경계에서 오락가락하지 않게 나갈 때는 10 m 더 멀어져야 한다 */
const GIANT_FAR=95, GIANT_HYST=10;    // 제 생김새(그림자도 드리운다)는 95 m 안만 — 잰 값: 200 m 일 때 노거수만 한 프레임의 4 ms 였다. 그 밖은 줄인 복제
const _gM=new THREE.Matrix4(), _gC=new THREE.Color(), _gPM=new THREE.Matrix4(), _gFr=new THREE.Frustum(), _gSp=new THREE.Sphere();
function updateGiants(force){
  if(!GIANT.list.length||!GIANT.near) return;
  const px=PL.pos.x, pz=PL.pos.z; let ch=!!force;
  for(const g of GIANT.list){
    const dx=g.x-px, dz=g.z-pz, d=Math.sqrt(dx*dx+dz*dz), on=d<(g.near?GIANT_FAR+GIANT_HYST:GIANT_FAR)*QUAL.k;
    if(on!==g.near){ g.near=on; ch=true; }
  }
  if(ch){
    for(const a of GIANT.near) for(const im of a) if(im) im.count=0;
    for(const g of GIANT.list){
      if(g.rootM&&setVis(g.rootM,g.near)) LIGHT.dirtyAt(g.x,g.z,g.reach);
      if(!g.near||g.felled) continue;                  // 벤 그루는 그루터기만(giantStumpGeo)
      const im=GIANT.near[g.v][g.w]; _gM.fromArray(g.mat);
      im.setMatrixAt(im.count,_gM); im.setColorAt(im.count++,_gC.setRGB(g.tint,g.tint,g.tint*0.96));
    }
    for(const a of GIANT.near) for(const im of a){ if(!im) continue;
      im.visible=im.count>0; im.instanceMatrix.needsUpdate=true; im.instanceColor.needsUpdate=true; if(!im.count) continue;
      /* 경계구 — 서 있는 그루들의 가운데에서 가장 먼 그루 끝까지(밑 구 중심까지 + 반지름) × 크기 */
      const E=im.instanceMatrix.array, n=im.count; let cx=0,cy=0,cz=0, R=0;
      for(let i=0;i<n;i++){ cx+=E[i*16+12]; cy+=E[i*16+13]; cz+=E[i*16+14]; }
      cx/=n; cy/=n; cz/=n;
      for(let i=0;i<n;i++){ const o=i*16, s=Math.sqrt(E[o]*E[o]+E[o+1]*E[o+1]+E[o+2]*E[o+2]);
        R=Math.max(R,Math.hypot(E[o+12]-cx,E[o+13]-cy,E[o+14]-cz)+im.userData.k0*s); }
      im.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,cy,cz),R+2);
    }
  }
  /* 먼 쪽 — 종류마다 메시 하나라 통째로는 화면 밖을 못 거른다(예전 칸 메시는 칸마다 걸렀다). 시야 안의 그루만 채운다.
     그림자를 안 드리우므로(recv) 행렬을 배열에 바로 쓴다 — setMatrixAt 갈고리를 타면 몸을 돌릴 때마다 그림자 지도를 다시 그린다 */
  camera.updateMatrixWorld(); _gPM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse); _gFr.setFromProjectionMatrix(_gPM);
  let sig=ch?-1:0, k=0;
  for(const g of GIANT.list){ if(g.near) continue; _gSp.center.set(g.fc[0],g.fc[1],g.fc[2]); _gSp.radius=g.fr;
    g.seen=_gFr.intersectsSphere(_gSp)&&!tileOcc(g._ot||(g._ot={cx:g.x,cz:g.z,r:14}),48);     // 산 너머의 노거수는 거른다(30-props.js)
    if(g.seen) sig=(sig*31+k)|0; k++; }
  if(sig===GIANT.farSig) return;
  GIANT.farSig=sig;
  for(const im of GIANT.far) if(im) im.count=0;
  for(const g of GIANT.list){ if(g.near||!g.seen||g.felled) continue;
    const im=GIANT.far[g.v], i=im.count++;
    im.instanceMatrix.array.set(g.mat,i*16);
    const c=im.instanceColor.array; c[i*3]=g.tint; c[i*3+1]=g.tint; c[i*3+2]=g.tint*0.96; }
  for(const im of GIANT.far) if(im){ im.visible=im.count>0; im.instanceMatrix.needsUpdate=true; im.instanceColor.needsUpdate=true; }
}
/* 그 자리의 뿌리 높이(땅 위로 얼마나 솟았나 · 뿌리가 없으면 0) — 설 자리(`floorAt`)가 부른다 */
const _grP={x:0,z:0,h:0,w:0};
function giantRootAt(x,z){
  if(!GIANT.list.length) return 0;
  const cx=Math.floor(x/GIANT.cell), cz=Math.floor(z/GIANT.cell); let best=0;
  for(let az=-1;az<=1;az++) for(let ax=-1;ax<=1;ax++){
    const a=GIANT.grid.get(cgKey(cx+ax,cz+az)); if(!a) continue;
    for(const g of a){
      const dx=x-g.x, dz=z-g.z, d2=dx*dx+dz*dz; if(d2>g.reach*g.reach) continue;
      const r0=GIANT_KIND[g.v].r*g.s*0.75;
      for(const r of g.roots){
        const ca=Math.cos(r.a), sa=Math.sin(r.a), along=dx*ca+dz*sa-r0; if(along<0||along>r.L) continue;
        const t=along/r.L; giantRootPt(g,r,t,_grP);
        const side=(x-_grP.x)*(-sa)+(z-_grP.z)*ca; if(Math.abs(side)>=_grP.w) continue;
        const hh=_grP.h*Math.cos(side/_grP.w*1.5708); if(hh>best) best=hh;
      }
    }
  }
  return best;
}
/* 눈앞 18 m 안의 노거수(이름 알림 · 둥지·벌집이 자리를 잡을 때 쓴다) */
function giantNear(x,z,R){
  let best=null, bd=R*R;
  for(const g of GIANT.list){ const dx=g.x-x, dz=g.z-z, d=dx*dx+dz*dz; if(d<bd){ bd=d; best=g; } }
  return best;
}

/* ── 베기 ───────────────────────────────────────────────────────────────────
   **철 도끼 이상(`tool.axe` 2 — 철·강철 도끼)** 으로만 날이 박힌다(사용자 요청 — 돌·청동 도끼는 '날이 안 박힌다').
   줄기를 보고 좌클릭을 누르고 있으면 통나무가 하나씩 나온다 — 캐기 틀(HARV)을 그대로 탄다: `findHarvestTarget` 이 줄기 겉
   1.6 m 안의 노거수를 후보로 넣고(`giantChopTarget`), `pickMode` 가 그루마다 단 `g.prop`(k 'giant')을 `GIANT_CHOP` 으로 벤다.
   통나무는 그루 크기만큼(`GIANT_LOGS` × 크기 — 10~21) · 한 개에 6초 ÷ 도끼 빠르기(철 1.9초 · 강철 1.5초).
   다 베면 **쓰러진다**(`giantFallStart`) — 밑동 벤 자리를 축으로 사람 반대쪽으로 넘어가는 막대(각가속도 ∝ sinθ/L — 처음엔 천천히,
   끝에 빠르게). 벤 자리 밑은 잘라 그린다(재질의 자르는 면). 땅에 닿으면 쿵 · 먼지 · 화면 흔들림, 옅어지며 먼지 속에 사라진다.
   판근 그루터기(나이테)가 남고 충돌·뿌리 땅은 그대로다. 벤 것은 저장에 담는다(`GIANT.cut` — 'gx,gz' → 남은 통나무 · 0 이면 쓰러진 그루). */
const GIANT_CHOP={item:'log', label:'거목 베기', dur:6.0, stam:10, yield:[1,1], tier:2};
const GIANT_LOGS=[12,14,16];
const GIANT_CUT=1.3;                                   // 벤 자리 높이(크기 1 일 때 m)
const giantKey=g=>g.gx+','+g.gz;
/* 눈앞의 노거수 — 줄기 겉(충돌 테두리)까지 1.6 m 안에서 그쪽을 보고 있으면 { prop, d(겉까지) } */
function giantChopTarget(fx,fz){
  if(!GIANT.list.length) return null;
  const px=PL.pos.x, pz=PL.pos.z, cx=Math.floor(px/GIANT.cell), cz=Math.floor(pz/GIANT.cell);
  let best=null, bd=1.6;
  for(let az=-1;az<=1;az++) for(let ax=-1;ax<=1;ax++){
    const a=GIANT.grid.get(cgKey(cx+ax,cz+az)); if(!a) continue;
    for(const g of a){
      if(g.felled) continue;
      const dx=g.x-px, dz=g.z-pz, d=Math.hypot(dx,dz); if(d<1e-3||d>g.col.r+bd) continue;
      if((dx/d)*fx+(dz/d)*fz<0.5) continue;                       // 보고 있어야 한다
      const P=g.col.prof, K=P.length, q=(Math.atan2(-dz,-dx)/6.2832+1)%1*K, i=Math.floor(q), f=q-i;
      const surf=d-(P[i%K]*(1-f)+P[(i+1)%K]*f);
      if(surf<bd){ bd=surf; best=g; }
    }
  }
  return best?{prop:best.prop, d:bd}:null;
}
/* 통나무를 하나 베어 냈다(updateHarvest) — 다 베었으면 쓰러뜨린다 */
function giantChopped(t){
  const g=t.giant;
  GIANT.cut.set(giantKey(g),Math.max(0,t.logs));
  if(t.logs<=0) giantFell(g,true);
}
function giantFell(g,anim){
  if(g.felled) return;
  g.felled=true; g.prop.logs=0; g.prop.felled=true;
  GIANT.cut.set(giantKey(g),0);
  giantStump(g);
  if(anim) giantFallStart(g);
  updateGiants(true);                                  // 서 있던 그루를 인스턴스에서 뺀다
  LIGHT.dirtyAt(g.x,g.z,g.reach+30);
}
/* 판근 그루터기 — 줄기와 같은 식(giantBoleR)으로 벤 자리까지 · 윗면은 나이테(밝고 어두운 고리를 번갈아 · 가장자리는 껍질 띠) */
function giantStumpGeo(g){
  const B=GIANT_BOLE[g.v], H=B.H*((GIANT.hk[g.v]||[])[g.w]||1), cut=GIANT_CUT, NR=9, parts=[];
  parts.push({g:SHP.grid(22,4,(u,q)=>{ const th=u*6.2832, y=-0.8+(cut+0.8)*q, r=giantBoleR(B,th,y,H); return [Math.cos(th)*r,y,Math.sin(th)*r]; },true),
              cell:FC.BARK,c:B.c,c2:B.c2});
  for(let i=0;i<NR;i++){
    const a=i/NR, b=(i+1)/NR, rim=i===NR-1;
    const col=rim?[B.c[0]*0.8,B.c[1]*0.8,B.c[2]*0.8]:(i&1)?[0.66,0.52,0.36]:[0.80,0.66,0.47];
    parts.push({g:SHP.grid(22,1,(u,q)=>{ const th=u*6.2832, k=a+(b-a)*q, r=giantBoleR(B,th,cut,H)*k;
        return [Math.cos(th)*r, cut+0.04*(1-k*k), Math.sin(th)*r]; },true),cell:rim?FC.BARK:FC.CAP,c:col});
  }
  /* 갈라진 금 — 속심에서 바깥으로 뻗는 짙은 틈 넷 · 경첩 쪽(+x) 테두리에 쪼개져 남은 나뭇결 이빨 */
  for(let i=0;i<4;i++){ const th=0.6+i*1.55, R0=giantBoleR(B,th,cut,H), w=0.035;
    parts.push({g:SHP.grid(6,1,(u,q)=>{ const r=R0*(0.12+0.8*u), o=(q-0.5)*w*(1+u*2); return [Math.cos(th)*r-Math.sin(th)*o, cut+0.045, Math.sin(th)*r+Math.cos(th)*o]; }),
      cell:FC.PLAIN,c:[0.16,0.11,0.07]}); }
  for(let k=0;k<9;k++){ const th=-0.7+k*0.175, R0=giantBoleR(B,th,cut,H)*(0.72+0.2*((k*29)%7)/7), h=0.35+0.55*((k*53)%9)/9;
    parts.push({g:SHP.limb([Math.cos(th)*R0,cut-0.02,Math.sin(th)*R0],[0.08*Math.cos(th),1,0.08*Math.sin(th)],h,0.09,0.006,2,4,0,0),cell:FC.PLAIN,c:[0.70,0.55,0.36],c2:[0.86,0.72,0.50]}); }
  return SHP.merge(parts,true);
}
function giantStump(g){
  if(g.stumpM) return;
  if(!GIANT.rootMat){ GIANT.rootMat=FLORA.mat.clone(); GIANT.rootMat.userData.melt=0.35; }
  const m=new THREE.Mesh(giantStumpGeo(g),GIANT.rootMat);
  m.matrixAutoUpdate=false; m.matrix.fromArray(g.mat); m.matrixWorldNeedsUpdate=true;
  m.geometry.computeBoundingSphere(); m.frustumCulled=true; m.userData.own=true;
  scene.add(m); GIANT.meshes.push(m); g.stumpM=m;
}
/* 쓰러짐 — 밑동 벤 자리(축)를 중심으로 사람 반대쪽으로 넘어가는 막대. θ'' = 1.5·g'·sinθ / L (g' 는 보기 좋게 2.5배 — 실제 빠르기면
   30 m 나무가 6~8초 걸린다). 땅에 닿으면(우듬지 쪽 점이 땅 밑) 쿵 · 먼지 · 흔들림, 1.2초 뒤부터 옅어져 2.6초에 사라진다 */
const _gfQ=new THREE.Quaternion(), _gfA=new THREE.Vector3(), _gfP=new THREE.Vector3(), _gfS=new THREE.Vector3(), _gfM=new THREE.Matrix4(), _gfY=new THREE.Quaternion();
function giantFallStart(g){
  let dx=g.x-PL.pos.x, dz=g.z-PL.pos.z; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l;   // 사람 반대쪽으로
  const mat=FLORA.mat.clone(); mat.transparent=true;
  const pv=GIANT_CUT*g.s, plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(g.y+pv));
  mat.clippingPlanes=[plane];                          // 벤 자리 밑(그루터기 속)은 그리지 않는다
  mat.color.setRGB(g.tint,g.tint,g.tint*0.96);
  const m=new THREE.Mesh(GIANT.geo[g.v][g.w],mat);
  m.matrixAutoUpdate=false; m.frustumCulled=false; m.customDepthMaterial=FLORA.depth;
  scene.add(m);
  renderer.localClippingEnabled=true;
  const H=GIANT_BOLE[g.v].H*((GIANT.hk[g.v]||[])[g.w]||1)*g.s;
  const f={g,m,mat,plane,dx,dz,th:0.10,w:0,t:0,land:-1,pv,L:H,dust:[]};
  GIANT.falls.push(f); giantFallPose(f);
  sfx('timber');
  toast(g.prop.n+' — 넘어간다!');
}
function giantFallPose(f){
  const g=f.g;
  _gfA.set(f.dz,0,-f.dx); _gfQ.setFromAxisAngle(_gfA,f.th);          // 위(+y)를 넘어가는 쪽(dx,dz)으로 눕힌다
  _gfY.setFromAxisAngle(_gfP.set(0,1,0),-g.yaw);
  /* 행렬 = 축으로 옮김 · 눕힘 · 축에서 되돌림 · 그루의 돌림·크기 */
  _gfM.compose(_gfP.set(0,0,0),_gfQ.multiply(_gfY),_gfS.set(g.s,g.s,g.s));
  _gfA.set(0,-f.pv,0).applyQuaternion(_gfQ.setFromAxisAngle(_gfP.set(f.dz,0,-f.dx),f.th));
  f.m.matrix.copy(_gfM); f.m.matrix.setPosition(g.x+_gfA.x, g.y+f.pv+_gfA.y, g.z+_gfA.z);
  f.m.matrixWorldNeedsUpdate=true;
  /* 자르는 면도 같이 눕는다 — 법선 = 눕힌 위쪽 · 축을 지난다 */
  _gfA.set(0,1,0).applyQuaternion(_gfQ);
  f.plane.normal.copy(_gfA); f.plane.constant=-(_gfA.x*g.x+_gfA.y*(g.y+f.pv)+_gfA.z*g.z);
}
const GIANT_FALL_G=1.5*9.8*2.5;                        // 막대 끝 축 넘어짐 1.5·g/L — g 는 보기 좋게 2.5배
function updateGiantFalls(dt){
  for(let i=GIANT.falls.length-1;i>=0;i--){
    const f=GIANT.falls[i], g=f.g; f.t+=dt;
    f.w+=GIANT_FALL_G*Math.sin(f.th)/f.L*dt; f.th+=f.w*dt;    // 땅에 닿은 뒤에도 — 튀었다가 다시 눕는다
    if(f.land<0){
      /* 우듬지 쪽(줄기 0.7 L) 점이 땅에 닿았나 */
      const r=f.L*0.7, sn=Math.sin(f.th), tx=g.x+f.dx*sn*r, tz=g.z+f.dz*sn*r, ty=g.y+f.pv+Math.cos(f.th)*r;
      if(ty<=heightAt(tx,tz)+1.2||f.th>=1.75){
        f.land=f.t; f.thL=f.th; f.w=-f.w*0.12;          // 땅을 치고 살짝 튄다
        sfx('thud'); giantDust(f);
        const d=Math.hypot(PL.pos.x-tx,PL.pos.z-tz); GIANT.shake=Math.max(GIANT.shake||0,clamp(1-d/70,0,1)*0.6);
      }
    }else{
      if(f.th>=f.thL){ f.th=f.thL; f.w=Math.abs(f.w)>0.05?-f.w*0.25:0; }
      const k=f.t-f.land;
      if(k>1.2) f.mat.opacity=Math.max(0.45,1-(k-1.2)/1.4*0.55);   // 알파 자르기(0.4) 밑으로 내리면 통째로 빠지므로 0.45 까지만
      if(k>2.6) f.m.visible=false;                   // 먼지가 가장 짙을 때 사라진다
      if(k>3.4){ giantFallEnd(f); GIANT.falls.splice(i,1); continue; }
    }
    giantFallPose(f);
    LIGHT.dirtyAt(g.x,g.z,f.L+10);
    for(const d of f.dust){ const k=(f.t-d.t0)/3.2; d.m.visible=k>=0&&k<=1; if(!d.m.visible) continue;
      d.m.scale.set(d.w*(0.5+k*0.9),d.h*(0.4+k*0.8),1); d.m.position.y=d.y+k*2.5; }
  }
  if(GIANT.shake>0){                                    // 화면 흔들림 — 사람 시점(updatePlayer 다음)에 얹는다
    const a=GIANT.shake; GIANT.shake=Math.max(0,a-dt*0.9);
    camera.position.x+=(Math.random()-0.5)*a*0.5; camera.position.y+=(Math.random()-0.5)*a*0.6; camera.position.z+=(Math.random()-0.5)*a*0.5;
  }
}
function giantDust(f){
  const g=f.g, sm=fireMats().smoke;
  for(let j=0;j<7;j++){
    const r=f.L*(0.25+j*0.11), x=g.x+f.dx*r+(Math.random()-0.5)*4, z=g.z+f.dz*r+(Math.random()-0.5)*4, y=heightAt(x,z);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,0.5,0),sm);
    m.frustumCulled=false; m.userData.lightRole='none'; m.position.set(x,y,z); m.visible=false;
    scene.add(m); f.dust.push({m,t0:f.t+j*0.05,w:8+f.L*0.25,h:6+f.L*0.12,y});
  }
}
function giantFallEnd(f){
  scene.remove(f.m); f.mat.dispose();
  for(const d of f.dust){ scene.remove(d.m); d.m.geometry.dispose(); }
}
/* 저장 — 벤 그루의 남은 통나무(0 이면 쓰러졌다) */
function giantSave(){ return [...GIANT.cut]; }
function giantRestore(arr){
  GIANT.cut.clear();
  if(!Array.isArray(arr)) return;
  const byKey=new Map(GIANT.list.map(g=>[giantKey(g),g]));
  for(const e of arr){
    if(!Array.isArray(e)||typeof e[0]!=='string') continue;
    const g=byKey.get(e[0]); if(!g) continue;
    const n=Math.max(0,e[1]|0); GIANT.cut.set(e[0],n);
    if(n<=0) giantFell(g,false); else g.prop.logs=Math.min(g.prop.logs,n);
  }
  updateGiants(true);
}
