/**
 * Song Creator — local composition engine (no GPU required).
 *
 * Generates chord progressions, lyric scaffolds, melodies, and full song forms.
 * Optional LLM polish is layered on top from the AI Assistant connection.
 *
 * If this stops working, check:
 *  - invalid key/scale
 *  - empty title / missing sections
 *  - BPM outside 40–220
 *  - seed causing identical output when you expect variety (change seed)
 */

import { BatonEngineError } from '../audio/buffer'
import {
  NOTE_NAMES,
  noteNameToMidi,
  type NoteName,
  type ScaleType,
} from '../music/scales'
import type { MidiNote } from '../voice'

export type SongGenre =
  | 'Pop'
  | 'Hip-Hop'
  | 'R&B'
  | 'Rock'
  | 'EDM'
  | 'Folk'
  | 'Jazz'
  | 'Ballad'

export type ProgressionStyle =
  | 'Classic'
  | 'Emotional'
  | 'Dark'
  | 'Uplifting'
  | 'Loop'
  | 'Jazz Cadence'

export type SongSectionKind =
  | 'Intro'
  | 'Verse'
  | 'Pre-Chorus'
  | 'Chorus'
  | 'Bridge'
  | 'Outro'

export type SongChord = {
  symbol: string
  root: NoteName
  quality: 'maj' | 'min' | 'dom7' | 'maj7' | 'min7' | 'sus4' | 'dim'
  degree: number
  bars: number
  startBar: number
}

export type LyricBlock = {
  section: SongSectionKind
  lines: string[]
}

export type MelodyPhrase = {
  section: SongSectionKind
  notes: MidiNote[]
}

export type SongBrief = {
  title: string
  genre: SongGenre
  key: NoteName
  scale: Extract<ScaleType, 'Major' | 'Minor'>
  bpm: number
  progressionStyle: ProgressionStyle
  mood: string
  theme: string
  seed: number
}

export type GeneratedSong = {
  brief: SongBrief
  sections: SongSectionKind[]
  chords: SongChord[]
  lyrics: LyricBlock[]
  melody: MelodyPhrase[]
  /** Flat MIDI melody for Voice / export */
  midiNotes: MidiNote[]
  formSummary: string
  method: string[]
  warnings: string[]
}

export const DEFAULT_SONG_BRIEF: SongBrief = {
  title: 'Untitled Song',
  genre: 'Pop',
  key: 'C',
  scale: 'Major',
  bpm: 100,
  progressionStyle: 'Classic',
  mood: 'hopeful',
  theme: 'starting over',
  seed: 1,
}

const ENGINE = 'SongCreator'

/** Degree patterns relative to tonic (1-based roman numerals mapped to scale degrees). */
const PROGRESSION_TEMPLATES: Record<
  ProgressionStyle,
  { major: number[]; minor: number[] }
> = {
  Classic: { major: [1, 5, 6, 4], minor: [1, 6, 3, 7] },
  Emotional: { major: [6, 4, 1, 5], minor: [1, 3, 7, 4] },
  Dark: { major: [1, 7, 4, 6], minor: [1, 7, 6, 5] },
  Uplifting: { major: [1, 4, 5, 1], minor: [1, 4, 5, 1] },
  Loop: { major: [1, 5, 2, 4], minor: [1, 5, 6, 4] },
  'Jazz Cadence': { major: [2, 5, 1, 6], minor: [2, 5, 1, 6] },
}

const SECTION_FORMS: Record<SongGenre, SongSectionKind[]> = {
  Pop: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  'Hip-Hop': ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  'R&B': ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  Rock: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  EDM: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  Folk: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  Jazz: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  Ballad: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
}

const LYRIC_BANK: Record<
  SongSectionKind,
  { openings: string[]; images: string[]; closers: string[] }
> = {
  Intro: {
    openings: ['Quiet now', 'Before the light', 'Hold this breath', 'Soft ignition'],
    images: ['empty room', 'city glow', 'open road', 'morning static'],
    closers: ['we begin', 'listen close', 'count to one', 'fade in'],
  },
  Verse: {
    openings: ['I keep walking', 'You said maybe', 'Through the static', 'Late again'],
    images: ['broken glass', 'neon rain', 'old photographs', 'crowded silence'],
    closers: ['still I try', 'tell me why', 'watch it fall', 'call my name'],
  },
  'Pre-Chorus': {
    openings: ['Feel it rising', 'Almost there', 'Don\'t look down', 'Heartbeat louder'],
    images: ['edge of night', 'wire and fire', 'halfway home', 'trembling sky'],
    closers: ['here we go', 'hold on tight', 'let it break', 'take the leap'],
  },
  Chorus: {
    openings: ['We can start again', 'Sing it louder', 'This is our signal', 'Burn the blueprint'],
    images: ['golden hour', 'open sky', 'second chance', 'wildfire heart'],
    closers: ['we won\'t fade', 'stay with me', 'write it loud', 'never alone'],
  },
  Bridge: {
    openings: ['If we change the key', 'Strip it back', 'Truth in the quiet', 'Turn around'],
    images: ['mirror cracks', 'paper wings', 'last refrain', 'hidden door'],
    closers: ['find the way', 'let it go', 'meet me there', 'choose again'],
  },
  Outro: {
    openings: ['Soft landing', 'Lights go down', 'Carry this', 'One more line'],
    images: ['fading chord', 'open window', 'quiet street', 'echo left'],
    closers: ['goodnight', 'hold the tone', 'we remain', 'end on hope'],
  },
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]!
}

