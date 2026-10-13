/* 92-save.js — CASTAWAY
   저장과 불러오기 — snapshot · restore · 묻는 상자 · 저장 칸(1~3 · 자동 · 이전 판) · 자동 저장
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   저장 / 불러오기
   ----------------------------------------------------------------------------
   지형과 자원 배치는 시드에서 결정론적으로 다시 만들어지므로 저장하지 않는다.
   시드·파라미터만 적어두고, 그 위에 '처음과 달라진 것'만 덧씌운다.
   자원 1만 8천 개 중 실제로 손댄 것만 기록되므로 저장 파일이 아주 작다.
   ========================================================================== */
const SAVE_VER=1;
/* 용기 속 슬롯은 소지품과 같은 모양으로 저장한다 */
const saveSlots=a=>a.map(sl=>({id:sl.id,n:sl.n,dur:sl.dur,fuel:sl.fuel,lit:sl.lit,
                               mag:sl.mag,ammoId:sl.ammoId,sip:sl.sip,pk:sl.pk}));
const loadSlots=a=>(a||[]).filter(sl=>ITEMS[sl.id]).map(sl=>{
  const o={id:sl.id,n:sl.n};
  if(sl.dur!==undefined) o.dur=sl.dur;
  if(sl.fuel!==undefined){ o.fuel=sl.fuel; o.lit=!!sl.lit; }
  if(sl.mag!==undefined) o.mag=sl.mag;
  if(sl.ammoId&&ITEMS[sl.ammoId]) o.ammoId=sl.ammoId;   // 탄창에 물린 탄 종류
  if(sl.sip!==undefined) o.sip=sl.sip;                  // 물통에 남은 모금
  if(sl.pk>0&&sl.pk<=6) o.pk=sl.pk|0;                   // 소지품의 내 칸(가방 화면)
  return o;
});

function propDiff(){
  const out=[];
  for(let i=0;i<PROPS.length;i++){
    const p=PROPS[i];
    const br=p.br|0, brM=p.brMax|0, ore=p.ore|0, oreM=p.oreMax|0;
    const lg=p.logs|0, lgM=p.logsMax|0, be=p.berry|0, beM=p.berryMax|0;
    const fl=(p.felled?1:0)|(p.cracked?2:0);
    /* 캐는 것(광석·바위)은 꺾을 것이 없어 br 이 처음부터 0 이다 — brMax 와 견주면 손도 안 댄 광석 1,700개가
       늘 '달라진 것'으로 적혔다(저장이 78 KB). 처음 값과 견준다 */
    const br0=HARVEST[p.k]?brM:0;
    if(br===br0 && ore===oreM && lg===lgM && be===beM && !fl && !p.heat) continue;
    /* 번호(i)만 적으면 섬이 한 포기라도 다르게 만들어졌을 때 엉뚱한 자원에 덧씌워진다 —
       자리(x·z)와 종류를 같이 적어 두고, 불러올 때 번호가 안 맞으면 자리로 찾는다(restore · findSavedProp) */
    out.push([i,br,ore,lg,be,fl,+(p.cut||0).toFixed(3),+(p.heat||0).toFixed(3),
              +p.x.toFixed(2),+p.z.toFixed(2),p.k]);
  }
  return out;
}
/* 저장된 한 줄이 가리키는 자원을 찾는다. 새 저장(자리·종류가 있다)은 번호가 맞는지 확인하고,
   안 맞으면 0.5 m 칸 표에서 같은 종류·같은 자리를 찾는다. 옛 저장(번호뿐)은 번호를 그대로 믿는다. */
