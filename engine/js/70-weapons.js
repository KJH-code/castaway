/* 70-weapons.js — CASTAWAY
   무기 — 근접 공격 판정 · 손에 든 것의 모형(WEAPON_FX: 창·검·도끼·작살·횃불 …)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ============================================================================
   12-c) 근접 공격
   ----------------------------------------------------------------------------
   실험체가 아직 없으므로 CREATURES 는 비어 있다. 명중 판정과 피해 전달만
   먼저 세워두고, 나중에 개체를 이 배열에 넣으면 그대로 동작한다.
   ========================================================================== */
const CREATURES=[];
const ATK={t:0, cd:0, swing:0, swingMax:0.30, flash:0};

/* ============================================================================
   손에 든 무기
   ----------------------------------------------------------------------------
   무기마다 모양과 휘두르는 결이 다르다. 부품은 전부 국소 +Y 축에 세워 만들고
   다 만든 뒤 통째로 눕힌다 — 부품마다 각도를 따로 주면 자루와 날이 어긋난다.
   ========================================================================== */
let weaponFx=null, weaponFxId=null;
const WEAPON_HOME=new THREE.Vector3(0.32,-0.30,-0.60);
/* 손에 든 것의 재질 — 퐁으로 반사광을 준다. 빛깔이 무채색에 가까울수록(쇠·뼈·키틴)
   반들거리고, 나무·가죽·풀처럼 빛깔이 짙을수록 무르게 번진다. 같은 색은 한 재질을 나눠 쓴다. */
const _WM={};
const WMAT=c=>{
  if(_WM[c]) return _WM[c];
  const r=(c>>16&255)/255, g=(c>>8&255)/255, b=(c&255)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), sat=mx>0?(mx-mn)/mx:0;
  const metal=sat<0.10?1:(sat<0.22?0.4:0.06);
  return _WM[c]=new THREE.MeshPhongMaterial({color:c,
    specular:new THREE.Color(0.55*metal+0.04,0.55*metal+0.04,0.55*metal+0.04),
    shininess:metal>0.5?60:(metal>0.2?24:8)});
};
const WBASIC=c=>new THREE.MeshBasicMaterial({color:c});
const W_WOOD=0x6b5a3c, W_CORD=0xa89a68;
function haft(len,r0,r1,col){                // 자루 — 밑동이 원점에 오도록 세운다
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,len,6),WMAT(col||W_WOOD));
  m.position.y=len/2; return m;
}
function wbind(y,r){                         // 날을 묶은 노끈
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.09,6),WMAT(W_CORD));
  m.position.y=y; return m;
}
/* 활 — 가로로 휜 활대(원호) · 시위 · 메긴 화살. 덧댄 활은 활대 배에 뼈판을 붙인다 */
/* 도끼 — kind: pebble(돌멩이를 얹어 묶음) · polish(갈아 낸 돌날) · metal(주조·단조 날, 자루 구멍) */
function axeMesh(L,kind,col,wood,wrap){
  const g=new THREE.Group();
  g.add(haft(L,0.019,0.024,wood));
  if(kind==='metal'){
    const sh=new THREE.Shape();                     // 자루에서 넓게 퍼지는 날의 윤곽
    sh.moveTo(0,-0.035); sh.lineTo(0.07,-0.055); sh.quadraticCurveTo(0.125,0,0.07,0.055);
    sh.lineTo(0,0.035); sh.lineTo(0,-0.035);
    const bl=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.014,bevelEnabled:true,
      bevelThickness:0.004,bevelSize:0.004,bevelSegments:1,curveSegments:8}),WMAT(col));
    bl.scale.set(1.45,1.45,1); bl.position.set(0.018,L-0.05,-0.007); g.add(bl);   // 날을 크게 — 손에서 작아 보였다
    const eye=new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.030,0.08,8),WMAT(col));
    eye.position.y=L-0.05; g.add(eye);
    const poll=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.05,0.032),WMAT(col));
    poll.position.set(-0.035,L-0.05,0); g.add(poll);
    g.add(wbindC(0.10,0.028,wrap)); g.add(wbindC(0.20,0.028,wrap));   // 손잡이 감개
  }else{
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(0.06,kind==='polish'?1:0),WMAT(col));
    m.scale.set(kind==='polish'?1.5:1.2,0.8,0.55); m.position.set(0.05,L-0.06,0); g.add(m);
    g.add(wbindC(L-0.10,0.030,wrap)); g.add(wbindC(L-0.02,0.030,wrap));
  }
  return {mesh:g, grip:0.10};
}
/* 곡괭이 — 자루 끝에 가로로 뾰족한 머리. 돌은 한쪽만, 쇠는 양쪽으로 뻗는다 */
function pickMesh(L,kind,col,wood){
  const g=new THREE.Group();
  g.add(haft(L,0.019,0.024,wood));
  if(kind==='metal'||kind==='polish'){
    for(const sd of [-1,1]){
      const c=new THREE.Mesh(new THREE.ConeGeometry(0.022,kind==='metal'?0.20:0.14,6),WMAT(col));
      c.rotation.z=-sd*(Math.PI/2+0.25); c.position.set(sd*(kind==='metal'?0.10:0.07),L-0.03,0); g.add(c);
    }
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.06,0.045),WMAT(col));
    eye.position.y=L-0.04; g.add(eye);
  }else{
    const c=new THREE.Mesh(new THREE.ConeGeometry(0.035,0.16,5),WMAT(col));
    c.rotation.z=-(Math.PI/2+0.2); c.position.set(0.07,L-0.04,0); g.add(c);
    g.add(wbind(L-0.07,0.030)); g.add(wbind(L-0.01,0.030));
  }
  return {mesh:g, grip:0.10};
}
/* 그물 — 막대에 둘둘 말아 걸친 그물 뭉치. 그물코는 철사틀(wireframe)로 보인다 */
function netMesh(col){
  const g=new THREE.Group();
  g.add(haft(0.40,0.014,0.017));
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),
    new THREE.MeshLambertMaterial({color:col,wireframe:true}));
  b.scale.set(1.2,0.8,0.9); b.position.set(0.02,0.40,0); g.add(b);
  const b2=new THREE.Mesh(new THREE.SphereGeometry(0.075,7,6),
    new THREE.MeshLambertMaterial({color:col,wireframe:true}));
  b2.position.set(0.07,0.30,0.02); g.add(b2);
  return {mesh:g, grip:0.12, rest:{rx:-0.35, rz:0.30}};
}
/* 잿불 비늘 감싸기 — 강철 무기 r(WEAPON_FX 결과)의 쇠 재질 메시를 비늘로 덮는다(skip(m) 이 참이면 둔다).
   ① 덮을 메시는 검은 바탕 재질로 바꾼다 — 비늘 사이로 쇳빛이 비치지 않게.
   ② **비늘은 줄을 맞춰 단다** — 겉을 넓이에 비례해 촘촘히 훑은 점을 면 방향(법선을 끊은 것)마다 모아, 그 면의
      (가로, 세로) 좌표 격자(칸 `EMB.cw` × 줄 `EMB.rh` · 홀수 줄은 반 칸 밀림)에 넣고 칸마다 칸 가운데에 가장
      가까운 점 하나에 세운다. 처음엔 점을 무작위로 솎아 1.1 cm 비늘 수천 장을 뿌렸더니 주황 털처럼 보였다.
   ③ 비늘은 면 법선으로 눕히고 뾰족한 끝이 손잡이 쪽(−y)을 보게 세운 뒤 끝을 조금 젖힌다 — 물고기 비늘처럼
      윗줄이 아랫줄 머리를 덮는다(비늘 키가 줄 간격의 1.7배). 법선이 y 와 나란한 면(머리 윗면)은 x 쪽을 아래로 친다.
   ④ 같은 꼴을 조금 크게 바로 뒤에 깐 테(달아오른 주황)가 비늘 가장자리에만 가늘게 보인다 — 자체 발광이라 광원이 안 는다.
   비늘은 인스턴스 둘(비늘 · 테)이라 그리기 호출은 둘뿐이다. 자리는 고정 씨앗 난수라 늘 같은 생김새다. */
