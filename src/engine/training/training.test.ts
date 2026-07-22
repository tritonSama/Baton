import { describe, expect, it } from 'vitest'
import { createTone, createSilence } from '../audio/buffer'
import {
  createEmptyPipeline,
  evaluateTraining,
  formatTrainingPlan,
  preprocessAudio,
  runTrainingJob,
  TRAINING_STEPS,
  DEFAULT_TRAINING_CONFIG,
} from './index'

describe('Training Studio — method steps', () => {
  it('exposes all five effective-training steps (fails = method incomplete in UI)', () => {
    expect(TRAINING_STEPS.map((s) => s.id)).toEqual([
      'preprocess',
      'model',
      'annotate',
      'train',
      'evaluate',
    ])
  })
})

describe('Training Studio — preprocessing', () => {
  it('builds spectrogram features from a tone (fails = silent/empty preprocess)', () => {
    const tone = createTone(44100, 1, 440, 0.4)
    const result = preprocessAudio(tone, DEFAULT_TRAINING_CONFIG.preprocess)
    expect(result.featureFrames).toBeGreaterThan(10)
    expect(result.normalized).toBe(true)
    expect(result.format).toBe('spectrogram')
  })

  it('rejects silence so training does not start on empty data', () => {
    expect(() =>
      preprocessAudio(createSilence(44100, 0.5), DEFAULT_TRAINING_CONFIG.preprocess),
    ).toThrow(/silent/i)
  })
})

describe('Training Studio — train + evaluate', () => {
  it('completes a LoRA CPU job and returns a checkpoint name', () => {
    const tone = createTone(44100, 1.2, 330, 0.35)
    const prep = preprocessAudio(tone, DEFAULT_TRAINING_CONFIG.preprocess)
    const train = runTrainingJob(DEFAULT_TRAINING_CONFIG, prep)
    expect(train.status).toBe('completed')
    expect(train.lossCurve).toHaveLength(DEFAULT_TRAINING_CONFIG.hyperparams.epochs)
    expect(train.checkpointName).toMatch(/\.batontrain$/)
  })

  it('evaluation passes when annotations + loss look healthy', () => {
    const tone = createTone(44100, 1, 220, 0.3)
    const prep = preprocessAudio(tone, DEFAULT_TRAINING_CONFIG.preprocess)
    const train = runTrainingJob(DEFAULT_TRAINING_CONFIG, prep)
    const ev = evaluateTraining(DEFAULT_TRAINING_CONFIG, prep, train, 0.8)
    expect(ev.overall).toBeGreaterThan(0.4)
    expect(ev.humanFeedback).toBe(0.8)
  })

  it('export plan includes all five method headings', () => {
    const plan = formatTrainingPlan(DEFAULT_TRAINING_CONFIG, null, null, null)
    expect(plan).toContain('Data Preprocessing')
    expect(plan).toContain('Model Selection')
    expect(plan).toContain('Feature Annotation')
    expect(plan).toContain('Training & Fine-Tuning')
    expect(plan).toContain('Evaluation')
  })

  it('empty pipeline starts with no completed steps', () => {
    const p = createEmptyPipeline()
    expect(p.completedSteps).toHaveLength(0)
    expect(p.method.length).toBe(5)
  })

  it('rejects illegal learning rates', () => {
    const tone = createTone(44100, 0.5, 440)
    const prep = preprocessAudio(tone, DEFAULT_TRAINING_CONFIG.preprocess)
    expect(() =>
      runTrainingJob(
        {
          ...DEFAULT_TRAINING_CONFIG,
          hyperparams: { ...DEFAULT_TRAINING_CONFIG.hyperparams, learningRate: 1 },
        },
        prep,
      ),
    ).toThrow(/Learning rate/)
  })
})
