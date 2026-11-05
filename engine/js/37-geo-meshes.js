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
/* 모형 윗면의 높이 지도 — 격자 점마다 **그 점을 위에서 덮는 가장 높은 세모의 참 높이**(무게중심 좌표로)를 적는다(2026-11-05).
   예전엔 세모가 걸친 칸마다 그 세모의 가장 높은 꼭짓점을 적어(128² · 두 번 흐림) 땅이 모형보다 몇 m 씩 낮거나 높았고, 그래서 땅을 모형 밑으로
   깊이 묻었다(inset) — 산 가까이 가면 사람이 그 묻힌 땅을 딛고 모형 **속**에 서서 산의 안쪽 면이 보였다(사용자 지적: 가까이 가면 산이 무너진다).
   H = 참 윗면(사람이 딛는 높이 · geoFloor) · Hs = 한 번 흐린 것(땅에 찍는다). 가장 고운 단계(ultra 가 있으면 그것)로 센다 */
function geoTop(name){
  if(GEO_LF.top[name]) return GEO_LF.top[name];
  const D=GEO_MESH_DATA[name], g=geoMeshGeo(name,D.ultra?'ultra':'near'), P=g.attributes.position.array, I=g.index.array, R=256;
  g.computeBoundingBox(); const b=g.boundingBox, H=new Float32Array(R*R).fill(-1);
  const sx=(R-1)/(b.max.x-b.min.x), sz=(R-1)/(b.max.z-b.min.z);
  for(let t=0;t<I.length;t+=3){ const A=I[t]*3, B2=I[t+1]*3, C=I[t+2]*3;
    const ax=(P[A]-b.min.x)*sx, az=(P[A+2]-b.min.z)*sz, bx=(P[B2]-b.min.x)*sx, bz=(P[B2+2]-b.min.z)*sz, cx=(P[C]-b.min.x)*sx, cz=(P[C+2]-b.min.z)*sz;
    const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz); if(Math.abs(den)<1e-9) continue;                 // 위에서 보면 선인 세모(곧은 벽)
    const x0=Math.max(0,Math.ceil(Math.min(ax,bx,cx))), x1=Math.min(R-1,Math.floor(Math.max(ax,bx,cx))), z0=Math.max(0,Math.ceil(Math.min(az,bz,cz))), z1=Math.min(R-1,Math.floor(Math.max(az,bz,cz)));
    for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){
      const w0=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/den, w1=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/den, w2=1-w0-w1;
      if(w0<-1e-4||w1<-1e-4||w2<-1e-4) continue;
      const y=w0*P[A+1]+w1*P[B2+1]+w2*P[C+1], i=z*R+x; if(y>H[i]) H[i]=y; } }
  /* 빈 점(가는 세모 사이 · 줄이며 생긴 구멍)은 이웃으로 메운다 */
  for(let it=0;it<3;it++){ const H2=H.slice(); for(let z=1;z<R-1;z++) for(let x=1;x<R-1;x++){ const i=z*R+x; if(H[i]>=0) continue; let sm=0,n=0;
      for(const j of [i-1,i+1,i-R,i+R]) if(H[j]>=0){ sm+=H[j]; n++; } if(n>=2) H2[i]=sm/n; } H.set(H2); }
  const Hs=H.slice(); for(let z=1;z<R-1;z++) for(let x=1;x<R-1;x++){ const i=z*R+x; if(H[i]<0) continue; let sm=0,n=0;
    for(const j of [i,i-1,i+1,i-R,i+R]) if(H[j]>=0){ sm+=H[j]; n++; } Hs[i]=sm/n; }
  return GEO_LF.top[name]={H,Hs,R,b};
}
/* 모형 좌표의 윗면 높이(0~1 · 없으면 −1) — 쌍선형 */
function geoTopAt(T,lx,lz,smooth){
  const b=T.b, R=T.R, u=(lx-b.min.x)/(b.max.x-b.min.x)*(R-1), v=(lz-b.min.z)/(b.max.z-b.min.z)*(R-1);
  if(u<0||v<0||u>R-1||v>R-1) return -1;
  const iu=Math.min(R-2,u|0), iv=Math.min(R-2,v|0), fu=u-iu, fv=v-iv, Hh=smooth?T.Hs:T.H;
  const h00=Hh[iv*R+iu], h10=Hh[iv*R+iu+1], h01=Hh[(iv+1)*R+iu], h11=Hh[(iv+1)*R+iu+1];
  if(Math.min(h00,h10,h01,h11)<0) return Math.max(h00,h10,h01,h11)<0?-1:Math.max(h00,h10,h01,h11);
  return (h00*(1-fu)+h10*fu)*(1-fv)+(h01*(1-fu)+h11*fu)*fv;
}
/* 그 자리가 큰 지형 모형의 자락 안인가(모형 너비의 0.8 배 안) — 큰 바위 무리(33-crags.js cragSites)가 모형 앞에 안 쌓이게 */
function geoNear(x,z){ for(const L of GEO_LF.list){ const W=GEO_MESH_DATA[L.name].w, r=Math.max(W[0],W[2])*L.S*0.62; if((x-L.x)*(x-L.x)+(z-L.z)*(z-L.z)<r*r) return true; } return false; }
/* 딛는 높이 — 큰 지형 모형의 참 윗면(사람 · 물체가 모형 위에 선다 · 62-build.js floorAt). 가장 높은 것 · 없으면 −1e9.
   GEO_LF.slope 에 그 면의 비탈(높이차/수평)을 남긴다 — 걷기 판정이 바위 면의 비탈로 본다 */
