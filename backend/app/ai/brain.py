import json
import logging
from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime, timezone

from app.core.config import settings
from app.ai.prompts import LUNA_SYSTEM_PROMPT, build_context_prompt
from app.ai.tools import LUNA_TOOLS
from app.actions.executor import ActionExecutor
from app.database.session import SessionLocal
from app.database.models import Memory

logger = logging.getLogger("luna.brain")

class AIResponse:
    def __init__(
        self,
        content: str,
        provider: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        tool_results: Optional[List[Dict[str, Any]]] = None,
        fallback_occurred: bool = False,
        error: Optional[str] = None
    ):
        self.content = content
        self.provider = provider
        self.tool_calls = tool_calls or []
        self.tool_results = tool_results or []
        self.fallback_occurred = fallback_occurred
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "provider": self.provider,
            "toolCalls": self.tool_calls,
            "toolResults": self.tool_results,
            "fallbackOccurred": self.fallback_occurred,
            "error": self.error
        }

class HybridAIBrain:
    def __init__(self):
        self.openai_url = settings.OPENAI_BASE_URL.rstrip("/") + "/chat/completions"
        self.ollama_url = settings.OLLAMA_BASE_URL.rstrip("/") + "/api/chat"

    async def get_health_status(self) -> Dict[str, Any]:
        status = {
            "mode": settings.AI_MODE,
            "openai": {"configured": bool(settings.OPENAI_API_KEY), "model": settings.OPENAI_MODEL},
            "ollama": {"url": settings.OLLAMA_BASE_URL, "model": settings.OLLAMA_MODEL, "online": False}
        }
        # Check Ollama connectivity
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(settings.OLLAMA_BASE_URL.rstrip("/") + "/api/tags")
                if res.status_code == 200:
                    status["ollama"]["online"] = True
                    status["ollama"]["models"] = [m.get("name") for m in res.json().get("models", [])]
        except Exception:
            status["ollama"]["online"] = False
        return status

    def _get_relevant_memories(self, query: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            memories = db.query(Memory).all()
            return [m.to_dict() for m in memories]
        finally:
            db.close()

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        system_override: Optional[str] = None,
        confirmation_token: Optional[str] = None
    ) -> AIResponse:
        # Prepend system prompt with user memories injected
        memories = self._get_relevant_memories(messages[-1].get("content", "") if messages else "")
        context_str = build_context_prompt(memories)
        system_content = (system_override or LUNA_SYSTEM_PROMPT) + context_str

        formatted_messages = [{"role": "system", "content": system_content}]
        for m in messages:
            formatted_messages.append({"role": m["role"], "content": m["content"]})

        mode = settings.AI_MODE.lower()
        has_openai = bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())

        if mode == "online":
            return await self._call_openai(formatted_messages, confirmation_token=confirmation_token)
        elif mode == "offline":
            return await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token)
        else:
            # Hybrid Mode
            if has_openai:
                try:
                    return await self._call_openai(formatted_messages, confirmation_token=confirmation_token)
                except Exception as e:
                    logger.warning(f"OpenAI call failed in hybrid mode: {e}. Falling back to offline engine.")
                    offline_resp = await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token)
                    offline_resp.fallback_occurred = True
                    return offline_resp
            else:
                return await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token)

    async def _call_openai(
        self,
        messages: List[Dict[str, Any]],
        confirmation_token: Optional[str] = None
    ) -> AIResponse:
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": messages,
            "tools": LUNA_TOOLS,
            "tool_choice": "auto",
            "temperature": 0.7
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.openai_url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"OpenAI error {resp.status_code}: {resp.text}")
            
            data = resp.json()
            choice = data["choices"][0]
            message_obj = choice["message"]
            content = message_obj.get("content") or ""
            tool_calls = message_obj.get("tool_calls") or []

            executed_tool_results = []
            if tool_calls:
                for tc in tool_calls:
                    fn = tc["function"]
                    fn_name = fn["name"]
                    try:
                        args = json.loads(fn["arguments"])
                    except Exception:
                        args = {}
                    
                    # Execute tool via ActionExecutor or Memory
                    res = await self._execute_tool(fn_name, args, confirmation_token)
                    executed_tool_results.append({
                        "toolCallId": tc["id"],
                        "name": fn_name,
                        "result": res
                    })

                # Follow-up with model to generate conversational summary
                follow_up_messages = list(messages)
                follow_up_messages.append(message_obj)
                for tr in executed_tool_results:
                    follow_up_messages.append({
                        "role": "tool",
                        "tool_call_id": tr["toolCallId"],
                        "name": tr["name"],
                        "content": json.dumps(tr["result"])
                    })
                
                # Second call for the assistant voice reply
                second_payload = {
                    "model": settings.OPENAI_MODEL,
                    "messages": follow_up_messages,
                    "temperature": 0.7
                }
                try:
                    sec_resp = await client.post(self.openai_url, headers=headers, json=second_payload)
                    if sec_resp.status_code == 200:
                        sec_choice = sec_resp.json()["choices"][0]
                        content = sec_choice["message"].get("content") or content
                    else:
                        logger.warning(f"Second-pass LLM summary status {sec_resp.status_code}: {sec_resp.text}")
                except Exception as ex:
                    logger.warning(f"Second-pass LLM summary failed: {ex}")

            # Ensure Luna ALWAYS provides a voice response when tools are executed
            if not content or not content.strip():
                if executed_tool_results:
                    first_res = executed_tool_results[0]
                    t_name = first_res.get("name", "")
                    succ = first_res.get("result", {}).get("success", False)
                    if t_name == "app_open":
                        try:
                            arg_raw = tool_calls[0].get("function", {}).get("arguments", "{}")
                            app_n = json.loads(arg_raw).get("app_name", "app")
                        except Exception:
                            app_n = "app"
                        content = f"கண்டிப்பாக சார், {app_n.upper()} இப்போது திறக்கிறேன்." if succ else f"மன்னிக்கவும் சார், {app_n} திறக்க முடியவில்லை."
                    elif t_name == "media_play_youtube":
                        content = "கண்டிப்பாக சார், நீங்கள் கேட்ட பாடலை இப்போது யூடியூபில் இயக்குகிறேன்!"
                    elif t_name == "communication_send_whatsapp":
                        content = "வாட்ஸ்அப்பில் செய்தி அனுப்ப தயார் செய்துவிட்டேன் சார்."
                    elif succ:
                        content = "கண்டிப்பாக சார், உங்கள் கட்டளை வெற்றிகரமாக நிறைவேற்றப்பட்டது."
                    else:
                        content = "மன்னிக்கவும் சார், கட்டளையை நிறைவேற்றுவதில் சிக்கல் ஏற்பட்டது."
                else:
                    content = "சொல்லுங்கள் சார்! நான் உங்களுக்கு உதவ தயாராக உள்ளேன்."

            return AIResponse(
                content=content,
                provider="openai",
                tool_calls=tool_calls,
                tool_results=executed_tool_results
            )

    async def _call_offline_engine(
        self,
        messages: List[Dict[str, Any]],
        confirmation_token: Optional[str] = None
    ) -> AIResponse:
        # First attempt Ollama local LLM if available
        try:
            async with httpx.AsyncClient(timeout=float(settings.OLLAMA_TIMEOUT_SECONDS)) as client:
                ollama_payload = {
                    "model": settings.OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False
                }
                res = await client.post(self.ollama_url, json=ollama_payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("message", {}).get("content", "")
                    return AIResponse(content=content, provider="ollama")
        except Exception:
            logger.info("Ollama unreachable; activating LUNA Deterministic Voice & Command Engine.")

        # Fallback: Deterministic NLP and Command Interpreter
        last_user_msg = ""
        for m in reversed(messages):
            if m["role"] == "user":
                last_user_msg = m["content"]
                break

        return await self._deterministic_nlp_engine(last_user_msg, confirmation_token)

    async def _deterministic_nlp_engine(
        self,
        query: str,
        confirmation_token: Optional[str] = None
    ) -> AIResponse:
        q = query.lower().strip()
        executed_tool_results = []
        tool_calls = []

        # 1. Greetings & Wake Words (Tamil / English)
        if q in ["luna", "hey luna", "hi luna", "hello luna", "lunaa", "லூனா"] or any(w in q for w in ["vanakkam", "hey luna", "hi luna", "hello luna", "sollu luna"]):
            reply = "சொல்லுங்கள் சார்! லூனா தயார். என்ன செய்ய வேண்டும்?"
            return AIResponse(content=reply, provider="luna-local-engine")

        if any(w in q for w in ["epdi irukka", "eppadi irukeenga", "how are you", "who are you", "yaaru nee", "un peru enna"]):
            reply = "நான் நலமாக இருக்கிறேன் சார்! நான் தான் உங்கள் தனிப்பட்ட உதவியாளர் லூனா. உங்களுக்கு என்ன உதவி வேண்டும் சொல்லுங்கள்!"
            return AIResponse(content=reply, provider="luna-local-engine")

        # 2. Emotional Feelings (Sad / Hurt vs Happy / Excited)
        if any(w in q for w in ["sad", "கவலை", "சோகம்", "kashtam", "valikudhu", "alone", "crying", "depressed"]):
            reply = "கவலைப்படாதீர்கள் சார்... என்ன நடந்தது? உங்கள் மனசுல உள்ளதை என்னிடம் சொல்லுங்கள், நான் எப்போதும் உங்களுடன் இருப்பேன்."
            return AIResponse(content=reply, provider="luna-local-engine")

        if any(w in q for w in ["happy", "சந்தோஷம்", "pass", "win", "semma", "mass", "super", "celebrate"]):
            reply = "வாவ் சார்! எனக்கு ரொம்ப ரொம்ப சந்தோஷம்! வாழ்த்துகள், சூப்பரா பண்ணியிருக்கீங்க! 🎉"
            return AIResponse(content=reply, provider="luna-local-engine")

        # 3. Application Launch (Only if specific app is explicitly mentioned!)
        target_app = None
        arg = ""
        if "vs code" in q or "vscode" in q:
            target_app = "code"
        elif "chrome" in q or "browser" in q:
            target_app = "chrome"
        elif "notepad" in q:
            target_app = "notepad"
        elif "calc" in q or "calculator" in q:
            target_app = "calc"
        elif "explorer" in q:
            target_app = "explorer"
        elif "terminal" in q or "cmd" in q:
            target_app = "wt"

        if target_app and any(w in q for w in ["open", "launch", "thira", "start"]):
            if "mechfind" in q:
                arg = "c:\\projects\\MechFind"

            tool_calls.append({"id": "call_app_open", "function": {"name": "app_open", "arguments": json.dumps({"app_name": target_app, "argument": arg})}})
            exec_res = await self._execute_tool("app_open", {"app_name": target_app, "argument": arg}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_app_open", "name": "app_open", "result": exec_res})
            
            if exec_res.get("success"):
                reply = f"கண்டிப்பாக சார், {target_app.upper()} இப்போது திறக்கிறேன்."
            else:
                reply = f"மன்னிக்கவும் சார், {target_app} திறக்க முடியவில்லை: {exec_res.get('error', 'Unknown issue')}."
            
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 3. Battery Status ("battery status sollu", "how much battery")
        if "battery" in q or "charge" in q:
            tool_calls.append({"id": "call_battery", "function": {"name": "system_get_battery", "arguments": "{}"}})
            exec_res = await self._execute_tool("system_get_battery", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_battery", "name": "system_get_battery", "result": exec_res})

            data = exec_res.get("data", {})
            if data.get("hasBattery"):
                pct = data.get("percent")
                plugged = "மற்றும் சார்ஜரில் இணைக்கப்பட்டுள்ளது" if data.get("powerPlugged") else "மற்றும் பேட்டரியில் இயங்குகிறது"
                reply = f"கணினியின் பேட்டரி அளவு தற்போது {pct}% உள்ளது, {plugged} சார்."
            else:
                reply = "உங்கள் கணினி நேரடி மின்சாரத்தில் இயங்குகிறது (பேட்டரி இல்லை) சார்."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 4. System Health / CPU ("CPU usage", "system health", "ram status")
        if any(w in q for w in ["cpu", "ram", "memory", "health", "system status"]):
            tool_calls.append({"id": "call_health", "function": {"name": "system_get_health", "arguments": "{}"}})
            exec_res = await self._execute_tool("system_get_health", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_health", "name": "system_get_health", "result": exec_res})
            
            data = exec_res.get("data", {})
            cpu = data.get("cpuUsagePercent", 0)
            mem = data.get("memoryUsagePercent", 0)
            reply = f"கணினி நிலை சீராக உள்ளது சார். சிபியு பயன்பாடு {cpu}% மற்றும் ரேம் {mem}% பயன்பாட்டில் உள்ளது."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 5. Screenshot / Screen error ("screen capture", "screenshot edu", "error paaru")
        if any(w in q for w in ["screenshot", "screen capture", "screen paaru", "error"]):
            tool_calls.append({"id": "call_screenshot", "function": {"name": "system_capture_screenshot", "arguments": "{}"}})
            exec_res = await self._execute_tool("system_capture_screenshot", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_screenshot", "name": "system_capture_screenshot", "result": exec_res})
            reply = "திரை நகல் எடுக்கப்பட்டது சார். உங்கள் திரை இப்போது ஆய்வு செய்ய தயாராக உள்ளது."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 6. Lock PC
        if "lock" in q:
            tool_calls.append({"id": "call_lock", "function": {"name": "pc_lock", "arguments": "{}"}})
            exec_res = await self._execute_tool("pc_lock", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_lock", "name": "pc_lock", "result": exec_res})
            return AIResponse(content="விண்டோஸ் கணினி உடனடியாக பூட்டப்பட்டது சார்.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 7. Sing a Song ("oru paatu paadu", "sing a song")
        if any(w in q for w in ["paatu paadu", "paattu paadu", "pada sona", "sing a song", "sing for me", "oru paatu", "பாட்டு பாடு", "பாடல்"]):
            lyrics = "கண்ணே கலைமானே... கன்னி மயிலெனக் கண்டேன் உனை நானே! 🎵 உங்களுக்காக இந்த இனிமையான பாடலை பாடினேன் சார்!"
            return AIResponse(content=lyrics, provider="luna-local-engine")

        # 8. Play Songs on YouTube ("Leo song podu", "Hukum play pannu", "music play pannu")
        if any(w in q for w in ["podu", "play song", "paatu podu", "song play", "paattu podu", "பாட்டு"]) or ("play" in q and any(w in q for w in ["song", "music", "anirudh", "ar rahman", "leo", "jailer", "tamil"])):
            # Extract song keywords
            cleaned_song = q
            for noise in ["luna", "enakku", "oru", "podu", "play", "pannu", "song", "paatu", "paattu", "youtube-la", "youtubela", "பாட்டு"]:
                cleaned_song = cleaned_song.replace(noise, "")
            song_name = cleaned_song.strip() or "trending tamil songs"
            tool_calls.append({"id": "call_yt", "function": {"name": "media_play_youtube", "arguments": json.dumps({"query": song_name})}})
            exec_res = await self._execute_tool("media_play_youtube", {"query": song_name}, confirmation_token)
            return AIResponse(content=f"கண்டிப்பாக சார், யூடியூபில் '{song_name}' பாடலை இப்போது இயக்குகிறேன்!", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_yt", "name": "media_play_youtube", "result": exec_res}])

        # 9. Send WhatsApp Message to Number ("9876543210-ku message pannu: Hello")
        import re
        phone_match = re.search(r"(\+?\d{10,13})", q)
        if phone_match and any(w in q for w in ["message", "msg", "sms", "whatsapp", "text"]):
            phone_num = phone_match.group(1)
            msg_text = "வணக்கம்! லூனா குரல் உதவியாளர் மூலம் அனுப்பப்பட்ட செய்தி."
            if ":" in query:
                msg_text = query.split(":", 1)[1].strip()
            elif "message" in q:
                parts = query.split("message", 1)[1]
                msg_text = parts.replace("pannu", "").replace("send pannu", "").replace(phone_num, "").strip() or msg_text

            tool_calls.append({"id": "call_wa", "function": {"name": "communication_send_whatsapp", "arguments": json.dumps({"phone_number": phone_num, "message": msg_text})}})
            exec_res = await self._execute_tool("communication_send_whatsapp", {"phone_number": phone_num, "message": msg_text}, confirmation_token)
            return AIResponse(content=f"வாட்ஸ்அப்பில் {phone_num} எண்ணிற்கு செய்தி அனுப்ப பக்கம் திறக்கப்பட்டது சார்!", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_wa", "name": "communication_send_whatsapp", "result": exec_res}])

        # 10. Media Controls (Volume, Play, Pause)
        if "volume" in q or "sound" in q:
            level = 50
            for word in q.split():
                if word.isdigit():
                    level = int(word)
                    break
            tool_calls.append({"id": "call_vol", "function": {"name": "media_volume_set", "arguments": json.dumps({"level": level})}})
            exec_res = await self._execute_tool("media_volume_set", {"level": level}, confirmation_token)
            return AIResponse(content=f"ஒலியளவு {level}% ஆக மாற்றப்பட்டது சார்.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_vol", "name": "media_volume_set", "result": exec_res}])

        if any(w in q for w in ["pause", "stop music", "resume"]):
            tool_calls.append({"id": "call_playpause", "function": {"name": "media_play_pause", "arguments": "{}"}})
            exec_res = await self._execute_tool("media_play_pause", {}, confirmation_token)
            return AIResponse(content="பாடலின் இயக்கம் மாற்றப்பட்டது சார்.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_playpause", "name": "media_play_pause", "result": exec_res}])

        # 11. File Organization ("organize downloads", "sort files")
        if "organize" in q or "sort" in q:
            tool_calls.append({"id": "call_organize", "function": {"name": "files_organize_folder", "arguments": "{}"}})
            exec_res = await self._execute_tool("files_organize_folder", {}, confirmation_token)
            return AIResponse(content="பதிவிறக்கம் கோப்புறையிலுள்ள கோப்புகள் ஒழுங்குபடுத்தப்பட்டன சார்.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_organize", "name": "files_organize_folder", "result": exec_res}])

        # Default helpful response
        is_english = all(ord(c) < 128 for c in query) and not any(w in q for w in ["sollu", "pannu", "podu", "paadu", "paaru", "epdi", "irukku", "enna", "inga", "vanakkam", "luna"])
        if is_english:
            reply = f"Understood, sir! Luna is ready. How can I assist you today?"
        else:
            reply = "புரிந்துகொண்டேன் சார்! உங்கள் கட்டளையை நிறைவேற்ற லூனா தயாராக உள்ளது. சொல்லுங்கள் சார், என்ன செய்ய வேண்டும்?"
        return AIResponse(content=reply, provider="luna-local-engine")

    async def _execute_tool(
        self,
        name: str,
        args: Dict[str, Any],
        confirmation_token: Optional[str] = None
    ) -> Dict[str, Any]:
        if name == "save_memory":
            db = SessionLocal()
            try:
                mem = Memory(
                    category=args.get("category", "user_preference"),
                    key=args.get("key", "note"),
                    value=args.get("value", ""),
                    tags=json.dumps(["auto-saved", "ai-chat"])
                )
                db.add(mem)
                db.commit()
                return {"success": True, "message": f"Memory saved: {args.get('key')}"}
            except Exception as e:
                return {"success": False, "error": str(e)}
            finally:
                db.close()

        # Map tool name to ActionExecutor action_id
        action_mapping = {
            "system_get_health": "system.get_health",
            "system_get_battery": "system.get_battery",
            "system_get_processes": "system.get_processes",
            "system_capture_screenshot": "system.capture_screenshot",
            "app_open": "app.open",
            "app_close": "app.close",
            "files_search": "files.search",
            "files_read": "files.read",
            "files_delete": "files.delete",
            "pc_lock": "pc.lock",
            "communication_send_whatsapp": "communication.send_whatsapp",
            "web_search": "web.search",
            "media_play_youtube": "media.play_youtube",
            "media_volume_set": "media.volume_set",
            "media_volume_mute": "media.volume_mute",
            "media_play_pause": "media.play_pause",
            "media_next_track": "media.next_track",
            "media_previous_track": "media.previous_track",
            "system_morning_briefing": "system.morning_briefing",
            "files_organize_folder": "files.organize_folder",
            "vision_analyze_screen": "vision.analyze_screen",
            "memory_search": "memory.search"
        }
        action_id = action_mapping.get(name, name.replace("_", "."))
        return await ActionExecutor.execute(
            action_id=action_id,
            parameters=args,
            actor_type="ai",
            confirmation_token=confirmation_token
        )

ai_brain = HybridAIBrain()
