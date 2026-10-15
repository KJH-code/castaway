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
   ⑤ 두 겹으로 깐다 — 나무는 6 m 칸 · **섬 전체를 한 번**(참나무·전나무와 같은 길 — 아래 '나무 겹' · `floraFar`),
      덤불·고사리는 2.4 m 칸 · 사람 둘레 46 m 를 걸을 때마다. 자리는 전부 칸 번호의 해시라
      같은 섬 같은 자리에 늘 같은 것이 선다. 섬 생성(자원 배치)과 무관하다.
   ⑥ **그루마다 생김새가 다르다** — 종류마다 씨앗만 바꿔 여러 벌을 지어 두고(`floraShapes` · 벌 수 `FLORA_VARS` — 나무 8 · 덤불·고사리 6 ·
      꽃·마른 덤불·버섯 4) 칸 번호의 해시로 그루마다 한 벌을 고른다. 짜임(줄기·가지 치는 법·잎 그림)은 그대로고 가지·잎·줄기 수는
      원래 값의 ±1~2, 키는 ±10% 안에서만 흔든다. 벌마다 인스턴스 메시가 하나라 `FLORA.m[종류]` 는 배열이다.
      **제 생김새는 가까이서만** — 나무는 25 m(`FULL_DIST`) 밖이면 기준 그루의 줄인 복제·그림(아래 '나무 겹'), 덤불·고사리는
      12 m(층의 `own`) 밖이면 종류마다 **사람에게서 가장 가까운 그루의 벌 하나**(`FLORA.ref`)로 찍는다.
   노거수(뿌리가 땅이 되는 큰 나무)는 95-giants.js 가 '노거수 숲' 군락에 세운다.
   ========================================================================== */
const FLORA={seed:0, m:null, mat:null, depth:null, tex:null, patch:84, taken:new Map(), look:null, ref:{}, pend:[], pendN:0,
  far :{cx:1e9,cz:1e9,R:110,cell:6,  step:12,fade:14,salt:3,own:35,cols:[],picks:[],n:{},kinds:['jungle','mangrove','bamboo','palm','birch','pine','sapling','banana','treefern','acacia']},
  near:{cx:1e9,cz:1e9,R:46, cell:2.4,step:6, fade:7, salt:1,own:12,cols:[],picks:[],n:{},kinds:['fern','bush','flower','dry','shroom']}};
/* 그림 묶음의 칸 */
const FC={BARK:0,RING:1,LEAF:2,BIG:3,FERN:4,PALM:5,BAMBOO:6,NEEDLE:7,FLOWER:8,TWIG:9,MANG:10,VINE:11,BIRCH:12,PLAIN:13,STEM:14,CAP:15};
/* 종류마다 — r 몸이 막히는 반지름(크기 1 일 때 · 없으면 지나간다) · pick 얻는 것 · cap 한 번에 서는 수 */
const FLORA_KIND={
  jungle:{r:0.44,pick:'vine',cap:420}, mangrove:{r:1.5,pick:'bark_m',cap:260}, bamboo:{r:0.75,pick:'bamboo',cap:320}, palm:{r:0.22,pick:'coconut',cap:220},
  birch:{r:0.16,pick:'bark_b',cap:360}, pine:{r:0.14,pick:'resin',cap:460}, sapling:{r:0.10,pick:'twig',cap:360}, banana:{r:0.16,pick:'banana',cap:200},
  treefern:{r:0.16,pick:'frond',cap:260}, acacia:{r:0.18,pick:'bark_a',cap:200},
  /* 덤불 겹의 몫은 사람 둘레 46 m 에 서는 수 — 밀림은 칸마다 셋까지 서므로(nearDense) 넉넉히 */
  fern:{pick:'fern',cap:1100}, bush:{r:0.30,pick:'bushtwig',cap:760}, flower:{pick:'flower',cap:700}, dry:{pick:'drytwig',cap:420}, shroom:{pick:'mushroom',cap:140} };
/* 얻는 것 — regrow 다시 나기까지(게임 시간) · cnt [아래, 위] 얻는 수(무작위) · need 'sharp' 날붙이를 지녀야 · hide 따면 그 자리가 빈다
   dur 좌클릭을 누르고 있어야 하는 시간(초 · 진행 막대) · stam 그동안 드는 기력(초당) · extra [[아이템, 확률], …] 가끔 함께 딸려 나오는 것
   low 키 작은 것 — 나무처럼 줄기 쪽을 보는 것이 아니라 버섯처럼 그 포기(크기 × low 높이)를 겨눠야 한다(숲을 걷는 내내 고사리가 잡히지 않게)
   take 담을 그릇을 하나 쓴다 · sting 불 붙인 횃불 없이 따면 쏘인다 */
const FLORA_PICK={
  vine    :{item:'vine',    n:'덩굴',      verb:'끊기',        regrow:30, cnt:[1,2], dur:1.3, stam:4},
  bamboo  :{item:'bamboo',  n:'대나무',    verb:'베기',        regrow:60, cnt:[2,3], dur:2.2, stam:6, need:'sharp'},
  coconut :{item:'coconut', n:'야자열매',  verb:'흔들어 따기', regrow:48, cnt:[1,2], dur:1.8, stam:6},
  banana  :{item:'banana',  n:'바나나',    verb:'따기',        regrow:48, cnt:[2,3], dur:1.1, stam:2.5},
  mushroom:{item:'mushroom',n:'버섯',      verb:'따기',        regrow:36, cnt:[1,1], dur:0.5, stam:1, hide:1},
  /* 덤불 — 잔가지를 꺾는다. 마른 잎·검불이 부싯깃이 되고, 열매가 달린 철이면 베리도 딸려 온다 */
  bushtwig:{item:'branch',  n:'덤불',      verb:'가지 꺾기',   regrow:20, cnt:[1,2], dur:1.2, stam:4, low:0.45, extra:[['tinder',0.25],['berry',0.3]]},
  drytwig :{item:'branch',  n:'마른 덤불', verb:'가지 꺾기',   regrow:24, cnt:[1,2], dur:1.0, stam:3.5, low:0.4, extra:[['tinder',0.6]]},
  /* **세상에 선 것은 전부 무엇인가를 준다**(사용자 요청: 손댈 수 없는 것이 없게) — 아래는 그래서 더한 것들이다 */
  bark_m  :{item:'bark',    n:'맹그로브 껍질', verb:'벗기기', regrow:48, cnt:[1,2], dur:1.6, stam:4, need:'sharp'},
  bark_b  :{item:'bark',    n:'자작 껍질',     verb:'벗기기', regrow:36, cnt:[1,2], dur:1.4, stam:3},
  bark_a  :{item:'bark',    n:'아카시아 껍질', verb:'벗기기', regrow:48, cnt:[1,1], dur:1.6, stam:4, need:'sharp'},
  resin   :{item:'resin',   n:'송진',      verb:'긁어내기',    regrow:36, cnt:[1,1], dur:1.4, stam:3, need:'sharp'},
  twig    :{item:'branch',  n:'어린 나무', verb:'가지 꺾기',   regrow:24, cnt:[1,1], dur:1.0, stam:3},
  frond   :{item:'fern',    n:'나무고사리', verb:'잎 뜯기',    regrow:24, cnt:[2,3], dur:1.0, stam:2.5},
  fern    :{item:'fern',    n:'고사리',    verb:'뜯기',        regrow:24, cnt:[1,1], dur:0.6, stam:1.5, low:0.3},
  flower  :{item:'flower',  n:'들꽃',      verb:'꺾기',        regrow:30, cnt:[1,2], dur:0.4, stam:1, hide:1},
  limerock:{item:'limestone',n:'석회석', verb:'줍기',       regrow:72, cnt:[1,1], dur:0.5, stam:1, hide:1},      // 자갈밭의 흰 돌(30-props.js RUBBLE)
  salt    :{item:'salt',    n:'소금 더께', verb:'캐기',       regrow:96, cnt:[1,2], dur:1.6, stam:5, hide:1, need:'pick'},  // 바닷가의 흰 더께(30-props.js RUBBLE) — 곡괭이로
  stone   :{item:'pebble',  n:'돌',        verb:'줍기',        regrow:72, cnt:[1,1], dur:0.4, stam:1, hide:1},      // 자갈밭의 잔돌(30-props.js RUBBLE)
  gbark   :{item:'bark',    n:'노거수 껍질', verb:'벗기기',    regrow:24, cnt:[2,3], dur:1.8, stam:4, need:'sharp'}, // 95-giants.js
  gresin  :{item:'resin',   n:'삼나무 송진', verb:'긁어내기',  regrow:24, cnt:[2,3], dur:1.6, stam:3, need:'sharp'},
  /* 둥지의 알 · 벌집의 꿀(97-wildlife.js) */
  egg     :{item:'egg',     n:'새 둥지',   verb:'알 꺼내기',   regrow:48, cnt:[1,2], dur:1.2, stam:2},
  honey   :{item:'honey',   n:'벌집',      verb:'꿀 따기',     regrow:72, cnt:[1,1], dur:2.0, stam:4, take:'pot', sting:7}
};
/* 바이옴마다의 군락 — w 얼룩이 그 군락이 될 몫 · far 나무 겹 · near 덤불 겹: [종류, 칸마다 설 확률, 크기 아래, 위]
   giant: 노거수가 서는 군락(1 활엽 · 2 침엽 — 95-giants.js) · low: 표고가 이보다 높으면 그 바이옴의 둘째 군락으로 바꾼다
   dense · nearDense: 칸 하나에 몇 번 굴리나(나무 겹 · 덤불 겹 — 없으면 1). **숲은 빽빽하다**(사용자 요청) — 밀림은 나무를 칸마다 두 번,
   덤불·고사리를 세 번 굴려 바닥이 거의 안 보인다 */
