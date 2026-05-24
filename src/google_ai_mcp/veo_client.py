"""
Veo Video Generation Client

Uses Vertex AI's video generation API for Veo models.
Veo generates short video clips from text prompts.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Try to import Vertex AI
try:
    import vertexai
    from google.cloud import aiplatform
    from google.protobuf import json_format

    VERTEX_AVAILABLE = True
except ImportError:
    VERTEX_AVAILABLE = False
    logger.warning("vertexai not installed - video generation will use mock mode")

DEFAULT_VEO_MODEL = "veo-3.1-preview-002"  # Current recommended (Feb 2026)
VEO_MODELS = {
    "veo-3.1-preview-002": "Veo 3.1 Preview (recommended, 4K support)",
    "veo-3.0-generate-001": "Veo 3.0 Generate (stable GA)",
}


class VeoClient:
    """Client for Google's Veo video generation API via Vertex AI."""

    def __init__(self, api_key: str | None = None, project_id: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.project_id = (project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.mock_mode = False
        self.reason = "live"
        self.last_error: str | None = None

        if not VERTEX_AVAILABLE:
            self.mock_mode = True
            self.reason = "dependency_missing"
            logger.warning("google-cloud-aiplatform not installed. Install with: pip install google-cloud-aiplatform")
            return

        if not self.project_id:
            self.mock_mode = True
            self.reason = "not_configured"
            logger.warning("GOOGLE_CLOUD_PROJECT not set. Video generation requires Vertex AI project.")
            return

        try:
            vertexai.init(project=self.project_id, location=self.location)
            aiplatform.init(project=self.project_id, location=self.location)
            logger.info(f"Veo client initialized with project {self.project_id}")
        except Exception as exc:
            self.mock_mode = True
            self.reason = "init_failed"
            self.last_error = str(exc)
            logger.error(f"Failed to initialize Veo: {exc}", exc_info=True)

    def validate_prompt(self, prompt: str) -> dict[str, Any]:
        """Validate the video generation prompt."""
        if not prompt or not prompt.strip():
            return {"valid": False, "error": "Prompt cannot be empty"}
        if len(prompt) > 1200:
            return {"valid": False, "error": "Prompt too long (max 1200 characters)"}
        restricted = ["explicit", "violence", "gore"]
        if any(word in prompt.lower() for word in restricted):
            return {"valid": False, "error": "Prompt contains restricted content"}
        return {"valid": True}

    def get_available_models(self) -> dict[str, str]:
        """Get available video generation models."""
        return VEO_MODELS

    async def generate_video(
        self,
        prompt: str,
        model: str = DEFAULT_VEO_MODEL,
        duration: int = 6,
        aspect_ratio: str = "16:9",
        output_path: str = ".",
        num_videos: int = 1,
    ) -> dict[str, Any]:
        """Generate video using Veo via Vertex AI.

        Note: Veo video generation is an async operation that may take several minutes.
        This method submits the job and polls for completion.
        """
        validation = self.validate_prompt(prompt)
        if not validation["valid"]:
            return {"success": False, "error": validation["error"]}

        if duration < 5 or duration > 8:
            return {
                "success": False,
                "error": "Duration must be between 5 and 8 seconds.",
            }

        if num_videos < 1 or num_videos > 4:
            return {
                "success": False,
                "error": "Number of videos must be between 1 and 4.",
            }

        if self.mock_mode:
            return await self._mock_generate_video(prompt, model, duration, aspect_ratio, output_path, num_videos)

        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Veo uses the Vertex AI prediction API with a specific endpoint
            # The actual API structure depends on the Veo model version

            endpoint_name = f"projects/{self.project_id}/locations/{self.location}/publishers/google/models/{model}"

            # Create the request payload for Veo
            request_payload = {
                "instances": [
                    {
                        "prompt": prompt,
                    }
                ],
                "parameters": {
                    "sampleCount": num_videos,
                    "aspectRatio": aspect_ratio,
                    "durationSeconds": duration,
                    "personGeneration": "allow_adult",
                    "safetyFilterLevel": "block_some",
                },
            }

            def _execute():
                # Use the Vertex AI PredictionServiceClient for video generation
                from google.cloud.aiplatform_v1 import PredictionServiceClient

                client = PredictionServiceClient(
                    client_options={"api_endpoint": f"{self.location}-aiplatform.googleapis.com"}
                )

                # Submit prediction request
                response = client.predict(
                    endpoint=endpoint_name,
                    instances=[
                        json_format.ParseDict(inst, aiplatform.types.Value()) for inst in request_payload["instances"]
                    ],
                    parameters=json_format.ParseDict(request_payload["parameters"], aiplatform.types.Value()),
                )
                return response

            response = await asyncio.to_thread(_execute)

            # Process the response - extract video data
            videos = []
            for idx, prediction in enumerate(response.predictions):
                pred_dict = json_format.MessageToDict(prediction)
                video_data = pred_dict.get("videoBytes") or pred_dict.get("video", {}).get("data")

                if video_data:
                    import base64

                    filename = f"veo_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{idx}.mp4"
                    video_path = output_dir / filename
                    video_path.write_bytes(base64.b64decode(video_data))
                    videos.append(
                        {
                            "url": str(video_path),
                            "local_path": str(video_path),
                            "filename": filename,
                        }
                    )

            if not videos:
                return {
                    "success": False,
                    "error": "No video data returned. The prompt may have been blocked or Veo API may not be available in your region.",
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
                    "api": "vertex_ai_veo",
                },
                "mock_mode": False,
            }

        except Exception as api_error:
            error_str = str(api_error).lower()

            if "not found" in error_str or "404" in str(api_error):
                user_message = (
                    "🚫 VEO NOT AVAILABLE: Veo video generation may not be enabled for your project. "
                    "Ensure you have access to Veo in Google Cloud Console and the API is enabled."
                )
            elif "permission" in error_str or "403" in str(api_error):
                user_message = (
                    "🔐 PERMISSION DENIED: Your service account lacks access to Veo. "
                    "Enable the Vertex AI API and add appropriate IAM roles."
                )
            elif "quota" in error_str or "429" in str(api_error):
                user_message = "🚫 RATE LIMITED: Video generation quota exceeded."
            else:
                user_message = f"❌ VIDEO GENERATION FAILED: {api_error!s}"

            logger.error(f"Veo API error: {api_error}", exc_info=True)
            return {
                "success": False,
                "error": user_message,
                "raw_error": str(api_error),
            }

    async def _mock_generate_video(
        self,
        prompt: str,
        model: str,
        duration: int,
        aspect_ratio: str,
        output_path: str,
        num_videos: int,
    ) -> dict[str, Any]:
        """Generate mock videos when API is unavailable."""
        await asyncio.sleep(1.0)  # Simulate processing time
        output_dir = Path(output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        videos = []
        for i in range(num_videos):
            filename = f"mock_veo_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{i}.mp4"
            video_path = output_dir / filename
            # Create a minimal placeholder file
            video_path.write_text(
                f"Mock video placeholder\nPrompt: {prompt}\nDuration: {duration}s\n"
                f"Configure GOOGLE_CLOUD_PROJECT for live Veo output.\n"
            )
            videos.append(
                {
                    "url": str(video_path),
                    "local_path": str(video_path),
                    "filename": filename,
                }
            )

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
                "note": "Mock mode - configure GOOGLE_CLOUD_PROJECT and enable Veo for real generation.",
            },
            "mock_mode": True,
            "message": f"Running in mock mode. Reason: {self.reason}",
        }

    def get_status(self) -> dict[str, Any]:
        """Get client status."""
        if self.mock_mode:
            messages = {
                "not_configured": "GOOGLE_CLOUD_PROJECT not set. Veo requires Vertex AI.",
                "dependency_missing": "Install google-cloud-aiplatform for video generation.",
                "init_failed": f"Failed to initialize: {self.last_error}",
            }
            message = messages.get(self.reason, "Running in mock mode.")
        else:
            message = "Veo client ready for video generation."

        return {
            "api_key_configured": bool(self.api_key),
            "project_id_configured": bool(self.project_id),
            "mock_mode": self.mock_mode,
            "available_models": self.get_available_models(),
            "reason": self.reason,
            "message": message,
            "settings_url": "/settings",
        }


def create_veo_client(api_key: str | None = None, project_id: str | None = None) -> VeoClient:
    """Create and return a Veo client instance."""
    return VeoClient(api_key, project_id)
