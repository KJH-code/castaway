/* 34-coast.js — CASTAWAY
   바닷가 지형 — 시스택(바다에 선 바위섬) · 해식 아치 · 주상절리(지형 판 5)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   바닷가 지형(사용자 요청 — 바닷가와 바다를 훨씬 다양하게)
   ----------------------------------------------------------------------------
   · **바위섬(현무암 · 흑요석)** — 물가에서 30~90 m 떨어진 얕은 바다(수심 1.5~10 m)에 한둘~셋 선다. 지름 2 m 육각 현무암 기둥이
     벌집처럼 서서 가운데가 높고(물 위 8~26 m) 물가로 계단처럼 부러진다 · 검은 흑요석 덩이가 박힌다(셋에 하나는 흑요석 섬) ·
     꼭대기에 전나무 한두 그루(coastIsle). 예전엔 둥근 덩이를 쌓아 흘러내리는 것처럼 보였다(사용자 지적).
   · **해식 아치** — 물가 바로 앞 얕은 물에 반원으로 휜 바위 다리. 덩이를 반원을 따라 겹쳐 세우고 두 발은 바다 밑까지 내린다.
     가운데 밑은 물 위 4.5 m 넘게 비어 배가 지나간다.
   · 둘 다 **벼랑의 큰 바위(33-crags.js)와 같은 덩이**다 — 같은 칸에 넣어 같은 사진 재질·같은 단계(LOD)·같은 몸의 막힘(cragSpan)을 쓴다.
   · **주상절리** — 바다에 닿은 가파른 벼랑에 육각 돌기둥이 벌집처럼 빽빽이 선다(제주 대포동처럼). 기둥 지름 1.2 m · 위는 땅 높이를
     따라가되 계단처럼 층이 진다(앞줄일수록 낮게 부러져 바다로 내려가는 돌계단이 된다). 검은 현무암 빛 · 면마다 각진 명암.
     기둥마다 몸이 막히고(옆) 위에 올라선다(턱 0.55 m 안이면 계단처럼 오른다 — 62-build.js floorAt 이 `coastFloor` 를 본다).
   자리와 꼴은 시드가 정한다(저장에 안 넣는다). 지형 판 5 밑(옛 저장)에는 없다.
   ========================================================================== */
