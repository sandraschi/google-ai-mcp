"""
Gemini Omni Client — any-to-any multimodal generation (video-first).

Gemini Omni Flash accepts text, image, audio, and video inputs and produces
video output (up to 10 seconds). API rollout via Gemini/Vertex is phased;
falls back to mock mode when credentials or API access are unavailable.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
import uuid
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
    logger.warning("google-genai not installed — Omni will use mock mode")

DEFAULT_OMNI_MODEL = "gemini-omni-flash"
OMNI_MODELS = {
    "gemini-omni-flash": "Gemini Omni Flash (any-to-any, video output, up to 10s)",
}

_OMNI_ALIASES = {
    "omni-flash": DEFAULT_OMNI_MODEL,
    "gemini-omni": DEFAULT_OMNI_MODEL,
    "omni": DEFAULT_OMNI_MODEL,
}

MAX_OMNI_DURATION = 10


def resolve_omni_model(model: str | None) -> str:
    if not model:
        return DEFAULT_OMNI_MODEL
    key = model.strip().lower()
    return _OMNI_ALIASES.get(key, model.strip())


class OmniClient:
    """Client for Google's Gemini Omni multimodal generation."""

    def __init__(self, api_key: str | None = None, project_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.project_id = (project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._client: Any = None

        if not GENAI_AVAILABLE:
            self.mock_mode = True
            self.reason = "dependency_missing"
            return

        if not self.api_key and not self.project_id:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_API_KEY or GOOGLE_CLOUD_PROJECT required for Omni.")
            return

        try:
            if self.project_id:
                self._client = genai.Client(
                    vertexai=True,
                    project=self.project_id,
                    location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
                )
            else:
                self._client = genai.Client(api_key=self.api_key)
        except Exception as exc:
            self.mock_mode = True
            self.reason = "init_failed"
            self.last_error = str(exc)
            logger.error("Failed to initialize Omni client: %s", exc, exc_info=True)

    def get_available_models(self) -> dict[str, str]:
        return OMNI_MODELS

    def get_status(self) -> dict[str, Any]:
        if self.mock_mode:
            messages = {
                "not_configured": "Set GOOGLE_API_KEY or GOOGLE_CLOUD_PROJECT for Gemini Omni.",
                "dependency_missing": "Install google-genai for Omni generation.",
                "init_failed": f"Failed to initialize: {self.last_error}",
                "api_unavailable": "Gemini Omni API not yet available — mock mode active.",
            }
            message = messages.get(self.reason, "Running in mock mode.")
        else:
            message = "Omni client ready for multimodal video generation."

        return {
            "api_key_configured": bool(self.api_key),
            "project_id_configured": bool(self.project_id),
            "mock_mode": self.mock_mode,
            "available_models": self.get_available_models(),
            "reason": self.reason,
            "message": message,
            "max_duration_seconds": MAX_OMNI_DURATION,
            "input_modalities": ["text", "image", "audio", "video"],
            "output_modalities": ["video"],
            "settings_url": "/settings",
        }

    def validate_request(
        self,
        prompt: str,
        duration: int,
        num_outputs: int,
    ) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 2000:
            return {"valid": False, "error": "Prompt too long (max 2000 characters)"}
        if duration < 1 or duration > MAX_OMNI_DURATION:
            return {"valid": False, "error": f"Duration must be 1-{MAX_OMNI_DURATION} seconds"}
        if num_outputs < 1 or num_outputs > 4:
            return {"valid": False, "error": "num_outputs must be between 1 and 4"}
        return {"valid": True}

    async def generate(
        self,
        prompt: str,
        model: str | None = None,
        duration: int = 10,
        aspect_ratio: str = "16:9",
        image_urls: list[str] | None = None,
        audio_urls: list[str] | None = None,
        video_urls: list[str] | None = None,
        edit_history: list[str] | None = None,
        output_path: str = ".",
        num_outputs: int = 1,
    ) -> dict[str, Any]:
        """Generate video from any combination of text, image, audio, and video inputs."""
        resolved_model = resolve_omni_model(model)
        validation = self.validate_request(prompt, duration, num_outputs)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        if self.mock_mode or not self._client:
            return await self._mock_generate(
                prompt=prompt,
                model=resolved_model,
                duration=duration,
                aspect_ratio=aspect_ratio,
                image_urls=image_urls or [],
                audio_urls=audio_urls or [],
                video_urls=video_urls or [],
                edit_history=edit_history or [],
                output_path=output_path,
                num_outputs=num_outputs,
            )

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            contents: list[Any] = [prompt]
            if edit_history:
                contents.extend(f"Edit: {turn}" for turn in edit_history[-5:])

            for url in (image_urls or [])[:4]:
                contents.append(types.Part.from_uri(file_uri=url, mime_type="image/jpeg"))
            for url in (audio_urls or [])[:2]:
                contents.append(types.Part.from_uri(file_uri=url, mime_type="audio/mpeg"))
            for url in (video_urls or [])[:2]:
                contents.append(types.Part.from_uri(file_uri=url, mime_type="video/mp4"))

            config = types.GenerateContentConfig(
                response_modalities=["VIDEO"],
                video_config=types.VideoConfig(
                    duration_seconds=duration,
                    aspect_ratio=aspect_ratio,
                ),
            )

            def _call():
                return self._client.models.generate_content(
                    model=resolved_model,
                    contents=contents,
                    config=config,
                )

            response = await asyncio.to_thread(_call)
            outputs = self._extract_videos(response, output_dir, num_outputs)

            if not outputs:
                self.mock_mode = True
                self.reason = "api_unavailable"
                return await self._mock_generate(
                    prompt=prompt,
                    model=resolved_model,
                    duration=duration,
                    aspect_ratio=aspect_ratio,
                    image_urls=image_urls or [],
                    audio_urls=audio_urls or [],
                    video_urls=video_urls or [],
                    edit_history=edit_history or [],
                    output_path=output_path,
                    num_outputs=num_outputs,
                    note="Omni API returned no video — API may not be GA yet.",
                )

            return {
                "success": True,
                "outputs": outputs,
                "metadata": {
                    "model": resolved_model,
                    "prompt": prompt,
                    "duration": duration,
                    "aspect_ratio": aspect_ratio,
                    "input_counts": {
                        "images": len(image_urls or []),
                        "audio": len(audio_urls or []),
                        "video": len(video_urls or []),
                    },
                    "generated_at": datetime.utcnow().isoformat(),
                    "api": "gemini_omni",
                },
                "mock_mode": False,
            }

        except Exception as api_error:
            error_str = str(api_error).lower()
            if "not found" in error_str or "404" in error_str or "unknown model" in error_str:
                self.mock_mode = True
                self.reason = "api_unavailable"
                return await self._mock_generate(
                    prompt=prompt,
                    model=resolved_model,
                    duration=duration,
                    aspect_ratio=aspect_ratio,
                    image_urls=image_urls or [],
                    audio_urls=audio_urls or [],
                    video_urls=video_urls or [],
                    edit_history=edit_history or [],
                    output_path=output_path,
                    num_outputs=num_outputs,
                    note="Gemini Omni API not available yet — using mock output.",
                )
            logger.error("Omni API error: %s", api_error, exc_info=True)
            return {"success": False, "error": str(api_error), "raw_error": str(api_error)}

    def _extract_videos(self, response: Any, output_dir: Path, num_outputs: int) -> list[dict[str, str]]:
        outputs: list[dict[str, str]] = []
        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            if not content:
                continue
            for part in getattr(content, "parts", []) or []:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    ext = "mp4"
                    mime = getattr(inline, "mime_type", "video/mp4") or "video/mp4"
                    if "webm" in mime:
                        ext = "webm"
                    filename = f"omni_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
                    path = output_dir / filename
                    data = inline.data
                    if isinstance(data, str):
                        path.write_bytes(base64.b64decode(data))
                    else:
                        path.write_bytes(data)
                    outputs.append({"url": f"/api/v1/omni/files/{filename}", "local_path": str(path), "filename": filename})
                    if len(outputs) >= num_outputs:
                        return outputs
        return outputs

    async def _mock_generate(
        self,
        prompt: str,
        model: str,
        duration: int,
        aspect_ratio: str,
        image_urls: list[str],
        audio_urls: list[str],
        video_urls: list[str],
        edit_history: list[str],
        output_path: str,
        num_outputs: int,
        note: str | None = None,
    ) -> dict[str, Any]:
        await asyncio.sleep(0.8)
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        outputs = []
        for i in range(num_outputs):
            filename = f"mock_omni_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{i}.mp4"
            path = output_dir / filename
            path.write_text(
                f"Mock Gemini Omni video placeholder\n"
                f"Prompt: {prompt}\n"
                f"Duration: {duration}s | Aspect: {aspect_ratio}\n"
                f"Inputs: {len(image_urls)} image(s), {len(audio_urls)} audio, {len(video_urls)} video\n"
                f"Edits: {len(edit_history)}\n"
                f"Configure GOOGLE_API_KEY + GOOGLE_CLOUD_PROJECT when Omni API is GA.\n"
            )
            outputs.append({"url": f"/api/v1/omni/files/{filename}", "local_path": str(path), "filename": filename})

        return {
            "success": True,
            "outputs": outputs,
            "metadata": {
                "model": f"{model} (mock)",
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "input_counts": {"images": len(image_urls), "audio": len(audio_urls), "video": len(video_urls)},
                "generated_at": datetime.utcnow().isoformat(),
                "api": "mock",
            },
            "mock_mode": True,
            "message": note or f"Running in mock mode. Reason: {self.reason}",
        }


def create_omni_client(api_key: str | None = None, project_id: str | None = None) -> OmniClient:
    return OmniClient(api_key, project_id)
