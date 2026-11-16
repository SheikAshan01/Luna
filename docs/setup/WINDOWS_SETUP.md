# Windows 10/11 Setup & Running Guide — LUNA AI

## Prerequisites
- Windows 10/11 (64-bit)
- Python 3.10+ (tested on Python 3.12 / 3.15)
- Node.js 18+ (tested on Node v26)
- Git for Windows

---

## 1. Quick Start Instructions

### Step 1: Clone or Navigate to the Workspace
```powershell
cd d:\luna
```

### Step 2: Configure Environment
Copy `.env.example` to `backend/.env`:
```powershell
Copy-Item .env.example backend\.env
```
*(Optional: Open `backend\.env` and add your `OPENAI_API_KEY` for GPT-4o cloud intelligence. If left blank, LUNA runs automatically in local/deterministic mode with full Tamil voice capabilities!)*

### Step 3: Run the Python Backend
Open a terminal and execute:
```powershell
cd d:\luna\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
You should see:
```text
INFO: Initializing LUNA AI database schema...
INFO: Database initialized successfully.
INFO: Automation scheduler initialized.
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 4: Run the Electron Desktop Application
In a second terminal:
```powershell
cd d:\luna\apps\desktop
npm run electron:dev
```
The futuristic holographic LUNA desktop window will appear with the animated central orb, sound waves, telemetry, and live voice recognition.

---

## 2. Running Automated Tests
To execute the comprehensive pytest backend test suite:
```powershell
powershell -Command "$env:PYTHONPATH='backend'; .\backend\venv\Scripts\python -m pytest backend/tests -v"
```
All 14 tests will execute and pass:
- Action registry defaults
- System health execution
- Sensitive action confirmation challenge
- Destructive action confirmation challenge
- Allowlist enforcement
- Tamil and Tanglish fallback processing
- App launch commands in Tanglish
- Battery status query in Tanglish
- Memory persistence and security leak prevention
- Device pairing and revocation
- Edge-TTS Tamil neural speech synthesis
- Tanglish speech synthesis

---

## 3. Building Production Windows Installer
To package LUNA AI into a standalone Windows desktop executable:
```powershell
cd d:\luna\apps\desktop
npm run build
```
Compiled assets will be placed in `apps/desktop/dist/` and `apps/desktop/dist-electron/`.