const FLORA_COMM={
  [B.BROADLEAF]:[
    {w:3,n:'밀림',      dense:2, nearDense:3, far:[['jungle',0.62,0.8,1.3],['banana',0.20,0.8,1.3],['treefern',0.14,0.8,1.3]], near:[['fern',0.46,0.9,1.6],['bush',0.36,0.8,1.5],['shroom',0.02,0.8,1.5]]},
    {w:2,n:'대숲',      dense:2, far:[['bamboo',0.70,0.8,1.25]],                                         near:[['fern',0.10,0.7,1.1]]},
    {w:2,n:'자작 숲',   dense:2, nearDense:2, far:[['birch',0.52,0.8,1.3],['sapling',0.14,0.8,1.2]],     near:[['fern',0.16,0.7,1.2],['flower',0.06,0.8,1.2],['bush',0.12,0.7,1.2]]},
    {w:3,n:'노거수 숲', giant:1, nearDense:2, far:[['sapling',0.22,0.8,1.3],['treefern',0.12,0.8,1.2]],  near:[['fern',0.38,0.8,1.5],['shroom',0.04,0.8,1.6],['bush',0.10,0.7,1.2]]},
    {w:2,n:'잡목 숲',   dense:2, nearDense:2, far:[['sapling',0.40,0.8,1.4],['birch',0.10,0.8,1.2]],     near:[['bush',0.26,0.7,1.5],['fern',0.20,0.7,1.3]]} ],
  [B.CONIFER]:[
    {w:3,n:'솔숲',      dense:2, far:[['pine',0.60,0.7,1.5]],                                            near:[['fern',0.16,0.7,1.2],['shroom',0.03,0.8,1.5]]},
    {w:2,n:'노거수 숲', giant:2, nearDense:2, far:[['pine',0.22,0.7,1.2]],                               near:[['fern',0.32,0.8,1.5],['shroom',0.05,0.8,1.6]]},
    {w:2,n:'고사리 골', dense:2, nearDense:2, far:[['treefern',0.40,0.8,1.3],['pine',0.12,0.7,1.2]],     near:[['fern',0.44,0.8,1.5],['bush',0.08,0.7,1.2]]} ],
  [B.MEADOW]:[
    {w:3,n:'꽃밭',      far:[],                                                                          near:[['flower',0.30,0.8,1.4]]},
    {w:2,n:'자작 덤불', far:[['birch',0.18,0.8,1.2]],                                                    near:[['bush',0.10,0.7,1.3],['flower',0.06,0.8,1.2]]},
    {w:3,n:'풀밭',      far:[['sapling',0.02,0.8,1.2]],                                                  near:[['flower',0.03,0.8,1.2],['bush',0.03,0.6,1.1]]} ],
  [B.SCRUB]:[
    {w:2,n:'아카시아 벌',far:[['acacia',0.20,0.8,1.4]],                                                  near:[['dry',0.10,0.7,1.5]]},
    {w:2,n:'가시덤불',  far:[],                                                                          near:[['dry',0.24,0.7,1.6],['bush',0.04,0.6,1.0]]},
    {w:2,n:'마른 벌',   far:[['acacia',0.03,0.8,1.2]],                                                   near:[['dry',0.05,0.7,1.2]]} ],
  [B.MARSH]:[ {w:1,n:'맹그로브 늪',low:2.5, dense:2, far:[['mangrove',0.80,0.8,1.3]],                    near:[['fern',0.12,0.8,1.4]]},
              {w:0,n:'고사리 늪',  nearDense:2, far:[['treefern',0.14,0.8,1.2],['sapling',0.08,0.7,1.1]],    near:[['fern',0.36,0.8,1.5],['bush',0.08,0.6,1.1]]} ],
  [B.BEACH]:[ {w:2,n:'야자 숲', far:[['palm',0.26,0.8,1.25]], near:[]},  {w:3,n:'모래톱', far:[['palm',0.012,0.8,1.2]], near:[]} ],
  [B.DUNE] :[ {w:2,n:'야자 숲', far:[['palm',0.22,0.8,1.25]], near:[['dry',0.05,0.6,1.2]]},  {w:2,n:'사구', far:[], near:[['dry',0.06,0.6,1.2]]} ],
  [B.ROCK] :[ {w:1,n:'바위틈',  far:[], near:[['dry',0.03,0.6,1.1]]} ],
  [B.SCREE]:[ {w:1,n:'돌밭',    far:[], near:[['dry',0.015,0.6,1.0]]} ]
};
/* 강어귀·늪 가의 얕은 물 — 군락표와 따로 본다. 얼룩 잡음이 높은 데에만 **빽빽이 모여** 선다(사용자 요청: 맹그로브는 모여 있어야 한다) */
const FLORA_MANGROVE=['mangrove',0.92,0.8,1.3];
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
  /* 홑 판 — 열십자(판 둘)로 세우지 않고 한 장. 여러 장을 자리·방위·눕힘을 달리해 흩으면 열십자보다 덩어리져 보인다
     (열십자는 어느 쪽에서 봐도 '판 두 장이 엇갈린 것'으로 읽혀 납작했다 — 사용자 지적). 세모 수는 같다(홑 판 둘 = 열십자 하나) */
  const card1=(p,w,h,cl,a,t,c)=>({g:SHP.card(w,h,false),x:p[0],y:p[1],z:p[2],q:face(a,t),cell:cl,c:c||W});
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
      /* 잎 뭉치 — 자리마다 홑 판 둘을 뭉치 둘레에 따로 놓는다(서로 다른 쪽을 보고, 바깥으로 눕는다). 뭉치가 공처럼 부푼다 */
      for(let k=0;k<S.leafN;k++){ const p=at(Math.max(0.3,1-k*0.3*rnd())), a0=a+(rnd()-0.5)*2.6;
        for(let e=0;e<2;e++){ const aa=a0+e*(1.3+rnd()*0.9), rr=sp*(0.35+rnd()*0.55);
          parts.push(card1([p[0]+Math.cos(aa)*rr,p[1]-S.leafH*0.15+(rnd()-0.5)*sp*0.7,p[2]+Math.sin(aa)*rr],S.leafW*(0.72+rnd()*0.36),S.leafH*(0.72+rnd()*0.36),S.leafCell,aa,S.leafTilt*(0.5+rnd()*1.2),S.leafC)); } }
      if(S.tips) S.tips.push(at(1));                    // 끝가지 자리 — 덩굴을 걸 데(liana)
    }
  };
  /* 덩굴 한 줄 — a 에서 b 로 걸린 줄(가운데가 sag 만큼 처진다)에 잎 뭉치가 달린다. 예전엔 가지 밑에 덩굴 그림 판 한 장을
     달았는데, 판이라 옆에서 보면 사라지고 가까이서는 종이 띠였다(사용자 지적: 덩굴이 잘 안 됐다). 이제 **줄은 진짜 대롱**이고
     잎만 십자 판이다 — 어느 쪽에서 봐도 줄이 보이고, 나무 사이에 늘어져 걸린다 */
  const liana=(parts,a,b,sag,r,segs)=>{
    const n=segs||5, pts=[], rad=[], wob=rnd()*6.28;
    for(let i=0;i<=n;i++){ const t=i/n, k=4*t*(1-t);
      pts.push([a[0]+(b[0]-a[0])*t+Math.sin(t*5+wob)*0.07*k, a[1]+(b[1]-a[1])*t-sag*k, a[2]+(b[2]-a[2])*t+Math.cos(t*4+wob)*0.07*k]);
      rad.push(r*(1-0.35*t)); }
    parts.push({g:SHP.tube(pts,rad,4,0.6),cell:FC.BARK,c:[0.34,0.38,0.22],c2:[0.44,0.48,0.26]});
    for(let i=1;i<=n;i++) if(rnd()<0.75){ const p=pts[i], h=0.55+rnd()*0.45;
      parts.push({g:SHP.card(h*0.8,h),x:p[0],y:p[1]-h*0.92,z:p[2],ry:rnd()*6.283,cell:FC.VINE,c:W}); }
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
  return {W,BARK,BARK2,unit,face,card,card1,trunk,grow,liana,fin};
}
/* 생김새 한 벌 — 씨앗(rnd)만 바꾸면 같은 짜임에 가지 각도·길이·수가 다른 다른 그루가 나온다.
   수(가지·잎·줄기)는 원래 값의 ±1~2 안에서만 흔든다 — 종류마다 생김새의 틀은 그대로다 */
