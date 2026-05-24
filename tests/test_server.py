"""Tests for Google AI MCP server — FastAPI endpoints and MCP tool responses."""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from google_ai_mcp.server import app, google_ai_mcp


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["server"] == "Google-AI-MCP"


@pytest.mark.asyncio
async def test_api_status_endpoint(client):
    resp = await client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "services" in data
    assert data["total_services"] == 7


@pytest.mark.asyncio
async def test_google_ai_chat_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_chat", {"operation": "list_models"})
    assert result is not None
    # In mock mode, should still return model list


@pytest.mark.asyncio
async def test_google_ai_image_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_image", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_video_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_video", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_music_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_music", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_speech_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_speech", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_speech_list_voices():
    result = await google_ai_mcp.mcp.call_tool("google_ai_speech", {"operation": "list_voices"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_embeddings_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_embeddings", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_omni_list_models():
    result = await google_ai_mcp.mcp.call_tool("google_ai_omni", {"operation": "list_models"})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_omni_empty_prompt():
    result = await google_ai_mcp.mcp.call_tool("google_ai_omni", {"prompt": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_status():
    result = await google_ai_mcp.mcp.call_tool("google_ai_status")
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_chat_empty_prompt():
    result = await google_ai_mcp.mcp.call_tool("google_ai_chat", {"prompt": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_image_empty_prompt():
    result = await google_ai_mcp.mcp.call_tool("google_ai_image", {"prompt": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_video_empty_prompt():
    result = await google_ai_mcp.mcp.call_tool("google_ai_video", {"prompt": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_music_empty_prompt():
    result = await google_ai_mcp.mcp.call_tool("google_ai_music", {"prompt": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_speech_empty_text():
    result = await google_ai_mcp.mcp.call_tool("google_ai_speech", {"text": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_google_ai_embeddings_empty_text():
    result = await google_ai_mcp.mcp.call_tool("google_ai_embeddings", {"text": ""})
    assert result is not None


@pytest.mark.asyncio
async def test_all_tools_registered():
    # Call status tool which returns the tool list
    result = await google_ai_mcp.mcp.call_tool("google_ai_status")
    # Extract tool names from status response
    data = getattr(result, "content", [{}])[0]
    text = getattr(data, "text", "{}")
    import json
    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        payload = {}
    tool_names = set(payload.get("tools", []))
    expected = {
        "google_ai_chat",
        "google_ai_image",
        "google_ai_video",
        "google_ai_omni",
        "google_ai_music",
        "google_ai_speech",
        "google_ai_embeddings",
        "google_ai_status",
        "show_google_ai_status_card",
    }
    missing = expected - tool_names
    assert not missing, f"Missing tools: {missing}"
