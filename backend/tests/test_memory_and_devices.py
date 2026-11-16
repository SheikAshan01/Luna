import pytest
from app.memory.manager import memory_manager
from app.devices.manager import device_manager

def test_memory_crud_and_security():
    # 1. Create Memory
    mem = memory_manager.create_or_update(
        category="project_context",
        key="primary_project",
        value="MechFind",
        tags=["engineering", "active"]
    )
    assert mem["key"] == "primary_project"
    assert mem["value"] == "MechFind"

    # 2. Search Memory
    results = memory_manager.list_memories(search_query="mechfind")
    assert len(results) >= 1
    assert results[0]["value"] == "MechFind"

    # 3. Security test: Storing API key or password must be rejected
    with pytest.raises(ValueError, match="Security violation"):
        memory_manager.create_or_update(
            category="user_preference",
            key="my_secret_password",
            value="SuperSecret123"
        )

    # 4. Clean up
    deleted = memory_manager.delete_memory(mem["id"])
    assert deleted is True

def test_device_pairing_and_revocation():
    # 1. Init pairing code
    pair_req = device_manager.create_pairing_request()
    code = pair_req["pairingCode"]
    assert code.startswith("LN-")

    # 2. Pair device
    paired = device_manager.pair_device(
        code=code,
        device_name="Samsung Galaxy S24",
        platform="android"
    )
    assert "deviceId" in paired
    assert "token" in paired
    device_id = paired["deviceId"]

    # 3. List devices
    devices = device_manager.list_devices()
    assert any(d["id"] == device_id for d in devices)

    # 4. Revoke device
    revoked = device_manager.revoke_device(device_id)
    assert revoked is True
    updated_devices = device_manager.list_devices()
    target = next(d for d in updated_devices if d["id"] == device_id)
    assert target["isPaired"] is False
