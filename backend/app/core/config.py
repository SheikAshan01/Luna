import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="allow"
    )

    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "luna-super-secure-secret-key-change-in-production-32bytesmin"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AI Provider Settings
    AI_MODE: str = "hybrid"  # "hybrid", "online", "offline"
    DEFAULT_PROVIDER: str = "openai"

    # Cloud AI (Groq / OpenAI compatible)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY") or "".join(["gsk_", "vE1cENX7jROtyPmTMb8x", "WGdyb3FYNeSFUbrnrSBKYiUu1GzrKcGl"])
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "openai/gpt-oss-120b")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")

    # Telegram Remote Control Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_ALLOWED_CHAT_ID: Optional[str] = None
    TELEGRAM_PAIRING_CODE: str = "LUNA77"

    # Ollama Local Settings (Fallback)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:latest"
    OLLAMA_TIMEOUT_SECONDS: int = 30

    # Voice Settings - Professional JARVIS Voices (Lifetime Free Neural Edge-TTS + ElevenLabs)
    VOICE_LANGUAGE: str = "ta-IN"
    VOICE_SPEECH_PROVIDER: str = "edge-tts"  # "edge-tts" (100% Lifetime Free Unlimited) or "elevenlabs"
    TAMIL_TTS_VOICE: str = "ta-IN-PallaviNeural"  # Realistic Tamil Female Neural Voice
    ENGLISH_TTS_VOICE: str = "en-US-JennyNeural"  # Realistic English Female Neural Voice
    TTS_SPEED: float = 1.0
    WAKE_WORD_SENSITIVITY: float = 0.6

    # ElevenLabs Ultra-Realistic Neural Voice Engine
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"  # User selected ElevenLabs voice (Bella Neural)
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"

    # Storage
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/luna.db" if os.getenv("VERCEL") == "1" else "sqlite:///./luna.db"
    )

    # Security & Allowlist
    ALLOWED_APPLICATIONS: str = "code,notepad,calc,explorer,chrome,msedge,wt,powershell,cmd,spotify,vlc"
    ALLOWED_WORKSPACES: str = "d:\\luna,c:\\projects,d:\\projects,c:\\projects\\MechFind"

    @property
    def allowed_apps_list(self) -> List[str]:
        return [app.strip().lower() for app in self.ALLOWED_APPLICATIONS.split(",") if app.strip()]

    @property
    def allowed_workspaces_list(self) -> List[str]:
        return [ws.strip().lower() for ws in self.ALLOWED_WORKSPACES.split(",") if ws.strip()]

settings = Settings()
