/* 74-icons-guns.js — CASTAWAY
   아이콘과 쏘는 것 — 아이템 아이콘 굽기 · 손에 든 먹을 것 · 휘두르기 · 총·수류탄·조준경·로켓 · 그물질 · 좌클릭(useHeld)
   (island_world (6).html 이 이 차례로 읽는다 — 차례와 묶음은 README.md 의 「코드 지도」에 있다) */
"use strict";

/* ── 아이템 아이콘 ────────────────────────────────────────────────────────
   마인크래프트처럼 칸마다 그림을 단다. **그림은 실제 입체를 찍은 것이다** — 손에 드는 것은
   손에 든 모습 그대로(`WEAPON_FX` · `heldConsumable`), 입는 것은 몸에 입힐 모형 그대로(`gearModel` —
   갑옷·옷은 앞에서 비스듬히, 투구는 더 돌려, 등짐은 뒤에서), 그 밖(재료·탄·약품…)은 아래
   `_icoShape` 가 같은 재질 `WMAT` 로 빚는다. 광물은 사전 삽화(`mineralIcon`)를 그대로 쓴다.
   처음 부를 때 한 번 256² 로 그려 두 번 반씩 줄여 64×64 dataURL 로 남긴다(`ITEM_ICON`). 렌더러가 없으면 빈 그림. */
