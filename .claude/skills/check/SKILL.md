---
name: check
description: 사용자가 "/check test", "/check debug 증상", "/check review"라고 직접 부르거나, orchestrate 메인이 검수 단계에서 부를 때 발동한다. 깨끗한 맥락의 서브에이전트를 새로 띄워 목표·검증 기준과 git diff만 넘기고 독립적으로 테스트·디버그·리뷰하게 한다. 서브에이전트는 수정하지 않는다. 그 외에는 자동으로 발동하지 않는다.
---

# check — 서브에이전트로 test / debug / review

> 원본: orchestrate 플러그인 v2.0.0(사용자가 올림 2026-10-30). 이 레포에서는 checker 를 `.claude/agents/checker.md` 로 둔다. 병합 규칙은 orchestrate 스킬 머리의 '이 레포에서 바꾼 셋'.

목적: 메인 대화가 믿는 걸 같이 믿지 않는 **독립 검증**. 그래서 대화 내용은 넘기지 않는다.

**호출 경로는 둘뿐.** 사용자가 직접 부르거나, orchestrate 메인이 검수 단계(4단계)에서 부른다. 그 밖에 메인이 스스로 판단해서 부르지 않는다.

## 모드와 모델

| 모드 | 하는 일 | model | effort |
|---|---|---|---|
| test | 빌드·테스트·실행 결과만 확인 (기계적) | sonnet | low |
| review | 검증 기준 판정 + 테스트가 못 잡는 버그·스펙 어긋남 (판단) | opus | high |
| debug | 증상 재현, 원인 후보, 수정 제안 | opus | high |

- Agent 도구를 부를 때 `model`과 `effort`를 위 표대로 직접 넣는다 (checker.md 기본값은 opus/high라서 test 모드는 호출 때 낮춰야 한다)
- orchestrate 검수는 **test → (통과하면) review** 순서로 두 번 띄운다. test 가 실패하면 review 는 띄우지 않는다 — 안 돌아가는 코드를 리뷰하는 건 낭비다

## 1. 시작 상태 기록

프로젝트 레포에서:

```bash
git status --porcelain --ignored --untracked-files=all > <scratchpad>/check-status-before.txt
git status --porcelain=v1 -z --ignored --untracked-files=all > <scratchpad>/check-status-before.z
find <repo> -type d -not -path '<repo>/.git' -not -path '<repo>/.git/*' | sort > <scratchpad>/check-dirs-before.txt
git diff HEAD > <scratchpad>/check.diff    # 커밋 안 된 변경. 비어 있으면 아래
```

- ignored 파일까지 찍는 이유: 테스트 실행은 코드 수정이 아니어도 레포에 흔적을 남긴다 (hiscore, 리플레이, 캐시 등 .gitignore 대상이라 `--porcelain` 만으로는 안 보인다)
- `--untracked-files=all` 을 빼면 새 디렉터리가 `!! data/replays/` 처럼 한 줄로 뭉쳐서 파일 단위 비교가 안 된다
- diff 가 비어 있으면 사용자에게 범위를 묻는다 (예: `git diff main...HEAD`, 마지막 커밋 N개)
- orchestrate 에서 부를 때: 워커 결과를 합친 브랜치에서 실행하고, diff 는 `git diff <기준 브랜치>...HEAD` 로 뜬다. 워커가 worktree 에서 일했으면 그 브랜치를 먼저 합친 뒤 검사한다
- `<scratchpad>` 는 세션 스크래치 디렉터리(없으면 `mktemp -d` 로 만든 레포 밖 임시 디렉터리). 레포 안에 쓰지 않는다

## 2. 서브에이전트에 넘길 것 — 이것만

1. 승인된 계획의 **목표**와 **검증 기준** (원문 그대로 복사). orchestrate 에서는 워커 지시서의 **목표**와 **완료 기준** 원문
2. `git diff` (파일 경로 또는 본문)
3. debug 면 사용자가 말한 **증상** (원문 그대로)
4. 레포 경로

넘기지 않는 것: 대화 내용, 메인의 가설, 메인이 이미 시도한 것, "아마 ~일 것" 같은 추측.
승인된 계획이 없으면 목표·검증 기준을 사용자에게 한 줄씩 받는다. 메인이 지어내지 않는다.

