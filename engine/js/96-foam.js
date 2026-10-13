/* 96-foam.js — CASTAWAY
   물가의 거품 — 파도가 밀려와 부서지는 자리에 서는 **사면체 조각들**. 사람 둘레에만 깐다
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   물가의 거품
   ----------------------------------------------------------------------------
   예전 거품은 땅과 물 셰이더가 칠하는 납작한 무늬뿐이었다(사용자 요청: 부서지는 파도의 거품을 사면체 메시로, 사람 가까이에만).
   이제 물가를 따라 작은 흰 사면체들이 선다. 파도 한 번마다:
     ① 물가 바깥의 얕은 물에서 부서지는 물결이 조각으로 일어 뭍 쪽으로 밀려오고
     ② 물머리를 타고 구르며 올라오는 동안 튀어 오르고(가파른 물가일수록 높이)
     ③ 물이 빠지면 젖은 모래에 남아 옆으로 흩어지며 작아진다(부서진다). 조각 하나하나도 맺혔다 꺼지기를 되풀이한다.
   조각은 **진짜 수면**을 따른다 — 물 셰이더가 바닷물 판을 오르내리게 하는 긴 파도 셋(`wv(0~2)`)을 같은 식·같은 시계(`uShT`)로 풀어
   물머리가 지금 어디까지 올라왔는지 센다. 물 셰이더의 파도 수를 바꾸면 여기 셰이더의 수도 같이 바꿀 것.

   **무엇을 어느 말로 하나 — 빨라지는 것만**(사용자 요청). 잰 값은 `foamBench()` 가 낸다(아래 표는 Apple M1 · 2배 섬의 모래 해변):
     · 조각의 움직임(자리 · 구르기 · 크기)은 **GLSL(정점 셰이더)** — 조각마다 '물가의 한 점 · 뭍 쪽 방향 · 비탈 · 씨앗' 만 적어 두면
       GPU 가 시간으로 푼다. 자바스크립트로 프레임마다 행렬을 다시 짜 올리는 것(조각 수천 개 × 60번/초)이 통째로 없다 — CPU 0 ms.
     · 물가 찾기(사람 둘레 55 m 의 격자를 훑어 물가의 점을 뽑는 일 — 8 m 걸을 때마다 한 번)는 **C(WebAssembly)** 와
       **자바스크립트** 두 판을 다 짜서 견줬다. 빠른 쪽을 쓴다(`FOAM.useC`) — 결과는 README 가 아니라 `foamBench()` 로 다시 잴 것.
     · 그 밖(조각에 씨앗 나눠 주기 · 버퍼에 담기)은 자바스크립트 — 한 번에 0.1 ms 안쪽이라 옮겨서 얻을 것이 없다.
   ========================================================================== */
const FOAM={mesh:null, geo:null, cap:8800, K:16, KS:6, KB:3, R:55, step:0.75, level:0.03, cx:1e9, cz:1e9, n:0, anchors:0,
            useC:true, synced:false, ST:9, out:new Float32Array(2048*9),
            U:{uFT:{value:0}, uFP:WATER_U.uFP, uFR:WATER_U.uFR}};   // uFP·uFR 은 물 셰이더와 같이 쓴다 — 조각이 서는 데서는 칠한 거품이 옅어진다

/* 조각 하나 = **사면체 뭉치**(사용자 요청 — 안에서 도는 사면체 뭉치 + 텍스처). 작은 사면체 넷을 반지름 0.55 안에 모아 두고,
   뭉치가 통째로 구르는 동안 사면체 하나하나도 제 가운데를 축으로 따로 돈다(aSub — 제 가운데 xyz · 박자). */
