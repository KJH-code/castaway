#!/usr/bin/env node
// kjh-lyj 플러그인: 모드 선택 훅 (UserPromptSubmit)
//
// 사용자 메시지마다 "새 작업 실행 요청이면 시작 전에 모드를 묻는다"는 지시를 맥락에 넣는다.
// 선택지: 모드 없음 · 절약(lite) · 기본(orchestrate) · 강화(plus) · 최대(super) · 극한(fable). 절차는 skills/mode/SKILL.md.
// 슬래시 명령으로 모드를 이미 고른 메시지와 /check 는 건너뛴다.
// 끄기: 환경변수 ORCHESTRATE_ASK_MODE=0
'use strict';

// 모드를 이미 정한 슬래시 명령, /check, 그리고 모드와 무관한 노트 기록 명령(/memo, /reflect)은 건너뛴다.
// /start 는 건너뛴다: start 스킬이 계획 승인 뒤 직접 모드를 묻는다.
const SKIP = /^\s*\/(?:kjh-lyj:)?(?:orchestrate|lite|plus|super|fable|mode|check|start|memo|reflect)(?:\s|$)/i;
const disabled = () => /^(0|off|false|no)$/i.test(String(process.env.ORCHESTRATE_ASK_MODE || '').trim());

const CONTEXT = [
  '[kjh-lyj 플러그인 — 모드 선택]',
  '이 메시지가 새 작업을 실행하라는 요청이면(파일 수정, 명령 실행, 코드·문서·분석 결과물 만들기, 조사해서 정리하기), 작업을 시작하기 전에 사용자에게 모드를 묻는다. 절차와 추천 규칙은 kjh-lyj 플러그인의 mode 스킬을 따른다.',
  '묻지 않는 경우: 순수 질문·설명·대화, 진행 중인 작업의 답변이나 후속 지시(그 작업의 모드를 계속 쓴다), 사용자가 메시지에서 이미 모드를 정한 경우, /check 요청, /start 진행 중(start 스킬이 계획 승인 뒤 직접 묻는다), 노트 기록 요청(/memo, /reflect, "메모해", "반영해").',
  '선택지 6개, 순서 고정: 모드 없음(메인이 직접) / 절약(lite) / 기본(orchestrate) / 강화(plus) / 최대(super) / 극한(fable).',
  '질문 도구는 선택지가 4개까지라 1차에 "모드 없음 / 절약 / 기본 / 더 높은 모드"를 묻고, 마지막을 고르면 2차에 "강화 / 최대 / 극한"을 묻는다. 추천 하나에 (추천)을 붙인다.',
  '고르면: 모드 없음은 메인이 직접 하고, 나머지는 해당 스킬(lite, orchestrate, plus, super, fable)을 불러 따른다.',
].join('\n');

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  if (disabled()) process.exit(0);
  let input = {};
  try { input = JSON.parse(raw); } catch { /* 입력을 못 읽어도 지시는 넣는다 */ }
  const prompt = String((input && input.prompt) || '');
  if (SKIP.test(prompt)) process.exit(0);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: CONTEXT },
  }));
  process.exit(0);
});
