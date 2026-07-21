/**
 * Autotune engine tests.
 * Failure messages name the broken behavior so CI/logs are actionable.
 */
import { describe, expect, it } from 'vitest'
import { createTone, createSilence, BatonEngineError } from '../audio/buffer'
import { processAutotune, detectPitchHz, DEFAULT_AUTOTUNE_PARAMS } from './index'

describe('Autotune engine — pitch detection', () => {
  it('detects ~440 Hz on an A4 tone (fails = YIN/autocorr broken → Autotune hears wrong pitch)', () => {
    const sr = 44100
    const tone = createTone(sr, 0.25, 440, 0.5, 1)
    const freq = detectPitchHz(tone.channels[0]!, sr, 80, 1000)
    expect(
      freq,
      `Expected ~440 Hz pitch, got ${freq}. Silence floor or lag search may be wrong.`,
    ).toBeGreaterThan(420)
    expect(freq).toBeLessThan(460)
  })

  it('returns 0 Hz on silence (fails = false pitches on quiet input)', () => {
    const silence = createSilence(44100, 0.2, 1)
    const freq = detectPitchHz(silence.channels[0]!, 44100, 80, 1000)
    expect(freq, 'Silence must not report a pitched frequency').toBe(0)
  })
})

describe('Autotune engine — processAutotune', () => {
  it('throws EMPTY_BUFFER when input is missing (fails = callers get cryptic crashes)', () => {
    expect(() => processAutotune(null as never)).toThrow(BatonEngineError)
    try {
      processAutotune(null as never)
    } catch (e) {
      expect((e as BatonEngineError).code).toBe('EMPTY_BUFFER')
      expect((e as BatonEngineError).engine).toBe('Autotune')
    }
  })

  it('bypass copies length and skips frames (fails = bypass still processing)', () => {
    const tone = createTone(44100, 0.3, 330)
    const result = processAutotune(tone, { bypass: true })
    expect(result.output.length).toBe(tone.length)
    expect(result.frames, 'Bypass must not emit pitch frames').toHaveLength(0)
  })

  it('rejects retuneSpeedMs outside 0–100 (fails = param validation removed)', () => {
    const tone = createTone(44100, 0.2, 220)
    expect(() => processAutotune(tone, { retuneSpeedMs: -1 })).toThrow(/Retune Speed/)
    expect(() => processAutotune(tone, { retuneSpeedMs: 101 })).toThrow(/Retune Speed/)
  })

  it('produces output same length as input (fails = buffer corruption / resampling bug)', () => {
    const tone = createTone(44100, 0.5, 246.94) // B3
    const result = processAutotune(tone, {
      ...DEFAULT_AUTOTUNE_PARAMS,
      key: 'C',
      scale: 'Major',
      correctionAmount: 1,
    })
    expect(result.output.length).toBe(tone.length)
    expect(result.output.sampleRate).toBe(tone.sampleRate)
    expect(result.frames.length).toBeGreaterThan(0)
  })

  it('merges partial params with defaults (fails = undefined param crashes)', () => {
    const tone = createTone(44100, 0.2, 440)
    expect(() => processAutotune(tone, { key: 'G' })).not.toThrow()
  })
})
