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
   ⑥ **그루마다 생김새가 다르다** — 종류마다 씨앗만 바꿔 여러 벌을 지어 두고(`floraShapes` · 벌 수 `FLORA_VARS` — 나무 8 · 덤불·고사리 6 ·
      꽃·마른 덤불·버섯 4) 칸 번호의 해시로 그루마다 한 벌을 고른다. 짜임(줄기·가지 치는 법·잎 그림)은 그대로고 가지·잎·줄기 수는
      원래 값의 ±1~2, 키는 ±10% 안에서만 흔든다. 벌마다 인스턴스 메시가 하나라 `FLORA.m[종류]` 는 배열이다.
      **제 생김새는 가까이서만** — 나무는 25 m(`FULL_DIST` · 참나무·전나무가 제 나무를 그리는 거리), 덤불·고사리는 12 m(층의 `own`)
      밖이면 종류마다 **사람에게서 가장 가까운 그루의 벌 하나**(`FLORA.ref` — 섬마다 그 종류가 처음 깔릴 때 정한다)로 모두 찍는다.
      참나무·전나무의 기준 나무(`FAR_REF`)와 같은 방식이다. 벌이 여덟이면 그리기 호출이 여덟이던 것이, 먼 쪽은 하나로 모인다.
   노거수(뿌리가 땅이 되는 큰 나무)는 95-giants.js 가 '노거수 숲' 군락에 세운다.
   ========================================================================== */
const FLORA={seed:0, m:null, mat:null, depth:null, tex:null, patch:84, taken:new Map(), look:null, ref:{}, pend:[], pendN:0,
  far :{cx:1e9,cz:1e9,R:110,cell:6,  step:12,fade:14,salt:3,own:FULL_DIST,cols:[],picks:[],n:{},kinds:['jungle','mangrove','bamboo','palm','birch','pine','sapling','banana','treefern','acacia']},
  near:{cx:1e9,cz:1e9,R:46, cell:2.4,step:6, fade:7, salt:1,own:12,cols:[],picks:[],n:{},kinds:['fern','bush','flower','dry','shroom']}};
/* 그림 묶음의 칸 */
const FC={BARK:0,RING:1,LEAF:2,BIG:3,FERN:4,PALM:5,BAMBOO:6,NEEDLE:7,FLOWER:8,TWIG:9,MANG:10,VINE:11,BIRCH:12,PLAIN:13,STEM:14,CAP:15};
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

/* ── 껍질·잎 그림 묶음(1024 px · 4×4 칸 · 칸 256 px) ─────────────────────────
   잎 그림은 **작은 잎 여러 장이 잔가지에 붙은 한 줌**이다 — 예전엔 판때기 하나에 큰 잎 아홉 장이라 2 m 판에서 잎 한 장이
   0.5~1 m 였다(나무가 커다란 잎 몇 장으로 읽혔다). 잎마다 밑동→끝 명암 · 잎맥 한쪽 그늘 · 가는 주맥 · 빛깔 흔들기 ·
   뒤집힌 잎(옅은 잿빛 뒷면) 몇 장을 그린다. 껍질은 값잡음으로 터진 골 · 판 · 지의류 얼룩을 칠한다(잿빛 — 빛깔은 정점 색) */
