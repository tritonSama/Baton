/**
 * Song Creator tests — names explain what broke if something stops working.
 */
import { describe, expect, it } from 'vitest'
import {
  createSong,
  formatSongLeadSheet,
  generateChordProgression,
  generateLyrics,
  listProgressionStyles,
  listSongGenres,
} from './index'

describe('Song Creator — chord progressions', () => {
  it('Classic major in C yields I–V–vi–IV symbols (fails = wrong diatonic mapping)', () => {
    const chords = generateChordProgression({
      key: 'C',
      scale: 'Major',
      progressionStyle: 'Classic',
      seed: 1,
    })
    expect(chords.map((c) => c.symbol)).toEqual(['C', 'G', 'Am', 'F'])
  })

  it('Emotional style returns four chords (fails = template missing)', () => {
    const chords = generateChordProgression({
      key: 'A',
      scale: 'Minor',
      progressionStyle: 'Emotional',
      seed: 2,
    })
    expect(chords).toHaveLength(4)
    expect(chords.every((c) => c.symbol.length > 0)).toBe(true)
  })

  it('lists all progression styles for the UI picker', () => {
    expect(listProgressionStyles()).toContain('Jazz Cadence')
    expect(listSongGenres()).toContain('Pop')
  })
})

describe('Song Creator — lyrics & full song', () => {
  it('creates lyrics for every section in the form (fails = empty lyric blocks)', () => {
    const song = createSong({ title: 'Signal Fire', genre: 'Pop', theme: 'second chances' })
    expect(song.lyrics.length).toBe(song.sections.length)
    expect(song.lyrics.every((b) => b.lines.length >= 2)).toBe(true)
  })

  it('builds a complete song with chords, melody MIDI, and method steps', () => {
    const song = createSong({
      title: 'Neon Rain',
      genre: 'R&B',
      key: 'D',
      scale: 'Minor',
      bpm: 88,
      progressionStyle: 'Dark',
      mood: 'late-night',
      theme: 'city loneliness',
      seed: 42,
    })
    expect(song.chords.length).toBeGreaterThan(8)
    expect(song.midiNotes.length).toBeGreaterThan(16)
    expect(song.method.length).toBeGreaterThanOrEqual(5)
    expect(song.formSummary).toContain('Chorus')
  })

  it('rejects empty titles and illegal BPM (fails = validation removed)', () => {
    expect(() => createSong({ title: '   ' })).toThrow(/title/i)
    expect(() => createSong({ title: 'Ok', bpm: 10 })).toThrow(/BPM/)
  })

  it('same seed is reproducible; different seed changes lyrics', () => {
    const a = generateLyrics(
      {
        title: 'A',
        genre: 'Pop',
        key: 'C',
        scale: 'Major',
        bpm: 100,
        progressionStyle: 'Classic',
        mood: 'hopeful',
        theme: 'home',
        seed: 7,
      },
      ['Verse', 'Chorus'],
    )
    const b = generateLyrics(
      {
        title: 'A',
        genre: 'Pop',
        key: 'C',
        scale: 'Major',
        bpm: 100,
        progressionStyle: 'Classic',
        mood: 'hopeful',
        theme: 'home',
        seed: 7,
      },
      ['Verse', 'Chorus'],
    )
    const c = generateLyrics(
      {
        title: 'A',
        genre: 'Pop',
        key: 'C',
        scale: 'Major',
        bpm: 100,
        progressionStyle: 'Classic',
        mood: 'hopeful',
        theme: 'home',
        seed: 99,
      },
      ['Verse', 'Chorus'],
    )
    expect(a).toEqual(b)
    expect(a[0]?.lines.join('|')).not.toEqual(c[0]?.lines.join('|'))
  })

  it('lead sheet export includes title, chords, and method', () => {
    const sheet = formatSongLeadSheet(createSong({ title: 'Paper Wings' }))
    expect(sheet).toContain('# Paper Wings')
    expect(sheet).toContain('## Method')
    expect(sheet).toMatch(/C|Am|F|G/)
  })
})