function floraShapes(rnd){
  const {W,BARK,BARK2,unit,face,card,card1,trunk,grow,liana,fin}=floraKit(rnd);
  const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)), rf=(a,b)=>a+(b-a)*rnd();
  const G={};
  /* 밀림 나무 — 굵은 밑동, 다섯 갈래 큰 가지가 두 번씩 더 갈라져 스무 개의 끝가지. 덩굴이 늘어진다(키 9~11 m) */
  G.jungle=(()=>{ const parts=[], at=trunk(parts,7.0*rf(0.88,1.12),0.40,0.20,{flare:1.0,sway:rf(0.18,0.34),sides:8}), nb=ri(4,6);
    const S={taper:0.66,split:[2,3],spread:1.5,up:0.6,lift:0.35,shrink:0.72,bend:0.10,leafN:3,leafW:2.1,leafH:1.9,leafCell:FC.LEAF,leafTilt:0.6,leafC:[0.86,1.0,0.86],tips:[]};
    for(let i=0;i<nb;i++){ const a=i/nb*6.283+rnd()*0.9;
      grow(parts,at(0.60+i*0.5/nb),unit(Math.cos(a)*0.9,0.75,Math.sin(a)*0.9),2.8+rnd()*0.9,0.15,2,S); }
    /* 덩굴 — ① 끝가지에서 땅 가까이까지 늘어진 줄 서넛 ② 끝가지 둘 사이에 처져 걸린 줄 하나 ③ 줄기를 감아 오르는 줄 */
    { const T=S.tips, pick=()=>T[(rnd()*T.length)|0];
      for(let i=0,nh=ri(3,4);i<nh;i++){ const p=pick(); liana(parts,p,[p[0]+(rnd()-0.5)*0.8,0.5+rnd()*1.6,p[2]+(rnd()-0.5)*0.8],0.25,0.028,4); }
      { const p=pick(), q=pick(); if(p!==q) liana(parts,p,q,1.2+rnd()*1.4,0.032,5); }
      const hp=[], hr=[], a0=rnd()*6.28, turns=1.6+rnd();
      for(let i=0;i<=9;i++){ const t=i/9, c=at(t*0.62), rr=0.46-0.20*t; hp.push([c[0]+Math.cos(a0+t*turns*6.283)*rr,c[1],c[2]+Math.sin(a0+t*turns*6.283)*rr]); hr.push(0.03); }
      parts.push({g:SHP.tube(hp,hr,4,0.6),cell:FC.BARK,c:[0.34,0.38,0.22],c2:[0.44,0.48,0.26]});
      for(let i=1;i<=9;i+=2){ const p=hp[i]; parts.push(card([p[0],p[1]-0.25,p[2]],0.6,0.7,FC.VINE,rnd()*6.283,0.2,W)); } }
    for(let i=0,ne=ri(2,4);i<ne;i++){ const p=at(0.28+i*0.12), a=rnd()*6.283;            // 줄기에 붙어 사는 큰 잎
      parts.push({g:SHP.frond(0.9,0.38,{segs:4,curl:1.0,cup:0.2,tip:0.5}),x:p[0],y:p[1],z:p[2],q:face(a,0.5),cell:FC.BIG,c:[0.9,1,0.9]}); }
    return fin(parts); })();
  /* 맹그로브 — 줄기가 물 위 1.2 m 에서 시작하고, 버팀뿌리 열 가닥이 활처럼 휘어 내려 넓게 박힌다(뿌리 지름 4 m · 키 5 m) */
  G.mangrove=(()=>{ const parts=[], RB=[0.40,0.33,0.28], RB2=[0.55,0.47,0.38];
    parts.push({g:SHP.tube([[0,1.15,0],[0.05,1.9,0.03],[0.14,2.6,0.02],[0.20,3.2,-0.05]],[0.17,0.15,0.13,0.11],7,0.5),cell:FC.BARK,c:RB,c2:RB2});
    /* 버팀뿌리는 **넓게** 벌어진다(지름 4 → 7 m · 사용자 요청) — 안쪽 고리와 바깥 고리 두 겹이라 이웃 나무의 뿌리와 얽힌다 */
    const nr=ri(13,17); for(let i=0;i<nr;i++){ const a=i/nr*6.283+rnd()*0.5, R=(i%2?1.1+rnd()*0.9:2.1+rnd()*1.4), h=1.0+rnd()*0.9, cx=Math.cos(a), cz=Math.sin(a);
      parts.push({g:SHP.tube([[cx*0.08,h,cz*0.08],[cx*R*0.45,h+0.15,cz*R*0.45],[cx*R*0.85,h*0.45,cz*R*0.85],[cx*R,-0.2,cz*R],[cx*R*1.05,-1.2,cz*R*1.05]],
        [0.075,0.068,0.060,0.052,0.040],6,0),cell:FC.PLAIN,c:[RB[0]*0.72,RB[1]*0.72,RB[2]*0.72],c2:[RB2[0]*0.72,RB2[1]*0.72,RB2[2]*0.72]});   // 뿌리는 민무늬 — 껍질 그림의 세로 줄이 면마다 달라 각목처럼 보였다
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
        parts.push(card(p,1.0+rnd()*0.4,0.9+rnd()*0.3,FC.BAMBOO,rnd()*6.283,0.9+rnd()*0.5,[0.95,1.05,0.8])); }
      for(let k=0,nk=ri(0,2);k<nk;k++){ const t=0.25+rnd()*0.35, j=Math.min(n-1,Math.floor(t*n)), b=pts[j], ba=rnd()*6.283, L=0.5+rnd()*0.5;   // 마디에서 곁가지 — 대마다 0~2
        parts.push({g:SHP.limb(b,unit(Math.cos(ba),0.5,Math.sin(ba)),L,r*0.25,r*0.12,2,4,0.08,0),cell:FC.RING,c:[0.5,0.66,0.3],c2:[0.62,0.74,0.36]});
        parts.push(card([b[0]+Math.cos(ba)*L*0.9,b[1]+L*0.45,b[2]+Math.sin(ba)*L*0.9],0.6+rnd()*0.3,0.55,FC.BAMBOO,ba,1.0,[0.95,1.05,0.8])); } }
    return fin(parts); })();
  /* 야자 — 휘어 오른 마디 줄기, 꼭대기에서 사방으로 늘어지는 잎 열세 장, 열매 넷(키 6.4 m) */
  G.palm=(()=>{ const parts=[], pts=[], rad=[], n=7, lean=rf(0.45,1.35), H=6.4*rf(0.88,1.12), wob=rf(-0.15,0.15);
    for(let k=0;k<=n;k++){ const t=k/n; pts.push([lean*t*t+0.15*Math.sin(t*3),-0.2+H*t,(0.1+wob)*Math.sin(t*4)]); rad.push(0.17-0.06*t+0.06*Math.exp(-t*8)); }
    parts.push({g:SHP.tube(pts,rad,7,0.6),cell:FC.RING,c:[0.50,0.42,0.33],c2:[0.66,0.57,0.45]});
    const top=pts[n];
    for(let i=0,nf=ri(11,15);i<nf;i++){ const a=i/nf*6.283+rnd()*0.3, up=i%3===0?0.25:(i%3===1?0.75:1.15);
      parts.push({g:SHP.frond(2.7+rnd()*0.5,1.0,{segs:6,curl:1.0+rnd()*0.5,cup:0.22,p:0.3,tip:0.6}),x:top[0],y:top[1]-0.05,z:top[2],q:face(a,up),cell:FC.PALM,c:[0.95,1,0.9]}); }
    for(let i=0,nn=ri(0,5);i<nn;i++){ const a=i/Math.max(1,nn)*6.283+0.4;      // 열매 0~5
      parts.push({g:new THREE.SphereGeometry(0.13,8,6),x:top[0]+Math.cos(a)*0.16,y:top[1]-0.28,z:top[2]+Math.sin(a)*0.16,cell:FC.PLAIN,c:[0.36,0.27,0.15],c2:[0.50,0.40,0.22]}); }
    /* 30% 는 밑동에서 줄기가 하나 더 — 다른 쪽으로 기울고 키가 0.6~0.85배 */
    if(rnd()<0.30){ const k=rf(0.6,0.85), ba=rnd()*6.283, L2=rf(0.6,1.4), p2=[], r2=[];
      for(let q=0;q<=n;q++){ const t=q/n; p2.push([0.12*Math.cos(ba)+Math.cos(ba)*L2*t*t,-0.2+H*k*t,0.12*Math.sin(ba)+Math.sin(ba)*L2*t*t]); r2.push((0.15-0.05*t)*k+0.04*Math.exp(-t*8)); }
      parts.push({g:SHP.tube(p2,r2,7,0.6),cell:FC.RING,c:[0.50,0.42,0.33],c2:[0.66,0.57,0.45]});
      const t2=p2[n];
      for(let i=0,nf=ri(9,13);i<nf;i++){ const a=i/nf*6.283+rnd()*0.3, up=i%3===0?0.25:(i%3===1?0.75:1.15);
        parts.push({g:SHP.frond((2.4+rnd()*0.5)*k,0.9*k,{segs:6,curl:1.0+rnd()*0.5,cup:0.22,p:0.3,tip:0.6}),x:t2[0],y:t2[1]-0.05,z:t2[2],q:face(a,up),cell:FC.PALM,c:[0.95,1,0.9]}); } }
    return fin(parts); })();
  /* 자작 — 흰 줄기에 가로 무늬, 가는 가지 여덟이 위로 뻗고 잎이 성기다(키 7.5 m) */
  G.birch=(()=>{ const parts=[], at=trunk(parts,7.5*rf(0.88,1.12),0.12,0.035,{flare:0.25,sway:0.18,cell:FC.BIRCH,c:[1.02,1.0,0.95],c2:[1.08,1.07,1.02],sides:6,segs:7});
    const S={taper:0.6,split:[2],spread:0.9,up:1.0,lift:0.25,shrink:0.7,bend:-0.04,leafN:3,leafW:0.95,leafH:1.0,leafCell:FC.LEAF,leafTilt:1.0,leafC:[1.1,1.25,0.72],bark:[0.75,0.72,0.66],bark2:[0.9,0.88,0.82]};
    for(let i=0,nb=ri(7,9);i<nb;i++){ const a=i*2.4+rnd()*0.5;
      grow(parts,at(Math.min(0.98,0.42+i*0.56/nb)),unit(Math.cos(a),0.9,Math.sin(a)),1.5-i*0.64/nb+rnd()*0.3,0.035,1,S); }
    parts.push(card(at(1),0.9,1.0,FC.LEAF,0,0,[1.1,1.25,0.72]));
    if(rnd()<0.25){ const a=rnd()*6.283; grow(parts,at(rf(0.35,0.5)),unit(Math.cos(a)*0.35,1,Math.sin(a)*0.35),rf(2.0,3.0),0.07,2,S); }   // 갈래 줄기
    return fin(parts); })();
  /* 어린 전나무 — 층층이 처진 솔가지 여덟 층(키 5.6 m) */
  G.pine=(()=>{ const parts=[], at=trunk(parts,5.6*rf(0.88,1.12),0.10,0.02,{flare:0.4,sway:0.05,sides:6,segs:5}), NC=[0.9,1,0.95];
    for(let j=0;j<8;j++){ const t=0.14+j*0.105, L=1.75*(1-t*0.8)*rf(0.8,1.15), p=at(t);
      if(j<3&&rnd()<0.25) continue;                                                 // 아래층이 가끔 빠졌다(그늘에 말라 떨어짐)
      for(let i=0,nk=ri(3,6);i<nk;i++) if(rnd()<0.9) parts.push(card(p,L*0.85,L,FC.NEEDLE,i/nk*6.283+j*0.7+rnd()*0.3,1.25+rnd()*0.2,NC)); }
    parts.push(card(at(0.93),0.5,0.75,FC.NEEDLE,0,0,NC));
    if(rnd()<0.2){ const a=rnd()*6.283, b=at(0.8), d=unit(Math.cos(a)*0.4,1,Math.sin(a)*0.4);          // 쌍우듬지
      parts.push({g:SHP.limb(b,d,1.0,0.03,0.012,2,5,0,0),cell:FC.BARK,c:BARK,c2:BARK2});
      parts.push(card([b[0]+d[0],b[1]+d[1]*0.9,b[2]+d[2]],0.5,0.8,FC.NEEDLE,a,0.1,NC)); }
    return fin(parts); })();
  /* 어린 활엽수 — 가는 줄기에 가지 넷(키 3~4 m) */
  G.sapling=(()=>{ const parts=[], at=trunk(parts,3.0*rf(0.85,1.15),0.07,0.03,{flare:0.3,sway:0.15,sides:5,segs:4});
    const S={taper:0.62,split:[2],spread:1.3,up:0.8,lift:0.3,shrink:0.7,leafN:3,leafW:1.0,leafH:1.05,leafCell:FC.LEAF,leafTilt:0.8,leafC:[1,1.08,0.9]};
    for(let i=0,nb=ri(3,5);i<nb;i++){ const a=i/nb*6.283+rnd(); grow(parts,at(0.55+i*0.39/(nb-1)),unit(Math.cos(a),0.8,Math.sin(a)),0.9+rnd()*0.4,0.03,1,S); }
    for(let i=0,nl=ri(0,2);i<nl;i++){ const a=rnd()*6.283; grow(parts,at(rf(0.25,0.45)),unit(Math.cos(a),0.45,Math.sin(a)),0.6+rnd()*0.4,0.02,1,S); }   // 낮은 곁가지 0~2
    return fin(parts); })();
  /* 바나나 — 풀빛 줄기에 크고 넓은 잎 여덟 장, 노란 송이(키 3 m) */
  G.banana=(()=>{ const parts=[{g:SHP.tube([[0,-0.2,0],[0.02,0.8,0],[0.05,1.7,0.02]],[0.11,0.09,0.06],7,0.5),cell:FC.STEM,c:[0.55,0.66,0.38],c2:[0.68,0.78,0.46]}];
    for(let i=0,nl=ri(7,9);i<nl;i++){ const a=i*2.4+rnd()*0.4;
      parts.push({g:SHP.frond(1.7+rnd()*0.5,0.62,{segs:5,curl:0.7+rnd()*0.6,cup:0.2,p:0.4,tip:0.55}),x:0.05,y:1.55,z:0.02,q:face(a,0.15+i/nl),cell:FC.BIG,c:[0.92,1,0.88]}); }
    for(let i=0;i<7;i++){ const a=i/7*6.283;
      parts.push({g:SHP.limb([0.16+Math.cos(a)*0.04,1.28,0.1+Math.sin(a)*0.04],unit(Math.cos(a)*0.5,-0.6,Math.sin(a)*0.5),0.16,0.022,0.016,2,5,0.5,1),cell:FC.PLAIN,c:[0.85,0.72,0.2],c2:[0.95,0.85,0.3]}); }
    for(let j=0,ns=ri(0,2);j<ns;j++){ const a=rnd()*6.283, d=0.35+rnd()*0.25, x=Math.cos(a)*d, z=Math.sin(a)*d, h=0.6+rnd()*0.6;   // 곁순 — 밑동 둘레에 어린 줄기
      parts.push({g:SHP.tube([[x,-0.2,z],[x,h*0.6,z],[x+0.02,h,z]],[0.06,0.05,0.035],6,0.5),cell:FC.STEM,c:[0.55,0.66,0.38],c2:[0.68,0.78,0.46]});
      for(let i=0,nl=ri(3,5);i<nl;i++) parts.push({g:SHP.frond(0.8+rnd()*0.4,0.35,{segs:4,curl:0.6+rnd()*0.5,cup:0.2,p:0.4,tip:0.55}),x:x+0.02,y:h-0.05,z,q:face(a+i*2.4,0.2+i*0.25),cell:FC.BIG,c:[0.92,1,0.88]}); }
    return fin(parts); })();
  /* 나무고사리 — 짙은 줄기 끝에 고사리 잎이 우산처럼(키 3 m) */
  /* 나무고사리 — **가지가 무작위다**(사용자 요청): 35% 는 줄기 중간에서 갈라져 머리가 둘(작은 쪽은 0.6~0.8배),
     머리마다 잎 수·길이가 다르고, 밑에는 말라 늘어진 잎(치마)이 0~5장 */
  G.treefern=(()=>{ const parts=[], H=2.3*rf(0.85,1.2), at=trunk(parts,H,0.12,0.09,{flare:0.2,sway:0.1,c:[0.26,0.2,0.15],c2:[0.36,0.28,0.2],sides:6,segs:3});
    const crown=(top,k)=>{ for(let i=0,nf=ri(8,13);i<nf;i++){ const a=i/nf*6.283+rnd()*0.4;
        parts.push({g:SHP.frond((1.6+rnd()*0.5)*k,0.6*k,{segs:5,curl:1.0+rnd()*0.5,cup:0.15,p:0.35,tip:0.5}),x:top[0],y:top[1],z:top[2],q:face(a,0.45+rnd()*0.5),cell:FC.FERN,c:W}); }
      for(let i=0,nd=ri(0,5);i<nd;i++){ const a=rnd()*6.283;                       // 마른 잎 — 줄기를 따라 늘어진다
        parts.push({g:SHP.frond((1.0+rnd()*0.4)*k,0.4*k,{segs:4,curl:0.4,cup:0.1,p:0.35,tip:0.4}),x:top[0],y:top[1]-0.15,z:top[2],q:face(a,2.3+rnd()*0.5),cell:FC.FERN,c:[0.62,0.46,0.28]}); } };
    crown(at(1),1);
    if(rnd()<0.35){ const a=rnd()*6.283, b=at(rf(0.45,0.7)), k=rf(0.6,0.8), d=unit(Math.cos(a)*0.55,1,Math.sin(a)*0.55), L=H*0.55*k;
      parts.push({g:SHP.limb(b,d,L,0.085,0.065,3,6,0.05,0.5),cell:FC.BARK,c:[0.26,0.2,0.15],c2:[0.36,0.28,0.2]});
      crown([b[0]+d[0]*L,b[1]+d[1]*L,b[2]+d[2]*L],k); }
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
    for(let i=0,nh=ri(0,2);i<nh;i++){ const a=rnd()*6.283, x=Math.cos(a)*0.05, z=Math.sin(a)*0.05, h=0.18+rnd()*0.14;   // 고사리 새순 — 끝이 말린 대
      parts.push({g:SHP.limb([x,-0.02,z],unit(Math.cos(a)*0.2,1,Math.sin(a)*0.2),h,0.007,0.005,3,4,0.04,0),cell:FC.PLAIN,c:[0.36,0.52,0.20],c2:[0.48,0.62,0.26]});
      parts.push({g:new THREE.TorusGeometry(0.022,0.007,4,8,4.6),x:x+Math.cos(a)*h*0.2,y:h+0.01,z:z+Math.sin(a)*h*0.2,ry:-a,cell:FC.PLAIN,c:[0.40,0.56,0.22]}); }
    return fin(parts); })();
  /* 덤불 — 잔가지 다섯에 잎 판때기 열한 장 */
  G.bush=(()=>{ const parts=[];
    for(let i=0,nb=ri(4,6);i<nb;i++){ const a=i/nb*6.283+rnd(); parts.push({g:SHP.limb([0,-0.05,0],unit(Math.cos(a)*0.7,1,Math.sin(a)*0.7),0.55+rnd()*0.25,0.025,0.012,1,4,0,0),cell:FC.BARK,c:BARK}); }
    /* 잎은 **둥근 지붕 꼴**로 — 작은 홑 판 스무 장을 반구 껍질에 얹고 바깥으로 눕힌다(예전엔 큰 열십자 판 열 장이 가운데에 몰려
       납작했다 — 사용자 지적). 아래 둘레는 넓고 위로 갈수록 모인다 */
    for(let i=0,nc=ri(18,22);i<nc;i++){ const u=(i+rnd())/nc, a=i*2.399+rnd()*0.6, el=Math.acos(1-u*0.95), rr=0.20+0.34*Math.sin(el), y=0.10+0.50*Math.cos(el)*(0.8+0.4*rnd());
      parts.push(card1([Math.cos(a)*rr,y,Math.sin(a)*rr],0.42+rnd()*0.22,0.40+rnd()*0.20,FC.LEAF,a+(rnd()-0.5)*0.8,0.35+el*0.55+rnd()*0.25,[0.95,1.05,0.9])); }
    return fin(parts); })();
  /* 들꽃 — **입체**(사용자 요청). 포기 하나에 꽃대 4~6, 꽃대마다 끝에 꽃잎 다섯(얕은 접시꼴로 위로 벌어진다) + 가운데 꽃술,
     꽃대 밑에 잎 두 장. 꽃잎은 흰 바탕(PLAIN)이라 얼룩마다의 빛깔(인스턴스 색 · FLOWER_TINT)이 그대로 입혀진다.
     예전엔 꽃 그림 판때기 일곱 장(14 세모)이었다 — 이제 포기당 300 세모 남짓이라 가까운 겹(46 m)에만 선다(원래 그랬다) */
  G.flower=(()=>{ const parts=[], Y=new THREE.Vector3(0,1,0), Z=new THREE.Vector3(0,0,1);
    const PET=new THREE.SphereGeometry(1,4,2).scale(0.030,0.0045,0.013).translate(0.026,0,0);   // 끝이 둥근 마름모꼴 꽃잎
    const DISC=new THREE.SphereGeometry(0.011,5,3).scale(1,0.55,1);
    for(let i=0,nf=ri(4,6);i<nf;i++){ const a=i*2.399+rnd()*0.7, rr=i?0.03+rnd()*0.11:0, H=0.20+rnd()*0.24;
      const x=Math.cos(a)*rr, z=Math.sin(a)*rr, lx=Math.cos(a)*rf(0.08,0.30), lz=Math.sin(a)*rf(0.08,0.30), d=unit(lx,1,lz);
      parts.push({g:SHP.limb([x,-0.02,z],d,H,0.0055,0.0035,2,3,0.02*(rnd()-0.3),0),cell:FC.PLAIN,c:[0.26,0.42,0.16],c2:[0.38,0.56,0.22]});
      const top=[x+d[0]*H,-0.02+d[1]*H,z+d[2]*H];
      const qh=new THREE.Quaternion().setFromUnitVectors(Y,new THREE.Vector3(d[0]*1.6,1,d[2]*1.6).normalize());   // 꽃은 바깥으로 조금 고개를 든다
      const np=ri(5,6), cup=rf(0.25,0.55), s0=rf(1.1,1.6), r0=rnd()*6.283;
      for(let k=0;k<np;k++){
        const q=qh.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y,r0+k/np*6.283)).multiply(new THREE.Quaternion().setFromAxisAngle(Z,cup));
        parts.push({g:PET,x:top[0],y:top[1],z:top[2],q,s:s0,cell:FC.PLAIN,c:[0.86,0.86,0.84],c2:[1,1,1]}); }
      parts.push({g:DISC,x:top[0],y:top[1]+0.004,z:top[2],q:qh,s:s0,cell:FC.PLAIN,c:[0.62,0.42,0.06],c2:[0.92,0.70,0.14]});
      if(i<2) parts.push(card1([x+lx*0.05,0.02,z+lz*0.05],0.14,0.12,FC.LEAF,a+1.2,0.9,[0.8,0.95,0.75])); }
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
  /* 땅에 녹아들기(envPatch) — 나무 줄기 밑동은 한 뼘 반, 덤불·고사리·꽃·버섯(matN)은 손가락 두 마디만(키가 작아 더 주면 통째로 땅빛이 된다) */
  FLORA.mat.userData.melt=0.42; FLORA.mat.userData.leaf=true;    // 잎에 비쳐 드는 빛(envPatch)
  FLORA.matN=FLORA.mat.clone(); FLORA.matN.userData.melt=0.06;
  /* 먼 단계(FL_FULL 50 m 밖)는 땅에 녹아들기를 뺀다 — 그것이 정점마다 표고 텍스처를 네 번 읽는데(envPatch), 40 m 밖의 밑동 한 뼘은
     한두 화소라 안 보인다. 숲에서 먼 나무 겹이 프레임의 4 ms 였다(FPS 측정) */
  FLORA.matL=FLORA.mat.clone(); FLORA.matL.userData.melt=0; FLORA.matL.userData.leaf=true;
  FLORA.m={};
  for(const L of [FLORA.far,FLORA.near]) for(const k of L.kinds){
    const nv=FLORA_VARS[k]||1, cap=Math.ceil(FLORA_KIND[k].cap*2.5)+8;   // 벌마다 몫 — 기준 벌(`FLORA.ref`)이 먼 그루를 다 받으므로 예전 종류 전체 몫(평균의 2.5배)
    FLORA.m[k]=[]; L.n[k]=new Int32Array(nv);
    for(let v=0;v<nv;v++){
      const im=new THREE.InstancedMesh(SH[v][k],L===FLORA.far?FLORA.mat:FLORA.matN,cap);
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
const _flN=new THREE.Vector3(), _flUP=new THREE.Vector3(0,1,0), _flQt=new THREE.Quaternion();
const _flM=new THREE.Matrix4(), _flQ=new THREE.Quaternion(), _flE=new THREE.Euler(), _flV=new THREE.Vector3(),
      _flS=new THREE.Vector3(), _flC=new THREE.Color();
/* 그 칸에서 30 m 안에 **하천** 칸이 있나 — 강어귀를 가린다. 예전엔 `F.dRiver` 를 봤는데 그 거리장은 하천과 **바다** 둘 다에서 재는
   것이라 바닷가 전체가 걸렸다(트인 모래 해변마다 맹그로브가 섰다). 하천 표를 직접 훑는다 */
function floraNearRiver(ci){
  const r=Math.max(2,Math.ceil(30/CELL)), cx=ci%N, cz=(ci/N)|0, riv=F.river;
  for(let dz=-r;dz<=r;dz++){ const z=cz+dz; if(z<1||z>=N-1) continue;
    for(let dx=-r;dx<=r;dx++){ const x=cx+dx; if(x<1||x>=N-1) continue; if(riv[z*N+x]&&F.elev[z*N+x]>-0.5) return true; } }
  return false;
}
/* 그 자리에 큰 나무·바위·설비·벽(충돌 원)이 있나 */
function floraHit(wx,wz,pad){
  if(caveAt(wx,wz,pad+2.5)||cragNear(wx,wz,pad)) return true;   // 굴 속·굴 벽 · 벼랑의 큰 바위 속에는 안 선다(10-worldgen.js · 33-crags.js)
  /* **바위 속에 풀이 돋지 않게**(사용자 지적: 바위 안에 풀이 난다) — 벼랑 바위는 원(cols)이 그려진 꼴보다 작아 덩이 가장자리에 풀이 돋았다.
     둘레 8 m 안에 바위가 있으면 그 자리 수직선이 바위를 지나는지(그려진 꼴 그대로 — cragSpan) 본다. 벼랑 밑 큰 돌(RUBBLE.cols)도 */
  if(CRAG.n&&cragNear(wx,wz,8)){ const g=heightAt(wx,wz), n=cragSpan(wx,wz); for(let i=0;i<n;i++) if(_cgS[i].t>g+0.15&&_cgS[i].b<g+1.2) return true; }
  for(const c of RUBBLE.cols){ const dx=wx-c.x, dz=wz-c.z, q=c.r+pad*0.5; if(dx*dx+dz*dz<q*q) return true; }
  const cgx=Math.floor(wx/CG), cgz=Math.floor(wz/CG);
  for(let az=-1;az<=1;az++) for(let ax=-1;ax<=1;ax++){
    const a=CGRID.get(cgKey(cgx+ax,cgz+az)); if(!a) continue;
    for(const o of a){ const ox=wx-o.x, oz=wz-o.z, rr=(o.prof?o.r*1.15:o.r)+pad; if(ox*ox+oz*oz<rr*rr) return true; }   // 바위(prof)는 보이는 겉이 충돌 테두리보다 조금 크다
  }
  return false;
}
/* 덤불 겹(사람 둘레 46 m) — 사람을 따라 다시 깐다. 나무 겹은 아래 `floraFar` 가 섬 전체를 한 번 깔고 거리로 고른다 */
/* 인스턴스 자료를 올린다 — **쓰는 앞부분(count)만**. 먼 나무 메시는 섬의 그 종류 나무를 다 담을 만큼 크다(160만~200만 바이트) —
   통째로 올리면 고개를 돌릴 때마다 프레임당 1.4~2.2 MB 를 올리며 그래픽 장치를 기다렸다(FPS 프로파일). 0 개면 올릴 것이 없다 */
function instUp(im){
  const n=im.count; if(n<=0) return;
  const M=im.instanceMatrix; M.updateRange.offset=0; M.updateRange.count=n*16; M.needsUpdate=true;
  const C=im.instanceColor; if(C){ C.updateRange.offset=0; C.updateRange.count=n*3; C.needsUpdate=true; }
}
function floraLayer(L,which){
  /* 자동 품질이 반경을 당긴다(30-props.js) — **덤불 겹은 0.85배(39 m) 밑으로는 안 당긴다**(사용자 지적: 프레임이 떨어지면 0.4배 → 18 m 라
     12 m 밖 덤불이 줄어들다 사라졌다). 덤불 겹은 삼각형이 수만 개뿐이라 당겨 봐야 프레임에 거의 안 듣는다 */
  const U=FLORA, px=PL.pos.x, pz=PL.pos.z, far=which==='far', C=L.cell, R=L.R*(far?QUAL.k:Math.max(QUAL.k,0.85)), n=L.n;
  L.cx=px; L.cz=pz; L.cols.length=0; L.picks.length=0;
  for(const k of L.kinds) n[k].fill(0);
  const near0={}, nearV={}; U.pendN=0;
  const x0=Math.floor((px-R)/C), x1=Math.floor((px+R)/C), z0=Math.floor((pz-R)/C), z1=Math.floor((pz+R)/C);
  const TRY=far?2:3;                                  // 칸 하나에 많아야 이만큼 선다(군락의 dense · nearDense 가 정한다)
  for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){ let lx=1e9, lz=1e9;
   for(let tr=0;tr<TRY;tr++){
    const salt=L.salt+tr*16, h=floraHash(gx,gz,salt);
    const wx=(gx+(h&255)/255)*C, wz=(gz+((h>>>8)&255)/255)*C;
    const ddx=wx-px, ddz=wz-pz, d=Math.sqrt(ddx*ddx+ddz*ddz); if(d>R) continue;
    if(tr&&(wx-lx)*(wx-lx)+(wz-lz)*(wz-lz)<(far?2.2:0.5)) continue;       // 같은 칸의 앞 그루와 겹치면 넘긴다
    const ci=IDX(clamp(Math.round(wx/CELL+N/2),1,N-2),clamp(Math.round(wz/CELL+N/2),1,N-2));
    const el=F.elev[ci], bi=F.biome[ci];
    let u=((h>>>16)&4095)/4095, pick=null, patch=0;
    if(far&&el>-0.9&&el<0.5&&!F.river[ci]&&(bi===B.MARSH||floraNearRiver(ci))){
      /* 강어귀와 늪 가의 얕은 물 — 맹그로브가 띠를 이룬다(얼룩 잡음이 높은 데만 · 민물과 바다가 만나는 자리가 가려진다) */
      if(floraVal(wx,wz,26,41)>0.50&&u<FLORA_MANGROVE[1]) pick=FLORA_MANGROVE;
    }else{
      if(el<0.4||F.river[ci]||F.slope[ci]>0.75) continue;
      let cm=floraCommAt(wx,wz,bi); if(!cm) continue;
      if(cm.low&&el>cm.low) cm=FLORA_COMM[bi][1];     // 맹그로브는 바닷가 낮은 늪에만 — 산 위 이탄지는 고사리 늪
      if(tr>=((far?cm.dense:cm.nearDense)||1)) break;   // 이 군락은 칸마다 이만큼만 굴린다
      patch=_fp.id;
      /* 얼룩 가장자리로 갈수록 성기다(군락 사이의 빈터) · 그 안에서도 잔 얼룩으로 뭉쳤다 풀렸다 한다 */
      const dens=clamp(_fp.edge/10,0.12,1)*(0.55+0.9*floraVal(wx,wz,11,43));
      for(const t of cm[which]){ const pr=t[1]*dens; if(u<pr){ pick=t; break; } u-=pr; }
    }
    if(!pick) continue;
    const kind=pick[0], ms=U.m[kind], vi=floraHash(gx,gz,salt+7)%ms.length, K=FLORA_KIND[kind], nk=n[kind];
    // 큰 나무·바위·설비·벽이 선 자리, 지은 바닥 위는 비운다
    const pad=(K.r||0)+0.5;
    if(floraHit(wx,wz,pad)||inLanding(wx,wz,pad)) continue;   // 보급선이 앉는 자리 · 깨는 자리는 비운다
    const gy=heightAt(wx,wz);
    if(floorAt(wx,wz)>gy+0.05) continue;
    const key=(far?'F':'N')+gx+','+gz+(tr?'#'+tr:''), P=K.pick?FLORA_PICK[K.pick]:null;
    if(P&&P.hide){ const t=U.taken.get(key); if(t!==undefined){ if(gameHours-t<P.regrow) continue; U.taken.delete(key); } }
    const h2=floraHash(gx,gz,salt+1);
    const v=(h2&1023)/1023, sc=(pick[2]+(pick[3]-pick[2])*v)*clamp((R-d)/L.fade,0.25,1);
    const tl=far?0.05:0.16;
    _flE.set(((h2>>>10)&31)/31*tl-tl/2,((h2>>>15)&1023)/1023*6.283,((h2>>>25)&31)/31*tl-tl/2); _flQ.setFromEuler(_flE);
    /* **비탈에 앉히기** — 곧추선 채 비탈에 놓으면 아래쪽 잎이 허공에 뜬다(사용자 지적). 덤불·고사리·꽃은 땅의 기울기대로 눕히고
       (기울기의 0.85), 나무는 줄기 밑동이 아래쪽에서도 묻히게 내린다(밑동 반지름 × 기울기 · 0.7 m 까지) */
    const gs=groundSlope(wx,wz,far?0.5:Math.max(0.35,(K.r||0.3)*sc)), gsl=Math.hypot(gs[0],gs[1]);
    if(!far&&gsl>0.06){ _flN.set(-gs[0]*0.85,1,-gs[1]*0.85).normalize(); _flQ.premultiply(_flQt.setFromUnitVectors(_flUP,_flN)); }
    _flV.set(wx,gy-0.03-(far?Math.min(1.2,((K.r||0.25)*sc*1.3+0.15)*gsl):0.05*gsl),wz); _flS.set(sc,sc*(0.9+0.2*((h>>>28)&15)/15),sc);
    _flM.compose(_flV,_flQ,_flS);
    if(kind==='flower'){ const t=FLOWER_TINT[patch%FLOWER_TINT.length]; _flC.setRGB(t[0],t[1],t[2]); }   // 꽃밭은 얼룩마다 한 빛깔
    else{ const g=0.86+0.26*((h2>>>3)&15)/15, w=((h2>>>7)&15)/15; _flC.setRGB(g*(0.94+0.14*w),g,g*(0.92+0.08*(1-w))); }
    /* 늘 제 벌(사용자 지적 — 예전엔 12 m 밖이면 '기준 벌' 로 갈아 끼워 다가가면 모양이 바뀌는 게 눈에 띄었다) */
    { const im=ms[vi]; if(nk[vi]>=im.instanceMatrix.count) continue;
      im.setMatrixAt(nk[vi],_flM); im.setColorAt(nk[vi]++,_flC); }
    if(U.ref[kind]===undefined&&d<(near0[kind]??1e9)){ near0[kind]=d; nearV[kind]=vi; }   // 기준 벌을 아직 안 정한 종류 — 가장 가까운 그루
    if(K.r) L.cols.push({x:wx,z:wz,r:K.r*sc});
    if(P) L.picks.push({kind:K.pick,x:wx,y:gy,z:wz,key,r:(K.r||0.12)*sc,tree:!P.hide&&!P.low,ay:P.low?gy+P.low*sc:gy+0.06});
    lx=wx; lz=wz;
   }
  }
  for(const k in nearV) U.ref[k]=nearV[k];
  for(let i=0;i<U.pendN;i++){ const q=U.pend[i], v=U.ref[q.k], im=U.m[q.k][v], nk=n[q.k]; if(nk[v]>=im.instanceMatrix.count) continue;
    _flM.fromArray(q.m); im.setMatrixAt(nk[v],_flM); _flC.setRGB(q.c[0],q.c[1],q.c[2]); im.setColorAt(nk[v]++,_flC); }
  for(const k of L.kinds) U.m[k].forEach((im,v)=>{ im.count=n[k][v]; im.visible=im.count>0;
    instUp(im); });
  if(far) LIGHT.dirtyAt(px,pz,R);                      // 나무가 바뀌었다 — 그림자 지도를 다시 그린다
}
function updateFlora(force){
  const U=FLORA; if(!scene) return;
  if(!U.m) floraBuild();
  const L=U.near, dx=PL.pos.x-L.cx, dz=PL.pos.z-L.cz;
  if(force||dx*dx+dz*dz>=L.step*L.step) floraLayer(L,'near');
  floraFar(force);
  floraFindLook();
  updateGiants(force);                                 // 노거수 — 200 m 안팎으로 생김새를 가른다(95-giants.js)
}
/* ── 나무 겹 — 참나무·전나무와 같은 길 ───────────────────────────────────────
   (30-props.js 의 `updateTileVis` · `buildFarTrees` · `FAR_REF` · `bakeTreeGeo` · `bakeTreeImpostor` 를 그대로 따른다)
   ① **섬 전체를 한 번 깐다**(`floraPlantAll` — 6 m 칸의 해시. 예전엔 사람 둘레 110 m 만 걸을 때마다 다시 깔아서 그 밖의 숲이 비었다)
      그루마다 자리·행렬·빛깔을 적어 64 m 칸(`FL_TILE`)에 담는다.
   ② **기준 그루** — 종류마다 섬을 다 지은 순간 사람에게서 가장 가까운 그루의 벌(`FLORA.ref`). 그 벌로 줄인 복제 셋
      (`floraLodGeo` — 잎 판 60 · 30 · 10% 를 1/√몫 배로 키워 덮는 넓이를 맞추고, 잔가지도 그만큼 솎는다)과 그림 한 장(`floraBakePic`)을 짓는다.
   ③ **거리로 고른다**(`floraFar` · 그루마다):  25 m(`FULL_DIST`) 안 제 벌 그대로 · 25~55 m 복제 60%(그림자 드리움) ·
      55~90 m 30% · 90~200 m 10% · 200 m(`FL_PIC`) ~ 450 m(`VIEW_DIST`) 기준 그루를 찍은 그림 판때기 · 그 밖은 안 그린다.
      55 m 밖은 그림자를 드리우지 않는다. **화면 밖 칸은 거른다**(칸 경계구 · 가장자리 10 m 안 칸은 늘).
   ④ 다시 채우는 때 — 사람이 2 m 움직였거나 보이는 칸이 바뀌었을 때만. 종류마다 메시가 단계별로 하나라 그리기 호출은
      종류 × (가까운 벌 몇 + 복제 셋 + 그림 하나)다. 행렬은 배열에 바로 쓰고 그림자 지도는 드리우는 것(55 m 안)이 바뀔 때만 다시 그린다.
   몸이 막히는 원(`cols`)·딸 것(`picks`)은 60 m 안의 그루만, 사람이 움직일 때 다시 센다(그때 그 둘레의 지은 바닥·설비도 다시 본다). */
const FL_TILE=64, FL_LOD=[[60,0.65],[95,0.3]], FL_PIC=160, FL_STEP=2, FL_NEAR=60, FL_FULL=50;
/* 사용자 지적 — 25 m 에서 '기준 그루' 의 복제로 갈아 끼워 모양이 바뀌는 게 너무 잘 보였다. 이제 ① 먼 단계도 **그루마다 제 벌**을 줄인 것이라
   줄기·큰 가지 구조가 그대로이고(잎 판·잔가지만 솎는다) ② 제 생김새 그대로는 50 m(`FL_FULL`)까지 · 50~60 m 잎 65% · 60~95 m 30% · 95~160 m 12%.
   그림 판때기(160 m 밖)만 기준 그루 하나다 */   // 잰 값: 이 겹이 한 프레임의 4 ms 였다 — 단계를 당기고(55→40 · 90→75 · 200→160) 잎을 더 솎는다
const _ffPM=new THREE.Matrix4(), _ffFr=new THREE.Frustum(), _ffSp=new THREE.Sphere();
function floraPlantAll(){
  const U=FLORA, L=U.far, C=L.cell, n=Math.floor(HALF/C)-1;
  U.P=[]; U.tl=[]; U.kn={};
  const tiles=new Map();
  for(let gz=-n;gz<n;gz++) for(let gx=-n;gx<n;gx++){ let lx=1e9, lz=1e9;
   for(let tr=0;tr<2;tr++){                           // 칸 하나에 많아야 둘(군락의 dense 가 정한다 — 빽빽한 숲)
    const salt=L.salt+tr*16, h=floraHash(gx,gz,salt);
    const wx=(gx+(h&255)/255)*C, wz=(gz+((h>>>8)&255)/255)*C;
    if(tr&&(wx-lx)*(wx-lx)+(wz-lz)*(wz-lz)<2.2) continue;   // 같은 칸의 앞 그루와 겹치면 넘긴다
    const ci=IDX(clamp(Math.round(wx/CELL+N/2),1,N-2),clamp(Math.round(wz/CELL+N/2),1,N-2));
    const el=F.elev[ci], bi=F.biome[ci];
    let u=((h>>>16)&4095)/4095, pick=null;
    if(el>-0.9&&el<0.5&&!F.river[ci]&&(bi===B.MARSH||floraNearRiver(ci))){
      /* 강어귀와 늪 가의 얕은 물 — 맹그로브가 띠를 이룬다(얼룩 잡음이 높은 데만 · 민물과 바다가 만나는 자리가 가려진다) */
      if(floraVal(wx,wz,26,41)>0.50&&u<FLORA_MANGROVE[1]) pick=FLORA_MANGROVE;
    }else{
      if(el<0.4||F.river[ci]||F.slope[ci]>0.75) continue;
      let cm=floraCommAt(wx,wz,bi); if(!cm) continue;
      if(cm.low&&el>cm.low) cm=FLORA_COMM[bi][1];     // 맹그로브는 바닷가 낮은 늪에만 — 산 위 이탄지는 고사리 늪
      if(tr>=(cm.dense||1)) break;
      /* 얼룩 가장자리로 갈수록 성기다(군락 사이의 빈터) · 그 안에서도 잔 얼룩으로 뭉쳤다 풀렸다 한다 */
      const dens=clamp(_fp.edge/10,0.12,1)*(0.55+0.9*floraVal(wx,wz,11,43));
      for(const t of cm.far){ const pr=t[1]*dens; if(u<pr){ pick=t; break; } u-=pr; }
    }
    if(!pick) continue;
    const kind=pick[0], K=FLORA_KIND[kind], pad=(K.r||0)+0.5;
    if(floraHit(wx,wz,pad)||inLanding(wx,wz,pad)) continue;
    const gy=heightAt(wx,wz); if(floorAt(wx,wz)>gy+0.05) continue;
    const h2=floraHash(gx,gz,salt+1), v=(h2&1023)/1023, sc=pick[2]+(pick[3]-pick[2])*v, tl=0.05, yaw=((h2>>>15)&1023)/1023*6.283;
    const sy=sc*(0.9+0.2*((h>>>28)&15)/15);
    _flE.set(((h2>>>10)&31)/31*tl-tl/2,yaw,((h2>>>25)&31)/31*tl-tl/2); _flQ.setFromEuler(_flE);
    { const gs=groundSlope(wx,wz,0.5); _flV.set(wx,gy-0.03-Math.min(1.2,((K.r||0.25)*sc*1.3+0.15)*Math.hypot(gs[0],gs[1])),wz); }   // 줄기 밑동을 비탈에 묻는다
    _flS.set(sc,sy,sc); _flM.compose(_flV,_flQ,_flS);
    const g=0.86+0.26*((h2>>>3)&15)/15, w=((h2>>>7)&15)/15;
    const p={i:U.P.length, k:kind, v:floraHash(gx,gz,salt+7)%U.m[kind].length, x:wx, y:gy, z:wz, s:sc, sy, yaw,
             m:Float32Array.from(_flM.elements), c:[g*(0.94+0.14*w),g,g*(0.92+0.08*(1-w))], pm:null,
             key:'F'+gx+','+gz+(tr?'#'+tr:''), r:(K.r||0)*sc, blk:false};
    U.P.push(p); U.kn[kind]=(U.kn[kind]||0)+1;
    const tk=Math.floor(wx/FL_TILE)+'|'+Math.floor(wz/FL_TILE);
    let t=tiles.get(tk); if(!t){ t={i:U.tl.length, cx:(Math.floor(wx/FL_TILE)+0.5)*FL_TILE, cz:(Math.floor(wz/FL_TILE)+0.5)*FL_TILE, r:FL_TILE*0.71+12, cy:0, ps:[], v:false}; tiles.set(tk,t); U.tl.push(t); }
    t.ps.push(p); lx=wx; lz=wz;
   }
  }
  for(const t of U.tl) t.cy=heightAt(t.cx,t.cz)+8;
}
/* 줄인 복제 — 기준 벌의 부품(SHP.merge 가 적어 둔 구간)에서 잎 판(정점 12 이하 · 그림 칸 잎~덩굴)은 몫 f 만 남겨 1/√f 배로 키우고,
   줄기·가지는 가장 큰 것의 절반 넘는 것은 다 두고 나머지는 큰 차례로 f 몫만 둔다(참나무 `bakeTreeGeo` 가 긴 가지만 남기는 것과 같다) */
function floraLodGeo(g,f){
  const R=g.userData.parts; if(!R||f>=1) return g;
  const P=g.attributes.position.array, Nn=g.attributes.normal.array, Cc=g.attributes.color.array, UV=g.attributes.uv?g.attributes.uv.array:null;
  const leafy=r=>r.n<=12&&r.cell>=FC.LEAF&&r.cell<=FC.VINE&&r.cell!==FC.BAMBOO;
  const keep=[], solid=[];
  /* 잎 판이 적은 나무(야자 — 큰 잎 여덟 남짓)는 솎으면 잎 두어 장만 남아 부서져 보였다(사용자 지적) — 잎 판이 스물넷은 남게 */
  let nLeafy=0; for(const r of R) if(leafy(r)) nLeafy++;
  const fl=Math.min(1,Math.max(f,24/Math.max(1,nLeafy)));
  R.forEach((r,i)=>{
    if(leafy(r)){ if((floraHash(i,r.n,57)%10000)/10000<fl) keep.push([r,1/Math.sqrt(fl)]); return; }
    let x0=1e9,y0=1e9,z0=1e9,x1=-1e9,y1=-1e9,z1=-1e9;
    for(let j=r.o;j<r.o+r.n;j++){ const x=P[j*3],y=P[j*3+1],z=P[j*3+2]; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; if(z<z0)z0=z; if(z>z1)z1=z; }
    solid.push([r,Math.hypot(x1-x0,y1-y0,z1-z0)]);
  });
  solid.sort((a,b)=>b[1]-a[1]);
  const big=solid.length?solid[0][1]*0.5:0, rest=solid.filter(a=>a[1]<big);
  for(const a of solid) if(a[1]>=big) keep.push([a[0],1]);
  for(let i=0;i<Math.ceil(rest.length*f);i++) keep.push([rest[i][0],1]);
  let tot=0; for(const [r] of keep) tot+=r.n;
  const p2=new Float32Array(tot*3), n2=new Float32Array(tot*3), c2=new Float32Array(tot*3), u2=UV?new Float32Array(tot*2):null;
  let o=0;
  for(const [r,k] of keep){
    for(let j=r.o;j<r.o+r.n;j++,o++){
      p2[o*3]=r.x+(P[j*3]-r.x)*k; p2[o*3+1]=r.y+(P[j*3+1]-r.y)*k; p2[o*3+2]=r.z+(P[j*3+2]-r.z)*k;
      n2[o*3]=Nn[j*3]; n2[o*3+1]=Nn[j*3+1]; n2[o*3+2]=Nn[j*3+2];
      c2[o*3]=Cc[j*3]; c2[o*3+1]=Cc[j*3+1]; c2[o*3+2]=Cc[j*3+2];
      if(u2){ u2[o*2]=UV[j*2]; u2[o*2+1]=UV[j*2+1]; }
    }
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(p2,3)); out.setAttribute('normal',new THREE.BufferAttribute(n2,3));
  out.setAttribute('color',new THREE.BufferAttribute(c2,3)); if(u2) out.setAttribute('uv',new THREE.BufferAttribute(u2,2));
  out.computeBoundingSphere(); out.userData.lod=1;
  return out;
}
/* 기준 그루를 옆에서 찍은 그림 — 참나무 `bakeTreeImpostor` 와 같다(정투영 · 고른 빛 · 알파는 잎·줄기 자리만) */
function floraBakePic(g){
  if(!renderer) return null;
  g.computeBoundingBox(); const b=g.boundingBox;
  const hw=Math.max(-b.min.x,b.max.x,-b.min.z,b.max.z)+0.1, y0=Math.max(0,b.min.y), y1=b.max.y+0.1;
  const wide=2*hw>(y1-y0), W=wide?512:256, H=wide?256:512;
  const mat=new THREE.MeshLambertMaterial({map:FLORA.tex,alphaTest:0.4,vertexColors:true,side:THREE.DoubleSide});
  const sc0=new THREE.Scene(); sc0.add(new THREE.Mesh(g,mat));
  sc0.add(new THREE.AmbientLight(0xffffff,0.72));
  const dl=new THREE.DirectionalLight(0xffffff,0.45); dl.position.set(0.3,1,0.6); sc0.add(dl);
  const cam=new THREE.OrthographicCamera(-hw,hw,y1,y0,-100,100); cam.position.set(0,0,30); cam.lookAt(0,0,0); cam.updateMatrixWorld();
  const rt=new THREE.WebGLRenderTarget(W,H,{format:THREE.RGBAFormat,depthBuffer:true});
  rt.texture.generateMipmaps=true; rt.texture.minFilter=THREE.LinearMipmapLinearFilter;
  const oc=renderer.getClearColor(new THREE.Color()), oa=renderer.getClearAlpha(), ot=renderer.getRenderTarget(), osh=renderer.shadowMap.enabled;
  renderer.shadowMap.enabled=false;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x2c3a22,0); renderer.clear(true,true,true);
  renderer.render(sc0,cam);
  renderer.setRenderTarget(ot); renderer.setClearColor(oc,oa); renderer.shadowMap.enabled=osh;
  mat.dispose();
  return {tex:rt.texture, rt, can:{y0, y1, w:2*hw}};
}
/* 기준 그루 · 줄인 복제 · 그림 · 단계마다 메시 — 섬 전체를 깐 바로 뒤에 한 번 */
function floraFarBuild(){
  const U=FLORA, px=PL.pos.x, pz=PL.pos.z;
  floraPlantAll();
  U.fm={};
  for(const k of U.far.kinds){
    if(!U.kn[k]) continue;
    let best=null, bd=Infinity;
    for(const p of U.P) if(p.k===k){ const d=(p.x-px)**2+(p.z-pz)**2; if(d<bd){ bd=d; best=p; } }
    U.ref[k]=best.v;
    const base=U.m[k][best.v].geometry, n=U.kn[k], nv=U.m[k].length, cnt=new Array(nv).fill(0);
    for(const p of U.P) if(p.k===k) cnt[p.v]++;
    const mk=(geo,mat,cast,cap)=>{ const im=new THREE.InstancedMesh(geo,mat,Math.max(1,cap||n));
      if(mat===FLORA.mat||mat===FLORA.matL) im.setColorAt(0,new THREE.Color(1,1,1));          // 색 버퍼는 count 가 가득일 때 만든다
      im.count=0; im.visible=false; im.frustumCulled=false;
      if(cast) im.customDepthMaterial=FLORA.depth; else im.userData.lightRole='recv';   // 55 m 밖은 그림자를 안 드리운다
      im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im); return im; };
    const lods=[FL_LOD[0][1],FL_LOD[1][1],0.12].map((f,i)=>U.m[k].map((m,v)=>cnt[v]?mk(floraLodGeo(m.geometry,f),FLORA.matL,i===0,cnt[v]):null));   // [단계][벌] · 먼 단계 재질(matL — 녹아들기 없음)
    const pic=floraBakePic(base);
    let pm=null;
    if(pic){ pm=mk(SHP.card(1,1),new THREE.MeshLambertMaterial({map:pic.tex,alphaTest:0.35,side:THREE.DoubleSide}),false); }
    U.fm[k]={lods,pic,pm};
  }
  U.far.cx=1e9; U.sig=null; U.csig=null;
}
function floraFarDrop(){
  const U=FLORA; if(!U.fm){ U.P=null; return; }
  for(const k in U.fm){ const f=U.fm[k];
    for(const L of f.lods) for(const im of L){ if(!im) continue; scene.remove(im); if(im.geometry.userData.lod) im.geometry.dispose(); im.dispose(); }
    if(f.pm){ scene.remove(f.pm); f.pm.geometry.dispose(); f.pm.material.dispose(); f.pm.dispose(); }
    if(f.pic) f.pic.rt.dispose(); }
  U.fm=null; U.P=null; U.tl=null;
}
function floraFar(force){
  const U=FLORA, L=U.far;
  if(!U.P) floraFarBuild();
  const px=PL.pos.x, pz=PL.pos.z, mv=(px-L.cx)**2+(pz-L.cz)**2>=FL_STEP*FL_STEP;
  if(L.cx===1e9) force=true;
  camera.updateMatrixWorld(); _ffPM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse); _ffFr.setFromProjectionMatrix(_ffPM);
  occTick();
  let sig=0;
  for(const t of U.tl){
    const d=Math.hypot(t.cx-px,t.cz-pz)-t.r;
    let v=d<=VIEW_DIST;
    if(v&&d>CULL_NEAR){ _ffSp.center.set(t.cx,t.cy,t.cz); _ffSp.radius=t.r+30; v=_ffFr.intersectsSphere(_ffSp)&&!tileOcc(t,26); }   // 산 너머는 거른다(30-props.js)
    t.v=v; if(v) sig=(sig*31+t.i+1)|0;
  }
  if(!force&&!mv&&sig===U.sig) return;
  U.sig=sig;
  /* 사람이 움직였으면 — 60 m 안 그루의 막힘(그 뒤 지은 바닥·설비)·몸 원·딸 것을 다시 센다 */
  if(force||mv){
    L.cx=px; L.cz=pz; L.cols.length=0; L.picks.length=0;
    for(const t of U.tl){ if(Math.hypot(t.cx-px,t.cz-pz)-t.r>FL_NEAR) continue;
      for(const p of t.ps){ const dx=p.x-px, dz=p.z-pz; if(dx*dx+dz*dz>FL_NEAR*FL_NEAR) continue;
        const K=FLORA_KIND[p.k], pad=(K.r||0)+0.5;
        p.blk=floraHit(p.x,p.z,pad)||floorAt(p.x,p.z)>p.y+0.05;
        if(p.blk) continue;
        if(K.r) L.cols.push({x:p.x,z:p.z,r:p.r});
        if(K.pick){ const P=FLORA_PICK[K.pick];
          if(P.hide){ const tk=U.taken.get(p.key); if(tk!==undefined&&gameHours-tk<P.regrow) continue; }
          L.picks.push({kind:K.pick,x:p.x,y:p.y,z:p.z,key:p.key,r:(K.r||0.12)*p.s,tree:!P.hide&&!P.low,ay:P.low?p.y+P.low*p.s:p.y+0.06}); }
      } }
  }
  for(const k of L.kinds){ for(const im of U.m[k]) im.count=0; const f=U.fm[k]; if(f){ for(const Lv of f.lods) for(const im of Lv) if(im) im.count=0; if(f.pm) f.pm.count=0; } }
  const put=(im,p)=>{ const i=im.count++; im.instanceMatrix.array.set(p.m,i*16); const c=im.instanceColor.array; c[i*3]=p.c[0]; c[i*3+1]=p.c[1]; c[i*3+2]=p.c[2]; };
  let csig=0; const QK=QUAL.k;
  for(const t of U.tl){ if(!t.v) continue;
    for(const p of t.ps){ if(p.blk) continue;
      const dx=p.x-px, dz=p.z-pz, d=Math.sqrt(dx*dx+dz*dz); if(d>VIEW_DIST) continue;
      const f=U.fm[p.k];
      const full=d<=FL_FULL*Math.max(QK,0.75), fm=full&&U.m[p.k][p.v];
      if(full&&fm.count<fm.instanceMatrix.count){ put(fm,p); csig=(csig*31+p.i)|0; }   // 칸이 차면 줄인 첫 단계로 넘긴다(그루가 빠지지 않게)
      else if(d<=FL_PIC*QK){ const lv=d<=FL_LOD[0][0]*QK?0:d<=FL_LOD[1][0]*QK?1:2, im=f.lods[lv][p.v]; if(im&&im.count<im.instanceMatrix.count){ put(im,p); if(!lv) csig=(csig*31+p.i)|0; } }   // 자동 품질(QUAL.k)이 단계를 당긴다
      else if(f.pm){
        if(!p.pm){ const c=f.pic.can; _flE.set(0,p.yaw,0); _flQ.setFromEuler(_flE); _flV.set(p.x,p.y+c.y0*p.sy,p.z); _flS.set(c.w*p.s,(c.y1-c.y0)*p.sy,c.w*p.s);
          _flM.compose(_flV,_flQ,_flS); p.pm=Float32Array.from(_flM.elements); }
        f.pm.instanceMatrix.array.set(p.pm,(f.pm.count++)*16);
      }
    } }
  for(const k of L.kinds){
    const fin=im=>{ im.visible=im.count>0; instUp(im); };
    U.m[k].forEach(fin); const f=U.fm[k]; if(f){ for(const Lv of f.lods) for(const im of Lv) if(im) fin(im); if(f.pm) fin(f.pm); } }
  if(csig!==U.csig){ U.csig=csig; LIGHT.dirtyAt(px,pz,FL_LOD[0][0]); }   // 그림자를 드리우는 것(55 m 안)이 바뀌었다
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
  FLORA.taken.clear(); FLORA.look=null; FLORA.ref={};   // 기준 벌은 섬마다 새로(가장 가까운 그루)
  floraFarDrop();                                       // 섬 전체 나무 목록 · 줄인 복제 · 그림은 다음 updateFlora 가 새로 짓는다
}

