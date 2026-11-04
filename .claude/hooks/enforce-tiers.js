#!/usr/bin/env node
// orchestrate 플러그인: 모델 계층 강제 훅 (PreToolUse, Agent 도구)
// 이 플러그인의 에이전트를 부르면서 model/effort를 넘기면 파일에 고정된 계층이
// 덮어써지므로 거부한다. 예외: 대체용 model "inherit".
// 이 플러그인 에이전트가 아니면 아무것도 하지 않는다 (다른 작업에 간섭하지 않음).
const AGENTS = new Set([
  'checker', 'checker-test',
  'w-design', 'w-proof-write', 'w-proof-verify', 'w-implement', 'w-data', 'w-experiment', 'w-chore',
  'su-scout', 'su-designer', 'su-judge', 'su-builder', 'su-tester', 'su-reviewer',
  'su-dedupe', 'su-verifier', 'su-prover', 'su-chore',
]);

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); } // 못 읽으면 간섭하지 않음
  if (input.tool_name !== 'Agent') process.exit(0);
  const ti = input.tool_input || {};
  const type = String(ti.subagent_type || '');
  const base = type.includes(':') ? type.slice(type.lastIndexOf(':') + 1) : type;
  if (!AGENTS.has(base)) process.exit(0);

  const problems = [];
  if (ti.model !== undefined && ti.model !== null && ti.model !== '' && ti.model !== 'inherit') {
    problems.push(`model "${ti.model}"`);
  }
  if (ti.effort !== undefined && ti.effort !== null && ti.effort !== '') {
    problems.push(`effort "${ti.effort}"`);
  }
  if (problems.length === 0) process.exit(0);

  const reason =
    `orchestrate 플러그인 훅: ${type} 에이전트는 모델·노력이 에이전트 파일에 고정돼 있습니다. ` +
    `호출 때 ${problems.join(', ')}을(를) 넘기면 계층이 덮어써지므로 거부했습니다. ` +
    `model·effort 없이 다시 부르세요. Opus를 못 쓸 때의 대체만 model "inherit"으로 허용합니다.`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
});
