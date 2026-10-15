/* 62-build.js — CASTAWAY
   집 짓기와 불빛 — 토대·벽·지붕·문짝 · 짓기 모드 · 불꽃 · 횃불·등잔·전등
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   집 짓기 — 토대 · 벽 · 지붕 · 경사 지붕 · 삼각 벽 (아크 서바이벌식 구조)
   ----------------------------------------------------------------------------
   · 3 m 격자에 붙는다. 토대가 칸을 차지하고, 벽은 칸의 네 변에, 지붕은 칸 위에.
   · **인접 토대에 높이를 맞춘다** — 이미 놓인 토대 옆에 놓으면 지형이 어떻든
     같은 높이로 붙는다. 비탈에 지어도 바닥 한 장이 평평하게 이어진다.
   · **층을 쌓는다** — 지붕은 밟고 다닐 수 있는 바닥이 되고, 그 위에 다시 벽을
     세워 이층을 올린다. 아크의 천장이 하는 일과 같다.
   · **등급 셋** — 초가 · 나무 · 돌. 재료와 튼튼함(내구)이 다르다.
   ========================================================================== */
const CELL_B=3.0;                                   // 격자 한 칸
const WALL_H=2.4, FOUND_UP=0.30;                    // 한 층 높이 · 토대를 지면에서 띄우는 높이
const BTIER=[
  {id:'thatch', n:'초가', hp: 80, c:{beam:0x8a7550, fill:0x9a8a52, deck:0x9a8a52},
   cost:{found:[{id:'branch',n:6},{id:'cord',n:3}],
         wall :[{id:'branch',n:5},{id:'fiber',n:6},{id:'cord',n:2}],
         roof :[{id:'branch',n:5},{id:'fiber',n:8},{id:'cord',n:2}],
         slope:[{id:'branch',n:6},{id:'fiber',n:8},{id:'cord',n:3}],
         gable:[{id:'branch',n:4},{id:'fiber',n:5},{id:'cord',n:2}],
         door :[{id:'branch',n:4},{id:'fiber',n:4},{id:'cord',n:2}],
         window:[{id:'branch',n:4},{id:'fiber',n:5},{id:'cord',n:2}],
         leaf :[{id:'branch',n:6},{id:'cord',n:3}],
         pane :[{id:'glass',n:2},{id:'branch',n:3},{id:'cord',n:2}],
         post :[{id:'branch',n:4},{id:'cord',n:2}]}},
  {id:'wood',   n:'나무', hp:300, c:{beam:0x6b5a3c, fill:0x8a7550, deck:0x7d6a48},
   cost:{found:[{id:'log',n:3},{id:'cord',n:3}],
         wall :[{id:'log',n:1},{id:'branch',n:5},{id:'cord',n:3}],
         roof :[{id:'log',n:1},{id:'branch',n:6},{id:'cord',n:3}],
         slope:[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:3}],
         gable:[{id:'log',n:1},{id:'branch',n:3},{id:'cord',n:2}],
         door :[{id:'log',n:1},{id:'branch',n:3},{id:'cord',n:3}],
         window:[{id:'log',n:1},{id:'branch',n:4},{id:'cord',n:2}],
         leaf :[{id:'log',n:1},{id:'branch',n:4},{id:'cord',n:3}],
         pane :[{id:'glass',n:2},{id:'log',n:1},{id:'cord',n:2}],
         post :[{id:'log',n:2},{id:'cord',n:2}]}},
  {id:'stone',  n:'돌',   hp:900, c:{beam:0x74716a, fill:0x82807a, deck:0x6f6d67},
   cost:{found:[{id:'stone_block',n:4},{id:'clay_lump',n:2}],
         wall :[{id:'stone_block',n:3},{id:'clay_lump',n:2}],
         roof :[{id:'stone_block',n:3},{id:'log',n:1},{id:'clay_lump',n:1}],
         slope:[{id:'stone_block',n:4},{id:'log',n:1},{id:'clay_lump',n:2}],
         gable:[{id:'stone_block',n:2},{id:'clay_lump',n:1}],
         door :[{id:'stone_block',n:2},{id:'log',n:1},{id:'clay_lump',n:2}],
         window:[{id:'stone_block',n:2},{id:'log',n:1},{id:'clay_lump',n:1}],
         leaf :[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:4}],
         pane :[{id:'glass',n:3},{id:'log',n:1},{id:'cord',n:2}],
         post :[{id:'stone_block',n:2},{id:'clay_lump',n:1}]}},
  /* 벽돌(사용자 요청) — 점토를 빚어 구운 벽돌(`brick` — 모닥불·가마에서 `brick_raw` 를 굽는다)을 점토로 붙여 쌓는다. 가장 튼튼하다.
     벽의 메움은 벽돌 한 켜 무늬(`fill` 이 객체면 `bmat` 이 그 무늬를 입힌다 — 켜마다 반 장씩 어긋난다) */
  {id:'brick',  n:'벽돌', hp:1400, c:{beam:0x6a3a2c, fill:{c:0xc8705a,brick:1}, deck:0x9a5240},
   cost:{found:[{id:'brick',n:6},{id:'clay_lump',n:2}],
         wall :[{id:'brick',n:5},{id:'clay_lump',n:1}],
         roof :[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}],
         slope:[{id:'brick',n:5},{id:'log',n:1},{id:'clay_lump',n:1}],
         gable:[{id:'brick',n:3},{id:'clay_lump',n:1}],
         door :[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}],
         window:[{id:'brick',n:4},{id:'log',n:1},{id:'clay_lump',n:1}],
         leaf :[{id:'log',n:2},{id:'branch',n:4},{id:'cord',n:4}],
         pane :[{id:'glass',n:3},{id:'log',n:1},{id:'cord',n:2}],
         post :[{id:'brick',n:4},{id:'clay_lump',n:1}]}}
];
/* 경사 지붕 — 한 칸을 가로지르며 RISE 만큼 솟는다.
   3 m 를 가는 동안 2.4 m 오르니 38.7°. 지형 걷기 한계(49°)보다 완만해 걸어 오른다. */
const RISE=WALL_H;                                  // 경사 지붕이 솟는 높이
const SLOPE_A=Math.atan2(RISE,CELL_B);              // 38.66°
const SLOPE_L=Math.hypot(RISE,CELL_B);              // 빗면 길이 3.84 m
const BKIND=['found','wall','door','leaf','window','pane','roof','slope','gable'];
const BKIND_N={found:'토대', wall:'벽', door:'문틀', leaf:'문짝',
               window:'창틀', pane:'창짝',
               roof:'지붕', slope:'경사 지붕', gable:'삼각 벽', post:'기둥 틀'};
/* 문짝 · 창짝은 문틀 · 창틀에 달린다. 벽 항목의 leaf 에 얹혀 함께 움직인다.
   문짝은 좌클릭으로 여닫고, 닫으면 뚫려 있던 충돌체가 되살아난다. */
const FITS={leaf:'door', pane:'window'};
const WALLV=['wall','door','window'];               // 벽 자리에 들어가는 세 가지
const PADS=new Map();        // "gx,gz"     → {gx,gz,x,z,y,lo,mesh}  시멘트로 다진 터 — 토대는 이 위에만 선다(아래 '터 다지기')
const FOUNDS=new Map();      // "gx,gz"     → {gx,gz,x,z,y,tier,hp,mesh}
const WALLS =new Map();      // "gx,gz,L,s" → {gx,gz,L,s,v,tier,hp,mesh,cols}  v = 벽/문/창문
const POSTS =new Map();      // "gx,gz,L"   → {gx,gz,L,tier,hp,mesh}  기둥 틀 — 벽 없이 지붕을 받친다(차양)
const ROOFS =new Map();      // "gx,gz,L"   → {gx,gz,L,tier,hp,mesh}
const SLOPES=new Map();      // "gx,gz,L"   → {gx,gz,L,s,tier,hp,mesh}  s = 솟는 쪽
const GABLES=new Map();      // "gx,gz,L,s" → {gx,gz,L,s,h,tier,hp,mesh}  h = ±1 방향
const fkey=(gx,gz)=>gx+','+gz;
const wkey=(gx,gz,L,s)=>gx+','+gz+','+L+','+s;
const rkey=(gx,gz,L)=>gx+','+gz+','+L;
const SIDE=[[0,-1],[1,0],[0,1],[-1,0]];             // 북 동 남 서 — 변의 바깥 방향

const BUILD={on:false, kind:'found', tier:1, lvl:0, hand:1, side:-1,
             ghost:null, tgt:null, ok:false, why:''};
/* BUILD.side — 벽·경사 지붕·삼각 벽이 붙을 변을 손으로 고른다.
   -1 이면 바라보는 변을 저절로 고르고(예전 방식), 0~3 이면 그 변에 못 박는다.
   R 로 자동 → 북 → 동 → 남 → 서 순으로 돌린다. 조준이 흔들려도 안 바뀐다. */
const SIDE_N=['북','동','남','서'];
/* 삼각 벽의 두 방향 — 아크의 Sloped Wall Left / Right 와 같다.
   변 s 의 접선 t 를 기준으로 직각(높은 쪽)이 +t 에 서면 h=+1, -t 면 h=-1. */
const gableTan=s=>[-SIDE[s][1], SIDE[s][0]];
function gableYaw(s,h){                             // 국소 +X → h·t
  const [ox,oz]=SIDE[s];
  return Math.atan2(-h*ox, -h*oz);
}
/* 같은 칸에 경사 지붕이 있으면 그 솟는 쪽에 직각을 맞춰 준다 */
function gableAuto(gx,gz,L,s){
  const sl=SLOPES.get(rkey(gx,gz,L)); if(!sl) return 0;
  const [tx,tz]=gableTan(s), [dx,dz]=SIDE[sl.s];
  const d=tx*dx+tz*dz;
  return d>0.5?1:(d<-0.5?-1:0);                     // 0 = 경사와 나란한 변이라 안 맞는다
}

/* 경사 지붕 위의 높이 — 낮은 쪽 모서리에서 0, 솟는 쪽 모서리에서 RISE.
   벽과 같은 층 띠를 차지한다: L 층 바닥에서 시작해 그 층 천장까지 오른다.
   그래서 1층에 놓으면 땅에서 지붕으로 걸어 올라가는 계단 노릇을 한다. */
function slopeSurface(sl,f,x,z){
  const [ox,oz]=SIDE[sl.s];
  const u=clamp(0.5+((x-f.x)*ox+(z-f.z)*oz)/CELL_B,0,1);
  return f.y+sl.L*WALL_H+RISE*u;
}
/* ---- 바닥 높이 — 토대 윗면과 밟고 다닐 수 있는 지붕까지 친다 ---- */
function builtFloorAt(x,z){
  const gx=Math.round(x/CELL_B), gz=Math.round(z/CELL_B);
  const f=FOUNDS.get(fkey(gx,gz)), pd=PADS.get(fkey(gx,gz));
  if(!f) return pd?pd.y:-1e9;                         // 다진 터도 바닥이다
  if(Math.abs(x-f.x)>CELL_B/2||Math.abs(z-f.z)>CELL_B/2) return -1e9;
  let best=f.ghost?-1e9:f.y;                         // 맨땅의 바탕(토대 없이 세운 칸)은 바닥이 아니다
  for(let L=0;L<8;L++){                              // 밟고 선 층보다 낮은 지붕 중 가장 높은 것
    const r=ROOFS.get(rkey(gx,gz,L));
    if(r) best=Math.max(best,f.y+(L+1)*WALL_H);
    const sl=SLOPES.get(rkey(gx,gz,L));
    if(sl) best=Math.max(best,slopeSurface(sl,f,x,z));
  }
  return best;
}
/* 발밑 — 지금 서 있는 높이보다 위에 있는 지붕은 천장이지 바닥이 아니다 */
function floorAt(x,z,fromY){
  const h0=heightAt(x,z);
  if(PL.under&&fromY!==undefined&&fromY<h0-3) return underFloorAt(x,z);   // 땅속에 있고 땅 밑 3 m 아래 — 땅속의 바닥(96-underworld.js · 땅 위 벼랑 앞에서 땅속으로 빠지지 않게 사람이 땅속일 때만)
  let t=h0+giantRootAt(x,z);                    // 노거수의 뿌리는 땅이다(95-giants.js)
  t=cragFloor(x,z,fromY,t);                     // 벼랑의 큰 바위 — 낮으면 딛고 높으면 벽이다(33-crags.js)
  t=coastFloor(x,z,fromY,t);                    // 주상절리 기둥 위(34-coast.js)
  const gx=Math.round(x/CELL_B), gz=Math.round(z/CELL_B);
  { const pd=PADS.get(fkey(gx,gz)); if(pd&&pd.y>t&&(fromY===undefined||pd.y<=fromY+0.6)) t=pd.y; }   // 다진 터 — 발이 닿는 높이면 그 위를 딛는다
  const f=FOUNDS.get(fkey(gx,gz));
  if(!f||Math.abs(x-f.x)>CELL_B/2||Math.abs(z-f.z)>CELL_B/2) return t;
  const y=(fromY===undefined)?1e9:fromY+0.6;
  let best=t;
  if(!f.ghost&&f.y<=y) best=Math.max(best,f.y);
  for(let L=0;L<8;L++){
    const r=ROOFS.get(rkey(gx,gz,L));
    if(r){ const ry=f.y+(L+1)*WALL_H; if(ry<=y) best=Math.max(best,ry); }
    const sl=SLOPES.get(rkey(gx,gz,L));
    if(sl){ const sy=slopeSurface(sl,f,x,z); if(sy<=y) best=Math.max(best,sy); }
  }
  return best;
}

/* ---- 조각 만들기 ---- */
/* 벽돌 한 켜 — 가로로 벽돌 여섯 장과 줄눈. 벽의 메움 널(가로 2.7 m × 세로 0.3 m)에 한 켜로 앉는다 */
let _brickRow=null;
function brickRowTex(){
  if(_brickRow) return _brickRow;
  const c=document.createElement('canvas'); c.width=384; c.height=48; const g=c.getContext('2d'), rnd=mulberry32(0xb21c);
  g.fillStyle='#b9b2a4'; g.fillRect(0,0,384,48);                                   // 줄눈(점토 모르타르)
  for(let i=0;i<6;i++){ const v=0.80+0.34*rnd(), w=rnd(); g.fillStyle='rgb('+Math.round(255*v)+','+Math.round(255*v*(0.86+0.1*w))+','+Math.round(255*v*(0.80+0.12*w))+')';
    g.fillRect(i*64+3,4,58,40); for(let k=0;k<14;k++){ g.fillStyle='rgba(60,30,20,'+(0.05+0.10*rnd()).toFixed(2)+')'; g.fillRect(i*64+3+rnd()*54,4+rnd()*36,2+rnd()*5,1+rnd()*3); } }
  _brickRow=new THREE.CanvasTexture(c); _brickRow.wrapS=THREE.RepeatWrapping; return _brickRow;
}
const bmat=(c,half)=>{ if(typeof c!=='object') return new THREE.MeshLambertMaterial({color:c});
  const t=half?brickRowTex().clone():brickRowTex(); if(half){ t.offset.x=1/12; t.needsUpdate=true; }   // 켜마다 반 장 어긋난다
  return new THREE.MeshLambertMaterial({color:c.c,map:t}); };
