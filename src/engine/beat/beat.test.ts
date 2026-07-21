import { describe, expect, it } from 'vitest'
import { createTone, createSilence, BatonEngineError } from '../audio/buffer'
import { processBeat, estimateBpm } from './index'

function makePulse(sampleRate: number, durationSec: number, bpm: number) {
  const buf = createTone(sampleRate, durationSec, 180, 0.5)
  const period = Math.floor((60 / bpm) * sampleRate)
  for (let i = 0; i < buf.length; i++) {
    const gate = i % period < period * 0.18 ? 1 : 0.02
    for (const ch of buf.channels) ch[i]! *= gate
  }
  return buf
}

describe('Beat engine — BPM', () => {
  it('estimates BPM near 120 for a 120-BPM pulse (fails = onset/tempo search broken)', () => {
    const pulse = makePulse(44100, 4, 120)
    const { bpm, confidence } = estimateBpm(pulse, 60, 200)
    expect(bpm, `Got BPM ${bpm}`).toBeGreaterThanOrEqual(100)
    expect(bpm).toBeLessThanOrEqual(140)
    expect(confidence).toBeGreaterThan(0)
  })

  it('returns bpm 0 on silence (fails = phantom tempo on empty clips)', () => {
    const { bpm } = estimateBpm(createSilence(44100, 1), 60, 200)
    expect(bpm).toBe(0)
  })
})

describe('Beat engine — processBeat', () => {
  it('honors tap-tempo override and skips auto-detect', () => {
    const tone = createTone(44100, 2, 440)
    const result = processBeat(tone, { tapTempoBpm: 95 })
    expect(result.bpm).toBe(95)
    expect(result.confidence).toBe(1)
    expect(result.warnings.some((w) => /tap-tempo/i.test(w))).toBe(true)
  })

  it('rejects tap tempo outside min/max (fails = invalid grid written to project)', () => {
    const tone = createTone(44100, 1, 440)
    expect(() => processBeat(tone, { tapTempoBpm: 40, minBpm: 60, maxBpm: 200 })).toThrow(
      BatonEngineError,
    )
  })

  it('builds a beat grid matching BPM (fails = FL beat grid misaligned)', () => {
    const pulse = makePulse(44100, 2, 120)
    const result = processBeat(pulse, { tapTempoBpm: 120 })
    expect(result.beatGridSec.length).toBeGreaterThan(2)
    const step = result.beatGridSec[1]! - result.beatGridSec[0]!
    expect(Math.abs(step - 0.5)).toBeLessThan(0.01)
  })

  it('warns when buffer is shorter than 1 second', () => {
    const short = createTone(44100, 0.4, 440)
    const result = processBeat(short)
    expect(result.warnings.some((w) => /≥1s|1s/i.test(w))).toBe(true)
  })
})
