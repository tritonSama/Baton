import { useState } from 'react'
import clsx from 'clsx'
import { useBatonStore } from '@/store/baton-store'
import { PrimaryButton } from '@/components/ui'
import {
  calculateCrossfaderGains,
  getHeadphoneCueState,
  type DJDeckState,
  type YouTubeTrack,
  type FXType,
} from '@/engine/vinyl'

function FormatTime({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const pad = secs < 10 ? '0' : ''
  return (
    <span className="font-mono text-xs">
      {mins}:{pad}
      {secs}
    </span>
  )
}

function VinylPlatter({
  deck,
  gain,
}: {
  deck: DJDeckState
  gain: number
}) {
  const isRotating = deck.isPlaying && gain > 0.05
  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div
        className={clsx(
          'relative flex h-48 w-48 items-center justify-center rounded-full border-4 border-[#222] bg-[#111] shadow-2xl transition-transform duration-300',
          isRotating && 'animate-spin',
        )}
        style={{ animationDuration: `${3 / (1 + deck.pitchPercent / 100)}s` }}
      >
        {/* Vinyl grooves */}
        <div className="absolute inset-2 rounded-full border border-neutral-800/80" />
        <div className="absolute inset-5 rounded-full border border-neutral-800/60" />
        <div className="absolute inset-9 rounded-full border border-neutral-800/40" />
        <div className="absolute inset-14 rounded-full border border-neutral-800/20" />

        {/* Vinyl Center Label */}
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[var(--color-copper)] p-1 text-center shadow-inner">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black">
            VINYL
          </div>
          <div className="line-clamp-1 text-[9px] font-medium text-black/80">
            {deck.track ? deck.track.title : `DECK ${deck.id}`}
          </div>
          <div className="text-[8px] font-mono font-bold text-black/60">
            {deck.actualBpm} BPM
          </div>
          {/* Spindle hole */}
          <div className="mt-0.5 h-3 w-3 rounded-full bg-neutral-900 border border-neutral-700" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={clsx(
            'inline-block h-2 w-2 rounded-full',
            deck.isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600',
          )}
        />
        <span className="font-mono text-xs text-[var(--color-muted)]">
          {deck.activeFx !== 'none' ? `FX: ${deck.activeFx.toUpperCase()}` : 'READY'}
        </span>
      </div>
    </div>
  )
}

