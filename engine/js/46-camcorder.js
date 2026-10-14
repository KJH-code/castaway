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
   ⑤ **다치면 렌즈가 깨진다**(사용자 요청 — 여는 화면의 깨진 금처럼) — 체력이 90% 밑으로 내려가면 맞은 자리 셋에서 차례로 금이 뻗는다
      (`camcCrackTex` — 금 그림 한 장 · `CAMC.hurt`). 오른쪽 아래 자리가 먼저(체력 90 → 50%), 왼쪽 위(65 → 25%), 아래 가운데(45 → 10%).
      금은 맞은 자리에서 둘레로 자라나고(셰이더가 거리로 드러낸다) 체력이 차면 도로 줄어든다. 금 둘레는 색이 크게 갈라지고 유리 조각마다
      화면이 조금씩 어긋난다(조각 그림 `CAMC.shd` — 경계가 곧 금) · 뒤에 맞은 자리의 금은 먼저 난 금에서 멈춘다 · 맞은 자리는 잘게 부서져 있다(보로노이).
      **지직거림**도 체력을 따라 심해진다 — ntsc-rs(MIT)의 식을 옮겼다: 가로 줄무늬 눈 · 맨 아래 줄의 헤드 스위칭 · 아래쪽 트래킹 띠 ·
      가장자리 물결 · 깜빡임, 맞는 순간(`hurtFlash`)엔 줄 묶음이 찢기고 세로로 튄다.
   ========================================================================== */
const CAMC={on:true, lines:480, rt:null, scene:null, cam:null, mat:null,
            bat:100, DRAIN:100/(14*60), CRANK:6.5, crank:0, under:0, warned:false, el:null,
            health:1, li:false, hsaid:0,           // 전지의 늙음(1 새것 → 채울수록 준다) · 리튬이온으로 갈았나
            noise:1, hurt:0, crk:null, tPrev:0};    // 화면 잡음(0 끔 · 1 보통 · 2 짙게) — 설정 · 프리셋 · hurt 렌즈 깨짐(0~1) · crk 금 그림
const CAMC_LINES=[0,360,480,720];                   // 설정 칸의 0~3 → 줄 수(0 = 끄기)
/* 깨진 렌즈의 금 — 1024×512 두 장. ① 금(`CAMC.crk`): 맞은 자리 셋의 금을 빨강·초록·파랑 칸에 따로(셰이더가 자리마다 따로 드러낸다),
   알파 칸에는 금 둘레 번짐(색이 갈라지는 너비). ② 조각(`CAMC.shd`): 금으로 둘러싸인 유리 조각마다 값 하나(자리마다 한 칸 · 0 은 조각 아님) —
   셰이더가 조각마다 화면을 따로 어긋나게 하고 밝기를 달리한다(경계가 곧 금이라 금을 사이에 두고 어긋난다).
   실제 유리처럼(NIST·SWGMAT 유리 파괴 지침): 맞은 자리에서 **방사형 금**이 뻗고 그 둘레를 **동심원 금**이 돈다 · **뒤에 맞은 자리의 금은
   먼저 난 금에서 멈춘다**(`occ` — 앞 자리들의 금이 지나간 화소) · 맞은 자리는 잘게 부서져 있다(셰이더의 보로노이 — 아래).
   맞은 자리(가로 · 아래에서 높이 — 그림 좌표)는 CAMC_HIT 하나를 그림과 셰이더가 같이 쓴다. 여는 화면(91-title.js)의 금과 같은 식으로 긋는다 */
