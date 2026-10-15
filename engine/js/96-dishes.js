/* ============================================================================
   96-dishes.js — 요리
   ----------------------------------------------------------------------------
   사용자 요청: '구운 ~' 만으로는 먹을 것이 다양하지 않다 — 섬에서 나는 것으로 여러 가지 음식을.
   ① 바다 것을 갈래로 나눈다(tags) — 생선(finfish) · 조개(shellfish) · 게·새우(crust) · 문어·오징어(cephalo) · 날고기(meat).
      제작법이 '아무 생선' 처럼 갈래로 받으므로 무엇을 잡았든 요리가 된다. 복어는 생선 갈래에서 빼고 복국으로만 — 칼로 독을 걷어 낸다
   ② 요리 스물 — 국·탕(토기째 · 먹으면 빈 토기가 남는다) · 찜 · 꼬치 · 훈제 · 무침 · 튀김 ·
      돌판구이(현무암 판돌 — 지형 판 6 의 현무암 노두에서 뗀다) · 온천 요리(35-geo.js 의 뜨거운 웅덩이 곁)
   ③ 요리는 상하지 않는다(66-decay.js 는 날생선만 상한다 — 이 파일은 그 뒤에 읽혀 rot 이 붙지 않는다)
   96-reef.js 다음에 읽는다 — 거기서 보탠 조개·게·문어에 갈래를 붙여야 한다.
   ========================================================================== */
const DISH_TAG={
  shellfish:['clam','oyster','abalone','conch','scallop','mussel','top_shell','giant_clam'],
  crust:['crab','lobster','shrimp','hermit_crab'],
  cephalo:['octopus','squid','cuttlefish']
};
{ const not={pufferfish:1,sea_cucumber:1,jellyfish:1,barnacle:1};
  const tag=(id,t)=>{ const T=ITEMS[id]; if(T&&!(T.tags&&T.tags.indexOf(t)>=0)) T.tags=(T.tags||[]).concat(t); };   // concat — 같은 배열을 나눠 쓰는 아이템이 있어도 안 번진다
  for(const t in DISH_TAG) for(const id of DISH_TAG[t]){ tag(id,t); not[id]=1; }
  for(const id in ITEMS){ const T=ITEMS[id]; if(T.tags&&T.tags.indexOf('fish')>=0&&!not[id]) tag(id,'finfish'); }
  tag('meat_bear','meat'); tag('bird_raw','meat');
}
Object.assign(TAG_N,{finfish:'생선(아무 종류 — 복어 빼고)', shellfish:'조개(아무 종류)', crust:'게·새우(아무 종류)',
                     cephalo:'문어·오징어(아무 종류)', meat:'날고기(곰·새)'});

