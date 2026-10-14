/* 60-stations.js — CASTAWAY
   설비 — 모닥불·제련로·숫돌·모루·물레방아·발전기 · 보관함(바구니·상자·쓰레기통)과 이름표 · 용기 공통(넣고 빼기)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12-b) 불
   ----------------------------------------------------------------------------
   · 점화는 활비비(마찰) + 부싯깃. 힘이 많이 들고 자주 실패한다.
   · 연료는 게임시간 단위로 탄다. 나뭇가지는 금방, 통나무와 석탄은 오래.
   · 모닥불 옆 화강암은 열을 받아 균열이 간다(화입법). 균열이 가면 등급이 3→2로
     내려가 돌 곡괭이로 떼어낼 수 있다.
   ========================================================================== */
const FUEL={branch:0.15, log:1.2, charcoal:2.0, coal_lump:2.5};   // 게임시간(h)
/* 모닥불 소성 — 넣어두고 자리를 떠도 된다. 불이 붙어 있는 동안만 익는다. */
const FIRING={
  pot_raw:     {out:'pot',      hours:0.6, count:1},   // 게임 36분
  crucible_raw:{out:'crucible', hours:0.9, count:1},   // 게임 54분 — 두꺼워 오래 걸린다
  brick_raw:   {out:'brick',    hours:0.5, count:1},   // 벽돌 — 가마를 짓는다
  // 숯가마: 흙을 덮어 산소를 막고 태우면 타 없어지지 않고 숯이 된다.
  // 통나무를 그대로 넣으면 연료로 쓸지 구울지 구분이 안 되므로 재료를 따로 둔다.
  charcoal_pile:{out:'charcoal', hours:1.5, count:4},
  // 고기와 물고기는 모닥불에 넣어두면 익는다 — 날로 먹으면 탈이 난다
  meat_bear:   {out:'meat_cooked', hours:0.25, count:1},   // 게임 15분
  fish:        {out:'fish_cooked', hours:0.15, count:1},
  mushroom:    {out:'mushroom_cooked', hours:0.08, count:1},   // 숲의 버섯 — 구워야 탈이 없다
  fern:        {out:'fern_cooked', hours:0.06, count:1},
  banana:      {out:'banana_baked', hours:0.07, count:1},
  bird_raw:    {out:'bird_cooked', hours:0.18, count:1},
  egg:         {out:'egg_cooked', hours:0.06, count:1},
  seaweed:     {out:'ash',  hours:0.20, count:1},              // 바닷말을 태운 재(소다회) — 잿물·유리로 이어진다
  coral:       {out:'lime', hours:0.50, count:1},              // 산호·불가사리는 석회질이다 — 구우면 석회
  starfish:    {out:'lime', hours:0.40, count:1},
  // 바다 것 — 종류마다 굽는 시간이 조금씩 다르다(살이 두꺼울수록 오래)
  clownfish:   {out:'clownfish_cooked', hours:0.10, count:1},
  angelfish:   {out:'angelfish_cooked', hours:0.10, count:1},
  pufferfish:  {out:'pufferfish_cooked', hours:0.20, count:1},
  eel:         {out:'eel_cooked', hours:0.20, count:1},
  flounder:    {out:'flounder_cooked', hours:0.18, count:1},
  mackerel:    {out:'mackerel_cooked', hours:0.15, count:1},
  salmon:      {out:'salmon_cooked', hours:0.25, count:1},
  corvina:     {out:'corvina_cooked', hours:0.15, count:1},
  cod:         {out:'cod_cooked', hours:0.22, count:1},
  tuna:        {out:'tuna_cooked', hours:0.20, count:1},
  swordfish:   {out:'swordfish_cooked', hours:0.20, count:1},
  clam:        {out:'clam_cooked', hours:0.10, count:1},
  oyster:      {out:'oyster_cooked', hours:0.10, count:1}
};
const FIRES=[];
const IGNITE={t:0, dur:8, stam:9};   // 8초 × 9 = 72 — 기력이 가득하면 한 번에 붙는다
/* 켜는 데 걸리는 시간과 부싯깃이 드는지는 손에 든 것이 정한다.
   활비비(fire 1)는 8초에 부싯깃이 들고, 긴 라이터(fire 3)는 2.7초에 그냥 붙는다. */
const igniteDur=e=>IGNITE.dur/((e&&(ITEMS[e.id].tool||{}).fire)||1);
const needsTinder=e=>((e&&(ITEMS[e.id].tool||{}).fire)||1)<2;

// 플레이어 앞 1.4 m 지점을 검사한다. 재료를 소모하기 전에 먼저 부른다.
function campfireSpot(){
  const x=PL.pos.x-Math.sin(PL.yaw)*1.4, z=PL.pos.z-Math.cos(PL.yaw)*1.4;
  /* 토대·지붕 위에도 놓는다(사용자 요청) — 발 높이에서 닿는 바닥(floorAt)이 땅보다 높으면 그 판 위다(물가·비탈 검사는 땅일 때만) */
  const g=heightAt(x,z), y=floorAt(x,z,PL.pos.y), onB=y>g+0.05;
  if(!onB){
    if(y<0.4) return {ok:false, why:'물가에는 놓을 수 없다'};
    if(sampleAt(x,z).slope>0.6) return {ok:false, why:'너무 가파르다'};
  }else if(Math.abs(floorAt(x+0.45,z,y+0.1)-y)>0.05||Math.abs(floorAt(x-0.45,z,y+0.1)-y)>0.05
         ||Math.abs(floorAt(x,z+0.45,y+0.1)-y)>0.05||Math.abs(floorAt(x,z-0.45,y+0.1)-y)>0.05)
    return {ok:false, why:'판 가장자리라 걸치지 않는다 — 조금 더 안쪽에'};
  for(const f of FIRES) if(Math.hypot(f.x-x,f.z-z)<3&&Math.abs(f.y-y)<1.5) return {ok:false, why:'이미 모닥불이 있다'};
  return {ok:true,x,y,z,onB,onF:onB&&onFound(x,z,y)};
}
/* 그 자리가 집 바닥(토대나 그 위 지붕)인가 — 다진 터(시멘트)는 집 바닥이 아니다 */
function onFound(x,z,y){
  const f=FOUNDS.get(fkey(Math.round(x/CELL_B),Math.round(z/CELL_B)));
  return !!f&&!f.ghost&&y>=f.y-0.05;                  // 맨땅의 바탕(토대 없이 세운 칸)은 집 바닥이 아니다
}
const FIRE_ON_FOUND='불을 쓰는 설비는 집 바닥(토대) 위에 못 놓는다 — 맨땅이나 시멘트로 다진 터에 놓는다';
/* 제련로 — 돌과 점토로 쌓은 노. 송풍관으로 바람을 넣어야 광석이 녹는 온도가 된다.
   모닥불과 마찬가지로 '안에 넣어두는' 설비다. 광석과 참숯을 넣고 도가니·송풍관을
   같이 넣어두면(이 둘은 닳지 않고 그대로 남는다) 알아서 제련이 돌아간다.
   참숯이 연료이자 환원제이므로 따로 땔감을 먹이지 않는다. */
