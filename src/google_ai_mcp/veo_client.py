"""
Veo video generation via Vertex AI (Gemini Enterprise Agent Platform).

Models (Oct 2026):
  veo-3.1-generate-001       GA (default); retirement "Nov 17 2026 or later"
  veo-3.1-fast-generate-001  GA, faster/cheaper
  veo-3.1-lite-generate-001  preview, lowest cost
On the Gemini Developer API the Veo 3.1 previews were shut down Oct 22 2026 (Google
points to gemini-omni-1.1-flash there, see omni_client.py), and veo-3.0-* / veo-2.0-*
were shut down Jun 30 2026. So Veo here is Vertex-only: GOOGLE_CLOUD_PROJECT required.

Uses google-genai (vertexai=True) models.generate_videos, a long-running operation
that is polled until done. The previous implementation called the Vertex
PredictionService.predict() endpoint, which does not serve Veo (it needs
predictLongRunning), so live calls could not have succeeded.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types

    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]
    logger.warning("google-genai not installed - video generation will use mock mode")

DEFAULT_VEO_MODEL = "veo-3.1-generate-001"
VEO_MODELS = {
    DEFAULT_VEO_MODEL: "Veo 3.1 (GA, Vertex; retirement Nov 17 2026 or later)",
    "veo-3.1-fast-generate-001": "Veo 3.1 Fast (GA, Vertex)",
    "veo-3.1-lite-generate-001": "Veo 3.1 Lite (preview, Vertex)",
}

_VEO_ALIASES: dict[str, str] = {
    "veo": DEFAULT_VEO_MODEL,
    "veo-3.1": DEFAULT_VEO_MODEL,
    "veo-3.1-fast": "veo-3.1-fast-generate-001",
    "veo-3.1-lite": "veo-3.1-lite-generate-001",
    # retired ids
    "veo-3.1-preview-002": DEFAULT_VEO_MODEL,
    "veo-3.1-generate-preview": DEFAULT_VEO_MODEL,
    "veo-3.1-fast-generate-preview": "veo-3.1-fast-generate-001",
    "veo-3.1-lite-generate-preview": "veo-3.1-lite-generate-001",
    "veo-3.0-generate-001": DEFAULT_VEO_MODEL,
    "veo-3.0-generate-preview": DEFAULT_VEO_MODEL,
    "veo-3.0-fast-generate-001": "veo-3.1-fast-generate-001",
    "veo-2.0-generate-001": DEFAULT_VEO_MODEL,
}

VEO_DURATIONS = (4, 6, 8)
VEO_ASPECT_RATIOS = ("16:9", "9:16")
POLL_INTERVAL_S = 10
POLL_TIMEOUT_S = 600


def resolve_veo_model(model: str | None) -> str:
    if not model:
        return DEFAULT_VEO_MODEL
    m = model.strip()
    return _VEO_ALIASES.get(m.lower(), m)


class VeoClient:
    """Client for Veo video generation via Vertex AI (google-genai SDK)."""

    def __init__(self, api_key: str | None = None, project_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.project_id = (project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._client: Any = None

        if not GENAI_AVAILABLE:
            self.mock_mode = True
            self.reason = "dependency_missing"
            return

        if not self.project_id:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_CLOUD_PROJECT not set. Veo 3.1 GA models are Vertex-only.")
            return

        try:
            self._client = genai.Client(vertexai=True, project=self.project_id, location=self.location)
            logger.info(f"Veo client initialized (Vertex, project {self.project_id}, {self.location})")
        except Exception as exc:
            self.mock_mode = True
            self.reason = "init_failed"
            self.last_error = str(exc)
            logger.error(f"Failed to initialize Veo: {exc}", exc_info=True)

    def validate_prompt(self, prompt: str) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 4000:
            return {"valid": False, "error": "Prompt too long (max 4000 characters)"}
        return {"valid": True}

    def get_available_models(self) -> dict[str, str]:
        return VEO_MODELS

    async def generate_video(
        self,
        prompt: str,
        model: str = DEFAULT_VEO_MODEL,
        duration: int = 8,
        aspect_ratio: str = "16:9",
        output_path: str = ".",
        num_videos: int = 1,
        resolution: str | None = None,
        generate_audio: bool = True,
    ) -> dict[str, Any]:
        """Generate video with Veo 3.1. Blocks (polling) until the operation finishes."""
        validation = self.validate_prompt(prompt)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        model = resolve_veo_model(model)
        if duration not in VEO_DURATIONS:
            # Snap to the nearest supported length instead of rejecting older callers (5, 6, 7 ...).
            snapped = min(VEO_DURATIONS, key=lambda d: abs(d - duration))
            logger.info("Veo duration %s not supported, using %s", duration, snapped)
            duration = snapped
        if aspect_ratio not in VEO_ASPECT_RATIOS:
            return {"success": False, "error": f"aspect_ratio must be one of {', '.join(VEO_ASPECT_RATIOS)}"}
        if num_videos < 1 or num_videos > 4:
            return {"success": False, "error": "Number of videos must be between 1 and 4."}

        if self.mock_mode or not self._client:
            return await self._mock_generate_video(prompt, model, duration, aspect_ratio, output_path, num_videos)

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        cfg: dict[str, Any] = {
            "number_of_videos": num_videos,
            "duration_seconds": duration,
            "aspect_ratio": aspect_ratio,
            "person_generation": "allow_adult",
            "generate_audio": generate_audio,
        }
        if resolution:
            cfg["resolution"] = resolution

        def _run() -> Any:
            op = self._client.models.generate_videos(
                model=model,
                prompt=prompt,
                config=types.GenerateVideosConfig(**cfg),
            )
            deadline = time.monotonic() + POLL_TIMEOUT_S
            while not op.done:
                if time.monotonic() > deadline:
                    raise TimeoutError(f"Veo operation not done after {POLL_TIMEOUT_S}s: {getattr(op, 'name', '?')}")
                time.sleep(POLL_INTERVAL_S)
                op = self._client.operations.get(op)
            return op

        try:
            op = await asyncio.to_thread(_run)
        except Exception as api_error:
            return self._format_error(api_error)

        if getattr(op, "error", None):
            return {"success": False, "error": f"Veo operation failed: {op.error}", "raw_error": str(op.error)}

        generated = getattr(getattr(op, "response", None), "generated_videos", None) or []
        videos = []
        stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        for idx, gv in enumerate(generated):
            video = getattr(gv, "video", None)
            data = getattr(video, "video_bytes", None) if video else None
            if not data:
                continue
            filename = f"veo_{stamp}_{idx}.mp4"
            video_path = output_dir / filename
            video_path.write_bytes(data)
            videos.append({"url": str(video_path), "local_path": str(video_path), "filename": filename})

        if not videos:
            filtered = getattr(getattr(op, "response", None), "rai_media_filtered_reasons", None)
            return {
                "success": False,
                "error": "No video data returned (likely blocked by safety filters).",
                "filtered_reasons": filtered,
            }

        return {
            "success": True,
            "videos": videos,
            "metadata": {
                "model": model,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "num_videos": len(videos),
                "generated_at": datetime.utcnow().isoformat(),
                "api": "vertex_genai_generate_videos",
            },
            "mock_mode": False,
        }

    def _format_error(self, api_error: BaseException) -> dict[str, Any]:
        err = str(api_error)
        low = err.lower()
        if "not found" in low or "404" in err:
            msg = "Veo model not found or not enabled for this project/region (Veo 3.1 GA is us-central1)."
        elif "permission" in low or "403" in err:
            msg = "Permission denied: enable Vertex AI and grant the service account access to Veo."
        elif "quota" in low or "429" in err:
            msg = "Rate limited: Veo quota exceeded."
        elif isinstance(api_error, TimeoutError):
            msg = err
        else:
            msg = f"Video generation failed: {err}"
        self.last_error = err
        logger.error(f"Veo API error: {api_error}", exc_info=True)
        return {"success": False, "error": msg, "raw_error": err}

    async def _mock_generate_video(
        self,
        prompt: str,
        model: str,
        duration: int,
        aspect_ratio: str,
        output_path: str,
        num_videos: int,
    ) -> dict[str, Any]:
        await asyncio.sleep(0.3)
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        videos = []
        for i in range(num_videos):
            filename = f"mock_veo_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{i}.mp4"
            video_path = output_dir / filename
            video_path.write_text(
                f"Mock video placeholder (NOT a real video)\nPrompt: {prompt}\nDuration: {duration}s\n"
                "Configure GOOGLE_CLOUD_PROJECT for live Veo output.\n"
            )
            videos.append({"url": str(video_path), "local_path": str(video_path), "filename": filename})

        return {
            "success": True,
            "videos": videos,
            "metadata": {
                "model": model,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "num_videos": len(videos),
                "generated_at": datetime.utcnow().isoformat(),
                "api": "mock",
            },
            "mock_mode": True,
            "message": f"Running in mock mode. Reason: {self.reason}",
        }

    def get_status(self) -> dict[str, Any]:
        if self.mock_mode:
            messages = {
                "not_configured": "GOOGLE_CLOUD_PROJECT not set. Veo 3.1 GA is Vertex-only (Gemini API key: use Omni).",
                "dependency_missing": "Install google-genai>=2.6 for video generation.",
                "init_failed": f"Failed to initialize: {self.last_error}",
            }
            message = messages.get(self.reason, "Running in mock mode.")
        else:
            message = "Veo client ready (Vertex, google-genai generate_videos)."

        return {
            "api_key_configured": bool(self.api_key),
            "project_id_configured": bool(self.project_id),
            "mock_mode": self.mock_mode,
            "available_models": self.get_available_models(),
            "durations": list(VEO_DURATIONS),
            "reason": self.reason,
            "message": message,
            "settings_url": "/settings",
        }


def create_veo_client(api_key: str | None = None, project_id: str | None = None) -> VeoClient:
    return VeoClient(api_key, project_id)
