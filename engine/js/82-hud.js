/* 82-hud.js — CASTAWAY
   화면 표시 — 미니맵 · HUD(안내문·막대) · 성능 창(F3) · 벤치마크
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   11) HUD
   ========================================================================== */
let mapImg=null, mapBase=null, mapBaseProps=null, mapBaseT=0, _mapProps=[], _mapPropsSrc=null, _mapPropsN=-1;
document.getElementById('mSpan').textContent=WORLD+' m';   // 섬을 만들 때마다 다시 적는다(generateWorld — 섬 배율)
function cacheMap(){
  const ctx=document.getElementById('map').getContext('2d');
  const img=ctx.createImageData(N,N), d=img.data, col=new THREE.Color();
  for(let z=0;z<N;z++) for(let x=0;x<N;x++){
    const i=IDX(x,z);
    biomeColorAt(i,col);
    let sh=1;
    if(F.elev[i]>0){
      const hx=F.elev[IDX(clamp(x+1,0,N-1),z)]-F.elev[IDX(clamp(x-1,0,N-1),z)];
      const hz=F.elev[IDX(x,clamp(z+1,0,N-1))]-F.elev[IDX(x,clamp(z-1,0,N-1))];
      sh=clamp(1+(-hx-hz)*0.013,0.55,1.45);
    }
    const o=i*4;
    d[o]=clamp(col.r*255*sh,0,255); d[o+1]=clamp(col.g*255*sh,0,255);
    d[o+2]=clamp(col.b*255*sh,0,255); d[o+3]=255;
  }
  mapImg=img; mapBaseT=-1e9;          // 새 섬이면 바탕을 다시 굽는다
  MAPPINS.length=0; pinAct=-1; pinVer++;   // 핀은 그 섬 것 — 불러오기는 섬을 만든 **뒤에** 핀을 다시 꽂는다(92-save.js)
}
/* ── 지도 핀 ─────────────────────────────────────────────────────────────
   M 으로 지도를 크게 펴면 마우스가 풀린다(uiOpen — 걷기는 된다). 빈 곳 좌클릭 = 핀 꽂기(그 핀을 따라간다) ·
   핀 좌클릭 = 그 핀을 따라가기 · 핀 우클릭 = 뽑기 · M/Esc = 접기.
   따라가는 핀은 나침반 띠에 방향 + 거리로 뜨고(시야 밖이면 띠 끝에 화살), 나머지 핀도 띠에 작은 표로 뜬다.
   자리는 세계 좌표(m)로 적고 저장에 들어간다(92-save.js pins) */
const MAPPINS=[], PIN_COL=['#ff5a4e','#ffc542','#58d0ff','#9dff6a','#e98bff'], PIN_MAX=24;
let mapOpen=false, pinAct=-1, pinVer=0, pinHov=null;
function toggleMap(on){
  mapOpen=on===undefined?!mapOpen:!!on;
  document.getElementById('map').classList.toggle('big',mapOpen);
  document.getElementById('mapw').classList.toggle('open',mapOpen);
  if(!mapOpen) pinHov=null;
  syncLock(); drawMap();
}
/* 지도 캔버스 위 화면 크기(px) — 핀 크기를 화면에서 늘 비슷하게 보이게. clientWidth 를 읽으면 배치를 다시 재므로
   CSS 와 같은 식으로 셈한다(#map · #map.big) */