const SMELT=[
  {id:'smelt_copper', n:'구리 제련', hours:0.8, out:{id:'ingot_copper',n:1},
   note:'공작석을 참숯과 함께 도가니에 넣고 바람을 불어 1100 ℃까지 올린다.',
   in:[{id:'malachite',n:2},{id:'charcoal',n:3}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},
  {id:'smelt_tin', n:'주석 제련', hours:0.6, out:{id:'ingot_tin',n:1},
   note:'석석은 구리보다 낮은 온도에서 환원된다. 주석은 무르고 잘 흐른다.',
   in:[{id:'cassiterite',n:2},{id:'charcoal',n:2}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},
  {id:'alloy_bronze', n:'청동 합금', hours:0.7, out:{id:'ingot_bronze',n:3},
   note:'구리에 주석을 9대 1쯤 섞는다. 둘 다보다 단단하고 녹는점은 오히려 낮다.',
   in:[{id:'ingot_copper',n:3},{id:'ingot_tin',n:1},{id:'charcoal',n:2}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},
  {id:'melt_glass', n:'유리 굽기', hours:1.1, out:{id:'glass',n:2},
   note:'규사만으로는 1700 ℃가 필요하다. 재를 섞어 녹는점을 낮추고 도가니째 굽는다. '
       +'모래를 쏟아 넣고 나면 빈 토기가 그대로 남는다.',
   in:[{id:'pot_sand',n:2},{id:'charcoal',n:4}],
   back:[{id:'pot',n:2}],                          // 비운 그릇은 돌려받는다
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},
  {id:'melt_glass_lime', n:'유리 굽기(석회)', hours:1.0, out:{id:'glass',n:3},
   note:'모래에 재만 넣은 유리는 물에 녹는다. 석회를 같이 넣어야 단단한 유리가 되고, 같은 모래에서 더 많이 나온다.',
   in:[{id:'pot_sand',n:2},{id:'lime',n:1},{id:'charcoal',n:3}],
   back:[{id:'pot',n:2}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},
  {id:'smelt_iron', n:'괴련철 제련', hours:1.4, out:{id:'bloom_iron',n:1},
   note:'철은 녹지 않는다. 노 바닥에 쇠똥과 뒤엉킨 해면철 덩이로 남는다.',
   in:[{id:'bog_iron',n:3},{id:'charcoal',n:5}],
   need:[{id:'blowpipe',n:1}]},

  /* 아연은 끓는점(907 ℃)이 녹는점보다 낮다 — 환원되는 족족 증기로 날아가므로
     도가니를 엎어 덮고 식은 벽에 응결시켜 긁어낸다. 그래서 수율이 나쁘다. */
  /* 납은 다루기 쉬운 금속이다 — 327 ℃ 면 녹아 흘러 모닥불 불로도 닿는다.
     방연석은 황화물이라 먼저 구워 황을 날린 뒤 숯과 환원한다. */
  {id:'smelt_lead', n:'납 제련', hours:0.9, out:{id:'ingot_lead',n:1},
   note:'방연석을 구워 황을 날리고 숯과 함께 환원한다. 납은 낮은 열에 녹아 '
       +'바닥으로 흘러 고인다 — 다른 금속보다 수월하다.',
   in:[{id:'galena',n:2},{id:'charcoal',n:3}],
   need:[{id:'blowpipe',n:1}]},

  /* 수은은 제련이라기보다 증류다 — 진사를 구우면 수은이 김으로 날아오르고
     황은 연기로 빠진다. 찬 덮개에 맺힌 것을 긁어 받는다. 김을 마시면 병난다. */
  {id:'smelt_mercury', n:'수은 받기', hours:1.1, out:{id:'mercury',n:1},
   note:'진사를 구우면 수은이 김으로 날아오른다. 도가니를 엎어 덮고 식은 벽에 '
       +'맺힌 방울을 긁어 토기에 받는다 — 김은 마시면 안 된다.',
   in:[{id:'cinnabar',n:3},{id:'charcoal',n:2},{id:'pot',n:1}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},

  {id:'smelt_zinc', n:'아연 제련', hours:1.0, out:{id:'ingot_zinc',n:1},
   note:'섬아연석을 구워 산화물로 바꾼 뒤 숯과 함께 밀폐해 환원한다. '
       +'아연은 녹기 전에 끓으므로 증기를 받아 굳힌다 — 세 덩이에 주괴 하나뿐이다.',
   in:[{id:'sphalerite',n:3},{id:'charcoal',n:4}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},

  {id:'alloy_brass', n:'황동 합금', hours:0.8, out:{id:'ingot_brass',n:3},
   note:'구리에 아연을 셋에 하나쯤 섞는다. 청동보다 무르지만 훨씬 잘 늘어나 '
       +'얇은 관과 탄피로 뽑힌다. 금빛이 도는 것은 아연 덕이다.',
   in:[{id:'ingot_copper',n:2},{id:'ingot_zinc',n:1},{id:'charcoal',n:2}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]},

  /* 도가니강 — 연철 조각과 숯을 함께 밀폐해 오래 달구면 탄소가 쇠로 스며든다.
     괴련철을 두들겨 만든 연철이 있어야 시작할 수 있다. */
  {id:'alloy_steel', n:'도가니강', hours:2.0, out:{id:'ingot_steel',n:2},
   note:'연철 조각을 숯과 함께 도가니에 밀봉하고 오래 달군다. 탄소가 쇠 속으로 '
       +'스며들어 굳기가 달라진다 — 섬에서 만들 수 있는 가장 좋은 쇠다.',
   in:[{id:'iron_wrought',n:3},{id:'charcoal',n:6}],
   need:[{id:'crucible',n:1},{id:'blowpipe',n:1}]}
];
/* ── 기술 나무에 설비 공정도 세운다(사용자 요청 — 도가니로 주석을 녹이는 것 같은 일이 나무에 없었다) ──
   제련로(SMELT)와 모닥불·가마 굽기(FIRING)를 제작법 꼴(`proc`)로 RECIPES 끝에 붙인다 — 맨 끝이라 예전 번호(고른 제작법 등)는 그대로다.
   직접 만드는 것이 아니므로 `canCraft` 는 늘 거짓이고, 누르면 어디에 무엇을 넣으면 되는지 알린다(`procHow`).
   그래서 재료 쪽에서 '이것을 만드는 법' 이 제련·굽기로 이어진다(주석 → 주석 제련 → 석석·참숯·도가니·송풍관). */
const PROC_TIER=id=>/steel/.test(id)?'강철':/iron|bloom/.test(id)?'철기':/ingot_|mercury|bronze|brass/.test(id)?'금속':/glass/.test(id)?'금속':null;
for(const S of SMELT) RECIPES.push({id:'proc_'+S.id, proc:'furnace', tier:PROC_TIER(S.out.id)||'금속', n:S.n, out:S.out, in:S.in, need:S.need,
  station:'furnace', time:Math.round(S.hours*60), stam:0, note:'제련로에 재료'+(S.need?'와 '+S.need.map(r=>ITEMS[r.id].n).join('·'):'')+'를 넣고 불을 붙여 두면 저절로 된다(게임 '+Math.round(S.hours*60)+'분). '+(S.note||'')});
for(const k in FIRING){ const F=FIRING[k]; if(!ITEMS[k]||!ITEMS[F.out]) continue;
  RECIPES.push({id:'proc_fire_'+k, proc:'fire', tier:'불', n:ITEMS[F.out].n+' 굽기', out:{id:F.out,n:F.count||1}, in:[{id:k,n:1}],
    station:'fire', time:Math.round(F.hours*60), stam:0, note:'타는 모닥불·가마에 '+ITEMS[k].n+'을 넣어 두면 '+ITEMS[F.out].n+'이 된다(게임 '+Math.round(F.hours*60)+'분 · 가마는 두 배 빠르다).'}); }
function procHow(R){ toast(R.proc==='furnace'?R.n+' — 제련로에 넣어 두는 일이다: '+R.in.concat(R.need||[]).map(r=>ITEMS[r.id].n+' '+r.n).join(' · ')
                                            :R.n+' — 타는 모닥불이나 가마에 '+ITEMS[R.in[0].id].n+'을 넣어 둔다'); }

const FURNACES=[];
const nearFurnace=()=>FURNACES.some(g=>Math.hypot(g.x-PL.pos.x,g.z-PL.pos.z)<3.4);
function placeFurnace(){
  const spot=campfireSpot();
  if(!spot.ok){ toast(spot.why); return false; }
  if(spot.onF){ toast(FIRE_ON_FOUND); return false; }
  for(const g of FURNACES) if(Math.hypot(g.x-spot.x,g.z-spot.z)<3){
    toast('이미 제련로가 있다'); return false; }
  placeFurnaceAt(spot.x,spot.y,spot.z);
  toast('제련로를 쌓았다');
  return true;
}
function placeFurnaceAt(px,py,pz){
  /* 청동기 수형로(shaft furnace) 형태.
     아래가 부르고 목이 좁은 점토 몸통 · 밑동을 두른 석재 ·
     전면 출탕 아치 · 측면 송풍구에 갈대 대롱 · 바닥의 슬래그 홈. */
  const grp=new THREE.Group();
  const clay =new THREE.MeshLambertMaterial({color:0x8a6d4e});
  const clay2=new THREE.MeshLambertMaterial({color:0x7a5f43});
  const stone=new THREE.MeshLambertMaterial({color:0x74716a});
  const dark =new THREE.MeshBasicMaterial({color:0x1a0f08});
  const ember=new THREE.MeshBasicMaterial({color:0xff7a26});

  // 몸통 — 배부른 아래와 좁아지는 목을 두 단으로 이어 실루엣을 만든다
  const belly=new THREE.Mesh(new THREE.CylinderGeometry(0.74,0.94,0.98,11),clay);
  belly.position.y=0.49; grp.add(belly);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.74,0.78,11),clay);
  neck.position.y=1.36; grp.add(neck);
  const lip=new THREE.Mesh(new THREE.CylinderGeometry(0.54,0.44,0.17,11),clay2);
  lip.position.y=1.83; grp.add(lip);
  const mouth=new THREE.Mesh(new THREE.CylinderGeometry(0.40,0.40,0.06,11),dark);
  mouth.position.y=1.90; grp.add(mouth);

  // 점토를 덧바른 띠 — 밋밋한 원통을 끊어 준다
  for(let b=0;b<2;b++){
    const r=0.80-b*0.19;
    const band=new THREE.Mesh(new THREE.CylinderGeometry(r,r+0.03,0.10,11),clay2);
    band.position.y=0.72+b*0.62; grp.add(band);
  }

  // 밑동 석재 — 개체마다 다른 형상
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+0.3;
    const st=new THREE.Mesh(hearthStone(0.26),stone);
    st.position.set(Math.cos(a)*0.95,0.17,Math.sin(a)*0.95);
    st.rotation.set(Math.random()*6.283,Math.random()*6.283,Math.random()*6.283);
    const sc=0.8+Math.random()*0.5;
    st.scale.set(sc,sc*0.85,sc);
    grp.add(st);
  }

  // 전면 출탕 아치 — 쇳물과 쇠똥이 흘러나오는 구멍
  const arch=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.40,0.34),dark);
  arch.position.set(0,0.30,0.80); grp.add(arch);
  /* 제련이 도는 동안 — 아치 안에 이글거리는 잉걸(속 판) · 아치로 새는 불 · 목에서 솟는 불과 연기.
     예전엔 주황 판 하나였다. 전부 한 무리(glow)로 켜고 끈다 */
  const glow=new THREE.Group();
  const coal=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.24,0.06),ember);
  coal.position.set(0,0.28,0.98); glow.add(coal);
  // 아치 상자 앞면(z 0.97)보다 앞에 둬야 보인다 — 안에 두면 상자에 가려진다
  const archFire=makeFire(0.34,{smoke:false}); archFire.position.set(0,0.12,1.03); glow.add(archFire);
  const topFire=makeFire(0.85); topFire.position.set(0,1.93,0); glow.add(topFire);   // 목 위로 솟는다
  grp.add(glow);
  // 아치 위를 받치는 상인방 돌
  const lint=new THREE.Mesh(hearthStone(0.20),stone);
  lint.position.set(0,0.58,0.86); lint.scale.set(1.5,0.6,0.7); grp.add(lint);

  // 슬래그 홈 — 아치 앞으로 뻗은 돌 두 줄
  for(const sx of [-0.24,0.24]){
    const r1=new THREE.Mesh(hearthStone(0.14),stone);
    r1.position.set(sx,0.09,1.16); r1.scale.set(0.7,0.6,1.9);
    r1.rotation.y=Math.random()*0.4; grp.add(r1);
  }

  // 송풍구와 갈대 대롱
  const tuy=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.34,7),clay2);
  tuy.rotation.set(Math.PI/2.6,0,0.5);
  tuy.position.set(0.62,0.62,0.46); grp.add(tuy);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.042,0.9,6),
    new THREE.MeshLambertMaterial({color:0x8d9a5c}));
  pipe.rotation.set(Math.PI/2.4,0,0.62);
  pipe.position.set(0.95,0.86,0.70); grp.add(pipe);

  // 아치 안쪽의 잔열 — 제련이 돌아가는 동안에만 밝다
  const li=LIGHT.addFire(grp,{color:0xff7a26,intensity:1.0,dist:6,shadow:true,pos:[0,0.34,0.75]});
  glow.visible=false; li.visible=false;

  grp.rotation.y=Math.random()*Math.PI*2;
  grp.position.set(px,py,pz); scene.add(grp);
  const fu={kind:'furnace', cname:'제련로', cap:60, slotCap:10, slots:[],
            x:px,y:py,z:pz, mesh:grp, glow:glow, light:li,
            lit:false, fuel:0, jobs:{}};
  FURNACES.push(fu);
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:1.05}); buildColliderGrid();
  return fu;
}

