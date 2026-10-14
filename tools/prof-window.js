/* tools/prof-window.js — CASTAWAY
   보이는 창에서 벤치마크(또는 준 JS)를 돌리는 동안 **CPU 프로파일**을 떠서, 제 시간(self time)이 큰 함수부터 찍는다.
   무엇이 프레임을 먹는지 어림하지 않고 잰다(크롬 개발자 도구의 Profiler 를 Electron debugger 로 부른다).

     [CASTAWAY_UNCAP=1] [CASTAWAY_NOINLINE=1] [CASTAWAY_QUERY='ws=2'] desktop/node_modules/.bin/electron tools/prof-window.js [초=12] ["시작 전에 돌릴 JS"] [너비=1440] [높이=838]

   결과: PROF {fps, ms(프레임당 JS ms), top:[[함수 @파일:줄, 프레임당 ms, %], …]} — 프레임 수는 그동안 그린 프레임(requestAnimationFrame)으로 센다 */
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os');
app.setPath('userData', path.join(os.tmpdir(), 'castaway-prof'));
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
if (process.env.CASTAWAY_NOINLINE === '1') app.commandLine.appendSwitch('js-flags', '--no-turbo-inlining');   // 끼워 넣기를 꺼 함수마다 제 시간을 본다(조금 느려진다)
if (process.env.CASTAWAY_UNCAP === '1') { app.commandLine.appendSwitch('disable-frame-rate-limit'); app.commandLine.appendSwitch('disable-gpu-vsync'); }
const DUR = +process.argv[2] || 12, EXTRA = process.argv[3] || '', W = +process.argv[4] || 1440, H = +process.argv[5] || 838;
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: W, height: H, useContentSize: true, show: false, backgroundColor: '#03060a', webPreferences: { backgroundThrottling: false } });
  win.showInactive();
  const fail = setTimeout(() => { console.log('PROF {"error":"timeout"}'); app.exit(1); }, (DUR + 120) * 1000);
  try {
    await win.loadFile(path.join(process.env.CASTAWAY_GAME || path.join(__dirname, '..'), 'island_world.html'), { search: process.env.CASTAWAY_QUERY || '' });
    const run = js => win.webContents.executeJavaScript(js, true);
    await run(`(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms)); let t=0; while((typeof busy==='undefined'||busy)&&t++<900) await W(100);
      try{ askClose(false); }catch(e){} pause=()=>{}; titleLand(); await W(1500); try{ ${EXTRA} }catch(e){ console.log('extra',e.message); }
      window.__W=W; window.__fr=0; (function f(){ window.__fr++; requestAnimationFrame(f); })(); })()`);
    const dbg = win.webContents.debugger; dbg.attach('1.3');
    await dbg.sendCommand('Profiler.enable'); await dbg.sendCommand('Profiler.setSamplingInterval', { interval: 200 });
    const f0 = await run('if(!window.__noBench){ BENCH.dur=' + DUR + '; BENCH.warm=1; benchStart(); } window.__fr');
    await dbg.sendCommand('Profiler.start');
    await new Promise(r => setTimeout(r, DUR * 1000));
    const { profile } = await dbg.sendCommand('Profiler.stop');
    const f1 = await run('window.__fr'), frames = Math.max(1, f1 - f0);
    const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n]));
    let total = 0;
    profile.samples.forEach((id, i) => { const n = byId.get(id), c = n.callFrame, d = (dt[i] || 0) / 1000; total += d;
      const key = (c.functionName || '(anonymous)') + ' @' + (c.url.split('/').pop() || 'native') + ':' + (c.lineNumber + 1);
      self.set(key, (self.get(key) || 0) + d); });
    const idle = [...self].filter(([k]) => /^\(idle\)|^\(program\)|^\(garbage/.test(k)).reduce((a, [k, v]) => (a[k.split(' ')[0]] = +(v / frames).toFixed(2), a), {});
    const top = [...self].filter(([k]) => !/^\(idle\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 34).map(([k, v]) => [k, +(v / frames).toFixed(3)]);
    const js = [...self].filter(([k]) => !/^\(idle\)|^\(program\)/.test(k)).reduce((a, [, v]) => a + v, 0);
    /* CASTAWAY_CALLERS='함수 이름' — 그 함수를 부른 줄기(위로 다섯 단)마다의 시간 */
    let callers;
    if (process.env.CASTAWAY_CALLERS) { const par = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => par.set(c, n.id)));
      const acc = new Map(); profile.samples.forEach((id, i) => { const n = byId.get(id); if (n.callFrame.functionName !== process.env.CASTAWAY_CALLERS) return;
        let k = [], q = par.get(id); for (let d = 0; d < 5 && q !== undefined; d++, q = par.get(q)) { const c = byId.get(q).callFrame; k.push((c.functionName || 'anon') + '@' + (c.url.split('/').pop() || '') + ':' + (c.lineNumber + 1)); }
        const key = k.join(' < '); acc.set(key, (acc.get(key) || 0) + (dt[i] || 0) / 1000); });
      callers = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, +(v / frames).toFixed(3)]); }
    console.log('PROF ' + JSON.stringify({ callers, fps: +(frames / DUR).toFixed(1), jsMsPerFrame: +(js / frames).toFixed(2), other: idle, top }));
  } catch (e) { console.log('PROF ' + JSON.stringify({ error: String(e && e.message || e) })); }
  clearTimeout(fail); app.exit(0);
});
