/**
 * Prompt builders for optional LLM polish of Song Creator output.
 * Works with any connected OpenAI-compatible / Ollama / LM Studio endpoint.
 */

import type { GeneratedSong, SongBrief } from '@/engine'

export function buildLyricRewritePrompt(song: GeneratedSong): string {
  const lyricText = song.lyrics
    .map((b) => `### ${b.section}\n${b.lines.join('\n')}`)
    .join('\n\n')
  return [
    `Rewrite these song lyrics for "${song.brief.title}".`,
    `Genre: ${song.brief.genre}. Key: ${song.brief.key} ${song.brief.scale}. BPM: ${song.brief.bpm}.`,
    `Mood: ${song.brief.mood}. Theme: ${song.brief.theme}.`,
    'Keep the same section names and similar line counts.',
    'Make lines singable, concrete, and emotionally clear. No explanations — lyrics only.',
    '',
    lyricText,
  ].join('\n')
}

export function buildProgressionPrompt(brief: SongBrief): string {
  return [
    `Suggest 3 alternate chord progressions for a ${brief.genre} song in ${brief.key} ${brief.scale}.`,
    `Mood: ${brief.mood}. Theme: ${brief.theme}. Style preference: ${brief.progressionStyle}.`,
    'For each option give: name, roman numerals, and chord symbols in the key.',
    'Keep each progression to 4–8 chords. Be concise.',
  ].join('\n')
}

export function buildCompleteSongPrompt(brief: SongBrief): string {
  return [
    `Help finish a song called "${brief.title}".`,
    `Genre ${brief.genre}, ${brief.key} ${brief.scale}, ${brief.bpm} BPM, mood "${brief.mood}", theme "${brief.theme}".`,
    'Provide:',
    '1) A 4-chord loop with chord symbols',
    '2) Verse lyrics (4 lines)',
    '3) Chorus lyrics (4 lines)',
    '4) A short melody description (scale degrees over the loop)',
    'Keep it ready to paste into a DAW. No preamble.',
  ].join('\n')
}
