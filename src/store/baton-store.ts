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
  createEmptyPipeline,
  preprocessAudio,
  suggestAnnotations,
  runTrainingJob,
  evaluateTraining,
  formatTrainingPlan,
  DEFAULT_TRAINING_CONFIG,
  createDefaultDeck,
  createYouTubeTrack,
  calculateEffectiveBpm,
  calculateAutoMixTransition,
  DEMO_YOUTUBE_TRACKS,
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
  type TrainingConfig,
  type TrainingPipelineResult,
  type FeatureAnnotation,
  type PreprocessOptions,
  type TrainHyperparams,
  type TrainingStepId,
  type DJDeckState,
  type AutoMixerConfig,
  type YouTubeTrack,
  type FXType,
  DEFAULT_AUTOTUNE_PARAMS,
  DEFAULT_MASTER_PARAMS,
  DEFAULT_SPLIT_PARAMS,
  DEFAULT_BEAT_PARAMS,
  DEFAULT_VOICE_PARAMS,
  DEFAULT_SONG_BRIEF,
} from '@/engine'

export type ToolId =
  | 'vinyl'
  | 'song'
  | 'train'
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

  // Vinyl DJ State
  deckA: DJDeckState
  deckB: DJDeckState
  crossfader: number // -1 (Deck A) to +1 (Deck B)
  masterVolume: number
  headphoneVolume: number
  headphoneMix: number
  autoMixer: AutoMixerConfig
  djQueue: YouTubeTrack[]
  ytSearchResults: YouTubeTrack[]

  autotune: AutotuneParams
  master: MasterParams
  split: SplitParams
  beat: BeatParams
  voice: VoiceParams
  midiNotes: MidiNote[]

  songBrief: SongBrief
  song: GeneratedSong | null
  songLeadSheet: string

  trainingConfig: TrainingConfig
  trainingPipeline: TrainingPipelineResult
  trainingHumanFeedback: number | null

  autotuneResult: AutotuneResult | null
  masterResult: MasterResult | null
  splitResult: SplitResult | null
  beatResult: BeatResult | null
  voiceResult: VoiceResult | null
  diagnostics: DiagnosticReport | null

  setTool: (tool: ToolId) => void
  loadDemoTone: (freqHz?: number) => void
  loadDemoPulse: (bpm?: number) => void

  // Vinyl DJ Actions
  loadTrackToDeck: (deckId: 'A' | 'B', track: YouTubeTrack) => void
  toggleDeckPlay: (deckId: 'A' | 'B') => void
  setDeckCurrentTime: (deckId: 'A' | 'B', timeSec: number) => void
  setDeckPitch: (deckId: 'A' | 'B', pitchPercent: number) => void
  setDeckEQ: (deckId: 'A' | 'B', eq: Partial<DJDeckState['eq']>) => void
  toggleHeadphoneCue: (deckId: 'A' | 'B') => void
  setDeckVolume: (deckId: 'A' | 'B', volume: number) => void
  triggerHotCue: (deckId: 'A' | 'B', cueId: number) => void
  toggleDeckLoop: (deckId: 'A' | 'B', lengthBeats?: number) => void
  setDeckFx: (deckId: 'A' | 'B', fx: FXType) => void
  setCrossfader: (value: number) => void
  patchAutoMixer: (p: Partial<AutoMixerConfig>) => void
  triggerAutoMix: () => void
  addYouTubeTrackToQueue: (input: string | YouTubeTrack) => void
  removeFromQueue: (index: number) => void
  searchYouTubeTracks: (query: string) => void

  patchAutotune: (p: Partial<AutotuneParams>) => void
  patchMaster: (p: Partial<MasterParams>) => void
  patchSplit: (p: Partial<SplitParams>) => void
  patchBeat: (p: Partial<BeatParams>) => void
  patchVoice: (p: Partial<VoiceParams>) => void
  patchSongBrief: (p: Partial<SongBrief>) => void
  generateSong: () => void
  regenerateSongVariation: () => void
  applySongToVoice: () => void
  patchTrainingConfig: (p: Partial<TrainingConfig>) => void
  patchTrainingAnnotation: (p: Partial<FeatureAnnotation>) => void
  patchTrainingPreprocess: (p: Partial<PreprocessOptions>) => void
  patchTrainingHyperparams: (p: Partial<TrainHyperparams>) => void
  runTrainingPreprocess: () => void
  autoAnnotateFromBuffer: () => void
  runTrainingJobStep: () => void
  runTrainingEvaluate: () => void
  setTrainingHumanFeedback: (v: number | null) => void
  resetTrainingPipeline: () => void
  markTrainingStep: (step: TrainingStepId) => void
  setMidiFromLyrics: () => void
  runActiveTool: () => void
  runDiagnostics: () => void
}

