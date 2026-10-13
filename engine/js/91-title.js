/* 91-title.js — CASTAWAY
   여는 화면의 그림 — 스텐실 간판(CASTAWAY)과 올라가는 글을 볼록한 브라운관 유리 한 장에 비친 것처럼 그린다
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   여는 화면
   ----------------------------------------------------------------------------
   캔버스 한 장(`#ovArt`)에 그린다(사용자 요청). 처음 여는 화면(#ov.title)에서만 돌고, 상륙하면 멈춘다.
   **화면 전체가 흑백 한 장**이다 — 검은 바탕에 흰 글씨뿐. 색은 오직 **색 번짐**(빨강·초록·파랑이 옆으로 갈라지는 것)에서만 나온다.
   ① 평평한 그림 한 장을 먼저 짓는다(flat):
        · **간판** — CASTAWAY 를 군용 스텐실 글씨로(글꼴 파일은 없다: 글자 여섯을 굵은 줄기와 둥근 모서리로 직접 긋고 이음매를
          잘라 낸다). 글씨는 **깨끗하다** — 닳은 얼룩을 그리지 않는다. 밑에서 올려다본 큰 건물처럼 위가 좁고, 간판 바로 밑의
          소실점으로 빨려 들어가는 두께가 있다.
        · **올라가는 글** — 조작 안내가 스타워즈의 여는 글처럼 뒤로 누워 올라가다 간판 바로 밑(같은 소실점)에서 사라진다.
        · **깨진 금** — 맞은 자리에서 뻗는 흰 금.
   ② 그 한 장을 통째로 **볼록한 유리에 휘어 붙인다**(세로 띠 → 가로 띠 두 번) — 글자도 글도 금도 같은 면을 따라 휜다.
   ③ 캠코더처럼 **번진다** — 살짝 흐리고, 빨강·초록·파랑을 따로 떠서 옆으로 어긋나게 겹친다(맞는 데는 흰색, 가장자리에만 색).
      금 둘레에서는 크게 갈라진다(깨진 화면). 그 위에 주사선 · 일렁이는 빛 · 가장자리 어둠.
   글씨가 지저분해 보이는 것은 이 ②③ 때문이어야 한다 — 글씨 자체는 깨끗하다.
   차례(TITLE.mode): 'banner' 간판과 올라가는 글(단추 '시작') → 'intro' 여는 글 세 줄 → 'land' 크고 빛나는 '착륙' 단추(아래 '여는 글과 착륙').
   값: 간판·금은 크기가 바뀔 때 한 번만 그려 두고, 프레임마다는 띠 수백 장을 옮겨 붙인다(초당 20번 · 여는 화면에서만).
   ========================================================================== */
const TITLE={mode:'banner', first:true, intro:{t0:0,said:0,keep:false,text:false}, btn:null, ac:null, on:false, timer:0, t0:0, cv:null, cx:null, W:0, H:0, dpr:1, L:null, text:null,
             ban:null, crk:null, txt:null, mid:null, flat:null, bA:null, bB:null, ch:null, out:null, band:null, rays:null, KA:0.22, KB:0.13};

