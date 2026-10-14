/* 35-geo.js — CASTAWAY
   지열 지대 — 온천 · 간헐천 · 진흙 웅덩이 · 석회화 단구(지형 판 5 · 유황이 나는 분기공 지대에)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   지열 지대(사용자 요청 — 옐로스톤처럼)
   ----------------------------------------------------------------------------
   분기공 지대(바이옴 FUMAROLE — 유황이 나는 곳)의 무리마다:
   · **온천** — 땅에 붙은 둥근 웅덩이(반지름 3~9 m). 가운데는 깊은 쪽빛, 바깥으로 청록 · 초록 · 노랑 · 주황 · 녹빛 테
     (Grand Prismatic 처럼 미생물 띠가 물 온도대로 둘러선다). 물결이 일렁이고 김이 오른다.
   · **진흙 웅덩이** — 잿빛 흙탕이 부글거린다(거품이 부풀었다 터진다 · 셰이더).
   · **간헐천** — 흰 규화 둔덕(콘). 50~130초마다 8~14초 동안 물기둥이 20~35 m 솟고(물방울 수백 개) 김이 짙게 핀다.
   · **석회화 단구** — 비탈을 따라 계단처럼 내려가는 크림빛 테의 얕은 물웅덩이 5~8 단(맘모스 온천처럼).
   **데인다** — 온천·진흙에 발을 담그거나 솟는 물기둥 곁(3 m)에 서면 체력이 깎인다.
   자리는 시드가 정한다(저장에 안 넣는다). 지형 판 5 밑(옛 저장)에는 없다.
   ========================================================================== */
