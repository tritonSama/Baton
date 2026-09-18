# Phase 5: Cloud & Scale

## Agent Instructions
This directory manages cloud synchronization, render farms, and collaboration features.

### 1. Cloud Architecture
* **Worker Queue**: Implement clients that push heavy AI rendering tasks (like U-Net Ultra Mastering or SO-VITS generation) to Redis/Celery worker nodes.
* **Project Sync**: Implement a Git-like diffing and version control system for Baton projects to enable fast cloud syncing to AWS S3.
* **Real-time Collaboration**: Build WebRTC or WebSocket infrastructure for real-time, shared audio sessions.

### 2. Legal & Auth
* All endpoints must validate JWT tokens via Auth0/Clerk.
* Ensure audio uploads are verified against C2PA provenance or audio fingerprinting for copyright validation.
