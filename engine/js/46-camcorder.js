/* 46-camcorder.js — CASTAWAY
   캠코더 화면 — 세상을 낮은 해상도로 찍어 테이프 화질로 보여 준다 · 배터리 · 손 충전기 · 노을·달밤의 색조 · 물속 화면
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   캠코더
   ----------------------------------------------------------------------------
   표류자는 손에 든 캠코더의 뷰파인더로 섬을 본다(사용자 요청: 낮은 화질의 캠코더 테마).
   ① **찍기** — 장면을 창 크기 그대로가 아니라 **세로 480줄짜리 그림판**(`CAMC.rt`)에 그린 뒤, 화면 가득 늘여 붙이며
      테이프 화질을 입힌다(`CAMC.mat`): 색 번짐 · 줄마다 살짝 밀림 · 알갱이 · 주사선 · 렌즈 가장자리 어둡게 · 살짝 볼록.
      화소 수가 창의 1/4~1/9 라 **그리는 값이 그만큼 싸다**(이 게임의 프레임 시간은 거의 다 화소 셰이더다).
      설정의 '캠코더'에서 줄 수(360 · 480 · 720)를 고르거나 끌 수 있다.
   ② **색조** — 노을·새벽에는 밝은 데를 주황, 어두운 데를 보라로 물들이고, 달이 뜬 밤은 푸르게 한다
      (`SKYL.grade` — 45-sky.js 가 해·달 자리로 정한다). 빛의 색만 바꿔서는 밝은 데와 어두운 데를 따로 물들일 수 없다.
   ③ **물속** — 화면이 일렁이고 청록으로 가라앉으며, 낮에는 수면에서 빛줄기가 내려온다.
   ④ **배터리** — 켜 둔 동안 닳는다(가득에서 14분). 화면 위 오른쪽에 남은 양이 뜬다. 15% 밑이면 화면이 지직거리고,
      다 닳으면 어둡고 흐린 흑백이 된다(놀 수는 있다). **손 충전기**를 손에 들고 좌클릭을 누르고 있으면 찬다.
   ========================================================================== */
const CAMC={on:true, lines:480, rt:null, scene:null, cam:null, mat:null,
            bat:100, DRAIN:100/(14*60), CRANK:6.5, crank:0, under:0, warned:false, el:null,
            noise:1};                              // 화면 잡음(0 끔 · 1 보통 · 2 짙게) — 설정 · 프리셋
