#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Uv = "C:\Users\sandr\.local\bin\uv.exe"

Write-Host "=== google-ai-mcp sidecar build ===" -ForegroundColor Cyan

Push-Location $Root
try {
    $pi = & $Uv run pyinstaller --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "-> Installing PyInstaller..." -ForegroundColor Yellow
        & $Uv pip install pyinstaller
    } else {
        Write-Host "-> PyInstaller: $pi" -ForegroundColor Gray
    }

    Remove-Item -Recurse -Force "$Root\build\google-ai-mcp-backend" -ErrorAction SilentlyContinue
    Remove-Item -Force "$Root\dist\google-ai-mcp-backend.exe" -ErrorAction SilentlyContinue

    Write-Host "-> Running PyInstaller..." -ForegroundColor Yellow
    & $Uv run pyinstaller google-ai-mcp-backend.spec --clean --noconfirm
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed (exit $LASTEXITCODE)" }

    $triple = "x86_64-pc-windows-msvc"
    $src = "$Root\dist\google-ai-mcp-backend.exe"
    $dstDir = "$Root\native\binaries"
    $dst = "$dstDir\google-ai-mcp-backend-$triple.exe"

    if (-not (Test-Path $src)) { throw "Build output not found: $src" }

    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    Copy-Item $src $dst -Force

    $sizeMB = [math]::Round((Get-Item $dst).Length / 1MB, 1)
    Write-Host "=== Sidecar ready ===" -ForegroundColor Green
    Write-Host "  $dst ($sizeMB MB)" -ForegroundColor Cyan
} finally {
    Pop-Location
}
