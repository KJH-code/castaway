/* 95-flora.js — CASTAWAY
   군락을 이루는 식생 — 밀림·대숲·자작 숲·솔숲·맹그로브 늪·야자 숲·꽃밭 … 과 거기서 얻는 것(덩굴·대나무·야자열매·바나나·버섯)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   군락을 이루는 식생
   ----------------------------------------------------------------------------
   처음 넣은 덤불·작은 나무는 칸마다 주사위를 굴려 아무 데나 섞어 세웠다 — 종류는 여덟인데 온 숲이 같은 뒤범벅이라
   다양해 보이지도 않았고, 뿔·공으로 지은 모양이 가지와 잎을 가진 참나무·전나무와 따로 놀았고, 덤불은 그냥 뚫고
   지나갔다(사용자 지적 그대로다). 이렇게 고쳤다.

   ① **군락** — 섬을 80 m 안팎의 얼룩으로 나누고(`floraPatch` · 경계가 구불구불한 보로노이) 얼룩마다 그 바이옴의
      군락 하나를 정한다(`FLORA_COMM`). 활엽수림이면 밀림 · 대숲 · 자작 숲 · 노거수 숲 · 잡목 숲 가운데 하나다.
      **같이 사는 것끼리만 선다** — 대숲에는 대나무만, 꽃밭은 얼룩마다 한 가지 빛깔. 얼룩 가장자리로 갈수록 성겨져
      군락 사이에 빈터가 난다.
   ② **나무는 나무답게** — 줄기와 가지는 매끈한 대롱(24-shapes.js), 잎은 참나무와 같은 방식의 **잎 그림 판때기**다.
        밀림 나무 — 가지를 많이 친다 · 덩굴이 늘어진다      대나무 — 곧게 선 마디 줄기 열두 대가 한 포기
        맹그로브 — 줄기가 물 위에 뜨고 버팀뿌리가 넓게 벌어진다(늪 · 강어귀의 얕은 물)
        자작 · 어린 전나무 · 어린 활엽수 · 바나나 · 나무고사리 · 아카시아 · 야자
      껍질·잎 그림은 캔버스에 그린 그림 묶음 한 장(`floraAtlas` · 4×4 칸)이라 재질이 하나다.
   ③ **몸이 막힌다** — 줄기가 있는 것은 전부(`FLORA_KIND.r`). 덤불도 한가운데는 못 지난다. 고사리·꽃·버섯만 헤치고 간다.
   ④ **얻는 것** — 밀림 나무의 덩굴 · 대나무 · 야자열매 · 바나나 · 버섯(`FLORA_PICK`). 바라보고 좌클릭.
      딴 자리는 하루 이틀 뒤 다시 난다(`FLORA.taken` — 저장된다).
   ⑤ 두 겹으로 깐다 — 나무는 6 m 칸 · 사람 둘레 110 m, 덤불·고사리는 2.4 m 칸 · 46 m. 자리는 전부 칸 번호의 해시라
      같은 섬 같은 자리에 늘 같은 것이 선다. 섬 생성(자원 배치)과 무관하다.
   노거수(뿌리가 땅이 되는 큰 나무)는 95-giants.js 가 '노거수 숲' 군락에 세운다.
   ========================================================================== */
const FLORA={seed:0, m:null, mat:null, depth:null, tex:null, patch:84, taken:new Map(), look:null,
  far :{cx:1e9,cz:1e9,R:110,cell:6,  step:12,fade:14,salt:3,cols:[],picks:[],n:{},kinds:['jungle','mangrove','bamboo','palm','birch','pine','sapling','banana','treefern','acacia']},
  near:{cx:1e9,cz:1e9,R:46, cell:2.4,step:6, fade:7, salt:1,cols:[],picks:[],n:{},kinds:['fern','bush','flower','dry','shroom']}};
/* 그림 묶음의 칸 */
const FC={BARK:0,RING:1,LEAF:2,BIG:3,FERN:4,PALM:5,BAMBOO:6,NEEDLE:7,FLOWER:8,TWIG:9,MANG:10,VINE:11,PLAIN:13};
/* 종류마다 — r 몸이 막히는 반지름(크기 1 일 때 · 없으면 지나간다) · pick 얻는 것 · cap 한 번에 서는 수 */
const FLORA_KIND={
  jungle:{r:0.44,pick:'vine',cap:420}, mangrove:{r:1.0,cap:260}, bamboo:{r:0.75,pick:'bamboo',cap:320}, palm:{r:0.22,pick:'coconut',cap:220},
  birch:{r:0.16,cap:360}, pine:{r:0.14,cap:460}, sapling:{r:0.10,cap:360}, banana:{r:0.16,pick:'banana',cap:200},
  treefern:{r:0.16,cap:260}, acacia:{r:0.18,cap:200},
  fern:{cap:800}, bush:{r:0.30,cap:520}, flower:{cap:700}, dry:{cap:420}, shroom:{pick:'mushroom',cap:120} };
/* 얻는 것 — regrow 다시 나기까지(게임 시간) · cnt [아래, 위] · need 'sharp' 날붙이를 지녀야 · hide 따면 그 자리가 빈다 */
const FLORA_PICK={
  vine    :{item:'vine',    n:'덩굴',     verb:'끊기',        regrow:30, cnt:[1,2]},
  bamboo  :{item:'bamboo',  n:'대나무',   verb:'베기',        regrow:60, cnt:[2,3], need:'sharp'},
  coconut :{item:'coconut', n:'야자열매', verb:'흔들어 따기', regrow:48, cnt:[1,2]},
  banana  :{item:'banana',  n:'바나나',   verb:'따기',        regrow:48, cnt:[2,3]},
  mushroom:{item:'mushroom',n:'버섯',     verb:'따기',        regrow:36, cnt:[1,1], hide:1}
};
/* 바이옴마다의 군락 — w 얼룩이 그 군락이 될 몫 · far 나무 겹 · near 덤불 겹: [종류, 칸마다 설 확률, 크기 아래, 위]
   giant: 노거수가 서는 군락(1 활엽 · 2 침엽 — 95-giants.js) · low: 표고가 이보다 높으면 그 바이옴의 둘째 군락으로 바꾼다 */
