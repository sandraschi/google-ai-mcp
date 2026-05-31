"""
Google AI MCP Server — FastMCP 3.2 gateway for Google AI services.

Model Context Protocol server wrapping Gemini/Gemma chat, Nano Banana / Pro image
generation, Veo 3.1 video generation, Lyria 3 music generation, Google TTS,
text embeddings, and fleet status monitoring.

Standards:
- FastMCP 3.2+ (streamable HTTP, Prefab UI cards)
- Docstring SOTA (Field descriptions, no Args: blocks)
- Conversational tool returns; portmanteau pattern
- Ports: backend=11014, frontend=11015

Version: 0.1.0
"""

from __future__ import annotations

import contextlib
import logging
import os
import sys
from typing import Annotated, Any

import httpx
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import FastMCP
from pydantic import Field

from google_ai_mcp.clients_registry import (
    get_chat_client,
    get_embeddings_client,
    get_imagen_client,
    get_lyria_client,
    get_omni_client,
    get_speech_client,
    get_veo_client,
    refresh_cached_clients,
)

# ── Structured logging ────────────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

stderr_handler = logging.StreamHandler(sys.stderr)
stderr_handler.setFormatter(logging.Formatter("%(message)s"))

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(stderr_handler)

logger = structlog.get_logger(__name__)

GOOGLE_AI_MCP_INSTRUCTIONS = """You are Google-AI-MCP (FastMCP 3.2): a gateway to Google AI cloud services.
Use portmanteau tools: google_ai_chat, google_ai_image, google_ai_video, google_ai_omni,
google_ai_music, google_ai_speech, google_ai_embeddings, google_ai_status, google_ai_world.
Prefer google_ai_status() before any generation to check which services are connected.
Call list_models via the operation parameter on each service tool.
For multimodal chat, pass image URLs in the images parameter.
Prefab UI card: show_google_ai_status_card for a rich dashboard view."""


