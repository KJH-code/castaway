# 인수인계 — CASTAWAY (2026-10-15)

새로 이 레포를 맡는 Claude 에게. 이 문서는 **요약과 길잡이**다. 자세한 규칙과 잰 값은 전부 `CLAUDE.md` 에 있고, 문서와 코드가 다르면 **코드가 맞다**.
기준 커밋: 이 문서를 넣은 main(그 앞 `0c21d74` — PR #43 합침).

---

## 1. 먼저 읽을 것 · 읽지 말 것

| 차례 | 파일 | 왜 |
|---|---|---|
| 1 | `CLAUDE.md` | **215 KB — 세션마다 저절로 읽힌다.** 통째로 외우려 하지 말고 '스택' · '파일 지도' · '규칙' · '확인하는 법' · '작업 흐름' · '어느 쪽이 정본인가' · '함정' 머리만 먼저 볼 것. 나머지는 고칠 계통을 만질 때 그 대목을 찾아 읽는다(`grep -n` 으로) |
| 2 | `CODEMAP.md` | 나뉜 본편(`engine/js/*.js`)의 파일별 설명(영어) |
| 3 | `docs/CASTAWAY_개발요약.md` | 설계 문서 — 지형 · 제작 트리 · 설비 · 몹 · 저장 |
| 4 | `tools/azure/README.md` | 지금 만들던 새 몹 모델(아래 5장) |

**읽지 말 것** — `engine/js/data-*.js` 넷(base64 한 줄 · 1~2 MB씩) · `docs/CASTAWAY_전사_*.md`(개발 대화 원문 13만 자 — 결론은 이미 코드와 요약에 있다).
큰 파일(`45-sky.js` 2,342줄 · `30-props.js` 1,618줄 · 시험장 html 4~27 MB)은 통째로 읽지 말고 `grep -n` 으로 줄을 집어 `sed -n '시작,끝p'` 로 뜬다.

## 2. 프로젝트 한눈에

- 무인도 생존 게임. **Three.js r128 · 번들러도 빌드도 없다** — `island_world.html` 을 열면 뜬다(오프라인 — `engine/three.min.js` 를 레포에 둔다).
- 본편 = `island_world.html`(289줄 뼈대) + `presets/presets.js` + `engine/css/game.css` + `engine/js/*.js` **46개**(코드 42 + base64 자료 4).
  ES 모듈이 아니라 **번호 차례로 불러오는 보통 스크립트**(전역 하나를 나눠 쓴다). 새 계통은 `99-main.js` 바로 위에 새 파일로.
  아이템 365 · 레시피 278(제작법 240 + 설비 공정 38) · 손에 드는 것 57.
- `beta/` — 몹 시험장(본편과 따로 뜨는 한 파일짜리 · 모델 내장이라 4~27 MB). **몹은 아직 본편에 없다**(`CREATURES` 가 비어 있다) — 몹 거동은 시험장이 정본.
- `desktop/` — Electron 44 껍데기(판 0.4.1). GitHub Actions `데스크톱 판` 이 푸시마다 Windows·macOS·Linux 로 묶는다. 게임 본체는 베끼지 않는다.
- `tools/` — 검사(`check-syntax` · `smoke` · `probe`) · 시험장 동기화(`garg-rig.mjs` · `wyv-sync.mjs` · `mk-cloud-arena.mjs`) · 성능 재기 · 모델 도구(`azure/`).
- 라이선스 GPL-3.0 · 레포 `KJH-code/castaway`.

## 3. 사용자와 정한 작업 규칙

- **답은 한국어로.** CLAUDE.md · 커밋 메시지 · 코드 주석도 지금 쓰인 말투(쉬운 우리말 · '~다' 체)를 따른다. 사용자는 참고 그림을 자주 보내고, 바라는 모습을 그림으로 말한다.
- **작업을 마치면 늘 main 에 합친다**(사용자: "앞으로 메인과는 항상 합쳐"):
  브랜치에 커밋 · 푸시 → PR → 곧바로 merge 커밋으로 합침 → 다음 작업은 `git fetch origin main && git checkout -B <브랜치> origin/main` 로 다시 세워 시작.
  **합치기 전에 `check-syntax` 와 `smoke` 를 통과시킨다.**
- **여러 세션이 동시에 main 에 합친다** — 최근만 해도 `claude/new-session-4awkqp` · `claude/underworld-falls` · `claude/coast-geo-falls-reef` · `claude/basalt-obsidian-isles` 가 따로 돌았다.
  합치기 직전에 main 을 다시 받아 볼 것. 겹치는 곳은 대개 `CLAUDE.md`(모두가 문서를 고친다).
- **고친 것은 CLAUDE.md 에 적는다** — 무엇을 왜 · 잰 값 · 다른 데를 같이 고쳐야 하는 짝. 사용자 요청이면 '(사용자 요청)' 을 붙여 왔다.
- **재고 말한다** — '빨라졌다' · '고쳤다' 대신 숫자(삼각형 · ms · 화소 차이). 화면을 바꾸면 전후 사진을 같은 페이지 안에서 찍어 견준다.
- 커밋 메시지에 모델 이름 · 모델 ID 를 넣지 않는다. 사용자 이메일을 어디에도 보내지 않는다.

### 깨뜨리면 안 되는 것(자세한 까닭은 CLAUDE.md '규칙')

- **같은 시드 = 같은 섬.** 지형 · 자원 배치에서 `Math.random()` 금지(시드 난수 `mulberry32(seed^상수)`). 저장이 '시드 + 변경분'(8.8 KB)이라 깨지면 옛 저장이 다른 섬을 연다.
  시드가 만드는 것을 바꾸면 **지형 판 `P.tv` 를 올린다**(지금 7 · 판이 없는 옛 저장은 1 로 읽혀 그대로).
- **`RESOURCES` 는 맨 끝에만 붙인다**(난수 차례).
- **프레임률에 기대는 로직 금지** — 물리량(거리 · 속도 · 초)으로.
- **C 침식(`engine/native/erosion.c`)과 JS 판은 비트까지 같아야 한다** — 한쪽을 고치면 `nativeVerify()` 가 전부 same.
- **손에 드는 아이템(`tool`)은 `WEAPON_FX` 에 생김새가 있어야 한다** — 없으면 조용히 맨손이다(오늘 셋이 빠져 있었다 — 4장).
- **복사본** — 같은 표가 여러 파일에 있다(CLAUDE.md '어느 쪽이 정본인가'). 가고일 몸짓은 `beta/gargoyle_arena.html` 을 고치고 `node tools/garg-rig.mjs`,
  애쉬스케일 자세는 `beta/wyvern_arena.html` 을 고치고 `node tools/wyv-sync.mjs`, 본편 하늘을 고쳤으면 `node tools/mk-cloud-arena.mjs`.
- 성능: 프레임은 **삼각형 수**가 정한다(F3 성능 창). `propGroup` 자식은 수만 — 프레임마다 다 훑는 코드 금지. 화면 위에 `mix-blend-mode`/움직이는 전체 화면 DOM 금지.

## 4. 오늘 점검 결과(2026-10-15)

| 점검 | 결과 |
|---|---|
| `node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js` | **통과**(html 전부 + js 47) |
| `node tools/smoke.mjs` | **통과** — 12 페이지 1분 40초(본편 30초 · 시험장 4~9초) + 따로 `beta/mimic_arena.html` 5초 |
| `nativeVerify()`(C ↔ JS 침식) | **세 시드 모두 same** |
| 손에 드는 것 ↔ `WEAPON_FX` | **57 ↔ 54 → 고침**: `shark_knife`(상어 이빨 칼 · 96-reef.js) · `cement`(시멘트) · `canoe`(통나무배)가 들면 맨손이었다. `70-weapons.js` 끝에 톱날 칼 · 개어 둔 토기 통 · 노를 더했다(아이콘도 이것으로 찍힌다 — 통나무배 아이콘은 이제 노) |
| `presets/models/azure_apocalypse.glb` | r128 GLTFLoader 로 읽힘 · 세모 197,205 · 정점 153,441 · 뼈 23 · 키 2.98 m · 바탕·발광 그림 · GL 오류 0 · `tools/azure/run.sh` 로 다시 만든 것과 **해시까지 같다** |
| GitHub | 열린 PR 없음 · main CI(`CI` · `데스크톱 판`) 초록 |
| CLAUDE.md 숫자 | 아이템 222 · 레시피 181 · js 31/29 · 40=40 · RECIPES 223 · 250줄 → 실제 값으로 고침 |

### 손대지 않고 남긴 것 — 사용자에게 먼저 물을 것

- **`claude/basalt-obsidian-isles`** — main 에 안 합친 커밋 1(오늘 · '바위섬을 현무암 · 흑요석 섬으로' · `34-coast.js` 등 3 파일) · PR 없음 · 묶기 CI 는 초록. 다른 세션이 하던 일일 수 있다.
- **`claude/bold-wright-guehrl`** — 9월 커밋 2(CLAUDE.md 정리 · 가고일 시험장 무기 안내). 시험장이 `beta/` 로 옮기기 전 구조라 그대로는 못 합친다. 버릴지 물을 것(지우지는 말 것).
- 나머지 원격 브랜치 13개는 main 에 다 들어가 있다.

### 알려진 약점

- `beta/build_sandbox.html` 이 `ITEMS` 를 통째로 복사해 갖고 있어 본편과 많이 어긋나 있다.
- 헤드리스(스위프트셰이더)는 실시간의 1/20 쯤으로 돈다 · 본편 사진(`--shot`)은 자주 시간 초과 — `--run` 안에서 `renderer.domElement.toDataURL()`.
  캠코더 화면(`CAMC`)이 알갱이 잡음을 뿌리므로 화소를 견줄 때는 `CAMC.lines=0`.
- **레포 기록이 ~390 MB**(LFS 안 씀 · 사용자가 올린 Meshy zip 85 MB 포함). 모델을 더 커밋하기 전에 LFS 를 정할 것.
- 쓰러지는 노거수 장면은 헤드리스로 눈으로 확인하지 못했다.

## 5. 진행 중인 일 — 새 몹 '애저 아포칼립스'

사용자 요청(원문): "에너지 빔 쏘거나 팔 휘두르는 식으로 공격을 할 거야. 일단 받침을 없애고, 채색을 조금 더 이런 스타일로 바꿔줘. 그리고 삼각형을 20만 까지 줄이고, 리깅을 하고, 움직이는 거는 떠서 움직이는 느낌으로 할 거라(나는 것은 아님) 다리 리깅은 안해도 될 듯"
→ 그 뒤 "고리는 이렇게 만들어줘"(머리 위 고리를 참고 그림대로).

**모델은 다 됐다**(PR #42 · #43). **게임 · 시험장 어디에서도 아직 안 읽는다** — 다음 할 일이 그것이다.

- 파일: `presets/models/azure_apocalypse.glb`(11.3 MB). 원본 `presets/models/Meshy_AI_Azure_Apocalypse_1015011851_texture_fbx.zip`(FBX 140만 세모 · 뼈 없음 · 받침 붙음).
  다시 만들기: `sh tools/azure/run.sh <zip> <작업폴더> <out.glb>`(약 2.5분 · 같은 입력이면 같은 파일).
- 생김새: 검푸른 돌 갑옷 판 + 틈에서 새는 푸른 에너지 · 끝이 빛나는 갈고리 넷 · 등 뒤 쇠사슬 · 머리 위 고리(검은 돌 비늘 조각 17개 + 속의 에너지 관 + 떠 있는 부스러기).
- **+z 를 본다** · 키 2.98 m · 원점은 몸 가운데 발밑(늘어진 사슬 끝이 y 0).
- 뼈 23 — `root` · `pelvis`(허리 아래 전부 · 다리 뼈 없음) · `spine` · `chest` · `neck` · `head` · `halo`(고리 · 따로 돌릴 수 있다) ·
  팔 넷 `arm{R1,R2,L1,L2}` → `fore*` → `hand*` → `claw*`(갈고리 한 줌을 한 뼈로). **R 은 몹의 오른쪽(−x)**, 1 이 위 팔 · 2 가 아래 팔.
  쉼 자세의 뼈 회전은 전부 0 — 돌리면 곧 세계 축 기준이다. 머리 · 꼬리 자리는 GLB `extras.bones`.
- 재질: GLB 는 PBR 이지만 이 게임은 램버트 — `new THREE.MeshLambertMaterial({map, emissiveMap, emissive:0xffffff, skinning:true})`.
- 한계: 사슬은 몸통만 따른다(팔을 따라가지 않는다) · 팔을 크게 들면 어깨 · 목둘레가 늘어난다(선형 스키닝) · 손가락 따로 못 굽힘 · 다리 없음(허리 아래가 한 덩이).
  늘어남은 `tools/azure/lbs.py` 로 잰다(README).
- 고리 가운데를 지나는 막대(원본 조각)는 그대로다 — 참고 그림엔 그 자리에 빛줄기가 있다. 빛줄기로 바꿀지 사용자에게 물어본 채로 남았다.

### 다음 할 일(제안 — 사용자와 정할 것)

1. **시험장 `beta/azure_arena.html`** — 다른 몹처럼 모델을 파일에 내장(`file://` 에서 .glb 를 못 읽는다).
   **r128 GLTFLoader 는 레포에 없다** — `npm pack three@0.128.0` 의 `package/examples/js/loaders/GLTFLoader.js` 를 같이 넣거나,
   다른 시험장처럼 자료를 직접 풀어 넣는 꼴(`MODEL_META`/`MODEL_B64` — `beta/crawler_arena.html` 참고)로 옮긴다.
2. **떠서 움직이기**(날기 아님) — 땅 위 일정 높이에서 위아래로 출렁 · 가는 쪽으로 몸을 기울임 · 허리 아래(`pelvis`)가 늦게 따라오며 흔들림 · 고리(`halo`)는 천천히 돈다.
   몸짓은 가고일 · 애쉬스케일처럼 **상태마다 목표 값 + 지수 감쇠**(프레임률과 무관 · CLAUDE.md '가고일 뼈대 · 몸짓' · '애쉬스케일 자세').
3. **공격 둘** — 에너지 빔(가슴이나 머리에서 · 모으는 시간 · 빛줄기) · 팔 휘두르기(팔 넷 · 갈고리 오므리기 `claw*`). 판정은 애쉬스케일 `solveClaw` 처럼 뼈를 실제로 돌려 맞추는 길이 있다.
4. 시험장이 굳으면 battle · night 에 옮기고, 언젠가 본편에 몹을 들인다(본편은 아직 몹이 없다).

## 6. 최근 작업(합친 PR)

| PR | 무엇 |
|---|---|
| [#43](https://github.com/KJH-code/castaway/pull/43) | 애저 아포칼립스 — 머리 위 고리를 돌 조각 고리로 새로 빚음 |
| [#42](https://github.com/KJH-code/castaway/pull/42) | 애저 아포칼립스 몹 모델 — 받침 떼기 · 20만 세모 · 돌+푸른 에너지 · 뼈 23 · `tools/azure/` |
| [#41](https://github.com/KJH-code/castaway/pull/41) | 모래 · 점토 질감 — 둔덕을 땅 셰이더로 · 바람 물결 · 반짝임 · 말라 갈라진 점토 |
| [#40](https://github.com/KJH-code/castaway/pull/40) | 지형 판 7 — 저수지 폭포 · 땅속 세계와 생물(다른 세션) |
| [#39](https://github.com/KJH-code/castaway/pull/39) | 애쉬스케일 이륙 — 다시 날 때 순간이동처럼 솟던 것 |
| [#38](https://github.com/KJH-code/castaway/pull/38) | 0.4.1 — 바닷가 · 지열 · 폭포 · 바다 생물 · 지형 판 6 · 요리 · 가방(다른 세션) |
| [#37](https://github.com/KJH-code/castaway/pull/37) | 가고일 뼈대 · 몸짓 · 애쉬스케일 자세 |
| #29~#36 | 거품 · 하늘(Hillaire 다중 산란) · 덤불 거리 · 나무 그루마다 단계 · 렌즈 깨짐 · 바위 사진 · 벼랑 · 판 0.4.0 |

## 7. 환경 메모(클라우드 컨테이너에서 해 본 것)

- 검사: `node tools/check-syntax.mjs …` · `node tools/smoke.mjs`(파일 이름을 주면 그것만) · `node tools/probe.mjs island_world.html <표현식>`(`--do` · `--run 파일` — 파일은 함수 몸통이라 `return` 으로 돌려줄 것).
- 브라우저는 `/opt/pw-browsers` 의 크로미움 · playwright 는 전역(`/opt/node22/lib/node_modules/playwright`) — 레포 밖 `.mjs` 에서 쓰려면 그 절대 경로로 `import`.
- 본편 섬 생성은 헤드리스로 약 20~30초(`pages.mjs` 가 `?ws=2` 로 연다).
- 모델 도구: python3 + numpy · scipy · scikit-image · pillow · pymeshlab(줄이기 필터가 `libopengl0` 를 찾는다 — `apt-get install libopengl0`).
- cdn.jsdelivr 는 막혀 있고 npm 은 된다(`npm pack three@0.128.0`).
- C 침식을 다시 지으려면 `sh env/setup-zig.sh` → `sh engine/native/build.sh`.
- 데스크톱 판 시험은 xvfb 위 playwright `_electron.launch`(CLAUDE.md '데스크톱 판').

## 8. 사람 쪽 준비(사용자에게)

- 친구 계정이 이 레포에 **쓰기 권한(협업자)** 이 있어야 브랜치를 밀고 PR 을 합칠 수 있다 — GitHub 레포 Settings → Collaborators 에서 초대.
- 친구 쪽 Claude Code(웹)에서 레포를 연결하면 `CLAUDE.md` 가 저절로 읽히고, 거기 맨 위가 이 문서를 가리킨다.
