/* 96-reef.js — CASTAWAY
   바다 생물 마흔(사용자 요청) — 헤엄치는 것 21 · 바닥에 사는 것 14 · 떠다니는 것 5 · 그 쓰임
   (island_world.html 이 이 차례로 읽는다 — 96-sea.js 다음 · 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   바다 생물 마흔
   ----------------------------------------------------------------------------
   ① **헤엄치는 것 21** — 물고기 표(FISH_SP · 96-sea.js)에 보탠다. 생김새는 같은 방추형 몸(fishGeo)을 종마다 늘이고 납작하게(가오리는
      두께가 길이보다 넓다) · 빛깔 셋과 무늬로 짓고, 사는 데(산호밭 · 모래 바닥 · 얕은 바다 · 먼바다)·떼 크기·빠르기는 표가 정한다.
      작살로 찌르거나(등급) 그물(잔고기만) · 낚싯대(큰 고기)로 잡는다. 상어는 이빨을, 쏠배감펭은 독가시를 덤으로 준다.
   ② **바닥에 사는 것 14** — 산호밭 · 모래 바닥 · 얕은 물가 바위에 해시로 흩는다(96-sea.js 의 바다 바닥과 같은 방식 — 사람 둘레 40 m).
      눈앞(조준선)에서 좌클릭으로 줍는다 · 주운 자리는 이틀 뒤 다시 난다(SEA.taken — 저장된다).
   ③ **떠다니는 것 5** — 해파리(맨손으로 건드리면 쏘인다 · 곁을 지나도) · 문어(바닥을 기며 빛깔이 바뀐다) · 오징어 떼 · 갑오징어 · 바다거북(잡지 않는다).
   ④ 쓰임 — 거의 다 먹을 것(날것 · 구운 것 — 모닥불 FIRING), 그리고 상어 이빨 칼 · 등딱지 방패 · 해면 붕대 · 오징어뼈 석회 · 먹물 풀 · 진주.
   ========================================================================== */
