/* 33-crags.js — CASTAWAY
   암벽 — 피오르 벽 · 절벽 · 단구 벼랑에 박힌 집채~건물만 한 바위 무리(프랙털로 자란다)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   암벽
   ----------------------------------------------------------------------------
   땅은 칸 15 m(6배 섬)의 높이 지도라 벼랑이 밋밋한 비탈 한 장으로만 선다. 그 벽에 **아주 큰 바위**를 박아 벼랑마다 꼴이
   다르게 한다(사용자 요청). 가파른 칸(비탈 0.8 이상)에서 자리를 뽑고, 자리마다 바위 무리 하나가 **프랙털**로 자란다 —
   물가 거품(96-foam.js)과 같은 얼개다:
     ① **큰 바위 3~5 덩이**가 등고선을 따라 서로 물려 이어진다(반지름은 칸의 0.55~1.3배 — 6배 섬에서 8~20 m · 열에 하나는 1.6배).
     ② 큰 바위마다 겉(바깥쪽·위쪽)에서 **작은 바위 2~4 덩이**가 돋는다(어미의 0.30~0.64배 — 크기는 들쭉날쭉).
     ③ 작은 바위마다 **더 작은 바위 0~2 덩이**가 또 돋는다(어미의 0.34~0.64배).
   무리의 꼴은 넷이다 — 버팀벽(선 기둥) · 턱(넓적한 층) · 더미(발치에 굴러떨어진 돌) · 뿔(바깥으로 기운 큰 덩이).
   · 바위 꼴: 공을 네모지게 부풀리고(모서리) 큰 혹을 밀고 당긴 뒤 평면 몇 장으로 깎는다(쪼개진 면). 여덟 벌을 미리 빚어 두고 돌려 쓴다.
   · **빛깔은 덩이마다 다르다** — 밝기 0.6~1.3배, 빛(따뜻한 갈빛 · 찬 잿빛 · 녹슨 얼룩 · 바랜 흰빛)도 무리마다 고르고 덩이마다 흔든다.
     재질은 화강암 재질에 정점 빛깔을 켠 것이다(밑동은 땅 빛깔로 녹아든다 — envPatch). 굴 바위(32-caves.js)도 이 재질을 쓴다.
     먼 칸은 결 무늬 없이 빛깔만 칠한다(`matFar` — 화강암 셰이더는 화소마다 잡음을 스무 번 남짓 세는데 140 m 밖에서는 안 보인다).
   · 그리기: 섬을 320 m 칸으로 나눠 칸마다 메시 하나로 합친다. **사람이 다가갈 때** 짓는다 — 칸 가장자리가 140 m 안이면 세 단계 다(촘촘한 꼴),
     720 m 까지는 두 단계만(성긴 꼴), 그 밖은 안 그리고 1050 m 밖은 버린다. 산 너머의 칸은 거른다(tileOcc — 30-props.js).
   · **몸은 바위의 진짜 꼴에 막히고, 낮은 데로는 올라선다**(아래 '바위를 딛기') — 예전의 충돌 원은 바위와 꼴이 달라, 원 밖으로
     나온 바위는 걸어서 뚫렸고(속이 들여다보였다) 원 안의 빈 데는 보이지 않는 벽이었다(사용자 지적). 원(`cols`)은 이제
     나무·덤불이 바위 속에 서지 않게 하는 데만 쓴다(`cragNear`).
   · 자리와 꼴은 시드가 정한다(저장에 안 넣는다). 지형 판 1(옛 저장)에는 없다.
   ========================================================================== */
