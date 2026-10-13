/* 90-init.js — CASTAWAY
   시작 — 대기 원근 · 그림자 셰이더 손질 · 셰이더 미리 짜기 · initThree · generateWorld(섬 생성 순서)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12) 초기화 · 생성 · 루프
   ========================================================================== */
/* ── 땅의 대기 원근 ─────────────────────────────────────────────────────
   먼 것이 흐려지는 까닭은 둘이다 — 그 물체에서 오는 빛이 공기를 지나며 **먹히고**
   (T = exp(−β·d), 베르-람베르트), 그만큼 **그 방향 하늘빛이 더해진다**(공기 자체가 빛난다).
   화소 = 물체 × T + 하늘빛 × (1−T). 예전 FogExp2 는 exp(−(β·d)²) 에 색이 한 가지였다.
   β 는 파장마다 다르다 — 레일리(파랑이 셈) + 에어로졸(옹스트룀 1.3) 을 합친 비 (0.93, 1, 1.12).
   그래서 먼 산이 푸르스름하게 물러난다. 하늘빛은 **보는 방향의 지평선 하늘색**이다(`skyScatter`
   를 카메라 앞쪽으로 돌린 것) — 해 쪽을 보면 노을빛, 반대쪽은 푸른빛으로 먼 땅이 녹는다.
   Three 의 fog_fragment 를 바꾸므로 **안개를 받는 모든 재질에 똑같이 듣는다**(물 포함). */
/* **지평선의 연무**(사용자 요청) — 맑은 날의 소광계수로는 450 m 가 4% 밖에 안 흐려져, 나무가 그리는 거리(`VIEW_DIST`) 끝에서
   또렷한 채로 툭 나타났다. 바다 섬의 습한 공기처럼 **그리는 거리의 1/3 부터 끝까지 서서히** 그 방향 지평선 하늘빛으로 물러나게
   한다(끝에서 74%) — 새로 나타나는 나무는 이미 하늘빛에 녹아 있다. 그 너머의 먼 산은 1.8 km 까지 조금 더 물러난다(92%) */
const HAZE_GLSL=(()=>{ const V=(typeof VIEW_DIST!=='undefined'?VIEW_DIST:450);
  return 'fogT *= 1.0 - 0.74*smoothstep('+(V*0.30).toFixed(1)+','+V.toFixed(1)+',fogDepth) - 0.18*smoothstep('+V.toFixed(1)+',1800.0,fogDepth);'; })();
THREE.ShaderChunk.fog_fragment=`#ifdef USE_FOG
  vec3 fogT = exp( - fogDensity * fogDepth * vec3( 0.93, 1.0, 1.12 ) );
  ${HAZE_GLSL}
  gl_FragColor.rgb = gl_FragColor.rgb * fogT + fogColor * ( 1.0 - fogT );
#endif`;
/* ── 램버트: 빛마다 제 그림자만 받는다 ──────────────────────────────────────
   r128 램버트는 정점에서 해·불·손전등 빛을 **하나로 합친 뒤**, 화소에서 모든 그림자(해·불·손전등)를 곱한 값 하나를
   통째로 곱한다(`getShadowMask`). 그래서 낮에 모닥불이 그림자를 받으면 ① 불 그림자 거리(사거리+2 m) 밖은 r128 의
   `getPointShadow` 가 0(그늘)을 돌려줘 **햇빛까지 꺼졌고**(한낮 모닥불 장면에서 화면의 16.8%) ② 그 안에서도 불 그림자
   줄무늬가 햇빛을 가렸다. 이제 그림자를 받는 빛 — 해(평행광 0번) · 그림자를 가진 점광원 둘 · 집중광 하나 — 은 정점에서
   **세기만 따로** 세어(`vLambW` x 해 · y·z 점광원 0·1 · w 집중광 0, 양면이면 뒷면 `vLambWB` — 빛깔은 화소에서 그 빛의
   유니폼을 곱한다. 빛깔이 고르니 세기만 보간해도 같다) 화소에서 **제 그림자만** 곱한다. 나머지 빛(횃불 · 보급선 · 그림자
   없는 불 · 손전등이 그림자를 못 받을 때)은 예전처럼 합쳐서 그림자 없이 더한다.
   · `getShadowMask()` 는 이제 **해(평행광) 그림자만** 센다 — 물(`shM`)과 구름 그림자(`envPatch` 가 이 자리에 `cloudSh()` 를
     곱한다)도 해에만 걸린다. 그래서 구름 그늘이 불빛을 깎지 않는다(쓰는 곳은 램버트·물뿐 — ShadowMaterial 은 안 쓴다).
   · `getPointShadow` 는 그림자 거리 밖이면 1(볕) — 뒤 판 Three 가 그렇게 바꿨다.
   r128 은 그림자를 드리우는 광원을 광원 배열 앞에 둔다(`castShadow` 순 정렬) — 그래서 i 번째 그림자 지도가 i 번째 광원이다.
   불을 안 켠 낮은 예전과 같다(곱하는 차례만 바뀌어 반올림이 몇 화소 다를 뿐). 셰이더 원문이 예상과 다르면 손대지 않는다. */