const ITEM_ICON={}, ICON_PX=64;
let _icoRT=null, _icoScene=null, _icoCam=null;
function _icoShape(id){
  const T=ITEMS[id], g=new THREE.Group(), M=WMAT(T.c);
  const add=(geo,mat,x,y,z,rx,ry,rz,sx,sy,sz)=>{ const m=new THREE.Mesh(geo,mat||M);
    m.position.set(x||0,y||0,z||0); m.rotation.set(rx||0,ry||0,rz||0); if(sx) m.scale.set(sx,sy,sz); g.add(m); return m; };
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d), cyl=(a,b,h,n)=>new THREE.CylinderGeometry(a,b,h,n||14),
        sph=(r,w,h)=>new THREE.SphereGeometry(r,w||14,h||10), tor=(r,t,a)=>new THREE.TorusGeometry(r,t,8,24,a||Math.PI*2);
  const lump=(r,seed)=>{ const geo=new THREE.IcosahedronGeometry(r,1), p=geo.attributes.position, rn=mulberry32(hashStr(id+(seed||'')));
    const cache={}; for(let i=0;i<p.count;i++){ const k=p.getX(i).toFixed(3)+p.getY(i).toFixed(3)+p.getZ(i).toFixed(3);
      const f=cache[k]||(cache[k]=0.78+rn()*0.4); p.setXYZ(i,p.getX(i)*f,p.getY(i)*f*0.8,p.getZ(i)*f); }
    geo.computeVertexNormals(); return geo; };
  const bottle=(liq,glassC)=>{ const gl=new THREE.MeshPhongMaterial({color:glassC||0xcfe6ee,transparent:true,opacity:0.45,shininess:90});
    add(cyl(0.16,0.17,0.36),gl,0,0,0); add(cyl(0.06,0.09,0.1),gl,0,0.23,0); add(cyl(0.065,0.065,0.05),WMAT(0x8a6a44),0,0.3,0);
    if(liq!=null) add(cyl(0.15,0.16,0.26),WMAT(liq),0,-0.04,0); };
  const pile=(c)=>{ add(new THREE.ConeGeometry(0.3,0.22,16),WMAT(c),0,0,0); };
  const strands=(c,n,len,w)=>{ const rn=mulberry32(hashStr(id)); for(let i=0;i<n;i++) add(box(w,len,w*0.4),WMAT(c),(rn()-0.5)*0.12,0,(rn()-0.5)*0.08,0,0,(rn()-0.5)*0.35); };
  if(/^ingot_|bloom_iron|iron_wrought/.test(id)){ add(cyl(0.16,0.22,0.12,4),M,0,0,0,0,Math.PI/4,0,1.6,1,0.8); }
  else if(/^cartridge|shell_buck/.test(id)){ const brass=WMAT(id==='shell_buck'?0xb03a2a:0xc8a050);
    for(let i=0;i<3;i++){ add(cyl(0.035,0.035,0.26),brass,(i-1)*0.1,0,0); add(new THREE.ConeGeometry(0.035,0.08,12),WMAT(id==='shell_buck'?0xc8a050:0x9a6a3a),(i-1)*0.1,0.17,0); } }
  else if(id==='rocket'){ add(cyl(0.06,0.06,0.5),WMAT(0x5a6a4a),0,0,0); add(new THREE.ConeGeometry(0.06,0.16,14),WMAT(0x8a8a7a),0,0.33,0);
    for(let i=0;i<4;i++) add(box(0.01,0.12,0.09),WMAT(0x3a3a34),Math.cos(i*1.57)*0.07,-0.2,Math.sin(i*1.57)*0.07,0,-i*1.57,0); }
  else if(/^arrow_/.test(id)){ add(cyl(0.012,0.012,0.8),WMAT(0x9a7a50),0,0,0); add(new THREE.ConeGeometry(0.035,0.12,4),M,0,0.45,0);
    for(let i=0;i<3;i++) add(box(0.005,0.12,0.05),WMAT(0xe8e2d4),Math.cos(i*2.1)*0.02,-0.34,Math.sin(i*2.1)*0.02,0,i*2.1,0); }
  else if(id==='ring_platinum'){ add(tor(0.16,0.035),M,0,0,0,1.1,0,0); add(new THREE.OctahedronGeometry(0.06),WMAT(0xe8f4ff),0,0.17,0.06); }
  else if(id==='wire_copper'||id==='cord'){ for(let i=0;i<5;i++) add(tor(0.2-i*0.02,0.018),M,0,0,i*0.015,1.2,0,0); }
  else if(id==='spring_steel'){ for(let i=0;i<7;i++) add(tor(0.1,0.015),M,0,(i-3)*0.06,0,1.45,0,0); }
  else if(id==='gauze_platinum'){ add(box(0.4,0.4,0.01),new THREE.MeshPhongMaterial({color:T.c,wireframe:true}),0,0,0); add(box(0.4,0.4,0.005),WMAT(T.c),0,0,-0.01,0,0,0,1,1,1).material.transparent=true; }
  else if(id==='magnet'){ add(tor(0.14,0.05,Math.PI),WMAT(0xb83a2a),0,0,0); add(box(0.1,0.1,0.1),WMAT(0xc8c8cc),-0.14,-0.05,0); add(box(0.1,0.1,0.1),WMAT(0xc8c8cc),0.14,-0.05,0); }
  else if(id==='electrode'||id==='barrel_rifled'||id==='pipe_copper'||id==='blowpipe'){ const L=id==='electrode'?0.5:0.8, r=id==='electrode'?0.04:0.05;
    add(cyl(r,r,L),M,0,0,0); if(id!=='electrode') add(cyl(r*0.6,r*0.6,L+0.01),WMAT(0x111111),0,0,0); }
  else if(id==='bulb'){ add(sph(0.16,16,12),new THREE.MeshPhongMaterial({color:0xfff6c8,transparent:true,opacity:0.7,emissive:0x444020}),0,0.08,0); add(cyl(0.07,0.07,0.12),WMAT(0xb0b0b0),0,-0.12,0); }
  else if(id==='battery_li'){ for(let i=0;i<3;i++){ add(cyl(0.07,0.07,0.36),M,(i-1)*0.15,0,0); add(cyl(0.03,0.03,0.03),WMAT(0xc8ccd0),(i-1)*0.15,0.195,0); } }
  else if(id==='spodumene'){ for(let i=0;i<3;i++) add(cyl(0.06,0.07,0.34-i*0.06,6),M,(i-1)*0.08,0,(i%2)*0.05,0,0,(i-1)*0.25); }
  else if(id==='battery'){ add(box(0.4,0.26,0.24),WMAT(0x2a2e30),0,0,0); add(cyl(0.03,0.03,0.05),WMAT(0xb03a2a),-0.12,0.15,0); add(cyl(0.03,0.03,0.05),WMAT(0x333333),0.12,0.15,0); }
  else if(id==='drawplate'){ add(box(0.4,0.08,0.22),M,0,0,0); for(let i=0;i<5;i++) add(cyl(0.012+i*0.006,0.012+i*0.006,0.09,10),WMAT(0x111111),-0.14+i*0.07,0,0); }
  else if(id==='blade_polished'||id==='point'){ add(new THREE.ConeGeometry(0.12,0.42,4),M,0,0,0,0,0,0,1,1,0.3); }
  else if(id==='hammer_stone'){ add(cyl(0.02,0.025,0.55),WMAT(0x8a6a44),0,0,0); add(lump(0.12),M,0,0.28,0); }
  else if(/^(lye|nitric|acid_sulfuric|alcohol)$/.test(id)) bottle(T.c);
  else if(id==='mercury') bottle(0xc8ccd0);
  else if(id==='bottle_empty') bottle(null);
  else if(/^(ash|saltpeter|gunpowder|fulminate|guncotton|powder_smokeless|li_carbonate|cathode_lfp)$/.test(id)) pile(T.c);
  else if(id==='primer'){ for(let i=0;i<4;i++) add(cyl(0.05,0.05,0.04),WMAT(0xc8a050),(i%2-0.5)*0.12,0,(i>>1)*0.12-0.06); }
  else if(/^(pot|pot_raw|pot_sand|crucible|crucible_raw)$/.test(id)){ const c=/raw/.test(id)?0x8a7a66:0xa8724a;
    if(/crucible/.test(id)) add(cyl(0.16,0.11,0.3,14),WMAT(c),0,0,0);
    else{ add(sph(0.2,16,12),WMAT(c),0,0,0,0,0,0,1,0.85,1); add(cyl(0.13,0.15,0.06),WMAT(c),0,0.17,0); }
    if(id==='pot_sand') add(cyl(0.12,0.12,0.01),WMAT(0xd8c890),0,0.2,0); }
  else if(id==='bucket_iron'){ add(cyl(0.2,0.16,0.34,16,1,true),WMAT(0x8a8e90),0,0,0); add(tor(0.2,0.012,Math.PI),WMAT(0x6a6e70),0,0.17,0); }
  else if(id==='waterskin'){ add(sph(0.2,14,10),M,0,0,0,0,0,0,1,1.2,0.6); add(cyl(0.04,0.05,0.1),dark(T.c),0,0.26,0); }
  else if(id==='branch'){ add(cyl(0.03,0.045,0.8,8),M,0,0,0); add(cyl(0.015,0.025,0.3,6),M,0.08,0.1,0,0,0,-0.7); }
  else if(id==='log'){ add(cyl(0.16,0.16,0.6,14),WMAT(0x5a4430),0,0,0,0,0,Math.PI/2); add(cyl(0.155,0.155,0.61,14),WMAT(0xc8a676),0,0,0,0,0,Math.PI/2,0.98,1,0.98); }
  else if(id==='stone_block'){ add(box(0.36,0.26,0.26),M,0,0,0); }
  else if(id==='guide'){ add(box(0.30,0.40,0.03),WMAT(0xd8c890),0,0,0); add(box(0.20,0.03,0.035),WMAT(0x8a3a2a),0,0.10,0); add(box(0.20,0.015,0.035),WMAT(0x5a5040),0,0.02,0); add(box(0.20,0.015,0.035),WMAT(0x5a5040),0,-0.04,0); }
  else if(id==='codex'){ add(box(0.32,0.42,0.08),WMAT(0x6a3a28),0,0,0); add(box(0.3,0.4,0.07),WMAT(0xe8dcc0),0.012,0,0); }
  else if(id==='glass'){ add(box(0.36,0.42,0.02),new THREE.MeshPhongMaterial({color:0xcfe6ee,transparent:true,opacity:0.55,shininess:100}),0,0,0); }
  else if(id==='berry'){ const rn=mulberry32(5); for(let i=0;i<7;i++) add(sph(0.08,12,8),WMAT(0x8e2438),(rn()-0.5)*0.24,(rn()-0.5)*0.2,(rn()-0.5)*0.12); }
  else if(/^(grass_blade|reed_stalk)$/.test(id)) strands(T.c,7,0.6,0.035);
  else if(/^(fiber|spider_silk|tinder)$/.test(id)) strands(T.c,12,0.5,0.012);
  else if(id==='bone'){ add(cyl(0.035,0.035,0.5),M,0,0,0); for(const s of [-1,1]) for(const t of [-1,1]) add(sph(0.06,10,8),M,t*0.04,s*0.26,0); }
  else if(/^(hide|chitin|ember_scale)$/.test(id)){ const geo=new THREE.CircleGeometry(0.28,7); const p=geo.attributes.position, rn=mulberry32(hashStr(id));
    for(let i=1;i<p.count;i++){ p.setXY(i,p.getX(i)*(0.75+rn()*0.4),p.getY(i)*(0.75+rn()*0.4)); p.setZ(i,(p.getX(i)*p.getX(i))*(id==='hide'?0.2:0.9)); }
    geo.computeVertexNormals(); const m=WMAT(T.c).clone(); m.side=THREE.DoubleSide; add(geo,m,0,0,0); }
  else if(id==='charcoal_pile'){ add(new THREE.ConeGeometry(0.34,0.3,14),WMAT(0x5a4a3a),0,0,0); }
  else if(id==='rope'){ add(tor(0.20,0.05),M,0,0,0,1.2,0,0); add(tor(0.15,0.05),M,0.02,0.07,0,1.2,0.5,0); }
  else if(id==='glue'){ add(cyl(0.17,0.13,0.22,14),WMAT(0xa8724a),0,0,0); add(cyl(0.155,0.155,0.02,14),M,0,0.11,0);
    add(cyl(0.012,0.012,0.36,6),WMAT(0x6b5a3c),0.05,0.2,0,0,0,-0.35); }
  else if(id==='snorkel'){ add(cyl(0.03,0.03,0.56,10),M,0,0.04,0); add(tor(0.09,0.03,Math.PI),M,0.09,-0.24,0,0,0,Math.PI);
    add(cyl(0.05,0.036,0.09,10),WMAT(0x5a4a30),0.18,-0.21,0); }
  else if(id==='fins'){ for(const s of [-1,1]){ add(box(0.16,0.34,0.025),M,s*0.12,0.05,0,0,0,s*0.12,1,1,1);
      add(box(0.10,0.14,0.05),WMAT(0x6b5a3c),s*0.11,-0.19,0); add(tor(0.05,0.012),WMAT(W_CORD),s*0.11,-0.2,0,Math.PI/2,0,0); } g.userData.front=1; }
  else if(id==='goggles'){ const gl=new THREE.MeshPhongMaterial({color:0xcfe6ee,transparent:true,opacity:0.6,shininess:100});
    for(const s of [-1,1]){ add(cyl(0.11,0.11,0.05,14),WMAT(0x6b5a3c),s*0.13,0,0,Math.PI/2,0,0); add(cyl(0.085,0.085,0.055,14),gl,s*0.13,0,0,Math.PI/2,0,0); }
    add(box(0.5,0.04,0.02),WMAT(W_CORD),0,0,-0.04); g.userData.front=1; }
  else if(id==='clam'||id==='clam_cooked'){ for(const s of [-1,1]) add(sph(0.2,12,8),M,0,s*0.03,0,s*0.22,0,0,1,0.34,0.9); }
  else if(id==='oyster'||id==='oyster_cooked'){ add(lump(0.2,'a'),M,0,0,0,0,0,0,1.1,0.5,0.85); add(sph(0.11,10,8),WMAT(0xe8e4d8),0,0.05,0,0,0,0,1,0.3,0.8); }
  else if(id==='urchin'){ add(sph(0.14,10,8),M,0,0,0); const rn=mulberry32(77);
    for(let i=0;i<26;i++){ const a=rn()*6.283, b=Math.acos(rn()*2-1), dx=Math.sin(b)*Math.cos(a), dy=Math.cos(b), dz=Math.sin(b)*Math.sin(a);
      const sp=add(new THREE.ConeGeometry(0.012,0.16,4),M,dx*0.2,dy*0.2,dz*0.2); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx,dy,dz)); } }
  else add(lump(0.22),M,0,0,0);        // 덩이(광석·점토·석탄·숯·기름·조직 …)
  return g;
}
const iconTag=(id,t)=>{ const u=itemIcon(id);
  return u?'<img class="sw ico" src="'+u+'" alt="">':'<i class="sw" style="background:#'+t.c.toString(16).padStart(6,'0')+'"></i>'; };