const GEOT={pools:[], geysers:[], meshes:[], steam:null, spray:null, U:{uGT:{value:0}}, t:0, near:false};
function geoClear(){
  for(const m of GEOT.meshes){ scene.remove(m); m.geometry.dispose(); }
  GEOT.meshes.length=0; GEOT.pools.length=0; GEOT.geysers.length=0;
}
/* 땅에 붙은 원판 — 고리 rings × 조각 seg. 정점마다 땅 높이 + lift · uv.x = 가운데에서의 거리(0~1) */
function geoDisc(x,z,R,lift,rings,seg,flat){
  const P=[], UV=[], I=[];
  P.push(x,(flat!==undefined?flat:heightAt(x,z))+lift,z); UV.push(0,0);
  for(let r=1;r<=rings;r++) for(let s=0;s<seg;s++){ const a=s/seg*6.2832, rr=R*r/rings, px=x+Math.cos(a)*rr, pz=z+Math.sin(a)*rr;
    P.push(px,(flat!==undefined?Math.max(flat,heightAt(px,pz)-0.02):heightAt(px,pz))+lift,pz); UV.push(r/rings,s/seg); }
  for(let s=0;s<seg;s++) I.push(0,1+(s+1)%seg,1+s);
  for(let r=1;r<rings;r++) for(let s=0;s<seg;s++){ const a=1+(r-1)*seg+s, b=1+(r-1)*seg+(s+1)%seg, c=1+r*seg+s, d=1+r*seg+(s+1)%seg; I.push(a,b,d,a,d,c); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
  g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}
/* 웅덩이 재질 — kind 0 온천 · 1 진흙 · 2 석회화 단구 */
function geoMat(kind){
  const m=new THREE.MeshLambertMaterial({color:0xffffff, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uGT=GEOT.U.uGT;
    sh.vertexShader='varying vec2 vGU;\nvarying vec3 vGW;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGU=uv; vGW=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader='uniform float uGT;\nvarying vec2 vGU;\nvarying vec3 vGW;\nfloat gh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n'
      +sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { float r=vGU.x, w=sin(r*40.0-uGT*1.3+vGW.x*0.3)*0.5+0.5, a=atan(vGW.z-0.0,vGW.x-0.0);
        ${kind===0?`/* 온천 — 물 온도대로 둘러선 띠: 쪽빛 → 청록 → 초록 → 노랑 → 주황 → 녹빛 테 */
        vec3 c=mix(vec3(0.03,0.22,0.48),vec3(0.06,0.48,0.62),smoothstep(0.0,0.45,r));
        c=mix(c,vec3(0.30,0.62,0.42),smoothstep(0.45,0.62,r)); c=mix(c,vec3(0.86,0.74,0.22),smoothstep(0.60,0.75,r));
        c=mix(c,vec3(0.86,0.42,0.12),smoothstep(0.74,0.88,r)); c=mix(c,vec3(0.52,0.30,0.18),smoothstep(0.88,1.0,r));
        c*=1.0+0.06*(w-0.5)*(1.0-smoothstep(0.5,0.7,r)); c+=vec3(0.9,0.95,1.0)*pow(w,24.0)*0.10*(1.0-r);   // 물결 · 볕 반짝임
        diffuseColor.rgb=c;`
        :kind===1?`/* 진흙 — 잿빛 흙탕에 거품이 부풀었다 터진다(칸마다 제 박자) */
        vec2 q=vGW.xz*1.6; vec2 qi=floor(q), qf=fract(q)-0.5; float ph=fract(uGT*0.35+gh(qi)*7.0);
        float rb=0.12+0.28*ph, bub=(1.0-smoothstep(rb-0.04,rb,length(qf)))*step(gh(qi+3.1),0.55)*(1.0-ph);
        vec3 c=mix(vec3(0.36,0.33,0.29),vec3(0.24,0.22,0.20),smoothstep(0.0,0.8,r));
        c=mix(c,vec3(0.50,0.47,0.42),bub*0.8); c=mix(c,vec3(0.62,0.56,0.46),smoothstep(0.85,1.0,r));   // 마른 테
        diffuseColor.rgb=c;`
        :`/* 석회화 단구 — 크림빛 테 · 안은 옅은 하늘빛 물 · 테 바깥으로 흘러내린 주황 미생물 자국 */
        vec3 c=mix(vec3(0.58,0.80,0.84),vec3(0.70,0.86,0.86),smoothstep(0.0,0.75,r));
        c=mix(c,vec3(0.94,0.91,0.84),smoothstep(0.72,0.86,r)); c=mix(c,vec3(0.86,0.66,0.44),smoothstep(0.93,1.0,r)*(0.5+0.5*sin(a*9.0)));
        c+=vec3(0.9)*pow(w,30.0)*0.08*(1.0-r);
        diffuseColor.rgb=c;`}
      }`);
  };
  m.customProgramCacheKey=()=>'geo'+kind;
  return m;
}
function geoSites(seed){
  geoClear(); if((P.tv|0)<5) return;
  const rnd=mulberry32((seed^0x9e05)>>>0), cand=[];
  for(let z=3;z<N-3;z+=2) for(let x=3;x<N-3;x+=2){ const i=IDX(x,z); if(F.biome[i]===B.FUMAROLE) cand.push(i); }
  if(!cand.length) return;
  /* 무리 — 분기공 칸 가운데서 서로 250 m 넘게 떨어진 자리 몇 곳 */
  const hubs=[];
  for(let k=0;k<cand.length&&hubs.length<6;k++){ const i=cand[(rnd()*cand.length)|0], x=(i%N-N/2)*CELL, z=(((i/N)|0)-N/2)*CELL;
    if(hubs.every(h=>Math.hypot(h[0]-x,h[1]-z)>250)) hubs.push([x,z]); }
  const free=(x,z,r)=>GEOT.pools.every(p=>Math.hypot(p.x-x,p.z-z)>p.R+r+2)&&GEOT.geysers.every(g=>Math.hypot(g.x-x,g.z-z)>r+8)&&!caveAt(x,z,r)&&!cragNear(x,z,r);
  const flatAt=(x,z,R)=>{ let lo=1e9,hi=-1e9; for(let k=0;k<8;k++){ const a=k/8*6.2832, h=heightAt(x+Math.cos(a)*R,z+Math.sin(a)*R); lo=Math.min(lo,h); hi=Math.max(hi,h); } return [lo,hi]; };
  for(const [hx,hz] of hubs){
    const tryPlace=(fn,n,spread)=>{ for(let t=0,k=0;t<40&&k<n;t++){ const x=hx+(rnd()-0.5)*spread, z=hz+(rnd()-0.5)*spread; if(heightAt(x,z)<1) continue; if(fn(x,z)) k++; } };
    tryPlace((x,z)=>{ const R=3+rnd()*6, [lo,hi]=flatAt(x,z,R); if(hi-lo>1.2||!free(x,z,R)) return false;   // 온천 — 평평한 데
      GEOT.pools.push({x,z,R,k:0,y:lo+0.05}); return true; },2+((rnd()*2)|0),70);
    tryPlace((x,z)=>{ const R=1.5+rnd()*1.6, [lo,hi]=flatAt(x,z,R); if(hi-lo>0.8||!free(x,z,R)) return false;   // 진흙 웅덩이
      GEOT.pools.push({x,z,R,k:1,y:lo+0.03}); return true; },2+((rnd()*2)|0),60);
    tryPlace((x,z)=>{ if(!free(x,z,4)) return false;                                                          // 간헐천
      GEOT.geysers.push({x,z,y:heightAt(x,z),h:20+rnd()*15,per:50+rnd()*80,dur:8+rnd()*6,ph:rnd()*100,on:false}); return true; },1+((rnd()*2)|0),80);
    /* 석회화 단구 — 근처의 비탈(내리막)을 따라 계단처럼 */
    tryPlace((x,z)=>{ const g=groundSlope(x,z,3), sl=Math.hypot(g[0],g[1]); if(sl<0.15||sl>0.7) return false;
      const dx=-g[0]/sl, dz=-g[1]/sl, n=5+((rnd()*4)|0);
      for(let s=0;s<n;s++){ const R=3+rnd()*1.8, px=x+dx*s*R*1.55+(rnd()-0.5)*1.2, pz=z+dz*s*R*1.55+(rnd()-0.5)*1.2; if(!free(px,pz,R*0.6)) break;
        const [lo]=flatAt(px,pz,R); GEOT.pools.push({x:px,z:pz,R,k:2,y:lo+0.12}); }
      return true; },1,90);
  }
}
/* 메시 — 웅덩이는 땅에 붙은 원판 · 단구는 수면(평평) + 테(땅을 따라) · 간헐천은 흰 규화 둔덕 */
function geoBuild(){
  for(const m of GEOT.meshes){ scene.remove(m); m.geometry.dispose(); } GEOT.meshes.length=0;
  if(!GEOT.pools.length&&!GEOT.geysers.length) return;
  const mats=[geoMat(0),geoMat(1),geoMat(2)];
  for(const p of GEOT.pools){
    const g=p.k===2?geoDisc(p.x,p.z,p.R,0,6,28,p.y):geoDisc(p.x,p.z,p.R,0.06,8,36);
    const m=new THREE.Mesh(g,mats[p.k]); m.receiveShadow=true; m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m); GEOT.meshes.push(m);
    if(p.k===2){ const rim=new THREE.Mesh(new THREE.TorusGeometry(p.R*0.98,0.16,6,32),new THREE.MeshLambertMaterial({color:0xece6d6}));   // 크림빛 테
      rim.rotation.x=Math.PI/2; rim.position.set(p.x,p.y+0.02,p.z); rim.scale.set(1,1,0.8); rim.updateMatrix(); rim.matrixAutoUpdate=false; scene.add(rim); GEOT.meshes.push(rim); }
  }
  for(const q of GEOT.geysers){
    const cone=new THREE.Mesh(SHP.blob(1,hashStr('gey'+q.x),{w:16,h:8,amp:0.12,rough:0.12,sy:0.35,base:0.05}),new THREE.MeshLambertMaterial({color:0xd8d2c4}));
    cone.scale.set(3.2,3.2,3.2); cone.position.set(q.x,q.y-0.2,q.z); cone.updateMatrix(); cone.matrixAutoUpdate=false; scene.add(cone); GEOT.meshes.push(cone);
    /* 물기둥 — 위로 갈수록 퍼지는 반투명 흰 기둥(솟는 동안만 · 높이는 솟는 세기대로). 물방울(점)은 그 둘레로 튄다 */
    const col=new THREE.Mesh(new THREE.CylinderGeometry(1.6,0.45,1,14,6,true).translate(0,0.5,0),new THREE.MeshBasicMaterial({color:0xf4f8fa,transparent:true,opacity:0.55,depthWrite:false,side:THREE.DoubleSide}));
    col.position.set(q.x,q.y+0.3,q.z); col.visible=false; col.renderOrder=3; scene.add(col); GEOT.meshes.push(col); q.col=col;
  }
  /* 물방울(간헐천) · 김 — 점 무리 둘, 사람 둘레에서만 움직인다 */
  const sprite=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'), gr=x.createRadialGradient(32,32,2,32,32,31);
    gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.4,'rgba(255,255,255,0.45)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
  const mk=(n,size,op)=>{ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3).fill(-9999),3));
    const p=new THREE.Points(g,new THREE.PointsMaterial({map:sprite,size,transparent:true,opacity:op,depthWrite:false,color:0xf2f6f8})); p.frustumCulled=false; scene.add(p); GEOT.meshes.push(p);
    return {p,n,v:new Float32Array(n*3),life:new Float32Array(n)}; };
  GEOT.spray=mk(500,1.1,0.85); GEOT.steam=mk(260,4.5,0.16);
}
/* 프레임마다 — 250 m 안에 지열 지대가 있을 때만 */
function updateGeo(dt){
  if(!GEOT.steam) return;
  GEOT.t+=dt; GEOT.U.uGT.value=GEOT.t;
  const px=PL.pos.x, pz=PL.pos.z;
  const near=GEOT.pools.some(p=>Math.hypot(p.x-px,p.z-pz)<250)||GEOT.geysers.some(g=>Math.hypot(g.x-px,g.z-pz)<250);
  GEOT.steam.p.visible=GEOT.spray.p.visible=near; if(!near) return;
  /* 간헐천 — 주기마다 솟는다 */
  for(const g of GEOT.geysers){ const t=(GEOT.t+g.ph)%g.per; const was=g.on; g.on=t<g.dur; g.k=g.on?Math.sin(Math.PI*Math.min(1,t/g.dur))**0.5:0;
    if(g.on&&!was&&Math.hypot(g.x-px,g.z-pz)<120) toast('간헐천이 솟는다');
    if(g.col){ g.col.visible=g.k>0.02; if(g.col.visible){ const h=g.h*g.k; g.col.scale.set(0.6+0.5*g.k+0.08*Math.sin(GEOT.t*9),h,0.6+0.5*g.k+0.08*Math.cos(GEOT.t*8)); g.col.material.opacity=0.35+0.3*g.k; } } }
  /* 물방울 — 솟는 간헐천의 물구멍에서 위로 쏘고 떨어진다 */
  { const S=GEOT.spray, a=S.p.geometry.attributes.position.array, act=GEOT.geysers.filter(g=>g.on&&Math.hypot(g.x-px,g.z-pz)<250);
    for(let i=0;i<S.n;i++){ S.life[i]-=dt;
      if(S.life[i]<=0){ if(!act.length){ a[i*3+1]=-9999; continue; } const g=act[i%act.length], v0=Math.sqrt(2*22*g.h)*g.k*(0.75+0.3*Math.random());
        a[i*3]=g.x+(Math.random()-0.5)*0.6; a[i*3+1]=g.y+0.5; a[i*3+2]=g.z+(Math.random()-0.5)*0.6;
        S.v[i*3]=(Math.random()-0.5)*1.6; S.v[i*3+1]=v0; S.v[i*3+2]=(Math.random()-0.5)*1.6; S.life[i]=v0/11+0.4; continue; }
      S.v[i*3+1]-=22*dt; a[i*3]+=S.v[i*3]*dt; a[i*3+1]+=S.v[i*3+1]*dt; a[i*3+2]+=S.v[i*3+2]*dt; }
    S.p.geometry.attributes.position.needsUpdate=true; }
  /* 김 — 온천·단구·간헐천 위로 천천히 오르며 퍼진다 */
  { const S=GEOT.steam, a=S.p.geometry.attributes.position.array, src=GEOT.pools.filter(p=>p.k!==1&&Math.hypot(p.x-px,p.z-pz)<200).concat(GEOT.geysers.filter(g=>Math.hypot(g.x-px,g.z-pz)<200));
    for(let i=0;i<S.n;i++){ S.life[i]-=dt;
      if(S.life[i]<=0){ if(!src.length){ a[i*3+1]=-9999; continue; } const s=src[(Math.random()*src.length)|0], R=s.R||1.2, an=Math.random()*6.2832, rr=Math.sqrt(Math.random())*R*0.8;
        a[i*3]=s.x+Math.cos(an)*rr; a[i*3+1]=(s.y!==undefined?s.y:heightAt(s.x,s.z))+0.3; a[i*3+2]=s.z+Math.sin(an)*rr;
        S.v[i*3]=(Math.random()-0.5)*0.4; S.v[i*3+1]=0.6+Math.random()*0.9*(s.on?4:1); S.v[i*3+2]=(Math.random()-0.5)*0.4; S.life[i]=3+Math.random()*4; continue; }
      a[i*3]+=S.v[i*3]*dt; a[i*3+1]+=S.v[i*3+1]*dt; a[i*3+2]+=S.v[i*3+2]*dt; S.v[i*3+1]*=1-0.15*dt; }
    S.p.geometry.attributes.position.needsUpdate=true; }
  /* 데인다 — 온천·진흙에 발을 담그거나 솟는 물기둥 곁 */
  if(!PL.dead&&!DEV.on){
    for(const p of GEOT.pools){ if(p.k===2) continue; const d=Math.hypot(p.x-px,p.z-pz); if(d<p.R*0.85&&PL.pos.y<p.y+0.6){ hurtPL((p.k===0?9:6)*dt,p.k===0?'끓는 온천에 데었다':'뜨거운 진흙에 데었다'); break; } }
    for(const g of GEOT.geysers) if(g.on&&Math.hypot(g.x-px,g.z-pz)<3){ hurtPL(14*dt*g.k,'간헐천 물기둥에 데었다'); break; }
  }
}
