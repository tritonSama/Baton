#pragma once
#include <string>

// Stub for ElevenLabs REST API via libcurl
class ElevenLabsClient {
public:
    ElevenLabsClient(const std::string& apiKey) : m_apiKey(apiKey) {}

    void generateSpeech(const std::string& text, const std::string& voiceId) {
        // TODO: Execute HTTP POST request
    }
private:
    std::string m_apiKey;
};