const mapPx=()=>mapOpen?Math.min(688,innerHeight*0.82):172;
/* 캔버스 점(cx,cz) 아래 핀 — k = 화면 1 px 이 캔버스 몇 px 인가. 머리(꽂힌 점보다 2.1×9 px 위)나 바늘 끝, 가까운 쪽으로 잰다 */
function pinAt(cx,cz,k){
  let best=-1, bd=(12*k)**2;
  MAPPINS.forEach((p,i)=>{
    const dx=p.x/CELL+N/2-cx, dz=p.z/CELL+N/2-cz, hz=dz-2.1*9*k;
    const d=Math.min(dx*dx+hz*hz, dx*dx+dz*dz);
    if(d<bd){ bd=d; best=i; } });
  return best;
}
{
  const mc=document.getElementById('map');
  const at=e=>{ const r=mc.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*N,(e.clientY-r.top)/r.height*N,N/r.width]; };
  mc.addEventListener('mousedown',e=>{
    if(!mapOpen) return;
    e.preventDefault(); e.stopPropagation();
    const [cx,cz,k]=at(e), hit=pinAt(cx,cz,k);
    if(e.button===2){
      if(hit<0) return;
      MAPPINS.splice(hit,1);
      if(pinAct===hit) pinAct=-1; else if(pinAct>hit) pinAct--;
      toast('핀을 뽑았다');
    }else if(e.button===0){
      if(hit>=0){ pinAct=pinAct===hit?-1:hit; toast(pinAct<0?'핀 따라가기를 멈췄다':'이 핀을 따라간다 — 나침반을 보라'); }
      else{
        if(MAPPINS.length>=PIN_MAX){ toast('핀은 '+PIN_MAX+'개까지 — 우클릭으로 하나 뽑아라'); return; }
        const used=MAPPINS.reduce((a,p)=>Math.max(a,p.n),0);
        MAPPINS.push({x:(cx-N/2)*CELL, z:(cz-N/2)*CELL, c:MAPPINS.length%PIN_COL.length, n:used+1});
        pinAct=MAPPINS.length-1;
      }
    }
    pinVer++; drawMap();
  });
  mc.addEventListener('contextmenu',e=>e.preventDefault());
  mc.addEventListener('mousemove',e=>{
    if(!mapOpen) return;
    const [cx,cz,k]=at(e);
    pinHov={x:(cx-N/2)*CELL, z:(cz-N/2)*CELL, pin:pinAt(cx,cz,k)};
    mc.style.cursor=pinHov.pin>=0?'pointer':'crosshair';
  });
  mc.addEventListener('mouseleave',()=>{ pinHov=null; });
}
/* 핀 하나 — 꽂힌 점(cx,cz)에 바늘 끝, 위에 둥근 머리. s = 캔버스 화소로 친 머리 반지름 */
function drawPin(ctx,p,i,s){
  const cx=p.x/CELL+N/2, cz=p.z/CELL+N/2, hy=cz-s*2.1, act=i===pinAct;
  ctx.lineWidth=s*0.32; ctx.strokeStyle='rgba(8,14,14,.92)';
  ctx.beginPath(); ctx.moveTo(cx,cz); ctx.lineTo(cx-s*0.62,hy+s*0.55); ctx.arc(cx,hy,s,Math.PI*0.80,Math.PI*0.20); ctx.closePath();
  const g=ctx.createRadialGradient(cx-s*0.35,hy-s*0.4,s*0.1,cx,hy,s*1.2);      // 위왼쪽에서 빛이 드는 둥근 머리
  g.addColorStop(0,'#fff'); g.addColorStop(0.35,PIN_COL[p.c]); g.addColorStop(1,'rgba(0,0,0,.85)');
  ctx.fillStyle=g; ctx.fill(); ctx.stroke();
  if(act){ ctx.strokeStyle='#f4fff9'; ctx.lineWidth=s*0.22; ctx.beginPath(); ctx.arc(cx,hy,s*1.45,0,Math.PI*2); ctx.stroke(); }
  if(mapOpen){ ctx.fillStyle='#071010'; ctx.font='bold '+Math.round(s*1.05)+'px ui-monospace,monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.n,cx,hy+s*0.06); }
}
const pinDist=(p)=>{ const d=Math.hypot(p.x-PL.pos.x,p.z-PL.pos.z); return d<1000?Math.round(d)+' m':(d/1000).toFixed(d<10000?2:1)+' km'; };
function drawMap(){
  if(!mapImg) return;
  const ctx=document.getElementById('map').getContext('2d');
  const x=PL.pos.x/CELL+N/2, z=PL.pos.z/CELL+N/2, u=1;
  /* 지도 바탕(지형 + 자원 점 + 상륙 지점)은 한 장으로 구워 두고 매번 그대로 붙인다 — 예전엔 0.12초마다
     768² 화소를 putImageData 하고 자원 수천 개를 RESOURCES.find 로 찾아 찍어 한 번에 4 ms 였다.
     바탕은 자원 표시를 켜고 끌 때와 10초마다(캐서 사라진 것 반영)만 다시 굽는다 */
  const now=performance.now();
  if(!mapBase||mapBaseProps!==showProps||now-mapBaseT>60000){
    if(!mapBase){ mapBase=document.createElement('canvas'); mapBase.width=mapBase.height=N; }
    const b=mapBase.getContext('2d');
    b.putImageData(mapImg,0,0);
    if(showProps){
      /* 찍을 것만 섬마다 한 번 추려 둔다 — 6배 섬의 PROPS 는 풀까지 180만 개라, 10초마다 통째로 훑는 데 85 ms 가 들어 놀이가 툭툭 끊겼다 */
      if(_mapPropsSrc!==PROPS||_mapPropsN!==PROPS.length){ _mapPropsSrc=PROPS; _mapPropsN=PROPS.length; _mapProps=[];
        const colOf={}; for(const r of RESOURCES) colOf[r.k]='#'+r.c.toString(16).padStart(6,'0');
        for(const p of PROPS){ if(p.k==='oak'||p.k==='fir'||p.k==='reed'||p.k==='grass'||p.k==='pebble'||p.k==='flint') continue;
          _mapProps.push((p.x/CELL+N/2)|0,(p.z/CELL+N/2)|0,colOf[p.k]); } }
      for(let i=0;i<_mapProps.length;i+=3){ b.fillStyle=_mapProps[i+2]; b.fillRect(_mapProps[i],_mapProps[i+1],1.5*u,1.5*u); }
    }
    const px=podPos.x/CELL+N/2, pz=podPos.z/CELL+N/2;      // 상륙 지점
    b.fillStyle='#ffb060'; b.fillRect(px-1.5*u,pz-1.5*u,3*u,3*u);
    mapBaseProps=showProps; mapBaseT=now;
  }
  ctx.drawImage(mapBase,0,0);
  if(PL.under&&typeof underMapImg==='function'){ ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,N,N); ctx.drawImage(underMapImg(),0,0); }   // 땅속 — 땅 위 지도를 어둡게 덮고 굴 방·굴길·수직굴을 그린다(96-underworld.js)
  /* 핀 — 화면에서 머리가 큰 지도 9 px · 작은 지도 4.5 px 쯤 되게(캔버스 768 을 172~688 px 로 줄여 보인다) */
  const ps=(mapOpen?9:4.5)*N/mapPx();
  if(pinAct>=0&&MAPPINS[pinAct]){                     // 따라가는 핀까지 점선
    const p=MAPPINS[pinAct];
    ctx.save(); ctx.setLineDash([ps*0.9,ps*0.7]); ctx.lineWidth=ps*0.28; ctx.strokeStyle='rgba(240,255,248,.75)';
    ctx.beginPath(); ctx.moveTo(x,z); ctx.lineTo(p.x/CELL+N/2,p.z/CELL+N/2); ctx.stroke(); ctx.restore();
  }
  /* 개발자 모드 — 굴(번호 붙은 청록 동그라미 · ] [ 로 건너간다 — 80-player.js devCave) */
  if(typeof DEV!=='undefined'&&DEV.on&&typeof CAVES!=='undefined'){
    ctx.save(); ctx.lineWidth=ps*0.3; ctx.font='bold '+Math.round(ps*1.4)+'px ui-monospace,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    CAVES.forEach((c,i)=>{ const cx=c.x/CELL+N/2, cz=c.z/CELL+N/2, cur=i===DEV.cave;
      ctx.strokeStyle=cur?'#ffffff':'#5ff0d0'; ctx.beginPath(); ctx.arc(cx,cz,ps*(cur?1.5:1.0),0,6.2832); ctx.stroke();
      if(mapOpen){ ctx.fillStyle='#5ff0d0'; ctx.fillText(i+1,cx,cz-ps*2.2); } });
    ctx.restore(); }
  MAPPINS.forEach((p,i)=>{ if(i!==pinAct) drawPin(ctx,p,i,ps); });
  if(pinAct>=0&&MAPPINS[pinAct]) drawPin(ctx,MAPPINS[pinAct],pinAct,ps);   // 따라가는 핀은 맨 위
  if(mapOpen){
    const h=document.getElementById('mHelp');
    hudT(h,pinHov?(pinHov.pin>=0?'핀 '+MAPPINS[pinHov.pin].n+' · '+pinDist(MAPPINS[pinHov.pin])+' · 좌클릭 따라가기 · 우클릭 뽑기'
                                 :'여기까지 '+pinDist(pinHov)+' · 좌클릭 핀 꽂기')
                  :'핀 '+MAPPINS.length+'/'+PIN_MAX+' · 커서를 올리면 거리');
  }
  /* 플레이어 — 보는 쪽을 **뾰족한 끝**으로 가리키는 화살 삼각형.
     예전엔 시야 부채꼴(꼭짓점이 사람, 넓은 쪽이 앞)만 그려서 꼭짓점이 뒤를 가리키는 삼각형으로 읽혔다.
     앞 = (−sin yaw, −cos yaw) · 지도는 x→오른쪽, z→아래 */
  const a=-PL.yaw-Math.PI/2, fx=Math.cos(a), fz=Math.sin(a);
  const L=30*u, W=14*u, B=11*u;                      // 캔버스 768 → 화면 172 px 라 4.5배 작아진다
  ctx.fillStyle='#e8fff6'; ctx.strokeStyle='rgba(10,20,20,.9)'; ctx.lineWidth=3*u;
  ctx.beginPath();
  ctx.moveTo(x+fx*L, z+fz*L);                         // 앞 끝
  ctx.lineTo(x-fx*B-fz*W, z-fz*B+fx*W);
  ctx.lineTo(x-fx*B*0.3, z-fz*B*0.3);                 // 꼬리 홈
  ctx.lineTo(x-fx*B+fz*W, z-fz*B-fx*W);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
