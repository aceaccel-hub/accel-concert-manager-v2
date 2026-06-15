// preload.js - Electron 보안 설정
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron,
});

contextBridge.exposeInMainWorld('accelDocuments', {
  saveFile: (options) => ipcRenderer.invoke('documents:save-file', options),
  savePdf: (options) => ipcRenderer.invoke('documents:save-pdf', options),
});