(function(){
  const C=THREE.ShaderChunk, L=THREE.ShaderLib.lambert;
  const ACC='\t\tvLightFront += saturate( dotNL ) * directLightColor_Diffuse;\n\t\t#ifdef DOUBLE_SIDED\n\t\t\tvLightBack += saturate( -dotNL ) * directLightColor_Diffuse;\n\t\t#endif\n';
  const VV='varying vec3 vIndirectFront;\n#ifdef DOUBLE_SIDED\n\tvarying vec3 vLightBack;\n\tvarying vec3 vIndirectBack;\n#endif\n';
  const FD='\t#ifdef DOUBLE_SIDED\n\t\treflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;\n\t#else\n\t\treflectedLight.directDiffuse = vLightFront;\n\t#endif\n\treflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();\n';
  const LP='\t\tvec3 lightToPosition = shadowCoord.xyz;\n';
  const LV=C.lights_lambert_vertex, SM=C.shadowmask_pars_fragment, SP=C.shadowmap_pars_fragment;
  const iP=LV.indexOf('#if NUM_POINT_LIGHTS > 0'), iS=LV.indexOf('#if NUM_SPOT_LIGHTS > 0'), iD=LV.indexOf('#if NUM_DIR_LIGHTS > 0'), iH=LV.indexOf('#if NUM_HEMI_LIGHTS > 0');
  const s0=SM.indexOf('\t#if NUM_SPOT_LIGHT_SHADOWS > 0'), s1=SM.indexOf('\t#endif\n\treturn shadow;');
  const one=(t,x)=>t.split(x).length===2;
  if(!(iP>0&&iS>iP&&iD>iS&&iH>iD&&one(LV.slice(iP,iS),ACC)&&one(LV.slice(iS,iD),ACC)&&one(LV.slice(iD,iH),ACC)
       &&one(L.vertexShader,VV)&&one(L.fragmentShader,VV)&&one(L.fragmentShader,FD)&&one(SP,LP)&&s0>0&&s1>s0
       &&one(LV,'float dotNL;\n')&&one(LV,'vLightFront = vec3( 0.0 );\n'))){
    console.warn('[램버트 그림자] Three 셰이더가 예상과 달라 손대지 않았다'); return;
  }
  const W=(f,s)=>`\t\t\tvLambW.${f} += saturate( dotNL )${s};\n\t\t\t#ifdef DOUBLE_SIDED\n\t\t\t\tvLambWB.${f} += saturate( -dotNL )${s};\n\t\t\t#endif\n`;
  const S=n=>`\t\t\tlambS = dot( directLight.color, ${n}[ i ].color ) / max( dot( ${n}[ i ].color, ${n}[ i ].color ), 1e-12 );\n`;
  const PT=`\t\t#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( UNROLLED_LOOP_INDEX < 2 )\n${S('pointLights')}`
          +`\t\t\t#if UNROLLED_LOOP_INDEX == 0\n${W('y',' * lambS')}\t\t\t#else\n${W('z',' * lambS')}\t\t\t#endif\n\t\t#else\n${ACC}\t\t#endif\n`;
  const SPT=`\t\t#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS ) && ( UNROLLED_LOOP_INDEX == 0 )\n${S('spotLights')}${W('w',' * lambS')}\t\t#else\n${ACC}\t\t#endif\n`;
  const DIR=`\t\t#if UNROLLED_LOOP_INDEX == 0\n${W('x','')}\t\t#else\n${ACC}\t\t#endif\n`;
  C.lights_lambert_vertex=(LV.slice(0,iP)+LV.slice(iP,iS).replace(ACC,PT)+LV.slice(iS,iD).replace(ACC,SPT)+LV.slice(iD,iH).replace(ACC,DIR)+LV.slice(iH))
    .replace('float dotNL;\n','float dotNL;\nfloat lambS;\n')
    .replace('vLightFront = vec3( 0.0 );\n','vLightFront = vec3( 0.0 );\nvLambW = vec4( 0.0 );\n#ifdef DOUBLE_SIDED\n\tvLambWB = vec4( 0.0 );\n#endif\n');
  const VV2=VV+'varying vec4 vLambW;\n#ifdef DOUBLE_SIDED\n\tvarying vec4 vLambWB;\n#endif\n';
  const FD2=`\t#ifdef DOUBLE_SIDED
		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
		vec4 lambW = ( gl_FrontFacing ) ? vLambW : vLambWB;
	#else
		reflectedLight.directDiffuse = vLightFront;
		vec4 lambW = vLambW;
	#endif
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
		PointLightShadow lambPS = pointLightShadows[ 0 ];
		reflectedLight.directDiffuse += PI * pointLights[ 0 ].color * lambW.y * ( receiveShadow ? getPointShadow( pointShadowMap[ 0 ], lambPS.shadowMapSize, lambPS.shadowBias, lambPS.shadowRadius, vPointShadowCoord[ 0 ], lambPS.shadowCameraNear, lambPS.shadowCameraFar ) : 1.0 );
		#if NUM_POINT_LIGHT_SHADOWS > 1
		lambPS = pointLightShadows[ 1 ];
		reflectedLight.directDiffuse += PI * pointLights[ 1 ].color * lambW.z * ( receiveShadow ? getPointShadow( pointShadowMap[ 1 ], lambPS.shadowMapSize, lambPS.shadowBias, lambPS.shadowRadius, vPointShadowCoord[ 1 ], lambPS.shadowCameraNear, lambPS.shadowCameraFar ) : 1.0 );
		#endif
	#endif
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
		SpotLightShadow lambSS = spotLightShadows[ 0 ];
		reflectedLight.directDiffuse += PI * spotLights[ 0 ].color * lambW.w * ( receiveShadow ? getShadow( spotShadowMap[ 0 ], lambSS.shadowMapSize, lambSS.shadowBias, lambSS.shadowRadius, vSpotShadowCoord[ 0 ] ) : 1.0 );
	#endif
	#if NUM_DIR_LIGHTS > 0
		reflectedLight.directDiffuse += PI * directionalLights[ 0 ].color * lambW.x * getShadowMask();
	#endif
	reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
`;
  L.vertexShader=C.meshlambert_vert=L.vertexShader.replace(VV,VV2);
  L.fragmentShader=C.meshlambert_frag=L.fragmentShader.replace(VV,VV2).replace(FD,FD2);
  C.shadowmask_pars_fragment=SM.slice(0,s0)+SM.slice(s1);          // 해(평행광) 그림자만
  C.shadowmap_pars_fragment=SP.replace(LP,LP+'\t\tfloat lambLen = length( lightToPosition );\n'
    +'\t\tif ( lambLen > shadowCameraFar || lambLen < shadowCameraNear ) return 1.0;\n');
})();
/* 그리는 장치 이름(WEBGL_debug_renderer_info) — 성능 창에 보이고, **소프트웨어 렌더**(SwiftShader · llvmpipe ·
   Microsoft Basic Render — 그래픽 카드를 못 쓰고 CPU 가 그린다)면 시작 화면에 경고를 띄운다. 드라이버가 없거나
   하드웨어 가속이 꺼졌거나 GPU 차단 목록에 걸린 때다 — 그대로면 몇 fps 도 안 나온다 */
