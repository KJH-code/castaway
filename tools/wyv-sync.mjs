/* 애쉬스케일 자세 구역을 다른 시험장에 그대로 옮긴다.

     node tools/wyv-sync.mjs

   원본은 beta/wyvern_arena.html 의 '자세' 구역이다 — `/* ── 자세 ──` 로 시작해
   `/* 사슬 하나가 어떤 점에 닿았는가` 바로 앞까지(poseWyv · resolveHit · poseWyv_ 와 그 도우미).
   battle · night · siege 시험장에 글자 그대로 들어 있다. 거기서 고치지 말고 원본을 고친 뒤 이걸 돌릴 것.
   여럿이 서는 판(battle · night)은 useWyv(w) 가 W · BONE 을 갈아 끼우므로, 개체마다 남는 값은
   W.an 에만 둔다(이 구역 안에서 전역 상태를 새로 만들지 말 것). */
import {readFileSync, writeFileSync} from 'node:fs';

const SRC = 'beta/wyvern_arena.html';
const TARGETS = ['battle', 'night', 'siege'].map(n => `beta/${n}_arena.html`);
const B0 = '/* ── 자세 ─', B1 = '/* 사슬 하나가 어떤 점에 닿았는가';

const cut = (t, f) => {
  const a = t.indexOf(B0), b = t.indexOf(B1, a);
  if (a < 0 || b < 0) throw new Error(f + ' 에 자세 구역이 없다');
  return {a, b};
};
const src = readFileSync(SRC, 'utf8');
const s = cut(src, SRC), blk = src.slice(s.a, s.b);
for (const f of TARGETS) {
  const t = readFileSync(f, 'utf8'), c = cut(t, f);
  if (t.slice(c.a, c.b) === blk) { console.log(`  ${f} — 같다`); continue; }
  writeFileSync(f, t.slice(0, c.a) + blk + t.slice(c.b));
  console.log(`  ${f} — 바꿔 끼움 (${blk.split('\n').length}줄)`);
}
