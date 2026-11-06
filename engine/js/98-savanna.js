/* 98-savanna.js — CASTAWAY
   **사바나 풀밭**(사용자 요청 2026-11-05 — '건초 관목지랑 초원의 황금색 풀은 흔들리며 황금색이어야 · 사바나는 시야를 가릴 만큼 빽빽하게
   (나중에 멀티플레이어에서 숨어 저격할 수 있게)'). 매끈한 땅 섬(P.sm)의 덤불 땅(SCRUB) · 메마른 풀밭(MEADOW · 습도 0.30 밑 — 0.38 까지 잦아든다).
   · 풀포기 하나 = 휜 잎날 여럿(밑동은 올리브 갈색 → 끝은 옅은 금빛) · 키 1.3~1.9 m — 앉거나 엎드리면 몸이 가려진다
   · 사람 둘레만 인스턴스로 깐다 — 20 m 안 2.4 포기/m²(잎날 9 × 마디 3 = 54 세모) · 50 m 안 1.1(20 세모 · 넓은 잎) · 110 m 안 0.45(8 세모)
     (사용자 요청 '풀 개수 자체도 늘려') · 다시 까는 일은 여러 프레임에 나눠(한 프레임 3 ms) 새 판을 짓고 다 되면 한 번에 바꿔 끼운다
     자리는 2 m 칸마다 해시로 정해져 있어 걸어도 그 자리 그 포기다 · 칸마다 맨땅 얼룩(사바나는 풀포기 사이가 군데군데 빈다)
   · 바람 — 정점 셰이더에서 끝으로 갈수록(높이²) 휘고, 돌풍이 바람 방향으로 풀밭을 가로질러 물결처럼 지나간다(windDir · WEA.wind)
   · 뽑으면 풀잎(FLORA_PICK.savgrass → grass_blade) — 세상에 선 것은 전부 무엇인가를 준다 · 뽑은 포기는 다시 날 때까지 빈다(FLORA.taken)
   · 그림자는 받기만(드리우면 그림자 지도에 수천 포기를 또 그린다) */
