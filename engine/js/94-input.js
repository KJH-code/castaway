/* 94-input.js — CASTAWAY
   입력과 설정 — 키보드·마우스·터치 · 창 여닫기 · 일시정지 · 설정 창
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ---------------- 입력 ---------------- */
/* 마우스 잠그기 — 브라우저가 거절해도 조용히 넘어간다.
   requestPointerLock 은 요즘 브라우저에서 약속(Promise)을 돌려주고, 잠기기 전에 Esc 를 누르거나 창을 열었다
   곧바로 닫으면 그 약속이 거절된다. 받아 주는 데가 없어 화면 위에 붉은 '[비동기] …pointer lock' 오류 띠가 떴다.
   거절은 흔한 일이고 다음 클릭에 다시 잠기므로 오류로 치지 않는다. */
function lockPointer(){
  if(typeof uiOpen==='function'&&uiOpen()) return;   // 창이 열려 있으면 잠그지 않는다(눌러야 할 단추가 있다)
  try{ const p=cv.requestPointerLock(); if(p&&typeof p.catch==='function') p.catch(()=>{}); }catch(e){}
}
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
// 터치스크린 달린 노트북은 isTouch 가 true 지만 마우스도 있다.
// 두 가지를 구분하지 않으면 PC에서 터치 UI가 화면을 덮고 키보드 입력이 덮어써진다.
const _mq=q=>window.matchMedia?matchMedia(q).matches:false;
const _fine=_mq('(any-pointer:fine)'), _coarse=_mq('(any-pointer:coarse)');
// 굵은 포인터만 확실히 감지될 때에만 터치 전용으로 본다. 애매하면 마우스로 친다.
let hasMouse=_fine||!_coarse;
let touchOnly=isTouch&&!hasMouse;
function setTouchUI(on){
  touchOnly=on; hasMouse=!on;
  document.getElementById('touch').style.display=on?'block':'none';
  if(on&&document.pointerLockElement) document.exitPointerLock();
}
addEventListener('keydown',e=>{
  if(BENCH.on){ e.preventDefault(); if(e.code==='Escape') benchEnd(true); return; }   // 벤치마크 중 — Esc 로 멈추기만
  /* 예/아니오를 묻는 상자가 떠 있으면 게임은 아무 키도 받지 않는다.
     상자 쪽 처리는 위에서 캡처로 끝냈다 — 여기서는 그냥 물러선다. */
  if(askOpen) return;
  /* 검색칸(이나 시드칸)에 글자를 치는 중이면 게임 키로 받지 않는다.
     이게 없으면 '철'을 치는 동안 캐릭터가 걷고 창을 여닫는다. */
  const el=document.activeElement;
  if(el && (el.tagName==='INPUT'||el.tagName==='TEXTAREA')){
    if(e.code==='Escape'){
      if(el.id==='crfS'&&el.value){ el.value=''; craftQuery=''; craftDirty=true; }
      el.blur();
    }
    return;
  }
  /* 그림판이 열려 있으면 게임 키는 받지 않는다 — Esc 로 닫기만 */
  /* 키는 행동 이름으로 켠다 — 이 글쇠에 걸린 행동 전부(93-keys.js · 바꾼 키가 그대로 듣는다) */
  for(const a of KB_BY[e.code]||[]) keys[a]=true;
  if(e.code==='Space'||kbHit(e,'jump')) e.preventDefault();
  if(kbHit(e,'map')&&!e.repeat&&(landed||mapOpen)){ toggleMap(); }   // 지도 펴기(4배 · 마우스가 풀려 핀을 꽂는다 — 82-hud.js) ↔ 접기
  if(e.code==='Escape'&&mapOpen){ toggleMap(false); return; }
  if(kbHit(e,'lamp')){ toggleLamp(); }         // 전등은 들고 좌클릭해도 켜진다 · 충전은 우클릭
  if(e.code==='Escape'&&boxOpen){ toggleBox(null); }
  if(kbHit(e,'close')&&boxOpen&&!e.repeat){ toggleBox(null); }
  else if(kbHit(e,'close')&&!e.repeat&&!grindOpen&&!uiOpen()&&typeof boatToggle==='function') boatToggle();   // 배 타기 · 내리기(96-sea.js)
  if((e.code==='Escape'||kbHit(e,'close'))&&grindOpen&&!e.repeat){ toggleGrind(); return; }
  /* I — 가방 화면(소지품 + 고른 물건 + 제작이 한 장에 선다 · 98-bag.js). 예전엔 C 로도 열렸고 그때는 검색칸에 바로 글자가
     쳐졌다 — C 를 누르고 I 를 누르면 가방이 닫히는 대신 검색칸에 'i' 가 쳐졌다(사용자 지적). 이제 여는 키는 I 하나고,
     검색칸은 **눌러야** 글자를 받는다. C 는 앉기만 한다 */
  if(e.code==='Escape'&&(invOpen||craftOpen)){ e.preventDefault(); closeBag(); return; }
  if(e.code==='Escape'&&BUILD.on){ exitBuild(); toast('짓기 끝'); BUILD_ESC_T=performance.now(); }   // 짓기 중 Esc — 그만두기(잠긴 마우스도 같이 풀린다 · 일시정지 화면은 안 띄운다 — 아래 pointerlockchange)
  if(kbHit(e,'bag')&&!e.repeat){ toggleBag(); }
  /* F3 — 성능 창(예전의 '진단' 상자는 성능 창 맨 아래 줄로 옮겼다) */
  if(kbHit(e,'perf')){ e.preventDefault(); PERF.toggle(); }
  if(kbHit(e,'save')){ e.preventDefault(); saveLocal(); }
  if(kbHit(e,'load')){ e.preventDefault(); askLoad(); }
  if(kbHit(e,'dex')||(e.code==='Escape'&&dexOpen)){ e.preventDefault(); toggleDex(); return; }
  if(kbHit(e,'bFlip')&&BUILD.on){               // 삼각 벽 방향 뒤집기 (아크의 좌/우 경사벽)
    BUILD.hand=-BUILD.hand;
    toast('삼각 벽 방향 — '+(BUILD.hand>0?'오른쪽':'왼쪽'));
    bldSig=null; return;
  }
  /* 먹고 마시고 감는 것은 손에 들고 좌클릭한다(useHeld) — F 는 없앴다. */
  if(kbHit(e,'bUndo')&&BUILD.on){ undoBuild(); return; }   // 짓기 중엔 걷어내기
  if(kbHit(e,'drop')&&!e.repeat&&INV.slots.length){   // 고른 것 버리기 — 묻고 버린다 · Shift 전부 · Ctrl 묻지 않음(50-items.js dropSlot)
    const s0=INV.slots[INV.sel];
    if(s0) dropSlot(s0, e.shiftKey?s0.n:1, e.ctrlKey||e.metaKey);
  }
  if(/^Digit[0-9]$/.test(e.code)){
    const i=(+e.code.slice(5)+9)%10;          // 0 은 열 번째 자리
    // 소지품창이 열려 있으면 슬롯 번호, 아무것도 안 열려 있으면 빠른 칸이다.
    // (제작은 레시피가 쉰 개가 넘어 번호로 못 닿는다 — 검색칸으로 찾는다)
    if(invOpen||boxOpen||dexOpen){ if(i<INV.slots.length){ INV.sel=i; invDirty=true; } }
    else if(BUILD.on){                           // 1~5 조각 · 6·7·8 등급
      if(i<BKIND.length){ BUILD.kind=BKIND[i]; toast(BKIND_N[BUILD.kind]); bldSig=null; }
      else if(i===BKIND.length){                 // 8 — 등급을 돌린다
        BUILD.tier=(BUILD.tier+1)%BTIER.length;
        toast(BTIER[BUILD.tier].n+' 등급'); bldSig=null;
      }
    }
    else if(!craftOpen && i<QUICK.length) quickSwap(i);
  }
  if(kbHit(e,'dev')&&!e.repeat){ toggleDev(); }   // 기본 ; — 개발자 모드(사용자 요청 — ` 는 한글 자판에서 ₩ 라 안 눌렸다 · 키 창에서 바꾼다)
  if(DEV.on&&(kbHit(e,'devNext')||kbHit(e,'devPrev'))&&!e.repeat){ devCave(kbHit(e,'devNext')?1:-1); }   // 개발자 모드 — 굴 둘러보기   // 개발자 모드 — 날아서 둘러보기 · 다치지 않는다(80-player.js)
  if(kbHit(e,'fly')){ flyMode=!flyMode; document.getElementById('bFly').classList.toggle('on',flyMode); }
  /* T — 시간 배속. 20배를 넣어 두었다: 하늘과 날씨를 살펴볼 때 1배는 너무 느리고
     60배는 하루가 24초라 너무 빠르다. 20배면 게임 하루가 72초다.
     주소 뒤에 ?t=20 을 붙이면 그 배속으로 시작한다. */
  if(kbHit(e,'time')){
    timeScale = timeScale===1?20:(timeScale===20?60:(timeScale===60?300:1));
    toast('시간 '+timeScale+'배 — 하루가 '+(24*60/timeScale).toFixed(0)+'초');
  }
  if(kbHit(e,'rot')&&BUILD.on){ buildRotate(1); return; }    // 돌리기 — 짓는 중엔 조각 방향
  if(kbHit(e,'rot')&&MOVE.t){ moveRotate(e.shiftKey?-1:1); return; }   // 옮기는 중엔 설비(Shift 반대)
  if(kbHit(e,'move')&&!e.repeat&&!uiOpen()&&!BUILD.on){ if(MOVE.t) moveCancel(); else moveStart(); }   // 옮기기 — 집어 들기 · 그만두기(60-stations.js)
  if(kbHit(e,'newIsle')){ newIsland(generateWorld); }
  if(kbHit(e,'build')){                         // 짓기 모드
    if(BUILD.on){ exitBuild(); toast('짓기 끝'); }
    else if(PL.under) toast('땅속에서는 지을 수 없다');
    else enterBuild(null);
  }
  if(kbHit(e,'reload')){                       // 재장전
    const w=equippedWeapon(), W=w&&ITEMS[w.id].tool;
    if(w&&W.gun&&RELOAD.t<=0) startReload(w,W);
  }
  if(kbHit(e,'cfg')){ e.preventDefault(); toggleCfg(); }
});
addEventListener('keyup',e=>{ for(const a of KB_BY[e.code]||[]) keys[a]=false; });   // E 는 이제 열린 창 닫기만 — 여는 것은 좌클릭(releaseE)
/* 좌클릭을 짧게 눌렀다 떼면 눈앞의 용기·문짝·숫돌·발전기를 다룬다(사용자 요청 — 예전엔 E). 길게 누른 것은 모닥불을 다룬 것이므로
   손을 뗐다고 창이 열리면 안 된다. */