function itemIcon(id){
  if(ITEM_ICON[id]) return ITEM_ICON[id];
  const T=ITEMS[id]; if(!T) return '';
  if(typeof MINERALS!=='undefined'&&MINERALS.includes(id)&&RESOURCES.find(r=>r.k===id)) return ITEM_ICON[id]=mineralIcon(id,RESOURCES.find(r=>r.k===id).c);
  if(!renderer) return '';
  if(!_icoRT){
    _icoRT=new THREE.WebGLRenderTarget(ICON_PX*4,ICON_PX*4);
    _icoScene=new THREE.Scene();
    _icoScene.add(new THREE.AmbientLight(0xffffff,0.55));
    const dl=new THREE.DirectionalLight(0xffffff,0.85); dl.position.set(-0.6,1,0.9); _icoScene.add(dl);
    const dl2=new THREE.DirectionalLight(0xbcd0ff,0.3); dl2.position.set(0.8,-0.2,-0.6); _icoScene.add(dl2);
    _icoCam=new THREE.OrthographicCamera(-1,1,1,-1,0.01,20);
  }
  let obj;
  const held=WEAPON_FX[id]||(consumable(T)&&(()=>heldConsumable(id)));
  if(held){ const r=held(); obj=new THREE.Group(); r.mesh.position.y=-(r.grip||0); obj.add(r.mesh);
    obj.rotation.set(0.25,0.5,-Math.PI/4);            // 손에 든 것은 대각선으로 눕힌다(마크 아이콘처럼)
  }else if((obj=gearModel(id))){                      // 입는 것 — 몸 좌표 모형을 그대로(다리·멜빵은 뺀다)
    obj.traverse(o=>{ if(o.userData.noIcon) o.visible=false; });
    const sl=T.wear&&T.wear.slot; obj.rotation.set(sl==='head'?0.1:0.06,sl==='head'?-0.65:(sl==='back'||id==='cape_grass'?2.6:-0.4),0);
  }else{ obj=_icoShape(id); if(obj.userData.front) obj.rotation.set(0.12,-0.25,0); else obj.rotation.set(0.45,-0.6,0); }
  _icoScene.add(obj); obj.updateMatrixWorld(true);
  const bb=gBox(obj), c=bb.getCenter(new THREE.Vector3()), sz=bb.getSize(new THREE.Vector3());
  const h=Math.max(sz.x,sz.y)*0.56||0.5;
  _icoCam.left=-h; _icoCam.right=h; _icoCam.top=h; _icoCam.bottom=-h;      // 틀은 카메라 기준이다 — 자리는 position 이 잡는다
  _icoCam.position.set(c.x,c.y,c.z+10); _icoCam.lookAt(c); _icoCam.updateProjectionMatrix();
  const prevT=renderer.getRenderTarget(), prevC=renderer.getClearColor(new THREE.Color()), prevA=renderer.getClearAlpha(),
        prevS=renderer.shadowMap.enabled, prevAC=renderer.autoClear;
  renderer.shadowMap.enabled=false; renderer.autoClear=true;
  renderer.setRenderTarget(_icoRT); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(_icoScene,_icoCam);
  const W=ICON_PX*4, px=new Uint8Array(W*W*4); renderer.readRenderTargetPixels(_icoRT,0,0,W,W,px);
  renderer.setRenderTarget(prevT); renderer.setClearColor(prevC,prevA); renderer.shadowMap.enabled=prevS; renderer.autoClear=prevAC;
  _icoScene.remove(obj);
  obj.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  const cv=document.createElement('canvas'); cv.width=cv.height=W; const g2=cv.getContext('2d'), im=g2.createImageData(W,W);
  for(let y=0;y<W;y++) im.data.set(px.subarray((W-1-y)*W*4,(W-y)*W*4),y*W*4);   // 위아래 뒤집기
  g2.putImageData(im,0,0);
  const half=document.createElement('canvas'); half.width=half.height=W/2; half.getContext('2d').drawImage(cv,0,0,W/2,W/2);   // 두 번 반씩 줄여 계단을 지운다
  const out=document.createElement('canvas'); out.width=out.height=ICON_PX; out.getContext('2d').drawImage(half,0,0,ICON_PX,ICON_PX);
  return ITEM_ICON[id]=out.toDataURL();
}
/* 먹을 것·마실 것·붕대를 손에 든 모습. 무기처럼 id 마다 따로 쓰지 않고 생김새 몇 벌을
   나눠 쓴다 — 빛깔은 아이템 색(T.c)을 그대로 입힌다. 세워 들고(rest) 쥐는 자리가 원점이다. */
