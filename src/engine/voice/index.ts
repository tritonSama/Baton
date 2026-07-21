/**
 * Baton Voice — singing synthesis instrument (Phase 1 oscillator preview).
 *
 * Spec: MIDI + lyrics → RVC/DiffSinger → NSF-HiFiGAN.
 * Phase 1 synthesizes pitched tones from MIDI with expression controls so the
 * piano-roll → voice pipeline can be tested before ONNX models ship.
 *
 * If this stops working, check:
 *  - empty MIDI notes
 *  - sampleRate invalid
 *  - expression params out of range (breathiness/tension/growl/falsetto)
 */

import {
  BatonEngineError,
  createSilence,
  type AudioBufferData,
} from '../audio/buffer'
import { clamp, clamp01, midiToFrequency } from '../music/scales'

export type MidiNote = {
  midi: number
  velocity: number
  startSec: number
  durationSec: number
}

export type VoiceParams = {
  voiceModelId: string
  lyrics: string
  breathiness: number
  tension: number
  growl: number
  falsetto: number
  vibratoRateHz: number
  vibratoDepth: number
  vibratoDelayMs: number
  vibratoRiseMs: number
  formantTracking: boolean
  expression: number
}

export const DEFAULT_VOICE_PARAMS: VoiceParams = {
  voiceModelId: 'preview-sine',
  lyrics: '',
  breathiness: 0.2,
  tension: 0.4,
  growl: 0,
  falsetto: 0,
  vibratoRateHz: 5.5,
  vibratoDepth: 0.25,
  vibratoDelayMs: 80,
  vibratoRiseMs: 120,
  formantTracking: true,
  expression: 0.5,
}

export type VoiceResult = {
  output: AudioBufferData
  phonemeCount: number
  warnings: string[]
  renderedNotes: number
}

const ENGINE = 'Voice'

function validateParams(params: VoiceParams): void {
  for (const [name, value] of [
    ['breathiness', params.breathiness],
    ['tension', params.tension],
    ['growl', params.growl],
    ['falsetto', params.falsetto],
    ['vibratoDepth', params.vibratoDepth],
    ['expression', params.expression],
  ] as const) {
    if (value < 0 || value > 1) {
      throw new BatonEngineError(
        ENGINE,
        'INVALID_PARAM',
        `${name} must be 0–1 (got ${value}).`,
      )
    }
  }
  if (params.vibratoRateHz < 3 || params.vibratoRateHz > 10) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Vibrato Rate must be 3–10 Hz (got ${params.vibratoRateHz}).`,
    )
  }
}

/** Count approximate phoneme slots from lyrics (whitespace/syllable heuristic). */
export function countPhonemes(lyrics: string): number {
  const trimmed = lyrics.trim()
  if (!trimmed) return 0
  return trimmed.split(/[\s\-]+/).filter(Boolean).length
}

function noise(): number {
  return Math.random() * 2 - 1
}

export function synthesizeVoice(
  notes: MidiNote[],
  sampleRate: number,
  params: Partial<VoiceParams> = {},
): VoiceResult {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_SAMPLE_RATE',
      `Sample rate ${sampleRate} Hz is invalid.`,
    )
  }

  const p: VoiceParams = { ...DEFAULT_VOICE_PARAMS, ...params }
  validateParams(p)

  const warnings: string[] = []
  if (p.voiceModelId !== 'preview-sine') {
    warnings.push(
      `Voice model "${p.voiceModelId}" not loaded — using preview oscillator. Train/load a .batonvoice preset for RVC.`,
    )
  }
  if (notes.length === 0) {
    warnings.push('No MIDI notes provided — rendering silence.')
    return {
      output: createSilence(sampleRate, 0.5),
      phonemeCount: countPhonemes(p.lyrics),
      warnings,
      renderedNotes: 0,
    }
  }

  let endSec = 0
  for (const n of notes) {
    endSec = Math.max(endSec, n.startSec + n.durationSec)
  }
  endSec += 0.05

  const output = createSilence(sampleRate, endSec)
  const left = output.channels[0]!
  const right = output.channels[1] ?? left

  for (const note of notes) {
    if (note.durationSec <= 0) continue
    const start = Math.floor(note.startSec * sampleRate)
    const len = Math.floor(note.durationSec * sampleRate)
    const baseFreq = midiToFrequency(note.midi + p.falsetto * 12)
    const vel = clamp01(note.velocity)

    for (let i = 0; i < len; i++) {
      const idx = start + i
      if (idx >= left.length) break
      const t = i / sampleRate
      const noteT = i / len

      // ADSR-ish
      const attack = Math.min(1, noteT / 0.05)
      const release = noteT > 0.85 ? (1 - noteT) / 0.15 : 1
      const env = attack * release * vel

      let vib = 0
      if (t * 1000 >= p.vibratoDelayMs) {
        const rise = clamp((t * 1000 - p.vibratoDelayMs) / Math.max(1, p.vibratoRiseMs), 0, 1)
        vib = Math.sin(2 * Math.PI * p.vibratoRateHz * t) * p.vibratoDepth * 0.3 * rise
      }

      const freq = baseFreq * 2 ** (vib / 12) * (1 + p.tension * 0.02)
      let sample = Math.sin(2 * Math.PI * freq * t)

      // Soft harmonics from tension / growl
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * p.tension * 0.2
      sample += noise() * p.growl * 0.25
      sample += noise() * p.breathiness * 0.15
      sample *= 0.35 * env * (0.7 + p.expression * 0.3)

      left[idx] = clamp((left[idx] ?? 0) + sample, -1, 1)
      right[idx] = clamp((right[idx] ?? 0) + sample, -1, 1)
    }
  }

  const phonemeCount = countPhonemes(p.lyrics)
  if (p.lyrics && phonemeCount > 0 && notes.length !== phonemeCount) {
    warnings.push(
      `Lyric syllables (${phonemeCount}) ≠ MIDI notes (${notes.length}) — phoneme timing may drift.`,
    )
  }

  return {
    output,
    phonemeCount,
    warnings,
    renderedNotes: notes.length,
  }
}
