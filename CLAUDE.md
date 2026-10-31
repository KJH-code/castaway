# CASTAWAY

무인도 생존 게임. **단일 HTML 파일 · Three.js r128 · 빌드 과정 없음.**

**처음 맡았으면 `docs/HANDOVER.md` 부터** — 2026-10-15 인수인계(사용자와 정한 규칙 요약 · 점검 결과 · **FPS · 비주얼 · UI 할 거리와 잰 값** · 몹은 사용자가 직접 만든다).

## 스택

- Three.js r128을 레포 안의 `engine/three.min.js`(603KB)에서 `<script src>`로 로드.
  게임에는 번들러·패키지 매니저·`node_modules` 없음. **바깥으로 나가지 않으므로 오프라인에서도 뜬다**
- **데스크톱 판은 `desktop/`**(Electron 44 · electron-builder 26) — 게임을 감싸는 껍데기일 뿐이고 npm 은 이 폴더 안에만 있다(아래 '데스크톱 판')
- 본편은 `island_world.html`(뼈대) + `presets/presets.js` + `engine/css/game.css` + `engine/js/*.js` 60개(코드 49 + base64 자료 11 — 몬스터 모델 다섯 포함)로 나뉘어 있다(보통 스크립트 · 차례대로 불러옴 — 아래 '파일 지도') · 아이템 367종 · 레시피 280개(제작법 242 + 설비 공정 38 — 2026-10-19 잼)
- 라이선스 GPL-3.0

## 폴더

| 폴더 | 무엇 |
|---|---|
| `island_world.html` | 게임을 여는 파일(뼈대) — 이것만 맨 위에 둔다 |
| `engine/` | **게임 엔진** — `three.min.js`(Three.js r128) · `css/game.css` · `js/*.js`(본편 코드 49개 + base64 자료 11개) · `native/`(C 로 짠 계산 토막과 그 빌드 결과) |
| `presets/` | **프리셋** — 코드가 아닌 값·자료 묶음: `presets.js`(그래픽·섬 프리셋 — 설정 창이 고른다) · `models/`(몹 모델 .glb) |
| `beta/` | **베타 시험장** — `*_arena.html`(전투·구름·농성 시험장) · `build_sandbox.html` · `_v.html`. 본편과 따로 뜨는 한 파일짜리들이다 |
| `env/` | **가상 환경** — 빌드에만 쓰는 도구(C 컴파일러 · 파이썬 가상 환경)를 받는 스크립트. 받아 온 것 자체는 레포에 안 담는다(`env/README.md`) |
| `desktop/` | 데스크톱 판(Electron 껍데기) |
| `tools/` | 검사·묶기 도구(`check-syntax` · `smoke` · `probe` · `build_single.py` · `serve.py`) · `sheep/rig.py`(Meshy 양 FBX 에 뼈 21 을 심어 GLB 로 — numpy 만 씀 · 쓰는 법은 파일 머리말) · `garg-rig.mjs`(가고일 뼈 가중치를 세고 공용 구역을 다섯 시험장에 옮긴다) · `wyv-sync.mjs`(애쉬스케일 자세 구역을 battle·night·siege 와 본편 `97-wyvern.js` 에 옮긴다) · `bear-rig.mjs`(아르크토스 뼈 가중치를 세고 공용 구역을 다섯 시험장과 본편 `97-mob-rigs.js` 에 옮긴다) · `bench-window.js`(**보이는 창에서 FPS 재기** — `desktop/node_modules/.bin/electron tools/bench-window.js`) · `tri-census.js`(**무엇이 프레임을 먹는지** — 상륙 자리 네 방위의 삼각형을 계통별로 · 그림자 몫까지 — `node tools/probe.mjs island_world.html --run tools/tri-census.js`) · `make-font.py`(디지털 글꼴 `engine/css/font.css` 를 다시 짓는다) · `azure/`(Meshy 몹 모델 애저 아포칼립스를 받침 떼고 · 20만 세모로 줄이고 · 다시 칠하고 · 뼈 심어 GLB 로 — `sh tools/azure/run.sh` · 자세한 것은 `tools/azure/README.md` · 시험장에 줄여 넣기 `python3 tools/azure/arena-data.py`) |
| `docs/` | 설계 문서 · 개발 대화 원문 · 그래픽 엔진 조사 |

## 실행

빌드 없음. 파일을 열면 끝이다.

```
island_world.html
```

### 데스크톱 판 · 저장 · 설정 · 멈춤(자세한 것은 `docs/notes/desktop.md`)

- **데스크톱 판은 `desktop/`**(Electron 44 · electron-builder 26) — 게임을 감싸는 껍데기다. **게임 본체는 베끼지 않는다** — 묶은 판은 `extraResources` 로
  `resources/game/` 에 넣는다. **본편이 읽는 파일 묶음을 새로 만들면 `desktop/package.json` 의 `filter` 에도 더할 것.**
  개발 `cd desktop && npm ci && npm start` · 묶기 `npx electron-builder --linux` · 빌드는 GitHub Actions '데스크톱 판'(`.github/workflows/desktop.yml`).
  판 번호는 `desktop/package.json` 의 `version`(`package-lock.json` 맨 위 두 곳도 같이). 게임이 아는 것은 `window.DESKTOP` 하나(`preload.js`).
  메뉴 줄이 없어 **F5 는 게임의 저장**이다. 시험은 xvfb 위 playwright `_electron.launch`(사진은 주 프로세스의 `webContents.capturePage()`).
- **저장 칸 넷**(슬롯 1~3 + 자동 저장 `auto` — 5분마다 · 새 섬 전 · 그래픽이 끊겼을 때 · 창 닫기) · **새 섬은 묻고 나서**(`newIsland`) ·
  **설정은 다음에 켤 때도 그대로**(`SET` · `castaway.settings` — `applySettings()` 는 `initThree()` 와 `generateWorld()` 사이) — 섬 모양(시드·크기…)은 설정이 아니라 저장 파일이 가진다.
  **멈춤 중엔 아낀다**(초당 10번만 그림 · 창을 내리면 안 그림 · 소리 멈춤 — 데스크톱 판은 `document.hidden` 이 늘 false 라 `winHidden`).

`.glb` 모델을 로드하는 코드를 넣는 순간부터는 `file://`에서 CORS로 막히므로 정적 서버가 필요하다:

```bash
python -m http.server 5173
```

## 파일

