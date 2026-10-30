/* 55-craft.js — CASTAWAY
   제작 — RECIPES 표 · 재료 세기 · 작업대(STATION) · 만들기 진행(updateCraft) · 제작 창
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12) 제작
   ----------------------------------------------------------------------------
   재료는 품목(id) 또는 분류(tag)로 지정한다. 분류를 쓰면 "나뭇가지면 수종 무관"
   같은 조건을 표현할 수 있다. 제작에는 시간과 기력이 든다.
   ========================================================================== */
/* in = 소모 재료 · need = 손에 있어야 하지만 닳지 않는 도구 · chance = 성공률 */
const RECIPES=[
  {id:'axe_crude', tier:'풀과 돌', n:'간이 도끼', out:{id:'axe_crude',n:1}, time:6, stam:15,
   note:'돌멩이를 나뭇가지에 얹고 풀잎을 꼬아 묶는다. 결속이 약해 오래 못 간다.',
   in:[{id:'branch',n:1},{id:'grass_blade',n:8},{id:'pebble',n:1}]},

  {id:'fiber', tier:'풀과 돌', n:'섬유', out:{id:'fiber',n:1}, time:2.4, stam:4,
   note:'날카로운 돌로 풀잎을 긁어 겉껍질을 벗기고 속섬유만 추린다.',
   in:[{id:'grass_blade',n:4}], need:[{tag:'sharp',n:1}]},

  {id:'fiber_reed', tier:'풀과 돌', n:'섬유 (갈대)', out:{id:'fiber',n:2}, time:3.2, stam:6,
   note:'갈대 줄기를 쪼개 겉대를 벗긴다. 대가 길어 한 대에서 나오는 속섬유가 많다.',
   in:[{id:'reed_stalk',n:3}], need:[{tag:'sharp',n:1}]},

  {id:'cord', tier:'풀과 돌', n:'노끈', out:{id:'cord',n:1}, time:3.2, stam:5,
   note:'섬유 가닥을 반대 방향으로 꼬아 겹치면 풀리지 않는 줄이 된다.',
   in:[{id:'fiber',n:3}]},

  {id:'net_cord', tier:'풀과 돌', n:'노끈 그물', out:{id:'net_cord',n:1}, time:22, stam:18,
   note:'노끈을 한 뼘 간격으로 매듭지어 그물코를 뜬다. 물에 들어가 던지면 '
       +'물고기가 걸린다. 코가 굵어 작은 것은 빠져나간다.',
   in:[{id:'cord',n:8},{id:'branch',n:2}]},
  {id:'canoe', tier:'나무와 점토', n:'통나무배', out:{id:'canoe',n:1}, time:45, stam:30,
   note:'통나무 둘을 이어 속을 불로 그을리고 돌로 긁어 파낸다. 이음매는 송진으로 메운다. 들고 물가에서 물을 보고 누르면 띄운다 — E 로 탄다.',
   in:[{id:'log',n:4},{id:'cord',n:6},{id:'resin',n:3}]},
  {id:'rod_wood', tier:'풀과 돌', n:'낚싯대', out:{id:'rod_wood',n:1}, time:12, stam:8,
   note:'곧은 가지 끝에 노끈을 감고 부싯돌을 갈아 굽은 바늘을 단다. 물에 찌를 던져 기다리면 물고기 그림자가 다가온다 — 찌가 잠기면 바로 당긴다.',
   in:[{id:'branch',n:2},{id:'cord',n:4},{id:'flint',n:1}]},
  {id:'rod_steel', tier:'강철', n:'쇠바늘 낚싯대', out:{id:'rod_steel',n:1}, time:16, stam:10, station:'anvil',
   note:'모루에서 쇠를 가늘게 늘여 미늘 달린 바늘을 만든다. 참치·황새치처럼 큰 물고기도 끌어올린다.',
   in:[{id:'branch',n:2},{id:'cord',n:6},{id:'ingot_steel',n:1}]},
  {id:'bug_net', tier:'풀과 돌', n:'잠자리채', out:{id:'bug_net',n:1}, time:10, stam:8,
   note:'가지를 휘어 테를 만들고 섬유로 촘촘한 자루를 뜬다. 나비·잠자리·반딧불이를 떠낸다 — 담을 유리병이 있어야 한다.',
   in:[{id:'branch',n:2},{id:'fiber',n:6},{id:'cord',n:2}]},
  {id:'jar', tier:'바다와 살림', n:'유리병', out:{id:'jar',n:2}, time:8, stam:4, station:'fire',
   note:'유리를 타는 모닥불에 다시 녹여 대롱으로 불어 병 둘을 만든다. 잡은 벌레를 담는다.',
   in:[{id:'glass',n:1}]},

  {id:'tinder_bark', tier:'풀과 돌', n:'부싯깃(나무껍질)', out:{id:'tinder',n:2}, time:3, stam:3,
   note:'마른 나무껍질 안쪽을 손으로 비벼 솜처럼 풀어 낸다. 풀잎보다 잘 붙는다.',
   in:[{id:'bark',n:1}]},
  {id:'fiber_bark', tier:'풀과 돌', n:'섬유 (나무껍질)', out:{id:'fiber',n:2}, time:3.2, stam:5,
   note:'나무껍질 안쪽의 질긴 속껍질을 길게 찢어 낸다.',
   in:[{id:'bark',n:2}], need:[{tag:'sharp',n:1}]},
  {id:'tinder', tier:'풀과 돌', n:'부싯깃', out:{id:'tinder',n:1}, time:3, stam:3,
   note:'풀잎을 비벼 부수고 뭉쳐 불씨가 옮겨 붙을 둥지를 만든다.',
   in:[{id:'grass_blade',n:5}]},

  {id:'handaxe', tier:'풀과 돌', n:'주먹도끼', out:{id:'handaxe',n:1}, time:8, stam:12,
   note:'망치돌로 원석 양면을 번갈아 때려 날을 세운다. 자루가 없어 힘이 덜 실린다.',
   in:[{id:'flint',n:1}], need:[{tag:'hammer',n:1}]},

  {id:'point', tier:'풀과 돌', n:'슴베찌르개', out:{id:'point',n:1}, time:11, stam:14,
   note:'격지를 떼어 끝을 뾰족하게 하고 자루에 끼울 슴베를 다듬는다. 손이 많이 간다.',
   in:[{id:'flint',n:1}], need:[{tag:'hammer',n:1}]},

  {id:'pick_crude', tier:'풀과 돌', n:'간이 곡괭이', out:{id:'pick_crude',n:1}, time:7, stam:12,
   note:'뾰족한 돌멩이를 나뭇가지 끝에 대고 노끈으로 단단히 감는다. 무른 광물까지만 먹힌다.',
   in:[{id:'branch',n:1},{id:'pebble',n:1},{id:'cord',n:1}]},

  {id:'bowdrill', tier:'불', n:'활비비', out:{id:'bowdrill',n:1}, time:8, stam:10,
   note:'휜 나뭇가지에 노끈을 매어 활을 만들고, 곧은 가지를 송곳으로 삼는다.',
   in:[{id:'branch',n:2},{id:'cord',n:1}]},

  {id:'campfire', tier:'불', n:'모닥불 짓기', out:null, place:'campfire', time:10, stam:12,
   note:'돌을 둘러 바람을 막고 가운데 땔감을 쌓는다. 발밑에 설치된다.',
   in:[{id:'branch',n:5},{id:'pebble',n:6}]},

  {id:'torch', tier:'불', n:'횃불', out:{id:'torch',n:1}, time:4, stam:5,
   note:'나뭇가지 끝에 섬유를 두툼히 감는다. 불붙은 모닥불에 대면 옮겨 붙는다.',
   in:[{id:'branch',n:1},{id:'fiber',n:2}]},

  {id:'bow_wood', tier:'불', n:'나무 활', out:{id:'bow_wood',n:1}, time:16, stam:14,
   note:'곧은 통나무를 쪼개 한쪽이 휘도록 깎고 노끈 시위를 건다. 돌창보다 멀리 닿는다.',
   in:[{id:'log',n:1},{id:'cord',n:3}], need:[{tag:'sharp',n:1}]},
  {id:'slingshot', tier:'풀과 돌', n:'새총', out:{id:'slingshot',n:1}, time:6, stam:5,
   note:'두 갈래로 벌어진 가지에 질긴 덩굴을 건다. 돌멩이를 걸어 당겼다 놓으면 나는 새를 떨어뜨린다.',
   in:[{id:'branch',n:1},{id:'vine',n:1}], need:[{tag:'sharp',n:1}]},
  {id:'slingshot_cord', tier:'풀과 돌', n:'새총(노끈)', out:{id:'slingshot',n:1}, time:7, stam:5,
   note:'덩굴이 없으면 노끈 두 가닥을 꼬아 건다.',
   in:[{id:'branch',n:1},{id:'cord',n:2}], need:[{tag:'sharp',n:1}]},
  {id:'arrow_flint_feather', tier:'불', n:'부싯돌 화살(깃털)', out:{id:'arrow_flint',n:5}, time:9, stam:8,
   note:'깃을 풀잎 대신 새 깃털로 단다. 곧게 날아 같은 재료로 다섯 대가 쓸 만하다.',
   in:[{id:'flint',n:1},{id:'branch',n:2},{id:'fiber',n:2},{id:'feather',n:3}],
   need:[{tag:'hammer',n:1}]},
  {id:'arrow_flint', tier:'불', n:'부싯돌 화살', out:{id:'arrow_flint',n:3}, time:9, stam:8,
   note:'부싯돌에서 격지 셋을 떼어 가지 끝에 끼우고 섬유로 감는다. 깃은 풀잎이다.',
   in:[{id:'flint',n:1},{id:'branch',n:2},{id:'fiber',n:2},{id:'grass_blade',n:3}],
   need:[{tag:'hammer',n:1}]},
  {id:'bandage_fiber', tier:'불', n:'섬유 붕대', out:{id:'bandage_fiber',n:2}, time:6, stam:4,
   note:'섬유를 촘촘히 떠서 띠를 만든다. 큰 상처는 못 막아도 피는 멎는다.',
   in:[{id:'fiber',n:3},{id:'cord',n:1}]},
  {id:'stew_fish', tier:'불', n:'생선국', out:{id:'stew_fish',n:1}, time:14, stam:4, station:'fire',
   note:'물 담은 토기에 물고기 두 마리를 넣고 끓인다.',
   in:[{tag:'fish',n:2},{id:'pot_water',n:1}]},
  /* ── 소금으로 만드는 것(사용자 요청 — 소금은 바닷가의 흰 더께를 곡괭이로 캔다) ── */
  {id:'fish_salted', tier:'불', n:'소금절이 생선', out:{id:'fish_salted',n:2}, time:8, stam:3,
   note:'배를 가른 물고기를 소금에 묻어 둔다. 불이 없어도 되고, 오래간다(상하지 않는다).',
   in:[{tag:'fish',n:2},{id:'salt',n:1}]},
  {id:'meat_salted', tier:'불', n:'염장 고기', out:{id:'meat_salted',n:1}, time:8, stam:3,
   note:'고기를 소금에 절인다. 오래 두고 먹는다.',
   in:[{id:'meat_bear',n:1},{id:'salt',n:1}]},
  {id:'fish_grill_salt', tier:'불', n:'소금구이', out:{id:'fish_grill_salt',n:1}, time:10, stam:3, station:'fire',
   note:'소금을 쳐서 불에 굽는다.',
   in:[{tag:'fish',n:1},{id:'salt',n:1}]},
  {id:'soup_seaweed', tier:'불', n:'바닷말국', out:{id:'soup_seaweed',n:1}, time:12, stam:4, station:'fire',
   note:'물 담은 토기에 바닷말과 소금을 넣고 끓인다.',
   in:[{id:'seaweed',n:2},{id:'salt',n:1},{id:'pot_water',n:1}]},
  {id:'soup_mushroom', tier:'불', n:'버섯국', out:{id:'soup_mushroom',n:1}, time:14, stam:4, station:'fire',
   note:'버섯과 고사리를 소금으로 간해 끓인다 — 끓이면 날것의 탈이 없다.',
   in:[{id:'mushroom',n:2},{id:'fern',n:1},{id:'salt',n:1},{id:'pot_water',n:1}]},
  {id:'namul', tier:'불', n:'고사리 무침', out:{id:'namul',n:2}, time:5, stam:2,
   note:'익힌 고사리를 소금에 무친다.',
   in:[{id:'fern_cooked',n:2},{id:'salt',n:1}]},
  {id:'egg_mush', tier:'불', n:'버섯 알찜', out:{id:'egg_mush',n:1}, time:10, stam:3, station:'fire',
   note:'새알에 구운 버섯을 넣고 소금으로 간해 익힌다.',
   in:[{id:'egg',n:1},{id:'mushroom_cooked',n:1},{id:'salt',n:1}]},
  {id:'skewer', tier:'불', n:'꼬치구이', out:{id:'skewer',n:1}, time:12, stam:4, station:'fire',
   note:'새고기와 버섯을 나뭇가지에 꿰어 소금을 치고 굽는다.',
   in:[{id:'bird_raw',n:1},{id:'mushroom',n:1},{id:'branch',n:1},{id:'salt',n:1}]},
  {id:'fish_dried', tier:'불', n:'말린 생선', out:{id:'fish_dried',n:2}, time:24, stam:4, station:'fire',
   note:'물고기 배를 갈라 펴서 불가에 말린다.',
   in:[{id:'fish',n:2}], need:[{tag:'sharp',n:1}]},
  {id:'herb_tea_flower', tier:'불', n:'약초 달이기(들꽃)', out:{id:'herb_tea',n:1}, time:12, stam:3, station:'fire',
   note:'물 담은 토기에 들꽃을 한 줌 넣고 달인다. 풀과 베리로 달인 것과 같은 약초 물이다.',
   in:[{id:'pot_water',n:1},{id:'flower',n:4}]},
  {id:'herb_tea', tier:'불', n:'약초 달이기', out:{id:'herb_tea',n:1}, time:12, stam:3, station:'fire',
   note:'물 담은 토기에 쓴 풀과 베리를 넣고 달인다. 날것을 먹고 탈 난 속을 가라앉힌다.',
   in:[{id:'pot_water',n:1},{id:'grass_blade',n:6},{id:'berry',n:2}]},

  {id:'spear', tier:'불', n:'돌창', out:{id:'spear',n:1}, time:9, stam:12,
   note:'자루 끝을 쪼개 슴베를 끼우고 노끈으로 감아 조인다. 송진이 있으면 더 단단해진다.',
   in:[{id:'point',n:1},{id:'branch',n:1},{id:'cord',n:1}]},

  {id:'cape_grass', tier:'옷', n:'풀 도롱이', out:{id:'cape_grass',n:1}, time:16, stam:12,
   note:'긴 풀을 층층이 겹쳐 노끈으로 엮는다. 비를 흘려보내고 바람을 막는다.',
   in:[{id:'grass_blade',n:24},{id:'cord',n:2}]},

  {id:'tunic_fiber', tier:'옷', n:'섬유 옷', out:{id:'tunic_fiber',n:1}, time:26, stam:18,
   note:'섬유를 씨줄 날줄로 엮어 웃옷을 짠다. 갑옷 밑에 받쳐 입으면 쓸림을 막는다.',
   in:[{id:'fiber',n:12},{id:'cord',n:4}]},

  {id:'basket', tier:'옷', n:'엮은 바구니 놓기', out:null, place:'basket', time:18, stam:14,
   note:'갈대를 씨줄 삼아 둥글게 떠 올린다. 짐을 덜어놓는 첫 자리.',
   in:[{id:'reed_stalk',n:8},{id:'cord',n:3}]},

  {id:'pack_woven', tier:'옷', n:'엮은 등짐', out:{id:'pack_woven',n:1}, time:20, stam:15,
   note:'노끈으로 망태를 떠서 어깨끈을 단다. 지고 다닐 수 있는 무게가 늘어난다.',
   in:[{id:'cord',n:3},{id:'fiber',n:6}]},

  {id:'pick_stone', tier:'나무와 점토', n:'돌 곡괭이', out:{id:'pick_stone',n:1}, time:12, stam:20,
   note:'통나무를 깎아 자루로 삼고 주먹도끼를 날로 박아 노끈으로 결박한다.',
   in:[{id:'log',n:1},{id:'handaxe',n:1},{id:'cord',n:2}]},

  {id:'chest', tier:'나무와 점토', n:'나무 상자 짜기', out:null, place:'chest',
   time:30, stam:26,
   note:'통나무를 쪼개 널을 만들고 노끈으로 묶는다. 바구니보다 세 배를 담는다.',
   in:[{id:'log',n:3},{id:'cord',n:4}]},

  {id:'brick_raw', tier:'나무와 점토', n:'벽돌 찍기', out:{id:'brick_raw',n:3}, time:10, stam:8,
   note:'점토를 나무틀에 눌러 찍어 말린다. 타는 모닥불에 넣어 두면 구운 벽돌이 된다.',
   in:[{id:'clay_lump',n:2}]},
  {id:'hearth', tier:'나무와 점토', n:'화덕 올리기', out:null, place:'hearth', time:16, stam:16,
   note:'곁의 모닥불 둘레에 돌을 허리 높이로 쌓고 점토로 틈을 메운다 — 안이 두 배로 넓고(40 → 80 kg · 10 → 20 칸) 두 배 빨리 익는다. 땔감도 두 배로 먹는다. 모닥불 곁에서 짓는다.',
   in:[{id:'pebble',n:10},{id:'clay_lump',n:3}]},
  {id:'lime_burn', tier:'나무와 점토', n:'석회 굽기', out:{id:'lime',n:2}, time:20, stam:8, station:'fire',
   note:'석회석을 불에 달궈 부순다. 자갈밭의 흰 돌이 석회석이다.',
   in:[{id:'limestone',n:2}]},
  {id:'cement', tier:'나무와 점토', n:'시멘트 개기', out:{id:'cement',n:1}, time:26, stam:18, station:'fire',
   ret:[{id:'pot',n:1}],
   note:'석회와 재, 모래, 점토를 물에 갠다(로마 시멘트 — 재가 석회와 굳는다). 통 하나로 평평한 땅 세 칸쯤, 비탈은 메울 깊이만큼 더 든다. 들고 땅을 보며 좌클릭하면 터를 다진다.',
   in:[{id:'lime',n:2},{id:'ash',n:3},{id:'pot_sand',n:1},{id:'clay_lump',n:1},{id:'pot_water',n:1}]},
  {id:'kiln', tier:'나무와 점토', n:'가마 짓기', out:null, place:'kiln', time:20, stam:20,
   note:'곁의 모닥불을 구운 벽돌로 둘러 돔을 얹는다 — 안이 두 배로 넓고(40 → 80 kg · 10 → 20 칸) 굽는 빠르기도 두 배다. 모닥불 곁에서 짓는다.',
   in:[{id:'brick',n:16},{id:'clay_lump',n:2}]},
  {id:'pot_raw', tier:'나무와 점토', n:'그릇 빚기', out:{id:'pot_raw',n:1}, time:25, stam:14,
   note:'점토를 가래로 말아 쌓아 올리고 표면을 다듬는다. 그늘에서 말린다.',
   in:[{id:'clay_lump',n:1}]},

  {id:'crucible_raw', tier:'나무와 점토', n:'도가니 빚기', out:{id:'crucible_raw',n:1}, time:32, stam:18,
   note:'벽을 두껍게 올린다. 얇으면 쇳물 열에 갈라진다.',
   in:[{id:'clay_lump',n:2}]},

  {id:'b_thatch_found', tier:'불', n:'초가 토대', out:null, place:'build',
   build:'found', btier:0, time:0, stam:0,
   note:'바닥 널을 깔고 네 귀퉁이에 기둥을 받친다. 옆에 붙여 놓으면 높이가 저절로 맞는다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:6},{id:'cord',n:3}]},
  {id:'b_thatch_wall', tier:'불', n:'초가 벽', out:null, place:'build',
   build:'wall', btier:0, time:0, stam:0,
   note:'토대의 네 변 중 바라보는 쪽에 붙는다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:5},{id:'fiber',n:6},{id:'cord',n:2}]},
  {id:'b_thatch_roof', tier:'불', n:'초가 지붕', out:null, place:'build',
   build:'roof', btier:0, time:0, stam:0,
   note:'밟고 다닐 수 있는 바닥이 된다 — 그 위에 다시 벽을 세워 이층을 올린다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:5},{id:'fiber',n:8},{id:'cord',n:2}]},
  {id:'b_thatch_slope', tier:'불', n:'초가 경사 지붕', out:null, place:'build',
   build:'slope', btier:0, time:0, stam:0,
   note:'한 칸을 가로지르며 2.4 m 솟는 38.7° 비탈이다 — 걸어서 올라간다. 벽과 같은 층 자리라 1층에 놓으면 계단 노릇을 해 지붕 위로 올려 준다. 바라보는 변 쪽이 솟는다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:6},{id:'fiber',n:8},{id:'cord',n:3}]},
  {id:'b_thatch_gable', tier:'불', n:'초가 삼각 벽', out:null, place:'build',
   build:'gable', btier:0, time:0, stam:0,
   note:'밑변 3 m · 높이 2.4 m 인 직각삼각형 벽. 경사 지붕 밑 빈 삼각형을 딱 메운다. 방향이 둘이라 J 로 좌·우를 뒤집는다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:4},{id:'fiber',n:5},{id:'cord',n:2}]},
  {id:'b_thatch_door', tier:'불', n:'초가 문', out:null, place:'build',
   build:'door', btier:0, time:0, stam:0,
   note:'폭 1.2 m · 높이 2.0 m 로 뚫은 문틀. 벽과 같은 자리에 서고, 뚫린 만큼 충돌체를 빼서 그냥 걸어 지난다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:4},{id:'fiber',n:4},{id:'cord',n:2}]},
  {id:'b_thatch_window', tier:'불', n:'초가 창문', out:null, place:'build',
   build:'window', btier:0, time:0, stam:0,
   note:'폭 1.4 m · 높이 0.9 m 창을 턱 1.0 m 높이에 낸다. 뚫려 보이지만 벽처럼 막는다. 내구 80. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:4},{id:'fiber',n:5},{id:'cord',n:2}]},
  {id:'b_thatch_leaf', tier:'불', n:'초가 문짝', out:null, place:'build',
   build:'leaf', btier:0, time:0, stam:0,
   note:'문틀에 다는 널문. 좌클릭으로 여닫고, 닫으면 뚫려 있던 자리가 도로 막힌다. 여는 각 95°. 내구 80.',
   in:[{id:'branch',n:6},{id:'cord',n:3}]},
  {id:'b_thatch_pane', tier:'불', n:'초가 창짝', out:null, place:'build',
   build:'pane', btier:0, time:0, stam:0,
   note:'창틀에 다는 유리 여닫이. 규사를 녹여 만든 유리판을 창살에 끼운다. 좌클릭으로 여닫는다. 내구 80.',
   in:[{id:'glass',n:2},{id:'branch',n:3},{id:'cord',n:2}]},
  {id:'b_thatch_post', tier:'불', n:'초가 기둥 틀', out:null, place:'build',
   build:'post', btier:0, time:0, stam:0,
   note:'네 귀퉁이 기둥과 도리 — 토대도 벽도 없이 맨땅에 서고, 그 위에 지붕을 얹으면 차양이 된다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'branch',n:4},{id:'cord',n:2}]},
  {id:'b_wood_post', tier:'나무와 점토', n:'나무 기둥 틀', out:null, place:'build',
   build:'post', btier:1, time:0, stam:0,
   note:'네 귀퉁이 기둥과 도리 — 토대도 벽도 없이 맨땅에 서고, 그 위에 지붕을 얹으면 차양이 된다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:2},{id:'cord',n:2}]},
  {id:'b_stone_post', tier:'간석기', n:'돌 기둥 틀', out:null, place:'build',
   build:'post', btier:2, time:0, stam:0,
   note:'네 귀퉁이 기둥과 도리 — 토대도 벽도 없이 맨땅에 서고, 그 위에 지붕을 얹으면 차양이 된다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:2},{id:'clay_lump',n:1}]},
  {id:'b_brick_found', tier:'나무와 점토', n:'벽돌 토대', out:null, place:'build',
   build:'found', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:6},{id:'clay_lump',n:2}]},
  {id:'b_brick_wall', tier:'나무와 점토', n:'벽돌 벽', out:null, place:'build',
   build:'wall', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:5},{id:'clay_lump',n:1}]},
  {id:'b_brick_roof', tier:'나무와 점토', n:'벽돌 지붕', out:null, place:'build',
   build:'roof', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_brick_slope', tier:'나무와 점토', n:'벽돌 경사 지붕', out:null, place:'build',
   build:'slope', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:5},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_brick_gable', tier:'나무와 점토', n:'벽돌 삼각 벽', out:null, place:'build',
   build:'gable', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:3},{id:'clay_lump',n:1}]},
  {id:'b_brick_door', tier:'나무와 점토', n:'벽돌 문', out:null, place:'build',
   build:'door', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_brick_window', tier:'나무와 점토', n:'벽돌 창문', out:null, place:'build',
   build:'window', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_brick_leaf', tier:'나무와 점토', n:'벽돌 문짝', out:null, place:'build',
   build:'leaf', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:4}]},
  {id:'b_brick_pane', tier:'나무와 점토', n:'벽돌 창짝', out:null, place:'build',
   build:'pane', btier:3, time:0, stam:0,
   note:'구운 벽돌을 점토로 붙여 쌓는다. 내구 1400 — 가장 튼튼하다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'glass',n:3},{id:'log',n:1},{id:'cord',n:2}]},
  {id:'b_brick_post', tier:'나무와 점토', n:'벽돌 기둥 틀', out:null, place:'build',
   build:'post', btier:3, time:0, stam:0,
   note:'네 귀퉁이 기둥과 도리 — 토대도 벽도 없이 맨땅에 서고, 그 위에 지붕을 얹으면 차양이 된다. 누르면 짓기 모드로 들어간다.',
   in:[{id:'brick',n:4},{id:'clay_lump',n:1}]},
  {id:'b_wood_found', tier:'나무와 점토', n:'나무 토대', out:null, place:'build',
   build:'found', btier:1, time:0, stam:0,
   note:'바닥 널을 깔고 네 귀퉁이에 기둥을 받친다. 옆에 붙여 놓으면 높이가 저절로 맞는다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:3},{id:'cord',n:3}]},
  {id:'b_wood_wall', tier:'나무와 점토', n:'나무 벽', out:null, place:'build',
   build:'wall', btier:1, time:0, stam:0,
   note:'토대의 네 변 중 바라보는 쪽에 붙는다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:1},{id:'branch',n:5},{id:'cord',n:3}]},
  {id:'b_wood_roof', tier:'나무와 점토', n:'나무 지붕', out:null, place:'build',
   build:'roof', btier:1, time:0, stam:0,
   note:'밟고 다닐 수 있는 바닥이 된다 — 그 위에 다시 벽을 세워 이층을 올린다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:1},{id:'branch',n:6},{id:'cord',n:3}]},
  {id:'b_wood_slope', tier:'나무와 점토', n:'나무 경사 지붕', out:null, place:'build',
   build:'slope', btier:1, time:0, stam:0,
   note:'한 칸을 가로지르며 2.4 m 솟는 38.7° 비탈이다 — 걸어서 올라간다. 벽과 같은 층 자리라 1층에 놓으면 계단 노릇을 해 지붕 위로 올려 준다. 바라보는 변 쪽이 솟는다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:3}]},
  {id:'b_wood_gable', tier:'나무와 점토', n:'나무 삼각 벽', out:null, place:'build',
   build:'gable', btier:1, time:0, stam:0,
   note:'밑변 3 m · 높이 2.4 m 인 직각삼각형 벽. 경사 지붕 밑 빈 삼각형을 딱 메운다. 방향이 둘이라 J 로 좌·우를 뒤집는다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:1},{id:'branch',n:3},{id:'cord',n:2}]},
  {id:'b_wood_door', tier:'나무와 점토', n:'나무 문', out:null, place:'build',
   build:'door', btier:1, time:0, stam:0,
   note:'폭 1.2 m · 높이 2.0 m 로 뚫은 문틀. 벽과 같은 자리에 서고, 뚫린 만큼 충돌체를 빼서 그냥 걸어 지난다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:1},{id:'branch',n:3},{id:'cord',n:3}]},
  {id:'b_wood_window', tier:'나무와 점토', n:'나무 창문', out:null, place:'build',
   build:'window', btier:1, time:0, stam:0,
   note:'폭 1.4 m · 높이 0.9 m 창을 턱 1.0 m 높이에 낸다. 뚫려 보이지만 벽처럼 막는다. 내구 300. 누르면 짓기 모드로 들어간다.',
   in:[{id:'log',n:1},{id:'branch',n:4},{id:'cord',n:2}]},
  {id:'b_wood_leaf', tier:'나무와 점토', n:'나무 문짝', out:null, place:'build',
   build:'leaf', btier:1, time:0, stam:0,
   note:'문틀에 다는 널문. 좌클릭으로 여닫고, 닫으면 뚫려 있던 자리가 도로 막힌다. 여는 각 95°. 내구 300.',
   in:[{id:'log',n:1},{id:'branch',n:4},{id:'cord',n:3}]},
  {id:'b_wood_pane', tier:'나무와 점토', n:'나무 창짝', out:null, place:'build',
   build:'pane', btier:1, time:0, stam:0,
   note:'창틀에 다는 유리 여닫이. 규사를 녹여 만든 유리판을 창살에 끼운다. 좌클릭으로 여닫는다. 내구 300.',
   in:[{id:'glass',n:2},{id:'log',n:1},{id:'cord',n:2}]},
  {id:'b_stone_found', tier:'간석기', n:'돌 토대', out:null, place:'build',
   build:'found', btier:2, time:0, stam:0,
   note:'바닥 널을 깔고 네 귀퉁이에 기둥을 받친다. 옆에 붙여 놓으면 높이가 저절로 맞는다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:4},{id:'clay_lump',n:2}]},
  {id:'b_stone_wall', tier:'간석기', n:'돌 벽', out:null, place:'build',
   build:'wall', btier:2, time:0, stam:0,
   note:'토대의 네 변 중 바라보는 쪽에 붙는다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:3},{id:'clay_lump',n:2}]},
  {id:'b_stone_roof', tier:'간석기', n:'돌 지붕', out:null, place:'build',
   build:'roof', btier:2, time:0, stam:0,
   note:'밟고 다닐 수 있는 바닥이 된다 — 그 위에 다시 벽을 세워 이층을 올린다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:3},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_stone_slope', tier:'간석기', n:'돌 경사 지붕', out:null, place:'build',
   build:'slope', btier:2, time:0, stam:0,
   note:'한 칸을 가로지르며 2.4 m 솟는 38.7° 비탈이다 — 걸어서 올라간다. 벽과 같은 층 자리라 1층에 놓으면 계단 노릇을 해 지붕 위로 올려 준다. 바라보는 변 쪽이 솟는다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:4},{id:'log',n:1},{id:'clay_lump',n:2}]},
  {id:'b_stone_gable', tier:'간석기', n:'돌 삼각 벽', out:null, place:'build',
   build:'gable', btier:2, time:0, stam:0,
   note:'밑변 3 m · 높이 2.4 m 인 직각삼각형 벽. 경사 지붕 밑 빈 삼각형을 딱 메운다. 방향이 둘이라 J 로 좌·우를 뒤집는다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:2},{id:'clay_lump',n:1}]},
  {id:'b_stone_door', tier:'간석기', n:'돌 문', out:null, place:'build',
   build:'door', btier:2, time:0, stam:0,
   note:'폭 1.2 m · 높이 2.0 m 로 뚫은 문틀. 벽과 같은 자리에 서고, 뚫린 만큼 충돌체를 빼서 그냥 걸어 지난다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:2},{id:'log',n:1},{id:'clay_lump',n:2}]},
  {id:'b_stone_window', tier:'간석기', n:'돌 창문', out:null, place:'build',
   build:'window', btier:2, time:0, stam:0,
   note:'폭 1.4 m · 높이 0.9 m 창을 턱 1.0 m 높이에 낸다. 뚫려 보이지만 벽처럼 막는다. 내구 900. 누르면 짓기 모드로 들어간다.',
   in:[{id:'stone_block',n:2},{id:'log',n:1},{id:'clay_lump',n:1}]},
  {id:'b_stone_leaf', tier:'간석기', n:'돌 문짝', out:null, place:'build',
   build:'leaf', btier:2, time:0, stam:0,
   note:'문틀에 다는 널문. 좌클릭으로 여닫고, 닫으면 뚫려 있던 자리가 도로 막힌다. 여는 각 95°. 내구 900.',
   in:[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:4}]},
  {id:'b_stone_pane', tier:'간석기', n:'돌 창짝', out:null, place:'build',
   build:'pane', btier:2, time:0, stam:0,
   note:'창틀에 다는 유리 여닫이. 규사를 녹여 만든 유리판을 창살에 끼운다. 좌클릭으로 여닫는다. 내구 900.',
   in:[{id:'glass',n:3},{id:'log',n:1},{id:'cord',n:2}]},

  {id:'charcoal_pile', tier:'나무와 점토', n:'숯가마 쌓기', out:{id:'charcoal_pile',n:1}, time:20, stam:14,
   note:'통나무를 쌓고 점토와 흙으로 덮어 공기를 막는다. 모닥불에 묻으면 숯이 된다.',
   in:[{id:'log',n:1},{id:'clay_lump',n:1}]},

  {id:'grindstone', tier:'간석기', n:'숫돌 놓기', out:null, place:'grind', time:14, stam:16,
   note:'납작한 석재를 돌 받침 위에 얹는다. 여기서 석기를 갈아 날을 세운다.',
   in:[{id:'stone_block',n:2},{id:'pebble',n:4}]},

  {id:'blade_polished', tier:'간석기', n:'마제 석기날', out:{id:'blade_polished',n:1},
   time:45, stam:40, station:'grind',
   note:'모래와 물을 뿌려가며 석재를 갈아낸다. 뗀석기와 달리 몹시 오래 걸린다.',
   in:[{id:'stone_block',n:1}]},

  {id:'axe_stone', tier:'간석기', n:'간석기 도끼', out:{id:'axe_stone',n:1}, time:14, stam:18,
   note:'간 날을 쪼갠 자루에 끼우고 노끈으로 조인다. 조잡한 도끼와는 비교가 안 된다.',
   in:[{id:'blade_polished',n:1},{id:'branch',n:2},{id:'cord',n:2}]},

  {id:'pick_polished', tier:'간석기', n:'간석기 곡괭이', out:{id:'pick_polished',n:1}, time:16, stam:20,
   note:'긴 자루에 간 날을 박고 세 겹으로 묶는다. 화강암은 여전히 불로 깨야 한다.',
   in:[{id:'blade_polished',n:1},{id:'log',n:1},{id:'cord',n:3}]},

  {id:'blowpipe', tier:'금속', n:'송풍관', out:{id:'blowpipe',n:1}, time:6, stam:5,
   note:'속 빈 갈대 대롱. 불에 바람을 불어넣어 온도를 끌어올린다.',
   in:[{id:'reed_stalk',n:2}]},

  {id:'furnace', tier:'금속', n:'제련로 쌓기', out:null, place:'furnace', time:26, stam:26,
   note:'석재를 원통으로 쌓고 점토로 이겨 붙인다. 모닥불 열로는 광석이 녹지 않는다.',
   in:[{id:'stone_block',n:4},{id:'clay_lump',n:3}]},

  /* 제련은 더 이상 제작창에서 하지 않는다 — 제련로 안에 넣어두면 알아서 된다.
     표는 SMELT 로 옮겼다. */

  {id:'axe_bronze', tier:'금속', n:'청동 도끼', out:{id:'axe_bronze',n:1}, time:18, stam:20,
   note:'주조한 날을 자루에 끼우고 조인다. 날이 무뎌져도 갈아 되살릴 수 있다.',
   in:[{id:'ingot_bronze',n:2},{id:'branch',n:2},{id:'cord',n:2}]},

  {id:'pick_bronze', tier:'금속', n:'청동 곡괭이', out:{id:'pick_bronze',n:1}, time:20, stam:22,
   note:'긴 자루에 청동 날을 박는다. 그래도 화강암은 불로 깨야 한다.',
   in:[{id:'ingot_bronze',n:2},{id:'log',n:1},{id:'cord',n:3}]}
,

  {id:'helm_bronze', tier:'금속', n:'청동 투구', out:{id:'helm_bronze',n:1},
   time:30, stam:28, station:'furnace',
   note:'주괴를 판으로 두들겨 펴서 머리 모양으로 잡는다.',
   in:[{id:'ingot_bronze',n:2},{id:'charcoal',n:2},{id:'cord',n:2}]},

  {id:'scale_bronze', tier:'금속', n:'청동 비늘 갑옷', out:{id:'scale_bronze',n:1},
   time:48, stam:40, station:'furnace',
   note:'작은 비늘을 여러 장 떠서 섬유 바탕에 겹쳐 꿴다. 이어 붙인 자리가 관절이 된다.',
   in:[{id:'ingot_bronze',n:4},{id:'cord',n:6},{id:'fiber',n:8}]},

  {id:'hammer_stone', tier:'철기', n:'돌망치', out:{id:'hammer_stone',n:1}, time:12, stam:14,
   note:'넓적한 석재를 자루에 물리고 노끈으로 조인다. 달군 쇠를 두들기는 데 쓴다.',
   in:[{id:'stone_block',n:1},{id:'branch',n:1},{id:'cord',n:2}]},

  {id:'anvil', tier:'철기', n:'모루 놓기', out:null, place:'anvil', time:18, stam:20,
   note:'통나무 그루터기에 넓적한 석재를 얹는다. 여기서 쇠를 두들긴다.',
   in:[{id:'stone_block',n:3},{id:'log',n:1}]},

  {id:'iron_wrought', tier:'철기', n:'정련 단조', out:{id:'iron_wrought',n:1},
   time:60, stam:50, station:'anvil',
   note:'괴련철을 벌겋게 달궈 두들긴다. 쇠똥이 튀어나오고 순한 철만 남는다.',
   in:[{id:'bloom_iron',n:1},{id:'charcoal',n:3}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'axe_iron', tier:'철기', n:'철 도끼', out:{id:'axe_iron',n:1},
   time:32, stam:34, station:'anvil',
   note:'연철을 늘려 날을 세우고 자루 구멍을 뚫는다. 청동보다 날이 오래 간다.',
   in:[{id:'iron_wrought',n:2},{id:'charcoal',n:2},{id:'branch',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'pick_iron', tier:'철기', n:'철 곡괭이', out:{id:'pick_iron',n:1},
   time:36, stam:38, station:'anvil',
   note:'양 끝을 뾰족하게 뽑는다. 화강암도 불 없이 직접 쪼갤 수 있다.',
   in:[{id:'iron_wrought',n:2},{id:'charcoal',n:2},{id:'log',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'spear_iron', tier:'철기', n:'철 창', out:{id:'spear_iron',n:1},
   time:26, stam:28, station:'anvil',
   note:'긴 자루에 물릴 소켓까지 한 몸으로 뽑는다. 멀찍이서 먼저 닿는다.',
   in:[{id:'iron_wrought',n:1},{id:'charcoal',n:1},{id:'log',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'sword_iron', tier:'철기', n:'철 검', out:{id:'sword_iron',n:1},
   time:44, stam:42, station:'anvil',
   note:'얇고 길게 늘여 양날을 세우고 슴베에 자루를 끼운다. 가벼워 빨리 휘둘린다.',
   in:[{id:'iron_wrought',n:3},{id:'charcoal',n:3},{id:'cord',n:3}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'axe_war', tier:'철기', n:'철 전투도끼', out:{id:'axe_war',n:1},
   time:38, stam:40, station:'anvil',
   note:'날을 넓게 펴 무게를 날 끝에 몰아준다. 나무를 베기엔 얇다.',
   in:[{id:'iron_wrought',n:3},{id:'charcoal',n:2},{id:'log',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'hammer_iron', tier:'철기', n:'철 해머', out:{id:'hammer_iron',n:1},
   time:46, stam:46, station:'anvil',
   note:'덩이째 남긴 머리를 자루에 박는다. 갑옷째 짓눌러 잠시 멈춰 세운다.',
   in:[{id:'iron_wrought',n:4},{id:'charcoal',n:2},{id:'log',n:1},{id:'cord',n:3}],
   need:[{id:'hammer_stone',n:1}]},

  /* 사냥물 무기 — 모루가 아니라 맨손으로 깎고 묶는다(석기 수준의 손질).
     한 마리에서 나오는 양이 대략 두 자루 분이다. */
  {id:'bandage_mimic', tier:'뼈와 키틴', n:'모방 붕대', out:{id:'bandage_mimic',n:2},
   time:14, stam:8,
   note:'모방 조직을 얇게 저며 거미 실로 누빈다. 살에 대면 그 살을 베껴 눌러앉아 '
       +'속이 뒤집힌 것을 가라앉힌다. 무엇이든 될 수 있는 살이라 무엇에든 맞는다.',
   in:[{id:'mimic_flesh',n:1},{id:'spider_silk',n:2},{id:'fiber',n:3}],
   need:[{tag:'sharp',n:1}]},

  {id:'net_silk', tier:'뼈와 키틴', n:'거미줄 그물', out:{id:'net_silk',n:1},
   time:26, stam:14,
   note:'스킨워커의 실은 노끈보다 가늘면서 질기다. 촘촘히 떠도 무겁지 않아 '
       +'절반 무게에 두 배로 건진다.',
   in:[{id:'spider_silk',n:6},{id:'cord',n:2},{id:'branch',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'sword_chitin', tier:'뼈와 키틴', n:'키틴 검', out:{id:'sword_chitin',n:1},
   time:26, stam:22,
   note:'가고일 껍질을 결대로 쪼개 겹쳐 세우고, 가죽으로 손잡이를 감는다. '
       +'철 검보다 무른 대신 절반 무게이고 조금 더 빠르다.',
   in:[{id:'chitin',n:3},{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'spear_bone', tier:'뼈와 키틴', n:'뼈 창', out:{id:'spear_bone',n:1},
   time:22, stam:20,
   note:'긴 뼈를 비스듬히 갈아 창끝을 세우고 자루에 묶는다. 철 창만큼 멀리 닿고 더 빠르다.',
   in:[{id:'bone',n:3},{id:'log',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'axe_chitin', tier:'뼈와 키틴', n:'키틴 도끼', out:{id:'axe_chitin',n:1},
   time:30, stam:26,
   note:'키틴 판 여러 장을 뼈 심에 물려 넓은 날을 만든다. 한 방은 철 도끼의 4분의 3이다.',
   in:[{id:'chitin',n:3},{id:'bone',n:1},{id:'log',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'hammer_bone', tier:'뼈와 키틴', n:'뼈 해머', out:{id:'hammer_bone',n:1},
   time:28, stam:26,
   note:'관절 뼈를 통째로 자루에 박고 가죽으로 조여 묶는다. 철 해머의 절반 무게다. 기절은 같다.',
   in:[{id:'bone',n:4},{id:'hide',n:1},{id:'log',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'coat_hide', tier:'뼈와 키틴', n:'가죽 속옷', out:{id:'coat_hide',n:1},
   time:30, stam:24,
   note:'가죽을 무두질해 몸에 맞춰 좁게 짓는다. 겉이 아니라 속에 입는 것이라 '
       +'갑옷을 그 위에 그대로 걸친다. 아르크토스 가죽이라 몹시 따뜻하다.',
   in:[{id:'hide',n:3},{id:'bone',n:1},{id:'cord',n:3}],
   need:[{tag:'sharp',n:1}]},

  /* 가죽 — 곰 한 마리에 세 장. 한 가지에 한두 장만 들도록 짰다 */
  {id:'bow_bone', tier:'뼈와 키틴', n:'뼈 덧댄 활', out:{id:'bow_bone',n:1},
   time:34, stam:26,
   note:'활 배에 뼈판을 갈아 붙이고 등에 가죽을 덧대 되튕기는 힘을 모은다. 시위는 거미 실이다.',
   in:[{id:'log',n:1},{id:'bone',n:2},{id:'hide',n:1},{id:'spider_silk',n:3}],
   need:[{tag:'sharp',n:1}]},
  {id:'arrow_bone', tier:'뼈와 키틴', n:'뼈 화살', out:{id:'arrow_bone',n:4},
   time:10, stam:8,
   note:'뼈를 쪼개 촉 넷을 갈아 내고 곧은 가지에 끼운다.',
   in:[{id:'bone',n:1},{id:'branch',n:2},{id:'fiber',n:2}],
   need:[{tag:'sharp',n:1}]},
  {id:'pack_hide', tier:'뼈와 키틴', n:'가죽 배낭', out:{id:'pack_hide',n:1},
   time:28, stam:20,
   note:'뼈로 틀을 짜고 가죽 두 장을 씌워 꿰맨다. 엮은 등짐의 두 배를 진다.',
   in:[{id:'hide',n:2},{id:'bone',n:2},{id:'cord',n:4}],
   need:[{tag:'sharp',n:1}]},
  {id:'waterskin', tier:'뼈와 키틴', n:'가죽 물주머니', out:{id:'waterskin',n:1},
   time:16, stam:10,
   note:'가죽 한 장을 겹쳐 가장자리를 촘촘히 꿰매고 목을 노끈으로 조인다.',
   in:[{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},
  {id:'helm_hide', tier:'뼈와 키틴', n:'가죽 모자', out:{id:'helm_hide',n:1},
   time:14, stam:10,
   note:'가죽 한 장을 머리에 맞게 재단해 꿰맨다.',
   in:[{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},
  {id:'helm_bone', tier:'뼈와 키틴', n:'뼈 투구', out:{id:'helm_bone',n:1},
   time:26, stam:22,
   note:'넓은 뼈판 넷을 갈아 맞추고 가죽 안감에 꿴다.',
   in:[{id:'bone',n:4},{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},
  {id:'waterskin_water', tier:'뼈와 키틴', n:'물주머니 채우기', out:{id:'waterskin_water',n:1},
   time:4, stam:2, station:'water',
   note:'하천이나 분기공 온천에서 채운다. 바닷물은 쓸 수 없다.',
   in:[{id:'waterskin',n:1}]},
  {id:'stew_meat', tier:'뼈와 키틴', n:'고깃국', out:{id:'stew_meat',n:1},
   time:20, stam:4, station:'fire',
   note:'물 담은 토기에 곰 고기를 썰어 넣고 불에 올려 푹 끓인다.',
   in:[{id:'meat_bear',n:1},{id:'pot_water',n:1}]},
  {id:'jerky', tier:'뼈와 키틴', n:'육포', out:{id:'jerky',n:2},
   time:40, stam:6, station:'fire',
   note:'곰 고기를 얇게 저며 불가에 오래 말린다. 구운 것만큼 채우면서 무게는 절반이다.',
   in:[{id:'meat_bear',n:1}], need:[{tag:'sharp',n:1}]},
  {id:'fat', tier:'뼈와 키틴', n:'곰 기름 졸이기', out:{id:'fat',n:1},
   time:30, stam:4, station:'fire',
   note:'기름진 곰 고기를 토기에 졸이면 기름이 뜬다. 토기는 그대로 남는다.',
   in:[{id:'meat_bear',n:2}], need:[{id:'pot',n:1}]},
  {id:'lamp_oil', tier:'뼈와 키틴', n:'기름 등잔', out:{id:'lamp_oil',n:1},
   time:10, stam:4,
   note:'토기에 곰 기름을 붓고 섬유를 꼬아 심지를 세운다. 횃불보다 네 배 오래 탄다.',
   in:[{id:'pot',n:1},{id:'fat',n:2},{id:'fiber',n:1}]},

  {id:'scale_chitin', tier:'뼈와 키틴', n:'키틴 갑옷', out:{id:'scale_chitin',n:1},
   time:48, stam:38,
   note:'키틴 판을 비늘처럼 겹쳐 가죽 바탕에 꿴다. 청동 비늘보다 단단한데 '
       +'무게는 절반도 안 된다. 대신 깨지면 그걸로 끝이다.',
   in:[{id:'chitin',n:6},{id:'hide',n:2},{id:'cord',n:4}],
   need:[{tag:'sharp',n:1}]},

  {id:'scale_ember', tier:'뼈와 키틴', n:'잿불 비늘 갑옷', out:{id:'scale_ember',n:1},
   time:56, stam:44,
   note:'잿불 비늘을 겹쳐 가죽 바탕에 꿴다. 비늘이 제 불을 견디던 것이라 '
       +'불티가 튀어도 데지 않는다. 한 마리분이 꼭 한 벌이다.',
   in:[{id:'ember_scale',n:6},{id:'hide',n:2},{id:'cord',n:4}],
   need:[{tag:'sharp',n:1}]},

  {id:'scale_ember_chitin', tier:'뼈와 키틴', n:'잿불 비늘 키틴 복합 갑옷',
   out:{id:'scale_ember_chitin',n:1},
   time:72, stam:52,
   note:'다 꿴 키틴 갑옷 안쪽에 잿불 비늘을 한 겹 덧대 꿴다. 겉의 키틴이 '
       +'창끝을 받고, 깨진 자리로 들어온 불을 밑의 비늘이 막는다.',
   in:[{id:'scale_chitin',n:1},{id:'ember_scale',n:6},{id:'cord',n:4}],
   need:[{tag:'sharp',n:1}]},

  {id:'helm_ember', tier:'뼈와 키틴', n:'잿불 비늘 투구', out:{id:'helm_ember',n:1},
   time:30, stam:24,
   note:'비늘을 머리 둘레에 맞춰 겹쳐 꿴다. 청동·키틴 투구보다 한 점 낫다.',
   in:[{id:'ember_scale',n:3},{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'helm_ember_chitin', tier:'뼈와 키틴', n:'잿불 비늘 키틴 복합 투구',
   out:{id:'helm_ember_chitin',n:1},
   time:38, stam:30,
   note:'갑옷과 같은 셈이다 — 다 다듬은 키틴 투구 안쪽에 비늘을 덧댄다. '
       +'강철 투구와 같은 5 인데 무게는 절반도 안 된다.',
   in:[{id:'helm_chitin',n:1},{id:'ember_scale',n:3},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'helm_chitin', tier:'뼈와 키틴', n:'키틴 투구', out:{id:'helm_chitin',n:1},
   time:24, stam:20,
   note:'가고일 머리 껍질을 통째로 다듬어 쓴다. 청동 투구와 같은 값에 1.2 kg 이다.',
   in:[{id:'chitin',n:3},{id:'hide',n:1},{id:'cord',n:2}],
   need:[{tag:'sharp',n:1}]},

  {id:'scale_iron', tier:'철기', n:'철 비늘 갑옷', out:{id:'scale_iron',n:1},
   time:64, stam:52, station:'anvil',
   note:'연철을 얇게 늘려 비늘로 자르고 겹쳐 꿴다. 무겁지만 창끝을 튕겨낸다.',
   in:[{id:'iron_wrought',n:5},{id:'charcoal',n:3},{id:'cord',n:6},{id:'fiber',n:8}],
   need:[{id:'hammer_stone',n:1}]},

  /* 토기를 구운 단계에서 바로 길을 수 있어야 한다 — 목이 마르는데 화학까지
     가야 물을 담을 수 있으면 그릇이 그릇 노릇을 못 한다. */
  /* 물병은 처음부터 지니고 내린 것이라 만들 수는 없고, 채우기만 된다.
     그래서 제일 앞 단계에 둔다 — 첫날부터 물가에서 다시 채울 수 있어야 한다. */
  {id:'bamboo_flask', tier:'바다와 살림', n:'대나무 물통', out:{id:'bamboo_flask',n:2}, time:6, stam:5,
   note:'대나무는 마디마다 막혀 있다. 마디 바로 밑을 잘라 내면 그대로 통이다. 한 대에서 둘이 나온다.',
   in:[{id:'bamboo',n:1}], need:[{tag:'sharp',n:1}]},
  {id:'bamboo_water', tier:'맨손', n:'대나무 물통 채우기', out:{id:'bamboo_water',n:1},
   time:3, stam:2, station:'water',
   note:'하천이나 분기공 온천에서 채운다. 바닷물은 쓸 수 없다.',
   in:[{id:'bamboo_flask',n:1}]},
  {id:'bottle_water', tier:'맨손', n:'물병 채우기', out:{id:'bottle_water',n:1},
   time:4, stam:2, station:'water',
   note:'보급선이 쥐여 준 물병을 하천이나 분기공 온천에서 다시 채운다. '
       +'바닷물은 쓸 수 없다.',
   in:[{id:'bottle_empty',n:1}]},

  {id:'pot_water', tier:'나무와 점토', n:'물 긷기', out:{id:'pot_water',n:1},
   time:5, stam:3, station:'water',
   note:'하천이나 분기공 온천에서 토기에 담수를 받는다. 바닷물은 쓸 수 없다.',
   in:[{id:'pot',n:1}]},

  {id:'igniter', tier:'철기', n:'긴 라이터', out:{id:'igniter',n:1},
   time:30, stam:24, station:'anvil',
   note:'철관 끝에 부싯돌 톱니와 쇠 줄을 물린다. 방아쇠를 당기면 관 끝에서 불꽃이 튄다. '
       +'팔 길이만큼 떨어져 모닥불 속에 바로 떨어뜨리므로 부싯깃을 받쳐 둘 필요가 없다.',
   in:[{id:'iron_wrought',n:1},{id:'flint',n:3},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'bucket_iron', tier:'철기', n:'철 양동이', out:{id:'bucket_iron',n:1},
   time:38, stam:30, station:'anvil',
   note:'연철을 얇게 펴 통으로 말고 테를 두른다. 토기보다 무겁지만 깨지지 않고 네 모금이 들어간다.',
   in:[{id:'iron_wrought',n:3},{id:'charcoal',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'bucket_water', tier:'철기', n:'물 긷기(양동이)', out:{id:'bucket_water',n:1},
   time:6, stam:4, station:'water',
   note:'하천이나 분기공 온천에서 양동이를 채운다. 바닷물은 쓸 수 없다.',
   in:[{id:'bucket_iron',n:1}]},

  {id:'ash', tier:'화학', n:'재 긁어내기', out:{id:'ash',n:3},
   time:8, stam:5, station:'fire',
   note:'다 탄 장작을 헤집어 흰 재를 모은다.',
   in:[{id:'branch',n:4}]},

  {id:'lye', tier:'화학', n:'잿물 내리기', out:{id:'lye',n:1},
   time:22, stam:10, station:'fire',
   note:'재를 물에 풀어 웃물을 받는다. 잿물에는 칼륨이 녹아 있다.',
   in:[{id:'ash',n:6},{id:'pot_water',n:1}]},

  {id:'drawplate', tier:'화학', n:'인발판', out:{id:'drawplate',n:1},
   time:34, stam:32, station:'anvil',
   note:'연철판에 점점 좁아지는 구멍을 여러 개 뚫는다. 금속을 가늘게 뽑는 데 쓴다.',
   in:[{id:'iron_wrought',n:2},{id:'charcoal',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'wire_copper', tier:'화학', n:'구리선 뽑기', out:{id:'wire_copper',n:4},
   time:20, stam:18, station:'anvil',
   note:'구리 주괴를 인발판 구멍에 차례로 통과시켜 가늘게 늘인다.',
   in:[{id:'ingot_copper',n:1}], need:[{id:'drawplate',n:1}]},

  {id:'gauze_platinum', tier:'화학', n:'백금 그물망', out:{id:'gauze_platinum',n:1},
   time:40, stam:30, station:'anvil',
   note:'반지를 두들겨 펴고 실처럼 뽑아 그물로 엮는다. 오스트발트법의 촉매다.',
   in:[{id:'ring_platinum',n:1}], need:[{id:'drawplate',n:1}]},

  {id:'magnet', tier:'화학', n:'자석 만들기', out:{id:'magnet',n:1},
   time:26, stam:24, station:'anvil',
   note:'연철 막대를 남북으로 뉘고 한쪽 끝만 되풀이해 두들기면 자성이 남는다.',
   in:[{id:'iron_wrought',n:1}], need:[{id:'hammer_stone',n:1}]},

  {id:'electrode', tier:'화학', n:'탄소 전극', out:{id:'electrode',n:1},
   time:18, stam:12,
   note:'참숯을 곱게 빻아 점토와 이겨 굳힌다. 아크에서 서서히 타 없어진다.',
   in:[{id:'charcoal',n:4},{id:'clay_lump',n:1}]},

  {id:'wheel', tier:'화학', n:'물레방아 놓기', out:null, place:'wheel',
   time:36, stam:34,
   note:'하천 위에 걸어 물살로 축을 돌린다. 유량이 많은 하류일수록 빨리 돈다.',
   in:[{id:'log',n:4},{id:'stone_block',n:2},{id:'cord',n:4}]},

  {id:'dynamo', tier:'화학', n:'발전기 얹기', out:null, place:'dynamo',
   time:30, stam:28,
   note:'구리선을 감은 코일 사이에서 자석을 돌린다. 물레방아나 증기기관 곁(7 m)에 놓는다.',
   in:[{id:'wire_copper',n:8},{id:'magnet',n:2},{id:'log',n:2}]},

  /* 증기기관 — 보일러에 석탄·숯을 때면 증기가 피스톤을 밀어 바퀴를 돌린다.
     물레방아와 달리 하천이 필요 없다 — 7 m 안의 발전기를 돌린다. 모닥불처럼 불을 붙이고 땔감을 넣는다. */
  {id:'steam', tier:'화학', n:'증기기관 세우기', out:null, place:'steam',
   time:60, stam:44,
   note:'철판을 말아 보일러를 두드려 잇고, 구리관으로 증기를 실린더에 보낸다. 강철 피스톤이 '
       +'용수철 밸브로 오가며 무거운 바퀴를 돌린다. 땔감을 넣고 불을 붙이면 곁의 발전기가 돈다.',
   in:[{id:'iron_wrought',n:6},{id:'ingot_steel',n:2},{id:'pipe_copper',n:3},
       {id:'spring_steel',n:2},{id:'stone_block',n:4}]},

  {id:'drill', tier:'화학', n:'전동 드릴', out:{id:'drill',n:1},
   time:50, stam:30, station:'lathe',
   note:'구리선을 감은 전동기에 자석을 물리고, 선반으로 깎은 강철 날끝을 톱니로 잇는다.',
   in:[{id:'ingot_steel',n:3},{id:'wire_copper',n:6},{id:'magnet',n:2},{id:'spring_steel',n:1}]},

  {id:'grenade', tier:'화학', n:'수류탄', out:{id:'grenade',n:2},
   time:24, stam:14, station:'anvil',
   note:'연철 통에 화약을 채우고 뇌관 달린 신관을 박는다. 핀을 뽑고 던지면 3.5초 뒤 터진다.',
   in:[{id:'iron_wrought',n:2},{id:'gunpowder',n:6},{id:'primer',n:2},{id:'cord',n:2}]},   // 한 벌 두 개 — 재료를 두 배로 올리고 피해도 1.5배(330)

  {id:'arc', tier:'화학', n:'아크로 세우기', out:null, place:'arc',
   time:40, stam:36,
   note:'전극 사이에 아크를 걸고 자석으로 부채꼴로 벌린다. 발전기에서 전선이 닿아야 한다.',
   in:[{id:'stone_block',n:6},{id:'clay_lump',n:4},{id:'electrode',n:2},
       {id:'wire_copper',n:4},{id:'magnet',n:1}]},

  {id:'nitric', tier:'화학', n:'질산 뽑기', out:{id:'nitric',n:1},
   time:55, stam:20, station:'arc',
   note:'공기에 아크를 걸어 질소를 산화시키고, 식혀서 물에 녹인다. 전극이 닳는다.',
   in:[{id:'pot_water',n:1},{id:'electrode',n:1}]},

  {id:'saltpeter', tier:'화학', n:'초석 졸이기', out:{id:'saltpeter',n:3},
   time:45, stam:16, station:'fire',
   note:'잿물에 질산을 부어 졸이면 바닥에 흰 결정이 앉는다.',
   in:[{id:'lye',n:1},{id:'nitric',n:1}]},

  /* 황산 — 유황을 태워 나온 연기를 백금 위로 지나게 하면 삼산화황이 되고,
     물에 받으면 황산이다. 백금 그물망은 질산 뽑으려 만든 것인데 여기서도 쓴다
     (닳지 않는다 — 촉매는 반응을 거들 뿐 제 몸은 안 준다). */
  {id:'acid_sulfuric', tier:'화학', n:'황산 받기', out:{id:'acid_sulfuric',n:1},
   time:50, stam:26, station:'fire',
   note:'유황을 태운 연기를 백금 그물망 위로 지나게 하고 물에 받는다. '
       +'눈이 맵고 쇠를 삭인다 — 토기에만 담긴다.',
   in:[{id:'sulfur',n:3},{id:'pot_water',n:1}],
   need:[{id:'gauze_platinum',n:1}]},

  {id:'bulb', tier:'화학', n:'전구 만들기', out:{id:'bulb',n:2},
   time:34, stam:22,
   note:'유리를 불어 구를 만들고 안에 탄소 실을 건다. 공기를 빼 두어야 '
       +'실이 타 없어지지 않고 달아오르기만 한다.',
   in:[{id:'glass',n:1},{id:'wire_copper',n:1},{id:'electrode',n:1}]},

  {id:'battery', tier:'화학', n:'납축전지 짜기', out:{id:'battery',n:1},
   time:70, stam:44,
   note:'납판과 과산화납판을 번갈아 세우고 황산에 담근다. 무겁다 — 8 kg 이 '
       +'넘는다. 발전기 곁에서 좌클릭으로 채운다.',
   in:[{id:'ingot_lead',n:4},{id:'acid_sulfuric',n:2},{id:'wire_copper',n:2},
       {id:'pot',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  /* 리튬이온 전지 — 리튬휘석 → 탄산리튬 → (흑연 음극 · 인산철리튬 양극) → 강철 통에 말기 */
  {id:'li_carbonate', tier:'화학', n:'탄산리튬 앉히기', out:{id:'li_carbonate',n:1},
   time:60, stam:24, station:'fire',
   note:'리튬휘석을 불에 달궈 부풀리고 황산에 우려 리튬을 녹여 낸다. 웃물에 잿물을 부으면 '
       +'흰 탄산리튬이 바닥에 앉는다.',
   in:[{id:'spodumene',n:3},{id:'acid_sulfuric',n:1},{id:'lye',n:1}]},

  {id:'graphite', tier:'화학', n:'흑연 굽기', out:{id:'graphite',n:2},
   time:45, stam:16, station:'arc',
   note:'곱게 빻은 숯을 아크로 오래 달구면 탄소가 층층이 가지런해진다. 전극이 닳는다.',
   in:[{id:'charcoal',n:4},{id:'electrode',n:1}]},

  {id:'cathode_lfp', tier:'화학', n:'인산철리튬 굽기', out:{id:'cathode_lfp',n:2},
   time:55, stam:20, station:'arc',
   note:'생선을 태운 뼈 재를 황산에 녹여 인을 얻고, 철가루 · 탄산리튬 · 숯가루와 이겨 '
       +'공기를 막고 굽는다. 숯이 알갱이에 얇게 입혀져야 전기가 통한다.',
   in:[{id:'li_carbonate',n:1},{id:'fish',n:3},{id:'iron_wrought',n:1},
       {id:'acid_sulfuric',n:1},{id:'charcoal',n:1}]},

  {id:'camc_pack', tier:'화학', n:'캠코더 전지 팩 짜기', out:{id:'camc_pack',n:1}, time:40, stam:14, station:'lathe',
   note:'리튬이온 전지를 풀어 캠코더에 들어갈 크기로 다시 감고, 구리선으로 단자를 낸다. 가방에서 쓰면 캠코더의 낡은 전지를 갈아 끼운다 — 손 충전기로 채울수록 줄던 사용 시간이 처음으로 돌아가고, 훨씬 더디게 닳는다.',
   in:[{id:'battery_li',n:1},{id:'wire_copper',n:2},{id:'resin',n:1}]},
  {id:'battery_li', tier:'화학', n:'리튬이온 전지 말기', out:{id:'battery_li',n:1},
   time:80, stam:30, station:'lathe',
   note:'구리 박에 흑연을, 다른 박에 인산철리튬을 바르고 사이에 얇은 막을 끼워 감는다. '
       +'탄산리튬을 알코올에 녹인 전해액을 붓고 선반으로 깎은 강철 통에 봉한다. '
       +'비어서 나온다 — 발전기 곁에서 좌클릭으로 채운다.',
   in:[{id:'cathode_lfp',n:2},{id:'graphite',n:2},{id:'li_carbonate',n:1},{id:'alcohol',n:1},
       {id:'ingot_steel',n:1},{id:'wire_copper',n:2}]},

  {id:'lamp_electric', tier:'화학', n:'전등 만들기', out:{id:'lamp_electric',n:1},
   time:40, stam:26,
   note:'황동 통에 전구를 물리고 유리로 앞을 막는다. 불씨가 필요 없고 '
       +'바람에도 안 꺼진다 — 횃불이 못 하던 두 가지다.',
   in:[{id:'bulb',n:1},{id:'ingot_brass',n:1},{id:'wire_copper',n:2},
       {id:'glass',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  /* ── 현대식 화기로 가는 길 ────────────────────────────────────────────
     뇌관 → 무연화약 → 강선. 이 셋이 채워지는 차례대로 총이 하나씩 선다. */
  {id:'pipe_copper', tier:'화학', n:'구리관 뽑기', out:{id:'pipe_copper',n:1},
   time:30, stam:22, station:'anvil',
   note:'구리를 인발판에 거푸 통과시켜 관으로 뽑고 나선으로 감는다. '
       +'끓인 김이 이 안을 돌며 식는다.',
   in:[{id:'ingot_copper',n:2},{id:'charcoal',n:1}],
   need:[{id:'drawplate',n:1},{id:'hammer_stone',n:1}]},

  {id:'bandage_clean', tier:'화학', n:'소독 붕대', out:{id:'bandage_clean',n:2},
   time:8, stam:3,
   note:'섬유 붕대를 알코올에 적셔 말린다. 상처가 덧나지 않고 속병도 가라앉는다.',
   in:[{id:'bandage_fiber',n:2},{id:'alcohol',n:1}]},
  {id:'arrow_iron', tier:'철기', n:'쇠 화살', out:{id:'arrow_iron',n:6},
   time:18, stam:16, station:'anvil',
   note:'연철을 두드려 촉 여섯을 뽑고 가지에 박는다.',
   in:[{id:'iron_wrought',n:1},{id:'branch',n:3},{id:'fiber',n:3}],
   need:[{tag:'hammer',n:1}]},

  {id:'alcohol', tier:'화학', n:'술 내리기', out:{id:'alcohol',n:2},
   time:60, stam:24, station:'fire',
   note:'베리를 으깨 두면 절로 괸다. 그것을 은근히 끓여 구리관으로 받으면 '
       +'먼저 나오는 맑은 것이 알코올이다.',
   in:[{id:'berry',n:24},{id:'pot_water',n:1}],
   need:[{id:'pipe_copper',n:1}]},

  /* 뇌홍 — 수은을 질산에 녹이고 알코올을 부으면 흰 결정이 앉는다.
     때리면 터지므로 젖은 채로만 다룬다. 이것이 없으면 방아쇠 한 번에
     확실히 터지지 않아 자동으로 도는 총을 만들 수 없다. */
  {id:'fulminate', tier:'화학', n:'뇌홍 앉히기', out:{id:'fulminate',n:2},
   time:55, stam:30,
   note:'수은을 질산에 녹이고 알코올을 붓는다. 흰 결정이 바닥에 앉는다. '
       +'마른 것은 손대지 않는다 — 긁기만 해도 터진다.',
   in:[{id:'mercury',n:1},{id:'nitric',n:2},{id:'alcohol',n:1}]},

  {id:'primer', tier:'화학', n:'뇌관 만들기', out:{id:'primer',n:20},
   time:38, stam:26, station:'anvil',
   note:'황동을 얇게 떠 작은 컵을 찍고 젖은 뇌홍을 재워 말린다. '
       +'공이가 때리면 불꽃이 약실 안으로 뻗는다.',
   in:[{id:'ingot_brass',n:1},{id:'fulminate',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  /* 면화약 — 섬유를 질산과 황산에 담갔다 헹군다. 연기도 찌꺼기도 없다.
     흑색화약은 찌꺼기가 기관부에 눌어붙어 몇 발 만에 노리쇠를 멈춘다. */
  {id:'guncotton', tier:'화학', n:'면화약 담그기', out:{id:'guncotton',n:3},
   time:48, stam:28,
   note:'섬유를 질산과 황산 섞은 것에 담갔다 물에 거푸 헹군다. '
       +'덜 헹구면 제풀에 삭아 불이 붙는다.',
   in:[{id:'fiber',n:8},{id:'nitric',n:1},{id:'acid_sulfuric',n:1}]},

  {id:'powder_smokeless', tier:'화학', n:'무연화약 굳히기',
   out:{id:'powder_smokeless',n:2},
   time:44, stam:26,
   note:'면화약을 알코올에 풀어 반죽하고 가락으로 눌러 말린다. '
       +'알갱이가 고를수록 타는 결이 고르다.',
   in:[{id:'guncotton',n:3},{id:'alcohol',n:1}]},

  {id:'lathe', tier:'화학', n:'선반 세우기', out:null, place:'lathe',
   time:70, stam:52,
   note:'발전기에서 띠를 걸어 굴대를 돌린다. 두들겨서는 못 하던 일 — '
       +'총열 안을 넓히고 나선 홈을 깎는 것 — 이 여기서 된다. 발전기 12 m 안.',
   in:[{id:'log',n:4},{id:'iron_wrought',n:4},{id:'wire_copper',n:3},
       {id:'stone_block',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'spring_steel', tier:'강철', n:'용수철강 뽑기', out:{id:'spring_steel',n:2},
   time:42, stam:34, station:'anvil',
   note:'강철을 가늘게 뽑아 기름에 담갔다 다시 낮은 불에 되뜨임한다. '
       +'덜 뜨임하면 부러지고 더 뜨임하면 늘어진 채 안 돌아온다.',
   in:[{id:'ingot_steel',n:1},{id:'charcoal',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'barrel_rifled', tier:'강철', n:'강선 총열 깎기', out:{id:'barrel_rifled',n:1},
   time:90, stam:56, station:'lathe',
   note:'강철 막대를 물려 돌리며 안을 넓히고, 브로치를 밀어 나선 홈을 낸다. '
       +'탄이 돌며 날아가 곧게 간다 — 사거리와 맞는 자리가 여기서 갈린다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  /* 탄약 셋 */
  {id:'shell_buck', tier:'화학', n:'산탄 만들기', out:{id:'shell_buck',n:12},
   time:32, stam:22,
   note:'두꺼운 종이를 말아 탄피를 삼고 밑에 뇌관을 박는다. 장약 위에 납 알 '
       +'아홉을 재우고 마구리를 접는다.',
   in:[{id:'ingot_lead',n:1},{id:'gunpowder',n:2},{id:'primer',n:12},
       {id:'fiber',n:2}]},

  {id:'cartridge_smokeless', tier:'화학', n:'무연 소총탄', out:{id:'cartridge_smokeless',n:12},
   time:40, stam:28, station:'anvil',
   note:'황동 탄피에 뇌관을 박고 무연화약을 재고 납심 강철 탄두를 물린다. '
       +'연기가 안 나 쏜 자리가 드러나지 않고, 찌꺼기가 없어 노리쇠가 안 멎는다.',
   in:[{id:'ingot_brass',n:1},{id:'powder_smokeless',n:2},{id:'primer',n:12},
       {id:'ingot_steel',n:1}],
   need:[{id:'drawplate',n:1},{id:'hammer_stone',n:1}]},

  /* 총 셋 — 산탄총은 뇌관만으로 서고, 나머지 둘은 선반이 있어야 한다 */
  {id:'shotgun', tier:'화학', n:'산탄총', out:{id:'shotgun',n:1},
   time:95, stam:70, station:'anvil',
   note:'매끈한 총열이면 된다 — 산탄은 돌면 오히려 흩어지므로 강선이 없는 편이 '
       +'낫다. 뇌관만 있으면 서는, 현대식 화기 중 제일 먼저 만들 수 있는 것이다.',
   in:[{id:'iron_wrought',n:5},{id:'log',n:1},{id:'spring_steel',n:1},
       {id:'charcoal',n:3},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'rifle_semi', tier:'강철', n:'반자동 소총', out:{id:'rifle_semi',n:1},
   time:150, stam:95, station:'lathe',
   note:'총열 밑에 구멍을 내 가스를 뽑고, 그 힘으로 노리쇠를 밀어 젖힌다. '
       +'노리쇠를 손으로 당기던 시간이 통째로 사라진다.',
   in:[{id:'barrel_rifled',n:1},{id:'ingot_steel',n:4},{id:'spring_steel',n:2},
       {id:'log',n:1},{id:'charcoal',n:4}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'smg', tier:'강철', n:'기관단총', out:{id:'smg',n:1},
   time:130, stam:82, station:'lathe',
   note:'가스도 잠금도 없다 — 무거운 노리쇠가 반동으로 열렸다 용수철로 닫히기만 '
       +'한다. 만들기는 제일 쉽고 멀리는 못 간다. 누르고 있으면 계속 나간다.',
   in:[{id:'barrel_rifled',n:1},{id:'ingot_steel',n:2},{id:'spring_steel',n:3},
       {id:'iron_wrought',n:2},{id:'charcoal',n:3}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'rifle_sniper', tier:'강철', n:'대물 저격총', out:{id:'rifle_sniper',n:1},
   time:200, stam:120, station:'lathe',
   note:'강선 총열 둘을 이어 길게 뽑고 끝에 반동을 옆으로 흘리는 제퇴기를 단다. '
       +'유리를 갈아 렌즈 둘로 조준경을 짠다. 무거워서 엎드려 쏘는 총이다.',
   in:[{id:'barrel_rifled',n:2},{id:'ingot_steel',n:6},{id:'spring_steel',n:2},
       {id:'glass',n:2},{id:'log',n:1},{id:'charcoal',n:4}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'cartridge_heavy', tier:'화학', n:'대물탄', out:{id:'cartridge_heavy',n:5},
   time:40, stam:28, station:'anvil',
   note:'굵은 황동 탄피에 무연화약을 소총탄의 세 배로 잰다. 탄두는 강철심.',
   in:[{id:'ingot_brass',n:1},{id:'powder_smokeless',n:3},{id:'primer',n:5},
       {id:'ingot_steel',n:2}]},

  {id:'bazooka', tier:'강철', n:'바주카', out:{id:'bazooka',n:1},
   time:140, stam:90, station:'lathe',
   note:'강철판을 말아 곧은 통을 깎는다. 뒤는 열려 있어 불꽃이 빠진다 — 뒤에 서지 말 것. '
       +'방아쇠는 구리선으로 로켓 꼬리에 불을 댄다.',
   in:[{id:'ingot_steel',n:5},{id:'spring_steel',n:1},{id:'wire_copper',n:2},{id:'log',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'rocket', tier:'화학', n:'로켓탄', out:{id:'rocket',n:2},
   time:36, stam:24, station:'anvil',
   note:'연철 통 꼬리에 무연화약을 재워 밀고, 머리에 화약과 뇌관을 담아 부딪히면 터지게 한다.',
   in:[{id:'iron_wrought',n:3},{id:'powder_smokeless',n:3},{id:'gunpowder',n:6},
       {id:'primer',n:2}]},

  {id:'gunpowder', tier:'화학', n:'화약 빻기', out:{id:'gunpowder',n:2},
   time:30, stam:22,
   note:'초석·유황·숯을 따로 곱게 빻은 뒤 함께 섞는다. 불티가 튀면 안 된다.',
   in:[{id:'saltpeter',n:8},{id:'sulfur',n:2},{id:'charcoal',n:3}]},

  {id:'cartridge', tier:'화학', n:'소총탄 만들기', out:{id:'cartridge',n:10},
   time:34, stam:24, station:'anvil',
   note:'구리를 인발판에 통과시켜 탄피를 뽑고, 장약을 재고 철 탄두를 물린다.',
   in:[{id:'ingot_copper',n:1},{id:'gunpowder',n:2},{id:'iron_wrought',n:1}],
   need:[{id:'drawplate',n:1},{id:'hammer_stone',n:1}]},

  /* 황동 탄피 — 구리보다 훨씬 잘 늘어나 얇고 고르게 뽑힌다.
     같은 품으로 갑절 넘게 나오고, 탄피가 찢기지 않아 버리는 것이 없다. */
  {id:'cartridge_brass', tier:'화학', n:'황동 소총탄', out:{id:'cartridge_brass',n:10},
   time:36, stam:26, station:'anvil',
   note:'황동 탄피는 얇고 질겨 구리보다 센 장약을 견딘다. 같은 수가 나오지만 '
       +'한 발 한 발이 더 깊이 박힌다 — 피해 1.25배.',
   in:[{id:'ingot_brass',n:1},{id:'gunpowder',n:3},{id:'iron_wrought',n:1}],
   need:[{id:'drawplate',n:1},{id:'hammer_stone',n:1}]},

  {id:'rifle_bolt', tier:'화학', n:'볼트 소총', out:{id:'rifle_bolt',n:1},
   time:110, stam:80, station:'anvil',
   note:'총열을 길게 뽑아 뒤를 열리게 깎고, 노리쇠와 탄창을 물린다. 섬에서 만들 수 있는 끝이다.',
   in:[{id:'iron_wrought',n:6},{id:'charcoal',n:4},{id:'log',n:1},
       {id:'ingot_copper',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1},{id:'drawplate',n:1}]},

  {id:'sword_steel', tier:'강철', n:'강철 검', out:{id:'sword_steel',n:1},
   time:58, stam:46, station:'anvil',
   note:'날을 길게 뽑아 가운데 혈조를 파고 물에 담가 굳힌다. 홈이 무게를 덜면서도 '
       +'휨에는 오히려 강해진다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2},{id:'cord',n:2},{id:'hide',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'sword_ember', tier:'강철', n:'잿불 검', out:{id:'sword_ember',n:1},
   time:40, stam:24, station:'anvil',
   note:'강철 검을 달궈 날에만 잿불 비늘을 겹쳐 대고 두드려 물린다. 코등이와 손잡이는 맨쇠로 둔다.',
   in:[{id:'sword_steel',n:1},{id:'ember_scale',n:4},{id:'charcoal',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'spear_ember', tier:'강철', n:'잿불 창', out:{id:'spear_ember',n:1},
   time:40, stam:24, station:'anvil',
   note:'강철 창의 날과 투겁에 잿불 비늘을 겹쳐 물린다. 자루는 그대로 둔다.',
   in:[{id:'spear_steel',n:1},{id:'ember_scale',n:2},{id:'charcoal',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'axe_ember_war', tier:'강철', n:'잿불 전투도끼', out:{id:'axe_ember_war',n:1},
   time:40, stam:24, station:'anvil',
   note:'강철 전투도끼 머리 — 수염날·쐐기까지 — 를 잿불 비늘로 빈틈없이 덮어 물린다.',
   in:[{id:'axe_steel_war',n:1},{id:'ember_scale',n:4},{id:'charcoal',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'hammer_ember', tier:'강철', n:'잿불 해머', out:{id:'hammer_ember',n:1},
   time:40, stam:24, station:'anvil',
   note:'강철 해머 여덟모 머리와 때리는 면을 잿불 비늘로 감싸 물린다. 때리는 면도 비늘이 받는다.',
   in:[{id:'hammer_steel',n:1},{id:'ember_scale',n:5},{id:'charcoal',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'spear_steel', tier:'강철', n:'강철 창', out:{id:'spear_steel',n:1},
   time:54, stam:44, station:'anvil',
   note:'버들잎꼴로 날을 벼려 자루에 물린다. 어깨가 넓어 한 번 들어가면 깊다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2},{id:'log',n:1},{id:'cord',n:3}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'axe_steel_war', tier:'강철', n:'강철 전투도끼', out:{id:'axe_steel_war',n:1},
   time:70, stam:56, station:'anvil',
   note:'아래턱이 길게 내려온 수염날이다. 걸어 당길 수 있어 방패를 끌어낸다.',
   in:[{id:'ingot_steel',n:3},{id:'charcoal',n:3},{id:'log',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'hammer_steel', tier:'강철', n:'강철 해머', out:{id:'hammer_steel',n:1},
   time:74, stam:60, station:'anvil',
   note:'여덟 모로 깎은 머리를 자루에 쐐기로 박는다. 갑옷 위로도 속을 흔든다.',
   in:[{id:'ingot_steel',n:4},{id:'charcoal',n:3},{id:'log',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'axe_steel', tier:'강철', n:'강철 도끼', out:{id:'axe_steel',n:1},
   time:52, stam:42, station:'anvil',
   note:'강철을 벼려 날을 세우고 물에 담가 굳힌다. 철 도끼보다 오래 간다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2},{id:'log',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'pick_steel', tier:'강철', n:'강철 곡괭이', out:{id:'pick_steel',n:1},
   time:56, stam:46, station:'anvil',
   note:'부리를 길게 뽑아 담금질한다. 화강암을 철보다 빠르게 깬다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2},{id:'log',n:1},{id:'cord',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'plate_steel', tier:'강철', n:'강철 판금', out:{id:'plate_steel',n:1},
   time:96, stam:70, station:'anvil',
   note:'판을 몸에 맞춰 두들겨 곡면을 잡는다. 이음매가 없어 창끝이 미끄러진다.',
   in:[{id:'ingot_steel',n:5},{id:'charcoal',n:4},{id:'cord',n:6},{id:'hide',n:2}],
   need:[{id:'hammer_stone',n:1}]},

  {id:'helm_steel', tier:'강철', n:'강철 투구', out:{id:'helm_steel',n:1},
   time:46, stam:36, station:'anvil',
   note:'한 장으로 뽑아 챙과 목가리개를 붙인다.',
   in:[{id:'ingot_steel',n:2},{id:'charcoal',n:2},{id:'hide',n:1}],
   need:[{id:'hammer_stone',n:1}]},

  /* ── 바다 — 헤엄 장비와 작살 ─────────────────────────────────────────── */
  {id:'trashcan', tier:'바다와 살림', n:'쓰레기통 놓기', out:null, place:'trash', time:14, stam:10,
   note:'갈대를 성기게 떠서 통을 만든다. 넣은 것은 창을 닫는 순간 사라진다 — 쓸모없는 짐을 한꺼번에 치운다.',
   in:[{id:'reed_stalk',n:6},{id:'cord',n:2}]},
  {id:'rope', tier:'바다와 살림', n:'밧줄', out:{id:'rope',n:1}, time:6, stam:8,
   note:'노끈 세 가닥을 반대로 꼬아 한 줄로 합친다. 노끈보다 훨씬 질기다.',
   in:[{id:'cord',n:3}]},
  {id:'rope_vine', tier:'바다와 살림', n:'밧줄(덩굴)', out:{id:'rope',n:1}, time:5, stam:6,
   note:'밀림 나무에서 끊어 온 덩굴 두 가닥을 꼬면 그대로 밧줄이다. 노끈을 엮을 것 없이 숲에서 바로 얻는다.',
   in:[{id:'vine',n:2}]},
  {id:'harpoon_bamboo', tier:'바다와 살림', n:'나무 작살(대나무)', out:{id:'harpoon_wood',n:1}, time:8, stam:8,
   note:'곧고 가벼운 대나무 끝을 비스듬히 쳐서 날을 낸다. 나뭇가지로 깎은 작살과 같은 것이다.',
   in:[{id:'bamboo',n:1}], need:[{tag:'sharp',n:1}]},
  {id:'glue_resin', tier:'바다와 살림', n:'송진 풀', out:{id:'glue',n:2}, time:10, stam:3, station:'fire',
   note:'송진을 불 곁에서 녹여 숯가루를 조금 섞는다. 식으면 단단히 굳는 풀이다 — 풀죽보다 물에 강하다.',
   in:[{id:'resin',n:2},{id:'charcoal',n:1}]},
  {id:'glue', tier:'바다와 살림', n:'풀 쑤기(풀죽)', out:{id:'glue',n:3}, time:16, stam:4, station:'fire',
   note:'물 담은 토기에 풀잎을 넣고 걸쭉해질 때까지 고아 짠다. 식으면 끈끈한 풀이 된다. 토기는 돌려받는다.',
   in:[{id:'grass_blade',n:12},{id:'pot_water',n:1}], ret:[{id:'pot',n:1}]},
  {id:'snorkel', tier:'바다와 살림', n:'갈대 스노클', out:{id:'snorkel',n:1}, time:10, stam:6,
   note:'속 빈 갈대 두 대를 풀로 이어 붙이고 입에 무는 쪽을 노끈으로 감는다. 지니고만 있으면 듣는다.',
   in:[{id:'reed_stalk',n:2},{id:'glue',n:1},{id:'cord',n:1}]},
  {id:'fins', tier:'바다와 살림', n:'오리발', out:{id:'fins',n:1}, time:18, stam:12,
   note:'가지로 부챗살을 짜고 풀잎을 겹겹이 엮어 덮은 뒤 밧줄로 발에 맨다. 지니고만 있으면 듣는다.',
   in:[{id:'branch',n:4},{id:'grass_blade',n:14},{id:'rope',n:1}]},
  {id:'air_tube', tier:'바다와 살림', n:'대통 공기통', out:{id:'air_tube',n:1}, time:14, stam:8,
   note:'굵은 대나무를 두 마디째 잘라 한쪽 마디를 뚫고 송진으로 마개를 깎아 끼운다. 물속에서 숨이 모자라면 저절로 들이마신다 — 여럿 지니면 더 깊이 간다.',
   in:[{id:'bamboo',n:2},{id:'resin',n:2},{id:'cord',n:1}], need:[{tag:'sharp',n:1}]},
  {id:'dive_stone', tier:'바다와 살림', n:'잠수 돌', out:{id:'dive_stone',n:1}, time:8, stam:6,
   note:'떼어 낸 돌 덩이에 밧줄을 감아 허리에 맨다. 지니고 있으면 물속에서 가라앉는다 — 내려갈 때 빠르고 올라올 때 무겁다.',
   in:[{id:'stone_block',n:1},{id:'rope',n:1}]},
  {id:'goggles', tier:'바다와 살림', n:'물안경', out:{id:'goggles',n:1}, time:20, stam:10,
   note:'유리 조각을 나무 테에 풀로 메워 붙이고 노끈으로 머리에 맨다. 지니고만 있으면 듣는다.',
   in:[{id:'glass',n:1},{id:'branch',n:1},{id:'glue',n:2},{id:'cord',n:1}]},
  {id:'harpoon_wood', tier:'바다와 살림', n:'나무 작살', out:{id:'harpoon_wood',n:1}, time:7, stam:8,
   note:'곧은 가지 끝을 뾰족이 깎는다. 물속에서 좌클릭으로 찌른다 — 산호밭의 잔고기와 넙치가 잡힌다.',
   in:[{id:'branch',n:2}], need:[{tag:'sharp',n:1}]},
  {id:'harpoon_stone', tier:'바다와 살림', n:'돌 작살', out:{id:'harpoon_stone',n:1}, time:14, stam:14,
   note:'슴베찌르개를 자루에 풀로 붙이고 밧줄을 맨다. 맞은 물고기가 잠깐 멎는다 — 장어 · 조기 · 대구까지.',
   in:[{id:'point',n:1},{id:'branch',n:2},{id:'glue',n:1},{id:'rope',n:1}]},
  {id:'harpoon_iron', tier:'바다와 살림', n:'쇠 작살', out:{id:'harpoon_iron',n:1}, time:30, stam:26, station:'anvil',
   note:'연철을 두드려 미늘 둘 달린 촉을 뽑고 통나무 자루에 박는다. 참치 · 황새치를 꿴다.',
   in:[{id:'iron_wrought',n:1},{id:'log',n:1},{id:'rope',n:1}], need:[{id:'hammer_stone',n:1}]}
];
// 분류(tag) 조건은 그 분류에 속한 실제 아이템 이름으로 보여준다.
// "망치돌 필요"라고만 쓰면 인벤토리의 '돌멩이'와 같은 물건인 줄 알 수가 없다.
function tagItems(tag){
  return Object.keys(ITEMS).filter(k=>ITEMS[k].tags&&ITEMS[k].tags.indexOf(tag)>=0);
}
const TAG_N={fish:'물고기(아무 종류)'};      // 종류가 많은 분류는 이름을 다 늘어놓지 않는다
function matName(r){
  if(r.id) return ITEMS[r.id].n;
  if(TAG_N[r.tag]) return TAG_N[r.tag];
  const ks=tagItems(r.tag);
  return ks.length?ks.map(k=>ITEMS[k].n).join(' 또는 '):r.tag;
}
const haveId=id=>INV.slots.reduce((a,s)=>a+(s.id===id?s.n:0),0);
function countMat(r){
  let c=0;
  for(const sl of INV.slots){
    const it=ITEMS[sl.id];
    if(r.id ? sl.id===r.id : (it.tags&&it.tags.indexOf(r.tag)>=0)) c+=sl.n;
  }
  return c;
}
const nearLitFire=()=>FIRES.some(f=>f.lit&&Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z)<3.6);
/* 담수 — 하천과 분기공 온천만. 바닷물은 안 된다. */
function nearFreshWater(){
  const gx=clamp(Math.round(PL.pos.x/CELL+N/2),1,N-2),
        gz=clamp(Math.round(PL.pos.z/CELL+N/2),1,N-2);
  for(let dz=-2;dz<=2;dz++) for(let dx=-2;dx<=2;dx++){
    const i=IDX(gx+dx,gz+dz);
    if(F.elev[i]>0.2 && (F.river[i]||F.fuma[i]>0.5)) return true;
  }
  return false;
}
const STATION={grind  :{n:'숫돌',      ok:()=>nearGrind()},
               fire   :{n:'타는 모닥불', ok:()=>nearLitFire()},
               furnace:{n:'제련로',    ok:()=>nearFurnace()},
               anvil  :{n:'모루',      ok:()=>nearAnvil()},
               water  :{n:'담수',      ok:()=>nearFreshWater()},
               arc    :{n:'아크로',    ok:()=>nearArc()},
               lathe  :{n:'선반',      ok:()=>nearLathe()}};
const stationOK=R=>!R.station || STATION[R.station].ok();
const canCraft=R=>!R.proc&&R.in.every(r=>countMat(r)>=r.n)
                 && (!R.need || R.need.every(r=>countMat(r)>=r.n))
                 && stationOK(R);
function consumeMat(r){
  let need=r.n;
  for(let i=INV.slots.length-1;i>=0&&need>0;i--){
    const sl=INV.slots[i], it=ITEMS[sl.id];
    if(!(r.id ? sl.id===r.id : (it.tags&&it.tags.indexOf(r.tag)>=0))) continue;
    const take=Math.min(need,sl.n); need-=take; invRemove(i,take);
  }
}
/* 그 재료로 실제로 빠져나갈 무게 — consumeMat 과 같은 차례(뒤 칸부터)로 센다 */
function matWeight(r){
  let need=r.n, w=0;
  for(let i=INV.slots.length-1;i>=0&&need>0;i--){
    const sl=INV.slots[i], it=ITEMS[sl.id];
    if(!(r.id ? sl.id===r.id : (it.tags&&it.tags.indexOf(r.tag)>=0))) continue;
    const take=Math.min(need,sl.n); need-=take; w+=it.kg*take;
  }
  return w;
}
const CRAFT={recipe:null, t:0, sel:-1};          // sel — 기술 나무에서 고른 마디(RECIPES 의 번호)
/* 만든 뒤 곧바로 집어 들어 놓을 자리를 고르는 설비(옮기기 `pushKind` 와 같은 것들) — 처음 자리 둘레의 설비 거리로 막지 않는다(campfireSpot 의 free).
   겹침은 놓는 자리에서 moveCheck 가 본다. 물레방아·증기기관·발전기·선반·아크로는 놓은 자리가 끝이라 예전처럼 따진다 */
const PLACE_FREE=new Set(['campfire','furnace','anvil','grind','basket','chest','trash']);
function startCraft(R){
  if(R.proc){ procHow(R); return; }
  if(!canCraft(R)){ toast('재료가 모자란다'); return; }
  CRAFT.recipe=R; CRAFT.t=0; craftDirty=true;
  /* 만드는 동안은 두 손이 다 바쁘다(사용자 요청 — 들고 있던 것을 내려놓고, 끝나면 다시 든다) */
  if(EQUIP){ CRAFT.held=EQUIP; EQUIP=null; invDirty=true; }
}
/* 만드는 중이면 손에 들 수 없다 */
function craftBusy(){ if(!CRAFT.recipe) return false; toast('만드는 중에는 손에 들 수 없다'); return true; }
/* 다 만들었거나 그만두면 내려놓았던 것을 다시 든다(그새 버렸으면 빈손) */
function craftRestoreHeld(){ const h=CRAFT.held; CRAFT.held=null; if(h&&!EQUIP&&INV.slots.indexOf(h)>=0){ EQUIP=h; invDirty=true; } }
function updateCraft(dt){
  const R=CRAFT.recipe; if(!R) return;
  if(PL.stam<2){ CRAFT.recipe=null; craftDirty=true; craftRestoreHeld(); toast('기력이 없다'); return; }
  if(!stationOK(R)){ CRAFT.recipe=null; craftDirty=true; craftRestoreHeld(); toast(STATION[R.station].n+'에서 멀어졌다'); return; }
  /* **손을 다른 데 쓰면 만들던 것을 놓는다**(사용자 요청) — 캐기·베기·따기·휘두르기·작살질을 시작하면 그만둔다 */
  if(HARV.active||(typeof GATHER!=='undefined'&&GATHER.on)||ATK.swing>0){
    CRAFT.recipe=null; CRAFT.t=0; craftDirty=true; craftRestoreHeld(); toast(R.n+' — 손을 다른 데 써서 만들기를 멈췄다'); return; }
  /* **걸으면 더디다 · 빨리 갈수록 더 더디다** — 가만히 1배 · 걷기(4.3 m/s) 0.4배 · 달리기(7.4 m/s) 0.28배. 기력도 그만큼만 든다 */
  const hs=Math.hypot(PL.vel.x,PL.vel.z), mv=1/(1+0.35*hs), d2=dt*mv;
  const prev=CRAFT.t;
  CRAFT.t+=d2;
  PL.stam=clamp(PL.stam-R.stam/R.time*d2,0,100);
  // 작업 중 반복음 — 뗀석기는 망치질, 나머지는 손으로 엮는 소리
  const iv=R.need&&R.need.some(r=>r.tag==='hammer')?0.42:0.7;
  if(Math.floor(prev/iv)!==Math.floor(CRAFT.t/iv) && CRAFT.t<R.time-0.2)
    sfx(R.need&&R.need.some(r=>r.tag==='hammer')?'knap':'bind');
  if(CRAFT.t<R.time) return;
  CRAFT.recipe=null; CRAFT.t=0; craftDirty=true; invDirty=true; craftRestoreHeld();   // 어느 갈래로 끝나든 나무·고른 칸을 다시 그린다(예전엔 실패 갈래에서 '만드는 중' 이 남았다)
  if(!canCraft(R)){ toast('재료가 모자란다'); return; }
  // 설치형은 자리부터 확인 — 실패하면 재료를 쓰지 않는다
  if(R.place==='build'){                       // 집 조각은 짓기 모드에서 놓는다
    closeBag();                                 // 가방 화면을 통째로 닫고 짓기로 넘어간다
    enterBuild(R.build,R.btier); syncLock();
    return;
  }
  if(R.place){
    const spot=(R.place==='wheel')?wheelSpot():(R.place==='kiln')?kilnSpot():(R.place==='hearth')?hearthSpot():campfireSpot(PLACE_FREE.has(R.place));
    if(!spot.ok){ toast(spot.why); return; }
  }
  if(!stationOK(R)){ toast(STATION[R.station].n+' 곁에서만 할 수 있다'); return; }
  /* 설치형 — **놓는 데 성공한 뒤에** 재료를 쓴다. 예전엔 재료부터 쓰고 놓았는데, 놓는 쪽이 한 번 더 따져서
     퇴짜를 놓으면(바구니가 '너무 가깝다' · 발전기가 '물레방아 곁이 아니다' …) 재료만 사라지고 아무것도 안 생겼다. */
  if(R.place){
    const PLACE={campfire:placeCampfire, kiln:placeKiln, hearth:placeHearth, grind:placeGrindstone, furnace:placeFurnace, anvil:placeAnvil,
                 wheel:placeWheel, steam:placeSteam, dynamo:placeDynamo, lathe:placeLathe, arc:placeArc,
                 basket:f=>placeStore('basket',f), chest:f=>placeStore('chest',f), trash:f=>placeStore('trash',f)};
    const fn=PLACE[R.place], free=PLACE_FREE.has(R.place);
    const arrs=[FIRES,FURNACES,ANVILS,GRINDS,STORES,DYNAMOS,LATHES,ARCS], n0=arrs.map(a=>a.length);
    if(!fn||!fn(free)){ craftDirty=true; return; }       // 못 놓았다 — 까닭은 놓는 쪽이 알렸고, 재료는 그대로 남는다
    R.in.forEach(consumeMat);
    craftDirty=true; invDirty=true;
    /* **놓을 자리를 보여 주고 고르게 한다**(사용자 요청) — 방금 지은 것을 곧바로 집어 든 꼴로 넘긴다(옮기기와 같은 틀 · 60-stations.js):
       시선을 따라 자리가 보이고(발밑 고리가 초록이면 놓인다), 휠·R 로 돌리고, 좌클릭으로 놓는다. 그만두면 처음 선 자리에 남는다 */
    { const k=arrs.findIndex((a,i)=>a.length>n0[i]), c=k>=0?arrs[k][arrs[k].length-1]:null;
      if(c&&pushKind(c)){
        /* 방금 세운 충돌 원을 바로 쥐여 준다 — pushCollider 는 자리로 짝을 찾아서, 처음 자리가 다른 설비와 꼭 같으면(거리를 안 따지므로 · free) 그것을 잡았다 */
        const l=COLLIDERS[COLLIDERS.length-1]; if(l&&l.x===c.x&&l.z===c.z) c._col=l;
        closeBag(); syncLock(); if(moveBegin(c,free)) toast(c.cname+' — 놓을 자리를 보고 [좌클릭] · [휠·R] 돌리기 · [우클릭] 지금 자리에 둔다'); } }
    return;
  }
  /* 만들어도 들 수 없으면 **시작하지 않는다** — 예전엔 재료를 다 쓴 뒤에야 '완성했지만 들 수 없다'며 결과물을 버렸다.
     쓸 재료의 무게를 빼고 결과물(과 돌려받는 그릇)의 무게를 더해 미리 따진다 */
  { const wOut=ITEMS[R.out.id].kg*R.out.n+(R.ret?R.ret.reduce((a,r)=>a+ITEMS[r.id].kg*r.n,0):0);
    const wIn=R.in.reduce((a,r)=>a+matWeight(r),0), over=invWeight()-wIn+wOut-INV.max;
    if(over>1e-6){ toast('만들어도 들 수 없다 — '+(Math.ceil(over*10)/10).toFixed(1)+' kg 넘친다. 짐을 덜고 다시 하라(재료는 그대로다)'); return; } }
  // 재료를 먼저 소모하면 무게가 줄어 결과물이 확실히 들어간다
  R.in.forEach(consumeMat);
  if(R.ret) for(const r of R.ret) if(!invAdd(r.id,r.n)) toast(ITEMS[r.id].n+'을 들 자리가 없어 두고 왔다');   // 돌려받는 그릇 따위
  const made=invAdd(R.out.id,R.out.n);
  if(!made){ toast('완성했지만 들 수 없다'); return; }
  const sl=INV.slots[INV.slots.length-1];
  if(ITEMS[R.out.id].tool && sl && sl.id===R.out.id){ EQUIP=sl; }   // 만들면 바로 장착
  toast(ITEMS[R.out.id].n+' 완성');
  sfx(R.need&&R.need.some(r=>r.tag==='hammer')?'knap':'bind');
  craftDirty=true; invDirty=true;
}
let craftOpen=false, craftDirty=true;
/* 이름 · 단계 · 산출물 · 재료 어디에든 걸리면 남긴다 */
let craftQuery='';
function craftMatch(R){
  const q=craftQuery.trim();
  if(!q) return true;
  const hay=[R.n, R.tier, R.out?ITEMS[R.out.id].n:'',
             ...R.in.map(r=>matName(r)),
             ...(R.need||[]).map(r=>matName(r))].join(' ');
  return hay.indexOf(q)>=0;
}
/* ── 제작 화면 — 기술 나무 ─────────────────────────────────────────────────────
   예전엔 제작법 180개를 한 줄로 늘어놓은 긴 목록이었다(사용자 요청: 기술 나무처럼, 탭으로 나눠서, 가리키면 쓰임이 뜨게).
   ① **탭** — 만드는 것의 갈래(`craftCat`): 도구 · 무기 · 옷·갑옷 · 설비·건축 · 먹을 것·약 · 재료 · 화학·전기.
   ② **나무** — 탭 안에서 단(`TIER_ORDER` — 간이 → 돌 → 청동 → 철 → 강철 …)이 왼쪽에서 오른쪽으로 서고, 단마다 마디(제작법)가
      세로로 선다. 한 마디의 결과물이 다른 마디의 재료·도구면 둘을 **줄로 잇는다**(같은 탭 안에서만 — 탭을 건너는 것은
      오른쪽 '고른 제작법' 칸의 '먼저 만들 것' 에 적힌다).
   ③ 마디를 누르면 오른쪽 칸에 재료(가진 수/드는 수) · 도구 · 작업 자리 · '만들기' 단추가 뜬다. 고른 마디를 한 번 더 누르면 만든다.
   ④ 마디에 마우스를 올리면 드는 것과 **이것으로 만드는 것**이 말풍선으로 뜬다(98-bag.js `bagTip`).
   ⑤ 검색칸에 글자를 치면 탭과 상관없이 걸리는 것만 목록으로 보인다. */
const CRAFT_TABS=[['tool','도구'],['weapon','무기'],['wear','옷·갑옷'],['build','설비·건축'],['food','먹을 것·약'],['mat','재료'],['chem','화학·전기']];
const TIER_ORDER=['맨손','풀과 돌','불','옷','나무와 점토','간석기','바다와 살림','뼈와 키틴','금속','철기','강철','화학'];
const TIER_LABEL={'맨손':'맨손','풀과 돌':'간이 · 풀과 돌','불':'불','옷':'옷','나무와 점토':'나무 · 점토','간석기':'돌 · 간석기',
                  '바다와 살림':'바다 · 살림','뼈와 키틴':'뼈 · 키틴','금속':'청동 · 금속','철기':'철','강철':'강철','화학':'화학 · 전기'};
/* 화학 탭 — 예전엔 '화학 · 전기' 단 하나에 스물넷이 한 줄로 서 있어 무엇이 무엇에서 나오는지 읽을 수 없었다(사용자 지적: 화학 제작 나무가 어지럽다).
   쓰임으로 갈래를 나눠 밑감(왼쪽)에서 완성품(오른쪽)으로 세운다. 갈래 안은 앞의 것을 드는 차례다.
   재 · 잿물 · 술 → 탄소 전극(아크로의 심) → 산 · 염(질산은 아크로에서) → 화약 · 뇌관 / 모루에서 뽑는 선 · 관 · 자석 → 전지 · 전등.
   표에 없는 화학 제작법은 맨 끝 '그 밖' 단에 선다 */
const CHEM_GROUPS=[
  ['재 · 잿물 · 술',['ash','lye','alcohol']],
  ['탄소 · 전극',['electrode','graphite']],
  ['산 · 염',['acid_sulfuric','nitric','saltpeter','li_carbonate']],
  ['화약 · 뇌관',['gunpowder','guncotton','powder_smokeless','fulminate','primer']],
  ['선 · 관 · 자석',['drawplate','wire_copper','pipe_copper','gauze_platinum','magnet']],
  ['전지 · 전등',['bulb','battery','cathode_lfp','battery_li','camc_pack']]
];
function chemCols(list){
  const seen=new Set();
  const cols=CHEM_GROUPS.map(([n,ids])=>[n,ids.map(id=>list.find(o=>o.R.id===id)).filter(o=>o&&!seen.has(o)&&seen.add(o))]);
  const rest=list.filter(o=>!seen.has(o)); if(rest.length) cols.push(['그 밖',rest]);
  return cols;
}
let craftTab='tool';
function craftCat(R){
  if(R.place) return 'build';
  const T=R.out&&ITEMS[R.out.id]; if(!T) return 'mat';
  const W=T.tool;
  if((W&&(W.weapon||W.gun||W.throw||W.harpoon))||T.ammo) return 'weapon';
  if(W) return 'tool';
  if(T.wear) return 'wear';
  if(T.food||T.drink||T.heal) return 'food';
  return R.tier==='화학'?'chem':'mat';
}
/* 그 물건을 만드는 제작법들 · 그 물건이 드는 제작법들(재료든 도구든) */
const craftMakers=id=>RECIPES.filter(R=>R.out&&R.out.id===id);
const craftUsers=id=>RECIPES.filter(R=>R.in.some(r=>r.id===id)||(R.need||[]).some(r=>r.id===id));
/* '가능만' — 지금 만들 수 있는 마디만 남긴다(main 의 단계별 목록에서 온 단추 — 나무에서도 같은 일을 한다) */
let craftOnly=false;
const _cEsc=t=>String(t).replace(/[<>&"]/g,'');
/* 아이콘은 이미 찍어 둔 것만 바로 — 나머지는 프레임마다 몇 개씩 찍는다(처음 열 때 수백 개를 한꺼번에 찍으면 멈춘다).
   입는 것(갑옷 — 수십만 삼각형)은 가진 뒤 소지품에서 찍힌 것만 쓴다 */
const _icoQ=[];
function iconSoon(id){
  if(ITEM_ICON[id]) return ITEM_ICON[id];
  const T=ITEMS[id]; if(!T||T.wear) return '';
  if(_icoQ.indexOf(id)<0) _icoQ.push(id);
  return '';
}
function iconPump(){
  if(!_icoQ.length) return false;
  const t0=performance.now(); let made=false;
  while(_icoQ.length&&performance.now()-t0<6){ itemIcon(_icoQ.shift()); made=true; }
  return made;
}
const iconTagSoon=(id,t)=>{ const u=iconSoon(id);
  return u?'<img class="sw ico" decoding="sync" src="'+u+'" alt="">':'<i class="sw" style="background:#'+t.c.toString(16).padStart(6,'0')+'"></i>'; };
function drawCraft(){
  if(!craftOpen){ if(CTREE.i>=0) ctreeHide(true); return; }
  if(iconPump()) craftDirty=true;                  // 아이콘이 새로 찍혔으면 한 번 더 그린다
  const crfL=document.getElementById('crfL'), nEl=document.getElementById('crfN'), q=craftQuery.trim();
  const tabs=document.getElementById('crfT');
  /* 탭 줄 — 갈래마다 지금 만들 수 있는 수 / 전체 */
  if(tabs){
    const th=CRAFT_TABS.map(([k,n])=>{ const g=RECIPES.filter(R=>craftCat(R)===k), ok=g.filter(canCraft).length;
      return '<button data-tab="'+k+'" class="'+(k===craftTab&&!q?'on':'')+'">'+n+'<span>'+ok+'/'+g.length+'</span></button>'; }).join('');
    if(tabs._html!==th){ tabs.innerHTML=th; tabs._html=th; }
  }
  let html='';
  if(q){                                            // ── 검색: 걸리는 것만 목록으로
    const hit=RECIPES.filter(craftMatch).filter(R=>!craftOnly||canCraft(R));
    if(nEl) nEl.textContent=hit.length+' / '+RECIPES.length;
    html=hit.length?'<div class="tl">'+hit.map(R=>{ const i=RECIPES.indexOf(R);
        return '<div class="nd row '+(canCraft(R)?'ok':'no')+(i===CRAFT.sel?' sel':'')+'" data-i="'+i+'">'
          +(R.out?iconTagSoon(R.out.id,ITEMS[R.out.id]):'<i class="sw pl"></i>')+'<span>'+R.n+'</span><em>'+TIER_LABEL[R.tier]+'</em></div>'; }).join('')+'</div>'
      :'<div style="color:var(--dim);font-size:12px;padding:10px 2px">\''+_cEsc(q)+'\' 에 걸리는 제작법이 없다</div>';
  }else{                                            // ── 나무: 단이 왼쪽에서 오른쪽으로
    const list=RECIPES.map((R,i)=>({R,i})).filter(o=>craftCat(o.R)===craftTab);
    if(nEl) nEl.textContent=list.filter(o=>canCraft(o.R)).length+' / '+list.length+' 가능';
    html='<div class="tw">';
    const cols=craftTab==='chem'?chemCols(list):TIER_ORDER.map(t=>[TIER_LABEL[t],list.filter(o=>o.R.tier===t)]);
    for(const [label,all] of cols){
      const col=all.filter(o=>!craftOnly||canCraft(o.R)); if(!col.length) continue;
      html+='<div class="tc"><div class="th">'+label+'<span>'+col.filter(o=>canCraft(o.R)).length+'/'+col.length+'</span></div>'
        +col.map(o=>{ const R=o.R, ok=canCraft(R), busy=CRAFT.recipe===R;
          return '<div class="nd '+(ok?'ok':'no')+(R.proc?' pr':'')+(o.i===CRAFT.sel?' sel':'')+(busy?' busy':'')+'" data-i="'+o.i+'"'+(R.proc?' title="'+(R.proc==='furnace'?'제련로':'모닥불·가마')+'에 넣어 두는 일"':'')+'>'
            +(R.out?iconTagSoon(R.out.id,ITEMS[R.out.id]):'<i class="sw pl"></i>')
            +'<span>'+R.n+'</span>'+(R.out&&R.out.n>1?'<em>×'+R.out.n+'</em>':'')+'</div>'; }).join('')+'</div>';
    }
    html+='</div>';
  }
  if(crfL._html!==html){
    const sx=crfL.scrollLeft, sy=crfL.scrollTop; crfL.innerHTML=html; crfL._html=html; crfL.scrollLeft=sx; crfL.scrollTop=sy;
  }
  if(typeof drawSel==='function') drawSel();
  ctreeRefresh();
}
/* ── 조합 나무 — 마디에 마우스를 올렸을 때만 뜬다 ───────────────────────────────
   예전엔 탭 안의 마디를 전부 줄로 이어 늘 그려 두었다 — 줄이 수십 가닥 겹쳐 무엇이 무엇에 이어지는지 읽을 수 없었다(사용자 지적).
   이제 줄은 없고, **마디에 마우스를 올리면** 그 마디의 조합 나무가 곁에 뜬다:
       드는 것(재료 · 도구 · 작업 자리)  ──▶  이 물건  ──▶  이것으로 만드는 것
   · 가지는 한쪽에 **다섯까지** — 더 있으면 '… +N' 이 붙고, 그 위에 마우스를 올리면 나머지가 글 상자로 뜬다.
   · 가지를 누르면 그 제작법으로 건너간다(재료를 만드는 법 · 이것이 드는 다음 물건).
   · **상자가 사라지지 않게** — 나무는 마디에 2 px 겹쳐 붙이고(틈이 없다), 마우스가 마디나 나무를 벗어나도 0.28초는 남아 있다
     (그 사이에 나무 위로 들어오면 그대로). '… +N' 의 글 상자는 그 칸의 자식이라 칸에서 상자로 옮겨 가도 안 닫힌다. */
const CTREE={el:null, i:-1, hideT:0, showT:0, MAXB:5};
function ctreeEl(){
  if(CTREE.el) return CTREE.el;
  const el=document.createElement('div'); el.id='ctree'; el.style.display='none'; document.body.appendChild(el);
  el.addEventListener('mouseenter',()=>clearTimeout(CTREE.hideT));
  el.addEventListener('mouseleave',()=>ctreeHide());
  el.addEventListener('click',ev=>{ const t=ev.target.closest&&ev.target.closest('[data-go]'); if(!t) return;
    const i=+t.dataset.go; if(!RECIPES[i]) return;
    /* 나무 안의 물건을 누르면 **만들 수 있으면 바로 만든다**(사용자 요청) — 못 만들면 예전처럼 그 제작법으로 건너간다 */
    if(canCraft(RECIPES[i])&&CRAFT.recipe!==RECIPES[i]){ CRAFT.sel=i; startCraft(RECIPES[i]); craftDirty=true; ctreeRefresh(); return; }
    if(RECIPES[i].proc&&i===CTREE.i){ procHow(RECIPES[i]); return; }
    if(i===CTREE.i){ toast('아직 못 만든다 — '+(typeof bagMissing==='function'?bagMissing(RECIPES[i]):'모자란 것이 있다')); return; }
    CRAFT.sel=i; craftTab=craftCat(RECIPES[i]); const q=document.getElementById('crfS'); q.value=''; craftQuery='';
    document.getElementById('crfL')._html=null; craftDirty=true; drawCraft(); ctreeHide(true); });
  return CTREE.el=el;
}
function ctreeHide(now){
  clearTimeout(CTREE.hideT); clearTimeout(CTREE.showT);
  const go=()=>{ if(CTREE.el) CTREE.el.style.display='none'; CTREE.i=-1; };
  if(now) go(); else CTREE.hideT=setTimeout(go,90);   // 커서가 떠나면 빨리 닫는다(사용자 요청 — 예전 0.28초)
}
/* 떠 있는 나무를 다시 그린다 — 만들거나 재료가 바뀐 뒤(예전엔 만들어도 나무의 가진 수·색이 그대로였다) */
function ctreeRefresh(){
  if(CTREE.i<0||!CTREE.el||CTREE.el.style.display==='none') return;
  const nd=document.querySelector('#crfL .nd[data-i="'+CTREE.i+'"]'); if(nd) ctreeShow(CTREE.i,nd);
}
/* 가지들 — 다섯까지 보이고 나머지는 '… +N'(글 상자) */
function ctreeBranches(items,side){
  const N=CTREE.MAXB, head=items.slice(0,N), rest=items.slice(N);
  let h=head.map(x=>'<div class="cb '+(x.cls||'')+'"'+(x.go>=0?' data-go="'+x.go+'"':'')+'>'+x.html+'</div>').join('');
  if(rest.length) h+='<div class="cb more">… +'+rest.length+'<div class="mbox '+side+'">'
    +rest.map(x=>'<div class="'+(x.cls||'')+'"'+(x.go>=0?' data-go="'+x.go+'"':'')+'>'+x.html+'</div>').join('')+'</div></div>';
  return h||'<div class="cb none">없다</div>';
}
function ctreeShow(i,anchor){
  const R=RECIPES[i]; if(!R||!anchor||!anchor.isConnected) return;
  const el=ctreeEl(), needs=[], uses=[];
  for(const r of R.in){ const hv=countMat(r), mk=r.id?craftMakers(r.id):[];
    needs.push({cls:hv>=r.n?'g':'b', go:mk.length?RECIPES.indexOf(mk[0]):-1, html:_cEsc(matName(r))+' <small class="n">'+Math.min(hv,99)+'/'+r.n+'</small>'}); }
  for(const r of (R.need||[])){ const hv=countMat(r), mk=r.id?craftMakers(r.id):[];
    needs.push({cls:(hv>=r.n?'g':'b')+' t', go:mk.length?RECIPES.indexOf(mk[0]):-1, html:_cEsc(matName(r))+' <small>도구</small>'}); }
  if(R.station) needs.push({cls:(stationOK(R)?'g':'b')+' t', go:-1, html:_cEsc(STATION[R.station].n)+' <small>곁에서</small>'});
  if(R.out) for(const U of craftUsers(R.out.id)) uses.push({cls:canCraft(U)?'g':'', go:RECIPES.indexOf(U), html:_cEsc(U.n)});
  const ico=R.out?iconSoon(R.out.id):'';
  el.innerHTML='<div class="ctT">조합 나무</div><div class="ctR">'
    +'<div class="ctC l">'+ctreeBranches(needs,'l')+'</div>'
    +'<div class="ctM '+(canCraft(R)?'ok':'')+'" data-go="'+i+'">'+(ico?'<img decoding="sync" src="'+ico+'" alt="">':'')+'<b>'+_cEsc(R.n)+'</b>'+(R.out?'<small>×'+R.out.n+'</small>':'')+'</div>'
    +'<div class="ctC r">'+(R.out?ctreeBranches(uses,'r'):'<div class="cb none">설치하는 것이다</div>')+'</div></div>'
    +'<div class="ctF">누르면 만든다 · 못 만드는 것은 그 제작법으로 간다</div>';
  el.style.display='block'; CTREE.i=i;
  /* 자리 — 마디 바로 아래에 2 px 겹쳐 붙인다(틈이 없어야 마우스가 건너가는 동안 안 닫힌다). 아래가 모자라면 위로 */
  const a=anchor.getBoundingClientRect(), w=el.offsetWidth, h=el.offsetHeight;
  const below=a.bottom+h-2<innerHeight-6;
  el.style.left=Math.max(6,Math.min(innerWidth-w-6,a.left+a.width/2-w/2))+'px';
  el.style.top=(below?a.bottom-2:Math.max(6,a.top-h+2))+'px';
  /* '… +N' 의 글 상자 — 아래로 펼 자리가 없으면 위로 편다 · 옆으로 펼 자리가 없으면 반대쪽으로(화면 밖으로 잘리지 않게) */
  for(const m of el.querySelectorAll('.cb.more')){ const r=m.getBoundingClientRect(), b=m.querySelector('.mbox'), bh=Math.min(innerHeight*0.46,b.children.length*22+14);
    b.classList.toggle('up',r.top+bh>innerHeight-8);
    if(b.classList.contains('r')&&r.right+200>innerWidth){ b.classList.remove('r'); b.classList.add('l'); }
    else if(b.classList.contains('l')&&r.left-200<0){ b.classList.remove('l'); b.classList.add('r'); } }
}
/* 마디에 마우스가 오가는 것 — 목록 바탕에서 한 번에 받는다(목록을 다시 그려도 그대로 듣는다) */
{ const L=document.getElementById('crfL');
  L.addEventListener('mouseover',ev=>{ const nd=ev.target.closest&&ev.target.closest('.nd'); if(!nd) return;
    clearTimeout(CTREE.hideT); const i=+nd.dataset.i; if(i===CTREE.i) return;
    clearTimeout(CTREE.showT); CTREE.showT=setTimeout(()=>{ const cur=L.querySelector('.nd[data-i="'+i+'"]'); if(cur&&cur.matches(':hover')) ctreeShow(i,cur); },150); });
  L.addEventListener('mouseout',ev=>{ const nd=ev.target.closest&&ev.target.closest('.nd'); if(!nd) return;
    const to=ev.relatedTarget; if(to&&(nd.contains(to)||(CTREE.el&&CTREE.el.contains(to)))) return;
    clearTimeout(CTREE.showT); ctreeHide(); });
  /* 목록을 굴리면 닫는다 — 다만 목록을 다시 그릴 때(아이콘이 찍힐 때마다) 굴린 자리를 되돌리며 나는 scroll 은 빼야 한다
     (그걸로 닫으면 나무가 뜨자마자 사라진다). 자리가 정말 4 px 넘게 바뀌었을 때만 닫는다 */
  let sx=0, sy=0;
  L.addEventListener('scroll',()=>{ if(Math.abs(L.scrollLeft-sx)>4||Math.abs(L.scrollTop-sy)>4) ctreeHide(true); sx=L.scrollLeft; sy=L.scrollTop; },{passive:true});
}
/* 마디·탭 누르기 — 목록 바탕에서 한 번에 받는다. 마디는 한 번 누르면 고르고, 고른 것을 다시 누르면 만든다 */
document.getElementById('crf').addEventListener('click',ev=>{
  const t=ev.target&&ev.target.closest?ev.target.closest('#crfT button'):null;
  if(t){ craftTab=t.dataset.tab;
    /* 고른 마디가 새 탭에 없으면 고른 것을 푼다 — 예전엔 오른쪽 칸에 앞 탭의 제작법이 그대로 남아, 이 탭에서 밝게 보이는
       마디(만들 수 있는 것)를 고른 것으로 잘못 읽게 했다(사용자 지적) */
    if(RECIPES[CRAFT.sel]&&craftCat(RECIPES[CRAFT.sel])!==craftTab) CRAFT.sel=-1;
    const q=document.getElementById('crfS'); q.value=''; craftQuery=''; document.getElementById('crfL')._html=null; craftDirty=true; drawCraft(); return; }
  const el=ev.target&&ev.target.closest?ev.target.closest('.nd'):null;
  if(!el) return;
  const i=+el.dataset.i;
  if(CRAFT.sel===i){ if(RECIPES[i].proc) procHow(RECIPES[i]); else if(canCraft(RECIPES[i])) startCraft(RECIPES[i]); else toast('아직 못 만든다 — 오른쪽 칸에 모자란 것이 적혀 있다'); }
  else CRAFT.sel=i;
  document.getElementById('crfL')._html=null; craftDirty=true; drawCraft();
});
document.getElementById('crfOnly').addEventListener('click',ev=>{
  ev.stopPropagation();
  craftOnly=!craftOnly; ev.currentTarget.classList.toggle('on',craftOnly); document.getElementById('crfL')._html=null; craftDirty=true;
});
