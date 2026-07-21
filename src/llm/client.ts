export type LlmProvider = 'openai-compatible' | 'ollama' | 'lm-studio'

export type LlmConfig = {
  provider: LlmProvider
  baseUrl: string
  model: string
  apiKey?: string
}

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LlmRequest = {
  config: LlmConfig
  messages: LlmMessage[]
}

export type LlmResult = {
  content: string
  model: string
  latencyMs: number
}

export type LlmConnectionResult = {
  ok: boolean
  detail: string
  models: string[]
  latencyMs: number
}

export const LLM_PRESETS: Record<
  LlmProvider,
  Pick<LlmConfig, 'baseUrl' | 'model'>
> = {
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
  ollama: {
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:3b',
  },
  'lm-studio': {
    baseUrl: 'http://127.0.0.1:1234/v1',
    model: 'local-model',
  },
}

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(
      `Invalid server URL "${value}". Use an http(s) address such as http://127.0.0.1:11434/v1.`,
    )
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol "${url.protocol}". Only HTTP and HTTPS are allowed.`)
  }
  return url.toString().replace(/\/$/, '')
}

export function validateLlmConfig(config: LlmConfig): LlmConfig {
  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const model = config.model.trim()
  if (!model) {
    throw new Error('Model is required. Example: qwen2.5:3b or gpt-4.1-mini.')
  }
  if (
    config.provider === 'openai-compatible' &&
    !config.apiKey?.trim() &&
    !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/i.test(baseUrl)
  ) {
    throw new Error('An API key is required for a remote cloud provider.')
  }
  return { ...config, baseUrl, model, apiKey: config.apiKey?.trim() }
}

export function parseChatCompletion(payload: unknown): { content: string; model: string } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('The LLM returned an invalid JSON response.')
  }
  const data = payload as {
    model?: unknown
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>
  }
  const first = data.choices?.[0]
  const content =
    typeof first?.message?.content === 'string'
      ? first.message.content
      : typeof first?.text === 'string'
        ? first.text
        : ''
  if (!content.trim()) {
    throw new Error(
      'The LLM response contained no text. Check that the selected model supports chat completions.',
    )
  }
  return {
    content: content.trim(),
    model: typeof data.model === 'string' ? data.model : 'unknown',
  }
}

export function parseModelList(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const data = payload as { data?: Array<{ id?: unknown }> }
  return (data.data ?? [])
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}