function releaseE(){
  const c=EK.tgt, held=EK.hold;
  EK.tgt=null; EK.hold=0;
  if(!c || boxOpen || grindOpen || paused || busy) return;
  if(c.kind==='fit'){ if(held<E_TAP+0.35) toggleFit(c.w); return; }
  if(c.kind==='grind'){ if(held<E_TAP+0.35) toggleGrind(); return; }
  if(c.kind==='power'){ if(held<E_TAP+0.35) chargeAtDynamo(); return; }
  if(held<E_TAP) toggleBox(c);
}
// 알트탭 등으로 포커스를 잃으면 눌린 키가 그대로 남는다
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch') return;              // 손가락 탭으로는 잠그지 않는다
  /* **창이 열려 있으면 잠그지 않는다.** 이게 빠져 있어서, 소지품이나 상자를 연 채로
     화면 아무 데나 누르면 포인터가 잠겨 커서가 사라졌다 — 창은 그대로 떠 있는데
     누를 방법이 없어진다. 창을 닫아야 풀렸다. */
  if(!paused&&!flyMode&&!uiOpen()&&document.pointerLockElement!==cv) lockPointer();
});
addEventListener('mousemove',e=>{
  if(flyMode){
    if(dragF){ fly.th-=e.movementX*0.005; fly.ph=clamp(fly.ph-e.movementY*0.004,0.06,1.5); }
    return;
  }
  if(document.pointerLockElement!==cv) return;
  const ms=0.0022*SENS*(PL.aimMul||1);           // 감도(설정) · 조준경을 들여다보면 둔해진다
  PL.yaw-=e.movementX*ms;
  PL.pitch=clamp(PL.pitch-e.movementY*ms,-1.5,1.5);
});
let dragF=false;
let mouseDown=false, useDown=false;
cv.addEventListener('mousedown',e=>{
  if(flyMode){ dragF=true; return; }
  if(document.pointerLockElement!==cv) return;
  /* 좌클릭 — 쓰기(공격·채집·먹기 전부) · 짓기 중엔 조각 놓기. 우클릭 — 조준경 · 충전. */
  if(MOVE.t){ if(e.button===0) movePlace(); else if(e.button===2) moveCancel(); return; }   // 옮기는 중 — 좌클릭 놓기 · 우클릭 그만두기
  if(e.button===0){
    if(BUILD.on) doBuild();
    else if(LEVEL.on) doLevel();                 // 시멘트를 들었다 — 터 다지기(62-build.js)
    else { useDown=true; if(!facing()) useHeld(); }   // 설비를 보고 있으면 손의 것을 안 쓴다(뗄 때 releaseE)
  }
  if(e.button===2){
    if(BUILD.on){ exitBuild(); toast('짓기 끝'); }      // 짓기 중 우클릭 — 그만두기
    else{ mouseDown=true; chargeHeld(); }
  }
});
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('mouseup',e=>{ dragF=false;
  if(e.button===0){ const was=useDown; useDown=false; if(was) releaseE(); }
  else if(e.button===2) mouseDown=false; });
