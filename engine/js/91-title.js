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
const TITLE={mode:'banner', first:true, intro:{t0:0,said:0,keep:false,text:false}, btns:[], hov:null, fr:0, nz:null, ac:null, on:false, timer:0, t0:0, cv:null, cx:null, W:0, H:0, dpr:1, L:null, text:null,
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
  /* D · E — 쓰러졌을 때의 'DEAD'(같은 군용 스텐실 글씨) */
  G.D={w:64, cuts:[[24,-1,6,25],[24,76,6,25]], draw(c){ const x0=10.5,x1=53.5,y0=10.5,y1=89.5,r=26; c.lineWidth=S; c.lineJoin='miter'; c.beginPath();
    c.moveTo(x0,y0); c.lineTo(x1-r,y0); c.arcTo(x1,y0,x1,y0+r,r); c.lineTo(x1,y1-r); c.arcTo(x1,y1,x1-r,y1,r); c.lineTo(x0,y1); c.closePath(); c.stroke(); }};
  G.E={w:56, cuts:[[22,-1,6,25],[22,76,6,25],[22,40,6,21]], draw(c){ c.lineWidth=S; c.lineJoin='miter'; c.beginPath();
    c.moveTo(52,10.5); c.lineTo(10.5,10.5); c.lineTo(10.5,89.5); c.lineTo(52,89.5); c.moveTo(10.5,50); c.lineTo(46,50); c.stroke(); }};
  G.Y={w:64, cuts:[[0,50,64,5.5]], draw(c){ c.lineWidth=19; c.lineJoin='miter'; c.miterLimit=3; c.beginPath();
    c.moveTo(8,-8); c.lineTo(32,50); c.lineTo(56,-8); c.stroke(); c.beginPath(); c.moveTo(32,46); c.lineTo(32,100); c.stroke(); }};
  return G;
})();
const TITLE_WORD='CASTAWAY', TITLE_GAP=10;
function titleCanvas(w,h){ const c=document.createElement('canvas'); c.width=Math.max(2,Math.round(w)); c.height=Math.max(2,Math.round(h)); return c; }
/* 글자들의 앞면(흰색) — 높이 capH 화소. 이음매는 잘라 냈다. 깨끗하다(얼룩 없음) */
function titleFace(capH,word){
  word=word||TITLE_WORD;
  const k=capH/100; let tw=-TITLE_GAP; for(const ch of word) tw+=STENCIL[ch].w+TITLE_GAP;
  const cv=titleCanvas(tw*k+4,capH+4), c=cv.getContext('2d'); let x=2/k;
  for(const ch of word){ const G=STENCIL[ch];
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
/* 판의 크기 — 설정·끝내기 단추와 진행 막대도 캔버스가 그리므로(사용자 요청) 화면 높이의 92% 까지 쓴다 */
const titleSize=()=>[Math.min(1240,Math.round(innerWidth*0.98)), Math.round(clamp(innerHeight*0.92,340,940))];
function titleLayout(){
  const T=TITLE, dpr=Math.min(2,window.devicePixelRatio||1);
  const [W,H]=titleSize();
  T.W=W; T.H=H; T.dpr=dpr; T.cv.width=W*dpr; T.cv.height=H*dpr; T.cv.style.width=W+'px'; T.cv.style.height=H+'px';
  /* 안에서는 화면 화소 그대로(배율 1)로 그린다 — 어차피 흐리게 번지는 그림이라 더 촘촘할 까닭이 없고, 띠 붙이기가 그만큼 싸다 */
  const capH=Math.round(Math.min(H*0.30,W/6.4)), by=Math.round(H*0.07);
  const face=titleKeystone(titleFace(capH),0.66), fw=face.width, bx=Math.round(W/2-fw/2);
  const vp={x:W/2, y:by+capH+Math.round(H*0.03)};                    // 소실점 — 간판 바로 밑 가운데
  const sw=Math.min(W*0.76,880), sc={x:(W-sw)/2, y:vp.y+2, w:sw, h:Math.round(H*0.73)-vp.y};
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
  /* **금에도 명암이 있다**(사용자 요청) — 유리의 금은 한쪽 날이 빛을 받아 희고 맞은편 날은 그늘져 어둡다. 금마다 ① 어두운 그늘 줄(오른쪽
     아래로 조금 비켜) ② 흰 날(가운데) ③ 그 곁의 엷은 빛 번짐을 겹친다. 맞은 자리에서 멀어질수록 가늘어지고 옅어진다(끝은 녹아 사라진다).
     맞은 자리에는 잔금이 둥글게 몰리고 작은 빛점이 남는다 */
  const seg=(pts,w0,a0)=>{ const n=pts.length-1;
    for(let i=0;i<n;i++){ const t=i/n, w=w0*Math.pow(1-t,0.55)+0.35, al=a0*(1-0.75*t), p=pts[i], q=pts[i+1];
      f.lineCap='round';
      f.strokeStyle='rgba(0,0,0,'+(0.85*al).toFixed(3)+')'; f.lineWidth=w*2.6; f.beginPath(); f.moveTo(p[0]+1.4,p[1]+1.6); f.lineTo(q[0]+1.4,q[1]+1.6); f.stroke();
      f.strokeStyle='rgba(255,255,255,'+(0.18*al).toFixed(3)+')'; f.lineWidth=w*4.5; f.beginPath(); f.moveTo(p[0],p[1]); f.lineTo(q[0],q[1]); f.stroke();
      f.strokeStyle='rgba(255,255,255,'+al.toFixed(3)+')'; f.lineWidth=w; f.beginPath(); f.moveTo(p[0]-0.4,p[1]-0.5); f.lineTo(q[0]-0.4,q[1]-0.5); f.stroke(); } };
  for(const pts of rays) seg(pts,pts.big?2.2:1.3,0.95);
  for(let k=1;k<=3;k++) for(let i=0;i<rays.length;i++){ if(rnd()<0.35) continue; const p=rays[i][k], q=rays[(i+1)%rays.length][k];    // 둘레를 도는 잔금
    seg([p,[(p[0]+q[0])/2+(rnd()-0.5)*5,(p[1]+q[1])/2+(rnd()-0.5)*5],q],0.9,0.65-k*0.12); }
  { const g0=f.createRadialGradient(ix,iy,0,ix,iy,W*0.05); g0.addColorStop(0,'rgba(255,255,255,.55)'); g0.addColorStop(0.25,'rgba(255,255,255,.12)'); g0.addColorStop(1,'rgba(255,255,255,0)');
    f.fillStyle=g0; f.beginPath(); f.arc(ix,iy,W*0.05,0,6.283); f.fill(); }
  f.fillStyle='#fff'; f.beginPath(); f.arc(ix,iy,2.2,0,6.283); f.fill();
  T.crk=crk; T.rays=rays.filter(p=>p.big);                            // 굵은 금 — 그 둘레에서 색이 크게 갈라진다
  { const f=titleFace(Math.round(capH*0.95),'DEAD'); T.deadF=titleTint(f,'#e8322a'); T.deadB=titleTint(f,'#4a0806'); }   // 쓰러졌을 때(빨강 · 짙은 그늘)
  T.flat=titleCanvas(W,H); T.bA=titleCanvas(W,H); T.bB=titleCanvas(W,H); T.ch=titleCanvas(W,H); T.out=titleCanvas(W,H);
  T.band=T.rays.map(p=>p.map(q=>titleBend(q[0],q[1],W,H)));
  /* 눈(잡음) — 안테나가 못 잡은 신호처럼 자글거리는 점. 거의 검고 가끔 흰 점(세제곱으로 눌러 둔다) · 가끔 한 줄이 통째로 밝다.
     세 장을 돌려 가며 자리를 마구 옮겨 깐다 */
  T.nz=[0,1,2].map(()=>{ const c=titleCanvas(160,160), x=c.getContext('2d'), im=x.createImageData(160,160), d=im.data;
    for(let y=0;y<160;y++){ const row=Math.random()<0.04?0.35:0;
      for(let i=y*640;i<(y+1)*640;i+=4){ const r=Math.random(), v=Math.min(255,(r*r*r+row*Math.random())*255); d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; } }
    x.putImageData(im,0,0); return c; });
  titleText();
}
/* 올라갈 글 — 시작 화면의 안내 글(#ov .s)과 조작 글쇠(#ov .k)를 긴 그림 한 장에(흰 글씨) */
function titleText(){
  const T=TITLE, w=560, pad=24, lh=30;
  if(!T.text){ const ov=document.getElementById('ov'), s=ov.querySelector('.s'), rows=[...ov.querySelectorAll('.k > div')];
    T.text={intro:'', rows:rows.map(d=>{ const k=d.querySelector('span'); return [k?k.textContent.trim():'', d.textContent.replace(k?k.textContent:'','').replace(/\s+/g,' ').trim()]; })}; }
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
/* 여는 글(사용자 요청 — 2026-10-15) — 한 화면에 한 줄. **한 글자씩** 찍히고 글자마다 **같은 소리**가 같은 박자로 난다.
   다 찍히면 잠깐 머물고 → 검은 화면 → 다음 줄. 둘째 줄의 '1일 16시간' 은 실제 40분이다(게임 1시간 = 실제 1분 · 99-main.js) */
const TITLE_LINES=['큰 돈을 노리던 당신은 불법 게임에 참가했습니다','섬에서 1일 16시간을 살아남으세요','행운을 빌겠습니다'];
const TITLE_CH_DT=0.085, TITLE_HOLD=1.7, TITLE_BLACK=0.7, TITLE_LEAD=0.6;   // 글자 간격 · 다 찍힌 뒤 머무름 · 줄 사이 검은 화면 · 처음 기다림
function titleBeep(){
  try{ const C=TITLE.ac||(TITLE.ac=new (window.AudioContext||window.webkitAudioContext)()); if(C.state==='suspended') C.resume();
    const o=C.createOscillator(), g=C.createGain(), t=C.currentTime, vol=0.06*(typeof SET!=='undefined'&&SET.vol!==undefined?clamp(+SET.vol,0,1):1);
    o.type='square'; o.frequency.value=760; o.connect(g); g.connect(C.destination);           // 늘 같은 높이 · 같은 길이 · 같은 세기
    g.gain.setValueAtTime(Math.max(0.0001,vol),t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05); o.start(t); o.stop(t+0.06); }catch(e){}
}
/* 지금 몇째 줄을 몇 글자까지 — {li, n, black, done} */
function titleIntroAt(el){
  let t=TITLE_LEAD;
  for(let li=0;li<TITLE_LINES.length;li++){ const L=[...TITLE_LINES[li]].length, typ=L*TITLE_CH_DT;
    if(el<t+typ+TITLE_HOLD) return {li, n:el<t?0:Math.min(L,Math.floor((el-t)/TITLE_CH_DT)+1), black:el<t, done:el>=t+typ};
    t+=typ+TITLE_HOLD;
    if(el<t+TITLE_BLACK) return {li, n:0, black:true, done:false};
    t+=TITLE_BLACK; }
  return null;                                                          // 다 끝났다
}
function titleIntroFlat(a,t,W,H){
  const T=TITLE, I=T.intro, el=(performance.now()-I.t0)/1000;
  const fs=Math.round(clamp(W/30,20,40)), FONT='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  a.textBaseline='middle'; a.textAlign='left';
  /* **형광막의 결** — 위가 밝고 아래로 갈수록 조금 어둡고, 둘레로 엷은 빛이 번진다 */
  { const gr=a.createLinearGradient(0,H*0.30,0,H*0.62); gr.addColorStop(0,'#ffffff'); gr.addColorStop(0.55,'#e6e6e6'); gr.addColorStop(1,'#b4b4b4'); a.fillStyle=gr; }
  a.shadowColor='rgba(255,255,255,.55)'; a.shadowBlur=fs*0.45;
  if(I.text&&!I.keep){
    const st=titleIntroAt(el);
    if(!st){ I.keep=true; I.text=false; T.mode='land'; I.tl=performance.now(); }
    else if(!st.black){
      a.font='700 '+fs+'px '+FONT;
      const chars=[...TITLE_LINES[st.li]], full=TITLE_LINES[st.li], shown=chars.slice(0,st.n).join(''), x=W/2-a.measureText(full).width/2, y=H*0.46;
      a.fillText(shown,x,y);
      const key=st.li*1000+st.n; if(key>I.said){ I.said=key; titleBeep(); }   // 글자 하나마다 한 번
      if(!st.done||Math.floor(t*3)%2===0) a.fillRect(x+a.measureText(shown).width+fs*0.14,y-fs*0.5,fs*0.5,fs);   // 글 끝 — 찍는 동안은 늘 · 다 찍히면 깜빡
    }
  }
  a.shadowBlur=0;
  if(T.mode==='land'){
    /* 크고 빛나는 '착륙' — 숨 쉬듯 밝아졌다 어두워진다. 누를 자리는 T.btns 에 적힌다 */
    const bw=clamp(W*0.30,230,430), bh=clamp(H*0.21,86,150);
    titleButton(a,'착륙',W/2-bw/2,H*0.5-bh/2,bw,bh,t,'land');
  }
}
/* 브라운관에 비친 단추 — 둥근 네모 · 위가 밝은 결 · 숨 쉬는 빛무리. 누를 자리를 돌려준다 */
/* act — 누르면 할 일('start' · 'land' · 'opt' · 'quit'). 작은 단추(설정·끝내기)는 빛무리가 약하고 숨 쉬지 않는다 · 손이 올라가면 밝아진다 */
function titleButton(a,label,bx,by,bw,bh,t,act,small){
    const FONT='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif', hot=TITLE.hov===act, r=bh*0.16;
    const p=small?(hot?0.75:0.15):Math.min(1,0.5+0.5*Math.sin(t*3.0)+(hot?0.35:0)), k=small?0.5:1;
    const rr=()=>{ a.beginPath(); a.moveTo(bx+r,by); a.arcTo(bx+bw,by,bx+bw,by+bh,r); a.arcTo(bx+bw,by+bh,bx,by+bh,r); a.arcTo(bx,by+bh,bx,by,r); a.arcTo(bx,by,bx+bw,by,r); a.closePath(); };
    a.save(); a.shadowColor='#fff'; a.shadowBlur=(22+34*p)*k; rr();
    { const gf=a.createLinearGradient(0,by,0,by+bh); gf.addColorStop(0,'rgba(255,255,255,'+((0.20+0.12*p)*k).toFixed(3)+')'); gf.addColorStop(1,'rgba(255,255,255,'+((0.04+0.06*p)*k).toFixed(3)+')'); a.fillStyle=gf; } a.fill();   // 단추 안은 위가 밝다
    a.lineWidth=small?3:5; { const gs=a.createLinearGradient(0,by,0,by+bh); gs.addColorStop(0,small&&!hot?'#d0d0d0':'#ffffff'); gs.addColorStop(1,small&&!hot?'#7a7a7a':'#a8a8a8'); a.strokeStyle=gs; } a.stroke(); a.shadowBlur=(14+22*p)*k;
    { const gt=a.createLinearGradient(0,by+bh*0.25,0,by+bh*0.8); gt.addColorStop(0,small&&!hot?'#e2e2e2':'#ffffff'); gt.addColorStop(1,small&&!hot?'#9a9a9a':'#c4c4c4'); a.fillStyle=gt; }
    a.font=(small?'700 ':'800 ')+Math.round(bh*0.50)+'px '+FONT; a.textAlign='center'; a.textBaseline='middle'; a.fillText(label,bx+bw/2,by+bh*0.53); a.restore();
    const b={x:bx,y:by,w:bw,h:bh,act}; TITLE.btns.push(b); return b;
}
/* 아래 줄 — 작은 '설정'(· 데스크톱이면 '끝내기'). 바깥의 HTML 단추는 감추고(game.css) 누르면 그 단추를 대신 누른다 */
function titleSmallRow(a,t,W,H){
  const q=document.getElementById('bQuit'), hasQ=!!(q&&q.style.display!=='none');
  const bw=clamp(W*0.11,96,150), bh=clamp(H*0.055,30,44), gap=bw*0.22, y=H*0.895-bh/2;
  const x0=W/2-(hasQ?bw+gap/2:bw/2);
  titleButton(a,'설정',x0,y,bw,bh,t,'opt',true);
  if(hasQ) titleButton(a,'끝내기',x0+bw+gap,y,bw,bh,t,'quit',true);
}
/* 진행 막대 — 섬을 만드는 동안 '시작' 자리에. 텔레비전 화면 표시(OSD)처럼 칸 스물넷이 차오르고, 차오르는 칸은 깜빡인다.
   위에 지금 하는 일(90-init.js phase 가 #ovLoad · #barF 에 적는 것)과 몇 % 인지 */
function titleProgress(a,t,W,H){
  const T=TITLE, FONT='"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const bf=document.getElementById('barF'), ld=document.getElementById('ovLoad');
  const tgt=clamp((parseFloat(bf&&bf.style.width)||0)/100,0,1);
  T.pg=(T.pg===undefined||tgt<T.pg)?tgt:T.pg+(tgt-T.pg)*0.3;          // 새 섬이면 0 부터 · 아니면 부드럽게 따라간다
  const n=24, bw=clamp(W*0.36,240,460), bh=Math.max(12,Math.round(H*0.022)), x=W/2-bw/2, y=H*0.80-bh/2, gap=3, cw=(bw-8-gap*(n-1))/n;
  const fs=Math.round(clamp(W/52,14,22));
  a.save(); a.shadowColor='rgba(255,255,255,.6)'; a.shadowBlur=fs*0.5;
  { const gt=a.createLinearGradient(0,y-fs*2,0,y); gt.addColorStop(0,'#ffffff'); gt.addColorStop(1,'#bcbcbc'); a.fillStyle=gt; }
  a.font='700 '+fs+'px '+FONT; a.textAlign='center'; a.textBaseline='bottom';
  a.fillText(((ld&&ld.textContent)||'섬을 만드는 중')+'   '+Math.round(T.pg*100)+'%',W/2,y-fs*0.7);
  a.lineWidth=2; a.strokeStyle='#bdbdbd'; a.strokeRect(x,y,bw,bh);
  const lead=Math.floor(T.pg*n), blink=Math.floor(t*4)%2===0;
  for(let i=0;i<n;i++){
    const al=i<lead?1:(i===lead&&T.pg<1?(blink?0.55:0.2):0.06);
    const g=a.createLinearGradient(0,y,0,y+bh); g.addColorStop(0,'rgba(255,255,255,'+al+')'); g.addColorStop(1,'rgba(170,170,170,'+al+')');
    a.fillStyle=g; a.fillRect(x+4+i*(cw+gap),y+4,cw,bh-8); }
  a.restore();
}
/* 차례를 바꾼다 — 'banner'(간판 · 시작 단추) · 'intro'(여는 글) · 'land'(착륙 단추). 멈춰 있었으면 다시 돈다 */
function titleEnter(mode,text){
  const T=TITLE, ov=document.getElementById('ov'); if(!ov) return;
  T.mode=mode; T.intro={t0:performance.now(), said:0, keep:mode==='land'&&!!text, text:mode==='intro'||!!text}; T.btns=[];
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
/* 누른 자리의 단추(없으면 null) — 단추의 네 귀를 유리의 휨대로 옮겨 그 테두리 상자로 본다 */
function titleHit(ev){
  const T=TITLE; if(!T.flat) return null;
  const r=T.cv.getBoundingClientRect(), x=(ev.clientX-r.left)/r.width*T.flat.width, y=(ev.clientY-r.top)/r.height*T.flat.height, W=T.flat.width, H=T.flat.height;
  for(const b of T.btns){
    const c=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(q=>titleBend(q[0],q[1],W,H));
    if(x>=Math.min(c[0][0],c[2][0])-6&&x<=Math.max(c[1][0],c[3][0])+6&&y>=Math.min(c[0][1],c[1][1])-6&&y<=Math.max(c[2][1],c[3][1])+6) return b; }
  return null;
}
{ const cv=document.getElementById('ovArt'), bs=document.getElementById('bStart'), titleUp=()=>{ const ov=document.getElementById('ov'); return TITLE.on&&ov&&ov.classList.contains('title')&&ov.style.display!=='none'; };
  /* '시작' — 처음 여는 화면에서만 가로챈다(멈춤 화면의 '계속' · 쓰러진 뒤의 '깨어나기'는 그대로 start 로 간다) */
  if(bs) bs.addEventListener('click',ev=>{ if(!titleUp()||TITLE.mode!=='banner') return; ev.stopImmediatePropagation(); ev.preventDefault();
    if(typeof gameHours!=='undefined'&&gameHours>=0.01) titleEnter('land',false);      // 저장을 불러왔다 — 여는 글은 건너뛴다
    else titleEnter('intro'); });
  if(cv){
    cv.addEventListener('click',ev=>{ if(!titleUp()) return;
      const b=titleHit(ev), act=b&&b.act;
      if(act==='opt'||act==='quit'){ const e=document.getElementById(act==='opt'?'bOpt':'bQuit'); if(e) e.click(); return; }   // 화면 안의 '설정' · '끝내기'
      if(TITLE.mode==='intro'){ TITLE.intro.keep=true; TITLE.mode='land'; return; }       // 글이 찍히는 중에 누르면 건너뛴다
      if(act==='land') titleLand();
      else if(act==='start'&&bs) bs.click();
      else if(act==='wake'&&bs) bs.click(); });                                          // 쓰러진 뒤 '깨어나기'(94-input.js start → revivePL)                                         // 화면 안의 '시작'
    cv.addEventListener('mousemove',ev=>{ const b=titleHit(ev); TITLE.hov=b?b.act:null; cv.style.cursor=b?'pointer':'default'; });
    cv.addEventListener('mouseleave',()=>{ TITLE.hov=null; });
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
  /* 꺼진 브라운관의 검정은 새까맣지 않다 — 아주 어두운 잿빛 유리(가운데가 조금 밝다). 색은 여전히 없다 */
  const a=T.flat.getContext('2d'); a.setTransform(1,0,0,1,0,0); a.globalCompositeOperation='source-over'; a.shadowBlur=0;
  T.btns=[]; T.fr++;                                                       // 단추는 프레임마다 다시 적는다(차례 · 크기 · 데스크톱 여부)
  { const gb=a.createRadialGradient(W*0.5,H*0.46,0,W*0.5,H*0.5,Math.max(W,H)*0.62); gb.addColorStop(0,'#141414'); gb.addColorStop(1,'#030303'); a.fillStyle=gb; } a.fillRect(0,0,W,H);
  let g;
  if(T.mode==='banner'){
    const m=T.mid.getContext('2d'), mw=T.mid.width, mh=T.mid.height, K=0.24, span=T.txtH*0.66;
    m.setTransform(1,0,0,1,0,0); m.globalCompositeOperation='source-over'; m.clearRect(0,0,mw,mh);
    m.imageSmoothingEnabled=true; m.imageSmoothingQuality='high';             // 줄마다 읽을 때 글씨가 자글거리지 않게
    /* 더 빠르고 **고르게**(사용자 요청 — 글이 자꾸 끊겨 보였다): 초당 44 px · 한 줄씩(예전엔 두 줄 건너 읽어 위쪽이 성기게 끊겼다) ·
       가끔 옆으로 밀리던 띠와 줄마다의 물결은 걷었다(아주 옅은 흔들림만) */
    const scroll=((t*30)%(T.txtH+sc.h*0.9))-sc.h*0.30;                 // 초당 30 px — 천천히여도 매끄럽게(사용자 요청)                 // 글 그림에서 화면 맨 아랫줄이 읽는 자리
    for(let j=0;j<mh;j++){ const v=j/mh, z=1/(K+(1-K)*v), sy=scroll-(z-1)/(1/K-1)*span; if(sy<0||sy>=T.txt.height-1) continue;
      const wj=mw/z*0.96, off=Math.sin(j*0.02+t*1.1)*0.35*v;
      m.drawImage(T.txt,0,sy,T.txt.width,Math.max(1,z),(mw-wj)/2+off,j,wj,1); }
    m.globalCompositeOperation='destination-out';                      // 위로 갈수록 사라진다(간판 바로 밑)
    g=m.createLinearGradient(0,0,0,mh*0.42); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.4,'rgba(0,0,0,.8)'); g.addColorStop(1,'rgba(0,0,0,0)'); m.fillStyle=g; m.fillRect(0,0,mw,mh*0.42);
    g=m.createLinearGradient(0,mh*0.78,0,mh); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,1)'); m.fillStyle=g; m.fillRect(0,mh*0.78,mw,mh*0.22);   // 아래(단추 줄 위)에서는 어둠에서 떠오른다
    a.drawImage(T.mid,sc.x,sc.y); a.drawImage(T.ban,0,0);
    /* '시작'도 화면 안에 — 글은 전부 브라운관에 비친 것이다(사용자 요청). 바깥의 시작 단추는 감춘다(game.css) */
    if(typeof busy!=='undefined'&&busy) titleProgress(a,t,W,H);
    else{ const bw=clamp(W*0.16,130,220), bh=clamp(H*0.085,44,70); titleButton(a,'시작',W/2-bw/2,H*0.80-bh/2,bw,bh,t,'start');
      const ld=document.getElementById('ovLoad'), msg=ld&&ld.textContent;          // 만들다 실패했으면 그 글을 단추 위에
      if(msg){ a.save(); a.fillStyle='#e8e8e8'; a.font='700 '+Math.round(clamp(W/56,13,20))+'px "Apple SD Gothic Neo","Malgun Gothic",sans-serif'; a.textAlign='center'; a.fillText(msg,W/2,H*0.80-bh); a.restore(); } }
  }else if(T.mode==='dead') titleDeadFlat(a,t,W,H);
  else titleIntroFlat(a,t,W,H);
  if(T.mode!=='dead'||(performance.now()-T.deadT0)/1000>1.6) titleSmallRow(a,t,W,H);
  /* 빛이 일렁인다 — 밝은 띠 둘이 서로 다른 빠르기로 훑고 내려간다(검은 데는 그대로 검다 — 흰 것만 더 밝거나 어두워진다) */
  a.globalCompositeOperation='multiply';
  { const base=0.80+0.05*Math.sin(t*9)+0.03*Math.sin(t*23), stops=[[0,base],[1,base]];
    for(const p of [((t*0.13)%1.3-0.15),((t*0.31+0.4)%1.3-0.15)]) stops.push([p-0.12,base],[p,1.0],[p+0.12,base]);
    g=a.createLinearGradient(0,0,0,H);
    stops.filter(s=>s[0]>=0&&s[0]<=1).sort((x,y)=>x[0]-y[0]).forEach(s=>{ const v=Math.round(255*Math.min(1,s[1])); g.addColorStop(s[0],'rgb('+v+','+v+','+v+')'); }); }
  a.fillStyle=g; a.fillRect(0,0,W,H);
  /* **관의 명암** — 가운데가 밝고 둘레로 갈수록 어두워진다(전자빔이 비스듬히 닿고 유리가 두꺼워진다). 글도 간판도 금도 같은 판이라 같이 어두워진다 */
  g=a.createRadialGradient(W*0.5,H*0.44,Math.min(W,H)*0.10,W*0.5,H*0.5,Math.max(W,H)*0.64); g.addColorStop(0,'#ffffff'); g.addColorStop(0.6,'#c8c8c8'); g.addColorStop(1,'#6a6a6a');
  a.fillStyle=g; a.fillRect(0,0,W,H);
  a.globalCompositeOperation='source-over'; if(T.mode!=='dead') a.drawImage(T.crk,0,0);   // 쓰러진 화면엔 금을 안 긋는다(DEAD 를 가렸다)
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
  try{ O.filter='none'; }catch(e){}
  /* **형광막의 번짐** — 밝은 것 둘레로 엷은 빛이 퍼진다(흐리게 뜬 한 장을 더한다). 주사선보다 먼저라 빛도 줄무늬가 진다 */
  O.globalCompositeOperation='lighter'; O.globalAlpha=0.30; try{ O.filter='blur(6px)'; }catch(e){} O.drawImage(T.bB,0,0); O.globalAlpha=1; try{ O.filter='none'; }catch(e){}
  O.globalCompositeOperation='source-over';
  /* **눈(잡음)** — 자글거리는 점을 마구 옮겨 깐다. 섬을 만드는 동안(신호를 찾는 중)은 더 짙다 */
  { const busyNow=typeof busy!=='undefined'&&busy;
    O.globalCompositeOperation='screen'; O.globalAlpha=busyNow?0.24:0.10;
    O.save(); O.translate(-Math.floor(Math.random()*160),-Math.floor(Math.random()*160));
    O.fillStyle=O.createPattern(T.nz[T.fr%3],'repeat'); O.fillRect(0,0,W+160,H+160); O.restore();
    O.globalAlpha=1; O.globalCompositeOperation='source-over'; }
  O.fillStyle='rgba(0,0,0,.26)'; for(let y=T.fr&1;y<H;y+=3) O.fillRect(0,y,W,1);                  // 주사선 — 홀짝 칸이 번갈아 그려져 줄이 떨린다(비월 주사)
  /* **굴러가는 띠** — 전원 맥동(험 바)처럼 넓고 어두운 띠가 천천히 위로 올라간다 */
  { const hy=(1.25-(t*0.09)%1.5)*H, hh=H*0.17; g=O.createLinearGradient(0,hy-hh,0,hy+hh);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,'rgba(0,0,0,.16)'); g.addColorStop(1,'rgba(0,0,0,0)'); O.fillStyle=g; O.fillRect(0,hy-hh,W,hh*2); }
  /* **깜빡임** — 화면 전체의 밝기가 프레임마다 조금씩 흔들리고, 가끔 한 번 크게 꺼질 듯 어두워진다 */
  O.fillStyle='rgba(0,0,0,'+(0.02+0.05*Math.random()+(Math.random()<0.035?0.18:0)).toFixed(3)+')'; O.fillRect(0,0,W,H);
  /* **볼록한 유리의 반사** — 왼쪽 위에 방의 빛이 둥글게 비치고(아주 엷게), 위 가장자리를 따라 가는 빛줄이 휜다. 유리가 둥글다는 것은 이 명암이 말한다 */
  O.globalCompositeOperation='screen';
  /* 반사는 **깜빡이지 않는다**(방의 빛이라 화면 신호와 상관없다) — 그래서 흔들리는 화면 위에 유리가 따로 있는 것처럼 읽힌다 */
  { const gr=O.createRadialGradient(W*0.28,H*0.18,0,W*0.28,H*0.18,Math.max(W,H)*0.42); gr.addColorStop(0,'rgba(255,255,255,.15)'); gr.addColorStop(0.45,'rgba(255,255,255,.045)'); gr.addColorStop(1,'rgba(255,255,255,0)'); O.fillStyle=gr; O.fillRect(0,0,W,H);
    O.save(); O.translate(W*0.24,H*0.13); O.rotate(-0.52);                                       // 비스듬히 비친 창문 빛 한 줄기
    { const gl=O.createLinearGradient(0,-H*0.06,0,H*0.06); gl.addColorStop(0,'rgba(255,255,255,0)'); gl.addColorStop(0.5,'rgba(255,255,255,.055)'); gl.addColorStop(1,'rgba(255,255,255,0)'); O.fillStyle=gl; O.fillRect(-W*0.28,-H*0.06,W*0.72,H*0.12); }
    O.restore();
    { const hs=O.createRadialGradient(W*0.80,H*0.13,0,W*0.80,H*0.13,W*0.05); hs.addColorStop(0,'rgba(255,255,255,.12)'); hs.addColorStop(1,'rgba(255,255,255,0)'); O.fillStyle=hs; O.fillRect(W*0.74,H*0.05,W*0.12,H*0.16); }   // 오른쪽 위 작은 빛점
    try{ O.filter='blur(5px)'; }catch(e){} O.strokeStyle='rgba(255,255,255,.10)'; O.lineWidth=Math.max(3,H*0.02); O.beginPath(); O.ellipse(W*0.5,H*0.62,W*0.47,H*0.55,0,Math.PI*1.12,Math.PI*1.52); O.stroke(); try{ O.filter='none'; }catch(e){} }
  O.globalCompositeOperation='source-over';
  /* 가장자리 어둠 — 볼록한 유리의 둘레는 어둡게 물러난다. 밖으로는 투명하게 녹여 네모난 판이 안 보이게 한다 */
  O.globalCompositeOperation='destination-in';
  g=O.createRadialGradient(W/2,H/2,Math.min(W,H)*0.30,W/2,H/2,Math.max(W,H)*0.60); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.75,'rgba(0,0,0,.82)'); g.addColorStop(1,'rgba(0,0,0,0)');
  O.fillStyle=g; O.fillRect(0,0,W,H);
  O.globalCompositeOperation='destination-out';                       // 네 변도 따로 녹인다(둥근 어둠만으로는 가까운 변이 칼같이 남는다)
  for(const [x0,y0,x1,y1,rx,ry,rw,rh] of [[0,0,0,H*0.14,0,0,W,H*0.14],[0,H,0,H*0.93,0,H*0.93,W,H*0.07],[0,0,W*0.10,0,0,0,W*0.10,H],[W,0,W*0.90,0,W*0.90,0,W*0.10,H]]){
    g=O.createLinearGradient(x0,y0,x1,y1); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)'); O.fillStyle=g; O.fillRect(rx,ry,rw,rh); }
  O.globalCompositeOperation='source-over';
  const c=T.cx; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,T.cv.width,T.cv.height); c.imageSmoothingEnabled=true;
  { const jx=Math.random()<0.05?(Math.random()-0.5)*5:0, jy=(T.fr%157<2)?Math.round(H*0.01):0;      // 가로 떨림 · 세로 튐(수직 동기가 잠깐 놓친다)
    c.drawImage(T.out,jx*T.dpr,jy*T.dpr,T.cv.width,T.cv.height); }
}
/* ── 쓰러졌을 때(사용자 요청) ───────────────────────────────────────────────
   **브라운관 텔레비전을 끄듯** 화면이 꺼진다 — 쓰러진 순간의 그림(titleSnapTake 가 그린 직후에 뜬다)이 ① 가로 한 줄로 눌리며 하얗게
   타오르고 ② 그 줄이 가운데로 줄어 점이 되고 ③ 점이 사그라든다(0.75초). 그 뒤 검은 화면에 **빨간 스텐실 글씨 DEAD**(간판과 같은 글씨)가
   천천히 떠오르고 위아래로 둥실 떠 있다(가장자리와 넉넉히 띄운다). 밑에 쓰러진 까닭 · '깨어나기' 단추 */
