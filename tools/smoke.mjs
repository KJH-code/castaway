/* 실제로 브라우저에 띄워 오류 없이 뜨는지 본다.
   문법은 맞는데 실행하다 죽는 경우(undefined 참조, 셰이더 오류 등)를 잡는다.

   three.js 는 CDN 에서 받게 되어 있지만, 검사는 네트워크에 기대면 안 된다 —
   CDN 요청을 가로채 node_modules 의 같은 판(r128)으로 돌려준다. */
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

const THREE_JS = readFileSync(
  resolve('node_modules/three/build/three.min.js'), 'utf8');

/* 파일마다 '다 떴다'고 볼 조건이 다르다.
   본 게임은 세계 생성이 끝나야(busy=false), 아레나는 모델을 읽어야 끝이다.
   전역이 let 으로 선언돼 있어 스크립트가 죽으면 typeof 조차 던진다 — try 로 감싼다. */
const PAGES = [
  {f: 'island_world.html',  ready: 'busy === false',                      ms: 300000},
  {f: 'build_sandbox.html', ready: 'busy === false',                      ms: 300000},
  {f: 'bear_arena.html',    ready: '!!bMesh',                             ms: 180000},
  {f: 'gargoyle_arena.html',ready: '!!gMesh',                             ms: 240000},
  {f: 'mixed_arena.html',   ready: '!!bMesh && GS.every(g => g.mesh)',    ms: 300000},
];

const only = process.argv.slice(2);
const list = only.length ? PAGES.filter(p => only.includes(p.f)) : PAGES;

const browser = await chromium.launch({
  // CHROMIUM_PATH 를 주면 그 실행 파일을 쓴다 (내려받은 브라우저가 없는 곳에서 쓸 길)
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});
let bad = 0;

for (const {f, ready, ms} of list) {
  const page = await browser.newPage({viewport: {width: 900, height: 600}});
  await page.route('**/three*.js', r =>
    r.fulfill({status: 200, contentType: 'application/javascript', body: THREE_JS}));
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  const t0 = Date.now();
  try {
    await page.goto(pathToFileURL(resolve(f)).href, {timeout: ms, waitUntil: 'load'});
    await page.waitForFunction(
      `(() => { try { return ${ready}; } catch (e) { return false; } })()`,
      null, {timeout: ms, polling: 500});
    // 몇 프레임 더 돌려 본다 — 첫 프레임에서만 나는 오류가 있다
    await page.waitForTimeout(3000);
    if (errs.length) throw new Error(errs.join('\n'));
    console.log(`✓ ${f} — ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  } catch (e) {
    bad++;
    console.error(`✗ ${f} — ${((Date.now() - t0) / 1000).toFixed(1)}초`);
    console.error(String(e.message).split('\n').slice(0, 6).join('\n'));
    if (errs.length) console.error(errs.slice(0, 8).join('\n'));
  }
  await page.close();
}

await browser.close();
if (bad) { console.error(`\n${bad}개 파일이 오류 없이 뜨지 못했다`); process.exit(1); }
console.log('\n구동 검사 통과');
