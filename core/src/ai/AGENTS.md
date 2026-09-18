# Phase 2: AI Core

## Agent Instructions
This directory manages the C++ inference engine for Baton's AI models, including Mastering (U-Net) and Stem Separation (Demucs).

### 1. Architectural Guidelines
* **ONNX Runtime (ORT)**: All models must run through the ONNX Runtime C++ API.
* **Execution Providers (EP)**: Code must fallback gracefully. Attempt `CUDAExecutionProvider` -> `TensorrtExecutionProvider` -> `DmlExecutionProvider` (Windows) -> `CPUExecutionProvider`.
* **Threading**: AI inference is heavy. It must **never** block the JUCE audio thread. Offload all inference calls to background threads or JUCE's `ThreadPool`.

### 2. Implementation specifics
* **Mastering Engine**: Implement the U-Net spectral balancing model. It should support a lightweight CPU mode for real-time preview (latency <30ms) and a full GPU mode for offline rendering.
* **Stem Separation**: Implement the Demucs v4 ONNX model capable of outputting 6 stems (Drums, Bass, Vocals, Guitar, Piano, Other).

### 3. Verification
* Test implementations by running standard inference against a dummy tensor to verify execution provider availability.
