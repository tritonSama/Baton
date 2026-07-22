import { useMemo, useState } from 'react'
import {
  NOTE_NAMES,
  listProgressionStyles,
  listSongGenres,
  type NoteName,
  type ProgressionStyle,
  type SongGenre,
} from '@/engine'
import {
  buildCompleteSongPrompt,
  buildLyricRewritePrompt,
  buildProgressionPrompt,
} from '@/llm/song-prompts'
import { useBatonStore } from '@/store/baton-store'
import { Label, Panel, PrimaryButton, SelectField, SliderField, Stat } from './ui'

export function SongCreatorPanel() {
  const brief = useBatonStore((s) => s.songBrief)
  const song = useBatonStore((s) => s.song)
  const leadSheet = useBatonStore((s) => s.songLeadSheet)
  const patch = useBatonStore((s) => s.patchSongBrief)
  const generate = useBatonStore((s) => s.generateSong)
  const variation = useBatonStore((s) => s.regenerateSongVariation)
  const applyToVoice = useBatonStore((s) => s.applySongToVoice)
  const setTool = useBatonStore((s) => s.setTool)

  const [copied, setCopied] = useState(false)
  const [llmStatus, setLlmStatus] = useState('')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmDraft, setLlmDraft] = useState('')

  const loop = useMemo(
    () =>
      song
        ? [...new Map(song.chords.slice(0, 8).map((c) => [c.symbol, c.symbol])).values()].join(
            ' – ',
          )
        : '',
    [song],
  )

  async function askLlm(kind: 'lyrics' | 'chords' | 'complete') {
    if (!window.batonDesktop) {
      setLlmStatus('Connect via AI Assistant first (desktop app required).')
      setTool('assistant')
      return
    }
    if (!song && kind !== 'complete' && kind !== 'chords') {
      setLlmStatus('Generate a song locally first, then ask the LLM to polish it.')
      return
    }

    let saved: { provider?: string; baseUrl?: string; model?: string } = {}
    try {
      saved = JSON.parse(localStorage.getItem('baton:llm-config') ?? '{}') as typeof saved
    } catch {
      saved = {}
    }
    if (!saved.baseUrl || !saved.model || !saved.provider) {
      setLlmStatus('Configure a provider in AI Assistant, then Test Connection.')
      setTool('assistant')
      return
    }

    const prompt =
      kind === 'lyrics' && song
        ? buildLyricRewritePrompt(song)
        : kind === 'chords'
          ? buildProgressionPrompt(brief)
          : buildCompleteSongPrompt(brief)

    setLlmBusy(true)
    setLlmStatus('Asking connected LLM…')
    try {
      const result = await window.batonDesktop.sendLlmChat({
        config: {
          provider: saved.provider as 'ollama' | 'lm-studio' | 'openai-compatible',
          baseUrl: saved.baseUrl,
          model: saved.model,
          apiKey: undefined,
        },
        messages: [
          {
            role: 'system',
            content:
              'You are a concise songwriter co-pilot for Baton. Prefer concrete, singable output.',
          },
          { role: 'user', content: prompt },
        ],
      })
      setLlmDraft(result.content)
      setLlmStatus(`LLM reply from ${result.model}`)
    } catch (error) {
      setLlmStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setLlmBusy(false)
    }
  }

  async function copyLeadSheet() {
    if (!leadSheet) return
    try {
      await navigator.clipboard.writeText(leadSheet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel className="animate-rise">
        <h2 className="font-display text-3xl">Song Creator</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-muted)]">
          Build a full song locally — chords, lyrics, melody, and form. No GPU required.
        </p>

        <div className="mb-4">
          <Label>Title</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={brief.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Genre"
            value={brief.genre}
            options={listSongGenres()}
            onChange={(v) => patch({ genre: v as SongGenre })}
          />
          <SelectField
            label="Progression"
            value={brief.progressionStyle}
            options={listProgressionStyles()}
            onChange={(v) => patch({ progressionStyle: v as ProgressionStyle })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Key"
            value={brief.key}
            options={[...NOTE_NAMES] as NoteName[]}
            onChange={(v) => patch({ key: v })}
          />
          <SelectField
            label="Scale"
            value={brief.scale}
            options={['Major', 'Minor']}
            onChange={(v) => patch({ scale: v })}
          />
        </div>

        <SliderField
          label="BPM"
          value={brief.bpm}
          min={40}
          max={220}
          step={1}
          display={`${brief.bpm} BPM`}
          onChange={(v) => patch({ bpm: v })}
        />

        <div className="mb-4">
          <Label>Mood</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={brief.mood}
            onChange={(e) => patch({ mood: e.target.value })}
            placeholder="hopeful, dark, euphoric…"
          />
        </div>

        <div className="mb-4">
          <Label>Theme</Label>
          <input
            className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--color-copper)]"
            value={brief.theme}
            onChange={(e) => patch({ theme: e.target.value })}
            placeholder="starting over, late nights, found family…"
          />
        </div>

        <SliderField
          label="Variation Seed"
          value={brief.seed}
          min={1}
          max={999}
          step={1}
          display={String(brief.seed)}
          onChange={(v) => patch({ seed: v })}
        />

        <div className="mb-6 rounded-sm border border-[var(--color-line)] bg-[var(--color-ink)]/40 p-4">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Method
          </h3>
          <ol className="space-y-1.5 text-sm leading-relaxed text-[var(--color-cream)]/90">
            <li>1. Fill title, genre, key, BPM, mood, theme.</li>
            <li>2. Pick a progression style.</li>
            <li>3. Generate Song (local chords + lyrics + melody).</li>
            <li>4. New Variation for alternatives; copy the lead sheet.</li>
            <li>5. Optional LLM polish via the buttons below.</li>
            <li>6. Send to Voice → Autotune → Master.</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={generate}>Generate Song</PrimaryButton>
          <PrimaryButton onClick={variation} variant="ghost">
            New Variation
          </PrimaryButton>
          <PrimaryButton onClick={applyToVoice} variant="ghost">
            Send to Voice
          </PrimaryButton>
        </div>

        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
            Optional LLM help
          </h3>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => void askLlm('chords')} variant="ghost">
              {llmBusy ? '…' : 'Suggest Progressions'}
            </PrimaryButton>
            <PrimaryButton onClick={() => void askLlm('lyrics')} variant="ghost">
              Rewrite Lyrics
            </PrimaryButton>
            <PrimaryButton onClick={() => void askLlm('complete')} variant="ghost">
              Expand Full Song
            </PrimaryButton>
          </div>
          {llmStatus && (
            <p className="mt-3 font-mono text-xs text-[var(--color-muted)]">{llmStatus}</p>
          )}
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel className="animate-rise">
          {!song ? (
            <p className="text-sm text-[var(--color-muted)]">
              Your complete song appears here — form, chord loop, lyrics, and melody stats.
            </p>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-3xl">{song.brief.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{song.formSummary}</p>
                </div>
                <PrimaryButton onClick={() => void copyLeadSheet()} variant="ghost">
                  {copied ? 'Copied' : 'Copy Lead Sheet'}
                </PrimaryButton>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Key" value={`${song.brief.key} ${song.brief.scale}`} />
                <Stat label="BPM" value={String(song.brief.bpm)} />
                <Stat label="Chords" value={String(song.chords.length)} />
                <Stat label="Melody notes" value={String(song.midiNotes.length)} />
              </div>

              <div className="mb-5">
                <Label>Chord loop</Label>
                <p className="font-display text-2xl text-[var(--color-copper-bright)]">{loop}</p>
              </div>

              <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
                {song.lyrics.map((block, idx) => (
                  <div key={`${block.section}-${idx}`}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {block.section}
                    </div>
                    {block.lines.map((line) => (
                      <p key={line} className="text-sm leading-relaxed text-[var(--color-cream)]">
                        {line}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {song.warnings.map((w) => (
                <p key={w} className="mt-4 text-sm text-[var(--color-copper-bright)]">
                  {w}
                </p>
              ))}
            </>
          )}
        </Panel>

        {(llmDraft || leadSheet) && (
          <Panel className="animate-rise">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {llmDraft ? 'LLM draft' : 'Lead sheet'}
            </h3>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--color-muted)]">
              {llmDraft || leadSheet}
            </pre>
          </Panel>
        )}
      </div>
    </div>
  )
}