/* ── ① 헤엄치는 것 ── */
const REEF_FISH=[
  {id:'moray',     n:'곰치',      zone:'reef', len:1.30,tall:0.10,thick:0.09, c:[0x3a4a2a,0x6a7a3a,0x1a2a12], pat:'spots', school:[1,1], v:1.0, hp:30, tier:2, drop:['moray',1], shy:2.6, cap:3, low:1},
  {id:'barracuda', n:'꼬치고기',  zone:'shelf',len:1.20,tall:0.14,thick:0.10, c:[0x6a7a8a,0xd8dce0,0x2a3a4a], pat:'bars',  school:[1,3], v:3.0, hp:35, tier:2, drop:['barracuda',2], shy:5.0, cap:5},
  {id:'grouper',   n:'능성어',    zone:'reef', len:0.90,tall:0.38,thick:0.26, c:[0x6a4a3a,0xb89a7a,0x3a2a1a], pat:'spots', school:[1,1], v:0.8, hp:40, tier:2, drop:['grouper',2], shy:2.6, cap:3},
  {id:'snapper',   n:'도미',      zone:'shelf',len:0.55,tall:0.40,thick:0.16, c:[0xc8504a,0xf0c0b0,0x8a2a2a], pat:'plain', school:[2,5], v:1.6, hp:16, tier:1, drop:['snapper',1], shy:3.6, cap:10},
  {id:'parrotfish',n:'비늘돔',    zone:'reef', len:0.50,tall:0.36,thick:0.18, c:[0x2aa088,0x5ad0b0,0xd85a8a], pat:'bars',  school:[1,3], v:1.0, hp:14, tier:1, drop:['parrotfish',1], shy:2.8, cap:8},
  {id:'butterfly', n:'나비고기',  zone:'reef', len:0.16,tall:0.90,thick:0.14, c:[0xf0e050,0xf8f0c0,0x1a1a1a], pat:'bands', school:[2,4], v:0.9, hp:6,  tier:1, drop:['butterfly',1], shy:2.4, cap:10, fin:1},
  {id:'bluetang',  n:'블루탱',    zone:'reef', len:0.25,tall:0.70,thick:0.16, c:[0x2a4ad0,0x5a8ae0,0xf0d030], pat:'plain', school:[2,5], v:1.1, hp:8,  tier:1, drop:['bluetang',1], shy:2.6, cap:10},
  {id:'triggerfish',n:'쥐치',     zone:'reef', len:0.40,tall:0.55,thick:0.18, c:[0x5a5a4a,0x9a9a7a,0xe0c040], pat:'spots', school:[1,2], v:0.9, hp:14, tier:1, drop:['triggerfish',1], shy:2.6, cap:6},
  {id:'lionfish',  n:'쏠배감펭',  zone:'reef', len:0.32,tall:0.45,thick:0.25, c:[0xb84a3a,0xf0e0d0,0x6a1a12], pat:'bars',  school:[1,1], v:0.5, hp:10, tier:1, drop:['lionfish',1], drop2:['venom_spine',2], shy:1.6, cap:4, fin:1},
  {id:'sardine',   n:'정어리',    zone:'shelf',len:0.20,tall:0.22,thick:0.14, c:[0x3a6a8a,0xe0e8ec,0x1a3a4a], pat:'spots', school:[10,16],v:2.4, hp:4,  tier:1, drop:['sardine',1], shy:4.0, cap:30},
  {id:'anchovy',   n:'멸치',      zone:'shelf',len:0.12,tall:0.18,thick:0.12, c:[0x6a8a9a,0xe8eef0,0x8aa0aa], pat:'plain', school:[14,22],v:2.6, hp:2,  tier:1, drop:['anchovy',2], shy:4.0, cap:40},
  {id:'herring',   n:'청어',      zone:'shelf',len:0.30,tall:0.24,thick:0.13, c:[0x2a5a7a,0xd8e0e6,0x1a3040], pat:'plain', school:[8,12], v:2.2, hp:6,  tier:1, drop:['herring',1], shy:4.0, cap:24},
  {id:'mullet',    n:'숭어',      zone:'sand', len:0.50,tall:0.22,thick:0.18, c:[0x5a6a6a,0xd0d4d0,0x3a4444], pat:'plain', school:[3,6], v:1.6, hp:12, tier:1, drop:['mullet',1], shy:3.0, cap:10},
  {id:'seabass',   n:'농어',      zone:'shelf',len:0.70,tall:0.26,thick:0.16, c:[0x5a6a5a,0xd8dcd4,0x2a3a2a], pat:'spots', school:[1,3], v:1.8, hp:22, tier:2, drop:['seabass',1], shy:3.6, cap:6},
  {id:'rockfish',  n:'우럭',      zone:'reef', len:0.40,tall:0.34,thick:0.22, c:[0x4a3a32,0x8a7a6a,0x2a201a], pat:'spots', school:[1,2], v:0.6, hp:14, tier:1, drop:['rockfish',1], shy:2.0, cap:6, low:1},
  {id:'yellowtail',n:'방어',      zone:'deep', len:1.00,tall:0.26,thick:0.17, c:[0x3a5a7a,0xe0e4e8,0xe8d040], pat:'plain', school:[3,6], v:3.2, hp:45, tier:2, drop:['yellowtail',2], shy:6.0, cap:8},
  {id:'flyingfish',n:'날치',      zone:'shelf',len:0.30,tall:0.18,thick:0.14, c:[0x2a4a8a,0xd8e0ea,0x4a6aaa], pat:'plain', school:[4,8], v:3.4, hp:5,  tier:1, drop:['flyingfish',1], shy:5.0, cap:14, fin:1},
  {id:'reefshark', n:'흑기흉상어',zone:'reef', len:1.80,tall:0.22,thick:0.20, c:[0x6a6e72,0xd8dadc,0x1a1a1a], pat:'plain', school:[1,1], v:2.2, hp:120,tier:3, drop:['shark_meat',3], drop2:['shark_tooth',3], shy:1.0, cap:2},
  {id:'stingray',  n:'노랑가오리',zone:'sand', len:1.00,tall:0.07,thick:1.10, c:[0x8a7a5a,0xe8e0d0,0x5a4a3a], pat:'spots', school:[1,1], v:0.7, hp:30, tier:2, drop:['stingray',2], shy:1.8, cap:3, low:1},
  {id:'manta',     n:'쥐가오리',  zone:'deep', len:2.60,tall:0.08,thick:1.60, c:[0x2a2a30,0xe8e8e8,0x0a0a0c], pat:'plain', school:[1,1], v:1.4, hp:150,tier:3, drop:['manta',4], shy:5.0, cap:1},
  {id:'sunfish',   n:'개복치',    zone:'deep', len:2.00,tall:1.10,thick:0.20, c:[0x8a8a90,0xd8d8dc,0x5a5a62], pat:'spots', school:[1,1], v:0.4, hp:80, tier:2, drop:['sunfish',4], shy:3.0, cap:1}
];
for(const s of REEF_FISH) FISH_SP.push(s);
/* 먹을 것 — 날것 · 구운 것(모닥불). [아이디, 이름, 무게, 날것 배부름, 구운 배부름, 설명] */
const REEF_FOOD=[
  ['moray','곰치',1.6,8,30,'바위틈에 숨어 사는 뱀 같은 물고기 — 이가 날카롭다'],['barracuda','꼬치고기',2.2,9,32,'날쌘 긴 물고기'],
  ['grouper','능성어',3.0,10,36,'산호밭의 큰 물고기 — 살이 희고 두툼하다'],['snapper','도미',0.9,8,28,'붉은 도미'],
  ['parrotfish','비늘돔',0.8,7,24,'산호를 갉아 먹는 앵무새 부리 물고기'],['butterfly','나비고기',0.12,2,6,'작고 납작한 노란 물고기'],
  ['bluetang','블루탱',0.25,3,9,'푸른 쥐돔'],['triggerfish','쥐치',0.6,6,20,'가죽이 질긴 물고기 — 벗기고 먹는다'],
  ['lionfish','쏠배감펭',0.4,5,18,'독가시를 세운 물고기 — 가시를 빼면 살은 맛있다'],['sardine','정어리',0.12,3,9,'떼 지어 다니는 작은 물고기'],
  ['anchovy','멸치',0.04,1,4,'아주 작은 물고기 — 말리면 오래간다'],['herring','청어',0.3,4,13,'기름진 등 푸른 물고기'],
  ['mullet','숭어',0.8,7,24,'모래 바닥을 훑는 물고기'],['seabass','농어',1.4,9,30,'얕은 바다의 큰 물고기'],
  ['rockfish','우럭',0.7,7,24,'바위에 붙어 사는 물고기'],['yellowtail','방어',3.2,10,38,'먼바다의 기름진 큰 물고기'],
  ['flyingfish','날치',0.3,4,12,'물 위로 날아오르는 물고기'],['shark_meat','상어 고기',2.5,8,30,'상어의 살 — 질기다'],
  ['stingray','가오리 살',1.2,7,26,'가오리 날개살 — 꼬리 가시를 조심'],['manta','쥐가오리 살',2.4,8,30,'커다란 쥐가오리의 살'],
  ['sunfish','개복치 살',2.6,8,28,'무른 흰 살'],
  ['crab','게',0.4,5,18,'바위·산호 틈의 게 — 집게를 조심'],['lobster','닭새우',0.9,8,30,'가시 돋친 큰 새우'],
  ['shrimp','새우',0.1,2,7,'작은 새우'],['sea_cucumber','해삼',0.3,4,12,'바닥을 기는 해삼 — 날로도 먹는다'],
  ['abalone','전복',0.3,6,20,'바위에 붙은 전복 — 껍데기 안쪽이 무지갯빛'],['conch','소라',0.6,6,20,'나선 껍데기의 큰 소라'],
  ['scallop','가리비',0.2,4,14,'부채 껍데기 조개'],['mussel','홍합',0.15,3,11,'바위에 무리 지어 붙은 검은 조개'],
  ['top_shell','고둥',0.08,2,7,'원뿔 껍데기의 작은 고둥'],['hermit_crab','소라게',0.08,1,5,'남의 껍데기를 지고 다니는 게'],
  ['giant_clam','대왕조개 살',2.0,10,34,'산호밭의 커다란 조개 — 가끔 진주가 든다'],
  ['octopus','문어',1.4,8,30,'바닥을 기는 문어 — 먹물을 뿜는다'],['squid','오징어',0.4,5,18,'떼 지어 다니는 오징어'],
  ['cuttlefish','갑오징어',0.8,6,22,'산호밭의 갑오징어 — 속에 오징어뼈가 있다'],['jellyfish','해파리',0.5,2,6,'말리면 쫄깃하다 — 맨손으로 만지면 쏘인다']
];
for(const [id,n,kg,f0,f1,use] of REEF_FOOD){
  if(!ITEMS[id]) ITEMS[id]={n,kg,c:0xb89a7a,use,food:f0,raw:true,fishy:1,tags:['fish']};
  const cid=id+'_cooked';
  if(!ITEMS[cid]) ITEMS[cid]={n:'구운 '+n.replace(/ 살$/,''),kg:kg*0.9,c:0xb08a62,use:'불에 익혔다',food:f1,fishy:1};
  if(!FIRING[id]) FIRING[id]={out:cid,hours:clamp(0.06+kg*0.06,0.08,0.35),count:1};
}
/* 날것은 사흘이면 상한다(66-decay.js 와 같은 규칙 — 그 파일이 먼저 읽혀 여기서 새로 보탠 것에 따로 매긴다) */
for(const [id] of REEF_FOOD){ const T=ITEMS[id]; if(T.raw&&T.fishy&&T.rot===undefined) T.rot=72; if(ITEMS[id+'_cooked']) ITEMS[id+'_cooked'].rot=0; }
/* 재료와 쓰임 */
Object.assign(ITEMS,{
  shark_tooth:{n:'상어 이빨',  kg:0.02, c:0xf0ece0, use:'톱니 날 — 칼날로 박는다(상어 이빨 칼)'},
  venom_spine:{n:'독가시',     kg:0.01, c:0x8a3a2a, use:'쏠배감펭의 가시 — 화살·창 끝에 바르면 독이 든다(아직 쓰는 데는 없다)'},
  turtle_shell:{n:'거북 등딱지',kg:2.4, c:0x6a5a3a, use:'바다 밑에 가라앉은 빈 등딱지 — 노끈으로 엮으면 방패가 된다'},
  sponge:     {n:'해면',       kg:0.1,  c:0xd8a84a, use:'물을 머금는 해면 — 섬유로 감싸 붕대를 만든다'},
  cuttlebone: {n:'오징어뼈',   kg:0.05, c:0xf2efe6, use:'갑오징어 속의 흰 뼈 — 구우면 석회'},
  ink:        {n:'먹물',       kg:0.05, c:0x141414, use:'문어·오징어 먹물 — 졸이면 끈끈한 풀이 된다'},
  pearl:      {n:'진주',       kg:0.01, c:0xf4f0ec, use:'대왕조개 속의 진주 — 귀하다'},
  barnacle:   {n:'따개비',     kg:0.05, c:0xc8c0b0, use:'바위에 붙은 따개비 — 구우면 석회 · 속살은 먹는다', food:2, raw:true},
  nudibranch: {n:'갯민숭달팽이',kg:0.02, c:0x8a3ad0, use:'빛깔 고운 바다 민달팽이 — 독이 있어 먹지 못한다'},
  shark_knife:{n:'상어 이빨 칼',kg:0.5, c:0xe0dcd0, use:'상어 이빨을 줄지어 박은 톱날 칼 — 베기',
               tool:{weapon:1, dmg:28, reach:1.5, rate:0.45, stam:5, swing:'slash'}, durMax:90},
  shell_shield:{n:'등딱지 방패',kg:2.8, c:0x6a5a3a, use:'거북 등딱지를 노끈으로 엮은 방패 — 등에 멘다',
               wear:{slot:'armor', armor:7, warm:0}},
  bandage_sponge:{n:'해면 붕대',kg:0.15, c:0xd8b86a, use:'해면을 섬유로 감쌌다 — 상처를 덮는다',
               heal:{hp:18, stam:10}}
});
FIRING.cuttlebone={out:'lime',hours:0.3,count:1}; FIRING.barnacle={out:'lime',hours:0.3,count:1};
RECIPES.push(
  {id:'shark_knife', tier:'뼈와 키틴', n:'상어 이빨 칼', out:{id:'shark_knife',n:1}, time:14, stam:8,
   note:'가지에 홈을 내 상어 이빨을 줄지어 박고 노끈으로 감는다. 톱날처럼 벤다.', in:[{id:'shark_tooth',n:3},{id:'branch',n:1},{id:'cord',n:2}]},
  {id:'shell_shield', tier:'뼈와 키틴', n:'등딱지 방패', out:{id:'shell_shield',n:1}, time:16, stam:8,
   note:'빈 거북 등딱지에 구멍을 뚫어 노끈으로 멜빵을 단다.', in:[{id:'turtle_shell',n:1},{id:'cord',n:4}]},
  {id:'bandage_sponge', tier:'바다와 살림', n:'해면 붕대', out:{id:'bandage_sponge',n:1}, time:6, stam:3,
   note:'말린 해면을 섬유로 감싼다 — 피를 머금는다.', in:[{id:'sponge',n:2},{id:'fiber',n:4}]},
  {id:'ink_glue', tier:'바다와 살림', n:'먹물 풀', out:{id:'glue',n:1}, time:10, stam:3, station:'fire',
   note:'먹물을 졸이면 끈끈한 풀이 된다(송진 풀 대신).', in:[{id:'ink',n:3}]}
);
/* ── ② 바닥에 사는 것 ── */
Object.assign(SEA_PICK,{
  crab       :{item:'crab',        n:'게',          verb:'잡기',     dur:0.8, stam:2, prick:3},
  lobster    :{item:'lobster',     n:'닭새우',      verb:'잡기',     dur:1.0, stam:3, prick:2},
  cucumber   :{item:'sea_cucumber',n:'해삼',        verb:'줍기',     dur:0.6, stam:1},
  abalone    :{item:'abalone',     n:'전복',        verb:'떼어 내기',dur:1.6, stam:4, need:'sharp'},
  conch      :{item:'conch',       n:'소라',        verb:'줍기',     dur:0.6, stam:1},
  scallop    :{item:'scallop',     n:'가리비',      verb:'줍기',     dur:0.6, stam:1},
  mussel     :{item:'mussel',      n:'홍합',        verb:'떼어 내기',dur:1.0, stam:2, cnt:3},
  topshell   :{item:'top_shell',   n:'고둥',        verb:'줍기',     dur:0.5, stam:1, cnt:2},
  hermit     :{item:'hermit_crab', n:'소라게',      verb:'줍기',     dur:0.5, stam:1},
  sponge     :{item:'sponge',      n:'해면',        verb:'뜯기',     dur:1.0, stam:2},
  nudi       :{item:'nudibranch',  n:'갯민숭달팽이',verb:'줍기',     dur:0.5, stam:1},
  barnacle   :{item:'barnacle',    n:'따개비',      verb:'긁어내기', dur:1.2, stam:3, need:'sharp', cnt:3},
  gclam      :{item:'giant_clam',  n:'대왕조개',    verb:'열기',     dur:2.2, stam:6, need:'sharp'},
  bluestar   :{item:'starfish',    n:'푸른 불가사리',verb:'줍기',    dur:0.6, stam:1.5},
  shell      :{item:'turtle_shell',n:'빈 거북 등딱지',verb:'줍기',   dur:1.0, stam:3},
  /* ③ 떠다니는 것 — 해파리는 맨손이면 쏘인다 · 문어는 먹물도 준다 */
  jelly      :{item:'jellyfish',   n:'해파리',      verb:'떠내기',   dur:0.8, stam:1, prick:4},
  octopus    :{item:'octopus',     n:'문어',        verb:'잡기',     dur:1.4, stam:4},
  squid      :{item:'squid',       n:'오징어',      verb:'잡기',     dur:0.8, stam:2},
  cuttle     :{item:'cuttlefish',  n:'갑오징어',    verb:'잡기',     dur:1.0, stam:3}
});
const REEF={m:null, cx:1e9, cz:1e9, R:40, cell:3.0, drift:[], picks:[], t:0, sting:0};
/* 생김새 — 매끈한 덩이·대롱·자루(24-shapes.js)를 이어 붙이고 정점 색으로 칠한다 */
function reefBuildMeshes(){
  const L=(o,d,len,r0,r1,b)=>SHP.limb(o,d,len,r0,r1,3,5,b||0,0.9), B=(r,s,o)=>SHP.blob(r,s,o);
  const legs=(n,len,r,c,y)=>{ const P=[]; for(let i=0;i<n;i++){ const s=i<n/2?1:-1, k=i%(n/2), a=(k/(n/2-1||1)-0.5)*1.4;
      P.push({g:L([s*0.05,y,a*0.06],[s*Math.cos(a)*0.9,-0.35,Math.sin(a)*0.9],len,r,r*0.6,0.15),c}); } return P; };
  const G={
    crab:SHP.merge([{g:B(0.09,3,{w:12,h:7,amp:0.12,sx:1.35,sy:0.45}),y:0.06,c:[0.78,0.28,0.16],c2:[0.92,0.45,0.25]},
      ...legs(6,0.11,0.012,[0.7,0.26,0.15],0.05),{g:B(0.035,4,{w:8,h:5,amp:0.1,sx:1.4}),x:0.06,y:0.06,z:0.12,c:[0.85,0.32,0.18]},{g:B(0.035,5,{w:8,h:5,amp:0.1,sx:1.4}),x:-0.06,y:0.06,z:0.12,c:[0.85,0.32,0.18]}]),
    lobster:SHP.merge([{g:L([0,0.05,-0.18],[0,0,1],0.36,0.05,0.035,0),c:[0.45,0.18,0.12],c2:[0.70,0.35,0.20]},
      {g:L([0.02,0.07,0.15],[0.35,0.2,1],0.42,0.006,0.003,0.1),c:[0.6,0.4,0.25]},{g:L([-0.02,0.07,0.15],[-0.35,0.2,1],0.42,0.006,0.003,0.1),c:[0.6,0.4,0.25]},...legs(8,0.10,0.008,[0.5,0.25,0.15],0.04)]),
    cucumber:SHP.merge([{g:B(0.05,6,{w:12,h:7,amp:0.28,nb:8,freq:9,sx:3.4,sy:0.8}),y:0.035,c:[0.20,0.14,0.10],c2:[0.32,0.24,0.16]}]),
    abalone:SHP.merge([{g:B(0.07,7,{w:12,h:7,amp:0.14,sx:1.35,sy:0.35}),y:0.02,c:[0.36,0.40,0.30],c2:[0.52,0.48,0.38]}]),
    conch:SHP.merge([{g:SHP.lathe([[0.002,0.22],[0.03,0.17],[0.07,0.11],[0.10,0.05],[0.06,0.0],[0.0,-0.02]],10),rx:1.25,y:0.07,c:[0.86,0.66,0.52],c2:[0.96,0.84,0.74]}]),
    scallop:SHP.merge([{g:SHP.grid(10,4,(u,v)=>{ const a=0.3+u*2.55, r=(0.02+0.10*v); return [Math.cos(a)*r,0.02*Math.sin(u*31.4)*v+0.01*v,Math.sin(a)*r]; }),y:0.02,c:[0.86,0.42,0.22],c2:[0.95,0.66,0.36]}],false),
    mussel:SHP.merge([0,1,2,3].map(i=>({g:B(0.035,8+i,{w:8,h:6,amp:0.1,sx:2.2,sy:0.7}),x:Math.cos(i*1.7)*0.05,y:0.025,z:Math.sin(i*1.7)*0.05,ry:i*0.9,c:[0.08,0.09,0.14],c2:[0.18,0.20,0.28]}))),
    topshell:SHP.merge([{g:SHP.lathe([[0.0,0.09],[0.02,0.07],[0.045,0.03],[0.05,0.0],[0.0,0.0]],9),c:[0.42,0.30,0.20],c2:[0.70,0.58,0.40]}]),
    hermit:SHP.merge([{g:SHP.lathe([[0.0,0.08],[0.02,0.06],[0.04,0.02],[0.045,0.0],[0.0,0.0]],9),rx:1.4,y:0.04,c:[0.80,0.70,0.56]},...legs(4,0.05,0.008,[0.85,0.30,0.20],0.02)]),
    sponge:SHP.merge([{g:SHP.lathe([[0.10,0.0],[0.14,0.12],[0.16,0.30],[0.13,0.32],[0.09,0.18]],12),c:[0.80,0.52,0.18],c2:[0.95,0.70,0.30]}],false),
    nudi:SHP.merge([{g:B(0.025,9,{w:10,h:6,amp:0.15,sx:2.6,sy:0.6}),y:0.015,c:[0.48,0.18,0.72],c2:[0.95,0.55,0.18]}]),
    barnacle:SHP.merge([0,1,2,3,4,5].map(i=>({g:SHP.lathe([[0.022,0],[0.018,0.025],[0.008,0.028],[0.006,0.02]],7),x:Math.cos(i*2.4)*0.05*(i%3),z:Math.sin(i*2.4)*0.05*(i%3),c:[0.70,0.68,0.62],c2:[0.88,0.86,0.80]}))),
    gclam:SHP.merge([{g:B(0.30,10,{w:16,h:8,amp:0.10,sx:1.4,sy:0.45,base:0.1}),y:0.08,c:[0.62,0.60,0.54],c2:[0.80,0.78,0.72]},
      {g:B(0.20,11,{w:14,h:6,amp:0.08,sx:1.7,sy:0.18}),y:0.20,c:[0.10,0.28,0.62],c2:[0.30,0.62,0.86]}]),
    bluestar:SHP.merge([0,1,2,3,4].map(i=>({g:L([0,0.01,0],[Math.cos(i*1.2566),0,Math.sin(i*1.2566)],0.13,0.025,0.012,0),c:[0.12,0.30,0.78],c2:[0.22,0.48,0.92]}))),
    shell:SHP.merge([{g:B(0.38,12,{w:14,h:7,amp:0.08,sx:1.2,sy:0.42,base:0.05}),y:0.06,c:[0.34,0.26,0.16],c2:[0.52,0.42,0.26]}])
  };
  const mk=(g,cap)=>{ const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({vertexColors:true}),cap);
    const w=new THREE.Color(1,1,1); for(let i=0;i<cap;i++) im.setColorAt(i,w);
    im.count=0; im.frustumCulled=false; im.userData.lightRole='recv'; im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im); return im; };
  const M={}; for(const k in G) M[k]=mk(G[k],k==='gclam'||k==='shell'?20:90);
  /* 떠다니는 것 — 해파리(반투명 우산 + 촉수) · 문어 · 오징어 · 갑오징어 · 바다거북 */
  const jg=SHP.merge([{g:SHP.lathe([[0.0,0.16],[0.10,0.14],[0.16,0.06],[0.17,0.0],[0.12,0.02],[0.0,0.05]],14),c:[0.92,0.62,0.78],c2:[0.98,0.86,0.92]},
    ...[0,1,2,3,4,5,6,7].map(i=>({g:L([Math.cos(i*0.785)*0.11,0.0,Math.sin(i*0.785)*0.11],[0,-1,0],0.42+0.2*(i%3),0.008,0.003,0.06),c:[0.95,0.80,0.88]}))]);
  M.jelly=new THREE.InstancedMesh(jg,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:0.55,depthWrite:false,emissive:0x2a1822,side:THREE.DoubleSide}),24);
  const og=SHP.merge([{g:B(0.13,13,{w:12,h:8,amp:0.12,sy:1.2}),y:0.16,c:[0.55,0.22,0.16],c2:[0.75,0.40,0.28]},
    ...[0,1,2,3,4,5,6,7].map(i=>({g:L([Math.cos(i*0.785)*0.06,0.06,Math.sin(i*0.785)*0.06],[Math.cos(i*0.785),-0.25,Math.sin(i*0.785)],0.38,0.035,0.008,-0.12),c:[0.58,0.24,0.18]}))]);
  M.octopus=new THREE.InstancedMesh(og,new THREE.MeshLambertMaterial({vertexColors:true}),8);
  const sg=SHP.merge([{g:L([0,0,-0.2],[0,0,1],0.32,0.035,0.05,0),c:[0.86,0.76,0.70],c2:[0.95,0.88,0.84]},{g:SHP.grid(4,2,(u,v)=>[(u-0.5)*0.16,0,-0.2+v*0.07]),c:[0.9,0.8,0.75]},
    ...[0,1,2,3,4,5].map(i=>({g:L([Math.cos(i)*0.02,Math.sin(i)*0.02,0.12],[Math.cos(i)*0.15,Math.sin(i)*0.15,1],0.16,0.006,0.002,0),c:[0.88,0.70,0.66]}))]);
  M.squid=new THREE.InstancedMesh(sg,new THREE.MeshLambertMaterial({vertexColors:true}),24);
  const cg=SHP.merge([{g:B(0.12,14,{w:12,h:7,amp:0.06,sx:0.75,sz:1.5,sy:0.45}),c:[0.62,0.50,0.40],c2:[0.82,0.72,0.60]},
    ...[0,1,2,3,4,5].map(i=>({g:L([Math.cos(i)*0.02,Math.sin(i)*0.02,0.16],[Math.cos(i)*0.2,Math.sin(i)*0.2,1],0.10,0.007,0.002,0),c:[0.7,0.6,0.5]}))]);
  M.cuttle=new THREE.InstancedMesh(cg,new THREE.MeshLambertMaterial({vertexColors:true}),10);
  const tg=SHP.merge([{g:B(0.42,15,{w:16,h:9,amp:0.05,sx:1.0,sz:1.25,sy:0.38}),c:[0.30,0.26,0.14],c2:[0.48,0.40,0.22]},{g:B(0.12,16,{w:10,h:6,amp:0.04,sz:1.3}),z:0.55,y:0.02,c:[0.46,0.42,0.30]},
    ...[[1,1],[-1,1],[1,-1],[-1,-1]].map(([sx,sz])=>({g:B(0.13,17,{w:10,h:5,amp:0.03,sx:2.2,sy:0.18}),x:sx*0.42,z:sz*0.30,ry:sx*sz*0.5,c:[0.40,0.36,0.24]}))]);
  M.turtle=new THREE.InstancedMesh(tg,new THREE.MeshLambertMaterial({vertexColors:true}),4);
  for(const k of ['jelly','octopus','squid','cuttle','turtle']){ const im=M[k]; const w=new THREE.Color(1,1,1); for(let i=0;i<im.instanceMatrix.count;i++) im.setColorAt(i,w);
    im.count=0; im.frustumCulled=false; im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im); }
  REEF.m=M;
}
const _rfM=new THREE.Matrix4(), _rfQ=new THREE.Quaternion(), _rfE=new THREE.Euler(), _rfV=new THREE.Vector3(), _rfS=new THREE.Vector3();
/* 사람 둘레 40 m 의 바닥에 깐다 — 96-sea.js seaScatter 가 다시 깔 때 같이(그 picks 에 보탠다) */
function reefScatter(){
  if(!REEF.m) reefBuildMeshes();
  const M=REEF.m, px=PL.pos.x, pz=PL.pos.z, C=REEF.cell, R=REEF.R, cnt={};
  for(const k in M) cnt[k]=0;
  REEF.cx=px; REEF.cz=pz;
  const put=(k,x,y,z,s,yaw,tilt)=>{ const im=M[k]; if(cnt[k]>=im.instanceMatrix.count) return false;
    _rfE.set(tilt||0,yaw,0); _rfQ.setFromEuler(_rfE); _rfV.set(x,y,z); _rfS.set(s,s,s); _rfM.compose(_rfV,_rfQ,_rfS); im.setMatrixAt(cnt[k]++,_rfM); return true; };
  const x0=Math.floor((px-R)/C), x1=Math.floor((px+R)/C), z0=Math.floor((pz-R)/C), z1=Math.floor((pz+R)/C);
  for(let gz=z0;gz<=z1;gz++) for(let gx=x0;gx<=x1;gx++){
    const h=seaHash(gx,gz,71); if((h&1023)/1023>0.16) continue;      // 열 칸에 하나 남짓
    const wx=(gx+((h>>>10)&255)/255)*C, wz=(gz+((h>>>18)&255)/255)*C, d=Math.hypot(wx-px,wz-pz); if(d>R) continue;
    const dep=seaDepthAt(wx,wz); if(dep<0.35) continue;
    const key='R'+gx+','+gz, t=SEA.taken.get(key); if(t!==undefined){ if(gameHours-t<SEA_REGROW) continue; SEA.taken.delete(key); }
    const reef=seaIsReef(wx,wz,dep), u=((h>>>26)&63)/63, y=-dep, yaw=((h>>>4)&63)/63*6.283;
    const steep=Math.hypot(heightAt(wx+1,wz)-heightAt(wx-1,wz),heightAt(wx,wz+1)-heightAt(wx,wz-1))/2>0.6;
    let k;
    if(reef) k=u<0.18?'crab':u<0.30?'lobster':u<0.42?'cucumber':u<0.52?'nudi':u<0.60?'gclam':u<0.76?'sponge':u<0.88?'bluestar':'conch';
    else if(dep<3&&steep) k=u<0.30?'abalone':u<0.58?'mussel':u<0.80?'topshell':'barnacle';
    else if(dep<8) k=u<0.25?'conch':u<0.48?'scallop':u<0.66?'cucumber':u<0.84?'hermit':u<0.97?'crab':'shell';
    else k=u<0.5?'cucumber':u<0.9?'scallop':'shell';
    const s=k==='gclam'?0.8+0.6*u:k==='shell'?0.9+0.3*u:0.8+0.5*u;
    if(!put(k,wx,y,wz,s,yaw,k==='barnacle'||k==='abalone'?0.3:0)) continue;
    if(d<20) SEA.picks.push({kind:k,x:wx,y,z:wz,key,r:k==='gclam'?0.45:k==='shell'?0.42:k==='sponge'?0.24:0.18});
  }
  for(const k in cnt) if(!['jelly','octopus','squid','cuttle','turtle'].includes(k)){ M[k].count=cnt[k]; M[k].instanceMatrix.needsUpdate=true; }
  /* 떠다니는 것 — 그 둘레에 새로 푼다(주운 것은 이틀 동안 안 나온다) */
  REEF.drift.length=0;
  const spawn=(kind,n,ok,mk)=>{ for(let i=0,tries=0;i<n&&tries<n*6;tries++){ const a=Math.random()*6.283, r=8+Math.random()*30, x=px+Math.cos(a)*r, z=pz+Math.sin(a)*r, dep=seaDepthAt(x,z);
      if(!ok(x,z,dep)) continue; const key='D'+kind+Math.round(x/9)+','+Math.round(z/9); if(SEA.taken.has(key)&&gameHours-SEA.taken.get(key)<SEA_REGROW) continue;
      REEF.drift.push(Object.assign({kind,key,x,z,dep,y:-dep*0.5,ph:Math.random()*6.283,a:Math.random()*6.283},mk?mk(x,z,dep):{})); i++; } };
  spawn('jelly',10,(x,z,d)=>d>2.5);
  spawn('octopus',3,(x,z,d)=>seaIsReef(x,z,d));
  spawn('squid',14,(x,z,d)=>d>4&&d<15);
  spawn('cuttle',4,(x,z,d)=>seaIsReef(x,z,d));
  spawn('turtle',2,(x,z,d)=>d>3);
  for(const D of REEF.drift) if(D.kind!=='turtle') SEA.picks.push(D.pick={kind:D.kind,x:D.x,y:-D.dep,z:D.z,key:D.key,r:D.kind==='octopus'?0.35:0.25,live:D});
}
/* 프레임마다 — 떠다니는 것을 움직인다 · 해파리 곁을 지나면 쏘인다 */
function updateReef(dt){
  if(!REEF.m) return;
  REEF.t+=dt; const M=REEF.m, t=REEF.t, cnt={jelly:0,octopus:0,squid:0,cuttle:0,turtle:0};
  if(Math.hypot(PL.pos.x-REEF.cx,PL.pos.z-REEF.cz)>60){ for(const k in cnt){ M[k].count=0; } return; }
  for(const D of REEF.drift){
    if(D.gone) continue;
    if(SEA.taken.has(D.key)&&gameHours-SEA.taken.get(D.key)<SEA_REGROW){ D.gone=true; continue; }   // 주웠다
    let s=1, yaw=D.a, pitch=0;
    const floor=heightAt(D.x,D.z);
    if(D.kind==='jelly'){ D.x+=Math.sin(t*0.13+D.ph)*0.12*dt; D.z+=Math.cos(t*0.11+D.ph)*0.12*dt; D.y=Math.max(floor+0.8,Math.min(-0.4,-D.dep*0.45+Math.sin(t*0.4+D.ph)*0.6)); s=1+0.12*Math.sin(t*2.2+D.ph); }
    else if(D.kind==='octopus'){ D.a+=Math.sin(t*0.3+D.ph)*0.3*dt; D.x+=Math.cos(D.a)*0.15*dt; D.z+=Math.sin(D.a)*0.15*dt; D.y=floor+0.02; yaw=-D.a;
      M.octopus.setColorAt(cnt.octopus,new THREE.Color().setRGB(0.8+0.25*Math.sin(t*0.7+D.ph),0.7+0.2*Math.sin(t*0.5+D.ph*2),0.7)); }
    else if(D.kind==='squid'){ D.a+=0.15*dt*Math.sin(t*0.2+D.ph); D.x+=Math.cos(D.a)*0.9*dt; D.z+=Math.sin(D.a)*0.9*dt; D.y=Math.max(floor+1,-D.dep*0.5+Math.sin(t+D.ph)*0.3); yaw=-D.a+Math.PI/2;
      if(seaDepthAt(D.x,D.z)<2) D.a+=Math.PI*0.5; }
    else if(D.kind==='cuttle'){ D.a+=Math.sin(t*0.4+D.ph)*0.4*dt; D.x+=Math.cos(D.a)*0.25*dt; D.z+=Math.sin(D.a)*0.25*dt; D.y=floor+0.6+Math.sin(t*1.3+D.ph)*0.1; yaw=-D.a+Math.PI/2; }
    else if(D.kind==='turtle'){ D.a+=0.08*dt; D.x+=Math.cos(D.a)*0.7*dt; D.z+=Math.sin(D.a)*0.7*dt; D.y=Math.max(floor+1.2,Math.min(-0.8,-D.dep*0.5)); yaw=-D.a+Math.PI/2; pitch=Math.sin(t*0.8+D.ph)*0.08;
      if(seaDepthAt(D.x,D.z)<2.5) D.a+=Math.PI*0.6; }
    if(D.pick){ D.pick.x=D.x; D.pick.y=D.y; D.pick.z=D.z; }
    const im=M[D.kind]; if(cnt[D.kind]>=im.instanceMatrix.count) continue;
    _rfE.set(pitch,yaw,0); _rfQ.setFromEuler(_rfE); _rfV.set(D.x,D.y,D.z); _rfS.set(D.kind==='jelly'?1/s:1,s,D.kind==='jelly'?1/s:1); _rfM.compose(_rfV,_rfQ,_rfS); im.setMatrixAt(cnt[D.kind]++,_rfM);
    /* 해파리 — 0.8 m 안을 지나면 쏘인다(1.5초에 한 번) */
    if(D.kind==='jelly'&&!PL.dead&&!DEV.on&&REEF.sting<=0&&Math.hypot(D.x-PL.pos.x,D.z-PL.pos.z)<0.8&&Math.abs(D.y-(PL.pos.y+1))<1.2){ REEF.sting=1.5; hurtPL(4,'해파리에 쏘였다'); }
  }
  if(REEF.sting>0) REEF.sting-=dt;
  for(const k in cnt){ M[k].count=cnt[k]; M[k].instanceMatrix.needsUpdate=true; if(M[k].instanceColor) M[k].instanceColor.needsUpdate=true; }
}
/* **산호의 결**(사용자 요청: 사진 같고 꼴이 또렷한 산호초) — 산호마다 폴립(산호충이 사는 잔 컵)을 촘촘히 박는다: 3 cm 칸의 둥근 컵
   가장자리가 어둡고 가운데가 조금 밝다. 가지 끝·윗면은 밝고(볕 · 새로 자란 데) 밑은 어둡다. 화소보다 잘아지면(멀면) 컵을 지운다 */
