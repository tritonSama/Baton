/**
 * Training Studio — guided ML pipeline for music models (CPU-friendly option).
 *
 * Steps (effective training method):
 *  1. Data Preprocessing — standardize audio → features (spectrogram / pitch contour)
 *  2. Model Selection — RNN / Transformer / GAN (CycleGAN) / LoRA adapter
 *  3. Feature Annotation — key, BPM, mood, instrumentation labels
 *  4. Training & Fine-Tuning — transfer learning / LoRA on open-source bases
 *  5. Evaluation — structure + aesthetic scores + human feedback loop
 *
 * Phase 1 runs a local, reproducible training *plan* and synthetic run metrics so
 * the workflow works without a GPU. Export the plan for cloud/Colab later.
 *
 * If this stops working, check:
 *  - empty / silent audio buffer
 *  - missing annotations (BPM/key)
 *  - epochs or learningRate out of range
 *  - step order skipped (preprocess before train)
 */

import {
  assertAudioBuffer,
  BatonEngineError,
  mixToMono,
  peakAmplitude,
  rmsAmplitude,
  type AudioBufferData,
} from '../audio/buffer'
import { clamp, frequencyToMidi, type NoteName } from '../music/scales'
import { detectPitchHz } from '../autotune'
import { estimateBpm, estimateKey } from '../beat'

export type TrainingStepId =
  | 'preprocess'
  | 'model'
  | 'annotate'
  | 'train'
  | 'evaluate'

export type ModelArchitecture =
  | 'RNN (sequence)'
  | 'Transformer'
  | 'GAN / CycleGAN'
  | 'LoRA adapter'

export type TrainingGoal = 'generation' | 'style-transfer' | 'modification'

export type ComputeTarget = 'CPU local' | 'Cloud GPU' | 'Colab / notebook'

export type FeatureAnnotation = {
  key: NoteName | null
  scale: string
  bpm: number
  mood: string
  instrumentation: string[]
  notes: string
}

export type PreprocessOptions = {
  targetSampleRate: number
  normalize: boolean
  denoise: boolean
  featureFormat: 'spectrogram' | 'pitch-contour' | 'midi-grid'
}

export type TrainHyperparams = {
  epochs: number
  learningRate: number
  batchSize: number
  useTransferLearning: boolean
  useLoRA: boolean
  loraRank: number
  baseModel: string
}

export type TrainingConfig = {
  projectName: string
  goal: TrainingGoal
  architecture: ModelArchitecture
  compute: ComputeTarget
  preprocess: PreprocessOptions
  annotation: FeatureAnnotation
  hyperparams: TrainHyperparams
}

export type PreprocessResult = {
  durationSec: number
  peak: number
  rms: number
  featureFrames: number
  featureDim: number
  noiseFloor: number
  normalized: boolean
  format: PreprocessOptions['featureFormat']
  summary: string
}

export type TrainRunResult = {
  status: 'completed' | 'blocked'
  lossCurve: number[]
  finalLoss: number
  adapterSizeMb: number
  estimatedMinutes: number
  warnings: string[]
  checkpointName: string
}

export type EvaluationResult = {
  structuralCoherence: number
  emotionalDepth: number
  novelty: number
  overfitRisk: number
  overall: number
  humanFeedback: number | null
  notes: string[]
  passed: boolean
}

export type TrainingPipelineResult = {
  config: TrainingConfig
  completedSteps: TrainingStepId[]
  preprocess: PreprocessResult | null
  train: TrainRunResult | null
  evaluation: EvaluationResult | null
  method: string[]
  exportPlan: string
}

export const TRAINING_STEPS: {
  id: TrainingStepId
  title: string
  summary: string
}[] = [
  {
    id: 'preprocess',
    title: '1. Data Preprocessing',
    summary:
      'Convert raw audio into standardized features (MIDI / spectrogram / pitch), normalize, and reduce noise.',
  },
  {
    id: 'model',
    title: '2. Model Selection',
    summary:
      'Pick RNN, Transformer, or GAN/CycleGAN for generation vs style transfer; LoRA for light fine-tunes.',
  },
  {
    id: 'annotate',
    title: '3. Feature Annotation',
    summary:
      'Label key, BPM, mood, and instrumentation so the model learns musical structure.',
  },
  {
    id: 'train',
    title: '4. Training & Fine-Tuning',
    summary:
      'Train with transfer learning or LoRA — CPU local for adapters, cloud GPU for full models.',
  },
  {
    id: 'evaluate',
    title: '5. Evaluation',
    summary:
      'Score structure and emotion, watch for memorization, refine with human feedback.',
  },
]

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  projectName: 'My Style Pack',
  goal: 'generation',
  architecture: 'LoRA adapter',
  compute: 'CPU local',
  preprocess: {
    targetSampleRate: 22050,
    normalize: true,
    denoise: true,
    featureFormat: 'spectrogram',
  },
  annotation: {
    key: 'C',
    scale: 'Major',
    bpm: 100,
    mood: 'hopeful',
    instrumentation: ['vocals', 'keys', 'drums'],
    notes: '',
  },
  hyperparams: {
    epochs: 8,
    learningRate: 0.0002,
    batchSize: 4,
    useTransferLearning: true,
    useLoRA: true,
    loraRank: 8,
    baseModel: 'open-music-small',
  },
}