/* ── 스텐실 글자 — 높이 100 칸에 긋는다. w 너비 · draw(c) 줄기 · cuts 잘라 낼 이음매(네모) ── */
const STENCIL=(()=>{
  const S=21, R=17, G={};
  G.C={w:62, cuts:[[28,-1,6,25],[28,76,6,25]], draw(c){ const x0=10.5,x1=51.5,y0=10.5,y1=89.5; c.lineWidth=S; c.beginPath();
    c.moveTo(x1,37); c.lineTo(x1,y0+R); c.arcTo(x1,y0,x1-R,y0,R); c.lineTo(x0+R,y0); c.arcTo(x0,y0,x0,y0+R,R);
    c.lineTo(x0,y1-R); c.arcTo(x0,y1,x0+R,y1,R); c.lineTo(x1-R,y1); c.arcTo(x1,y1,x1,y1-R,R); c.lineTo(x1,63); c.stroke(); }};
  G.S={w:60, cuts:[[27,-1,6,25],[27,76,6,25]], draw(c){ const x0=10.5,x1=49.5,y0=10.5,y1=89.5,ym=50,r=15; c.lineWidth=S; c.beginPath();
    c.moveTo(x1,33); c.lineTo(x1,y0+r); c.arcTo(x1,y0,x1-r,y0,r); c.lineTo(x0+r,y0); c.arcTo(x0,y0,x0,y0+r,r);
    c.lineTo(x0,ym-r); c.arcTo(x0,ym,x0+r,ym,r); c.lineTo(x1-r,ym); c.arcTo(x1,ym,x1,ym+r,r);
    c.lineTo(x1,y1-r); c.arcTo(x1,y1,x1-r,y1,r); c.lineTo(x0+r,y1); c.arcTo(x0,y1,x0,y1-r,r); c.lineTo(x0,67); c.stroke(); }};
  G.A={w:68, cuts:[[31,-1,6,31],[21.5,57,6,24]], draw(c){ c.lineWidth=S; c.lineJoin='miter'; c.miterLimit=3; c.beginPath();
    c.moveTo(9,106); c.lineTo(34,-4); c.lineTo(59,106); c.stroke();
    c.lineWidth=17; c.beginPath(); c.moveTo(19,69); c.lineTo(49,69); c.stroke(); }};
  G.T={w:60, cuts:[[12.5,-1,6,23],[41.5,-1,6,23]], draw(c){ c.lineWidth=S; c.beginPath(); c.moveTo(0,10.5); c.lineTo(60,10.5); c.moveTo(30,0); c.lineTo(30,100); c.stroke(); }};
  G.W={w:94, cuts:[[44,0,6,50]], draw(c){ c.lineWidth=18; c.lineJoin='miter'; c.miterLimit=4; c.beginPath();
    c.moveTo(9,-8); c.lineTo(28,106); c.lineTo(47,16); c.lineTo(66,106); c.lineTo(85,-8); c.stroke(); }};
  G.Y={w:64, cuts:[[0,50,64,5.5]], draw(c){ c.lineWidth=19; c.lineJoin='miter'; c.miterLimit=3; c.beginPath();
    c.moveTo(8,-8); c.lineTo(32,50); c.lineTo(56,-8); c.stroke(); c.beginPath(); c.moveTo(32,46); c.lineTo(32,100); c.stroke(); }};
  return G;
})();
const TITLE_WORD='CASTAWAY', TITLE_GAP=10;
function titleCanvas(w,h){ const c=document.createElement('canvas'); c.width=Math.max(2,Math.round(w)); c.height=Math.max(2,Math.round(h)); return c; }
/* 글자들의 앞면(흰색) — 높이 capH 화소. 이음매는 잘라 냈다. 깨끗하다(얼룩 없음) */
function titleFace(capH){
  const k=capH/100; let tw=-TITLE_GAP; for(const ch of TITLE_WORD) tw+=STENCIL[ch].w+TITLE_GAP;
  const cv=titleCanvas(tw*k+4,capH+4), c=cv.getContext('2d'); let x=2/k;
  for(const ch of TITLE_WORD){ const G=STENCIL[ch];
    c.save(); c.setTransform(k,0,0,k,x*k,2); c.beginPath(); c.rect(-2,0,G.w+4,100); c.clip();       // 위아래를 반듯하게 자른다
    c.strokeStyle='#fff'; c.lineCap='butt'; G.draw(c);
    c.globalCompositeOperation='destination-out'; c.fillStyle='#000'; for(const q of G.cuts) c.fillRect(q[0],q[1],q[2],q[3]);
    c.restore(); x+=G.w+TITLE_GAP; }
  return cv;
}
/* **밑에서 올려다본 큰 건물처럼**(사용자 요청) — 글자의 위쪽을 좁히고 아래쪽을 넓힌다(위쪽 소실점으로 모인다).
   줄마다 가운데를 축으로 너비를 줄여 붙인다: 맨 윗줄 top 배 · 맨 아랫줄 1배. 위로 갈수록 줄 간격도 조금 눌린다(멀어서) */
