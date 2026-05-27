# CoupleTimer / VibeMind - Structured Dialogue Companion

An elegant, privacy-compliant, highly-engineered companion app designed to facilitate structured Zwiegespräch dialogue for couples. Based on Michael Lukas Moeller's relationship frameworks, this app combines high-fidelity local timers, real-time visual feedback, and optional advanced AI insights Powered by VibeMind.

---

## 🎨 Architecture Overview

The application follows a full-stack, modular architecture optimized for local-first operations with optional cloud-hosted synchronization:

```text
               +----------------------------------+
               |        React Frontend UI         | (src/App.tsx)
               +-----------------+----------------+
                                 |
                     [useVibeMindSession hook] (src/hooks/useVibeMindSession.ts)
                                 |
            +--------------------+--------------------+
            |                                         |
            v (Local Mode)                            v (Backend Mode)
   +------------------+                     +-------------------+
   |  Browser Speech  |                     |  VibeMindClient   | (src/api/vibemindClient.ts)
   |  Recognition API |                     +---------+---------+
   +------------------+                               |
                                           +----------v----------+
                                           |  VibeMind Backend   | (e.g., server.ts or Production)
                                           +---------------------+
```

### Module Directories

- **`src/types/vibemind.ts`**: Holds unified TypeScript models, session states, and message interfaces.
- **`src/api/vibemindClient.ts`**: Handles robust multipart recordings uploads, status polling, transcript fetches, and summary generator queries.
- **`src/services/recordingService.ts`**: Provides low-overhead client-side audio capture and base64 formatting.
- **`src/services/profileStore.ts`**: Centralized storage engine for couple configurations and phase flow options.
- **`src/hooks/useVibeMindSession.ts`**: High-performance session coordinator that glues the timer state, speaker diarization, uploads, and APIs together.

---

## 🔌 The Role of `server.ts`

In this workspace, **`server.ts`** serves two vital roles:

1. **Vite Development Proxy**: Serves and lives-updates the web app assets during local development.
2. **Local Mock VibeMind & AI-Engine**:
   - Mocks the exact rest endpoints: `POST /sessions`, `POST /sessions/{id}/recording`, `POST /sessions/{id}/transcribe`, `GET /sessions/{id}`, `GET /sessions/{id}/transcript.md`, and `GET /sessions/{id}/summary.md`.
   - Uses the **Google Gemini SDK (`@google/genai`)** server-side (proxied from the browser) to perform secure translation and live analysis, safely hiding key secrets.

---

## 🛡️ Privacy & Compliance

This companion App implements strict privacy compliance (GDPR equivalents):
- **Consent Gate**: No audio registration or live transcription can be started until the couple accepts the Privacy Consent Card.
- **Safe Metadata Storage**: By default, only session metadata (`SessionHistoryMeta` structure equivalent) is saved locally in the browser's database. Full transcripts and segments are never persisted locally unless explicit user consent is active.
- **Zero Silent Uploads**: No backend synchronization occurs unless a backend endpoint (`VITE_VIBEMIND_API_URL`) is explicitly specified.