class GoogleAIMCP:
    """Google AI MCP Server — FastMCP 3.2 gateway for Google AI cloud services.

    Provides MCP tools wrapping Gemini chat, Imagen (Nano Banana 2 / Pro),
    Veo 3.1 video, Lyria 3 music, Google TTS, and text embeddings.
    """

    def __init__(self) -> None:
        _mcp_kwargs: dict[str, Any] = {
            "name": "Google-AI-MCP",
            "version": "0.1.0",
            "instructions": GOOGLE_AI_MCP_INSTRUCTIONS,
        }
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                from fastmcp.client.sampling.handlers.anthropic import AnthropicSamplingHandler

                _mcp_kwargs["sampling_handler"] = AnthropicSamplingHandler(
                    default_model=os.getenv("ANTHROPIC_SAMPLING_MODEL", "claude-sonnet-4-20250514"),
                )
                _mcp_kwargs["sampling_handler_behavior"] = "fallback"
            except ImportError:
                logger.warning("ANTHROPIC_API_KEY set but fastmcp[anthropic] not installed; sampling fallback disabled")

        self.mcp = FastMCP(**_mcp_kwargs)
        self._register_tools()
        self._register_prefab_tools()

    def _register_tools(self) -> None:
        """Register all Google AI MCP tools with the FastMCP server."""

        # ── google_ai_chat ────────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_chat(
            operation: Annotated[str, Field(description="Operation: 'chat' (text/multimodal chat) or 'list_models'.")] = "chat",
            prompt: Annotated[str | None, Field(description="Text prompt for chat mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'gemini-2.5-pro', 'gemma-3-27b').")] = None,
            persona: Annotated[str | None, Field(description="System prompt / persona prefix for the model.")] = None,
            images: Annotated[list[str] | None, Field(description="List of image URLs for multimodal chat.")] = None,
            temperature: Annotated[float, Field(description="Sampling temperature 0.0-2.0.", ge=0.0, le=2.0)] = 0.7,
            max_tokens: Annotated[int, Field(description="Max output tokens.", ge=1, le=65536)] = 2048,
        ) -> dict[str, Any]:
            """Chat with Gemini/Gemma models — text or multimodal.

            ## Return Format
            {success, message, data: {response: str, model: str}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_chat(prompt="Explain quantum computing in 3 sentences")
            google_ai_chat(operation="list_models")
            google_ai_chat(prompt="What is in this image?", images=["https://example.com/photo.jpg"], model="gemini-2.5-pro")
            """
            client = get_chat_client()
            chat_models = getattr(client, "MODELS", ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.5-flash", "gemma-3-27b"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available chat models: {len(chat_models)}",
                    "data": {"models": chat_models},
                }

            if not prompt:
                return {"success": False, "message": "prompt is required for chat operation", "data": {}}

            try:
                result = await client.chat(
                    prompt=prompt,
                    model=model,
                    persona=persona,
                    images=images,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return {
                    "success": True,
                    "message": f"Chat response from {result.get('model', 'gemini')}",
                    "data": {"response": result.get("text", ""), "model": result.get("model", model or "gemini-2.0-flash")},
                }
            except Exception as exc:
                logger.error("chat_failed", error=str(exc))
                return {"success": False, "message": f"Chat failed: {exc!s}", "data": {}}

        # ── google_ai_image ───────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_image(
            operation: Annotated[str, Field(description="Operation: 'generate' (create images) or 'list_models'.")] = "generate",
            prompt: Annotated[str | None, Field(description="Image description for generate mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'imagen-4.0-ultra-generate-001').")] = None,
            aspect_ratio: Annotated[str, Field(description="Aspect ratio: '1:1', '16:9', '9:16', '4:3', '3:4'.")] = "1:1",
            num_images: Annotated[int, Field(description="Number of images to generate.", ge=1, le=8)] = 1,
        ) -> dict[str, Any]:
            """Generate images with Nano Banana 2 / Imagen Pro.

            ## Return Format
            {success, message, data: {images: [urls], model: str}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_image(prompt="A cyberpunk cat playing synthwave guitar on a rooftop")
            google_ai_image(operation="list_models")
            google_ai_image(prompt="A serene Japanese garden at golden hour", aspect_ratio="16:9", num_images=4)
            """
            client = get_imagen_client()
            image_models = getattr(client, "MODELS", ["imagen-4.0-ultra-generate-001", "imagen-4.0-generate-001", "nano-banana-2"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available image models: {len(image_models)}",
                    "data": {"models": image_models},
                }

            if not prompt:
                return {"success": False, "message": "prompt is required for generate operation", "data": {}}

            try:
                result = await client.generate_image(
                    prompt=prompt,
                    model=model,
                    aspect_ratio=aspect_ratio,
                    num_images=num_images,
                )
                images = result.get("images", [])
                return {
                    "success": True,
                    "message": f"Generated {len(images)} image(s)",
                    "data": {
                        "images": images,
                        "model": result.get("model", model or "nano-banana-2"),
                    },
                }
            except Exception as exc:
                logger.error("image_generation_failed", error=str(exc))
                return {"success": False, "message": f"Image generation failed: {exc!s}", "data": {}}

        # ── google_ai_video ───────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_video(
            operation: Annotated[str, Field(description="Operation: 'generate' (create videos) or 'list_models'.")] = "generate",
            prompt: Annotated[str | None, Field(description="Video description for generate mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'veo-3.1-generate-preview').")] = None,
            duration: Annotated[int, Field(description="Video duration in seconds.", ge=4, le=120)] = 8,
            aspect_ratio: Annotated[str, Field(description="Aspect ratio: '16:9' or '9:16'.")] = "16:9",
            num_videos: Annotated[int, Field(description="Number of videos to generate.", ge=1, le=4)] = 1,
        ) -> dict[str, Any]:
            """Generate videos with Veo 3.1.

            ## Return Format
            {success, message, data: {videos: [urls], model: str, duration: int}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_video(prompt="A drone flyover of a futuristic city at sunrise")
            google_ai_video(operation="list_models")
            google_ai_video(prompt="A puppy chasing butterflies in slow motion", duration=12, aspect_ratio="9:16")
            """
            client = get_veo_client()
            video_models = getattr(client, "MODELS", ["veo-3.1-generate-preview", "veo-3.0-generate-preview"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available video models: {len(video_models)}",
                    "data": {"models": video_models},
                }

            if not prompt:
                return {"success": False, "message": "prompt is required for generate operation", "data": {}}

            try:
                result = await client.generate_video(
                    prompt=prompt,
                    model=model,
                    duration=duration,
                    aspect_ratio=aspect_ratio,
                    num_videos=num_videos,
                )
                videos = result.get("videos", [])
                return {
                    "success": True,
                    "message": f"Generated {len(videos)} video(s)",
                    "data": {
                        "videos": videos,
                        "model": result.get("model", model or "veo-3.1-generate-preview"),
                        "duration": duration,
                    },
                }
            except Exception as exc:
                logger.error("video_generation_failed", error=str(exc))
                return {"success": False, "message": f"Video generation failed: {exc!s}", "data": {}}

        # ── google_ai_omni ────────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_omni(
            operation: Annotated[str, Field(description="Operation: 'generate' (multimodal video) or 'list_models'.")] = "generate",
            prompt: Annotated[str | None, Field(description="Text prompt / edit instruction for generate mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'gemini-omni-flash').")] = None,
            duration: Annotated[int, Field(description="Video duration in seconds (max 10).", ge=1, le=10)] = 10,
            aspect_ratio: Annotated[str, Field(description="Aspect ratio: '16:9' or '9:16'.")] = "16:9",
            image_urls: Annotated[list[str] | None, Field(description="Reference image URLs.")] = None,
            audio_urls: Annotated[list[str] | None, Field(description="Reference audio URLs.")] = None,
            video_urls: Annotated[list[str] | None, Field(description="Reference video URLs.")] = None,
            edit_history: Annotated[list[str] | None, Field(description="Prior conversational edit turns.")] = None,
            num_outputs: Annotated[int, Field(description="Number of outputs to generate.", ge=1, le=4)] = 1,
        ) -> dict[str, Any]:
            """Generate video with Gemini Omni — any input modality to video output.

            ## Return Format
            {success, message, data: {outputs: [urls], model: str}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_omni(prompt="Timelapse of a city transforming from day to night")
            google_ai_omni(operation="list_models")
            google_ai_omni(prompt="Make the sky more dramatic", image_urls=["https://example.com/ref.jpg"])
            """
            client = get_omni_client()
            omni_models = client.get_available_models()

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available Omni models: {len(omni_models)}",
                    "data": {"models": list(omni_models.keys()), "labels": omni_models},
                }

            if not prompt:
                return {"success": False, "message": "prompt is required for generate operation", "data": {}}

            try:
                result = await client.generate(
                    prompt=prompt,
                    model=model,
                    duration=duration,
                    aspect_ratio=aspect_ratio,
                    image_urls=image_urls,
                    audio_urls=audio_urls,
                    video_urls=video_urls,
                    edit_history=edit_history,
                    num_outputs=num_outputs,
                    output_path="uploads/omni",
                )
                outputs = result.get("outputs", [])
                return {
                    "success": result.get("success", False),
                    "message": result.get("message", f"Generated {len(outputs)} Omni output(s)"),
                    "data": {
                        "outputs": outputs,
                        "model": result.get("metadata", {}).get("model", model or "gemini-omni-flash"),
                        "mock_mode": result.get("mock_mode", False),
                    },
                }
            except Exception as exc:
                logger.error("omni_generation_failed", error=str(exc))
                return {"success": False, "message": f"Omni generation failed: {exc!s}", "data": {}}

        # ── google_ai_music ───────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_music(
            operation: Annotated[str, Field(description="Operation: 'generate' (create music) or 'list_models'.")] = "generate",
            prompt: Annotated[str | None, Field(description="Music description for generate mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'lyria-3').")] = None,
            duration: Annotated[int, Field(description="Track duration in seconds.", ge=10, le=300)] = 30,
            num_tracks: Annotated[int, Field(description="Number of tracks to generate.", ge=1, le=4)] = 1,
        ) -> dict[str, Any]:
            """Generate music with Lyria 3.

            ## Return Format
            {success, message, data: {tracks: [urls], model: str, duration: int}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_music(prompt="A lo-fi chill beat with warm piano chords and soft rain")
            google_ai_music(operation="list_models")
            google_ai_music(prompt="Epic orchestral battle theme with choir", duration=120)
            """
            client = get_lyria_client()
            music_models = getattr(client, "MODELS", ["lyria-3", "music-generator-001"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available music models: {len(music_models)}",
                    "data": {"models": music_models},
                }

            if not prompt:
                return {"success": False, "message": "prompt is required for generate operation", "data": {}}

            try:
                result = await client.generate_music(
                    prompt=prompt,
                    model=model,
                    duration=duration,
                    num_tracks=num_tracks,
                )
                tracks = result.get("tracks", [])
                return {
                    "success": True,
                    "message": f"Generated {len(tracks)} music track(s)",
                    "data": {
                        "tracks": tracks,
                        "model": result.get("model", model or "lyria-3"),
                        "duration": duration,
                    },
                }
            except Exception as exc:
                logger.error("music_generation_failed", error=str(exc))
                return {"success": False, "message": f"Music generation failed: {exc!s}", "data": {}}

        # ── google_ai_speech ──────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_speech(
            operation: Annotated[str, Field(description="Operation: 'tts' (text-to-speech), 'list_voices', or 'list_models'.")] = "tts",
            text: Annotated[str | None, Field(description="Text to speak for tts mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'chirp-3-hd-voice' / 'chirp-3').")] = None,
            voice_name: Annotated[str, Field(description="Voice name for TTS.")] = "Kore",
        ) -> dict[str, Any]:
            """Text-to-speech with Google Cloud TTS — Chirp 3 HD voices.

            ## Return Format
            {success, message, data: {audio_url: str, voice: str, model: str}} or {success, message, data: {voices/models: list}}

            ## Examples
            google_ai_speech(text="Hello, this is a test of Google Cloud TTS.")
            google_ai_speech(operation="list_voices")
            google_ai_speech(text="Bonjour le monde", voice_name="Fenrir", model="chirp-3-hd-voice")
            """
            client = get_speech_client()
            speech_models = getattr(client, "MODELS", ["chirp-3-hd-voice", "chirp-3", "chirp-3-voice"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available speech models: {len(speech_models)}",
                    "data": {"models": speech_models},
                }

            if operation == "list_voices":
                try:
                    status = client.get_status()
                    voices = status.get("voices", [])
                    return {
                        "success": True,
                        "message": f"Available voices: {len(voices)}",
                        "data": {"voices": voices},
                    }
                except Exception as exc:
                    return {"success": False, "message": f"Failed to list voices: {exc!s}", "data": {}}

            if not text:
                return {"success": False, "message": "text is required for tts operation", "data": {}}

            try:
                result = await client.text_to_speech(
                    text=text,
                    model=model,
                    voice_name=voice_name,
                )
                audio_base64 = result.get("audio_base64", "")
                return {
                    "success": True,
                    "message": f"TTS generated with voice '{voice_name}'",
                    "data": {
                        "audio_base64": audio_base64,
                        "voice": voice_name,
                        "mime": result.get("mime", "audio/wav"),
                        "model": result.get("model", model or "chirp-3-hd-voice"),
                    },
                }
            except Exception as exc:
                logger.error("tts_failed", error=str(exc))
                return {"success": False, "message": f"TTS failed: {exc!s}", "data": {}}

        # ── google_ai_embeddings ──────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_embeddings(
            operation: Annotated[str, Field(description="Operation: 'embed' (generate embedding vector) or 'list_models'.")] = "embed",
            text: Annotated[str | None, Field(description="Text to embed for embed mode.")] = None,
            model: Annotated[str | None, Field(description="Model ID override (e.g. 'text-embedding-005').")] = None,
            task_type: Annotated[str | None, Field(description="Task type: RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, CLASSIFICATION.")] = None,
        ) -> dict[str, Any]:
            """Generate text embeddings with Google's embedding models.

            ## Return Format
            {success, message, data: {embedding: list, dimensions: int, model: str}} or {success, message, data: {models: list}}

            ## Examples
            google_ai_embeddings(text="The cat sat on the mat.")
            google_ai_embeddings(operation="list_models")
            google_ai_embeddings(text="Machine learning fundamentals", task_type="RETRIEVAL_QUERY")
            """
            client = get_embeddings_client()
            embed_models = getattr(client, "MODELS", ["text-embedding-005", "text-embedding-004", "text-multilingual-embedding-002"])

            if operation == "list_models":
                return {
                    "success": True,
                    "message": f"Available embedding models: {len(embed_models)}",
                    "data": {"models": embed_models},
                }

            if not text:
                return {"success": False, "message": "text is required for embed operation", "data": {}}

            try:
                result = await client.embed_text(
                    text=text,
                    model=model,
                    task_type=task_type,
                )
                embedding_vector = result.get("embedding", [])
                return {
                    "success": True,
                    "message": f"Generated embedding — {len(embedding_vector)} dimensions",
                    "data": {
                        "embedding": embedding_vector,
                        "dimensions": len(embedding_vector),
                        "model": result.get("model", model or "text-embedding-005"),
                    },
                }
            except Exception as exc:
                logger.error("embedding_failed", error=str(exc))
                return {"success": False, "message": f"Embedding generation failed: {exc!s}", "data": {}}

        # ── google_ai_status ──────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_status() -> dict[str, Any]:
            """Check connectivity and status of all Google AI services.

            Probes each service client to verify credentials and API reachability.

            ## Return Format
            {success, server, version, services: {name: {available, message}}, tools_exposed, tools: [...]}

            ## Examples
            google_ai_status()
            """
            refresh_cached_clients()
            services = {}

            for _name, _client_getter, _label in [
                ("chat", get_chat_client, "Gemini/Gemma Chat"),
                ("imagen", get_imagen_client, "Nano Banana / Imagen"),
                ("veo", get_veo_client, "Veo 3.1 Video"),
                ("omni", get_omni_client, "Gemini Omni Flash"),
                ("lyria", get_lyria_client, "Lyria 3 Music"),
                ("speech", get_speech_client, "Google Cloud TTS"),
                ("embeddings", get_embeddings_client, "Text Embeddings"),
            ]:
                try:
                    client = _client_getter()
                    status = client.get_status()
                    available = not status.get("mock_mode", True)
                    msg = status.get("reason", "unknown")
                except Exception as exc:
                    available, msg = False, str(exc)
                services[_name] = {"available": available, "message": msg, "label": _label}

            available_count = sum(1 for s in services.values() if s["available"])
            return {
                "success": True,
                "server": "Google-AI-MCP",
                "version": "0.1.0",
                "services": services,
                "total_services": len(services),
                "available_services": available_count,
                "tools_exposed": 10,
                "tools": [
                    "google_ai_chat",
                    "google_ai_image",
                    "google_ai_video",
                    "google_ai_omni",
                    "google_ai_music",
                    "google_ai_speech",
                    "google_ai_embeddings",
                    "google_ai_status",
                    "google_ai_world",
                    "show_google_ai_status_card",
                ],
                "message": f"Google AI MCP v0.1.0 — {available_count}/{len(services)} services available",
            }

        # ── google_ai_world ────────────────────────────────────────────────────

        @self.mcp.tool()
        async def google_ai_world(
            operation: Annotated[
                str,
                Field(description="Operation: 'health', 'train_prepare', 'infer_prepare', 'surprise_stub'."),
            ] = "health",
            extra_args: Annotated[str | None, Field(description="Optional args passed to train_prepare.")] = None,
        ) -> dict[str, Any]:
            """Bridge to LeWorldModel (LeWM) — local JEPA world model (Meta AI/FAIR, arXiv:2603.19312).

            Proxies to lewm-mcp at http://127.0.0.1:10927. LWM runs locally on GPU and
            provides world model operations independent of Google Cloud.

            ## Return Format
            {success, message, data: {result, upstream}}

            ## Examples
            google_ai_world()
            google_ai_world(operation="health")
            google_ai_world(operation="train_prepare", extra_args="--epochs 50")
            """
            lwm_url = os.getenv("LEWM_API_URL", "http://127.0.0.1:10927")
            try:
                async with httpx.AsyncClient(base_url=lwm_url, timeout=10.0) as client:
                    if operation == "health":
                        resp = await client.get("/api/status")
                        data = resp.json()
                        return {"success": True, "message": "LeWM upstream reachable", "data": data}

                    result = await client.get("/api/config")
                    config = result.json()

                    return {
                        "success": True,
                        "message": f"LeWM operation '{operation}' prepared",
                        "data": {"operation": operation, "extra_args": extra_args, "config": config},
                    }
            except Exception as exc:
                return {"success": False, "message": f"LeWM unreachable: {exc!s}", "data": {"hint": "Start lewm-mcp on port 10927"}}

    def _register_prefab_tools(self) -> None:
        """Register FastMCP 3.2 Prefab UI card tools (app=True)."""
        try:
            from prefab_ui.app import PrefabApp
            from prefab_ui.components import (
                Card,
                CardContent,
                Column,
                Grid,
                Heading,
                Muted,
                Separator,
                Text,
            )
        except ImportError:
            logger.warning("prefab_ui not installed — Prefab tools skipped (pip install prefab-ui>=0.18.0)")
            return

        mcp = self.mcp

        @mcp.tool(app=True)
        async def show_google_ai_status_card() -> PrefabApp:
            """Show Google AI service connectivity as a rich Prefab status card.

            Displays a live grid of all six Google AI services with connection state,
            service label, and status message — no need to parse JSON in chat.
            """
            refresh_cached_clients()
            rows: list[dict[str, str | bool]] = []

            for _name, _client_getter, _label in [
                ("chat", get_chat_client, "Gemini/Gemma Chat"),
                ("imagen", get_imagen_client, "Nano Banana / Imagen"),
                ("veo", get_veo_client, "Veo 3.1 Video"),
                ("omni", get_omni_client, "Gemini Omni Flash"),
                ("lyria", get_lyria_client, "Lyria 3 Music"),
                ("speech", get_speech_client, "Google Cloud TTS"),
                ("embeddings", get_embeddings_client, "Text Embeddings"),
            ]:
                try:
                    client = _client_getter()
                    status = client.get_status()
                    available = not status.get("mock_mode", True)
                    msg = status.get("reason", "unknown")
                except Exception as exc:
                    available, msg = False, str(exc)
                rows.append({"name": _name, "label": _label, "available": available, "message": msg})

            connected_count = sum(1 for r in rows if r["available"])

            with Column(gap=4, css_class="p-4") as view:
                Heading(f"Google AI MCP — Services ({connected_count}/{len(rows)} available)")
                Separator()
                with Grid(columns=3, gap=3):
                    for row in rows:
                        status_text = "Available" if row["available"] else "Unavailable"
                        _variant = "secondary" if row["available"] else "destructive"
                        with Card(), CardContent(css_class="pt-4"):
                            Muted(row["name"])
                            Heading(status_text)
                            Text(f"{row['label']} — {row['message'][:60]}")
                if not rows:
                    Text("No services configured. Set GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS env vars.")

            return PrefabApp(view=view, title="Google AI MCP Status")


