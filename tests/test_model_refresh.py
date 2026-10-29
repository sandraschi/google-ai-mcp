"""Regression tests for the Oct 2026 model refresh and MCP tool-layer fixes.

All tests force mock mode (no env keys, settings file bypassed), so they never hit Google APIs.
"""

from __future__ import annotations

from typing import Any

import pytest

from google_ai_mcp import clients_registry
from google_ai_mcp.chat_client import DEFAULT_CHAT_MODEL, resolve_chat_model
from google_ai_mcp.embeddings_client import DEFAULT_EMBEDDING_MODEL, resolve_embedding_model
from google_ai_mcp.imagen_client import DEFAULT_IMAGE_MODEL, resolve_image_model
from google_ai_mcp.lyria_client import DEFAULT_LYRIA_MODEL, LYRIA3_CLIP, _resolve_model_key
from google_ai_mcp.omni_client import DEFAULT_OMNI_MODEL, resolve_omni_model
from google_ai_mcp.speech_client import DEFAULT_LIVE_MODEL, DEFAULT_TTS_MODEL, TTS_LITE_MODEL, resolve_tts_model
from google_ai_mcp.veo_client import DEFAULT_VEO_MODEL, resolve_veo_model

DEAD_IDS = {
    "gemini-2.0-flash",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "imagen-4.0-generate-001",
    "imagen-4.0-ultra-generate-001",
    "veo-3.1-preview-002",
    "veo-3.1-generate-preview",
    "veo-3.0-generate-001",
    "gemini-omni-flash",
    "gemini-omni-flash-preview",
    "text-embedding-004",
    "text-embedding-005",
    "gemini-live-2.5-flash-preview",
    "gemini-2.0-flash-live-preview-04-09",
}


@pytest.fixture
def mock_clients(monkeypatch: pytest.MonkeyPatch, tmp_path):
    monkeypatch.chdir(tmp_path)  # mock generators write placeholder files relative to cwd
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
    monkeypatch.setattr(clients_registry, "load_settings_api_key", lambda: "")
    monkeypatch.setattr(clients_registry, "load_settings_project_id", lambda: "")
    clients_registry.refresh_cached_clients()
    yield
    clients_registry.refresh_cached_clients()


def test_defaults_are_current():
    assert DEFAULT_CHAT_MODEL == "gemini-3.8-flash"
    assert DEFAULT_IMAGE_MODEL == "gemini-nano-banana-2.1"
    assert DEFAULT_VEO_MODEL == "veo-3.1-generate-001"
    assert DEFAULT_OMNI_MODEL == "gemini-omni-1.1-flash"
    assert DEFAULT_LYRIA_MODEL == "lyria-3.5"
    assert DEFAULT_TTS_MODEL == "gemini-3.8-flash-tts"
    assert DEFAULT_LIVE_MODEL == "gemini-3.8-live"
    assert DEFAULT_EMBEDDING_MODEL == "gemini-embedding-001"


@pytest.mark.parametrize(
    ("resolver", "old", "new"),
    [
        (lambda m: resolve_chat_model(m)[0], "gemini-2.0-flash", "gemini-3.8-flash"),
        (lambda m: resolve_chat_model(m)[0], "gemini-3-flash-preview", "gemini-3.8-flash"),
        (resolve_image_model, "gemini-3.1-flash-image-preview", "gemini-3.1-flash-image"),
        (resolve_image_model, "gemini-3-pro-image-preview", "gemini-3-pro-image"),
        (resolve_image_model, "imagen-4.0-ultra-generate-001", "gemini-3-pro-image"),
        (resolve_veo_model, "veo-3.1-preview-002", "veo-3.1-generate-001"),
        (resolve_veo_model, "veo-3.0-fast-generate-001", "veo-3.1-fast-generate-001"),
        (resolve_omni_model, "gemini-omni-flash", "gemini-omni-1.1-flash"),
        (_resolve_model_key, "lyria-3-pro-preview", "lyria-3.5"),
        (_resolve_model_key, "lyria-002", "lyria-3.5"),
        (resolve_tts_model, "gemini-3.1-flash-tts-preview", TTS_LITE_MODEL),
        (resolve_tts_model, "gemini-2.5-pro-preview-tts", DEFAULT_TTS_MODEL),
        (resolve_embedding_model, "text-embedding-004", "gemini-embedding-001"),
    ],
)
def test_retired_ids_resolve_to_replacements(resolver, old, new):
    assert resolver(old) == new


