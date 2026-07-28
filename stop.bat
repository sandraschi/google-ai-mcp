@echo off
REM Stop google-ai-mcp fleet ports
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
if errorlevel 1 pause

