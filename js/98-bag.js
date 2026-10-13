/* 98-bag.js — CASTAWAY
   가방 화면 — 소지품과 제작을 **한 화면**에 나란히 띄운다(I · C). 열려 있는 동안 세상은 멈춘다(uiHold).
   물건을 누르면 가운데 칸에 그 물건으로 **할 수 있는 일**(들기·입기·먹기·빠른 칸·버리기)과
   **만들 수 있는 것**(그 물건이 재료·도구로 드는 제작법)이 뜬다.
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   가방 화면
   ----------------------------------------------------------------------------
   예전엔 소지품(I)과 제작(C)이 화면 오른쪽에 번갈아 뜨는 좁은 창이었다 — 하나를 열면 다른 하나가 닫혀,
   재료를 보며 만들 수가 없었고 세상도 뒤에서 그대로 보였다. 이제 둘이 화면을 덮는 한 장에 같이 선다:
     [소지품 · 착용 칸]   [고른 물건 — 할 수 있는 일 · 만들 수 있는 것]   [제작]
   · 기존 창(#inv · #crf)을 그대로 이 화면 안으로 옮겨 세운다 — 그리는 함수(drawInv · drawCraft)는 손대지 않았다.
   · invOpen 과 craftOpen 은 이제 늘 같이 켜지고 같이 꺼진다(`bagSync` 가 프레임마다 맞춘다). 다른 창(상자·설정·
     사전·그림판)이 둘을 끄면 이 화면도 같이 닫힌다.
   ========================================================================== */
const BAG={el:null, sel:null, shown:false, lastHtml:''};
function bagWire(){
  const bag=document.createElement('div'); bag.id='bag';
  bag.innerHTML='<div class="bagH"><span>가방 · 제작</span>'
    +'<span class="kclose"><b>I</b><b>C</b><b>Esc</b> 닫기 · 열려 있는 동안 시간이 멈춘다</span></div>'
    +'<div class="bagB"><div class="pnl" id="sel"></div></div>';
  document.body.appendChild(bag);
  const body=bag.querySelector('.bagB'), sel=bag.querySelector('#sel');
  body.insertBefore(document.getElementById('inv'),sel);        // 왼쪽 — 소지품
  body.appendChild(document.getElementById('crf'));             // 오른쪽 — 제작
  BAG.el=bag; BAG.sel=sel;
  /* 고른 물건 칸의 단추 — 줄마다 달지 않고 칸 바탕에서 한 번에 받는다(다시 그려도 눌림이 안 빠진다) */
  sel.addEventListener('click',ev=>{
    const b=ev.target&&ev.target.closest?ev.target.closest('[data-act]'):null;
    if(b) bagAct(b.dataset.act,b.dataset.arg);
  });
}
function openBag(focus){
  closeCfg();
  if(dexOpen){ dexOpen=false; document.getElementById('dex').style.display='none'; }
  if(boxOpen) toggleBox(null);
  invOpen=craftOpen=true; invDirty=craftDirty=true;
  bagSync();
  const q=document.getElementById('crfS');
  q.value=''; craftQuery='';                     // 열 때마다 새로 찾는다
  if(focus==='craft') setTimeout(()=>q.focus(),0);
  syncLock();
}
function closeBag(){
  invOpen=craftOpen=false;
  const q=document.getElementById('crfS'); if(q) q.blur();
  bagSync(); syncLock();
}
function toggleBag(focus){ if(invOpen||craftOpen) closeBag(); else openBag(focus); }
/* 프레임마다 — 두 창의 켜짐을 맞추고 화면을 보이거나 감춘다 */
function bagSync(){
  if(!BAG.el) return;
  const on=invOpen||craftOpen;
  if(on&&!(invOpen&&craftOpen)){ invOpen=craftOpen=true; invDirty=craftDirty=true; }
  if(on!==BAG.shown){
    BAG.shown=on;
    BAG.el.style.display=on?'flex':'none';
    document.getElementById('inv').style.display=on?'block':'none';
    document.getElementById('crf').style.display=on?'block':'none';
    if(on){ invDirty=craftDirty=true; }
  }
}