/* 보관함 — 짐을 덜어놓는 자리. 적재 상한과 무관하게 쌓아둘 수 있다. */
const STORES=[];
/* 받침이 있으면 '을', 없으면 '를' — "쓰레기통를" 같은 말이 나오지 않게 */
const eulReul=w=>{ const c=w.charCodeAt(w.length-1); return w+((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?'을':'를'); };
const STORE_DEF={
  basket:{n:'엮은 바구니', cap:40},
  chest :{n:'나무 상자',  cap:120},
  /* 쓰레기통 — 넣은 것은 창을 닫는 순간 사라진다. 쓸모없는 것을 한꺼번에 치우는 자리 */
  trash :{n:'쓰레기통',   cap:80, trash:true}
};
function placeStore(kind){
  const spot=campfireSpot();
  if(!spot.ok){ toast(spot.why); return false; }
  for(const g of STORES) if(Math.hypot(g.x-spot.x,g.z-spot.z)<1.6&&Math.abs(g.y-spot.y)<1.5){
    toast('너무 가깝다'); return false; }
  placeStoreAt(kind,spot.x,spot.y,spot.z);
  toast(eulReul(STORE_DEF[kind].n)+' 놓았다');
  return true;
}
/* ── 이름표 ──────────────────────────────────────────────────────────────
   보관함이 여럿이면 어디에 무엇을 넣었는지 열어 보기 전엔 알 수 없었다. 창 머리의 '✎ 이름표'로 이름을
   적으면 그 이름이 창 · 조준 안내 · **세상에 뜬 이름표**(보관함 위 팻말)에 쓰이고 저장에도 남는다.
   이름표는 늘 화면을 보는 판(Sprite)이다 — 멀어져도 읽히게 거리에 맞춰 키우고, 28 m 밖에선 끈다. */
function makeTagSprite(text){
  const cvs=document.createElement('canvas'), g=cvs.getContext('2d');
  const FONT='700 64px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  g.font=FONT;
  const tw=Math.ceil(g.measureText(text).width), W=Math.min(1024,tw+72), H=104;
  cvs.width=W; cvs.height=H;
  const r=14;
  g.beginPath(); g.moveTo(r,3); g.lineTo(W-r,3); g.quadraticCurveTo(W-3,3,W-3,r); g.lineTo(W-3,H-r);
  g.quadraticCurveTo(W-3,H-3,W-r,H-3); g.lineTo(r,H-3); g.quadraticCurveTo(3,H-3,3,H-r); g.lineTo(3,r);
  g.quadraticCurveTo(3,3,r,3); g.closePath();
  g.fillStyle='rgba(250,240,214,0.94)'; g.fill();              // 종이 팻말
  g.lineWidth=5; g.strokeStyle='#4a3a26'; g.stroke();
  g.font=FONT; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#2e2416';
  g.fillText(text,W/2,H/2+2,W-30);
  const tex=new THREE.CanvasTexture(cvs); tex.minFilter=THREE.LinearFilter; tex.generateMipmaps=false;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sp.userData.aspect=W/H; sp.userData.lightRole='none'; sp.renderOrder=5;
  return sp;
}
function storeSetLabel(st,name){
  name=String(name||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,16);
  st.label=name;
  st.cname=name||STORE_DEF[st.kind].n;
  if(st.tag){ st.mesh.remove(st.tag); st.tag.material.map.dispose(); st.tag.material.dispose(); st.tag=null; }
  if(name){
    st.tag=makeTagSprite(name);
    st.tag.position.set(0,st.kind==='chest'?1.30:1.18,0);
    st.mesh.add(st.tag);
  }
  boxDirty=true;
}
function updateStoreTags(){
  for(const st of STORES){
    const t=st.tag; if(!t) continue;
    const d=Math.hypot(st.x-PL.pos.x,st.z-PL.pos.z,(st.y+1)-(PL.pos.y+1.6));
    t.visible=d<28;
    if(!t.visible) continue;
    const h=clamp(0.20+d*0.045,0.24,1.30);     // 가까이서도 또렷하게(사용자 요청 — 예전 0.11 m 는 너무 작았다), 멀면 읽힐 만큼 키운다
    t.scale.set(h*t.userData.aspect,h,1);
  }
}
/* 창 머리의 이름 고치기 — 보관함에서만. Enter 로 달고 Esc 로 그만둔다(빈 이름이면 이름표를 뗀다) */
function boxRenameStart(){
  const st=curStore; if(!st||!STORE_DEF[st.kind]) return;
  const inp=document.getElementById('boxNm');
  inp.value=st.label||''; inp.style.display='inline-block';
  document.getElementById('boxN').style.display='none';
  document.getElementById('boxRn').style.display='none';
  setTimeout(()=>{ inp.focus(); inp.select(); },0);
}
function boxRenameEnd(save){
  const inp=document.getElementById('boxNm');
  if(inp.style.display==='none'||!inp.style.display) return;
  inp.style.display='none';
  document.getElementById('boxN').style.display='';
  if(save&&curStore&&STORE_DEF[curStore.kind]){
    storeSetLabel(curStore,inp.value);
    toast(curStore.label?'이름표를 달았다 — '+curStore.label:'이름표를 뗐다'); sfx('bind');
  }
  inp.blur(); drawBox();
}
function placeStoreAt(kind,px,py,pz,slots,label,ry){
  const grp=new THREE.Group();
  if(kind==='trash'){                           // 쓰레기통 — 아가리가 벌어진 어두운 통
    const w=new THREE.MeshLambertMaterial({color:0x5a6258,side:THREE.DoubleSide}),
          w2=new THREE.MeshLambertMaterial({color:0x353b34});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.28,0.68,9,1,true),w);
    body.position.y=0.36; grp.add(body);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.05,9),w2); base.position.y=0.04; grp.add(base);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.38,0.03,6,14),w2);
    rim.rotation.x=Math.PI/2; rim.position.y=0.70; grp.add(rim);
    for(let i=0;i<3;i++){                       // 세로 띠
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.66,0.02),w2), a=i/3*6.283;
      b.position.set(Math.cos(a)*0.335,0.36,Math.sin(a)*0.335); b.rotation.y=-a+Math.PI/2; grp.add(b);
    }
    const dark=new THREE.Mesh(new THREE.CircleGeometry(0.34,9),new THREE.MeshBasicMaterial({color:0x0b0d0b}));
    dark.rotation.x=-Math.PI/2; dark.position.y=0.52; grp.add(dark);
  }else if(kind==='basket'){
    const w=new THREE.MeshLambertMaterial({color:0x9a8a52});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.32,0.56,10,1,true),w);
    body.position.y=0.28; grp.add(body);
    for(let i=0;i<3;i++){                       // 테두리 띠
      const r=0.34+i*0.04;
      const ring=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.05,10),
        new THREE.MeshLambertMaterial({color:0x8a7a44}));
      ring.position.y=0.08+i*0.22; grp.add(ring);
    }
    const base=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.33,0.05,10),w);
    base.position.y=0.03; grp.add(base);
  }else{
    const w=new THREE.MeshLambertMaterial({color:0x5f4a33});
    const w2=new THREE.MeshLambertMaterial({color:0x4d3b28});
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.05,0.52,0.68),w);
    body.position.y=0.26; grp.add(body);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(1.09,0.14,0.72),w2);
    lid.position.y=0.59; grp.add(lid);
    for(const sx of [-0.34,0,0.34]){            // 널을 묶은 노끈
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.56,0.72),
        new THREE.MeshLambertMaterial({color:0xa89a68}));
      b.position.set(sx,0.28,0); grp.add(b);
    }
  }
  grp.rotation.y=(typeof ry==='number'&&isFinite(ry))?ry:Math.random()*6.283;   // 불러올 때마다 돌아앉지 않게 저장한다
  grp.position.set(px,py,pz); scene.add(grp);
  const st={kind,cname:STORE_DEF[kind].n,label:'',tag:null,x:px,y:py,z:pz,mesh:grp,
            cap:STORE_DEF[kind].cap,slots:slots||[]};
  if(label) storeSetLabel(st,label);
  STORES.push(st);
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:kind==='chest'?0.62:0.45}); buildColliderGrid();
  return st;
}
/* ── 밀기 ──────────────────────────────────────────────────────────────
   설비는 만든 자리(발 앞 1.4 m)에 박혀 옮길 길이 없었다 — 조금만 어긋나게 놓아도 그대로 써야 했다(사용자 요청).
   이제 **F 를 누른 채** 설비를 보고 있으면 내 반대쪽으로 밀린다. 걸어서 따라가며 계속 밀고, 돌아가서 밀면 방향이 바뀐다.
   · 밀리는 것: 바구니 · 상자 · 쓰레기통 · 모닥불 · 제련로 · 숫돌 · 모루. 물레방아·발전기·아크로·선반·증기기관은
     물길·전선에 매여 있어 못 민다.
   · 무거울수록 느리고 힘이 든다(바구니 1.6 m/s … 제련로 0.7 m/s). 안에 든 것·불·이름표는 그대로 따라온다.
   · 물가·가파른 비탈·나무·바위·벽·다른 설비에 닿으면 멎는다. 저장하면 옮긴 자리가 남는다. */
