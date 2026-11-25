#!/usr/bin/env node
'use strict';
/**
 * kjh-lyj 플러그인: Claude Code 코드 모드 켜기 · 끄기 · 점검
 *
 * 코드 모드 = Claude Code(2.1.323 이상)의 실험 기능. 도구를 하나씩 부르는 대신 JavaScript 로 여러 도구 호출을
 * 한 번에 이어 실행해서 더 빠르고 맥락(토큰)을 덜 쓴다. 환경 변수 CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1.
 * 메인 세션에서 켜면 워커(서브에이전트)도 같은 프로세스라 같이 켜진다.
 *
 *   node scripts/code-mode.js status              지금 상태(사용자 · 프로젝트 · 로컬 settings 와 실행 환경)
 *   node scripts/code-mode.js check               이 PC 의 Claude Code 로 점검(Haiku 로 몇 번 · 1~2센트):
 *                                                 ① 코드 모드가 정말 켜지는지 ② 켜져도 훅이 도구 호출마다 걸리는지
 *   node scripts/code-mode.js on  [--scope user|project|local] [--force]   settings.json 의 env 에 넣기(백업 남김)
 *   node scripts/code-mode.js off [--scope user|project|local]             빼기
 *
 * 왜 점검이 먼저인가: 이 플러그인의 모델 계층 강제 훅(PreToolUse: Agent|Task)이 코드 모드로 이어 실행된 호출에도
 * 걸려야 워커 모델 · 노력 고정이 지켜진다. check 가 "훅이 빠짐"을 보면 on 은 거부한다(--force 로만).
 * 켜거나 끈 뒤에는 Claude Code 를 다시 켜야 적용된다.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const KEY = 'CLAUDE_CODE_EXPERIMENTAL_CODE_MODE';
const MIN = [2, 1, 323];
const STATE = path.join(os.homedir(), '.kjh-lyj-code-mode-check.json'); // 마지막 점검 결과

function args(argv) {
  const o = { cmd: argv[2] || 'status', scope: 'user', force: false, claude: 'claude' };
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === '--scope') { o.scope = argv[i + 1]; i += 1; } else if (argv[i] === '--force') o.force = true;
    else if (argv[i] === '--claude') { o.claude = argv[i + 1]; i += 1; }
  }
  return o;
}

function settingsFile(scope, cwd = process.cwd()) {
  if (scope === 'project') return path.join(cwd, '.claude', 'settings.json');
  if (scope === 'local') return path.join(cwd, '.claude', 'settings.local.json');
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { throw new Error(`${file} 을 읽을 수 없어요(JSON 형식 오류) — 직접 고친 뒤 다시 하세요.`); }
}

/** env 에 KEY 를 넣거나(1) 뺀다. 다른 키 · 다른 env 는 그대로. 바꾸기 전 백업 */
function setMode(file, on) {
  const cfg = readJson(file);
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-kjh-lyj-${Date.now()}`);
  cfg.env = cfg.env && typeof cfg.env === 'object' ? cfg.env : {};
  if (on) cfg.env[KEY] = '1'; else delete cfg.env[KEY];
  if (!Object.keys(cfg.env).length) delete cfg.env;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
}

function valueIn(file) {
  try { const c = readJson(file); return c.env && c.env[KEY] !== undefined ? String(c.env[KEY]) : null; } catch (_) { return 'error'; }
}

function version(claude) {
  const r = spawnSync(claude, ['--version'], { encoding: 'utf8' });
  const m = String(r.stdout || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1).map(Number) : null;
}
const atLeast = (v, min) => !!v && (v[0] - min[0] || v[1] - min[1] || v[2] - min[2]) >= 0;

function status(o) {
  const v = version(o.claude);
  const lines = [`Claude Code ${v ? v.join('.') : '(찾지 못함)'}${v && !atLeast(v, MIN) ? ` — 코드 모드는 ${MIN.join('.')} 이상에서만(지금 판은 이 변수를 무시)` : ''}`];
  for (const s of ['user', 'project', 'local']) {
    const val = valueIn(settingsFile(s));
    lines.push(`${s.padEnd(7)} ${settingsFile(s)} : ${val === null ? '(없음)' : val === '1' ? '켜짐' : val === 'error' ? 'JSON 오류' : `꺼짐(${val})`}`);
  }
  lines.push(`실행 환경 변수: ${process.env[KEY] === undefined ? '(없음)' : process.env[KEY]}`);
  try { const c = JSON.parse(fs.readFileSync(STATE, 'utf8')); lines.push(`마지막 점검(${c.at}): ${c.verdict} — ${c.detail}`); } catch (_) { lines.push('마지막 점검: 없음 — 켜기 전에 check 를 먼저 돌리세요'); }
  return lines.join('\n');
}

/** claude -p 한 번(stream-json) → { tools(init), toolUses, cost } */
function probe(o, mode, cwd, settings, prompt) {
  const r = spawnSync(o.claude, ['-p', '--model', 'haiku', '--output-format', 'stream-json', '--verbose', '--strict-mcp-config',
    '--settings', settings, '--allowedTools', 'Read', 'Glob', '--permission-mode', 'acceptEdits', prompt], {
    cwd, encoding: 'utf8', input: '', timeout: 5 * 60000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, [KEY]: mode, ORCHESTRATE_ASK_MODE: '0' },
  });
  const ls = String(r.stdout || '').trim().split('\n').map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  const init = ls.find((l) => l.type === 'system' && l.subtype === 'init') || {};
  const uses = [];
  for (const l of ls) if (l.type === 'assistant' && l.message) for (const c of l.message.content || []) if (c.type === 'tool_use') uses.push(c.name);
  const res = ls.find((l) => l.type === 'result') || {};
  return { tools: init.tools || [], uses, cost: res.total_cost_usd || 0, ok: !!init.tools, err: (r.stderr || '').slice(-300) };
}

function check(o) {
  const v = version(o.claude);
  if (!v) return { verdict: 'unknown', detail: 'claude 를 찾지 못했어요(--claude 경로)' };
  if (!atLeast(v, MIN)) return { verdict: 'unsupported', detail: `Claude Code ${v.join('.')} — 코드 모드는 ${MIN.join('.')} 이상` };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kjh-code-mode-'));
  const work = path.join(dir, 'w'); fs.mkdirSync(work);
  for (const [f, t] of [['a.txt', 'alpha'], ['b.txt', 'beta'], ['c.txt', 'gamma']]) fs.writeFileSync(path.join(work, f), `${t}\n`);
  const log = path.join(dir, 'hook.log');
  const hook = path.join(dir, 'hook.js');
  fs.writeFileSync(hook, `let r='';process.stdin.on('data',c=>r+=c);process.stdin.on('end',()=>{let j={};try{j=JSON.parse(r)}catch(_){};require('fs').appendFileSync(${JSON.stringify(log)},(j.tool_name||'?')+'\\n');process.exit(0)});`);
  const settings = JSON.stringify({ hooks: { PreToolUse: [{ matcher: '.*', hooks: [{ type: 'command', command: `node ${JSON.stringify(hook)}` }] }] } });
  const prompt = 'Read a.txt, b.txt and c.txt in this folder and reply with their three words joined by commas.';
  const off = probe(o, '0', work, settings, 'reply ok');
  const on = probe(o, '1', work, settings, prompt);
  const hooked = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : [];
  fs.rmSync(dir, { recursive: true, force: true });
  const cost = `$${(off.cost + on.cost).toFixed(4)}`;
  if (!off.ok || !on.ok) return { verdict: 'unknown', detail: `점검용 claude 실행이 안 됐어요: ${off.err || on.err}`, cost };
  const extra = on.tools.filter((t) => !off.tools.includes(t));
  const reads = on.uses.filter((u) => u === 'Read').length;
  const hookedReads = hooked.filter((u) => u === 'Read').length;
  if (!extra.length && on.tools.length === off.tools.length && reads >= 3 && hookedReads >= 3) {
    return { verdict: 'inactive', detail: `변수를 켜도 도구 목록이 같고 도구를 하나씩 불렀어요 — 이 환경에선 코드 모드가 켜지지 않는 것 같아요(조직 설정 · 원격 환경 등). 켜도 해가 없지만 효과도 없어요`, cost };
  }
  // 코드 모드에서 모델이 파일 세 개를 읽었는데 훅은 그만큼 Read 를 못 봤다 → 이어 실행된 호출이 훅을 건너뜀
  if (hookedReads < 3) {
    return { verdict: 'hooks-bypassed', detail: `코드 모드에서 훅이 본 Read ${hookedReads}번(필요 3번)${extra.length ? ` · 새 도구 ${extra.join(', ')}` : ''} — 이어 실행된 도구 호출에 훅이 안 걸려요. 계층 강제 훅이 워커 모델을 못 지키므로 켜지 마세요`, cost };
  }
  return { verdict: 'ok', detail: `코드 모드${extra.length ? `(새 도구 ${extra.join(', ')})` : ''}에서도 훅이 도구 호출마다 걸렸어요(Read ${hookedReads}번) — 켜도 돼요`, cost };
}

function main() {
  const o = args(process.argv);
  if (!['status', 'check', 'on', 'off'].includes(o.cmd) || !['user', 'project', 'local'].includes(o.scope)) {
    process.stdout.write(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 20).join('\n').replace(/^ \* ?/gm, '') + '\n');
    process.exit(2);
  }
  try {
    if (o.cmd === 'status') { process.stdout.write(`${status(o)}\n`); return; }
    if (o.cmd === 'check') {
      const r = check(o);
      fs.writeFileSync(STATE, JSON.stringify({ at: new Date().toISOString(), ...r }));
      process.stdout.write(`CHECK ${r.verdict}: ${r.detail}${r.cost ? ` (점검 비용 ${r.cost})` : ''}\n`);
      process.exit(r.verdict === 'ok' || r.verdict === 'inactive' ? 0 : 1);
    }
    const file = settingsFile(o.scope);
    if (o.cmd === 'on') {
      let last = null;
      try { last = JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (_) { /* 점검 안 함 */ }
      if (last && last.verdict === 'hooks-bypassed' && !o.force) {
        process.stdout.write(`켜지 않았어요: 마지막 점검에서 코드 모드가 훅을 건너뛰었어요(${last.detail}). 그래도 켜려면 --force.\n`);
        process.exit(1);
      }
      setMode(file, true);
      process.stdout.write(`코드 모드를 켰어요: ${file} (env.${KEY}=1 · 원래 파일은 .bak-kjh-lyj-* 로 백업)\n${last ? '' : '아직 점검(check)을 안 했어요 — 켠 뒤라도 한 번 돌려 보세요.\n'}Claude Code 를 다시 켜야 적용돼요.\n`);
      return;
    }
    setMode(file, false);
    process.stdout.write(`코드 모드를 껐어요: ${file} (env 에서 ${KEY} 를 뺌)\nClaude Code 를 다시 켜야 적용돼요.\n`);
  } catch (e) {
    process.stderr.write(`code-mode: ${e.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { setMode, valueIn, settingsFile, KEY };