const COMPASS_LBL={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
let _compDeg=NaN;
function drawCompass(){
  const deg=(-PL.yaw*180/Math.PI%360+360)%360;
  /* 방위가 그대로면 그림도 그대로다 — 다시 안 그린다. 핀이 있으면 걸어서 거리·방향이 바뀌므로 자리(1 m)도 본다 */
  const key=MAPPINS.length?deg+'|'+pinVer+'|'+pinAct+'|'+Math.round(PL.pos.x)+'|'+Math.round(PL.pos.z):deg;
  if(key===_compDeg) return;
  _compDeg=key;
  const cx=document.getElementById('compassC'), g=cx.getContext('2d');
  const H=MAPPINS.length?32:20;                        // 핀이 있으면 띠 위에 10 px 핀 줄을 덧붙인다(CSS 높이는 auto)
  if(cx.height!==H) cx.height=H;
  g.clearRect(0,0,230,H);
  g.save(); if(H>20) g.translate(0,10);
  const PX=230/120;                                   // 화면에 120° 표시
  g.strokeStyle='rgba(160,200,185,.28)'; g.fillStyle='#c2d6ce';
  g.font='9px ui-monospace,monospace'; g.textAlign='center';
  const LBL=COMPASS_LBL;
  for(let a=-60;a<=60;a+=5){
    const t=(deg+a+360)%360, x=115+a*PX;
    const near=Math.round(t/45)*45;
    const diff=((t-near+540)%360)-180;      // -180..180 로 정규화한 방위 오차
    const major=Math.abs(diff)<2.6;
    g.beginPath(); g.moveTo(x,major?4:9); g.lineTo(x,14); g.stroke();
    if(major){ const L=LBL[near%360]; if(L) g.fillText(L,x,20); }
  }
  g.fillStyle='#8fd6b4'; g.fillRect(114.5,0,1.5,16);
  g.restore();
  /* 핀 줄 — 방위각 = atan2(dx, −dz)(북 = −z · 동 = +x, 나침반 글자와 같은 틀). 따라가는 핀은 크게 + 거리,
     시야(±60°) 밖이면 띠 끝에 화살로 어느 쪽으로 돌지 알려 준다 */
  for(let pass=0;pass<2;pass++) MAPPINS.forEach((p,i)=>{
    const act=i===pinAct; if(act!==(pass===1)) return;
    const b=Math.atan2(p.x-PL.pos.x,-(p.z-PL.pos.z))*180/Math.PI;
    const a=((b-deg)%360+540)%360-180;
    g.fillStyle=PIN_COL[p.c]; g.strokeStyle='rgba(6,12,12,.9)'; g.lineWidth=1.2;
    if(Math.abs(a)<=60){
      const x=115+a*PX, s=act?4.6:3;
      g.beginPath(); g.moveTo(x,9.5); g.lineTo(x-s,9.5-s*1.5); g.lineTo(x+s,9.5-s*1.5); g.closePath(); g.stroke(); g.fill();
      if(act){ g.font='9px ui-monospace,monospace'; g.textAlign=a>40?'right':'left'; g.fillStyle='#e8fff6';
        g.fillText(pinDist(p),a>40?x-7:x+7,8); }
    }else if(act){
      const r=a>0, x=r?226:4;
      g.beginPath(); g.moveTo(x+(r?4:-4),5); g.lineTo(x,1); g.lineTo(x,9); g.closePath(); g.stroke(); g.fill();
      g.font='9px ui-monospace,monospace'; g.textAlign=r?'right':'left'; g.fillStyle='#e8fff6';
      g.fillText(pinDist(p),r?x-3:x+3,8);
    }
  });
}
let fpsT=0,fpsN=0,fps=0;
/* ── 성능 창(F3) ────────────────────────────────────────────────────────
   어디가 프레임을 먹는지 게임 안에서 본다 — 다른 PC 에서도 잴 수 있게.
   ① 구간별 CPU ms(`loop` 의 갱신부를 일곱 토막으로 — 켜져 있을 때만 잰다) ② 패스별 그리기 호출 ·
   삼각형(하늘 · 본 장면 · 그림자 — renderer.render 와 shadowMap.render 를 감싸 잰다. Three 는 그림자를
   그린 **뒤에** 셈을 비우므로 그림자 몫은 그 안에서 따로 센다) ③ GPU 시간(EXT_disjoint_timer_query_webgl2 —
   없으면 '못 잼') ④ FPS · 1% low(가장 느린 1% 프레임) · 프레임 시간 그래프(240장, 선은 16.7·33.3 ms)
   ⑤ 그림자 지도를 다시 그린 횟수/초(LIGHT) · 구름 명암 대기열(LIT) · 지형 단계(TERR_STAT) · 메모리.
   초당 네 번만 글자를 바꾼다. */
const PERF={on:false, sec:new Float64Array(7), nf:0, t0:0, show:0, ring:new Float32Array(240), ri:0, rn:0, prev:0,
  names:['하늘·날씨','구름(명암)','빛·그림자','칸·지형','세상·사람','HUD·지도','그리기 JS'],
  dc:{sky:[0,0], main:[0,0], shadow:[0,0]}, gpu:{ext:null, q:[], act:false, ms:0, n:0, tot:0, totN:0, tried:false},
  sun0:0, pts0:0, lit0:0, litMs:0, srt:new Float32Array(240),
  lap(i,t){ const n=performance.now(); this.sec[i]+=n-t; return n; },
  toggle(){
    this.on=!this.on;
    document.getElementById('perf').style.display=this.on?'block':'none';
    if(this.on){ this.install(); this.reset(performance.now()); }
  },
  reset(now){ this.sec.fill(0); this.nf=0; this.t0=now; for(const k in this.dc) this.dc[k][0]=this.dc[k][1]=0;
    this.gpu.ms=0; this.gpu.n=0; this.sun0=LIGHT.stats.sun; this.pts0=LIGHT.stats.pts;
    if(typeof LIT!=='undefined'){ this.lit0=LIT.stats.n; } this.litMs=0; },
  install(){
    if(this._inst||!renderer) return; this._inst=true;
    const R=renderer, info=R.info.render, r0=R.render.bind(R), sm=R.shadowMap, s0=sm.render.bind(sm), P=this;
    R.render=function(sc,cam){
      if(!P.on) return r0(sc,cam);
      const c=info.calls, t=info.triangles; P._shc=P._sht=0;
      r0(sc,cam);
      /* 끝난 뒤의 셈 = 그 장면의 본 패스(그림자 셈은 Three 가 그림자를 그린 뒤 비운다). 누가 info.autoReset 을
         꺼 두었으면 비우지 않으므로 앞뒤 차이에서 그림자 몫을 뺀다 */
      const dc=info.autoReset?info.calls:info.calls-c-P._shc, dt=info.autoReset?info.triangles:info.triangles-t-P._sht;
      const k=sc===skyScene?'sky':sc===scene?'main':null;
      if(k){ P.dc[k][0]+=dc; P.dc[k][1]+=dt; }
    };
    sm.render=function(L,sc,cam){
      if(!P.on) return s0(L,sc,cam);
      const c=info.calls, t=info.triangles; s0(L,sc,cam);
      const dc=info.calls-c, dt=info.triangles-t;
      P._shc=(P._shc||0)+dc; P._sht=(P._sht||0)+dt;
      P.dc.shadow[0]+=dc; P.dc.shadow[1]+=dt;
    };
    const gl=R.getContext(); this.gpu.ext=gl.getExtension&&gl.getExtension('EXT_disjoint_timer_query_webgl2'); this.gpu.gl=gl;
  },
  gpuBegin(){ const G=this.gpu, gl=G.gl; if(!G.ext||G.act||G.q.length>4) return;
    const q=gl.createQuery(); gl.beginQuery(G.ext.TIME_ELAPSED_EXT,q); G.q.push(q); G.act=true; },
  gpuEnd(){ const G=this.gpu, gl=G.gl; if(!G.ext||!G.act) return; gl.endQuery(G.ext.TIME_ELAPSED_EXT); G.act=false;
    while(G.q.length&&!(G.act&&G.q.length===1)){
      const q=G.q[0]; if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)) break;
      if(!gl.getParameter(G.ext.GPU_DISJOINT_EXT)){ const v=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6; G.ms+=v; G.n++; G.tot+=v; G.totN++; }
      gl.deleteQuery(q); G.q.shift();
    } },
  frame(now){
    if(this.prev){ this.ring[this.ri]=now-this.prev; this.ri=(this.ri+1)%this.ring.length; if(this.rn<this.ring.length) this.rn++; }
    this.prev=now; this.nf++;
    if(typeof LIT!=='undefined') this.litMs+=LIT.stats.ms;
    if(now-this.show<250) return;
    this.show=now;
    const el=now-this.t0, n=Math.max(1,this.nf), f=v=>v.toFixed(2).padStart(6);
    // 1% low — 지난 240장 중 가장 느린 1%(=2~3장)의 평균 프레임 시간
    const m=this.rn; let low='–';
    if(m>20){ const a=this.srt; for(let i=0;i<m;i++) a[i]=this.ring[i]; const sub=a.subarray(0,m); sub.sort();
      const k=Math.max(1,Math.round(m*0.01)); let sm=0; for(let i=m-k;i<m;i++) sm+=sub[i]; low=(1000/(sm/k)).toFixed(0); }
    let tot=0, L=[];
    L.push('FPS '+(this.nf*1000/el).toFixed(1)+'  · 1% low '+low+'  · '+renderer.domElement.width+'×'+renderer.domElement.height
      +(FPS_CAP?'  · 제한 '+FPS_CAP:'')+(QUAL.k<1?'  · 자동 품질 '+QUAL.k.toFixed(2):''));
    L.push((GPU_SOFT?'⚠ 소프트웨어 렌더 — ':'')+(GPU_NAME||'장치 이름 모름').slice(0,58));
    for(let i=0;i<7;i++){ tot+=this.sec[i]; L.push(this.names[i].padEnd(8,'　')+f(this.sec[i]/n)+' ms'); }
    L.push('CPU 합'.padEnd(8,'　')+f(tot/n)+' ms'+(this.gpu.n?'   GPU '+(this.gpu.ms/this.gpu.n).toFixed(2)+' ms':(this.gpu.ext?'   GPU …':'   GPU 못 잼')));
    const dc=k=>(this.dc[k][0]/n).toFixed(0).padStart(4)+'회 '+(this.dc[k][1]/n/1e3).toFixed(0).padStart(5)+'k△';
    L.push('하늘   '+dc('sky')); L.push('본장면 '+dc('main')); L.push('그림자 '+dc('shadow'));
    const ps=1000/el;
    L.push('그림자 지도 다시 — 해 '+((LIGHT.stats.sun-this.sun0)*ps).toFixed(1)+'/초 · 불 '+((LIGHT.stats.pts-this.pts0)*ps).toFixed(1)+'/초');
    if(typeof LIT!=='undefined') L.push('구름 명암 '+(this.litMs/n).toFixed(2)+' ms · '+((LIT.stats.n-this.lit0)*ps).toFixed(1)+'덩이/초 · 대기 '+LIT.stats.queue);
    if(typeof TERR_STAT!=='undefined') L.push('지형 단계 1·2·4·8칸 '+TERR_STAT.join('·'));
    const mi=renderer.info.memory, pm=performance.memory;
    L.push('지오메트리 '+mi.geometries+' · 텍스처 '+mi.textures+' · 셰이더 '+renderer.info.programs.length+(PRECOMP.n?'(미리 '+PRECOMP.n+')':'')+(pm?' · JS '+(pm.usedJSHeapSize/1048576).toFixed(0)+' MB':''));
    // 진단(예전 F3 상자) — 멈춤·잠금·입력 상태
    L.push('진단 paused='+paused+' busy='+busy+' fly='+flyMode+' mouse='+hasMouse+' touch='+touchOnly
      +' lock='+(document.pointerLockElement===cv)+' · 청크 '+chunks.length+' · 소품 '+PROPS.length
      +' · '+dayNo()+'일 '+hourOfDay.toFixed(2)+'시 · 전력 '+powerBudget(dayNo()));
    document.getElementById('perfT').textContent=L.join('\n');
    this.graph();
    this.reset(now);
  },
  graph(){
    const c=document.getElementById('perfG'), g=c.getContext('2d'), W=c.width, H=c.height, m=this.rn, R=this.ring;
    g.clearRect(0,0,W,H); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,W,H);
    for(let i=0;i<m;i++){
      const v=R[(this.ri-m+i+R.length)%R.length], h=Math.min(H,v/50*H);
      g.fillStyle=v>33.4?'#d8724a':v>16.8?'#d8c46a':'#8fd6b4'; g.fillRect(W-m+i,H-h,1,h);
    }
    g.fillStyle='rgba(255,255,255,.35)'; g.fillRect(0,H-16.7/50*H,W,1); g.fillRect(0,H-33.3/50*H,W,1);
  }
};
/* ── 벤치마크(설정 창 '벤치마크') ─────────────────────────────────────────
   **정해 둔 길을 돌며 평균 FPS · 1% low · 가장 느린 프레임을 잰다** — 설정을 바꾸기 전후, 다른 PC 끼리 견주려고.
   길: 착륙 캡슐(`podPos`) 둘레 반지름 `R` m 원을 눈높이로 한 바퀴(앞으로 보며) · 앞 3초는 데우기(안 셈) · 40초.
   시각은 그날 11시로 맞춰 두고(같은 섬 · 같은 날이면 날씨도 같다) 끝나면 사람 자리·시각을 되돌린다.
   잴 동안 놀이는 멈춘다(배고픔·불·제작이 안 흐른다 — 갱신은 하늘·구름·빛·칸·HUD·그리기만).
   Esc 로 멈춘다. 지난 결과 10개는 `castaway.bench` 에 남겨 다음 결과 옆에 보인다. */