/* 눈앞에 설비(문짝·상자·모닥불·제련로·숫돌·발전기)가 있나 — 그때 좌클릭은 공격·먹기가 아니라 설비 조작이다 */
function facing(){ return !!(HARV.fit||HARV.cont); }
addEventListener('blur',()=>{ mouseDown=false; useDown=false; });
cv.addEventListener('wheel',e=>{ if(MOVE.t){ moveRotate(Math.sign(e.deltaY)); e.preventDefault(); return; }
  if(DEV.on&&!flyMode){ DEV.sp=clamp(DEV.sp*(e.deltaY<0?1.25:0.8),0.25,8); e.preventDefault(); return; }   // 개발자 모드 — 휠로 나는 빠르기
  if(flyMode){ fly.r=clamp(fly.r*(1+Math.sign(e.deltaY)*0.12),40,1600); e.preventDefault(); } },{passive:false});
let BUILD_ESC_T=0;
document.addEventListener('pointerlockchange',()=>{
  /* **잠금이 늦게 걸리면 바로 푼다.** 잠금은 요청하고 한참 뒤(브라우저가 받아 줄 때) 걸린다 — 상륙하거나 창을 닫으며 요청해 둔 잠금이
     그사이 C·I 로 연 가방 위에서 걸리면 커서가 사라지고 모든 클릭이 캔버스로 갔다(제작 창에서 소지품을 눌러도 안 넘어가던 버그).
     창이 열려 있거나 멈춘 동안 걸린 잠금은 곧바로 놓아 준다 */
  if(document.pointerLockElement===cv && (uiOpen()||paused)){ document.exitPointerLock(); return; }
  /* 짓기 중에 Esc 로 잠금이 풀렸으면 짓기만 끝내고 멈추지 않는다(사용자 요청 — '짓기 끝' 뒤에 일시정지 화면이 떴다).
     브라우저가 Esc 를 잠금 풀기로 먹어 keydown 이 안 올 수도 있어 여기서도 본다. 다시 누르면 잠긴다(mousedown) */
  if(document.pointerLockElement!==cv && MOVE.t){ moveCancel(); toast('옮기기를 그만뒀다'); return; }   // Esc — 제자리로
  if(document.pointerLockElement!==cv && (BUILD.on||performance.now()-BUILD_ESC_T<800)){
    if(BUILD.on){ exitBuild(); toast('짓기 끝'); }
    BUILD_ESC_T=0; return;
  }
  if(document.pointerLockElement!==cv && !paused && !flyMode && !busy && !touchOnly
     && !uiOpen()) pause();
});
/* 창(소지품·제작·사전·설정)이 열려 있으면 마우스를 풀어 줘야 클릭할 수 있다.
   포인터가 잠긴 채로는 커서가 없어 UI를 누를 방법이 없다. */
