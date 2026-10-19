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
   ⑤ **다치면 화면 가장자리부터 어두워진다**(사용자 요청 — 예전의 깨진 렌즈 금 대신) — 체력이 90% 밑이면 가장자리에서 어둠이
      부드럽게(그러데이션) 번져 들어오고 체력이 낮을수록 가운데로 조여 든다. 그 어둠 띠 안에는 가는 줄이 가운데를 향해 흘러든다.
      맞는 순간 한꺼번에 조여 들고 체력이 차면 아주 천천히(25초쯤) 물러난다(`CAMC.hurt`).
      **지직거림**도 체력을 따라 심해진다 — ntsc-rs(MIT)의 식을 옮겼다: 가로 줄무늬 눈 · 맨 아래 줄의 헤드 스위칭 · 아래쪽 트래킹 띠 ·
      가장자리 물결 · 깜빡임, 맞는 순간(`hurtFlash`)엔 줄 묶음이 찢기고 세로로 튄다.
   ========================================================================== */
const CAMC={on:true, lines:480, rt:null, scene:null, cam:null, mat:null,
            bat:100, DRAIN:100/(14*60), CRANK:6.5, crank:0, under:0, warned:false, el:null,
            health:1, li:false, hsaid:0,           // 전지의 늙음(1 새것 → 채울수록 준다) · 리튬이온으로 갈았나
            noise:1, hurt:0, tPrev:0};    // 화면 잡음(0 끔 · 1 보통 · 2 짙게) — 설정 · 프리셋 · hurt 다친 정도(0~1 · 가장자리 어둠) 금 그림
