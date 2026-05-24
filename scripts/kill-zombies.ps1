# Fleet zombie kill - google-ai-mcp (SOTA V2.5 + listen/taskkill)
param(
    [int]$WebPort = 11015,
    [int]$BackendPort = 11014
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host ('Checking for port squatters on {0} and {1}...' -f $WebPort, $BackendPort) -ForegroundColor Yellow

$pids = @(
    Get-NetTCPConnection -LocalPort $WebPort, $BackendPort -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 4 } |
        Select-Object -ExpandProperty OwningProcess -Unique
)

foreach ($p in $pids) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { 'unknown' }
    Write-Host ('Found squatter (PID: {0}, {1}). Terminating...' -f $p, $name) -ForegroundColor Red
    try { Stop-Process -Id $p -Force -ErrorAction Stop } catch {
        Write-Host ('Warning: Could not terminate PID {0}.' -f $p) -ForegroundColor Gray
    }
    Start-Process -FilePath 'taskkill.exe' -ArgumentList '/PID', $p, '/F', '/T' -Wait -NoNewWindow | Out-Null
}

Start-Sleep -Milliseconds 400

foreach ($port in @($WebPort, $BackendPort)) {
    $left = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -gt 4 }
    if ($left) {
        Write-Host ('Port {0} still in use - retrying taskkill...' -f $port) -ForegroundColor Yellow
        foreach ($conn in $left) {
            Start-Process -FilePath 'taskkill.exe' -ArgumentList '/PID', $conn.OwningProcess, '/F', '/T' -Wait -NoNewWindow | Out-Null
        }
    }
}

Write-Host 'Port cleanup complete.' -ForegroundColor Green
