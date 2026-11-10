#!/usr/bin/env node
// orchestrate 플러그인: 주간 한도 사용량 추정기
//
// 근거: "AI Model Capability vs. Subscription Usage Limits" (2026-11-10 기준), Claude 모델만.
//   사용률 = Artificial Analysis Intelligence Index v5.0.1 과제 1개의 API 비용
//            ÷ 그 모델의 주간 한도 API 환산 가치 × 100
//   공식 수치가 아니다. 제3자 측정(SemiAnalysis, Theo)과 그로부터의 추정이다.
//   정책이나 모델이 바뀌면 아래 표만 고친다. 쓰는 법: skills/orchestrate/references/budget.md
//
// 에이전트의 모델·노력은 agents/*.md 머리말에서 직접 읽는다.
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_AS_OF = '2026-11-10';

// Pro 주간 한도 대비, AA 과제 1개당 사용률(%) [낮은 값, 높은 값]
const PER_TASK_PRO = {
  opus: {   // 측정
    max: [3.0, 3.8], xhigh: [1.8, 2.3], high: [1.0, 1.3], medium: [0.72, 0.93], low: [0.29, 0.37],
  },
  haiku: {  // 추정: 측정 없음, Opus와 같은 달러 풀이라고 가정. high는 비용 데이터가 없어 medium~xhigh로 둔다
    max: [0.16, 0.16], xhigh: [0.096, 0.096], high: [0.035, 0.096], medium: [0.035, 0.035], low: [0.015, 0.015],
  },
  sonnet: { // 추정($200 요금제 측정을 비율로 줄임). 이 플러그인은 medium만 쓴다
    max: [3.6, 5.3], xhigh: [1.5, 2.2], high: [0.58, 0.87], medium: [0.28, 0.41], low: [0.18, 0.27],
  },
};
// Max 주간 한도 '전체' 대비 Fable 5.2 사용률(%). 추정(계정 1개 측정). Pro에는 포함되지 않는다.
const FABLE_PER_TASK_MAX = {
  max: [3.8, 3.8], xhigh: [2.1, 2.1], high: [1.3, 1.3], medium: [0.54, 0.54], low: [0.44, 0.44],
};
const STATUS = { opus: '측정', haiku: '추정(약한 가정)', sonnet: '추정', fable: '추정(계정 1개)' };
const PLAN_MULT = { pro: 1, max: 5, ultra: 10 }; // Pro 대비 주간 한도 배수
const PLAN_NAME = { pro: 'Pro', max: 'Max', ultra: 'Ultra' };
const FABLE_POOL = 50; // Fable은 주간 한도의 절반까지만

// 호출 1번이 AA 과제 몇 개 크기인지 (가정). 첫 단위 실측(--pilot-measured)으로 보정한다.
// 구현은 1.13: 코딩 에이전트 과제(Claude Code + Opus max, Pro 3.4–4.3%)가 AA 과제(3.0–3.8%)보다 약 13% 크다.
const CODE = 1.13;
const SIZE = {
  'su-builder': CODE, 'su-builder-fable': CODE, 'w-implement': CODE, 'w-implement-opus': CODE,
  'w-implement-lite': CODE,
  'su-designer': 1, 'su-designer-fable': 1, 'w-design': 1, 'su-reviewer-fable': 1,
  'su-reviewer': 1, 'checker': 1, 'checker-lite': 1, 'su-prover': 1, 'prover-fable': 1, 'w-proof-write': 1,
  'w-experiment': 1,
  'su-judge': 0.5, 'su-verifier': 0.5, 'w-proof-verify': 0.5, 'w-data': 0.5,
  'su-scout': 0.5, 'su-tester': 0.5, 'checker-test': 0.5,
  'su-dedupe': 0.2, 'w-chore': 0.2, 'su-chore': 0.2,
};

