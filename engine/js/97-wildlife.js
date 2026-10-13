/* 97-wildlife.js — CASTAWAY
   숲의 작은 것들 — 새(떼 · 둥지 · 알) · 새총 · 나무 오르기 · 벌집과 꿀 · 나비·반딧불이·잠자리
   (island_world.html 이 이 차례로 읽는다 — 차례와 묶음은 CODEMAP.md 에 있다) */
"use strict";

/* ============================================================================
   숲의 작은 것들
   ----------------------------------------------------------------------------
   ① **새** — 숲 위를 떼 지어 돈다(`WILD.flocks` · 인스턴스 하나에 몸통과 날개 두 장). 참나무·전나무 열네 그루에 하나꼴로
      **둥지**가 있고(나무의 해시로 정한다 — 같은 섬 같은 나무), 둥지에는 알이 한둘 든다. 둥지는 줄기 높은 데 있어
      **나무를 올라야** 닿는다. 알은 이틀 뒤 다시 찬다.
   ② **새총** — 손에 들고 좌클릭하면 지닌 돌멩이를 쏜다. 나는 새에 맞으면 새고기와 깃털이 떨어진다(총·활로 쏴도 맞는다 — `wildShot`).
   ③ **나무 오르기** — 참나무·전나무 줄기 앞에서 줄기를 보고 Space. W·S 로 오르내리고 A·D 로 줄기를 돈다. Space 로 뛰어내린다.
      오르는 동안 기력이 닳고, 다하면 떨어진다.
   ④ **벌집** — 참나무 스물여섯 그루에 하나꼴로 줄기 2 m 높이에 달린다. 토기를 지니고 좌클릭하면 꿀단지를 얻는다.
      불 붙인 횃불을 들지 않았으면 벌에 쏘인다. 사흘 뒤 다시 찬다.
   ⑤ **벌레** — 보기 좋으라고만 있다: 낮의 풀밭엔 나비, 밤의 숲과 늪엔 반딧불이, 물가엔 잠자리. 사람 둘레 28 m 에 점으로 날린다.
   자리는 전부 나무의 해시라 섬 생성·저장 형식을 건드리지 않는다. 꺼낸 알·딴 꿀의 자리는 식생의 `FLORA.taken` 에 같이 적힌다(저장된다).
   ========================================================================== */
const WILD={nestIM:null, hiveIM:null, birdIM:null, bugs:null, cx:1e9, cz:1e9, picks:[], nests:[], hives:[],
            flocks:[], perched:[], bugN:140, t:0, hint:false};
const CLIMB={on:false, p:null, ang:0, h:0, top:0, sp:false};
const isNestTree=p=>(p.k==='oak'||p.k==='fir')&&!p.felled&&((p._hash>>>11)%14)===0;
const isHiveTree=p=>p.k==='oak'&&!p.felled&&((p._hash>>>15)%26)===0&&!isNestTree(p);
const nestH=p=>(p.k==='oak'?4.4:5.6)*p.s;            // 둥지 높이 — 큰 가지가 갈라지는 자리