function makeFound(C){
  const g=new THREE.Group(), H=CELL_B/2;
  const beam=bmat(C.beam), deck=bmat(C.deck);
  for(let i=0;i<5;i++){                              // 바닥 널
    const pl=new THREE.Mesh(new THREE.BoxGeometry(CELL_B-0.06,0.10,CELL_B/5-0.05),deck);
    pl.position.set(0,-0.05,-H+CELL_B/10+i*CELL_B/5); g.add(pl);
  }
  for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]]){  // 테두리 귀틀
    const bm=new THREE.Mesh(new THREE.BoxGeometry(ax?0.12:CELL_B,0.16,az?0.12:CELL_B),beam);
    bm.position.set(ax*H,-0.04,az*H); g.add(bm);
  }
  for(const sx of [-1,1]) for(const sz of [-1,1]){    // 네 귀퉁이 기둥
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,FOUND_UP+0.24,6),beam);
    post.position.set(sx*(H-0.16),-0.14-FOUND_UP/2,sz*(H-0.16)); g.add(post);
  }
  return g;
}
function makeWall(C){
  const g=new THREE.Group(), H=CELL_B/2;
  const beam=bmat(C.beam), fill=bmat(C.fill), fill2=typeof C.fill==='object'?bmat(C.fill,true):fill;
  for(const sx of [-1,1]){
    const p2=new THREE.Mesh(new THREE.BoxGeometry(0.16,WALL_H,0.20),beam);
    p2.position.set(sx*(H-0.08),WALL_H/2,0); g.add(p2);
  }
  const top=new THREE.Mesh(new THREE.BoxGeometry(CELL_B,0.16,0.20),beam);
  top.position.y=WALL_H-0.08; g.add(top);
  for(let i=0;i<7;i++){
    const w=new THREE.Mesh(new THREE.BoxGeometry(CELL_B-0.3,WALL_H/7-0.04,0.11),i%2?fill2:fill);
    w.position.set(0,WALL_H/14+i*WALL_H/7,(i%2?0.03:-0.03)); g.add(w);
  }
  for(const sx of [-0.7,0,0.7]){
    const v=new THREE.Mesh(new THREE.BoxGeometry(0.07,WALL_H-0.2,0.13),beam);
    v.position.set(sx,WALL_H/2-0.05,0); g.add(v);
  }
  return g;
}
function makeRoof(C){
  const g=new THREE.Group(), S=CELL_B, H=S/2;
  const beam=bmat(C.beam), deck=bmat(C.deck);
  const d=new THREE.Mesh(new THREE.BoxGeometry(S,0.16,S),deck);
  d.position.y=-0.08; g.add(d);                      // 윗면이 0 — 그 위를 밟고 다닌다
  for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const l=new THREE.Mesh(new THREE.BoxGeometry(ax?0.12:S,0.20,az?0.12:S),beam);
    l.position.set(ax*H,-0.10,az*H); g.add(l);
  }
  for(let i=0;i<4;i++){                              // 서까래
    const bm=new THREE.Mesh(new THREE.BoxGeometry(S-0.1,0.10,0.10),beam);
    bm.position.set(0,-0.20,-H+S/5+i*S/5); g.add(bm);
  }
  return g;
}
/* 경사 지붕 — 국소 +Z 가 솟는 쪽. 윗면이 낮은 쪽 모서리에서 y=0 을 지난다. */
function makeSlope(C){
  const g=new THREE.Group(), S=CELL_B, H=S/2;
  const beam=bmat(C.beam), deck=bmat(C.deck);
  const d=new THREE.Mesh(new THREE.BoxGeometry(S,0.16,SLOPE_L),deck);
  d.rotation.x=-SLOPE_A;
  d.position.set(0,RISE/2-0.08*Math.cos(SLOPE_A),0); g.add(d);
  for(let i=0;i<4;i++){                              // 빗면을 따라 놓인 서까래
    const b2=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.10,SLOPE_L-0.1),beam);
    b2.rotation.x=-SLOPE_A;
    b2.position.set(-H+S/5+i*S/5,RISE/2-0.19,0); g.add(b2);
  }
  const eave=new THREE.Mesh(new THREE.BoxGeometry(S,0.16,0.14),beam);
  eave.position.set(0,-0.06,-H); g.add(eave);        // 낮은 쪽 처마
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(S,0.16,0.16),beam);
  ridge.position.set(0,RISE-0.04,H); g.add(ridge);   // 솟은 쪽 마루
  return g;
}
/* 직각삼각형 벽 — 밑변 3 m · 높이 2.4 m 로 경사 지붕 밑을 정확히 메운다.
   국소 +X 가 솟는 쪽(직각이 서는 쪽), 두께는 ±Z. */
function makeGable(C){
  const g=new THREE.Group(), H=CELL_B/2, T=0.18;
  const sh=new THREE.Shape();
  sh.moveTo(-H,0); sh.lineTo(H,0); sh.lineTo(H,RISE); sh.closePath();
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:T,bevelEnabled:false}),
    bmat(C.fill));
  m.position.z=-T/2; g.add(m);
  const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,RISE,T+0.04),bmat(C.beam));
  post.position.set(H-0.07,RISE/2,0); g.add(post);   // 직각이 서는 기둥
  const sill=new THREE.Mesh(new THREE.BoxGeometry(CELL_B,0.13,T+0.04),bmat(C.beam));
  sill.position.set(0,0.065,0); g.add(sill);         // 밑변
  const rafter=new THREE.Mesh(new THREE.BoxGeometry(SLOPE_L,0.13,T+0.04),bmat(C.beam));
  rafter.position.set(0,RISE/2,0); rafter.rotation.z=SLOPE_A; g.add(rafter);  // 빗변
  return g;
}
/* 문 — 폭 1.2 m · 높이 2.0 m 로 뚫는다. 벽과 같은 자리를 쓰고, 뚫린 만큼
   충돌체를 빼서 그냥 걸어 지난다. 여닫는 문짝은 없다(아크의 문틀에 가깝다). */
const DOOR_W=1.20, DOOR_H=2.00;
function makeDoor(C){
  const g=new THREE.Group(), H=CELL_B/2, DW=DOOR_W/2;
  const beam=bmat(C.beam), fill=bmat(C.fill);
  for(const sx of [-1,1]){                            // 바깥 기둥
    const p2=new THREE.Mesh(new THREE.BoxGeometry(0.16,WALL_H,0.20),beam);
    p2.position.set(sx*(H-0.08),WALL_H/2,0); g.add(p2);
  }
  const top=new THREE.Mesh(new THREE.BoxGeometry(CELL_B,0.16,0.20),beam);
  top.position.y=WALL_H-0.08; g.add(top);
  const side=(H-DW);                                  // 문 옆에 남는 벽 폭
  for(const sx of [-1,1]){
    const w=new THREE.Mesh(new THREE.BoxGeometry(side,WALL_H,0.11),fill);
    w.position.set(sx*(DW+side/2),WALL_H/2,0); g.add(w);
    const jamb=new THREE.Mesh(new THREE.BoxGeometry(0.10,DOOR_H,0.22),beam);
    jamb.position.set(sx*DW,DOOR_H/2,0); g.add(jamb);  // 문설주
  }
  const lint=new THREE.Mesh(new THREE.BoxGeometry(DOOR_W+0.2,0.14,0.22),beam);
  lint.position.y=DOOR_H+0.07; g.add(lint);            // 상인방
  const over=new THREE.Mesh(new THREE.BoxGeometry(DOOR_W,WALL_H-DOOR_H-0.14,0.11),fill);
  over.position.y=(DOOR_H+0.14+WALL_H)/2; g.add(over); // 문 위 벽
  return g;
}
/* 창문 — 폭 1.4 m · 높이 0.9 m, 턱 높이 1.0 m. 뚫려 보이지만 막는다. */
const WIN_W=1.40, WIN_H=0.90, WIN_SILL=1.00;
function makeWindow(C){
  const g=new THREE.Group(), H=CELL_B/2, WW=WIN_W/2;
  const beam=bmat(C.beam), fill=bmat(C.fill);
  for(const sx of [-1,1]){
    const p2=new THREE.Mesh(new THREE.BoxGeometry(0.16,WALL_H,0.20),beam);
    p2.position.set(sx*(H-0.08),WALL_H/2,0); g.add(p2);
  }
  const top=new THREE.Mesh(new THREE.BoxGeometry(CELL_B,0.16,0.20),beam);
  top.position.y=WALL_H-0.08; g.add(top);
  const side=(H-WW);
  for(const sx of [-1,1]){                            // 창 옆 벽
    const w=new THREE.Mesh(new THREE.BoxGeometry(side,WALL_H,0.11),fill);
    w.position.set(sx*(WW+side/2),WALL_H/2,0); g.add(w);
  }
  const below=new THREE.Mesh(new THREE.BoxGeometry(WIN_W,WIN_SILL,0.11),fill);
  below.position.y=WIN_SILL/2; g.add(below);          // 창 아래 벽
  const above=new THREE.Mesh(new THREE.BoxGeometry(WIN_W,WALL_H-WIN_SILL-WIN_H,0.11),fill);
  above.position.y=(WIN_SILL+WIN_H+WALL_H)/2; g.add(above);
  for(const y of [WIN_SILL, WIN_SILL+WIN_H]){         // 창턱 · 창 상방
    const b2=new THREE.Mesh(new THREE.BoxGeometry(WIN_W+0.2,0.12,0.24),beam);
    b2.position.y=y; g.add(b2);
  }
  for(const sx of [-1,1]){
    const j=new THREE.Mesh(new THREE.BoxGeometry(0.10,WIN_H,0.22),beam);
    j.position.set(sx*WW,WIN_SILL+WIN_H/2,0); g.add(j);
  }
  const mull=new THREE.Mesh(new THREE.BoxGeometry(0.07,WIN_H,0.13),beam);
  mull.position.y=WIN_SILL+WIN_H/2; g.add(mull);      // 창살
  return g;
}
/* 문짝 — 문틀 안에 꼭 맞는 널문. 경첩이 한쪽 문설주에 있어 그쪽을 축으로 돈다.
   여는 각 95°. 바깥으로 열린다. */
const LEAF_OPEN=95*Math.PI/180;
function makeLeaf(C){
  const g=new THREE.Group();                        // 이 그룹의 원점이 경첩이다
  const beam=bmat(C.beam), fill=bmat(C.fill);
  const W=DOOR_W-0.06, H=DOOR_H-0.06;
  const slab=new THREE.Mesh(new THREE.BoxGeometry(W,H,0.07),fill);
  slab.position.set(W/2,H/2,0); g.add(slab);        // 경첩에서 +x 로 뻗는다
  for(const y of [H*0.18, H*0.82]){                 // 띠장 둘
    const b2=new THREE.Mesh(new THREE.BoxGeometry(W-0.04,0.11,0.10),beam);
    b2.position.set(W/2,y,0); g.add(b2);
  }
  const brace=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(W,H*0.64)-0.06,0.09,0.10),beam);
  brace.position.set(W/2,H/2,0);
  brace.rotation.z=Math.atan2(H*0.64,W); g.add(brace);   // 빗장
  for(const y of [H*0.18, H*0.82]){                 // 경첩 쇠
    const hg=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.16,0.14),beam);
    hg.position.set(0.03,y,0); g.add(hg);
  }
  const knob=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.10,0.14),beam);
  knob.position.set(W-0.14,H*0.5,0); g.add(knob);   // 손잡이
  return g;
}
/* 창짝 — 유리 낀 여닫이. 창틀 구멍에 꼭 맞고 경첩은 한쪽 옆이다. */
const glassMat=()=>new THREE.MeshLambertMaterial({
  color:0x9fc6cc, transparent:true, opacity:0.32, depthWrite:false});
function makePane(C){
  const g=new THREE.Group();
  const beam=bmat(C.beam);
  const W=WIN_W-0.06, H=WIN_H-0.06;
  const gl=new THREE.Mesh(new THREE.BoxGeometry(W-0.10,H-0.10,0.03),glassMat());
  gl.position.set(W/2,H/2,0); g.add(gl);            // 유리판
  for(const [w,h,x,y] of [[W,0.07,W/2,0.035],[W,0.07,W/2,H-0.035],
                          [0.07,H,0.035,H/2],[0.07,H,W-0.035,H/2]]){
    const b2=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.08),beam);
    b2.position.set(x,y,0); g.add(b2);              // 창살 테두리
  }
  const mid=new THREE.Mesh(new THREE.BoxGeometry(0.05,H-0.14,0.07),beam);
  mid.position.set(W/2,H/2,0); g.add(mid);
  return g;
}
/* 기둥 틀 — 네 귀퉁이 기둥과 그 머리를 잇는 도리. 벽 없이 지붕을 받친다(차양 · 정자) */
function makePost(C){
  const g=new THREE.Group(), H=CELL_B/2, beam=bmat(C.beam);
  for(const sx of [-1,1]) for(const sz of [-1,1]){ const p=new THREE.Mesh(new THREE.BoxGeometry(0.18,WALL_H,0.18),beam); p.position.set(sx*(H-0.09),WALL_H/2,sz*(H-0.09)); g.add(p); }
  for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]]){ const b=new THREE.Mesh(new THREE.BoxGeometry(ax?0.16:CELL_B,0.16,az?0.16:CELL_B),beam); b.position.set(ax*(H-0.09),WALL_H-0.08,az*(H-0.09)); g.add(b); }
  return g;
}
const BUILD_MESH={post:makePost, found:makeFound, wall:makeWall, door:makeDoor, window:makeWindow,
                  leaf:makeLeaf, pane:makePane,
                  roof:makeRoof, slope:makeSlope, gable:makeGable};
/* 문짝·창짝이 틀 안에서 앉는 자리 (벽 메시의 국소 좌표) */
const fitPose=k=> k==='leaf'
  ? {x:-DOOR_W/2+0.03, y:0.03, open:LEAF_OPEN}
  : {x:-WIN_W/2+0.03,  y:WIN_SILL+0.03, open:LEAF_OPEN};

/* ---- 놓기 · 걷어내기 ---- */
function wallPose(gx,gz,s){
  const [ox,oz]=SIDE[s];
  return {x:gx*CELL_B+ox*CELL_B/2, z:gz*CELL_B+oz*CELL_B/2, rot:(ox?Math.PI/2:0)};
}
/* 문짝을 여닫을 때 충돌체를 다시 깐다 */
function rebuildWallCols(w){
  if(w.cols&&w.cols.length){
    for(const c of w.cols){ const i=COLLIDERS.indexOf(c); if(i>=0) COLLIDERS.splice(i,1); }
  }
  w.cols=[];
  addWallCols(w);
}
function addWallCols(w){
  const P0=wallPose(w.gx,w.gz,w.s);
  const [ox,oz]=SIDE[w.s], tx=-oz, tz=ox;
  w.cols=[];
  if(w.L!==0) return;                                // 이층 벽은 지면 충돌과 무관하다
  for(let i=-3;i<=3;i++){
    // 문틀은 가운데 세 자리를 비운다 — 남는 원 사이가 1.32 m 라 몸(반지름 0.42)이 지난다
    // 다만 문짝이 달려 닫혀 있으면 도로 막는다.
    const shut=w.leaf && w.leaf.kind==='leaf' && !w.leaf.open;
    if(w.v==='door' && !shut && Math.abs(i)<2) continue;
    const c={x:P0.x+tx*i*0.5, z:P0.z+tz*i*0.5, r:0.34};
    COLLIDERS.push(c); w.cols.push(c);
  }
  buildColliderGrid();
}
/* 이웃 토대가 있으면 그 높이에 맞춘다 — 아크처럼 바닥 한 장이 평평하게 이어진다 */
function foundHeight(gx,gz){
  const pd=PADS.get(fkey(gx,gz)); if(pd) return {y:pd.y+0.12, snapped:false};   // 다진 터 위에 바로 앉는다(터가 이웃끼리 높이를 맞춘다)
  for(const [ox,oz] of SIDE){
    const n=FOUNDS.get(fkey(gx+ox,gz+oz));
    if(n) return {y:n.y, snapped:true};
  }
  return {y:heightAt(gx*CELL_B,gz*CELL_B)+FOUND_UP, snapped:false};
}
/* ── 토대 없이 세우기(사용자 요청) ─────────────────────────────────────────────
   **벽은 맨땅에 홀로 선다. 지붕(과 차양)은 벽이나 기둥 틀이 받치면 토대 없이 놓인다.**
   그런 칸에는 보이지 않는 '맨땅의 바탕'을 둔다 — 토대 표(FOUNDS)에 `ghost` 로 들어가 벽·지붕이 높이를 얻는 자리다.
   바닥이 아니고(딛는 것은 땅이다), 그 칸의 조각을 다 걷어내면 사라진다. 높이는 이웃 바탕·토대에 맞추고(벽이 이어지게),
   없으면 그 칸 네 귀와 가운데 땅 가운데 **가장 낮은 데**다(벽 밑이 뜨지 않게 — 높은 쪽은 땅에 묻힌다) */