| 파일 | 내용 |
|---|---|
| `island_world.html` · `engine/css/` · `engine/js/` | 본편(나뉜 판 — 아래 '파일 지도' · `CODEMAP.md`) |
| `CODEMAP.md` | 나뉜 본편의 파일별 설명(영어) · 고칠 때 지킬 것 |
| `tools/build_single.py` · `tools/serve.py` | 한 파일로 묶기 · 캐시 끈 로컬 서버 |
| `engine/three.min.js` | Three.js r128(npm three@0.128.0 의 build) — **cdnjs 대신 이걸 쓴다** · 한 줄 고친 데가 있다(아래 '규칙') |
| `beta/*_arena.html` | **시험장** — 가고일 · 애쉬스케일(wyvern) · 농성(siege) · 편싸움(battle) · 밤(night) · 밤 애저(azure_night) · 구름(cloud) · 다지류(crawler) · 애저(azure) · 곰(bear · mixed) · 셋(trio) · 스킨워커(mimic) — 무엇이 어떻게 도는지는 `docs/notes/arenas.md` |
| `docs/CASTAWAY_개발요약.md` | **설계 문서. 작업 전에 먼저 읽을 것** |
| `docs/CASTAWAY_전사_*.md` | 개발 대화 원문(아래 '읽지 말 것') |
| `docs/notes/*.md` | **계통별 노트** — 무엇을 왜 그렇게 짰나 · 잰 값 · 같이 고칠 짝(아래 '계통별 노트') |
| `presets/models/*.glb` | 몹 모델 — `bear_high` · `stormscale_wyrm` 은 아직 아무도 안 읽는다 · `azure_apocalypse` 는 애저 시험장(`docs/notes/arenas.md`) |

**본편은 나뉘어 있다** — `island_world.html`(281줄 · HTML 뼈대뿐) + `engine/css/game.css` + `engine/js/*.js` 60개(코드 49 + base64 자료 11).
js 는 **ES 모듈이 아니라 차례대로 불러오는 보통 스크립트**다(모듈은 `file://` 에서 안 뜬다 · 보통 스크립트는 전역 하나를 나눠 써서
나누면서 고쳐 쓴 것이 없다). 번호가 곧 불러오는 차례다 — **불러오는 순간 바로 도는 코드는 위 파일 것만 쓸 수 있다**(함수 안에서
부르는 것은 어느 파일 것이든 된다). 새 계통은 `99-main.js` 바로 위에 새 파일로 넣는 것이 쉽다. 파일별 설명(영어)은 `CODEMAP.md`.
한 파일로 묶으려면 `python3 tools/build_single.py` → `island_world_single.html`(무시 목록에 있다 — 고치는 것은 늘 `engine/js/`).
로컬 서버로 볼 때는 `python3 tools/serve.py`(캐시를 끈다). 문법만 볼 때는 `node --check engine/js/파일.js`.
**나뉘기 전 한 파일 판은 커밋 `8ec7546` 까지다.**

`data-ground-textures.js`(1.2 MB · 땅 사진 여덟 장)·`data-rock-textures.js`(1.8 MB · 바위 사진 여섯 장 + 법선 지도 — `rockPhotoInit` 이 `uRk`·`uRkN` 으로 올리고 `rockMat`·`rockDetailPatch`·땅 셰이더의 벼랑 면이 읽는다)·`data-sentinel-mesh.js`(1.3 MB · 투구 모형)는 base64 한 줄이다 — **읽지 말 것.**
나머지도 큰 파일(`45-sky.js` 2,342줄 · `30-props.js` 1,618줄)은 통째로 읽지 말고 아래 지도에서 줄을 집어 `sed -n '시작,끝p'` 로 뜰 것.

### 파일 지도 — `engine/js/`(한 줄씩 · 함수 줄 번호와 자세한 것은 `docs/notes/files.md` · `CODEMAP.md`)

| 파일 | 무엇이 있나 |
|---|---|
| `00-core.js` | 오류 띠 · 시드 난수·잡음 · 격자 크기 · 지형 필드 `F` · 바이옴 표 · `RESOURCES` · 섬 인자 `P` |
| `10-worldgen.js` | 섬 만들기(융기 → 침식 → 하천 → 경사 → 기후 → 바이옴 → 자원 배치 `placeResources` · 동굴 자리 `caveSites`) · 해저 `shapeSeabed` · `heightAt` 등 조회 |
| `12-native.js` · `data-native-wasm.js` | C 로 짠 침식·빛 토막(WebAssembly · 원본 `engine/native/*.c` — JS 판과 비트까지 같아야 한다) |
| `20-terrain.js` | 가지·잎 인스턴스 · 압축 `instCompact` · 나무껍질 · 땅 셰이더 · 암석 재질 `rockMat` · 지형 `buildChunks`/`updateTerrainLOD` · 바다·하천 물 `waterMat` |
| `22-ground-textures.js` | 땅 사진 배열 텍스처 · 사진 결 땅 셰이더 · 둔덕 재질 `moundMat` |
| `24-shapes.js` | 식물·바다 생물이 같이 쓰는 모양 도구(`SHP`) |
| `30-props.js` | 칸 보이기 `updateTileVis` · 참나무·전나무 단계 `TL` · 먼 나무 그림 · `buildProps`(`HABIT`) · 자갈 · 베리 · 보급선 · 충돌 `resolveProps` |
| `31-cave10.js` | 동굴 지형 판 10 의 자료(`P.tv>=10` 일 때만) — 종류 `cv10Kind` · 자리 `cv10Layout` · 굴 부피 `cv10Field` · 겉 비울 원 `cv10Zones`(설계 `docs/notes/caves.md`) |
| `32-caves.js` | 동굴(바위 굴집) `buildCaves` · 굴 바위의 참 꼴 `caveSolid`/`caveIn` · 굴 속 빛·바닥 `CAVE_GLSL`(가까운 방 여섯 — envPatch · 땅 셰이더가 읽는다) · `updateCaves` |
| `33-crags.js` | 암벽 — 큰 바위 무리 `cragSites` · `cragMesh` · `cragFloor` |
| `34-coast.js` | 바닷가 — 시스택·해식 아치·주상절리(`coastFloor` · `coastSolid`) |
| `35-geo.js` | 지열 지대(전역 이름 `GEOT` — `GEO` 는 64-dex.js 것이다. 겹치면 그 파일이 통째로 안 읽힌다) |
| `36-falls.js` | 폭포·연어 · 저수지 폭포 `fallsCarve` |
| `40-light.js` | `LIGHT`(배역 · 해 그림자 · 점·집중광 예산 · 불빛 풀 `addFire`) · `renderFrame` |
| `41-terrain-light.js` | 섬 크기의 빛 텍스처 `TLIT`(산 그림자 · 하늘 트임 · 숲 덮임) · `envPatch` |
| `45-sky.js` | `SKY` · 날씨 `updateWeather` · 구름 `updateClouds`/`litQueue` · `SKY_LUT` · `updateSky` — `beta/cloud_arena.html` 의 원본 |
| `46-camcorder.js` | 캠코더 화면(테이프 셰이더) · 배터리 · 다쳤을 때 치지직·금 |
| `50-items.js` | `ITEMS` · `INV` · `dragPut` · `HARVEST` · `MINE` · 먹기·마시기 · 빠른 칸 · 그루터기 `STUMP` |
| `55-craft.js` | `RECIPES` · `startCraft` · `drawCraft` |
| `60-stations.js` | `FIRING` · `SMELT` · 화덕·제련로·숫돌·모루·물레방아·발전기 · 보관함 · 옮기기 `MOVE` |
| `62-build.js` | `BUILD` · `floorAt` · 짓기 · 불꽃 · 횃불·등잔·전등 · 가마 |
| `64-dex.js` | `GEO` · `obtainOf` · `CONTROLS_GUIDE` · 사전 · 상자 창 · 숫돌 창 |
| `66-decay.js` | 상하는 먹을 것 · 비에 꺼지는 불 |
| `70-weapons.js` | `CREATURES` · 근접 판정 · `WEAPON_FX` · `emberClad` |
| `72-gear.js` | 갑옷·투구·옷·짐 `GEAR` · `gearModel` |
| `74-icons-guns.js` | `itemIcon` · 휘두르기 · `shoot` · 수류탄·조준경·로켓 · `castNet` · `useHeld` · `attack` |
| `80-player.js` | 몹 예산 `MOBS` · `rollSpawns` · `PL` · `hurtPL` · 개발자 모드 · 눈의 경계 `eyeHit` · 벼랑 오르기 · `updatePlayer` · 소리 |
| `82-hud.js` | 지도 핀 · `drawMap` · 나침반 · 성능 창 `PERF` · `updateHUD` · 벤치마크 |
| `90-init.js` | 셰이더 손질 · `initThree` · `freezeStatics` · `PRECOMP` · `generateWorld`(섬을 만드는 차례) |
| `91-title.js` | 여는 화면의 그림(캔버스) |
| `92-save.js` | 저장 · 불러오기 · 묻는 상자 `ask` · 저장 칸 · 자동 저장 · `DESKTOP` 잇기 |
| `93-keys.js` | 키 바꾸기 `KB_ACTS` · `kbHit` · `KB_OV` |
| `94-input.js` | 키보드·마우스·터치 · 창 여닫기 · 일시정지 · 설정 창 |
| `95-flora.js` | 군락 식생 · 따기 `FLORA_PICK`/`GATHER` · 먼 단계 `floraFar` |
| `95-giants.js` | 노거수 · 판근 `giantRootAt` · 베기 |
| `96-sea.js` · `96-reef.js` · `96-dishes.js` · `96-foam.js` | 바다 생물 · 물고기 · 요리 · 물가 거품 |
| `96-underworld.js` | 땅속 세계(지형 판 7 · `PL.under`) |
| `97-wildlife.js` | 새 · 알 · 꿀 · 새총 · 나무 오르기 · 벌레 |
| `97-temples.js` | 옛 신전 둘 · `templeNear` · 험한 데의 더 나은 소출 `yieldK` |
| `97-mob-rigs.js` · `data-mob-*.js` | 몬스터의 몸(시험장에서 옮김 — 아르크토스 · 다지류 · 가고일 공용 구역) |
| `97-mobs.js` | 몬스터 `MON` · 둥지 · 그날 명단 · AI · 맞는 공 `mobProxy` · 사체 |
| `97-sheep.js` | 양 |
| `97-wyvern.js` | 애쉬스케일(`wyvMake`) |
| `98-dew.js` · `98-bag.js` | 이슬 · 가방 화면 |
| `98-surface.js` | 땅속에 완전히 들어가 있는 동안 땅 위를 가림(`SURF` · `surfList`) |
| `99-main.js` | `loop` · 게임을 켜는 줄 |

