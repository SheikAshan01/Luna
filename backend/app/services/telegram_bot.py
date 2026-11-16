import os
import io
import asyncio
import logging
from typing import Optional
import httpx
from PIL import ImageGrab

from app.core.config import settings
from app.ai.brain import ai_brain
from app.actions.executor import ActionExecutor
from app.voice.tts import tts_engine

logger = logging.getLogger("luna.telegram")

class TelegramRemoteBot:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.allowed_chat_id = settings.TELEGRAM_ALLOWED_CHAT_ID
        self.pairing_code = settings.TELEGRAM_PAIRING_CODE
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""

    def start(self):
        if not self.bot_token:
            logger.info("Telegram Bot Token not configured. Remote telegram control is disabled.")
            return
        self.is_running = True
        self.task = asyncio.create_task(self._poll_loop())
        logger.info("Telegram Remote Bot daemon started.")

    def stop(self):
        self.is_running = False
        if self.task and not self.task.done():
            self.task.cancel()
        logger.info("Telegram Remote Bot stopped.")

    async def _send_message(self, client: httpx.AsyncClient, chat_id: str, text: str):
        try:
            url = f"{self.base_url}/sendMessage"
            payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
            await client.post(url, json=payload, timeout=10.0)
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")

    async def _send_photo(self, client: httpx.AsyncClient, chat_id: str, photo_bytes: bytes, caption: str = ""):
        try:
            url = f"{self.base_url}/sendPhoto"
            files = {"photo": ("screen.jpg", photo_bytes, "image/jpeg")}
            data = {"chat_id": chat_id, "caption": caption}
            await client.post(url, data=data, files=files, timeout=20.0)
        except Exception as e:
            logger.error(f"Failed to send Telegram photo: {e}")

    async def _poll_loop(self):
        offset = 0
        async with httpx.AsyncClient(timeout=35.0) as client:
            while self.is_running:
                try:
                    url = f"{self.base_url}/getUpdates?offset={offset}&timeout=20"
                    res = await client.get(url)
                    if res.status_code == 200:
                        updates = res.json().get("result", [])
                        for update in updates:
                            offset = update["update_id"] + 1
                            message = update.get("message")
                            if not message:
                                continue

                            chat_id = str(message["chat"]["id"])
                            text = (message.get("text") or "").strip()

                            await self._handle_update(client, chat_id, text)
                    await asyncio.sleep(0.5)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.debug(f"Telegram polling exception: {e}")
                    await asyncio.sleep(5)

    async def _handle_update(self, client: httpx.AsyncClient, chat_id: str, text: str):
        if not text:
            return

        # Check Authorization
        if self.allowed_chat_id != chat_id:
            if text == self.pairing_code or text.upper() == self.pairing_code.upper():
                self.allowed_chat_id = chat_id
                settings.TELEGRAM_ALLOWED_CHAT_ID = chat_id
                welcome = (
                    "✅ *Device Authorized Successfully!*\n\n"
                    "Vanakkam Boss! You are now connected to your Windows workstation via LUNA.\n\n"
                    "*Available Remote Commands:*\n"
                    "• `/status` - Check PC CPU, RAM, & Battery\n"
                    "• `/screenshot` - Receive live screenshot of PC screen\n"
                    "• `/lock` - Lock workstation immediately\n"
                    "• `/say <text>` - Speak out loud through PC speakers\n"
                    "• Or send *any text/question* to converse with LUNA and control your PC!"
                )
                await self._send_message(client, chat_id, welcome)
                return
            else:
                prompt_auth = (
                    "🔒 *LUNA Personal AI Security Barrier*\n\n"
                    "This system is private and protected. Please enter the pairing code to authorize this device:"
                )
                await self._send_message(client, chat_id, prompt_auth)
                return

        # Handle Authorized Commands
        cmd = text.split()[0].lower() if text.startswith("/") else ""

        if cmd == "/start" or cmd == "/help":
            help_text = (
                "🤖 *LUNA Remote Control Panel*\n\n"
                "• `/status` — Live system health (CPU, RAM, Battery)\n"
                "• `/screenshot` — Capture and view your PC screen\n"
                "• `/lock` — Lock Windows workstation\n"
                "• `/say <message>` — Speak through PC speakers\n"
                "• Any voice/text command: e.g. *'Open VS Code'*, *'Check my notes'*, *'Volume 30%'*"
            )
            await self._send_message(client, chat_id, help_text)

        elif cmd == "/status":
            health = await ActionExecutor.execute("system.get_health", {})
            data = health.get("data", {})
            msg = (
                f"💻 *LUNA System Telemetry:*\n"
                f"• Host: `{data.get('hostname')}`\n"
                f"• CPU Load: `{data.get('cpuUsagePercent')}%`\n"
                f"• Memory: `{data.get('memoryUsagePercent')}%`\n"
                f"• Battery: `{data.get('batteryPercent')}%` ({'Charging' if data.get('batteryPowerPlugged') else 'Battery'})\n"
                f"• Time: `{data.get('timestamp')}`"
            )
            await self._send_message(client, chat_id, msg)

        elif cmd == "/screenshot":
            await self._send_message(client, chat_id, "📸 Capturing screen display...")
            try:
                screen = ImageGrab.grab()
                buf = io.BytesIO()
                screen.save(buf, format="JPEG", quality=75)
                buf.seek(0)
                await self._send_photo(client, chat_id, buf.getvalue(), "Live Desktop Screenshot")
            except Exception as e:
                await self._send_message(client, chat_id, f"❌ Screenshot failed: {e}")

        elif cmd == "/lock":
            res = await ActionExecutor.execute("pc.lock", {})
            await self._send_message(client, chat_id, "🔒 Windows workstation has been locked.")

        elif cmd == "/say":
            say_text = text[4:].strip()
            if say_text:
                await self._send_message(client, chat_id, f"🔊 Speaking through PC: \"{say_text}\"")
                try:
                    await tts_engine.synthesize(say_text, voice=settings.TAMIL_TTS_VOICE)
                except Exception:
                    pass
            else:
                await self._send_message(client, chat_id, "Usage: `/say Hello boss`")

        else:
            # Process with Hybrid AI Brain
            resp = await ai_brain.process_chat(
                user_message=text,
                conversation_id=f"tg-{chat_id}",
                preferred_language="ta-IN"
            )
            reply_msg = f"🌙 *LUNA:*\n{resp.content}"
            if resp.tool_results:
                tool_notes = "\n".join([f"⚙️ Action `{tr['name']}` executed." for tr in resp.tool_results])
                reply_msg += f"\n\n{tool_notes}"
            await self._send_message(client, chat_id, reply_msg)

telegram_bot = TelegramRemoteBot()
