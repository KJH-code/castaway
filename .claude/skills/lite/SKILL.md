---
name: lite
description: 절약 모드. 기본(orchestrate) 절차를 한도를 가장 적게 쓰는 설정으로 돌린다. 구현은 Haiku 위주(어려운 단위만 Sonnet medium), 검수는 test와 가벼운 review(Sonnet medium), 수정은 1번까지. 사용자가 모드 선택에서 '절약'을 고르거나 "/lite"로 직접 부를 때만 쓴다. 스스로 판단해서 발동하지 않는다.
---

# lite — 절약 모드

> 이 레포에서는 `/lite` 로 부른다(플러그인이 아니라 `kjh-lyj:` 가 안 붙는다 · 에이전트 이름도 그대로). **병합 규칙은 orchestrate 스킬 머리의 '이 레포에서 바꾼 셋' 1 을 따른다** — 메인이 test 통과 · review 에 실패 없음이면 main 에 합치고, 실패 · 의심이 있으면 보고하고 답을 기다린다(아래 '사용자 승인 없이 기본 브랜치에 병합하기'는 그 경우를 말한다).

**기본 모드(`orchestrate` 스킬) 절차를 그대로 따르되, 아래 표의 항목만 바꾼다.** 먼저 이 플러그인의 `skills/orchestrate/SKILL.md`를 읽는다.

한도는 기본 모드의 약 3분의 1이다(작업 단위 3개 중 1개가 어려운 단위일 때, Pro 기준 약 1.1–1.4%, 추정). 기본 모드보다 구현 모델과 리뷰가 한 칸씩 낮다.

| 항목 | 기본 | 절약 |
|---|---|---|
| 인터뷰 | 확정될 때까지 여러 번 | 목표·완료 기준·범위만, 한 번에 묻는다 |
| 설계 | 필요하면 `w-design` | 메인이 직접 정한다. 설계 판단이 크면 기본·강화 모드로 바꿀지 묻는다 |
| 구현 | `w-implement`(Sonnet medium) 기본 | **`w-implement-lite`(Haiku max) 기본.** 쉬운 단위 조건에 안 맞는 단위만 `w-implement`(Sonnet medium). Opus 구현은 쓰지 않는다 |
| 데이터·실험·잡일 | `w-data`·`w-experiment`(Haiku max), `w-chore`(Haiku medium) | 같음 |
| 검수 | `checker-test` → `checker` review(Opus xhigh) | **`checker-test` → `checker-lite` 가벼운 review(Sonnet medium)** |
| 수정 루프 | 최대 2번 | **최대 1번** |
| 증명 | `w-proof-write` + `w-proof-verify` 1명, 3라운드 | `w-proof-write` + `w-proof-verify` 1명, **2라운드** (증명은 Opus가 아니면 못 한다) |
| Fable | 안 씀 | 안 씀 |

쉬운 단위 조건(기본 모드 "구현 워커 고르기"와 같다): 지시서에 바꿀 파일·함수·내용이 다 적혀 있다 / 파일 1~3개, 의존성 설치·환경 설정·긴 셸 작업이 없다 / 기존 코드 구조를 새로 파악할 필요가 없다.

## 워커

| 단계 | 에이전트 | model | effort |
|---|---|---|---|
| 구현 (기본) | `w-implement-lite` | haiku | max |
| 구현 (어려운 단위) | `w-implement` | sonnet | medium |
| 데이터 처리 | `w-data` | haiku | max |
| 실험 실행 | `w-experiment` | haiku | max |
| 잡일 | `w-chore` | haiku | medium |
| 검수 test | `checker-test` | haiku | xhigh |
| 검수 review (가벼움) | `checker-lite` | sonnet | medium |
| 증명 작성 | `w-proof-write` | opus | xhigh |
| 증명 검증 | `w-proof-verify` | opus | xhigh |

## 지시서

`w-implement-lite`는 지시서의 **바꿀 내용** 칸이 필수다(`skills/orchestrate/references/spec-template.md`). 메인이 파일·함수·바꿀 내용까지 정해서 준다.

그러려면 메인이 먼저 코드를 읽어야 한다. 메인(Opus xhigh)이 단위마다 파일 여러 개를 깊게 읽어야 하면 절약 효과가 사라진다. 그런 단위는 `w-implement`(Sonnet)에게 바꿀 내용 없이 목표·완료 기준만 주고 맡긴다. 그런 단위가 대부분이면 기본 모드로 바꿀지 묻는다.

## 검수

1. 기본 모드 4단계와 같이 check 스킬 1단계(시작 상태 기록)를 하고 `checker-test`로 test를 돌린다. `실패`면 원래 워커를 이어서 불러 **1번만** 고친다.
2. test가 통과하면 `checker-lite`를 새로 띄워 가벼운 review를 한다. 넘기는 것은 check 스킬과 같다(목표·완료 기준 원문, git diff, 레포 경로). 결과는 그대로 사용자에게 보고한다.
3. `checker-lite`가 "깊은 review 권장"이라고 하면 보고에 그대로 적고 `/check review`(Opus xhigh)를 권한다. 메인이 알아서 돌리지 않는다.
4. check 스킬 4단계(흔적 정리)를 한다.

## 한도 추정

```bash
node .claude/scripts/budget.js --plan <요금제> --preset lite --units <단위 수> --heavy <Sonnet으로 보낼 단위 수>
```

이 레포는 플러그인이 아니라 `.claude/` 에 풀어 두었다 — 추정기는 `.claude/scripts/budget.js`.

## 보고

기본 모드 5단계 양식을 쓰고, "checker 결과"에 `checker-lite`의 결과를 넣는다. 깊은 review를 하지 않았다는 사실을 적는다.

## 하지 말 것

- 기본 모드의 "하지 말 것" 전부.
- 지시서에 바꿀 내용 없이 `w-implement-lite` 띄우기.
- 이 모드에서 Opus 구현 워커(`w-implement-opus`, `su-builder`) 쓰기.
- 수정 루프 2번 이상 돌리기. 1번 뒤에도 실패하면 멈추고 보고한다.
