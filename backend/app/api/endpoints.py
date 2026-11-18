from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
import io
import os

from app.core.config import settings
from app.ai.brain import ai_brain
from app.voice.tts import tts_engine
from app.voice.stt import stt_engine
from app.actions.registry import action_registry
from app.actions.executor import ActionExecutor
from app.memory.manager import memory_manager
from app.devices.manager import device_manager
from app.automation.scheduler import automation_scheduler
from app.vision.analyzer import vision_analyzer
from app.database.session import SessionLocal
from app.database.models import Conversation, Message, AuditLog

router = APIRouter()

# ----------------- Models -----------------
class ChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    language: Optional[str] = "ta-IN"
    confirmationToken: Optional[str] = None
    gender: Optional[str] = None
    ephemeral: Optional[bool] = True  # Zero Data Retention: default True ensures complete privacy!

class ActionRequest(BaseModel):
    actionId: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confirmationToken: Optional[str] = None
    deviceId: Optional[str] = None

class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = "ta-IN"
    voice: Optional[str] = None
    speed: Optional[float] = 1.0

class MemoryRequest(BaseModel):
    category: str
    key: str
    value: str
    tags: Optional[List[str]] = None

class PairInitRequest(BaseModel):
    pass

class PairCompleteRequest(BaseModel):
    pairingCode: str
    deviceName: str
    platform: str = "android"

class AutomationCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    scheduleType: str
    scheduleExpression: str
    actionId: str
    actionParameters: Optional[Dict[str, Any]] = None

class VisionRequest(BaseModel):
    imageBase64: Optional[str] = None
    prompt: Optional[str] = "Analyze this screen and detect any errors or issues."
    language: Optional[str] = "ta-IN"

# ----------------- Health -----------------
@router.get("/health")
async def health_endpoint():
    ai_status = await ai_brain.get_health_status()
    return {
        "status": "healthy",
        "service": "LUNA AI Core",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "aiMode": settings.AI_MODE,
        "aiStatus": ai_status,
    }

# ----------------- Chat & Conversations -----------------
@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # 1. Zero Data Retention / Ephemeral Privacy Mode (Default)
    if req.ephemeral:
        formatted_messages = [{"role": "user", "content": req.message}]
        ai_resp = await ai_brain.chat(
            messages=formatted_messages,
            confirmation_token=req.confirmationToken,
            gender=req.gender
        )
        return {
            "conversationId": "ephemeral-session",
            "message": ai_resp.content,
            "provider": ai_resp.provider,
            "toolCalls": ai_resp.tool_calls,
            "toolResults": ai_resp.tool_results,
            "fallbackOccurred": ai_resp.fallback_occurred,
            "ephemeral": True
        }

    # 2. Persistent mode (only if ephemeral is explicitly False)
    db = SessionLocal()
    try:
        conv_id = req.conversationId
        if not conv_id:
            conv = Conversation(title=req.message[:50])
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conv_id = conv.id

        # Save user message
        user_msg = Message(
            conversation_id=conv_id,
            role="user",
            content=req.message,
            language=req.language or "en"
        )
        db.add(user_msg)
        db.commit()

        # Load recent conversation history
        history_msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at.asc()).limit(20).all()
        formatted_history = [{"role": m.role, "content": m.content} for m in history_msgs]

        # Call AI Brain with dynamic acoustic gender detection
        ai_resp = await ai_brain.chat(
            messages=formatted_history,
            confirmation_token=req.confirmationToken,
            gender=req.gender
        )

        # Save assistant message
        asst_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=ai_resp.content,
            provider=ai_resp.provider,
            language=req.language or "ta-IN"
        )
        db.add(asst_msg)
        db.commit()

        return {
            "conversationId": conv_id,
            "message": ai_resp.content,
            "provider": ai_resp.provider,
            "toolCalls": ai_resp.tool_calls,
            "toolResults": ai_resp.tool_results,
            "fallbackOccurred": ai_resp.fallback_occurred
        }
    finally:
        db.close()

# ----------------- Absolute Privacy & Purge Endpoint -----------------
@router.post("/privacy/purge")
async def purge_all_data():
    db = SessionLocal()
    try:
        db.query(Message).delete()
        db.query(Conversation).delete()
        db.commit()
        return {
            "success": True,
            "message": "All database conversation records permanently erased. Zero data retained."
        }
    finally:
        db.close()


@router.get("/conversations")
async def list_conversations():
    db = SessionLocal()
    try:
        convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
        return [c.to_dict() for c in convs]
    finally:
        db.close()

@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str):
    db = SessionLocal()
    try:
        msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at.asc()).all()
        return [m.to_dict() for m in msgs]
    finally:
        db.close()

@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    db = SessionLocal()
    try:
        db.query(Message).filter(Message.conversation_id == conv_id).delete()
        db.query(Conversation).filter(Conversation.id == conv_id).delete()
        db.commit()
        return {"success": True}
    finally:
        db.close()

# ----------------- Voice Endpoints -----------------
@router.get("/voice/speak")
async def speak_get_endpoint(text: str, language: Optional[str] = "ta-IN", voice: Optional[str] = None):
    try:
        audio_bytes = await tts_engine.synthesize(
            text=text,
            language=language,
            voice=voice
        )
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/speak")
async def speak_endpoint(req: SpeakRequest):
    try:
        audio_bytes = await tts_engine.synthesize(
            text=req.text,
            language=req.language,
            voice=req.voice
        )
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voice/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...), language: Optional[str] = Form(None)):
    content = await file.read()
    target_lang = None if (not language or language in ["auto", "default"]) else language
    result = await stt_engine.transcribe(content, filename=file.filename or "speech.webm", language=target_lang)
    return result

