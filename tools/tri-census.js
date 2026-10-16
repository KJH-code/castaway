/* 삼각형 셈 — 무엇이 프레임을 먹는지 계통별로 센다(본 장면 · 해 그림자 · 불(점광원) 그림자).
     node tools/probe.mjs island_world.html --run tools/tri-census.js
   상륙(start)해서 네 방위를 보고, 그리기 호출마다 늘어난 삼각형을 그 메시가 속한 계통에 더한다.
   마지막에 그림자 지도를 한 번 억지로 다시 그려(LIGHT.dirty) 그림자 쪽 몫도 센다.
   헤드리스라 GPU 시간은 못 믿지만 삼각형 · 호출 수는 실제 PC 와 같다(같은 시드 · 같은 상륙 자리).
   캠코더가 켜져 있으면 장면은 480 줄로 그려진다 — 화소 몫은 작고 정점 몫이 프레임을 정한다(CLAUDE.md '성능'). */
start(); if(typeof QUAL!=='undefined') QUAL.on=false;          // 자동 품질이 거리를 당기지 않게
gameHours=Math.floor(gameHours/24)*24+12; hourOfDay=12; weaLast=0;   // 한낮 — 해 그림자가 접히지 않게(밤 · 새벽이면 해 그림자는 안 그린다)
const R=renderer, info=R.info.render, wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(8000);                                               // 암벽 · 나무 단계가 뒤늦게 지어진다
function tags(){
  const L=new Map(), tag=(o,k)=>{ if(o&&o.isObject3D) o.traverse(c=>{ if(!L.has(c)) L.set(c,k); }); };
  for(const t of CRAG.tiles.values()) for(const u of (t.sub||[t])){ tag(u.near,'암벽(가까운 단계)'); tag(u.mid,'암벽(가운데 단계)'); tag(u.far,'암벽(먼 단계)'); }
  for(const B of TERR_BLK) tag(B.m,'지형 묶음'); tag(TPATCH.m,'지형 덧판'); tag(ocean,'바다'); tag(riverMesh,'하천');
  for(const t of ROCK_TILES) for(const k in t) if(t[k]&&t[k].isObject3D) tag(t[k],'바위 칸');
  for(const m of CAVE_MESH) tag(m,'동굴'); for(const m of COAST.meshes) tag(m,'바닷가'); for(const m of FALLS.meshes) tag(m,'폭포');
  for(const m of GIANT.meshes) tag(m,'노거수'); tag(GIANT.near,'노거수'); tag(GIANT.far,'노거수');
  tag(FOAM.mesh,'거품'); tag(FOAM.sheet,'거품'); tag(shipMesh,'보급선');
  try{ for(const k in FLORA.m){ const v=FLORA.m[k]; (Array.isArray(v)?v:[v]).forEach(m=>tag(m,'군락 식생')); } }catch(e){}
  return L;
}
let L=tags(), on=false, per={};
const kindOf=o=>{
  let k=L.get(o); if(k) return k;
  for(let p=o.parent;p&&p!==scene;p=p.parent) if(L.has(p)) return L.get(p);
  const m=Array.isArray(o.material)?o.material[0]:o.material, w=m&&m.userData&&m.userData.wind;
  if(o.isInstancedMesh) return (o.parent===propGroup?'소품 칸':'인스턴스')+(w?' · '+w:'');
  return '그 밖 '+(m?m.type.replace('Material',''):'?');
};
const rb=R.renderBufferDirect.bind(R);
R.renderBufferDirect=function(cam,sc,g,m,o,gr){
  const t0=info.triangles; rb(cam,sc,g,m,o,gr);
  if(!on||sc===skyScene) return;
  const pass=m&&m.isMeshDistanceMaterial?'불 그림자':m&&m.isMeshDepthMaterial?'해·손전등 그림자':'본 장면';
  const k=pass+'\t'+kindOf(o), e=per[k]||(per[k]=[0,0]); e[0]++; e[1]+=info.triangles-t0;
};
const out=[], report=title=>{
  const rows=Object.entries(per).sort((a,b)=>b[1][1]-a[1][1]), sum={};
  for(const [k,v] of rows){ const p=k.split('\t')[0], s=sum[p]||(sum[p]=[0,0]); s[0]+=v[0]; s[1]+=v[1]; }
  out.push('== '+title+' — '+Object.entries(sum).map(([p,s])=>`${p} ${s[0]}회 ${(s[1]/1e3)|0}k△`).join(' · '));
  for(const [k,v] of rows.slice(0,14)) out.push(`   ${k.replace('\t',' | ')}  ${v[0]}회  ${(v[1]/1e3).toFixed(0)}k`);
};
for(const [nm,yaw] of [['북',0],['동',-Math.PI/2],['남',Math.PI],['서',Math.PI/2]]){
  PL.yaw=yaw; await wait(5000); L=tags(); per={}; on=true; renderFrame(); on=false; report(nm+'(그림자 지도는 이 프레임에 다시 그린 것만)');
}
/* LIGHT.dirty() 는 불 지도에 곧장 needsUpdate 를 세우고 해 지도는 LIGHT.update 에서 세운다 — 여기선 renderFrame 만 부르니 해 지도도 손으로 */
L=tags(); per={}; LIGHT.dirty(); sun.shadow.needsUpdate=true; on=true; renderFrame(); on=false; report('그림자를 한 번 다시 그릴 때(LIGHT.dirty + 해 지도)');
out.push('불빛 풀: '+LIGHT.pool.map((l,i)=>`#${i} 그림자 ${l.castShadow?'켬':'끔'} · 세기 ${l.intensity.toFixed(2)} · 맡은 불 ${l.userData.who?'있음':'없음'} · far ${l.shadow.camera.far}`).join(' / '));
out.push(`캔버스 ${R.domElement.width}×${R.domElement.height} · 캠코더 ${CAMC.on&&CAMC.lines?CAMC.lines+'줄':'끔'} · 그림자 품질 ${LIGHT.QUAL[LIGHT.q].n}`);
return out.join('\n');