/* ── 고른 물건 ─────────────────────────────────────────────────────────── */
const bagUses=(id,r)=>r.id?r.id===id:!!(ITEMS[id].tags&&ITEMS[id].tags.indexOf(r.tag)>=0);
/* 그 제작법에 지금 모자란 것(없으면 빈 글) */
function bagMissing(R){
  const miss=[];
  for(const r of R.in){ const h=countMat(r); if(h<r.n) miss.push(matName(r)+' '+(r.n-h)); }
  for(const r of (R.need||[])) if(countMat(r)<r.n) miss.push(matName(r));
  if(R.station&&!stationOK(R)) miss.push(STATION[R.station].n+' 곁');
  return miss.join(' · ');
}
function drawSel(){
  const el=BAG.sel; if(!el||!(invOpen||craftOpen)) return;
  const sl=INV.slots[INV.sel];
  let h='';
  if(!sl){
    h='<div class="sH">고른 물건</div><div class="sE">왼쪽 목록에서 물건을 누르면<br>그 물건으로 할 수 있는 일과 만들 수 있는 것이 여기에 뜬다</div>';
  }else{
    const id=sl.id, T=ITEMS[id], esc=s=>String(s).replace(/[<>&]/g,'');
    const ico=itemIcon(id);
    h+='<div class="sH">고른 물건</div><div class="sT">'
      +(ico?'<img decoding="sync" src="'+ico+'" alt="">':'')
      +'<div><b>'+T.n+'</b> <span class="q">×'+sl.n+'</span>'
      +'<div class="sK">'+(T.kg*sl.n).toFixed(1)+' kg'
        +(sl.dur!==undefined?' · 내구 '+(Math.round(sl.dur*10)/10)+'/'+T.durMax:'')
        +(sl.sip!==undefined?' · '+sl.sip+'모금':'')
        +(sl.fuel!==undefined?' · '+(sl.lit?'타는 중 ':'꺼짐 ')+Math.round(sl.fuel/T.burn*100)+'%':'')
        +(T.food?' · 허기 +'+T.food:'')+(T.drink?' · 목마름 +'+T.drink.n:'')
        +(T.wear?' · '+WEAR_N[T.wear.slot]+(T.wear.armor?' 방어 '+T.wear.armor:'')+(T.wear.warm?' 보온 '+T.wear.warm:'')+(T.wear.carry?' 적재 +'+T.wear.carry:''):'')
      +'</div></div></div><div class="sU">'+esc(T.use||'')+'</div>';
    if(T.read) h+='<ol class="sG">'+T.read.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ol>';   // 읽을거리(생존 안내서)
    // ── 할 수 있는 일
    const acts=[];
    if(holdable(T)) acts.push(EQUIP===sl?['unequip','손에서 내려놓기']:['equip','손에 들기']);
    if(T.wear) acts.push(WEAR[T.wear.slot]===sl?['unwear','벗기']:['wear','입기('+WEAR_N[T.wear.slot]+')']);
    if(consumable(T)) acts.push(['eat',useVerb(T)]);
    acts.push(['drop1','1개 버리기']);
    if(sl.n>1) acts.push(['dropAll','전부 버리기']);
    h+='<div class="sS">할 수 있는 일</div><div class="sA">'
      +acts.map(a=>'<button data-act="'+a[0]+'"'+(a[0].indexOf('drop')===0?' class="w"':'')+'>'+a[1]+'</button>').join('')+'</div>';
    if(holdable(T)){
      h+='<div class="sA q5"><span>빠른 칸</span>'
        +[0,1,2,3,4].map(i=>'<button data-act="quick" data-arg="'+i+'"'+(QUICK[i]===sl?' class="on"':'')+'>'+(i+1)+'</button>').join('')+'</div>';
    }
    // ── 넣어 두면 되는 것
    const put=[];
    if(FIRING[id]) put.push('타는 화덕에 넣어 두면 → <b>'+ITEMS[FIRING[id].out].n+'</b>'+(FIRING[id].count>1?' ×'+FIRING[id].count:''));
    if(FUEL[id]) put.push('땔감 — 화덕·제련로에 넣으면 '+fmtFuel(FUEL[id])+' 동안 탄다');
    for(const S of SMELT) if(S.in.some(r=>r.id===id)||(S.need||[]).some(r=>r.id===id))
      put.push('제련로 — '+S.n+' → <b>'+ITEMS[S.out.id].n+'</b>'+(S.out.n>1?' ×'+S.out.n:''));
    if(put.length) h+='<div class="sS">넣어 두면</div><div class="sP">'+put.slice(0,6).map(p=>'<div>'+p+'</div>').join('')+'</div>';
    // ── 이것으로 만들 수 있는 것
    const uses=RECIPES.map((R,i)=>({R,i})).filter(o=>o.R.in.some(r=>bagUses(id,r))||(o.R.need||[]).some(r=>bagUses(id,r)));
    uses.forEach(o=>{ o.ok=canCraft(o.R); });
    uses.sort((a,b)=>(b.ok?1:0)-(a.ok?1:0));
    h+='<div class="sS">이것으로 만들 수 있는 것 <span class="q">'+uses.filter(o=>o.ok).length+' / '+uses.length+'</span></div>';
    if(!uses.length) h+='<div class="sE2">이 물건이 드는 제작법은 없다</div>';
    else h+='<div class="sR">'+uses.slice(0,40).map(o=>{
      const R=o.R, tool=(R.need||[]).some(r=>bagUses(id,r))&&!R.in.some(r=>bagUses(id,r));
      return '<div class="rw'+(o.ok?'':' no')+'" data-act="craft" data-arg="'+o.i+'">'
        +'<div class="rn">'+R.n+(tool?' <span class="q">도구로</span>':'')+'<span class="rk">'+R.tier+'</span></div>'
        +'<div class="rm">'+(o.ok?'<span class="g">지금 만들 수 있다 — 누르면 만든다</span>':'<span class="b">모자란 것: '+bagMissing(R)+'</span>')+'</div></div>';
    }).join('')+'</div>';
    // ── 이것을 만드는 법
    const made=RECIPES.filter(R=>R.out&&R.out.id===id);
    if(made.length) h+='<div class="sS">이것을 만드는 법</div><div class="sP">'+made.slice(0,3).map(R=>
      '<div>'+R.in.map(r=>matName(r)+' '+r.n).join(' + ')
      +((R.need||[]).length?' · 도구 '+R.need.map(matName).join(' · '):'')
      +(R.station?' · '+STATION[R.station].n+' 곁':'')+'</div>').join('')+'</div>';
  }
  if(h!==BAG.lastHtml){ const sc=el.scrollTop; el.innerHTML=h; BAG.lastHtml=h; el.scrollTop=sc; }
}
/* 고른 물건 칸의 단추 */
function bagAct(act,arg){
  const sl=INV.slots[INV.sel];
  if(act==='craft'){
    const R=RECIPES[+arg]; if(!R) return;
    if(!canCraft(R)){ toast('아직 못 만든다 — '+bagMissing(R)); return; }
    startCraft(R); toast(R.n+' — 만드는 중'); return;
  }
  if(!sl) return;
  const T=ITEMS[sl.id];
  if(act==='equip'){ EQUIP=sl; toast(T.n+' 들었다'); sfx('bind'); }
  else if(act==='unequip'){ if(EQUIP===sl) EQUIP=null; toast(T.n+' 내려놓음'); }
  else if(act==='wear'){ WEAR[T.wear.slot]=sl; refreshWear(); toast(T.n+' 입었다'); sfx('bind'); }
  else if(act==='unwear'){ if(WEAR[T.wear.slot]===sl) WEAR[T.wear.slot]=null; refreshWear(); toast(T.n+' 벗음'); }
  else if(act==='eat'){ eatSlot(sl); }
  else if(act==='quick'){
    const i=+arg;
    if(QUICK[i]===sl) QUICK[i]=null;
    else{ for(let k=0;k<QUICK.length;k++) if(QUICK[k]===sl) QUICK[k]=null; QUICK[i]=sl; toast((i+1)+'번 칸에 넣었다'); }
    quickDirty=true;
  }
  else if(act==='drop1'||act==='dropAll'){
    const n=act==='drop1'?1:sl.n;
    invRemove(INV.slots.indexOf(sl),n); refreshWear(); quickDirty=true;
    toast('버렸다 — '+T.n+' ×'+n); sfx('bind');
  }
  invDirty=true; craftDirty=true;
}
bagWire();
