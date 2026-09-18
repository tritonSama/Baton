#pragma once

class FormantShifter {
public:
    FormantShifter(int sampleRate) : m_sampleRate(sampleRate) {}

    void setFormantShift(float semitones) {
        // Stub for WORLD vocoder
    }

    void process(float* const* buffers, int numSamples) {
        // Stub
    }

private:
    int m_sampleRate;
};