function DeckControls({
  deck,
}: {
  deck: DJDeckState
}) {
  const toggleDeckPlay = useBatonStore((s) => s.toggleDeckPlay)
  const setDeckCurrentTime = useBatonStore((s) => s.setDeckCurrentTime)
  const setDeckPitch = useBatonStore((s) => s.setDeckPitch)
  const setDeckEQ = useBatonStore((s) => s.setDeckEQ)
  const toggleHeadphoneCue = useBatonStore((s) => s.toggleHeadphoneCue)
  const triggerHotCue = useBatonStore((s) => s.triggerHotCue)
  const toggleDeckLoop = useBatonStore((s) => s.toggleDeckLoop)
  const setDeckFx = useBatonStore((s) => s.setDeckFx)

  const progressPercent = deck.durationSec
    ? (deck.currentTimeSec / deck.durationSec) * 100
    : 0

  return (
    <div className="flex min-w-[300px] flex-1 flex-col gap-4 rounded-sm border border-[var(--color-line)] bg-[var(--color-panel)]/80 p-4">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-copper)] text-xs font-bold text-black">
            {deck.id}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--color-cream)]">
              {deck.track ? deck.track.title : 'No track loaded'}
            </h3>
            <p className="truncate text-[11px] text-[var(--color-muted)]">
              {deck.track ? deck.track.artist : 'Select a song from search below'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-[var(--color-copper)]">
            {deck.actualBpm} BPM
          </div>
          <div className="text-[10px] font-mono text-[var(--color-muted)]">
            Pitch: {deck.pitchPercent > 0 ? `+${deck.pitchPercent}` : deck.pitchPercent}%
          </div>
        </div>
      </div>

      {/* Waveform / Scrubber Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
          <FormatTime seconds={deck.currentTimeSec} />
          <FormatTime seconds={deck.durationSec} />
        </div>
        <input
          type="range"
          min={0}
          max={deck.durationSec || 100}
          step={0.1}
          value={deck.currentTimeSec}
          onChange={(e) => setDeckCurrentTime(deck.id, Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-[var(--color-copper)]"
        />
        {/* Hot Cue Markers */}
        <div className="relative h-1.5 w-full rounded bg-neutral-800">
          <div
            className="h-full bg-[var(--color-copper)] rounded transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          {deck.hotCues.map((cue) => {
            const cuePct = deck.durationSec ? (cue.timeSec / deck.durationSec) * 100 : 0
            return (
              <div
                key={cue.id}
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                style={{ left: `${cuePct}%` }}
                title={`${cue.label} (${cue.timeSec}s)`}
              />
            )
          })}
        </div>
      </div>

      {/* Main Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--color-line)] py-3">
        <PrimaryButton onClick={() => toggleDeckPlay(deck.id)}>
          {deck.isPlaying ? 'PAUSE' : 'PLAY'}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => setDeckCurrentTime(deck.id, 0)}
          className="rounded border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:border-neutral-500"
        >
          CUE (0s)
        </button>

        {/* Headphone Preview Cue Button */}
        <button
          type="button"
          onClick={() => toggleHeadphoneCue(deck.id)}
          className={clsx(
            'flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition',
            deck.headphoneCue
              ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
              : 'border-[var(--color-line)] bg-neutral-800/50 text-[var(--color-muted)] hover:border-neutral-500',
          )}
        >
          <span>🎧 PREVIEW CUE</span>
        </button>
      </div>

      {/* Hot Cue Buttons & Loop */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Hot Cues
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {deck.hotCues.map((cue) => (
              <button
                key={cue.id}
                type="button"
                onClick={() => triggerHotCue(deck.id, cue.id)}
                className="rounded border border-[var(--color-line)] bg-neutral-900 px-2 py-1 text-left text-[11px] font-medium hover:border-[var(--color-copper)]"
              >
                <div className="text-[9px] text-[var(--color-copper)]">CUE {cue.id}</div>
                <div className="truncate">{cue.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Loop & FX
          </label>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => toggleDeckLoop(deck.id, 4)}
              className={clsx(
                'w-full rounded border px-2 py-1 text-center text-xs font-medium transition',
                deck.loop.active
                  ? 'border-amber-500 bg-amber-950/60 text-amber-300'
                  : 'border-[var(--color-line)] bg-neutral-900 hover:border-neutral-500',
              )}
            >
              LOOP (4 BEATS) {deck.loop.active ? 'ON' : 'OFF'}
            </button>
            <div className="flex gap-1">
              {(['none', 'scratch', 'brake'] as FXType[]).map((fx) => (
                <button
                  key={fx}
                  type="button"
                  onClick={() => setDeckFx(deck.id, fx)}
                  className={clsx(
                    'flex-1 rounded border px-1 py-1 text-center text-[10px] uppercase transition',
                    deck.activeFx === fx
                      ? 'border-[var(--color-copper)] bg-[var(--color-copper)]/20 text-[var(--color-copper)]'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]',
                  )}
                >
                  {fx}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pitch Slider & EQ Knobs */}
      <div className="space-y-3 rounded bg-neutral-950/40 p-3 border border-[var(--color-line)]">
        <div>
          <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
            <span>Pitch / Speed Control</span>
            <span>{deck.pitchPercent > 0 ? `+${deck.pitchPercent}` : deck.pitchPercent}%</span>
          </div>
          <input
            type="range"
            min={-16}
            max={16}
            step={0.5}
            value={deck.pitchPercent}
            onChange={(e) => setDeckPitch(deck.id, Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-[var(--color-copper)]"
          />
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            3-Band Equalizer (High / Mid / Low)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(['highDb', 'midDb', 'lowDb'] as const).map((band) => (
              <div key={band} className="space-y-1">
                <span className="text-[10px] uppercase text-[var(--color-muted)]">
                  {band.replace('Db', '')}
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={deck.eq[band]}
                  onChange={(e) =>
                    setDeckEQ(deck.id, { [band]: Number(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer accent-amber-500"
                />
                <div className="font-mono text-[9px] text-[var(--color-muted)]">
                  {deck.eq[band]} dB
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CentralMixer() {
  const crossfader = useBatonStore((s) => s.crossfader)
  const setCrossfader = useBatonStore((s) => s.setCrossfader)
  const autoMixer = useBatonStore((s) => s.autoMixer)
  const patchAutoMixer = useBatonStore((s) => s.patchAutoMixer)
  const triggerAutoMix = useBatonStore((s) => s.triggerAutoMix)
  const deckA = useBatonStore((s) => s.deckA)
  const deckB = useBatonStore((s) => s.deckB)
  const headphoneMix = useBatonStore((s) => s.headphoneMix)

  const gains = calculateCrossfaderGains(crossfader, autoMixer.curve)
  const headphoneState = getHeadphoneCueState(deckA, deckB, headphoneMix)

  return (
    <div className="flex w-full flex-col gap-4 rounded-sm border border-[var(--color-line)] bg-[var(--color-panel)]/90 p-4 md:w-80">
      <div className="border-b border-[var(--color-line)] pb-2 text-center">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-cream)]">
          Master DJ Mixer
        </h2>
        <p className="text-[11px] text-[var(--color-muted)]">
          {headphoneState.cueSummary}
        </p>
      </div>

      {/* Gain Meters */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[var(--color-muted)]">DECK A</div>
          <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-100"
              style={{ width: `${gains.gainA * 100}%` }}
            />
          </div>
          <div className="font-mono text-[10px] text-[var(--color-muted)]">
            Gain: {Math.round(gains.gainA * 100)}%
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[var(--color-muted)]">DECK B</div>
          <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-100"
              style={{ width: `${gains.gainB * 100}%` }}
            />
          </div>
          <div className="font-mono text-[10px] text-[var(--color-muted)]">
            Gain: {Math.round(gains.gainB * 100)}%
          </div>
        </div>
      </div>

      {/* Crossfader Control */}
      <div className="space-y-2 rounded bg-neutral-950 p-3 border border-[var(--color-line)]">
        <div className="flex justify-between text-[11px] font-semibold text-[var(--color-muted)]">
          <span>A</span>
          <span>CROSSFADER</span>
          <span>B</span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={crossfader}
          onChange={(e) => setCrossfader(Number(e.target.value))}
          className="h-3 w-full cursor-pointer accent-[var(--color-copper)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--color-muted)]">
          <button
            type="button"
            onClick={() => setCrossfader(-1)}
            className="hover:text-[var(--color-copper)]"
          >
            Full A
          </button>
          <button
            type="button"
            onClick={() => setCrossfader(0)}
            className="hover:text-[var(--color-copper)]"
          >
            Center
          </button>
          <button
            type="button"
            onClick={() => setCrossfader(1)}
            className="hover:text-[var(--color-copper)]"
          >
            Full B
          </button>
        </div>
      </div>

      {/* Auto-Mixer Settings */}
      <div className="space-y-3 rounded bg-amber-950/20 p-3 border border-amber-800/40">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-amber-300">⚡ AUTO-MIXER</div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <input
              type="checkbox"
              checked={autoMixer.enabled}
              onChange={(e) => patchAutoMixer({ enabled: e.target.checked })}
              className="accent-amber-500"
            />
            Auto Fade
          </label>
        </div>

        <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
          Automatically transitions into the next song before the current track ends.
        </p>

        <div>
          <div className="flex justify-between text-[10px] text-[var(--color-muted)]">
            <span>Trigger Window</span>
            <span>{autoMixer.triggerBeforeEndSec}s before end</span>
          </div>
          <input
            type="range"
            min={8}
            max={32}
            step={2}
            value={autoMixer.triggerBeforeEndSec}
            onChange={(e) =>
              patchAutoMixer({ triggerBeforeEndSec: Number(e.target.value) })
            }
            className="h-1.5 w-full cursor-pointer accent-amber-500"
          />
        </div>

        <button
          type="button"
          onClick={triggerAutoMix}
          className="w-full rounded bg-[var(--color-copper)] px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-500"
        >
          MIX NOW → NEXT SONG
        </button>
      </div>
    </div>
  )
}

function YouTubeSearchAndQueue() {
  const [query, setQuery] = useState('')
  const searchResults = useBatonStore((s) => s.ytSearchResults)
  const searchYouTubeTracks = useBatonStore((s) => s.searchYouTubeTracks)
  const addYouTubeTrackToQueue = useBatonStore((s) => s.addYouTubeTrackToQueue)
  const loadTrackToDeck = useBatonStore((s) => s.loadTrackToDeck)
  const djQueue = useBatonStore((s) => s.djQueue)
  const removeFromQueue = useBatonStore((s) => s.removeFromQueue)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchYouTubeTracks(query)
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Search & Browser */}
      <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-cream)]">
          🔍 YouTube Track Search & Loader
        </h3>
        <form onSubmit={handleSearch} className="mb-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search song title, artist, or paste YouTube URL / ID..."
            className="flex-1 rounded border border-[var(--color-line)] bg-neutral-900 px-3 py-1.5 text-xs text-[var(--color-cream)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-copper)]"
          />
          <button
            type="submit"
            className="rounded bg-[var(--color-copper)] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-500"
          >
            Search
          </button>
        </form>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {searchResults.map((track: YouTubeTrack) => (
            <div
              key={track.id}
              className="flex items-center justify-between rounded border border-[var(--color-line)] bg-neutral-900/60 p-2 text-xs"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="truncate font-semibold text-[var(--color-cream)]">
                  {track.title}
                </div>
                <div className="truncate text-[10px] text-[var(--color-muted)]">
                  {track.artist} · {track.bpm} BPM · {track.key}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => loadTrackToDeck('A', track)}
                  className="rounded bg-neutral-800 px-2 py-1 text-[10px] font-bold text-[var(--color-copper)] hover:bg-[var(--color-copper)] hover:text-black"
                >
                  DECK A
                </button>
                <button
                  type="button"
                  onClick={() => loadTrackToDeck('B', track)}
                  className="rounded bg-neutral-800 px-2 py-1 text-[10px] font-bold text-[var(--color-copper)] hover:bg-[var(--color-copper)] hover:text-black"
                >
                  DECK B
                </button>
                <button
                  type="button"
                  onClick={() => addYouTubeTrackToQueue(track)}
                  className="rounded bg-amber-900/40 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-800"
                >
                  + QUEUE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="rounded-sm border border-[var(--color-line)] bg-[var(--color-panel)]/70 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-cream)]">
          🎶 Upcoming DJ Playlist Queue ({djQueue.length})
        </h3>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {djQueue.length === 0 && (
            <p className="py-8 text-center text-xs text-[var(--color-muted)]">
              Queue is empty. Search tracks above and click "+ QUEUE" to add.
            </p>
          )}
          {djQueue.map((track: YouTubeTrack, idx: number) => (
            <div
              key={`${track.id}-${idx}`}
              className="flex items-center justify-between rounded border border-[var(--color-line)] bg-neutral-900/60 p-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                <span className="font-mono text-[10px] font-bold text-[var(--color-muted)]">
                  #{idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--color-cream)]">
                    {track.title}
                  </div>
                  <div className="truncate text-[10px] text-[var(--color-muted)]">
                    {track.artist} · {track.bpm} BPM
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    loadTrackToDeck('A', track)
                    removeFromQueue(idx)
                  }}
                  className="rounded bg-neutral-800 px-1.5 py-1 text-[9px] font-bold text-[var(--color-copper)]"
                >
                  → A
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadTrackToDeck('B', track)
                    removeFromQueue(idx)
                  }}
                  className="rounded bg-neutral-800 px-1.5 py-1 text-[9px] font-bold text-[var(--color-copper)]"
                >
                  → B
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  className="px-1 text-xs text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VinylDJPanel() {
  const deckA = useBatonStore((s) => s.deckA)
  const deckB = useBatonStore((s) => s.deckB)
  const crossfader = useBatonStore((s) => s.crossfader)
  const autoMixer = useBatonStore((s) => s.autoMixer)
  const gains = calculateCrossfaderGains(crossfader, autoMixer.curve)

  return (
    <div className="space-y-6">
      {/* DJ Decks & Center Mixer Console */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Deck A */}
        <div className="flex flex-1 flex-col gap-3">
          <VinylPlatter deck={deckA} gain={gains.gainA} />
          <DeckControls deck={deckA} />
        </div>

        {/* Central Master Mixer */}
        <CentralMixer />

        {/* Deck B */}
        <div className="flex flex-1 flex-col gap-3">
          <VinylPlatter deck={deckB} gain={gains.gainB} />
          <DeckControls deck={deckB} />
        </div>
      </div>

      {/* Track Search & Queue */}
      <YouTubeSearchAndQueue />
    </div>
  )
}
