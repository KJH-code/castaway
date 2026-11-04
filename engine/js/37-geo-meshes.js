/* 37-geo-meshes.js — CASTAWAY
   큰 지형 모형(사용자가 준 Meshy 모형 · 2026-11-04 '이 모형들로 협곡 · 산맥 · 눈 덮인 봉우리 · 고도 차를 크게') — 매끈한 땅(P.sm) 섬만.
   자료는 data-geo-meshes.js(tools/geo-mesh.py 가 STL 에서 만든다 — 높이 1 · 밑면 y 0 · 가까이 1.6만 · 멀리 2.4천 세모 · 정점마다 오목한 정도 aCav).
   **모형은 그림만이 아니라 땅이 된다**(`geoStamp`) — 모형 윗면을 높이 지도로 굽어 섬의 표고(F.elev)에 찍는다(조금 낮게 — 모형 겉이 땅 위로 드러나게).
   그래서 걸어 오르고 · 비탈 · 바이옴 · 하천이 그 꼴을 따른다. 땅의 15 m 세모가 못 그리는 벼랑 면 · 갈라진 틈은 모형이 그린다.
   생기는 까닭이 있는 데에만 세운다(사용자 요청 '까닭 없이 만들지 말 것'):
     · **산맥 · 높은 봉우리**(`geoRange`) — 섬에서 가장 높은 등성이를 따라. 섬의 산은 지각이 솟은 자리(융기 · 화산)라 높은 데가 더 솟는다.
       봉우리 사이는 낮은 봉우리로 이어 능선을 만든다. 높이 300~650 m · 눈은 꼭대기 쪽(눈선 `TERR_U.uSnow`)
     · **협곡**(`geoCanyon`) — 큰 하천이 솟은 땅을 파고든 자리(하방 침식 — 땅이 솟는 빠르기를 강이 따라 깎으면 골짜기가 좁고 깊다). 강을 따라 80~150 m 를 판다 ·
       벽은 붉은 사암 벼랑 모형(층이 진 사암이 수직 절리로 무너져 곧은 벽이 된다)
     · **시스택**(`geoStacks`) — 바닷가 벼랑이 파도에 깎여 물러나며 단단한 부분만 바다에 남은 돌기둥. 물가에서 30~150 m 앞바다(수심 1~8 m) */