function foamCluster(){
  /* **프랙탈 뭉치**(사용자 요청 — 다각형에 다각형을 붙여서): 가운데 사면체의 네 면마다 반 크기 사면체를 붙이고, 그 바깥 세 면 중
     두 면에 또 반 크기를 붙인다(1 + 4 + 8 = 13). 사면체마다 aSub(제 가운데 · 박자)와 aLv(몇 대인가)를 달아, 셰이더가
     **뭉치 가운데를 축으로 공전시키며(바깥 대일수록 빠르게) 제자리에서도 돌린다** — 뭉친 속이 휘저어지며 섞인다 */
  const P=[], Nn=[], S=[], L=[], rnd=mulberry32(0xf0a3);
  const T0=new THREE.TetrahedronGeometry(1,0), T=T0.index?T0.toNonIndexed():T0, tp=T.attributes.position.array;
  const faces=[]; for(let f=0;f<tp.length/9;f++){ const a=[tp[f*9],tp[f*9+1],tp[f*9+2]], b=[tp[f*9+3],tp[f*9+4],tp[f*9+5]], c=[tp[f*9+6],tp[f*9+7],tp[f*9+8]];
    const m=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3], l=Math.hypot(m[0],m[1],m[2]); faces.push([m[0]/l,m[1]/l,m[2]/l,l]); }
  const put=(cx,cy,cz,r,lv)=>{ const ph=rnd()*6.283, q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd()*6.28,rnd()*6.28,rnd()*6.28)), v=new THREE.Vector3();
    for(let i=0;i<tp.length;i+=9){ const vs=[0,3,6].map(o=>v.set(tp[i+o],tp[i+o+1],tp[i+o+2]).applyQuaternion(q).multiplyScalar(r).toArray());
      const e1=[vs[1][0]-vs[0][0],vs[1][1]-vs[0][1],vs[1][2]-vs[0][2]], e2=[vs[2][0]-vs[0][0],vs[2][1]-vs[0][1],vs[2][2]-vs[0][2]];
      let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]]; const nl=Math.hypot(...n)||1; n=n.map(x=>x/nl);
      for(const p of vs){ P.push(p[0]+cx,p[1]+cy,p[2]+cz); Nn.push(...n); S.push(cx,cy,cz,ph); L.push(lv); } } };
  const R0=0.42; put(0,0,0,R0,0);
  for(const f of faces){ const r1=R0*0.5, d1=R0*f[3]+r1*0.75, c1=[f[0]*d1,f[1]*d1,f[2]*d1]; put(c1[0],c1[1],c1[2],r1,1);
    /* 손주 둘 — 자식 바깥쪽으로 비스듬히 */
    for(let k=0;k<2;k++){ const a=rnd()*6.283, t=[f[1]*Math.cos(a)-f[2]*Math.sin(a), f[2]*Math.cos(a)+f[0]*Math.sin(a), f[0]*Math.cos(a)-f[1]*Math.sin(a)];
      const dir=[f[0]+t[0]*0.8,f[1]+t[1]*0.8,f[2]+t[2]*0.8], dl=Math.hypot(...dir), r2=r1*0.5, d2=r1*0.6+r2*0.8;
      put(c1[0]+dir[0]/dl*d2,c1[1]+dir[1]/dl*d2,c1[2]+dir[2]/dl*d2,r2,2); } }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));
  g.setAttribute('aSub',new THREE.Float32BufferAttribute(S,4)); g.setAttribute('aLv',new THREE.Float32BufferAttribute(L,1));
  return g;
}
/* 거품 판의 무늬 — 크고 작은 거품 고리가 엉긴 레이스(캔버스 · 바깥으로 갈수록 옅다) */
function foamLaceTex(){
  const W=256, c=document.createElement('canvas'); c.width=c.height=W; const g=c.getContext('2d'), rnd=mulberry32(0x1ace);
  g.clearRect(0,0,W,W);
  for(let i=0;i<260;i++){ const a=rnd()*6.283, r=Math.sqrt(rnd())*W*0.46, x=W/2+Math.cos(a)*r, y=W/2+Math.sin(a)*r, br=2+rnd()*rnd()*16;
    g.strokeStyle='rgba(255,255,255,'+(0.35+rnd()*0.55)+')'; g.lineWidth=1+rnd()*2.6; g.beginPath(); g.arc(x,y,br,0,6.283); g.stroke();
    if(rnd()<0.35){ g.fillStyle='rgba(255,255,255,'+(0.25+rnd()*0.4)+')'; g.beginPath(); g.arc(x,y,br*0.5,0,6.283); g.fill(); } }
  g.globalCompositeOperation='destination-in';                       // 가장자리를 녹인다
  const gr=g.createRadialGradient(W/2,W/2,W*0.12,W/2,W/2,W*0.5); gr.addColorStop(0,'rgba(0,0,0,1)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr; g.fillRect(0,0,W,W);
  const t=new THREE.CanvasTexture(c); t.anisotropy=4; return t;
}
function foamInit(){
  const base=foamCluster(), g=new THREE.InstancedBufferGeometry();
  g.setAttribute('position',base.attributes.position); g.setAttribute('normal',base.attributes.normal); g.setAttribute('aSub',base.attributes.aSub); g.setAttribute('aLv',base.attributes.aLv);
  /* 조각마다 — aA 물가의 점(x·z)과 뭍 쪽 방향(nx·nz) · aB 1/비탈 · 물가를 따라 비낀 거리 · 물머리보다 처지는 거리 · 크기
                 aC 씨앗 · 버티는 몫(물이 빠질 때 얼마나 오래 남나) · 구르는 빠르기 · 튀는 높이 */
  FOAM.aA=new THREE.InstancedBufferAttribute(new Float32Array(FOAM.cap*4),4);
  FOAM.aB=new THREE.InstancedBufferAttribute(new Float32Array(FOAM.cap*4),4);
  FOAM.aC=new THREE.InstancedBufferAttribute(new Float32Array(FOAM.cap*4),4);
  /* aD — 물가의 생김새: 바다 쪽으로 바닥이 0.30 m 내려가는 거리 · 뭍 쪽으로 땅이 0.15 · 0.35 · 0.60 m 올라가는 거리(물가 찾기가 잰다).
     비탈 하나로 곧게 어림하면 완만한 모래톱에서 물머리가 몇 m 씩 빗나갔다(위쪽 둔덕이 더 가파르다) */
  FOAM.aD=new THREE.InstancedBufferAttribute(new Float32Array(FOAM.cap*4),4);
  g.setAttribute('aA',FOAM.aA); g.setAttribute('aB',FOAM.aB); g.setAttribute('aC',FOAM.aC); g.setAttribute('aD',FOAM.aD);
  g.instanceCount=0;
  const mk=(m,sheet)=>{ m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,FOAM.U);
    sh.vertexShader=(sheet?'#define FOAM_SHEET\n':'attribute vec4 aSub;\nattribute float aLv;\n')+'attribute vec4 aA;\nattribute vec4 aB;\nattribute vec4 aC;\nattribute vec4 aD;\nuniform float uFT;\nuniform vec3 uFP;\nuniform float uFR;\n'
      +sh.vertexShader.replace('#include <begin_vertex>',`
      /* **진짜 수면을 따른다** — 바닷물 판은 긴 파도 셋으로 오르내린다(20-terrain.js 물 셰이더의 wv(0~2)와 같은 수 · 같은 시계).
         물가의 그 점에서 수면 높이(fsurf)와 오르내리는 빠르기(fdv)를 풀면, 물머리가 뭍으로 얼마나 올라왔나는 (수면 − 물가 높이) ÷ 비탈이다 */
      float fsurf=0.0, fdv=0.0;
      { float a0=0.10134*dot(vec2(0.9394,0.3429),aA.xy)-0.9971*uFT; fsurf+=0.30*sin(a0); fdv-=0.30*0.9971*cos(a0);
        float a1=0.16982*dot(vec2(0.8525,-0.5227),aA.xy)-1.2907*uFT; fsurf+=0.20*sin(a1); fdv-=0.20*1.2907*cos(a1);
        float a2=0.29920*dot(vec2(0.3624,0.9320),aA.xy)-1.7132*uFT; fsurf+=0.10*sin(a2); fdv-=0.10*1.7132*cos(a2); }
      float frise=clamp(fdv*2.2,-1.0,1.0);                   // +1 밀려온다 · −1 빠진다
      float fup=max(frise,0.0), fdn=max(-frise,0.0);
      /* 물머리의 자리(물가의 점에서 뭍 쪽으로 몇 m)와 그 자리의 비탈 — 물가의 생김새(aD)를 따라 꺾은선으로 푼다 */
      float fh=fsurf-0.03, fdF, fsl;
      if(fh<=0.0){ fdF=-min(aD.x*min(-fh/0.30,2.2),24.0); fsl=0.30/max(aD.x,0.05); }
      else if(fh<0.15){ fdF=aD.y*fh/0.15; fsl=0.15/max(aD.y,0.05); }
      else if(fh<0.35){ fdF=mix(aD.y,aD.z,(fh-0.15)/0.20); fsl=0.20/max(aD.z-aD.y,0.05); }
      else{ fdF=mix(aD.z,aD.w,min((fh-0.35)/0.25,1.3)); fsl=0.25/max(aD.w-aD.z,0.05); }
      float fd, fy, fs, flat_=aB.y, fflat=1.0;
      float fpop=fract(uFT*(0.35+0.5*aC.y)+aC.x*7.0);        // 조각 하나하나가 맺혔다 꺼지는 박자(거품이 터진다)
      if(aB.z>=50.0){
        /* 물가의 띠 — 물과 뭍이 만나는 금을 **늘** 덮는다(사용자 요청: 물과 땅의 경계가 거품으로 가려지게). 물머리에 붙어 같이
           오르내리고, 납작하게 누워 조금씩 숨 쉬듯 커졌다 작아진다. 터지지 않는다 */
        fd=fdF+(aB.z-100.0);
        float fgy=fsurf+max(fd-fdF,0.0)*fsl;                 // 물머리보다 뭍 쪽이면 그만큼 땅이 높다
        fy=fgy+aB.w*0.16;
        fs=aB.w*(0.82+0.18*sin(uFT*(1.3+aC.y)+aC.x*40.0));
        fflat=0.55;
      }else if(aB.z>=0.0){
        /* 물머리의 거품 — 밀려올 땐 물머리 바로 뒤를 타고 구르며 튀고, 빠질 땐 젖은 모래에 남아 옆으로 흩어지며 작아진다 */
        fd=fdF-aB.z*frise;
        float fgy=fsurf+max(fd-fdF,0.0)*fsl;                 // 그 자리의 땅 높이(물머리보다 뭍 쪽이면 그만큼 높다)
        fy=fgy+aB.w*0.28+aC.w*fup*fup*(0.5+0.5*sin(uFT*5.0+aC.x*30.0));
        fs=aB.w*(0.55+0.45*fup)*(1.0-0.5*fdn*aC.y)*pow(sin(3.14159*fpop),0.5);
        flat_+=(aC.x-0.5)*1.4*fdn;
      }else{
        /* 부서지는 물결 — 물가 바깥(얕은 물)에서 뭍 쪽으로 밀려오며 커졌다가 물가에 닿아 스러진다 */
        float fL=min(aD.x*1.6+1.0,8.0), fu=fract(uFT*0.10*(1.0+aC.y)+aC.x*3.0);
        fd=fdF-fL*(1.0-fu)-0.2;
        fy=fsurf+aB.w*0.30+0.10*sin(3.14159*fu);
        fs=aB.w*pow(sin(3.14159*fu),0.7)*(0.55+0.45*fup);
      }
      fs*=1.0-smoothstep(uFR-12.0,uFR,distance(aA.xy,uFP.xz));                                       // 사람에게서 멀면 없다
      vec3 fpos=vec3(aA.x+aA.z*fd-aA.w*flat_, fy, aA.y+aA.w*fd+aA.z*flat_);
      /* 구르기 — 조각마다 다른 축으로 돈다(로드리게스 회전) */
      vec3 fax=normalize(vec3(sin(aC.x*91.7),cos(aC.x*37.3),sin(aC.x*53.1)));
      float fan=uFT*aC.z+aC.x*40.0, fc=cos(fan), fsn=sin(fan);
      #ifdef FOAM_SHEET
        /* 거품 판 — 조각 밑의 수면·젖은 모래에 누운 레이스. 조각보다 넓고 천천히 돈다 · 물에 반쯤 잠긴 높이 */
        float fya=aC.x*40.0+uFT*0.15*(aC.x-0.5); vec2 fq=vec2(position.x*cos(fya)-position.z*sin(fya),position.x*sin(fya)+position.z*cos(fya))*fs*4.5;
        vec3 transformed=vec3(fpos.x+fq.x, fy-aB.w*0.22+0.02, fpos.z+fq.y);
      #else
        /* 뭉치 속 사면체 하나하나가 ① 뭉치 가운데를 축으로 공전하고(바깥 대일수록 빠르게 · 위아래로 출렁) ② 제 가운데를 축으로 돈다 —
           속이 휘저어지며 섞인다 */
        vec3 fsc=aSub.xyz, flp=position-fsc;
        { vec3 oax=normalize(vec3(sin(aC.x*17.0+aLv),1.2,cos(aC.x*23.0-aLv)));
          float oan=uFT*(0.7+0.9*aLv)*(aC.x<0.5?-1.0:1.0)+aSub.w, oc=cos(oan), os=sin(oan);
          fsc=fsc*oc+cross(oax,fsc)*os+oax*dot(oax,fsc)*(1.0-oc);
          fsc*=1.0+0.18*aLv*sin(uFT*2.1+aSub.w*3.0); }
        vec3 fax2=normalize(vec3(sin(aSub.w*3.1+aC.x*11.0),0.6,cos(aSub.w*2.3)));
        float fan2=uFT*(2.2+aSub.w)+aSub.w*5.0, fc2=cos(fan2), fs2=sin(fan2);
        flp=flp*fc2+cross(fax2,flp)*fs2+fax2*dot(fax2,flp)*(1.0-fc2);
        vec3 fv=(fsc+flp)*fs;
        vec3 frot=fv*fc+cross(fax,fv)*fsn+fax*dot(fax,fv)*(1.0-fc); frot.y*=fflat;
        vec3 transformed=frot+fpos;
      #endif`);
  };
  m.customProgramCacheKey=()=>sheet?'shorefoamsheet':'shorefoam'; return m; };
  const m=mk(new THREE.MeshPhongMaterial({color:0xf3f7f5, emissive:0x1a1e20, specular:0x222222, shininess:12, flatShading:true}),false);
  const mesh=new THREE.Mesh(g,m);
  /* 거품 판 — 같은 조각 자료(aA~aD)를 나눠 쓰는 둘째 메시(판 하나 = 세모 둘) */
  const pg=new THREE.InstancedBufferGeometry(), pl=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  pg.setAttribute('position',pl.attributes.position); pg.setAttribute('normal',pl.attributes.normal); pg.setAttribute('uv',pl.attributes.uv); pg.setIndex(pl.index);
  pg.setAttribute('aA',FOAM.aA); pg.setAttribute('aB',FOAM.aB); pg.setAttribute('aC',FOAM.aC); pg.setAttribute('aD',FOAM.aD); pg.instanceCount=0;
  const sm=mk(new THREE.MeshLambertMaterial({map:foamLaceTex(), transparent:true, depthWrite:false, opacity:0.9, emissive:0x161a1c}),true);
  const sheet=new THREE.Mesh(pg,sm); sheet.frustumCulled=false; sheet.userData.lightRole='recv'; sheet.renderOrder=4;
  sheet.matrixAutoUpdate=false; sheet.updateMatrix(); scene.add(sheet); FOAM.sheet=sheet; FOAM.pgeo=pg;
  mesh.frustumCulled=false; mesh.userData.lightRole='recv';   // 자리는 셰이더가 정한다 — 경계구로 거를 수 없다 · 그림자는 받기만
  mesh.matrixAutoUpdate=false; mesh.updateMatrix(); scene.add(mesh);
  FOAM.mesh=mesh; FOAM.geo=g;
}

