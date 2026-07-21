/** Shared audio buffer helpers used across all Baton engines. */

export type AudioBufferData = {
  sampleRate: number
  numberOfChannels: number
  length: number
  channels: Float32Array[]
}

export type EngineErrorCode =
  | 'EMPTY_BUFFER'
  | 'INVALID_SAMPLE_RATE'
  | 'INVALID_PARAM'
  | 'UNSUPPORTED_MODE'
  | 'ENGINE_NOT_READY'

export class BatonEngineError extends Error {
  readonly code: EngineErrorCode
  readonly engine: string

  constructor(engine: string, code: EngineErrorCode, message: string) {
    super(`[${engine}] ${code}: ${message}`)
    this.name = 'BatonEngineError'
    this.code = code
    this.engine = engine
  }
}

export function assertAudioBuffer(
  engine: string,
  buffer: AudioBufferData | null | undefined,
): asserts buffer is AudioBufferData {
  if (!buffer) {
    throw new BatonEngineError(
      engine,
      'EMPTY_BUFFER',
      'No audio was provided. Load or generate a buffer before processing.',
    )
  }
  if (buffer.length <= 0 || buffer.channels.length === 0) {
    throw new BatonEngineError(
      engine,
      'EMPTY_BUFFER',
      `Audio buffer is empty (length=${buffer.length}, channels=${buffer.channels.length}).`,
    )
  }
  if (!Number.isFinite(buffer.sampleRate) || buffer.sampleRate < 8000) {
    throw new BatonEngineError(
      engine,
      'INVALID_SAMPLE_RATE',
      `Sample rate ${buffer.sampleRate} Hz is invalid. Expected ≥ 8000 Hz.`,
    )
  }
}

export function createSilence(
  sampleRate: number,
  durationSec: number,
  channels = 2,
): AudioBufferData {
  const length = Math.max(1, Math.floor(sampleRate * durationSec))
  return {
    sampleRate,
    numberOfChannels: channels,
    length,
    channels: Array.from({ length: channels }, () => new Float32Array(length)),
  }
}

export function createTone(
  sampleRate: number,
  durationSec: number,
  frequencyHz: number,
  amplitude = 0.4,
  channels = 2,
): AudioBufferData {
  const length = Math.max(1, Math.floor(sampleRate * durationSec))
  const channelData = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    channelData[i] = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate) * amplitude
  }
  return {
    sampleRate,
    numberOfChannels: channels,
    length,
    channels: Array.from({ length: channels }, () => new Float32Array(channelData)),
  }
}

export function mixToMono(buffer: AudioBufferData): Float32Array {
  const mono = new Float32Array(buffer.length)
  const n = buffer.channels.length
  for (let i = 0; i < buffer.length; i++) {
    let sum = 0
    for (let c = 0; c < n; c++) sum += buffer.channels[c]![i] ?? 0
    mono[i] = sum / n
  }
  return mono
}

export function cloneBuffer(buffer: AudioBufferData): AudioBufferData {
  return {
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length,
    channels: buffer.channels.map((ch) => new Float32Array(ch)),
  }
}

export function peakAmplitude(buffer: AudioBufferData): number {
  let peak = 0
  for (const ch of buffer.channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = Math.abs(ch[i]!)
      if (v > peak) peak = v
    }
  }
  return peak
}

export function rmsAmplitude(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!
    sum += s * s
  }
  return Math.sqrt(sum / samples.length)
}
