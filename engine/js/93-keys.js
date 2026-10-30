/* ════════════════════════════════════════════════════════════════════════
   키 바꾸기 — 행동마다 키를 둘까지 단다(베타 신고 '개발자 모드 단축키를 다르게' → 사용자 요청: 설정에 조작 메뉴).
   · 키는 행동 이름으로 읽는다 — `keys.fwd` · `keys.jump` …(예전엔 `keys.KeyW` 처럼 글쇠 이름이 일곱 파일에 박혀 있었다).
     keydown/keyup(94-input.js)이 그 글쇠에 걸린 행동을 전부 켜고 끈다(`KB_BY`). 한 번 누르는 행동은 `kbHit(e,행동)` 으로 본다.
   · **한 글쇠는 한 행동만**(사용자 요청 2026-10-30 '그냥 키는 안겹치게 해') — 예전엔 범위(놀이 · 짓는 중 · 옮기는 중 · 개발자 모드)가 다르면 같은
     글쇠를 같이 썼다(R 새 섬 · 짓는 중 돌리기 · 옮기는 중 돌리기 / F 설비 옮기기 · 짓는 중 뒤집기 / G 버리기 · 짓는 중 걷어내기). 이제 범위 없이
     기본 키가 서로 다르고, 이미 쓰는 글쇠를 고르면 **그 글쇠를 쓰던 칸은 비운다**(어느 행동이든 · 비운 행동은 창에서 붉게). 저장된 키를 읽을 때도
     겹치면 사용자가 단 키가 먼저 차지하고 나머지 칸을 비운다(`kbLoad`). 짓는 중 · 옮기는 중 두 돌리기는 같은 일이라 한 행동(`rot`)으로 합쳤다.
   · 고정 — Esc · 숫자 0~9(빠른 칸 · 짓기 조각) · F11(전체 화면) · F12(개발자 도구) · 마우스(사용자가 정함 — 마우스는 안 바꾼다).
   · 저장 — 브라우저 저장소 `castaway.keys`(기본값과 다른 행동만). 데스크톱 판도 같은 저장소다.
   · 안내 — 사전 '조작' 탭(CONTROLS_GUIDE 의 {행동} 자리)과 일시정지 화면의 글쇠 줄(#ov .k)이 지금 키로 그려진다. 알림 글 속 글쇠 이름은 그대로다.
   · 2026-10-30(사용자 요청) — 돌진을 Space 에서 Q 로 뗐다(`dash`). Space 하나가 돌진 · 벼랑 · 나무 · 밧줄 · 떠오르기를 다 맡아, 벼랑·나무·수직굴
     곁에서 톡 누르면 돌진 대신 매달리거나 올랐다(밧줄 → 나무 → 벼랑 → 돌진 차례로 본다). 같은 날 Space 에 위로 뛰기를 되살렸다(사용자 요청
     '점프 스페이스' — 벼랑·나무·수직굴 앞에서는 그쪽이 먼저다). 겹침을 없애며 짓는 중 걷어내기 G → H · 뒤집기 Q → J · 새 섬 R → F8 로 옮겼다. */