let _propGrid=null;
function findSavedProp(r){
  /* 번호만 적힌 옛 저장은 **겹침 고치기 전 차례**(PROP_ORIG — 10-worldgen.js resolveOverlaps)로 찾는다. 뺀 자원이면 없음 */
  if(r.length<11){ const o=PROP_ORIG[r[0]]; return o&&!o.gone?o:null; }
  const p=PROPS[r[0]];
  const x=r[8], z=r[9], k=r[10];
  if(p && p.k===k && Math.abs(p.x-x)<0.06 && Math.abs(p.z-z)<0.06) return p;
  if(!_propGrid){
    _propGrid=new Map();
    const put=(q,x,z)=>{ const key=Math.round(x*2)+','+Math.round(z*2);
      let a=_propGrid.get(key); if(!a){ a=[]; _propGrid.set(key,a); } a.push(q); };
    for(const q of PROPS){ put(q,q.x,q.z); if(q.ox!==undefined) put(q,q.ox,q.oz); }   // 비켜 놓은 자원은 처음 자리로도 찾는다(고치기 전 저장)
  }
  const gx=Math.round(x*2), gz=Math.round(z*2);
  let best=null, bd=0.15;
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
    const a=_propGrid.get((gx+dx)+','+(gz+dz)); if(!a) continue;
    for(const q of a){ if(q.k!==k) continue;
      const d=Math.min(Math.hypot(q.x-x,q.z-z),q.ox!==undefined?Math.hypot(q.ox-x,q.oz-z):1e9); if(d<bd){ bd=d; best=q; } }
  }
  return best;
}
function snapshot(){
  return {
    v:SAVE_VER, at:new Date().toISOString().slice(0,19).replace('T',' '),
    gid:GAME_ID,                         // 어느 판인가 — 자동 저장이 다른 판을 덮기 전에 따로 남기려고(autoSave)
    det:1,                               // 자원 줄에 자리·종류가 들어 있다(propDiff)
    guar:GUARANTEE?1:0,                  // 광종 보장 — 꺼고 켜면 자원 배치가 달라진다
    nprops:PROPS.length,
    P:Object.assign({},P),
    t:{hour:hourOfDay, gh:gameHours, ts:timeScale},
    pl:{x:PL.pos.x,y:PL.pos.y,z:PL.pos.z,yaw:PL.yaw,pitch:PL.pitch,
        hp:PL.hp,stam:PL.stam,oxy:PL.oxy,food:PL.food,water:PL.water,
        ill:PL.ill},
    inv:saveSlots(INV.slots), pockets:INV.pockets.slice(0,6),
    sel:INV.sel, eq:EQUIP?INV.slots.indexOf(EQUIP):-1,
    wear:{body:WEAR.body?INV.slots.indexOf(WEAR.body):-1,
          armor:WEAR.armor?INV.slots.indexOf(WEAR.armor):-1,
          head:WEAR.head?INV.slots.indexOf(WEAR.head):-1,
          back:WEAR.back?INV.slots.indexOf(WEAR.back):-1},
    quick:QUICK.map(sl=>sl?INV.slots.indexOf(sl):-1),
    builds:{f:[...FOUNDS.values()].map(o=>[o.gx,o.gz,o.tier,+o.y.toFixed(2)]),
            w:[...WALLS.values()].map(o=>[o.gx,o.gz,o.L,o.s,o.tier,WALLV.indexOf(o.v||'wall'),
               o.leaf?[o.leaf.kind,o.leaf.tier,o.leaf.open?1:0]:0]),
            r:[...ROOFS.values()].map(o=>[o.gx,o.gz,o.L,o.tier]),
            sl:[...SLOPES.values()].map(o=>[o.gx,o.gz,o.L,o.s,o.tier]),
            gb:[...GABLES.values()].map(o=>[o.gx,o.gz,o.L,o.s,o.h,o.tier])},
    props:propDiff(),
    fires:FIRES.map(f=>({x:f.x,y:f.y,z:f.z,lit:f.lit,fuel:f.fuel,st:f.steam?1:0,
      cook:Object.assign({},f.cook), slots:saveSlots(f.slots)})),
    grinds:GRINDS.map(g=>({x:g.x,y:g.y,z:g.z})),
    furnaces:FURNACES.map(g=>({x:g.x,y:g.y,z:g.z,lit:g.lit,fuel:g.fuel,
      jobs:Object.assign({},g.jobs), slots:saveSlots(g.slots)})),
    anvils:ANVILS.map(g=>({x:g.x,y:g.y,z:g.z})),
    stores:STORES.map(g=>({k:g.kind,x:g.x,y:g.y,z:g.z,nm:g.label||'',ry:+g.mesh.rotation.y.toFixed(3),slots:saveSlots(g.slots)}),
    /* 전기 설비 — 여태 저장하지 않아 불러오면 통째로 사라졌다. 화학 단계가
       전부 이 넷 위에 서 있으므로(황산·질산·강선·충전) 같이 담는다. */
    ),
    sea:[...SEA.taken].filter(e=>gameHours-e[1]<SEA_REGROW).map(e=>[e[0],+e[1].toFixed(2)]),   // 주운 조개·굴·성게 자리
    cam:+CAMC.bat.toFixed(1),                       // 캠코더 배터리
    flora:[...FLORA.taken].filter(e=>gameHours-e[1]<72).map(e=>[e[0],+e[1].toFixed(2)]),        // 딴 덩굴·대나무·열매·버섯 자리
    power:{wheels:WHEELS.map(g=>[g.x,g.y,g.z]),
           dynamos:DYNAMOS.map(g=>[g.x,g.y,g.z]),
           arcs:ARCS.map(g=>[g.x,g.y,g.z]),
           lathes:LATHES.map(g=>[g.x,g.y,g.z])}
  };
}