# ----------------- Actions & PC Control -----------------
@router.get("/actions")
async def list_actions():
    return action_registry.list_actions()

@router.post("/actions/execute")
async def execute_action(req: ActionRequest):
    res = await ActionExecutor.execute(
        action_id=req.actionId,
        parameters=req.parameters,
        actor_type="api",
        actor_id=req.deviceId,
        confirmation_token=req.confirmationToken
    )
    return res

# ----------------- System Health & Telemetry -----------------
@router.get("/system/health")
async def get_system_health():
    res = await ActionExecutor.execute("system.get_health", {})
    ai_status = await ai_brain.get_health_status()
    data = res.get("data", {})
    data["aiProviderStatus"] = ai_status
    return data

@router.get("/audit-logs")
async def get_audit_logs():
    db = SessionLocal()
    try:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
        return [l.to_dict() for l in logs]
    finally:
        db.close()

# ----------------- Memory Endpoints -----------------
@router.get("/memory")
async def list_memories(category: Optional[str] = None, q: Optional[str] = None):
    return memory_manager.list_memories(category=category, search_query=q)

@router.post("/memory")
async def create_memory(req: MemoryRequest):
    return memory_manager.create_or_update(
        category=req.category,
        key=req.key,
        value=req.value,
        tags=req.tags
    )

@router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    success = memory_manager.delete_memory(memory_id)
    return {"success": success}

@router.get("/memory/export")
async def export_memories():
    return memory_manager.export_all()

# ----------------- Device Management -----------------
@router.get("/devices")
async def list_devices():
    return device_manager.list_devices()

@router.post("/devices/pair-request")
async def create_pair_request():
    return device_manager.create_pairing_request()

@router.post("/devices/pair")
async def pair_device(req: PairCompleteRequest):
    try:
        res = device_manager.pair_device(
            code=req.pairingCode,
            device_name=req.deviceName,
            platform=req.platform
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/devices/{device_id}")
async def revoke_device(device_id: str):
    success = device_manager.revoke_device(device_id)
    return {"success": success}

# ----------------- Automation Endpoints -----------------
@router.get("/automation")
async def list_automation():
    return automation_scheduler.list_tasks()

@router.post("/automation")
async def create_automation(req: AutomationCreateRequest):
    return automation_scheduler.create_task(
        name=req.name,
        schedule_type=req.scheduleType,
        schedule_expression=req.scheduleExpression,
        action_id=req.actionId,
        action_parameters=req.actionParameters,
        description=req.description
    )

@router.patch("/automation/{task_id}/toggle")
async def toggle_automation(task_id: str):
    res = automation_scheduler.toggle_task(task_id)
    if not res:
        raise HTTPException(status_code=404, detail="Task not found")
    return res

@router.delete("/automation/{task_id}")
async def delete_automation(task_id: str):
    success = automation_scheduler.delete_task(task_id)
    return {"success": success}

# ----------------- Vision Endpoints -----------------
@router.post("/vision/analyze")
async def analyze_vision(req: VisionRequest):
    return await vision_analyzer.analyze_screen_or_image(
        image_base64=req.imageBase64,
        user_prompt=req.prompt or "Analyze this screen and detect any errors or issues.",
        language=req.language or "ta-IN"
    )

# ----------------- Voice & ElevenLabs Settings -----------------
class VoiceConfigRequest(BaseModel):
    elevenlabsApiKey: Optional[str] = None
    elevenlabsVoiceId: Optional[str] = None
    voiceSpeechProvider: Optional[str] = None

@router.post("/settings/voice")
async def update_voice_settings(req: VoiceConfigRequest):
    import re
    if req.elevenlabsApiKey is not None:
        cleaned_key = req.elevenlabsApiKey.strip()
        settings.ELEVENLABS_API_KEY = cleaned_key if cleaned_key else None
        
        # Persist to .env and backend/.env
        for env_path in [".env", "backend/.env", "../.env"]:
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        env_content = f.read()
                    if "ELEVENLABS_API_KEY=" in env_content:
                        env_content = re.sub(r"ELEVENLABS_API_KEY=.*", f"ELEVENLABS_API_KEY={cleaned_key}", env_content)
                    else:
                        env_content += f"\nELEVENLABS_API_KEY={cleaned_key}\n"
                    with open(env_path, "w", encoding="utf-8") as f:
                        f.write(env_content)
                except Exception:
                    pass

    if req.elevenlabsVoiceId is not None:
        settings.ELEVENLABS_VOICE_ID = req.elevenlabsVoiceId.strip()
    if req.voiceSpeechProvider is not None:
        settings.VOICE_SPEECH_PROVIDER = req.voiceSpeechProvider.strip()

    return {
        "status": "updated",
        "hasElevenLabsKey": bool(settings.ELEVENLABS_API_KEY),
        "voiceId": settings.ELEVENLABS_VOICE_ID,
        "provider": settings.VOICE_SPEECH_PROVIDER
    }

@router.get("/settings/voice")
async def get_voice_settings():
    return {
        "hasElevenLabsKey": bool(settings.ELEVENLABS_API_KEY),
        "voiceId": settings.ELEVENLABS_VOICE_ID,
        "provider": settings.VOICE_SPEECH_PROVIDER,
        "tamilVoice": settings.TAMIL_TTS_VOICE,
        "englishVoice": settings.ENGLISH_TTS_VOICE
    }