@pytest.mark.parametrize(
    "resolver",
    [
        lambda m: resolve_chat_model(m)[0],
        resolve_image_model,
        resolve_veo_model,
        resolve_omni_model,
        _resolve_model_key,
        resolve_tts_model,
        resolve_embedding_model,
    ],
)
def test_resolvers_accept_none(resolver):
    assert resolver(None)


def _payload(result: Any) -> dict[str, Any]:
    """FastMCP ToolResult -> dict, tolerant of minor API differences."""
    sc = getattr(result, "structured_content", None)
    if isinstance(sc, dict):
        return sc.get("result", sc) if set(sc) == {"result"} else sc
    if isinstance(result, dict):
        return result
    raise AssertionError(f"Unexpected tool result type: {type(result)!r}")


@pytest.fixture
def mcp(mock_clients):
    from google_ai_mcp.server import GoogleAIMCP

    return GoogleAIMCP().mcp


@pytest.mark.parametrize(
    "tool",
    [
        "google_ai_chat",
        "google_ai_image",
        "google_ai_video",
        "google_ai_omni",
        "google_ai_music",
        "google_ai_speech",
        "google_ai_embeddings",
    ],
)
async def test_list_models_has_no_dead_ids(mcp, tool):
    out = _payload(await mcp.call_tool(tool, {"operation": "list_models"}))
    assert out["success"] is True
    models = set(out["data"]["models"])
    assert models, f"{tool} listed no models"
    leaked = (models & DEAD_IDS) - {"gemini-3.1-pro-preview"}
    # Alias entries ending up in the list are fine only if clearly labelled; canonical dead ids are not.
    labels = out["data"].get("labels", {})
    for mid in leaked:
        assert "->" in labels.get(mid, "") or "eprecated" in labels.get(mid, ""), f"{tool} lists dead id {mid}"


async def test_chat_without_model_returns_text(mcp):
    """Regression: model=None used to crash, and the tool read result['text'] instead of 'response'."""
    out = _payload(await mcp.call_tool("google_ai_chat", {"prompt": "hello"}))
    assert out["success"] is True
    assert out["data"]["response"], "chat tool returned an empty response"
    assert out["data"]["model"].startswith(DEFAULT_CHAT_MODEL)


async def test_music_without_model_works_in_mock(mcp):
    out = _payload(await mcp.call_tool("google_ai_music", {"prompt": "lofi beat"}))
    assert out["success"] is True
    assert out["data"]["model"] == DEFAULT_LYRIA_MODEL


async def test_lyria_clip_forces_30s(mock_clients):
    client = clients_registry.get_lyria_client()
    res = await client.generate_music("short loop", model=LYRIA3_CLIP, duration=120, output_path=None)
    assert res["success"] is True
    assert res["metadata"]["duration"] == 30


async def test_omni_rejects_bad_duration(mock_clients):
    client = clients_registry.get_omni_client()
    res = await client.generate("x", duration=12)
    assert res["success"] is False


async def test_veo_duration_snaps(mock_clients, tmp_path):
    client = clients_registry.get_veo_client()
    res = await client.generate_video("x", duration=5, output_path=str(tmp_path))
    assert res["success"] is True
    assert res["metadata"]["duration"] in (4, 6)


async def test_failed_client_result_is_not_reported_as_success(mcp, monkeypatch):
    """Regression: tools used to return success=True even when the client failed."""
    client = clients_registry.get_imagen_client()

    async def boom(**_kw):
        return {"success": False, "error": "simulated failure"}

    monkeypatch.setattr(client, "generate_image", boom)
    out = _payload(await mcp.call_tool("google_ai_image", {"prompt": "x"}))
    assert out["success"] is False
    assert "simulated failure" in out["message"]
