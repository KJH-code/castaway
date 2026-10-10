/* CASTAWAY 데스크톱 판 — 브라우저 없이 제 창으로 뜨는 게임.
   게임 본체는 레포 맨 위의 island_world.html 그대로다(이 폴더에 베끼지 않는다).
   개발할 때는 ../island_world.html 을, 묶은 판에서는 resources/game/ 에 넣어 둔 것을 연다.
   이 껍데기가 더하는 것: 제 창 · 전체 화면(F11 · Alt+Enter) · 저장을 파일로(userData/saves) ·
   창을 닫으면 자동 저장 · 화면 프로세스가 죽으면 다시 켜기 · 오류 기록(userData/logs) ·
   권한 요청 막기 · 새 판 알림 · 창 크기 기억 · GPU 차단 목록 무시(노트북 내장 GPU 에서도 WebGL 이 꺼지지 않게). */
const { app, BrowserWindow, ipcMain, Menu, shell, dialog, session, net } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('CASTAWAY');
app.commandLine.appendSwitch('ignore-gpu-blocklist');          // 차단 목록에 걸린 GPU 도 WebGL 을 쓴다
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('force_high_performance_gpu');     // 그래픽 둘 달린 노트북은 외장 쪽으로
app.commandLine.appendSwitch('disable-renderer-backgrounding');

const DEV = !app.isPackaged || process.env.CASTAWAY_DEBUG === '1';
const GAME = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..');
const USER = () => app.getPath('userData');                      // Windows %APPDATA%\CASTAWAY · macOS ~/Library/Application Support/CASTAWAY
const SAVES = () => path.join(USER(), 'saves');
const LOGS = () => path.join(USER(), 'logs');
const WINCFG = () => path.join(USER(), 'window.json');
const REPO = 'KJH-code/castaway';                                 // 새 판 알림은 이 레포의 Releases 를 본다

if (!app.requestSingleInstanceLock()) app.quit();                 // 두 번 켜면 먼저 뜬 창을 앞으로

/* ── 기록 — 오류를 userData/logs/castaway.log 에 남긴다(1 MB 넘으면 .old.log 로 밀어낸다). 버그를 알릴 때 이 파일을 보내면 된다 ── */
function log(level, msg) {
  try {
    fs.mkdirSync(LOGS(), { recursive: true });
    const f = path.join(LOGS(), 'castaway.log');
    try { if (fs.statSync(f).size > (1 << 20)) fs.renameSync(f, path.join(LOGS(), 'castaway.old.log')); } catch (e) {}
    fs.appendFileSync(f, new Date().toISOString() + ' ' + level + ' ' + String(msg).slice(0, 4000) + '\n');
  } catch (e) {}
}
process.on('uncaughtException', e => log('main', e && e.stack || e));
process.on('unhandledRejection', e => log('main', e && e.stack || e));

function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function writeAtomic(f, text) {                                     // 쓰다 꺼져도 앞 파일이 남게 — 임시 파일에 쓰고 바꿔 끼운다
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, text);
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak');             // 바로 앞 저장 하나는 .bak 으로 남긴다
  fs.renameSync(tmp, f);
}