const FLORA_COMM={
  [B.BROADLEAF]:[
    {w:3,n:'밀림',      far:[['jungle',0.50,0.8,1.3],['banana',0.14,0.8,1.3],['treefern',0.10,0.8,1.3]], near:[['fern',0.22,0.8,1.4],['bush',0.10,0.7,1.3],['shroom',0.02,0.8,1.5]]},
    {w:2,n:'대숲',      far:[['bamboo',0.62,0.8,1.25]],                                                  near:[['fern',0.06,0.7,1.1]]},
    {w:2,n:'자작 숲',   far:[['birch',0.45,0.8,1.3],['sapling',0.10,0.8,1.2]],                           near:[['fern',0.10,0.7,1.2],['flower',0.05,0.8,1.2],['bush',0.06,0.7,1.2]]},
    {w:3,n:'노거수 숲', giant:1, far:[['sapling',0.12,0.8,1.3],['treefern',0.06,0.8,1.2]],               near:[['fern',0.28,0.8,1.5],['shroom',0.04,0.8,1.6],['bush',0.05,0.7,1.2]]},
    {w:2,n:'잡목 숲',   far:[['sapling',0.28,0.8,1.4],['birch',0.06,0.8,1.2]],                           near:[['bush',0.16,0.7,1.5],['fern',0.12,0.7,1.3]]} ],
  [B.CONIFER]:[
    {w:3,n:'솔숲',      far:[['pine',0.50,0.7,1.5]],                                                     near:[['fern',0.10,0.7,1.2],['shroom',0.03,0.8,1.5]]},
    {w:2,n:'노거수 숲', giant:2, far:[['pine',0.12,0.7,1.2]],                                            near:[['fern',0.24,0.8,1.5],['shroom',0.05,0.8,1.6]]},
    {w:2,n:'고사리 골', far:[['treefern',0.30,0.8,1.3],['pine',0.08,0.7,1.2]],                           near:[['fern',0.34,0.8,1.5],['bush',0.05,0.7,1.2]]} ],
  [B.MEADOW]:[
    {w:3,n:'꽃밭',      far:[],                                                                          near:[['flower',0.30,0.8,1.4]]},
    {w:2,n:'자작 덤불', far:[['birch',0.18,0.8,1.2]],                                                    near:[['bush',0.10,0.7,1.3],['flower',0.06,0.8,1.2]]},
    {w:3,n:'풀밭',      far:[['sapling',0.02,0.8,1.2]],                                                  near:[['flower',0.03,0.8,1.2],['bush',0.03,0.6,1.1]]} ],
  [B.SCRUB]:[
    {w:2,n:'아카시아 벌',far:[['acacia',0.20,0.8,1.4]],                                                  near:[['dry',0.10,0.7,1.5]]},
    {w:2,n:'가시덤불',  far:[],                                                                          near:[['dry',0.24,0.7,1.6],['bush',0.04,0.6,1.0]]},
    {w:2,n:'마른 벌',   far:[['acacia',0.03,0.8,1.2]],                                                   near:[['dry',0.05,0.7,1.2]]} ],
  [B.MARSH]:[ {w:1,n:'맹그로브 늪',low:2.5, far:[['mangrove',0.42,0.8,1.3]],                             near:[['fern',0.12,0.8,1.4]]},
              {w:0,n:'고사리 늪',  far:[['treefern',0.10,0.8,1.2],['sapling',0.05,0.7,1.1]],                 near:[['fern',0.30,0.8,1.5],['bush',0.05,0.6,1.1]]} ],
  [B.BEACH]:[ {w:2,n:'야자 숲', far:[['palm',0.26,0.8,1.25]], near:[]},  {w:3,n:'모래톱', far:[['palm',0.012,0.8,1.2]], near:[]} ],
  [B.DUNE] :[ {w:2,n:'야자 숲', far:[['palm',0.22,0.8,1.25]], near:[['dry',0.05,0.6,1.2]]},  {w:2,n:'사구', far:[], near:[['dry',0.06,0.6,1.2]]} ],
  [B.ROCK] :[ {w:1,n:'바위틈',  far:[], near:[['dry',0.03,0.6,1.1]]} ],
  [B.SCREE]:[ {w:1,n:'돌밭',    far:[], near:[['dry',0.015,0.6,1.0]]} ]
};
const FLORA_MANGROVE=['mangrove',0.5,0.8,1.3];       // 강어귀·늪 가의 얕은 물 — 군락표와 따로 본다
const FLOWER_TINT=[[1,1,1],[1,0.86,0.30],[0.78,0.56,0.95],[1,0.62,0.70],[0.62,0.78,1],[1,0.5,0.3]];

/* ── 자리 정하기 ─────────────────────────────────────────────────────────── */
function floraHash(gx,gz,salt){
  let h=(Math.imul(gx,2246822519)+Math.imul(gz,3266489917)+Math.imul(salt|0,668265263)+FLORA.seed)|0;
  h=Math.imul(h^(h>>>15),2246822519); h=Math.imul(h^(h>>>13),3266489917);
  return (h^(h>>>16))>>>0;
}
/* 부드러운 값잡음(0~1) */
function floraVal(x,z,cell,salt){
  const fx=x/cell, fz=z/cell, ix=Math.floor(fx), iz=Math.floor(fz), tx=fx-ix, tz=fz-iz;
  const sx=tx*tx*(3-2*tx), sz=tz*tz*(3-2*tz), K=1/4294967296;
  const a=floraHash(ix,iz,salt)*K, b=floraHash(ix+1,iz,salt)*K, c=floraHash(ix,iz+1,salt)*K, d=floraHash(ix+1,iz+1,salt)*K;
  const top=a+(b-a)*sx, bot=c+(d-c)*sx;
  return top+(bot-top)*sz;
}
/* 그 자리가 든 얼룩 — id 얼룩 번호 · edge 얼룩 경계까지의 거리(m 쯤) */
const _fp={id:0,edge:0};
function floraPatch(x,z){
  const S=FLORA.patch;
  const wx=x+(floraVal(x,z,37,31)-0.5)*44, wz=z+(floraVal(x,z,37,32)-0.5)*44;   // 경계를 구불구불하게
  const fx=wx/S, fz=wz/S, ix=Math.floor(fx), iz=Math.floor(fz);
  let bd=1e9, sd=1e9, bh=0;
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
    const h=floraHash(ix+dx,iz+dz,7), px=ix+dx+0.1+(h&1023)/1023*0.8, pz=iz+dz+0.1+((h>>>10)&1023)/1023*0.8;
    const d=(px-fx)*(px-fx)+(pz-fz)*(pz-fz);
    if(d<bd){ sd=bd; bd=d; bh=h; } else if(d<sd) sd=d;
  }
  _fp.id=bh>>>20; _fp.edge=(Math.sqrt(sd)-Math.sqrt(bd))*S;
  return _fp;
}
/* 그 자리의 군락(없으면 null) — 부른 뒤 `_fp` 에 얼룩 번호·경계 거리가 남는다 */
function floraCommAt(x,z,biome){
  const tb=FLORA_COMM[biome]; if(!tb) return null;
  const p=floraPatch(x,z);
  let tot=0; for(const c of tb) tot+=c.w;
  let u=(p.id%997)/997*tot;
  for(const c of tb){ if(u<c.w) return c; u-=c.w; }
  return tb[tb.length-1];
}

