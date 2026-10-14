/* 22-ground-textures.js — CASTAWAY
   사진 결 — 땅·바위에 실제 사진 텍스처를 입힌다. 잡음을 화소마다 수십 번 세던 것을 텍스처 몇 번 읽기로 바꿔 훨씬 가볍다.
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   사진 결
   ----------------------------------------------------------------------------
   예전 땅 셰이더는 결을 전부 **수식**으로 그렸다 — 화소 하나에 심플렉스 잡음 40번 안팎 + 보로노이 9칸. 화면이
   온통 땅이라 이것이 프레임 시간의 큰 몫이었고(Apple M1 에서 22~30 FPS), 그렇게 그린 모래·자갈은 가까이서
   물감 얼룩 같았다(사용자 지적). 이제 **실제 사진**(Poly Haven · CC0) 여덟 장을 읽는다:
     0 모래 · 1 풀밭 · 2 활엽수림 바닥 · 3 침엽수림 바닥 · 4 바위 · 5 자갈 · 6 진흙 · 7 마른 흙
   · 여덟 장을 **배열 텍스처 한 장**(sampler2DArray)에 담는다 — 텍스처 자리 하나만 쓴다(그림자 지도와 자리를 다투지 않는다).
   · 사진은 제 평균색으로 나눠 '결'만 남긴다(평균이 0.5 가 되게). 그래서 바이옴 색은 그대로고 사진은 무늬와
     색의 흔들림만 보탠다 — 바이옴 경계·젖은 띠·시간대 빛깔 같은 기존 손질이 전부 그대로 먹는다.
   · 잡음도 텍스처로 읽는다(`uNz` — 이어 붙는 값잡음 네 채널). 경계 비틀기·큰 얼룩·거품 무늬가 이것을 쓴다.
   · WebGL2 가 없으면(아주 옛 브라우저) `GND_OK()` 가 거짓이라 예전 수식 셰이더가 그대로 돈다.
   ========================================================================== */
const GND={tex:null, nz:null, ready:false, S:512};
const GND_OK=()=>!!(renderer&&renderer.capabilities.isWebGL2&&GND.tex);

/* 이어 붙는 값잡음 — 256×256, 채널 넷이 서로 다른 잡음(세 옥타브) */
function gndNoiseTex(){
  const S=256, d=new Uint8Array(S*S*4), rnd=mulberry32(0x9e3779b9);
  for(let ch=0;ch<4;ch++){
    const oct=[[8,0.55],[16,0.30],[32,0.15]].map(o=>({n:o[0],a:o[1],g:Float32Array.from({length:o[0]*o[0]},()=>rnd())}));
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){
      let v=0;
      for(const o of oct){
        const n=o.n, fx=x/S*n, fy=y/S*n, ix=Math.floor(fx), iy=Math.floor(fy), tx=fx-ix, ty=fy-iy;
        const sx=tx*tx*(3-2*tx), sy=ty*ty*(3-2*ty);
        const a=o.g[(iy%n)*n+(ix%n)], b=o.g[(iy%n)*n+((ix+1)%n)], c=o.g[((iy+1)%n)*n+(ix%n)], e=o.g[((iy+1)%n)*n+((ix+1)%n)];
        const top=a+(b-a)*sx, bot=c+(e-c)*sx;
        v+=o.a*(top+(bot-top)*sy);
      }
      d[(y*S+x)*4+ch]=Math.max(0,Math.min(255,Math.round((0.5+(v-0.5)*1.7)*255)));
    }
  }
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=true; t.needsUpdate=true;
  return t;
}
/* 땅의 잔 기복 — 높이와 그 기울기를 한 장에(R 높이 · G·B 기울기 ∂/∂u·∂/∂v · A 다른 잡음). 되풀이되는 256² 한 장을
   세 배율(190 m · 31 m · 4.2 m 에 한 장)로 읽어 둔덕·골·잔 울퉁불퉁을 만든다. 기울기를 같이 담아 두면 화소에서 한 번 읽어
   법선을 바로 기울일 수 있다(이웃을 두 번 더 읽지 않는다). 가운데 한 겹은 접힌 잡음(능선·골의 금)이다.
   `GND.relQ`(높이 · 0~1 · 텍스처의 8비트 값) · `GND.relK`(기울기 눈금)는 CPU 쪽 셈에도 쓴다(10-worldgen.js `reliefT`) */