const CRAG={T:320, NEAR:140, FAR:720, DROP:1050, tiles:new Map(), cols:[], cg:new Map(), ix:new Map(), n:0, blobs:0, shapes:null, mat:null, matFar:null, t:0, F:15, BK:10, slope:0};
function cragMat(){
  if(CRAG.mat) return CRAG.mat;
  const m=rockMat('granite',0x7a7872); m.vertexColors=true;
  return CRAG.mat=m;
}
function cragMatFar(){
  if(CRAG.matFar) return CRAG.matFar;
  const m=new THREE.MeshLambertMaterial({color:0x6f6d66,vertexColors:true}); m.userData.melt=0.5; m.userData.meltAttr=true;
  /* 먼 바위(140 m 밖)도 **바위 사진**을 입는다(사용자 요청) — 가까운 재질(rockMat)과 같은 잡음으로 같은 장을 고르되, 섞지 않고 많이 섞인 쪽
     한 장만 세 방향으로 읽는다(법선 지도 · 이끼 · 금은 없다 — 멀어서 안 보인다). 메시는 세계 좌표로 합쳐져 있어 정점의 자리·법선이 곧 세계 값이다 */
  if(TERR_U.uRk){
    m.onBeforeCompile=sh=>{
      sh.uniforms.uRk=TERR_U.uRk;
      sh.vertexShader='varying vec3 vFW;\nvarying vec3 vFN;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFW=(modelMatrix*vec4(transformed,1.0)).xyz; vFN=normal;');
      sh.fragmentShader=`uniform mediump sampler2DArray uRk;
varying vec3 vFW;
varying vec3 vFN;
float frh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float frn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(frh(i),frh(i+vec3(1,0,0)),f.x),mix(frh(i+vec3(0,1,0)),frh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(frh(i+vec3(0,0,1)),frh(i+vec3(1,0,1)),f.x),mix(frh(i+vec3(0,1,1)),frh(i+vec3(1,1,1)),f.x),f.y),f.z); }
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        { vec3 p=vFW, n=normalize(vFN), tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4;
          float sel=clamp(frn(p/11.0+vec3(3.1,0.7,7.7))*1.3-0.15,0.0,0.999)*4.0, ia=floor(sel);
          float L=fract(sel)<0.5?(ia>2.5?ia+1.0:ia):(ia>1.5?ia+2.0:ia+1.0); vec3 q=fract(sel)<0.5?p/1.7:(p/1.7)*0.83+vec3(0.37,0.11,0.59);
          vec3 rk=texture(uRk,vec3(q.zy,L)).rgb*tw.x+texture(uRk,vec3(q.xz,L)).rgb*tw.y+texture(uRk,vec3(q.xy,L)).rgb*tw.z;
          rk=mix(vec3(dot(rk,vec3(0.30,0.59,0.11))),rk,0.45);                // 가까운 재질과 같이 빛깔을 반쯤만
          diffuseColor.rgb*=mix(vec3(1.0),rk*2.0,0.85)*0.93; }`);
    };
    m.customProgramCacheKey=()=>'cragfar-rk';
  }
  return CRAG.matFar=m;
}
/* 바위 꼴 하나 — 같은 시드는 쪼갬 수(w·h)가 달라도 같은 꼴이다(먼 것은 성기게 짓는다) */
function cragShape(seed,w,h){
  const g=new THREE.SphereGeometry(1,w,h), p=g.attributes.position, rnd=mulberry32((seed^0x3c6ef3)>>>0);
  const box=0.45+rnd()*0.40, L=[], C=[];
  for(let i=0;i<5;i++){ let x=rnd()*2-1, y=rnd()*2-1, z=rnd()*2-1; const l=Math.hypot(x,y,z)||1; L.push([x/l,y/l,z/l,1.3+rnd()*2.4,rnd()*6.283,rnd()*2-1]); }
  for(let i=0,n=3+((rnd()*4)|0);i<n;i++){ let x=rnd()*2-1, y=(rnd()*2-1)*0.6, z=rnd()*2-1; const l=Math.hypot(x,y,z)||1; C.push([x/l,y/l,z/l,0.62+rnd()*0.30]); }
  const st=5+rnd()*8, sp=rnd()*6.283;
  for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const k=Math.pow(Math.max(Math.abs(x),Math.abs(y),Math.abs(z)),-box); x*=k; y*=k; z*=k;            // 네모지게(모서리가 선다)
    let f=0; for(const l of L) f+=l[5]*Math.sin(l[3]*(x*l[0]+y*l[1]+z*l[2])+l[4]);
    const ux=p.getX(i), uy=p.getY(i), uz=p.getZ(i);
    const s=(1+0.055*f+0.020*Math.sin(y*st+sp))*(1+0.075*SHP.rough(ux,uy,uz,seed,1.7,4))*(1+0.16*(SHP.jag(ux,uy,uz,seed^0x6a,2.3,3)-0.25)); x*=s; y*=s; z*=s;   // + 날카로운 능선(SHP.jag)   // 큰 혹 · 가는 층리 · 잔 울퉁불퉁(SHP.rough — 사용자 요청: 바위가 너무 매끈하다)
    for(const c of C){ const d=x*c[0]+y*c[1]+z*c[2]-c[3]; if(d>0){ x-=c[0]*d; y-=c[1]*d; z-=c[2]*d; } }  // 쪼개진 면
    p.setXYZ(i,x,y,z); }
  g.computeVertexNormals(); SHP.weldSeam(g,w);
  const o={pos:Float32Array.from(p.array), nor:Float32Array.from(g.attributes.normal.array), idx:Uint16Array.from(g.index.array)};
  g.dispose(); return o;
}
function cragShapes(){
  if(CRAG.shapes) return CRAG.shapes;
  const RES=[[[22,15],[10,7]],[[14,10],[7,5]],[[10,7],[7,5]]], S=[];   // [가까이 촘촘 · 멀리 성김] — 잔 울퉁불퉁이 보이게 가까운 꼴을 곱게(예전 13×9 · 9×6 · 7×5)
  for(let lv=0;lv<3;lv++){ S.push([]); for(let v=0;v<8;v++){ const sd=0xa11+lv*977+v*131; S[lv].push([cragShape(sd,RES[lv][1][0],RES[lv][1][1]),cragShape(sd,RES[lv][0][0],RES[lv][0][1])]); } }
  return CRAG.shapes=S;
}
function cragClear(){
  for(const t of CRAG.tiles.values()) cragDrop(t);
  CRAG.tiles.clear(); CRAG.cols.length=0; CRAG.cg.clear(); CRAG.ix.clear(); CRAG.n=0; CRAG.blobs=0;
  if(typeof coastClear==='function') coastClear();
}
function cragDrop(t){ for(const k of ['near','far']){ const m=t[k]; if(m){ scene.remove(m); m.geometry.dispose(); t[k]=null; } } }
/* 충돌 원 — 반지름 7 m 까지는 하나, 더 크면 고리로 덮는다 */
function cragCollide(x,z,R){
  const C=CRAG.cols;
  if(R<=7){ C.push(x,z,R); return; }
  C.push(x,z,7);
  for(let rr=R-6;rr>4;rr-=9){ const n=Math.ceil(6.283*rr/8); for(let i=0;i<n;i++){ const a=i/n*6.283; C.push(x+Math.cos(a)*rr,z+Math.sin(a)*rr,6); } }
}
/* 무리 하나를 기른다 — 바위 한 덩이는 수 15 개: 자리 3 · 반지름 3 · 돌림 3(기울임 x · 방위 · 기울임 z) · 단계 · 꼴 벌 · 빛깔 3 · 녹아드는 높이 */
const CRAG_TINT=[[1.06,1.00,0.90],[0.92,0.97,1.06],[1.00,0.90,0.80],[1.08,1.07,1.02],[0.86,0.88,0.86]];
function cragGrow(s,B){
  const rnd=mulberry32(s.seed>>>0), dx=s.dx, dz=s.dz, tx=-dz, tz=dx;                 // 내리막 · 등고선
  const r0=CELL*(0.55+0.75*rnd()*rnd())*(rnd()<0.10?1.6:1), type=(rnd()*4)|0, side=rnd()<0.5?1:-1;
  const TB=0.66+0.52*rnd(), T0=CRAG_TINT[(rnd()*CRAG_TINT.length)|0], T1=CRAG_TINT[(rnd()*CRAG_TINT.length)|0];   // 무리의 밝기 · 빛 둘
  const put=(x,y,z,rx,ry,rz,lv)=>{ const b=TB*(0.80+0.42*rnd())*(lv===2?1.08:1), m=rnd(), j=()=>0.96+0.08*rnd();
    B.push(x,y,z,rx,ry,rz,(rnd()-0.5)*(lv?0.9:0.4),lv?rnd()*6.283:Math.atan2(-tz,tx)+(rnd()-0.5)*0.7,(rnd()-0.5)*(lv?0.9:0.4)+(type===3&&!lv?0.25:0),
           lv,(rnd()*8)|0,b*lerp(T0[0],T1[0],m)*j(),b*lerp(T0[1],T1[1],m)*j(),b*lerp(T0[2],T1[2],m)*j(),lv===0?1.5:lv===1?0.8:0.4);
    CRAG.blobs++; };
  /* 어미(자리 · 반지름) 겉에서 새끼가 돋는다 — 바깥(내리막)·위·옆으로. 땅속에 다 묻히는 것은 버린다 */
  const bud=(px,py,pz,rh,rv,lv,k0,k1,n)=>{ for(let i=0;i<n;i++){
      let vx=dx*(0.15+0.85*rnd())+tx*(rnd()*2-1)*(type===1?1.3:0.9), vy=-0.25+1.15*rnd(), vz=dz*(0.15+0.85*rnd())+tz*(rnd()*2-1)*(type===1?1.3:0.9);
      const vl=Math.hypot(vx,vy,vz)||1; vx/=vl; vy/=vl; vz/=vl;
      const r=Math.min(rh,rv)*(k0+(k1-k0)*rnd()), x=px+vx*rh*0.72, y=py+vy*rv*0.72, z=pz+vz*rh*0.72, gy=heightAt(x,z);
      if(y<gy-r*0.7) continue;
      const sy=0.7+0.7*rnd(), sx=0.85+0.4*rnd(), sz=0.85+0.4*rnd();
      put(x,y,z,r*sx,r*sy,r*sz,lv);
      if(lv===1){ if(r>1.2&&y-gy<r*sy*0.9) cragCollide(x,z,r*(sx+sz)*0.39);
        bud(x,y,z,r*(sx+sz)*0.5,r*sy,2,0.34,0.64,(rnd()*3)|0); } } };
  let px=s.x, pz=s.z, pr=0;
  for(let k=0,nM=3+((rnd()*3)|0);k<nM;k++){
    const r=r0*(0.62+0.6*rnd());
    if(k){ const st=(pr+r)*(0.55+0.2*rnd()); px+=tx*side*st+dx*(rnd()-0.5)*r*0.5; pz+=tz*side*st+dz*(rnd()-0.5)*r*0.5; }
    pr=r;
    let sx=1, sy=1, sz=1;
    if(type===0){ sy=1.5+rnd()*0.9; sx=0.82; sz=0.82; }           // 버팀벽 — 선 기둥
    else if(type===1){ sy=0.5+rnd()*0.25; sx=1.4; }               // 턱 — 넓적한 층
    else if(type===2){ sy=0.85+rnd()*0.3; }                       // 더미
    else{ sy=1.15+rnd()*0.5; sx=1.12; }                           // 뿔
    const gy=heightAt(px,pz); if(gy<-r*sy*0.8) continue;          // 물에 다 잠기면 안 세운다
    /* 벽 속으로 반지름의 1/4~1/2 을 들여 박는다 — 겉에 얹으면 비탈에 붙은 공으로 보인다 */
    /* 비탈 아래쪽이 뜨지 않게 — 내리막 쪽 발치(반지름의 0.7)의 땅을 재어, 바위 밑면이 거기서도 땅에 묻히는 높이까지만 올린다
       (가파른 벽에 넓적한 바위를 수평으로 얹으면 아래쪽이 허공에 떴다 — 사용자 지적) */
    const inK=r*(0.25+0.25*rnd()), mx=px-dx*inK, mz=pz-dz*inK, rh0=r*(sx+sz)*0.5;
    const y=Math.min(gy+r*sy*(0.02+0.30*rnd()),heightAt(mx+dx*rh0*0.7,mz+dz*rh0*0.7)+r*sy*0.5);
    put(mx,y,mz,r*sx,r*sy,r*sz,0);
    cragCollide(px,pz,r*(sx+sz)*0.36);
    bud(mx,y,mz,r*(sx+sz)*0.5,r*sy,1,0.30,0.64,2+((rnd()*3)|0));
    if(type===2) for(let i=0,n=2+((rnd()*4)|0);i<n;i++){          // 발치에 굴러떨어진 돌
      const d=r*(0.9+1.3*rnd()), x=px+dx*d+tx*(rnd()-0.5)*r*1.6, z=pz+dz*d+tz*(rnd()-0.5)*r*1.6, q=r*(0.18+0.28*rnd()), gy2=heightAt(x,z); if(gy2<-q) continue;
      put(x,Math.min(gy2+q*0.35,heightAt(x+dx*q*0.7,z+dz*q*0.7)+q*0.30),z,q*(0.9+0.3*rnd()),q*(0.7+0.4*rnd()),q*(0.9+0.3*rnd()),1); if(q>1.2) cragCollide(x,z,q*0.8); }
  }
}
/* 섬의 암벽 자리를 뽑고 무리를 기른다 — 자원을 다 놓은 뒤 한 번(placeResources). 그 칸에 서 있던 나무·바위는 치운다 */
function cragSites(seed){
  cragClear();
  if((P.tv|0)<2) return;
  const rnd=mulberry32((seed^0xc7a651)>>>0), occ=new Uint8Array(N*N), T=CRAG.T;
  for(let z=3;z<N-3;z++) for(let x=3;x<N-3;x++){
    const i=IDX(x,z), sl=F.slope[i];
    if(sl<0.8||F.elev[i]<-2||F.river[i]) continue;
    if(rnd()>(sl>1.5?0.30:0.17)) continue;
    if(occ[i-1]||occ[i+1]||occ[i-N]||occ[i+N]) continue;                              // 무리끼리 한 칸은 띄운다
    const wx=(x-N/2+(rnd()-0.5)*0.6)*CELL, wz=(z-N/2+(rnd()-0.5)*0.6)*CELL, sd=(rnd()*1e9)|0;
    if(caveAt(wx,wz,CELL)) continue;
    const gx=F.elev[i+1]-F.elev[i-1], gz=F.elev[i+N]-F.elev[i-N], gl=Math.hypot(gx,gz)||1;
    const k=(Math.floor(wx/T)+512)*1024+(Math.floor(wz/T)+512);
    let t=CRAG.tiles.get(k); if(!t) CRAG.tiles.set(k,t={cx:(Math.floor(wx/T)+0.5)*T,cz:(Math.floor(wz/T)+0.5)*T,r:T*0.75,b:[],near:null,far:null});
    cragGrow({x:wx,z:wz,dx:-gx/gl,dz:-gz/gl,seed:sd},t.b); occ[i]=1; CRAG.n++;
  }
  PROPS=PROPS.filter(p=>p.cave||!occ[IDX(clamp(Math.round(p.x/CELL+N/2),0,N-1),clamp(Math.round(p.z/CELL+N/2),0,N-1))]);
  if((P.tv|0)>=5&&typeof coastFeatures==='function') coastFeatures(seed);   // 바닷가 지형 — 시스택 · 해식 아치 · 주상절리(34-coast.js · 지형 판 5)
  { const C=CRAG.cols, G=CRAG.cg;                                                          // 원을 16 m 칸에 걸어 둔다(cragNear)
    for(let i=0;i<C.length;i+=3){ const r=C[i+2], x0=Math.floor((C[i]-r)/16), x1=Math.floor((C[i]+r)/16), z0=Math.floor((C[i+1]-r)/16), z1=Math.floor((C[i+1]+r)/16);
      for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const k=(gx+2048)*4096+(gz+2048); let a=G.get(k); if(!a) G.set(k,a=[]); a.push(i); } } }
}
/* 그 자리가 큰 바위의 발치(원 + pad) 안인가 — 나무·덤불·노거수가 바위 속에 서지 않게(95-flora.js · 95-giants.js) */
function cragNear(x,z,pad){
  if(!CRAG.n) return false;
  const a=CRAG.cg.get((Math.floor(x/16)+2048)*4096+(Math.floor(z/16)+2048)); if(!a) return false;
  const C=CRAG.cols; pad=pad||0;
  for(const i of a){ const dx=x-C[i], dz=z-C[i+1], q=C[i+2]+pad; if(dx*dx+dz*dz<q*q) return true; }
  return false;
}
function buildCrags(){ if(typeof coastBuild==='function') coastBuild(); if(typeof geoBuild==='function') geoBuild(); }   // 주상절리 기둥(34-coast.js) · 지열 지대(35-geo.js)                 // (예전엔 여기서 충돌 원을 걸었다 — 이제 몸은 바위의 진짜 꼴로 막는다. 아래)

