# -*- mode: python ; coding: utf-8 -*-
# Tauri sidecar build — single-file executable
from PyInstaller.utils.hooks import copy_metadata

datas = [("src/google_ai_mcp", "google_ai_mcp")]
datas += copy_metadata("fastmcp")
datas += copy_metadata("fastapi")
datas += copy_metadata("uvicorn")
datas += copy_metadata("pydantic")
datas += copy_metadata("starlette")
datas += copy_metadata("google-genai")

a = Analysis(
    ["run_server.py"],
    pathex=["src"],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.httptools_impl",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "google.genai",
        "google_ai_mcp.web",
        "google_ai_mcp.compat_routes",
        "google_ai_mcp.omni_client",
        "google_ai_mcp.speech_client",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="google-ai-mcp-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