const CAMC_HIT=[[0.70,0.34,12,0.36,0.60],[0.27,0.68,10,0.20,0.44],[0.42,0.20,9,0.15,0.34]];   // [가로, 아래에서 높이, 금 수, 짧은·긴 금 길이(너비 몫)]
function camcCrackTex(){
  const W=1024, H=512, mk=()=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d'); g.fillStyle='#000'; g.fillRect(0,0,W,H); return [c,g]; };
  const occ=new Uint8Array(W*H), occAt=(x,y)=>{ const i=Math.round(x), j=Math.round(y); return i>=0&&j>=0&&i<W&&j<H&&occ[j*W+i]===1; };
  const occMark=(pts,r)=>{ for(let i=0;i<pts.length-1;i++){ const p=pts[i], q=pts[i+1], n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1]))+1;
    for(let k=0;k<=n;k++){ const x=Math.round(p[0]+(q[0]-p[0])*k/n), y=Math.round(p[1]+(q[1]-p[1])*k/n);
      for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const X=x+dx, Y=y+dy; if(X>=0&&Y>=0&&X<W&&Y<H) occ[Y*W+X]=1; } } } };
  /* 앞 자리의 금에 닿으면 거기서 멈춘다(맞은 자리 둘레 4 화소는 안 본다) — 멈췄으면 .stop */
  const clip=(pts,k)=>{ if(!k) return pts; const o=[pts[0]];
    for(let i=1;i<pts.length;i++){ const p=o[o.length-1], q=pts[i], L=Math.hypot(q[0]-p[0],q[1]-p[1]), n=Math.max(1,Math.ceil(L/1.5));
      for(let s=1;s<=n;s++){ const x=p[0]+(q[0]-p[0])*s/n, y=p[1]+(q[1]-p[1])*s/n;
        if(Math.hypot(x-pts[0][0],y-pts[0][1])>4&&occAt(x,y)){ o.push([x,y]); o.stop=true; return o; } }
      o.push(q); }
    return o; };
  const [hc,hg]=mk(), ch=[], sh=[];
  CAMC_HIT.forEach(([hx,hy,nr,l0,l1],k)=>{
    const [c,f]=mk(), [sc,sg]=mk(), rnd=mulberry32(0x7e1e+k*977), ix=hx*W, iy=hy*H, rays=[];
    for(let i=0;i<nr;i++){ const big=i%3===0, a=i/nr*6.283+rnd()*0.45, L=W*(big?l1*(0.75+rnd()*0.25):l0*(0.5+rnd()*0.5)), n=8; let pts=[[ix,iy]], x=ix,y=iy,aa=a;
      for(let s=0;s<n;s++){ aa+=(rnd()-0.5)*0.40; x+=Math.cos(aa)*L/n; y+=Math.sin(aa)*L/n; pts.push([x,y]); }
      pts=clip(pts,k); pts.big=big; rays.push(pts); }
    const seg=(pts,w0,a0)=>{ const n=pts.length-1; f.lineCap='round'; hg.lineCap='round';
      for(let i=0;i<n;i++){ const t=i/n, w=w0*Math.pow(1-t,0.55)+0.6, al=a0*(1-0.7*t), p=pts[i], q=pts[i+1];
        f.strokeStyle='rgba(255,255,255,'+(0.20*al).toFixed(3)+')'; f.lineWidth=w*3.5; f.beginPath(); f.moveTo(p[0],p[1]); f.lineTo(q[0],q[1]); f.stroke();
        f.strokeStyle='rgba(255,255,255,'+al.toFixed(3)+')'; f.lineWidth=w; f.beginPath(); f.moveTo(p[0],p[1]); f.lineTo(q[0],q[1]); f.stroke();
        hg.strokeStyle='rgba(255,255,255,'+(0.55*al).toFixed(3)+')'; hg.lineWidth=w*9+8; hg.beginPath(); hg.moveTo(p[0],p[1]); hg.lineTo(q[0],q[1]); hg.stroke(); } };
    for(const pts of rays) seg(pts,pts.big?2.6:1.5,0.95);
    /* 둘레를 도는 동심원 금 — 이웃한 두 금의 같은 마디를 잇는다. 끝까지 이어진 것만 조각의 경계가 된다(ring[i][r] = 가운데 점) */
    const ring=rays.map(()=>[]), rings=[];
    for(let r=1;r<=4;r++) for(let i=0;i<rays.length;i++){ const A=rays[i], B=rays[(i+1)%rays.length]; if(rnd()<0.3||A.length<=r||B.length<=r) continue;
      const p=A[r], q=B[r], m=[(p[0]+q[0])/2+(rnd()-0.5)*8,(p[1]+q[1])/2+(rnd()-0.5)*8], pts=clip([p,m,q],k);
      seg(pts,1.0,0.75-r*0.12); rings.push(pts); if(!pts.stop) ring[i][r]=m; }
    const g0=f.createRadialGradient(ix,iy,0,ix,iy,W*0.035); g0.addColorStop(0,'rgba(255,255,255,.75)'); g0.addColorStop(1,'rgba(255,255,255,0)');   // 맞은 자리 — 하얗게 부서진 점
    f.fillStyle=g0; f.beginPath(); f.arc(ix,iy,W*0.035,0,6.283); f.fill();
    /* 조각 — 이웃한 두 금 사이를 동심원 금으로 끊어 칸마다 다른 값으로 채운다(바깥 칸은 두 금 끝을 곧게 이어 닫는다) */
    const poly=(P,v)=>{ if(P.length<3) return; sg.fillStyle='rgb('+v+','+v+','+v+')'; sg.beginPath(); sg.moveTo(P[0][0],P[0][1]); for(const q of P) sg.lineTo(q[0],q[1]); sg.closePath(); sg.fill(); };
    for(let i=0;i<rays.length;i++){ const A=rays[i], B=rays[(i+1)%rays.length], top=Math.min(A.length,B.length)-1;
      const lv=[0]; for(let r=1;r<=4&&r<=top;r++) if(ring[i][r]) lv.push(r);
      for(let j=0;j<lv.length;j++){ const a=lv[j], b=j+1<lv.length?lv[j+1]:-1, P=[];
        if(b>0){ P.push(...A.slice(a,b+1),ring[i][b],...B.slice(a,b+1).reverse()); }
        else{ P.push(...A.slice(a),...B.slice(a).reverse()); }
        if(a>0) P.push(ring[i][a]);
        poly(P,1+Math.floor(rnd()*254)); } }
    ch.push(f.getImageData(0,0,W,H).data); sh.push(sg.getImageData(0,0,W,H).data);
    for(const pts of rays) occMark(pts,1); for(const pts of rings) occMark(pts,1);   // 다음 자리의 금은 여기서 멈춘다
  });
  /* 번짐은 굵게 그은 금을 흐린다 — filter 가 안 되는 브라우저는 굵은 줄 그대로 */
  const [bc,bg]=mk(); try{ bg.filter='blur(9px)'; }catch(e){} bg.drawImage(hc,0,0); try{ bg.filter='none'; }catch(e){}
  const hb=bg.getImageData(0,0,W,H).data, d=new Uint8Array(W*H*4), e=new Uint8Array(W*H*4);
  for(let i=0;i<W*H;i++){ d[i*4]=ch[0][i*4]; d[i*4+1]=ch[1][i*4]; d[i*4+2]=ch[2][i*4]; d[i*4+3]=hb[i*4];
    e[i*4]=sh[0][i*4]; e[i*4+1]=sh[1][i*4]; e[i*4+2]=sh[2][i*4]; e[i*4+3]=255; }
  const T=new THREE.DataTexture(d,W,H,THREE.RGBAFormat); T.minFilter=T.magFilter=THREE.LinearFilter; T.needsUpdate=true;   // 줄 0 = 캔버스 맨 위 = 셰이더 v 0(화면 아래) — CAMC_HIT 의 높이가 '아래에서'인 까닭
  const S=new THREE.DataTexture(e,W,H,THREE.RGBAFormat); S.minFilter=S.magFilter=THREE.NearestFilter; S.needsUpdate=true;      // 조각 값은 섞이면 안 된다
  CAMC.shd=S;
  return T;
}
function camcInit(){
  CAMC.scene=new THREE.Scene(); CAMC.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  CAMC.crk=camcCrackTex();
  CAMC.mat=new THREE.ShaderMaterial({
    depthTest:false, depthWrite:false, fog:false,
    uniforms:{tD:{value:null}, uRes:{value:new THREE.Vector2(640,480)}, uT:{value:0}, uBat:{value:1}, uUnder:{value:0},
              uLow:{value:0}, uMoon:{value:0}, uNight:{value:0}, uDay:{value:1}, uGrain:{value:1}, uHdr:{value:0}, uIll:{value:0},
              tCrk:{value:CAMC.crk}, tShd:{value:CAMC.shd}, uHurt:{value:0}, uHit:{value:0}, uAsp:{value:16/9}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader:`
      precision highp float;
      uniform sampler2D tD, tCrk, tShd; uniform vec2 uRes; uniform float uT,uBat,uUnder,uLow,uMoon,uNight,uDay,uGrain,uHdr,uIll,uHurt,uHit,uAsp;
      varying vec2 vUv;
      float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float vn1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); return mix(h21(vec2(i,0.37)),h21(vec2(i+1.0,0.37)),f)*2.0-1.0; }   // 1차원 값잡음(−1~1)
      /* 보로노이 칸 경계까지의 거리 · 칸 번호 — Inigo Quilez 의 'voronoi lines'(두 번 훑기 · MIT, © 2013 Inigo Quilez) 를 옮겼다.
         맞은 자리의 잘게 부서진 유리 */
      vec2 hh2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
      vec3 vorB(vec2 x){
        vec2 n=floor(x), f=fract(x), mg=vec2(0.0), mr=vec2(0.0); float md=8.0;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)), r=g+hh2(n+g)-f; float d=dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
        md=8.0;
        for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g=mg+vec2(float(i),float(j)), r=g+hh2(n+g)-f;
          if(dot(mr-r,mr-r)>0.00001) md=min(md,dot(0.5*(mr+r),normalize(r-mr))); }
        return vec3(md,n+mg); }
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
        /* **깨진 렌즈**(위 ⑤) — 금 그림은 화면 세로에 맞춰 읽는다(가로는 화면 비율만큼 — 금이 늘어나지 않게).
           맞은 자리마다 금이 드러나는 반지름이 체력을 따라 자란다(거리는 세로 단위 — 가로 ×2) */
        vec2 tc=vec2(0.5+(uv.x-0.5)*uAsp*0.5,uv.y);
        vec2 C1=vec2(${CAMC_HIT[0][0]},${CAMC_HIT[0][1]}), C2=vec2(${CAMC_HIT[1][0]},${CAMC_HIT[1][1]}), C3=vec2(${CAMC_HIT[2][0]},${CAMC_HIT[2][1]});
        vec2 e1=(tc-C1)*vec2(2.0,1.0), e2=(tc-C2)*vec2(2.0,1.0), e3=(tc-C3)*vec2(2.0,1.0);
        vec3 dI=vec3(length(e1),length(e2),length(e3));
        vec3 rI=vec3(smoothstep(0.0,0.5,uHurt)*1.5, smoothstep(0.32,0.82,uHurt)*1.05, smoothstep(0.58,0.95,uHurt)*0.85);
        vec3 mI=1.0-smoothstep(rI-0.06,rI,dI);                                // 금이 드러난 곳(자라나는 끝은 부드럽게)
        vec4 ck=texture2D(tCrk,tc), ckS=texture2D(tCrk,tc+vec2(0.0016,-0.0032));   // 금 · 그 오른쪽 아래의 그늘
        float crk=max(max(ck.r*mI.x,ck.g*mI.y),ck.b*mI.z), crkS=max(max(ckS.r*mI.x,ckS.g*mI.y),ckS.b*mI.z);
        float hz=ck.a*max(max(mI.x,mI.y),mI.z);                              // 금 둘레(번짐) — 색이 갈라지고 조각이 어긋난다
        /* 유리 조각(tShd — 경계가 곧 금) — 조각마다 화면을 조금씩 다른 쪽으로 밀고 밝기를 달리한다. 맞은 자리에 가까울수록 크다 */
        vec3 nk=vec3(1.0)-smoothstep(vec3(0.0),vec3(0.9,0.7,0.55),dI);
        vec3 sd=texture2D(tShd,tc).rgb, sm=step(vec3(0.002),sd)*mI;
        vec2 so=vec2(0.0); float sb=0.0;
        so+=vec2(cos(sd.x*43.0),sin(sd.x*43.0))*sm.x*(0.0012+0.0050*nk.x); sb+=(fract(sd.x*17.3)-0.5)*sm.x;
        so+=vec2(cos(sd.y*43.0),sin(sd.y*43.0))*sm.y*(0.0012+0.0050*nk.y); sb+=(fract(sd.y*17.3)-0.5)*sm.y;
        so+=vec2(cos(sd.z*43.0),sin(sd.z*43.0))*sm.z*(0.0012+0.0050*nk.z); sb+=(fract(sd.z*17.3)-0.5)*sm.z;
        uv+=so*smoothstep(0.0,0.15,uHurt);
        /* 맞은 자리는 잘게 부서져 있다 — 가장 가까운 드러난 자리 둘레(0.12·0.09·0.08)를 보로노이 조각으로 쪼개 조각마다 어긋나게 한다 */
        float cz=0.0, cl=0.0, cc=0.0; vec2 ce=vec2(0.0);
        if(mI.x>0.0&&dI.x<0.12){ ce=e1; cz=mI.x*(1.0-smoothstep(0.05,0.12,dI.x)); }
        else if(mI.y>0.0&&dI.y<0.09){ ce=e2+3.7; cz=mI.y*(1.0-smoothstep(0.035,0.09,dI.y)); }
        else if(mI.z>0.0&&dI.z<0.08){ ce=e3+7.1; cz=mI.z*(1.0-smoothstep(0.03,0.08,dI.z)); }
        if(cz>0.0){ vec3 vb=vorB(ce*42.0); cl=(1.0-smoothstep(0.02,0.07,vb.x))*cz; cc=h21(vb.yz);
          uv+=(vec2(h21(vb.yz+1.3),h21(vb.yz+7.1))-0.5)*0.010*cz; }
        /* 지직거림의 세기 — 체력 + 맞는 순간 */
        float S=uHurt*0.75+uHit, fr=floor(uT*30.0), rb=floor(uv.y*uRes.y);      // rb — 아래에서 몇째 줄(그림판 줄)
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
        col=mix(vec3(Y),col,0.94)*0.95+0.028;                                  // 싼 센서 — 검정이 살짝 뜬다
        /* 금을 긋는다 — 조각마다 밝기가 조금 다르고(조각마다 빛을 받는 각이 다르다) · 오른쪽 아래로 그늘 · 가운데 흰 날 · 둘레에 엷은 빛 ·
           맞은 자리의 부서진 조각은 잔금이 촘촘하고 몇 조각은 뿌옇게 하얗다 */
        col*=1.0+sb*0.10*smoothstep(0.0,0.15,uHurt);
        col*=1.0-0.55*crkS;
        col=mix(col,vec3(0.94),crk*0.85)+hz*0.035;
        col=mix(col,vec3(0.82),step(0.64,cc)*0.32*cz);
        col=mix(col,vec3(0.95),cl*0.75);
        col+=hsT;                                                              // 헤드 스위칭 자리의 밝은 끌림
        float n=h21(uv*uRes+uT*61.0)-0.5;
        /* 흰 잡음 — 화면 화소마다(그림판 화소가 아니라) 새로 뽑아 잘게 지직거린다. 어두울수록 · 배터리가 약할수록 심하다.
           세기는 설정의 '화면 잡음'(uGrain 0 · 1 · 2). 여기서 같이 하므로 따로 드는 값이 없다 */
        float n2=h21(gl_FragCoord.xy+fract(uT*7.13)*311.0)-0.5;
        col+=(n*0.6+n2*0.9)*(0.050+0.09*uNight)*uGrain+n*0.30*weak+n2*0.26*S;   // 다칠수록 알갱이가 거칠다(화면 잡음을 꺼도)
        /* 눈 — 늘 조금(화면 잡음 설정 따라) · 다칠수록·맞는 순간 짙게 · 트래킹 띠 안은 아래로 갈수록 제곱으로 짙게. 밝기(Y)에 더하고
           빨강·파랑이 반대로 조금 흔들려 무지갯빛 테가 진다(원본은 합성 신호에 더해 색 신호까지 번진다) */
        { float x=uv.x*uRes.x, sn=snowRow(x,rb,fr,0.0015*uGrain+0.045*S+0.10*uHit,0.5)+snowRow(x,rb,fr+0.5,(0.025+0.20*S)*tk*tk,0.25);
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
  U.uT.value=(performance.now()/1000)%1000; U.uBat.value=CAMC.bat/100; U.uUnder.value=CAMC.under;
  U.uIll.value+=((PL.ill>0?clamp(PL.ill/6,0,1):0)-U.uIll.value)*0.06;      // 탈 — 서서히 물들고 서서히 걷힌다
  U.uLow.value=G.low; U.uMoon.value=G.moon; U.uNight.value=G.night; U.uDay.value=clamp(1-G.night*1.2,0,1); U.uGrain.value=CAMC.noise;
  /* 깨진 렌즈 — 체력 90% 밑에서 금이 생겨 10% 에서 다 퍼진다. 맞으면 금이 0.3초쯤에 걸쳐 뻗고, 체력이 차면 천천히 줄어든다 */
  { const now=performance.now(), dt=Math.min(0.1,(now-(CAMC.tPrev||now))/1000); CAMC.tPrev=now;
    const want=PL.dead?1:clamp((0.9-PL.hp/HPMAX)/0.8,0,1);
    CAMC.hurt+=(want-CAMC.hurt)*(1-Math.exp(-dt*(want>CAMC.hurt?9:1.5)));
    U.uHurt.value=CAMC.hurt; U.uHit.value=Math.min(1,hurtFlash*1.4);
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
