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
     줄기·수관은 종류마다 한 벌을 지어 인스턴스로 세우고(128 m 칸마다 묶어 화면 밖 칸을 거른다),
     **뿌리는 나무마다 그 자리의 땅을 따라 따로 짓는다**.
   · 뿌리가 땅이다 — `giantRootAt(x,z)` 가 그 자리의 뿌리 높이를 돌려주고, 설 자리(`floorAt`)가 그만큼 높아진다.
     뿌리 끝에서 걸어 오르면 줄기 곁 허리 높이까지 올라선다. 옆구리는 턱이 높아 막힌다. 줄기는 충돌 원으로 막는다.
   ========================================================================== */
const GIANT={list:[], grid:new Map(), meshes:[], geo:null, G:26, cell:32, TILE:128};
/* 종류마다 — r 줄기 반지름(가슴 높이) · nb 판근 수 · rootL 뿌리 길이 · rootH 줄기 곁 뿌리 높이 */
const GIANT_KIND=[
  {n:'케이폭', r:1.5, nb:6, rootL:9.0, rootH:1.5},
  {n:'반얀',   r:1.9, nb:7, rootL:7.5, rootH:1.1},
  {n:'삼나무', r:1.7, nb:5, rootL:6.5, rootH:1.0}
];
/* 종류마다 생김새 벌 수 — 줄기(판근 수·굵기)는 종류마다 같고(충돌 테두리가 이걸 따른다) 높이·가지·공기뿌리·가지 층이 벌마다 다르다 */
const GIANT_VARS=4;
function giantGeos(){
  GIANT.geo=[[],[],[]];
  for(let w=0;w<GIANT_VARS;w++){ const G=giantShapes(mulberry32((0x61a47+w*0x9e3779b1)>>>0)); G.forEach((g,v)=>GIANT.geo[v].push(g)); }
}
function giantShapes(rnd){
  const K=floraKit(rnd), {unit,face,card,grow,fin}=K, rf=(a,b)=>a+(b-a)*rnd(), ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
  /* 줄기 — 밑동에서 판근이 날개처럼 벌어진다. 판근 방향은 뿌리(`giantRoots`)와 같은 각이다 */
  const bole=(H,r0,r1,nb,but,c,c2,sway)=>({g:SHP.grid(22,11,(u,v)=>{
      const th=u*6.2832, y=-0.8+(H+0.8)*Math.pow(v,1.7), t=clamp(y/H,0,1);
      const ridge=Math.pow(0.5+0.5*Math.cos(nb*th),3);
      const rad=(r0+(r1-r0)*t)*(1+but*Math.exp(-Math.max(0,y)/2.2)*ridge+0.05*Math.sin(th*9+y*0.7));
      return [Math.cos(th)*rad+sway*Math.sin(t*2.4)*t*H*0.04, y, Math.sin(th)*rad+sway*Math.sin(t*3.1+1)*t*H*0.03];
    },true),cell:FC.BARK,c,c2});
  const G=[];
  { // 0 케이폭 — 줄기가 16 m 까지 매끈하고 그 위로 큰 가지 일곱이 우산처럼 퍼진다(키 30 m · 수관 지름 24 m)
    const hk=rf(0.9,1.1), parts=[bole(19*hk,1.5,0.9,6,1.7,[0.46,0.40,0.34],[0.62,0.56,0.48],rf(0.5,1.5))];
    const S={taper:0.66,split:[2,3],spread:1.4,up:0.5,lift:0.30,shrink:0.70,bend:0.06,leafN:5,leafW:4.2,leafH:3.6,leafCell:FC.LEAF,leafTilt:0.9,leafC:[0.84,1,0.84],vine:0.25,vineH:4,bark:[0.46,0.40,0.34],bark2:[0.62,0.56,0.48]};
    for(let i=0,nb=ri(6,8);i<nb;i++){ const a=i/nb*6.283+rnd()*0.5;
      grow(parts,[Math.cos(a)*0.5,(16.5+rnd()*2.5)*hk,Math.sin(a)*0.5],unit(Math.cos(a),0.55,Math.sin(a)),7.5+rnd()*2.5,0.55,2,S); }
    G.push(fin(parts)); }
  { // 1 반얀 — 굵고 낮은 줄기, 넓게 누운 가지에서 공기뿌리가 땅까지 늘어진다(키 22 m · 수관 지름 28 m)
    const BB=[0.42,0.36,0.30], BB2=[0.58,0.50,0.42], hk=rf(0.9,1.12), parts=[bole(11*hk,1.9,1.3,7,1.2,BB,BB2,rf(0.2,0.8))];
    const S={taper:0.68,split:[2,3],spread:1.5,up:0.4,lift:0.28,shrink:0.72,bend:0.03,leafN:5,leafW:3.8,leafH:3.2,leafCell:FC.MANG,leafTilt:1.0,leafC:[0.86,1,0.88],bark:BB,bark2:BB2};
    for(let i=0,nb=ri(7,9);i<nb;i++){ const a=i/nb*6.283+rnd()*0.5, y0=(8.5+rnd()*2.5)*hk, L=8+rnd()*3, d=unit(Math.cos(a),0.38,Math.sin(a));
      grow(parts,[Math.cos(a)*0.8,y0,Math.sin(a)*0.8],d,L,0.6,2,S);
      for(let k=0,na=ri(1,3);k<na;k++){ const t=0.45+k*0.7/na+rnd()*0.1, x=Math.cos(a)*0.8+d[0]*L*t, z=Math.sin(a)*0.8+d[2]*L*t, y=y0+d[1]*L*t;   // 공기뿌리
        parts.push({g:SHP.tube([[x,y,z],[x+0.1,y*0.55,z-0.08],[x,y*0.15,z+0.05],[x,-0.8,z]],[0.10,0.08,0.09,0.13],5,0),cell:FC.BARK,c:BB,c2:BB2}); } }
    G.push(fin(parts)); }
  { // 2 삼나무 — 붉은 껍질의 곧은 줄기, 위로 갈수록 짧아지는 가지 층(키 40 m)
    const RB=[0.52,0.33,0.24], RB2=[0.66,0.44,0.32], hk=rf(0.9,1.1), parts=[bole(38*hk,1.7,0.25,5,1.0,RB,RB2,rf(0.1,0.5))], NC=[0.86,1,0.92], nl=ri(10,12);
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
function giantsBuild(){
  for(const m of GIANT.meshes){ scene.remove(m); if(m.userData.own) m.geometry.dispose(); }
  GIANT.meshes.length=0; GIANT.list.length=0; GIANT.grid.clear();
  if(!FLORA.m) floraBuild();                          // 그림 묶음·재질을 같이 쓴다
  if(!GIANT.geo) giantGeos();
  const S=GIANT.G, n=Math.floor(HALF/S)-1;
  for(let gz=-n;gz<=n;gz++) for(let gx=-n;gx<=n;gx++){
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
      if(hit||inLanding(wx,wz,rr+GIANT_KIND[v].rootL*s*1.3)) continue;   // 착륙 자리엔 판근까지 안 닿게
      placed={gx,gz,x:wx,z:wz,y:heightAt(wx,wz),s,v,w:floraHash(gx,gz,96)%GIANT_VARS,yaw:((h>>>12)&1023)/1023*6.283};
    }
    if(!placed) continue;
    placed.roots=giantRoots(placed);
    placed.reach=GIANT_KIND[placed.v].r*placed.s+GIANT_KIND[placed.v].rootL*placed.s*1.3+1;
    GIANT.list.push(placed);
    /* 줄기의 충돌 테두리 — 눈높이(1.5 m)에서 판근이 날개처럼 나온 만큼 방위마다 다르다 */
    { const KD=GIANT_KIND[placed.v], Kp=48, prof=new Float32Array(Kp), but=[1.7,1.2,1.0][placed.v]*Math.exp(-1.5/placed.s/2.2); let mx=0;
      for(let i=0;i<Kp;i++){ const th=i/Kp*6.2832-placed.yaw; prof[i]=KD.r*placed.s*(1+but*Math.pow(0.5+0.5*Math.cos(KD.nb*th),3))*0.97; if(prof[i]>mx) mx=prof[i]; }
      const col={x:placed.x,z:placed.z,r:mx,prof}; COLLIDERS.push(col); placed.col=col; }
    const k=cgKey(Math.floor(placed.x/GIANT.cell),Math.floor(placed.z/GIANT.cell));
    let a=GIANT.grid.get(k); if(!a){ a=[]; GIANT.grid.set(k,a); } a.push(placed);
  }
  buildColliderGrid();
  // ── 메시: 128 m 칸마다 종류별 인스턴스 + 그 칸의 뿌리를 한 덩이로
  const bins=new Map();
  for(const g of GIANT.list){ const k=Math.floor(g.x/GIANT.TILE)+'|'+Math.floor(g.z/GIANT.TILE); let b=bins.get(k); if(!b){ b=[]; bins.set(k,b); } b.push(g); }
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), Sc=new THREE.Vector3(), o={x:0,z:0,h:0,w:0};
  const add=(m,own)=>{ m.userData.own=own; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); GIANT.meshes.push(m); };
  /* 뿌리는 인스턴스가 아닌 보통 메시다 — r128 은 재질 하나에 셰이더가 하나라, 인스턴스 메시와 재질을 나눠 쓰면 그릴 때마다
     셰이더를 갈아 끼운다(인스턴스 색이 없는 메시가 섞이면 아예 죽는다). 그래서 뿌리는 제 재질을 쓴다 */
  if(!GIANT.rootMat) GIANT.rootMat=FLORA.mat.clone();
  const tint=new THREE.Color();
  for(const b of bins.values()){
    for(let v=0;v<GIANT.geo.length;v++) for(let w=0;w<GIANT.geo[v].length;w++){
      const ls=b.filter(g=>g.v===v&&g.w===w); if(!ls.length) continue;
      const im=new THREE.InstancedMesh(GIANT.geo[v][w],FLORA.mat,ls.length);
      ls.forEach((g,i)=>{ E.set(0,-g.yaw,0); Q.setFromEuler(E); V.set(g.x,g.y,g.z); Sc.set(g.s,g.s,g.s); M.compose(V,Q,Sc); im.setMatrixAt(i,M);
        const k=0.88+0.2*((floraHash(g.gx,g.gz,94)&255)/255); im.setColorAt(i,tint.setRGB(k,k,k*0.96)); });   // 그루마다 살짝 다른 톤(인스턴스 색 칸이 꼭 있어야 한다)
      im.instanceMatrix.needsUpdate=true; im.instanceColor.needsUpdate=true; im.customDepthMaterial=FLORA.depth; add(im,false); boundMesh(im);
    }
    const parts=[];
    for(const g of b) for(const r of g.roots){
      const RB=g.v===2?[0.52,0.33,0.24]:[0.44,0.38,0.32], RB2=g.v===2?[0.66,0.44,0.32]:[0.60,0.53,0.45];
      /* 땅을 따라 누운 등성이 — 단면 다섯 점(양 끝은 땅에 0.25 m 묻는다) */
      parts.push({g:SHP.grid(4,10,(u,t)=>{ giantRootPt(g,r,t,o);
          const k=u*2-1, ca=Math.cos(r.a), sa=Math.sin(r.a), x=o.x-sa*k*o.w, z=o.z+ca*k*o.w;
          return [x, heightAt(x,z)+(Math.abs(k)>0.99?-0.25:o.h*Math.cos(k*1.5708)), z]; }),cell:FC.BARK,c:RB,c2:RB2});
    }
    if(parts.length){ const m=new THREE.Mesh(SHP.merge(parts,true),GIANT.rootMat); m.frustumCulled=true; add(m,true); }
  }
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
