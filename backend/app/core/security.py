import hmac
import hashlib
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from app.core.config import settings

ALGORITHM = "HS256"

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_pairing_code() -> str:
    """Generate a clean 6-character alphanumeric pairing code (e.g. LN-784-291)."""
    digits = "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))
    return f"LN-{digits[:3]}-{digits[3:]}"

def generate_confirmation_token(action_id: str, parameters: Dict[str, Any], expires_in_seconds: int = 300) -> str:
    """Generate an HMAC-signed one-time token for sensitive/destructive action confirmation."""
    expires_at = int(time.time()) + expires_in_seconds
    raw_payload = f"{action_id}:{sorted(parameters.items())}:{expires_at}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        raw_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    # format: exp::action::sig (avoiding collision with dotted action_ids like app.close)
    token = f"{expires_at}::{action_id}::{signature}"
    return token

def verify_confirmation_token(token: str, action_id: str, parameters: Dict[str, Any]) -> bool:
    """Verify an action confirmation token matches the action, parameters, and is not expired."""
    try:
        parts = token.split("::", 2)
        if len(parts) != 3:
            return False
        expires_at_str, token_action_id, signature = parts
        expires_at = int(expires_at_str)
        if time.time() > expires_at:
            return False
        if token_action_id != action_id:
            return False
        raw_payload = f"{action_id}:{sorted(parameters.items())}:{expires_at}"
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            raw_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False