function groundBaseY(gx,gz){
  const x=gx*CELL_B, z=gz*CELL_B, pd=PADS.get(fkey(gx,gz)); if(pd) return pd.y+0.02;
  const lo=Math.min(heightAt(x,z),heightAt(x-1.5,z-1.5),heightAt(x+1.5,z-1.5),heightAt(x-1.5,z+1.5),heightAt(x+1.5,z+1.5))-0.05;
  for(const [ox,oz] of SIDE){ const n=FOUNDS.get(fkey(gx+ox,gz+oz)); if(n&&Math.abs(n.y-lo)<1.0) return n.y; }
  return lo;
}
function groundBase(gx,gz){
  let f=FOUNDS.get(fkey(gx,gz)); if(f) return f;
  f={gx,gz,x:gx*CELL_B,z:gz*CELL_B,y:groundBaseY(gx,gz),tier:-1,hp:1e9,mesh:null,ghost:true};
  FOUNDS.set(fkey(gx,gz),f); return f;
}
/* 그 칸에 남은 조각이 없으면 맨땅의 바탕을 치운다 */
function baseTidy(gx,gz){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f||!f.ghost) return;
  for(let L=0;L<8;L++){ if(ROOFS.has(rkey(gx,gz,L))||SLOPES.has(rkey(gx,gz,L))||POSTS.has(rkey(gx,gz,L))) return;
    for(let i=0;i<4;i++) if(WALLS.has(wkey(gx,gz,L,i))||GABLES.has(wkey(gx,gz,L,i))) return; }
  FOUNDS.delete(fkey(gx,gz));
}
/* 지붕을 받칠 것이 있나 — 그 칸 그 층의 벽(이웃 칸이 맞댄 벽 포함) · 기둥 틀 · 이웃 칸의 지붕(이어 덮는다) */
function roofSupport(gx,gz,L){
  if(POSTS.has(rkey(gx,gz,L))) return true;
  for(let i=0;i<4;i++){ const [ox,oz]=SIDE[i];
    if(WALLS.has(wkey(gx,gz,L,i))||WALLS.has(wkey(gx+ox,gz+oz,L,(i+2)%4))) return true;
    if(ROOFS.has(rkey(gx+ox,gz+oz,L))) return true; }
  return false;
}
function placePost(gx,gz,L,tier){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f) return null;
  const T=BTIER[tier], m=makePost(T.c); m.position.set(f.x,f.y+L*WALL_H,f.z); scene.add(m);
  const o={gx,gz,L,tier,hp:T.hp,mesh:m}; POSTS.set(rkey(gx,gz,L),o); return o;
}
function placeFound(gx,gz,tier,y){
  const x=gx*CELL_B, z=gz*CELL_B;
  if(tier<0){ const f={gx,gz,x,z,y:(y===undefined)?groundBaseY(gx,gz):y,tier:-1,hp:1e9,mesh:null,ghost:true}; FOUNDS.set(fkey(gx,gz),f); return f; }   // 저장에서 되살리는 맨땅의 바탕
  const T=BTIER[tier];
  const top=(y===undefined)?foundHeight(gx,gz).y:y;
  const m=makeFound(T.c); m.position.set(x,top,z); scene.add(m);
  const f={gx,gz,x,z,y:top,tier,hp:T.hp,mesh:m};
  FOUNDS.set(fkey(gx,gz),f);
  return f;
}
function placeWall(gx,gz,L,s,tier,v){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f) return null;
  v=WALLV.indexOf(v)<0?'wall':v;
  const T=BTIER[tier], P0=wallPose(gx,gz,s);
  const m=BUILD_MESH[v](T.c); m.position.set(P0.x,f.y+L*WALL_H,P0.z); m.rotation.y=P0.rot;
  scene.add(m);
  const w={gx,gz,L,s,v,tier,hp:T.hp,mesh:m,cols:[]};
  addWallCols(w);
  WALLS.set(wkey(gx,gz,L,s),w);
  return w;
}
/* 문짝·창짝을 틀에 단다. 벽 메시의 자식이라 틀과 함께 움직인다. */
function placeFit(gx,gz,L,s,kind,tier,open){
  const w=WALLS.get(wkey(gx,gz,L,s)); if(!w) return null;
  if(w.v!==FITS[kind] || w.leaf) return null;
  const T=BTIER[tier], P=fitPose(kind);
  const hinge=new THREE.Group();
  hinge.position.set(P.x,P.y,0);
  hinge.add(BUILD_MESH[kind](T.c));
  w.mesh.add(hinge);
  w.leaf={kind, tier, hp:T.hp, open:!!open, mesh:hinge};
  hinge.rotation.y=w.leaf.open?-P.open:0;
  rebuildWallCols(w);
  return w.leaf;
}
function dropFit(w){
  if(!w.leaf) return;
  w.mesh.remove(w.leaf.mesh);
  w.leaf=null;
  rebuildWallCols(w);
}
function toggleFit(w){
  if(!w||!w.leaf) return;
  const P=fitPose(w.leaf.kind);
  w.leaf.open=!w.leaf.open;
  w.leaf.mesh.rotation.y=w.leaf.open?-P.open:0;
  rebuildWallCols(w);
  { const v=w.leaf.mesh.getWorldPosition(new THREE.Vector3()); LIGHT.dirtyAt(v.x,v.z,3); }   // 문짝 그림자
  sfx('bind');
  toast(BKIND_N[w.leaf.kind]+(w.leaf.open?' 열림':' 닫힘'));
}
/* 눈앞의 문짝·창짝 — 상호작용 대상으로 삼는다 */
function findFit(){
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw);
  let best=null,bd=1e9;
  for(const w of WALLS.values()){
    if(!w.leaf) continue;
    const P0=wallPose(w.gx,w.gz,w.s);
    const f=FOUNDS.get(fkey(w.gx,w.gz)); if(!f) continue;
    const y=f.y+w.L*WALL_H;
    if(PL.pos.y<y-1.2||PL.pos.y>y+WALL_H+0.6) continue;   // 다른 층 문은 안 잡는다
    const dx=P0.x-PL.pos.x, dz=P0.z-PL.pos.z, d=Math.hypot(dx,dz);
    if(d>2.6||d<0.05||d>=bd) continue;
    if((dx/d)*fx+(dz/d)*fz<0.35) continue;
    bd=d; best=w;
  }
  return best;
}
function placeRoof(gx,gz,L,tier){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f) return null;
  const T=BTIER[tier];
  const m=makeRoof(T.c); m.position.set(f.x,f.y+(L+1)*WALL_H,f.z); scene.add(m);
  const r={gx,gz,L,tier,hp:T.hp,mesh:m};
  ROOFS.set(rkey(gx,gz,L),r);
  return r;
}
function placeSlope(gx,gz,L,s,tier){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f) return null;
  const T=BTIER[tier], [ox,oz]=SIDE[s];
  const m=makeSlope(T.c);
  m.position.set(f.x,f.y+L*WALL_H,f.z);          // 벽과 같은 층 바닥에서 시작한다
  m.rotation.y=Math.atan2(ox,oz);                    // 국소 +Z → 솟는 쪽
  scene.add(m);
  const o={gx,gz,L,s,tier,hp:T.hp,mesh:m};
  SLOPES.set(rkey(gx,gz,L),o);
  return o;
}
function placeGable(gx,gz,L,s,h,tier){
  const f=FOUNDS.get(fkey(gx,gz)); if(!f) return null;
  const T=BTIER[tier], P0=wallPose(gx,gz,s);
  h=(h<0)?-1:1;
  const m=makeGable(T.c);
  m.position.set(P0.x,f.y+L*WALL_H,P0.z);        // 같은 층 벽 자리의 삼각형 반쪽
  m.rotation.y=gableYaw(s,h);                        // 국소 +X → 직각이 서는 쪽
  scene.add(m);
  const o={gx,gz,L,s,h,tier,hp:T.hp,mesh:m};
  GABLES.set(wkey(gx,gz,L,s),o);
  return o;
}
function dropBuild(o,map,k){
  if(o.mesh) scene.remove(o.mesh);
  if(o.cols&&o.cols.length){
    for(const c of o.cols){ const i=COLLIDERS.indexOf(c); if(i>=0) COLLIDERS.splice(i,1); }
    buildColliderGrid();
  }
  map.delete(k);
  if(o.gx!==undefined&&map!==FOUNDS) baseTidy(o.gx,o.gz);     // 그 칸이 비면 맨땅의 바탕도 치운다
}
function clearBuilds(){
  for(const o of PADS.values()){ scene.remove(o.mesh); o.mesh.geometry.dispose(); } PADS.clear();
  for(const m of [FOUNDS,WALLS,ROOFS,SLOPES,GABLES,POSTS]){
    for(const o of m.values()){
      if(o.mesh) scene.remove(o.mesh);
      if(o.cols) for(const c of o.cols){ const i=COLLIDERS.indexOf(c); if(i>=0) COLLIDERS.splice(i,1); }
    }
    m.clear();
  }
  buildColliderGrid();
}

/* ---- 터 다지기 — 시멘트 ──────────────────────────────────────────────────
   집을 지으려면 먼저 땅을 고른다(사용자 요청). **시멘트를 손에 들고** 땅을 보면 그 칸(3 m)에 다져질 터가 비쳐 보이고, 좌클릭하면
   굳는다. 터의 윗면은 그 칸에서 가장 높은 땅 바로 위 — 낮은 쪽은 시멘트로 메워진다(그래서 비탈일수록 많이 든다).
   곁에 이미 다진 터가 있으면 그 높이에 맞춘다(바닥이 한 장으로 이어진다 · 1 m 까지).
   드는 양은 **이어지는 값**이다: 평평한 칸 30% + 메울 깊이 1 m 마다 42%(통 하나 = 100%). 손에 든 통부터 줄고, 빈 통은 토기로 돌아온다.
   가진 양은 통을 다 더해 퍼센트로 적는다 — 통 다섯에 0.3 통이면 530%. */
const LEVEL={on:false, tgt:null, ok:false, why:'', ghost:null};
let _padMat=null;
const pct=v=>Math.round(v*100)+'%';
const cementTotal=()=>INV.slots.reduce((a,sl)=>a+(sl.id==='cement'?(sl.amt===undefined?1:sl.amt):0),0);
function cementUse(need){
  const order=INV.slots.filter(sl=>sl.id==='cement').sort((a,b)=>(a===EQUIP?-1:b===EQUIP?1:0)||((a.amt??1)-(b.amt??1)));   // 손에 든 통 → 덜 찬 통
  for(const sl of order){ if(need<=1e-6) break;
    const have=sl.amt===undefined?1:sl.amt, u=Math.min(have,need); sl.amt=have-u; need-=u;
    if(sl.amt<=1e-4){ const i=INV.slots.indexOf(sl); if(sl===EQUIP) EQUIP=null; if(i>=0) invRemove(i,1); invAdd('pot',1); } }   // 빈 통은 토기로 돌아온다
  invDirty=true;
}
function padGround(gx,gz){
  let lo=1e9, hi=-1e9; const x=gx*CELL_B, z=gz*CELL_B, h=CELL_B/2;
  for(const ox of [-h,0,h]) for(const oz of [-h,0,h]){ const y=heightAt(x+ox,z+oz); if(y<lo) lo=y; if(y>hi) hi=y; }
  return {lo,hi};
}
function padPlan(gx,gz){
  const G=padGround(gx,gz); let y=G.hi+0.06, snap=false;
  for(const [ox,oz] of SIDE){ const n=PADS.get(fkey(gx+ox,gz+oz)); if(n&&n.y>=G.hi-0.02&&n.y-G.hi<=1.0){ y=n.y; snap=true; break; } }
  return {gx,gz,y,lo:G.lo,hi:G.hi,snap,need:0.30+0.42*Math.max(0,y-G.lo)};
}
function levelCheck(t){
  const x=t.gx*CELL_B, z=t.gz*CELL_B;
  if(Math.abs(x)>HALF-8||Math.abs(z)>HALF-8) return '섬 밖이다';
  if(PADS.has(fkey(t.gx,t.gz))) return '이미 다진 터다 — 토대를 놓을 수 있다';
  if(FOUNDS.has(fkey(t.gx,t.gz))) return '이미 토대가 있다';
  if(t.lo<0.5) return '물가는 다질 수 없다';
  if(t.hi-t.lo>2.2) return '너무 가파르다 — 높이 차 '+(t.hi-t.lo).toFixed(1)+' m(2.2 m 까지)';
  if(Math.hypot(x-PL.pos.x,z-PL.pos.z)<0.9) return '발밑이다 — 한 걸음 물러서라';
  for(const c of COLLIDERS) if(c.r>=0.5&&Math.abs(c.x-x)<CELL_B/2-0.1&&Math.abs(c.z-z)<CELL_B/2-0.1&&!(c.y1!==undefined&&c.y1<t.lo)) return '그 칸에 나무·바위·설비가 서 있다';   // 가운데가 칸 안에 든 큰 것만
  if(cementTotal()<t.need-1e-6) return '시멘트가 모자란다 — '+pct(t.need)+' 든다';
  return '';
}
function placePad(gx,gz,y,lo){
  if(!_padMat) _padMat=new THREE.MeshLambertMaterial({color:0xa6a7a1});
  const h=Math.max(0.3,y-lo+0.4), g=new THREE.BoxGeometry(CELL_B,h,CELL_B); g.translate(0,-h/2,0);
  const m=new THREE.Mesh(g,_padMat); m.position.set(gx*CELL_B,y,gz*CELL_B); m.matrixAutoUpdate=false; m.updateMatrix(); scene.add(m);
  const o={gx,gz,x:gx*CELL_B,z:gz*CELL_B,y,lo,mesh:m}; PADS.set(fkey(gx,gz),o);
  if(typeof LIGHT!=='undefined'&&LIGHT.live) LIGHT.dirtyAt(o.x,o.z,4);
  return o;
}
function updateLevel(){
  const e=equippedTool(), on=!!(e&&e.id==='cement')&&!BUILD.on&&!MOVE.t&&!uiOpen()&&!PL.dead&&!paused&&!flyMode;
  LEVEL.on=on;
  if(!on){ if(LEVEL.ghost) LEVEL.ghost.visible=false; LEVEL.tgt=null; return; }
  const o=camera.position, cp=Math.cos(PL.pitch), dx=-Math.sin(PL.yaw)*cp, dy=Math.sin(PL.pitch), dz=-Math.cos(PL.yaw)*cp;
  let hx=o.x+dx*4, hz=o.z+dz*4;
  for(let t=0.8;t<=8;t+=0.12){ const x=o.x+dx*t, y=o.y+dy*t, z=o.z+dz*t; if(y<=floorAt(x,z,PL.pos.y)+0.05){ hx=x; hz=z; break; } }
  const t=padPlan(Math.round(hx/CELL_B),Math.round(hz/CELL_B));
  LEVEL.tgt=t; LEVEL.why=levelCheck(t); LEVEL.ok=!LEVEL.why;
  if(!LEVEL.ghost){ const g=new THREE.BoxGeometry(CELL_B,1,CELL_B); g.translate(0,-0.5,0);
    LEVEL.ghost=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x8fd6b4,transparent:true,opacity:0.38,depthWrite:false}));
    LEVEL.ghost.userData.lightRole='none'; LEVEL.ghost.renderOrder=5; scene.add(LEVEL.ghost); }
  const g=LEVEL.ghost; g.visible=true; g.position.set(t.gx*CELL_B,t.y+0.01,t.gz*CELL_B); g.scale.set(1,Math.max(0.3,t.y-t.lo+0.4),1);
  g.material.color.setHex(LEVEL.ok?0x8fd6b4:0xd8724a);
}
function doLevel(){
  const t=LEVEL.tgt; if(!LEVEL.on||!t) return;
  if(!LEVEL.ok){ toast(LEVEL.why); return; }
  cementUse(t.need); placePad(t.gx,t.gz,t.y,t.lo);
  toast('터를 다졌다 — 시멘트 '+pct(t.need)+' · 남은 '+pct(cementTotal())+(t.snap?' · 옆 터에 높이를 맞췄다':''));
  sfx('dig'); craftDirty=true;
}

