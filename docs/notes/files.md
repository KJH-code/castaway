# 파일 표 · 파일 지도(원문)

2026-10-29 에 CLAUDE.md 에서 **글자 그대로 옮겨 왔다**(사용자 요청 — CLAUDE.md 가 요청마다 통째로 읽혀 265 KB 였다). 다루는 것: 파일마다 무엇이 있나 · 함수 줄 번호 · 고칠 때 지킬 것(줄 번호는 커밋 때 다시 잴 것).
이 계통을 고치기 전에 고칠 이름을 이 파일에서 `grep` 해 그 대목을 읽고, 고친 것(무엇을 왜 · 잰 값 · 같이 고칠 짝 · 사용자 요청이면 그렇다고)은 **여기에** 적는다.
CLAUDE.md 에는 새로 생긴 '깨뜨리면 안 되는 것' · '같이 고칠 짝'만 한 줄로 더한다. 글 속 '아래 …' · '위 …' 는 옛 CLAUDE.md 의 자리를 가리킨다 — 이 파일이나 다른 노트에서 찾을 것.

## 파일 표(원문 · 시험장 줄은 arenas.md)

| 파일 | 내용 |
|---|---|
| `island_world.html` · `engine/css/` · `engine/js/` | 메인 게임(나뉜 판 — 아래 '파일 지도' · `CODEMAP.md`) |
| `CODEMAP.md` | 나뉜 본편의 파일별 설명(영어) · 고칠 때 지킬 것 |
| `tools/build_single.py` · `tools/serve.py` | 한 파일로 묶기 · 캐시 끈 로컬 서버 |
| `engine/three.min.js` | Three.js r128 (npm three@0.128.0 의 build). **cdnjs 대신 이걸 쓴다** |
| `docs/CASTAWAY_개발요약.md` | **설계 문서. 작업 전에 먼저 읽을 것** — 지형·제작 트리·설비·몹·저장 |
| `docs/CASTAWAY_전사_초반부.md`, `docs/CASTAWAY_전사_2차.md` | 개발 대화 원문 |
| `presets/models/bear_high.glb`, `presets/models/stormscale_wyrm.glb` | 몹 모델. **아직 어느 코드에서도 로드하지 않는다** |

### 파일 지도 — `engine/js/`