/* ── 얻기 ────────────────────────────────────────────────────────────────── */
/* 눈앞의 딸 것 — 나무는 줄기에서 1.7 m 안에서 그쪽을 보고 있을 때, 버섯·덤불은 눈에서 2.2 m(+덤불 반지름) 안에서 겨눈 것.
   여럿이면 가깝고 겨눈 쪽에 가까운 것(거리 × (2 − 겨눈 cos)) — 덤불 옆 버섯을 내려다보면 버섯이다 */
function floraFindLook(){
  FLORA.look=null;
  if(uiOpen()||PL.dead||PL.swim) return;
  const e0=equippedTool(), W0=e0&&ITEMS[e0.id].tool, sharpHand=!!(W0&&(W0.weapon&&!W0.gun||W0.axe));   // 칼·도끼를 든 채로도 노거수 껍질·송진은 벗긴다
  const hand=floraHandOK(); if(!hand&&!sharpHand) return;
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z, cp=Math.cos(PL.pitch);
  const fx=-Math.sin(PL.yaw)*cp, fy=Math.sin(PL.pitch), fz=-Math.cos(PL.yaw)*cp, hx=-Math.sin(PL.yaw), hz=-Math.cos(PL.yaw);
  let bd=1e9;
  if(hand){
  for(const list of [FLORA.far.picks,FLORA.near.picks,RUBBLE.picks,WILD.picks,UNDER.picks]) for(const p of list){
    const dx=p.x-ex, dz=p.z-ez;
    if(p.tree){
      const d=Math.sqrt(dx*dx+dz*dz); if(d>p.r+1.7||d<1e-3) continue;
      const c=(dx*hx+dz*hz)/d; if(c<0.75) continue;
      const sc=d*(2-c); if(sc<bd){ bd=sc; FLORA.look=p; }
    }else{                                             // 낮은 것(고사리·꽃·버섯·덤불·돌) — **조준선이 그 포기를 지나야** 한다(사용자 요청 — 예전엔 ±37° 원뿔이라 빈 모래를 봐도 '풀 뜯기' 가 떴다)
      const ay=p.ay!==undefined?p.ay:p.y+0.06, dy=ay-ey, d=Math.sqrt(dx*dx+dy*dy+dz*dz); if(d>2.2+(ay>p.y+0.1?p.r:0)||d<0.05) continue;   // 덤불은 몸 반지름만큼 더
      const t=dx*fx+dy*fy+dz*fz; if(t<0.1) continue;
      const qx=dx-fx*t, qy=dy-fy*t, qz=dz-fz*t, rr=Math.max(0.10,(p.r||0.12)*1.05);
      if(qx*qx+qy*qy+qz*qz>rr*rr) continue;
      const sc=t; if(sc<bd){ bd=sc; FLORA.look=p; }
    }
  }
  }
  /* 노거수 — 줄기 곁에 서서 줄기를 볼 때(더 가까운 것이 없으면) */
  if(!FLORA.look){ const g=giantNear(ex,ez,9);
    if(g){ const dx=g.x-ex, dz=g.z-ez, d=Math.sqrt(dx*dx+dz*dz);
      if(d<g.col.r+1.9&&(dx*hx+dz*hz)/d>0.75){
        if(!g._pick) g._pick={kind:g.v===2?'gresin':'gbark',x:g.x,y:g.y,z:g.z,key:'G'+g.gx+','+g.gz,r:g.col.r,tree:true};
        FLORA.look=g._pick; } } }
}
/* 손이 비었거나 든 것이 무기·도끼·곡괭이·그물이 아닐 때만 딴다 — 싸우거나 캐는 중에 좌클릭을 가로채지 않는다 */
function floraHandOK(){
  const e=equippedTool(), W=e&&ITEMS[e.id].tool;
  return !(W&&(W.weapon||W.gun||W.net||W.axe||W.pick||W.throw||W.harpoon||W.sling||W.bugnet));
}
/* 아직 다시 안 났으면 남은 시간(게임 시간), 딸 수 있으면 0 */
function floraWait(p){
  const t=FLORA.taken.get(p.key); if(t===undefined) return 0;
  const left=FLORA_PICK[p.kind].regrow-(gameHours-t);
  if(left<=0){ FLORA.taken.delete(p.key); return 0; }
  return left;
}
/* 날붙이를 지녔나 — 대나무 베기 · 굴 떼어 내기 */
function hasSharp(){
  return INV.slots.some(s=>{ const t=ITEMS[s.id], w=t.tool||{}; return (t.tags&&t.tags.indexOf('sharp')>=0)||w.weapon||w.axe||w.harpoon; });
}
/* 못 따는 까닭(없으면 null) */
function floraBlock(p){
  const D=FLORA_PICK[p.kind], left=floraWait(p);
  if(left>0) return D.n+' — 아직 다시 나지 않았다(약 '+Math.ceil(left)+'시간 뒤)';
  if(D.need==='pick'&&!INV.slots.some(s=>(ITEMS[s.id].tool||{}).pick)) return D.n+' — 곡괭이로 캐야 한다(뗀석기 곡괭이면 된다)';
  if(D.need==='sharp'&&!hasSharp()) return D.n+' — 맨손으로는 못 벤다. 날붙이(주먹도끼·칼·도끼)를 지녀야 한다';
  if(D.take&&countId(D.take)<1) return D.n+' — 담을 '+ITEMS[D.take].n+'가 있어야 한다';
  return null;
}
/* 좌클릭을 누른 순간 — 따는 것은 누르고 있는 동안 updateGather 가 한다(진행 막대). 여기선 막혔으면 까닭만 알린다.
   딸 것을 보고 있으면 true(손의 것을 쓰지 않는다) */
