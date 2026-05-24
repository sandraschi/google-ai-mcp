@echo off
cd /d "%~dp0"
where pwsh >nul 2>nul
if %ERRORLEVEL%==0 (
  pwsh -NoLogo -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
) else (
  powershell -NoLogo -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
)