const KB_ACTS=[
  // id · 이름 · 묶음 · 기본 키 · 범위
  {id:'fwd',     n:'앞으로',                         g:'움직이기', d:['KeyW']},
  {id:'back',    n:'뒤로',                           g:'움직이기', d:['KeyS']},
  {id:'left',    n:'왼쪽',                           g:'움직이기', d:['KeyA']},
  {id:'right',   n:'오른쪽',                         g:'움직이기', d:['KeyD']},
  {id:'jump',    n:'뛰기 · 매달리기 · 오르기 · 떠오르기', g:'움직이기', d:['Space']},
  {id:'dash',    n:'돌진 · 매달려 몸 던지기',         g:'움직이기', d:['KeyQ']},
  {id:'run',     n:'달리기 · 매달려 몸 던지기',      g:'움직이기', d:['ShiftLeft']},
  {id:'crouch',  n:'앉기 · 물속에서 가라앉기',       g:'움직이기', d:['ControlLeft','KeyC']},
  {id:'bag',     n:'가방',                           g:'창',       d:['KeyI']},
  {id:'dex',     n:'사전',                           g:'창',       d:['KeyB']},
  {id:'map',     n:'지도',                           g:'창',       d:['KeyM']},
  {id:'cfg',     n:'설정',                           g:'창',       d:['Tab']},
  {id:'close',   n:'배 타기·내리기 · 열린 창 닫기',  g:'행동',     d:['KeyE']},
  {id:'move',    n:'설비 옮기기',                    g:'행동',     d:['KeyF']},
  {id:'drop',    n:'고른 것 버리기',                 g:'행동',     d:['KeyG']},
  {id:'reload',  n:'재장전',                         g:'행동',     d:['KeyX']},
  {id:'lamp',    n:'전등 켜기·끄기',                 g:'행동',     d:['KeyL']},
  {id:'build',   n:'짓기 시작·끝',                   g:'짓기',     d:['KeyZ']},
  {id:'rot',     n:'돌리기 — 짓는 조각 · 옮기는 설비(Shift 반대)', g:'짓기', d:['KeyR']},
  {id:'bFlip',   n:'짓는 중 — 삼각 벽 뒤집기',       g:'짓기',     d:['KeyJ']},
  {id:'bUndo',   n:'짓는 중 — 걷어내기',             g:'짓기',     d:['KeyH']},
  {id:'save',    n:'저장',                           g:'저장 · 화면', d:['F5']},
  {id:'load',    n:'불러오기',                       g:'저장 · 화면', d:['F9']},
  {id:'newIsle', n:'새 섬(묻고 나서)',               g:'저장 · 화면', d:['F8']},
  {id:'perf',    n:'성능 창',                        g:'저장 · 화면', d:['F3']},
  {id:'dev',     n:'개발자 모드',                    g:'개발',     d:['Semicolon']},
  {id:'devNext', n:'개발자 모드 — 다음 굴',          g:'개발',     d:['BracketRight']},
  {id:'devPrev', n:'개발자 모드 — 앞 굴',            g:'개발',     d:['BracketLeft']},
  {id:'fly',     n:'자유 카메라',                    g:'개발',     d:['KeyV']},
  {id:'time',    n:'시간 배속',                      g:'개발',     d:['KeyT']},
];
const KB_ACT={}; for(const a of KB_ACTS) KB_ACT[a.id]=a;
const KB_FIXED=c=>c==='Escape'||/^Digit[0-9]$/.test(c)||c==='F11'||c==='F12';
const KB_SAVE='castaway.keys';
let KB={}, KB_BY={};                                   // 행동 → [글쇠 둘] · 글쇠 → [행동…]
function kbIndex(){
  KB_BY={};
  for(const id in KB) for(const c of KB[id]) if(c) (KB_BY[c]||(KB_BY[c]=[])).push(id);
}
function kbLoad(){
  KB={}; for(const a of KB_ACTS) KB[a.id]=[a.d[0]||'',a.d[1]||''];
  try{ const o=JSON.parse(localStorage.getItem(KB_SAVE)||'{}');
    if(!o.rot&&(o.bRot||o.mRot)) o.rot=o.bRot||o.mRot;           // 짓는 중 · 옮기는 중 두 돌리기를 하나로 합쳤다(2026-10-30) — 바꿔 둔 키는 이어 쓴다
    for(const id in o) if(KB_ACT[id]&&Array.isArray(o[id])) KB[id]=[0,1].map(i=>typeof o[id][i]==='string'&&!KB_FIXED(o[id][i])?o[id][i]:'');
    /* 한 글쇠는 한 행동만 — 사용자가 단 키가 먼저(키 표 차례), 그다음 기본 키가 글쇠를 차지한다. 이미 차지된 글쇠의 칸은 비운다(창에서 붉게).
       새로 생긴 기본 키(돌진 Q · 걷어내기 H · 뒤집기 J · 새 섬 F8)가 사용자가 단 키와 겹쳐도 사용자 쪽이 이긴다 */
    const own=new Set();
    for(const mine of [true,false]) for(const a of KB_ACTS){ if(!!o[a.id]!==mine) continue;
      for(let i=0;i<2;i++){ const c=KB[a.id][i]; if(!c) continue; if(own.has(c)) KB[a.id][i]=''; else own.add(c); } } }catch(e){}
  kbIndex();
}
function kbSaveNow(){
  const o={}; for(const a of KB_ACTS){ const k=KB[a.id]; if(k[0]!==(a.d[0]||'')||k[1]!==(a.d[1]||'')) o[a.id]=k; }
  try{ localStorage.setItem(KB_SAVE,JSON.stringify(o)); }catch(e){}
}
/* 이 글쇠가 이 행동에 걸렸나 — keydown 에서 */
const kbHit=(e,id)=>{ const k=KB[id]; return !!k&&(k[0]===e.code||k[1]===e.code); };
/* 글쇠 이름 — 화면에 보일 것 */
function kbName(c){
  if(!c) return '';
  if(/^Key[A-Z]$/.test(c)) return c.slice(3);
  if(/^Digit[0-9]$/.test(c)) return c.slice(5);
  if(/^F[0-9]+$/.test(c)) return c;
  if(/^Numpad/.test(c)) return 'Num '+c.slice(6);
  const N={Space:'Space',ShiftLeft:'Shift',ShiftRight:'오른 Shift',ControlLeft:'Ctrl',ControlRight:'오른 Ctrl',AltLeft:'Alt',AltRight:'오른 Alt',
    MetaLeft:'⌘',MetaRight:'오른 ⌘',Tab:'Tab',CapsLock:'Caps',Enter:'Enter',Backspace:'Backspace',Semicolon:';',Quote:"'",Comma:',',Period:'.',
    Slash:'/',Backslash:'\\',BracketLeft:'[',BracketRight:']',Minus:'-',Equal:'=',Backquote:'`',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',
    Insert:'Ins',Delete:'Del',Home:'Home',End:'End',PageUp:'PgUp',PageDown:'PgDn',IntlBackslash:'\\',IntlYen:'¥',Lang1:'한/영',Lang2:'한자'};
  return N[c]||c;
}
/* 행동의 키 — '' 면 비어 있다 */
const kbKeys=id=>(KB[id]||[]).filter(Boolean).map(kbName);
const kbN=id=>kbKeys(id).join(' · ')||'없음';
const KB_ESC=s=>s.replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
/* 안내 글의 {행동} 자리를 지금 키로 — 사전 '조작' 탭이 쓴다 */
const kbText=s=>s.replace(/\{(\w+)\}/g,(m,id)=>KB_ACT[id]?KB_ESC(kbN(id)):m);
/* 글쇠를 행동에 단다 — 그 글쇠를 쓰던 칸은 어느 행동이든 비운다(한 글쇠 한 행동 · 돌려주는 것: 비운 행동들) */
function kbSet(id,slot,code){
  const a=KB_ACT[id]; if(!a) return [];
  const cleared=[];
  if(code) for(const b of KB_ACTS) for(let i=0;i<2;i++)
    if(KB[b.id][i]===code&&!(b.id===id&&i===slot)){ KB[b.id][i]=''; cleared.push(b.id); }
  KB[id][slot]=code||'';
  if(KB[id][0]===KB[id][1]) KB[id][1]='';             // 같은 글쇠 둘은 하나로
  kbIndex(); kbSaveNow(); kbRefresh();
  return cleared;
}
function kbReset(){ for(const a of KB_ACTS) KB[a.id]=[a.d[0]||'',a.d[1]||'']; kbIndex(); kbSaveNow(); kbRefresh(); }