function wildInit(){
  const brown=[0.34,0.26,0.17], straw=[0.62,0.52,0.30];
  /* 둥지 — 잔가지를 둥글게 엮은 그릇에 알 둘 */
  { const parts=[{g:SHP.lathe([[0.02,0.02],[0.20,0.00],[0.27,0.07],[0.25,0.13],[0.17,0.10],[0.02,0.06]],10),c:brown,c2:straw}];
    for(let i=0;i<2;i++) parts.push({g:new THREE.SphereGeometry(0.045,8,6),x:i?0.05:-0.05,y:0.105,z:i?0.02:-0.02,sy:1.25,c:[0.90,0.88,0.80]});
    const m=new THREE.MeshLambertMaterial({vertexColors:true});
    WILD.nestIM=new THREE.InstancedMesh(SHP.merge(parts),m,60); }
  /* 벌집 — 줄기에 매달린 누런 덩이 */
  { const g=SHP.merge([{g:SHP.lathe([[0.02,0.52],[0.14,0.46],[0.21,0.30],[0.20,0.14],[0.12,0.03],[0.02,0.00]],10),c:[0.52,0.40,0.16],c2:[0.78,0.62,0.24]}]);
    WILD.hiveIM=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({vertexColors:true}),40); }
  /* 새 — 몸통(앞이 +Z)과 날개 두 장. 날개는 정점 색의 빨강 칸에 '날개 끝' 표시를 실어 셰이더가 퍼덕이게 한다 */
  { const body=SHP.blob(0.09,7,{w:8,h:6,amp:0.05,sz:2.4,sy:0.85});
    const wing=s=>{ const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,0.02,0.10, s*0.42,0.02,0.02, 0,0.02,-0.10]),3));
      g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array([0,1,0,0,1,0,0,1,0]),3)); return g; };
    const g=SHP.merge([{g:body,c:[0.20,0.20,0.22]},{g:wing(1),c:[0.26,0.26,0.30]},{g:wing(-1),c:[0.26,0.26,0.30]}]);
    const m=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
    m.onBeforeCompile=sh=>{ sh.uniforms.uWT=WILD_U.t;
      sh.vertexShader='uniform float uWT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        { float ph=0.0;
          #ifdef USE_INSTANCING
            ph=instanceMatrix[3].x*1.7+instanceMatrix[3].z*2.3;
          #endif
          transformed.y+=abs(transformed.x)*sin(uWT*14.0+ph)*0.9; }`); };
    m.customProgramCacheKey=()=>'bird';
    WILD.birdIM=new THREE.InstancedMesh(g,m,80); }
  for(const im of [WILD.nestIM,WILD.hiveIM,WILD.birdIM]){
    im.setColorAt(0,new THREE.Color(1,1,1)); im.count=0; im.frustumCulled=false; im.userData.lightRole='recv';
    im.matrixAutoUpdate=false; im.updateMatrix(); scene.add(im); }
  /* 벌레 — 점 한 무더기(나비 · 반딧불이 · 잠자리 · 벌). 반딧불이가 밤에 빛나야 해서 조명을 안 받는 점 재질이다 */
  { const g=new THREE.BufferGeometry(), n=WILD.bugN;
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));
    g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3),3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:0.045,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:0.95,depthWrite:false}));
    pts.frustumCulled=false; pts.userData.lightRole='none'; scene.add(pts);
    WILD.bugs={pts, st:Array.from({length:n},()=>({x:0,y:-999,z:0,k:0,ph:Math.random()*6.28,life:0}))}; }
}
const WILD_U={t:{value:0}};
const _wM=new THREE.Matrix4(), _wQ=new THREE.Quaternion(), _wE=new THREE.Euler(), _wV=new THREE.Vector3(), _wS=new THREE.Vector3(1,1,1);

/* 사람 둘레 70 m 의 둥지·벌집을 세운다(10 m 넘게 움직이면 다시) */
function wildScatter(){
  const px=PL.pos.x, pz=PL.pos.z; WILD.cx=px; WILD.cz=pz;
  WILD.picks.length=0; WILD.nests.length=0; WILD.hives.length=0;
  let nn=0, nh=0;
  for(const t of TREE_TILES){
    const dx=t.cx-px, dz=t.cz-pz; if(dx*dx+dz*dz>(70+t.r)*(70+t.r)) continue;
    for(const p of t.ps){
      const ddx=p.x-px, ddz=p.z-pz; if(ddx*ddx+ddz*ddz>70*70) continue;
      if(isNestTree(p)&&nn<WILD.nestIM.instanceMatrix.count){
        const a=((p._hash>>>3)%628)/100, r=0.34*p.s, y=p.y+nestH(p);
        _wE.set(0,a,0); _wQ.setFromEuler(_wE); _wV.set(p.x+Math.cos(a)*r,y,p.z+Math.sin(a)*r); _wM.compose(_wV,_wQ,_wS);
        WILD.nestIM.setMatrixAt(nn++,_wM);
        WILD.nests.push({p,x:_wV.x,y,z:_wV.z});
        WILD.picks.push({kind:'egg',x:_wV.x,y:y+0.1,z:_wV.z,key:'E'+p._hash,r:0.3,tree:false});
      }else if(isHiveTree(p)&&nh<WILD.hiveIM.instanceMatrix.count){
        const a=((p._hash>>>5)%628)/100, r=0.66*p.s, y=p.y+1.75;
        _wE.set(0,a,0); _wQ.setFromEuler(_wE); _wV.set(p.x+Math.cos(a)*r,y,p.z+Math.sin(a)*r); _wM.compose(_wV,_wQ,_wS);
        WILD.hiveIM.setMatrixAt(nh++,_wM);
        WILD.hives.push({x:_wV.x,y:y+0.25,z:_wV.z});
        WILD.picks.push({kind:'honey',x:_wV.x,y:y+0.25,z:_wV.z,key:'H'+p._hash,r:0.3,tree:false});
      }
    }
  }
  WILD.nestIM.count=nn; WILD.nestIM.instanceMatrix.needsUpdate=true;
  WILD.hiveIM.count=nh; WILD.hiveIM.instanceMatrix.needsUpdate=true;
}
/* 새 떼 — 사람 둘레 숲 위를 원을 그리며 돈다. 맞아서 줄어든 떼는 멀어지면 새 떼로 바뀐다 */
function wildFlocks(dt){
  const px=PL.pos.x, pz=PL.pos.z, day=hourOfDay>5.5&&hourOfDay<19.5;
  while(WILD.flocks.length<4){
    const a=Math.random()*6.283, d=40+Math.random()*90, x=px+Math.cos(a)*d, z=pz+Math.sin(a)*d;
    WILD.flocks.push({x,z,y:Math.max(heightAt(x,z),0)+16+Math.random()*16,r:9+Math.random()*12,w:(Math.random()<0.5?-1:1)*(0.25+Math.random()*0.25),
      ph:Math.random()*6.28,dx:(Math.random()-0.5)*2,dz:(Math.random()-0.5)*2,n:4+((Math.random()*5)|0),dead:[]});
  }
  let n=0; const im=WILD.birdIM;
  for(let i=WILD.flocks.length-1;i>=0;i--){ const f=WILD.flocks[i];
    f.ph+=f.w*dt; f.x+=f.dx*dt; f.z+=f.dz*dt;
    const far=Math.hypot(f.x-px,f.z-pz);
    if(far>190||(!day&&far>60)){ WILD.flocks.splice(i,1); continue; }       // 멀어졌거나 밤이 됐다 — 떠난다
    for(let k=0;k<f.n;k++){ if(f.dead[k]||!day||n>=im.instanceMatrix.count) continue;
      const a=f.ph+k*6.283/f.n+Math.sin(f.ph*0.7+k)*0.3, rr=f.r*(0.8+0.25*Math.sin(k*1.7+f.ph));
      const x=f.x+Math.cos(a)*rr, z=f.z+Math.sin(a)*rr, y=f.y+Math.sin(f.ph*1.3+k*2.1)*1.6;
      _wE.set(0,-a-(f.w>0?0:Math.PI),(f.w>0?-0.35:0.35)); _wQ.setFromEuler(_wE); _wV.set(x,y,z); _wM.compose(_wV,_wQ,_wS);
      im.setMatrixAt(n++,_wM); (f.pos||(f.pos=[]))[k]=[x,y,z]; }
  }
  im.count=n; im.instanceMatrix.needsUpdate=true;
}
/* 쏜 것이 새에 맞았나 — 눈에서 뻗은 줄에서 0.8 m 안으로 지나는 가장 가까운 새를 떨어뜨린다(새총 · 총 · 활이 부른다) */
function wildShot(reach){
  const o=camera.position, cp=Math.cos(PL.pitch), dx=-Math.sin(PL.yaw)*cp, dy=Math.sin(PL.pitch), dz=-Math.cos(PL.yaw)*cp;
  let best=null, bt=reach;
  for(const f of WILD.flocks){ if(!f.pos) continue;
    for(let k=0;k<f.n;k++){ const q=f.pos[k]; if(!q||f.dead[k]) continue;
      const vx=q[0]-o.x, vy=q[1]-o.y, vz=q[2]-o.z, t=vx*dx+vy*dy+vz*dz; if(t<1||t>bt) continue;
      const ex=vx-dx*t, ey=vy-dy*t, ez=vz-dz*t;
      if(ex*ex+ey*ey+ez*ez<0.8*0.8+t*t*0.0004){ bt=t; best=[f,k]; } } }
  if(!best) return false;
  best[0].dead[best[1]]=true;
  const meat=invAdd('bird_raw',1), fe=invAdd('feather',2);
  toast('새를 맞혔다 — '+(meat?'새고기 +1 ':'')+(fe?'깃털 +2':'')+((meat||fe)?'':'무거워서 줍지 못했다')); sfx('bind'); invDirty=true;
  return true;
}
/* 새총 — 지닌 돌멩이 하나를 쏜다 */
function slingShot(e,W){
  if(ATK.cd>0) return;
  const i=INV.slots.findIndex(s=>s.id==='pebble');
  if(i<0){ toast('쏠 돌멩이가 없다'); return; }
  invRemove(i,1); invDirty=true;
  ATK.cd=W.rate; ATK.swing=0.22; ATK.swingMax=0.22; PL.stam=clamp(PL.stam-(W.stam||4),0,100);
  e.dur-=1; sfx('bind');
  if(!wildShot(W.reach)) { /* 빗나갔다 — 돌은 날아가 버린다 */ }
  if(e.dur<=0){ toast(ITEMS[e.id].n+' 파손'); invRemove(INV.slots.indexOf(e),1); EQUIP=null; }
}
/* 벌레 — 낮의 풀밭엔 나비, 밤의 숲·늪엔 반딧불이, 물가엔 잠자리, 벌집 둘레엔 벌 */
const BUG_C=[[0,0,0],[1.0,0.86,0.30],[0.75,1.0,0.35],[0.45,0.80,1.0],[0.95,0.75,0.15],[1.0,0.55,0.75],[0.92,0.92,0.98]];
function wildBugs(dt){
  const B_=WILD.bugs, P=B_.pts.geometry.attributes.position, C=B_.pts.geometry.attributes.color, px=PL.pos.x, pz=PL.pos.z;
  const night=hourOfDay<5.2||hourOfDay>19.6, t=WILD.t;
  for(let i=0;i<B_.st.length;i++){ const s=B_.st[i];
    s.life-=dt;
    const dd=(s.x-px)*(s.x-px)+(s.z-pz)*(s.z-pz);
    if(s.life<=0||dd>30*30||s.k===0){                // 다시 태어난다 — 그 자리의 바이옴과 시각에 맞는 벌레로
      s.k=0; s.y=-999;
      if(i<16&&WILD.hives.length){ const h=WILD.hives[i%WILD.hives.length]; s.x=h.x; s.y=h.y; s.z=h.z; s.k=4; s.life=6+Math.random()*6; s.bx=h.x; s.by=h.y; s.bz=h.z; }
      else{ const a=Math.random()*6.283, d=3+Math.random()*24, x=px+Math.cos(a)*d, z=pz+Math.sin(a)*d, sm=sampleAt(x,z);
        if(sm.elev>0.3){ const g=heightAt(x,z), wet=sm.river||sm.biome===B.MARSH||F.dRiver[IDX(clamp(Math.round(x/CELL+N/2),1,N-2),clamp(Math.round(z/CELL+N/2),1,N-2))]<12;
          if(night){ if(sm.biome===B.BROADLEAF||sm.biome===B.CONIFER||sm.biome===B.MARSH||sm.biome===B.MEADOW){ s.k=2; s.y=g+0.4+Math.random()*2.2; } }
          else if(wet){ s.k=3; s.y=g+0.6+Math.random()*1.2; }
          else if(sm.biome===B.MEADOW||sm.biome===B.BROADLEAF||sm.biome===B.SCRUB){ s.k=Math.random()<0.5?1:(Math.random()<0.5?5:6); s.y=g+0.4+Math.random()*1.3; }
          if(s.k){ s.x=x; s.z=z; s.life=8+Math.random()*14; s.gy=g; } } }
    }
    if(s.k){
      if(s.k===4){ s.x=s.bx+Math.sin(t*5+s.ph)*0.45; s.y=s.by+Math.sin(t*7+s.ph*2)*0.32; s.z=s.bz+Math.cos(t*6+s.ph*1.3)*0.45; }       // 벌 — 벌집 둘레를 맴돈다
      else if(s.k===2){ s.x+=Math.sin(t*0.7+s.ph)*0.25*dt; s.z+=Math.cos(t*0.6+s.ph*1.4)*0.25*dt; s.y+=Math.sin(t*0.9+s.ph)*0.15*dt; }  // 반딧불이 — 느리게 뜬다
      else if(s.k===3){ s.x+=Math.sin(t*1.9+s.ph)*2.4*dt; s.z+=Math.cos(t*1.6+s.ph*1.7)*2.4*dt; }                                         // 잠자리 — 빠르게 휙휙
      else{ s.x+=Math.sin(t*1.3+s.ph)*0.9*dt; s.z+=Math.cos(t*1.1+s.ph*1.6)*0.9*dt; s.y=s.gy+0.7+0.5*Math.sin(t*2.3+s.ph); }              // 나비 — 팔랑팔랑
    }
    P.array[i*3]=s.x; P.array[i*3+1]=s.y; P.array[i*3+2]=s.z;
    const c=BUG_C[s.k]||BUG_C[0], k=s.k===2?(0.35+0.65*Math.max(0,Math.sin(t*2.2+s.ph*3))):(s.k===4?0.9:(0.75+0.25*Math.sin(t*16+s.ph)));
    C.array[i*3]=c[0]*k; C.array[i*3+1]=c[1]*k; C.array[i*3+2]=c[2]*k;
  }
  P.needsUpdate=true; C.needsUpdate=true;
}

/* ── 나무 오르기 ─────────────────────────────────────────────────────────── */
/* 눈앞의 오를 나무 — 1.6 m 안의 참나무·전나무 줄기를 보고 있을 때 */
function climbLook(){
  if(PL.swim||uiOpen()||BUILD.on) return null;
  const hx=-Math.sin(PL.yaw), hz=-Math.cos(PL.yaw); let best=null, bd=1.7;
  eachNearProp(PL.pos.x,PL.pos.z,p=>{
    if((p.k!=='oak'&&p.k!=='fir')||p.felled) return;
    const dx=p.x-PL.pos.x, dz=p.z-PL.pos.z, d=Math.sqrt(dx*dx+dz*dz);
    if(d<bd&&d>0.05&&(dx*hx+dz*hz)/d>0.6){ bd=d; best=p; } });
  return best;
}
/* 프레임마다 — 오르는 중이면 몸과 눈을 줄기에 붙여 옮기고 true(걷기 처리를 건너뛴다). updatePlayer 가 맨 먼저 부른다 */
function climbTick(dt){
  const sp=!!keys.Space, tap=sp&&!CLIMB.sp; CLIMB.sp=sp;
  if(!CLIMB.on){
    if(tap&&PL.grounded&&!(invOpen||craftOpen)){ const p=climbLook();
      if(p){ CLIMB.on=true; CLIMB.p=p; CLIMB.h=0.3; CLIMB.top=nestH(p)+0.9; CLIMB.ang=Math.atan2(PL.pos.z-p.z,PL.pos.x-p.x);
        keys.Space=false; toast('나무를 오른다 — W·S 오르내리기 · A·D 줄기 돌기 · Space 뛰어내리기'); } }
    return CLIMB.on;
  }
  const p=CLIMB.p, bag=invOpen||craftOpen;
  const up=bag?0:((keys.KeyW?1:0)-(keys.KeyS?1:0)), turn=bag?0:((keys.KeyD?1:0)-(keys.KeyA?1:0));
  CLIMB.h=clamp(CLIMB.h+up*1.5*dt,0,CLIMB.top); CLIMB.ang+=turn*1.4*dt;
  PL.stam=clamp(PL.stam-(up?4.5:1.2)*dt,0,100);
  const rad=((p.k==='oak'?0.46:0.40)*p.s)+0.34;
  PL.pos.set(p.x+Math.cos(CLIMB.ang)*rad,p.y+CLIMB.h,p.z+Math.sin(CLIMB.ang)*rad); PL.vel.set(0,0,0); PL.grounded=false; PL.swim=false;
  PL.camY=PL.pos.y; PL.eye+=(EYE-PL.eye)*clamp(10*dt,0,1);
  camera.position.set(PL.pos.x,PL.pos.y+PL.eye,PL.pos.z); camera.rotation.set(PL.pitch,PL.yaw,0,'YXZ');
  const off=tap||PL.stam<=0||p.felled||(CLIMB.h<=0&&up<0);
  if(off){ CLIMB.on=false; if(PL.stam<=0) toast('기력이 다해 손을 놓쳤다');
    PL.pos.x+=Math.cos(CLIMB.ang)*0.35; PL.pos.z+=Math.sin(CLIMB.ang)*0.35; PL.vel.y=tap?2.5:0; return false; }   // 줄기에서 떨어져 떨어진다(높으면 다친다)
  return true;
}

function updateWildlife(dt){
  if(!scene||typeof TREE_TILES==='undefined') return;
  if(!WILD.nestIM) wildInit();
  WILD.t+=dt; WILD_U.t.value=WILD.t;
  const dx=PL.pos.x-WILD.cx, dz=PL.pos.z-WILD.cz;
  if(dx*dx+dz*dz>100) wildScatter();
  wildFlocks(dt); wildBugs(dt);
  if(!WILD.hint&&!CLIMB.on&&landed&&climbLook()){ WILD.hint=true; toast('나무 줄기를 보고 Space — 나무를 오른다(둥지는 높은 데 있다)'); }
}
function wildReset(){ WILD.cx=WILD.cz=1e9; WILD.flocks.length=0; WILD.picks.length=0; CLIMB.on=false; WILD.hint=false; }
