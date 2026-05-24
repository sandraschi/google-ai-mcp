# google-ai-mcp webapp starter (PowerShell)
$ErrorActionPreference = "Stop"

$FrontendPort = 11015
$BackendPort  = 11014

Write-Host "=== google-ai-mcp Webapp ===" -ForegroundColor Cyan
Write-Host "Frontend : http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Backend  : http://localhost:$BackendPort" -ForegroundColor Green
Write-Host ""

# Clear zombie processes on our ports
$ports = @($FrontendPort, $BackendPort)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique
        foreach ($pid2kill in $pids) {
            Write-Host "Killing PID $pid2kill on port $p ..."
            Stop-Process -Id $pid2kill -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# Start dev server
Write-Host "Starting Vite dev server on port $FrontendPort ..."
npm run dev