const CAMC_LINES=[0,360,480,720];                   // 설정 칸의 0~3 → 줄 수(0 = 끄기)
function camcInit(){
  CAMC.scene=new THREE.Scene(); CAMC.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  CAMC.mat=new THREE.ShaderMaterial({
    depthTest:false, depthWrite:false, fog:false,
    uniforms:{tD:{value:null}, uRes:{value:new THREE.Vector2(640,480)}, uT:{value:0}, uBat:{value:1}, uUnder:{value:0},
              uLow:{value:0}, uMoon:{value:0}, uNight:{value:0}, uDay:{value:1}, uGrain:{value:1}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader:`
      precision highp float;
      uniform sampler2D tD; uniform vec2 uRes; uniform float uT,uBat,uUnder,uLow,uMoon,uNight,uDay,uGrain;
      varying vec2 vUv;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      void main(){
        vec2 c=vUv-0.5, uv=0.5+c*(1.0+0.045*dot(c,c));                     // 렌즈 — 가장자리가 살짝 볼록하다
        float weak=smoothstep(0.15,0.0,uBat), dead=smoothstep(0.012,0.0,uBat);
        uv+=uUnder*vec2(sin(uv.y*17.0+uT*1.7),cos(uv.x*13.0+uT*1.3))*0.0045;   // 물속 — 일렁인다
        float ln=floor(uv.y*uRes.y);
        float jit=(h21(vec2(ln,floor(uT*24.0)))-0.5)*0.0011*(1.0+9.0*weak);    // 테이프 — 줄마다 살짝 밀린다
        float band=fract(uv.y*0.9-uT*0.07);                                    // 천천히 내려오는 트래킹 띠
        jit+=smoothstep(0.985,1.0,band)*0.004*(0.3+weak*3.0);
        uv.x+=jit;
        float px=1.0/uRes.x;
        vec3 a=texture2D(tD,uv).rgb, l=texture2D(tD,uv-vec2(px*2.4,0.0)).rgb, r=texture2D(tD,uv+vec2(px*2.4,0.0)).rgb;   // 색 번짐 — 사용자 요청으로 1.7 → 2.4 화소
        vec3 col=vec3(l.r*0.55+a.r*0.45, a.g*0.64+0.18*(l.g+r.g), r.b*0.55+a.b*0.45);   // 색 번짐 — 빨강·파랑이 옆으로 어긋난다
        if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) col=vec3(0.0);
        float Y=dot(col,vec3(0.299,0.587,0.114));
        /* 색조 — 노을·새벽: 밝은 데는 주황 · 어두운 데는 보라 / 달밤: 푸른빛 */
        col*=mix(vec3(1.0),mix(vec3(0.96,0.78,1.50),vec3(1.22,0.92,0.60),smoothstep(0.14,0.55,Y)),uLow*0.85);
        col*=mix(vec3(1.0),vec3(0.84,0.96,1.24),uMoon*0.70);
        col=mix(col,vec3(Y)*vec3(0.78,0.90,1.16),uNight*0.30);                 // 밤눈은 색을 덜 본다
        /* 가장 어두운 그늘은 **짙은 보라**로 가라앉는다(사용자 요청) — 밝기 0.2 아래에서만, 어두울수록 짙게. 밤에는 화면이 통째로
           어두우니 반만 건다(안 그러면 밤이 온통 보라다) */
        { float shd=(1.0-smoothstep(0.02,0.21,Y))*(1.0-0.5*uNight);
          col=mix(col,col*vec3(0.74,0.52,1.42)+vec3(0.024,0.0,0.056),shd*0.9); }
        /* 물속 — 청록으로 가라앉고, 낮에는 수면에서 빛줄기가 비껴 내려온다 */
        col=mix(col,col*vec3(0.50,0.92,1.04)+vec3(0.0,0.025,0.04),uUnder*0.65);
        if(uUnder>0.01){
          float x=uv.x*5.0+(uv.y-1.0)*1.1+sin(uT*0.21)*0.6;
          float ray=pow(max(0.0,sin(x*3.1+sin(uT*0.5+x)*0.6))*(0.55+0.45*sin(x*7.7+uT*0.9)),3.0);
          col+=vec3(0.26,0.42,0.40)*ray*smoothstep(0.10,1.0,uv.y)*uUnder*uDay*0.55;
        }
        col=mix(vec3(Y),col,0.94)*0.95+0.028;                                  // 싼 센서 — 검정이 살짝 뜬다
        float n=h21(uv*uRes+uT*61.0)-0.5;
        /* 흰 잡음 — 화면 화소마다(그림판 화소가 아니라) 새로 뽑아 잘게 지직거린다. 어두울수록 · 배터리가 약할수록 심하다.
           세기는 설정의 '화면 잡음'(uGrain 0 · 1 · 2). 여기서 같이 하므로 따로 드는 값이 없다 */
        float n2=h21(gl_FragCoord.xy+fract(uT*7.13)*311.0)-0.5;
        col+=(n*0.6+n2*0.9)*(0.050+0.09*uNight)*uGrain+n*0.30*weak;
        col*=1.0-(0.065+0.03*uGrain)*(0.5-0.5*sin(uv.y*uRes.y*3.14159));       // 주사선
        col*=1.0-0.40*pow(length(c)*1.25,2.6);                                 // 가장자리 어둡게
        col*=1.0-0.25*weak*step(0.5,h21(vec2(floor(uT*9.0),1.0)));             // 배터리가 약하면 깜빡인다
        col=mix(col,vec3(Y*0.30)+n*0.22,dead);                                 // 다 닳으면 어둡고 흐린 흑백
        gl_FragColor=vec4(col,1.0);
      }`});
  const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),CAMC.mat); q.frustumCulled=false; CAMC.scene.add(q);
  /* 창 바탕에 까는 잡음·주사선 무늬 — 128 px 그림 한 장을 한 번 만들어 CSS 변수(--tvn)로 넘긴다(game.css). 움직이지 않는다 */
  { const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), im=g.createImageData(128,128), rn=mulberry32(0x7e1e);
    for(let y=0;y<128;y++) for(let x=0;x<128;x++){ const i=(y*128+x)*4, v=(rn()*255)|0, line=(y%3===0)?0.55:1;
      im.data[i]=im.data[i+1]=im.data[i+2]=v*line; im.data[i+3]=(y%3===0)?26:13; }
    g.putImageData(im,0,0); document.body.style.setProperty('--tvn','url('+c.toDataURL()+')'); }
  CAMC.el={box:document.getElementById('camc'), bar:document.getElementById('camcB'), pct:document.getElementById('camcP'),
           msg:document.getElementById('camcM'), vf:document.getElementById('camcVF'), day:document.getElementById('camcD')};
}
/* UI 도 테이프 화질로 — 캠코더가 켜져 있으면 body 에 camc 를 붙인다(css/game.css 끝의 'body.camc' 묶음) */
function camcBody(on){ if(CAMC._body!==on){ CAMC._body=on; document.body.classList.toggle('camc',on); } }
camcBody(CAMC.on&&CAMC.lines>0);
/* 그리기 전에 — 캠코더가 켜져 있으면 그림판을 물리고 true 를 돌려준다(renderFrame 이 부른다) */
function camcBegin(){
  const show=!!(CAMC.on&&CAMC.lines);
  if(show!==CAMC.cls||CAMC.noise!==CAMC.ncls){ CAMC.cls=show; CAMC.ncls=CAMC.noise;       // CCTV 글씨(game.css) — 시작 화면에서도
    document.body.classList.toggle('camc-on',show); document.body.classList.toggle('camc-noise',show&&CAMC.noise>0); }
  if(!show) return false;
  if(!CAMC.mat) camcInit();
  const cw=renderer.domElement.width, ch=renderer.domElement.height;
  const h=Math.min(CAMC.lines,ch), w=Math.max(64,Math.min(1600,Math.round(h*cw/ch)));
  if(!CAMC.rt||CAMC.rt.width!==w||CAMC.rt.height!==h){
    if(CAMC.rt) CAMC.rt.dispose();
    CAMC.rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});
    CAMC.mat.uniforms.tD.value=CAMC.rt.texture; CAMC.mat.uniforms.uRes.value.set(w,h);
  }
  renderer.setRenderTarget(CAMC.rt);
  return true;
}
/* 그린 뒤에 — 그림판을 화면에 테이프 화질로 옮긴다 */
function camcEnd(under){
  const U=CAMC.mat.uniforms, G=SKYL.grade;
  CAMC.under+=((under?1:0)-CAMC.under)*0.25;
  U.uT.value=(performance.now()/1000)%1000; U.uBat.value=CAMC.bat/100; U.uUnder.value=CAMC.under;
  U.uLow.value=G.low; U.uMoon.value=G.moon; U.uNight.value=G.night; U.uDay.value=clamp(1-G.night*1.2,0,1); U.uGrain.value=CAMC.noise;
  renderer.setRenderTarget(null);
  renderer.render(CAMC.scene,CAMC.cam);
}
/* 배터리 — 켜 둔 동안 닳고, 손 충전기를 들고 좌클릭을 누르고 있으면 찬다(loop 가 놀이 시간에만 부른다) */
function updateCamcorder(dt){
  if(!CAMC.el) { if(!CAMC.mat) camcInit(); }
  const e=equippedTool(), cranking=!!(e&&e.id==='hand_charger'&&useDown&&!uiOpen()&&!PL.dead);
  if(cranking){
    if(CAMC.bat>=100){ if(CAMC.crank<=0) toast('캠코더 배터리 — 가득 찼다'); CAMC.crank=1.5; }
    else{
      CAMC.bat=Math.min(100,CAMC.bat+CAMC.CRANK*dt);   // 손잡이 돌리기는 기력을 안 쓴다(사용자 요청 — 예전엔 초당 3.5씩 깎였다)
      CAMC.crank-=dt; if(CAMC.crank<=0){ CAMC.crank=0.22; sfx('bind'); }       // 손잡이 돌아가는 소리
      if(typeof weaponFx!=='undefined'&&weaponFx&&weaponFx.userData.spin) weaponFx.userData.spin.rotation.z-=dt*10;
    }
  }else{
    CAMC.crank=Math.max(0,CAMC.crank-dt);
    if(CAMC.on&&CAMC.lines) CAMC.bat=Math.max(0,CAMC.bat-CAMC.DRAIN*dt);
  }
  if(CAMC.bat<15&&!CAMC.warned){ CAMC.warned=true; toast('캠코더 배터리가 얼마 없다 — 손 충전기를 들고 좌클릭을 누르고 있으면 찬다'); }
  if(CAMC.bat>30) CAMC.warned=false;
  // 화면 위의 표시
  const L=CAMC.el, show=CAMC.on&&CAMC.lines>0;
  camcBody(show);
  if(L.box){
    hudS(L.box,'display',show?'flex':'none'); hudS(L.vf,'display',show?'block':'none');
    if(show){
      /* 캠코더의 날짜 찍기 — 표류 며칠째 · 시각(오전/오후 12시간제) */
      const hd=((hourOfDay%24)+24)%24, H=Math.floor(hd), M=Math.floor((hd-H)*60), h12=(H%12)||12;
      hudT(L.day,'표류 '+dayNo()+'일째  '+(H<12?'오전':'오후')+' '+h12+':'+String(M).padStart(2,'0'));
      const p=Math.round(CAMC.bat);
      hudS(L.bar,'width',p+'%'); hudS(L.bar,'background',p>30?'#9fe0b6':(p>15?'#e0c060':'#e0604a'));
      hudT(L.pct,p+'%'+(cranking&&CAMC.bat<100?' ↑':''));
      hudT(L.msg,CAMC.bat<=0?'배터리 없음 — 손 충전기':(CAMC.bat<15?'배터리 부족':''));
      L.box.classList.toggle('low',CAMC.bat<15);
    }
  }
}