function gndReliefTex(){
  const S=256, H=new Float32Array(S*S), d=new Uint8Array(S*S*4), rnd=mulberry32(0x51f15e);
  const lat=n=>({n,g:Float32Array.from({length:n*n},()=>rnd())});
  const smp=(o,x,y)=>{ const n=o.n, fx=x/S*n, fy=y/S*n, ix=Math.floor(fx), iy=Math.floor(fy), tx=fx-ix, ty=fy-iy,
      sx=tx*tx*tx*(tx*(tx*6-15)+10), sy=ty*ty*ty*(ty*(ty*6-15)+10);
    const a=o.g[(iy%n)*n+(ix%n)], b=o.g[(iy%n)*n+((ix+1)%n)], c=o.g[((iy+1)%n)*n+(ix%n)], e=o.g[((iy+1)%n)*n+((ix+1)%n)];
    return (a+(b-a)*sx)*(1-sy)+(c+(e-c)*sx)*sy; };
  const A=lat(4), B=lat(8), C=lat(16), D=lat(32), E=lat(8);
  let lo=1e9, hi=-1e9;
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const r=1-Math.abs(2*smp(C,x,y)-1), v=0.42*smp(A,x,y)+0.28*smp(B,x,y)+0.20*r*r+0.10*smp(D,x,y);
    H[y*S+x]=v; if(v<lo) lo=v; if(v>hi) hi=v; }
  for(let i=0;i<S*S;i++) H[i]=(H[i]-lo)/(hi-lo);
  let K=1e-6; const G=new Float32Array(S*S*2);
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x;
    const gx=(H[y*S+((x+1)%S)]-H[y*S+((x+S-1)%S)])*S/2, gy=(H[((y+1)%S)*S+x]-H[((y+S-1)%S)*S+x])*S/2;
    G[i*2]=gx; G[i*2+1]=gy; K=Math.max(K,Math.abs(gx),Math.abs(gy)); }
  for(let y=0;y<S;y++) for(let x=0;x<S;x++){ const i=y*S+x;
    d[i*4]=Math.round(H[i]*255); d[i*4+1]=Math.round(127.5+127.5*G[i*2]/K); d[i*4+2]=Math.round(127.5+127.5*G[i*2+1]/K); d[i*4+3]=Math.round(smp(E,x,y)*255); }
  GND.relQ=Float32Array.from(H,v=>Math.round(v*255)/255); GND.relK=K;      // CPU 가 읽는 높이 — 텍스처에 든 8비트 값 그대로(heightAt 과 덧판 셰이더가 같은 값을 본다)
  const t=new THREE.DataTexture(d,S,S,THREE.RGBAFormat);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.minFilter=THREE.LinearMipmapLinearFilter; t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=true; t.needsUpdate=true;
  return t;
}
function gndArrayTex(data,S,n){
  const t=new THREE.DataTexture2DArray(data,S,S,n);
  t.format=THREE.RGBAFormat; t.type=THREE.UnsignedByteType;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.minFilter=S>1?THREE.LinearMipmapLinearFilter:THREE.LinearFilter; t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=S>1; t.needsUpdate=true;
  return t;
}
/* 바위 사진(data-rock-textures.js) — 빛깔 여섯 장 · 법선 지도 여섯 장을 배열 텍스처 두 장으로(`uRk` · `uRkN` — 바위 재질 rockMat 이 읽는다).
   빛깔은 **밝기만** 평균으로 나눈다(평균 밝기 → 0.5). 땅 사진처럼 빛깔까지 나누면 사암의 누런빛 · 지의류의 풀빛이 사라진다 —
   바위 재질의 바탕색과 덩이 빛깔(정점 색)이 곱해지므로 밝기만 맞추면 된다. 법선 지도는 그대로 올린다.
   다 풀리기 전에는 한 점짜리(중간 회색 · 곧게 선 법선)가 물려 있다 */
function rockPhotoInit(){
  if(typeof ROCK_JPG==='undefined'||typeof THREE.DataTexture2DArray!=='function') return;
  const n=ROCK_JPG.length, S=512, flat=new Uint8Array(4*n);
  for(let i=0;i<n;i++) flat.set([128,128,255,255],i*4);
  TERR_U.uRk={value:gndArrayTex(new Uint8Array(4*n).fill(128),1,n)};
  TERR_U.uRkN={value:gndArrayTex(flat,1,n)};
  const load=(list,nrm,uni)=>{
    const data=new Uint8Array(S*S*4*n); let left=n;
    const done=()=>{ const old=uni.value; uni.value=gndArrayTex(data,S,n); old.dispose(); };
    list.forEach((src,k)=>{
      const im=new Image(), o=k*S*S*4;
      im.onerror=()=>{ for(let i=0;i<S*S;i++) data.set(nrm?[128,128,255,255]:[128,128,128,255],o+i*4); if(--left===0) done(); };
      im.onload=()=>{
        const cv2=document.createElement('canvas'); cv2.width=cv2.height=S;
        const g=cv2.getContext('2d'); g.drawImage(im,0,0,S,S);
        const px=g.getImageData(0,0,S,S).data;
        if(nrm) data.set(px,o);
        else{ let L=0; for(let i=0;i<px.length;i+=4) L+=0.30*px[i]+0.59*px[i+1]+0.11*px[i+2];
          const kk=127.5/(L/(S*S)||1);
          for(let i=0;i<px.length;i+=4){ data[o+i]=Math.min(255,px[i]*kk); data[o+i+1]=Math.min(255,px[i+1]*kk); data[o+i+2]=Math.min(255,px[i+2]*kk); data[o+i+3]=255; } }
        if(--left===0) done();
      };
      im.src=src;
    });
  };
  load(ROCK_JPG,false,TERR_U.uRk); load(ROCK_NRM,true,TERR_U.uRkN);
}
/* 한 번 — 잡음 텍스처를 만들고, 사진을 풀어 배열 텍스처로 올린다. 사진이 다 풀리기 전(1초 안쪽)에는
   중간 회색 한 점짜리가 대신 물려 있다(무늬 없는 땅 — 곧 바뀐다). */
function gndInit(){
  const n=GND_JPG.length, S=GND.S;
  GND.nz=gndNoiseTex();
  TERR_U.uNz={value:GND.nz}; WATER_U.uNz=TERR_U.uNz;
  TERR_U.uShT={value:0};
  TERR_U.uRel={value:gndReliefTex()};
  if(typeof THREE.DataTexture2DArray!=='function') return;
  GND.tex=gndArrayTex(new Uint8Array(4*n).fill(128),1,n);
  TERR_U.uGnd={value:GND.tex};
  rockPhotoInit();
  const data=new Uint8Array(S*S*4*n); let left=n;
  GND_JPG.forEach((src,k)=>{
    const im=new Image();
    im.onerror=()=>{ data.fill(128,k*S*S*4,(k+1)*S*S*4); if(--left===0) done(); };
    im.onload=()=>{
      const cv2=document.createElement('canvas'); cv2.width=cv2.height=S;
      const g=cv2.getContext('2d'); g.drawImage(im,0,0,S,S);
      const px=g.getImageData(0,0,S,S).data;
      let r=0,gg=0,b=0; for(let i=0;i<px.length;i+=4){ r+=px[i]; gg+=px[i+1]; b+=px[i+2]; }
      const N2=S*S, kr=127.5/(r/N2||1), kg=127.5/(gg/N2||1), kb=127.5/(b/N2||1), o=k*S*S*4;
      for(let i=0;i<px.length;i+=4){                    // 평균색으로 나눠 '결'만 남긴다(평균 → 0.5)
        data[o+i]=Math.min(255,px[i]*kr); data[o+i+1]=Math.min(255,px[i+1]*kg); data[o+i+2]=Math.min(255,px[i+2]*kb); data[o+i+3]=255; }
      if(--left===0) done();
    };
    im.src=src;
  });
  function done(){
    const old=GND.tex;
    GND.tex=gndArrayTex(data,S,n);
    TERR_U.uGnd.value=GND.tex; old.dispose(); GND.ready=true;
  }
}

