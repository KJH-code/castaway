/* 실제로 브라우저에 띄워 오류 없이 뜨는지 본다.
   문법은 맞는데 실행하다 죽는 경우(undefined 참조, 셰이더 오류 등)를 잡는다.

   대상 목록과 브라우저 설정은 pages.mjs 에 있다 — probe.mjs 와 같이 쓴다.
   인자로 파일 이름을 주면 그것만 본다. mimic_arena.html 은 21MB 라
   기본 목록에서 빠져 있다(이름을 직접 대면 검사한다). */
import {PAGES, pageInfo, launch, open} from './pages.mjs';

const only = process.argv.slice(2);
const list = only.length ? only.map(pageInfo)
                         : PAGES.filter(p => p.f !== 'mimic_arena.html');

const browser = await launch();
let bad = 0;

for (const info of list) {
  const t0 = Date.now();
  const el = () => ((Date.now() - t0) / 1000).toFixed(1);
  let page = null;
  try {
    const r = await open(browser, info.f, info);
    page = r.page;
    // 몇 프레임 더 돌려 본다 — 첫 프레임에서만 나는 오류가 있다
    await page.waitForTimeout(3000);
    if (r.errs.length) throw new Error(r.errs.slice(0, 8).join('\n'));
    console.log(`✓ ${info.f} — ${el()}초`);
  } catch (e) {
    bad++;
    console.error(`✗ ${info.f} — ${el()}초`);
    console.error(String(e.message).split('\n').slice(0, 8).join('\n'));
  }
  if (page) await page.close();
}

await browser.close();
console.log(bad ? `\n구동 검사 실패 — ${bad}개` : '\n구동 검사 통과');
process.exit(bad ? 1 : 0);