function pushKind(c){
  if(STORES.indexOf(c)>=0) return c.kind;
  if(FIRES.indexOf(c)>=0) return c.steam?null:'fire';
  if(FURNACES.indexOf(c)>=0) return 'furnace';
  if(GRINDS.indexOf(c)>=0) return 'grind';
  if(ANVILS.indexOf(c)>=0) return 'anvil';
  return null;
}
/* 시선 앞 2.5 m 안의 밀 수 있는 설비 */
function findPushTarget(){
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw);
  let best=null, bd=2.5;
  for(const list of [STORES,FIRES,FURNACES,GRINDS,ANVILS]) for(const c of list){
    if(c.steam) continue;
    const dx=c.x-PL.pos.x, dz=c.z-PL.pos.z, d=Math.hypot(dx,dz);
    if(d>bd||d<0.05) continue;
    if((dx/d)*fx+(dz/d)*fz<0.45) continue;
    bd=d; best=c;
  }
  return best;
}
/* 설비의 충돌 원 — 놓을 때 COLLIDERS 에 넣은 것을 찾아 붙들어 둔다 */
function pushCollider(c){
  if(c._col&&COLLIDERS.indexOf(c._col)>=0) return c._col;
  c._col=COLLIDERS.find(o=>o.x===c.x&&o.z===c.z)||null;
  return c._col;
}
function pushEnd(){ moveCancel(); }
/* ── 옮기기(F) — 아크 서바이벌처럼 집어 들고, 돌리고, 내려놓는다(사용자 요청 — 예전엔 F 를 누르고 있는 동안 밀기라 불편했다) ──
   설비를 보고 F → 그 설비가 눈앞에 떠서 시선을 따라온다(바닥 · 토대 · 지붕 위 — `floorAt`). 휠·R 로 15° 씩 돌리고 좌클릭으로 놓는다.
   F 다시·우클릭·Esc 는 그만두기(제자리로). 놓을 자리가 안 되면 발밑 고리가 붉고 까닭이 뜬다. 안에 든 것·불·이름표는 그대로 따라온다.
   들고 있는 동안 그 설비의 충돌 원은 빼 두고(r 0), 놓을 때 새 자리·높이로 옮긴다(`cgMove`). 돌린 각은 저장된다(`ry`). */
