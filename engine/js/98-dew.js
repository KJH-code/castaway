/* 98-dew.js — CASTAWAY
   이슬 — 새벽에 맺혀 아침 볕에 마르는 물기 · 잎 위의 물방울
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   이슬
   ----------------------------------------------------------------------------
   세 겹으로 나눠 그린다 — 보이는 거리가 다르다(사용자 요청):
     ① **맺힌 정도**(`TERR_U.uDew` 0~1 — 41-terrain-light.js `updateTlit` 이 정한다): 새벽 2시 반부터 맺혀 5시 반에 가득하고
        아침 8~10시에 마른다. 흐린 밤에는 덜 맺히고(구름이 복사 냉각을 막는다), 비가 온 뒤에는 잎에 물기가 남는다.
     ② **멀리 · 가운데**(재질) — 잎 재질과 풀밭 땅이 볕에 **반짝인다**: 세계 좌표의 잔 칸마다 난수 하나, 문턱을 넘는 칸이 해의
        빛깔로 빛난다. 칸의 크기는 거리에 비례해(화소 하나쯤) 멀어도 들끓지 않고, 눈이 움직이면 반짝이는 자리가 바뀐다.
        그림자·구름 그늘·산 그림자 속에서는 안 반짝인다(해의 몫에 곱한다). 45-sky.js `envPatch` · 22-ground-textures.js.
     ③ **가까이**(이 파일) — 사람 둘레 3.2 m 의 덤불·고사리·꽃 잎 위에 **물방울 메시**(반구 · 많아야 420 개).
        · 자리: 잎 판의 세모에서 뽑되 그림(알파)이 있는 데만 — 판의 빈 데에 방울이 뜨지 않게. 종류·벌마다 한 번 뽑아 둔다.
        · 빛: 물은 유전체다(금속이 아니다). 프레넬(수직 2% → 비스듬히 볼수록 하늘이 비친다) · 해의 상(작고 날카로운 흰 점 —
          해 방향과 눈 방향으로 센다) · 방울 속을 지나 해 반대쪽 아래에 모이는 밝은 초승달(굴절된 빛의 초점) · 가장자리의 어두운 테.
          배경을 다시 그려 꺾어 보이는 것(화면 굴절)은 안 한다 — 캠코더 그림판(480줄)에서 6~13 mm 방울은 몇 화소다.
        · 그늘: 사람이 선 자리의 산 그림자·숲 덮임으로 해의 상을 줄인다(방울마다 그림자를 읽지는 않는다).
   ========================================================================== */
