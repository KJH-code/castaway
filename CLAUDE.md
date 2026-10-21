# CASTAWAY

무인도 생존 게임. **단일 HTML 파일 · Three.js r128 · 빌드 과정 없음.**

**처음 맡았으면 `docs/HANDOVER.md` 부터** — 2026-10-15 인수인계(사용자와 정한 규칙 요약 · 점검 결과 · **FPS · 비주얼 · UI 할 거리와 잰 값** · 몹은 사용자가 직접 만든다).

## 스택

- Three.js r128을 레포 안의 `engine/three.min.js`(603KB)에서 `<script src>`로 로드.
  게임에는 번들러·패키지 매니저·`node_modules` 없음. **바깥으로 나가지 않으므로 오프라인에서도 뜬다**
- **데스크톱 판은 `desktop/`**(Electron 44 · electron-builder 26) — 게임을 감싸는 껍데기일 뿐이고 npm 은 이 폴더 안에만 있다(아래 '데스크톱 판')
- 본편은 `island_world.html`(뼈대) + `presets/presets.js` + `engine/css/game.css` + `engine/js/*.js` 56개(코드 47 + base64 자료 9 — 몬스터 모델 다섯 포함)로 나뉘어 있다(보통 스크립트 · 차례대로 불러옴 — 아래 '파일 지도') · 아이템 367종 · 레시피 280개(제작법 242 + 설비 공정 38 — 2026-10-19 잼)
- 라이선스 GPL-3.0

## 폴더

| 폴더 | 무엇 |
|---|---|
| `island_world.html` | 게임을 여는 파일(뼈대) — 이것만 맨 위에 둔다 |
| `engine/` | **게임 엔진** — `three.min.js`(Three.js r128) · `css/game.css` · `js/*.js`(본편 코드 47개 + base64 자료 9개) · `native/`(C 로 짠 계산 토막과 그 빌드 결과) |
| `presets/` | **프리셋** — 코드가 아닌 값·자료 묶음: `presets.js`(그래픽·섬 프리셋 — 설정 창이 고른다) · `models/`(몹 모델 .glb) |
| `beta/` | **베타 시험장** — `*_arena.html`(전투·구름·농성 시험장) · `build_sandbox.html` · `_v.html`. 본편과 따로 뜨는 한 파일짜리들이다 |
| `env/` | **가상 환경** — 빌드에만 쓰는 도구(C 컴파일러 · 파이썬 가상 환경)를 받는 스크립트. 받아 온 것 자체는 레포에 안 담는다(`env/README.md`) |
| `desktop/` | 데스크톱 판(Electron 껍데기) |
| `tools/` | 검사·묶기 도구(`check-syntax` · `smoke` · `probe` · `build_single.py` · `serve.py`) · `garg-rig.mjs`(가고일 뼈 가중치를 세고 공용 구역을 다섯 시험장에 옮긴다) · `wyv-sync.mjs`(애쉬스케일 자세 구역을 battle·night·siege 와 본편 `97-wyvern.js` 에 옮긴다) · `bear-rig.mjs`(아르크토스 뼈 가중치를 세고 공용 구역을 다섯 시험장과 본편 `97-mob-rigs.js` 에 옮긴다) · `bench-window.js`(**보이는 창에서 FPS 재기** — `desktop/node_modules/.bin/electron tools/bench-window.js`) · `tri-census.js`(**무엇이 프레임을 먹는지** — 상륙 자리 네 방위의 삼각형을 계통별로 · 그림자 몫까지 — `node tools/probe.mjs island_world.html --run tools/tri-census.js`) · `make-font.py`(디지털 글꼴 `engine/css/font.css` 를 다시 짓는다) · `azure/`(Meshy 몹 모델 애저 아포칼립스를 받침 떼고 · 20만 세모로 줄이고 · 다시 칠하고 · 뼈 심어 GLB 로 — `sh tools/azure/run.sh` · 자세한 것은 `tools/azure/README.md`) |
| `docs/` | 설계 문서 · 개발 대화 원문 · 그래픽 엔진 조사 |

## 실행

빌드 없음. 파일을 열면 끝이다.

```
island_world.html
```

### 데스크톱 판(`desktop/`)

브라우저를 벗어나 제 창으로 뜨는 게임. **게임 본체는 베끼지 않는다** — 개발 중엔 `../island_world.html` 을,
묶은 판은 `extraResources` 로 `resources/game/` 에 넣어 둔 것을 연다(`island_world.html` · `engine/` 의 `three.min.js`·`css/`·`js/` · `presets/` 의 `*.js` — **본편이 읽는 파일 묶음을 새로 만들면 `desktop/package.json` 의 `filter` 에도 더할 것**. 모델(`presets/models/`)과 `engine/native/` 의 C 원본은 안 넣는다)(`main.js` 의 `GAME`). 그래서 게임을 고치면
데스크톱 판은 다시 묶기만 하면 된다.

```bash
cd desktop && npm ci && npm start          # 개발 — 창으로 띄우기(F12 개발자 도구)
npx electron-builder --linux               # 묶기 — dist/ (--win · --mac 은 그 OS 러너에서)
```

- **빌드는 GitHub Actions `데스크톱 판`**(`.github/workflows/desktop.yml`) — `island_world.html`·`engine/three.min.js`·`engine/css/**`·`engine/js/**`·`desktop/**` 가
  바뀐 푸시마다 Windows(NSIS 설치판 + 포터블 .exe) · macOS(universal .dmg) · Linux(.AppImage)를 묶어 Artifacts 에 30일 둔다.
  `v*` 태그를 밀면 Releases 에도 붙인다. 레포가 공개라 러너 시간은 공짜다. **서명은 없다**(Windows SmartScreen · macOS Gatekeeper 경고).
- **`main.js` 가 더하는 것**: 전체 화면으로 시작(F11 · Alt+Enter — 상태는 `userData/window.json` 에 기억) · 메뉴 줄 없음(그래서
  Ctrl+R 새로 고침 같은 브라우저 단축키가 없다 — **F5 는 게임의 저장**이다) · 바깥 주소는 기본 브라우저로 · 한 번만 켜짐 ·
  GPU 차단 목록 무시(`ignore-gpu-blocklist`) · 외장 GPU 우선 · 창이 가려져도 안 멈춤(`backgroundThrottling:false` — 대신 게임이 멈춤·내림 때 스스로 아낀다) ·
  창 제목은 늘 'CASTAWAY'(`page-title-updated` 막음).
  **창 닫기 보호** — X · Alt+F4 · Cmd+Q · 게임의 '끝내기' 모두 `close` 를 한 번 막고 게임에 `app:beforeClose` 를 보낸다. 게임이 자동 저장한 뒤
  `app:closeReady` 로 답하면 닫는다(3초 안에 답이 없으면 그냥 닫는다 — 섬을 만드는 중이면 저장할 것도 없다).
  **화면 프로세스가 죽으면**(`render-process-gone`) '다시 켜기/끝내기' 를 묻고 다시 불러온다 — 시작 화면이 마지막 자동 저장을 불러오겠냐고 묻는다.
  **기록** — `userData/logs/castaway.log`(1 MB 넘으면 `.old.log`): 시작 판·GPU 상태 · 게임 화면의 경고·오류(`console-message` — Electron 35 부터 인자가 이벤트 하나다) ·
  죽음·응답 없음 · 저장 실패. **권한은 포인터 잠금·전체 화면만**(`setPermissionRequestHandler`/`CheckHandler`) · webview 막음.
  **새 판 알림** — 묶은 판만, 켜고 8초 뒤 GitHub `releases/latest` 를 보고 지금보다 높으면 시작 화면에 '받기' 고리(`#ovUpd`). 오프라인이면 조용히 넘어간다.
  서명이 없어 자동 설치는 안 한다(macOS 는 서명 없이 자동 갱신이 안 된다). 개발판에서 시험하려면 `CASTAWAY_UPDATE=1`.
  NSIS: 바탕 화면·시작 메뉴 바로가기 · 설치 끝나면 실행 · **지워도 저장(userData)은 남긴다**.
- **게임이 아는 것은 `window.DESKTOP` 하나다**(`preload.js` — `saveHas/saveRead/saveWrite/info/openSaves/fullscreen/quit/gpu/setGpu/onBeforeClose/closeReady/onVisible/onUpdate`, 저장은 동기 IPC).
  `gpu()`/`setGpu(v)` 는 그래픽 백엔드(ANGLE) 고르기 — `userData/gpu.json` 에 적고 **다음에 켤 때** `use-angle` 로 넘긴다(Windows d3d11·d3d9·gl·vulkan · macOS metal·gl · Linux gl·vulkan).
  본편(`engine/js/92-save.js`)의 `DESK` 가 있으면 **저장 칸이 파일**(`userData/saves/slot1~3.json` · `auto.json` · Windows `%APPDATA%\CASTAWAY\saves` —
  임시 파일에 쓰고 바꿔 끼우며 바로 앞 것은 `.bak`), 없으면 `localStorage`(`castaway.save1~3` · `castaway.auto` — 슬롯 1 은 예전 키 그대로). 슬롯 이름은 `[a-z0-9._-]` 만 받는다.
  데스크톱 판에서만 보이는 것: 일시정지 화면의 **끝내기**(`#bQuit` — 상륙 전이면 바로, 상륙했으면 묻고 닫기 길(자동 저장)을 탄다) · 설정 창의 '전체 화면'·'저장·기록 폴더'(`#deskG` — userData 를 연다)·그래픽 백엔드 고르기(`#pAngle`) ·
  시작 화면 오른쪽 아래 판 번호(`#ovVer`). **판 번호는 `desktop/package.json` 의 `version`**(지금 0.5.0 — `package-lock.json` 맨 위 두 곳도 같이) — 묶은 파일 이름에 들어가고 새 판 알림이 이것과 Releases 태그를 견준다.
- **시험**: playwright 의 `_electron.launch` 로 xvfb 에서 띄운다(`xvfb-run -a node 시험.cjs`). 소프트웨어 GL 이라 섬 생성이 약 2분이고,
  `page.screenshot` 은 시간 초과가 난다 — 주 프로세스의 `webContents.capturePage()` 로 찍을 것.
- 루트 `.gitignore` 가 `package.json` 을 무시한다(CI 가 맨 위에 playwright 를 깐다) — `desktop/` 것만 `!` 로 살려 두었다.
- **Electron 36 쯤부터 `npm install` 이 바이너리를 바로 받지 않는다** — `node_modules/electron/dist` 가 없으면 `node node_modules/electron/install.js`.
  묶기(electron-builder)는 제 캐시로 따로 받으므로 CI 는 상관없다. 엔진 조건 node ≥ 22.12.

### 저장 · 설정 · 멈춤(브라우저 판과 데스크톱 판 공통)

- **저장 칸 넷** — 슬롯 1~3(사람이 고름 · 설정 창 `#pSlot` · F5 저장 · F9 불러오기) + **자동 저장**(`auto` · 불러오기만 — 고르면 '저장' 단추가 꺼진다).
  `slotHas/slotGet/slotPut(칸, 글)` · 이름표는 `slotLabel` — '슬롯 1 — 3일째 · 10/10 14:22'(저장의 `at` 은 UTC 라 Z 를 붙여 읽는다 · 칸마다 `SLOT_META` 에 기억, 쓰면 지운다).
  **자동 저장(`autoSave(why)`)** — 상륙해서 노는 동안 5분마다(`AUTO_EVERY` 300 · 멈춘 동안은 안 셈 · `autoT`) · 새 섬을 만들기 전 · 그래픽이 끊겼을 때 · 데스크톱 판 창 닫기.
  상륙 전(`landed` — `generateWorld` 가 false 로 되돌린다) · 섬을 만드는 중(`busy`) · 죽은 채로는 안 한다.
  **시작할 때 가장 최근 저장**(네 칸 중 `at` 이 가장 늦은 것 · 자동 저장 포함)을 불러오겠냐고 묻는다(`offerLoadOnStart`).
- **새 섬은 묻고 나서**(`newIsland(go,cancel)`) — R · '새 섬' · '시드 무작위' · '자원 보장' 모두. 상륙했으면 '새 섬을 만들겠습니까?' 뒤 자동 저장에 남기고 만든다.
  **예전엔 R 한 번에 하던 섬이 저장도 없이 사라졌다.** 묻는 상자 `ask(제목, 설명, 예, 아니오)` 는 이제 '아니오' 갈래도 받는다.
- **설정은 다음에 켤 때도 그대로**(`SET` · `castaway.settings` — 해상도·시야·그림자·가지 밀도·음량·마우스 감도·고른 칸). `applySettings()` 를
  `initThree()` 와 `generateWorld()` 사이에서 부른다 — 가지 밀도(`P.limb`)는 섬을 만들 때 쓰이므로 먼저 맞춰야 한다. 슬라이더에 값을 넣고 `input` 을
  쏴서 원래 처리기를 그대로 탄다. 적는 것은 손으로 바꾼 `change` 때뿐이다. **섬 모양(시드·크기…)은 설정이 아니라 저장 파일이 가진다.**
  음량 `VOL`(마스터 이득) · 마우스 감도 `SENS`(시점 회전에 곱함).
- **설정 창은 시작·일시정지 화면 위에도 뜬다**(`#cfg` z-index 12 · `#ov` 10 · 묻는 상자 60) — 화면의 '설정' 단추(`#bOpt`) · Tab · 창의 '닫기'(`toggleCfg`).
- **멈춤 중엔 아낀다** — 일시정지·시작 화면이면 초당 10번만 그리고(덮개가 94% 가린다), 창을 내리면(`document.hidden`) 아예 안 그린다(`loop` 맨 앞).
  소리도 일시정지·창 내림 때 멈추고(`audioPause` — `AudioContext.suspend`) 계속하면 다시 낸다.
  **데스크톱 판은 `document.hidden` 이 늘 false 다** — `backgroundThrottling:false` 가 Page Visibility 까지 끈다(Electron 문서). 그래서 주 프로세스가
  `minimize`/`restore`(·`hide`/`show`) 때 `app:visible` 을 보내고 게임이 `winHidden` 으로 받는다(`DESK.onVisible`). 내린 동안은 게임 시간도 멈춘다.
- **그래픽이 끊기면**(`webglcontextlost` — 드라이버 재시작·GPU 메모리) 자동 저장해 두고 다시 불러오기를 묻는다.

`.glb` 모델을 로드하는 코드를 넣는 순간부터는 `file://`에서 CORS로 막히므로 정적 서버가 필요하다:

```bash
python -m http.server 5173
```

## 파일

| 파일 | 내용 |
|---|---|
| `island_world.html` · `engine/css/` · `engine/js/` | 메인 게임(나뉜 판 — 아래 '파일 지도' · `CODEMAP.md`) |
| `CODEMAP.md` | 나뉜 본편의 파일별 설명(영어) · 고칠 때 지킬 것 |
| `tools/build_single.py` · `tools/serve.py` | 한 파일로 묶기 · 캐시 끈 로컬 서버 |
| `engine/three.min.js` | Three.js r128 (npm three@0.128.0 의 build). **cdnjs 대신 이걸 쓴다** |
| `beta/gargoyle_arena.html` | 가고일 전투 시험장. 모델이 파일에 내장되어 5MB. **가고일은 뼈 몸이다**(아래 '가고일 뼈대 · 몸짓') |
| `beta/wyvern_arena.html` | **애쉬스케일 시험장**(4.1MB). 상공 20 m 선회 → 5초 노려봄 →
  내리꽂기 → 3초 굳음 → 걸어서 추격 · 화염구(2초 젖힘 · 겨눈 방향 고정) ·
  팔과 물기는 뼈를 실제로 돌려 맞춘다(`solveClaw`/`solveBite` — 칠 때마다
  닿는 각을 풀고, 닿지 않을 자리면 안 휘두른다) · 집과 사람을 같은 표적으로 다룬다(`curTgt` — 집이 26 m 안이면 그쪽이 먼저) ·
  죽을 때 5초 부풀다 폭발, 사람과 집이 같이 다치고 2초 뒤 판이 닫힌다. 체력 700 ·
  날개폭 11 m. 무기 14자루(강철 포함)를 번호+Enter 로 바꿔 든다. **자세는 아래 '애쉬스케일 자세'** — battle·night·siege 에 글자 그대로 들어 있다.
  모델은 파일에 내장(와이번 5만 · 화염구 1만 삼각형) |
| `beta/siege_arena.html` | **농성 시험장**(11MB). 한가운데 5×5칸·두 층 나무집에서 시작한다.
  집은 **본편의 짓기 코드를 그대로 옮겨 세운다**(`placeFound`/`placeWall`/`placeFit`/
  `placeRoof` · 토대25·벽40·지붕25 · 장마다 내구 300 · 문짝은 95°로 열리고
  닫으면 `addWallCols` 가 기둥을 도로 깐다). 밖에 아르크토스3·가고일1·와이번1. **문 닫고 집 안이면
  `hidden()` 이 참이라 모든 몹이 사람을 못 알아본다** — 곰·가고일의 거리 계산과
  `seesPlayer()` 가 이걸 먼저 본다. 집을 부수는 것은 와이번뿐이고, 사람이 안 보여도
  집을 보고 내려온다. 벽 한 장이 뚫리면(`breached()`) 그 순간 전부 보인다.
  **벽 판정은 판이다**(`COLLIDERS` 가 {x,z,w,d,y0,y1} 판을 담는다 — 벽 한 장이 판 한 장,
  문틀은 좌·우·상인방 셋에 닫힌 문짝이 구멍을 메우는 판 하나). 부서지면 그 판이 빠진다.
  `pushOutOfSolids` 로 사람·곰·가고일을 다 막고, 짐승은 벽에 달려드는
  대신 `wayIn()` 으로 뚫린 데를 찾아 집을 두르고 돈다(모서리 → 구멍 정면 → 안쪽 순).
  몸이 들어가는 놈만 문을 쓴다(문 2.4 m · 곰 2.0 m). **건축물은 본편의 2배**(`BSCALE`) |
| `beta/battle_arena.html` | **편싸움 시험장**(18MB). 평지에 두 편을 마주 세우고 붙인다.
  시작 화면에서 **1팀·2팀의 아르크토스(0~8)·가고일(0~8)·와이번(0~1) 마릿수**를 고르고
  사람의 편도 고른다(중립이면 구경만 한다). 곰·가고일은 `MAXB`/`MAXG` 만큼 미리
  만들어 두고 `deploy()` 가 쓸 만큼만 깨운다 — 시작할 때마다 모델을 새로 만들면
  GPU 자원이 쌓인다. 두 줄을 32 m 떼어 세우고 시야를 140 m 로 넓혀 붙게 한다.
  **와이번은 개체마다 뼈 나무를 복제해 여럿이 선다**(`WYVS` · `useWyv(w)` 가
  W·bRig·bMesh·bMat·BONE·SKROOT·shadowM 을 그 개체 것으로 갈아 끼우고 `eachWyv()` 가
  차례로 돌린다. 지오메트리·역묶음 행렬·뼈 굵기는 나눠 쓴다).
  **스킨워커도 같은 방식으로 여럿이 선다**(`MIMS` · `useMimic(m)` — MB·HANDS·SPS·
  MLIMBS·mRig·mMesh·mMat·MBONE·MSKROOT·mShadow 를 갈아 끼운다).
  두 모델이 `Bone_000` 처럼 같은 뼈 이름을 써서 스킨워커 쪽은 전부 갈라 두었다 —
  `MBR`·`mREST`/`mRPOS`·`mBindLimbs`·`mFitRadii`·`mCapsFrom`·`mRotBone`·`mCcd`·
  `MBODYCH`·`MLIMBS`. **`MLIMBS` 는 개체마다 복제한다** — 하나를 나눠 쓰면 뒤에 선
  놈이 앞 놈의 뼈를 끌고 다닌다. **`poseMimic` 이 쉼 자세로 되돌릴 때도
  `mREST`/`mRPOS` 표를 통째로 돌지 말고 `MSKROOT` 만 훑어야 한다** — 표에는 온 개체의
  뼈가 다 들어 있어서, 둘째를 포즈하는 순간 첫째가 방금 잡은 자세까지 밀린다(첫 마리가 굳어 보인다).
  스킨워커·새끼 거미 모델은 **바탕색 그림만 남기고 줄였다** — 법선·금속 지도를
  떼고 바탕색을 1024 로 줄여 10.2 → 4.6MB · 6.0 → 0.8MB(파일 32 → 18MB).
  이 게임은 `MeshLambertMaterial.map` 만 쓰므로 나머지 지도는 파일만 키운다.
  **표적은 몸통만이 아니다**(`foeParts` — 스킨워커의 앞다리와 새끼도 후보다.
  앞다리가 몸통보다 앞에 뻗어 있어 "가장 가까운 것"이 대개 앞다리가 된다.
  `allMobs` 에는 안 넣는다 — 저건 승패와 밀어내기를 세는 명단이다).
  **맞은 놈으로 문맥을 갈아 끼우는 `hitFoe`·`hurtMob` 은 보던 개체를 도로 돌려놓는다** —
  안 돌려놓으면 거미가 남의 앞다리를 문 순간 제 `updateM` 나머지가 맞은 놈 몸으로 돌아간다.
  스킨워커의 손은 **사람이든 짐승이든 같은 판정으로 붙잡는다**(어깨에서 표적까지
  평면 거리 ≤ 10 m 를 뻗기가 끝나는 한 순간에만 잰다 — 캡슐이 아니라 점 하나다).
  붙잡혀도 아프지 않고 **휘두를 수 있다**(예전 안내가 '공격할 수 없다'고 했지만 실제로
  막은 적은 없다). **두 손이 같은 것을 잡으면 3초 뒤 삼킨다** — 사람도 짐승도 같다.
  **다지류도 선다**(`CRAWLS` · `MAXC` 2 · 1·2팀 각 0~2 · `updateCrawlers`) — 남들이 노릴 때는 머리가 아니라 **가장 가까운 마디**(`crwNearPt`)를, 다지류는 가장 가까운 적을 쫓는다. 마디 구에 닿은 적마다 0.5초마다 40(사람은 갑옷이 깎는다). `separateMobs` 에서는 빠지고 제 마디 구로 밀어낸다. 집 벽은 모른다. 몸길이 62 m 라 옆으로 눕혀 세운다.
  **몸끼리 겹치지 않는다**(`separateMobs` — 반반씩 밀어내고, 높이가 3.5 m 넘게
  차이 나면 안 부딪힌다. 곰 1.35 · 가고일 0.8 · 거미 2.2 · 와이번 2.6 m) |
| `beta/night_arena.html` | **밤 시험장**(23MB) — `beta/battle_arena.html` 을 복사해 세 가지만 바꿨다: ① **언덕 지형**(`h()` = 큰 물결 + 가우스 봉우리 다섯 `HILLS` + 가운데 분지, 최고 약 7~12 m · 격자 선 없앰) ② **밤**(짙은 남색 하늘·안개 0.011 · 달빛 평행광 · 달 원판 · 별 900) ③ **편성 고정**(`readLineup` 이 애쉬스케일 2 · 스킨워커 1 · 다지류 1 을 모두 1팀, 사람을 2팀으로 — 몹끼리는 안 싸운다 · 시작 화면에는 무기·방어구·짐만). 나머지(총 꾸러미·다지류 모듈 포함)는 battle 과 글자 그대로라 **battle 을 고치면 여기도 고칠 것** |
| `beta/cloud_arena.html` | **구름 시험장**(60KB · 모델이 없어 **1.5초에 뜬다**).
  본편의 하늘·달·구름·날씨·비 코드(`engine/js/45-sky.js`)를 **그대로**
  옮겨 놓고 손잡이 다섯만 냈다 — `COVER`(구름양) · `MANUAL`(갈래마다 못수) ·
  `MIST`(안개) · `FADE`(여닫는 시간, 본편 25초) · `OPMUL`(짙기 배율).
  전부 `// 시험장:` 으로 표시해 두었고 **나머지는 본편과 한 글자도 다르지 않다.**
  갈래 아홉을 하나씩 소환하고 없앨 수 있고, `F` 로 눈앞 600 m 에 세워 뜯어본다.
  시각·배속·구름양·안개·짙기·여닫는 초·바람을 슬라이더로 잡는다.
  **여기서는 사진이 찍힌다** — 본편은 지형 생성에 5분이 걸려 헤드리스 사진이
  늘 타임아웃 났다. 구름·하늘을 만졌으면 **눈으로 확인할 길은 이것뿐이다**:
  `node tools/probe.mjs beta/cloud_arena.html --run 스크립트.js --shot 사진.png`
  **사진을 찍을 때는 `PAUSE=true` 를 먼저 켤 것**(조작판의 '멈춤' · `P`).
  안 켜면 시험장의 제 루프가 계속 돌아, 제 반경 `R`×1.25 밖에 갖다 놓은
  구름을 곧바로 되굴려 치워 버린다 — 사진에 구름이 안 나온다.
  **본편 구름 코드를 고쳤으면 `node tools/mk-cloud-arena.mjs` 를 돌려 다시 만들 것.** 생성기는 `island_world.html` 이 불러오는
  `engine/js/*.js` 를 차례대로 이어 붙여 표지를 찾는다. 본편의 캠코더(`camcBegin`/`camcEnd`)는 틀(`cloud-arena.tpl`)에 빈 함수로 두었다.
  본편에서 하늘 구역을 **표지로 찾아** 통째로 베끼고 손잡이만 낸다(줄 번호로
  잡았다가 본편에 스무 줄 끼운 뒤 잘린 파일이 나왔다). 껍데기는
  `tools/cloud-arena.tpl` 이다 |
| `beta/crawler_arena.html` | **다지류 시험장**(4.8MB). 몸마디 67 · 다리 146 · 몸길이 약 62 m · 체력 1500. **다지류 코드는 모듈이다**(`CRW` · `crwBuild`(지오메트리·재질 한 번) · `makeCrawler(scene,hp)`(뼈는 마리마다 — 조인트 명세 `CRW.jspec` 를 {원본|복제 벌, 노드, 역묶음 행렬} 로 적어 두고 개체마다 뼈를 세워 끼운다) · `placeCrawler(cr,…)` · `stepCrawler(cr,dt,표적,opt)` · `crwNearest`) — `beta/battle_arena.html` 에 **글자 그대로** 들어가 있으니 고치면 둘 다 고칠 것. 모델 이름은 `CRW_META`/`CRW_B64`. **무기는 번호+Enter · 방어구는 F 나 시작 화면**(ARMORS 는 trio 와 같은 표 · `armorMul`). 몸 닿기(40)도 폭발도 갑옷이 깎는다(`armorMul` — 강철 한 벌 7.7 · 철 비늘 10.5 · 맨몸 40). **크기 1.5배(`SIZE` — 정점·뼈 자리·역묶음 행렬의 이동 칸에 곱한다) · 몸마디는 불러올 때 복제해 늘린다**(`CL_A`~`CL_B` — 척추 3~11 아홉 마디의 정점·삼각형·척추·다리 뼈를 `CL_K`(6) 벌 복제해 11 뒤에 줄줄이 끼운다. 조인트는 (뼈, 역묶음 행렬) 짝이라 복제 뼈가 원본 행렬을 그대로 쓰고, 끊긴 자리(11 이하|12 이상 마디를 걸친 삼각형 — 꼬리 쪽 정점이 11 과 섞인 것도 있다)는 버리고 복제 쪽이 잇는다. 고친 뒤엔 뼈를 돌린 세계 좌표로 삼각형 변 길이를 재 볼 것 — 최대 0.38 m 여야 한다). Meshy 모델에 다리 관절을
  새로 넣었다(다리마다 `Leg_[LR]NN_Hip/Knee/Ankle/Toe` — 뒤에서 앞으로 01~12 · 맨 뒤 한 쌍은 원래 뼈 `Bone_016~023`).
  모델은 바탕색 그림만 1024 JPEG 로 줄여 넣었다(`MODEL_META`/`MODEL_B64` — 위치·법선·uv·뼈 번호·가중치·역묶음 행렬).
  **머리가 앞장서고 뒤 마디는 머리가 지나간 길(`TRAIL`)을 따라간다** — 마디마다 쉼 자세의 머리로부터 길이 `s`
  만큼 뒤의 길 위 점에 서고 앞 마디 쪽을 본다. 머리는 늘 사람 쪽으로 틀되 **선회 55°/초(2초마다 ±20° 안에서 새로 뽑고 0.5초에 걸쳐 부드럽게 옮김 — 35~75°/초 · `cr.turnJ`)** · 속도 달리기×1.0(7.4 m/s). **돌진**: 쫓는 동안 평균 20초에 한 번(`P.dashEvery` · 매 프레임 dt/20 확률) 1초 멈춤 → 0.5초 사람 쪽으로 틀어 겨눔 → 가고일 돌진의 1.2배(RUN×1.1×1.8×1.2 = 17.6 m/s)로 50 m(`P.dashLen`) — 돌진 중에도 초당 15° 까지 튼다. 벽에 닿으면 끊는다(`C.state` halt·aim·dash·chase). 머리 두 뼈는 목(`Bone_012`)을 축으로 사람을 본다(±70° · 위아래 ±0.5 rad).
  걸음은 쌍마다 위상 0.9 씩 밀린 물결(간 거리로 민다). **닿으면 0.5초마다 40**(갑옷이 깎는다) — 마디 구 68개(반지름 1.1)에
  들어오면 밀어낸다. 맞히기도 같은 구다. 뼈 세계 자세를 부모 기준으로 되돌려 넣으므로 **머리→꼬리 차례로** 돌린다 |
| (총 꾸러미) | **본편의 새 총·활·수류탄을 시험장에 옮긴 공용 코드**(`GUNS_NEW` · `GK` · `gkShoot`/`gkThrow`/`gkUpdate`/`gkSwitch`) — crawler·battle 두 곳에 **글자 그대로** 들어가 있다. 산탄총(알마다 선 · `pellets`/`spread`) · 반자동 · 기관단총(`auto` — 누르고 있으면 연사) · 대물 저격총(`scope` — **시험장은 우클릭**이 조준경, 본편은 좌클릭) · 바주카(로켓 초속 70 · 중력 1.5 · 반경 6 m 폭발) · 수류탄(16 m/s 포물선 · 3.5초 · 7 m) · 활 둘. 값은 본편 `ITEMS[].tool` 그대로. **탄창은 무기마다 따로 남는다**(`GK.mags`). 폭발은 (1−d/r)² 로 짐승·사람 모두(사람은 갑옷만 깎는다 — 본편 `explode` 와 같다). 시험장마다 갈고리 넷: `gkRay`·`gkBlast`·`gkHurtSelf`(·`gkNear` 는 안 쓴다). 총 생김새는 본편 `WEAPON_FX` 를 옮겼고 총구 불은 원뿔(`muzzleFlash` 대역)이다 |
| `beta/bear_arena.html` · `beta/mixed_arena.html` | 곰 시험장. **캡슐 판정이 없다** — 총은
  `bearSpheres()` 가 뼈마다 늘어놓은 공(뼈 17 × 머리·가운데·꼬리 = 51)으로 맞히고, 근접은 여전히 평면 거리다.
  **곰은 뼈 몸이다**(아래 '아르크토스 뼈대 · 몸짓' — 이 파일이 정본) |
| `beta/trio_arena.html` | **셋 시험장** — 스킨워커1 · 아르크토스1 · 가고일2. mimic_arena 에
  mixed_arena 의 곰·가고일을 옮겨 붙인 것(27MB). 이름 충돌은 BEAR_R·BSNAME·bSet·
  bWanderTarget·bearMesh·bearMat 로 피했다. 곰은 `bearCaps()` — 뼈 17 개의
  머리→꼬리 캡슐이다(이번 자세 그대로 · 공용 구역 `bearHitCaps`) |
| `docs/CASTAWAY_개발요약.md` | **설계 문서. 작업 전에 먼저 읽을 것** — 지형·제작 트리·설비·몹·저장 |
| `docs/CASTAWAY_전사_초반부.md`, `docs/CASTAWAY_전사_2차.md` | 개발 대화 원문 |
| `presets/models/bear_high.glb`, `presets/models/stormscale_wyrm.glb` | 몹 모델. **아직 어느 코드에서도 로드하지 않는다** |
| `presets/models/azure_apocalypse.glb` | **애저 아포칼립스**(새 몹 · 11.3 MB · 사용자 요청 '받침 없애고 · 참고 그림처럼 돌 갑옷 + 푸른 에너지로 칠하고 · 삼각형 20만 · 리깅, 떠서 움직이니 다리 뼈는 없이' · 공격은 에너지 빔과 팔 휘두르기 예정). 원본은 같은 폴더의 `Meshy_AI_Azure_Apocalypse_…_fbx.zip`(사용자 업로드 · FBX 140만 세모 · 뼈 없음 · 받침 붙음 — **FBX 는 Y 위라 적혀 있지만 실제는 Z 위**). `tools/azure/run.sh` 가 같은 GLB 를 다시 만든다. 세모 197,205 · 정점 153,441 · 뼈 23(`root` · `pelvis` · `spine` · `chest` · `neck` · `head` · `halo` · 팔 넷 `armR1/R2/L1/L2` → `fore*` → `hand*` → `claw*` — 팔은 몸 오른쪽(−x) 위·아래 · 왼쪽(+x) 위·아래 · 쉼 자세 회전 0) · **+z 를 본다** · 키 2.98 m · 원점은 몸 가운데 발밑. 바탕 + 발광 그림(갈고리 끝 · 몸의 결이 빛난다) · **머리 위 고리는 새로 빚었다**(사용자 참고 그림 — 검은 돌 비늘 조각 17개가 고리로 이어지고 밑·틈에서 푸른빛이 새며 군데군데 끊기고 부스러기가 뜬다 · `tools/azure/halo_new.py` · 원본의 매끈한 원환은 뺐다) — 게임에선 `MeshLambertMaterial({map, emissiveMap, emissive:흰색, skinning:true})`. 사슬은 몸통만 따르고, 따로 움직일 덩이(팔 넷 · 허리 아래 · 머리 · 고리)를 잇던 세모 1,465 장은 뺐다. **아직 어느 코드에서도 로드하지 않는다** — r128 GLTFLoader 는 레포에 없다(npm three@0.128.0) |

**본편은 나뉘어 있다** — `island_world.html`(275줄 · HTML 뼈대뿐) + `engine/css/game.css` + `engine/js/*.js` 56개(코드 47 + base64 자료 9).
js 는 **ES 모듈이 아니라 차례대로 불러오는 보통 스크립트**다(모듈은 `file://` 에서 안 뜬다 · 보통 스크립트는 전역 하나를 나눠 써서
나누면서 고쳐 쓴 것이 없다). 번호가 곧 불러오는 차례다 — **불러오는 순간 바로 도는 코드는 위 파일 것만 쓸 수 있다**(함수 안에서
부르는 것은 어느 파일 것이든 된다). 새 계통은 `99-main.js` 바로 위에 새 파일로 넣는 것이 쉽다. 파일별 설명(영어)은 `CODEMAP.md`.
한 파일로 묶으려면 `python3 tools/build_single.py` → `island_world_single.html`(무시 목록에 있다 — 고치는 것은 늘 `engine/js/`).
로컬 서버로 볼 때는 `python3 tools/serve.py`(캐시를 끈다). 문법만 볼 때는 `node --check engine/js/파일.js`.
**나뉘기 전 한 파일 판은 커밋 `8ec7546` 까지다.**