함수는 이름으로 찾는 편이 빠르다: `grep -n "^const ITEMS\|^function updateSky" engine/js/*.js`.

### 아이템을 추가할 때 실제로 건드리는 곳

아이템은 **능력 필드로 기술하는 데이터**다. 로직은 id가 아니라 필드를 묻는다 —
`armor`(방어 합산) · `food`/`raw`(먹기) · `fuel`(화덕) · `heal`(붕대) · `light` ·
`tool:{axe,pick,net,weapon,dmg,reach,rate,…}` · `tags`(레시피가 id 대신 쓴다).
그래서 보통은 `ITEMS` 한 줄 + 획득 경로 한 줄이면 끝난다.

예외 넷은 미리 알고 갈 것:

1. **손에 드는 것(`tool` 을 단 아이템)은 전부 `WEAPON_FX` 에 생김새 함수를 따로 써야 한다.**
   무기만이 아니다 — 도끼·곡괭이·그물·횃불·등잔·활비비·라이터·통나무배(노)·시멘트도 들면 보인다(57개 = 57개 — 2026-10-15 에 상어 이빨 칼·시멘트·통나무배 셋이 빠져 있던 것을 채웠다).
   안 쓰면 `setWeaponFx` 가 조용히 `return` 하고 손이 빈다. 더하면 이 짝부터 맞춰 볼 것:
   `node tools/probe.mjs island_world.html "Object.entries(ITEMS).filter(([k,v])=>v.tool).length" "Object.keys(WEAPON_FX).length"`
   무기가 아닌 것은 `rest:{rx,rz}` 로 세워 들고(횃불·그물), 도끼·곡괭이는 캐는 동안(`HARV.active`)
   내리친다. **드릴(`tool.drill`)은 안 휘두른다** — 앞으로 밀어 대고(`DRILL_K`, 0.25초) 잘게 떨며 날끝 무리(`spin` —
   `userData.spin`)가 돈다. 곡괭이 등급을 달고 있어 예전엔 곡괭이처럼 내리쳤다. 손에 든 도구로 할 수 없는 것을 보고
   좌클릭하면 도구마다 안내가 다르다(도끼 — 나무 줄기 · 곡괭이·드릴 — 광석·암석). `tip`(이름 붙인 Object3D)이 있으면 횃불 불꽃이 그 자리에 앉는다(`updateTorch`).
   재질은 `WMAT` — 퐁, 무채색일수록(쇠·뼈) 반들거린다. 같은 색은 한 재질을 나눠 쓴다(`_WM`).
2. **id가 직접 박힌 자리가 여남은 곳 있다** — `tinder`(발화) · `codex` ·
   `ring_platinum` · `stone_block`. `grep -n "id==='"` 로 확인할 것.
   탄약은 여기서 빠졌다 — `ammo` 필드를 단 것이 총에 들어가고 `ammo.dmg` 가
   피해에 곱해진다. **구경(`ammo.bore` ↔ `tool.bore`)이 맞아야 약실에 들어간다**
   (없으면 `'rifle'` 로 친다 — 산탄총만 `'shot'`). 새 탄은 `ITEMS` 한 줄이면 된다.
   총도 데이터다 — `tool.pellets`/`spread` 가 산탄(알마다 따로 선을 쏜다),
   `tool.auto` 가 연사(왼쪽 단추를 누르고 있으면 쿨마다 한 발)다.
3. **`attack()`(5301)은 그물을 특례로 가로챈다.** `equippedWeapon()` 이 무기 아닌
   걸 걸러내기 때문이다. "무기 칸에 들어가는데 무기가 아닌 것"을 또 만들면 특례가
   또 생긴다 — 필드 분기로 합치는 쪽을 먼저 볼 것.
4. **`beta/build_sandbox.html` 이 `ITEMS` 를 204줄 통째로 복사해 갖고 있다.**
   이미 20줄 어긋나 있다. 본편 표를 고쳐도 저기는 안 따라간다.

## 읽지 말 것

