"""Compatibility REST routes for frontend async job patterns and legacy paths."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Request, WebSocket

# In-memory job store for async-style frontend polling
_jobs: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(UTC).isoformat()


def _make_job(kind: str, result: dict[str, Any]) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    completed = result.get("success", False)
    output = None
    if kind == "video" and result.get("videos"):
        output = result["videos"][0].get("url") or result["videos"][0].get("local_path")
    elif kind == "music" and result.get("tracks"):
        output = result["tracks"][0].get("url") or result["tracks"][0].get("local_path")
    elif kind == "omni" and result.get("outputs"):
        output = result["outputs"][0].get("url") or result["outputs"][0].get("local_path")

    job = {
        "generation_id": job_id,
        "status": "completed" if completed else "failed",
        "progress": 100 if completed else 0,
        "status_message": result.get("message", "Done") if completed else result.get("error", "Failed"),
        "output_path": output,
        "error": None if completed else result.get("error"),
        "created_at": _now(),
        "updated_at": _now(),
        "metadata": result.get("metadata", {}),
        "mock_mode": result.get("mock_mode", False),
        "message": result.get("message"),
        "raw": result,
    }
    _jobs[job_id] = job
    return job


def setup_compat_routes(app: FastAPI, deps: dict[str, Any]) -> None:
    """Register frontend compatibility routes."""

    get_veo = deps["get_veo_client"]
    get_lyria = deps["get_lyria_client"]
    get_chat = deps["get_chat_client"]
    resolve_api_key = deps["resolve_api_key"]
    resolve_project_id = deps["resolve_project_id"]
    refresh_cached_clients = deps["refresh_cached_clients"]

    # ── Video aliases (VideoGenerator.tsx) ───────────────────────────────────

    @app.post("/api/v1/generate")
    async def generate_video_alias(req: Request):
        body = await req.json()
        client = get_veo()
        result = await client.generate_video(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            duration=body.get("duration", 6),
            aspect_ratio=body.get("aspect_ratio", "16:9"),
            num_videos=body.get("num_videos", 1),
        )
        return _make_job("video", result)

    @app.get("/api/v1/video/{generation_id}")
    async def video_status(generation_id: str):
        job = _jobs.get(generation_id)
        if not job:
            raise HTTPException(404, "Generation not found")
        return job

    @app.websocket("/ws/{generation_id}")
    async def video_ws(websocket: WebSocket, generation_id: str):
        await websocket.accept()
        job = _jobs.get(generation_id)
        if job:
            await websocket.send_json(job)
        await websocket.close()

    # ── Music aliases (MusicGenerator.tsx) ───────────────────────────────────

    @app.post("/api/v1/music/generate")
    async def music_generate_alias(req: Request):
        body = await req.json()
        client = get_lyria()
        result = await client.generate_music(
            prompt=body.get("prompt", ""),
            model=body.get("model"),
            duration=body.get("duration", 30),
            num_tracks=body.get("num_tracks", 1),
        )
        return _make_job("music", result)

    @app.get("/api/v1/music/status/{generation_id}")
    async def music_status(generation_id: str):
        job = _jobs.get(generation_id)
        if not job:
            raise HTTPException(404, "Generation not found")
        return job

    @app.get("/api/v1/music/download/{generation_id}")
    async def music_download(generation_id: str):
        job = _jobs.get(generation_id)
        if not job or not job.get("output_path"):
            raise HTTPException(404, "Output not found")
        from pathlib import Path

        from fastapi.responses import FileResponse

        path = Path(str(job["output_path"]))
        if path.exists():
            return FileResponse(path, media_type="audio/mpeg", filename=path.name)
        raise HTTPException(404, "File not found")

    # ── Settings test connection ─────────────────────────────────────────────

    @app.post("/api/v1/settings/test-connection")
    async def test_connection():
        refresh_cached_clients()
        chat = get_chat()
        status = chat.get_status()
        ok = not status.get("mock_mode", True)
        return {
            "success": ok,
            "message": "API key valid — chat client connected" if ok else status.get("message", "Mock mode — check API key"),
            "configured": bool(resolve_api_key()),
            "projectId": resolve_project_id(),
        }

    # ── Movie pipeline (mock orchestration) ──────────────────────────────────

    @app.post("/api/v1/movie/refine")
    async def movie_refine(req: Request):
        body = await req.json()
        prompt = body.get("prompt", "")
        client = get_chat()
        result = await client.chat(prompt=f"Refine this movie concept into a shot list:\n{prompt}")
        return {"success": True, "refined_prompt": result.get("response", prompt), "shots": []}

    @app.post("/api/v1/movie/generate")
    async def movie_generate(req: Request):
        body = await req.json()
        client = get_veo()
        result = await client.generate_video(prompt=body.get("prompt", "A cinematic scene"), duration=8)
        job = _make_job("video", result)
        job["movie_id"] = job["generation_id"]
        return job

    @app.get("/api/v1/movie/{movie_id}/status")
    async def movie_status(movie_id: str):
        job = _jobs.get(movie_id)
        if not job:
            raise HTTPException(404, "Movie job not found")
        return {**job, "movie_id": movie_id}

    # ── Romance novel (chat-backed mock) ─────────────────────────────────────

    @app.get("/api/v1/romance/tropes")
    async def romance_tropes():
        return {
            "tropes": [
                {"id": "enemies-to-lovers", "name": "Enemies to Lovers"},
                {"id": "second-chance", "name": "Second Chance"},
                {"id": "fake-dating", "name": "Fake Dating"},
                {"id": "slow-burn", "name": "Slow Burn"},
                {"id": "forbidden-love", "name": "Forbidden Love"},
            ]
        }

    @app.post("/api/v1/romance/generate")
    async def romance_generate(req: Request):
        body = await req.json()
        novel_id = str(uuid.uuid4())
        _jobs[novel_id] = {
            "novel_id": novel_id,
            "status": "completed",
            "progress": 100,
            "title": body.get("title", "Untitled Romance"),
            "created_at": _now(),
            "updated_at": _now(),
            "mock_mode": True,
            "message": "Romance novel generation uses chat mock — full pipeline coming soon.",
        }
        return _jobs[novel_id]

    @app.get("/api/v1/romance/{novel_id}/status")
    async def romance_status(novel_id: str):
        job = _jobs.get(novel_id)
        if not job:
            raise HTTPException(404, "Novel not found")
        return job

    @app.get("/api/v1/romance/{novel_id}/download")
    async def romance_download(novel_id: str):
        job = _jobs.get(novel_id)
        if not job:
            raise HTTPException(404, "Novel not found")
        from fastapi.responses import PlainTextResponse

        return PlainTextResponse(
            f"# {job.get('title', 'Romance Novel')}\n\n(Mock chapter — configure Gemini for live generation.)\n",
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="romance_{novel_id[:8]}.txt"'},
        )
