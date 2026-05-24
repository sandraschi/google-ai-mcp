$ErrorActionPreference = "Stop"
$Root = "D:\Dev\repos\google-ai-mcp"
$UV = "C:\Users\sandr\.local\bin\uv.exe"
$BP = 11014; $FP = 11015

# Kill zombies
npx --yes kill-port $BP 2>$null
npx --yes kill-port $FP 2>$null
Start-Sleep 1

# Start backend
$bj = Start-Job -ScriptBlock { param($d) Set-Location $d; & $using:UV run uvicorn google_ai_mcp.server:app --host 127.0.0.1 --port $using:BP --log-level warning } -ArgumentList $Root
Write-Host "Waiting for backend..."
for ($i=0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BP/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue; if ($r.StatusCode -eq 200) { Write-Host "Backend OK after ${i}s"; break } } catch {}; Start-Sleep 1 }

# Start frontend
$fj = Start-Job -ScriptBlock { param($d) Set-Location $d; npx vite --port $using:FP --host } -ArgumentList (Join-Path $Root "webapp")
Write-Host "Waiting for frontend..."
for ($i=0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$FP" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue; if ($r.StatusCode -eq 200) { Write-Host "Frontend OK after ${i}s"; break } } catch {}; Start-Sleep 1 }

# Run tests
Write-Host "Running Playwright tests..."
Set-Location (Join-Path $Root "webapp")
npx playwright test --reporter=list 2>&1
Write-Host "EXIT CODE: $LASTEXITCODE"

# Cleanup
Stop-Job $bj -ErrorAction SilentlyContinue
Stop-Job $fj -ErrorAction SilentlyContinue
Remove-Job $bj -ErrorAction SilentlyContinue
Remove-Job $fj -ErrorAction SilentlyContinue
npx --yes kill-port $BP 2>$null
npx --yes kill-port $FP 2>$null
