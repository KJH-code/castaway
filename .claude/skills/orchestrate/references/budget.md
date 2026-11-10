# 주간 한도 추정과 줄이는 법

모드 선택(`mode` 스킬)과 각 모드(절약·기본·강화·최대·극한)가 작업 전에 "이 작업이 주간 한도의 몇 %를 쓸지" 어림잡고, 넘칠 때 무엇부터 줄일지 정하는 기준이다.

## 근거 데이터

- 출처: "AI Model Capability vs. Subscription Usage Limits" (2026-11-10 기준). Claude 모델만 쓴다.
- 방법: Artificial Analysis(AA) Intelligence Index v5.0.1 과제 1개의 API 비용 ÷ 그 모델의 주간 한도 API 환산 가치. 주간 한도의 API 환산 가치는 사용량 막대가 1% 오를 때 쓴 토큰을 API 가격으로 매겨 100을 곱한 값이다.
- 공식 수치가 아니다. 제3자 측정(SemiAnalysis, Theo)과 그로부터의 추정이다. 상태 라벨을 같이 본다.

### AA 과제 1개당 주간 한도 사용률 (Pro 기준)

| 모델 | low | medium | high | xhigh | max | 상태 |
|---|---|---|---|---|---|---|
| Opus 5.5 | 0.29–0.37% | 0.72–0.93% | 1.0–1.3% | 1.8–2.3% | 3.0–3.8% | 측정 |
| Sonnet 5.5 | 0.18–0.27% | **0.28–0.41%** | 0.58–0.87% | 1.5–2.2% | 3.6–5.3% | 추정 |
| Haiku 5.5 | 0.015% | 0.035% | (데이터 없음) | 0.096% | 0.16% | 추정(약한 가정) |

- Max는 ÷5, Ultra는 ÷10 (Max = Pro의 5배, Ultra = Pro의 10배).
- Fable 5.2: 극한 모드에서만 쓴다. Pro는 한도에 포함되지 않는다(사용량 크레딧으로 따로 청구). Max 기준 주간 한도 전체 대비 high 1.3%, max 3.8% (추정, 계정 1개 측정). Ultra는 ÷2. Fable은 주간 한도의 **절반까지만** 쓸 수 있다.
- Sonnet은 medium만 쓴다(README "설계 근거"). Sonnet 값은 $200 요금제 한 번의 측정을 비율로 줄인 추정이다. 실제 Claude Code 코딩 테스트에서 Sonnet medium의 API 비용은 Opus medium의 약 4분의 1이었고, 한도로 바꾸면 약 3분의 1이라 위 표와 맞는다.
- 코딩 에이전트 과제(Claude Code + Opus max, 수십 분~1시간짜리 실제 코딩)는 과제당 3.4–4.3%(Pro)로, 위 표의 Opus max와 비슷하다. 그래서 구현 단위 하나 ≈ AA 과제 하나로 본다.

## 스크립트

```bash
node .claude/scripts/budget.js --plan pro --compare --units 3            # 모드 4개 비교 (코드)
node .claude/scripts/budget.js --plan max --preset proof --compare       # 모드 4개 비교 (증명)
node .claude/scripts/budget.js --plan pro --preset lite --units 4 --heavy 1
node .claude/scripts/budget.js --plan pro --preset standard --units 3 --lite-units 1 --hard 1
node .claude/scripts/budget.js --plan max --preset plus --units 3 --scouts 0 --design 1
node .claude/scripts/budget.js --plan max --preset fable --units 3              # 극한 (Fable)
node .claude/scripts/budget.js --plan max --preset super --units 4 --scouts 3 --remaining 70
node .claude/scripts/budget.js --plan max --preset proof --mode fable
node .claude/scripts/budget.js --plan pro --preset super --units 4 --pilot-measured 3 --pilot-calls "su-builder:1,su-tester:1"
node .claude/scripts/budget.js --plan pro --calls "w-implement:3,checker-test:1,checker:1"
```

