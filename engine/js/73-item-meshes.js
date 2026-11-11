/* ==========================================================================
   손에 드는 것의 모형 — 사용자 모형으로 갈아 끼우기
   사용자 STL → tools/item-mesh.mjs → data-item-meshes.js(ITEM_MESH) — 이 파일이 풀어 WEAPON_FX 를 감싼다.
   · 모형은 도구가 이미 코드 모형(WEAPON_FX)의 좌표에 맞춰 두었다 — 쥐는 자리(grip) · 총구(muzzle) · 세워 들기(rest) ·
     불꽃 크기(tipScale)는 코드 모형이 돌려준 값을 그대로 쓴다.
   · 코드 모형에서 옮겨 다는 것: 총구 불꽃(flash — 그 묶음 그대로) · 불꽃 자리(tip — 빈 점으로) · 바주카 로켓 머리(warhead — 쏘면 숨긴다).
     드릴 날(spin)은 STL 이 한 덩이라 못 돌린다 — 드릴을 갈아 끼우면 날이 안 돈다.
   · 가방 그림(itemIcon)은 WEAPON_FX 를 부르므로 저절로 따라온다. 잿불 무기(emberClad)는 재질마다 메시를 나눠 두어 쇠 메시를 알아본다.
   · 끄기: ITEMMESH.on=false → 다음에 드는 것부터 코드 모형(그림은 ITEM_ICON 을 비워야 다시 그린다)
   ========================================================================== */
const ITEMMESH={on:true, geo:{}, mats:{}};
function itemMeshMat(d){
  if(d.k==='w') return WMAT(d.c);
  const key=JSON.stringify(d);
  return ITEMMESH.mats[key]||(ITEMMESH.mats[key]=d.k==='b'
    ? new THREE.MeshBasicMaterial({color:d.c, side:d.d?THREE.DoubleSide:THREE.FrontSide})
    : new THREE.MeshPhongMaterial({color:d.c, emissive:d.e||0, specular:d.sp, shininess:d.s, side:d.d?THREE.DoubleSide:THREE.FrontSide}));
}
/* 한 아이템의 메시 조각들 — 처음 한 번 풀어 두고 나눠 쓴다(드는 모형 · 가방 그림) */
function itemMeshParts(id){
  if(ITEMMESH.geo[id]) return ITEMMESH.geo[id];
  const out=[];
  for(const p of ITEM_MESH[id].parts){
    const raw=Uint8Array.from(atob(p.b),c=>c.charCodeAt(0)), buf=raw.buffer, nv=p.nv;
    const pb=(nv*6+3)&~3, nb=(nv*3+3)&~3;
    const q=new Uint16Array(buf,0,nv*3), nq=new Int8Array(buf,pb,nv*3);
    const ix=p.i32?new Uint32Array(buf,pb+nb,p.nt*3):new Uint16Array(buf,pb+nb,p.nt*3);
    const c=new THREE.Vector3((p.mn[0]+p.mx[0])/2,(p.mn[1]+p.mx[1])/2,(p.mn[2]+p.mx[2])/2);
    const pos=new Float32Array(nv*3), nrm=new Float32Array(nv*3), cc=[c.x,c.y,c.z];
    for(let i=0;i<nv*3;i++){ const k=i%3;
      pos[i]=p.mn[k]+q[i]/65535*(p.mx[k]-p.mn[k])-cc[k];      // 조각 가운데를 원점으로 — 메시 자리가 그 가운데다(emberClad 가 높이로 고른다)
      nrm[i]=nq[i]/127; }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
    geo.setIndex(new THREE.BufferAttribute(ix,1));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    geo.dispose=()=>{};                                          // 나눠 쓰는 것 — 가방 그림(itemIcon)이 다 그린 뒤 버려도 드는 모형이 다시 올리지 않게
    out.push({geo, c, mat:ITEM_MESH[id].mats[p.m]});
  }
  return ITEMMESH.geo[id]=out;
}
/* 코드 모형 r 을 사용자 모형으로 — 값(grip · muzzle · rest …)은 r 것 그대로 */
function itemMeshFx(id,r){
  const g=new THREE.Group(), src=r.mesh;
  g.position.copy(src.position); g.quaternion.copy(src.quaternion); g.scale.copy(src.scale);
  for(const p of itemMeshParts(id)){ const m=new THREE.Mesh(p.geo,itemMeshMat(p.mat)); m.position.copy(p.c); g.add(m); }
  src.updateMatrixWorld(true);
  const inv=src.matrixWorld.clone().invert();
  for(const name of ['flash','tip','warhead']){
    const o=src.getObjectByName(name); if(!o) continue;
    const M=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);
    let n=o;
    if(name==='tip'){ n=new THREE.Object3D(); n.name='tip'; }       // 불꽃 자리만 — 코드 모형의 횃불 머리는 안 가져온다
    else o.parent.remove(o);
    M.decompose(n.position,n.quaternion,n.scale); g.add(n);
  }
  return Object.assign({},r,{mesh:g});
}
for(const id in ITEM_MESH){
  const f0=WEAPON_FX[id];
  if(!f0){ console.warn('[item-mesh] WEAPON_FX 에 없는 아이템:',id); continue; }
  WEAPON_FX[id]=function(){ const r=f0.apply(this,arguments); return ITEMMESH.on?itemMeshFx(id,r):r; };
}
