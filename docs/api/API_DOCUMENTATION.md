# LUNA AI REST & WebSocket API Specification

Base URL: `http://127.0.0.1:8000`

---

## 1. System Health
### `GET /health`
Returns service status, uptime, active AI mode, and local/cloud provider status.

**Response**:
```json
{
  "status": "healthy",
  "service": "LUNA AI Core",
  "version": "1.0.0",
  "environment": "development",
  "aiMode": "hybrid",
  "aiStatus": {
    "mode": "hybrid",
    "openai": { "configured": true, "model": "gpt-4o" },
    "ollama": { "url": "http://localhost:11434", "model": "llama3.2:latest", "online": false }
  },
  "timestamp": "2026-11-14T11:55:00.000Z"
}
```

---

## 2. Conversational AI
### `POST /api/chat`
Send query in English, Tamil, or Tanglish. Handles automatic structured tool execution.

**Request Body**:
```json
{
  "message": "Luna, VS Code open pannu",
  "conversationId": "optional-uuid",
  "language": "ta-IN",
  "confirmationToken": null
}
```

**Response**:
```json
{
  "conversationId": "conv-uuid",
  "message": "Kandippa boss, CODE ippo open pandren.",
  "provider": "openai",
  "toolCalls": [...],
  "toolResults": [...],
  "fallbackOccurred": false
}
```

---

## 3. Speech Synthesis & Audio
### `POST /api/voice/speak`
Stream natural neural Tamil (`ta-IN-ValluvarNeural` or `ta-IN-PallaviNeural`) or English speech audio.

**Request Body**:
```json
{
  "text": "வணக்கம், நான் லூனா உங்கள் தனிப்பட்ட ஏஐ உதவியாளர்.",
  "language": "ta-IN",
  "voice": "ta-IN-ValluvarNeural"
}
```
**Response**: `audio/mpeg` streaming binary buffer.

---

## 4. Action Registry & Windows PC Control
### `GET /api/actions`
Returns all registered actions, permission tiers, and JSON schemas.

### `POST /api/actions/execute`
Executes an authorized action. If the action is `SENSITIVE` or `DESTRUCTIVE` and no valid confirmation token is present, returns an authorization challenge with an HMAC-signed one-time token.

**Request Body**:
```json
{
  "actionId": "files.delete",
  "parameters": { "path": "d:\\luna\\test.tmp" },
  "confirmationToken": null
}
```

**Response (Challenge Issued)**:
```json
{
  "success": false,
  "actionId": "files.delete",
  "confirmationRequired": true,
  "confirmationToken": "1794656875::files.delete::c3b2f...",
  "permissionLevel": "DESTRUCTIVE",
  "message": "Action 'Delete File' requires explicit authorization."
}
```

---

## 5. Device Pairing
### `POST /api/devices/pair-request`
Generates a 6-character cryptographic pairing code (e.g. `LN-784-291`) valid for 10 minutes.

### `POST /api/devices/pair`
Android device completes the handshake:
```json
{
  "pairingCode": "LN-784-291",
  "deviceName": "Samsung Galaxy S24",
  "platform": "android"
}
```
**Response**:
```json
{
  "deviceId": "dev-uuid",
  "token": "eyJhbGciOi...",
  "deviceName": "Samsung Galaxy S24",
  "pairedAt": "2026-11-14T11:55:00.000Z"
}
```

---

## 6. WebSocket Protocol
### `WS /ws/assistant`
Bidirectional stream for real-time telemetry, state changes (`idle`, `listening`, `thinking`, `speaking`, `executing`), and audio callbacks.