## 3. 서브에이전트 띄우기

- 이 레포의 `checker` 에이전트(`.claude/agents/checker.md`)를 쓴다 — 도구를 읽기·실행으로 줄여 가볍다
- 로드되지 않았으면(그 파일을 막 만든 세션) general-purpose 에이전트를 쓰고, 프롬프트 맨 앞에 `.claude/agents/checker.md` 본문의 규칙(수정 금지, 태그, 출력 형식)을 그대로 붙인다 — 고정 비용이 5.8만 토큰이라 이때만
- opus 호출이 실패하면(요금제·한도) review·debug 는 `inherit` + high 로 다시 띄우고, 낮췄다고 보고에 적는다
- 모드를 프롬프트에 명시한다: `모드: test`, `모드: debug` 또는 `모드: review`

## 4. 끝난 뒤 확인

서브에이전트가 끝나면 메인은 다른 일을 하기 전에 바로 찍는다 (그 사이 메인이 레포에 쓰면 checker 흔적과 섞인다).

```bash
git status --porcelain --ignored --untracked-files=all > <scratchpad>/check-status-after.txt
git status --porcelain=v1 -z --ignored --untracked-files=all > <scratchpad>/check-status-after.z
diff <scratchpad>/check-status-before.txt <scratchpad>/check-status-after.txt

# 새로 생긴 파일 (추적 안 됨 ?? + ignored !! 모두) = after 에만 있는 줄
comm -13 <(tr '\0' '\n' < <scratchpad>/check-status-before.z | sort) \
         <(tr '\0' '\n' < <scratchpad>/check-status-after.z  | sort) \
  | grep -E '^(\?\?|!!) ' | cut -c4- > <scratchpad>/check-new-files.txt
```

1. **checker 가 만든 새 파일만 지운다.** `check-new-files.txt` 에 있는 것만, 원래 있던 파일은 건드리지 않는다
   ```bash
   while IFS= read -r f; do rm -f -- "<repo>/$f"; done < <scratchpad>/check-new-files.txt
   # 새로 생긴 빈 디렉터리 정리 (원래 있던 디렉터리는 그대로)
   find <repo> -type d -not -path '<repo>/.git' -not -path '<repo>/.git/*' | sort \
     | comm -13 <scratchpad>/check-dirs-before.txt - | sort -r \
     | while IFS= read -r d; do rmdir -- "$d" 2>/dev/null && echo "rmdir $d"; done
   git status --porcelain --ignored --untracked-files=all | diff <scratchpad>/check-status-before.txt -   # 비어야 함
   ```
2. **추적 파일 변경**(`M`, `D` 등 before 에 없던 줄 중 `??`/`!!` 가 아닌 것)은 지우거나 되돌리지 않는다. 결과보다 먼저 "서브에이전트가 작업 트리를 바꿨음"과 바뀐 파일을 보고하고, 되돌릴지는 사용자가 정한다
3. 한계: 원래 있던 파일을 checker 가 **덮어쓴 것**은 status 로 안 잡힌다 (ignored·untracked 파일은 내용 비교를 안 하므로). 의심되면 보고에 적는다
4. 차이가 전혀 없었으면 `git status 변화 없음` 한 줄

## 5. 보고

- **checker 가 만들고 지운 파일** 목록 (`check-new-files.txt` + 지운 디렉터리). 없으면 "없음"
- 서브에이전트 결과를 그대로 보여준다 (메인이 다시 요약하거나 걸러내지 않는다)
- 마지막에 묻는다: "고칠까? 고친다면 어느 항목부터?"
- **자동 수정 금지.** 사용자가 답하기 전에는 아무것도 고치지 않는다
- 예외 하나 (orchestrate 검수만): **test 모드 실패**는 명령 출력으로 확정된 객관적 실패라, 메인이 실패 표와 재현 명령을 원래 워커에게 넘겨 다시 시킬 수 있다 (최대 2번). 이때도 checker 와 메인은 직접 고치지 않는다. **review·debug 결과는 판단이라 항상 사용자에게 먼저 보고하고 묻는다**
