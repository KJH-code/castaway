/* 66-decay.js — CASTAWAY
   상하는 먹을 것 — 날생선의 신선도 · 상한 음식 · 비에 꺼지는 불의 가림(지붕·나무 밑)
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   상하는 먹을 것(사용자 요청)
   ----------------------------------------------------------------------------
   먹을 것과 그 재료는 시간이 지나면 상한다 — 소지품에 있든 상자·바구니·모닥불 안에 있든.
     · 종류마다 버티는 시간(`ITEMS[id].rot` — 게임 시간): 날생선 14 · 날고기·새알 20 · 국 16 · 버섯 30 · 익힌 것 40 ·
       바닷말·고사리 48 · 과일 60 · **소금에 절인 것 · 말린 것 · 육포 400**(소금을 치는 까닭이다). 꿀·소금은 안 상한다.
     · 칸마다 '들어온 때'(`t` — 게임 시간)를 적는다. 같은 것을 더 얹으면 개수로 가중해 평균한다(`freshMerge`).
       상자로 옮겨도 그 나이를 들고 간다(`DECAY.carry` — 옮긴다고 새것이 되지 않는다).
     · 다 버티면 그 칸이 통째로 **상한 음식**(`rot_food`)이 된다 — 먹으면 크게 탈이 난다.
     · 나이가 7할을 넘은 것이나 상한 음식이 든 곳에는 **파리가 꼬인다** — 상자·바구니·모닥불 둘레, 소지품이면 사람 둘레.
   굽거나 끓이면 새 음식이라 나이가 처음부터다.
   ========================================================================== */
const DECAY={carry:null, t:0, pts:null, spots:[], inv:false, said:false};
{ /* **상하는 것은 날생선뿐**(사용자 요청 — 2026-10-14) — 얻은 지 게임 72시간(사흘)이면 상한다. 굽거나 소금에 절이거나 말린 것,
     다른 먹을 것은 안 상한다(예전엔 모든 먹을 것이 14~400시간에 상했다) */
  for(const id in ITEMS){ const T=ITEMS[id]; if(!T.food||T.spoiled) continue;
    const rawFish=!!T.fishy&&(T.raw||(T.tags&&T.tags.indexOf('fish')>=0))&&!/cooked|grill|salt|dried|smoke|jerky|stew/.test(id);
    T.rot=rawFish?72:0; }
}
/* 칸에 n 개를 더 얹을 때 — 들어온 때를 개수로 가중해 평균한다. tNew 가 없으면 지금 */
function freshMerge(sl,nBefore,nAdd,tNew){
  if(!ITEMS[sl.id].rot) return;
  const t1=(tNew===null||tNew===undefined)?gameHours:tNew;
  sl.t=(sl.t===undefined||nBefore<=0)?t1:(sl.t*nBefore+t1*nAdd)/(nBefore+nAdd);
}
/* 0(갓 얻었다)~1(상한다) */
const freshAge=sl=>{ const r=ITEMS[sl.id].rot; return r&&sl.t!==undefined?(gameHours-sl.t)/r:0; };
/* 소지품 줄에 붙는 말 — 반을 넘기면 '시들었다', 8할이면 '곧 상한다' */
function freshTag(sl){
  const a=freshAge(sl); if(a<0.5) return '';
  return '<span class="eq" style="color:'+(a<0.8?'#c9b46a':'#d0705a')+'">'+(a<0.8?'시듦':'곧 상함')+'</span>';
}
/* 프레임마다 부르되 게임 3분에 한 번만 훑는다 — 소지품과 모든 통의 칸 */
function updateDecay(dh){
  DECAY.t+=dh; if(DECAY.t<0.05) return; DECAY.t=0;
  const scan=(slots)=>{ let bad=false;
    for(const sl of slots){ const T=ITEMS[sl.id]; if(!T) continue;
      if(T.spoiled){ bad=true; continue; }
      if(!T.rot) continue;
      if(sl.t===undefined){ sl.t=gameHours; continue; }
      const a=(gameHours-sl.t)/T.rot;
      if(a>=1){ sl.id='rot_food'; delete sl.t; bad=true; invDirty=true; boxDirty=true; }
      else if(a>0.7) bad=true; }
    return bad; };
  const was=DECAY.inv; DECAY.inv=scan(INV.slots);
  if(INV.slots.some(s=>s.id==='rot_food')&&!DECAY.said){ DECAY.said=true; toast('날생선이 상했다 — 버릴 것. 사흘 안에 굽거나 소금에 절이면 안 상한다'); }
  if(!INV.slots.some(s=>s.id==='rot_food')) DECAY.said=false;
  DECAY.spots.length=0;
  for(const list of [STORES,FIRES,FURNACES]) for(const c of list){ if(c.slots&&c.slots.length&&scan(c.slots)) DECAY.spots.push(c); }
}
/* (상한 것 둘레에 꼬이던 파리는 걷었다 — 사용자 요청) */

/* ── 비와 불(사용자 요청) ────────────────────────────────────────────────────
   비가 오면 **한데 있는 불은 꺼질 수 있다** — 지붕 밑이나 나무 밑이면 안 꺼진다. 모닥불이 가장 약하고(폭우에 게임 한 시간
   평균 0.6번), 돌을 두른 화덕은 그 1/6, 제련로는 거의 안 꺼진다(1/60). 가려졌는지는 불을 볼 때 알려 준다(82-hud.js).
   가림: 그 칸 위에 지은 지붕·경사 지붕이 있거나, 숲 덮임(41-terrain-light.js 의 B)이 4할을 넘거나, 굴 속이다 */
function fireShelter(f){
  const gx=Math.round(f.x/CELL_B), gz=Math.round(f.z/CELL_B);
  for(let L=0;L<8;L++) if(ROOFS.has(rkey(gx,gz,L))||SLOPES.has(rkey(gx,gz,L))) return '지붕 밑';
  if(caveAt(f.x,f.z,-0.5)) return '굴 속';
  if(TLIT.px){ const i=IDX(clamp(Math.round(f.x/CELL+N/2),0,N-1),clamp(Math.round(f.z/CELL+N/2),0,N-1))*4; if(TLIT.px[i+2]>102) return '나무 밑'; }
  return '';
}
function fireRain(f,dh,k){
  if(!f.lit||dh<=0||WEA.rain<0.2||fireShelter(f)) return false;
  if(Math.random()>=k*WEA.rain*dh) return false;
  f.lit=false; if(f.flame) f.flame.visible=false; if(f.light) f.light.intensity=0;
  if(Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z)<40) toast('비에 '+f.cname+'의 불이 꺼졌다 — 지붕이나 나무 밑에 두면 안 꺼진다');
  return true;
}