/* ── 바위를 딛기 ────────────────────────────────────────────────────────────
   사람이 선 자리의 수직선이 바위 덩이를 지나는 구간([밑, 꼭대기])을 **그려진 꼴 그대로** 구한다 — 덩이마다 수직선을 그 덩이의
   제 좌표(돌림·늘림을 되돌린 단위 꼴)로 옮겨 단위 꼴의 세모들과 맞춰 본다(가까운 메시가 쓰는 촘촘한 꼴 — 덩이 하나에 세모 60~200).
   `cragFloor(x,z,발높이,땅)` 이 그 구간들로 딛는 높이를 정한다:
     · 밑이 (땅 또는 발)에서 1.9 m 안인 덩이는 **그 꼭대기가 바닥**이다 — 얹힌 덩이는 차례로 이어 올린다.
       낮으면 올라서고(턱 0.55 m · 49° 까지 — 80-player.js `walkable`), 높으면 벽이다(오를 수 없는 턱).
     · 밑이 머리 위(1.9 m 넘게)인 덩이는 지붕이다 — 그 밑으로 지나간다.
   꼭대기 면의 비탈은 `CRAG.slope` 에 남긴다(가파른 바위 면은 못 오른다).
   덩이는 10 m 칸에 걸어 두고 찾는다 — 사람이 다가간 320 m 칸만 그때 걸어 둔다(`cragIndex`) */
