/* 98-bag.js — CASTAWAY
   가방 화면 — 소지품과 제작을 **한 화면**에 나란히 띄운다(I). 열려 있어도 **시간은 흐른다**(몸만 멈춰 선다 — 사용자 요청으로 되돌렸다).
   물건을 누르면 오른쪽 칸에 그 물건으로 **할 수 있는 일**(들기·입기·먹기·빠른 칸·버리기)과 **지금 만들 수 있는 것**만 뜬다.
   얻는 법 · 쓰임 · 이것으로 만드는 것 같은 자세한 것은 **사전**에 있다 — '사전에서 자세히' 단추가 그 항목으로 건너간다(64-dex.js dexShow).
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
const BAG={el:null, sel:null, shown:false, lastHtml:'', tab:'inv', tip:null, tipKey:''};
function bagWire(){
  const bag=document.createElement('div'); bag.id='bag';
  /* 두 장으로 나눴다(사용자 요청: 소지품은 화면을 더 넓게, 제작은 기술 나무로) — 위의 탭으로 오간다.
       [소지품] 소지품(갈래 · 내 칸) + 고른 물건      [제작] 기술 나무 + 고른 제작법 */
  bag.innerHTML='<div class="bagH"><div class="bagT"><button data-bt="inv">소지품</button><button data-bt="craft">제작 · 기술 나무</button></div>'
    +'<span class="kclose"><b>I</b><b>Esc</b> 닫기 · 열려 있어도 시간은 흐른다</span></div>'
    +'<div class="bagB"><div class="pnl" id="sel"></div></div>';
  document.body.appendChild(bag);
  const body=bag.querySelector('.bagB'), sel=bag.querySelector('#sel');
  body.insertBefore(document.getElementById('inv'),sel);        // 왼쪽 — 소지품(소지품 탭)
  body.insertBefore(document.getElementById('crf'),sel);        // 왼쪽 — 기술 나무(제작 탭)
  BAG.el=bag; BAG.sel=sel;
  /* 고른 물건 칸의 단추 — 줄마다 달지 않고 칸 바탕에서 한 번에 받는다(다시 그려도 눌림이 안 빠진다) */
  sel.addEventListener('click',ev=>{
    const b=ev.target&&ev.target.closest?ev.target.closest('[data-act]'):null;
    if(b) bagAct(b.dataset.act,b.dataset.arg,ev.ctrlKey||ev.metaKey);
  });
  bag.querySelector('.bagT').addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(b) bagTab(b.dataset.bt); });
  /* 말풍선 — 물건·마디에 마우스를 올리면 드는 것과 쓰임이 뜬다 */
  const tip=document.createElement('div'); tip.id='tip'; document.body.appendChild(tip); BAG.tip=tip;
  bag.addEventListener('mousemove',bagTip);
  bag.addEventListener('mouseleave',()=>{ tip.style.display='none'; BAG.tipKey=''; });
  bagTab(BAG.tab);
}
function bagTab(t){
  BAG.tab=t==='craft'?'craft':'inv';
  BAG.el.classList.toggle('tab-inv',BAG.tab==='inv'); BAG.el.classList.toggle('tab-craft',BAG.tab==='craft');
  BAG.el.querySelectorAll('.bagT button').forEach(b=>b.classList.toggle('on',b.dataset.bt===BAG.tab));
  BAG.lastHtml=''; invDirty=craftDirty=true;
  const L=document.getElementById('crfL'); if(L) L._html=null;      // 탭을 바꾸면 마디 자리가 달라진다 — 줄을 다시 긋는다
  if(BAG.tip) BAG.tip.style.display='none';
}
/* 말풍선에 적을 것 — 제작법 마디면 드는 것·이것으로 만드는 것, 소지품이면 그 물건이 드는 제작법들 */
function bagTipHtml(el){
  if(el.dataset.tipr!==undefined){
    const R=RECIPES[+el.dataset.tipr]; if(!R) return '';
    let h='<b>'+R.n+'</b><div class="tk">드는 것</div>'
      +R.in.map(r=>{ const hv=countMat(r); return '<div class="'+(hv>=r.n?'g':'b')+'">'+matName(r)+' '+hv+' / '+r.n+'</div>'; }).join('');
    if(R.need&&R.need.length) h+='<div class="tk">도구(닳지 않는다)</div>'+R.need.map(r=>'<div class="'+(countMat(r)>=r.n?'g':'b')+'">'+matName(r)+'</div>').join('');
    if(R.station) h+='<div class="tk">자리</div><div class="'+(stationOK(R)?'g':'b')+'">'+STATION[R.station].n+' 곁</div>';
    if(R.out){ const us=craftUsers(R.out.id);
      h+='<div class="tk">이것으로 만드는 것'+(us.length?' · '+us.length:'')+'</div>'
        +(us.length?us.slice(0,8).map(U=>'<div>'+U.n+'</div>').join('')+(us.length>8?'<div class="d">… 그 밖에 '+(us.length-8)+'</div>':'')
                   :'<div class="d">없다 — 그대로 쓰는 물건이다</div>'); }
    return h;
  }
  const id=el.dataset.tipi, T=ITEMS[id]; if(!T) return '';
  const us=RECIPES.filter(R=>R.in.some(r=>bagUses(id,r))||(R.need||[]).some(r=>bagUses(id,r)));
  return '<b>'+T.n+'</b><div class="d">'+T.use+'</div><div class="tk">이것으로 만들 수 있는 것'+(us.length?' · '+us.length:'')+'</div>'
    +(us.length?us.slice(0,8).map(R=>'<div class="'+(canCraft(R)?'g':'')+'">'+R.n+' <span class="d">— '
        +R.in.map(r=>matName(r)+' '+r.n).join(' · ')+'</span></div>').join('')+(us.length>8?'<div class="d">… 그 밖에 '+(us.length-8)+'</div>':'')
      :'<div class="d">이 물건이 드는 제작법은 없다</div>');
}
function bagTip(ev){
  const tip=BAG.tip, el=ev.target&&ev.target.closest?ev.target.closest('[data-tipr],[data-tipi]'):null;
  if(!el||DRAG){ tip.style.display='none'; BAG.tipKey=''; return; }
  const key=(el.dataset.tipr!==undefined?'r'+el.dataset.tipr:'i'+el.dataset.tipi);
  if(key!==BAG.tipKey){ BAG.tipKey=key; tip.innerHTML=bagTipHtml(el); }
  tip.style.display='block';
  const w=tip.offsetWidth, h=tip.offsetHeight;
  tip.style.left=Math.max(6,Math.min(innerWidth-w-8,ev.clientX+16))+'px';
  tip.style.top=Math.max(6,Math.min(innerHeight-h-8,ev.clientY+14))+'px';
}
function openBag(focus){
  closeCfg();
  if(dexOpen){ dexOpen=false; document.getElementById('dex').style.display='none'; }
  if(boxOpen) toggleBox(null);
  invOpen=craftOpen=true; invDirty=craftDirty=true;
  bagSync();
  const q=document.getElementById('crfS');
  q.value=''; craftQuery='';                     // 열 때마다 새로 찾는다 — 검색칸은 눌러야 글자를 받는다(저절로 잡지 않는다)
  syncLock();
}
function closeBag(){
  invOpen=craftOpen=false; if(typeof ctreeHide==='function') ctreeHide(true); if(BAG.tip){ BAG.tip.style.display='none'; BAG.tipKey=''; }
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
  if(BAG.tab==='craft') h=selRecipe();
  else if(!sl){
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
    if(T.keys) h+='<br><br><div class="sGk">'+T.keys.map(([k,d])=>'<div><b>'+esc(k)+'</b><span>'+esc(d)+'</span></div>').join('')+'</div>';   // 두 줄 띄우고 조작 글쇠
    // ── 할 수 있는 일
    const acts=[];
    if(holdable(T)) acts.push(EQUIP===sl?['unequip','손에서 내려놓기']:['equip','손에 들기']);
    if(T.wear) acts.push(WEAR[T.wear.slot]===sl?['unwear','벗기']:['wear','입기('+WEAR_N[T.wear.slot]+')']);
    if(consumable(T)) acts.push(['eat',useVerb(T)]);
    if(T.read) acts.length=0;                        // 읽을거리는 들지도 버리지도 않는다(생존 안내서)
    else acts.push(['drop1','1개 버리기']);
    if(sl.n>1&&!T.read) acts.push(['dropAll','전부 버리기']);
    h+='<div class="sS">할 수 있는 일</div><div class="sA">'
      +acts.map(a=>'<button data-act="'+a[0]+'"'+(a[0].indexOf('drop')===0?' class="w"':'')+'>'+a[1]+'</button>').join('')+'</div>';
    if(INV.pockets.length){                          // 내 칸 — 눌러서 옮긴다(끌어다 칸 단추에 놓아도 된다)
      h+='<div class="sA q5"><span>칸</span><button data-act="pk" data-arg="0"'+(!sl.pk?' class="on"':'')+'>없음</button>'
        +INV.pockets.map((nm,i)=>'<button data-act="pk" data-arg="'+(i+1)+'"'+(sl.pk===i+1?' class="on"':'')+'>'+esc(nm)+'</button>').join('')+'</div>';
    }
    if(holdable(T)){
      h+='<div class="sA q5"><span>빠른 칸</span>'
        +[0,1,2,3,4].map(i=>'<button data-act="quick" data-arg="'+i+'"'+(QUICK[i]===sl?' class="on"':'')+'>'+(i+1)+'</button>').join('')+'</div>';
    }
    /* ── 자세한 것은 사전으로(사용자 요청: 가방이 어렵다 — 가방에는 그림 · 이름 · 개수 · 할 수 있는 일만, 나머지는 사전에).
       지금 만들 수 있는 것만 몇 줄 남긴다(누르면 만든다) */
    const uses=RECIPES.map((R,i)=>({R,i})).filter(o=>(o.R.in.some(r=>bagUses(id,r))||(o.R.need||[]).some(r=>bagUses(id,r)))&&canCraft(o.R));
    if(uses.length) h+='<div class="sS">지금 만들 수 있는 것 <span class="q">'+uses.length+'</span></div><div class="sR">'+uses.slice(0,5).map(o=>
      '<div class="rw" data-act="craft" data-arg="'+o.i+'"><div class="rn">'+o.R.n+'<span class="rk">누르면 만든다</span></div></div>').join('')+'</div>';
    h+='<div class="sA sL"><button data-act="dex" data-arg="'+id+'">사전에서 자세히 — 얻는 법 · 쓰임 · 만드는 것</button>'
      +'<button data-act="find" data-arg="'+id+'">제작 나무에서 찾기</button></div>';
  }
  if(h!==BAG.lastHtml){ const sc=el.scrollTop; el.innerHTML=h; BAG.lastHtml=h; el.scrollTop=sc; }
}
/* 고른 제작법 — 기술 나무에서 누른 마디의 재료 · 도구 · 자리 · 만들기 단추 · 앞뒤로 이어지는 것 */
function selRecipe(){
  const R=RECIPES[CRAFT.sel];
  if(!R) return '<div class="sH">고른 제작법</div><div class="sE">왼쪽에서 마디를 누르면<br>드는 재료와 <b>만들기</b> 단추가 여기에 뜬다<br><br>마디에 마우스를 올리면<br><b>조합 나무</b>가 곁에 뜬다<br>(드는 것 → 이것 → 이것으로 만드는 것)</div>';
  const ok=canCraft(R), out=R.out&&ITEMS[R.out.id], busy=CRAFT.recipe===R, ico=out?itemIcon(R.out.id):'';
  const link=(U)=>'<button class="lk" data-act="rsel" data-arg="'+RECIPES.indexOf(U)+'">'+U.n+' →</button>';
  let h='<div class="sH">고른 제작법</div><div class="sT">'+(ico?'<img src="'+ico+'" alt="">':'')
    +'<div><b>'+R.n+'</b>'+(R.out?' <span class="qo">×'+R.out.n+'</span>':'')
    +'<div class="sK">'+TIER_LABEL[R.tier]+' · '+(R.time||0)+'초 · 기력 '+(R.stam||0)+(out?' · '+(out.kg*R.out.n).toFixed(1)+' kg':' · 설치')+'</div></div></div>'
    +'<div class="sU">'+R.note+'</div>'
    +'<div class="sA"><button data-act="rcraft" class="go'+(ok?'':' off')+'">'+(R.proc?(R.proc==='furnace'?'제련로에 넣어 두는 일':'모닥불·가마에 넣어 두는 일'):busy?'만드는 중…':ok?'만들기':'아직 못 만든다')+'</button></div>';
  h+='<div class="sS">재료</div><div class="sP">'+R.in.map(r=>{ const hv=countMat(r), mk=r.id?craftMakers(r.id):[];
      return '<div class="'+(hv>=r.n?'g':'b')+'">'+matName(r)+' <span class="cn"><b>'+hv+'</b> / '+r.n+'</span>'+(hv<r.n&&mk.length?' '+link(mk[0]):'')+'</div>'; }).join('')+'</div>';
  if(R.need&&R.need.length) h+='<div class="sS">도구(닳지 않는다)</div><div class="sP">'+R.need.map(r=>{ const hv=countMat(r), mk=r.id?craftMakers(r.id):[];
      return '<div class="'+(hv>=r.n?'g':'b')+'">'+matName(r)+(hv<r.n&&mk.length?' '+link(mk[0]):'')+'</div>'; }).join('')+'</div>';
  if(R.station) h+='<div class="sS">작업 자리</div><div class="sP"><div class="'+(stationOK(R)?'g':'b')+'">'+STATION[R.station].n+' 곁에서</div></div>';
  if(R.out){ const us=craftUsers(R.out.id);
    h+='<div class="sS">이것으로 만드는 것 <span class="q">'+us.length+'</span></div>'
      +(us.length?'<div class="sP">'+us.slice(0,24).map(U=>'<div class="'+(canCraft(U)?'g':'')+'">'+link(U)+'</div>').join('')+'</div>':'<div class="sE2">없다 — 그대로 쓰는 물건이다</div>'); }
  return h;
}
/* 고른 물건 칸의 단추 */
function bagAct(act,arg,ctrl){
  if(act==='rcraft'){ const R=RECIPES[CRAFT.sel]; if(!R) return;
    if(R.proc){ procHow(R); return; }
    if(!canCraft(R)){ toast('아직 못 만든다 — '+bagMissing(R)); return; }
    startCraft(R); toast(R.n+' — 만드는 중'); craftDirty=true; return; }
  if(act==='rsel'){ const i=+arg; if(!RECIPES[i]) return;
    CRAFT.sel=i; craftTab=craftCat(RECIPES[i]);
    const q=document.getElementById('crfS'); q.value=''; craftQuery=''; document.getElementById('crfL')._html=null;
    if(BAG.tab!=='craft') bagTab('craft');
    craftDirty=true; return; }
  if(act==='dex'){ dexShow(arg); return; }
  if(act==='find'){ const T=ITEMS[arg]; if(!T) return;
    const q=document.getElementById('crfS'); q.value=T.n; craftQuery=T.n; document.getElementById('crfL')._html=null;
    bagTab('craft'); craftDirty=true; return; }
  const sl=INV.slots[INV.sel];
  if(act==='craft'){
    const R=RECIPES[+arg]; if(!R) return;
    if(!canCraft(R)){ toast('아직 못 만든다 — '+bagMissing(R)); return; }
    startCraft(R); toast(R.n+' — 만드는 중'); return;
  }
  if(!sl) return;
  const T=ITEMS[sl.id];
  if(act==='pk'){ sl.pk=+arg||undefined; toast(sl.pk?T.n+' → ▣ '+INV.pockets[sl.pk-1]:T.n+' — 칸에서 뺐다'); }
  else if(act==='equip'){ if(craftBusy()) return; EQUIP=sl; toast(T.n+' 들었다'); sfx('bind'); }
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
  else if(act==='drop1'||act==='dropAll'){ dropSlot(sl,act==='drop1'?1:sl.n,ctrl); }   // 묻고 버린다 · Ctrl 이면 바로(50-items.js)
  invDirty=true; craftDirty=true;
}
bagWire();