// 모드: 절약(lite) · 기본(standard = orchestrate 스킬) · 강화(plus) · 최대(super)
const MODES = ['lite', 'standard', 'plus', 'super', 'fable'];
const MODE_NAME = { lite: '절약', standard: '기본', plus: '강화', super: '최대', fable: '극한' };
const MODE_ALIAS = {
  lite: 'lite', '절약': 'lite',
  standard: 'standard', orchestrate: 'standard', '기본': 'standard',
  plus: 'plus', '강화': 'plus',
  super: 'super', '최대': 'super',
  fable: 'fable', '극한': 'fable', extreme: 'fable',
};
const PROOF_VERIFIERS = { lite: 1, standard: 1, plus: 2, super: 3, fable: 3 };
const PROOF_MAX_ROUNDS = { lite: 2, standard: 3, plus: 3, super: 3, fable: 3 };

const HELP = `쓰는 법:
  node budget.js --plan <pro|max|ultra> --compare [--units 3]          모드 4개 비교 (코드)
  node budget.js --plan <요금제> --preset proof --compare              모드 4개 비교 (증명)
  node budget.js --plan <요금제> --preset <lite|standard|plus|super> --units N [모드별 옵션]
  node budget.js --plan <요금제> --preset proof --mode <모드> [--rounds R]
  node budget.js --plan <요금제> --calls "w-implement:3,checker-test:1,checker:1"
모드별 옵션:
  lite:     --heavy H (Sonnet으로 보낼 어려운 단위 수, 기본 1), --fix F (수정 라운드, 기본 1, 최대 1)
  standard: --lite-units L (Haiku로 보낼 쉬운 단위), --hard H (Opus로 보낼 까다로운 단위), --design D (기본 0), --fix F (기본 1, 최대 2)
  plus:     --scouts S (기본 1), --design D (기본 0), --fix F (단위당, 기본 1, 최대 2), --verify-calls V (기본 3)
  super:    --scouts S (기본 3), --fix F (단위당, 기본 1, 최대 2), --verify-calls V (기본 8)
  fable:    --scouts S (기본 3), --fix F (단위당, 기본 1, 최대 3), --verify-calls V (기본 15, 지적 전부)
공통 선택:
  --calls "이름:횟수[:크기]"   프리셋에 호출을 더하거나 직접 목록을 준다 (크기 기본값은 에이전트별 계수)
  --remaining <%>             남은 주간 한도(%). 넘칠 것 같으면 경고
  --pilot-measured <%>        첫 조각 실측치(/usage 주간 % 차이). 나머지를 이 비율로 보정
  --pilot-calls "..."         실측한 조각의 호출 목록 (기본 "su-builder:1,su-tester:1")`;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

function fail(msg) { console.error(`오류: ${msg}\n\n${HELP}`); process.exit(2); }

function num(v, name, { min = 0, int = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (int && !Number.isInteger(n))) fail(`${name} 값이 틀렸습니다: ${v}`);
  return n;
}

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function loadAgents() {
  const dir = path.join(__dirname, '..', 'agents');
  const map = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    map.set(fm.name || f.slice(0, -3), {
      model: String(fm.model || '').toLowerCase(),
      effort: String(fm.effort || '').toLowerCase(),
    });
  }
  return map;
}

function parseCalls(spec) {
  if (typeof spec !== 'string' || !spec.trim()) fail('--calls 가 비어 있습니다');
  return spec.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [rawName, count, size] = s.replace(/^orchestrate:/, '').split(':');
    const name = rawName.includes('/') ? rawName.slice(rawName.lastIndexOf('/') + 1) : rawName;
    const c = count === undefined ? 1 : num(count, `"${s}"의 횟수`);
    const z = size === undefined ? undefined : num(size, `"${s}"의 크기`);
    return { name, count: c, size: z, label: '' };
  });
}

function getMode(v, name) {
  const m = MODE_ALIAS[String(v).toLowerCase()] || MODE_ALIAS[String(v)];
  if (!m) fail(`${name} 은 lite, standard, plus, super 중 하나: ${v}`);
  return m;
}