- `--compare`: 같은 단위 수로 절약·기본·강화·최대·극한을 나란히 보여준다. 모드를 물을 때 쓴다.
- `--preset <lite|standard|plus|super|fable>`: 모드별 기본 규모. 한국어 이름(절약·기본·강화·최대·극한)도 된다.
  - lite: 단위마다 `w-implement-lite`(Haiku), 그중 `--heavy`개(기본 1)는 `w-implement`(Sonnet), 수정 1라운드, test, 가벼운 review(`checker-lite`)
  - standard: 단위마다 `w-implement`(Sonnet), `--lite-units`개는 Haiku, `--hard`개는 `w-implement-opus`, `--design`개 설계(기본 0), 수정 1라운드, test, review
  - plus: 정찰 1, 설계 0, 단위마다 `w-implement-opus`+수정 1회+단위 테스트, 통합 test, 리뷰 2, `상` 반박 검증 3
  - super: 정찰 3, 설계 후보 3+판정, 단위마다 `su-builder`+수정 1회+테스트, 통합 test, 리뷰 3, 중복 정리, 반박 검증 8, 최종 판정
  - fable: super와 같은 구조에 설계 후보·구현이 Fable, 리뷰 Opus 3 + Fable 1, 반박 검증 15(지적 전부), 수정 최대 3
  - `--fix`는 lite·standard에서는 전체 수정 라운드 수, plus·super에서는 단위당 평균 수정 횟수다.
- `--preset proof --mode <모드>`: 증명. 검증자 수는 절약·기본 1, 강화 2, 최대·극한 3. 라운드 최대는 절약 2, 나머지 3. 작성자는 극한만 Fable max.
- `--calls "이름:횟수[:크기]"`: 호출 목록. 에이전트의 모델·노력은 agents/ 파일에서 읽는다. 프리셋에 더할 수도 있다.
- `--remaining <%>`: 남은 주간 한도. 예상 상단이 남은 한도를 넘거나 그 절반을 넘으면 경고한다.
- `--pilot-measured <%>`: 첫 조각을 돌린 뒤 `/usage` 주간 % 차이. 나머지를 그 비율로 보정한다.

호출 크기 계수(가정): 구현은 1.13(코딩 에이전트 과제가 AA 과제보다 약 13% 크다: Claude Code + Opus max 3.4–4.3% vs 3.0–3.8%), 설계·리뷰·증명 작성·review는 1(AA 과제 하나), 판정·반박 검증·증명 검증·정찰·테스트·데이터 처리는 0.5, 중복 정리·잡일은 0.2, 이어서 부른 수정은 구현 계수의 절반. 이 계수가 추정에서 가장 불확실한 부분이라 실측으로 보정한다.

### 모드별 예상치 (스크립트 기본 규모, 추정)

코드 작업, 작업 단위 3개(절약은 그중 1개가 Sonnet). 단계마다 약 3배:

| 모드 | Pro | Max | Ultra | 기본 대비 |
|---|---|---|---|---|
| 절약 | 1.1–1.4% | 0.23–0.28% | 0.11–0.14% | 약 0.37배 |
| 기본 | 3.0–4.0% | 0.60–0.80% | 0.30–0.40% | 1배 |
| 강화 | 9.2–12% | 1.8–2.4% | 0.92–1.2% | 약 3.0배 |
| 최대 | 27–34% | 5.3–6.8% | 2.7–3.4% | 약 8.6배 |
| 극한 | 15–20% + Fable은 크레딧 | 15–16% (Fable 12%) | 7.5–7.9% (Fable 5.9%) | Max 기준 약 22배 |

단위 1개나 6개여도 단계 간 배수는 2.6~3.2배로 비슷하다(`--units`로 확인).

증명 작업, 모드별 최대 라운드:

| 모드 | Pro | Max | Ultra |
|---|---|---|---|
| 절약 (검증 1, 2라운드) | 4.5–5.8% | 0.90–1.1% | 0.45–0.57% |
| 기본 (검증 1, 3라운드) | 6.3–8.0% | 1.3–1.6% | 0.63–0.80% |
| 강화 (검증 2, 3라운드) | 9.0–12% | 1.8–2.3% | 0.90–1.1% |
| 최대 (검증 3, 3라운드) | 12–15% | 2.3–3.0% | 1.2–1.5% |
| 극한 (Fable max 작성, 검증 3) | 8.1–10% + Fable은 크레딧 | 9.2–9.7% (Fable 7.6%) | 4.6–4.8% (Fable 3.8%) |

증명은 작성·검증이 모든 모드에서 Opus xhigh라(그 아래 설정은 증명 평가에서 크게 떨어진다) 모드 간 간격이 코드보다 좁다. 코딩 환경에서는 드문 작업이라 간격을 맞추지 않았다.

## 한계 — 숫자를 이렇게 읽는다