/* ── 껍질·잎 그림 묶음(512 px · 4×4 칸) ──────────────────────────────────── */
function floraAtlas(){
  const S=512, K=128, c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d'), rnd=mulberry32(0xa71a5);
  const cell=(i,fn)=>{ g.save(); g.translate((i&3)*K,(i>>2)*K); g.beginPath(); g.rect(0,0,K,K); g.clip(); fn(); g.restore(); };
  const GREEN=['#3d5a2c','#456133','#4e6b37','#395427','#51733a'], VEIN=['#859c45','#7b9140','#90a74e'];
  const pick=a=>a[(rnd()*a.length)|0];
  /* 잎 한 장 — 밑동(x,y)에서 ang 쪽으로 뻗는 타원. nv 쌍의 곁맥 */
  const leaf=(x,y,len,w,ang,body,vein,nv)=>{
    g.save(); g.translate(x,y); g.rotate(ang);
    g.beginPath(); g.moveTo(0,0);
    g.bezierCurveTo( w,-len*0.26,  w*0.74,-len*0.84, 0,-len);
    g.bezierCurveTo(-w*0.74,-len*0.84, -w,-len*0.26, 0,0);
    g.closePath(); g.fillStyle=body; g.fill();
    if(vein){ g.clip(); g.strokeStyle=vein; g.lineCap='round';
      g.lineWidth=Math.max(0.8,len*0.030); g.beginPath(); g.moveTo(0,-len*0.02); g.lineTo(0,-len*0.94); g.stroke();
      g.lineWidth=Math.max(0.6,len*0.016);
      for(let i=1;i<=(nv||0);i++){ const t=i/((nv||0)+1), yy=-len*t, ww=w*(0.52+0.48*Math.sin(Math.PI*t))*0.84;
        g.beginPath(); g.moveTo(0,yy); g.lineTo( ww,yy-len*0.10); g.stroke();
        g.beginPath(); g.moveTo(0,yy); g.lineTo(-ww,yy-len*0.10); g.stroke(); } }
    g.restore();
  };
  const line=(x0,y0,x1,y1,w,col)=>{ g.strokeStyle=col; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); };
  // 0 거친 껍질 — 세로 골. 잿빛으로 그려 두고 빛깔은 정점 색이 정한다
  cell(FC.BARK,()=>{ g.fillStyle='#a6a6a6'; g.fillRect(0,0,K,K);
    for(let i=0;i<170;i++){ const x=rnd()*K, w=0.8+rnd()*2, y0=rnd()*K, h=14+rnd()*60;      // 가늘고 옅은 골을 촘촘히 — 굵은 가지에 판자 무늬처럼 보이지 않게
      g.fillStyle='rgba('+(rnd()<0.55?'46,46,46':'232,232,232')+','+(0.10+rnd()*0.18)+')'; g.fillRect(x,y0,w,h); g.fillRect(x,y0-K,w,h); } });
  // 1 마디 진 껍질 — 대나무 마디 · 자작의 가로 무늬 · 야자의 잎자국
  cell(FC.RING,()=>{ g.fillStyle='#c6c6c6'; g.fillRect(0,0,K,K);
    for(let j=0;j<7;j++){ const y=9+j*17+rnd()*4; g.fillStyle='rgba(36,36,36,0.6)'; g.fillRect(0,y,K,2.4); g.fillStyle='rgba(255,255,255,0.4)'; g.fillRect(0,y+2.4,K,1.6); }
    for(let i=0;i<46;i++){ g.fillStyle='rgba(44,44,44,'+(0.10+rnd()*0.22)+')'; g.fillRect(rnd()*K,rnd()*K,3+rnd()*10,1.3); } });
  // 2 넓은잎 한 줌 — 밑에서 부챗살로 아홉 장(참나무 잎 그림과 같은 식)
  cell(FC.LEAF,()=>{ for(let i=0;i<9;i++){ const t=i/8, len=K*(0.40+rnd()*0.22);
    leaf(K*(0.5+(rnd()-0.5)*0.16),K*(0.96-rnd()*0.10),len,len*(0.30+rnd()*0.10),(t-0.5)*2.15+(rnd()-0.5)*0.22,pick(GREEN),pick(VEIN),5); } });
  // 3 큰 잎 한 장 — 바나나·밀림의 넓은 잎. 가장자리가 찢겨 있다
  cell(FC.BIG,()=>{ leaf(K*0.5,K*0.99,K*0.96,K*0.36,0,'#3f6a30','#9bb85a',11);
    g.globalCompositeOperation='destination-out';
    for(let i=0;i<7;i++){ const s=rnd()<0.5?-1:1, y=K*(0.2+rnd()*0.6); g.beginPath(); g.moveTo(K*0.5+s*K*0.42,y-3); g.lineTo(K*0.5+s*K*0.42,y+3); g.lineTo(K*0.5+s*K*0.10,y+8); g.closePath(); g.fill(); }
    g.globalCompositeOperation='source-over'; });
  // 4 고사리 잎 — 가운데 줄기 양옆으로 작은 잎이 줄지어 난다
  cell(FC.FERN,()=>{ line(K*0.5,K*0.99,K*0.5,K*0.04,2,'#5a7a34');
    for(let i=0;i<17;i++){ const t=i/16, y=K*(0.95-0.90*t), len=K*0.36*Math.sin(Math.PI*(0.12+t*0.88))*(1-t*0.35)+3;
      leaf(K*0.5,y,len,len*0.20,-1.15,pick(GREEN),null); leaf(K*0.5,y,len,len*0.20,1.15,pick(GREEN),null); } });
  // 5 야자 잎 — 길고 가는 쪽잎이 비스듬히
  cell(FC.PALM,()=>{ line(K*0.5,K*0.99,K*0.5,K*0.03,2.6,'#7a8a3c');
    for(let i=0;i<22;i++){ const t=i/21, y=K*(0.97-0.93*t), len=K*0.46*(0.55+0.45*Math.sin(Math.PI*t*0.9+0.2));
      leaf(K*0.5,y,len,3.4,-0.95,i%2?'#3c6a2e':'#487636',null); leaf(K*0.5,y,len,3.4,0.95,i%2?'#44702f':'#3a642c',null); } });
  // 6 댓잎 — 휜 잔가지에 가늘고 긴 잎
  cell(FC.BAMBOO,()=>{ line(K*0.5,K*0.99,K*0.46,K*0.45,1.6,'#8a9a4a'); line(K*0.46,K*0.45,K*0.56,K*0.12,1.2,'#8a9a4a');
    for(let i=0;i<11;i++){ const t=i/10, x=K*(0.5-0.04*Math.sin(t*3)), y=K*(0.92-0.80*t), s=i%2?1:-1;
      leaf(x,y,K*(0.30+rnd()*0.12),K*0.045,s*(0.75+rnd()*0.5),pick(['#55803a','#628c40','#4a7434']),'#a8c070',0); } });
  // 7 솔가지 — 잔가지에 바늘잎이 빽빽이
  cell(FC.NEEDLE,()=>{ const tw=(x0,y0,x1,y1,n,L)=>{ line(x0,y0,x1,y1,1.6,'#4a3a2a');
      for(let i=0;i<n;i++){ const t=i/(n-1), x=x0+(x1-x0)*t, y=y0+(y1-y0)*t, a=Math.atan2(y1-y0,x1-x0);
        for(const s of [-1,1]){ const b=a+s*(0.9+rnd()*0.4); line(x,y,x+Math.cos(b)*L*(1-t*0.4),y+Math.sin(b)*L*(1-t*0.4),1.5,pick(['#2f4a3a','#28423a','#365440','#2a4634'])); } } };
    tw(K*0.5,K*0.99,K*0.5,K*0.05,34,K*0.11);
    for(let i=0;i<6;i++){ const y=K*(0.85-i*0.13), L=K*(0.36-i*0.04); tw(K*0.5,y,K*0.5-L,y-L*0.55,14,K*0.07); tw(K*0.5,y,K*0.5+L,y-L*0.55,14,K*0.07); } });
  // 8 들꽃 — 줄기 다섯에 흰 꽃(포기마다의 빛깔은 인스턴스 색으로 곱한다)
  cell(FC.FLOWER,()=>{ for(let i=0;i<6;i++){ const x=K*(0.18+i*0.13+rnd()*0.04), top=K*(0.16+rnd()*0.34);
      line(K*0.5+(x-K*0.5)*0.3,K*0.99,x,top,1.6,'#5a7a3a'); leaf(K*0.5+(x-K*0.5)*0.5,K*0.75,K*0.16,K*0.035,(x<K*0.5?-1:1)*0.9,'#5a8038',null);
      for(let p=0;p<5;p++){ const a=p/5*6.283; g.fillStyle='#ffffff'; g.beginPath(); g.ellipse(x+Math.cos(a)*5,top+Math.sin(a)*5,4.6,3.2,a,0,6.283); g.fill(); }
      g.fillStyle='#d8b030'; g.beginPath(); g.arc(x,top,2.8,0,6.283); g.fill(); } });
  // 9 마른 잔가지 — 갈라지는 가지에 잎 몇 장
  cell(FC.TWIG,()=>{ const br=(x,y,a,L,d)=>{ const x1=x+Math.cos(a)*L, y1=y+Math.sin(a)*L; line(x,y,x1,y1,0.8+d*0.7,'#6a5a40');
      if(d>0){ br(x1,y1,a-0.4-rnd()*0.4,L*0.72,d-1); br(x1,y1,a+0.4+rnd()*0.4,L*0.72,d-1); if(rnd()<0.5) br(x+Math.cos(a)*L*0.5,y+Math.sin(a)*L*0.5,a+(rnd()<0.5?-0.9:0.9),L*0.6,d-1); }
      else if(rnd()<0.75) leaf(x1,y1,K*0.09,K*0.035,a+1.5708+(rnd()-0.5),pick(['#7a8040','#8a8a48','#6c7438']),null); };
    br(K*0.5,K*0.99,-1.5708,K*0.30,4); });
  // 10 맹그로브 잎 — 도톰하고 짙은 타원 잎이 가지 끝에 모여 난다
  cell(FC.MANG,()=>{ line(K*0.5,K*0.99,K*0.5,K*0.55,2,'#5a4a36');
    for(let i=0;i<13;i++){ const a=(i/12-0.5)*2.6+(rnd()-0.5)*0.2, len=K*(0.30+rnd()*0.16);
      leaf(K*(0.5+(rnd()-0.5)*0.12),K*(0.80-rnd()*0.22),len,len*0.34,a,pick(['#2c4f30','#33583a','#294a2c','#3a6038']),'#88a860',0); } });
  // 11 덩굴 — 위에서 늘어진 줄에 잎
  cell(FC.VINE,()=>{ for(let v=0;v<4;v++){ let x=K*(0.2+v*0.2+rnd()*0.06), y=K*0.0; const L=K*(0.6+rnd()*0.38);
      g.strokeStyle='#4a5a30'; g.lineWidth=1.5; g.beginPath(); g.moveTo(x,y);
      const pts=[]; for(let i=1;i<=12;i++){ y=L*i/12; x+=Math.sin(i*0.9+v)*2.2; g.lineTo(x,y); pts.push([x,y]); } g.stroke();
      for(const p of pts) if(rnd()<0.8) leaf(p[0],p[1],K*0.10,K*0.045,(rnd()<0.5?-1:1)*(1.3+rnd()*0.9)+3.1416,pick(GREEN),null); } });
  // 13 민무늬 — 열매·버섯·줄기처럼 정점 색만으로 칠하는 것
  cell(FC.PLAIN,()=>{ g.fillStyle='#ffffff'; g.fillRect(0,0,K,K); });
  const tx=new THREE.CanvasTexture(c);
  tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping; tx.anisotropy=4;
  return tx;
}

