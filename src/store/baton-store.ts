import { create } from 'zustand'
import {
  processAutotune,
  processMaster,
  processSplit,
  processBeat,
  synthesizeVoice,
  runEngineDiagnostics,
  createTone,
  createSong,
  formatSongLeadSheet,
  type AutotuneParams,
  type MasterParams,
  type SplitParams,
  type BeatParams,
  type VoiceParams,
  type AutotuneResult,
  type MasterResult,
  type SplitResult,
  type BeatResult,
  type VoiceResult,
  type DiagnosticReport,
  type MidiNote,
  type AudioBufferData,
  type SongBrief,
  type GeneratedSong,
  DEFAULT_AUTOTUNE_PARAMS,
  DEFAULT_MASTER_PARAMS,
  DEFAULT_SPLIT_PARAMS,
  DEFAULT_BEAT_PARAMS,
  DEFAULT_VOICE_PARAMS,
  DEFAULT_SONG_BRIEF,
} from '@/engine'

export type ToolId =
  | 'song'
  | 'autotune'
  | 'master'
  | 'split'
  | 'beat'
  | 'voice'
  | 'assistant'
  | 'diagnostics'

type BatonState = {
  activeTool: ToolId
  sampleRate: number
  workingBuffer: AudioBufferData | null
  bufferLabel: string
  lastLog: string[]

  autotune: AutotuneParams
  master: MasterParams
  split: SplitParams
  beat: BeatParams
  voice: VoiceParams
  midiNotes: MidiNote[]

  songBrief: SongBrief
  song: GeneratedSong | null
  songLeadSheet: string

  autotuneResult: AutotuneResult | null
  masterResult: MasterResult | null
  splitResult: SplitResult | null
  beatResult: BeatResult | null
  voiceResult: VoiceResult | null
  diagnostics: DiagnosticReport | null

  setTool: (tool: ToolId) => void
  loadDemoTone: (freqHz?: number) => void
  loadDemoPulse: (bpm?: number) => void
  patchAutotune: (p: Partial<AutotuneParams>) => void
  patchMaster: (p: Partial<MasterParams>) => void
  patchSplit: (p: Partial<SplitParams>) => void
  patchBeat: (p: Partial<BeatParams>) => void
  patchVoice: (p: Partial<VoiceParams>) => void
  patchSongBrief: (p: Partial<SongBrief>) => void
  generateSong: () => void
  regenerateSongVariation: () => void
  applySongToVoice: () => void
  setMidiFromLyrics: () => void
  runActiveTool: () => void
  runDiagnostics: () => void
}

function pushLog(logs: string[], line: string): string[] {
  const stamp = new Date().toLocaleTimeString()
  return [`[${stamp}] ${line}`, ...logs].slice(0, 40)
}

