/* 50-items.js — CASTAWAY
   아이템과 소지품 — ITEMS 표 · 소지품·착용 · 끌어 놓기(버리기 포함) · 맨손 채집 · 먹기·마시기 · 빠른 칸
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   10) 아이템 · 인벤토리
   ----------------------------------------------------------------------------
   무게만으로 제한한다. 칸 개수 대신 kg을 쓰면 "무거운 걸 들면 느려진다"가
   그대로 이동 속도·기력 소모에 연결되어 탐사 동선이 실제 선택이 된다.
   가지 질량은 수종 밀도를 반영했다 — 참나무 0.75 g/cm³, 전나무 0.45 g/cm³.
   ========================================================================== */
const ITEMS={
  codex:      {n:'사전',       kg:0.3,  c:0xb0a684, use:'아는 것을 적어둔 수첩 — B로 펼친다'},
  /* 생존 안내서 — 처음부터 지닌다. 가방에서 고르면 오른쪽에 글이 펼쳐진다(read) */
  guide:      {n:'생존 안내서', kg:0.1, c:0xd8c890, use:'표류자를 위한 짧은 안내 — 가방에서 누르면 읽힌다',
               read:['불을 피우세요. 밤은 어둡습니다',
                     '식량을 확보하세요',
                     '돌 곡괭이와 같은 도구를 우선 만드세요',
                     '철제 도구를 만들고 싶다면 제련소랑 모루, 그리고 숯이 중요합니다'],
               /* 안내 네 줄 밑에 두 줄 띄우고 조작 글쇠(사용자 요청) — [글쇠, 하는 일] */
               keys:[['WASD','이동'],['Shift','달리기'],['Space','뛰기(기력을 쓴다 · 물에서는 못 뛴다)'],['Ctrl','앉기'],
                     ['좌클릭','손에 든 것 쓰기 · 누르고 있으면 캐기·따기'],['우클릭','조준 · 충전'],
                     ['I','가방(소지품 · 제작)'],['B','사전'],['M','지도 크게/작게'],['L','전등'],['1 ~ 5','빠른 칸'],
                     ['Z','집 짓기'],['E','열린 창 닫기'],['F','설비 옮기기'],['Tab','설정'],['F5 / F9','저장 / 불러오기'],['Esc','멈춤']]},
  /* 손 충전기 — 캠코더 배터리만 채운다(46-camcorder.js). 손에 들고 좌클릭을 누르고 있으면 손잡이를 돌린다 */
  hand_charger:{n:'손 충전기', kg:0.35, c:0x3a3d40, use:'손잡이를 돌려 캠코더 배터리를 채운다 — 들고 좌클릭을 누르고 있는다',
               tool:{charger:1}},
  // 목재는 수종을 구분하지 않는다 — 제작 단계에서 갈라지면 복잡하기만 하다
  branch:     {n:'나뭇가지',   kg:0.9,  c:0x6b5434, use:'자루 · 불쏘시개 · 장작'},
  log:        {n:'통나무',     kg:6.5,  c:0x6b5434, use:'장작 · 목재 · 숯'},
  grass_blade:{n:'풀잎',       kg:0.04, c:0x7c9440, use:'긁어서 섬유 · 불쏘시개 · 깔개'},
  /* ── 숲에서 얻는 것(95-flora.js) ── */
  bark:       {n:'나무껍질',   kg:0.2,  c:0x7a5a3c, use:'비벼서 부싯깃 · 긁어서 섬유 · 자작 껍질은 잘 탄다'},
  resin:      {n:'송진',       kg:0.1,  c:0xc89a3a, use:'끓이면 풀(접착제) — 솔과 삼나무 줄기를 긁어 얻는다'},
  fern:       {n:'고사리',     kg:0.05, c:0x4f7a3a, use:'날로 먹으면 탈이 난다 — 굽거나 삶는다', food:3, raw:true},
  fern_cooked:{n:'익힌 고사리', kg:0.05, c:0x5a6a34, use:'쌉쌀하다(허기 9)', food:9},
  flower:     {n:'들꽃',       kg:0.02, c:0xd8a0c0, use:'달이면 약초 물 — 풀과 베리 대신 쓴다'},
  bamboo_flask:{n:'빈 대나무 물통', kg:0.25, c:0x9ab05a, use:'마디 하나를 잘라 만든 물통 — 하천에서 채운다'},
  bamboo_water:{n:'대나무 물통', kg:0.95, c:0x6a9a5a, use:'두 모금 든 물통 — 다 마시면 빈 통이 남는다',
               sips:2, drink:{n:35, empty:'bamboo_flask'}},
  /* ── 새 · 벌(97-wildlife.js) ── */
  slingshot:  {n:'새총',       kg:0.3,  c:0x7a5a36, use:'지닌 돌멩이를 쏜다 — 나는 새를 잡는다(들고 좌클릭)',
               tool:{sling:1, reach:34, rate:0.8, stam:4}, durMax:60},
  feather:    {n:'깃털',       kg:0.01, c:0xd8d8e0, use:'화살 깃 — 화살이 더 많이 나온다'},
  bird_raw:   {n:'새고기',     kg:0.4,  c:0xb86a5a, use:'날로 먹으면 탈이 난다 — 굽는다', food:6, raw:true},
  bird_cooked:{n:'구운 새고기', kg:0.3, c:0x9a6a3a, use:'기름지다(허기 26)', food:26},
  egg:        {n:'새알',       kg:0.06, c:0xe8e0d0, use:'날로 먹으면 탈이 난다 — 굽는다', food:5, raw:true},
  egg_cooked: {n:'구운 알',    kg:0.06, c:0xe8d8a0, use:'든든하다(허기 13)', food:13},
  honey:      {n:'꿀단지',     kg:1.6,  c:0xd8a020, use:'토기에 받은 꿀 — 먹으면 허기와 기력이 찬다. 빈 토기가 남는다',
               food:22, water:4, empty:'pot'},
  /* ── 바다에서 얻는 것(96-sea.js) ── */
  seaweed:    {n:'바닷말',     kg:0.2,  c:0x4a5a2a, use:'그냥 먹는다(허기 5) · 모닥불에 태우면 재가 된다', food:5},
  coral:      {n:'산호 조각',  kg:0.3,  c:0xe0a090, use:'모닥불에 구우면 석회가 된다'},
  starfish:   {n:'불가사리',   kg:0.15, c:0xd86a3a, use:'모닥불에 구우면 석회가 된다'},
  lime:       {n:'석회',       kg:0.3,  c:0xe8e4d8, use:'유리를 구울 때 넣으면 더 많이 나온다'},
  vine:       {n:'덩굴',       kg:0.25, c:0x4f6a30, use:'그대로 밧줄 대신 묶는다 · 새총 · 사다리'},
  bamboo:     {n:'대나무',     kg:0.9,  c:0x8aa04a, use:'속이 빈 마디 줄기 — 물통 · 창 · 낚싯대 · 통발'},
  coconut:    {n:'야자열매',   kg:1.1,  c:0x6a4a28, use:'깨서 마시고 먹는다(허기 14 · 목마름 30)',
               food:14, water:30},
  banana:     {n:'바나나',     kg:0.15, c:0xe0c040, use:'그냥 먹는다(허기 11)', food:11, water:2},
  mushroom:   {n:'버섯',       kg:0.05, c:0xa87850, use:'날로 먹으면 탈이 난다 — 굽거나 국에 넣는다',
               food:5, raw:true},
  mushroom_cooked:{n:'구운 버섯', kg:0.04, c:0x8a5a34, use:'향이 좋다(허기 12)', food:12},
  /* 베리는 그냥 따 먹는다 — 한 알에 허기 4 · 목마름 3(즙이 많다). 굽지 않아도 탈이 없다 */
  berry:      {n:'베리',       kg:0.03, c:0x8e3350, use:'따서 바로 먹는다 · 즙 · 염료',
               food:4, water:3},
  flint:      {n:'부싯돌',     kg:0.6,  c:0x33383d, use:'뗀석기 원석 · 긁개 · 발화',
               tags:['stone','sharp','knappable']},
  pebble:     {n:'돌멩이',     kg:0.4,  c:0x8a8880, use:'망치돌 · 모닥불 · 도끼날',
               tags:['stone','hammer']},
  reed_stalk: {n:'갈대',       kg:0.12, c:0x8d9a5c, use:'긁어서 섬유 · 지붕 잇기 · 바구니'},
  fiber:      {n:'섬유',       kg:0.10, c:0x9aa86a, use:'꼬아서 노끈'},
  cord:       {n:'노끈',       kg:0.28, c:0xa89a68, use:'결속 · 자루 고정 · 올가미'},
  handaxe:    {n:'주먹도끼',   kg:0.5,  c:0x4a5058, use:'자르기 · 긁기 · 서툰 벌목',
               tags:['sharp'], tool:{axe:1,sharp:1,speed:0.6,wear:6}, durMax:55},
  // 찌르개는 자루에 끼우는 촉이지 손에 쥐는 긁개가 아니다 — sharp 분류에서 뺀다
  point:      {n:'슴베찌르개', kg:0.15, c:0x455058, use:'자루에 끼워 창·화살촉 (아직 미구현)',
               tags:['point']},
  axe_crude:  {n:'간이 도끼',  kg:1.4,  c:0x9a8a5e, use:'벌목 — 조잡해서 오래 못 간다',
               tool:{axe:1,speed:1,wear:3}, durMax:40},

  // 채굴 산출물
  clay_lump:  {n:'점토',       kg:2.0,  c:0x8a7150, use:'토기 · 도가니 · 화로 내벽'},
  brick_raw:  {n:'날벽돌',     kg:1.6,  c:0x9a7a58, use:'점토를 틀에 찍어 말린 벽돌 — 모닥불에 구우면 벽돌'},
  brick:      {n:'벽돌',       kg:1.4,  c:0xa4553a, use:'구운 벽돌 — 모닥불을 둘러 가마를 짓는다'},
  // 사냥물 — 잡은 몹에서 나온다. 철보다 무르지만 훨씬 가볍다.
  chitin:     {n:'키틴',       kg:0.5,  c:0x4a5a4e,
               use:'가고일 껍질 — 철보다 무르지만 절반 무게다'},
  bone:       {n:'뼈',         kg:0.7,  c:0xd6cfb4,
               use:'아르크토스 뼈 — 창대와 망치 머리로 쓴다'},
  // 먹을 것 — food 는 배를 채우는 양, raw 면 날것이라 탈이 난다
  meat_bear:  {n:'아르크토스 고기', kg:2.2, c:0x9d5a54, use:'날고기 — 구워 먹어야 탈이 없다',
               food:10, raw:true},
  meat_cooked:{n:'구운 고기',   kg:1.8, c:0x7a4a33, use:'불에 익힌 고기 — 배를 든든히 채운다',
               food:42},
  fish:       {n:'물고기',     kg:0.9, c:0x7f9bb0, use:'그물로 건진 것 — 구워 먹는다',
               food:7, raw:true},
  fish_cooked:{n:'구운 물고기', kg:0.8, c:0xa8886a, use:'불에 익힌 물고기',
               food:24},
  // 그물 — 물에 들어가 던진다. 거미줄 쪽이 질기고 가볍고 많이 건진다
  net_cord:   {n:'노끈 그물',   kg:2.6, c:0x9a8a5e, durMax:40,
               use:'물에 들어가 던져 물고기를 건진다',
               tool:{net:1, catch:[1,2], stam:12}},
  net_silk:   {n:'거미줄 그물', kg:1.3, c:0xc9c2d4, durMax:90,
               use:'거미 실로 뜬 그물 — 가볍고 질기고 많이 걸린다',
               tool:{net:2, catch:[2,4], stam:9}},
  // 벌레잡이 — 잠자리채로 떠서 유리병에 담는다(97-wildlife.js bugNetSwing). 병에 든 벌레는 그물 미끼가 된다(castNet)
  bug_net:    {n:'잠자리채',   kg:0.6, c:0xd8d0b0, durMax:60,
               use:'나비·잠자리·반딧불이를 떠낸다 — 유리병이 있어야 담는다',
               tool:{bugnet:1, reach:3.2, rate:0.55, stam:3}},
  jar:        {n:'유리병',     kg:0.30, c:0xbfdde0, use:'벌레를 담는 빈 병 — 잠자리채로 뜬 것을 넣는다'},
  jar_butterfly:{n:'나비 병',  kg:0.32, c:0xf0d860, use:'나비가 든 병 — 그물을 던질 때 미끼로 풀면 더 걸린다', bait:1},
  jar_dragonfly:{n:'잠자리 병',kg:0.32, c:0x7ab8d8, use:'잠자리가 든 병 — 그물 미끼', bait:1},
  jar_firefly:{n:'반딧불이 병',kg:0.32, c:0xc8f070, use:'반딧불이가 든 병 — 그물 미끼(밤에 잡힌다)', bait:1},
  hide:       {n:'가죽',       kg:1.1,  c:0x8a6a4a,
               use:'아르크토스 가죽 — 손잡이를 감고 이음매를 묶는다'},
  spider_silk:{n:'거미 실',     kg:0.2,  c:0xd8d4c8,
               use:'스킨워커의 실 — 노끈보다 가늘고 훨씬 질기다'},
  mimic_flesh:{n:'모방 조직',   kg:0.9,  c:0x6a4a5a,
               use:'삼킨 것의 모습을 베끼는 살 — 무엇이든 될 수 있어 아무것도 아니다'},
  /* 애쉬스케일의 겉비늘 — 제 화염구를 뒤집어써도 타지 않는다.
     키틴처럼 겹쳐 꿰면 쇠보다 가벼운 갑옷이 된다. */
  ember_scale:{n:'잿불 비늘',   kg:0.4,  c:0x8a3a22,
               use:'애쉬스케일의 겉비늘 — 불에 그을려도 타지 않는다'},
  // 모방 조직은 닿은 것을 베낀다 — 살에 대면 그 살이 되어 앉는다
  bandage_mimic:{n:'모방 붕대', kg:0.3, c:0xa87f86,
               use:'모방 조직을 얇게 펴 거미 실로 누빈 띠 — 상처를 덮고 속병을 가라앉힌다',
               heal:{hp:35, ill:1, stam:40}},
  pot_sand:   {n:'모래 담은 토기', kg:3.4, c:0xc9b98a,
               use:'유리 원료 — 모래는 흘러서 토기에 담아 나른다'},
  glass:      {n:'유리',       kg:1.2,  c:0x9fc6cc, use:'창짝 — 규사를 녹여 굳힌 판'},
  bog_iron:   {n:'늪철광',     kg:3.0,  c:0x9c5a2e, use:'괴련철 제련 → 철기'},
  cassiterite:{n:'석석',       kg:1.5,  c:0x6d5a44, use:'구리와 합금 → 청동'},
  coal_lump:  {n:'석탄',       kg:1.2,  c:0x26262a, use:'고온 연료 · 코크스'},
  malachite:  {n:'공작석',     kg:2.2,  c:0x3fa98a, use:'제련 → 구리'},
  sphalerite: {n:'섬아연석',   kg:2.0,  c:0x5d4a52, use:'제련 → 아연. 구리와 합쳐 황동'},
  galena:     {n:'방연석',     kg:2.3,  c:0x585d66, use:'제련 → 납. 축전지의 극판이 된다'},
  cinnabar:   {n:'진사',       kg:1.8,  c:0xa03a32, use:'구우면 수은이 날아 나온다 — 분기공 둘레에만'},

  // 불
  tinder:     {n:'부싯깃',     kg:0.05, c:0xb8a86a, use:'불씨를 옮겨 붙이는 마른 풀뭉치'},
  bowdrill:   {n:'활비비',     kg:1.0,  c:0x8a7a52, use:'마찰 발화 — 힘이 많이 든다',
               tool:{fire:1}, durMax:25},
  /* 긴 라이터 — 철관 끝에 부싯돌 톱니를 물려 방아쇠로 긁는다. 팔 길이만큼 떨어져
     모닥불 속에 바로 불꽃을 떨어뜨리므로 부싯깃을 따로 받쳐 둘 필요가 없다.
     tool.fire 가 클수록 빨리 붙고, 2 이상이면 부싯깃 없이도 붙는다. */
  igniter:    {n:'긴 라이터',   kg:0.45, c:0xb9bec4,
               use:'부싯깃 없이 한 번에 불을 붙인다 — 모닥불 속까지 닿는다',
               tool:{fire:3}, durMax:120},
  stone_block:{n:'석재',       kg:5.0,  c:0x7a7a74, use:'숫돌 축조 · 마제 석기날 · 석축'},
  // 토기 — 빚어 말린 생것을 모닥불에 구워야 비로소 그릇이 된다
  pot_raw:    {n:'마르지 않은 그릇', kg:1.8, c:0x8a7150,
               use:'아직 물에 풀린다 — 모닥불에 구워야 한다'},
  pot:        {n:'토기',       kg:1.6,  c:0xa8724a,
               use:'물 저장 · 조리 · 보관 (물·허기 체계가 붙으면 쓰인다)'},
  crucible_raw:{n:'마르지 않은 도가니', kg:3.6, c:0x7d6647,
               use:'두껍게 빚은 생것 — 구워야 열을 견딘다'},
  crucible:   {n:'도가니',     kg:3.2,  c:0x8f6a45,
               use:'광석 제련용 내화 그릇 (제련이 붙으면 쓰인다)'},
  // 제련
  charcoal_pile:{n:'흙 덮은 장작', kg:7.0, c:0x5d4a35,
               use:'모닥불에 묻어 구우면 참숯이 된다'},
  charcoal:   {n:'참숯',       kg:0.5,  c:0x2b2b2e,
               use:'장작보다 훨씬 뜨겁다 — 제련 연료'},
  blowpipe:   {n:'송풍관',     kg:0.3,  c:0x8d9a5c,
               use:'갈대 대롱으로 불을 불어 온도를 올린다'},
  ingot_copper:{n:'구리 주괴',  kg:2.0,  c:0xb87333, use:'무른 금속 — 청동의 바탕'},
  ingot_tin:  {n:'주석 주괴',   kg:1.5,  c:0xa8a8ae, use:'구리와 합쳐 청동'},
  ingot_bronze:{n:'청동 주괴',  kg:2.0,  c:0xa07b3c, use:'석기보다 훨씬 단단하고 오래간다'},
  /* 합금 셋 — 무엇에 무엇을 섞느냐로 성질이 갈린다.
     청동(구리+주석)은 단단하고, 황동(구리+아연)은 잘 늘어나 얇게 뽑히고,
     강철(철+탄소)은 담금질이 먹어 날이 오래 선다. */
  ingot_lead: {n:'납 주괴',     kg:2.2,  c:0x6e737a,
               use:'무르고 무겁다 — 두들겨 펴면 축전지 극판이 된다'},
  mercury:    {n:'수은',       kg:3.4,  c:0xb9bec4,
               use:'흐르는 금속 — 뇌홍의 원료. 토기에 담는다'},
  ingot_zinc: {n:'아연 주괴',   kg:1.4,  c:0x9aa3ab,
               use:'구리와 합쳐 황동 — 낮은 온도에서 끓어 날아가니 도가니를 덮는다'},
  ingot_brass:{n:'황동 주괴',   kg:1.9,  c:0xc4a747,
               use:'잘 늘어난다 — 탄피를 얇게 뽑는 데 이만한 것이 없다'},
  ingot_steel:{n:'강철 주괴',   kg:1.9,  c:0x74797f,
               use:'연철에 탄소를 먹인 쇠 — 담금질하면 날이 오래 선다'},
  bloom_iron: {n:'괴련철',     kg:2.5,  c:0x6b5548,
               use:'불순물 섞인 철 덩이 — 단조로 벼려야 쓸 수 있다'},
  // 착용품 — slot: body 옷 · armor 갑옷 · head 투구 · back 등짐
  cape_grass: {n:'풀 도롱이',  kg:1.2,  c:0x7c8a46,
               use:'풀을 층층이 엮어 어깨에 두른다 — 비와 추위를 막는다',
               wear:{slot:'body', warm:2, armor:0}},
  tunic_fiber:{n:'섬유 옷',    kg:1.8,  c:0x9aa06a,
               use:'섬유를 촘촘히 엮은 웃옷 — 갑옷 밑에 받쳐 입는다',
               wear:{slot:'body', warm:4, armor:1}},
  pack_woven: {n:'엮은 등짐',  kg:1.0,  c:0xa89a68,
               use:'등에 지는 망태 — 들 수 있는 무게가 늘어난다',
               wear:{slot:'back', carry:15}},
  scale_bronze:{n:'청동 비늘 갑옷', kg:9.5, c:0xa9772f,
               use:'청동 비늘을 섬유 바탕에 꿰어 붙였다 — 무겁다',
               wear:{slot:'armor', armor:6, warm:1}},
  helm_bronze:{n:'청동 투구',  kg:3.2,  c:0xa9772f,
               use:'한 장으로 두들겨 뽑은 투구',
               wear:{slot:'head', armor:3}},
  scale_iron: {n:'철 비늘 갑옷', kg:12.0, c:0x9a938c,
               use:'철 비늘을 겹쳐 꿰었다 — 철로 만들 수 있는 끝이다',
               wear:{slot:'armor', armor:10, warm:1}},
  plate_steel:{n:'강철 판금',   kg:14.5, c:0x74797f,
               use:'강철 판을 몸에 맞춰 두들겨 뽑았다 — 비늘과 달리 이음매가 없다',
               wear:{slot:'armor', armor:14, warm:2}},
  helm_steel: {n:'강철 투구',   kg:3.8,  c:0x74797f,
               use:'챙과 목가리개를 한 장으로 뽑았다 — 머리에 씌울 수 있는 끝이다',
               wear:{slot:'head', armor:6}},
  /* 사냥물 방어구 — 무기와 같은 셈법이다. 방어는 청동·철에 못 미치지만
     무게가 3분의 1이라 짐을 지고도 뛸 수 있고, 가죽은 따뜻하기까지 하다. */
  /* 겉이 아니라 속에 입는다 — 갑옷 칸을 차지하지 않으므로 무엇과도 겹쳐 입는다.
     방어는 2 뿐이지만 보온 6 은 아직 이 게임에서 가장 따뜻한 옷이다. */
  coat_hide:  {n:'가죽 속옷',  kg:2.4,  c:0x8a6a4a,
               use:'아르크토스 가죽을 살에 닿게 받쳐 입는다 — 갑옷 밑에 들어간다',
               wear:{slot:'body', armor:2, warm:6}},
  scale_chitin:{n:'키틴 갑옷', kg:4.5,  c:0x4a5a4e,
               use:'키틴 판을 비늘처럼 겹쳐 꿰었다 — 청동보다 낫고 절반 무게다',
               wear:{slot:'armor', armor:8, warm:1}},
  helm_chitin:{n:'키틴 투구',  kg:1.2,  c:0x53685a,
               use:'머리 껍질을 통째로 다듬어 쓴다 — 청동 투구와 같은데 훨씬 가볍다',
               wear:{slot:'head', armor:3}},
  /* 철 비늘과 같은 10 인데 무게는 절반도 안 된다 — 사냥물 줄의 셈법 그대로다. */
  scale_ember:{n:'잿불 비늘 갑옷', kg:5.2, c:0x8a3a22,
               use:'잿불 비늘을 겹쳐 꿰었다 — 철 비늘과 같은데 절반 무게다',
               wear:{slot:'armor', armor:10, warm:3}},
  /* 사냥물 방어구의 끝 — 다 꿴 키틴 갑옷에 잿불 비늘을 덧입힌다.
     키틴은 단단한데 깨지고, 잿불 비늘은 불을 견디는데 무르다.
     깨질 자리 밑에 비늘을 받치면 서로의 약점을 덮는다.
     강철 판금(14)에 한 점 못 미치고 무게는 3분의 1이다. */
  scale_ember_chitin:{n:'잿불 비늘 키틴 복합 갑옷', kg:5.6, c:0x6a4433,
               use:'키틴 갑옷 안쪽에 잿불 비늘을 덧댔다 — 강철 다음이다',
               wear:{slot:'armor', armor:13, warm:3}},
  helm_ember: {n:'잿불 비늘 투구', kg:1.4,  c:0x8a3a22,
               use:'잿불 비늘을 머리에 맞춰 겹쳐 꿰었다 — 청동·키틴 위다',
               wear:{slot:'head', armor:4}},
  helm_ember_chitin:{n:'잿불 비늘 키틴 복합 투구', kg:1.6, c:0x6a4433,
               use:'키틴 투구 안쪽에 잿불 비늘을 덧댔다 — 강철 투구와 같은데 절반도 안 무겁다',
               wear:{slot:'head', armor:5}},
  // 물 · 재
  /* 표류할 때 지니고 내린 것 — 보급선이 쥐여 준 비상식량과 물병.
     섬에서 만들 수 없는 물건이므로 다 쓰면 그만이다(물병만 다시 채운다). */
  can_food:   {n:'통조림',     kg:0.45, c:0xa8a29a,
               use:'보급선이 쥐여 준 비상식량 — 따서 그대로 먹는다',
               food:38},
  bottle_empty:{n:'빈 물병',   kg:0.30, c:0x7f9bb0,
               use:'하천이나 온천에서 다시 채운다'},
  bottle_water:{n:'물병',      kg:1.30, c:0x4f86ae,
               use:'세 모금 든 물병 — 다 마시면 빈 병이 남는다',
               sips:3, drink:{n:45, empty:'bottle_empty'}},
  /* 물을 담는 것 — 마시면 빈 그릇이 손에 남는다.
     sips 를 단 것은 여러 번 나눠 마신다(칸마다 남은 모금을 따로 센다). */
  pot_water:  {n:'물 담은 토기', kg:3.6, c:0x4f86ae,
               use:'담수 — 마시거나, 우려내고 졸이는 데 쓴다',
               drink:{n:55, empty:'pot'}},
  bucket_iron:{n:'철 양동이',   kg:2.4, c:0x9aa0a6,
               use:'연철을 두드려 편 통 — 물을 네 모금 담아 나른다'},
  bucket_water:{n:'물 담은 양동이', kg:12.4, c:0x5a86a2,
               use:'하천에서 길어 온 물 — 나눠 마신다',
               sips:4, drink:{n:40, empty:'bucket_iron'}},
  /* 석회석 — 자갈밭에 드문드문 섞인 흰 돌(30-props.js RUBBLE). 구우면 석회, 석회·재·모래·점토를 물에 개면 시멘트 */
  limestone:  {n:'석회석',     kg:0.8,  c:0xd9d5c6, use:'흰 돌 — 불에 구우면 석회가 된다(시멘트의 바탕)'},
  /* 시멘트 — 통마다 남은 양(amt 0~1)이 다르다. 터를 다질 때 든 만큼만 줄어든다(통 다섯에 0.3 통이면 530%) */
  cement:     {n:'시멘트',     kg:5.2,  c:0x9c9d98, frac:1, tool:{level:1},
               use:'터 다지기 — 들고 땅을 보며 좌클릭. 집의 토대는 다진 터 위에만 선다'},
  camc_pack:  {n:'캠코더 전지 팩', kg:0.6, c:0x3a6f9a, camc:1,
               use:'리튬이온 전지를 캠코더에 맞게 다시 짠 것 — 쓰면 낡은 전지를 갈아 끼운다(오래가고 더디게 닳는다)'},
  ash:        {n:'재',         kg:0.3,  c:0x9a958c, use:'물에 우리면 잿물이 된다'},
  lye:        {n:'잿물',       kg:3.4,  c:0xc9c9a8, use:'질산과 만나면 초석이 된다'},
  // 화약
  sulfur:     {n:'유황',       kg:1.0,  c:0xd8c23a, use:'화약 재료 · 분기공에서만 난다'},
  nitric:     {n:'질산',       kg:3.4,  c:0xb8b060, use:'잿물과 섞어 초석으로'},
  saltpeter:  {n:'초석',       kg:0.8,  c:0xdedac8, use:'화약의 주재료 (질산칼륨)'},
  gunpowder:  {n:'화약',       kg:0.9,  c:0x4a463e, use:'흑색화약 — 탄약의 장약'},
  /* 탄약 — ammo.dmg 가 총의 피해에 곱해진다. 총은 id 가 아니라 'ammo' 분류로
     받아들이므로, 새 탄을 만들려면 여기 한 줄이면 된다. */
  cartridge:  {n:'소총탄',     kg:0.05, c:0xc08a3e, tags:['ammo'],
               use:'구리 탄피에 화약과 철 탄두 — 소총 구경',
               ammo:{dmg:1.0, bore:'rifle'}},
  cartridge_brass:{n:'황동 소총탄', kg:0.05, c:0xc4a747, tags:['ammo'],
               use:'황동 탄피는 얇고 질겨 더 센 장약을 견딘다 — 피해 1.33배(소총 150 → 200)',
               ammo:{dmg:4/3, bore:'rifle'}},
  /* 무연 탄 — 장약이 세고 찌꺼기가 없다. 자동으로 도는 총은 이것만 먹는다
     (흑색화약 탄을 물리면 몇 발 만에 기관부가 눌어붙는다는 셈이다). */
  cartridge_smokeless:{n:'무연 소총탄', kg:0.05, c:0xd8c88a, tags:['ammo'],
               use:'무연화약을 재고 뇌관을 물렸다 — 피해 1.6배 · 자동 화기용',
               ammo:{dmg:1.6, bore:'rifle', clean:1}},
  cartridge_heavy:{n:'대물탄',  kg:0.12, c:0xc8a850, tags:['ammo'],
               use:'12.7 mm — 대물 저격총 전용. 무연화약을 세 배로 잰다',
               ammo:{dmg:1.0, bore:'heavy'}},
  rocket:     {n:'로켓탄',     kg:2.6,  c:0x5a6a4a, tags:['ammo'],
               use:'바주카 전용 — 꼬리의 무연화약이 밀고 머리의 화약이 터진다',
               ammo:{dmg:1.0, bore:'rocket'}},
  shell_buck: {n:'산탄',       kg:0.08, c:0xa8402e, tags:['ammo'],
               use:'종이 탄피에 납 알을 아홉 개 재웠다 — 산탄총 구경',
               ammo:{dmg:1.0, bore:'shot'}},
  /* 볼트 소총 — 화승총과 현대 소총 사이. 뒤로 열리는 약실에 탄피째 물리고,
     노리쇠를 손으로 젖혀 한 발씩 밀어 넣는다. 자동은 없다.
     사거리 50 m 는 활비비로 불을 켜던 섬에서는 다른 세계의 값이다. */
  rifle_bolt: {n:'볼트 소총',  kg:4.6,  c:0x7a6a52,
               use:'사거리 50 m · 5발 탄창 — 노리쇠를 젖혀 한 발씩',
               tool:{weapon:1, gun:1, bore:'rifle', dmg:150, reach:50, rate:2.40,
                     stam:3, swing:'shot', mag:5, reload:6.5},
               durMax:400},
  /* 산탄총 — 뇌관만 있으면 선다. 강선도 무연화약도 필요 없다(산탄은 돌면
     오히려 흩어진다). 그래서 현대식 화기 중 제일 먼저 만들 수 있다.
     한 방에 아홉 알이 퍼지므로 가까이서는 무섭고 멀면 아무것도 아니다. */
  shotgun:    {n:'산탄총',     kg:3.8,  c:0x6b5442,
               use:'사거리 22 m · 아홉 알이 퍼진다 — 가까이서만 쓸 것',
               tool:{weapon:1, gun:1, bore:'shot', dmg:26, reach:22, rate:1.15,
                     stam:4, swing:'shot', mag:5, reload:5.0,
                     pellets:9, spread:0.085},
               durMax:360},
  /* 반자동 소총 — 가스를 뽑아 노리쇠를 제 힘으로 밀어 젖힌다.
     볼트 소총과 같은 탄을 쓰지만 노리쇠를 젖히는 시간이 사라진다. */
  rifle_semi: {n:'반자동 소총', kg:4.9,  c:0x6e747a,
               use:'사거리 55 m · 10발 — 방아쇠를 당기는 만큼 나간다',
               tool:{weapon:1, gun:1, bore:'rifle', dmg:150, reach:55, rate:0.42,
                     stam:3, swing:'shot', mag:10, reload:4.2},
               durMax:420},
  /* 기관단총 — 총알이 나가는 반동으로 노리쇠가 열린다(단순 블로백).
     한 발은 약한데 누르고 있으면 계속 나간다. 탄을 퍼붓는 쪽이다. */
  smg:        {n:'기관단총',   kg:3.2,  c:0x565b61,
               use:'사거리 30 m · 25발 연사 — 왼쪽 단추를 누르고 있으면 계속',
               tool:{weapon:1, gun:1, bore:'rifle', dmg:62, reach:30, rate:0.10,
                     stam:1, swing:'shot', mag:25, reload:3.6, auto:1},
               durMax:300},
  /* 대물 저격총 — 12.7 mm 대물탄을 쓰는 볼트식. 13 kg 이라 들고 다니기 버겁다.
     조준경 배율 6 — 우클릭을 누르고 있는 동안 들여다본다(scope). 와이번(700)도 두 발. */
  rifle_sniper:{n:'대물 저격총', kg:13.0, c:0x4a4f45,
               use:'사거리 120 m · 5발 · 한 발 500 — 우클릭을 누르고 있으면 조준경(6배)',
               tool:{weapon:1, gun:1, bore:'heavy', dmg:500, reach:120, rate:4.0,
                     stam:5, swing:'shot', mag:5, reload:7.5, scope:6},
               durMax:250},
  /* 바주카 — 어깨에 메는 통. 로켓이 초속 70 m 로 곧게 날아가 부딪히는 자리에서 터진다
     (수류탄과 같은 폭발 · 반경 6 m). 가까이 쏘면 쏜 사람도 다친다. */
  bazooka:    {n:'바주카',     kg:7.0,  c:0x55603f,
               use:'로켓 한 발 · 폭발 420(반경 6 m) · 150 m — 가까이 쏘면 나도 다친다',
               tool:{weapon:1, gun:1, bore:'rocket', dmg:420, reach:150, rate:1.2,
                     stam:6, swing:'shot', mag:1, reload:3.5, rocket:1, blast:6},
               durMax:60},
  // 금속 가공 · 전기
  ring_platinum:{n:'백금 반지', kg:0.05, c:0xd8dce0,
               use:'표류 전부터 끼고 있던 것 — 백금은 촉매가 된다'},
  drawplate:  {n:'인발판',     kg:2.2,  c:0x8f9298, use:'금속을 가늘게 뽑는 판'},
  wire_copper:{n:'구리선',     kg:0.35, c:0xb87333, use:'코일 · 배선'},
  gauze_platinum:{n:'백금 그물망', kg:0.05, c:0xd8dce0,
               use:'오스트발트법 촉매 — 암모니아 원료가 생기면 쓰인다'},
  magnet:     {n:'자석',       kg:1.1,  c:0x5a5f66, use:'발전기 · 아크 확산'},
  electrode:  {n:'탄소 전극',  kg:1.4,  c:0x2a2724, use:'아크로에서 타 없어진다'},
  /* ── 전기를 담고 쓰는 것 ─────────────────────────────────────────────────
     발전기는 하천에 박혀 있다. 축전지는 그 전기를 떼어 들고 나가는 통이고,
     전등은 그 전기를 빛으로 바꾼다. 불씨가 필요 없고 바람에도 안 꺼진다. */
  acid_sulfuric:{n:'황산',     kg:2.4,  c:0xc8b23a,
               use:'백금 위에서 유황을 태워 받았다 — 축전지의 전해액'},
  bulb:       {n:'전구',       kg:0.25, c:0xe4dcc0,
               use:'유리 안에 탄소 실을 걸었다 — 공기를 뺐으니 타지 않고 달아오른다'},
  battery:    {n:'납축전지',   kg:8.2,  c:0x4a4f56,
               use:'납 극판과 황산 — 발전기에서 채워 들고 다닌다. 우클릭으로 전등에 옮긴다',
               durMax:100, cell:1},
  /* 리튬이온 전지 — 흑연 음극 · 인산철리튬(LiFePO4) 양극. 리튬은 화강암을 떼어 낼 때 가끔 딸려 나오는
     리튬휘석(페그마타이트 맥)에서 뽑는다. 무게당 담는 양이 납축전지의 다섯 배쯤(실제 4~5배).
     `cell` 을 단 것이 축전지다 — 발전기가 채우고(비어서 나온다), 전등·드릴이 여기서 옮겨 담는다. */
  battery_li: {n:'리튬이온 전지', kg:3.2, c:0x3a6f9a,
               use:'흑연 음극 · 인산철리튬 양극을 강철 통에 말았다 — 납축전지보다 두 배를 담고 훨씬 가볍다. 우클릭으로 전등·드릴에 옮긴다',
               durMax:200, cell:1},
  spodumene:  {n:'리튬휘석',   kg:1.1,  c:0xb7c7ae, use:'화강암 속 페그마타이트 맥에 박힌 연녹색 기둥 결정 — 리튬이 든다'},
  li_carbonate:{n:'탄산리튬',  kg:0.4,  c:0xf2f2ee, use:'리튬휘석을 구워 황산에 우리고 잿물로 앉힌 흰 가루 — 리튬 전지의 바탕'},
  graphite:   {n:'흑연',       kg:0.4,  c:0x3c3f43, use:'숯을 아크로 달궈 탄소 층을 가지런히 세웠다 — 리튬이 층 사이를 드나드는 음극'},
  cathode_lfp:{n:'인산철리튬', kg:0.6,  c:0x474a46, use:'생선 뼈의 인 · 철 · 리튬을 숯과 함께 아크로 구운 양극 가루'},
  lamp_electric:{n:'전등',     kg:0.9,  c:0xd8d2b8,
               use:'L 로 켜고 끈다 — 전기가 닳으면 축전지에서 옮겨 담는다',
               tool:{lamp:1}, durMax:40},
  /* ── 현대식 화기로 가는 길 ───────────────────────────────────────────────
     볼트 소총이 한 발씩인 것은 세 가지가 없어서다.
     뇌관이 없어 방아쇠 한 번에 확실히 터지지 않고, 흑색화약은 찌꺼기가
     기관부에 눌어붙어 노리쇠를 멈추며, 강선을 깎을 연장이 없다.
     이 셋을 차례로 채운다. */
  pipe_copper:{n:'구리관',     kg:1.1,  c:0xb87333,
               use:'증류기의 사관 — 끓인 김을 식혀 받는다'},
  alcohol:    {n:'알코올',     kg:2.0,  c:0xd8e2e8,
               use:'베리술을 증류해 받았다 — 뇌홍의 재료이자 불붙는 물'},
  fulminate:  {n:'뇌홍',       kg:0.4,  c:0x8a8f96,
               use:'때리면 터진다 — 젖은 채로만 다룬다. 마르면 건드리지 말 것'},
  primer:     {n:'뇌관',       kg:0.02, c:0xc4a747,
               use:'뇌홍을 재운 황동 컵 — 공이가 때리면 불꽃이 인다'},
  guncotton:  {n:'면화약',     kg:0.6,  c:0xe8e4d4,
               use:'섬유를 질산·황산에 담가 받았다 — 무연화약의 밑감'},
  powder_smokeless:{n:'무연화약', kg:0.8, c:0xc8b88a,
               use:'연기도 찌꺼기도 없다 — 노리쇠가 제 힘으로 움직인다',
               },
  spring_steel:{n:'용수철강',  kg:0.5,  c:0x8a9098,
               use:'기름에 담갔다 되뜨임한 강철 — 탄창과 복좌 용수철이 된다'},
  barrel_rifled:{n:'강선 총열', kg:2.4, c:0x6e747a,
               use:'선반으로 안을 넓히고 나선 홈을 깎았다 — 탄이 돌며 날아간다'},
  hammer_stone:{n:'돌망치',    kg:2.4,  c:0x807d76, tags:['hammer'],
               use:'단조용 — 달군 쇠를 두들겨 쇠똥을 짜낸다'},
  iron_wrought:{n:'연철',      kg:1.8,  c:0x8a8078,
               use:'쇠똥을 짜낸 순한 철 — 두들겨 모양을 잡는다'},
  axe_iron:   {n:'철 도끼',    kg:2.4,  c:0x9a938c,
               use:'벌목 — 날이 가장 잘 든다 · 노거수도 벤다', tool:{axe:2,speed:3.2,wear:1}, durMax:900},
  pick_iron:  {n:'철 곡괭이',  kg:3.2,  c:0x9a938c,
               use:'화강암까지 직접 캔다 — 불이 필요 없다',
               tool:{pick:3,speed:3.4,wear:1}, durMax:1000},
  /* 강철 연장 — 담금질한 날이라 무디어지는 속도가 철의 절반이다 */
  axe_steel:  {n:'강철 도끼',  kg:2.3,  c:0x74797f,
               use:'벌목 — 한 번 벼려두면 오래 간다 · 노거수도 벤다',
               tool:{axe:2,speed:4.0,wear:1}, durMax:1800},
  pick_steel: {n:'강철 곡괭이', kg:3.0,  c:0x74797f,
               use:'화강암을 철 곡괭이보다 빠르게 깬다',
               tool:{pick:3,speed:4.3,wear:1}, durMax:2000},
  axe_bronze: {n:'청동 도끼',   kg:2.2,  c:0xa07b3c, use:'벌목 — 석기와 비교가 안 된다',
               tool:{axe:1,speed:2.4,wear:1}, durMax:450},
  pick_bronze:{n:'청동 곡괭이', kg:3.0,  c:0xa07b3c,
               use:'경도 2까지 채굴 — 화강암은 여전히 불로 깨야 한다',
               tool:{pick:2,speed:3.0,wear:1}, durMax:500},
  blade_polished:{n:'마제 석기날', kg:1.2, c:0x8e9298,
               use:'숫돌에 갈아 세운 날 — 도끼·곡괭이 머리', tags:['sharp']},
  axe_stone:  {n:'간석기 도끼', kg:2.6,  c:0x8a8f80,
               use:'벌목 — 간 날이라 오래간다', tool:{axe:1,speed:1.7,wear:1}, durMax:220},
  pick_polished:{n:'간석기 곡괭이', kg:3.6, c:0x86867e,
               use:'경도 2까지 채굴 — 가장 빠르고 오래간다',
               tool:{pick:2,speed:1.9,wear:1}, durMax:260},
  spear:      {n:'돌창',       kg:1.6,  c:0x7a6a4a,
               use:'찌르기 — 길지만 무르다',
               tool:{weapon:1, dmg:22, reach:2.6, rate:0.9, stam:9, swing:'thrust'},
               durMax:60},

  /* 철기 무기 — 넷이 서로 다른 값을 판다.
     검은 빠르게 여러 번, 창은 멀리서, 도끼는 한 번에 크게, 해머는 상대를 멈춰 세운다.
     아르크토스 경직 1.05초짜리 틈에 넣을 수 있는 피해는
       검 3타 90 · 창 2타 80 · 도끼 1타 80 · 해머 1타 55(+기절) 로 엇비슷하다.
     길게 끌면 검이 초당 75 로 가장 세지만, 사거리가 1.5 m 라 곰 품에 들어가야 한다 —
     빠른 만큼 가까이 붙는 것이 검의 값이다. */
  sword_iron: {n:'철 검',      kg:1.9,  c:0xb9bcc0,
               use:'베기 — 가장 빠르다. 짧은 틈에 여러 번 넣는다',
               tool:{weapon:1, dmg:30, reach:1.5, rate:0.40, stam:5, swing:'slash'},
               durMax:700},
  spear_iron: {n:'철 창',      kg:2.4,  c:0xa8adb2,
               use:'찌르기 — 사거리 2.6 m. 닿지 않는 데서 먼저 닿는다',
               tool:{weapon:1, dmg:40, reach:2.6, rate:1.00, stam:8, swing:'thrust'},
               durMax:650},
  axe_war:    {n:'철 전투도끼', kg:3.0,  c:0x9aa0a6,
               use:'내리찍기 — 한 방이 가장 크다. 대신 느리다',
               tool:{weapon:1, dmg:80, reach:2.1, rate:1.60, stam:15, swing:'slash'},
               durMax:800},
  hammer_iron:{n:'철 해머',    kg:4.2,  c:0x8f959b,
               use:'후려치기 — 맞은 것은 0.2초 동안 못 움직인다',
               tool:{weapon:1, dmg:55, reach:2.1, rate:1.20, stam:17, swing:'smash',
                     stun:0.2},
               durMax:950},
  /* 강철 무기 — 담금질한 날이라 철보다 **세고 조금 빠르고 훨씬 오래 간다**.
     피해는 철의 5분의 6, 쿨타임은 10분의 9, 내구는 갑절이 기준이다.
     무게는 오히려 조금 가볍다 — 같은 굳기를 더 얇은 날로 낼 수 있기 때문이다.
     섬에서 벼릴 수 있는 마지막 단계이므로 여기서 더 올라갈 데는 없다. */
  sword_steel:{n:'강철 검',    kg:1.8,  c:0x74797f,
               use:'베기 — 철 검보다 세고 빠르다. 날에 혈조를 파 무게를 덜었다',
               tool:{weapon:1, dmg:38, reach:1.5, rate:0.36, stam:5, swing:'slash'},
               durMax:1500},
  spear_steel:{n:'강철 창',    kg:2.3,  c:0x74797f,
               use:'찌르기 — 사거리 2.6 m. 버들잎꼴 날이 깊이 들어간다',
               tool:{weapon:1, dmg:50, reach:2.6, rate:0.90, stam:8, swing:'thrust'},
               durMax:1400},
  axe_steel_war:{n:'강철 전투도끼', kg:2.9, c:0x74797f,
               use:'내리찍기 — 한 방이 가장 크다. 수염날이 걸어 당긴다',
               tool:{weapon:1, dmg:100, reach:2.1, rate:1.44, stam:15, swing:'slash'},
               durMax:1700},
  hammer_steel:{n:'강철 해머',  kg:4.0,  c:0x74797f,
               use:'후려치기 — 맞은 것은 0.28초 동안 못 움직인다',
               tool:{weapon:1, dmg:70, reach:2.1, rate:1.08, stam:17, swing:'smash',
                     stun:0.28},
               durMax:2000},
  /* 잿불 무기 넷 — 강철 무기 넷의 쇠붙이(검은 날만 · 창은 날과 투겁 · 도끼·해머는 머리)를 **손잡이만 빼고** 애쉬스케일의
     잿불 비늘로 빈틈없이 감쌌다. 비늘은 불에 타지 않고 열을 머금고 있다가 맞은 자리를 지진다.
     성능은 밑바탕 강철 무기 그대로(해머는 기절도 그대로)에, 맞은 것이 **0.5초 동안 0.1초마다 5**
     (모두 25)를 더 입는다(`tool.burn`). **화상은 겹치지 않는다** — 타는 동안 또 맞으면 남은
     시간만 0.5초로 되돌린다. 비늘 무게만큼 조금 무겁다. */
  sword_ember:{n:'잿불 검',    kg:2.2,  c:0x2a1a14,
               use:'베기 — 강철 검의 날만 잿불 비늘로 감쌌다. 벤 자리를 0.5초 동안 지진다(겹치지 않음)',
               tool:{weapon:1, dmg:38, reach:1.5, rate:0.36, stam:5, swing:'slash',
                     burn:{t:0.5, every:0.1, dmg:5}},
               durMax:1500},
  spear_ember:{n:'잿불 창',    kg:2.5,  c:0x2a1a14,
               use:'찌르기 — 강철 창의 날과 투겁을 잿불 비늘로 감쌌다. 찌른 자리를 0.5초 동안 지진다(겹치지 않음)',
               tool:{weapon:1, dmg:50, reach:2.6, rate:0.90, stam:8, swing:'thrust',
                     burn:{t:0.5, every:0.1, dmg:5}},
               durMax:1400},
  axe_ember_war:{n:'잿불 전투도끼', kg:3.3, c:0x2a1a14,
               use:'내리찍기 — 강철 전투도끼 머리를 잿불 비늘로 감쌌다. 찍은 자리를 0.5초 동안 지진다(겹치지 않음)',
               tool:{weapon:1, dmg:100, reach:2.1, rate:1.44, stam:15, swing:'slash',
                     burn:{t:0.5, every:0.1, dmg:5}},
               durMax:1700},
  hammer_ember:{n:'잿불 해머',  kg:4.5,  c:0x2a1a14,
               use:'후려치기 — 강철 해머 머리를 잿불 비늘로 감쌌다. 0.28초 기절에 0.5초 화상(겹치지 않음)',
               tool:{weapon:1, dmg:70, reach:2.1, rate:1.08, stam:17, swing:'smash',
                     stun:0.28, burn:{t:0.5, every:0.1, dmg:5}},
               durMax:2000},
  /* 사냥물 무기 — 철보다 **약하고 빨리 닳는 대신, 훨씬 가볍고 조금 빠르다**.
     피해는 철의 3/4, 쿨타임은 9/10, 무게는 55~60%, 내구는 45% 쯤이 기준이다.
     짐 무게가 곧 이동 속도인 이 게임에서, 가벼움은 그 자체로 값이다. */
  sword_chitin:{n:'키틴 검',    kg:1.1,  c:0x5b6d5e,
               use:'가고일 껍질을 겹쳐 세운 날 — 철 검의 4분의 3 피해를 5분의 4 쿨로 — 절반 무게다',
               tool:{weapon:1, dmg:22, reach:1.5, rate:0.32, stam:5, swing:'slash'},
               durMax:320},
  spear_bone: {n:'뼈 창',      kg:1.4,  c:0xcfc6a8,
               use:'긴 뼈를 갈아 세운 창끝 — 철 창과 같은 사거리 · 4분의 3 피해를 5분의 4 쿨로',
               tool:{weapon:1, dmg:30, reach:2.6, rate:0.80, stam:8, swing:'thrust'},
               durMax:300},
  axe_chitin: {n:'키틴 도끼',   kg:1.8,  c:0x53685a,
               use:'키틴 판을 뼈 심에 물린 큰 날 — 철 도끼의 4분의 3 피해를 5분의 4 쿨로',
               tool:{weapon:1, dmg:60, reach:2.1, rate:1.28, stam:15, swing:'slash'},
               durMax:360},
  hammer_bone:{n:'뼈 해머',    kg:2.5,  c:0xc7bfa2,
               use:'관절 뼈를 통째로 박은 머리 — 철 해머의 4분의 3 피해를 5분의 4 쿨로. 0.2초 기절',
               tool:{weapon:1, dmg:41, reach:2.1, rate:0.96, stam:17, swing:'smash',
                     stun:0.2},
               durMax:420},
  torch:      {n:'횃불',       kg:0.8,  c:0xc07a30, use:'휴대 조명 · 모닥불 점화 · 약한 화입 — 들고 좌클릭으로 켜고 끈다',
               tool:{torch:1}, burn:3.0},   // burn = 게임시간(h)
  /* 기름 등잔 — 횃불과 같은 불(tool.torch)이되 곰 기름을 먹여 네 배 오래 탄다.
     토기에 기름을 붓고 섬유 심지를 세웠다. 불을 옮겨 붙이는 것도 횃불과 같다. */
  /* 전동 드릴 — 전기로 도는 강철 날끝. 곡괭이처럼 캐되 훨씬 빠르다. 내구가 곧 충전량이라
     닳으면 부서지지 않고 멈춘다 — 지닌 납축전지에서 저절로 옮겨 담거나 발전기 곁에서 채운다. */
  drill:      {n:'전동 드릴',   kg:3.4,  c:0x5a5f66, use:'전기 곡괭이 — 강철 곡괭이의 두 배 빠르기. 축전지로 채운다',
               tool:{pick:3, speed:8.5, wear:1, drill:1}, durMax:120},
  /* 수류탄 — 던지면 포물선을 그리며 날아가 3.5초 뒤 터진다. 반경 7 m 안을 다치게 하고
     (가운데일수록 세다) 화강암 노두를 깨뜨린다. 던진 사람도 가까우면 다친다. */
  grenade:    {n:'수류탄',     kg:0.6,  c:0x4a5a44, use:'던져서 3.5초 뒤 터진다 — 반경 7 m · 화강암을 깨뜨린다',
               tool:{weapon:1, throw:1, dmg:330, reach:7, rate:0.9, stam:6, swing:'thrust', fuse:3.5}},
  lamp_oil:   {n:'기름 등잔',   kg:1.6,  c:0xb08a4a, use:'휴대 조명 — 곰 기름을 태워 횃불보다 네 배 오래 간다',
               tool:{torch:1}, burn:12.0},

  /* ── 활과 화살 ──────────────────────────────────────────────────────────
     돌창 다음 · 총 이전의 원거리 무기. 총과 같은 틀(tool.gun)을 쓴다 — 시위에 한 대를
     메기는 것이 '재장전'이고(mag 1), 화살이 탄이다(ammo.bore 'arrow'). 쏜 화살은 돌아오지 않는다. */
  bow_wood:   {n:'나무 활',    kg:0.9,  c:0x7a5a36,
               use:'통나무를 깎아 휜 외목 활 — 사거리 30 m · 한 대씩 메긴다',
               tool:{weapon:1, gun:1, bore:'arrow', dmg:34, reach:30, rate:1.10,
                     stam:6, swing:'shot', mag:1, reload:1.1},
               durMax:180},
  /* 뼈를 덧댄 활 — 배에 뼈판을 대고 등에 가죽을 붙여 되튕기는 힘을 키웠다.
     가죽이 귀하므로 한 장만 쓰고, 그 값을 사거리·피해로 돌려받는다. */
  bow_bone:   {n:'뼈 덧댄 활', kg:1.1,  c:0xb4a684,
               use:'뼈판과 가죽을 겹댄 합성 활 — 사거리 45 m · 나무 활의 1.6배 피해',
               tool:{weapon:1, gun:1, bore:'arrow', dmg:55, reach:45, rate:1.05,
                     stam:7, swing:'shot', mag:1, reload:1.2},
               durMax:320},
  arrow_flint:{n:'부싯돌 화살', kg:0.06, c:0x7c7466, tags:['ammo'],
               use:'부싯돌 격지를 촉으로 끼운 화살', ammo:{dmg:1.0, bore:'arrow'}},
  arrow_bone: {n:'뼈 화살',    kg:0.06, c:0xcfc6a8, tags:['ammo'],
               use:'뼈를 갈아 세운 촉 — 부싯돌보다 덜 부러지고 깊이 박힌다',
               ammo:{dmg:1.15, bore:'arrow'}},
  arrow_iron: {n:'쇠 화살',    kg:0.07, c:0x8f959b, tags:['ammo'],
               use:'연철을 두드려 뽑은 촉 — 가죽도 뚫는다', ammo:{dmg:1.35, bore:'arrow'}},

  /* ── 먹을 것 ───────────────────────────────────────────────────────────
     국은 배와 목을 함께 채우고 토기를 돌려준다(water · empty). 말린 것은 가볍고 날것이 아니다. */
  stew_meat:  {n:'고깃국',     kg:3.9,  c:0x8a5a3a, use:'곰 고기를 토기에 넣고 끓였다 — 배와 목을 함께 채운다',
               food:50, water:30, empty:'pot'},
  stew_fish:  {n:'생선국',     kg:3.6,  c:0xb09a78, use:'물고기 두 마리를 끓였다 — 배와 목을 함께 채운다',
               food:36, water:30, empty:'pot'},
  jerky:      {n:'육포',       kg:0.4,  c:0x6a3a28, use:'불가에 오래 말린 곰 고기 — 가볍고 날것이 아니다',
               food:20},
  fish_dried: {n:'말린 생선',  kg:0.25, c:0x9a8060, use:'배를 갈라 불가에 말렸다 — 가볍게 들고 다닌다',
               food:12},
  fat:        {n:'곰 기름',    kg:0.5,  c:0xe0d4a8, use:'곰 고기를 토기에 졸여 받은 기름 — 등잔을 밝힌다'},

  /* ── 감는 것 · 달인 것 ─────────────────────────────────────────────────── */
  bandage_fiber:{n:'섬유 붕대', kg:0.15, c:0xc8c0a0, use:'섬유를 촘촘히 떠 감는 띠 — 조금 아문다',
               heal:{hp:12, stam:10}},
  bandage_clean:{n:'소독 붕대', kg:0.18, c:0xe4e0d4, use:'알코올에 적셔 말린 섬유 붕대 — 상처가 덧나지 않는다',
               heal:{hp:30, ill:1, stam:20}},
  herb_tea:   {n:'약초 달인 물', kg:3.5, c:0x7a8a4a, use:'풀과 베리를 토기에 달였다 — 탈 난 속을 가라앉힌다',
               heal:{ill:1, stam:15, water:25, empty:'pot'}},

  /* ── 가죽 — 아르크토스 한 마리에 세 장뿐이다. 그래서 한 가지에 한두 장만 쓴다 ── */
  pack_hide:  {n:'가죽 배낭',  kg:1.6,  c:0x7a5a3c,
               use:'가죽 두 장을 뼈 틀에 씌워 지은 배낭 — 엮은 등짐의 두 배를 진다',
               wear:{slot:'back', carry:30}},
  waterskin:  {n:'빈 가죽 물주머니', kg:0.35, c:0x7a5a3c,
               use:'가죽 한 장을 겹쳐 꿰맨 주머니 — 깨지지 않는다. 하천·온천에서 채운다'},
  waterskin_water:{n:'가죽 물주머니', kg:1.35, c:0x5f6f7a,
               use:'세 모금 든 물주머니 — 다 마시면 빈 주머니가 남는다',
               sips:3, drink:{n:45, empty:'waterskin'}},
  helm_hide:  {n:'가죽 모자',  kg:0.5,  c:0x8a6a4a,
               use:'가죽 한 장으로 지은 모자 — 막는 힘은 작아도 따뜻하다',
               wear:{slot:'head', armor:1, warm:3}},
  helm_bone:  {n:'뼈 투구',    kg:2.0,  c:0xcfc6a8,
               use:'두개골 뼈판을 가죽 안감에 꿰었다 — 키틴 투구보다 한 칸 약하고 무겁다',
               wear:{slot:'head', armor:2, warm:1}},

  // 곡괭이 — 석기로 감당되는 건 무른 광물까지다
  pick_crude: {n:'간이 곡괭이',     kg:1.6,  c:0x8a7a52, use:'무른 광물 채굴 (점토 · 늪철광 · 석석)',
               tool:{pick:1,speed:1,wear:2}, durMax:45},
  pick_stone: {n:'돌 곡괭이',  kg:3.2,  c:0x7d7a70, use:'석탄 · 공작석까지 채굴',
               tool:{pick:2,speed:1.4,wear:1}, durMax:90},

  /* ── 바다 ─────────────────────────────────────────────────────────────
     바다가 휑했다(사용자 요청). 산호밭 · 물고기 떼 · 조개 · 굴 · 성게를 넣고(`SEA` · `FISH`), 그것을 얻을 장비를 둔다.
     · 풀(풀죽) — 풀잎을 고아 만든 접착제. 스노클 · 물안경 · 작살의 이음매를 붙인다
     · 밧줄 — 노끈 세 가닥. 오리발 끈 · 작살 줄
     · 스노클 · 오리발 · 물안경 — **지니고만 있으면** 듣는다(입는 칸을 차지하지 않는다)
     · 작살 — 물속에서 물고기를 찌르는 창. `tool.harpoon` 등급이 물고기 등급 이상이어야 박힌다
       (나무 1 — 잔고기 · 돌 2 — 장어·대구까지 · 쇠 3 — 참치·황새치) */
  glue:       {n:'풀(풀죽)',   kg:0.30, c:0xd8d2a8, use:'풀잎을 푹 고아 만든 끈끈한 풀 — 이음매를 붙이고 물이 새지 않게 메운다'},
  rope:       {n:'밧줄',       kg:0.90, c:0x9a8a5e, use:'노끈 세 가닥을 꼬았다 — 작살 줄 · 오리발 끈'},
  snorkel:    {n:'갈대 스노클', kg:0.30, c:0x9aa35c, use:'지니고 있으면 얼굴을 물에 담근 채 숨을 쉰다(수면 바로 밑까지)'},
  fins:       {n:'오리발',     kg:1.00, c:0x6f8a4a, use:'지니고 있으면 헤엄이 1.5배 빨라지고 기력이 절반만 든다'},
  goggles:    {n:'물안경',     kg:0.40, c:0x9fc6cc, use:'지니고 있으면 물속이 두 배 넘게 멀리 보인다'},
  harpoon_wood:{n:'나무 작살', kg:1.0,  c:0x8a7550, use:'끝을 깎아 그을린 가지 — 물속의 잔고기를 찌른다(등급 1)',
               tool:{weapon:1, dmg:10, reach:2.5, rate:0.75, stam:6, swing:'thrust', harpoon:1}, durMax:40},
  harpoon_stone:{n:'돌 작살',  kg:1.5,  c:0x6f7478, use:'미늘 달린 돌촉을 풀로 붙이고 밧줄을 맸다 — 장어·대구까지(등급 2)',
               tool:{weapon:1, dmg:20, reach:2.7, rate:0.80, stam:8, swing:'thrust', harpoon:2, stun:0.5}, durMax:110},
  harpoon_iron:{n:'쇠 작살',   kg:2.2,  c:0xa9afb5, use:'연철 촉에 미늘 둘 — 참치·황새치도 꿴다(등급 3)',
               tool:{weapon:1, dmg:36, reach:3.0, rate:0.80, stam:8, swing:'thrust', harpoon:3, stun:0.9}, durMax:320},
  clownfish: {n:'흰동가리', kg:0.15, c:0xf07a2a, use:'산호밭에 사는 주황 줄무늬 잔고기',
               food:4, raw:true, fishy:1, tags:['fish']},
  clownfish_cooked:{n:'구운 흰동가리', kg:0.14, c:0xcc7131, use:'불에 익혔다',
               food:12, fishy:1},
  angelfish: {n:'엔젤피시', kg:0.30, c:0xe8c84a, use:'산호밭의 납작하고 키 큰 물고기',
               food:5, raw:true, fishy:1, tags:['fish']},
  angelfish_cooked:{n:'구운 엔젤피시', kg:0.27, c:0xc7a044, use:'불에 익혔다',
               food:15, fishy:1},
  pufferfish: {n:'복어', kg:0.60, c:0xc8b070, use:'날로 먹으면 독에 쓰러진다 — 반드시 구워 먹는다',
               food:3, poison:42, fishy:1, tags:['fish']},   // food 가 0 이면 '먹을 것'으로 안 쳐서 손에 들 수도 없다
  pufferfish_cooked:{n:'구운 복어', kg:0.54, c:0xb4915b, use:'불에 익혔다',
               food:30, fishy:1},
  eel:       {n:'장어', kg:0.90, c:0x4a4a3a, use:'산호 틈에 숨는 긴 물고기 — 기름지다',
               food:8, raw:true, fishy:1, tags:['fish']},
  eel_cooked:{n:'구운 장어', kg:0.81, c:0x68543a, use:'불에 익혔다',
               food:34, fishy:1},
  flounder:  {n:'넙치', kg:0.80, c:0x9a8a62, use:'모래 바닥에 붙어 사는 납작한 물고기',
               food:8, raw:true, fishy:1, tags:['fish']},
  flounder_cooked:{n:'구운 넙치', kg:0.72, c:0x987a52, use:'불에 익혔다',
               food:30, fishy:1},
  mackerel:  {n:'고등어', kg:0.50, c:0x4a7a9a, use:'떼 지어 다니는 등 푸른 물고기',
               food:7, raw:true, fishy:1, tags:['fish']},
  mackerel_cooked:{n:'구운 고등어', kg:0.45, c:0x687174, use:'불에 익혔다',
               food:26, fishy:1},
  corvina:   {n:'조기', kg:0.60, c:0xc9b46a, use:'얕은 바다의 누런 물고기',
               food:8, raw:true, fishy:1, tags:['fish']},
  corvina_cooked:{n:'구운 조기', kg:0.54, c:0xb49457, use:'불에 익혔다',
               food:28, fishy:1},
  cod:       {n:'대구', kg:1.60, c:0x8a8f7a, use:'깊은 데 사는 큰 물고기 — 살이 많다',
               food:10, raw:true, fishy:1, tags:['fish']},
  cod_cooked:{n:'구운 대구', kg:1.44, c:0x8e7d61, use:'불에 익혔다',
               food:34, fishy:1},
  tuna:      {n:'참치 살', kg:1.50, c:0xa03a48, use:'먼바다 참치에서 떠낸 붉은 살 — 날로도 먹는다',
               food:16},
  tuna_cooked:{n:'구운 참치 살', kg:1.35, c:0x9c4a43, use:'불에 익혔다',
               food:38},
  swordfish: {n:'황새치 살', kg:1.50, c:0xd8b0a4, use:'먼바다 황새치에서 떠낸 살 — 날로도 먹는다',
               food:14},
  swordfish_cooked:{n:'구운 황새치 살', kg:1.35, c:0xbd917a, use:'불에 익혔다',
               food:38},
  clam:      {n:'조개', kg:0.25, c:0xd8cdb8, use:'모래 바닥에서 주운 조개',
               food:4, raw:true},
  clam_cooked:{n:'구운 조개', kg:0.23, c:0xbda386, use:'불에 익혔다',
               food:14},
  oyster:    {n:'굴', kg:0.30, c:0x9a9a8e, use:'바위에서 떼어 낸 굴 — 날로도 먹는다',
               food:8},
  oyster_cooked:{n:'구운 굴', kg:0.27, c:0x98846d, use:'불에 익혔다',
               food:16},
  urchin:    {n:'성게', kg:0.30, c:0x3a2a4a, use:'가시투성이 속에 든 노란 알 — 날로 먹는다',
               food:10}
};
ITEMS.fish.tags=['fish']; ITEMS.fish.fishy=1; ITEMS.fish_cooked.fishy=1; ITEMS.fish_dried.fishy=1;   // 그물로 건진 '물고기'도 같은 분류다
const INV={base:70, max:70, slots:[], sel:0,      // 기본 적재 70 kg + 등짐 보너스
           view:'all', pockets:[], ren:0};         // 보는 갈래('all' · 'c:갈래' · 'p:칸 번호') · 내가 만든 칸 이름들 · 이름 고치는 중인 칸
