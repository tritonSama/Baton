#pragma once

class PitchShifter {
public:
    PitchShifter(int sampleRate, int numChannels)
        : m_sampleRate(sampleRate), m_numChannels(numChannels) {}

    void setPitchShift(float semitones) {
        (void)semitones;
        // Stub for Rubber Band Library
    }

    void process(float* const* buffers, int numSamples) {
        (void)buffers;
        (void)numSamples;
        // Stub
    }

private:
    int m_sampleRate;
    int m_numChannels;
};