export const useBatonStore = create<BatonState>((set, get) => ({
  activeTool: 'song',
  sampleRate: 44100,
  workingBuffer: null,
  bufferLabel: 'No audio loaded',
  lastLog: [],

  autotune: { ...DEFAULT_AUTOTUNE_PARAMS },
  master: { ...DEFAULT_MASTER_PARAMS },
  split: { ...DEFAULT_SPLIT_PARAMS },
  beat: { ...DEFAULT_BEAT_PARAMS },
  voice: { ...DEFAULT_VOICE_PARAMS, lyrics: 'la la la' },
  midiNotes: [
    { midi: 60, velocity: 0.9, startSec: 0, durationSec: 0.4 },
    { midi: 64, velocity: 0.85, startSec: 0.4, durationSec: 0.4 },
    { midi: 67, velocity: 0.8, startSec: 0.8, durationSec: 0.6 },
  ],

  songBrief: { ...DEFAULT_SONG_BRIEF },
  song: null,
  songLeadSheet: '',

  autotuneResult: null,
  masterResult: null,
  splitResult: null,
  beatResult: null,
  voiceResult: null,
  diagnostics: null,

  setTool: (tool) => set({ activeTool: tool }),

  loadDemoTone: (freqHz = 440) => {
    const buf = createTone(get().sampleRate, 2, freqHz, 0.35)
    set((s) => ({
      workingBuffer: buf,
      bufferLabel: `Demo tone ${freqHz} Hz · 2.0s`,
      lastLog: pushLog(s.lastLog, `Loaded demo tone @ ${freqHz} Hz`),
    }))
  },

  loadDemoPulse: (bpm = 120) => {
    const sr = get().sampleRate
    const buf = createTone(sr, 4, 180, 0.45)
    const period = Math.floor((60 / bpm) * sr)
    for (let i = 0; i < buf.length; i++) {
      const gate = i % period < period * 0.18 ? 1 : 0.03
      for (const ch of buf.channels) ch[i]! *= gate
    }
    set((s) => ({
      workingBuffer: buf,
      bufferLabel: `Demo pulse ${bpm} BPM · 4.0s`,
      lastLog: pushLog(s.lastLog, `Loaded demo pulse @ ${bpm} BPM`),
    }))
  },

  patchAutotune: (p) => set((s) => ({ autotune: { ...s.autotune, ...p } })),
  patchMaster: (p) => set((s) => ({ master: { ...s.master, ...p } })),
  patchSplit: (p) => set((s) => ({ split: { ...s.split, ...p } })),
  patchBeat: (p) => set((s) => ({ beat: { ...s.beat, ...p } })),
  patchVoice: (p) => set((s) => ({ voice: { ...s.voice, ...p } })),
  patchSongBrief: (p) => set((s) => ({ songBrief: { ...s.songBrief, ...p } })),

  generateSong: () => {
    try {
      const song = createSong(get().songBrief)
      const chorus = song.lyrics.find((b) => b.section === 'Chorus')
      set((s) => ({
        song,
        songLeadSheet: formatSongLeadSheet(song),
        midiNotes: song.midiNotes.slice(0, 64),
        voice: {
          ...s.voice,
          lyrics: chorus?.lines.join(' ') ?? s.voice.lyrics,
        },
        lastLog: pushLog(
          s.lastLog,
          `Song: "${song.brief.title}" · ${song.formSummary}`,
        ),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  regenerateSongVariation: () => {
    const nextSeed = (get().songBrief.seed + 1) % 10_000
    set((s) => ({ songBrief: { ...s.songBrief, seed: nextSeed } }))
    get().generateSong()
  },

  applySongToVoice: () => {
    const song = get().song
    if (!song) {
      set((st) => ({
        lastLog: pushLog(st.lastLog, 'ERROR: Generate a song first.'),
      }))
      return
    }
    const chorus = song.lyrics.find((b) => b.section === 'Chorus')
    set((s) => ({
      midiNotes: song.midiNotes.slice(0, 48),
      voice: {
        ...s.voice,
        lyrics: chorus?.lines.join(' / ') ?? song.brief.theme,
      },
      activeTool: 'voice',
      lastLog: pushLog(
        s.lastLog,
        `Sent "${song.brief.title}" melody + chorus lyrics to Voice`,
      ),
    }))
  },

  setMidiFromLyrics: () => {
    const parts = get().voice.lyrics.trim().split(/[\s\-]+/).filter(Boolean)
    const notes: MidiNote[] = parts.map((_, i) => ({
      midi: 60 + (i % 5) * 2,
      velocity: 0.85,
      startSec: i * 0.35,
      durationSec: 0.32,
    }))
    set((s) => ({
      midiNotes: notes.length ? notes : s.midiNotes,
      lastLog: pushLog(s.lastLog, `Mapped ${notes.length} MIDI notes from lyrics`),
    }))
  },

  runActiveTool: () => {
    const s = get()
    try {
      switch (s.activeTool) {
        case 'song':
          get().generateSong()
          break
        case 'autotune': {
          if (!s.workingBuffer) throw new Error('Load audio first (Demo Tone).')
          const result = processAutotune(s.workingBuffer, s.autotune)
          set({
            autotuneResult: result,
            lastLog: pushLog(
              s.lastLog,
              `Autotune: ${result.frames.length} frames, avg ${result.averageCentsCorrection.toFixed(1)}¢`,
            ),
          })
          break
        }
        case 'master': {
          if (!s.workingBuffer) throw new Error('Load audio first (Demo Tone).')
          const result = processMaster(s.workingBuffer, s.master)
          set({
            masterResult: result,
            lastLog: pushLog(
              s.lastLog,
              `Master: ${result.report.integratedLUFS.toFixed(1)} LUFS · ${result.warnings[0] ?? 'OK'}`,
            ),
          })
          break
        }
        case 'split': {
          if (!s.workingBuffer) throw new Error('Load audio first (Demo Tone).')
          const result = processSplit(s.workingBuffer, s.split)
          set({
            splitResult: result,
            lastLog: pushLog(
              s.lastLog,
              `Split: ${result.stemNames.join(', ')}${result.warnings[0] ? ` · ${result.warnings[0]}` : ''}`,
            ),
          })
          break
        }
        case 'beat': {
          if (!s.workingBuffer) throw new Error('Load audio first (Demo Pulse).')
          const result = processBeat(s.workingBuffer, s.beat)
          set({
            beatResult: result,
            lastLog: pushLog(
              s.lastLog,
              `Beat: ${result.bpm} BPM · key ${result.key ?? '?'} ${result.scale}`,
            ),
          })
          break
        }
        case 'voice': {
          const result = synthesizeVoice(s.midiNotes, s.sampleRate, s.voice)
          set({
            voiceResult: result,
            workingBuffer: result.output,
            bufferLabel: `Voice render · ${result.renderedNotes} notes`,
            lastLog: pushLog(
              s.lastLog,
              `Voice: rendered ${result.renderedNotes} notes${result.warnings[0] ? ` · ${result.warnings[0]}` : ''}`,
            ),
          })
          break
        }
        case 'assistant':
          break
        case 'diagnostics':
          get().runDiagnostics()
          break
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  runDiagnostics: () => {
    const report = runEngineDiagnostics(get().sampleRate)
    set((s) => ({
      diagnostics: report,
      activeTool: 'diagnostics',
      lastLog: pushLog(s.lastLog, `Diagnostics: ${report.summary}`),
    }))
  },
}))
