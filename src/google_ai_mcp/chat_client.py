"""
Gemini Chat Client

Python client for chat using the google-genai SDK (unified, GA as of 2026).
Falls back to deterministic mock when credentials are missing.

Migration note (Feb 2026):
  OLD: import google.generativeai as genai / genai.configure() / genai.GenerativeModel()
  NEW: from google import genai / genai.Client(api_key=...) / client.aio.models.generate_content()
"""

from __future__ import annotations

import asyncio
import base64
import binascii
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Current recommended chat models (Apr 2026)
# gemini-3-pro-preview shut down March 9 2026 - migrated to 3.1
DEFAULT_CHAT_MODEL = "gemini-3.1-pro-preview"

# Hosted Gemma on Gemini API — Gemma 4 supersedes Gemma 3; legacy Gemma 3 ids resolve in resolve_chat_model().
GEMMA4_31B = "gemma-4-31b-it"
GEMMA4_26B_MOE = "gemma-4-26b-a4b-it"

_GEMMA3_TO_GEMMA4: dict[str, str] = {
    "gemma-3-27b-it": GEMMA4_31B,
    "gemma-3-12b-it": GEMMA4_31B,
    "gemma-3-4b-it": GEMMA4_26B_MOE,
    "gemma-3-1b-it": GEMMA4_26B_MOE,
    "gemma-3n-e4b-it": GEMMA4_26B_MOE,
    "gemma-3n-e2b-it": GEMMA4_26B_MOE,
}


def resolve_chat_model(model: str) -> tuple[str, str]:
    """Return (api_model_id, user_requested_id). Gemma 3* → Gemma 4 hosted ids."""
    requested = model.strip()
    m = requested.lower()
    if m.startswith("gemma-3"):
        resolved = _GEMMA3_TO_GEMMA4.get(m, GEMMA4_31B)
        return resolved, requested
    return requested, requested


AVAILABLE_CHAT_MODELS = {
    "gemini-3.1-pro-preview": "Gemini 3.1 Pro Preview (latest, recommended)",
    "gemini-3-flash-preview": "Gemini 3 Flash (fast, cost-effective)",
    "gemini-2.5-flash": "Gemini 2.5 Flash (stable GA)",
    "gemini-2.5-pro": "Gemini 2.5 Pro (stable GA)",
    GEMMA4_31B: "Gemma 4 31B IT (multimodal: text + image on Gemini API)",
    GEMMA4_26B_MOE: "Gemma 4 26B A4B MoE IT (multimodal: text + image on Gemini API)",
    "gemma-3-27b-it": "Legacy Gemma 3 id → Gemma 4 31B IT",
    "gemma-3-12b-it": "Legacy Gemma 3 id → Gemma 4 31B IT",
    "gemma-3-4b-it": "Legacy Gemma 3 id → Gemma 4 26B MoE IT",
    "gemma-3n-e4b-it": "Legacy Gemma 3n id → Gemma 4 26B MoE IT",
    "gemma-3n-e2b-it": "Legacy Gemma 3n id → Gemma 4 26B MoE IT",
}


def _mime_from_image_path(path_str: str) -> str:
    low = path_str.lower()
    if low.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if low.endswith(".png"):
        return "image/png"
    if low.endswith(".webp"):
        return "image/webp"
    if low.endswith(".gif"):
        return "image/gif"
    if low.endswith(".heic"):
        return "image/heic"
    if low.endswith(".bmp"):
        return "image/bmp"
    return "image/jpeg"


def _mime_from_image_bytes(data: bytes) -> str:
    if len(data) >= 3 and data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(data) >= 6 and data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if len(data) >= 2 and data[:2] == b"BM":
        return "image/bmp"
    return "image/jpeg"


def build_multimodal_contents(prompt: str, images: list[str] | None) -> list[Any]:
    """Build user `contents` parts: image(s) then text. Accepts file paths, data URLs, or raw base64."""
    parts: list[Any] = []
    if not images:
        return [types.Part.from_text(text=prompt)]

    for img_ref in images:
        ref = img_ref.strip()
        if not ref:
            continue
        p = Path(ref)
        if p.is_file():
            raw = p.read_bytes()
            mime = _mime_from_image_path(ref)
            parts.append(types.Part.from_bytes(data=raw, mime_type=mime))
            continue
        if ref.startswith("data:"):
            header, b64data = ref.split(",", 1)
            mime = header.split(":")[1].split(";")[0]
            try:
                raw = base64.b64decode(b64data)
            except (binascii.Error, ValueError) as exc:
                logger.warning("Skip invalid data URL image: %s", exc)
                continue
            parts.append(types.Part.from_bytes(data=raw, mime_type=mime))
            continue
        # Raw base64 without data: prefix (browser clients often send data URLs; this is a fallback)
        try:
            raw = base64.b64decode(ref, validate=False)
        except (binascii.Error, ValueError) as exc:
            logger.warning("Skip unreadable image ref: %s", exc)
            continue
        if raw:
            parts.append(types.Part.from_bytes(data=raw, mime_type=_mime_from_image_bytes(raw)))

    text = prompt.strip() or "Answer based on the image(s)."
    parts.append(types.Part.from_text(text=text))
    return parts


