/* tools/shot-window.js — CASTAWAY
   보이는 창에 게임을 띄우고, 준 JS 를 돌린 뒤 화면을 PNG 로 찍는다(숨은 시험 창은 화면을 못 찍는다).

     desktop/node_modules/.bin/electron tools/shot-window.js <out.png> ["섬이 다 지어진 뒤 돌릴 JS(비동기 가능 · 값을 돌려주면 찍힌다)"] [너비=1280] [높이=800]

   CASTAWAY_GAME=폴더(다른 자리의 판) · CASTAWAY_QUERY='ws=2'(주소 뒤에 붙일 것 — 작은 섬) · CASTAWAY_UNCAP=1(주사율에 안 묶는다).
   저장·설정은 건드리지 않는다(임시 폴더를 제 userData 로 쓴다). JS 가 돌려준 값은 SHOT {...} 한 줄로 찍힌다 */
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os'), fs = require('fs');
app.setPath('userData', path.join(os.tmpdir(), 'castaway-shot'));
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
/* CASTAWAY_UNCAP=1 — 화면 주사율에 묶이지 않는다(준 JS 안에서 프레임을 세어 견줄 때) */
if (process.env.CASTAWAY_UNCAP === '1') { app.commandLine.appendSwitch('disable-frame-rate-limit'); app.commandLine.appendSwitch('disable-gpu-vsync'); }
const OUT = process.argv[2] || 'shot.png', JS = process.argv[3] || '', W = +process.argv[4] || 1280, H = +process.argv[5] || 800;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, backgroundColor: '#03060a', webPreferences: { backgroundThrottling: false } });
  win.showInactive();
  const fail = setTimeout(() => { console.log('SHOT {"error":"timeout"}'); app.exit(1); }, 150000);
  try {
    await win.loadFile(path.join(process.env.CASTAWAY_GAME || path.join(__dirname, '..'), 'island_world.html'), { search: process.env.CASTAWAY_QUERY || '' });   // CASTAWAY_QUERY='ws=2' — 주소 뒤에 붙일 것
    const out = await win.webContents.executeJavaScript(`(async()=>{
      const W=ms=>new Promise(r=>setTimeout(r,ms)); let t=0; window.__err=[];
      addEventListener('error',e=>__err.push(e.message+' @'+(e.filename||'').split('/').pop()+':'+e.lineno));
      while((typeof busy==='undefined'||busy)&&t++<900) await W(100);
      try{ askClose(false); }catch(e){}
      let r=null; try{ r=await (async()=>{ ${JS} })(); }catch(e){ r={error:String(e&&e.message||e)}; }
      await W(400); return JSON.stringify({r, err:__err.slice(0,6)}); })()`, true);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(OUT, img.resize({ width: Math.min(W, 1280) }).toPNG());
    console.log('SHOT ' + out);
  } catch (e) { console.log('SHOT ' + JSON.stringify({ error: String(e && e.message || e) })); }
  clearTimeout(fail); app.exit(0);
});
