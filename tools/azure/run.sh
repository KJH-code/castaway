#!/bin/sh
# 애저 아포칼립스(Meshy) → 받침 뺌 · 20만 세모 · 돌+푸른 에너지로 다시 칠함 · 뼈 23 → GLB
# 사용: sh tools/azure/run.sh <Meshy zip> <작업 폴더> <나올 .glb>
# 필요: python3(numpy scipy scikit-image pillow pymeshlab — pymeshlab 은 libopengl0 가 있어야 줄이기 필터가 뜬다) · node + playwright
set -e
T=$(cd "$(dirname "$0")" && pwd); R=$(cd "$T/../.." && pwd)
ZIP=$(cd "$(dirname "$1")" && pwd)/$(basename "$1"); W=$2; OUT=$(cd "$(dirname "$3")" && pwd)/$(basename "$3")
PORT=${PORT:-8765}; export PORT
mkdir -p "$W"; cd "$W"
if [ ! -f orig.npz ]; then
  unzip -oq "$ZIP" -d src
  cp src/*/*_texture.png tex.png
  python3 "$T/fbx2obj.py" src/*/*_texture.fbx orig.npz      # ①
fi
python3 "$T/comps.py"                                         # ② 방향(Z 위 → Y 위) · 연결 성분
python3 "$T/vox.py"                                           # ③ 속 채우기(세 축 투표)
python3 "$T/rock.py" 8                                        # ④ 받침(얇게 닿은 곳을 끊고 받침판에서 이어진 두꺼운 덩이)
python3 "$T/cut2.py" 2 5000                                   #    받침 세모 · 받침 위 돌 · 남은 바위 날 빼기
python3 "$T/dec.py"                                           # ⑤ 20만 세모로(텍스처 지키며)
python3 "$T/decnpz.py"
python3 "$T/vox2.py"; python3 "$T/skel.py"                     # ⑥ 줄인 몸 속 채우기 · 골격선
python3 "$T/chain.py"                                         # ⑦ 사슬
python3 "$T/halo.py"                                          # ⑧ 머리 위 고리(원 RANSAC)
python3 "$T/rig.py"                                           # ⑨ 뼈마다 몸속 거리
python3 "$T/weights.py" 4                                     # ⑩ 가중치 · 떼어 낼 세모
python3 "$T/attr.py"                                          # ⑪ 부위 표시 → UV 에 굽기
cp "$R/engine/three.min.js" "$T/bake.html" .
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & SV=$!
sleep 1; node "$T/bake.mjs" "m=d_&a=attr.bin&s=2048" regions.png; kill $SV
python3 "$T/recolor.py"                                       # ⑫ 다시 칠하기(바탕 · 발광)
python3 "$T/export.py" "$OUT" 2.2                             # ⑬ GLB(키 약 3 m)
