/* ── 동굴 판 10 — 바위 껍데기 재질 (조각 D) ─────────────────────────────────────────────────────────────────────
   굴 껍데기 메시(31-cave10.js A2 — 벽 · 천장 · 바닥이 한 메시)를 굴 종류마다 실제 굴처럼 칠한다. `CV10.mat(kind)` 갈고리를 이 파일이 채운다
   (갈고리가 비면 31-cave10.js 의 단색 `cv10SeatMat`). 설계는 docs/notes/caves.md '5.3 바위 재질(D)' · 잰 값은 '구현 메모(D)'.
   · 사진 — data-cave-textures.js(ambientCG CC0 512² 여섯 벌: 0 석회암 · 1 현무암 · 2 화강암 · 3 사암 · 4 이끼 낀 바위 · 5 진흙 바닥)를
     배열 텍스처 두 장(빛깔 `cmC` · 법선 `cmN`)으로 올린다(22-ground-textures.js rockPhotoInit 과 같은 법 — 빛깔은 밝기만 평균 0.5 로).
   · 종류마다 재질 하나 · 셰이더 하나(결 갈래는 #define 으로 박는다 — 유니폼으로 돌리지 않는다 · terrain 노트):
       karst   크림 · 황토 석회암, 위에서 아래로 늘어진 유석 세로 결, 오목한 데 갈색, 위로 갈수록 희고 밑은 진흙빛, 젖어 횃불 쪽으로 번들 · 바닥 물웅덩이
       lava    붉은 갈색 현무암, 용암이 흐른 높이의 가로 띠 여러 겹, 매끈한 천장, 밧줄 무늬 바닥, 굴마다(굴 씨) 흰 석회 물결 띠 0 ~ 강하게
       talus   잿빛 화강암(거친 알갱이) · 지의류 얼룩(주황 · 잿빛 초록) · 눅눅한 번들 · 자갈 바닥
       shelter 밝은 사암 가로 켜 · 처마 밑을 타고 내린 검은 물 얼룩 줄 · 마른 흙 바닥
     모두 — 하늘이 트인 입구(aSky)와 위를 보는 면에 이끼(사진 4) · 땅 높이 가까운 입구 가장자리는 그 자리 바이옴 빛깔(흙 · 풀)로 녹아든다.
   · 굴 속 어둠 · 하늘 트임 · 굴 불빛은 envPatch(45-sky.js)가 넣는다 — 조각 셰이더에 `vCv10Sky` 를 선언했으니 `CV10_MESH` 갈래(정점 값)로 읽는다.
     해 · 하늘빛을 sky 로 깎는 것도 envPatch 몫(cvK10 = 1−vCv10Sky). 이 파일은 빛을 더하지 않는다 — 젖은 번들거림만 사람이 든 횃불(`torchLight`)의
     세기 · 거리대로 스스로 빛나는 몫에 얹는다(횃불이 꺼져 있으면 0 — 깊은 데 어둠은 그대로).
   · 법선 지도의 높낮이는 램버트가 정점에서 센 빛을 화소마다 고친다(rockMat 과 같은 법 — 굴 속은 횃불 쪽 · 입구는 해 쪽).
   · 굴 씨(`aCs`) — 굴마다 다른 값(석회 띠 정도)을 정점 속성 하나로 싣는다(onBuild 에서 · 재질은 종류마다 하나라 유니폼으로는 못 가른다).
   이름은 cv10Mat · CMAT · cm 로 시작한다(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다). */
const CMAT={ mats:{}, tex:null, nrm:null, left:-1, ready:false, wt:[], geo:null,
  torch:{value:new THREE.Vector4(0,0,0,0)}, tpos:{value:new THREE.Vector3()}, eye:{value:new THREE.Vector3()}, tcol:{value:new THREE.Vector3(1,0.56,0.25)},
  /* 종류마다: 사진 층 · 한 장의 크기(m) · 젖음(번들 세기 · 날카로움) · 이끼 몫 */
  K:{ karst:{L:0,RS:1.7,wet:0.55,sh:36,moss:0.8,id:0}, lava:{L:1,RS:2.1,wet:0.16,sh:20,moss:1.15,id:1},
      talus:{L:2,RS:1.3,wet:0.30,sh:24,moss:0.9,id:2}, shelter:{L:3,RS:2.4,wet:0.03,sh:12,moss:0.3,id:3} } };

