import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.database.session import SessionLocal
from app.database.models import Memory

SENSITIVE_PATTERNS = [
    re.compile(r"api[_-]?key", re.I),
    re.compile(r"password", re.I),
    re.compile(r"secret", re.I),
    re.compile(r"bearer\s+[a-z0-9_\-\.]+", re.I),
    re.compile(r"token", re.I),
    re.compile(r"private[_-]?key", re.I)
]

class MemoryManager:
    @staticmethod
    def _is_sensitive(key: str, value: str) -> bool:
        combined = f"{key} {value}"
        return any(pattern.search(combined) for pattern in SENSITIVE_PATTERNS)

    @classmethod
    def create_or_update(
        cls,
        category: str,
        key: str,
        value: str,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        if cls._is_sensitive(key, value):
            raise ValueError("Security violation: Storing secrets, passwords, or API keys in memory is prohibited.")

        db = SessionLocal()
        try:
            existing = db.query(Memory).filter(Memory.category == category, Memory.key == key).first()
            if existing:
                existing.value = value
                if tags is not None:
                    existing.tags = json.dumps(tags)
                existing.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(existing)
                return existing.to_dict()
            else:
                new_mem = Memory(
                    category=category,
                    key=key,
                    value=value,
                    tags=json.dumps(tags or []),
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(new_mem)
                db.commit()
                db.refresh(new_mem)
                return new_mem.to_dict()
        finally:
            db.close()

    @classmethod
    def list_memories(cls, category: Optional[str] = None, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            q = db.query(Memory)
            if category:
                q = q.filter(Memory.category == category)
            if search_query:
                term = f"%{search_query.lower()}%"
                q = q.filter(Memory.key.ilike(term) | Memory.value.ilike(term))
            memories = q.order_by(Memory.updated_at.desc()).all()
            return [m.to_dict() for m in memories]
        finally:
            db.close()

    @classmethod
    def delete_memory(cls, memory_id: str) -> bool:
        db = SessionLocal()
        try:
            mem = db.query(Memory).filter(Memory.id == memory_id).first()
            if mem:
                db.delete(mem)
                db.commit()
                return True
            return False
        finally:
            db.close()

    @classmethod
    def clear_all(cls) -> int:
        db = SessionLocal()
        try:
            count = db.query(Memory).delete()
            db.commit()
            return count
        finally:
            db.close()

    @classmethod
    def export_all(cls) -> Dict[str, Any]:
        mems = cls.list_memories()
        return {
            "version": "1.0",
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(mems),
            "memories": mems
        }

memory_manager = MemoryManager()
