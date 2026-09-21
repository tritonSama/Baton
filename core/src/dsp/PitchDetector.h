#pragma once

#include <vector>
#include <cmath>

class PitchDetector {
public:
    PitchDetector(int sampleRate, int bufferSize)
        : m_sampleRate(sampleRate), m_bufferSize(bufferSize), m_currentPitch(0.0f)
    {
        m_buffer.resize(bufferSize, 0.0f);
    }

    // Native Zero-Crossing Rate (ZCR) based pitch detector.
    // Extremely lightweight, fully real-time safe (zero allocations).
    void process(const float* buffer, int numSamples) {
        if (numSamples <= 1) return;

        int crossings = 0;
        float prevSample = buffer[0];

        for (int i = 1; i < numSamples; ++i) {
            float currentSample = buffer[i];

            // Basic low-pass filter logic could be added here to improve ZCR,
            // but for a pure C++ placeholder we just count zero crossings.
            if ((prevSample < 0.0f && currentSample >= 0.0f) ||
                (prevSample > 0.0f && currentSample <= 0.0f))
            {
                crossings++;
            }
            prevSample = currentSample;
        }

        // A full wave has 2 zero crossings.
        // Frequency = (crossings / 2) / (numSamples / sampleRate)
        if (crossings > 0) {
            float durationInSeconds = static_cast<float>(numSamples) / m_sampleRate;
            float newPitch = (crossings / 2.0f) / durationInSeconds;

            // Simple smoothing (one-pole filter) to avoid jitter
            if (m_currentPitch == 0.0f) {
                m_currentPitch = newPitch;
            } else {
                m_currentPitch = 0.8f * m_currentPitch + 0.2f * newPitch;
            }
        }
    }

    float getCurrentPitch() const {
        return m_currentPitch;
    }

private:
    int m_sampleRate;
    int m_bufferSize;
    float m_currentPitch;
    std::vector<float> m_buffer;

    PitchDetector(const PitchDetector&) = delete;
    PitchDetector& operator=(const PitchDetector&) = delete;
};
