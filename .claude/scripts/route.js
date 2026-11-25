'use strict';
// 위임 매니저(src/core/route.js)와 같은 파일 — 한쪽을 고치면 다른 쪽도 같이(위임 매니저 시험이 같은지 확인한다).
/**
 * 유료 부계정이 일을 어떻게 할지 고른다 — Claude Code(도구로 직접 읽고 · 고치고 · 돌림) 또는 relay(도구 없는 채팅에
 * 필요한 파일만 담아 보내고 답을 앱이 적용 · 테스트 · 커밋). 같은 모델 · 노력이면 relay 가 토큰 · 비용이 절반쯤이지만
 * 명령을 못 돌리고, 테스트가 약하면 잘못 적용돼도 못 잡는다(v0.10.x 벤치에서 본 것).
 *
 * 순서(앞에서 정해지면 끝):
 *   1. 사람이 정함(설정 'code' · 'relay', 지시서 mode)
 *   2. 이 저장소에 relay 테스트 명령이 없다 → Claude Code   (조용한 실패를 막을 그물이 없음)
 *   3. 워커 종류(KJH-LYJ 분업): 설계 · 검토 · 실험 → Claude Code (고치는 게 아니라 둘러보거나 돌려 보는 일).
 *      데이터 워커도 '결과를 달라'는 일(코드 변경 아님)이면 Claude Code
 *   4. 지시에 실행이 필요한 일(설치 · 실행해서 확인 · 측정 · 빌드 · 재현이 들쭉날쭉한 버그) → Claude Code
 *      다만 '스크립트로 다시 만드는 파일'은 저장소 설정의 '적용 직후 명령'이 있으면 relay 도 된다
 *   5. 범위가 넓은데(구조 파악 · 리팩터 · 여러 파일) 바꿀 파일이 안 적혀 있다 / 저장소가 아주 큰데 파일이 안 적혀 있다 → Claude Code
 *   6. 지난 기록: 같은 워커의 relay 가 3번 이상 중 60% 미만 성공 → Claude Code
 *   7. 나머지(구현 · 쉬운/까다로운 구현 · 데이터 코드 · 잡일 · 증명) → relay. 끝내 못 고치면 같은 부계정이 Claude Code 로 이어받는다.
 */

// 측정(v0.10.x 벤치 24과제): 구현 · 쉬운 구현 · 까다로운 구현 · 데이터 코드 · 이름 바꾸기도 테스트만 있으면 relay 가 다 성공하고
// 비용은 절반쯤이었다. 그래서 워커만으로 Claude Code 를 고르는 건 '고치는 게 아니라 둘러보거나 돌려 봐야 하는' 워커뿐이다.
const CODE_WORKERS = {
  'w-design': '설계는 저장소를 둘러보며 판단해야 해요',
  checker: '검토는 저장소를 넓게 읽어야 해요',
  'w-experiment': '실험은 직접 돌려 봐야 해요',
};
const RELAY_WORKERS = new Set(['w-implement', 'w-implement-lite', 'w-implement-opus', 'w-proof-write', 'w-proof-verify', 'w-data', 'w-chore']);

const RX = {
  // 실행해야 알 수 있는 일
  run: /설치|install\b|npm\s+(i|install|ci)\b|pip\s+install|실행해\s*(서|보고|봐)|돌려\s*(서|보고|봐)|측정|벤치마크|benchmark|프로파일|profil|빌드\s*(해|가|를|오류|에러)|build\s+(fails?|error)|스크린샷|screenshot|브라우저에서\s*확인|배포|deploy|도커|docker|마이그레이션\s*(만들|생성|돌려)|db\s*(초기화|seed)/i,
  // 재현이 들쭉날쭉 — 돌려 보며 좁혀야 함
  flaky: /간헐적|가끔(씩)?\s*(실패|죽|멈|틀)|flaky|재현이?\s*(안|잘\s*안)|특정\s*환경에서만|내\s*(pc|컴퓨터)에서만|로그를\s*보고|원인을?\s*모르겠/i,
  // 스크립트 · 도구가 다시 만드는 파일
  generated: /다시\s*생성|재생성|regenerate|생성된\s*파일|lock\s*파일|lockfile|package-lock|yarn\.lock|poetry\.lock|sha256|해시\s*(목록|값)|index\.json|코드\s*생성|codegen|스냅숏\s*갱신|snapshot\s*update/i,
  wantsOutput: /(결과|통계|합계|평균|목록)(를|을)?\s*(알려|뽑아|보여|정리해|구해)|집계해\s*(줘|주세요)|분석해\s*(줘|주세요)/i,
  change: /(바꿔|바꾸|고쳐|수정|추가|삭제|만들어|구현|넣어|빼)/,
  broad: /전체|모든\s*파일|여러\s*파일|구조(를)?\s*(파악|이해|바꿔|바꾸)|리팩터|refactor|처음부터|저장소\s*전반/i,
};

/** 사람이 고른 값: 'code' | 'relay' | '' */
function forced(settingsMode, requestMode) {
  const m = String(requestMode || '').toLowerCase();
  if (m === 'code' || m === 'relay') return { mode: m, by: 'request' };
  if (settingsMode === 'code' || settingsMode === 'relay') return { mode: settingsMode, by: 'settings' };
  return null;
}

