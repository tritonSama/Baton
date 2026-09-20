# Baton AI Agent Guidelines

Welcome, Agent. This file serves as your primary context and instruction manual for contributing to the Baton project. Baton is an AI-powered music production suite designed to work as both a standalone application and a native plugin (VST3/CLAP) for DAWs like FL Studio.

## Project Vision & Current State

Baton aims to unify AI-powered mastering, vocal synthesis, stem separation, pitch correction, and sample management into a single cohesive ecosystem.

**What we have now:**
* Basic project structure (React/Electron frontend).
* High-level architectural specifications and roadmap definitions (see `Baton.md`).

**What is currently missing (Your Focus):**
* The C++ shared engine core (JUCE 8).
* Deep integration and routing for FL Studio.
* Actual implementation of AI inference models (ONNX, PyTorch) inside the plugins.
* UI/UX for the standalone DAW capabilities.

## The Development Roadmap

Your tasks will generally fall into one of the following phases. Always verify which phase the project is currently in before making assumptions.

### Phase 1: Foundation (Months 1–3)
**Focus:** Establishing the core C++ framework, I/O, and the first real-time plugin.
* [ ] JUCE project setup with CLAP + VST3 targets.
* [ ] Audio I/O engine (ASIO, WASAPI, CoreAudio).
* [ ] Parameter system with FL Studio automation support.
* [ ] **Baton Autotune** implementation (real-time pitch correction plugin using aubio, Rubber Band, and WORLD vocoder).
* [ ] Basic standalone app shell enhancements (Electron + React).

### Phase 2: AI Core (Months 4–6)
**Focus:** Integrating AI models for offline and lightweight real-time processing.
* [ ] **Baton Master** (AI mastering plugin with preview/render modes, LUFS metering).
* [ ] **Baton Split** (Stem separation plugin using Demucs v4, routing to FL mixer).
* [ ] ONNX Runtime integration for all AI models.
* [ ] GPU acceleration (CUDA) support setup.

### Phase 3: Vocal Engine (Months 7–9)
**Focus:** Complex vocal synthesis and voice cloning.
* [ ] **Baton Voice** (Singing synthesis instrument using RVC ONNX, MIDI input, lyric editor).
* [ ] ElevenLabs API bridge for speech synthesis.
* [ ] SO-VITS integration for high-quality rendering.

### Phase 4: Deep FL Integration (Months 10–12)
**Focus:** Tight coupling with DAW workflows.
* [ ] ARA2 integration with NewTone.
* [ ] FL Cloud project sync.
* [ ] Gopher AI help registration.
* [ ] Advanced mixer routing (sidechain, sends) in plugins.
* [ ] MIDI scripting API.

### Phase 5: Polish & Scale (Months 13–15)
**Focus:** Expanding to a full standalone DAW and scaling cloud features.
* [ ] Full standalone DAW features (Multi-track timeline, non-destructive editing, video sync).
* [ ] Cloud rendering farm integration.
* [ ] Real-time collaboration sessions.

## Rules for AI Agents

1. **Context is King:** Always refer to `Baton.md` for detailed technical specifications, plugin parameters, and architecture diagrams.
2. **One Engine, Many Faces:** Remember that the C++ DSP core must be shared across the standalone app, VST3, and CLAP targets. Do not build UI-specific core logic.
3. **No Destructive Overwrites without Verification:** When expanding a phase, use careful merge diffs. If you are implementing a new feature in C++, ensure it doesn't break the existing JUCE builds.
4. **Follow the Stack:**
   * C++20 for DSP and Core.
   * JUCE 8 for plugin wrappers and audio I/O.
   * React 19 + TypeScript + Electron for the standalone app.
   * ONNX Runtime for AI inference.
5. **Real-time vs. Render:** Clearly separate logic for low-latency real-time preview (CPU friendly) and high-quality render (GPU accelerated).
6. **DAW Native:** When building plugins, always consider how it behaves in FL Studio (e.g., parameter automation, MIDI input).

When tasked with a new feature, check the roadmap, identify the missing components, and proceed methodically to implement them while respecting this shared architecture.