async function restore(d){
  if(!d||d.v!==SAVE_VER) throw new Error('저장 형식이 맞지 않습니다 (v'+(d&&d.v)+')');
  /* 섬을 만드는 중이면 generateWorld 가 그냥 돌아와 버려, 저장을 **만들다 만 다른 섬 위에** 덧씌웠다 */
  if(busy){ toast('섬을 만드는 중입니다 — 끝난 뒤 다시 불러오세요'); return; }
  /* 한 군데가 틀려도 나머지는 살린다 — 예전엔 중간에 하나만 터져도 그 뒤(집·상자·소지품)가 통째로 안 돌아왔다 */
  const bad=[];
  const safe=(what,fn)=>{ try{ fn(); }catch(e){ console.error('[불러오기] '+what,e); bad.push(what); } };
  P.ws=1;                                      // 섬 배율이 없는 옛 저장은 1(1.9 km 섬) — 예전 섬 그대로 열린다
  Object.assign(P,d.P);
  if(P.ws!==2&&P.ws!==3) P.ws=1;
  if(d.guar!==undefined){ GUARANTEE=!!d.guar; const bg=document.getElementById('bGuar'); if(bg) bg.classList.toggle('on',GUARANTEE); }
  // 슬라이더도 저장값에 맞춘다
  const setv=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v; };
  setv('pSeed',P.seed); setv('pSize',P.size); setv('pRidge',P.ridge);
  setv('pEro',P.ero); setv('pSea',P.sea); setv('pRain',P.rain); setv('pLimb',P.limb);
  { const el=document.getElementById('pWs'); if(el){ el.value=P.ws; el.dispatchEvent(new Event('input')); } }
  await generateWorld();                       // 같은 시드 → 같은 지형·같은 자원 배치
  GAME_ID=d.gid||('old-'+(d.at||'')+'-'+P.seed);   // 이 판을 이어 한다(자동 저장이 같은 판으로 안다)

  _propGrid=null;
  let lostProps=0;
  /* 옛 저장(자원을 번호로만 적었다)이 **다른 배치의 섬**에서 만들어졌는지 가린다 — 예전 판은 같은 시드라도
     분기공 자리가 달라져(위 generateWorld) 유황 뒤로 놓이는 자원의 번호가 통째로 밀렸다. 나무·부싯돌·자갈은
     그 앞이라 늘 같다. 뒤쪽 줄 가운데 하나라도 그 자원이 가질 수 없는 값이면(풀에 광석 · 본래보다 많은 양)
     번호가 밀린 저장이다 — 그때는 뒤쪽을 엉뚱한 자원에 덧씌우지 않고 처음 상태로 둔다. */
  let legacySkip=-1;
  if(!d.det){
    const STABLE={oak:1,fir:1,flint:1,pebble:1};
    let se=PROP_ORIG.findIndex(p=>!STABLE[p.k]); if(se<0) se=PROP_ORIG.length;
    let odd=0;
    for(const r of d.props||[]){ if(r[0]<se) continue; const p=PROP_ORIG[r[0]];
      if(!p || r[1]>(p.brMax|0) || r[2]>(p.oreMax|0) || r[3]>(p.logsMax|0) || r[4]>(p.berryMax|0)) odd++; }
    if(odd) legacySkip=se;
  }
  for(const r of d.props||[]) safe('자원',()=>{
    if(legacySkip>=0 && r[0]>=legacySkip){ lostProps++; return; }
    const p=findSavedProp(r); if(!p){ lostProps++; return; }
    const cl=(v,mx)=>Math.max(0,Math.min(v|0,mx|0));   // 그 자원이 본래 가진 양을 넘지 않게
    p.br=cl(r[1],p.brMax); p.ore=cl(r[2],p.oreMax); p.logs=cl(r[3],p.logsMax); p.berry=cl(r[4],p.berryMax);
    p.felled=!!(r[5]&1)&&p.logsMax>0; p.cracked=!!(r[5]&2);
    if(r[6]) p.cut=r[6];
    if(r[7]) p.heat=r[7];
    shrinkFoliage(p);                          // 화면에도 반영
    if(HARVEST[p.k] && HARVEST[p.k].regrow!==undefined && p.br<=0) REGROW.push(p);
  });
  _propGrid=null;
  if(lostProps) console.warn('[불러오기] 자리를 못 찾은 자원 '+lostProps+'개 — 건너뛰었다');
  safe('베리',()=>refreshAllBerries());        // 따 놓은 만큼 덤불에서 빼 둔다
  for(const f of d.fires||[]) safe('화덕',()=>{
    PL.pos.set(f.x,f.y,f.z); PL.yaw=Math.PI;   // 설치 지점을 앞에 두기 위한 임시 위치
    if(f.st) placeSteamAt(f.x,f.y,f.z); else placeCampfireAt(f.x,f.y,f.z);   // 증기기관도 불 용기다
    const nf=FIRES[FIRES.length-1];
    nf.lit=f.lit; nf.fuel=f.fuel;
    nf.slots=loadSlots(f.slots);
    /* 굽던 진척 — 지금은 {구울것: 시간} 꾸러미다.
       한 가지씩만 굽던 옛 저장({id,t})도 그대로 받아 옮겨 준다. */
    nf.cook={};
    if(f.cook && typeof f.cook==='object'){
      if(f.cook.id!==undefined){ if(FIRING[f.cook.id]) nf.cook[f.cook.id]=f.cook.t||0; }
      else for(const k of Object.keys(f.cook)) if(FIRING[k]) nf.cook[k]=f.cook[k]||0;
    }
    // 가마 방식으로 저장된 옛 파일 — 굽던 것과 다 구운 것을 화덕 안으로 옮겨 준다
    if(f.kiln){
      const K=f.kiln;
      if(K.done>0) contAdd(nf,K.out,K.done*(K.count||1));
      const left=Math.max(0,(K.n||0)-(K.done||0));
      if(left>0) contAdd(nf,K.id,left);
    }
    nf.flame.visible=f.lit; nf.light.visible=f.lit;
  });
  clearBuilds();
  if(d.builds){                                // 토대 → 벽 → 지붕 순서로 되살린다
    for(const [gx,gz,tier,y] of d.builds.f||[]) safe('토대',()=>placeFound(gx,gz,tier|0,y));
    for(const [gx,gz,L,s,tier,v,lf] of d.builds.w||[]) safe('벽',()=>{
      placeWall(gx,gz,L,s,tier|0,WALLV[v|0]);
      if(lf) placeFit(gx,gz,L,s,lf[0],lf[1]|0,!!lf[2]);
    });
    for(const [gx,gz,L,tier] of d.builds.r||[]) safe('지붕',()=>placeRoof(gx,gz,L,tier|0));
    for(const [gx,gz,L,s,tier] of d.builds.sl||[]) safe('경사 지붕',()=>placeSlope(gx,gz,L,s,tier|0));
    for(const [gx,gz,L,s,h,tier] of d.builds.gb||[]) safe('박공',()=>placeGable(gx,gz,L,s,h,tier|0));
  }
  for(const g of d.grinds||[]) safe('숫돌',()=>placeGrindstoneAt(g.x,g.y,g.z));
  for(const g of d.anvils||[]) safe('모루',()=>placeAnvilAt(g.x,g.y,g.z));
  for(const g of d.stores||[]) safe('보관함',()=>{
    if(!STORE_DEF[g.k]) return;
    placeStoreAt(g.k,g.x,g.y,g.z,loadSlots(g.slots),g.nm,g.ry); });
  /* 물레방아를 먼저 세워야 발전기가 돌고, 발전기가 있어야 아크로·선반이 산다 */
  const PW=d.power||{};
  for(const [x,y,z] of PW.wheels||[])  safe('물레방아',()=>placeWheelAt(x,y,z));
  for(const [x,y,z] of PW.dynamos||[]) safe('발전기',()=>placeDynamoAt(x,y,z));
  for(const [x,y,z] of PW.arcs||[])    safe('아크로',()=>placeArcAt(x,y,z));
  for(const [x,y,z] of PW.lathes||[])  safe('선반',()=>placeLatheAt(x,y,z));
  for(const g of d.furnaces||[]) safe('제련로',()=>{
    const fu=placeFurnaceAt(g.x,g.y,g.z);
    fu.slots=loadSlots(g.slots);
    /* 불을 안 때던 판의 세이브 — 진척(t)만 있고 불이 없다. 꺼진 채로 연다.
       땔감을 넣고 불을 붙이면 그때부터 돈다. */
    fu.lit=!!g.lit; fu.fuel=g.fuel||0;
    fu.jobs=(g.jobs&&typeof g.jobs==='object')?Object.assign({},g.jobs):{};
    if(fu.lit){ fu.glow.visible=true; fu.light.visible=true; }
  });
  buildColliderGrid();

  // 소지품도 용기와 같은 규칙(loadSlots)으로 거른다. 없어진 아이템 id 가 슬롯에
  // 남으면 invWeight 가 매 프레임 터져 화면이 통째로 멎는다.
  // eq·wear 는 저장 당시의 inv 인덱스이므로, 버린 만큼 인덱스를 옮겨준다.
  const raw=d.inv||[], remap=[];
  let kept=0;
  for(const sl of raw) remap.push(ITEMS[sl.id]?kept++:-1);
  INV.slots.length=0;
  for(const o of loadSlots(raw)) INV.slots.push(o);
  INV.pockets=(Array.isArray(d.pockets)?d.pockets:[]).filter(t=>typeof t==='string').slice(0,6).map(t=>t.slice(0,10)); INV.view='all'; INV.ren=0;
  for(const o of INV.slots) if(o.pk>INV.pockets.length) delete o.pk;
  const slotAt=ix=>(ix>=0&&remap[ix]>=0)?INV.slots[remap[ix]]:null;

  INV.sel=d.sel|0;
  EQUIP=slotAt(d.eq);
  for(const k in WEAR){
    const sl=slotAt(d.wear?d.wear[k]:-1);
    WEAR[k]=(sl&&ITEMS[sl.id].wear)?sl:null;   // 착용 못 하는 것이 칸에 앉으면 wornSum 이 터진다
  }
  for(let i=0;i<QUICK.length;i++)             // 빠른 칸도 같은 규칙으로 옮긴다
    QUICK[i]=slotAt(d.quick?d.quick[i]:-1);
  quickDirty=true;
  refreshWear();
  invDirty=true; craftDirty=true;

  hourOfDay=d.t.hour; gameHours=d.t.gh; timeScale=d.t.ts||1;
  safe('바다',()=>{ SEA.taken=new Map((d.sea||[]).filter(e=>Array.isArray(e)&&typeof e[0]==='string')); SEA.dirty=true; });
  safe('캠코더',()=>{ CAMC.bat=typeof d.cam==='number'?clamp(d.cam,0,100):100; });
  safe('식생',()=>{ FLORA.taken=new Map((d.flora||[]).filter(e=>Array.isArray(e)&&typeof e[0]==='string')); FLORA.near.cx=FLORA.far.cx=1e9; });
  PL.pos.set(d.pl.x,d.pl.y,d.pl.z); PL.vel.set(0,0,0);
  PL.yaw=d.pl.yaw; PL.pitch=d.pl.pitch;
  PL.stam=d.pl.stam; PL.oxy=d.pl.oxy;
  // 옛 저장 파일에는 배고픔이 없다 — 그때는 배부른 채로 시작한다
  PL.food=(d.pl.food===undefined)?100:d.pl.food; PL.ill=d.pl.ill||0;
  PL.water=(d.pl.water===undefined)?100:d.pl.water;   // 갈증이 없던 판에서 온 세이브
  PL.hp=(d.pl.hp===undefined)?HPMAX:d.pl.hp; PL.dead=false; hurtFlash=0;
  PL.camY=undefined;
  /* 저장된 자리가 지금 땅보다 아래면(옛 저장 · 지형이 조금 달라졌을 때) 땅 위로 올린다 — 땅속에 끼지 않게 */
  safe('자리',()=>{ const gy=heightAt(PL.pos.x,PL.pos.z); if(!(PL.pos.y>=gy-0.5)) PL.pos.y=gy+0.1; });
  safe('돌',()=>{ updateRubble(true); updateFlora(true); });
  const note=(legacySkip>=0?' · 옛 저장이라 광석·풀의 캔 자리는 처음 상태로 두었습니다(나무·집·상자·소지품은 그대로)'
              :lostProps?' · 자리를 못 찾은 자원 '+lostProps+'개는 처음 상태로 두었습니다':'')
            +(bad.length?' · 일부('+[...new Set(bad)].join('·')+')는 되살리지 못했습니다':'');
  toast('불러왔습니다 — '+d.at+note);
}