function floraPick(){
  const p=FLORA.look; if(!p) return false;
  const why=floraBlock(p); if(why) toast(why);
  return true;
}
/* 막대가 다 찼다 — 얻는 수는 cnt 안에서 무작위 · extra 는 저마다 제 확률로 딸려 나온다 */
function floraTake(p){
  const D=FLORA_PICK[p.kind], n=D.cnt[0]+((Math.random()*(D.cnt[1]-D.cnt[0]+1))|0);
  let got=0; for(let i=0;i<n;i++) if(invAdd(D.item,1)) got++;
  if(!got){ toast('무거워서 더 못 든다'); return false; }
  let msg=ITEMS[D.item].n+' +'+got;
  if(D.extra) for(const [id,pr] of D.extra) if(Math.random()<pr&&invAdd(id,1)) msg+=' · '+ITEMS[id].n+' +1';
  FLORA.taken.set(p.key,gameHours); FLORA.look=null;
  if(D.take){ const i=INV.slots.findIndex(sl=>sl.id===D.take&&sl.dur===undefined); if(i>=0) invRemove(i,1); }        // 그릇 하나에 담았다
  if(D.sting){ const e=equippedTool(); if(!(e&&e.lit)){ hurtPL(D.sting,'벌에 쏘였다'); msg+=' — 벌에 쏘였다(불 붙인 횃불을 들고 따면 연기에 벌이 물러난다)'; } }
  if(D.hide){ FLORA.near.cx=1e9; FLORA.far.cx=1e9; RUBBLE.cx=1e9; }   // 버섯·꽃·돌은 그 자리가 빈다 — 다음 프레임에 다시 깐다
  toast(msg); sfx('bind'); invDirty=true;
  return true;
}