function floraAtlas(){
  const S=1024, K=256, Z=K/128, c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d'), rnd=mulberry32(0xa71a5);
  const cell=(i,fn)=>{ g.save(); g.translate((i&3)*K,(i>>2)*K); g.beginPath(); g.rect(0,0,K,K); g.clip(); fn(); g.restore(); };
  const pick=a=>a[(rnd()*a.length)|0];
  /* 잎 빛깔 — 색상·채도·밝기를 조금씩 흔든다(누런 풀빛 ~ 푸른 풀빛). back 이면 뒷면(옅고 잿빛) */
  const hsl=(h,s,l)=>'hsl('+h.toFixed(1)+','+s.toFixed(1)+'%,'+l.toFixed(1)+'%)';
  const leafCol=(H,Sat,L,back)=>{ const h=H+(rnd()-0.5)*14, s=Sat+(rnd()-0.5)*12, l=L+(rnd()-0.5)*7;
    return back?[hsl(h-6,s*0.45,l+13),hsl(h-6,s*0.4,l+20)]:[hsl(h,s,l-4),hsl(h+4,s+4,l+5)]; };
  /* 잎 한 장 — 밑동(x,y)에서 ang 쪽으로 뻗는다. o: back 뒷면 · nv 곁맥 쌍 · round 끝 둥글기 · H/Sat/L 빛깔 · tear 찢김 */
  const leaf=(x,y,len,w,ang,o)=>{ o=o||{};
    const [c0,c1]=o.col||leafCol(o.H||95,o.Sat||44,o.L||31,o.back), rd=o.round||0.74;
    g.save(); g.translate(x,y); g.rotate(ang);
    const path=()=>{ g.beginPath(); g.moveTo(0,0);
      g.bezierCurveTo( w,-len*0.26,  w*rd,-len*0.84, 0,-len);
      g.bezierCurveTo(-w*rd,-len*0.84, -w,-len*0.26, 0,0); g.closePath(); };
    path(); const gr=g.createLinearGradient(0,0,0,-len); gr.addColorStop(0,c0); gr.addColorStop(1,c1); g.fillStyle=gr; g.fill();
    g.save(); g.clip();
    g.fillStyle='rgba(0,0,0,'+(0.10+rnd()*0.10)+')'; g.fillRect(0,-len,w*1.2,len);          // 주맥 한쪽이 접혀 그늘진다
    const sh=g.createLinearGradient(0,0,0,-len*0.35); sh.addColorStop(0,'rgba(0,0,0,0.22)'); sh.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=sh; g.fillRect(-w,-len,w*2,len);                                               // 잎자루 쪽이 어둡다
    if(!o.back&&rnd()<0.5){ g.fillStyle='rgba(255,255,230,'+(0.05+rnd()*0.07)+')'; g.fillRect(-w,-len,w,len); }   // 반대쪽은 볕에 번들
    if(o.nv!==0){ g.strokeStyle=o.back?'rgba(230,240,220,0.35)':'rgba(200,220,150,0.30)'; g.lineCap='round';
      g.lineWidth=Math.max(0.7,len*0.028); g.beginPath(); g.moveTo(0,-len*0.02); g.quadraticCurveTo(w*0.06,-len*0.5,0,-len*0.96); g.stroke();
      const nv=o.nv||4; g.lineWidth=Math.max(0.5,len*0.011); g.strokeStyle='rgba(200,220,150,0.16)';
      for(let i=1;i<=nv;i++){ const t=i/(nv+1), yy=-len*t, ww=w*(0.5+0.5*Math.sin(Math.PI*t))*0.9;
        g.beginPath(); g.moveTo(0,yy); g.quadraticCurveTo(ww*0.5,yy-len*0.05, ww,yy-len*0.13); g.stroke();
        g.beginPath(); g.moveTo(0,yy); g.quadraticCurveTo(-ww*0.5,yy-len*0.05,-ww,yy-len*0.13); g.stroke(); } }
    if(rnd()<(o.spot||0.12)){ g.fillStyle='rgba(120,90,30,0.35)'; g.beginPath(); g.arc((rnd()-0.5)*w,-len*(0.3+rnd()*0.5),len*0.04+rnd()*len*0.05,0,6.283); g.fill(); }  // 벌레 먹은·마른 자국
    g.restore();
    path(); g.lineWidth=Math.max(0.6,len*0.012); g.strokeStyle='rgba(20,30,10,0.45)'; g.stroke();   // 테두리
    g.restore();
  };
  const line=(x0,y0,x1,y1,w,col)=>{ g.strokeStyle=col; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); };
  const curve=(x0,y0,cx,cy,x1,y1,w,col)=>{ g.strokeStyle=col; g.lineWidth=w; g.lineCap='round'; g.beginPath(); g.moveTo(x0,y0); g.quadraticCurveTo(cx,cy,x1,y1); g.stroke(); };
  /* 값잡음 — 껍질 그림용(칸 안에서만, 가로는 이어 붙게 주기 둔다) */
  const vh=(i,j,s)=>{ let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,2246822519))|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967295; };
  const vn=(x,y,px,s)=>{ const i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), m=k=>((k%px)+px)%px;
    const a=vh(m(i),j,s), b=vh(m(i+1),j,s), c2=vh(m(i),j+1,s), d=vh(m(i+1),j+1,s); return a+(b-a)*u+(c2-a)*v+(a-b-c2+d)*u*v; };
  const paint=(i,fn)=>{ const im=g.createImageData(K,K), D=im.data;
    for(let y=0;y<K;y++) for(let x=0;x<K;x++){ const v=fn(x/K,y/K), o=(y*K+x)*4; D[o]=D[o+1]=D[o+2]=Math.max(0,Math.min(255,v*255)); D[o+3]=255; }
    g.putImageData(im,(i&3)*K,(i>>2)*K); };
  // 0 거친 껍질 — 세로로 터진 골(줄이 굽이치며 갈라졌다 만난다) · 골 사이 판 · 판의 가로 금 · 옅은 지의류 얼룩
  const ss=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  paint(FC.BARK,(u,v)=>{ const wx=vn(u*4,v*3,4,7)-0.5;
    /* 판때기 칸 하나가 줄기 하나를 통째로 덮는다(둘레 1~2 m · 길이 3~9 m) — 세로로 4~5배 늘어나므로 세로 잡음을 그만큼 잘게 둔다 */
    const r1=1-Math.abs(2*vn(u*14+wx*2,v*5,14,8)-1), r2=1-Math.abs(2*vn(u*28+wx*2,v*10,28,25)-1);   // 0.5 등고선 = 갈라졌다 만나는 세로 골
    let k=0.76+0.06*vn(u*16,v*12,16,9)+0.12*vn(u*64,v*60,64,26);
    k*=1-0.80*ss(0.60,0.92,r1); k*=1-0.42*ss(0.70,0.95,r2);                                 // 굵은 골 · 잔 골
    k*=0.90+0.10*vn(u*20,v*120,20,10);                                                      // 판마다 가로로 끊긴 명암
    const lich=vn(u*5+0.3,v*4,5,11); if(lich>0.74&&r1<0.6) k=Math.min(0.95,k+0.25*(lich-0.74)/0.26);   // 옅은 지의류
    return k; });
  // 1 마디 진 껍질 — 대나무 마디 · 야자의 잎자국(가로 금이 고르지 않게)
  paint(FC.RING,(u,v)=>{ const yy=v*7+vn(u*2,v*3,2,12)*0.18, f=yy-Math.floor(yy);
    let k=0.74+0.10*vn(u*30,v*4,30,13)+0.06*vn(u*4,v*40,4,14);
    if(f<0.05) k*=0.45; else if(f<0.09) k*=1.12; else if(f>0.93) k*=0.88;
    return k; });
  // 12 자작 껍질 — 흰 바탕에 가로로 긴 숨구멍(검은 줄) · 군데군데 검게 터진 자리 · 밑동은 거칠고 검다
  paint(12,(u,v)=>{ let k=0.90+0.06*vn(u*8,v*6,8,15);
    const len=vn(u*14,v*60,14,16); if(len>0.72) k*=0.35+0.4*(1-(len-0.72)/0.28);
    const blot=vn(u*4,v*5,4,17); if(blot>0.74) k*=0.25;
    const base=Math.max(0,(0.12-v)/0.12); if(base>0) k*=1-0.7*base*(0.5+0.5*vn(u*12,v*30,12,18));
    return k; });
  // 14 바나나 거짓줄기 — 세로 결 · 겹친 잎집의 가장자리 · 말라 들뜬 갈색 잎집 조각
  paint(14,(u,v)=>{ let k=0.80+0.10*vn(u*50,v*3,50,19)+0.06*vn(u*7,v*2,7,20);
    const sheath=(u*3+vn(u*2,v*2,2,21)*0.3)%1; if(sheath<0.03) k*=0.6;
    if(vn(u*9,v*5,9,22)>0.8) k*=0.72;
    return k; });
  // 15 버섯 갓 — 고운 방사 결 · 점박이
  paint(15,(u,v)=>{ let k=0.86+0.08*vn(u*60,v*3,60,23); if(vn(u*20,v*12,20,24)>0.82) k*=1.12; return Math.min(1,k); });

  // 2 넓은잎 한 줌 — 잔가지 셋이 갈라져 오르며 서른 장 남짓 어긋나게 붙는다
  cell(FC.LEAF,()=>{ const twig=(x0,y0,a,L,n,d)=>{ const x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L;
      curve(x0,y0,(x0+x1)/2+(rnd()-0.5)*L*0.2,(y0+y1)/2,x1,y1,(1.2+d*0.8)*Z,'#5a4a34');
      for(let i=0;i<n;i++){ const t=0.25+0.75*i/(n-1||1), px=x0+(x1-x0)*t, py=y0+(y1-y0)*t, s=i%2?1:-1, ll=K*(0.11+rnd()*0.07);
        leaf(px,py,ll,ll*(0.34+rnd()*0.1),a+1.5708+s*(0.55+rnd()*0.6),{back:rnd()<0.18,nv:4}); }
      leaf(x1,y1,K*(0.13+rnd()*0.05),K*0.05,a+1.5708+(rnd()-0.5)*0.4,{nv:4});
      if(d>0) for(let k=0;k<2;k++) twig(x0+(x1-x0)*(0.45+k*0.25),y0+(y1-y0)*(0.45+k*0.25),a+(k?0.55:-0.55)+(rnd()-0.5)*0.3,L*0.55,4,d-1); };
    for(let i=0;i<3;i++) twig(K*(0.5+(rnd()-0.5)*0.06),K*0.98,-1.5708+(i-1)*0.5+(rnd()-0.5)*0.2,K*(0.55+rnd()*0.15),6,1); });
  // 3 큰 잎 한 장 — 바나나·밀림의 넓은 잎. 주맥에서 곁맥이 나란히 비스듬히 나가고, 곁맥을 따라 가장자리부터 찢긴다
  cell(FC.BIG,()=>{ const L=K*0.97, W=K*0.38;
    leaf(K*0.5,K*0.995,L,W,0,{col:['#3a6a2c','#5a8e3a'],nv:0,round:0.82,spot:0});
    g.save(); g.translate(K*0.5,K*0.995);
    g.beginPath(); g.moveTo(0,0); g.bezierCurveTo(W,-L*0.26,W*0.82,-L*0.84,0,-L); g.bezierCurveTo(-W*0.82,-L*0.84,-W,-L*0.26,0,0); g.closePath(); g.clip();
    for(let i=0;i<46;i++){ const t=0.03+i/46*0.94, y=-L*t;                                       // 나란한 곁맥 — 짙은 골 · 밝은 등 번갈아
      for(const q of [-1,1]){ g.strokeStyle=i%2?'rgba(10,30,5,0.30)':'rgba(200,230,150,0.13)'; g.lineWidth=(i%2?0.9:0.7)*Z;
        g.beginPath(); g.moveTo(0,y); g.quadraticCurveTo(q*W*0.5,y-L*0.06,q*W*1.1,y-L*0.18); g.stroke(); } }
    g.fillStyle='rgba(0,0,0,0.12)'; g.fillRect(0,-L,W*1.2,L);                                   // 한쪽이 처져 그늘
    for(let i=0;i<6;i++){ const q=rnd()<0.5?-1:1, t=0.2+rnd()*0.7, y=-L*t;                    // 마른 가장자리 — 테 밖에 둔 원이라 안쪽 띠만 칠해진다
      g.fillStyle='rgba(125,95,40,0.75)'; g.beginPath(); g.arc(q*(W*0.95+W*0.18),y,W*0.25,0,6.283); g.fill(); }
    g.globalCompositeOperation='destination-out';
    for(let i=0;i<11;i++){ const q=rnd()<0.5?-1:1, t=0.12+rnd()*0.78, y=-L*t, dep=0.3+rnd()*0.6;  // 곁맥을 따라 가장자리부터 찢긴다
      g.beginPath(); g.moveTo(q*W*1.15,y-L*0.18-2.2*Z); g.lineTo(q*W*1.15,y-L*0.18+2.2*Z); g.quadraticCurveTo(q*W*(1-dep*0.5),y-L*0.12*(1-dep*0.3),q*W*(1-dep),y-L*0.18*(1-dep)); g.closePath(); g.fill(); }
    g.globalCompositeOperation='source-over';
    g.strokeStyle='#b4c878'; g.lineWidth=3.4*Z; g.beginPath(); g.moveTo(0,0); g.lineTo(0,-L*0.97); g.stroke();
    g.restore(); });
  // 4 고사리 잎 — 두 번 깃꼴: 잎줄기 양옆 깃 조각마다 작은 잎이 줄지어 난다
  cell(FC.FERN,()=>{ curve(K*0.5,K*0.99,K*0.53,K*0.5,K*0.5,K*0.03,1.8*Z,'#4f6a2c');
    for(let i=0;i<19;i++){ const t=i/18, y=K*(0.94-0.88*t), x=K*(0.5+0.02*Math.sin(t*3)), len=K*0.40*Math.sin(Math.PI*(0.1+t*0.9))*(1-t*0.3)+3*Z;
      for(const s of [-1,1]){ const a=-1.5708+s*(1.05+t*0.25), ex=x+Math.cos(a)*len, ey=y+Math.sin(a)*len;
        line(x,y,ex,ey,0.9*Z,'#557030'); const col=leafCol(92,46,28,false);
        for(let k=0;k<9;k++){ const u=(k+0.5)/9, px=x+(ex-x)*u, py=y+(ey-y)*u, ll=len*0.20*(1-u*0.6);
          leaf(px,py,ll,ll*0.42,a+1.5708+(k%2?1:-1)*0.95,{col,nv:0,spot:0}); } } } });
  // 5 야자 잎 — 잎줄기에서 가늘고 긴 쪽잎이 처지며 휜다 · 끝이 마른 것도
  cell(FC.PALM,()=>{ curve(K*0.5,K*0.99,K*0.52,K*0.5,K*0.5,K*0.02,2.6*Z,'#8a9046');
    for(let i=0;i<34;i++){ const t=i/33, y=K*(0.97-0.94*t), len=K*0.46*(0.5+0.5*Math.sin(Math.PI*t*0.9+0.2));
      for(const s of [-1,1]){ const a=-1.5708+s*(0.85+rnd()*0.2), ex=K*0.5+Math.cos(a)*len, ey=y+Math.sin(a)*len+len*0.35;
        const gr=g.createLinearGradient(K*0.5,y,ex,ey), h=88+rnd()*16, l=24+rnd()*6;
        gr.addColorStop(0,hsl(h,42,l-3)); gr.addColorStop(0.8,hsl(h+3,46,l+5)); gr.addColorStop(1,rnd()<0.25?'#8a7040':hsl(h,40,l+4));
        g.strokeStyle=gr; g.lineWidth=(2.4+rnd()*1.2)*Z; g.lineCap='round';
        g.beginPath(); g.moveTo(K*0.5,y); g.quadraticCurveTo(K*0.5+Math.cos(a)*len*0.6,y+Math.sin(a)*len*0.6,ex,ey); g.stroke(); } } });
  // 6 댓잎 — 휜 잔가지 끝마다 가늘고 긴 잎이 서너 장씩 부채로
  cell(FC.BAMBOO,()=>{ const br=(x0,y0,a,L)=>{ const x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L; curve(x0,y0,(x0+x1)/2+3*Z,(y0+y1)/2,x1,y1,1.1*Z,'#8a9a4a');
      for(let k=0;k<4;k++) leaf(x1,y1,K*(0.20+rnd()*0.10),K*0.028,a+1.5708+(k-1.5)*0.45+(rnd()-0.5)*0.2,{H:84,Sat:42,L:32,nv:0,round:0.5,spot:0.05}); };
    line(K*0.5,K*0.99,K*0.47,K*0.30,1.6*Z,'#8a9a4a');
    for(let i=0;i<9;i++){ const t=i/8, x=K*(0.5-0.03*t), y=K*(0.92-0.62*t), s=i%2?1:-1; br(x,y,-1.5708+s*(0.7+rnd()*0.4),K*(0.16+rnd()*0.12)); } });
  // 7 솔가지 — 잔가지에 짧은 바늘잎이 빽빽이 · 끝의 새순은 밝다
  cell(FC.NEEDLE,()=>{ const tw=(x0,y0,x1,y1,n,L)=>{ line(x0,y0,x1,y1,1.4*Z,'#4a3a2a');
      for(let i=0;i<n;i++){ const t=i/(n-1), x=x0+(x1-x0)*t, y=y0+(y1-y0)*t, a=Math.atan2(y1-y0,x1-x0), tip=t>0.85;
        for(const s of [-1,1]) for(let r=0;r<2;r++){ const b=a+s*(0.7+rnd()*0.6), l=L*(1-t*0.4)*(0.7+rnd()*0.4);
          line(x,y,x+Math.cos(b)*l,y+Math.sin(b)*l,(0.9+rnd()*0.5)*Z,tip?hsl(100+rnd()*10,40,36+rnd()*6):hsl(132+rnd()*20,28+rnd()*10,21+rnd()*8)); } } };
    tw(K*0.5,K*0.99,K*0.5,K*0.05,40,K*0.10);
    for(let i=0;i<7;i++){ const y=K*(0.88-i*0.115), L=K*(0.38-i*0.04); for(const s of [-1,1]) tw(K*0.5,y,K*0.5+s*L,y-L*0.5,18,K*0.065); } });
  // 8 들꽃 — 줄기 여섯에 꽃잎 다섯(안쪽이 짙다) · 잎 · 봉오리(빛깔은 인스턴스 색으로 곱한다)
  cell(FC.FLOWER,()=>{ for(let i=0;i<6;i++){ const x=K*(0.16+i*0.135+rnd()*0.04), top=K*(0.14+rnd()*0.36), bx=K*0.5+(x-K*0.5)*0.3;
      curve(bx,K*0.99,(bx+x)/2+(rnd()-0.5)*8*Z,K*0.6,x,top,1.3*Z,'#4f7032');
      leaf(K*0.5+(x-K*0.5)*0.45,K*0.80,K*0.20,K*0.04,(x<K*0.5?-1:1)*(0.7+rnd()*0.3),{H:100,Sat:40,L:30,nv:0});
      const pr=5.5*Z*(0.8+rnd()*0.4);
      for(let p=0;p<5;p++){ const a=p/5*6.283+rnd()*0.3, px=x+Math.cos(a)*pr, py=top+Math.sin(a)*pr*0.8;
        const gr=g.createRadialGradient(x,top,0,px,py,pr); gr.addColorStop(0,'#d8d8d0'); gr.addColorStop(1,'#ffffff');
        g.fillStyle=gr; g.beginPath(); g.ellipse(px,py,pr*0.95,pr*0.6,a,0,6.283); g.fill(); }
      g.fillStyle='#c89820'; g.beginPath(); g.arc(x,top,pr*0.45,0,6.283); g.fill();
      g.fillStyle='rgba(255,240,150,0.6)'; g.beginPath(); g.arc(x-pr*0.12,top-pr*0.12,pr*0.2,0,6.283); g.fill();
      if(rnd()<0.6){ const bx2=x+(rnd()-0.5)*20*Z, by=top+K*0.12; line(x,top+K*0.08,bx2,by,1*Z,'#4f7032'); g.fillStyle='#e8e8d8'; g.beginPath(); g.ellipse(bx2,by,2.2*Z,3.4*Z,0,0,6.283); g.fill(); } } });
  // 9 마른 잔가지 — 갈라지는 가지에 마른 잎 몇 장
  cell(FC.TWIG,()=>{ const br=(x,y,a,L,d)=>{ const x1=x+Math.cos(a)*L, y1=y+Math.sin(a)*L; line(x,y,x1,y1,(0.8+d*0.7)*Z,pick(['#6a5a40','#5e5038','#76664a']));
      if(d>0){ br(x1,y1,a-0.4-rnd()*0.4,L*0.72,d-1); br(x1,y1,a+0.4+rnd()*0.4,L*0.72,d-1); if(rnd()<0.5) br(x+Math.cos(a)*L*0.5,y+Math.sin(a)*L*0.5,a+(rnd()<0.5?-0.9:0.9),L*0.6,d-1); }
      else if(rnd()<0.75) leaf(x1,y1,K*0.08,K*0.03,a+1.5708+(rnd()-0.5),{H:62+rnd()*20,Sat:30,L:34,nv:0,spot:0.3}); };
    br(K*0.5,K*0.99,-1.5708,K*0.30,4); });
  // 10 맹그로브 잎 — 도톰하고 반들거리는 짙은 타원 잎이 가지 끝에 모여 난다
  cell(FC.MANG,()=>{ for(let b=0;b<3;b++){ const bx=K*(0.5+(b-1)*0.12), a0=-1.5708+(b-1)*0.4;
      const ex=bx+Math.cos(a0)*K*0.4, ey=K*0.99+Math.sin(a0)*K*0.4; curve(bx,K*0.99,bx,K*0.8,ex,ey,1.8*Z,'#5a4a36');
      for(let i=0;i<8;i++){ const a=a0+(i/7-0.5)*2.4+(rnd()-0.5)*0.2, len=K*(0.17+rnd()*0.08);
        leaf(ex+(rnd()-0.5)*6*Z,ey+(rnd()-0.5)*6*Z,len,len*0.36,a+1.5708,{H:110,Sat:32,L:22,nv:3,back:rnd()<0.15});
        g.save(); g.translate(ex,ey); g.rotate(a+1.5708); g.fillStyle='rgba(255,255,240,0.13)'; g.beginPath(); g.ellipse(len*0.08,-len*0.55,len*0.06,len*0.3,0,0,6.283); g.fill(); g.restore(); } } });
  // 11 덩굴 — 위에서 늘어진 줄에 심장꼴 잎
  cell(FC.VINE,()=>{ for(let v=0;v<5;v++){ let x=K*(0.14+v*0.18+rnd()*0.05), y=0; const L=K*(0.55+rnd()*0.43);
      g.strokeStyle='#4a5a30'; g.lineWidth=1.3*Z; g.beginPath(); g.moveTo(x,y);
      const pts=[]; for(let i=1;i<=16;i++){ y=L*i/16; x+=Math.sin(i*0.9+v)*2.2*Z; g.lineTo(x,y); pts.push([x,y]); } g.stroke();
      for(const p of pts) if(rnd()<0.8) leaf(p[0],p[1],K*(0.06+rnd()*0.04),K*0.035,(rnd()<0.5?-1:1)*(1.3+rnd()*0.9)+3.1416,{round:1.0,nv:2}); } });
  // 13 민무늬 — 열매·줄기처럼 정점 색만으로 칠하는 것
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
      /* 잎 판때기는 끝가지 둘레 공 안에 흩는다(한 점에 모으면 잎이 판 한 장처럼 납작하게 읽힌다) — 판마다 크기·눕힘이 다르다 */
      const sp=S.leafW*0.32;
      for(let k=0;k<S.leafN;k++){ const p=at(Math.max(0.3,1-k*0.3*rnd()));
        parts.push(card([p[0]+(rnd()-0.5)*sp,p[1]-S.leafH*0.15+(rnd()-0.5)*sp*0.6,p[2]+(rnd()-0.5)*sp],S.leafW*(0.75+rnd()*0.4),S.leafH*(0.75+rnd()*0.4),S.leafCell,a+(rnd()-0.5)*2.6,S.leafTilt*(0.4+rnd()*1.2),S.leafC)); }
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
        const dx=(p.x||0)-cx, dy=(p.y||0)-cy+Math.abs(cy)*0.12+0.3, dz=(p.z||0)-cz, l=Math.sqrt(dx*dx+dy*dy+dz*dz)||1; p.nrm=[dx/l,dy/l,dz/l]; }
      /* 수관 속 그늘 — 잎은 수관 가운데에 가깝고 아래일수록 가려 어둡다(빛이 잎을 몇 겹 지나 온다). 판마다 빛깔도 조금씩 흔든다 */
      let R=0; for(const p of parts) if(p.cell>=FC.LEAF&&p.cell<=FC.VINE){ const dx=(p.x||0)-cx, dy=(p.y||0)-cy, dz=(p.z||0)-cz; R=Math.max(R,Math.sqrt(dx*dx+dy*dy+dz*dz)); }
      if(R>0.3) for(const p of parts) if(p.cell>=FC.LEAF&&p.cell<=FC.VINE){
        const dx=(p.x||0)-cx, dy=(p.y||0)-cy, dz=(p.z||0)-cz, d=Math.sqrt(dx*dx+dy*dy+dz*dz)/R;
        const ao=(0.64+0.36*Math.pow(Math.min(1,d),0.8))*(1+0.12*Math.max(-1,Math.min(1,dy/R))), w=rnd(), k=0.92+0.16*rnd();
        const tint=[k*ao*(0.95+0.12*w),k*ao,k*ao*(0.94+0.10*(1-w))];
        p.c=p.c.map((v,i)=>v*tint[i]); if(p.c2) p.c2=p.c2.map((v,i)=>v*tint[i]); } }
    return SHP.merge(parts,true,[0.80,1.04]); };      // 밑동이 짙다(땅 가까이는 둘레가 가려 하늘빛을 덜 받는다)
  return {W,BARK,BARK2,unit,face,card,trunk,grow,fin};
}
/* 생김새 한 벌 — 씨앗(rnd)만 바꾸면 같은 짜임에 가지 각도·길이·수가 다른 다른 그루가 나온다.
   수(가지·잎·줄기)는 원래 값의 ±1~2 안에서만 흔든다 — 종류마다 생김새의 틀은 그대로다 */