# ── Global instance ───────────────────────────────────────────────────────────

google_ai_mcp = GoogleAIMCP()


def create_app() -> FastAPI:
    """Create the FastAPI application with CORS, REST routes, and MCP mount.

    Returns a fully configured FastAPI app for uvicorn serving.
    """
    _mcp_http = google_ai_mcp.mcp.http_app(path="/")

    @contextlib.asynccontextmanager
    async def _fastmcp_lifespan(_app: FastAPI):
        """Wrap FastMCP lifespan to suppress uvicorn access log noise."""
        for _lname in ("uvicorn.access", "uvicorn.error", "uvicorn"):
            _l = logging.getLogger(_lname)
            _l.handlers.clear()
            _l.setLevel(logging.WARNING)
            _l.propagate = False
        async with _mcp_http.lifespan(_app):
            yield

    app = FastAPI(title="Google-AI-MCP", version="0.1.0", lifespan=_fastmcp_lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:11015",
            "http://127.0.0.1:11015",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok", "server": "Google-AI-MCP", "version": "0.1.0"}

    @app.get("/api/status")
    async def api_status():
        refresh_cached_clients()
        services = {}
        for _name, _client_getter, _label in [
            ("chat", get_chat_client, "Gemini/Gemma Chat"),
            ("imagen", get_imagen_client, "Nano Banana / Imagen"),
            ("veo", get_veo_client, "Veo 3.1 Video"),
            ("omni", get_omni_client, "Gemini Omni Flash"),
            ("lyria", get_lyria_client, "Lyria 3 Music"),
            ("speech", get_speech_client, "Google Cloud TTS"),
            ("embeddings", get_embeddings_client, "Text Embeddings"),
        ]:
            try:
                client = _client_getter()
                status = client.get_status()
                available = not status.get("mock_mode", True)
                msg = status.get("reason", "unknown")
            except Exception as exc:
                available, msg = False, str(exc)
            services[_name] = {"available": available, "message": msg, "label": _label}
        available_count = sum(1 for s in services.values() if s["available"])
        return {
            "status": "ok",
            "server": "Google-AI-MCP",
            "version": "0.1.0",
            "services": services,
            "available_services": available_count,
            "total_services": len(services),
        }

    # ── Mount REST routes from web.py (if available) ──────────────────────────
    try:
        from google_ai_mcp.web import setup_routes

        setup_routes(app, google_ai_mcp.mcp)
    except ImportError as exc:
        logger.info("web.py not found — REST dashboard endpoints skipped (%s)", exc)

    app.mount("/mcp", _mcp_http)

    return app


app = create_app()


def main() -> None:
    """CLI entry point: stdio or HTTP via transport."""
    try:
        from google_ai_mcp.transport import run_server

        run_server(google_ai_mcp.mcp, server_name="google-ai-mcp")
    except ImportError:
        import asyncio

        logger.info("No transport module found — running stdio")
        asyncio.run(google_ai_mcp.mcp.run_stdio_async())


if __name__ == "__main__":
    main()