const MOVE={t:null, ox:0, oy:0, oz:0, ory:0, ry:0, x:0, y:0, z:0, ok:false, why:'', col:null, cr:0, ring:null};
function moveStart(){
  if(MOVE.t) return;
  const c=findPushTarget(); if(!c) return false;
  if(!pushKind(c)){ toast(c.cname+' — 옮길 수 없다'); return false; }
  return moveBegin(c);
}
/* 그 설비를 집어 든다 — F 로 고른 것(moveStart)이든, 방금 지은 것(55-craft.js)이든 */
function moveBegin(c){
  if(MOVE.t||!c) return false;
  MOVE.t=c; MOVE.ox=c.x; MOVE.oy=c.y; MOVE.oz=c.z; MOVE.ory=MOVE.ry=c.mesh.rotation.y;
  MOVE.col=pushCollider(c); MOVE.cr=MOVE.col?MOVE.col.r:0.5; if(MOVE.col) MOVE.col.r=0;
  if(!MOVE.ring){ MOVE.ring=new THREE.Mesh(new THREE.RingGeometry(0.85,1,40).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0x7fe0a0,transparent:true,opacity:0.7,depthWrite:false,side:THREE.DoubleSide}));
    MOVE.ring.userData.lightRole='none'; MOVE.ring.renderOrder=6; scene.add(MOVE.ring); }
  MOVE.ring.visible=true; sfx('bind');
  return true;
}
/* 놓을 자리 — 눈에서 시선을 따라 걸어 바닥(땅·토대·지붕)에 닿는 첫 점. 4.5 m 안에 안 닿으면 앞 2.6 m 의 바닥 */
function moveAim(){
  const o=camera.position, cp=Math.cos(PL.pitch), dx=-Math.sin(PL.yaw)*cp, dy=Math.sin(PL.pitch), dz=-Math.cos(PL.yaw)*cp, ref=PL.pos.y+0.6;
  let x=PL.pos.x-Math.sin(PL.yaw)*2.6, z=PL.pos.z-Math.cos(PL.yaw)*2.6;
  for(let t=0.6;t<=4.5;t+=0.12){ const px=o.x+dx*t, py=o.y+dy*t, pz=o.z+dz*t; if(py<=floorAt(px,pz,ref)+0.02){ x=px; z=pz; break; } }
  const hx=x-PL.pos.x, hz=z-PL.pos.z, hd=Math.hypot(hx,hz), mn=MOVE.cr+0.55;   // 발밑으로 끌어오지 않게
  if(hd<mn){ const k=mn/(hd||1); x=PL.pos.x+(hd?hx:-Math.sin(PL.yaw))*k; z=PL.pos.z+(hd?hz:-Math.cos(PL.yaw))*k; }
  return [x,floorAt(x,z,ref),z];
}
function moveCheck(c,x,y,z){
  if(Math.abs(x)>HALF-8||Math.abs(z)>HALF-8) return '섬 끝이다';
  const g=heightAt(x,z), onB=y>g+0.05, r=MOVE.cr*0.9;
  if(!onB&&y<0.4) return '물가에는 놓을 수 없다';
  if(!onB&&sampleAt(x,z).slope>0.6) return '너무 가파르다';
  if(onB) for(const [ax,az] of [[r,0],[-r,0],[0,r],[0,-r]]) if(Math.abs(floorAt(x+ax,z+az,y+0.1)-y)>0.05) return '판 가장자리에 걸친다';
  if(Math.abs(y-(PL.pos.y))<1.2&&Math.hypot(x-PL.pos.x,z-PL.pos.z)<r+0.35) return '발밑에는 못 놓는다';
  const gx=Math.floor(x/CG), gz=Math.floor(z/CG);
  for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ const a=CGRID.get(cgKey(gx+dx,gz+dz)); if(!a) continue;
    for(const o of a){ if(o===MOVE.col||o.r<=0) continue;
      if(o.y0!==undefined&&(y>o.y1||y+1.2<o.y0)) continue;
      if(Math.hypot(x-o.x,z-o.z)<o.r+r) return '무엇인가에 걸린다'; } }
  /* 불을 쓰는 것은 **집 바닥(토대·지붕) 위에 못 놓는다**(사용자 요청) — 맨땅이나 시멘트로 다진 터에. 상자·바구니는 된다 */
  if(onB&&(c.kind==='fire'||c.kind==='furnace'||c.kind==='arc')&&onFound(x,z,y)) return '불을 쓰는 설비는 집 바닥에 못 놓는다 — 맨땅이나 다진 터에';
  if(c.kind==='fire'&&!c.steam) for(const f of FIRES) if(f!==c&&Math.hypot(f.x-x,f.z-z)<2.4&&Math.abs(f.y-y)<1.5) return '다른 불과 너무 가깝다';
  return '';
}
function updateMove(dt){
  const c=MOVE.t; if(!c) return;
  if(uiOpen()||BUILD.on||PL.swim||PL.dead||!pushKind(c)){ moveCancel(); return; }
  const [x,y,z]=moveAim(); MOVE.x=x; MOVE.y=y; MOVE.z=z;
  MOVE.why=moveCheck(c,x,y,z); MOVE.ok=!MOVE.why;
  c.mesh.position.set(x,y+0.02,z); c.mesh.rotation.y=MOVE.ry;
  const R=MOVE.cr+0.15; MOVE.ring.position.set(x,y+0.04,z); MOVE.ring.scale.set(R,1,R);
  MOVE.ring.material.color.setHex(MOVE.ok?0x7fe0a0:0xe07060);
}
function moveRotate(dir){ if(MOVE.t) MOVE.ry+=dir*Math.PI/12; }
function movePlace(){
  const c=MOVE.t; if(!c) return;
  if(!MOVE.ok){ toast(c.cname+' — '+MOVE.why); return; }
  LIGHT.dirtyAt(MOVE.ox,MOVE.oz,4);
  c.x=MOVE.x; c.y=MOVE.y; c.z=MOVE.z; c.mesh.position.set(c.x,c.y,c.z); c.mesh.rotation.y=MOVE.ry; if(c.ry!==undefined) c.ry=MOVE.ry;
  const col=MOVE.col; if(col){ col.r=MOVE.cr; cgMove(col,c.x,c.z); if(col.y0!==undefined){ col.y0=c.y-0.1; col.y1=c.y+1.8; } }
  LIGHT.dirtyAt(c.x,c.z,4); MOVE.t=null; MOVE.ring.visible=false;
  toast(c.cname+' — 옮겨 놓았다'); sfx('bind');
}
function moveCancel(){
  const c=MOVE.t; if(!c) return;
  c.mesh.position.set(MOVE.ox,MOVE.oy,MOVE.oz); c.mesh.rotation.y=MOVE.ory;
  if(MOVE.col) MOVE.col.r=MOVE.cr;
  MOVE.t=null; if(MOVE.ring) MOVE.ring.visible=false;
}
function updatePush(dt){ updateMove(dt); }
/* ── 용기 공통 ───────────────────────────────────────────────────────────────
   상자·모닥불·제련로는 모두 "안에 물건을 넣고 빼는 곳"이다. 넣고 빼는 규칙은
   한 벌만 두고, 모닥불과 제련로는 그 안에 든 것을 스스로 태우고 굽고 녹일 뿐이다.
   ─ 각 개체는 {kind, cname, cap, slots} 를 갖는다. */
