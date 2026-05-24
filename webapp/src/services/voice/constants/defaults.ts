import type { VoiceSettings } from "../types";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
  temperature: 0.7,
  speed: 1.0,
  pitch: 0.0,
  volume: 1.0,
};

export const DEFAULT_MODEL_ID = "eleven_monolingual_v1";
export const DEFAULT_BASE_URL = "https://api.elevenlabs.io/v1";
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

export const SUPPORTED_AUDIO_FORMATS = [
  "mp3",
  "pcm",
  "wav",
  "flac",
  "aac",
] as const;
export const SUPPORTED_SAMPLE_RATES = [
  8000, 16000, 22050, 24000, 44100, 48000,
] as const;
