---
name: fable
description: 극한 모드. 한도를 거의 신경 쓰지 않고 품질만 보는 가장 높은 단계. 최대(super) 모드의 워크플로 구조에 설계 후보·구현을 Fable 5.2(high)로, 리뷰에 Fable 1명을 더하고, 반박 검증은 지적 전부, 증명 작성은 Fable max로 한다. 판정·검증은 Opus가 해서 만든 모델과 검사하는 모델이 다르다. Fable 5.2를 쓰는 유일한 모드. 사용자가 모드 선택에서 '극한'을 고르거나 "/fable"로 직접 부를 때만 쓴다. 스스로 판단해서 발동하지 않는다.
---

# fable — 극한 모드

> 이 레포에서는 `/fable` 로 부른다(플러그인이 아니라 `orchestrate:` 가 안 붙는다 · 에이전트 이름도 그대로). **병합 규칙은 orchestrate 스킬 머리의 '이 레포에서 바꾼 셋' 1 을 따른다** — 메인이 test 통과 · review 에 실패 없음이면 main 에 합치고, 실패 · 의심이 있으면 보고하고 답을 기다린다(아래 '사용자 승인 없이 기본 브랜치에 병합하기'는 그 경우를 말한다).

**최대 모드(`super` 스킬) 절차를 그대로 따르되, 아래 항목만 바꾼다.** 먼저 이 플러그인의 `skills/super/SKILL.md`를 읽는다. 최대 모드 문서의 "Fable을 쓰지 않는다"는 이 모드에서는 적용하지 않는다.

이 모드의 기준은 한도가 아니라 품질이다. 역할마다 점수가 가장 높은 설정을 쓰고, 만든 모델과 검사하는 모델을 다르게 둔다. 한도는 Max 기준 작업 단위 3개에 약 15–16%(그중 Fable 약 12%), Ultra 약 7.5–8%다(추정).

## 최대 모드와 다른 점

| 항목 | 최대 | 극한 |
|---|---|---|
| 설계 후보 ×3 | `su-designer` (Opus xhigh) | **`su-designer-fable` (Fable high)** |
| 설계·최종 판정 | `su-judge` (Opus xhigh) | 같음. Fable이 만든 것을 다른 모델이 판정한다 |
| 구현 | `su-builder` (Opus xhigh) | **`su-builder-fable` (Fable high)** |
| 수정 루프 | 최대 2번 | **최대 3번** |
| 리뷰 | `su-reviewer` ×3 관점 (Opus xhigh) | `su-reviewer` ×3 관점 **+ `su-reviewer-fable` 1명 (Fable high, 전체 관점)** |
| 반박 검증 | 상위 15개 | **지적 전부** (`su-verifier`, Opus high). `상`은 하나씩, `중`·`하`는 같은 파일끼리 최대 3개씩 묶는다 |
| 증명 작성 | `su-prover` (Opus xhigh) | **`prover-fable` (Fable max)** |
| 증명 검증 ×3 | `w-proof-verify` (Opus xhigh) | 같음 |
| 정찰·테스트·중복 정리·잡일 | Sonnet·Haiku | 같음. 비싼 모델로 바꿔도 결과가 거의 나아지지 않는다 |
| 줄이는 순서 | 넘치면 사용자에게 묻는다 | 쓰지 않는다. 한도 때문에 규모를 줄이지 않는다 |

## 왜 이 설정인가

- **코드 쪽 Fable은 high다.** 코드 수정(FrontierCode 2.0)은 Fable high 49.1%가 전체 1위이고, xhigh 47.6%·max 48.8%는 오히려 낮다. 터미널 작업은 Opus와 같다(59.6%). 한도를 무시해도 high가 맞다.
- **증명 쪽 Fable은 max다.** 증명·과학은 max에서 실제로 오른다(Fable high → max: HLE 73.8 → 80.2, CritPt 73.0 → 76.5, Terminal-Bench-Science 70.0 → 73.3).
- **판정·검증은 Opus다.** 같은 모델은 같은 구멍을 같이 못 볼 수 있다. Fable이 설계·구현·증명을 하면 판정·반박 검증·증명 검증은 Opus가 한다. 업무 판단 평가(Briefcase)도 Opus(1800)와 Fable(1785)이 비슷하다.
- **Fable 리뷰어 1명을 더한다.** Opus 리뷰어 3명이 다른 모델로 검사하고, Fable은 지식 평가에서 크게 앞서서(AA-Omniscience 67 vs 48) 라이브러리·API 오용, 도메인 지식 오류를 따로 본다. 그 지적도 Opus 검증자가 반박 검증한다.
- Claude Code에서 Fable을 잰 데이터(코딩 에이전트 지수)는 아직 없다. 첫 단위 실측을 꼭 한다.

## 0단계에서 더 확인할 것

최대 모드 0단계에 아래를 더한다.

1. `echo "$ORCHESTRATE_FABLE"`가 `1`이 아니면 시작하지 않는다. 훅이 Fable 에이전트를 막고, 워크플로 스크립트 안 호출은 훅이 못 보므로 메인이 직접 막는다. 사용자에게 `~/.claude/settings.json`의 `env`에 `"ORCHESTRATE_FABLE": "1"`을 넣고 Claude Code를 다시 시작하라고 알린다.
2. **Pro 요금제**면 Fable은 주간 한도가 아니라 사용량 크레딧으로 따로 청구된다는 것을 알리고, 그래도 진행할지 한 번 묻는다. 답이 없으면 진행하지 않는다.
3. **Fable 몫**: Fable은 주간 한도의 절반까지만 쓸 수 있다. 예상치를 보여준다.
   ```bash
   node .claude/scripts/budget.js --plan <요금제> --preset fable --units <단위 수> --remaining <남은 %>
   # 증명: --preset proof --mode fable
   ```
   예상 Fable 몫이 주간 한도의 50%(이번 주에 이미 Fable을 썼고 그 양을 알면 그만큼 뺀 값)를 넘거나, 전체 예상이 남은 주간 한도를 넘으면 **끝까지 못 가므로** 사용자에게 알리고 묻는다. 그 밖의 이유로는 규모를 줄이자고 하지 않는다.

## 실측

최대 모드 2단계와 같이 첫 단위를 돌리고 `/usage` 차이로 보정한다.

```bash
node .claude/scripts/budget.js --plan <요금제> --preset fable --units <단위 수> --pilot-measured <차이> --pilot-calls "su-builder-fable:1,su-tester:1"
```

## Fable이 막혔을 때

- Fable 몫이 바닥나거나 Fable 호출이 실패하면, 그 단계부터 Opus 짝(`su-designer`, `su-builder`, `su-reviewer`, `su-prover`)으로 바꾸고 보고에 적는다. 남은 단계는 사실상 최대 모드다.
- 주간·5시간 한도 자체에 걸리면 최대 모드와 같이 멈추고 보고한다.

## 보고

최대 모드 6단계 양식을 쓰고, "비용"에 Fable 몫(예상·실측)과 Fable→Opus로 바꾼 단계를 적는다.

## 하지 말 것

- 최대 모드의 "하지 말 것" 전부 (Fable 금지 항목만 빼고).
- `ORCHESTRATE_FABLE` 확인 없이, 또는 Pro에서 크레딧 청구 동의 없이 시작하기.
- Fable이 만든 결과를 Fable만으로 판정·검증하기. 판정·반박 검증·증명 검증은 Opus다.
- 코드 쪽 Fable을 high 말고 다른 노력으로 쓰기.
