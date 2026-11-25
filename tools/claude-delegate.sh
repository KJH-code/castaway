#!/usr/bin/env bash
# claude-delegate.sh — 이 레포(CASTAWAY)의 일을 보조 계정 Claude 에게 맡긴다(사용자 컴퓨터에서 · 클라우드 세션에선 못 씀)
#
# 하는 일:
#   1) 지금 HEAD 에서 새 브랜치 delegate/<시각> + 따로 작업 폴더(git worktree)를 만든다
#   2) 그 폴더에서 보조 계정(CLAUDE_CONFIG_DIR)으로 `claude -p` 를 헤드리스로 돌린다
#      — 레포 규칙(CLAUDE.md · 읽지 말 것 · 결정론 · 검사 명령)을 지시 앞에 붙이고 · 모드 질문 훅은 끈다(답할 사람이 없다)
#   3) 끝나면 스크립트가 직접 문법 검사 · 전역 이어 붙이기 검사를 돌려 결과를 적고, 바뀐 것을 그 브랜치에 커밋한다
#   4) 주 계정에서 diff 를 보고 merge → 그 뒤는 이 레포의 늘 하던 흐름(작업 브랜치 → PR → main)
#
# 보조 계정 만들기(한 번): mkdir -p ~/.claude-sub && CLAUDE_CONFIG_DIR=~/.claude-sub claude  → /login(보조 계정) → /status 로 확인 → /exit
#
# 쓰는 법(레포 안에서):
#   tools/claude-delegate.sh run "30-props.js 의 자갈 크기를 0.8 배로 · 판 15 이하 섬은 그대로"
#   tools/claude-delegate.sh run -f 지시서.md          # 긴 지시는 파일로(메인 세션이 쓴 지시서를 그대로)
#   tools/claude-delegate.sh resume <작업ID> "smoke 가 실패했어 — 고쳐줘"   # 같은 대화 이어 가기
#   tools/claude-delegate.sh list | diff <작업ID> | check <작업ID> | merge <작업ID> | clean <작업ID>
#
# 환경 변수:
#   DELEGATE_PROFILE          보조 계정 설정 폴더(기본 ~/.claude-sub)
#   DELEGATE_MODEL            모델(기본: 보조 계정의 기본값) · 예 opus · sonnet
#   DELEGATE_EFFORT           노력(low · medium · high · xhigh · max · 기본: 정하지 않음)
#   DELEGATE_PERMISSION_MODE  권한 모드(기본 acceptEdits)
#   DELEGATE_ALLOWED_TOOLS    허용할 명령(기본: 아래 CASTAWAY_TOOLS — 이 레포의 node 검사 도구 + 읽기 명령)
#   DELEGATE_MAX_TURNS        최대 차례(기본 80 — 이 레포의 일은 50 으로 모자라기 쉽다)
#   DELEGATE_SMOKE=1          끝난 뒤 구동 검사(smoke)도 돌린다(playwright · 브라우저가 있어야 함 · 1~2 분)
#   DELEGATE_ALLOW_MAIN=1     main 에 바로 merge 하는 것을 허락(기본은 막는다 — 작업 브랜치에서 합친 뒤 PR 로)

set -euo pipefail

PROFILE_DIR="${DELEGATE_PROFILE:-$HOME/.claude-sub}"
PERMISSION_MODE="${DELEGATE_PERMISSION_MODE:-acceptEdits}"
CASTAWAY_TOOLS='Bash(node:*) Bash(git status:*) Bash(git diff:*) Bash(git log:*) Bash(git show:*) Bash(grep:*) Bash(sed -n:*) Bash(ls:*) Bash(wc:*) Bash(head:*) Bash(tail:*) Bash(python3 tools/serve.py:*)'
ALLOWED_TOOLS="${DELEGATE_ALLOWED_TOOLS:-$CASTAWAY_TOOLS}"
MAX_TURNS="${DELEGATE_MAX_TURNS:-80}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"

die() { echo "오류: $*" >&2; exit 1; }

repo_root() { git rev-parse --show-toplevel 2>/dev/null || die "git 저장소 안에서 실행하세요."; }
state_dir() { local d; d="$(git rev-parse --git-common-dir)/claude-delegate"; mkdir -p "$d"; (cd "$d" && pwd); }

need_profile() {
  [[ -d "$PROFILE_DIR" ]] || die "보조 계정 설정 폴더가 없습니다: $PROFILE_DIR — 먼저: mkdir -p $PROFILE_DIR && CLAUDE_CONFIG_DIR=$PROFILE_DIR claude  (그 안에서 /login)"
  command -v "$CLAUDE_BIN" >/dev/null || die "claude 명령을 찾을 수 없습니다."
  command -v node >/dev/null || die "node 가 없습니다(이 레포의 검사 도구가 node 로 돈다)."
}