function floraShapes(rnd){
  const {W,BARK,BARK2,unit,face,card,trunk,grow,fin}=floraKit(rnd);
  const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)), rf=(a,b)=>a+(b-a)*rnd();
  const G={};
  /* 밀림 나무 — 굵은 밑동, 다섯 갈래 큰 가지가 두 번씩 더 갈라져 스무 개의 끝가지. 덩굴이 늘어진다(키 9~11 m) */
  G.jungle=(()=>{ const parts=[], at=trunk(parts,7.0*rf(0.88,1.12),0.40,0.20,{flare:1.0,sway:rf(0.18,0.34),sides:8}), nb=ri(4,6);
    const S={taper:0.66,split:[2,3],spread:1.5,up:0.6,lift:0.35,shrink:0.72,bend:0.10,leafN:3,leafW:2.1,leafH:1.9,leafCell:FC.LEAF,leafTilt:0.6,leafC:[0.86,1.0,0.86],vine:0.3};
    for(let i=0;i<nb;i++){ const a=i/nb*6.283+rnd()*0.9;
      grow(parts,at(0.60+i*0.5/nb),unit(Math.cos(a)*0.9,0.75,Math.sin(a)*0.9),2.8+rnd()*0.9,0.15,2,S); }
    for(let i=0,ne=ri(2,4);i<ne;i++){ const p=at(0.28+i*0.12), a=rnd()*6.283;            // 줄기에 붙어 사는 큰 잎
      parts.push({g:SHP.frond(0.9,0.38,{segs:4,curl:1.0,cup:0.2,tip:0.5}),x:p[0],y:p[1],z:p[2],q:face(a,0.5),cell:FC.BIG,c:[0.9,1,0.9]}); }
    return fin(parts); })();
  /* 맹그로브 — 줄기가 물 위 1.2 m 에서 시작하고, 버팀뿌리 열 가닥이 활처럼 휘어 내려 넓게 박힌다(뿌리 지름 4 m · 키 5 m) */
  G.mangrove=(()=>{ const parts=[], RB=[0.40,0.33,0.28], RB2=[0.55,0.47,0.38];
    parts.push({g:SHP.tube([[0,1.15,0],[0.05,1.9,0.03],[0.14,2.6,0.02],[0.20,3.2,-0.05]],[0.17,0.15,0.13,0.11],7,0.5),cell:FC.BARK,c:RB,c2:RB2});
    const nr=ri(9,12); for(let i=0;i<nr;i++){ const a=i/nr*6.283+rnd()*0.5, R=1.0+rnd()*1.1, h=1.0+rnd()*0.9, cx=Math.cos(a), cz=Math.sin(a);
      parts.push({g:SHP.tube([[cx*0.08,h,cz*0.08],[cx*R*0.45,h+0.15,cz*R*0.45],[cx*R*0.85,h*0.45,cz*R*0.85],[cx*R,-0.2,cz*R],[cx*R*1.05,-1.2,cz*R*1.05]],
        [0.075,0.068,0.060,0.052,0.040],5,0),cell:FC.BARK,c:RB,c2:RB2});
      if(i%3===0){ const a2=a+0.55, R2=R*0.95;                              // 뿌리에서 또 갈라져 내리는 곁뿌리
        parts.push({g:SHP.tube([[cx*R*0.6,h*0.9,cz*R*0.6],[Math.cos(a2)*R2*0.9,h*0.4,Math.sin(a2)*R2*0.9],[Math.cos(a2)*R2,-1.1,Math.sin(a2)*R2]],[0.045,0.040,0.030],4,0),cell:FC.BARK,c:RB,c2:RB2}); } }
    const S={taper:0.68,split:[2,3],spread:1.6,up:0.35,lift:0.2,shrink:0.7,bend:0.05,leafN:3,leafW:1.15,leafH:1.0,leafCell:FC.MANG,leafTilt:0.9,leafC:[0.85,1,0.9],bark:RB,bark2:RB2};
    const nb=ri(4,6); for(let i=0;i<nb;i++){ const a=i/nb*6.283+rnd()*0.8;
      grow(parts,[0.14+Math.cos(a)*0.05,2.4+rnd()*0.7,Math.sin(a)*0.05],unit(Math.cos(a),0.45,Math.sin(a)),1.5+rnd()*0.6,0.085,2,S); }
    return fin(parts); })();
  /* 대나무 — 곧게 선 마디 줄기 열두 대. 끝만 살짝 바깥으로 휜다. 위쪽 절반에 댓잎(키 5.5~9.5 m) */
  G.bamboo=(()=>{ const parts=[];
    for(let i=0,nc=ri(10,14);i<nc;i++){ const a=rnd()*6.283, rr=Math.sqrt(rnd())*0.6, bx=Math.cos(a)*rr, bz=Math.sin(a)*rr, H=5.5+rnd()*4, r=0.035+rnd()*0.02,
          da=a+(rnd()-0.5)*1.2, pts=[], rad=[], n=5;
      for(let k=0;k<=n;k++){ const t=k/n, o=H*(0.012*t+0.085*t*t*t*t);
        pts.push([bx+Math.cos(da)*o,-0.2+(H+0.2)*t,bz+Math.sin(da)*o]); rad.push(r*(1-0.55*t)); }
      const gq=rnd(); parts.push({g:SHP.tube(pts,rad,6,0.4),cell:FC.RING,c:[0.42+gq*0.2,0.62+gq*0.12,0.26],c2:[0.62+gq*0.2,0.78+gq*0.08,0.34]});
      for(let k=0;k<5;k++){ const f=(0.5+k*0.105+rnd()*0.04)*n, j=Math.min(n-1,Math.floor(f)), u=f-j,
          p=[pts[j][0]+(pts[j+1][0]-pts[j][0])*u,pts[j][1]+(pts[j+1][1]-pts[j][1])*u,pts[j][2]+(pts[j+1][2]-pts[j][2])*u];
        parts.push(card(p,1.0+rnd()*0.4,0.9+rnd()*0.3,FC.BAMBOO,rnd()*6.283,0.9+rnd()*0.5,[0.95,1.05,0.8])); } }
    return fin(parts); })();
  /* 야자 — 휘어 오른 마디 줄기, 꼭대기에서 사방으로 늘어지는 잎 열세 장, 열매 넷(키 6.4 m) */
  G.palm=(()=>{ const parts=[], pts=[], rad=[], n=7, lean=rf(0.45,1.35), H=6.4*rf(0.88,1.12), wob=rf(-0.15,0.15);
    for(let k=0;k<=n;k++){ const t=k/n; pts.push([lean*t*t+0.15*Math.sin(t*3),-0.2+H*t,(0.1+wob)*Math.sin(t*4)]); rad.push(0.17-0.06*t+0.06*Math.exp(-t*8)); }
    parts.push({g:SHP.tube(pts,rad,7,0.6),cell:FC.RING,c:[0.50,0.42,0.33],c2:[0.66,0.57,0.45]});
    const top=pts[n];
    for(let i=0,nf=ri(11,15);i<nf;i++){ const a=i/nf*6.283+rnd()*0.3, up=i%3===0?0.25:(i%3===1?0.75:1.15);
      parts.push({g:SHP.frond(2.7+rnd()*0.5,1.0,{segs:6,curl:1.0+rnd()*0.5,cup:0.22,p:0.3,tip:0.6}),x:top[0],y:top[1]-0.05,z:top[2],q:face(a,up),cell:FC.PALM,c:[0.95,1,0.9]}); }
    for(let i=0;i<4;i++){ const a=i/4*6.283+0.4;
      parts.push({g:new THREE.SphereGeometry(0.13,8,6),x:top[0]+Math.cos(a)*0.16,y:top[1]-0.28,z:top[2]+Math.sin(a)*0.16,cell:FC.PLAIN,c:[0.36,0.27,0.15],c2:[0.50,0.40,0.22]}); }
    return fin(parts); })();
  /* 자작 — 흰 줄기에 가로 무늬, 가는 가지 여덟이 위로 뻗고 잎이 성기다(키 7.5 m) */
  G.birch=(()=>{ const parts=[], at=trunk(parts,7.5*rf(0.88,1.12),0.12,0.035,{flare:0.25,sway:0.18,cell:FC.BIRCH,c:[1.02,1.0,0.95],c2:[1.08,1.07,1.02],sides:6,segs:7});
    const S={taper:0.6,split:[2],spread:0.9,up:1.0,lift:0.25,shrink:0.7,bend:-0.04,leafN:3,leafW:0.95,leafH:1.0,leafCell:FC.LEAF,leafTilt:1.0,leafC:[1.1,1.25,0.72],bark:[0.75,0.72,0.66],bark2:[0.9,0.88,0.82]};
    for(let i=0,nb=ri(7,9);i<nb;i++){ const a=i*2.4+rnd()*0.5;
      grow(parts,at(Math.min(0.98,0.42+i*0.56/nb)),unit(Math.cos(a),0.9,Math.sin(a)),1.5-i*0.64/nb+rnd()*0.3,0.035,1,S); }
    parts.push(card(at(1),0.9,1.0,FC.LEAF,0,0,[1.1,1.25,0.72]));
    return fin(parts); })();
  /* 어린 전나무 — 층층이 처진 솔가지 여덟 층(키 5.6 m) */
  G.pine=(()=>{ const parts=[], at=trunk(parts,5.6*rf(0.88,1.12),0.10,0.02,{flare:0.4,sway:0.05,sides:6,segs:5}), NC=[0.9,1,0.95];
    for(let j=0;j<8;j++){ const t=0.14+j*0.105, L=1.75*(1-t*0.8), p=at(t);
      for(let i=0,nk=ri(4,6);i<nk;i++) parts.push(card(p,L*0.85,L,FC.NEEDLE,i/nk*6.283+j*0.7+rnd()*0.3,1.25+rnd()*0.2,NC)); }
    parts.push(card(at(0.93),0.5,0.75,FC.NEEDLE,0,0,NC));
    return fin(parts); })();
  /* 어린 활엽수 — 가는 줄기에 가지 넷(키 3~4 m) */
  G.sapling=(()=>{ const parts=[], at=trunk(parts,3.0*rf(0.85,1.15),0.07,0.03,{flare:0.3,sway:0.15,sides:5,segs:4});
    const S={taper:0.62,split:[2],spread:1.3,up:0.8,lift:0.3,shrink:0.7,leafN:3,leafW:1.0,leafH:1.05,leafCell:FC.LEAF,leafTilt:0.8,leafC:[1,1.08,0.9]};
    for(let i=0,nb=ri(3,5);i<nb;i++){ const a=i/nb*6.283+rnd(); grow(parts,at(0.55+i*0.39/(nb-1)),unit(Math.cos(a),0.8,Math.sin(a)),0.9+rnd()*0.4,0.03,1,S); }
    return fin(parts); })();
  /* 바나나 — 풀빛 줄기에 크고 넓은 잎 여덟 장, 노란 송이(키 3 m) */
  G.banana=(()=>{ const parts=[{g:SHP.tube([[0,-0.2,0],[0.02,0.8,0],[0.05,1.7,0.02]],[0.11,0.09,0.06],7,0.5),cell:FC.STEM,c:[0.55,0.66,0.38],c2:[0.68,0.78,0.46]}];
    for(let i=0,nl=ri(7,9);i<nl;i++){ const a=i*2.4+rnd()*0.4;
      parts.push({g:SHP.frond(1.7+rnd()*0.5,0.62,{segs:5,curl:0.7+rnd()*0.6,cup:0.2,p:0.4,tip:0.55}),x:0.05,y:1.55,z:0.02,q:face(a,0.15+i/nl),cell:FC.BIG,c:[0.92,1,0.88]}); }
    for(let i=0;i<7;i++){ const a=i/7*6.283;
      parts.push({g:SHP.limb([0.16+Math.cos(a)*0.04,1.28,0.1+Math.sin(a)*0.04],unit(Math.cos(a)*0.5,-0.6,Math.sin(a)*0.5),0.16,0.022,0.016,2,5,0.5,1),cell:FC.PLAIN,c:[0.85,0.72,0.2],c2:[0.95,0.85,0.3]}); }
    return fin(parts); })();
  /* 나무고사리 — 짙은 줄기 끝에 고사리 잎이 우산처럼(키 3 m) */
  G.treefern=(()=>{ const parts=[], at=trunk(parts,2.3*rf(0.85,1.2),0.12,0.09,{flare:0.2,sway:0.1,c:[0.26,0.2,0.15],c2:[0.36,0.28,0.2],sides:6,segs:3}), top=at(1);
    for(let i=0,nf=ri(10,13);i<nf;i++){ const a=i/nf*6.283+rnd()*0.3;
      parts.push({g:SHP.frond(1.6+rnd()*0.4,0.6,{segs:5,curl:1.1+rnd()*0.4,cup:0.15,p:0.35,tip:0.5}),x:top[0],y:top[1],z:top[2],q:face(a,0.5+rnd()*0.4),cell:FC.FERN,c:W}); }
    return fin(parts); })();
  /* 아카시아 — 낮은 줄기가 넓게 갈라져 납작한 우산 꼴(키 4 m) */
  G.acacia=(()=>{ const AB=[0.36,0.30,0.25], AB2=[0.50,0.43,0.35], parts=[], at=trunk(parts,2.4,0.14,0.10,{flare:0.4,sway:0.3,sides:6,segs:4,c:AB,c2:AB2});
    const S={taper:0.66,split:[2,2],spread:1.5,up:0.25,lift:0.22,shrink:0.75,bend:0.02,leafN:3,leafW:1.5,leafH:1.0,leafCell:FC.LEAF,leafTilt:1.25,leafC:[1.05,1.05,0.62],bark:AB,bark2:AB2};
    for(let i=0,nb=ri(3,5);i<nb;i++){ const a=i/nb*6.283+rnd(); grow(parts,at(0.95),unit(Math.cos(a),0.55,Math.sin(a)),1.6+rnd()*0.5,0.075,2,S); }
    return fin(parts); })();
  /* 고사리 — 바깥으로 휘어 눕는 잎 여덟 장 */
  G.fern=(()=>{ const parts=[];
    for(let i=0,nf=ri(7,10);i<nf;i++){ const a=i/nf*6.283+rnd()*0.4;
      parts.push({g:SHP.frond(0.7+rnd()*0.3,0.30,{segs:5,curl:0.9+rnd()*0.5,cup:0.15,p:0.35,tip:0.5}),y:0.02,q:face(a,0.45+rnd()*0.4),cell:FC.FERN,c:W}); }
    return fin(parts); })();
  /* 덤불 — 잔가지 다섯에 잎 판때기 열한 장 */
  G.bush=(()=>{ const parts=[];
    for(let i=0,nb=ri(4,6);i<nb;i++){ const a=i/nb*6.283+rnd(); parts.push({g:SHP.limb([0,-0.05,0],unit(Math.cos(a)*0.7,1,Math.sin(a)*0.7),0.55+rnd()*0.25,0.025,0.012,1,4,0,0),cell:FC.BARK,c:BARK}); }
    for(let i=0,nc=ri(9,13);i<nc;i++){ const a=rnd()*6.283, rr=rnd()*0.35;
      parts.push(card([Math.cos(a)*rr,0.05+rnd()*0.45,Math.sin(a)*rr],0.75+rnd()*0.3,0.7+rnd()*0.3,FC.LEAF,a,0.3+rnd()*0.8,[0.95,1.05,0.9])); }
    return fin(parts); })();
  /* 들꽃 — 꽃 그림 판때기 세 겹 */
  G.flower=(()=>{ const parts=[];
    for(let i=0,nf=ri(3,4);i<nf;i++){ const a=i*2.1+rnd()*0.5, rr=i?0.08+rnd()*0.08:0; parts.push({g:SHP.card(0.55,0.55),x:Math.cos(a)*rr,z:Math.sin(a)*rr,ry:a,cell:FC.FLOWER,c:W}); }
    return fin(parts); })();
  /* 마른 덤불 — 잔가지 그림 판때기 넷 */
  G.dry=(()=>{ const parts=[];
    for(let i=0,nd=ri(3,5);i<nd;i++){ const a=i/nd*6.283+rnd(); parts.push(card([Math.cos(a)*0.08,0,Math.sin(a)*0.08],0.8+rnd()*0.3,0.75+rnd()*0.3,FC.TWIG,a,0.25+rnd()*0.5,W)); }
    return fin(parts); })();
  /* 버섯 — 갓 넷이 모여 난다 */
  G.shroom=(()=>{ const parts=[];
    for(let i=0,ns=ri(3,5);i<ns;i++){ const a=i*1.9, rr=i?0.09+rnd()*0.06:0, h=0.07+rnd()*0.07, r=0.035+rnd()*0.025, x=Math.cos(a)*rr, z=Math.sin(a)*rr;
      parts.push({g:SHP.limb([x,-0.02,z],[0,1,0],h,r*0.30,r*0.22,2,6,0.004*(rnd()-0.5),0),cell:FC.CAP,c:[0.66,0.60,0.50],c2:[0.92,0.89,0.82]});
      const dome=0.6+rnd()*0.8, br=0.7+rnd()*0.4;                       // 갓 — 아래는 옅은 주름살, 위로 갈수록 짙은 밤빛(가운데가 가장 짙다)
      parts.push({g:SHP.lathe([[r*0.28,-0.004],[r*0.7,-0.010],[r,-0.012]],12),x,y:h-0.02,z,cell:FC.CAP,c:[0.80,0.74,0.62]});      // 주름살(밑면)
      parts.push({g:SHP.lathe([[r,-0.012],[r*1.02,-0.004],[r*0.95,0.012*dome],[r*0.72,0.026*dome],[r*0.38,0.036*dome],[0.001,0.040*dome]],12),x,y:h-0.02,z,
        cell:FC.CAP,c:[0.62*br,0.44*br,0.28*br],c2:[0.36*br,0.22*br,0.11*br]}); }
    return fin(parts); })();
  return G;
}
/* 종류마다 생김새 벌 수 — 칸 번호의 해시로 그루마다 하나를 고른다(같은 자리엔 늘 같은 그루). 벌마다 인스턴스 메시 하나라
   그리기 호출이 벌 수만큼 는다 — 다만 그 반경에 하나도 안 선 벌은 감춘다 */
