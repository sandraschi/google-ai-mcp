"""
Imagen / Nano Banana client for image generation.

Migration note (Feb 2026):
  Switched from vertexai.preview.vision_models.ImageGenerationModel
  to google-genai native image generation via response_modalities=["IMAGE"].

Model lineup (Feb 2026):
  - gemini-3.1-flash-image-preview  = Nano Banana 2 (released Feb 26 2026, latest)
  - gemini-3-pro-image-preview       = Nano Banana Pro (image editing, high quality)
  Both use generate_content with IMAGE modality via google-genai SDK.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-preview"  # Nano Banana 2

AVAILABLE_MODELS = {
    "gemini-3.1-flash-image-preview": "Nano Banana 2 (Gemini 3.1 Flash Image, Feb 2026)",
    "gemini-3-pro-image-preview": "Nano Banana Pro (Gemini 3 Pro Image, high quality)",
}

# Friendly-name aliases accepted from UI / API requests
_MODEL_ALIASES: dict[str, str] = {
    "nano-banana-2": "gemini-3.1-flash-image-preview",
    "nano-banana-pro": "gemini-3-pro-image-preview",
    "nano-banana": "gemini-3.1-flash-image-preview",
}


class ImagenClient:
    """Image generation client using google-genai native IMAGE modality."""

    def __init__(self, api_key: str | None = None, project_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.project_id = (project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None
        self._client: genai.Client | None = None

        if not self.api_key:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_API_KEY not set; ImagenClient in mock mode.")
            return

        try:
            self._client = genai.Client(api_key=self.api_key)
            logger.info("ImagenClient initialised with google-genai SDK.")
        except Exception as exc:
            self.mock_mode = True
            self.reason = "invalid_credentials"
            self.last_error = str(exc)
            logger.error(f"ImagenClient init failed: {exc}")

    def get_status(self) -> dict[str, Any]:
        return {
            "mock_mode": self.mock_mode,
            "reason": self.reason,
            "last_error": self.last_error,
            "default_model": DEFAULT_IMAGE_MODEL,
        }

    def get_available_models(self) -> dict[str, str]:
        return AVAILABLE_MODELS

    def validate_prompt(self, prompt: str) -> dict[str, Any]:
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 4000:
            return {"valid": False, "error": "Prompt exceeds 4000 characters"}
        return {"valid": True}

    async def generate_image(
        self,
        prompt: str,
        model: str = DEFAULT_IMAGE_MODEL,
        aspect_ratio: str = "1:1",
        output_path: str | None = None,
        num_images: int = 1,
        reference_image: bytes | None = None,
    ) -> dict[str, Any]:
        """Generate image(s) from a text prompt."""
        # Resolve friendly-name aliases
        model = _MODEL_ALIASES.get(model, model)
        if self.mock_mode:
            return self._mock_result(prompt, model, output_path, num_images)

        try:
            # Build contents - text prompt, optionally with reference image
            contents: list[Any] = []
            if reference_image:
                contents.append(types.Part.from_bytes(data=reference_image, mime_type="image/png"))
            contents.append(types.Part.from_text(text=prompt))

            config = types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    number_of_images=min(num_images, 4),
                ),
            )

            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=model,
                contents=contents,
                config=config,
            )

            images_out = []
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            out_dir = Path(output_path) if output_path else Path("uploads/images")
            out_dir.mkdir(parents=True, exist_ok=True)

            for i, part in enumerate(response.candidates[0].content.parts):
                if part.inline_data is not None:
                    img_data = part.inline_data.data
                    filename = f"image_{timestamp}_{i}.png"
                    file_path = out_dir / filename

                    from PIL import Image

                    img = Image.open(BytesIO(img_data))
                    img.save(str(file_path), "PNG")

                    images_out.append(
                        {
                            "filename": filename,
                            "path": str(file_path),
                            "url": f"/api/v1/images/{filename}",
                            "width": img.width,
                            "height": img.height,
                        }
                    )

            if not images_out:
                return {"success": False, "error": "No images returned by model"}

            return {
                "success": True,
                "images": images_out,
                "count": len(images_out),
                "model": model,
                "prompt": prompt,
            }

        except Exception as exc:
            logger.error(f"Image generation error: {exc}", exc_info=True)
            return {"success": False, "error": str(exc), "model": model}

    def _mock_result(self, prompt: str, model: str, output_path: str | None, num_images: int) -> dict[str, Any]:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        images = [
            {
                "filename": f"mock_image_{timestamp}_{i}.png",
                "path": f"/mock/images/mock_image_{timestamp}_{i}.png",
                "url": f"/api/v1/images/mock_image_{timestamp}_{i}.png",
                "width": 1024,
                "height": 1024,
            }
            for i in range(num_images)
        ]
        return {
            "success": True,
            "images": images,
            "count": num_images,
            "model": f"{model} (mock)",
            "prompt": prompt,
            "mock": True,
            "message": "Mock mode. Set GOOGLE_API_KEY for live generation.",
        }


def create_imagen_client(api_key: str | None = None, project_id: str | None = None) -> ImagenClient:
    return ImagenClient(api_key=api_key, project_id=project_id)