function heldConsumable(id){
  const T=ITEMS[id], g=new THREE.Group(), M=WMAT(T.c);
  const put=(geo,mat,x,y,z,sx,sy,sz,rx,rz)=>{
    const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z);
    if(sx) m.scale.set(sx,sy,sz); if(rx) m.rotation.x=rx; if(rz) m.rotation.z=rz;
    g.add(m); return m;
  };
  const S=(r,w,h)=>new THREE.SphereGeometry(r,w||14,h||10);
  const C=(a,b,h,n)=>new THREE.CylinderGeometry(a,b,h,n||16);
  const shade=(c,k)=>{ const r=Math.min(255,(c>>16&255)*k|0), gg=Math.min(255,(c>>8&255)*k|0),
                          b=Math.min(255,(c&255)*k|0); return (r<<16)|(gg<<8)|b; };
  const pot=(liq)=>{                                  // 토기 — 배부른 항아리 + 전
    put(S(0.085,16,12),WMAT(0xa8724a),0,0.075,0,1,0.85,1);
    put(C(0.058,0.066,0.03),WMAT(0x9a6640),0,0.14,0);
    put(C(0.054,0.054,0.004),WMAT(liq),0,0.152,0);
  };
  const fishBody=(col)=>{                             // 물고기 — 방추형 몸 + 꼬리 + 눈
    put(S(0.05,16,10),WMAT(col),0,0.10,0,0.55,2.2,0.9);
    put(new THREE.ConeGeometry(0.045,0.07,4),WMAT(shade(col,0.85)),0,-0.02,0,1,1,0.25,Math.PI);
    put(S(0.007,6,5),WMAT(0x111111),0.018,0.18,0.03);
    put(S(0.007,6,5),WMAT(0x111111),-0.018,0.18,0.03);
  };
  switch(id){
    case 'meat_bear': case 'meat_cooked': case 'jerky':{
      const flat=id==='jerky';
      put(S(0.07,14,10),M,0,0.07,0,flat?0.55:1,flat?1.6:1.15,flat?0.18:0.62);
      put(S(0.045,10,8),WMAT(shade(T.c,id==='meat_bear'?1.35:0.8)),0.025,0.05,0.02,0.7,0.9,0.5);
      if(!flat){ put(C(0.012,0.014,0.09,8),WMAT(0xe8dcc8),0,-0.02,0);   // 뼈 손잡이
                 put(S(0.018,8,6),WMAT(0xe8dcc8),0,-0.07,0); }
      break;
    }
    case 'berry':{                                    // 베리 한 송이 — 알 일곱에 꼭지와 잎 하나
      const rn=mulberry32(5);
      for(let i=0;i<7;i++) put(S(0.026,10,8),WMAT(i%3?0x8e2438:0xa83450),(rn()-0.5)*0.07,0.05+(rn()-0.5)*0.06,(rn()-0.5)*0.06);
      put(C(0.004,0.005,0.06,6),WMAT(0x5a4028),0,0.11,0);
      put(S(0.03,8,6),WMAT(0x4f7a3a),0.02,0.125,0,1,0.25,0.6);
      break;
    }
    case 'fish': fishBody(T.c); break;
    case 'fish_cooked': case 'fish_dried':
      fishBody(T.c); if(id==='fish_dried') g.scale.set(1,1,0.5); break;
    case 'can_food':
      put(C(0.045,0.045,0.11),M,0,0.055,0);
      put(C(0.047,0.047,0.006),WMAT(0x8a8680),0,0.11,0);
      put(C(0.047,0.047,0.006),WMAT(0x8a8680),0,0.0,0);
      put(C(0.0455,0.0455,0.06,16),WMAT(0xb04a38),0,0.058,0);          // 딱지
      break;
    case 'bottle_water':
      put(C(0.038,0.04,0.15),new THREE.MeshPhongMaterial({color:0x7fb0d0,transparent:true,
        opacity:0.55,shininess:90,specular:0x888888}),0,0.075,0);
      put(C(0.034,0.036,0.10),WMAT(0x4f86ae),0,0.055,0);               // 안의 물
      put(C(0.014,0.03,0.04),new THREE.MeshPhongMaterial({color:0x7fb0d0,transparent:true,
        opacity:0.55}),0,0.17,0);
      put(C(0.016,0.016,0.02),WMAT(0x2e3a44),0,0.2,0);
      break;
    case 'pot_water': pot(0x3f76a0); break;
    case 'stew_meat': case 'stew_fish': case 'herb_tea': pot(T.c); break;
    case 'bucket_water':
      put(C(0.075,0.06,0.13,18),WMAT(0x9aa0a6),0,0.065,0);
      put(C(0.071,0.071,0.004,18),WMAT(0x3f76a0),0,0.12,0);
      put(new THREE.TorusGeometry(0.075,0.005,6,20,Math.PI),WMAT(0x6a6e72),0,0.13,0);
      break;
    case 'waterskin_water':
      put(S(0.08,14,10),M,0,0.07,0,0.85,1.1,0.55);
      put(C(0.016,0.022,0.05,8),WMAT(0x5a4028),0,0.16,0);
      put(C(0.018,0.018,0.012,8),WMAT(W_CORD),0,0.15,0);
      break;
    default:
      if(T.heal){                                     // 붕대 — 감긴 두루마리 + 풀린 끝
        put(C(0.038,0.038,0.07,18),M,0,0.035,0,1,1,1,0,Math.PI/2);
        put(C(0.012,0.012,0.072,10),WMAT(shade(T.c,0.75)),0,0.035,0,1,1,1,0,Math.PI/2);
        put(new THREE.BoxGeometry(0.068,0.09,0.004),M,0,-0.01,0.036);
      }else if(T.drink) pot(T.c);
      else if(T.fishy){                               // 바다 물고기 — 종마다 길이·키만 달리한다
        fishBody(T.c);
        const k={clownfish:[1,0.62],angelfish:[1.5,0.6],pufferfish:[1.6,0.55],eel:[0.5,1.25],flounder:[1.7,0.8],
                 mackerel:[0.8,1],corvina:[1,1],cod:[1.1,1.2]}[id.replace('_cooked','')]||[1,1];
        g.scale.set(k[0],k[1],1);
      }
      else put(S(0.06),M,0,0.06,0,1,0.8,0.8);
  }
  return {mesh:g, grip:0.02, rest:{rx:-0.15, rz:0.35}};
}

/* 휘두르는 자세 — 손은 거의 제자리에 두고 날만 손잡이를 축으로 크게 돈다.
   p 는 0→1 진행도. 창은 찌르고, 검·도끼는 베고, 해머는 내리친다. */
const WRX=-Math.PI/2+0.20, WRZ=0.12;         // 쉴 때의 자세
const wlerp=(a,b,t)=>a+(b-a)*t;
const wease=t=>t*t*(3-2*t);
const wIn=t=>t*t*t;
const WPOSE={rx:0,ry:0,rz:0,px:0,py:0,pz:0};
function swingPose(style,p){
  const o=WPOSE;
  o.rx=WRX; o.ry=0; o.rz=WRZ; o.px=0; o.py=0; o.pz=0;
  if(p<=0||p>=1) return o;
  if(style==='shot'){                        // 반동 — 뒤로 차고 총구가 들렸다 내려온다
    const k=p<0.22 ? p/0.22 : 1-(p-0.22)/0.78;
    o.rx=WRX+0.30*k; o.pz=0.14*k; o.py=0.03*k;
    return o;
  }
  if(style==='thrust'){                      // 찌르기 — 손이 앞으로 나간다
    const k=Math.sin(p*Math.PI);
    o.pz=-0.55*k; o.px=-0.10*k; o.rx=WRX-0.10*k;
    return o;
  }
  if(style==='smash'){                       // 내리치기 — 머리 위로 들었다 내린다
    if(p<0.34){ const k=wease(p/0.34);
      o.rx=wlerp(WRX,WRX-1.15,k); o.rz=wlerp(WRZ,0.30,k); o.py=0.16*k;
    }else if(p<0.56){ const k=wIn((p-0.34)/0.22);
      o.rx=wlerp(WRX-1.15,WRX+1.30,k); o.rz=wlerp(0.30,0.02,k);
      o.py=wlerp(0.16,-0.16,k); o.pz=-0.22*k;
    }else{ const k=wease((p-0.56)/0.44);
      o.rx=wlerp(WRX+1.30,WRX,k); o.rz=wlerp(0.02,WRZ,k);
      o.py=wlerp(-0.16,0,k); o.pz=wlerp(-0.22,0,k);
    }
    return o;
  }
  // 베기 — 오른쪽 위로 치켜들었다가 왼쪽 아래로 그어 내린다
  if(p<0.30){ const k=wease(p/0.30);
    o.rx=wlerp(WRX,WRX-0.55,k); o.ry=wlerp(0,0.50,k); o.rz=wlerp(WRZ,1.20,k);
    o.px=0.10*k; o.py=0.10*k;
  }else if(p<0.56){ const k=wIn((p-0.30)/0.26);
    o.rx=wlerp(WRX-0.55,WRX+0.70,k); o.ry=wlerp(0.50,-0.60,k);
    o.rz=wlerp(1.20,-1.35,k);
    o.px=wlerp(0.10,-0.22,k); o.py=wlerp(0.10,-0.08,k); o.pz=-0.16*k;
  }else{ const k=wease((p-0.56)/0.44);
    o.rx=wlerp(WRX+0.70,WRX,k); o.ry=wlerp(-0.60,0,k); o.rz=wlerp(-1.35,WRZ,k);
    o.px=wlerp(-0.22,0,k); o.py=wlerp(-0.08,0,k); o.pz=wlerp(-0.16,0,k);
  }
  return o;
}
let HOLD_T=0;
function initWeaponFx(){ setWeaponFx(null); }
const equippedWeapon=()=>{
  const e=equippedTool();
  return (e && (ITEMS[e.id].tool||{}).weapon) ? e : null;
};
/* ─ 총 ────────────────────────────────────────────────────────────
   근접과 달리 눈에서 뻗은 선으로 맞힌다. 사거리 50 m 안에서 그 선에 걸리는
   개체 중 가장 가까운 것이 맞는다. 탄창이 비면 재장전해야 다시 쏜다. */