/* 일시정지(시작) 화면의 글쇠 줄 — 한 줄에 글쇠 하나(첫 칸 span 을 여는 화면 그림 titleText 가 읽는다 · 91-title.js) */
const KB_OV=[
  [['fwd','left','back','right'],'이동'], [['run'],'달리기'], [['dash'],'돌진 — 가는 쪽으로 몸을 날린다 · 매달려서는 몸 던지기'],
  [['jump'],'뛰기 · 벼랑을 보고 누르고 있으면 매달려 오르기 · 나무·밧줄 타기 · 물속 떠오르기'],
  [['crouch'],'앉기 · +{jump} 지붕에서 내려가기'], ['좌클릭','쓰기 · 공격 · 먹기 · 캐기 · 설비 열기'], ['우클릭','저격총 조준경 · 전등·드릴 충전'],
  [['close'],'열린 상자·모닥불·숫돌 창 닫기 · 배 타기'], [['move'],'설비 옮기기 — 휠·{rot} 돌리기 · 좌클릭 놓기'], [['bag'],'가방 — 소지품 · 제작'],
  [['dex'],'사전'], ['1~5','빠른 칸 — 손의 것과 맞바꾸기'], [['drop'],'고른 것 버리기'], [['lamp'],'전등 켜기 · 끄기'], [['fly'],'자유 카메라'],
  [['dev'],'개발자 모드 — 날아서 둘러보기 · 다치지 않는다'], [['map'],'지도 펴기 · 접기 — 펴면 좌클릭 핀 꽂기 · 우클릭 뽑기'],
  [['build'],'집 짓기 — 1~9 조각 · 0 등급 · {rot} 방향 · {bFlip} 삼각 벽 · {bUndo} 걷어내기'], [['newIsle'],'새 섬(묻고 나서)'], [['time'],'시간 가속'],
  [['cfg'],'설정 — 키 바꾸기도 여기서'], [['perf'],'성능 창'], [['save'],'고른 칸에 저장'], [['load'],'불러오기(묻고 나서)'], ['Esc','일시정지'],
];
function kbOvRender(){
  const box=document.querySelector('#ov .k'); if(!box) return;
  const kbd=t=>'<kbd>'+KB_ESC(t)+'</kbd>';
  box.innerHTML=KB_OV.map(([k,d])=>{
    let s;
    if(typeof k==='string') s=k==='1~5'?kbd('1')+'~'+kbd('5'):kbd(k);
    else{ const ks=k.map(id=>kbKeys(id)[0]||'—'); s=ks.map(kbd).join(''); }
    return '<div><span>'+s+'</span><em>'+kbText(d)+'</em></div>';
  }).join('');
}
/* 키가 바뀌면 — 안내 줄 · 단추 글 · 열린 사전·키 창을 다시 그린다 */
function kbRefresh(){
  kbOvRender();
  const x=document.getElementById('bCfgX'); if(x) x.textContent='닫기 · '+(kbKeys('cfg')[0]||'—');
  const d=document.getElementById('bDev'); if(d) d.title=(kbKeys('dev')[0]?kbKeys('dev')[0]+' 키로도 켜고 끈다':'키가 없다 — 조작 창에서 단다');
  if(typeof dexOpen!=='undefined'&&dexOpen&&typeof drawDex==='function') drawDex();
  if(KBW.open) kbwDraw();
}

