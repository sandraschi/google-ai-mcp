"""
Embeddings Client for Google Generative AI

Provides text embeddings for semantic search, similarity, and RAG.

Migration note (Feb 2026):
  OLD: import google.generativeai as genai / genai.embed_content()
  NEW: from google import genai / client.models.embed_content()

Note: text-embedding-004 was shut down Jan 14 2026.
Use gemini-embedding-001 (current stable).
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# text-embedding-004 was shut down Jan 14 2026
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"

AVAILABLE_MODELS = {
    "gemini-embedding-001": "Gemini Embedding 001 (current, 3072 dims, multilingual)",
}


class EmbeddingsClient:
    """Client for text embeddings using google-genai SDK."""

    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._client: genai.Client | None = None

        if not self.api_key:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_API_KEY not set; EmbeddingsClient in mock mode.")
            return

        try:
            self._client = genai.Client(api_key=self.api_key)
            logger.info("EmbeddingsClient initialised with google-genai SDK.")
        except Exception as exc:
            self.mock_mode = True
            self.reason = "invalid_credentials"
            self.last_error = str(exc)
            logger.error(f"EmbeddingsClient init failed: {exc}")

    def get_status(self) -> dict[str, Any]:
        return {
            "mock_mode": self.mock_mode,
            "reason": self.reason,
            "last_error": self.last_error,
            "default_model": DEFAULT_EMBEDDING_MODEL,
        }

    def get_available_models(self) -> dict[str, str]:
        return AVAILABLE_MODELS

    async def embed_text(
        self,
        text: str,
        model: str = DEFAULT_EMBEDDING_MODEL,
        task_type: str | None = None,
    ) -> dict[str, Any]:
        """Embed a single text string."""
        if self.mock_mode:
            return self._mock_embedding(text, model)

        try:
            config = types.EmbedContentConfig(task_type=task_type) if task_type else None
            response = await asyncio.to_thread(
                self._client.models.embed_content,
                model=model,
                contents=text,
                config=config,
            )
            embedding = response.embeddings[0].values if response.embeddings else []
            return {
                "success": True,
                "embedding": embedding,
                "dimensions": len(embedding),
                "model": model,
                "text_length": len(text),
            }
        except Exception as exc:
            logger.error(f"Embedding error: {exc}", exc_info=True)
            return {"success": False, "error": str(exc), "model": model}

    async def embed_batch(
        self,
        texts: list[str],
        model: str = DEFAULT_EMBEDDING_MODEL,
        task_type: str | None = None,
    ) -> dict[str, Any]:
        """Embed multiple texts."""
        if self.mock_mode:
            results = [self._mock_embedding(t, model) for t in texts]
            return {
                "success": True,
                "embeddings": results,
                "count": len(results),
                "model": model,
                "mock": True,
            }

        try:
            config = types.EmbedContentConfig(task_type=task_type) if task_type else None
            response = await asyncio.to_thread(
                self._client.models.embed_content,
                model=model,
                contents=texts,
                config=config,
            )
            embeddings = [
                {
                    "success": True,
                    "embedding": emb.values,
                    "dimensions": len(emb.values),
                    "model": model,
                    "text_length": len(texts[i]),
                }
                for i, emb in enumerate(response.embeddings)
            ]
            return {
                "success": True,
                "embeddings": embeddings,
                "count": len(embeddings),
                "model": model,
            }
        except Exception as exc:
            logger.error(f"Batch embedding error: {exc}", exc_info=True)
            return {"success": False, "error": str(exc), "model": model}

    def _mock_embedding(self, text: str, model: str) -> dict[str, Any]:
        import hashlib

        seed = int(hashlib.md5(text.encode()).hexdigest(), 16)  # noqa: S324
        dims = 3072
        vec = [((seed + i * 31337) % 1000) / 1000.0 - 0.5 for i in range(dims)]
        return {
            "success": True,
            "embedding": vec,
            "dimensions": dims,
            "model": f"{model} (mock)",
            "text_length": len(text),
            "mock": True,
        }


def create_embeddings_client(api_key: str | None = None) -> EmbeddingsClient:
    return EmbeddingsClient(api_key=api_key)