function validateBrief(brief: SongBrief): void {
  if (!brief.title.trim()) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', 'Song title cannot be empty.')
  }
  if (brief.bpm < 40 || brief.bpm > 220) {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `BPM must be 40–220 (got ${brief.bpm}).`,
    )
  }
  if (!NOTE_NAMES.includes(brief.key)) {
    throw new BatonEngineError(ENGINE, 'INVALID_PARAM', `Unknown key "${brief.key}".`)
  }
  if (brief.scale !== 'Major' && brief.scale !== 'Minor') {
    throw new BatonEngineError(
      ENGINE,
      'INVALID_PARAM',
      `Song scale must be Major or Minor (got ${brief.scale}).`,
    )
  }
}

function degreeToChord(
  key: NoteName,
  scale: 'Major' | 'Minor',
  degree: number,
  jazz = false,
): Omit<SongChord, 'bars' | 'startBar'> {
  const rootIdx = NOTE_NAMES.indexOf(key)
  // Diatonic pitch-class offsets for major / natural minor
  const intervals =
    scale === 'Major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  const qualities: Array<SongChord['quality']> =
    scale === 'Major'
      ? jazz
        ? ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'dim']
        : ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']
      : jazz
        ? ['min7', 'dim', 'maj7', 'min7', 'min7', 'maj7', 'dom7']
        : ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj']

  const d = ((degree - 1) % 7 + 7) % 7
  const pc = (rootIdx + intervals[d]!) % 12
  const root = NOTE_NAMES[pc]!
  const quality = qualities[d]!
  const suffix =
    quality === 'maj'
      ? ''
      : quality === 'min'
        ? 'm'
        : quality === 'dom7'
          ? '7'
          : quality === 'maj7'
            ? 'maj7'
            : quality === 'min7'
              ? 'm7'
              : quality === 'sus4'
                ? 'sus4'
                : 'dim'
  return {
    symbol: `${root}${suffix}`,
    root,
    quality,
    degree: d + 1,
  }
}

export function generateChordProgression(
  brief: Pick<SongBrief, 'key' | 'scale' | 'progressionStyle' | 'seed'>,
  barsPerChord = 1,
  repeats = 1,
): SongChord[] {
  const template = PROGRESSION_TEMPLATES[brief.progressionStyle]
  const degrees = brief.scale === 'Major' ? template.major : template.minor
  const jazz = brief.progressionStyle === 'Jazz Cadence'
  const chords: SongChord[] = []
  let bar = 0
  for (let r = 0; r < repeats; r++) {
    for (const degree of degrees) {
      const base = degreeToChord(brief.key, brief.scale, degree, jazz)
      chords.push({ ...base, bars: barsPerChord, startBar: bar })
      bar += barsPerChord
    }
  }
  return chords
}

function lineFor(
  rng: () => number,
  section: SongSectionKind,
  mood: string,
  theme: string,
): string {
  const bank = LYRIC_BANK[section]
  const a = pick(rng, bank.openings)
  const b = pick(rng, bank.images)
  const c = pick(rng, bank.closers)
  if (section === 'Chorus') {
    return `${a} — ${theme} in the ${b}, ${c}`
  }
  if (section === 'Verse') {
    return `${a} through the ${b}, feeling ${mood}, ${c}`
  }
  return `${a} / ${b} / ${c}`
}

export function generateLyrics(
  brief: SongBrief,
  sections: SongSectionKind[],
): LyricBlock[] {
  const rng = mulberry32(brief.seed + 17)
  const used = new Set<string>()
  const blocks: LyricBlock[] = []

  for (const section of sections) {
    const lines: string[] = []
    const count = section === 'Chorus' ? 4 : section === 'Bridge' ? 4 : 2
    for (let i = 0; i < count; i++) {
      let line = lineFor(rng, section, brief.mood, brief.theme)
      let guard = 0
      while (used.has(line) && guard < 8) {
        line = lineFor(rng, section, brief.mood, brief.theme)
        guard++
      }
      used.add(line)
      lines.push(line)
    }
    blocks.push({ section, lines })
  }
  return blocks
}

function chordTonesMidi(chord: SongChord, octave = 4): number[] {
  const root = noteNameToMidi(chord.root, octave)
  switch (chord.quality) {
    case 'min':
    case 'min7':
      return [root, root + 3, root + 7, ...(chord.quality === 'min7' ? [root + 10] : [])]
    case 'maj7':
      return [root, root + 4, root + 7, root + 11]
    case 'dom7':
      return [root, root + 4, root + 7, root + 10]
    case 'sus4':
      return [root, root + 5, root + 7]
    case 'dim':
      return [root, root + 3, root + 6]
    default:
      return [root, root + 4, root + 7]
  }
}

