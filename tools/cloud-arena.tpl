<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>CASTAWAY — 구름 시험장</title>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#0b0e13;
    font:13px/1.5 system-ui,'Malgun Gothic',sans-serif;color:#dfe6ee}
  canvas{display:block}
  #ui{position:fixed;left:10px;top:10px;width:330px;max-height:calc(100% - 20px);
    overflow:auto;background:rgba(14,18,25,.88);border:1px solid #2b3644;
    border-radius:8px;padding:10px 12px;backdrop-filter:blur(4px)}
  #ui h2{margin:0 0 6px;font-size:14px;color:#9fd0ff;font-weight:600}
  .row{display:flex;align-items:center;gap:6px;margin:3px 0}
  .row .nm{flex:1;white-space:nowrap}
  .row .ct{width:52px;text-align:right;color:#8fe0a8;font-variant-numeric:tabular-nums}
  button{background:#1d2836;color:#dfe6ee;border:1px solid #33455c;border-radius:4px;
    padding:2px 7px;cursor:pointer;font:inherit}
  button:hover{background:#27364a}
  button.on{background:#2f5a8a;border-color:#4e86c4}
  .sec{margin-top:9px;padding-top:8px;border-top:1px solid #253040}
  .sl{display:flex;align-items:center;gap:6px;margin:4px 0}
  .sl label{width:74px;color:#9fb2c6}
  .sl input{flex:1}
  .sl .v{width:56px;text-align:right;color:#8fe0a8;font-variant-numeric:tabular-nums}
  #hud{position:fixed;right:10px;top:10px;background:rgba(14,18,25,.8);
    border:1px solid #2b3644;border-radius:8px;padding:8px 11px;text-align:right;
    font-variant-numeric:tabular-nums}
  #hud b{color:#9fd0ff;font-weight:600}
  #tip{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);
    background:rgba(14,18,25,.8);border:1px solid #2b3644;border-radius:6px;
    padding:5px 12px;color:#9fb2c6}
  #toast{position:fixed;left:50%;top:60px;transform:translateX(-50%);
    background:rgba(20,28,38,.92);border:1px solid #3b4f68;border-radius:6px;
    padding:6px 14px;opacity:0;transition:opacity .25s;pointer-events:none}
</style>
</head>
<body>
<canvas id="cv"></canvas>
<div id="ui">
  <h2>구름 시험장</h2>
  <div id="kinds"></div>
  <div class="sec">
    <div class="row">
      <button id="bAll">전부 소환</button>
      <button id="bNone">전부 없애기</button>
      <button id="bAuto" class="on">날씨에 맡김</button>
    </div>
    <div class="row"><button id="bRoll">모양 다시 굴리기 (R)</button>
      <button id="bFront">앞에 세우기 (F)</button>
      <button id="bPause">멈춤 (P)</button></div>
  </div>
  <div class="sec">
    <div class="sl"><label>시각</label><input id="sH" type="range" min="0" max="24"
      step="0.1" value="9"><span class="v" id="vH">9.0시</span></div>
    <div class="sl"><label>배속</label><input id="sT" type="range" min="0" max="4"
      step="1" value="0"><span class="v" id="vT">1배</span></div>
    <div class="sl"><label>구름양</label><input id="sC" type="range" min="0" max="115"
      step="1" value="35"><span class="v" id="vC">자동</span></div>
    <div class="sl"><label>안개</label><input id="sM" type="range" min="-1" max="100"
      step="1" value="-1"><span class="v" id="vM">자동</span></div>
    <div class="sl"><label>짙기 배율</label><input id="sO" type="range" min="10" max="250"
      step="5" value="100"><span class="v" id="vO">1.00×</span></div>
    <div class="sl"><label>여닫는 초</label><input id="sF" type="range" min="1" max="30"
      step="1" value="4"><span class="v" id="vF">4초</span></div>
    <div class="sl"><label>바람</label><input id="sW" type="range" min="0" max="359"
      step="1" value="0"><span class="v" id="vW">0°</span></div>
  </div>
  <div class="sec" style="color:#8ea3ba">
    알갱이 뭉치가 보이는지 확인하려면 <b>F</b> 로 눈앞에 세우고 <b>A/D</b> 로
    옆걸음질 쳐 볼 것 — 앞뒤 알갱이가 어긋나 움직이면 깊이가 살아 있는 것이다.
  </div>
</div>
<div id="hud"></div>
<div id="tip">마우스 눌러 둘러보기 · <b>WASD</b> 날기 · <b>Space/Shift</b> 위아래 ·
  <b>Esc</b> 마우스 풀기</div>
<div id="toast"></div>
<script src="three.min.js"></script>
<script>
/* ══════════════════════════════════════════════════════════════════════════
   구름 시험장 — 본편(`island_world.html`)의 하늘·구름·날씨 코드를 그대로 옮겨
   놓고, 갈래마다 손으로 소환하고 없앨 수 있게 손잡이만 달았다.

   본편 코드에 낸 구멍은 다섯 뿐이다(전부 `// 시험장:` 으로 표시해 두었다):
     COVER  구름양을 손으로 잡는다        MANUAL 갈래마다 못수를 손으로 지정
     MIST   안개를 손으로 잡는다          FADE   여닫는 시간(본편 25초)
     OPMUL  짙기 배율
   나머지는 본편과 한 글자도 다르지 않다 — 여기서 맞춘 값은 본편에 그대로 옮기면
   된다. 반대로 **본편의 구름 코드를 고치면 이 파일도 같이 고쳐야 한다.**
   ══════════════════════════════════════════════════════════════════════════ */
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
function hashStr(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
let windDir={x:1,z:0,name:'서풍'};
let farScale=1.0, ocean=null;
/* 시험장 손잡이 */
let COVER=0.35, MIST=null, OPMUL=1, FADE=4;
/* 멈춤 — 시간·구름을 세우고 그리기만 한다. 뜯어볼 때와 사진 찍을 때 쓴다.
   멈추지 않으면 1562 m(`CLOUD_R`×1.25) 밖에 갖다 놓은 구름을 루프가 곧바로
   되굴려 치워 버린다. */
let PAUSE=false;
const MANUAL={};
let toastT=0;
function toast(s){
  const e=document.getElementById('toast');
  e.textContent=s; e.style.opacity=1;
  clearTimeout(toastT); toastT=setTimeout(()=>e.style.opacity=0,1600);
}

/* ---------------- 무대 ---------------- */
const cv=document.getElementById('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x87a0b8);
scene.fog=new THREE.FogExp2(0x87a0b8,0.005);
const camera=new THREE.PerspectiveCamera(62,1,0.5,3000);
camera.position.set(0,30,0);
const amb=new THREE.AmbientLight(0xffffff,0.5);
const hemi=new THREE.HemisphereLight(0xbfd6ff,0x4a4335,0.3);
const sun=new THREE.DirectionalLight(0xffffff,1.0);
scene.add(amb,hemi,sun);
/* 땅 — 지평선이 있어야 구름 높이가 가늠된다. 격자를 넣어 걸음을 잰다 */
{
  const g=new THREE.PlaneGeometry(4000,4000,1,1);
  const m=new THREE.MeshLambertMaterial({color:0x5c6b4a});
  const pl=new THREE.Mesh(g,m); pl.rotation.x=-Math.PI/2; scene.add(pl);
  const gr=new THREE.GridHelper(4000,80,0x40506a,0x33404f);
  gr.position.y=0.2; gr.material.transparent=true; gr.material.opacity=0.25;
  scene.add(gr);
  // 100 m 짜리 기둥 몇 개 — 구름 크기를 눈으로 견줄 자
  const pm=new THREE.MeshLambertMaterial({color:0xb9c2cc});
  for(let i=0;i<6;i++){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(3,3,100,8),pm);
    const a=i/6*6.283;
    p.position.set(Math.cos(a)*300,50,Math.sin(a)*300);
    scene.add(p);
  }
}
/*@SKY@*/

/* ---------------- 조종 ---------------- */
const keys={};
addEventListener('keydown',e=>{
  keys[e.code]=1;
  if(e.code==='KeyR'){ for(const c of CLOUDS) if(c.vis>0) rerollCloud(c);
    toast('모양 다시 굴림'); }
  if(e.code==='KeyF') spawnFront();
  if(e.code==='KeyP'){ PAUSE=!PAUSE;
    document.getElementById('bPause').classList.toggle('on',PAUSE);
    toast(PAUSE?'멈춤':'다시 흐름'); }
  if(e.code==='KeyT'){
    timeScale=timeScale===1?20:(timeScale===20?60:(timeScale===60?300:1));
    document.getElementById('sT').value=[1,20,60,300].indexOf(timeScale);
    syncT(); }
});
addEventListener('keyup',e=>{ keys[e.code]=0; });
let yaw=0, pit=0, locked=false;
cv.addEventListener('pointerdown',()=>cv.requestPointerLock());
document.addEventListener('pointerlockchange',()=>{ locked=(document.pointerLockElement===cv); });
addEventListener('mousemove',e=>{
  if(!locked) return;
  yaw-=e.movementX*0.0022; pit=clamp(pit-e.movementY*0.0022,-1.5,1.5);
});

/* 갈래 하나를 눈앞 600 m 에 세운다 — 생김새를 뜯어보려면 가까이 있어야 한다 */
let frontKey='cumulus';
function spawnFront(){
  const c=CLOUDS.find(x=>x.key===frontKey);
  if(!c) return;
  MANUAL[frontKey]=Math.max(1,MANUAL[frontKey]||1);
  rerollCloud(c); c.dead=0; c.vis=1;
  const d=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  c.x=camera.position.x+d.x*600; c.z=camera.position.z+d.z*600;
  c.m.position.set(c.x,c.y,c.z); c.yaw=99;
  syncUI(); toast(CLOUD_KINDS[frontKey].n+' 을 눈앞 600 m 에 세웠다');
}

/* ---------------- 조작판 ---------------- */
const kindsEl=document.getElementById('kinds');
const rowEls={};
for(const k in CLOUD_KINDS){
  const K=CLOUD_KINDS[k];
  const d=document.createElement('div'); d.className='row';
  d.innerHTML='<span class="nm">'+K.n+' <span style="color:#6f8199">'
    +(K.form==='puff'?'알갱이':'판때기')+'</span></span>'
    +'<span class="ct"></span>';
  const mk=(t,f)=>{ const b=document.createElement('button'); b.textContent=t;
    b.onclick=f; d.appendChild(b); return b; };
  mk('−',()=>{ MANUAL[k]=Math.max(0,(MANUAL[k]!=null?MANUAL[k]:cur(k))-1); auto(false); syncUI(); });
  mk('+',()=>{ MANUAL[k]=Math.min(K.max,(MANUAL[k]!=null?MANUAL[k]:cur(k))+1); auto(false); syncUI(); });
  const bf=mk('앞',()=>{ frontKey=k; spawnFront(); });
  bf.title='이 갈래를 눈앞 600 m 에 세운다';
  kindsEl.appendChild(d);
  rowEls[k]=d.querySelector('.ct');
}
function cur(k){ return CLOUDS.filter(c=>c.key===k&&c.vis>0.02).length; }
let autoW=true;
function auto(v){
  autoW=v;
  document.getElementById('bAuto').classList.toggle('on',v);
  if(v) for(const k in MANUAL) delete MANUAL[k];
}
document.getElementById('bAuto').onclick=()=>{ auto(!autoW); syncUI(); };
document.getElementById('bAll').onclick=()=>{
  auto(false); for(const k in CLOUD_KINDS) MANUAL[k]=CLOUD_KINDS[k].max; syncUI(); };
document.getElementById('bNone').onclick=()=>{
  auto(false); for(const k in CLOUD_KINDS) MANUAL[k]=0; syncUI(); };
document.getElementById('bRoll').onclick=()=>{
  for(const c of CLOUDS) if(c.vis>0) rerollCloud(c); toast('모양 다시 굴림'); };
document.getElementById('bFront').onclick=spawnFront;
document.getElementById('bPause').onclick=()=>{ PAUSE=!PAUSE;
  document.getElementById('bPause').classList.toggle('on',PAUSE); };

const $=id=>document.getElementById(id);
function syncT(){
  $('vT').textContent=timeScale+'배';
  $('sT').value=[1,20,60,300,900].indexOf(timeScale)<0?0:[1,20,60,300,900].indexOf(timeScale);
}
$('sH').oninput=e=>{ hourOfDay=parseFloat(e.target.value);
  $('vH').textContent=hourOfDay.toFixed(1)+'시'; };
$('sT').oninput=e=>{ timeScale=[1,5,20,60,300][parseInt(e.target.value)];
  $('vT').textContent=timeScale+'배'; };
$('sC').oninput=e=>{ COVER=parseInt(e.target.value)/100;
  $('vC').textContent=COVER.toFixed(2); };
$('sM').oninput=e=>{ const v=parseInt(e.target.value);
  MIST=v<0?null:v/100; $('vM').textContent=v<0?'자동':(v/100).toFixed(2); };
$('sO').oninput=e=>{ OPMUL=parseInt(e.target.value)/100;
  $('vO').textContent=OPMUL.toFixed(2)+'×'; };
$('sF').oninput=e=>{ FADE=parseInt(e.target.value);
  $('vF').textContent=FADE+'초'; };
$('sW').oninput=e=>{ const a=parseInt(e.target.value)*Math.PI/180;
  windDir.x=Math.cos(a); windDir.z=Math.sin(a);
  $('vW').textContent=parseInt(e.target.value)+'°'; };

function syncUI(){
  for(const k in CLOUD_KINDS){
    const n=cur(k), want=(MANUAL[k]!=null)?MANUAL[k]:'자동';
    rowEls[k].textContent=n+' / '+want;
    rowEls[k].style.color=(MANUAL[k]!=null)?'#ffd27f':'#8fe0a8';
  }
}

/* ---------------- 시작 ---------------- */
initSky();
buildClouds(hashStr('cloud_arena'));
initRain();
hourOfDay=parseFloat($('sH').value);
$('vC').textContent=COVER.toFixed(2);
$('vF').textContent=FADE+'초';
syncT(); syncUI();

function resize(){
  const w=innerWidth,h=innerHeight;
  camera.aspect=w/h; camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
addEventListener('resize',resize); resize();

const hud=document.getElementById('hud');
let last=performance.now(), fps=60, uiT=0;
function loop(){
  requestAnimationFrame(loop);
  const now=performance.now();
  let dt=Math.min(0.1,(now-last)/1000); last=now;
  fps+=((1/Math.max(dt,0.001))-fps)*0.08;

  if(PAUSE) dt=0;
  // 시간 — 실제 1초가 게임 1분(본편과 같다)
  hourOfDay+=dt/60*timeScale; gameHours+=dt/60*timeScale;
  if(hourOfDay>=24) hourOfDay-=24;
  $('sH').value=hourOfDay; $('vH').textContent=hourOfDay.toFixed(1)+'시';

  // 날기
  const sp=(keys.ShiftLeft?120:45)*dt*(keys.ControlLeft?4:1);
  const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  if(keys.KeyW) camera.position.addScaledVector(f,sp);
  if(keys.KeyS) camera.position.addScaledVector(f,-sp);
  if(keys.KeyD) camera.position.addScaledVector(r,sp);
  if(keys.KeyA) camera.position.addScaledVector(r,-sp);
  if(keys.Space) camera.position.y+=sp;
  if(keys.ShiftRight||keys.KeyC) camera.position.y-=sp;
  camera.position.y=Math.max(2,camera.position.y);
  camera.quaternion.setFromEuler(new THREE.Euler(pit,yaw,0,'YXZ'));

  updateSky();
  if(!PAUSE){ updateClouds(dt); updateRain(dt); }
  renderer.render(scene,camera);

  if((uiT+=dt)>0.25){
    uiT=0; syncUI();
    let on=0, blob=0;
    for(const c of CLOUDS) if(c.m.visible){ on++; if(c.form==='puff') blob+=c.nb; }
    hud.innerHTML='<b>'+fps.toFixed(0)+'</b> fps<br>'
      +'떠 있는 덩이 <b>'+on+'</b><br>알갱이 <b>'+blob+'</b><br>'
      +'구름양 <b>'+WEA.cover.toFixed(2)+'</b> · '+(WEA.name||'—')+'<br>'
      +'안개 <b>'+WEA.mist.toFixed(2)+'</b> · 비 <b>'+WEA.rain.toFixed(2)+'</b><br>'
      +'높이 <b>'+camera.position.y.toFixed(0)+'</b> m';
  }
}
loop();
</script>
</body>
</html>