`data-ground-textures.js`(1.2 MB · 땅 사진 여덟 장)·`data-rock-textures.js`(1.8 MB · 바위 사진 여섯 장 + 법선 지도 — `rockPhotoInit` 이 `uRk`·`uRkN` 으로 올리고 `rockMat`·`rockDetailPatch`·땅 셰이더의 벼랑 면이 읽는다)·`data-sentinel-mesh.js`(1.3 MB · 투구 모형)는 base64 한 줄이다 — **읽지 말 것.**
나머지도 큰 파일(`45-sky.js` 2,342줄 · `30-props.js` 1,618줄)은 통째로 읽지 말고 아래 지도에서 줄을 집어 `sed -n '시작,끝p'` 로 뜰 것.

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
| `32-caves.js` | 동굴 — 바위 굴집 `buildCaves`(방 1~3 개) · 반딧불이 유충(빛나는 점)·빛나는 버섯·방마다 약한 불빛(불빛 풀) · `updateCaves`  · 굴 바위의 참 꼴(`caveSolid` — 눈의 경계) · 벽 바위는 실제 테두리로 몸을 막는다 |
| `33-crags.js` | 암벽 — 가파른 칸의 큰 바위 무리 `cragSites`/`cragGrow`(프랙털 세 단계 · 덩이마다 다른 빛깔) · 320 m 칸 메시 `cragMesh` · `updateCrags` |
| `34-coast.js` | 바닷가 지형(지형 판 5) — 시스택·해식 아치(벼랑 바위 덩이로 짓는다 → 같은 사진 재질·단계·몸의 막힘) · 주상절리 육각 기둥(`coastFloor`·`coastSolid` — floorAt · 눈의 경계 · 매달리기가 본다) |
| `35-geo.js` | 지열 지대(지형 판 5 · 분기공 지대) — 온천 · 진흙 웅덩이 · 간헐천 · 석회화 단구 · 데임. 전역 이름은 `GEOT`(`GEO` 는 64-dex.js 가 쓴다 — **겹치면 그 파일이 통째로 안 읽힌다** · check-syntax 는 못 잡는다) |
| `36-falls.js` | 폭포와 연어(지형 판 5) — 하천 수면이 4 m 넘게 떨어지는 데 · 물살 판 · 소 · 물보라 · 뛰어오르는 연어  · **지형 판 7: 저수지 폭포**(`fallsCarve` — 물머리에 소 · 턱 · 위 저수지 / `fallsCrags` 바위벽 · `fallsBuildRes` 곧게 떨어지는 물) |
| `40-light.js` | **`LIGHT` 46**(배역 · 해 그림자 상자 · 점·집중광 예산) · `renderFrame` |
| `66-decay.js` | 상하는 먹을 것(칸의 `t` · `ITEMS[].rot` · `freshMerge` · `updateDecay` · 파리) · 비에 꺼지는 불(`fireShelter` · `fireRain`) |
| `98-dew.js` | 이슬 — 가까운 잎 위의 물방울 메시 `updateDew`(양은 `TERR_U.uDew` — 41-terrain-light.js 가 정하고, 잎·풀밭의 반짝임은 envPatch·땅 셰이더가 그린다) |
| `41-terrain-light.js` | 섬 크기의 빛 텍스처 `TLIT` — R 산 그림자(`tlitSweepStep`) · G 하늘 트임 · B 숲 덮임 · A 잔 기복 가림막 · `tlitBuild` · `updateTlit` |
| `45-sky.js` | `SKY` 8 · `updateWeather` 357 · 구름 명암 `litQueue` 905 · `updateClouds` 1476 · `SKY_LUT` 1967 · **`updateSky` 2107**(노을·달밤 색조 `SKYL.grade` 포함) — **`beta/cloud_arena.html` 의 원본** |
| `46-camcorder.js` | 캠코더 화면(480줄 그림판 → 테이프 셰이더) · 배터리 · 손 발전기 · 다치면 여는 화면처럼 치지직(`CAMC.hurt` — 지금 체력) |
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
| `97-wyvern.js` | **애쉬스케일**(지형 판 8 — beta/wyvern_arena.html 를 **개체 만드는 함수 `wyvMake(S)` 로 감쌌다**: 시험장 전역 `W`·`BONE`·`bone`·`rotBone`·`REST`… 가 본편과 안 겹치게 · 밖으로는 `wyvMake`·`wyvShared`·`wyvBuild`·`wyvReset`·`wyvTick`·`WYVS`(몸 둘) 뿐) — '자세' 구역은 시험장 글자 그대로(**`tools/wyv-sync.mjs` 가 같이 바꿔 끼운다**) · 명단이 정한 탁 트인 데에 나타나 제 자리 둘레를 돈다 · 화염구 · 할퀴기 · 물기 · 터짐 · 잔해 · 맞는 공은 뼈 캡슐을 1 m 마다(`sampleCaps` · 72개) |
| `98-bag.js` | 가방 화면(소지품 + 고른 것 + 제작) — 가방에는 그림 · 이름 · 개수 · 할 수 있는 일만, 자세한 것은 사전(`dexShow`) |
| `99-main.js` | **`loop`** 8 · 맨 끝에서 게임을 켜는 다섯 줄 |

줄 번호는 커밋 때 다시 잴 것:
`grep -n "^const ITEMS\|^function updateSky" engine/js/*.js` 처럼 이름으로 찾는 편이 빠르다.

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

## 규칙

- **섬 배율(`P.ws`)** — 섬은 늘 칸 2.5 m(`GCELL`) · 1,920 m 로 만든 뒤 `worldRescale` 이 통째로(가로·세로·높이) ws 배로 키운다.
  새 섬은 6(11,520 m — 예전 기본 2의 넓이 아홉 배) · 설정 '섬 넓이' 로 1~6 · 주소 `?ws=2` 로도(구동 검사가 쓴다). **`CELL` · `WORLD` · `HALF` 는 변수다**(`setWorldScale`) — 불러오는 순간 도는 코드에서
  이 셋으로 다른 상수를 만들어 두지 말 것(함수 안에서 읽는다). 지형 생성·침식·유량은 `GCELL` 로 센다. 배율이 없는 옛 저장은 1 로 읽는다.
  배율 1 의 섬은 자원 배치의 난수 차례가 예전과 같아야 한다(`placeResources` 의 `WS===1` 갈래를 건드리지 말 것).
- **지형 판(`P.tv`)** — 2 는 침식 뒤에 피오르·골짜기·단구·절벽·산릉·탁상지를 새기고(`terrainFeatures`) 동굴(`caveSites` · 32-caves.js)과
  암벽(33-crags.js)을 둔다. **판이 없는 옛 저장은 1 로 읽혀 예전 섬이 한 비트도 안 달라진다**(배율 2·판 1 의 표고·소품이 main 과 같음을
  확인했다). 시드가 만드는 것을 바꾸는 일은 이 판 뒤에 둘 것 — 새 판을 만들면 `newIsland`·`farDrift` 가 주는 값도 올린다(지금 8 — 8 은 옛 신전 둘(97-temples.js) · 대숲 바이옴(`B.BAMBOO` 13 — 활엽수림의 낮은 데 · 큰 얼룩) · 들판의 바위 솎기(`thinOpenRocks`) · 판판한 현무암 섬 · 4 는 바다 골짜기 `seaTrenches` · 5 는 바이옴 비탈 · 바닷가 · 지열 · 폭포 · 6 은 광석을 굴 속에만(`oreToCaves` — 늪철광만 늪에) · 바깥 광석과 낮은 땅 화강암 일부를 그 자리의 현무암 · 석회암(`karst`) · 사암으로(`surfaceRocks`) · 산허리가 방으로 솟는 굴 자리 버리기(`caveSites` 의 `bulge`) · 7 은 저수지 폭포(36-falls.js) · 땅속 세계(96-underworld.js)).
  새 지형 코드는 제 난수(`mulberry32(seed^상수)`)만 쓴다 — `placeResources` 의 난수 차례를 건드리지 않는다.
- **지형 판 3 — 칸 안의 잔 기복(`RELIEF` · 10-worldgen.js)**: `heightAt` 이 둔덕·골(±0.35 m)을 더해 돌려준다. 그리는 쪽은 사람 둘레의
  덧판(`terrainPatch` — 20-terrain.js · 0.75 m 격자 · 46 m)이 **같은 식**을 셰이더에서 푼다. 식을 바꾸면 세 군데를 같이 바꿀 것 —
  `reliefT`(CPU) · `TPATCH_GLSL`(덧판 정점) · `gndTerrainFrag` 의 '화소마다의 빛'(법선). 표고장 `F.elev` 은 안 바뀐다(물·그림자·지도는 그대로).
  본 땅은 덧판의 원 안 화소를 버린다(깊이·거리 재질도 — `terrDepthMat`). 땅을 새로 그리는 재질을 만들면 그 버림을 같이 넣을 것.
- **땅의 빛은 화소에서 센다**(22-ground-textures.js) — 램버트의 정점 값 `lambW.x` 자리에 `gndSun` 을 넣는다. 램버트 조각 셰이더의
  그 두 줄(`SUN` · `IND`)이 바뀌면 조용히 예전 방식으로 돌아간다(`PIX` 거짓). 섬 크기의 빛(산 그림자·하늘 트임)은 `envPatch` 가
  빛을 받는 모든 재질에 곱한다(41-terrain-light.js). 캠코더 그림판은 되는 장치에서 반정밀 실수다(`CAMC.hdr`).
- **`updateHUD`(82-hud.js) 안에서 일찍 `return` 하지 말 것** — 조준 표시 갈래에서 돌아가면 그 아래(가방 맞춤 · 도구 표시 · **제작 진행 막대**)가
  통째로 안 돈다. 숫돌을 보는 동안 막대가 멈춰 '안 만들어진다'는 베타 신고가 이것이었다. 갈래는 else-if 로 잇는다.
- **먹을 것의 칸을 새로 만들 때는 나이를 들고 갈 것**(`DECAY.carry` → `stackInto`·`invAdd` 가 `freshMerge` 로 받는다 — 66-decay.js). 그냥 새 칸을
  만들면 옮길 때마다 새것이 된다. **토대 표(FOUNDS)에는 보이지 않는 '맨땅의 바탕'(`ghost` · tier −1 · mesh 없음)이 섞여 있다** — 토대를 도는
  코드는 `f.ghost` 를 걸러야 한다(바닥이 아니고 메시도 없다 — 62-build.js `groundBase`).
- **큰 바위(33-crags.js)는 충돌 원이 아니라 그려진 꼴로 막는다** — `floorAt` 이 `cragFloor` 를 거친다(낮으면 딛고 높으면 벽). 바위 꼴(`cragShape`)이나
  덩이의 돌림·늘림을 바꾸면 메시(`cragMesh`)와 충돌(`cragIndex`·`cragSpan`)이 같은 값을 쓰는지 볼 것. **비탈에 놓는 것은 묻거나 눕힌다**
  (`groundSlope` — 풀·덤불은 기울기대로 눕히고 나무 밑동·바위·자갈은 아래쪽이 뜨지 않게 내린다). 곧추 얹으면 6배 섬의 가파른 비탈에서 뜬다.
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
- **프레임은 삼각형 수가 정한다**(성능 창 F3 — '본장면 △'). 놀이 로직은 프레임당 0.4 ms 라 언어를 바꿔도 프레임은 안 는다.
  참나무·전나무는 **그루마다 거리로** 단계를 고른다(`TL` — 18 m 제 가지 · 45 m 성긴 가지판 · 그 밖 제 것 솎기 · 아래 '참나무·전나무 단계').
  **자동 품질 `QUAL.k`**(0.45~1)가 이 거리들과 풀·덤불 반경에 곱해진다 — 프레임을 잴 때는 `QUAL.on=false` 로 끄고 잴 것.
  바위 칸(`ROCK_TILES`)·나무 칸의 가지는 **가까워질 때 빚고 멀어지면 버린다** — `t.m` · `p._batch` · `p._lb` 가 null 일 수 있다.
- **화면 위에 `mix-blend-mode` 나 움직이는 전체 화면 DOM 겹을 얹지 말 것** — 브라우저가 프레임마다 화면을 따로 합성해 프레임이 크게 떨어진다.
  화면 효과(잡음·주사선·색조)는 캠코더 셰이더(`46-camcorder.js`) 안에서 한다. 창의 잡음 무늬는 움직이지 않는 바탕 그림이다(`--tvn`).
- **가방은 I 하나로 연다**(C 는 앉기만). 가방을 열어도 시간은 흐르고 몸만 선다(`updatePlayer` 의 `NO_KEYS`) — 사전만 멈춘다(`uiHold`).
  가방은 두 탭이다(`bagTab` — 소지품 · 제작). 소지품은 갈래(`itemCat`)와 내 칸(`INV.pockets` · 슬롯의 `pk`)으로 묶고,
  제작은 기술 나무(`drawCraft` — 탭 `craftCat` · 단 `TIER_ORDER` · 줄 `craftEdges`)다. 마디를 누르면 고르고(`CRAFT.sel`) 다시 누르면 만든다.
  **새 제작법은 `tier` 가 `TIER_ORDER` 에 있어야 나무에 선다.**
- **세상에 선 것은 전부 무엇인가를 준다**(보급선만 빼고) — 식생은 `FLORA_KIND[].pick` → `FLORA_PICK`, 바다는 `SEA_PICK`, 자갈밭의 잔돌은
  `RUBBLE.picks`, 노거수는 `gbark`·`gresin`. 새로 세우는 것에도 얻을 것을 달 것. 낮은 것(`low`·`hide`)은 똑바로 내려다봐야 잡히고,
  무기·도끼·곡괭이·그물을 들었으면 안 잡힌다(`floraHandOK`) — 좌클릭을 가로채지 않게.
- **r128 은 재질 하나에 셰이더가 하나다** — `InstancedMesh` 와 보통 `Mesh` 가 재질을 나눠 쓰면 안 되고, 재질을 나눠 쓰는 인스턴스 메시는
  전부 인스턴스 색(`setColorAt`)이 있어야 한다(없으면 그릴 때 죽는다 — 노거수 뿌리가 `GIANT.rootMat` 을 따로 쓰는 까닭).
- **베타 빌드** — 모든 판 · 모든 OS 의 설치 파일을 `beta/builds/` 한 폴더에 둔다(`CASTAWAY-<판>-mac.dmg` · `-setup.exe` · `-portable.exe` · `-linux.AppImage` · 레포에 안 담는다 · 파일마다 100~230 MB · 2026-10-19 사용자 요청으로 판마다 나뉜 폴더를 모았다). `sh beta/build-mac.sh` 가 `.dmg` 를, `sh beta/fetch-ci.sh [실행 번호]` 가 CI('데스크톱 판')의 세 판을 거기 받는다. `beta/builds/README.txt` 에 판마다 무엇이 어디서 왔는지 적어 둔다.
  npm 캐시는 `env/.cache/npm`(홈의 캐시 권한이 꼬인 기계가 있다).
- **조사한 그래픽 엔진·기법과 측정값은 `docs/graphics-engines.md`** — 확인한 것만 적었다. 새 기법을 넣으면 거기 표에 잰 값을 더할 것.

- **모래·점토**(사용자 지적: '모래나 점토 같은 거 질감이 실제와 달라 아쉽다' · 22-ground-textures.js · 조사·잰 값은 `docs/graphics-engines.md` §5.3).
  ① **둔덕은 땅 셰이더를 그대로 쓴다**(`moundMat(kind,R,col,H,bury)` → `gndTerrainFrag(frag, extra)`) — 예전엔 제 빛깔 램버트라 모래밭에 붙인 스티커였다.
  `extra` 는 바탕 빛깔을 다 센 뒤 끼우는 GLSL 이고 갈고리 `mdSand`(마른 모래로 친다) · `mdH`(결 높이 — 사진 결 높이에 더해 법선을 기울인다) ·
  `mdK`/`mdGl`/`mdF0`(번들거림)로 빛 셈에 손댄다 — **땅에선 다 0 이라 한 비트도 안 바뀐다**(풀밭·습지 사진이 화소까지 같음을 확인).
  둔덕 결은 반지름이 아니라 '땅 위로 드러난 높이'(`E` — 꼭대기 0 · 땅과 만나는 데 1)로 잰다. 모래 둔덕은 안쪽만 해변 모래 빛깔(1.04배 — 말라 성기다)에
  늘 바람 물결 · 점토는 아래 ③.
  ② **마른 모래**: 물결 자국을 물밑·물가 것(대칭 이랑)과 갈랐다 — 마른 데는 **바람 물결**(파장 11 cm · 높이 파장/20 · 완만한 쪽 72% · 섬 전체 한 방향
  · 마루를 흐린 밉 잡음으로만 굽힌다 — **자리마다 방향을 돌리면 원점에서 잰 위상이 지렛대를 타 지문처럼 말린다** · 군데군데 밭으로 · 화소 넷 밑이면 지움) ·
  **알갱이**(0.6 mm · 석영·검은 광물·조개 부스러기 · 흔들림 ∝ 알/발자국 · 평균 1) · **반짝임**(세는 꼴 — Jakob 2014 · Chermain 2020(MIT `ASTex-ICube/real_time_glint`
  를 보고 사전 텍스처 없이 새로 씀): 발자국 짧은 축 크기의 칸 · 두 단계 섞음 · 칸 해시(`gnH` — pcg2d)로 포아송 표본 k · 매끈한 벡만 반사 × k/λ ·
  **실제 해의 입체각 6.8e-5 sr**(그려 놓은 해 원판(4배)을 쓰면 열네 배 흔하고 흐려 안 보였다) · 거울 같은 알 15% · 젖으면 없다).
  ③ **점토 노출지**: 말라 갈라진 금 두 겹(보로노이 `ckEdge` — 칸 14 cm · 5 cm, 먼저 난 금이 넓고 15% 는 안 갈라짐) · 말려 올라 볕 받는 판 가장자리 ·
  쇠 녹(주황)·잿빛 얼룩 · 축축한 둘레는 짙고 번들 · 가장자리는 모래가 덮어 들쭉날쭉. 금은 화소 셋 밑이면 지운다.
  둔덕 키: 점토 0.30 · 모래 0.40 m(× 크기) · 반지름 1.3 · 1.6 m — 꼴은 (1−r²)³(자락이 길게 눕는다).
  **셰이더 글에 음수를 그대로 끼우지 말 것** — `y-${-0.02}` 가 `y--0.020` 이 되어 컴파일이 안 됐다(괄호로 감쌀 것).
- **바다 밑은 1.6배 깊다**(`genBase` — 해안 완만화 뒤 `e<0` 이면 ×1.6. 해안선은 그대로).
  **하폭은 4~19 m**(`rM` 2.2~9.5 — 예전 1.6~7 의 1.35배). **헤엄은 수심 2.2 m(하천 2.6 m) 넘고 발이 1 m 넘게
  잠겨야** 시작한다 — 예전 1.7 m 는 하천에서도 걸렸다.
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
- **자원은 서로 겹치지 않는다**(`resolveOverlaps` — `placeResources` 맨 끝, 10-worldgen.js '8-a)'). 배치는 그대로 두고
  **시드 난수를 다 뽑은 뒤** 겹친 것만 고친다(난수를 더 뽑으면 섬이 바뀐다 — 고치기 자체엔 난수가 없다). 몸 반지름은 `PROP_FOOT`×크기 —
  **바위는 `ROCK_R` 가 아니라 다 빚은 겉의 최댓값**이다(혹·잘라 내기로 `ROCK_R` 의 1.25배, 방연석은 정육면체로 당겨 1.67배까지 나간다 —
  `ROCK_R` 로 쟀더니 실제 몸끼리 65쌍이 남았다). 드문 것(`RESOURCES[].max` 작은 차례)이 먼저 자리를 잡고, 뒤의 것은 13방향으로 원래
  자리에서 4 m 안까지 비켜서고, 못 비키면 뺀다. 점토·모래 둔덕(납작한 것)은 둔덕끼리만, 풀·갈대는 바위·줄기 속이면 뺀다.
  잰 값(실제 방위별 몸 `prof` 로): 겹친 쌍 177 → 0 · 둔덕 387 → 0 · 옮김 950 · 뺌 545(대부분 풀).
  **새 광물은 `PROP_FOOT` 에도 한 줄**(빚은 뒤 `_col.prof` 의 최댓값 ÷ 크기). 다 고친 `PROPS` 의 번호가 바뀌므로 고치기 전 목록을 `PROP_ORIG` 에 둔다 —
  저장(`findSavedProp`)이 번호만 적힌 옛 줄은 `PROP_ORIG[번호]` 로 찾고(빠진 것이면 건너뜀), 자리로 찾을 때는 옮기기 전 자리(`ox`/`oz`)도 본다.
- **상륙 자리는 시드로 정해진다**(`LANDING` · `placePod` — 30-props.js). 배 자리·방향과 **사람이 서는 자리(배 로컬 좌표 후보 열 곳 중
  처음 맞는 것 — 땅 0.4 m 위 · 비탈 0.6 밑 · 하천 아님)** 를 섬을 지을 때 정하고, `spawnPlayer`/`revivePL` 은 늘 거기에 배를 보고 선다
  (예전엔 캡슐 둘레 무작위 각도 `Math.random`). `clearLanding` 이 배 둘레(배 로컬 상자)와 선 자리 3 m 안의 자원을 빼고, 군락 식생·노거수도
  `inLanding` 이면 안 심는다. 그래서 같은 시드면 배·사람·첫 시야가 늘 같다 — 먼 나무의 기준 나무(`FAR_REF`)도 같아져 사진 견주기가 안정됐다.
  차례: `placePod` → `buildProps` → `makeShip`(이제 `LANDING` 을 읽기만 한다).
- **광물의 생김새는 `HABIT` 표 한 줄이다**(`buildProps` 바로 위). `buildRockBatch` 가
  20면체 껍질에 ① 매끄러운 혹(`amp`·`bump`·`nb`) ② 무작위 평면으로 잘라 내기
  (`cuts`·`deep` — 볼록 다면체가 되어 모난 면이 생긴다) ③ 정육면체 쪽으로 당기기
  (`cube` — 방연석의 정벽 쪼개짐) 셋을 섞고, `smooth`(0 이면 면마다 각진다)·`flat`·`st`
  로 마무리한다. 표에 없는 종류는 `HABIT0`(예전 그대로 둥근 덩이)으로 간다.
  **면이 안 보이게 하는 것은 법선이 반이다** — 삼각형마다 면 법선을 쓰면 80면짜리
  껍질이 그대로 드러난다. `own[u]` 가 "이 자리의 반지름을 누가 정했나"(혹 · 몇 번째
  자르기 평면 · 정육면체 몇 번째 면)를 적어 두고, **삼각형 셋이 같은 평면 위면 그 면만
  각지게**, 나머지는 이웃 면 법선을 모아 이어 붙인다. 그래서 굽은 데는 매끈하고 깨진
  데는 날카롭다. `smooth` 는 굽은 쪽에만 듣는다.
  **껍질 단계는 `shellFor`** — 20면체 n 단계 면 수는 20·(n+1)² 다(1단계 80 · 2단계 180 · 3단계 320 —
  예전 문서의 '2단계 320면'은 틀렸다). 자갈·부싯돌 2단계(180면), 나머지 3단계(320면).
  **암석 충돌은 `ROCK_R`≥0.4 인 광물 전부**(`RAD` = `ROCK_R`×0.85) — 예전엔 화강암·구리·철·석탄만
  있어 아연·방연석·진사·주석·황을 걸어서 뚫었다. **암석 재질은 `rockMat`**(광물마다 셰이더 하나) —
  얼룩 두 겹 · `LUSTRE.tex` 를 따른 결(반점은 **보로노이 알갱이 `grain()`** — `floor(p)` 칸으로 칠하면 정육면체라 네모가 줄지어 보였다 ·광맥·금·층·반짝임·혹·조개무늬) · 윗면 이끼(황·진사 제외 — 워프한 세 겹 잡음을 문턱으로 잘라 들쭉날쭉한 방석 꼴, 짙은↔누런 풀빛, 가까이선 방석 결) ·
  밑동 그늘 · `met` 만큼 해 반사 광택.
  **바위는 `ROCK_TILE`(64 m) 칸 × 광물마다 한 묶음이다**(`ROCK_TILES`) — 칸 가장자리가
  `ROCK_DIST`(200 m) 밖이면 `updateTileVis` 가 통째로 끄고, 화면 밖 칸은 경계구로 거른다.
  예전엔 섬 전체가 한 덩어리라 늘 다 그렸다. 재질은 종류당 하나(`ROCK_MAT`)를 나눠 쓴다.
  캐기(`_vs`/`_vn`)는 제 칸 묶음의 정점 구간을 고친다.
  **사전 삽화(`mineralIcon`)도 같은 표를 2차원으로 읽는다** — 그래서 `HABIT` 은
  `buildProps` 안이 아니라 바깥 최상위에 있어야 한다(안에 두면 삽화 쪽에서 안 보이고
  조용히 `HABIT0` 으로 떨어진다). 광택·표면 무늬는 삽화 전용 표 `LUSTRE`
  (`met` 금속 광택 · `tex` = speck·botry·crack·conch·step·vein·grain·smooth)다.
- **프롭이 땅에 앉는 높이는 `propOff(종류, 크기)` 하나다**(`buildProps` 안). 세 군데에
  같은 식이 복사돼 있던 것을 합쳤다 — 행렬 배치 · 채집 표시(`_foff`) · 나무(`_toff`).
  **점토 노출지·모래 언덕도 64 m 칸에 담는다**(`PROP_DIST` 300 m) — 예전엔 섬 전체(모래 561 · 점토 316)를 한 메시로 늘 그려 본·그림자 패스에
  프레임마다 40만 삼각형이 들었다.
  **점토 노출지·모래 언덕(`FLAT_PROP`)은 이제 땅에 덮어씌운다**(`moundMat` 의 정점 셰이더 — 높이 = 그 자리 **그려진 땅**(덧판과 같은 `patchCalc`) +
  둔덕의 키, 자락은 1 cm 땅속). 예전엔 `terrainNormal` 에 맞춰 눕혀 깊이 묻었는데(점토 −0.16 · 모래 −0.18) 땅 위로 8 cm 남짓만 나와 잔 기복이
  가운데를 뚫고 올라오거나 비탈 한가운데에서 잘려 테두리에 금이 섰다. 그래서 `propOff` 의 점토·모래 값(−0.05)은 가로 자리 말고는 안 쓰인다.
  다 퍼 가 0 배로 접힌 둔덕은 덮어씌우기를 건너뛴다(`inverse` 가 NaN).
- **빛과 그림자는 `LIGHT` 하나가 다룬다**(하늘 구역 바로 앞). 가짜 접지 그림자
  (`makeShadowTex` 원반 · `SHADOW_R`)는 없앴다 — 이제 `renderer.shadowMap` 으로
  실제로 드리운다. 세 부분이다:
  ① **배역** — `LIGHT.refresh()` 가 씬을 훑어 정한다. `full`(드리우고 받는다) ·
    `recv`(받기만 — 수면·**카메라에 붙은 것 전부**) · `soft`(품질 '보통' 이상에서만
    드리운다 — 풀·갈대. 4만 포기라 낮은 품질에서는 받기만 한다) · `none`(하늘·불꽃 등
    `MeshBasicMaterial` 은 자동). `userData.lightRole` 로 적으면 **아래 것들이
    물려받는다** — 무리 하나에 적으면 그 밑이 다 따른다. **장면 전체를 훑는 `refresh()` 는
    섬을 다 지었을 때·그림자 품질을 바꿀 때만 돈다** — 예전엔 0.7초마다 물체 4,900개를 훑었다(1.4 ms ·
    쓰레기 180 KB). 새로 세운 집·설비는 `Object3D.prototype.add` 갈고리가 `LIGHT.pending` 에 모으고
    그리기 직전 `LIGHT.flush()` 가 그것만 배역을 준다(뿌리가 `scene` 이 아닌 것 — 아이콘·임포스터를
    찍는 임시 장면 — 은 건너뛴다). 드리우던 것을 떼면(`remove` 갈고리) 그림자를 다시 그린다.
  ② **해 그림자** — 섬이 1920 m 라 한 장에 못 담는다. 사람 주위 `R` m 만 덮는
    평행투영 상자를 따라 옮기되 **중심을 `SUN_STEP`(4 m, 텍셀의 정수배) 격자에 끊고 시선 쪽
    치우침(0.45R)은 8방향으로 끊어서** 옮긴다(텍셀 격자에 안 맞추면 그림자 가장자리가 들끓는다).
    해가 낮으면(세기 0.12 미만) 접는다 — **castShadow 를 끄지 않고 그림자 행렬을 '모든 점 → 지도 밖'으로 돌려 둔다**
    (`SUN_PARK` · `LIGHT._sunPark`). 끄면 그림자 광원 수가 바뀌어 모든 재질(100여 개)의 셰이더를 다시 짜느라 새벽·저녁·
    달이 뜨고 질 때마다 멈칫했다. Three 의 그림자 셈은 지도 밖이면 1(볕)이라 화면은 끈 것과 같다(PCF 표본도 안 읽는다).
    **그림자 지도는 매 프레임 다시 그리지 않는다**(`shadow.autoUpdate=false` — Three 는 광원마다
    `needsUpdate` 를 보고 그 지도만 다시 그린다). 다시 그리는 때는 넷 — 상자가 옮겨졌을 때 · 해(밤엔 달)가
    0.2° 넘게 돌았을 때(`SUN_TURN_COS`) · 드리우는 것이 바뀌었을 때(`LIGHT.dirty()`/`dirtyAt(x,z,r)`) ·
    안전망 1.5초(`SUN_AGE`). 잰 값: 가만히 60프레임에 1번(예전 60번) · 10 m 걷기 2번 · 90° 돌기 1번.
    불(점광원) 그림자도 같다 — 받는 순간 한 번, 둘레가 바뀌면 다시, 안전망 3초. 손전등(집중광)만 매 프레임.
    **드리우는 것을 움직이는 코드를 새로 쓰면 `LIGHT.dirtyAt(x,z,r)` 을 부를 것** — 붙이고 떼기와
    인스턴스 옮기기(`InstancedMesh.prototype.setMatrixAt` 갈고리 · `instSetM`)는 저절로 알리지만
    `position`/`rotation` 을 직접 바꾸는 것은 모른다(안 부르면 그림자가 최대 1.5초 늦게 따라온다).
    지금 부르는 곳: `toggleFit`(문짝) · `updatePower`(물레방아) · `updateShip` · 바위 캐기 ·
    `updateTileVis`(칸이 켜지고 꺼질 때 — `setVis` 가 바뀌었는지 돌려준다). 몹을 본편에 들이면 몹도 부를 것.
    **`bias` 는 0 이다.** Three 는 그림자 지도에 **뒷면을 그린다**(`FrontSide` 재질의
    깊이 재질을 `BackSide` 로 뒤집는다 — r128 의 `shadowSide` 표 `{0:1,1:0,2:2}`).
    앞면을 그릴 때 쓰는 음수 bias 를 그대로 두면 비교 깊이가 빛 쪽으로 당겨져
    (−0.0005 × 깊이폭 ≈ 0.2 m) 빛이 비스듬히 스치는 자리에서 제 뒷면보다 뒤로 밀리고,
    **바위에 제 몸 줄무늬 그림자가 앉는다.** 뒷면을 그리는 이상 상수 bias 는 필요 없다.
    **`normalBias` 는 한 텍셀**(`2R/지도크기`, 보통 6.25 cm — 상자를 넓히기 전 4.5 cm). 밀수록 그림자가 물체에서
    떨어져 밑동이 비므로 더 키우지 말 것. 처음에 0.35 m 로 잡았다가 자갈(지름 0.26 m)의
    그림자가 통째로 몸 밖으로 나갔다.
    **깊이 범위(`near`~`far`)는 상자에 바짝 붙인다** — 평행투영은 깊이가 선형이라
    폭이 넓을수록 눈금이 굵어지고 여드름이 잘 생긴다.
  **해 그림자 상자를 넓혔다**(2026-10-20 · 베타 신고 '나무에 다가가면 색이 바뀐다' · 사용자 요청 '그림자 조건을 넓혀') — `LIGHT.QUAL` 의 R 낮음 36 · 보통 46 · 높음 64 →
    **72 · 96 · 128 m**, 지도 1024 · 2048 · 4096 → 2048 · 3072 · 4096(한 텍셀 6~7 cm). 나무 잎은 제 잎·가지 그림자를 받아 40% 남짓 어두워지는데(잰 값 —
    한낮 숲 20 m 에서 그림자 켬 52,60,41 · 끔 87,97,63), 상자 밖 나무는 그림자가 없어 밝게 섰다가 상자에 들면 어두워졌다. 상자 앞 끝(시선 앞 0.45R+R)이
    나무가 그림으로 바뀌는 `COPY_DIST`(125 m) 둘레에 오게 잡았다. 같이 — 참나무·전나무 솎은 단계(58 m 밖 `L1~3`·`F1~3`)와 식생 줄인 단계(`floraFar` 60 m 밖)도
    드리운다(예전엔 받기만 해서 상자 안이어도 제 잎 그림자가 없었다). 상자 밖은 `castNear`(칸) · 그림자 카메라(식생)가 거른다.
    땅의 숲 그늘 어림(`uShR` — 22-ground-textures.js)은 R 을 따라간다.
    잰 값(한낮 · 숲을 12 m 위에서 내려다봄 · 그림자 켬 / 끔): 20 m 43,58,29 / 74,97,47 · **60 m 35,47,22 / 57,76,36**(예전엔 46 m 밖이라 켬 = 끔) ·
    110 m 24,37,14 / 32,47,18. 숲 곁 해 그림자 지도 한 번 그리기 175회 · 147만 △ → 206회 · 163만 △(+11%).
    **그림 판때기에도 제 그늘을 굽는다**(사용자 요청 · `bakeTreeImpostor` · `IMP_SHADE`) — 125 m(`COPY_DIST`) 밖 그림은 그림자 없이 찍혀 그 거리에서 밝아졌다.
    찍을 때 그 나무 한 그루로 그림자 지도(1024²)를 한 번 그려 잎·가지·줄기가 서로 가리게 한다(잎은 그림대로 오린 깊이 재질) — 기준 나무 둘을 한 번씩 찍을 뿐이라
    섬 짓는 시간은 거의 그대로다. 설정 '그림자 끄기'면 안 굽는다(입체 나무도 그늘이 없다 — 상륙 뒤 그림자 설정을 바꾸면 다시 굽지는 않는다).
    잰 값(한낮 · 숲을 200 m 밖 70 m 위에서): 그림 평균 63,81,41 → 52,67,34 · 화면 숲 가운데 그림(예전) 55,67,45 · 그림(지금) 53,64,44 · 입체(그림자 받음) 52,63,43.
  ③ **그림자 예산** — 점광원 그림자는 한 개가 정육면체 여섯 면이라 비싸다.
    `score = 세기 × 사거리 ÷ 거리` 로 **카메라 기준** 상위 K개에만 준다.
    밀려난 광원은 `LIGHT.free` 로 지도를 반납한다 — 안 그러면 지나친 모닥불
    수만큼 GPU 메모리가 쌓인다.
  **광원 수(보이는 광원 · 그림자 광원)를 바꾸면 모든 재질의 셰이더를 다시 짠다(멈칫)** — 끌 때는 `visible` 대신 세기 0 으로
  끌 것(횃불 `torchLight` · 손전등 `flash`). 보급선 광원은 떠나도 세기 0 으로 장면에 남는다(`SHIP.parked` — 다음 `makeShip` 이 치운다).
  **화덕·증기기관·제련로의 빛은 불빛 풀이다**(`LIGHT.addFire` · `poolInit`/`poolShadows`/`poolUpdate` — 40-light.js · 사용자 지적: 어두울 때 불 켜면 버벅).
  `addFire` 는 광원이 아니라 **대역**(Object3D 에 세기·빛깔·사거리·`visible` — 예전 광원처럼 적으면 된다)을 돌려주고, 진짜 광원은
  장면에 늘 선 `POOL_N`(3) 개다. 매 프레임 켜진 대역 중 값이 큰 것(세기×사거리÷거리)을 실어 나르고 남는 칸은 세기 0. 앞 `pts` 칸은
  **품질이 정해지는 즉시**(`setQuality` → `poolShadows`) 늘 그림자를 드리운다 — 첫 프레임에 그림자 수가 바뀌면 그것도 다 다시 짠다.
  맡은 불이 바뀔 때만 그 칸의 그림자 지도를 다시 그린다. 불꽃 셰이더(광원 수가 열쇠에 든다)는 상륙·계속 때 `fireWarm` 이 같은 광원
  수의 빈 장면(`precompScene(lightCensus())`)에서 한 번 짠다. 잰 값: 불을 켤 때 새로 짜는 셰이더 5(예전엔 빛 받는 재질 전부) → 0.
  남은 것은 불 곁에 처음 그림자를 드리우는 물체 갈래의 거리 재질(작다)뿐이다. 그 밖의 놓는 광원(아크로 · 보급선 · 폭발)은 그대로다.
  그 조합의 셰이더는 멈춘 동안 미리 짜 둔다(아래 '성능 정리 3' ⑪ `PRECOMP`) — 미리 짜기는 장면의 광원 **수**를 세므로
  새 광원도 `LIGHT.addPoint`/`addSpot` 으로 만들기만 하면 된다(불처럼 켜고 끄는 것이면 `addFire`).
  **불꽃 빛깔은 겉이 카민 · 속이 레몬**(사용자 요청 · `fireMats` 의 flame) — 더하기 섞음이라 겉은 1.25배, 속은 0.62배로 더한다
  (안 그러면 밝은 낮엔 겉이 묻히고 속이 하얗게 탄다). 번짐·광원은 주황(0xff7a2a).
  **램버트는 빛마다 제 그림자만 받는다**(사용자 요청으로 고침 · `initThree` 위 `fog_fragment` 바로 밑의 셰이더 조각 손질).
  r128 램버트는 정점에서 모든 직사광을 **하나로 합친 뒤** 모든 그림자를 곱한 값 하나(`getShadowMask`)를 통째로 곱했다 — 그래서 낮에
  모닥불이 그림자를 받으면 ① 불 그림자 거리(사거리+2 m) 밖 땅이 햇빛을 잃었고(r128 `getPointShadow` 는 거리 밖을 0 으로 셌다)
  ② 그 안에서도 불 그림자 줄무늬가 햇빛을 가렸고 ③ 해 그늘·구름 그늘이 불빛까지 깎았다. 이제 해(평행광 0번) · 그림자를 가진 점광원
  둘 · 그림자를 가진 집중광 하나는 정점에서 **세기만 따로** 세어(`vLambW` x·y·z·w, 양면이면 `vLambWB` — 빛깔은 화소에서 그 빛의
  유니폼으로 곱한다) 화소에서 **제 그림자만** 곱한다. 나머지 빛(횃불 · 보급선 · 그림자 없는 불)은 예전처럼 합쳐 그림자 없이 더한다.
  `getShadowMask()` 는 이제 **해 그림자만** 센다(물 `shM` · `envPatch` 의 구름 그림자도 해에만 걸린다). 거리 밖 점광원 그림자는 1.
  r128 은 그림자를 드리우는 광원을 배열 앞에 둔다(`castShadow` 순 정렬) — i 번째 그림자 지도가 i 번째 광원이다.
  **그림자 받는 점광원은 둘·집중광은 하나까지만 따로 센다** — 예산(`QUAL.pts`)을 3 넘게 올리면 넘친 것은 그림자 없이 더해지니
  `vLambW` 를 늘릴 것. 잰 값(같은 난수로 고치기 전·뒤): 한낮 모닥불 장면에서 불 그림자를 켜면 20 단계 넘게 어두워지는 화소 15.9% → 1.9%
  (남은 것은 불 바로 옆 불빛이 가린 자리 — 맞는 그림자다) · 평균 밝기 124.2 → 133.9(그림자 끔 135.5) · 밤 장면 그대로 ·
  불 없는 일곱 방향은 최대 1/255(곱하는 차례가 바뀐 반올림). 낮에 불 그림자를 끈 장면도 바뀐다 — 해 그늘 속에 불빛이 든다(③).
  **광원은 `LIGHT.addPoint`/`addSpot` 으로 만들 것** — `new THREE.PointLight` 를
  직접 쓰면 예산에 안 잡히고 감쇠도 옛 기본값으로 선다.
  **거리 감쇠는 `decay`=2 다** — 세기 × (1−거리/사거리)². Three 기본값 1 은 사거리까지
  일직선으로 줄어 불 바로 옆과 세 걸음 떨어진 곳이 별로 다르지 않았다. 대신 같은
  자리가 어두워지므로 **모든 광원 세기를 1.8배로 올려 잡아 두었다** — 새 광원도
  그 몫을 얹을 것. 해는 평행광이라 감쇠가 없다(거리감은 안개가 만든다). 품질은 설정의 '그림자'(끄기·낮음·보통·높음).
  **알파 카드(잎·수관 임포스터)는 `customDepthMaterial` 을 따로 줘야 한다** —
  안 주면 그림자 지도에 판때기 네모가 통째로 찍힌다.
  아레나 6개는 아직 옛 가짜 그림자를 쓴다.
