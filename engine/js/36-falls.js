/* 36-falls.js — CASTAWAY
   폭포와 연어 — 하천이 가파르게 떨어지는 데의 흰 물살 · 물보라 · 소(웅덩이) · 거슬러 뛰어오르는 연어(지형 판 5)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   폭포(사용자 요청)
   ----------------------------------------------------------------------------
   하천 칸에서 물이 흘러가는 이웃(수면이 가장 낮은 하천 칸)과의 수면 차가 4 m 넘는 곳 — 그 가운데 서로 120 m 넘게 떨어진 것을 고른다.
   땅은 높이 지도라 곧은 절벽은 없다 — 하천 바닥을 따라 내리꽂히는 **흰 물살 판**(위에서 아래로 흐르는 결 · 가장자리는 옅게)과
   밑의 **소**(하얗게 이는 거품 원판) · **물보라**(점 무리)로 폭포를 그린다.
   **연어** — 폭포 밑 소에 여섯~열 마리가 맴돌고, 몇 초마다 한 마리가 물살을 거슬러 위로 뛰어오른다(포물선).
   낚싯대로 폭포 둘레(70 m)의 하천에 찌를 던지면 연어가 문다(96-sea.js rodPick) — 큰 고기라 그물로는 안 잡힌다.
   자리는 시드가 정한다(저장에 안 넣는다). 지형 판 5 밑에는 없다.
   ========================================================================== */