let cfgOpen=false;
const uiOpen=()=>invOpen||craftOpen||dexOpen||cfgOpen||boxOpen||grindOpen||askOpen||mapOpen||KBW.open;
/* 이 창들이 열려 있는 동안은 세상이 멈춘다(loop) */
const uiHold=()=>dexOpen;
function syncLock(){
  if(!hasMouse||paused||flyMode) return;
  if(uiOpen()){
    if(document.pointerLockElement===cv) document.exitPointerLock();
  }else if(document.pointerLockElement!==cv){
    /* 창을 닫는 순간은 아직 사용자 조작(키·클릭) 안이라 브라우저가 잠금을 받아 준다.
       먼저 그 자리에서 시도하고, 거절당하면(해제 직후 잠깐 막는 브라우저가 있다)
       조금 뒤 한 번 더 — 그래도 안 되면 화면을 누르면 잠긴다. */
    try{ lockPointer(); }catch(e){}
    setTimeout(()=>{ try{ if(!uiOpen()&&!paused&&!flyMode&&document.pointerLockElement!==cv)
                            lockPointer(); }catch(e){} },140);
  }
}
function pause(){
  paused=true; audioPause(true);
  const ov=document.getElementById('ov');
  ov.classList.remove('title');                     // 간판의 지직거림 · 올라가는 글은 처음 여는 화면에서만(멈춤 화면은 가만히)
  ov.querySelector('h1').textContent='일시정지';
  ov.querySelector('.s').textContent='시드 '+P.seed+' · '+BIOME_INFO[sampleAt(PL.pos.x,PL.pos.z).biome].n;
  document.getElementById('bStart').textContent='계속';
  ov.style.display='flex';
}
function start(){
  if(!landed&&gameHours<0.01) setTimeout(()=>toast('가방(I)에 생존 안내서가 있다 — 눌러서 읽어 보라'),1800);   // 처음 상륙
  landed=true;
  if(PL.dead) revivePL();
  paused=false; initAudio(); audioPause(false);
  fireWarm();                                       // 불꽃 셰이더를 미리 짠다(62-build.js — 놀이 때와 같은 광원 수에서 · 한 번만)
  document.getElementById('ov').style.display='none';
  if(!flyMode&&hasMouse) lockPointer();
}
document.getElementById('bStart').onclick=start;
/* 설정 창 — Tab · 시작/일시정지 화면의 '설정' · 창의 '닫기'. 시작 화면 위에도 떠서 상륙 전에 그래픽을 맞출 수 있다 */
function toggleCfg(on){
  cfgOpen=on===undefined?!cfgOpen:!!on;
  document.getElementById('cfg').style.display=cfgOpen?'block':'none';
  if(cfgOpen){ invOpen=craftOpen=dexOpen=false;
    document.getElementById('inv').style.display='none';
    document.getElementById('crf').style.display='none';
    document.getElementById('dex').style.display='none'; drawSlots(); }
  syncLock();
}
document.getElementById('bOpt').onclick=()=>toggleCfg(true);
document.getElementById('bCfgX').onclick=()=>toggleCfg(false);
document.getElementById('bKeys').onclick=()=>kbwToggle(true);   // 키 창(93-keys.js)
/* 소리 — 일시정지 · 창을 내리면 멈추고, 계속하면 다시 낸다 */
function audioPause(on){ if(!A.ctx) return; try{ on?A.ctx.suspend():A.ctx.resume(); }catch(e){} }
let winHidden=false;           // 데스크톱 판에서 창을 내렸나(브라우저는 document.hidden 이 알려 준다)
document.addEventListener('visibilitychange',()=>{ if(document.hidden) audioPause(true); else if(!paused&&!winHidden) audioPause(false); });
/* 창이 **앞에 있지 않으면** 놀이를 멈추고 소리를 끈다 — 예전엔 창이 가려지지만 않으면(다른 앱을 쓰는 동안에도) 바람·파도 소리가
   계속 났고 배고픔·시간도 흘렀다(사용자 지적: 안 하는데도 바람 소리가 난다). 돌아와서 '계속'을 누르면 이어진다 */
