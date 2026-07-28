"""FastAPI REST endpoints for Google AI MCP webapp."""
from __future__ import annotations

import json
import os

import httpx
from fastapi import FastAPI, Request
from fastmcp import FastMCP

from google_ai_mcp.chat_client import DEFAULT_CHAT_MODEL
from google_ai_mcp.clients_registry import (
    get_chat_client,
    get_embeddings_client,
    get_imagen_client,
    get_lyria_client,
    get_omni_client,
    get_speech_client,
    get_veo_client,
    refresh_cached_clients,
    resolve_api_key,
    resolve_project_id,
)
from google_ai_mcp.imagen_client import DEFAULT_IMAGE_MODEL
from google_ai_mcp.lyria_client import DEFAULT_LYRIA_MODEL
from google_ai_mcp.omni_client import DEFAULT_OMNI_MODEL
from google_ai_mcp.paths import SETTINGS_JSON
from google_ai_mcp.speech_client import DEFAULT_TTS_MODEL, DEFAULT_TTS_VOICE, LIVE_MODELS, TTS_MODELS, TTS_VOICES
from google_ai_mcp.veo_client import DEFAULT_VEO_MODEL


def setup_routes(app: FastAPI, mcp: FastMCP) -> None:
    """Mount all REST endpoints on the FastAPI app."""

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "server": "Google-AI-MCP", "version": "0.1.0"}

    # ── Chat ───────────────────────────────────────────────────────────────────

    @app.post("/api/v1/chat")
    async def chat(req: Request):
        body = await req.json()
        prompt = body.get("prompt", "")
        kwargs = {"prompt": prompt}
        if body.get("model"):
            kwargs["model"] = body["model"]
        client = get_chat_client()
        result = await client.chat(**kwargs)
        return result

    @app.get("/api/v1/chat/models")
    async def chat_models():
        client = get_chat_client()
        models = getattr(client, "AVAILABLE_CHAT_MODELS", {})
        return {"models": models, "default": DEFAULT_CHAT_MODEL}

    # ── Image ──────────────────────────────────────────────────────────────────

    @app.post("/api/v1/generate_image")
    async def generate_image(req: Request):
        body = await req.json()
        client = get_imagen_client()
        result = await client.generate_image(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            aspect_ratio=body.get("aspect_ratio", "1:1"),
            num_images=body.get("num_images", 1),
        )
        return result

    @app.get("/api/v1/image/models")
    async def image_models():
        client = get_imagen_client()
        models = client.get_available_models()
        return {"models": models, "default": DEFAULT_IMAGE_MODEL}

    # ── Video ──────────────────────────────────────────────────────────────────

    @app.post("/api/v1/generate_video")
    async def generate_video(req: Request):
        body = await req.json()
        client = get_veo_client()
        result = await client.generate_video(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            duration=body.get("duration", 8),
            aspect_ratio=body.get("aspect_ratio", "16:9"),
            num_videos=body.get("num_videos", 1),
        )
        return result

    @app.get("/api/v1/video/models")
    async def video_models():
        client = get_veo_client()
        return {"models": client.get_available_models(), "default": DEFAULT_VEO_MODEL}

    # ── Music ──────────────────────────────────────────────────────────────────

    @app.post("/api/v1/generate_music")
    async def generate_music(req: Request):
        body = await req.json()
        client = get_lyria_client()
        result = await client.generate_music(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            duration=body.get("duration", 30),
            num_tracks=body.get("num_tracks", 1),
        )
        return result

    @app.get("/api/v1/music/models")
    async def music_models():
        client = get_lyria_client()
        return {"models": client.get_available_models(), "default": DEFAULT_LYRIA_MODEL}

    # ── Speech ──────────────────────────────────────────────────────────────────

    @app.post("/api/v1/speech/tts")
    async def text_to_speech(req: Request):
        body = await req.json()
        client = get_speech_client()
        result = await client.text_to_speech(
            text=body.get("text", ""),
            model=body.get("model", DEFAULT_TTS_MODEL),
            voice_name=body.get("voice_name", DEFAULT_TTS_VOICE),
        )
        return result

    @app.get("/api/v1/speech/options")
    async def speech_options():
        return {
            "tts_models": TTS_MODELS,
            "live_models": LIVE_MODELS,
            "default_model": DEFAULT_TTS_MODEL,
            "voices": TTS_VOICES,
            "default_voice": DEFAULT_TTS_VOICE,
        }

    # ── Gemini Omni (any-to-any multimodal) ────────────────────────────────────

    @app.post("/api/v1/omni/generate")
    async def omni_generate(req: Request):
        body = await req.json()
        client = get_omni_client()
        result = await client.generate(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            duration=body.get("duration", 10),
            aspect_ratio=body.get("aspect_ratio", "16:9"),
            image_urls=body.get("image_urls"),
            audio_urls=body.get("audio_urls"),
            video_urls=body.get("video_urls"),
            edit_history=body.get("edit_history"),
            num_outputs=body.get("num_outputs", 1),
            output_path="uploads/omni",
        )
        return result

    @app.get("/api/v1/omni/models")
    async def omni_models():
        client = get_omni_client()
        return {"models": client.get_available_models(), "default": DEFAULT_OMNI_MODEL}

    @app.get("/api/v1/omni/status")
    async def omni_status():
        return get_omni_client().get_status()

    # ── Embeddings ─────────────────────────────────────────────────────────────

    @app.post("/api/v1/embeddings")
    async def embeddings(req: Request):
        body = await req.json()
        client = get_embeddings_client()
        result = await client.embed_text(
            text=body.get("text", ""),
            model=body.get("model"),
            task_type=body.get("task_type"),
        )
        return result

    # ── Models (aggregated) ────────────────────────────────────────────────────

    @app.get("/api/v1/models")
    async def list_all_models():
        chat_m = getattr(get_chat_client(), "AVAILABLE_CHAT_MODELS", {})
        img_m = get_imagen_client().get_available_models()
        vid_m = get_veo_client().get_available_models()
        mus_m = get_lyria_client().get_available_models()
        omni_m = get_omni_client().get_available_models()
        return {
            "chat": {"models": chat_m, "default": DEFAULT_CHAT_MODEL},
            "image": {"models": img_m, "default": DEFAULT_IMAGE_MODEL},
            "video": {"models": vid_m, "default": DEFAULT_VEO_MODEL},
            "music": {"models": mus_m, "default": DEFAULT_LYRIA_MODEL},
            "omni": {"models": omni_m, "default": DEFAULT_OMNI_MODEL},
            "speech": {"models": TTS_MODELS, "default": DEFAULT_TTS_MODEL},
        }

    # ── Settings ───────────────────────────────────────────────────────────────

    @app.get("/api/v1/settings")
    async def get_settings():
        key = resolve_api_key()
        proj = resolve_project_id()
        masked = key[:4] + "****" + key[-4:] if len(key) > 8 else ""
        return {"apiKey": masked, "projectId": proj, "configured": bool(key)}

    @app.post("/api/v1/settings")
    async def save_settings(req: Request):
        body = await req.json()
        key = (body.get("apiKey") or "").strip()
        proj = (body.get("projectId") or "").strip()
        if key:
            SETTINGS_JSON.parent.mkdir(parents=True, exist_ok=True)
            with open(SETTINGS_JSON, "w") as f:
                json.dump({"apiKey": key, "projectId": proj}, f)
            os.environ["GOOGLE_API_KEY"] = key
            if proj:
                os.environ["GOOGLE_CLOUD_PROJECT"] = proj
            refresh_cached_clients()
        return {"success": True, "message": "Settings saved"}

    # ── LeWorldModel bridge ────────────────────────────────────────────────────

    @app.get("/api/v1/world/status")
    async def world_status():
        try:
            async with httpx.AsyncClient(base_url="http://127.0.0.1:10927", timeout=5.0) as c:
                r = await c.get("/api/status")
                return {"reachable": True, "data": r.json()}
        except Exception:
            return {"reachable": False, "message": "LeWM not running on 10927"}

    from google_ai_mcp.compat_routes import setup_compat_routes

    setup_compat_routes(
        app,
        {
            "get_veo_client": get_veo_client,
            "get_lyria_client": get_lyria_client,
            "get_chat_client": get_chat_client,
            "resolve_api_key": resolve_api_key,
            "resolve_project_id": resolve_project_id,
            "refresh_cached_clients": refresh_cached_clients,
        },
    )