/* 사진 올리기 — 다 풀리기 전에는 한 점짜리(중간 회색 · 곧게 선 법선) */
function cmPhotos(){
  if(CMAT.tex||typeof CAVE_JPG==='undefined'||typeof THREE.DataTexture2DArray!=='function') return;
  const n=CAVE_JPG.length, S=512, flat=new Uint8Array(4*n);
  for(let i=0;i<n;i++) flat.set([128,128,255,255],i*4);
  CMAT.tex={value:gndArrayTex(new Uint8Array(4*n).fill(128),1,n)};
  CMAT.nrm={value:gndArrayTex(flat,1,n)};
  CMAT.left=2;
  const load=(list,nrm,uni)=>{
    const data=new Uint8Array(S*S*4*n); let left=n;
    /* 밉맵은 한 장만 읽는다(LinearMipmapNearest — 두 장 섞기는 텍스처 읽기가 두 배 · 굴 속은 화면이 다 껍데기다) */
    const done=()=>{ const old=uni.value; uni.value=gndArrayTex(data,S,n); uni.value.minFilter=THREE.LinearMipmapNearestFilter; old.dispose(); if(--CMAT.left===0){ CMAT.ready=true; for(const f of CMAT.wt) f(); CMAT.wt.length=0; } };
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
  load(CAVE_JPG,false,CMAT.tex); load(CAVE_NRM,true,CMAT.nrm);
}
/* 3 차원 잡음 그림 32³ — 칸 크기가 다른 이어 붙는 값잡음 넷(r 4 · g 8 · b 16 · a 2 칸점). 실수 텍스처 금지(헤드리스가 0 을 읽는다) — 8 비트로 담는다.
   난수는 정수 섞기(지형 · 자원과 상관없는 그림이라 시드 차례를 안 건드린다) */
function cmNoise3(){
  if(CMAT.nz) return CMAT.nz;
  const S=32, d=new Uint8Array(S*S*S*4), H=(i,j,k,c)=>{ let h=Math.imul(i,374761393)^Math.imul(j,668265263)^Math.imul(k,2147483647)^Math.imul(c+1,1274126177); h=Math.imul(h^(h>>>13),1103515245); return ((h^(h>>>16))>>>0)/4294967296; };
  const sm=t=>t*t*(3-2*t), C=[4,8,16,2];
  for(let c=0;c<4;c++){ const cs=C[c], n=S/cs;
    for(let z=0;z<S;z++) for(let y=0;y<S;y++) for(let x=0;x<S;x++){
      const fx=x/cs, fy=y/cs, fz=z/cs, i=Math.floor(fx), j=Math.floor(fy), k=Math.floor(fz), u=sm(fx-i), v=sm(fy-j), w=sm(fz-k);
      const g=(a,b,e)=>H((i+a)%n,(j+b)%n,(k+e)%n,c);
      const val=((g(0,0,0)*(1-u)+g(1,0,0)*u)*(1-v)+(g(0,1,0)*(1-u)+g(1,1,0)*u)*v)*(1-w)+((g(0,0,1)*(1-u)+g(1,0,1)*u)*(1-v)+(g(0,1,1)*(1-u)+g(1,1,1)*u)*v)*w;
      d[((z*S+y)*S+x)*4+c]=Math.round(val*255); } }
  const t=new THREE.DataTexture3D(d,S,S,S); t.format=THREE.RGBAFormat; t.type=THREE.UnsignedByteType;
  t.wrapS=t.wrapT=t.wrapR=THREE.RepeatWrapping; t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.unpackAlignment=1; t.needsUpdate=true;
  return CMAT.nz={value:t};
}
/* 시험이 사진이 다 풀릴 때까지 기다린다(probe) */
CMAT.wait=()=>{ cmPhotos(); return (CMAT.ready||!CMAT.tex)?Promise.resolve():new Promise(r=>CMAT.wt.push(r)); };

/* ── 셰이더 글 ────────────────────────────────────────────────────────────────────────────────────────────── */
const CM_VERT=`attribute float aSky, aDeep, aFl, aCs;
varying float vCv10Sky, vCv10Deep;
varying vec3 vCmW, vCmN, vCmBio;
varying float vCmFl, vCmCs, vCmG, vCmD;
uniform sampler2D cmElev; uniform vec2 cmGrid; uniform sampler2D cmBio; uniform float cmBioN, cmCell;
float cmE(vec2 g){ vec4 t=texelFetch(cmElev,ivec2(clamp(g,vec2(0.0),vec2(cmGrid.x-1.0))),0); return (t.r*255.0*256.0+t.g*255.0)/65535.0*1200.0-100.0; }
`;
const CM_VMAIN=`#include <begin_vertex>
  { vec4 w4=modelMatrix*vec4(transformed,1.0); vCmW=w4.xyz; vCmN=mat3(modelMatrix)*objectNormal; vCmD=length((modelViewMatrix*vec4(transformed,1.0)).xyz);
    vCv10Sky=aSky; vCv10Deep=aDeep; vCmFl=aFl; vCmCs=aCs;
    vec2 mg=w4.xz/cmGrid.y+cmGrid.x*0.5, mf=fract(mg); mg=floor(mg);
    vCmG=w4.y-mix(mix(cmE(mg),cmE(mg+vec2(1.0,0.0)),mf.x),mix(cmE(mg+vec2(0.0,1.0)),cmE(mg+vec2(1.0,1.0)),mf.x),mf.y);   // 땅(표고 그림)에서 몇 m 위인가
    vCmBio=texture2D(cmBio,(w4.xz/cmCell+cmBioN*0.5+0.5)/cmBioN).rgb; }`;
const CM_FRAG=`varying float vCv10Sky, vCv10Deep;
uniform vec4 uCv10Glow;
varying vec3 vCmW, vCmN, vCmBio;
varying float vCmFl, vCmCs, vCmG, vCmD;
uniform mediump sampler2DArray cmC;
uniform mediump sampler2DArray cmN;
uniform vec4 cmT; uniform vec3 cmTP, cmTC, cmSun, cmEye;
uniform mediump sampler3D cmZ;
float cmH(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
/* 삼면 투영 — 무게가 작은 면은 안 읽는다(굴 속 화소가 화면을 다 덮어 읽는 수가 곧 프레임이다) */
vec3 cmTri(vec3 q,vec3 tw,float L){ vec3 r=vec3(0.0);
  if(tw.x>0.03) r+=texture(cmC,vec3(q.zy,L)).rgb*tw.x;
  if(tw.y>0.03) r+=texture(cmC,vec3(q.xz,L)).rgb*tw.y;
  if(tw.z>0.03) r+=texture(cmC,vec3(q.xy,L)).rgb*tw.z;
  return r/max(tw.x*step(0.03,tw.x)+tw.y*step(0.03,tw.y)+tw.z*step(0.03,tw.z),1e-3); }
float cmLum(vec3 c){ return dot(c,vec3(0.30,0.59,0.11)); }
`;
/* 조각 본문 — color_fragment 뒤. diffuseColor 를 고치고 번들거림을 totalEmissiveRadiance 에 더한다 */
const CM_BODY=`#include <color_fragment>
#ifndef CM_NO_ALL
  {
    vec3 p=vCmW, n=normalize(vCmN)*(gl_FrontFacing?1.0:-1.0);
    float dist=vCmD, nearK=clamp(1.0-dist/40.0,0.0,1.0), sky=vCv10Sky, fl=vCmFl;
    vec3 tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4;
    float flo=smoothstep(0.35,0.75,n.y)*(1.0-smoothstep(0.30,0.55,fl));            // 바닥
    float cei=smoothstep(0.25,0.70,-n.y);                                            // 천장
    float wal=clamp(1.0-flo-cei,0.0,1.0);                                            // 벽
    vec3 q=p/CM_RS;
#ifdef CM_NO_PHOTO
    vec3 rk=vec3(0.5);
#else
    vec3 rk=cmTri(q,tw,CM_L);
#endif
    /* 잡음은 3 차원 잡음 그림(cmZ — 32³ · 채널마다 칸 크기가 다르다: r 1/8 · g 1/4 · b 1/2 · a 1/16 판) 한 번에 넷씩 읽는다(예전 값잡음 함수는 화소마다 수십 번 sin 을 셌다) */
#ifdef CM_NO_NOISE
    vec4 Z1=vec4(0.5);
#else
    vec4 Z1=texture(cmZ,p/12.0);                                                     // r 1.5 · g 3 · b 6 · a 0.75 m 얼룩
#endif
    float big=Z1.g, mid=Z1.a, fine=cmLum(rk);                                         // 잔 결은 사진 밝기로(잡음 그림을 한 번 더 읽지 않는다)
    /* 많이 섞인 면 하나 — 법선 지도 · 이끼는 이 면에서 한 장만 읽는다 */
    bool ax=tw.x>tw.y&&tw.x>tw.z, ay=!ax&&tw.y>tw.z;
    vec2 pd=ax?p.zy:(ay?p.xz:p.xy);
    vec3 c;
    float wet=CM_WET, shn=CM_SH, rough=1.0;
#if CM_KIND==0
    /* 석회암 종유굴 — 크림(위) · 황토(가운데) · 진흙빛(밑) · 유석 세로 결(위에서 아래로 늘어진 겹) · 오목한 데 갈색 */
    rk=mix(vec3(cmLum(rk)),rk,0.35);
    vec3 base=mix(vec3(0.50,0.40,0.28),vec3(0.80,0.73,0.60),smoothstep(0.10,0.85,fl+0.25*(big-0.5)));
    c=base*rk*2.0;
    vec4 S=texture(cmZ,vec3(p.x*1.25,p.y*0.085,p.z*1.25));                            // 세로로 늘인 잡음 — b 가로 0.4 · 세로 6 m · r 0.1 · 1.5 m
    float fs=S.b*0.65+S.r*0.35;
    float drape=smoothstep(0.45,0.80,fs)*(wal+cei*0.6);
    c=mix(c,vec3(0.86,0.80,0.66)*(0.9+0.2*rk.r),drape*0.55);                          // 크림빛 유석
    c*=mix(1.0,0.78,smoothstep(0.55,0.25,fs)*wal);                                   // 유석 겹 사이 골
    c=mix(c,c*vec3(0.80,0.66,0.48),smoothstep(0.55,0.80,big)*0.45);                  // 철분 얼룩(황토)
    wet*=0.55+0.9*drape;
#elif CM_KIND==1
    /* 용암굴 — 붉은 갈색 현무암 · 흐른 높이의 가로 띠 · 매끈한 천장 · 굴마다 흰 석회 물결 */
    rk=mix(vec3(cmLum(rk)),rk,0.5);
    c=mix(vec3(0.30,0.19,0.13),vec3(0.38,0.23,0.15),big)*rk*2.0;
    float bh=p.y*1.35+(Z1.b-0.5)*1.4+(mid-0.5)*0.25;           // 흐름 띠 — 거의 수평(띠마다 높이가 조금씩 다르다)
    float bf=fract(bh), bid=cmH(vec3(floor(bh),2.0,7.0));
    c*=mix(1.0,0.86+0.26*bid,wal);
    c*=1.0-0.42*wal*smoothstep(0.86,0.97,bf)*step(0.30,bid);                          // 띠 턱의 그늘
    c*=1.0+0.18*wal*smoothstep(0.0,0.08,bf)*smoothstep(0.22,0.08,bf)*step(0.30,bid);  // 턱 위 밝은 테
    rough=mix(1.0,0.35,cei);                                                         // 둥글고 매끈한 천장
    /* 석회 — 굴 씨 vCmCs 가 정도를 정한다(35% 는 없음). 위쪽 벽 · 천장에 물결 띠로 흘러내린 흰 · 크림 겹 */
    float ca=smoothstep(0.35,1.0,vCmCs);
    if(ca>0.0){ float wv=sin(p.y*5.5+(Z1.r-0.5)*7.0+(fine-0.5)*1.2);
      float cm=smoothstep(0.15,0.65,wv)*smoothstep(0.25,0.75,fl+0.25*(big-0.5))*(1.0-flo)*smoothstep(0.30,0.60,Z1.g+ca*0.4);
      c=mix(c,vec3(0.80,0.76,0.66)*(0.85+0.3*mid),cm*ca);
      c=mix(c,c*vec3(1.20,0.82,0.62),(1.0-cm)*ca*0.35*smoothstep(0.4,0.8,big)); }     // 철 녹 붉은 얼룩
    if(flo>0.01){ /* 밧줄 무늬 바닥(파호이호이) — 굽은 주름 */
      vec2 r2=p.xz+vec2(Z1.r,Z1.a)*2.2;
      float rp=sin(dot(r2,vec2(0.80,0.60))*7.0+length(r2-floor(r2/6.0)*6.0-3.0)*2.2);
      c*=mix(1.0,0.80+0.32*smoothstep(-0.6,0.8,rp),flo); }
#elif CM_KIND==2
    /* 화강암 바위틈 — 잿빛 거친 알갱이 · 지의류 얼룩 */
    rk=mix(vec3(cmLum(rk)),rk,0.45);
    c=vec3(0.54,0.53,0.51)*rk*2.0;
    float fw=fwidth(p.x+p.y+p.z);
    c*=mix(1.0,0.78+0.40*cmH(floor(p/0.018)),nearK*(1.0-smoothstep(0.004,0.012,fw)));     // 장석 · 석영 · 흑운모 알갱이(가까이서만)
    float li=smoothstep(0.55,0.78,Z1.a)*(0.3+0.7*smoothstep(0.0,0.4,sky))*(1.0-flo);
    c=mix(c,(cmH(floor(p/1.7))<0.5?vec3(0.66,0.47,0.24):vec3(0.62,0.66,0.55))*(0.85+0.3*mid),li*0.55);
#else
    /* 사암 바위그늘 — 가로 켜 · 처마 밑을 타고 내린 검은 물 얼룩 */
    rk=mix(vec3(cmLum(rk)),rk,0.7);
    c=vec3(0.74,0.57,0.39)*rk*2.0;
    float st=p.y*3.2+(Z1.r-0.5)*1.1;
    c*=mix(vec3(0.88,0.84,0.80),vec3(1.06,1.03,0.98),0.5+0.5*sin(st*3.1416))*(0.92+0.12*cmH(vec3(0.0,floor(st),1.0)));
    c*=1.0-0.30*smoothstep(0.93,0.99,fract(st*0.5+0.3))*(1.0-flo);                   // 켜 사이 가는 금
    vec4 S=texture(cmZ,vec3(p.x*0.9,p.y*0.03,p.z*0.9));                               // 세로로 늘인 잡음(물 얼룩 줄)
    float stk=smoothstep(0.58,0.86,S.b*0.7+S.r*0.3)*smoothstep(0.40,0.80,Z1.b);
    c=mix(c,vec3(0.13,0.11,0.10)*(0.8+0.4*mid),stk*(wal+cei)*0.75);                  // 검은 물 얼룩 줄
#endif
    /* 바닥 — 진흙(석회암 · 젖음) · 밧줄 용암(위에서 그대로) · 자갈(화강암) · 마른 흙(사암) */
    if(flo>0.01){
#if CM_KIND==0
      vec3 md=mix(vec3(cmLum(rk)),rk,0.5);                                            // 석회암 굴 바닥은 벽 사진 결 그대로(진흙 빛깔만 입힌다 · 한 번 덜 읽는다 — 프레임 +10% 안)
#else
      vec3 md=texture(cmC,vec3(p.xz/1.3,5.0)).rgb; md=mix(vec3(cmLum(md)),md,0.5);
#endif
#if CM_KIND==0
      vec3 fc=vec3(0.42,0.34,0.25)*md*2.0;
      float pud=smoothstep(0.58,0.70,Z1.r)*flo;                           // 고인 물 — 짙고 반들
      fc*=1.0-0.35*pud; wet=mix(wet,1.0,pud); shn=mix(shn,90.0,pud); rough*=1.0-pud;
#elif CM_KIND==1
      vec3 fc=c;
#elif CM_KIND==2
      vec2 gc=floor(p.xz/0.16); float gh=cmH(vec3(gc,3.0));
      vec3 fc=mix(vec3(0.33,0.30,0.27)*md*2.0,c*(0.75+0.5*gh),smoothstep(0.42,0.58,cmLum(md)));   // 흙 사이 자갈
#else
      vec3 fc=mix(vec3(0.56,0.47,0.36),vec3(0.62,0.54,0.42),mid)*md*2.0;           // 마른 흙
#endif
      c=mix(c,fc,flo);
    }
    /* 이끼 — 하늘이 트인 입구 · 위를 보는 면 · 얼룩지게(안으로 들어가며 끊긴다) */
    float mw=CM_MOSS*smoothstep(0.08,0.55,sky)*(0.30+0.70*smoothstep(-0.2,0.7,n.y))*(1.0-0.75*flo)*smoothstep(0.45,0.66,big*0.7+mid*0.3+sky*0.15);   // 밟는 바닥엔 드물다
    if(mw>0.01){ vec3 mz=texture(cmC,vec3(pd/1.1,4.0)).rgb; c=mix(c,vec3(0.24,0.33,0.12)*mz*2.0,clamp(mw,0.0,0.92)); wet=mix(wet,0.25,mw); }
    /* 땅 높이 가까운 입구 가장자리 — 그 자리 바이옴 빛깔(흙 · 풀)로 */
    float gb=(1.0-smoothstep(0.05,0.7,abs(vCmG)+(mid-0.5)*0.4))*smoothstep(0.30,0.85,sky)*smoothstep(-0.4,0.2,n.y);
    c=mix(c,mix(vCmBio,vec3(0.30,0.25,0.19),0.35)*(0.75+0.5*cmLum(rk)),gb*0.85);
    /* 결의 높낮이 — 법선 지도(많이 섞인 쪽 한 장) · 굴 속은 횃불 쪽, 입구는 해 쪽 볕이 금과 혹을 따라 갈린다 */
    vec3 np=n;
#ifndef CM_NO_NRM
    if(nearK>0.0){
      vec3 t=texture(cmN,vec3(pd/CM_RS,CM_L)).rgb*2.0-1.0;
      vec3 bt=ax?vec3(n.x,t.y+n.y,t.x+n.z):(ay?vec3(t.x+n.x,n.y,t.y+n.z):vec3(t.x+n.x,t.y+n.y,n.z));
      np=normalize(mix(n,normalize(bt),0.75*rough*nearK));
    }
#endif
    vec3 tv=cmTP-p, Lt=normalize(tv);                                                // 세계 좌표로 센다(램버트엔 cameraPosition 이 안 실린다 — 눈 · 횃불 자리는 cmTick 이 준다)
    vec3 Lr=normalize(mix(Lt,cmSun,smoothstep(0.2,0.8,sky)));
    c*=1.0+clamp((dot(np,Lr)-dot(n,Lr))*1.5,-0.5,0.5);
    c*=0.74+0.26*clamp(dot(np,n),0.0,1.0);                                            // 패인 데는 덜 본다
    diffuseColor.rgb=c;
    /* 젖은 번들거림 — 사람이 든 횃불에서만(세기 · 거리 · 반쯤 겹친 방향) */
    if(cmT.w>0.0&&wet>0.01){
      vec3 Hh=normalize(Lt+normalize(cmEye-p));
      float at=clamp(1.0-length(tv)/cmT.x,0.0,1.0); at*=at;
      float sp=pow(max(dot(np,Hh),0.0),shn)*(0.2+1.6*max(fine-0.4,0.0));
      totalEmissiveRadiance+=cmTC*(cmT.w*at*sp*wet*2.0*(1.0-0.8*sky));
    }
  }
#endif`;

/* ── 재질 — 종류마다 하나 ────────────────────────────────────────────────────────────────────────────────── */
function cv10Mat(kind){
  const K=CMAT.K[kind]||CMAT.K.talus, key=CMAT.K[kind]?kind:'talus';
  if(CMAT.mats[key]) return CMAT.mats[key];
  cmPhotos();
  const m=new THREE.MeshLambertMaterial({color:0xffffff});
  const gl=(typeof CV10_GLOW!=='undefined'&&(CV10_GLOW[key]||CV10_GLOW.shelter))||[0,0,0,0];
  const U={cmC:CMAT.tex, cmN:CMAT.nrm, cmZ:cmNoise3(), cmT:CMAT.torch, cmTP:CMAT.tpos, cmEye:CMAT.eye, cmTC:CMAT.tcol, cmSun:TERR_U.uSunDir,
    cmElev:WATER_U.uElev, cmGrid:WATER_U.uGrid, cmBio:TERR_U.uBio, cmBioN:TERR_U.uBioN, cmCell:TERR_U.uCell,
    uCv10Glow:{value:new THREE.Vector4(gl[0],gl[1],gl[2],gl[3])}};
  const D=`#define CM_KIND ${K.id}\n#define CM_L ${K.L.toFixed(1)}\n#define CM_RS ${K.RS.toFixed(2)}\n#define CM_WET ${K.wet.toFixed(3)}\n#define CM_SH ${K.sh.toFixed(1)}\n#define CM_MOSS ${K.moss.toFixed(2)}\n`+(CMAT.dbg||'');
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,U);
    sh.vertexShader=CM_VERT+sh.vertexShader.replace('#include <begin_vertex>',CM_VMAIN);
    sh.fragmentShader=D+CM_FRAG+sh.fragmentShader.replace('#include <color_fragment>',CM_BODY);
  };
  const dk=CMAT.dbg||''; m.customProgramCacheKey=()=>'cv10mat-'+key+dk;
  envPatch(m);
  return CMAT.mats[key]=m;
}
/* 사진을 쓸 수 있을 때만 갈고리를 건다(WebGL1 · 사진 없음이면 단색 cv10SeatMat 그대로) */
function cmOK(){ return typeof CAVE_JPG!=='undefined'&&typeof THREE.DataTexture2DArray==='function'&&typeof THREE.DataTexture3D==='function'&&!!(renderer&&renderer.capabilities.isWebGL2); }
CV10.mat=kind=>cmOK()?cv10Mat(kind):cv10SeatMat(kind);
/* 미리 짜기(90-init.js precompPlan) — 껍데기 메시와 같은 꼴(자리 · 법선 · aDeep · aSky · aFl · aCs) */
function cmPrecompGeo(){
  if(CMAT.geo) return CMAT.geo;
  const g=new THREE.BufferGeometry(), z9=new Float32Array(9);
  g.setAttribute('position',new THREE.Float32BufferAttribute(z9,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(z9.slice(),3));
  for(const a of ['aDeep','aSky','aFl','aCs']) g.setAttribute(a,new THREE.Float32BufferAttribute(new Float32Array(3),1));
  return CMAT.geo=g;
}
/* 굴 씨(aCs) · 횃불 값 — 껍데기가 다 지어진 뒤(31-cave10.js onBuild) */
function cmTick(r,s,cam){
  const t=typeof torchLight!=='undefined'&&torchLight, v=CMAT.torch.value;
  if(cam) CMAT.eye.value.setFromMatrixPosition(cam.matrixWorld);
  if(t&&t.visible&&t.intensity>0){ v.set(t.distance||26,0,0,t.intensity); CMAT.tpos.value.setFromMatrixPosition(t.matrixWorld); CMAT.tcol.value.set(t.color.r,t.color.g,t.color.b); }
  else v.w=0;
}
CV10.onBuild.push(rec=>{
  const m=rec.mesh; if(!m||!m.geometry) return;
  const nv=m.geometry.attributes.position.count, s=cv10H(rec.c.seed|0,71,0x5eed);
  m.geometry.setAttribute('aCs',new THREE.BufferAttribute(new Float32Array(nv).fill(s),1));
  m.onBeforeRender=cmTick;
});
