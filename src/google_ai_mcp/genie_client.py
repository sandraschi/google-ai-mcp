"""
Genie 4 client - SCAFFOLD, waiting on API access.

Status (Oct 28 2026):
  Genie 4 was announced Oct 27 2026 as a research preview for trusted testers.
  Google says it is "coming soon" to Google AI Ultra subscribers (Project Genie)
  and to early-access partners in the Gemini API / Google AI Studio. A waitlist
  is open. There is NO public model id and NO published request schema yet.
  Genie 3 never had a developer API (Project Genie UI only), so there is
  nothing to migrate from; this module is the first Genie integration here.

What works today:
  - status(): reports availability and configuration, no network.
  - probe():  REAL check. Lists the models visible to GOOGLE_API_KEY and returns
              any whose name contains "genie". Run this once early access
              arrives to learn the actual model id.

What is a best guess (unverified, disabled by default):
  - generate(): only runs when GENIE_MODEL_ID is set. Genie 4 is built on
    Gemini Omni, and Omni / Lyria 3.5 are served through the Interactions API,
    so the call is modelled on that: interactions.create(model, input) with any
    returned video saved to disk. Expect to adjust input/response handling once
    Google documents the real schema. Real-time interactive control (keyboard
    steering, live prompt edits mid-simulation) almost certainly needs a
    streaming/Live-style session and is NOT implemented.

Env:
  GENIE_MODEL_ID   model id to call (unset = generate disabled)
  GOOGLE_API_KEY   Gemini API key (early-access allowlisted project)
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from google import genai

    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None  # type: ignore[assignment]

GENIE_STATUS = "research_preview_waitlist"
GENIE_WAITLIST_URL = "https://deepmind.google/models/"  # waitlist is linked from the Genie 4 post there
GENIE_FACTS = {
    "announced": "2026-10-27",
    "access": "trusted testers only; Ultra (Project Genie) and Gemini API early access 'coming soon'",
    "capabilities": [
        "real-time explorable worlds from text or image prompts",
        "native audio (music, ambient, dialogue)",
        "live natural-language edits (weather, camera, objects, people)",
        "keyboard navigation",
    ],
    "known_limits": [
        "coherence over short sessions only; detail/object drift over time",
        "text inside worlds not reliably legible",
        "no public model id, schema, pricing or rate limits yet",
    ],
}


class GenieNotAvailableError(RuntimeError):
    """Raised when generation is attempted without a configured model id."""


class GenieClient:
    """Scaffold client for Genie 4 world generation."""

    def __init__(self, api_key: str | None = None, model_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.model_id = (model_id or os.getenv("GENIE_MODEL_ID") or "").strip() or None
        self.last_error: str | None = None
        self._client: Any = None
        if GENAI_AVAILABLE and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as exc:
                self.last_error = str(exc)
                logger.error("Genie client init failed: %s", exc)

    @property
    def enabled(self) -> bool:
        return bool(self._client and self.model_id)

    def get_status(self) -> dict[str, Any]:
        if not self.api_key:
            reason = "not_configured"
        elif not self.model_id:
            reason = "awaiting_access"
        else:
            reason = "experimental_enabled"
        return {
            "mock_mode": not self.enabled,
            "reason": reason,
            "availability": GENIE_STATUS,
            "model_id": self.model_id,
            "api_key_configured": bool(self.api_key),
            "waitlist": GENIE_WAITLIST_URL,
            "facts": GENIE_FACTS,
            "message": (
                "Genie 4 is waitlist-only; run probe() to check whether your key can see a Genie model."
                if not self.enabled
                else f"Experimental: generate() will call {self.model_id} via the Interactions API (schema unverified)."
            ),
        }

    async def probe(self) -> dict[str, Any]:
        """List models visible to this key and return any Genie candidates."""
        if not self._client:
            return {"success": False, "error": "GOOGLE_API_KEY not set (or google-genai missing); cannot probe."}

        def _list() -> list[dict[str, Any]]:
            found = []
            for m in self._client.models.list():
                name = (getattr(m, "name", "") or "").removeprefix("models/")
                if "genie" in name.lower():
                    found.append(
                        {
                            "id": name,
                            "display_name": getattr(m, "display_name", None),
                            "actions": getattr(m, "supported_actions", None),
                        }
                    )
            return found

        try:
            candidates = await asyncio.to_thread(_list)
        except Exception as exc:
            self.last_error = str(exc)
            return {"success": False, "error": f"Model listing failed: {exc}"}

        return {
            "success": True,
            "candidates": candidates,
            "message": (
                f"Found {len(candidates)} Genie model(s). Set GENIE_MODEL_ID to one of them to enable generate()."
                if candidates
                else "No Genie model visible to this key yet (still waitlist / not allowlisted)."
            ),
        }

    async def generate(
        self,
        prompt: str,
        image_path: str | None = None,
        output_path: str = "uploads/genie",
    ) -> dict[str, Any]:
        """Best-guess world generation. Disabled unless GENIE_MODEL_ID is set."""
        if not prompt or not prompt.strip():
            return {"success": False, "error": "Prompt cannot be empty"}
        if not self.enabled:
            return {
                "success": False,
                "error": "Genie 4 is not available to this setup (research preview, waitlist). "
                "Run operation='probe'; once a model appears, set GENIE_MODEL_ID.",
                "status": self.get_status(),
            }

        payload: str | list[dict[str, Any]] = prompt.strip()
        if image_path:
            p = Path(image_path)
            if not p.is_file():
                return {"success": False, "error": f"image_path not found: {image_path}"}
            payload = [
                {
                    "type": "image",
                    "mime_type": "image/png" if p.suffix.lower() == ".png" else "image/jpeg",
                    "data": base64.b64encode(p.read_bytes()).decode("ascii"),
                },
                {"type": "text", "text": prompt.strip()},
            ]

        try:
            interaction = await asyncio.to_thread(self._client.interactions.create, model=self.model_id, input=payload)
        except Exception as exc:
            self.last_error = str(exc)
            logger.error("Genie call failed: %s", exc, exc_info=True)
            return {
                "success": False,
                "error": f"Genie call failed (request shape is unverified, may need updating): {exc}",
                "model": self.model_id,
            }

        out_dir = Path(output_path)
        out_dir.mkdir(parents=True, exist_ok=True)
        saved: list[dict[str, str]] = []
        for attr, ext in (("output_video", "mp4"), ("output_audio", "mp3"), ("output_image", "png")):
            item = getattr(interaction, attr, None)
            data = getattr(item, "data", None) if item is not None else None
            if not data:
                continue
            fn = f"genie_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
            path = out_dir / fn
            path.write_bytes(base64.b64decode(data) if isinstance(data, str) else bytes(data))
            saved.append({"kind": attr.removeprefix("output_"), "local_path": str(path), "filename": fn})

        return {
            "success": bool(saved),
            "experimental": True,
            "model": self.model_id,
            "interaction_id": getattr(interaction, "id", None),
            "outputs": saved,
            "text": getattr(interaction, "output_text", None),
            "error": None if saved else "Call succeeded but returned no media the scaffold recognises; inspect raw schema.",
        }


def create_genie_client(api_key: str | None = None, model_id: str | None = None) -> GenieClient:
    return GenieClient(api_key=api_key, model_id=model_id)
