"""Genie 4 scaffold tests. No network: probe/generate are exercised against fakes."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from google_ai_mcp import clients_registry
from google_ai_mcp.genie_client import GenieClient


@pytest.fixture
def no_creds(monkeypatch: pytest.MonkeyPatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    for var in ("GOOGLE_API_KEY", "GOOGLE_CLOUD_PROJECT", "GENIE_MODEL_ID"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setattr(clients_registry, "load_settings_api_key", lambda: "")
    monkeypatch.setattr(clients_registry, "load_settings_project_id", lambda: "")
    clients_registry.refresh_cached_clients()
    yield
    clients_registry.refresh_cached_clients()


def _fake_client(models=(), interaction=None):
    return SimpleNamespace(
        models=SimpleNamespace(list=lambda: [SimpleNamespace(name=f"models/{m}", display_name=m) for m in models]),
        interactions=SimpleNamespace(create=lambda **_kw: interaction),
    )


def test_status_without_key(no_creds):
    st = GenieClient().get_status()
    assert st["reason"] == "not_configured"
    assert st["mock_mode"] is True
    assert st["availability"] == "research_preview_waitlist"


async def test_generate_disabled_without_model_id(no_creds):
    res = await GenieClient(api_key="k").generate("a forest")
    assert res["success"] is False
    assert "waitlist" in res["error"]


async def test_probe_without_key_fails_cleanly(no_creds):
    res = await GenieClient().probe()
    assert res["success"] is False


async def test_probe_finds_genie_models(no_creds):
    c = GenieClient(api_key="k")
    c._client = _fake_client(models=["gemini-3.8-flash", "genie-4-preview", "lyria-3.5"])
    res = await c.probe()
    assert res["success"] is True
    assert [m["id"] for m in res["candidates"]] == ["genie-4-preview"]


async def test_probe_reports_none_yet(no_creds):
    c = GenieClient(api_key="k")
    c._client = _fake_client(models=["gemini-3.8-flash"])
    res = await c.probe()
    assert res["success"] is True and res["candidates"] == []


async def test_generate_saves_video_when_enabled(no_creds, tmp_path):
    fake_interaction = SimpleNamespace(id="int_1", output_video=SimpleNamespace(data="AAAA"), output_text=None)
    c = GenieClient(api_key="k", model_id="genie-4-preview")
    c._client = _fake_client(interaction=fake_interaction)
    res = await c.generate("a forest", output_path=str(tmp_path / "out"))
    assert res["success"] is True and res["experimental"] is True
    assert res["outputs"][0]["kind"] == "video"


async def test_tool_status_and_generate_gate(no_creds):
    from google_ai_mcp.server import GoogleAIMCP

    mcp = GoogleAIMCP().mcp
    st = (await mcp.call_tool("google_ai_genie", {})).structured_content
    assert st["success"] is True
    gen = (await mcp.call_tool("google_ai_genie", {"operation": "generate", "prompt": "x"})).structured_content
    assert gen["success"] is False