/* ── 생김새 ──────────────────────────────────────────────────────────────── */
/* 나무를 짓는 도구 한 벌 — 줄기(trunk) · 가지 치기(grow) · 잎 판때기(card) · 마무리(fin). 95-giants.js 의 노거수도 같이 쓴다 */
function floraKit(rnd){
  const lean=SHP.lean, W=[1,1,1];
  const BARK=[0.44,0.35,0.27], BARK2=[0.58,0.48,0.38];
  const unit=(x,y,z)=>{ const l=Math.sqrt(x*x+y*y+z*z)||1; return [x/l,y/l,z/l]; };
  /* 방위 a 를 보고 선 뒤 바깥으로 t 만큼 눕는 회전 */
  const face=(a,t)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(0,1.5708-a,0)).premultiply(lean(a,t));
  const card=(p,w,h,cl,a,t,c)=>({g:SHP.card(w,h),x:p[0],y:p[1],z:p[2],q:face(a,t),cell:cl,c:c||W});
  /* 줄기 — 살짝 흔들리며 오르는 대롱. 밑동이 벌어진다. 줄기 위의 자리(0~1)를 돌려주는 함수를 낸다 */
  const trunk=(parts,H,r0,r1,S)=>{ S=S||{};
    const n=S.segs||6, pts=[], rad=[], sw=S.sway===undefined?0.12:S.sway, ph=rnd()*6.28;
    for(let i=0;i<=n;i++){ const t=i/n;
      pts.push([sw*Math.sin(t*2.6+ph)*t, -0.25+(H+0.25)*t, sw*Math.sin(t*3.4+ph*1.7)*t]);
      rad.push((r0+(r1-r0)*t)*(1+(S.flare===undefined?0.5:S.flare)*Math.exp(-t*9))); }
    parts.push({g:SHP.tube(pts,rad,S.sides||7,0.5),cell:S.cell||FC.BARK,c:S.c||BARK,c2:S.c2||BARK2});
    return t=>{ const f=clamp(t,0,1)*n, i=Math.min(n-1,Math.floor(f)), k=f-i;
      return [pts[i][0]+(pts[i+1][0]-pts[i][0])*k, pts[i][1]+(pts[i+1][1]-pts[i][1])*k, pts[i][2]+(pts[i+1][2]-pts[i][2])*k]; };
  };
  /* 가지 치기 — o 에서 d 로 len 만큼 뻗고, 깊이가 남았으면 끝과 중간에서 갈라진다. 끝가지에는 잎 판때기(와 덩굴)가 달린다.
     S: split 깊이마다 갈라지는 수 · spread 벌어지는 폭 · up 위로 서려는 정도 · lift 치켜드는 정도 · shrink 길이 줄임 · taper 굵기 줄임 */
  const grow=(parts,o,d,len,r,depth,S)=>{
    const bend=S.bend===undefined?0.08:S.bend, seg=depth>=2?3:(depth===1?2:1), sides=depth>=2?6:(depth===1?5:4);
    parts.push({g:SHP.limb(o,d,len,r,r*S.taper,seg,sides,bend,0.6),cell:FC.BARK,c:S.bark||BARK,c2:S.bark2||BARK2});
    const at=t=>[o[0]+d[0]*len*t, o[1]+d[1]*len*t+bend*len*t*t, o[2]+d[2]*len*t];
    if(depth>0){
      const n=S.split[depth-1]||2;
      for(let k=0;k<n;k++){
        const t=k===0?0.97:0.42+rnd()*0.42;
        grow(parts,at(t),unit(d[0]+(rnd()-0.5)*S.spread,d[1]*S.up+S.lift+(rnd()-0.5)*0.3,d[2]+(rnd()-0.5)*S.spread),
             len*S.shrink*(0.85+rnd()*0.3),r*S.taper*(k===0?1:0.8),depth-1,S);
      }
    }else{
      const a=Math.atan2(d[2],d[0]);
      for(let k=0;k<S.leafN;k++){ const p=at(Math.max(0.3,1-k*0.3*rnd()));
        parts.push(card([p[0],p[1]-S.leafH*0.15,p[2]],S.leafW*(0.85+rnd()*0.3),S.leafH*(0.85+rnd()*0.3),S.leafCell,a+(rnd()-0.5)*2.2,S.leafTilt*(0.5+rnd()),S.leafC)); }
      if(S.vine&&rnd()<S.vine){ const p=at(0.7), h=(S.vineH||1.3)*(1+rnd()*1.2);           // 늘어진 덩굴 — 그림이 위에서 아래로 늘어지므로 판을 가지 밑에 단다
        parts.push({g:SHP.card(h*0.45,h,false),x:p[0],y:p[1]-h,z:p[2],ry:rnd()*6.283,cell:FC.VINE,c:W}); }
    }
  };
  /* 잎(그림 칸 2~11)은 한 톤 낮춘다 — 판때기의 법선을 위로 둬서 늘 볕을 정면으로 받는다. 그대로면 가지 사이에 그늘이 지는
     참나무 잎보다 훨씬 밝아 형광색으로 떴다 */
  const LK=0.60, fin=parts=>{
    let cx=0, cy=0, cz=0, n=0;
    for(const p of parts) if(p.cell>=FC.LEAF&&p.cell<=FC.VINE){ const c=p.c||W; p.c=[c[0]*LK,c[1]*LK,c[2]*LK]; if(p.c2) p.c2=[p.c2[0]*LK,p.c2[1]*LK,p.c2[2]*LK];
      cx+=p.x||0; cy+=p.y||0; cz+=p.z||0; n++; }
    /* 잎의 법선은 **수관 가운데에서 바깥으로** 둔다(위쪽으로 조금 치우쳐) — 나무 한 그루가 공처럼 빛을 받아 볕 드는 쪽은 밝고
       반대쪽과 아래쪽은 어둡다. 판마다 제 면의 법선을 쓰면 잎이 제각각 번쩍이고, 전부 위를 보게 두면 그늘이 안 진다 */
    if(n>2){ cx/=n; cy/=n; cz/=n;
      for(const p of parts) if(p.cell>=FC.LEAF&&p.cell<=FC.VINE&&p.g.attributes.uv&&p.g.attributes.position.count<=8){
        const dx=(p.x||0)-cx, dy=(p.y||0)-cy+Math.abs(cy)*0.12+0.3, dz=(p.z||0)-cz, l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1; p.nrm=[dx/l,dy/l,dz/l]; } }
    return SHP.merge(parts,true); };
  return {W,BARK,BARK2,unit,face,card,trunk,grow,fin};
}
function floraBuild(){
  const rnd=mulberry32(0xf10a), {W,BARK,BARK2,unit,face,card,trunk,grow,fin}=floraKit(rnd);
  const G={};
  /* 밀림 나무 — 굵은 밑동, 다섯 갈래 큰 가지가 두 번씩 더 갈라져 스무 개의 끝가지. 덩굴이 늘어진다(키 9~11 m) */
  G.jungle=(()=>{ const parts=[], at=trunk(parts,7.0,0.40,0.20,{flare:1.0,sway:0.25,sides:8});
    const S={taper:0.66,split:[2,3],spread:1.5,up:0.6,lift:0.35,shrink:0.72,bend:0.10,leafN:3,leafW:2.1,leafH:1.9,leafCell:FC.LEAF,leafTilt:0.6,leafC:[0.86,1.0,0.86],vine:0.3};
    for(let i=0;i<5;i++){ const a=i/5*6.283+rnd()*0.9;
      grow(parts,at(0.60+i*0.10),unit(Math.cos(a)*0.9,0.75,Math.sin(a)*0.9),2.8+rnd()*0.9,0.15,2,S); }
    for(let i=0;i<3;i++){ const p=at(0.28+i*0.12), a=rnd()*6.283;            // 줄기에 붙어 사는 큰 잎
      parts.push({g:SHP.frond(0.9,0.38,{segs:4,curl:1.0,cup:0.2,tip:0.5}),x:p[0],y:p[1],z:p[2],q:face(a,0.5),cell:FC.BIG,c:[0.9,1,0.9]}); }
    return fin(parts); })();
  /* 맹그로브 — 줄기가 물 위 1.2 m 에서 시작하고, 버팀뿌리 열 가닥이 활처럼 휘어 내려 넓게 박힌다(뿌리 지름 4 m · 키 5 m) */
  G.mangrove=(()=>{ const parts=[], RB=[0.40,0.33,0.28], RB2=[0.55,0.47,0.38];
    parts.push({g:SHP.tube([[0,1.15,0],[0.05,1.9,0.03],[0.14,2.6,0.02],[0.20,3.2,-0.05]],[0.17,0.15,0.13,0.11],7,0.5),cell:FC.BARK,c:RB,c2:RB2});
    for(let i=0;i<10;i++){ const a=i/10*6.283+rnd()*0.5, R=1.0+rnd()*1.1, h=1.0+rnd()*0.9, cx=Math.cos(a), cz=Math.sin(a);
      parts.push({g:SHP.tube([[cx*0.08,h,cz*0.08],[cx*R*0.45,h+0.15,cz*R*0.45],[cx*R*0.85,h*0.45,cz*R*0.85],[cx*R,-0.2,cz*R],[cx*R*1.05,-1.2,cz*R*1.05]],
        [0.075,0.068,0.060,0.052,0.040],5,0),cell:FC.BARK,c:RB,c2:RB2});
      if(i%3===0){ const a2=a+0.55, R2=R*0.95;                              // 뿌리에서 또 갈라져 내리는 곁뿌리
        parts.push({g:SHP.tube([[cx*R*0.6,h*0.9,cz*R*0.6],[Math.cos(a2)*R2*0.9,h*0.4,Math.sin(a2)*R2*0.9],[Math.cos(a2)*R2,-1.1,Math.sin(a2)*R2]],[0.045,0.040,0.030],4,0),cell:FC.BARK,c:RB,c2:RB2}); } }
    const S={taper:0.68,split:[2,3],spread:1.6,up:0.35,lift:0.2,shrink:0.7,bend:0.05,leafN:3,leafW:1.15,leafH:1.0,leafCell:FC.MANG,leafTilt:0.9,leafC:[0.85,1,0.9],bark:RB,bark2:RB2};
    for(let i=0;i<5;i++){ const a=i/5*6.283+rnd()*0.8;
      grow(parts,[0.14+Math.cos(a)*0.05,2.4+rnd()*0.7,Math.sin(a)*0.05],unit(Math.cos(a),0.45,Math.sin(a)),1.5+rnd()*0.6,0.085,2,S); }
    return fin(parts); })();
  /* 대나무 — 곧게 선 마디 줄기 열두 대. 끝만 살짝 바깥으로 휜다. 위쪽 절반에 댓잎(키 5.5~9.5 m) */
  G.bamboo=(()=>{ const parts=[];
    for(let i=0;i<12;i++){ const a=rnd()*6.283, rr=Math.sqrt(rnd())*0.6, bx=Math.cos(a)*rr, bz=Math.sin(a)*rr, H=5.5+rnd()*4, r=0.035+rnd()*0.02,
          da=a+(rnd()-0.5)*1.2, pts=[], rad=[], n=5;
      for(let k=0;k<=n;k++){ const t=k/n, o=H*(0.012*t+0.085*t*t*t*t);
        pts.push([bx+Math.cos(da)*o,-0.2+(H+0.2)*t,bz+Math.sin(da)*o]); rad.push(r*(1-0.55*t)); }
      const gq=rnd(); parts.push({g:SHP.tube(pts,rad,6,0.4),cell:FC.RING,c:[0.42+gq*0.2,0.62+gq*0.12,0.26],c2:[0.62+gq*0.2,0.78+gq*0.08,0.34]});
      for(let k=0;k<5;k++){ const f=(0.5+k*0.105+rnd()*0.04)*n, j=Math.min(n-1,Math.floor(f)), u=f-j,
          p=[pts[j][0]+(pts[j+1][0]-pts[j][0])*u,pts[j][1]+(pts[j+1][1]-pts[j][1])*u,pts[j][2]+(pts[j+1][2]-pts[j][2])*u];
        parts.push(card(p,1.0+rnd()*0.4,0.9+rnd()*0.3,FC.BAMBOO,rnd()*6.283,0.9+rnd()*0.5,[0.95,1.05,0.8])); } }
    return fin(parts); })();
  /* 야자 — 휘어 오른 마디 줄기, 꼭대기에서 사방으로 늘어지는 잎 열세 장, 열매 넷(키 6.4 m) */
  G.palm=(()=>{ const parts=[], pts=[], rad=[], n=7;
    for(let k=0;k<=n;k++){ const t=k/n; pts.push([0.9*t*t+0.15*Math.sin(t*3),-0.2+6.4*t,0.1*Math.sin(t*4)]); rad.push(0.17-0.06*t+0.06*Math.exp(-t*8)); }
    parts.push({g:SHP.tube(pts,rad,7,0.6),cell:FC.RING,c:[0.50,0.42,0.33],c2:[0.66,0.57,0.45]});
    const top=pts[n];
    for(let i=0;i<13;i++){ const a=i/13*6.283+rnd()*0.3, up=i%3===0?0.25:(i%3===1?0.75:1.15);
      parts.push({g:SHP.frond(2.7+rnd()*0.5,1.0,{segs:6,curl:1.0+rnd()*0.5,cup:0.22,p:0.3,tip:0.6}),x:top[0],y:top[1]-0.05,z:top[2],q:face(a,up),cell:FC.PALM,c:[0.95,1,0.9]}); }
    for(let i=0;i<4;i++){ const a=i/4*6.283+0.4;
      parts.push({g:new THREE.SphereGeometry(0.13,8,6),x:top[0]+Math.cos(a)*0.16,y:top[1]-0.28,z:top[2]+Math.sin(a)*0.16,cell:FC.PLAIN,c:[0.36,0.27,0.15],c2:[0.50,0.40,0.22]}); }
    return fin(parts); })();
  /* 자작 — 흰 줄기에 가로 무늬, 가는 가지 여덟이 위로 뻗고 잎이 성기다(키 7.5 m) */
  G.birch=(()=>{ const parts=[], at=trunk(parts,7.5,0.12,0.035,{flare:0.25,sway:0.18,cell:FC.RING,c:[1.12,1.10,1.04],c2:[1.2,1.18,1.12],sides:6,segs:7});
    const S={taper:0.6,split:[2],spread:0.9,up:1.0,lift:0.25,shrink:0.7,bend:-0.04,leafN:3,leafW:0.95,leafH:1.0,leafCell:FC.LEAF,leafTilt:1.0,leafC:[1.1,1.25,0.72],bark:[0.75,0.72,0.66],bark2:[0.9,0.88,0.82]};
    for(let i=0;i<8;i++){ const a=i*2.4+rnd()*0.5;
      grow(parts,at(Math.min(0.98,0.42+i*0.07)),unit(Math.cos(a),0.9,Math.sin(a)),1.5-i*0.08+rnd()*0.3,0.035,1,S); }
    parts.push(card(at(1),0.9,1.0,FC.LEAF,0,0,[1.1,1.25,0.72]));
    return fin(parts); })();
  /* 어린 전나무 — 층층이 처진 솔가지 여덟 층(키 5.6 m) */
  G.pine=(()=>{ const parts=[], at=trunk(parts,5.6,0.10,0.02,{flare:0.4,sway:0.05,sides:6,segs:5}), NC=[0.9,1,0.95];
    for(let j=0;j<8;j++){ const t=0.14+j*0.105, L=1.75*(1-t*0.8), p=at(t);
      for(let i=0;i<5;i++) parts.push(card(p,L*0.85,L,FC.NEEDLE,i/5*6.283+j*0.7+rnd()*0.3,1.25+rnd()*0.2,NC)); }
    parts.push(card(at(0.93),0.5,0.75,FC.NEEDLE,0,0,NC));
    return fin(parts); })();
  /* 어린 활엽수 — 가는 줄기에 가지 넷(키 3~4 m) */
  G.sapling=(()=>{ const parts=[], at=trunk(parts,3.0,0.07,0.03,{flare:0.3,sway:0.15,sides:5,segs:4});
    const S={taper:0.62,split:[2],spread:1.3,up:0.8,lift:0.3,shrink:0.7,leafN:3,leafW:1.0,leafH:1.05,leafCell:FC.LEAF,leafTilt:0.8,leafC:[1,1.08,0.9]};
    for(let i=0;i<4;i++){ const a=i/4*6.283+rnd(); grow(parts,at(0.55+i*0.13),unit(Math.cos(a),0.8,Math.sin(a)),0.9+rnd()*0.4,0.03,1,S); }
    return fin(parts); })();
  /* 바나나 — 풀빛 줄기에 크고 넓은 잎 여덟 장, 노란 송이(키 3 m) */
  G.banana=(()=>{ const parts=[{g:SHP.tube([[0,-0.2,0],[0.02,0.8,0],[0.05,1.7,0.02]],[0.11,0.09,0.06],7,0.5),cell:FC.PLAIN,c:[0.38,0.5,0.24],c2:[0.5,0.62,0.3]}];
    for(let i=0;i<8;i++){ const a=i*2.4+rnd()*0.4;
      parts.push({g:SHP.frond(1.7+rnd()*0.5,0.62,{segs:5,curl:0.7+rnd()*0.6,cup:0.2,p:0.4,tip:0.55}),x:0.05,y:1.55,z:0.02,q:face(a,0.15+i/8),cell:FC.BIG,c:[0.92,1,0.88]}); }
    for(let i=0;i<7;i++){ const a=i/7*6.283;
      parts.push({g:SHP.limb([0.16+Math.cos(a)*0.04,1.28,0.1+Math.sin(a)*0.04],unit(Math.cos(a)*0.5,-0.6,Math.sin(a)*0.5),0.16,0.022,0.016,2,5,0.5,1),cell:FC.PLAIN,c:[0.85,0.72,0.2],c2:[0.95,0.85,0.3]}); }
    return fin(parts); })();
  /* 나무고사리 — 짙은 줄기 끝에 고사리 잎이 우산처럼(키 3 m) */
  G.treefern=(()=>{ const parts=[], at=trunk(parts,2.3,0.12,0.09,{flare:0.2,sway:0.1,c:[0.26,0.2,0.15],c2:[0.36,0.28,0.2],sides:6,segs:3}), top=at(1);
    for(let i=0;i<11;i++){ const a=i/11*6.283+rnd()*0.3;
      parts.push({g:SHP.frond(1.6+rnd()*0.4,0.6,{segs:5,curl:1.1+rnd()*0.4,cup:0.15,p:0.35,tip:0.5}),x:top[0],y:top[1],z:top[2],q:face(a,0.5+rnd()*0.4),cell:FC.FERN,c:W}); }
    return fin(parts); })();
  /* 아카시아 — 낮은 줄기가 넓게 갈라져 납작한 우산 꼴(키 4 m) */
  G.acacia=(()=>{ const AB=[0.36,0.30,0.25], AB2=[0.50,0.43,0.35], parts=[], at=trunk(parts,2.4,0.14,0.10,{flare:0.4,sway:0.3,sides:6,segs:4,c:AB,c2:AB2});
    const S={taper:0.66,split:[2,2],spread:1.5,up:0.25,lift:0.22,shrink:0.75,bend:0.02,leafN:3,leafW:1.5,leafH:1.0,leafCell:FC.LEAF,leafTilt:1.25,leafC:[1.05,1.05,0.62],bark:AB,bark2:AB2};
    for(let i=0;i<4;i++){ const a=i/4*6.283+rnd(); grow(parts,at(0.95),unit(Math.cos(a),0.55,Math.sin(a)),1.6+rnd()*0.5,0.075,2,S); }
    return fin(parts); })();
  /* 고사리 — 바깥으로 휘어 눕는 잎 여덟 장 */
  G.fern=(()=>{ const parts=[];
    for(let i=0;i<8;i++){ const a=i/8*6.283+rnd()*0.4;
      parts.push({g:SHP.frond(0.7+rnd()*0.3,0.30,{segs:5,curl:0.9+rnd()*0.5,cup:0.15,p:0.35,tip:0.5}),y:0.02,q:face(a,0.45+rnd()*0.4),cell:FC.FERN,c:W}); }
    return fin(parts); })();
  /* 덤불 — 잔가지 다섯에 잎 판때기 열한 장 */
  G.bush=(()=>{ const parts=[];
    for(let i=0;i<5;i++){ const a=i/5*6.283+rnd(); parts.push({g:SHP.limb([0,-0.05,0],unit(Math.cos(a)*0.7,1,Math.sin(a)*0.7),0.55+rnd()*0.25,0.025,0.012,1,4,0,0),cell:FC.BARK,c:BARK}); }
    for(let i=0;i<11;i++){ const a=rnd()*6.283, rr=rnd()*0.35;
      parts.push(card([Math.cos(a)*rr,0.05+rnd()*0.45,Math.sin(a)*rr],0.75+rnd()*0.3,0.7+rnd()*0.3,FC.LEAF,a,0.3+rnd()*0.8,[0.95,1.05,0.9])); }
    return fin(parts); })();
  /* 들꽃 — 꽃 그림 판때기 세 겹 */
  G.flower=(()=>{ const parts=[];
    for(let i=0;i<3;i++){ const a=i*2.1+rnd()*0.5, rr=i?0.12:0; parts.push({g:SHP.card(0.55,0.55),x:Math.cos(a)*rr,z:Math.sin(a)*rr,ry:a,cell:FC.FLOWER,c:W}); }
    return fin(parts); })();
  /* 마른 덤불 — 잔가지 그림 판때기 넷 */
  G.dry=(()=>{ const parts=[];
    for(let i=0;i<4;i++){ const a=i/4*6.283+rnd(); parts.push(card([Math.cos(a)*0.08,0,Math.sin(a)*0.08],0.8+rnd()*0.3,0.75+rnd()*0.3,FC.TWIG,a,0.25+rnd()*0.5,W)); }
    return fin(parts); })();
  /* 버섯 — 갓 넷이 모여 난다 */
  G.shroom=(()=>{ const parts=[];
    for(let i=0;i<4;i++){ const a=i*1.9, rr=i?0.09+rnd()*0.06:0, h=0.07+rnd()*0.07, r=0.035+rnd()*0.025, x=Math.cos(a)*rr, z=Math.sin(a)*rr;
      parts.push({g:SHP.limb([x,-0.02,z],[0,1,0],h,r*0.30,r*0.25,1,5,0,0),cell:FC.PLAIN,c:[0.86,0.82,0.72]});
      parts.push({g:SHP.lathe([[r*0.3,0],[r,-0.012],[r*0.92,0.012],[r*0.55,0.030],[0.001,0.038]],8),x,y:h-0.02,z,cell:FC.PLAIN,c:[0.62,0.36,0.20],c2:[0.78,0.50,0.28]}); }
    return fin(parts); })();

  FLORA.tex=floraAtlas();
  FLORA.mat=new THREE.MeshLambertMaterial({map:FLORA.tex,alphaTest:0.4,vertexColors:true,side:THREE.DoubleSide});
  /* 잎 판때기의 그림자 — 깊이 재질도 그림의 알파로 잘라야 판 네모가 통째로 찍히지 않는다 */
  FLORA.depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:FLORA.tex,alphaTest:0.4});
  FLORA.m={};
  for(const L of [FLORA.far,FLORA.near]) for(const k of L.kinds){
    const im=new THREE.InstancedMesh(G[k],FLORA.mat,FLORA_KIND[k].cap);
    im.setColorAt(0,new THREE.Color(1,1,1));          // 색 버퍼는 count 가 가득일 때 만든다
    im.count=0; im.frustumCulled=false;
    if(L===FLORA.far) im.customDepthMaterial=FLORA.depth;   // 나무는 그림자를 드리운다
    else im.userData.lightRole='recv';                      // 덤불·고사리는 받기만
    im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im);
    FLORA.m[k]=im; L.n[k]=0;
  }
}

