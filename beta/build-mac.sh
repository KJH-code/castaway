#!/bin/sh
# beta/build-mac.sh — make the macOS beta build (CASTAWAY.app + .dmg) for testers.
#
#   sh beta/build-mac.sh
#
# Packs the current game (island_world.html + engine/ + presets/) with the Electron wrapper
# in desktop/ and copies the results into beta/builds/:
#     beta/builds/CASTAWAY.app                 double-click to play
#     beta/builds/CASTAWAY-<version>-mac.dmg   hand this to testers (universal: Apple Silicon + Intel)
# The build is NOT signed: the first time, testers must right-click the app -> Open.
# beta/builds/ is ignored by git — the .dmg is over 200 MB (GitHub refuses files over 100 MB).
# Windows / Linux builds come from GitHub Actions ("데스크톱 판" workflow) on every push.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
CACHE="$ROOT/env/.cache/npm"
cd "$ROOT/desktop"
[ -d node_modules ] || npm ci --no-audit --no-fund --cache "$CACHE"
npm_config_cache="$CACHE" npx electron-builder --mac --publish never
mkdir -p "$ROOT/beta/builds"
rm -rf "$ROOT/beta/builds/CASTAWAY.app"
cp -R dist/mac-universal/CASTAWAY.app "$ROOT/beta/builds/"
cp dist/CASTAWAY-*-mac.dmg "$ROOT/beta/builds/"
echo "beta build ready:"; ls -lh "$ROOT/beta/builds" | tail -n +2
