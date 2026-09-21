#pragma once

#include <cmath>

class FormantShifter {
public:
    FormantShifter(int sampleRate) : m_sampleRate(sampleRate) {}

    void setFormantShift(float semitones) {
        m_shiftAmount = semitones;
    }

    // Update the channel count dynamically from the processor
    void setNumChannels(int numChannels) {
        m_numChannels = (numChannels > 2) ? 2 : numChannels;
    }

    // Native Formant Shifter (Placeholder)
    // True formant shifting requires complex spectral envelope extraction (e.g. LPC or Cepstrum)
    // and manipulation. For Phase 1 C++, we implement a basic EQ tilt as a placeholder proxy
    // to prove the signal path, as requested.
    void process(float* const* buffers, int numSamples) {
        if (m_shiftAmount == 0.0f || numSamples <= 0 || m_numChannels <= 0) return;

        // Extremely rudimentary placeholder: apply a simple tilt filter
        // to emulate formant shifting (brighten for up, darken for down).
        float targetTilt = m_shiftAmount * 0.05f; // Arbitrary scaling for effect

        // Smooth the tilt to avoid zipper noise when parameters change
        m_currentTilt = 0.99f * m_currentTilt + 0.01f * targetTilt;

        // Safely process up to the known number of channels
        for (int c = 0; c < m_numChannels; ++c) {
            for (int i = 0; i < numSamples; ++i) {
                float input = buffers[c][i];

                // Simple first-order filter
                float output = input - m_currentTilt * m_prevSamples[c];
                m_prevSamples[c] = input;

                // Apply back to buffer
                buffers[c][i] = output;
            }
        }
    }

private:
    int m_sampleRate;
    int m_numChannels = 2;
    float m_shiftAmount = 0.0f;
    float m_currentTilt = 0.0f;
    float m_prevSamples[2] = {0.0f, 0.0f}; // State for up to 2 channels

    FormantShifter(const FormantShifter&) = delete;
    FormantShifter& operator=(const FormantShifter&) = delete;
};