- **하늘색은 구름·햇빛과 같은 둥근 대기(`ATM`)의 단일 산란 레이마칭이다**(`SKY_FS` · `skyScatter`).
  눈(2 m)에서 보는 쪽으로 16걸음(JS 12) 걸으며 걸음마다 보는 쪽 광학 두께 × 해 쪽 광학 두께
  (6걸음, 땅에 막히면 지구 그림자) × 위상(레일리 3/16π(1+μ²) · 미 코넷-섕크스 g 0.76)을 더한다.
  그래서 노을 띠(해 쪽 주황 → 위 보라, 반대편 분홍 띠·지구 그림자, 해 진 뒤 오존의 푸른 천정)가
  저절로 나온다. 예전 프리섬 식은 해가 지평선 밑이면 틀린 식이라 이게 안 나왔다.
  **다중 산란은 Hillaire 2020 의 다중 산란 표다**(`MSL` · `_msCell` · `msEnsure` · `msAt` — 사용자 요청 '알고리즘·수치를 실제 하늘과 같게').
  예전의 눈대중 어림(푸른 `SKYC` × 해 높이로 줄인 `_skyIll`)은 없앴다. 높이(√, 0~100 km 16칸) × 해 천정각 cos(−1~1 32칸)마다
  64 방향 × 20 걸음으로 2차 산란 L₂ 와 되돌아오는 몫 f 를 세어 Ψ = L₂/(1−f)(땅 반사율 `ATM.alb` 0.08) — 하늘을 걸을 때 걸음마다
  Ψ(그 자리 높이, 그 자리의 해 천정각) × 산란계수를 더한다. 한 표 0.22초 · 탁도 0.5 칸마다 따로(`MSL.cache` 24장) · 새 칸은 프레임마다
  3 ms 씩 짓는다. 셰이더엔 RGBE 8비트 32×16 텍스처(`MSL.tex` · 손 쌍선형 `msTex`). 잰 값: 다중 산란 몫 천정 25~45% · 해 진 뒤 −6° 천정이
  한낮의 약 1/1300(실측 박명과 같은 자릿수). **셰이더와 JS 가 같은 식이다 — 같이 고칠 것.**
  **에어로졸은 섬의 바다 공기 실측값**(`ATM.aod` 0.104 @550 nm — AERONET 섬 관측 바다 평균 0.11 @500 nm · 옹스트룀 0.6 ·
  단일 산란 알베도 0.97 → `ATM.mx` 1/0.97 · 비대칭 g 0.76) — 예전 옹스트룀 1.3·흡수 10% 는 도시·대륙 공기였다. 산란계수는 `atmBM(turb)`.
  레일리·오존·높이 척도는 Bruneton 2017 · Hillaire 2020 지구 값 그대로였다(그대로 둠).
  **하늘 톤은 ACES 뒤 sRGB 감마**(`_srgb` · 셰이더 `tone`) — 이 게임 색은 다 화면값인데 하늘만 선형 값을 그대로 내 한낮이 탁한 남색,
  노을이 지나치게 짙었다. 감마를 넣고 나니 같은 노출(`SKYP.exp`)로 천정 sRGB 가 실제 맑은 하늘 색도(x 0.25 · y 0.27 → 선형 0.55:1:1.64)와
  거의 같다(해 30° 천정 0.6:1:2.0).
  **구름 시험장이 `TERR_U`·`TLIT` 없이도 뜬다**(`envPatch` 가 없으면 빈 값 `_noTL`) — 땅 빛을 넣은 뒤로 시험장이 통째로 멈춰 있었다.
  **눈 순응**: 천정 밝기를 해 60° 때와 견줘 제곱근만큼(최대 16배) 노출(`SKYP.eye`)을 올린다.
  **하늘은 표(LUT)로 굽는다**(`SKY_LUT` 256×96 · 굽는 셰이더 `SKY_LUT_FS` · 몸통 `SKY_ATM`) — 하늘색은
  방향과 해·달 자리만으로 정해지므로 화소마다 걸을 까닭이 없다. 프레임마다 표를 한 번 굽고(2.5만 화소 —
  1080p 의 1/80) 돔(`SKY_FS`)은 표를 한 번 읽는다. 가로 = 방위(0.5 가 +z, 이어 붙임) · 세로 = √(고도/90°)
  (지평선 위 1° 안에 열 줄) · 지평선 밑은 지평선 줄. 해가 4.5° 넘게 떠 있으면 달 몫은 안 센다(`uMoonOn` —
  달빛 산란은 해의 1/300 이라 8비트에 안 잡힌다). 걸음은 10×4(예전 화면 셰이더 그대로) — 표가 작아서
  16×6 으로 되돌려도 값이 거의 안 든다. 구름 시험장에서 예전 돔과 견준 차이 평균 0.04~1.8/255.
  **표는 `updateSky` 가 굽는다** — 시작 화면·일시정지처럼 갱신이 멈춘 동안은 마지막 표를 쓰므로, 섬을 다 지은 뒤
  `generateWorld` 가 `updateSky()` 를 한 번 불러 둔다(안 그러면 첫 상륙 전까지 표가 빈 채다).
  **구름을 비추는 방향(`SKYL.dir`)은 해가 −11° 까지 해 쪽이다** — −3° 에서 달로 넘겼더니
  지평선 밑 해가 구름 밑면을 태우는 노을이 거꾸로 칠해졌다.
  **구름 그늘은 옆 하늘빛도 받는다**(`SKYL.ambS`/`ambA` → 셰이더 `uSkyS`/`uSkyA`) — 해 쪽 면은
  해 쪽 지평선 하늘빛, 반대쪽 면은 반대쪽 하늘빛(절반 눅임). 노을 구름 그늘이 보랏빛·분홍빛이 된다.
- **구름·땅이 받는 햇빛 색은 둥근 대기를 적분해 낸다**(`atmoTransmit` · `_atmOD` · `cloudLight` · `SKYL`).
  높이 h 에서 해 쪽으로 반지름 6371 km 지구 둘레 100 km 대기를 **실제로 걸어가며**
  레일리(8 km 척도, β 5.80·13.56·33.1 ×10⁻⁶/m) · 에어로졸(1.2 km 척도, 550 nm 광학 두께 0.1
  × 탁도/2.6, 옹스트룀 1.3) · **오존**(10~40 km 천막, 샤퓌 띠 0.65·1.88·0.085 ×10⁻⁶/m —
  해 진 뒤 높은 구름이 분홍·보라로 가는 것) 광학 두께를 더한다. 걸음은 빛줄기의 접점
  둘레로 몰아 준다(u² 간격). **빛줄기가 땅에 닿으면 막힌다 = 지구 그림자** — 예전의
  '지평선 내림각 + 0.9°' 어림을 대신한다. 해 원반 0.53° 를 세 점으로 나눠 반그림자,
  지평선 굴절(세뮌드손 식, 0° 에서 0.57°)을 넣는다. 같은 높이대(100 m)는 프레임마다
  한 번만 센다(`_atmCache`). 잰 값: 1.5 km 구름 — 해 5° (0.49,0.23,0.07) · 0° (0.07,0.008,0) ·
  −2° 그림자 / 9 km 권운 — −2° (0.33,0.07,0.005). 그래서 해가 진 뒤 낮은 적운부터 잿빛,
  높은 구름이 가장 오래 붉다.
  **색 순응**(`adaptWhite`): 땅 햇빛색 W(해 6° 밑은 6° 에서 멈춤)의 제곱근으로 나눠 반만
  흰색을 다시 잡는다(폰 크리스). 안 하면 해 10° 부터 구름이 살구색이었다. 구름 빛과
  땅 햇빛(`cSun`) 둘 다 나눈다. 밝기는 투과량의 제곱근으로 눅인다(눈이 어둠에 익는다).
  **알갱이 색 = 직사광 × r + 하늘빛 × g** — `instanceColor` 의 r 칸은 해를 받는 몫(해 쪽으로
  나온 만큼, `litPuff`), g 칸은 하늘빛을 받는 몫이다. 구름 셰이더가 `color_fragment` 를
  이 식으로 갈아 끼운다. 노을엔 직사광이 주황·빨강, 하늘빛이 파랑이라 **겹쳐서 분홍·
  보라가 되고 해 쪽과 반대쪽이 갈라진다.** 하늘빛(`SKYL.amb`)은 천정색을 반쯤 무채색으로
  눅인 것(구름 속에서 여러 번 흩어진다)이고, 어스름엔 3배까지 밝혀 쓴다.
  예전 `cloudTint`(땅에서 본 해 색 하나로 모든 구름을 물들임)는 이제 구름에 안 쓴다.
  **덩이 구름의 명암은 미세물리에서 센다**(`cloudSigma` · `litPuff` · 셰이더 `hg`).
  ① 소광계수 σ = 1.5·LWC[g/m³]/r_eff[µm] (1/m) — 표의 `lwc`·`reff`(적운 0.4·8 → 0.075/m ·
  적란운 1.0·12 → 0.125/m · 모루 혹은 얼음 `ICE` 0.05·30 → 0.0025/m). 물방울이 파장보다
  커서 소광이 색과 무관하다 — 구름이 희거나 잿빛인 까닭. 흡수는 없다고 본다.
  ② 알갱이마다 해 쪽·반대쪽·위·아래로 **실제 지나는 길이**(알 j 의 보이는 반지름
  0.45·rad 공을 가르는 현 × σⱼ)를 더해 τ 를 낸다. 알이 겹치므로 σ 는 **평균 겹침 수로
  나눈다**(`shapePuff` 가 잰다). ③ 구름 속 빛은 **확산** — 보존 산란 평판 두 흐름 해
  J ∝ 2(aτ반대+1)/(a(τ해+τ반대)+2), a=¾(1−g), g=0.85(`CLOUD_G`). 해 쪽 겉·속은 희고
  반대쪽 겉만 잿빛(적운 0.19). 한 방향 감쇠 1/(1+aτ) 만 썼더니 속이 까매 먹구름이 됐다.
  하늘빛(g 칸)도 위·아래로 같은 식. ④ **홑산란**: `instanceColor` 의 **b 칸은 이제 짙기가
  아니라 곧장 뚫고 온 빛 exp(−τ해)** 다. 셰이더가 헨예-그린스타인 위상함수(g 0.6, 평균 1,
  최대 10배)를 곱해 해를 마주 볼 때 얇은 가장자리가 빛난다(은빛 테두리). 층은
  `layerTone` 이 b=exp(−τ) 를 준다(얇은 권층운이 해 둘레에서 밝다).
  한계: 알갱이가 반투명(0.42)이라 해를 등진 덩이의 그늘진 앞면 뒤로 밝은 뒷면이 비쳐,
  실제보다 역광 덩이 가운데가 덜 어둡다.
  **회색도 산란이다 — 광학 두께로 센다.** 물방울(10 µm)은 파장보다 커서 모든 색을
  똑같이 흩뿌리므로 구름은 제 색이 없다(흰색). 회색은 **두꺼워서 빛이 몇 번이고 튕기다
  위로 되돌아 나가, 밑으로 새는 빛이 적은 것**이다. 물방울이 앞쪽으로 흩뿌리므로(g≈0.85)
  밑으로 새는 몫 ≈ 1/(1+0.75·τ·(1−g)).
  ① 덩이(`litPuff`): 알갱이마다 **해 쪽으로 빛줄기를 쏴** 다른 알갱이를 얼마나 깊이
  뚫는지(τs), **위로 몇 개가 덮는지**(τu)를 더한다(알 가운데면 `kap` — 적운 1.0 ·
  적란운 1.8). r = 0.35·exp(−τs) + 0.65/(1+0.75·τs·0.15), g = 0.85/(1+0.75·τu·0.15)+0.15.
  그래서 해 쪽 겉은 희고 밑동·속·반대편은 두께만큼 회색이다. **`kap` 2 는 너무 컸다** —
  한낮 적운이 옆면까지 칙칙했다. 알갱이 수의 제곱(적운 110 알 = 1만 2천 번)이라 **해가 움직였을 때만,
  나눠서** 다시 칠한다(아래 `litQueue`).
  ② 층(`layerTone`): 갈래마다 실제 광학 두께 `tau`(권층운 0.8 · 권적운 1.5 · 고적운 6 ·
  층운 12 · 층적운 14 · 고층운 25 · 난층운 90)에 알갱이마다 흔들기·가장자리 옅어짐을
  곱해, 밑면 밝기 T=1/(1+0.75τ·0.15) 를 r 로, T·0.6+0.22(땅에서 튕긴 빛)를 g 로 준다.
  예전의 높이 그늘(0.72~1)과 갈래별 고정 회색(`sh`)은 없앴다.
- **물은 셰이더가 계산한다**(`waterMat` · `WATER_U` · `waterElevTex`). 바다·강이 같은 재질이다
  (`uRiver`). 사인파 여덟 겹 — 빠르기는 심해파 분산 ω=√(g·k); 굵은 셋(21~62 m)은 정점을
  들어 올리고 잔 다섯은 화소 법선만 흔든다(멀수록 흐림). 프레넬(물 F0 0.02, 거친 물결이라 ×0.75)
  로 하늘(반사 높이로 지평선↔천정)을 비추고, 해 반짝임, 물속은 수심 d 만큼 빨강부터 먹는다
  (흡수 0.45·0.07·0.04 /m, 오가는 길 2d). 물가 0.5 m 안 거품, 알파는 수심으로 0 까지 내려 땅과 섞는다.
  **수심은 지형 높이 텍스처로 잰다 — 실수 텍스처를 쓰지 말 것**: 헤드리스(스위프트셰이더)가 못 읽어
  0 이 나와 물이 온통 거품이었다. 높이를 16비트로 R·G 두 칸에 나눠 담고 네 점을 손으로 보간한다.
  **재질은 램버트다 — 그림자를 받으려고.** 조명은 여전히 손수 세고 `outgoingLight` 를 통째로
  갈아 끼우지만, 램버트라야 그림자 지도가 붙고 `envPatch` 가 `cloudSh` 를 단다(`waterMat` 안에서
  바로 부른다). 그림자(`shM`)는 **직사광 몫만** 가린다 — 물속으로 드는 햇빛·반짝임·거품의 해 몫.
  하늘 반사는 그늘에서도 그대로다(실제로 물 그늘은 물빛만 어두워진다).
  **물 셰이더의 시각은 `uWT` 다** — `envPatch` 가 바람 시계 `uTime` 을 정점 셰이더에 따로
  선언해서, 같은 이름을 쓰면 '재정의' 오류로 물이 통째로 안 그려졌다. CPU 로 정점 흔들던
  `updateOcean` 은 이제 시각만 넘긴다. 바다 격자 220² (15 m).
- **물빛은 실제 광학으로 센다**(`waterMat` 화소 셰이더). 편광 없는 프레넬 정확식(n 1.333) · 굴절(스넬) ·
  흡수 a = 순수한 물(0.45·0.0565·0.0145 /m) + 바다(식물 플랑크톤·용존 유기물 소량) / 강(흙탕·유기물 짙게) ·
  후방산란 bb = 물(λ⁻⁴·³) + 입자 · 무한 수심 반사 R∞ = 0.0949u+0.0794u²(고든, u=bb/(a+bb)) ·
  얕은 곳은 바닥 반사(바다 모래 · 강 진흙)를 e^(−K·d) 로 섞는다 · 수면 통과 0.52/(1−1.7r)(리).
  **먼 물결은 화소 발자국으로 거른다** — 화소 하나가 덮는 수면 길이(`foot` = 거리×0.0016/sinθ)의
  4배보다 짧은 물결은 법선에서 걷어 내고, 걷어 낸 기울기 분산(`lost`)을 거칠기로 돌려 반짝임 꼬리를
  넓힌다(에너지 보존). 안 거르면 한 점 표본이라 수평선에 자글자글한 에일리어싱 무늬가 섰다.
  **아직 없는 것** — 하늘 반사는 지평선↔천정 두 색 사이일 뿐 구름·섬·해가 비치지 않고, 물체 반사도 없다.
  **눈→물 방향은 `vVD`(카메라 공간 위치를 뷰 회전으로 되돌린 것)로 잰다 — `cameraPosition` 을 쓰면
  프레넬이 엉뚱해져 한낮 바다가 잿빛 거울이 됐다**(이것이 '물이 회색' 의 원인이었다).
- **하구는 흙탕물 띠로 바다에 섞인다**(사용자 지적 — 강과 바다가 만나는 데서 초록 강물과 남색 바다가 칼로 자른 듯 금을 그었다 · `riverPlume` · 물 셰이더 `plumeAt`·`rv`·`sed` — 20-terrain.js).
  ① 섬을 지을 때(`buildWater`) 물길 칸(F.river)을 씨앗으로 **바다 칸(물길 아님 · 표고 < 0.3)만 지나며** 거리를 재(8방 두 번 쓸기) 몫 exp(−거리/`PLUME_L` 8칸)을
  **높이 텍스처(`waterElevTex`)의 알파 칸**에 담는다(아무도 안 읽던 칸 · 몫 0.02 밑은 0 · 물길 칸은 1). 섬 생김새는 안 건드린다.
  ② 물 셰이더는 강/바다를 `uRiver` 로 딱 가르던 것을 **강물 몫 `rv`** 로 섞는다 — 강 판은 수면이 바다 높이로 내려올수록(`fr`) 물빛뿐 아니라 물결 세기 · 반사 상한 · 윤슬 ·
  깊이 몫(0.6)까지 바다 값이 되고, 바다는 0(예전 그대로). ③ **흙탕물 `sed`** = 띠 몫(강 판은 하구 쪽 1−fr 만) × 느리게 흐르는 잡음 — 흙 알갱이 산란 bP +6 · 흡수 파랑 쪽 +0.18.
  두 판이 만나는 데서 값이 같고 바다 쪽으로 옅어진다. 강에서 먼 바다는 몫 0 이라 식이 그대로다(mix(…,0)).
  잰 값(배율 2 · 바다 높이 강이 열린 바다로 빠지는 하구 · 한낮 · 같은 자리 전후): 하구 앞 물빛 초록 27 → 36 · 33 → 39(바다 쪽으로 옅어짐) · 수평선 쪽 차이 0~0.55 · 땅 0.09.
  **물빛은 흐린 바닥으로 센다**(같은 신고 — 사용자 사진은 강이 아니라 **바다 밑이 수십 m 안에 3 → 15 m 로 꺼지는 데**였다(배율 6 · (−2574, 426) · 물길 없음):
  얕은 청록이 깊은 남색으로 칼로 자른 듯 · 곧은 금으로 바뀌었다). `buildBedBlur` 가 표고를 −60~4 m 로 잘라 반경 `BED_BLUR`(45 m) 상자 흐림 두 번 → 8비트 `uBedB`(직선 보간) ·
  바다의 바닥 비침 e^(−K·d) 만 이 깊이로 센다(`dO` — 진짜 깊이 4 m 안은 진짜보다 얕게 안 센다: 흐린 바닥에 뭍 높이가 섞여 물가에 모래 빛 띠가 섰다).
  물가 알파 · 거품 · 헤엄은 진짜 깊이 `d` 그대로 · 강 판은 제 깊이. 잰 값(그 자리 · 한낮 · 위→아래 띠): 깊은 덩어리 속 밝기 12 → 17 · 20 단계 바뀌는 폭 69 → 81 화소.
  **아직 남은 것** — 가파른 골짜기 벽을 덮은 강 판이 새까맣게 그려지는 데가 있다(배율 2 · (360, −155) 둘레 — 판을 끄면 땅이 밝다 · 깊이 d 가 커서로 보인다 · 안 고침).
- **땅의 대기 원근은 `fog_fragment` 를 갈아 끼운 것이다**(`initThree` 바로 위). 빛깔마다 비어-램버트
  감쇠(파랑이 먼저 사라진다, 0.93·1·1.12) + 들어오는 빛 = 보는 쪽 지평선 하늘색(`tone3`).
  짙기 = 레일리 + 에어로졸(탁도) + 비 + 안개. r128 은 `fogDepth` 다(`vFogDepth` 아님).
  아지랑이가 더 이상 나무가 사라지는 자리를 가리지 않으므로 **`VIEW_DIST` 는 450** 이다.
  바이옴 색(`BIOME_INFO`)은 실제 지표 반사율 값에 맞춰 다시 잡았다.
- **땅 잡음은 돌린 좌표 두 겹의 평균이다**(`vn` = `vn1` 둘, 5차 보간) — 값잡음 한 겹은 x·z 축을 따라
  네모진 결이 남아 땅이 바둑판처럼 보였다. 대비도 옅게 잡았다(큰 ±13% · 중간 ±7% · 잔 ±9% · 요철 명암 0.35).
- **발밑 결(30 m 안 · `terrainMat` 끝)** — 흙 알갱이 3·8 cm 두 겹 · 22 cm 보로노이 칸의 일부가 **잔돌**(풀빛 땅 2.5% · 맨땅 8% · 비탈 +18% · 칸마다 납작하게 눕혀 돌리고 둘레를 각진 잡음으로 깎는다 — 둥글면 동전이 깔린 것처럼 보였다,
  해 쪽 면 밝고 테두리 그늘) · 풀빛 땅엔 한 방향으로 늘인 잡음으로 **풀잎 결** · 잔 요철 낮은 데 **오목 그늘**. 세기는 (1−거리/30)².
- **가지·줄기는 곧은 원기둥이 아니다**(`gnarl(g,f,H)` — 원기둥 정점을 t(밑동 0→끝 1)·θ·r 로 받아 반지름·옆 밀기를 돌려준다).
  가지 `limbUnit` 은 4각 6마디, 위로 활처럼(1.25 굵기) + 옆으로 S 자(0.5 굵기) 굽고 마디마다 굵기 ±8% —
  **굽힘은 양 끝에서 0** 이라 곁가지·잎이 붙는 자리가 안 바뀐다. 굽는 폭이 굵기 단위인 까닭은 인스턴스가 x·z 를 굵기로 늘려서다.
  줄기는 8각 10마디 · 밑동 판근(참나무 다섯·전나무 여섯 갈래, 지름 최대 1.6배) · 위로 갈수록 0.16 m(참나무)·0.07 m(전나무)까지 굽음 ·
  세로 골 ±4% · **밑동을 0.2 m 땅에 묻는다**(`propOff` 참나무 2.4 · 전나무 3.3). 굽는 폭은 가지가 붙는 높이의 줄기 반지름 안이다(넘으면 가지가 줄기에서 떨어져 보인다). 가지 삼각형 6 → 48 이라 무거워졌다.
- **곁가지는 굽은 어미 가지 위에 붙인다**(`limbBend`) — 곧은 중심선에 붙였더니 어미가 활·S·꺾임으로 굵기의 최대 ~3배 비켜 있어 잔가지가 허공에 떴다. `limbBend` 가 지오메트리 굽힘(긴 6마디 활 1.25+S 0.5 · 짧은 2마디 활만)과 **셰이더 꺾임을 같은 식으로** 다시 세어(씨앗 = 인스턴스 자리 float32, `h=fract(dot(자리,(0.0371,0.0213,0.0517))+seg·0.3183)` · k=fract(h·137.13+0.123) · k2=fract(h·71.37+0.567)) 줄 사이를 이어 곁가지 밑동을 민다. **꺾임 식을 바꾸면 `barkMat` 과 `limbBend` 를 같이 고칠 것.** 세계 자리가 필요해 행렬을 쓰는 두 번째 돌림에서만 쓴다(`p._org`). 끝 갈래는 끝이 0 이라 그대로.
- **나무껍질 · 꺾인 가지는 셰이더다**(`barkMat(색, 'trunk'|'limb'|'far')`). ① 가지는 6마디 정점 줄마다 인스턴스 자리로 씨앗을 뽑아
  옆으로 ±1.2 굵기 밀어 **마디에서 꺾이는** 지그재그(양 끝 줄은 0 — 붙는 자리 그대로 · 가지마다 다름 · 정점 안 늚). 곁가지는 `limbBend` 가 같은 꺾임을 따라 붙인다. ② 껍질 — 둘레(m)를 0.13 m 골 줄로 나눠 구불구불한 세로 골(너비 흔듦) ·
  줄마다 길이 다른 판을 가로 금으로 끊음 · 판 밝기 · 한쪽 면 밝힘 · 잔 세로 결. 좌표는 둘레각 × 길이 m(`vBk`). 먼 복제는 `LIMB_FAR_MAT`(꺾기 없음 — 굳힌 지오메트리라 인스턴스 씨앗이 나무 하나다).
- **땅 표면은 화소마다 칠한다**(`terrainMat` · `TERR_U`). 정점 색(바이옴) 위에 값잡음 세 겹(40·6·0.8 m,
  잔 겹은 120 m 밖에서 사라짐)과 70 m 색조 얼룩, 가파른 비탈(법선 y 0.82→0.62)엔 높이를 따른 층리가
  있는 바위, 잔 얼룩 기울기 · 해 방향으로 요철 명암(해가 낮을수록 짙다 — 램버트는 정점 조명이라
  화소 법선을 흔들 수 없어 색으로 흉내 낸다). 대비가 약하면(±12%) 전혀 안 보였다.
- **`envPatch` 는 앞서 단 `customProgramCacheKey` 를 이어 붙인다** — 덮어쓰던 때는 제 셰이더를
  가진 램버트 재질(땅)이 다른 재질의 프로그램을 빌려 써서 제 코드가 통째로 빠졌다(오류 없이!).
  새 재질에 `onBeforeCompile` 을 달면 **꼭 고유한 캐시 키도 줄 것.**
  **램버트 셰이더에서 거리를 `cameraPosition` − 세계 좌표로 재지 말 것** — 본편에서 0 이 아니라
  엉뚱한 값이 나와 '가까이서만 보이는 무늬'(땅 잔결·암석 반점)가 통째로 꺼져 있었다. 정점에서
  `modelViewMatrix*위치` 로 카메라 공간 거리를 넘겨 쓴다(`vTD`·`vRV`). 방향도 카메라 공간에서 센다.
  **본편 사진이 `--shot` 에서 30초 시간 초과로 자주 실패한다**(무거워졌다) — `--run` 안에서
  `renderFrame()` 직후 `renderer.domElement.toDataURL()` 을 돌려받아 파일로 풀면 찍힌다.
- **그림자 색도 산란이다** — 그늘진 땅은 햇빛 대신 하늘빛만 받는다. 하늘빛(`hemi`)과
  환경광(`amb`)의 **색**을 천정색(+지평선색 30%)에 맨다(세기는 여전히 `SKY` 표).
  한낮 그늘은 푸르스름, 노을녘은 보랏빛, 흐린 날은 잿빛이 저절로 된다.
- **구름 그림자가 땅에 진다**(`CSH` · `updateCloudShadow` · `envPatch`). 사람 둘레 8 km
  네모에 떠 있는 구름 알갱이를 **해 방향으로 땅에 비춰** 두께(τ)를 쌓고, 땅은 exp(−τ)
  만큼만 볕을 받는다. 판 둘 — 잔 판 256²(31 m, 적운까지) · 굵은 판 48²(167 m, 막의
  수 km 짜리 알). 0.4초마다 다시 쌓는다. **모든 램버트 재질의 '해 빛×해 그림자' 자리
  (`getShadowMask()` — 이제 해 몫에만 곱한다, 위 '램버트는 빛마다 제 그림자만')에 `cloudSh()` 를 곱한다** — 그래서 구름 밑에선 물체 그림자도
  저절로 사라진다. `LIGHT.refresh` 가 씬을 훑을 때 재질마다 한 번 붙인다(본편 1,280개).
  해 높이 0.15 밑에서는 서서히 끈다. 이 때문에 **해 세기를 구름양으로 깎지 않는다**
  (`WEA.lightSun`) — 구름 몫은 그림자가 자리마다 한다. 그림자가 꺼지는 밤·노을녘에만
  예전처럼 구름양으로 깎는다. 선 자리의 볕(`CSH.sunVis`)은 환경광을 조금 줄인다.
  **적란운 밑은 폭 10 km 가 통째로 그늘이다** — 버그가 아니다.
- **바람에 풀·나무가 흔들린다**(같은 `envPatch` · `WIND_GLSL`). 재질에
  `userData.wind`('grass'·'reed'·'limb'·'leaf')를 적어 두면 정점을 세계 좌표에서 바람
  쪽으로 민다. 풀은 잎날 높이의 제곱(밑동은 박혀 있다), 가지는 밑동에서 끝으로 갈수록
  (`limbUnit` 이 밑동 원점·길이 1 이라 `transformed.y` 가 곧 가지 위 자리다), 잎은 통째로
  + 잔 떨림. 흔들림 위상을 자리에 따라 바람 쪽으로 밀어 **바람결이 풀밭을 쓸고 간다.**
  세기는 `WEA.wind`(고기압 잔잔 · 전선·적란운 돌풍). 잎 그림자(`customDepthMaterial`)도
  같이 흔든다. 풀 그림자는 기본 깊이 재질이라 안 흔들린다(풀이라 눈에 안 띈다).
  **줄기는 안 흔든다** — 가지 끝이 줄기에 붙어 있어야 해서다. 시험장 가운데에 풀밭
  한 뙈기(6천 포기)를 깔아 두었다.
  **새 재질에 `onBeforeCompile` 을 붙일 때는 `envPatch` 가 앞의 것을 이어 부른다는
  것을 기억할 것** — 순서가 바뀌면 `project_vertex` 를 두 번 갈아 끼운다.
- **달은 해와 따로 선다**(`MOON` · `moonDisc`/`moonMat`). 삭망월 29.5일이고 **30일째로 넘어가는 자정(`dayNo()` 30 · 절대 29×24 시)에 딱 보름**(위상 0.5)이 되게 맞췄다(그래서 첫날은 상현 무렵). 달을 해의 자리에서 위상만큼
  돌린 곳에 둔다(삭이면 해 옆, 망이면 해 반대편 — 뜨고 지는 시각이 날마다 밀린다).
  **위상각 α 는 삭망월에서 바로 센다**(`MOON.alpha` = π·|1−2·phase|) — 하늘의 해·달 길이 기운 원뿔(z 0.37)이라
  자리로 재면 둘이 정반대에 못 서서 보름이 41° 에 머물렀다.
  **얼굴**(`makeMoonFace`, 512²)은 앞면의 실제 바다 배치(폭풍의 대양·비·맑음·고요·위기…)와 티코·코페르니쿠스 광조.
  **위상은 오려 내지 않고 공으로 비춘다**(셰이더 `MOON_FS`) — 빛 방향 = 원판 위 해 쪽 t·sin α + 눈 쪽·cos α,
  반사는 **로멜-젤리거** μ₀/(μ₀+μ)(보름달은 가장자리까지 고르다), 명암 경계는 알베도로 조금 거칠게,
  어두운 쪽엔 **지구빛**(초승·그믐에 잿빛)을 얹고 밤엔 불투명해 별을 가린다.
  **밝기는 밝은 면적이 아니다**(`moonBright` — 충 효과, 등급식 0.026|α|+4e−9α⁴: 상현 9% · 초승 2.5%).
  **밤의 밝기**: 조도(lx) = 0.26·밝기·sin(고도)·대기 소광 + 별빛 0.002(구름이 깎는다) → **보정 없이 조도 그대로**
  쓴다(`MOON.perc` = 조도/0.26 — 보름 천정 1 · 상현 약 0.09 · 달 없음 약 0.008. 예전엔 눈 순응이라며 0.45제곱(상현 0.36 · 달 없음 0.12)이었는데 사용자 요청으로 없앴다). 이걸 밤 광원(0.16·달 몫)·`amb`(×1.5)·`hemi`
  (0.18 바닥값도)에 곱하고, 해가 −3°→−18° 로 내려가는 동안(`nightK`) 넘어간다. 보름 천정에선 광원이 0.12 를
  넘어 **달 그림자가 진다.** 구름·하늘 돔의 달빛(`SKYL.illum`·`uMoonK`)도 같은 `MOON.bright` 를 쓴다.
