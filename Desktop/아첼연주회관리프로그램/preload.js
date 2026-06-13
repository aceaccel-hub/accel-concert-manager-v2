// preload.js - Electron 보안 설정
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  nodeVersion: process.versions.node,
  chromeVersion: process.versions.chrome,
  electronVersion: process.versions.electron,
});