let GPU_NAME='', GPU_SOFT=false;
function detectGpu(){
  try{ const gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
    GPU_NAME=String((ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER)||''); }catch(e){}
  GPU_SOFT=/swiftshader|llvmpipe|softpipe|software|basic render/i.test(GPU_NAME);
  const el=document.getElementById('ovGpu');
  if(el&&GPU_SOFT){
    el.textContent='그래픽 카드를 쓰지 못하고 CPU 로 그리는 중입니다('+GPU_NAME.slice(0,60)+') — 매우 느립니다. '
      +'그래픽 드라이버를 깔거나, 브라우저의 하드웨어 가속을 켜 주세요.';
    el.style.display='block';
  }
}
function initThree(){
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  gndInit();                           // 땅·바위의 사진 결과 잡음 텍스처(22-ground-textures.js)
  detectGpu();
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  scene.matrixAutoUpdate=false;        // 장면 자체는 안 움직인다(정적 물체 행렬 고정 — freezeStatics)
  scene.background=null;          // 하늘은 skyScene 이 먼저 칠한다(renderFrame)
  /* 안개 — 나무가 150 m 에서 사라지므로 그 앞에서 잠기도록 짙게 잡는다.
     0.009 면 150 m 에서 87% 가 안개색이라 꺼지는 순간이 눈에 안 띈다. */
  scene.fog=new THREE.FogExp2(0x7d8f9b,0.009);
  /* far 를 2200 → 3000 으로. 구름을 키우면서 큰 막이 2200 에서 잘려 하늘에
     직선 금이 그이던 것을 막는다. 하늘 돔(1500)·별(1400)보다 커야 하는 건 그대로다. */
  camera=new THREE.PerspectiveCamera(70,1,0.1,3000);
  camera.rotation.order='YXZ';
  initSky();
  amb=new THREE.AmbientLight(0x8fa4b4,0.5); scene.add(amb);
  hemi=new THREE.HemisphereLight(0x9db4c6,0x2c3128,0.35); scene.add(hemi);
  sun=new THREE.DirectionalLight(0xc9c6b4,0.9); scene.add(sun);
  scene.add(sun.target);                 // 해 상자가 사람을 따라가려면 표적도 씬에 있어야 한다
  initTorchFx(); initWeaponFx(); initTracer();
  flash=new THREE.SpotLight(0xfff0d6,0,55,0.55,0.5,1.4);
  flash.position.set(0.2,-0.1,0); flash.target.position.set(0,0,-1);
  /* 카메라에 붙은 것(손에 든 무기·횃불)은 받기만 한다 — 눈앞 30 cm 짜리가
     그림자 지도에 찍히면 발밑에 정체 모를 얼룩이 생긴다. 배역은 물려받으므로
     여기 한 줄이면 카메라 밑이 다 따른다. */
  camera.userData.lightRole='recv';
  LIGHT.addSpot(camera,flash,true);      // 손전등은 그림자를 만든다
  camera.add(flash.target); scene.add(camera);
  LIGHT.poolInit();                      // 불빛 풀 — 모닥불·증기기관·제련로의 빛은 늘 서 있는 광원 몇 개가 옮겨 싣는다(광원 수가 안 바뀐다)
  LIGHT.setQuality(LIGHT.q);
  resize(); addEventListener('resize',resize);
}
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(Math.max(200,Math.floor(w*renderScale)),Math.max(150,Math.floor(h*renderScale)),false);
  camera.aspect=w/h; camera.updateProjectionMatrix();
}

const barF=document.getElementById('barF'), ovLoad=document.getElementById('ovLoad');
/* 다음 단계로 넘어가기 전에 진행 막대를 한 번 그리게 숨을 돌린다. 탭이 뒤에 가려져 있으면 브라우저가
   requestAnimationFrame 을 아예 안 불러 섬 만들기가 그 자리에서 멎었다 — 가려졌으면 기다리지 않고,
   보일 때도 0.15초 안에 프레임이 안 오면 그냥 간다 */
