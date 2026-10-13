/* presets/presets.js — CASTAWAY
   프리셋 — 게임 코드가 아니라 **값 묶음**이다. 설정 창의 '그래픽 프리셋' · '섬 프리셋' 이 여기서 고른다.
   (island_world.html 이 engine/js/ 보다 먼저 읽는다. 값만 바꾸면 되고 엔진 코드는 건드릴 것이 없다) */
"use strict";

/* 그래픽 프리셋 — 설정 창의 손잡이 값 한 벌. 고르면 손잡이가 그 값으로 옮겨 가고 저장된다.
   res 해상도 배율 · far 시야 · shadow 그림자(0 끄기~3 높음) · limb 가지 밀도(새 섬부터) · cam 캠코더(0 끔 · 1 360줄 · 2 480줄 · 3 720줄)
   noise 화면 잡음(0 끔 · 1 보통 · 2 짙게) */
const GRAPHICS_PRESETS=[
  {id:'low',    n:'저사양',       res:0.75, far:0.7, shadow:1, limb:0.5, cam:1, noise:0},
  {id:'normal', n:'보통',         res:1.0,  far:1.0, shadow:2, limb:0.8, cam:2, noise:1},
  {id:'high',   n:'고사양',       res:1.0,  far:1.4, shadow:3, limb:1.1, cam:3, noise:1},
  {id:'tape',   n:'낡은 테이프',  res:1.0,  far:1.0, shadow:2, limb:0.8, cam:1, noise:2},
  {id:'clean',  n:'캠코더 끄기',  res:1.0,  far:1.0, shadow:2, limb:0.8, cam:0, noise:0}
];

/* 섬 프리셋 — 새 섬을 만들 때의 인자 한 벌(시드는 그대로 둔다). 고른 뒤 '새 섬' 을 눌러야 섬이 바뀐다.
   size 섬 크기 · ridge 산맥 · ero 침식 · sea 해수면(m) · rain 강수량 */
const ISLAND_PRESETS=[
  {id:'default', n:'기본 섬',       size:0.70, ridge:0.85, ero:0.60, sea:0,  rain:1.0},
  {id:'peaks',   n:'험한 산악',     size:0.75, ridge:1.30, ero:0.35, sea:0,  rain:0.9},
  {id:'low',     n:'낮고 넓은 섬',  size:0.90, ridge:0.40, ero:0.80, sea:-2, rain:1.1},
  {id:'atoll',   n:'잠긴 섬(얕은 바다)', size:0.60, ridge:0.70, ero:0.60, sea:6, rain:1.3},
  {id:'dry',     n:'메마른 섬',     size:0.70, ridge:0.90, ero:0.50, sea:0,  rain:0.45}
];
