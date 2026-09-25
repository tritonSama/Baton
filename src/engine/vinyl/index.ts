/**
 * Vinyl — Dual YouTube DJ Engine
 * Supports dual decks, YouTube video loading/parsing, auto-mixing into the next song before end,
 * headphone preview monitoring, pitch/tempo control, 3-band EQ, hot cues, and vinyl scratch/brake FX.
 */

export interface YouTubeTrack {
  id: string
  title: string
  artist: string
  durationSec: number
  thumbnailUrl: string
  bpm: number
  key: string
  url: string
}

export interface HotCue {
  id: number // 1, 2, 3, 4
  timeSec: number
  label: string
}

export interface DeckEQ {
  highDb: number // -12 to +12
  midDb: number // -12 to +12
  lowDb: number // -12 to +12
}

export interface DeckLoop {
  active: boolean
  startSec: number
  lengthBeats: number // e.g. 1, 2, 4, 8, 16
}

export type FXType = 'none' | 'scratch' | 'brake' | 'filter' | 'echo'

export interface DJDeckState {
  id: 'A' | 'B'
  track: YouTubeTrack | null
  isPlaying: boolean
  currentTimeSec: number
  durationSec: number
  volume: number // 0 to 1
  pitchPercent: number // -16 to +16 %
  actualBpm: number
  eq: DeckEQ
  headphoneCue: boolean // Pre-fade listen preview toggle
  hotCues: HotCue[]
  loop: DeckLoop
  activeFx: FXType
  vinylRotationDeg: number
  filterCutoffHz: number // 20 to 20000
}

export interface AutoMixerConfig {
  enabled: boolean
  triggerBeforeEndSec: number // e.g., transition 16 seconds before current song finishes
  transitionDurationSec: number // duration of crossfade transition in seconds
  curve: 'linear' | 'smooth' | 'cut'
  inTransition: boolean
  progress: number // 0 to 1
  targetDeck: 'A' | 'B' | null
}

export interface VinylDJState {
  deckA: DJDeckState
  deckB: DJDeckState
  crossfader: number // -1 (Deck A) to +1 (Deck B), 0 is middle
  masterVolume: number // 0 to 1
  headphoneVolume: number // 0 to 1
  headphoneMix: number // -1 (Deck A) to +1 (Deck B) or 0 (Cue Mix)
  autoMixer: AutoMixerConfig
  queue: YouTubeTrack[]
  history: YouTubeTrack[]
}

/** Extract YouTube Video ID from various YouTube URL formats or ID string */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Direct video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  // standard url formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = trimmed.match(regExp)

  return match && match[2] && match[2].length === 11 ? match[2] : null
}

/** Create a standard YouTubeTrack object from input metadata */
export function createYouTubeTrack(params: {
  idOrUrl: string
  title?: string
  artist?: string
  durationSec?: number
  bpm?: number
  key?: string
}): YouTubeTrack {
  const ytId = extractYouTubeId(params.idOrUrl) || 'dQw4w9WgXcQ'
  return {
    id: ytId,
    title: params.title || `YouTube Track (${ytId})`,
    artist: params.artist || 'YouTube Creator',
    durationSec: params.durationSec && params.durationSec > 0 ? params.durationSec : 210,
    thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    bpm: params.bpm || 124,
    key: params.key || 'C min',
    url: `https://www.youtube.com/watch?v=${ytId}`,
  }
}

/** Sample curated YouTube tracks for instant DJ testing */
export const DEMO_YOUTUBE_TRACKS: YouTubeTrack[] = [
  createYouTubeTrack({
    idOrUrl: 'fJ9rUzIMcZQ',
    title: 'Club House Banger (128 BPM)',
    artist: 'DJ Beats',
    durationSec: 180,
    bpm: 128,
    key: 'A min',
  }),
  createYouTubeTrack({
    idOrUrl: '3tmd-ClpJxA',
    title: 'Deep Synthwave Groove',
    artist: 'Retro FX',
    durationSec: 210,
    bpm: 120,
    key: 'F min',
  }),
  createYouTubeTrack({
    idOrUrl: 'L_LUpnjgPso',
    title: 'Electro Funk Vibes',
    artist: 'Vinyl Master',
    durationSec: 195,
    bpm: 124,
    key: 'G maj',
  }),
  createYouTubeTrack({
    idOrUrl: '5qap5aO4i9A',
    title: 'Lo-Fi Chill Hop Beat',
    artist: 'Sub Groove',
    durationSec: 160,
    bpm: 90,
    key: 'C maj',
  }),
]