const phase=(t,p)=>new Promise(r=>{
  ovLoad.textContent=t; barF.style.width=p+'%';
  if(document.hidden){ setTimeout(r,0); return; }
  let done=false; const go=()=>{ if(!done){ done=true; r(); } };
  requestAnimationFrame(()=>setTimeout(go,0));
  setTimeout(go,150);
});
let busy=false;
/* ── 정적 물체 행렬 고정 ─────────────────────────────────────────────────
   Three 는 그릴 때마다 장면 전체를 훑어 물체마다 자리·회전·크기로 행렬을 다시 짜고(updateMatrix)
   부모 행렬을 곱한다. 장면 자체(`scene`)가 matrixAutoUpdate 면 그 아래 **모든** 물체의 세계 행렬이
   매 프레임 다시 곱해진다 — 칸 메시·지형 청크·구름까지 물체 4,900 개에 1.1 ms 였다.
   움직이지 않는 것(장면 · 하늘 장면 · propGroup 과 그 칸 메시 · 지형 청크 · 하천 판 · 구름 무리)은
   행렬을 한 번 짜 두고 끈다. 움직이는 것(카메라 · 바다 판 · 하늘 돔 · 해·달 · 새로 세운 집과 설비)은
   그대로 matrixAutoUpdate 다. 구름 덩이는 흐를 때 `updateClouds` 가 손수 updateMatrix 를 부른다.
   **이걸 건 물체를 옮기려면 `updateMatrix()` 를 직접 부를 것** — 안 부르면 그 자리에 그대로 그려진다. */
function freezeStatics(){
  const fr=o=>{ o.matrixAutoUpdate=false; o.updateMatrix(); };
  if(propGroup) for(const o of propGroup.children) fr(o);
  for(const B of TERR_BLK) fr(B.m);          // 지형 묶음(청크는 그리는 단위가 아니다 — 20-terrain.js)
  if(riverMesh) fr(riverMesh);
}
/* ── 셰이더 미리 짜기(E2) ─────────────────────────────────────────────────
   Three(r128)는 광원 수 — 평행광·점광원·집중광과 그 그림자 수 — 가 바뀌면 빛을 받는 재질의 셰이더를 새로 짠다
   (빛을 안 받는 재질도 처음 그릴 때의 광원 수가 열쇠에 들어간다). 첫 모닥불을 켜면 24개, 손전등을 처음 켜면 17개,
   상륙해 처음 보는 칸 재질 4개를 한꺼번에 짜느라 멈칫했다(Windows 의 ANGLE 은 한 개에 수십 ms). 한 번 짠 셰이더는
   재질마다 열쇠별로 기억해 되쓰므로(r128 `materialProperties.programs`), 나올 조합을 **시작 화면·일시정지 동안** —
   덮개 뒤라 멈칫이 안 보인다 — 프레임마다 몇 ms 씩 미리 짜 둔다. 화면은 그대로다(짜기만 하고 그리지 않는다).
   조합(지금 광원 상태 기준): ⓪ 그대로(아직 안 그려 본 재질 — 꺼진 칸·복제 나무·총구 불 — 와 그림자용 재질)
   ① 점광원 +1(등잔 · 그림자를 받기 전 불 · 그림자 품질 '낮음'의 불) ② 점광원 +1 과 그 그림자 +1(모닥불·화로)
   ③ 집중광 그림자 +1(손전등) ④ 불 + 손전등 — 그림자 수는 예산(`QUAL.pts`)을 흉내 내 정한다(손전등이 먼저 자리를 갖고,
   자리가 차 있으면 불의 그림자를 빼앗는다). ③④는 전등을 지녔을 때만. 기준은 둘 — 지금 광원 그대로, 그리고 놓인 불·화로·등잔을
   다 끈 바탕(불을 켠 채 멈췄다가 그 불이 꺼진 뒤 손전등만 켜는 때). 셰이더 열쇠는 광원의 **수**만 보므로 빈 장면에 같은 수의 가짜 광원을
   세우고, 재질마다 대역 메시를 하나씩 넣어 `renderer.compile` 한다. 대역은 인스턴스 여부 · 인스턴스 색 유무를 맞추고
   **지오메트리는 진짜 것을 쓴다** — 정점 색 재질은 지오메트리의 색 칸 크기(`vertexAlphas`)가 열쇠에 든다(땅이 그랬다).
   빛을 안 받는 재질은 ⓪①②만 — 불꽃처럼 점광원과 한 무리에 든 것만 ①②까지(불을 켤 때 처음 그려진다).
   **그림자 지도용 재질은 앞 프레임의 광원 수로 짜인다** — r128 은 그림자 지도를 그린 **뒤에** 이번 프레임 광원을 세운다
   (`shadowMap.render` → `setupLights`). 그래서 불이 처음 그림자를 드리우는 프레임의 거리 재질 열쇠는 '켜기 전' 상태다 —
   거리 재질은 ⓪①③④(점광원 그림자가 생기기 바로 앞 상태들)로, 깊이 재질(해·손전등)은 ⓪으로 짠다. 그림자 패스는
   **안개 없는 빈 장면**으로 그리므로 안개 없는 장면에서, 그림자에 그릴 면(앞면 재질은 뒷면 — `SHADOW_SIDE`)으로 짠다.
   내장 깊이·거리 재질은 렌더러 안에 숨어 있지만 같은 매개변수의 재질로 짜 두면 열쇠가 같아 셰이더를 나눠 쓴다.
   불을 켠 채 멈추면 그 상태에서 '하나 더' 를 다시 짠다 — 이미 짠 것은 표에서 찾기만 한다(재질 하나에 0.05 ms 쯤). */