"use strict";
const SAV={on:false, im:[], picks:[], last:null, uT:{value:0}, uW:{value:new THREE.Vector3(0.8,0.6,0.5)}, R:[20,50,110], DENS:[2.4,1.1,0.45], cap:[3600,9000,16000], CELL:2, job:null};
FLORA_PICK.savgrass={item:'grass_blade', n:'마른 풀', verb:'뜯기', regrow:20, cnt:[1,3], dur:0.6, stam:1.5};
/* 풀포기 꼴 — 잎날 nb 장 · 마디 sg · 잎 너비 배율 wk(멀리 단계는 적은 잎을 넓게) */
function savTuft(nb,sg,wk,seed){
  const rnd=mulberry32(seed), P=[], C=[], T=[], Nn=[], I=[];
  for(let b=0;b<nb;b++){
    const yaw=rnd()*6.283, r0=rnd()*0.16, bx=Math.cos(yaw)*r0, bz=Math.sin(yaw)*r0, h=0.62+rnd()*0.38, lean=0.18+rnd()*0.42, w0=(0.022+rnd()*0.014)*wk;
    const dx=Math.cos(yaw), dz=Math.sin(yaw), px=-dz, pz=dx, v0=P.length/3, dry=rnd();
    for(let k=0;k<=sg;k++){ const t=k/sg, bend=lean*t*t, y=h*t*(1-0.25*bend), x=bx+dx*bend*h, z=bz+dz*bend*h, w=w0*(1-t*0.92);
      P.push(x-px*w,y,z-pz*w, x+px*w,y,z+pz*w);
      /* 빛깔 — 밑동 올리브 갈색 → 가운데 밀짚 · 끝은 옅은 금빛 · 잎마다 조금 마르고 덜 마름 */
      const a=[0.46,0.39,0.20], m=[0.82,0.66,0.32], e=[0.96,0.86,0.55], cc=t<0.5?a.map((q,i)=>q+(m[i]-q)*t*2):m.map((q,i)=>q+(e[i]-q)*(t-0.5)*2);
      const k2=0.90+0.20*dry; for(let j=0;j<2;j++){ C.push(cc[0]*k2,cc[1]*k2,cc[2]*(0.85+0.3*dry)); T.push(t); Nn.push(dx*0.25,1,dz*0.25); } }
    for(let k=0;k<sg;k++){ const a=v0+k*2; I.push(a,a+1,a+2, a+1,a+3,a+2); } }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.setAttribute('aT',new THREE.Float32BufferAttribute(T,1)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3)); g.setIndex(I); g.computeBoundingSphere(); return g;
}
function savMat(){
  const m=new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide});
  m.onBeforeCompile=sh=>{ sh.uniforms.uSavT=SAV.uT; sh.uniforms.uSavW=SAV.uW;
    sh.vertexShader='uniform float uSavT; uniform vec3 uSavW; attribute float aT;\n'+sh.vertexShader.replace('#include <project_vertex>',`
      vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.0);
      { /* 바람 — 끝으로 갈수록(높이²) · 돌풍 물결이 바람 방향으로 지나간다(파장 23 m · 초당 6 m) · 잔떨림은 포기마다 다른 위상 */
        vec2 wd=uSavW.xy; float ph=dot(wp.xz,wd)*0.27-uSavT*1.65;
        float gust=0.55+0.45*sin(ph)+0.25*sin(ph*0.43+1.7);
        float flick=sin(uSavT*5.3+wp.x*1.7+wp.z*1.3)*0.18;
        float k=aT*aT*(0.10+0.55*uSavW.z)*(gust+flick);
        wp.xz+=wd*k*1.15; wp.y-=k*k*0.35; }
      vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;`);
  };
  m.customProgramCacheKey=()=>'savanna1';
  return m;
}
function savBuild(){
  for(const im of SAV.im){ scene.remove(im); } SAV.im.length=0; SAV.picks.length=0; SAV.last=null; SAV.on=false; SAV.job=null;
  if(!P.sm) return;
  const G=[savTuft(9,3,1.3,7101),savTuft(5,2,1.9,7102),savTuft(4,1,2.8,7103)];
  for(let l=0;l<3;l++){ const im=new THREE.InstancedMesh(G[l],savMat(),SAV.cap[l]); im.count=0; im.frustumCulled=false; im.userData.lightRole='recv'; scene.add(im); SAV.im.push(im); }
  SAV.on=true;
}
/* 그 자리의 풀밭 짙기(0~1) — 덤불 땅 1 · 메마른 풀밭은 습도로 잦아든다 · 맨땅 얼룩(큰 잡음) */
function savDensity(x,z){
  const gx=Math.round(x/CELL+N/2), gz=Math.round(z/CELL+N/2); if(gx<1||gz<1||gx>=N-1||gz>=N-1) return 0;
  const i=gz*N+gx, b=F.biome[i]; if(F.river[i]) return 0;
  let d=b===B.SCRUB?1:b===B.MEADOW?1-smoothstep(0.30,0.38,F.moist[i]):0; if(d<=0) return 0;
  const n=floraVal(x,z,26,91)*0.6+floraVal(x,z,9,92)*0.4; return d*smoothstep(0.28,0.46,n);
}
const _svM=new THREE.Matrix4(), _svQ=new THREE.Quaternion(), _svV=new THREE.Vector3(), _svS=new THREE.Vector3(), _svE=new THREE.Euler();
/* 새 판 짓기 — 칸을 줄마다 훑으며 포기 행렬을 미리 둔 배열에 쓴다(yield 로 쉬어 간다) */
function* savJob(cx,cz){
  const C=SAV.CELL, R=SAV.R, Rm=R[2], g0x=Math.floor((cx-Rm)/C), g1x=Math.floor((cx+Rm)/C), g0z=Math.floor((cz-Rm)/C), g1z=Math.floor((cz+Rm)/C);
  if(!SAV.buf) SAV.buf=SAV.cap.map(c=>new Float32Array(c*16));
  const cnt=[0,0,0], picks=[], B=SAV.buf;
  for(let gz=g0z;gz<=g1z;gz++){
    for(let gx=g0x;gx<=g1x;gx++){
      const x0=(gx+0.5)*C, z0=(gz+0.5)*C, dd=Math.hypot(x0-cx,z0-cz); if(dd>Rm) continue;
      const l=dd<R[0]?0:dd<R[1]?1:2, want=SAV.DENS[l]*C*C; let d=-1;
      for(let j=0;j<10;j++){                                                 // 칸마다 포기 열까지 — 차례(rank)가 짙기 밑인 것만
        const h=floraHash(gx,gz,40+j), rank=(h&1023)/1024; if(rank*10>=want) continue;
        if(d<0){ d=savDensity(x0,z0); if(d<=0) break; }
        if(rank*10>=want*d||cnt[l]>=SAV.cap[l]) continue;
        const x=gx*C+((h>>>10)&255)/256*C, z=gz*C+((h>>>18)&255)/256*C, key='S'+gx+','+gz+','+j;
        if(FLORA.taken.size&&FLORA.taken.has(key)&&floraWait({kind:'savgrass',key})>0) continue;
        const y=heightAt(x,z); if(y<0.6) continue;
        const hs=1.30+0.6*((h>>>26)&63)/63, ws2=(1.0+0.6*((h>>>4)&63)/63)*(l===0?1:l===1?1.25:1.6);
        _svE.set(0,((h>>>7)&1023)/1023*6.283,0); _svQ.setFromEuler(_svE); _svV.set(x,y-0.05,z); _svS.set(ws2,hs,ws2);
        _svM.compose(_svV,_svQ,_svS); _svM.toArray(B[l],cnt[l]*16); cnt[l]++;
        if(dd<4.5) picks.push({kind:'savgrass',x,y,z,key,r:0.32}); } }
    yield; }
  return {cnt,picks};
}
function updateSavanna(dt){
  if(!SAV.on) return;
  SAV.uT.value+=dt; const ws=typeof WEA!=='undefined'?(WEA.wind||0):0.3;
  SAV.uW.value.set(windDir.x,windDir.z,Math.min(1,0.25+ws));
  const cx=camera.position.x, cz=camera.position.z;
  if(SAV.tk!==FLORA.taken.size){ SAV.tk=FLORA.taken.size; SAV.dirty=true; }                // 뽑은 포기는 비운다
  if(!SAV.job){
    const mv=SAV.last?Math.hypot(SAV.last.x-cx,SAV.last.z-cz):1e9; if(mv<4&&!SAV.dirty) return;
    SAV.last={x:cx,z:cz}; SAV.dirty=false; SAV.job=savJob(cx,cz);
    if(mv>1e8){ let r; while(!(r=SAV.job.next()).done); savCommit(r.value); return; }          // 처음만 한 번에 — 빨리 날거나 순간이동할 때 통째로 지으며 수십 ms 씩 멎었다(2026-11-06 사용자 '돌아다니면 버벅인다') · 그 뒤로는 늘 나눠서
  }
  const t0=performance.now(); let r;
  while(!(r=SAV.job.next()).done) if(performance.now()-t0>3) return;
  savCommit(r.value);
}
function savCommit(v){
  SAV.job=null;
  for(let l=0;l<3;l++){ const im=SAV.im[l]; im.instanceMatrix.array.set(SAV.buf[l].subarray(0,v.cnt[l]*16)); im.count=v.cnt[l]; im.visible=im.count>0; instUp(im); }   // 빈 것은 숨긴다   // 쓰는 앞부분만 올린다(95-flora.js)
  SAV.picks=v.picks;
}
