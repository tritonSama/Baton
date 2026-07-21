import { NOTE_NAMES, type ScaleType, type NoteName } from '@/engine'
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

const SCALES: ScaleType[] = [
  'Major',
  'Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Chromatic',
]

const INPUT_TYPES = ['Soprano', 'Alto', 'Tenor', 'Baritone', 'Bass', 'Instrument'] as const

export function AutotunePanel() {
  const autotune = useBatonStore((s) => s.autotune)
  const patch = useBatonStore((s) => s.patchAutotune)
  const result = useBatonStore((s) => s.autotuneResult)
  const run = useBatonStore((s) => s.runActiveTool)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl text-[var(--color-cream)]">Autotune</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Real-time pitch correction · target latency &lt; 10ms
        </p>
        <SliderField
          label="Retune Speed"
          value={autotune.retuneSpeedMs}
          min={0}
          max={100}
          step={1}
          display={`${autotune.retuneSpeedMs} ms`}
          onChange={(v) => patch({ retuneSpeedMs: v })}
        />
        <SliderField
          label="Correction Amount"
          value={autotune.correctionAmount}
          min={0}
          max={1}
          display={`${Math.round(autotune.correctionAmount * 100)}%`}
          onChange={(v) => patch({ correctionAmount: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Key"
            value={autotune.key}
            options={[...NOTE_NAMES] as NoteName[]}
            onChange={(v) => patch({ key: v })}
          />
          <SelectField
            label="Scale"
            value={autotune.scale}
            options={SCALES}
            onChange={(v) => patch({ scale: v })}
          />
        </div>
        <SelectField
          label="Input Type"
          value={autotune.inputType}
          options={[...INPUT_TYPES]}
          onChange={(v) => patch({ inputType: v })}
        />
        <SliderField
          label="Humanize"
          value={autotune.humanize}
          min={0}
          max={1}
          display={`${Math.round(autotune.humanize * 100)}%`}
          onChange={(v) => patch({ humanize: v })}
        />
        <SliderField
          label="Vibrato Depth"
          value={autotune.vibratoDepth}
          min={0}
          max={1}
          onChange={(v) => patch({ vibratoDepth: v })}
        />
        <ToggleField
          label="Formant Preserve"
          checked={autotune.formantPreserve}
          onChange={(v) => patch({ formantPreserve: v })}
        />
        <ToggleField
          label="Bypass"
          checked={autotune.bypass}
          onChange={(v) => patch({ bypass: v })}
        />
        <PrimaryButton onClick={run}>Process Autotune</PrimaryButton>
      </Panel>
      <Panel className="animate-rise">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Result
        </h3>
        {result ? (
          <div className="grid gap-6">
            <Stat
              label="Pitched frames"
              value={String(result.frames.filter((f) => f.frequencyHz > 0).length)}
            />
            <Stat
              label="Avg correction"
              value={`${result.averageCentsCorrection.toFixed(1)} ¢`}
            />
            <Stat
              label="Key confidence"
              value={`${Math.round(result.detectedKeyConfidence * 100)}%`}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Load a demo tone, then process. Pitch frames and cents correction appear here.
          </p>
        )}
      </Panel>
    </div>
  )
}

export function MasterPanel() {
  const master = useBatonStore((s) => s.master)
  const patch = useBatonStore((s) => s.patchMaster)
  const result = useBatonStore((s) => s.masterResult)
  const run = useBatonStore((s) => s.runActiveTool)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Master</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Preview mastering chain · render/reference modes warn until ONNX ships
        </p>
        <SelectField
          label="Mode"
          value={master.mode}
          options={['preview', 'render', 'reference']}
          onChange={(v) => patch({ mode: v })}
        />
        <SelectField
          label="Genre Preset"
          value={master.genrePreset}
          options={['Hip-Hop', 'Pop', 'EDM', 'Rock', 'Jazz', 'Classical', 'Custom']}
          onChange={(v) => patch({ genrePreset: v })}
        />
        <SliderField
          label="Master Strength"
          value={master.masterStrength}
          min={0}
          max={1}
          display={`${Math.round(master.masterStrength * 100)}%`}
          onChange={(v) => patch({ masterStrength: v })}
        />
        <SliderField
          label="Loudness Target"
          value={master.loudnessTargetLUFS}
          min={-23}
          max={-8}
          step={0.1}
          display={`${master.loudnessTargetLUFS.toFixed(1)} LUFS`}
          onChange={(v) => patch({ loudnessTargetLUFS: v })}
        />
        <SliderField
          label="Width"
          value={master.width}
          min={0}
          max={1}
          onChange={(v) => patch({ width: v })}
        />
        <SliderField
          label="Low End Focus"
          value={master.lowEndFocus}
          min={0}
          max={1}
          onChange={(v) => patch({ lowEndFocus: v })}
        />
        <SliderField
          label="High End Air"
          value={master.highEndAir}
          min={0}
          max={1}
          onChange={(v) => patch({ highEndAir: v })}
        />
        <PrimaryButton onClick={run}>Master Track</PrimaryButton>
      </Panel>
      <Panel className="animate-rise">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Loudness report
        </h3>
        {result ? (
          <div className="grid gap-5">
            <Stat label="Integrated" value={`${result.report.integratedLUFS.toFixed(1)} LUFS`} />
            <Stat label="True peak" value={`${result.report.truePeakDb.toFixed(1)} dB`} />
            <Stat label="Applied gain" value={`${result.appliedGainDb.toFixed(1)} dB`} />
            {result.warnings.length > 0 && (
              <ul className="space-y-2 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-copper-bright)]">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Run mastering to see LUFS / peak report.</p>
        )}
      </Panel>
    </div>
  )
}

export function SplitPanel() {
  const split = useBatonStore((s) => s.split)
  const patch = useBatonStore((s) => s.patchSplit)
  const result = useBatonStore((s) => s.splitResult)
  const run = useBatonStore((s) => s.runActiveTool)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Split</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Stem separation · Demucs/UVR land later; spectral preview works now
        </p>
        <SelectField
          label="Model"
          value={split.model}
          options={['lightweight', 'demucs-v4', 'uvr5']}
          onChange={(v) => patch({ model: v })}
        />
        <SelectField
          label="Stems"
          value={String(split.stemMode)}
          options={['2', '4', '6']}
          onChange={(v) => patch({ stemMode: Number(v) as 2 | 4 | 6 })}
        />
        <ToggleField
          label="Auto-place in Playlist"
          checked={split.autoPlaceInPlaylist}
          onChange={(v) => patch({ autoPlaceInPlaylist: v })}
        />
        <PrimaryButton onClick={run}>Separate Stems</PrimaryButton>
      </Panel>
      <Panel className="animate-rise">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
          Stem outputs
        </h3>
        {result ? (
          <div>
            <ul className="space-y-2">
              {result.stemNames.map((name) => (
                <li
                  key={name}
                  className="flex items-center justify-between border-b border-[var(--color-line)] py-2 text-sm"
                >
                  <span className="capitalize">{name}</span>
                  <span className="font-mono text-xs text-[var(--color-sage)]">
                    {result.stems[name]?.length ?? 0} samples
                  </span>
                </li>
              ))}
            </ul>
            {result.warnings.map((w) => (
              <p key={w} className="mt-4 text-sm text-[var(--color-copper-bright)]">
                {w}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Separate to list routed stem buffers.</p>
        )}
      </Panel>
    </div>
  )
}

export function BeatPanel() {
  const beat = useBatonStore((s) => s.beat)
  const patch = useBatonStore((s) => s.patchBeat)
  const result = useBatonStore((s) => s.beatResult)
  const run = useBatonStore((s) => s.runActiveTool)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Beat</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          BPM, key, chords · load Demo Pulse for best results
        </p>
        <SliderField
          label="Tap Tempo Override"
          value={beat.tapTempoBpm ?? 0}
          min={0}
          max={200}
          step={1}
          display={beat.tapTempoBpm ? `${beat.tapTempoBpm} BPM` : 'Auto'}
          onChange={(v) => patch({ tapTempoBpm: v === 0 ? null : v })}
        />
        <PrimaryButton onClick={run}>Detect Beat / Key</PrimaryButton>
      </Panel>
      <Panel className="animate-rise">
        {result ? (
          <div className="grid gap-5">
            <Stat label="BPM" value={String(result.bpm)} />
            <Stat label="Key" value={result.key ? `${result.key} ${result.scale}` : '—'} />
            <Stat label="Beats" value={String(result.beatGridSec.length)} />
            <div>
              <Label>Chord timeline</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.chords.slice(0, 8).map((c) => (
                  <span
                    key={`${c.timeSec}-${c.chord}`}
                    className="rounded-sm border border-[var(--color-line)] px-2 py-1 text-xs"
                  >
                    {c.chord}
                  </span>
                ))}
              </div>
            </div>
            {result.warnings.map((w) => (
              <p key={w} className="text-sm text-[var(--color-copper-bright)]">
                {w}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Run detection to see BPM and key.</p>
        )}
      </Panel>
    </div>
  )
}

export function VoicePanel() {
  const voice = useBatonStore((s) => s.voice)
  const patch = useBatonStore((s) => s.patchVoice)
  const result = useBatonStore((s) => s.voiceResult)
  const run = useBatonStore((s) => s.runActiveTool)
  const mapLyrics = useBatonStore((s) => s.setMidiFromLyrics)
  const notes = useBatonStore((s) => s.midiNotes)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Voice</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          MIDI + lyrics → singing · preview oscillator until RVC models load
        </p>
        <div className="mb-4">
          <Label>Lyrics</Label>
          <textarea
            className="min-h-20 w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={voice.lyrics}
            onChange={(e) => patch({ lyrics: e.target.value })}
          />
        </div>
        <SliderField
          label="Breathiness"
          value={voice.breathiness}
          min={0}
          max={1}
          onChange={(v) => patch({ breathiness: v })}
        />
        <SliderField
          label="Tension"
          value={voice.tension}
          min={0}
          max={1}
          onChange={(v) => patch({ tension: v })}
        />
        <SliderField
          label="Growl"
          value={voice.growl}
          min={0}
          max={1}
          onChange={(v) => patch({ growl: v })}
        />
        <SliderField
          label="Falsetto"
          value={voice.falsetto}
          min={0}
          max={1}
          onChange={(v) => patch({ falsetto: v })}
        />
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={mapLyrics} variant="ghost">
            Map Lyrics → MIDI
          </PrimaryButton>
          <PrimaryButton onClick={run}>Synthesize</PrimaryButton>
        </div>
      </Panel>
      <Panel className="animate-rise">
        <Stat label="MIDI notes" value={String(notes.length)} />
        {result && (
          <div className="mt-6 grid gap-4">
            <Stat label="Rendered" value={String(result.renderedNotes)} />
            <Stat label="Phonemes" value={String(result.phonemeCount)} />
            {result.warnings.map((w) => (
              <p key={w} className="text-sm text-[var(--color-copper-bright)]">
                {w}
              </p>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

export function DiagnosticsPanel() {
  const diagnostics = useBatonStore((s) => s.diagnostics)
  const run = useBatonStore((s) => s.runDiagnostics)

  return (
    <Panel className="animate-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Diagnostics</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            When something stops working, run this suite — each failure includes a fix hint.
          </p>
        </div>
        <PrimaryButton onClick={run}>Run Engine Checks</PrimaryButton>
      </div>
      {diagnostics ? (
        <div>
          <p
            className={
              diagnostics.overall === 'pass'
                ? 'mb-4 text-[var(--color-sage)]'
                : 'mb-4 text-[var(--color-danger)]'
            }
          >
            {diagnostics.summary}
          </p>
          <ul className="space-y-3">
            {diagnostics.checks.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-[var(--color-line)] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                      {c.engine}
                    </span>
                    <div className="font-medium">{c.title}</div>
                  </div>
                  <span
                    className={
                      c.status === 'pass'
                        ? 'text-xs uppercase text-[var(--color-sage)]'
                        : 'text-xs uppercase text-[var(--color-danger)]'
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{c.description}</p>
                <p className="mt-1 font-mono text-xs text-[var(--color-cream)]/80">{c.detail}</p>
                {c.status === 'fail' && (
                  <p className="mt-2 text-sm text-[var(--color-copper-bright)]">
                    Hint: {c.failureHint}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          No report yet. Run checks to verify Autotune, Master, Split, Beat, and Voice.
        </p>
      )}
    </Panel>
  )
}
