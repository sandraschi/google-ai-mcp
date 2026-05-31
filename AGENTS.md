# google-ai-mcp — Agent Guide

FastMCP 3.2 MCP server for Google AI services — Gemini Chat, Nano Banana image gen, Veo video, Lyria music, Omni, one-shot TTS, embeddings, and LeWM world-model bridge.

**Speech boundary:** streaming Live/STT lives in [speech-mcp](https://github.com/sandraschi/speech-mcp); this repo keeps thin TTS only.

## Entry Points

- `uv run google-ai-mcp` → `google_ai_mcp.server:main`
- `.\start.ps1` — backend + frontend
- `just mcpb-pack` — Claude Desktop `.mcpb` bundle

## Quick Ref

```powershell
uv run python -m google_ai_mcp.server
uv run pytest tests/ -q
just e2e
uv run ruff check src/ tests/
```

## Ports

| Service | Port |
|---|---|
| Backend (FastAPI + FastMCP HTTP) | 11014 |
| Frontend (Vite React) | 11015 |

## Architecture

```
src/google_ai_mcp/
  server.py            — FastMCP 3.2 server, MCP tools
  web.py               — FastAPI REST endpoints
  omni_client.py       — Gemini Omni multimodal
  chat_client.py       — Gemini/Gemma chat
  imagen_client.py     — Nano Banana image gen
  veo_client.py        — Veo 3.1 video gen
  lyria_client.py      — Lyria 3 music gen
  speech_client.py     — One-shot TTS (not Live)
  embeddings_client.py — Text embeddings
  clients_registry.py  — LRU-cached client factory
webapp/                — React MUI SPA (Vite)
native/                — Tauri 2.0 + PyInstaller sidecar
manifest.json          — MCPB Claude Desktop bundle
```

## MCP Tools

| Tool | Operations |
|---|---|
| `google_ai_chat` | chat, list_models |
| `google_ai_image` | generate, list_models |
| `google_ai_video` | generate, list_models |
| `google_ai_omni` | generate, list_models |
| `google_ai_music` | generate, list_models |
| `google_ai_speech` | tts, list_voices, list_models |
| `google_ai_embeddings` | embed, list_models |
| `google_ai_world` | health, train_prepare, infer_prepare |
| `google_ai_status` | Health check all services |
| `show_google_ai_status_card` | Prefab UI card |

## Standards

- FastMCP 3.2+ portmanteau tool pattern — tools use `operation` enum param
- Responses: structured dicts with `success`, `message`, domain-specific fields
- Dual transport: stdio (Claude Desktop) + HTTP (`MCP_TRANSPORT=http`)
- See [mcp-central-docs](https://github.com/sandraschi/mcp-central-docs) for fleet-wide coding standards

Install docs: follow mcp-central-docs/standards/AGENT_INSTALL_REFERENCE.md

## Configuration

```powershell
$env:GOOGLE_API_KEY = "your-api-key"
$env:GOOGLE_CLOUD_PROJECT = "your-project-id"  # for Veo/Lyria
$env:LEWM_API_URL = "http://127.0.0.1:10927"
```

All Google services fall back to mock mode when credentials are missing.

## E2E Audit

```powershell
just e2e
```

Runs: clear zombies → start servers → 9 E2E tests → console probe → API health check.
