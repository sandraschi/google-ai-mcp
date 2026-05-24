set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

# ── Dashboard (default) ──
default:
    @Write-Host "`n  Google AI MCP — Fleet Recipes`n  =============================="
    @Write-Host ""
    @Write-Host "  serve          Start backend + frontend (start.ps1)"
    @Write-Host "  dev            Start backend only (uv run python server.py)"
    @Write-Host "  build          Install deps (uv sync + npm ci)"
    @Write-Host "  test           Run pytest + playwright e2e"
    @Write-Host "  lint           Ruff + Biome check"
    @Write-Host "  fmt            Ruff format + Biome format"
    @Write-Host "  fix            Auto-fix lint issues"
    @Write-Host "  check          fmt + lint"
    @Write-Host "  clean          Remove build artifacts"
    @Write-Host "  ci             Full CI pipeline (build, check, test)"
    @Write-Host "  build-native   Build Tauri 2.0 desktop installer"
    @Write-Host ""

# ── Development ──
serve:
    .\start.ps1

kill-zombies:
    .\scripts\kill-zombies.ps1

dev:
    C:\Users\sandr\.local\bin\uv.exe run python -m google_ai_mcp.server

# ── Build ──
bootstrap:
    C:\Users\sandr\.local\bin\uv.exe sync --extra test --extra dev
    npm --prefix webapp ci

build:
    C:\Users\sandr\.local\bin\uv.exe sync --extra test --extra dev
    npm --prefix webapp ci

# ── Quality ──
lint:
    C:\Users\sandr\.local\bin\uv.exe run ruff check src/ tests/

fmt:
    C:\Users\sandr\.local\bin\uv.exe run ruff format src/ tests/

fix:
    C:\Users\sandr\.local\bin\uv.exe run ruff check src/ tests/ --fix --unsafe-fixes

check: fmt lint

# ── Test ──
test:
    C:\Users\sandr\.local\bin\uv.exe run pytest tests/ -q

e2e:
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "D:\Dev\repos\mcp-central-docs\scripts\playwright-audit.ps1" -RepoPath "{{justfile_directory()}}" -BackendPort 11014 -FrontendPort 11015

# ── Native ──
build-native:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    .\build.ps1

build-native-debug:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    npx @tauri-apps/cli build --debug

# ── Housekeeping ──
clean:
    Get-ChildItem -Path . -Recurse -Include __pycache__,*.pyc,*.pyo,*.egg-info | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path native\target\ -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path native\gen\ -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path dist\ -Recurse -Force -ErrorAction SilentlyContinue

# ── CI ──
ci: build check test