export function generateMelodyFromChords(
  brief: SongBrief,
  chords: SongChord[],
  section: SongSectionKind,
  startSec: number,
): { notes: MidiNote[]; endSec: number } {
  const rng = mulberry32(brief.seed + section.length * 31 + Math.floor(startSec * 10))
  const beat = 60 / brief.bpm
  const notes: MidiNote[] = []
  let t = startSec

  for (const chord of chords) {
    const tones = chordTonesMidi(chord, section === 'Chorus' ? 5 : 4)
    const eventsInChord = Math.max(2, chord.bars * 2)
    for (let i = 0; i < eventsInChord; i++) {
      const tone = tones[Math.floor(rng() * tones.length)]!
      // Occasional passing tone ±2 semitones snapped toward chord tones
      const pass = rng() > 0.7 ? (rng() > 0.5 ? 2 : -2) : 0
      const midi = tone + pass
      const dur = beat * (rng() > 0.6 ? 1 : 0.5)
      notes.push({
        midi,
        velocity: section === 'Chorus' ? 0.9 : 0.75,
        startSec: Number(t.toFixed(3)),
        durationSec: Number(dur.toFixed(3)),
      })
      t += dur
    }
  }
  return { notes, endSec: t }
}

export function createSong(partial: Partial<SongBrief> = {}): GeneratedSong {
  const brief: SongBrief = { ...DEFAULT_SONG_BRIEF, ...partial }
  validateBrief(brief)

  const warnings: string[] = []
  const sections = SECTION_FORMS[brief.genre]
  const loop = generateChordProgression(brief, 1, 1)

  // Build a continuous chord timeline + melody across sections
  const chords: SongChord[] = []
  const melody: MelodyPhrase[] = []
  const midiNotes: MidiNote[] = []
  let bar = 0
  let timeSec = 0
  const beatsPerBar = 4
  const barSec = (60 / brief.bpm) * beatsPerBar

  for (const section of sections) {
    const barsForSection =
      section === 'Intro' || section === 'Outro'
        ? 4
        : section === 'Chorus'
          ? 8
          : section === 'Bridge'
            ? 8
            : 8

    const sectionChords: SongChord[] = []
    let filled = 0
    while (filled < barsForSection) {
      for (const c of loop) {
        if (filled >= barsForSection) break
        const event: SongChord = {
          ...c,
          startBar: bar,
          bars: 1,
        }
        sectionChords.push(event)
        chords.push(event)
        bar += 1
        filled += 1
      }
    }

    const phrase = generateMelodyFromChords(brief, sectionChords, section, timeSec)
    melody.push({ section, notes: phrase.notes })
    midiNotes.push(...phrase.notes)
    timeSec = Math.max(phrase.endSec, timeSec + barsForSection * barSec)
  }

  const lyrics = generateLyrics(brief, sections)

  if (brief.theme.trim().length < 2) {
    warnings.push('Theme is very short — lyric hooks may feel generic. Add a clearer theme.')
  }

  const method = [
    '1. Set title, genre, key, BPM, mood, and theme.',
    '2. Choose a progression style (Classic, Emotional, Dark, etc.).',
    '3. Generate Song — builds form, chords, lyrics, and melody locally (no GPU).',
    '4. Review each section; regenerate with a new seed for variations.',
    '5. Optional: open AI Assistant and ask it to rewrite lyrics or suggest alternate progressions.',
    '6. Send melody to Voice to hear a sung preview, then Autotune / Master to polish.',
  ]

  return {
    brief,
    sections,
    chords,
    lyrics,
    melody,
    midiNotes,
    formSummary: sections.join(' → '),
    method,
    warnings,
  }
}

/** Export a simple readable lead sheet for copy/paste. */
export function formatSongLeadSheet(song: GeneratedSong): string {
  const lines: string[] = [
    `# ${song.brief.title}`,
    `Key: ${song.brief.key} ${song.brief.scale} · ${song.brief.bpm} BPM · ${song.brief.genre}`,
    `Mood: ${song.brief.mood} · Theme: ${song.brief.theme}`,
    `Form: ${song.formSummary}`,
    '',
    '## Chord progression (loop)',
    generateChordProgression(song.brief)
      .map((c) => c.symbol)
      .join(' – '),
    '',
  ]

  const loopSymbols = generateChordProgression(song.brief)
    .map((c) => c.symbol)
    .join(' | ')

  for (const block of song.lyrics) {
    lines.push(`## ${block.section}`)
    lines.push(`[${loopSymbols}]`)
    for (const line of block.lines) lines.push(line)
    lines.push('')
  }

  lines.push('## Method')
  for (const step of song.method) lines.push(step)
  return lines.join('\n')
}

export function listProgressionStyles(): ProgressionStyle[] {
  return Object.keys(PROGRESSION_TEMPLATES) as ProgressionStyle[]
}

export function listSongGenres(): SongGenre[] {
  return Object.keys(SECTION_FORMS) as SongGenre[]
}
