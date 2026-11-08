/* tools/bench-window.js — CASTAWAY
   보이는 창에서 벤치마크를 돌려 결과 한 줄(JSON)을 찍고 끝낸다. 숨은 탭·시험 창은 프레임을 조르므로 FPS 를 못 잰다 —
   고친 것이 정말 빨라졌는지는 이것으로 잰다(게임 안의 F3 벤치마크 `benchStart` 를 그대로 부른다).

     [CASTAWAY_UNCAP=1] desktop/node_modules/.bin/electron tools/bench-window.js [초=14] [너비=1440] [높이=900] ["시작 전에 돌릴 JS"]

   CASTAWAY_GAME=폴더 — 다른 자리에 떠 둔 판을 잰다(고치는 중인 작업 폴더 대신).
   CASTAWAY_PRECOMP=1 — 시작 화면에서 셰이더 미리 짜기가 끝날 때까지 기다렸다가 상륙한다(안 기다리면 첫 몇 초에 짜이는 셰이더가 멈칫으로 잡힌다).
   저장·설정은 건드리지 않는다(임시 폴더를 제 userData 로 쓴다). 결과: BENCH {fps, low(1% low), max(ms), cpu, gpu, w, h, tri, calls, qual} */
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os');

app.setPath('userData', path.join(os.tmpdir(), 'castaway-bench'));
app.commandLine.appendSwitch('ignore-gpu-blocklist'); app.commandLine.appendSwitch('mute-audio');   // 시험 창은 소리를 안 낸다(사용자 요청 2026-11-06)
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
/* CASTAWAY_UNCAP=1 — 화면 주사율(60)에 묶이지 않고 낼 수 있는 만큼 낸다. 무엇이 얼마나 드는지 견줄 때 쓴다
   (묶여 있으면 17 ms 와 33 ms 사이의 차이가 30 fps 한 값으로 뭉개진다) */
if (process.env.CASTAWAY_UNCAP === '1') { app.commandLine.appendSwitch('disable-frame-rate-limit'); app.commandLine.appendSwitch('disable-gpu-vsync'); }

const DUR = +process.argv[2] || 14, W = +process.argv[3] || 1440, H = +process.argv[4] || 900, EXTRA = process.argv[5] || '';

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, backgroundColor: '#03060a',
    title: 'CASTAWAY — benchmark', webPreferences: { backgroundThrottling: false } });
  const fail = setTimeout(() => { console.log('BENCH {"error":"timeout"}'); app.exit(1); }, (DUR + (process.env.CASTAWAY_PRECOMP==='1'?220:90)) * 1000);
  if (app.dock) app.dock.hide(); win.setOpacity(0); win.setIgnoreMouseEvents(true); win.showInactive();   // 보이지 않게 · 포커스를 안 뺏게(사용자 요청 2026-11-08 — 시험 창이 크롬을 가렸다)
  try {
    await win.loadFile(path.join(process.env.CASTAWAY_GAME || path.join(__dirname, '..'), 'island_world.html'));
    const out = await win.webContents.executeJavaScript(`(async()=>{
      const W=ms=>new Promise(r=>setTimeout(r,ms)); let t=0;
      while((typeof busy==='undefined'||busy)&&t++<900) await W(100);
      try{ askClose(false); }catch(e){}
      ${process.env.CASTAWAY_PRECOMP==='1'?`{ let pc=-1, st=0; for(let k=0;k<240;k++){ await W(250); const n=renderer.info.programs.length; if(n===pc&&!PRECOMP.jobs&&PRECOMP.t>0){ if(++st>=12) break; } else { st=0; pc=n; } } }`:''}   // CASTAWAY_PRECOMP=1 — 시작 화면에서 셰이더를 다 미리 짤 때까지 기다린다(사람이 시작 화면에 머문 것처럼)
      if(typeof titleLand==='function') titleLand(); else document.getElementById('bStart').click();   // 첫 화면의 '시작'은 이제 글을 먼저 읽힌다(91-title.js)
      await W(1500);
      try{ ${EXTRA} }catch(e){ return JSON.stringify({error:'extra: '+e.message}); }
      localStorage.removeItem('castaway.bench');
      BENCH.dur=${DUR}; BENCH.warm=2; benchStart();
      let tri=0, calls=0, n=0; t=0;
      while(BENCH.on&&t++<3000){ await W(250); if(PERF.nf){ tri+=PERF.dc.main[1]/PERF.nf; calls+=PERF.dc.main[0]/PERF.nf; n++; } }
      try{ askClose(false); }catch(e){}
      const h=JSON.parse(localStorage.getItem('castaway.bench')||'[]'), r=h[h.length-1]||{error:'no result'};
      r.tri=Math.round(tri/Math.max(1,n)/1000)+'k'; r.calls=Math.round(calls/Math.max(1,n)); r.qual=typeof QUAL!=='undefined'?QUAL.k:null;
      r.dpr=devicePixelRatio; if(window.__note) r.note=window.__note; r.camc=typeof CAMC!=='undefined'?CAMC.lines:null; delete r.at; delete r.gpuName;
      return JSON.stringify(r); })()`, true);
    console.log('BENCH ' + out);
  } catch (e) { console.log('BENCH ' + JSON.stringify({ error: String(e && e.message || e) })); }
  clearTimeout(fail);
  app.exit(0);
});