- **대략값이다.** AA 과제는 사용자 요청 하나와 다르고, 호출 크기 계수는 가정이다. 실측으로 보정한다.
- **실제는 표보다 높을 가능성이 크다.** 주간 한도 값은 캐시 읽기가 약 96%인 코딩 작업으로 잰 것이다. Claude 한도는 캐시 읽기를 아주 가볍게 센다. 캐시가 적은 작업(새 맥락을 쌓는 짧은 호출 여러 개)은 같은 API 비용에도 한도를 더 먹는다.
- **Haiku 값은 측정이 없다.** Opus와 같은 달러 풀이라고 가정했다. 또 API에서 Haiku는 프롬프트가 10만 토큰을 넘으면 5배 가격 구간이라, 맥락이 커지면 표보다 훨씬 비쌀 수 있다. 그래서 Haiku 에이전트는 모두 맥락을 작게 유지하라고 적혀 있다.
- **Fable 값은 계정 하나의 측정**에서 나왔다.
- **모델을 섞어도 한도는 하나다.** 모든 모델이 한 주간 한도를 같이 쓴다. Opus 1% + Haiku 0.1% = 1.1%.
- **5시간 한도는 따로다.** 큰 워크플로는 `/usage`의 현재 세션 사용률도 본다.
- **정책은 자주 바뀐다.** 2026년 9~11월에만 Opus 5.5 출시와 한도 조정, Sonnet 캐시 읽기 가격 인하, Fable 5.2 출시가 있었다. 바뀌면 `scripts/budget.js` 위쪽 표를 고친다.

## 실측으로 보정하기

1. 작업 직전 사용자에게 `/usage` 주간 사용률을 받는다.
2. 첫 조각(super는 단위 하나)을 돌린 뒤 다시 받는다. 그 사이 메인도 같은 한도를 쓰니 메인은 기다리는 동안 다른 일을 하지 않는다.
3. 차이를 `--pilot-measured`로 넣는다. 눈금이 1%라 차이가 1% 미만이면 보정하지 않는다(Max·Ultra에서 흔하다).

## 한도를 아끼는 원칙

1. **모델 계층을 깨서 아끼지 않는다. 규모를 줄인다.** 계층은 같은 한도에서 점수가 가장 높은 설정으로 골라 둔 것이다.
2. **수정은 같은 워커를 이어서.** 이미 쌓인 맥락은 캐시 읽기라 싸다. 새 워커는 맥락을 처음부터 쌓는다.
3. **지시서 입력에 정확한 파일 경로.** 탐색이 줄어든다.
4. **같은 파일 묶음의 작은 일은 한 워커로.** 쪼갤수록 맥락을 여러 번 쌓는다.
5. **검증은 묶되 독립성은 지킨다.** 반박 검증은 같은 파일 지적을 묶어도 되지만, checker와 증명 검증자는 항상 새로 띄운다.
6. **Haiku 맥락은 10만 토큰 아래.** 긴 출력은 파일로 돌리고 필요한 줄만 읽는다.

## 줄이는 순서 (넘칠 때)

사용자에게 어디까지 줄일지 묻는다. 위에서부터 줄인다. 아래로 갈수록 품질 손실이 크다. 가장 간단한 방법은 모드를 한 단계 낮추는 것이다(극한 → 최대 → 강화 → 기본 → 절약). 모드는 사용자가 고른다.

극한(fable): 한도 때문에 규모를 줄이지 않는다. 끝까지 못 갈 때(전체가 남은 주간 한도를, 또는 Fable 몫이 남은 Fable 몫을 넘을 때)만 최대 모드로 바꿀지 묻는다.

최대(super):
1. 반박 검증 범위: 상위 15개 → `상`·`중`만 (`하`는 "검증 안 함"으로 넘긴다)
2. 설계 후보 3 → 2 (부딪히는 축 둘)
3. 리뷰어 3 → 2 (스펙·완료 기준 / 정확성·회귀·보안)
4. `su-builder` 대신 `w-implement-opus`(Opus medium)를 worktree 격리로 (Agent 도구의 `isolation: "worktree"`. 워크플로에서는 문법이 지원할 때만). Pro 기준 단위당 약 2.3% → 0.9%
5. 그래도 넘치면 강화 모드로, 또는 주를 나눠서

강화(plus):
1. 정찰·설계를 뺀다(이미 아는 영역, 설계가 정해진 작업)
2. 리뷰어 2 → 1 (정확성·회귀·보안)
3. 그래도 넘치면 기본 모드로

기본(orchestrate):
1. 지시서가 파일·함수·바꿀 내용까지 정한 작은 단위는 `w-implement-lite`(Haiku max). Pro 기준 단위당 약 0.4% → 0.18%
2. 같은 파일 묶음의 작은 일을 한 워커로 합친다
3. 단계로 나눠 주를 넘긴다(사용자가 정한다)

줄이지 않는 것: 인터뷰, checker test, review(절약은 가벼운 review), 증명 작성자와 검증자 분리. 강화 이상에서는 `상` 지적의 반박 검증도 줄이지 않는다.
