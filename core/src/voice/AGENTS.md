# Phase 3: Vocal Engine

## Agent Instructions
This directory manages the Singing Synthesis and Voice Cloning capabilities of Baton.

### 1. Model Integration
* **RVC (Retrieval-based Voice Conversion)**: Integrate the RVC models via ONNX Runtime for low-latency (<20ms) vocal timbre transfer.
* **SO-VITS**: Integrate SO-VITS for high-quality, offline rendering of synthesized vocals.
* **DiffSinger**: Parse MIDI input (note, velocity, pitch bend) and map lyrics/phonemes to generate the acoustic base model.

### 2. External API Bridges
* Implement REST clients using `libcurl` or standard networking libraries for **ElevenLabs API** (for premium speech synthesis). Handle network timeouts and caching.

### 3. MIDI & Lyrics
* Build a robust system to track phoneme-to-MIDI alignment. The engine must support expressive MIDI CC routing (e.g., breathiness, tension, growl).
