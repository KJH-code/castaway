#!/bin/sh
# env/setup-zig.sh — fetch the C compiler used to build engine/native/ (C -> WebAssembly).
#
# Zig ships a complete clang + wasm linker in one archive, so "zig cc" is our C compiler.
# This downloads the official release from ziglang.org into env/zig/, checks its SHA-256,
# and prunes everything our build never touches (the C libraries for other platforms,
# the C++ runtime, docs). The result is ignored by git.
#
#   sh env/setup-zig.sh          # macOS arm64 (the pinned build below)
#
# To use another platform or version, change the three variables: URLs and checksums are
# listed at https://ziglang.org/download/index.json
set -eu
VER=0.15.2
PLAT=aarch64-macos
SHA=3cc2bab367e185cdfb27501c4b30b1b0653c28d9f73df8dc91488e66ece5fa6b

HERE=$(cd "$(dirname "$0")" && pwd)
URL="https://ziglang.org/download/$VER/zig-$PLAT-$VER.tar.xz"
TMP="$HERE/.cache"; mkdir -p "$TMP"
TAR="$TMP/zig-$PLAT-$VER.tar.xz"

if [ -x "$HERE/zig/zig" ] && [ "$("$HERE/zig/zig" version 2>/dev/null)" = "$VER" ]; then
  echo "env/zig is already $VER"; exit 0
fi
[ -f "$TAR" ] || { echo "downloading $URL"; curl -fL --progress-bar "$URL" -o "$TAR"; }
GOT=$(shasum -a 256 "$TAR" | cut -d' ' -f1)
[ "$GOT" = "$SHA" ] || { echo "checksum mismatch: $GOT"; rm -f "$TAR"; exit 1; }
rm -rf "$HERE/zig"; mkdir -p "$HERE/zig"
tar -xJf "$TAR" -C "$HERE/zig" --strip-components 1

# prune — we only compile freestanding C to wasm32: no libc, no C++, no other OS
cd "$HERE/zig"
rm -rf doc lib/libc lib/libcxx lib/libcxxabi lib/libunwind lib/libtsan lib/tsan lib/docs lib/fuzzer lib/init lib/ubsan_rt.zig 2>/dev/null || true
rm -f "$TAR"; rmdir "$TMP" 2>/dev/null || true
echo "env/zig ready: $("$HERE/zig/zig" version) ($(du -sh "$HERE/zig" | cut -f1))"