const FALLS={list:[], meshes:[], U:{uFT:{value:0}}, fish:null, mist:null, t:0};
function fallsClear(){ for(const m of FALLS.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); } FALLS.meshes.length=0; FALLS.list.length=0; FALLS.fish=null; FALLS.mist=null; }
/* 섬 배율을 키운 뒤 — 하천 칸의 수면 차로 폭포 자리를 찾는다 */
function fallsSites(){
  fallsClear(); if((P.tv|0)<5) return;
  const W=F.wlev, R=F.river, dn=[-1,1,-N,N,-N-1,-N+1,N-1,N+1], cand=[];
  for(let z=2;z<N-2;z++) for(let x=2;x<N-2;x++){ const i=IDX(x,z); if(!R[i]) continue;
    let j=-1, lo=W[i]; for(const d of dn){ const k=i+d; if(R[k]&&W[k]<lo){ lo=W[k]; j=k; } }
    if(j>=0&&W[i]-lo>4) cand.push([W[i]-lo,i,j]); }
  cand.sort((a,b)=>b[0]-a[0]);
  for(const [drop,i,j] of cand){ if(FALLS.list.length>=24) break;
    const x0=(i%N-N/2)*CELL, z0=(((i/N)|0)-N/2)*CELL, x1=(j%N-N/2)*CELL, z1=(((j/N)|0)-N/2)*CELL;
    if(FALLS.list.some(f=>Math.hypot(f.x0-x0,f.z0-z0)<120)) continue;
    /* 하폭 — 물 흐름에 수직으로 하천 칸이 몇 칸 이어지나 */
    const dx=x1-x0, dz=z1-z0, L=Math.hypot(dx,dz)||1, nx=-dz/L, nz=dx/L; let w=1;
    for(const s of [1,-1]) for(let k=1;k<6;k++){ const gx=Math.round((x0+nx*s*k*CELL*0.5)/CELL+N/2), gz=Math.round((z0+nz*s*k*CELL*0.5)/CELL+N/2); if(gx<0||gz<0||gx>=N||gz>=N||!R[IDX(gx,gz)]) break; w++; }
    FALLS.list.push({x0,z0,y0:W[i],x1,z1,y1:W[j],drop,w:clamp(w*CELL*0.32,5,16),dx:dx/L,dz:dz/L});
  }
}
function fallsMat(){
  const m=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide,emissive:0x303438});
  m.onBeforeCompile=sh=>{ sh.uniforms.uFT=FALLS.U.uFT;
    sh.vertexShader='varying vec2 vFU;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFU=uv;');
    sh.fragmentShader='uniform float uFT;\nvarying vec2 vFU;\nfloat fh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\nfloat fn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(fh(i+vec2(0,1)),fh(i+vec2(1,1)),f.x),f.y); }\n'
      +sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { /* 위에서 아래로 쏟아지는 결 — 가로로 촘촘한 세로 줄(물줄기)이 흘러내리고, 잡음으로 끊기고 뭉친다. 양 가장자리는 옅다 */
        float u=vFU.x, v=vFU.y, t=uFT;
        float s=fn(vec2(u*38.0,v*3.0-t*2.6))*0.6+fn(vec2(u*90.0,v*7.0-t*4.1))*0.4;
        float edge=smoothstep(0.0,0.12,u)*smoothstep(1.0,0.88,u);
        diffuseColor.rgb=mix(vec3(0.70,0.80,0.84),vec3(0.97,0.99,1.0),smoothstep(0.35,0.75,s));
        diffuseColor.a=edge*(0.55+0.45*smoothstep(0.25,0.6,s))*smoothstep(0.0,0.06,v); }`); };
  m.customProgramCacheKey=()=>'falls'; return m;
}
function fallsBuild(){
  for(const m of FALLS.meshes){ scene.remove(m); if(m.geometry) m.geometry.dispose(); } FALLS.meshes.length=0;
  if(!FALLS.list.length) return;
  const mat=fallsMat(), foam=new THREE.MeshLambertMaterial({color:0xf2f6f6,transparent:true,opacity:0.42,depthWrite:false});   // 소의 거품 — 옅게(하얀 판처럼 튀었다)
  for(const f of FALLS.list){
    /* 물살 판 — 윗 칸 뒤 반 칸에서 아랫 칸 앞 반 칸까지, 하천 바닥(+0.2 m)을 따라 14 마디 */
    const P=[], UV=[], I=[], S=14, nx=-f.dz, nz=f.dx, L=Math.hypot(f.x1-f.x0,f.z1-f.z0);
    for(let k=0;k<=S;k++){ const t=k/S, a=-0.5+t*2.0, x=f.x0+f.dx*L*a, z=f.z0+f.dz*L*a;
      const y=Math.max(heightAt(x,z)+0.25,Math.min(f.y0,f.y0+(f.y1-f.y0)*clamp(a,0,1)));
      for(const s of [-1,1]){ P.push(x+nx*s*f.w*0.5,y,z+nz*s*f.w*0.5); UV.push(s<0?0:1,t); } }
    for(let k=0;k<S;k++){ const a=k*2; I.push(a,a+1,a+3,a,a+3,a+2); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
    g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
    const m=new THREE.Mesh(g,mat); m.renderOrder=4; scene.add(m); FALLS.meshes.push(m);
    /* 소 — 아래 끝의 흰 거품 원판 */
    f.px=f.x0+f.dx*L*1.4; f.pz=f.z0+f.dz*L*1.4; f.py=Math.max(f.y1,heightAt(f.px,f.pz)+0.3);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(f.w*0.55,24).rotateX(-Math.PI/2),foam); pool.position.set(f.px,f.py+0.05,f.pz); pool.renderOrder=4; scene.add(pool); FALLS.meshes.push(pool);
  }
  /* 연어 — 몸 75 cm · 등은 짙은 청회 · 배는 은빛 · 산란기의 붉은 옆구리 */
  const sal={id:'salmon',len:0.75,tall:0.27,thick:0.18,c:[0x4a5a6a,0xd8d4cc,0xa8463a],pat:'spots'};
  const fishM=new THREE.InstancedMesh(fishGeo(sal),new THREE.MeshLambertMaterial({vertexColors:true}),FALLS.list.length*8);
  fishM.count=0; fishM.frustumCulled=false; scene.add(fishM); FALLS.meshes.push(fishM);
  FALLS.fish={m:fishM, list:[]};
  for(const f of FALLS.list) for(let k=0;k<8;k++) FALLS.fish.list.push({f, a:Math.random()*6.283, r:1.2+Math.random()*f.w*0.4, sp:0.4+Math.random()*0.5, jump:-1, jt:0});
  /* 물보라 */
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'), gr=x.createRadialGradient(32,32,2,32,32,31);
  gr.addColorStop(0,'rgba(255,255,255,0.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,64,64);
  const mg=new THREE.BufferGeometry(); mg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(240*3).fill(-9999),3));
  const mist=new THREE.Points(mg,new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),size:3.2,transparent:true,opacity:0.22,depthWrite:false})); mist.frustumCulled=false; scene.add(mist); FALLS.meshes.push(mist);
  FALLS.mist={p:mist, v:new Float32Array(240*3), life:new Float32Array(240)};
}
const _flsM=new THREE.Matrix4(), _flsQ=new THREE.Quaternion(), _flsE=new THREE.Euler(), _flsV=new THREE.Vector3(), _flsS=new THREE.Vector3(1,1,1);
function updateFalls(dt){
  if(!FALLS.fish) return;
  FALLS.t+=dt; FALLS.U.uFT.value=FALLS.t;
  const px=PL.pos.x, pz=PL.pos.z, near=FALLS.list.filter(f=>Math.hypot(f.px-px,f.pz-pz)<220);
  FALLS.fish.m.visible=FALLS.mist.p.visible=near.length>0; if(!near.length) return;
  /* 연어 — 소를 맴돌다가 가끔 한 마리가 폭포 위로 뛴다(1.3초 포물선) */
  let n=0; const M=FALLS.fish.m;
  for(const s of FALLS.fish.list){ const f=s.f; if(near.indexOf(f)<0) continue;
    let x,y,z,yaw,pitch=0;
    if(s.jump>=0){ s.jump+=dt/1.3; const t=Math.min(1,s.jump), sx=f.px, sz=f.pz, ex=f.x0, ez=f.z0;
      x=sx+(ex-sx)*t; z=sz+(ez-sz)*t; y=f.py+(f.y0-f.py)*t+Math.sin(Math.PI*t)*(1.5+f.drop*0.25);
      yaw=Math.atan2(-(ex-sx),-(ez-sz))-Math.PI/2; pitch=Math.cos(Math.PI*t)*0.9;
      if(s.jump>=1){ s.jump=-1; s.a=Math.random()*6.283; } }
    else{ s.a+=s.sp*dt/s.r; x=f.px+Math.cos(s.a)*s.r; z=f.pz+Math.sin(s.a)*s.r; y=f.py-0.35+Math.sin(FALLS.t*2+s.a)*0.05;
      yaw=-s.a-Math.PI; if(Math.random()<dt*0.04) s.jump=0; }
    _flsE.set(0,yaw,pitch,'YXZ'); _flsQ.setFromEuler(_flsE); _flsV.set(x,y,z); _flsM.compose(_flsV,_flsQ,_flsS); M.setMatrixAt(n++,_flsM); }
  M.count=n; M.instanceMatrix.needsUpdate=true;
  /* 물보라 — 소 위로 피어오른다 */
  { const S=FALLS.mist, a=S.p.geometry.attributes.position.array;
    for(let i=0;i<240;i++){ S.life[i]-=dt;
      if(S.life[i]<=0){ const f=near[i%near.length]; a[i*3]=f.px+(Math.random()-0.5)*f.w*0.8; a[i*3+1]=f.py+0.2; a[i*3+2]=f.pz+(Math.random()-0.5)*f.w*0.8;
        S.v[i*3]=(Math.random()-0.5)*1.2; S.v[i*3+1]=0.8+Math.random()*1.4; S.v[i*3+2]=(Math.random()-0.5)*1.2; S.life[i]=1.5+Math.random()*2; continue; }
      a[i*3]+=S.v[i*3]*dt; a[i*3+1]+=S.v[i*3+1]*dt; a[i*3+2]+=S.v[i*3+2]*dt; }
    S.p.geometry.attributes.position.needsUpdate=true; }
}
/* 찌 자리가 폭포 둘레(70 m)의 하천인가 — 낚시가 본다 */
const fallsNear=(x,z)=>FALLS.list.some(f=>Math.hypot(f.px-x,f.pz-z)<70);