const RELOAD={t:0, of:null};
let tracer=null, tracerT=0;
function initTracer(){
  tracer=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1,5),
    new THREE.MeshBasicMaterial({color:0xffe6a8,transparent:true,opacity:0}));
  tracer.visible=false; scene.add(tracer);
}
function showTracer(a,b){
  if(!tracer) return;
  const d=new THREE.Vector3().subVectors(b,a), len=d.length();
  tracer.position.copy(a).addScaledVector(d,0.5);
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  tracer.scale.set(1,len,1);
  tracer.visible=true; tracer.material.opacity=0.85; tracerT=0.09;
}
/* 눈에서 dir 로 뻗은 선에 걸리는 개체 — 가장 가까운 하나 */
function rayCreature(o,dir,range){
  let best=null, bt=range;
  for(const c of CREATURES){
    if(c.hp<=0) continue;
    const r=(c.r||0.5)+0.35;
    const ox=c.x-o.x, oy=(c.y||0)+1.0-o.y, oz=c.z-o.z;
    const t=ox*dir.x+oy*dir.y+oz*dir.z;
    if(t<0||t>bt) continue;
    const px=ox-dir.x*t, py=oy-dir.y*t, pz=oz-dir.z*t;
    if(px*px+py*py+pz*pz>r*r) continue;
    bt=t; best=c;
  }
  return {c:best, t:bt};
}
/* 탄약은 'ammo' 분류로 찾는다 — 구리든 황동이든 같은 약실에 들어간다.
   탄창에는 한 종류만 물린다(w.ammoId). 섞어 물리면 어느 발이 센지 알 수 없다. */
/* 구경(bore)이 맞아야 약실에 들어간다. 소총탄과 산탄은 서로 물리지 않는다.
   옛 탄과 옛 총에는 bore 가 없으므로 'rifle' 로 친다. */
const isAmmo=id=>!!(ITEMS[id]&&ITEMS[id].ammo);
const boreOf=id=>(ITEMS[id]&&ITEMS[id].ammo&&ITEMS[id].ammo.bore)||'rifle';
const gunBore=w=>{ const T=w&&ITEMS[w.id]; return (T&&T.tool&&T.tool.bore)||'rifle'; };
const fitsGun=(id,w)=>isAmmo(id)&&boreOf(id)===gunBore(w);
const gunAmmo=w=>INV.slots.reduce((a,s)=>a+(fitsGun(s.id,w)?s.n:0),0);
// 맞는 구경 중 가장 센 것부터 — 좋은 탄이 있으면 그것부터 물린다
const bestAmmo=w=>INV.slots.filter(s=>fitsGun(s.id,w))
  .sort((a,b)=>ITEMS[b.id].ammo.dmg-ITEMS[a.id].ammo.dmg)[0];
const ammoMul=w=>(w&&w.ammoId&&ITEMS[w.ammoId]&&ITEMS[w.ammoId].ammo.dmg)||1;

function startReload(w,W){
  if(w.mag>=W.mag && w.ammoId){ toast('탄창이 이미 찼다'); return false; }
  if(gunAmmo(w)<=0){ toast('맞는 탄이 없다'); return false; }
  RELOAD.t=W.reload; RELOAD.of=w;
  toast('재장전…');
  return true;
}
function finishReload(){
  const w=RELOAD.of; RELOAD.of=null; RELOAD.t=0;
  if(!w||INV.slots.indexOf(w)<0) return;
  const W=ITEMS[w.id].tool;
  /* 물려 있던 것과 다른 탄으로 갈아 물면, 남은 것은 도로 소지품으로 뺀다 */
  const pick=bestAmmo(w);
  if(!pick) return;
  if(w.mag>0 && w.ammoId && w.ammoId!==pick.id){
    if(!invAdd(w.ammoId,w.mag)) toast('빼낸 탄을 들 자리가 없어 버렸다');
    w.mag=0;
  }
  w.ammoId=pick.id;
  let need=W.mag-w.mag;
  for(let i=INV.slots.length-1;i>=0&&need>0;i--){
    const sl=INV.slots[i];
    if(sl.id!==w.ammoId) continue;
    const take=Math.min(need,sl.n);
    w.mag+=take; need-=take; invRemove(i,take);
  }
  toast('장전 '+ITEMS[w.ammoId].n+' '+w.mag+' / '+W.mag);
  sfx('bind'); invDirty=true;
}
function updateReload(dt){
  if(RELOAD.t<=0) return;
  const w=RELOAD.of;
  if(!w||INV.slots.indexOf(w)<0||EQUIP!==w){ RELOAD.t=0; RELOAD.of=null; return; }
  RELOAD.t-=dt;
  if(RELOAD.t<=0) finishReload();
}
function shoot(w,W){
  if(RELOAD.t>0) return;
  if(!w.mag){                                  // 빈 탄창 — 알아서 재장전에 들어간다
    if(!startReload(w,W)) toast('철컥 — 비었다');
    return;
  }
  ATK.cd=W.rate; ATK.swing=0.28; ATK.swingMax=0.28;
  PL.stam=clamp(PL.stam-(W.stam||3),0,100);
  w.mag--; w.dur-=1;
  if(!w.mag) w.ammoId=null;
  const o=new THREE.Vector3(), d=new THREE.Vector3();
  camera.getWorldPosition(o); camera.getWorldDirection(d);
  const dmg=W.dmg*ammoMul(w);            // 황동 탄피는 더 센 장약을 견딘다
  if(W.rocket){ launchRocket(o,d,dmg,W); sfx('boom');
    if(w.dur<=0){ toast(ITEMS[w.id].n+' 파손'); invRemove(INV.slots.indexOf(w),1); EQUIP=null; }
    invDirty=true; return; }
  if(weaponFx&&weaponFx.userData.flash){
    const fl=weaponFx.userData.flash; fl.visible=true; ATK.flash=0.05;
    if(fl.userData.seed) fl.userData.seed.value=Math.random()*50;   // 쏠 때마다 다른 꼴
  }
  sfx('thrust');
  /* 산탄은 한 방에 여러 알이 나간다. 알마다 따로 선을 쏘고 각자 피해를 준다 —
     가까이서는 전부 맞고 멀어질수록 퍼져 몇 알만 닿는다. 퍼지는 각은 고정이니
     닿는 넓이는 거리의 제곱으로 는다. 그게 산탄총이 멀리 못 가는 까닭이다. */
  const n=W.pellets||1, sp=W.spread||0;
  const up=new THREE.Vector3(0,1,0), rt=new THREE.Vector3().crossVectors(d,up).normalize();
  const uu=new THREE.Vector3().crossVectors(rt,d).normalize();
  let best=null, bt=0, tot=0, shipHit=false;
  for(let k=0;k<n;k++){
    const dir=d.clone();
    if(sp>0){                                 // 고르게 퍼뜨린다(원판 위 균등)
      const a=Math.random()*Math.PI*2, r=Math.sqrt(Math.random())*sp;
      dir.addScaledVector(rt,Math.cos(a)*r).addScaledVector(uu,Math.sin(a)*r).normalize();
    }
    const hit=rayCreature(o,dir,W.reach);
    const ts=rayShip(o,dir,hit.t); if(ts<hit.t){ hit.c=null; hit.t=ts; shipHit=true; }   // 보급선이 가로막는다
    if(k===0||n<=3)
      showTracer(o.clone().addScaledVector(dir,0.6), o.clone().addScaledVector(dir,hit.t));
    if(hit.c){
      hit.c.hp-=dmg; hit.c.alerted=true; tot++;
      if(!best||hit.t<bt){ best=hit.c; bt=hit.t; }
    }
  }
  if(best) toast((best.hp<=0?'쓰러뜨렸다':'명중 '+Math.round(bt)+' m')
                 +(n>1?' ('+tot+' / '+n+'알)':''));
  else toast(shipHit?'보급선 몸에 맞았다 — 쨍':'빗나갔다');
  if(w.dur<=0){ toast(ITEMS[w.id].n+' 파손'); invRemove(INV.slots.indexOf(w),1); EQUIP=null; }
  invDirty=true;
}

/* ── 수류탄 ─────────────────────────────────────────────────────────────
   눈 방향으로 초속 16 m 에 조금 위로 던진다. 중력 9.8 로 떨어지고 땅에 닿으면 튀며 구르다 멈춘다.
   신관 3.5초가 다 타면 터진다 — 반경 7 m 안의 짐승과 사람을 (1−거리/7)² 만큼 다치게 하고,
   화강암 노두를 깨뜨린다(불로 달군 것과 같다). 불덩이 · 불티 · 연기 · 번쩍임 · 소리. */