// 코드 작업 호출 목록. a는 명령행 옵션
// 네 모드는 구현 모델과 검증을 한 칸씩 올린다:
//   절약  Haiku max (어려운 단위 Sonnet medium) / test + 가벼운 review(Sonnet medium)
//   기본  Sonnet medium (쉬운 단위 Haiku max, 까다로운 단위 Opus medium) / test + review(Opus xhigh)
//   강화  Opus medium, worktree / 단위 테스트 + 통합 test + 리뷰 2 + 상 지적 반박 검증
//   최대  Opus xhigh (선택 Fable high), worktree / 설계 후보 3 + 리뷰 3 + 반박 검증 + 판정
function codeCalls(mode, a) {
  const n = (k, d, opt) => (a[k] === undefined ? d : num(a[k], `--${k}`, opt));
  const units = n('units', 3, { min: 1, int: true });
  const half = CODE * 0.5; // 이어 부른 수정 1번
  if (mode === 'lite') {
    const heavy = n('heavy', Math.min(1, units), { int: true });
    if (heavy > units) fail('--heavy 가 --units 보다 큽니다');
    const fix = n('fix', 1);
    if (fix > 1) fail('절약 모드는 수정 최대 1번입니다 (--fix ≤ 1)');
    const fixer = heavy === units ? 'w-implement' : 'w-implement-lite';
    return [
      { name: 'w-implement-lite', count: units - heavy, label: '구현(Haiku)' },
      { name: 'w-implement', count: heavy, label: '구현(어려운 단위)' },
      { name: fixer, count: fix, size: half, label: '수정(이어 부름)' },
      { name: 'checker-test', count: 1 + fix, label: '검수 test' },
      { name: 'checker-lite', count: 1, label: '검수 review(가벼움)' },
    ];
  }
  if (mode === 'standard') {
    const liteUnits = n('lite-units', 0, { int: true });
    const hard = n('hard', 0, { int: true });
    if (liteUnits + hard > units) fail('--lite-units + --hard 가 --units 보다 큽니다');
    const design = n('design', 0, { int: true });
    const fix = n('fix', 1);
    if (fix > 2) fail('수정은 최대 2번입니다 (--fix ≤ 2)');
    return [
      { name: 'w-design', count: design, label: '설계' },
      { name: 'w-implement', count: units - liteUnits - hard, label: '구현(Sonnet)' },
      { name: 'w-implement-lite', count: liteUnits, label: '구현(쉬운 단위)' },
      { name: 'w-implement-opus', count: hard, label: '구현(까다로운 단위)' },
      { name: 'w-implement', count: fix, size: half, label: '수정(이어 부름)' },
      { name: 'checker-test', count: 1 + fix, label: '검수 test' },
      { name: 'checker', count: 1, label: '검수 review' },
    ];
  }
  if (mode === 'plus') {
    const scouts = n('scouts', 1, { int: true });
    const design = n('design', 0, { int: true });
    const fix = n('fix', 1);
    if (fix > 2) fail('수정은 최대 2번입니다 (--fix ≤ 2)');
    const verify = n('verify-calls', 3, { int: true });
    return [
      { name: 'su-scout', count: scouts, label: '정찰' },
      { name: 'w-design', count: design, label: '설계' },
      { name: 'w-implement-opus', count: units, label: '구현(worktree)' },
      { name: 'w-implement-opus', count: units * fix, size: half, label: '수정(이어 부름)' },
      { name: 'su-tester', count: units * (1 + fix), label: '단위 테스트' },
      { name: 'checker-test', count: 1, label: '통합 테스트' },
      { name: 'su-reviewer', count: 2, label: '리뷰' },
      { name: 'su-verifier', count: verify, label: '반박 검증(상)' },
    ];
  }
  if (mode === 'fable') {
    const scouts = n('scouts', 3, { int: true });
    const fix = n('fix', 1);
    if (fix > 3) fail('극한 모드는 수정 최대 3번입니다 (--fix ≤ 3)');
    const verify = n('verify-calls', 15, { int: true });
    return [
      { name: 'su-scout', count: scouts, label: 'A 정찰' },
      { name: 'su-designer-fable', count: 3, label: 'A 설계 후보(Fable)' },
      { name: 'su-judge', count: 1, label: 'A 설계 판정' },
      { name: 'su-builder-fable', count: units, label: 'B1 구현(Fable)' },
      { name: 'su-builder-fable', count: units * fix, size: half, label: 'B1 수정(이어 부름)' },
      { name: 'su-tester', count: units * (1 + fix), label: 'B1 테스트' },
      { name: 'checker-test', count: 1, label: '통합 테스트' },
      { name: 'su-reviewer', count: 3, label: 'B2 리뷰(Opus)' },
      { name: 'su-reviewer-fable', count: 1, label: 'B2 리뷰(Fable)' },
      { name: 'su-dedupe', count: 1, label: 'B2 중복 정리' },
      { name: 'su-verifier', count: verify, label: 'B2 반박 검증' },
      { name: 'su-judge', count: 1, label: 'B2 최종 판정' },
    ];
  }
  // super
  const builder = 'su-builder';
  const scouts = n('scouts', 3, { int: true });
  const fix = n('fix', 1);
  if (fix > 2) fail('수정은 최대 2번입니다 (--fix ≤ 2)');
  const verify = n('verify-calls', 8, { int: true });
  return [
    { name: 'su-scout', count: scouts, label: 'A 정찰' },
    { name: 'su-designer', count: 3, label: 'A 설계 후보' },
    { name: 'su-judge', count: 1, label: 'A 설계 판정' },
    { name: builder, count: units, label: 'B1 구현' },
    { name: builder, count: units * fix, size: half, label: 'B1 수정(이어 부름)' },
    { name: 'su-tester', count: units * (1 + fix), label: 'B1 테스트' },
    { name: 'checker-test', count: 1, label: '통합 테스트' },
    { name: 'su-reviewer', count: 3, label: 'B2 리뷰' },
    { name: 'su-dedupe', count: 1, label: 'B2 중복 정리' },
    { name: 'su-verifier', count: verify, label: 'B2 반박 검증' },
    { name: 'su-judge', count: 1, label: 'B2 최종 판정' },
  ];
}