- **해는 원판 + 빛무리다**(`sunDisc`·`sunGlow` · `SUN_FS`/`GLOW_FS`). 주연 감광 1−0.6(1−μ) · 빛깔은 `cSun` ·
  지평선에서 굴절로 0.8배 납작 · 밝기 `uK`(높으면 4 — 가장자리까지 하얗게 타야 한다. 1.6 이었을 때 한낮 해가
  빛무리 속에서 속 빈 고리로 보였다) · 빛무리 폭은 탁도·안개를 따른다. 해·달 원판은 둘 다 각반지름 약 1°(`SUN_R`·`MOON_R`, 실제의 4배).
- **`updateSky` 는 물·땅 유니폼(`WATER_U`·`TERR_U`)이 있을 때만 건드린다** — 구름 시험장은 하늘 구역만 베껴
  가서 물이 없다(물 셰이더를 넣은 뒤 시험장이 통째로 멈춰 있었다).
- **구름은 갈래 아홉이 표 하나다**(`CLOUD_KINDS` · `buildClouds`/`updateClouds`).
  권운·권층운·권적운·고적운·고층운·층적운·층운·적운·적란운 — 갈래마다 높이대·크기·
  개수·짙기·흐르는 속도가 다르다. **고도·크기·두께·속도가 전부 실제 값(m)이다**
  (권운 7~11 km · 고적운·고층운 2.5~5 km · 적운 밑동 0.9~1.6 km · 층운 150~500 m ·
  적란운 꼭대기 10~13 km). 예전에는 하늘을 1/3~1/8 로 압축해 권운을 1.1 km 에
  뒀는데, 압축률이 층마다 달라 낮은 구름이 실제보다 1.6~2배 크게 보였고
  적란운 밑동이 땅에 닿았다.
  **하늘은 따로 그린다**(`skyScene`·`skyCam`·`renderFrame`). 땅 카메라(far 3000)로는
  9 km 권운에 닿지 않는다. 하늘 카메라(near 20 · far 250 km)가 해·달·별·하늘 돔·
  구름을 먼저 그리고, 깊이만 지운 뒤 땅을 덧그린다(구름은 늘 땅보다 멀다).
  그래서 **`scene.background` 는 null 이다** — 하늘색은 `skyScene.background`.
  물속이면 `skyUnder` 를 세워 하늘 대신 물빛으로 칠한다. **하늘에 뭘 더하면
  `skyScene` 에 넣을 것** — `scene` 에 넣으면 땅 카메라 far 에서 잘린다.
  **갈래마다 그리는 반경 `R` 이 다르다**(층운 6 km ~ 권운 45 km — 대략 그 구름이
  지평선 위 6~10° 로 보이는 거리). 반경 끝 40% 에서 **지평선 색으로 스러진다**
  (대기 원근 — 흰 채로 끊기면 하늘 가장자리에 테가 선다). 반경을 늘리면 같은
  구름양을 채우는 데 개수가 넓이만큼 늘어난다(적운 20 km 에 300 덩이) — 그래서
  **화면 밖 덩이는 거른다**(`cloudBounds` — 덩이마다 판 모양을 복제해 제 경계구를
  준다). **r128 의 `InstancedMesh` 는 만들 때 `frustumCulled` 를 스스로 끈다** —
  경계구를 달아도 이걸 다시 켜지 않으면 등 뒤까지 다 그린다(370 → 켜고 나서 115).
  **대기 원근은 셰이더에서 섞는다**(`cloudShader` · `uHaze`/`uHz`): 화소 =
  구름×(1−a) + 지평선색×a. 재질 `color` 는 곱하기라, 지평선 색 쪽으로 끌어도
  알갱이 그늘이 다시 곱해져 먼 적운이 짙은 잿빛 떼로 줄지어 섰다.
  **덩이 밑동은 평평하다** — 응결 고도에서 생기므로. 밑쪽 알갱이의 아랫끝을 전부
  0 에 앉힌다. **볕 받는 쪽이 밝다**(`litPuff` — 덩이 가운데에서 해 쪽으로 나온
  만큼. 밤엔 `sun` 이 달 쪽이라 달빛 쪽이 밝다).
  **명암은 대기열이 나눠 칠한다**(`LIT` · `litQueue` · `litPuffRange`). 예전엔 덩이마다 2~6초마다 통째로
  다시 칠해 한 프레임에 몇 덩이가 겹치면 수십 ms 가 튀었고, 배속 20배에선 한 프레임 80 ms 였다. 이제
  ① 덩이가 마지막으로 칠한 해 방향(`c.litDir`)에서 **1.5°(가까운 덩이)~6°(반경 끝) 넘게 돌았을 때만** 후보가 되고
  (해는 초당 0.25° — 가까운 덩이 6초 · 먼 덩이 24초에 한 번) ② 낡은 정도 순(화면 밖은 0.3배)으로 줄 세워 ③ **프레임마다 1.2 ms(`LIT_BUDGET`, 배속이면 √배·최대 4배) 안에서 16알씩
  (`LIT_CHUNK`)** 칠한다 — 덩이 하나를 여러 프레임에 걸쳐 칠해도 같은 해 방향(`job.dir`)으로 끝까지 칠한다.
  갓 빚은 덩이(`shapePuff`)는 `litNeed` 로 맨 앞에 선다. **다시 굴리기(`rerollCloud`)도 프레임마다 2 ms
  (`REROLL_BUDGET`)** 까지만 — 날씨가 건너뛸 때 한 프레임에 덩이 수십 개를 빚어 1.7초가 멈췄다. 반경 밖으로 멀어진
  덩이를 되굴리는 길도 같은 예산이다(넘치면 그 프레임엔 숨겨 둔다) — 순간이동(불러오기·되살아나기·상륙) 첫 프레임 31 → 6 ms.
  **칠하는 일은 Web Worker 가 한다**(`litWorker` · `litShapeSend` · `litDone`) — 계산 핵심 `litCore` 를 본 스레드와 워커가 같이
  쓴다(워커는 `litCore.toString()` 을 그대로 가져간다 — **`litCore` 안에서 바깥 이름을 부르지 말 것**, 인자로 받는다).
  덩이를 빚을 때(`shapePuff`) 알갱이 자리·반지름·소광(Float32Array 그대로)을 보내고, 대기열이 일을 맡기면(동시 `LIT_INFLIGHT` 3)
  색만 받아 `instanceColor` 에 올린다. 세대(`litGen`)가 바뀌었거나 사라진 덩이의 결과는 버린다. 워커를 못 만들면 예전처럼
  본 스레드에서 1.2 ms 씩 나눠 칠한다(섬을 지을 때도 본 스레드 — `LIT.defer` 전).
  `cloudLight` 의 담아 두기 열쇠는 숫자다(해·달 고도 1 mrad · 탁도 0.01) — 예전 글자 열쇠는 거의 매
  프레임 바뀌어 담아 둔 것을 다 버렸다. 잰 값(시험장 240프레임): 합 3,563 → 1,110 ms · 가장 긴 프레임 1,733 → 15 ms.
  **같은 갈래 안에서도 개체마다 다르게 생겼다** — 갈래마다 밑그림을 `CLOUD_VARIANTS`
  장(12장) 그려 두고(`cloudTex`, 캔버스 · 외부 파일 없음 — 108장 28MB), 개체는
  그중 하나를 골라 제 크기·
  좌우 뒤집기·기울기로 선다. **재질은 개체마다 복제한다** — 나눠 쓰면 짙기가 마지막
  구름 것으로 통일된다(그림은 그대로 나눠 쓴다).
  개수를 `[0, n]` 으로 뽑으므로 **세상마다 없는 갈래가 생긴다** — 그게 하늘이 날마다
  다른 이유다(한 하늘에 17~27장).
  **흐르는 속도 `v` 는 실제 m/s 다**(권운 30 · 적운 8). 고도도 실제라 각속도가
  저절로 맞는다 — 높은 구름이 빨라도 느려 보인다.
  **전체 빠르기는 `CLOUD_SPD`(3) 한 개로 올린다** — 이 게임의 시간이 실제보다 60배
  빠르므로, 해가 24분에 하늘을 한 바퀴 도는 옆에서 구름만 실제 빠르기로 흐르면
  붙박이처럼 보인다. 배율은 갈래 사이의 비율을 건드리지 않으니 높은 구름이 느려
  보이는 성질은 그대로다. 하늘을 가로지르는 데 4~6분(실시간)이다.
  시간 배속(T)을 올리면 구름도 같이 빨라지되 20배에서 끊는다. `fog:false`(구름은 안개보다 위다) · 바람을 타고 흐르다 멀어지면 반대편
  으로 돌아온다 · 색은 `updateSky` 의 광원색을 따라가 노을에 붉고 밤에 검푸르다.
  **줄지어 찍으면 인공물로 보인다** — 권적운을 격자에 도장 찍듯 그렸더니 한눈에
  가짜였다. 지금은 무리 몇 덩이를 잡고 그 안에서 물결을 따라 간격·크기를 흔들며,
  가장자리로 갈수록 작고 성기게 한다. 규칙적인 배열은 전부 이렇게 흐트러뜨릴 것.
  **밑그림은 네 변을 반드시 흐려서 끝낼 것**(`cloudTex` 끝의 공통 처리, 테두리
  16%). 캔버스 끝까지 그리면 판때기가 끝나는 자리가 하늘에 **직선으로 그인다** —
  새털 가닥이 중간에서 뚝 끊기고 솜뭉치 한쪽이 칼로 자른 듯 평평해진다.
  처음엔 막(`veil`)에만 넣었다가 나머지 갈래에서 그 금이 그대로 보였다.
  **땅 카메라 `camera.far` 는 3000 이다** — 구름은 이제 하늘 카메라가 그리므로
  이 값과 상관없다.
- **날씨에는 차례가 있다**(`updateWeather`). 예전에는 구름양 하나가 값잡음으로
  오르내리고 갈래마다 '이 구간이면 뜬다'(`at`)였다 — 실제 일기의 차례도, 하루
  변화도 없었고, 비를 내리는 난층운이 아예 없었다. 지금은 **저기압 한 바퀴의
  위상 φ**(평균 5일 · `WEA_CYC`)가 흐르고 위상마다 뜨는 구름이 정해져 있다:
  고기압(적운이 낮에 피고 저녁에 사그라듦 · 바다 층적운이 밤·새벽에) → 온난전선
  (권운 → 권적운 → 권층운 → 고적운·고층운) → 난층운 큰비 → 온난역 층운·층적운
  이슬비 → 한랭전선 적란운 소나기 → 갬(적운). 머리말에 위상 표가 있다.
  **저기압 세기(`cycS`)는 구름이 오느냐 마느냐를 정한다 — 두께가 아니다.** 세기에
  비례해 옅게 했더니 보통 저기압에서도 하늘이 반쯤만 덮여 흐린 날이 11% 뿐이었다.
  전선의 고층운·난층운은 오면 하늘을 다 덮는다.
  갈래마다 **하늘 점유율** `WEA.amt` 를 정하고 **덮는 넓이로 개수를 낸다** —
  무리를 제멋대로 흩으면 겹치므로 N 개가 덮는 몫이 1−exp(−N·A/πR²) 이고, 거꾸로
  `N = −ln(1−amt)·πR²/A` (A 는 `kindArea` — 덩이는 화면을 훑어 잰 보이는 폭 비율,
  층은 무리 넓이 × `fill`). 전체 구름양 `cover` 는 1−Π(1−amt).
  **시드와 시간만으로 정해진다 — 저장할 것이 없다.**
  **날씨는 ISCCP D1 북반구 중위도(30~65°N) 기상 상태 9개를 섞어 만든다**(`WS_PROF` · `WEA.ws`). 중심값 파일
  `D1_MN_all.cent9.1`(구름 꼭대기 기압 7 × 광학 두께 6 칸)을 ISCCP 갈래 아홉으로 묶어 상태마다 구름 조성(%)과
  전체 구름양을 표로 넣었다. 저기압 한 바퀴의 위상 창 길이 = 상태의 출현 빈도(WS5 권운 → WS2 권운·권층운 →
  WS1 전선 난층운·권층운(비) → WS3 두꺼운 고층운(비) → WS8·WS7 층적운 → WS4 고적운 → WS6·WS9 맑은 쪽).
  약한 바퀴는 전선 상태가 빠진다. 갈래끼리 겹친다고 치므로(1−Π(1−a)) 상태마다 배율 `_f` 를 풀어 전체가 표의 tot 이
  되게 한다. **WS6(거의 맑음, 평균 40%)은 날마다 0~2.8배로 흔든다** — 평균 그대로면 맑은 날이 한 번도 없었다.
  비는 WS1(1) · WS3(0.8) · WS8(0.2 이슬비) 몫과 적란운 소나기다.
  잰 값(60일 × 시드 8): 전체 65%(ISCCP 72%) · 맑음 17% · 흐림 40% · 비 18% · 권운 21 · 고적운 17 · 층적운 18 ·
  적운 19 · 고층운 15 · 권층운 11 · 난층운 9 · 층운 4 · 적란운 2%.
  재는 법: 날씨 식만 떼어 node 로 돌린다(`WEA_CYC`~`let clear=1` 구간을 eval — 시험장은 헤드리스에서 안 뜰 때가 있다).
  아래는 **예전** 값이다.
  **60일(게임) 돌려 잰 값**(실제는 선박 관측 해양 기후도의 대략값, 기억에 기댄 것):
  평균 구름양 0.56(실제 ~0.65) · 맑음 15% · 흐림 26%(~25%) · 비 18%(~12~18%) ·
  층적운 46%(~45%) · 적운 26%(~33%) · 적란운 9%(~10%) · 고층운 15%(~15%) ·
  난층운 10%(~10%) · 권운 46% · 고적운 37%. 적운은 15시가 가장 많고(0.15) 새벽엔
  거의 없다. 다시 잴 때는 시험장에서 `gameHours` 를 반시간씩 밀며 `updateWeather()`
  만 부르면 된다(구름을 안 그려도 된다).
  **층적운은 덩이가 아니라 층이다**(층운형 — `ripple` 에 `gapf` 0.8 로 줄 사이를
  좁혀 거의 이어진 혹 판). **난층운 추가**(1.2~2.2 km · 두께 1.5 km · 짙은 잿빛).
  **날씨가 건너뛰면**(불러오기·시험장 슬라이더·첫 프레임 — 위상이 한 번에 0.02 넘게
  바뀜) 2초 동안 새 구름을 **하늘 전체에 흩어 세운다**(`WEA.jumpT`). 평소처럼 바람
  위쪽 가장자리에서만 들이면 하늘이 채워지는 데 수 분이 걸려, 큰비인데 머리 위가
  파랬다.
  **그리는 차례는 고도다**(`cloudOrder` — 높은 구름 먼저). 투명한 것은 무리 가운데
  거리로 앞뒤를 정하는데, 높이가 다른 층끼리는 틀린다(9 km 권운이 2 km 난층운 앞에
  그려졌다). **대기 원근·반경 끝 스러짐은 화소마다 제 거리로** 잰다(`vCD`) — 무리
  가운데 거리로 쟀더니 폭 40 km 난층운이 머리 위에서까지 지워졌다.
  구름은 **못수만큼 미리 만들어 두고 짙기로 여닫는다**(한 번 여닫는 데 25초).
  `rerollCloud` 로 **다시 굴린다**(그림·크기·자리·짙기) — 그래서 개었다 흐려지면
  아까 그 구름이 아니라 다른 구름이 뜬다. 되살아나는 자리는 **바람이 불어오는 쪽
  가장자리**다(하늘 한복판에 불쑥 나타나지 않게).
  **굴리는 때는 사라질 때가 아니라 다시 불릴 때다.** 처음에 다 옅어지는 순간에
  굴려 세워 뒀더니, 죽은 뒤에도 흐르기·되돌려보내기가 계속 돌아 그 자리가
  남아나지 않았다 — 날씨가 다시 부를 무렵이면 엉뚱한 데, 심하면 머리 위였다.
  **죽은 동안에는 흐르지도 않는다.**
  **멀어진 구름도 그대로 돌려보내지 않고 다시 굴린다**(제 반경 `R`×1.25 밖). 예전에는
  반대편에 그대로 옮겨 놓았는데, 그러면 **날씨가 그대로인 동안 같은 구름 스무 장이
  영영 돌기만 하고 새 구름이 나지 않는다.** 날씨가 바뀔 때만 새 구름이 나서는
  한 자리에 오래 서 있으면 하늘이 굳는다. 돌려보낼 때 `vis` 를 0.04 로 낮춰
  멀리서 스며들듯 나타나게 한다(툭 튀지 않게).
  **판때기 한 장이 하늘 전체가 되게 두지 말 것.** 눕는 구름(`sheet`)을 사람 머리
  바로 위에 세우면 폭 1.9 km 짜리 한 장이 하늘의 81° 를 덮어, 256px 밑그림이
  6 m/텍셀로 늘어난 흐릿한 띠 하나가 화면을 다 차지한다. 지금은 **제 지름만 한
  거리 밖**(`|w|×0.62`)에 세우고 권운·권적운을 작게·여럿으로 바꿨다(한 장 최대 39°).
  하늘을 통째로 덮으라고 만든 막(`veil`)만 예외다.
  **이제 판때기(`sheet`)로 서는 갈래는 없다.** 꼴은 셋이다 — `puff`(솟은 덩이) ·
  `layer`(깔린 층 — 권층운·고층운·층운·권적운) · `strand`(실 — 권운).
  판때기는 가장자리가 있어서, 큰 막을 지평선 쪽으로 스치듯 보면 테두리 흐림(그림의
  16%)이 원근에 눌려 몇 화소가 되고 **하늘에 자로 그은 직선**이 생겼다. 흐림을
  넓혀도 비율째 눌리므로 소용없다 — 가장자리 자체를 없애야 했다.
  **층(`layer`)은 알갱이를 두께 `th`(25~60 m) 안에만 흩는다**(`shapeLayer`).
  알갱이는 **카메라를 온전히 마주 보는 판**이다(`cloudShader` — 정점 셰이더가
  돌린다. 행렬엔 자리·크기만 한 번 쓴다). 솟은 구름처럼 요각만 돌리면 바로 밑에서
  올려다볼 때 판이 모로 서서 사라지는데, 층은 거의 늘 머리 위에 있다.
  막(`veil`)의 알은 **혹 무늬 없는 둥근 흐림**(`softTex`)이고 폭의 22~32% 로 크다 —
  솟은 구름용 알로 깔았더니 권층운·층운이 매끈한 막이 아니라 뭉게구름 얼룩이 됐다.
  막 색은 광학 두께 `tau` 에서 나온다(`layerTone` — 난층운이 가장 짙다). 권적운(`ripple`)은 물결진 줄로 놓되
  **줄 안 간격을 줄 사이의 절반 아래로** 잡는다 — 둘이 비슷하면 줄 없이 고른 좁쌀이다.
  **권운은 실이다**(`shapeStrand`/`strandTex`) — 하늘에 눕힌 가늘고 긴 판 16~32
  가닥을 거의 같은 쪽(±20°)으로 늘어놓는다. 폭이 좁아 모로 서도 선 하나일 뿐이다.
  `cloudTex`(판때기 밑그림 108장)는 이제 아무 갈래도 안 쓴다 — 지우지 않고 뒀다.
  **솟은 구름(`puff`)은 판때기가 아니라 알갱이 뭉치다**(`shapePuff`/`layPuff` ·
  적운·적란운·층적운·고적운). 판때기 한 장은 어느 쪽에서 봐도 같은 그림이라
  걸어가도 제자리에 붙어 있고 옆모습이 없었다. 지금은 지름 50~130 m 짜리
  알갱이 26~85 알을 3차원으로 흩어 한 덩이로 세운다(덩이마다 `InstancedMesh`
  하나 · 한 하늘에 20덩이 870알). 갈래별 생김새가 곧 알갱이를 어디 놓느냐다 —
  `cauli` 솟은 돔 · `anvil` 솟다 퍼지는 모루 · `lumpy` 깔린 혹 판 · `roll` 두루마리.
  **알갱이를 덩이 안에 고루 뿌리면 구름이 아니라 싸라기가 된다** — 폭 669 m 에
  지름 78 m 짜리 46알을 흩었더니 한 알도 서로 안 닿아 하늘에 물방울이 뿌려진
  꼴이 됐다. 두 단계로 놓는다: **혹을 먼저 잡고** 알갱이를 그 둘레 `0.62 r`
  안에 몰아 붙인다(한 알이 열 알 남짓과 겹친다).
  **혹은 사슬이다** — 다음 혹을 앞 혹에 `0.56~0.62 ×(r₁+r₂)` 거리로 이어 붙인다.
  그래서 덩이는 **구조상 반드시 하나로 이어진다.** 처음에는 혹을 제각기 뿌리고
  방위각만 갈라 세웠는데, 폭 2 km 짜리 적란운에서 혹 둘이 900 m 넘게 떨어져
  **딴 구름 둘로 보였다.** 그렇다고 나중에 당겨 붙이면 솟은 기둥이 뭉개진다 —
  **붙이는 일은 당기기가 아니라 잇기로 해야 한다.** 갈래는 '어느 쪽으로 이어
  붙이느냐'가 정한다(적란운은 위로 쌓고 꼭대기에 모루 둘, 적운은 위로 비스듬히,
  층적운은 옆으로, 고적운은 한 줄로).
  **적운은 사진(맑은 날 적운)에 맞췄다 — 넓고 평평한 밑동 위에 봉긋한 몸, 울퉁불퉁한 윗면,
  한쪽이 더 높다**(폭이 키의 1.5~2배). 밑동 판(가운데 0.24w + 둘레 일곱 0.15w, `fl` 0.5) 위에
  반구 윤곽 R(y)=Rb·√(1−(y/H)²)(Rb 0.46w · H=min(h, 0.42w))을 두 층 고리로 두르고,
  봉우리 쪽(`lean`)으로 윤곽을 밀어 한쪽 혹을 키운다. 꼭대기에 콜리플라워 혹 2~4.
  알갱이는 세로로 안 누르고(`fy` 1.0) 1.6배로 굵게, `kap` 0.4. 봉우리를 위로 하나씩
  쌓으면 공이 포개진 눈사람, 층 사이가 벌면 판이 쌓인 탑, H 를 폭의 0.75 로 두면
  기둥처럼 솟았다.
  **적란운은 넓은 밑동 · 굵은 탑(폭의 0.28) · 바람 아래쪽으로 퍼진 얇은 모루**(`fl` 0.4,
  바람 방향 `windDir` 로 길게) · 과돌출 봉우리다. 탑이 폭의 0.22 면 버섯구름, 0.15 면
  연기 기둥이었다. 실제 적란운은 모루가 10 km 를 넘으므로 폭을 10~16 km 로 잡았다.
  **알갱이는 혹 크기에 비례해 나눠 준다**(넓이 r² × 납작함) — 혹마다 똑같이 나누면
  큰 혹(모루)이 성겨 거의 투명해진다. 혹마다 납작함 `fl` 이 있고, 납작한 혹은 알갱이를
  옆으로 넓게(1.15배)·크게(0.6 밑이면 1.35배) 흩는다.
  **권운 가닥은 번짐 띠 + 굵고 흐린 올**이다(`strandTex`, 256×96). 1~2 px 선만 그었더니
  실제 크기로 띄워 하늘을 긁은 자국처럼 보였다.
  **알갱이를 어느 쪽으로 납작하게 누르는지도 갈래마다 다르다**(`fy`/`fz`).
  세로를 한결같이 0.55배로 눌렀더니 **세로로 쌓은 적란운 기둥이 마디마다
  끊어졌다** — 기둥은 세로로 잇는데 알갱이가 세로로 안 퍼지니 이음매가 닿지
  않는다. 솟는 갈래는 안 누르고(`fy`=1.0) 깔리는 갈래만 누른다(0.5).
  **한 알은 옅다**(가운데 알파 0.42) — 진하면 겹치는 자리가 새하얗게 타고
  안 겹치는 알이 따로 논다.
  **덩이의 `y` 는 밑동이다** — `shapePuff` 가 가장 낮은 알갱이의 보이는 아랫끝을
  0 에 맞춘다. 가운데를 `y` 에 두었더니 키 2 km 짜리 적란운 밑동이 땅에 닿았다.
  **고적운은 이제 층이다**(잔구름 떼 · `cell` 600 m). 실제 고적운은 잔구름
  수십 개가 떼로 깔린 것인데 큰 두루마리 하나로 세워 두었었다. 층의 `ripple` 은
  **`cell`(보이는 잔구름 크기)이 있으면 무리 폭과 떼어 놓는다** — 무리는 수 km,
  잔구름은 수백 m 라 비율로는 못 잡는다. 권적운 `cell` 250 m 는 실제(1° 미만,
  9 km 에서 150 m 아래)보다 조금 크다 — 더 줄이면 무리 하나에 알이 수천이다.
  **크기는 계산으로 맞추지 말고 화면을 훑어서 잴 것.** 기하로 어림하면 번번이
  빗나간다 — 알갱이 그림 가장자리가 얼마나 옅은지가 보이는 크기를 정하는데
  그건 계산에 안 들어온다(폭을 30% 로 어림했다가 재 보니 67% 였다). 구름만
  껐다 켜서 두 장을 빼면 구름 화소가 나온다. 지금 **보이는 폭은 `w` 의 57~117%**
  (적운 580 · 층적운 851 · 고적운 1123 · 적란운 2205 m).
  **적란운은 실제 옆모습 사진에 맞췄다** — 층마다 가운데 혹(폭의 0.23~0.26) + 바짝 붙은
  둘레 혹 셋(0.7배 · 간격 0.35×(r₁+r₂))으로 쌓은 한 덩이 몸통 · 밑동에 붙인 딸린 탑
  4~5 개(사방) · **윗면을 한 높이(`yTop`)로 자른 두꺼운 모루**(모루 혹 `an`, 알갱이 몫
  1.8배)가 탑 꼭대기에서 사방으로, 바람 아래로 조금 더 퍼진다. 예전 가는 탑+얇은
  선반은 지팡이였다. **딸린 탑을 바람 위쪽 한 줄로 멀리, 모루를 바람 아래로만 뻗게
  했더니 ㄱ자로 치우쳤다.** 둘레 혹을 0.55 간격으로 벌리면 옆에서 기둥 둘로 갈라져
  보인다. 알갱이는 520~660 알로 늘리고 혹 안에 0.5 r 로 좁게 흩고, 탑·모루 알갱이를 1.7배로 키워 회색 몸통이 매끈한 덩이로 보이게 한다(1.2배면 울퉁불퉁했다).
  알갱이가 많아진 만큼 `kap` 은 0.6 으로 낮췄다(1.8 이면 몸통이 잿빛).
  **겉 알갱이(`K.nd`)는 지금 아무 갈래도 안 쓴다** — 몸통 혹 겉에 작은 알을 덧붙여
  콜리플라워 결을 내려 했으나, 작으면 흰 싸라기, 크고 옅게 해도 덩이만 흐려졌다.
  코드는 남겨 두었다(`K.nd` 를 주면 켜진다 · 명암은 몸통 알갱이 `c.nBody` 에만 대어 센다).
  **`instanceColor` 의 b 칸은 알갱이 짙기다**(0 이면 1 로 친다 — 층·실은 그대로).
  **층 알갱이는 모로 볼수록 세로로 눌린다**(`uThin` = 두께×1.4/알 지름, 0.12 아래로 안 감) —
  안 누르면 옆에서 본 층이 알갱이 지름(수 km)만큼 두꺼웠다.
  **적란운 비율(옆모습)** — 사용자 요청으로 **탑·밑동을 훨씬 굵게, 모루는 얇게** 잡았다.
  탑 혹 `w×(0.36+0.05·y/ya)` · 밑동 가운데 0.40 + 둘레 0.26 · 딸린 탑 0.20~0.24 ·
  모루 `ra`=0.24w, 바람 쪽 −3~+5 칸, 혹 1−0.3·ext · `fl` 0.3, 모루 알 1.1배(탑 1.7배).
  모루 밑단(탑에 가까울수록 크고 깊게, 0.35~0.8 ra) + 탑 둘레 한 겹(`bel`>0.75)으로
  밑면이 탑 쪽으로 볼록하다. 윗면은 `yTop` 으로 평평. 알갱이 700~860.
  **탑 혹을 굵게 하면 쌓는 고리(`while(y<ya-r*…)`)가 일찍 멈춰 모루 밑에 목이 파인다** —
  멈추는 여유를 r×0.2 로 줄였다. 알 크기·혹 크기를 바꾸면 이 비율부터 다시 잴 것.
  ("모루"는 꼭대기의 납작한 판이다 — 사용자와 말을 맞출 때 헷갈렸다. 기둥은 "탑", 밑은 "밑동".)
  **알갱이는 곱게 쪼갠다 — 개수 `GRAIN_N`(8)배 · 크기 `GRAIN_S`(½)배**(실 빼고 전부).
  표의 `nb` 는 예전 굵은 알 기준이고 `shapePuff`/`shapeLayer`·`c.cap` 에서 곱한다.
  물결 층(`ripple`)은 간격을 절반(넓이 4배)으로 줄이고 격자점마다 둘씩 놓아 8배다.
  한 빛줄기가 스치는 알 몫이 2배가 되므로 `litPuff` 의 `kap` 에 S²·N/4 를 곱하고,
  n² 을 피하려 가리는 쪽은 많아야 700 알만 표본으로 센다. 적란운 `kap` 은 0.35
  (0.6 이면 탑이 짙은 잿빛). 모든 갈래를 최대로 띄우면 알이 47만(한 프레임 6 ms,
  헤드리스), 적란운 여덟의 명암이 165 ms 다 — 무거우면 `GRAIN_N` 부터 내릴 것.
  **알갱이 자리는 세계 좌표에 박아 둔다** — 뭉치를 통째로 돌리면 늘 같은 면만
  보여 판때기와 다를 것이 없다. 박아 두면 앞뒤 알갱이가 어긋나 움직여(적운 한
  덩이가 폭 669 · 앞뒤 740 m) 깊이가 생기고, 카메라를 보고 도는 것은 알갱이가
  작아 안 보인다(그래서 머리 위를 지나가도 된다).
  **`instanceColor` 는 r128 에서 `vertexColors:true` 없이는 안 먹는다** —
  화소 쪽이 `USE_COLOR` 일 때만 곱한다. 그런데 켜면 `color` 어트리뷰트가
  필요하고 없으면 검게 나오므로, 알갱이용 판때기에 **1 로 채운 정점색**을
  붙여 둔다. 위 알갱이를 희게·아래를 그늘지게 하는 것이 이 색이다.
  솟은 구름은 `CLOUD_VARIANTS` 밑그림을 안 쓴다 — 캔버스 그림이 108장에서
  60장으로 줄었다.
  비는 `updateRain` — 카메라를 따라다니는 상자 안의 짧은 선분 1,400개다. 물리도
  충돌도 없고, 젖음·추위 같은 게임 효과는 아직 없다.
- **안개(`WEA.mist`)는 구름양과 다른 리듬을 탄다** — 실제 복사안개는 맑고 바람 없는
  밤에 땅이 식으며 새벽에 생기고 해가 뜨면 걷힌다. 네 가지를 곱해서 낸다:
  ① 제 잡음(마디가 구름양보다 느리다) ② **시각 창 03~10시**(5~7시가 가장 짙다)
  ③ 맑은 하늘일수록(흐리면 땅이 덜 식는다) ④ **사람이 선 높이**가 낮을수록
  — 높이 오르면 안개 위로 올라선다(2 m 1.00 · 30 m 0.71 · 70 m 0.28).
  **안개가 끼면 하늘도 같이 지운다** — 땅만 뿌옇고 하늘이 말짱하면 유리 돔 안에
  선 꼴이 된다. 천정·지평선 색을 잿빛으로 끌어당기고 구름·별·해를 함께 지운다
  (구름은 `fog:false` 라 저절로 지워지지 않는다).
  **목표값(`WEA.mistT`)을 2.5초에 걸쳐 따라간다**(`WEA.mist`) — 시각·구름양은 원래
  천천히 움직이지만 높이는 즉시 바뀌어서, 절벽에서 뛰어내리면 한 프레임에 확 짙어졌다.
  시간 배속을 올리면 따라가는 속도도 같이 오르고, 첫 프레임·불러오기 직후에는
  곧바로 맞춘다(`weaLast=0` 이면 스냅).
  세기는 `fog` 배수 **최대 4배** — 처음에 14배로 잡았다가 가시거리 8 m 가 나왔다.
  발밑도 안 보이는 값이라 걸을 수가 없다. 지금은 가장 짙은 아침이 43 m 다.
- **시간 배속은 `T` 로 1 → 20 → 60 → 300 이다.** 20배(하루 72초)는 하늘·날씨를
  살펴보려고 넣었다 — 1배는 구름양 한 마디가 2.6분이라 느리고 60배는 하루가 24초다.
  주소 뒤 **`?t=20`**·**`?h=5`** 로 배속과 시작 시각을 주고 뜰 수 있다.
  **하늘이 비어 보이면 버그가 아니라 맑은 날씨일 수 있다** — 구름양이 0.05 밑이면
  `want` 가 거의 0 이다. 그래도 통째로 비지 않게 권운 구간을 0 에서 시작시켜
  가장 맑은 날에도 새털 두어 장은 남긴다.
- **나무 줄기도 64 m 칸마다 담는다**(`PROP_DIST.oak/fir` = `TRUNK_DIST` 137) — 섬 전체 4천 그루(176 삼각형씩 70만)를 늘 그렸다. 벌목은 `p._tm` 이 제 칸 메시를 가리킨다. **그 밖은 그림 판때기(`bakeTreeImpostor`) 속 줄기가 대신한다** — 기준 나무 줄기를 같이 찍는다. 137 = `COPY_DIST` 125 + 12: 나무 칸 반경이 프롭 칸보다 12 m 커서, 이래야 판때기가 켜지는 거리에서 줄기 메시가 꺼진다(겹쳐 깜빡이지 않게). **`COPY_DIST` 를 바꾸면 `TRUNK_DIST` 도 같이.** 위의 '임포스터에 줄기를 넣지 말 것'은 이제 이 짝 맞춤으로 대신한다.
- **베리는 64 m 칸마다 따로 담는다**(`buildBerryTile` · `PROP_TILES` · `BERRY_DIST` 90 m) — 섬 전체 1만 6천 알이 한 메시라 늘 전부 그려졌다(130만 삼각형 → 처음 자리에서 켜진 것 6.8만, 칸 186개). 덤불은 제 칸 메시 `p._bm` 의 `p._bi` 번부터 쓴다 — `berryMesh` 는 이제 마지막 칸일 뿐이니 쓰지 말 것. `buildProps` 가 `PROP_TILES` 도 비운다(예전엔 다시 지을 때 쌓였다).
- **베리(`buildBerries`)** — 알은 12×9 공(지름 4~7 cm), 재질 셰이더가 좁은 반사광·가장자리 과육 비침·
  아래 끝 꽃받침 자국을 얹는다(알이 거의 곧추 달려 제 몸 −y 가 땅쪽). 한 송이는 빛깔이 비슷하고
  꼭지 밑에서 둘레를 돌며 아래로 늘어진다. 송이마다 덤불 밑동에서 올라온 **꼭지 줄기**(인스턴스
  하나)가 있다. **바람은 덤불(풀)과 같은 식으로 탄다** — 풀은 제 몸 높이 y 의 제곱만큼 밀리므로
  알은 매단 높이 `aH`(덤불 크기로 나눈 값, 인스턴스 속성)로 **통째로** 밀고(`WIND_GLSL.berry`),
  줄기는 밑동 `aH0` → 꼭지 `aH1` 사이를 휜다(`stalk`). 'leaf' 를 달면 정점마다 떨어 알이 우글쭈글해진다.
- **미니맵(`drawMap`)** — 사람은 보는 쪽을 뾰족한 끝으로 가리키는 화살이다(앞 = (−sin yaw, −cos yaw),
  지도는 x→오른쪽·z→아래). 예전 시야 부채꼴은 꼭짓점이 뒤를 가리키는 삼각형으로 읽혀 '방향이 반대'로 보였다.
  **M** 은 미니맵 **창 크기**를 4배로(`#map.big` — 172 → 688 px, 화면 높이 82% 에서 멈춤). 지도 배율이 아니다 —
  사용자가 원한 것은 섬 전체를 크게 보는 것이었다(처음에 사람 둘레 확대로 만들었다가 되돌렸다).
