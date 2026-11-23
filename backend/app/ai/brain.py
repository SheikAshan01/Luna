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
        confirmation_token: Optional[str] = None,
        gender: Optional[str] = None
    ) -> AIResponse:
        # Prepend system prompt with user memories injected
        memories = self._get_relevant_memories(messages[-1].get("content", "") if messages else "")
        context_str = build_context_prompt(memories)

        # Dynamic speaker gender adaptation (Voice Tone Recognition)
        gender_hint = ""
        if gender == "female":
            gender_hint = "\n\n[SPEAKER DETECTED GENDER]: FEMALE. Address the user with respect as 'Madam' in your response (always write 'Madam' in English letters)."
        elif gender == "male":
            gender_hint = "\n\n[SPEAKER DETECTED GENDER]: MALE. Address the user with respect as 'Sir' in your response (always write 'Sir' in English letters)."

        system_content = (system_override or LUNA_SYSTEM_PROMPT) + context_str + gender_hint

        formatted_messages = [{"role": "system", "content": system_content}]
        for m in messages:
            formatted_messages.append({"role": m["role"], "content": m["content"]})

        mode = settings.AI_MODE.lower()
        has_openai = bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip())

        if mode == "online":
            return await self._call_openai(formatted_messages, confirmation_token=confirmation_token, gender=gender)
        elif mode == "offline":
            return await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token, gender=gender)
        else:
            # Hybrid Mode
            if has_openai:
                try:
                    return await self._call_openai(formatted_messages, confirmation_token=confirmation_token, gender=gender)
                except Exception as e:
                    logger.warning(f"OpenAI call failed in hybrid mode: {e}. Falling back to offline engine.")
                    offline_resp = await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token, gender=gender)
                    offline_resp.fallback_occurred = True
                    return offline_resp
            else:
                return await self._call_offline_engine(formatted_messages, confirmation_token=confirmation_token, gender=gender)

    async def _call_openai(
        self,
        messages: List[Dict[str, Any]],
        confirmation_token: Optional[str] = None,
        gender: Optional[str] = None
    ) -> AIResponse:
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        payload = {
            "model": settings.OPENAI_MODEL,
            "messages": messages,
            "tools": LUNA_TOOLS,
            "tool_choice": "auto",
            "temperature": 0.6,
            "max_tokens": 700
        }
        if "gpt-oss" in settings.OPENAI_MODEL.lower():
            payload["reasoning_effort"] = "low"

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
                    "temperature": 0.6,
                    "max_tokens": 250
                }
                if "gpt-oss" in settings.OPENAI_MODEL.lower():
                    second_payload["reasoning_effort"] = "low"
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
            h_term = "Madam" if gender == "female" else "Sir"
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
                        content = f"கண்டிப்பாக {h_term}, {app_n.upper()} இப்போது திறக்கிறேன்." if succ else f"மன்னிக்கவும் {h_term}, {app_n} திறக்க முடியவில்லை."
                    elif t_name == "media_play_youtube":
                        content = f"கண்டிப்பாக {h_term}, நீங்கள் கேட்ட பாடலை இப்போது யூடியூபில் இயக்குகிறேன்!"
                    elif t_name == "communication_send_whatsapp":
                        content = f"வாட்ஸ்அப்பில் செய்தி அனுப்ப தயார் செய்துவிட்டேன் {h_term}."
                    elif succ:
                        content = f"கண்டிப்பாக {h_term}, உங்கள் கட்டளை வெற்றிகரமாக நிறைவேற்றப்பட்டது."
                    else:
                        content = f"மன்னிக்கவும் {h_term}, கட்டளையை நிறைவேற்றுவதில் சிக்கல் ஏற்பட்டது."
                else:
                    content = f"சொல்லுங்கள் {h_term}! நான் உங்களுக்கு உதவ தயாராக உள்ளேன்."

            return AIResponse(
                content=content,
                provider="openai",
                tool_calls=tool_calls,
                tool_results=executed_tool_results
            )

    async def _call_offline_engine(
        self,
        messages: List[Dict[str, Any]],
        confirmation_token: Optional[str] = None,
        gender: Optional[str] = None
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

        return await self._deterministic_nlp_engine(last_user_msg, confirmation_token, gender=gender)

    async def _deterministic_nlp_engine(
        self,
        query: str,
        confirmation_token: Optional[str] = None,
        gender: Optional[str] = None
    ) -> AIResponse:
        q = query.lower().strip()
        executed_tool_results = []
        tool_calls = []
        h = "Madam" if gender == "female" else "Sir"

        # 1. Greetings & Wake Words (Tamil / English) - only when strictly calling Luna / greeting without a question
        exact_wake_words = ["luna", "hey luna", "hi luna", "hello luna", "lunaa", "லூனா", "vanakkam", "வணக்கம்", "வணக்கம் லூனா", "sollu luna"]
        if q in exact_wake_words:
            reply = f"சொல்லுங்கள் {h}! லூனா தயார். என்ன செய்ய வேண்டும்?"
            return AIResponse(content=reply, provider="luna-local-engine")

        if q in ["epdi irukka", "eppadi irukeenga", "how are you", "who are you", "yaaru nee", "un peru enna"]:
            reply = f"நான் நலமாக இருக்கிறேன் {h}! நான் தான் உங்கள் தனிப்பட்ட உதவியாளர் லூனா. உங்களுக்கு என்ன உதவி வேண்டும் சொல்லுங்கள்!"
            return AIResponse(content=reply, provider="luna-local-engine")

        # 2. Emotional Feelings (Sad / Hurt vs Happy / Excited)
        if any(w in q for w in ["sad", "கவலை", "சோகம்", "kashtam", "valikudhu", "alone", "crying", "depressed"]):
            reply = f"கவலைப்படாதீர்கள் {h}... என்ன நடந்தது? உங்கள் மனசுல உள்ளதை என்னிடம் சொல்லுங்கள், நான் எப்போதும் உங்களுடன் இருப்பேன்."
            return AIResponse(content=reply, provider="luna-local-engine")

        if any(w in q for w in ["happy", "சந்தோஷம்", "pass", "win", "semma", "mass", "super", "celebrate"]):
            reply = f"வாவ் {h}! எனக்கு ரொம்ப ரொம்ப சந்தோஷம்! வாழ்த்துகள், சூப்பரா பண்ணியிருக்கீங்க! 🎉"
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
                reply = f"கண்டிப்பாக {h}, {target_app.upper()} இப்போது திறக்கிறேன்."
            else:
                reply = f"மன்னிக்கவும் {h}, {target_app} திறக்க முடியவில்லை: {exec_res.get('error', 'Unknown issue')}."
            
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
                reply = f"கணினியின் பேட்டரி அளவு தற்போது {pct}% உள்ளது, {plugged} {h}."
            else:
                reply = f"உங்கள் கணினி நேரடி மின்சாரத்தில் இயங்குகிறது (பேட்டரி இல்லை) {h}."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 4. System Health / CPU ("CPU usage", "system health", "ram status")
        if any(w in q for w in ["cpu", "ram", "memory", "health", "system status"]):
            tool_calls.append({"id": "call_health", "function": {"name": "system_get_health", "arguments": "{}"}})
            exec_res = await self._execute_tool("system_get_health", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_health", "name": "system_get_health", "result": exec_res})
            
            data = exec_res.get("data", {})
            cpu = data.get("cpuUsagePercent", 0)
            mem = data.get("memoryUsagePercent", 0)
            reply = f"கணினி நிலை சீராக உள்ளது {h}. சிபியு பயன்பாடு {cpu}% மற்றும் ரேம் {mem}% பயன்பாட்டில் உள்ளது."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 5. Screenshot / Screen error ("screen capture", "screenshot edu", "error paaru")
        if any(w in q for w in ["screenshot", "screen capture", "screen paaru", "error"]):
            tool_calls.append({"id": "call_screenshot", "function": {"name": "system_capture_screenshot", "arguments": "{}"}})
            exec_res = await self._execute_tool("system_capture_screenshot", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_screenshot", "name": "system_capture_screenshot", "result": exec_res})
            reply = f"திரை நகல் எடுக்கப்பட்டது {h}. உங்கள் திரை இப்போது ஆய்வு செய்ய தயாராக உள்ளது."
            return AIResponse(content=reply, provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 6. Lock PC
        if "lock" in q:
            tool_calls.append({"id": "call_lock", "function": {"name": "pc_lock", "arguments": "{}"}})
            exec_res = await self._execute_tool("pc_lock", {}, confirmation_token)
            executed_tool_results.append({"toolCallId": "call_lock", "name": "pc_lock", "result": exec_res})
            return AIResponse(content=f"விண்டோஸ் கணினி உடனடியாக பூட்டப்பட்டது {h}.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=executed_tool_results)

        # 7. Sing a Song Directly in Luna's Melodic Voice (NO YOUTUBE REDIRECTION)
        if any(w in q for w in ["paatu", "paattu", "pada sona", "sing a song", "sing for me", "oru paatu", "பாட்டு", "பாடல்", "பாடு", "sing", "song pada", "பாடி காட்டு", "nanu pada", "song"]):
            stopwords = [
                'hey luna', 'luna', 'enakku', 'konjam', 'oru nalla', 'oru',
                'indha', 'intha', 'nanu', 'naan', 'naanu', 'ni', 'nee', 'neenga',
                'நீ இந்த', 'இந்த பாட்டு', 'இந்த song', 'இந்த பாடல்', 'இந்த',
                'nu solli', 'nu sonna', 'nu sona', 'solli', 'sonna', 'sona', 'solren',
                'சொல்லி', 'சொன்னா', 'சொல்றேன்', 'சொல்லுறேன்',
                'spec ah', 'spec a', 'specific ah', 'specific',
                'song ah', 'songa', 'song', 'பாட்டு தான்', 'பாட்டு', 'பாடல்', 'சாங்', 'ட்ராக்', 'music', 'இசை',
                'பாடி காட்டு', 'பாட சொல்றேன்', 'பாட சொன்னா', 'பாடுங்க', 'பாடு', 'பாட',
                'pada sona', 'pada sonna', 'pada solren', 'paada', 'paadu',
                'sing a song', 'sing for me', 'sing',
                'போடுங்க', 'போடு', 'play pannu', 'play', 'kettu',
                'ah', 'nu', 'nga', 'தா', 'tha'
            ]
            import re, random
            extracted = q
            for w in sorted(stopwords, key=len, reverse=True):
                extracted = re.sub(re.escape(w), ' ', extracted, flags=re.IGNORECASE)
            cleaned_song = re.sub(r'[:\"\']', '', extracted).strip()
            cleaned_song = re.sub(r'\s+', ' ', cleaned_song)

            song_db = [
                {
                    "title": "கண்ணே கலைமானே",
                    "aliases": ["கண்ணே கலைமானே", "kanne kalaimane", "கலைமானே", "kanne"],
                    "lyrics": "🎶 கண்ணே... கலைமானே... கன்னி மயில் என... கண்டேன் உனை நானே... அந்திப் பகல் உனை... நான் பார்க்கிறேன்... ஆண்டவனே துணை வேண்டுகிறேன்... 🎶"
                },
                {
                    "title": "தென்றல் வந்து தீண்டும் போது",
                    "aliases": ["தென்றல் வந்து", "thendral vandhu", "thendral vanthu", "இளையராஜா"],
                    "lyrics": "🎶 தென்றல் வந்து தீண்டும் போது... என்ன வண்ணமோ மனசுல... திங்கள் வந்து காயும் போது... என்ன நெனப்போ நெனப்புல... வந்து வந்து போகுதம்மா... 🎶"
                },
                {
                    "title": "சின்னச் சின்ன ஆசை",
                    "aliases": ["சின்ன சின்ன ஆசை", "chinna chinna aasai", "ரோஜா"],
                    "lyrics": "🎶 சின்னச் சின்ன ஆசை... சிறகடிக்கும் ஆசை... முத்து முத்து ஆசை... முடிந்து வைத்த ஆசை... வெண்ணிலவு தொட்டு முத்தமிட ஆசை... 🎶"
                },
                {
                    "title": "மலரே மௌனமா",
                    "aliases": ["மலரே மௌனமா", "malare mounama"],
                    "lyrics": "🎶 மலரே... மௌனமா... மௌனமே... வேதமா... மலர்கள் பேசுமா... பேசினால் ஓயுமா... அன்பே... 🎶"
                },
                {
                    "title": "வசீகரா",
                    "aliases": ["வசீகரா", "vaseegara", "வசீகரனே"],
                    "lyrics": "🎶 வசீகரா... என் நெஞ்சினிக்க... உன் பொன் மடியில் தூங்கினால் போதும்... அதே கணம் என் கண்ணுறங்க... முனியின்களும் புதையல் பெறாதே... 🎶"
                },
                {
                    "title": "முன்பே வா என் அன்பே வா",
                    "aliases": ["முன்பே வா", "munbe vaa", "அன்பே வா"],
                    "lyrics": "🎶 முன்பே வா என் அன்பே வா... ஊனே வா உயிரே வா... பூ பூவாய் பூப்போம் வா... பூ காற்று கொஞ்சும் போது... 🎶"
                },
                {
                    "title": "மறுவார்த்தை பேசாதே",
                    "aliases": ["மறுவார்த்தை", "maruvaarthai", "சித் ஸ்ரீராம்"],
                    "lyrics": "🎶 மறுவார்த்தை பேசாதே... மடி மீது நீ தூங்கு... இமை போல நான் காக்க... கனவாய் நீ மாறு... 🎶"
                },
                {
                    "title": "நிலாவே வா",
                    "aliases": ["நிலாவே வா", "nilave vaa"],
                    "lyrics": "🎶 நிலாவே வா... செல்லாதே வா... என் ஆசைக் கண்ணில்... தூங்காதே வா... தினம் தினம் உன் முகமே... என் நினைவில் வாழுதே... 🎶"
                },
                {
                    "title": "அரபிக் குத்து",
                    "aliases": ["அரபிக் குத்து", "arabic kuthu", "ஹலமிதி"],
                    "lyrics": "🎶 அரபிக் குத்து ஹலமிதி ஹபிபோ... ஹலமிதி ஹபிபோ... நெஞ்சுக்குள்ளே ஏதோ செய்யுதே... உன்னை கண்டதும் ஆசைகள் ஊறுதே... 🎶"
                },
                {
                    "title": "ஆளப்போறான் தமிழன்",
                    "aliases": ["ஆளப்போறான் தமிழன்", "aalaporaan thamizhan"],
                    "lyrics": "🎶 ஆளப்போறான் தமிழன்... உலகம் முழுக்க... நங்கூரம் பாய்ச்சு நிக்கிறான்... தமிழன் என்றாலே... திமிரு தான்டா... 🎶"
                }
            ]

            if len(cleaned_song) >= 2 and cleaned_song not in ['ஒரு', 'இந்த', 'song', 'பாட', 'பாடு']:
                clean_lower = cleaned_song.lower()
                matched = next((s for s in song_db if s["title"].lower() in clean_lower or any(a.lower() in clean_lower for a in s["aliases"])), None)
                if matched:
                    speak_msg = f"🎶 {h}, நீங்கள் கேட்ட '{matched['title']}' பாடலை உங்களுக்காக பாடுகிறேன்... 🎶\n\n{matched['lyrics']}"
                else:
                    speak_msg = f"🎶 {h}, நீங்கள் கேட்ட '{cleaned_song}' பாடலை உங்களுக்காக பாடுகிறேன்... 🎶\n\n🎶 {cleaned_song}... என் நெஞ்சில் ஒலிக்கும் அழகிய கீதமே... இனிமை சிந்தும் இசையோடு... உங்களுக்காக நான் பாடும் பாடலே... 🎶"
            else:
                picked = random.choice(song_db)
                speak_msg = f"🎶 {h}, உங்களுக்காக மெலடி பாடலான '{picked['title']}' பாடலை பாடுகிறேன்... 🎶\n\n{picked['lyrics']}"

            return AIResponse(content=speak_msg, provider="luna-vocal-singer")

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
            return AIResponse(content=f"வாட்ஸ்அப்பில் {phone_num} எண்ணிற்கு செய்தி அனுப்ப பக்கம் திறக்கப்பட்டது {h}!", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_wa", "name": "communication_send_whatsapp", "result": exec_res}])

        # 10. Media Controls (Volume, Play, Pause)
        if "volume" in q or "sound" in q:
            level = 50
            for word in q.split():
                if word.isdigit():
                    level = int(word)
                    break
            tool_calls.append({"id": "call_vol", "function": {"name": "media_volume_set", "arguments": json.dumps({"level": level})}})
            exec_res = await self._execute_tool("media_volume_set", {"level": level}, confirmation_token)
            return AIResponse(content=f"ஒலியளவு {level}% ஆக மாற்றப்பட்டது {h}.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_vol", "name": "media_volume_set", "result": exec_res}])

        if any(w in q for w in ["pause", "stop music", "resume"]):
            tool_calls.append({"id": "call_playpause", "function": {"name": "media_play_pause", "arguments": "{}"}})
            exec_res = await self._execute_tool("media_play_pause", {}, confirmation_token)
            return AIResponse(content=f"பாடலின் இயக்கம் மாற்றப்பட்டது {h}.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_playpause", "name": "media_play_pause", "result": exec_res}])

        # 11. File Organization ("organize downloads", "sort files")
        if "organize" in q or "sort" in q:
            tool_calls.append({"id": "call_organize", "function": {"name": "files_organize_folder", "arguments": "{}"}})
            exec_res = await self._execute_tool("files_organize_folder", {}, confirmation_token)
            return AIResponse(content=f"பதிவிறக்கம் கோப்புறையிலுள்ள கோப்புகள் ஒழுங்குபடுத்தப்பட்டன {h}.", provider="luna-local-engine", tool_calls=tool_calls, tool_results=[{"toolCallId": "call_organize", "name": "files_organize_folder", "result": exec_res}])

        # Default helpful response
        is_english = all(ord(c) < 128 for c in query) and not any(w in q for w in ["sollu", "pannu", "podu", "paadu", "paaru", "epdi", "irukku", "enna", "inga", "vanakkam", "luna"])
        if is_english:
            reply = f"Understood, {h}! Luna is ready. How can I assist you today?"
        else:
            reply = f"புரிந்துகொண்டேன் {h}! உங்கள் கட்டளையை நிறைவேற்ற லூனா தயாராக உள்ளது. சொல்லுங்கள் {h}, என்ன செய்ய வேண்டும்?"
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
            "telephony_make_call": "telephony.make_call",
            "system_timer": "system.timer",
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