/* ── 땅 셰이더(사진 판) ─────────────────────────────────────────────────
   terrainMat 이 정점 쪽(vTW · vTN · vTD)을 붙인 뒤 이 함수로 조각 쪽을 갈아 끼운다.
   화소 하나의 일: 잡음 텍스처 2번 → 바이옴 색·가림막 8번(가운데+둘레 셋씩) → 사진 결 2~6번(그 자리에 있는 땅의 것만)
   → 물가면 거품 무늬 2번. 수식 잡음은 하나도 안 센다.

   **화소마다의 빛**(끝머리 '화소마다의 빛' 토막) — 램버트는 빛을 정점에서 센다. 땅의 정점은 칸마다 하나(6배 섬에서 15 m)라
   비탈이 밋밋한 판으로 보였다. 땅만은 해의 몫을 화소에서 다시 센다:
     ① 잔 기복(`uRel` — 세 배율)의 기울기로 법선을 기울인다. 모래·진흙은 순하게, 바위는 거칠게.
     ② 사진 결의 밝기를 높이로 보고 한 번 더 기울인다(가까이서만 — 화면 미분으로 구한다. 더 읽는 것은 없다).
     ③ 그 법선으로 N·L 을 세어 정점에서 온 값(`lambW.x`) 자리에 넣는다(`gndSun`). 그림자·구름 그늘·산 그림자는 그대로 곱해진다.
     ④ 그림자 지도 밖(`uShR`)에서는 숲 덮임(`uTL` 의 B)만큼 햇빛을 깎는다 — 먼 숲 바닥이 어둡다. 하늘빛도 조금.
     ⑤ 기복의 낮은 데는 하늘빛을 덜 받는다(`gndAmb`).
     ⑥ 젖은 데(물가 · 진흙 · 비 `uWet`)는 짙어지고 번들거린다(블린-퐁 — 마른 흙은 넓고 흐리게, 젖으면 좁고 밝게) */
