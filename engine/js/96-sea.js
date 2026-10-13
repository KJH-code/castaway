/* 96-sea.js — CASTAWAY
   바다 — 산호밭·바닷말 · 조개·굴·성게 줍기 · 물고기 떼(작살·그물)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   바다 — 산호밭 · 바닷말 · 조개·굴·성게 · 물고기 떼
   ----------------------------------------------------------------------------
   바다가 휑했다(물과 모래뿐). 여기서 네 가지를 채운다.
   ① 산호밭 — 수심 1~11 m 의 바닥에 군데군데(`reefAt` 잡음이 높은 데) 산호 네 가지(가지·둥근·부채·대롱)가
      색색으로 선다. 그 밖의 얕은 바닥엔 바닷말 숲이 든다. 전부 낮은 다각형 인스턴스다.
   ② 주울 것 — 조개(모래 바닥) · 굴(가파른 물가 바위, 날붙이가 있어야 뗀다) · 성게(산호밭, 맨손이면 찔린다).
      눈앞 2.4 m 안에서 좌클릭으로 줍는다. 주운 자리는 이틀(게임 48시간) 뒤에 다시 난다(`SEA.taken` — 저장된다).
   ③ 물고기 — 사는 데가 저마다 다르다: 산호밭(흰동가리·엔젤피시·복어·장어) · 모래 바닥(넙치) ·
      얕은 바다(고등어 떼·조기·대구) · 먼바다(참치·황새치). 떼는 한 점(길잡이)을 따라 흩어졌다 모이며 헤엄치고
      사람이 다가오면 달아난다. **작살**로 찌른다(`attack` — 등급이 모자라면 안 박힌다). 그물은 곁의 잔고기 떼를 건진다.
   ④ 자리는 전부 칸 번호의 해시로 정한다(자갈 `RUBBLE` 과 같은 방식) — 같은 섬 같은 자리에 늘 같은 산호가 선다.
      사람 둘레 52 m 만 깔고 6 m 넘게 움직이면 다시 깐다. 그래서 섬 생성(자원 배치)도 저장 형식도 건드리지 않는다.
   참고한 것: 떼 짓기는 three.js 예제 `webgl_gpgpu_birds`(MIT)의 '거리 띠' 규칙 — 가까우면 벌어지고(분리)
   멀면 모인다(응집) — 을 CPU 에서 길잡이 방식으로 줄여 새로 썼다. 코드를 옮겨 온 것은 없다.
   ========================================================================== */
const SEA={seed:0, cx:1e9, cz:1e9, R:52, cell:2.2, m:null, picks:[], taken:new Map(), look:null, dirty:false, clock:0};
const SEA_REGROW=48;                               // 주운 자리가 다시 나기까지(게임 시간)
const SEA_PICK={
  clam  :{item:'clam',   n:'조개', verb:'줍기'},
  oyster:{item:'oyster', n:'굴',   verb:'떼어 내기', need:'sharp'},
  urchin:{item:'urchin', n:'성게', verb:'따기', prick:5},
  /* 바다에 선 것도 전부 무엇인가를 준다(사용자 요청). keep — 떼어도 그 자리에 남는다(다시 뗄 수 있기까지 regrow 시간) */
  coral   :{item:'coral',   n:'산호',     verb:'조각 떼기', need:'sharp', keep:1, regrow:48},
  weed    :{item:'seaweed', n:'바닷말',   verb:'뜯기',      keep:1, regrow:24},
  kelp    :{item:'seaweed', n:'다시마',   verb:'뜯기',      keep:1, regrow:24, cnt:2},
  rock    :{item:'pebble',  n:'물밑 바위', verb:'돌 떼기',  keep:1, regrow:48},
  anem    :{n:'말미잘',     verb:'건드리기', keep:1, sting:3},
  starfish:{item:'starfish',n:'불가사리', verb:'줍기'}
};
const SEA_U={uSeaT:{value:0}};
function seaHash(gx,gz,salt){
  let h=(Math.imul(gx,374761393)+Math.imul(gz,668265263)+Math.imul(salt|0,362437)+SEA.seed)|0;
  h=Math.imul(h^(h>>>13),1274126177); return (h^(h>>>16))>>>0;
}
/* 부드러운 값잡음(0~1) — 산호밭·바닷말 숲이 뭉쳐 나게 하는 얼룩 */
function seaVal(x,z,cell,salt){
  const fx=x/cell, fz=z/cell, ix=Math.floor(fx), iz=Math.floor(fz), tx=fx-ix, tz=fz-iz;
  const sx=tx*tx*(3-2*tx), sz=tz*tz*(3-2*tz), K=1/4294967296;
  const a=seaHash(ix,iz,salt)*K, b=seaHash(ix+1,iz,salt)*K, c=seaHash(ix,iz+1,salt)*K, d=seaHash(ix+1,iz+1,salt)*K;
  const top=a+(b-a)*sx, bot=c+(d-c)*sx;
  return top+(bot-top)*sz;
}
const reefAt=(x,z)=>seaVal(x,z,34,11)*0.65+seaVal(x,z,13,12)*0.35;
/* 그 자리가 바다인가 — 수심(m)을 돌려준다. 뭍·하천이면 0 */
function seaDepthAt(x,z){
  const ix=clamp(Math.round(x/CELL+N/2),1,N-2), iz=clamp(Math.round(z/CELL+N/2),1,N-2), ci=IDX(ix,iz);
  if(F.elev[ci]>-0.3||F.river[ci]) return 0;
  const y=heightAt(x,z);
  return y<-0.3?-y:0;
}
const seaIsReef=(x,z,dep)=>dep>1.2&&dep<11&&reefAt(x,z)>0.56;

/* ── 생김새 ──────────────────────────────────────────────────────────────────
   3각 뿔과 각진 20면체로 지었던 것을 **매끈한 모양**(24-shapes.js)으로 다시 지었다(사용자 지적: 사면체 메시가 멋없다 ·
   바다에 풀이 자란다). 바닷말은 풀잎 같은 가는 뿔이 아니라 **넓고 물결진 잎**(미역 꼴)과 줄기에 잎이 어긋나 달린
   다시마다. 밑동은 짙고 끝은 밝게 정점 색을 넣어 덩이가 입체로 읽힌다(포기마다의 빛깔은 인스턴스 색으로 곱한다). */
