# Google AI MCP

<p align="center">
  <a href="https://github.com/sandraschi/google-ai-mcp/actions/workflows/ci.yml"><img src="https://github.com/sandraschi/google-ai-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/astral-sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-11015-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"></a>
  <a href="https://ai.google.dev"><img src="https://img.shields.io/badge/Google_AI-Gemini-4285F4?style=flat-square&logo=google&logoColor=white" alt="Google AI"></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/E2E-Playwright-45ba4b?style=flat-square&logo=playwright&logoColor=white" alt="Playwright"></a>
</p>

FastMCP 3.2 unified gateway for **Google AI cloud services** + **local LeWorldModel (LeWM)** bridge. Chat, images, video, music, speech, embeddings — plus world model planning via local lewm-mcp proxy.

## Quick Start

```powershell
# Install deps
uv sync --extra test --extra dev
npm --prefix webapp ci

# Start backend + frontend
.\start.ps1

# E2E audit (headless, zero clicks)
just e2e
```

- Frontend: http://127.0.0.1:11015
- Backend API: http://127.0.0.1:11014
- API Docs: http://127.0.0.1:11014/api/docs
- MCP HTTP: http://127.0.0.1:11014/mcp

## Services

| Service | Model | Requires |
|---|---|---|
| Chat | Gemini 3.1 Pro, Gemma 4 | GOOGLE_API_KEY |
| Image | Nano Banana 2 / Pro | GOOGLE_API_KEY |
| Video | Veo 3.1 Preview | GOOGLE_CLOUD_PROJECT |
| Music | Lyria 3 Pro / Clip | GOOGLE_CLOUD_PROJECT |
| Speech | Gemini TTS (one-shot) | GOOGLE_API_KEY |
| Embeddings | gemini-embedding-001 | GOOGLE_API_KEY |
| **World Model** (LeWM bridge) | LeWorldModel JEPA | lewm-mcp on port 10927 |

All Google services fall back to mock mode when credentials are missing. LeWM proxied via httpx to lewm-mcp.

## Speech vs speech-mcp

| Capability | google-ai-mcp | [speech-mcp](https://github.com/sandraschi/speech-mcp) |
|---|---|---|
| One-shot Gemini TTS | Yes (`google_ai_speech`, `/speech` UI) | Yes |
| Gemini Live (WebSocket) | **No** — link only | Yes |
| Streaming STT / Chirp / FunASR | **No** | Yes |
| ElevenLabs / fleet voice tools | **No** | Yes |

Use **google-ai-mcp** for multimodal Google AI (chat, image, video, music, Omni, embeddings). Run **speech-mcp** when you need real-time voice agents — do not duplicate that stack here.

## MCP Tools (11)

| Tool | Operations |
|---|---|
| `google_ai_chat` | chat, list_models |
| `google_ai_image` | generate, list_models |
| `google_ai_video` | generate, list_models |
| `google_ai_omni` | generate, list_models |
| `google_ai_music` | generate, list_models |
| `google_ai_speech` | tts, list_voices, list_models |
| `google_ai_embeddings` | embed, list_models |
| `google_ai_world` | health, train_prepare, infer_prepare, surprise_stub |
| `google_ai_status` | Health check all services |
| `show_google_ai_status_card` | Prefab UI card |

## Configuration

```powershell
$env:GOOGLE_API_KEY = "your-api-key"
$env:GOOGLE_CLOUD_PROJECT = "your-project-id"
$env:LEWM_API_URL = "http://127.0.0.1:10927"  # defaults to this
```

## E2E Audit

```powershell
just e2e
# Runs: clear zombies → start servers → 9 E2E tests → console probe → API health
# Fleet auditor at mcp-central-docs/scripts/playwright-audit.ps1
```

## Docker

```powershell
docker compose up -d
```

## Tests

```powershell
uv run pytest tests/ -q       # 17 backend tests
npx playwright test           # 9 E2E tests (via just e2e)
```

## Claude Desktop (MCPB)

```powershell
just mcpb-pack
# Output: dist/google-ai-mcp.mcpb
```

Drag `dist/google-ai-mcp.mcpb` onto Claude Desktop, or:

```powershell
npx @anthropic-ai/mcpb install https://github.com/sandraschi/google-ai-mcp
```

Requires Python 3.12+ with dependencies (or `uv sync` in the repo). Set `GOOGLE_API_KEY` when prompted.

## Native Desktop (Tauri)

```powershell
just build-native
# Installer: native/target/release/bundle/nsis/Google AI MCP_0.1.0_x64-setup.exe
```

Bundles React `dist/` + PyInstaller backend sidecar. First run generates Tauri icons from `assets/icon.png` if needed.

## Repository

https://github.com/sandraschi/google-ai-mcp
