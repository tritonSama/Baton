import { describe, expect, it } from 'vitest'
import {
  snapMidiToScale,
  getScalePitchClasses,
  frequencyToMidi,
  midiToFrequency,
  NOTE_NAMES,
} from './scales'

describe('Music scales — foundation for Autotune & Beat', () => {
  it('C major pitch classes are the white keys (fails = Autotune snaps to wrong notes)', () => {
    expect(getScalePitchClasses('C', 'Major').sort((a, b) => a - b)).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ])
  })

  it('chromatic scale includes all 12 pitch classes', () => {
    expect(getScalePitchClasses('D', 'Chromatic')).toHaveLength(12)
  })

  it('fully corrects C# toward C or D in C major', () => {
    const snapped = Math.round(snapMidiToScale(61, 'C', 'Major', 1))
    expect([60, 62]).toContain(snapped)
  })

  it('correctionAmount=0 leaves MIDI unchanged', () => {
    expect(snapMidiToScale(61, 'C', 'Major', 0)).toBe(61)
  })

  it('A440 round-trips through MIDI (fails = global detune)', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5)
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })

  it('NOTE_NAMES has 12 entries starting at C', () => {
    expect(NOTE_NAMES).toHaveLength(12)
    expect(NOTE_NAMES[0]).toBe('C')
    expect(NOTE_NAMES[9]).toBe('A')
  })
})
