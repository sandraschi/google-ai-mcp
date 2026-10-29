"""
Gemini Omni Client - multimodal video generation and editing.

Model: gemini-omni-1.1-flash (stable since Aug 27 2026). The preview endpoint
gemini-omni-flash-preview was shut down Oct 22 2026.

Omni is served through the Interactions API (client.interactions.create), not
generate_content, and only on the Gemini Developer API, so GOOGLE_API_KEY is
required. Output: one 3-10 s video per interaction (360p/720p/1080p/4k, 24 fps).

API notes (from ai.google.dev/gemini-api/docs/omni):
- Duration is steered by the prompt; there is no duration parameter.
- response_format: aspect_ratio ("16:9" | "9:16"), resolution, delivery ("uri" for >4MB).
- Audio references are not supported by the API; audio_urls are ignored with a warning.
- Conversational editing: pass previous_interaction_id from an earlier result.
- Editing uploaded videos is not available in the EEA/CH/UK.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import mimetypes
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

try:
    from google import genai

    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None  # type: ignore[assignment]
    logger.warning("google-genai not installed - Omni unavailable")

DEFAULT_OMNI_MODEL = "gemini-omni-1.1-flash"
OMNI_MODELS = {
    DEFAULT_OMNI_MODEL: "Gemini Omni 1.1 Flash (stable; text/image/video in, 3-10s video out)",
}

_OMNI_ALIASES = {
    "omni": DEFAULT_OMNI_MODEL,
    "omni-flash": DEFAULT_OMNI_MODEL,
    "gemini-omni": DEFAULT_OMNI_MODEL,
    "gemini-omni-flash": DEFAULT_OMNI_MODEL,
    "gemini-omni-flash-preview": DEFAULT_OMNI_MODEL,
}

MIN_OMNI_DURATION = 3
MAX_OMNI_DURATION = 10
OMNI_ASPECT_RATIOS = ("16:9", "9:16")
OMNI_RESOLUTIONS = ("360p", "720p", "1080p", "4k")


def resolve_omni_model(model: str | None) -> str:
    if not model:
        return DEFAULT_OMNI_MODEL
    key = model.strip().lower()
    return _OMNI_ALIASES.get(key, model.strip())


def _media_item(kind: str, ref: str, default_mime: str) -> dict[str, Any]:
    """Interactions input block from a local path (inlined base64) or a URI."""
    p = Path(ref)
    if p.is_file():
        mime = mimetypes.guess_type(p.name)[0] or default_mime
        return {"type": kind, "mime_type": mime, "data": base64.b64encode(p.read_bytes()).decode("ascii")}
    if ref.startswith("data:"):
        header, b64data = ref.split(",", 1)
        mime = header.split(":", 1)[1].split(";", 1)[0] or default_mime
        return {"type": kind, "mime_type": mime, "data": b64data}
    return {"type": kind, "uri": ref}


class OmniClient:
    """Client for Gemini Omni Flash via the Interactions API."""

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

        if not self.api_key:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_API_KEY required for Gemini Omni (Interactions API, Gemini Developer API only).")
            return

        try:
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
                "not_configured": "Set GOOGLE_API_KEY for Gemini Omni (Gemini Developer API only).",
                "dependency_missing": "Install google-genai>=2.6 for Omni generation.",
                "init_failed": f"Failed to initialize: {self.last_error}",
            }
            message = messages.get(self.reason, "Running in mock mode.")
        else:
            message = "Omni client ready (gemini-omni-1.1-flash via Interactions API)."

        return {
            "api_key_configured": bool(self.api_key),
            "project_id_configured": bool(self.project_id),
            "mock_mode": self.mock_mode,
            "available_models": self.get_available_models(),
            "reason": self.reason,
            "message": message,
            "min_duration_seconds": MIN_OMNI_DURATION,
            "max_duration_seconds": MAX_OMNI_DURATION,
            "aspect_ratios": list(OMNI_ASPECT_RATIOS),
            "resolutions": list(OMNI_RESOLUTIONS),
            "input_modalities": ["text", "image", "video"],
            "output_modalities": ["video"],
            "settings_url": "/settings",
        }

    def validate_request(
        self,
        prompt: str,
        duration: int,
        num_outputs: int,
        aspect_ratio: str = "16:9",
        resolution: str = "720p",
    ) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 4000:
            return {"valid": False, "error": "Prompt too long (max 4000 characters)"}
        if duration < MIN_OMNI_DURATION or duration > MAX_OMNI_DURATION:
            return {"valid": False, "error": f"Duration must be {MIN_OMNI_DURATION}-{MAX_OMNI_DURATION} seconds"}
        if num_outputs < 1 or num_outputs > 4:
            return {"valid": False, "error": "num_outputs must be between 1 and 4"}
        if aspect_ratio not in OMNI_ASPECT_RATIOS:
            return {"valid": False, "error": f"aspect_ratio must be one of {', '.join(OMNI_ASPECT_RATIOS)}"}
        if resolution not in OMNI_RESOLUTIONS:
            return {"valid": False, "error": f"resolution must be one of {', '.join(OMNI_RESOLUTIONS)}"}
        return {"valid": True}

    async def generate(
        self,
        prompt: str,
        model: str | None = None,
        duration: int = 8,
        aspect_ratio: str = "16:9",
        image_urls: list[str] | None = None,
        audio_urls: list[str] | None = None,
        video_urls: list[str] | None = None,
        edit_history: list[str] | None = None,
        output_path: str = ".",
        num_outputs: int = 1,
        resolution: str = "720p",
        previous_interaction_id: str | None = None,
    ) -> dict[str, Any]:
        """Generate (or edit, with previous_interaction_id) video from text, image and video inputs.

        Each output is a separate interaction call; Omni returns one video per call.
        """
        resolved_model = resolve_omni_model(model)
        validation = self.validate_request(prompt, duration, num_outputs, aspect_ratio, resolution)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        warnings: list[str] = []
        if audio_urls:
            warnings.append("audio_urls ignored: audio references are not supported by the Omni API.")

        if self.mock_mode or not self._client:
            return await self._mock_generate(
                prompt=prompt,
                model=resolved_model,
                duration=duration,
                aspect_ratio=aspect_ratio,
                image_urls=image_urls or [],
                video_urls=video_urls or [],
                edit_history=edit_history or [],
                output_path=output_path,
                num_outputs=num_outputs,
            )

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        text = prompt.strip()
        if edit_history:
            text += "\n" + "\n".join(f"Edit: {turn}" for turn in edit_history[-5:])
        text += f"\n(Target length: about {duration} seconds.)"

        media: list[dict[str, Any]] = []
        for ref in (image_urls or [])[:10]:
            media.append(_media_item("image", ref, "image/jpeg"))
        for ref in (video_urls or [])[:3]:
            media.append(_media_item("video", ref, "video/mp4"))
        input_payload: str | list[dict[str, Any]] = [*media, {"type": "text", "text": text}] if media else text

        response_format: dict[str, Any] = {"type": "video", "aspect_ratio": aspect_ratio, "resolution": resolution}
        if resolution in ("1080p", "4k"):
            # Inline payloads are capped around 4MB; larger outputs must use URI delivery.
            response_format["delivery"] = "uri"

        outputs: list[dict[str, str]] = []
        interaction_ids: list[str] = []
        try:
            for _ in range(num_outputs):
                kwargs: dict[str, Any] = {
                    "model": resolved_model,
                    "input": input_payload,
                    "response_format": response_format,
                }
                if previous_interaction_id:
                    kwargs["previous_interaction_id"] = previous_interaction_id

                interaction = await asyncio.to_thread(self._client.interactions.create, **kwargs)
                if getattr(interaction, "id", None):
                    interaction_ids.append(interaction.id)
                saved = await asyncio.to_thread(self._save_video, interaction, output_dir)
                if saved:
                    outputs.append(saved)
        except Exception as api_error:
            self.last_error = str(api_error)
            logger.error("Omni API error: %s", api_error, exc_info=True)
            return {
                "success": False,
                "error": f"Omni generation failed: {api_error}",
                "raw_error": str(api_error),
                "outputs": outputs,
            }

        if not outputs:
            return {
                "success": False,
                "error": "Omni returned no video. The prompt may have been blocked by safety filters.",
                "interaction_ids": interaction_ids,
            }

        result: dict[str, Any] = {
            "success": True,
            "outputs": outputs,
            "interaction_ids": interaction_ids,
            "metadata": {
                "model": resolved_model,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "input_counts": {"images": len(image_urls or []), "video": len(video_urls or [])},
                "generated_at": datetime.utcnow().isoformat(),
                "api": "gemini_interactions",
            },
            "mock_mode": False,
        }
        if warnings:
            result["warnings"] = warnings
        return result

    def _save_video(self, interaction: Any, output_dir: Path) -> dict[str, str] | None:
        video = getattr(interaction, "output_video", None)
        if video is None:
            return None
        mime = getattr(video, "mime_type", None) or "video/mp4"
        ext = "webm" if "webm" in mime else "mp4"
        filename = f"omni_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
        path = output_dir / filename

        data = getattr(video, "data", None)
        uri = getattr(video, "uri", None)
        if data:
            path.write_bytes(base64.b64decode(data) if isinstance(data, str) else bytes(data))
        elif uri:
            self._download_uri(uri, path)
        else:
            return None
        return {"url": f"/api/v1/omni/files/{filename}", "local_path": str(path), "filename": filename}

    def _download_uri(self, uri: str, path: Path, timeout_s: int = 300) -> None:
        """Poll the Files API until the generated video is ACTIVE, then download it."""
        import time

        file_id = uri.split("files/", 1)[-1].split(":", 1)[0].split("/", 1)[0]
        name = f"files/{file_id}"
        deadline = time.monotonic() + timeout_s
        while True:
            info = self._client.files.get(name=name)
            state = getattr(getattr(info, "state", None), "name", str(getattr(info, "state", "")))
            if state == "ACTIVE":
                break
            if state == "FAILED":
                raise RuntimeError(f"Omni video file {name} failed processing")
            if time.monotonic() > deadline:
                raise TimeoutError(f"Omni video file {name} not ACTIVE after {timeout_s}s")
            time.sleep(5)
        blob = self._client.files.download(file=info)
        path.write_bytes(blob)

    async def _mock_generate(
        self,
        prompt: str,
        model: str,
        duration: int,
        aspect_ratio: str,
        image_urls: list[str],
        video_urls: list[str],
        edit_history: list[str],
        output_path: str,
        num_outputs: int,
    ) -> dict[str, Any]:
        await asyncio.sleep(0.3)
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)
        outputs = []
        for i in range(num_outputs):
            filename = f"mock_omni_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{i}.mp4"
            path = output_dir / filename
            path.write_text(
                f"Mock Gemini Omni video placeholder (NOT a real video)\n"
                f"Prompt: {prompt}\n"
                f"Duration: {duration}s | Aspect: {aspect_ratio}\n"
                f"Inputs: {len(image_urls)} image(s), {len(video_urls)} video\n"
                f"Edits: {len(edit_history)}\n"
                f"Set GOOGLE_API_KEY for real output.\n"
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
                "input_counts": {"images": len(image_urls), "video": len(video_urls)},
                "generated_at": datetime.utcnow().isoformat(),
                "api": "mock",
            },
            "mock_mode": True,
            "message": f"Running in mock mode. Reason: {self.reason}",
        }


def create_omni_client(api_key: str | None = None, project_id: str | None = None) -> OmniClient:
    return OmniClient(api_key, project_id)
