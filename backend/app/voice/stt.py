import io
import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("luna.voice.stt")

class STTEngine:
    @classmethod
    async def transcribe(cls, audio_bytes: bytes, filename: str = "audio.wav", language: Optional[str] = None) -> Dict[str, Any]:
        if not audio_bytes or len(audio_bytes) < 100:
            return {"text": "", "error": "Empty audio buffer"}

        # If Groq or OpenAI API Key is present, call Whisper endpoint
        if settings.OPENAI_API_KEY:
            try:
                base_url = settings.OPENAI_BASE_URL.rstrip("/")
                url = f"{base_url}/audio/transcriptions"
                headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
                
                # Determine model: if Groq, use whisper-large-v3-turbo; else whisper-1
                is_groq = "groq" in base_url.lower()
                model_name = "whisper-large-v3-turbo" if is_groq else "whisper-1"

                # Detect mime type from filename
                ext = filename.split(".")[-1].lower() if "." in filename else "webm"
                mime_map = {
                    "webm": "audio/webm",
                    "wav": "audio/wav",
                    "mp3": "audio/mpeg",
                    "ogg": "audio/ogg",
                    "m4a": "audio/mp4",
                    "mp4": "audio/mp4",
                    "aac": "audio/aac"
                }
                mime_type = mime_map.get(ext, "audio/webm")

                files = {"file": (f"speech.{ext}", audio_bytes, mime_type)}
                data = {"model": model_name}
                if language:
                    data["language"] = language

                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(url, headers=headers, files=files, data=data)
                    if res.status_code == 200:
                        text = res.json().get("text", "").strip()
                        return {"text": text, "engine": f"whisper ({model_name})"}
                    else:
                        logger.error(f"Whisper transcription failed [{res.status_code}]: {res.text}")
            except Exception as e:
                logger.error(f"Whisper API error: {e}")

        return {
            "text": "",
            "bytesReceived": len(audio_bytes),
            "error": "Transcription engine unavailable"
        }

stt_engine = STTEngine()
