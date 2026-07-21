/**
 * Baton Beat — BPM, key, and chord progression analysis.
 *
 * Spec: <5ms beat tracking; madmom/Essentia in native core later.
 * Phase 1 uses onset-energy BPM + pitch-class key estimation.
 *
 * If this stops working, check:
 *  - too-short buffers (<1s) → unreliable BPM
 *  - silence → bpm=0, key=null
 *  - tap tempo override path in UI store
 */

import {
  assertAudioBuffer,
  BatonEngineError,
  mixToMono,
  rmsAmplitude,
  type AudioBufferData,
} from '../audio/buffer'
import {
  NOTE_NAMES,
  type NoteName,
  type ScaleType,
  frequencyToMidi,
} from '../music/scales'
import { detectPitchHz } from '../autotune'

export type BeatParams = {
  tapTempoBpm: number | null
  minBpm: number
  maxBpm: number
}

export const DEFAULT_BEAT_PARAMS: BeatParams = {
  tapTempoBpm: null,
  minBpm: 60,
  maxBpm: 200,
}

export type ChordEvent = {
  timeSec: number
  chord: string
  confidence: number
}

export type BeatResult = {
  bpm: number
  confidence: number
  key: NoteName | null
  scale: ScaleType
  chords: ChordEvent[]
  beatGridSec: number[]
  warnings: string[]
}

const ENGINE = 'Beat'

function onsetEnvelope(mono: Float32Array, sampleRate: number): Float32Array {
  const hop = Math.floor(sampleRate * 0.01)
  const frame = hop * 4
  const env = new Float32Array(Math.max(1, Math.floor((mono.length - frame) / hop)))
  let prev = 0
  for (let i = 0; i < env.length; i++) {
    const start = i * hop
    let e = 0
    for (let j = 0; j < frame; j++) {
      const s = mono[start + j] ?? 0
      e += s * s
    }
    const flux = Math.max(0, e - prev)
    env[i] = flux
    prev = e * 0.85
  }
  return env
}

export function estimateBpm(
  buffer: AudioBufferData,
  minBpm: number,
  maxBpm: number,
): { bpm: number; confidence: number } {
  const mono = mixToMono(buffer)
  if (rmsAmplitude(mono) < 1e-6) return { bpm: 0, confidence: 0 }

  const sampleRate = buffer.sampleRate
  const env = onsetEnvelope(mono, sampleRate)
  const hopSec = 0.01

  let bestBpm = 0
  let bestScore = 0
  for (let bpm = minBpm; bpm <= maxBpm; bpm++) {
    const period = 60 / bpm / hopSec
    let score = 0
    for (let i = 0; i < env.length; i++) {
      const phase = (i % period) / period
      const weight = phase < 0.12 || phase > 0.88 ? 1 : 0.15
      score += (env[i] ?? 0) * weight
    }
    if (score > bestScore) {
      bestScore = score
      bestBpm = bpm
    }
  }

  const total = env.reduce((a, b) => a + b, 0) || 1
  return { bpm: bestBpm, confidence: Math.min(1, bestScore / total) }
}

export function estimateKey(buffer: AudioBufferData): {
  key: NoteName | null
  scale: ScaleType
  confidence: number
} {
  const mono = mixToMono(buffer)
  const hist = new Float32Array(12)
  const frame = Math.floor(buffer.sampleRate * 0.05)
  const hop = Math.floor(frame / 2)
  let voiced = 0

  for (let start = 0; start + frame < mono.length; start += hop) {
    const freq = detectPitchHz(
      mono.subarray(start, start + frame),
      buffer.sampleRate,
      60,
      1200,
    )
    if (freq <= 0) continue
    const midi = frequencyToMidi(freq)
    if (!Number.isFinite(midi)) continue
    const pc = ((Math.round(midi) % 12) + 12) % 12
    hist[pc]! += 1
    voiced++
  }

  if (voiced < 3) return { key: null, scale: 'Major', confidence: 0 }

  // Krumhansl-Schmuckler-ish major/minor profiles
  const major = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
  const minor = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

  let bestKey = 0
  let bestScale: ScaleType = 'Major'
  let best = -Infinity

  for (let root = 0; root < 12; root++) {
    for (const [profile, scale] of [
      [major, 'Major'],
      [minor, 'Minor'],
    ] as const) {
      let corr = 0
      for (let i = 0; i < 12; i++) {
        corr += hist[i]! * profile[(i - root + 12) % 12]!
      }
      if (corr > best) {
        best = corr
        bestKey = root
        bestScale = scale
      }
    }
  }

  return {
    key: NOTE_NAMES[bestKey]!,
    scale: bestScale,
    confidence: Math.min(1, voiced / 40),
  }
}

function buildBeatGrid(durationSec: number, bpm: number): number[] {
  if (bpm <= 0 || durationSec <= 0) return []
  const step = 60 / bpm
  const grid: number[] = []
  for (let t = 0; t < durationSec; t += step) grid.push(Number(t.toFixed(4)))
  return grid
}

function simpleChords(
  key: NoteName | null,
  scale: ScaleType,
  durationSec: number,
  bpm: number,
): ChordEvent[] {
  if (!key || bpm <= 0) return []
  const diatonic =
    scale === 'Minor'
      ? [`${key}m`, `${NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 3) % 12]}`, `${NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 7) % 12]}m`, `${NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 8) % 12]}`]
      : [`${key}`, `${NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 5) % 12]}`, `${NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 7) % 12]}`, `${key}`]
  const bar = (60 / bpm) * 4
  const events: ChordEvent[] = []
  let i = 0
  for (let t = 0; t < durationSec; t += bar) {
    events.push({
      timeSec: Number(t.toFixed(3)),
      chord: diatonic[i % diatonic.length]!,
      confidence: 0.55,
    })
    i++
  }
  return events
}

export function processBeat(
  input: AudioBufferData,
  params: Partial<BeatParams> = {},
): BeatResult {
  assertAudioBuffer(ENGINE, input)
  const p: BeatParams = { ...DEFAULT_BEAT_PARAMS, ...params }
  const warnings: string[] = []
  const durationSec = input.length / input.sampleRate

  if (durationSec < 1) {
    warnings.push(
      `Buffer is only ${durationSec.toFixed(2)}s — BPM/key detection needs ≥1s for reliable results.`,
    )
  }

  let bpm: number
  let confidence: number

  if (p.tapTempoBpm != null) {
    if (p.tapTempoBpm < p.minBpm || p.tapTempoBpm > p.maxBpm) {
      throw new BatonEngineError(
        ENGINE,
        'INVALID_PARAM',
        `Tap tempo ${p.tapTempoBpm} BPM is outside ${p.minBpm}–${p.maxBpm}.`,
      )
    }
    bpm = p.tapTempoBpm
    confidence = 1
    warnings.push('Using tap-tempo override; auto-detect skipped.')
  } else {
    const est = estimateBpm(input, p.minBpm, p.maxBpm)
    bpm = est.bpm
    confidence = est.confidence
  }

  const keyEst = estimateKey(input)
  if (!keyEst.key) {
    warnings.push('Could not detect musical key — input may be silent, noisy, or percussive-only.')
  }

  return {
    bpm,
    confidence,
    key: keyEst.key,
    scale: keyEst.scale,
    chords: simpleChords(keyEst.key, keyEst.scale, durationSec, bpm),
    beatGridSec: buildBeatGrid(durationSec, bpm),
    warnings,
  }
}