/* ── 깔기 ────────────────────────────────────────────────────────────────── */
const _flM=new THREE.Matrix4(), _flQ=new THREE.Quaternion(), _flE=new THREE.Euler(), _flV=new THREE.Vector3(),
      _flS=new THREE.Vector3(), _flC=new THREE.Color();
function floraLayer(L,which){
  const U=FLORA, px=PL.pos.x, pz=PL.pos.z, C=L.cell, R=L.R, n=L.n, far=which==='far';
  L.cx=px; L.cz=pz; L.cols.length=0; L.picks.length=0;
  for(const k of L.kinds) n[k]=0;
  const x0=Math.floor((px-R)/C), x1=Math.floor((px+R)/C), z0=Math.floor((pz-R)/C), z1=Math.floor((pz+R)/C);
  for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){
    const h=floraHash(gx,gz,L.salt);
    const wx=(gx+(h&255)/255)*C, wz=(gz+((h>>>8)&255)/255)*C;
    const ddx=wx-px, ddz=wz-pz, d=Math.sqrt(ddx*ddx+ddz*ddz); if(d>R) continue;
    const ci=IDX(clamp(Math.round(wx/CELL+N/2),1,N-2),clamp(Math.round(wz/CELL+N/2),1,N-2));
    const el=F.elev[ci], bi=F.biome[ci];
    let u=((h>>>16)&4095)/4095, pick=null, patch=0;
    if(far&&el>-0.9&&el<0.5&&!F.river[ci]&&(bi===B.MARSH||F.dRiver[ci]<34)){
      /* 강어귀와 늪 가의 얕은 물 — 맹그로브가 띠를 이룬다(얼룩 잡음이 높은 데만 · 민물과 바다가 만나는 자리가 가려진다) */
      if(floraVal(wx,wz,26,41)>0.42&&u<FLORA_MANGROVE[1]) pick=FLORA_MANGROVE;
    }else{
      if(el<0.4||F.river[ci]||F.slope[ci]>0.75) continue;
      let cm=floraCommAt(wx,wz,bi); if(!cm) continue;
      if(cm.low&&el>cm.low) cm=FLORA_COMM[bi][1];     // 맹그로브는 바닷가 낮은 늪에만 — 산 위 이탄지는 고사리 늪
      patch=_fp.id;
      /* 얼룩 가장자리로 갈수록 성기다(군락 사이의 빈터) · 그 안에서도 잔 얼룩으로 뭉쳤다 풀렸다 한다 */
      const dens=clamp(_fp.edge/10,0.12,1)*(0.55+0.9*floraVal(wx,wz,11,43));
      for(const t of cm[which]){ const pr=t[1]*dens; if(u<pr){ pick=t; break; } u-=pr; }
    }
    if(!pick) continue;
    const kind=pick[0], im=U.m[kind], K=FLORA_KIND[kind]; if(n[kind]>=im.instanceMatrix.count) continue;
    // 큰 나무·바위·설비·벽이 선 자리, 지은 바닥 위는 비운다
    const pad=(K.r||0)+0.5, cgx=Math.floor(wx/CG), cgz=Math.floor(wz/CG); let hit=false;
    for(let az=-1;az<=1&&!hit;az++) for(let ax=-1;ax<=1&&!hit;ax++){
      const a=CGRID.get(cgKey(cgx+ax,cgz+az)); if(!a) continue;
      for(const o of a){ const ox=wx-o.x, oz=wz-o.z, rr=o.r+pad; if(ox*ox+oz*oz<rr*rr){ hit=true; break; } }
    }
    if(hit) continue;
    const gy=heightAt(wx,wz);
    if(floorAt(wx,wz)>gy+0.05) continue;
    const key=(far?'F':'N')+gx+','+gz, P=K.pick?FLORA_PICK[K.pick]:null;
    if(P&&P.hide){ const t=U.taken.get(key); if(t!==undefined){ if(gameHours-t<P.regrow) continue; U.taken.delete(key); } }
    const h2=floraHash(gx,gz,L.salt+1);
    const v=(h2&1023)/1023, sc=(pick[2]+(pick[3]-pick[2])*v)*clamp((R-d)/L.fade,0.25,1);
    const tl=far?0.05:0.16;
    _flE.set(((h2>>>10)&31)/31*tl-tl/2,((h2>>>15)&1023)/1023*6.283,((h2>>>25)&31)/31*tl-tl/2); _flQ.setFromEuler(_flE);
    _flV.set(wx,gy-0.03,wz); _flS.set(sc,sc*(0.9+0.2*((h>>>28)&15)/15),sc);
    _flM.compose(_flV,_flQ,_flS); im.setMatrixAt(n[kind],_flM);
    if(kind==='flower'){ const t=FLOWER_TINT[patch%FLOWER_TINT.length]; _flC.setRGB(t[0],t[1],t[2]); }   // 꽃밭은 얼룩마다 한 빛깔
    else{ const g=0.86+0.26*((h2>>>3)&15)/15, w=((h2>>>7)&15)/15; _flC.setRGB(g*(0.94+0.14*w),g,g*(0.92+0.08*(1-w))); }
    im.setColorAt(n[kind]++,_flC);
    if(K.r) L.cols.push({x:wx,z:wz,r:K.r*sc});
    if(P) L.picks.push({kind:K.pick,x:wx,y:gy,z:wz,key,r:(K.r||0.12)*sc,tree:!P.hide});
  }
  for(const k of L.kinds){ const im=U.m[k]; im.count=n[k]; im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; }
  if(far) LIGHT.dirtyAt(px,pz,R);                      // 나무가 바뀌었다 — 그림자 지도를 다시 그린다
}
function updateFlora(force){
  const U=FLORA; if(!scene) return;
  if(!U.m) floraBuild();
  const px=PL.pos.x, pz=PL.pos.z;
  for(const L of [U.far,U.near]){
    const dx=px-L.cx, dz=pz-L.cz;
    if(force||dx*dx+dz*dz>=L.step*L.step) floraLayer(L,L===U.far?'far':'near');
  }
  floraFindLook();
}
/* 줄기에 몸이 막힌다 — updatePlayer 가 큰 나무·바위(resolveProps) 다음에 부른다 */
function floraCollide(p,radius){
  for(const L of [FLORA.far,FLORA.near]) for(const c of L.cols){
    const dx=p.x-c.x, dz=p.z-c.z, rr=c.r+radius, d2=dx*dx+dz*dz;
    if(d2<rr*rr&&d2>1e-6){ const d=Math.sqrt(d2), k=(rr-d)/d; p.x+=dx*k; p.z+=dz*k; }
  }
}
function floraReset(seed){
  FLORA.seed=seed|0; FLORA.far.cx=FLORA.far.cz=FLORA.near.cx=FLORA.near.cz=1e9;
  FLORA.far.cols.length=FLORA.near.cols.length=0; FLORA.far.picks.length=FLORA.near.picks.length=0;
  FLORA.taken.clear(); FLORA.look=null;
}

