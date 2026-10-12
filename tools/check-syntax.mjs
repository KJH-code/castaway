/* 각 HTML 안의 인라인 스크립트를 뽑아 문법만 검사한다.
   브라우저를 띄우지 않으므로 몇 초면 끝나고, 오타 하나로 게임이 안 뜨는 일을 막는다. */
import {readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const files = process.argv.slice(2);
if (!files.length) { console.error('쓰임: node tools/check-syntax.mjs <파일…>'); process.exit(2); }

mkdirSync('.ci-tmp', {recursive: true});
let bad = 0;

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  // <script> … </script> 중 src 가 없는 것들. 그중 가장 긴 것이 본문이다.
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  if (!blocks.length) { console.log(`  ${f} — 인라인 스크립트 없음 (건너뜀)`); continue; }
  let n = 0;
  for (const [i, code] of blocks.entries()) {
    if (!code.trim()) continue;
    const tmp = `.ci-tmp/${f.replace(/[^\w.-]/g, '_')}.${i}.js`;
    writeFileSync(tmp, code);
    try {
      execFileSync(process.execPath, ['--check', tmp], {stdio: 'pipe'});
      n++;
    } catch (e) {
      bad++;
      console.error(`✗ ${f} — 스크립트 #${i} 문법 오류`);
      console.error(String(e.stderr || e.message).split('\n').slice(0, 12).join('\n'));
    }
  }
  if (n) console.log(`✓ ${f} — 스크립트 ${n}개 통과 (${(html.length / 1048576).toFixed(1)} MB)`);
}

rmSync('.ci-tmp', {recursive: true, force: true});
if (bad) { console.error(`\n문법 오류 ${bad}건`); process.exit(1); }
console.log('\n문법 검사 통과');
