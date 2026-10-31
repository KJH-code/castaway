/* ── 땅 위를 가린다 — 땅속 세계에 완전히 들어가 있는 동안 ─────────────────────
   (사용자 요청 2026-10-30 — "지하 통로 안에 있을 때는 나무를 로드 안 되게 하면 성능 좋을 것")
   땅속(96-underworld.js)에 들어가 있어도 땅 위의 나무·바위·풀·땅·물을 다 그리고 있었다. 눈에 안 보이는 것을 그리는 값이다.
   · SURF.when — 숨길 조건 함수들. 하나라도 참이면 숨긴다. 얕은 땅속 굴(지형 판 10)이 오면 조건만 더한다.
   · surfTick(dt) — 99-main.js loop 가 updateUnder 다음에 부른다. SURF.hide 를 정한다. 숨김이 풀리는 순간 나무 칸 보이기와 식생을 곧바로 다시 세게 한다.
   · surfMask()/surfUnmask(s) — renderFrame(45-sky.js)이 scene 을 그리는 동안만 목록의 visible 을 끈다. 다른 모듈이 프레임마다 visible 을
     바꾸므로(먼 굴 · 암벽 칸 · 식생 단계) 한 번 꺼 두지 않고 그릴 때마다 끄고 되돌린다. 셰이더·광원은 안 건드린다(재질을 다시 짜지 않는다).
   · 빛(isLight)과 빛을 자식으로 품은 것의 visible 은 바꾸지 않는다 · propGroup 은 그룹 자체만 가린다(자식의 visible 은 접근자).
   · 숨긴 동안 건너뛰는 갱신은 그리기 전용인 것만 99-main.js 에서 조건을 단다(docs/notes/perf.md).
   땅 위에 새 메시 계통을 만들면 surfList 가 찾는지 볼 것(scene 에 바로 붙고, 아래 뿌리 객체에서 닿아야 한다). */
const SURF={hide:false, when:[], list:[], t:0, vis:[], n:0};
SURF.when.push(()=>typeof UNDER!=='undefined'&&UNDER.ok&&PL.under&&UNDER.u>=0.999&&!UNDER.rope&&!flyMode&&!PL.dead);   // 땅속 세계에 완전히 들어가 있다(flyMode — 개발자 날기는 카메라가 땅 위일 수 있다)

/* 뿌리 객체에서 scene 에 바로 붙은 Object3D 를 찾는다 — 모듈마다 메시를 담는 자리가 달라 얕게 훑는다. 수만 개짜리 표는 건너뛴다 */
const SURF_SKIP=new Set(['picks','cols','taken','grid','list','boxes','cg','ix','look','drift','schools','flocks','perched','nests','hives','fallen','pools','geysers','P','tl','kn','pend','ref','sites','U']);
function surfWalk(o,out,seen,d){
  if(!o||typeof o!=='object'||seen.has(o)||d>6||seen.size>40000) return;
  seen.add(o);
  if(o.isObject3D){ if(o.parent===scene) out.push(o); return; }
  if(o.isMaterial||o.isBufferGeometry||o.isTexture||o.isVector3||o.isMatrix4||o.isColor) return;
  if(o instanceof Map){ for(const v of o.values()) surfWalk(v,out,seen,d+1); return; }
  if(Array.isArray(o)){ if(o.length>4000) return; for(const v of o) surfWalk(v,out,seen,d+1); return; }
  for(const k in o){ if(SURF_SKIP.has(k)) continue; const v=o[k]; if(v&&typeof v==='object') surfWalk(v,out,seen,d+1); }
}
function surfList(){
  const out=[], seen=new Set(), roots=[];
  const T=v=>{ if(v) roots.push(v); };
  if(typeof TERR_BLK!=='undefined') for(const B of TERR_BLK) T(B&&B.m);
  if(typeof TPATCH!=='undefined') T(TPATCH.m);
  if(typeof ocean!=='undefined') T(ocean);
  if(typeof riverMesh!=='undefined') T(riverMesh);
  if(typeof RUBBLE!=='undefined') T(RUBBLE.mesh);
  if(typeof shipMesh!=='undefined') T(shipMesh);
  if(typeof rainMesh!=='undefined') T(rainMesh);
  if(typeof BOATS!=='undefined') for(const b of BOATS) T(b&&b.m);
  if(typeof CAVE_MESH!=='undefined') T(CAVE_MESH);
  if(typeof CRAG!=='undefined') T(CRAG.tiles);
  if(typeof FOAM!=='undefined') T(FOAM);
  if(typeof FLORA!=='undefined') T(FLORA);
  if(typeof GIANT!=='undefined') T(GIANT);
  if(typeof COAST!=='undefined') T(COAST.meshes);
  if(typeof GEOT!=='undefined') T(GEOT.meshes), T(GEOT.steam), T(GEOT.spray);
  if(typeof FALLS!=='undefined') T(FALLS.meshes), T(FALLS.fish), T(FALLS.mist);
  if(typeof TEMPLE!=='undefined') T(TEMPLE.meshes), T(TEMPLE.glow);
  if(typeof SEA!=='undefined') T(SEA.m);
  if(typeof REEF!=='undefined') T(REEF.m);
  if(typeof FISH!=='undefined') T(FISH.mesh), T(FISH.shad);
  if(typeof WILD!=='undefined') T(WILD.nestIM), T(WILD.hiveIM), T(WILD.birdIM), T(WILD.bugs), T(WILD.bugIM);
  if(typeof DEWD!=='undefined') T(DEWD.mesh);
  for(const r of roots) surfWalk(r,out,seen,0);
  const res=[];
  for(const o of out){
    if(o===UNDER.grp||o===UNDER.pitGrp||o===camera||o===propGroup) continue;
    let lit=false; o.traverse(c=>{ if(c.isLight) lit=true; });
    if(!lit) res.push(o);
  }
  if(typeof propGroup!=='undefined'&&propGroup) res.push(propGroup);      // 그룹 자체만 — 자식은 건드리지 않는다
  return res;
}

/* 숨길지 정한다 — 숨김이 시작될 때 목록을 만들고, 숨긴 동안 1초(누적 dt)마다 다시 만든다 */
function surfTick(dt){
  dt=dt||0;
  let h=false; for(const f of SURF.when) if(f()){ h=true; break; }
  if(h&&!SURF.hide){ SURF.hide=true; SURF.list=surfList(); SURF.t=0; }
  else if(h){ SURF.t+=dt; if(SURF.t>=1){ SURF.t=0; SURF.list=surfList(); } }
  else if(SURF.hide){
    SURF.hide=false; SURF.list=[]; SURF.t=0;
    if(typeof qualApply==='function') qualApply();       // 나무 칸 보이기(_tvForce)와 식생(FLORA.far/near.cx)을 곧바로 다시 센다
  }
}
/* 그리기 앞뒤 — 숨긴 동안만. 되돌릴 값은 SURF.vis 를 다시 쓴다 */
function surfMask(){
  if(!SURF.hide) return null;
  const L=SURF.list, V=SURF.vis, n=L.length;
  for(let i=0;i<n;i++){ const o=L[i]; V[i]=o.visible; o.visible=false; }
  SURF.n=n;
  return SURF;
}
function surfUnmask(s){
  if(!s) return;
  const L=s.list, V=s.vis, n=s.n;
  for(let i=0;i<n;i++) L[i].visible=V[i];
}
