"""Transport helpers: stdio or HTTP (uvicorn) mode."""

from __future__ import annotations

import argparse
import logging
import os

logger = logging.getLogger(__name__)


def run_server(mcp, server_name: str = "google-ai-mcp") -> None:
    """Run the MCP server — stdio or HTTP mode based on CLI args.

    Parses ``--http`` and ``--port`` from ``sys.argv``. When ``--http`` is
    present (the Tauri sidecar convention), starts uvicorn on the given port.
    Otherwise runs stdio.
    """
    parser = argparse.ArgumentParser(prog=server_name)
    parser.add_argument("--http", action="store_true", help="Run in HTTP mode (uvicorn)")
    parser.add_argument("--port", type=int, default=int(os.getenv("MCP_PORT", "11014")), help="HTTP port")
    known, _ = parser.parse_known_args()

    if known.http:
        from google_ai_mcp.server import create_app

        app = create_app()
        import uvicorn

        logger.info("Starting HTTP on port %s", known.port)
        uvicorn.run(app, host="127.0.0.1", port=known.port, log_level="info")
    else:
        import asyncio

        logger.info("Starting stdio")
        asyncio.run(mcp.run_stdio_async())