function titleDeath(why){
  const T=TITLE, ov=document.getElementById('ov'); if(!ov) return;
  T.deadWhy=why||''; T.deadT0=performance.now(); T.snap=null; T.snapWant=true; T.btns=[];
  T.mode='dead'; ov.classList.add('title','tdead'); ov.classList.remove('tland');
  titleStart();
}
/* 그린 직후(99-main.js renderFrame 다음) — 그 그림을 한 장 떠 둔다(같은 일 안이라 그림판이 아직 살아 있다) */
function titleSnapTake(){
  const T=TITLE; T.snapWant=false;
  try{ const src=renderer.domElement, c=titleCanvas(src.width>>1,src.height>>1); c.getContext('2d').drawImage(src,0,0,c.width,c.height); T.snap=c; }catch(e){ T.snap=null; }
}
function titleDeadFlat(a,t,W,H){
  const T=TITLE, el=(performance.now()-T.deadT0)/1000;
  a.fillStyle='#000'; a.fillRect(0,0,W,H);
  if(el<0.75){
    const p=el/0.75;
    if(p<0.55){ const q=p/0.55, h=H*Math.pow(1-q,2.2)+3;                 // ① 세로로 눌린다
      if(T.snap) a.drawImage(T.snap,0,H/2-h/2,W,h);
      a.globalCompositeOperation='lighter'; a.fillStyle='rgba(255,255,255,'+(q*0.85).toFixed(3)+')'; a.fillRect(0,H/2-h/2,W,h); a.globalCompositeOperation='source-over'; }
    else if(p<0.85){ const q=(p-0.55)/0.30, w=W*(1-q)+4;                // ② 줄이 가운데로 준다
      a.save(); a.shadowColor='#fff'; a.shadowBlur=14; a.fillStyle='#fff'; a.fillRect(W/2-w/2,H/2-1.5,w,3); a.restore(); }
    else{ const q=(p-0.85)/0.15;                                          // ③ 점이 사그라든다
      a.save(); a.shadowColor='#fff'; a.shadowBlur=18*(1-q); a.fillStyle='rgba(255,255,255,'+(1-q).toFixed(3)+')'; a.beginPath(); a.arc(W/2,H/2,4*(1-q)+1,0,6.2832); a.fill(); a.restore(); }
    return;
  }
  const al=clamp((el-0.95)/0.8,0,1); if(al<=0) return;
  /* DEAD — 화면 너비의 절반 안 · 위아래로 둥실(가장자리에서 넉넉히) · 뒤로 짙은 그늘 몇 겹 */
  const f=T.deadF, s=Math.min(W*0.5/f.width,H*0.30/f.height), fw=f.width*s, fh=f.height*s, x=W/2-fw/2, y=H*0.30-fh/2+Math.sin(t*1.15)*H*0.018;
  a.save(); a.globalAlpha=al;
  for(let d=6;d>=1;d--) a.drawImage(T.deadB,x+d*0.6,y+d*1.4,fw,fh);
  a.shadowColor='rgba(255,40,30,.65)'; a.shadowBlur=26; a.drawImage(f,x,y,fw,fh); a.shadowBlur=0;
  if(T.deadWhy){ const fs=Math.round(clamp(W/48,14,22)); a.font='600 '+fs+'px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif'; a.textAlign='center'; a.textBaseline='middle';
    a.fillStyle='rgba(225,225,225,.85)'; a.fillText(T.deadWhy,W/2,y+fh+fs*2.2); }
  a.restore();
  if(el>1.6){ const bw=clamp(W*0.17,140,230), bh=clamp(H*0.085,44,68); titleButton(a,'깨어나기',W/2-bw/2,H*0.74-bh/2,bw,bh,t,'wake'); }
}
function titleTick(){
  const T=TITLE, ov=document.getElementById('ov');
  if(!ov||!ov.classList.contains('title')||ov.style.display==='none'){ titleStop(); return; }
  if(document.hidden) return;
  const [sw0,sh0]=titleSize();
  if(!T.L||Math.abs(T.W-sw0)>2||Math.abs(T.H-sh0)>2){ try{ titleLayout(); }catch(e){ console.warn('[여는 화면]',e); titleStop(); return; } }
  try{ titleDraw(performance.now()); }catch(e){ console.warn('[여는 화면]',e); titleStop(); }
}
function titleStart(){
  const T=TITLE; if(T.on) return;
  T.cv=document.getElementById('ovArt'); if(!T.cv||!T.cv.getContext) return;
  T.cx=T.cv.getContext('2d'); T.on=true; T.t0=performance.now();
  /* 화면 주기(requestAnimationFrame)에 맞춰 그린다 — setInterval 은 화면 주기와 어긋나 올라가는 글이 덜컥거렸다(사용자 지적) */
  const step=()=>{ if(!T.on) return; titleTick(); T.timer=requestAnimationFrame(step); }; T.timer=requestAnimationFrame(step); titleTick();
}
function titleStop(){ const T=TITLE; if(!T.on) return; T.on=false; cancelAnimationFrame(T.timer); const ov=document.getElementById('ov'); ov.classList.remove('title'); ov.classList.remove('tland'); ov.classList.remove('tdead'); if(T.mode==='dead') T.mode='land'; }
titleStart();
