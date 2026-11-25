---
name: code-mode
description: Claude Code 코드 모드(여러 도구 호출을 JavaScript 한 번으로 이어 실행 — 빠르고 토큰을 덜 씀)를 켜고 끄고 점검한다. 사용자가 "/kjh-lyj:code-mode", "코드 모드 켜", "코드 모드 꺼", "코드 모드 점검"처럼 직접 요청할 때만 쓴다. 스스로 판단해서 켜지 않는다.
---

# code-mode — 코드 모드 켜기 · 끄기 · 점검

코드 모드는 Claude Code 2.1.323 이상의 실험 기능이다(`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1`). 도구를 하나씩 부르는 대신 JavaScript 로 여러 호출을 한 번에 이어 실행해서 빠르고 맥락을 덜 쓴다. 메인 세션에서 켜면 워커(서브에이전트)도 같이 켜진다. relay 워커는 도구가 없어서 상관없다.

이 플러그인의 **모델 계층 강제 훅**은 Agent 호출마다 걸려야 워커 모델 · 노력이 지켜진다. 코드 모드로 이어 실행된 호출에도 훅이 걸리는지는 Claude Code 판과 환경마다 확인해야 해서, **켜기 전에 점검한다.**

## 절차

사용자가 말한 것에 따라 아래 명령 하나를 Bash 로 실행하고, 출력을 그대로 짧게 전한다. `<플러그인 루트>` 는 이 스킬 파일의 두 단계 위 폴더다.

| 요청 | 명령 |
|---|---|
| 상태 | `node <플러그인 루트>/scripts/code-mode.js status` |
| 점검 | `node <플러그인 루트>/scripts/code-mode.js check` — Haiku 로 몇 번 돌려 1~2센트 |
| 켜기 | 먼저 점검(이번 대화에서 안 했으면) → 결과가 `ok` 또는 `inactive` 일 때 `node <플러그인 루트>/scripts/code-mode.js on` |
| 끄기 | `node <플러그인 루트>/scripts/code-mode.js off` |

- 기본 범위는 사용자 설정(`~/.claude/settings.json`). 이 프로젝트에만 켜려면 `--scope project`(팀이 같이 씀 · 커밋됨) 또는 `--scope local`(나만).
- 점검 결과:
  - `ok` — 코드 모드에서도 훅이 호출마다 걸린다. 켜도 된다.
  - `inactive` — 이 환경에선 코드 모드가 실제로 켜지지 않는다(효과 없음). 켜도 해는 없다고 알린다.
  - `hooks-bypassed` — 코드 모드가 훅을 건너뛴다. **켜지 않는다.** 스크립트도 `--force` 없이는 거부한다. 사용자가 그래도 원하면 계층 강제가 안 된다는 위험을 한 줄로 말하고 묻는다.
  - `unsupported` — Claude Code 판이 낮다. 업데이트를 권한다.
- 켜거나 끈 뒤: **Claude Code 를 다시 켜야 적용된다**고 알린다. 원래 settings 파일은 `.bak-kjh-lyj-<시각>` 으로 백업된다.
- 코드 모드에서는 Remote Control · Claude in Chrome · 컴퓨터 사용을 못 쓴다. 사용자가 그걸 쓰고 있으면 켜기 전에 알린다.
