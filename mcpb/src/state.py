"""Process-wide mutable state: WebSocket manager and in-memory job status maps."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import WebSocket

from google_ai_mcp.schemas import MovieGenerationStatus, RomanceNovelStatus, VideoGenerationStatus

logger = logging.getLogger("gemini_tools")

video_generations: dict[str, VideoGenerationStatus] = {}
movie_generations: dict[str, MovieGenerationStatus] = {}
romance_novels: dict[str, RomanceNovelStatus] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.client_connections: dict[str, list[str]] = {}
        self.connection_clients: dict[str, str] = {}

    async def connect(self, websocket: WebSocket, client_id: str | None = None):
        await websocket.accept()
        connection_id = str(uuid.uuid4())
        self.active_connections[connection_id] = websocket

        if client_id:
            if client_id not in self.client_connections:
                self.client_connections[client_id] = []
            self.client_connections[client_id].append(connection_id)
            self.connection_clients[connection_id] = client_id

            await self.send_personal_message(
                {
                    "type": "connection_established",
                    "connection_id": connection_id,
                    "client_id": client_id,
                    "timestamp": datetime.utcnow().isoformat(),
                },
                connection_id,
            )

            logger.info("Client %s connected with connection ID: %s", client_id, connection_id)

        return connection_id

    async def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]

            if connection_id in self.connection_clients:
                client_id = self.connection_clients[connection_id]
                if client_id in self.client_connections:
                    self.client_connections[client_id].remove(connection_id)
                    if not self.client_connections[client_id]:
                        del self.client_connections[client_id]
                del self.connection_clients[connection_id]

                logger.info("Client %s disconnected (connection ID: %s)", client_id, connection_id)

    async def send_personal_message(self, message: dict, connection_id: str):
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error("Error sending message to connection %s: %s", connection_id, e)
                await self.disconnect(connection_id)

    async def broadcast_to_client(self, client_id: str, message: dict):
        if client_id in self.client_connections:
            for connection_id in list(self.client_connections[client_id]):
                await self.send_personal_message(message, connection_id)


manager = ConnectionManager()