/* 물건의 갈래 — 소지품 목록을 이 차례로 묶는다 */
const ITEM_CATS=[['tool','도구'],['weapon','무기'],['wear','옷·갑옷'],['food','먹을 것·약'],['mat','재료'],['etc','기타']];
function itemCat(T){
  const W=T.tool;
  if(T.read||T===ITEMS.codex||T===ITEMS.ring_platinum) return 'etc';
  if((W&&(W.weapon||W.gun||W.throw||W.harpoon))||T.ammo) return 'weapon';
  if(W) return 'tool';
  if(T.wear) return 'wear';
  if(T.food||T.drink||T.heal) return 'food';
  return 'mat';
}
/* 착용 칸. 각 칸은 인벤토리 슬롯을 가리킨다 — 입은 것도 무게에는 그대로 포함된다. */
const WEAR={body:null, armor:null, head:null, back:null};
const WEAR_N={body:'옷', armor:'갑옷', head:'머리', back:'등짐'};
function wornSum(key){
  let v=0;
  for(const k in WEAR){
    const sl=WEAR[k];
    if(sl && INV.slots.indexOf(sl)>=0) v+=(ITEMS[sl.id].wear[key]||0);
  }
  return v;
}
function refreshWear(){
  for(const k in WEAR) if(WEAR[k] && INV.slots.indexOf(WEAR[k])<0) WEAR[k]=null;
  INV.max=INV.base+wornSum('carry');
}
const armorTotal =()=>wornSum('armor');
/* 갑옷이 깎는 피해 — 예전에는 방어/24 를 곧장 빼고 0.72 에서 잘랐다.
   방어 17.3 이면 이미 상한이라, 그 위로는 몇 점을 더 입어도 똑같았다
   (강철 한 벌 20 과 복합 한 벌 18 이 실제 피해에서 구별되지 않았다).
   이제 1/(1+방어/k) 로 준다 — 상한이 없고 100% 에 닿지도 않으며,
   한 점을 더 입을 때마다 덜 늘어나되 늘긴 언제나 는다.
   k 는 "피해가 절반이 되는 방어" 다 — 10 이면 방어 10 에서 반이 깎인다. */