const GRENADES=[], BLASTS=[];
/* 폭발 불빛은 하나를 계속 쓴다 — 터질 때마다 광원을 새로 달고 떼면 광원 수가 바뀌어
   Three 가 모든 재질의 셰이더를 다시 짠다(한 번 터질 때마다 멈칫). 처음 한 번만 달고 세기로 여닫는다. */
let BLAST_LIGHT=null;
function throwGrenade(w,W){
  ATK.cd=W.rate; ATK.swing=0.3; ATK.swingMax=0.3;
  PL.stam=clamp(PL.stam-(W.stam||6),0,100);
  const o=new THREE.Vector3(), d=new THREE.Vector3();
  camera.getWorldPosition(o); camera.getWorldDirection(d);
  const m=new THREE.Group();
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8),WMAT(0x4a5a44)); body.scale.set(1,1.25,1); m.add(body);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.025,0.05,8),WMAT(0x8f959b)); cap.position.y=0.085; m.add(cap);
  m.position.copy(o).addScaledVector(d,0.5);
  m.userData.lightRole='recv';     // 작고 빨리 난다 — 그림자 지도를 매 프레임 안 그리므로 드리우면 던진 자리에 그림자가 남는다
  scene.add(m);
  const v=d.clone().multiplyScalar(16); v.y+=3.2;
  GRENADES.push({m,v,t:W.fuse||3.5,dmg:W.dmg,r:W.reach});
  // 손에서 하나를 뗀다 — 남은 수류탄이 있으면 그것을 이어 든다
  const i=INV.slots.indexOf(w); invRemove(i,1);
  EQUIP=INV.slots.find(s=>s.id==='grenade')||null;
  sfx('thrust'); toast('던졌다 — 3.5초'); invDirty=true;
}
function updateGrenades(dt){
  for(let i=GRENADES.length-1;i>=0;i--){
    const g=GRENADES[i], p=g.m.position;
    g.v.y-=9.8*dt; p.addScaledVector(g.v,dt);
    const gy=Math.max(heightAt(p.x,p.z),-0.2)+0.07;
    if(p.y<gy){ p.y=gy; g.v.y=Math.abs(g.v.y)*0.3; g.v.x*=0.55; g.v.z*=0.55; }   // 튀며 구른다
    if(shipInside(p.x,p.y,p.z)){ p.addScaledVector(g.v,-dt); g.v.x*=-0.4; g.v.z*=-0.4; g.v.y=Math.abs(g.v.y)*0.3; }   // 보급선 몸에 튕긴다
    g.m.rotation.x+=dt*8*Math.hypot(g.v.x,g.v.z)*0.2;
    g.t-=dt;
    if(g.t<=0){ explode(p.clone(),g.dmg,g.r); scene.remove(g.m); GRENADES.splice(i,1); }
  }
  for(let i=BLASTS.length-1;i>=0;i--){
    const b=BLASTS[i]; b.t+=dt;
    const k=b.t/1.6;
    b.fire.scale.setScalar(Math.max(0.01,2.6*(1-k)));
    b.smoke.scale.set(5+k*6,6+k*8,1); b.smoke.position.y=0.5+k*3;
    b.light.intensity=Math.max(0,1-b.t*3)*40;
    if(k>=1){ scene.remove(b.g); BLASTS.splice(i,1); }
  }
}
/* ── 조준경 ──────────────────────────────────────────────────────────────
   `tool.scope`(배율)를 단 총을 들고 우클릭을 누르고 있으면 들여다본다. 화각을 배율만큼
   좁히고(70° → 70/배율), 손의 총을 감추고 검은 둥근 테와 십자선을 씌운다. 마우스도
   배율만큼 둔해진다(PL.aimMul). 0.15초에 걸쳐 들어가고 나온다. */
const SCOPE={k:0};
function updateScope(dt){
  const e=equippedTool(), W=e&&(ITEMS[e.id].tool||{});
  const want=!!(W&&W.scope&&mouseDown&&!BUILD.on&&RELOAD.t<=0);
  SCOPE.k=clamp(SCOPE.k+(want?dt:-dt)/0.15,0,1);
  const zoom=1+(((W&&W.scope)||1)-1)*SCOPE.k;
  const fov=70/zoom;
  if(Math.abs(camera.fov-fov)>0.01){ camera.fov=fov; camera.updateProjectionMatrix(); }
  PL.aimMul=1/zoom;
  const on=SCOPE.k>0.9;
  const el=document.getElementById('scope'); if(el) el.style.display=on?'block':'none';
  if(weaponFx){
    weaponFx.visible=!on;
    const wh=weaponFx.getObjectByName('warhead');     // 바주카 — 물린 로켓 머리는 쏘면 사라진다
    if(wh) wh.visible=!!(e&&e.mag>0);
  }
}
/* ── 로켓 ────────────────────────────────────────────────────────────────
   초속 70 m 로 곧게 날고(중력 1.5 m/s² — 멀리 가면 조금 처진다) 꼬리에 불꽃(makePlume)과
   연기를 끈다. 땅·짐승에 닿거나 사거리를 다 가면 `explode` 로 터진다(수류탄과 같은 폭발). */
const ROCKETS=[];
function launchRocket(o,d,dmg,W){
  const m=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.5,10),WMAT(0x5a6a4a)); m.add(body);
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.14,10),WMAT(0x6a7a58)); head.position.y=0.32; m.add(head);
  for(let i=0;i<4;i++){ const f=new THREE.Mesh(new THREE.BoxGeometry(0.006,0.12,0.07),WMAT(0x3f4a38));
    f.position.y=-0.2; f.rotation.y=i*Math.PI/2; f.position.x=Math.cos(i*Math.PI/2)*0.04;
    f.position.z=-Math.sin(i*Math.PI/2)*0.04; m.add(f); }
  const pl=makePlume(0.9,0.07); pl.userData.pow.value=1; pl.position.y=-0.26; m.add(pl);
  m.position.copy(o).addScaledVector(d,1.2);
  m.userData.lightRole='none';
  scene.add(m);
  ROCKETS.push({m,v:d.clone().multiplyScalar(70),dmg,r:W.blast||6,left:W.reach,trail:0});
}
const _ry=new THREE.Vector3(0,1,0), _rv=new THREE.Vector3();
function updateRockets(dt){
  for(let i=ROCKETS.length-1;i>=0;i--){
    const R=ROCKETS[i], p=R.m.position;
    R.v.y-=1.5*dt;
    const step=R.v.length()*dt;
    R.m.quaternion.setFromUnitVectors(_ry,_rv.copy(R.v).normalize());
    // 한 걸음을 잘게 나눠 땅·짐승을 뚫고 지나가지 않게 한다
    const n=Math.max(1,Math.ceil(step/1.5));
    let hit=false;
    for(let k=0;k<n&&!hit;k++){
      p.addScaledVector(R.v,dt/n);
      if(p.y<=Math.max(heightAt(p.x,p.z),-0.3)+0.05||shipInside(p.x,p.y,p.z)) hit=true;   // 땅 · 보급선
      for(const c of CREATURES){
        if(c.hp>0 && Math.hypot(c.x-p.x,(c.y||0)+1-p.y,c.z-p.z)<(c.r||1.5)){
          hit=true; p.set(c.x,c.y||0,c.z); break;                // 몸에 맞으면 그 자리에서 터진다(420 그대로)
        }
      }
    }
    R.left-=step;
    if(hit||R.left<=0){ explode(p.clone(),R.dmg,R.r); scene.remove(R.m); ROCKETS.splice(i,1); }
  }
}
function explode(p,dmg,r){
  for(const c of CREATURES){                            // 짐승
    if(c.hp<=0) continue;
    const d=Math.hypot(c.x-p.x,(c.y||0)-p.y,c.z-p.z);
    if(d<r){ c.hp-=dmg*Math.pow(1-d/r,2); c.alerted=true; }
  }
  const dp=Math.hypot(PL.pos.x-p.x,PL.pos.y-1.6-p.y,PL.pos.z-p.z);   // 사람
  if(dp<r) hurtPL(dmg*Math.pow(1-dp/r,2),'수류탄 파편',true);   // 짐승과 같은 피해(갑옷만 깎는다)
  for(const t of PROPS){                                // 화강암 노두가 깨진다
    if(t.k!=='granite'||t.cracked||!(t.ore>0)) continue;
    if(Math.hypot(t.x-p.x,t.z-p.z)<r*0.6){ t.cracked=true; t.heat=MINE.granite.fireset; }
  }
  const g=new THREE.Group(); g.position.copy(p); g.userData.lightRole='none';
  const fire=makeFire(1.0); fire.scale.setScalar(2.6); g.add(fire);
  const smoke=new THREE.Mesh(new THREE.PlaneGeometry(1,1).translate(0,0.5,0),fireMats().smoke);
  smoke.frustumCulled=false; g.add(smoke);
  if(!BLAST_LIGHT) BLAST_LIGHT=LIGHT.addPoint(scene,{color:0xffa050,intensity:0,dist:30});
  BLAST_LIGHT.position.set(p.x,p.y+1,p.z);
  scene.add(g);
  BLASTS.push({g,fire,smoke,light:BLAST_LIGHT,t:0});
  sfx('boom');
  const d2=Math.hypot(PL.pos.x-p.x,PL.pos.z-p.z);
  if(d2<40) toast(d2<r?'쾅! — 파편에 맞았다':'쾅!');
}