meta() { local f; f="$(state_dir)/$1.env"; [[ -f "$f" ]] || die "작업을 찾을 수 없습니다: $1"; echo "$f"; }

# 레포 규칙 — 보조 Claude 는 이 대화의 맥락을 모르고 시작하니 지킬 것을 지시 앞에 붙인다(CLAUDE.md 는 그쪽이 저절로 읽는다)
RULES='[이 레포(CASTAWAY)에서 지킬 것]
- 먼저 CLAUDE.md 를 따른다. 고칠 계통의 노트(docs/notes/*.md)는 grep 으로 그 대목만 읽는다(통째로 읽지 말 것).
- engine/js/data-*.js(base64 자료) · docs/CASTAWAY_전사_*.md(개발 대화 원문)는 읽지 않는다. 큰 파일은 grep 으로 줄을 집어 sed -n 으로.
- 같은 시드는 같은 섬: 지형 · 자원 배치 경로에 Math.random 금지 · 시드를 바꾸는 일은 새 지형 판(P.tv) 뒤에만. 판을 올리면 CLAUDE.md "지형 판" 규칙대로 같이 고칠 곳을 다 고친다.
- 셰이더 글: 음수를 그대로 끼우지 말 것(괄호로) · 템플릿 글 주석에 백틱 금지 · 예약어 patch 금지.
- 요청 범위만 고친다. 정본/복사본 표(CLAUDE.md "어느 쪽이 정본인가")에 걸리면 어느 쪽을 고쳤는지 밝힌다.
- 끝내기 전에 돌린다:
    node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js
    grep -o '"'"'src="[^"]*\.js"'"'"' island_world.html | sed '"'"'s/src="//;s/"$//'"'"' | grep -v three.min | xargs cat > /tmp/castaway-all.js && node --check /tmp/castaway-all.js
    (브라우저가 있으면) node tools/smoke.mjs island_world.html
- git commit · push · PR 은 하지 않는다(스크립트가 커밋한다). 고친 것은 그 계통 노트에 적을 것을 요약에 따로 적는다.
- 끝나면 한국어로 짧게: 한 일(파일별 한 줄) · 돌린 검사와 결과 · 남은 문제 · 노트에 적을 것.'

run_claude() { # $1=worktree  $2=prompt  [$3=session_id]  -> stdout: json
  local wt="$1" prompt="$2" sid="${3:-}"
  local args=(-p "$prompt" --output-format json --permission-mode "$PERMISSION_MODE" --max-turns "$MAX_TURNS")
  [[ -n "${DELEGATE_MODEL:-}" ]] && args+=(--model "$DELEGATE_MODEL")
  [[ -n "${DELEGATE_EFFORT:-}" ]] && args+=(--effort "$DELEGATE_EFFORT")
  local tools=()   # 공백으로 나눈 허용 목록을 하나씩(괄호 안 공백은 그대로)
  while IFS= read -r t; do [[ -n "$t" ]] && tools+=("$t"); done < <(grep -oE '[A-Za-z]+(\([^)]*\))?' <<<"$ALLOWED_TOOLS")
  [[ ${#tools[@]} -gt 0 ]] && args+=(--allowedTools "${tools[@]}")
  [[ -n "$sid" ]] && args+=(--resume "$sid")
  # 모드 질문 훅(.claude/hooks/ask-mode.js)은 끈다 — 헤드리스라 답할 사람이 없어 묻다가 멈춘다
  (cd "$wt" && CLAUDE_CONFIG_DIR="$PROFILE_DIR" ORCHESTRATE_ASK_MODE=0 "$CLAUDE_BIN" "${args[@]}")
}

json_field() { # $1=json $2=field
  # node 로 읽는다(Windows Git Bash 에는 python3 가 없기 쉽다 · node 는 이 레포 검사에 어차피 있어야 한다)
  node -e 'let d={};try{d=JSON.parse(process.argv[1])}catch(e){};const v=d[process.argv[2]];console.log(v==null||v===false?"":v===true?"true":String(v))' "$1" "$2" 2>/dev/null || true
}

# 스크립트가 직접 하는 검사(토큰 0) — 보조 Claude 가 돌렸다고 한 것과 별개로 한 번 더
checks() { # $1=worktree -> 결과를 찍는다
  local wt="$1" ok=1 tmp
  echo "── 검사(스크립트가 직접) ──"
  if (cd "$wt" && node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js >/dev/null 2>&1); then echo "  문법 검사: 통과"; else echo "  문법 검사: 실패 — (cd $wt && node tools/check-syntax.mjs *.html beta/*.html engine/js/*.js presets/*.js)"; ok=0; fi
  tmp="$(mktemp -d)/all.js"   # node --check 는 .js 이름이어야 읽는다
  if (cd "$wt" && grep -o 'src="[^"]*\.js"' island_world.html | sed 's/src="//;s/"$//' | grep -v three.min | xargs cat > "$tmp" && node --check "$tmp" >/dev/null 2>&1); then echo "  전역 이어 붙이기: 통과"; else echo "  전역 이어 붙이기: 실패(전역 이름이 겹치면 그 파일이 통째로 안 읽힌다)"; ok=0; fi
  rm -rf "$(dirname "$tmp")"
  if [[ "${DELEGATE_SMOKE:-0}" == 1 ]]; then
    if (cd "$wt" && node tools/smoke.mjs island_world.html >/dev/null 2>&1); then echo "  구동 검사: 통과"; else echo "  구동 검사: 실패 — (cd $wt && node tools/smoke.mjs island_world.html)"; ok=0; fi
  else echo "  구동 검사: 안 돌림(DELEGATE_SMOKE=1 이면 돌린다 · merge 전에 한 번은 돌릴 것)"; fi
  [[ $ok == 1 ]]
}

commit_wt() { # $1=worktree $2=id $3=task
  local wt="$1" id="$2" task="$3" subj
  if [[ -n "$(git -C "$wt" status --porcelain)" ]]; then
    subj="$(head -n1 <<<"$task" | cut -c1-60)"
    git -C "$wt" add -A
    git -C "$wt" commit -q -F - <<EOF
delegate($id): $subj

보조 계정에 맡긴 일(tools/claude-delegate.sh). 지시 원문(앞 20 줄):
$(head -n 20 <<<"$task")$( [[ $(wc -l <<<"$task") -gt 20 ]] && printf '\n…(줄임)' )

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
    echo "커밋됨: $(git -C "$wt" log -1 --format='%h %s')"
  else
    echo "(새 변경 없음)"
  fi
}

save_meta() { # $1=file — 값은 printf %q 로(경로에 따옴표가 있어도 source 가 안 깨진다)
  { printf 'BRANCH=%q\n' "$BRANCH"; printf 'WORKTREE=%q\n' "$WORKTREE"; printf 'BASE=%q\n' "$BASE"; printf 'SESSION_ID=%q\n' "$SESSION_ID"; } >"$1"
}

summary() { # $1=json
  local out="$1"
  echo; echo "── 보조 계정 요약 ──"
  echo "$(json_field "$out" result)"
  local turns cost err; turns="$(json_field "$out" num_turns)"; cost="$(json_field "$out" total_cost_usd)"; err="$(json_field "$out" is_error)"
  echo; echo "차례 ${turns:-?}/$MAX_TURNS${cost:+ · 비용 어림 \$$cost}${err:+ · is_error=$err}"
  [[ -n "$turns" && "$turns" -ge "$MAX_TURNS" ]] && echo "주의: 차례 한도에 닿았다 — 일이 덜 끝났을 수 있다. resume 으로 이어 갈 것."
  return 0
}

report() { # $1=id
  # shellcheck disable=SC1090
  source "$(meta "$1")"
  echo
  echo "── 작업 $1 ─────────────────────────────"
  echo "브랜치 : $BRANCH"
  echo "폴더   : $WORKTREE"
  echo "변경   :"
  git diff --stat "$BASE...$BRANCH" | sed 's/^/  /'
  echo
  echo "다음: tools/claude-delegate.sh diff $1  →  check $1  →  merge $1   (또는 resume $1 \"추가 지시\")"
}

cmd_run() {
  local task=""
  if [[ "${1:-}" == "-f" ]]; then [[ -f "${2:-}" ]] || die "지시서 파일이 없습니다: ${2:-}"; task="$(cat "$2")"; else task="${1:-}"; fi
  [[ -n "$task" ]] || die "맡길 일을 적으세요(또는 -f 지시서.md)."
  need_profile
  local root id sd prompt out
  root="$(repo_root)"; sd="$(state_dir)"
  id="$(date +%Y%m%d-%H%M%S)"
  BRANCH="delegate/$id"
  WORKTREE="$(dirname "$root")/$(basename "$root")-delegate-$id"
  BASE="$(git -C "$root" rev-parse HEAD)"
  SESSION_ID=""

  [[ -z "$(git -C "$root" status --porcelain)" ]] || echo "주의: 커밋하지 않은 변경은 보조 계정에 안 넘어간다(HEAD 기준으로 시작)." >&2

  git -C "$root" worktree add -q -b "$BRANCH" "$WORKTREE" "$BASE"
  echo "작업 $id 시작 — 보조 계정이 $WORKTREE 에서 일하는 중(차례 한도 $MAX_TURNS)..."

  prompt="$task

$RULES
- 이 폴더는 따로 선 브랜치($BRANCH)다."

  out="$(run_claude "$WORKTREE" "$prompt")" || echo "경고: claude 가 오류 코드로 끝났다." >&2
  SESSION_ID="$(json_field "$out" session_id)"
  save_meta "$sd/$id.env"
  printf '%s\n' "$out" >"$sd/$id.log.json"

  summary "$out"
  echo; checks "$WORKTREE" || echo "  → 검사 실패 — merge 하지 말고 resume 으로 고치게 할 것."
  echo; commit_wt "$WORKTREE" "$id" "$task"
  report "$id"
}

cmd_resume() {
  local id="${1:-}" msg="${2:-}"; [[ -n "$id" && -n "$msg" ]] || die "사용법: resume <작업ID> \"추가 지시\""
  need_profile
  # shellcheck disable=SC1090
  source "$(meta "$id")"
  [[ -n "$SESSION_ID" ]] || die "이 작업에는 이어 갈 세션 ID 가 없다."
  local out sid; out="$(run_claude "$WORKTREE" "$msg" "$SESSION_ID")" || echo "경고: claude 가 오류 코드로 끝났다." >&2
  sid="$(json_field "$out" session_id)"; [[ -n "$sid" ]] && SESSION_ID="$sid"
  save_meta "$(meta "$id")"
  printf '%s\n' "$out" >>"$(state_dir)/$id.log.json"
  summary "$out"
  echo; checks "$WORKTREE" || echo "  → 검사 실패 — merge 하지 말 것."
  echo; commit_wt "$WORKTREE" "$id" "$msg"
  report "$id"
}

cmd_list() {
  local sd; sd="$(state_dir)"
  shopt -s nullglob
  local any=0 f id
  for f in "$sd"/*.env; do
    any=1
    # shellcheck disable=SC1090
    source "$f"
    id="$(basename "$f" .env)"
    printf '%s  %s  (%s 커밋)\n' "$id" "$BRANCH" "$(git rev-list --count "$BASE..$BRANCH" 2>/dev/null || echo '?')"
  done
  [[ $any -eq 1 ]] || echo "맡긴 일이 없다."
}

cmd_diff() {
  local id="${1:-}"; [[ -n "$id" ]] || die "작업 ID 를 적으세요."
  # shellcheck disable=SC1090
  source "$(meta "$id")"
  git diff "$BASE...$BRANCH"
}

cmd_check() {
  local id="${1:-}"; [[ -n "$id" ]] || die "작업 ID 를 적으세요."
  # shellcheck disable=SC1090
  source "$(meta "$id")"
  checks "$WORKTREE"
}

cleanup() { # $1=id
  # shellcheck disable=SC1090
  source "$(meta "$1")"
  git worktree remove --force "$WORKTREE" 2>/dev/null || true
  git branch -D "$BRANCH" -q 2>/dev/null || true
  rm -f "$(state_dir)/$1.env"
}

cmd_merge() {
  local id="${1:-}"; [[ -n "$id" ]] || die "작업 ID 를 적으세요."
  # shellcheck disable=SC1090
  source "$(meta "$id")"
  local cur; cur="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$cur" == main || "$cur" == master ]] && [[ "${DELEGATE_ALLOW_MAIN:-0}" != 1 ]]; then
    die "지금 $cur 에 있다 — 이 레포는 작업 브랜치에서 합친 뒤 PR 로 main 에 넣는다(DELEGATE_ALLOW_MAIN=1 이면 그대로 합친다)."
  fi
  checks "$WORKTREE" || die "검사가 실패해 합치지 않았다 — resume $id 로 고치게 하거나 직접 고친 뒤 다시."
  git merge --no-ff -m "합침: 보조 계정에 맡긴 일 $id" "$BRANCH" || die "충돌 — 풀고 'git commit' 뒤 'tools/claude-delegate.sh clean $id'"
  cleanup "$id"
  echo "합침 · 작업 폴더/브랜치 정리. 다음: smoke 를 돌리고 푸시 → PR → main."
}

cmd_clean() {
  local id="${1:-}"; [[ -n "$id" ]] || die "작업 ID 를 적으세요."
  cleanup "$id"
  echo "작업 $id 버림."
}

case "${1:-}" in
  run)    shift; cmd_run "$@" ;;
  resume) shift; cmd_resume "$@" ;;
  list)   cmd_list ;;
  diff)   shift; cmd_diff "$@" ;;
  check)  shift; cmd_check "$@" ;;
  merge)  shift; cmd_merge "$@" ;;
  clean)  shift; cmd_clean "$@" ;;
  *) sed -n '2,27p' "$0" ;;
esac
