#!/bin/sh
# beta/fetch-ci.sh — download the desktop installers that GitHub Actions ("데스크톱 판") built, into
# beta/builds/ (one flat folder for every version and OS) — the same folder sh beta/build-mac.sh writes the local mac build to.
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
OUT="$ROOT/beta/builds"; TMP=$(mktemp -d); mkdir -p "$OUT"
for P in mac windows linux; do
  gh run download "$RUN" --repo "$REPO" -n "CASTAWAY-$P" -D "$TMP/$P"
done
# 설치 파일만 한 폴더로(.blockmap 등은 버린다)
find "$TMP" -type f \( -name '*.dmg' -o -name '*.exe' -o -name '*.AppImage' \) -exec mv -f {} "$OUT/" \;
rm -rf "$TMP"
# 받은 것의 판 번호가 package.json 과 다르면 알린다(다른 판의 실행을 받았다)
ls "$OUT" | grep -q "CASTAWAY-$VER-" || echo "warning: no files carry version $VER — check the run id"
echo "ready:"; ls -lh "$OUT" | grep "CASTAWAY-$VER-"