const BENCH={on:false, R:60, warm:3, dur:40, t0:0, prev:0, ft:[], save:null, sec:new Float64Array(7), gpu0:0, gpuN0:0};
function benchStart(){
  if(BENCH.on) return;
  if(busy||!landed||PL.dead){ toast('벤치마크는 섬에 내린 뒤에 돌릴 수 있다'); return; }
  const B=BENCH;
  B.save={x:PL.pos.x, y:PL.pos.y, z:PL.pos.z, yaw:PL.yaw, pitch:PL.pitch, gh:gameHours, hd:hourOfDay,
          paused, perf:PERF.on, ov:document.getElementById('ov').style.display};
  paused=true; audioPause(true);                 // 놀이 쪽 입력·갱신은 멈춘다 — 벤치는 따로 돈다
  toggleCfg(false); document.getElementById('ov').style.display='none';
  if(document.pointerLockElement) document.exitPointerLock();
  gameHours=Math.floor(gameHours/24)*24+11; hourOfDay=11; weaLast=0;
  B.cx=podPos.x; B.cz=podPos.z; B.ft.length=0; B.sec.fill(0); B.n=0;
  if(!PERF.on) PERF.toggle();                    // 구간별 시간도 같이 잰다
  B.gpu0=PERF.gpu.tot; B.gpuN0=PERF.gpu.totN;
  B.on=true; B.t0=B.prev=performance.now(); last=B.t0;
}
function benchPose(t){
  const B=BENCH, a=t/B.dur*Math.PI*2, x=B.cx+Math.cos(a)*B.R, z=B.cz+Math.sin(a)*B.R;
  const y=Math.max(heightAt(x,z),waterLevelAt(x,z))+0.1;     // 물 위로(바다·강)
  PL.pos.set(x,y,z); PL.vel.set(0,0,0);
  PL.yaw=Math.atan2(Math.sin(a),-Math.cos(a)); PL.pitch=-0.06;   // 원을 따라 앞으로(앞 = (−sin yaw, −cos yaw))
  camera.position.set(x,y+1.7,z); camera.rotation.set(PL.pitch,PL.yaw,0,'YXZ');
}
function benchFrame(now){
  const B=BENCH;
  if(document.hidden||winHidden){ benchEnd(true); return; }
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  const t=(now-B.t0)/1000-B.warm;                // 데우기 동안은 음수
  if(t>=B.dur){ benchEnd(false); return; }
  if(t>=0){ B.ft.push(now-B.prev); }
  B.prev=now;
  benchPose(Math.max(0,t));
  /* 구간 시간은 성능 창(PERF — 0.25초마다 비운다)과 벤치 합계(B.sec) 양쪽에 적는다 */
  let tp=performance.now();
  const lap=i=>{ const q=PERF.lap(i,tp); if(t>=0) B.sec[i]+=q-tp; tp=q; };
  updateSky(); lap(0);
  updateClouds(dt); updateRain(dt); lap(1);
  LIGHT.update(dt); lap(2);
  updateTorch(dt,0); updateLamp(dt,0); updateFires(dt,0); updateFurnaces(dt,0); updateOcean(now*0.001); lap(4);
  updateTileVis(); updateTerrainLOD(); lap(3);
  updateHUD(dt); drawCompass(); mapT+=dt; if(mapT>0.12){ mapT=0; drawMap(); } lap(5);
  PERF.gpuBegin();
  try{ LIGHT.flush(); renderFrame(); }catch(e){ showErr('벤치마크',e); benchEnd(true); return; }
  PERF.gpuEnd(); lap(6);
  if(t>=0) B.n++;
  PERF.frame(now);
}
function benchEnd(abort){
  const B=BENCH; if(!B.on) return; B.on=false;
  const S=B.save;
  PL.pos.set(S.x,S.y,S.z); PL.vel.set(0,0,0); PL.yaw=S.yaw; PL.pitch=S.pitch; PL.camY=undefined;
  gameHours=S.gh; hourOfDay=S.hd; weaLast=0;
  if(!S.perf&&PERF.on) PERF.toggle();
  pause();                                       // 일시정지 화면으로 — '계속'으로 이어 한다
  if(abort||B.ft.length<30){ toast('벤치마크를 멈췄다'); return; }
  const ft=B.ft.slice().sort((a,b)=>a-b), n=ft.length, tot=B.ft.reduce((a,b)=>a+b,0);
  const k=Math.max(1,Math.round(n*0.01)); let worst=0; for(let i=n-k;i<n;i++) worst+=ft[i];
  const R={at:Date.now(), fps:+(n*1000/tot).toFixed(1), low:+(1000/(worst/k)).toFixed(1), max:+ft[n-1].toFixed(1),
    cpu:+(B.sec.reduce((a,b)=>a+b,0)/Math.max(1,B.n)).toFixed(2),
    gpu:PERF.gpu.totN>B.gpuN0?+((PERF.gpu.tot-B.gpu0)/(PERF.gpu.totN-B.gpuN0)).toFixed(2):null,
    res:SET.res, far:SET.far, shadow:SET.shadow, limb:SET.limb, w:renderer.domElement.width, h:renderer.domElement.height,
    gpuName:GPU_NAME.slice(0,60)};
  let hist=[]; try{ hist=JSON.parse(localStorage.getItem('castaway.bench')||'[]'); }catch(e){}
  const prev=hist[hist.length-1];
  hist.push(R); try{ localStorage.setItem('castaway.bench',JSON.stringify(hist.slice(-10))); }catch(e){}
  console.log('[벤치마크]',JSON.stringify(R));
  ask('벤치마크 — 평균 '+R.fps+' fps · 1% low '+R.low+' fps',
      '가장 느린 프레임 '+R.max+' ms · CPU '+R.cpu+' ms'+(R.gpu!=null?' · GPU '+R.gpu+' ms':'')+' · '+R.w+'×'+R.h
      +(prev?' · 지난번 '+prev.fps+' fps(1% low '+prev.low+')':'')+' — 다시 돌릴까요?',
      ()=>benchStart());
}
// 받는 피해는 갑옷만큼 줄어든다 (실험체가 붙으면 그대로 적용된다)
const mitigate=(dmg)=>Math.max(1,dmg*armorMul());
/* HUD 글은 **바뀔 때만** 쓴다 — 같은 글을 프레임마다 다시 넣으면(특히 innerHTML) 노드를 새로 만들어
   버리고 화면 배치를 다시 잰다. 글과 HTML 을 같은 칸(`_hv`)에 적어 두어 둘을 번갈아 써도 어긋나지 않는다 */
