#pragma once
#include <vector>

class PitchDetector {
public:
    PitchDetector(int sampleRate, int bufferSize)
        : m_sampleRate(sampleRate), m_bufferSize(bufferSize) {}

    void process(const float* buffer, int numSamples) {
        // Stub for aubio integration (YIN algorithm)
    }

    float getCurrentPitch() const {
        return 440.0f; // stub
    }

private:
    int m_sampleRate;
    int m_bufferSize;
};
