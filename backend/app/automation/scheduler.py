import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.database.session import SessionLocal
from app.database.models import Automation
from app.actions.executor import ActionExecutor

logger = logging.getLogger("luna.automation")

class AutomationScheduler:
    def __init__(self):
        self._is_running = False
        self._loop_task: Optional[asyncio.Task] = None

    async def start(self):
        if not self._is_running:
            self._is_running = True
            self._loop_task = asyncio.create_task(self._scheduler_loop())
            logger.info("Automation scheduler started.")

    async def stop(self):
        self._is_running = False
        if self._loop_task:
            self._loop_task.cancel()

    async def _scheduler_loop(self):
        while self._is_running:
            try:
                await self._check_and_run_tasks()
            except Exception as e:
                logger.error(f"Error in automation loop: {e}")
            await asyncio.sleep(10)  # Check every 10 seconds

    async def _check_and_run_tasks(self):
        db = SessionLocal()
        try:
            tasks = db.query(Automation).filter(Automation.is_enabled == True).all()
            now = datetime.now(timezone.utc)
            for t in tasks:
                should_run = False
                if t.schedule_type == "once" and t.next_run:
                    nxt = t.next_run.replace(tzinfo=timezone.utc) if t.next_run.tzinfo is None else t.next_run
                    if now >= nxt and not t.last_run:
                        should_run = True
                elif t.schedule_type == "interval":
                    if not t.last_run:
                        should_run = True
                    else:
                        lst = t.last_run.replace(tzinfo=timezone.utc) if t.last_run.tzinfo is None else t.last_run
                        interval_secs = int(t.schedule_expression) if t.schedule_expression.isdigit() else 3600
                        if (now - lst).total_seconds() >= interval_secs:
                            should_run = True

                if should_run:
                    params = json.loads(t.action_parameters) if t.action_parameters else {}
                    await ActionExecutor.execute(t.action_id, params, actor_type="automation", actor_id=t.id)
                    t.last_run = now
                    if t.schedule_type == "once":
                        t.is_enabled = False
                    db.commit()
        finally:
            db.close()

    @classmethod
    def list_tasks(cls) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            tasks = db.query(Automation).order_by(Automation.created_at.desc()).all()
            return [t.to_dict() for t in tasks]
        finally:
            db.close()

    @classmethod
    def create_task(
        cls,
        name: str,
        schedule_type: str,
        schedule_expression: str,
        action_id: str,
        action_parameters: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            task = Automation(
                name=name,
                description=description,
                schedule_type=schedule_type,
                schedule_expression=schedule_expression,
                action_id=action_id,
                action_parameters=json.dumps(action_parameters or {}),
                is_enabled=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(task)
            db.commit()
            db.refresh(task)
            return task.to_dict()
        finally:
            db.close()

    @classmethod
    def toggle_task(cls, task_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            task = db.query(Automation).filter(Automation.id == task_id).first()
            if task:
                task.is_enabled = not task.is_enabled
                db.commit()
                db.refresh(task)
                return task.to_dict()
            return None
        finally:
            db.close()

    @classmethod
    def delete_task(cls, task_id: str) -> bool:
        db = SessionLocal()
        try:
            task = db.query(Automation).filter(Automation.id == task_id).first()
            if task:
                db.delete(task)
                db.commit()
                return True
            return False
        finally:
            db.close()

automation_scheduler = AutomationScheduler()
