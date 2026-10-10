/* CASTAWAY 데스크톱 판 — 브라우저 없이 제 창으로 뜨는 게임.
   게임 본체는 레포 맨 위의 island_world.html 그대로다(이 폴더에 베끼지 않는다).
   개발할 때는 ../island_world.html 을, 묶은 판에서는 resources/game/ 에 넣어 둔 것을 연다.
   이 껍데기가 더하는 것: 제 창 · 전체 화면(F11 · Alt+Enter) · 저장을 파일로(userData/saves) ·
   끝내기 · 창 크기 기억 · GPU 차단 목록 무시(노트북 내장 GPU 에서도 WebGL 이 꺼지지 않게). */
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
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
const WINCFG = () => path.join(USER(), 'window.json');

if (!app.requestSingleInstanceLock()) app.quit();                 // 두 번 켜면 먼저 뜬 창을 앞으로

/* ── 창 상태 기억 ── */
function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function writeAtomic(f, text) {                                     // 쓰다 꺼져도 앞 파일이 남게 — 임시 파일에 쓰고 바꿔 끼운다
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, text);
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak');             // 바로 앞 저장 하나는 .bak 으로 남긴다
  fs.renameSync(tmp, f);
}

let win = null;
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
      backgroundThrottling: false,                                   // 창이 가려져도 섬 생성·물리가 멈추지 않게
      spellcheck: false,
    },
  });
  if (st.max && st.full === false) win.maximize();
  win.once('ready-to-show', () => win.show());

  const remember = () => {
    if (!win || win.isDestroyed()) return;
    const full = win.isFullScreen(), max = win.isMaximized();
    const b = (full || max) ? (readJSON(WINCFG(), {}) ) : win.getBounds();
    const o = { w: b.w || b.width || 1600, h: b.h || b.height || 900, x: b.x, y: b.y, full, max };
    try { writeAtomic(WINCFG(), JSON.stringify(o)); } catch (e) {}
  };
  win.on('close', remember);
  win.on('leave-full-screen', remember);
  win.on('enter-full-screen', remember);

  /* 게임 밖으로 나가지 않는다 — 페이지 이동은 막고, 바깥 주소는 기본 브라우저로 */
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });

  /* 키 — F11 · Alt+Enter 전체 화면. 개발판만 F12 개발자 도구.
     메뉴를 없앴으므로 Ctrl+R(새로 고침) · Ctrl+W 같은 브라우저 단축키는 아예 없다 — F5 는 게임의 저장이다. */
  win.webContents.on('before-input-event', (e, inp) => {
    if (inp.type !== 'keyDown') return;
    if (inp.key === 'F11' || (inp.key === 'Enter' && inp.alt)) { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (inp.key === 'F12' && DEV) { e.preventDefault(); win.webContents.toggleDevTools(); }
  });

  win.loadFile(path.join(GAME, 'island_world.html'));
  win.on('closed', () => { win = null; });
}

/* ── 게임이 부르는 창구(preload.js 가 window.DESKTOP 으로 내놓는다) ──
   저장 하나가 수 KB 라 동기로 주고받는다 — 게임 쪽 hasSave() 가 동기 함수다. */
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
  } catch (err) { e.returnValue = { ok: false, error: String(err && err.message || err) }; }
});
ipcMain.on('app:info', e => { e.returnValue = { version: app.getVersion(), saves: SAVES(), electron: process.versions.electron, chrome: process.versions.chrome }; });
ipcMain.on('app:openSaves', () => { fs.mkdirSync(SAVES(), { recursive: true }); shell.openPath(SAVES()); });
ipcMain.on('app:fullscreen', e => { if (win) win.setFullScreen(!win.isFullScreen()); e.returnValue = !!(win && win.isFullScreen()); });
ipcMain.on('app:quit', () => { if (win) win.close(); else app.quit(); });

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  /* 메뉴 줄 없음. macOS 는 앱 메뉴가 없으면 Cmd+Q 도 안 먹으므로 그것만 남긴다 */
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }]) : null);
  createWindow();
  app.on('activate', () => { if (!win) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
