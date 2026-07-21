import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('batonDesktop', {
  getVersion: () => ipcRenderer.invoke('baton:get-version'),
  getPlatform: () => ipcRenderer.invoke('baton:get-platform'),
})