function seaBuildMeshes(){
  const rnd=mulberry32(0xc0a1), lean=SHP.lean, GR=[0.58,1.12];
  const unit=(x,y,z)=>{ const l=Math.sqrt(x*x+y*y+z*z)||1; return [x/l,y/l,z/l]; };
  // 가지 산호 — 밑동에서 갈라져 오르는 둥근 가지(끝이 둥글다)
  const branch=(()=>{ const parts=[];
    const limb=(o,d,len,r,depth)=>{
      parts.push({g:SHP.limb(o,d,len,r,r*0.64,2,5,0.10,0.9)});
      if(depth>0) for(let k=0;k<2;k++){
        const t=0.5+rnd()*0.4, b=[o[0]+d[0]*len*t,o[1]+d[1]*len*t+0.10*len*t*t,o[2]+d[2]*len*t];
        limb(b,unit(d[0]+(rnd()-0.5)*1.4,d[1]+0.3+rnd()*0.4,d[2]+(rnd()-0.5)*1.4),len*0.66,r*0.66,depth-1);
      }
    };
    for(let i=0;i<4;i++){ const a=i/4*6.283+rnd()*0.8;
      limb([Math.cos(a)*0.05,-0.05,Math.sin(a)*0.05],unit(Math.cos(a)*0.55,1,Math.sin(a)*0.55),0.42+rnd()*0.2,0.078,2); }
    return SHP.merge(parts,false,GR); })();
  // 둥근(뇌) 산호 — 잔 혹이 진 반구
  const dome=SHP.merge([{g:SHP.blob(0.5,11,{w:16,h:9,amp:0.15,nb:7,freq:5.5,sy:0.72,base:0.24})}],false,[0.66,1.1]);
  // 부채 산호 — 물결진 얇은 부채 + 짧은 자루
  const fan=SHP.merge([{g:SHP.grid(12,4,(u,v)=>{ const a=0.42+u*2.3, r=(0.08+0.54*v)*(1+0.10*Math.sin(a*7)*v);
      return [Math.cos(a)*r, Math.sin(a)*r*0.95, Math.sin(a*4+v*2)*0.07*r+0.03*Math.sin(v*5+a)]; })},
    {g:SHP.limb([0,-0.10,0],[0,1,0],0.20,0.05,0.035,1,5,0,0)}],false,[0.7,1.12]);
  // 대롱 산호 — 속 빈 대롱 여럿(아가리에 도톰한 전)
  const tube=(()=>{ const parts=[];
    for(let i=0;i<6;i++){ const a=i/6*6.283+rnd()*0.6, rr=i?0.12+rnd()*0.07:0, h=0.26+rnd()*0.4, r=0.05+rnd()*0.035;
      parts.push({g:SHP.lathe([[r*0.80,0],[r*0.95,h*0.55],[r*1.20,h],[r*0.92,h*0.98],[r*0.62,h*0.70]],7),
        x:Math.cos(a)*rr,y:-0.04,z:Math.sin(a)*rr,q:lean(a,0.22)}); }
    return SHP.merge(parts,false,GR); })();
  // 바닷말(미역 꼴) — 넓고 물결진 잎 여섯 장이 밑동에서 벌어져 오른다
  const weed=(()=>{ const parts=[];
    for(let i=0;i<6;i++){ const a=i/6*6.283+rnd(), h=0.72+rnd()*0.55;
      parts.push({g:SHP.frond(h,0.17+rnd()*0.08,{segs:6,curl:0.25+rnd()*0.5,cup:0.14,wave:0.20,waves:2+rnd()*1.5,p:0.45,tip:0.22,twist:(rnd()-0.5)*0.9}),
        x:Math.cos(a)*0.04,y:-0.03,z:Math.sin(a)*0.04,q:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-a+1.5708,0)).premultiply(lean(a,0.08+rnd()*0.2))}); }
    return SHP.merge(parts,false,[0.55,1.15]); })();
  // 조개 — 살짝 벌어진 두 껍데기
  const clam=(()=>{ const s=()=>{ const g=new THREE.SphereGeometry(0.11,10,6); g.scale(1,0.34,0.86); return g; };
    return SHP.merge([{g:s(),y:0.02},{g:s(),y:0.06,x:-0.012,rz:-0.34}],false,[0.8,1.08]); })();
  // 굴 — 울퉁불퉁 납작한 껍데기 서넛이 붙었다
  const oyster=SHP.merge([{g:SHP.blob(0.11,31,{w:9,h:6,amp:0.34,sx:1.25,sy:0.42}),y:0.03},
    {g:SHP.blob(0.088,32,{w:9,h:6,amp:0.34,sx:1.25,sy:0.42}),x:0.12,y:0.035,z:0.05,ry:1.1,rz:0.3},
    {g:SHP.blob(0.077,33,{w:9,h:6,amp:0.34,sx:1.25,sy:0.42}),x:-0.09,y:0.03,z:0.09,ry:2.3,rx:0.25}],false,[0.75,1.1]);
  // 성게 — 공에 가시
  const urchin=(()=>{ const parts=[{g:new THREE.SphereGeometry(0.075,10,7),y:0.07}];
    for(let i=0;i<20;i++){ const a=rnd()*6.283, b=Math.acos(rnd()*1.7-0.7), d=new THREE.Vector3(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a));
      const g=new THREE.ConeGeometry(0.010,0.17,4,1,true); g.translate(0,0.085,0);
      parts.push({g,x:d.x*0.06,y:0.07+d.y*0.06,z:d.z*0.06,q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d)}); }
    return SHP.merge(parts); })();
  const mk=(geo,cap,two,sway)=>{
    const mat=new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:two?THREE.DoubleSide:THREE.FrontSide});
    if(sway){                                         // 바닷말은 물살에 흔들린다 — 높이의 제곱만큼
      mat.onBeforeCompile=sh=>{ sh.uniforms.uSeaT=SEA_U.uSeaT;
        sh.vertexShader='uniform float uSeaT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        { float ph=0.0;
          #ifdef USE_INSTANCING
            ph=instanceMatrix[3].x*0.7+instanceMatrix[3].z*0.9;
          #endif
          float k=transformed.y*transformed.y*0.16;
          transformed.x+=sin(uSeaT*1.3+ph)*k; transformed.z+=cos(uSeaT*1.1+ph*1.3)*k*0.7; }`); };
      mat.customProgramCacheKey=()=>'seaweed';
    }
    const im=new THREE.InstancedMesh(geo,mat,cap);
    im.setColorAt(0,new THREE.Color(1,1,1));          // 색 버퍼는 count 가 가득일 때 만든다(RUBBLE 과 같은 까닭)
    im.count=0; im.frustumCulled=false; im.userData.lightRole='recv';
    im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im);
    return im;
  };
  /* ── 더 다양하게(사용자 요청: 뭍의 나무·덤불처럼 산호도 큰 것 · 작은 것 · 여러 꼴) ── */
  // 상 산호 — 굵은 자루 위에 넓적한 상판(가장자리가 들쭉날쭉)
  const table=(()=>{ const lob=g=>{ const p=g.attributes.position;
      for(let i=0;i<p.count;i++) if(p.getY(i)>0.40){ const a=Math.atan2(p.getZ(i),p.getX(i)), f=1+0.13*Math.sin(a*5+1)+0.07*Math.sin(a*9);
        p.setX(i,p.getX(i)*f); p.setZ(i,p.getZ(i)*f); }
      return SHP.latheNormals(g); };
    const top=SHP.lathe([[0.16,0],[0.10,0.22],[0.13,0.40],[0.52,0.45],[0.63,0.49],[0.58,0.54],[0.28,0.535],[0.001,0.52]],14);
    const small=SHP.lathe([[0.26,0],[0.34,0.03],[0.30,0.07],[0.001,0.06]],10);
    return SHP.merge([{g:lob(top)},{g:small,x:0.16,y:0.60,z:0.10}],false,[0.62,1.1]); })();
  // 기둥 산호 — 끝이 둥근 기둥 여럿
  const pillar=(()=>{ const parts=[];
    for(let i=0;i<5;i++){ const a=i/5*6.283+rnd(), rr=i?0.10+rnd()*0.10:0, h=0.35+rnd()*0.75, r=0.055+rnd()*0.03;
      parts.push({g:SHP.limb([Math.cos(a)*rr,-0.03,Math.sin(a)*rr],unit(Math.cos(a)*0.12,1,Math.sin(a)*0.12),h,r*1.15,r*0.92,3,7,0,1.0)}); }
    return SHP.merge(parts,false,GR); })();
  // 해면 — 아가리 벌어진 통 둘
  const sponge=SHP.merge([{g:SHP.lathe([[0.10,0],[0.13,0.14],[0.17,0.33],[0.185,0.42],[0.15,0.415],[0.11,0.24],[0.05,0.08]],10)},
    {g:SHP.lathe([[0.06,0],[0.08,0.10],[0.105,0.26],[0.085,0.255],[0.05,0.10]],8),x:0.19,y:0.0,z:0.05,rz:-0.3}],false,GR);
  // 말미잘 — 밑동 위에 하늘거리는 촉수
  const anem=(()=>{ const parts=[{g:SHP.lathe([[0.13,0],[0.125,0.08],[0.10,0.14],[0.001,0.15]],9),c:[0.7,0.7,0.7]}];
    for(let i=0;i<14;i++){ const a=i/14*6.283+rnd()*0.2, t=0.25+rnd()*0.45, rr=i%2?0.075:0.045;
      parts.push({g:SHP.limb([Math.cos(a)*rr,0.13,Math.sin(a)*rr],unit(Math.cos(a)*t,1,Math.sin(a)*t),0.28+rnd()*0.14,0.018,0.011,3,4,-0.25,1.2),c:[0.85,0.85,0.85],c2:[1.15,1.15,1.15]}); }
    return SHP.merge(parts); })();
  // 불가사리 — 도톰한 다섯 팔
  const star=SHP.merge([{g:SHP.grid(30,3,(u,v)=>{ const a=u*6.2832, arm=Math.pow(0.5+0.5*Math.cos(a*5),2.2), R=0.17*(0.30+0.70*arm), t=1-v;
      return [Math.cos(a)*R*t, 0.006+0.05*(1-t*t)*(0.45+0.55*arm), Math.sin(a)*R*t]; },true)}],false,[0.8,1.1]);
  /* 다시마 — 물결치는 줄기에 잎이 어긋나 달리고 잎자루마다 공기 주머니(높이 1 — 인스턴스가 수심에 맞춰 늘인다.
     그래서 잎은 옆으로 넓게 지어 둔다: 세로로 서너 배 늘어난 뒤에 길쭉한 잎이 된다) */
  const kelp=(()=>{ const pts=[], rad=[], parts=[]; const N=9;
    const sx=t=>0.05*Math.sin(t*7.0), sz=t=>0.04*Math.sin(t*5.0+1.3);
    for(let i=0;i<=N;i++){ const t=i/N; pts.push([sx(t),t,sz(t)]); rad.push(0.020-0.012*t); }
    parts.push({g:SHP.tube(pts,rad,4,0.5),c:[0.8,0.8,0.8]});
    for(let i=0;i<11;i++){ const t=0.10+i*0.082, a=i*2.4+rnd()*0.5, L=0.30-0.10*t;
      parts.push({g:SHP.frond(L,0.10,{segs:4,curl:0.5,cup:0.12,wave:0.18,waves:1.5,p:0.4,tip:0.2}),
        x:sx(t),y:t,z:sz(t),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-a+1.5708,0)).premultiply(lean(a,1.05)),c:[0.85,0.85,0.85],c2:[1.12,1.12,1.12]});
      parts.push({g:new THREE.SphereGeometry(0.022,6,4),x:sx(t)+Math.cos(a)*0.03,y:t+0.006,z:sz(t)+Math.sin(a)*0.03,sy:0.4,c:[1.0,1.0,0.8]}); }
    return SHP.merge(parts,false,[0.6,1.1]); })();
  // 물밑 바위 — 등성이에 놓인다(진짜 바위 사진의 결을 입는다)
  const rockG=SHP.merge([{g:SHP.blob(1,77,{w:14,h:10,amp:0.30,nb:5,sy:0.72})}]);
  const rockIM=mk(rockG,260,false); gndDetailPatch(rockIM.material,4,0.9);
  SEA.m={ coral:[mk(branch,420,true),mk(dome,420,false),mk(fan,320,true),mk(tube,320,true),
                 mk(table,260,true),mk(pillar,260,false),mk(sponge,220,true)],
          anem:mk(anem,220,true,true), star:mk(star,160,true), kelp:mk(kelp,700,true,true), rock:rockIM,
          weed:mk(weed,900,true,true), clam:mk(clam,160,false), oyster:mk(oyster,160,false), urchin:mk(urchin,220,true) };
}
/* 산호 한 포기의 키(크기 1 일 때) — 수면 위로 솟지 않게 수심에 맞춰 줄인다 */
const SEA_CORAL_H=[1.05,0.40,0.72,0.72,0.72,1.15,0.46];
const SEA_CORAL_C=[[0.91,0.31,0.29],[0.94,0.54,0.23],[0.95,0.71,0.78],[0.66,0.42,0.82],[0.94,0.82,0.38],[0.35,0.72,0.78],[0.91,0.88,0.82]];
/* 바닷말 빛깔 — 풀빛이 아니라 갈조·홍조의 누런 갈색·짙은 올리브·붉은 갈색 */
const SEA_WEED_C=[[0.34,0.33,0.12],[0.16,0.32,0.20],[0.44,0.25,0.15],[0.40,0.37,0.11]];
const _seaM=new THREE.Matrix4(), _seaQ=new THREE.Quaternion(), _seaE=new THREE.Euler(), _seaV=new THREE.Vector3(),
      _seaS=new THREE.Vector3(), _seaC=new THREE.Color();
/* 사람 둘레에 바다 바닥을 깐다 */
function seaScatter(){
  const S=SEA; if(!S.m) seaBuildMeshes();
  const px=PL.pos.x, pz=PL.pos.z, C=S.cell, R=S.R, M=S.m;
  S.cx=px; S.cz=pz; S.dirty=false; S.picks.length=0;
  const n={c0:0,c1:0,c2:0,c3:0,c4:0,c5:0,c6:0,weed:0,clam:0,oyster:0,urchin:0,anem:0,star:0,kelp:0,rock:0};
  const NC=M.coral.length;
  /* 그 자리의 기울기 — 물밑 기복(shapeSeabed)은 F.slope 에 안 들어 있어 높이 차로 바로 잰다 */
  const slopeAt2=(x,z)=>Math.hypot(heightAt(x+1.2,z)-heightAt(x-1.2,z),heightAt(x,z+1.2)-heightAt(x,z-1.2))/2.4;
  const put=(im,i,x,y,z,sx,sy,yaw,tilt,col,tv)=>{
    _seaE.set(tilt*Math.sin(yaw*3.1),yaw,tilt*Math.cos(yaw*2.3)); _seaQ.setFromEuler(_seaE);
    _seaV.set(x,y,z); _seaS.set(sx,sy,sx); _seaM.compose(_seaV,_seaQ,_seaS); im.setMatrixAt(i,_seaM);
    im.setColorAt(i,_seaC.setRGB(col[0]*tv,col[1]*tv,col[2]*tv));
  };
  const x0=Math.floor((px-R)/C), x1=Math.floor((px+R)/C), z0=Math.floor((pz-R)/C), z1=Math.floor((pz+R)/C);
  for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){
    const h=seaHash(gx,gz,1);
    const wx=(gx+(h&255)/255)*C, wz=(gz+((h>>>8)&255)/255)*C;
    const d=Math.hypot(wx-px,wz-pz); if(d>R) continue;
    const dep=seaDepthAt(wx,wz); if(dep<0.45) continue;
    const y=-dep, u=((h>>>16)&1023)/1023, v=((h>>>26)&63)/63;
    const h2=seaHash(gx,gz,2), yaw=(h2&1023)/1023*6.283, tv=0.82+0.3*((h2>>>10)&15)/15;
    const edge=clamp((R-d)/7,0.2,1);                  // 가장자리에서 갑자기 생기지 않게 작게 시작
    const reef=seaIsReef(wx,wz,dep);
    const key=gx+','+gz;
    const kp=(kind,hy)=>{ if(d<20) S.picks.push({kind,x:wx,y:y+hy,z:wz,key:key+kind[0],keep:1}); };   // 그 자리에 남는 것(산호·바닷말·바위)
    const pick=(kind,im,cnt,sc,col)=>{
      const t=S.taken.get(key);
      if(t!==undefined){ if(gameHours-t<SEA_REGROW) return cnt; S.taken.delete(key); }
      if(cnt>=im.instanceMatrix.count) return cnt;
      put(im,cnt,wx,y,wz,sc,sc,yaw,0.2,col,tv);
      S.picks.push({kind,x:wx,y,z:wz,key});
      return cnt+1;
    };
    if(reef){
      if(u<0.52){                                     // 산호 — 일곱 가지 가운데 하나
        const ty=((h2>>>14)&7)%NC, im=M.coral[ty], k='c'+ty;
        if(n[k]<im.instanceMatrix.count){
          /* 크기 — 대개 무릎~허리, 열에 하나는 사람 키를 넘는 큰 산호(뭍의 나무), 넷에 하나는 한 뼘짜리(덤불) */
          const big=((h2>>>22)&15)===0?2.4:(((h2>>>22)&3)===1?0.55:1);
          const sc=Math.min((0.7+1.5*v*v)*edge*(ty===1?1.25:1)*big,(dep-0.35)/SEA_CORAL_H[ty]/1.15);   // 물 밖으로 솟지 않게
          put(im,n[k]++,wx,y,wz,sc,sc*(0.85+0.3*((h2>>>16)&7)/7),yaw,0.12,SEA_CORAL_C[(h2>>>19)%SEA_CORAL_C.length],tv);
          kp('coral',SEA_CORAL_H[ty]*sc*0.4);
        }
      }else if(u<0.60) n.urchin=pick('urchin',M.urchin,n.urchin,0.9+0.6*v,[0.22,0.15,0.28]);
      else if(u<0.74&&n.weed<M.weed.instanceMatrix.count){
        put(M.weed,n.weed++,wx,y,wz,(0.8+0.8*v)*edge,Math.min((0.9+1.3*v)*edge,(dep-0.3)/1.3),yaw,0.05,SEA_WEED_C[(h2>>>19)&3],tv); kp('weed',0.4); }
      else if(u<0.82&&n.anem<M.anem.instanceMatrix.count){       // 말미잘
        put(M.anem,n.anem++,wx,y,wz,(0.8+0.9*v)*edge,(0.8+0.9*v)*edge,yaw,0.05,SEA_CORAL_C[(h2>>>19)%SEA_CORAL_C.length],tv); kp('anem',0.2); }
    }else{
      const slope=slopeAt2(wx,wz);
      if(slope>0.42&&u<0.40&&n.rock<M.rock.instanceMatrix.count){         // 등성이·골 벽의 바위
        const sc=(0.35+1.5*v*v)*edge;
        put(M.rock,n.rock++,wx,y+sc*0.2,wz,sc,sc*(0.7+0.4*((h2>>>16)&7)/7),yaw,0.3,[0.44,0.45,0.44],tv); kp('rock',sc*0.5);
      }
      else if(dep>4&&dep<16&&seaVal(wx,wz,21,17)>0.60&&u<0.55&&n.kelp<M.kelp.instanceMatrix.count){  // 다시마 숲 — 키가 수심의 여덟 할
        put(M.kelp,n.kelp++,wx,y,wz,(0.9+0.9*v)*edge,Math.min(dep*0.8,7.5)*(0.6+0.4*v)*edge,yaw,0.03,SEA_WEED_C[(h2>>>19)&3],tv*0.9); kp('kelp',1.2); }
      else if(dep<9&&slope<0.25&&u>0.972)                                                              // 모래 위의 불가사리(주울 수 있다)
        n.star=pick('starfish',M.star,n.star,(0.8+0.9*v)*edge,[[0.86,0.36,0.22],[0.90,0.62,0.24],[0.62,0.30,0.52]][(h2>>>19)%3]);
      else if(dep<3.5&&slope>0.30&&u<0.22) n.oyster=pick('oyster',M.oyster,n.oyster,0.9+0.7*v,[0.62,0.61,0.56]);
      else if(dep<5&&slope<0.30&&u<0.05) n.clam=pick('clam',M.clam,n.clam,0.85+0.6*v,[0.90,0.84,0.74]);
      else if(dep>0.8&&dep<9&&seaVal(wx,wz,9,13)>0.60&&u<0.62&&n.weed<M.weed.instanceMatrix.count){  // 바닷말 숲 — 잎 끝이 수면 밑 한 뼘에서 멎는다
        put(M.weed,n.weed++,wx,y,wz,(0.8+0.9*v)*edge,Math.min((1.0+1.6*v)*edge,(dep-0.3)/1.3),yaw,0.05,SEA_WEED_C[(h2>>>19)&3],tv); kp('weed',0.4); }
      else if(dep>1.5&&dep<10&&u>0.988){              // 산호밭 밖의 외톨이 산호
        const ty=((h2>>>14)&7)%NC, im=M.coral[ty], k='c'+ty;
        const sc=Math.min((0.8+v)*edge,(dep-0.35)/SEA_CORAL_H[ty]/1.15);
        if(n[k]<im.instanceMatrix.count){ put(im,n[k]++,wx,y,wz,sc,sc,yaw,0.12,SEA_CORAL_C[(h2>>>19)%SEA_CORAL_C.length],tv); kp('coral',SEA_CORAL_H[ty]*sc*0.4); }
      }
    }
  }
  const fin=(im,c)=>{ im.count=c; im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; };
  M.coral.forEach((im,i)=>fin(im,n['c'+i])); fin(M.weed,n.weed); fin(M.clam,n.clam); fin(M.oyster,n.oyster); fin(M.urchin,n.urchin);
  fin(M.anem,n.anem); fin(M.star,n.star); fin(M.kelp,n.kelp); fin(M.rock,n.rock);
}
/* 눈앞의 주울 것 — 눈에서 2.4 m 안, 시선 앞쪽 */
function seaFindLook(){
  SEA.look=null;
  if(!SEA.picks.length||uiOpen()||PL.dead) return;
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z, cp=Math.cos(PL.pitch);
  const fx=-Math.sin(PL.yaw)*cp, fy=Math.sin(PL.pitch), fz=-Math.cos(PL.yaw)*cp;
  let bd=2.4; const e=equippedTool(), W=e&&ITEMS[e.id].tool, armed=!!(W&&(W.weapon||W.harpoon||W.net||W.gun));
  for(const p of SEA.picks){
    const dx=p.x-ex, dy=p.y+0.08-ey, dz=p.z-ez, d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(d>bd||d<0.05) continue;
    /* 산호·바닷말·바위(그 자리에 남는 것)는 똑바로 겨눠야 잡히고, 작살·무기·그물을 들었으면 안 잡힌다 — 물고기를 찌르려는
       좌클릭을 가로채지 않게 */
    if(p.keep&&armed) continue;
    if((dx*fx+dy*fy+dz*fz)/d<(p.keep?0.85:0.5)) continue;
    bd=d; SEA.look=p;
  }
}
/* 좌클릭 — 눈앞의 것을 줍는다. 주웠거나 막혔으면 true(손의 것을 쓰지 않는다) */
function seaPick(){
  const p=SEA.look; if(!p) return false;
  const D=SEA_PICK[p.kind];
  const sharp=INV.slots.some(s=>{ const t=ITEMS[s.id]; return (t.tags&&t.tags.indexOf('sharp')>=0)||(t.tool&&(t.tool.harpoon||t.tool.weapon)); });
  if(D.sting){ hurtPL(D.sting,'말미잘에 쏘였다'); toast('말미잘 — 촉수에 쏘였다. 흰동가리나 드나드는 곳이다'); return true; }
  if(D.keep){ const t=SEA.taken.get(p.key);
    if(t!==undefined&&gameHours-t<(D.regrow||SEA_REGROW)){ toast(D.n+' — 방금 뗀 자리다. 다른 것을 찾아라'); return true; } }
  if(D.need==='sharp'&&!sharp){ toast(D.n+' — 단단히 붙었다. 날붙이(주먹도끼·작살 따위)를 지녀야 뗀다'); return true; }
  let got=0; for(let i=0;i<(D.cnt||1);i++) if(invAdd(D.item,1)) got++;
  if(!got){ toast('무거워서 더 못 든다'); return true; }
  SEA.taken.set(p.key,gameHours); SEA.look=null;
  if(!D.keep) SEA.dirty=true;                        // 주워서 없어지는 것만 다시 깐다
  if(D.keep){ toast(D.n+' — '+ITEMS[D.item].n+' +'+got); sfx('bind'); invDirty=true; return true; }
  if(D.prick&&!equippedTool()){ hurtPL(D.prick,'성게 가시에 찔렸다'); toast(D.n+' +1 — 맨손이라 가시에 찔렸다(손에 무엇이든 들고 따면 안 찔린다)'); }
  else toast(D.n+' +1');
  sfx('bind'); invDirty=true;
  return true;
}

/* ── 물고기 ──────────────────────────────────────────────────────────────
   zone  reef 산호밭 · sand 모래 바닥 · shelf 얕은 바다(수심 4~16 m) · deep 먼바다(14 m 넘는 데)
   len   몸길이(m) · tall·thick 몸높이·두께(길이에 대한 비) · c [등, 배, 무늬] · pat 무늬
   school 떼 크기 · v 빠르기(m/s) · hp · tier 필요한 작살 등급 · drop [아이템, 수] · shy 달아나기 시작하는 거리 */
const FISH_SP=[
  {id:'clownfish', n:'흰동가리', zone:'reef', len:0.16,tall:0.50,thick:0.30, c:[0xf07a2a,0xf6a64e,0xffffff], pat:'bands', school:[2,4], v:0.9, hp:6,  tier:1, drop:['clownfish',1], shy:2.4, cap:10},
  {id:'angelfish', n:'엔젤피시', zone:'reef', len:0.24,tall:1.00,thick:0.16, c:[0xf0d040,0xf8ec9a,0x2a4a9a], pat:'bars',  school:[1,3], v:0.8, hp:8,  tier:1, drop:['angelfish',1], shy:2.8, cap:8, fin:1},
  {id:'pufferfish',n:'복어',     zone:'reef', len:0.28,tall:0.80,thick:0.80, c:[0xb8a060,0xf0ead0,0x5a4a2a], pat:'spots', school:[1,1], v:0.55,hp:12, tier:1, drop:['pufferfish',1], shy:2.0, cap:4},
  {id:'eel',       n:'장어',     zone:'reef', len:0.95,tall:0.10,thick:0.09, c:[0x4a4a3a,0x8a8a6a,0x2a2a22], pat:'plain', school:[1,1], v:1.1, hp:22, tier:2, drop:['eel',1], shy:3.0, cap:3, low:1},
  {id:'flounder',  n:'넙치',     zone:'sand', len:0.46,tall:0.12,thick:0.62, c:[0x9a8a62,0xb8a880,0x6a5a3a], pat:'spots', school:[1,1], v:0.6, hp:14, tier:1, drop:['flounder',1], shy:1.6, cap:5, low:1},
  {id:'mackerel',  n:'고등어',   zone:'shelf',len:0.34,tall:0.26,thick:0.17, c:[0x2a5a7a,0xdce4e8,0x16303e], pat:'tiger', school:[6,10],v:2.0, hp:8,  tier:1, drop:['mackerel',1], shy:4.0, cap:20},
  {id:'corvina',   n:'조기',     zone:'shelf',len:0.40,tall:0.32,thick:0.17, c:[0xb8a050,0xe8dca0,0x8a7a3a], pat:'plain', school:[3,5], v:1.4, hp:14, tier:2, drop:['corvina',1], shy:3.6, cap:8},
  {id:'cod',       n:'대구',     zone:'shelf',len:0.78,tall:0.27,thick:0.18, c:[0x6a6f5a,0xc8c8b0,0x4a4f3a], pat:'spots', school:[1,3], v:1.3, hp:30, tier:2, drop:['cod',1], shy:3.6, cap:5},
  {id:'tuna',      n:'참치',     zone:'deep', len:1.70,tall:0.30,thick:0.22, c:[0x1a3a5a,0xc8d0d8,0xe8c84a], pat:'plain', school:[2,4], v:3.6, hp:90, tier:3, drop:['tuna',3], shy:6.0, cap:5},
  {id:'swordfish', n:'황새치',   zone:'deep', len:2.40,tall:0.20,thick:0.14, c:[0x2a3a5a,0xb8c0c8,0x1a2a4a], pat:'plain', school:[1,1], v:4.2, hp:110,tier:3, drop:['swordfish',4], shy:6.0, cap:2, sword:1}
];
const FISH={list:[], schools:[], mesh:{}, spawnT:0, look:null, max:70};
/* 물고기 한 종의 생김새 — 방추형 몸(8마디 × 6각) + 꼬리지느러미 + 등지느러미 + 눈. 빛깔은 정점 색.
   앞이 +X 다(몸이 X 축을 따라 눕는다). */
function fishGeo(S){
  const L=S.len, P=[], Cc=[], col=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
  const cb=col(S.c[0]), cv=col(S.c[1]), cm=col(S.c[2]);
  const NS=8, NR=6, rnd=mulberry32(hashStr('fish|'+S.id));
  const prof=t=>Math.pow(Math.sin(Math.PI*Math.pow(t,0.78)),0.72);      // 꼬리(t=0)→주둥이(t=1) 굵기
  const ring=(i,j)=>{ const t=i/NS, a=j/NR*6.2832, r=Math.max(0.035,prof(t));
    return [(t-0.5)*L, Math.sin(a)*r*S.tall*L*0.5, Math.cos(a)*r*S.thick*L*0.5, t, Math.sin(a)]; };
  const spot=new Map();
  const tint=(t,up,ky)=>{                                             // 그 자리의 빛깔
    const k=clamp(up*0.5+0.5,0,1); let c=[cv[0]+(cb[0]-cv[0])*k,cv[1]+(cb[1]-cv[1])*k,cv[2]+(cb[2]-cv[2])*k];
    if(S.pat==='bands'){ if(Math.abs(t-0.30)<0.06||Math.abs(t-0.56)<0.06||Math.abs(t-0.80)<0.05) c=cm; }
    else if(S.pat==='bars'){ if(Math.abs(t-0.38)<0.05||Math.abs(t-0.66)<0.05) c=cm; }
    else if(S.pat==='tiger'){ if(up>0.1&&(Math.floor(t*NS)%2===0)) c=cm; }
    else if(S.pat==='spots'){ let f=spot.get(ky); if(f===undefined){ f=rnd(); spot.set(ky,f); } if(up>-0.2&&f<0.3) c=cm; }
    return c;
  };
  const tri=(a,b,c,ca,cb2,cc)=>{ P.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]); Cc.push(...ca,...cb2,...cc); };
  for(let i=0;i<NS;i++) for(let j=0;j<NR;j++){
    const a=ring(i,j), b=ring(i+1,j), c=ring(i+1,j+1), d=ring(i,j+1);
    const tm=(i+0.5)/NS, up=(a[4]+d[4])*0.5, cc=tint(tm,up,i+'|'+j);
    tri(a,b,c,cc,cc,cc); tri(a,c,d,cc,cc,cc);
  }
  const fc=[cb[0]*0.8,cb[1]*0.8,cb[2]*0.8], x0=-0.5*L, th=S.sword?0.30:0.24;
  // 꼬리 — 위아래로 갈라진 V
  tri([x0+0.04*L,0,0],[x0-0.20*L, th*L*Math.max(0.5,S.tall*1.6),0],[x0-0.07*L,0,0],fc,fc,fc);
  tri([x0+0.04*L,0,0],[x0-0.07*L,0,0],[x0-0.20*L,-th*L*Math.max(0.5,S.tall*1.6),0],fc,fc,fc);
  // 등지느러미(엔젤피시는 위아래로 길다)
  const hy=S.tall*L*0.5, fh=(S.fin?0.55:0.22)*L*Math.max(0.35,S.tall);
  tri([-0.02*L,hy*0.9,0],[0.20*L,hy*0.95,0],[-0.16*L,hy+fh,0],fc,fc,fc);
  if(S.fin) tri([-0.02*L,-hy*0.9,0],[-0.16*L,-hy-fh,0],[0.20*L,-hy*0.95,0],fc,fc,fc);
  if(S.sword){ const n=0.5*L; tri([n-0.02*L,0.012*L,0],[n+0.34*L,0,0],[n-0.02*L,-0.012*L,0],fc,fc,fc);    // 주둥이 칼
               tri([n-0.02*L,0,0.012*L],[n+0.34*L,0,0],[n-0.02*L,0,-0.012*L],fc,fc,fc); }
  // 눈
  const ex=0.33*L, ey=S.tall*L*0.12, ez=prof(0.83)*S.thick*L*0.5+0.004, es=Math.max(0.012,0.035*L), K=[0.04,0.04,0.05];
  for(const s of [-1,1]){ const z=ez*s;
    tri([ex-es,ey-es,z],[ex+es,ey-es,z],[ex+es,ey+es,z],K,K,K); tri([ex-es,ey-es,z],[ex+es,ey+es,z],[ex-es,ey+es,z],K,K,K); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(P),3));
  g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(Cc),3));
  SHP.smooth(g); g.computeBoundingSphere();          // 몸통의 면을 이어 둥글게(지느러미는 얇은 판 그대로)
  return g;
}
function fishInit(){
  const mat=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  for(const S of FISH_SP){
    const im=new THREE.InstancedMesh(fishGeo(S),mat,S.cap);
    im.count=0; im.frustumCulled=false; im.userData.lightRole='recv';
    im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im);
    FISH.mesh[S.id]=im;
  }
}
/* 그 자리에 살 수 있는 종 */
function fishZoneOK(S,x,z,dep){
  if(S.zone==='reef') return seaIsReef(x,z,dep)&&dep>1.4;
  if(S.zone==='sand') return dep>0.9&&dep<7&&!seaIsReef(x,z,dep);
  if(S.zone==='shelf') return dep>4&&dep<17;
  return dep>14;                                    // deep
}
function fishKill(f){
  let i=FISH.list.indexOf(f); if(i>=0) FISH.list.splice(i,1);
  i=CREATURES.indexOf(f); if(i>=0) CREATURES.splice(i,1);
  f.g.n--;
}
function fishClear(){
  for(const f of FISH.list){ const i=CREATURES.indexOf(f); if(i>=0) CREATURES.splice(i,1); }
  FISH.list.length=0; FISH.schools.length=0; FISH.look=null;
  for(const k in FISH.mesh) FISH.mesh[k].count=0;
}
/* 떼 하나를 사람 둘레 어딘가에 푼다 — 한 번에 한 떼. 풀었으면 true */
function fishSpawn(){
  const px=PL.pos.x, pz=PL.pos.z;
  const a=Math.random()*6.2832, r=17+Math.random()*30, x=px+Math.cos(a)*r, z=pz+Math.sin(a)*r;
  const dep=seaDepthAt(x,z); if(dep<1) return false;
  const ok=FISH_SP.filter(S=>fishZoneOK(S,x,z,dep)&&FISH.list.reduce((n,f)=>n+(f.sp===S?1:0),0)+S.school[0]<=S.cap);
  if(!ok.length) return false;
  const S=ok[(Math.random()*ok.length)|0];
  const k=S.school[0]+((Math.random()*(S.school[1]-S.school[0]+1))|0);
  const g={sp:S, hx:x, hz:z, tx:x, tz:z, ty:0, t:0, flee:0, n:0, a:Math.random()*6.2832};
  fishWaypoint(g,true);
  for(let i=0;i<k;i++){
    if(FISH.list.length>=FISH.max) break;
    const sz=0.82+Math.random()*0.36, spr=Math.max(0.5,S.len*2.2);
    const f={fish:true, sp:S, g, x:x+(Math.random()-0.5)*spr*2, y:g.ty+(Math.random()-0.5)*spr*0.6, z:z+(Math.random()-0.5)*spr*2,
      yaw:Math.random()*6.2832, sz, hp:S.hp*sz, r:Math.max(0.35,S.len*0.5*sz), stun:0,
      ox:(Math.random()-0.5)*spr*2, oy:(Math.random()-0.5)*spr*0.7, oz:(Math.random()-0.5)*spr*2, ph:Math.random()*6.2832, sp2:0.8+Math.random()*0.4};
    FISH.list.push(f); CREATURES.push(f); g.n++;
  }
  FISH.schools.push(g);
  return true;
}
/* 떼가 다음에 갈 곳 — 제 자리(home) 둘레에서, 제 종이 살 수 있는 수심인 데로 */
function fishWaypoint(g,first){
  const S=g.sp;
  for(let k=0;k<8;k++){
    const a=g.a+(Math.random()-0.5)*(first?6.3:2.6), r=first?0:4+Math.random()*(S.zone==='deep'?26:S.zone==='shelf'?16:8);
    const x=g.hx+Math.cos(a)*r, z=g.hz+Math.sin(a)*r, dep=seaDepthAt(x,z);
    if(!fishZoneOK(S,x,z,dep)&&k<7) continue;
    if(dep<0.8) continue;
    g.tx=x; g.tz=z; g.a=a;
    g.ty=S.low?-dep+0.12+S.tall*S.len*0.5 : S.zone==='reef'?-dep+0.5+Math.random()*Math.min(1.6,dep*0.4) : -dep*(0.30+Math.random()*0.5);
    break;
  }
  g.t=5+Math.random()*7;
}
const _fM=new THREE.Matrix4(), _fQ=new THREE.Quaternion(), _fE=new THREE.Euler(), _fV=new THREE.Vector3(), _fS=new THREE.Vector3();
function updateFish(dt){
  if(!FISH.mesh.clownfish) fishInit();
  const px=PL.pos.x, pz=PL.pos.z, py=camera.position.y-0.5;
  // 풀기 · 걷기 — 0.5초에 한 번
  FISH.spawnT-=dt;
  if(FISH.spawnT<=0){
    FISH.spawnT=0.5;
    for(let i=FISH.schools.length-1;i>=0;i--){
      const g=FISH.schools[i];
      if(g.n<=0||Math.hypot(g.tx-px,g.tz-pz)>66){
        for(const f of FISH.list.filter(f=>f.g===g)) fishKill(f);
        FISH.schools.splice(i,1);
      }
    }
    if(FISH.list.length<FISH.max){ let tries=FISH.list.length<24?6:2; while(tries-->0) if(fishSpawn()&&FISH.list.length>=24) break; }
  }
  // 떼의 길잡이
  for(const g of FISH.schools){
    g.t-=dt; if(g.flee>0) g.flee-=dt;
    const dpl=Math.hypot(g.tx-px,g.tz-pz);
    if(g.t<=0) fishWaypoint(g);
  }
  // 한 마리씩
  const cnt={}; FISH.look=null;
  const cp=Math.cos(PL.pitch), fx=-Math.sin(PL.yaw)*cp, fy=Math.sin(PL.pitch), fz=-Math.cos(PL.yaw)*cp;
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z;
  let lookD=3.6;
  for(let i=FISH.list.length-1;i>=0;i--){
    const f=FISH.list[i], S=f.sp, g=f.g;
    if(f.hp<=0){                                       // 잡혔다
      const near=Math.hypot(f.x-px,f.z-pz)<7;
      if(near){
        let got=0; for(let k=0;k<S.drop[1];k++) if(invAdd(S.drop[0],1)) got++;
        toast(got?('잡았다 — '+ITEMS[S.drop[0]].n+' +'+got):(S.n+' — 무거워서 못 들고 놓쳤다'));
        invDirty=true;
      }
      g.flee=3; fishKill(f); continue;
    }
    const dpx=f.x-px, dpz=f.z-pz, dpl=Math.hypot(dpx,dpz,f.y-py);
    if(dpl<S.shy&&g.flee<=0){                          // 사람이 다가왔다 — 떼가 반대쪽으로 달아난다
      g.flee=2.2; const l=Math.hypot(dpx,dpz)||1, rr=8+Math.random()*6;
      const nx=f.x+dpx/l*rr, nz=f.z+dpz/l*rr, nd=seaDepthAt(nx,nz);
      if(nd>0.9){ g.tx=nx; g.tz=nz; g.ty=Math.max(-nd+0.3,Math.min(-0.5,g.ty)); g.t=3; }
    }
    if(f.stun>0){ /* 작살에 꿰여 멎었다 — attack 이 시계를 깎는다 */ }
    else{
      const tx=g.tx+f.ox, tz=g.tz+f.oz, dx=tx-f.x, dz=tz-f.z, d=Math.hypot(dx,dz);
      const want=Math.atan2(dz,dx);
      let da=want-f.yaw; while(da>Math.PI) da-=6.2832; while(da<-Math.PI) da+=6.2832;
      const fl=g.flee>0?2.6:1;
      f.yaw+=clamp(da,-2.6*fl*dt,2.6*fl*dt);
      const v=S.v*f.sp2*fl*clamp(d/Math.max(0.6,S.len*2),0.25,1);
      const nx=f.x+Math.cos(f.yaw)*v*dt, nz=f.z+Math.sin(f.yaw)*v*dt, nd=seaDepthAt(nx,nz);
      if(nd>0.7){ f.x=nx; f.z=nz; } else { f.yaw+=2.4*dt*fl; g.t=Math.min(g.t,0.4); }   // 얕은 데에 닿았다 — 돌아선다
      const dep=seaDepthAt(f.x,f.z)||0.7, half=S.tall*S.len*0.5*f.sz;
      const ty=clamp(g.ty+f.oy,-dep+0.08+half,-0.3-half);
      f.y+=clamp(ty-f.y,-0.9*fl*dt,0.9*fl*dt);
      f.y=clamp(f.y,-dep+0.06+half,-0.2-half);
      f.ph+=dt*(5+v*5);
    }
    // 화면에
    const im=FISH.mesh[S.id], k=cnt[S.id]|0;
    if(k<im.instanceMatrix.count){
      _fE.set(S.low&&S.id==='flounder'?0:0,-f.yaw+Math.sin(f.ph)*0.16,0); _fQ.setFromEuler(_fE);
      _fV.set(f.x,f.y,f.z); _fS.set(f.sz,f.sz,f.sz); _fM.compose(_fV,_fQ,_fS); im.setMatrixAt(k,_fM);
      cnt[S.id]=k+1;
    }
    // 눈앞의 물고기(안내문)
    const lx=f.x-ex, ly=f.y-ey, lz=f.z-ez, ld=Math.hypot(lx,ly,lz);
    if(ld<lookD&&(lx*fx+ly*fy+lz*fz)/ld>0.72){ lookD=ld; FISH.look=f; }
  }
  for(const S of FISH_SP){ const im=FISH.mesh[S.id]; im.count=cnt[S.id]|0; im.instanceMatrix.needsUpdate=true; }
}
/* 그물 — 곁(6 m)의 잔고기(몸길이 0.5 m 밑)를 n 마리까지 건진다. 건진 종 이름과 수를 돌려준다 */
function fishNet(n){
  const got={}; let c=0;
  const near=FISH.list.filter(f=>f.sp.len<0.5&&Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z)<6)
                      .sort((a,b)=>Math.hypot(a.x-PL.pos.x,a.z-PL.pos.z)-Math.hypot(b.x-PL.pos.x,b.z-PL.pos.z));
  for(const f of near){ if(c>=n) break;
    if(!invAdd(f.sp.drop[0],1)) break;
    got[f.sp.n]=(got[f.sp.n]||0)+1; c++; f.g.flee=3; fishKill(f); }
  return c?Object.keys(got).map(k=>k+' '+got[k]+'마리').join(' · '):'';
}
/* 매 프레임 — 바다 가까이 있을 때만 일한다 */
function updateSea(dt){
  SEA.clock+=dt; SEA_U.uSeaT.value=SEA.clock;
  const px=PL.pos.x, pz=PL.pos.z;
  if(SEA.dirty||Math.hypot(px-SEA.cx,pz-SEA.cz)>6) seaScatter();
  seaFindLook();
  updateFish(dt);
  farTick(dt);                                       // 뭍에서 너무 멀어졌나
}
function seaReset(seed){
  SEA.seed=seed|0; SEA.taken.clear(); SEA.cx=SEA.cz=1e9; SEA.look=null; SEA.picks.length=0;
  fishClear();
  farInit();                                         // 뭍까지의 거리장을 새 섬에 맞춰 굽는다
}

/* ── 먼바다 — 뭍에서 너무 멀어지면 정신을 놓는다 ─────────────────────────────
   섬 둘레에 보이지 않는 금이 있다(사용자 요청). 뭍에서 헤엄쳐 `FAR_WARN` m 넘게 나가면 화면이 어두워지며 경고가 뜨고,
   `FAR_LIMIT` m 를 넘으면(또는 세상 끝에 닿으면) 정신을 놓는다 — 셋 가운데 하나가 일어난다:
     · 절반은 정신없이 헤엄쳐 **가장 가까운 물가로 돌아온다**(기력이 바닥나고 목이 탄다)
     · 열에 셋은 돌아오되 허우적대다 **지닌 것 하나를 잃는다**(사전은 안 잃는다)
     · 열에 둘은 물살에 떠밀려 **새 섬**에 닿는다 — 소지품 · 몸 상태 · 날짜는 그대로, 섬만 새로 만든다.
       떠나온 섬은 자동 저장에 남는다(다음 자동 저장 때 '이전 판 자동 저장' 칸으로 옮겨진다).
   뭍까지의 거리는 섬을 만든 뒤 한 번 거리장(`FAR.d`)으로 구워 둔다. */
const FAR={d:null, warned:false, busy:false, el:null, black:null, lv:0};
const FAR_WARN=140, FAR_LIMIT=220;
function farInit(){
  if(!FAR.d) FAR.d=new Float32Array(N*N);
  distanceField(FAR.d,i=>F.elev[i]>0.3);
  FAR.warned=false; FAR.busy=false; FAR.lv=0;
  if(!FAR.el){
    const e=document.createElement('div');                        // 둘레가 검푸르게 조여 드는 경고
    e.style.cssText='position:fixed;inset:0;pointer-events:none;display:none;z-index:38;'
      +'background:radial-gradient(ellipse at center,rgba(0,0,0,0) 30%,rgba(8,12,40,.55) 70%,rgba(2,3,14,.92) 100%)';
    document.body.appendChild(e); FAR.el=e;
    const b=document.createElement('div');                        // 정신을 놓는 순간의 암전
    b.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:45;background:#000;opacity:0;transition:opacity .7s';
    document.body.appendChild(b); FAR.black=b;
  }
}
/* 사람이 뭍에서 얼마나 떨어져 있나(m) — 뭍 위면 0 */
function farDist(){
  if(!FAR.d) return 0;
  const ix=clamp(Math.round(PL.pos.x/CELL+N/2),0,N-1), iz=clamp(Math.round(PL.pos.z/CELL+N/2),0,N-1);
  return FAR.d[IDX(ix,iz)];
}
/* 가장 가까운 물가 — 거리장을 따라 내려가 발 디딜 데(높이 0.4 m 넘는 칸)를 찾는다 */
function farShore(){
  let ix=clamp(Math.round(PL.pos.x/CELL+N/2),1,N-2), iz=clamp(Math.round(PL.pos.z/CELL+N/2),1,N-2);
  for(let s=0;s<2000;s++){
    if(F.elev[IDX(ix,iz)]>0.4) break;
    let bx=ix, bz=iz, bd=FAR.d[IDX(ix,iz)];
    for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
      const x=clamp(ix+dx,1,N-2), z=clamp(iz+dz,1,N-2), d=FAR.d[IDX(x,z)];
      if(d<bd){ bd=d; bx=x; bz=z; }
    }
    if(bx===ix&&bz===iz) break;
    ix=bx; iz=bz;
  }
  // 물가에서 뭍 쪽으로 두어 걸음 더
  const x=(ix-N/2)*CELL, z=(iz-N/2)*CELL;
  return {x,z,y:Math.max(heightAt(x,z),0.4)};
}
function farTick(dt){
  if(!FAR.d||FAR.busy||PL.dead) return;
  const d=farDist(), edge=Math.max(Math.abs(PL.pos.x),Math.abs(PL.pos.z))>HALF-40;
  const lv=clamp((d-FAR_WARN)/(FAR_LIMIT-FAR_WARN),0,1);
  FAR.lv+=(lv-FAR.lv)*clamp(dt*3,0,1);
  if(FAR.el){ FAR.el.style.display=FAR.lv>0.01?'block':'none'; if(FAR.lv>0.01) FAR.el.style.opacity=(0.25+0.75*FAR.lv).toFixed(2); }
  if(d>FAR_WARN&&!FAR.warned){ FAR.warned=true; toast('뭍이 아득하다 — 더 나가면 정신을 놓는다. 돌아가라'); }
  if(d<FAR_WARN-25) FAR.warned=false;
  if((d>=FAR_LIMIT||(edge&&d>30))&&PL.swim) farPanic();
}
function farPanic(){
  if(FAR.busy) return;
  FAR.busy=true;
  const r=Math.random();
  FAR.black.style.opacity='1';
  for(const k of Object.keys(keys)) keys[k]=false;
  setTimeout(()=>{
    if(r<0.8){                                        // 물가로 돌아온다(열에 셋은 무엇인가 잃고)
      const s=farShore();
      PL.pos.set(s.x,s.y+0.1,s.z); PL.vel.set(0,0,0); PL.camY=undefined;
      PL.stam=5; PL.oxy=100; PL.water=clamp(PL.water-18,0,100); PL.food=clamp(PL.food-8,0,100);
      let lost='';
      if(r>=0.5){
        const pool=INV.slots.filter(sl=>sl.id!=='codex');
        if(pool.length){ const sl=pool[(Math.random()*pool.length)|0]; lost=ITEMS[sl.id].n;
          invRemove(INV.slots.indexOf(sl),1); refreshWear(); quickDirty=true; invDirty=true; }
      }
      toast('정신을 놓았다 — 눈을 떠 보니 물가다. 어떻게 돌아왔는지 기억이 없다'+(lost?' · 허우적대다 '+lost+' 하나를 잃었다':''));
      FAR.black.style.opacity='0'; FAR.warned=false; FAR.lv=0;
      setTimeout(()=>{ FAR.busy=false; },900);
    }else farDrift();
  },800);
}
/* 물살에 떠밀려 새 섬으로 — 소지품·몸·날짜는 그대로 들고 간다 */
async function farDrift(){
  try{
    try{ autoSave(''); }catch(e){}                    // 떠나온 섬을 자동 저장에 남긴다
    const keep={inv:saveSlots(INV.slots), sel:INV.sel, eq:EQUIP?INV.slots.indexOf(EQUIP):-1,
      wear:Object.fromEntries(Object.keys(WEAR).map(k=>[k,WEAR[k]?INV.slots.indexOf(WEAR[k]):-1])),
      quick:QUICK.map(sl=>sl?INV.slots.indexOf(sl):-1), hour:hourOfDay, gh:gameHours, ts:timeScale,
      hp:PL.hp, food:PL.food, water:PL.water, ill:PL.ill};
    const w=['tide','ashen','vireo','kelp','marrow','glass','hollow','ember','driftwood','saltgrave'];
    P.seed=w[(Math.random()*w.length)|0]+'-'+((Math.random()*9000+1000)|0);
    const se=document.getElementById('pSeed'); if(se) se.value=P.seed;
    await generateWorld();
    INV.slots.length=0; for(const o of loadSlots(keep.inv)) INV.slots.push(o);
    INV.sel=keep.sel|0; EQUIP=keep.eq>=0?INV.slots[keep.eq]||null:null;
    for(const k in WEAR){ const sl=keep.wear[k]>=0?INV.slots[keep.wear[k]]:null; WEAR[k]=(sl&&ITEMS[sl.id].wear)?sl:null; }
    for(let i=0;i<QUICK.length;i++) QUICK[i]=keep.quick[i]>=0?INV.slots[keep.quick[i]]||null:null;
    refreshWear(); invDirty=craftDirty=quickDirty=true;
    hourOfDay=keep.hour; gameHours=keep.gh; timeScale=keep.ts||1;
    PL.hp=Math.max(20,keep.hp); PL.food=clamp(keep.food-10,0,100); PL.water=clamp(keep.water-20,0,100); PL.ill=keep.ill; PL.stam=10;
    start();                                          // 덮개를 걷고 새 섬 물가에서 깨어난다
    toast('물살에 떠밀려 낯선 섬에 닿았다 — 시드 '+P.seed+' · 떠나온 섬은 자동 저장에 남았다');
  }catch(e){ showErr('표류',e); }
  FAR.black.style.opacity='0'; FAR.busy=false; FAR.warned=false; FAR.lv=0;
}
