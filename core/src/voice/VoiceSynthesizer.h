#pragma once
#include <string>
#include <vector>

// Stub for RVC / SO-VITS / DiffSinger
class VoiceSynthesizer {
public:
    VoiceSynthesizer() {}

    void loadModel(const std::string& modelPath) {
        // TODO: Load ONNX Voice Model
    }

    void synthesize(const std::vector<int>& midiNotes, const std::string& lyrics, float* outputBuffer) {
        // TODO: Run acoustic model inference -> Vocoder
    }
};