const PRECOMP={jobs:null, k:0, i:0, sig:'', t:0, n:0, ms:0, ic:null, g0:null, mf:null, dm:{}, xm:{}, force:false};
const SHADOW_SIDE={0:1,1:0,2:2};      // r128 — 그림자 지도엔 앞면 재질의 뒷면을 그린다(양면은 양면)
function lightCensus(){
  const c={d:0,ds:0,p:0,ps:0,s:0,ss:0,h:0};
  scene.traverseVisible(o=>{
    if(!o.isLight||!o.layers.test(camera.layers)) return;
    if(o.isDirectionalLight){ c.d++; if(o.castShadow) c.ds++; }
    else if(o.isPointLight){ c.p++; if(o.castShadow) c.ps++; }
    else if(o.isSpotLight){ c.s++; if(o.castShadow) c.ss++; }
    else if(o.isHemisphereLight) c.h++;
  });
  return c;
}
/* 가짜 광원만 선 빈 장면 — Object3D.add 갈고리(LIGHT.pending)를 안 타게 손으로 붙인다 */
function precompScene(c,fog){
  const sc=new THREE.Scene(); sc.fog=fog?scene.fog:null;
  const put=(mk,n,ns)=>{ for(let i=0;i<n;i++){ const l=mk(); l.castShadow=i<ns; l.parent=sc; sc.children.push(l); } };
  put(()=>new THREE.DirectionalLight(),c.d,c.ds); put(()=>new THREE.PointLight(),c.p,c.ps);
  put(()=>new THREE.SpotLight(),c.s,c.ss);       put(()=>new THREE.HemisphereLight(),c.h,0);
  return sc;
}
/* 지금 장면에서 짤 것 — 빛 받는 재질 · 안 받는 재질(불꽃 무리 따로) · 해·손전등 그림자 깊이 재질 · 점광원 그림자 거리 재질.
   바뀌었는지는 sig 로 본다 */