addEventListener('blur',()=>{ try{ audioPause(true); if(typeof landed!=='undefined'&&landed&&!paused&&!busy&&!BENCH.on&&!PL.dead) pause(); }catch(e){} });
/* 그래픽이 끊기면(드라이버 재시작 · GPU 메모리) 화면이 멈춘다 — 자동 저장해 두고 다시 불러오기를 권한다 */
cv.addEventListener('webglcontextlost',e=>{
  e.preventDefault();
  const ok=autoSave('');
  ask('그래픽이 끊겼습니다',(ok?'자동 저장해 두었습니다 — ':'')+'다시 불러오면 시작 화면에서 이어서 할 수 있습니다 · Y 다시 불러오기 · N 그대로',
      ()=>location.reload());
});
/* 데스크톱 판만 — 끝내기 · 창 닫기(X · Alt+F4 · Cmd+Q) 때 자동 저장 · 전체 화면 · 저장 폴더 · 판 번호 · 새 판 알림.
   브라우저 탭은 스스로 닫을 수 없어 끝내기가 없다 */
if(DESK){
  const bq=document.getElementById('bQuit'); bq.style.display='';
  bq.onclick=()=>{ if(!landed){ DESK.quit(); return; }
    ask('끝내겠습니까?','지금까지 한 것은 자동 저장에 남습니다 · Y 예 · N 아니오',()=>DESK.quit()); };
  if(DESK.onVisible) DESK.onVisible(v=>{ winHidden=!v; if(!v) audioPause(true); else if(!paused&&!document.hidden) audioPause(false); });
  if(DESK.onBeforeClose) DESK.onBeforeClose(()=>{ try{ autoSave(''); }catch(e){} DESK.closeReady(); });
  document.getElementById('deskG').style.display='';
  document.getElementById('bFull').onclick=()=>DESK.fullscreen();
  document.getElementById('bDir').onclick=()=>DESK.openSaves();
  /* 그래픽 백엔드(ANGLE) — 어떤 PC 는 D3D11 보다 OpenGL·Vulkan 이(또는 반대로) 빠르다. 다시 켜면 적용 · 기본 '자동' */
  if(DESK.gpu&&DESK.setGpu) try{
    const G=DESK.gpu(), sel=document.getElementById('pAngle');
    const NM={default:'그래픽: 자동', d3d11:'그래픽: Direct3D 11', d3d9:'그래픽: Direct3D 9', gl:'그래픽: OpenGL', vulkan:'그래픽: Vulkan', metal:'그래픽: Metal'};
    if(G&&G.choices&&G.choices.length){
      for(const v of ['default',...G.choices]){ const o=document.createElement('option'); o.value=v; o.textContent=NM[v]||v; sel.appendChild(o); }
      sel.value=G.angle||'default'; sel.style.display='';
      sel.onchange=()=>{ if(DESK.setGpu(sel.value)) toast('그래픽 백엔드를 바꿨다 — 다시 켜면 적용된다'); };
    }
  }catch(e){}
  try{ document.getElementById('ovVer').textContent='v'+DESK.info().version; }catch(e){}
  if(DESK.onUpdate) DESK.onUpdate(u=>{ const a=document.getElementById('ovUpd');
    a.href=u.url; a.textContent='새 판 v'+u.version+' 이 나왔습니다 — 받기'; a.style.display=''; });
}