let win = null, quitting = false;
function createWindow() {
  const st = readJSON(WINCFG(), { w: 1600, h: 900, full: true });
  win = new BrowserWindow({
    width: st.w || 1600, height: st.h || 900, x: st.x, y: st.y,
    minWidth: 960, minHeight: 540,
    fullscreen: st.full !== false,
    backgroundColor: '#03060a', title: 'CASTAWAY', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      backgroundThrottling: false,                                   // 창이 가려져도 섬 생성·물리가 멈추지 않게(멈춤·내림은 게임이 스스로 아낀다)
      spellcheck: false,
    },
  });
  if (st.max && st.full === false) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', e => e.preventDefault());            // 작업 표시줄엔 늘 'CASTAWAY'

  const remember = () => {
    if (!win || win.isDestroyed()) return;
    const full = win.isFullScreen(), max = win.isMaximized();
    const b = (full || max) ? readJSON(WINCFG(), {}) : win.getBounds();
    const o = { w: b.w || b.width || 1600, h: b.h || b.height || 900, x: b.x, y: b.y, full, max };
    try { writeAtomic(WINCFG(), JSON.stringify(o)); } catch (e) {}
  };
  win.on('leave-full-screen', remember);
  win.on('enter-full-screen', remember);

  /* 창 닫기(X · Alt+F4 · Cmd+Q · 게임의 '끝내기') — 바로 닫지 않고 게임에 자동 저장을 시킨 뒤 닫는다.
     게임이 섬을 만드는 중이라 답을 못 하면 3초 뒤 그냥 닫는다(그때는 저장할 것도 없다) */
  win.on('close', e => {
    remember();
    if (quitting || win.webContents.isCrashed()) return;
    e.preventDefault();
    const wc = win.webContents;
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(timer); ipcMain.removeListener('app:closeReady', onReady);
      quitting = true; if (win && !win.isDestroyed()) win.close();
    };
    const onReady = ev => { if (ev.sender === wc) finish(); };
    const timer = setTimeout(() => { log('close', '게임이 3초 안에 답하지 않아 그냥 닫는다'); finish(); }, 3000);
    ipcMain.on('app:closeReady', onReady);
    wc.send('app:beforeClose');
  });

  /* 게임 밖으로 나가지 않는다 — 페이지 이동은 막고, 바깥 주소는 기본 브라우저로 */
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });

  /* 키 — F11 · Alt+Enter 전체 화면. 개발판만 F12 개발자 도구.
     메뉴를 없앴으므로 Ctrl+R(새로 고침) · Ctrl+W 같은 브라우저 단축키는 아예 없다 — F5 는 게임의 저장이다. */
  win.webContents.on('before-input-event', (e, inp) => {
    if (inp.type !== 'keyDown') return;
    if (inp.key === 'F11' || (inp.key === 'Enter' && inp.alt)) { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (inp.key === 'F12' && DEV) { e.preventDefault(); win.webContents.toggleDevTools(); }
  });

  /* 게임 화면의 경고·오류를 기록에 남긴다(Electron 35 부터 인자가 이벤트 하나로 바뀌었다 — 둘 다 받는다) */
  win.webContents.on('console-message', (e, lv, msg, line, src) => {
    const level = e && e.level !== undefined ? e.level : lv, text = e && e.message !== undefined ? e.message : msg;
    if (level === 'error' || level === 'warning' || level === 3 || level === 2)
      log('page', '[' + level + '] ' + text + ' (' + path.basename(String((e && e.sourceId) || src || '')) + ':' + ((e && e.lineNumber) || line || 0) + ')');
  });

  /* 화면 프로세스가 죽으면(그래픽 드라이버 · 메모리) 물어보고 다시 켠다 — 자동 저장이 있으면 시작 화면이 불러오겠냐고 묻는다 */
  win.webContents.on('render-process-gone', (e, d) => {
    log('crash', JSON.stringify(d));
    if (quitting || d.reason === 'clean-exit') return;
    const r = dialog.showMessageBoxSync(win, {
      type: 'error', title: 'CASTAWAY', message: '게임 화면이 멈췄습니다',
      detail: '(' + d.reason + ') 다시 켜면 시작 화면에서 마지막 자동 저장을 불러올 수 있습니다.\n기록: ' + path.join(LOGS(), 'castaway.log'),
      buttons: ['다시 켜기', '끝내기'], defaultId: 0, cancelId: 1, noLink: true,
    });
    if (r === 0) win.reload(); else { quitting = true; win.close(); }
  });
  win.on('unresponsive', () => log('hang', '응답 없음'));          // 섬 생성이 길면 잠깐 이럴 수 있다 — 기록만
  win.on('responsive', () => log('hang', '다시 응답'));

  win.webContents.once('did-finish-load', () => setTimeout(checkUpdate, 8000));
  win.loadFile(path.join(GAME, 'island_world.html'));
  win.on('closed', () => { win = null; });
}

