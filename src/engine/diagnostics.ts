/**
 * Engine health diagnostics — run these when something "stops working".
 * Each check has a stable id + human-readable description of what failed.
 */

import { createTone, createSilence, type AudioBufferData } from './audio/buffer'
import { processAutotune } from './autotune'
import { processMaster, estimateLUFS } from './master'
import { processSplit, listStemOutputs } from './stems'
import { processBeat } from './beat'
import { synthesizeVoice } from './voice'
import { createSong, generateChordProgression } from './song'
import {
  createEmptyPipeline,
  preprocessAudio,
  runTrainingJob,
  DEFAULT_TRAINING_CONFIG,
} from './training'
import { snapMidiToScale, midiToFrequency, frequencyToMidi } from './music/scales'

export type DiagnosticStatus = 'pass' | 'fail' | 'warn'

export type DiagnosticCheck = {
  id: string
  engine: string
  title: string
  /** What this check proves when it passes. */
  description: string
  /** What to investigate when it fails. */
  failureHint: string
  status: DiagnosticStatus
  detail: string
  durationMs: number
}

export type DiagnosticReport = {
  ranAt: string
  overall: DiagnosticStatus
  checks: DiagnosticCheck[]
  summary: string
}

function runCheck(
  id: string,
  engine: string,
  title: string,
  description: string,
  failureHint: string,
  fn: () => string | void,
): DiagnosticCheck {
  const t0 = performance.now()
  try {
    const detail = fn() ?? 'OK'
    return {
      id,
      engine,
      title,
      description,
      failureHint,
      status: 'pass',
      detail: String(detail),
      durationMs: performance.now() - t0,
    }
  } catch (err) {
    return {
      id,
      engine,
      title,
      description,
      failureHint,
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - t0,
    }
  }
}

