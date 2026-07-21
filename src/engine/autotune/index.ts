/**
 * Baton Autotune — real-time pitch correction engine (Phase 1 CPU preview).
 *
 * Spec targets: <10ms latency, scale/key snapping, formant preserve, humanize.
 * This TypeScript core implements pitch detection + correction math for the
 * standalone app. Native aubio/Rubber Band/WORLD bindings land in the C++ plugin.
 *
 * If this stops working, check:
 *  - pitch detection returning 0 / NaN (silent or noisy input)
 *  - scale/key config (snapMidiToScale)
 *  - bypass flag leaving dry signal untouched
 */

import {
  assertAudioBuffer,
  BatonEngineError,
  cloneBuffer,
  mixToMono,
  type AudioBufferData,
} from '../audio/buffer'
import {
  clamp,
  frequencyToMidi,
  midiToFrequency,
  snapMidiToScale,
  type NoteName,
  type ScaleType,
} from '../music/scales'

export type InputVoiceType =
  | 'Soprano'
  | 'Alto'
  | 'Tenor'
  | 'Baritone'
  | 'Bass'
  | 'Instrument'

export type AutotuneParams = {
  retuneSpeedMs: number
  correctionAmount: number
  key: NoteName
  scale: ScaleType
  formantShift: number
  formantPreserve: boolean
  humanize: number
  vibratoDepth: number
  vibratoRateHz: number
  inputType: InputVoiceType
  bypass: boolean
}

export const DEFAULT_AUTOTUNE_PARAMS: AutotuneParams = {
  retuneSpeedMs: 40,
  correctionAmount: 0.85,
  key: 'C',
  scale: 'Major',
  formantShift: 0,
  formantPreserve: true,
  humanize: 0.15,
  vibratoDepth: 0,
  vibratoRateHz: 5.5,
  inputType: 'Tenor',
  bypass: false,
}

export type PitchFrame = {
  timeSec: number
  frequencyHz: number
  midi: number
  correctedMidi: number
  centsOff: number
}

export type AutotuneResult = {
  output: AudioBufferData
  frames: PitchFrame[]
  detectedKeyConfidence: number
  averageCentsCorrection: number
}

const ENGINE = 'Autotune'

function voiceFreqRange(inputType: InputVoiceType): [number, number] {
  switch (inputType) {
    case 'Soprano':
      return [200, 1200]
    case 'Alto':
      return [150, 900]
    case 'Tenor':
      return [100, 600]
    case 'Baritone':
      return [80, 450]
    case 'Bass':
      return [60, 350]
    case 'Instrument':
      return [40, 4000]
  }
}

/**
 * Autocorrelation YIN-style pitch estimate for a mono frame.
 * Returns 0 when confidence is too low (silence / noise).
 */
export function detectPitchHz(
  samples: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
): number {
  if (samples.length < 64) return 0

  const minLag = Math.floor(sampleRate / maxHz)
  const maxLag = Math.min(Math.floor(sampleRate / minHz), samples.length - 1)
  if (minLag >= maxLag) return 0

  let bestLag = -1
  let bestCorr = -Infinity
  let energy = 0
  for (let i = 0; i < samples.length; i++) energy += samples[i]! * samples[i]!
  if (energy < 1e-8) return 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < samples.length - lag; i++) {
      corr += samples[i]! * samples[i + lag]!
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (bestLag < 0 || bestCorr / energy < 0.15) return 0
  return sampleRate / bestLag
}

function validateParams(params: AutotuneParams): void {
  if (params.retuneSpeedMs < 0 || params.retuneSpeedMs > 100) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Retune Speed must be 0–100 ms (got ${params.retuneSpeedMs}).`,
    )
  }
  if (params.correctionAmount < 0 || params.correctionAmount > 1) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Correction Amount must be 0–1 (got ${params.correctionAmount}).`,
    )
  }
  if (params.vibratoRateHz < 3 || params.vibratoRateHz > 10) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Vibrato Rate must be 3–10 Hz (got ${params.vibratoRateHz}).`,
    )
  }
  if (params.formantShift < -12 || params.formantShift > 12) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Formant Shift must be -12…+12 (got ${params.formantShift}).`,
    )
  }
}