const ARMOR_K=5;
const armorMul=()=>ARMOR_K/(ARMOR_K+Math.max(0,armorTotal()));
const warmthTotal=()=>wornSum('warm');

const countId=id=>INV.slots.reduce((a,s)=>a+(s.id===id?s.n:0),0);
function invWeight(){
  refreshWear();
  let w=0; for(const s of INV.slots) w+=ITEMS[s.id].kg*s.n;
  return w;
}
const invLoad=()=>clamp(invWeight()/INV.max,0,1);

function invAdd(id,n){
  n=n||1;
  const T=ITEMS[id];
  if(invWeight()+T.kg*n > INV.max+1e-6) return false;
  /* 칸마다 남은 양이 다른 것은 겹치지 않는다 — 도구(내구) · 물통(모금) ·
     축전지(전기). 내구를 지닌 것이면 도구가 아니어도 따로 선다. */
  if(T.tool||T.sips||T.durMax){
    for(let k=0;k<n;k++){
      const sl={id,n:1};
      if(T.frac){ sl.amt=1; INV.slots.push(sl); continue; }       // 시멘트 — 통에 남은 양(1 = 가득)
      if(T.sips) sl.sip=T.sips;                                 // 남은 모금
      else if(T.burn!==undefined){ sl.fuel=T.burn; sl.lit=false; }   // 횃불
      else sl.dur=T.cell?0:T.durMax;   // 축전지(cell)는 비어서 나온다
      if(T.tool&&T.tool.gun) sl.mag=0;                          // 총은 빈 탄창으로 나온다
      INV.slots.push(sl);
    }
  }else{
    const s=INV.slots.find(x=>x.id===id&&x.dur===undefined&&x.sip===undefined);
    if(s) s.n+=n; else INV.slots.push({id,n:n});
  }
  invDirty=true; return true;
}
function invRemove(idx,n){
  const s=INV.slots[idx]; if(!s) return;
  s.n-=(n===undefined?1:n);
  if(s.n<=0){ INV.slots.splice(idx,1); quickDirty=true; }
  INV.sel=clamp(INV.sel,0,Math.max(0,INV.slots.length-1));
  invDirty=true;
}
let invDirty=true, invOpen=false;
function drawInv(){
  const L=document.getElementById('invL'), w=invWeight();
  const wt=w.toFixed(1)+' / '+INV.max+' kg';
  const b=document.getElementById('invW');
  b.textContent=wt; b.className=invLoad()>0.85?'over':'';
  document.getElementById('wgT').textContent=wt;
  const f=document.getElementById('wgF');
  f.style.width=(invLoad()*100)+'%';
  f.style.background=invLoad()>0.85?'#d8724a':(invLoad()>0.6?'#d8c96a':'#8fd6b4');
  if(!invOpen) return;
  // 착용 칸 · 방어 · 보온 요약
  let wh='<div class="wr">';
  // 손 — 도구·무기·그물을 드는 자리
  wh+='<div class="ws slot" data-slot="hand"><span>손</span>'
    +(EQUIP?'<b draggable="true">'+ITEMS[EQUIP.id].n+'</b>':'<i>비어 있음</i>')+'</div>';
  for(const k of ['body','armor','head','back']){
    const sl=WEAR[k];
    wh+='<div class="ws slot" data-slot="'+k+'"><span>'+WEAR_N[k]+'</span>'
      +(sl?'<b draggable="true">'+ITEMS[sl.id].n+'</b>':'<i>비어 있음</i>')+'</div>';
  }
  // 입 — 먹을 것을 끌어다 놓으면 먹는다
  wh+='<div class="ws slot" data-slot="eat"><span>쓰기</span>'
    +'<i>먹을 것 · 마실 것 · 붕대를 여기로</i></div>';
  // 버리기 — 끌어다 놓으면 그 칸을 통째로 버린다(Shift 를 누른 채 놓으면 1개만)
  wh+='<div class="ws slot" data-slot="trash"><span>🗑 버리기</span>'
    +'<i>끌어다 놓는다 · Shift=1개</i></div>';
  wh+='<div class="ws"><span>방어 / 보온</span><b>'+armorTotal()+' / '+warmthTotal()+'</b></div>';
  if(wornSum('carry')) wh+='<div class="ws"><span>적재 보너스</span><b>+'
    +wornSum('carry')+' kg</b></div>';
  wh+='</div>';
  if(INV.ren) return;                               // 칸 이름을 치는 중 — 목록을 다시 그리면 글칸이 사라진다
  /* ── 갈래 · 내 칸(사용자 요청: 소지품을 갈래지어 보고, 내가 칸을 만들어 나눠 담는다) ──
     위 줄의 단추로 본다: 전체 · 갈래(도구·무기·옷·먹을 것·재료·기타) · 내 칸. 물건을 **칸 단추에 끌어다 놓으면** 그 칸에 든다
     (전체에 놓으면 칸에서 뺀다). 칸은 여섯까지 — '＋ 칸' 으로 만들고, 칸을 고른 채 '이름'·'칸 지우기'. 칸은 슬롯에 붙는다(`pk`) —
     같은 물건을 더 주우면 그 칸에 그대로 쌓인다. 저장된다 */
  const esc=t=>String(t).replace(/[<>&"]/g,'');
  let view=INV.view||'all';
  if(view[0]==='p'&&!INV.pockets[+view.slice(2)-1]) view=INV.view='all';
  const cnt=k=>INV.slots.filter(sl=>itemCat(ITEMS[sl.id])===k).length;
  const chip=(v,txt,cls)=>'<button data-v="'+v+'" class="'+(view===v?'on ':'')+(cls||'')+'">'+txt+'</button>';
  let ch='<div class="ic">'+chip('all','전체 '+INV.slots.length,'drop');
  for(const [k,n] of ITEM_CATS){ const c=cnt(k); if(c) ch+=chip('c:'+k,n+' '+c); }
  ch+='<i class="sep"></i>';
  INV.pockets.forEach((nm,i)=>{ ch+=chip('p:'+(i+1),'▣ '+esc(nm)+' '+INV.slots.filter(sl=>sl.pk===i+1).length,'pk drop'); });
  if(INV.pockets.length<6) ch+='<button data-v="+" class="add">＋ 칸</button>';
  if(view[0]==='p') ch+='<button data-v="ren" class="add">이름</button><button data-v="del" class="add">칸 지우기</button>';
  ch+='</div>';
  const row=i=>{
    const s=INV.slots[i], t=ITEMS[s.id];
    return '<div class="it" data-i="'+i+'" data-tipi="'+s.id+'" draggable="true">'
      +iconTag(s.id,t)
      +'<span class="nm">'+t.n+' <span class="qt">×'+s.n+'</span>'
      +(s===EQUIP?'<span class="eq">장착</span>':'')
      +(t.wear&&WEAR[t.wear.slot]===s?'<span class="eq">착용</span>':'')
      +(s.dur!==undefined?'<span class="eq" style="color:#8fd6b4">'+(Math.round(s.dur*10)/10)+'/'+t.durMax+'</span>':'')
      +(s.sip!==undefined?'<span class="eq" style="color:#6f9ec9">'+s.sip+'모금</span>':'')
      +(s.amt!==undefined?'<span class="eq" style="color:#c8c8c0">'+Math.round(s.amt*100)+'%</span>':'')
      +(s.fuel!==undefined?'<span class="eq" style="color:'+(s.lit?'#e08a3a':'#5d7a71')+'">'
        +(s.lit?'타는 중 ':'꺼짐 ')+Math.round(s.fuel/t.burn*100)+'%</span>':'')
      +'<span class="u">'+t.use+'</span></span>'
      +'<span class="kg">'+(t.kg*s.n).toFixed(1)+' kg</span></div>';
  };
  const all=INV.slots.map((_,i)=>i);
  const sect=(title,ids,cls,v)=>ids.length?'<div class="ig '+(cls||'')+'"'+(v?' data-v="'+v+'"':'')+'>'+title+'<span>'+ids.length+'</span></div><div class="igL">'+ids.map(row).join('')+'</div>':'';
  let body='';
  if(!INV.slots.length) body='<div class="ie">비어 있음</div>';
  else if(view==='all'){
    INV.pockets.forEach((nm,pi)=>{ body+=sect('▣ '+esc(nm),all.filter(i=>INV.slots[i].pk===pi+1),'pk drop','p:'+(pi+1)); });
    for(const [k,n] of ITEM_CATS) body+=sect(n,all.filter(i=>!INV.slots[i].pk&&itemCat(ITEMS[INV.slots[i].id])===k));
  }else{
    const ids=view[0]==='p'?all.filter(i=>INV.slots[i].pk===+view.slice(2)):all.filter(i=>itemCat(ITEMS[INV.slots[i].id])===view.slice(2));
    body=ids.length?'<div class="igL">'+ids.map(row).join('')+'</div>'
        :'<div class="ie">'+(view[0]==='p'?'이 칸은 비었다 — 물건을 위의 칸 단추로 끌어다 놓는다':'이 갈래의 물건이 없다')+'</div>';
  }
  /* **같은 내용이면 다시 쓰지 않는다**(main) — 칸 하나를 누를 때마다 목록을 통째로 다시 쓰면 아이콘 <img> 가 새로 만들어져
     한 프레임 비어 보였다(창을 누를 때마다 깜박임). 내용이 바뀔 때만 다시 쓰고, 고른 칸이 바뀐 것은 표시(sel)만 옮긴다 */
  const html=wh+ch+body;
  if(L._html!==html){
    const keepScroll=L.scrollTop;                 // 다시 그려도 굴린 자리는 그대로
    L.innerHTML=html; L._html=html;
    L.scrollTop=keepScroll;
    L.querySelectorAll('.it').forEach(el=>{
      el.onclick=()=>{ INV.sel=+el.dataset.i; invDirty=true; };
    });
    L.querySelectorAll('.ic button').forEach(el=>{ el.onclick=()=>invChip(el.dataset.v,el); });
    /* 칸 단추·칸 머리줄에 끌어다 놓으면 그 칸에 든다('전체' 에 놓으면 칸에서 뺀다) */
    L.querySelectorAll('.drop').forEach(el=>{
      el.ondragover=ev=>{ if(DRAG){ ev.preventDefault(); ev.stopPropagation(); el.classList.add('over'); } };
      el.ondragleave=()=>el.classList.remove('over');
      el.ondrop=ev=>{ ev.preventDefault(); ev.stopPropagation(); el.classList.remove('over');
        const sl=DRAG; DRAG=null; if(!sl||INV.slots.indexOf(sl)<0) return;
        const v=el.dataset.v, pk=v==='all'?0:+v.slice(2);
        sl.pk=pk||undefined; invDirty=true; sfx('bind');
        toast(pk?ITEMS[sl.id].n+' → ▣ '+INV.pockets[pk-1]:ITEMS[sl.id].n+' — 칸에서 뺐다'); };
    });
    wireDrag(L);
  }
  L.querySelectorAll('.it').forEach(el=>el.classList.toggle('sel',+el.dataset.i===INV.sel));
  if(typeof drawSel==='function') drawSel();      // 가운데 '고른 물건' 칸(98-bag.js)
}
/* 소지품 윗줄의 단추 — 볼 갈래를 바꾸거나, 칸을 만들고 · 이름을 고치고 · 지운다 */
function invChip(v,el){
  if(v==='+'){ if(INV.pockets.length>=6) return; INV.pockets.push('칸 '+(INV.pockets.length+1)); INV.view='p:'+INV.pockets.length; invDirty=true; drawInv(); invChip('ren'); return; }
  if(v==='del'){ const pi=+INV.view.slice(2);
    for(const sl of INV.slots){ if(sl.pk===pi) sl.pk=undefined; else if(sl.pk>pi) sl.pk--; }
    INV.pockets.splice(pi-1,1); INV.view='all'; invDirty=true; return; }
  if(v==='ren'){                                   // 칸 단추 자리에 글칸을 세운다 — Enter 로 정하고 Esc 로 그만둔다
    const pi=+INV.view.slice(2), chip=document.querySelector('#invL .ic button.pk.on'); if(!chip) return;
    const inp=document.createElement('input'); inp.type='text'; inp.maxLength=10; inp.value=INV.pockets[pi-1]; inp.className='pkn';
    INV.ren=pi; chip.replaceWith(inp); inp.focus(); inp.select();
    const done=ok=>{ if(!INV.ren) return; INV.ren=0; const t=inp.value.trim(); if(ok&&t) INV.pockets[pi-1]=t; invDirty=true; };
    inp.onkeydown=ev=>{ ev.stopPropagation(); if(ev.key==='Enter') done(true); else if(ev.key==='Escape') done(false); };
    inp.onblur=()=>done(true);
    return; }
  INV.view=v; invDirty=true;
}

/* ── 끌어 놓기 ──────────────────────────────────────────────────────────
   목록에서 칸으로 끌면 들거나 입고, 칸에서 목록으로 끌면 내려놓는다.
   빠른 칸(1~5)에도 끌어다 넣을 수 있다. 쥔 것은 소지품 슬롯 자체를 가리키므로
   무게는 그대로다 — 자리만 옮긴다. */
let DRAG=null;                                      // 지금 끌고 있는 슬롯
function dragPut(where,one){
  const sl=DRAG; DRAG=null;
  if(!sl || INV.slots.indexOf(sl)<0) return;
  const T=ITEMS[sl.id];
  if(where==='eat'){ eatSlot(sl); return; }
  if(where==='trash'){                              // 버리기 — 되돌릴 수 없다
    const n=one?1:sl.n;
    invRemove(INV.slots.indexOf(sl),n);
    refreshWear(); quickDirty=true;
    toast('버렸다 — '+T.n+' ×'+n); sfx('bind'); return;
  }
  if(where==='grind'){                              // 숫돌의 수리 칸
    if(!canRepairSlot(sl)){
      toast(!T.durMax ? '내구가 없는 물건이다'
           : sl.dur>=T.durMax ? '이미 성하다'
           : '만드는 법을 모르는 물건이라 고칠 수 없다');
      return;
    }
    grindSel=sl; toast(T.n+' 을 올려놓았다'); drawGrind(); return;
  }
  if(where==='hand'){
    if(!holdable(T)){ toast('들 수 있는 물건이 아니다'); return; }
    if(craftBusy()) return;
    EQUIP=sl; toast(T.n+' 들었다'); sfx('bind'); invDirty=true; return;
  }
  if(where==='list'){                               // 목록으로 되돌리면 내려놓는다
    if(EQUIP===sl){ EQUIP=null; toast(T.n+' 내려놓음'); }
    for(const k in WEAR) if(WEAR[k]===sl){ WEAR[k]=null; toast(T.n+' 벗음'); }
    for(let i=0;i<QUICK.length;i++) if(QUICK[i]===sl) QUICK[i]=null;
    refreshWear(); invDirty=true; quickDirty=true; return;
  }
  if(where.slice(0,2)==='q:'){                      // 빠른 칸
    const i=+where.slice(2);
    if(!holdable(T)){ toast('빠른 칸에는 도구와 먹을 것·마실 것·붕대만 넣는다'); return; }
    for(let k=0;k<QUICK.length;k++) if(QUICK[k]===sl) QUICK[k]=null;
    QUICK[i]=sl; toast((i+1)+'번 칸에 넣었다');
    sfx('bind'); invDirty=true; quickDirty=true; return;
  }
  // 입는 칸
  if(!T.wear || T.wear.slot!==where){ toast(WEAR_N[where]+' 자리에 걸치는 물건이 아니다'); return; }
  WEAR[where]=sl; toast(T.n+' 입었다'); sfx('bind');
  refreshWear(); invDirty=true;
}
function wireDrag(L){
  const mark=(el,on)=>el.classList.toggle('on',on);
  L.querySelectorAll('.it').forEach(el=>{
    el.ondragstart=ev=>{ DRAG=INV.slots[+el.dataset.i]; el.classList.add('drag');
      ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain','x'); };
    el.ondragend=()=>{ el.classList.remove('drag'); DRAG=null; };
  });
  L.querySelectorAll('.ws.slot').forEach(el=>{
    const k=el.dataset.slot;
    const b=el.querySelector('b[draggable]');
    if(b) b.ondragstart=ev=>{
      DRAG=(k==='hand')?EQUIP:WEAR[k];
      ev.dataTransfer.effectAllowed='move'; ev.dataTransfer.setData('text/plain','x'); };
    el.ondragover=ev=>{ ev.preventDefault(); mark(el,true); };
    el.ondragleave=()=>mark(el,false);
    el.ondrop=ev=>{ ev.preventDefault(); mark(el,false); dragPut(k,ev.shiftKey); };
  });
  // 목록 바탕 — 여기로 끌면 내려놓는다
  L.ondragover=ev=>{ if(DRAG){ ev.preventDefault(); L.classList.add('on'); } };
  L.ondragleave=()=>L.classList.remove('on');
  L.ondrop=ev=>{
    if(ev.target.closest&&ev.target.closest('.ws.slot')) return;   // 칸이 먼저 받는다
    ev.preventDefault(); L.classList.remove('on'); dragPut('list');
  };
  // 빠른 칸
  const bar=document.getElementById('quick');
  if(bar) bar.querySelectorAll('.q').forEach(el=>{
    el.ondragover=ev=>{ if(DRAG){ ev.preventDefault(); mark(el,true); } };
    el.ondragleave=()=>mark(el,false);
    el.ondrop=ev=>{ ev.preventDefault(); mark(el,false); dragPut('q:'+el.dataset.i); };
  });
}

/* ============================================================================
   11) 맨손 채집
   ----------------------------------------------------------------------------
   맨손으로는 죽은 가지를 꺾는 것까지만 가능하다. 나무를 넘기려면 도끼가 필요하고,
   나무 한 그루가 내주는 가지 수도 유한하다. 채집 중에는 기력이 빠진다.
   ========================================================================== */
const HARVEST={
  oak:  {item:'branch', label:'나뭇가지 꺾기', dur:1.92,  stam:7, yield:[1,1], uses:[3,6]},
  fir:  {item:'branch', label:'나뭇가지 꺾기', dur:1.44,  stam:5.5, yield:[1,1], uses:[3,6]},
  // 풀은 한 줌씩 뜯긴다. 힘이 거의 안 들고, 덤불에 열매가 달려 있으면 같이 딸려 온다
  grass:{item:'grass_blade', label:'풀 뜯기',      dur:0.68, stam:2.5,  yield:[2,4], uses:[2,3],
         regrow:4},                                  // 게임 4시간 뒤 재생
  // 갈대는 줄기를 꺾어 벤다. 풀보다 질겨 시간과 기력이 더 들지만 섬유 수율이 높다
  reed: {item:'reed_stalk', label:'갈대 베기', dur:1.12, stam:4, yield:[2,4], uses:[2,3],
         regrow:6},
  // 단괴와 자갈은 도구 없이 그냥 줍는다 — 주우면 그 자리에서 사라진다
  // 모래는 손으로 퍼도 손가락 사이로 흐른다 — 빈 토기에 담아 나른다.
  // 한 번 담을 때 토기 하나가 든다. 바람에 다시 쌓이므로 재생한다.
  sand:  {item:'pot_sand', label:'모래 담기', dur:1.6, stam:3, yield:[1,1], uses:[4,7],
          need:'pot', regrow:8},
  flint: {item:'flint',  label:'부싯돌 줍기', dur:0.6, stam:1.5, yield:[1,1], uses:[1,1], vanish:true},
  pebble:{item:'pebble', label:'돌멩이 줍기', dur:0.4, stam:1, yield:[1,1], uses:[1,1], vanish:true}
};
// 도끼를 들었을 때만 열리는 작업 — 줄기를 베어 통나무를 얻는다
/* 채굴 — tier 는 광물 경도 등급
   1: 무름(점토·늪철광·사광 석석)  간이 곡괭이부터
   2: 중간(석탄 Mohs 2~2.5, 공작석 3.5~4)  돌 곡괭이부터
   3: 단단함(화강암 Mohs 6~7)  석기 곡괭이로는 불가 — 화입법이 필요하다 */
const MINE={
  clay:   {item:'clay_lump',  label:'점토 파내기', dur:2.5, stam:5, tier:1, uses:[3,5]},
  sulfur: {item:'sulfur',     label:'유황 긁어내기', dur:2.0, stam:4, tier:1, uses:[2,4]},
  iron:   {item:'bog_iron',   label:'늪철광 캐기', dur:3.5, stam:7, tier:1, uses:[2,4]},
  tin:    {item:'cassiterite',label:'석석 채취',   dur:3.0, stam:6, tier:1, uses:[2,3]},
  coal:   {item:'coal_lump',  label:'석탄 떼기',   dur:4.0, stam:8, tier:2, uses:[3,5]},
  copper: {item:'malachite',  label:'공작석 캐기', dur:5.0, stam:9, tier:2, uses:[2,4]},
  zinc:   {item:'sphalerite', label:'섬아연석 캐기', dur:5.5, stam:10, tier:2, uses:[2,3]},
  galena: {item:'galena', label:'방연석 캐기', dur:5.8, stam:11, tier:2, uses:[2,3]},
  cinnabar:{item:'cinnabar', label:'진사 긁기', dur:4.2, stam:9, tier:1, uses:[2,4]},
  // 화강암은 불에 달궈 균열이 생긴 뒤에야(tier 3 → 2) 떼어낼 수 있다
  granite:{item:'stone_block',label:'화강암 떼기', dur:6.0, stam:11, tier:3, uses:[3,6],
           fireset:0.35,   // 게임시간 21분 — 횃불이면 35분
           extra:{id:'spodumene', p:0.25}}   // 페그마타이트 맥 — 네 번에 한 번꼴 리튬휘석이 딸려 나온다
};
const CHOP={
  oak:{item:'log', label:'나무 베기', dur:5.0, stam:10, yield:[1,1], logs:[2,3]},
  fir:{item:'log', label:'나무 베기', dur:4.0, stam:8.5, yield:[1,1], logs:[2,4]}
};
const HARV={near:null, t:0, active:false, mode:null, cont:null, fire:null, fit:null};
/* 좌클릭 짧게 = 용기 열기 / 길게 = 모닥불 다루기 */
const EK={hold:0, tgt:null};
const E_TAP=0.35;
let EQUIP=null;                                     // 장착 중인 도구 슬롯

/* ── 쓰기(먹기·감기·마시기) ─────────────────────────────────────────────
   먹는 것은 배를 채운다. 날것(raw)은 배는 채우되 한동안 앓는다 —
   기력이 더디 차오른다. 구우면 그런 일이 없고 채우는 양도 훨씬 크다.
   감는 것(heal)은 앓는 것을 가라앉히고 기력을 돌려준다.
   마시는 것(drink)은 목을 축이고 빈 그릇을 돌려준다. sips 를 단 그릇은
   칸에 남은 모금(sip)을 하나씩 덜어 쓰고, 다 비면 그제야 빈 그릇이 된다.

   손에 쥔 것이 셋 중 어느 것도 아니면 담수 곁인지 본다 — 하천이나 온천에
   서 있으면 그냥 엎드려 들이켠다. 그릇 없이도 물가에서는 살 수 있어야 한다. */
function eatSlot(sl){
  if(!sl) return drinkSource();
  const T=ITEMS[sl.id];
  if(T&&T.camc){                                    // 캠코더 전지 팩 — 낡은 전지를 갈아 끼운다(46-camcorder.js)
    const i=INV.slots.indexOf(sl); if(i>=0) invRemove(i,1);
    CAMC.health=1; CAMC.li=true; CAMC.bat=100; CAMC.warned=false; CAMC.hsaid=0;
    toast('캠코더 전지를 리튬이온으로 갈아 끼웠다 — 가득 찬 새 전지다'); sfx('bind'); invDirty=true; return true;
  }
  if(T&&T.drink){
    if(PL.water>=99.5){ toast('더는 들어가지 않는다'); return false; }
    const D=T.drink;
    PL.water=clamp(PL.water+D.n,0,100);
    const i=INV.slots.indexOf(sl);
    if(sl.sip>1){ sl.sip--; toast(T.n+' — 한 모금 (남은 '+sl.sip+')'); }
    else{
      if(i>=0) invRemove(i,1);
      if(D.empty && !invAdd(D.empty,1)) toast('빈 '+ITEMS[D.empty].n+'을 들 자리가 없어 버렸다');
      toast(T.n+' — 다 마셨다');
    }
    sfx('bind'); invDirty=true; return true;
  }
  if(T&&T.heal){                                  // 붕대 따위
    const H=T.heal;
    const need=(H.hp&&PL.hp<HPMAX-0.5)||(H.ill&&PL.ill>0)||(H.stam&&PL.stam<99);
    if(!need){ toast('지금은 감을 데가 없다'); return false; }
    if(H.hp) PL.hp=Math.min(HPMAX,PL.hp+H.hp);
    if(H.ill) PL.ill=0;
    if(H.stam) PL.stam=clamp(PL.stam+H.stam,0,100);
    if(H.water) PL.water=clamp(PL.water+H.water,0,100);   // 달인 물은 목도 축인다
    const j=INV.slots.indexOf(sl);
    if(j>=0) invRemove(j,1);
    if(H.empty && !invAdd(H.empty,1)) toast('빈 '+ITEMS[H.empty].n+'을 들 자리가 없어 버렸다');
    toast(T.n+' — 속이 가라앉는다');
    sfx('bind'); invDirty=true; return true;
  }
  if(!T||!T.food) return drinkSource();
  if(PL.food>=99.5){ toast('더는 들어가지 않는다'); return false; }
  PL.food=clamp(PL.food+T.food,0,100);
  if(T.water) PL.water=clamp(PL.water+T.water,0,100);     // 국은 목도 축인다
  const i=INV.slots.indexOf(sl);
  if(i>=0) invRemove(i,1);
  if(T.empty && !invAdd(T.empty,1)) toast('빈 '+ITEMS[T.empty].n+'을 들 자리가 없어 버렸다');
  if(T.poison){ PL.ill=Math.max(PL.ill,90); hurtPL(T.poison,T.n+'의 독'); toast(T.n+' — 독이 온몸에 퍼진다! 반드시 구워 먹어야 한다'); }
  else if(T.raw){ PL.ill=Math.max(PL.ill,45); toast(T.n+' — 날로 먹어 속이 뒤집힌다'); }
  else toast(T.n+' 먹었다');
  sfx('bind'); invDirty=true; return true;
}

/* 물가에서 그냥 마신다. 담수면 가득 채우고, 바닷물이면 마시지 못한다. */
/* 시선이 닿는 물 — 눈에서 reach m 안에서 시선이 **수면에 닿으면** {fresh: 민물인가} 를, 땅이 먼저면 null 을 돌려준다.
   예전엔 둘레 5 m 안에 하천 칸이 하나라도 있으면 마셔졌다(`nearFreshWater`) — 물에서 몇 걸음 떨어진 풀밭에 서서
   하늘을 보고도 물을 들이켰다. 이제 물을 바라봐야 한다.
   **눈에 보이는 물만** 친다 — 물이 한 뼘(0.12 m)도 안 고인 하천 가장자리나, 물이 그려지지 않는 분기공 땅을 보고
   '물 마시기'가 뜨던 것을 없앴다(사용자 지적: 마실 것이 없는데 마시기가 뜬다). */
function lookWater(reach){
  const ex=camera.position.x, ey=camera.position.y, ez=camera.position.z, cp=Math.cos(PL.pitch);
  const dx=-Math.sin(PL.yaw)*cp, dy=Math.sin(PL.pitch), dz=-Math.cos(PL.yaw)*cp;
  for(let t=0.15;t<=reach;t+=0.1){
    const x=ex+dx*t, y=ey+dy*t, z=ez+dz*t;
    const g=heightAt(x,z), WA=waterAt(x,z,g), river=WA.river, wl=WA.wl;
    if(wl>g+0.12&&y<=wl) return {fresh:river,x,z};          // 수면에 닿았다(그 자리에 물이 땅 위로 고여 있다)
    if(y<=g) return null;                                    // 땅에 닿았다
  }
  return null;
}
const DRINK_REACH=2.8;
/* quiet — 빈손 좌클릭에서 불렀을 때. 물을 안 보고 있으면 아무 말도 안 한다(예전엔 빈손으로 누를 때마다
   '먹거나 감거나 마실 수 있는 것이 아니다'가 떴다) */
function drinkSource(quiet){
  const w=lookWater(DRINK_REACH);
  if(w&&w.fresh){
    if(PL.water>=99.5){ toast('목이 마르지 않다'); return false; }
    PL.water=100; PL.stam=clamp(PL.stam+8,0,100);
    toast('물을 들이켰다'); sfx('bind'); return true;
  }
  if(w&&!PL.swim&&!quiet){ toast('바닷물은 마실 수 없다 — 하천을 찾아라'); return false; }
  if(!quiet) toast('먹거나 감거나 마실 수 있는 것이 아니다');
  return false;
}

/* ── 빠른 칸 ────────────────────────────────────────────────────────────
   손에 든 것 아래의 다섯 칸. 숫자를 누르면 그 칸의 것을 손에 들고, 들고 있던
   것이 그 칸으로 들어간다 — 넣고 빼는 것이 아니라 자리를 맞바꾼다.
   그래서 빈 칸을 누르면 손이 비고, 한 번 더 누르면 도로 손에 돌아온다.
   칸은 소지품 슬롯을 가리킬 뿐이라 무게에는 아무 영향이 없다. */
const QUICK=[null,null,null,null,null];
let quickDirty=true;
function pruneQuick(){                              // 사라진 물건을 가리키던 칸은 비운다
  for(let i=0;i<QUICK.length;i++)
    if(QUICK[i] && INV.slots.indexOf(QUICK[i])<0){ QUICK[i]=null; quickDirty=true; }
}
function quickSwap(i){
  if(i<0||i>=QUICK.length) return;
  if(craftBusy()) return;
  pruneQuick();
  const held=equippedTool(), want=QUICK[i];
  if(!held && !want){ toast((i+1)+'번 칸이 비어 있다'); return; }
  QUICK[i]=held||null;
  EQUIP=want||null;
  for(let k=0;k<QUICK.length;k++)                    // 같은 물건이 두 칸에 남지 않게
    if(k!==i && QUICK[k] && QUICK[k]===QUICK[i]) QUICK[k]=null;
  toast(EQUIP?ITEMS[EQUIP.id].n+' 들었다':(i+1)+'번 칸에 넣었다');
  invDirty=true; quickDirty=true; sfx('bind');
}
function drawQuick(){
  const bar=document.getElementById('quick');
  if(!bar) return;
  pruneQuick();
  bar.querySelectorAll('.q').forEach(el=>{
    const sl=QUICK[+el.dataset.i], it=sl&&ITEMS[sl.id];
    el.querySelector('span').textContent=it?it.n:'–';
    el.title=it?it.n:'';
    const im=el.querySelector('.sw'), src=it?itemIcon(sl.id):'';
    if(src){ im.src=src; im.style.visibility='visible'; } else im.style.visibility='hidden';
    el.classList.toggle('has',!!it);
  });
}

/* 손에 들 수 있는 것 — 도구, 그리고 먹고 마시고 감는 것. 드는 것은 좌클릭으로 쓴다. */
const consumable=T=>!!(T&&(T.food||T.drink||T.heal||T.camc));
const holdable=T=>!!(T&&(T.tool||consumable(T)));
const useVerb=T=>T.camc?'갈아 끼우기':T.drink?'마시기':T.heal?'감기':'먹기';
function equippedTool(){
  if(EQUIP && (INV.slots.indexOf(EQUIP)<0)) EQUIP=null;
  return EQUIP;
}
// 대상과 장비 상태로 지금 수행할 작업을 결정
function pickMode(t){
  if(!t) return null;
  const e=equippedTool();
  let T=e?ITEMS[e.id].tool:null;
  if(T && T.drill && e.dur<=0) T=null;             // 전기가 떨어진 드릴은 맨손과 같다(우클릭으로 채운다)

  if(t.giant){                                     // 노거수 — 철 도끼 이상(axe 2)이라야 날이 박힌다(95-giants.js)
    if(T && (T.axe|0)>=GIANT_CHOP.tier && t.logs>0)
      return {H:GIANT_CHOP, field:'logs', tool:true, dur:GIANT_CHOP.dur/(T.speed||1), wear:T.wear||1};
    return null;
  }
  if(T && T.axe && CHOP[t.k] && t.logs>0){
    // 자루가 없는 주먹도끼는 느리고 빨리 닳는다
    return {H:CHOP[t.k], field:'logs', tool:true,
            dur:CHOP[t.k].dur/(T.speed||1), wear:T.wear||3};
  }
  if(MINE[t.k] && t.ore>0){
    const M=MINE[t.k];
    const tier=t.cracked?2:M.tier;      // 화입으로 균열이 가면 등급이 내려간다
    if(T && T.pick>=tier && M.item){
      return {H:M, field:'ore', tool:true,
              dur:M.dur/(T.speed||1), wear:T.wear||2};
    }
    return null;                       // 등급 미달 — 사유는 blockReason 이 설명한다
  }
  if(HARVEST[t.k] && t.br>0){
    const H=HARVEST[t.k];
    if(H.need && countId(H.need)<1) return null;    // 담을 그릇이 없다
    return {H, field:'br', tool:false};
  }
  return null;
}
// '~로 / ~으로' 조사 선택 (받침 유무 판정, ㄹ 받침은 '로')
function josaRo(w){
  const c=w.charCodeAt(w.length-1);
  if(c<0xAC00||c>0xD7A3) return w+'로';
  const jong=(c-0xAC00)%28;
  return w+((jong===0||jong===8)?'로':'으로');
}
// 못 하는 이유를 문장으로 — 플레이어가 다음에 뭘 만들지 알 수 있어야 한다
function blockReason(t){
  if(!t) return null;
  const e=equippedTool(), T=e?ITEMS[e.id].tool:null;
  if(t.giant){
    if(t.logs<=0) return null;
    if(!T||!T.axe) return '줄기가 너무 굵다 — 철 도끼 이상을 들고 줄기를 보며 좌클릭을 누르고 있으면 벤다';
    if((T.axe|0)<GIANT_CHOP.tier) return josaRo(ITEMS[e.id].n)+'는 이 줄기에 날이 안 박힌다 — 철 도끼 이상이라야 벤다';
    return null;
  }
  const M=MINE[t.k];
  if(M && t.ore>0 && e && T && T.drill && e.dur<=0)
    return '드릴 전기가 없다 — 우클릭으로 축전지에서 채우거나 발전기 곁에서 채워라';
  if(M && t.ore>0){
    const tier=t.cracked?2:M.tier;
    if(T && T.pick>=tier) return null;
    if(!T||!T.pick) return tier===3
      ? '돌로는 깨지지 않는다 — 옆에 모닥불을 피우거나 횃불을 들고 서 있어야 한다'
      : '곡괭이가 필요하다';
    if(tier===3) return t.heat>0
      ? '달궈지는 중 ('+Math.round(t.heat/M.fireset*100)+'%) — 모닥불이나 횃불을 더 대야 한다'
      : josaRo(ITEMS[e.id].n)+'는 안 된다 — 불로 달구거나 철 곡괭이가 있어야 한다';
    return josaRo(ITEMS[e.id].n)+'는 어림없다 — 돌 곡괭이가 필요하다';
  }
  if(CHOP[t.k] && t.logs>0 && t.br<=0) return '줄기를 베려면 도끼를 들어야 한다';
  const H=HARVEST[t.k];
  if(H && H.need && t.br>0 && countId(H.need)<1)
    return ITEMS[H.need].n+'가 있어야 담는다 — 모래는 손가락 사이로 흘러내린다';
  return null;
}

// 프롭 공간 해시 — 풀까지 넣으면 7천 개가 넘어 전수 조회는 매 프레임 낭비다
const PGRID=new Map(), PG=8;
function buildPropGrid(){
  PGRID.clear();
  for(const p of PROPS){
    const k=cgKey(Math.floor(p.x/PG),Math.floor(p.z/PG));
    let a=PGRID.get(k); if(!a){a=[];PGRID.set(k,a);} a.push(p);
  }
}
function eachNearProp(x,z,fn){
  const gx=Math.floor(x/PG), gz=Math.floor(z/PG);
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
    const a=PGRID.get(cgKey(gx+dx,gz+dz)); if(!a) continue;
    for(const p of a) fn(p);
  }
}
// 시선 앞 2.8 m 안의 채집 가능한 대상을 고른다
const isNode=k=>!!(HARVEST[k]||MINE[k]||CHOP[k]);
function findHarvestTarget(){
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw);
  /* 손에 든 도구로 할 수 있는 것이 1.2 m 앞선다 — 도끼를 들고 줄기를 보는데 발밑 풀이 더 가까우면 풀을 골라서
     (풀은 빈손 채집이라 도끼로는 아무것도 안 했다) 줄기를 못 베었다. 곡괭이와 광석도 같다 */
  const e=equippedTool(), W=e?(ITEMS[e.id].tool||{}):{};
  const fit=p=>(W.axe&&CHOP[p.k]&&p.logs>0)||(W.pick&&MINE[p.k]&&p.ore>0);
  let best=null, bs=2.8;
  eachNearProp(PL.pos.x,PL.pos.z,p=>{
    if(!isNode(p.k)) return;
    /* **다 주운 자리는 건드릴 것이 없다**(사용자 요청) — 돌을 줍고 나면 다시 날 때까지 그 자리를 보지도 잡지도 않는다.
       예전엔 빈 자리가 계속 잡혀 '더 얻을 게 없다' 가 뜨고, 곁의 다른 것을 가렸다. 벤 나무의 그루터기는 그대로 본다 */
    if(!p.felled&&(p.ore|0)<=0&&(p.br|0)<=0&&(p.logs|0)<=0) return;
    const dx=p.x-PL.pos.x, dz=p.z-PL.pos.z;
    const d=Math.hypot(dx,dz);
    if(d>2.8||d<0.05) return;
    if((dx/d)*fx+(dz/d)*fz < 0.5) return;      // 시야 밖이면 제외
    const sc=d-(fit(p)?1.2:0);
    if(sc<bs){ bs=sc; best=p; }
  });
  /* 노거수 줄기 — 줄기 겉까지 1.6 m 안이면 후보(줄기가 굵어 가운데까지 재면 늘 멀다). 도끼를 들었으면 똑같이 앞선다 */
  const gt=giantChopTarget(fx,fz);
  if(gt){ const sc=gt.d-(W.axe?1.2:0); if(!best||sc<bs) best=gt.prop; }
  return best;
}
/* 모닥불·제련로 상호작용 — 이제 여기서 하는 일은 '불'뿐이다.
   땔감·구울 것·구워진 것은 모두 안(용기)에 넣고 뺀다. E를 짧게 누르면
   창이 열리고, 길게 누르면 아래의 점화 동작이 이어진다.
   제련로도 불을 붙여야 돌아간다 — 켜는 방법은 모닥불과 똑같다. */
function updateFireInteract(dt,f){
  const e=equippedTool(), canFire=e&&(ITEMS[e.id].tool||{}).fire;
  const isTorch=e&&(ITEMS[e.id].tool||{}).torch;
  const ti=INV.slots.findIndex(s=>s.id==='tinder');

  // 불붙은 횃불을 대면 바로 옮겨 붙는다 — 활비비질을 다시 할 필요가 없다
  if(!f.lit && isTorch && e.lit && e.fuel>0.12){
    if(!useDown || !contFuel(f)){ IGNITE.t=Math.max(0,IGNITE.t-dt*2); return; }
    IGNITE.t+=dt;
    if(IGNITE.t<1.5) return;
    IGNITE.t=0; e.fuel-=0.1;
    lightFire(f);
    toast('횃불로 불을 옮겼다'); sfx('ignite'); invDirty=true;
    return;
  }
  // 꺼진 횃불은 타는 모닥불에서 불을 얻는다
  if(f.lit && isTorch && !e.lit && e.fuel>0){
    if(!useDown){ IGNITE.t=Math.max(0,IGNITE.t-dt*2); return; }
    IGNITE.t+=dt;
    if(IGNITE.t<1.0) return;
    IGNITE.t=0; e.lit=true;
    toast('횃불에 불이 붙었다'); sfx('ignite'); invDirty=true;
    return;
  }

  if(!f.lit){
    // 불 만들기 — 안에 땔감이 들어 있어야 불이 옮겨 붙을 자리가 있다
    const tin=needsTinder(e), dur=igniteDur(e);
    if(!useDown||!canFire||(tin&&ti<0)||PL.stam<5||!contFuel(f)){
      IGNITE.t=Math.max(0,IGNITE.t-dt*2); return; }
    const pv=IGNITE.t;
    IGNITE.t+=dt;
    if(tin) PL.stam=clamp(PL.stam-IGNITE.stam*dt,0,100);   // 활비비질은 몹시 힘들다
    // 활을 앞뒤로 켜는 마찰음 — 진행될수록 빨라진다. 라이터는 긁는 소리만 난다
    const iv=Math.max(0.16,0.34-IGNITE.t/dur*0.18);
    if(Math.floor(pv/iv)!==Math.floor(IGNITE.t/iv))
      nz(T0(),0.13,0.05,'bandpass',rr(500,900),1.3,rr(0.35,0.55));
    if(IGNITE.t<dur) return;
    IGNITE.t=0;
    if(tin) invRemove(ti,1);            // 불씨를 받아낸 부싯깃은 타 없어진다
    e.dur-=1;
    if(e.dur<=0){ toast(ITEMS[e.id].n+' 파손'); invRemove(INV.slots.indexOf(e),1); EQUIP=null; }
    lightFire(f);
    toast(tin?'부싯깃에 불이 옮겨 붙었다':'불이 붙었다'); sfx('ignite');
    invDirty=true;
    return;
  }
  IGNITE.t=Math.max(0,IGNITE.t-dt);
}
/* 불을 붙인다 — 안에 든 땔감 하나를 바로 물린다 */
function lightFire(f){
  const id=contFuel(f);
  if(!id) return false;
  contTake(f,id,1); f.fuel+=FUEL[id];
  f.lit=true;
  if(f.flame) f.flame.visible=true;      // 모닥불은 불꽃, 제련로는 아치 속 잔열
  if(f.glow)  f.glow.visible=true;
  f.light.visible=true;
  boxDirty=true; return true;
}
const fmtFuel=h=>Math.floor(h)+'시간 '+Math.round((h%1)*60)+'분';

function updateHarvest(dt){
  // 용기(상자·모닥불·제련로)와 채집 대상 중 가장 가까운 쪽을 상호작용 대상으로 삼는다
  if(boxOpen||grindOpen){                        // 열려 있는 동안은 세상 쪽 조작을 멈춘다
    HARV.cont=HARV.fire=HARV.near=HARV.mode=HARV.fit=null;
    HARV.active=false; EK.hold=0; EK.tgt=null; IGNITE.t=0;
    return;
  }
  // 문짝·창짝이 눈앞이면 그쪽이 먼저다 — 짧게 좌클릭으로 여닫는다
  const fit=BUILD.on?null:findFit();
  if(fit){
    HARV.cont=null; HARV.fire=null; HARV.near=null; HARV.mode=null;
    HARV.active=false; HARV.t=0; IGNITE.t=0; HARV.fit=fit;
    if(useDown){ EK.hold+=dt; EK.tgt={kind:'fit', w:fit}; }
    else{ EK.hold=0; EK.tgt=null; }
    return;
  }
  HARV.fit=null;
  const cont=findContainer(), prop=findHarvestTarget();
  const dc=cont?Math.hypot(cont.x-PL.pos.x,cont.z-PL.pos.z):1e9;
  const dp=prop?Math.hypot(prop.x-PL.pos.x,prop.z-PL.pos.z):1e9;
  if(cont && dc<=dp){
    HARV.cont=cont; HARV.fire=(cont.kind==='fire')?cont:null;
    HARV.near=null; HARV.mode=null; HARV.active=false; HARV.t=0;
    // 누른 시간을 재둔다 — 짧게 떼면 열고(releaseE), 계속 누르면 불을 다룬다
    if(useDown){ EK.hold+=dt; EK.tgt=cont; }else{ EK.hold=0; EK.tgt=null; }
    if(cont.kind==='fire'||cont.kind==='furnace') updateFireInteract(dt,cont);
    else IGNITE.t=0;
    return;
  }
  HARV.cont=null; HARV.fire=null; EK.hold=0; EK.tgt=null; IGNITE.t=0;
  HARV.near=prop;
  const t=HARV.near;
  HARV.mode=pickMode(t);
  /* 보는 것이나 하는 일이 바뀌면 진행을 처음부터 — 예전엔 나무를 베다 만 몫(몇 초)이 그대로 남아, 곁의 풀(0.8초짜리)을 보는 순간
     막대가 칸 밖으로 몇 배나 뻗었다(사용자 지적) */
  { const hm=HARV.mode?HARV.mode.H:null; if(HARV._lt!==t||HARV._lm!==hm){ HARV._lt=t; HARV._lm=hm; HARV.t=0; } }
  const want=useDown && harvestByUse() && !PL.swim;     // 캐기는 좌클릭(누르고 있는 동안)뿐 — E 는 안 쓴다
  if(!want || PL.stam<3){
    HARV.t=Math.max(0,HARV.t-dt*2.5); HARV.active=false; return;
  }
  const H=HARV.mode.H, field=HARV.mode.field;
  const need=HARV.mode.dur||H.dur;
  HARV.active=true;
  HARV.t+=dt;
  PL.stam=clamp(PL.stam-H.stam*dt,0,100);
  if(HARV.t<need) return;

  HARV.t=0;
  // 남은 적재량만큼만 담는다
  const Y=H.yield||[1,1];
  const want_n=Y[0]+((Math.random()*(Y[1]-Y[0]+1))|0);
  const room=Math.floor((INV.max-invWeight())/ITEMS[H.item].kg+1e-9);
  const got=Math.min(want_n,room);
  if(got<1){
    toast('더 들 수 없다 — '+INV.max+' kg 한계');
    HARV.active=false; return;
  }
  if(H.need){                                       // 담은 만큼 빈 그릇이 든다
    let left=got;
    for(let i=INV.slots.length-1;i>=0&&left>0;i--){
      const sl=INV.slots[i];
      if(sl.id!==H.need||sl.dur!==undefined) continue;
      const take=Math.min(left,sl.n); left-=take; invRemove(i,take);
    }
  }
  invAdd(H.item,got);
  let msg=ITEMS[H.item].n+' +'+got;

  // 열매가 달린 덤불이면 가끔 함께 딸려 나온다
  if(field==='br' && t.berry>0 && Math.random()<0.55){
    if(invAdd('berry',1)){ t.berry--; msg+=' · 베리 +1'; refreshBerry(t); }
  }
  // 캐는 것에 딸려 나오는 것(MINE[].extra — 화강암의 리튬휘석)
  if(field==='ore' && H.extra && Math.random()<H.extra.p && invAdd(H.extra.id,1)) msg+=' · '+ITEMS[H.extra.id].n+' +1';
  t[field]--;

  if(HARV.mode.tool){                                // 도구 마모
    const e=equippedTool();
    if(e){
      e.dur-=(HARV.mode.wear||3);
      if(e.dur<=0 && (ITEMS[e.id].tool||{}).drill){          // 드릴은 부서지지 않고 전기가 떨어진다
        e.dur=0;
        toast('드릴 전기가 떨어졌다 — 우클릭으로 축전지에서 채운다');
      }else if(e.dur<=0){
        toast(ITEMS[e.id].n+' 파손');
        invRemove(INV.slots.indexOf(e), 1); EQUIP=null;
      }
    }
    if(field==='logs' && t.logs<=0){ t.felled=true; t.br=0; if(typeof wildTreeFelled==='function') wildTreeFelled(t); }   // 다 베면 그루터기만 · 벌집이 달렸으면 떨어진다(97-wildlife.js)
  }
  if(field==='br' && t.br<=0 && H.regrow!==undefined){ t.cut=gameHours; REGROW.push(t); }
  if(t.giant) giantChopped(t);                       // 노거수 — 남은 통나무를 적고, 다 베면 쓰러뜨린다(95-giants.js)
  else shrinkFoliage(t);
  invDirty=true;
  toast(msg);
  sfx(harvestSfx(t.k,field));
}

/* 고갈된 풀숲은 시간이 지나면 다시 자란다 */
const REGROW=[];
function updateRegrow(){
  for(let i=REGROW.length-1;i>=0;i--){
    const p=REGROW[i];
    const H=HARVEST[p.k];
    if(gameHours-p.cut < H.regrow) continue;
    p.br=p.brMax; shrinkFoliage(p);
    REGROW.splice(i,1);
  }
}
// 가지를 꺾을수록 수관이 조금씩 성기어진다 (인스턴스 행렬만 갱신)
const _M=new THREE.Matrix4(), _Q=new THREE.Quaternion(),
      _V=new THREE.Vector3(), _S=new THREE.Vector3(), _E=new THREE.Euler();
// 가지 인스턴스 하나를 지운다 (크기를 0으로 접는다)
function hideLimb(p,j){
  if(!p._lb) return;
  _E.set(0,0,0); _Q.setFromEuler(_E);
  _V.set(p.x,p.y,p.z); _S.set(0,0,0);
  _M.compose(_V,_Q,_S);
  setLimbM(p,j,_M);
  /* 잎은 가지 하나에 여러 장 달린다 — 그 가지 몫을 전부 접는다 */
  const LPB=LEAF_PER[p.k]||1;
  for(let q=0;q<LPB;q++) instSetM(p._lf,(p._lbBase+j)*LPB+q,_M);
}
/* ── 벤 나무의 그루터기 ──────────────────────────────────────────────────
   밑동이 벌어진 짧은 줄기(껍질 골 · 뿌리 혹 넷) + 비스듬히 벤 윗면(나이테 · 속심 · 갈라진 금) + 마지막에 꺾여 넘어가며 남은
   **쪼개진 나뭇결 이빨**(경첩 쪽). 참나무·전나무가 나눠 쓰는 인스턴스 메시 하나 · 반지름은 그 줄기 밑동 굵기를 재서 맞춘다 */
const STUMP={im:null, map:new Map(), n:0, rad:new Map()};
function stumpGeo(){
  const P=[], C=[], tri=(a,b,c,ca,cb,cc)=>{ P.push(...a,...b,...c); C.push(...ca,...(cb||ca),...(cc||ca)); };
  const S=14, BK=[0.30,0.23,0.17], BK2=[0.42,0.33,0.24], cutY=th=>0.55+0.10*Math.cos(th);   // 윗면은 비스듬히
  const rad=(th,y)=>{ const f=1+0.35*Math.exp(-y*5)*(0.6+0.4*Math.max(0,Math.cos(th*4))); return f*(1+0.04*Math.sin(th*11)); };   // 밑동 판근 · 껍질 골
  for(let i=0;i<S;i++){ const a=i/S*6.2832, b=(i+1)/S*6.2832;
    for(let k=0;k<3;k++){ const y0=k===0?-0.25:k*cutY(a)/3, y1=(k+1)*cutY(a)/3, yb0=k===0?-0.25:k*cutY(b)/3, yb1=(k+1)*cutY(b)/3;
      const p00=[Math.cos(a)*rad(a,y0),y0,Math.sin(a)*rad(a,y0)], p01=[Math.cos(a)*rad(a,y1),y1,Math.sin(a)*rad(a,y1)],
            p10=[Math.cos(b)*rad(b,yb0),yb0,Math.sin(b)*rad(b,yb0)], p11=[Math.cos(b)*rad(b,yb1),yb1,Math.sin(b)*rad(b,yb1)];
      const c=(i&1)?BK:BK2; tri(p00,p10,p11,c); tri(p00,p11,p01,c); } }
  /* 윗면 — 껍질 테 · 나이테 다섯(밝고 어두운 고리) · 짙은 속심 · 가운데서 뻗은 금 셋 */
  const RING=[[0.0,0.30,0.20,0.12],[0.12,0.78,0.62,0.42],[0.30,0.70,0.54,0.36],[0.48,0.80,0.64,0.44],[0.64,0.68,0.52,0.34],[0.80,0.76,0.60,0.40],[0.92,0.44,0.32,0.20],[1.0]];
  for(let i=0;i<S;i++){ const a=i/S*6.2832, b=(i+1)/S*6.2832;
    for(let r=0;r<RING.length-1;r++){ const r0=RING[r][0], r1=RING[r+1][0], c=RING[r].slice(1);
      const q=(t,rr)=>[Math.cos(t)*rr*rad(t,cutY(t)),cutY(t)+0.01,Math.sin(t)*rr*rad(t,cutY(t))];
      if(r===0) tri(q(a,0),q(b,r1),q(a,r1),c); else{ tri(q(a,r0),q(b,r1),q(a,r1),c); tri(q(a,r0),q(b,r0),q(b,r1),c); } } }
  /* 갈라진 금 셋 — 속심 가까이에서 바깥으로 가늘어지는 틈(살짝 위에 얹은 가는 띠) */
  for(const th of [0.9,2.8,4.6]){ const ux=Math.cos(th), uz=Math.sin(th), vx=-uz, vz=ux, y=cutY(th)+0.02;
    const pt=(r,w)=>[ux*r+vx*w, y-(1-r)*0.0+0.0, uz*r+vz*w], c=[0.20,0.14,0.09];
    tri(pt(0.1,0.025),pt(0.85,0.004),pt(0.1,-0.025),c); }
  /* 경첩 쪽(+x)에 쪼개져 남은 나뭇결 이빨 — 얇은 쐐기 여섯 */
  for(let k=0;k<6;k++){ const t=-0.5+k*0.2, x=0.55+0.25*Math.cos(t*2), z=t*0.9, y=cutY(0)+0.01, h=0.18+0.22*((k*37)%5)/5, w=0.07;
    const base=[[x-w,y,z-w],[x+w,y,z-w],[x,y,z+w]], top=[x+0.02,y+h,z]; const c=[0.74,0.58,0.38], c2=[0.86,0.72,0.50];
    for(let e=0;e<3;e++) tri(base[e],base[(e+1)%3],top,c,c,c2); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  g.computeVertexNormals(); return g;
}
/* 그 줄기 지오메트리의 밑동 굵기(밑에서 15~30% 높이 정점의 평균 반지름) — 종류마다 한 번 */
function stumpRadius(geo){
  if(STUMP.rad.has(geo)) return STUMP.rad.get(geo);
  geo.computeBoundingBox(); const b=geo.boundingBox, a=geo.attributes.position, H=b.max.y-b.min.y;
  let s=0, n=0; for(let i=0;i<a.count;i++){ const y=(a.getY(i)-b.min.y)/H; if(y>0.15&&y<0.3){ s+=Math.hypot(a.getX(i),a.getZ(i)); n++; } }
  const r=n?s/n:0.3; STUMP.rad.set(geo,r); return r;
}
function stumpPut(p){
  if(!STUMP.im||STUMP.im.parent!==propGroup){
    if(STUMP.im&&STUMP.im.parent) STUMP.im.parent.remove(STUMP.im);
    STUMP.im=new THREE.InstancedMesh(stumpGeo(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),1024);
    STUMP.im.count=0; STUMP.im.frustumCulled=false; propGroup.add(STUMP.im); STUMP.map.clear(); STUMP.n=0; }
  let i=STUMP.map.get(p); if(i===undefined){ if(STUMP.n>=1024) return; i=STUMP.n++; STUMP.map.set(p,i); }
  const R=stumpRadius(p._tm.geometry)*p.s*1.05;
  _E.set(0,((p._hash>>>5)%628)/100,0); _Q.setFromEuler(_E); _V.set(p.x,p.y,p.z); _S.set(R,Math.max(0.5,R*1.6),R);
  _M.compose(_V,_Q,_S); STUMP.im.setMatrixAt(i,_M); STUMP.im.count=STUMP.n; STUMP.im.instanceMatrix.needsUpdate=true;
  LIGHT.dirtyAt(p.x,p.z,3);
}
function shrinkFoliage(p){
  /* 나무는 가지만으로 이뤄져 있다 — 꺾인 가지를 실제로 지운다.
     가지·잎은 칸이 가까워져야 지어진다(30-props.js tile.build) — 아직 안 지은 나무면 가지는 건너뛰고(p._lb 없음),
     칸이 지어질 때 그쪽이 이 함수를 다시 부른다. 줄기·먼 수관·충돌 원은 늘 있으므로 여기서 바로 고친다 */
  if(p._tile){
    if(p.felled){
      if(p._lb) for(let j=0;j<p.limbN;j++) hideLimb(p,j);      // 벌목 → 가지 전부 제거
      if(p._bb){                                     // 멀리서 쓰는 수관도 같이
        _E.set(0,0,0); _Q.setFromEuler(_E);
        _V.set(p.x,p.y,p.z); _S.set(0,0,0);
        _M.compose(_V,_Q,_S);
        p._bb.setMatrixAt(p._bbi,_M); p._bb.instanceMatrix.needsUpdate=true;
        if(p._cp) for(const m of p._cp){ m.setMatrixAt(p._bbi,_M); m.instanceMatrix.needsUpdate=true; }
      }
      /* 줄기는 접고 그 자리에 **그루터기**를 세운다(사용자 지적 — 예전엔 줄기를 22% 로 눌러 놓아 윗면이 뾰족한 우듬지 끝이었다) */
      _V.set(p.x,p.y,p.z); _S.set(0,0,0); _M.compose(_V,_Q.identity(),_S);
      p._tm.setMatrixAt(p._fi,_M); p._tm.instanceMatrix.needsUpdate=true;
      stumpPut(p);
      if(p._col){ p._col.r=0.45*p.s; p._col.prof=null; }
    }else if(p._lb) for(let j=p.br;j<p.brMax;j++) hideLimb(p,j);
    /* 남은 아래 가지는 0..br-1, 꺾인 것은 br..brMax-1 — **꺾인 것을 전부** 숨긴다(몇 번 불러도 같다).
       예전엔 '방금 꺾인 것' 하나(br 번)만 숨겨서 ① 저장을 불러오면(`restore` 가 한 번 부른다) 앞서 꺾은 가지가
       되살아났고 ② 도끼질(통나무)은 br 이 그대로라 br=brMax 번 — 꺾을 수 없는 **구조 가지** 하나 — 를 지웠다. */
    return;
  }
  // 암석은 자기 정점 구간을 직접 오므린다 (인스턴스 행렬이 없다)
  if(p._batch){
    let k;
    if(p.vanish) k = p.br>0?1:0;
    else if(p.oreMax) k=0.45+0.55*(p.ore/p.oreMax);
    else k=1;
    const f=k/(p._k||1);
    if(Math.abs(f-1)<1e-6) return;
    p._k=k;
    const a=p._batch.geometry.attributes.position, arr=a.array;
    const s0=p._vs*3, e0=s0+p._vn*3;
    for(let i=s0;i<e0;i+=3){
      arr[i]  =p.x  +(arr[i]  -p.x )*f;
      arr[i+1]=p._cy+(arr[i+1]-p._cy)*f;
      arr[i+2]=p.z  +(arr[i+2]-p.z )*f;
    }
    a.needsUpdate=true;
    LIGHT.dirtyAt(p.x,p.z,3);                  // 오므라든 바위 그림자
    return;
  }
  if(!p._fm) return;
  let k;
  if(p.vanish) k = p.br>0?1:0;                       // 단괴·자갈 → 주우면 사라짐
  else if(p.oreMax) k=0.45+0.55*(p.ore/p.oreMax);    // 광석 노두 → 파낼수록 작아짐
  else k=0.62+0.38*(p.br/Math.max(1,p.brMax));
  _E.set(0,p.r,0); _Q.setFromEuler(_E); _S.set(p.s*k,p.s*k,p.s*k);
  _V.set(p.x,p.y+p._foff,p.z);
  _M.compose(_V,_Q,_S);
  p._fm.setMatrixAt(p._fi,_M);
  p._fm.instanceMatrix.needsUpdate=true;
}
/* 알림 — 채취 표시(#look) 밑의 따로 된 칸(#toast)에 최대 세 줄 쌓는다. 같은 말이 잇달아 오면 한 줄에 ×n 으로 센다.
   예전엔 #look 의 글을 빌려 써서, 캐는 동안 '+1' 이 뜰 때마다 1.4초씩 진행 막대가 가려졌다(사용자 지적) */
const TOASTS=[]; let toastDirty=false;
function toast(m){
  const last=TOASTS[TOASTS.length-1];
  if(last&&last.m===m){ last.n++; last.t=2.4; }
  else{ TOASTS.push({m,n:1,t:2.4}); if(TOASTS.length>3) TOASTS.shift(); }
  toastDirty=true;
}
function updateToasts(dt){
  const el=document.getElementById('toast'); if(!el) return;
  let gone=false;
  for(const q of TOASTS){ q.t-=dt; if(q.t<=0) gone=true; }
  if(gone){ for(let i=TOASTS.length-1;i>=0;i--) if(TOASTS[i].t<=0) TOASTS.splice(i,1); toastDirty=true; }
  if(toastDirty){
    toastDirty=false;
    el.innerHTML=TOASTS.map(q=>'<div>'+String(q.m).replace(/[<>&]/g,'')+(q.n>1?'<span class="n">×'+q.n+'</span>':'')+'</div>').join('');
  }
  const ds=el.children;                             // 끝 0.4초는 흐려지며 사라진다
  for(let i=0;i<ds.length&&i<TOASTS.length;i++){ const o=Math.min(1,TOASTS[i].t/0.4).toFixed(2); if(ds[i]._o!==o){ ds[i]._o=o; ds[i].style.opacity=o; } }
}
