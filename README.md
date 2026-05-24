# Google AI MCP

<p align="center">
  <a href="https://github.com/sandraschi/google-ai-mcp/actions/workflows/ci.yml"><img src="https://github.com/sandraschi/google-ai-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://biomejs.dev"><img src="https://img.shields.io/badge/Linted_with-Biome-60a5fa?style=flat-square&logo=biome&logoColor=white" alt="Biome"></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-11015-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Google_AI-Gemini_&_Omni-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google AI"></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
</p>

FastMCP 3.2 server for Google AI services — Gemini Chat, Nano Banana image generation, Veo video, **Gemini Omni** any-to-any video, Lyria music, TTS, Gemini Live, and text embeddings.

## Quick Start

```powershell
# Install deps
uv sync --extra test --extra dev
npm --prefix webapp ci

# Start backend + frontend
.\start.ps1

# or backend only
uv run python -m google_ai_mcp.server
```

- Frontend: http://127.0.0.1:11015
- Backend API: http://127.0.0.1:11014
- API Docs: http://127.0.0.1:11014/api/docs
- MCP HTTP: http://127.0.0.1:11014/mcp

## Services

| Service | Model | Mode | Requires |
|---|---|---|---|
| Chat | Gemini 3.1 Pro, Gemma 4 | google-genai | GOOGLE_API_KEY |
| Image | Nano Banana 2 / Pro | google-genai | GOOGLE_API_KEY |
| Video | Veo 3.1 Preview | Vertex AI | GOOGLE_CLOUD_PROJECT |
| **Omni** | **Gemini Omni Flash** | google-genai / Vertex | GOOGLE_API_KEY or GOOGLE_CLOUD_PROJECT |
| Music | Lyria 3 Pro / Clip | Vertex (global) | GOOGLE_CLOUD_PROJECT |
| Speech | Gemini TTS, Live | google-genai | GOOGLE_API_KEY |
| Embeddings | gemini-embedding-001 | google-genai | GOOGLE_API_KEY |

All services fall back to mock mode when credentials are missing. Gemini Omni API is rolling out — mock mode returns placeholders until GA.

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
| `google_ai_status` | Health check all services |
| `show_google_ai_status_card` | Prefab UI card |

## Configuration

Set via environment variables or the Settings page in the webapp:

```powershell
$env:GOOGLE_API_KEY = "your-api-key"
$env:GOOGLE_CLOUD_PROJECT = "your-project-id"
```

## Docker

```powershell
docker compose up -d --build
# Frontend: http://localhost:11015
# Backend:  http://localhost:11014
```

## Native Desktop App

```powershell
just build-native
# Installer: native/target/release/bundle/nsis/Google AI MCP_0.1.0_x64-setup.exe
```

## Development

```powershell
just build      # Install deps
just lint       # Run lint checks
just test       # Run tests
just serve      # Start dev servers
```

## Repository

https://github.com/sandraschi/google-ai-mcp
