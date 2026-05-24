Param([switch]$Headless, [switch]$BackendOnly, [switch]$FrontendOnly, [switch]$NoBrowser)

# --- SOTA Headless Standard 2026 ---
if ($Headless -and ($Host.Name -ne 'ConsoleHost' -or -not (Get-Variable -Name "NoRelaunch" -ErrorAction SilentlyContinue))) {
    $argList = @("-File", $PSCommandPath, "-NoRelaunch")
    if ($BackendOnly) { $argList += "-BackendOnly" }
    if ($FrontendOnly) { $argList += "-FrontendOnly" }
    $argList += "-NoBrowser"
    Start-Process pwsh.exe -ArgumentList $argList -WindowStyle Hidden
    exit
}
# -----------------------------------

$ErrorActionPreference = "Stop"
$Repo = $PSScriptRoot
$UV = "C:\Users\sandr\.local\bin\uv.exe"
$WebPort = 11015
$BackendPort = 11014

Write-Host "=== Google AI MCP ===" -ForegroundColor Cyan

& (Join-Path $Repo "scripts\kill-zombies.ps1") -WebPort $WebPort -BackendPort $BackendPort

if (-not $FrontendOnly) {
    Write-Host "[backend] Starting uvicorn on :$BackendPort ..." -ForegroundColor Yellow
    $backendProc = Start-Process -FilePath $UV `
        -ArgumentList "run","uvicorn","google_ai_mcp.server:app",
                      "--host","127.0.0.1",
                      "--port",$BackendPort,
                      "--log-level","warning" `
        -WorkingDirectory $Repo `
        -PassThru -NoNewWindow
    Write-Host "[backend] PID $($backendProc.Id)"

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" `
                -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if ($ready) {
        Write-Host "[backend] Ready at http://127.0.0.1:$BackendPort" -ForegroundColor Green
    } else {
        Write-Host "[backend] Did not respond in 15s — check logs" -ForegroundColor Red
    }
}

if ($BackendOnly) {
    Write-Host "Backend-only mode. Press Ctrl+C to stop."
    Wait-Process -Id $backendProc.Id
    exit
}

Write-Host "[frontend] Starting Vite on :$WebPort ..." -ForegroundColor Yellow
$webappDir = Join-Path $Repo "webapp"
if (-not (Test-Path (Join-Path $webappDir "node_modules"))) {
    Set-Location $webappDir
    npm install
    Set-Location $Repo
}

$frontendProc = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run","dev","--","--port",$WebPort,"--host" `
    -WorkingDirectory $webappDir `
    -PassThru -NoNewWindow
Write-Host "[frontend] PID $($frontendProc.Id)"

$fready = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $fready = $true; break }
    } catch {}
}

$url = "http://127.0.0.1:$WebPort"
if ($fready) {
    Write-Host "[frontend] Ready at $url" -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process $url }
} else {
    Write-Host "[frontend] Not yet ready — opening anyway: $url" -ForegroundColor Yellow
    if (-not $NoBrowser) { Start-Process $url }
}

Write-Host ""
Write-Host "  Frontend  : $url" -ForegroundColor Cyan
Write-Host "  Backend   : http://127.0.0.1:$BackendPort" -ForegroundColor Cyan
Write-Host "  API Docs  : http://127.0.0.1:$BackendPort/api/docs" -ForegroundColor Cyan
Write-Host "  MCP HTTP  : http://127.0.0.1:$BackendPort/mcp" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both processes." -ForegroundColor DarkGray

try {
    while ($true) {
        Start-Sleep -Seconds 5
        if ($backendProc.HasExited)  { Write-Host "[backend] exited ($($backendProc.ExitCode))" -ForegroundColor Red }
        if ($frontendProc.HasExited) { Write-Host "[frontend] exited ($($frontendProc.ExitCode))" -ForegroundColor Red }
    }
} finally {
    Write-Host "Stopping..." -ForegroundColor Yellow
    try { Stop-Process -Id $backendProc.Id  -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    & (Join-Path $Repo "scripts\kill-zombies.ps1") -WebPort $WebPort -BackendPort $BackendPort
}
