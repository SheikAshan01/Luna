import io
import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("luna.voice.stt")

class STTEngine:
    @classmethod
    async def transcribe(cls, audio_bytes: bytes, filename: str = "audio.wav", language: Optional[str] = None) -> Dict[str, Any]:
        # Filter out tiny accidental noise clicks (< 3000 bytes)
        if not audio_bytes or len(audio_bytes) < 3000:
            return {"text": "", "error": "Audio clip too short or empty"}

        # If Groq or OpenAI API Key is present, call Whisper endpoint
        if settings.OPENAI_API_KEY:
            try:
                base_url = settings.OPENAI_BASE_URL.rstrip("/")
                url = f"{base_url}/audio/transcriptions"
                headers = {
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                
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
                clean_lang = None
                if language and language.strip().lower() not in ["auto", "none", ""]:
                    # Groq Whisper requires ISO-639-1 code (e.g. 'ta', 'en')
                    clean_lang = language.split("-")[0].strip().lower()
                    if clean_lang:
                        data["language"] = clean_lang

                # Avoid long biasing prompts as they cause Whisper to hallucinate on background noise/silence
                data["temperature"] = "0.0"

                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(url, headers=headers, files=files, data=data)
                    if res.status_code == 200:
                        text = res.json().get("text", "").strip()
                        # Filter out known Whisper silence hallucinations
                        clean_lower = text.lower().strip(" .!?,;:")
                        hallucinations = {
                            "thank you", "thanks for watching", "subtitles by", "amara.org",
                            "mbc", "subscribe", "you", "bye", "நன்றி", "பார்த்ததற்கு நன்றி",
                            "வணக்கம்", "மகிழ்ச்சி", "...", "ஆமாம்", "என்னை சப்ஸ்கிரைப் செய்யவும்",
                            "நான் வருக்கிறேன்", "வருக்கிறேன்", "நான் வருகிறேன்", "அவ்விக்கு",
                            "அவ்விக்குroitலாக", "வணக்கம் லூனா", "வணக்கம்."
                        }
                        # If the entire transcription is a hallucination or repetitive gibberish
                        if clean_lower in hallucinations or len(clean_lower) <= 2 or "roit" in clean_lower:
                            text = ""
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
