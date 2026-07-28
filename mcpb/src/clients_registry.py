"""Cached Google AI clients and credential resolution (env + optional settings file)."""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache

from google_ai_mcp.chat_client import ChatClient, create_chat_client
from google_ai_mcp.embeddings_client import EmbeddingsClient, create_embeddings_client
from google_ai_mcp.imagen_client import ImagenClient, create_imagen_client
from google_ai_mcp.lyria_client import LyriaClient, create_lyria_client
from google_ai_mcp.omni_client import OmniClient, create_omni_client
from google_ai_mcp.paths import SETTINGS_JSON
from google_ai_mcp.speech_client import SpeechClient, create_speech_client
from google_ai_mcp.veo_client import VeoClient, create_veo_client

logger = logging.getLogger("gemini_tools")


def load_settings_api_key() -> str:
    """Load API key from server settings.json (if present)."""
    try:
        if SETTINGS_JSON.exists():
            with open(SETTINGS_JSON, encoding="utf-8") as f:
                settings = json.load(f)
                return str(settings.get("apiKey", "") or "")
        return ""
    except Exception as e:
        logger.error("Failed to load settings: %s", e)
        return ""


def load_settings_project_id() -> str:
    """Load project ID from server settings.json (if present)."""
    try:
        if SETTINGS_JSON.exists():
            with open(SETTINGS_JSON, encoding="utf-8") as f:
                settings = json.load(f)
                return str(settings.get("projectId", "") or "")
        return ""
    except Exception as e:
        logger.error("Failed to load project ID from settings: %s", e)
        return ""


def resolve_api_key() -> str:
    """Effective API key: persisted settings override env (matches previous main.py behavior)."""
    settings_key = load_settings_api_key().strip()
    env_key = os.getenv("GOOGLE_API_KEY", "").strip()
    return settings_key or env_key


def resolve_project_id() -> str:
    settings_project = load_settings_project_id().strip()
    env_project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    return settings_project or env_project


@lru_cache(maxsize=1)
def _chat_client_cache(api_key: str) -> ChatClient:
    return create_chat_client(api_key or None)


@lru_cache(maxsize=1)
def _veo_client_cache(api_key: str, project_id: str) -> VeoClient:
    return create_veo_client(api_key or None, project_id or None)


@lru_cache(maxsize=1)
def _imagen_client_cache(api_key: str, project_id: str) -> ImagenClient:
    return create_imagen_client(api_key or None, project_id or None)


@lru_cache(maxsize=1)
def _lyria_client_cache(api_key: str, project_id: str) -> LyriaClient:
    return create_lyria_client(api_key or None, project_id or None)


@lru_cache(maxsize=1)
def _embeddings_client_cache(api_key: str) -> EmbeddingsClient:
    return create_embeddings_client(api_key or None)


@lru_cache(maxsize=1)
def _speech_client_cache(api_key: str) -> SpeechClient:
    return create_speech_client(api_key or None)


@lru_cache(maxsize=1)
def _omni_client_cache(api_key: str, project_id: str) -> OmniClient:
    return create_omni_client(api_key or None, project_id or None)


def get_chat_client() -> ChatClient:
    return _chat_client_cache(resolve_api_key())


def get_embeddings_client() -> EmbeddingsClient:
    return _embeddings_client_cache(resolve_api_key())


def get_veo_client() -> VeoClient:
    return _veo_client_cache(resolve_api_key(), resolve_project_id())


def get_imagen_client() -> ImagenClient:
    return _imagen_client_cache(resolve_api_key(), resolve_project_id())


def get_lyria_client() -> LyriaClient:
    return _lyria_client_cache(resolve_api_key(), resolve_project_id())


def get_speech_client() -> SpeechClient:
    return _speech_client_cache(resolve_api_key())


def get_omni_client() -> OmniClient:
    return _omni_client_cache(resolve_api_key(), resolve_project_id())


def refresh_cached_clients() -> None:
    _chat_client_cache.cache_clear()
    _veo_client_cache.cache_clear()
    _imagen_client_cache.cache_clear()
    _lyria_client_cache.cache_clear()
    _embeddings_client_cache.cache_clear()
    _speech_client_cache.cache_clear()
    _omni_client_cache.cache_clear()
