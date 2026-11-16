# LUNA AI — Your Personal Intelligent Assistant

> *"Your Intelligence. Your Assistant."*

![LUNA AI Banner](https://img.shields.io/badge/LUNA_AI-v1.0.0-00CFFF?style=for-the-badge&logo=electron&logoColor=black)
![Platform](https://img.shields.io/badge/Platforms-Windows%20%7C%20Android-367BFF?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-Tamil%20%7C%20Tanglish%20%7C%20English-00E676?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-FFB020?style=for-the-badge)

---

## 1. Project Vision & Identity
**LUNA AI** is a production-grade personal intelligent assistant inspired by JARVIS from Iron Man, designed with its own original identity, futuristic holographic interface, robust multi-device synchronization, and strict action security.

LUNA is engineered for **Windows 10/11 Desktop** and **Android Mobile**, featuring native understanding of **Tamil (தமிழ்)**, **Tanglish**, and **English**, structured system control, and a resilient **Hybrid AI Brain**.

---

## 2. Key Architecture Highlights

### A. Resilient Hybrid AI Brain
- **Cloud Intelligence**: OpenAI GPT-4o integration with structured function calling and multimodal vision.
- **Local Intelligence**: Ollama local inference (`llama3.2`) with automatic provider fallback on network loss or rate limiting.
- **Deterministic Local Engine**: Zero-latency local execution of common commands (app launching, system queries, PC locking, greetings) even without cloud API keys or heavy GPU models.

### B. Natural Tamil Voice Assistant
- **Speech Recognition (STT)**: Seamlessly understands Tamil, Tanglish, and English mixed sentences ("Hey Luna, epdi irukka?", "Luna, VS Code open pannu", "Luna, en MechFind project open pannu", "Luna, PC battery status sollu").
- **Neural Speech Synthesis (TTS)**: High-fidelity natural Tamil speech synthesis powered by Microsoft Edge-TTS (`ta-IN-ValluvarNeural` and `ta-IN-PallaviNeural`) with offline gTTS fallback.
- **Wake-Word & Duplex Audio**: Real-time acoustic wake-word listener ("Hey Luna") and interruptible audio playback.

### C. Futuristic Holographic UI/UX
- **Interactive Luna Orb**: Central kinetic glowing orb with counter-rotating quantum energy rings, reactive sound-wave visualization, and real-time state adaptation (`idle`, `listening`, `processing`, `thinking`, `speaking`, `executing`, `error`, `offline`).
- **Color System**: Deep space void (`#070B14`), metallic navy (`#0D1422`), electric cyan (`#00CFFF`), cobalt blue (`#367BFF`), and crisp white (`#F4F8FF`).
- **11 Control Center Panels**: Dashboard, Ask Luna, Voice Room, Session Archives, Persistent Memory, PC Control Agent, Android Sync, Automations, Vision Analyzer, System Monitor, and Configuration & Audit.

### D. Windows PC Agent & Security Architecture
- **Zero Arbitrary Shell Execution**: The AI is never allowed raw shell access. All operations are mediated through a strongly-typed Action Registry.
- **Four-Tier Permission Guard**: `READ_ONLY` $\rightarrow$ `LOW_RISK` $\rightarrow$ `SENSITIVE` $\rightarrow$ `DESTRUCTIVE`.
- **Cryptographic Confirmation Challenge**: Actions such as file deletion, application termination, or system shutdown/reboot issue an HMAC-SHA256 signed one-time token requiring explicit user authorization.
- **Application Allowlist**: Launch access is restricted to approved applications (`code`, `chrome`, `notepad`, `calc`, `explorer`, `wt`, etc.).

### E. Android Mobile Sync & Remote PC Control
- **Secure Device Pairing**: Authenticated pairing via 6-digit one-time handshake codes (`LN-XXX-XXX`) and JWT session tokens stored in `expo-secure-store`.
- **Remote Commands**: Speak to your Android phone ("Luna, open VS Code on my PC") and watch the command execute on your desktop while receiving a natural Tamil voice response.

---

## 3. Monorepo Structure

```text
d:/luna/
├── apps/
│   ├── desktop/               # Electron + React + TypeScript + Vite + Tailwind CSS
│   │   ├── electron/          # Main process, preload bridge, native Windows hooks
│   │   ├── src/               # React UI, Luna Orb, HUD, Views, Zustand stores
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── mobile/                # Expo React Native Android Application
│       ├── src/               # Screens (Dashboard, VoiceChat, PCHub, Pairing, Memory)
│       ├── app.json           # Android permissions & configuration
│       └── package.json
├── backend/
│   ├── app/
│   │   ├── core/              # Config, Security (HMAC, JWT), Allowlist
│   │   ├── database/          # SQLite models, sessions (Devices, Memories, AuditLogs)
│   │   ├── ai/                # Hybrid Brain (OpenAI + Ollama + Local Deterministic)
│   │   ├── voice/             # Edge-TTS (ta-IN-ValluvarNeural), gTTS, STT
│   │   ├── actions/           # Windows Action Registry & Permission Guard
│   │   ├── memory/            # SQLite Persistent Memory Engine & Anti-Leak Guard
│   │   ├── vision/            # Multimodal Screen Analyzer & Tamil Explainer
│   │   ├── automation/        # Background Cron Loop & Reminder Engine
│   │   ├── devices/           # Device Pairing & Revocation Manager
│   │   ├── api/               # FastAPI REST Routers & WebSocket Endpoint
│   │   └── main.py            # Application Lifespan & Server Entrypoint
│   ├── tests/                 # Automated pytest suite (14 comprehensive test cases)
│   ├── requirements.txt
│   └── Dockerfile
├── shared/
│   ├── types/                 # Shared TypeScript contracts and interfaces
│   └── schemas/               # Shared JSON schemas
├── docs/                      # Architectural, Security & Setup Guides
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Quick Start Guide

### Step 1: Configure Environment
Copy `.env.example` to `backend/.env`:
```powershell
Copy-Item .env.example backend\.env
```

### Step 2: Start the Python Backend Core
```powershell
cd d:\luna\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 3: Run the Desktop Electron Application
In a separate terminal:
```powershell
cd d:\luna\apps\desktop
npm run electron:dev
```

### Step 4: Run the Android Mobile Application
In a third terminal:
```powershell
cd d:\luna\apps\mobile
npx expo start
```
Press `a` to run on an Android emulator or scan the QR code with **Expo Go** on your physical Android device.

---

## 5. Verification & Test Results
To execute the comprehensive automated test suite across all subsystems:
```powershell
powershell -Command "$env:PYTHONPATH='backend'; .\backend\venv\Scripts\python -m pytest backend/tests -v"
```

### Test Suite Execution Output:
```text
backend/tests/test_actions_security.py::test_action_registry_defaults PASSED
backend/tests/test_actions_security.py::test_system_health_execution PASSED
backend/tests/test_actions_security.py::test_system_battery_execution PASSED
backend/tests/test_actions_security.py::test_sensitive_action_requires_confirmation PASSED
backend/tests/test_actions_security.py::test_destructive_action_confirmation PASSED
backend/tests/test_actions_security.py::test_app_open_allowlist_enforcement PASSED
backend/tests/test_health_and_ai.py::test_ai_brain_health PASSED
backend/tests/test_health_and_ai.py::test_ai_brain_tamil_tanglish_fallback PASSED
backend/tests/test_health_and_ai.py::test_ai_brain_open_app_tanglish PASSED
backend/tests/test_health_and_ai.py::test_ai_brain_battery_query_tanglish PASSED
backend/tests/test_memory_and_devices.py::test_memory_crud_and_security PASSED
backend/tests/test_memory_and_devices.py::test_device_pairing_and_revocation PASSED
backend/tests/test_tts.py::test_tamil_tts_synthesis PASSED
backend/tests/test_tts.py::test_tanglish_tts_synthesis PASSED

============================= 14 passed in 23.83s =============================
```

---

## 6. Production Build Commands

- **Desktop (Windows Executable & NSIS Installer)**:
  ```powershell
  cd d:\luna\apps\desktop
  npm run build
  ```
- **Mobile (Android APK)**:
  ```powershell
  cd d:\luna\apps\mobile
  npx eas build --platform android --profile preview
  ```
- **Docker Core Engine**:
  ```powershell
  docker-compose up --build -d
  ```

---

## 7. Documentation Index
- [Architecture Blueprint](file:///d:/luna/docs/architecture/ARCHITECTURE.md)
- [API & WebSocket Reference](file:///d:/luna/docs/api/API_DOCUMENTATION.md)
- [Security Architecture & Permissions](file:///d:/luna/docs/security/SECURITY.md)
- [Windows Desktop Setup Guide](file:///d:/luna/docs/setup/WINDOWS_SETUP.md)
- [Android Mobile Setup Guide](file:///d:/luna/docs/setup/ANDROID_SETUP.md)
- [Troubleshooting & Diagnostics](file:///d:/luna/docs/setup/TROUBLESHOOTING.md)
# Luna