/* ── 얻기 ────────────────────────────────────────────────────────────────── */
/* 눈앞의 딸 것 — 나무는 줄기에서 1.7 m 안에서 그쪽을 보고 있을 때, 버섯은 눈에서 2.2 m 안 */
function floraFindLook(){
  FLORA.look=null;
  if(uiOpen()||PL.dead||PL.swim) return;
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z, cp=Math.cos(PL.pitch);
  const fx=-Math.sin(PL.yaw)*cp, fy=Math.sin(PL.pitch), fz=-Math.cos(PL.yaw)*cp, hx=-Math.sin(PL.yaw), hz=-Math.cos(PL.yaw);
  let bd=1e9;
  for(const L of [FLORA.far,FLORA.near]) for(const p of L.picks){
    const dx=p.x-ex, dz=p.z-ez;
    if(p.tree){
      const d=Math.sqrt(dx*dx+dz*dz); if(d>p.r+1.7||d<1e-3) continue;
      if((dx*hx+dz*hz)/d<0.75) continue;
      if(d<bd){ bd=d; FLORA.look=p; }
    }else{
      const dy=p.y+0.06-ey, d=Math.sqrt(dx*dx+dy*dy+dz*dz); if(d>2.2||d<0.05) continue;
      if((dx*fx+dy*fy+dz*fz)/d<0.6) continue;
      if(d<bd){ bd=d; FLORA.look=p; }
    }
  }
}
/* 아직 다시 안 났으면 남은 시간(게임 시간), 딸 수 있으면 0 */
function floraWait(p){
  const t=FLORA.taken.get(p.key); if(t===undefined) return 0;
  const left=FLORA_PICK[p.kind].regrow-(gameHours-t);
  if(left<=0){ FLORA.taken.delete(p.key); return 0; }
  return left;
}
/* 좌클릭 — 눈앞의 것을 딴다. 땄거나 막혔으면 true(손의 것을 쓰지 않는다) */
function floraPick(){
  const p=FLORA.look; if(!p) return false;
  const D=FLORA_PICK[p.kind], left=floraWait(p);
  if(left>0){ toast(D.n+' — 아직 다시 나지 않았다(약 '+Math.ceil(left)+'시간 뒤)'); return true; }
  if(D.need==='sharp'&&!INV.slots.some(s=>{ const t=ITEMS[s.id]; return (t.tags&&t.tags.indexOf('sharp')>=0)||(t.tool&&(t.tool.weapon||t.tool.axe)); })){
    toast(D.n+' — 맨손으로는 못 벤다. 날붙이(주먹도끼·칼·도끼)를 지녀야 한다'); return true; }
  const hh=floraHash(Math.round(p.x*3),Math.round(p.z*3),(gameHours|0)+9), n=D.cnt[0]+hh%(D.cnt[1]-D.cnt[0]+1);
  let got=0; for(let i=0;i<n;i++) if(invAdd(D.item,1)) got++;
  if(!got){ toast('무거워서 더 못 든다'); return true; }
  FLORA.taken.set(p.key,gameHours); FLORA.look=null;
  if(D.hide) FLORA.near.cx=1e9;                        // 버섯은 그 자리가 빈다 — 다음 프레임에 다시 깐다
  toast(D.n+' +'+got); sfx('bind'); invDirty=true;
  return true;
}