/* ── 새 판 알림 — 레포 Releases 의 마지막 판이 지금보다 높으면 게임 시작 화면에 '받기' 고리를 띄운다.
   묶은 판만 · 바깥이 안 되면(오프라인) 조용히 넘어간다. 내려받기·설치는 사람이 한다(서명이 없어 자동 설치는 못 한다) ── */
function newer(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
async function checkUpdate() {
  if (DEV && process.env.CASTAWAY_UPDATE !== '1') return;
  try {
    const r = await net.fetch('https://api.github.com/repos/' + REPO + '/releases/latest',
      { headers: { 'User-Agent': 'CASTAWAY/' + app.getVersion(), Accept: 'application/vnd.github+json' } });
    if (!r.ok) return;                                              // 아직 릴리스가 없으면 404
    const j = await r.json(), v = String(j.tag_name || '').replace(/^v/, '');
    if (/^\d+\.\d+\.\d+$/.test(v) && newer(v, app.getVersion()) && win && !win.isDestroyed())
      win.webContents.send('app:update', { version: v, url: j.html_url });
  } catch (e) { log('info', '새 판 확인 못 함: ' + (e && e.message)); }
}

/* ── 게임이 부르는 창구(preload.js 가 window.DESKTOP 으로 내놓는다) ──
   저장 하나가 수십 KB 라 동기로 주고받는다 — 게임 쪽 저장 칸 함수들이 동기다. */
const SLOT = /^[a-z0-9._-]{1,40}$/i;
const slotFile = k => path.join(SAVES(), k + '.json');
ipcMain.on('save:has', (e, k) => { e.returnValue = SLOT.test(k) && fs.existsSync(slotFile(k)); });
ipcMain.on('save:read', (e, k) => {
  try { e.returnValue = SLOT.test(k) ? fs.readFileSync(slotFile(k), 'utf8') : null; } catch (err) { e.returnValue = null; }
});
ipcMain.on('save:write', (e, k, text) => {
  try {
    if (!SLOT.test(k) || typeof text !== 'string') throw new Error('잘못된 슬롯');
    writeAtomic(slotFile(k), text); e.returnValue = { ok: true, path: slotFile(k) };
  } catch (err) { log('save', k + ' ' + (err && err.message)); e.returnValue = { ok: false, error: String(err && err.message || err) }; }
});
ipcMain.on('app:info', e => { e.returnValue = { version: app.getVersion(), saves: SAVES(), logs: LOGS(), electron: process.versions.electron, chrome: process.versions.chrome }; });
ipcMain.on('app:openSaves', () => { fs.mkdirSync(SAVES(), { recursive: true }); shell.openPath(USER()); });   // saves · logs 가 같이 보이는 자리
ipcMain.on('app:fullscreen', e => { if (win) win.setFullScreen(!win.isFullScreen()); e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on('app:quit', () => { if (win) win.close(); else app.quit(); });   // 닫기 길(자동 저장)을 그대로 탄다

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
/* 게임 밖 웹 내용(webview)은 붙이지 못하게 */
app.on('web-contents-created', (e, wc) => { wc.on('will-attach-webview', ev => ev.preventDefault()); });
app.whenReady().then(() => {
  log('start', 'v' + app.getVersion() + ' electron ' + process.versions.electron + ' chrome ' + process.versions.chrome + ' ' + process.platform + '-' + process.arch +
    (app.isPackaged ? '' : ' (개발)'));
  try { log('gpu', JSON.stringify(app.getGPUFeatureStatus())); } catch (e) {}
  /* 권한은 포인터 잠금(시점 조작)과 전체 화면만 — 카메라·마이크·위치·알림 따위는 게임이 쓸 일이 없다 */
  const OK = new Set(['pointerLock', 'fullscreen']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(OK.has(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => OK.has(perm));
  /* 메뉴 줄 없음. macOS 는 앱 메뉴가 없으면 Cmd+Q 도 안 먹으므로 그것만 남긴다 */
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }]) : null);
  createWindow();
  app.on('activate', () => { if (!win) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
