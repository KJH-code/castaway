/* ==========================================================================
   사진 결 — ambientCG 의 CC0 재질 사진(data-item-textures.js 의 ITEM_TEX · 만드는 도구 tools/item-tex.mjs)을 나눠 쓴다
   · photoTex(kind)  빛깔 · 법선 사진 텍스처 — 같은 사진은 텍스처 하나. 이 파일을 읽을 때 다 불러 둔다(섬을 짓는 동안 풀린다).
                     풀리면 그 사진을 쓰는 손에 든 것의 가방 그림을 비운다(풀리기 전에 그린 그림엔 사진이 없다).
   · photoPatch(m, kind, o)  램버트 · 퐁 재질에 사진 결을 입힌다 — **UV 없이**: 물체 좌표의 세 방향에서 사진을 읽어 법선으로 섞는다
                     (rockDetailPatch 와 같은 꼴 · 인스턴스 메시도 된다). 짓는 것 · 설비 · 상자 · 보급선 · 대지의 나무 상자 · 신전 나무가 쓴다.
       o.size  사진 한 장 길이(m — 없으면 사진 표의 값) · o.tint 0..1 — 1 이면 재질 빛깔을 지키고 사진의 무늬만(빛깔 × 사진 ÷ 평균),
               0 이면 사진 빛깔 그대로 · o.ns 법선 세기. 법선 사진은 해 쪽으로 밝기를 보태고 골을 어둡게 한다(30 m 안 — 램버트는 정점에서
               빛을 세 참 법선을 못 쓴다). 법선 · 해 방향은 물체 좌표로 옮겨 센다 — 돌린 상자도 결이 따라 돈다.
     돌은 이미 게임 바위 사진이 있다 — 돌로 지은 것은 rockDetailPatch(22-ground-textures.js)를 쓴다.
   · WebGL2 가 아니면(transpose 가 없다) 손대지 않는다. 셰이더 하나(열쇠 'ph') — 결마다 값은 유니폼이다.
   ========================================================================== */
const PHOTO={tex:{}};
function photoTex(kind){
  const T=typeof ITEM_TEX!=='undefined'&&ITEM_TEX[kind]; if(!T) return null;
  if(PHOTO.tex[kind]) return PHOTO.tex[kind];
  const mk=url=>{
    if(PHOTO.tex[url]) return PHOTO.tex[url];                       // 같은 사진을 쓰는 결끼리(합성수지 · 국방색) 한 텍스처
    const img=new Image(), t=PHOTO.tex[url]=new THREE.Texture(img);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    img.onload=()=>{ t.needsUpdate=true;
      if(typeof ITEM_ICON!=='undefined'&&typeof ITEM_MESH!=='undefined') for(const id in ITEM_MESH)
        if(ITEM_MESH[id].mats.some(d=>d.t&&ITEM_TEX[d.t]&&(ITEM_TEX[d.t].map===url||ITEM_TEX[d.t].nrm===url))) delete ITEM_ICON[id]; };
    img.src=url; return t; };
  return PHOTO.tex[kind]={map:mk(T.map), nrm:mk(T.nrm)};
}
if(typeof ITEM_TEX!=='undefined') for(const k in ITEM_TEX) photoTex(k);