/* 터치 조작 */
let stickId=null,lookId=null,lastL={x:0,y:0},tmv={x:0,y:0};
if(touchOnly){
  document.getElementById('touch').style.display='block';
  const st=document.getElementById('stick'), kn=document.getElementById('knob');
  st.addEventListener('touchstart',e=>{stickId=e.changedTouches[0].identifier;e.preventDefault();},{passive:false});
  addEventListener('touchstart',e=>{
    for(const t of e.changedTouches)
      if(t.identifier!==stickId && t.clientX>innerWidth*0.35 && lookId===null){
        lookId=t.identifier; lastL={x:t.clientX,y:t.clientY};
      }
  },{passive:true});
  addEventListener('touchmove',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===stickId){
        const r=st.getBoundingClientRect();
        let dx=(t.clientX-r.left-r.width/2)/(r.width/2), dy=(t.clientY-r.top-r.height/2)/(r.height/2);
        const L=Math.hypot(dx,dy); if(L>1){dx/=L;dy/=L;}
        tmv={x:dx,y:dy}; kn.style.left=(36+dx*34)+'px'; kn.style.top=(36+dy*34)+'px';
      }else if(t.identifier===lookId){
        PL.yaw-=(t.clientX-lastL.x)*0.005;
        PL.pitch=clamp(PL.pitch-(t.clientY-lastL.y)*0.005,-1.5,1.5);
        lastL={x:t.clientX,y:t.clientY};
      }
    }
    e.preventDefault();
  },{passive:false});
  addEventListener('touchend',e=>{
    for(const t of e.changedTouches){
      if(t.identifier===stickId){
        stickId=null; tmv={x:0,y:0};
        keys.fwd=keys.back=keys.left=keys.right=false;   // 놓을 때 한 번만 해제
        kn.style.left='36px'; kn.style.top='36px';
      }
      if(t.identifier===lookId) lookId=null;
    }
  });
  const bind=(id,fn)=>document.getElementById(id)
    .addEventListener('touchstart',e=>{fn();e.stopPropagation();e.preventDefault();},{passive:false});
  bind('tDash',()=>{keys.dash=true;setTimeout(()=>keys.dash=false,120);});        // 돌진 — 톡(키보드 Q)
  { const tj=document.getElementById('tJump');                                    // 뛰기 — 누르는 순간 뛰고, 누르고 있는 동안은 벼랑 매달리기 · 물속 떠오르기(키보드 Space)
    tj.addEventListener('touchstart',e=>{keys.jump=true;e.stopPropagation();e.preventDefault();},{passive:false});
    tj.addEventListener('touchend',e=>{keys.jump=false;e.stopPropagation();},{passive:false});
    tj.addEventListener('touchcancel',()=>{keys.jump=false;}); }
  bind('tRun',()=>{keys.run=!keys.run;});
  bind('tLight',()=>{ toggleLamp(); });
  bind('tAtk',attack);
  const pk=document.getElementById('tPick');
  pk.addEventListener('touchstart',e=>{keys.close=true;useDown=true;e.stopPropagation();e.preventDefault();},{passive:false});
  pk.addEventListener('touchend',e=>{keys.close=false;useDown=false;releaseE();e.stopPropagation();},{passive:false});
}
function applyTouch(){
  // 스틱을 실제로 잡고 있을 때만 관여한다. 그러지 않으면 매 프레임
  // 키보드 입력을 false 로 덮어써서 PC에서 이동이 먹통이 된다.
  if(stickId===null) return;
  keys.fwd=tmv.y<-0.2; keys.back=tmv.y>0.2;
  keys.left=tmv.x<-0.2; keys.right=tmv.x>0.2;
}

/* ---------------- 설정 패널 ---------------- */
function rng(id,key,vid,fmt,after){
  const el=document.getElementById(id), v=document.getElementById(vid);
  const u=()=>{ P[key]=parseFloat(el.value); v.textContent=fmt(P[key]); if(after) after(); };
  el.addEventListener('input',u); u();
}
rng('pWs','ws','vWs',x=>['','1.9 km','3.8 km','5.8 km','7.7 km','9.6 km','11.5 km'][x]||'');
/* 주소에 ?ws=배율(1~6)을 주면 첫 섬을 그 넓이로 만든다 — 구동 검사(tools/pages.mjs)가 작은 섬으로 돌린다(헤드리스에서 6배 섬은 너무 오래 걸린다) */
try{ const w=parseInt(new URLSearchParams(location.search).get('ws'),10), el=document.getElementById('pWs'); if(w>=1&&w<=6&&el){ el.value=w; el.dispatchEvent(new Event('input')); } }catch(e){}   // 섬 배율 — 새 섬부터(00-core.js)
rng('pSize','size','vSize',x=>x.toFixed(2));
rng('pRidge','ridge','vRidge',x=>x.toFixed(2));
rng('pEro','ero','vEro',x=>x.toFixed(2));
rng('pSea','sea','vSea',x=>x.toFixed(1));
rng('pRain','rain','vRain',x=>x.toFixed(2));
document.getElementById('pRes').addEventListener('input',e=>{
  renderScale=parseFloat(e.target.value);
  document.getElementById('vRes').textContent=renderScale.toFixed(2); resize();
});
document.getElementById('vRes').textContent=renderScale.toFixed(2);
document.getElementById('pFar').addEventListener('input',e=>{
  farScale=parseFloat(e.target.value);
  document.getElementById('vFar').textContent=farScale.toFixed(2);
});
document.getElementById('vFar').textContent=farScale.toFixed(2);
document.getElementById('pShadow').addEventListener('input',e=>{
  LIGHT.setQuality(parseInt(e.target.value,10));
  document.getElementById('vShadow').textContent=LIGHT.QUAL[LIGHT.q].n;
});
document.getElementById('vShadow').textContent=LIGHT.QUAL[LIGHT.q].n;
document.getElementById('pLimb').addEventListener('input',e=>{
  P.limb=parseFloat(e.target.value);
  document.getElementById('vLimb').textContent=P.limb.toFixed(2);
});
document.getElementById('vLimb').textContent=P.limb.toFixed(2);
document.getElementById('pVol').addEventListener('input',e=>{
  VOL=parseFloat(e.target.value); if(A.master) A.master.gain.value=VOL;
  document.getElementById('vVol').textContent=Math.round(VOL*100)+'%';
});
document.getElementById('vVol').textContent=Math.round(VOL*100)+'%';
document.getElementById('pSens').addEventListener('input',e=>{
  SENS=parseFloat(e.target.value); document.getElementById('vSens').textContent=SENS.toFixed(2);
/* 몬스터 수(사용자 요청) — 0 없음 · 1 적게 · 2 보통 · 3 많이 · 4 아주 많이(97-mobs.js MON.k — 그날 파워레벨 예산에 곱한다) */
const MOB_STEPS=[0,0.5,1,1.6,2.4], MOB_NAMES=['없음','적게','보통','많이','아주 많이'];
document.getElementById('pMobs').addEventListener('input',e=>{
  const v=clamp(parseInt(e.target.value)||0,0,4); if(typeof MON!=='undefined') mobsSetK(MOB_STEPS[v]);
  document.getElementById('vMobs').textContent=MOB_NAMES[v];
});
document.getElementById('vMobs').textContent='보통';
});
document.getElementById('vSens').textContent=SENS.toFixed(2);
/* 프레임 제한 — 끔(화면 주사율까지) · 30 · 60 · 120. 노트북 발열·배터리를 아낀다. 기본은 끔이라 화면은 그대로다 */
const CAP_STEPS=[0,30,60,120];
let FPS_CAP=0;
document.getElementById('pCap').addEventListener('input',e=>{
  FPS_CAP=CAP_STEPS[parseInt(e.target.value,10)]||0;
  document.getElementById('vCap').textContent=FPS_CAP?FPS_CAP+' fps':'끔';
});
document.getElementById('vCap').textContent='끔';
/* 캠코더 화면 — 0 끄기 · 1~3 세로 줄 수(360 · 480 · 720). 줄 수가 적을수록 가볍다 */
document.getElementById('pCam').addEventListener('input',e=>{
  const v=clamp(parseInt(e.target.value)||0,0,3); CAMC.lines=CAMC_LINES[v]; camcBody(CAMC.on&&CAMC.lines>0);
  document.getElementById('vCam').textContent=v?CAMC_LINES[v]+'줄':'끔';
});
document.getElementById('vCam').textContent='480줄';
/* 자동 품질 — 프레임이 떨어지면 자세히 그리는 거리를 스스로 당긴다(QUAL · 30-props.js) */
document.getElementById('pAuto').addEventListener('input',e=>{
  QUAL.on=parseInt(e.target.value)>0; document.getElementById('vAuto').textContent=QUAL.on?'켬':'끔';
});
document.getElementById('vAuto').textContent='켬';
/* 화면 잡음 — 0 끔 · 1 보통 · 2 짙게(캠코더 셰이더의 알갱이 세기 · 창 바탕의 잡음 무늬) */
document.getElementById('pNoise').addEventListener('input',e=>{
  const v=clamp(parseInt(e.target.value)||0,0,2); CAMC.noise=v;
  document.getElementById('vNoise').textContent=['끔','보통','짙게'][v];
});
document.getElementById('vNoise').textContent='보통';
document.getElementById('bBench').onclick=()=>benchStart();
document.getElementById('pSlot').addEventListener('change',e=>{
  curSlot=e.target.value; document.getElementById('bSave').disabled=curSlot==='auto';
  if(curSlot!=='auto'){ SET.slot=curSlot; saveSettings(); }
});
/* 설정은 다음에 켤 때도 그대로 — 그래픽(해상도·시야·그림자·가지 밀도) · 음량 · 마우스 감도 · 고른 저장 칸.
   브라우저 저장소에 둔다(데스크톱 판도 같은 저장소가 userData 에 남는다). 섬 모양(시드·크기…)은 저장 파일이 가진다.
   손으로 바꿀 때(change)만 적는다 — 불러올 때 맞추는 input 은 다시 적지 않는다 */