const CAMC_LINES=[0,360,480,720];                   // 설정 칸의 0~3 → 줄 수(0 = 끄기)
function camcInit(){
  CAMC.scene=new THREE.Scene(); CAMC.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  CAMC.mat=new THREE.ShaderMaterial({
    depthTest:false, depthWrite:false, fog:false,
    uniforms:{tD:{value:null}, uRes:{value:new THREE.Vector2(640,480)}, uT:{value:0}, uBat:{value:1}, uUnder:{value:0},
              uLow:{value:0}, uMoon:{value:0}, uNight:{value:0}, uDay:{value:1}, uGrain:{value:1}, uHdr:{value:0}, uIll:{value:0},
              uHurt:{value:0}, uHurtN:{value:0}, uHit:{value:0}, uAsp:{value:16/9}, uWet:{value:0}, uDive:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader:`
      precision highp float;
      uniform sampler2D tD; uniform vec2 uRes; uniform float uT,uBat,uUnder,uLow,uMoon,uNight,uDay,uGrain,uHdr,uIll,uHurt,uHurtN,uHit,uAsp,uWet,uDive;
      varying vec2 vUv;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float vn1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(h21(vec2(i,0.37)),h21(vec2(i+1.0,0.37)),f)*2.0-1.0; }   // 1차원 값잡음(−1~1)
      /* **눈(snow)** — ntsc-rs(MIT, © valadaptive)의 'row_speckles' 를 셰이더로 옮겼다. 점이 아니라 8~64 화소짜리 **가로 줄무늬**가
         시작점에서 cos 로 출렁이며 (1−x/길이)² 로 사그라든다. 줄마다 세기가 다르고(퍼짐 an 이 크면 몰린 줄·빈 줄이 갈린다 — 로지스틱),
         줄 위의 자리는 64 화소 칸마다 '하나 이상 생길 확률'로 뽑는다(원본은 기하분포로 다음 자리까지 건너뛴다) */
      float snowRow(float x,float row,float fr,float I,float an){
        if(I<=0.0) return 0.0;
        float rr=h21(vec2(row,fr*1.7+0.3)), lf=exp((rr-I)/max(1e-4,I*(1.0-I)*(1.0-an)));
        float li=clamp((an/(1.0+lf)+I*(1.0-an))*0.125,0.0,1.0), pc=1.0-exp(-li*64.0), s=0.0;
        for(int k=0;k<2;k++){ float cx=floor(x/64.0)-float(k); vec2 sd=vec2(cx,row)+fr*vec2(3.17,1.31);
          if(h21(sd)<pc){ float st=(cx+h21(sd+0.5))*64.0, ln=mix(8.0,64.0,h21(sd+1.7)), fq=ln*mix(3.0,5.0,h21(sd+2.9)), xx=x-st;
            if(xx>=0.0&&xx<ln){ float q=1.0-xx/ln; s+=cos(3.14159*xx/fq)*q*q*mix(-1.0,2.0,h21(sd+4.3)); } } }
        return s; }
      void main(){
        vec2 c=vUv-0.5, uv=0.5+c*(1.0+0.045*dot(c,c));                     // 렌즈 — 가장자리가 살짝 볼록하다
        float weak=smoothstep(0.15,0.0,uBat), dead=smoothstep(0.012,0.0,uBat);
        float hz=0.0;                                                          // (예전 금 둘레의 색 갈라짐 — 금을 걷어 0)
        /* 지직거림의 세기 — 체력 + 맞는 순간 */
        /* 가장자리 띠(위 ⑤) — 어둠과 흰 줄이 이 띠 안에만 든다. 체력이 낮을수록 안쪽 테두리(rinE)가 가운데로 조여 든다 */
        vec2 cvE=(uv-0.5)*vec2(uAsp,1.0); float rrE=length(cvE), rinE=mix(1.0,0.12,uHurt), edgeK=smoothstep(rinE-0.25,rinE+0.30,rrE);
        float S=(uHurtN*0.75)*mix(1.0,edgeK,step(0.001,uHurt))+uHit, fr=floor(uT*30.0), rb=floor(uv.y*uRes.y);     // rb — 아래에서 몇째 줄 · 지직거림은 **지금 체력**을 따른다(금은 천천히 옅어지지만 줄무늬는 체력이 차면 바로 걷힌다)
        /* **헤드 스위칭**(ntsc-rs 'head_switching') — 맨 아래 몇 줄이 옆으로 밀린다. 아래로 갈수록 (k)^1.5 로 크게 · 줄마다 ±0.5 화소 흔들림 ·
           맨 윗줄은 가운데 어디쯤부터만 밀리고 그 자리에 밝은 끌림이 남는다 */
        float hsN=floor(2.0+10.0*S), hsT=0.0;
        if(S>0.02&&rb<hsN){ float k=(hsN-rb)/hsN, shp=uRes.x*0.11*S*pow(k,1.5)+(h21(vec2(rb,fr))-0.5);
          if(rb>=hsN-1.0){ float mp=0.5+(h21(vec2(fr,9.1))+h21(vec2(fr,3.3))-1.0)*0.25, xp=uv.x-mp;
            if(xp>0.0){ uv.x-=shp/uRes.x; hsT=pow(max(0.0,1.0-xp*uRes.x/16.0),3.0)*(h21(vec2(fr,5.5))+0.5)*0.5; } }
          else uv.x-=shp/uRes.x; }
        /* **트래킹 잡음**(ntsc-rs 'tracking_noise') — 아래쪽 띠가 물결치며 밀리고(띠 맨 아래가 가장 세다) 눈·잡음이 제곱으로 짙어진다 */
        float tnN=floor(26.0*S+36.0*uHit), tk=0.0;
        if(rb<tnN){ tk=(tnN-rb)/tnN; uv.x+=vn1(rb*0.5+fr*0.37)*tk*(15.0+30.0*S)*0.25/uRes.x; }
        /* **가장자리 물결**(ntsc-rs 'vhs_edge_wave') — 줄마다 부드러운 잡음만큼 화면 전체가 옆으로 흔들린다 */
        uv.x+=(vn1(uv.y*uRes.y*0.08+uT*6.0)*0.7+vn1(uv.y*uRes.y*0.19-uT*9.0)*0.3)*2.6*S/uRes.x;
        { float blk=floor(uv.y*uRes.y/7.0), ft=floor(uT*16.0);                 // 맞는 순간 — 줄 묶음이 옆으로 찢긴다
          if(h21(vec2(blk,ft))<0.10*uHit) uv.x+=(h21(vec2(blk,ft+3.1))-0.5)*0.07*uHit; }
        uv.y+=uHit*0.018*(h21(vec2(floor(uT*30.0),5.0))-0.5);                 // 맞는 순간 — 세로로 튄다
        uv+=uUnder*vec2(sin(uv.y*17.0+uT*1.7),cos(uv.x*13.0+uT*1.3))*0.0045;   // 물속 — 일렁인다
        uv+=uIll*vec2(sin(uv.y*7.0+uT*1.1),cos(uv.x*5.0+uT*0.8))*0.0060;        // 탈이 났다 — 눈앞이 느리게 출렁인다
        /* **물에 들고 날 때**(사용자 요청 — 서브노티카처럼) ─────────────────────────────────────
           · 들어갈 때(uDive 1 → 0 · 0.9초): 렌즈가 크게 일렁이고 하얀 물거품이 번쩍 · 거품 방울이 위로 오른다(아래 색 단계)
           · 나올 때(uWet 1 → 0 · 3.2초): 처음엔 물막이 통째로 흘러내리고(물결 굴절) · 렌즈에 맺힌 물방울(작은 것 · 큰 것)이 뒤의 그림을
             거꾸로 비추고(볼록렌즈 굴절) 테가 어둡다 · 큰 방울 몇은 줄을 남기며 흘러내린다 · 방울은 하나씩 마르며 사라진다 */
        float wDk=0.0, wHi=0.0; vec2 uvW=uv;
        if(uDive>0.001) uv+=vec2(sin(uv.y*38.0+uT*21.0),cos(uv.x*31.0-uT*17.0))*0.016*uDive*uDive;
        if(uWet>0.001){
          vec2 q=vec2(uv.x*uAsp,uv.y);
          float film=smoothstep(0.70,1.0,uWet), fy=1.0-(1.0-uWet)/0.30;            // 물막 — 위에서 아래로 쓸려 내려간다
          uv+=vec2(sin(q.y*26.0+q.x*5.0+uT*7.0),cos(q.x*19.0-uT*6.0))*0.010*film*smoothstep(fy-0.25,fy,q.y);
          for(int L=0;L<2;L++){                                                    // 맺힌 방울 — 두 겹(잘고 많은 것 · 크고 드문 것)
            float cs=L==0?0.045:0.095; vec2 g=q/cs, id=floor(g), f=fract(g)-0.5;
            float live=h21(id+vec2(9.1,float(L)*7.0));
            if(live<uWet*(L==0?0.55:0.50)){
              vec2 c=(vec2(h21(id+vec2(1.3,float(L))),h21(id+vec2(4.7,float(L))))-0.5)*0.55;
              float rr=(L==0?0.16:0.22)+0.16*h21(id+vec2(2.2,float(L)*3.0));
              rr*=0.55+0.45*smoothstep(live,live+0.25,uWet);                      // 마르며 작아진다
              vec2 e=(f-c)/vec2(1.0,1.15); float d=length(e);
              if(d<rr){ vec2 nn=e/rr; float z=sqrt(max(0.0,1.0-dot(nn,nn)));
                uv-=nn*(1.0-z*0.6)*rr*cs*1.6/vec2(uAsp,1.0);                       // 볼록렌즈 — 둘레가 크게 꺾인다
                wDk+=smoothstep(rr*0.70,rr,d)*0.35; wHi+=pow(max(0.0,dot(nn,vec2(-0.6,0.75))),6.0)*z*0.5; } } }
          /* 흘러내리는 큰 방울 — 세로 칸마다 하나 · 지나간 자리에 가는 물줄기 */
          { float cw=0.07, col_=floor(q.x/cw), fx=fract(q.x/cw)-0.5, r1=h21(vec2(col_,3.3)), r2=h21(vec2(col_,8.8));
            if(r1<0.45){ float y0=0.55+0.5*r2, dy=y0-(1.0-uWet)*(0.6+1.4*r1), wob=0.12*sin(q.y*40.0+r2*9.0);
              float dd=length(vec2((fx-wob*0.3)/0.30,(q.y-dy)/(cw*0.55))), trail=(1.0-smoothstep(0.05,0.13,abs(fx-wob*0.3)))*step(dy,q.y)*step(q.y,y0)*0.6;
              if(dd<1.0){ uv.y+=(1.0-dd)*0.035; wDk+=smoothstep(0.7,1.0,dd)*0.3; wHi+=(1.0-dd)*0.25; }
              uv.x+=trail*0.004*sin(q.y*90.0); wDk+=trail*0.05; } }
        }
        if(uvW.x>0.0&&uvW.x<1.0&&uvW.y>0.0&&uvW.y<1.0) uv=clamp(uv,0.002,0.998);   // 물 굴절로 화면 밖을 읽어 테가 검게 일렁이지 않게
        float ln=floor(uv.y*uRes.y);
        float jit=(h21(vec2(ln,floor(uT*24.0)))-0.5)*0.0011*(1.0+9.0*weak);    // 테이프 — 줄마다 살짝 밀린다
        float band=fract(uv.y*0.9-uT*0.07);                                    // 천천히 내려오는 트래킹 띠
        jit+=smoothstep(0.985,1.0,band)*0.004*(0.3+weak*3.0);
        uv.x+=jit;
        float px=1.0/uRes.x, spl=2.4+hz*14.0+uHit*9.0*h21(vec2(floor(uT*20.0),2.0));   // 금 둘레·맞는 순간엔 색이 크게 갈라진다
        vec3 a=texture2D(tD,uv).rgb, l=texture2D(tD,uv-vec2(px*spl,0.0)).rgb, r=texture2D(tD,uv+vec2(px*spl,0.0)).rgb;   // 색 번짐 — 사용자 요청으로 1.7 → 2.4 화소
        vec3 col=vec3(l.r*0.55+a.r*0.45, a.g*0.64+0.18*(l.g+r.g), r.b*0.55+a.b*0.45);   // 색 번짐 — 빨강·파랑이 옆으로 어긋난다
        if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) col=vec3(0.0);
        /* **밝은 데의 어깨** — 그림판이 반정밀 실수(uHdr)면 1 을 넘는 볕(한낮의 흰 바위·모래·물비늘)이 잘리지 않고 들어온다.
           0.80 까지는 그대로 두고 그 위를 1.0 으로 서서히 눕힌다 — 하얗게 뭉개지던 면에 결이 남는다. 8비트 그림판이면 손대지 않는다 */
        if(uHdr>0.5) col=mix(col,0.80+0.20*(1.0-exp(-(col-0.80)/0.20)),step(0.80,col));
        float Y=dot(col,vec3(0.299,0.587,0.114));
        /* 색조 — 노을·새벽: 밝은 데는 주황 · 어두운 데는 보라 / 달밤: 푸른빛 */
        col*=mix(vec3(1.0),mix(vec3(0.96,0.78,1.50),vec3(1.22,0.92,0.60),smoothstep(0.14,0.55,Y)),uLow*0.85);
        col*=mix(vec3(1.0),vec3(0.84,0.96,1.24),uMoon*0.70);
        col=mix(col,vec3(Y)*vec3(0.78,0.90,1.16),uNight*0.30);                 // 밤눈은 색을 덜 본다
        /* 가장 어두운 그늘은 **짙은 보라**로 가라앉는다(사용자 요청) — 밝기 0.2 아래에서만, 어두울수록 짙게. 밤에는 화면이 통째로
           어두우니 반만 건다(안 그러면 밤이 온통 보라다) */
        { float shd=(1.0-smoothstep(0.02,0.21,Y))*(1.0-0.5*uNight);
          col=mix(col,col*vec3(0.74,0.52,1.42)+vec3(0.024,0.0,0.056),shd*0.9); }
        /* **탈이 났다**(날것·상한 것을 먹었다 — 사용자 요청) — 화면이 보랏빛으로 물든다. 가장자리가 더 짙다 */
        col=mix(col,vec3(Y)*vec3(0.80,0.52,1.25)+col*vec3(0.30,0.10,0.42)+vec3(0.030,0.0,0.065),uIll*(0.55+0.35*smoothstep(0.15,0.6,length(c))));
        /* 물속 — 청록으로 가라앉고, 낮에는 수면에서 빛줄기가 비껴 내려온다 */
        col=mix(col,col*vec3(0.50,0.92,1.04)+vec3(0.0,0.025,0.04),uUnder*0.65);
        if(uUnder>0.01){
          float x=uv.x*5.0+(uv.y-1.0)*1.1+sin(uT*0.21)*0.6;
          float ray=pow(max(0.0,sin(x*3.1+sin(uT*0.5+x)*0.6))*(0.55+0.45*sin(x*7.7+uT*0.9)),3.0);
          col+=vec3(0.26,0.42,0.40)*ray*smoothstep(0.10,1.0,uv.y)*uUnder*uDay*0.55;
        }
        /* 물에 들 때의 거품 — 처음 번쩍(흰 거품) · 둥근 방울이 위로 올라가며 테가 빛난다 */
        if(uDive>0.001){
          col=mix(col,vec3(0.82,0.93,0.98),pow(uDive,4.0)*0.75);
          vec2 q=vec2(uv.x*uAsp,uv.y);
          for(int L=0;L<2;L++){ float cs=L==0?0.07:0.13; vec2 qq=q+vec2(0.0,-(1.0-uDive)*(L==0?1.3:0.8)); vec2 g=qq/cs, id=floor(g), f=fract(g)-0.5;
            if(h21(id+vec2(5.0,float(L)))<0.32){ vec2 c=(vec2(h21(id+1.7),h21(id+3.9))-0.5)*0.5; float rr=0.12+0.22*h21(id+6.1);
              float d=length(f-c), ring=smoothstep(rr*0.65,rr*0.92,d)*(1.0-smoothstep(rr*0.92,rr,d));
              col+=vec3(0.55,0.75,0.85)*ring*uDive*0.9+vec3(0.9)*smoothstep(rr*0.35,0.0,length(f-c-vec2(-0.3,0.35)*rr))*uDive*0.6; } } }
        col*=1.0-wDk; col+=vec3(0.85,0.92,0.95)*wHi;                          // 맺힌 방울의 테(어둡고) · 반짝임
        col=mix(vec3(Y),col,0.94)*0.95+0.028;                                  // 싼 센서 — 검정이 살짝 뜬다
        /* **가장자리부터 어둠**(위 ⑤ · 사용자 요청) — 체력이 낮을수록 어둠의 안쪽 테두리가 가운데로 조여 든다(그러데이션 0.55 폭).
           어둠 띠 안에서는 가는 줄(방사형)이 가운데를 향해 흘러든다 — 줄마다 굵기·밝기·빠르기가 다르다 */
        if(uHurt>0.001){
          vec2 cv=cvE; float rr=rrE, rin=rinE;
          float dk=smoothstep(rin,rin+0.40,rr);
          float an=atan(cv.y,cv.x)*9.549, li=floor(an), lf=fract(an);                // 원을 60 칸 — 칸마다 줄 하나
          float on=step(0.55,h21(vec2(li,1.7))), w=0.06+0.10*h21(vec2(li,4.3));
          float flow=fract(rr*3.0+uT*(0.35+0.4*h21(vec2(li,8.1))));                   // 바깥에서 안으로(반지름이 줄며) 흐른다
          float ln=on*(1.0-smoothstep(0.0,w,abs(lf-0.5)))*smoothstep(0.0,0.5,flow)*(1.0-flow);
          col*=1.0-0.93*dk;
          col+=vec3(0.55)*ln*dk*(1.0-dk)*1.6*uHurt;
        }
        col+=hsT;                                                              // 헤드 스위칭 자리의 밝은 끌림
        float n=h21(uv*uRes+uT*61.0)-0.5;
        /* 흰 잡음 — 화면 화소마다(그림판 화소가 아니라) 새로 뽑아 잘게 지직거린다. 어두울수록 · 배터리가 약할수록 심하다.
           세기는 설정의 '화면 잡음'(uGrain 0 · 1 · 2). 여기서 같이 하므로 따로 드는 값이 없다 */
        float n2=h21(gl_FragCoord.xy+fract(uT*7.13)*311.0)-0.5;
        col+=n*0.30*weak+n2*0.26*S;   // 다칠수록 · 배터리가 약할수록만 알갱이가 인다(평소의 흰 잡음은 걷었다 — 사용자 요청: 흰 잡음이 너무 세다)
        /* 눈 — 늘 조금(화면 잡음 설정 따라) · 다칠수록·맞는 순간 짙게 · 트래킹 띠 안은 아래로 갈수록 제곱으로 짙게. 밝기(Y)에 더하고
           빨강·파랑이 반대로 조금 흔들려 무지갯빛 테가 진다(원본은 합성 신호에 더해 색 신호까지 번진다) */
        { float x=uv.x*uRes.x, sn=snowRow(x,rb,fr,0.045*S+0.10*uHit,0.5)+snowRow(x,rb,fr+0.5,0.20*S*tk*tk,0.25);   // 평소엔 눈이 없다(다칠 때만)
          col+=vec3(sn)*0.42+vec3(sn,0.0,-sn)*0.06*cos(x*1.9);
          col+=(h21(vec2(floor(x*0.25),rb+fr*3.7))-0.5)*tk*tk*(0.25+0.5*S); }    // 트래킹 띠의 잡음
        col*=1.0-0.35*min(S,1.0)*step(0.86,h21(vec2(floor(uT*12.0),7.0)));     // 깜빡임
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
    /* 반정밀 실수 그림판 — 볕이 1 을 넘어도 안 잘린다(캠코더 셰이더가 어깨로 눕힌다). 실수 그림판에 못 그리는 장치는 예전 8비트 */
    if(CAMC.hdr===undefined) CAMC.hdr=!!(renderer.capabilities.isWebGL2&&(renderer.extensions.get('EXT_color_buffer_float')||renderer.extensions.get('EXT_color_buffer_half_float')));
    CAMC.rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false,
      type:CAMC.hdr?THREE.HalfFloatType:THREE.UnsignedByteType});
    CAMC.mat.uniforms.uHdr.value=CAMC.hdr?1:0;
    CAMC.mat.uniforms.tD.value=CAMC.rt.texture; CAMC.mat.uniforms.uRes.value.set(w,h);
  }
  renderer.setRenderTarget(CAMC.rt);
  return true;
}
/* 그린 뒤에 — 그림판을 화면에 테이프 화질로 옮긴다 */
function camcEnd(under){
  const U=CAMC.mat.uniforms, G=SKYL.grade;
  CAMC.under+=((under?1:0)-CAMC.under)*0.25;
  /* 물에 들고 날 때 — 들면 거품(0.9초) · 나오면 렌즈에 물방울(3.2초) */
  { const now=performance.now(), dt=Math.min(0.1,(now-(CAMC.wT||now))/1000); CAMC.wT=now;
    if(CAMC.wasU!==undefined&&under!==CAMC.wasU){ if(under){ CAMC.dive=1; CAMC.wet=0; } else CAMC.wet=1; }
    CAMC.wasU=under;
    CAMC.dive=Math.max(0,(CAMC.dive||0)-dt/0.9); CAMC.wet=Math.max(0,(CAMC.wet||0)-dt/3.2);
    U.uDive.value=CAMC.dive; U.uWet.value=CAMC.wet; }
  U.uT.value=(performance.now()/1000)%1000; U.uBat.value=CAMC.bat/100; U.uUnder.value=CAMC.under;
  U.uIll.value+=((PL.ill>0?clamp(PL.ill/6,0,1):0)-U.uIll.value)*0.06;      // 탈 — 서서히 물들고 서서히 걷힌다
  U.uLow.value=G.low; U.uMoon.value=G.moon; U.uNight.value=G.night; U.uDay.value=clamp(1-G.night*1.2,0,1); U.uGrain.value=CAMC.noise;
  /* 깨진 렌즈 — 체력 90% 밑에서 금이 생겨 10% 에서 다 퍼진다. 맞으면 금이 0.3초쯤에 걸쳐 뻗고, 체력이 차면 천천히 줄어든다 */
  { const now=performance.now(), dt=Math.min(0.1,(now-(CAMC.tPrev||now))/1000); CAMC.tPrev=now;
    const want=PL.dead?1:clamp((0.9-PL.hp/HPMAX)/0.8,0,1);
    /* 금은 **맞는 순간 한꺼번에** 생기고, 체력이 차도 **아주 천천히**(25초쯤) 옅어진다(사용자 요청). 지직거림(uHurtN)은 지금 체력 그대로 */
    if(want>CAMC.hurt) CAMC.hurt=want; else CAMC.hurt+=(want-CAMC.hurt)*(1-Math.exp(-dt*0.04));
    U.uHurt.value=CAMC.hurt; U.uHurtN.value=PL.dead?0:clamp((0.9-PL.hp/HPMAX)/0.8,0,1); U.uHit.value=Math.min(1,hurtFlash*1.4);
    U.uAsp.value=renderer.domElement.width/Math.max(1,renderer.domElement.height); }
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
      const b0=CAMC.bat;
      CAMC.bat=Math.min(100,CAMC.bat+CAMC.CRANK*dt);   // 손잡이 돌리기는 기력을 안 쓴다(사용자 요청 — 예전엔 초당 3.5씩 깎였다)
      /* **채울수록 전지가 늙는다**(사용자 요청) — 가득 한 번 채울 때마다 쓸 수 있는 시간이 같은 비율(×0.946)로 준다.
         켜 둔 채 지내면 열흘째에 한 시간(처음 14시간의 1/14)을 못 넘긴다: 14·rⁿ = 1 · 그동안 쓴 시간 13/(1−r) = 240시간 → r = 0.946.
         그때가 리튬이온 전지 팩으로 갈아 끼울 때다 — 갈면 새것이 되고, 리튬이온은 한 번에 0.4%만 준다(×0.996) */
      CAMC.health=Math.max(0.04,CAMC.health*Math.pow(CAMC.li?0.996:0.946,(CAMC.bat-b0)/100));
      CAMC.crank-=dt; if(CAMC.crank<=0){ CAMC.crank=0.22; sfx('bind'); }       // 손잡이 돌아가는 소리
      if(typeof weaponFx!=='undefined'&&weaponFx&&weaponFx.userData.spin) weaponFx.userData.spin.rotation.z-=dt*10;
    }
  }else{
    CAMC.crank=Math.max(0,CAMC.crank-dt);
    if(CAMC.on&&CAMC.lines) CAMC.bat=Math.max(0,CAMC.bat-CAMC.DRAIN/CAMC.health*dt);   // 늙은 전지는 그만큼 빨리 닳는다
  }
  if(CAMC.bat<15&&!CAMC.warned){ CAMC.warned=true; toast('캠코더 배터리가 얼마 없다 — 손 충전기를 들고 좌클릭을 누르고 있으면 찬다'); }
  if(CAMC.bat>30) CAMC.warned=false;
  { const hrs=14*CAMC.health, step=hrs<1.2?3:hrs<3.5?2:hrs<7?1:0;       // 전지가 늙어 가는 것을 세 번 알린다(7 · 3.5 · 1.2시간)
    if(step>CAMC.hsaid){ CAMC.hsaid=step;
      toast(step===3?'캠코더 전지가 다 됐다 — 가득 채워도 한 시간 남짓이다. 리튬이온 전지로 전지 팩을 짜서 갈아 끼워야 한다(선반)'
           :'캠코더 전지가 늙어 간다 — 가득 채워도 '+hrs.toFixed(1)+'시간쯤이다'); } }
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