function pushLog(logs: string[], line: string): string[] {
  const stamp = new Date().toLocaleTimeString()
  return [`[${stamp}] ${line}`, ...logs].slice(0, 40)
}

const initialDeckA = createDefaultDeck('A')
initialDeckA.track = DEMO_YOUTUBE_TRACKS[0]!
initialDeckA.durationSec = DEMO_YOUTUBE_TRACKS[0]!.durationSec
initialDeckA.actualBpm = DEMO_YOUTUBE_TRACKS[0]!.bpm

const initialDeckB = createDefaultDeck('B')
initialDeckB.track = DEMO_YOUTUBE_TRACKS[1]!
initialDeckB.durationSec = DEMO_YOUTUBE_TRACKS[1]!.durationSec
initialDeckB.actualBpm = DEMO_YOUTUBE_TRACKS[1]!.bpm

export const useBatonStore = create<BatonState>((set, get) => ({
  activeTool: 'vinyl',
  sampleRate: 44100,
  workingBuffer: null,
  bufferLabel: 'Vinyl DJ ready',
  lastLog: [],

  // Vinyl State Defaults
  deckA: initialDeckA,
  deckB: initialDeckB,
  crossfader: -1, // Full Deck A
  masterVolume: 1.0,
  headphoneVolume: 0.8,
  headphoneMix: 0,
  autoMixer: {
    enabled: true,
    triggerBeforeEndSec: 16,
    transitionDurationSec: 12,
    curve: 'smooth',
    inTransition: false,
    progress: 0,
    targetDeck: 'B',
  },
  djQueue: DEMO_YOUTUBE_TRACKS.slice(2),
  ytSearchResults: DEMO_YOUTUBE_TRACKS,

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

  trainingConfig: {
    ...DEFAULT_TRAINING_CONFIG,
    preprocess: { ...DEFAULT_TRAINING_CONFIG.preprocess },
    annotation: {
      ...DEFAULT_TRAINING_CONFIG.annotation,
      instrumentation: [...DEFAULT_TRAINING_CONFIG.annotation.instrumentation],
    },
    hyperparams: { ...DEFAULT_TRAINING_CONFIG.hyperparams },
  },
  trainingPipeline: createEmptyPipeline(),
  trainingHumanFeedback: null,

  autotuneResult: null,
  masterResult: null,
  splitResult: null,
  beatResult: null,
  voiceResult: null,
  diagnostics: null,

  setTool: (tool) => set({ activeTool: tool }),

  // Vinyl DJ Actions
  loadTrackToDeck: (deckId, track) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const updatedDeck: DJDeckState = {
        ...s[deckKey],
        track,
        currentTimeSec: 0,
        durationSec: track.durationSec,
        actualBpm: calculateEffectiveBpm(track.bpm, s[deckKey].pitchPercent),
        isPlaying: false,
      }
      return {
        [deckKey]: updatedDeck,
        lastLog: pushLog(s.lastLog, `Vinyl: Loaded "${track.title}" onto Deck ${deckId}`),
      }
    }),

  toggleDeckPlay: (deckId) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const isPlaying = !s[deckKey].isPlaying
      return {
        [deckKey]: { ...s[deckKey], isPlaying },
        lastLog: pushLog(
          s.lastLog,
          `Vinyl: Deck ${deckId} ${isPlaying ? 'PLAYING' : 'PAUSED'}`,
        ),
      }
    }),

  setDeckCurrentTime: (deckId, timeSec) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      const clamped = Math.max(0, Math.min(deck.durationSec, timeSec))

      // Check Auto-mixer trigger if playing
      let autoMixer = s.autoMixer
      if (deck.isPlaying && autoMixer.enabled && !autoMixer.inTransition) {
        const transitionCheck = calculateAutoMixTransition(
          { ...deck, currentTimeSec: clamped },
          autoMixer,
          s.crossfader
        )
        if (transitionCheck.shouldStartTransition) {
          const nextDeckId = deckId === 'A' ? 'B' : 'A'
          const nextDeckKey = nextDeckId === 'A' ? 'deckA' : 'deckB'
          autoMixer = {
            ...autoMixer,
            inTransition: true,
            progress: 0,
            targetDeck: nextDeckId,
          }
          // Ensure target deck is playing
          s[nextDeckKey].isPlaying = true
        }
      }

      return {
        [deckKey]: { ...deck, currentTimeSec: clamped },
        autoMixer,
      }
    }),

  setDeckPitch: (deckId, pitchPercent) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      const baseBpm = deck.track?.bpm || 120
      const actualBpm = calculateEffectiveBpm(baseBpm, pitchPercent)
      return {
        [deckKey]: { ...deck, pitchPercent, actualBpm },
      }
    }),

  setDeckEQ: (deckId, eq) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      return {
        [deckKey]: { ...deck, eq: { ...deck.eq, ...eq } },
      }
    }),

  toggleHeadphoneCue: (deckId) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      const headphoneCue = !deck.headphoneCue
      return {
        [deckKey]: { ...deck, headphoneCue },
        lastLog: pushLog(
          s.lastLog,
          `Vinyl: Headphone Preview Cue Deck ${deckId} ${headphoneCue ? 'ON' : 'OFF'}`,
        ),
      }
    }),

  setDeckVolume: (deckId, volume) =>
    set((state) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      return {
        [deckKey]: { ...state[deckKey], volume },
      }
    }),

  triggerHotCue: (deckId, cueId) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      const hotCue = deck.hotCues.find((c) => c.id === cueId)
      if (!hotCue) return {}
      return {
        [deckKey]: { ...deck, currentTimeSec: hotCue.timeSec },
        lastLog: pushLog(
          s.lastLog,
          `Vinyl: Deck ${deckId} Hot Cue ${cueId} (${hotCue.label} @ ${hotCue.timeSec}s)`,
        ),
      }
    }),

  toggleDeckLoop: (deckId, lengthBeats = 4) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      const deck = s[deckKey]
      const active = !deck.loop.active
      return {
        [deckKey]: {
          ...deck,
          loop: {
            active,
            startSec: active ? deck.currentTimeSec : deck.loop.startSec,
            lengthBeats,
          },
        },
        lastLog: pushLog(
          s.lastLog,
          `Vinyl: Deck ${deckId} Loop ${active ? 'ON' : 'OFF'} (${lengthBeats} beats)`,
        ),
      }
    }),

  setDeckFx: (deckId, fx) =>
    set((s) => {
      const deckKey = deckId === 'A' ? 'deckA' : 'deckB'
      return {
        [deckKey]: { ...s[deckKey], activeFx: fx },
        lastLog: pushLog(s.lastLog, `Vinyl: Deck ${deckId} FX -> ${fx}`),
      }
    }),

  setCrossfader: (value) =>
    set((s) => ({ crossfader: Math.max(-1, Math.min(1, value)) })),

  patchAutoMixer: (p) =>
    set((s) => ({ autoMixer: { ...s.autoMixer, ...p } })),

  triggerAutoMix: () => {
    const s = get()
    const activeDeck = s.crossfader <= 0 ? s.deckA : s.deckB
    const targetDeckKey = activeDeck.id === 'A' ? 'deckB' : 'deckA'

    // Auto load queue if target deck empty
    if (!s[targetDeckKey].track && s.djQueue.length > 0) {
      const nextTrack = s.djQueue[0]!
      s.loadTrackToDeck(activeDeck.id === 'A' ? 'B' : 'A', nextTrack)
      s.removeFromQueue(0)
    }

    set((state) => ({
      autoMixer: {
        ...state.autoMixer,
        inTransition: true,
        progress: 0,
        targetDeck: activeDeck.id === 'A' ? 'B' : 'A',
      },
      [targetDeckKey]: {
        ...state[targetDeckKey],
        isPlaying: true,
      },
      lastLog: pushLog(
        state.lastLog,
        `Vinyl: Triggered Auto-Mix transition -> Deck ${activeDeck.id === 'A' ? 'B' : 'A'}`,
      ),
    }))
  },

  addYouTubeTrackToQueue: (input) =>
    set((s) => {
      const track =
        typeof input === 'string' ? createYouTubeTrack({ idOrUrl: input }) : input
      return {
        djQueue: [...s.djQueue, track],
        lastLog: pushLog(s.lastLog, `Vinyl: Added "${track.title}" to Queue`),
      }
    }),

  removeFromQueue: (index) =>
    set((s) => ({
      djQueue: s.djQueue.filter((_, i) => i !== index),
    })),

  searchYouTubeTracks: (query) => {
    if (!query.trim()) {
      set({ ytSearchResults: DEMO_YOUTUBE_TRACKS })
      return
    }
    const filtered = DEMO_YOUTUBE_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase()),
    )
    const custom = createYouTubeTrack({
      idOrUrl: query,
      title: `Search Result: ${query}`,
    })
    set((state) => ({
      ytSearchResults: filtered.length > 0 ? filtered : [custom],
      lastLog: pushLog(state.lastLog, `Vinyl: Searched YouTube for "${query}"`),
    }))
  },

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

  patchTrainingConfig: (p) =>
    set((s) => ({
      trainingConfig: { ...s.trainingConfig, ...p },
      trainingPipeline: {
        ...s.trainingPipeline,
        config: { ...s.trainingConfig, ...p },
        exportPlan: formatTrainingPlan(
          { ...s.trainingConfig, ...p },
          s.trainingPipeline.preprocess,
          s.trainingPipeline.train,
          s.trainingPipeline.evaluation,
        ),
      },
    })),

  patchTrainingAnnotation: (p) =>
    set((s) => {
      const annotation = { ...s.trainingConfig.annotation, ...p }
      const trainingConfig = { ...s.trainingConfig, annotation }
      return {
        trainingConfig,
        trainingPipeline: {
          ...s.trainingPipeline,
          config: trainingConfig,
          exportPlan: formatTrainingPlan(
            trainingConfig,
            s.trainingPipeline.preprocess,
            s.trainingPipeline.train,
            s.trainingPipeline.evaluation,
          ),
        },
      }
    }),

  patchTrainingPreprocess: (p) =>
    set((s) => {
      const preprocess = { ...s.trainingConfig.preprocess, ...p }
      const trainingConfig = { ...s.trainingConfig, preprocess }
      return {
        trainingConfig,
        trainingPipeline: {
          ...s.trainingPipeline,
          config: trainingConfig,
          exportPlan: formatTrainingPlan(
            trainingConfig,
            s.trainingPipeline.preprocess,
            s.trainingPipeline.train,
            s.trainingPipeline.evaluation,
          ),
        },
      }
    }),

  patchTrainingHyperparams: (p) =>
    set((s) => {
      const hyperparams = { ...s.trainingConfig.hyperparams, ...p }
      const trainingConfig = { ...s.trainingConfig, hyperparams }
      return {
        trainingConfig,
        trainingPipeline: {
          ...s.trainingPipeline,
          config: trainingConfig,
          exportPlan: formatTrainingPlan(
            trainingConfig,
            s.trainingPipeline.preprocess,
            s.trainingPipeline.train,
            s.trainingPipeline.evaluation,
          ),
        },
      }
    }),

  markTrainingStep: (step) =>
    set((s) => ({
      trainingPipeline: {
        ...s.trainingPipeline,
        completedSteps: s.trainingPipeline.completedSteps.includes(step)
          ? s.trainingPipeline.completedSteps
          : [...s.trainingPipeline.completedSteps, step],
      },
    })),

  runTrainingPreprocess: () => {
    try {
      const buffer = get().workingBuffer
      if (!buffer) throw new Error('Load audio first (Demo Tone / Song → Voice).')
      const preprocess = preprocessAudio(buffer, get().trainingConfig.preprocess)
      get().markTrainingStep('preprocess')
      set((s) => ({
        trainingPipeline: {
          ...s.trainingPipeline,
          preprocess,
          exportPlan: formatTrainingPlan(
            s.trainingConfig,
            preprocess,
            s.trainingPipeline.train,
            s.trainingPipeline.evaluation,
          ),
        },
        lastLog: pushLog(s.lastLog, `Train preprocess: ${preprocess.summary}`),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  autoAnnotateFromBuffer: () => {
    try {
      const buffer = get().workingBuffer
      if (!buffer) throw new Error('Load audio first to auto-annotate.')
      const suggested = suggestAnnotations(buffer)
      get().patchTrainingAnnotation(suggested)
      get().markTrainingStep('annotate')
      set((s) => ({
        lastLog: pushLog(
          s.lastLog,
          `Train annotate: ${suggested.bpm ?? '?'} BPM · ${suggested.key ?? '?'} ${suggested.scale ?? ''}`,
        ),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  runTrainingJobStep: () => {
    try {
      const prep = get().trainingPipeline.preprocess
      if (!prep) throw new Error('Run preprocessing before training.')
      get().markTrainingStep('model')
      get().markTrainingStep('annotate')
      const train = runTrainingJob(get().trainingConfig, prep)
      get().markTrainingStep('train')
      set((s) => ({
        trainingPipeline: {
          ...s.trainingPipeline,
          train,
          exportPlan: formatTrainingPlan(
            s.trainingConfig,
            prep,
            train,
            s.trainingPipeline.evaluation,
          ),
        },
        lastLog: pushLog(
          s.lastLog,
          `Train: ${train.checkpointName} · loss ${train.finalLoss}`,
        ),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  runTrainingEvaluate: () => {
    try {
      const { preprocess, train } = get().trainingPipeline
      if (!preprocess || !train) {
        throw new Error('Preprocess and train before evaluation.')
      }
      const evaluation = evaluateTraining(
        get().trainingConfig,
        preprocess,
        train,
        get().trainingHumanFeedback,
      )
      get().markTrainingStep('evaluate')
      set((s) => ({
        trainingPipeline: {
          ...s.trainingPipeline,
          evaluation,
          exportPlan: formatTrainingPlan(s.trainingConfig, preprocess, train, evaluation),
        },
        lastLog: pushLog(
          s.lastLog,
          `Train eval: ${Math.round(evaluation.overall * 100)}% · ${evaluation.passed ? 'pass' : 'refine'}`,
        ),
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set((st) => ({ lastLog: pushLog(st.lastLog, `ERROR: ${msg}`) }))
    }
  },

  setTrainingHumanFeedback: (v) => set({ trainingHumanFeedback: v }),

  resetTrainingPipeline: () =>
    set((s) => ({
      trainingPipeline: createEmptyPipeline(s.trainingConfig),
      trainingHumanFeedback: null,
      lastLog: pushLog(s.lastLog, 'Train pipeline reset'),
    })),

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
        case 'vinyl':
          s.triggerAutoMix()
          break
        case 'song':
          get().generateSong()
          break
        case 'train':
          get().runTrainingPreprocess()
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
