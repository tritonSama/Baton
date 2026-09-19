#pragma once
#include <string>

// Stub for Redis/Celery background AI processing jobs
class WorkerQueue {
public:
    WorkerQueue() {}

    std::string dispatchHeavyJob(const std::string& payloadId, const std::string& taskType) {
        // TODO: Submit task and return tracking ID
        return "job_xyz123";
    }
};