/**
 * 지난 작업 기록 → 워커별 relay · Claude Code 성공 수. 판단기가 고른 작업(job.route)만 센다.
 * relay 성공 = 끝까지 relay 로 끝남(Claude Code 로 이어받았으면 실패로 센다).
 */
function stats(jobs) {
  const out = {};
  for (const j of jobs || []) {
    const r = j.route;
    if (!r || !r.mode || !r.auto) continue;
    if (!['done', 'merged', 'failed', 'discarded', 'limit'].includes(j.status) && !j.handedTo) continue;
    const w = r.worker || '-';
    const b = out[w] || (out[w] = { relay: { n: 0, ok: 0, cost: 0 }, code: { n: 0, ok: 0, cost: 0 } });
    const side = b[r.mode === 'relay' ? 'relay' : 'code'];
    if (j.status === 'limit' && !r.fellBack) continue; // 한도로 멈춘 건 방식 탓이 아님
    side.n += 1;
    const ok = (j.status === 'done' || j.status === 'merged') && !r.fellBack;
    if (ok) side.ok += 1;
    if (typeof j.costUsd === 'number') side.cost += j.costUsd;
  }
  return out;
}

/**
 * f: { instruction, worker, files(지시에 적힌 실제 파일), repo: { hasTest, postApply, codeFiles, codeChars }, settingsMode, requestMode, history(stats 결과) }
 * → { mode: 'code'|'relay', reason, rule, auto }
 */
function decide(f) {
  const t = String(f.instruction || '');
  const repo = f.repo || {};
  const files = f.files || [];
  const worker = f.worker || '';
  const done = (mode, rule, reason) => ({ mode, rule, reason, auto: true, worker });
  const fx = forced(f.settingsMode, f.requestMode);
  if (fx) {
    if (fx.mode === 'relay' && !repo.hasTest) return done('code', 'no-test', '사람이 relay 를 골랐지만 이 저장소엔 relay 테스트 명령이 없어 Claude Code 로 했어요(저장소 설정에서 테스트 명령을 넣으면 relay 가 돼요)');
    return { mode: fx.mode, rule: `forced-${fx.by}`, reason: fx.by === 'request' ? '지시서에서 정함' : '설정에서 고정', auto: false, worker };
  }
  if (!repo.hasTest) return done('code', 'no-test', 'relay 테스트 명령이 없어요 — relay 는 잘못 적용돼도 테스트가 없으면 못 잡아요');
  if (CODE_WORKERS[worker]) return done('code', 'worker', `${worker}: ${CODE_WORKERS[worker]}`);
  if (worker === 'w-data' && RX.wantsOutput.test(t) && !RX.change.test(t)) return done('code', 'run', '데이터를 처리한 결과를 달라는 일이에요 — 스크립트를 돌려 봐야 해요');
  const gen = RX.generated.exec(t);
  if (gen && !String(repo.postApply || '').trim()) return done('code', 'generated', `'${gen[0]}' — 스크립트로 다시 만드는 파일은 relay 가 못 만들어요(저장소 설정 '적용 직후 명령'에 그 스크립트를 넣으면 relay 도 돼요)`);
  const run = RX.run.exec(t);
  if (run) return done('code', 'run', `'${run[0]}' — 실행해 봐야 하는 일이에요`);
  const flaky = RX.flaky.exec(t);
  if (flaky) return done('code', 'flaky', `'${flaky[0]}' — 돌려 보며 원인을 좁혀야 해요`);
  const broad = RX.broad.exec(t);
  if (broad && !files.length) return done('code', 'broad', `'${broad[0]}' — 범위가 넓은데 바꿀 파일이 안 적혀 있어요(relay 는 보낼 파일을 골라야 함)`);
  if (!files.length && ((repo.codeFiles || 0) > 400 || (repo.codeChars || 0) > 1500000)) {
    return done('code', 'big-repo', `저장소가 커요(코드 파일 ${repo.codeFiles}개) — 바꿀 파일이 지시에 없으면 직접 찾는 게 나아요`);
  }
  const h = f.history && f.history[worker || '-'];
  if (h && h.relay.n >= 3 && h.relay.ok / h.relay.n < 0.6) {
    return done('code', 'history', `지난 기록: ${worker || '이 종류'} relay ${h.relay.ok}/${h.relay.n} 성공 — Claude Code 가 나아요`);
  }
  if (worker && !RELAY_WORKERS.has(worker)) return done('code', 'worker', `${worker} 는 relay 기준이 없어 Claude Code 로 해요`);
  const why = [];
  if (files.length) why.push(`바꿀 파일 ${files.length}개가 지시에 있음`);
  if (h && h.relay.n) why.push(`지난 relay ${h.relay.ok}/${h.relay.n} 성공`);
  return done('relay', 'default', `범위가 정해진 구현 · 테스트 있음${why.length ? ` · ${why.join(' · ')}` : ''} — relay 가 토큰을 절반쯤 아껴요(못 고치면 Claude Code 로 이어받음)`);
}

module.exports = { decide, stats, CODE_WORKERS, RELAY_WORKERS, RX };