/* ---- 어디에 놓을지 ---- */
function buildTarget(){
  const o=new THREE.Vector3(), d=new THREE.Vector3();
  camera.getWorldPosition(o); camera.getWorldDirection(d);
  let hx=o.x+d.x*6, hz=o.z+d.z*6, hy=o.y+d.y*6;
  for(let t=1.0;t<=9.0;t+=0.12){
    const x=o.x+d.x*t, y=o.y+d.y*t, z=o.z+d.z*t;
    if(y<=builtFloorAt(x,z)+0.06 || y<=heightAt(x,z)+0.05){ hx=x; hy=y; hz=z; break; }
  }
  const gx=Math.round(hx/CELL_B), gz=Math.round(hz/CELL_B);
  const f=FOUNDS.get(fkey(gx,gz));
  // 몇 층에 놓을지 — 바라본 높이를 토대 위에서부터 층으로 나눈다
  let L=0;
  if(f) L=clamp(Math.floor((hy-f.y+0.4)/WALL_H),0,7);
  const k=BUILD.kind;
  if(k==='wall'||k==='door'||k==='window'||k==='leaf'||k==='pane'
     ||k==='gable'||k==='slope'){
    const lx=hx-gx*CELL_B, lz=hz-gz*CELL_B;
    let s=0, best=1e9;
    for(let i=0;i<4;i++){                            // 바라본 변 — 경사 지붕은 그쪽이 솟는다
      const [ox,oz]=SIDE[i];
      const dd=Math.hypot(lx-ox*CELL_B/2, lz-oz*CELL_B/2);
      if(dd<best){ best=dd; s=i; }
    }
    if(BUILD.side>=0) s=BUILD.side;                  // 손으로 고른 변이 있으면 그쪽에 못 박는다
    if(k!=='gable') return {kind:k, gx, gz, L, s};
    const a=gableAuto(gx,gz,L,s);                    // 경사 지붕이 있으면 방향을 맞춘다
    return {kind:k, gx, gz, L, s, h:a||BUILD.hand};

  }
  return {kind:k, gx, gz, L};
}
function buildCheck(t){
  if(!t) return {ok:false, why:'바닥이 보이지 않는다'};
  const {kind,gx,gz,L,s}=t;
  const x=gx*CELL_B, z=gz*CELL_B;
  if(Math.abs(x)>HALF-8||Math.abs(z)>HALF-8) return {ok:false, why:'섬 밖이다'};
  if(kind==='found'){
    { const f0=FOUNDS.get(fkey(gx,gz)); if(f0) return {ok:false, why:f0.ghost?'벽이나 기둥이 선 자리다 — 먼저 걷어내야 토대를 놓는다':'이미 토대가 있다'}; }
    /* **터를 먼저 다져야 한다**(사용자 요청) — 예전엔 토대가 땅 위 30 cm 에 그냥 떠서, 비탈에서는 한쪽이 허공에 걸렸다.
       시멘트로 다진 터(PADS)가 그 칸에 있어야 하고, 토대는 그 위에 앉는다 */
    if(!PADS.has(fkey(gx,gz))) return {ok:false, why:'터를 먼저 다져야 한다 — 시멘트를 들고 땅을 보며 좌클릭(토대가 허공에 뜨지 않게)'};
    return {ok:true, why:''};
  }
  /* 토대가 없는 칸 — 벽·문틀·창틀·기둥 틀은 맨땅에 선다. 지붕은 받칠 것(벽·기둥 틀·이웃 지붕)이 있어야 한다(사용자 요청) */
  { const f0=FOUNDS.get(fkey(gx,gz));
    if(!f0||f0.ghost){
      if(kind==='roof'||kind==='slope'){ if(!roofSupport(gx,gz,L)) return {ok:false, why:'지붕은 벽이나 기둥 틀이 받쳐야 한다 — 이 칸에 벽이나 기둥 틀을 먼저 세운다(이웃 지붕에 이어 덮어도 된다)'}; }
      else if(!f0&&(kind==='leaf'||kind==='pane'||kind==='gable')) return {ok:false, why:BKIND_N[kind]+'을 달 벽이 없다'};
    } }
  if(kind==='post'){
    if(POSTS.has(rkey(gx,gz,L))) return {ok:false, why:'이미 기둥 틀이 있다'};
    if(L>0 && !ROOFS.has(rkey(gx,gz,L-1))) return {ok:false, why:(L+1)+'층은 아래 지붕을 먼저 덮어야 한다'};
    return {ok:true, why:''};
  }
  if(L>0 && !ROOFS.has(rkey(gx,gz,L-1)))
    return {ok:false, why:(L+1)+'층은 아래 지붕을 먼저 덮어야 한다'};
  if(kind==='wall'||kind==='door'||kind==='window'){
    const w=WALLS.get(wkey(gx,gz,L,s));
    if(w) return {ok:false, why:'이미 '+BKIND_N[w.v||'wall']+'이 있다'};
    if(GABLES.has(wkey(gx,gz,L,s))) return {ok:false, why:'같은 자리에 삼각 벽이 있다'};
  }else if(kind==='leaf'||kind==='pane'){
    const w=WALLS.get(wkey(gx,gz,L,s));
    const need=BKIND_N[FITS[kind]];
    if(!w||w.v!==FITS[kind]) return {ok:false, why:need+'에만 달 수 있다'};
    if(w.leaf) return {ok:false, why:'이미 '+BKIND_N[w.leaf.kind]+'이 달려 있다'};
  }else if(kind==='gable'){
    if(GABLES.has(wkey(gx,gz,L,s))) return {ok:false, why:'이미 삼각 벽이 있다'};
    if(WALLS.has(wkey(gx,gz,L,s))) return {ok:false, why:'같은 자리에 벽이 있다'};
    const sl=SLOPES.get(rkey(gx,gz,L));
    if(sl&&gableAuto(gx,gz,L,s)===0)
      return {ok:false, why:'경사 지붕과 나란한 변이다 — 옆 변에 세워야 빈틈이 메워진다'};
  }else if(kind==='slope'){
    // 경사 지붕은 벽과 같은 층 띠를 쓴다 — 그 층 천장을 덮은 지붕 밑으로는 못 넣는다
    if(SLOPES.has(rkey(gx,gz,L))) return {ok:false, why:'이미 경사 지붕이 있다'};
    if(ROOFS.has(rkey(gx,gz,L))) return {ok:false, why:'이 칸은 지붕이 덮고 있다 — 옆 칸에 놓아 올라간다'};
  }else{
    if(ROOFS.has(rkey(gx,gz,L))) return {ok:false, why:'이미 지붕이 있다'};
    if(SLOPES.has(rkey(gx,gz,L))) return {ok:false, why:'경사 지붕이 있다'};
  }
  return {ok:true, why:''};
}
const buildCost=(k,tier)=>BTIER[tier===undefined?BUILD.tier:tier].cost[k];
const canBuild=(k,tier)=>buildCost(k,tier).every(r=>countMat(r)>=r.n);

/* ---- 짓기 모드 ---- */
function enterBuild(kind,tier){
  BUILD.on=true;
  if(kind) BUILD.kind=kind;
  if(tier!==undefined) BUILD.tier=tier;
  if(!BUILD.ghost){ BUILD.ghost=new THREE.Group(); scene.add(BUILD.ghost); }
  ghostRebuild();
  bldSig=null; bldBar();
  toast('짓기 — '+BTIER[BUILD.tier].n+' '+BKIND_N[BUILD.kind]
    +' (1~9 조각 · 0 등급 · R 방향 · Q 삼각 벽 좌우 · 좌클릭 놓기 · G 걷어내기 · Z·우클릭 끝)');
}
function exitBuild(){
  BUILD.on=false;
  if(BUILD.ghost) BUILD.ghost.visible=false;
  const el=document.getElementById('bld'); if(el) el.style.display='none';
}
/* 짓기 막대 — 조각·등급·방향을 눈으로 보고 손으로도 누른다.
   시점이 잠겨 있으면 마우스로 못 누르니 키(1~5 · 6·7·8 · R · Q)가 본줄이고,
   막대는 지금 상태를 보여 주는 곳이자 터치·창 모드에서 누르는 곳이다. */
let bldSig=null;
function bldBar(){
  const box=document.getElementById('bld'); if(!box) return;
  box.style.display=BUILD.on?'block':'none';
  if(!BUILD.on) return;
  const gable=BUILD.kind==='gable';
  const sig=[BUILD.kind,BUILD.tier,BUILD.side,BUILD.hand,gable].join('|');
  if(sig!==bldSig){
    bldSig=sig;
    const btn=(txt,on,fn)=>{
      const b=document.createElement('button');
      b.textContent=txt; if(on) b.className='on';
      b.onmousedown=e=>{ e.preventDefault(); e.stopPropagation(); };
      b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); fn(); bldSig=null; bldBar(); };
      return b;
    };
    const fill=(id,els)=>{ const h=document.getElementById(id);
      h.textContent=''; for(const e of els) h.appendChild(e); };
    fill('bldK', BKIND.map((k,i)=>btn((i+1)+' '+BKIND_N[k], BUILD.kind===k,
      ()=>{ BUILD.kind=k; })));
    fill('bldT', BTIER.map((T,i)=>btn('0 '+T.n, BUILD.tier===i,
      ()=>{ BUILD.tier=i; })));
    const dirs=[btn('자동', BUILD.side<0, ()=>{ BUILD.side=-1; })];
    for(let i=0;i<4;i++) dirs.push(btn(SIDE_N[i], BUILD.side===i, (j=>()=>{ BUILD.side=j; })(i)));
    dirs.push(btn('R 돌리기', false, ()=>{ BUILD.side=BUILD.side>=3?-1:BUILD.side+1; }));
    if(gable){
      dirs.push(btn('Q 왼쪽', BUILD.hand<0, ()=>{ BUILD.hand=-1; }));
      dirs.push(btn('오른쪽', BUILD.hand>0, ()=>{ BUILD.hand=1; }));
    }
    fill('bldR', dirs);
    /* 그만두기 — 짓기에 들어왔다가 나가는 길을 몰라 갇히는 일이 있었다. 늘 보이는 단추를 둔다 */
    fill('bldX', [btn('✕ 짓기 끝  (Z · 우클릭 · Esc)', false, ()=>{ exitBuild(); toast('짓기 끝'); })]);
  }
  const w=document.getElementById('bldW');
  w.textContent=BUILD.ok?(BUILD.why||'놓을 수 있다'):(BUILD.why||'여기엔 못 놓는다');
  w.className='wy'+(BUILD.ok?'':' bad');
}
function buildRotate(d){                              // R — 자동 → 북 → 동 → 남 → 서 → 자동
  const n=BUILD.side+ (d||1);
  BUILD.side = n>3 ? -1 : (n< -1 ? 3 : n);
  toast('방향 — '+(BUILD.side<0?'자동 (바라보는 변)':SIDE_N[BUILD.side]+'쪽'));
  bldSig=null;
}
let ghostSig=null;
function ghostRebuild(){
  if(!BUILD.ghost) return;
  while(BUILD.ghost.children.length) BUILD.ghost.remove(BUILD.ghost.children[0]);
  const m=BUILD_MESH[BUILD.kind](BTIER[BUILD.tier].c);
  m.traverse(o=>{ if(o.isMesh) o.material=new THREE.MeshBasicMaterial({
    color:0x8fd6b4, transparent:true, opacity:0.35, depthWrite:false}); });
  BUILD.ghost.add(m);
  ghostSig=BUILD.kind+BUILD.tier;
}
function updateBuild(){
  if(!BUILD.on){ if(BUILD.ghost) BUILD.ghost.visible=false; return; }
  if(ghostSig!==BUILD.kind+BUILD.tier) ghostRebuild();
  const t=buildTarget(), chk=buildCheck(t), enough=canBuild(BUILD.kind);
  BUILD.tgt=t; BUILD.ok=chk.ok&&enough;
  BUILD.why=chk.ok?(enough?(chk.snapped?'옆 토대에 높이를 맞춘다':''):'재료가 모자란다'):chk.why;
  BUILD.lvl=t.L||0;
  const g=BUILD.ghost; g.visible=true;
  const f=FOUNDS.get(fkey(t.gx,t.gz));
  const base=f?f.y:(t.kind==='found'?foundHeight(t.gx,t.gz).y:groundBaseY(t.gx,t.gz));   // 토대가 없는 칸은 맨땅의 바탕 높이
  if(t.kind==='found'){ g.position.set(t.gx*CELL_B,base,t.gz*CELL_B); g.rotation.y=0; }
  else if(t.kind==='post'){ g.position.set(t.gx*CELL_B,base+t.L*WALL_H,t.gz*CELL_B); g.rotation.y=0; }
  else if(t.kind==='wall'||t.kind==='door'||t.kind==='window'){
    const P0=wallPose(t.gx,t.gz,t.s);
    g.position.set(P0.x, base+t.L*WALL_H, P0.z); g.rotation.y=P0.rot;
  }else if(t.kind==='leaf'||t.kind==='pane'){
    const P0=wallPose(t.gx,t.gz,t.s), P=fitPose(t.kind);
    const cr=Math.cos(P0.rot), sr=Math.sin(P0.rot);
    g.position.set(P0.x+P.x*cr, base+t.L*WALL_H+P.y, P0.z-P.x*sr);
    g.rotation.y=P0.rot;
  }else if(t.kind==='gable'){
    const P0=wallPose(t.gx,t.gz,t.s);
    g.position.set(P0.x, base+t.L*WALL_H, P0.z);
    g.rotation.y=gableYaw(t.s, t.h);
  }else if(t.kind==='slope'){
    const [ox,oz]=SIDE[t.s];
    g.position.set(t.gx*CELL_B, base+t.L*WALL_H, t.gz*CELL_B);
    g.rotation.y=Math.atan2(ox,oz);
  }else{
    g.position.set(t.gx*CELL_B, base+(t.L+1)*WALL_H, t.gz*CELL_B); g.rotation.y=0;
  }
  const col=BUILD.ok?0x8fd6b4:0xd8724a;
  g.traverse(o=>{ if(o.isMesh) o.material.color.setHex(col); });
  bldBar();
}
function doBuild(){
  if(!BUILD.on||!BUILD.tgt) return;
  if(!BUILD.ok){ toast(BUILD.why||'여기엔 못 놓는다'); return; }
  const t=BUILD.tgt, tier=BUILD.tier;
  for(const r of buildCost(BUILD.kind)) consumeMat(r);
  if(t.kind!=='found') groundBase(t.gx,t.gz);                  // 토대가 없는 칸이면 맨땅의 바탕을 둔다
  if(t.kind==='found') placeFound(t.gx,t.gz,tier);
  else if(t.kind==='post') placePost(t.gx,t.gz,t.L,tier);
  else if(t.kind==='wall'||t.kind==='door'||t.kind==='window')
    placeWall(t.gx,t.gz,t.L,t.s,tier,t.kind);
  else if(t.kind==='leaf'||t.kind==='pane')
    placeFit(t.gx,t.gz,t.L,t.s,t.kind,tier,false);
  else if(t.kind==='slope') placeSlope(t.gx,t.gz,t.L,t.s,tier);
  else if(t.kind==='gable') placeGable(t.gx,t.gz,t.L,t.s,t.h,tier);
  else placeRoof(t.gx,t.gz,t.L,tier);
  toast(BTIER[tier].n+' '+BKIND_N[t.kind]+' 놓음'+(t.L?' ('+(t.L+1)+'층)':''));
  sfx('bind'); invDirty=true; craftDirty=true;
}
function undoBuild(){
  if(!BUILD.on||!BUILD.tgt) return;
  const t=BUILD.tgt;
  if(t.kind==='leaf'||t.kind==='pane'){
    const o=WALLS.get(wkey(t.gx,t.gz,t.L,t.s));
    if(o&&o.leaf){ const k=o.leaf.kind, tr=o.leaf.tier;
                   dropFit(o); return refundBuild(k,tr); }
  }
  if(t.kind==='post'){ const o=POSTS.get(rkey(t.gx,t.gz,t.L));
    if(o){ const fb=FOUNDS.get(fkey(t.gx,t.gz));
      if(fb&&fb.ghost&&(ROOFS.has(rkey(t.gx,t.gz,t.L))||SLOPES.has(rkey(t.gx,t.gz,t.L)))){ let wall=false; for(let i=0;i<4;i++) if(WALLS.has(wkey(t.gx,t.gz,t.L,i))) wall=true; if(!wall){ toast('지붕부터 걷어내야 한다 — 이 기둥이 받치고 있다'); return; } }
      dropBuild(o,POSTS,rkey(t.gx,t.gz,t.L)); return refundBuild('post',o.tier); } }
  if(t.kind==='wall'||t.kind==='door'||t.kind==='window'){
    const o=WALLS.get(wkey(t.gx,t.gz,t.L,t.s));
    if(o){
      if(o.leaf){ toast(BKIND_N[o.leaf.kind]+'부터 떼어내야 한다'); return; }
      dropBuild(o,WALLS,wkey(t.gx,t.gz,t.L,t.s));
      return refundBuild(o.v||'wall',o.tier);
    }
  }
  if(t.kind==='gable'){
    const o=GABLES.get(wkey(t.gx,t.gz,t.L,t.s));
    if(o){ dropBuild(o,GABLES,wkey(t.gx,t.gz,t.L,t.s)); return refundBuild('gable',o.tier); }
  }
  if(t.kind==='slope'){
    const o=SLOPES.get(rkey(t.gx,t.gz,t.L));
    if(o){
      for(let i=0;i<4;i++) if(GABLES.has(wkey(t.gx,t.gz,t.L,i))){
        toast('삼각 벽부터 걷어내야 한다'); return; }
      dropBuild(o,SLOPES,rkey(t.gx,t.gz,t.L)); return refundBuild('slope',o.tier);
    }
  }
  if(t.kind==='roof'){
    const o=ROOFS.get(rkey(t.gx,t.gz,t.L));
    if(o){
      for(let i=0;i<4;i++) if(WALLS.has(wkey(t.gx,t.gz,t.L+1,i))){
        toast('위층 벽부터 걷어내야 한다'); return; }
      dropBuild(o,ROOFS,rkey(t.gx,t.gz,t.L)); return refundBuild('roof',o.tier);
    }
  }
  if(t.kind==='found'){
    const o=FOUNDS.get(fkey(t.gx,t.gz));
    if(o){
      for(let L=0;L<8;L++){
        if(ROOFS.has(rkey(t.gx,t.gz,L))||SLOPES.has(rkey(t.gx,t.gz,L))){
          toast('지붕부터 걷어내야 한다'); return; }
        for(let i=0;i<4;i++) if(WALLS.has(wkey(t.gx,t.gz,L,i))||GABLES.has(wkey(t.gx,t.gz,L,i))){
          toast('벽부터 걷어내야 한다'); return; }
      }
      dropBuild(o,FOUNDS,fkey(t.gx,t.gz)); return refundBuild('found',o.tier);
    }
  }
  toast('걷어낼 것이 없다');
}
function refundBuild(kind,tier){
  for(const r of BTIER[tier].cost[kind]) invAdd(r.id,r.n);
  toast(BTIER[tier].n+' '+BKIND_N[kind]+' 걷어냄 — 재료를 되돌려 받았다');
  sfx('bind'); invDirty=true; craftDirty=true;
}