const FLORA_VARS={jungle:8,mangrove:8,bamboo:8,palm:8,birch:8,pine:8,sapling:8,banana:8,treefern:8,acacia:8,
                  fern:6,bush:6,flower:4,dry:4,shroom:4};
function floraBuild(){
  const V=Math.max(...Object.values(FLORA_VARS)), SH=[];
  for(let v=0;v<V;v++) SH.push(floraShapes(mulberry32(v?(0xf10a+v*0x9e3779b1)>>>0:0xf10a)));

  FLORA.tex=floraAtlas();
  FLORA.mat=new THREE.MeshLambertMaterial({map:FLORA.tex,alphaTest:0.4,vertexColors:true,side:THREE.DoubleSide});
  /* 잎 판때기의 그림자 — 깊이 재질도 그림의 알파로 잘라야 판 네모가 통째로 찍히지 않는다 */
  FLORA.depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:FLORA.tex,alphaTest:0.4});
  FLORA.m={};
  for(const L of [FLORA.far,FLORA.near]) for(const k of L.kinds){
    const nv=FLORA_VARS[k]||1, cap=Math.ceil(FLORA_KIND[k].cap*2.5)+8;   // 벌마다 몫 — 기준 벌(`FLORA.ref`)이 먼 그루를 다 받으므로 예전 종류 전체 몫(평균의 2.5배)
    FLORA.m[k]=[]; L.n[k]=new Int32Array(nv);
    for(let v=0;v<nv;v++){
      const im=new THREE.InstancedMesh(SH[v][k],FLORA.mat,cap);
      im.setColorAt(0,new THREE.Color(1,1,1));          // 색 버퍼는 count 가 가득일 때 만든다
      im.count=0; im.visible=false; im.frustumCulled=false;
      if(L===FLORA.far) im.customDepthMaterial=FLORA.depth;   // 나무는 그림자를 드리운다
      else im.userData.lightRole='recv';                      // 덤불·고사리는 받기만
      im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im);
      FLORA.m[k].push(im);
    }
  }
  for(let v=0;v<V;v++) for(const k in SH[v]) if(v>=(FLORA_VARS[k]||1)) SH[v][k].dispose();   // 안 쓰는 벌
}

