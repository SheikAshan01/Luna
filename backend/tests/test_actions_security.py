import pytest
import os
from app.actions.registry import action_registry, PermissionLevel
from app.actions.executor import ActionExecutor
from app.core.security import generate_confirmation_token, verify_confirmation_token

@pytest.mark.asyncio
async def test_action_registry_defaults():
    actions = action_registry.list_actions()
    action_ids = [a["id"] for a in actions]
    assert "system.get_health" in action_ids
    assert "system.get_battery" in action_ids
    assert "app.open" in action_ids
    assert "app.close" in action_ids
    assert "files.delete" in action_ids
    assert "pc.shutdown" in action_ids

@pytest.mark.asyncio
async def test_system_health_execution():
    res = await ActionExecutor.execute("system.get_health", {})
    assert res["success"] is True
    assert "cpuUsagePercent" in res["data"]
    assert "memoryUsagePercent" in res["data"]
    assert "diskUsagePercent" in res["data"]

@pytest.mark.asyncio
async def test_system_battery_execution():
    res = await ActionExecutor.execute("system.get_battery", {})
    assert res["success"] is True
    assert "hasBattery" in res["data"]

@pytest.mark.asyncio
async def test_sensitive_action_requires_confirmation():
    # Attempt to close app without confirmation
    res = await ActionExecutor.execute("app.close", {"app_name": "notepad"})
    assert res["success"] is False
    assert res["confirmationRequired"] is True
    assert "confirmationToken" in res
    assert res["permissionLevel"] == PermissionLevel.SENSITIVE.value

    # Now confirm with valid token
    token = res["confirmationToken"]
    confirmed_res = await ActionExecutor.execute(
        "app.close",
        {"app_name": "notepad"},
        confirmation_token=token
    )
    assert confirmed_res["success"] is True
    assert "instancesTerminated" in confirmed_res["data"]

@pytest.mark.asyncio
async def test_destructive_action_confirmation():
    # Deleting a file requires confirmation
    test_file = "d:\\luna\\test_delete_me.tmp"
    with open(test_file, "w") as f:
        f.write("temporary file")

    # Step 1: Attempt without token -> should reject with confirmation challenge
    res1 = await ActionExecutor.execute("files.delete", {"path": test_file})
    assert res1["success"] is False
    assert res1["confirmationRequired"] is True
    assert res1["permissionLevel"] == PermissionLevel.DESTRUCTIVE.value
    token = res1["confirmationToken"]

    # Step 2: Confirm with token -> file deleted
    res2 = await ActionExecutor.execute("files.delete", {"path": test_file}, confirmation_token=token)
    assert res2["success"] is True
    assert not os.path.exists(test_file)

@pytest.mark.asyncio
async def test_app_open_allowlist_enforcement():
    # Disallowed app should raise error or fail gracefully
    res = await ActionExecutor.execute("app.open", {"app_name": "malicious_ransomware.exe"})
    assert res["success"] is False
    assert "allowlist" in res["error"].lower()