"use strict";
const GEO_LF={list:[], meshes:[], geo:{}, top:{}, mat:null, snow:1e4};
TERR_U.uSnow={value:1e4};                                    // 눈선(m) — 땅 셰이더 · 모형 재질이 읽는다
function geoMeshGeo(name,lod){
  const k=name+'|'+lod; if(GEO_LF.geo[k]) return GEO_LF.geo[k];
  const D=GEO_MESH_DATA[name][lod], bin=atob(D.b), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
  const q=new Uint16Array(u8.buffer,0,D.nv*3), cav=u8.subarray(D.nv*6,D.nv*7), io=D.nv*7+(D.nv%2);
  const idx=D.i32?new Uint32Array(u8.buffer.slice(io,io+D.nt*12)):new Uint16Array(u8.buffer.slice(io,io+D.nt*6));
  const P=new Float32Array(D.nv*3), C=new Float32Array(D.nv*3);
  for(let i=0;i<D.nv;i++){ for(let a=0;a<3;a++) P[i*3+a]=D.mn[a]+q[i*3+a]/65535*(D.mx[a]-D.mn[a]);
    const k2=1-0.62*Math.pow(cav[i]/255,1.6); C[i*3]=C[i*3+1]=C[i*3+2]=k2; }          // 갈라진 틈은 짙다(정점 빛깔 — 덩이 빛깔은 재질이 곱한다)
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3)); g.setAttribute('color',new THREE.BufferAttribute(C,3));
  g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeVertexNormals(); g.computeBoundingSphere();
  return GEO_LF.geo[k]=g;
}
/* 모형 윗면의 높이 지도(64×64 · 모형 좌표 xz 를 상자 안에서) — 세모마다 그 칸들에 가장 높은 y 를 적는다 */
function geoTop(name){
  if(GEO_LF.top[name]) return GEO_LF.top[name];
  const g=geoMeshGeo(name,'near'), P=g.attributes.position.array, I=g.index.array, R=128;
  g.computeBoundingBox(); const b=g.boundingBox, H=new Float32Array(R*R).fill(-1);
  const fx=x=>(x-b.min.x)/(b.max.x-b.min.x)*(R-1), fz=z=>(z-b.min.z)/(b.max.z-b.min.z)*(R-1);
  for(let t=0;t<I.length;t+=3){ let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y=-1;
    for(let k=0;k<3;k++){ const v=I[t+k]*3, gx=fx(P[v]), gz=fz(P[v+2]); x0=Math.min(x0,gx); x1=Math.max(x1,gx); z0=Math.min(z0,gz); z1=Math.max(z1,gz); y=Math.max(y,P[v+1]); }
    for(let z=Math.floor(z0);z<=Math.ceil(z1);z++) for(let x=Math.floor(x0);x<=Math.ceil(x1);x++){ if(x<0||z<0||x>=R||z>=R) continue; const i=z*R+x; if(y>H[i]) H[i]=y; } }
  /* 빈 칸(가는 세모 사이)을 이웃으로 메우고 한 번 흐린다 — 계단처럼 끊긴 높이가 땅에 찍히지 않게 */
  for(let it=0;it<2;it++){ const H2=H.slice(); for(let z=1;z<R-1;z++) for(let x=1;x<R-1;x++){ const i=z*R+x; let sm=0,n=0;
      for(const j of [i,i-1,i+1,i-R,i+R]) if(H[j]>=0){ sm+=H[j]; n++; } H2[i]=n>=3?sm/n:H[i]; } H.set(H2); }
  return GEO_LF.top[name]={H,R,b};
}
/* 모형 하나를 섬에 세운다 — (x,z) 가운데 · y 밑면 · S 높이(m) · yaw · 빛깔. 표고를 그 윗면까지 올리거나(raise) 그 높이로 맞춘다 */
function geoStamp(name,x,z,y,S,yaw,tint,o){
  o=o||{}; const T=geoTop(name), c=Math.cos(yaw), s=Math.sin(yaw), W=GEO_MESH_DATA[name].w;
  const hw=Math.max(W[0],W[2])*S*0.72, gx0=Math.max(1,Math.floor((x-hw)/CELL+N/2)), gx1=Math.min(N-2,Math.ceil((x+hw)/CELL+N/2)),
        gz0=Math.max(1,Math.floor((z-hw)/CELL+N/2)), gz1=Math.min(N-2,Math.ceil((z+hw)/CELL+N/2));
  const b=T.b, R=T.R;
  for(let gz=gz0;gz<=gz1;gz++) for(let gx=gx0;gx<=gx1;gx++){
    const wx=(gx-N/2)*CELL-x, wz=(gz-N/2)*CELL-z, lx=(wx*c-wz*s)/S, lz=(wx*s+wz*c)/S;      // 세계 → 모형(돌림을 되돌리고 줄임)
    const u=(lx-b.min.x)/(b.max.x-b.min.x)*(R-1), v=(lz-b.min.z)/(b.max.z-b.min.z)*(R-1);
    if(u<0||v<0||u>R-1||v>R-1) continue;
    const iu=Math.min(R-2,Math.floor(u)), iv=Math.min(R-2,Math.floor(v)), fu=u-iu, fv=v-iv, Hh=T.H;
    const h00=Hh[iv*R+iu], h10=Hh[iv*R+iu+1], h01=Hh[(iv+1)*R+iu], h11=Hh[(iv+1)*R+iu+1];
    if(Math.min(h00,h10,h01,h11)<0.04) continue;                                           // 모형 밖 · 가장자리(밑면 자락)
    const t=(h00*(1-fu)+h10*fu)*(1-fv)+(h01*(1-fu)+h11*fu)*fv, sl=Math.max(h00,h10,h01,h11)-Math.min(h00,h10,h01,h11);
    const i=gz*N+gx, top=y+t*S-(o.inset!==undefined?o.inset:3.0+Math.min(14,S*0.02)+sl*S*0.8);   // 모형 겉이 땅 위로 드러나게 — 가파를수록 더 낮게
    if(top>F.elev[i]){ F.elev[i]=top; if(top>0.5&&F.river[i]){ F.river[i]=0; F.wlev[i]=0; } if(o.biome!==undefined&&top>0.5) F.biome[i]=o.biome; } }
  GEO_LF.list.push({name,x,z,y,S,yaw,tint:tint||[1,1,1]});
}
/* ── 산맥 · 높은 봉우리 ── */
function geoRange(rnd){
  const h=F.elev, cand=[];
  for(let z=8;z<N-8;z+=3) for(let x=8;x<N-8;x+=3){ const i=z*N+x; if(h[i]>20&&!F.river[i]) cand.push([h[i],x,z]); }
  cand.sort((a,b)=>b[0]-a[0]);
  const peaks=[], minD=Math.max(700,WORLD*0.09);
  for(const c of cand){ if(peaks.length>=4) break; const x=(c[1]-N/2)*CELL, z=(c[2]-N/2)*CELL;
    if(peaks.some(p=>Math.hypot(p.x-x,p.z-z)<minD)) continue;
    if(typeof TEMPLE!=='undefined'&&TEMPLE.land&&Math.hypot(TEMPLE.land.x-x,TEMPLE.land.z-z)<500) continue;
    if(LANDING&&Math.hypot(LANDING.x-x,LANDING.z-z)<600) continue;
    peaks.push({x,z,y:c[0]}); }
  if(!peaks.length) return 0;
  const PK=['granite_peaks','jagged_stone_peak','solitary_stone_peak'];
  let top=0;
  peaks.forEach((p,k)=>{ const S=(k===0?620:380+rnd()*240), nm=k===0?'granite_peaks':PK[(rnd()*PK.length)|0];
    geoStamp(nm,p.x,p.z,p.y-S*0.18,S,rnd()*6.283,[0.98,0.96,0.92],{biome:B.SCREE}); top=Math.max(top,p.y-S*0.18+S); });
  /* 봉우리 사이 — 낮은 봉우리 둘씩으로 능선을 잇는다(산맥은 봉우리 무리가 등성이로 이어진 것) */
  for(let k=1;k<peaks.length;k++){ const a=peaks[k-1], b2=peaks[k]; if(Math.hypot(a.x-b2.x,a.z-b2.z)>WORLD*0.35) continue;
    for(const t of [0.35,0.68]){ const x=a.x+(b2.x-a.x)*t+(rnd()-0.5)*120, z=a.z+(b2.z-a.z)*t+(rnd()-0.5)*120, g=heightAt(x,z), S=180+rnd()*150;
      geoStamp(rnd()<0.5?'jagged_stone_peak':'solitary_stone_peak',x,z,g-S*0.2,S,rnd()*6.283,[0.96,0.95,0.92],{biome:B.ROCK}); } }
  return top;
}
/* ── 협곡 — 큰 하천을 따라 판다(벽은 붉은 사암 벼랑) ── */
function geoCanyon(rnd){
  const h=F.elev, HI=GEO_LF.hi0||100, cands=[];
  for(let i=0;i<N*N;i++){ if(!F.river[i]) continue; const e=h[i]; if(e<HI*0.18||e>HI*0.55) continue; cands.push(i); }
  cands.sort((a,b)=>F.flow[b]-F.flow[a]);
  const nearF=i=>typeof FALLS!=='undefined'&&FALLS.list&&FALLS.list.some(f=>Math.hypot((i%N-N/2)*CELL-(f.x0||f.px||0),((i/N|0)-N/2)*CELL-(f.z0||f.pz||0))<220);
  let path=null;
  for(let c=0;c<cands.length&&c<400&&!path;c+=7){ const p0=geoTrace(cands[c],h); const k=p0.findIndex(nearF); if(k>=0) p0.length=k; if(p0.length>=30) path=p0; }
  GEO_LF.canyonLen=path?path.length:0;
  if(!path) return;
  canyonCarve(rnd,path,h);
}
/* 하천을 따라 내려간다 — 아래쪽 = 흐름(모인 물)이 더 많은 이웃 물길 칸 · 1.5 km 까지 */
function geoTrace(best,h){
  const path=[best], seen=new Set([best]);
  for(let s=0;s<220;s++){ const i=path[path.length-1]; let nb=-1, nf=F.flow[i];        // 아래쪽 = 흐름(모인 물)이 더 많은 이웃 물길 칸
    for(const d of [-1,1,-N,N,-N-1,-N+1,N-1,N+1]){ const j=i+d; if(!F.river[j]||seen.has(j)) continue; if(F.flow[j]>nf){ nf=F.flow[j]; nb=j; } }
    if(nb<0||h[nb]<2) break; path.push(nb); seen.add(nb); }
  return path;
}
function canyonCarve(rnd,path,h){
  const D0=80+70*rnd(), floorW=10+8*rnd(), wallW=CELL*1.4, L=path.length;
  for(let k=0;k<L;k++){ const i=path[k], px=i%N, pz=(i/N)|0, t=k/(L-1), dep=D0*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.15)),0.6);   // 양 끝은 얕게
    const r=Math.ceil((floorW+wallW)/CELL)+1;
    for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ const j=(pz+dz)*N+px+dx, d=Math.hypot(dx,dz)*CELL;
      const f=d<floorW?1:1-smoothstep(floorW,floorW+wallW,d); if(f<=0) continue;
      const nh=h[i]-dep*f*(F.river[j]?1:Math.min(1,f*1.3)); if(nh<h[j]){ h[j]=nh; if(F.river[j]) F.wlev[j]=Math.min(F.wlev[j]||nh,nh+0.6); F.biome[j]=f>0.95?B.RIVER:B.ROCK; } } }
  /* 벽 — 가장자리를 따라 양쪽으로 붉은 사암 벼랑(모형 윗면이 가장자리 높이 · 협곡 쪽 면이 곧은 벽) */
  const RED=[1.12,0.78,0.60];
  for(let k=6;k<L-6;k+=5){ const i=path[k], j=path[Math.min(L-1,k+3)], ax=(j%N)-(i%N), az=((j/N)|0)-((i/N)|0), al=Math.hypot(ax,az)||1, nx=-az/al, nz=ax/al;
    const t=k/(L-1), dep=D0*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.15)),0.6);
    for(const sd of [-1,1]){ const off=floorW+wallW*0.55+rnd()*4, x=((i%N)-N/2)*CELL+nx*sd*off, z=(((i/N)|0)-N/2)*CELL+nz*sd*off;
      const nm=rnd()<0.6?'cliffside_rock_face':'stonecliff_plateau', S=dep*0.95, g=heightAt(x,z);
      GEO_LF.list.push({name:nm,x,z,y:g-S*0.85,S,yaw:Math.atan2(nx*sd,nz*sd)+(rnd()-0.5)*0.4,tint:RED}); } }
}
/* ── 시스택 — 바닷가 앞바다의 돌기둥 ── */
function geoStacks(rnd){
  const ST=['solitary_sea_monolith','stone_sentinel','red_rock_sentinel'], placed=[];
  for(let t=0;t<9000&&placed.length<9;t++){ const gx=8+((rnd()*(N-16))|0), gz=8+((rnd()*(N-16))|0), i=gz*N+gx, e=F.elev[i];
    if(e>-1||e<-8||F.dWater[i]>0) { /* 바다 칸만 */ }
    if(!(e<-1&&e>-8)) continue;
    let coast=false; for(let r=3;r<=12&&!coast;r+=3) for(const d of [[r,0],[-r,0],[0,r],[0,-r]]){ const j=(gz+d[1])*N+gx+d[0]; if(F.elev[j]>2) { coast=true; break; } }
    if(!coast) continue;
    const x=(gx-N/2)*CELL, z=(gz-N/2)*CELL; if(placed.some(p=>Math.hypot(p.x-x,p.z-z)<350)) continue;
    const S=28+rnd()*45, nm=ST[(rnd()*ST.length)|0];
    geoStamp(nm,x,z,e-2,S,rnd()*6.283,nm==='red_rock_sentinel'?[1.1,0.8,0.62]:[0.95,0.94,0.9],{biome:B.ROCK,inset:0.4});
    placed.push({x,z}); }
}
/* ── 호수 · 저수지 — 강이 아무 데서나 솟지 않게(2026-11-04 사용자 요청) ──
   실제 강은 샘 · 호수 · 늪에서 시작한다 — 비탈이 누그러진 오목한 데에 물이 고였다가 넘쳐 흘러나간다(넘침 어귀 = 강의 시작).
   물길의 머리(위쪽으로 이어진 물길 칸이 없는 칸)마다, 그 바로 위 오르막 쪽에 둥근 분지(반지름 25~65 m · 깊이 3~7 m)를 파고
   분지 테두리의 가장 낮은 높이 바로 밑까지 물을 채운다(물 칸 = 물길 칸 · 수위 = 테두리 − 0.3 m) — 그 낮은 테두리로 물이 넘쳐 강이 된다.
   높은 데(눈선 밑) · 서로 350 m 넘게 · 열넷까지 */
