"""
picture_client.py — compatibility shim for main.py imports.

main.py imports: from picture_client import ImagenClient, create_imagen_client
This module re-exports from imagen_client (the migrated implementation).
"""

from google_ai_mcp.imagen_client import ImagenClient, create_imagen_client

__all__ = ["ImagenClient", "create_imagen_client"]
