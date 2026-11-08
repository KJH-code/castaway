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
const CRAG={T:320, S:80, MID:60, NEAR:140, FAR:720, DROP:1050, tiles:new Map(), cols:[], cg:new Map(), ix:new Map(), n:0, blobs:0, shapes:null, mat:null, matFar:null, t:0, F:15, BK:10, slope:0};
function cragMat(){
  if(CRAG.mat) return CRAG.mat;
  const m=rockMat('granite',0x7a7872); m.vertexColors=true; m.userData.rkU.uRkGeo.value=1;   // 그 자리 지질도대로 사진 · 빛깔(37-geo-meshes.js geolBuild)
  m.defines=Object.assign({},m.defines,{RK_OFS:1});   // 덩이마다 무늬를 비킨다(20-terrain.js rockMat)
  /* 앞면만(2026-11-08 사용자 사진 — 바위에 검은 세모): 양면이면 모형을 줄이며 생긴 '뒤집혀 접힌 세모'(위를 보는 겉에서 아래를 보는 세모)의 뒷면이 어둡게 칠해져
     구멍처럼 보였다. 모형은 이제 틈이 없고(열린 모서리 0) 차례도 고른다(geoOrient) — 예전 양면은 2026-11-05 의 틈 · 열린 밑면 때문이었다 */
  m.side=THREE.FrontSide;
  if(m.userData.rkU) m.userData.rkU.uRkCrack.value=0.14;   // 금은 드물고 옅게(그물처럼 친 금이 지그재그로 보였다 — 사용자 지적 2026-11-04)
  return CRAG.mat=m;
}
function cragMatFar(){
  if(CRAG.matFar) return CRAG.matFar;
  const m=new THREE.MeshLambertMaterial({color:0x6f6d66,vertexColors:true}); m.userData.melt=0.5; m.userData.meltAttr=true; m.side=THREE.FrontSide;   // 앞면만(위 cragMat 과 같은 까닭)
  /* 먼 바위(140 m 밖)도 **바위 사진**을 입는다(사용자 요청) — 가까운 재질(rockMat)과 같은 잡음으로 같은 장을 고르되, 섞지 않고 많이 섞인 쪽
     한 장만 세 방향으로 읽는다(법선 지도 · 이끼 · 금은 없다 — 멀어서 안 보인다). 메시는 세계 좌표로 합쳐져 있어 정점의 자리·법선이 곧 세계 값이다 */
  if(TERR_U.uRk){
    m.onBeforeCompile=sh=>{
      sh.uniforms.uRk=TERR_U.uRk; sh.uniforms.uGeo=TERR_U.uGeo; sh.uniforms.uBioN=TERR_U.uBioN; sh.uniforms.uCell=TERR_U.uCell;
      sh.vertexShader='varying vec3 vFW;\nvarying vec3 vFN;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFW=(modelMatrix*vec4(transformed,1.0)).xyz; vFN=normal;');
      sh.fragmentShader=`uniform mediump sampler2DArray uRk;
uniform float uBioN, uCell;
${GEOL_GLSL}
varying vec3 vFW;
varying vec3 vFN;
float frh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float frn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(frh(i),frh(i+vec3(1,0,0)),f.x),mix(frh(i+vec3(0,1,0)),frh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(frh(i+vec3(0,0,1)),frh(i+vec3(1,0,1)),f.x),mix(frh(i+vec3(0,1,1)),frh(i+vec3(1,1,1)),f.x),f.y),f.z); }
`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        { vec3 p=vFW, n=normalize(vFN), tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4;
          vec4 gw=geoW(p.xz); float la, lb; geoLay(geoPick(gw,frn(p/9.0+vec3(3.1,0.7,7.7))*0.7+0.15),la,lb);   // 그 자리 지질도대로(가까운 재질과 같은 갈래)
          bool sb=frn(p/7.0+vec3(5.3,1.9,0.4))>0.5; float L=sb?lb:la; vec3 q=sb?(p/1.7)*0.83+vec3(0.37,0.11,0.59):p/1.7;
          vec3 rk=texture(uRk,vec3(q.zy,L)).rgb*tw.x+texture(uRk,vec3(q.xz,L)).rgb*tw.y+texture(uRk,vec3(q.xy,L)).rgb*tw.z;
          rk=mix(vec3(dot(rk,vec3(0.30,0.59,0.11))),rk,geoSat(gw));
          diffuseColor.rgb*=mix(vec3(1.0),rk*2.0,0.85)*0.93*geoTint(gw); }`);
    };
    m.customProgramCacheKey=()=>'cragfar-rk2';
  }
  return CRAG.matFar=m;
}
/* 바위 꼴 하나 — 같은 시드는 쪼갬 수(w·h)가 달라도 같은 꼴이다(먼 것은 성기게 짓는다).
   **절리로 쪼개진 덩어리**(사용자 지적: 암벽이 감자 더미 같다 · 실제 같은 지형). 실제 벼랑의 큰 바위는 둥글게 닳은 공이 아니라
   절리(서로 거의 직각인 금 세 벌)를 따라 떨어져 나온 모난 덩이다 — 윗면은 판판하고(층리), 옆면은 곧게 서고, 모서리만 조금 닳았다.
     ① 공을 상자 쪽으로 세게 당긴다(초타원 지수 0.8~0.95 — 예전 0.45~0.85 는 둥근 베개였다)
     ② 절리 면 — 여섯 방향(±x · ±y · ±z)을 조금씩 기울인 평면으로 자른다. 꼴마다 같은 방향 틀이라, 무리 안 덩이들을 같은 쪽으로
        돌려 세우면(cragGrow) 이웃 덩이의 면이 나란해져 한 벼랑이 쪼개진 것으로 읽힌다
     ③ 모서리를 비스듬히 떼어 낸 면 2~4 장 · 층리 — 높이를 따라 얕은 턱(가로 홈)
     ④ 잔 울퉁불퉁은 깎은 면 위에만 옅게(면은 판판하게 남는다) · 법선은 깎은 면이면 그 면의 법선(모서리만 둥글게 잇는다) */
function cragShape(seed,w,h){
  const g=new THREE.SphereGeometry(1,w,h), p=g.attributes.position, rnd=mulberry32((seed^0x3c6ef3)>>>0);
  /* **둥글게 닳은 절리 덩이**(2026-11-04 사용자 지적 — 네모 상자 같다 · 실제 바위처럼): 화강암 토르는 땅속에서 절리를 따라 스며든 물이
     모서리부터 갉아 먹어(구상 풍화) 덩이가 둥근 베개 꼴(핵석)이 되고, 땅 위로 드러나면 그 둥근 덩이가 켜켜이 쌓인 채 남는다. 그래서 상자 쪽으로는
     조금만 당기고(0.30~0.48) 절리 면은 얕게 깎는다(모서리가 넓게 둥글다) */
  const box=0.72+rnd()*0.18, C=[], L=[];   // 지층 덩이 — 모난 판(2026-11-04 사용자 사진: 벼랑은 켜켜이 쌓인 모난 바위다 · 둥근 감자 더미가 아니라)
  for(let i=0;i<3;i++){ let x=rnd()*2-1, y=rnd()*2-1, z=rnd()*2-1; const l=Math.hypot(x,y,z)||1; L.push([x/l,y/l,z/l,1.1+rnd()*1.6,rnd()*6.283,rnd()*2-1]); }
  /* 절리 면 여섯 — 축마다 ±, 18° 안팎으로 기울이고 깊이(0.70~0.95)를 들쭉날쭉하게 */
  const AX=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  for(const a of AX){ let x=a[0]+(rnd()-0.5)*0.34, y=a[1]+(rnd()-0.5)*(a[1]?0.18:0.30), z=a[2]+(rnd()-0.5)*0.34; const l=Math.hypot(x,y,z)||1;
    C.push([x/l,y/l,z/l,(a[1]>0?0.70:0.72)+rnd()*0.20]); }
  for(let i=0,n=2+((rnd()*3)|0);i<n;i++){ let x=rnd()*2-1, y=(rnd()*2-1)*0.8, z=rnd()*2-1; const l=Math.hypot(x,y,z)||1; C.push([x/l,y/l,z/l,0.80+rnd()*0.22]); }   // 모서리를 떼어 낸 면
  const lay=5+rnd()*6, lp=rnd()*6.283, cut=new Int8Array(p.count).fill(-1);
  for(let i=0;i<p.count;i++){ let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const ux=x, uy=y, uz=z;
    const k=Math.pow(Math.max(Math.abs(x),Math.abs(y),Math.abs(z)),-box); x*=k; y*=k; z*=k;            // 상자 쪽으로
    let f=0; for(const l of L) f+=l[5]*Math.sin(l[3]*(x*l[0]+y*l[1]+z*l[2])+l[4]);
    const tr=Math.abs(((y*lay+lp/6.283)%1+1)%1-0.5)*2;                                               // 층리 — 0(켜의 가운데) ~ 1(켜의 경계)
    const s=(1+0.035*f-0.022*Math.pow(tr,6))*(1+0.045*SHP.rough(ux,uy,uz,seed,1.9,4))*(1+0.07*(SHP.jag(ux,uy,uz,seed^0x6a,2.6,3)-0.25)); x*=s; y*=s; z*=s;
    for(let ci=0;ci<C.length;ci++){ const c=C[ci], d=x*c[0]+y*c[1]+z*c[2]-c[3]; if(d>0){ x-=c[0]*d; y-=c[1]*d; z-=c[2]*d; cut[i]=ci; } }
    /* 깎은 면에도 잔 결 — 면을 따라 0.6% 만(판판함은 남긴다) */
    if(cut[i]>=0){ const c=C[cut[i]], e=0.012*SHP.rough(ux*1.7,uy*1.7,uz*1.7,seed^0x51,2.2,3); x+=c[0]*e; y+=c[1]*e; z+=c[2]*e; }
    p.setXYZ(i,x,y,z); }
  g.computeVertexNormals(); SHP.weldSeam(g,w);
  /* 깎은 면의 점은 그 면의 법선으로(85%) — 면 하나가 한 볕을 받아 모난 덩이로 읽힌다. 면과 면 사이 한 줄만 둥글게 이어진다 */
  const nr=g.attributes.normal;
  for(let i=0;i<p.count;i++){ const ci=cut[i]; if(ci<0) continue; const c=C[ci];
    let x=nr.getX(i)*0.15+c[0]*0.85, y=nr.getY(i)*0.15+c[1]*0.85, z=nr.getZ(i)*0.15+c[2]*0.85; const l=Math.hypot(x,y,z)||1; nr.setXYZ(i,x/l,y/l,z/l); }   // 면 법선은 반만 — 닳은 면이라 볕이 부드럽게 넘어간다
  const o={pos:Float32Array.from(p.array), nor:Float32Array.from(nr.array), idx:Uint16Array.from(g.index.array)};
  g.dispose(); return o;
}
function cragShapes(){
  if(CRAG.shapes) return CRAG.shapes;
  const RES=[[[22,15],[10,7]],[[14,10],[7,5]],[[10,7],[7,5]]], S=[];   // [가까이 촘촘 · 멀리 성김] — 잔 울퉁불퉁이 보이게 가까운 꼴을 곱게(예전 13×9 · 9×6 · 7×5)
  for(let lv=0;lv<3;lv++){ S.push([]); for(let v=0;v<8;v++){ const sd=0xa11+lv*977+v*131; S[lv].push([cragShape(sd,RES[lv][1][0],RES[lv][1][1]),cragShape(sd,RES[lv][0][0],RES[lv][0][1])]); }
    for(let v=0;v<4;v++){ const sd=0x7c01+v*313; S[lv].push([cragPrism(sd,3,6),cragPrism(sd,6,16)]); }      // 8~11: 예전 절벽 기둥(이제 안 씀)
    for(const nm of CRAG_MESHY) S[lv].push([cragMeshy(nm,'tiny'),cragMeshy(nm,lv===0?'far':'tiny')]); }   // 12~: 사용자 Meshy 벼랑 · 바위(cragGrowWall)
  return CRAG.shapes=S;
}
/* 사용자 Meshy 모형(37-geo-meshes.js 자료)을 바위 꼴로 — 상자 [−1,1]³ 에 맞추고 정점 오목함(cav)을 들고 간다(틈을 짙게) */
const CRAG_MESHY=['cliffside_rock_face','stonecliff_plateau','rugged_granite_boulder','stone_sentinel','granite_peaks','jagged_stone_peak'];
function cragMeshy(nm,lod){
  if(typeof GEO_MESH_DATA==='undefined'||!GEO_MESH_DATA[nm]) return cragPrism(7,3,6);
  const g=geoMeshGeo(nm,lod); g.computeBoundingBox(); const b=g.boundingBox, P=g.attributes.position.array, Nn=g.attributes.normal.array, C=g.attributes.color.array, n=P.length/3;
  const cx=(b.min.x+b.max.x)/2, cy=(b.min.y+b.max.y)/2, cz=(b.min.z+b.max.z)/2, hx=(b.max.x-b.min.x)/2, hy=(b.max.y-b.min.y)/2, hz=(b.max.z-b.min.z)/2;
  const pos=new Float32Array(n*3), nor=new Float32Array(n*3), cav=new Float32Array(n);
  for(let i=0;i<n;i++){ pos[i*3]=(P[i*3]-cx)/hx; pos[i*3+1]=(P[i*3+1]-cy)/hy; pos[i*3+2]=(P[i*3+2]-cz)/hz;
    let x=Nn[i*3]*hx, y=Nn[i*3+1]*hy, z=Nn[i*3+2]*hz; const l=Math.hypot(x,y,z)||1; nor[i*3]=x/l; nor[i*3+1]=y/l; nor[i*3+2]=z/l; cav[i]=C[i*3]; }
  const I=g.index.array; return {pos,nor,idx:I instanceof Uint16Array?I:Uint16Array.from(I),cav};
}
/* 절벽 기둥 — 모서리가 날카로운 곧은 각기둥(위아래 판판) · 옆면은 세로로 길게 들쭉날쭉(절리 면이 조금씩 꺾인다) · 둥글게 닳은 끝이 없다 */
function cragPrism(seed,ws,hs){
  const g=new THREE.BoxGeometry(2,2,2,ws,hs,ws), p=g.attributes.position, rnd=mulberry32(seed>>>0), ph=[rnd()*9,rnd()*9,rnd()*9];
  for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    if(Math.abs(y)>0.999) continue;
    const a=Math.atan2(z,x), f=1+0.10*Math.sin(a*3+ph[0]+y*0.8)+0.06*Math.sin(a*7+ph[1]-y*1.9)+0.05*Math.sin(y*5.3+ph[2]);
    p.setXYZ(i,x*f,y,z*f); }
  g.computeVertexNormals();
  const o={pos:Float32Array.from(p.array), nor:Float32Array.from(g.attributes.normal.array), idx:Uint16Array.from(g.index.array)};
  g.dispose(); return o;
}
function cragClear(){
  for(const t of CRAG.tiles.values()) cragDrop(t);
  CRAG.tiles.clear(); CRAG.cols.length=0; CRAG.cg.clear(); CRAG.ix.clear(); CRAG.n=0; CRAG.blobs=0;
  if(typeof coastClear==='function') coastClear();
}
function cragDrop(t){ for(const u of (t.sub||[t])) for(const k of ['near','mid','far']){ const m=u[k]; if(m){ scene.remove(m); m.geometry.dispose(); u[k]=null; } } }
/* **그리는 단위는 80 m 작은 칸이다**(`CRAG.S` · 사용자 요청 — 렉 줄이기). 320 m 칸 하나를 통째로 한 메시로 지어, 칸 가장자리가 140 m 안이면 400 m 밖 덩이까지
   촘촘한 꼴로 그렸다(상륙 자리 옆 칸 하나가 71.5만 △) · 경계구가 반지름 212 m 라 화면 밖 거르기도 불 그림자 정육면체 거르기도 못 피했다(6면에 72만씩).
   이제 덩이를 제 자리의 작은 칸에 나눠 담고, 작은 칸마다 거리로 단계를 고르고 따로 거른다. 충돌(cragIndex · cragSpan)은 320 m 칸 그대로다 */
function cragSubs(t){
  if(t.sub) return t.sub;
  const S=CRAG.S, F_=CRAG.F, B=t.b, m=new Map();
  for(let o=0;o<B.length;o+=F_){ const ix=Math.floor(B[o]/S), iz=Math.floor(B[o+2]/S), k=ix*65536+iz;
    let u=m.get(k); if(!u) m.set(k,u={cx:(ix+0.5)*S, cz:(iz+0.5)*S, r:S*0.75, b:[], near:null, mid:null, far:null, par:t});
    for(let j=0;j<F_;j++) u.b.push(B[o+j]); }
  return t.sub=[...m.values()];
}
/* 충돌 원 — 반지름 7 m 까지는 하나, 더 크면 고리로 덮는다 */
function cragCollide(x,z,R){
  const C=CRAG.cols;
  if(R<=7){ C.push(x,z,R); return; }
  C.push(x,z,7);
  for(let rr=R-6;rr>4;rr-=9){ const n=Math.ceil(6.283*rr/8); for(let i=0;i<n;i++){ const a=i/n*6.283; C.push(x+Math.cos(a)*rr,z+Math.sin(a)*rr,6); } }
}
/* 무리 하나를 기른다 — 바위 한 덩이는 수 15 개: 자리 3 · 반지름 3 · 돌림 3(기울임 x · 방위 · 기울임 z) · 단계 · 꼴 벌 · 빛깔 3 · 녹아드는 높이 */
const CRAG_TINT=[[1.03,1.00,0.96],[0.97,0.99,1.02],[1.01,0.97,0.93],[1.04,1.03,1.01],[0.93,0.94,0.93]];   // 덩이 빛깔은 아주 조금만 — 바위 갈래의 빛깔은 지질도가 정한다(2026-11-05 사용자 지적: 너무 알록달록하다)
function cragGrow(s,B){
  const rnd=mulberry32(s.seed>>>0), dx=s.dx, dz=s.dz, tx=-dz, tz=dx;                 // 내리막 · 등고선
  const r0=CELL*(0.55+0.75*rnd()*rnd())*(rnd()<0.10?1.6:1), type=(rnd()*4)|0, side=rnd()<0.5?1:-1;
  const TB=0.80+0.30*rnd(), T0=CRAG_TINT[(rnd()*CRAG_TINT.length)|0], T1=CRAG_TINT[(rnd()*CRAG_TINT.length)|0];   // 무리의 밝기 · 빛 둘
  /* **무리의 덩이는 같은 쪽으로 선다**(절리 틀이 나란하게 — cragShape) — 예전엔 새끼 덩이를 아무 쪽으로나 돌려 세워 공 더미로 보였다.
     밝기도 무리 안에서는 조금만 흔든다(한 벼랑의 돌이다 — 예전엔 덩이마다 0.8~1.2배라 조각보 같았다) */
  const Y0=Math.atan2(-tz,tx)+(rnd()-0.5)*0.3;
  if(P.sm) return cragGrowWall(s,B,Y0);                 // 매끈한 땅 섬 — 바위 더미 대신 깎아지른 절벽 벽(아래)
  const put=(x,y,z,rx,ry,rz,lv)=>{ const b=TB*(0.92+0.16*rnd())*(lv===2?1.03:1), m=rnd(), j=()=>0.97+0.06*rnd();
    B.push(x,y,z,rx,ry,rz,(rnd()-0.5)*(lv?0.32:0.18),Y0+(rnd()-0.5)*(lv?0.55:0.25),(rnd()-0.5)*(lv?0.32:0.18)+(type===3&&!lv?0.18:0),
           lv,(rnd()*8)|0,b*lerp(T0[0],T1[0],m)*j(),b*lerp(T0[1],T1[1],m)*j(),b*lerp(T0[2],T1[2],m)*j(),lv===0?2.6:lv===1?1.4:0.7);   // 녹아드는 높이 — 밑동이 흙 · 풀빛으로 넉넉히 스민다(2026-11-04 사용자 지적: 바위와 풀이 칼로 자른 듯 만난다)
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
    const inK=r*(0.40+0.25*rnd()), mx=px-dx*inK, mz=pz-dz*inK, rh0=r*(sx+sz)*0.5;   // 더 깊이 박는다(덩이가 벽에 얹힌 상자로 안 보이게)
    const y=Math.min(gy+r*sy*(0.02+0.30*rnd()),heightAt(mx+dx*rh0*0.7,mz+dz*rh0*0.7)+r*sy*0.5);
    put(mx,y,mz,r*sx,r*sy,r*sz,0);
    cragCollide(px,pz,r*(sx+sz)*0.36);
    bud(mx,y,mz,r*(sx+sz)*0.5,r*sy,1,0.30,0.64,2+((rnd()*3)|0));
    if(type===2) for(let i=0,n=2+((rnd()*4)|0);i<n;i++){          // 발치에 굴러떨어진 돌
      const d=r*(0.9+1.3*rnd()), x=px+dx*d+tx*(rnd()-0.5)*r*1.6, z=pz+dz*d+tz*(rnd()-0.5)*r*1.6, q=r*(0.18+0.28*rnd()), gy2=heightAt(x,z); if(gy2<-q) continue;
      put(x,Math.min(gy2+q*0.35,heightAt(x+dx*q*0.7,z+dz*q*0.7)+q*0.30),z,q*(0.9+0.3*rnd()),q*(0.7+0.4*rnd()),q*(0.9+0.3*rnd()),1); if(q>1.2) cragCollide(x,z,q*0.8); }
  }
}
/* **절벽 벽**(2026-11-04 사용자 사진 — 진짜 벼랑은 비탈에 얹힌 바위 더미가 아니라 깎아지른 벽이다: 세로 절리로 갈라진 기둥이 빈틈없이 늘어서고 꼭대기는 풀 덮인 턱).
   비탈의 등고선을 따라 기둥을 나란히 세운다 — 기둥 하나는 비탈 밑(내리막 쪽 땅)에서 비탈 위(오르막 쪽 땅)까지 곧추선 모난 덩이(높이 = 그 자리 낙차)로,
   벽 속으로 들여 박고 꼭대기는 턱보다 조금 들쭉날쭉하게. 너비 · 깊이 · 높이가 기둥마다 달라 면이 앞뒤로 들락날락한다(그늘진 틈 = 절리).
   발치엔 떨어진 돌 몇(애추). 땅 지오메트리는 15 m 세모라 벽을 못 세운다 — 이 기둥들이 벽이 되고, 몸 · 발 딛기도 그대로 이 꼴을 쓴다 */
function cragGrowWall(s,B,Y0){
  /* **벼랑은 사용자가 준 Meshy 벼랑 · 바위 모형으로**(2026-11-04 사용자 요청 — 기둥 말고 · 모형을 잘라서라도 다 쓸 것 · 거칠기와 바위 놓임을 살릴 것):
     벼랑 자리마다 모형 한두 개를 등고선을 따라, 낙차만 한 높이로 세운다 — 밑은 땅속으로(모형 아랫부분을 잘라 묻는다) · 위는 비탈 위 땅 높이(풀 턱이 이어진다).
     봉우리 모형도 잘라 쓴다(꼭대기 쪽만 드러나게 깊이 묻으면 바위 벼랑이 된다). 바위 칸 메시에 합쳐 그리고(cragMesh — 거리 단계 · 먼 칸은 안 그림) 몸도 그 꼴이 막는다 */
  const rnd=mulberry32((s.seed^0x5ea11)>>>0), dx=s.dx, dz=s.dz, tx=-dz, tz=dx;
  const reach=CELL*1.1, lo=heightAt(s.x+dx*reach,s.z+dz*reach), hi=heightAt(s.x-dx*reach,s.z-dz*reach), drop=hi-lo;
  if(drop<4) return;
  const tint=CRAG_TINT[(rnd()*CRAG_TINT.length)|0], tb=0.88+0.2*rnd(), n=drop>16?2:1;
  for(let k=0;k<n;k++){
    const v=(rnd()*CRAG_MESHY.length)|0, nm=CRAG_MESHY[v], W=GEO_MESH_DATA[nm].w, peak=v>=4;
    const H0=Math.min(80,drop*(peak?2.2:1.15)), sx=W[0]*H0, sz=W[2]*H0;
    const along=(k-(n-1)/2)*sx*0.55+(rnd()-0.5)*CELL*0.4, inK=sz*0.25+rnd()*CELL*0.3;
    const x=s.x+tx*along-dx*inK, z=s.z+tz*along-dz*inK, top=hi+(rnd()-0.4)*1.5;
    /* 밑은 늘 그 자리 땅 밑까지(뜨지 않게 — 2026-11-04 사진: 바위 조각이 허공에 떴다) · 봉우리 모형은 더 깊이 묻어 위쪽만 */
    let bot=Math.min(lo,heightAt(x,z),heightAt(x+tx*sx*0.4,z+tz*sx*0.4),heightAt(x-tx*sx*0.4,z-tz*sx*0.4),heightAt(x+dx*sz*0.4,z+dz*sz*0.4))-1.5;
    let H=Math.max(H0,top-bot); if(peak) H*=1.5; const y=top-H/2;
    const b=tb*(0.94+0.12*rnd());
    B.push(x,y,z,sx/2,H/2,sz/2,(rnd()-0.5)*0.06,Y0+(rnd()-0.5)*0.4,(rnd()-0.5)*0.06,0,12+v,b*tint[0],b*tint[1],b*tint[2],2.2); CRAG.blobs++;
    cragCollide(x,z,Math.min(sx,sz)*0.35);
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
    if(P.sm&&geoNear(wx,wz)) continue;                                                // 큰 지형 모형(산 · 협곡 벽 · 시스택)의 자락엔 안 쌓는다 — 모형 앞에 검은 상자 더미가 섰다(2026-11-05 · 난수는 다 뽑은 뒤)
    const gx=F.elev[i+1]-F.elev[i-1], gz=F.elev[i+N]-F.elev[i-N], gl=Math.hypot(gx,gz)||1;
    const k=(Math.floor(wx/T)+512)*1024+(Math.floor(wz/T)+512);
    let t=CRAG.tiles.get(k); if(!t) CRAG.tiles.set(k,t={cx:(Math.floor(wx/T)+0.5)*T,cz:(Math.floor(wz/T)+0.5)*T,r:T*0.75,b:[],near:null,far:null});
    cragGrow({x:wx,z:wz,dx:-gx/gl,dz:-gz/gl,seed:sd},t.b); occ[i]=1; CRAG.n++;
  }
  PROPS=PROPS.filter(p=>p.cave||!occ[IDX(clamp(Math.round(p.x/CELL+N/2),0,N-1),clamp(Math.round(p.z/CELL+N/2),0,N-1))]);
  if((P.tv|0)>=5&&typeof coastFeatures==='function') coastFeatures(seed);   // 바닷가 지형 — 시스택 · 해식 아치 · 주상절리(34-coast.js · 지형 판 5)
  if((P.tv|0)>=7&&typeof fallsCrags==='function') fallsCrags(seed);         // 저수지 폭포의 바위벽(36-falls.js · 지형 판 7)
  if((P.tv|0)>=10) cragCaveClear();                                         // 지형 판 10 — 굴 입구 · 접근로 · 빛구멍을 덮는 덩이를 걷는다(난수를 다 뽑은 뒤 · 아래)
  { const C=CRAG.cols, G=CRAG.cg;                                                          // 원을 16 m 칸에 걸어 둔다(cragNear)
    for(let i=0;i<C.length;i+=3){ const r=C[i+2], x0=Math.floor((C[i]-r)/16), x1=Math.floor((C[i]+r)/16), z0=Math.floor((C[i+1]-r)/16), z1=Math.floor((C[i+1]+r)/16);
      for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ const k=(gx+2048)*4096+(gz+2048); let a=G.get(k); if(!a) G.set(k,a=[]); a.push(i); } } }
  /* **덩이 속 · 곁의 소품을 걷는다**(2026-11-08 사용자 '바위 곁과 속의 것을 다 치워라') — 예전엔 무리의 첫 칸(occ)만 비워, 둘레로 자란 덩이 속에 나무 · 풀 · 돌이
     박혀 있었다. 나무는 1.5 m · 그 밖은 0.6 m 곁까지. 난수를 다 뽑은 뒤라 섬의 차례는 그대로다 · 저장은 자리로 찾는다(92-save.js findSavedProp) */
  if((P.tv|0)>=11&&CRAG.n){ const T={oak:1.5,fir:1.5}; const n0=PROPS.length;
    PROPS=PROPS.filter(p=>p.cave||p.ug||!cragNear(p.x,p.z,(T[p.k]||0.6)+1.0));   // 원(cols)은 그려진 꼴보다 작다 — 1 m 더(꼴 그대로 재는 cragSpan 은 사람 둘레 칸만 안다)
    CRAG.cut=n0-PROPS.length; }
}
/* 지형 판 10 굴의 겉이 뚫리는 데(cv10Zones — 입구 마당 · 빛구멍 · 처마 · 입구 앞 접근로)에 걸친 바위 덩이 · 몸 막기 원을 걷는다.
   벼랑 벽(cragGrowWall — 사용자 Meshy 벼랑 모형은 수십 m)은 자리 점만 굴을 비켜 보고 등고선을 따라 길게 자라서, 입구를 덮고 그 위가 바닥이 되어
   들머리에 선 사람이 벼랑 꼭대기로 올라섰다(cragFloor 가 쌓인 덩이를 타고 오른다 · 2026-11-05 굴 걷기 검수). 난수를 안 쓰고 걷기만 한다 */
function cragCaveClear(){
  if(!CAVES.length||!CAVE_GRID.size) return;
  const T=CRAG.T, kill=new Set(), F_=CRAG.F;
  for(const zs of CAVE_GRID.values()) for(const zc of zs){ if(!zc.cave||zc.cave.tv!==10) continue;
    /* 그 원 둘레 칸을 걸어 두고(cragSpan 은 사람 둘레만 건다) 원 가운데 · 반지름 0.6 의 네 점 · 0.95 의 여덟 점에서 수직선을 쏜다 */
    const tx0=Math.floor((zc.x-zc.R-160)/T), tx1=Math.floor((zc.x+zc.R+160)/T), tz0=Math.floor((zc.z-zc.R-160)/T), tz1=Math.floor((zc.z+zc.R+160)/T);
    for(let a=tz0;a<=tz1;a++) for(let b=tx0;b<=tx1;b++){ const t=CRAG.tiles.get((b+512)*1024+(a+512)); if(t&&!t.ixd) cragIndex(t); }
    const pts=[[0,0]]; for(let k=0;k<4;k++) pts.push([Math.cos(k*1.5708)*0.6,Math.sin(k*1.5708)*0.6]); for(let k=0;k<8;k++) pts.push([Math.cos(k*0.7854+0.39)*0.95,Math.sin(k*0.7854+0.39)*0.95]);
    for(const q of pts){ const x=zc.x+q[0]*zc.R, z=zc.z+q[1]*zc.R, g=heightAt(x,z), n=cragSpan(x,z);
      for(let i=0;i<n;i++){ const sp=_cgS[i]; if(sp.t>g+0.8&&sp.b<g+zc.cave.mouths[0].h+2) kill.add(sp.r); } } }   // 땅 위로 솟아 입구 높이 안을 막는 덩이
  if(kill.size){ const byT=new Map(); for(const r of kill){ let a=byT.get(r.t); if(!a) byT.set(r.t,a=new Set()); a.add(r.o); }
    for(const [t,os] of byT){ const B=t.b, K=[]; for(let o=0;o<B.length;o+=F_){ if(os.has(o)) continue; for(let j=0;j<F_;j++) K.push(B[o+j]); } B.length=0; for(const v of K) B.push(v); } }
  CRAG.ix.clear(); for(const t of CRAG.tiles.values()) t.ixd=false;               // 색인은 다시 걸게(지운 덩이의 옛 자리 · o 가 밀렸다)
  CRAG.cleared=kill.size;
  const C=CRAG.cols, K=[];                                                         // 몸 막기 · 나무 비킴 원도 굴 자리 것은 걷는다
  for(let i=0;i<C.length;i+=3) if(!caveAt(C[i],C[i+1],C[i+2])) K.push(C[i],C[i+1],C[i+2]);
  C.length=0; for(const v of K) C.push(v);
}
/* 그 자리가 큰 바위의 발치(원 + pad) 안인가 — 나무·덤불·노거수가 바위 속에 서지 않게(95-flora.js · 95-giants.js) */
function cragNear(x,z,pad){
  if(!CRAG.n) return false;
  const a=CRAG.cg.get((Math.floor(x/16)+2048)*4096+(Math.floor(z/16)+2048)); if(!a) return false;
  const C=CRAG.cols; pad=pad||0;
  for(const i of a){ const dx=x-C[i], dz=z-C[i+1], q=C[i+2]+pad; if(dx*dx+dz*dz<q*q) return true; }
  return false;
}
function buildCrags(){ if(typeof coastBuild==='function') coastBuild(); if(typeof geoBuild==='function') geoBuild(); if(typeof fallsBuild==='function') fallsBuild(); }   // 주상절리 기둥(34-coast.js) · 지열 지대(35-geo.js)                 // (예전엔 여기서 충돌 원을 걸었다 — 이제 몸은 바위의 진짜 꼴로 막는다. 아래)

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
    const rx=B[o+3], ry=B[o+4], rz=B[o+5], br=Math.max(rx,ry,rz)*1.75;
    const r={x:B[o],y:B[o+1],z:B[o+2],rx,ry,rz,br2:br*br,sh:S[B[o+9]][B[o+10]][1],t,o,
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
    { const dd=dx*dx+dy*dy+dz*dz, od=ox*dx+oy*dy+oz*dz, c2=ox*ox+oy*oy+oz*oz-od*od/dd; if(c2>3.1) continue; }   // 단위 꼴(반지름 1.76 안 — 상자 [−1,1]³ 의 모서리까지)을 스치지도 않는다
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
    if(hi>-1e8&&hi-lo<0.05) lo=Math.min(lo,r.y-r.ry);   // 한 면만 맞았다 — 밑면이 열린 꼴(Meshy 모형 · 줄이며 생긴 틈). 예전엔 구간이 없다고 쳐 사람이 바위를 뚫고 지나갔다(2026-11-05 사용자 지적)
    if(hi>lo){ const s=_cgS[n]||(_cgS[n]={b:0,t:0,sl:0,u:false,r:null}); s.b=lo; s.t=hi; s.sl=Math.sqrt(Math.max(0,1-hn*hn))/Math.max(hn,0.02); s.u=false; s.r=r; n++; }
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
/* 칸 하나의 메시 — lod 1: 세 단계 다(촘촘한 꼴) · 2: 세 단계 다(성긴 꼴 · 가까운 재질 — 60~140 m) · 0: 두 단계(성긴 꼴 · 먼 재질) */
const _crM=new THREE.Matrix4(), _crQ=new THREE.Quaternion(), _crE=new THREE.Euler();
function cragMesh(t,lod){
  const B=t.b, S=cragShapes(), F_=CRAG.F; let nv=0, ni=0;
  const fine=lod===1?1:0;
  for(let o=0;o<B.length;o+=F_){ const lv=B[o+9]; if(!lod&&lv>1) continue; const sh=S[lv][B[o+10]][fine]; nv+=sh.pos.length/3; ni+=sh.idx.length; }
  const pos=new Float32Array(nv*3), nor=new Float32Array(nv*3), col=new Float32Array(nv*3), mel=new Float32Array(nv), ofs=new Float32Array(nv), idx=new Uint32Array(ni);
  let v=0, q=0;
  /* **덩이끼리 겹친 속은 버린다**(2026-11-06 사용자 '바위 속이 복잡하게 겹쳐 보인다 — 다 빚은 뒤 안쪽을 걸러라') — 세모의 가운데가 이웃 덩이의 속(그 덩이 좌표로 타원체 0.88 안)이면
     그 세모를 안 그린다. 밖에서 보이는 겉은 그대로다(겉 세모의 가운데는 이웃 속에 안 든다) */
  /* 이웃의 '속' 은 그 꼴의 가장 안쪽 겉(rmin — 깎인 면이 가장 깊이 들어온 데)보다 안이다(2026-11-08 사용자 사진 — 바위에 구멍이 뚫려 속이 보였다):
     예전엔 타원체 0.88 로 쳤는데, 깎아 낸 꼴은 겉이 그보다 안쪽인 데가 많아 밖에서 보이는 세모까지 버렸다. 세 꼭짓점이 다 그 안이어야 버린다 */
  const rminOf=sh=>{ if(sh.rmin===undefined){ let m=1e9; const P=sh.pos; for(let i=0;i<P.length;i+=3){ const r=Math.hypot(P[i],P[i+1],P[i+2]); if(r<m) m=r; } sh.rmin=Math.min(1,m); } return sh.rmin; };
  const BL=[]; for(let o=0;o<B.length;o+=F_){ const lv=B[o+9]; if(!lod&&lv>1) continue; _crE.set(B[o+6],B[o+7],B[o+8]); _crQ.setFromEuler(_crE); _crM.makeRotationFromQuaternion(_crQ);
    const k=rminOf(S[lv][B[o+10]][fine])*0.96;
    BL.push({o,x:B[o],y:B[o+1],z:B[o+2],rx:B[o+3],ry:B[o+4],rz:B[o+5],R:Math.max(B[o+3],B[o+4],B[o+5]),k2:k*k,e:_crM.elements.slice()}); }
  const inB=(b,x,y,z)=>{ const dx=x-b.x, dy=y-b.y, dz=z-b.z; if(dx*dx+dy*dy+dz*dz>b.R*b.R) return false; const e=b.e;
      const lx=(e[0]*dx+e[1]*dy+e[2]*dz)/b.rx, ly=(e[4]*dx+e[5]*dy+e[6]*dz)/b.ry, lz=(e[8]*dx+e[9]*dy+e[10]*dz)/b.rz; return lx*lx+ly*ly+lz*lz<b.k2; };
  const insideOther=(o,a,b2,c2)=>{ for(const b of BL){ if(b.o===o) continue; if(inB(b,pos[a],pos[a+1],pos[a+2])&&inB(b,pos[b2],pos[b2+1],pos[b2+2])&&inB(b,pos[c2],pos[c2+1],pos[c2+2])) return true; }
    return false; };
  for(let o=0;o<B.length;o+=F_){ const lv=B[o+9]; if(!lod&&lv>1) continue;
    const sh=S[lv][B[o+10]][fine], sp=sh.pos, sn=sh.nor, si=sh.idx, n=sp.length/3;
    _crE.set(B[o+6],B[o+7],B[o+8]); _crQ.setFromEuler(_crE); _crM.makeRotationFromQuaternion(_crQ); const e=_crM.elements;
    const X=B[o], Y=B[o+1], Z=B[o+2], rx=B[o+3], ry=B[o+4], rz=B[o+5], cr=B[o+11], cg=B[o+12], cb=B[o+13], ml=B[o+14];
    const of=((Math.imul(Math.round(X*7)|0,374761393)^Math.imul(Math.round(Z*7)|0,668265263))>>>0)/4294967296;   // 덩이마다 무늬를 비킬 값(한 덩이 안은 같다 — rockMat RK_OFS)
    for(let i=0;i<n;i++){ const a=i*3, c=(v+i)*3;
      const x=sp[a]*rx, y=sp[a+1]*ry, z=sp[a+2]*rz;
      pos[c]=e[0]*x+e[4]*y+e[8]*z+X; pos[c+1]=e[1]*x+e[5]*y+e[9]*z+Y; pos[c+2]=e[2]*x+e[6]*y+e[10]*z+Z;
      const nx=sn[a]/rx, ny=sn[a+1]/ry, nz=sn[a+2]/rz; let wx=e[0]*nx+e[4]*ny+e[8]*nz, wy=e[1]*nx+e[5]*ny+e[9]*nz, wz=e[2]*nx+e[6]*ny+e[10]*nz; const l=Math.hypot(wx,wy,wz)||1;
      nor[c]=wx/l; nor[c+1]=wy/l; nor[c+2]=wz/l;
      const mt=(0.95+0.10*(((i*2654435761)>>>0)&255)/255)*(sh.cav?sh.cav[i]:1); col[c]=cr*mt; col[c+1]=cg*mt; col[c+2]=cb*mt; mel[v+i]=ml; ofs[v+i]=of; }
    for(let i=0;i<si.length;i+=3){ const a=(v+si[i])*3, b2=(v+si[i+1])*3, c2=(v+si[i+2])*3;
      if(BL.length>1&&insideOther(o,a,b2,c2)) continue;
      idx[q++]=v+si[i]; idx[q++]=v+si[i+1]; idx[q++]=v+si[i+2]; }
    v+=n; }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.setAttribute('aMelt',new THREE.BufferAttribute(mel,1)); g.setAttribute('aOfs',new THREE.BufferAttribute(ofs,1));
  g.setIndex(new THREE.BufferAttribute(idx.subarray(0,q),1)); g.computeBoundingSphere();
  const m=new THREE.Mesh(g,lod?cragMat():cragMatFar()); m.matrixAutoUpdate=false; m.updateMatrix(); m.visible=false; scene.add(m);
  return m;
}
/* 사람 둘레의 작은 칸을 짓고 켜고 끈다 — 여덟 프레임에 한 번 · 짓기는 한 번에 3 ms 까지(적어도 하나 — 멈칫하지 않게) */
function updateCrags(all){            // all — 섬을 다 지었을 때 한 번: 상륙 자리 둘레를 예산 없이 다 짓는다(로딩 중이라 멈칫해도 된다)
  if(!CRAG.tiles.size||(!all&&(CRAG.t++&7))) return;
  const px=PL.pos.x, pz=PL.pos.z, t0=performance.now(); let built=0;
  for(const t of CRAG.tiles.values()){
    const dt=Math.max(0,Math.hypot(t.cx-px,t.cz-pz)-CRAG.T*0.71);
    if(dt>CRAG.DROP){ if(t.sub) cragDrop(t); continue; }
    if(dt>CRAG.FAR&&!t.sub) continue;
    for(const u of cragSubs(t)){
      const d=Math.max(0,Math.hypot(u.cx-px,u.cz-pz)-CRAG.S*0.71);
      if(d>CRAG.DROP){ for(const k of ['near','mid','far']){ const m=u[k]; if(m){ scene.remove(m); m.geometry.dispose(); u[k]=null; } } continue; }
      if(u.near&&d>CRAG.NEAR*2){ scene.remove(u.near); u.near.geometry.dispose(); u.near=null; }   // 촘촘한 꼴은 무겁다 — 280 m 넘게 멀어지면 버린다
      if(u.near&&d>CRAG.NEAR*2){ scene.remove(u.near); u.near.geometry.dispose(); u.near=null; }   // 촘촘한 꼴은 무겁다 — 280 m 넘게 멀어지면 버린다
      const see=d<CRAG.FAR&&!(d>CRAG.NEAR&&tileOcc(u,70)), k=d<CRAG.MID?'near':d<CRAG.NEAR?'mid':'far', lod=k==='near'?1:k==='mid'?2:0;
      if(see&&!u[k]&&(all||!built||performance.now()-t0<3)){ u[k]=cragMesh(u,lod); built++; }
      /* 지을 때까지는 이미 지은 다른 단계로 선다(빈자리가 생기지 않게) — 원하는 것 → 가까운 쪽 → 먼 쪽 */
      const on=!see?null:u[k]?k:['near','mid','far'].find(q=>u[q])||null;
      for(const q of ['near','mid','far']){ const m=u[q]; if(m&&m.visible!==(on===q)){ m.visible=on===q; LIGHT.dirtyAt(u.cx,u.cz,u.r); } }
    }
  }
}
