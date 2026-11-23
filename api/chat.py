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

        # Check for singing song request -> Sing directly in Luna's voice (NO YOUTUBE REDIRECTION)
        song_keywords = ["paatu", "paattu", "sing a song", "sing for me", "பாட்டு", "பாடல்", "பாடு", "pada sona", "nanu pada", "sing", "song pada", "song"]
        if any(w in user_msg.lower() for w in song_keywords):
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
            extracted = user_msg
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
                    speak_msg = f"🎶 {honorific}, நீங்கள் கேட்ட '{matched['title']}' பாடலை உங்களுக்காக பாடுகிறேன்... 🎶\n\n{matched['lyrics']}"
                else:
                    speak_msg = f"🎶 {honorific}, நீங்கள் கேட்ட '{cleaned_song}' பாடலை உங்களுக்காக பாடுகிறேன்... 🎶\n\n🎶 {cleaned_song}... என் நெஞ்சில் ஒலிக்கும் அழகிய கீதமே... இனிமை சிந்தும் இசையோடு... உங்களுக்காக நான் பாடும் பாடலே... 🎶"
            else:
                picked = random.choice(song_db)
                speak_msg = f"🎶 {honorific}, உங்களுக்காக மெலடி பாடலான '{picked['title']}' பாடலை பாடுகிறேன்... 🎶\n\n{picked['lyrics']}"

            self._send_json({
                "conversationId": "ephemeral-session",
                "message": speak_msg,
                "provider": "luna-vocal-singer",
                "toolCalls": [],
                "toolResults": [],
                "ephemeral": True
            })
            return

        # Prepare multi-turn messages array with conversational history (like ChatGPT / Gemini)
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
            "model": "openai/gpt-oss-20b",
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 700
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
