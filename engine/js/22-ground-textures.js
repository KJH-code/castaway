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
function gndArrayTex(data,S,n){
  const t=new THREE.DataTexture2DArray(data,S,S,n);
  t.format=THREE.RGBAFormat; t.type=THREE.UnsignedByteType;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.minFilter=S>1?THREE.LinearMipmapLinearFilter:THREE.LinearFilter; t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=S>1; t.needsUpdate=true;
  return t;
}
/* 한 번 — 잡음 텍스처를 만들고, 사진을 풀어 배열 텍스처로 올린다. 사진이 다 풀리기 전(1초 안쪽)에는
   중간 회색 한 점짜리가 대신 물려 있다(무늬 없는 땅 — 곧 바뀐다). */
function gndInit(){
  const n=GND_JPG.length, S=GND.S;
  GND.nz=gndNoiseTex();
  TERR_U.uNz={value:GND.nz}; WATER_U.uNz=TERR_U.uNz;
  TERR_U.uShT={value:0};
  if(typeof THREE.DataTexture2DArray!=='function') return;
  GND.tex=gndArrayTex(new Uint8Array(4*n).fill(128),1,n);
  TERR_U.uGnd={value:GND.tex};
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
   → 물가면 거품 무늬 2번. 수식 잡음은 하나도 안 센다. */
function gndTerrainFrag(frag){
  return `uniform vec3 uSunDir;
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
        c*=mix(1.0,0.74,mSand);
        // 바위 — 가파를수록 드러나고, 높이를 따라 층이 진다
        float strata=0.5+0.5*sin(vTW.y*2.3+n2.a*5.0);
        c=mix(c,vec3(0.36,0.34,0.31)*(0.82+0.26*strata),steep*0.85);
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
        #define GL(L) mix(hexT(L,uA,ax,ay),textureGrad(uGnd,vec3(uB,L),bx,by).rgb,fm)
        if(wSand>0.02)  det+=wSand*GL(0.0);
        if(wGrass>0.02) det+=wGrass*GL(1.0);
        if(wLeaf>0.02)  det+=wLeaf*GL(2.0);
        if(wNeed>0.02)  det+=wNeed*GL(3.0);
        if(wRock>0.02)  det+=wRock*GL(4.0);
        if(wGrav>0.02)  det+=wGrav*GL(5.0);
        if(wMud>0.02)   det+=wMud*GL(6.0);
        if(wDry>0.02)   det+=wDry*GL(7.0);
        float wSum=(wSand>0.02?wSand:0.0)+(wGrass>0.02?wGrass:0.0)+(wLeaf>0.02?wLeaf:0.0)+(wNeed>0.02?wNeed:0.0)
                  +(wRock>0.02?wRock:0.0)+(wGrav>0.02?wGrav:0.0)+(wMud>0.02?wMud:0.0)+(wDry>0.02?wDry:0.0);
        det=wSum>0.0?det/wSum:vec3(0.5);
        c*=mix(vec3(1.0),det*2.0,mix(1.0,0.6,smoothstep(50.0,160.0,vTD)));    // 멀리선 조금 옅게
        /* 물가 — 젖은 띠와 밀려온 거품. 바닷물 셰이더의 거품과 같은 박자(uShT)로 오르내린다 */
        float h=vTW.y;
        if(h<1.3&&h>-0.8){
          float sw=0.5+0.5*sin(uShT*0.9+sin(p.x*0.07)*2.0+sin(p.y*0.05)*2.0);
          /* 젖은 띠 — 예전엔 반 미터 높이까지 고르게 짙어 물가에 띠를 칠한 것 같았다(사용자 지적). 물결이 닿는 데까지만,
             가장자리는 잡음으로 들쭉날쭉하게, 짙기도 한 단계만 */
          float wet=smoothstep(0.30+0.20*sw+(n2.r-0.5)*0.18,0.02,h)*step(-0.6,h);
          c*=mix(1.0,0.76,wet);                                               // 젖은 모래·자갈은 짙다
          c+=vec3(0.10,0.11,0.12)*wet*pow(max(uSunDir.y,0.0),2.0)*smoothstep(0.25,0.0,h);   // 물 먹은 자리의 번들거림
          float lace=texture2D(uNz,p/2.3+vec2(uShT*0.013,0.0)).r*0.6+texture2D(uNz,p/0.83).g*0.4;
          float top=0.03+0.22*sw;                                             // 이번 물결이 닿은 높이
          float foam=smoothstep(top+0.05,top-0.01,h)*smoothstep(-0.04,0.01,h)*smoothstep(0.40,0.62,lace+0.25*(1.0-(top-h)/0.25));
          c=mix(c,vec3(0.90,0.93,0.92),clamp(foam,0.0,1.0)*0.40);              // 옅은 물자국만 — 도톰한 거품은 메시가 맡는다(96-foam.js)
        }
        /* 물밑의 빛 그물 — 수면의 잔물결이 햇빛을 모았다 흩었다 하며 바닥에 일렁이는 밝은 줄을 친다(수심 0.3~12 m) */
        if(h<-0.25){
          float ca=1.0-abs(texture2D(uNz,p/3.3+vec2(uShT*0.031,uShT*0.017)).r-texture2D(uNz,p/2.6-vec2(uShT*0.023,-uShT*0.029)).g)*2.6;
          c+=c*pow(clamp(ca,0.0,1.0),6.0)*1.7*smoothstep(0.25,1.2,-h)*smoothstep(14.0,3.0,-h)*max(uSunDir.y,0.0);
        }
        diffuseColor.rgb=c;
      }`);
}

/* 물체 재질에 사진 결 한 겹 — 모래 둔덕·점토·흩뿌린 돌처럼 제 셰이더가 없는 것. 세계 좌표의 윗면 투영(xz) 한 번 읽기 */
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
