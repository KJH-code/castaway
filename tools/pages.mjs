/* 검사 대상 목록과 브라우저를 띄우는 공통부.
   smoke.mjs(오류 없이 뜨는가)와 probe.mjs(값을 재 온다)가 같이 쓴다.

   three.js 는 CDN 에서 받게 되어 있지만 검사는 네트워크에 기대면 안 된다 —
   CDN 요청을 가로채 node_modules 의 같은 판(r128)으로 돌려준다. */
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';

export const THREE_JS = readFileSync(
  resolve('node_modules/three/build/three.min.js'), 'utf8');

/* 파일마다 '다 떴다'고 볼 조건이 다르다.
   본 게임은 세계 생성이 끝나야(busy=false), 아레나는 모델을 읽어야 끝이다.
   전역이 let 으로 선언돼 있어 스크립트가 죽으면 typeof 조차 던진다 — try 로 감싼다.

   mimic_arena.html 은 21MB 라 여기 없다. probe 로는 이름을 직접 대면 열린다. */
export const PAGES = [
  {f: 'island_world.html',  ready: 'busy === false',                      ms: 300000},
  {f: 'build_sandbox.html', ready: 'busy === false',                      ms: 300000},
  {f: 'bear_arena.html',    ready: '!!bMesh',                             ms: 180000},
  {f: 'gargoyle_arena.html',ready: '!!gMesh',                             ms: 240000},
  {f: 'mixed_arena.html',   ready: '!!bMesh && GS.every(g => g.mesh)',    ms: 300000},
  {f: 'mimic_arena.html',   ready: '!!bMesh',                             ms: 420000},
];

export const pageInfo = f =>
  PAGES.find(p => p.f === f) || {f, ready: 'true', ms: 300000};

export const launch = () => chromium.launch({
  // CHROMIUM_PATH 를 주면 그 실행 파일을 쓴다 (내려받은 브라우저가 없는 곳에서 쓸 길)
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
});

/* 페이지를 열고 준비될 때까지 기다린다. 잡아둔 오류 배열을 함께 돌려준다. */
export async function open(browser, f, {ready, ms} = pageInfo(f)) {
  const page = await browser.newPage({viewport: {width: 900, height: 600}});
  await page.route('**/three*.js', r =>
    r.fulfill({status: 200, contentType: 'application/javascript', body: THREE_JS}));
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 200));
  });
  await page.goto(pathToFileURL(resolve(f)).href, {timeout: ms, waitUntil: 'load'});
  await page.waitForFunction(
    `(() => { try { return ${ready}; } catch (e) { return false; } })()`,
    null, {timeout: ms, polling: 500});
  return {page, errs};
}
