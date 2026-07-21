/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    batonDesktop?: {
      getVersion: () => Promise<string>
      getPlatform: () => Promise<string>
    }
  }
}
