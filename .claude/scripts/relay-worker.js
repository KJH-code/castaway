#!/usr/bin/env node
'use strict';
/**
 * kjh-lyj 플러그인: relay 워커 실행기 — 워커(Agent) 대신, 같은 워커의 모델 · 노력으로 "도구 없는 채팅"에
 * 필요한 파일만 담아 보내고, 답(RELAY 블록)을 이 스크립트가 적용 · 테스트 · 커밋한다.
 * 같은 모델 · 노력으로 Claude Code 워커보다 토큰이 절반쯤(벤치 24과제: 성공률 같음 · 비용 41% 적게).
 *
 *   node scripts/relay-worker.js --worker w-implement --test "npm test" --spec 지시서.md
 *     [--post-apply "node tools/build.js"]...  적용 직후 · 테스트 전에 돌릴 명령(다시 만드는 파일)
 *     [--quick-test "node --test test/a.test.js"]  먼저 돌릴 빠른 테스트
 *     [--files src/a.js,src/b.js]               처음 요청에 내용째 담을 파일(없으면 지시서에 적힌 경로)
 *     [--rounds 6]                              최대 메시지 수
 *     [--route auto|relay]                      auto(기본): 판단기가 Claude Code 가 낫다고 하면 아무것도 안 하고 종료 코드 3
 *     [--claude 경로] [--python 경로] [--dry-route] (판단만 출력)
 *
 * 종료 코드: 0 끝남(적용 · 테스트 통과 · 커밋) · 1 못 끝냄(보고에 까닭 — 메인은 같은 워커를 Agent 로 불러 이어서) ·
 *            2 잘못 부름 · 3 판단기가 Claude Code 를 고름(Agent 로 부르면 됨)
 * 작업 폴더 = 현재 폴더(git 저장소). 지금 브랜치에 커밋한다(push 안 함). .relay/ 는 .git/info/exclude 에 들어간다.
 * 필요: Node 18+, Python 3.11+, claude CLI.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const route = require('./route');

const ROOT = path.join(__dirname, '..');
const RELAY_SRC = path.join(ROOT, 'relay');
const SYSTEM = 'You are Claude, a helpful AI assistant made by Anthropic, chatting with a user. You cannot run code or read files beyond what the user pastes. Follow the reply format the user asks for exactly.';

function args(argv) {
  const o = { postApply: [], route: 'auto', rounds: 6, files: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const k = argv[i]; const v = argv[i + 1];
    const take = () => { i += 1; return v; };
    if (k === '--worker') o.worker = take();
    else if (k === '--test') o.test = take();
    else if (k === '--quick-test') o.quickTest = take();
    else if (k === '--post-apply') o.postApply.push(take());
    else if (k === '--spec') o.spec = take();
    else if (k === '--files') o.files = String(take() || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--rounds') o.rounds = Math.max(1, Math.min(12, Number(take()) || 6));
    else if (k === '--route') o.route = take();
    else if (k === '--claude') o.claude = take();
    else if (k === '--python') o.python = take();
    else if (k === '--dry-route') o.dryRoute = true;
    else if (k === '-h' || k === '--help') o.help = true;
  }
  return o;
}

function die(msg, code = 2) { process.stderr.write(`relay-worker: ${msg}\n`); process.exit(code); }
const run = (cmd, argv, opt = {}) => spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opt });
const git = (cwd, ...a) => (run('git', a, { cwd }).stdout || '').trim();

/** 워커 파일(agents/<이름>.md) 머리말의 model · effort */
function workerMeta(name) {
  const f = path.join(ROOT, 'agents', `${name}.md`);
  if (!fs.existsSync(f)) die(`워커 ${name} 를 찾지 못했어요(agents/${name}.md)`);
  const head = (fs.readFileSync(f, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const get = (k) => ((head.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1] || '').trim();
  return { model: get('model'), effort: get('effort') };
}

function findPython(given) {
  const cands = given ? [[given]] : [['python3'], ['python'], ['py', '-3']];
  for (const [cmd, ...pre] of cands) {
    const r = run(cmd, [...pre, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])']);
    if (r.status === 0) {
      const [maj, min] = r.stdout.trim().split('.').map(Number);
      if (maj > 3 || (maj === 3 && min >= 11)) return { cmd, pre };
    }
  }
  return die('Python 3.11 이상이 필요해요(relay). python.org 에서 설치하거나 --python 으로 경로를 주세요.');
}

/** 지시에 적힌, 저장소에 실제로 있는 파일 */
function mentionedFiles(text, root, max = 8) {
  const out = [];
  const re = /(?:^|[\s`'"(\[])((?:[\w@.-]+\/)*[\w@.-]+\.[A-Za-z0-9]{1,8})(?=$|[\s`'"),:;\]])/g;
  let m;
  while ((m = re.exec(String(text || ''))) && out.length < max) {
    const p = m[1].replace(/^\.\//, '');
    if (p.startsWith('/') || p.split('/').includes('..') || out.includes(p)) continue;
    try { if (fs.statSync(path.join(root, p)).isFile()) out.push(p); } catch (_) { /* 없음 */ }
  }
  return out;
}

function repoSize(root) {
  const CODE = /\.(js|mjs|cjs|jsx|ts|tsx|py|go|rs|java|kt|kts|rb|php|cs|c|cc|cpp|h|hpp|swift|scala|vue|svelte|lua|sh|sql)$/i;
  const list = (run('git', ['ls-files', '-z'], { cwd: root }).stdout || '').split('\0').filter((p) => CODE.test(p));
  let chars = 0;
  for (const p of list.slice(0, 5000)) { try { chars += fs.statSync(path.join(root, p)).size; } catch (_) { /* 지워짐 */ } }
  return { codeFiles: list.length, codeChars: chars };
}

// relay 출력 읽기(위임 매니저 relay.js 와 같은 규칙)
function parseNotes(out) {
  const res = []; const lines = String(out || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] !== 'NOTE:') continue;
    const body = [];
    for (let k = i + 1; k < lines.length && !/^(NOTE:|Applied:|Committed |Fuzzy-matched|Merged |Nothing to commit|Applied without|The reply asks for more files|Next step)/.test(lines[k]); k += 1) body.push(lines[k]);
    res.push(body.join('\n').trim());
  }
  return res.filter(Boolean).join('\n');
}
function parseNeeds(out) {
  const lines = String(out || '').split(/\r?\n/);
  const i = lines.findIndex((l) => /asks for more files/i.test(l));
  if (i < 0) return [];
  const res = [];
  for (let k = i + 1; k < lines.length && !/^Next step/i.test(lines[k]); k += 1) if (lines[k].trim()) res.push(lines[k].trim());
  return res;
}
function saysMoreLeft(note) {
  const t = String(note || '');
  if (!t) return false;
  if (/nothing (is )?(left|remaining|more)|no (more )?(work|steps?|parts?|changes?) (left|remaining|needed)|(all|everything) (is )?done|남은 (것|일|작업|부분)(은|이)? ?없|다 (끝|했)|완료(했|됐)/i.test(t)) return false;
  return /\b((still )?left to (do|implement|change|add)|still (need|needs|to do)|remaining (work|steps?|parts?|tasks?|items?|changes?)|what remains|to do next|next (part|step)|part \d+\s*(\/|of)\s*\d+|todo:)|남은 (것|일|작업|부분)|남았|다음 (단계|부분|차례)|이어서 (할|하겠|진행|작업)/i.test(t);
}

/** .relay/config.toml 에 이번 실행의 테스트 · 적용 직후 명령을 적는다(다른 설정은 그대로) */
function configure(root, o) {
  const p = path.join(root, '.relay', 'config.toml');
  let cfg = fs.readFileSync(p, 'utf8');
  const set = (re, line) => { cfg = re.test(cfg) ? cfg.replace(re, line) : cfg; };
  set(/^test = .*$/m, `test = ${JSON.stringify(o.test || '')}`);
  set(/^test_quick = .*$/m, `test_quick = ${JSON.stringify(o.quickTest || '')}`);
  set(/^post_apply = .*$/m, `post_apply = [${o.postApply.map((c) => JSON.stringify(c)).join(', ')}]`);
  set(/^auto_branch = .*$/m, 'auto_branch = false');
  fs.writeFileSync(p, cfg);
}

function main() {
  const o = args(process.argv);
  if (o.help || !o.worker) {
    process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 20).join('\n').replace(/^ \* ?/gm, '') + '\n');
    process.exit(o.help ? 0 : 2);
  }
  const cwd = process.cwd();
  const root = git(cwd, 'rev-parse', '--show-toplevel');
  if (!root) die('git 저장소 안에서 실행하세요');
  const spec = (o.spec ? fs.readFileSync(o.spec, 'utf8') : fs.readFileSync(0, 'utf8')).trim();
  if (!spec) die('지시서가 비어 있어요(--spec 파일 또는 표준 입력)');
  const meta = workerMeta(o.worker);
  const files = o.files.length ? o.files : mentionedFiles(spec, root);

  // 1) Claude Code 로 할 일인지
  const d = route.decide({
    instruction: spec, worker: o.worker, files, requestMode: o.route === 'relay' ? 'relay' : '',
    repo: { hasTest: !!String(o.test || '').trim(), postApply: o.postApply.join(' '), ...repoSize(root) },
  });
  process.stdout.write(`ROUTE ${d.mode}: ${d.reason}\n`);
  if (o.dryRoute) process.exit(d.mode === 'relay' ? 0 : 3);
  if (d.mode !== 'relay') process.exit(3);

  // 2) relay 준비
  const py = findPython(o.python);
  const env = { ...process.env, PYTHONPATH: RELAY_SRC, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', RELAY_NODE: process.execPath };
  const relay = (argv, input) => {
    const r = run(py.cmd, [...py.pre, '-m', 'relay', '--repo', root, ...argv], { cwd: root, input: input || '', env, timeout: 20 * 60000 });
    return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
  };
  if (!fs.existsSync(path.join(root, '.relay', 'config.toml'))) {
    const r = relay(['init']);
    if (r.code !== 0) die(`relay init 실패: ${r.stderr.slice(-400)}`, 1);
  }
  configure(root, o);
  const claude = o.claude && /[\\/]/.test(o.claude) ? path.resolve(cwd, o.claude) : (o.claude || 'claude'); // 경로면 절대 경로로(채팅은 빈 폴더에서 돈다)
  const help = run(claude, ['--help']).stdout || '';
  const has = (f) => new RegExp(`(^|\\s)${f}(\\s|,|=|$)`, 'm').test(help);
  const base = ['-p', '--output-format', 'json', '--tools', ''];
  if (meta.model && has('--model')) base.push('--model', meta.model);
  if (meta.effort && has('--effort')) base.push('--effort', meta.effort);
  if (has('--system-prompt')) base.push('--system-prompt', SYSTEM);
  if (has('--strict-mcp-config')) base.push('--strict-mcp-config');
  const chatDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kjh-relay-')); // 저장소 CLAUDE.md 를 안 읽게 빈 폴더에서
  // 이 플러그인의 모드 질문 훅이 relay 채팅에 끼지 않게(ORCHESTRATE_ASK_MODE=0)
  const chatEnv = { ...process.env, ORCHESTRATE_ASK_MODE: '0' };
  const startHead = git(root, 'rev-parse', 'HEAD');
  const dirty = () => git(root, 'status', '--porcelain', '--untracked-files=all', '--', '.', ':!.relay');
  const dirtyAtStart = !!dirty();

  const st = { msgs: 0, cost: 0, sent: 0, recv: 0, applied: false, last: '', notes: [] };
  let session = '';
  const ask = (text) => {
    st.msgs += 1; st.sent += text.length;
    const r = run(claude, [...base, ...(session ? ['--resume', session] : [])], { cwd: chatDir, input: text, env: chatEnv, timeout: 60 * 60000 });
    let j = null;
    try { j = JSON.parse(r.stdout); } catch (_) { /* 아래 */ }
    if (!j) return { error: `claude 실패(${r.status}): ${(r.stderr || r.stdout || '').slice(-300)}` };
    if (typeof j.total_cost_usd === 'number') st.cost += j.total_cost_usd;
    if (j.session_id) session = j.session_id;
    if (j.is_error) return { error: `claude 오류: ${String(j.result || j.subtype).slice(0, 300)}` };
    st.recv += String(j.result || '').length;
    return { text: String(j.result || '') };
  };

  const firstTask = `## 워커: ${o.worker} (${meta.model} ${meta.effort})\n${spec}`;
  let req = relay(['pack', '--out', 'stdout', ...(files.length ? ['--files', ...files] : [])], firstTask);
  if (req.code !== 0) die(`relay pack 실패: ${req.stderr.slice(-400)}`, 1);
  let request = req.stdout;
  let done = false; let reason = '';
  const cont = (msg, extra = []) => relay(['pack', '--out', 'stdout', '--cont', ...extra], `이전 요청(워커 ${o.worker}):\n${spec.slice(0, 1500)}\n\n${msg}`).stdout;
  for (let round = 1; round <= o.rounds; round += 1) {
    const a = ask(request);
    if (a.error) { reason = a.error; break; }
    const r = relay(['apply', '--from', '-'], a.text || '(빈 답)');
    const notes = parseNotes(r.stdout);
    if (notes) st.notes.push(notes);
    if (r.code === 0) {
      if (/^(Applied:|Committed )/m.test(r.stdout)) st.applied = true;
      const needs = /asks for more files/i.test(r.stdout) ? parseNeeds(r.stdout) : [];
      if (needs.length) { request = cont(`요청한 파일을 첨부했어요. 이어서 진행해 주세요.${notes ? `\n(당신의 메모: ${notes.slice(0, 800)})` : ''}`, ['--files', ...needs]); continue; }
      if (st.applied && saysMoreLeft(notes)) { request = cont('지금까지 적용했어요(테스트 통과). NOTE 에 적은 남은 부분을 이어서 해 주세요.'); continue; }
      if (st.applied) { done = true; break; }
      request = cont('답에 적용할 파일 작업이 없었어요. 지시서대로 바꿀 내용을 RELAY 블록(EDIT · FILE · SYMBOL)으로 보내 주세요. 할 수 없다면 까닭만 NOTE 로.');
      reason = `설명만 왔어요: ${notes.slice(0, 300)}`;
      continue;
    }
    if (r.code === 2) {
      let repair = '';
      try { repair = fs.readFileSync(path.join(root, '.relay', 'clipboard.txt'), 'utf8'); } catch (_) { /* 없음 */ }
      request = /could not be parsed/.test(repair) ? repair : 'Your previous reply could not be parsed. Re-send the complete reply as ONE fenced code block following the RELAY grammar exactly.';
      reason = '답 형식을 읽지 못했어요';
      continue;
    }
    st.last = (r.stderr || r.stdout).slice(-1500);
    if (r.code === 4) { request = cont('적용 후 테스트가 실패했어요(변경은 적용된 채로 있어요). <last_failure> 의 원인을 고쳐 주세요.'); reason = '테스트가 계속 실패했어요'; continue; }
    if (r.code === 5) { request = cont('답의 편집 하나가 파일과 맞지 않았어요. <last_failure> 를 보고 그 파일의 블록만 다시 보내 주세요.'); reason = '편집이 파일과 맞지 않았어요'; continue; }
    reason = `relay 종료 코드 ${r.code}: ${st.last.slice(-300)}`;
    break;
  }
  fs.rmSync(chatDir, { recursive: true, force: true });
  // 끝내 못 고쳤는데 테스트를 못 넘긴 변경이 커밋 안 된 채 남아 있으면 되돌린다(메인 브랜치를 깨진 채로 두지 않게)
  // 시작 때 깨끗했던 폴더만 치운다(사람이 하던 변경은 건드리지 않음) — 버리지 않고 stash 로(git stash list 에서 꺼낼 수 있음)
  let undone = '';
  if (!done && dirty()) {
    if (dirtyAtStart) undone = '시작 때부터 커밋 안 된 변경이 있어서, 테스트를 못 넘긴 변경도 그대로 두었어요 — git status 로 확인하세요.';
    else {
      const msg = `kjh-lyj relay-worker ${o.worker}: 테스트를 못 넘긴 변경`;
      const r = run('git', ['stash', 'push', '--include-untracked', '-m', msg], { cwd: root });
      undone = r.status === 0 ? `테스트를 못 넘긴 변경은 stash 로 치웠어요("${msg}" — git stash list).` : `변경을 치우지 못했어요 — git status 로 확인하세요: ${(r.stderr || '').slice(-200)}`;
    }
  }
  const commits = git(root, 'log', '--oneline', `${startHead}..HEAD`);
  const out = [
    `RESULT ${done ? 'done' : 'failed'}${done ? '' : ` — ${reason || `메시지 ${o.rounds}개 안에 끝내지 못했어요`}`}`,
    `워커 ${o.worker}(${meta.model} ${meta.effort}) · relay · 메시지 ${st.msgs}개 · 보냄 ${st.sent.toLocaleString()}자 · 받음 ${st.recv.toLocaleString()}자 · 비용 $${st.cost.toFixed(4)}`,
    '--- 커밋 ---', commits || '(없음)',
    '--- 워커 메모 ---', st.notes.join('\n').trim() || '(없음)',
    ...(done ? [] : ['--- 마지막 실패 ---', st.last.trim() || '(없음)', ...(undone ? [undone] : []),
      '메인에게: 같은 워커를 Agent 로 불러 이어서 하게 하세요(위 커밋은 이미 이 브랜치에 있어요). 지시서에 이 보고를 붙이세요.']),
  ];
  process.stdout.write(`${out.join('\n')}\n`);
  process.exit(done ? 0 : 1);
}

main();