- **`docs/CASTAWAY_전사_초반부.md`(96KB) · `docs/CASTAWAY_전사_2차.md`(38KB) 는 개발 대화 원문이다.**
  결론은 이미 코드와 `docs/CASTAWAY_개발요약.md` 에 들어가 있다. 여기 적힌 건 역사일 뿐이니
  **현재 동작의 근거로 삼지 말 것.** 왜 그렇게 정했는지가 정말 궁금할 때만 `grep` 으로
  해당 대목만 뽑아 볼 것 — 통독하면 13만 자를 그냥 태운다.
- 현재 동작이 궁금하면 문서가 아니라 코드를 본다. 문서와 코드가 다르면 **코드가 맞다**
  (아래 '확인하는 법' 으로 재 볼 것).

## 어느 쪽이 정본인가

같은 표가 여러 파일에 복사돼 있다. 고칠 때 **본편만 고치면 아레나는 안 따라간다.**

| 표 | 정본 | 복사본 |
|---|---|---|
| `ITEMS` · `RECIPES` · 지형 생성 | `engine/js/50-items.js` · `engine/js/55-craft.js` · `engine/js/10-worldgen.js` | `beta/build_sandbox.html` (`ITEMS` 204줄 복제, 이미 20줄 어긋남) |
| 갑옷 성능 · 피해 감소 | `island_world.html` 의 `ITEMS[].wear` 와 `armorMul()` | `trio`·`siege`·`mixed` 아레나의 `ARMORS`/`armorMul()` (셋은 맞춰 두었다. `wyvern`·`battle`·`bear` 는 아직 갑옷이 없다) |
| 무기 성능(피해·사거리·쿨) | `island_world.html` 의 `ITEMS[].tool` | 아레나 5개가 각자 인라인으로 들고 있다 |
| 몹 거동 | 각 아레나 | 본편 `engine/js/97-mobs.js` 는 제 AI 를 따로 짰다(다지류 · 가고일 · 스킨워커 — 아래 '몬스터'). 몸(뼈 · 껍데기)은 `97-mob-rigs.js` 에 시험장 것을 옮겼다 |
| 가고일 뼈대 · 몸짓(`GARG_J` · `GARG_SKIN` · `gargBody` · `poseGarg` · `gargDraw`) | `beta/gargoyle_arena.html` | battle · night · siege · trio · mixed — **글자 그대로**. 원본을 고치고 `node tools/garg-rig.mjs` |
| 애쉬스케일 자세(`poseWyv` · `poseWyv_` · `wWingPose` · `wLook` · `wSwing`) | `beta/wyvern_arena.html` | battle · night · siege · 본편 `engine/js/97-wyvern.js`(함수로 감쌈) — **글자 그대로**. 원본을 고치고 `node tools/wyv-sync.mjs` |
| 아르크토스 뼈대 · 몸짓(`BEAR_J` · `BEAR_SKIN` · `bearBody` · `bearDraw` · `bearHitCaps`) | `beta/bear_arena.html` | mixed · trio · siege · battle · night · 본편 `engine/js/97-mob-rigs.js`(함수로 감싸 P · Q 만 곰 것으로) — **글자 그대로**. 원본을 고치고 `node tools/bear-rig.mjs` |
| 하늘 · 구름 · 날씨 | `engine/js/45-sky.js` | `beta/cloud_arena.html` (그대로 복사 + 손잡이 5개) |
| 애저 아포칼립스 거동 · 자세 · 공격 | `beta/azure_arena.html` | battle(`AZM` — 몸 · 자세 · 공격은 같은 글, 노리는 것 · 맞히는 것만 편싸움에 맞춰 고쳤다 · 본편엔 아직 안 들였다) |

아레나는 시험장이라 갈라져도 되지만, **수치를 만졌으면 어느 쪽을 만졌는지 밝힐 것.**
"철·키틴 무기 쿨을 4/5로" 같은 변경은 6개 파일을 전부 고쳐야 했다.

## 확인하는 법

빌드가 없으니 검사도 브라우저에 직접 띄워서 한다. 스크립트를 새로 짜지 말고 이걸 쓸 것.

```bash
node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js   # html 은 <script> 를 뽑아, js 는 그대로 node --check
grep -o 'src="[^"]*\.js"' island_world.html | sed 's/src="//;s/"$//' | grep -v three.min | xargs cat > /tmp/all.js && node --check /tmp/all.js   # 전역 이름이 겹치나(파일 하나씩은 못 잡는다 — 겹치면 그 파일이 통째로 안 읽힌다)
node tools/smoke.mjs                        # 전부 띄워 오류 없이 뜨는지 (파일 이름을 주면 그것만)
node tools/probe.mjs island_world.html PL.hp RECIPES.length
node tools/probe.mjs island_world.html --do "hurtPL(40,'시험')" PL.hp
```

`probe.mjs` 가 값을 재 오는 쪽이다 — `--do` 로 상태를 만들고, 표현식으로 결과를 읽는다.
여러 단계를 재야 하면 `--run 파일.js`. 대상 목록과 브라우저 설정은 `tools/pages.mjs`.
`--run` 파일은 async 함수 몸통으로 돈다 — 값은 `return` 으로 돌려주고 `await` 를 쓸 수 있다(그래서 `node --check` 는 못 거친다).
프레임 부담을 계통별로 재려면 `node tools/probe.mjs island_world.html --run tools/tri-census.js`(잰 값과 할 거리는 `docs/HANDOVER.md` 6장).

- **브라우저가 없다고 하면** `CHROMIUM_PATH` 를 준다:
  `CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome node tools/smoke.mjs`
- **헤드리스에선 셰이더 미리 짜기(E2 · `PRECOMP`)가 꺼져 있다**(소프트웨어 렌더) — 셰이더 수를 재려면 `PRECOMP.force=true` 를 먼저.
- **헤드리스는 실시간의 1/20 쯤으로 돈다.** `--tick 4` 를 줘도 게임 안에서는 0.2초다.
  시간이 걸리는 변화는 기다리지 말고 함수를 직접 부를 것.
- **캠코더 화면이 기본으로 켜져 있다**(`CAMC.on` · 480줄) — 그림을 낮은 해상도로 찍어 테이프 화질로 옮기면서 **시각으로 알갱이 잡음을 뿌려서**
  같은 장면을 두 번 그려도 화소의 95% 가 다르다. 화소를 견줄 때는 먼저 `CAMC.lines=0`(캠코더 끔), 시작하지 않은 채(멈춘 동안은 물결·구름 시각이
  안 흐른다) 그릴 것. 그러면 페이지를 새로 열어도 화면 아래(땅)는 화소까지 같다.
- **사진을 견줄 때는 같은 페이지 안에서 찍을 것.** 먼 나무(55 m 밖 복제·판때기)는 상륙 자리에서 가장 가까운 나무를 본뜨는데
  (`FAR_REF`) — 상륙 자리는 이제 시드로 정해지므로(`LANDING`) 기준 나무는 같다. 별 자리는 켤 때마다 무작위다.
- **사진(`--shot`)은 눈으로 봐야 할 때만.** 한 장이 1,500토큰쯤 된다. 수치로 확인되는
  건 수치로 확인한다.
