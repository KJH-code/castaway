#!/usr/bin/env node
// orchestrate 플러그인: 모델 계층 강제 훅 (PreToolUse, Agent/Task 도구)
//
// 1) 이 플러그인의 에이전트를 부르면서 model/effort를 넘기면 파일에 고정된 계층이
//    덮어써지므로 거부한다. 예외: 대체용 model "inherit" (Fable 에이전트는 예외 없음).
// 2) model: fable 에이전트는 환경변수 ORCHESTRATE_FABLE=1 일 때만 허용한다.
//    Pro 요금제는 Fable이 주간 한도에 포함되지 않아 사용량 크레딧으로 따로 청구되고,
//    Max 이상도 Fable은 주간 한도의 절반까지만 쓸 수 있어서, 켠 사람만 쓰게 한다.
//
// 에이전트 목록과 모델은 agents/*.md 머리말에서 직접 읽는다. 에이전트를 추가해도 이 파일은
// 고칠 필요가 없다. 이 플러그인 에이전트가 아니면 아무것도 하지 않는다 (다른 작업에 간섭하지 않음).
'use strict';
const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');

// agents/ 폴더를 못 읽을 때만 쓰는 목록 (이름 → 모델)
const FALLBACK = {
  'checker': 'opus', 'checker-test': 'haiku', 'checker-lite': 'sonnet',
  'w-design': 'opus', 'w-proof-write': 'opus', 'w-proof-verify': 'opus',
  'w-implement': 'sonnet', 'w-implement-opus': 'opus', 'w-implement-lite': 'haiku',
  'w-data': 'haiku', 'w-experiment': 'haiku', 'w-chore': 'haiku',
  'su-scout': 'sonnet', 'su-designer': 'opus', 'su-judge': 'opus', 'su-builder': 'opus',
  'su-tester': 'haiku', 'su-reviewer': 'opus', 'su-dedupe': 'haiku', 'su-verifier': 'opus',
  'su-prover': 'opus', 'su-chore': 'haiku',
  'prover-fable': 'fable', 'su-builder-fable': 'fable', 'su-designer-fable': 'fable',
  'su-reviewer-fable': 'fable',
};
// Fable 에이전트 → Fable을 못 쓸 때 대신 부를 Opus 짝
const OPUS_PAIR = {
  'prover-fable': 'su-prover', 'su-builder-fable': 'su-builder',
  'su-designer-fable': 'su-designer', 'su-reviewer-fable': 'su-reviewer',
};

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
  const map = new Map();
  try {
    for (const f of fs.readdirSync(AGENTS_DIR)) {
      if (!f.endsWith('.md')) continue;
      const fm = parseFrontmatter(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'));
      map.set(fm.name || f.slice(0, -3), String(fm.model || '').toLowerCase());
    }
  } catch { /* 아래 FALLBACK 사용 */ }
  if (map.size === 0) for (const [n, m] of Object.entries(FALLBACK)) map.set(n, m);
  return map;
}

const isEmpty = (v) => v === undefined || v === null || v === '';
const fableEnabled = () => /^(1|on|true|yes)$/i.test(String(process.env.ORCHESTRATE_FABLE || '').trim());

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); } // 못 읽으면 간섭하지 않음
  if (!input || (input.tool_name !== 'Agent' && input.tool_name !== 'Task')) process.exit(0);

  const ti = input.tool_input || {};
  const type = String(ti.subagent_type || '');
  const base = type.includes(':') ? type.slice(type.lastIndexOf(':') + 1) : type;
  const agents = loadAgents();
  if (!agents.has(base)) process.exit(0);

  const agentModel = agents.get(base);
  const isFable = agentModel.includes('fable');
  const prefix = `orchestrate 플러그인 훅: ${type} 에이전트`;
  const pair = OPUS_PAIR[base] || (base.endsWith('-fable') ? base.slice(0, -'-fable'.length) : 'su-prover');

  if (isFable && ti.model === 'inherit') {
    deny(`${prefix}는 Fable 에이전트라 model "inherit" 대체를 허용하지 않습니다. ` +
      `Fable을 못 쓰면 Opus 짝 에이전트 ${pair}를 model 없이 부르세요.`);
  }

  const problems = [];
  if (!isEmpty(ti.model) && ti.model !== 'inherit') problems.push(`model "${ti.model}"`);
  if (!isEmpty(ti.effort)) problems.push(`effort "${ti.effort}"`);
  if (problems.length > 0) {
    deny(`${prefix}는 모델·노력이 에이전트 파일에 고정돼 있습니다. ` +
      `호출 때 ${problems.join(', ')}을(를) 넘기면 계층이 덮어써지므로 거부했습니다. ` +
      `model·effort 없이 다시 부르세요. Opus 자체를 못 쓰는 환경의 대체만 model "inherit"으로 허용합니다.`);
  }

  if (isFable && !fableEnabled()) {
    deny(`${prefix}는 Fable 5.2를 씁니다. ORCHESTRATE_FABLE=1이 켜져 있을 때만 부를 수 있습니다. ` +
      `Pro 요금제는 Fable이 주간 한도에 포함되지 않아 사용량 크레딧으로 따로 청구되고, ` +
      `Max 이상도 Fable은 주간 한도의 절반까지만 씁니다. ` +
      `지금은 Opus 짝 에이전트 ${pair}를 부르세요. ` +
      `Fable을 쓰려면 사용자가 settings.json의 env에 "ORCHESTRATE_FABLE": "1"을 넣고 Claude Code를 다시 시작해야 합니다.`);
  }

  process.exit(0);
});