const COAST={cols:[], grid:new Map(), meshes:[], G:8, sites:{stack:0,arch:0,basalt:0}};
const coastKey=(x,z)=>(Math.floor(x/COAST.G)+4096)*8192+(Math.floor(z/COAST.G)+4096);
function coastClear(){
  for(const m of COAST.meshes){ scene.remove(m); m.geometry.dispose(); }
  COAST.meshes.length=0; COAST.cols.length=0; COAST.grid.clear(); COAST.sites={stack:0,arch:0,basalt:0}; COAST.isles=[];
}
/* 벼랑 바위 칸(33-crags.js)에 덩이 하나 — 수 15 개(자리 · 반지름 · 돌림 · 단계 · 꼴 벌 · 빛깔 · 녹는 높이) */
function coastBlob(rnd,x,y,z,rx,ry,rz,lv,tone){
  const T=CRAG.T, k=(Math.floor(x/T)+512)*1024+(Math.floor(z/T)+512);
  let t=CRAG.tiles.get(k); if(!t) CRAG.tiles.set(k,t={cx:(Math.floor(x/T)+0.5)*T,cz:(Math.floor(z/T)+0.5)*T,r:T*0.75,b:[],near:null,far:null});
  const b=tone*(0.85+0.3*rnd());
  t.b.push(x,y,z,rx,ry,rz,(rnd()-0.5)*0.5,rnd()*6.283,(rnd()-0.5)*0.5,lv,(rnd()*8)|0,b*0.98,b*0.99,b*1.0,lv===0?1.5:0.8);
  CRAG.blobs++;
}
/* 땅 격자에서 (gx,gz) 둘레 r 칸 안에 조건에 맞는 칸이 있나 */
function coastNear(gx,gz,r,fn){
  for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ const x=gx+dx, z=gz+dz; if(x<1||z<1||x>N-2||z>N-2) continue; if(fn(F.elev[IDX(x,z)])) return true; }
  return false;
}
/* 바다 쪽(내리막) 방향 */
function coastDir(gx,gz){
  const i=IDX(gx,gz), gxv=F.elev[i+1]-F.elev[i-1], gzv=F.elev[i+N]-F.elev[i-N], l=Math.hypot(gxv,gzv)||1;
  return [-gxv/l,-gzv/l];
}
function coastFeatures(seed){
  const rnd=mulberry32((seed^0xc0a57)>>>0), WS=Math.max(1,CELL/4), spots=[];
  const far=(x,z,d)=>spots.every(s=>Math.hypot(s[0]-x,s[1]-z)>d);
  const landOK=(x,z,pad)=>!caveAt(x,z,pad)&&!(typeof inLanding==='function'&&inLanding(x,z,pad+20));
  /* ── 시스택 → 현무암 · 흑요석 바위섬(사용자 요청 — 덩이를 쌓은 바위섬이 흘러내리는 것처럼 이상했다) ──
     자리 고르기는 예전 그대로다. 이 난수(rnd)를 아치 · 주상절리가 이어 쓰므로 예전 덩이들이 뽑던 난수를 같은 수만큼 뽑아 버려야
     옛 섬의 아치 · 주상절리 자리가 안 바뀐다. 섬의 꼴은 자리마다 제 난수로 coastIsle 이 따로 빚는다 */
  COAST.isles=[];
  for(let tries=0,want=Math.round(10+8*WS);tries<60000&&COAST.sites.stack<want;tries++){
    const gx=3+((rnd()*(N-6))|0), gz=3+((rnd()*(N-6))|0), e=F.elev[IDX(gx,gz)];
    if(e>-1.5||e<-10) continue;
    const rr=Math.max(2,Math.round(30/CELL)), rR=Math.max(3,Math.round(90/CELL));
    if(coastNear(gx,gz,rr,v=>v>0.3)||!coastNear(gx,gz,rR,v=>v>0.5)) continue;   // 물가에서 30~90 m
    const x0=(gx-N/2)*CELL, z0=(gz-N/2)*CELL; if(!far(x0,z0,160)||!landOK(x0,z0,10)) continue;
    spots.push([x0,z0]); COAST.sites.stack++; CRAG.n++;
    for(let s=0,ns=1+((rnd()*3)|0);s<ns;s++){
      const x=x0+(rnd()-0.5)*26*Math.min(s,1), z=z0+(rnd()-0.5)*26*Math.min(s,1), fl=heightAt(x,z); if(fl>-1) continue;
      const R=4+rnd()*5, H=8+rnd()*18, nb=Math.max(2,Math.ceil((H-fl)/(R*1.05))), tone=0.78+0.22*rnd();
      for(let k=0;k<nb;k++) for(let i=0;i<10;i++) rnd();                    // 예전 기둥 덩이 — 덩이마다 열(크기 · 자리 · 늘림 · 돌림 · 빛깔)
      for(let k=0,nk=2+((rnd()*3)|0);k<nk;k++) for(let i=0;i<8;i++) rnd();  // 예전 잔 덩이 — 덩이마다 여덟
      cragCollide(x,z,R*1.15); COAST.isles.push({x,z,R,H,fl,tone});
    }
  }
  for(const isle of COAST.isles) coastIsle(isle);
  /* ── 해식 아치 ── */
  for(let tries=0,want=Math.round(3+3*WS);tries<60000&&COAST.sites.arch<want;tries++){
    const gx=4+((rnd()*(N-8))|0), gz=4+((rnd()*(N-8))|0), e=F.elev[IDX(gx,gz)];
    if(e<0.5||e>8||F.river[IDX(gx,gz)]) continue;
    if(!coastNear(gx,gz,1,v=>v<-0.8)) continue;
    const [nx,nz]=coastDir(gx,gz), tx=-nz, tz=nx, x1=(gx-N/2)*CELL, z1=(gz-N/2)*CELL;
    const W=14+rnd()*14, H=W*(0.55+0.2*rnd()), r=3+rnd()*2.2, cx=x1+nx*(W*0.35+6), cz=z1+nz*(W*0.35+6);
    if(heightAt(cx,cz)>-0.8||!far(cx,cz,220)||!landOK(cx,cz,W)) continue;
    spots.push([cx,cz]); COAST.sites.arch++; CRAG.n++;
    const tone=0.80+0.2*rnd(), m=Math.ceil(Math.PI*W*0.5/(r*1.05));
    for(let j=0;j<=m;j++){ const th=Math.PI*j/m, px=cx+tx*Math.cos(th)*W*0.5, pz=cz+tz*Math.cos(th)*W*0.5, py=Math.sin(th)*H;
      const rr=r*(0.92+0.25*rnd())*(j===0||j===m?1.25:1);
      coastBlob(rnd,px,py,pz,rr*1.1,rr*0.95,rr*1.35,0,tone); }
    for(const sgn of [1,-1]){ const fx=cx+tx*sgn*W*0.5, fz=cz+tz*sgn*W*0.5, fl=heightAt(fx,fz);   // 두 발 — 바다 밑까지
      for(let y=-r*0.5;y>fl-r;y-=r*1.1) coastBlob(rnd,fx+(rnd()-0.5)*1.5,y,fz+(rnd()-0.5)*1.5,r*1.35,r*0.9,r*1.45,0,tone);
      cragCollide(fx,fz,r*1.3); }
    for(let k=0;k<4;k++){ const th=Math.PI*(0.2+0.6*rnd()), rr=r*(0.35+0.2*rnd());   // 위에 잔 덩이
      coastBlob(rnd,cx+tx*Math.cos(th)*W*0.5,Math.sin(th)*H+r*0.7,cz+tz*Math.cos(th)*W*0.5,rr,rr*0.7,rr,2,tone); }
  }
  /* ── 주상절리 — 바다에 닿은 가파른 벼랑 ── */
  const S=1.05, RC=S/Math.sqrt(3)*1.02;                                 // 줄 간격 · 육각 기둥의 외접 반지름(맞닿게)
  for(let tries=0,want=Math.round(4+3*WS);tries<80000&&COAST.sites.basalt<want;tries++){
    const gx=4+((rnd()*(N-8))|0), gz=4+((rnd()*(N-8))|0), i=IDX(gx,gz), e=F.elev[i];
    if(e<1||e>30||F.slope[i]<0.55||F.river[i]) continue;
    if(!coastNear(gx,gz,2,v=>v<-0.5)) continue;
    const x0=(gx-N/2)*CELL, z0=(gz-N/2)*CELL; if(!far(x0,z0,240)||!landOK(x0,z0,20)) continue;
    const [nx,nz]=coastDir(gx,gz), tx=-nz, tz=nx, Lw=14+rnd()*16, D=5+rnd()*5, site={x:x0,z:z0,cols:[]};
    spots.push([x0,z0]); COAST.sites.basalt++;
    const st=hashStr('basalt|'+gx+'|'+gz);
    /* 벼랑 꼭대기 높이 — 뒷줄 뒤의 땅. 기둥은 비탈을 따라 박히지 않고 **곧추선 벽**을 이룬다(비탈을 따라 박으면 기둥 끝만 점처럼 튀어나와
       뭉툭한 돌기 격자로 보였다). 뒷줄은 벼랑 꼭대기까지 서고 앞줄(바다 쪽)로 갈수록 계단처럼 부러져 낮아진다 */
    const ct=Math.min(25,Math.max(3,heightAt(x0-nx*(D+3),z0-nz*(D+3))));
    for(let row=0;row*S*0.866<=D;row++){ const v=row*S*0.866, off=(row&1)*S*0.5;
      for(let u=-Lw/2+off;u<=Lw/2;u+=S){
        const x=x0+tx*u-nx*v+nx*2, z=z0+tz*u-nz*v+nz*2, g=heightAt(x,z);
        const fac=SHP.vn3(u*0.18,v*0.25,2.3,st+9)*0.5+0.5, q=Math.floor((SHP.vn3(u*0.35,v*0.35,0,st)*0.5+0.5)*4)*0.45;
        const top=Math.max(g+0.2,Math.max(0.6,ct-Math.pow(1-v/D,1.3)*(ct-0.6)*(0.35+0.65*fac))+q*0.6), bot=Math.min(g,0)-3;
        if(top-bot<1.2||top<-0.3) continue;
        site.cols.push({x,z,r:RC*0.97,b:bot,t:top,k:0.72+0.28*Math.abs(SHP.vn3(u*1.7,v*1.7,3,st))});
      } }
    for(const c of site.cols){ COAST.cols.push(c); const k=coastKey(c.x,c.z); let a=COAST.grid.get(k); if(!a) COAST.grid.set(k,a=[]); a.push(c); }
    COAST.basalt=(COAST.basalt||[]); COAST.basalt.push(site);
    cragCollide(x0-nx*D*0.5,z0-nz*D*0.5,Math.max(Lw,D)*0.55);              // 나무·덤불이 기둥 속에 서지 않게(cragNear)
  }
}
/* ── 바위섬 하나 ─────────────────────────────────────────────────────────────
   · **현무암 기둥** — 지름 2 m 육각 기둥을 벌집처럼 세운다(바다 밑 바닥 − 2 m 에서). 꼭대기는 가운데가 높고(H) 가장자리로 갈수록
     계단처럼 부러져 물가에서는 물 위 0.3~1.5 m 의 디딤돌이 된다. 둘레는 고르지 않은 원(세 겹 물결).
   · **흑요석** — 검고 번들거리는 화산 유리. 날카롭게 깨진 덩이(평면 대여섯 장으로 깎은 공)가 기둥 사이 · 꼭대기 · 물가에 박힌다.
     섬 셋에 하나는 흑요석 섬이다 — 기둥은 아랫도리만 서고 윗도리를 큰 흑요석 덩이가 덮는다.
   · **전나무 한두 그루** — 꼭대기 기둥 가운데 둘레가 고른 것 위에(소품 전나무 — 벨 수 있다 · `top` 높이에 선다).
   · 기둥은 주상절리와 같은 칸에 담겨 몸이 막히고 위에 올라선다(coastFloor · coastSolid). 흑요석 덩이도 기둥 꼴로 막는다 */
