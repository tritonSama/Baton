#pragma once
#include <string>

// Stub for AWS S3 / Cloud API
class CloudClient {
public:
    CloudClient(const std::string& jwtToken) : m_token(jwtToken) {}

    void syncProjectState(const std::string& projectId) {
        // TODO: Diffing & state sync via WebSockets / HTTP
    }
private:
    std::string m_token;
};