- `beta/mimic_arena.html` 은 21MB 라 `smoke.mjs` 기본 목록에서 빠져 있다. 이름을 대면 검사한다.
- **본편은 헤드리스 섬 생성이 약 30초다**(예전 7~14분 — 짓는 동안·시작 화면에서 섬 전체 나무를 가까운 단계로 그리던 것을 막았다,
  아래 '성능 정리 3' ⑩) — `pages.mjs` 의 대기 한도를
  20분으로 잡았다(예전 5분이라 늘 시간 초과였다). 못 뜬 페이지는 `open` 이 닫고 던진다 — 예전엔 안 닫혀서 그 페이지가 섬을
  계속 지으며 브라우저를 붙잡아 다음 대상(구름 시험장)까지 시간 초과로 떨어졌다.

## 작업 흐름

- **작업을 마치면 늘 main 에 합친다**(사용자 요청 — "앞으로 메인과는 항상 합쳐"). 브랜치에 커밋·푸시 → PR 을 만들고 → 곧바로 합친다(merge 커밋).
  합친 뒤 다음 작업은 브랜치를 최신 main 에서 다시 세워 시작한다(`git fetch origin main && git checkout -B <브랜치> origin/main`).
  합치기 전에 문법 검사·구동 검사(`check-syntax` · `smoke`)는 통과시켜 둘 것.

### 분업 — 메인이 지휘하고 워커가 일한다(orchestrate)

사용자 결정(2026-10-30) — 사용자가 올린 orchestrate 플러그인(v2.0.0)을 이 레포에 들였다: `.claude/skills/orchestrate/`(지휘 절차 · 지시서 양식 · 워커 머리말) ·
`.claude/skills/check/`(독립 검증 `/check test·review·debug`) · `.claude/agents/checker.md` · `.claude/agents/worker.md`. **절차는 그 스킬을 따른다.** 이 레포에서 바꾼 셋:
- **병합은 메인(Opus)이 한다**(사용자 결정) — 위 '작업 흐름'대로 늘 main 에 합친다(checker test 통과 · review 에 '실패' 없음이면). review 에 실패·의심이 있으면 그대로 보고하고 답을 기다린다.
  워커 · checker 는 푸시 · PR · 병합을 안 한다(워커는 제 작업 트리에 커밋까지).
- **구현 위임 · 인터뷰는 플러그인대로**(사용자 결정 — 예전 '구현은 맡기지 않는다 · Explore 만' 규칙을 바꿨다) — 작업이 독립적인 부분 둘 이상으로 나뉘거나 사용자가
  '/orchestrate · 분업으로' 할 때: 인터뷰(CLAUDE.md · 노트에서 알 수 있는 건 안 묻는다) → 쪼개기 → 지시서 → 워커(구현은 sonnet · low · 병렬이면 worktree) →
  checker(test sonnet · low → 통과하면 review opus · high) → 보고. 한 번에 끝나는 수정 · 질문은 메인이 직접 한다. 판단(설계 결정 · 원인 모를 디버깅 · 결과 해석 ·
  결정론 · 지형 판 · 정본/복사본)은 메인이 쥔다.
- **비용(메인이 정함)** — `general-purpose` 를 띄우는 고정 비용 **5.8만 토큰**(2026-10-30 · haiku · 한 줄 답 · CLAUDE.md 43 KB — 265 KB 때 18.9~19.3만).
  그래서 워커는 `worker`, 검수는 `checker`(도구를 줄인 이 레포 에이전트)로 띄우고 general-purpose 는 그것이 안 잡힐 때만(에이전트 파일을 막 만든 세션 —
  그 세션에선 목록에 없다 · 두 에이전트의 고정 비용은 새 세션에서 잴 것). 워커 하나에 맡길 일이 작으면(파일 한두 개 · 몇십 줄) 나누지 않는다 — 고정 비용이 일보다 크다.
- 읽기만 하는 조사(웹 조사 · 큰 시험장 여럿 비교 · 개발 대화 원문에서 까닭 찾기 · 사진 여러 장 훑기)는 그대로 `Explore` + `model`(CLAUDE.md 를 안 읽는다) — 지시에
  목표 · 볼 경로 · 하지 말 것(`engine/js/data-*.js` · 전사 원문 · 10 MB 넘는 시험장은 통째로 말고 `grep … | cut -c1-200`) · 돌려줄 꼴과 길이를 넣는다.
- 워커는 노트(`docs/notes/`)를 저절로 안 읽는다 — 지시서 '맥락'에 걸리는 규칙 · 같이 고칠 짝 · 노트 대목을 옮겨 적는다. 받은 결과 중 다음 결정에 쓰는 수치 · file:line 은
  메인이 한 번 확인한다. 답할 때 무엇을 어느 모델에 맡겼는지 한 줄로 밝힌다.

## 계통별 노트(`docs/notes/`)

사용자 요청(2026-10-29) — CLAUDE.md 가 요청마다 통째로 읽혀(265 KB) 계통마다의 기록을 노트로 옮겼다. **노트는 저절로 안 읽힌다.**

| 고칠 것 | 먼저 볼 노트 |
|---|---|
| 지형 · 땅 셰이더 · 모래·점토 · 바이옴 · 큰 바위 · 광물 생김새 · 자원 배치 · 상륙 자리 · 동굴 | `docs/notes/terrain.md` |
| 하늘 · 구름 · 날씨 · 해 · 달 · 안개 · 대기 원근 · 시간 배속 | `docs/notes/sky.md` |
| 빛 · 그림자 · 광원 · `envPatch` | `docs/notes/light.md` |
| 물 · 하구 · 물속에서 본 수면 · 거품 | `docs/notes/water.md` |
| 나무 · 식생 · 베리 · 노거수 · 먼 나무 · 바람 | `docs/notes/trees.md` |
| 성능(잰 값 · 한 것 · 뺀 것 · 시작 화면 렉) | `docs/notes/perf.md` |
| 갑옷 · 투구 생김새 | `docs/notes/gear.md` |
| 본편 몬스터 · 뼈대·몸짓 · 무기 · 전투 | `docs/notes/mobs.md` |
| 아이템 · 제작 · 설비 · UI · 조작 · 키 · 캠코더 · 불꽃 · 보급선 · 전기 | `docs/notes/gameplay.md` |
| 시험장(`beta/`) | `docs/notes/arenas.md` |
| 데스크톱 판 · 저장 · 설정 · 베타 빌드 | `docs/notes/desktop.md` |
| 동굴 — 지형 판 10(비탈 속으로 파고드는 굴 · 종류 · 굴 부피 · 시험 주소 `?tv=10`) | `docs/notes/caves.md` |
| 파일 표 · 파일 지도 원문(함수 줄 번호) | `docs/notes/files.md` |

- **고치기 전에 그 노트에서 고칠 이름을 `grep` 해 그 대목을 읽는다** — 노트는 큰 것이 40 KB 다. 통째로 읽지 말 것(작은 것은 통째로 읽어도 된다).
- **고친 것은 그 노트에 적는다** — 무엇을 왜 · 잰 값 · 같이 고칠 짝 · 사용자 요청이면 '(사용자 요청)'. CLAUDE.md 에는 새로 생긴
  '깨뜨리면 안 되는 것' · '같이 고칠 짝'만 아래 '규칙' 에 한 줄로 더한다(예전 규칙 '고친 것은 CLAUDE.md 에 적는다' 를 바꾼 것 — 사용자 요청 2026-10-29).
