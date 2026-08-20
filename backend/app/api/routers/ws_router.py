from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Cookie, Query
from app.core.ws_manager import manager
import logging
from app.core.security import verify_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websockets"])

ALLOWED_ORIGIN_PATTERNS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

@router.websocket("/ws")
@router.websocket("/ws/{user_id_param}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id_param: str | None = None,
    token: str | None = Query(None),
    access_token: str | None = Cookie(None)
):
    origin = websocket.headers.get("origin")
    if origin and origin not in ALLOWED_ORIGIN_PATTERNS and not origin.startswith("http://localhost:") and not origin.startswith("http://127.0.0.1:"):
        logger.warning(f"🚫 WS Connection rejected: Unauthorized origin '{origin}'")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Extract token from query param or cookie
    raw_token = token or access_token
    user_id: int | None = None

    if raw_token:
        try:
            token_str = raw_token.replace("Bearer ", "") if raw_token.startswith("Bearer ") else raw_token
            payload = verify_token(token_str)
            sub = payload.get("sub") or payload.get("user_id")
            if sub:
                user_id = int(sub)
        except Exception as e:
            logger.warning(f"🚫 WS Connection warning: Invalid Token ({e})")
            if not user_id_param:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return

    # Fallback to path parameter if token wasn't provided or parsed but user_id_param is given and valid int
    if user_id is None and user_id_param:
        try:
            user_id = int(user_id_param)
        except ValueError:
            pass

    if user_id is None:
        logger.warning("🚫 WS Connection rejected: No valid user authentication found")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Successful connection
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to heartbeat pings if sent
            if data and "PING" in data:
                try:
                    await websocket.send_json({"type": "PONG"})
                except Exception:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)