/* ── 누르고 있는 동안 따기 ──────────────────────────────────────────────────
   덩굴·대나무·열매·버섯·덤불(FLORA_PICK)과 조개·굴·성게(SEA_PICK, 96-sea.js)는 예전엔 누르는 순간 바로 들어왔다 —
   캐기(HARV)처럼 좌클릭을 누르고 있는 동안 막대가 차고(dur 초 · 기력 stam/초) 다 차면 딴다. 계속 누르고 있으면
   다음 것으로 넘어간다. 눈을 돌리면 처음부터, 손을 떼면 막대가 천천히 줄어든다(다시 누르면 이어서). */
const GATHER={p:null, t:0, dur:1, on:false};
/* 지금 좌클릭이 딸 것 — useHeld 와 같은 차례(바다 → 캐기가 먼저 → 식생 · 작살로 물고기를 겨눴거나 총을 들면 안 딴다) */
function gatherLook(){
  const e=equippedTool(), T=e&&ITEMS[e.id], W=(T&&T.tool)||{};
  if(SEA.look&&!(FISH.look&&W.harpoon)) return SEA.look;
  if(harvestByUse()) return null;
  if(FLORA.look&&!W.gun) return FLORA.look;
  return null;
}
function updateGather(dt){
  const p=gatherLook();
  if(p!==GATHER.p&&!(p&&GATHER.p&&p.key!==undefined&&p.key===GATHER.p.key)){ GATHER.p=p; GATHER.t=0; }   // 다른 것으로 눈을 돌렸다 — 처음부터(같은 포기를 새 겹이 다시 만든 것이면 이어서)
  else if(p) GATHER.p=p;
  GATHER.on=false;
  if(!p) return;
  const sea=p===SEA.look, D=sea?SEA_PICK[p.kind]:FLORA_PICK[p.kind];
  GATHER.dur=D.dur||1;
  const go=useDown&&!BUILD.on&&!facing()&&!PL.dead&&PL.stam>=2&&!(sea?seaBlock(p):floraBlock(p));
  if(!go){ GATHER.t=Math.max(0,GATHER.t-dt*2.5); return; }
  GATHER.on=true; GATHER.t+=dt;
  PL.stam=clamp(PL.stam-(D.stam||2)*dt,0,100);
  if(GATHER.t<GATHER.dur) return;
  GATHER.t=0; GATHER.p=null;
  if(sea) seaTake(p); else floraTake(p);
}
