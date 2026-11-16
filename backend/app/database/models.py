from datetime import datetime, timezone
import json
import uuid
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime
from app.database.session import Base

def get_utc_now():
    return datetime.now(timezone.utc)

def generate_id():
    return str(uuid.uuid4())

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(64), primary_key=True, default=generate_id)
    device_name = Column(String(128), nullable=False)
    platform = Column(String(32), nullable=False)  # "windows", "android", "web"
    paired_at = Column(DateTime, default=get_utc_now)
    last_seen = Column(DateTime, default=get_utc_now)
    is_active = Column(Boolean, default=True)
    ip_address = Column(String(64), nullable=True)
    token_hash = Column(String(256), nullable=True)
    permissions = Column(Text, default="[]")  # JSON list of allowed permissions

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.device_name,
            "platform": self.platform,
            "isPaired": self.is_active,
            "isOnline": (datetime.now(timezone.utc) - (self.last_seen.replace(tzinfo=timezone.utc) if self.last_seen.tzinfo is None else self.last_seen)).total_seconds() < 120,
            "lastSeen": self.last_seen.isoformat(),
            "ipAddress": self.ip_address,
            "permissions": json.loads(self.permissions) if self.permissions else []
        }

class PairingRequest(Base):
    __tablename__ = "pairing_requests"

    id = Column(String(64), primary_key=True, default=generate_id)
    code = Column(String(32), unique=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    used_by_device_id = Column(String(64), nullable=True)

class Memory(Base):
    __tablename__ = "memories"

    id = Column(String(64), primary_key=True, default=generate_id)
    category = Column(String(64), nullable=False)  # user_preference, communication_preference, etc.
    key = Column(String(128), nullable=False)
    value = Column(Text, nullable=False)
    tags = Column(Text, default="[]")  # JSON string
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "key": self.key,
            "value": self.value,
            "tags": json.loads(self.tags) if self.tags else [],
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat()
        }

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, default=generate_id)
    title = Column(String(256), default="New Conversation")
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat()
        }

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, default=generate_id)
    conversation_id = Column(String(64), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    provider = Column(String(32), nullable=True)
    language = Column(String(32), default="en")
    tool_calls = Column(Text, nullable=True)  # JSON string
    tool_results = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "conversationId": self.conversation_id,
            "role": self.role,
            "content": self.content,
            "provider": self.provider,
            "language": self.language,
            "toolCalls": json.loads(self.tool_calls) if self.tool_calls else None,
            "toolResults": json.loads(self.tool_results) if self.tool_results else None,
            "timestamp": self.created_at.isoformat()
        }

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, default=generate_id)
    action_id = Column(String(64), nullable=False)
    actor_type = Column(String(32), default="user")  # "user", "device", "ai", "automation"
    actor_id = Column(String(64), nullable=True)
    permission_level = Column(String(32), nullable=False)
    parameters = Column(Text, default="{}")
    status = Column(String(32), default="SUCCESS")  # SUCCESS, REJECTED, FAILED, CONFIRMATION_PENDING
    result_data = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "actionId": self.action_id,
            "actorType": self.actor_type,
            "actorId": self.actor_id,
            "permissionLevel": self.permission_level,
            "parameters": json.loads(self.parameters) if self.parameters else {},
            "status": self.status,
            "resultData": self.result_data,
            "timestamp": self.timestamp.isoformat()
        }

class Automation(Base):
    __tablename__ = "automations"

    id = Column(String(64), primary_key=True, default=generate_id)
    name = Column(String(128), nullable=False)
    description = Column(String(256), nullable=True)
    schedule_type = Column(String(32), nullable=False)  # "cron", "interval", "once"
    schedule_expression = Column(String(128), nullable=False)
    action_id = Column(String(64), nullable=False)
    action_parameters = Column(Text, default="{}")
    is_enabled = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "scheduleType": self.schedule_type,
            "scheduleExpression": self.schedule_expression,
            "actionId": self.action_id,
            "actionParameters": json.loads(self.action_parameters) if self.action_parameters else {},
            "enabled": self.is_enabled,
            "lastRun": self.last_run.isoformat() if self.last_run else None,
            "nextRun": self.next_run.isoformat() if self.next_run else None,
            "createdAt": self.created_at.isoformat()
        }