function precompPlan(){
  const P=PRECOMP, c=lightCensus(), Q=LIGHT.QUAL[LIGHT.q], sh=renderer.shadowMap.enabled;
  const lit=new Map(), unl=new Map(), fx=new Map(), dep=new Map(), dis=new Map(), lamp=new Set();
  const own=(tbl,side,mk)=>tbl[side]||(tbl[side]=Object.assign(mk(),{side}));
  scene.traverse(o=>{ if((o.isPointLight&&!o.userData.pool||o.isLightProxy)&&o.parent&&o.parent!==camera) lamp.add(o.parent); });
  scene.traverse(o=>{
    if(!o.material||o.isSkinnedMesh||!(o.isMesh||o.isPoints||o.isLine||o.isSprite)) return;
    const g=o.geometry, inst=!!o.isInstancedMesh, ic=inst&&!!o.instanceColor;
    const near=lamp.has(o.parent)||(o.parent&&lamp.has(o.parent.parent))||(o.parent&&o.parent.parent&&lamp.has(o.parent.parent.parent));
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(m.isRawShaderMaterial) continue;                 // 광원 수가 열쇠에 안 든다 — 처음 그릴 때 한 번이면 된다
      const va=m.vertexColors===true&&g&&g.attributes.color?g.attributes.color.itemSize:0;   // r128 vertexAlphas
      const it={m,inst,ic,g}, key=m.id+'|'+inst+'|'+ic+'|'+va;
      if(m.isMeshLambertMaterial||m.isMeshPhongMaterial||m.isMeshStandardMaterial||m.isMeshToonMaterial||(m.isShaderMaterial&&m.lights)) lit.set(key,it);
      else (near?fx:unl).set(key,it);
      if(!sh||!o.castShadow||!o.isMesh) continue;
      const side=m.shadowSide!=null?m.shadowSide:SHADOW_SIDE[m.side];
      const dm=o.customDepthMaterial||own(P.dm,side,()=>new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}));
      const xm=o.customDistanceMaterial||own(P.xm,side,()=>new THREE.MeshDistanceMaterial());
      dep.set(dm.id+'|'+side+'|'+inst+'|'+ic,{m:dm,side,inst,ic,g});
      dis.set(xm.id+'|'+side+'|'+inst+'|'+ic,{m:xm,side,inst,ic,g});
    }
  });
  /* 아직 장면에 없을 수 있는 것 — 모든 불이 나눠 쓰는 불꽃 재질(fireMats)과 총구 불. 첫 불·첫 발에 짜이던 것이다 */
  if(!P.g0) P.g0=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9),3));
  const FM=fireMats();
  for(const m of [...FM.flame,FM.glow,FM.smoke,FM.sparks]) fx.set(m.id+'|false|false|0',{m,inst:false,ic:false,g:P.g0});
  if(!P.mf) P.mf=muzzleFlash(0.1).children[0].material;
  unl.set(P.mf.id+'|false|false|0',{m:P.mf,inst:false,ic:false,g:P.g0});
  /* 손전등 조합(③④)은 전등을 지녔을 때만 — 새 섬엔 없어서 시작 화면 일이 70개쯤 준다(지니게 된 뒤 멈추면 그때 짠다) */
  const lamp1=INV.slots.some(x=>{ const T=x&&ITEMS[x.id]; return !!(T&&T.tool&&T.tool.lamp); });
  const sig=[c.d,c.ds,c.p,c.ps,c.s,c.ss,c.h,LIGHT.q,sh,!!scene.fog,lamp1,lit.size,unl.size,fx.size,dep.size,dis.size].join(',');
  if(sig===P.sig) return;
  const L=[...lit.values()], U=[...unl.values()], F=[...fx.values()], D=[...dep.values()], X=[...dis.values()];
  /* 그림자 예산(LIGHT.update)을 흉내 낸다 — 자리 K 개를 손전등이 먼저(카메라에 붙어 늘 점수가 가장 높다), 남은 자리를
     점광원이 갖는다. 새 불은 가까이서 켜니 지금 그림자를 가진 불과 겨뤄 이긴다고 친다(자리가 차 있으면 수는 그대로) */
  const K=sh?Q.pts:0, fit=(b,np,nps,fl)=>{ const ss=Math.min(fl?1:b.ss,K);
    return {p:b.p+np, ps:Math.min(b.ps+nps,Math.max(0,K-ss)), ss}; };
  const jobs=[], seen=new Set(), LF=L.concat(F);
  const job=(d,tag,list,fog)=>{ const cc=Object.assign({},c,d), k=cc.p+'/'+cc.ps+'/'+cc.ss+'/'+tag;   // 같은 조합 · 같은 목록은 한 번
    if(!list.length||seen.has(k)) return; seen.add(k); jobs.push({sc:precompScene(cc,fog),list}); };
  /* 기준은 둘 — 지금 광원 그대로, 그리고 놓인 불·화로·등잔을 다 끈 바탕(불을 켠 채 멈췄다가 그 불이 꺼진 뒤 손전등만 켜는 때).
     카메라의 횃불 · 보급선 광원 · 폭발 불빛은 늘 장면에 있다(세기로 끈다) */
  let dyn=0;
  scene.traverseVisible(o=>{ if(o.isPointLight&&o.layers.test(camera.layers)&&o.parent!==camera
                               &&o!==BLAST_LIGHT&&o!==SHIP.light&&o!==SHIP.parked&&!o.userData.pool) dyn++; });
  const bases=[c]; if(dyn||c.ps||c.ss) bases.push({p:c.p-dyn, ps:0, ss:0});
  job({},'DX',D.concat(X),false);                      // 그림자용 — 점광원 그림자가 처음 생길 때도 지금 상태(앞 프레임)다
  for(const b of bases){
    const flash=lamp1&&c.s>0&&!b.ss;
    job(b,'LUF',L.concat(U,F),true);                   // ⓪ 그대로
    job(fit(b,1,1,false),'LF',LF,true);                // ② 불(그림자)
    const c1=fit(b,1,0,false); job(c1,'LF',LF,true); job(c1,'X',X,false);   // ① 불(그림자 없이) · 등잔 — 그다음 불이 그림자를 받으면 이 상태로
    if(b!==c) job(b,'X',X,false);
    if(flash){ const c3=fit(b,0,0,true), c4=fit(b,1,1,true);
      job(c3,'L',L,true); job(c3,'X',X,false);         // ③ 손전등(자리가 차 있으면 불의 그림자를 빼앗는다)
      job(c4,'LF',LF,true); job(c4,'X',X,false); }     // ④ 불 + 손전등
  }
  P.sig=sig; P.jobs=jobs; P.k=0; P.i=0;
}
/* 대역 메시 — 짤 때 지오메트리는 정점 색 칸만 읽는다(올리지 않는다) */
function precompProxy(it){
  const P=PRECOMP;
  if(!P.ic) P.ic=new THREE.InstancedBufferAttribute(new Float32Array(3),3);
  const o=it.inst?new THREE.InstancedMesh(it.g,it.m,1):new THREE.Mesh(it.g,it.m);
  if(it.ic) o.instanceColor=P.ic;
  return o;
}
function precompStep(budget){
  const P=PRECOMP, t0=performance.now();
  while(P.jobs&&P.k<P.jobs.length){
    const J=P.jobs[P.k];
    if(P.i>=J.list.length){ P.k++; P.i=0; continue; }
    const it=J.list[P.i++], o=precompProxy(it), s0=it.m.side, n0=renderer.info.programs.length;
    if(it.side!==undefined) it.m.side=it.side;
    o.parent=J.sc; J.sc.children.push(o);
    try{ renderer.compile(J.sc,camera); }catch(e){ console.warn('[셰이더 미리 짜기]',e); }
    J.sc.children.pop(); o.parent=null; it.m.side=s0;
    P.n+=renderer.info.programs.length-n0;
    if(performance.now()-t0>budget) break;
  }
  P.ms+=performance.now()-t0;
  if(P.jobs&&P.k>=P.jobs.length) P.jobs=null;
}
/* 멈춘 동안 프레임마다 — 할 일이 있으면 8 ms 씩 짜고, 없으면 1.5초마다 장면이 바뀌었나 본다.
   **소프트웨어 렌더(GPU_SOFT)에선 안 한다** — 스위프트셰이더는 셰이더 하나에 수 초(파이프라인을 CPU 코드로 짠다)라
   127개를 짜는 동안 시작 화면 뒤에서 6분을 붙잡았다(헤드리스 시험이 다 느려진다). 시험에서 켜려면 `PRECOMP.force=true` */