/* ── 예/아니오를 묻는 상자 ───────────────────────────────────────────────
   불러오기는 지금 하던 판을 덮어쓴다. 되돌릴 수 없으므로 한 번 묻는다.
   Y·Enter 가 예, N·Esc 가 아니오다. 상자가 떠 있는 동안에는 다른 키가 게임에
   닿지 않도록 캡처 단계에서 가로챈다. */
let askOpen=false, askYes=null, askNo=null;
function ask(title,sub,onYes,onNo){
  askOpen=true; askYes=onYes; askNo=onNo||null;
  for(const k of Object.keys(keys)) keys[k]=false;   // 눌린 채로 멈추지 않게
  document.getElementById('askT').textContent=title;
  document.getElementById('askS').textContent=sub||'';
  document.getElementById('ask').style.display='flex';
  if(document.pointerLockElement===cv) document.exitPointerLock();
}
function askClose(yes){
  if(!askOpen) return;
  askOpen=false;
  document.getElementById('ask').style.display='none';
  const fn=yes?askYes:askNo; askYes=askNo=null;
  if(fn) fn();
}
window.addEventListener('keydown',e=>{
  if(!askOpen) return;
  e.stopPropagation(); e.preventDefault();
  if(e.code==='KeyY'||e.code==='Enter'||e.code==='NumpadEnter') askClose(true);
  else if(e.code==='KeyN'||e.code==='Escape') askClose(false);
},true);

