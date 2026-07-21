import { describe, expect, it } from 'vitest'
import { BatonEngineError } from '../audio/buffer'
import { synthesizeVoice, countPhonemes, DEFAULT_VOICE_PARAMS } from './index'

describe('Voice engine — lyrics helpers', () => {
  it('counts phoneme-like tokens from lyrics (fails = timing editor syllable count wrong)', () => {
    expect(countPhonemes('hello world')).toBe(2)
    expect(countPhonemes('sha-la-la')).toBe(3)
    expect(countPhonemes('   ')).toBe(0)
  })
})

describe('Voice engine — synthesizeVoice', () => {
  it('renders audible audio for a MIDI note (fails = silent instrument in Piano Roll)', () => {
    const result = synthesizeVoice(
      [{ midi: 64, velocity: 1, startSec: 0, durationSec: 0.4 }],
      44100,
      { ...DEFAULT_VOICE_PARAMS },
    )
    let peak = 0
    for (const s of result.output.channels[0]!) peak = Math.max(peak, Math.abs(s))
    expect(peak, `Peak was ${peak}`).toBeGreaterThan(0.01)
    expect(result.renderedNotes).toBe(1)
  })

  it('empty MIDI yields silence + warning without throwing', () => {
    const result = synthesizeVoice([], 44100)
    expect(result.renderedNotes).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('rejects invalid sample rate', () => {
    expect(() =>
      synthesizeVoice([{ midi: 60, velocity: 1, startSec: 0, durationSec: 0.1 }], 1000),
    ).toThrow(BatonEngineError)
  })

  it('rejects breathiness outside 0–1', () => {
    expect(() =>
      synthesizeVoice([{ midi: 60, velocity: 1, startSec: 0, durationSec: 0.1 }], 44100, {
        breathiness: 2,
      }),
    ).toThrow(/breathiness/)
  })

  it('warns when lyric syllable count ≠ note count', () => {
    const result = synthesizeVoice(
      [{ midi: 60, velocity: 1, startSec: 0, durationSec: 0.2 }],
      44100,
      { lyrics: 'one two three' },
    )
    expect(result.warnings.some((w) => /syllables|MIDI notes/i.test(w))).toBe(true)
  })

  it('warns when non-preview voice model id is used', () => {
    const result = synthesizeVoice(
      [{ midi: 60, velocity: 1, startSec: 0, durationSec: 0.2 }],
      44100,
      { voiceModelId: 'my-clone.batonvoice' },
    )
    expect(result.warnings.some((w) => /not loaded|preview/i.test(w))).toBe(true)
  })
})
