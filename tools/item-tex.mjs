/* tools/item-tex.mjs — 손에 드는 것의 사진 결(ambientCG · CC0) → engine/js/data-item-textures.js(73-item-meshes.js 가 입힌다)
   쓰는 법:  node tools/item-tex.mjs <받은 묶음 폴더>
            폴더 안에 <id>/<id>_1K-JPG_Color.jpg · <id>_1K-JPG_NormalGL.jpg — ambientCG 의 '1K-JPG' zip 을 <id> 폴더에 푼 것
   받기:     curl -L -o p.zip "https://ambientcg.com/get?file=<id>_1K-JPG.zip" && unzip p.zip -d <폴더>/<id>
   macOS 의 sips 로 줄인다 — 빛깔 512 · 법선 256(가로 기준 · 세로는 비율대로) · JPEG 82. 평균 빛깔은 16×16 BMP 로 줄여 잰다(물들이는 결이 쓴다).
   결(KIND)은 아이템 모형의 재질이 고른다 — tools/item-mesh.mjs 의 TEX_OF(코드 모형 빛깔 → 결) · 설정 "tex".
   size = 사진 한 장이 덮는 길이 [가로 m, 세로 m] · rot = 1 이면 사진을 90° 돌려 붙인다(나뭇결 · 쇠 결이 가로로 찍힌 사진 — 자루 · 총열을 따라 +Y 로 서게) ·
   tint = 아이템 빛깔로 물들이는 세기 0..1(1 이면 빛깔 ÷ 평균 — 사진의 무늬만 남는다 · 0 이면 사진 빛깔 그대로) · shin/spec = 퐁 반들거림 · ns = 법선 세기. 사진은 모두 CC0(출처 표기 의무 없음 — 그래도 docs/notes/gameplay.md 에 적었다). */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'engine/js/data-item-textures.js');
const KIND = {
  wood:     { id: 'Wood049',    size: 0.35, rot: 1, shin: 10, spec: 0x0c0c0c, ns: 0.8 },
  stone:    { id: 'Rock058',    size: 0.15, rot: 0, shin: 6,  spec: 0x0a0a0a, ns: 1.0 },
  rope:     { id: 'Rope001',    size: 0.05, rot: 0, shin: 4,  spec: 0x060606, ns: 1.0 },
  steel:    { id: 'Metal009',   size: 0.25, rot: 1, shin: 50, spec: 0x5a5a5a, ns: 0.5, tint: 0.9 },
  gunmetal: { id: 'Metal046B',  size: 0.20, rot: 0, shin: 40, spec: 0x4a4a4a, ns: 0.6, tint: 0.7 },
  polymer:  { id: 'Plastic004', size: 0.15, rot: 0, shin: 14, spec: 0x1c1c1c, ns: 0.6, tint: 1 },   // 검은 Plastic006 은 7배로 밝히니 얼룩이 위장 무늬처럼 됐다
  olive:    { id: 'Plastic004', size: 0.15, rot: 0, shin: 12, spec: 0x161616, ns: 0.6, tint: 1 },
};

const src = process.argv[2];
if (!src || !fs.existsSync(src)) { console.error('쓰는 법: node tools/item-tex.mjs <받은 묶음 폴더>'); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'item-tex-'));
const sips = (...a) => execFileSync('sips', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const dims = f => { const o = sips('-g', 'pixelWidth', '-g', 'pixelHeight', f); return [+/pixelWidth: (\d+)/.exec(o)[1], +/pixelHeight: (\d+)/.exec(o)[1]]; };
function shrink(f, w, name) {                 // 가로 w 로(세로는 비율대로) → data URL
  const [W, H] = dims(f), h = Math.round(H * w / W), out = path.join(tmp, name + '.jpg');
  sips('-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-z', String(h), String(w), f, '--out', out);
  return { url: 'data:image/jpeg;base64,' + fs.readFileSync(out).toString('base64'), w, h, kb: fs.statSync(out).size / 1024 };
}
function mean(f, name) {                      // 16×16 BMP 로 줄여 평균 — [r, g, b] 0..1
  const out = path.join(tmp, name + '.bmp');
  sips('-s', 'format', 'bmp', '-z', '16', '16', f, '--out', out);
  const b = fs.readFileSync(out), off = b.readUInt32LE(10), w = b.readInt32LE(18), h = Math.abs(b.readInt32LE(22)), bpp = b.readUInt16LE(28) / 8;
  const stride = Math.ceil(w * bpp / 4) * 4, s = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = off + y * stride + x * bpp; s[0] += b[o + 2]; s[1] += b[o + 1]; s[2] += b[o]; }
  return s.map(v => +(v / (w * h * 255)).toFixed(4));
}

const out = {};
let kb = 0;
const seen = {};                              // 같은 사진을 여러 결이 쓰면 한 번만 줄인다
for (const [k, K] of Object.entries(KIND)) {
  const dir = path.join(src, K.id), col = path.join(dir, `${K.id}_1K-JPG_Color.jpg`), nrm = path.join(dir, `${K.id}_1K-JPG_NormalGL.jpg`);
  if (!fs.existsSync(col) || !fs.existsSync(nrm)) { console.error(`${k}: ${K.id} 의 Color · NormalGL 이 없다 — ${dir}`); process.exit(1); }
  const S = seen[K.id] || (seen[K.id] = { c: shrink(col, 512, k), n: shrink(nrm, 256, k + '_n'), m: mean(col, k) }), c = S.c, n = S.n, m = S.m;
  // 사진이 납작하면(1024×512) 세로가 덮는 길이도 그만큼 짧다
  out[k] = { id: K.id, src: 'ambientCG (CC0)', map: c.url, nrm: n.url, mean: m,
             size: [K.size, +(K.size * c.h / c.w).toFixed(4)], rot: K.rot, tint: K.tint || 0, shin: K.shin, spec: K.spec, ns: K.ns };
  kb += c.kb + n.kb;
  console.log(`${k.padEnd(9)} ${K.id.padEnd(11)} 빛깔 ${c.w}×${c.h} ${c.kb.toFixed(0)} KB · 법선 ${n.w}×${n.h} ${n.kb.toFixed(0)} KB · 평균 ${m.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(OUT, `/* data-item-textures.js — CASTAWAY · 자료(base64) — 읽지 말 것
   손에 드는 것의 사진 결 — ambientCG 의 CC0 재질 사진(${[...new Set(Object.values(KIND).map(K => K.id))].join(' · ')}) → tools/item-tex.mjs(sips 로 줄임) — 73-item-meshes.js 가 입힌다 */
const ITEM_TEX=${JSON.stringify(out)};
`);
console.log(`→ ${path.relative(ROOT, OUT)} · 사진 ${kb.toFixed(0)} KB · 파일 ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