function hudT(el,s){ s=''+s; if(el&&el._hv!=='t'+s){ el._hv='t'+s; el.textContent=s; } }
function hudH(el,s){ s=''+s; if(el&&el._hv!=='h'+s){ el._hv='h'+s; el.innerHTML=s; } }
/* 스타일도 바뀔 때만 — 막대 폭·색·보이기를 프레임마다 다시 넣고 있었다. 요소마다 마지막 값을 적어 둔다
   (이 요소들의 스타일을 HUD 밖에서 바꾸는 곳은 없다 — 생기면 거기도 hudS 로 쓸 것) */
function hudS(el,k,v){ if(!el) return; v=''+v; const c=el._hs||(el._hs={}); if(c[k]!==v){ c[k]=v; el.style[k]=v; } }
/* 따기 진행 막대 — 보고 있는 것을 따는 중일 때만(GATHER · 95-flora.js) */
function gatherBar(lb,lf,p){
  const on=GATHER.p===p&&GATHER.t>0;
  hudS(lb,'display',on?'block':'none');
  if(on) hudS(lf,'width',Math.min(100,GATHER.t/GATHER.dur*100).toFixed(1)+'%');
}
function updateHUD(dt){
  fpsT+=dt; fpsN++;
  if(fpsT>0.5){ fps=Math.round(fpsN/fpsT); fpsT=0; fpsN=0; }
  const s=sampleAt(PL.pos.x,PL.pos.z);
  const H=Math.floor(hourOfDay), M=Math.floor((hourOfDay%1)*60);
  hudT(document.getElementById('iTime'),String(H).padStart(2,'0')+':'+String(M).padStart(2,'0'));
  hudT(document.getElementById('iPos'),Math.round(PL.pos.x)+', '+Math.round(PL.pos.z));
  hudT(document.getElementById('iAlt'),(PL.swim?'수중 ':'')+Math.round(PL.pos.y)+' m');
  hudT(document.getElementById('iBio'),PL.under?'땅속':caveAt(PL.pos.x,PL.pos.z,-0.5)?'동굴':BIOME_INFO[s.biome].n);
  hudT(document.getElementById('iFps'),fps);
  const hpF=document.getElementById('hpF'), hpT=document.getElementById('hpT');
  if(hpF){
    hudS(hpF,'width',clamp(PL.hp,0,HPMAX)+'%');
    hudS(hpF,'background',PL.hp<25?'#c9453a':(PL.hp<55?'#d8724a':'#c96a6a'));
    hudT(hpT,Math.max(0,Math.round(PL.hp)));
  }
  // 맞으면 화면 가장자리가 붉어진다
  /* 다친 붉은 빛 — **늘** 맞춘다. 예전엔 hurtFlash>0 일 때만 고쳐, 쓰러졌다 깨어나며 hurtFlash 를 0 으로 놓으면(80-player.js)
     붉은 막이 마지막 짙기로 화면에 남았다(사용자 지적: 떨어져 죽은 뒤 붉은 빛이 안 걷힌다) */
  { if(hurtFlash>0) hurtFlash=Math.max(0,hurtFlash-dt*1.6);
    const hv=document.getElementById('hurt');
    if(hv){ hudS(hv,'opacity',hurtFlash*0.55); hudS(hv,'display',hurtFlash>0.01?'block':'none'); }
  }
  hudS(document.getElementById('stF'),'width',PL.stam+'%');
  hudT(document.getElementById('stT'),Math.round(PL.stam));
  const fdF=document.getElementById('fdF'), fdT=document.getElementById('fdT');
  if(fdF){
    hudS(fdF,'width',PL.food+'%');
    // 배가 꺼질수록 붉어진다. 날것을 먹고 앓는 동안에는 따로 표시한다
    hudS(fdF,'background',PL.food<=0?'#c9453a':(PL.food<30?'#d8724a':'#c9a86a'));
    hudT(fdT,Math.round(PL.food)+(PL.ill>0?' · 탈':''));
  }
  const wtF=document.getElementById('wtF'), wtT=document.getElementById('wtT');
  if(wtF){
    hudS(wtF,'width',PL.water+'%');
    hudS(wtF,'background',PL.water<=0?'#c9453a':(PL.water<30?'#d8724a':'#6f9ec9'));
    hudT(wtT,Math.round(PL.water));
  }
  /* 허기·목마름이 낮으면(25 밑) 화면 둘레가 붉게 맥박친다 — 막대만으로는 바닥나는 줄 모르고 쓰러졌다.
     둘 중 더 급한 쪽이 세기를 정하고, 0 에 가까울수록 짙고 빠르게 뛴다. 문턱을 넘을 때 한 번 말로도 알린다 */
  { const NEED=25, low=v=>clamp((NEED-v)/NEED,0,1);
    const lf=PL.dead?0:low(PL.food), lw=PL.dead?0:low(PL.water), lv=Math.max(lf,lw);
    const nw=document.getElementById('needWarn');
    if(nw){
      hudS(nw,'display',lv>0?'block':'none');
      if(lv>0){ const beat=0.5+0.5*Math.sin(performance.now()*0.001*(2.2+4.5*lv));
        hudS(nw,'opacity',(0.18+0.62*lv)*(0.55+0.45*beat)); }
    }
    if(fdF&&fdF.parentNode) fdF.parentNode.parentNode.classList.toggle('low',lf>0);
    if(wtF&&wtF.parentNode) wtF.parentNode.parentNode.classList.toggle('low',lw>0);
    if(lf>0&&!PL._hungryMsg){ PL._hungryMsg=true; toast('허기가 심하다 — 무엇이든 먹어야 한다'); } else if(PL.food>NEED+10) PL._hungryMsg=false;
    if(lw>0&&!PL._thirstMsg){ PL._thirstMsg=true; toast('목이 탄다 — 마실 물을 찾아라'); } else if(PL.water>NEED+10) PL._thirstMsg=false;
  }
  const ow=document.getElementById('oxWrap');
  hudS(ow,'display',PL.oxy<99.5?'block':'none');
  hudS(document.getElementById('oxF'),'width',PL.oxy+'%');
  hudT(document.getElementById('oxT'),Math.round(PL.oxy));
  hudT(document.getElementById('mDist'),
    Math.round(Math.hypot(PL.pos.x-podPos.x,PL.pos.z-podPos.z))+' m');

  // 용기가 열려 있으면 안에서 굽고 녹는 것이 눈앞에서 진행된다
  if(boxOpen){ boxT+=dt; if(boxDirty||boxT>0.25){ boxT=0; boxDirty=false; drawBox(); } }

  // 채집 프롬프트 / 조사 표시
  const look=document.getElementById('look'), lt=document.getElementById('lookT'),
        lb=document.getElementById('lookB'), lf=document.getElementById('lookF');
  updateToasts(dt);                               // 알림은 따로 된 칸(#toast) — 채취 표시를 가리지 않는다
  if(MOVE.t){                                     // 옮기는 중(60-stations.js)
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,MOVE.t.cname+' 옮기는 중 — [좌클릭] 놓기 · [휠·R] 돌리기 · [F·우클릭] 그만두기'+(MOVE.ok?'':'<em>'+MOVE.why+'</em>'));
  }else if(LEVEL.on&&LEVEL.tgt){                  // 시멘트를 들었다 — 터 다지기(62-build.js)
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,'[좌클릭] 터 다지기 — 시멘트 '+pct(LEVEL.tgt.need)+' · 가진 것 '+pct(cementTotal())+(LEVEL.ok?'':'<em>'+LEVEL.why+'</em>'));
  }else if(HARV.fit){
    const w=HARV.fit;
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,'[좌클릭] '+BKIND_N[w.leaf.kind]+(w.leaf.open?' 닫기':' 열기'));
  }else if(HARV.cont){
    const c=HARV.cont, e=equippedTool();
    const isTorch=e&&(ITEMS[e.id].tool||{}).torch;
    hudS(look,'display','block'); hudS(lb,'display','none');
    if(c.kind==='grind'){
      hudS(look,'display','block'); hudS(lb,'display','none');
      hudH(lt,'[좌클릭] 숫돌 — 갈아 만들기와 수리 · [F] 옮기기<em>'
        +'수리는 처음 재료의 절반(내림)이 든다</em>');
    }else if(c.kind==='power'){
      hudS(look,'display','block'); hudS(lb,'display','none');
      hudH(lt,'[좌클릭] 발전기 — 축전지와 전등 채우기<em>'
        +(powered()?'물레방아가 돌고 있다':'물레방아가 서 있다 — 채울 수 없다')+'</em>');
    }else{
    /* (예전엔 위 두 갈래가 여기서 `return` 했다 — 숫돌·발전기를 **보고 있는 동안** 이 함수의 아랫도리가 통째로 안 돌아, 화면의
       제작 진행 막대가 멈춰 보였다. 숫돌 곁에서 숫돌을 보며 마제 석기날을 만들면 '안 만들어지는' 것처럼 보이고, 숫돌 창을 열면
       (조준이 풀려) 그새 찬 진행이 한꺼번에 보였다 — 베타 테스터 지적) */
    const head='[좌클릭] '+c.cname+' 열기'+(pushKind(c)?' · [F] 옮기기':'');
    // 모닥불은 좌클릭을 계속 누르면 불을 다루는 쪽으로 넘어간다
    if(isHearth(c) && !c.lit && isTorch && e.lit && e.fuel>0.12 && contFuel(c)){
      hudH(lt,head+'<em>길게 누르면 횃불로 불 옮기기</em>');
      if(IGNITE.t>0){ hudS(lb,'display','block'); hudS(lf,'width',Math.min(100,IGNITE.t/1.5*100).toFixed(1)+'%'); }
    }else if(isHearth(c) && c.lit && isTorch && !e.lit && e.fuel>0){
      hudH(lt,head+'<em>길게 누르면 횃불에 불 붙이기 · 연료 '+fmtFuel(e.fuel)+'</em>');
      if(IGNITE.t>0){ hudS(lb,'display','block'); hudS(lf,'width',Math.min(100,IGNITE.t/1.0*100).toFixed(1)+'%'); }
    }else if(isHearth(c) && !c.lit){
      const canFire=e&&(ITEMS[e.id].tool||{}).fire;
      const tin=needsTinder(e), dur=igniteDur(e);
      const hasTin=INV.slots.some(x=>x.id==='tinder');
      let why;
      if(!contFuel(c))      why=(c.kind==='furnace')
        ? '땔감을 넣어야 불이 붙는다 — 참숯은 환원제라 타지 않는다'
        : '안에 땔감을 넣어야 불이 붙는다';
      else if(!canFire)     why='활비비 · 긴 라이터 · 불붙은 횃불 중 하나가 필요하다';
      else if(tin&&!hasTin) why='부싯깃이 없다';
      else if(IGNITE.t<=0)  why=tin?'길게 누르면 활비비로 비벼 불씨를 만든다'
                                   :'길게 누르면 라이터로 불을 붙인다';
      else why=!tin?'불꽃을 떨어뜨리는 중'
                   :(IGNITE.t/dur<0.6)?'비비는 중 — 톱밥에 열이 오른다'
                                      :'불씨를 부싯깃에 옮겨 불어넣는 중';
      hudH(lt,head+'<em>'+why+'</em>');
      if(IGNITE.t>0){ hudS(lb,'display','block'); hudS(lf,'width',Math.min(100,IGNITE.t/dur*100).toFixed(1)+'%'); }
    }else{
      /* 불이면 비를 가리는지도 알린다(사용자 요청) — 지붕·나무 밑이면 비에도 안 꺼진다 */
      const shel=(c.kind==='fire'||c.kind==='furnace')?(fireShelter(c)?' · '+fireShelter(c)+'(비에 안 꺼진다)':(WEA.rain>0.2?' · <b style="color:#e08a6a">비를 맞는다 — 꺼질 수 있다</b>':' · 한데(비가 오면 꺼질 수 있다)')):'';
      hudH(lt,head+'<em>'+contStatus(c)+' · '
        +contWeight(c).toFixed(1)+' / '+c.cap+' kg'+shel+'</em>');
      /* 안에서 여럿이 함께 익으므로 막대는 가장 먼저 끝날 것을 보여 준다 */
      if(c.lit){
        const fr=(c.kind==='fire')
          ? fireJobs(c).map(j=>clamp((c.cook&&c.cook[j]||0)/FIRING[j].hours,0,1))
          : furnaceJobs(c).map(R=>clamp((c.jobs&&c.jobs[R.id]||0)/R.hours,0,1));
        if(fr.length){ hudS(lb,'display','block'); hudS(lf,'width',Math.min(100,Math.max(...fr)*100).toFixed(1)+'%'); }
      }
    }
    }
  }else if(FISH.look&&equippedTool()&&(ITEMS[equippedTool().id].tool||{}).harpoon){
    const S=FISH.look.sp, hv=ITEMS[equippedTool().id].tool.harpoon;          // 작살을 든 채 물고기를 겨눴다
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,'[좌클릭] '+S.n+' 찌르기<em>'+(hv>=S.tier?'더 다가가 찌른다 — 놀라면 달아난다':'이 작살로는 안 박힌다 — 등급 '+S.tier+' 작살')+'</em>');
  }else if(SEA.look){
    const D=SEA_PICK[SEA.look.kind];
    hudS(look,'display','block');
    hudH(lt,'[좌클릭] '+D.n+' '+D.verb+'<em>'+(D.need&&!hasSharp()?'날붙이를 지녀야 뗀다':D.prick?'맨손이면 가시에 찔린다':D.sting?'촉수에 쏘인다':ITEMS[D.item].use)+'</em>');
    gatherBar(lb,lf,SEA.look);                     // 누르고 있는 동안 차는 막대(updateGather)
  }else if(FLORA.look&&!harvestByUse()){           // 나무·덤불·꽃·버섯·돌 — 세상에 선 것은 다 무엇인가를 준다(95-flora.js)
    const D=FLORA_PICK[FLORA.look.kind], left=floraWait(FLORA.look);
    hudS(look,'display','block');
    const got=D.loot?(FLORA.look.deep?'깊은 바다에 바쳐진 것 — 백금 반지가 든다고 한다':'옛 사람들이 두고 간 것'):ITEMS[D.item].n+(D.extra?' · 가끔 '+D.extra.map(x=>ITEMS[x[0]].n).join('·'):'')+(D.chance?' · 잘 안 떨어진다':'');
    hudH(lt,left>0?(D.n+'<em>'+(D.once?'비었다':'아직 다시 나지 않았다 — 약 '+Math.ceil(left)+'시간 뒤')+'</em>')
                  :('[좌클릭] '+D.n+' '+D.verb+'<em>'+(D.need&&!hasSharp()?'날붙이를 지녀야 벤다':D.take?ITEMS[D.take].n+'에 담는다 · 횃불 연기가 없으면 쏘인다':got)+'</em>'));
    gatherBar(lb,lf,FLORA.look);
  }else if(CLIMB.on){                             // 나무 위(97-wildlife.js)
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,'나무 위<em>W·S 오르내리기 · A·D 줄기 돌기 · Space 뛰어내리기 · 기력 '+Math.round(PL.stam)+'</em>');
  }else if(FISH.look){
    const S=FISH.look.sp;
    hudS(look,'display','block'); hudS(lb,'display','none');
    hudH(lt,S.n+'<em>작살(등급 '+S.tier+' 이상)을 들고 찌른다'+(S.len<0.5?' · 잔고기는 그물로도 건진다':'')+'</em>');
  }else{
    const t=HARV.near;
    if(t){
      const R=RESOURCES.find(r=>r.k===t.k)||{n:t.n||t.k}, M=HARV.mode;     // 노거수(95-giants.js)는 자원 표에 없다 — 제 이름(t.n)
      hudS(look,'display','block');
      if(M){
        hudH(lt,'[좌클릭] '+M.H.label+'<em>'+R.n+'</em>');          // 남은 횟수는 적지 않는다(사용자 요청)
        hudS(lb,'display',HARV.t>0?'block':'none');
        hudS(lf,'width',Math.min(100,HARV.t/(M.dur||M.H.dur)*100).toFixed(1)+'%');
      }else{
        const why=blockReason(t);
        hudH(lt,R.n+'<em>'+(why||(t.felled?'그루터기만 남았다':'더 얻을 게 없다'))+'</em>');
        hudS(lb,'display','none');
      }
    }else{
      // 그 밖의 자원은 이름만 알려준다 (아직 맨손으로는 채집 불가)
      let best=null,bd=3.0;
      eachNearProp(PL.pos.x,PL.pos.z,p=>{
        if(isNode(p.k)) return;
        const d=Math.hypot(p.x-PL.pos.x,p.z-PL.pos.z);
        if(d<bd){bd=d;best=p;}
      });
      const wat=(!best&&!equippedTool()&&!uiOpen())?lookWater(DRINK_REACH):null;   // 빈손으로 물을 보고 있나
      if(best){
        const R=RESOURCES.find(r=>r.k===best.k);
        hudS(look,'display','block'); hudS(lb,'display','none');
        hudH(lt,R.n+'<em>'+R.use+' · 도구 필요</em>');
      }else if(wat&&wat.fresh){                   // 마실 수 있는 물(민물)을 볼 때만 뜬다 — 바다에서는 아무것도 안 띄운다
        hudS(look,'display','block'); hudS(lb,'display','none');
        hudH(lt,'[좌클릭] 물 마시기<em>민물'+(PL.water>=99.5?' · 목이 마르지 않다':'')+'</em>');
      }else hudS(look,'display','none');
    }
  }
  bagSync();                                      // 가방 화면(소지품+제작)의 보임을 맞춘다
  if(quickDirty){ quickDirty=false; drawQuick(); }
  hudS(document.getElementById('quick'),'display',uiOpen()?'none':'flex');
  // 장착 도구 표시
  const e=equippedTool(), tp=document.getElementById('tool');
  if(e){
    hudS(tp,'display','block');
    const T=ITEMS[e.id];
    if(e.fuel!==undefined){                       // 횃불 — 내구 대신 남은 연소 시간
      hudT(document.getElementById('toolN'),T.n+(e.lit?' (타는 중) · 좌클릭 끄기':' (꺼짐) · 좌클릭 불 붙이기'));
      const bar=document.getElementById('toolD');
      hudS(bar,'width',(e.fuel/T.burn*100)+'%');
      hudS(bar,'background',e.lit?'#e08a3a':'#5d7a71');
    }else if(T.tool&&T.tool.gun){               // 총 — 내구 대신 탄창을 보여 준다
      const ak=(e.mag&&e.ammoId)?'  ['+ITEMS[e.ammoId].n
        +(ammoMul(e)!==1?' ×'+(+ammoMul(e).toFixed(2)):'')+']':'';
      hudT(document.getElementById('toolN'),T.n+'  '+(e.mag|0)+' / '+T.tool.mag+ak
        +(RELOAD.t>0?'  (재장전 '+RELOAD.t.toFixed(1)+'초)':'  [X] 재장전')
        +'  · 남은 탄 '+gunAmmo(e));
      const bar=document.getElementById('toolD');
      hudS(bar,'width',((e.mag|0)/T.tool.mag*100)+'%');
      hudS(bar,'background',RELOAD.t>0?'#8fb8d8':(e.mag?'#d8724a':'#5d5a52'));
    }else if(!T.tool){                          // 먹을 것·마실 것·붕대 — 개수(모금)와 좌클릭
      hudT(document.getElementById('toolN'),T.n+'  ×'+e.n
        +(e.sip?'  ('+e.sip+'모금)':'')+'  [좌클릭] '+useVerb(T));
      const bar=document.getElementById('toolD');
      hudS(bar,'width',(T.drink?((e.sip||1)/(T.sips||1)):1)*100+'%'); hudS(bar,'background','#7fb07a');
    }else if(e.amt!==undefined){                // 시멘트 — 가진 것을 다 더해 퍼센트로(통 다섯에 0.3 통이면 530%)
      hudT(document.getElementById('toolN'),T.n+'  '+pct(cementTotal())+'  [좌클릭] 터 다지기');
      const bar=document.getElementById('toolD');
      hudS(bar,'width',(e.amt*100)+'%'); hudS(bar,'background','#b8b8b0');
    }else{
      hudT(document.getElementById('toolN'),T.n);
      const bar=document.getElementById('toolD');
      hudS(bar,'width',(e.dur/T.durMax*100)+'%'); hudS(bar,'background','#d8c96a');
    }
  }else hudS(tp,'display','none');

  // 제작 진행 — 제작창을 닫아도 화면 가운데 게이지로 보인다
  const cp=document.getElementById('crfP'), cb=document.getElementById('cbar');
  if(CRAFT.recipe){
    const R=CRAFT.recipe, pct=clamp(CRAFT.t/R.time,0,1);
    hudS(cp,'display','block');
    hudS(document.getElementById('crfF'),'width',(pct*100)+'%');
    hudS(cb,'display','block');
    hudT(document.getElementById('cbN'),R.n);
    hudT(document.getElementById('cbP'),Math.floor(pct*100)+'%');
    hudS(document.getElementById('cbF'),'width',(pct*100)+'%');
    hudT(document.getElementById('cbS'),
      Math.ceil(R.time-CRAFT.t)+'초 남음'+(R.station?' · '+STATION[R.station].n+' 곁':'')
      +' · 기력 '+Math.round(PL.stam));
  }else{ hudS(cp,'display','none'); hudS(cb,'display','none'); }

  if(invDirty){ invDirty=false; drawInv(); craftDirty=true; }
  if(craftDirty){ craftDirty=false; drawCraft(); }
}