const PRECOMP_MAX=400;          // 셰이더가 이만큼 쌓이면 더 미리 짜지 않는다 — 불을 켠 채 자주 멈추면 조합이 늘어난다
function precompTick(now){
  const P=PRECOMP;
  if(GPU_SOFT&&!P.force) return;
  if(renderer.info.programs.length>=PRECOMP_MAX){ P.jobs=null; return; }
  if(P.jobs){ precompStep(8); return; }
  if(now-P.t<1500) return;
  P.t=now; precompPlan();
}
async function generateWorld(){
  if(busy) return; busy=true;
  landed=false; autoT=0;                // 새 섬 · 불러오기 — 상륙할 때까지는 자동 저장할 것이 없다
  GAME_ID=newGameId(); _propGrid=null;  // 새 판 번호(불러오기는 restore 가 저장의 번호로 되돌린다)
  paused=true;                          // 덮개('상륙')가 떠 있는 동안 세상이 뒤에서 흘러가지 않게 — 놀다가 불러와도(F9) 상륙을 눌러야 시간이 간다
  LIGHT.live=false;                     // 짓는 동안은 배역을 안 준다(LIGHT.flush) — 다 지은 뒤 refresh 한 번
  RELIEF.on=false;                      // 잔 기복은 섬을 키운 뒤에 켠다(reliefMask — 10-worldgen.js)
  try{
  document.getElementById('ov').style.display='flex';
  document.getElementById('bStart').style.display='none';
  await NATIVE.ready;                   // C 로 짠 침식 토막(WebAssembly)이 켜지기를 기다린다 — 못 켜면 JS 판으로 돈다(12-native.js)
  const seed=hashStr(P.seed), t0=performance.now();
  setWorldScale(1);                     // 섬은 늘 칸 2.5 m 로 만든다 — 다 만든 뒤 worldRescale 이 배율(P.ws)만큼 키운다

  await phase('지각 융기',6);       genBase(seed);
  await phase('안식각 정리',18);    thermal(22,1.15*(CELL/4),0.5);
  await phase('하천 침식',34);      hydraulic(seed,Math.round(38000*P.ero*(16/(CELL*CELL))));
  await phase('사면 안정화',48);    thermal(8,1.45*(CELL/4),0.45);
                                    smoothTerrain(3,0.6);   // 표면 잡티 제거
                                    if((P.tv|0)>=2) terrainFeatures(seed); else LANDFORMS=[];   // 피오르·골짜기·절벽·단구·산릉(지형 판 2 — 10-worldgen.js)
                                    computeSlope();
  await phase('수계 추출',58);      hydrology(); computeSlope(); computeTWI();
                                    distanceField(F.dWater,i=>F.elev[i]<=0);
                                    distanceField(F.dRiver,i=>F.river[i]===1||F.elev[i]<=0);
  await phase('기후 계산',68);      climate(seed);
  /* 분기공 표(F.fuma)를 **먼저 비운다** — 안 비우면 앞서 만든 섬의 분기공이 첫 classify 에 섞여
     들어가 분기공 자리가 달라지고, 그 뒤에 놓이는 자원(화강암·점토·풀·광석 …)이 통째로 다른 자리에 선다.
     같은 시드인데 섬이 달라져, 불러온 저장의 '캔 자리'가 엉뚱한 자원에 덧씌워졌다(진행이 날아간 원인). */
  await phase('식생 분류',76);      F.fuma.fill(0); classify();
                                    hydrothermal(seed); classify();
  await phase('광상 탐사',82);      worldRescale(P.ws);     // 섬 배율 — 통째로 키운다(1 이면 그대로 · 00-core.js)
                                    camera.far=Math.max(3000,WORLD*1.15); camera.updateProjectionMatrix();
                                    document.getElementById('mSpan').textContent=Math.round(WORLD)+' m';
                                    reliefMask();           // 잔 기복의 가림막(지형 판 3) — 이 뒤로 heightAt 이 둔덕·골을 안다
                                    placeResources(seed);
                                    shapeSeabed(seed);      // 바다 바닥의 기복 — 뭍·자원을 다 정한 **뒤에**(같은 시드의 섬은 그대로다)
  await phase('지형 메시',90);      buildBioTex(); buildChunks(); buildWater();
  await phase('자원 배치',96);      placeProps_(seed);
                                    /* 다 지을 때까지 소품·나무는 안 그린다 — 칸을 켜고 끄는 updateTileVis 는 멈춘 동안(짓는 중·
                                       시작 화면) 안 돌아서, 갓 지은 칸 메시가 전부 켜진 채(섬 전체 나무가 가까운 단계로) 그려졌다.
                                       덮개(94%) 뒤라 안 보이는데 헤드리스에선 그 한 프레임이 수십 초였다 */
                                    propGroup.visible=false;
  await phase('상륙 준비',99);      cacheMap(); spawnPlayer(); buildFarTrees(); boundTiles(); freezeStatics();
                                    RUBBLE.seed=seed|0; updateRubble(true);     // 자갈밭의 돌을 사람 둘레에 깐다
                                    floraReset(seed); giantsBuild();             // 노거수 — 뿌리가 땅이 되는 큰 나무(군락이 정한 자리)
                                    updateFlora(true);                           // 군락의 나무·덤불을 사람 둘레에 깐다
                                    tlitBuild();                                 // 섬 크기의 빛 — 산 그림자·하늘 트임·숲 덮임(41-terrain-light.js)
                                    foamReset();                                 // 물가의 사면체 거품 — 새 섬의 표고를 C 쪽에 비춘다(96-foam.js)
                                    wildReset();                                 // 새·둥지·벌집·벌레(97-wildlife.js)
                                    seaReset(seed);                              // 바다 — 주운 자리·물고기를 비우고 새 섬의 산호밭을 깐다
                                    LIGHT.refresh(); LIGHT.live=true;   // 다 지은 섬에 배역을 한 번에 · 이제부터 바뀌면 그림자를 다시
                                    updateSky();   // 하늘 표(SKY_LUT)를 한 번 굽는다 — 시작 화면처럼 갱신이 멈춘 동안에도 하늘이 비지 않게
                                    propGroup.visible=showProps;           // 칸은 사람 자리로 한 번 골라 켠다(시작 화면도 가벼이)
                                    _tvForce=true; updateTileVis(); updateTerrainLOD();
                                    INV.slots.length=0; INV.sel=0; invDirty=true; INV.pockets.length=0; INV.view='all'; INV.ren=0;
                                    for(const k in WEAR) WEAR[k]=null; INV.max=INV.base;
                                    invAdd('guide',1);        // 생존 안내서 — 가방에서 누르면 읽힌다
                                    invAdd('codex',1);        // 사전은 처음부터 지닌다
                                    invAdd('hand_charger',1); // 캠코더 배터리를 채우는 손 충전기
                                    CAMC.bat=100; CAMC.warned=false; CAMC.health=1; CAMC.li=false; CAMC.hsaid=0;
                                    invAdd('ring_platinum',1); // 표류 전부터 끼고 있던 반지
                                    invAdd('can_food',2);     // 보급선이 쥐여 준 비상식량
                                    invAdd('bottle_water',1); // 물 한 병 — 비면 다시 채운다
                                    HARV.near=null; HARV.t=0; REGROW.length=0;
                                    EQUIP=null; CRAFT.recipe=null; CRAFT.held=null; craftDirty=true;
                                    QUICK.fill(null); quickDirty=true;
                                    clearBuilds(); exitBuild();
                                    FIRES.forEach(f=>scene.remove(f.mesh)); FIRES.length=0;
                                    GRINDS.forEach(g=>scene.remove(g.mesh)); GRINDS.length=0;
                                    FURNACES.forEach(g=>scene.remove(g.mesh)); FURNACES.length=0;
                                    ANVILS.forEach(g=>scene.remove(g.mesh)); ANVILS.length=0;
                                    STORES.forEach(g=>scene.remove(g.mesh)); STORES.length=0;
                                    WHEELS.forEach(g=>scene.remove(g.mesh)); WHEELS.length=0;
                                    DYNAMOS.forEach(g=>scene.remove(g.mesh)); DYNAMOS.length=0;
                                    ARCS.forEach(g=>scene.remove(g.mesh)); ARCS.length=0;
                                    LATHES.forEach(g=>scene.remove(g.mesh)); LATHES.length=0;
                                    boxOpen=false; curStore=null;
                                    /* 열려 있던 창은 전부 닫는다 — 가방을 연 채 새 섬을 만들면 가방이 열린 채로 시작했다(사용자 지적) */
                                    try{ if(typeof closeBag==='function') closeBag(); }catch(e){}
                                    invOpen=craftOpen=false;
                                    if(typeof dexOpen!=='undefined'&&dexOpen){ dexOpen=false; const d=document.getElementById('dex'); if(d) d.style.display='none'; }
                                    { const b=document.getElementById('box'); if(b) b.style.display='none'; }
                                    if(typeof CTREE!=='undefined') ctreeHide(true);
                                    if(typeof GATHER!=='undefined'){ GATHER.p=null; GATHER.t=0; GATHER.on=false; }
                                    CREATURES.length=0; ATK.cd=0; ATK.swing=0;

  document.getElementById('iSeed').textContent=P.seed;
  console.log('[생성]',P.seed,Math.round(performance.now()-t0)+'ms',
              '육지',(stats.landCells/(N*N)*100).toFixed(1)+'%','자원',stats.props);
  ovLoad.textContent='';
  document.getElementById('bStart').style.display='';
  document.getElementById('bStart').textContent='착륙';
  if(typeof titleAfterGen==='function') titleAfterGen();     // 처음이면 간판과 '시작' · 다시 만든 섬이면 곧장 '착륙' 단추(91-title.js)
  offerLoadOnStart();                  // 저장된 것이 있으면 상륙 전에 한 번 물어본다
  }catch(e){
    showErr('생성',e);
    ovLoad.textContent='생성 실패 — 위 오류를 확인하세요';
    document.getElementById('bStart').style.display='';
  }
  busy=false;                           // 실패해도 잠기지 않게 반드시 해제
}
function placeProps_(seed){ placePod(seed); buildProps(); buildCrags(); buildCaves(); makeShip(); buildClouds(seed); }   // 착륙 자리를 먼저 정해 거기 자원을 뺀 뒤 짓는다
