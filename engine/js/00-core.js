/* 00-core.js — CASTAWAY
   기초 — 오류 표시 · 시드 난수와 잡음 · 격자 규격 · 전역 필드(F) · 바이옴·자원 표 · 섬 파라미터(P)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* 브라우저에서만 나는 오류를 화면에 그대로 띄운다. 콘솔을 열지 않아도 원인이 보인다. */
let ERRN=0;
function showErr(where,e){
  if(ERRN++>3) return;                 // 같은 오류가 매 프레임 쏟아지는 걸 막는다
  const el=document.getElementById('err');
  if(!el) return;
  const msg=(e&&e.message)||String(e);
  const line=((e&&e.stack)||'').split('\n').slice(0,3).join('\n');
  el.style.display='block';
  el.innerHTML+='<b>['+where+'] '+msg+'</b>\n'+line+'\n\n';
  console.error('['+where+']',e);
}
addEventListener('error',ev=>showErr('전역',ev.error||ev));
addEventListener('unhandledrejection',ev=>showErr('비동기',ev.reason));

let GUARANTEE=true;   // 광종별 최소 수량 보장

/* ---------------- 시드 PRNG & 노이즈 ---------------- */
function hashStr(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const smoothstep=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const fadeC=t=>t*t*t*(t*(t*6-15)+10);

// 시드 기반 Perlin 2D (값 노이즈보다 격자 아티팩트가 적음)
function makePerlin(seed){
  const rnd=mulberry32(seed);
  const perm=new Uint8Array(256);
  for(let i=0;i<256;i++) perm[i]=i;
  for(let i=255;i>0;i--){ const j=(rnd()*(i+1))|0; const t=perm[i]; perm[i]=perm[j]; perm[j]=t; }
  const p=new Uint8Array(512);
  for(let i=0;i<512;i++) p[i]=perm[i&255];
  const GX=[1,-1,1,-1,1,-1,0,0], GZ=[1,1,-1,-1,0,0,1,-1];
  return function(x,z){
    const xi=Math.floor(x), zi=Math.floor(z);
    const X=xi&255, Z=zi&255, xf=x-xi, zf=z-zi;
    const u=fadeC(xf), v=fadeC(zf);
    const aa=p[p[X]+Z], ba=p[p[X+1]+Z], ab=p[p[X]+Z+1], bb=p[p[X+1]+Z+1];
    const g=(h,dx,dz)=>GX[h&7]*dx+GZ[h&7]*dz;
    const x1=lerp(g(aa,xf,zf), g(ba,xf-1,zf), u);
    const x2=lerp(g(ab,xf,zf-1), g(bb,xf-1,zf-1), u);
    return lerp(x1,x2,v); // 대략 -1..1
  };
}

/* ---------------- 그리드 규격 ---------------- */
const N = 768;              // 시뮬레이션 격자 (N×N)
/* **섬 배율**(`P.ws`) — 섬은 늘 칸 2.5 m(GCELL) · 한 변 1,920 m 로 **만든 뒤**, 통째로 ws 배로 키운다(`worldRescale` — 10-worldgen.js).
   가로·세로·높이를 같이 키우므로 생김새(비탈·바이옴의 배치)는 그대로고 크기만 달라진다: 2배면 한 변 3,840 m · 넓이 4배 ·
   바이옴 하나의 너비도 2배 · 산도 2배 높다. 격자 수(N)는 그대로라 만드는 시간과 메모리는 거의 같다.
   · 같은 시드의 섬은 배율이 달라도 같은 모양이다. 저장에 배율이 들어 있고, 없는 옛 저장은 1 로 읽는다(예전 섬 그대로 열린다).
   · 그래서 `CELL` · `WORLD` · `HALF` 는 상수가 아니다 — 섬을 만들 때마다 `setWorldScale` 이 다시 정한다.
     **불러오는 순간 도는 코드에서 이 셋으로 다른 상수를 만들어 두면 안 된다**(함수 안에서 읽을 것). */
const GCELL = 2.5;          // 섬을 '만들 때' 의 칸 한 변(m) — 지형 생성·침식·하천은 늘 이 크기로 센다
let CELL = GCELL;           // 세상의 칸 한 변 = GCELL × 섬 배율
let WORLD = N*CELL;         // 섬 한 변(m) — 배율 1 이면 1,920 m
let HALF = WORLD/2;
function setWorldScale(s){ CELL=GCELL*s; WORLD=N*CELL; HALF=WORLD/2; }

/* ---------------- 전역 필드 ---------------- */
const F = {
  elev:  new Float32Array(N*N),   // 표고 (m, 해수면 0)
  slope: new Float32Array(N*N),   // 경사 (수직/수평 비)
  moist: new Float32Array(N*N),   // 습도 0..1
  flow:  new Float32Array(N*N),   // 흐름 누적량
  twi:   new Float32Array(N*N),   // 지형습윤지수 ln(a/tanβ)
  wlev:  new Float32Array(N*N),   // 하천 수면 표고 (하도 셀만)
  fuma:  new Float32Array(N*N),   // 열수 활동 세기 0~1 (분기공 지대)
  dWater:new Float32Array(N*N),   // 수역까지 거리 (m)
  dRiver:new Float32Array(N*N),   // 하천까지 거리 (m)
  biome: new Uint8Array(N*N),
  river: new Uint8Array(N*N)
};
const IDX=(x,z)=>z*N+x;

/* ---------------- 바이옴 정의 ---------------- */
const B = {
  DEEP:0, SHELF:1, BEACH:2, DUNE:3, MARSH:4, MEADOW:5,
  BROADLEAF:6, CONIFER:7, SCRUB:8, ROCK:9, SCREE:10, RIVER:11, FUMAROLE:12
};
/* 바이옴 색 = 실제 지표면의 가시광 반사율(알베도)을 sRGB 로 옮긴 것 — 마른 모래 0.35~0.45(밝은
   베이지), 풀밭 0.18~0.25(연두), 활엽수림 바닥 0.12~0.15, 침엽수림 0.08~0.10(가장 어둡다),
   노출 암반 0.20~0.30(회갈), 젖은 이탄지 0.08. 예전 값은 한 톤 어둡고 회색에 가까워 섬 전체가
   칙칙한 올리브였다. 물 밑 바이옴(심해·연안)은 물 셰이더가 덮으므로 바닥 모래·펄 색이다. */
const BIOME_INFO=[
  {n:'심해',       c:0x3e4a44},
  {n:'연안',       c:0x8c8466},
  {n:'모래 해변',  c:0xcdbb8c},
  {n:'해안 사구',  c:0xbfae82},
  {n:'습지/이탄지',c:0x4c5634},
  {n:'초원',       c:0x7a9142},
  {n:'활엽수림',   c:0x4f6a2e},
  {n:'침엽수림',   c:0x3b5230},
  {n:'건조 관목지',c:0x9a8c5c},
  {n:'노출 암반',  c:0x7b756a},
  {n:'애추 사면',  c:0x8d877b},
  {n:'하천',       c:0x5c5a44},
  {n:'분기공 지대', c:0xb8a24e}
];

/* ---------------- 자원(지질 규칙) ---------------- */
// why: 채집 → 제작 트리를 현실 지질에 맞춰 묶어두면 탐사 동선이 자연히 생김
// d = 적합 셀당 배치 확률 (셀 = 16 m²) · max = 상한 · min = 최소 보장 수량
// why: 지형이 극단적으로 나와도 제작 트리가 끊기지 않도록 광종별 하한을 둔다
const RESOURCES=[
  {k:'oak',    n:'참나무',        c:0x3f5a33, use:'목재 · 참숯 · 도토리',    d:0.26, max:2200, min:80},
  {k:'fir',    n:'전나무',        c:0x2b4438, use:'목재 · 송진 · 역청',      d:0.26, max:1800, min:50},
  {k:'flint',  n:'부싯돌',        c:0x2a2f33, use:'뗀석기 날 · 발화',        d:0.10, max:520,  min:45},
  {k:'pebble', n:'돌멩이',        c:0x76736c, use:'망치돌 · 모닥불 · 도끼날',   d:0.35, max:3000, min:180},
  {k:'sulfur', n:'유황 침전',      c:0xd8c23a, use:'화약 재료 — 분기공 둘레에만',
   d:0.55, max:400, min:40},
  {k:'granite',n:'화강암 노두',   c:0x6b6b66, use:'화입법으로만 채석 (불 필요)', d:0.07, max:520,  min:45},
  {k:'clay',   n:'점토 노출지',   c:0x8a7150, use:'토기 · 도가니 · 화로',    d:0.09, max:320,  min:28},
  {k:'sand',   n:'모래 언덕',     c:0xc9b98a, use:'유리 원료 — 빈 토기에 담는다',  d:0.30, max:600,  min:30},
  {k:'grass',  n:'풀숲',          c:0x55702f, use:'풀잎 · 베리 · 노끈 재료',  d:3.40, max:40000,min:400},
  {k:'reed',   n:'갈대/부들',     c:0x7d8a4e, use:'섬유 · 밧줄 · 지붕',      d:1.10, max:5000, min:45},
  {k:'copper', n:'공작석(구리)',  c:0x3fa98a, use:'제련 → 구리 도구',        d:0.05, max:160,  min:22},
  {k:'tin',    n:'석석(주석)',    c:0x6d5a44, use:'하천 사광 → 청동 합금',   d:0.05, max:80,   min:18},
  {k:'iron',   n:'늪철광',        c:0x9c5a2e, use:'괴련철 → 철기',           d:0.14, max:180,  min:24},
  {k:'coal',   n:'석탄 노두',     c:0x1b1b1e, use:'고온 연료 · 코크스',      d:0.09, max:140,  min:20},
  // 섬아연석: 열수 광맥에 구리와 함께 든다 — 분기공 가까운 암반일수록 짙다
  {k:'zinc',   n:'섬아연석(아연)', c:0x5d4a52, use:'제련 → 아연 · 구리와 합금 → 황동',
   d:0.04, max:110,  min:16},
  /* 방연석: 섬아연석과 같은 열수 광맥에 든다. 표의 맨 끝에 두는 것이 중요하다 —
     배치가 이 차례대로 난수를 뽑으므로, 중간에 끼우면 뒤의 자원이 전부 다른
     자리에 서고 같은 시드가 다른 섬을 연다. */
  {k:'galena', n:'방연석(납)',     c:0x585d66, use:'제련 → 납 · 축전지의 극판',
   d:0.035, max:90,  min:14},
  /* 진사: 수은의 광석. 분기공이 뿜은 열수가 식으면서 앉는 붉은 딱지라
     유황과 같은 자리에 난다. 여기도 표의 맨 끝이다 — 난수 차례를 밀지 않는다. */
  {k:'cinnabar', n:'진사(수은)',   c:0xa03a32, use:'구우면 수은 — 뇌관의 뇌홍',
   d:0.30, max:70,  min:12},
  /* 지형 판 6 — 광석이 굴로 들어간 자리의 바위(10-worldgen.js surfaceRocks). 흩뿌리지 않으므로 d · min 은 0 이다 */
  {k:'basalt',   n:'현무암 노두',   c:0x3c3d3f, use:'기둥 결로 쪼개 판돌 — 달궈 돌판구이', d:0, max:300, min:0},
  {k:'karst', n:'석회암 노두',   c:0xc8c2b0, use:'무른 흰 돌 — 석회석 · 부싯돌 단괴',  d:0, max:300, min:0},
  {k:'sandstone', n:'사암 노두',     c:0xb48c62, use:'켜를 따라 떼는 무른 석재 — 돌 곡괭이면 된다', d:0, max:300, min:0}
];

/* ---------------- 파라미터 ---------------- */
const P = { seed:'castaway', size:0.70, ridge:0.85, ero:0.60, sea:0, rain:1.0, limb:0.8,
            ws:6,     // ws 섬 배율(1 = 1.9 km · 2 = 3.8 km · 3 = 5.8 km · 6 = 11.5 km) — 새 섬은 6배로 시작한다(예전 기본 2배의 넓이 아홉 배)
            tv:7 };   // tv 지형 판 — 7: 저수지 폭포(물머리 뒤에 저수지 · 바위벽 턱 · 소 — 36-falls.js) · 땅속 세계(37-underworld.js) — 6: 광석은 굴 속에만(늪철광 빼고) · 바깥은 화강암 · 현무암 · 석회암 · 사암 · 산허리가 솟은 굴 자리는 버린다 — 5: + 바이옴마다 비탈 · 바닷가 지형(주상절리·해식 아치·시스택·염습지) · 지열 지대(온천·간헐천·진흙 웅덩이·석회화 단구) · 폭포 — 4: + 바다 밑의 갈라진 틈과 해구(seaTrenches) · — 2: 피오르·골짜기·절벽·단구·산릉·동굴(10-worldgen.js terrainFeatures) · 3: + 칸 안의 잔 기복(`RELIEF`) · 없으면(옛 저장) 1
let windDir={x:1,z:0,name:'서풍'};
let stats={};