/* 저장 칸 — 슬롯 1~3 은 사람이 고른다(설정 창 · F5 저장 · F9 불러오기). 자동 저장(auto)은 게임이 쓴다 — 놀이 5분마다 ·
   새 섬을 만들기 전 · 그래픽이 끊겼을 때 · 데스크톱 판은 창을 닫을 때도. 불러오기는 넷 다 된다.
   브라우저에서는 브라우저 저장소(localStorage — 슬롯 1 은 예전 키 castaway.save1 그대로), 데스크톱 판(desktop/ — Electron)에서는
   파일이다 — window.DESKTOP 이 있으면 userData/saves/slot1~3.json · auto.json(Windows %APPDATA%\CASTAWAY\saves).
   파일 저장/열기는 어디서나 동작한다. */
const DESK=window.DESKTOP||null;
/* 'bak' — 자동 저장이 **다른 판**을 덮어쓰기 직전에 옛 자동 저장을 옮겨 두는 칸(autoSave). 새로 고친 뒤
   '아니오'를 눌러 새 판을 시작해도 하던 판이 5분 뒤 자동 저장에 지워지지 않는다. 불러오기만 된다. */
const SLOTS=['1','2','3','auto','bak'];
const isAutoSlot=s=>s==='auto'||s==='bak';
const slotKey=s=>s==='auto'?'castaway.auto':s==='bak'?'castaway.auto.bak':'castaway.save'+s;      // 브라우저 저장소 키
const slotFile=s=>s==='auto'?'auto':s==='bak'?'auto_bak':'slot'+s;                        // 데스크톱 판 파일 이름
const slotName=s=>s==='auto'?'자동 저장':s==='bak'?'이전 판 자동 저장':'슬롯 '+s;
/* 판 번호 — 새 섬을 만들 때마다 새로 받고, 불러오면 저장의 것을 잇는다 */
const newGameId=()=>Date.now().toString(36)+'-'+Math.floor(Math.random()*1e9).toString(36);
let GAME_ID=newGameId();
let curSlot='1', landed=false, autoT=0;            // 고른 칸 · 한 번이라도 상륙했나(저장할 것이 있나) · 자동 저장까지 센 시간
const AUTO_EVERY=300;                              // 놀이 5분마다(멈춘 동안은 안 센다)
function slotHas(s){ try{ return DESK?!!DESK.saveHas(slotFile(s)):!!localStorage.getItem(slotKey(s)); }catch(e){ return false; } }
function slotGet(s){ return DESK?DESK.saveRead(slotFile(s)):localStorage.getItem(slotKey(s)); }
function slotPut(s,text){
  if(!DESK) localStorage.setItem(slotKey(s),text);
  else { const r=DESK.saveWrite(slotFile(s),text); if(!r||!r.ok) throw new Error((r&&r.error)||'파일에 못 썼습니다'); }
  delete SLOT_META[s]; drawSlots();
}
/* 칸마다 언제 · 며칠째 — 고르는 목록과 '불러오겠습니까' 물음에 쓴다. 한 번 읽으면 그 칸에 다시 쓸 때까지 기억한다.
   저장의 at 은 UTC 라(toISOString) Z 를 붙여 읽고 이 컴퓨터 시각으로 보인다 */
