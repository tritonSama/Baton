import { useMemo, useState } from 'react'
import {
  TRAINING_STEPS,
  type ModelArchitecture,
  type TrainingGoal,
  type ComputeTarget,
  type TrainingStepId,
} from '@/engine'
import { useBatonStore } from '@/store/baton-store'
import {
  Label,
  Panel,
  PrimaryButton,
  SelectField,
  SliderField,
  Stat,
  ToggleField,
} from './ui'

const INSTRUMENTS = ['vocals', 'keys', 'drums', 'bass', 'guitar', 'strings', 'synth']

function StepRail({
  active,
  completed,
  onSelect,
}: {
  active: TrainingStepId
  completed: TrainingStepId[]
  onSelect: (id: TrainingStepId) => void
}) {
  return (
    <ol className="mb-5 space-y-2">
      {TRAINING_STEPS.map((step) => {
        const done = completed.includes(step.id)
        const current = active === step.id
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className={
                current
                  ? 'w-full rounded-sm border border-[var(--color-copper)] bg-[var(--color-copper)]/10 px-3 py-2 text-left'
                  : 'w-full rounded-sm border border-transparent px-3 py-2 text-left hover:border-[var(--color-line)]'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{step.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                  {done ? 'done' : current ? 'now' : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">
                {step.summary}
              </p>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function TrainingPanel() {
  const [step, setStep] = useState<TrainingStepId>('preprocess')
  const [copied, setCopied] = useState(false)

  const config = useBatonStore((s) => s.trainingConfig)
  const pipeline = useBatonStore((s) => s.trainingPipeline)
  const patchConfig = useBatonStore((s) => s.patchTrainingConfig)
  const patchAnnotation = useBatonStore((s) => s.patchTrainingAnnotation)
  const patchPreprocess = useBatonStore((s) => s.patchTrainingPreprocess)
  const patchHyper = useBatonStore((s) => s.patchTrainingHyperparams)
  const runPreprocess = useBatonStore((s) => s.runTrainingPreprocess)
  const autoAnnotate = useBatonStore((s) => s.autoAnnotateFromBuffer)
  const runTrain = useBatonStore((s) => s.runTrainingJobStep)
  const runEval = useBatonStore((s) => s.runTrainingEvaluate)
  const setFeedback = useBatonStore((s) => s.setTrainingHumanFeedback)
  const reset = useBatonStore((s) => s.resetTrainingPipeline)
  const markStep = useBatonStore((s) => s.markTrainingStep)
  const bufferLabel = useBatonStore((s) => s.bufferLabel)
  const humanFeedback = useBatonStore((s) => s.trainingHumanFeedback)

  const lossSpark = useMemo(() => {
    const curve = pipeline.train?.lossCurve ?? []
    if (!curve.length) return ''
    return curve.map((v) => v.toFixed(2)).join(' → ')
  }, [pipeline.train])

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(pipeline.exportPlan)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function toggleInstrument(name: string) {
    const set = new Set(config.annotation.instrumentation)
    if (set.has(name)) set.delete(name)
    else set.add(name)
    patchAnnotation({ instrumentation: [...set] })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Train</h2>
        <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
          Optional ML pipeline — preprocess, pick a model, annotate, fine-tune (LoRA/CPU), evaluate.
        </p>

        <div className="mb-4">
          <Label>Project name</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={config.projectName}
            onChange={(e) => patchConfig({ projectName: e.target.value })}
          />
        </div>

        <p className="mb-4 font-mono text-[11px] text-[var(--color-muted)]">
          Training data: {bufferLabel}
        </p>

        <StepRail
          active={step}
          completed={pipeline.completedSteps}
          onSelect={setStep}
        />

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={reset} variant="ghost">
            Reset pipeline
          </PrimaryButton>
          <PrimaryButton onClick={() => void copyPlan()} variant="ghost">
            {copied ? 'Copied' : 'Copy training plan'}
          </PrimaryButton>
        </div>
      </Panel>

      <div className="grid gap-5">
        {step === 'preprocess' && (
          <Panel className="animate-rise">
            <h3 className="font-display text-2xl">Data Preprocessing</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
              Convert raw audio into standardized features and normalize for consistent ML input.
            </p>
            <SelectField
              label="Feature format"
              value={config.preprocess.featureFormat}
              options={['spectrogram', 'pitch-contour', 'midi-grid']}
              onChange={(v) => patchPreprocess({ featureFormat: v })}
            />
            <ToggleField
              label="Normalize loudness"
              checked={config.preprocess.normalize}
              onChange={(v) => patchPreprocess({ normalize: v })}
            />
            <ToggleField
              label="Denoise soft threshold"
              checked={config.preprocess.denoise}
              onChange={(v) => patchPreprocess({ denoise: v })}
            />
            <PrimaryButton
              onClick={() => {
                runPreprocess()
                setStep('model')
              }}
            >
              Run preprocess
            </PrimaryButton>
            {pipeline.preprocess && (
              <p className="mt-4 font-mono text-xs text-[var(--color-sage)]">
                {pipeline.preprocess.summary}
              </p>
            )}
          </Panel>
        )}

        {step === 'model' && (
          <Panel className="animate-rise">
            <h3 className="font-display text-2xl">Model Selection</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
              Choose for generation or modification — RNN, Transformer, GAN/CycleGAN, or LoRA.
            </p>
            <SelectField
              label="Goal"
              value={config.goal}
              options={['generation', 'style-transfer', 'modification']}
              onChange={(v) => patchConfig({ goal: v as TrainingGoal })}
            />
            <SelectField
              label="Architecture"
              value={config.architecture}
              options={[
                'LoRA adapter',
                'Transformer',
                'RNN (sequence)',
                'GAN / CycleGAN',
              ]}
              onChange={(v) => patchConfig({ architecture: v as ModelArchitecture })}
            />
            <SelectField
              label="Compute"
              value={config.compute}
              options={['CPU local', 'Cloud GPU', 'Colab / notebook']}
              onChange={(v) => patchConfig({ compute: v as ComputeTarget })}
            />
            <div className="mb-4">
              <Label>Base model</Label>
              <input
                className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                value={config.hyperparams.baseModel}
                onChange={(e) => patchHyper({ baseModel: e.target.value })}
              />
            </div>
            <PrimaryButton
              onClick={() => {
                markStep('model')
                setStep('annotate')
              }}
            >
              Continue to annotation
            </PrimaryButton>
          </Panel>
        )}

        {step === 'annotate' && (
          <Panel className="animate-rise">
            <h3 className="font-display text-2xl">Feature Annotation</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
              Label key, BPM, mood, and instrumentation so the model learns musical patterns.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <PrimaryButton onClick={autoAnnotate} variant="ghost">
                Auto-detect BPM / key
              </PrimaryButton>
            </div>
            <SliderField
              label="BPM"
              value={config.annotation.bpm}
              min={40}
              max={220}
              step={1}
              display={`${config.annotation.bpm}`}
              onChange={(v) => patchAnnotation({ bpm: v })}
            />
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <Label>Key</Label>
                <input
                  className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  value={config.annotation.key ?? ''}
                  onChange={(e) =>
                    patchAnnotation({
                      key: (e.target.value || null) as typeof config.annotation.key,
                    })
                  }
                />
              </div>
              <div>
                <Label>Scale</Label>
                <input
                  className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                  value={config.annotation.scale}
                  onChange={(e) => patchAnnotation({ scale: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-4">
              <Label>Mood</Label>
              <input
                className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
                value={config.annotation.mood}
                onChange={(e) => patchAnnotation({ mood: e.target.value })}
                placeholder="hopeful, dark, euphoric…"
              />
            </div>
            <div className="mb-4">
              <Label>Instrumentation</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {INSTRUMENTS.map((name) => {
                  const on = config.annotation.instrumentation.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleInstrument(name)}
                      className={
                        on
                          ? 'rounded-sm border border-[var(--color-copper)] bg-[var(--color-copper)]/15 px-2 py-1 text-xs'
                          : 'rounded-sm border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-muted)]'
                      }
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
            <PrimaryButton
              onClick={() => {
                markStep('annotate')
                setStep('train')
              }}
            >
              Continue to training
            </PrimaryButton>
          </Panel>
        )}

        {step === 'train' && (
          <Panel className="animate-rise">
            <h3 className="font-display text-2xl">Training & Fine-Tuning</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
              Use transfer learning or LoRA to adapt an open-source base with fewer resources.
            </p>
            <ToggleField
              label="Transfer learning"
              checked={config.hyperparams.useTransferLearning}
              onChange={(v) => patchHyper({ useTransferLearning: v })}
            />
            <ToggleField
              label="LoRA (Low-Rank Adaptation)"
              checked={config.hyperparams.useLoRA}
              onChange={(v) => patchHyper({ useLoRA: v })}
            />
            <SliderField
              label="LoRA rank"
              value={config.hyperparams.loraRank}
              min={1}
              max={64}
              step={1}
              display={String(config.hyperparams.loraRank)}
              onChange={(v) => patchHyper({ loraRank: v })}
            />
            <SliderField
              label="Epochs"
              value={config.hyperparams.epochs}
              min={1}
              max={40}
              step={1}
              display={String(config.hyperparams.epochs)}
              onChange={(v) => patchHyper({ epochs: v })}
            />
            <SliderField
              label="Learning rate"
              value={config.hyperparams.learningRate}
              min={0.00005}
              max={0.01}
              step={0.00005}
              display={config.hyperparams.learningRate.toFixed(5)}
              onChange={(v) => patchHyper({ learningRate: v })}
            />
            <PrimaryButton
              onClick={() => {
                runTrain()
                setStep('evaluate')
              }}
            >
              Run fine-tune (local plan)
            </PrimaryButton>
            {pipeline.train && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-mono text-xs text-[var(--color-sage)]">
                  {pipeline.train.checkpointName} · loss {pipeline.train.finalLoss} · ~
                  {pipeline.train.estimatedMinutes} min
                </p>
                <p className="font-mono text-[11px] text-[var(--color-muted)]">{lossSpark}</p>
                {pipeline.train.warnings.map((w) => (
                  <p key={w} className="text-[var(--color-copper-bright)]">
                    {w}
                  </p>
                ))}
              </div>
            )}
          </Panel>
        )}

        {step === 'evaluate' && (
          <Panel className="animate-rise">
            <h3 className="font-display text-2xl">Evaluation</h3>
            <p className="mt-1 mb-4 text-sm text-[var(--color-muted)]">
              Monitor structure and emotion — avoid rote repetition; add human feedback.
            </p>
            <SliderField
              label="Human feedback"
              value={humanFeedback ?? 0.5}
              min={0}
              max={1}
              display={
                humanFeedback == null
                  ? 'not set'
                  : `${Math.round((humanFeedback ?? 0) * 100)}%`
              }
              onChange={(v) => setFeedback(v)}
            />
            <PrimaryButton onClick={runEval}>Score this run</PrimaryButton>
            {pipeline.evaluation && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Stat
                  label="Overall"
                  value={`${Math.round(pipeline.evaluation.overall * 100)}%`}
                />
                <Stat
                  label="Pass"
                  value={pipeline.evaluation.passed ? 'Yes' : 'Refine'}
                />
                <Stat
                  label="Structure"
                  value={`${Math.round(pipeline.evaluation.structuralCoherence * 100)}%`}
                />
                <Stat
                  label="Emotion"
                  value={`${Math.round(pipeline.evaluation.emotionalDepth * 100)}%`}
                />
                <Stat
                  label="Novelty"
                  value={`${Math.round(pipeline.evaluation.novelty * 100)}%`}
                />
                <Stat
                  label="Overfit risk"
                  value={`${Math.round(pipeline.evaluation.overfitRisk * 100)}%`}
                />
                <ul className="sm:col-span-2 space-y-1 text-sm text-[var(--color-copper-bright)]">
                  {pipeline.evaluation.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        )}

        <Panel className="animate-rise">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Export plan
          </h3>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
            {pipeline.exportPlan}
          </pre>
        </Panel>
      </div>
    </div>
  )
}