/* 물레방아 — 유량이 많은 하도에만 놓을 수 있다. 흐름 누적값이 곧 발전량이 된다. */
const WHEELS=[], DYNAMOS=[], ARCS=[];
function flowAt(x,z){
  const gx=clamp(Math.round(x/CELL+N/2),0,N-1), gz=clamp(Math.round(z/CELL+N/2),0,N-1);
  const i=IDX(gx,gz);
  return F.river[i]?F.flow[i]:0;
}
// 회전 속도 기준값. 설치 조건이 아니라 바퀴가 얼마나 빨리 도는지에만 쓴다.
const WHEEL_REF=()=>110*(16/(GCELL*GCELL))/Math.max(0.35,P.rain)*3.2;   // 유량(F.flow)은 만들 때의 칸 수로 센 값이다 — 섬 배율과 무관
function wheelSpot(){
  const x=PL.pos.x-Math.sin(PL.yaw)*1.6, z=PL.pos.z-Math.cos(PL.yaw)*1.6;
  if(flowAt(x,z)<=0) return {ok:false,why:'하천 위에 놓아야 한다'};
  for(const w of WHEELS) if(Math.hypot(w.x-x,w.z-z)<6) return {ok:false,why:'이미 물레방아가 있다'};
  return {ok:true,x,y:Math.max(0.2,heightAt(x,z)),z};
}
function placeWheel(){
  const sp=wheelSpot();
  if(!sp.ok){ toast(sp.why); return false; }
  placeWheelAt(sp.x,sp.y,sp.z); toast('물레방아를 놓았다'); return true;
}
function placeWheelAt(px,py,pz){
  const g=new THREE.Group();
  const w=new THREE.MeshLambertMaterial({color:0x5f4a33});
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.5,8),w);
  hub.rotation.z=Math.PI/2; hub.position.y=1.25; g.add(hub);
  const rim=new THREE.Group();
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const sp2=new THREE.Mesh(new THREE.BoxGeometry(0.07,2.2,0.07),w);
    sp2.position.set(0,0,0); sp2.rotation.x=a; rim.add(sp2);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.30,0.06),
      new THREE.MeshLambertMaterial({color:0x4d3b28}));
    pad.position.set(0,Math.cos(a)*1.12,Math.sin(a)*1.12);
    pad.rotation.x=a; rim.add(pad);
  }
  rim.position.y=1.25; g.add(rim);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.16,1.3,7),w);
  post.position.set(0.42,0.65,0); g.add(post);
  const post2=post.clone(); post2.position.x=-0.42; g.add(post2);
  g.rotation.y=Math.random()*6.283;
  g.position.set(px,py,pz); scene.add(g);
  const obj={x:px,y:py,z:pz,mesh:g,rim:rim,flow:flowAt(px,pz)};
  WHEELS.push(obj);
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:0.8}); buildColliderGrid();
  return obj;
}

/* 증기기관 — 모닥불과 같은 '불 용기'다(kind:'fire', FIRES 에 든다). 그래서 땔감 넣기·불 붙이기·
   꺼짐이 모닥불 규칙 그대로이고, 저장도 모닥불 목록에 steam 표시로 같이 담긴다.
   불이 붙어 땔감이 남아 있는 동안 7 m 안의 발전기를 돌린다(`turnsDynamo`).
   생김새: 벽돌 화실 위에 누운 보일러 · 굴뚝 · 실린더와 피스톤 막대 · 크랭크로 도는 무거운 바퀴. */
function placeSteam(){
  const sp=campfireSpot();
  if(!sp.ok){ toast(sp.why); return false; }
  placeSteamAt(sp.x,sp.y,sp.z); toast('증기기관을 세웠다 — 땔감을 넣고 불을 붙여라'); return true;
}
function placeSteamAt(x,y,z){
  const g=new THREE.Group();
  const IRON=WMAT(0x5a5f66), DARKI=WMAT(0x33363a), BRICK=new THREE.MeshLambertMaterial({color:0x8a4a34}),
        BRASS=WMAT(0xc4a747), COPPER=WMAT(0xb87333);
  const box=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.7,1.1),BRICK); box.position.y=0.35; g.add(box);   // 화실
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.34,0.05),DARKI); door.position.set(0,0.32,0.56); g.add(door);
  const boil=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,1.7,18),IRON);            // 누운 보일러
  boil.rotation.z=Math.PI/2; boil.position.y=1.12; g.add(boil);
  for(const bx of [-0.7,0,0.7]){                                                          // 리벳 띠
    const bd=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.025,5,20),DARKI);
    bd.rotation.y=Math.PI/2; bd.position.set(bx,1.12,0); g.add(bd);
  }
  const stack=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,1.6,10),DARKI);         // 굴뚝
  stack.position.set(-0.55,2.2,0); g.add(stack);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8,0,Math.PI*2,0,Math.PI/2),BRASS);
  dome.position.set(0.25,1.55,0); g.add(dome);                                            // 증기 돔
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.7,6),COPPER);
  pipe.rotation.z=Math.PI/2.4; pipe.position.set(0.62,1.5,0.2); g.add(pipe);
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.5,12),IRON);            // 실린더
  cyl.rotation.z=Math.PI/2; cyl.position.set(0.95,1.12,0.55); g.add(cyl);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.6,6),BRASS);          // 피스톤 막대
  rod.rotation.z=Math.PI/2; rod.position.set(1.3,1.12,0.55); g.add(rod);
  const wheel=new THREE.Group();                                                          // 관성 바퀴
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.06,6,24),DARKI); wheel.add(rim);
  for(let i=0;i<6;i++){ const sp=new THREE.Mesh(new THREE.BoxGeometry(0.04,1.1,0.04),IRON); sp.rotation.z=i/6*Math.PI; wheel.add(sp); }
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.2,10),BRASS); hub.rotation.x=Math.PI/2; wheel.add(hub);
  wheel.position.set(1.75,1.12,0.55); g.add(wheel);
  const stand=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.6,0.2),DARKI); stand.position.set(1.75,0.3,0.55); g.add(stand);
  const flame=makeFire(0.45,{smoke:false}); flame.position.set(0,0.12,0.6); flame.visible=false; g.add(flame);
  const smoke=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,0.5,0),fireMats().smoke);
  smoke.scale.set(1.4,4,1); smoke.position.set(-0.55,3.0,0); smoke.frustumCulled=false; smoke.userData.lightRole='none';
  flame.add(smoke); smoke.position.set(-0.55,2.9,-0.6);                                   // 굴뚝 연기 — 불과 함께 켜진다
  const light=LIGHT.addFire(g,{color:0xff7a2a,intensity:0,dist:10,pos:[0,0.4,0.9]}); light.visible=false;
  g.rotation.y=PL.yaw; g.position.set(x,y,z); scene.add(g);
  const f={kind:'fire', cname:'증기기관', steam:true, cap:60, slotCap:10, slots:[],
           x,y,z,lit:false,fuel:0,cook:{},mesh:g,flame,light,t:0,wheel,rod};
  FIRES.push(f);
  COLLIDERS.push({x,z,y0:y-0.1,y1:y+1.8,r:1.2}); buildColliderGrid();
  return f;
}

/* 발전기 — 물레방아 축에 물린다. 물레방아 7 m 안에만 놓을 수 있다. */
function placeDynamoAt(px,py,pz){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.62,0.62),
    new THREE.MeshLambertMaterial({color:0x6b5a3c}));
  body.position.y=0.31; g.add(body);
  for(let i=0;i<5;i++){
    const c=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.035,5,10),
      new THREE.MeshLambertMaterial({color:0xb87333}));
    c.rotation.y=Math.PI/2; c.position.set(-0.3+i*0.15,0.34,0); g.add(c);
  }
  const mg=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.3,0.5),
    new THREE.MeshLambertMaterial({color:0x5a5f66}));
  mg.position.set(0.34,0.36,0); g.add(mg);
  g.rotation.y=Math.random()*6.283;
  g.position.set(px,py,pz); scene.add(g);
  /* kind:'power' — 숫돌(kind:'grind')과 같다. findContainer 가 같이 훑도록
     달아 두었을 뿐 slots 는 없다. 용기인 줄 알고 contWeight 를 부르면 터진다. */
  DYNAMOS.push({x:px,y:py,z:pz,mesh:g,kind:'power',cname:'발전기'});
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:0.55}); buildColliderGrid();
}
function placeDynamo(){
  const sp=campfireSpot();
  if(!sp.ok){ toast(sp.why); return false; }
  if(!WHEELS.some(w=>Math.hypot(w.x-sp.x,w.z-sp.z)<7)&&!FIRES.some(f=>f.steam&&Math.hypot(f.x-sp.x,f.z-sp.z)<7)){
    toast('물레방아나 증기기관 곁에 놓아야 한다'); return false; }
  placeDynamoAt(sp.x,sp.y,sp.z); toast('발전기를 얹었다'); return true;
}
// 발전기를 돌리는 것 — 물레방아 또는 불 땐 증기기관(7 m 안)
const turnsDynamo=d=>WHEELS.some(w=>Math.hypot(w.x-d.x,w.z-d.z)<7)
  ||FIRES.some(f=>f.steam&&f.lit&&f.fuel>0&&Math.hypot(f.x-d.x,f.z-d.z)<7);
const powered=()=>DYNAMOS.some(turnsDynamo);

/* 선반 — 아크로와 같은 조건이다(발전기 12 m 안, 물레방아가 돌아야 한다).
   두들겨서는 총열 안에 나선 홈을 못 깎는다. 돌리면서 깎아야 한다. */
const LATHES=[];
function placeLatheAt(px,py,pz){
  const g=new THREE.Group();
  const wm=new THREE.MeshLambertMaterial({color:0x6b5a3c});
  const sm=new THREE.MeshLambertMaterial({color:0x6e747a});
  const bed=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.18,0.55),wm);
  bed.position.y=0.78; g.add(bed);
  for(const x of [-0.85,0.85]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.7,0.45),wm);
    leg.position.set(x,0.35,0); g.add(leg);
  }
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.40,0.5),sm);
  head.position.set(-0.78,1.07,0); g.add(head);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.30,0.4),sm);
  tail.position.set(0.82,1.02,0); g.add(tail);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.5,8),sm);
  bar.rotation.z=Math.PI/2; bar.position.set(0,1.02,0); g.add(bar);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.025,5,12),
    new THREE.MeshLambertMaterial({color:0x3a2f23}));
  belt.position.set(-0.78,1.07,0.28); g.add(belt);
  g.rotation.y=Math.random()*6.283;
  g.position.set(px,py,pz); scene.add(g);
  LATHES.push({x:px,y:py,z:pz,mesh:g});
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:0.9}); buildColliderGrid();
}
function placeLathe(){
  const sp=campfireSpot();
  if(!sp.ok){ toast(sp.why); return false; }
  if(!DYNAMOS.some(d=>Math.hypot(d.x-sp.x,d.z-sp.z)<12)){
    toast('발전기에서 전선이 닿아야 한다'); return false; }
  placeLatheAt(sp.x,sp.y,sp.z); toast('선반을 세웠다'); return true;
}
const nearLathe=()=>powered()&&LATHES.some(a=>Math.hypot(a.x-PL.pos.x,a.z-PL.pos.z)<3.4
  &&DYNAMOS.some(d=>Math.hypot(d.x-a.x,d.z-a.z)<12));

/* 아크로 — 전기가 들어와야 돈다. 발전기 12 m 안. */
function placeArcAt(px,py,pz){
  const g=new THREE.Group();
  const cl=new THREE.MeshLambertMaterial({color:0x6d5642});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.66,1.1,10),cl);
  body.position.y=0.55; g.add(body);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.56,0.5,0.14,10),
    new THREE.MeshLambertMaterial({color:0x7d6650}));
  cap.position.y=1.17; g.add(cap);
  for(const sx of [-1,1]){                       // 전극 두 개가 마주 본다
    const e=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.6,6),
      new THREE.MeshLambertMaterial({color:0x2a2724}));
    e.rotation.z=Math.PI/2; e.position.set(sx*0.42,0.78,0); g.add(e);
  }
  const gap=new THREE.Mesh(new THREE.SphereGeometry(0.10,8,6),
    new THREE.MeshBasicMaterial({color:0x9fd8ff}));
  gap.position.y=0.78; g.add(gap);
  const li=LIGHT.addPoint(g,{color:0x7fc4ff,intensity:0,dist:14,shadow:true,pos:[0,0.8,0]});
  g.rotation.y=Math.random()*6.283;
  g.position.set(px,py,pz); scene.add(g);
  ARCS.push({x:px,y:py,z:pz,mesh:g,glow:gap,light:li});
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:0.75}); buildColliderGrid();
}
function placeArc(){
  const sp=campfireSpot();
  if(!sp.ok){ toast(sp.why); return false; }
  if(!DYNAMOS.some(d=>Math.hypot(d.x-sp.x,d.z-sp.z)<12)){
    toast('발전기에서 전선이 닿는 곳이어야 한다'); return false; }
  placeArcAt(sp.x,sp.y,sp.z); toast('아크로를 세웠다'); return true;
}
const nearArc=()=>powered()&&ARCS.some(a=>Math.hypot(a.x-PL.pos.x,a.z-PL.pos.z)<3.4
  &&DYNAMOS.some(d=>Math.hypot(d.x-a.x,d.z-a.z)<12));

