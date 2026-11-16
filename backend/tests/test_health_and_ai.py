import pytest
from app.ai.brain import ai_brain
from app.core.config import settings

@pytest.mark.asyncio
async def test_ai_brain_health():
    status = await ai_brain.get_health_status()
    assert "mode" in status
    assert "openai" in status
    assert "ollama" in status

@pytest.mark.asyncio
async def test_ai_brain_tamil_tanglish_fallback():
    # Test Tanglish greeting query
    res = await ai_brain.chat(
        messages=[{"role": "user", "content": "Hey Luna, epdi irukka?"}]
    )
    assert res.content is not None
    assert len(res.content) > 0
    # Should contain warm Tamil script or Tanglish response
    assert any(w in res.content.lower() for w in ["luna", "irukken", "help", "vanakkam"]) or any(w in res.content for w in ["லூனா", "நலம்", "உதவி", "வணக்கம்", "நன்றாக", "இருக்கிறேன்", "சார்"])

@pytest.mark.asyncio
async def test_ai_brain_open_app_tanglish():
    res = await ai_brain.chat(
        messages=[{"role": "user", "content": "Luna, VS Code open pannu"}]
    )
    assert res.content is not None
    # Check tool call executed
    assert len(res.tool_calls) > 0 or len(res.tool_results) > 0
    assert any(w in res.content.lower() for w in ["open", "code", "pandren", "ready"]) or "திறக்கிறேன்" in res.content

@pytest.mark.asyncio
async def test_ai_brain_battery_query_tanglish():
    res = await ai_brain.chat(
        messages=[{"role": "user", "content": "Luna, PC battery status sollu"}]
    )
    assert res.content is not None
    assert any(w in res.content.lower() for w in ["battery", "pc", "power", "charge"]) or any(w in res.content for w in ["பேட்டரி", "மின்சாரம்", "கணினி"])
