"""
Centralized Logging Service for Gemini Tools.

Provides real-time log collection, storage, and retrieval for the LogViewer UI.
Uses a rotating in-memory buffer with optional file persistence.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections import deque
from collections.abc import Callable
from datetime import datetime
from typing import Any

# Constants
MAX_LOG_ENTRIES = 1000  # Maximum entries in memory buffer
LOG_LEVELS = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}


class LogEntry:
    """Represents a single log entry."""

    def __init__(
        self,
        level: str,
        message: str,
        source: str,
        details: str | None = None,
        timestamp: datetime | None = None,
    ):
        self.id = str(uuid.uuid4())
        self.timestamp = (timestamp or datetime.utcnow()).isoformat()
        self.level = level.upper()
        self.message = message
        self.source = source
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "level": self.level,
            "message": self.message,
            "source": self.source,
            "details": self.details,
        }


class LoggingService:
    """
    Centralized logging service that captures logs from all Gemini Tools components.

    Features:
    - In-memory rotating buffer (max 1000 entries by default)
    - Real-time log capture via custom log handler
    - Filtering by level, source, and time range
    - WebSocket support for live streaming
    """

    _instance: LoggingService | None = None
    _lock = asyncio.Lock()

    def __new__(cls) -> LoggingService:
        """Singleton pattern to ensure one logging service instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._logs: deque[LogEntry] = deque(maxlen=MAX_LOG_ENTRIES)
        self._subscribers: list[Callable[[LogEntry], None]] = []
        self._handler: GeminiToolsLogHandler | None = None
        self._initialized = True

        # Install the custom log handler
        self._install_handler()

    def _install_handler(self):
        """Install custom log handler to capture all logs."""
        self._handler = GeminiToolsLogHandler(self)

        # Get root logger and add our handler
        root_logger = logging.getLogger()
        root_logger.addHandler(self._handler)

        # Also add to specific module loggers
        for module_name in [
            "gemini_tools",
            "veo_client",
            "imagen_client",
            "picture_client",
            "lyria_client",
            "chat_client",
            "embeddings_client",
            "uvicorn",
            "uvicorn.error",
            "uvicorn.access",
            "fastapi",
        ]:
            logger = logging.getLogger(module_name)
            if self._handler not in logger.handlers:
                logger.addHandler(self._handler)

    def add_log(self, entry: LogEntry):
        """Add a log entry to the buffer."""
        self._logs.append(entry)

        # Notify subscribers (for WebSocket streaming)
        for subscriber in self._subscribers:
            try:
                subscriber(entry)
            except Exception:  # noqa: S110
                pass  # Don't let subscriber errors affect logging

    def log(
        self,
        level: str,
        message: str,
        source: str = "gemini_tools",
        details: str | None = None,
    ):
        """Create and add a new log entry."""
        entry = LogEntry(level=level, message=message, source=source, details=details)
        self.add_log(entry)

    def info(
        self, message: str, source: str = "gemini_tools", details: str | None = None
    ):
        self.log("INFO", message, source, details)

    def warning(
        self, message: str, source: str = "gemini_tools", details: str | None = None
    ):
        self.log("WARNING", message, source, details)

    def error(
        self, message: str, source: str = "gemini_tools", details: str | None = None
    ):
        self.log("ERROR", message, source, details)

    def debug(
        self, message: str, source: str = "gemini_tools", details: str | None = None
    ):
        self.log("DEBUG", message, source, details)

    def get_logs(
        self,
        level: str | None = None,
        source: str | None = None,
        search: str | None = None,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        Retrieve logs with optional filtering.

        Args:
            level: Filter by log level (INFO, WARNING, ERROR, DEBUG)
            source: Filter by source module
            search: Text search in message/details
            since: Only logs after this timestamp
            limit: Maximum number of logs to return (newest first)

        Returns:
            List of log entries as dictionaries
        """
        filtered = []

        for entry in reversed(self._logs):  # Newest first
            # Level filter
            if level and level.upper() != "ALL":
                if entry.level != level.upper():
                    continue

            # Source filter
            if source and source.lower() not in entry.source.lower():
                continue

            # Search filter
            if search:
                search_lower = search.lower()
                text = f"{entry.message} {entry.details or ''}".lower()
                if search_lower not in text:
                    continue

            # Time filter
            if since:
                try:
                    entry_time = datetime.fromisoformat(
                        entry.timestamp.replace("Z", "+00:00")
                    )
                    if entry_time < since:
                        continue
                except (ValueError, AttributeError):
                    pass

            filtered.append(entry.to_dict())

            if len(filtered) >= limit:
                break

        return filtered

    def clear_logs(self):
        """Clear all logs from buffer."""
        self._logs.clear()

    def subscribe(self, callback: Callable[[LogEntry], None]):
        """Subscribe to new log entries (for WebSocket streaming)."""
        self._subscribers.append(callback)
        return callback

    def unsubscribe(self, callback: Callable[[LogEntry], None]):
        """Unsubscribe from log entries."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def get_stats(self) -> dict[str, Any]:
        """Get logging statistics."""
        stats = {
            "total_entries": len(self._logs),
            "max_entries": MAX_LOG_ENTRIES,
            "by_level": {
                "INFO": 0,
                "WARNING": 0,
                "ERROR": 0,
                "DEBUG": 0,
                "CRITICAL": 0,
            },
            "by_source": {},
        }

        for entry in self._logs:
            # Count by level
            if entry.level in stats["by_level"]:
                stats["by_level"][entry.level] += 1

            # Count by source
            if entry.source not in stats["by_source"]:
                stats["by_source"][entry.source] = 0
            stats["by_source"][entry.source] += 1

        return stats


class GeminiToolsLogHandler(logging.Handler):
    """Custom log handler that forwards logs to the LoggingService."""

    def __init__(self, service: LoggingService):
        super().__init__()
        self.service = service
        self.setFormatter(logging.Formatter("%(message)s"))

    def emit(self, record: logging.LogRecord):
        """Emit a log record to the logging service."""
        try:
            # Map logging levels
            level = record.levelname

            # Extract source from logger name
            source = record.name
            if source.startswith("uvicorn"):
                source = "uvicorn"
            elif source.startswith("fastapi"):
                source = "fastapi"

            # Format the message
            message = self.format(record)

            # Extract details (exception info if present)
            details = None
            if record.exc_info:
                import traceback

                details = "".join(traceback.format_exception(*record.exc_info))
            elif hasattr(record, "details"):
                details = record.details

            # Create entry
            entry = LogEntry(
                level=level,
                message=message,
                source=source,
                details=details,
                timestamp=datetime.utcfromtimestamp(record.created),
            )

            self.service.add_log(entry)
        except Exception:  # noqa: S110
            # Don't let logging errors cause issues
            pass


# Global instance
_logging_service: LoggingService | None = None


def get_logging_service() -> LoggingService:
    """Get the global logging service instance."""
    global _logging_service
    if _logging_service is None:
        _logging_service = LoggingService()
    return _logging_service


def init_logging_service() -> LoggingService:
    """Initialize and return the logging service."""
    service = get_logging_service()

    # Add startup log
    service.info(
        "Gemini Tools logging service initialized",
        source="logging_service",
        details=f"Max entries: {MAX_LOG_ENTRIES}",
    )

    return service