const contWeight=c=>c.slots.reduce((a,s)=>a+ITEMS[s.id].kg*s.n,0);
const storeWeight=contWeight;                      // 옛 이름
const contCount=(c,id)=>c.slots.reduce((a,s)=>a+(s.id===id?s.n:0),0);
function contTake(c,id,n){                         // 안에서 n 개 덜어낸다
  let need=n;
  for(let i=c.slots.length-1;i>=0&&need>0;i--){
    if(c.slots[i].id!==id) continue;
    const take=Math.min(need,c.slots[i].n);
    c.slots[i].n-=take; need-=take;
    if(c.slots[i].n<=0) c.slots.splice(i,1);
  }
  boxDirty=true;
  return n-need;
}
function contAdd(c,id,n){                          // 산출물은 상한을 넘겨도 안에 남긴다
  const T=ITEMS[id];
  if(indiv(T)){
    for(let k=0;k<n;k++)
      stackInto(c.slots,id,1, T.frac?{amt:1} : T.sips?{sip:T.sips}
                            : (T.burn!==undefined)?{fuel:T.burn,lit:false}
                            : {dur:T.cell?0:T.durMax});
  }else stackInto(c.slots,id,n);
  boxDirty=true;
}
/* 안에 든 땔감 — 값싼 것부터 태운다. 참숯은 제련에 써야 하니 마지막이다.
   제련로에서는 참숯이 아예 땔감이 아니다 — 거기서 참숯은 연료가 아니라
   광석에서 산소를 떼어내는 환원제이고, 노를 데우는 것은 장작과 석탄이 맡는다. */
