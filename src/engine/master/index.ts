/**
 * Baton Master — AI mastering preview chain (Phase 1 CPU DSP).
 *
 * Spec: Preview <30ms CPU chain; Render/Reference modes use ONNX later.
 * Pipeline: Loudness Analysis → EQ tilt → Multiband compress → Width → Limit → LUFS.
 *
 * If this stops working, check:
 *  - loudnessTargetLUFS out of -23…-8 range
 *  - silent input → gainStage blowing up (guarded by noise floor)
 *  - mode === 'render' without GPU runtime (falls back to preview with warning)
 */

import {
  assertAudioBuffer,
  BatonEngineError,
  cloneBuffer,
  mixToMono,
  peakAmplitude,
  rmsAmplitude,
  type AudioBufferData,
} from '../audio/buffer'
import { clamp01 } from '../music/scales'

export type MasterMode = 'preview' | 'render' | 'reference'
export type GenrePreset =
  | 'Hip-Hop'
  | 'Pop'
  | 'EDM'
  | 'Rock'
  | 'Jazz'
  | 'Classical'
  | 'Custom'
export type RenderQuality = 'Draft' | 'Standard' | 'High' | 'Ultra'

export type MasterParams = {
  masterStrength: number
  loudnessTargetLUFS: number
  genrePreset: GenrePreset
  width: number
  lowEndFocus: number
  highEndAir: number
  mode: MasterMode
  renderQuality: RenderQuality
}

export const DEFAULT_MASTER_PARAMS: MasterParams = {
  masterStrength: 0.65,
  loudnessTargetLUFS: -14,
  genrePreset: 'Pop',
  width: 0.55,
  lowEndFocus: 0.4,
  highEndAir: 0.35,
  mode: 'preview',
  renderQuality: 'Standard',
}

export type LoudnessReport = {
  integratedLUFS: number
  truePeakDb: number
  loudnessRange: number
  crestFactorDb: number
}

export type MasterResult = {
  output: AudioBufferData
  report: LoudnessReport
  warnings: string[]
  appliedGainDb: number
}

const ENGINE = 'Master'

const GENRE_EQ: Record<GenrePreset, { low: number; mid: number; high: number }> = {
  'Hip-Hop': { low: 1.25, mid: 0.95, high: 1.05 },
  Pop: { low: 1.05, mid: 1.0, high: 1.15 },
  EDM: { low: 1.3, mid: 0.9, high: 1.25 },
  Rock: { low: 1.1, mid: 1.1, high: 1.1 },
  Jazz: { low: 0.95, mid: 1.0, high: 1.05 },
  Classical: { low: 0.9, mid: 1.0, high: 1.0 },
  Custom: { low: 1.0, mid: 1.0, high: 1.0 },
}

/** Approximate integrated loudness from RMS (not full EBU R128 — Phase 1 proxy). */
export function estimateLUFS(buffer: AudioBufferData): number {
  const mono = mixToMono(buffer)
  const rms = rmsAmplitude(mono)
  if (rms < 1e-10) return -70
  return 20 * Math.log10(rms) - 0.691
}

export function estimateTruePeakDb(buffer: AudioBufferData): number {
  const peak = peakAmplitude(buffer)
  if (peak < 1e-10) return -70
  return 20 * Math.log10(peak)
}

function validateParams(params: MasterParams): void {
  if (params.masterStrength < 0 || params.masterStrength > 1) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Master Strength must be 0–1 (got ${params.masterStrength}).`,
    )
  }
  if (params.loudnessTargetLUFS < -23 || params.loudnessTargetLUFS > -8) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Loudness Target must be -23…-8 LUFS (got ${params.loudnessTargetLUFS}). Streaming≈-14, Club≈-9, Broadcast≈-23.`,
    )
  }
}

function softClip(x: number): number {
  return Math.tanh(x)
}

/**
 * Soft M/S stereo width: 0 = mono, 0.5 = unchanged, 1 = enhanced sides.
 */
function applyWidth(left: number, right: number, width: number): [number, number] {
  const mid = (left + right) * 0.5
  const side = (left - right) * 0.5
  const sideGain = width * 2
  const midGain = 1 + (0.5 - width) * 0.4
  return [mid * midGain + side * sideGain, mid * midGain - side * sideGain]
}

export function processMaster(
  input: AudioBufferData,
  params: Partial<MasterParams> = {},
  reference?: AudioBufferData | null,
): MasterResult {
  assertAudioBuffer(ENGINE, input)
  const p: MasterParams = { ...DEFAULT_MASTER_PARAMS, ...params }
  validateParams(p)

  const warnings: string[] = []
  if (p.mode === 'render' || p.mode === 'reference') {
    warnings.push(
      `${p.mode} mode requested — ONNX/GPU mastering not bundled yet; applying enhanced CPU preview chain.`,
    )
  }
  if (p.mode === 'reference' && !reference) {
    warnings.push('Reference mode active but no reference track was provided; genre EQ only.')
  }

  const inputLufs = estimateLUFS(input)
  let target = p.loudnessTargetLUFS
  if (reference && p.mode === 'reference') {
    target = estimateLUFS(reference)
    warnings.push(`Matched reference loudness ≈ ${target.toFixed(1)} LUFS.`)
  }

  const strength = clamp01(p.masterStrength)
  const gainDb = (target - inputLufs) * strength
  const linearGain = 10 ** (gainDb / 20)
  const eq = GENRE_EQ[p.genrePreset]
  const lowBoost = 1 + (eq.low - 1) * strength * (0.5 + p.lowEndFocus)
  const highBoost = 1 + (eq.high - 1) * strength * (0.5 + p.highEndAir)

  const output = cloneBuffer(input)
  const left = output.channels[0]!
  const right = output.channels[1] ?? output.channels[0]!

  // One-pole low/high shelves as lightweight multiband proxy
  let lowL = 0
  let lowR = 0
  const lp = 0.02
  let env = 0
  const attack = 0.01
  const release = 0.08

  for (let i = 0; i < output.length; i++) {
    let l = left[i]! * linearGain
    let r = (right[i] ?? l) * linearGain

    lowL += lp * (l - lowL)
    lowR += lp * (r - lowR)
    const highL = l - lowL
    const highR = r - lowR
    l = lowL * lowBoost + highL * highBoost * eq.mid
    r = lowR * lowBoost + highR * highBoost * eq.mid

    const peak = Math.max(Math.abs(l), Math.abs(r))
    env += (peak > env ? attack : release) * (peak - env)
    const thresh = 0.7
    const gr = env > thresh ? thresh / env : 1
    const compress = 1 - (1 - gr) * strength * 0.7
    l *= compress
    r *= compress

    ;[l, r] = applyWidth(l, r, p.width)
    left[i] = softClip(l)
    if (output.channels[1]) output.channels[1][i] = softClip(r)
  }

  const report: LoudnessReport = {
    integratedLUFS: estimateLUFS(output),
    truePeakDb: estimateTruePeakDb(output),
    loudnessRange: Math.abs(estimateLUFS(output) - inputLufs),
    crestFactorDb: estimateTruePeakDb(output) - estimateLUFS(output),
  }

  return { output, report, warnings, appliedGainDb: gainDb }
}