const ENGINE = 'Training'

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function validateTrainingConfig(config: TrainingConfig): void {
  if (!config.projectName.trim()) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', 'Project name is required.')
  }
  const { epochs, learningRate, batchSize, loraRank } = config.hyperparams
  if (epochs < 1 || epochs > 200) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', `Epochs must be 1–200 (got ${epochs}).`)
  }
  if (learningRate <= 0 || learningRate > 0.1) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Learning rate must be > 0 and ≤ 0.1 (got ${learningRate}).`,
    )
  }
  if (batchSize < 1 || batchSize > 64) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', `Batch size must be 1–64 (got ${batchSize}).`)
  }
  if (config.hyperparams.useLoRA && (loraRank < 1 || loraRank > 64)) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', `LoRA rank must be 1–64 (got ${loraRank}).`)
  }
}

/**
 * Step 1 — preprocess audio into a feature summary suitable for ML.
 */
export function preprocessAudio(
  buffer: AudioBufferData,
  options: PreprocessOptions,
): PreprocessResult {
  assertAudioBuffer(ENGINE, buffer)
  const mono = mixToMono(buffer)
  let peak = peakAmplitude(buffer)
  const rms = rmsAmplitude(mono)
  if (peak < 1e-6) {
    throw new BatonEngineError(
      ENGINE,
      'EMPTY_BUFFER',
      'Audio is silent — load a demo tone/pulse or song render before preprocessing.',
    )
  }

  // Lightweight denoise: soft-threshold tiny samples
  let noiseFloor = 0
  if (options.denoise) {
    const sorted = Float32Array.from(mono)
    sorted.sort()
    noiseFloor = Math.abs(sorted[Math.floor(sorted.length * 0.1)] ?? 0)
    for (let i = 0; i < mono.length; i++) {
      if (Math.abs(mono[i]!) < noiseFloor * 1.5) mono[i] = 0
    }
  }

  if (options.normalize && peak > 0) {
    const g = 0.95 / peak
    for (let i = 0; i < mono.length; i++) mono[i]! *= g
    peak = 0.95
  }

  const hop = Math.max(256, Math.floor(buffer.sampleRate * 0.02))
  const featureFrames = Math.max(1, Math.floor(mono.length / hop))
  const featureDim =
    options.featureFormat === 'spectrogram'
      ? 64
      : options.featureFormat === 'pitch-contour'
        ? 1
        : 12

  // Touch pitch detection on a few frames so preprocess is musically grounded
  let voiced = 0
  for (let f = 0; f < Math.min(featureFrames, 40); f++) {
    const start = f * hop
    const slice = mono.subarray(start, Math.min(start + hop * 2, mono.length))
    const hz = detectPitchHz(slice, buffer.sampleRate, 60, 1200)
    if (hz > 0 && Number.isFinite(frequencyToMidi(hz))) voiced++
  }

  return {
    durationSec: buffer.length / buffer.sampleRate,
    peak,
    rms,
    featureFrames,
    featureDim,
    noiseFloor,
    normalized: options.normalize,
    format: options.featureFormat,
    summary: `${options.featureFormat} · ${featureFrames} frames × ${featureDim} dims · ${voiced} pitched frames · sr target ${options.targetSampleRate}`,
  }
}

/**
 * Suggest annotations from the current buffer (BPM / key) for step 3.
 */
export function suggestAnnotations(buffer: AudioBufferData): Partial<FeatureAnnotation> {
  assertAudioBuffer(ENGINE, buffer)
  const bpm = estimateBpm(buffer, 60, 200)
  const key = estimateKey(buffer)
  return {
    bpm: bpm.bpm || 100,
    key: key.key,
    scale: key.scale,
  }
}

function architectureFitsGoal(architecture: ModelArchitecture, goal: TrainingGoal): string[] {
  const warnings: string[] = []
  if (goal === 'style-transfer' && architecture === 'RNN (sequence)') {
    warnings.push('RNN is weak for style transfer — prefer GAN / CycleGAN or a Transformer.')
  }
  if (goal === 'generation' && architecture === 'GAN / CycleGAN') {
    warnings.push('GANs can work for generation, but Transformers / LoRA are usually stabler for songs.')
  }
  if (architecture === 'LoRA adapter' && goal === 'style-transfer') {
    warnings.push('LoRA on a style-capable base is a good low-resource style path.')
  }
  return warnings
}

/**
 * Step 4 — run a local fine-tune simulation (CPU-safe) and emit metrics + checkpoint name.
 */
export function runTrainingJob(
  config: TrainingConfig,
  preprocess: PreprocessResult,
): TrainRunResult {
  validateTrainingConfig(config)
  const warnings = architectureFitsGoal(config.architecture, config.goal)

  if (config.compute === 'CPU local' && config.architecture === 'Transformer' && !config.hyperparams.useLoRA) {
    warnings.push(
      'Full Transformer training on CPU will be slow — enable LoRA or switch compute to Cloud GPU.',
    )
  }
  if (config.compute === 'CPU local' && config.architecture === 'GAN / CycleGAN') {
    warnings.push('CycleGAN on CPU is heavy — export this plan to Colab/cloud for real training.')
  }

  const seed = hashString(
    `${config.projectName}|${config.architecture}|${preprocess.featureFrames}|${config.hyperparams.epochs}`,
  )
  const rng = mulberry32(seed)
  const lossCurve: number[] = []
  let loss = 1.2 + rng() * 0.4
  for (let e = 0; e < config.hyperparams.epochs; e++) {
    const step =
      config.hyperparams.learningRate *
      (config.hyperparams.useLoRA ? 12 : 8) *
      (0.7 + rng())
    loss = Math.max(0.05, loss * (0.82 + rng() * 0.12) - step * 0.01)
    lossCurve.push(Number(loss.toFixed(4)))
  }

  const adapterSizeMb = config.hyperparams.useLoRA
    ? clamp(config.hyperparams.loraRank * 0.35 + preprocess.featureDim * 0.02, 1, 80)
    : clamp(preprocess.featureFrames * 0.002 + 40, 40, 500)

  const estimatedMinutes =
    config.compute === 'CPU local'
      ? Math.ceil(
          (config.hyperparams.epochs * preprocess.featureFrames) /
            (config.hyperparams.useLoRA ? 8000 : 2000),
        )
      : Math.ceil(config.hyperparams.epochs / 2)

  const checkpointName = `${config.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${config.hyperparams.useLoRA ? 'lora' : 'full'}-e${config.hyperparams.epochs}.batontrain`

  return {
    status: 'completed',
    lossCurve,
    finalLoss: lossCurve[lossCurve.length - 1] ?? loss,
    adapterSizeMb: Number(adapterSizeMb.toFixed(1)),
    estimatedMinutes: Math.max(1, estimatedMinutes),
    warnings,
    checkpointName,
  }
}

/**
 * Step 5 — evaluate structural / aesthetic quality (and optional human feedback).
 */
export function evaluateTraining(
  config: TrainingConfig,
  preprocess: PreprocessResult,
  train: TrainRunResult,
  humanFeedback: number | null = null,
): EvaluationResult {
  const notes: string[] = []
  const structuralCoherence = clamp(
    0.35 +
      (config.annotation.bpm > 0 ? 0.15 : 0) +
      (config.annotation.key ? 0.15 : 0) +
      (1 - Math.min(1, train.finalLoss)) * 0.35,
    0,
    1,
  )
  const emotionalDepth = clamp(
    0.25 +
      (config.annotation.mood.trim() ? 0.25 : 0) +
      (config.annotation.instrumentation.length > 0 ? 0.15 : 0) +
      (config.goal === 'style-transfer' ? 0.1 : 0.05) +
      (humanFeedback != null ? humanFeedback * 0.2 : 0.1),
    0,
    1,
  )
  const novelty = clamp(
    0.55 -
      (config.hyperparams.epochs > 40 ? 0.15 : 0) +
      (config.hyperparams.useLoRA ? 0.1 : 0) +
      preprocess.featureFrames / 20000,
    0,
    1,
  )
  const overfitRisk = clamp(
    (config.hyperparams.epochs / 100) * 0.5 +
      (train.finalLoss < 0.08 ? 0.25 : 0) -
      (config.hyperparams.useLoRA ? 0.15 : 0),
    0,
    1,
  )

  if (!config.annotation.mood.trim()) notes.push('Add a mood label to improve emotional-depth scoring.')
  if (overfitRisk > 0.55) notes.push('Overfit risk high — reduce epochs or keep LoRA + more varied data.')
  if (train.finalLoss > 0.45) notes.push('Loss still high — raise epochs slightly or check preprocessing.')
  if (humanFeedback != null && humanFeedback < 0.4) {
    notes.push('Human feedback is low — refine annotations and try another architecture.')
  }

  const overall = clamp(
    structuralCoherence * 0.35 +
      emotionalDepth * 0.3 +
      novelty * 0.2 +
      (1 - overfitRisk) * 0.15,
    0,
    1,
  )

  return {
    structuralCoherence: Number(structuralCoherence.toFixed(3)),
    emotionalDepth: Number(emotionalDepth.toFixed(3)),
    novelty: Number(novelty.toFixed(3)),
    overfitRisk: Number(overfitRisk.toFixed(3)),
    overall: Number(overall.toFixed(3)),
    humanFeedback,
    notes,
    passed: overall >= 0.55 && overfitRisk < 0.7,
  }
}

export function buildTrainingMethod(): string[] {
  return TRAINING_STEPS.map((s) => `${s.title}: ${s.summary}`)
}

export function formatTrainingPlan(
  config: TrainingConfig,
  preprocess: PreprocessResult | null,
  train: TrainRunResult | null,
  evaluation: EvaluationResult | null,
): string {
  const lines = [
    `# Baton Training Plan — ${config.projectName}`,
    '',
    '## Method',
    ...buildTrainingMethod().map((m) => `- ${m}`),
    '',
    '## Configuration',
    `- Goal: ${config.goal}`,
    `- Architecture: ${config.architecture}`,
    `- Compute: ${config.compute}`,
    `- Base model: ${config.hyperparams.baseModel}`,
    `- Transfer learning: ${config.hyperparams.useTransferLearning}`,
    `- LoRA: ${config.hyperparams.useLoRA} (rank ${config.hyperparams.loraRank})`,
    `- Epochs: ${config.hyperparams.epochs} · LR: ${config.hyperparams.learningRate} · Batch: ${config.hyperparams.batchSize}`,
    '',
    '## Annotations',
    `- Key: ${config.annotation.key ?? 'n/a'} ${config.annotation.scale}`,
    `- BPM: ${config.annotation.bpm}`,
    `- Mood: ${config.annotation.mood}`,
    `- Instrumentation: ${config.annotation.instrumentation.join(', ') || 'n/a'}`,
    config.annotation.notes ? `- Notes: ${config.annotation.notes}` : '',
    '',
    '## Preprocess',
    preprocess ? `- ${preprocess.summary}` : '- Not run yet',
    '',
    '## Train',
    train
      ? `- Checkpoint: ${train.checkpointName}\n- Final loss: ${train.finalLoss}\n- Adapter ~${train.adapterSizeMb} MB\n- Est. time: ${train.estimatedMinutes} min`
      : '- Not run yet',
    '',
    '## Evaluation',
    evaluation
      ? `- Overall ${evaluation.overall} · Structure ${evaluation.structuralCoherence} · Emotion ${evaluation.emotionalDepth} · Novelty ${evaluation.novelty} · Overfit risk ${evaluation.overfitRisk}\n- Pass: ${evaluation.passed}`
      : '- Not run yet',
    '',
    '## Cloud next step',
    'Export this plan to Colab/cloud, mount your audio dataset, and fine-tune the selected base with LoRA for low VRAM.',
  ]
  return lines.filter(Boolean).join('\n')
}

export function createEmptyPipeline(config: TrainingConfig = DEFAULT_TRAINING_CONFIG): TrainingPipelineResult {
  return {
    config: {
      ...config,
      preprocess: { ...config.preprocess },
      annotation: {
        ...config.annotation,
        instrumentation: [...config.annotation.instrumentation],
      },
      hyperparams: { ...config.hyperparams },
    },
    completedSteps: [],
    preprocess: null,
    train: null,
    evaluation: null,
    method: buildTrainingMethod(),
    exportPlan: formatTrainingPlan(config, null, null, null),
  }
}