const FUEL_ORDER=['branch','log','coal_lump','charcoal'];
function contFuel(c){
  for(const id of FUEL_ORDER){
    if(c.kind==='furnace' && id==='charcoal') continue;
    if(contCount(c,id)>0) return id;
  }
  return null;
}
/* 불붙은 설비의 땔감을 축낸다. 다 타면 안에 든 다음 땔감을 스스로 끌어다 문다.
   모닥불과 제련로가 같은 규칙을 쓴다. 꺼졌으면 false 를 돌려준다. */
function burnFuel(f,dh){
  f.fuel-=dh*(f.hearthU?2:1);                          // 화덕은 두 배 빨리 익히는 만큼 땔감도 두 배로 먹는다
  while(f.fuel<=0){
    const id=contFuel(f);
    if(!id) break;
    contTake(f,id,1); f.fuel+=FUEL[id];
  }
  if(f.fuel>0) return true;
  f.fuel=0; f.lit=false;
  if(f.flame) f.flame.visible=false;
  if(f.glow)  f.glow.visible=false;
  f.light.visible=false;
  boxDirty=true;
  return false;
}
// 시선 앞의 용기 — 상자든 모닥불이든 제련로든 가장 가까운 하나
function findContainer(){
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw);
  let best=null,bd=1e9;
  const scan=(list,reach)=>{
    for(const c of list){
      const dx=c.x-PL.pos.x, dz=c.z-PL.pos.z, d=Math.hypot(dx,dz);
      if(d>reach||d<0.05||d>=bd) continue;
      if((dx/d)*fx+(dz/d)*fz<0.35) continue;
      bd=d; best=c;
    }
  };
  scan(STORES,2.8); scan(FIRES,3.0); scan(FURNACES,3.4); scan(GRINDS,3.2);
  scan(DYNAMOS,3.0);
  return best;
}
/* 넣고 빼기 — 도구는 개별 내구가 있으므로 슬롯을 통째로 옮긴다 */
const indiv=T=>!!(T.tool||T.sips||T.durMax);   // 칸마다 상태가 달라 겹칠 수 없는 것
function stackInto(arr,id,n,extra){
  const T=ITEMS[id];
  if(indiv(T)||extra){ arr.push(Object.assign({id,n:1},extra||{})); return 1; }
  const s=arr.find(x=>x.id===id&&x.dur===undefined&&x.fuel===undefined&&x.sip===undefined);
  if(s){ freshMerge(s,s.n,n,DECAY.carry); s.n+=n; } else { const o={id,n}; freshMerge(o,0,n,DECAY.carry); arr.push(o); }   // 들어온 때를 들고 간다(66-decay.js)
  return n;
}
function toStore(i,all){
  const st=curStore, sl=INV.slots[i]; if(!st||!sl) return;
  const T=ITEMS[sl.id];
  const room=Math.floor((st.cap-contWeight(st))/T.kg+1e-9);
  if(room<1){ toast(st.cname+'가 가득 찼다'); return; }
  /* 모닥불과 제련로는 칸 수도 제한된다. 안에 든 것이 저마다 함께 익으므로
     칸을 무제한으로 두면 설비 하나가 온갖 것을 동시에 처리해 버린다.
     이미 쌓여 있는 칸에 더 얹는 것은 칸이 늘지 않으니 막지 않는다. */
  if(st.slotCap && st.slots.length>=st.slotCap
     && !(!indiv(T) && st.slots.some(x=>x.id===sl.id&&x.dur===undefined
                                       &&x.fuel===undefined&&x.sip===undefined))){
    toast(st.cname+'에 넣을 자리가 없다 — '+st.slotCap+'칸까지만 들어간다'); return;
  }
  if(indiv(T)){
    stackInto(st.slots,sl.id,1,{dur:sl.dur,fuel:sl.fuel,lit:false,sip:sl.sip,mag:sl.mag,ammoId:sl.ammoId});   // 불붙은 횃불은 꺼서 넣는다
    invRemove(i,1);
  }else{
    const n=Math.min(all?sl.n:1,room);
    DECAY.carry=sl.t; stackInto(st.slots,sl.id,n); DECAY.carry=null; invRemove(i,n);
  }
  invDirty=true; boxDirty=true; sfx('bind');
}
function fromStore(i,all){
  const st=curStore, sl=st&&st.slots[i]; if(!sl) return;
  const T=ITEMS[sl.id];
  const room=Math.floor((INV.max-invWeight())/T.kg+1e-9);
  if(room<1){ toast('더 들 수 없다'); return; }
  const n=indiv(T)?1:Math.min(all?sl.n:1,room);
  if(indiv(T)) stackInto(INV.slots,sl.id,1,{dur:sl.dur,fuel:sl.fuel,lit:sl.lit,sip:sl.sip,mag:sl.mag,ammoId:sl.ammoId});
  else{ DECAY.carry=sl.t; stackInto(INV.slots,sl.id,n); DECAY.carry=null; }
  sl.n-=n; if(sl.n<=0) st.slots.splice(i,1);
  invDirty=true; boxDirty=true; sfx('bind');
}