/**
 * Process a buffer with pitch correction.
 * Uses block-wise detection + resampling ratio for preview-quality retune.
 */
export function processAutotune(
  input: AudioBufferData,
  params: Partial<AutotuneParams> = {},
): AutotuneResult {
  assertAudioBuffer(ENGINE, input)
  const p: AutotuneParams = { ...DEFAULT_AUTOTUNE_PARAMS, ...params }
  validateParams(p)

  if (p.bypass) {
    return {
      output: cloneBuffer(input),
      frames: [],
      detectedKeyConfidence: 0,
      averageCentsCorrection: 0,
    }
  }

  const mono = mixToMono(input)
  const [minHz, maxHz] = voiceFreqRange(p.inputType)
  const frameSize = Math.max(256, Math.floor(input.sampleRate * 0.04))
  const hop = Math.floor(frameSize / 2)
  const frames: PitchFrame[] = []

  let smoothedMidi = NaN
  const alpha = clamp(1 - p.retuneSpeedMs / 100, 0.05, 1)
  let centsSum = 0
  let centsCount = 0

  // Per-sample playback ratio from corrected pitch (phase vocoder lite)
  const ratios = new Float32Array(input.length)
  ratios.fill(1)

  for (let start = 0; start + frameSize <= mono.length; start += hop) {
    const slice = mono.subarray(start, start + frameSize)
    const freq = detectPitchHz(slice, input.sampleRate, minHz, maxHz)
    const midi = frequencyToMidi(freq)

    if (!Number.isFinite(midi) || freq <= 0) {
      frames.push({
        timeSec: start / input.sampleRate,
        frequencyHz: 0,
        midi: NaN,
        correctedMidi: NaN,
        centsOff: 0,
      })
      continue
    }

    let corrected = snapMidiToScale(midi, p.key, p.scale, p.correctionAmount)

    if (p.humanize > 0) {
      const jitter = (Math.sin(start * 0.0017) * 0.08 + Math.sin(start * 0.0031) * 0.04) * p.humanize
      corrected += jitter
    }

    if (p.vibratoDepth > 0) {
      const t = start / input.sampleRate
      corrected += Math.sin(2 * Math.PI * p.vibratoRateHz * t) * p.vibratoDepth * 0.5
    }

    if (!Number.isFinite(smoothedMidi)) smoothedMidi = corrected
    else smoothedMidi = smoothedMidi + alpha * (corrected - smoothedMidi)

    const centsOff = (smoothedMidi - midi) * 100
    centsSum += Math.abs(centsOff)
    centsCount++

    const ratio = midiToFrequency(smoothedMidi) / freq
    const end = Math.min(start + hop, input.length)
    for (let i = start; i < end; i++) ratios[i] = ratio

    frames.push({
      timeSec: start / input.sampleRate,
      frequencyHz: freq,
      midi,
      correctedMidi: smoothedMidi,
      centsOff,
    })
  }

  const output = cloneBuffer(input)
  // Simple time-domain pitch shift via linear resampling per channel (preview quality)
  for (let c = 0; c < output.channels.length; c++) {
    const src = input.channels[c]!
    const dst = output.channels[c]!
    let readPos = 0
    for (let i = 0; i < dst.length; i++) {
      const ratio = ratios[i] ?? 1
      const idx = Math.floor(readPos)
      const frac = readPos - idx
      const s0 = src[Math.min(idx, src.length - 1)] ?? 0
      const s1 = src[Math.min(idx + 1, src.length - 1)] ?? 0
      let sample = s0 + (s1 - s0) * frac

      if (p.formantShift !== 0 && !p.formantPreserve) {
        // Crude spectral tilt proxy when formants are not preserved
        sample *= 1 + p.formantShift * 0.02
      }

      dst[i] = clamp(sample, -1, 1)
      readPos += ratio
      if (readPos >= src.length) readPos = src.length - 1
    }
  }

  return {
    output,
    frames,
    detectedKeyConfidence: frames.filter((f) => f.frequencyHz > 0).length / Math.max(1, frames.length),
    averageCentsCorrection: centsCount ? centsSum / centsCount : 0,
  }
}
