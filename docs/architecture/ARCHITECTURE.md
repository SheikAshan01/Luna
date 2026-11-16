# LUNA AI System Architecture

## 1. System Philosophy
LUNA AI ("Your Intelligence. Your Assistant.") is a full-stack, personal AI assistant inspired by the capabilities of JARVIS, engineered for Windows 10/11 desktop and Android mobile devices.

### Architectural Tenets:
1. **Hybrid Online + Offline AI**: Prioritizes Cloud AI (OpenAI GPT-4o) for high-reasoning tasks and automatically cascades to local inference (Ollama or local deterministic engine) without losing conversation context.
2. **Tamil & Tanglish First-Class Fluency**: Native understanding and natural speech synthesis for Tamil (`ta-IN`), Tanglish, and English.
3. **Guarded Action Execution**: The LLM is never given unrestricted shell execution. Every action is registered with a typed schema, permission level (`READ_ONLY`, `LOW_RISK`, `SENSITIVE`, `DESTRUCTIVE`), allowlist validation, and explicit cryptographic confirmation challenges for destructive operations.
4. **Local-First Synchronization**: Authenticated pairing between Windows PC and Android devices using JWT tokens and one-time cryptographic handshake codes.

---

## 2. Component Diagram

```
+-------------------------------------------------------------------+
|                        LUNA AI ECOSYSTEM                          |
+-------------------------------------------------------------------+
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
+-------------------------------+         +-------------------------------+
|     APPS: ELECTRON DESKTOP    |         |       APPS: EXPO ANDROID      |
|  - React 18 + Vite + Tailwind |         |  - React Native + TypeScript  |
|  - Framer Motion + Zustand    |         |  - SecureStore + Expo Audio   |
|  - Animated Holographic Orb   |         |  - Mobile Voice HUD           |
|  - 11 Functional HUD Panels   |         |  - Remote PC Command Dispatch |
+-------------------------------+         +-------------------------------+
        |                                                 |
        |  IPC / REST / WebSocket                         | REST / WSS
        +------------------------+------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|                     BACKEND: FASTAPI CORE ENGINE                  |
|                                                                   |
|  [AI Provider Manager]       [Action Security Registry]           |
|   - OpenAI Cloud Adapter      - 4-Tier Permission Guard           |
|   - Ollama Local Adapter      - Allowlist Enforcer (Apps/Paths)   |
|   - Deterministic NLP         - HMAC Confirmation Tokens          |
|   - Auto-Fallback Pipeline    - Tamper-evident Audit Logs         |
|                                                                   |
|  [Tamil & Voice Engine]      [Persistent Memory & DB]             |
|   - Edge-TTS (ValluvarNeural) - SQLite / SQLAlchemy Models        |
|   - gTTS Speech Fallback      - Anti-Credential Leak Guard       |
|   - Web Speech API (ta-IN)    - Memory Exporter & Search          |
|                                                                   |
|  [Multimodal Vision]         [Automation & Scheduler]             |
|   - Screen Capture (PIL/mss)  - Async Background Cron Loop        |
|   - OCR / UI Error Explainer  - Routine Task & Reminder Engine    |
|   - Tamil Trouble Explanation                                     |
+-------------------------------------------------------------------+
```

---

## 3. Communication Protocols
- **Client to Backend**: REST APIs (`http://127.0.0.1:8000/api`) with JSON payload and multipart audio/image support.
- **Real-Time Duplex**: WebSockets (`ws://127.0.0.1:8000/ws/assistant`) for instant assistant state streaming, voice telemetry, and heartbeats.
- **Android to PC**: Authenticated REST/WSS with Bearer tokens issued during the one-time pairing handshake.