/* ── 깔기 ────────────────────────────────────────────────────────────────── */
const _flM=new THREE.Matrix4(), _flQ=new THREE.Quaternion(), _flE=new THREE.Euler(), _flV=new THREE.Vector3(),
      _flS=new THREE.Vector3(), _flC=new THREE.Color();
function floraLayer(L,which){
  const U=FLORA, px=PL.pos.x, pz=PL.pos.z, C=L.cell, R=L.R, n=L.n, far=which==='far';
  L.cx=px; L.cz=pz; L.cols.length=0; L.picks.length=0;
  for(const k of L.kinds) n[k].fill(0);
  const near0={}, nearV={}; U.pendN=0;
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
    const kind=pick[0], ms=U.m[kind], vi=floraHash(gx,gz,L.salt+7)%ms.length, K=FLORA_KIND[kind], nk=n[kind];
    // 큰 나무·바위·설비·벽이 선 자리, 지은 바닥 위는 비운다
    const pad=(K.r||0)+0.5, cgx=Math.floor(wx/CG), cgz=Math.floor(wz/CG); let hit=false;
    for(let az=-1;az<=1&&!hit;az++) for(let ax=-1;ax<=1&&!hit;ax++){
      const a=CGRID.get(cgKey(cgx+ax,cgz+az)); if(!a) continue;
      for(const o of a){ const ox=wx-o.x, oz=wz-o.z, rr=o.r+pad; if(ox*ox+oz*oz<rr*rr){ hit=true; break; } }
    }
    if(hit||inLanding(wx,wz,pad)) continue;           // 보급선이 앉는 자리 · 깨는 자리는 비운다
    const gy=heightAt(wx,wz);
    if(floorAt(wx,wz)>gy+0.05) continue;
    const key=(far?'F':'N')+gx+','+gz, P=K.pick?FLORA_PICK[K.pick]:null;
    if(P&&P.hide){ const t=U.taken.get(key); if(t!==undefined){ if(gameHours-t<P.regrow) continue; U.taken.delete(key); } }
    const h2=floraHash(gx,gz,L.salt+1);
    const v=(h2&1023)/1023, sc=(pick[2]+(pick[3]-pick[2])*v)*clamp((R-d)/L.fade,0.25,1);
    const tl=far?0.05:0.16;
    _flE.set(((h2>>>10)&31)/31*tl-tl/2,((h2>>>15)&1023)/1023*6.283,((h2>>>25)&31)/31*tl-tl/2); _flQ.setFromEuler(_flE);
    _flV.set(wx,gy-0.03,wz); _flS.set(sc,sc*(0.9+0.2*((h>>>28)&15)/15),sc);
    _flM.compose(_flV,_flQ,_flS);
    if(kind==='flower'){ const t=FLOWER_TINT[patch%FLOWER_TINT.length]; _flC.setRGB(t[0],t[1],t[2]); }   // 꽃밭은 얼룩마다 한 빛깔
    else{ const g=0.86+0.26*((h2>>>3)&15)/15, w=((h2>>>7)&15)/15; _flC.setRGB(g*(0.94+0.14*w),g,g*(0.92+0.08*(1-w))); }
    if(d<=L.own){ const im=ms[vi]; if(nk[vi]>=im.instanceMatrix.count) continue;      // 가까우면 제 벌
      im.setMatrixAt(nk[vi],_flM); im.setColorAt(nk[vi]++,_flC); }
    else{ const q=U.pend[U.pendN]||(U.pend[U.pendN]={k:'',m:new Float32Array(16),c:new Float32Array(3)}); U.pendN++;   // 멀면 기준 벌로(아래에서)
      q.k=kind; q.m.set(_flM.elements); q.c[0]=_flC.r; q.c[1]=_flC.g; q.c[2]=_flC.b; }
    if(U.ref[kind]===undefined&&d<(near0[kind]??1e9)){ near0[kind]=d; nearV[kind]=vi; }   // 기준 벌을 아직 안 정한 종류 — 가장 가까운 그루
    if(K.r) L.cols.push({x:wx,z:wz,r:K.r*sc});
    if(P) L.picks.push({kind:K.pick,x:wx,y:gy,z:wz,key,r:(K.r||0.12)*sc,tree:!P.hide});
  }
  for(const k in nearV) U.ref[k]=nearV[k];
  for(let i=0;i<U.pendN;i++){ const q=U.pend[i], v=U.ref[q.k], im=U.m[q.k][v], nk=n[q.k]; if(nk[v]>=im.instanceMatrix.count) continue;
    _flM.fromArray(q.m); im.setMatrixAt(nk[v],_flM); _flC.setRGB(q.c[0],q.c[1],q.c[2]); im.setColorAt(nk[v]++,_flC); }
  for(const k of L.kinds) U.m[k].forEach((im,v)=>{ im.count=n[k][v]; im.visible=im.count>0;
    im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; });
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
  updateGiants(force);                                 // 노거수 — 200 m 안팎으로 생김새를 가른다(95-giants.js)
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
  FLORA.taken.clear(); FLORA.look=null; FLORA.ref={};   // 기준 벌은 섬마다 새로(그 종류가 처음 깔릴 때 가장 가까운 그루)
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