function titleKeystone(src,top){
  const W=src.width, H=src.height, cv=titleCanvas(W,H), c=cv.getContext('2d');
  for(let y=0;y<H;y++){ const v=y/(H-1), s=top+(1-top)*v, sy=Math.pow(v,0.86)*(H-1);
    c.drawImage(src,0,sy,W,1,(W-W*s)/2,y,W*s,1.02); }
  return cv;
}
/* 색을 입힌다(그림의 알파는 그대로) */
function titleTint(src,fill){ const cv=titleCanvas(src.width,src.height), c=cv.getContext('2d'); c.drawImage(src,0,0); c.globalCompositeOperation='source-in'; c.fillStyle=fill; c.fillRect(0,0,cv.width,cv.height); return cv; }
/* 유리의 휨 — 평평한 그림의 한 점이 휜 그림의 어디로 가나(titleDraw 의 두 번 붙이기와 같은 식). 금 둘레의 띠를 오려 낼 때 쓴다 */
function titleBend(x,y,W,H){
  const T=TITLE, u=(x/W-0.5)*2, y1=H/2+(y-H/2)*(1-T.KA*u*u), v=(y1/H-0.5)*2;
  return [W/2+(x-W/2)*(1-T.KB*v*v), y1];
}

/* ── 크기가 바뀌면 한 번 — 간판(두께까지) · 금 · 올라갈 글 · 일할 그림판들 ── */
function titleLayout(){
  const T=TITLE, dpr=Math.min(2,window.devicePixelRatio||1);
  const W=Math.min(1240,Math.round(innerWidth*0.98)), H=Math.round(clamp(innerHeight*0.70,340,760));
  T.W=W; T.H=H; T.dpr=dpr; T.cv.width=W*dpr; T.cv.height=H*dpr; T.cv.style.width=W+'px'; T.cv.style.height=H+'px';
  /* 안에서는 화면 화소 그대로(배율 1)로 그린다 — 어차피 흐리게 번지는 그림이라 더 촘촘할 까닭이 없고, 띠 붙이기가 그만큼 싸다 */
  const capH=Math.round(Math.min(H*0.30,W/6.4)), by=Math.round(H*0.07);
  const face=titleKeystone(titleFace(capH),0.66), fw=face.width, bx=Math.round(W/2-fw/2);
  const vp={x:W/2, y:by+capH+Math.round(H*0.03)};                    // 소실점 — 간판 바로 밑 가운데
  const sw=Math.min(W*0.76,880), sc={x:(W-sw)/2, y:vp.y+2, w:sw, h:H-vp.y-Math.round(H*0.05)};
  T.L={capH, bx, by, fw, vp, sc};
  /* 간판 — 뒤(어두운 잿빛)에서 앞으로 소실점을 향해 줄여 가며 겹치고, 맨 앞에 흰 앞면 */
  const ban=titleCanvas(W,vp.y+4), b=ban.getContext('2d'), D=22;
  for(let d=D;d>=1;d--){ const k=1-d*0.016, g=Math.round(38+92*(1-d/D));
    b.setTransform(k,0,0,k,vp.x*(1-k),vp.y*(1-k)); b.drawImage(titleTint(face,'rgb('+g+','+g+','+g+')'),bx,by); }
  b.setTransform(1,0,0,1,0,0);
  b.strokeStyle='rgba(255,255,255,.10)'; b.lineWidth=1;              // 소실점으로 모이는 가는 선(아래로 · 위로)
  for(let i=0;i<=16;i++){ const x=bx+fw*i/16; b.beginPath(); b.moveTo(x,by+capH); b.lineTo(vp.x+(x-vp.x)*0.12,vp.y-(vp.y-by-capH)*0.12); b.stroke();
    b.beginPath(); b.moveTo(vp.x+(x-vp.x)*0.66,by); b.lineTo(vp.x+(x-vp.x)*0.585,0); b.stroke(); }
  b.drawImage(face,bx,by);
  T.ban=ban;
  /* 깨진 금 — 맞은 자리(오른쪽 아래)에서 뻗는 금들과 그 둘레를 도는 잔금. 흰 줄뿐이다(색은 번짐에서 나온다) */
  const crk=titleCanvas(W,H), f=crk.getContext('2d'), rnd=mulberry32(0x7e1e), ix=W*0.70, iy=H*0.66, rays=[];
  for(let i=0;i<11;i++){ const big=i%3===0, a=i/11*6.283+rnd()*0.4, L=W*(big?0.34+rnd()*0.22:0.08+rnd()*0.16), n=7, pts=[[ix,iy]]; let x=ix,y=iy,aa=a;
    for(let s=0;s<n;s++){ aa+=(rnd()-0.5)*0.36; x+=Math.cos(aa)*L/n; y+=Math.sin(aa)*L/n; pts.push([x,y]); } pts.big=big; rays.push(pts); }
  const line=(pts,w,al)=>{ f.strokeStyle='rgba(255,255,255,'+al+')'; f.lineWidth=w; f.lineJoin='round'; f.beginPath(); pts.forEach((p,i)=>i?f.lineTo(p[0],p[1]):f.moveTo(p[0],p[1])); f.stroke(); };
  for(const pts of rays) line(pts,pts.big?1.8:1.1,0.95);
  for(let k=1;k<=3;k++) for(let i=0;i<rays.length;i++){ if(rnd()<0.35) continue; const p=rays[i][k], q=rays[(i+1)%rays.length][k];    // 둘레를 도는 잔금
    line([p,[(p[0]+q[0])/2+(rnd()-0.5)*5,(p[1]+q[1])/2+(rnd()-0.5)*5],q],0.8,0.7); }
  f.fillStyle='#fff'; f.beginPath(); f.arc(ix,iy,2.6,0,6.283); f.fill();
  T.crk=crk; T.rays=rays.filter(p=>p.big);                            // 굵은 금 — 그 둘레에서 색이 크게 갈라진다
  T.flat=titleCanvas(W,H); T.bA=titleCanvas(W,H); T.bB=titleCanvas(W,H); T.ch=titleCanvas(W,H); T.out=titleCanvas(W,H);
  T.band=T.rays.map(p=>p.map(q=>titleBend(q[0],q[1],W,H)));
  titleText();
}
/* 올라갈 글 — 시작 화면의 안내 글(#ov .s)과 조작 글쇠(#ov .k)를 긴 그림 한 장에(흰 글씨) */
function titleText(){
  const T=TITLE, w=560, pad=24, lh=30;
  if(!T.text){ const ov=document.getElementById('ov'), s=ov.querySelector('.s'), rows=[...ov.querySelectorAll('.k > div')];
    T.text={intro:s?s.textContent.replace(/\s+/g,' ').trim():'', rows:rows.map(d=>{ const k=d.querySelector('span'); return [k?k.textContent.trim():'', d.textContent.replace(k?k.textContent:'','').replace(/\s+/g,' ').trim()]; })}; }
  const font=(px,b)=>(b?'700 ':'500 ')+px+'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const m=titleCanvas(8,8).getContext('2d'), wrap=(txt,px,maxW)=>{ m.font=font(px); const out=[]; let cur='';
    for(const word of txt.split(' ')){ const t=cur?cur+' '+word:word; if(m.measureText(t).width>maxW&&cur){ out.push(cur); cur=word; } else cur=t; } if(cur) out.push(cur); return out; };
  const intro=wrap(T.text.intro,21,w-pad*2), body=[];
  for(const [k,d] of T.text.rows){ const ls=wrap(d,18,w-pad*2-130); ls.forEach((l,i)=>body.push([i?'':k,l])); }
  const H=pad*2+intro.length*34+40+body.length*lh+60;
  const cv=titleCanvas(w,H), c=cv.getContext('2d'); c.textBaseline='top';
  let y=pad; c.fillStyle='#fff'; c.font=font(21,true); c.textAlign='center'; for(const l of intro){ c.fillText(l,w/2,y); y+=34; } y+=40;
  c.textAlign='left'; for(const [k,l] of body){ if(k){ c.font=font(18,true); c.fillStyle='#fff'; c.fillText(k,pad,y); } c.font=font(18); c.fillStyle='#d8d8d8'; c.fillText(l,pad+130,y); y+=lh; }
  T.txt=cv; T.txtH=H;
  T.mid=titleCanvas(Math.round(T.L.sc.w),Math.round(T.L.sc.h));
}
/* ── 여는 글과 '착륙' ───────────────────────────────────────────────────────
   처음 켰을 때: 단추는 **시작** → 누르면 글 세 줄이 **낱말 하나씩 삐 소리와 함께** 찍힌다 → 다 찍히면 크고 빛나는 **착륙** 단추.
   전부 같은 유리(휨 · 색 번짐 · 주사선)를 거친다. 섬을 다시 만들었을 때(새 섬 · 불러오기)는 글 없이 **착륙 단추만** 뜬다.
   글이 찍히는 동안 화면을 누르거나 Enter 를 치면 건너뛴다 */
