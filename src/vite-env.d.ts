/// <reference types="vite/client" />

import type {
  LlmConnectionResult,
  LlmRequest,
  LlmResult,
} from './llm/client'

export {}

declare global {
  interface Window {
    batonDesktop?: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      testLlmConnection: (request: LlmRequest) => Promise<LlmConnectionResult>
      sendLlmChat: (request: LlmRequest) => Promise<LlmResult>
    }
  }
}