const DEWD={mesh:null, cap:420, R:3.2, S:{}, alpha:null, px:1e9, pz:1e9, k:-1, t:0};
const _dwM=new THREE.Matrix4(), _dwV=new THREE.Vector3(), _dwN=new THREE.Vector3(), _dwQ=new THREE.Quaternion(), _dwS=new THREE.Vector3(), _dwUP=new THREE.Vector3(0,1,0);
function dewInit(){
  const g=new THREE.SphereGeometry(1,9,5,0,6.2832,0,1.5708);
  const m=new THREE.ShaderMaterial({
    uniforms:{uSun:{value:new THREE.Vector3(0,1,0)},uSunC:{value:new THREE.Color(1,1,1)},uSky:{value:new THREE.Color(0.4,0.6,0.9)},uHz:{value:new THREE.Color(0.7,0.8,0.9)},uVis:{value:1}},
    vertexShader:`uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vL; varying vec3 vSL;
void main(){ vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);
  mat3 R=mat3(normalize(instanceMatrix[0].xyz),normalize(instanceMatrix[1].xyz),normalize(instanceMatrix[2].xyz));
  vN=R*normal; vV=cameraPosition-w.xyz; vL=position; vSL=uSun*R;                 // 방울 제 좌표에서 본 해
  gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform vec3 uSun,uSunC,uSky,uHz; uniform float uVis; varying vec3 vN; varying vec3 vV; varying vec3 vL; varying vec3 vSL;
void main(){ vec3 n=normalize(vN), v=normalize(vV); float nv=max(dot(n,v),0.0);
  float F=0.02+0.98*pow(1.0-nv,5.0);                                              // 프레넬 — 물(굴절률 1.33)
  vec3 r=reflect(-v,n), env=mix(uHz,uSky,clamp(r.y*1.4+0.2,0.0,1.0));
  float sp=pow(max(dot(n,normalize(v+uSun)),0.0),700.0)*uVis*28.0;                // 해의 상
  float ca=smoothstep(0.15,0.95,dot(normalize(vL.xz+1e-4),-normalize(vSL.xz+1e-4)))*smoothstep(0.80,0.30,vL.y)*max(vSL.y,0.0)*uVis;   // 굴절된 빛의 초점
  float rim=smoothstep(0.22,0.02,vL.y)*0.30;                                      // 가장자리의 어두운 테
  vec3 col=env*F+uSunC*sp+uSunC*vec3(0.80,0.98,0.50)*ca*0.85;
  gl_FragColor=vec4(col,clamp(F+sp+ca*0.7+rim+0.05,0.0,1.0)); }`,
    transparent:true, depthWrite:false, blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.OneMinusSrcAlphaFactor});
  const im=new THREE.InstancedMesh(g,m,DEWD.cap); im.count=0; im.frustumCulled=false; im.visible=false; im.userData.lightRole='none';
  im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im); DEWD.mesh=im;
}
/* 잎 위의 자리 — 그 종류·벌의 메시에서 그림이 있는 데(알파)만 골라 [자리 3 · 법선 3] 을 뽑아 둔다 */
function dewSamples(kind,v){
  const key=kind+'|'+v; if(DEWD.S[key]) return DEWD.S[key];
  const out=[], im=FLORA.m[kind]&&FLORA.m[kind][v]; if(!im) return DEWD.S[key]=out;
  if(!DEWD.alpha){ try{ const c=FLORA.tex.image, d=c.getContext('2d').getImageData(0,0,c.width,c.height).data, a=new Uint8Array(c.width*c.height);
      for(let i=0;i<a.length;i++) a[i]=d[i*4+3]; DEWD.alpha={a,w:c.width,h:c.height}; }catch(e){ DEWD.alpha={a:null,w:1,h:1}; } }
  const g=im.geometry, P=g.attributes.position, Nn=g.attributes.normal, UV=g.attributes.uv, I=g.index, A=DEWD.alpha, nt=((I?I.count:P.count)/3)|0;
  const rnd=mulberry32((hashStr(key)^0xdeb)>>>0);
  for(let tr=0;tr<900&&out.length<6*40;tr++){
    const t=(rnd()*nt)|0, a=I?I.getX(t*3):t*3, b=I?I.getX(t*3+1):t*3+1, c=I?I.getX(t*3+2):t*3+2;
    let u=rnd(), w=rnd(); if(u+w>1){ u=1-u; w=1-w; } const q=1-u-w;
    let nx=Nn.getX(a)+Nn.getX(b)+Nn.getX(c), ny=Nn.getY(a)+Nn.getY(b)+Nn.getY(c), nz=Nn.getZ(a)+Nn.getZ(b)+Nn.getZ(c); const nl=Math.hypot(nx,ny,nz)||1; nx/=nl; ny/=nl; nz/=nl;
    if(Math.abs(ny)<0.30) continue;                                                // 곧추선 면에는 안 맺힌다(흘러내린다)
    if(ny<0){ nx=-nx; ny=-ny; nz=-nz; }                                           // 잎 판은 양면이다 — 위를 보는 쪽에 얹는다
    const y=P.getY(a)*q+P.getY(b)*u+P.getY(c)*w; if(y<0.04) continue;
    if(UV&&A.a){ const tu=UV.getX(a)*q+UV.getX(b)*u+UV.getX(c)*w, tv=UV.getY(a)*q+UV.getY(b)*u+UV.getY(c)*w;
      const ax=Math.min(A.w-1,Math.max(0,(tu*A.w)|0)), ay=Math.min(A.h-1,Math.max(0,((1-tv)*A.h)|0)); if(A.a[ay*A.w+ax]<140) continue; }
    out.push(P.getX(a)*q+P.getX(b)*u+P.getX(c)*w,y,P.getZ(a)*q+P.getZ(b)*u+P.getZ(c)*w,nx,ny,nz);
  }
  return DEWD.S[key]=out;
}
/* 프레임마다 — 빛을 맞추고, 사람이 반 걸음 움직였거나 이슬의 양이 바뀌었으면 방울을 다시 놓는다 */
function updateDew(){
  const k=TERR_U.uDew.value, D=DEWD;
  if(k<0.04||!FLORA.m){ if(D.mesh&&D.mesh.visible){ D.mesh.visible=false; D.k=-1; } return; }
  if(!D.mesh) dewInit();
  const U=D.mesh.material.uniforms, px=PL.pos.x, pz=PL.pos.z;
  U.uSun.value.copy(TERR_U.uSunDir.value); U.uSunC.value.copy(sun.color).multiplyScalar(Math.min(1.6,sun.intensity));
  U.uSky.value.copy(hemi.color).multiplyScalar(0.55+hemi.intensity); U.uHz.value.copy(scene.fog.color);
  { let vis=1; if(TLIT.px){ const i=IDX(clamp(Math.round(px/CELL+N/2),0,N-1),clamp(Math.round(pz/CELL+N/2),0,N-1))*4; vis=(TLIT.px[i]/255)*(1-0.7*TLIT.px[i+2]/255); }
    U.uVis.value=vis*(TERR_U.uSunDir.value.y>0.02?1:0); }
  if((D.t++&7)&&D.mesh.visible) return;
  const kq=Math.round(k*8);
  if((px-D.px)*(px-D.px)+(pz-D.pz)*(pz-D.pz)<0.2&&kq===D.k&&FLORA.near.cx===D.fx) return;
  D.px=px; D.pz=pz; D.k=kq; D.fx=FLORA.near.cx;
  const R2=D.R*D.R, im=D.mesh; let n=0;
  for(const kind of FLORA.near.kinds){ const ms=FLORA.m[kind]; if(!ms||kind==='shroom'||kind==='dry') continue;
    for(let v=0;v<ms.length&&n<D.cap;v++){ const fm=ms[v]; if(!fm.count) continue; const S=dewSamples(kind,v), ns=(S.length/6)|0; if(!ns) continue;
      for(let i=0;i<fm.count&&n<D.cap;i++){ const e=fm.instanceMatrix.array, o=i*16, dx=e[o+12]-px, dz=e[o+14]-pz; if(dx*dx+dz*dz>R2) continue;
        _dwM.fromArray(e,o);
        let h=(Math.imul(i+1,0x9e3779b1)^Math.imul(v+7,0x85ebca6b))>>>0;
        for(let j=0,cnt=Math.round(6+10*k);j<cnt&&n<D.cap;j++){ h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0; const s=(h%ns)*6;
          _dwV.set(S[s],S[s+1],S[s+2]).applyMatrix4(_dwM); _dwN.set(S[s+3],S[s+4],S[s+5]).transformDirection(_dwM);
          const r=(0.006+0.007*((h>>>9)&255)/255)*(0.6+0.4*k);                    // 반지름 6~13 mm(실제보다 조금 크다 — 480줄 그림판에서 점으로라도 보이게)
          _dwQ.setFromUnitVectors(_dwUP,_dwN); _dwS.set(r,r*(0.62+0.2*((h>>>18)&15)/15),r);   // 잎에 눌려 납작하다
          _dwV.addScaledVector(_dwN,-r*0.08); _dwM.compose(_dwV,_dwQ,_dwS); im.setMatrixAt(n++,_dwM); _dwM.fromArray(e,o); } } } }
  im.count=n; im.visible=n>0; im.instanceMatrix.needsUpdate=true;
}