- **활은 총과 같은 틀이다**(`tool.gun` · `bore:'arrow'` · `mag:1` — 시위에 메기는 것이 재장전, 화살이 탄).
  화살 셋(부싯돌 ×1.0 · 뼈 ×1.15 · 쇠 ×1.35)은 `ammo` 한 줄씩. 무기 설명의 '쓰는 탄'은 **구경이 맞는
  것만** 보인다(예전엔 모든 탄을 늘어놓아 총에 화살이 적힐 뻔했다). 모양은 `bowMesh`.
- **대물 저격총(`rifle_sniper`)·바주카(`bazooka`)** — 둘 다 총 틀(`tool.gun`)이고 구경이 새것이다
  (`bore:'heavy'` 대물탄 · `'rocket'` 로켓탄). 저격총은 500 · 120 m · 5발 · 13 kg, **`tool.scope`(배율)을 단 총은
  우클릭을 누르는 동안 조준경**(`updateScope` — 화각 70/배율 · `#scope` 테 · 손의 총 감춤 · 마우스 `PL.aimMul`).
  바주카는 `tool.rocket` 이면 `shoot` 이 선을 쏘지 않고 `launchRocket` 으로 넘긴다 — 초속 70 m · 중력 1.5 ·
  꼬리 `makePlume` · 땅/짐승에 닿거나 사거리 끝에서 수류탄과 같은 `explode`(420 · 반경 `blast` 6 m).
  **몸에 맞으면 그 짐승 자리에서 터뜨린다** — 스친 자리에서 터뜨렸더니 직격이 182 뿐이었다. 쏜 사람도 다친다.
- **아이템 아이콘은 입체를 찍은 그림이다**(`itemIcon(id)` → dataURL · `ITEM_ICON` 캐시 · `iconTag`). 손에 드는 것은 `WEAPON_FX`/`heldConsumable` 그대로 대각선으로 눕혀,
  입는 것 18종은 몸에 입힐 모형 `gearModel` 그대로(아래), 광물은 사전 삽화 `mineralIcon`, 그 밖 약 90종은 `_icoShape`(id 이름 규칙으로 덩이·주괴·탄·병·가루더미… 를 `WMAT(T.c)` 로 빚음)를
  256² 렌더 타깃에 찍어 두 번 반씩 줄여 64² 로 만든다. 빠른 칸·소지품·상자 창이 쓴다. **새 아이템은 `_icoShape` 에 규칙이 없으면 덩이로 나온다** — 생김새가 다르면 한 줄 더할 것.
  **아이콘 정투영 카메라의 left/right/top/bottom 은 카메라 기준이다** — 예전엔 물체 중심 좌표를 더해 두었는데, 아이콘이 다 원점 근처라 티가 안 났다
  (몸 좌표로 빚은 갑옷은 y 1.2 라 통째로 화면 밖이었다). 경계는 `gBox` — `Box3.setFromObject` 는 인스턴스(비늘)를 안 보고 숨긴 것도 센다.
- **입는 것의 생김새는 `gearModel(id)` 하나다**(구역 '착용품 생김새' · 표 `GEAR`). 사용자 요청: "나중에 멀티 플레이 할 때 입은 모습이 보여야 하니까" —
  아이콘용이 아니라 **몸에 입힐 모형**이다. 좌표는 사람 몸(m · 두 발 사이 바닥 원점 · +y 위 · +z 앞 · +x 왼쪽), 몸은 `GB` 한 벌(키 1.75 m · 팔 17° 벌린 A 자세 ·
  몸통 단면표 `GB_A`/`GB_BF`/`GB_BK` → `gbT(th,y,d)` · 팔다리 틀 `gbLimb` → `at(phi,t,r)`). 부위 묶음마다 `userData.bone`(chest · pelvis · upperArmL/R · foreArmL/R ·
  handL/R · thighL/R · shinL/R · footL/R · head · straps)을 달아 두었으니 뼈를 따라 옮기면 입는다. **왼쪽만 빚고 `gMirror` 가 x 를 뒤집어 오른쪽을 만든다.**
  아이콘에 안 넣을 것(다리 판금 · 흰 겉옷자락 · 멜빵)은 `userData.noIcon`. 새 착용품은 `GEAR` 에 빚는 함수 하나를 더할 것.
  강철 판금은 은빛 기사 그림(사용자 참고)을 따랐다 — 가슴판(등줄 · 목·겨드랑이 파임 · 청동 덩굴띠 · 펼친 날개 문장 · 금 소용돌이 둘) · 옆 죔띠 둘(가죽 · 청동 고리) ·
  등판 · 목가리개 셋 · 어깨받이(아래) · 위팔 통과 죔띠 · 팔꿈치(아래) · 아래팔 통(잎꼴 청동 장식 `gFleur`) · 나팔 소매 · 판금 장갑(손등 띠 셋 · 손가락 세 마디씩 굽힘 · 엄지) ·
  허리 띠판 셋(금 리벳) · 가죽 띠와 금 고리 · 넓적다리 덮개 셋(끝 뾰족) · 넓적다리 판 · 무릎(`gKnee`) · 정강이 · 발(`gFoot`) · 흰 겉옷자락(앞을 튼 치마, 금단 · 흰 털 끝단).
  **지금 강철 판금·강철 투구는 사용자가 준 모형을 그대로 쓴다**(`SENTINEL` · `gSentinelGeo` — Meshy 'Plumed Sentinel' 18.6만 → `fast_simplification` 으로 4.7만 삼각형,
  정점 16비트 · 삼각형 [투구·쇠·천] 차례 · 몸 좌표에 맞춤 · 약 0.56 MB). 사용자: "구조 너가 잘 못 따라하는 거 같아서 이걸 베이스로 써". 바탕그림이 없어 빛깔은 재질(쇠·흰 천)뿐이고 자리로 갈랐다.
  **갑옷 여섯은 전부 이 모형 꼴이다**(사용자 요청 · `gSentArmor(g,재질,천,비늘,덮을갈래)` — 청동·철·잿불은 u·l·c 겉에 비늘(`gScalesOnMesh` 1.3 cm — 사용자 요청으로 2.6 의 절반 · 장수가 4배라 비늘 한 장을 3×4 격자 `dropL` 로 줄였다 · 한 벌 약 48만 삼각형) — **줄을 맞춘다**: 점을 부위 축(몸통·다리 둘·팔 둘) 둘레 원기둥 좌표 칸(줄 0.9d · 칸 1.15d · 홀수 줄 반 칸)에 넣어 칸마다 하나만 남기고, 칸 가운데에 정확히 세우며 바라보는 쪽은 바깥 가로 3/4 + 면 법선 1/4(장식 요철을 따라 눕지 않게). 무작위로 뿌렸을 땐 털처럼 보였다, 키틴은 키틴 재질, 복합은 키틴 판 + **사용자가 정한 자리만** 잿불 비늘 — 어깨 가리개(모형의 어깨받이 조각 `pl` 정점 3 cm 칸 `gPauldronAt` — 위팔·팔꿈치는 판, 전완(0.8~1.1 m · |x|>0.2)은 통째 비늘) · 흉갑 · 등 · 옆구리 · 허리받이(0.68~0.95 m) · 망토(c 통째) · 무릎 · 신발(`gEmberSpot(x,y,z)` 가 삼각형 가운데로 가르고 `gSubGeo` 로 u·l 을 비늘 쪽 `us`/`ls` 와 판 쪽으로 나눈다. 팔·넓적다리·정강이·허리 밑은 판). **경계 처리**: 판은 비늘 자리 안쪽으로 2.5 cm 더 깔고, 비늘은 바탕보다 2.5 cm 넓게(`G.usx`/`lsx` — 경계에 몇 화소 비치는 것은 사용자가 괜찮다고 했다 · 넓히면 판이 덮인다), 망토 비늘은 망토의 열린 가장자리 2.5 cm 안의 판 면까지 넘겨 단다(`G.cx` — 망토 천이 판 밑에 넓게 깔려 있어 "망토 가까이"로 잡으면 온몸이 비늘이 됐다) · 정강이 옆 망토 안단 · 옆구리 뒤 바탕은 1.4 cm 민다. 48방향 몇 화소)
  손으로 빚던 `gScaleArmor`·`gChitinArmor`·`gPauldron`… 은 이제 `GEAR` 가 안 부른다(남겨 둠). 투구 갈래는 **머리 타원체**(가운데 0·1.615·0.03 · 반지름 0.14·0.16·0.17) + 1.62 m 위 전부 + 1.42 m 위 |x|<0.105(턱·목 가리개 — 처음엔 빼먹었다) + 1.5 m 위 |x|<0.2 다 — 처음엔 깃 장식만 투구로 잡고 진짜 투구 껍질은 갑옷 쪽에 남겨 두었다(사용자 지적). 이 투구는 폭이 17 cm 로 좁아 `gDarkHead` 를 넣으면 검은 공이 뚫고 나오므로 넣지 않는다.
  **갑옷은 좌우 대칭으로 다시 만들었다** — 모형의 두 팔 자세가 달라 한 팔 축으로 비늘 줄을 못 세웠다(−x 팔에 빈자리). +x 반쪽을 거울로 비춰 −x 를 만든다(투구만 원본 · 삼각형 번호는 32비트).
  **빈자리는 재서 0 으로 맞춘다**(48방향 — 16 방위 × 위/수평/아래로 기울여 · 비늘 갑옷 넷 모두 0 화소. 메우는 비늘 2.3d×2.8d · 반경 0.35d(발 0.2d) · **앞뒤가 같은 쪽을 볼 때만 덮었다고 친다** — 얇은 목깃은 바깥 비늘이 안쪽 점까지 덮은 셈이 되어 안쪽이 비었다 · 목둘레 끝 바탕은 1 cm 내리고 목둘레·발은 법선을 뒤집지 않는다 · 장화 목 바탕은 2 mm 만 민다(더 밀면 접힌 데서 거꾸로 튀어나왔다). 남은 화소 자리는 `covloc` 식으로 그 화소에 광선을 쏴 몸 좌표를 받아 찾는다)(사용자: "모두 매꿔지지 않으면 절대 끝내지 말고"): 비늘 밑 바탕만 순수 자홍으로 칠해 여러 방향에서 찍고 자홍 화소를 센다(줄 칸 13% → 0). 줄 칸 뒤에 **메우기 단계**가 있다 —
  겉을 넓이 비례로 촘촘히(140배) 훑고 삼각형마다 가운데·세 꼭짓점도 짚어, 둘레 0.5d 안에 비늘이 없으면 그 자리에 앞뒤 양쪽으로 비늘을 세운다(겉의 앞뒤를 몸 가운데로만 가려 손바닥·안쪽 팔이 틀렸다) · 비늘 2.0d×2.5d · 바탕은 4 mm 만 밀어 넣는다 ·
  복합은 판 아랫단(1.02 m 밑)에도 비늘.
  **비늘 갑옷 무게를 줄였다**(사용자 요청 — 한 벌 비늘 22.5만 장 · 545만 삼각형 → **11.2만 장 · 140만 삼각형**, 만드는 시간 헤드리스 28 → 10초):
  ① 메우기 반경 — 넓이로 훑기·열린 가장자리 0.35d → `SCALE_FILL_R`(0.7d), 삼각형 짚기 0.35d → 0.55d. 메우기가 한 벌 20만 장(89%)이었다(비늘 2.3d×2.8d 를
  4.6 mm 마다 또 세움) · 넓이 훑기 140 → 60배. 대신 **같은 쪽(법선 45° 안 — 예전 78°)을 보는 비늘만 덮었다고 친다**, 메우는 비늘에도 법선을 달아 둔다.
  잰 값(철 · 48방향 자홍 화소): 반경 0.9d 512 · 0.7d+78° 58 · 0.7d+45° 5 · 짚기 0.5d 1 · **0.55d 0**(갑옷 넷 모두 · 청동·철·잿불은 같은 꼴이라 같다).
  비늘 꼴(방패꼴 윤곽·깊이)로 덮임을 재 보기도 했으나 젖혀진 끝 밑이 아래에서 비쳐(2,374 화소) 깊이를 조이면 74만 장으로 불었다 — 접었다.
  ② 비늘 한 장 `dropL` 3×4 → **2×3 격자**(24 → 12 삼각형). 가운데 능선·폭이 가장 넓은 줄(v 1/3)은 남는다.
  **48방향 밖에선 몇 화소 남는다** — 다른 64방향(512 px · ±0.25·±0.75 rad · 방위 반 칸 민 것)에서 예전 판 6~7 · 0.35d 짚기 15~16 · 지금 25~35 화소.
  몸에 입혀 여럿 그릴 때는 거리 단계(먼 사람은 비늘 무늬 그림)를 따로 둘 것.
  **비늘 빈자리 메우기**: 칸 가운데에 가장 가까운 점에 세우되 칸 안의 더 바깥 점을 1.2 cm 까지만 따라 나가고(끝까지 따라가면 등에서 어깨받이·깃 뒤 날개에 붙어 등판이 비었다) ·
  같은 줄에서 양옆이 찬 빈 칸(8칸까지)은 이어 세운다 · **모형 법선은 등 쪽이 안을 본다** — 바탕을 법선으로 밀 때 몸 바깥쪽으로 돌려 놓고 민다(안 그러면 바탕이 비늘 위로 1.4 cm 나와 등이 통째로 덮였다) · 후보 점 24배 · 비늘 1.75d×2.2d 로 겹침 · 비늘 밑 바탕은 법선 쪽으로 1.4 cm 밀어 넣고 같은 쇠의 짙은 빛(청동·철·잿불)으로 칠했다.
  모형은 가운데가 x +0.068 · z +0.02 어긋나 있어 빼서 맞췄다. 삼각형은 갈래별 구간 `SENTINEL.r`(h 투구 · u 쇠 윗몸 · l 다리(아이콘 뺌) · c 겉옷자락(아이콘 뺌) ·
  pl 왼 어깨받이 · el 왼 팔꿈치 — 둘은 u 와 겹쳐 한 번 더 담았다). **다른 갑옷의 어깨·팔꿈치도 이 조각을 쓴다**(사용자 요청 · `gSentPiece` — 팔꿈치는 모형 팔꿈치 `E` 를 `GB.el` 로 옮김):
  키틴은 키틴 판으로, 비늘 갑옷은 조각 겉에 비늘을 덮는다(`gScalesOnMesh` — 곡면 식이 없어 넓이 비례로 점을 뽑고 면 법선으로 세운다). 미리보기의 사람 마네킹은 사용자 요청으로 뺐다.
  한 덩어리라 부위 뼈 묶음이 없다(`chest` 하나) — 여럿이 할 때 움직이려면 뼈를 심어야 한다. 아래 손으로 빚은 판금 설명(`gPauldron`·`gCouter`·`gKnee`…)은 비늘·키틴 갑옷이 쓴다.
  **어깨·팔꿈치는 참고 그림의 구조를 따른다**(사용자 요청 — 앞서 만든 가시·여러 겹 띠는 걷어냈다): 어깨받이(`gPauldron`)는 **넓고 네모진 큰 판 하나** —
  초타원 껍질(중심 `C` · 반지름 0.125·0.1·0.13 · 가로 지수 4.6 · 세로 3.8)이라 위가 평평하고 바깥·앞·뒤로 각지게 꺾여 내려오며, 아랫단은 바깥으로 젖히고
  목 쪽 가장자리는 위로 젖힌 입술이다. 가장자리에 굵은 말림 + **청동 덩굴띠**(`gFilM` — 캔버스 무늬 `gTexFil` 을 띠 길이만큼 되풀이), 앞 아래 모서리에 소용돌이,
  밑에 띠 하나. 비늘 갑옷은 같은 판을 0.88배(`k`)로 쇠 빛깔로, 키틴은 뒤로 휜 뿔 둘(`horns`)을 단다.
  팔꿈치(`gCouter`)는 뒤를 감싼 컵 + **뒤로 뾰족한 화살촉꼴 큰 날개**(앞 · 위 · 뒤 끝 · 아래 네 꼭짓점을 곧게 이은 각뿔 · 굵은 말림 · 덩굴띠 · 가운데 금줄).
  **비늘은 실제로 한 장씩 겹쳐 단다**(`gScales` — 사용자 참고: 붉은 비늘 갑옷 사진). 겉면 P(s,t,d) 위에 줄마다 둘레를 재 장수를 정하고 홀수 줄은 반 칸 밀며,
  장마다 겉면 법선으로 세우고 끝을 바깥으로 젖혀(`tilt`) **윗줄 끝이 아랫줄 머리를 덮는다.** 비늘 한 장은 끝이 뾰족한 방패꼴(`drop`)이나 키틴 판(`lam`) 격자이고,
  그림(`gTexScale`)이 가장자리를 어둡게·테를 밝게·등줄을 세운다. 비늘 사이로 바탕(청동=섬유 · 철=가죽)이 보이도록 밑에 한 겹 깐다.
  **잿불 비늘은 검고 테만 아주 얇게 붉다**(사용자 요청 — 그림 `gTexScale('ember')` 의 테가 1~2 화소, 같은 테가 emissiveMap 으로 달아오른다).
  띠 하나는 `gBand`(keel 바깥 가운데를 |phi| 천막꼴로 접은 능선 · side 앞뒤 곁능선 · point 아랫단 가운데 뾰족 · curl 끝 젖힘). 가슴판 용골도 |th| 천막꼴로 날을 세웠다.
  **비늘 갑옷 · 키틴 갑옷은 치마가 아니라 바지다**(사용자 요청): 웃옷 밑단은 y 0.80(엉덩이 바로 밑)에서 끊고 거의 안 벌린다(`gCoatP(0.8,0.08)`).
  다리는 `gScaleLegs` — 넓적다리·정강이를 비늘로 감싸고(바탕 밑에 깜) 무릎은 쇠 덮개, 발은 가죽 장화(발목 위로 목). 키틴은 가죽 누비 위에
  넓적다리 판 둘 · 무릎(가시) · 정강이 통 · 발 판, 복합은 비늘 바지 위에 **앞쪽만** 판을 대고 무릎은 비늘로 둔다.
  아이콘에는 넓적다리까지 넣고 무릎 아래(`gKnee` · 정강이 · `gFoot`)는 뺀다.
  **키틴 갑옷은 판금이다**(사용자 요청 — 예전엔 키틴 판을 비늘처럼 꿰었다 · `gChitinArmor`): 가슴 껍질(날 선 용골 · 마디 금 둘) · 등 껍질(등뼈 능선) ·
  목가리개 둘 · 배 마디 다섯(가운데 뾰족) · 각진 어깨받이와 뿔 · 위팔 통 · 팔꿈치 · 아래팔 통 · 허벅지 덮개(끝 뾰족) · 밑엔 가죽 누비.
  **복합은 키틴 판금의 약한 곳을 잿불 비늘이 감싼다**(사용자 요청): 판 밑에 비늘옷을 받쳐 입고 가슴·등 껍질을 좁혀(±0.42π · 등 ±0.36π)
  옆구리 · 목 · 허리(배 마디 없음) · 엉덩이 자락 · 위팔과 팔꿈치(비늘 소매)가 비늘이다. 판에 가려질 비늘은 `skip` 으로 안 단다.
  **가슴 보석은 넣었다가 지웠다**(사용자 요청 "그냥 보석 없애자"). 갑옷 여섯의 가슴 가운데 8 cm 보석(계단 컷 · 강철 청색 사파이어 · 청동 주황 사파이어 ·
  철 노랑 황옥 · 키틴 에메랄드 · 잿불 루비 · 복합은 루비 속 에메랄드)을 몬테카를로 경로 추적 셰이더(분산 · 흡수 · 복굴절 · 다색성 · 루비 형광 ·
  빛나는 은 거울 바닥)로 그리던 코드는 커밋 `158e2f5` 까지에 있다 — `CHEST_GEM` · `GEM_CUTS` · `GEM_GLSL` · `gemShape` · `gemGlowK` · `gChestGem` ·
  흡수 계산 `tools/gem-absorb.mjs`, 그리고 `gearModel` 끝에서 `gChestGem` 을 부르던 한 줄. 되살리려면 그 커밋에서 이 구역을 통째로 가져올 것.
  **갑옷 보기 시험장(아티팩트 · 원본은 레포 밖)은 장마다 쌓는다** — 장면을 HDR 렌더 타깃에 그리고 이전 평균과 1/(n+1) 로 섞는다(`ACC` · `drawFrame`).
  카메라·조명·갑옷·바탕이 바뀌면 처음부터. 장마다 카메라를 화소 안에서 흔들어(`setViewOffset`) 가장자리 계단을 녹이고, 64 장을 모으면 멈춰 그 뒤엔
  장면을 다시 그리지 않는다(비늘 갑옷은 수백만 삼각형). 보석이 있을 땐 경로 추적 잡음 때문에 1024 장까지 쌓았다.
  **투구 일곱도 전부 모형 투구 꼴이다**(사용자 요청 · `gSentHelm(g,껍질,장식)` · `gHelmParts`) — 장식(깃)은 **사용자가 칠하기 페이지에서 손으로 칠한 면**이다(`HELM_MASK` — 삼각형마다 한 비트를 base64 로, `gSentinelGeo().h` 삼각형 차례 · 3,753면 중 2,391면). 두께 광선·번지기로 자동으로 갈랐더니 깃 일부가 빠지고 날개가 칠해지기를 되풀이했다 — 모형을 바꾸면 다시 칠해야 한다. 껍질/장식: 강철 강철/진홍 깃 · 청동 청동/붉은 말총 · 키틴 키틴/밝은 키틴 · 잿불 검은 쇠/달아오른 볏 · 복합 키틴/키틴 투구 몸 색 깃(잿불·복합은 껍질에만 잿불 비늘을 덮는다, 깃은 빼고 — `gSentHelm` 넷째 인자 · 사용자 요청) · 가죽 가죽/흰 털 · 뼈 뼈/짙은 가죽. 아래 손으로 빚은 투구들(`gHelmBronze`…)은 이제 안 부른다.
  투구: 강철(볏 · 앞 챙 · 목가리개 꼬리 · 부리 진 낯가리개와 눈 틈 · 숨구멍 · 흰 깃털 열둘) · 청동(코린트식 — 아몬드 눈구멍 · 코 가리개 · 뺨 사이 틈 · 붉은 말총 볏) ·
  키틴(마디 판 다섯 · 빛나는 겹눈 · 이마에서 솟아 뒤로 휜 큰 코뿔(끝 두 갈래) · 정수리 가시 다섯 · 이빨 달린 큰 턱) · 잿불 비늘 두건 ·
  복합(키틴 지붕 · 마디 금이 잿불빛으로 달아오름(`GMT.glow`) · 관자놀이에서 뒤로 휜 뿔(끝이 달아오름) · 뺨 판 · 코 가리개 · 정수리 가시 · 비늘 드림) · 가죽 모자(네 쪽 솔기 · 귀덮개 · 털 테 · 끈) · 뼈 투구(이마판 · 볏판 · 옆판 · 송곳니).
  **막힌 투구(강철·청동)만 안에 검은 머리(`gDarkHead`)를 넣는다** — 눈 틈이 까맣게 보이게. 얼굴이 트인 투구에 넣었더니 검은 공이 들어앉은 꼴이었다.
  재질은 물리 재질 `gM`(이름으로 나눠 씀) + 하늘 반사 정육면체 `gEnv`(캔버스 6장) — 쇠는 반사가 생김새의 반이다. **본편 다른 재질(램버트·퐁)과 다르다.**
  무겁다 — 비늘 갑옷 한 벌 15만 · 판금 15만 삼각형. 아이콘은 한 번 찍고 버리니 괜찮지만, **몸에 입혀 여럿을 그릴 때는 비늘 장수(`row`/`col`)와 격자부터 줄일 것.**
  **빠른 칸(1~5)은 화면 아래 가운데**(46 px 네모 · 그림) — 왼쪽 아래에 두었더니 산소 칸이 생겨 길어진 상태 막대를 가렸다.
- **사전(B)에 '조작' 탭이 있다**(`CONTROLS_GUIDE` · `dexTab==='keys'` · 단추 `#dexK`) — 갈래마다 [글쇠, 설명] 표를 두 칸(`.kr`)으로 그린다.
  시작 화면의 짧은 안내(`#ov .k`)보다 자세하고, 설비를 볼 때 좌클릭이 손의 것보다 먼저라는 것·횃불과 화덕 사이 불 옮기기도 적었다.
  **글쇠 자리는 `{행동}` 으로 쓴다**(그릴 때 `kbText` 가 지금 키로 바꾼다 — 93-keys.js). 일시정지 화면 글쇠 줄(`#ov .k`)은 이제 93-keys.js 의 `KB_OV` 가 채운다 — **조작을 바꾸면 이 표와 `KB_OV` 를 같이 고칠 것.**
- **창(UI)을 연 동안은 포인터를 잠그지 않는다**(`lockPointer` 가 `uiOpen()` 이면 안 부르고, `pointerlockchange` 가 창이 열렸거나 멈춘 채
  잠금이 걸리면 바로 푼다 — 94-input.js). 잠금은 **비동기로 늦게 걸린다** — 상륙 때 요청한 잠금이 가방을 연 뒤에 걸려서 그 뒤 모든 클릭이
  캔버스로 갔다('제작 창에서 소지품으로 클릭이 안 넘어간다'). 실제 마우스(playwright `page.mouse`)로 재야 보인다 — `evaluate` 로 부르면 안 걸린다.
- **소지품 목록은 바뀔 때만 다시 짠다**(`drawInv` — 만든 HTML 이 `L._html` 과 같으면 `innerHTML` 을 안 건드리고 고른 칸 표시(`sel`)만 바꾼다) ·
  아이콘 그림은 `decoding="sync"` — 창을 열 때마다 목록을 통째로 다시 짜고 그림을 비동기로 풀어서 깜박였다. **섬을 짓는 동안(`busy`)은 아예 안 그린다**
  (`loop` — 덮개 뒤에서 짓다 만 장면을 초당 10번 그려 로딩 내내 뒤가 깜박였다).
- **버리기는 묻고 버린다**(베타 신고 — '버릴 때 확인 메시지' · `dropSlot(칸, 개수, quick)` — 50-items.js) — 버리는 길 셋(버리기 칸에 끌어 놓기 `dragPut` ·
  가방의 '1개 버리기'·'전부 버리기' `bagAct` · G 키)이 다 여기로 와서 묻는 상자(`ask` — Y 예 · N 아니오)를 띄운다. **Ctrl(맥은 ⌘)을 누른 채면 묻지 않는다**
  (사용자가 정함 — 끌어 놓기의 Shift 는 예전대로 '1개만'). 묻는 동안 칸이 바뀌면 남은 만큼만 버리고, 답한 뒤 `syncLock` 으로 마우스를 다시 잠근다(가방 없이 G 로 물었을 때).
  예전 G 는 가방이 닫혀 있어도 고른 칸을 묻지 않고 버렸고 생존 안내서(`read`)도 버렸다 — 이제 읽을거리는 어느 길로도 안 버린다.
- **키는 행동 이름으로 읽는다**(사용자 요청 — 설정에 키 바꾸기 · 베타 신고 '개발자 모드 단축키를 다르게' · 93-keys.js). `keys` 는 이제 글쇠가 아니라 **행동**을 담는다 —
  `keys.fwd`·`back`·`left`·`right`·`jump`(돌진·매달리기·떠오르기·나무·밧줄)·`run`(달리기·몸 던지기·개발자 빠르기)·`crouch`(앉기·가라앉기·지붕 내려가기) ·
  keydown/keyup 이 `KB_BY[e.code]` 의 행동을 켜고 끈다. 한 번 누르는 것은 `kbHit(e,'행동')`(가방 · 사전 · 지도 · 설정 · 닫기·배 · 옮기기 · 버리기 · 재장전 · 전등 ·
  짓기 · 짓는 중 돌리기·뒤집기·걷어내기 · 옮기는 중 돌리기 · 저장 · 불러오기 · 새 섬 · 성능 창 · 개발자 모드·굴 앞뒤 · 자유 카메라 · 시간 배속 — 30개 · 둘까지).
  **새 키를 넣을 때 `e.code==='KeyX'` · `keys.KeyW` 를 쓰지 말고 `KB_ACTS` 에 한 줄 더하고 `kbHit` · `keys.행동` 으로 읽을 것.**
  범위(`sc` — play · build · move · dev)가 같은 행동끼리만 겹친다고 치고, 이미 쓰는 글쇠를 고르면 그 칸을 비운다(사용자가 정함 — 빈 행동은 창에서 붉게).
  Shift 를 곁들이는 것(Shift+버리기 전부 · Shift+돌리기 반대)은 진짜 Shift 그대로다. 고정 — Esc · 숫자 0~9 · F11 · F12 · 마우스(사용자가 정함).
  저장 `castaway.keys`(기본과 다른 행동만). 키 창을 연 동안은 `uiOpen` 이다(마우스가 풀린다). 알림 글 속 글쇠 이름(수십 곳)은 그대로다(사용자가 정함).
  달라진 것: 매달려 몸 던지기·개발자 빠르기가 오른 Shift 를 안 받는다(달리기 키 하나) · 물속에서 가라앉기가 C 로도 된다(앉기 키 둘).
- **알림(`toast`)은 쌓이는 줄이다**(`TOASTS` 최대 3 · `#toast` · `updateToasts` 가 HUD 에서 흐른다) — 채집 진행 막대(`#look`) **밑**에 선다
  (예전엔 `#look` 글을 덮어써 진행 상황을 가렸다). 같은 글이 잇따르면 한 줄에 '×n' 으로 센다. 2.4초 · 마지막 0.4초에 옅어진다.
- **글·단추도 캠코더 화질이다**(`body.camc` — `camcBody(on)` 이 캠코더가 켜져 있고 줄 수가 0 이 아닐 때 단다 · css 맨 끝) — 글자는 `text-shadow`,
  단추·칸·창은 `box-shadow`, 그림은 `drop-shadow` 로 빨강·파랑을 양옆으로 어긋나게 + 주사선. **창 전체에 `filter:drop-shadow` 를 걸면 안 된다** —
  불투명한 창의 바깥 테만 번지고 안의 글은 그대로였다. 테이프 셰이더의 색수차도 1.7 → 2.4 화소. 캠코더 OSD 는 REC·배터리를 키우고
  둘째 줄에 '표류 N일째 오전/오후 h:mm'(`#camcD`).
  **한때(water-view 가지) 속도·읽기 때문에 큰 창 테두리에만 남겼다가 사용자 요청으로 되살렸다**(글자·단추·HUD·아이콘 색 번짐 · 세기 0.62/0.58).
  움직이는 주사선(`tapeRoll`)과 깜빡임(`osdFlick`)은 빠진 채다 — 화면 전체를 프레임마다 다시 합성하게 해 46 → 60 fps 의 대부분이 그 몫이었다.
- **다치면 캠코더 화면이 여는 화면처럼 치지직거린다**(46-camcorder.js ⑤ · 2026-10-21 베타 신고 · 사용자 요청 '시작 화면 치직거리는 것처럼 · 회복할수록 없어지게 · 원 기능은 없애고') —
  예전의 렌즈 금(`camcCrackTex`)도, 그 뒤의 가장자리 어둠 원(체력이 낮을수록 가운데로 조여 들고 체력이 차면 25초에 걸쳐 물러나던 것)도 없앴다.
  세기 `CAMC.hurt` = (0.9 − 체력비)/0.8 — **지금 체력 그대로**(90% 밑에서 생겨 10% 에서 가장 짙고, 회복하면 그만큼 바로 걷힌다 · 쓰러지면 0 — DEAD 화면이 맡는다).
  겹은 여는 화면(91-title.js)과 같다: 신호가 약해짐(밝기 −22%) · **점 눈**(화면 2 px 칸마다 세제곱으로 눌러 거의 검고 가끔 흰 점 · 가끔 한 줄이 통째로 밝다 · 'screen' 으로 얹음 · 정수 칸 해시 `hq` —
  `h21` 은 화소 칸에서 세로 줄무늬가 졌다) · **비월 주사선**(홀짝 줄이 번갈아 어둡다) · 위로 **굴러가는 어두운 띠** · **깜빡임**(가끔 크게) · 색 갈라짐 · 가로 떨림 · 세로 튐 —
  여는 화면처럼 **초당 12번** 바뀐다(`TITLE_NZ_HZ` 와 같은 박자). 맞는 순간(`hurtFlash`)엔 ntsc-rs(MIT, © valadaptive)의 식으로 줄 묶음 찢김 · 세로 튐 · 헤드 스위칭 ·
  트래킹 띠 · 가로 줄무늬 눈(`snowRow`)이 잠깐 인다. 화면 잡음 설정을 꺼도 남는다.
  셰이더는 `fragmentShader` 템플릿 글(백틱)이라 **셰이더 주석에 백틱을 쓰지 말 것**(문법 오류).
  **캠코더를 끄면 안 보인다**(화면 효과는 캠코더 셰이더 하나뿐이다 — 위 'mix-blend-mode 를 얹지 말 것').
- **나무에 달린 것도 땅의 것보다 먼저다**(`floraAimed` · `HARV_GROUND` — 풀·갈대·모래·부싯돌·돌멩이 캐기는 겨눈 식생에 늘 진다 · 참나무·전나무 가지와 겹치면 가까운 쪽 ·
  도끼를 들고 줄기를 보면 베기). 칼·도끼를 든 채로도 노거수 껍질·송진은 벗긴다(`floraFindLook` 의 `sharpHand`).
- **보관함 이름표는 크다**(`makeTagSprite` 64 px 글 · 가까이서 0.24 m~멀리 1.3 m).
- **벤 참나무·전나무는 그루터기가 선다**(`STUMP` · `stumpGeo`/`stumpPut` — 50-items.js · 줄기 인스턴스는 0 으로 접고 밑동 굵기(`stumpRadius`)에 맞춘
  짧은 줄기 · 비스듬한 윗면의 나이테·속심·가는 금 셋 · 경첩 쪽 쪼개진 나뭇결 이빨). 노거수 그루터기에도 금 넷 · 이빨 아홉.
- **가마**(`placeKiln`/`kilnify` — 62-build.js) — 날벽돌(점토 2 → 3) → 화덕에서 구운 벽돌 → '가마 짓기'(벽돌 16 · 점토 2)가 **곁의 화덕을** 벽돌 돔으로
  두른다(`f.kilnU` · 40 → 80 kg · 10 → 20 칸 · 굽기 두 배 빠르게 — `updateFires`). 저장 `fires[].kl`(옛 저장의 `kiln` 꾸러미와 다르다).
- **기술 나무에 설비 공정도 선다**(`proc` — 60-stations.js SMELT 끝) — 제련로 제련(SMELT)과 화덕·가마 굽기(FIRING)를 RECIPES **끝에** 붙인다
  (앞 번호는 그대로). `canCraft` 는 늘 거짓 · 누르면 `procHow` 가 어디에 무엇을 넣는지 알린다 · 마디는 점선 + ⚒. 그래서 주석 → 주석 제련 → 석석·도가니로 이어진다.
  `obtainOf` 는 `proc` 를 '제작' 으로 세지 않는다. 지금 RECIPES 278(제작법 240 + 공정 38 — 2026-10-15 잼).
- **만드는 동안은 손이 빈다**(`CRAFT.held` · `craftBusy`/`craftRestoreHeld`) — 시작하면 든 것을 내려놓고 끝나면(실패·그만둠 포함) 다시 든다. 그동안 들기·빠른 칸·끌어 들기는 막힌다.
- **거품 조각은 프랙탈 사면체 뭉치**(`foamCluster` — 가운데 하나 + 면마다 반 크기 넷 + 그 바깥에 둘씩 = 13 · `aLv` 대(代)) — 셰이더가 사면체마다 뭉치 가운데를
  축으로 공전시키고(바깥 대일수록 빠르게 · 출렁) 제자리에서도 돌려 속이 섞인다. 물가 한 점에 조각 16(`FOAM.K` — 예전 22).
