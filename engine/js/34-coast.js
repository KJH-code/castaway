/* 34-coast.js — CASTAWAY
   바닷가 지형 — 시스택(바다에 선 바위섬) · 해식 아치 · 주상절리(지형 판 5)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   바닷가 지형(사용자 요청 — 바닷가와 바다를 훨씬 다양하게)
   ----------------------------------------------------------------------------
   · **시스택(작은 바위섬)** — 물가에서 30~90 m 떨어진 얕은 바다(수심 1.5~10 m)에 바위 기둥이 한둘~셋 선다. 바다 밑에서 물 위
     8~26 m 까지 덩이를 쌓아 올리고(위로 갈수록 가늘다) 잔 덩이가 돋는다.
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
  COAST.meshes.length=0; COAST.cols.length=0; COAST.grid.clear(); COAST.sites={stack:0,arch:0,basalt:0};
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
  /* ── 시스택 ── */
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
      for(let k=0;k<nb;k++){ const f=k/(nb-1), y=fl+(H-fl)*f, r=R*(1-0.30*f)*(0.88+0.24*rnd());
        coastBlob(rnd,x+(rnd()-0.5)*r*0.3,y,z+(rnd()-0.5)*r*0.3,r*(0.9+0.3*rnd()),r*(k===nb-1?0.55:0.72),r*(0.9+0.3*rnd()),k===nb-1?1:0,tone); }
      for(let k=0,nk=2+((rnd()*3)|0);k<nk;k++){ const a=rnd()*6.283, y=fl+(H-fl)*(0.3+0.65*rnd()), r=R*(0.30+0.25*rnd());
        coastBlob(rnd,x+Math.cos(a)*R*0.8,y,z+Math.sin(a)*R*0.8,r,r*0.8,r,2,tone); }
      cragCollide(x,z,R*0.9);
    }
  }
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
/* 기둥 메시 — 자리마다 하나로 합친다(육각 옆면 + 윗면 · 면마다 제 법선 · 기둥마다 밝기) */
function coastBuild(){
  for(const m of COAST.meshes){ scene.remove(m); m.geometry.dispose(); } COAST.meshes.length=0;
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
