/* 게임을 실제로 띄워 값을 재 온다.

   확인할 때마다 Playwright 스크립트를 새로 짜는 대신 이걸 쓴다.
   화면을 눈으로 볼 필요가 없는 확인(수치가 맞나, 함수가 도나)은 전부 여기로.

     node tools/probe.mjs island_world.html PL.hp INV.slots.length
     node tools/probe.mjs island_world.html --do "PL.food=0" --tick 3 PL.hp
     node tools/probe.mjs island_world.html --run tools/x.js
     node tools/probe.mjs mimic_arena.html --shot /tmp/m.png MB.hp

   --do   <js>      값을 재기 전에 페이지 안에서 실행한다. 여러 번 줄 수 있다.
   --tick <초>      그만큼 게임을 더 돌린다 (--do 뒤에 두면 반응을 본다).
   --run  <파일>    파일 내용을 페이지 안에서 실행하고 돌려준 값을 찍는다.
                    표현식 대신 쓴다 — 여러 단계를 재야 할 때.
   --shot <경로>    화면을 찍는다. 눈으로 봐야 할 때만.
   --keep           오류가 나도 0 으로 끝낸다 (재보는 게 목적일 때).

   표현식은 페이지의 전역에서 그대로 평가된다. 던지면 '오류: …' 로 찍고 넘어간다.

   주의 — 헤드리스(swiftshader)는 실시간의 1/20 쯤으로 돈다. --tick 4 를 줘도
   게임 안에서는 0.2초쯤밖에 안 지난다. 시간이 걸리는 변화를 보려면 기다리지 말고
   함수를 직접 부를 것: --do "hurtPL(40,'시험')" 이 --tick 으로 굶기는 것보다 낫다. */
import {readFileSync} from 'node:fs';
import {launch, open, pageInfo} from './pages.mjs';

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('쓰는 법: node tools/probe.mjs <파일.html> [--do js] [--tick 초] [--run 파일] [--shot 경로] <표현식...>');
  process.exit(2);
}

const file = argv.shift();
const dos = [], exprs = [];
let tick = 0, runFile = null, shot = null, keep = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--do')        dos.push(argv[++i]);
  else if (a === '--tick') tick = Number(argv[++i]);
  else if (a === '--run')  runFile = argv[++i];
  else if (a === '--shot') shot = argv[++i];
  else if (a === '--keep') keep = true;
  else exprs.push(a);
}

/* 재 온 값을 한 줄로 보기 좋게. 큰 배열·객체는 잘라서 찍는다 —
   통째로 찍으면 읽는 쪽(사람이든 모델이든)이 압사한다. */
const show = v => {
  if (v === undefined) return 'undefined';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  if (typeof v !== 'object' || v === null) return JSON.stringify(v);
  const s = JSON.stringify(v);
  return s.length > 600 ? s.slice(0, 600) + ` … (${s.length}자)` : s;
};

const browser = await launch();
let bad = 0;
try {
  const t0 = Date.now();
  const {page, errs} = await open(browser, file, pageInfo(file));
  console.log(`■ ${file} — ${((Date.now() - t0) / 1000).toFixed(1)}초에 준비됨`);

  for (const d of dos) {
    try { await page.evaluate(d); } catch (e) { console.log(`오류 (--do ${d}): ${e.message}`); bad++; }
  }
  if (tick > 0) await page.waitForTimeout(tick * 1000);

  for (const e of exprs) {
    let out;
    try { out = show(await page.evaluate(`(${e})`)); }
    catch (err) { out = '오류: ' + String(err.message).split('\n')[0]; bad++; }
    console.log(`  ${e} = ${out}`);
  }

  if (runFile) {
    const src = readFileSync(runFile, 'utf8');
    try {
      const r = await page.evaluate(`(async () => { ${src} })()`);
      if (r !== undefined) console.log(typeof r === 'string' ? r : show(r));
    } catch (err) { console.log('오류 (--run): ' + err.message); bad++; }
  }

  if (shot) { await page.screenshot({path: shot}); console.log(`  사진 → ${shot}`); }

  if (errs.length) {
    console.log('페이지 오류:');
    for (const x of errs.slice(0, 8)) console.log('  ' + x);
    bad++;
  }
} catch (e) {
  console.error('열지 못했다: ' + String(e.message).split('\n')[0]);
  bad++;
} finally {
  await browser.close();
}
process.exit(keep ? 0 : (bad ? 1 : 0));