const TITLE_LINES=['당신은 돈이 부족해서 이 게임에 참여했습니다.','살아남으세요','증거를 남기세요'], TITLE_WORD_DT=0.24, TITLE_LINE_DT=0.75;
function titleBeep(n){
  try{ const C=TITLE.ac||(TITLE.ac=new (window.AudioContext||window.webkitAudioContext)()); if(C.state==='suspended') C.resume();
    const o=C.createOscillator(), g=C.createGain(), t=C.currentTime, vol=0.07*(typeof SET!=='undefined'&&SET.vol!==undefined?clamp(+SET.vol,0,1):1);
    o.type='square'; o.frequency.value=n%5===0?660:880; o.connect(g); g.connect(C.destination);
    g.gain.setValueAtTime(Math.max(0.0001,vol),t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.07); o.start(t); o.stop(t+0.08); }catch(e){}
}
function titleIntroFlat(a,t,W,H){
  const T=TITLE, I=T.intro, el=(performance.now()-I.t0)/1000;
  const fs=Math.round(clamp(W/27,20,42)), lh=fs*2.0, FONT='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  a.textBaseline='middle'; a.textAlign='left'; a.fillStyle='#fff';
  if(I.text){
    a.font='700 '+fs+'px '+FONT;
    let tt=0.45, shown=0, cx=0, cy=0; const y0=H*0.20;
    for(let li=0;li<TITLE_LINES.length;li++){ const words=TITLE_LINES[li].split(' '); let x=W/2-a.measureText(TITLE_LINES[li]).width/2; const y=y0+li*lh;
      for(const w of words){ if(I.keep||el>=tt){ a.fillText(w,x,y); shown++; cx=x+a.measureText(w).width; cy=y; } x+=a.measureText(w+' ').width; tt+=TITLE_WORD_DT; }
      tt+=TITLE_LINE_DT; }
    if(!I.keep){
      if(shown>I.said){ I.said=shown; titleBeep(shown); }
      if(shown&&Math.floor(t*3)%2===0) a.fillRect(cx+fs*0.18,cy-fs*0.5,fs*0.5,fs);          // 깜빡이는 글 끝
      if(el>tt+0.25){ I.keep=true; T.mode='land'; I.tl=performance.now(); }
    }
  }
  if(T.mode==='land'){
    /* 크고 빛나는 '착륙' — 숨 쉬듯 밝아졌다 어두워진다. 누를 자리(T.btn)를 적어 둔다 */
    const p=0.5+0.5*Math.sin(t*3.0), bw=clamp(W*0.30,230,430), bh=clamp(H*0.21,86,150), bx=W/2-bw/2, by=I.text?H*0.60:H*0.5-bh/2, r=bh*0.16;
    const rr=()=>{ a.beginPath(); a.moveTo(bx+r,by); a.arcTo(bx+bw,by,bx+bw,by+bh,r); a.arcTo(bx+bw,by+bh,bx,by+bh,r); a.arcTo(bx,by+bh,bx,by,r); a.arcTo(bx,by,bx+bw,by,r); a.closePath(); };
    a.save(); a.shadowColor='#fff'; a.shadowBlur=22+34*p; rr(); a.fillStyle='rgba(255,255,255,'+(0.10+0.10*p).toFixed(3)+')'; a.fill();
    a.lineWidth=5; a.strokeStyle='#fff'; a.stroke(); a.shadowBlur=14+22*p;
    a.fillStyle='#fff'; a.font='800 '+Math.round(bh*0.50)+'px '+FONT; a.textAlign='center'; a.fillText('착륙',W/2,by+bh*0.53); a.restore();
    T.btn={x:bx,y:by,w:bw,h:bh};
  }else T.btn=null;
}
/* 차례를 바꾼다 — 'banner'(간판 · 시작 단추) · 'intro'(여는 글) · 'land'(착륙 단추). 멈춰 있었으면 다시 돈다 */
function titleEnter(mode,text){
  const T=TITLE, ov=document.getElementById('ov'); if(!ov) return;
  T.mode=mode; T.intro={t0:performance.now(), said:0, keep:mode==='land'&&!!text, text:mode==='intro'||!!text}; T.btn=null;
  ov.classList.add('title'); ov.classList.toggle('tland',mode!=='banner');
  titleStart();
}
/* 섬을 다 지었을 때(90-init.js 가 부른다) — 처음이면 간판과 '시작', 다시 만든 섬이면 곧장 '착륙' 단추만 */
function titleAfterGen(){
  const b=document.getElementById('bStart');
  if(TITLE.first){ b.textContent='시작'; titleEnter('banner'); }
  else{ b.textContent='착륙'; titleEnter('land',false); }
}
function titleLand(){ TITLE.first=false; titleStop(); start(); }
/* 누른 자리가 '착륙' 단추 안인가 — 단추의 네 귀를 유리의 휨대로 옮겨 그 테두리 상자로 본다 */
function titleHit(ev){
  const T=TITLE, b=T.btn; if(!b||!T.flat) return false;
  const r=T.cv.getBoundingClientRect(), x=(ev.clientX-r.left)/r.width*T.flat.width, y=(ev.clientY-r.top)/r.height*T.flat.height, W=T.flat.width, H=T.flat.height;
  const c=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(q=>titleBend(q[0],q[1],W,H));
  return x>=Math.min(c[0][0],c[2][0])-6&&x<=Math.max(c[1][0],c[3][0])+6&&y>=Math.min(c[0][1],c[1][1])-6&&y<=Math.max(c[2][1],c[3][1])+6;
}
{ const cv=document.getElementById('ovArt'), bs=document.getElementById('bStart'), titleUp=()=>{ const ov=document.getElementById('ov'); return TITLE.on&&ov&&ov.classList.contains('title')&&ov.style.display!=='none'; };
  /* '시작' — 처음 여는 화면에서만 가로챈다(멈춤 화면의 '계속' · 쓰러진 뒤의 '깨어나기'는 그대로 start 로 간다) */
  if(bs) bs.addEventListener('click',ev=>{ if(!titleUp()||TITLE.mode!=='banner') return; ev.stopImmediatePropagation(); ev.preventDefault();
    if(typeof gameHours!=='undefined'&&gameHours>=0.01) titleEnter('land',false);      // 저장을 불러왔다 — 여는 글은 건너뛴다
    else titleEnter('intro'); });
  if(cv){
    cv.addEventListener('click',ev=>{ if(!titleUp()) return;
      if(TITLE.mode==='intro'){ TITLE.intro.keep=true; TITLE.mode='land'; return; }       // 글이 찍히는 중에 누르면 건너뛴다
      if(TITLE.mode==='land'&&titleHit(ev)) titleLand(); });
    cv.addEventListener('mousemove',ev=>{ cv.style.cursor=(TITLE.mode==='land'&&titleHit(ev))?'pointer':'default'; });
  }
  addEventListener('keydown',ev=>{ if(!titleUp()||(ev.code!=='Enter'&&ev.code!=='NumpadEnter')) return;
    if(typeof busy!=='undefined'&&busy) return;
    if(document.getElementById('ask')&&document.getElementById('ask').style.display==='flex') return;   // 묻는 상자가 떠 있으면 그쪽이 먼저
    ev.preventDefault();
    if(TITLE.mode==='banner'){ if(bs&&bs.style.display!=='none') bs.click(); }
    else if(TITLE.mode==='intro'){ TITLE.intro.keep=true; TITLE.mode='land'; }
    else titleLand(); });
}
/* ── 프레임 ── */
function titleDraw(now){
  const T=TITLE, L=T.L, sc=L.sc, W=T.flat.width, H=T.flat.height, t=(now-T.t0)/1000;
  /* ① 평평한 그림 — 검은 바탕 위에, 차례(mode)에 따라: 간판과 올라가는 글 / 여는 글 / 큰 '착륙' 단추 */
  const a=T.flat.getContext('2d'); a.setTransform(1,0,0,1,0,0); a.globalCompositeOperation='source-over'; a.shadowBlur=0; a.fillStyle='#000'; a.fillRect(0,0,W,H);
  let g;
  if(T.mode==='banner'){
    const m=T.mid.getContext('2d'), mw=T.mid.width, mh=T.mid.height, K=0.24, span=T.txtH*0.66;
    m.setTransform(1,0,0,1,0,0); m.globalCompositeOperation='source-over'; m.clearRect(0,0,mw,mh);
    const scroll=((t*26)%(T.txtH+sc.h*0.9))-sc.h*0.30;                 // 글 그림에서 화면 맨 아랫줄이 읽는 자리
    const tear=(Math.floor(t*0.7)%5===0)?Math.floor((t*3.1%1)*mh):-99; // 가끔 한 띠가 옆으로 밀린다(낡은 수신)
    for(let j=0;j<mh;j+=2){ const v=j/mh, z=1/(K+(1-K)*v), sy=scroll-(z-1)/(1/K-1)*span; if(sy<0||sy>=T.txt.height-2) continue;
      const wj=mw/z*0.96, off=((j>tear&&j<tear+9)?7:0)+Math.sin(j*0.035+t*2.3)*1.5*v;     // 줄마다 살짝 물결친다
      m.drawImage(T.txt,0,sy,T.txt.width,2*z,(mw-wj)/2+off,j,wj,2); }
    m.globalCompositeOperation='destination-out';                      // 위로 갈수록 사라진다(간판 바로 밑)
    g=m.createLinearGradient(0,0,0,mh*0.42); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.4,'rgba(0,0,0,.8)'); g.addColorStop(1,'rgba(0,0,0,0)'); m.fillStyle=g; m.fillRect(0,0,mw,mh*0.42);
    a.drawImage(T.mid,sc.x,sc.y); a.drawImage(T.ban,0,0);
  }else titleIntroFlat(a,t,W,H);
  /* 빛이 일렁인다 — 밝은 띠 둘이 서로 다른 빠르기로 훑고 내려간다(검은 데는 그대로 검다 — 흰 것만 더 밝거나 어두워진다) */
  a.globalCompositeOperation='multiply';
  { const base=0.80+0.05*Math.sin(t*9)+0.03*Math.sin(t*23), stops=[[0,base],[1,base]];
    for(const p of [((t*0.13)%1.3-0.15),((t*0.31+0.4)%1.3-0.15)]) stops.push([p-0.12,base],[p,1.0],[p+0.12,base]);
    g=a.createLinearGradient(0,0,0,H);
    stops.filter(s=>s[0]>=0&&s[0]<=1).sort((x,y)=>x[0]-y[0]).forEach(s=>{ const v=Math.round(255*Math.min(1,s[1])); g.addColorStop(s[0],'rgb('+v+','+v+','+v+')'); }); }
  a.fillStyle=g; a.fillRect(0,0,W,H);
  a.globalCompositeOperation='source-over'; a.drawImage(T.crk,0,0);
  /* ② 통째로 볼록한 유리에 휘어 붙인다 — 세로 띠마다 높이를 줄이고(가로줄이 휜다), 이어서 가로 띠마다 너비를 줄인다(세로줄이 휜다) */
  const A=T.bA.getContext('2d'), B=T.bB.getContext('2d'), S=4;
  A.setTransform(1,0,0,1,0,0); A.fillStyle='#000'; A.fillRect(0,0,W,H);
  for(let x=0;x<W;x+=S){ const u=((x+S/2)/W-0.5)*2, k=1-T.KA*u*u; A.drawImage(T.flat,x,0,S,H,x,H/2-H*k/2,S,H*k); }
  B.setTransform(1,0,0,1,0,0); B.fillStyle='#000'; B.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=S){ const v=((y+S/2)/H-0.5)*2, k=1-T.KB*v*v; B.drawImage(T.bA,0,y,W,S,W/2-W*k/2,y,W*k,S); }
  /* ③ 캠코더의 번짐 — 살짝 흐리게, 빨강·초록·파랑을 따로 떠서 옆으로 어긋나게 겹친다. 금 둘레에서는 크게 갈라진다 */
  const O=T.out.getContext('2d'), C=T.ch.getContext('2d'), jig=(Math.floor(t*14)%29===0)?3:0;
  O.setTransform(1,0,0,1,0,0); O.globalCompositeOperation='source-over'; O.globalAlpha=1; try{ O.filter='none'; }catch(e){}
  O.fillStyle='#000'; O.fillRect(0,0,W,H);
  const split=[['#ff0000',-1.8-jig],['#00ff00',0],['#0000ff',1.8+jig]];
  for(let pass=0;pass<2;pass++){
    if(pass){ O.save(); O.beginPath();                                // 금을 따라 둥근 점을 이어 오려 낸 띠 — 그 안에서만 한 번 더, 멀리 갈라 겹친다
      for(const p of T.band) for(let i=0;i<p.length-1;i++) for(let k=0;k<=3;k++){ const x=p[i][0]+(p[i+1][0]-p[i][0])*k/3, y=p[i][1]+(p[i+1][1]-p[i][1])*k/3; O.moveTo(x+24,y); O.arc(x,y,24,0,6.283); }
      O.clip(); O.globalCompositeOperation='source-over'; O.fillStyle='#000'; O.fillRect(0,0,W,H); }
    for(const [col,dx] of split){
      C.setTransform(1,0,0,1,0,0); C.globalCompositeOperation='copy'; C.drawImage(T.bB,0,0); C.globalCompositeOperation='multiply'; C.fillStyle=col; C.fillRect(0,0,W,H);
      O.globalCompositeOperation='lighter'; try{ O.filter=pass?'blur(1.1px)':'blur(0.7px)'; }catch(e){}
      O.drawImage(T.ch,pass?dx*5:dx,pass?(dx<0?3:dx>0?-3:0):0); }
    if(pass) O.restore();
  }
  try{ O.filter='none'; }catch(e){} O.globalCompositeOperation='source-over';
  O.fillStyle='rgba(0,0,0,.26)'; for(let y=0;y<H;y+=3) O.fillRect(0,y,W,1);                                                  // 주사선
  /* 가장자리 어둠 — 볼록한 유리의 둘레는 어둡게 물러난다. 밖으로는 투명하게 녹여 네모난 판이 안 보이게 한다 */
  O.globalCompositeOperation='destination-in';
  g=O.createRadialGradient(W/2,H/2,Math.min(W,H)*0.30,W/2,H/2,Math.max(W,H)*0.60); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.75,'rgba(0,0,0,.82)'); g.addColorStop(1,'rgba(0,0,0,0)');
  O.fillStyle=g; O.fillRect(0,0,W,H);
  O.globalCompositeOperation='destination-out';                       // 네 변도 따로 녹인다(둥근 어둠만으로는 가까운 변이 칼같이 남는다)
  for(const [x0,y0,x1,y1,rx,ry,rw,rh] of [[0,0,0,H*0.14,0,0,W,H*0.14],[0,H,0,H*0.86,0,H*0.86,W,H*0.14],[0,0,W*0.10,0,0,0,W*0.10,H],[W,0,W*0.90,0,W*0.90,0,W*0.10,H]]){
    g=O.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)'); O.fillStyle=g; O.fillRect(rx,ry,rw,rh); }
  O.globalCompositeOperation='source-over';
  const c=T.cx; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,T.cv.width,T.cv.height); c.imageSmoothingEnabled=true; c.drawImage(T.out,0,0,T.cv.width,T.cv.height);
}
function titleTick(){
  const T=TITLE, ov=document.getElementById('ov');
  if(!ov||!ov.classList.contains('title')||ov.style.display==='none'){ titleStop(); return; }
  if(document.hidden) return;
  if(!T.L||Math.abs(T.W-Math.min(1240,Math.round(innerWidth*0.98)))>2||Math.abs(T.H-Math.round(clamp(innerHeight*0.70,340,760)))>2){ try{ titleLayout(); }catch(e){ console.warn('[여는 화면]',e); titleStop(); return; } }
  try{ titleDraw(performance.now()); }catch(e){ console.warn('[여는 화면]',e); titleStop(); }
}
function titleStart(){
  const T=TITLE; if(T.on) return;
  T.cv=document.getElementById('ovArt'); if(!T.cv||!T.cv.getContext) return;
  T.cx=T.cv.getContext('2d'); T.on=true; T.t0=performance.now();
  T.timer=setInterval(titleTick,50); titleTick();
}
function titleStop(){ const T=TITLE; if(!T.on) return; T.on=false; clearInterval(T.timer); const ov=document.getElementById('ov'); ov.classList.remove('title'); ov.classList.remove('tland'); }
titleStart();
