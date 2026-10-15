#!/bin/sh
# engine/native/build.sh — compile the C kernels (erosion.c, shore.c, light.c) to WebAssembly and embed them for the game.
#
#   sh env/setup-zig.sh        # once: fetch the compiler into env/zig/
#   sh engine/native/build.sh  # writes engine/js/data-native-wasm.js
#
# The game cannot fetch a .wasm from file://, so the binary is embedded as base64 in a
# plain script (engine/js/data-native-wasm.js) that island_world.html loads.
# After building, open engine/native/verify.html through tools/serve.py and check that
# every row says "same" — the C and JavaScript kernels must give identical islands.
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
ZIG="$ROOT/env/zig/zig"
[ -x "$ZIG" ] || { echo "no compiler — run: sh env/setup-zig.sh"; exit 1; }
OUT="$ROOT/engine/native/erosion.wasm"
"$ZIG" cc -target wasm32-freestanding -O2 -nostdlib -ffp-contract=off -fno-fast-math \
  -Wl,--no-entry -Wl,--strip-all \
  -Wl,--export=cw_elev -Wl,--export=cw_thermal -Wl,--export=cw_hydraulic -Wl,--export=cw_smooth \
  -Wl,--export=cw_river -Wl,--export=cw_shore_out -Wl,--export=cw_shore \
  -Wl,--export=cw_tlit_open -Wl,--export=cw_tlit_out -Wl,--export=cw_under_base -Wl,--export=cw_under_m -Wl,--export=cw_under_b \
  -o "$OUT" "$ROOT/engine/native/erosion.c" "$ROOT/engine/native/shore.c" "$ROOT/engine/native/light.c"
python3 - "$OUT" "$ROOT/engine/js/data-native-wasm.js" <<'PY'
import base64, sys
b = open(sys.argv[1], 'rb').read()
open(sys.argv[2], 'w', encoding='utf-8', newline='\n').write(
  '/* data-native-wasm.js — CASTAWAY\n'
  '   engine/native/erosion.c 를 WebAssembly 로 짠 것(base64). 손으로 고치지 말 것 — sh engine/native/build.sh 가 다시 쓴다. */\n'
  '"use strict";\n'
  'const NATIVE_WASM_B64="' + base64.b64encode(b).decode() + '";\n')
print('wrote engine/js/data-native-wasm.js (%d bytes of wasm)' % len(b))
PY
rm -f "$OUT"
