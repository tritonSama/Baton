# DSP Subsystem Agent Guidelines

This directory (`core/src/dsp/`) contains the C++ digital signal processing logic for Baton.

## Architectural Rules

1. **Strict Real-Time Safety:** Code executing inside `processBlock` (or any DSP process function) must be real-time safe.
   * **No allocations (`new`/`malloc`)**.
   * **No locking mechanisms** (mutexes, spinlocks) that can block the audio thread.
   * **No file I/O or network requests**.
   * Pre-allocate all buffers in `prepareToPlay`.

2. **Library Abstractions:** We rely heavily on open-source libraries for core algorithms to save time, but they must be wrapped cleanly:
   * **Pitch Detection:** `aubio` (YIN algorithm). Wrapped in `PitchDetector.h`.
   * **Pitch Shifting:** `Rubber Band Library`. Wrapped in `PitchShifter.h`.
   * **Formant Processing:** `WORLD Vocoder`. Wrapped in `FormantShifter.h`.
   * Do not expose the internal headers of these libraries directly to `BatonAudioProcessor.h` if possible; use Pimpl or forward declarations to keep compile times fast.

3. **Dependency Management:** Dependencies are fetched via CMake `FetchContent` in the root `core/CMakeLists.txt`. If you need to add a new DSP dependency, add it there, not locally.

4. **Latency Reporting:** If a DSP algorithm introduces latency (e.g., lookahead for pitch detection), you must calculate it and report it to the host via JUCE's `setLatencySamples()`.

## Current Focus (Phase 1)
* We are currently stubbing and integrating `aubio`, `rubberband`, and `WORLD` into the build system and wrapping their basic functionalities.
* Ensure parameters like Retune Speed, Correction Amount, and Formant Shift smoothly map to these underlying libraries.
