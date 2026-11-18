import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.session import engine, Base
from app.database.models import *  # Ensure all models are registered
from app.api.endpoints import router as api_router
from app.automation.scheduler import automation_scheduler
from app.ai.brain import ai_brain
from app.services.telegram_bot import telegram_bot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("luna.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables safely
    try:
        logger.info("Initializing LUNA AI database schema...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema init notice: {e}")

    # Start background automation scheduler
    try:
        await automation_scheduler.start()
        logger.info("Automation scheduler initialized.")
    except Exception as e:
        logger.warning(f"Automation scheduler init notice: {e}")

    # Start Telegram Remote Bot if configured
    try:
        telegram_bot.start()
    except Exception as e:
        logger.warning(f"Telegram bot notice: {e}")

    yield

    # Shutdown
    try:
        telegram_bot.stop()
        await automation_scheduler.stop()
    except Exception:
        pass

app = FastAPI(
    title="LUNA AI Core Engine",
    description="JARVIS-Inspired Personal Intelligent Assistant Core Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for Vercel Web, Electron desktop and Expo React Native mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.api_route("/", methods=["GET", "HEAD"])
async def root_ping():
    return {"status": "healthy", "service": "LUNA AI Core", "version": "1.0.0"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    ai_status = await ai_brain.get_health_status()
    return {
        "status": "healthy",
        "service": "LUNA AI Core",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "aiMode": settings.AI_MODE,
        "aiStatus": ai_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ----------------- WebSocket Connection Manager -----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

@app.websocket("/ws/assistant")
async def websocket_assistant_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome and state
        await websocket.send_text(json.dumps({
            "type": "state_change",
            "state": "idle",
            "provider": settings.AI_MODE,
            "message": "LUNA Core connected and ready."
        }))

        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}))
                elif msg_type == "state_update":
                    # Broadcast assistant state (e.g. listening, thinking, speaking)
                    await ws_manager.broadcast({
                        "type": "state_change",
                        "state": data.get("state", "idle"),
                        "source": data.get("source", "client")
                    })
                elif msg_type == "chat_message":
                    # Instant streaming chat
                    query = data.get("message", "")
                    await websocket.send_text(json.dumps({"type": "state_change", "state": "thinking"}))
                    ai_resp = await ai_brain.chat(
                        messages=[{"role": "user", "content": query}],
                        confirmation_token=data.get("confirmationToken")
                    )
                    await websocket.send_text(json.dumps({
                        "type": "chat_response",
                        "message": ai_resp.content,
                        "provider": ai_resp.provider,
                        "toolCalls": ai_resp.tool_calls,
                        "toolResults": ai_resp.tool_results
                    }))
                    await websocket.send_text(json.dumps({"type": "state_change", "state": "idle"}))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON format."}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