function geoFloor(x,z){
  GEO_LF.slope=0; const Ls=GEO_LF.list; if(!Ls.length) return -1e9;
  let best=-1e9, bL=null;
  for(let k=0;k<Ls.length;k++){ const L=Ls[k]; if(L.hw===undefined){ const W=GEO_MESH_DATA[L.name].w; L.hw=Math.max(W[0],W[2])*L.S*0.75; L.cy=Math.cos(L.yaw); L.sy=Math.sin(L.yaw); }
    const wx=x-L.x, wz=z-L.z; if(wx*wx+wz*wz>L.hw*L.hw) continue;
    const T=geoTop(L.name), lx=(wx*L.cy-wz*L.sy)/L.S, lz=(wx*L.sy+wz*L.cy)/L.S, t=geoTopAt(T,lx,lz,false); if(t<0) continue;
    const y=L.y+t*L.S; if(y>best){ best=y; bL=L; } }
  if(bL){ const e=2.0, T=geoTop(bL.name), f=(dx,dz)=>{ const wx=x+dx-bL.x, wz=z+dz-bL.z, t=geoTopAt(T,(wx*bL.cy-wz*bL.sy)/bL.S,(wx*bL.sy+wz*bL.cy)/bL.S,false); return t<0?best:bL.y+t*bL.S; };
    GEO_LF.slope=Math.hypot(f(e,0)-f(-e,0),f(0,e)-f(0,-e))/(2*e)+1e-4; }
  return best;
}
/* 모형 하나를 섬에 세운다 — (x,z) 가운데 · y 밑면 · S 높이(m) · yaw · 빛깔. 표고를 그 윗면까지 올리거나(raise) 그 높이로 맞춘다 */
function geoStamp(name,x,z,y,S,yaw,tint,o){
  o=o||{}; const T=geoTop(name), c=Math.cos(yaw), s=Math.sin(yaw), W=GEO_MESH_DATA[name].w;
  const hw=Math.max(W[0],W[2])*S*0.72, gx0=Math.max(1,Math.floor((x-hw)/CELL+N/2)), gx1=Math.min(N-2,Math.ceil((x+hw)/CELL+N/2)),
        gz0=Math.max(1,Math.floor((z-hw)/CELL+N/2)), gz1=Math.min(N-2,Math.ceil((z+hw)/CELL+N/2));
  const e=CELL*0.5/S;                                                                        // 반 칸 — 그 사이의 기복(가파를수록 땅을 조금 더 묻는다)
  for(let gz=gz0;gz<=gz1;gz++) for(let gx=gx0;gx<=gx1;gx++){
    const wx=(gx-N/2)*CELL-x, wz=(gz-N/2)*CELL-z, lx=(wx*c-wz*s)/S, lz=(wx*s+wz*c)/S;      // 세계 → 모형(돌림을 되돌리고 줄임)
    const t=geoTopAt(T,lx,lz,true); if(t<0.04) continue;                                    // 모형 밖 · 가장자리(밑면 자락)
    let lo=t; for(const d of [[e,0],[-e,0],[0,e],[0,-e]]){ const v=geoTopAt(T,lx+d[0],lz+d[1],true); if(v>=0&&v<lo) lo=v; }
    /* 땅은 모형 윗면 바로 밑에(1.2 m + 반 칸 안에서 내려가는 만큼의 반) — 사람은 모형 윗면을 딛는다(geoFloor). 예전엔 3~17 m + 비탈×높이×0.8 이나 묻어
       가까이 가면 땅을 딛은 사람이 모형 속에 섰다 */
    const i=gz*N+gx, top=y+t*S-(o.inset!==undefined?o.inset:1.2+(t-lo)*S*0.5);
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
  GEO_LF.canyonLen=path?path.length:0; GEO_LF.canyon=path;
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
  /* 바닥 높이는 **파기 전 높이**에서 잰다 — 예전엔 앞 걸음이 판 물길 칸을 다음 걸음이 다시 기준으로 삼아 깊이가 걸음마다 쌓였다
     (2026-11-05 — 시드 CASTAWAY 의 협곡이 해수면 밑 1,354 m 까지 꺼져 협곡 끝이 바닥 없는 구멍이었다 · 사용자 지적 '협곡 끝이 이상하다').
     바닥은 하천을 따라 내려가기만 하게(앞 걸음 바닥보다 높아지지 않게) 고른다 */
  const H0=new Float32Array(L); let fl=1e9;
  for(let k=0;k<L;k++){ fl=Math.min(fl,h[path[k]]); H0[k]=fl; }
  for(let k=0;k<L;k++){ const i=path[k], px=i%N, pz=(i/N)|0, t=k/(L-1), base=H0[k], dep=Math.min(D0*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.15)),0.6),Math.max(0,base-4));   // 양 끝은 얕게 · 바닥은 바다보다 4 m 위(밑이면 물속으로 친다)
    const r=Math.ceil((floorW+wallW)/CELL)+1;
    for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ const j=(pz+dz)*N+px+dx, d=Math.hypot(dx,dz)*CELL;
      const f=d<floorW?1:1-smoothstep(floorW,floorW+wallW,d); if(f<=0) continue;
      const nh=base-dep*f*(F.river[j]?1:Math.min(1,f*1.3)); if(nh<h[j]){ h[j]=nh; if(F.river[j]) F.wlev[j]=Math.min(F.wlev[j]||nh,nh+0.6); F.biome[j]=f>0.95?B.RIVER:B.ROCK; } } }
  /* 벽 — 가장자리를 따라 양쪽으로 붉은 사암 벼랑(모형 윗면이 가장자리 높이 · 협곡 쪽 면이 곧은 벽) */
  const RED=[1.04,0.90,0.80];   // 사암의 빛깔은 지질도가 준다(협곡 = 사암) — 여기선 조금만
  for(let k=6;k<L-6;k+=5){ const i=path[k], j=path[Math.min(L-1,k+3)], ax=(j%N)-(i%N), az=((j/N)|0)-((i/N)|0), al=Math.hypot(ax,az)||1, nx=-az/al, nz=ax/al;
    const t=k/(L-1), dep=Math.min(D0*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.15)),0.6),Math.max(0,H0[k]-4)); if(dep<12) continue;
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
    geoStamp(nm,x,z,e-2,S,rnd()*6.283,nm==='red_rock_sentinel'?[1.04,0.90,0.80]:[0.95,0.94,0.9],{biome:B.ROCK,inset:0.4});
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
/* ── 지질도 — 그 자리의 바위가 무엇인가(2026-11-05 사용자 요청: 바위 결이 어색하고 너무 알록달록하다 · 어느 바위가 어디에 어떤 결로 나는지 찾아 맞춰라) ──
   화산섬의 바위 넷을 실제로 나는 자리대로 칸마다 나눈다(자원 바위의 갈래 `surfaceRocks` · 굴 갈래 `cv10Kind` 와 같은 높이 문턱):
   · 현무암 — 분기공 둘레(용암이 식은 검은 돌) + **바닷가 벼랑**(화산섬의 해안 절벽은 용암층이 파도에 깎인 검은 벽 — 제주 · 하와이 · 아이슬란드).
     잿빛~검정 · 잔 기공 · 세로 기둥 금 → 바위 사진 4(검고 고운 바닷가 바위) · 2(금 간 바위)
   · 사암 — 바다 가까운 낮은 모래땅(해빈암) + **마른 땅**(관목 바이옴 · 습도 낮음 — 사막의 붉은 켜 바위) + **협곡 벽**(물이 판 켜 바위 — 콜로라도 고원).
     담황~붉은 갈색 · 가로 켜 → 사진 1(켜켜이 쌓인 사암 벼랑)
   · 석회암 — 낮은 땅(높이 0.35 밑 · 바위밭이 아니면 0.5 밑 — 얕은 바다 밑 조개껍데기가 굳어 솟은 흰 돌). 젖은 데일수록(카르스트는 빗물이 녹여 만든다).
     흰빛~옅은 잿빛 · 빗물에 녹은 구멍과 골 → 사진 0(잿빛 벼랑 면)을 밝고 빛깔 없이 · 5(지의류)
   · 화강암 — 그 밖(높은 산 · 바위밭 · 높은 봉우리 모형). 옅은 잿빛에 조금 분홍 · 판처럼 벗겨지는 둥근 면 · 지의류 → 사진 0 · 2 · 5
   경계는 높이 등고선을 그대로 따르지 않게 600 m 잡음으로 흔들고(지층 경계는 땅을 비스듬히 지난다), 세 칸만큼 흐려 섞는다.
   RGBA = 현무암 · 사암 · 석회암 · 화강암의 몫(합 255). 땅 셰이더의 벼랑 면 · 큰 바위(cragMat) · 큰 지형 모형(geoMat) · 넓은 땅의 바위가 읽는다(`uGeo`) */
