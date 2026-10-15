#!/bin/sh
# beta/build-mac.sh — make the macOS beta build (CASTAWAY.app + .dmg) for testers.
#
#   sh beta/build-mac.sh
#
# Packs the current game (island_world.html + engine/ + presets/) with the Electron wrapper
# in desktop/ and copies the results into beta/builds/:
#     beta/builds/<version>/mac/CASTAWAY.app                 double-click to play
#     beta/builds/<version>/mac/CASTAWAY-<version>-mac.dmg   hand this to testers (universal: Apple Silicon + Intel)
# The build is NOT signed: the first time, testers must right-click the app -> Open.
# beta/builds/ is ignored by git — the .dmg is over 200 MB (GitHub refuses files over 100 MB).
# Windows / Linux builds come from GitHub Actions ("데스크톱 판" workflow) on every push — sh beta/fetch-ci.sh puts them
# next to it in beta/builds/<version>/windows/ and linux/.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CACHE="$ROOT/env/.cache/npm"
cd "$ROOT/desktop"
[ -d node_modules ] || npm ci --no-audit --no-fund --cache "$CACHE"
npm_config_cache="$CACHE" npx electron-builder --mac --publish never
# 판 번호마다 한 폴더 — beta/builds/<판>/mac/ (윈도·리눅스는 beta/fetch-ci.sh 가 같은 판 폴더의 windows/ · linux/ 에 받는다)
VER=$(node -p "require('./package.json').version")
OUTD="$ROOT/beta/builds/$VER/mac"
mkdir -p "$OUTD"
rm -rf "$OUTD/CASTAWAY.app"
cp -R dist/mac-universal/CASTAWAY.app "$OUTD/"
cp "dist/CASTAWAY-$VER-mac.dmg" "$OUTD/"
echo "beta build ready:"; ls -lh "$OUTD" | tail -n +2
