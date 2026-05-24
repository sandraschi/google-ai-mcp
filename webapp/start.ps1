Param([switch]$Headless)
$SkipFrontend = $Headless

# --- SOTA Headless Standard ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
# ------------------------------

# Webapp Start - Standardized SOTA (Auto-Repaired V2.5)
$WebPort = 11015
$BackendPort = 11014
$ProjectRoot = Split-Path -Parent $PSScriptRoot

& (Join-Path $ProjectRoot "scripts\kill-zombies.ps1") -WebPort $WebPort -BackendPort $BackendPort

Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) { npm install }

Write-Host "Starting Python backend on port $BackendPort ..." -ForegroundColor Cyan

$backendCmd = "`$env:PYTHONPATH = '$ProjectRoot;$ProjectRoot\src'; Set-Location '$ProjectRoot'; C:\Users\sandr\.local\bin\uv.exe run uvicorn google_ai_mcp.server:app --host 127.0.0.1 --port $BackendPort --log-level warning"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $c = [System.Net.Sockets.TcpClient]::new()
        $c.Connect("127.0.0.1", $BackendPort)
        $c.Close()
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Write-Host "Backend did not listen on 127.0.0.1:$BackendPort within 90s." -ForegroundColor Red
    exit 1
}
Write-Host "Backend is ready." -ForegroundColor Green

Write-Host "Starting Vite frontend on port $WebPort ..." -ForegroundColor Green

$frontendUrl = "http://127.0.0.1:$WebPort/"
$pollAndOpen = "for (`$i = 0; `$i -lt 60; `$i++) { try { `$null = Invoke-WebRequest -Uri '$frontendUrl' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; Start-Process '$frontendUrl'; exit } catch { Start-Sleep -Seconds 1 } }"
Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $pollAndOpen

Write-Host "Browser will open automatically when Vite is ready." -ForegroundColor Gray
if ($SkipFrontend) { return }
npm run dev -- --port $WebPort --host