- CLAUDE.md 안의 '아래 …' 가리킴이 여기 없으면 노트에서 찾을 것(예: '성능 정리 3' → `docs/notes/perf.md`).

## 규칙

- **섬 배율(`P.ws`)** — 섬은 늘 칸 2.5 m(`GCELL`) · 1,920 m 로 만든 뒤 `worldRescale` 이 통째로(가로·세로·높이) ws 배로 키운다.
  새 섬은 6(11,520 m — 예전 기본 2의 넓이 아홉 배) · 설정 '섬 넓이' 로 1~6 · 주소 `?ws=2` 로도(구동 검사가 쓴다). **`CELL` · `WORLD` · `HALF` 는 변수다**(`setWorldScale`) — 불러오는 순간 도는 코드에서
  이 셋으로 다른 상수를 만들어 두지 말 것(함수 안에서 읽는다). 지형 생성·침식·유량은 `GCELL` 로 센다. 배율이 없는 옛 저장은 1 로 읽는다.
  배율 1 의 섬은 자원 배치의 난수 차례가 예전과 같아야 한다(`placeResources` 의 `WS===1` 갈래를 건드리지 말 것).
- **지형 판(`P.tv`)** — 2 는 침식 뒤에 피오르·골짜기·단구·절벽·산릉·탁상지를 새기고(`terrainFeatures`) 동굴(`caveSites` · 32-caves.js)과
  암벽(33-crags.js)을 둔다. **판이 없는 옛 저장은 1 로 읽혀 예전 섬이 한 비트도 안 달라진다**(배율 2·판 1 의 표고·소품이 main 과 같음을
  확인했다). 시드가 만드는 것을 바꾸는 일은 이 판 뒤에 둘 것 — 새 판을 만들면 `newIsland`·`farDrift` 가 주는 값도 올린다(지금 9 — 9 는 굴의 꼴(32-caves.js · 10-worldgen.js — 비탈 아래쪽 벽 바위를 처마 밑까지 · 고드름 꼴 종유석·석순 · 굴 광석 자리 `caveOreSpot`/`caveOreRelax` · 바위 속 빛나는 점·버섯 버리기 · 강이 지나는 굴 자리 버리기) · 8 은 옛 신전 둘(97-temples.js) · 대숲 바이옴(`B.BAMBOO` 13 — 활엽수림의 낮은 데 · 큰 얼룩) · 들판의 바위 솎기(`thinOpenRocks`) · 판판한 현무암 섬 · 4 는 바다 골짜기 `seaTrenches` · 5 는 바이옴 비탈 · 바닷가 · 지열 · 폭포 · 6 은 광석을 굴 속에만(`oreToCaves` — 늪철광만 늪에) · 바깥 광석과 낮은 땅 화강암 일부를 그 자리의 현무암 · 석회암(`karst`) · 사암으로(`surfaceRocks`) · 산허리가 방으로 솟는 굴 자리 버리기(`caveSites` 의 `bulge`) · 7 은 저수지 폭포(36-falls.js) · 땅속 세계(96-underworld.js)).
  새 지형 코드는 제 난수(`mulberry32(seed^상수)`)만 쓴다 — `placeResources` 의 난수 차례를 건드리지 않는다.
- **`updateHUD`(82-hud.js) 안에서 일찍 `return` 하지 말 것** — 조준 표시 갈래에서 돌아가면 그 아래(가방 맞춤 · 도구 표시 · **제작 진행 막대**)가
  통째로 안 돈다. 숫돌을 보는 동안 막대가 멈춰 '안 만들어진다'는 베타 신고가 이것이었다. 갈래는 else-if 로 잇는다.
- **먹을 것의 칸을 새로 만들 때는 나이를 들고 갈 것**(`DECAY.carry` → `stackInto`·`invAdd` 가 `freshMerge` 로 받는다 — 66-decay.js). 그냥 새 칸을
  만들면 옮길 때마다 새것이 된다. **토대 표(FOUNDS)에는 보이지 않는 '맨땅의 바탕'(`ghost` · tier −1 · mesh 없음)이 섞여 있다** — 토대를 도는
  코드는 `f.ghost` 를 걸러야 한다(바닥이 아니고 메시도 없다 — 62-build.js `groundBase`).
- **`propGroup.children` 은 지금 보이는 칸 메시만이다** — 자식마다 `visible` 이 접근자라, 끄면 children 에서 빠지고 켜면 든다(30-props.js).
  전부는 `propGroup._all`(Set) · `propGroup.traverse` 는 숨은 것까지 돈다. 자식을 다 돌아야 하는 코드는 `_all` 을 쓸 것.
  칸 보이기(`updateTileVis`)는 512 m 구역(`TREG`)으로 묶어 사람 둘레 760 m 만 본다 — 새 칸 배열을 만들면 `tileRegions` 가 다시 묶는다.
  칸 메시는 해 그림자 상자 밖이면 드리우지 않는다(`castNear` — 배역이 준 값은 `_cast0`).
- **`engine/three.min.js` 에 한 줄 고친 데가 있다** — `bindingStates.setup` 의 `isInstancedMesh&&(_=!0)` 를, 그 VAO 를 마지막에 쓴 메시·
  인스턴스 속성이 바뀌었을 때만 다시 묶게 했다(`c.io/c.ia/c.ic`). three 를 갈아 끼우면 이 고침도 다시 넣을 것.
- **인스턴스 자료는 쓰는 앞부분만 올린다**(`instUp` — 95-flora.js). 섬 크기만큼 잡은 인스턴스 메시에 `needsUpdate` 만 세우면 통째로 올라간다.
- **FPS 는 재고 고칠 것** — `tools/prof-window.js`(CPU 프로파일 · `CASTAWAY_NOINLINE=1` 이면 함수마다 제 시간) · `bench-window.js`.
  다른 것이 그리는 중(크롬에 띄운 게임 · 시스템 갱신)이면 숫자가 반토막 난다 — 재기 전에 `ps -axo pcpu,comm | sort -rn | head` 로 볼 것.
- **`propGroup` 의 자식은 수만 개다**(6배 섬 7만) — 프레임마다 전부를 훑는 코드를 새로 넣지 말 것(한 번씩 건드리기만 해도 5 ms 다).
  세계 행렬은 새로 붙은 것만 한 번 센다(`propGroup.updateMatrixWorld` — 30-props.js). 굳힌 칸 메시를 뒤늦게 옮기면 `updateMatrix()` 를 부를 것.
- **C 로 짠 침식(`engine/native/erosion.c` → `engine/js/data-native-wasm.js`)은 JS 판과 한 비트도 달라선 안 된다.**
  `thermal` · `hydraulic` · `smoothTerrain` 한쪽을 고치면 다른 쪽도 고치고 `nativeVerify()` 가 전부 same 인지 볼 것
  (`sh env/setup-zig.sh` → `sh engine/native/build.sh` → `node tools/probe.mjs island_world.html "nativeVerify()"`).