class ChatClient:
    """Client for Gemini chat using the google-genai SDK."""

    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._client: genai.Client | None = None

        if not self.api_key:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_API_KEY not configured; ChatClient running in mock mode.")
            return

        try:
            self._client = genai.Client(api_key=self.api_key)
            logger.info("ChatClient initialised with google-genai SDK.")
        except Exception as exc:
            self.mock_mode = True
            self.reason = "invalid_credentials"
            self.last_error = str(exc)
            logger.error(f"ChatClient init failed: {exc}")

    def get_status(self) -> dict[str, Any]:
        return {
            "mock_mode": self.mock_mode,
            "reason": self.reason,
            "last_error": self.last_error,
            "default_model": DEFAULT_CHAT_MODEL,
        }

    def get_available_models(self) -> dict[str, str]:
        return AVAILABLE_CHAT_MODELS

    async def chat(
        self,
        prompt: str,
        model: str = DEFAULT_CHAT_MODEL,
        persona: str | None = None,
        images: list[str] | None = None,
        audio: str | None = None,
        tools: list[dict[str, Any]] | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> dict[str, Any]:
        """Generate a chat response."""
        resolved_model, requested_model = resolve_chat_model(model)
        if self.mock_mode:
            return self._mock_response(prompt, resolved_model, requested_model, images)

        try:
            contents = build_multimodal_contents(prompt, images)

            config = types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            )
            if persona:
                config.system_instruction = persona

            response = await self._client.aio.models.generate_content(
                model=resolved_model,
                contents=contents,
                config=config,
            )

            text = response.text or ""
            out: dict[str, Any] = {
                "success": True,
                "response": text,
                "model": resolved_model,
                "timestamp": datetime.utcnow().isoformat(),
            }
            if requested_model != resolved_model:
                out["requested_model"] = requested_model
            if images:
                out["images_used"] = len(images)
            return out

        except Exception as exc:
            logger.error(f"Chat error: {exc}", exc_info=True)
            return {
                "success": False,
                "error": str(exc),
                "model": resolved_model,
                "requested_model": requested_model,
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def chat_stream(
        self,
        prompt: str,
        model: str = DEFAULT_CHAT_MODEL,
        persona: str | None = None,
        images: list[str] | None = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ):
        """Async generator yielding streamed text chunks."""
        resolved_model, requested_model = resolve_chat_model(model)
        if self.mock_mode:
            mock = self._mock_response(prompt, resolved_model, requested_model, images)
            for word in mock["response"].split():
                yield word + " "
                await asyncio.sleep(0.03)
            return

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        if persona:
            config.system_instruction = persona

        stream_contents: str | list[Any] = (
            build_multimodal_contents(prompt, images) if images else prompt
        )

        try:
            async for chunk in await self._client.aio.models.generate_content_stream(
                model=resolved_model,
                contents=stream_contents,
                config=config,
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as exc:
            logger.error(f"Stream error: {exc}")
            yield f"\n[Error: {exc}]"

    def _mock_response(
        self,
        prompt: str,
        resolved_model: str,
        requested_model: str,
        images: list[str] | None = None,
    ) -> dict[str, Any]:
        if images:
            responses = [
                f"[Mock vision] Model {resolved_model} received {len(images)} image(s). "
                f"Your question: {prompt[:120]!r}… Configure GOOGLE_API_KEY for real multimodal answers.",
                "This is mock mode — image bytes are not sent to the API without a key.",
            ]
        else:
            responses = [
                "This is a simulated response from Gemini Tools mock mode.",
                "Configure GOOGLE_API_KEY to enable live responses.",
                f"You asked: '{prompt[:80]}...' — mock mode active.",
            ]
        import hashlib

        idx = int(hashlib.md5(prompt.encode()).hexdigest(), 16) % len(responses)  # noqa: S324
        out: dict[str, Any] = {
            "success": True,
            "response": responses[idx],
            "model": f"{resolved_model} (mock)",
            "mock": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if requested_model != resolved_model:
            out["requested_model"] = requested_model
        if images:
            out["images_used"] = len(images)
        return out


def create_chat_client(api_key: str | None = None) -> ChatClient:
    return ChatClient(api_key=api_key)