/* ── 그물질 ─────────────────────────────────────────────────────────────
   무릎 위(0.6 m)까지 잠기는 물에 서서 던진다. 그물코가 촘촘할수록 많이 건지고,
   던질 때마다 그물이 조금 상한다. 같은 자리에서 계속 건질 수는 없다 —
   물고기가 흩어져 잠시 뜸해진다. */
const NET={cd:0, spot:null, spent:0};
function castNet(w,T){
  if(NET.cd>0){ toast('물고기가 흩어졌다 — '+NET.cd.toFixed(1)+'초'); return; }
  if(!(PL.depth>0.6)){ toast('무릎 위까지 잠기는 물에 들어가야 한다'); return; }
  if(PL.stam<T.stam){ toast('기력이 없다'); return; }
  PL.stam=clamp(PL.stam-T.stam,0,100);
  NET.cd=3.5;
  ATK.cd=1.2; ATK.swing=0.45; ATK.swingMax=0.45;
  sfx('bind');
  // 같은 자리에서 자꾸 던지면 덜 걸린다
  const here=Math.round(PL.pos.x/6)+','+Math.round(PL.pos.z/6);
  if(NET.spot!==here){ NET.spot=here; NET.spent=0; }
  const tired=Math.max(0.25,1-NET.spent*0.18);
  const [lo,hi]=T.catch;
  let got=Math.round((lo+Math.random()*(hi-lo))*tired);
  if(Math.random()<0.12*(1-tired)) got=0;            // 자꾸 던지면 헛탕도 난다
  NET.spent++;
  w.dur-=1;
  if(w.dur<=0){ toast(ITEMS[w.id].n+' 찢어졌다'); invRemove(INV.slots.indexOf(w),1); EQUIP=null; }
  const sea=fishNet(hi+1);                            // 곁에 잔고기 떼가 있으면 그 떼를 건진다(종류 그대로)
  if(sea){ toast('그물에 걸렸다 — '+sea); invDirty=true; return; }
  if(got<=0){ toast('그물이 비었다'); return; }
  let added=0;
  for(let i=0;i<got;i++) if(invAdd('fish',1)) added++;
  toast(added?('물고기 '+added+'마리'):'무거워서 더 못 든다');
  invDirty=true;
}

/* 좌클릭 — 손에 든 것을 쓴다. 공격도 채집도 먹기도 전부 여기다.
   · 먹을 것·마실 것·붕대 → 먹는다   · 전등 → 켜고 끈다
   · 도끼·곡괭이·드릴로 캘 것을 보고 있으면 → 누르고 있는 동안 캔다(updateHarvest 가 useDown 을 본다 · 빈손 채집도 같다)
   · 무기·그물·수류탄 → 공격   · 빈손 → 물가에서 마신다
   우클릭은 조준경과, 축전지로 채우는 물건(전등·드릴)의 충전(chargeHeld)만 한다. 짓기 중엔 좌클릭이 조각 놓기. */
const USE_DUR=0.45; let USE_T=0, DRILL_K=0;
/* 좌클릭이 캐기가 되는 때 — 캘 것을 보고 있고, 빈손이거나 손의 것이 그 캐기 도구일 때.
   칼을 들고 덤불을 보면 캐지 않고 휘두른다. */
function harvestByUse(){ return !!HARV.mode && (!equippedTool() || !!HARV.mode.tool); }
function useHeld(){
  const e=equippedTool(), T=e&&ITEMS[e.id];
  if(SEA.look&&!(FISH.look&&T&&T.tool&&T.tool.harpoon)){ seaPick(); return; }   // 눈앞의 조개·굴·성게 — 작살로 물고기를 겨눈 게 아니면 줍는다
  if(harvestByUse()) return;                       // 캐는 중 — 누르고 있는 동안 updateHarvest 가 한다
  if(FLORA.look&&!(T&&T.tool&&T.tool.gun)){ floraPick(); return; }   // 눈앞의 덩굴·대나무·열매·버섯을 딴다
  if(!e){ drinkSource(true); return; }             // 빈손 — 물을 보고 있으면 마신다
  if(consumable(T)){
    if(USE_T>0) return;
    if(eatSlot(e)) USE_T=USE_DUR;
    return;
  }
  const W=T.tool||{};
  if(W.charger) return;                            // 손 충전기 — 누르고 있는 동안 updateCamcorder 가 돌린다
  if(W.lamp){ toggleLamp(); return; }
  if(W.torch){ toggleTorch(e); return; }
  if(W.weapon||W.net||W.throw){ attack(); return; }
  if(W.drill && e.dur<=0){ toast('전기가 없다 — 우클릭으로 축전지에서 채운다'); return; }
  if(W.axe) toast(T.n+' — 나무 줄기를 보고 좌클릭을 누르고 있으면 벤다(가지를 꺾으려면 손을 비울 것)');
  else if(W.pick) toast(T.n+' — 광석·암석을 보고 좌클릭을 누르고 있으면 캔다');
}
/* 우클릭 — 축전지로 채우는 물건(전등·드릴)을 지닌 축전지에서 채운다 */
const chargeable=T=>!!(T&&T.tool&&(T.tool.lamp||T.tool.drill));
function chargeHeld(){
  const e=equippedTool(), T=e&&ITEMS[e.id];
  if(!chargeable(T)) return;
  if(e.dur>=T.durMax){ toast(T.n+' — 이미 가득 찼다'); return; }
  if(!drawFromBattery(e)) toast('축전지가 없다 — 발전기 곁에서 좌클릭으로 채운다');
}
function attack(){
  /* 그물은 무기가 아니라서 equippedWeapon() 이 걸러낸다 — 손에 든 것을 먼저 본다 */
  const hand=equippedTool(), HT=hand&&ITEMS[hand.id].tool;
  if(HT&&HT.net){ if(ATK.cd<=0) castNet(hand,HT); return; }
  const w=equippedWeapon();
  const W=w&&ITEMS[w.id].tool;
  if(!w || ATK.cd>0) return;
  if(PL.stam<(W.stam||9)) return;
  if(W.gun){ shoot(w,W); return; }
  if(W.throw){ throwGrenade(w,W); return; }
  ATK.cd=W.rate;
  ATK.swing=Math.min(0.30,W.rate*0.55);      // 빠른 무기는 모션도 짧아야 겹치지 않는다
  ATK.swingMax=ATK.swing;
  PL.stam=clamp(PL.stam-(W.stam||9),0,100);

  // 시선 방향 원뿔 판정 — 사거리 안, 정면 40° 이내
  const fx=-Math.sin(PL.yaw), fz=-Math.cos(PL.yaw);
  let hit=null, bd=W.reach;
  for(const c of CREATURES){
    if(c.hp<=0) continue;
    const dx=c.x-PL.pos.x, dz=c.z-PL.pos.z, d=Math.hypot(dx,dz);
    if(d>bd+(c.r||0.5)) continue;
    if((dx/d)*fx+(dz/d)*fz<0.77) continue;
    if(Math.abs((c.y||0)-PL.pos.y)>2.2) continue;
    bd=d; hit=c;
  }
  if(hit&&hit.fish){
    /* 물고기는 작살이라야 박힌다 — 칼·도끼·창은 물살에 밀린다. 작살 등급이 물고기 등급보다 낮으면 튕긴다 */
    const S=hit.sp, have=W.harpoon||0;
    hit.g.flee=2.6;
    if(have<S.tier){
      toast(have?(S.n+' — '+ITEMS[w.id].n+'로는 안 박힌다(등급 '+S.tier+' 작살이 있어야 한다)')
                :(S.n+' — 물고기는 작살이라야 잡힌다'));
      sfx('thrust'); invDirty=true; return;
    }
  }
  if(hit){
    hit.hp-=W.dmg;
    /* 해머는 맞은 것을 잠깐 멈춰 세운다. c.stun 은 '굳어 있는 남은 시간' 하나로,
       개체의 경직도 여기에 넣는다 — 둘이 같은 시계를 쓰고 서로 더해진다.
       개체 AI 는 c.stun>0 이면 움직이지도 모션을 진행하지도 않으면 된다. */
    if(W.stun) hit.stun=(hit.stun||0)+W.stun;
    if(W.burn && hit.hp>0) setBurn(hit,W.burn);
    w.dur-=1;
    if(w.dur<=0){ toast(ITEMS[w.id].n+' 파손'); invRemove(INV.slots.indexOf(w),1); EQUIP=null; }
    toast(hit.hp<=0?'쓰러뜨렸다':(W.stun?'명중 — 기절':(hit.burn?'명중 — 화상':'명중')));
    sfx('thrust');
  }else{ toast('허공을 갈랐다'); sfx('thrust'); }
  invDirty=true;
}
/* 화상 — c.burn = {t 남은 시간, acc 지난 틱 뒤 흐른 시간, every, dmg}. **겹치지 않는다**:
   타는 동안 또 맞으면 남은 시간만 처음 길이로 되돌리고 틱 시계(acc)는 그대로 둔다 —
   그래서 0.1초에 5 라는 빠르기는 몇 번을 베어도 안 바뀐다. 틱은 흐른 시간으로 센다
   (프레임이 길어도 같은 수가 든다). 불에 타지 않는 것(`fireproof` — 애쉬스케일)은 안 탄다. */