const SLOT_META={};
function slotMeta(s){
  if(s in SLOT_META) return SLOT_META[s];
  let m=null;
  try{ const raw=slotGet(s); if(raw){ const d=JSON.parse(raw);
    m={ms:Date.parse(String(d.at||'').replace(' ','T')+'Z')||0, day:Math.floor(((d.t&&d.t.gh)||0)/24)+1, at:d.at||'',
       gid:d.gid||('old-'+(d.at||'')+'-'+((d.P&&d.P.seed)||'')), gh:(d.t&&d.t.gh)||0}; } }catch(e){ m=null; }
  return SLOT_META[s]=m;
}
function slotLabel(s){
  const m=slotMeta(s); if(!m) return slotName(s)+' — 비어 있음';
  const t=m.ms?new Date(m.ms):null, two=n=>String(n).padStart(2,'0');
  return slotName(s)+' — '+m.day+'일째 · '+(t?(t.getMonth()+1)+'/'+t.getDate()+' '+two(t.getHours())+':'+two(t.getMinutes()):m.at);
}
function drawSlots(){
  const el=document.getElementById('pSlot'); if(!el) return;
  el.innerHTML=SLOTS.map(s=>'<option value="'+s+'">'+slotLabel(s)+(isAutoSlot(s)?' (불러오기만)':'')+'</option>').join('');
  el.value=curSlot;
  document.getElementById('bSave').disabled=isAutoSlot(curSlot);
}
function saveLocal(){
  if(isAutoSlot(curSlot)){ toast('자동 저장 칸에는 직접 저장하지 않습니다 — 슬롯 1~3 을 고르세요'); return false; }
  try{
    slotPut(curSlot,JSON.stringify(snapshot()));
    toast(slotName(curSlot)+'에 저장했습니다'); return true;
  }catch(e){ showErr('저장',e); toast('저장 실패 — 파일로 저장을 쓰세요'); return false; }
}
/* 자동 저장 — 상륙해서 노는 동안만(섬을 만드는 중 · 죽은 채로는 안 한다). why 가 있으면 잠깐 알린다 */
function autoSave(why){
  autoT=0;
  if(!landed||busy||PL.dead) return false;
  try{
    /* 자동 저장 칸에 **다른 판**이 들어 있으면 덮기 전에 'bak' 으로 옮긴다. 다만 갓 시작한 판(2시간 미만 —
       실시간 2분)이 오래 한 판의 백업을 밀어내지는 않게 한다(새로 고침 → 새 판 → 또 새 판 … 에 진짜 판이 사라지지 않게) */
    const cur=slotMeta('auto');
    if(cur && cur.gid!==GAME_ID){
      const bk=slotMeta('bak');
      if(!(bk && cur.gh<2 && bk.gh>cur.gh)){ const raw=slotGet('auto'); if(raw) slotPut('bak',raw); }
    }
    slotPut('auto',JSON.stringify(snapshot())); if(why) toast('자동 저장 — '+why); return true; }
  catch(e){ console.error('[자동 저장]',e); return false; }
}
/* 탭을 닫거나 새로 고치거나 다른 탭으로 넘어갈 때도 남긴다 — 예전엔 5분마다만 저장해, 새로 고치면
   마지막 저장 뒤에 한 일(최대 5분)이 통째로 사라졌다. pagehide 는 새로 고침·닫기·뒤로 가기에 모두 온다. */