/* ── 키 창(#kbw) — 설정 창의 '조작 · 키 바꾸기' 단추로 연다 ──
   줄마다 행동 이름과 칸 둘. 칸을 누르고 키를 누르면 단다 · Esc 그만두기 · Backspace·Delete 비우기 · 비운 행동은 붉다 */
const KBW={open:false, wait:null, el:null, note:''};
function kbwToggle(on){
  KBW.open=on===undefined?!KBW.open:!!on; KBW.wait=null; KBW.note='';
  KBW.el.style.display=KBW.open?'block':'none';
  if(KBW.open) kbwDraw();
  if(typeof syncLock==='function') syncLock();
}
function kbwDraw(){
  const el=KBW.el; if(!el) return;
  let h='<div class="ch"><b>조작 — 키 바꾸기</b><button data-kb="x">닫기 · Esc</button></div>'
    +'<div class="kbH">칸을 누르고 쓸 키를 누른다 · <b>Esc</b> 그만두기 · <b>Backspace</b> 비우기<br>한 키는 한 행동만 — 이미 쓰는 키면 그쪽 칸은 비워진다(붉게) · 마우스 · Esc · 숫자 0~9 는 못 바꾼다</div>';
  if(KBW.note) h+='<div class="kbN">'+KB_ESC(KBW.note)+'</div>';
  let g='';
  for(const a of KB_ACTS){
    if(a.g!==g){ g=a.g; h+='<div class="kbG">'+g+'</div>'; }
    const none=!KB[a.id][0]&&!KB[a.id][1];
    h+='<div class="kbR'+(none?' none':'')+'"><span>'+a.n+'</span>'
      +[0,1].map(i=>{ const w=KBW.wait&&KBW.wait[0]===a.id&&KBW.wait[1]===i;
        return '<button data-kb="'+a.id+'" data-i="'+i+'" class="'+(w?'on':'')+'">'+(w?'키를 누르세요':(KB_ESC(kbName(KB[a.id][i]))||'—'))+'</button>'; }).join('')
      +'</div>';
  }
  h+='<div class="g"><button data-kb="reset">기본값으로</button></div>';
  el.innerHTML=h;
}
function kbwInit(){
  const el=document.createElement('div'); el.className='pnl'; el.id='kbw'; const cfg=document.getElementById('cfg'); cfg.parentNode.insertBefore(el,cfg.nextSibling); KBW.el=el;
  el.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('button[data-kb]'); if(!b) return;
    const k=b.dataset.kb;
    if(k==='x'){ kbwToggle(false); return; }
    if(k==='reset'){ ask('키를 기본값으로 되돌릴까?','바꾼 키가 전부 처음대로 돌아간다 · Y 예 · N 아니오',()=>{ KBW.note='기본값으로 되돌렸다'; kbReset(); }); return; }
    KBW.wait=[k,+b.dataset.i]; KBW.note=''; kbwDraw();
  });
  /* 키를 기다리는 동안은 이 창이 키를 먼저 받는다(캡처 단계 — 게임 키 처리(94-input.js)에 안 닿는다) */
  addEventListener('keydown',e=>{
    if(!KBW.open||askOpen) return;
    if(!KBW.wait){ if(e.code==='Escape'){ e.preventDefault(); e.stopPropagation(); kbwToggle(false); } return; }
    e.preventDefault(); e.stopPropagation();
    const [id,i]=KBW.wait; KBW.wait=null;
    if(e.code==='Escape'){ KBW.note=''; kbwDraw(); return; }
    if(e.code==='Backspace'||e.code==='Delete'){ kbSet(id,i,''); KBW.note=KB_ACT[id].n+' — 칸을 비웠다'; kbwDraw(); return; }
    if(KB_FIXED(e.code)){ KBW.note=kbName(e.code)+' 는 바꿀 수 없는 키다'; kbwDraw(); return; }
    const cl=kbSet(id,i,e.code);
    KBW.note=KB_ACT[id].n+' — '+kbName(e.code)+(cl.length?' · 비운 것: '+cl.map(c=>KB_ACT[c].n).join(', '):'');
    kbwDraw();
  },true);
  addEventListener('keyup',e=>{ if(KBW.open&&(KBW.wait||e.code==='Escape')) e.stopPropagation(); },true);
}
kbLoad();
kbwInit();
kbRefresh();
