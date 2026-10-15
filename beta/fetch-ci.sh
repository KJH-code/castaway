#!/bin/sh
# beta/fetch-ci.sh — download the desktop installers that GitHub Actions ("데스크톱 판") built, into
# beta/builds/<version>/{mac,windows,linux}/ — the same folder sh beta/build-mac.sh writes the local mac build to.
#
#   sh beta/fetch-ci.sh              # the newest successful run on main · version from desktop/package.json
#   sh beta/fetch-ci.sh <run-id>     # a particular run (gh run list --workflow "데스크톱 판")
#
# Needs the GitHub CLI (gh) logged in. About 220 MB (mac) + 220 MB (windows) + 125 MB (linux).
# beta/builds/ is ignored by git.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPO=KJH-code/castaway
VER=$(node -p "require('$ROOT/desktop/package.json').version")
RUN=${1:-$(gh run list --repo "$REPO" --workflow "데스크톱 판" --branch main --status success --limit 1 --json databaseId --jq '.[0].databaseId')}
[ -n "$RUN" ] || { echo "no successful desktop run found"; exit 1; }
echo "version $VER · run $RUN"
for P in mac windows linux; do
  D="$ROOT/beta/builds/$VER/$P"; mkdir -p "$D"
  gh run download "$RUN" --repo "$REPO" -n "CASTAWAY-$P" -D "$D"
done
# 받은 것의 판 번호가 package.json 과 다르면 알린다(다른 판의 실행을 받았다)
ls "$ROOT/beta/builds/$VER"/*/ | grep -q "$VER" || echo "warning: files do not carry version $VER — check the run id"
echo "ready:"; ls -lhR "$ROOT/beta/builds/$VER" | grep -v '^total'