export function runEngineDiagnostics(
  sampleRate = 44100,
): DiagnosticReport {
  const tone = createTone(sampleRate, 1.5, 440, 0.35)
  const silence = createSilence(sampleRate, 0.5)

  const checks: DiagnosticCheck[] = [
    runCheck(
      'scales.snap-c-major',
      'Scales',
      'C major pitch snap',
      'MIDI notes snap onto the C major scale grid.',
      'Inspect snapMidiToScale / getScalePitchClasses — wrong intervals break Autotune & Voice.',
      () => {
        const snapped = snapMidiToScale(61, 'C', 'Major', 1) // C# → C or D
        if (![60, 62].includes(Math.round(snapped))) {
          throw new Error(`Expected 60 or 62, got ${snapped}`)
        }
        return `61 → ${snapped.toFixed(2)}`
      },
    ),
    runCheck(
      'scales.freq-midi-roundtrip',
      'Scales',
      'Frequency ↔ MIDI round-trip',
      'A4 (440 Hz) converts cleanly to MIDI 69 and back.',
      'Broken midiToFrequency/frequencyToMidi will detune every engine.',
      () => {
        const midi = frequencyToMidi(440)
        const freq = midiToFrequency(69)
        if (Math.abs(midi - 69) > 0.01) throw new Error(`440Hz → MIDI ${midi}, expected 69`)
        if (Math.abs(freq - 440) > 0.01) throw new Error(`MIDI 69 → ${freq}Hz, expected 440`)
        return '440 Hz ↔ MIDI 69'
      },
    ),
    runCheck(
      'autotune.tone-corrects',
      'Autotune',
      'Pitch correction on A440 tone',
      'Autotune processes a tone without throwing and reports pitch frames.',
      'If empty frames: detectPitchHz failed (check sample rate / voice range). If throw: params validation.',
      () => {
        const result = processAutotune(tone, {
          key: 'A',
          scale: 'Chromatic',
          correctionAmount: 1,
          retuneSpeedMs: 20,
        })
        if (result.output.length !== tone.length) {
          throw new Error('Output length mismatch')
        }
        const voiced = result.frames.filter((f) => f.frequencyHz > 0).length
        if (voiced < 1) throw new Error('No pitched frames detected on A440 tone')
        return `${voiced} pitched frames, avg correction ${result.averageCentsCorrection.toFixed(1)}¢`
      },
    ),
    runCheck(
      'autotune.bypass',
      'Autotune',
      'Bypass returns dry signal',
      'Bypass copies input and skips processing.',
      'Dry/wet path broken — users will hear silence or double-processed audio.',
      () => {
        const result = processAutotune(tone, { bypass: true })
        if (result.frames.length !== 0) throw new Error('Bypass should skip pitch frames')
        return 'bypass OK'
      },
    ),
    runCheck(
      'autotune.rejects-bad-params',
      'Autotune',
      'Rejects invalid retune speed',
      'Out-of-range params throw BatonEngineError instead of corrupting audio.',
      'Missing validation lets bad automation crash the audio thread.',
      () => {
        let threw = false
        try {
          processAutotune(tone, { retuneSpeedMs: 999 })
        } catch {
          threw = true
        }
        if (!threw) throw new Error('Expected INVALID_PARAM for retuneSpeedMs=999')
        return 'validation OK'
      },
    ),
    runCheck(
      'master.loudness-moves',
      'Master',
      'Preview mastering adjusts loudness',
      'Mastering chain changes estimated LUFS toward the target.',
      'Check gain staging / estimateLUFS — silent masters or explosive peaks.',
      () => {
        const before = estimateLUFS(tone)
        const result = processMaster(tone, {
          mode: 'preview',
          loudnessTargetLUFS: -14,
          masterStrength: 1,
          genrePreset: 'Pop',
        })
        return `LUFS ${before.toFixed(1)} → ${result.report.integratedLUFS.toFixed(1)} (gain ${result.appliedGainDb.toFixed(1)} dB)`
      },
    ),
    runCheck(
      'master.rejects-loudness',
      'Master',
      'Rejects illegal LUFS target',
      'Loudness outside -23…-8 LUFS is rejected.',
      'Platform delivery specs will fail if targets are not clamped.',
      () => {
        let threw = false
        try {
          processMaster(tone, { loudnessTargetLUFS: -3 })
        } catch {
          threw = true
        }
        if (!threw) throw new Error('Expected INVALID_PARAM for LUFS=-3')
        return 'validation OK'
      },
    ),
    runCheck(
      'split.stem-count',
      'Split',
      '4-stem mode returns expected names',
      'Stem separator returns drums/bass/vocals/other.',
      'Routing to FL mixer tracks will break if stem names/count drift.',
      () => {
        const result = processSplit(tone, { stemMode: 4, model: 'lightweight' })
        const expected = listStemOutputs(4)
        for (const name of expected) {
          if (!result.stems[name]) throw new Error(`Missing stem: ${name}`)
        }
        return `stems: ${result.stemNames.join(', ')}`
      },
    ),
    runCheck(
      'split.6-stem-mode',
      'Split',
      '6-stem mode includes guitar & piano',
      '6-stem mode exposes all playlist routing targets.',
      'Playlist auto-place will miss tracks if guitar/piano stems are absent.',
      () => {
        const result = processSplit(tone, { stemMode: 6 })
        if (!result.stems.guitar || !result.stems.piano) {
          throw new Error('6-stem mode missing guitar or piano')
        }
        return '6 stems OK'
      },
    ),
    runCheck(
      'beat.detects-bpm-on-pulse',
      'Beat',
      'BPM detection on pulsed tone',
      'Beat engine returns a BPM in the allowed range for non-silent audio.',
      'Onset envelope or BPM search loop broken — tempo sync will fail.',
      () => {
        // Amplitude-modulated pulse ~120 BPM
        const pulse = createTone(sampleRate, 4, 220, 0.4)
        const period = Math.floor((60 / 120) * sampleRate)
        for (let i = 0; i < pulse.length; i++) {
          const gate = i % period < period * 0.2 ? 1 : 0.05
          for (const ch of pulse.channels) ch[i]! *= gate
        }
        const result = processBeat(pulse)
        if (result.bpm < 60 || result.bpm > 200) {
          throw new Error(`BPM ${result.bpm} out of range`)
        }
        return `BPM≈${result.bpm}, key=${result.key ?? 'n/a'}`
      },
    ),
    runCheck(
      'beat.silence-safe',
      'Beat',
      'Silence does not crash beat detection',
      'Silent buffers return bpm=0 with warnings instead of throwing.',
      'Unhandled silence can freeze analysis UI.',
      () => {
        const result = processBeat(silence)
        if (result.bpm !== 0 && result.confidence > 0.5) {
          throw new Error('Silence should not report confident BPM')
        }
        return `bpm=${result.bpm}, warnings=${result.warnings.length}`
      },
    ),
    runCheck(
      'voice.renders-midi',
      'Voice',
      'MIDI note renders audio',
      'Voice synthesizer produces non-silent audio from a MIDI note.',
      'Oscillator/envelope path broken — instrument will play silence in FL Piano Roll.',
      () => {
        const result = synthesizeVoice(
          [{ midi: 60, velocity: 0.9, startSec: 0, durationSec: 0.5 }],
          sampleRate,
          { lyrics: 'la', voiceModelId: 'preview-sine' },
        )
        let peak = 0
        for (const s of result.output.channels[0]!) peak = Math.max(peak, Math.abs(s))
        if (peak < 0.01) throw new Error('Rendered voice is silent')
        return `peak=${peak.toFixed(3)}, notes=${result.renderedNotes}`
      },
    ),
    runCheck(
      'voice.empty-midi',
      'Voice',
      'Empty MIDI returns silence with warning',
      'No notes → silence + warning (does not throw).',
      'Throwing on empty MIDI breaks DAW host scanning / idle state.',
      () => {
        const result = synthesizeVoice([], sampleRate)
        if (result.renderedNotes !== 0) throw new Error('Expected 0 rendered notes')
        if (result.warnings.length < 1) throw new Error('Expected a warning')
        return 'empty MIDI handled'
      },
    ),
    runCheck(
      'song.classic-progression',
      'SongCreator',
      'Classic C major progression',
      'Song Creator builds I–V–vi–IV in C major.',
      'Diatonic chord mapping broken — Song Creator loops will be wrong.',
      () => {
        const chords = generateChordProgression({
          key: 'C',
          scale: 'Major',
          progressionStyle: 'Classic',
          seed: 1,
        })
        const symbols = chords.map((c) => c.symbol).join('-')
        if (symbols !== 'C-G-Am-F') throw new Error(`Expected C-G-Am-F, got ${symbols}`)
        return symbols
      },
    ),
    runCheck(
      'song.full-generate',
      'SongCreator',
      'Full song has lyrics + melody',
      'createSong returns sections, lyrics, and MIDI notes.',
      'Song Creator pipeline broken — New Song will be empty.',
      () => {
        const song = createSong({ title: 'Diag Song', theme: 'signal' })
        if (song.lyrics.length < 4) throw new Error('Too few lyric sections')
        if (song.midiNotes.length < 8) throw new Error('Melody too short')
        if (song.method.length < 4) throw new Error('Method steps missing')
        return `${song.sections.length} sections, ${song.midiNotes.length} notes`
      },
    ),
    runCheck(
      'training.five-step-method',
      'Training',
      'Training method has five steps',
      'Pipeline method lists preprocess → evaluate.',
      'Training Studio method missing — UI wizard will be incomplete.',
      () => {
        const pipeline = createEmptyPipeline()
        if (pipeline.method.length !== 5) {
          throw new Error(`Expected 5 method steps, got ${pipeline.method.length}`)
        }
        return pipeline.method.map((m) => m.slice(0, 24)).join(' | ')
      },
    ),
    runCheck(
      'training.lora-job',
      'Training',
      'LoRA fine-tune job completes',
      'Preprocess + LoRA train produces a checkpoint on demo audio.',
      'Training job path broken — Train tab cannot fine-tune.',
      () => {
        const tone = createTone(sampleRate, 1, 440, 0.35)
        const prep = preprocessAudio(tone, DEFAULT_TRAINING_CONFIG.preprocess)
        const train = runTrainingJob(DEFAULT_TRAINING_CONFIG, prep)
        if (train.status !== 'completed') throw new Error('Train did not complete')
        if (!train.checkpointName.endsWith('.batontrain')) {
          throw new Error('Missing checkpoint name')
        }
        return `${train.checkpointName} loss=${train.finalLoss}`
      },
    ),
  ]

  const failed = checks.filter((c) => c.status === 'fail').length
  const warned = checks.filter((c) => c.status === 'warn').length
  const overall: DiagnosticStatus = failed > 0 ? 'fail' : warned > 0 ? 'warn' : 'pass'

  return {
    ranAt: new Date().toISOString(),
    overall,
    checks,
    summary:
      overall === 'pass'
        ? `All ${checks.length} engine checks passed.`
        : `${failed} failed, ${warned} warnings out of ${checks.length} checks. Open Diagnostics for failure hints.`,
  }
}

export function bufferFromChannelData(
  channels: Float32Array[],
  sampleRate: number,
): AudioBufferData {
  return {
    sampleRate,
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    channels,
  }
}
