from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            
        self.active_connections[user_id].append(websocket)
        logger.info(f"🟢 User {user_id} connected via WS (Total tabs: {len(self.active_connections[user_id])})")

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        logger.info(f"🔴 User {user_id} tab disconnected")

    async def send_personal_message(self, message: dict, user_id: int):
        """שולח הודעה לכל הטאבים הפתוחים של המשתמש"""
        user_sockets = self.active_connections.get(user_id, [])
        
        for websocket in user_sockets:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"❌ Failed to send WS message to user {user_id}: {e}")

    async def broadcast(self, message: dict):
        """משדר הודעה לכל המשתמשים והטאבים המחוברים בזמן אמת"""
        for user_id, user_sockets in list(self.active_connections.items()):
            for websocket in list(user_sockets):
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.debug(f"Broadcast WS drop: {e}")

manager = ConnectionManager()