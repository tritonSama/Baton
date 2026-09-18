# Phase 4: DAW Integration

## Agent Instructions
This directory manages deep integrations into Digital Audio Workstations (specifically FL Studio).

### 1. FL Studio Deep API
* **ARA2 (Audio Random Access)**: Implement the ARA2 SDK bindings for deep non-destructive audio editing, specifically bridging Baton to FL Studio's NewTone workflow.
* **Mixer Track Routing**: Implement multi-output routing logic for `Baton Split` (auto-routing 6 stems to discrete FL mixer tracks).
* **Drag-and-Drop**: Implement robust OLE/JUCE drag-and-drop bridging to handle Edison audio snippets directly.

### 2. General Plugin Best Practices
* Expose all automatable parameters via standard VST3/CLAP mechanisms.
* Ensure UI scaling works correctly within host DAW environments.