/* (qx,qz)에서 (dx,dz) 쪽으로 걸어 땅이 level+rise 에 처음 닿는 거리 — rise>0 은 뭍으로 올라가며, <0 은 바다로 내려가며 */
function foamReach(qx,qz,dx,dz,level,rise,maxD){
  const st=0.5; let prev=heightAt(qx,qz)-level;
  for(let t=st;t<=maxD;t+=st){ const cur=heightAt(qx+dx*t,qz+dz*t)-level;
    if(rise>0?cur>=rise:cur<=rise){ let k=(rise-prev)/(cur-prev); if(!(k>=0)) k=0; else if(k>1) k=1; return t-st+st*k; }
    prev=cur; }
  /* maxD 안에 못 닿았다(아주 완만한 물가) — 거기까지의 비탈을 그대로 늘인다(3배까지) */
  if(rise>0?prev>0.02:prev<-0.02) return Math.min(maxD*rise/prev,3*maxD);
  return 3*maxD;
}
/* ── 물가 찾기 — 자바스크립트 판(C 판 `engine/native/shore.c` 와 같은 차례로 센다). 찾은 수를 돌려주고 out 에 5개씩 담는다 ── */
function foamScanJS(px,pz,R,step,level,out,maxOut){
  const h=F.elev, inv=1/CELL, e=0.6, half=N/2, cell=CELL;
  const x0=Math.max(1,Math.floor((px-R)*inv+half)), x1=Math.min(N-3,Math.floor((px+R)*inv+half)+1),
        z0=Math.max(1,Math.floor((pz-R)*inv+half)), z1=Math.min(N-3,Math.floor((pz+R)*inv+half)+1);
  const M=Math.max(1,Math.ceil(cell/step-0.001)), riv=F.river;
  let n=0, o=0;
  for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){
    const i=z*N+x, a=h[i];
    for(let dir=0;dir<2;dir++){
      const j=dir?i+N:i+1, b=h[j];
      if((a>level)===(b>level)) continue;
      if(riv[i]|riv[j]) continue;
      const t=(level-a)/(b-a), wx=((dir?x:x+t)-half)*cell, wz=((dir?z+t:z)-half)*cell;
      const gx=(heightAt(wx+e,wz)-heightAt(wx-e,wz))/(2*e), gz=(heightAt(wx,wz+e)-heightAt(wx,wz-e))/(2*e);
      const sl=Math.sqrt(gx*gx+gz*gz); if(sl<0.015) continue;
      const nx=gx/sl, nz=gz/sl;
      for(let m=0;m<M;m++){
        const off=((m+0.5)/M-0.5)*cell; let qx=wx-nz*off, qz=wz+nx*off;
        for(let it=0;it<2;it++){ let d=(level-heightAt(qx,qz))/sl; if(d>cell) d=cell; else if(d<-cell) d=-cell; qx+=nx*d; qz+=nz*d; }
        const dx=qx-px, dz=qz-pz; if(dx*dx+dz*dz>R*R) continue;
        const g2x=(heightAt(qx+e,qz)-heightAt(qx-e,qz))/(2*e), g2z=(heightAt(qx,qz+e)-heightAt(qx,qz-e))/(2*e);
        const s2=Math.sqrt(g2x*g2x+g2z*g2z); if(s2<0.015) continue;
        const ux=g2x/s2, uz=g2z/s2;
        out[o]=qx; out[o+1]=qz; out[o+2]=ux; out[o+3]=uz; out[o+4]=Math.min(1/s2,14);
        out[o+5]=foamReach(qx,qz,-ux,-uz,level,-0.30,10); out[o+6]=foamReach(qx,qz,ux,uz,level,0.15,14);
        out[o+7]=Math.max(foamReach(qx,qz,ux,uz,level,0.35,14),out[o+6]+0.05); out[o+8]=Math.max(foamReach(qx,qz,ux,uz,level,0.60,14),out[o+7]+0.05);
        o+=9;
        if(++n>=maxOut) return n;
      }
    }
  }
  return n;
}
/* C 판을 쓰려면 표고와 하천 표를 C 쪽 메모리에 비춰 둬야 한다 — 섬마다 한 번(땅은 놀이 중에 안 바뀐다) */
function foamSync(){
  FOAM.synced=false;
  if(!NATIVE.ok||!NATIVE.x.cw_shore||N>768) return;
  const X=NATIVE.x;
  new Float32Array(X.memory.buffer,X.cw_elev(),N*N).set(F.elev);
  new Uint8Array(X.memory.buffer,X.cw_river(),N*N).set(F.river);
  FOAM.synced=true;
}
function foamScanC(px,pz,R,step,level,out,maxOut){
  const X=NATIVE.x, n=X.cw_shore(N,CELL,px,pz,R,step,level,maxOut);
  out.set(new Float32Array(X.memory.buffer,X.cw_shore_out(),n*FOAM.ST));
  return n;
}
/* 사람 둘레의 물가에 조각을 깐다 — 8 m 넘게 움직였을 때만 */
function foamScatter(){
  const U=FOAM, px=PL.pos.x, pz=PL.pos.z; U.cx=px; U.cz=pz;
  const max=Math.floor(U.cap/U.K);
  const n=(U.useC&&U.synced)?foamScanC(px,pz,U.R,U.step,U.level,U.out,max):foamScanJS(px,pz,U.R,U.step,U.level,U.out,max);
  const A=U.aA.array, Bq=U.aB.array, C=U.aC.array, D=U.aD.array, o=U.out, ST=U.ST; let k=0;
  for(let i=0;i<n;i++){
    const x=o[i*ST], z=o[i*ST+1], nx=o[i*ST+2], nz=o[i*ST+3], is=o[i*ST+4], steep=clamp(1.6/is,0,1);
    const d0=o[i*ST+5], d1=o[i*ST+6], d2=o[i*ST+7], d3=o[i*ST+8];
    let h=(Math.imul(Math.round(x*4),374761393)+Math.imul(Math.round(z*4),668265263))|0;
    for(let c=0;c<U.K;c++){
      h=Math.imul(h^(h>>>13),1274126177); h=(h^(h>>>16))|0;
      const r1=(h&1023)/1023, r2=((h>>>10)&1023)/1023, r3=((h>>>20)&1023)/1023;
      const j=k*4;
      A[j]=x; A[j+1]=z; A[j+2]=nx; A[j+3]=nz;
      D[j]=d0; D[j+1]=d1; D[j+2]=d2; D[j+3]=d3;
      /* 열여섯 가운데 — 여섯은 물머리의 거품 · 셋은 물가 바깥에서 부서지며 밀려오는 물결 · 일곱은 물가의 금을 늘 덮는 띠(조각 하나가 프랙탈 뭉치라 예전 스물둘보다 적게) */
      const breaker=c>=U.KS&&c<U.KS+U.KB, rim=c>=U.KS+U.KB;
      if(rim){
        const q=(c-U.KS-U.KB+r1)/(U.K-U.KS-U.KB);          // 물가를 따라 고르게 벌려 놓는다(빈틈이 없게)
        Bq[j]=is; Bq[j+1]=(q-0.5)*U.step*1.15; Bq[j+2]=100+(r2-0.42)*(0.5+0.05*is);   // 물머리 앞뒤 한 뼘 — 완만한 데는 조금 더 넓게
        Bq[j+3]=0.11+0.10*r3;
      }else{
        Bq[j]=is; Bq[j+1]=(r1-0.5)*U.step*1.7; Bq[j+2]=breaker?-1:r2*r2*(0.4+0.12*is);   // 완만한 물가는 물머리 뒤로 길게 늘어선다
        Bq[j+3]=(breaker?0.08:0.05)+0.17*r3*r3+0.07*steep;                     // 크기(m) — 잔 조각이 많고 굵은 것은 드물다 · 가파른 데는 굵다
      }
      C[j]=r1*0.61+r3*0.39; C[j+1]=0.35+0.65*r2; C[j+2]=(2.5+5*r3)*(r1<0.5?-1:1); C[j+3]=(0.10+0.35*r1)*(0.6+2.4*steep);   // 가파른 데는 높이 튄다
      k++;
    }
  }
  U.aA.needsUpdate=U.aB.needsUpdate=U.aC.needsUpdate=U.aD.needsUpdate=true;
  U.geo.instanceCount=k; if(U.pgeo) U.pgeo.instanceCount=k; U.n=k; U.anchors=n;
}
function updateFoam(){
  if(!scene) return;
  if(!FOAM.mesh) foamInit();
  const dx=PL.pos.x-FOAM.cx, dz=PL.pos.z-FOAM.cz;
  if(dx*dx+dz*dz>64) foamScatter();
  FOAM.U.uFT.value=TERR_U.uShT?TERR_U.uShT.value:0;           // 젖은 띠·칠한 거품과 같은 시계
  FOAM.U.uFP.value.copy(PL.pos); FOAM.U.uFR.value=FOAM.R;
  FOAM.mesh.visible=FOAM.n>0; if(FOAM.sheet) FOAM.sheet.visible=FOAM.n>0;
}
function foamReset(){ FOAM.cx=FOAM.cz=1e9; FOAM.n=0; if(FOAM.geo) FOAM.geo.instanceCount=0; if(FOAM.pgeo) FOAM.pgeo.instanceCount=0; foamSync(); }
/* 물가 찾기를 두 말로 견준다 — 같은 자리에서 reps 번씩 돌려 한 번에 걸리는 시간(ms)과 찾은 수를 낸다 */
function foamBench(reps){
  reps=reps||300; const px=PL.pos.x, pz=PL.pos.z, U=FOAM, max=Math.floor(U.cap/U.K), a=new Float32Array(2048*9), b=new Float32Array(2048*9);
  let nj=0, nc=0, t=performance.now();
  for(let i=0;i<reps;i++) nj=foamScanJS(px,pz,U.R,U.step,U.level,a,max);
  const js=(performance.now()-t)/reps;
  if(!U.synced) return 'JS '+js.toFixed(3)+' ms('+nj+'점) · C 판 없음';
  t=performance.now();
  for(let i=0;i<reps;i++) nc=foamScanC(px,pz,U.R,U.step,U.level,b,max);
  const c=(performance.now()-t)/reps;
  let far=0; for(let i=0;i<Math.min(nj,nc)*9;i++) far=Math.max(far,Math.abs(a[i]-b[i]));
  return 'JS '+js.toFixed(3)+' ms('+nj+'점) · C '+c.toFixed(3)+' ms('+nc+'점) · 가장 큰 차 '+far.toFixed(4)+' · 지금 쓰는 것 '+(U.useC?'C':'JS');
}
