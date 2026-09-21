#pragma once

#include <vector>
#include <cmath>

class PitchShifter {
public:
    PitchShifter(int sampleRate, int numChannels)
        : m_sampleRate(sampleRate), m_numChannels(numChannels), m_delayLines(numChannels)
    {
        // Allocate a 1-second delay line for each channel (simplistic cross-fading pitch shift)
        for (int i = 0; i < numChannels; ++i) {
            m_delayLines[i].resize(sampleRate, 0.0f);
        }
    }

    void setPitchShift(float semitones) {
        // Convert semitones to a playback speed ratio (e.g. +12 st = 2.0x speed)
        m_pitchRatio = std::pow(2.0f, semitones / 12.0f);
    }

    // Native Delay-Line Pitch Shifter (Placeholder)
    // Uses two reading heads with crossfading.
    void process(float* const* buffers, int numSamples) {
        if (m_pitchRatio == 1.0f) return;

        // Calculate how fast the read head moves relative to the write head
        float readSpeed = m_pitchRatio;
        int delaySize = m_sampleRate; // All lines sized to 1 second

        for (int i = 0; i < numSamples; ++i) {

            // Calculate read head positions and crossfade weights once per sample frame
            float readPos1 = static_cast<float>(m_writePos) - m_phase;
            if (readPos1 < 0.0f) readPos1 += delaySize;

            float readPos2 = readPos1 - (m_windowSize / 2.0f);
            if (readPos2 < 0.0f) readPos2 += delaySize;

            int idx1 = static_cast<int>(readPos1);
            float frac1 = readPos1 - idx1;
            int nextIdx1 = (idx1 + 1) % delaySize;

            int idx2 = static_cast<int>(readPos2);
            float frac2 = readPos2 - idx2;
            int nextIdx2 = (idx2 + 1) % delaySize;

            float crossfadePos = std::fmod(m_phase, m_windowSize) / m_windowSize;
            float fade1 = 1.0f - std::abs(crossfadePos * 2.0f - 1.0f);
            float fade2 = 1.0f - fade1;

            // Process all channels synchronously
            for (int c = 0; c < m_numChannels; ++c) {
                float* channelData = buffers[c];
                std::vector<float>& delayLine = m_delayLines[static_cast<size_t>(c)];

                // Write input to delay line
                delayLine[static_cast<size_t>(m_writePos)] = channelData[i];

                // Interpolate head 1
                float sample1 = delayLine[static_cast<size_t>(idx1)] * (1.0f - frac1) +
                                delayLine[static_cast<size_t>(nextIdx1)] * frac1;

                // Interpolate head 2
                float sample2 = delayLine[static_cast<size_t>(idx2)] * (1.0f - frac2) +
                                delayLine[static_cast<size_t>(nextIdx2)] * frac2;

                channelData[i] = (sample1 * fade1) + (sample2 * fade2);
            }

            // Advance phase and write position once per sample frame
            m_phase += (1.0f - readSpeed);
            if (m_phase >= m_windowSize) m_phase -= m_windowSize;
            if (m_phase < 0.0f) m_phase += m_windowSize;

            m_writePos = (m_writePos + 1) % delaySize;
        }
    }

private:
    int m_sampleRate;
    int m_numChannels;

    std::vector<std::vector<float>> m_delayLines;
    int m_writePos = 0;
    float m_phase = 0.0f;
    float m_pitchRatio = 1.0f;

    // Window size for the crossfade (typically 30-50ms)
    float m_windowSize = 2048.0f;

    PitchShifter(const PitchShifter&) = delete;
    PitchShifter& operator=(const PitchShifter&) = delete;
};
