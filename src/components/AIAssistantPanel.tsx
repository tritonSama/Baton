import { useEffect, useState } from 'react'
import {
  LLM_PRESETS,
  type LlmConfig,
  type LlmMessage,
  type LlmProvider,
} from '@/llm/client'
import { useBatonStore } from '@/store/baton-store'
import { Label, Panel, PrimaryButton, SelectField } from './ui'

const SYSTEM_PROMPT = `You are Baton Assistant, a concise music-production helper.
Give practical advice for mastering, pitch correction, arrangement, vocals, and troubleshooting.
Never claim that audio was analyzed unless the user supplies analysis values in the prompt.
When suggesting Baton settings, use the parameter ranges shown by the app.`

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  'openai-compatible': 'Cloud / OpenAI-compatible',
  ollama: 'Ollama (local CPU)',
  'lm-studio': 'LM Studio (local CPU)',
}

type ChatEntry = LlmMessage & { id: number }

function loadSavedConfig(): Pick<LlmConfig, 'provider' | 'baseUrl' | 'model'> {
  const fallback = {
    provider: 'ollama' as const,
    ...LLM_PRESETS.ollama,
  }
  try {
    const saved = localStorage.getItem('baton:llm-config')
    if (!saved) return fallback
    const parsed = JSON.parse(saved) as Partial<LlmConfig>
    if (
      !parsed.provider ||
      !parsed.baseUrl ||
      !parsed.model ||
      !(parsed.provider in LLM_PRESETS)
    ) {
      return fallback
    }
    return {
      provider: parsed.provider,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    }
  } catch {
    return fallback
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function AIAssistantPanel() {
  const [saved] = useState(loadSavedConfig)
  const [provider, setProvider] = useState<LlmProvider>(saved.provider)
  const [baseUrl, setBaseUrl] = useState(saved.baseUrl)
  const [model, setModel] = useState(saved.model)
  const [apiKey, setApiKey] = useState('')
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [models, setModels] = useState<string[]>([])
  const [status, setStatus] = useState('Not tested')
  const [busy, setBusy] = useState(false)

  const bufferLabel = useBatonStore((s) => s.bufferLabel)
  const beat = useBatonStore((s) => s.beatResult)
  const master = useBatonStore((s) => s.masterResult)

  useEffect(() => {
    localStorage.setItem(
      'baton:llm-config',
      JSON.stringify({ provider, baseUrl, model }),
    )
  }, [provider, baseUrl, model])

  const config: LlmConfig = { provider, baseUrl, model, apiKey }

  function changeProvider(next: LlmProvider) {
    setProvider(next)
    setBaseUrl(LLM_PRESETS[next].baseUrl)
    setModel(LLM_PRESETS[next].model)
    setModels([])
    setStatus('Not tested')
  }

  async function testConnection() {
    if (!window.batonDesktop) {
      setStatus('Electron bridge unavailable. Launch with npm run dev or the installed app.')
      return
    }
    setBusy(true)
    setStatus('Connecting…')
    try {
      const result = await window.batonDesktop.testLlmConnection({
        config,
        messages: [],
      })
      setModels(result.models)
      setStatus(`${result.detail} ${Math.round(result.latencyMs)} ms`)
    } catch (error) {
      setStatus(`Connection failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function sendMessage() {
    const content = prompt.trim()
    if (!content || busy) return
    if (!window.batonDesktop) {
      setStatus('Electron bridge unavailable. Launch the desktop app, not a browser tab.')
      return
    }

    const userEntry: ChatEntry = {
      id: Date.now(),
      role: 'user',
      content,
    }
    const context = [
      `Current Baton buffer: ${bufferLabel}.`,
      beat ? `Detected: ${beat.bpm} BPM, ${beat.key ?? 'unknown'} ${beat.scale}.` : '',
      master
        ? `Latest master: ${master.report.integratedLUFS.toFixed(1)} LUFS, ${master.report.truePeakDb.toFixed(1)} dB true peak.`
        : '',
    ]
      .filter(Boolean)
      .join(' ')

    const history: LlmMessage[] = messages.map(({ role, content: text }) => ({
      role,
      content: text,
    }))
    setMessages((current) => [...current, userEntry])
    setPrompt('')
    setBusy(true)
    setStatus('Waiting for model…')
    try {
      const result = await window.batonDesktop.sendLlmChat({
        config,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: context },
          ...history.slice(-10),
          { role: 'user', content },
        ],
      })
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.content,
        },
      ])
      setStatus(`Answered by ${result.model} in ${(result.latencyMs / 1000).toFixed(1)}s`)
    } catch (error) {
      setStatus(`Request failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">AI Connection</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Cloud models need no local GPU. Ollama and LM Studio can run small models on CPU.
        </p>

        <SelectField
          label="Provider"
          value={provider}
          options={['ollama', 'lm-studio', 'openai-compatible']}
          onChange={changeProvider}
        />
        <p className="-mt-3 mb-4 text-xs text-[var(--color-muted)]">
          {PROVIDER_LABELS[provider]}
        </p>

        <div className="mb-4">
          <Label>Base URL</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://127.0.0.1:11434/v1"
          />
        </div>

        <div className="mb-4">
          <Label>Model</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            list="baton-llm-models"
            placeholder="qwen2.5:3b"
          />
          <datalist id="baton-llm-models">
            {models.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className="mb-4">
          <Label>API Key {provider !== 'openai-compatible' && '(usually not needed)'}</Label>
          <input
            type="password"
            autoComplete="off"
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Kept in memory only"
          />
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            Keys are not saved to disk and are sent only to the configured server.
          </p>
        </div>

        <PrimaryButton onClick={testConnection}>
          {busy ? 'Working…' : 'Test Connection'}
        </PrimaryButton>
        <p className="mt-4 break-words font-mono text-xs text-[var(--color-muted)]">
          {status}
        </p>

        <div className="mt-6 border-t border-[var(--color-line)] pt-4 text-xs leading-relaxed text-[var(--color-muted)]">
          <strong className="text-[var(--color-cream)]">CPU-only quick start:</strong>
          <br />
          Install Ollama, then run <code>ollama run qwen2.5:3b</code>. Baton connects at the
          preset URL. A 1.5B–3B model is recommended for CPU use.
        </div>
      </Panel>

      <Panel className="animate-rise flex min-h-[560px] flex-col">
        <div className="mb-4">
          <h2 className="font-display text-3xl">Production Assistant</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Ask for settings, workflow ideas, or help interpreting Baton’s analysis.
          </p>
        </div>

        <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-sm border border-[var(--color-line)] bg-[var(--color-ink)]/50 p-4">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              Example: “My vocal sounds robotic. Which Autotune settings should I change?”
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'ml-8 rounded-sm bg-[var(--color-copper)]/15 p-3 text-sm'
                  : 'mr-8 whitespace-pre-wrap rounded-sm border border-[var(--color-line)] p-3 text-sm leading-relaxed'
              }
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                {message.role === 'user' ? 'You' : 'Baton Assistant'}
              </div>
              {message.content}
            </div>
          ))}
        </div>

        <div>
          <Label>Message</Label>
          <textarea
            className="min-h-24 w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Ask about your mix… (Enter to send, Shift+Enter for a new line)"
          />
          <div className="mt-2 flex justify-end">
            <PrimaryButton onClick={() => void sendMessage()}>
              {busy ? 'Waiting…' : 'Send'}
            </PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  )
}
