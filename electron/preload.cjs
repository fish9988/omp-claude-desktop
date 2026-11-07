const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ompDesktop', {
  isElectron: true,
  updateWindowOverlay: (opts) => ipcRenderer.invoke('window:updateOverlay', opts),
});