- **토대·지붕 위에도 놓는다**(`campfireSpot` 이 `floorAt(x,z,발 높이)` — 판 위면 물가·비탈 검사를 건너뛰고 가장자리 0.45 m 안쪽이어야 한다).
  놓는 설비의 충돌 원은 높이 구간을 단다(`y0`·`y1` — `resolveProps` 가 다른 층이면 안 막는다). 밀기도 그 판 위로만 민다.
- **벌레잡이** — 잠자리채(`bug_net` · `tool.bugnet` · 풀과 돌)로 겨눈 쪽 3.2 m 안의 벌레를 뜬다(`bugNetSwing` — 97-wildlife.js · `useHeld` 가 넘긴다).
  한 번에 겨눈 것 둘레 1 m 의 1~3마리(무작위) · 빈 유리병(`jar` — 유리 1 · 타는 화덕 곁 · 둘)마다 한 마리 → `jar_butterfly`·`jar_dragonfly`·`jar_firefly`(`bait:1`).
  병이 없으면 놓아 준다 · 벌은 쏜다. **벌레 병은 그물 미끼**(`castNet` — 하나 풀면 1~2마리 더 · 빈 병이 돌아온다). 잠자리(파란 점)는 물가에서 30% 만 난다.
  작살로 잡은 물고기 토막 수도 무작위(표의 수 ±1).
- **벌레는 날개 치는 입체다**(사용자 요청 · `bugMeshes`/`bugGeo` · `WILD.bugIM` — 97-wildlife.js) — 나비(앞·뒷날개 넷 · 끝이 짙음 · 더듬이 · 날개는 `BUG_C` 빛깔) ·
  잠자리(마디 진 긴 배 · 겹눈 · 반투명 날개 넷) · 벌(줄무늬 · 날개 둘) · 반딧불이(검은 몸 · 노란 꽁무니 + 빛 점). 갈래마다 인스턴스 메시 하나,
  정점 `aW`(0 몸 · ±1 날개)로 셰이더가 몸 축을 경첩으로 날개를 친다(`BUG_FLAP` — 빠르기 Hz · 폭 · 쉼 각). 날아가는 쪽(움직임)을 본다.
  예전의 점(`WILD.bugs.pts`)은 반딧불이 빛만 남았다.
  **실제 크기다**(사용자 요청) — 나비 날개폭 5~9 cm · 잠자리 날개폭 8.5~10 cm(몸 6.5~7.5) · 꿀벌 1.2~1.4 cm · 반딧불이 1.1~1.3 cm(개체마다 `ph` 로 흔듦) ·
  날갯짓도 실제 빠르기(나비 10 · 잠자리 30 · 꿀벌 200 · 반딧불이 60 Hz — 화면 주기보다 빨라 흐릿하게 떨린다).
- **수면의 물고기 그림자**(`FISH.shad` — 96-sea.js) — 물 위에서 40 m 안의 물고기마다 수면에 물방울꼴 어두운 판(곱하기 섞음 · 깊을수록 옅고 넓다).
- **물가 거품은 사면체 뭉치 + 레이스 판**(96-foam.js) — 조각 하나가 작은 사면체 넷의 뭉치(`foamCluster` · 사면체마다 `aSub` 축으로 따로 돈다)이고,
  같은 조각 자료를 나눠 쓰는 둘째 메시 `FOAM.sheet`(셰이더 `FOAM_SHEET` 갈래)가 그 밑 수면에 거품 레이스 그림(`foamLaceTex`)을 깐다.
  **지금은 레이스 판만 그린다**(사용자 요청 — 세모 거품을 없앰): 사면체 뭉치 메시 `FOAM.mesh` 는 만들되 장면에 넣지 않는다(조각 자료 `aA`~`aD` 는 판이 같이 쓴다). 되살리려면 `foamInit` 끝에서 `scene.add(mesh)`.
- **들꽃은 입체다**(`G.flower` — 꽃대 · 꽃잎 5~6 · 꽃술 · 잎 두 장, 흰 바탕(PLAIN)이라 얼룩 빛깔이 그대로 입혀진다). 포기당 300 세모 남짓 — 가까운 겹(46 m)에만 선다.
- **식물은 멀어져도 제 생김새다**(사용자 지적 — 25 m 에서 '기준 그루' 로 갈아 끼우는 게 눈에 띄었다). 나무 갈래(`floraFar`)는 먼 단계도 **그루마다 제 벌(`p.v`)을 줄인 것**
  (`U.fm[k].lods[단계][벌]` — `floraLodGeo` 가 줄기·큰 가지는 그대로 두고 잎 판·잔가지만 솎는다)이라 구조가 안 바뀐다 · 제 생김새 그대로는 50 m(`FL_FULL` — 사용자 요청으로 35 → 50 · 칸이 차면 줄인 첫 단계로 넘긴다 ·
  자동 품질로 0.75배까지만 당김) · 50~60 m 잎 65% · 60~95 m 30% · 95~160 m 12% · 160 m 밖 그림만 기준 그루 하나. 덤불·고사리·꽃 겹은 늘 제 벌.
  잰 값(상륙 자리): 삼각형 18.7만 → 19.6만 · 그리기 호출 42 → 94(벌마다 메시). 35 → 50 m(배율 2 섬 상륙 자리): 제 생김새 그루 35 → 52 · 식생 삼각형 11.4만 → 11.9만 · 칸 넘침 0.
- **식물 가지는 무작위로 갈린다**(사용자 요청) — 나무고사리 35% 쌍머리 + 마른 잎 치마 · 야자 30% 쌍줄기 · 바나나 곁순 0~2 · 대나무 마디 곁가지 ·
  자작 25% 갈래 줄기 · 어린 전나무 아래층 빠짐 · 20% 쌍우듬지 · 어린 활엽수 낮은 곁가지 · 고사리 새순. 벌(`FLORA_VARS`)마다 씨앗이 달라 그루마다 다르다.
- **밤에도 구름은 그대로**(`cloudFade` 밤 0.82 — 예전 0.35) · 구름 덩이 경계구 여유는 알 반지름의 0.75배(판 모서리 0.71배 — 0.5 였을 땐 화면 가장자리에서 덩이가 잘려 툭 나타났다 사라졌다).
- **겨눈 낮은 식생(덤불·버섯·꽃)이 캐기보다 먼저다**(`floraAimed` — 74-icons-guns.js · `harvestByUse` 가 본다) — 빈손 캐기 대상(풀)이 둘레에 있으면
  덤불을 보고 눌러도 풀이 뽑히고 덤불 막대가 안 찼다(사용자 지적 '덤불 채취 진행창이 잘 안 보임'). HUD 도 캐기가 먼저면 캐기 안내를 보인다.
  `GATHER` 는 같은 포기를 `key` 로 알아본다(겹을 다시 깔아 대상 객체가 바뀌어도 이어서). 진행 막대 `#lookB` 는 6 px.
- **왼쪽 아래는 한 줄기다**(`#blcol` — 든 것 `#tool` 이 상태창 `#vitals` 위에 쌓인다 · 예전엔 `bottom:118px` 고정이라 산소 칸이 생기면 겹쳤다).
  캠코더 화질이면 상태창 상자에 안쪽 번짐 · 막대 속에 번짐·주사선(`body.camc #hud .pnl` · `.bar .f`).
- **일시정지 화면의 조작 안내는 한 줄에 글쇠 하나**(`#ov .k` — 가운데 축 두 칸 · 글쇠는 `<kbd>` 키캡). 첫 칸 `span` 의 글을 여는 화면 그림
  (`titleText` — 91-title.js)이 읽으므로 `<div><span>글쇠</span><em>설명</em></div>` 꼴을 지킬 것.
- **조합 나무(`CTREE`)** — 마지막 줄(이것 → 이것으로 만드는 것)은 없다(사용자 요청) · 누르면 **만들 수 있으면 만든다**(가운데 물건 · 가지 —
  못 만들면 예전처럼 그 제작법으로 건너감) · 커서가 떠나면 0.09초에 닫힘 · 만들거나 재료가 바뀌면 `drawCraft` 끝의 `ctreeRefresh` 가 다시 그린다.
  제작이 어느 갈래로 끝나든 `craftDirty` 를 세운다(예전엔 실패 갈래에서 '만드는 중' 이 남았다). 고른 제작법 칸의 개수(만들 것 ×n · 가진 수/드는 수)는 크게.
- **옮기기(F) — 아크 서바이벌처럼 집어 들고 돌려 놓는다**(사용자 요청 · `MOVE` · `moveStart`/`updateMove`/`moveRotate`/`movePlace`/`moveCancel` — 60-stations.js).
  예전의 'F 를 누르고 있는 동안 밀기'는 없앴다. 설비를 보고 F → 그 메시가 시선을 따라온다(눈에서 시선을 걸어 땅·토대·지붕(`floorAt`)에 닿는 첫 점 ·
  4.5 m 안에 안 닿으면 앞 2.6 m · 발밑으로는 안 당긴다) · 휠·R(Shift+R 반대)로 15° · 좌클릭 놓기 · F·우클릭·Esc 그만두기(제자리로).
  발밑 고리(`MOVE.ring`)가 놓을 수 있으면 초록, 아니면 빨강 + HUD 에 까닭(`moveCheck` — 물가·비탈·판 가장자리·발밑·다른 충돌체(같은 층만)·다른 불 2.4 m).
  드는 동안 제 충돌 원은 r 0 으로 빼 두고 놓을 때 `cgMove` + 높이 구간을 옮긴다. 돌린 각은 저장된다(불·제련로·숫돌·모루·보관함 `ry`).
  옮길 수 있는 것은 `pushKind`(보관함 · 화덕·가마 · 제련로 · 숫돌 · 모루 — 증기기관·물레방아·발전기는 자리에 매여 있어 안 된다).
  **드는 동안 몸은 제자리다**(베타 신고 — 짐이 든 상자를 들고 걸어 무게 제한 없이 날랐다 · 레포 주인 결정: '회전은 되지만 앞으로 움직일 수는 없게') —
  `updatePlayer` 가 `MOVE.t` 면 `NO_KEYS`(걷기·뛰기·돌진 안 받음 · 중력은 그대로) · `climbTick`·`wallTick` 도 안 붙는다 · 배·나무·벼랑에 올라 있으면 `updateMove` 가 그만둔다.
  잰 값(상륙 자리 · W+Shift 2초): 들고 있는 동안 8.5 m → 0 m · 놓은 뒤 14 m(그대로).
  **설비를 만들 때 둘레 설비와의 거리로 막지 않는다**(베타 신고 — '근처에 건축물이 있으면 설치 못 한다' · `PLACE_FREE` — 55-craft.js) — 만든 설비는 곧바로 집어 든 꼴(`moveBegin(c,true)`)로
  넘어가 자리를 따로 고르는데, 그 전에 눈앞 1.4 m 의 **처음 자리**를 두고 불 3 m(모든 설비) · 제련로 3 · 모루·숫돌 2.5 · 상자 1.6 m 로 퇴짜를 놓아 모닥불 곁에서 상자도 못 만들었다.
  이제 모닥불 · 제련로 · 모루 · 숫돌 · 바구니 · 상자 · 쓰레기통은 `campfireSpot(true)`·`placeXxx(true)` 로 물가·비탈·판 가장자리만 보고, 겹침은 놓는 자리의 `moveCheck` 가 본다.
  놓지 않고 그만두면(`moveCancel`) 처음 자리가 겹칠 때 둘레 4 m 안의 놓을 수 있는 가장 가까운 자리로 옮긴다(`moveSettle`). 새 설비는 방금 세운 충돌 원을 바로 쥔다(`c._col` —
  `pushCollider` 는 자리로 짝을 찾아 처음 자리가 다른 설비와 꼭 같으면 그것을 잡았다). 물레방아 · 증기기관 · 발전기 · 선반 · 아크로는 놓은 자리가 끝이라 예전 거리 검사 그대로다.
  잰 값(눈앞 1.4 m 에 모닥불을 두고 상자를 만듦): 예전 '이미 모닥불이 있다'로 못 만듦 → 만들어지고 들린다 · 그만두면 불에서 1.5 m 로 비켜 선다.
- **짐이 무거우면**(적재 60% 넘게) 걷기만 해도 기력이 빠진다(만재 초당 6) · 뛰는 빠르기 1−0.4×적재(만재에서 높이 0.36배) · 뛰기 기력 ×(1+1.6×적재) ·
  기력이 다하면 0.7배로 걷는다(`updatePlayer`).
- **짓기 중 Esc 는 짓기만 끝낸다**(`BUILD_ESC_T` · `pointerlockchange` — 브라우저가 Esc 를 잠금 풀기로 먹어도 일시정지 화면을 띄우지 않는다).
- **식생·바닷가 따기는 누르고 있는 동안 막대가 찬다**(`GATHER` · `updateGather` · `gatherLook` — 95-flora.js) — `FLORA_PICK`/`SEA_PICK` 의
  `dur`(초)·`stam`(초당 기력) · 얻는 수는 `cnt` 안에서 무작위 · `extra` 는 딸려 나오는 것. 누른 순간(`floraPick`/`seaPick`)은 막힌 까닭만 알린다.
  **덤불(`twig`)·마른 덤불(`drytwig`)에서 나뭇가지**(+부싯깃·베리 가끔). 덤불·버섯은 겨눈 쪽으로 고른다(`ay` · 거리 × (2 − cos)).
- **노거수는 철 도끼 이상(`tool.axe` 2 — 철·강철 도끼)으로 벤다**(`GIANT_CHOP` · `giantChopTarget` · `g.prop` 이 HARV 틀을 탄다) — 통나무 10~21개,
  다 베면 넘어가고(`giantFallStart` · 자르는 면 `clippingPlanes` → `renderer.localClippingEnabled`) 판근 그루터기(`giantStumpGeo`)가 남는다.
  저장 `giants`(`GIANT.cut`). `findHarvestTarget` 은 손의 도구로 할 수 있는 대상을 1.2 m 앞세운다. **쓰러지는 장면은 아직 헤드리스로 눈으로 확인하지 못했다.**
- **손 발전기는 기력을 안 쓴다**(사용자 요청 — 예전엔 돌리는 동안 기력이 닳고 모자라면 못 돌렸다).
- **제작 창은 단계별 나무다**(`drawCraft` · `CRAFT_TIERS` 열두 단계 차례) — 단계 머리(만들 수 있는 수/전체 · 진척 막대 · 눌러 접고 펴기 `CRAFT_OPEN`) ·
  위에 단계 칩(누르면 그 단계로 감) · 줄마다 아이콘 · 재료 칩(모자란 것 빨강) · 도구 칩(지닌 것, 없으면 첫 후보 + '외 n') · 설비 칩 · 한 줄 설명(전문은 `title`).
  단계 안은 만들 수 있는 것 → 모자란 게 적은 것 차례. '가능만'(`#crfOnly` · `craftOnly`)은 지금 만들 수 있는 것만. 찾기·'가능만'·만들 수 있는 것이
  있는 단계는 저절로 펴진다. 아이콘은 한 번에 다 찍지 않고 6 ms 씩 나눠 찍는다(`iconSoon`/`iconPump` — 처음 열 때 211종을 다 찍으면 멈칫했다).
- **쓰기는 전부 좌클릭이다**(사용자 요청 — 예전엔 우클릭) — 공격(연사도 누르고 있는 동안) · 먹기·마시기·감기 · 전등 · 그물·수류탄 · 빈손이면 물가에서 마시기,
  그리고 **캐기도 좌클릭을 누르고 있는 동안뿐이다 — E 로 캐던 것은 없앴다**(`updateHarvest` 는 `useDown && harvestByUse()`).
  `harvestByUse()` = 캘 것을 보고 있고(`HARV.mode`) **빈손이거나 손의 것이 그 캐기 도구**(`HARV.mode.tool`)일 때 — 칼을 들고 덤불을 보면 캐지 않고 휘두른다.
  누르는 상태는 `useDown`(예전 이름 `rightDown`). **우클릭은 저격총 조준경(`mouseDown` → `updateScope`)과 전등·드릴 충전(`chargeHeld`)** 이다.
  짓기 중엔 좌클릭이 조각 놓기. **설비 조작도 좌클릭이다**(사용자 요청 — 예전엔 E): 상자·화덕·제련로·숫돌·발전기 열기와 문짝 여닫기는
  좌클릭을 짧게 눌렀다 떼면(`mouseup` → `releaseE`), 불 피우기·횃불 옮기기는 누르고 있으면(`updateFireInteract` 가 `useDown` 을 본다).
  **설비를 보고 있으면(`facing()` = `HARV.fit||HARV.cont`) 좌클릭이 공격·먹기를 안 한다**(연사도 멈춘다).
  **E 는 열린 상자·화덕·숫돌 창을 닫는 것만** 남았다(Esc 도 된다). 모바일 '줍기' 단추는 `useDown` 을 같이 켠다.
  `holdable(T)` = `tool` 이거나 `consumable(T)`(food·drink·heal). 생김새는 `WEAPON_FX` 가 아니라 `heldConsumable(id)` — 그래서 **손에 든 것의 `ITEMS[id].tool` 이 없을 수 있다**(`(…tool||{})` 로 읽을 것).
  **빈 드릴은 맨손과 같다**(`pickMode`).
- **먹는 것(`food`)·감는 것(`heal`)도 `water`·`empty` 를 받는다** — 국·달인 물은 목을 축이고 토기를 돌려준다.
- **가죽은 귀하다 — 아르크토스 한 마리에 세 장**(`MOBS.bear.drop`). 키틴·뼈처럼 다룰 것: 새 물건 하나에
  한두 장만 쓴다(가죽 모자·물주머니·뼈 투구·뼈 덧댄 활 1 · 가죽 배낭 2 · 가죽 속옷 3).
- **불꽃은 셰이더다**(`makeFire(s)` · `FIRE_U.uTime` — `updateFires` 가 민다). 카메라를 마주 보는 판 둘에
  위로 흐르는 잡음으로 혀를 깎고 온도(밝기)를 흑체 색으로 칠한다(더하기 혼합) + 바닥 잉걸불 번짐 +
  연기 + 불티(점 — 셰이더가 시간으로 움직인다). 화덕 1.35 · 횃불 0.20(연기·번짐 없음).
  **불이 있는 것은 전부 이 셰이더 계열이다** — 화덕 · 횃불 · 기름 등잔 · 제련로(아치 앞 작은 불 + 목 위 불 ·
  아치 상자 앞면보다 앞에 둬야 보인다) · 총구 화염(`muzzleFlash` — 별꼴, 쏠 때마다 씨앗을 바꾼다) ·
  보급선 엔진(`makePlume` — 노즐 곁 푸른 흰빛 → 주황, 충격파 마디, `uPow` 로 길이·세기).
  아크로의 전기 불꽃은 불이 아니라 그대로 뒀다.
  **보급선(`makeShip`)** — 납작한 양력 몸통(돌림체 · 옆 1.25 · 위아래 0.62) · 유리 조종석 · 뒤로 젖힌 날개 끝의
  눕힌 엔진 통 둘(배의 노즐로 내려 뿜는다) · 꼬리 주 엔진(뒤로) · 기운 꼬리 둘 · 세 발 다리 · 항법등 깜박임 ·
  이륙 먼지(연기 셰이더). 세기는 `shipPower(k, 먼지)` 하나로 맞춘다.
  **보급선 히트박스**(`SHIP.box` · `shipBoxes` — 30-props.js): 배 로컬(앞 −z · 바닥 y 0)의 **볼록 다각형 + 높이 구간** 14개 —
  몸통은 납작해 옆구리 밑면이 2.5 m 넘게 떠 있으므로 **밑면 높이로 잘라 층을 낸다**(밑면이 1.9 · 2.5 · 3.1 · 3.2 m 보다 낮은 곳의 윤곽) ·
  배 밑판(1.1 m) · 날개(2.3~3.3 m) · 날개 끝 엔진 · 꼬리 엔진 · 경사판 · 다리 셋. `shipCollide`(사람 — 겹친 다각형의 가장 얕은 변 쪽으로 밀고,
  지난 프레임에 머리가 밑면 아래였으면 머리를 막는다) · `shipFloor`(날개·몸통 윗면에 선다 — `top(x,z)` 를 단 것만) · `rayShip`(총알 —
  메시 광선, 불꽃·먼지·항법등 뺀 `SHIP.solids`) · `shipInside`(로켓은 터지고 수류탄은 튕긴다). 배가 오르고 도는 것을 따라간다(요각만 — 배는 기울지 않는다).
  떠난 뒤(`'away'`)는 판정 없음. 상륙 자리는 `LANDING` 이 배 밖으로 정해 두고, 그래도 몸 속이면 `spawnPlayer` 가 밀어낸다. **배 모양을 바꾸면 `shipBoxes` 의 치수도 같이 고칠 것.**
  **불티 크기는 세계 길이로 잡을 것** — 화면 픽셀 ÷ 거리로 잡았더니 눈앞 0.5 m 횃불의 불티가 600 px 공이 됐다.
- **증기기관(`placeSteamAt`)은 화덕과 같은 불 용기다**(`kind:'fire'` · `steam:true` · `FIRES` 에 든다) —
  땔감 넣기·불 붙이기·꺼짐·저장이 화덕 규칙 그대로다(저장은 `fires[].st`). 불이 붙어 땔감이 남은 동안
  7 m 안의 발전기를 돌린다 — **`powered()` 는 이제 `turnsDynamo(d)`(물레방아 **또는** 불 땐 증기기관)**.
  발전기도 증기기관 곁에 놓을 수 있다.
- **축전지는 `cell` 필드를 단 것이다**(납축전지 100 · 8.2 kg · 리튬이온 전지 200 · 3.2 kg) — 비어서 나오고(`invAdd`·`contAdd`),
  발전기 곁 좌클릭(`chargeAtDynamo`)이 지닌 것을 한꺼번에 가득 채우며, 전등·드릴은 우클릭으로 가장 많이 남은 축전지부터
  옮겨 담는다(`drawFromBattery`). 새 축전지는 `ITEMS` 한 줄에 `cell:1` 이면 된다(예전엔 `id==='battery'` 가 세 군데 박혀 있었다).
  **리튬이온 전지 사슬**: 화강암을 떼어 낼 때 25% 로 리튬휘석(`MINE.granite.extra` — 캐는 것에 딸려 나오는 것은 `extra:{id,p}`,
  `obtainOf` 도 읽는다 · 섬 생성은 안 건드린다) → 탄산리튬(불 · 황산 · 잿물) → 흑연(아크로 · 숯 · 전극) · 인산철리튬(아크로 ·
  탄산리튬 · 물고기(뼈의 인) · 연철 · 황산 · 숯) → 리튬이온 전지(선반 · 강철 통 · 구리선 · 알코올 전해액). 뼈는 본편에서 아직
  못 얻으므로(몹이 안 나온다) 인은 물고기에서 얻는다.
- **화상은 무기 필드 `tool.burn:{t,every,dmg}` 다** — 잿불 무기 넷(`sword_ember` · `spear_ember` · `axe_ember_war` · `hammer_ember`)이 단다.
  강철 무기 넷과 성능이 같고(해머는 기절도) 0.5초 동안 0.1초마다 5 를 더한다. 모루 · 그 강철 무기 1 + 잿불 비늘(검 4 · 창 2 · 도끼 4 · 해머 5) + 참숯 1 + 노끈 2.
  근접 명중이 `setBurn(c,B)` 로 `c.burn` 을 달고 `updateWeapon` 이 `burnTick` 으로 흐른 시간만큼 틱을 센다(프레임과 무관 — dt 1초 한 번에도 25).
  **겹치지 않는다** — 타는 동안 또 맞으면 남은 시간만 처음 길이로 되돌리고 틱 시계는 그대로 둔다(빠르기 그대로). `c.fireproof` 면 안 탄다
  (애쉬스케일을 본편에 들이면 달 것). 피해는 갑옷을 안 거친다(근접 피해도 `hit.hp-=` 그대로다). 본편엔 아직 몹이 없어 `CREATURES` 가 비어 있다.
  **생김새는 `emberClad(강철 생김새, skip)`** — 강철 무기를 그대로 빚고 쇠 재질(`WMAT` 0x6b7077·0xc8ced4·0x74797f) 메시를 검은 바탕으로 바꾼 뒤
  비늘을 단다(자루·노끈은 나무·끈 재질이라 저절로 빠진다 · **검은 날만** — 코등이·폼멜은 `skip` 으로 맨쇠, 사용자 요청). 비늘은 **줄을 맞춘다**:
  겉을 촘촘히 훑은 점을 끊은 법선(1/3 칸)마다 그 면의 가로·세로 격자(`EMB` — 칸 2.7 cm · 줄 2.5 cm · 홀수 줄 반 칸)에 넣고 칸마다 가운데에 가장
  가까운 점 하나에 세운다. 처음엔 1.1 cm 비늘을 무작위로 솎아 5~7천 장을 뿌렸더니 주황 털처럼 보였다. 끝은 손잡이 쪽(−y)으로, 조금 젖혀 윗줄이 아랫줄을
  덮는다. 비늘 · 달아오른 테(조금 큰 같은 꼴, 자체 발광) 인스턴스 둘 — 한 자루 비늘 425~951 장(테까지 850~1,900).
  비늘 윤곽은 곡선 마디 2(`ShapeGeometry(sh,2)` — 예전 4) — 한 자루 삼각형 1.2~2.7만 → **0.5~1.2만**(검 6,368 · 창 5,328 · 전투도끼 11,568 · 해머 8,424). 생김새는 그대로다.
  비늘 사이로 검은 바탕이 꽤 보인다(해머 마구리 · 전투도끼 쐐기 — 일부러 검게 칠해 둔 것이라 갑옷처럼 0 으로 맞추지 않았다).
- **전동 드릴(`tool.drill`)은 내구가 곧 충전량이다** — 0 이 되면 부서지지 않고 멈추며, 지닌 납축전지에서
  `drawFromBattery` 로 옮겨 담는다. 발전기 곁 충전(`chargeAtDynamo`)도 받는다. 곡괭이 등급 3 · 빠르기 8.5.
- **수류탄(`tool.throw`)** — `attack()` 이 `throwGrenade` 로 넘긴다. 포물선(16 m/s · 중력 9.8) → 튀며 구름 →
  신관 3.5초 → `explode`: 피해 330 · 반경 7 m 안 짐승·사람을 (1−d/r)² 만큼(사람도 같다 — 갑옷만 깎는다) · 화강암 노두를 깨뜨림.
  **폭발 불빛은 하나(`BLAST_LIGHT`)를 계속 쓴다** — 터질 때마다 광원을 달고 떼면 광원 수가 바뀌어
  모든 재질이 셰이더를 다시 짜 멈칫한다.
- **칸마다 상태가 다른 것은 `indiv(T)` 가 가른다** — `T.tool||T.sips||T.durMax`.
  내구(`durMax`)를 단 물건은 도구가 아니어도 따로 선다. 안 그러면 겹쳐 쌓이면서
  남은 양이 사라진다(축전지가 그랬다).
- **전기 설비 넷(`WHEELS`·`DYNAMOS`·`ARCS`·`LATHES`)은 `snapshot().power` 에 담긴다.**
  여태 저장하지 않아 불러오면 통째로 사라졌다 — 화학 단계가 전부 이 위에 서 있다.
  물레방아 → 발전기 → 아크로·선반 차례로 다시 세워야 한다(뒤엣것이 앞엣것을 찾는다).
- **참나무 가지는 `growOak` 이 따로 친다** — 줄기 위쪽(2.5~4.9 m)에서 굵은 원가지 `sc`(`22.5×P.limb` — 설정 0.8 에서 18, 맨 위 하나는 줄기를 잇는 우듬지 · 굵기 0.2 m · 길이 `L0` 1.42 · 우듬지 `L1` 1.18 m — 처음 2.9·2.4 에서 사용자 요청으로 0.7배씩 두 번)가 비스듬히 위·바깥으로 뻗고, 끝에서 둘(25% 셋)로 갈라지며(주축 0.72~0.84 길이·끝 굵기의 0.85, 곁 0.55~0.7·0.62) 바깥으로 눕는다. 몸통 중간 잔가지는 `space`(0.58 m)마다. 사용자 요청으로 **줄기에서 나는 원가지를 7 → 18 로 늘리고 잔가지를 줄여(갈래 깊이 4 → 3 · 간격 0.4 → 0.58 m) 그루 평균 가지 수는 651 → 650 으로 그대로** 맞췄다. 가지 수는 node 로 `growLimbs`·`growOak` 만 떼어 돌려 잰다(브라우저 측정 549 와 1% 안). 깊이 `depth` 3. 굵기 4 cm 넘는 가지엔 잎이 없다. 예전엔 4.6 cm 막대 50개를 빗살처럼 꽂아 실제와 딴판이었다. 아래 `TREE[].n`·`growLimbs` 설명은 이제 전나무만이다.
- **짧은 가지(0.5 m 밑 · `SHORT_LIMB`)는 따로 담는다** — 3각 2마디 `limbShort`(12 삼각형) 인스턴스 메시 `p._ls`/`t.ls`, 긴 가지는 4각 6마디(48) `p._lb`/`t.lm`. 가지 j 가 어디 몇 번인지는 `p._lmap`(≥0 긴 · <0 이면 −(번호+1) 짧은) — **가지 행렬은 `getLimbM`/`setLimbM` 으로만 읽고 쓸 것**(`p._lbBase+j` 로 `p._lb` 를 직접 읽으면 틀린다). 잎 번호는 그대로 `(_lbBase+j)*LPB`. 잰 값(그루당 가지 삼각형): 참나무 26,330 → 13,684 · 전나무 46,823 → 18,890(짧은 가지가 참나무 64% · 전나무 80%).
- **나무는 수관 덩어리 없이 가지만으로 이뤄진다.** `TREE[].n` 은 줄기에서 바로 나오는
  **원가지** 수이고, `growLimbs` 가 거기서 곁가지를 재귀로 친다(`LIMB_DEPTH`=2).
  **곁가지 길이 = 부모 길이 − 붙은 자리까지의 거리 ±0.1 m**(세계 단위 m 이므로 `p.s` 를
  먼저 곱해 센다). **잎은 곁가지를 안 친 끝가지에만 단다.** 곁가지 수는 씨앗에서
  나오므로 미리 알 수 없다 — `growLimbs` 를 **한 번 헛돌려 세고 두 번째에 행렬을 쓴다.**
  꺾기(`hideLimb`)가 인덱스로 가지를 지우므로 **아래 가지(0..brMax-1)는 곁가지를 치지 않는다.**
  **꺾인 가지는 br..brMax-1 이고 `shrinkFoliage` 는 부를 때마다 그 구간을 전부 숨긴다**(몇 번 불러도 같다). 예전엔 '방금 꺾인 것'
  하나(br 번)만 숨겨서 저장을 불러오면 앞서 꺾은 가지가 되살아났고, 도끼질(통나무)은 br 이 그대로라 brMax 번 — 꺾을 수 없는
  구조 가지 — 를 지웠다. **참나무·전나무 가지는 다시 자라지 않는다**(`HARVEST.oak/fir` 에 `regrow` 가 없다 — 다시 자라는 것은 풀·갈대·모래).
  **곁가지 수는 그 가지의 길이에 비례한다** — `len/TREE[].space`(참나무 0.40 m · 전나무 0.355 m 마다 하나) 개를 내고
  소수부는 그 확률로 한 개 더 낸다. 깊이별 확률표는 없앴다. 곁가지가 부모의 0.2~0.58 로
  짧아지므로 **재귀가 길이로 저절로 멎는다** — `LIMB_DEPTH`(4)는 규칙이 아니라 안전장치다.
  **잎은 모든 가지에 단다**(속가지는 0.62배로 작게). 원가지는 설정 기본(`P.limb`=0.8)에서
  참나무 50 · 전나무 71 이고, 나무 하나가 가지 1,000개쯤,
  가까운 칸만 자세히 그리므로 실제로 그리는 나무 삼각형은 섬 전체의 1~2% 다 — 무거우면
  `TL.full`(제 가지로 서는 거리)을 내리거나 `TREE[].space` 를 올리거나(가지가 성겨진다)
  설정의 `P.limb`(원가지 수 배율)을 내릴 것. 그다음이 `LEAF_PER`(참나무 3 · 전나무 2)다.
  **참나무 잎은 알파 카드다** — 잎을 삼각형으로 빚지 않는다. **잎맥은 잎 윤곽으로 잘라(`clip`) 그린다** — 안 자르면 곁맥 끝·둥근 붓끝이 테두리 밖으로 삐져 가시처럼 보였다. 잎 아홉 장짜리 한 줌을
  **캔버스에 그려**(`makeLeafTex`, 256², 외부 파일 없음 — `makeTreeTex` 와 같은 방식)
  십자로 겹친 판때기 두 장(`leafCard`, 4면)에 붙인다. 잎 모양·잎맥·가장자리는 전부
  그림 안에 있다. **재질은 `alphaTest:0.5` 로 자른다** — `transparent:true` 로 하면
  깊이 정렬이 어그러져 먼 잎이 앞에 뜬다. `mergeParts` 는 uv 를 안 옮기므로 거치지 않는다.
  **참나무 잎은 판때기 하나가 인스턴스 하나다**(`LEAF_PER.oak`=3) — 가지 끝 `LEAF_BACK`(0.1 m)
  앞부터 밑동 쪽으로 무작위 자리에 세 장을 흩어 단다(`putLeaf`). 그래서 **잎 인스턴스
  번호는 `(_lbBase+j)*LEAF_PER+q`** 이고, 가지를 꺾는 `hideLimb` 도 그 가지 몫을 전부
  접어야 한다. **전나무 잎은 잔가지 그림이다**(사용자 지적 '바늘이 이상하다' · `makeNeedleTex` → `leafTexFir` · 30-props.js) — 가운데 줄기에 바늘이 양옆으로
  빽빽이 난 잔가지 한 줌을 그린 알파 카드(십자 두 장)를 **가지마다 둘** 단다: 하나는 끝 쪽(가지 길이의 0.42~1.04) · 하나는 밑동 쪽(0.04~0.58 — 0.7 m 밑 가지엔 없음),
  카드 세로 = 그 구간 길이 · 가로 = 잎 크기×1.25(0.16~0.62 m) · 가지 둘레로 무작위로 돌리고 조금 젖힌다. 예전엔 가지 끝에 바늘 다발 하나라 성기고 가시처럼 섰다. **장수와 `space` 는 짝이다** —
  장수를 반으로 줄이면 `space` 를 낮춰 가지를 그만큼 늘려야 나무 한 그루의 잎 총수가 유지된다. **참나무 잎은 한 장이 삼각형 48장**이다 —
  길이 6칸·폭 4칸 격자에 주맥과 곁맥을 능선으로 새겼다(`leafRound`). 한 덩이가 432장이라
  잎만으로 1억 8천만 삼각형이 넘는다. 값이 아니라 모양을 보려고 만든 것이니, 무거우면
  장수부터 줄일 것.
