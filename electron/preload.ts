import { contextBridge, ipcRenderer } from 'electron'
import type {
  LlmConnectionResult,
  LlmRequest,
  LlmResult,
} from '../src/llm/client'

contextBridge.exposeInMainWorld('batonDesktop', {
  getVersion: () => ipcRenderer.invoke('baton:get-version'),
  getPlatform: () => ipcRenderer.invoke('baton:get-platform'),
  testLlmConnection: (request: LlmRequest): Promise<LlmConnectionResult> =>
    ipcRenderer.invoke('baton:llm-test', request),
  sendLlmChat: (request: LlmRequest): Promise<LlmResult> =>
    ipcRenderer.invoke('baton:llm-chat', request),
})
