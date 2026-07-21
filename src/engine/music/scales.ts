/**
 * Musical scale / key helpers for Autotune and Beat engines.
 * Failure mode: wrong key/scale snaps notes to the wrong pitch grid.
 */

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export type NoteName = (typeof NOTE_NAMES)[number]

export type ScaleType =
  | 'Major'
  | 'Minor'
  | 'Dorian'
  | 'Phrygian'
  | 'Lydian'
  | 'Mixolydian'
  | 'Chromatic'
  | 'Custom'

/** Semitone offsets from root for each named scale. */
const SCALE_INTERVALS: Record<Exclude<ScaleType, 'Custom'>, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

export function noteNameToMidi(note: NoteName, octave = 4): number {
  const idx = NOTE_NAMES.indexOf(note)
  return (octave + 1) * 12 + idx
}

export function frequencyToMidi(freqHz: number): number {
  if (freqHz <= 0) return NaN
  return 69 + 12 * Math.log2(freqHz / 440)
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function getScalePitchClasses(
  key: NoteName,
  scale: ScaleType,
  customIntervals?: number[],
): number[] {
  const root = NOTE_NAMES.indexOf(key)
  if (root < 0) {
    throw new Error(`Unknown key "${key}". Expected one of: ${NOTE_NAMES.join(', ')}`)
  }
  const intervals =
    scale === 'Custom'
      ? (customIntervals ?? SCALE_INTERVALS.Chromatic)
      : SCALE_INTERVALS[scale]
  return intervals.map((i) => (root + i) % 12)
}

/** Snap a MIDI note to the nearest allowed pitch class in the scale. */
export function snapMidiToScale(
  midi: number,
  key: NoteName,
  scale: ScaleType,
  correctionAmount = 1,
  customIntervals?: number[],
): number {
  if (!Number.isFinite(midi)) return midi
  const classes = getScalePitchClasses(key, scale, customIntervals)
  const octave = Math.floor(midi / 12)
  const pc = ((Math.round(midi) % 12) + 12) % 12

  let best = classes[0]!
  let bestDist = Infinity
  for (const c of classes) {
    const dist = Math.min(Math.abs(c - pc), 12 - Math.abs(c - pc))
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  }

  let target = octave * 12 + best
  // Prefer nearest octave when wrapping
  if (Math.abs(target - midi) > 6) {
    target += target > midi ? -12 : 12
  }

  return midi + (target - midi) * clamp01(correctionAmount)
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
