"""
Lyria music generation — Lyria 3 only (google-genai + Vertex, location global).

Legacy Lyria 1 / Lyria 2 product and API names are accepted as aliases and
resolved to Lyria 3 model IDs (`lyria-3-pro-preview`, `lyria-3-clip-preview`);
all generation uses the same Lyria 3 code path as Google's Lyria 3 samples.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types as genai_types

    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None  # type: ignore[assignment]
    genai_types = None  # type: ignore[assignment]
    logger.warning("google-genai not installed - Lyria 3 unavailable")

# Lyria 3 model IDs (Vertex, Feb 2026)
LYRIA3_CLIP = "lyria-3-clip-preview"
LYRIA3_PRO = "lyria-3-pro-preview"
DEFAULT_LYRIA_MODEL = LYRIA3_PRO

_CANONICAL_MODELS = frozenset({LYRIA3_PRO, LYRIA3_CLIP})

# alias (lowercase) -> Lyria 3 API model id
_LYRIA_ALIASES: dict[str, str] = {
    # Lyria 3 shorthand
    "lyria-3": LYRIA3_PRO,
    "lyria-3-pro": LYRIA3_PRO,
    "lyria-3-clip": LYRIA3_CLIP,
    # Older product / UI names → Lyria 3
    "lyria-2": LYRIA3_PRO,
    "lyria-002": LYRIA3_PRO,
    "lyria-2.0-music-generation": LYRIA3_PRO,
    "lyria-1.0-music-generation": LYRIA3_CLIP,
    "music-lyra-1.1": LYRIA3_PRO,
    "lyria-en-001": LYRIA3_PRO,
    "musicfx": LYRIA3_PRO,
    "lyria-realtime": LYRIA3_CLIP,
}

LYRIA_MODELS: dict[str, str] = {
    LYRIA3_PRO: "Lyria 3 Pro — full tracks (preview)",
    LYRIA3_CLIP: "Lyria 3 Clip — ~30s clips (preview)",
    "lyria-3": "Lyria 3 Pro (alias)",
    "lyria-3-pro": "Lyria 3 Pro (alias)",
    "lyria-3-clip": "Lyria 3 Clip (alias)",
    "lyria-2": "Legacy name → Lyria 3 Pro",
    "lyria-002": "Legacy API id → Lyria 3 Pro",
    "lyria-2.0-music-generation": "Legacy UI id → Lyria 3 Pro",
    "lyria-1.0-music-generation": "Legacy UI id → Lyria 3 Clip",
    "music-lyra-1.1": "Legacy alias → Lyria 3 Pro",
    "lyria-en-001": "Legacy alias → Lyria 3 Pro",
    "musicfx": "Legacy alias → Lyria 3 Pro",
    "lyria-realtime": "Legacy alias → Lyria 3 Clip",
}


def _resolve_model_key(model: str) -> str:
    m = model.strip().lower()
    if m in _CANONICAL_MODELS:
        return m
    return _LYRIA_ALIASES.get(m, model.strip())


class LyriaClient:
    """Lyria 3 on Vertex via google-genai (Vertex location global)."""

    def __init__(self, api_key: str | None = None, project_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.project_id = (project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._genai_client: Any = None

        if not GENAI_AVAILABLE:
            self.mock_mode = True
            self.reason = "dependency_missing"
            logger.warning("Install google-genai for Lyria 3.")
            return

        if not self.project_id:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_CLOUD_PROJECT not set. Lyria 3 on Vertex requires a project.")
            return

        try:
            self._genai_client = genai.Client(
                vertexai=True,
                project=self.project_id,
                location="global",
            )
            logger.info("Lyria: google-genai Vertex client initialised (location=global).")
        except Exception as exc:
            self._genai_client = None
            self.mock_mode = True
            self.reason = "init_failed"
            self.last_error = str(exc)
            logger.error(f"google-genai Vertex init failed: {exc}", exc_info=True)

    def validate_prompt(self, prompt: str) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 1000:
            return {"valid": False, "error": "Prompt too long (max 1000 characters)"}
        return {"valid": True}

    def get_available_models(self) -> dict[str, str]:
        return dict(LYRIA_MODELS)

    def _duration_bounds(self, model_id: str) -> tuple[int, int]:
        if model_id == LYRIA3_CLIP:
            return 5, 30
        if model_id == LYRIA3_PRO:
            return 5, 180
        return 5, 180

    def _iter_response_parts(self, response: Any) -> list[Any]:
        parts: list[Any] = []
        if hasattr(response, "parts") and response.parts:
            parts.extend(response.parts)
        cands = getattr(response, "candidates", None) or []
        for c in cands:
            content = getattr(c, "content", None)
            if content and getattr(content, "parts", None):
                parts.extend(content.parts)
        return parts

    def _first_audio_bytes(self, response: Any) -> tuple[bytes | None, str]:
        for part in self._iter_response_parts(response):
            inline = getattr(part, "inline_data", None)
            if not inline:
                continue
            raw = getattr(inline, "data", None)
            if raw is None:
                continue
            if isinstance(raw, str):
                data = base64.b64decode(raw)
            else:
                data = bytes(raw)
            mime = getattr(inline, "mime_type", None) or "audio/mpeg"
            return data, mime
        return None, "audio/mpeg"

    async def generate_music(
        self,
        prompt: str,
        model: str = DEFAULT_LYRIA_MODEL,
        duration: int = 30,
        output_path: str | None = None,
        num_tracks: int = 1,
        temperature: float = 1.0,
    ) -> dict[str, Any]:
        _ = temperature  # reserved for API compatibility; Lyria 3 path uses modalities-only config

        validation = self.validate_prompt(prompt)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        if num_tracks < 1 or num_tracks > 4:
            return {"success": False, "error": "Number of tracks must be between 1 and 4."}

        requested = model.strip()
        actual_model = _resolve_model_key(model)
        dmin, dmax = self._duration_bounds(actual_model)
        if duration < dmin or duration > dmax:
            return {
                "success": False,
                "error": f"Duration must be between {dmin} and {dmax} seconds for {actual_model}.",
            }

        if self.mock_mode:
            return await self._mock_generate_music(prompt, model, duration, output_path, num_tracks)

        output_dir = Path(output_path or "outputs/music")
        output_dir.mkdir(parents=True, exist_ok=True)

        if not self._genai_client or not genai_types:
            return {"success": False, "error": "google-genai client not available for Lyria 3."}

        enhanced_prompt = prompt
        if duration:
            enhanced_prompt = f"{prompt}\n\n(Target length: about {duration} seconds.)"

        tracks: list[dict[str, Any]] = []
        try:
            for idx in range(num_tracks):

                def _call_lyria3():
                    return self._genai_client.models.generate_content(
                        model=actual_model,
                        contents=enhanced_prompt,
                        config=genai_types.GenerateContentConfig(
                            response_modalities=["AUDIO", "TEXT"],
                        ),
                    )

                response = await asyncio.to_thread(_call_lyria3)
                audio_bytes, mime = self._first_audio_bytes(response)
                if not audio_bytes:
                    return {
                        "success": False,
                        "error": "No audio in model response. Check model access and prompt safety.",
                        "raw_error": None,
                    }
                ext = ".mp3" if "mpeg" in mime else ".wav" if "wav" in mime else ".bin"
                filename = f"lyria_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{idx}{ext}"
                track_path = output_dir / filename
                track_path.write_bytes(audio_bytes)
                tracks.append(
                    {
                        "id": f"track-{idx}",
                        "url": str(track_path),
                        "local_path": str(track_path),
                        "filename": filename,
                        "status": "completed",
                    }
                )

            return {
                "success": True,
                "tracks": tracks,
                "metadata": {
                    "model": actual_model,
                    "requested_model": requested,
                    "prompt": prompt,
                    "duration": duration,
                    "num_tracks": len(tracks),
                    "generated_at": datetime.utcnow().isoformat(),
                    "api": "vertex_google_genai_lyria3",
                },
                "mock_mode": False,
            }

        except Exception as api_error:
            return self._format_error(api_error)

    def _format_error(self, api_error: BaseException) -> dict[str, Any]:
        error_str = str(api_error).lower()
        if "not found" in error_str or "404" in str(api_error):
            user_message = (
                "Lyria may not be enabled for this project or the model ID is wrong. "
                "Use lyria-3-pro-preview / lyria-3-clip-preview on Vertex (global)."
            )
        elif "permission" in error_str or "403" in str(api_error):
            user_message = "Permission denied: enable Vertex AI and grant roles for generative models."
        elif "quota" in error_str or "429" in str(api_error):
            user_message = "Rate limited: music generation quota exceeded."
        else:
            user_message = f"Music generation failed: {api_error!s}"
        logger.error(f"Lyria API error: {api_error}", exc_info=True)
        return {"success": False, "error": user_message, "raw_error": str(api_error)}

    async def _mock_generate_music(
        self,
        prompt: str,
        model: str,
        duration: int,
        output_path: str | None,
        num_tracks: int,
    ) -> dict[str, Any]:
        await asyncio.sleep(0.5)
        output_dir = Path(output_path or "mock/music")
        output_dir.mkdir(parents=True, exist_ok=True)

        tracks = []
        for i in range(num_tracks):
            filename = f"mock_lyria_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{i}.mp3"
            track_path = output_dir / filename
            track_path.write_text(
                f"Mock audio placeholder\nPrompt: {prompt}\nDuration: {duration}s\n"
                f"Configure GOOGLE_CLOUD_PROJECT + Vertex for Lyria 3 (google-genai).\n"
            )
            tracks.append(
                {
                    "id": f"mock-{i}",
                    "url": str(track_path),
                    "local_path": str(track_path),
                    "filename": filename,
                    "status": "completed",
                }
            )

        return {
            "success": True,
            "tracks": tracks,
            "metadata": {
                "model": model,
                "prompt": prompt,
                "duration": duration,
                "num_tracks": len(tracks),
                "generated_at": datetime.utcnow().isoformat(),
                "api": "mock",
                "note": "Mock mode — set GOOGLE_CLOUD_PROJECT and use Lyria 3 via google-genai on Vertex.",
            },
            "mock_mode": True,
            "message": f"Running in mock mode. Reason: {self.reason}",
        }

    def get_status(self) -> dict[str, Any]:
        if self.mock_mode:
            messages = {
                "not_configured": "GOOGLE_CLOUD_PROJECT not set. Lyria 3 uses Vertex (global).",
                "dependency_missing": "Install google-genai (required for Lyria 3).",
                "init_failed": f"Init failed: {self.last_error}",
            }
            message = messages.get(self.reason, "Running in mock mode.")
        else:
            message = "Lyria 3 ready (google-genai on Vertex, location global)."

        return {
            "api_key_configured": bool(self.api_key),
            "project_id_configured": bool(self.project_id),
            "mock_mode": self.mock_mode,
            "available_models": self.get_available_models(),
            "reason": self.reason,
            "message": message,
            "settings_url": "/settings",
        }


def create_lyria_client(api_key: str | None = None, project_id: str | None = None) -> LyriaClient:
    return LyriaClient(api_key, project_id)