function gndTerrainFrag(frag){
  const SUN='reflectedLight.directDiffuse += PI * directionalLights[ 0 ].color * lambW.x * getShadowMask();',
        IND='reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );';
  const PIX=frag.split(SUN).length===2&&frag.split(IND).length===2;      // 램버트 조각 셰이더가 예상과 같을 때만 화소 빛으로 간다
  if(PIX) frag=frag.replace(SUN,SUN.replace('lambW.x','gndSun')).replace(IND,IND+'\n\treflectedLight.indirectDiffuse *= gndAmb;');
  const RK=!!TERR_U.uRk;                       // 바위 사진 여섯 장(data-rock-textures.js) — 가파른 벼랑 면이 읽는다
  return `uniform vec3 uSunDir;${RK?'\nuniform mediump sampler2DArray uRk;':''}
uniform sampler2D uRel; uniform sampler2D uTL; uniform float uShR, uWet, uDew;
float gndSun=1.0, gndAmb=1.0;
uniform sampler2D uBio; uniform sampler2D uBio2; uniform sampler2D uNz; uniform float uBioN, uCell, uShT;
uniform mediump sampler2DArray uGnd;
varying vec3 vTW;
varying vec3 vTN;
varying float vTD;
/* **육각 타일**(Mikkelsen, "Practical Real-Time Hex-Tiling", JCGT 2022 — bgfx 의 examples/49-hextile 가 같은 기법이다. 식만 보고 새로 썼다).
   사진 한 장을 그대로 되풀이하면 2 m 마다 같은 얼룩이 줄지어 보인다(사용자 지적: 땅 그림이 너무 되풀이된다).
   땅을 세모 칸으로 나눠 **칸마다 사진을 다른 자리로 밀어** 읽고, 한 점을 둘러싼 세 칸의 것을 가중해 섞는다 — 같은 사진인데
   되풀이 주기가 없어진다. 가중치를 5제곱해 섞이는 띠를 좁혀 무늬가 뭉개지지 않게 한다. 사진을 세 번 읽는 값이다 */
vec2 hxo(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
vec3 hexT(float L,vec2 uv,vec2 dx,vec2 dy){
  vec2 sk=mat2(1.0,0.0,-0.57735027,1.15470054)*(uv*1.7320508);
  vec2 b=floor(sk); vec3 t=vec3(fract(sk),0.0); t.z=1.0-t.x-t.y;
  float s=step(0.0,-t.z), s2=2.0*s-1.0;
  float w1=-t.z*s2, w2=s-t.y*s2, w3=s-t.x*s2;
  vec3 c1=textureGrad(uGnd,vec3(uv+hxo(b+vec2(s,s)),L),dx,dy).rgb,
       c2=textureGrad(uGnd,vec3(uv+hxo(b+vec2(s,1.0-s)),L),dx,dy).rgb,
       c3=textureGrad(uGnd,vec3(uv+hxo(b+vec2(1.0-s,s)),L),dx,dy).rgb;
  w1=pow(w1,5.0); w2=pow(w2,5.0); w3=pow(w3,5.0);
  return (c1*w1+c2*w2+c3*w3)/(w1+w2+w3);
}
`+frag.replace('#include <color_fragment>',`#include <color_fragment>
      {
        vec2 p=vTW.xz;
        vec4 n1=texture2D(uNz,p/113.0), n2=texture2D(uNz,p/27.0+vec2(0.37,0.11));
        /* **가파른 면은 옆에서 본 좌표로** — 위에서 내려다본 좌표(xz)만 쓰면 벽에서 무늬가 세로로 길게 늘어진다(벼랑의 줄무늬).
           51°~68° 에 걸쳐 옆 투영 둘(xy · zy)을 면이 보는 쪽대로 섞은 것으로 옮겨 간다 — 얼룩 잡음과 바위 사진 결 */
        vec3 aN=abs(normalize(vTN)); float stp=smoothstep(0.62,0.38,aN.y), wSx=aN.x/(aN.x+aN.z+1e-4);
        vec2 tS1=vTW.xy/2.1, tS2=vTW.zy/2.1, gS1x=dFdx(tS1), gS1y=dFdy(tS1), gS2x=dFdx(tS2), gS2y=dFdy(tS2);
        /* FPS: 가파른 데서만 읽는다(기울기는 갈래 밖에서 구해 넘긴다 — 갈래 안에서 밉맵을 고를 수 없어서) */
        { vec2 q1=vTW.xy/27.0, q2=vTW.zy/27.0, d1x=dFdx(q1), d1y=dFdy(q1), d2x=dFdx(q2), d2y=dFdy(q2);
          if(stp>0.0){ vec4 s1=mix(textureGrad(uNz,q1*(27.0/113.0),d1x*(27.0/113.0),d1y*(27.0/113.0)),textureGrad(uNz,q2*(27.0/113.0),d2x*(27.0/113.0),d2y*(27.0/113.0)),wSx),
                            s2=mix(textureGrad(uNz,q1+vec2(0.37,0.11),d1x,d1y),textureGrad(uNz,q2+vec2(0.37,0.11),d2x,d2y),wSx);
            n1=mix(n1,s1,stp); n2=mix(n2,s2,stp); } }
        float wallWet=0.0, wallSleek=0.0, wallDark=1.0; vec3 wallCol=vec3(-1.0);
        /* **벽의 결은 자리마다 다르다**(사용자 요청) — 큰 얼룩(300 m)이 그 벽의 암석을 정한다:
             · 금이 간 벽 — 절리. 잡음의 등고선을 가는 어두운 금으로 긋는다(두 방향 · 벽마다 촘촘하기가 다르다).
             · **점판암** — 매끈하고 검푸르다. 얇은 쪽(벽개)이 비스듬히 나란하고, 볕을 좁고 밝게 되비친다.
             · **스미는 물** — 위에서 아래로 길게 젖은 띠가 천천히 흘러내린다. 짙고, 물처럼 번들거린다.
           옆에서 본 좌표(가로 · 높이)로 그린다. 값은 아래 바위 빛깔과 '화소마다의 빛'이 쓴다 */
        if(stp>0.02){
          float wt=texture2D(uNz,p/310.0+vec2(0.13,0.71)).b; vec2 sp=mix(vTW.xy,vTW.zy,wSx);
          float f1=abs(texture2D(uRel,sp/9.0).a-0.5), f2=abs(texture2D(uRel,sp.yx/5.3+0.37).a-0.5);
          float crack=clamp((1.0-smoothstep(0.0,0.030,f1))+(1.0-smoothstep(0.0,0.026,f2))*0.7,0.0,1.0);
          wallDark=1.0-crack*0.58*stp*(0.30+0.70*smoothstep(0.42,0.60,wt));
          wallSleek=smoothstep(0.32,0.20,wt)*stp;
          wallCol=vec3(0.15,0.18,0.22)*(0.80+0.34*(0.5+0.5*sin((sp.y+sp.x*0.45)*8.0+n2.g*2.5)));
          wallWet=smoothstep(0.60,0.78,texture2D(uNz,vec2(sp.x/13.0,sp.y/85.0+uShT*0.0035)).r)*stp;
        }
        /* 바이옴 색과 가림막 — 잡음으로 비튼 자리에서, 가운데 + 둘레 셋을 섞어 읽는다(경계가 굽이치고 부드럽다) */
        vec2 wp=p+(n1.rg-0.5)*7.5+(n2.rg-0.5)*2.4;
        vec2 bu=(wp/uCell+uBioN*0.5+0.5)/uBioN; float br=3.5/uCell/uBioN;
        vec4 bc=texture2D(uBio,bu)*2.0, m2=texture2D(uBio2,bu)*2.0;
        for(int k=0;k<3;k++){ float an=float(k)*2.0944+0.5; vec2 o=vec2(cos(an),sin(an))*br;
          bc+=texture2D(uBio,bu+o); m2+=texture2D(uBio2,bu+o); }
        bc/=5.0; m2/=5.0;
        vec3 c=bc.rgb;
        float grav=smoothstep(0.08,0.60,bc.a);
        float mSand=smoothstep(0.2,0.7,m2.r), mLeaf=smoothstep(0.2,0.7,m2.g), mNeed=smoothstep(0.2,0.7,m2.b), mMud=smoothstep(0.2,0.7,m2.a);
        // 큰 얼룩 — 밝기와 색조를 천천히 흔든다(마른 데는 누렇게, 젖은 데는 푸르게)
        c*=1.0+0.22*(n1.b-0.5)+0.12*(n2.b-0.5);
        c*=mix(vec3(0.96,0.99,1.04),vec3(1.05,1.01,0.93),n1.a);
        float steep=1.0-smoothstep(0.62,0.82,normalize(vTN).y), flat1=1.0-steep;
        /* 물밑 — **모래는 얕은 데까지만**. 수심 2~5 m(자리마다 다르다) 밑은 암반이고, 물밑에서는 조금만 가팔라도 바위가
           드러난다(사용자 지적: 물밑이 끝없는 모래라 기괴하다) */
        float subRock=0.0;
        if(vTW.y<-1.0){
          subRock=max(smoothstep(-2.4,-4.6,vTW.y+(n1.g-0.5)*3.2+(n2.g-0.5)*1.4),
                      (1.0-smoothstep(0.84,0.95,normalize(vTN).y))*smoothstep(-1.0,-2.2,vTW.y));
          steep=max(steep,subRock); flat1=1.0-steep; }
        float green=clamp((c.g-max(c.r,c.b))*8.0,0.0,1.0);
        // 바닥 빛깔 — 숲은 낙엽·잔가지의 갈색이 풀빛을 덮고, 습지는 검은 진흙, 모래는 한 톤 낮춘다(한낮에 하얗게 날았다)
        c=mix(c,vec3(0.34,0.26,0.14),mLeaf*flat1*0.50);
        c=mix(c,vec3(0.30,0.22,0.13),mNeed*flat1*0.45);
        c=mix(c,vec3(0.14,0.13,0.10),mMud*flat1*0.50);
        c*=mix(1.0,0.70,mSand); c=mix(c,c*vec3(0.94,0.95,1.0)+vec3(0.0,0.004,0.008),mSand*0.5);   // 모래는 한 톤 낮추고 바탕 쪽으로 식힌다
        // 바위 — 가파를수록 드러나고, 높이를 따라 층이 진다
        float strata=0.5+0.5*sin(vTW.y*2.3+n2.a*5.0);
        c=mix(c,vec3(0.36,0.34,0.31)*(0.82+0.26*strata),steep*0.85);
        if(wallCol.r>=0.0){ c=mix(c,wallCol,wallSleek*0.88)*wallDark*mix(1.0,0.60,wallWet); }   // 점판암 · 금 · 젖은 띠
        c=mix(c,c*vec3(0.60,0.80,0.70),subRock*0.6);                          // 물밑 바위에는 바닷말이 끼어 푸르스름하다
        /* 사진 결 — 그 자리에 있는 땅의 것만 읽는다. 한 장을 두 배율(2.1 m · 8.7 m)로 읽어 가까이는 잘게, 멀리는
           크게 — 타일이 되풀이되는 것이 덜 보인다. 갈래 안에서 읽으므로 기울기는 밖에서 구해 넘긴다(textureGrad). */
        float wRock=steep, wGrav=grav*flat1, rest=flat1*(1.0-grav);
        float wSand=mSand*rest, wLeaf=mLeaf*rest, wNeed=mNeed*rest, wMud=mMud*rest;
        float wOpen=max(0.0,rest-wSand-wLeaf-wNeed-wMud), wGrass=wOpen*green, wDry=wOpen*(1.0-green);
        vec2 uA=p/2.1, uB=p/8.7+vec2(0.31,0.17);
        vec2 ax=dFdx(uA), ay=dFdy(uA), bx=dFdx(uB), by=dFdy(uB);
        float fm=smoothstep(5.0,28.0,vTD);
        vec3 det=vec3(0.0);
        /* FPS: 가까이(fm 0)는 육각 타일만, 멀리(fm 1)는 넓은 배율만 읽는다 — 예전엔 둘 다 읽고 섞었다(켜에 네 번 → 셋 또는 한 번) */
        #define GL(L) (fm<0.005?hexT(L,uA,ax,ay):fm>0.995?textureGrad(uGnd,vec3(uB,L),bx,by).rgb:mix(hexT(L,uA,ax,ay),textureGrad(uGnd,vec3(uB,L),bx,by).rgb,fm))
        if(wSand>0.02)  det+=wSand*GL(0.0);
        if(wGrass>0.02) det+=wGrass*GL(1.0);
        if(wLeaf>0.02)  det+=wLeaf*GL(2.0);
        if(wNeed>0.02)  det+=wNeed*GL(3.0);
        if(wRock>0.02){ vec3 rk=GL(4.0);
          ${RK?`/* 벼랑 면(옆 투영) — 바위 사진 여섯 장 가운데 둘(이끼 낀 3번 빼고)을 113 m 잡음으로 골라 섞는다(사용자 요청: 벼랑도 진짜 바위처럼).
             사암 켜 · 잿빛 벼랑 · 금 간 바위 · 검은 바닷가 바위가 벼랑마다 바뀐다. 한 장이 3.8 m(땅 사진보다 크게 — 벼랑은 크다) */
          if(stp>0.0){ float sl=clamp(n1.r*1.4-0.2,0.0,0.999)*4.0, si=floor(sl), sf=smoothstep(0.25,0.75,fract(sl));
            float la=si>2.5?si+1.0:si, lb=si>1.5?si+2.0:si+1.0; const float K=0.55;
            vec3 sa=mix(textureGrad(uRk,vec3(tS1*K,la),gS1x*K,gS1y*K).rgb,textureGrad(uRk,vec3(tS2*K,la),gS2x*K,gS2y*K).rgb,wSx);
            vec3 sb=sf>0.01?mix(textureGrad(uRk,vec3(tS1*K,lb),gS1x*K,gS1y*K).rgb,textureGrad(uRk,vec3(tS2*K,lb),gS2x*K,gS2y*K).rgb,wSx):sa;
            rk=mix(rk,mix(sa,sb,sf),stp); }`
          :`if(stp>0.0) rk=mix(rk,mix(textureGrad(uGnd,vec3(tS1,4.0),gS1x,gS1y).rgb,textureGrad(uGnd,vec3(tS2,4.0),gS2x,gS2y).rgb,wSx),stp);`}
          det+=wRock*rk; }
        if(wGrav>0.02)  det+=wGrav*GL(5.0);
        if(wMud>0.02)   det+=wMud*GL(6.0);
        if(wDry>0.02)   det+=wDry*GL(7.0);
        float wSum=(wSand>0.02?wSand:0.0)+(wGrass>0.02?wGrass:0.0)+(wLeaf>0.02?wLeaf:0.0)+(wNeed>0.02?wNeed:0.0)
                  +(wRock>0.02?wRock:0.0)+(wGrav>0.02?wGrav:0.0)+(wMud>0.02?wMud:0.0)+(wDry>0.02?wDry:0.0);
        det=wSum>0.0?det/wSum:vec3(0.5);
        /* 모래는 사진 결을 반만 — 모래밭이 혼자 튀었다(사용자 지적). 대신 넓은 얼룩(젖은 데·마른 데)으로 바탕과 섞는다 */
        c*=mix(vec3(1.0),det*2.0,mix(1.0,0.6,smoothstep(50.0,160.0,vTD))*mix(1.0,0.50,wSand));    // 멀리선 조금 옅게
        c*=mix(1.0,0.84+0.30*n1.r+0.10*(n2.g-0.5),wSand);
        /* 물가 — 젖은 띠와 밀려온 거품. 바닷물 셰이더의 거품과 같은 박자(uShT)로 오르내린다 */
        float h=vTW.y, wetS=0.0;
        if(h<1.3&&h>-0.8){
          /* **진짜 수면** — 바닷물 판을 오르내리게 하는 긴 파도 셋(물 셰이더의 wv(0~2))을 같은 식 · 같은 시계로 푼다. 예전엔 여기만
             제 박자(sin 하나)로 오르내려, 물이 빠졌는데 흰 물자국이 남거나 물이 덮었는데 마른 모래로 보였다 */
          float sea=0.30*sin(0.10134*dot(vec2(0.9394,0.3429),p)-0.9971*uShT)+0.20*sin(0.16982*dot(vec2(0.8525,-0.5227),p)-1.2907*uShT)
                   +0.10*sin(0.29920*dot(vec2(0.3624,0.9320),p)-1.7132*uShT);
          float sw=clamp(0.5+sea/1.2,0.0,1.0);
          /* 젖은 띠 — 예전엔 반 미터 높이까지 고르게 짙어 물가에 띠를 칠한 것 같았다(사용자 지적). 물결이 닿는 데까지만,
             가장자리는 잡음으로 들쭉날쭉하게, 짙기도 한 단계만 */
          float wet=smoothstep(0.52+0.14*sw+(n2.r-0.5)*0.18,0.02,h)*step(-0.6,h);   // 물결이 가장 높이 닿는 데(0.6 m)까지 젖어 있다
          c*=mix(1.0,0.76,wet); wetS=wet;                                     // 젖은 모래·자갈은 짙다
          c+=vec3(0.10,0.11,0.12)*wet*pow(max(uSunDir.y,0.0),2.0)*smoothstep(0.25,0.0,h);   // 물 먹은 자리의 번들거림
          float lace=texture2D(uNz,p/2.3+vec2(uShT*0.013,0.0)).r*0.6+texture2D(uNz,p/0.83).g*0.4;
          float top=sea;                                                      // 지금 물이 닿은 높이
          float foam=smoothstep(top+0.015,top-0.015,h)*smoothstep(top-0.34,top-0.20,h)*smoothstep(0.40,0.62,lace+0.25*(1.0-(top-h)/0.25));   // 물머리 밑 한 뼘 반의 얇은 물자국
          c=mix(c,vec3(0.90,0.93,0.92),clamp(foam,0.0,1.0)*0.40);              // 옅은 물자국만 — 도톰한 거품은 메시가 맡는다(96-foam.js)
        }
        /* 물밑의 빛 그물 — 수면의 잔물결이 햇빛을 모았다 흩었다 하며 바닥에 일렁이는 밝은 줄을 친다(수심 0.3~12 m) */
        if(h<-0.25){
          float ca=1.0-abs(texture2D(uNz,p/3.3+vec2(uShT*0.031,uShT*0.017)).r-texture2D(uNz,p/2.6-vec2(uShT*0.023,-uShT*0.029)).g)*2.6;
          c+=c*pow(clamp(ca,0.0,1.0),6.0)*1.7*smoothstep(0.25,1.2,-h)*smoothstep(14.0,3.0,-h)*max(uSunDir.y,0.0);
        }
        ${PIX?`/* ── 화소마다의 빛 ── */
        {
          vec3 Ng=normalize(vTN);
          float kR=mix(1.0,0.32,mSand*flat1)*mix(1.0,0.55,mMud*flat1)*(1.0+0.9*steep);
          mat2 M2=mat2(0.8253,-0.5646,0.5646,0.8253), M3=mat2(-0.3233,-0.9463,0.9463,-0.3233);
          vec4 t1=texture2D(uRel,p/190.0), t2=texture2D(uRel,(M2*p+vec2(17.0,3.0))/31.0), t3=texture2D(uRel,(M3*p+vec2(5.0,41.0))/4.2);
          float RK=${(2*GND.relK).toFixed(3)};
          vec2 g=(t1.gb-0.5)*(RK*3.0/190.0)+((t2.gb-0.5)*M2)*(RK*0.50/31.0)+((t3.gb-0.5)*M3)*(RK*0.065/4.2);
          float hr=(t1.r-0.5)*0.45+(t2.r-0.5)*0.35+(t3.r-0.5)*0.20;             // 기복의 높낮이(−0.5~0.5 — 큰 것·가운데·잔 것)
          g*=kR*(1.0-0.65*stp);                                                 // 벽에서는 순하게(위로 미는 기복은 벽에서 세로 줄이 된다)
          /* **모래의 물결 자국** — 물밑 모래와 모래밭에는 물살·바람이 낸 잔 이랑이 진다. 마구잡이 혹이 아니라 **한 방향으로 나란한**
             이랑이다: 이랑은 물가와 나란히(비탈의 내리막에 수직으로) 눕는다. 방향이 다른 세 벌(60° 간격)을 두고 그 자리의 내리막 방향에
             가까운 벌이 이기게 섞는다(방향을 화소마다 돌리면 무늬가 뭉개진다). 간격은 얕은 데 30 cm · 깊은 데 90 cm(큰 이랑),
             높이 1.2 cm. 잡음으로 굽이친다. 20 m 밖에서는 화소보다 잘아져 지운다 */
          { float sandK=max(mSand*flat1*0.35,(h<0.3?(1.0-subRock)*(1.0-grav):0.0))*smoothstep(22.0,7.0,vTD);   // 마른 모래밭의 이랑은 옅게(줄무늬로 튀었다) — 물밑은 그대로
            if(sandK>0.02){ vec2 dn=normalize(Ng.xz+vec2(0.021,0.013)); float lam=mix(0.32,0.90,smoothstep(0.3,-7.0,h)), kk=6.2832/lam, ws=0.0, hs=0.0; vec2 gr=vec2(0.0);
              for(int i=0;i<3;i++){ float an=float(i)*1.0472+0.35; vec2 d=vec2(cos(an),sin(an)); float w=pow(abs(dot(dn,d)),6.0)+0.02;
                float ph=dot(p,d)*kk+(n2.r-0.5)*5.0+(n1.g-0.5)*9.0; gr+=w*d*(cos(ph)+0.35*cos(2.0*ph+1.0))*kk; hs+=w*sin(ph); ws+=w; }
              g+=gr/ws*(0.012*sandK); hr+=hs/ws*0.10*sandK; } }
          float ny=max(Ng.y,0.3);
          vec3 Np=normalize(vec3(Ng.x/ny-g.x,1.0,Ng.z/ny-g.y));
          float lum=dot(det,vec3(0.3333)), nearB=1.0-smoothstep(6.0,34.0,vTD);
          if(nearB>0.0){                                                          // 사진 결의 밝기를 높이로(밝은 데가 솟았다 · 3 cm)
            vec3 sx=dFdx(vTW), sy=dFdy(vTW), r1=cross(sy,Np), r2=cross(Np,sx); float dt=dot(sx,r1);
            Np=normalize(Np-(dFdx(lum)*r1+dFdy(lum)*r2)*(sign(dt)/max(abs(dt),1e-7))*0.03*nearB); }
          float ndl=clamp(dot(Np,uSunDir),0.0,1.0);
          vec2 tu=(p/uCell+uBioN*0.5+0.5)/uBioN;
          float can=texture2D(uTL,tu+uSunDir.xz/max(uSunDir.y,0.22)*(7.0/uCell/uBioN)).b;   // 나무 키(7 m)만큼 해 쪽의 숲이 여기에 그늘을 드리운다
          float canK=smoothstep(uShR*0.72,uShR,vTD);
          float wetK=clamp(max(max(wetS,wallWet),mMud*flat1*0.55)+uWet*(0.55+0.45*(1.0-hr*2.0))+uDew*0.30*wGrass,0.0,1.0);   // 비는 낮은 데부터 고인다 · 이슬은 풀밭에
          c*=mix(1.0,0.74,uWet*(1.0-mSand*0.5));                                  // 비 맞은 땅은 짙다
          vec3 Vv=normalize(cameraPosition-vTW), Hh=normalize(Vv+uSunDir);
          float gl=mix(mix(mix(7.0,22.0,wRock),150.0,wallSleek),96.0,wetK), f0=mix(mix(0.022,0.075,wallSleek),0.05,wetK);   // 점판암은 매끈하다
          if(wallWet>0.01){ float rp=texture2D(uNz,vTW.xy/1.7+vec2(0.0,uShT*0.06)).g+texture2D(uNz,vTW.zy/1.7+vec2(0.0,uShT*0.06)).g-1.0;
            Np=normalize(Np+vec3(rp,0.0,rp)*0.10*wallWet); }                         // 흘러내리는 물의 잔 일렁임 — 반짝임이 살아 움직인다
          float spec=f0*(gl+8.0)*0.125*pow(max(dot(Np,Hh),0.0),gl)*ndl*(0.35+0.65*smoothstep(0.35,0.65,lum))*mix(1.0,0.5,wetK);   // 젖은 데는 좁고 밝되 하얗게 뭉개지지 않게
          /* 이슬 맺힌 풀밭의 반짝임 — 잎 재질과 같은 식(98-dew.js ②) */
          if(uDew>0.01&&wGrass>0.05){ float cs=max(0.010,vTD*0.0024);
            float hh=fract(sin(dot(floor(vTW/cs),vec3(127.1,311.7,74.7))+floor(dot(Vv,vec3(31.0,17.0,23.0)))*13.7)*43758.5453);
            spec+=smoothstep(0.990,1.0,hh)*smoothstep(60.0,12.0,vTD)*6.0*uDew*wGrass*ndl; }
          gndSun=ndl*(1.0-0.62*can*canK)+spec/max(dot(c,vec3(0.3333)),0.03);
          gndAmb=(0.86+0.28*smoothstep(-0.30,0.30,hr))*(1.0-0.18*can)*(0.90+0.10*Np.y/ny*Ng.y);
        }`:''}
        diffuseColor.rgb=c;
      }`);
}

