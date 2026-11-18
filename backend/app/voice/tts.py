import io
import asyncio
import logging
import re
from typing import Optional
import httpx
import edge_tts
from gtts import gTTS
from app.core.config import settings

logger = logging.getLogger("luna.voice.tts")

class TTSEngine:
    _cached_voice_id: Optional[str] = None

    @staticmethod
    def _is_tamil_or_tanglish(text: str) -> bool:
        # Check Tamil unicode range
        if any('\u0B80' <= char <= '\u0BFF' for char in text):
            return True
        # Common Tanglish conversational keywords
        tanglish_words = [
            "vanakkam", "epdi", "eppadi", "irukken", "irukku", "pandren", "pannu", 
            "sollu", "solren", "boss", "thira", "mudila", "aachu", "paaru", "kooda",
            "unga", "ungalukku", "enna", "romba", "nalla", "kandippa"
        ]
        text_lower = text.lower()
        if any(re.search(rf"\b{w}\b", text_lower) for w in tanglish_words):
            return True
        return False

    @staticmethod
    def _detect_emotion_params(text: str) -> dict:
        text_lower = text.lower()
        sad_indicators = [
            "கவலைப்பட", "மனசு", "வருத்தம்", "சோகம்", "அழாதே", "நண்பன்", "பக்கத்தில்", "துயரம்", 
            "sad", "sorry", "empathy", "hurt", "pain", "crying", "miss you", "feel better", "alone"
        ]
        if any(w in text_lower for w in sad_indicators):
            return {"rate": "-6%", "pitch": "-3Hz", "emotion": "sad"}

        happy_indicators = [
            "வாவ்", "வாழ்த்துகள்", "சந்தோஷம்", "மகிழ்ச்சி", "வெற்றி", "சூப்பர்", "அருமை", "கொண்டாடு",
            "super", "congratulations", "happy", "awesome", "great", "celebrate", "wow", "yay", "hooray"
        ]
        if any(w in text_lower for w in happy_indicators) or any(emoji in text for emoji in ["🎉", "✨", "🎊", "🥳"]):
            return {"rate": "+20%", "pitch": "+3Hz", "emotion": "happy"}

        return {"rate": "+15%", "pitch": "+0Hz", "emotion": "neutral"}

    @classmethod
    async def synthesize(
        cls,
        text: str,
        language: Optional[str] = None,
        voice: Optional[str] = None,
        rate: Optional[str] = None
    ) -> bytes:
        if not text or not text.strip():
            return b""

        # Clean markdown symbols for natural speech pronunciation
        clean_text = re.sub(r'[*#_`~\[\]<>]', '', text).strip()

        # 1. Primary Priority: ElevenLabs Ultra-Realistic Neural AI Voice
        use_elevenlabs = settings.VOICE_SPEECH_PROVIDER.lower() == "elevenlabs" and bool(settings.ELEVENLABS_API_KEY)
        if use_elevenlabs:
            try:
                # Use cached working voice if already determined (avoids 402 lag)
                voice_id = cls._cached_voice_id or voice or settings.ELEVENLABS_VOICE_ID or "EXAVITQu4vr4xnSDxMaL"
                url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                headers = {
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                }
                payload = {
                    "text": clean_text,
                    "model_id": settings.ELEVENLABS_MODEL_ID or "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.8
                    }
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200 and resp.content:
                        cls._cached_voice_id = voice_id
                        return resp.content
                    elif resp.status_code in [400, 402] and voice_id != "EXAVITQu4vr4xnSDxMaL":
                        # Free plan restriction: ElevenLabs library voices require paid subscription on API.
                        # Seamlessly retry with ElevenLabs Bella voice (verified working on free tier)
                        logger.info("ElevenLabs voice required paid tier; switching to ElevenLabs Bella voice.")
                        cls._cached_voice_id = "EXAVITQu4vr4xnSDxMaL"
                        fb_url = "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL"
                        fb_resp = await client.post(fb_url, headers=headers, json=payload)
                        if fb_resp.status_code == 200 and fb_resp.content:
                            return fb_resp.content
                    else:
                        logger.warning(f"ElevenLabs TTS returned [{resp.status_code}]: {resp.text}. Falling back to Edge-TTS.")
            except Exception as e:
                logger.warning(f"ElevenLabs synthesis error: {e}. Falling back to Edge-TTS.")

        # 2. Secondary Priority: Edge-TTS (Free, fast, natural neural voice)
        target_voice = voice
        is_tamil = cls._is_tamil_or_tanglish(clean_text) or (language and "ta" in language.lower() and not cls._is_pure_english(clean_text))

        if not target_voice or target_voice == settings.ELEVENLABS_VOICE_ID:
            if is_tamil:
                target_voice = settings.TAMIL_TTS_VOICE  # ta-IN-PallaviNeural
            else:
                target_voice = settings.ENGLISH_TTS_VOICE  # en-US-JennyNeural

        # Dynamic emotion pacing and pitch modulation
        emo = cls._detect_emotion_params(clean_text)
        rate_str = rate or emo["rate"]
        pitch_str = emo["pitch"]

        # Primary: edge-tts (High-fidelity professional neural voice)
        try:
            communicate = edge_tts.Communicate(clean_text, target_voice, rate=rate_str, pitch=pitch_str)
            audio_buffer = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.extend(chunk["data"])
            if audio_buffer:
                return bytes(audio_buffer)
        except Exception as e:
            logger.warning(f"edge-tts synthesis failed: {e}. Falling back to gTTS.")

        # Fallback: gTTS
        try:
            gtts_lang = "ta" if is_tamil else "en"
            tts = gTTS(text=text, lang=gtts_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read()
        except Exception as e:
            logger.error(f"All TTS synthesis engines failed: {e}")
            raise RuntimeError(f"Speech synthesis error: {e}")

    @staticmethod
    def _is_pure_english(text: str) -> bool:
        # Check if text is predominantly standard English words and no Tamil chars
        has_tamil_chars = any('\u0B80' <= char <= '\u0BFF' for char in text)
        if has_tamil_chars:
            return False
        # If starts with Yes sir / Understood / Sure / Hello / Certainly
        starts = ["yes sir", "certainly", "understood", "right away", "sure", "hello", "at your service"]
        text_lower = text.lower().strip()
        return any(text_lower.startswith(s) for s in starts)

tts_engine = TTSEngine()
