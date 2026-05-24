"""Resolved filesystem paths for the FastAPI server (cwd-independent)."""

from __future__ import annotations

import os
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent

LOG_DIR = Path(os.getenv("GEMINI_TOOLS_LOG_DIR", PROJECT_ROOT / "logs"))
ARTIFACT_ROOT = Path(os.getenv("GEMINI_TOOLS_ARTIFACT_ROOT", PROJECT_ROOT / "uploads"))
UPLOAD_DIR = ARTIFACT_ROOT

SETTINGS_JSON = SERVER_DIR / "settings.json"
DOTENV_PATH = SERVER_DIR / ".env"


def ensure_data_dirs() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
