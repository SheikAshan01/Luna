import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from app.database.session import SessionLocal
from app.database.models import Device, PairingRequest
from app.core.security import generate_pairing_code, create_access_token

class DeviceManager:
    @classmethod
    def create_pairing_request(cls) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            code = generate_pairing_code()
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
            req = PairingRequest(
                code=code,
                expires_at=expires_at,
                is_used=False
            )
            db.add(req)
            db.commit()
            return {
                "pairingCode": code,
                "expiresAt": expires_at.isoformat(),
                "expiresInSeconds": 600
            }
        finally:
            db.close()

    @classmethod
    def pair_device(
        cls,
        code: str,
        device_name: str,
        platform: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            req = db.query(PairingRequest).filter(
                PairingRequest.code == code.strip().upper(),
                PairingRequest.is_used == False
            ).first()

            if not req:
                raise ValueError("Invalid pairing code.")

            # Check expiration
            expires_at = req.expires_at.replace(tzinfo=timezone.utc) if req.expires_at.tzinfo is None else req.expires_at
            if datetime.now(timezone.utc) > expires_at:
                raise ValueError("Pairing code has expired. Please generate a new code on your PC.")

            # Create Device
            device = Device(
                device_name=device_name,
                platform=platform,
                ip_address=ip_address,
                is_active=True,
                permissions=json.dumps(["chat", "voice", "app_open", "system_health", "battery"])
            )
            db.add(device)
            db.flush()

            # Mark code as used
            req.is_used = True
            req.used_by_device_id = device.id

            # Issue JWT token for this device
            token = create_access_token({
                "sub": device.id,
                "device_name": device_name,
                "platform": platform,
                "type": "device"
            })
            device.token_hash = hashlib.sha256(token.encode()).hexdigest()
            db.commit()

            return {
                "deviceId": device.id,
                "token": token,
                "deviceName": device.device_name,
                "pairedAt": device.paired_at.isoformat()
            }
        finally:
            db.close()

    @classmethod
    def list_devices(cls) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            devices = db.query(Device).order_by(Device.last_seen.desc()).all()
            return [d.to_dict() for d in devices]
        finally:
            db.close()

    @classmethod
    def ping_device(cls, device_id: str, ip_address: Optional[str] = None) -> bool:
        db = SessionLocal()
        try:
            device = db.query(Device).filter(Device.id == device_id).first()
            if device:
                device.last_seen = datetime.now(timezone.utc)
                if ip_address:
                    device.ip_address = ip_address
                db.commit()
                return True
            return False
        finally:
            db.close()

    @classmethod
    def revoke_device(cls, device_id: str) -> bool:
        db = SessionLocal()
        try:
            device = db.query(Device).filter(Device.id == device_id).first()
            if device:
                device.is_active = False
                device.token_hash = None
                db.commit()
                return True
            return False
        finally:
            db.close()

device_manager = DeviceManager()