addEventListener('pagehide',()=>{ try{ autoSave(''); }catch(e){} });
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ try{ autoSave(''); }catch(e){} } });
async function loadSlot(s){                      // 묻지 않고 바로 — 안쪽 일꾼
  try{
    const raw=slotGet(s);
    if(!raw){ toast('저장된 기록이 없습니다 — '+slotName(s)); return; }
    await restore(JSON.parse(raw));
  }catch(e){ showErr('불러오기',e); }
}
/* 사람이 부르는 쪽 — 한 번 묻고 나서 불러온다. */
function askLoad(s){
  s=s||curSlot;
  if(askOpen) return;
  if(!slotHas(s)){ toast('저장된 기록이 없습니다 — '+slotName(s)); return; }
  ask('이 저장을 불러오겠습니까?', slotLabel(s)+' · 지금 하던 것은 사라집니다 · Y 예 · N 아니오',
      ()=>{ loadSlot(s); });
}
/* 섬이 다 만들어진 뒤 한 번만 — 가장 최근 저장(자동 저장 포함)을 불러오겠냐고 먼저 물어본다.
   아니오를 고르면 다시 묻지 않는다. 그때부터는 F9 · 설정 창이 불러오는 길이다. */
let askedOnce=false;
function offerLoadOnStart(){
  if(askedOnce) return;
  let best=null;
  for(const s of SLOTS){ const m=slotMeta(s); if(m&&(!best||m.ms>best.m.ms)) best={s,m}; }
  if(!best) return;
  askedOnce=true;
  ask('이전에 저장된 데이터를 불러오겠습니까?',
      slotLabel(best.s)+' · 아니오를 고르면 새로 시작합니다 · 나중에 F9 으로 불러올 수 있습니다',
      ()=>{ if(!isAutoSlot(best.s)){ curSlot=best.s; SET.slot=curSlot; saveSettings(); drawSlots(); } loadSlot(best.s); });
}
/* 새 섬은 지금 섬을 버린다 — 상륙했으면 한 번 묻고 자동 저장에 남긴 뒤 만든다(예전엔 R 한 번에 그냥 사라졌다) */
function newIsland(go,cancel){
  if(busy||askOpen){ if(cancel) cancel(); return; }
  if(!landed){ go(); return; }
  ask('새 섬을 만들겠습니까?','지금 섬은 자동 저장에 남깁니다(다음 자동 저장이 덮어씁니다) · Y 예 · N 아니오',
      ()=>{ autoSave('새 섬을 만들기 전'); go(); }, cancel);
}
function saveFile(){
  try{
    const blob=new Blob([JSON.stringify(snapshot())],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='castaway_'+P.seed+'_'+Date.now()+'.json';
    a.click(); URL.revokeObjectURL(a.href);
    toast('파일로 저장했습니다');
  }catch(e){ showErr('파일 저장',e); }
}
function loadFile(){
  const inp=document.getElementById('loadIn');
  inp.value=''; inp.click();
}
