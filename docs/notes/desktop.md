# 데스크톱 판 · 저장 · 설정 · 베타 빌드

2026-10-29 에 CLAUDE.md 에서 **글자 그대로 옮겨 왔다**(사용자 요청 — CLAUDE.md 가 요청마다 통째로 읽혀 265 KB 였다). 다루는 것: Electron 껍데기(`desktop/`) · 저장 칸 · 자동 저장 · 설정 기억 · 멈춤 중 아끼기 · 베타 빌드.
이 계통을 고치기 전에 고칠 이름을 이 파일에서 `grep` 해 그 대목을 읽고, 고친 것(무엇을 왜 · 잰 값 · 같이 고칠 짝 · 사용자 요청이면 그렇다고)은 **여기에** 적는다.
CLAUDE.md 에는 새로 생긴 '깨뜨리면 안 되는 것' · '같이 고칠 짝'만 한 줄로 더한다. 글 속 '아래 …' · '위 …' 는 옛 CLAUDE.md 의 자리를 가리킨다 — 이 파일이나 다른 노트에서 찾을 것.

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

## 베타 빌드

- **베타 빌드** — 모든 판 · 모든 OS 의 설치 파일을 `beta/builds/` 한 폴더에 둔다(`CASTAWAY-<판>-mac.dmg` · `-setup.exe` · `-portable.exe` · `-linux.AppImage` · 레포에 안 담는다 · 파일마다 100~230 MB · 2026-10-19 사용자 요청으로 판마다 나뉜 폴더를 모았다). `sh beta/build-mac.sh` 가 `.dmg` 를, `sh beta/fetch-ci.sh [실행 번호]` 가 CI('데스크톱 판')의 세 판을 거기 받는다. `beta/builds/README.txt` 에 판마다 무엇이 어디서 왔는지 적어 둔다.
  npm 캐시는 `env/.cache/npm`(홈의 캐시 권한이 꼬인 기계가 있다).
