import { contextBridge, ipcRenderer } from 'electron';

export interface LunaElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  onWindowStateChange: (callback: (maximized: boolean) => void) => () => void;
}

const api: LunaElectronAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  onWindowStateChange: (callback) => {
    const handler = (_: any, isMax: boolean) => callback(isMax);
    ipcRenderer.on('window:stateChange', handler);
    return () => ipcRenderer.removeListener('window:stateChange', handler);
  }
};

contextBridge.exposeInMainWorld('lunaElectron', api);