/* 모루 — 통나무 그루터기에 얹은 넓적한 석재. 달군 쇠를 여기서 두들긴다. */
const ANVILS=[];
const nearAnvil=()=>ANVILS.some(g=>Math.hypot(g.x-PL.pos.x,g.z-PL.pos.z)<3.2);
function placeAnvil(){
  const spot=campfireSpot();
  if(!spot.ok){ toast(spot.why); return false; }
  for(const g of ANVILS) if(Math.hypot(g.x-spot.x,g.z-spot.z)<2.5){
    toast('이미 모루가 있다'); return false; }
  placeAnvilAt(spot.x,spot.y,spot.z);
  toast('모루를 놓았다');
  return true;
}
function placeAnvilAt(px,py,pz){
  const grp=new THREE.Group();
  const stump=new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.52,0.72,9),
    new THREE.MeshLambertMaterial({color:0x4a3a29}));
  stump.position.y=0.36; grp.add(grp.userData.s=stump);
  const face=new THREE.Mesh(hearthStone(0.42),
    new THREE.MeshLambertMaterial({color:0x8a8880}));
  face.position.y=0.86; face.scale.set(1.25,0.52,0.95);
  face.rotation.y=Math.random()*6.283; grp.add(face);
  for(let i=0;i<3;i++){                       // 발치에 굴러다니는 쇠똥
    const sl=new THREE.Mesh(hearthStone(0.13),
      new THREE.MeshLambertMaterial({color:0x3a332c}));
    const a=Math.random()*6.283, r=0.7+Math.random()*0.5;
    sl.position.set(Math.cos(a)*r,0.08,Math.sin(a)*r);
    sl.scale.set(1,0.6,1); grp.add(sl);
  }
  grp.rotation.y=Math.random()*6.283;
  grp.position.set(px,py,pz); scene.add(grp);
  ANVILS.push({x:px,y:py,z:pz,mesh:grp,cname:'모루'});
  COLLIDERS.push({x:px,z:pz,y0:py-0.1,y1:py+1.8,r:0.7}); buildColliderGrid();
}

/* 숫돌 — 마제 석기를 갈기 위한 작업대. 모닥불과 같은 방식으로 설치한다. */
const GRINDS=[];
const nearGrind=()=>GRINDS.some(g=>Math.hypot(g.x-PL.pos.x,g.z-PL.pos.z)<3.2);
function placeGrindstone(){
  const spot=campfireSpot();
  if(!spot.ok){ toast(spot.why); return false; }
  for(const g of GRINDS) if(Math.hypot(g.x-spot.x,g.z-spot.z)<2.5){
    toast('이미 숫돌이 있다'); return false; }
  placeGrindstoneAt(spot.x,spot.y,spot.z);
  toast('숫돌을 놓았다');
  return true;
}
function placeGrindstoneAt(px,py,pz){
  const spot={x:px,y:py,z:pz};
  const grp=new THREE.Group();
  const smat=new THREE.MeshLambertMaterial({color:0x7d7a72});
  for(let i=0;i<3;i++){
    const st=new THREE.Mesh(hearthStone(0.26),smat);
    const a=i/3*Math.PI*2;
    st.position.set(Math.cos(a)*0.38,0.16,Math.sin(a)*0.38);
    st.rotation.set(Math.random()*6.283,Math.random()*6.283,Math.random()*6.283);
    grp.add(st);
  }
  const slab=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.22,0.95),
    new THREE.MeshLambertMaterial({color:0x8a8880}));
  slab.position.y=0.46; slab.rotation.y=Math.random()*0.5-0.25;
  grp.add(slab);
  grp.position.set(spot.x,spot.y,spot.z); scene.add(grp);
  /* 용기와 같은 자리에서 E 를 받는다 — 담는 곳은 아니지만 '눈앞의 설비'로는 같다 */
  GRINDS.push({kind:'grind', cname:'숫돌', x:spot.x,y:spot.y,z:spot.z, mesh:grp});
  COLLIDERS.push({x:spot.x,z:spot.z,y0:spot.y-0.1,y1:spot.y+1.8,r:0.85}); buildColliderGrid();
}

// 모닥불 둘레 돌 하나 — 암석과 같은 방식으로 매번 새 형상을 만든다
function hearthStone(r){
  const g=new THREE.IcosahedronGeometry(r,1);
  const pos=g.attributes.position, V=new THREE.Vector3();
  const lobe=[];
  for(let l=0;l<3;l++){
    let ax=Math.random()*2-1, ay=Math.random()*2-1, az=Math.random()*2-1;
    const L=Math.hypot(ax,ay,az)||1;
    lobe.push([ax/L,ay/L,az/L, 1.6+Math.random()*3.4, Math.random()*6.283, Math.random()*2-1]);
  }
  for(let i=0;i<pos.count;i++){
    V.set(pos.getX(i),pos.getY(i),pos.getZ(i));
    const d=V.clone().normalize();
    let f=0;
    for(const l of lobe) f+=l[5]*Math.sin(l[3]*(d.x*l[0]+d.y*l[1]+d.z*l[2])+l[4]);
    V.multiplyScalar(1+(f/3)*0.24);
    pos.setXYZ(i,V.x,V.y,V.z);
  }
  g.computeVertexNormals();
  const nor=g.attributes.normal, P=new THREE.Vector3(), Nv=new THREE.Vector3();
  for(let i=0;i<nor.count;i++){
    P.set(pos.getX(i),pos.getY(i),pos.getZ(i)).normalize();
    Nv.set(nor.getX(i),nor.getY(i),nor.getZ(i)).lerp(P,0.68).normalize();
    nor.setXYZ(i,Nv.x,Nv.y,Nv.z);
  }
  return g;
}
/* ── 가마 — 모닥불을 구운 벽돌로 둘러 돔을 얹은 것(사용자 요청). 같은 불 용기(FIRES)인 채로 두 배 넓고 두 배 빨리 굽는다 ── */
/* ── 화덕 — 모닥불 둘레에 돌을 쌓아 올린 것(사용자 요청: 예전의 '화덕'은 모닥불이 되고, 화덕은 그 위에 짓는다) ──
   안이 두 배(40 → 80 kg · 10 → 20 칸) · 두 배 빨리 익는다 · 땔감도 두 배로 먹는다(60-stations.js). 가마는 화덕이든 모닥불이든 곁에서 짓는다 */
function hearthTarget(){ let best=null, bd=3.5;
  for(const f of FIRES){ if(f.steam||f.kilnU||f.hearthU) continue; const d=Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z); if(d<bd){ bd=d; best=f; } }
  return best; }
function hearthSpot(){ return hearthTarget()?{ok:true}:{ok:false,why:'모닥불 곁에서 짓는다 — 화덕은 모닥불에 돌을 쌓아 올린 것이다'}; }
function hearthify(f){
  if(f.hearthU) return; f.hearthU=true; f.cname='화덕'; f.cap=Math.max(f.cap,80); f.slotCap=Math.max(f.slotCap,20);
  const HM=hearthMats(), g=new THREE.Group(), gap=1.0, th0=Math.PI/2+gap/2;          // 앞(+z)이 트인 돌 벽
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(0.84,0.92,0.58,22,1,true,th0,Math.PI*2-gap),HM.stone); wall.material=HM.stone.clone(); wall.material.side=THREE.DoubleSide; wall.position.y=0.29; g.add(wall);
  for(let i=0;i<11;i++){ const a=th0+(i+0.5)/11*(Math.PI*2-gap);                     // 윗단의 돌 — 하나하나 다른 모양
    const st=new THREE.Mesh(SHP.blob(0.17,(i*7919+13)|0,{w:8,h:5,amp:0.26,sy:0.7}),HM.stone);
    st.position.set(Math.sin(a)*0.88,0.60,Math.cos(a)*0.88); st.rotation.y=a*1.7; g.add(st); }
  f.mesh.add(g); f.hearthM=g;
  const col=COLLIDERS.find(o=>o.x===f.x&&o.z===f.z); if(col) col.r=Math.max(col.r,0.98);
  if(typeof LIGHT!=='undefined'&&LIGHT.live) LIGHT.dirtyAt(f.x,f.z,4);
}
function placeHearth(){
  const f=hearthTarget(); if(!f){ toast('모닥불 곁에서 짓는다'); return false; }
  hearthify(f); toast('화덕을 올렸다 — 모닥불보다 두 배 넓고 두 배 빨리 익힌다(땔감도 두 배)'); boxDirty=true; return true;
}
function kilnTarget(){ let best=null, bd=3.5;
  for(const f of FIRES){ if(f.steam||f.kilnU) continue; const d=Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z); if(d<bd){ bd=d; best=f; } }
  return best; }
function kilnSpot(){ return kilnTarget()?{ok:true}:{ok:false,why:'모닥불 곁에서 짓는다 — 가마는 모닥불을 벽돌로 두른 것이다'}; }
let _brickTex=null;
function brickTex(){
  if(_brickTex) return _brickTex;
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), rn=mulberry32(0xb51c);
  g.fillStyle='#8a8070'; g.fillRect(0,0,128,128);                    // 줄눈
  for(let r=0;r<8;r++) for(let k=-1;k<5;k++){ const x=k*32+(r&1?16:0)+1, y=r*16+1, v=0.8+rn()*0.35;
    g.fillStyle='rgb('+((150*v)|0)+','+((72*v)|0)+','+((48*v)|0)+')'; g.fillRect(x,y,30,14);
    g.fillStyle='rgba(0,0,0,'+(0.1+rn()*0.15)+')'; g.fillRect(x,y+10,30,4); }
  _brickTex=new THREE.CanvasTexture(c); _brickTex.wrapS=_brickTex.wrapT=THREE.RepeatWrapping; return _brickTex;
}
function kilnify(f){
  if(f.kilnU) return; f.kilnU=true; f.cname='가마'; f.cap=Math.max(f.cap,80); f.slotCap=Math.max(f.slotCap,20);
  const tx=brickTex(), mat=new THREE.MeshLambertMaterial({map:tx,side:THREE.DoubleSide}), g=new THREE.Group();
  const gap=1.1, th0=Math.PI/2+gap/2;                                // 앞(+z)에 아궁이 — 땔감을 넣는 구멍
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(0.92,1.0,0.75,24,1,true,th0,Math.PI*2-gap),mat); wall.position.y=0.375; g.add(wall);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.92,24,10,0,Math.PI*2,0,Math.PI/2),mat); dome.position.y=0.75; dome.scale.y=0.78; g.add(dome);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(0.97,0.06,6,28),mat); lip.rotation.x=Math.PI/2; lip.position.y=0.76; g.add(lip);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.07,6,14,Math.PI),mat); arch.position.set(0,0.0,0.93); g.add(arch);   // 아궁이 아치
  const chim=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.16,0.55,10,1,true),mat); chim.position.set(0,1.62,0); g.add(chim);
  for(const m of [wall,dome,lip,arch,chim]) m.material.map.repeat.set(3,2);
  f.mesh.add(g); f.kilnM=g;
  const col=COLLIDERS.find(o=>o.x===f.x&&o.z===f.z); if(col) col.r=1.05;
  LIGHT.dirtyAt(f.x,f.z,4);
}
function placeKiln(){
  const f=kilnTarget(); if(!f){ toast('모닥불 곁에서 짓는다'); return false; }
  kilnify(f); toast('가마를 지었다 — 모닥불보다 두 배 넓고 두 배 빨리 굽는다'); boxDirty=true; return true;
}
function placeCampfire(){
  const spot=campfireSpot();
  if(!spot.ok){ toast(spot.why); return false; }
  if(spot.onF){ toast(FIRE_ON_FOUND); return false; }
  placeCampfireAt(spot.x,spot.y,spot.z);
  toast('모닥불을 지었다');
  return true;
}
/* ── 불꽃 ─────────────────────────────────────────────────────────────────
   원뿔 두 개를 쌓아 두던 것을 셰이더 불로 바꿨다. 카메라를 마주 보는 판(빌보드)에
   ① 위로 흘러가는 값잡음 세 겹으로 혀를 날름거리는 윤곽을 깎고 ② 밝기를 흑체 색으로
   칠한다(가장자리 검붉음 → 주황 → 노랑 → 속은 거의 흰색) — 불빛 색은 온도가 정한다.
   ③ 더하기 혼합이라 겹칠수록 밝고 뒤가 비친다. 판 둘을 씨앗만 달리해 겹친다.
   그 위에 튀어 오르는 불티(점 · 셰이더가 시간으로 움직인다 — CPU 가 안 든다),
   바닥의 잉걸불 번짐, 위로 흩어지는 연기를 얹는다. 크기는 makeFire(s) 의 s 하나다. */
const FIRE_U={uTime:{value:0}};
const FIRE_NOISE=`
float fh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float fn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(fh(i),fh(i+vec2(1,0)),f.x),mix(fh(i+vec2(0,1)),fh(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ return fn(p)*0.5+fn(p*2.03+1.7)*0.3+fn(p*4.1+3.1)*0.2; }`;
const BILL_VS=`varying vec2 vUv;
void main(){ vUv=uv;
  // 가운데를 카메라 공간으로 옮긴 뒤 판을 화면에 나란히 편다(세로는 세계 위쪽을 대략 따른다)
  vec4 c=modelViewMatrix*vec4(0.0,0.0,0.0,1.0);
  vec2 sc=vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));
  c.xy+=position.xy*sc;
  gl_Position=projectionMatrix*c; }`;