/* 물체 재질에 사진 결 한 겹 — 모래 둔덕·점토·흩뿌린 돌처럼 제 셰이더가 없는 것. 세계 좌표의 윗면 투영(xz) 한 번 읽기 */
/* 바위 사진 한 겹 — 인스턴스로 흩는 돌(벼랑 밑 잔돌 · 바다 바위)에. 돌마다(인스턴스 자리의 해시) 다섯 장 가운데 한 장을
   x·y·z 세 방향에서 읽고(땅 사진 한 장을 위에서 내리 비추던 예전 gndDetailPatch 는 옆면이 늘어졌다), 위를 보는 면에는
   이끼 낀 바위(3번)가 앉는다(moss 0~1) · 30 m 안은 법선 지도로 결의 높낮이를 준다. 바위 사진이 없으면 예전 땅 사진 한 겹 */
function rockDetailPatch(m,scale,moss){
  if(!TERR_U.uRk) return gndDetailPatch(m,4,scale);
  const prev=m.onBeforeCompile, has=Object.prototype.hasOwnProperty.call(m,'onBeforeCompile'), S=scale.toFixed(2), MS=(moss===undefined?0.6:moss).toFixed(2);
  m.onBeforeCompile=(sh,r)=>{
    if(has&&prev) prev(sh,r);
    sh.uniforms.uRk=TERR_U.uRk; sh.uniforms.uRkN=TERR_U.uRkN; sh.uniforms.uSunDir=TERR_U.uSunDir;
    sh.vertexShader='varying vec3 vRkW;\nvarying vec3 vRkN;\nvarying vec2 vRkL;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      { vec4 gw=vec4(transformed,1.0); vec3 gn=normal; vec3 o=vec3(0.0);
        #ifdef USE_INSTANCING
          gw=instanceMatrix*gw; gn=mat3(instanceMatrix)*gn; o=instanceMatrix[3].xyz;
        #endif
        vRkW=(modelMatrix*gw).xyz; vRkN=normalize(mat3(modelMatrix)*gn);
        float h=fract(sin(dot(floor(o*2.0),vec3(12.9898,78.233,37.719)))*43758.5453), L=floor(h*5.0);
        vRkL=vec2(L>2.5?L+1.0:L, length((modelViewMatrix*gw).xyz)); }`);
    sh.fragmentShader='uniform mediump sampler2DArray uRk;\nuniform mediump sampler2DArray uRkN;\nuniform vec3 uSunDir;\nvarying vec3 vRkW;\nvarying vec3 vRkN;\nvarying vec2 vRkL;\n'+sh.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
      { vec3 n=normalize(vRkN), tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4; vec3 q=vRkW/${S}; float L=vRkL.x;
        vec3 c0=diffuseColor.rgb;
        vec3 rk=texture(uRk,vec3(q.zy,L)).rgb*tw.x+texture(uRk,vec3(q.xz,L)).rgb*tw.y+texture(uRk,vec3(q.xy,L)).rgb*tw.z;
        diffuseColor.rgb*=mix(vec3(1.0),rk*2.0,0.9);
        diffuseColor.rgb=mix(diffuseColor.rgb,c0*texture(uRk,vec3(q.xz*1.1,3.0)).rgb*2.0,smoothstep(0.5,0.9,n.y)*${MS});
        float nr=clamp(1.0-vRkL.y/30.0,0.0,1.0);
        if(nr>0.0){
          vec3 tx=texture(uRkN,vec3(q.zy,L)).rgb*2.0-1.0, ty=texture(uRkN,vec3(q.xz,L)).rgb*2.0-1.0, tz=texture(uRkN,vec3(q.xy,L)).rgb*2.0-1.0;
          tx=vec3(tx.xy+n.zy,n.x); ty=vec3(ty.xy+n.xz,n.y); tz=vec3(tz.xy+n.xy,n.z);
          vec3 np=normalize(mix(n,normalize(tx.zyx*tw.x+ty.xzy*tw.y+tz.xyz*tw.z),0.8));
          diffuseColor.rgb*=1.0+clamp((dot(np,uSunDir)-dot(n,uSunDir))*1.5,-0.5,0.5)*nr*smoothstep(0.0,0.25,uSunDir.y);
          diffuseColor.rgb*=mix(1.0,0.72+0.28*clamp(dot(np,n),0.0,1.0),nr);
        } }`);
  };
  const pk=Object.prototype.hasOwnProperty.call(m,'customProgramCacheKey')?m.customProgramCacheKey:null;
  m.customProgramCacheKey=()=>'rkd-'+S+'-'+MS+(pk?'-'+pk.call(m):'');
  return m;
}
function gndDetailPatch(m,layer,scale){
  const prev=m.onBeforeCompile, has=Object.prototype.hasOwnProperty.call(m,'onBeforeCompile');
  m.onBeforeCompile=(sh,r)=>{
    if(has&&prev) prev(sh,r);
    if(!GND_OK()) return;
    sh.uniforms.uGnd=TERR_U.uGnd;
    sh.vertexShader='varying vec3 vGW;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      { vec4 gw=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          gw=instanceMatrix*gw;
        #endif
        vGW=(modelMatrix*gw).xyz; }`);
    sh.fragmentShader='uniform mediump sampler2DArray uGnd;\nvarying vec3 vGW;\n'+sh.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb*=mix(vec3(1.0),texture(uGnd,vec3((vGW.xz+vGW.y*0.37)/${scale.toFixed(2)},${layer.toFixed(1)})).rgb*2.0,0.75);`);
  };
  const pk=Object.prototype.hasOwnProperty.call(m,'customProgramCacheKey')?m.customProgramCacheKey:null;
  m.customProgramCacheKey=()=>'gnd'+layer+'-'+scale+(pk?'-'+pk.call(m):'');
  return m;
}