function geoLakes(rnd){
  const h=F.elev, R=F.river, heads=[];
  for(let z=3;z<N-3;z++) for(let x=3;x<N-3;x++){ const i=z*N+x; if(!R[i]||h[i]<6) continue;
    let up=false; for(const d of [-1,1,-N,N,-N-1,-N+1,N-1,N+1]){ const j=i+d; if(R[j]&&F.flow[j]<F.flow[i]) { up=true; break; } }
    if(!up) heads.push(i); }
  heads.sort((a,b)=>F.flow[b]-F.flow[a]||h[b]-h[a]);
  const lakes=[];
  for(const i of heads){ if(lakes.length>=14) break;
    const x=(i%N-N/2)*CELL, z=(((i/N)|0)-N/2)*CELL; if(lakes.some(l=>Math.hypot(l.x-x,l.z-z)<350)) continue;
    const gs=groundSlope(x,z,CELL), gl=Math.hypot(gs[0],gs[1])||1, ux=-gs[0]/gl, uz=-gs[1]/gl;     // 오르막 쪽
    const r=25+rnd()*40, cx=x+ux*r*0.9, cz=z+uz*r*0.9, dep=3+rnd()*4;
    const gx0=Math.max(2,Math.floor((cx-r*1.4)/CELL+N/2)), gx1=Math.min(N-3,Math.ceil((cx+r*1.4)/CELL+N/2)), gz0=Math.max(2,Math.floor((cz-r*1.4)/CELL+N/2)), gz1=Math.min(N-3,Math.ceil((cz+r*1.4)/CELL+N/2));
    let rim=1e9; const ring=[], basin=[];
    for(let gz=gz0;gz<=gz1;gz++) for(let gx=gx0;gx<=gx1;gx++){ const wx=(gx-N/2)*CELL, wz=(gz-N/2)*CELL, d=Math.hypot(wx-cx,wz-cz)/r, j=gz*N+gx;
      if(d<1.0) basin.push([j,d]); else if(d<1.25){ ring.push(j); if(h[j]<rim) rim=h[j]; } }
    if(!basin.length||!(rim<1e8)||rim<4) continue;
    const lvl=rim-0.3;
    for(const [j,d] of basin){ const floor=lvl-dep*(1-d*d); if(floor<h[j]) h[j]=floor; if(h[j]<lvl){ R[j]=1; F.wlev[j]=lvl; F.biome[j]=B.RIVER; } }
    lakes.push({x:cx,z:cz,r,lvl}); }
  GEO_LF.lakes=lakes;
}
/* 섬을 지을 때 — 다 키운 뒤 · 자원 놓기 전(90-init.js) · 매끈한 땅 섬만 · 제 난수 */
function geoLandforms(seed){
  GEO_LF.list.length=0; TERR_U.uSnow.value=1e4;
  if(!P.sm||typeof GEO_MESH_DATA==='undefined') return;
  const rnd=mulberry32((seed^0x6e0f)>>>0);
  let hi=0; for(let i=0;i<N*N;i++) if(F.elev[i]>hi) hi=F.elev[i]; GEO_LF.hi0=hi;
  geoCanyon(rnd);
  const top=geoRange(rnd);
  geoStacks(rnd);
  geoLakes(mulberry32((seed^0x1a4e)>>>0));
  if(top>0) TERR_U.uSnow.value=Math.max(220,top*0.58);
  computeSlope();
}
/* 그리기 — 모형마다 메시 하나(가까이/멀리 두 단계 · 화면 밖은 three 가 거른다) */
function geoMat(){
  if(GEO_LF.mat) return GEO_LF.mat;
  const m=rockMat('granite',0x8a857c); m.vertexColors=true;
  const prev=m.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{ prev(sh,r); sh.uniforms.uSnow=TERR_U.uSnow;
    sh.fragmentShader='uniform float uSnow;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      ${TERR_U.uRk?'':'/*'}{ // 큰 결 — 바위 사진을 큰 배율(11 m)로 세 방향에서 한 번 더(넓은 풍화 얼룩 · 반복이 덜 보인다)
        vec3 gn0=normalize(vRN), tw0=pow(abs(gn0),vec3(4.0)); tw0/=tw0.x+tw0.y+tw0.z+1e-4;
        vec3 mac=texture(uRk,vec3(vRW.zy/11.0,0.0)).rgb*tw0.x+texture(uRk,vec3(vRW.xz/11.0,1.0)).rgb*tw0.y+texture(uRk,vec3(vRW.xy/11.0,2.0)).rgb*tw0.z;
        diffuseColor.rgb*=0.55+0.9*dot(mac,vec3(0.333)); }${TERR_U.uRk?'':'*/'}
      { /* 눈 — 눈선 위 · 위를 보는 면(가파른 벽엔 안 붙는다 · 바람에 쌓인 자리는 들쭉날쭉) */
        vec3 gn=normalize(vRN); float sk=smoothstep(uSnow-30.0,uSnow+40.0,vRW.y+sin(vRW.x*0.031)*18.0+sin(vRW.z*0.027)*14.0)*smoothstep(0.30,0.70,gn.y);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.90,0.92,0.96),sk); }`); };
  const k0=m.customProgramCacheKey; m.customProgramCacheKey=()=>(k0?k0():'')+'geo';
  return GEO_LF.mat=m;
}
function geoBuild(){
  for(const m of GEO_LF.meshes){ scene.remove(m); } GEO_LF.meshes.length=0;
  if(!GEO_LF.list.length) return;
  const base=geoMat();
  for(const L of GEO_LF.list){
    const mat=base.clone(); mat.onBeforeCompile=base.onBeforeCompile; mat.customProgramCacheKey=base.customProgramCacheKey; mat.color.setRGB(0.54*L.tint[0],0.52*L.tint[1],0.49*L.tint[2]);
    if(base.userData.rkU) mat.userData=Object.assign({},base.userData);
    const m=new THREE.Mesh(geoMeshGeo(L.name,'far'),mat);
    m.position.set(L.x,L.y,L.z); m.rotation.y=L.yaw; m.scale.set(L.S,L.S,L.S); m.userData.geo=L; m.userData.lightRole='full';
    m.updateMatrix(); m.matrixAutoUpdate=false; scene.add(m); GEO_LF.meshes.push(m); }
}
/* 가까우면 촘촘한 꼴로(1초에 한 번) */
let _geoT=0;
function updateGeoMeshes(dt){
  if(!GEO_LF.meshes.length||(_geoT-=dt)>0) return; _geoT=1;
  const cx=camera.position.x, cz=camera.position.z;
  for(const m of GEO_LF.meshes){ const L=m.userData.geo, r=L.S*0.9, d=Math.hypot(L.x-cx,L.z-cz)-r, want=d<Math.max(350,L.S*4)?'near':'far';
    if(m.userData.lod!==want){ m.userData.lod=want; m.geometry=geoMeshGeo(L.name,want); } }
}
