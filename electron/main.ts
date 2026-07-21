import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseChatCompletion,
  parseModelList,
  validateLlmConfig,
  type LlmConnectionResult,
  type LlmRequest,
  type LlmResult,
} from '../src/llm/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Renderer assets (Vite build output). */
const distPath = path.join(__dirname, '../dist')
/** Optional static assets folder when developing unpackaged. */
const publicPath = app.isPackaged ? distPath : path.join(__dirname, '../public')

process.env.DIST = distPath
process.env.VITE_PUBLIC = publicPath

let mainWindow: BrowserWindow | null = null

const LLM_TIMEOUT_MS = 60_000

function requestHeaders(apiKey?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `LLM request timed out after ${LLM_TIMEOUT_MS / 1000}s. Check the server, model, or network.`,
      )
    }
    throw new Error(
      `Could not reach the LLM server. ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    clearTimeout(timer)
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  let payload: unknown
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(
      `LLM server returned non-JSON data (HTTP ${response.status}). Check the Base URL.`,
    )
  }
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'error' in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : text.slice(0, 300)
    throw new Error(`LLM server returned HTTP ${response.status}: ${detail}`)
  }
  return payload
}

async function testLlmConnection(request: LlmRequest): Promise<LlmConnectionResult> {
  const config = validateLlmConfig(request.config)
  const started = performance.now()
  const response = await fetchWithTimeout(`${config.baseUrl}/models`, {
    method: 'GET',
    headers: requestHeaders(config.apiKey),
  })
  const payload = await readJsonResponse(response)
  const models = parseModelList(payload)
  const selectedExists = models.includes(config.model)
  return {
    ok: true,
    detail:
      models.length === 0
        ? 'Connected, but the server did not report any models.'
        : selectedExists
          ? `Connected. Model "${config.model}" is available.`
          : `Connected. The selected model was not listed; choose one of the detected models.`,
    models,
    latencyMs: performance.now() - started,
  }
}

async function sendLlmChat(request: LlmRequest): Promise<LlmResult> {
  const config = validateLlmConfig(request.config)
  if (request.messages.length === 0) {
    throw new Error('At least one chat message is required.')
  }
  const started = performance.now()
  const response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages: request.messages,
      temperature: 0.4,
      stream: false,
    }),
  })
  const parsed = parseChatCompletion(await readJsonResponse(response))
  return {
    ...parsed,
    latencyMs: performance.now() - started,
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Baton',
    backgroundColor: '#0c0b0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(distPath, 'index.html'))
  }
}

// Single-instance lock so double-clicking the installer shortcut doesn't open duplicates
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()

    ipcMain.handle('baton:get-version', () => app.getVersion())
    ipcMain.handle('baton:get-platform', () => process.platform)
    ipcMain.handle('baton:llm-test', (_event, request: LlmRequest) =>
      testLlmConnection(request),
    )
    ipcMain.handle('baton:llm-chat', (_event, request: LlmRequest) =>
      sendLlmChat(request),
    )

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
