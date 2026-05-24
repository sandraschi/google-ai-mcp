Param([switch]$Headless, [switch]$BackendOnly, [switch]$FrontendOnly, [switch]$NoBrowser)

if ($Headless -and ($Host.Name -ne 'ConsoleHost' -or -not (Get-Variable -Name "NoRelaunch" -ErrorAction SilentlyContinue))) {
    $argList = @("-File", $PSCommandPath, "-NoRelaunch")
    if ($BackendOnly) { $argList += "-BackendOnly" }
    if ($FrontendOnly) { $argList += "-FrontendOnly" }
    $argList += "-NoBrowser"
    Start-Process pwsh.exe -ArgumentList $argList -WindowStyle Hidden
    exit
}

$ErrorActionPreference = "Stop"
$Repo = $PSScriptRoot
$UV = "C:\Users\sandr\.local\bin\uv.exe"
$BackendPort = 11014
$FrontendPort = 11015

Write-Host "=== Google AI MCP ===" -ForegroundColor Cyan

foreach ($port in @($BackendPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        try { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Start-Sleep -Milliseconds 300

if (-not $FrontendOnly) {
    Write-Host ("backend: Starting uvicorn on port $BackendPort") -ForegroundColor Yellow
    $backendProc = Start-Process -FilePath $UV `
        -ArgumentList "run","uvicorn","google_ai_mcp.server:app",
                      "--host","127.0.0.1",
                      "--port",$BackendPort,
                      "--log-level","warning" `
        -WorkingDirectory $Repo `
        -PassThru -NoNewWindow
    Write-Host ("backend: PID $($backendProc.Id)")

    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" `
                -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    if ($ready) {
        Write-Host ("backend: Ready at http://127.0.0.1:$BackendPort") -ForegroundColor Green
    } else {
        Write-Host ("backend: Did not respond") -ForegroundColor Red
    }
}

if ($BackendOnly) {
    Write-Host "Backend-only mode. Press Ctrl+C to stop."
    Wait-Process -Id $backendProc.Id
    exit
}

Write-Host ("frontend: Starting Vite on port $FrontendPort") -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath "node" `
    -ArgumentList (Join-Path $Repo "webapp\node_modules\.bin\vite") `
    -WorkingDirectory (Join-Path $Repo "webapp") `
    -PassThru -NoNewWindow
Write-Host ("frontend: PID $($frontendProc.Id)")

$fready = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $fready = $true; break }
    } catch {}
}

$url = "http://localhost:$FrontendPort"
if ($fready) {
    Write-Host ("frontend: Ready at $url") -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process $url }
} else {
    Write-Host ("frontend: Opening anyway $url") -ForegroundColor Yellow
    if (-not $NoBrowser) { Start-Process $url }
}

Write-Host ("")
Write-Host ("  Frontend  : $url") -ForegroundColor Cyan
Write-Host ("  Backend   : http://127.0.0.1:$BackendPort") -ForegroundColor Cyan
Write-Host ("  API Docs  : http://127.0.0.1:$BackendPort/api/docs") -ForegroundColor Cyan
Write-Host ("  MCP HTTP  : http://127.0.0.1:$BackendPort/mcp") -ForegroundColor Cyan
Write-Host ("")
Write-Host ("Press Ctrl+C to stop both processes.") -ForegroundColor DarkGray

try {
    while ($true) {
        Start-Sleep -Seconds 5
        if ($backendProc.HasExited)  { Write-Host ("backend exited with code $($backendProc.ExitCode)") -ForegroundColor Red }
        if ($frontendProc.HasExited) { Write-Host ("frontend exited with code $($frontendProc.ExitCode)") -ForegroundColor Red }
    }
} finally {
    Write-Host ("Stopping...") -ForegroundColor Yellow
    try { Stop-Process -Id $backendProc.Id  -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue } catch {}
}
