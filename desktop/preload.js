/* 게임 페이지에 내놓는 창구 — window.DESKTOP. 브라우저에서 열면 이것이 없으므로
   게임은 예전처럼 localStorage · 파일 내려받기로 저장한다(island_world.html 의 DESK). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DESKTOP', {
  saveHas: k => ipcRenderer.sendSync('save:has', k),
  saveRead: k => ipcRenderer.sendSync('save:read', k),
  saveWrite: (k, text) => ipcRenderer.sendSync('save:write', k, text),
  info: () => ipcRenderer.sendSync('app:info'),
  openSaves: () => ipcRenderer.send('app:openSaves'),
  fullscreen: () => ipcRenderer.sendSync('app:fullscreen'),
  quit: () => ipcRenderer.send('app:quit'),
  /* 창을 닫기 직전 — 게임이 자동 저장을 하고 closeReady 로 답한다(3초 안에 안 오면 그냥 닫힌다) */
  onBeforeClose: fn => { ipcRenderer.on('app:beforeClose', () => fn()); },
  closeReady: () => ipcRenderer.send('app:closeReady'),
  /* 창을 내리거나(false) 다시 올릴 때(true) — 내린 동안 게임은 그리지도 소리 내지도 않는다 */
  onVisible: fn => { ipcRenderer.on('app:visible', (e, v) => fn(!!v)); },
  /* 새 판이 나왔을 때 — {version, url} */
  onUpdate: fn => { ipcRenderer.on('app:update', (e, u) => fn({ version: String(u.version), url: String(u.url) })); },
});
