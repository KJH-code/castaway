# CASTAWAY

리썰 컴퍼니 + 아크 서바이벌에서 영감을 받은 **무인도 생존 게임**.
Three.js r128 · 빌드 과정 없음.

```
island_world.html 을 브라우저로 열면 끝입니다.
```

본편은 `island_world.html`(껍데기) + `engine/css/game.css` + `engine/js/*.js`(29개, 불러오는 차례대로 번호)로 나뉘어 있습니다.
**`engine/` 와 `presets/` 폴더를 `island_world.html` 곁에 같이 두세요.** 어느 파일에 무엇이 있는지는 [CODEMAP.md](CODEMAP.md).
한 파일로 묶으려면 `python3 tools/build_single.py` → `island_world_single.html`.

**브라우저 없이 제 창으로 하려면 데스크톱 판**을 받으세요 —
[Actions → 데스크톱 판](https://github.com/KJH-code/castaway/actions/workflows/desktop.yml) 의 가장 최근 실행에서
`CASTAWAY-windows`(설치판 `…-setup.exe` · 설치 없이 `…-portable.exe`) · `CASTAWAY-mac`(`.dmg`) · `CASTAWAY-linux`(`.AppImage`).
게임이 바뀔 때마다 새로 묶입니다. 전체 화면으로 뜨고(F11 · Alt+Enter 로 창 ↔ 전체 화면), 저장은 파일입니다
(Windows `%APPDATA%\CASTAWAY\saves` — 슬롯 셋 + 자동 저장 · 놀이 5분마다와 창을 닫을 때 자동 저장).
설정(그래픽·음량·마우스 감도)은 다음에 켤 때도 그대로이고, 새 판이 나오면 시작 화면에 알림이 뜹니다. 서명하지 않은 실행 파일이라 처음 켤 때
Windows 는 "PC 보호" 창에서 **추가 정보 → 실행**, macOS 는 **우클릭 → 열기**를 한 번 눌러야 합니다.

지형은 시드 하나에서 결정론적으로 생성됩니다 — 같은 시드는 언제나 같은 섬이 됩니다.
768 × 768 셀을 셀 한 변 2.5 m(1,920 m)로 만든 뒤 통째로 키웁니다 — 새 섬은 2배(**3,840 m** = 14.7 km²)이고 설정의 '섬 넓이'로 1.9 · 3.8 · 5.8 km 를 고릅니다.

**맥용 베타 빌드**는 `sh beta/build-mac.sh` — `beta/builds/` 에 `CASTAWAY.app` 과 `.dmg` 가 생깁니다([beta/README.md](beta/README.md)).

---

## 폴더

| 폴더 | 무엇 |
|---|---|
| `island_world.html` | 게임을 여는 파일(뼈대) — 이것만 맨 위에 둔다 |
| `engine/` | **게임 엔진** — `three.min.js`(Three.js r128) · `css/game.css` · `js/*.js`(본편 코드 29개) · `native/`(C 로 짠 계산 토막과 그 빌드 결과) |
| `presets/` | **프리셋** — 코드가 아닌 값·자료 묶음: `presets.js`(그래픽·섬 프리셋 — 설정 창이 고른다) · `models/`(몹 모델 .glb) · `random_textures/`(텍스처 모델이 낸 그림이 들어갈 자리) |
| `beta/` | **베타 시험장** — `*_arena.html`(전투·구름·농성 시험장) · `build_sandbox.html` · `_v.html`. 본편과 따로 뜨는 한 파일짜리들이다 |
| `env/` | **가상 환경** — 빌드에만 쓰는 도구(C 컴파일러 · 파이썬 가상 환경)를 받는 스크립트. 받아 온 것 자체는 레포에 안 담는다(`env/README.md`) |
| `desktop/` | 데스크톱 판(Electron 껍데기) |
| `tools/` | 검사·묶기 도구(`check-syntax` · `smoke` · `probe` · `build_single.py` · `serve.py`) · `tools/ai/`(텍스처 모델 학습) |
| `docs/` | 설계 문서 · 개발 대화 원문 · 그래픽 엔진 조사 |

## 파일

| 파일 | 내용 |
|------|------|
| **beta/wyvern_arena.html** | 잿불 와이번 시험장 |
| **beta/trio_arena.html** | 셋 시험장 — 모방 거미 1 · 북극곰 1 · 가고일 2 |
| **island_world.html** + `engine/css/` · `engine/js/` | 메인 게임(나뉜 판 — [CODEMAP.md](CODEMAP.md)) |
| **beta/build_sandbox.html** | 건축장 — 평평한 터에서 재료·무게 제한 없이 집만 지어 본다 |
| **beta/mixed_arena.html** | 섞인 시험장 — 북극곰 1 · 가고일 3 · 입장 전 장비와 짐을 정한다 |
| **beta/gargoyle_arena.html** | 곤충형 가고일 전투 시험장 — 무기 5종 · 모델 내장 5 MB |
| **beta/bear_arena.html** | 북극곰 전투 시험장 — 내려찍기(볼리베어 Q) · 뼈대 자동 생성 · 무기 5종 · 1.6 MB |
| **docs/CASTAWAY_개발요약.md** | 설계 전반 — 지형 · 제작 트리 · 설비 · 몹 · 저장 |
| **docs/CASTAWAY_전사_초반부.md** | 초반 개발 대화 원문 |
| **docs/CASTAWAY_전사_2차.md** | 2차 작업 기록 — 돌창 · 설비 용기화 · 파워레벨 |
| presets/models/bear_high.glb | 북극곰 고해상 LOD (39,998 삼각형 · 정점색) |
| presets/models/stormscale_wyrm.glb | 번개비늘 와이엄, power 60 (62,706 삼각형 · PBR 텍스처) |
| presets/models/stone_colossus.glb | 용암 골렘, power 100 (250,012 삼각형 · PBR 텍스처) |

`.glb` 셋은 **본 게임(`island_world.html`)이 아직 읽지 않습니다** — 몹 배치를 붙일 때
쓰려고 미리 넣어둔 것입니다. 아레나 셋은 GLB 를 파일 안에 base64 로 박아 두고 직접 읽습니다.

---

## 무엇을 하는 게임인가

풀과 돌에서 시작해 화약까지 갑니다. 여덟 단계입니다.

**풀과 돌 → 불 → 옷 → 나무와 점토 → 간석기 → 금속 → 철기 → 화학**

활비비로 불을 켜는 데서 시작해 **볼트 소총**으로 끝납니다.

중간을 건너뛸 수 없습니다. 화강암은 철 곡괭이가 아니면 불로 달궈 균열을 내야 하고,
철은 녹지 않아 괴련철로만 나오며, 화약에 쓸 질산은 하천에 물레방아를 놓아
발전기를 돌리고 아크로에 공기를 태워야 나옵니다.

---

## 조작

| 키 | 기능 |
|----|------|
| WASD + Shift | 이동 / 달리기 |
| Space / Ctrl | 점프 / 앉기 |
| E | 상자 · 화덕 · 제련로 열기 (짧게) · 채집 · 채굴 · 벌목 · 점화 (길게) |
| 좌클릭 | 공격 · 사격 |
| X | 재장전 (소총) |
| 1 ~ 5 | 빠른 칸 — 손에 든 것과 맞바꾼다 |
| Z | 집 짓기 — 토대 · 벽 · 문틀/문짝 · 창틀/창짝 · 지붕 · 경사 지붕 · 삼각 벽 |
| I / B | 가방(소지품 + 제작) / 사전 |
| Q / G | 착용 · 장착 / 버리기 |
| F / V / T / R | 손전등 / 자유 카메라 / 시간 배속 / 새 섬 |
| Tab / F3 / F5 / F9 | 설정 / 진단 / 저장 / 불러오기 |

저장은 시드와 변경분(diff)만 담아 약 8.8 KB입니다.

---

## 지금 만드는 중

- 뽑힌 몹을 실제로 섬에 배치하기 — **아직 섬에 나오는 몹은 없습니다.**
  파워레벨 추첨(`rollSpawns()`)은 다 쓰여 있지만 부르는 곳이 없습니다.
  전투는 아레나 셋(`bear_arena` · `gargoyle_arena` · `mixed_arena`)에서 검증했습니다 —
  몹 11종 중 모델이 있는 것은 넷이고, 나머지는 GLB 를 기다리는 중입니다
- 허기 · 수분 · 체온
- 은신처 · 수면 · 탈출 목표

자세한 내용은 [docs/CASTAWAY_개발요약.md](docs/CASTAWAY_개발요약.md) 에 있습니다.

## 검사 (CI)

푸시할 때마다 깃허브 액션이 두 가지를 돌린다.

| 검사 | 하는 일 | 걸리는 시간 |
|------|---------|-------------|
| **문법 검사** | 각 HTML 의 인라인 스크립트를 뽑아 `node --check` | 몇 초 |
| **구동 검사** | 헤드리스 크로뮴에 띄워 오류 없이 뜨는지 확인 | 파일당 4~21초 |

손으로 돌리려면:

```
npm i -D playwright && npx playwright install chromium
node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js
node tools/smoke.mjs                 # 특정 파일만: node tools/smoke.mjs island_world.html
node tools/probe.mjs island_world.html PL.hp RECIPES.length
```

three.js 는 레포 안의 `engine/three.min.js`(r128)를 쓴다. 게임도 검사도 바깥으로 나가지
않으므로 네트워크 없이 돈다.
