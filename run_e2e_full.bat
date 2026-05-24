@echo off
cd /d D:\Dev\repos\google-ai-mcp
set OUTFILE=D:\Dev\repos\google-ai-mcp\e2e_results.txt
echo START: %DATE% %TIME% > %OUTFILE%

:: Kill zombies
powershell -Command "npx --yes kill-port 11014 2>$null; npx --yes kill-port 11015 2>$null"
echo Ports cleared >> %OUTFILE%

:: Start backend via PowerShell job
powershell -Command "$j=Start-Job -ScriptBlock {param($d) Set-Location $d; & 'C:\Users\sandr\.local\bin\uv.exe' run uvicorn google_ai_mcp.server:app --host 127.0.0.1 --port 11014 --log-level warning} -ArgumentList 'D:\Dev\repos\google-ai-mcp'; Write-Host $j.Id > D:\Dev\repos\google-ai-mcp\backend_pid.txt"
echo Backend starting >> %OUTFILE%

:: Poll backend
:poll_backend
powershell -Command "try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:11014/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue; if($r.StatusCode -eq 200){exit 0}}catch{}; exit 1" && goto backend_ready
timeout /t 3 /nobreak >nul
goto poll_backend
:backend_ready
echo Backend ready at %TIME% >> %OUTFILE%

:: Start frontend via PowerShell job
powershell -Command "$j=Start-Job -ScriptBlock {param($d) Set-Location $d; npx vite --port 11015 --host} -ArgumentList 'D:\Dev\repos\google-ai-mcp\webapp'; Write-Host $j.Id > D:\Dev\repos\google-ai-mcp\frontend_pid.txt"
echo Frontend starting >> %OUTFILE%

:poll_frontend
powershell -Command "try{$r=Invoke-WebRequest -Uri 'http://127.0.0.1:11015' -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue; if($r.StatusCode -eq 200){exit 0}}catch{}; exit 1" && goto frontend_ready
timeout /t 3 /nobreak >nul
goto poll_frontend
:frontend_ready
echo Frontend ready at %TIME% >> %OUTFILE%

:: Run tests
cd /d D:\Dev\repos\google-ai-mcp\webapp
echo Starting tests at %TIME% >> %OUTFILE%
npx playwright test --reporter=list >> %OUTFILE% 2>&1
echo TEST EXIT: %ERRORLEVEL% at %TIME% >> %OUTFILE%

:: Cleanup
powershell -Command "Get-Job | Stop-Job; Get-Job | Remove-Job; npx --yes kill-port 11014 2>$null; npx --yes kill-port 11015 2>$null"
echo DONE at %TIME% >> %OUTFILE%
