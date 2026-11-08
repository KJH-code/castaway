/* tools/animals/stl2mesh.mjs — 짐승 STL(Meshy) → 줄인 메시(작업 폴더의 <이름>.bin · 축은 그대로)
   쓰는 법: node tools/animals/stl2mesh.mjs <작업 폴더> meshes/organic/*.stl
   · 6천 세모로 줄인다(뼈 심기 · 무게 재기용 — 게임에 들어가는 것은 rig.py 가 다시 줄인 것) — QEM(tools/qem.mjs) · 구멍 없이
   · <이름>.bin = [nv u32][nt u32][P f32 nv×3][I u32 nt×3] */
import fs from 'fs';
import path from 'path';
import { decimate, readSTL } from '../qem.mjs';
const [dir, ...files] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
for (const p of files) {
  const name = path.basename(p, '.stl'), t0 = Date.now(), M = readSTL(p);
  const T = [['hi', 6000], ['mid', 2400], ['lo', 700]], S = decimate(M.P, M.I, T);
  for (const [l] of T) {
    const s = S[l], nv = s.P.length / 3, nt = s.I.length / 3, b = Buffer.alloc(8 + nv * 12 + nt * 12);
    b.writeUInt32LE(nv, 0); b.writeUInt32LE(nt, 4);
    Buffer.from(Float32Array.from(s.P).buffer).copy(b, 8); Buffer.from(Uint32Array.from(s.I).buffer).copy(b, 8 + nv * 12);
    fs.writeFileSync(path.join(dir, `${name}_${l}.bin`), b);
  }
  console.log(name, M.I.length / 3, '→', T.map(([l]) => S[l].I.length / 3).join('/'), ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