/* dish — 손에 든 모습(74-icons-guns.js heldConsumable): bowl 사발 · plate 접시 · skewer 꼬치 · leaf 잎에 싼 것 */
Object.assign(ITEMS,{
  seafood_stew: {n:'해물탕',        kg:3.9,  c:0xc0603a, use:'게·새우와 조개, 바닷말을 소금으로 끓였다 — 배와 목을 함께 채운다(허기 62)', food:62, water:30, empty:'pot'},
  puffer_soup:  {n:'복국',          kg:3.7,  c:0xd8cfb0, use:'독 있는 간과 피를 걷어 낸 복어를 바닷말과 맑게 끓였다(허기 46)', food:46, water:32, empty:'pot'},
  ink_soup:     {n:'먹물 오징어국', kg:3.7,  c:0x2a2a30, use:'문어·오징어를 제 먹물과 끓인 검은 국 — 진하다(허기 50)', food:50, water:28, empty:'pot'},
  bear_hotpot:  {n:'산채 곰고기 전골', kg:4.2, c:0x8a4a30, use:'곰 고기에 버섯·고사리를 넣고 졸인 전골 — 가장 든든하다(허기 74)', food:74, water:24, empty:'pot'},
  bird_soup:    {n:'새고기 버섯국', kg:3.6,  c:0xb08a5a, use:'새고기와 버섯·고사리를 끓였다(허기 44)', food:44, water:30, empty:'pot'},
  octopus_boil: {n:'문어 숙회',     kg:2.6,  c:0xb05a5a, use:'문어·오징어를 소금물에 살짝 데쳤다 — 토기째 들고 다닌다(허기 34)', food:34, water:8, empty:'pot'},
  clam_steam:   {n:'바닷말 조개찜', kg:0.7,  c:0x6a7a4a, use:'조개를 바닷말에 싸서 쪘다 — 국물이 고인다(허기 34)', food:34, water:8, dish:'leaf'},
  coconut_fish: {n:'야자 생선찜',   kg:1.6,  c:0xe8dcc0, use:'야자 속살과 즙에 생선을 넣고 껍데기째 불에 올렸다(허기 44 · 목마름 22)', food:44, water:22, dish:'bowl'},
  banana_coco:  {n:'코코넛 바나나 찜', kg:1.2, c:0xe0c870, use:'바나나를 야자즙에 쪘다 — 달다(허기 34 · 목마름 24)', food:34, water:24, dish:'bowl'},
  seafood_skewer:{n:'해물 꼬치',    kg:0.6,  c:0xd08050, use:'게·새우와 오징어를 가지에 꿰어 소금을 쳐 구웠다(허기 40)', food:40, dish:'skewer'},
  salmon_smoked:{n:'훈제 연어',     kg:0.9,  c:0xe07a50, use:'연어를 생나무 연기에 오래 그을렸다 — 가볍고 기름지다(허기 42)', food:42, dish:'plate'},
  berry_meat:   {n:'베리 졸임 고기', kg:1.6, c:0x6a2a36, use:'곰 고기를 베리 즙에 졸여 구웠다 — 새콤하다(허기 56)', food:56, water:6, dish:'plate'},
  slab_fish:    {n:'돌판 생선구이', kg:0.7,  c:0xc89060, use:'달군 현무암 판돌에 생선을 올려 지글지글 구웠다(허기 38)', food:38, dish:'plate'},
  slab_meat:    {n:'돌판 고기구이', kg:1.5,  c:0x8a4a2a, use:'달군 현무암 판돌에 곰 고기와 버섯을 구웠다 — 기름이 빠져 고소하다(허기 60)', food:60, dish:'plate'},
  fish_fry:     {n:'생선 튀김',     kg:1.2,  c:0xd8a850, use:'곰 기름을 토기에 끓여 생선 둘을 튀겼다(허기 58)', food:58, dish:'plate'},
  abalone_fat:  {n:'전복 기름구이', kg:0.3,  c:0xd8b070, use:'전복을 곰 기름에 지졌다 — 쫄깃하다(허기 38)', food:38, dish:'plate'},
  seaweed_wrap: {n:'바닷말 쌈',     kg:0.4,  c:0x3a4a2a, use:'바닷말에 구운 알과 구운 버섯을 싸 먹는다(허기 32)', food:32, dish:'leaf'},
  sea_salad:    {n:'해삼 해파리 무침', kg:0.7, c:0xa8b0a0, use:'해삼과 해파리를 칼로 저며 소금에 무쳤다 — 시원하다(허기 30 · 목마름 12)', food:30, water:12, dish:'bowl'},
  onsen_egg:    {n:'온천 달걀',     kg:0.06, c:0xf0e2b0, use:'온천물에 오래 담가 흰자는 몽글하고 노른자는 촉촉하다(허기 16)', food:16},
  onsen_steam:  {n:'온천 해물찜',   kg:0.9,  c:0xd88a60, use:'조개와 게를 바닷말에 싸 온천 김에 쪘다(허기 50)', food:50, water:10, dish:'leaf'}
});

/* 온천 곁 — 35-geo.js 의 뜨거운 웅덩이(k 0 · 온천)에서 3 m 안 */
function nearHotSpring(){
  if(typeof GEOT==='undefined') return false;
  for(const p of GEOT.pools){ if(p.k!==0) continue; if(Math.hypot(PL.pos.x-p.x,PL.pos.z-p.z)<p.R+3) return true; }
  return false;
}
STATION.spring={n:'온천', ok:()=>nearHotSpring()};

