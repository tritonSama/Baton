#pragma once

// Stub for Demucs v4 Stem Separation
class DemucsSeparator {
public:
    DemucsSeparator() {}

    // Outputs 6 stems (Drums, Bass, Vocals, Guitar, Piano, Other)
    void extractStems(const float* inputMix, int numSamples, float** outputStems) {
        // TODO: Implement Demucs ONNX execution
    }
};