- **화면 위에 `mix-blend-mode` 나 움직이는 전체 화면 DOM 겹을 얹지 말 것** — 브라우저가 프레임마다 화면을 따로 합성해 프레임이 크게 떨어진다.
  화면 효과(잡음·주사선·색조)는 캠코더 셰이더(`46-camcorder.js`) 안에서 한다. 창의 잡음 무늬는 움직이지 않는 바탕 그림이다(`--tvn`).
- **세상에 선 것은 전부 무엇인가를 준다**(보급선만 빼고) — 식생은 `FLORA_KIND[].pick` → `FLORA_PICK`, 바다는 `SEA_PICK`, 자갈밭의 잔돌은
  `RUBBLE.picks`, 노거수는 `gbark`·`gresin`. 새로 세우는 것에도 얻을 것을 달 것. 낮은 것(`low`·`hide`)은 똑바로 내려다봐야 잡히고,
  무기·도끼·곡괭이·그물을 들었으면 안 잡힌다(`floraHandOK`) — 좌클릭을 가로채지 않게.
- **r128 은 재질 하나에 셰이더가 하나다** — `InstancedMesh` 와 보통 `Mesh` 가 재질을 나눠 쓰면 안 되고, 재질을 나눠 쓰는 인스턴스 메시는
  전부 인스턴스 색(`setColorAt`)이 있어야 한다(없으면 그릴 때 죽는다 — 노거수 뿌리가 `GIANT.rootMat` 을 따로 쓰는 까닭).
- **조사한 그래픽 엔진·기법과 측정값은 `docs/graphics-engines.md`** — 확인한 것만 적었다. 새 기법을 넣으면 거기 표에 잰 값을 더할 것.
- **지형은 시드 하나에서 결정론적으로 생성된다.** 같은 시드는 언제나 같은 섬이어야 한다.
  지형·자원 배치 경로에서 `Math.random()`을 쓰지 말고 시드 PRNG를 쓸 것.
  저장 파일이 시드 + 변경분만 담아 8.8KB인 것도 이 성질에 기대고 있다 —
  깨뜨리면 기존 세이브가 전부 다른 섬을 연다.
- **프레임률에 의존하는 로직을 만들지 말 것.** 이동 판정이 한 번 이 문제로 깨졌다
  (`높이차/프레임이동거리` → 지형 경사 기반으로 교체, 오판율 0.11% → 0%).
  거리·속도·시간 판정은 프레임당 이동량이 아니라 물리량으로 쓴다.
- **숫돌은 용기가 아니지만 같은 자리에서 좌클릭(예전 E)을 받는다.** `findContainer()` 가 같이
  훑도록 `kind:'grind'` 를 달아 두었을 뿐, `slots` 는 없다 — 용기인 줄 알고
  `contWeight` 를 부르면 터진다. 보는 안내와 `releaseE` 에서 먼저 갈라진다.
  수리 값은 `repairCost(id)` — 처음 레시피의 **한 개분의 절반, 내림**이고
  전부 0 으로 내려가면 첫 재료 하나는 받는다(공짜 수리는 없다).
- **상자·화덕·제련로는 같은 용기다.** 슬롯 배열과 `contAdd`/`contTake`/`contFuel`을
  공유한다. 설비를 추가할 때 넣고 빼는 규칙을 따로 만들지 말 것.
  화덕과 제련로는 여기에 셋을 더 얹는다 — **불**(`lit`/`fuel`, `burnFuel` 공유),
  **안에 든 것이 전부 함께 익는 것**(`f.cook` / `g.jobs` 가 작업마다 진척을 따로 센다),
  **칸 수 제한**(`slotCap` 10 — 넣을 때만 보고, 구워져 나온 것은 넘겨도 남긴다).
- **광물을 더할 때는 `RESOURCES` 표의 맨 끝에 붙일 것.** 배치가 이 차례대로 시드 난수를
  뽑으므로 중간에 끼우면 뒤의 자원이 전부 다른 자리에 서고 **같은 시드가 다른 섬을 연다.**
  방연석을 넣을 때 재 봤다 — 맨 끝에 붙이면 다른 자원의 개수·첫 참나무 자리가 그대로다.
  광물 하나는 여덟 곳을 건드린다: `RESOURCES` · 지질 규칙 `suit` · 보정 점수 · `ROCKY` ·
  `GEOM` · `ROCK_R` · `SHADOW_R` · `MINE`.
- **칸마다 상태가 다른 것은 `indiv(T)` 가 가른다** — `T.tool||T.sips||T.durMax`.
  내구(`durMax`)를 단 물건은 도구가 아니어도 따로 선다. 안 그러면 겹쳐 쌓이면서
  남은 양이 사라진다(축전지가 그랬다).
- **갑옷이 깎는 피해는 `armorMul()` 하나로 모인다** — `1/(1+방어/ARMOR_K)`(`ARMOR_K`=5,
  "피해가 절반이 되는 방어"). 상한이 없고 100% 에 닿지도 않는다. 예전의
  `1-방어/24`(0.72 에서 자름)는 방어 17.3 부터 전부 같은 값이라 강철 한 벌(20)과
  복합 한 벌(18)이 구별되지 않았다. 피해를 줄이는 자리를 또 만들지 말고 이걸 부를 것
  (`hurtPL` 과 `mitigate` 둘 다 여기로 온다).
- 제작 트리는 8단계 순서를 건너뛸 수 없게 되어 있다. 레시피를 추가하면
  재료→산출 의존성 기계 검증에 걸리는지 확인할 것.

### 같이 고칠 짝 · 놓치기 쉬운 것(한 줄씩 — 까닭과 잰 값은 괄호 속 노트)