const EMB={w:0.0165, h:0.044, cw:0.027, rh:0.025};
function emberClad(r,skip){
  const g=r.mesh;
  const steel=new Set([0x6b7077,0xc8ced4,0x74797f].map(c=>WMAT(c)));
  const base=_WM.emberBase||(_WM.emberBase=new THREE.MeshPhongMaterial({color:0x140e0c,shininess:8,specular:0x111111}));
  const scM=_WM.emberScale||(_WM.emberScale=new THREE.MeshPhongMaterial({color:0x1c1512,
    specular:0x4a3528, shininess:40, emissive:0x160502, side:THREE.DoubleSide}));
  const rimM=_WM.emberRim||(_WM.emberRim=new THREE.MeshBasicMaterial({color:0xff5414, side:THREE.DoubleSide}));
  let rnd=0x9e3779b9; const rand=()=>((rnd=(rnd*1664525+1013904223)>>>0)/4294967296);
  const basis=(z,X,Y)=>{                                   // 면 법선 z → 가로 X · 세로 Y(손잡이 반대쪽이 +)
    Y.set(0,1,0).addScaledVector(z,-z.y);
    if(Y.lengthSq()<0.04) Y.set(1,0,0).addScaledVector(z,-z.x);
    Y.normalize(); X.crossVectors(Y,z);
  };
  const cells=new Map();                                   // 열쇠 → {d 칸 가운데까지 거리², p, n}
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), e1=new THREE.Vector3(), e2=new THREE.Vector3(),
        n=new THREE.Vector3(), q=new THREE.Vector3(), X=new THREE.Vector3(), Y=new THREE.Vector3(), p=new THREE.Vector3();
  const per=24/(EMB.cw*EMB.rh);                            // 칸마다 후보 점 24개쯤
  for(const m of g.children.slice()){
    if(!m.isMesh||!steel.has(m.material)||(skip&&skip(m))) continue;
    m.material=base; m.updateMatrix();
    const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
    geo.applyMatrix4(m.matrix);
    const pa=geo.attributes.position;
    for(let t=0;t<pa.count;t+=3){
      a.fromBufferAttribute(pa,t); b.fromBufferAttribute(pa,t+1); c.fromBufferAttribute(pa,t+2);
      e1.subVectors(b,a); e2.subVectors(c,a); n.crossVectors(e1,e2);
      const A=n.length()/2; if(A<1e-9) continue; n.normalize();
      // 면 방향 — 법선을 끊어(1/3 칸) 같은 쪽을 보는 면끼리 한 격자를 쓴다
      const qx=Math.round(n.x*3), qy=Math.round(n.y*3), qz=Math.round(n.z*3);
      q.set(qx,qy,qz).normalize(); basis(q,X,Y);
      const k=A*per, cnt=Math.max(1,Math.floor(k)+(rand()<k%1?1:0));
      for(let s=0;s<cnt;s++){ let u=rand(), v=rand(); if(u+v>1){ u=1-u; v=1-v; }
        p.copy(a).addScaledVector(e1,u).addScaledVector(e2,v);
        const cu=p.dot(X), cv=p.dot(Y), row=Math.round(cv/EMB.rh), sh=(row&1)*0.5;
        const col=Math.round(cu/EMB.cw-sh), du=cu-(col+sh)*EMB.cw, dv=cv-row*EMB.rh, dd=du*du+dv*dv;
        const key=qx+','+qy+','+qz+':'+row+','+col, o=cells.get(key);
        if(!o) cells.set(key,{d:dd, p:p.toArray(), n:n.toArray()});
        else if(dd<o.d){ o.d=dd; o.p=p.toArray(); o.n=n.toArray(); }
      }
    }
    geo.dispose();
  }
  // 비늘 한 장 — 둥근 머리가 +y, 뾰족한 끝이 −y, 앞이 +z
  const w=EMB.w, h=EMB.h, sh=new THREE.Shape();
  sh.moveTo(0,-h*0.5);
  sh.quadraticCurveTo(w*1.05,-h*0.15, w,h*0.22);
  sh.quadraticCurveTo(w*0.8,h*0.5, 0,h*0.5);
  sh.quadraticCurveTo(-w*0.8,h*0.5, -w,h*0.22);
  sh.quadraticCurveTo(-w*1.05,-h*0.15, 0,-h*0.5);
  const scG=new THREE.ShapeGeometry(sh,2);
  const rimG=new THREE.ShapeGeometry(sh,2); rimG.scale(1.09,1.06,1); rimG.translate(0,-h*0.02,-0.0008);
  const L=[...cells.values()];
  const sc=new THREE.InstancedMesh(scG,scM,L.length), rim=new THREE.InstancedMesh(rimG,rimM,L.length);
  const M=new THREE.Matrix4(), Z=new THREE.Vector3(), T=new THREE.Matrix4();
  L.forEach((o,i)=>{
    Z.fromArray(o.n); basis(Z,X,Y);
    M.makeBasis(X,Y,Z);
    M.multiply(T.makeRotationX(0.16+rand()*0.06));        // 끝(−y)을 바깥(+z)으로 젖힌다
    M.multiply(T.makeRotationZ((rand()-0.5)*0.08));
    M.setPosition(o.p[0]+Z.x*0.002, o.p[1]+Z.y*0.002, o.p[2]+Z.z*0.002);
    sc.setMatrixAt(i,M); rim.setMatrixAt(i,M);
  });
  g.add(rim); g.add(sc);
  return r;
}
function wbindC(y,r,col){ const m=wbind(y,r); m.material=WMAT(col||W_CORD); return m; }
function bowMesh(col,plate){
  /* 활대 — 반지름 R 원의 A 라디안 원호. 가운데(손잡이)가 앞(+Y)으로 불룩하고 두 끝은 뒤로 온다 */
  const g=new THREE.Group(), R=0.62, A=1.9, top=0.30, c=top-R;
  const ye=c+R*Math.cos(A/2), xe=R*Math.sin(A/2);      // 활대 두 끝의 자리
  const limb=new THREE.Mesh(new THREE.TorusGeometry(R,0.018,6,20,A),WMAT(col));
  limb.rotation.z=Math.PI/2-A/2; limb.position.y=c; g.add(limb);
  if(plate){                                            // 배에 댄 뼈판 — 손잡이 둘레
    const B=A*0.6;
    const pl=new THREE.Mesh(new THREE.TorusGeometry(R-0.018,0.013,5,14,B),WMAT(plate));
    pl.rotation.z=Math.PI/2-B/2; pl.position.y=c; g.add(pl);
  }
  const str=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,xe*2,4),WMAT(0xd8d0b8));
  str.rotation.z=Math.PI/2; str.position.y=ye; g.add(str);   // 시위
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.78,5),WMAT(W_WOOD));
  shaft.position.y=ye+0.39; g.add(shaft);                     // 메긴 화살
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.018,0.06,4),WMAT(0x7c7466));
  head.position.y=ye+0.81; g.add(head);
  return {mesh:g, grip:top};
}
/* 무기 하나를 만든다. grip 은 자루의 어디를 쥐는가(국소 y). */
const WEAPON_FX={
  /* 활 — 몸체는 +Y(쏘는 쪽)에 화살, 활대는 그에 가로로 휜다. 총처럼 앞으로 겨눈다 */
  bow_wood(){ return bowMesh(0x7a5a36, null); },
  bow_bone(){ return bowMesh(0x6b5442, 0xd8d0b4); },

  /* ── 도구 — 들고 있으면 보인다 ─────────────────────────────────────────
     도끼·곡괭이는 무기처럼 앞으로 겨누고(캘 때 내리친다), 불·등불·그물 같은 것은
     rest 로 세워 든다. tip 이 있으면 그 자리에 불꽃이 선다(updateTorch). */
  drill(){                                   // 전동 드릴 — 권총 손잡이 · 전동기 몸통 · 척 · 나선 날끝
    const g=new THREE.Group();
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.13,0.06),WMAT(0x2e3134)); grip.position.y=0.06; g.add(grip);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.20,12),WMAT(0x5a5f66));
    body.position.set(0,0.19,0.035); g.add(body);
    for(const y of [0.13,0.17,0.21]){ const v=new THREE.Mesh(new THREE.TorusGeometry(0.046,0.006,4,12),WMAT(0x33363a));
      v.rotation.x=Math.PI/2; v.position.set(0,y,0.035); g.add(v); }                    // 통풍 테
    const spin=new THREE.Group(); spin.name='spin'; spin.position.set(0,0,0.035); g.add(spin);   // 척·날은 캐는 동안 돈다(updateWeapon)
    const chuck=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.03,0.05,10),WMAT(0xc3c7cb));
    chuck.position.y=0.315; spin.add(chuck);
    const bit=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.009,0.14,6),WMAT(0xb4b9be));
    bit.position.y=0.41; spin.add(bit);
    const tipc=new THREE.Mesh(new THREE.ConeGeometry(0.009,0.02,6),WMAT(0xb4b9be)); tipc.position.y=0.49; spin.add(tipc);
    const trg=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.03,0.015),WMAT(0xc0762a)); trg.position.set(0,0.10,-0.035); g.add(trg);
    return {mesh:g, grip:0.06};
  },
  grenade(){                                 // 수류탄 — 둥근 연철 통 · 신관 · 안전손잡이 · 고리
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,10),WMAT(0x4a5a44)); b.scale.set(1,1.25,1); b.position.y=0.06; g.add(b);
    for(const y of [0.04,0.08]){ const r=new THREE.Mesh(new THREE.TorusGeometry(0.049,0.004,4,14),WMAT(0x3f4f44));
      r.rotation.x=Math.PI/2; r.position.y=y; g.add(r); }                              // 파편 홈
    const fz=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.02,0.035,8),WMAT(0x8f959b)); fz.position.y=0.125; g.add(fz);
    const lev=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.09,0.006),WMAT(0x8f959b)); lev.position.set(0.028,0.09,0); lev.rotation.z=-0.15; g.add(lev);
    const pin=new THREE.Mesh(new THREE.TorusGeometry(0.014,0.003,4,10),WMAT(0xc3c7cb)); pin.position.set(-0.02,0.13,0); g.add(pin);
    return {mesh:g, grip:0.05, rest:{rx:-0.8, rz:0.2}};
  },
  handaxe(){                                 // 주먹도끼 — 양면을 떼어 낸 눈물방울 돌
    const g=new THREE.Group();
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(0.07,0),WMAT(0x6d6a62));
    m.scale.set(0.9,1.55,0.45); m.position.y=0.07; g.add(m);
    const e=new THREE.Mesh(new THREE.DodecahedronGeometry(0.05,0),WMAT(0x8c877c));
    e.scale.set(0.8,1.5,0.32); e.position.set(0.012,0.10,0.004); g.add(e);   // 떼어 낸 밝은 면
    return {mesh:g, grip:0.02};
  },
  axe_crude(){ return axeMesh(0.62,'pebble',0x7a756b,W_WOOD,0x7c9440); },
  axe_stone(){ return axeMesh(0.70,'polish',0x6b6f72,W_WOOD,W_CORD); },
  axe_bronze(){ return axeMesh(0.74,'metal',0xa9772f,W_WOOD,0x8a6a4a); },
  axe_iron(){ return axeMesh(0.76,'metal',0x8f959b,W_WOOD,0x8a6a4a); },
  axe_steel(){ return axeMesh(0.78,'metal',0xb4b9be,0x5f4c3a,0x3a3d40); },
  pick_crude(){ return pickMesh(0.62,'pebble',0x7a756b,W_WOOD); },
  pick_stone(){ return pickMesh(0.70,'stone',0x6b6f72,W_WOOD); },
  pick_polished(){ return pickMesh(0.72,'polish',0x767b7e,W_WOOD); },
  pick_bronze(){ return pickMesh(0.76,'metal',0xa9772f,W_WOOD); },
  pick_iron(){ return pickMesh(0.78,'metal',0x8f959b,W_WOOD); },
  pick_steel(){ return pickMesh(0.80,'metal',0xb4b9be,0x5f4c3a); },
  net_cord(){ return netMesh(0xa89a68); },
  net_silk(){ return netMesh(0xe0dcd0); },
  torch(){                                   // 횃불 — 가지 끝에 섬유를 두툼히 감았다
    const g=new THREE.Group(), L=0.46;
    g.add(haft(L,0.017,0.021,0x4a3a29));
    const wrap=new THREE.Mesh(new THREE.CylinderGeometry(0.036,0.028,0.13,7),WMAT(0x5a4a30));
    wrap.position.y=L+0.03; g.add(wrap);
    for(const y of [L-0.02,L+0.05]) g.add(wbind(y,0.038));
    const tip=new THREE.Object3D(); tip.name='tip'; tip.position.y=L+0.10; g.add(tip);
    return {mesh:g, grip:0.14, rest:{rx:-0.30, rz:0.18}};
  },
  lamp_oil(){                                // 기름 등잔 — 토기에 심지 하나
    const g=new THREE.Group();
    const pts=[[0,0],[0.050,0.004],[0.068,0.030],[0.060,0.060],[0.040,0.070],[0.036,0.064]]
      .map(a=>new THREE.Vector2(a[0],a[1]));
    const pot=new THREE.Mesh(new THREE.LatheGeometry(pts,14),WMAT(0x9a6a44)); g.add(pot);
    const oil=new THREE.Mesh(new THREE.CircleGeometry(0.037,14),WMAT(0x7a5a24));
    oil.rotation.x=-Math.PI/2; oil.position.y=0.058; g.add(oil);
    const wick=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.03,4),WMAT(0x2e2a24));
    wick.position.set(0.02,0.07,0); g.add(wick);
    const hd=new THREE.Mesh(new THREE.TorusGeometry(0.03,0.007,5,10,Math.PI),WMAT(0x9a6a44));
    hd.rotation.y=Math.PI/2; hd.position.set(-0.07,0.035,0); hd.rotation.z=Math.PI/2; g.add(hd);
    const tip=new THREE.Object3D(); tip.name='tip'; tip.position.set(0.02,0.075,0); g.add(tip);
    return {mesh:g, grip:0.02, rest:{rx:-0.02, rz:0.05}, tipScale:0.45};
  },
  slingshot(){                               // 새총 — 두 갈래 가지에 건 줄
    const g=new THREE.Group();
    g.add(haft(0.16,0.016,0.014,W_WOOD));
    for(const s of [-1,1]){ const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.010,0.013,0.13,6),WMAT(W_WOOD));
      arm.position.set(s*0.035,0.215,0); arm.rotation.z=-s*0.5; g.add(arm); }
    const band=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.004,4,10,Math.PI),WMAT(0x4f6a30));
    band.position.set(0,0.265,-0.01); band.rotation.x=Math.PI/2; g.add(band);
    return {mesh:g, grip:0.05, rest:{rx:-0.75, rz:0.12}};
  },
  hand_charger(){                            // 손 충전기 — 검은 몸통 옆에 접이식 손잡이
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.13,0.045),WMAT(0x33363a)); body.position.y=0.085; g.add(body);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(0.079,0.018,0.049),WMAT(0xd8a030)); cap.position.y=0.150; g.add(cap);
    const led=new THREE.Mesh(new THREE.SphereGeometry(0.006,8,6),WBASIC(0x7fe08a)); led.position.set(0.02,0.125,0.024); g.add(led);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.014,12),WMAT(0x8a8e92)); hub.rotation.x=Math.PI/2; hub.position.set(0,0.085,0.030); g.add(hub);
    const arm=new THREE.Group(); arm.name='spin'; arm.position.set(0,0.085,0.040);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.060,0.008),WMAT(0x8a8e92)); bar.position.y=0.030; arm.add(bar);
    const knob=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.03,10),WMAT(0x1c1e20)); knob.rotation.x=Math.PI/2; knob.position.set(0,0.060,0.018); arm.add(knob);
    g.add(arm);
    return {mesh:g, grip:0.03, rest:{rx:-0.75, rz:0.18}};
  },
  lamp_electric(){                           // 전등 — 황동 몸통 · 유리 갓 · 전구
    const g=new THREE.Group();
    g.add(haft(0.16,0.028,0.028,0x3a3d40));
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.030,0.05,12),WMAT(0xc4a747));
    neck.position.y=0.18; g.add(neck);
    const glass=new THREE.Mesh(new THREE.CylinderGeometry(0.050,0.046,0.06,12,1,true),
      new THREE.MeshPhongMaterial({color:0xdde8ee,transparent:true,opacity:0.35,shininess:90,side:THREE.DoubleSide}));
    glass.position.y=0.235; g.add(glass);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.02,10,8),WBASIC(0xfff2c8));
    bulb.position.y=0.235; g.add(bulb);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.006,5,14),WMAT(0xc4a747));
    rim.rotation.x=Math.PI/2; rim.position.y=0.265; g.add(rim);
    return {mesh:g, grip:0.08, rest:{rx:-0.9, rz:0.10}};
  },
  bowdrill(){                                // 활비비 — 작은 활 · 송곳 · 누름돌
    const g=new THREE.Group(), R=0.22, A=2.0;
    const bow=new THREE.Mesh(new THREE.TorusGeometry(R,0.011,5,14,A),WMAT(W_WOOD));
    bow.rotation.z=Math.PI/2-A/2; bow.position.y=0.12-R; g.add(bow);
    const ye=0.12-R+R*Math.cos(A/2), xe=R*Math.sin(A/2);
    const str=new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,xe*2,4),WMAT(W_CORD));
    str.rotation.z=Math.PI/2; str.position.y=ye; g.add(str);
    const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.009,0.30,6),WMAT(0x8a7048));
    sp.rotation.z=Math.PI/2; sp.position.set(0,ye+0.035,0.02); g.add(sp);
    return {mesh:g, grip:0.02, rest:{rx:-0.55, rz:0.25}};
  },
  igniter(){                                 // 긴 라이터 — 철관 · 방아쇠 · 불꽃 톱니
    const g=new THREE.Group();
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.013,0.36,8),WMAT(0x8f959b));
    tube.position.y=0.20; g.add(tube);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.10,0.045),WMAT(0x5f4c3a));
    grip.position.y=0.03; g.add(grip);
    const trg=new THREE.Mesh(new THREE.BoxGeometry(0.008,0.035,0.012),WMAT(0x3a3d40));
    trg.position.set(0,0.07,-0.028); g.add(trg);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.010,10),WMAT(0x565b61));
    wheel.rotation.z=Math.PI/2; wheel.position.y=0.39; g.add(wheel);
    return {mesh:g, grip:0.04};
  },
  spear(){                                   // 돌창 — 짧은 뗀석기 날
    const g=new THREE.Group(), L=1.55;
    g.add(haft(L,0.021,0.027));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.052,0.24,4),WMAT(0x59636b));
    tip.position.y=L+0.10; tip.rotation.y=Math.PI/4; g.add(tip);
    g.add(wbind(L-0.04,0.034));
    return {mesh:g, grip:0.42};
  },
  spear_iron(){                              // 철 창 — 자루도 날도 길다
    const g=new THREE.Group(), L=2.05;
    g.add(haft(L,0.022,0.028));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.048,0.40,6),WMAT(0xb4b9be));
    tip.position.y=L+0.19; g.add(tip);
    const sock=new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.045,0.16,6),WMAT(0x9aa0a6));
    sock.position.y=L-0.03; g.add(sock);
    g.add(wbind(L-0.16,0.035));
    return {mesh:g, grip:0.60};
  },
  sword_iron(){                              // 철 검 — 자루 · 코등이 · 양날
    const g=new THREE.Group(), H=0.26, B2=0.92;
    g.add(haft(H,0.028,0.032,0x4a3a29));
    const pom=new THREE.Mesh(new THREE.SphereGeometry(0.042,8,6),WMAT(0x8f959b));
    pom.position.y=0.01; g.add(pom);
    const gd=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.045,0.06),WMAT(0x9aa0a6));
    gd.position.y=H+0.02; g.add(gd);
    const bl=new THREE.Mesh(new THREE.BoxGeometry(0.085,B2,0.022),WMAT(0xc3c7cb));
    bl.position.y=H+0.05+B2/2; g.add(bl);
    const pt=new THREE.Mesh(new THREE.ConeGeometry(0.060,0.16,4),WMAT(0xc3c7cb));
    pt.position.y=H+0.05+B2+0.07; pt.rotation.y=Math.PI/4;
    pt.scale.set(1,1,0.36); g.add(pt);
    return {mesh:g, grip:0.16};
  },
  axe_war(){                                 // 철 전투도끼 — 무게가 날 끝에 몰려 있다
    const g=new THREE.Group(), L=0.92;
    g.add(haft(L,0.026,0.030));
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.22,0.11),WMAT(0x8f959b));
    head.position.y=L-0.04; g.add(head);
    /* 날은 윤곽을 직접 그려 뽑는다 — 원통을 잘라 쓰면 자루에서 떨어져 보인다.
       자루(x=0)에 물려 시작해 바깥으로 넓게 퍼지는 초승달꼴이다. */
    const sh=new THREE.Shape();
    sh.moveTo(0.00,-0.11);
    sh.lineTo(0.20,-0.21);
    sh.quadraticCurveTo(0.36,-0.04, 0.30,0.19);
    sh.lineTo(0.00, 0.11);
    sh.closePath();
    const bl=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,
      {depth:0.030, bevelEnabled:true, bevelThickness:0.006, bevelSize:0.006,
       bevelSegments:1, curveSegments:8}),WMAT(0xb4b9be));
    bl.position.set(0.02,L-0.04,-0.021); g.add(bl);
    g.add(wbind(L-0.20,0.036));
    return {mesh:g, grip:0.30};
  },
  sword_chitin(){                            // 키틴 검 — 겹쳐 세운 껍질 날
    const g=new THREE.Group(), H=0.24, B2=0.88;
    g.add(haft(H,0.028,0.032,0x4a3a29));
    const wrap=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.038,H-0.03,8),
      WMAT(0x8a6a4a));
    wrap.position.y=H/2; g.add(wrap);        // 가죽으로 감은 손잡이
    const gd=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.040,0.06),WMAT(0x3f4f44));
    gd.position.y=H+0.02; g.add(gd);
    for(let i=0;i<3;i++){                    // 껍질을 세 겹으로 겹쳐 붙였다
      const bl=new THREE.Mesh(new THREE.BoxGeometry(0.075-i*0.012,B2-i*0.16,0.020),
        WMAT(i%2?0x5b6d5e:0x4a5a4e));
      bl.position.set(0,H+0.05+(B2-i*0.16)/2,(i-1)*0.010); g.add(bl);
    }
    const pt=new THREE.Mesh(new THREE.ConeGeometry(0.052,0.17,4),WMAT(0x6b7d6e));
    pt.position.y=H+0.05+B2+0.07; pt.rotation.y=Math.PI/4;
    pt.scale.set(1,1,0.34); g.add(pt);
    return {mesh:g, grip:0.15};
  },
  spear_bone(){                              // 뼈 창 — 비스듬히 간 창끝
    const g=new THREE.Group(), L=2.00;
    g.add(haft(L,0.022,0.028));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.046,0.36,5),WMAT(0xd6cfb4));
    tip.position.y=L+0.17; g.add(tip);
    const collar=new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.040,0.12,6),
      WMAT(0xbdb497));
    collar.position.y=L-0.02; g.add(collar);
    g.add(wbind(L-0.13,0.034));
    g.add(wbind(0.52,0.034));
    return {mesh:g, grip:0.58};
  },
  axe_chitin(){                              // 키틴 도끼 — 뼈 심에 물린 넓은 날
    const g=new THREE.Group(), L=0.90;
    g.add(haft(L,0.026,0.030));
    const core=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.21,0.10),WMAT(0xd6cfb4));
    core.position.y=L-0.04; g.add(core);     // 뼈 심
    const sh=new THREE.Shape();
    sh.moveTo(0.00,-0.11);
    sh.lineTo(0.19,-0.20);
    sh.quadraticCurveTo(0.35,-0.03, 0.29,0.18);
    sh.lineTo(0.00, 0.11);
    sh.closePath();
    const bl=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,
      {depth:0.026, bevelEnabled:true, bevelThickness:0.005, bevelSize:0.005,
       bevelSegments:1, curveSegments:8}),WMAT(0x53685a));
    bl.position.set(0.02,L-0.04,-0.018); g.add(bl);
    g.add(wbind(L-0.19,0.036));
    return {mesh:g, grip:0.29};
  },
  hammer_bone(){                             // 뼈 해머 — 관절 뼈를 통째로
    const g=new THREE.Group(), L=0.95;
    g.add(haft(L,0.030,0.034));
    const head=new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.085,0.34,8),
      WMAT(0xd6cfb4));
    head.rotation.x=Math.PI/2; head.position.y=L-0.02; g.add(head);
    for(const sz of [-1,1]){                 // 관절 끝이 불룩하다
      const k=new THREE.Mesh(new THREE.SphereGeometry(0.098,8,6),WMAT(0xc7bfa2));
      k.position.set(0,L-0.02,sz*0.17); k.scale.set(1,0.9,0.8); g.add(k);
    }
    const lash=new THREE.Mesh(new THREE.CylinderGeometry(0.040,0.040,0.10,8),
      WMAT(0x8a6a4a));
    lash.position.y=L-0.19; g.add(lash);     // 가죽으로 조여 묶은 자리
    g.add(wbind(L-0.28,0.040));
    return {mesh:g, grip:0.32};
  },
  rifle_bolt(){                              // 볼트 소총 — 나무 개머리 · 강철 총열
    const g=new THREE.Group(), L=1.22;
    const wood=WMAT(0x6b5442), steel=WMAT(0x6e747a), dark=WMAT(0x3a3d40);
    // 개머리판에서 총열까지 하나로 이어지는 몸통
    const stock=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.46,0.115),wood);
    stock.position.y=0.20; g.add(stock);
    const butt=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.13,0.165),wood);
    butt.position.set(0,0.02,0.015); g.add(butt);
    const fore=new THREE.Mesh(new THREE.BoxGeometry(0.062,0.52,0.085),wood);
    fore.position.y=0.72; g.add(fore);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.019,0.021,L-0.28,10),steel);
    barrel.position.y=0.42+(L-0.28)/2; g.add(barrel);
    const recv=new THREE.Mesh(new THREE.BoxGeometry(0.062,0.20,0.075),steel);
    recv.position.y=0.50; g.add(recv);
    // 노리쇠 — 오른쪽으로 젖혀 나온 손잡이
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.13,6),steel);
    bolt.rotation.z=Math.PI/2; bolt.position.set(0.052,0.47,0.02); g.add(bolt);
    const knob=new THREE.Mesh(new THREE.SphereGeometry(0.021,8,6),steel);
    knob.position.set(0.115,0.47,0.02); g.add(knob);
    // 탄창 · 방아쇠울
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.052,0.10,0.055),dark);
    mag.position.set(0,0.395,-0.005); g.add(mag);
    const guard=new THREE.Mesh(new THREE.TorusGeometry(0.032,0.007,6,10,Math.PI),dark);
    guard.rotation.y=Math.PI/2; guard.position.set(0,0.34,-0.012); g.add(guard);
    // 가늠쇠 · 총구
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.010,0.030,0.010),dark);
    sight.position.y=L-0.04; g.add(sight);
    const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.024,0.035,10),dark);
    muzzle.position.y=L-0.015; g.add(muzzle);
    // 총구 화염 — 쏠 때만 보인다
    const fl=muzzleFlash(0.075);                    // 총구 화염 — 셰이더 불(makeFire 와 같은 색)
    fl.position.y=L+0.11; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.36, muzzle:L+0.02};
  },
  /* 현대식 화기 셋 — 볼트 소총의 뼈대를 나눠 쓰되 한눈에 갈라 보이게 했다.
     산탄총은 나무가 많고 총열이 굵고 짧다. 반자동은 총열 밑에 가스관이 붙고,
     기관단총은 나무가 없고 탄창이 길게 아래로 빠진다. */
  shotgun(){                                 // 산탄총 — 굵고 짧은 매끈한 총열
    const g=new THREE.Group(), L=0.94;
    const wood=WMAT(0x6b5442), steel=WMAT(0x5e646a), dark=WMAT(0x3a3d40);
    const stock=new THREE.Mesh(new THREE.BoxGeometry(0.080,0.44,0.125),wood);
    stock.position.y=0.19; g.add(stock);
    const butt=new THREE.Mesh(new THREE.BoxGeometry(0.092,0.14,0.180),wood);
    butt.position.set(0,0.02,0.018); g.add(butt);
    const fore=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.34,0.105),wood);
    fore.position.y=0.62; g.add(fore);       // 앞총열 덮개 — 펌프처럼 굵다
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.032,L-0.30,10),steel);
    barrel.position.y=0.40+(L-0.30)/2; g.add(barrel);
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.019,0.019,L-0.40,8),dark);
    tube.position.set(0,0.42+(L-0.40)/2,0.050); g.add(tube);   // 탄창관
    const recv=new THREE.Mesh(new THREE.BoxGeometry(0.068,0.19,0.085),steel);
    recv.position.y=0.47; g.add(recv);
    const guard=new THREE.Mesh(new THREE.TorusGeometry(0.032,0.007,6,10,Math.PI),dark);
    guard.rotation.y=Math.PI/2; guard.position.set(0,0.33,-0.014); g.add(guard);
    const bead=new THREE.Mesh(new THREE.SphereGeometry(0.011,6,5),WMAT(0xd8c07a));
    bead.position.y=L-0.02; g.add(bead);     // 가늠쇠는 구슬 하나뿐이다
    const fl=muzzleFlash(0.115);                    // 총구 화염 — 셰이더 불(makeFire 와 같은 색)
    fl.position.y=L+0.10; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.34, muzzle:L+0.02};
  },
  rifle_semi(){                              // 반자동 — 총열 밑에 가스관
    const g=new THREE.Group(), L=1.28;
    const wood=WMAT(0x5f4c3a), steel=WMAT(0x74797f), dark=WMAT(0x33363a);
    const stock=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.46,0.115),wood);
    stock.position.y=0.20; g.add(stock);
    const butt=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.13,0.165),wood);
    butt.position.set(0,0.02,0.015); g.add(butt);
    const fore=new THREE.Mesh(new THREE.BoxGeometry(0.060,0.46,0.082),wood);
    fore.position.y=0.70; g.add(fore);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.020,L-0.26,10),steel);
    barrel.position.y=0.40+(L-0.26)/2; g.add(barrel);
    const gas=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,L-0.52,8),dark);
    gas.position.set(0,0.52+(L-0.52)/2,0.040); g.add(gas);      // 가스관
    const gblock=new THREE.Mesh(new THREE.BoxGeometry(0.036,0.070,0.070),steel);
    gblock.position.set(0,L-0.22,0.022); g.add(gblock);         // 가스 블록
    const recv=new THREE.Mesh(new THREE.BoxGeometry(0.066,0.24,0.082),steel);
    recv.position.y=0.50; g.add(recv);
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.052,0.19,0.062),dark);
    mag.position.set(0,0.34,-0.008); mag.rotation.x=-0.12; g.add(mag);
    const guard=new THREE.Mesh(new THREE.TorusGeometry(0.032,0.007,6,10,Math.PI),dark);
    guard.rotation.y=Math.PI/2; guard.position.set(0,0.33,-0.014); g.add(guard);
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.010,0.034,0.010),dark);
    sight.position.y=L-0.05; g.add(sight);
    const rear=new THREE.Mesh(new THREE.TorusGeometry(0.016,0.005,5,10),dark);
    rear.position.set(0,0.62,0.005); g.add(rear);               // 가늠자 고리
    const fl=muzzleFlash(0.072);                    // 총구 화염 — 셰이더 불(makeFire 와 같은 색)
    fl.position.y=L+0.11; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.36, muzzle:L+0.02};
  },
  rifle_sniper(){                            // 대물 저격총 — 긴 총열 · 제퇴기 · 조준경 · 양각대
    const g=new THREE.Group(), L=1.75;
    const body=WMAT(0x4a4f45), steel=WMAT(0x5e6368), dark=WMAT(0x2b2e30), glass=WMAT(0x8fb4c8);
    const stock=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.40,0.13),body); stock.position.y=0.20; g.add(stock);
    const pad=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.04,0.17),dark); pad.position.y=0.0; g.add(pad);
    const recv=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.34,0.09),steel); recv.position.y=0.52; g.add(recv);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.024,0.028,L-0.55,12),steel);
    barrel.position.y=0.62+(L-0.55)/2; g.add(barrel);
    const brake=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.11,0.06),dark);
    brake.position.y=L+0.05; g.add(brake);                        // 제퇴기
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.14,0.10),dark);
    mag.position.set(0,0.46,-0.07); g.add(mag);
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.13,0.06),dark);
    grip.position.set(0,0.36,-0.07); grip.rotation.x=0.25; g.add(grip);
    const sc=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.34,12),dark);
    sc.position.set(0,0.56,0.085); g.add(sc);                    // 조준경 몸통
    for(const [y,r] of [[0.74,0.040],[0.38,0.034]]){
      const bell=new THREE.Mesh(new THREE.CylinderGeometry(r,0.028,0.06,12),dark); bell.position.set(0,y,0.085);
      if(y<0.5) bell.rotation.x=Math.PI; g.add(bell);
      const ln=new THREE.Mesh(new THREE.CircleGeometry(r*0.85,12),glass); ln.position.set(0,y+(y<0.5?-0.031:0.031),0.085);
      ln.rotation.x=y<0.5?Math.PI/2:-Math.PI/2; g.add(ln);
    }
    for(const s of [-1,1]){                                      // 양각대(접힌 채)
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.26,6),dark);
      leg.position.set(s*0.025,L-0.42,-0.04); leg.rotation.x=0.12; g.add(leg);
    }
    const fl=muzzleFlash(0.16); fl.position.y=L+0.16; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.40, muzzle:L+0.1};
  },
  bazooka(){                                 // 바주카 — 어깨에 메는 곧은 통 · 나팔 뒤끝 · 손잡이 둘 · 가늠자
    const g=new THREE.Group(), L=1.40;
    const tubeM=WMAT(0x55603f), dark=WMAT(0x2e3230), wood=WMAT(0x5f4c3a);
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.046,0.046,L,16,1,true),tubeM);
    tube.material.side=THREE.DoubleSide; tube.position.y=L/2; g.add(tube);
    const flare=new THREE.Mesh(new THREE.CylinderGeometry(0.047,0.07,0.14,16,1,true),dark);
    flare.position.y=0.07; g.add(flare);                         // 뒤 나팔
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.048,0.008,6,16),dark);
    ring.rotation.x=Math.PI/2; ring.position.y=L-0.01; g.add(ring);
    const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.20,12),wood);
    shoulder.position.y=0.42; g.add(shoulder);                  // 어깨받이
    for(const y of [0.62,0.92]){
      const gr=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.11,0.05),dark);
      gr.position.set(0,y,-0.075); gr.rotation.x=0.2; g.add(gr);
    }
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,0.05),dark);
    sight.position.set(0,1.05,0.07); g.add(sight);
    const head=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.12,12),WMAT(0x6a7a58));
    head.position.y=L+0.05; head.name='warhead'; g.add(head);   // 물린 로켓 머리
    const fl=muzzleFlash(0.12); fl.position.y=L+0.12; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.62, muzzle:L};
  },
  smg(){                                     // 기관단총 — 나무가 없고 탄창이 길다
    const g=new THREE.Group(), L=0.72;
    const steel=WMAT(0x565b61), dark=WMAT(0x2e3134);
    const tubeBody=new THREE.Mesh(new THREE.CylinderGeometry(0.042,0.042,0.52,10),steel);
    tubeBody.position.y=0.44; g.add(tubeBody);                  // 둥근 몸통(블로백)
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.016,0.30,8),dark);
    barrel.position.y=0.70+0.15; g.add(barrel);
    const shroud=new THREE.Mesh(new THREE.CylinderGeometry(0.027,0.027,0.22,8),
      new THREE.MeshLambertMaterial({color:0x3f4348, wireframe:true}));
    shroud.position.y=0.80; g.add(shroud);                      // 총열 덮개(구멍 뚫린 통)
    const grip=new THREE.Mesh(new THREE.BoxGeometry(0.046,0.17,0.058),dark);
    grip.position.set(0,0.10,-0.020); grip.rotation.x=0.18; g.add(grip);
    const mag=new THREE.Mesh(new THREE.BoxGeometry(0.038,0.30,0.055),dark);
    mag.position.set(0,0.19,0.055); g.add(mag);                 // 길게 빠진 탄창
    const stock=new THREE.Mesh(new THREE.CylinderGeometry(0.011,0.011,0.30,6),dark);
    stock.position.set(0,0.28,0.10); stock.rotation.x=1.35; g.add(stock);  // 철사 개머리
    const guard=new THREE.Mesh(new THREE.TorusGeometry(0.030,0.006,6,10,Math.PI),dark);
    guard.rotation.y=Math.PI/2; guard.position.set(0,0.21,-0.030); g.add(guard);
    const sight=new THREE.Mesh(new THREE.BoxGeometry(0.008,0.026,0.008),dark);
    sight.position.y=0.93; g.add(sight);
    const fl=muzzleFlash(0.060);                    // 총구 화염 — 셰이더 불(makeFire 와 같은 색)
    fl.position.y=L+0.24; fl.visible=false; fl.name='flash'; g.add(fl);
    return {mesh:g, grip:0.22, muzzle:L+0.26};
  },
  /* 강철 넷 — 철과 한눈에 갈라 보이게 몸은 짙은 청회색(0x74797f)으로 두고
     날만 밝게(0xc8ced4) 세운다. 담금질한 쇠의 푸른 기를 노린 것이다. */
  sword_steel(){                             // 강철 검 — 날 가운데 혈조를 팠다
    const g=new THREE.Group(), H=0.26, B2=0.96;
    g.add(haft(H,0.028,0.032,0x3a2f23));
    const pom=new THREE.Mesh(new THREE.SphereGeometry(0.044,8,6),WMAT(0x6b7077));
    pom.position.y=0.01; g.add(pom);
    const gd=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.042,0.058),WMAT(0x6b7077));
    gd.position.y=H+0.02; g.add(gd);
    const bl=new THREE.Mesh(new THREE.BoxGeometry(0.082,B2,0.024),WMAT(0xc8ced4));
    bl.position.y=H+0.05+B2/2; g.add(bl);
    // 혈조 — 날 한가운데를 얕게 판 홈. 짙은 띠 하나로 표현한다
    const fu=new THREE.Mesh(new THREE.BoxGeometry(0.026,B2*0.82,0.027),WMAT(0x74797f));
    fu.position.y=H+0.05+B2/2; g.add(fu);
    const pt=new THREE.Mesh(new THREE.ConeGeometry(0.058,0.18,4),WMAT(0xc8ced4));
    pt.position.y=H+0.05+B2+0.08; pt.rotation.y=Math.PI/4;
    pt.scale.set(1,1,0.34); g.add(pt);
    return {mesh:g, grip:0.16};
  },
  /* 잿불 무기 넷 — 강철 무기를 그대로 빚고 손잡이(자루·노끈)를 뺀 쇠붙이를 잿불 비늘로 덮는다(`emberClad`). 검은 날만 덮는다. */
  sword_ember(){ return emberClad(WEAPON_FX.sword_steel(), m=>m.position.y<0.3); },   // 검은 날만 — 폼멜·코등이는 맨쇠
  spear_ember(){ return emberClad(WEAPON_FX.spear_steel()); },
  axe_ember_war(){ return emberClad(WEAPON_FX.axe_steel_war()); },
  hammer_ember(){ return emberClad(WEAPON_FX.hammer_steel()); },
  spear_steel(){                             // 강철 창 — 버들잎꼴 날
    const g=new THREE.Group(), L=2.05;
    g.add(haft(L,0.022,0.028,0x4a3a29));
    /* 잎꼴은 윤곽을 그려 뽑는다 — 원뿔로는 어깨가 살아나지 않는다 */
    const sh=new THREE.Shape();
    sh.moveTo(0,0);
    sh.quadraticCurveTo( 0.072,0.17,  0,0.46);
    sh.quadraticCurveTo(-0.072,0.17,  0,0);
    sh.closePath();
    const bl=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,
      {depth:0.026, bevelEnabled:true, bevelThickness:0.006, bevelSize:0.005,
       bevelSegments:1, curveSegments:10}),WMAT(0xc8ced4));
    bl.position.set(0,L-0.01,-0.013); g.add(bl);
    const sock=new THREE.Mesh(new THREE.CylinderGeometry(0.036,0.044,0.18,6),WMAT(0x6b7077));
    sock.position.y=L-0.05; g.add(sock);
    g.add(wbind(L-0.18,0.034));
    return {mesh:g, grip:0.60};
  },
  axe_steel_war(){                           // 강철 전투도끼 — 아래가 길게 뻗은 수염날
    const g=new THREE.Group(), L=0.94;
    g.add(haft(L,0.026,0.030,0x4a3a29));
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.085,0.24,0.11),WMAT(0x6b7077));
    head.position.y=L-0.04; g.add(head);
    /* 수염날 — 아래쪽이 턱처럼 길게 내려와 상대를 걸어 당긴다 */
    const sh=new THREE.Shape();
    sh.moveTo(0.00,-0.13);
    sh.lineTo(0.18,-0.30);
    sh.quadraticCurveTo(0.40,-0.10, 0.33,0.20);
    sh.lineTo(0.00, 0.12);
    sh.closePath();
    const bl=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,
      {depth:0.030, bevelEnabled:true, bevelThickness:0.006, bevelSize:0.006,
       bevelSegments:1, curveSegments:8}),WMAT(0xc8ced4));
    bl.position.set(0.02,L-0.04,-0.021); g.add(bl);
    // 뒤쪽 쐐기 — 앞뒤 무게를 잡아 준다
    const bk=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.11,0.07),WMAT(0x6b7077));
    bk.position.set(-0.07,L-0.04,0); g.add(bk);
    g.add(wbind(L-0.22,0.036));
    return {mesh:g, grip:0.30};
  },
  hammer_steel(){                            // 강철 해머 — 모를 깎은 여덟모 머리
    const g=new THREE.Group(), L=1.00;
    g.add(haft(L,0.030,0.034,0x4a3a29));
    const head=new THREE.Mesh(new THREE.CylinderGeometry(0.115,0.115,0.38,8),
      WMAT(0x6b7077));
    head.rotation.x=Math.PI/2; head.position.y=L-0.02; g.add(head);
    for(const sz of [-1,1]){                 // 때리는 면 — 격자무늬가 서도록 밝게
      const f=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.105,0.024,8),
        WMAT(0xc8ced4));
      f.rotation.x=Math.PI/2; f.position.set(0,L-0.02,sz*0.19); g.add(f);
    }
    g.add(wbind(L-0.22,0.040));
    return {mesh:g, grip:0.34};
  },
  hammer_iron(){                             // 철 해머 — 통짜 머리
    const g=new THREE.Group(), L=0.98;
    g.add(haft(L,0.030,0.034));
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.19,0.36),WMAT(0x8f959b));
    head.position.y=L-0.02; g.add(head);
    for(const sz of [-1,1]){                 // 때리는 면을 조금 밝게
      const f=new THREE.Mesh(new THREE.BoxGeometry(0.175,0.195,0.02),WMAT(0xb4b9be));
      f.position.set(0,L-0.02,sz*0.185); g.add(f);
    }
    g.add(wbind(L-0.20,0.040));
    return {mesh:g, grip:0.34};
  },
  /* 작살 — 가늘고 긴 자루 끝의 촉. 돌·쇠 작살은 뒤로 젖힌 미늘(갈고리)이 있다 */
  harpoon_wood(){
    const g=new THREE.Group(), L=1.7;
    g.add(haft(L,0.015,0.024,0x7a6444));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.018,0.26,5),WMAT(0x3a2e22));   // 불에 그을려 굳힌 끝
    tip.position.y=L+0.12; g.add(tip);
    return {mesh:g, grip:0.50};
  },
  harpoon_stone(){
    const g=new THREE.Group(), L=1.75;
    g.add(haft(L,0.018,0.026));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.034,0.22,4),WMAT(0x59636b));
    tip.position.y=L+0.10; tip.rotation.y=Math.PI/4; g.add(tip);
    for(const s of [-1,1]){ const b=new THREE.Mesh(new THREE.ConeGeometry(0.013,0.09,4),WMAT(0x59636b));
      b.position.set(s*0.034,L-0.005,0); b.rotation.z=s*2.55; g.add(b); }              // 미늘
    g.add(wbind(L-0.05,0.032));
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.03,0.008,5,12),WMAT(W_CORD)); coil.position.y=0.5; coil.rotation.x=Math.PI/2; g.add(coil);
    return {mesh:g, grip:0.52};
  },
  harpoon_iron(){
    const g=new THREE.Group(), L=1.95;
    g.add(haft(L,0.019,0.027,0x5f4c3a));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.026,0.34,6),WMAT(0xb4b9be));
    tip.position.y=L+0.16; g.add(tip);
    for(const s of [-1,1]) for(const y of [0.02,-0.10]){ const b=new THREE.Mesh(new THREE.ConeGeometry(0.012,0.11,4),WMAT(0xb4b9be));
      b.position.set(s*0.036,L+y,0); b.rotation.z=s*2.6; g.add(b); }
    const sock=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.034,0.16,6),WMAT(0x9aa0a6));
    sock.position.y=L-0.06; g.add(sock);
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.034,0.009,5,12),WMAT(W_CORD)); coil.position.y=0.6; coil.rotation.x=Math.PI/2; g.add(coil);
    return {mesh:g, grip:0.58};
  }
};
/* 지금 든 무기에 맞춰 손의 것을 갈아 끼운다.
   mesh 를 -grip 만큼 내려 두므로 weaponFx 의 원점이 곧 손잡이다 —
   아래 휘두르기의 회전은 전부 이 손잡이를 축으로 돈다. */
function setWeaponFx(id){
  if(weaponFxId===id) return;
  weaponFxId=id;
  if(weaponFx){ camera.remove(weaponFx); weaponFx=null; }
  const F=id&&(WEAPON_FX[id]||(consumable(ITEMS[id])&&(()=>heldConsumable(id))));
  if(!F) return;
  const {mesh,grip,muzzle,rest,tipScale}=F();
  mesh.position.y=-grip;
  weaponFx=new THREE.Group();
  weaponFx.add(mesh);
  weaponFx.userData.muzzle=(muzzle||0)-grip;      // 총구까지의 국소 높이
  weaponFx.userData.flash=mesh.getObjectByName('flash')||null;
  weaponFx.userData.tip=mesh.getObjectByName('tip')||null;
  weaponFx.userData.spin=mesh.getObjectByName('spin')||null;
  weaponFx.userData.rest=rest||null; weaponFx.userData.tipScale=tipScale||1;
  weaponFx.rotation.set(-Math.PI/2+0.20,0,0.12);
  weaponFx.position.copy(WEAPON_HOME);
  camera.add(weaponFx);
}