- **참나무·전나무 단계 — 그루마다 거리로 고른다**(`TL` · `tlEval`/`tlRepack`/`tlThin` — 30-props.js · 사용자 요청 '식생처럼').
  새 식물(`floraFar`)과 같은 길이다: **18 m(`TL.hi`) 안 제 가지 그대로**(촘촘한 판 24면) · **45 m(`TL.full`) 안 제 가지**(성긴 판 18면 · 잎·잔가지는 다) ·
  그 밖은 **그 나무 제 것을 솎은 것** — 58 · 75 · 95 m 까지 65 · 35 · 18%, 그 뒤 7%(`TL.F` — 긴 가지는 긴 차례로 남기고 잔가지는 뺀다 ·
  잎은 고루 남겨 1/√몫 배로 키운다 · **전나무 바늘 다발은 1.45배까지만** — 크게 키우면 다발이 가시처럼 섰다). 경계에서 오락가락하지 않게
  2 m(`TL.hyst`) 더 가야 바뀐다. 거리는 자동 품질에 곱한다(제 가지 단계는 0.6배까지만 당긴다 · 0.7 밑이면 잔가지 빼고 촘촘한 판 없음).
  칸 가장자리가 125 m(`COPY_DIST`) 밖인 칸은 예전처럼 기준 나무를 찍은 **그림 판때기**(`t.bb` · `bakeTreeImpostor` — `buildFarTrees` 는 이제 이 그림만 짓는다).
  **예전엔 64 m 칸이 통째로 단계를 바꿨고 먼 단계는 기준 나무 한 그루 복제였다**(`bakeTreeGeo`·`FAR_LOD`·`t.cps` — 없앴다) — 칸 가장자리를 넘는 순간
  3~60 m 앞 나무 수십 그루가 한꺼번에 딴 나무로 바뀌었다(재 보니 한 번에 화면의 18~26%).
  ① **원본**(`tile.build` — 칸의 그루 전부의 가지·잎 압축 인스턴스 `t.lm`/`t.ls`/`t.fm`)은 **그리지 않는다**(장면에도 안 넣는다) — 자료일 뿐이다.
     45 m 안 그루가 있을 칸만 짓고(노는 중엔 한 프레임에 한 칸) 125 m 넘게 멀어지면 비운다. 꺾기·벌목(`hideLimb`)은 여기에 적는다.
  ② **솎은 자료**(`p._thin` · `tlThin`) — 그루 하나를 빈 그릇(`_tlS`)에 원본과 같은 `fillLimbs` 로 채운 뒤 꺾인 가지를 빼고 솎을 차례대로 담는다
     (단계가 앞 몫을 그대로 쓰도록 — 긴 가지는 길이 차례, 잎은 씨앗 차례). 그림에서 입체로 넘어가기 40 m 앞부터 프레임마다 3 ms(`TL.der`) 씩 짓는다
     (섬을 지을 때·45 m 안 칸은 한꺼번에). 꺾기·벌목 뒤엔 `shrinkFoliage` → `tlTreeChanged` 가 그 그루만 다시 짓는다.
  ③ **묶음 메시**(`t.lod.packs` · `tlPack`) — 칸마다 단계별(제 가지 `hi`·`lo`·`sh`·`lf` · 솎은 `L0~3`·`F0~3`) 압축 인스턴스 메시. 밑 지오메트리·재질은
     원본과 같아 셰이더가 늘지 않는다. 그루의 단계가 바뀐 칸만 다시 채운다(`tlRepack` — 바뀐 묶음만 · 가까운 칸부터 · 노는 중엔 프레임마다 3 ms `TL.pack`).
     모자라면 1.3배로 다시 잡고 옛 지오메트리는 **밑 정점·인덱스를 떼고** dispose 한다(`tlDisposeGeo` — 밑 지오메트리는 칸끼리 나눠 쓴다).
     경계구는 칸 전체(`t.lod.bs` · `noCull` — `boundTiles` 가 지금 그루로 좁히면 나중에 든 그루가 잘린다). 솎은 단계도 해 그림자 상자 안이면 드리운다(예전엔 58 m 밖은 받기만 — 아래 '해 그림자 상자를 넓혔다').
     그림이 된 지 오래(125+30 m)면 묶음을 놓고 솎은 자료만, 250 m(`TREE_DROP`) 넘으면 솎은 자료도 버린다.
  원본·솎은 자료가 아직 없으면 한 단계 굵은 것(또는 그림)으로 선다. 사람이 0.7 m(`TL.step`) 넘게 움직였을 때만 단계를 다시 고른다.
  **`camera.far` 는 못 줄인다** — 하늘 돔이 반지름 1500, 별이 1400 이라 같이 잘린다.
- **갑옷이 깎는 피해는 `armorMul()` 하나로 모인다** — `1/(1+방어/ARMOR_K)`(`ARMOR_K`=5,
  "피해가 절반이 되는 방어"). 상한이 없고 100% 에 닿지도 않는다. 예전의
  `1-방어/24`(0.72 에서 자름)는 방어 17.3 부터 전부 같은 값이라 강철 한 벌(20)과
  복합 한 벌(18)이 구별되지 않았다. 피해를 줄이는 자리를 또 만들지 말고 이걸 부를 것
  (`hurtPL` 과 `mitigate` 둘 다 여기로 온다).
- 제작 트리는 8단계 순서를 건너뛸 수 없게 되어 있다. 레시피를 추가하면
  재료→산출 의존성 기계 검증에 걸리는지 확인할 것.

- **성능 정리(20 fps 대응)** — 측정: JS 한 프레임 9 ms(미니맵 4.1 · 구름 3.3 · 하늘 1.2), 삼각형 1,531만
  (베리 316만 · 풀 224만 · 나무 110만, 그림자 패스 포함). 병목은 정점 수로 추정.
  ① **바람 흔들림 끔**(`WIND_ON=false` — 코드는 남김) ② **베리 공 12×9 → 8×6**(216 → 80 삼각형)
  ③ **풀·갈대·자갈·부싯돌을 64 m 칸으로 쪼개 `PROP_DIST`(85~110 m) 밖을 끈다**(`PROP_TILES` · 예전엔 섬 전체 한 덩어리) —
  채집은 `p._fm`/`p._fi` 가 제 칸 메시를 가리킨다 ④ **미니맵 바탕을 한 장으로 구워 둔다**(`mapBase` — 켜고 끌 때·10초마다만
  다시 굽고, 매번은 붙이고 화살만 그린다) ⑤ 하늘 셰이더 걸음 16×6 → 10×4.
- **성능 정리 2 — F3 성능 창으로 잰다**(사용자가 고른 A3·B1·C1·C7·D1·D3·D6·F3·G2·J1. B6 '먼 칸 소품 솎기'는 설명만 하고 미뤘다).
  ① **성능 창(`PERF` · F3)** — 구간별 CPU ms(하늘·날씨 · 구름 · 빛·그림자 · 칸·지형 · 세상·사람 · HUD·지도 · 그리기 JS) ·
  FPS · 1% low · 프레임 그래프(240장 · 16.7/33.3 ms 선) · 패스별 그리기 호출·삼각형(하늘 · 본 장면 · 그림자 —
  `renderer.render`/`shadowMap.render` 를 감싸 센다) · GPU ms(`EXT_disjoint_timer_query_webgl2`, 없으면 '못 잼') ·
  그림자 지도 다시 그린 횟수/초 · 구름 명암 대기열 · 지형 단계 · 메모리 · 진단 줄(예전 F3 '진단' 상자). 켜져 있을 때만 잰다.
  다른 PC 에서 느리다고 하면 이 창부터 볼 것 — 'GPU ms' 가 크면 그래픽 쪽, 'CPU 합' 이 크면 JS 쪽이다.
  ② **정적 물체 행렬 동결(D1)** — `freezeStatics()`(섬을 다 지은 뒤)가 소품·나무 칸 메시 · 지형 청크 · 하천의
  `matrixAutoUpdate` 를 끄고, `scene`·`skyScene`·`propGroup`·`cloudGroup` 자신도 끈다. 구름 덩이는 `updateClouds` 가
  자리를 옮긴 뒤 `updateMatrix()` 를 직접 부른다. **동결한 것을 옮기면 `updateMatrix()` 를 직접 부를 것**(안 부르면 안 움직인다).
  새로 붙이는 집·설비는 기본값(자동)이라 상관없다. 잰 값: `scene.updateMatrixWorld` 0.24 ms(물체 4,349 중 4,261 동결).
  ③ **그림자(A3·D3)** — 위 `LIGHT` ①② 참고. **구름 명암(C1)** — 위 `litQueue` 참고. **하늘 표(C7)** — 위 `SKY_LUT` 참고.
  ④ **지형 청크 LOD(F3)** — 청크(33×33 정점)를 인덱스로 바꾸고 단계 넷(1·2·4·8칸 — `TERR_LOD`)의 인덱스를 버퍼 하나
  (`TERR_IDX` · `terrainLodIndex`)에 이어 담아 `drawRange` 로 고른다(`updateTerrainLOD` — 매 프레임 칸마다 숫자 몇 개).
  단계마다 쌍선형 오차(`lodErr`)를 지을 때 재 두고, 화면에서 1 px(`TERR_LOD_PX`) 넘게 틀어지지 않는 가장 성긴 단계를
  고른다(60 m 안은 늘 촘촘 — `TERR_LOD_NEAR`). **청크 바깥 테두리 한 줄은 늘 촘촘한 줄 그대로** 두고 안쪽 성긴 격자와
  지퍼처럼 잇는다 — 이웃 청크와 단계가 달라도 틈이 안 난다. 섬 가장자리 청크는 정점을 `N−1` 에 붙여 담는다.
  잰 값: 청크 576 중 단계 1·2·4·8 = 22·26·53·475 · 지형 삼각형 118만 → 14만(−88%).
  **청크는 그리는 단위가 아니다**(사용자 요청 'B — 그래픽 쪽 줄이기') — 4×4 청크(320 m · `TERR_G`)를 한 지오메트리(`TERR_BLK` · 묶음 36)로 짓고,
  묶음의 인덱스를 청크마다 제 단계 구간을 제 정점 자리로 밀어 이어 붙여 만든다(`terrainJoin` — 단계가 바뀐 청크가 있는 묶음만, 바뀐 앞부분만 올린다).
  `chunks` 는 이제 메시가 아니라 {경계구 `bs` · 오차 `lodErr` · 단계 `lod` · 묶음 `blk`} 기록이다. 세모·단계 고르기가 그대로라 **화면은 같다**
  (캠코더를 끄고 같은 자리 여덟 방향 · 화면 아래 55% 를 일곱 화소마다 견줘 차이 0). 화면 밖 거르기는 묶음 단위로 굵어진다.
  잰 값(캠코더 끔 · 그림자 패스 포함): 지형 그리기 호출 51·93·336·236·51·108·346·206 → 9·13·29·24·9·14·31·21 ·
  전체 305·331·719·607·270·441·720·579 → 270·267·428·410·241·371·413·401.
  ⑤ **복제 나무·잎 판때기 인덱스(B1)** — `leafCard` 가 인덱스 판(네모 하나 정점 6 → 4)이고, `bakeTreeGeo`(먼 나무 복제 — 지금은 그루마다 단계라 없앴다)가 굳힐 때
  인덱스를 지킨다(예전엔 `toNonIndexed()` 로 풀어 가지 하나 정점 16 → 54 · 잎 8 → 12).
  ⑥ **가지·잎 인스턴스 압축(G2)** — 위 `SHORT_LIMB` 밑 머리말(`INST_DECL` · `instMesh` · `instPut`/`instGetM`/`instSetM`).
  인스턴스 900만의 자료가 594 MB → 297 MB(JS 와, 다가간 칸은 GPU 에도). **새 셰이더가 인스턴스 행렬을 읽으면
  `instanceMatrix` 대신 `INST_MAT` 를 쓸 것**(앞에 `${INST_GUARD}`) — 압축 재질에서 `instanceMatrix` 는 한 칸짜리 빈 버퍼다.
  압축 메시의 행렬은 `instGetM`/`instSetM`(가지는 `getLimbM`/`setLimbM`)으로만 읽고 쓴다. 압축 재질은 `instCompact(재질)` 로
  만들고 **그림자용 깊이·거리 재질도 압축으로 꼭 단다**(`customDepthMaterial`/`customDistanceMaterial`). 먼 복제·임포스터는
  예전 그대로의 인스턴스 메시라 재질도 칸에 따로 적어 둔 원래 것(`t.leafStd` · `LIMB_FAR_MAT`)을 쓴다.
  ⑦ **매 프레임 쓰레기·DOM(D6)** — 하늘(`tone3` 를 바깥 함수로 · `_hitS` 는 배열 대신 `_hs` 에 적는다 · `_atmOD` 토막 배열 없앰) ·
  날씨(`weaNoise` 속 화살 함수 · `weaNz`/`weaOn`/`weaG` 를 바깥으로 · 상태 몫·점유율 객체를 다시 씀) · `updateTileVis`(`setVis`) ·
  나침반 이름표. 하늘·날씨 값은 바꾸기 전과 비트까지 같다(시각 390개 · 구름 빛 20개 비교). **HUD 글은 `hudT(el,글)`/`hudH(el,HTML)`
  로 쓸 것** — 바뀔 때만 DOM 을 건드린다. 예전엔 보는 것의 안내를 프레임마다 `innerHTML` 로 다시 짜서 노드를 새로 만들고
  배치를 다시 쟀다. 둘은 같은 칸(`el._hv`)에 적으므로 한 요소에 섞어 써도 된다.
  잰 값(헤드리스 900×600 · 같은 자리 · 고치기 전 → 뒤 · 그림자 패스 포함): 사진 일곱 방향의 그리기 호출·삼각형 —
  북 272회·293만 → 154회·162만 · 동 341·292만 → 217·167만 · 남 741·643만 → 544·407만 · 서 628·681만 → 442·453만 ·
  하늘 256·352만 → 133·177만 · 노을 583·650만 → 352·418만 · 높이 238·267만 → 118·134만(호출은 대부분 그림자 지도를
  매 프레임 안 그려서, 삼각형은 거기에 지형 LOD). 갱신 JS 한 프레임(그리기 빼고 · 구름 덩이 263 · 300프레임) 평균 6.41 → 2.96 ms ·
  p95 18.7 → 5.4 · 최악 34.1 → 15.2 ms(구름 4.91 → 1.98 · HUD 0.59 → 0.27) / 시간 배속 20배 평균 82.0 → 8.7 · 최악 191 → 17 ms.
  사진 차이는 평균 0.04~0.74/255(그림자 상자를 4 m 격자에 맞춰 옮겨 잎 그림자
  가장자리 텍셀이 조금 달라진 것 — G2·LOD·D6 만 놓고 보면 0.00). 가지·잎 인스턴스 자료 594 → 297 MB · JS 힙(같은 검사 시점) 830 → 550 MB.
  **B6(먼 칸 소품 솎기 — 칸마다 인스턴스 순서를 섞어 두고 `count` 만 줄이는 것)는 미뤘다** — 보이는 소품 삼각형이 장면의
  3.1%(11.2만 / 362만)라 얻는 게 1% 안팎인데, 다가갈 때 포기가 돋는 깜빡임을 감추려면 칸마다 배율 유니폼이 들고,
  `count` 를 자주 바꾸면 그림자 지도를 다시 그려야 해서(A3) 그림자 상자(보통 96 m — 예전 46) 밖에서만 단계로 끊어야 한다.
  사용자 PC 에서 성능 창으로 GPU 가 정점에 묶였는지 먼저 볼 것.
- **성능 정리 3 — 화면이 한 화소도 안 바뀌는 것만**(사용자 요청: 'A~J 중 비주얼에 영향을 아예 안 주는 것').
  ① **칸 메시 경계구(A2)** — `boundTiles()`(`generateWorld` 가 `buildFarTrees` 바로 뒤에 한 번). r128 의 InstancedMesh 는 거르기를
  끈 채 태어나고, 켜도 밑 지오메트리 한 개의 경계구로 잰다 — 그래서 칸 메시가 시야·해 그림자·불 그림자(정육면체 여섯 면)에 늘 통째로
  그려졌다. 인스턴스 자리·크기로 넉넉한 구('자리 + (밑 구 중심까지+반지름)×가장 큰 크기' + 2 m)를 달고 `frustumCulled` 를 켠다.
  일반 인스턴스 메시는 늘 감싸개(속성·인덱스는 그대로 나눠 씀)를 씌워 구를 단다 — 밑 지오메트리는 칸끼리(또는 다른 물체와) 나눠 쓰므로
  건드리지 않는다(압축 메시는 지오메트리가 칸마다 제 것이라 구만 새로). 인스턴스는 그 뒤로 줄기만
  하므로(캐기·벌목·다시 자람) 처음 구가 늘 넉넉하다 — **칸 메시를 새로 만들거나 인스턴스를 처음보다 크게·멀리 옮기면 다시 부를 것.**
  잰 값: 낮 모닥불 장면의 그림자 패스 삼각형 1,130만 → 591만 · 호출 645 → 425(그림은 한 화소도 안 다르다) · 사진 일곱 방향
  (성능 정리 2 의 뒤 값 → 지금, 그림자 패스 포함) 북 154회·162만 → 129·119만 · 동 217·167만 → 183·80만 · 남 544·407만 → 518·308만 ·
  서 442·453만 → 415·403만 · 하늘 133·177만 → 94·59만 · 노을 352·418만 → 314·331만 · 높이 118·134만 → 75·38만. 일곱 장 모두
  앞 묶음과 화소까지 같다(노을 장의 79 화소는 별 자리 — 별은 켤 때마다 `Math.random` 으로 흩는다).
  ② **구름 명암 워커(C3)** — 위 구름 대기열 참고. 워커가 칠한 색이 본 스레드 것과 비트까지 같다(본편 덩이 6 · 1만 4,763 값 · 시험장 1만 9,296 값).
  ③ **같은 입력이면 건너뛰기(D4·D5)** — `updateTileVis`(사람 자리 · 투영×보기 행렬이 지난번과 같으면) · `updateTerrainLOD`(카메라
  자리 · 화면 배율) · `drawCompass`(방위) · HUD 스타일(`hudS(el,속성,값)` — 요소마다 마지막 값을 적어 둔다. **HUD 요소의 스타일을
  HUD 밖에서 바꾸면 어긋나니 거기도 `hudS` 로 쓸 것**). 칸·청크를 새로 지으면 `_tvForce`/`_tlK` 로 다시 센다. 잰 값: 같은 자리면
  `updateTileVis` 0.8 → 0 ms · `updateTerrainLOD`·나침반 0 ms · `updateHUD` 0.016 ms.
  ④ **셰이더 다시 짜기 줄이기(E1)** — 위 `LIGHT` ②의 해 그림자 주차 · 광원 수 규칙(횃불 · 보급선). 잰 값: 새벽(해 접힘) → 한낮 → 밤 →
  한낮 → 새벽 · 횃불 넣고 빼기 · 보급선 떠남 동안 셰이더 수 92 그대로(예전엔 고비마다 빛 받는 재질 전부를 다시 짰다).
  ⑤ **땅·물 셰이더(F2·F4)** — 땅: 120 m 밖에서 `nearK` 가 정확히 0 인 잔 얼룩·잔 요철은 심플렉스 여섯 번을 아예 안 센다
  (`mix(1,x,0)=1` · `1−x·0=1` 이라 값이 그대로). 물: 다 걷어 낸 물결(`fade`=0)은 cos 를 안 센다.
  ⑥ **프레임 제한(H3)** — 설정 '프레임 제한' 끔·30·60·120(`FPS_CAP` · `SET.cap`, 기본 끔). 정한 간격이 안 됐으면 그 화면 주기를
  건너뛰고 `last` 는 그대로 둬 dt 가 쉰 시간을 안는다.
  ⑦ **그리는 장치 이름 · 소프트웨어 렌더 경고(I2)** — `detectGpu()`(`WEBGL_debug_renderer_info`) → `GPU_NAME`/`GPU_SOFT`. SwiftShader ·
  llvmpipe · Microsoft Basic Render 면 시작 화면에 경고(`#ovGpu`). 성능 창 둘째 줄에 장치 이름. **헤드리스 시험에서는 늘 뜬다**(SwiftShader).
  ⑧ **벤치마크(J2)** — 설정 창 '벤치마크'(`benchStart`/`benchFrame`/`benchEnd` · `BENCH`): 착륙 캡슐 둘레 반지름 60 m 원을 눈높이로
  40초에 한 바퀴(앞 3초 데우기) · 그날 11시로 맞춤 · 놀이 멈춤(배고픔·불·제작 안 흐름) · 끝나면 사람 자리·시각 복원 · 결과 상자
  (평균 FPS · 1% low · 가장 느린 프레임 · CPU · GPU · 지난번) · `castaway.bench` 에 10개 · Esc 로 멈춤. 성능 창을 같이 켠다.
  ⑨ **데스크톱 그래픽 백엔드(I1)** — 데스크톱 판 설정 칸의 고르기(`#pAngle`): 자동 · Direct3D 11 · Direct3D 9 · OpenGL · Vulkan(Windows) /
  Metal · OpenGL(macOS) / OpenGL · Vulkan(Linux) → `userData/gpu.json` → 다음에 켤 때 `use-angle` 스위치(`main.js` 가 앱 준비 전에 읽는다).
  ⑩ **섬 생성 — 짓는 동안·시작 화면에선 소품을 안 그린다**. 칸을 켜고 끄는 `updateTileVis` 는 멈춘 동안(짓는 중·시작 화면 — `paused`)
  안 돌아서, 갓 지은 칸 메시가 **전부 켜진 채**(섬 전체 나무의 가지·잎이 가까운 단계로, 거르기도 없이) 덮개 뒤에서 그려졌다 —
  헤드리스에선 그 한 프레임이 수십~백 초였고, 실제 GPU 도 시작 화면에서 내내 그걸 그렸다. 이제 `generateWorld` 가 `placeProps_` 뒤
  `propGroup` 을 숨겼다가 다 지은 뒤 켜고 `updateTileVis()`·`updateTerrainLOD()` 를 한 번 부른다. 잰 값(헤드리스, 로딩 글이 바뀌는 때로 단계를 잼):
  준비까지 408~501초 → **28초**(자원 배치 134.6 → 12.5 · 상륙 준비 237.1 → 8.4 · 시작 화면 첫 응답까지 120.6 → 5.4초).
  앞서 G2(압축 인스턴스 셰이더가 정점마다 조금 더 셈)가 이 헛그림을 더 무겁게 해 891초까지 갔던 것도 같이 풀렸다.
  또 D3 에서 붙는 물체에 배역을 바로 주게 했더니 짓는 동안 해 그림자 지도에 짓던 섬이 통째로 그려졌다(408 → 856초) — 짓는 동안
  (`LIGHT.live` 거짓 — `generateWorld` 첫머리)은 `flush` 를 건너뛴다. **짓는 동안 그리는 프레임에 무거운 것을 켜 두지 말 것.**
  ⑪ **셰이더 미리 짜기(E2)** — `PRECOMP` · `precompPlan`/`precompStep`/`precompTick`(`loop` 이 멈춘 동안 부른다 · 자세한 것은 머리말).
  Three 는 광원 수(평행·점·집중광과 그 그림자 수)가 바뀌면 빛 받는 재질을 다 다시 짜는데, 한 번 짠 것은 재질마다 열쇠별로 기억해 되쓴다.
  그래서 시작 화면·일시정지 동안 ⓪ 지금 그대로 ① 점광원 +1 ② 그 그림자도 +1 ③ 손전등 그림자 ④ 불 + 손전등(③④는 전등을 지녔을 때만)
  조합을 프레임마다 8 ms 씩 짠다. 그림자 수는 예산을 흉내 낸다 — 손전등이 먼저 자리를 갖고 자리가 차 있으면 불의 그림자를 빼앗는다
  (처음엔 '자리가 남을 때만' 으로 셌다가 불 켠 채 손전등을 켜는 조합을 놓쳤다). 기준은 지금 광원과 '놓인 불을 다 끈 바탕' 둘이다.
  빈 장면에 같은 수의 가짜 광원 + 재질마다 대역 메시(**진짜 지오메트리** — 정점 색 칸 크기가 열쇠에 든다)
  → `renderer.compile`. 아직 장면에 없는 불꽃 재질(`fireMats` — 모든 불이 나눠 쓴다)과 총구 불도 넣는다.
  **r128 은 그림자 지도를 이번 프레임 광원을 세우기 전에 그린다**(`shadowMap.render` → `setupLights`) — 그림자용 재질의 열쇠는
  **앞 프레임** 광원 수다. 처음엔 이걸 몰라 불의 거리 재질을 '켠 뒤' 상태로 짜서 하나도 안 맞았다.
  잰 값(헤드리스 · 같은 길 — 상륙 → 모닥불 켬 → 손전등 켜고 끔 → 불 끔 → 손전등만): 놀이 중에 짠 셰이더 **62 → 0**
  (상륙 4 · 첫 불 24 · 손전등 17 · 불 끈 뒤 손전등 17). 대신 멈춘 동안 짠다 — 새 섬 시작 화면 99개, 전등을 얻고 불 켠 채 멈추면
  178개 더(두 기준 × 조합). 셰이더가 `PRECOMP_MAX`(400)개 쌓이면 더 안 짠다. 화면은 그대로다(짜기만 하고 그리지 않는다).
  **소프트웨어 렌더(`GPU_SOFT`)에선 안 한다** — 스위프트셰이더는 셰이더 하나에 수 초라 시작 화면 뒤에서 6분을 붙잡았다.
  헤드리스에서 재려면 `PRECOMP.force=true`. 새 효과 재질을 필요할 때 만들어 붙이면(아직 장면에 없으면) 그 첫 쓰임엔 여전히 짠다 —
  자주 쓰는 것이면 `precompPlan` 의 '아직 장면에 없을 수 있는 것' 에 견본을 넣을 것.
  C2(배속 때 구름 명암 — C1 예산이 √배속·최대 4배로 묶는다. 더 줄이면 명암이 해를 늦게 따라가 화면이 바뀐다)와 C5(갓 빚은 덩이 먼저 —
  C1 대기열이 한다)는 C1 으로 갈음했다.
  빼 둔 것(화면이 바뀐다): A1 · A4 · A5(따로 — 해가 낮을 때 먼 판때기 그림자가 상자에 닿을 수 있다. 안전한 몫은 A2 가 한다) · A6 · A7 ·
  B2~B5 · C4 · C6 · C8 · C9(알갱이 방향 0.23° 계단이 사라진다) · C10 · D2 · F1 · H1 · H2 · I3 · I4. G1(먼 칸 GPU 버퍼 내리기)은
  r128 에서 칸끼리 나눠 쓰는 밑 버퍼까지 지워져 다른 칸의 VAO 가 끊기므로 뺐다.
- **시작·멈춤 화면 렉 줄이기**(사용자 지적 — 브라우저 · 내장 그래픽 일체형 PC 에서 시작 · 로딩 · 인트로 · 일시정지 때만 몇 초씩 멈추고 단추가 늦게 먹었다. 플레이는 괜찮다).
  ① 여는 화면 그림(`titleDraw`)이 한 장 115~128 ms(헤드리스 882×552)였다 — 그 반이 캔버스 `blur` 8번. 이제 **흐림은 판마다 한 번 뜨고 색만 셋으로 나누고**(blur 는 선형이라 같다) ·
  둘째 흐림은 금 띠 상자(`T.bandBox`) 안만 · 형광막 번짐은 반 크기(`T.gh`)에서 · 안 움직이는 겹(바탕 · 관 명암 · 유리 반사 · 가장자리 어둠 · 주사선 두 벌)은 `titleStatic` 이 레이아웃 때 한 번 그린다 →
  **56 ms**. 화면 차이(미리 곱한 값) 평균 0.7/255 · 최대 9/255. **`TITLE` 에 새 칸을 달 때 이름이 겹치지 않게**(`T.bg` 는 바탕 그림 — 셈을 같은 이름으로 달았다가 여는 화면이 통째로 죽었다).
  ② 여는 화면(`#ov.title` — 불투명)이 떠 있으면 뒤의 섬은 데우기 세 장(`TITLE.bgN`)만 그리고 멈춘다(99-main.js).
  ③ 셰이더 미리 짜기(`precompTick`)는 마우스·키를 만진 뒤 0.8초 쉬고(`PRECOMP.inT`), 한 번에 30 ms 를 넘기면 그 세 배 쉰다(`PRECOMP.cool`) · 장면 다시 보기 1.5 → 4초.
  셰이더 하나 짜는 동안은 브라우저가 통째로 멈춘다(8 ms 예산은 짠 뒤에야 본다) — 실제 GPU 에서 하나에 얼마인지는 아직 못 쟀다(헤드리스는 미리 짜기가 꺼져 있다). 사용자 PC 에선 콘솔 `PRECOMP.ms/PRECOMP.n`.
- **구름은 새로 불리면 하늘 아무 데서나 피어난다**(`rerollCloud(c,true)`) — 바람 위쪽 가장자리에만 세웠더니 적운 60 덩이가
  한 줄로 몰려 한꺼번에 건넜다(한쪽 하늘에만 구름). 바람 위에서 들이는 것은 멀어져 되돌아오는 구름뿐이다.
- **바이옴 색은 텍스처다**(`bioTex` · `buildBioTex` · 셰이더 `uBio`) — 정점 색은 삼각형 안에서 직선으로 섞여 경계가 톱니였다.
  잡음으로 ±3 m 비튼 자리에서 쌍선형으로 읽는다. **땅 잡음은 심플렉스**(`SIMPLEX2` · `snoise`) — 값잡음은 두 겹을 돌려도 네모가 남았다.
  **바이옴 경계는 일곱 점 평균**(가운데×2 + 반경 3.5 m 여섯 점) — 한 점만 읽으면 칸 폭 띠로 뚝 바뀌었다.
  **물가 알파는 0.03~0.55 m 로 넓게 녹이고**, **하천 판은 물길 밖으로 한 칸 더 깔고**(둘레 칸 · 수위는 가까운 물길 칸 평균)
  `aEdge`(둘레 네 칸 중 물길 몫)가 0→0.5 인 사이에서 알파를 녹인다 — 물길 칸만 깔았더니 둑에서 물이 아직 깊어
  판이 알파 1 인 채로 끊겨 칸 모양 계단·세모가 드러났다.
  **땅 얼룩은 옅고 비튼 좌표다** — 큰 ±8% · 중간 ±4% · 잔 ±6% · 요철 명암 0.18+0.32×낮은 해. 23 m 잡음으로 9 m 비튼
  자리에서 두 겹씩 읽어 둥근 얼룩이 고르게 늘어서지 않는다.
- **암석 줄무늬 셋은 세계 높이 가로띠가 아니다** — 방연석·섬아연석 돌린 좌표의 정육면체 조각, 공작석 가는 선이 촘촘히 굽이치는 짙은 녹색 띠(1.5 cm 간격 · 거의 온 바위),
  석탄 층 + 결리. **GLSL 예약어 `patch` 를 변수로 쓰지 말 것** — 암석 셰이더가 통째로 컴파일되지 않았다.

- **먼 나무는 그림 판때기다**(`buildFarTrees` · `FAR_REF`) — 상륙 직후 사람에게서 가장 가까운 참나무·전나무 한 그루씩을 찍은 그림을 칸 가장자리가
  125 m(`COPY_DIST`) 밖인 칸의 그루마다 세운다(450 m 까지). 그 안은 그루마다 제 것(위 '참나무·전나무 단계'). **나무·풀 칸은 화면 밖이면 끈다**
  (`tileSeen` — 칸 경계구(반경+30 m)를 시야 절두체로 거름 · 가장자리 `CULL_NEAR` 10 m 안 칸은 늘 그림). 그래서 등 뒤 나무는 그림자도 안 드리운다
  (해가 낮으면 앞으로 뻗는 등 뒤 나무 그림자가 빠질 수 있다). 풀은 `PROP_DIST` 200 m.

- **가고일 뼈대 · 몸짓**(사용자 요청 '가고일 리깅 후 적절한 애니메이션' · 공용 구역 `/* ==== 가고일 뼈대 · 몸짓 ====` — 원본 `beta/gargoyle_arena.html`,
  battle·night·siege·trio·mixed 에 글자 그대로). 모델은 뼈 없는 한 덩이였다(셰이더가 `aWing` 몫만큼 날개만 x-y 평면에서 흔들었다 · `patchWing` 은 없앴다).
  뼈 21개(엉덩이·허리·가슴·목·머리 · 빗장·위팔·아래팔·손 · 넓적다리·정강이·발 · 날개 — L 은 x 를 뒤집어 R)를 `GARG_J` 에 모델 좌표로 박았다(+z 앞 · 발바닥 y 0 ·
  쉼 자세는 개구리처럼 웅크린 꼴 — 무릎이 팔꿈치 밑까지 올라와 있다). **가중치는 `tools/garg-rig.mjs` 가 세 `GARG_SKIN`(정점마다 뼈 둘 + 몫, base64 12만 자)에 담는다**:
  몸 세모로 1.2 cm 칸 부피를 채우고(179 조각으로 쪼개진 메시라 바깥 채우기가 틈으로 새어 속이 비었다 — x·y·z 세 줄 회전수 투표) 뼈마다 칸 속을 따라 잰 거리(지오데식)로
  가까운 뼈 둘을 1/d⁴ 로 섞는다 · 뼈 반대편 겉(법선이 어긋남)은 1.6배 벌점 — 곧은 거리로는 맞닿은 무릎·팔꿈치가 섞였다 · 빗장은 가중치 없음(있으면 윗가슴이 통째로 따라갔다).
  날개(aWing>0 · 어깨 위 보라 덮개(바탕 그림 빛깔로 가린다 — 도구가 크로미움으로 JPEG 를 푼다) · 날개에 이어진 얇은 막)는 날개 뼈 하나에 몫 1 — 위쪽 안 모서리를 경첩으로 통째로 돈다.
  **불러올 때(`gargSkinGeo`) 따로 움직일 두 덩이를 잇는 세모를 뺀다**(1,368장 · 4만 9,997 중 — 팔꿈치 밑↔무릎 위 · 발톱↔턱 · 날개↔몸·좌우) — 조각한 모델이 웅크린 채 붙어 있어 떼어 움직이면
  몸 빛깔의 넓은 판으로 늘어났다(쉼 자세에선 맞닿은 데라 안 보인다). 무릎은 조금만 편다(넓적다리·정강이 사이 접힌 면도 한 겉면이라 크게 펴면 판처럼 늘어난다 — 날 때 다리는 엉덩이에서 통째로 처진다).
  **몸짓(`poseGarg`)은 상태마다 목표 값(숙임·내려앉음·다리 처짐·팔 뻗음/치켜듦/늘어짐·고개·날개 폄·날갯짓 폭·빠르기·어지러움 — `GA`)을 정하고 값마다 지수 감쇠로 따라간다**(프레임률과 무관) —
  배회(앞으로 조금 숙이고 5~7 Hz) · 추격(더 숙임) · 준비(뒤로 젖히고 발톱을 치켜들며 날개를 들어 9 Hz 로 떤다 — 끝으로 갈수록 크게) · 돌진(몸을 눕히고 팔을 앞으로 · 맞히면 두 팔로 긋는다) ·
  경직·기절(`frz>0` — 땅에 내려앉아 웅크리고 날개를 접고 고개가 어지럽게 흔들린다 · 풀리기 0.7초 전부터 날개부터 깨어나 몸을 일으킨다) · 맞으면 움찔(체력이 준 것으로 안다) ·
  도는 만큼 눕는다 · 빨라지고 느려질 때 다리가 뒤처졌다 따라온다(용수철) · 고개는 노리는 것을 본다(`gargDraw(g,dt,바라볼 점,땅 높이)` 의 셋째 인자 — battle·night 은 `foeTarget`, 나머지는 사람).
  날갯짓은 내려치기가 빠르고(위상 `wp − 0.55 sin wp` — 부호를 거꾸로 두면 올리기가 빨라진다) 앞뒤로 8 자로 쓸며 막을 비튼다 · 날개를 펴는 회전은 등에 누운 막의 긴 축·법선을 옆으로 뻗은 축·위로 맞춘다(`gargWingOpenQ`).
  **죽으면 떨어져 등을 대고 눕고 다리를 오그리며 떨다가 6.5초 뒤 가라앉는다**(예전엔 그 자리에서 사라졌다 — 그래서 보이기는 `gargDraw` 가 정한다 · 처음 볼 때 이미 죽어 있던 개체(편성에 안 든 것)는 안 그린다).
  날갯짓 끔(시험장 '날갯짓' · `doWing`)은 `g.noFlap`. 가고일을 들인 판의 그리기는 `g.body=gargBody(기하,재질)` · `gargDraw` 둘뿐이다(재질은 `skinning:true` 가 된다 — r128).