| 파일 | 무엇이 있나 (줄) |
|---|---|
| `00-core.js` | 오류 띠 · 시드 난수·잡음 · 격자 크기 · 지형 필드 `F` · 바이옴 표 · **`RESOURCES`** · 섬 인자 `P` |
| `10-worldgen.js` | 1)~8) 섬 만들기(융기 → 열적·수적 침식 → 하천 → 경사·거리장 → 기후 → 바이옴 → 자원 배치) · 해저 굴곡 `shapeSeabed`(맨 끝 — 땅·저장에 안 닿는다) · `heightAt` 등 조회 창구 |
| `12-native.js` · `data-native-wasm.js` | **C 로 짠 침식 토막**(열적·물방울 침식·다듬기)을 WebAssembly 로 잇는다 — 원본 `engine/native/erosion.c` · 짓기 `sh engine/native/build.sh`(컴파일러는 `sh env/setup-zig.sh`) · **JS 판과 한 비트도 달라선 안 된다**: 한쪽을 고치면 `node tools/probe.mjs island_world.html "nativeVerify()"` 로 견줄 것(전부 same 이어야 한다). `data-native-wasm.js` 는 base64 — 읽지 말 것  · `engine/native/light.c` — 하늘 트임(`cw_tlit_open` → tlitBuild) · 땅속 기준 높이(`cw_under_base` → underSites) — JS 판과 같은 값 |
| `20-terrain.js` | 가지·잎 인스턴스 · 압축 `instCompact` 87 · 나무껍질 · 땅 셰이더 · 암석 재질 · 지형 `buildChunks` 866(4×4 청크 묶음 `TERR_BLK`) / LOD `updateTerrainLOD` 945 · 바다·하천 물 |
| `22-ground-textures.js` | 땅 사진을 배열 텍스처로 · 사진 결 땅 셰이더(물가 젖은 띠·거품 · 마른 모래의 바람 물결·알갱이·반짝임) · **둔덕 재질 `moundMat`**(모래 둔덕·점토 노출지가 땅 셰이더를 그대로 쓴다 — 아래 '모래·점토') |
| `24-shapes.js` | 땅 식물·바다 생물이 같이 쓰는 매끈한 모양 도구(관·혹·휘는 잎·돌림체·잎 판·합치기) |
| `30-props.js` | 칸 보이기 `updateTileVis` · 참나무·전나무 단계 `TL`(그루마다 · `tlEval`/`tlRepack`/`tlThin`) · 먼 나무 그림 `buildFarTrees` · **`buildProps` 360**(풀·나무·바위·`HABIT`) · 자갈 `RUBBLE` · 베리 · 보급선 |
| `31-cave10.js` | 동굴 지형 판 10 자료 — `CV10`(종류별 값 표) · `cv10Kind`(그 자리 바위) · `cv10Layout(c)`(입구·굴길·방 짜기 — `cv10Tunnel` 석회암·바위틈 / `cv10Lava` / `cv10Shelter`) · `cv10Field(c,x,z)`(굴 부피 {f,c,g,s,open,u}) · `cv10Zones`(겉을 비울 원) · `cv10Stats` · `cv10OreFix`/`cv10OreCheck`. 설계는 `docs/notes/caves.md` |
| `32-caves.js` | 동굴 — 바위 굴집 `buildCaves`(방 1~3 개) · 반딧불이 유충(빛나는 점)·빛나는 버섯·방마다 약한 불빛(2026-10-29 부터 불빛 풀이 아니라 셰이더 — `CAVE_GLSL`: 굴 속 몫 `cvK` · 바닥 몫 `cvF` · 불빛 `cvL`, 유니폼 `TERR_U.uCvN/uCvA/uCvB`) · `updateCaves`(가까운 방 여섯을 유니폼에) · 굴 바위의 참 꼴(`caveSolid` — 눈의 경계 · `caveIn` — 부풀리지 않은 속) · 벽 바위는 실제 테두리로 몸을 막는다 · 지형 판 9 의 꼴(벽 높이 · 고드름 꼴 `spike`) |
| `33-crags.js` | 암벽 — 가파른 칸의 큰 바위 무리 `cragSites`/`cragGrow`(프랙털 세 단계 · 덩이마다 다른 빛깔) · 320 m 칸 메시 `cragMesh` · `updateCrags` |
| `34-coast.js` | 바닷가 지형(지형 판 5) — 시스택·해식 아치(벼랑 바위 덩이로 짓는다 → 같은 사진 재질·단계·몸의 막힘) · 주상절리 육각 기둥(`coastFloor`·`coastSolid` — floorAt · 눈의 경계 · 매달리기가 본다) |
| `35-geo.js` | 지열 지대(지형 판 5 · 분기공 지대) — 온천 · 진흙 웅덩이 · 간헐천 · 석회화 단구 · 데임. 전역 이름은 `GEOT`(`GEO` 는 64-dex.js 가 쓴다 — **겹치면 그 파일이 통째로 안 읽힌다** · check-syntax 는 못 잡는다) |
| `36-falls.js` | 폭포와 연어(지형 판 5) — 하천 수면이 4 m 넘게 떨어지는 데 · 물살 판 · 소 · 물보라 · 뛰어오르는 연어  · **지형 판 7: 저수지 폭포**(`fallsCarve` — 물머리에 소 · 턱 · 위 저수지 / `fallsCrags` 바위벽 · `fallsBuildRes` 곧게 떨어지는 물) |
| `40-light.js` | **`LIGHT` 46**(배역 · 해 그림자 상자 · 점·집중광 예산) · `renderFrame` |
| `66-decay.js` | 상하는 먹을 것(칸의 `t` · `ITEMS[].rot` · `freshMerge` · `updateDecay` · 파리) · 비에 꺼지는 불(`fireShelter` · `fireRain`) |
| `98-dew.js` | 이슬 — 가까운 잎 위의 물방울 메시 `updateDew`(양은 `TERR_U.uDew` — 41-terrain-light.js 가 정하고, 잎·풀밭의 반짝임은 envPatch·땅 셰이더가 그린다) |
| `41-terrain-light.js` | 섬 크기의 빛 텍스처 `TLIT` — R 산 그림자(`tlitSweepStep`) · G 하늘 트임 · B 숲 덮임 · A 잔 기복 가림막 · `tlitBuild` · `updateTlit` |
| `45-sky.js` | `SKY` 8 · `updateWeather` 357 · 구름 명암 `litQueue` 905 · `updateClouds` 1476 · `SKY_LUT` 1967 · **`updateSky` 2107**(노을·달밤 색조 `SKYL.grade` 포함) — **`beta/cloud_arena.html` 의 원본** |
| `46-camcorder.js` | 캠코더 화면(480줄 그림판 → 테이프 셰이더) · 배터리 · 손 발전기 · 다치면 여는 화면처럼 치지직 · 깨진 금(`CAMC.hurt` — 지금 체력 · `camcCrackTex`) |
| `50-items.js` | **`ITEMS` 13** · `INV` 624 · `dragPut` 748 · `HARVEST` 829 · `MINE` 851 · 먹기·마시기(물을 봐야) · 빠른 칸 |
| `55-craft.js` | **`RECIPES` 13** · `startCraft` 995 · `drawCraft` 1062 |
| `60-stations.js` | `FIRING` 16 · `SMELT` 60 · 화덕·제련로·숫돌·모루·물레방아·발전기 · 바구니·상자·쓰레기통 · 이름표 · 설비 밀기(F) · 용기 공용 규칙 |
| `62-build.js` | `BUILD` 73 · `floorAt` 118 · `BUILD_MESH` 322 · 짓기 모드 · 불꽃 · 횃불·등잔·전등 |
| `64-dex.js` | `GEO` 12 · `obtainOf` 220 · **`CONTROLS_GUIDE` 515**(사전 '조작' 탭) · `drawDex` · `dexShow`(가방에서 한 항목으로 건너가기) · 상자 창 · 숫돌 창 |
| `70-weapons.js` | `CREATURES` 12 · 근접 판정 · **`WEAPON_FX` 195** · `emberClad` 109 |
| `72-gear.js` | 갑옷·투구·옷·짐(`GEAR` 463 · `gScalesOnMesh` 233 · `gearModel` 475) |
| `74-icons-guns.js` | `itemIcon` 95 · 손에 든 먹을것 · 휘두르기 · `shoot` 358 · 수류탄·조준경·로켓 · `castNet` 543 · 좌클릭 `useHeld` 579 · `attack` 607 |
| `80-player.js` | 날마다 몹 예산 `DAY_POWER`·`powerBudget`·`MOBS`(power · 고유 상수 `c` · `MOBS_LIVE` — 본편에 들어온 다섯만 `hold` 를 푼다)·고유값 `mobFit`/`mobWeight`·`rollSpawns`(97-mobs.js `mobRoster` 가 부른다) · **`PL` 119** · `hurtPL` 132 · 개발자 모드 `DEV`·`devFly`(기본 ; 키 — 키 창에서 바꾼다 · 날기 · 안 다친다 · 끄면 바닥에 내려선다) · 눈의 경계 `eyeHit`(눈 둘레 0.26 m 에 바위·땅이 들면 그 걸음을 되돌린다 — 새 움직임을 만들면 이것을 거칠 것) · 벼랑 오르기 `WALL`·`wallTick`(Space 를 누르고 있어야 매달린다 · 기력) · 미끄러짐(발밑이 49° 넘으면 걷기를 안 받고 끌려 내려간다 — `floorGrad`) · 개발자 모드 굴 둘러보기 `devCave`(] [) · 돌진(Space 를 누르는 순간 · `LUNGE_V`) · `updatePlayer`(걷기·헤엄·기력·배고픔) · `eyeWater`(물속 안개) · 음향 · 발소리 |
| `82-hud.js` | 지도 핀 `MAPPINS`·`toggleMap`(M — 펴면 `uiOpen` 이라 마우스가 풀린다 · 저장 `pins`) · `drawMap` · `drawCompass`(핀이 있으면 띠 위에 핀 줄 10 px) · 성능 창 `PERF` 98 · `updateHUD` 270 · 벤치마크 |
| `90-init.js` | 안개·그림자 셰이더 손질 · `initThree` 104 · `freezeStatics` 164 · `PRECOMP` 190 · `generateWorld`(만드는 차례) |
| `91-title.js` | **여는 화면의 그림**(캔버스 `#ovArt` — 처음 여는 화면 `#ov.title` 에서만 돈다) — 스텐실 간판 CASTAWAY(글자를 직접 긋는다 · 위가 좁은 올려다본 꼴 · 소실점으로 가는 두께) · 뒤로 누워 올라가는 안내 글 · 깨진 금. 전부 흑백으로 평평하게 그린 뒤 통째로 볼록한 유리에 휘고(`titleBend`), 빨강·초록·파랑을 갈라 겹친다. 단추(`titleButton` → `TITLE.btns` · 시작·착륙·설정·끝내기)와 진행 막대(`titleProgress` — `#barF`·`#ovLoad` 를 읽는다)도 캔버스가 그리고 HTML 쪽은 감춘 채 대신 누른다. 눈(잡음)·깜빡임·굴러가는 띠·비월 주사선·유리 반사 |
| `92-save.js` | `snapshot` 67 · 불러오기 · 묻는 상자 · 저장 칸 · `saveLocal` 330 · `loadFile` 401 · 자동 저장 · `DESKTOP` 잇기 |
| `93-keys.js` | **키 바꾸기** — 행동 표 `KB_ACTS`(id · 이름 · 묶음 · 기본 키 둘 · 범위) · `KB`(행동 → 글쇠 둘) · `KB_BY`(글쇠 → 행동) · `kbHit(e,행동)` · `kbSet`(같은 범위 겹침은 비움) · 저장 `castaway.keys` · 일시정지 화면 글쇠 줄 `KB_OV`→`kbOvRender` · 키 창 `#kbw`(`kbwToggle` — 설정 창 '조작 · 키 바꾸기') |
| `94-input.js` | 키보드·마우스·터치 · 창 여닫기 · 일시정지 · 설정 창 |
| `95-flora.js` | 군락 식생(정글·대숲·자작나무·소나무·맹그로브·야자·꽃밭 …) · 나무 열 갈래 · 덩굴·죽순·야자·바나나·버섯 · **종류마다 여러 벌**(`floraShapes` · `FLORA_VARS` — 칸 해시로 그루마다 고름 · `FLORA.m[종류]` 는 벌마다 메시 배열) · **나무 갈래는 참나무·전나무와 같은 길**(`floraFar` — 섬 전체를 한 번 깔아 64 m 칸에 담고, 그루마다 50 m(`FL_FULL`) 안 제 벌 · 그 밖도 제 벌을 줄인 것 60 m 까지 65%(그림자 드리움 — 줄인 단계도 다 드리운다 · 2026-10-20) · 95 m 까지 30% · 160 m 까지 12%(`floraLodGeo` — 잎 판을 솎고 1/√몫 배로 키움 · 큰 줄기는 그대로) · 200(`FL_PIC`)~450 m 기준 그루를 찍은 그림(`floraBakePic`) · 화면 밖 칸은 거름 · 2 m 움직이거나 보이는 칸이 바뀔 때만 다시 채움 · 몸 원·딸 것은 60 m 안만) · 덤불 겹은 사람 둘레 46 m · 늘 제 벌 · 자동 품질은 이 반경을 0.85배(39 m) 밑으로 못 당긴다(0.4배 18 m 라 12 m 밖 덤불이 사라졌다 — 사용자 지적) · `SHP.merge` 가 부품마다 정점 구간을 `userData.parts` 에 적는다(줄인 복제가 쓴다) · 그림 묶음 `floraAtlas`(1024² · 칸 256 — 잎 판은 **작은 잎 수십 장이 붙은 잔가지 한 줌**, 껍질·자작·바나나 줄기·버섯 갓은 값잡음으로 칠함 · 칸 12 자작 · 14 바나나 줄기 · 15 버섯) · `fin` 이 잎 판마다 수관 속 그늘(가운데·아래일수록 어둡게)과 빛깔 흔들기를 곱하고 통째로 밑동을 짙게(`merge` grad 0.80→1.04) |
| `95-giants.js` | 30~40 m 노거수 · 걸을 수 있는 판근(`giantRootAt` — `floorAt` 이 쓴다) · 종류마다 네 벌(`GIANT_VARS` · `GIANT.geo[종류][벌]`) · **200 m 밖은 종류마다 가장 가까운 그루의 벌 하나**(`GIANT.ref` · `updateGiants` — 참나무·전나무 `FAR_REF` 와 같은 방식 · 시야 안 그루만 채움 · 그림자 안 드리움 · 뿌리는 200 m 안만) |
| `96-sea.js` | 산호·말미잘·바닷말·불가사리·바위·조개·물고기 떼(작살·그물) · 먼 바다 공포 |
| `96-underworld.js` | **땅속 세계**(지형 판 7) — 바닥·천장 높이 두 장(`underQ`)의 굴 방·굴길 · 사람 둘레 48 m 칸 · 수직굴 밧줄(`underRopeTick`) · 어둠과 빛나는 것들 · 박쥐·동굴어·동굴영원·꼽등이·거미줄·큰 동굴지네 · 땅속 지도. 몸은 `PL.under` 로 갈아탄다(floorAt · walkable · eyeHit · solidAt · waterAt) |
| `96-dishes.js` | 요리 스물 — 바다 것 갈래(생선 · 조개 · 게·새우 · 문어·오징어 · 날고기) · '요리' 단 · 돌판구이(현무암 판돌) · 온천 요리(`spring` 자리) · 그릇 모양(`dish`). 96-reef.js 다음에 읽는다 |
| `96-reef.js` | 바다 생물 마흔 — 헤엄치는 것 21(FISH_SP 에 보탠다) · 바닥 14 · 떠다니는 것 5 · 그 아이템·굽기·조합 · 산호 폴립 결. `seaScatter` 를 감싼다 |
| `96-foam.js` | **물가의 거품** — 사람 둘레 55 m 의 물가에 서는 사면체 조각(물머리 · 부서지는 물결 · 물가를 늘 덮는 띠). 움직임은 정점 셰이더(진짜 수면 = 물 셰이더의 긴 파도 셋 · 물가의 생김새 `aD`), 물가 찾기는 C(`engine/native/shore.c` — `foamBench()` 로 JS 판과 견준다). **물 셰이더의 파도 수를 바꾸면 여기 · 땅 셰이더의 젖은 띠(22) · `seaSurfAt`(20) 도 같이** |
| `97-wildlife.js` | 새 떼(`wildFlocks`) · 둥지와 알 · 벌집과 꿀(`WILD.picks` — `FLORA_PICK` 의 egg·honey) · 새총(`slingShot` · 총·활도 `wildShot`) · 나무 오르기(`climbTick` — `updatePlayer` 가 맨 먼저 부른다) · 나비·반딧불이·잠자리·벌(`wildBugs`) |
| `97-temples.js` | **옛 신전**(지형 판 8 · 사용자 요청) — 섬 한가운데 계단 신전(`templeLandSite` — 뭍의 무게중심 둘레에서 고른 땅을 골라 반지름 36 m 를 다진다 · 자원 놓기 전) · 해구 가장자리 수심 30~45 m 의 해저 신전(`templeSeaSite` — `shapeSeabed` 뒤). 돌덩이는 방향이 돌아간 상자로 막는다(`templeFloor`·`templeSolid` — `coastFloor`·`coastSolid` 가 먼저 부른다). 상자·항아리는 한 번만 여는 줍기(`TEMPLE.picks` · FLORA_PICK `tchest`·`turn` 의 `once`·`loot` → `templeLoot` · 저장 `temples`) — **백금 반지는 해저 신전에서만**(판 8 은 처음 지니지 않는다). 들판의 바위 솎기 `thinOpenRocks` · 험한 데의 더 나은 소출 `yieldK`/`yieldMul` |
| `97-mob-rigs.js` · `data-mob-*.js` | **몬스터의 몸** — 시험장에서 옮겼다: 아르크토스 공용 구역(맨 끝 · bear_arena 글자 그대로를 함수로 감싸 시험장 설정 `P`·`Q` 자리에 `BEAR_P`·`BEAR_Q` — 본편 `P` 는 섬 인자라 겹친다 · `bearBody`·`bearDraw`·`bearHitCaps`·`BEAR_CX`·`BEAR_CAPR` 만 밖으로 · **`tools/bear-rig.mjs` 가 같이 바꿔 끼운다**) · 다지류 모듈(`CRW` · `makeCrawler`/`placeCrawler`/`stepCrawler` — crawler_arena 그대로, 다만 `SIZE` 1.0 · 땅 높이 `crwGround`) · 가고일 공용 구역(`GARG_J`…`gargDraw` — 임시 이름 `_gv`·`_gM` 만 `_gaV`·`_gaM` 으로 바꿨다(72-gear.js 와 겹쳐서) · **`tools/garg-rig.mjs` 는 이 파일을 안 고친다** — 원본을 고치면 손으로 옮길 것) · GLB 풀기 `parseGLB_garg`/`parseGLB_mob`. 자료(base64 · 읽지 말 것): `data-mob-crawler.js`(`CRW_META`/`CRW_B64`) · `data-mob-bear.js`(`BEAR_GLB` — 정점색) · `data-mob-wyvern.js`(`WYV_GLB` · 화염구 `WYV_FB_GLB`) · `data-mob-gargoyle.js`(`GARG_GLB`) · `data-mob-mimic.js`(`MIMIC_GLB` — 바탕색 1024) |
| `97-mobs.js` | **몬스터**(지형 판 8 · `MON` — **`MOBS` 는 80-player.js 의 날짜별 출현 표 이름이라 못 쓴다**) — 둥지 `mobsSites`(우거진 숲 곁 굴 · 그 굴은 불빛 없음 `c.dark`) · 몸 빚기 `mobsBuild`(섬마다 거두기만 · 다지류 2 · 가고일 6 · 스킨워커 3 · 아르크토스 4 · 애쉬스케일 2(97-wyvern.js) 를 돌려 쓴다) · 그날 명단 `mobRoster`(파워레벨 예산 · `mobHabitat`) · 세우고 거두기 `mobSpawner`(1.2초마다 · 명단 칸이 가까우면) · AI `crawlTick`/`gargTick`/`mimTick` · 맞는 공 `mobProxy`(CREATURES 에 거는 대역 — 체력은 몸의 것 · 한 프레임에 같은 몸의 공 여럿이 맞으면 가장 큰 것 하나) · 맞음 `mobDamage`(움찔 · 비명 — 넉백 없음) · 화면 흔들림 `mobCamera` · 겹침 `mobSeparate` · 소리 `mobVoice`(합성) · 사체 뒤지기(`MON.picks` → `FLORA_PICK.mobloot` · `MOB_LOOT`) · 둥지 숲의 더 나옴 `mobLairBonus`(→ `yieldK`) |
| `97-sheep.js` · `data-mob-sheep.js` | **양**(사용자 요청 — Meshy 'Woolly Sheep' 을 `tools/sheep/rig.py` 로 리깅) — 풀밭 · 덤불 땅의 무리(3~5) · 뜯기 · 걷기 · 쳐다보기 · 달아나기(맞거나 뛰어들면 무리 전체) · 대각선 다리 걸음 · 귀 · 꼬리 · 매애(`mobVoice('baa')`) · 사체(양고기 2 · 양털 3) · 산 양 털 깎기(`FLORA_PICK.sheepshear` · `live` 줍기 — 빈손 + 날붙이 지님 · 이틀마다) · 아이템 `meat_mutton`·`wool`·`bandage_wool` · 제작법 `cord_wool`·`bandage_wool`. 몬스터 수 · 지형 판과 상관없이 선다(`MON.sheep` · 97-mobs.js 의 `mobsBuild`/`updateMobs` 가 부른다) |
| `97-wyvern.js` | **애쉬스케일**(지형 판 8 — beta/wyvern_arena.html 를 **개체 만드는 함수 `wyvMake(S)` 로 감쌌다**: 시험장 전역 `W`·`BONE`·`bone`·`rotBone`·`REST`… 가 본편과 안 겹치게 · 밖으로는 `wyvMake`·`wyvShared`·`wyvBuild`·`wyvReset`·`wyvTick`·`WYVS`(몸 둘) 뿐) — '자세' 구역은 시험장 글자 그대로(**`tools/wyv-sync.mjs` 가 같이 바꿔 끼운다**) · 명단이 정한 탁 트인 데에 나타나 제 자리 둘레를 돈다 · 화염구 · 할퀴기 · 물기 · 터짐 · 잔해 · 맞는 공은 뼈 캡슐을 1 m 마다(`sampleCaps` · 72개) |
| `98-bag.js` | 가방 화면(소지품 + 고른 것 + 제작) — 가방에는 그림 · 이름 · 개수 · 할 수 있는 일만, 자세한 것은 사전(`dexShow`) |
| `99-main.js` | **`loop`** 8 · 맨 끝에서 게임을 켜는 다섯 줄 |

줄 번호는 커밋 때 다시 잴 것:
`grep -n "^const ITEMS\|^function updateSky" engine/js/*.js` 처럼 이름으로 찾는 편이 빠르다.