/* 제작 표 — '요리' 단으로 따로 모은다(먹을 것 탭에서 '불' 바로 오른쪽 단) */
TIER_ORDER.splice(TIER_ORDER.indexOf('불')+1,0,'요리');
TIER_LABEL['요리']='요리';
const _dish=(id,n,time,station,note,ins,need)=>{ const R={id,tier:'요리',n,out:{id,n:1},time,stam:3,note,in:ins}; if(station) R.station=station; if(need) R.need=need; return R; };
RECIPES.push(
  _dish('seafood_stew','해물탕',16,'fire','물 담은 토기에 게·새우 하나, 조개 둘, 바닷말을 넣고 소금으로 간해 끓인다.',
        [{tag:'crust',n:1},{tag:'shellfish',n:2},{id:'seaweed',n:1},{id:'salt',n:1},{id:'pot_water',n:1}]),
  _dish('puffer_soup','복국',16,'fire','복어의 간·알·피를 칼로 말끔히 걷어 내고 바닷말과 맑게 끓인다. 칼이 없으면 독이 남는다.',
        [{id:'pufferfish',n:1},{id:'seaweed',n:1},{id:'salt',n:1},{id:'pot_water',n:1}],[{tag:'sharp',n:1}]),
  _dish('ink_soup','먹물 오징어국',16,'fire','문어·오징어를 썰어 제 먹물을 풀고 끓인다.',
        [{tag:'cephalo',n:1},{id:'ink',n:1},{id:'salt',n:1},{id:'pot_water',n:1}]),
  _dish('bear_hotpot','산채 곰고기 전골',20,'fire','토기에 곰 고기와 버섯 둘, 고사리 둘을 넣고 소금물에 졸인다.',
        [{id:'meat_bear',n:1},{id:'mushroom',n:2},{id:'fern',n:2},{id:'salt',n:1},{id:'pot_water',n:1}]),
  _dish('bird_soup','새고기 버섯국',16,'fire','새고기와 버섯, 고사리를 물 담은 토기에 넣고 끓인다.',
        [{id:'bird_raw',n:1},{id:'mushroom',n:1},{id:'fern',n:1},{id:'salt',n:1},{id:'pot_water',n:1}]),
  _dish('octopus_boil','문어 숙회',10,'fire','소금물이 끓으면 문어·오징어를 넣었다 바로 건진다 — 오래 삶으면 질겨진다.',
        [{tag:'cephalo',n:1},{id:'salt',n:1},{id:'pot_water',n:1}]),
  _dish('clam_steam','바닷말 조개찜',12,'fire','조개 셋을 젖은 바닷말에 싸서 잉걸불에 묻는다. 김에 익으며 입을 벌린다.',
        [{tag:'shellfish',n:3},{id:'seaweed',n:2}]),
  _dish('coconut_fish','야자 생선찜',14,'fire','야자를 쪼개 즙과 속살에 생선을 넣고 껍데기째 불에 올린다.',
        [{tag:'finfish',n:1},{id:'coconut',n:1}]),
  _dish('banana_coco','코코넛 바나나 찜',10,'fire','바나나 둘을 야자즙에 넣고 껍데기째 찐다.',
        [{id:'banana',n:2},{id:'coconut',n:1}]),
  _dish('seafood_skewer','해물 꼬치',12,'fire','게·새우와 문어·오징어를 가지에 꿰어 소금을 치고 굽는다.',
        [{tag:'crust',n:1},{tag:'cephalo',n:1},{id:'branch',n:1},{id:'salt',n:1}]),
  _dish('salmon_smoked','훈제 연어',30,'fire','연어 배를 갈라 펴고 생나무 가지 셋을 지펴 연기에 오래 그을린다.',
        [{id:'salmon',n:1},{id:'branch',n:3}],[{tag:'sharp',n:1}]),
  _dish('berry_meat','베리 졸임 고기',14,'fire','베리 다섯을 으깨 즙을 내고 곰 고기에 발라 가며 굽는다.',
        [{id:'meat_bear',n:1},{id:'berry',n:5}]),
  _dish('slab_fish','돌판 생선구이',10,'fire','현무암 판돌을 불에 달궈 생선을 올리고 소금을 친다. 판돌은 남는다.',
        [{tag:'finfish',n:1},{id:'salt',n:1}],[{id:'basalt_slab',n:1}]),
  _dish('slab_meat','돌판 고기구이',14,'fire','달군 현무암 판돌에 곰 고기와 버섯을 올려 굽는다. 판돌은 남는다.',
        [{id:'meat_bear',n:1},{id:'mushroom',n:1}],[{id:'basalt_slab',n:1}]),
  _dish('fish_fry','생선 튀김',14,'fire','곰 기름을 토기에 끓이고 생선 둘을 넣어 튀긴다.',
        [{tag:'finfish',n:2},{id:'fat',n:1}],[{id:'pot',n:1}]),
  _dish('abalone_fat','전복 기름구이',10,'fire','전복을 껍데기에서 떼어 곰 기름에 지진다.',
        [{id:'abalone',n:1},{id:'fat',n:1}]),
  _dish('seaweed_wrap','바닷말 쌈',4,null,'바닷말 두 장에 구운 알과 구운 버섯을 싼다. 불이 없어도 된다.',
        [{id:'seaweed',n:2},{id:'egg_cooked',n:1},{id:'mushroom_cooked',n:1}]),
  _dish('sea_salad','해삼 해파리 무침',6,null,'해삼과 해파리를 칼로 얇게 저며 소금에 무친다. 불이 없어도 된다.',
        [{id:'sea_cucumber',n:1},{id:'jellyfish',n:1},{id:'salt',n:1}],[{tag:'sharp',n:1}]),
  _dish('onsen_steam','온천 해물찜',14,'spring','조개 둘과 게·새우 하나를 바닷말에 싸서 온천 김이 오르는 데에 묻는다.',
        [{tag:'shellfish',n:2},{tag:'crust',n:1},{id:'seaweed',n:1}])
);
RECIPES.push({id:'onsen_egg', tier:'요리', n:'온천 달걀', out:{id:'onsen_egg',n:3}, time:20, stam:2, station:'spring',
  note:'새알 셋을 온천물에 담가 둔다. 끓는 물보다 덜 뜨거워 천천히 익는다.', in:[{id:'egg',n:3}]});
/* 예전 요리도 그릇에 담아 보인다 */
for(const [id,d] of [['skewer','skewer'],['namul','bowl'],['egg_mush','bowl'],['fish_grill_salt','plate'],['fish_salted','plate'],['meat_salted','plate']])
  if(ITEMS[id]&&!ITEMS[id].dish) ITEMS[id].dish=d;