- **애쉬스케일 자세**(사용자 요청 '더 자연스러운 애니메이션' · 원본 `beta/wyvern_arena.html` '자세' 구역 → battle·night·siege 에 `tools/wyv-sync.mjs`).
  ① **상태 사이 섞기 0.3초**(`WX_XF`) — 출발점은 지난 프레임에 그린 자세(`W.an.last`)다. 지금 뼈를 적으면 안 된다: AI 가 상태를 바꾸기 전에 휘두를 각을 푸느라(`solveClaw`·`solveBite`) 뼈를
  쉼 자세로 돌려놓는다. **`q.slerpQuaternions(q0, q, w)` 처럼 자기를 넣지 말 것** — r128 은 먼저 q0 를 복사해 버려 섞는 내내 옛 자세에 멈췄다가 끝에 한꺼번에 튀었다(임시 `_wxq` 에 옮겨 섞는다).
  잰 값(같은 판 40초 · 날개 뺀 뼈의 프레임 사이 최대 회전): 고치기 전 상태가 바뀔 때마다 31~56° → 지금 가장 큰 것이 10.3°(할퀴기 휘두름 — 일부러 빠르다).
  ② 날갯짓 — 위상 `wp − 0.45 sin wp`(내려치기가 빠르다) · 바깥 마디일수록 늦게(물결) · 올릴 때 손목을 접어 끝을 뒤로 · 몇 번 치고 날개를 편 채 미끄러진다(활공 1.8~3.2초 — 둘러볼 때는 쉬지 않고 친다) ·
  내려칠 때 몸이 뜬다(`W.an.dy` — 바깥 마디 `bRig` 높이에만 더한다) · 도는 만큼 눕는다. 쉼 자세 날개가 이미 들려 있어 가운데를 −0.24 로 내렸다(안 내리면 올릴 때 수직이었다).
  ③ 날 때 뒷다리를 뒤로 붙이고 앞발을 모은다(예전엔 땅 짚듯 늘어뜨렸다) · 노려볼 때는 깊고 빠르게 치며 다리를 늘어뜨리고 고개를 숙여 노리는 것을 본다(`wLook` — `curTgt().pt`).
  ④ 내리꽂기 — 날개를 뒤로 접고 땅 5 m 위부터 날개를 펴 버티며 다리를 내민다 · 착지 — 쿵 주저앉아(0.75 m) 날개를 땅에 펼쳤다가 고개를 흔들고(어지러움) 접으며 일어선다.
  ⑤ 걷기 — 왼뒤 → 왼앞 → 오른뒤 → 오른앞 차례 · 옮기는 다리만 무릎을 접어 들어 올린다 · 몸이 걸음마다 오르내리고 좌우로 흔들린다 · 머리는 흔들림을 덜고 · 서 있으면 숨을 쉰다.
  ⑥ 숨 모으기 — 젖히고 목을 S 자로 당기며 날개를 들어 편다 · 끝 0.65초 떤다 · 쏘는 순간(상태가 바뀔 때) 목을 내지른다(반동).
  ⑦ 할퀴기·물기 — `wSwing`: 뒤로 당겼다가(−0.35/−0.4) 맞는 순간 정확히 1(예전 `sin` 곡선은 그때 0.91) · 0.1초 머물고 돌아온다. **판정 자세(`applyClawPose`·`applyBitePose`)는 그대로** — 몸통에
  덧붙이는 기울기는 넣지 않았다(풀 때 자세와 달라지면 닿는 각을 찾아 놓고 딴 데를 친다). 잰 값(같은 난수 60초 · 사람을 노림): 결정은 같고(할퀴기 5 · 물기 11) 맞은 수 11 → 13.
  ⑧ 맞으면 움찔 · 죽을 때(부푸는 5초) 울부짖으며 일어섰다가 옆으로 무너져 낮게 깔리고 경련한다.
  ⑨ **이륙**(사용자 지적 — 쫓다가 놓치고 다시 날아오를 때 순간이동하듯 솟았다): 날기·노려보기의 고도는 이제 `wClimb(dt,목표)` 가 맞춘다
  (예전엔 `W.y=lerp(…,1−0.001^dt)` — 시상수 0.15초라 땅에서 0.25초에 16 m · 순간 130 m/s). 땅에서 뜨면 웅크렸다(`WCL.crouch` 0.55초 · `W.lift`)
  뛰어올라(`WCL.leap` 7 m/s) 초당 5 m 까지 오르고(가속 8 m/s² · 남은 높이 × 1.4 로 늦춤 · `W.vy`) 앞으로 나는 빠르기는 `W.flyK` 로 0 → 1(약 3초).
  내리꽂기처럼 다른 데서 높이를 옮기면(`W.y≠W.cy`) 오르는 빠르기를 새로 센다. 자세는 웅크림(땅을 디딘 채 굽혀 0.6 m 낮추고 날개를 높이 편다) →
  뛰는 순간 날개 맨 위에서 첫 내려치기(`A.wp=1.98`) → 크고 빠르게(1.6 Hz) 치며 머리를 들고 · 12 m 밑에선 다리를 늘어뜨린다.
  **`wClimb` 는 AI 쪽이라 `wyv-sync` 가 안 옮긴다** — wyvern · battle · night · siege 에 같은 글로 따로 들어 있다(고치면 넷 다).
  잰 값(쫓기 → 선회): 0.5초 웅크림 → 1초 2.3 m · 4초 17 m · 6초 19.8 m · 가장 빠른 오름 6.9 m/s · 날개 뺀 뼈 프레임 튐 7.9°(예전 7.8°).
- **아르크토스 뼈대 · 몸짓**(사용자 요청 '가고일처럼 모델에 뼈대 만들고 동작 더 자연스럽게 — 나한테 달려올 때 두 발 말고 네 발로' · 공용 구역
  `/* ==== 아르크토스 뼈대 · 몸짓 ====` — 원본 `beta/bear_arena.html`, mixed·trio·siege·battle·night 에 글자 그대로 · `node tools/bear-rig.mjs` 가 옮긴다).
  예전엔 뼈 없는 한 덩이를 관절 여섯(몸통·머리·팔 둘·다리 둘)으로 정점 셰이더에서 굽혀 팔다리가 막대째로 돌았고, 웅크린 채 두 발로 걸었다.
  ① **뼈 21개**(`BEAR_J` — 엉덩이·허리·가슴·목·머리·턱 · 빗장·위팔·아래팔·손 · 넓적다리·정강이·발 · 궁둥이 `rump` — 안 돌린다, 엉덩이 뼈 뒤로 나온
  궁둥이 살이 끌릴 자리)를 모델 좌표에 박아 `SkinnedMesh` 로 그린다(`bearBody(기하,재질,배율)` · 재질은 `bearShader(안개색,짙기)` — 예전 시험장 셰이더에 스키닝만 바꿈).
  모델이 비대칭이라 좌우를 따로 잡았다(왼 엉덩이 관절은 넓적다리 살 뒤쪽 위로 올렸다 — 오른쪽과 같은 높이면 넓적다리 뼈가 0.4 m 라 다리가 늘 다 접혀 있었다).
  ② **가중치는 `tools/bear-rig.mjs`**(`BEAR_SKIN` — 정점마다 뼈 넷 + 몫 셋, base64 19만 자): 2.5 cm 칸 부피 · 뼈마다 칸 속 거리 → 가장 가까운 뼈와 그 이웃에 1/d⁴ →
  **겉을 따라 24 번 고르게 편다**(처음 뼈가 이웃인 정점끼리만 — 몸통·목·머리·턱은 다 이웃) → 큰 넷. 가시·발톱(얇은 덩이)은 밑동 고리 한가운데의 몫을 통째로.
  둘만 골랐을 땐 이웃 정점끼리 둘째 뼈가 갈려 세모 변이 30 배까지 늘었다 — 지금 7 배(가시 끝뿐). 도구가 '몫이 갈린 변'(합 차이 0.9 넘게)을 센다 — 0 이어야 한다.
  그래서 **세모를 하나도 빼지 않는다**(가고일은 맞닿은 덩이를 잇는 세모를 뺀다 — 곰에 같은 규칙을 걸었더니 어깨·옆구리에 구멍이 났다).
  ③ **몸짓은 자세표를 섞는다**(`BEAR_D` — 엉덩이 높이·앞뒤 · 숙임 · 허리·가슴 굽힘 · 목·머리 · 턱 · 앞발 치켜듦 · 네 발 자리): 네 발 서기·걷기·달리기(`bearDLoco`) ·
  내려찍기(`bearDSlam`) · 경직(`bearDStun`) · 쓰러짐(`bearDDead`)을 상태 몫으로 섞고, 엉덩이·허리·목은 돌리고 **네 발은 두 마디 IK**(`bearIK` — 다 접힘·다 폄의 끝은
  피한다: 그 근처에선 무릎이 한 프레임에 45° 넘게 돌았다). 고개는 노리는 것을 본다(`bearDraw(b,dt,바라볼 점,땅 높이)` 셋째 인자).
  ④ **걸음** — 위상은 간 거리로 민다 — 디딘 발은 한 바퀴 거리(`len`)의 디딤 몫만큼 몸과 똑같이 뒤로 가서 땅에서 안 미끄러진다. 천천히는 옆걸음(왼뒤→왼앞→오른뒤→오른앞 · 디딤 64%),
  3.5→7 m/s 에서 갤럽(뒷발 둘 → 앞발 둘 · 디딤 32% · 한 걸음 5 m)으로 넘어간다. 서 있을 땐 0.4 rad 숙여 등을 눕힌다(덜 숙이면 고릴라처럼 섰다).
  **걷고 달리는 동안 머리는 세계에 붙든다**(사용자 지적 '달릴 때 머리가 너무 위를 본다' · `BEAR_D.hold` = 움직임 몫 · `bearApply`) — 머리 뼈 축을
  노리는 것 쪽으로 두되 0~−20° 안(없으면 −10°)에 맞추고 넘친 만큼 목 40% · 머리 60% 로 숙인다. 예전엔 몸을 숙인 만큼 고개를 젖혀 달릴 때 축이 34~50° 위였다(지금 −6~0°).
  **갤럽은 크게 움직인다**(사용자 지적 '팔다리를 너무 조금 움직여 역동적이지 않다 — 발 빠르기는 몸 빠르기와 같게'): 허리가 크게 오므렸다 편다(0.28 rad) ·
  앞발이 디딜 때 가장 낮고 숙이며 앞발이 차고 난 뒤 가장 높다 · 앞발을 높이 들고(0.52) 내려앉기 직전 앞으로 더 뻗으며 손목을 뒤로 접는다(`cuR`/`cuL` — 몸 옆에서 본 각을 돌린다) ·
  뒷발은 몸 밑으로 접어 당긴다. **걷고 달릴 때 디딤의 가운데는 다리마다 따로다**(`BEAR_GAIT.walkZ`/`galZ` — 앞발은 어깨 바로 앞 · 왼 어깨가 0.35 m 뒤라 왼앞발도 뒤) —
  서 있을 때 자리에 두면 팔이 모자라(다리 길이의 1.15 · 1.36 배) 앞발이 땅을 끌고 몸을 따라왔다(갤럽에서 디딘 왼앞발이 5 m/s 로 미끄러짐).
  무릎·팔꿈치가 나가는 쪽은 경첩 축으로 정한다(`bearIK(B,k,목표,경첩,옆,치켜들 때 쪽,몫)` — 다리 × 경첩) — 몸 앞쪽 한 방향으로 잡았더니 발을 앞으로 뻗을 때 다리와 나란해져 무릎이 98° 뒤집혔다.
  목표가 뿌리에 바짝 붙으면 아래로 눕힌다. 잰 값(시험장 · 일정 빠르기 · 디딤 가운데 70%): 디딘 발 미끄럼 1.5 · 3 · 5 · 9.6 m/s 모두 0 · 발이 몸에 대해 앞뒤로 가는 폭 1.05~1.40 → 1.62~1.65 m ·
  드는 높이 0.8 → 0.94~0.97 m · 앞다리 위팔이 쓸고 가는 각 68 → 108° · 아래팔 51 → 90° · 달리는 동안 뼈의 프레임 사이 최대 회전 27°.
  ⑤ **내려찍기** — 시험장의 `Q`(치켜듦·정점·명중)와 `P.atk` 를 읽는다: 뒷발로 일어서며 앞발을 머리 위로 · 입을 벌림 → 멎음 → 앞으로 몸을 던져 **`Q.hit` 에 앞발이 땅에 닿는다**.
  끝나고 빠지는 동안은 마지막 자세를 쥔다(`A.u` — `b.t` 는 다음 상태에서 0 이 되어 한 프레임에 54° 튀었다). 경직은 찍은 자세에서 숨을 몰아쉬며 일어선다 · 죽으면 배를 깔고 고꾸라진다.
  ⑥ **맞는 자리**는 뼈마다 머리→꼬리 캡슐(`bearHitCaps` · 반지름 `BEAR_CAPR`) — 공으로는 `bearHitSpheres`(bear·mixed 의 `bearSpheres`).
  잰 값(시험장 AI 40초 · 사람이 둘레를 돌며 다가감 · 뼈의 프레임 사이 최대 회전): 걷기·달리기 다리 27° 밑 · 내려찍기(0.1초에 내리꽂는다) 25~38°.
  달리다 내려찍기로는 9/초로 넘어간다(18 이면 첫 프레임에 앞발이 50° 넘게 튀었다).
  쓰는 것: `b.state·t·frz·speed·yaw·alive·hp·pos` 와 시험장의 `P`·`Q` — AI 는 그대로다.

- **지형 판 8 묶음**(사용자 버그 사진 · 요청 — 2026-10-19):
  ① **벼랑 면의 사진 · 금은 삼각형의 실제 면 법선으로 옆 투영을 고른다**(22-ground-textures.js `fN` — 화소 기울기의 외적). 정점 법선은 이웃 칸과
  섞인 값이라 벼랑의 길쭉한 삼각형에서 면과 딴 쪽을 가리켜, 면과 거의 나란한 투영을 읽어 V 자 빗금이 섰다.
  ② **암벽 덩이는 절리로 쪼개진 모난 덩이**(`cragShape` — 상자 쪽으로 당긴 공을 ±x·±y·±z 를 조금 기울인 여섯 평면 + 모서리 두셋으로 깎고, 깎은 면의 점은
  그 면의 법선) · **무리 안 덩이는 같은 쪽으로 선다**(`cragGrow` 의 `Y0`) · 무리 안 밝기는 조금만 흔든다. 꼴을 바꾸면 충돌(`cragSpan`)도 같은 꼴을 쓴다.
  ③ **하천 판은 한 칸에서 3 m 넘게 떨어지는 칸을 안 깐다**(`buildWater`) — 저수지와 소 사이에 비스듬한 깊은 물(검은 세모)이 허공에 섰다. 폭포 물살 판이 덮는다.
  ④ **바위 재질은 결 갈래(TEX)마다 셰이더 하나**(`rockMat` — 광물마다 다른 것은 `m.userData.rkU` 유니폼: `uRkKind` 사암·현무암 무늬 · 크기 · 금 · 이끼 · 광택).
  예전엔 광물마다 셰이더라 광원 수가 바뀔 때마다 스무 남짓을 다시 짜(M1 에서 하나 0.1~0.5초) 처음 보는 바위마다 멈칫했다.
  **결 갈래까지 유니폼으로 돌리지 말 것** — 공작석의 27번 고리까지 모든 바위가 안고 돌아 GPU 가 10 → 16 ms 였다(되돌려 7 ms). 새 광물 무늬는 `uRkKind` 에 번호를 더한다.
  `envPatch` 의 열쇠도 땅에 녹아드는 높이를 정점 값(`meltAttr`)으로 받으면 그 수를 빼 셰이더를 나눠 쓴다.
  ⑤ **미리 짜기는 숨은 칸 메시도 본다**(`precompPlan` 이 `propGroup._all` 을 돈다 — children 은 보이는 칸뿐이라 먼 바위 · 둔덕 칸 재질을 놓쳤다) · 쉬는 몫 3 → 1.2 배
  (M1 시작 화면에서 다 짜는 데 92 → 27 초). **지도 바탕은 찍을 소품만 추려 둔다**(`_mapProps` — 10초마다 180만 소품을 훑어 85 ms 씩 끊겼다).
  ⑥ **섬을 키운 뒤의 꼭대기는 `TEMPLE.hi`** — `stats.hi` 는 `worldRescale` 전 값이라 6배 섬에서 '높이의 몇 할' 조건이 다 틀렸다(신전 자리를 못 찾았다).
  ⑦ **물에 들고 날 때**(캠코더 셰이더 `uDive` · `uWet` — `camcEnd` 가 물속 여부가 바뀌는 순간을 잡는다) — 들면 거품 · 렌즈 일렁임, 나오면 렌즈에 맺힌
  물방울(볼록렌즈 굴절 · 어두운 테 · 흘러내리는 큰 방울과 물줄기). 캠코더를 끄면 안 보인다.
  ⑧ **잠수** — 대통 공기통(`air_tube` · `durMax` 100 = 공기 · 물속에서 숨이 30 밑이면 저절로 들이마시고 물 위에서 다시 찬다 — `airTube`) · 잠수 돌(`dive_stone` —
  지니면 Ctrl 3.6 m/s · 가만히 있어도 2 m 밑에서는 가라앉는다) · 오리발은 오르내림도 빠르게.
  ⑨ **줍기 표(FLORA_PICK)의 새 칸** — `chance`(운 — 야자열매 25%) · `miss` · `once`(한 번뿐 — `TEMPLE.taken`) · `loot`(속은 `templeLoot`).
  사암은 대개 돌멩이를 준다(석재는 `extra` 20%). 산호초(초원 · 돌기와 골 · 초 비탈)와 바위 암초는 `seaScatter` 가 바닷가의 결(`seaCoralCoast`)로 가른다.
  물고기는 정점마다 빛깔 + 비늘 · 옆줄 · 지느러미 살 · 은빛(`fishMat` — `aF`).

- **물속에서 올려다본 수면**(사용자 요청 '물속에서 본 수면 반사를 실제처럼' · `waterMat` 의 물속 갈래 — 20-terrain.js · 재질은 양면 `DoubleSide`) — 뒷면(물속)에서는
  물결 법선으로 시선을 굴절시켜(`refract(I,N,1.333)` — 물→공기) **스넬의 창**(천정에서 48.6° 안)으로만 하늘·해가 보이고, 그 밖은 **전반사**라 물속 빛깔과
  비친 바닥이 거울처럼 선다. 경계는 물→공기 프레넬(창 가장자리로 갈수록 반사가 는다). 잔물결 두 겹(진폭 0.17 · 0.10)이 창을 일렁이게 하고 해가 창 안이면 빛무리.
  앞면(물 밖) 셈은 그대로다. 양면이라 물 밖에서 물 밑면을 볼 일은 없다(땅이 가린다).
- **몬스터**(사용자 요청 · 지형 판 8 · 97-mobs.js · 몸은 97-mob-rigs.js) — 설정 '몬스터 수'(`#pMobs` 0~4 → `MOB_STEPS` 0 · 0.5 · 1 · 1.6 · 2.4 → `MON.k` · `SET.mobs`).
  **어디에 몇 마리가 사는지는 그날의 파워레벨 명단이 정한다**(`mobRoster` — 80-player.js 의 `rollSpawns(날, 시드 난수, powerBudget(날)×k)` · 사용자 결정 '옛날에 짜놓은 그대로' 2026-10-20 · `docs/CASTAWAY_개발요약.md` §7). **종마다의 고유값 = 고유 상수 `c`(가고일 1.3 · 아르크토스 1 · 애쉬스케일 0.5 · 스킨워커 0.8 · 다지류 0.7 · 나머지 1 — 사용자가 정함) × `mobFit(power, 날)`**(r = 그날 예산 ÷ power 가 250(`MOB_FIT_R`) 일 때 가장 높은 로그 종 모양 · 예산 밑값 `POWER_BASE` 100(2일차 100 · 38일 70880에서 멎음) — 둘 다 사용자 요청 2026-10-20 · σ = ln 4 · r < 1 이면 0 — 예전 손으로 적은 first · peak · rise · fall 은 없앴다 · 사용자 요청) · 남은 예산에 드는 몹들의 고유값 합에 대한 그 종의 몫이 확률 · 뽑으면 그 power 를 빼고 되풀이 · **몸이 없는 종(`hold`)도 뽑혀 예산을 차지한다**(섬엔 안 선다). 날마다(또는 '몬스터 수' 를 바꾸면) 다시 뽑고, 같은 섬 같은 날은 같은 명단이다 · 첫날은 예산 0 이라 없다 · 몹마다 제 터에 집 자리(상륙 자리 200 m 안은 빼고) · 명단 칸이 사람 300 m(애쉬스케일 420 m) 안에 들면 돌려 쓰는 몸에 입혀 세우고(눈앞 70 m 안엔 불쑥 안 선다) 340 m(애쉬스케일 460 m) 넘게 멀어지면 자리 · 체력을 명단에 적고 거둔다 · 죽인 것은 그날 다시 안 나온다 · **저장하지 않는다**(불러오면 다시 뽑는다). 다지류는 파워 20(예전 '유황 도롱뇽' 자리 — 사용자 결정) · 명단에 든 수만큼 빈 굴 하나씩을 둥지로 받는다(굴 650 m 안이면 깨우고 800 m 밖이면 거둔다). 섬을 다 지은 뒤 `mobsBuild` 가 몸을 한 번 빚고(섬이 바뀌면 거두기만),
  `updateMobs` 가 놀이 중 프레임마다 돈다(99-main.js · 사람 시점 다음).
  ① **다지류**(체력 1500 · 크기 `CRW.SIZE` 1.0 — 아레나의 1/1.5 · 머리에서 꼬리 끝까지 약 41 m) — 둥지는 섬을 지을 때 `mobsSites` 가 고른 굴(우거진 숲 — 활엽수림·대숲 — 칸이 220 m 안에 여섯 넘게 · 굴끼리 700 m 떼어 · 여덟까지 ·
  상륙 자리 450 m 안은 비움). **그 굴은 불빛도 빛나는 점·버섯도 없다**(`c.dark` — 32-caves.js 는 굴을 다 빚은 뒤 버린다 · 난수 차례 그대로). 다지류가 사는 굴은 그날 명단이 정한다(`l.entry` · 몸 2).
  낮(05:00~19:36 밖이 밤)에는 가장 안쪽 방에 똬리를 틀고 잔다(`crawlCoil` — 머리가 가운데, 길이 바깥으로 감긴다 · 맞으면 깬다). 밤엔 둥지 둘레 우거진 숲을 휘젓는다
  (`crawlWaypoint`) · 50 m 안에 사람이 들면 쫓고(120 m 밖이면 놓음) · 새벽이면 둥지로 돌아간다(돌아갈 때는 돌진 없음) — **이 둥지 행동만 본편 것이고 나머지는 아레나와 같다**
  (사용자 요청 2026-10-20 · `CRWP` = 아레나 `P`): 달리기×1.0 · 선회 55°/초 · 돌진 평균 20초마다 50 m · 마디 구 68개 전부가 맞는 공 · 닿으면(사람이 마디 구 위 1.5 m 밑이면) 밀어내고 0.5초마다 40(갑옷이 깎는다).
  보폭 · 마디 구 반지름은 크기에 맞춰 아레나 값 × 1/1.5(`crwK` — 1.2 m · 0.73 m). 떨림 · 맞을 때 넉백 · 사람 튕김은 뺐다. 소리는 남겼다. **둥지 420 m 안의 우거진 숲은 캐고 따는 몫이 +0.6**(`mobLairBonus` → `yieldK`).
  ② **가고일**(체력 120) — 풀밭(`B.MEADOW`)·탁상지(`LANDFORMS` mesa)에 산다(명단 · 65% 는 앞 가고일 20 m 안에 떼로 · 몸 6). 배회 → 30 m 안이면 쫓기 → 10 m 에서 1초 노려봄 → 20 m 돌진
  (2.3 m 안이면 28) → 3.5초 굳음 — **아레나 `updateG` 와 같다**(사용자 요청 2026-10-20 · `GP2` = 아레나 `P` · 추격 포기 거리 ×1.35 · 굳은 동안은 아무것도 안 하고 해머 기절은 더해진다 ·
  고개는 늘 사람 · 떨림 · 넉백 · 사람 튕김은 뺐다). 본편에만 있는 것: 돌진 명중에 높이 차 2.2 m 안(사용자가 정함) · 물 · 바위에 막히면 돌진을 끊는다(아레나의 벽 대신) · 소리.
  ③ **스킨워커 — 아레나(`beta/mimic_arena.html` · `battle_arena.html`)와 같다**(사용자 요청 '본편에 있는 거를 아레나랑 똑같게 · 전용 요소도 없애 · 울부짖는 소리만 남겨' · 2026-10-20).
  키 5.0 m(`MIM_H`) · 본체 체력 800 · 시야 70 m · 150°(앞쪽에 들어야 알아챈다) · 배회 1.5 → 다가옴 4.2 m/s(4.2 m 에 서고 1.8 m 안이면 느리게 물러남) · 걸을 때 몸 출렁임.
  **본체는 때리지 않는다 — 손 둘**(`m.hands` · `mimHand`): 잡기 70%(2초 치켜듦 → 0.35초 뻗음 → 6초 붙잡음 · 아프지 않다) · 채찍 30%(0.75초 옆으로 뻗음 → 0.34초 부채꼴 휩쓸기 38 · 뛰어 있으면 빠진다) ·
  두 손이 1초 안에 잇달아 덤비지 않는다 · **두 손에 잡히면 3초 뒤 삼킨다** · 손마다 체력 85(맞는 공이 어깨부터 손가락 끝까지 마디마다 — `mimProxy`) · 잘리면 늘어지고 4초 뒤 본체 체력 60 을 깎아 되살아남 ·
  6번 잘릴 때마다 본체 5초 굳음 · 본체 체력 80% 밑 · 35 m 안이면 **새끼 거미 다섯**을 뱉고(본체 −250 · 25초마다 · 손까지 5초 굳음) · 체력 100 밑이면 제 살 깎는 짓을 멈춘다.
  새끼 거미(`MON.spd` 열다섯 돌려 씀 · 모델 `data-mob-spiderling.js` = battle 의 `GLB_MS`) — 체력 100 · 달리기×0.56 로 쫓아 1.3 m 에서 1.2초마다 14.
  자세(`mimPose`)는 아레나 `poseMimic` 그대로 — 앞다리가 6배까지 늘어나고 어깨를 먼저 돌린 뒤 CCD. **빛 피하기 · 떨림 · 맞을 때 젖힘 · 넉백은 아레나에 없어 뺐다.**
  섬에 맞춘 것은 사는 데(우거진 숲 · 명단 · 몸 3) · 배회(제 자리 둘레) · 쓰러짐과 사체 · 울부짖는 소리(알아챌 때 · 손을 쓸 때 · 배회 중 가끔)뿐.
  **아레나를 고치면 여기도 같이 고칠 것** — 값은 `MIM_P`/`MIM_SPD` 표에 아레나 `MP`/`SPD` 그대로 옮겨 두었다.
  ④ (떨림 `mobJerk` 는 세 몬스터 모두 아레나에 맞추며 없앴다 — 2026-10-20.)
  ⑤ **맞는 공**(`mobProxy`) — 본편 무기 판정(`CREATURES` · `attack`/`meleeResolve` · `rayCreature` · `explode` · `burnTick`)에 거는 대역. x·y·z·hp 가 접근자라 체력은 몸의 것이다.
  다지류는 마디 구 전부(68개) · 스킨워커는 몸통과 두 앞다리 마디마다. **한 프레임에 같은 몸의 공이 여럿 맞으면 가장 큰 것 하나만 든다**(`MON.frame` — 수류탄 하나에 마디 열이 다 맞았다).
  해머 기절은 `frz` 에 더한다(아레나처럼). 쓰러지면 사체가 남아 뒤질 수 있다(무엇을 들었든 — 총만 빼고 · `MOB_LOOT` — 다지류 키틴 8 · 거미줄 2 / 가고일·스킨워커는 80-player.js `MOBS[].drop` 과 같다) · 90초 뒤 거둔다.
  **설 자리 고르기(`mobSpawner` 의 `spot`)는 물 위를 버린다** — 조건이 `heightAt<0.5||ok` 로 거꾸로라 스킨워커 41% · 가고일 17% 가 물속에 섰고, 스킨워커는 걸음 조건(다음 자리 0.3 m 위) 때문에 영영 못 움직였다(2026-10-19 고침).
  지금은 물에 들어가 있으면 어디로든 걸어 나오고, 넉백은 물로 밀지 않는다(`mimTick`).
  ⑥ **몸끼리 안 겹친다**(`mobSeparate` — 가고일 0.8 · 스킨워커 2.0 m · 다지류 마디에서도 밀려난다 · 사람은 스킨워커가 밀고, 가고일은 사람에게서 비켜난다 —
  사람을 밀었더니 돌진하는 몸에 실려 11 m 끌려갔다).
  ⑦ **소리는 합성**(`mobVoice(kind,x,y,z,vol)` — 거리 (1+d/14)^−1.4 · 좌우 · 150 m 밖은 없음): 다지류 다리 딸깍임 · 쇳소리 비명(톱니파 둘이 엇갈려 떨며 치솟음) / 가고일 꺾이는 울음 /
  스킨워커 사람 목소리를 비튼 울부짖음(모음 꼴이 미끄러지고 고리 변조) / 맞는 소리.
  ⑧ **셰이더 미리 짜기가 뼈 몸도 짠다** — `precompPlan` 이 예전엔 `SkinnedMesh` 를 건너뛰었다. 대역도 같은 뼈로 묶어야(`precompProxy` — `bind(skeleton)`) 뼈 수가 열쇠에 든다.
  ⑨ **아르크토스**(사용자 요청 '북극곰과 드래곤도 본편에' · 2026-10-20 · `bearTick` — 97-mobs.js) — 침엽수림 · 덤불 · 바위 비탈(`B.CONIFER`·`SCRUB`·`ROCK`·`SCREE`)에 낮밤 없이 산다(명단 · 몸 4) ·
  **아레나 `updateB` 와 같다**(`BEAR_P` = 아레나 `P` · `BEAR_Q` = `Q`): 배회 1.5 m/s → 34 m 안이면(또는 맞으면) 네 발로 쫓는다(달리기×1.3 = 9.6 m/s — 달려서는 못 벗어난다 · 45.9 m 밖이면 놓음) →
  4.5 m 에서 일어서 내려찍기(1초 · 0.68 에 앞 120° · 사거리×1.05 안 40 · 찍는 동안 초당 6 rad 까지 사람 쪽으로 돈다) → 1.05초 굳음(해머 기절은 더해진다) · 몸통 반지름(`BEAR_BODY_R` 1.64 m)에서 사람 앞에 멈춘다.
  체력 400 · 맞는 공은 뼈 캡슐(`bearHitCaps`)의 몸통 · 목 · 머리 · 위팔 · 아래팔 · 넓적다리 가운데 열하나(`BEAR_PROX` — 반지름은 캡슐 굵기 + 길이의 0.35) ·
  사체 뼈 8 · 가죽 3 · 아르크토스 고기 5(80-player.js `MOBS` 와 같다). 재질은 정점색 램버트(아레나의 따로 짠 셰이더 대신 — 본편 빛 · 그림자 · 안개를 받는다 · 맞으면 붉게 뜬다).
  ⑩ **애쉬스케일**(같은 요청 · 97-wyvern.js) — 탁 트인 데(풀밭 · 덤불 · 바위 · 바닷가 · 지열 지대)에 산다(명단 · 몸 둘 `WYVS` — `wyvMake(S)` 가 개체를 만들고 모델 · 그림은 `wyvShared` 하나를 나눠 쓴다 · 뼈만 개체마다 복제). 사람이 420 m 안에 들면 제 자리 상공 20 m 에 나타나
  **제 자리 둘레를 돈다**(아레나는 판 안 아무 데나) — 그 밖은 아레나 `updateW` 그대로: 60 m 안에 보이면(또는 맞으면) 5초 노려봄 → 내리꽂기(곁 4.9 m 면 30) → 3초 굳음 → 걸어서 쫓으며
  화염구(46 · 8초마다 · 2.6초 젖혀 겨눈 자리로) · 할퀴기(34) · 물기(54) — 뼈를 돌려 닿는 각을 푼다 · 60 m 밖이면 다시 날아오른다(`wClimb`) · 깊은 물(−1.2 m)에선 걷지 않고 난다.
  체력 700 · 불에 안 탄다(`fireproof`) · 죽으면 5초 부풀다 터진다(17.5 m 안 255 × (1−d/R) — 갑옷이 깎는다) · 잔해 화약 1 · 잿불 비늘 12. 460 m 넘게 멀어지면 거둔다.
  **다른 것**: 지어 놓은 집은 노리지 않는다(아레나는 26 m 안 오두막을 먼저 친다 — 본편 건축물은 아직 표적이 아니다) · 화염구에 광원을 달지 않는다(움직이는 광원은 셰이더를 다시 짜게 한다 — 발광 재질로만) ·
  터지는 불빛은 불빛 풀 대역(`LIGHT.addFire` 셋을 돌려 씀) · 숨겨 둔 화염구 하나를 장면에 두어 셰이더 미리 짜기가 본다 · 소리 `mobVoice` 의 'wyv'·'flap'·'fire'·'boom'.
  잰 값(헤드리스 · 사람 앞 40 m 에 세움): 노려봄 5초 → 내리꽂기 → 굳음 → 화염구 → 할퀴기 · 물기 · 화염구가 번갈아(30초에 7대) · 몸짓 한 프레임 0.4~0.6 ms · 7 m 에서 터짐 158.
  **본편에 몹을 더 들일 때**: 몸은 `scene` 에 숨겨 두고(`visible=false`) 돌려 쓴다 · `lightRole:'recv'`(그림자 안 드리움) · 전역 이름이 시험장 것과 겹치는지 아래 '확인하는 법'의 이어 붙이기 검사로 볼 것.
- **근접 휘두르기**(사용자 요청 '무기 모션을 더 역동적이고 다양하게 · 넉백 · 맞는 몸짓 · 무기에 맞는 범위가 없다' · 74-icons-guns.js) —
  ① 결은 **표**다(`WKEY[결][변형]` = [진행, rx, ry, rz, px, py, pz, 고르기] — 들어 올림 · 가속하는 내려치기(`wIn`) · 지나치는 따라가기 · 되돌아오며 살짝 넘침(`wBack`)).
  베기 셋(왼 위→오른 아래 · 되받아 올려 베기 · 가로 쓸기) · 내리치기 둘(곧게 · 오른 어깨에서 비스듬히) · 찌르기 둘(곧게 · 낮게 비틀어 올려). **쿨이 끝나고 0.7초 안에 또 휘두르면 다음 변형**(`ATK.combo`/`ATK.v`).
  캐는 도구(도끼·곡괭이)는 내리치기 두 변형을 번갈아 쓴다. 축: rx 를 더하면 날이 들리고 빼면 숙는다(예전 내리치기는 거꾸로라 맞는 순간 날이 들렸다) · rz + 왼쪽 · − 오른쪽.
  휘두르는 시간은 `min(0.42, 쿨×0.8)`.
  ② **맞는 것은 날이 닿는 순간에 센다**(`ATK.pend` → `meleeResolve` — 진행 `WHIT` 베기 0.46 · 내리치기 0.52 · 찌르기 0.44). 예전엔 누르는 순간이었다.
  ③ **판정이 넓어졌다** — 사거리 +0.6 m · 몸 가장자리에서 54°(가까울수록 넓다 — `acos(cos) − atan(r/d)`) · 위아래 3.2 m(예전 정면 40° · 2.2 m).
  ④ 맞으면 **히트스톱** 0.07초(날이 박혀 떤다) · **시점이 날을 따라 끌려간다**(`ATK.kick` — 결마다 `WKICK` · 맞으면 1.8배 · 97-mobs.js `mobCamera` 가 얹는다) · 소리 `swish`/`flesh`(80-player.js `SFX`).
  ⑤ **사람이 맞으면** 화면이 흔들리고 기운다(`hurtPL` 이 피해 4 넘으면 `MON.shake`/`MON.roll`) · 든 것도 흔들린다.
## 함정

- **`flatShading: true`는 `MeshLambertMaterial`에서 무시된다.** r128에서 확인해 14곳을 걷어냈다.
  각진 면이 필요하면 정점을 분리해야지 이 플래그로는 안 된다.
- **레포 기록이 이미 ~390MB다**(`.git` — 시험장 html 들 · 사용자가 올린 Meshy zip 85MB · 모델 GLB). Git LFS를 쓰지 않는다. 한 번 올린 파일은 지워도 기록에 남는다.
  모델을 더 커밋하기 전에 LFS 전환을 먼저 결정할 것 — 나중에 옮기려면 히스토리를 다시 써야 한다.
- `.gitattributes`가 `* text=auto eol=lf`이므로 `*.glb binary`를 반드시 유지할 것.