// 증명 작업 호출 목록
function proofCalls(mode, a, { quiet = false } = {}) {
  const maxRounds = PROOF_MAX_ROUNDS[mode];
  let rounds = a.rounds === undefined ? maxRounds : num(a.rounds, '--rounds', { min: 1, int: true });
  if (rounds > maxRounds) {
    if (!quiet) fail(`${MODE_NAME[mode]} 모드의 증명 라운드는 최대 ${maxRounds}번입니다`);
    rounds = maxRounds;
  }
  const writer = mode === 'fable' ? 'prover-fable' : (mode === 'plus' || mode === 'super' ? 'su-prover' : 'w-proof-write');
  const out = [{ name: writer, count: 1, label: '작성' }];
  if (rounds > 1) out.push({ name: writer, count: rounds - 1, size: 0.5, label: '수정(이어 부름)' });
  out.push({ name: 'w-proof-verify', count: PROOF_VERIFIERS[mode] * rounds, label: `검증 ×${PROOF_VERIFIERS[mode]}` });
  return out;
}

function rate(model, effort, plan) {
  if (model === 'fable') {
    if (plan === 'pro') return { na: 'Pro 미포함(크레딧 별도 청구)' };
    const r = FABLE_PER_TASK_MAX[effort];
    if (!r) return { na: `fable ${effort} 데이터 없음` };
    const k = plan === 'ultra' ? 2 : 1;
    return { lo: r[0] / k, hi: r[1] / k, status: STATUS.fable };
  }
  const t = PER_TASK_PRO[model];
  if (!t) return { na: `${model || '모델 미상'} 데이터 없음` };
  const r = t[effort];
  if (!r) return { na: `${model} ${effort || '노력 미상'} 데이터 없음` };
  const k = PLAN_MULT[plan];
  return { lo: r[0] / k, hi: r[1] / k, status: STATUS[model] };
}

function fmt(x) {
  if (x === 0) return '0';
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(1);
  if (x >= 0.1) return x.toFixed(2);
  return x.toFixed(3);
}
const range = (lo, hi) => (fmt(lo) === fmt(hi) ? `${fmt(lo)}%` : `${fmt(lo)}–${fmt(hi)}%`);
const pad = (s, w) => { s = String(s); const len = [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e7f ? 2 : 1), 0); return s + ' '.repeat(Math.max(1, w - len)); };