const SET_KEY='castaway.settings';
const SET={res:1, far:1, shadow:2, limb:0.8, vol:0.9, sens:1, slot:'1', cap:0, cam:2, noise:1, auto:1, mobs:2};
function saveSettings(){ try{ localStorage.setItem(SET_KEY,JSON.stringify(SET)); }catch(e){} }
for(const [id,k] of [['pRes','res'],['pFar','far'],['pShadow','shadow'],['pLimb','limb'],['pVol','vol'],['pSens','sens'],['pCap','cap'],['pCam','cam'],['pNoise','noise'],['pAuto','auto'],['pMobs','mobs']])
  document.getElementById(id).addEventListener('change',e=>{ SET[k]=parseFloat(e.target.value); saveSettings(); });
function applySettings(){
  try{ const o=JSON.parse(localStorage.getItem(SET_KEY)||'{}'); for(const k in SET) if(k in o) SET[k]=o[k]; }catch(e){}
  const put=(id,v)=>{ const el=document.getElementById(id); if(!el||typeof v!=='number'||!isFinite(v)) return;
    el.value=v; el.dispatchEvent(new Event('input')); };
  put('pRes',SET.res); put('pFar',SET.far); put('pShadow',SET.shadow); put('pLimb',SET.limb); put('pVol',SET.vol); put('pSens',SET.sens);
  put('pCap',SET.cap); put('pCam',SET.cam); put('pNoise',SET.noise); put('pAuto',SET.auto); put('pMobs',SET.mobs);
  curSlot=(SET.slot==='2'||SET.slot==='3')?SET.slot:'1'; drawSlots();
}
document.getElementById('pSeed').addEventListener('input',e=>P.seed=e.target.value);
/* 프리셋(presets/presets.js) — 고르면 손잡이들이 그 값으로 옮겨 간다. 손잡이의 원래 처리기(input)를 그대로 타고,
   그래픽 쪽은 change 도 쏴서 설정에 적힌다. 손잡이를 손으로 만지면 고름칸은 '직접 고름' 으로 돌아간다 */
{
  const fill=(id,list)=>{ const el=document.getElementById(id);
    el.innerHTML='<option value="">직접 고름</option>'+list.map(p=>'<option value="'+p.id+'">'+p.n+'</option>').join(''); return el; };
  const move=(id,v,save)=>{ const el=document.getElementById(id); if(!el||typeof v!=='number') return;
    el.value=v; el.dispatchEvent(new Event('input')); if(save) el.dispatchEvent(new Event('change')); };
  const gfx=fill('pGfx',GRAPHICS_PRESETS), isle=fill('pIsle',ISLAND_PRESETS);
  gfx.addEventListener('change',()=>{ const p=GRAPHICS_PRESETS.find(q=>q.id===gfx.value); if(!p) return;
    move('pRes',p.res,1); move('pFar',p.far,1); move('pShadow',p.shadow,1); move('pLimb',p.limb,1); move('pCam',p.cam,1); move('pNoise',p.noise,1);
    toast('그래픽 프리셋 — '+p.n+(landed?' (가지 밀도는 새 섬부터)':'')); });
  isle.addEventListener('change',()=>{ const p=ISLAND_PRESETS.find(q=>q.id===isle.value); if(!p) return;
    move('pWs',p.ws||6); move('pSize',p.size); move('pRidge',p.ridge); move('pEro',p.ero); move('pSea',p.sea); move('pRain',p.rain);
    toast('섬 프리셋 — '+p.n+" · '새 섬' 을 누르면 이 모양으로 만든다"); });
  for(const id of ['pRes','pFar','pShadow','pLimb','pCam','pNoise']) document.getElementById(id).addEventListener('change',e=>{ if(e.isTrusted) gfx.value=''; });
  for(const id of ['pWs','pSize','pRidge','pEro','pSea','pRain']) document.getElementById(id).addEventListener('input',e=>{ if(e.isTrusted) isle.value=''; });
}
/* 검색칸 — 글자를 칠 때마다 목록을 다시 그린다 */
document.getElementById('crfS').addEventListener('input',e=>{
  craftQuery=e.target.value; craftDirty=true; drawCraft();
});
document.getElementById('bGen').onclick=()=>newIsland(generateWorld);
document.getElementById('bSeed').onclick=()=>{
  const w=['tide','ashen','vireo','kelp','marrow','glass','hollow','ember','driftwood','saltgrave'];
  const s=w[(Math.random()*w.length)|0]+'-'+((Math.random()*9000+1000)|0);
  newIsland(()=>{ document.getElementById('pSeed').value=s; P.seed=s; generateWorld(); });
};
const tgl=(id,fn)=>{ const b=document.getElementById(id);
  b.onclick=()=>{ b.classList.toggle('on'); fn(b.classList.contains('on')); }; };