function setBurn(c,B){
  if(c.fireproof) return;
  if(c.burn) c.burn.t=B.t;
  else c.burn={t:B.t, acc:0, every:B.every, dmg:B.dmg};
}
function burnTick(c,dt){
  const b=c.burn;
  if(c.hp<=0){ c.burn=null; return; }
  const s=Math.min(dt,b.t);
  b.t-=s; b.acc+=s;
  while(b.acc>=b.every-1e-6 && c.hp>0){ b.acc-=b.every; c.hp-=b.dmg; }
  if(b.t<=1e-6) c.burn=null;
}
/* 휘두르는 결 — 창은 찌르고, 검·도끼는 베고, 해머는 내리친다 */
function updateWeapon(dt){
  if(ATK.cd>0) ATK.cd=Math.max(0,ATK.cd-dt);
  /* 연사 — 누르고 있는 동안 쿨이 끝날 때마다 한 발씩. 방아쇠를 딸깍이는
     것이 아니라 노리쇠가 제 힘으로 도는 총이다(tool.auto). */
  if(useDown && !BUILD.on && ATK.cd<=0 && !paused && !uiOpen()
     && document.pointerLockElement===cv){
    const w=equippedWeapon();
    if(w && ITEMS[w.id].tool.auto && !(HARV.mode&&HARV.mode.tool) && !facing()) attack();
  }
  if(NET.cd>0) NET.cd=Math.max(0,NET.cd-dt);
  updateReload(dt); updateGrenades(dt); updateRockets(dt); updateScope(dt);
  if(ATK.flash>0){
    ATK.flash-=dt;
    if(ATK.flash<=0 && weaponFx && weaponFx.userData.flash)
      weaponFx.userData.flash.visible=false;
  }
  if(tracerT>0){
    tracerT-=dt;
    tracer.material.opacity=Math.max(0,tracerT/0.09)*0.85;
    if(tracerT<=0) tracer.visible=false;
  }
  // 맞은 개체의 기절도 여기서 푼다
  for(const c of CREATURES) if(c.stun>0) c.stun=Math.max(0,c.stun-dt);
  if(!paused) for(const c of CREATURES) if(c.burn) burnTick(c,dt);
  // 무기뿐 아니라 손에 든 도구는 다 보인다
  const w=equippedTool();
  setWeaponFx(w?w.id:null);
  if(!weaponFx) return;
  const W=ITEMS[w.id].tool||{};
  const dur=ATK.swingMax||0.30;
  let p=ATK.swing>0 ? 1-ATK.swing/dur : 0;
  if(ATK.swing>0) ATK.swing=Math.max(0,ATK.swing-dt);
  let style=W.swing;
  const drilling=!!W.drill&&HARV.active;
  if(!W.weapon){                                // 도끼·곡괭이는 캐는 동안 내리친다 — 드릴은 아래에서 따로
    style='smash';
    if(HARV.active&&(W.axe||W.pick)&&!W.drill){ HOLD_T+=dt; p=(HOLD_T*1.3)%1; } else { HOLD_T=0; p=0; }
  }
  const H=WEAPON_HOME, o=swingPose(style,p);
  /* 드릴 — 휘두르지 않는다. 0.25초에 걸쳐 앞으로 밀어 대고(DRILL_K), 대는 동안 잘게 떨며 날이 돈다 */
  DRILL_K=clamp(DRILL_K+(drilling?dt:-dt)/0.25,0,1);
  if(DRILL_K>0){ const k=wease(DRILL_K), t=performance.now()*0.001;
    o.pz-=0.16*k; o.py+=0.03*k; o.rx-=0.12*k;
    if(drilling){ o.px+=Math.sin(t*97)*0.003; o.py+=Math.sin(t*131+1.3)*0.003; } }
  const sp=weaponFx.userData.spin;
  if(sp&&drilling) sp.rotation.y=(sp.rotation.y+dt*60)%(Math.PI*2);
  const rs=weaponFx.userData.rest;
  if(rs){ o.rx+=rs.rx-WRX; o.rz+=rs.rz-WRZ; }    // 세워 드는 것(횃불·등잔·그물·먹을 것)
  if(USE_T>0){                                 // 먹고 마시기 — 입으로 가져간다
    const k=Math.sin(clamp(1-USE_T/USE_DUR,0,1)*Math.PI);
    USE_T=Math.max(0,USE_T-dt);
    o.px-=0.26*k; o.py+=0.20*k; o.pz+=0.22*k; o.rx+=(ITEMS[w.id].drink?0.9:0.35)*k;
  }
  if(RELOAD.t>0){                              // 재장전 — 총을 내리고 노리쇠를 젖힌다
    const R=W.reload||1;
    const k=Math.sin(clamp(1-RELOAD.t/R,0,1)*Math.PI);
    o.rx+=0.55*k; o.py-=0.20*k; o.rz+=0.35*k;
  }
  weaponFx.position.set(H.x+o.px, H.y+o.py, H.z+o.pz);
  weaponFx.rotation.set(o.rx,o.ry,o.rz);
}
