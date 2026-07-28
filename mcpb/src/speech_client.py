"""
Gemini speech: native TTS (generateContent + AUDIO) and helpers for Live API.

TTS uses dedicated preview models (e.g. gemini-3.1-flash-tts-preview) per
https://ai.google.dev/gemini-api/docs/speech-generation
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
import wave
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Gemini 3.1 line TTS (preview). "Pro-grade" TTS remains gemini-2.5-pro-preview-tts per Google model list.
DEFAULT_TTS_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_TTS_VOICE = "Kore"

DEFAULT_LIVE_MODEL = "gemini-live-2.5-flash-preview"

TTS_MODELS: dict[str, str] = {
    DEFAULT_TTS_MODEL: "Gemini 3.1 Flash TTS (preview, recommended)",
    "gemini-2.5-pro-preview-tts": "Gemini 2.5 Pro TTS (preview, higher quality)",
    "gemini-2.5-flash-preview-tts": "Gemini 2.5 Flash TTS (preview)",
}

LIVE_MODELS: dict[str, str] = {
    DEFAULT_LIVE_MODEL: "Gemini Live 2.5 Flash (preview, text + audio capable)",
    "gemini-2.0-flash-live-preview-04-09": "Gemini 2.0 Flash Live (preview)",
}

TTS_VOICES = [
    "Kore",
    "Puck",
    "Charon",
    "Fenrir",
    "Zephyr",
    "Aoede",
    "Leda",
    "Orus",
]


def live_server_message_to_json(msg: Any) -> dict[str, Any]:
    """Best-effort JSON-serialize Live server messages for WebSocket clients."""
    out: dict[str, Any] = {"type": "live_message"}
    try:
        dumped = msg.model_dump(mode="json", exclude_none=True)
        out["payload"] = dumped
    except Exception:
        out["payload"] = {"repr": repr(msg)}
    text = getattr(msg, "text", None)
    if text is not None:
        out["text"] = text
    return out


def _extract_audio_pcm(response: Any) -> tuple[bytes | None, str | None]:
    """Pull raw PCM bytes from generate_content TTS response."""
    parts: list[Any] = []
    if hasattr(response, "parts") and response.parts:
        parts.extend(response.parts)
    for c in getattr(response, "candidates", None) or []:
        content = getattr(c, "content", None)
        if content and getattr(content, "parts", None):
            parts.extend(content.parts)
    for part in parts:
        inline = getattr(part, "inline_data", None)
        if not inline:
            continue
        raw = getattr(inline, "data", None)
        mime = getattr(inline, "mime_type", None) or "audio/L16"
        if raw is None:
            continue
        if isinstance(raw, str):
            return base64.b64decode(raw), mime
        return bytes(raw), mime
    return None, None


def pcm16_mono_to_wav(pcm: bytes, sample_rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm)
    return buf.getvalue()


class SpeechClient:
    """TTS via google-genai (Gemini native audio generation models)."""

    def __init__(self, api_key: str | None = None):
        self.api_key = (api_key or os.getenv("GOOGLE_API_KEY") or "").strip()
        self.mock_mode = not bool(self.api_key)
        self.reason = "live" if self.api_key else "not_configured"
        self.last_error: str | None = None
        self._client: genai.Client | None = None
        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as exc:
                self.mock_mode = True
                self.reason = "invalid_credentials"
                self.last_error = str(exc)
                logger.error("SpeechClient init failed: %s", exc)

    def get_status(self) -> dict[str, Any]:
        return {
            "mock_mode": self.mock_mode,
            "reason": self.reason,
            "last_error": self.last_error,
            "tts_models": TTS_MODELS,
            "live_models": LIVE_MODELS,
            "voices": TTS_VOICES,
        }

    async def text_to_speech(
        self,
        text: str,
        model: str = DEFAULT_TTS_MODEL,
        voice_name: str = DEFAULT_TTS_VOICE,
        sample_rate: int = 24000,
    ) -> dict[str, Any]:
        if not text.strip():
            return {"success": False, "error": "Text is empty"}
        if self.mock_mode or not self._client:
            wav = pcm16_mono_to_wav(b"\x00\x00" * int(sample_rate * 0.25), sample_rate)
            return {
                "success": True,
                "mock": True,
                "mime": "audio/wav",
                "audio_base64": base64.b64encode(wav).decode("ascii"),
                "model": model,
                "voice_name": voice_name,
                "note": "Mock WAV placeholder — set GOOGLE_API_KEY for real Gemini TTS.",
            }

        def _call():
            return self._client.models.generate_content(
                model=model,
                contents=text.strip(),
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name=voice_name,
                            )
                        )
                    ),
                ),
            )

        try:
            response = await asyncio.to_thread(_call)
            pcm, _mime = _extract_audio_pcm(response)
            if not pcm:
                return {
                    "success": False,
                    "error": "No audio in response. Check model id and billing.",
                }
            wav = pcm16_mono_to_wav(pcm, sample_rate)
            return {
                "success": True,
                "mime": "audio/wav",
                "audio_base64": base64.b64encode(wav).decode("ascii"),
                "model": model,
                "voice_name": voice_name,
                "sample_rate": sample_rate,
            }
        except Exception as exc:
            logger.exception("TTS failed")
            return {"success": False, "error": str(exc)}


def create_speech_client(api_key: str | None = None) -> SpeechClient:
    return SpeechClient(api_key=api_key)