function coastIsle(I){
  const rnd=mulberry32(hashStr('isle|'+Math.round(I.x)+'|'+Math.round(I.z))), S=2.0, RC=S/Math.sqrt(3)*1.02;
  const obs=rnd()<0.34, p1=rnd()*6.283, p2=rnd()*6.283, p3=rnd()*6.283, Rf=I.R*1.15, H=Math.max(4,I.H*(obs?0.55:1));
  I.cols=[]; I.shards=[]; I.obs=obs;
  const rim=a=>Rf*(1+0.22*Math.sin(2*a+p1)+0.14*Math.sin(3*a+p2)+0.08*Math.sin(5*a+p3));
  for(let row=-Math.ceil(Rf*1.6/(S*0.866));row*S*0.866<=Rf*1.6;row++){ const v=row*S*0.866, off=(row&1)*S*0.5;
    for(let u=-Rf*1.6+off;u<=Rf*1.6;u+=S){ const x=I.x+u, z=I.z+v, a=Math.atan2(v,u), d=Math.hypot(u,v)/rim(a); if(d>1) continue;
      const g=heightAt(x,z);
      let top=H*Math.pow(Math.max(0,1-Math.pow(d,1.7)),0.9);                  // 가운데가 높고 어깨로 흘러내리는 등(탑처럼 곧추서지 않게)
      top=Math.floor(top/0.8)*0.8+(rnd()-0.5)*0.5;                            // 기둥마다 부러진 높이 — 0.8 m 계단에 잔 차이
      if(d>0.72) top=Math.min(top,0.3+rnd()*1.4+(1-d)*4);                     // 가장자리 — 물가의 디딤돌
      if(top<g+0.6) continue;
      I.cols.push({x,z,r:RC*0.97,b:Math.min(g,0)-2,t:top,k:0.70+0.30*rnd(),d}); } }
  /* 흑요석 덩이 — 흑요석 섬은 꼭대기에 크게, 아니면 기둥 사이와 물가에 몇 개 */
  const nS=obs?7+((rnd()*5)|0):2+((rnd()*3)|0);
  for(let i=0;i<nS;i++){ const a=rnd()*6.283, d=obs?Math.sqrt(rnd())*0.55:0.3+0.6*rnd(), x=I.x+Math.cos(a)*rim(a)*d, z=I.z+Math.sin(a)*rim(a)*d;
    let base=0; for(const c of I.cols) if(Math.hypot(c.x-x,c.z-z)<RC*1.6) base=Math.max(base,c.t);
    const r=obs?(1.6+rnd()*2.4)*(1-d*0.5):0.6+rnd()*1.1;
    I.shards.push({x,y:base+r*(obs?0.25:0.1),z,r,sy:obs?1.1+rnd()*0.9:0.8+rnd()*0.6,ya:rnd()*6.283,tx:(rnd()-0.5)*0.6,tz:(rnd()-0.5)*0.6,seed:(rnd()*1e9)|0,k:0.8+0.4*rnd()}); }
  /* 몸 막힘 — 기둥은 그대로, 흑요석 덩이는 그 둘레의 기둥 꼴로 */
  const add=c=>{ COAST.cols.push(c); const k=coastKey(c.x,c.z); let a=COAST.grid.get(k); if(!a) COAST.grid.set(k,a=[]); a.push(c); };
  for(const c of I.cols) add(c);
  for(const s of I.shards) add({x:s.x,z:s.z,r:s.r*0.8,b:s.y-s.r*s.sy*0.9,t:s.y+s.r*s.sy*0.7,k:1});
  /* 전나무 — 꼭대기 쪽 기둥 가운데 둘레(2.6 m 안)가 30 cm 넘게 높지 않은 것. 흑요석 덩이 위는 피한다 */
  if(H>=6){ const cand=I.cols.filter(c=>c.d<0.5&&!I.shards.some(s=>Math.hypot(s.x-c.x,s.z-c.z)<s.r+1.2)&&!I.cols.some(o=>o!==c&&Math.hypot(o.x-c.x,o.z-c.z)<2.6&&o.t>c.t+0.3));
    cand.sort((a,b)=>b.t-a.t);
    const nT=Math.min(cand.length,1+(rnd()<0.5?1:0));
    for(let i=0,put=0;i<cand.length&&put<nT;i++){ const c=cand[i]; if(PROPS.some(p=>p.isle&&Math.hypot(p.x-c.x,p.z-c.z)<5)) continue;
      PROPS.push({k:'fir',x:c.x,z:c.z,y:c.t,top:c.t-0.12,s:0.55+0.35*rnd(),r:rnd()*6.283,isle:1,_sunk:0}); put++; } }
}
let _isleMat=null, _obsMat=null;
/* 현무암 기둥의 재질 — 바위 사진 재질(rockMat)을 짙은 현무암으로 · 잔 기공 · 물가는 젖어 어둡다(20-terrain.js 'basaltcol') */
function isleMat(){ if(_isleMat) return _isleMat; const m=rockMat('basaltcol',0x5e5f62); m.vertexColors=true; m.userData.melt=0; m.userData.meltAttr=false; return _isleMat=m; }
/* 흑요석 — 검은 유리: 면이 날카롭게 각지고(면마다 법선) 볕을 받으면 하얗게 번뜩인다 · 결 따라 엷은 회색 띠 */
function obsMat(){
  if(_obsMat) return _obsMat;
  const m=new THREE.MeshPhongMaterial({color:0x0e0e12,specular:0xa8b0c0,shininess:140,vertexColors:true,flatShading:true});
  m.onBeforeCompile=sh=>{ sh.vertexShader='varying vec3 vOW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader='varying vec3 vOW;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { float bnd=sin(vOW.y*5.5+sin(vOW.x*0.9+vOW.z*0.7)*2.0); diffuseColor.rgb*=1.0+0.35*smoothstep(0.75,1.0,bnd); }`); };
  m.customProgramCacheKey=()=>'obsidian';
  return _obsMat=m;
}
/* 흑요석 덩이 — 20면체(1단계)를 평면 대여섯 장으로 깎아(평면 밖의 점을 평면 위로) 날카로운 면을 낸다 */
function obsShardGeo(s){
  const g=new THREE.IcosahedronGeometry(1,1), p=g.attributes.position, rnd=mulberry32(s.seed>>>0), cuts=[];
  for(let i=0;i<6;i++){ let x=rnd()*2-1, y=rnd()*1.4-0.5, z=rnd()*2-1; const l=Math.hypot(x,y,z)||1; cuts.push([x/l,y/l,z/l,0.55+0.3*rnd()]); }
  for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    for(const c of cuts){ const d=x*c[0]+y*c[1]+z*c[2]-c[3]; if(d>0){ x-=c[0]*d; y-=c[1]*d; z-=c[2]*d; } }
    p.setXYZ(i,x,y,z); }
  return g;
}
/* 기둥 메시 — 자리마다 하나로 합친다(육각 옆면 + 윗면 · 면마다 제 법선 · 기둥마다 밝기) */
function coastBuild(){
  for(const m of COAST.meshes){ scene.remove(m); m.geometry.dispose(); } COAST.meshes.length=0;
  for(const I of (COAST.isles||[])) coastIsleBuild(I);
  if(!COAST.basalt) return;
  for(const site of COAST.basalt){
    if(!site.cols.length) continue;
    const P=[], Nn=[], C=[], M=[];
    const quad=(a,b,c,d,n,col)=>{ for(const v of [a,b,c,a,c,d]){ P.push(v[0],v[1],v[2]); Nn.push(n[0],n[1],n[2]); C.push(col,col*1.0,col*1.02); M.push(0.35); } };
    for(const c of site.cols){
      const ring=[]; for(let k=0;k<6;k++){ const a=k/6*6.2832+0.5236; ring.push([c.x+Math.cos(a)*c.r,c.z+Math.sin(a)*c.r]); }
      const col=0.62*c.k;                                                 // 짙은 잿빛 현무암(검게 칠하면 그늘에서 덩어리로 뭉개졌다)
      for(let k=0;k<6;k++){ const p=ring[k], q=ring[(k+1)%6], am=(k+0.5)/6*6.2832+0.5236, n=[Math.cos(am),0,Math.sin(am)];
        const fk=0.84+0.16*(((k*7+Math.floor(c.x*3.1+c.z*1.7))%3+3)%3)/2;    // 면마다 한 톤씩 달라 기둥의 모서리가 읽힌다
        quad([p[0],c.b,p[1]],[q[0],c.b,q[1]],[q[0],c.t,q[1]],[p[0],c.t,p[1]],n,col*fk); }
      const tc=col*1.18;                                                  // 윗면은 조금 밝다(볕 · 바랜 결)
      for(let k=0;k<6;k++){ const p=ring[k], q=ring[(k+1)%6];
        for(const v of [[c.x,c.t,c.z],[q[0],c.t,q[1]],[p[0],c.t,p[1]]]){ P.push(v[0],v[1],v[2]); Nn.push(0,1,0); C.push(tc,tc,tc*1.02); M.push(0.35); } }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setAttribute('aMelt',new THREE.Float32BufferAttribute(M,1));
    g.computeBoundingSphere();
    const m=new THREE.Mesh(g,cragMat()); m.castShadow=m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); COAST.meshes.push(m);
  }
}
/* 바위섬 그리기 — 현무암 기둥(육각 옆면 + 윗면의 가장자리를 살짝 깎은 모 · 면마다 한 톤) · 흑요석 덩이(합쳐 한 메시) */
function coastIsleBuild(I){
  if(I.cols&&I.cols.length){
    const P=[], Nn=[], C=[], M=[];
    const tri=(a,b,c,n,col)=>{ for(const v of [a,b,c]){ P.push(v[0],v[1],v[2]); Nn.push(n[0],n[1],n[2]); C.push(col,col,col*1.03); M.push(0); } };
    for(const c of I.cols){
      const ring=[], inner=[], ch=0.12;                                    // 윗면 모서리 — 12 cm 깎아 둥근 모(빛이 모서리를 잡는다)
      for(let k=0;k<6;k++){ const a=k/6*6.2832+0.5236+(c.k-0.85)*0.3; ring.push([c.x+Math.cos(a)*c.r,c.z+Math.sin(a)*c.r]); inner.push([c.x+Math.cos(a)*(c.r-ch),c.z+Math.sin(a)*(c.r-ch)]); }
      const col=0.72*c.k*I.tone;                                           // 짙은 잿빛(그늘 쪽이 새까맣게 뭉개지지 않게)
      for(let k=0;k<6;k++){ const p=ring[k], q=ring[(k+1)%6], am=(k+0.5)/6*6.2832+0.5236+(c.k-0.85)*0.3, n=[Math.cos(am),0,Math.sin(am)];
        const fk=0.80+0.20*(((k*5+Math.floor(c.x*2.3+c.z*1.3))%3+3)%3)/2;
        tri([p[0],c.b,p[1]],[q[0],c.b,q[1]],[q[0],c.t-ch,q[1]],n,col*fk); tri([p[0],c.b,p[1]],[q[0],c.t-ch,q[1]],[p[0],c.t-ch,p[1]],n,col*fk);
        const pi=inner[k], qi=inner[(k+1)%6], nb=[n[0]*0.7,0.71,n[2]*0.7];  // 깎은 모
        tri([p[0],c.t-ch,p[1]],[q[0],c.t-ch,q[1]],[qi[0],c.t,qi[1]],nb,col*1.08); tri([p[0],c.t-ch,p[1]],[qi[0],c.t,qi[1]],[pi[0],c.t,pi[1]],nb,col*1.08);
        tri([c.x,c.t,c.z],[qi[0],c.t,qi[1]],[pi[0],c.t,pi[1]],[0,1,0],col*1.15); } }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(C,3)); g.setAttribute('aMelt',new THREE.Float32BufferAttribute(M,1)); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,isleMat()); m.castShadow=m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); COAST.meshes.push(m);
  }
  if(I.shards&&I.shards.length){
    const parts=[], M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), E=new THREE.Euler(), V=new THREE.Vector3(), Sc=new THREE.Vector3();
    for(const s of I.shards){ const gg=obsShardGeo(s).toNonIndexed(); E.set(s.tx,s.ya,s.tz); Q.setFromEuler(E); V.set(s.x,s.y,s.z); Sc.set(s.r,s.r*s.sy,s.r*0.85); M4.compose(V,Q,Sc); gg.applyMatrix4(M4);
      const n=gg.attributes.position.count, cc=new Float32Array(n*3).fill(s.k); gg.setAttribute('color',new THREE.BufferAttribute(cc,3)); gg.deleteAttribute('uv'); gg.deleteAttribute('normal'); parts.push(gg); }
    let n=0; for(const q of parts) n+=q.attributes.position.count;
    const pos=new Float32Array(n*3), col=new Float32Array(n*3); let o=0;
    for(const q of parts){ pos.set(q.attributes.position.array,o*3); col.set(q.attributes.color.array,o*3); o+=q.attributes.position.count; q.dispose(); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.computeVertexNormals(); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,obsMat()); m.castShadow=m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); COAST.meshes.push(m);
  }
}
/* 기둥 위 — 밑이 (땅 또는 발)에서 1.9 m 안인 기둥은 그 꼭대기가 바닥이다(벼랑 바위와 같은 규칙 · 높으면 벽 — 80-player.js walkable) */
function coastFloor(x,z,fromY,t){
  if(!COAST.cols.length) return t;
  const a=COAST.grid.get(coastKey(x,z)); if(!a) return t;
  const ref=fromY===undefined?-1e9:fromY;
  for(const c of a){ const dx=x-c.x, dz=z-c.z; if(dx*dx+dz*dz>c.r*c.r) continue; if(c.t>t&&c.b<=Math.max(t,ref)+1.9) t=c.t; }
  return t;
}
/* 그 점이 기둥 속인가(눈의 경계 · 벼랑 매달리기가 본다) */
function coastSolid(x,z,y0,y1){
  if(!COAST.cols.length) return false;
  const a=COAST.grid.get(coastKey(x,z)); if(!a) return false;
  if(y1===undefined) y1=y0;
  for(const c of a){ const dx=x-c.x, dz=z-c.z; if(dx*dx+dz*dz<=c.r*c.r&&c.b<y1&&c.t>y0) return true; }
  return false;
}