const _cgS=[];                          // 수직선이 지나는 구간들 — {b,t,sl}
function cragIndex(t){
  if(t.ixd) return; t.ixd=true;
  const B=t.b, S=cragShapes(), F_=CRAG.F, BK=CRAG.BK, IX=CRAG.ix;
  for(let o=0;o<B.length;o+=F_){
    _crE.set(B[o+6],B[o+7],B[o+8]); _crQ.setFromEuler(_crE); _crM.makeRotationFromQuaternion(_crQ); const e=_crM.elements;
    const rx=B[o+3], ry=B[o+4], rz=B[o+5], br=Math.max(rx,ry,rz)*1.55;
    const r={x:B[o],y:B[o+1],z:B[o+2],rx,ry,rz,br2:br*br,sh:S[B[o+9]][B[o+10]][1],
             m:[e[0],e[1],e[2],e[4],e[5],e[6],e[8],e[9],e[10]]};                  // 돌림 행렬의 세 열
    const x0=Math.floor((r.x-br)/BK), x1=Math.floor((r.x+br)/BK), z0=Math.floor((r.z-br)/BK), z1=Math.floor((r.z+br)/BK);
    for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const k=(gx+4096)*8192+(gz+4096); let a=IX.get(k); if(!a) IX.set(k,a=[]); a.push(r); }
  }
}
/* 수직선 (x,z) 이 지나는 덩이의 구간을 _cgS 에 모은다 — 개수를 돌려준다 */
function cragSpan(x,z){
  const T=CRAG.T, tx0=Math.floor((x-70)/T), tx1=Math.floor((x+70)/T), tz0=Math.floor((z-70)/T), tz1=Math.floor((z+70)/T);
  /* 사람 둘레(400 m)의 칸만 걸어 둔다 — 섬을 지을 때 나무 수십만 그루가 묻는 것(floorAt)까지 다 걸면 섬 전체가 걸린다 */
  if((x-PL.pos.x)*(x-PL.pos.x)+(z-PL.pos.z)*(z-PL.pos.z)<160000)
  for(let a=tz0;a<=tz1;a++) for(let b=tx0;b<=tx1;b++){ const t=CRAG.tiles.get((b+512)*1024+(a+512)); if(t&&!t.ixd) cragIndex(t); }
  const L=CRAG.ix.get((Math.floor(x/CRAG.BK)+4096)*8192+(Math.floor(z/CRAG.BK)+4096)); if(!L) return 0;
  let n=0;
  for(const r of L){
    const wx=x-r.x, wz=z-r.z; if(wx*wx+wz*wz>r.br2) continue;
    const m=r.m, wy=-r.y;                                 // 선의 한 점(세계 높이 0)과 방향(위)을 덩이 좌표로 — 돌림을 되돌리고 반지름으로 나눈다
    const ox=(m[0]*wx+m[1]*wy+m[2]*wz)/r.rx, oy=(m[3]*wx+m[4]*wy+m[5]*wz)/r.ry, oz=(m[6]*wx+m[7]*wy+m[8]*wz)/r.rz;
    const dx=m[1]/r.rx, dy=m[4]/r.ry, dz=m[7]/r.rz;
    { const dd=dx*dx+dy*dy+dz*dz, od=ox*dx+oy*dy+oz*dz, c2=ox*ox+oy*oy+oz*oz-od*od/dd; if(c2>2.6) continue; }   // 단위 꼴(반지름 1.6 안)을 스치지도 않는다
    const P=r.sh.pos, I=r.sh.idx; let lo=1e9, hi=-1e9, hn=1;
    for(let q=0;q<I.length;q+=3){
      const a=I[q]*3, b=I[q+1]*3, c=I[q+2]*3;
      const e1x=P[b]-P[a], e1y=P[b+1]-P[a+1], e1z=P[b+2]-P[a+2], e2x=P[c]-P[a], e2y=P[c+1]-P[a+1], e2z=P[c+2]-P[a+2];
      const px=dy*e2z-dz*e2y, py=dz*e2x-dx*e2z, pz=dx*e2y-dy*e2x, det=e1x*px+e1y*py+e1z*pz;
      if(det>-1e-9&&det<1e-9) continue;
      const inv=1/det, sx=ox-P[a], sy=oy-P[a+1], sz=oz-P[a+2], u=(sx*px+sy*py+sz*pz)*inv; if(u<-1e-4||u>1.0001) continue;
      const qx=sy*e1z-sz*e1y, qy=sz*e1x-sx*e1z, qz=sx*e1y-sy*e1x, v=(dx*qx+dy*qy+dz*qz)*inv; if(v<-1e-4||u+v>1.0001) continue;
      const tt=(e2x*qx+e2y*qy+e2z*qz)*inv;                // 세계 높이(선의 매개값이 곧 높이다)
      if(tt<lo) lo=tt;
      if(tt>hi){ hi=tt;                                    // 꼭대기 면의 법선(세계) — 돌림 · 반지름의 역수
        const nx=(e1y*e2z-e1z*e2y)/r.rx, ny=(e1z*e2x-e1x*e2z)/r.ry, nz=(e1x*e2y-e1y*e2x)/r.rz;
        const wxn=m[0]*nx+m[3]*ny+m[6]*nz, wyn=m[1]*nx+m[4]*ny+m[7]*nz, wzn=m[2]*nx+m[5]*ny+m[8]*nz, l=Math.hypot(wxn,wyn,wzn)||1;
        hn=Math.abs(wyn)/l; }
    }
    if(hi>lo){ const s=_cgS[n]||(_cgS[n]={b:0,t:0,sl:0,u:false}); s.b=lo; s.t=hi; s.sl=Math.sqrt(Math.max(0,1-hn*hn))/Math.max(hn,0.02); s.u=false; n++; }
  }
  return n;
}
/* 딛는 높이 — g: 그 자리의 땅. fromY: 발 높이(안 주면 가장 높은 단단한 면) */
function cragFloor(x,z,fromY,g){
  CRAG.slope=0;
  if(!CRAG.n) return g;
  const n=cragSpan(x,z); if(!n) return g;
  const ref=fromY===undefined?-1e9:fromY;
  let top=g, more=true;
  while(more){ more=false;
    for(let i=0;i<n;i++){ const s=_cgS[i]; if(s.u||s.t<=top) continue;
      if(s.b<=Math.max(top,ref)+1.9){ top=s.t; CRAG.slope=s.sl+1e-4; s.u=true; more=true; } } }     // 0 보다 크면 '바위 위'라는 표시다
  return top;
}
/* 칸 하나의 메시 — lod 1: 세 단계 다(촘촘한 꼴) · 0: 두 단계(성긴 꼴) */
const _crM=new THREE.Matrix4(), _crQ=new THREE.Quaternion(), _crE=new THREE.Euler();
function cragMesh(t,lod){
  const B=t.b, S=cragShapes(), F_=CRAG.F; let nv=0, ni=0;
  for(let o=0;o<B.length;o+=F_){ const lv=B[o+9]; if(!lod&&lv>1) continue; const sh=S[lv][B[o+10]][lod]; nv+=sh.pos.length/3; ni+=sh.idx.length; }
  const pos=new Float32Array(nv*3), nor=new Float32Array(nv*3), col=new Float32Array(nv*3), mel=new Float32Array(nv), idx=new Uint32Array(ni);
  let v=0, q=0;
  for(let o=0;o<B.length;o+=F_){ const lv=B[o+9]; if(!lod&&lv>1) continue;
    const sh=S[lv][B[o+10]][lod], sp=sh.pos, sn=sh.nor, si=sh.idx, n=sp.length/3;
    _crE.set(B[o+6],B[o+7],B[o+8]); _crQ.setFromEuler(_crE); _crM.makeRotationFromQuaternion(_crQ); const e=_crM.elements;
    const X=B[o], Y=B[o+1], Z=B[o+2], rx=B[o+3], ry=B[o+4], rz=B[o+5], cr=B[o+11], cg=B[o+12], cb=B[o+13], ml=B[o+14];
    for(let i=0;i<n;i++){ const a=i*3, c=(v+i)*3;
      const x=sp[a]*rx, y=sp[a+1]*ry, z=sp[a+2]*rz;
      pos[c]=e[0]*x+e[4]*y+e[8]*z+X; pos[c+1]=e[1]*x+e[5]*y+e[9]*z+Y; pos[c+2]=e[2]*x+e[6]*y+e[10]*z+Z;
      const nx=sn[a]/rx, ny=sn[a+1]/ry, nz=sn[a+2]/rz; let wx=e[0]*nx+e[4]*ny+e[8]*nz, wy=e[1]*nx+e[5]*ny+e[9]*nz, wz=e[2]*nx+e[6]*ny+e[10]*nz; const l=Math.hypot(wx,wy,wz)||1;
      nor[c]=wx/l; nor[c+1]=wy/l; nor[c+2]=wz/l;
      const mt=0.95+0.10*(((i*2654435761)>>>0)&255)/255; col[c]=cr*mt; col[c+1]=cg*mt; col[c+2]=cb*mt; mel[v+i]=ml; }
    for(let i=0;i<si.length;i++) idx[q+i]=v+si[i];
    v+=n; q+=si.length; }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.setAttribute('aMelt',new THREE.BufferAttribute(mel,1));
  g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeBoundingSphere();
  const m=new THREE.Mesh(g,lod?cragMat():cragMatFar()); m.matrixAutoUpdate=false; m.updateMatrix(); m.visible=false; scene.add(m);
  return m;
}
/* 사람 둘레의 칸을 짓고 켜고 끈다 — 여덟 프레임에 한 번 · 한 번에 칸 하나만 짓는다(멈칫하지 않게) */
function updateCrags(){
  if(!CRAG.tiles.size||(CRAG.t++&7)) return;
  const px=PL.pos.x, pz=PL.pos.z; let built=0;
  for(const t of CRAG.tiles.values()){
    const d=Math.max(0,Math.hypot(t.cx-px,t.cz-pz)-CRAG.T*0.71);
    if(d>CRAG.DROP){ if(t.near||t.far) cragDrop(t); continue; }
    const see=d<CRAG.FAR&&!(d>CRAG.NEAR&&tileOcc(t,70)), lod=d<CRAG.NEAR?1:0, k=lod?'near':'far';
    if(see&&!t[k]&&!built){ t[k]=cragMesh(t,lod); built=1; }
    const nOn=see&&lod===1&&!!t.near, fOn=see&&!nOn&&!!t.far;
    if(t.near&&t.near.visible!==nOn){ t.near.visible=nOn; LIGHT.dirtyAt(t.cx,t.cz,t.r); }
    if(t.far&&t.far.visible!==fOn) t.far.visible=fOn;
  }
}