function geolBuild(){
  const n=N*N, e=F.elev; let hi=1; for(let i=0;i<n;i++) if(e[i]>hi) hi=e[i];
  const W=new Float32Array(n*4), rnd=mulberry32((hashStr(String(P.seed))^0x6e01)>>>0);
  const G=16, gn=new Float32Array((G+1)*(G+1)); for(let k=0;k<gn.length;k++) gn[k]=rnd();      // 600 m 쯤의 값잡음(배율 4.25 섬에서 칸 G 개)
  const vn=(x,z)=>{ const fx=x/N*G, fz=z/N*G, ix=Math.min(G-1,fx|0), iz=Math.min(G-1,fz|0), u=fx-ix, v=fz-iz, a=gn[iz*(G+1)+ix], b=gn[iz*(G+1)+ix+1], c=gn[(iz+1)*(G+1)+ix], d=gn[(iz+1)*(G+1)+ix+1];
    const su=u*u*(3-2*u), sv=v*v*(3-2*v); return (a*(1-su)+b*su)*(1-sv)+(c*(1-su)+d*su)*sv; };
  const fc=fumaCenter, fr=Math.max(1,fc.r), ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){ const i=z*N+x, h=e[i], b=F.biome[i], m=F.moist[i], j=(vn(x,z)-0.5)*0.12, hr=h/hi+j;
    const wx=(x-N/2)*CELL, wz=(z-N/2)*CELL, fd=fc.r>0?Math.hypot(wx-fc.x,wz-fc.z)/fr:99;
    let wB=Math.max(Math.min(1,F.fuma[i]*6), fc.r>0?ss(2.8,1.8,fd):0);
    if(h>-2&&hr<0.30&&F.slope[i]>0.55&&F.dWater[i]<CELL*14) wB=Math.max(wB,ss(0.55,0.9,F.slope[i])*ss(0.30,0.18,hr));   // 바닷가 벼랑
    let wS=(hr<0.20&&(b===B.BEACH||b===B.DUNE||F.dWater[i]<25))?1:0;
    if(b===B.SCRUB) wS=Math.max(wS,0.85); wS=Math.max(wS,ss(0.34,0.16,m)*0.9);                 // 마른 땅
    const low=b===B.ROCK||b===B.SCREE?ss(0.38,0.32,hr):ss(0.52,0.46,hr);
    let wL=low*(0.55+0.45*ss(0.25,0.6,m)), wG=Math.max(0,1-low)+(b===B.ROCK||b===B.SCREE?0.3:0);
    const t=Math.max(wB,wS); wL*=1-t; wG*=1-t;
    W[i*4]=wB; W[i*4+1]=wS; W[i*4+2]=wL; W[i*4+3]=wG; }
  /* 협곡 벽 · 봉우리 모형 자리는 정해 둔다(협곡 = 사암 · 산 = 화강암) */
  const stamp=(cx,cz,r,ch)=>{ const g0x=Math.max(0,Math.floor((cx-r)/CELL+N/2)), g1x=Math.min(N-1,Math.ceil((cx+r)/CELL+N/2)), g0z=Math.max(0,Math.floor((cz-r)/CELL+N/2)), g1z=Math.min(N-1,Math.ceil((cz+r)/CELL+N/2));
    for(let gz=g0z;gz<=g1z;gz++) for(let gx=g0x;gx<=g1x;gx++){ const d=Math.hypot((gx-N/2)*CELL-cx,(gz-N/2)*CELL-cz)/r; if(d>=1) continue; const k=(gz*N+gx)*4, f=ss(1,0.6,d);
      for(let c=0;c<4;c++) W[k+c]=W[k+c]*(1-f)+(c===ch?f:0); } };
  if(GEO_LF.canyon) for(let k=0;k<GEO_LF.canyon.length;k+=2){ const i=GEO_LF.canyon[k]; stamp((i%N-N/2)*CELL,(((i/N)|0)-N/2)*CELL,90+CELL*3,1); }
  for(const L of GEO_LF.list){ if(/peak/.test(L.name)) stamp(L.x,L.z,L.S*0.9,3); else if(/sea_monolith|sentinel/.test(L.name)&&!/red/.test(L.name)) stamp(L.x,L.z,L.S*1.2,0); }
  /* 세 칸 흐림(가로 · 세로 두 번) → 합이 255 가 되게 */
  const tmp=new Float32Array(n*4), R=3;
  for(let pass=0;pass<2;pass++){ const src=pass?tmp:W, dst=pass?W:tmp;
    for(let z=0;z<N;z++) for(let x=0;x<N;x++){ const o=(z*N+x)*4; let a=0,b2=0,c=0,d=0,cnt=0;
      for(let k=-R;k<=R;k++){ const xx=pass?x:Math.min(N-1,Math.max(0,x+k)), zz=pass?Math.min(N-1,Math.max(0,z+k)):z, q=(zz*N+xx)*4; a+=src[q]; b2+=src[q+1]; c+=src[q+2]; d+=src[q+3]; cnt++; }
      dst[o]=a/cnt; dst[o+1]=b2/cnt; dst[o+2]=c/cnt; dst[o+3]=d/cnt; } }
  const px=new Uint8Array(n*4);
  for(let i=0;i<n;i++){ const o=i*4, s=W[o]+W[o+1]+W[o+2]+W[o+3]||1; let acc=0;
    for(let c=0;c<3;c++){ const v=Math.round(W[o+c]/s*255); px[o+c]=v; acc+=v; } px[o+3]=Math.max(0,255-acc); }
  const tex=new THREE.DataTexture(px,N,N,THREE.RGBAFormat,THREE.UnsignedByteType);
  tex.magFilter=tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false; tex.needsUpdate=true;
  if(TERR_U.uGeo.value&&TERR_U.uGeo.value.image&&TERR_U.uGeo.value.image.width>1) TERR_U.uGeo.value.dispose();
  TERR_U.uGeo.value=tex; GEO_LF.geol=px;
}
/* 그 자리 바위 갈래(0 현무암 · 1 사암 · 2 석회암 · 3 화강암) — 가장 큰 몫 */
function geolAt(x,z){ const px=GEO_LF.geol; if(!px) return 3; const gx=Math.min(N-1,Math.max(0,Math.round(x/CELL+N/2))), gz=Math.min(N-1,Math.max(0,Math.round(z/CELL+N/2))), o=(gz*N+gx)*4;
  let k=0; for(let c=1;c<4;c++) if(px[o+c]>px[o+k]) k=c; return k; }
