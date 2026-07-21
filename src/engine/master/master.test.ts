import { describe, expect, it } from 'vitest'
import { createTone, BatonEngineError } from '../audio/buffer'
import { processMaster, estimateLUFS, estimateTruePeakDb } from './index'

describe('Master engine — metering', () => {
  it('estimates finite LUFS for a tone (fails = loudness meter NaN → bad gain staging)', () => {
    const tone = createTone(44100, 0.5, 440, 0.3)
    const lufs = estimateLUFS(tone)
    expect(Number.isFinite(lufs), `LUFS was ${lufs}`).toBe(true)
    expect(lufs).toBeGreaterThan(-60)
    expect(lufs).toBeLessThan(0)
  })

  it('true peak is above LUFS for a sine (fails = crest factor inverted)', () => {
    const tone = createTone(44100, 0.4, 440, 0.5)
    const peak = estimateTruePeakDb(tone)
    const lufs = estimateLUFS(tone)
    expect(peak, 'True peak should exceed integrated loudness on a sine').toBeGreaterThan(lufs)
  })
})

describe('Master engine — processMaster', () => {
  it('rejects loudness targets outside -23…-8 LUFS (fails = delivery check bypassed)', () => {
    const tone = createTone(44100, 0.3, 440)
    expect(() => processMaster(tone, { loudnessTargetLUFS: -24 })).toThrow(BatonEngineError)
    expect(() => processMaster(tone, { loudnessTargetLUFS: -7 })).toThrow(/Loudness Target/)
  })

  it('warns when render mode requested without GPU (fails = silent fallback, users think AI ran)', () => {
    const tone = createTone(44100, 0.3, 440)
    const result = processMaster(tone, { mode: 'render', renderQuality: 'Ultra' })
    expect(
      result.warnings.some((w) => /ONNX|GPU|preview/i.test(w)),
      `Expected GPU-fallback warning, got: ${result.warnings.join(' | ')}`,
    ).toBe(true)
  })

  it('warns in reference mode without a reference track', () => {
    const tone = createTone(44100, 0.3, 440)
    const result = processMaster(tone, { mode: 'reference' }, null)
    expect(result.warnings.some((w) => /reference/i.test(w))).toBe(true)
  })

  it('returns a loudness report with finite meters (fails = report UI shows blanks)', () => {
    const tone = createTone(44100, 0.5, 220, 0.25)
    const result = processMaster(tone, {
      mode: 'preview',
      loudnessTargetLUFS: -14,
      masterStrength: 0.8,
      genrePreset: 'EDM',
    })
    expect(Number.isFinite(result.report.integratedLUFS)).toBe(true)
    expect(Number.isFinite(result.report.truePeakDb)).toBe(true)
    expect(result.output.length).toBe(tone.length)
  })

  it('rejects masterStrength outside 0–1', () => {
    const tone = createTone(44100, 0.2, 440)
    expect(() => processMaster(tone, { masterStrength: 1.5 })).toThrow(/Master Strength/)
  })
})
