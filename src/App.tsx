import { useEffect } from 'react'
import clsx from 'clsx'
import { useBatonStore, type ToolId } from '@/store/baton-store'
import {
  AutotunePanel,
  BeatPanel,
  DiagnosticsPanel,
  MasterPanel,
  SplitPanel,
  VoicePanel,
} from '@/components/ToolPanels'
import { AIAssistantPanel } from '@/components/AIAssistantPanel'
import { SongCreatorPanel } from '@/components/SongCreatorPanel'
import { TrainingPanel } from '@/components/TrainingPanel'
import { VinylDJPanel } from '@/components/VinylDJPanel'
import { PrimaryButton } from '@/components/ui'

const TOOLS: { id: ToolId; label: string; blurb: string }[] = [
  { id: 'vinyl', label: 'Vinyl DJ', blurb: 'Dual YouTube DJ & Auto-Mixer' },
  { id: 'song', label: 'Song Creator', blurb: 'Write a new song' },
  { id: 'train', label: 'Train', blurb: 'ML fine-tune method' },
  { id: 'autotune', label: 'Autotune', blurb: 'Pitch correction' },
  { id: 'master', label: 'Master', blurb: 'Loudness & polish' },
  { id: 'split', label: 'Split', blurb: 'Stem separation' },
  { id: 'beat', label: 'Beat', blurb: 'BPM & key' },
  { id: 'voice', label: 'Voice', blurb: 'MIDI singing' },
  { id: 'assistant', label: 'AI Assistant', blurb: 'Cloud or CPU LLM' },
  { id: 'diagnostics', label: 'Diagnostics', blurb: 'Health checks' },
]

function ToolView() {
  const tool = useBatonStore((s) => s.activeTool)
  switch (tool) {
    case 'vinyl':
      return <VinylDJPanel />
    case 'song':
      return <SongCreatorPanel />
    case 'train':
      return <TrainingPanel />
    case 'autotune':
      return <AutotunePanel />
    case 'master':
      return <MasterPanel />
    case 'split':
      return <SplitPanel />
    case 'beat':
      return <BeatPanel />
    case 'voice':
      return <VoicePanel />
    case 'assistant':
      return <AIAssistantPanel />
    case 'diagnostics':
      return <DiagnosticsPanel />
  }
}

export default function App() {
  const activeTool = useBatonStore((s) => s.activeTool)
  const setTool = useBatonStore((s) => s.setTool)
  const bufferLabel = useBatonStore((s) => s.bufferLabel)
  const loadDemoTone = useBatonStore((s) => s.loadDemoTone)
  const loadDemoPulse = useBatonStore((s) => s.loadDemoPulse)
  const runDiagnostics = useBatonStore((s) => s.runDiagnostics)
  const lastLog = useBatonStore((s) => s.lastLog)
  const generateSong = useBatonStore((s) => s.generateSong)

  useEffect(() => {
    loadDemoTone(440)
    generateSong()
  }, [loadDemoTone, generateSong])

  return (
    <div className="flex min-h-full flex-col">
      <header className="relative overflow-hidden border-b border-[var(--color-line)] px-6 pb-10 pt-8 md:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(196,122,58,0.07)_70%,transparent_95%)]" />
          <div className="animate-pulse-line absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-copper)] to-transparent" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div className="animate-rise max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <svg
                className="animate-baton h-10 w-10 text-[var(--color-copper)]"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden
              >
                <path d="M20 4 L22 28 L18 28 Z" fill="currentColor" opacity="0.9" />
                <circle cx="20" cy="32" r="3.5" fill="currentColor" />
              </svg>
              <h1 className="font-display text-5xl font-semibold tracking-tight text-[var(--color-cream)] md:text-6xl">
                Baton
              </h1>
            </div>
            <p className="max-w-md text-base leading-relaxed text-[var(--color-muted)]">
              Write songs, shape vocals, and master — one studio from idea to polish.
            </p>
          </div>
          <div className="animate-rise flex flex-wrap gap-2" style={{ animationDelay: '120ms' }}>
            <PrimaryButton onClick={() => setTool('song')} variant="ghost">
              New Song
            </PrimaryButton>
            <PrimaryButton onClick={() => loadDemoTone(440)} variant="ghost">
              Demo Tone
            </PrimaryButton>
            <PrimaryButton onClick={() => loadDemoPulse(120)} variant="ghost">
              Demo Pulse
            </PrimaryButton>
            <PrimaryButton onClick={runDiagnostics}>Run Diagnostics</PrimaryButton>
          </div>
        </div>
        <p className="relative mt-6 font-mono text-xs text-[var(--color-muted)]">{bufferLabel}</p>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-6 py-6 md:flex-row md:px-10">
        <nav className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={clsx(
                'rounded-sm border px-3 py-3 text-left transition',
                activeTool === t.id
                  ? 'border-[var(--color-copper)] bg-[var(--color-copper)]/10'
                  : 'border-transparent hover:border-[var(--color-line)]',
              )}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{t.blurb}</div>
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <ToolView />
        </main>

        <aside className="w-full shrink-0 md:w-64">
          <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-4">
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Activity
            </h2>
            <ul className="max-h-80 space-y-2 overflow-y-auto font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
              {lastLog.length === 0 && <li>Idle — create a song or run a tool.</li>}
              {lastLog.map((line) => (
                <li
                  key={line}
                  className={clsx(line.includes('ERROR') && 'text-[var(--color-danger)]')}
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
