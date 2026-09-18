# Phase 1: Foundation (DSP Core)

## Agent Instructions
This directory handles the raw C++ Digital Signal Processing (DSP) implementation for Baton's audio core.

### 1. Integration Rules
* **No Audio-Thread Allocations**: Real-time DSP code in `processBlock` must *never* allocate memory on the heap, perform string operations, or lock mutexes. Pre-allocate all buffers in `prepareToPlay`.
* **aubio (Pitch Detection)**: Use the `YIN` algorithm configuration. Optimize for <10ms latency. Wrap the C-API safely within the `PitchDetector` class.
* **Rubber Band (Pitch Shifting)**: Use the real-time mode (`RubberBandStretcher::OptionProcessRealTime`) to minimize latency during tracking.
* **WORLD (Formant Preservation)**: Implement the vocoder logic to separate pitch shifting from formant (timbre) shifting. Wrap it cleanly in `FormantShifter`.

### 2. Dependency Management
* All external DSP libraries must be fetched and linked via CMake's `FetchContent` in `core/CMakeLists.txt`—do not commit large binary dependencies directly to the repo.

### 3. Verification
* Test your changes by configuring and building the JUCE core: `cmake -B ../../build -S ../../` followed by `cmake --build ../../build`. Ensure no warnings are introduced.