/* 그리기 — 모형마다 메시 하나(가까이/멀리 두 단계 · 화면 밖은 three 가 거른다) */
function geoMat(){
  if(GEO_LF.mat) return GEO_LF.mat;
  const m=rockMat('granite',0x8a857c); m.vertexColors=true; m.userData.rkU.uRkGeo.value=1;   // 그 자리 지질도대로
  m.side=THREE.DoubleSide;   // 줄인 모형의 틈 · 밑면 없는 데로 속이 들여다보이지 않게(뒷면도 바위로 그린다)
  const prev=m.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{ prev(sh,r); sh.uniforms.uSnow=TERR_U.uSnow;
    if(typeof CV10_COMMON_GLSL!=='undefined'){                    // 지형 판 10 굴 — 굴 자리 그림의 구멍(입구 마당 · 빛구멍)을 모형도 비운다(31-cave10.js cv10Sfc — 굴이 모형 윗면을 땅으로 삼는다)
      for(const k of ['uCv10T','uCv10R','uCv10B','uCv10G']) sh.uniforms[k]=TERR_U[k];
      sh.fragmentShader=CV10_COMMON_GLSL+sh.fragmentShader.replace(/void main\s*\(\)\s*\{/,'void main() {\n\tif(cv10HoleM(vRW.xz)) discard;'); }
    sh.fragmentShader='uniform float uSnow;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      ${TERR_U.uRk?'':'/*'}{ // 큰 결 — 바위 사진을 큰 배율(11 m)로 세 방향에서 한 번 더(넓은 풍화 얼룩 · 반복이 덜 보인다)
        vec3 gn0=normalize(vRN), tw0=pow(abs(gn0),vec3(4.0)); tw0/=tw0.x+tw0.y+tw0.z+1e-4;
        float ml0, ml1; geoLay(geoPick(geoW(vRW.xz),0.5),ml0,ml1);                       // 그 자리 바위의 사진으로(예전엔 면 방향마다 0 · 1 · 2 를 박아 윗면이 늘 사암 켜였다)
        vec3 mac=texture(uRk,vec3(vRW.zy/11.0,ml0)).rgb*tw0.x+texture(uRk,vec3(vRW.xz/11.0,ml1)).rgb*tw0.y+texture(uRk,vec3(vRW.xy/11.0,ml0)).rgb*tw0.z;
        diffuseColor.rgb*=0.62+0.76*dot(mac,vec3(0.333)); }${TERR_U.uRk?'':'*/'}
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
  for(const m of GEO_LF.meshes){ const L=m.userData.geo, r=L.S*0.9, d=Math.hypot(L.x-cx,L.z-cz)-r;
    const want=d<Math.max(120,L.S*0.6)&&GEO_MESH_DATA[L.name].ultra?'ultra':d<Math.max(350,L.S*4)?'near':'far';   // 산 곁(봉우리 높이의 0.6 배 안)은 가장 고운 꼴
    if(m.userData.lod!==want){ m.userData.lod=want; m.geometry=geoMeshGeo(L.name,want); } }
}
