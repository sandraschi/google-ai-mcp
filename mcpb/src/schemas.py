"""Pydantic request/response models for HTTP API (extracted from main app)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class VideoGenerationRequest(BaseModel):
    prompt: str = Field(..., description="The prompt for video generation")
    style: str = Field("cinematic", description="Video style (e.g., cinematic, anime, etc.)")
    duration: int = Field(8, description="Duration of the video in seconds")
    resolution: str = Field("1920x1080", description="Video resolution (e.g., 1920x1080)")
    client_id: str | None = Field(None, description="Optional client ID for tracking")
    model: str = Field("veo-3.1-preview-002", description="Veo model to use")
    aspect_ratio: str = Field("16:9", description="Video aspect ratio")
    num_videos: int = Field(1, description="Number of videos to generate (1-4)")


class VideoGenerationStatus(BaseModel):
    generation_id: str
    status: str
    progress: float
    status_message: str
    output_path: str | None = None
    error: str | None = None
    created_at: str
    updated_at: str
    metadata: dict[str, Any] | None = None


class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="The prompt for image generation")
    model: str = Field("nano-banana-pro", description="Nano Banana Pro model to use")
    aspect_ratio: str = Field("1:1", description="Image aspect ratio")
    num_images: int = Field(1, description="Number of images to generate (1-4)")
    client_id: str | None = Field(None, description="Optional client ID for tracking")


class MusicGenerationRequest(BaseModel):
    prompt: str = Field(..., description="The prompt for music generation")
    model: str = Field("lyria-3-pro-preview", description="Lyria model (e.g. lyria-3-pro-preview, lyria-3-clip-preview)")
    num_tracks: int = Field(1, description="Number of tracks to generate (1-4)")
    client_id: str | None = Field(None, description="Optional client ID for tracking")


class EmbeddingRequest(BaseModel):
    text: str = Field(..., description="Text to embed")
    model: str = Field("gemini-embedding-001", description="Embedding model to use")
    task_type: str | None = Field(None, description="Task type (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, etc.)")


class BatchEmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., description="List of texts to embed")
    model: str = Field("gemini-embedding-001", description="Embedding model to use")
    task_type: str | None = Field(None, description="Task type (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, etc.)")


class TtsRequest(BaseModel):
    text: str = Field(..., description="Text to speak (style cues like 'Say cheerfully: …' work well)")
    model: str = Field(
        "gemini-3.1-flash-tts-preview",
        description="Gemini TTS model (3.1 Flash TTS preview or 2.5 Pro preview TTS)",
    )
    voice_name: str = Field("Kore", description="Prebuilt voice name (e.g. Kore, Puck, Charon)")
    sample_rate: int = Field(24000, description="PCM sample rate for WAV wrapper (default 24000)")


class ChatRequest(BaseModel):
    prompt: str = Field(..., description="The prompt for chat generation")
    model: str = Field("gemini-3.1-pro-preview", description="Chat model to use")
    persona: str | None = Field(None, description="Optional persona/system prompt")
    client_id: str | None = Field(None, description="Optional client ID for tracking")
    images: list[str] | None = Field(
        None,
        description="Optional images: server file paths, raw base64, or browser data URLs (data:image/...;base64,...)",
    )
    audio: str | None = Field(None, description="Audio file path or base64 encoded audio")
    tools: list[dict[str, Any]] | None = Field(None, description="Function/tool definitions for function calling")
    max_tokens: int = Field(2048, description="Maximum output tokens")
    temperature: float = Field(0.7, description="Sampling temperature (0-1)")


class SettingsRequest(BaseModel):
    apiKey: str = Field(..., description="Google AI Studio API Key")
    projectId: str = Field(..., description="Google Cloud Project ID")
    apiEndpoint: str = Field(
        "google-gen-ai-sdk",
        description="Use google-gen-ai-sdk for default Google Gen AI (google-genai); optional legacy REST base override",
    )
    chat: dict[str, Any] | None = None
    image: dict[str, Any] | None = None
    music: dict[str, Any] | None = None
    video: dict[str, Any] | None = None
    general: dict[str, Any] | None = None


class StoryRefinementRequest(BaseModel):
    story_prompt: str = Field(..., description="Simple story idea from user")
    style_reference: str | None = Field(None, description="Style reference (e.g., 'Casablanca', 'Pixar')")
    music_style: str | None = Field(None, description="Music style preference")
    genre: str | None = Field("adventure", description="Movie genre")


class RomanceNovelRequest(BaseModel):
    title: str = Field(..., description="Novel title")
    hero_type: str = Field(..., description="Type of hero (e.g., 'Alpha Duke', 'Brooding Billionaire')")
    heroine_type: str = Field(..., description="Type of heroine (e.g., 'Feisty Princess', 'Smart Scientist')")
    setting: str = Field(..., description="Story setting (e.g., 'Medieval Castle', 'Modern NYC')")
    conflict: str = Field(..., description="Main conflict (e.g., 'Enemies to Lovers', 'Forbidden Love')")
    writing_style: str = Field("modern", description="Writing style (modern, classic, gothic, etc.)")
    raunchiness: str = Field("steamy", description="Spice level (sweet, steamy, explicit)")
    language: str = Field("English", description="Language (English, Japanese, Latin, etc.)")
    era: str = Field("contemporary", description="Era (contemporary, medieval, victorian, etc.)")
    word_count: int = Field(80000, description="Target word count")
    include_cover: bool = Field(True, description="Generate cover art")
    client_id: str | None = Field(None, description="Optional client ID for tracking")


class RomanceNovelStatus(BaseModel):
    novel_id: str
    status: str
    progress: float
    title: str
    current_chapter: int
    total_chapters: int
    word_count: int
    cover_url: str | None = None
    novel_text: str | None = None
    error: str | None = None
    created_at: str
    updated_at: str


class SegmentPrompt(BaseModel):
    segment_number: int
    prompt: str
    starting_image: str | None = None
    approved: bool = False


class MovieGenerationRequest(BaseModel):
    story_overview: str
    segments: list[SegmentPrompt]
    user_id: str
    movie_title: str
    style_reference: str | None = None
    music_style: str | None = None


class SegmentStatus(BaseModel):
    segment_number: int
    status: str
    video_path: str | None = None
    error: str | None = None
    progress: float = 0.0


class MovieGenerationStatus(BaseModel):
    movie_id: str
    status: str
    current_segment: int
    total_segments: int
    segments: list[SegmentStatus]
    story_overview: str
    movie_title: str
    created_at: str
    updated_at: str
    final_path: str | None = None


# ── Web.py compatibility aliases ──────────────────────────────────────────────

VideoRequest = VideoGenerationRequest
ImageRequest = ImageGenerationRequest
MusicRequest = MusicGenerationRequest
EmbeddingsRequest = EmbeddingRequest
TTSRequest = TtsRequest