function photoPatch(m,kind,o){
  const T=typeof ITEM_TEX!=='undefined'&&ITEM_TEX[kind], X=T&&photoTex(kind);
  if(!X||!m||m.userData.photo||typeof TERR_U==='undefined'||!TERR_U.uSunDir) return m;
  if(typeof renderer!=='undefined'&&renderer&&!renderer.capabilities.isWebGL2) return m;
  o=o||{};
  if(typeof renderer!=='undefined'&&renderer){ const an=Math.min(4,renderer.capabilities.getMaxAnisotropy()); if(X.map.anisotropy<an) X.map.anisotropy=X.nrm.anisotropy=an; }
  const U={uPhC:{value:X.map}, uPhN:{value:X.nrm}, uPhM:{value:new THREE.Vector3(T.mean[0],T.mean[1],T.mean[2])},
           uPhK:{value:new THREE.Vector3(1/(o.size||T.size[0]), o.tint===undefined?0.7:o.tint, o.ns===undefined?T.ns:o.ns)}};
  const prev=m.onBeforeCompile, has=Object.prototype.hasOwnProperty.call(m,'onBeforeCompile');
  m.onBeforeCompile=(sh,r)=>{
    if(has&&prev) prev(sh,r);
    Object.assign(sh.uniforms,U); sh.uniforms.uSunDir=TERR_U.uSunDir;
    sh.vertexShader='uniform vec3 uSunDir;\nvarying vec3 vPhP;\nvarying vec3 vPhN;\nvarying vec3 vPhS;\nvarying float vPhD;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      { vec4 gw=vec4(transformed,1.0); vec3 gn=objectNormal; mat3 M=mat3(modelMatrix);
        #ifdef USE_INSTANCING
          gw=instanceMatrix*gw; gn=mat3(instanceMatrix)*gn; M=M*mat3(instanceMatrix);
        #endif
        vPhP=gw.xyz; vPhN=gn; vPhS=normalize(transpose(M)*uSunDir); vPhD=length((modelViewMatrix*gw).xyz); }`);
    sh.fragmentShader='uniform sampler2D uPhC;\nuniform sampler2D uPhN;\nuniform vec3 uPhM;\nuniform vec3 uPhK;\nuniform vec3 uSunDir;\nvarying vec3 vPhP;\nvarying vec3 vPhN;\nvarying vec3 vPhS;\nvarying float vPhD;\n'+
      sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { vec3 n=normalize(vPhN), tw=pow(abs(n),vec3(4.0)); tw/=tw.x+tw.y+tw.z+1e-4; vec3 q=vPhP*uPhK.x;
        vec3 c=texture2D(uPhC,q.zy).rgb*tw.x+texture2D(uPhC,q.xz).rgb*tw.y+texture2D(uPhC,q.xy).rgb*tw.z;
        diffuseColor.rgb=mix(c,diffuseColor.rgb*c/max(uPhM,vec3(0.02)),uPhK.y);
        float nr=clamp(1.0-vPhD/30.0,0.0,1.0)*uPhK.z;
        if(nr>0.0){
          vec3 tx=texture2D(uPhN,q.zy).rgb*2.0-1.0, ty=texture2D(uPhN,q.xz).rgb*2.0-1.0, tz=texture2D(uPhN,q.xy).rgb*2.0-1.0;
          tx=vec3(tx.xy+n.zy,n.x); ty=vec3(ty.xy+n.xz,n.y); tz=vec3(tz.xy+n.xy,n.z);
          vec3 np=normalize(mix(n,normalize(tx.zyx*tw.x+ty.xzy*tw.y+tz.xyz*tw.z),0.8)), s=normalize(vPhS);
          diffuseColor.rgb*=1.0+clamp((dot(np,s)-dot(n,s))*1.5,-0.5,0.5)*nr*smoothstep(0.0,0.25,uSunDir.y);
          diffuseColor.rgb*=mix(1.0,0.72+0.28*clamp(dot(np,n),0.0,1.0),nr);
        } }`);
  };
  const pk=Object.prototype.hasOwnProperty.call(m,'customProgramCacheKey')?m.customProgramCacheKey:null;
  m.customProgramCacheKey=()=>'ph'+(pk?'-'+pk.call(m):'');
  m.userData.photo=kind;
  return m;
}
/* 램버트 한 장에 사진 결 — 짓는 것 · 설비가 빛깔과 결로 부른다(결이 없으면 맨 램버트) */
function photoLambert(c,kind,o,extra){
  const m=new THREE.MeshLambertMaterial(Object.assign({color:c},extra||{}));
  if(kind==='rock') return typeof rockDetailPatch==='function'?rockDetailPatch(m,(o&&o.size)||0.8,(o&&o.moss)||0):m;
  return kind?photoPatch(m,kind,o):m;
}
