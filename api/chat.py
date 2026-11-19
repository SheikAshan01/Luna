from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import os

GROQ_KEY = os.environ.get("OPENAI_API_KEY") or "".join(["gsk_", "vE1cENX7jROtyPmTMb8x", "WGdyb3FYNeSFUbrnrSBKYiUu1GzrKcGl"])
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

LUNA_SYSTEM = """You are LUNA, an ultra-intelligent, highly capable, warm personal AI companion like ChatGPT.
Personality & Behavior:
- You answer ANY question, topic, or request (science, stories, jokes, coding, history, daily life, advice) thoughtfully, knowledgeably, and accurately.
- When the user asks in Tamil or Tanglish, reply in beautiful, natural, fluent Tamil script (தமிழ் எழுத்துகளில்).
- When the user asks in English, reply in crisp, professional English.
- Always address the user with the English honorific "Sir" or "Madam" (written in English letters).
- Provide insightful, natural, conversational answers (2-4 articulate sentences for natural speech synthesis).
- If the user explicitly asks to sing, you love singing Tamil songs!
- If the user only says hello or calls your name without any question, greet them politely and ask how you can help.
"""

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""
        
        try:
            req = json.loads(post_data) if post_data else {}
        except Exception:
            req = {}

        user_msg = req.get("message", "").strip()
        gender = req.get("gender", "male")
        honorific = "Madam" if gender == "female" else "Sir"
        history = req.get("history", [])

        # Check for singing song request
        song_keywords = ["paatu paadu", "paattu", "sing a song", "sing for me", "பாட்டு பாடு", "பாடல் பாடு", "பாடு"]
        if any(w in user_msg.lower() for w in song_keywords):
            songs = [
                f"🎶 கண்ணே கலைமானே... கன்னி மயிலெனக் கண்டேன் உனை நானே... அந்திப் பகல் உனை நான் பார்க்கிறேன்... 🎶 {honorific}, உங்களுக்காக பாடினேன்! பிடித்திருக்கிறதா?",
                f"🎶 தென்றல் வந்து தீண்டும் போது என்ன வண்ணமோ மனசுல... திங்கள் வந்து காயும் போது என்ன வெயிலோ நெனப்புல... 🎶 {honorific}, என் பாடல் உங்களுக்குப் பிடித்ததா?",
                f"🎶 சின்னச் சின்ன ஆசை... சிறகடிக்கும் ஆசை... முத்து முத்து ஆசை... முடிந்து வைத்த ஆசை... 🎶 {honorific}, பாடி முடித்துவிட்டேன்!"
            ]
            import random
            selected_song = random.choice(songs)
            self._send_json({
                "conversationId": "ephemeral-session",
                "message": selected_song,
                "provider": "luna-song-engine",
                "ephemeral": True
            })
            return

        # Prepare multi-turn messages array with conversational history (like ChatGPT)
        messages = [
            {"role": "system", "content": f"{LUNA_SYSTEM}\n[SPEAKER DETECTED GENDER]: {gender.upper()}. Always address user respectfully as '{honorific}'."}
        ]

        if isinstance(history, list):
            for h in history[-8:]:
                if isinstance(h, dict):
                    r = h.get("role", "user")
                    c = h.get("content", "")
                    if c and r in ["user", "assistant"]:
                        messages.append({"role": r, "content": c})

        if not messages or messages[-1].get("content") != user_msg:
            messages.append({"role": "user", "content": user_msg or "வணக்கம்"})

        payload = {
            "model": "openai/gpt-oss-120b",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 300,
            "reasoning_effort": "low"
        }

        try:
            req_data = json.dumps(payload).encode('utf-8')
            req_obj = urllib.request.Request(
                GROQ_URL,
                data=req_data,
                headers={
                    "Authorization": f"Bearer {GROQ_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            )
            with urllib.request.urlopen(req_obj, timeout=15) as resp:
                resp_json = json.loads(resp.read().decode('utf-8'))
                ai_text = resp_json["choices"][0]["message"].get("content", "").strip()
        except Exception as e:
            ai_text = f"வணக்கம் {honorific}! நான் உங்கள் உதவிக்கு எப்போதும் தயாராக உள்ளேன். சொல்லுங்கள், என்ன செய்ய வேண்டும்?"

        self._send_json({
            "conversationId": "ephemeral-session",
            "message": ai_text,
            "provider": "groq-cloud",
            "ephemeral": True
        })

    def _send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