- 잔 기복(`RELIEF`) 식을 바꾸면 `reliefT`(CPU) · `TPATCH_GLSL`(덧판 정점) · `gndTerrainFrag` 의 법선 셋을 같이. 땅을 새로 그리는 재질은 덧판 원 안 화소를 버리는 것도 같이(`terrDepthMat` · terrain).
- 땅의 빛 — 램버트 조각 셰이더의 `SUN` · `IND` 두 줄이 바뀌면 조용히 옛 방식으로 돌아간다(`PIX` 거짓 · terrain). 둔덕 재질(`moundMat`)의 갈고리는 땅에선 다 0 이다.
- 큰 바위 꼴(`cragShape`)이나 덩이의 돌림·늘림을 바꾸면 메시(`cragMesh`)와 충돌(`cragIndex`·`cragSpan`)이 같은 값을 쓰는지 볼 것 · 비탈에 놓는 것은 묻거나 눕힌다(`groundSlope` · terrain).
- 새 광물은 `PROP_FOOT` 에도 한 줄(겹침 정리 `resolveOverlaps` — 시드 난수를 다 뽑은 뒤 난수 없이 고친다) · 상륙 자리는 시드로 정한다(`LANDING` — `Math.random` 금지 · terrain).
- 광원은 `LIGHT.addPoint`/`addSpot`(켜고 끄는 불은 `addFire`)으로 — `decay` 2 · 세기 1.8배. 광원 수(보이는 것 · 그림자)가 바뀌면 모든 재질을 다시 짠다 → 끌 때는 `visible` 대신 세기 0(light).
- 굴 속 빛·바닥(`CAVE_GLSL` — 32-caves.js)은 envPatch 의 해·하늘빛 두 줄 · 녹아들기 빛깔 · 땅 셰이더(`#ifdef CAVE_ON` 의 `cvF`)가 같이 읽는다 — 그 줄을 바꾸거나 땅을 새로 그리는 셰이더를 만들면 같이 · 굴 불빛은 불빛 풀이 아니라 셰이더(`uCvB.w`)다(terrain).
- 드리우는 것을 `position`/`rotation` 으로 직접 움직이면 `LIGHT.dirtyAt(x,z,r)`(안 부르면 그림자가 1.5초까지 늦다) · 알파 카드(잎·판때기)는 `customDepthMaterial` 을 따로 단다(light).
- `onBeforeCompile` 을 단 재질은 고유한 `customProgramCacheKey`(`envPatch` 가 이어 붙인다) · 램버트 셰이더에서 거리를 `cameraPosition` − 세계 좌표로 재지 말 것(`modelViewMatrix*위치` · light).
- 하늘에 더하는 것은 `skyScene` 에(땅 카메라 far 에서 잘린다 · `scene.background` 는 null) · 다중 산란은 셰이더와 JS 가 같은 식(`MSL`) · `litCore` 안에서 바깥 이름 금지(워커가 `toString()` 으로 가져간다) ·
  `updateSky` 는 물·땅 유니폼이 있을 때만 건드린다 · 본편 하늘·구름을 고쳤으면 `node tools/mk-cloud-arena.mjs`(sky · arenas).
- 물 셰이더 — 실수 텍스처 금지(헤드리스가 0 을 읽는다) · 시각은 `uWT`(`uTime` 은 envPatch 것) · 눈→물 방향은 `vVD` · 파도 수를 바꾸면 `96-foam.js` · 땅 셰이더의 젖은 띠 · `seaSurfAt` 를 같이(water).
- `COPY_DIST` 를 바꾸면 `TRUNK_DIST`(= +12)도 · 가지 꺾임 식은 `barkMat` ↔ `limbBend` · 가지 행렬은 `getLimbM`/`setLimbM` 으로만 · `camera.far` 는 못 줄인다(하늘 돔 · 별 · trees).
- 압축 인스턴스(`instCompact`) 셰이더는 `instanceMatrix` 대신 `INST_MAT`(앞에 `${INST_GUARD}`) · 그 행렬은 `instGetM`/`instSetM` · 그림자용 깊이·거리 재질도 압축으로 단다(perf).
- 땅 위에 새 메시 계통(scene 에 바로 붙는 땅 위의 것)을 만들면 `surfList`(98-surface.js)에 더할 것 — 땅속에 완전히 들어가 있는 동안 그 목록만 가린다 · 빛을 품은 것은 넣지 않는다(perf).
- 동결한 것(`freezeStatics`)을 옮기면 `updateMatrix()` · 칸 메시를 새로 만들거나 처음보다 크게·멀리 옮기면 `boundTiles()` · 칸·청크를 새로 지으면 `_tvForce`/`_tlK`(perf).
- HUD 글·스타일은 `hudT`/`hudH`/`hudS` 로(바뀔 때만 DOM — HUD 밖에서 HUD 요소의 스타일을 바꿀 때도 `hudS` · perf).
- 짓는 동안 그리는 프레임에 무거운 것을 켜 두지 말 것(`LIGHT.live` · `propGroup` 숨김) · 자주 쓰는 새 효과 재질은 `precompPlan` 견본에 · `TITLE` 에 새 칸을 달 때 이름 겹침 금지(perf).
- 바위 칸 · 나무 칸의 가지는 가까울 때만 빚는다 — `t.m` · `p._batch` · `p._lb` 가 null 일 수 있다 · 프레임을 잴 때는 `QUAL.on=false`(perf).
- 새 키는 `KB_ACTS` 에 한 줄 · `kbHit`/`keys.행동` 으로 읽는다(`e.code==='KeyX'` 금지) · **한 글쇠는 한 행동만**(사용자 요청 — 범위가 달라도 같은 기본 키 금지 · `kbSet`/`kbLoad` 가 겹친 칸을 비운다) · 조작을 바꾸면 `CONTROLS_GUIDE` ↔ `KB_OV` · 일시정지 글쇠 줄은 `<div><span>글쇠</span><em>설명</em></div>` 꼴(gameplay).
- 새 제작법은 `tier` 가 `TIER_ORDER` 에 있어야 나무에 선다 · 손에 든 것의 `ITEMS[id].tool` 은 없을 수 있다(`(…tool||{})` · gameplay).
- 배 모양을 바꾸면 `shipBoxes` 치수도 · 불티 크기는 세계 길이로 · 폭발 불빛은 `BLAST_LIGHT` 하나를 계속 쓴다 · 화면 효과는 캠코더 셰이더 안에서(창 전체 `filter:drop-shadow` 금지 · gameplay).
- 셰이더 글 — 음수를 그대로 끼우지 말 것(`y-${-0.02}` → 괄호로) · GLSL 예약어 `patch` 를 변수로 쓰지 말 것 · 템플릿 글(백틱) 셰이더의 주석에 백틱 금지.
- 몹을 본편에 들일 때 — 몸은 `scene` 에 숨겨 두고 돌려 쓴다 · `lightRole:'recv'` · 전역 이름 겹침은 '확인하는 법' 의 이어 붙이기 검사로 · 움직이면 `LIGHT.dirtyAt` · `q.slerpQuaternions(q0,q,w)` 에 자기를 넣지 말 것(r128 · mobs).
- 애쉬스케일 `wClimb` 은 `wyv-sync` 가 안 옮긴다(wyvern · battle · night · siege 넷) · 본편 스킨워커 값은 아레나 `MP`/`SPD` 그대로(`MIM_P`/`MIM_SPD` — 아레나를 고치면 같이 · mobs).
- battle ↔ night ↔ azure_night 는 글자 그대로 · 다지류 모듈과 총 꾸러미는 crawler ↔ battle 글자 그대로(arenas).

## 함정

- **`flatShading: true`는 `MeshLambertMaterial`에서 무시된다.** r128에서 확인해 14곳을 걷어냈다.
  각진 면이 필요하면 정점을 분리해야지 이 플래그로는 안 된다.
- **레포 기록이 이미 ~390MB다**(`.git` — 시험장 html 들 · 사용자가 올린 Meshy zip 85MB · 모델 GLB). Git LFS를 쓰지 않는다. 한 번 올린 파일은 지워도 기록에 남는다.
  모델을 더 커밋하기 전에 LFS 전환을 먼저 결정할 것 — 나중에 옮기려면 히스토리를 다시 써야 한다.
- `.gitattributes`가 `* text=auto eol=lf`이므로 `*.glb binary`를 반드시 유지할 것.
