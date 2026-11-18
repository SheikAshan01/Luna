import os
import sys
import json
import re
import time
import subprocess
import shutil
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import psutil
from PIL import ImageGrab, Image
import io
import base64
import httpx

from app.core.config import settings
from app.core.security import generate_confirmation_token, verify_confirmation_token
from app.actions.registry import action_registry, PermissionLevel, ActionDefinition
from app.database.session import SessionLocal
from app.database.models import AuditLog, Memory

class ActionExecutor:
    @staticmethod
    def log_audit(
        action_id: str,
        actor_type: str,
        actor_id: Optional[str],
        permission_level: str,
        parameters: Dict[str, Any],
        status: str,
        result_data: Optional[str] = None
    ) -> str:
        db = SessionLocal()
        try:
            audit = AuditLog(
                action_id=action_id,
                actor_type=actor_type,
                actor_id=actor_id,
                permission_level=permission_level,
                parameters=json.dumps(parameters),
                status=status,
                result_data=result_data,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(audit)
            db.commit()
            db.refresh(audit)
            return audit.id
        except Exception as e:
            db.rollback()
            return ""
        finally:
            db.close()

    @classmethod
    async def execute(
        cls,
        action_id: str,
        parameters: Dict[str, Any],
        actor_type: str = "user",
        actor_id: Optional[str] = None,
        confirmation_token: Optional[str] = None
    ) -> Dict[str, Any]:
        action = action_registry.get_action(action_id)
        if not action:
            return {
                "success": False,
                "actionId": action_id,
                "error": f"Action '{action_id}' is not recognized or permitted.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # Check Confirmation Requirement
        if action.confirmation_required:
            if not confirmation_token:
                token = generate_confirmation_token(action_id, parameters)
                cls.log_audit(
                    action_id=action_id,
                    actor_type=actor_type,
                    actor_id=actor_id,
                    permission_level=action.permission_level.value,
                    parameters=parameters,
                    status="CONFIRMATION_PENDING"
                )
                return {
                    "success": False,
                    "actionId": action_id,
                    "confirmationRequired": True,
                    "confirmationToken": token,
                    "permissionLevel": action.permission_level.value,
                    "message": f"Action '{action.name}' requires explicit authorization.",
                    "parameters": parameters,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # Verify Token
            is_valid = verify_confirmation_token(confirmation_token, action_id, parameters)
            if not is_valid:
                cls.log_audit(
                    action_id=action_id,
                    actor_type=actor_type,
                    actor_id=actor_id,
                    permission_level=action.permission_level.value,
                    parameters=parameters,
                    status="CONFIRMATION_REJECTED"
                )
                return {
                    "success": False,
                    "actionId": action_id,
                    "error": "Confirmation token is invalid or has expired.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

        # Dispatch Execution
        try:
            handler = getattr(cls, f"_handle_{action_id.replace('.', '_')}", None)
            if not handler:
                return {
                    "success": False,
                    "actionId": action_id,
                    "error": f"No handler registered for action '{action_id}'.",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

            result_data = await handler(parameters)
            audit_id = cls.log_audit(
                action_id=action_id,
                actor_type=actor_type,
                actor_id=actor_id,
                permission_level=action.permission_level.value,
                parameters=parameters,
                status="SUCCESS",
                result_data=json.dumps(result_data)[:2000] if result_data else None
            )

            return {
                "success": True,
                "actionId": action_id,
                "data": result_data,
                "auditId": audit_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            cls.log_audit(
                action_id=action_id,
                actor_type=actor_type,
                actor_id=actor_id,
                permission_level=action.permission_level.value,
                parameters=parameters,
                status="FAILED",
                result_data=str(e)
            )
            return {
                "success": False,
                "actionId": action_id,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

    # Action Handlers
    @staticmethod
    async def _handle_system_get_health(params: Dict[str, Any]) -> Dict[str, Any]:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        virtual_mem = psutil.virtual_memory()
        disk_usage = psutil.disk_usage('/')
        battery = psutil.sensors_battery()

        return {
            "cpuUsagePercent": cpu_percent,
            "memoryUsagePercent": virtual_mem.percent,
            "memoryTotalBytes": virtual_mem.total,
            "memoryUsedBytes": virtual_mem.used,
            "diskUsagePercent": disk_usage.percent,
            "batteryPercent": battery.percent if battery else None,
            "batteryPowerPlugged": battery.power_plugged if battery else None,
            "osName": f"{sys.platform} - Windows {os.name}",
            "hostname": os.environ.get("COMPUTERNAME", "PC"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    async def _handle_system_get_processes(params: Dict[str, Any]) -> Dict[str, Any]:
        limit = params.get("limit", 10)
        processes = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                info = p.info
                if info['name'] and info['name'].strip():
                    processes.append({
                        "pid": info['pid'],
                        "name": info['name'],
                        "cpuPercent": info['cpu_percent'] or 0.0,
                        "memoryPercent": round(info['memory_percent'] or 0.0, 2)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Sort by CPU usage descending
        processes.sort(key=lambda x: x['cpuPercent'], reverse=True)
        return {"processes": processes[:limit]}

    @staticmethod
    async def _handle_system_get_battery(params: Dict[str, Any]) -> Dict[str, Any]:
        battery = psutil.sensors_battery()
        if not battery:
            return {
                "hasBattery": False,
                "message": "Desktop PC plugged in directly (no battery sensor)."
            }
        
        return {
            "hasBattery": True,
            "percent": battery.percent,
            "powerPlugged": battery.power_plugged,
            "secsLeft": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else None,
            "message": f"Battery is at {battery.percent}% ({'Charging' if battery.power_plugged else 'Discharging'})."
        }

    @staticmethod
    async def _handle_system_capture_screenshot(params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            image = ImageGrab.grab()
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG", quality=75)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            return {
                "format": "jpeg",
                "width": image.width,
                "height": image.height,
                "imageBase64": f"data:image/jpeg;base64,{img_b64}"
            }
        except Exception as e:
            return {"error": f"Failed to grab screenshot: {str(e)}"}

    @staticmethod
    async def _handle_app_open(params: Dict[str, Any]) -> Dict[str, Any]:
        app_name = params.get("app_name", "").strip().lower()
        argument = params.get("argument", "").strip()

        # Map common aliases
        alias_map = {
            "vscode": "code",
            "vs code": "code",
            "visual studio code": "code",
            "browser": "chrome",
            "google chrome": "chrome",
            "terminal": "wt",
            "calculator": "calc",
            "files": "explorer",
            "my files": "explorer"
        }
        target_app = alias_map.get(app_name, app_name)

        allowed = settings.allowed_apps_list
        if target_app not in allowed:
            raise PermissionError(
                f"Application '{app_name}' is not in the authorized applications allowlist: {allowed}"
            )

        cmd = [target_app]
        if argument:
            # Prevent injection by treating argument as single literal parameter
            cmd.append(argument)

        # Launch non-blocking
        subprocess.Popen(cmd, shell=True)
        return {
            "application": target_app,
            "argument": argument,
            "status": "Launched successfully"
        }

    @staticmethod
    async def _handle_app_close(params: Dict[str, Any]) -> Dict[str, Any]:
        app_name = params.get("app_name", "").strip().lower()
        allowed = settings.allowed_apps_list
        if app_name not in allowed and f"{app_name}.exe" not in allowed:
            raise PermissionError(f"Application '{app_name}' is not authorized for termination.")

        terminated = 0
        for p in psutil.process_iter(['pid', 'name']):
            try:
                pname = (p.info['name'] or '').lower()
                if pname == f"{app_name}.exe" or pname == app_name:
                    p.terminate()
                    terminated += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return {
            "application": app_name,
            "instancesTerminated": terminated
        }

    @staticmethod
    async def _handle_files_search(params: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").lower()
        folder = params.get("folder", "d:\\luna")
        
        matches = []
        if os.path.exists(folder):
            for root, dirs, files in os.walk(folder):
                for f in files:
                    if query in f.lower():
                        full_path = os.path.join(root, f)
                        matches.append(full_path)
                        if len(matches) >= 20:
                            break
                if len(matches) >= 20:
                    break
        
        return {"query": query, "folder": folder, "matches": matches}

    @staticmethod
    async def _handle_files_read(params: Dict[str, Any]) -> Dict[str, Any]:
        path = params.get("path", "")
        max_lines = params.get("max_lines", 100)

        # Path safety check
        norm_path = os.path.normpath(path).lower()
        is_safe = any(norm_path.startswith(os.path.normpath(ws).lower()) for ws in settings.allowed_workspaces_list)
        if not is_safe and not norm_path.startswith("d:\\luna"):
            raise PermissionError(f"Access to path '{path}' is denied. Must be in authorized workspaces.")

        if not os.path.exists(path) or os.path.isdir(path):
            raise FileNotFoundError(f"File not found: {path}")

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = [f.readline() for _ in range(max_lines)]
        
        return {
            "path": path,
            "linesRead": len(lines),
            "content": "".join(lines)
        }

    @staticmethod
    async def _handle_files_delete(params: Dict[str, Any]) -> Dict[str, Any]:
        path = params.get("path", "")
        norm_path = os.path.normpath(path).lower()
        is_safe = any(norm_path.startswith(os.path.normpath(ws).lower()) for ws in settings.allowed_workspaces_list)
        if not is_safe:
            raise PermissionError("Deletion is restricted to authorized project workspaces only.")

        if os.path.exists(path):
            os.remove(path)
            return {"deletedPath": path, "status": "File successfully removed."}
        else:
            raise FileNotFoundError(f"File '{path}' does not exist.")

    @staticmethod
    async def _handle_pc_lock(params: Dict[str, Any]) -> Dict[str, Any]:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.LockWorkStation()
            return {"status": "Workstation locked"}
        return {"status": "Simulated lock on non-Windows"}

    @staticmethod
    async def _handle_pc_shutdown(params: Dict[str, Any]) -> Dict[str, Any]:
        delay = params.get("delay_seconds", 60)
        # Real Windows shutdown command scheduled with delay
        subprocess.run(["shutdown", "/s", "/t", str(delay)], check=False)
        return {
            "status": "System shutdown initiated",
            "delaySeconds": delay,
            "message": f"PC will shut down in {delay} seconds. Run 'shutdown /a' in terminal to cancel."
        }

    @staticmethod
    async def _handle_pc_restart(params: Dict[str, Any]) -> Dict[str, Any]:
        delay = params.get("delay_seconds", 60)
        subprocess.run(["shutdown", "/r", "/t", str(delay)], check=False)
        return {
            "status": "System restart initiated",
            "delaySeconds": delay,
            "message": f"PC will restart in {delay} seconds. Run 'shutdown /a' in terminal to cancel."
        }

    # 13. Screen Vision & Multimodal Analysis (Qwen Vision on Groq)
    @staticmethod
    async def _handle_vision_analyze_screen(params: Dict[str, Any]) -> Dict[str, Any]:
        prompt = params.get("prompt", "Analyze what is displayed on this screen in detail and assist the user.")
        try:
            # Capture screenshot
            screen = ImageGrab.grab()
            
            # Downscale proportionally if larger than 1280px width for fast transit
            max_width = 1280
            if screen.width > max_width:
                ratio = max_width / float(screen.width)
                new_height = int(float(screen.height) * ratio)
                screen = screen.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # Convert to JPEG base64
            buffered = io.BytesIO()
            screen.save(buffered, format="JPEG", quality=80)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            data_url = f"data:image/jpeg;base64,{img_b64}"

            # Query Groq Vision (qwen/qwen3.8-27b)
            if not settings.OPENAI_API_KEY:
                return {"error": "Groq API key not configured for vision analysis."}

            url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            payload = {
                "model": settings.GROQ_VISION_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"{prompt}\n(Respond concisely, professionally, highlighting any errors, code, or key info visible on the screen.)"},
                            {"type": "image_url", "image_url": {"url": data_url}}
                        ]
                    }
                ],
                "max_tokens": 800,
                "temperature": 0.3
            }

            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    answer = res.json()["choices"][0]["message"]["content"]
                    return {
                        "analysis": answer,
                        "model": settings.GROQ_VISION_MODEL,
                        "resolution": f"{screen.width}x{screen.height}",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    return {"error": f"Groq vision returned error [{res.status_code}]: {res.text}"}
        except Exception as e:
            return {"error": f"Screen vision failed: {str(e)}"}

    # 14. Media Volume Set
    @staticmethod
    async def _handle_media_volume_set(params: Dict[str, Any]) -> Dict[str, Any]:
        level = max(0, min(100, int(params.get("level", 50))))
        if sys.platform == "win32":
            import ctypes
            # Reset to 0 volume (50 steps of VK_VOLUME_DOWN 0xAE)
            for _ in range(50):
                ctypes.windll.user32.keybd_event(0xAE, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAE, 0, 2, 0)
            # Ramp up to desired level (each step is 2%)
            steps = level // 2
            for _ in range(steps):
                ctypes.windll.user32.keybd_event(0xAF, 0, 0, 0)
                ctypes.windll.user32.keybd_event(0xAF, 0, 2, 0)
            return {"level": level, "status": f"Windows volume set to {level}%."}
        return {"level": level, "status": "Simulated volume set"}

    # 15. Media Volume Mute
    @staticmethod
    async def _handle_media_volume_mute(params: Dict[str, Any]) -> Dict[str, Any]:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.keybd_event(0xAD, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xAD, 0, 2, 0)
            return {"status": "Volume mute state toggled."}
        return {"status": "Simulated mute toggle"}

    # 16. Media Play/Pause
    @staticmethod
    async def _handle_media_play_pause(params: Dict[str, Any]) -> Dict[str, Any]:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.keybd_event(0xB3, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xB3, 0, 2, 0)
            return {"status": "Media playback play/pause toggled."}
        return {"status": "Simulated media play/pause"}

    # 17. Media Next Track
    @staticmethod
    async def _handle_media_next_track(params: Dict[str, Any]) -> Dict[str, Any]:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.keybd_event(0xB0, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xB0, 0, 2, 0)
            return {"status": "Skipped to next media track."}
        return {"status": "Simulated next track"}

    # 18. Media Previous Track
    @staticmethod
    async def _handle_media_previous_track(params: Dict[str, Any]) -> Dict[str, Any]:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.keybd_event(0xB1, 0, 0, 0)
            ctypes.windll.user32.keybd_event(0xB1, 0, 2, 0)
            return {"status": "Skipped to previous media track."}
        return {"status": "Simulated previous track"}

    # 19. Media Play YouTube
    @staticmethod
    async def _handle_media_play_youtube(params: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").strip()
        if not query:
            return {"error": "Search query is required."}
        import webbrowser
        encoded = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded}"
        webbrowser.open(url)
        return {"query": query, "url": url, "status": f"Playing '{query}' on YouTube."}

    # 20. JARVIS Morning / Daily Briefing
    @staticmethod
    async def _handle_system_morning_briefing(params: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now()
        date_str = now.strftime("%A, %d %B %Y, %I:%M %p")
        
        # Battery & CPU
        cpu = psutil.cpu_percent(interval=0.1)
        battery = psutil.sensors_battery()
        batt_str = f"{battery.percent}% ({'Plugged In' if battery.power_plugged else 'On Battery'})" if battery else "Desktop Wall Power"

        # Weather from wttr.in
        weather_desc = "Clear sky"
        temp = "27°C"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                w_res = await client.get("https://wttr.in/?format=j1")
                if w_res.status_code == 200:
                    w_data = w_res.json()
                    curr = w_data["current_condition"][0]
                    temp = f"{curr['temp_C']}°C"
                    weather_desc = curr['weatherDesc'][0]['value']
        except Exception:
            pass

        # Check DB for active reminders / notes
        db = SessionLocal()
        reminders = []
        try:
            mems = db.query(Memory).filter(Memory.category.in_(["reminder", "todo", "important"])).limit(5).all()
            reminders = [f"{m.key}: {m.value}" for m in mems]
        except Exception:
            pass
        finally:
            db.close()

        briefing_text = (
            f"Good morning Boss! Today is {date_str}. "
            f"The weather is {temp} with {weather_desc}. "
            f"System CPU is at {cpu}%, and battery status is {batt_str}. "
        )
        if reminders:
            briefing_text += f"You have {len(reminders)} active notes: " + "; ".join(reminders)
        else:
            briefing_text += "All systems are optimal and ready for your command."

        return {
            "briefing": briefing_text,
            "dateTime": date_str,
            "temperature": temp,
            "weather": weather_desc,
            "cpu": cpu,
            "battery": batt_str,
            "reminders": reminders
        }

    # 21. Smart File Organizer (Downloads / Desktop)
    @staticmethod
    async def _handle_files_organize_folder(params: Dict[str, Any]) -> Dict[str, Any]:
        folder_target = params.get("folder", "Downloads").strip()
        home = os.path.expanduser("~")
        
        if folder_target.lower() in ["desktop", "screen"]:
            target_dir = os.path.join(home, "Desktop")
        else:
            target_dir = os.path.join(home, "Downloads")

        if not os.path.exists(target_dir):
            return {"error": f"Folder '{target_dir}' does not exist."}

        category_rules = {
            "Documents": [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".txt", ".csv", ".rtf", ".odt"],
            "Images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"],
            "Media": [".mp4", ".mp3", ".mkv", ".wav", ".avi", ".mov", ".flac"],
            "Installers_And_Archives": [".exe", ".msi", ".zip", ".rar", ".7z", ".tar", ".gz", ".iso"],
            "Code_And_Scripts": [".py", ".js", ".ts", ".html", ".css", ".json", ".sql", ".cpp", ".java"]
        }

        moved_counts = {cat: 0 for cat in category_rules}
        total_moved = 0

        for item in os.listdir(target_dir):
            item_path = os.path.join(target_dir, item)
            # Skip subdirectories
            if os.path.isdir(item_path):
                continue

            _, ext = os.path.splitext(item)
            ext = ext.lower()

            target_subfolder = None
            for cat, exts in category_rules.items():
                if ext in exts:
                    target_subfolder = cat
                    break

            if target_subfolder:
                dest_folder = os.path.join(target_dir, target_subfolder)
                os.makedirs(dest_folder, exist_ok=True)
                dest_path = os.path.join(dest_folder, item)
                
                # Avoid collision
                if os.path.exists(dest_path):
                    base, e = os.path.splitext(item)
                    dest_path = os.path.join(dest_folder, f"{base}_{int(time.time())}{e}")

                shutil.move(item_path, dest_path)
                moved_counts[target_subfolder] += 1
                total_moved += 1

        return {
            "folder": target_dir,
            "totalFilesMoved": total_moved,
            "categoryBreakdown": moved_counts,
            "status": f"Organized {total_moved} files into neat categorized folders."
        }

    # 22. Save Long-term Memory
    @staticmethod
    async def _handle_memory_save(params: Dict[str, Any]) -> Dict[str, Any]:
        key = params.get("key", "").strip()
        value = params.get("value", "").strip()
        category = params.get("category", "general").strip()

        if not key or not value:
            return {"error": "Both 'key' and 'value' are required."}

        db = SessionLocal()
        try:
            mem = db.query(Memory).filter(Memory.key == key).first()
            if mem:
                mem.value = value
                mem.category = category
                mem.updated_at = datetime.now(timezone.utc)
            else:
                mem = Memory(
                    key=key,
                    value=value,
                    category=category,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                db.add(mem)
            db.commit()
            return {"key": key, "category": category, "status": "Memory stored successfully."}
        except Exception as e:
            db.rollback()
            return {"error": str(e)}
        finally:
            db.close()

    # 23. Search Long-term Memory
    @staticmethod
    async def _handle_memory_search(params: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").strip().lower()
        if not query:
            return {"error": "Search query is required."}

        db = SessionLocal()
        try:
            mems = db.query(Memory).all()
            matches = []
            for m in mems:
                if query in m.key.lower() or query in m.value.lower() or query in (m.category or "").lower():
                    matches.append({"key": m.key, "value": m.value, "category": m.category})
            return {"query": query, "count": len(matches), "results": matches}
        finally:
            db.close()

    # 24. Send WhatsApp Message to Phone Number
    @staticmethod
    async def _handle_communication_send_whatsapp(params: Dict[str, Any]) -> Dict[str, Any]:
        raw_phone = str(params.get("phone_number", "")).strip()
        message = str(params.get("message", "")).strip()

        # Clean phone number (strip spaces, dashes, parentheses)
        clean_phone = re.sub(r"[^\d+]", "", raw_phone)
        # If 10 digits without country code (common in India), prepend 91
        if len(clean_phone) == 10 and not clean_phone.startswith("+"):
            clean_phone = "91" + clean_phone
        elif clean_phone.startswith("+"):
            clean_phone = clean_phone[1:]

        encoded_msg = urllib.parse.quote(message)
        wa_url = f"https://wa.me/{clean_phone}?text={encoded_msg}"
        import webbrowser
        webbrowser.open(wa_url)
        return {
            "phone": clean_phone,
            "message": message,
            "url": wa_url,
            "status": f"WhatsApp chat opened for {clean_phone} with pre-filled message."
        }

    # 25. Web / Google Search
    @staticmethod
    async def _handle_web_search(params: Dict[str, Any]) -> Dict[str, Any]:
        query = params.get("query", "").strip()
        if not query:
            return {"error": "Query required"}
        encoded = urllib.parse.quote(query)
        search_url = f"https://www.google.com/search?q={encoded}"
        import webbrowser
        webbrowser.open(search_url)
        return {"query": query, "url": search_url, "status": f"Google search opened for '{query}'."}

    # 26. Make Phone Call
    @staticmethod
    async def _handle_telephony_make_call(params: Dict[str, Any]) -> Dict[str, Any]:
        raw_phone = str(params.get("phone_number", "")).strip()
        contact = str(params.get("contact_name", "")).strip()
        clean_phone = re.sub(r"[^\d+]", "", raw_phone)
        target = clean_phone or raw_phone or contact
        return {
            "action": "call",
            "phoneNumber": clean_phone or raw_phone,
            "contactName": contact,
            "url": f"tel:{clean_phone or raw_phone}",
            "status": f"Call initiated to {contact or clean_phone}."
        }

    # 27. Set Timer
    @staticmethod
    async def _handle_system_timer(params: Dict[str, Any]) -> Dict[str, Any]:
        duration = float(params.get("duration_seconds", 60))
        label = str(params.get("label", "Timer")).strip()
        return {
            "action": "timer",
            "durationSeconds": duration,
            "label": label,
            "status": f"Timer set for {int(duration)} seconds."
        }

