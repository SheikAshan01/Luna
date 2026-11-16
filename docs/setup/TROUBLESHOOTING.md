# LUNA AI Troubleshooting Guide

## 1. Speech Recognition (STT) & Microphone Issues
### Symptoms:
- Mic icon is clicked, but no text appears.
### Solutions:
1. Ensure microphone permissions are allowed in Windows Settings: **Settings > Privacy & security > Microphone** > Turn ON "Allow apps to access your microphone" and "Allow desktop apps to access your microphone".
2. In the Electron app or browser, check that the microphone is not being exclusively captured by another application (e.g., Discord or Zoom).
3. If using Web Speech API, verify that `ta-IN` or `en-US` language packs are installed in Windows Language Settings.

---

## 2. Tamil Voice Output (TTS) Issues
### Symptoms:
- Assistant replies in text, but no voice audio is heard.
### Solutions:
1. Ensure the Python backend is running on `http://127.0.0.1:8000`. LUNA calls `/api/voice/speak` which utilizes Edge-TTS (`ta-IN-ValluvarNeural`).
2. If internet connection is lost, LUNA automatically falls back to browser `window.speechSynthesis` or offline gTTS.
3. Test speech directly in the **Voice Assistant** panel by clicking "Test Tamil" or "Test Tanglish".

---

## 3. Remote Android PC Control Connection Refused
### Symptoms:
- Android app displays "Network Request Failed" or "Unable to connect to PC".
### Solutions:
1. When testing on an **Android Emulator**, use `http://10.0.2.2:8000` (which loops back to the host Windows machine).
2. When testing on a **physical phone over Wi-Fi**, find your PC's local LAN IP:
   ```powershell
   ipconfig
   ```
   Look for `IPv4 Address` (e.g. `192.168.1.100`), and configure `http://192.168.1.100:8000` in the Android app.
3. Check Windows Defender Firewall: Ensure Python / port 8000 allows incoming connections on the Private Network.

---

## 4. Ollama Local LLM Unreachable
### Symptoms:
- Backend reports `Ollama unreachable; activating LUNA Deterministic Voice & Command Engine`.
### Solutions:
1. LUNA gracefully handles this! The assistant continues to execute local commands (e.g. app launching, battery queries, PC locking, screenshots) using its built-in Deterministic NLP engine.
2. To use Ollama for open-ended conversation:
   - Download Ollama from `https://ollama.com`.
   - Run `ollama run llama3.2`.
   - LUNA will detect `http://localhost:11434` automatically and show the green status badge.

---

## 5. Action Authorization & Confirmation Errors
### Symptoms:
- Destructive action (e.g. deleting a file or terminating a process) fails with `Confirmation token is invalid or has expired`.
### Solutions:
1. Confirmation tokens expire in 300 seconds (5 minutes) for security. If you wait longer than 5 minutes before confirming, re-trigger the command to generate a fresh token.
2. Ensure the parameters were not altered between challenge generation and authorization.
