import { describe, expect, it } from 'vitest'
import { createTone } from '../audio/buffer'
import { processSplit, listStemOutputs } from './index'

describe('Split engine — stem routing contract', () => {
  it('2-stem mode returns vocals + other only (fails = mixer routing wrong channel count)', () => {
    expect(listStemOutputs(2)).toEqual(['vocals', 'other'])
  })

  it('4-stem mode returns drums, bass, vocals, other', () => {
    expect(listStemOutputs(4)).toEqual(['drums', 'bass', 'vocals', 'other'])
  })

  it('6-stem mode returns six names including guitar and piano', () => {
    expect(listStemOutputs(6)).toEqual([
      'drums',
      'bass',
      'vocals',
      'guitar',
      'piano',
      'other',
    ])
  })
})

describe('Split engine — processSplit', () => {
  it('populates every stem buffer at input length (fails = empty playlist clips)', () => {
    const tone = createTone(44100, 0.4, 330)
    const result = processSplit(tone, { stemMode: 4, model: 'lightweight' })
    for (const name of result.stemNames) {
      const stem = result.stems[name]
      expect(stem, `Missing stem buffer: ${name}`).toBeDefined()
      expect(stem!.length, `${name} length mismatch`).toBe(tone.length)
      expect(stem!.sampleRate).toBe(tone.sampleRate)
    }
  })

  it('warns when Demucs is selected without weights (fails = users think neural model ran)', () => {
    const tone = createTone(44100, 0.3, 440)
    const result = processSplit(tone, { model: 'demucs-v4', stemMode: 6 })
    expect(result.warnings.some((w) => /neural|preview|not loaded/i.test(w))).toBe(true)
  })

  it('rejects invalid stemMode values', () => {
    const tone = createTone(44100, 0.2, 440)
    expect(() => processSplit(tone, { stemMode: 3 as never })).toThrow(/Stems mode/)
  })
})
