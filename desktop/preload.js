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
});
