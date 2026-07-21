import { describe, expect, it } from 'vitest'
import {
  normalizeBaseUrl,
  parseChatCompletion,
  parseModelList,
  validateLlmConfig,
} from './client'

describe('LLM connection configuration', () => {
  it('normalizes trailing slashes so endpoint paths are valid', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:11434/v1///')).toBe(
      'http://127.0.0.1:11434/v1',
    )
  })

  it('rejects non-http URLs before making a request', () => {
    expect(() => normalizeBaseUrl('file:///secret')).toThrow(/Only HTTP and HTTPS/)
  })

  it('requires a key for remote cloud endpoints', () => {
    expect(() =>
      validateLlmConfig({
        provider: 'openai-compatible',
        baseUrl: 'https://example.com/v1',
        model: 'example-model',
      }),
    ).toThrow(/API key/)
  })

  it('allows keyless localhost CPU servers', () => {
    expect(() =>
      validateLlmConfig({
        provider: 'openai-compatible',
        baseUrl: 'http://localhost:1234/v1',
        model: 'local-model',
      }),
    ).not.toThrow()
  })
})

describe('LLM response parsing', () => {
  it('extracts OpenAI-compatible chat text', () => {
    expect(
      parseChatCompletion({
        model: 'qwen',
        choices: [{ message: { content: 'Try a slower retune speed.' } }],
      }),
    ).toEqual({ model: 'qwen', content: 'Try a slower retune speed.' })
  })

  it('explains an empty chat response clearly', () => {
    expect(() => parseChatCompletion({ choices: [] })).toThrow(/contained no text/)
  })

  it('extracts model ids from the models endpoint', () => {
    expect(parseModelList({ data: [{ id: 'a' }, { id: 'b' }, {}] })).toEqual(['a', 'b'])
  })
})