function estimate(calls, agents, plan) {
  const rows = [];
  const tot = { lo: 0, hi: 0, fableLo: 0, fableHi: 0, na: [] };
  for (const c of calls) {
    if (!(c.count > 0)) continue;
    const ag = agents.get(c.name);
    if (!ag) fail(`에이전트를 찾을 수 없습니다: ${c.name} (agents/ 폴더의 이름을 쓰세요)`);
    const size = c.size !== undefined ? c.size : (SIZE[c.name] !== undefined ? SIZE[c.name] : 1);
    const r = rate(ag.model, ag.effort, plan);
    const row = { ...c, model: ag.model, effort: ag.effort, size };
    if (r.na) { row.na = r.na; tot.na.push(`${c.name}: ${r.na}`); }
    else {
      row.lo = r.lo * size * c.count; row.hi = r.hi * size * c.count; row.status = r.status;
      tot.lo += row.lo; tot.hi += row.hi;
      if (ag.model === 'fable') { tot.fableLo += row.lo; tot.fableHi += row.hi; }
    }
    rows.push(row);
  }
  return { rows, tot };
}

function printCompare(a, plan, agents) {
  const proof = a.preset === 'proof';
  const results = MODES.map((m) => {
    const calls = proof ? proofCalls(m, a, { quiet: true }) : codeCalls(m, a);
    return { mode: m, ...estimate(calls, agents, plan) };
  });
  const base = results.find((r) => r.mode === 'standard').tot;
  const baseMid = (base.lo + base.hi) / 2;
  const what = proof ? '증명 (라운드는 모드별 최대)' : `작업 단위 ${a.units === undefined ? 3 : a.units}개`;
  console.log(`모드 비교 — 요금제 ${PLAN_NAME[plan]}, ${what}, 데이터 기준일 ${DATA_AS_OF}`);
  console.log('');
  console.log(pad('모드', 17) + pad('주간 한도', 16) + '기본 대비');
  for (const r of results) {
    const mid = (r.tot.lo + r.tot.hi) / 2;
    const ratio = baseMid > 0 ? mid / baseMid : 0;
    const ratioText = r.mode === 'standard' ? '1배' : `약 ${ratio >= 1 ? ratio.toFixed(1) : ratio.toFixed(2)}배`;
    const naCalls = r.rows.filter((x) => x.na).reduce((k, x) => k + x.count, 0);
    const extra = naCalls ? `  + Fable 호출 ${fmt(naCalls)}회는 한도 밖 (Pro는 크레딧으로 따로 청구)` : '';
    console.log(pad(`${MODE_NAME[r.mode]}(${r.mode})`, 17) + pad(range(r.tot.lo, r.tot.hi), 16) + ratioText + extra);
  }
  console.log(pad('모드 없음', 17) + '— 메인이 직접 한다. 작업 크기에 달렸다(작은 일이면 가장 싸다)');
  console.log('');
  console.log('주의: 대략값이다. 호출 크기 계수는 가정이고, 캐시가 적은 작업은 표보다 한도를 더 먹는다.');
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help || a.h) { console.log(HELP); return; }
  const plan = String(a.plan || 'pro').toLowerCase();
  if (!PLAN_MULT[plan]) fail(`--plan 은 pro, max, ultra 중 하나: ${a.plan}`);
  const agents = loadAgents();

  if (a.fable) fail('Fable은 극한 모드에서만 씁니다. --preset fable 또는 --preset proof --mode fable 을 쓰세요');
  if (a.compare) { printCompare(a, plan, agents); return; }

  let calls;
  let title = '';
  if (a.preset) {
    if (a.preset === 'proof') {
      const mode = getMode(a.mode === undefined ? 'super' : a.mode, '--mode');
      calls = proofCalls(mode, a);
      title = `${MODE_NAME[mode]} 모드 증명`;
    } else {
      const mode = getMode(a.preset, '--preset');
      calls = codeCalls(mode, a);
      title = `${MODE_NAME[mode]} 모드`;
    }
  }
  if (a.calls) calls = (calls || []).concat(parseCalls(a.calls));
  if (!calls) fail('--calls, --preset, --compare 중 하나가 필요합니다');

  const { rows, tot } = estimate(calls, agents, plan);

  console.log(`주간 한도 사용량 추정 — ${title ? `${title}, ` : ''}요금제 ${PLAN_NAME[plan]}, 데이터 기준일 ${DATA_AS_OF}`);
  console.log('');
  console.log(pad('단계', 22) + pad('에이전트', 18) + pad('호출', 6) + pad('모델/노력', 14) + pad('크기', 6) + '주간 한도');
  for (const r of rows) {
    const usage = r.na ? `— (${r.na})` : `${range(r.lo, r.hi)}  [${r.status}]`;
    const count = Number.isInteger(r.count) ? String(r.count) : fmt(r.count);
    console.log(pad(r.label || '-', 22) + pad(r.name, 18) + pad(count, 6) +
      pad(`${r.model}/${r.effort}`, 14) + pad(r.size, 6) + usage);
  }
  console.log('');
  console.log(`합계: ${range(tot.lo, tot.hi)} (${PLAN_NAME[plan]} 주간 한도 대비)`);
  if (tot.fableHi > 0) {
    console.log(`  그중 Fable: ${range(tot.fableLo, tot.fableHi)} — Fable은 주간 한도의 ${FABLE_POOL}%까지만 쓸 수 있다`);
  }
  if (tot.na.length) console.log(`  합계에서 뺀 것: ${tot.na.join('; ')}`);

  const warnings = [];
  if (a['pilot-measured'] !== undefined) {
    const measured = num(a['pilot-measured'], '--pilot-measured');
    const pilotCalls = parseCalls(typeof a['pilot-calls'] === 'string' ? a['pilot-calls'] : 'su-builder:1,su-tester:1');
    const p = estimate(pilotCalls, agents, plan).tot;
    const pilotMid = (p.lo + p.hi) / 2;
    if (measured < 1) {
      console.log(`실측 보정: 실측 ${measured}%는 /usage 눈금(1%)보다 작아 보정하지 않는다. 추정치를 그대로 쓴다.`);
    } else if (pilotMid > 0) {
      const k = measured / pilotMid;
      const restLo = Math.max(0, tot.lo - p.lo) * k;
      const restHi = Math.max(0, tot.hi - p.hi) * k;
      console.log(`실측 보정: 첫 조각 추정 ${range(p.lo, p.hi)} → 실측 ${measured}% (×${k.toFixed(2)})`);
      console.log(`  보정한 남은 작업: ${range(restLo, restHi)}, 보정한 전체: ${range(restLo + measured, restHi + measured)}`);
      tot.lo = restLo + measured; tot.hi = restHi + measured;
    }
  }
  if (a.remaining !== undefined) {
    const rem = num(a.remaining, '--remaining');
    if (tot.hi > rem) warnings.push(`예상 상단 ${fmt(tot.hi)}%가 남은 주간 한도 ${fmt(rem)}%를 넘는다. 줄이는 순서를 보고 사용자에게 묻는다.`);
    else if (tot.hi > rem / 2) warnings.push(`예상 상단 ${fmt(tot.hi)}%가 남은 주간 한도 ${fmt(rem)}%의 절반을 넘는다. 진행 전에 사용자에게 묻는다.`);
  }
  if (tot.fableHi > FABLE_POOL) warnings.push(`Fable 예상치가 Fable 몫(주간 한도의 ${FABLE_POOL}%)을 넘는다.`);
  if (rows.some((r) => r.model === 'fable') && plan === 'pro') warnings.push('Pro는 Fable이 한도에 포함되지 않는다. 쓰면 사용량 크레딧으로 따로 청구된다. Opus 짝 에이전트를 쓴다.');
  if (rows.some((r) => r.model === 'sonnet' && r.effort !== 'medium')) warnings.push('Sonnet을 medium 말고 다른 노력으로 쓰고 있다. high 이상은 이 플러그인의 계층 원칙(README "설계 근거")에 어긋난다.');

  console.log('');
  for (const w of warnings) console.log(`경고: ${w}`);
  console.log('주의: 대략값이다. 호출 크기 계수는 가정이고, 캐시가 적은 작업은 표보다 한도를 더 먹는다.');
  console.log('      5시간 한도는 따로다. 큰 워크플로는 /usage의 현재 세션 사용률도 본다.');
}

main();
