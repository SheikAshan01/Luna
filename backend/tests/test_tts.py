import pytest
from app.voice.tts import tts_engine

@pytest.mark.asyncio
async def test_tamil_tts_synthesis():
    tamil_sample = "வணக்கம், நான் லூனா உங்கள் தனிப்பட்ட ஏஐ உதவியாளர்."
    audio_bytes = await tts_engine.synthesize(
        text=tamil_sample,
        language="ta-IN"
    )
    assert audio_bytes is not None
    assert len(audio_bytes) > 500  # Valid MP3 audio file generated!

@pytest.mark.asyncio
async def test_tanglish_tts_synthesis():
    tanglish_sample = "Vanakkam sir, naan LUNA. Ungalukku eppadi help pannattum?"
    audio_bytes = await tts_engine.synthesize(
        text=tanglish_sample,
        language="ta-IN"
    )
    assert audio_bytes is not None
    assert len(audio_bytes) > 500

@pytest.mark.asyncio
async def test_get_voice_speak_endpoint():
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/voice/speak?text=Vanakkam+sir&language=ta-IN")
        assert res.status_code == 200
        assert len(res.content) > 500