function coralPatch(m){
  if(m.userData._coral) return; m.userData._coral=true;
  const prev=m.onBeforeCompile;
  m.onBeforeCompile=(sh,r)=>{ if(prev) prev(sh,r);
    sh.vertexShader='varying vec3 vCoW;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      { vec4 cw=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          cw=instanceMatrix*cw;
        #endif
        vCoW=(modelMatrix*cw).xyz; }`);
    sh.fragmentShader='varying vec3 vCoW;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      { vec3 q=vCoW*30.0, f=fract(q)-0.5; float d=length(f), fw=fwidth(d)+1e-4;
        float cup=smoothstep(0.30,0.42,d)*(1.0-smoothstep(0.08,0.35,fw*3.0));     // 컵 가장자리
        float ctr=(1.0-smoothstep(0.0,0.18,d))*(1.0-smoothstep(0.08,0.35,fw*3.0));  // 컵 가운데
        diffuseColor.rgb*=1.0-0.28*cup+0.10*ctr;
        vec3 cn=normalize(cross(dFdx(vCoW),dFdy(vCoW))); diffuseColor.rgb*=0.82+0.30*smoothstep(-0.6,0.6,abs(cn.y)*sign(cn.y+0.0001)); }`);   // 윗면이 밝다(램버트 조각 셰이더엔 법선이 없어 화면 미분으로 낸다)
  };
  const pk=m.customProgramCacheKey; m.customProgramCacheKey=()=>'coral-'+(pk?pk.call(m):''); m.needsUpdate=true;
}
/* 바다 바닥을 다시 깔 때 같이 깐다(96-sea.js seaScatter 를 감싼다) */
{ const _ss=seaScatter; seaScatter=function(){ _ss(); try{ if(SEA.m&&!REEF.coral){ REEF.coral=true; for(const im of SEA.m.coral) coralPatch(im.material); } reefScatter(); }catch(e){ console.warn('[바다 생물]',e); } }; }