/* 사전 탭 셋 — 아이템 · 광물 · 조작 */
for(const [bid,tab] of [['dexI','item'],['dexM','mineral'],['dexK','keys']])
  document.getElementById(bid).onclick=()=>{ dexTab=tab;
    for(const b of ['dexI','dexM','dexK']) document.getElementById(b).classList.toggle('on',b===bid);
    drawDex(); };
document.getElementById('dexS').oninput=()=>{ if(dexTab!=='item') document.getElementById('dexI').click(); else drawDex(); };
tgl('bProps',v=>{ showProps=v; if(propGroup) propGroup.visible=v; });
tgl('bGuar',v=>{ newIsland(()=>{ GUARANTEE=v; generateWorld(); },()=>document.getElementById('bGuar').classList.toggle('on',!v)); });
tgl('bDev',v=>toggleDev(v));
tgl('bFly',v=>{ flyMode=v; if(v&&document.pointerLockElement) document.exitPointerLock(); });
tgl('bTouch',v=>setTouchUI(v));
document.getElementById('boxRn').onclick=boxRenameStart;
document.getElementById('boxNm').addEventListener('keydown',e=>{
  e.stopPropagation();                       // 글자를 치는 동안 E·Esc 가 창을 닫지 않게
  if(e.code==='Enter'||e.code==='NumpadEnter'){ e.preventDefault(); boxRenameEnd(true); }
  else if(e.code==='Escape'){ e.preventDefault(); boxRenameEnd(false); }
});
document.getElementById('boxNm').addEventListener('blur',()=>boxRenameEnd(true));
document.getElementById('bSave').onclick=saveLocal;
document.getElementById('bLoad').onclick=askLoad;
document.getElementById('askY').onclick=()=>askClose(true);
document.getElementById('askN').onclick=()=>askClose(false);
document.getElementById('bSaveF').onclick=saveFile;
document.getElementById('bLoadF').onclick=loadFile;
document.getElementById('loadIn').addEventListener('change',e=>{
  const file=e.target.files&&e.target.files[0]; if(!file) return;
  const fr=new FileReader();
  fr.onload=()=>{ restore(JSON.parse(fr.result)).catch(err=>showErr('불러오기',err)); };
  fr.onerror=()=>showErr('파일 읽기',fr.error);
  fr.readAsText(file);
});
if(touchOnly) document.getElementById('bTouch').classList.add('on');
