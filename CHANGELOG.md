# Changelog

## [0.1.0] — 2026-05-24

### Added
- Initial repo extracted from myai/projects/gemini_tools into fleet-conforming repo
- FastMCP 3.2 MCP server with 8 portmanteau tools (chat, image, video, music, speech, embeddings, status, Prefab card)
- FastAPI REST endpoints at /api/v1/* delegating to client libraries
- React MUI webapp with Vite dev server on port 11015
- Mock mode fallback for all services when GOOGLE_API_KEY/GOOGLE_CLOUD_PROJECT missing
- Settings page with API key persistence to server/settings.json
- Tauri 2.0 native desktop wrapper in native/
- Docker Compose deployment preserved from original
- 17 pytest backend tests (all MCP tools + API endpoints)
- 9 Playwright E2E tests (6 REST API + 3 frontend)
- Fleet start.ps1 pattern from email-mcp template
- just e2e recipe using fleet auditor script
- Fleet port registration at 11014/11015 in WEBAPP_PORTS.md
- Fleet starts bat at mcp-central-docs/starts/google-ai-start.bat

### Fixed
- Server lifespan crash (@contextlib.asynccontextmanager decorator)
- Mismatched client method names (generate → generate_image/generate_video/generate_music)
- health_check() → get_status() sync replacement
- Chat endpoint crash when model=None passed
- Session timeout in start.ps1 (Google SDK cold start 30-45s)
- Extra </div> in email-mcp auto-respond.tsx (related cascade fix)

### Fleet-wide
- playwright-audit.ps1 reusable E2E auditor in mcp-central-docs
- just-starts/ directory with 129 repo dashboard bat launchers
- e2e: recipe added to 20 webapp repos
- WEBAPP_PORTS.md start.ps1 pattern updated with correct Start-Job + param() pattern
