import pytest
import os
from app.actions.registry import action_registry
from app.actions.executor import ActionExecutor

@pytest.mark.asyncio
async def test_action_registry_new_powers():
    actions = action_registry.list_actions()
    action_ids = [a["id"] for a in actions]
    
    assert "vision.analyze_screen" in action_ids
    assert "media.volume_set" in action_ids
    assert "media.volume_mute" in action_ids
    assert "media.play_pause" in action_ids
    assert "media.play_youtube" in action_ids
    assert "system.morning_briefing" in action_ids
    assert "files.organize_folder" in action_ids
    assert "memory.save" in action_ids
    assert "memory.search" in action_ids

@pytest.mark.asyncio
async def test_media_controls_execution():
    vol_res = await ActionExecutor.execute("media.volume_set", {"level": 40})
    assert vol_res["success"] is True
    assert vol_res["data"]["level"] == 40

    mute_res = await ActionExecutor.execute("media.volume_mute", {})
    assert mute_res["success"] is True

    pp_res = await ActionExecutor.execute("media.play_pause", {})
    assert pp_res["success"] is True

@pytest.mark.asyncio
async def test_morning_briefing_execution():
    res = await ActionExecutor.execute("system.morning_briefing", {})
    assert res["success"] is True
    data = res["data"]
    assert "briefing" in data
    assert "dateTime" in data
    assert "temperature" in data

@pytest.mark.asyncio
async def test_memory_save_and_search():
    save_res = await ActionExecutor.execute("memory.save", {
        "key": "mechfind_db_port",
        "value": "5432",
        "category": "project"
    })
    assert save_res["success"] is True
    assert save_res["data"]["status"] == "Memory stored successfully."

    search_res = await ActionExecutor.execute("memory.search", {
        "query": "mechfind"
    })
    assert search_res["success"] is True
    assert search_res["data"]["count"] >= 1
    assert any("mechfind" in r["key"].lower() for r in search_res["data"]["results"])

@pytest.mark.asyncio
async def test_file_organizer_execution(tmp_path):
    # Test organizing a temporary folder
    test_dir = tmp_path / "test_downloads"
    test_dir.mkdir()
    (test_dir / "sample.pdf").write_text("dummy doc")
    (test_dir / "pic.png").write_text("dummy image")
    (test_dir / "script.py").write_text("print('hello')")

    res = await ActionExecutor._handle_files_organize_folder({"folder": str(test_dir)})
    # Notice: folder target check handled gracefully