let _fireMats=null;
function fireMats(){
  if(_fireMats) return _fireMats;
  const flame=seed=>new THREE.ShaderMaterial({uniforms:{uTime:FIRE_U.uTime,uSeed:{value:seed},uHeat:{value:1}},
    vertexShader:BILL_VS, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    fragmentShader:`uniform float uTime; uniform float uSeed; uniform float uHeat; varying vec2 vUv;
${FIRE_NOISE}
void main(){
  vec2 uv=vUv; float x=(uv.x-0.5)*2.0, y=uv.y;
  // 위로 흐르는 잡음 — 위쪽일수록 빠르고 옆으로 흔들린다
  float n=fbm(vec2(x*1.6+uSeed, y*2.6-uTime*2.4+uSeed*3.0));
  float n2=fbm(vec2(x*3.4-uSeed, y*4.8-uTime*3.6));
  float sway=(n-0.5)*0.35*y;
  float w=pow(1.0-y,0.8)*0.75;                   // 밑이 넓고 위가 뾰족한 몸통
  float d=abs(x+sway)/max(w,0.001);
  // 잡음이 위로 갈수록 몸통을 크게 갉아 혀 여러 갈래로 찢긴다
  float body=1.0-d - y*0.35 + (n*0.9+n2*0.5-0.72)*(0.5+y*1.6);
  float a=smoothstep(0.0,0.30,body)*smoothstep(0.0,0.08,y);
  if(a<=0.002) discard;
  float t=clamp(body*1.35,0.0,1.0)*uHeat;          // 온도 — 속이 가장 뜨겁다
  // 겉은 카민(짙은 붉은 자주) → 주홍 → 속은 레몬빛(사용자 요청) — 속 끝만 조금 희게
  vec3 col=mix(vec3(0.85,0.0,0.16),vec3(1.0,0.06,0.18),smoothstep(0.0,0.26,t));
  col=mix(col,vec3(1.0,0.40,0.06),smoothstep(0.26,0.52,t));
  col=mix(col,vec3(1.0,0.90,0.22),smoothstep(0.52,0.80,t));
  col=mix(col,vec3(1.0,0.96,0.50),smoothstep(0.92,1.0,t));
  // 더하기 섞음이라 짙은 겉빛은 밝은 바탕에 묻힌다 — 겉(카민)은 더 세게, 속(레몬)은 덜 세게 더해 속이 하얗게 타지 않게
  float k=mix(1.25,0.62,smoothstep(0.3,0.8,t));
  gl_FragColor=vec4(col*a*k, a);
}`});
  const glow=new THREE.ShaderMaterial({uniforms:{uTime:FIRE_U.uTime}, vertexShader:BILL_VS,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    fragmentShader:`uniform float uTime; varying vec2 vUv;
void main(){ float r=length(vUv-0.5)*2.0; float a=pow(max(0.0,1.0-r),2.2)*(0.85+0.15*sin(uTime*9.0));
  gl_FragColor=vec4(vec3(1.0,0.48,0.10)*a*0.22,a); }`});   // 둘레 번짐 — 주황
  const smoke=new THREE.ShaderMaterial({uniforms:{uTime:FIRE_U.uTime}, vertexShader:BILL_VS,
    transparent:true, depthWrite:false,
    fragmentShader:`uniform float uTime; varying vec2 vUv;
${FIRE_NOISE}
void main(){ vec2 uv=vUv; float x=(uv.x-0.5)*2.0;
  float n=fbm(vec2(x*1.4, uv.y*2.0-uTime*0.45));
  float w=0.25+uv.y*0.75;                          // 오를수록 퍼진다
  float a=smoothstep(0.1,0.7,n-abs(x)/w*0.6)*smoothstep(0.0,0.25,uv.y)*(1.0-uv.y)*0.32;
  if(a<=0.003) discard;
  gl_FragColor=vec4(vec3(0.32,0.31,0.30),a); }`});
  const sparks=new THREE.ShaderMaterial({uniforms:{uTime:FIRE_U.uTime,uS:{value:1}},
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uTime; uniform float uS; attribute float aSeed; varying float vA;
void main(){
  float life=1.6+fract(aSeed*7.3)*1.2, t=mod(uTime+aSeed*13.0,life)/life;   // 0→1 한 번 살고 다시
  vec3 p=position; p.y+=t*t*0.4+t*1.1;               // 뜨거운 공기에 떠밀려 오른다
  p.x+=sin(uTime*3.0+aSeed*20.0)*0.08*t; p.z+=cos(uTime*2.6+aSeed*17.0)*0.08*t;
  vA=(1.0-t)*smoothstep(0.0,0.1,t);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  // 크기는 세계 길이(불티 지름 1~2.5 cm × 불 크기)로 — 화면 픽셀로 잡았더니 눈앞의 횃불 불티가 화면을 덮었다
  float ws=(0.010+0.015*(1.0-t))*length(modelMatrix[0].xyz);
  gl_PointSize=clamp(ws*projectionMatrix[1][1]*400.0/max(-mv.z,0.05),1.0,24.0);
  gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`varying float vA;
void main(){ float r=length(gl_PointCoord-0.5)*2.0; if(r>1.0) discard;
  gl_FragColor=vec4(vec3(1.0,0.62,0.22)*vA*(1.0-r),vA); }`});
  return _fireMats={flame:[flame(0.0),flame(4.7)], glow, smoke, sparks};
}
/* 총구 화염 — 화면을 마주 보는 별꼴 불(가지 여러 개가 잡음으로 들쭉날쭉) + 짧은 불꽃 혀.
   쏠 때마다 씨앗을 바꿔 매번 다른 꼴이다. r 은 예전 원뿔 반지름(총마다 크기). */
function muzzleFlash(r){
  const seed={value:0};
  const m=new THREE.ShaderMaterial({uniforms:{uSeed:seed}, vertexShader:BILL_VS,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    fragmentShader:`uniform float uSeed; varying vec2 vUv;
${FIRE_NOISE}
void main(){ vec2 q=(vUv-0.5)*2.0; float r=length(q), a=atan(q.y,q.x);
  float spikes=0.35+0.65*fn(vec2(a*2.6+uSeed, uSeed*0.7));        // 들쭉날쭉한 가지
  float body=spikes-r;
  float al=smoothstep(0.0,0.35,body);
  if(al<=0.003) discard;
  float t=clamp(body*1.8,0.0,1.0);
  vec3 col=mix(vec3(1.0,0.45,0.08),vec3(1.0,0.85,0.45),smoothstep(0.1,0.6,t));
  col=mix(col,vec3(1.0,0.98,0.9),smoothstep(0.6,1.0,t));
  gl_FragColor=vec4(col*al*1.2,al); }`});
  const g=new THREE.Group(); g.name='flash';
  const q=new THREE.Mesh(new THREE.PlaneGeometry(1,1),m); q.scale.set(r*4.2,r*4.2,1); g.add(q);
  q.frustumCulled=false; g.userData.seed=seed;
  return g;
}
/* 로켓 불꽃 — 노즐에서 뻗는 기둥. 노즐 곁은 푸르스름하게 희고(가장 뜨겁다), 멀수록
   주황으로 식으며 스러진다. 충격파 마디(다이아몬드)가 줄지어 선다. 판 두 장을 십자로 세운다.
   uPow 0 → 1 로 켜지고, 길이는 메시 배율로 준다. 원점이 노즐, 불꽃은 −Y 로 뻗는다. */
function makePlume(len,rad){
  const pow={value:0};
  const m=new THREE.ShaderMaterial({uniforms:{uTime:FIRE_U.uTime,uPow:pow},
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform float uTime; uniform float uPow; varying vec2 vUv;
${FIRE_NOISE}
void main(){
  float y=1.0-vUv.y;                          // 0 노즐 → 1 끝
  float x=(vUv.x-0.5)*2.0;
  float w=mix(0.55,1.0,smoothstep(0.0,0.35,y))*(1.0-y*0.55);      // 노즐 밖에서 부풀었다 가늘어진다
  float n=fbm(vec2(x*3.0, y*6.0-uTime*9.0));
  float core=1.0-abs(x)/max(w,0.01);
  float len=0.35+0.65*uPow;                   // 힘이 셀수록 길다
  float a=smoothstep(0.0,0.35,core+(n-0.5)*0.5)*smoothstep(len,len*0.55,y)*uPow;
  if(a<=0.003) discard;
  float diamond=0.5+0.5*cos(y*38.0)*smoothstep(0.45,0.0,y);          // 충격파 마디
  vec3 hot=vec3(0.80,0.90,1.0), mid=vec3(1.0,0.75,0.40), cool=vec3(1.0,0.35,0.08);
  vec3 col=mix(hot,mid,smoothstep(0.08,0.35,y/len));
  col=mix(col,cool,smoothstep(0.35,0.85,y/len));
  col*=0.8+0.5*diamond*core;
  gl_FragColor=vec4(col*a*1.3,a);
}`});
  const g=new THREE.Group();
  const pl=new THREE.PlaneGeometry(1,1); pl.translate(0,-0.5,0);
  for(let i=0;i<2;i++){
    const q=new THREE.Mesh(pl,m); q.rotation.y=i*Math.PI/2; q.scale.set(rad*2,len,1);
    q.frustumCulled=false; q.renderOrder=3; g.add(q);
  }
  g.userData.pow=pow; g.userData.lightRole='none';
  return g;
}
/* s — 크기(모닥불 1 · 횃불 0.25). smoke/sparks 는 끌 수 있다 */
/* 불꽃 셰이더 미리 짜기 — 불꽃·번짐·연기·불티는 ShaderMaterial 이라 광원 수와 상관없이 한 번만 짜면 된다.
   예전엔 처음 불을 켜는 순간(보이게 되는 순간) 다섯 개를 짜느라 멈칫했다(PRECOMP 는 소프트웨어 렌더에서 꺼져 있어 못 막았다) */
let _fireWarm=false;
function fireWarm(){
  if(_fireWarm||!renderer) return; _fireWarm=true;
  try{ /* 열쇠에 광원 수·안개가 든다(ShaderMaterial 도) — 본 장면과 같은 수의 가짜 광원을 세운 빈 장면(90-init.js precompScene) */
    const sc=precompScene(lightCensus(),true), g=makeFire(1);
    g.position.set(0,0,-3); g.traverse(o=>{ o.visible=true; }); g.parent=sc; sc.children.push(g);
    renderer.compile(sc,camera);
    /* 점광원 그림자의 거리 재질 — 불빛 풀의 그림자 칸을 상륙 자리에 세워 한 번 그려 둔다(세기 0 이라 화면엔 안 보인다) */
    for(const l of LIGHT.pool) if(l.castShadow&&!l.userData.who){ l.position.set(PL.pos.x,PL.pos.y,PL.pos.z); l.distance=22;
      l.shadow.camera.far=24; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate=true; l.updateMatrixWorld(); } g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }catch(e){ _fireWarm=false; }
}
function makeFire(s,opt){
  opt=opt||{};
  const M=fireMats(), g=new THREE.Group(), plane=new THREE.PlaneGeometry(1,1);
  plane.translate(0,0.5,0);                           // 밑동이 원점
  M.flame.forEach((m,i)=>{
    const f=new THREE.Mesh(plane,m); f.scale.set((0.95-i*0.25)*s,(1.25-i*0.25)*s,1);
    f.position.x=(i?0.04:-0.03)*s; f.renderOrder=3; f.frustumCulled=false; g.add(f);
  });
  if(opt.glow!==false){                               // 바닥 잉걸불 번짐 — 눈앞의 횃불엔 안 단다(화면을 덮는다)
    const gl=new THREE.Mesh(new THREE.PlaneGeometry(1,1),M.glow);
    gl.scale.set(1.8*s,1.1*s,1); gl.position.y=0.18*s; gl.renderOrder=2; gl.frustumCulled=false; g.add(gl);
  }
  if(opt.smoke!==false){
    const sm=new THREE.Mesh(plane,M.smoke); sm.scale.set(1.3*s,2.6*s,1); sm.position.y=0.9*s;
    sm.renderOrder=1; sm.frustumCulled=false; g.add(sm);
  }
  if(opt.sparks!==false){
    const N=36, pos=new Float32Array(N*3), sd=new Float32Array(N);
    for(let i=0;i<N;i++){ const a=Math.random()*6.283, r=Math.random()*0.18;   // 크기는 pts.scale 이 준다
      pos[i*3]=Math.cos(a)*r; pos[i*3+1]=0.15; pos[i*3+2]=Math.sin(a)*r; sd[i]=Math.random(); }
    const pg=new THREE.BufferGeometry();
    pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    pg.setAttribute('aSeed',new THREE.BufferAttribute(sd,1));
    const pts=new THREE.Points(pg,M.sparks); pts.scale.setScalar(s); pts.frustumCulled=false; pts.renderOrder=4;
    g.add(pts);
  }
  g.userData.lightRole='none';
  return g;
}
// 좌표를 직접 받는 형태 — 저장 복원에서 그대로 쓴다
/* 모닥불의 재질 — 예전엔 돌도 땔감도 민무늬 한 색이었다(사용자 지적: 모닥불 텍스처가 없다).
   돌은 바위 사진의 결(땅 사진 4번 층), 땔감은 캔버스에 그린 나무껍질과 나이테, 바닥은 잿빛 재. 한 번 만들어 모든 모닥불이 나눠 쓴다 */
let _hearthM=null;
function hearthMats(){
  if(_hearthM) return _hearthM;
  const tex=(draw)=>{ const c=document.createElement('canvas'); c.width=c.height=64; draw(c.getContext('2d'));
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; };
  const rn=mulberry32(0x4ea27);
  const bark=tex(g=>{ g.fillStyle='#5a4532'; g.fillRect(0,0,64,64);
    for(let i=0;i<60;i++){ g.fillStyle=rn()<0.55?'rgba(30,20,12,'+(0.25+rn()*0.35)+')':'rgba(150,120,90,'+(0.12+rn()*0.2)+')';
      g.fillRect(rn()*64,rn()*64,1+rn()*2.5,10+rn()*40); } });
  const end=tex(g=>{ g.fillStyle='#b89a6c'; g.fillRect(0,0,64,64);
    for(let r=28;r>2;r-=4){ g.strokeStyle='rgba(90,62,36,'+(0.35+rn()*0.3)+')'; g.lineWidth=1.2; g.beginPath(); g.arc(32+rn()*2,32+rn()*2,r,0,6.283); g.stroke(); }
    g.strokeStyle='rgba(60,40,24,.6)'; g.beginPath(); g.moveTo(32,32); g.lineTo(32+rn()*26,6); g.stroke(); });
  const ash=tex(g=>{ g.fillStyle='#3a3836'; g.fillRect(0,0,64,64);
    for(let i=0;i<260;i++){ const v=(20+rn()*150)|0; g.fillStyle='rgba('+v+','+v+','+(v-4)+','+(0.25+rn()*0.4)+')'; g.fillRect(rn()*64,rn()*64,1+rn()*3,1+rn()*3); } });
  const stone=gndDetailPatch(new THREE.MeshLambertMaterial({color:0x8a857c}),4,0.45);
  _hearthM={stone, bark:new THREE.MeshLambertMaterial({map:bark}), end:new THREE.MeshLambertMaterial({map:end}),
            ash:new THREE.MeshLambertMaterial({map:ash})};
  return _hearthM;
}
function placeCampfireAt(x,y,z){

  const g=new THREE.Group(), HM=hearthMats();
  for(let i=0;i<9;i++){                       // 돌을 둘러 바람막이 — 하나하나 다른 모양(둥글게 닳은 돌 · 바위 사진의 결)
    const a=i/9*Math.PI*2+Math.random()*0.2;
    const st=new THREE.Mesh(SHP.blob(0.19,(Math.random()*1e6)|0,{w:9,h:6,amp:0.28,sy:0.8}),HM.stone);
    st.position.set(Math.cos(a)*0.62,0.10,Math.sin(a)*0.62);
    st.rotation.set(Math.random()*0.5,Math.random()*6.283,Math.random()*0.5);
    st.scale.set(0.85+Math.random()*0.5,0.75+Math.random()*0.4,0.85+Math.random()*0.5);
    g.add(st);
  }
  { const ash=new THREE.Mesh(new THREE.CircleGeometry(0.56,18),HM.ash);     // 재가 깔린 바닥
    ash.rotation.x=-Math.PI/2; ash.position.y=0.03; g.add(ash); }
  for(let i=0;i<5;i++){                       // 땔감 더미 — 껍질 결이 있는 통나무 · 자른 면엔 나이테
    const a=i/5*Math.PI+0.4;
    const w=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.07,0.95,9),[HM.bark,HM.end,HM.end]);
    w.position.set(Math.cos(a)*0.1,0.21,Math.sin(a)*0.1);
    w.rotation.set(Math.PI/2.6,a,0);
    g.add(w);
  }
  const flame=makeFire(1.35); flame.position.y=0.10;
  flame.visible=false; g.add(flame);
  const light=LIGHT.addFire(g,{color:0xff7a2a,intensity:0,dist:22,shadow:true,pos:[0,0.6,0]});   // 불빛 풀(40-light.js) — 주황
  light.visible=false;

  g.position.set(x,y,z); scene.add(g);
  const fire={kind:'fire', cname:'모닥불', cap:40, slotCap:10, slots:[],
    x,y,z,lit:false,fuel:0,cook:{},mesh:g,flame,light,t:Math.random()*10};
  FIRES.push(fire);
  COLLIDERS.push({x,z,y0:y-0.1,y1:y+1.8,r:0.75}); buildColliderGrid();
  return fire;
}

/* 횃불·등잔을 손에서 켜고 끈다(들고 좌클릭).
   예전엔 **타는 모닥불을 보고 길게 눌러야만** 불이 붙었다 — 만들어 들어도 아무 일도 없고 좌클릭해도
   반응이 없어, 횃불이 고장 난 것으로 보였다. 이제 손에서 바로 붙인다. 불씨는 이 순서로 찾는다:
   ① 3.5 m 안의 타는 모닥불·제련로(값 없이) ② 긴 라이터(내구 1) ③ 활비비 + 부싯깃(부싯깃 1 · 내구 1 · 기력 12).
   타는 것을 다시 누르면 끈다 — 남은 연료는 그대로 남는다. */
function toggleTorch(e){
  const T=ITEMS[e.id];
  if(e.lit){ e.lit=false; toast(T.n+'을 껐다 — 남은 연료 '+fmtFuel(e.fuel)); sfx('bind'); invDirty=true; return; }
  if(!(e.fuel>0)){ toast(T.n+' — 다 타서 더는 붙지 않는다'); return; }
  if(PL.swim){ toast('물속에서는 불을 붙일 수 없다'); return; }
  const light=msg=>{ e.lit=true; toast(msg); sfx('ignite'); invDirty=true; };
  const near=l=>l.some(f=>f.lit&&Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z)<3.5);
  if(near(FIRES)||near(FURNACES)){ light('곁의 불에서 '+T.n+'에 불을 붙였다'); return; }
  const use=sl=>{ sl.dur-=1; if(sl.dur<=0){ toast(ITEMS[sl.id].n+' 파손'); invRemove(INV.slots.indexOf(sl),1); } };
  const fireOf=sl=>(ITEMS[sl.id]&&(ITEMS[sl.id].tool||{}).fire)||0;
  const lighter=INV.slots.find(sl=>fireOf(sl)>=2);
  if(lighter){ use(lighter); light('라이터로 '+T.n+'에 불을 붙였다'); return; }
  const drill=INV.slots.find(sl=>fireOf(sl)>0);
  if(drill){
    const ti=INV.slots.findIndex(sl=>sl.id==='tinder');
    if(ti<0){ toast('부싯깃이 없다 — 활비비로 불씨를 받으려면 부싯깃이 하나 든다'); return; }
    if(PL.stam<12){ toast('기력이 모자라다 — 활비비질은 힘이 든다'); return; }
    PL.stam=clamp(PL.stam-12,0,100);
    invRemove(ti,1); use(drill);
    light('활비비로 불씨를 내어 '+T.n+'에 불을 붙였다'); return;
  }
  toast('불씨가 없다 — 활비비+부싯깃이나 긴 라이터를 지니거나, 타는 모닥불 곁에서 좌클릭한다');
}
// 들고 있는 횃불이 타는 중인가
function litTorch(){
  const e=equippedTool();
  return (e && (ITEMS[e.id].tool||{}).torch && e.lit && e.fuel>0) ? e : null;
}
/* ── 전등 ────────────────────────────────────────────────────────────────
   횃불과 같은 자리에 서지만 규칙이 다르다. 불씨가 필요 없고, 바람에 안 꺼지고,
   비에 안 죽고, 무엇을 달구지도 못한다. 대신 전기가 닳으면 그냥 꺼진다.
   전기는 발전기에서만 나온다 — 축전지는 그 전기를 들고 나가는 통이다. */
function heldLamp(){
  const e=equippedTool();
  return (e && (ITEMS[e.id].tool||{}).lamp) ? e : null;
}
function litLamp(){
  const e=heldLamp();
  return (e && e.lit && e.dur>0) ? e : null;
}
/* 전등을 켜고 끈다. 비었으면 지닌 축전지에서 옮겨 담는다 — 그래서 축전지를
   들고 다니는 값이 생긴다(발전기는 하천에 박혀 있어 따라오지 못한다). */
function toggleLamp(){
  const e=heldLamp();
  if(!e){ toast('전등을 손에 들어야 한다'); return; }
  if(e.lit){ e.lit=false; toast('전등을 껐다'); invDirty=true; return; }
  if(e.dur<=0){
    toast('전기가 없다 — 우클릭으로 축전지에서 채운다'); return;
  }
  e.lit=true; toast('전등을 켰다'); sfx('bind'); invDirty=true;
}
/* 지닌 축전지에서 전등으로 옮겨 담는다. 가장 많이 남은 것부터 쓴다. */
function drawFromBattery(e){
  const T=ITEMS[e.id], want=T.durMax-e.dur;
  if(want<=0) return false;
  const bs=INV.slots.filter(x=>ITEMS[x.id]&&ITEMS[x.id].cell&&x.dur>0)
                    .sort((a,b)=>b.dur-a.dur);
  if(!bs.length) return false;
  let got=0;
  for(const b of bs){
    const take=Math.min(b.dur, want-got);
    b.dur-=take; got+=take;
    if(got>=want) break;
  }
  e.dur+=got; invDirty=true;
  toast('축전지에서 전기를 옮겨 담았다 ('+Math.round(e.dur)+' / '+T.durMax+')');
  return got>0;
}
/* 발전기 곁에서 E — 지닌 축전지와 전등을 한꺼번에 채운다 */
function chargeAtDynamo(){
  if(!powered()){ toast('발전기를 돌리는 것이 없다 — 물레방아나 불 땐 증기기관'); return; }
  let n=0;
  for(const sl of INV.slots){
    const T=ITEMS[sl.id];
    if(!T||!T.durMax) continue;
    if(!T.cell && !(T.tool&&(T.tool.lamp||T.tool.drill))) continue;
    if(sl.dur>=T.durMax) continue;
    sl.dur=T.durMax; n++;
  }
  if(!n){ toast('채울 것이 없다 — 축전지나 전등을 지녀야 한다'); return; }
  toast(n+'개를 가득 채웠다'); sfx('bind'); invDirty=true;
}
let lampT=0;
function updateLamp(dt,dh){
  const on=litLamp();
  const e=heldLamp();
  if(on){
    on.dur=Math.max(0,on.dur-dh*LAMP_DRAIN);
    if(on.dur<=0){
      on.lit=false;
      toast('전등이 꺼졌다 — 전기가 다했다');
      invDirty=true;
    }else{ const pc=Math.round(on.dur*10); if(pc!==on._pc){ on._pc=pc; invDirty=true; } }   // 매 프레임 다시 그리지 않게(횃불과 같다)
  }else if(e&&e.lit&&e.dur<=0) e.lit=false;
  lampT+=dt;
  const show=!!litLamp();
  flash.intensity=show?3.4:0;   // decay 2 로 바뀐 몫(×1.8)
}
const LAMP_DRAIN=4.0;          // 게임시간 한 시간에 닳는 전기. 40 이면 10시간.
let torchLight=null, torchFlame=null, torchT=0; const _tipV=new THREE.Vector3();
function initTorchFx(){
  /* 횃불은 카메라에 붙어 있다 — 광원과 눈이 같은 자리라 제 그림자가 화면에
     나타나지 않는다. 여섯 면을 그려 봐야 버리는 셈이라 예산에 안 넣는다. */
  torchLight=LIGHT.addPoint(camera,{color:0xff9040,intensity:0,dist:26,pos:[0.42,-0.28,-0.5]});
  /* 늘 켜 두고 세기로 끈다 — visible 을 껐다 켜면 점광원 수가 바뀌어 횃불을 들고 놓을 때마다 모든 재질의
     셰이더를 다시 짰다(멈칫). 세기 0 이면 화면은 끈 것과 같다 */
  torchFlame=new THREE.Group();
  const c1=makeFire(0.20,{smoke:false,glow:false});        // 모닥불과 같은 불 — 작게
  c1.position.y=-0.02;
  const c2=new THREE.Object3D();
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.02,0.42,4),
    new THREE.MeshLambertMaterial({color:0x4a3a29}));
  stick.position.y=-0.2;
  torchFlame.add(c1); torchFlame.add(c2); torchFlame.add(stick);
  torchFlame.position.set(0.36,-0.34,-0.55);
  torchFlame.visible=false; camera.add(torchFlame);
}
function updateTorch(dt,dh){
  const e=equippedTool();
  const on=litTorch();
  if(on){
    on.fuel-=dh;
    if(on.fuel<=0){
      toast(ITEMS[on.id].n+'이 다 탔다');
      invRemove(INV.slots.indexOf(on),1); EQUIP=null;
      invDirty=true;
    }else{
      /* 예전엔 타는 동안 **매 프레임** invDirty 를 세워 소지품 창을 초당 60번 새로 그렸다 — 그 사이엔 항목이
         계속 갈아 끼워져 끌어 놓기도 누르기도 먹지 않았다. 창에 보이는 %가 바뀔 때만 다시 그린다 */
      const pc=Math.round(on.fuel/ITEMS[on.id].burn*100);
      if(pc!==on._pc){ on._pc=pc; invDirty=true; }
    }
  }
  const show=!!litTorch();
  torchT+=dt;
  if(!show) torchLight.intensity=0;                // 끌 때는 세기로(위 initTorchFx)
  torchFlame.visible=show;
  // 불꽃은 손에 든 횃불·등잔 끝(tip)에 앉는다 — 제 막대는 숨긴다(손의 것이 보인다)
  const tip=weaponFx&&weaponFx.userData.tip;
  torchFlame.children[2].visible=!tip;          // [2] 는 막대(손의 횃불이 없을 때만)
  if(show&&tip){ tip.getWorldPosition(_tipV); camera.worldToLocal(_tipV); torchFlame.position.copy(_tipV);
    torchFlame.userData.s=weaponFx.userData.tipScale; }
  else torchFlame.userData.s=1;
  if(show){
    const fl=0.8+Math.sin(torchT*15.3)*0.13+Math.sin(torchT*8.7)*0.09;
    torchLight.intensity=3.6*fl;
    const ts=torchFlame.userData.s||1; torchFlame.scale.set(ts,fl*ts,ts);
    torchFlame.rotation.z=Math.sin(torchT*6.1)*0.09;
  }
}

// 바다 파도는 이제 셰이더가 흔든다(`waterMat`) — 여기선 시각만 넘긴다
function updateOcean(t){ WATER_U.uTime.value=t; if(TERR_U.uShT) TERR_U.uShT.value=t; }   // 물가 거품(땅 셰이더)도 같은 시계를 쓴다

/* 물레방아는 유량에 비례해 돌고, 전기가 들어온 아크로는 푸르게 번쩍인다 */
let arcT=0;
function updatePower(dt){
  // 유량이 적은 개울에서도 돌기는 돈다 — 다만 느리다
  const th=WHEEL_REF();
  for(const w of WHEELS){ w.rim.rotation.x+=dt*clamp(w.flow/th,0.35,2.2)*0.9; LIGHT.dirtyAt(w.x,w.z,3); }   // 도는 바퀴 그림자
  const on=powered();
  arcT+=dt;
  for(const a of ARCS){
    const live=on&&DYNAMOS.some(d=>Math.hypot(d.x-a.x,d.z-a.z)<12);
    const f=live?(0.55+Math.abs(Math.sin(arcT*17))*0.45+Math.sin(arcT*53)*0.25):0;
    a.light.intensity=clamp(f*4.7,0,5.4);
    a.glow.scale.setScalar(live?clamp(f,0.2,1.6):0.001);
  }
}

/* 모닥불 안에 든 것 중 구울 수 있는 첫 항목 */
/* 안에 든 것 중 구울 수 있는 것을 전부 모은다 — 한 가지씩 차례로가 아니라
   들어 있는 것이 저마다 제 속도로 함께 익는다. */
function fireJobs(f){
  const out=[];
  for(const sl of f.slots) if(FIRING[sl.id] && out.indexOf(sl.id)<0) out.push(sl.id);
  return out;
}
const fireJob=f=>fireJobs(f)[0]||null;          // 한 줄 요약에 쓰는 대표 작업
/* 제련로 안의 재료로 지금 돌릴 수 있는 제련을 전부 모은다.
   재료를 나눠 쓰는 제련이 함께 걸릴 수 있다 — 먼저 끝나는 쪽이 먼저 가져간다. */
function furnaceJobs(g){
  return SMELT.filter(R=>
    R.in.every(r=>contCount(g,r.id)>=r.n) &&
    (!R.need || R.need.every(r=>contCount(g,r.id)>=r.n)));
}
const furnaceJob=g=>furnaceJobs(g)[0]||null;
/* 제련로 — 재료가 들어 있는 동안 저 혼자 돌아간다. 도가니와 송풍관은 닳지 않는다. */
function updateFurnaces(dt,dh){
  for(const g of FURNACES){
    if(!g.jobs) g.jobs={};
    /* 불이 붙어 있는 동안에만 녹는다. 꺼지면 제자리에 멈춰 서고,
       다시 붙이면 녹던 데서 이어진다 — 모닥불의 굽기와 같은 규칙이다. */
    if(g.lit && dh>0 && !fireRain(g,dh,0.01) && burnFuel(g,dh)){
      const live=furnaceJobs(g);
      for(const R of live){
        g.jobs[R.id]=(g.jobs[R.id]||0)+dh;
        while(g.jobs[R.id]>=R.hours
              && R.in.every(r=>contCount(g,r.id)>=r.n)
              && (!R.need||R.need.every(r=>contCount(g,r.id)>=r.n))){
          g.jobs[R.id]-=R.hours;
          for(const r of R.in) contTake(g,r.id,r.n);
          contAdd(g,R.out.id,R.out.n);
          if(R.back) for(const r of R.back) contAdd(g,r.id,r.n);   // 비운 그릇 되돌려주기
          if(Math.hypot(g.x-PL.pos.x,g.z-PL.pos.z)<28)
            toast(ITEMS[R.out.id].n+' ×'+R.out.n+' 제련 완료');
        }
      }
      // 재료가 떨어진 제련은 진척을 지운다
      for(const k of Object.keys(g.jobs))
        if(!live.some(R=>R.id===k)) delete g.jobs[k];
    }
    g.glow.visible=g.lit; g.light.visible=g.lit;
    if(g.lit){
      const fl=0.7+Math.sin(gameHours*260)*0.2+Math.sin(gameHours*97)*0.1;
      g.light.intensity=clamp(1.6*fl*clamp(g.fuel/0.3,0.4,1),0.36,2.9);
    }
  }
}
function updateFires(dt,dh){
  FIRE_U.uTime.value+=dt;                     // 불꽃 셰이더의 시계 — 모든 불이 나눠 쓴다
  for(const f of FIRES){
    /* 소성: 불이 붙어 있는 동안에만 진행한다. 꺼지면 그 자리에서 멈춘다.
       안에 든 구울 것은 전부 함께 익는다 — 고기와 그릇을 같이 넣어도
       한쪽이 끝나기를 기다리지 않는다. */
    if(!f.cook) f.cook={};
    const jobs=fireJobs(f);
    if(f.lit && dh>0){
      for(const job of jobs){
        const R=FIRING[job];
        f.cook[job]=(f.cook[job]||0)+dh*((f.kilnU||f.hearthU)?2:1);   // 화덕·가마는 두 배 빠르다
        while(f.cook[job]>=R.hours && contCount(f,job)>0){
          f.cook[job]-=R.hours;
          contTake(f,job,1);
          contAdd(f,R.out,R.count||1);
          if(Math.hypot(f.x-PL.pos.x,f.z-PL.pos.z)<28)
            toast(ITEMS[R.out].n+' 하나가 다 구워졌다');
        }
      }
    }
    for(const k of Object.keys(f.cook))       // 다 꺼내 간 것은 진척을 지운다
      if(jobs.indexOf(k)<0) delete f.cook[k];
    if(!f.lit) continue;
    if(fireRain(f,dh,f.kilnU?0.02:f.hearthU?0.10:0.60)) continue;   // 비 — 한데 있는 불은 꺼질 수 있다(66-decay.js)
    // 안에 든 땔감을 알아서 끌어다 문다 — 넣어두기만 하면 계속 탄다
    if(!burnFuel(f,dh)) continue;
    f.t+=dt;
    // 불꽃 흔들림 — 연료가 적으면 사그라든다
    const low=clamp(f.fuel/0.2,0.35,1);
    const flick=0.78+Math.sin(f.t*13.7)*0.12+Math.sin(f.t*7.1)*0.10;
    f.light.intensity=4.1*flick*low;
    f.flame.scale.set(0.8+0.2*low,flick*low,0.8+0.2*low);
    if(f.steam){ f.wheel.rotation.z-=dt*4.2; f.rod.position.x=1.3+Math.sin(f.wheel.rotation.z)*0.12; }
  }
  // 화입법 — 모닥불 4 m 안의 화강암 노두가 달궈진다
  if(dh<=0) return;
  const heat=(p,amt)=>{
    if(p.k!=='granite'||p.cracked||p.ore<=0) return;
    p.heat=(p.heat||0)+amt;
    if(p.heat>=MINE.granite.fireset){
      p.cracked=true;
      if(Math.hypot(p.x-PL.pos.x,p.z-PL.pos.z)<25) toast('화강암에 균열이 갔다');
    }
  };
  for(const f of FIRES){
    if(!f.lit) continue;
    eachNearProp(f.x,f.z,p=>{
      if(Math.hypot(p.x-f.x,p.z-f.z)<=4) heat(p,dh);
    });
  }
  // 들고 있는 횃불로도 달굴 수 있다. 화력이 약해 모닥불의 60% 속도.
  if(litTorch()){
    eachNearProp(PL.pos.x,PL.pos.z,p=>{
      if(Math.hypot(p.x-PL.pos.x,p.z-PL.pos.z)<=3) heat(p,dh*0.6);
    });
  }
}
