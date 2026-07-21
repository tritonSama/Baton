/**
 * Baton Split — stem separation (Phase 1 spectral heuristic).
 *
 * Spec: Demucs v4 / UVR5 / Lightweight ONNX for production.
 * This preview uses band-energy heuristics so the UI/routing pipeline can be tested
 * without GPU models. Replace `separateStems` internals when ONNX lands.
 *
 * If this stops working, check:
 *  - stemMode not in {2,4,6}
 *  - empty buffer
 *  - output stem count mismatch with routing expectations
 */

import {
  assertAudioBuffer,
  BatonEngineError,
  cloneBuffer,
  createSilence,
  type AudioBufferData,
} from '../audio/buffer'
import { clamp } from '../music/scales'

export type StemModel = 'demucs-v4' | 'uvr5' | 'lightweight'
export type StemMode = 2 | 4 | 6

export type StemName =
  | 'vocals'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'piano'
  | 'other'

export type SplitParams = {
  model: StemModel
  stemMode: StemMode
  autoPlaceInPlaylist: boolean
}

export const DEFAULT_SPLIT_PARAMS: SplitParams = {
  model: 'lightweight',
  stemMode: 4,
  autoPlaceInPlaylist: true,
}

export type StemBundle = Record<StemName, AudioBufferData>

export type SplitResult = {
  stems: Partial<StemBundle>
  modelUsed: StemModel
  warnings: string[]
  stemNames: StemName[]
}

const ENGINE = 'Split'

const STEMS_BY_MODE: Record<StemMode, StemName[]> = {
  2: ['vocals', 'other'],
  4: ['drums', 'bass', 'vocals', 'other'],
  6: ['drums', 'bass', 'vocals', 'guitar', 'piano', 'other'],
}

function validateParams(params: SplitParams): void {
  if (![2, 4, 6].includes(params.stemMode)) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Stems mode must be 2, 4, or 6 (got ${params.stemMode}).`,
    )
  }
}

/**
 * Crude spectral band masks — NOT production quality.
 * Vocals ≈ mid, bass ≈ low, drums ≈ transient highs, etc.
 */
function bandGain(stem: StemName, binRatio: number, transient: number): number {
  switch (stem) {
    case 'bass':
      return binRatio < 0.08 ? 1 : clamp(1 - (binRatio - 0.08) * 12, 0, 1)
    case 'drums':
      return clamp(transient * 1.4 + (binRatio > 0.35 ? 0.5 : 0.15), 0, 1)
    case 'vocals':
      return binRatio > 0.08 && binRatio < 0.45 ? 0.9 : 0.15
    case 'guitar':
      return binRatio > 0.12 && binRatio < 0.55 ? 0.7 : 0.1
    case 'piano':
      return binRatio > 0.05 && binRatio < 0.4 ? 0.55 : 0.12
    case 'other':
      return 0.35
  }
}

function emptyStems(
  template: AudioBufferData,
  names: StemName[],
): Partial<StemBundle> {
  const out: Partial<StemBundle> = {}
  for (const name of names) {
    out[name] = createSilence(
      template.sampleRate,
      template.length / template.sampleRate,
      template.numberOfChannels,
    )
    // match exact length
    out[name] = {
      ...out[name]!,
      length: template.length,
      channels: Array.from({ length: template.numberOfChannels }, () =>
        new Float32Array(template.length),
      ),
    }
  }
  return out
}

export function processSplit(
  input: AudioBufferData,
  params: Partial<SplitParams> = {},
): SplitResult {
  assertAudioBuffer(ENGINE, input)
  const p: SplitParams = { ...DEFAULT_SPLIT_PARAMS, ...params }
  validateParams(p)

  const warnings: string[] = []
  if (p.model === 'demucs-v4' || p.model === 'uvr5') {
    warnings.push(
      `Model "${p.model}" selected — neural weights not loaded; using spectral preview separator.`,
    )
  }

  const names = STEMS_BY_MODE[p.stemMode]
  const stems = emptyStems(input, names)

  // Frame-wise energy split with simple high-frequency transient measure
  const frame = 1024
  for (let start = 0; start < input.length; start += frame) {
    const end = Math.min(start + frame, input.length)
    let energy = 0
    let high = 0
    for (let c = 0; c < input.numberOfChannels; c++) {
      const ch = input.channels[c]!
      for (let i = start; i < end; i++) {
        const s = ch[i]!
        energy += s * s
        if (i > start) high += Math.abs(s - ch[i - 1]!)
      }
    }
    const transient = energy > 1e-10 ? clamp(high / (Math.sqrt(energy) * (end - start)), 0, 1) : 0
    const mid = (start + end) / 2 / input.length

    let maskSum = 0
    const masks: number[] = names.map((n) => {
      const m = bandGain(n, mid, transient)
      maskSum += m
      return m
    })

    for (let si = 0; si < names.length; si++) {
      const name = names[si]!
      const gain = (masks[si]! / Math.max(maskSum, 1e-6)) * 1.2
      const stem = stems[name]!
      for (let c = 0; c < input.numberOfChannels; c++) {
        const src = input.channels[c]!
        const dst = stem.channels[c]!
        for (let i = start; i < end; i++) {
          dst[i] = src[i]! * gain
        }
      }
    }
  }

  // Ensure residual "other" still has signal in 2-stem mode edge cases
  if (!stems.other) {
    stems.other = cloneBuffer(input)
  }

  return {
    stems,
    modelUsed: p.model,
    warnings,
    stemNames: names,
  }
}

export function listStemOutputs(stemMode: StemMode): StemName[] {
  return [...STEMS_BY_MODE[stemMode]]
}