/** Create initial default deck state */
export function createDefaultDeck(id: 'A' | 'B'): DJDeckState {
  return {
    id,
    track: null,
    isPlaying: false,
    currentTimeSec: 0,
    durationSec: 0,
    volume: 1.0,
    pitchPercent: 0,
    actualBpm: 120,
    eq: { highDb: 0, midDb: 0, lowDb: 0 },
    headphoneCue: id === 'A', // Deck A default cued
    hotCues: [
      { id: 1, timeSec: 0, label: 'Intro' },
      { id: 2, timeSec: 16, label: 'Drop 1' },
      { id: 3, timeSec: 64, label: 'Break' },
      { id: 4, timeSec: 96, label: 'Drop 2' },
    ],
    loop: { active: false, startSec: 0, lengthBeats: 4 },
    activeFx: 'none',
    vinylRotationDeg: 0,
    filterCutoffHz: 20000,
  }
}

/** Calculate effective BPM given track base BPM and pitch adjustment */
export function calculateEffectiveBpm(baseBpm: number, pitchPercent: number): number {
  const effective = baseBpm * (1 + pitchPercent / 100)
  return Math.round(effective * 10) / 10
}

/** Calculates crossfader gain levels for Deck A and Deck B (-1 to +1) */
export function calculateCrossfaderGains(
  crossfader: number,
  curve: 'linear' | 'smooth' | 'cut' = 'smooth'
): { gainA: number; gainB: number } {
  // Normalize crossfader from [-1, 1] to [0, 1] (0 = full A, 1 = full B)
  const x = Math.max(0, Math.min(1, (crossfader + 1) / 2))

  if (curve === 'linear') {
    return {
      gainA: 1 - x,
      gainB: x,
    }
  }

  if (curve === 'cut') {
    return {
      gainA: x > 0.9 ? 0 : 1,
      gainB: x < 0.1 ? 0 : 1,
    }
  }

  // Smooth equal power curve (cos / sin)
  const gainA = Math.cos((x * Math.PI) / 2)
  const gainB = Math.sin((x * Math.PI) / 2)

  return {
    gainA: Math.round(gainA * 1000) / 1000,
    gainB: Math.round(gainB * 1000) / 1000,
  }
}

/**
 * Check and calculate auto-mix transition state.
 * Triggers transition when playing deck is within `triggerBeforeEndSec` from song end.
 */
export function calculateAutoMixTransition(
  activeDeck: DJDeckState,
  autoMixer: AutoMixerConfig,
  currentCrossfader: number
): {
  shouldStartTransition: boolean
  nextCrossfader: number
  newProgress: number
  isComplete: boolean
} {
  if (!autoMixer.enabled || !activeDeck.track || !activeDeck.isPlaying) {
    return {
      shouldStartTransition: false,
      nextCrossfader: currentCrossfader,
      newProgress: autoMixer.progress,
      isComplete: false,
    }
  }

  const remainingSec = activeDeck.durationSec - activeDeck.currentTimeSec

  // Determine if auto mix transition should trigger
  const triggerWindow = Math.max(2, autoMixer.triggerBeforeEndSec)
  const inWindow = remainingSec <= triggerWindow && remainingSec > 0

  if (!autoMixer.inTransition) {
    if (inWindow) {
      return {
        shouldStartTransition: true,
        nextCrossfader: currentCrossfader,
        newProgress: 0,
        isComplete: false,
      }
    }
    return {
      shouldStartTransition: false,
      nextCrossfader: currentCrossfader,
      newProgress: 0,
      isComplete: false,
    }
  }

  // Currently in transition
  const stepProgress = 0.05 // per update frame tick
  const updatedProgress = Math.min(1, autoMixer.progress + stepProgress)

  // Move crossfader from active deck to target deck
  const startVal = activeDeck.id === 'A' ? -1 : 1
  const endVal = activeDeck.id === 'A' ? 1 : -1
  const nextCrossfader = startVal + (endVal - startVal) * updatedProgress

  const isComplete = updatedProgress >= 1

  return {
    shouldStartTransition: false,
    nextCrossfader: Math.round(nextCrossfader * 100) / 100,
    newProgress: Math.round(updatedProgress * 100) / 100,
    isComplete,
  }
}

/** Calculate headphone cue monitoring mix */
export function getHeadphoneCueState(
  deckA: DJDeckState,
  deckB: DJDeckState,
  headphoneMix: number
): {
  listeningToA: boolean
  listeningToB: boolean
  cueSummary: string
} {
  const listeningToA = deckA.headphoneCue || headphoneMix <= 0
  const listeningToB = deckB.headphoneCue || headphoneMix >= 0

  const labels: string[] = []
  if (deckA.headphoneCue) labels.push('Deck A')
  if (deckB.headphoneCue) labels.push('Deck B')

  const cueSummary = labels.length > 0 ? `Cue: ${labels.join(' + ')}` : 'Cue: None'

  return {
    listeningToA,
    listeningToB,
    cueSummary,
  }
}
