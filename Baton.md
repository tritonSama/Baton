# Baton 🎵

> **AI-Powered Music Mastering, Vocal Recreation & Production Suite**
> 
> Standalone App · FL Studio Plugin (VST3/CLAP) · Real-Time Autotune · Stem Extraction · Voice Cloning

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [System Architecture](#system-architecture)
4. [Plugin Variants](#plugin-variants)
5. [Built-in Tools](#built-in-tools)
6. [AI Engines](#ai-engines)
7. [FL Studio Integration](#fl-studio-integration)
8. [External APIs & Services](#external-apis--services)
9. [Tech Stack](#tech-stack)
10. [Development Roadmap](#development-roadmap)
11. [Performance Targets](#performance-targets)
12. [Legal & Ethical Considerations](#legal--ethical-considerations)
13. [Workflow Examples](#workflow-examples)
14. [Appendix: Tool Directory](#appendix-tool-directory)

---

## Overview

**Baton** is an all-in-one AI music production suite that functions both as a standalone application and as a native plugin for FL Studio. Named after the conductor's tool that unifies an orchestra, Baton unifies AI-powered mastering, vocal synthesis, stem separation, pitch correction, and sample management into a single cohesive ecosystem.

### Key Philosophy
- **One engine, many faces** — Same C++ DSP core runs standalone, as a VST3 plugin, or as a CLAP plugin
- **Real-time first** — Every feature has a low-latency mode for live playback and tracking
- **Render-quality second** — Full GPU-accelerated processing for final export
- **DAW-native** — Deep integration with FL Studio's mixer, playlist, piano roll, and Edison

---

## Core Features

| Feature | Description | Modes |
|---------|-------------|-------|
| **AI Mastering** | Upload a finished mix, get broadcast-ready masters | Real-time preview + Full render |
| **Vocal Recreation** | Clone a voice from samples and generate new vocals from MIDI/lyrics | Real-time + Render |
| **Stem Separation** | Extract vocals, drums, bass, guitar, piano, other from any audio | Offline + Drag-drop |
| **Built-in Autotune** | Real-time pitch correction with scale/key detection | Real-time insert effect |
| **Sample Library** | Search, preview, and import samples from cloud libraries | Browser + Drag-drop |
| **Beat Detection** | Auto-detect BPM, key, and chord progression from audio | Real-time analysis |
| **Harmonic Analysis** | Identify chords, suggest scales, detect tuning issues | Real-time + Offline |
| **AI Arrangement** | Auto-generate backing tracks, fills, and transitions from stems | Render + Interactive |
| **Noise Reduction** | AI-powered spectral repair and noise removal | Real-time + Offline |
| **Transcription** | Convert audio to MIDI, guitar tab, or sheet music | Offline |
| **Collaboration** | Cloud project sync, version control, shared sessions | Cloud |
| **Reference Match** | "Master my track like [Song X]" — match spectral profile | Render |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐ │
│  │   STANDALONE APP    │    │   FL STUDIO PLUGIN  │    │   WEB DASHBOARD  │ │
│  │   (React/Electron)  │    │   (JUCE CLAP/VST3)  │    │   (Next.js)      │ │
│  │                     │    │                     │    │                  │ │
│  │ • Full project view │    │ • DAW-native UI     │    │ • Account mgmt   │ │
│  │ • Waveform editor   │    │ • Mixer integration │    │ • Cloud renders  │ │
│  │ • Timeline arrange  │    │ • Piano roll MIDI   │    │ • Team collab    │ │
│  │ • Video sync        │    │ • Edison drag-drop  │    │ • Analytics      │ │
│  └─────────────────────┘    └─────────────────────┘    └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SHARED ENGINE CORE (C++)                             │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │   AUDIO I/O │  │    DSP      │  │   AI INF.   │  │    PROJECT MGMT     ││
│  │   Engine    │  │   Pipeline  │  │   Runtime   │  │    & State          ││
│  │             │  │             │  │             │  │                     ││
│  │ • ASIO/WASAPI│  │ • Autotune  │  │ • ONNX      │  │ • Undo/redo        ││
│  │ • CoreAudio  │  │ • Mastering │  │ • CUDA      │  │ • Preset system    ││
│  │ • JACK       │  │ • Pitch     │  │ • TensorRT  │  │ • Project files    ││
│  │ • Multi-ch.  │  │ • Time-stretch│ │ • DirectML  │  │ • Session sync     ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   MASTERING  │          │    VOCAL     │          │   SAMPLE     │
│    ENGINE    │          │   SYNTHESIS  │          │  EXTRACTION  │
│              │          │              │          │              │
│ • U-Net      │          │ • RVC ONNX   │          │ • Demucs v4  │
│ • Match EQ   │          │ • SO-VITS    │          │ • UVR5       │
│ • Multiband  │          │ • ElevenLabs │          │ • Real-time  │
│ • LUFS meter │          │ • Synthesizer│          │   lightweight│
└──────────────┘          │   V bridge   │          └──────────────┘
                          └──────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORAGE & SERVICES                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  AWS S3     │  │ PostgreSQL  │  │   Redis     │  │    Weaviate         │ │
│  │  (audio)    │  │ (metadata)  │  │  (queue)    │  │  (vector search)    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Stripe     │  │  Auth0      │  │  Ray/Celery │  │  Prometheus/Grafana │ │
│  │  (payments) │  │  (auth)     │  │  (workers)  │  │  (monitoring)       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plugin Variants

Baton ships as multiple plugin types, each optimized for a specific workflow inside FL Studio:

### 1. Baton Autotune (CLAP/VST3 Effect)
| Property | Value |
|----------|-------|
| **Type** | Mixer insert effect |
| **Latency** | < 10ms |
| **Inputs** | 2 (stereo) |
| **Outputs** | 2 (stereo) |
| **Sidechain** | Optional MIDI input for pitch target |
| **Automation** | All parameters |

**Parameters:**
- `Retune Speed` (0–100ms) — T-Pain effect at 0, natural at 50+
- `Correction Amount` (0–100%) — Subtle vs. hard correction
- `Key` (C–B) — Musical key, with auto-detect
- `Scale` (Major/Minor/Dorian/Phrygian/Lydian/Mixolydian/Chromatic/Custom)
- `Formant Shift` (-12 to +12 semitones) — Gender/voice character
- `Formant Preserve` (On/Off) — Prevent chipmunk effect
- `Humanize` (0–100%) — Natural timing variation
- `Vibrato Depth` (0–100%) — Synthetic vibrato amount
- `Vibrato Rate` (3–10 Hz) — Vibrato speed
- `Input Type` (Soprano/Alto/Tenor/Baritone/Bass/Instrument)
- `Bypass` — Dry signal pass-through

### 2. Baton Master (CLAP/VST3 Effect)
| Property | Value |
|----------|-------|
| **Type** | Master bus effect |
| **Latency** | < 30ms (preview), N/A (render) |
| **Inputs** | 2 (stereo) |
| **Outputs** | 2 (stereo) |

**Modes:**
- **Preview Mode** — Lightweight CPU mastering for live playback
- **Render Mode** — Full GPU-accelerated AI mastering on export
- **Reference Mode** — Match spectral profile of dragged reference track

**Parameters:**
- `Master Strength` (0–100%) — AI processing intensity
- `Loudness Target` (-23 to -8 LUFS) — Streaming vs. club vs. CD
- `Reference Track` — Drag audio to match
- `Genre Preset` (Hip-Hop/Pop/EDM/Rock/Jazz/Classical/Custom)
- `Width` (Mono to Stereo enhancement)
- `Low End Focus` (Sub-bass emphasis control)
- `High End Air` (Treble presence control)
- `Render Quality` (Draft/Standard/High/Ultra)

### 3. Baton Voice (CLAP/VST3 Instrument)
| Property | Value |
|----------|-------|
| **Type** | Generator / Synthesizer |
| **Latency** | < 20ms |
| **Inputs** | 0 (MIDI only) |
| **Outputs** | 2 (stereo) |
| **MIDI** | Note, velocity, pitch bend, mod wheel |

**Features:**
- MIDI input from FL Studio Piano Roll
- Lyric input with phoneme timing editor
- Voice model browser (save/load cloned voices as presets)
- Expression controls: breathiness, tension, growl, falsetto
- Vibrato: rate, depth, delay, rise
- Formant tracking: follow pitch or fixed

**Parameters:**
- `Voice Model` — Preset selector (cloned voices)
- `Lyrics` — Text input with syllable markers
- `Phoneme Timing` — Per-note timing editor
- `Breathiness` (0–100%)
- `Tension` (0–100%) — Vocal fold tension
- `Growl` (0–100%) — Distortion/grit
- `Falsetto` (0–100%) — Head voice blend
- `Vibrato Rate` (3–10 Hz)
- `Vibrato Depth` (0–100%)
- `Vibrato Delay` (0–500ms)
- `Vibrato Rise` (0–500ms)
- `Formant Tracking` (On/Off)
- `Expression` (MIDI CC1 mod wheel mapped)

### 4. Baton Split (CLAP/VST3 Effect)
| Property | Value |
|----------|-------|
| **Type** | Mixer insert or Edison target |
| **Latency** | N/A (offline processing) |
| **Inputs** | 2 (stereo) |
| **Outputs** | 10 (5 stereo pairs: Drums, Bass, Vocals, Guitar, Piano, Other) |

**Features:**
- Drag audio from Edison or Playlist onto plugin
- Auto-routes stems to separate mixer tracks
- Each stem appears as new audio clip in Playlist
- Batch processing: select multiple clips, split all

**Parameters:**
- `Model` (Demucs v4 / UVR5 / Lightweight Real-time)
- `Stems` (2/4/6 stem mode)
- `Output Routing` — Target mixer tracks
- `Auto-place in Playlist` (On/Off)

### 5. Baton Beat (CLAP/VST3 Effect / MIDI Generator)
| Property | Value |
|----------|-------|
| **Type** | MIDI effect / Analyzer |
| **Latency** | < 5ms |
| **Inputs** | 2 (stereo audio) |
| **Outputs** | MIDI (tempo, beat, key, chords) |

**Features:**
- Real-time BPM detection with tap tempo sync
- Key and scale detection
- Chord progression extraction
- Beat grid generation for FL Studio
- MIDI output: drum hits, bass line, melody contour

---

## Built-in Tools

### Audio Processing & DSP

| Tool | Technology | Purpose | Mode |
|------|-----------|---------|------|
| **Autotune Engine** | aubio + Rubber Band + WORLD | Real-time pitch correction | Real-time |
| **Time-Stretch** | Rubber Band Library | High-quality tempo change | Real-time + Render |
| **Pitch-Shift** | Rubber Band / SoundTouch | Transpose without speed change | Real-time + Render |
| **Formant Preservation** | WORLD Vocoder | Maintain voice character during pitch shift | Real-time |
| **Multiband Dynamics** | Custom C++ DSP | Frequency-dependent compression | Real-time + Render |
| **Linear Phase EQ** | Custom C++ DSP | Transparent EQ for mastering | Real-time + Render |
| **Saturation/Drive** | Custom tube/tape models | Harmonic enhancement | Real-time |
| **Stereo Widening** | M/S processing | Width control | Real-time |
| **Loudness Metering** | EBU R128 / ITU-R BS.1770 | LUFS, true peak, loudness range | Real-time |
| **Spectrum Analyzer** | FFT + smoothing | Visual frequency analysis | Real-time |
| **Goniometer** | Correlation meter | Phase and stereo imaging check | Real-time |
| **Dither** | POW-r / TPDF / Noise shaping | Bit-depth reduction for export | Render |

### AI-Powered Tools

| Tool | Model | Purpose | Mode |
|------|-------|---------|------|
| **AI Mastering** | Custom U-Net / Transformer | Spectral balancing, loudness, width | Preview + Render |
| **Stem Separation** | Demucs v4 (Hybrid Transformer) | 6-stem extraction | Offline |
| **Real-time Separation** | Lightweight ONNX (2-stem) | Vocal isolation for live use | Real-time |
| **Voice Cloning** | RVC ONNX / SO-VITS | Timbre transfer from samples | Render + Cached |
| **Singing Synthesis** | DiffSinger / RVC | MIDI + lyrics → singing | Real-time + Render |
| **Speech Synthesis** | ElevenLabs API / XTTS v2 | Text → spoken vocals | Render |
| **Noise Reduction** | DeepFilterNet / RNNoise | Spectral noise suppression | Real-time + Render |
| **De-reverb** | Custom DNN | Remove room reverb from recordings | Offline |
| **De-ess** | AI sibilant detection | Intelligent sibilance control | Real-time |
| **Plosive Removal** | AI transient detection | Remove pop sounds | Real-time + Offline |
| **Click/Pop Repair** | Spectral inpainting | Remove digital clicks | Offline |
| **Audio Super-resolution** | Bandwidth extension DNN | Upsample low-quality audio | Offline |
| **Source Separation (Advanced)** | Music Source Separation DNN | Isolate specific instruments | Offline |
| **Beat Tracking** | madmom / Essentia | Accurate BPM and downbeat | Real-time |
| **Key Detection** | Essentia / Krumhansl-Schmuckler | Musical key and mode | Real-time + Offline |
| **Chord Recognition** | Chordino / Deep Chord DNN | Chord progression extraction | Real-time + Offline |
| **Melody Extraction** | pYIN / Melodia | Monophonic pitch contour | Real-time + Offline |
| **Transcription** | Basic Pitch (Google) / Omnizart | Audio → MIDI / tab / sheet | Offline |
| **Lyrics Transcription** | Whisper (OpenAI) | Speech-to-text for vocals | Offline |
| **Alignment** | Forced alignment DNN | Sync lyrics to audio timing | Offline |
| **Style Transfer** | Neural audio style transfer | Apply genre characteristics | Render |
| **Harmonic Generation** | MusicGen / AudioLDM | Generate backing harmonies | Render |
| **Fill Generation** | Drum fill / melodic fill DNN | Auto-generate transitions | Render |
| **Loop Generation** | SampleRNN / MusicVAE | Generate royalty-free loops | Render |

### Analysis & Metering

| Tool | Purpose |
|------|---------|
| **Spectrogram** | Time-frequency visualization (linear, mel, bark, ERB) |
| **Waveform** | Amplitude over time with peak/RMS |
| **Loudness History** | LUFS over time graph |
| **Dynamic Range Meter** | Crest factor and DR value |
| **Correlation Meter** | Phase correlation (-1 to +1) |
| **Vectorscope** | Stereo image visualization |
| **Tuning Meter** | Cents deviation from target pitch |
| **BPM Counter** | Tap tempo and auto-detect |
| **Key Wheel** | Circle of fifths with detected key highlighted |
| **Chord Timeline** | Chord progression over song timeline |
| **Frequency Histogram** | Note distribution analysis |
| **Transient Detection** | Onset detection for slicing |

### Project & Workflow

| Tool | Purpose |
|------|---------|
| **Project Manager** | Save/load entire Baton projects (standalone) |
| **Preset Browser** | Tag-based search for voice models, mastering chains, autotune settings |
| **Batch Processor** | Apply any process to multiple files |
| **Version Control** | Git-like project versioning with diff |
| **Cloud Sync** | Automatic backup to Baton Cloud |
| **Collaboration** | Real-time session sharing (like Google Docs for audio) |
| **Export Manager** | Multi-format export with target platforms (Spotify, Apple Music, YouTube, etc.) |
| **Metadata Editor** | ID3, ISRC, cover art, credits |
| **Delivery Check** | Pre-master validation against platform specs |

---

## AI Engines

### Mastering Engine
```
Input Mix → Loudness Analysis → Spectral Balance → 
Dynamic EQ → Multiband Compression → Stereo Enhancement → 
Harmonic Saturation → Limiting → LUFS Target → Output Master
```

**Models:**
- **Preview:** Lightweight 3-band dynamics + EQ (CPU, <30ms latency)
- **Standard:** Full U-Net spectral balancing (GPU, offline)
- **High:** Transformer-based with reference matching (GPU, offline)
- **Ultra:** Ensemble of models with iterative refinement (GPU, offline, slowest)

### Vocal Synthesis Engine
```
MIDI Input → Pitch/Phoneme Timing → Acoustic Model (RVC/DiffSinger) → 
Vocoder (NSF-HiFiGAN) → Post-processing (EQ, de-ess, reverb) → Output
```

**Voice Creation Workflow:**
1. User provides 5–30 minutes of clean vocal recordings
2. Baton trains/fine-tunes RVC model (10–30 min on GPU)
3. Model saved as `.batonvoice` preset
4. Load in Baton Voice plugin, play MIDI → AI sings

### Stem Separation Engine
```
Input Audio → Demucs v4 (6 stems) → Individual WAV outputs → 
Auto-route to FL mixer tracks / Export to folder
```

**Models:**
- **Demucs v4 (HTDemucs):** Best quality, 6 stems, GPU required
- **UVR5:** Optimized for vocal isolation, CPU-friendly
- **Lightweight ONNX:** 2-stem (vocal/other) for real-time preview

---

## FL Studio Integration

### Deep DAW Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Piano Roll MIDI** | Baton Voice receives MIDI notes, velocity, pitch bend | ✅ Core |
| **Mixer Track Routing** | Baton Split auto-routes to multiple mixer tracks | ✅ Core |
| **Edison Drag-Drop** | Drop audio from Edison onto any Baton plugin | ✅ Core |
| **Playlist Drag-Drop** | Drag audio clips from Playlist to Baton | ✅ Core |
| **Parameter Automation** | All parameters exposed to FL automation system | ✅ Core |
| **FLEX-Style Preset Browser** | Voice models and chains as browsable presets | 🔄 Phase 2 |
| **ARA2 Integration** | Deep audio editor integration with NewTone | 🔄 Phase 2 |
| **FL Cloud Backup** | Sync Baton projects to FL Cloud | 🔄 Phase 2 |
| **Gopher AI Help** | Register with FL's Gopher for contextual help | 🔄 Phase 2 |
| **MIDI Scripting** | JavaScript API for custom MIDI behaviors | 🔄 Phase 3 |
| **Project Notes Sync** | Lyrics from FL Project Notes → Baton Voice | 🔄 Phase 3 |
| **ZGameEditor Visualizer** | Export visual data for FL's video engine | 🔄 Phase 3 |

### FL Studio Menu Integration

```
FL Studio Menu → Tools → Baton
├── Open Baton Standalone
├── Baton Cloud Login
├── Quick Master (render selected pattern)
├── Quick Split (separate selected audio)
├── Quick Autotune (add to selected mixer track)
└── Preferences...

Right-Click Audio Clip → Baton
├── Master This Clip
├── Split Stems
├── Clone Voice (create model from this vocal)
├── Detect Key/BPM
└── Transcribe to MIDI

Right-Click Mixer Track → Baton
├── Insert Autotune
├── Insert Master (if master track)
└── Analyze Track
```

---

## External APIs & Services

### Cloud AI Services

| Service | API | Purpose | Fallback |
|---------|-----|---------|----------|
| **ElevenLabs** | REST API | Premium voice cloning | XTTS v2 (self-hosted) |
| **LANDR** | REST API | Cloud AI mastering | Self-hosted U-Net |
| **LALAL.AI** | REST API | Cloud stem separation | Demucs (self-hosted) |
| **Moises** | REST API | Stem separation + key/BPM | Essentia (self-hosted) |
| **Splice** | REST API | Sample search and preview | Freesound API |
| **Loopcloud** | REST API | AI sample matching | Local library |
| **Tracklib** | REST API | Licensed song samples | N/A |
| **ACRCloud** | REST API | Audio fingerprinting/ID | AudD API |
| **Whisper API** | REST API | Lyrics transcription | Whisper local (ONNX) |

### Plugin SDKs & Frameworks

| SDK | Purpose |
|-----|---------|
| **JUCE 8** | Cross-platform plugin framework (VST3, CLAP, AU, AAX, Standalone) |
| **CLAP SDK** | Modern plugin format (preferred for FL Studio) |
| **Steinberg VST3 SDK** | Legacy support for older DAWs |
| **ARA2 SDK** | Deep audio editor integration |
| **Audio Units SDK** | macOS native plugin format |
| **AAX SDK** | Pro Tools compatibility (optional) |

---

## Tech Stack

### Core Engine

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Language** | C++20 | Performance-critical DSP and plugin host |
| **Framework** | JUCE 8 | Plugin wrapper, UI, audio I/O, parameter system |
| **Build** | CMake + Ninja | Cross-platform builds |
| **DSP** | Custom C++ + Eigen | Matrix operations, FFT |
| **Pitch Detection** | aubio (C) | YIN algorithm, real-time |
| **Pitch Shifting** | Rubber Band Library (C++) | High-quality, formant-aware |
| **Formant** | WORLD Vocoder (C++) | Speech analysis/synthesis |
| **Time-Stretch** | Rubber Band / SoundTouch | Tempo change algorithms |
| **Audio I/O** | JUCE ASIO/WASAPI/CoreAudio | Low-latency drivers |

### AI Runtime

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Inference** | ONNX Runtime | Cross-platform model execution |
| **GPU** | CUDA 12.x + cuDNN | NVIDIA GPU acceleration |
| **Optimization** | TensorRT | Optimized inference for NVIDIA |
| **AMD/Intel** | DirectML | Windows AI acceleration |
| **Apple** | Core ML / Metal Performance Shaders | macOS/iOS acceleration |
| **Quantization** | ONNX Runtime INT8/FP16 | Reduced memory, faster inference |

### Standalone App

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript |
| **Desktop** | Electron 33 |
| **Audio Engine** | WASM-compiled C++ core (via Emscripten) |
| **Waveform** | Wavesurfer.js / Custom WebGL |
| **State** | Zustand + TanStack Query |
| **UI Components** | Radix UI + Tailwind CSS |
| **Timeline** | Custom canvas-based DAW timeline |

### Backend & Cloud

| Service | Technology |
|---------|-----------|
| **API** | FastAPI (Python) |
| **Queue** | Redis + Celery |
| **Database** | PostgreSQL 16 |
| **Vector DB** | Weaviate |
| **Object Storage** | AWS S3 / CloudFront |
| **Auth** | Auth0 / Clerk |
| **Payments** | Stripe |
| **Monitoring** | Prometheus + Grafana |
| **CI/CD** | GitHub Actions |

---

## Development Roadmap

### Phase 1: Foundation (Months 1–3)
- [ ] JUCE project setup with CLAP + VST3 targets
- [ ] Audio I/O engine (ASIO, WASAPI, CoreAudio)
- [ ] Parameter system with FL Studio automation support
- [ ] **Baton Autotune** — Real-time pitch correction plugin
  - [ ] aubio pitch detection integration
  - [ ] Rubber Band pitch shifting
  - [ ] Scale/key detection (Essentia)
  - [ ] Formant preservation (WORLD)
  - [ ] All parameters automatable in FL
- [ ] Basic standalone app shell (Electron + React)

### Phase 2: AI Core (Months 4–6)
- [ ] **Baton Master** — AI mastering plugin
  - [ ] Lightweight preview mode (CPU DSP chain)
  - [ ] Full render mode (ONNX U-Net)
  - [ ] Reference matching
  - [ ] LUFS metering
- [ ] **Baton Split** — Stem separation plugin
  - [ ] Demucs v4 integration (offline)
  - [ ] Multi-output routing to FL mixer
  - [ ] Edison/Playlist drag-drop
- [ ] ONNX Runtime integration for all AI models
- [ ] GPU acceleration (CUDA)

### Phase 3: Vocal Engine (Months 7–9)
- [ ] **Baton Voice** — Singing synthesis instrument
  - [ ] RVC ONNX integration
  - [ ] MIDI input from Piano Roll
  - [ ] Lyric editor with phoneme timing
  - [ ] Voice model training pipeline
  - [ ] Preset browser (FLEX-style)
- [ ] ElevenLabs API bridge for speech
- [ ] SO-VITS integration for high-quality render

### Phase 4: Deep FL Integration (Months 10–12)
- [ ] ARA2 integration with NewTone
- [ ] FL Cloud project sync
- [ ] Gopher AI help registration
- [ ] Advanced mixer routing (sidechain, sends)
- [ ] MIDI scripting API
- [ ] Project Notes → Lyrics sync
- [ ] ZGameEditor visualizer data export

### Phase 5: Polish & Scale (Months 13–15)
- [ ] Full standalone DAW features
  - [ ] Multi-track timeline
  - [ ] Non-destructive editing
  - [ ] Video sync
- [ ] Cloud rendering farm
- [ ] Collaboration (real-time sessions)
- [ ] Mobile companion app (iOS/Android)
- [ ] VST3/AU versions for other DAWs

---

## Performance Targets

| Feature | Real-Time Latency | CPU (single core) | GPU | Memory |
|---------|------------------|-------------------|-----|--------|
| Autotune | < 10ms | ~5% | None | < 50MB |
| Mastering Preview | < 30ms | ~15% | Optional | < 100MB |
| Mastering Render | N/A | Multi-core | CUDA (4GB+) | 2–8GB |
| Stem Separation (2-stem) | < 20ms | ~25% | Optional | < 200MB |
| Stem Separation (6-stem) | N/A | Multi-core | CUDA (6GB+) | 4–8GB |
| Voice Synthesis (RVC) | < 20ms | ~20% | ONNX CUDA | < 500MB |
| Voice Synthesis (SO-VITS) | N/A | Multi-core | CUDA (8GB+) | 4–6GB |
| Beat Detection | < 5ms | ~3% | None | < 30MB |
| Key Detection | < 10ms | ~5% | None | < 50MB |
| Noise Reduction | < 15ms | ~10% | Optional | < 100MB |
| Transcription | N/A | Multi-core | Optional | 1–2GB |

---

## Legal & Ethical Considerations

| Issue | Policy | Implementation |
|-------|--------|---------------|
| **Copyright** | Users must own rights to uploaded audio | Upload confirmation dialog; partner with Tracklib for licensed samples |
| **Voice Cloning Consent** | Explicit consent required from voice owner | Consent recording + digital signature; watermark all synthetic audio with C2PA |
| **Training Data** | Licensed datasets only | MusDB, MUSDB18-HQ, DSD100 for separation; proprietary licensed data for mastering |
| **Sample Redistribution** | No unauthorized redistribution | Audio fingerprinting (ACRCloud) to detect copyrighted material |
| **Deepfake Prevention** | Synthetic audio must be labeled | C2PA metadata embedding; "AI-generated" watermark option |
| **Privacy** | Voice data encrypted at rest | AES-256 encryption; user can delete voice models anytime |
| **Platform Compliance** | Meet streaming platform specs | Automated delivery check against Spotify, Apple Music, etc. |

---

## Workflow Examples

### Workflow 1: Quick Master in FL Studio
1. Finish mix in FL Studio
2. Insert **Baton Master** on master bus
3. Select genre preset or drag reference track
4. Play — hear real-time preview
5. Adjust `Master Strength` and `Loudness Target`
6. Export → Baton auto-switches to render mode
7. Receive mastered file + loudness report

### Workflow 2: Vocal Replacement
1. Record vocal take in FL → Edison
2. Drag to **Baton Voice** → "Clone Voice" (train RVC model)
3. Type new lyrics in Baton Voice lyric editor
4. Draw melody in Piano Roll
5. Play — AI sings with cloned voice
6. Insert **Baton Autotune** after for correction
7. Add **Baton Master** for final polish

### Workflow 3: Remix from Stems
1. Drag full song into FL Playlist
2. Right-click → **Baton** → **Split Stems**
3. Baton auto-routes 6 stems to mixer tracks
4. Mute original, work with stems
5. Use **Baton Beat** to detect original BPM/key
6. Rearrange in Playlist, add new elements
7. **Baton Master** for cohesive final mix

### Workflow 4: Sample Extraction
1. Find song with desired sample
2. Import to FL, isolate section with Edison
3. **Baton Split** → extract instrumental/vocal
4. **Baton Beat** → detect key and BPM
5. Time-stretch to project tempo
6. Use in new composition
7. **Tracklib** integration for legal clearance

### Workflow 5: Live Performance
1. Set up **Baton Autotune** on vocal mic channel
2. Configure scale to song key
3. Low retune speed for T-Pain effect, high for subtle
4. **Baton Voice** loaded with pre-trained model
5. MIDI keyboard → trigger AI backing vocals live
6. **Baton Master** on master for consistent live sound

---

## Appendix: Tool Directory

### Pitch & Time

| Tool | License | Use In Baton |
|------|---------|-------------|
| aubio | GPL-3.0 | Pitch detection (YIN) |
| Rubber Band Library | GPL-2.0 | Pitch-shifting, time-stretching |
| SoundTouch | LGPL-2.1 | Alternative pitch/time (lighter CPU) |
| WORLD Vocoder | BSD-2 | Formant analysis/synthesis |
| Essentia | AGPL-3.0 | Key detection, BPM, chord extraction |
| madmom | MIT | Beat tracking, downbeat detection |
| librosa | ISC | Python audio analysis (backend scripts) |

### AI / ML

| Tool | License | Use In Baton |
|------|---------|-------------|
| Demucs v4 | MIT | Stem separation |
| UVR5 | MIT | Vocal isolation GUI/backend |
| Spleeter | MIT | Fast stem separation |
| RVC | MIT | Real-time voice conversion |
| SO-VITS-SVC | MIT | High-quality singing synthesis |
| DiffSinger | MIT | Diffusion-based singing |
| XTTS v2 (Coqui) | CPML | Self-hosted speech synthesis |
| Whisper (OpenAI) | MIT | Lyrics transcription |
| Basic Pitch (Google) | Apache-2.0 | Audio → MIDI transcription |
| DeepFilterNet | MIT | Real-time noise reduction |
| RNNoise | BSD-3 | Lightweight noise suppression |
| MusicGen (Meta) | CC-BY-NC | Harmonic generation (optional) |
| AudioLDM | CC-BY-NC | Audio generation (optional) |
| ONNX Runtime | MIT | Cross-platform inference |
| TensorRT | Proprietary (free) | NVIDIA optimization |
| PyTorch | BSD-3 | Model training |
| Hugging Face Transformers | Apache-2.0 | Pre-trained model hub |

### Plugin / Audio Frameworks

| Tool | License | Use In Baton |
|------|---------|-------------|
| JUCE 8 | Proprietary (free for indie) | Plugin framework |
| CLAP SDK | MIT | Modern plugin format |
| VST3 SDK | Proprietary (free) | Legacy plugin support |
| ARA2 SDK | Proprietary (free) | DAW audio editor integration |
| Pedalboard (Spotify) | Apache-2.0 | Python audio effects pipeline |
| ffmpeg | LGPL/GPL | Audio conversion, format handling |
| pydub | MIT | Python audio manipulation |

### Cloud / APIs

| Service | Type | Cost Model |
|---------|------|-----------|
| ElevenLabs | Voice cloning API | Per-character / subscription |
| LANDR | Mastering API | Per-track / subscription |
| LALAL.AI | Stem separation API | Per-minute / subscription |
| Moises | Stem separation API | Per-minute / subscription |
| Splice | Sample library API | Subscription |
| Loopcloud | Sample library API | Subscription |
| Tracklib | Licensed samples API | Per-sample license |
| ACRCloud | Audio fingerprinting API | Per-query |
| AudD | Music recognition API | Per-query |
| Whisper API | Transcription API | Per-minute |

### UI / Visualization

| Tool | License | Use In Baton |
|------|---------|-------------|
| Wavesurfer.js | BSD-3 | Web waveform display |
| Tone.js | MIT | Web audio playback |
| React | MIT | UI framework |
| Radix UI | MIT | Accessible UI primitives |
| Tailwind CSS | MIT | Styling |
| Zustand | MIT | State management |
| TanStack Query | MIT | Server state |
| Electron | MIT | Desktop app shell |

---

## Glossary

| Term | Definition |
|------|-----------|
| **ARA** | Audio Random Access — protocol for deep DAW/audio editor integration |
| **CLAP** | CLever Audio Plugin — modern open plugin format by Bitwig/U-he |
| **C2PA** | Coalition for Content Provenance and Authenticity — metadata standard for AI-generated content |
| **Demucs** | Deep Extractor for Music Sources — Meta's stem separation model |
| **DSP** | Digital Signal Processing |
| **LUFS** | Loudness Units relative to Full Scale — standard loudness measurement |
| **M/S** | Mid/Side — stereo processing technique |
| **ONNX** | Open Neural Network Exchange — cross-platform model format |
| **RVC** | Retrieval-based Voice Conversion — open-source voice cloning |
| **SO-VITS** | Singing Voice Conversion with VITS — high-quality singing synthesis |
| **VST3** | Virtual Studio Technology 3 — Steinberg's plugin format |
| **YIN** | Pitch detection algorithm ("YIN" is not an acronym) |

---

*Document Version: 1.0*  
*Last Updated: 2026-07-20*  
*Maintained by: Baton Development Team*
