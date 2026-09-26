import { describe, expect, it } from 'vitest'
import {
  extractYouTubeId,
  createYouTubeTrack,
  calculateEffectiveBpm,
  calculateCrossfaderGains,
  calculateAutoMixTransition,
  getHeadphoneCueState,
  createDefaultDeck,
  DEMO_YOUTUBE_TRACKS,
} from './index'

describe('Vinyl DJ engine — YouTube URL parsing', () => {
  it('extracts YouTube ID from standard watch URL', () => {
    const id = extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(id).toBe('dQw4w9WgXcQ')
  })

  it('extracts YouTube ID from shortened youtu.be URL', () => {
    const id = extractYouTubeId('https://youtu.be/fJ9rUzIMcZQ?t=10')
    expect(id).toBe('fJ9rUzIMcZQ')
  })

  it('handles direct video ID string', () => {
    const id = extractYouTubeId('3tmd-ClpJxA')
    expect(id).toBe('3tmd-ClpJxA')
  })

  it('creates track with fallback for missing metadata', () => {
    const track = createYouTubeTrack({ idOrUrl: '5qap5aO4i9A' })
    expect(track.id).toBe('5qap5aO4i9A')
    expect(track.url).toBe('https://www.youtube.com/watch?v=5qap5aO4i9A')
    expect(track.bpm).toBe(124)
  })
})

describe('Vinyl DJ engine — Deck & Controls', () => {
  it('creates default Deck A and Deck B states', () => {
    const deckA = createDefaultDeck('A')
    const deckB = createDefaultDeck('B')

    expect(deckA.id).toBe('A')
    expect(deckA.headphoneCue).toBe(true)
    expect(deckB.id).toBe('B')
    expect(deckB.volume).toBe(1.0)
    expect(deckA.hotCues.length).toBe(4)
  })

  it('calculates effective BPM with pitch slider', () => {
    expect(calculateEffectiveBpm(120, 0)).toBe(120)
    expect(calculateEffectiveBpm(120, 5)).toBe(126)
    expect(calculateEffectiveBpm(128, -5)).toBe(121.6)
  })

  it('calculates smooth crossfader gains', () => {
    const center = calculateCrossfaderGains(0, 'smooth')
    expect(center.gainA).toBeGreaterThan(0.7)
    expect(center.gainB).toBeGreaterThan(0.7)

    const fullA = calculateCrossfaderGains(-1, 'smooth')
    expect(fullA.gainA).toBe(1)
    expect(fullA.gainB).toBe(0)

    const fullB = calculateCrossfaderGains(1, 'smooth')
    expect(fullB.gainA).toBe(0)
    expect(fullB.gainB).toBe(1)
  })
})

describe('Vinyl DJ engine — Auto-Mixer & Headphone Cue', () => {
  it('triggers auto-mix transition before current song finishes', () => {
    const deckA = createDefaultDeck('A')
    deckA.track = DEMO_YOUTUBE_TRACKS[0]!
    deckA.isPlaying = true
    deckA.durationSec = 180
    deckA.currentTimeSec = 170 // 10s before end

    const autoMixerConfig = {
      enabled: true,
      triggerBeforeEndSec: 16,
      transitionDurationSec: 10,
      curve: 'smooth' as const,
      inTransition: false,
      progress: 0,
      targetDeck: 'B' as const,
    }

    const result = calculateAutoMixTransition(deckA, autoMixerConfig, -1)
    expect(result.shouldStartTransition).toBe(true)
  })

  it('advances crossfader during auto-mix transition', () => {
    const deckA = createDefaultDeck('A')
    deckA.track = DEMO_YOUTUBE_TRACKS[0]!
    deckA.isPlaying = true
    deckA.durationSec = 180
    deckA.currentTimeSec = 175

    const autoMixerConfig = {
      enabled: true,
      triggerBeforeEndSec: 16,
      transitionDurationSec: 10,
      curve: 'smooth' as const,
      inTransition: true,
      progress: 0.5,
      targetDeck: 'B' as const,
    }

    const result = calculateAutoMixTransition(deckA, autoMixerConfig, 0)
    expect(result.newProgress).toBe(0.55)
    expect(result.nextCrossfader).toBe(0.1)
  })

  it('previews song via headphone cue state', () => {
    const deckA = createDefaultDeck('A')
    const deckB = createDefaultDeck('B')

    deckA.headphoneCue = false
    deckB.headphoneCue = true

    const cueState = getHeadphoneCueState(deckA, deckB, 0)
    expect(cueState.listeningToB).toBe(true)
    expect(cueState.cueSummary).toContain('Deck B')
  })
})
