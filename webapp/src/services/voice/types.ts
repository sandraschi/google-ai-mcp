// Voice Style represents a voice that can be used for text-to-speech
export interface VoiceStyle {
  id: string;
  name: string;
  description?: string;
  category?: VoiceCategory;
  era?: VoiceEra;
  gender?: "male" | "female" | "non-binary";
  age?: "child" | "teen" | "adult" | "elderly";
  accent?: string;
  tags?: string[];
  previewUrl?: string;
  isCustom?: boolean;
  isActive?: boolean;
  settings?: VoiceSettings;
}

// Voice Settings for fine-tuning speech output
export interface VoiceSettings {
  stability: number; // 0.0 to 1.0 - Controls voice stability
  similarity_boost: number; // 0.0 to 1.0 - Controls voice similarity
  style?: number; // 0.0 to 1.0 - Controls speaking style
  use_speaker_boost?: boolean; // Whether to use speaker boost
  temperature?: number; // 0.0 to 2.0 - Controls randomness in voice
  speed?: number; // 0.5 to 2.0 - Controls speaking rate
  pitch?: number; // -20 to 20 - Controls pitch adjustment
  volume?: number; // 0.0 to 1.0 - Controls output volume
}

// Voice Categories
export type VoiceCategory =
  | "general"
  | "narration"
  | "character"
  | "announcer"
  | "conversational"
  | string;

// Voice Eras
export type VoiceEra =
  | "contemporary"
  | "modern"
  | "vintage"
  | "historical"
  | "futuristic"
  | string;

// Audio Response from TTS service
export interface AudioResponse {
  audio: ArrayBuffer;
  text: string;
  voiceId: string;
  timestamp: number;
  duration: number;
  play: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  audioUrl?: string; // Optional URL for the audio
  modelId?: string; // Optional model ID used for generation
  settings?: VoiceSettings; // Optional voice settings used
}

// Voice Service Events
export enum VoiceServiceEvent {
  // Initialization
  INITIALIZED = "initialized",
  VOICES_LOADED = "voices_loaded",

  // Voice Management
  VOICE_ADDED = "voice_added",
  VOICE_REMOVED = "voice_removed",
  VOICE_CHANGED = "voice_changed",

  // Playback Events
  PLAYBACK_START = "playback_start",
  PLAYBACK_END = "playback_end",
  PLAYBACK_PAUSE = "playback_pause",
  PLAYBACK_RESUME = "playback_resume",
  PLAYBACK_STOP = "playback_stop",

  // Recognition Events
  RECOGNITION_START = "recognition_start",
  RECOGNITION_END = "recognition_end",
  TRANSCRIPT = "transcript",

  // Service Events
  ERROR = "error",
  START = "start",
  STOP = "stop",
  DESTROYED = "destroyed",
}

// Voice Service Options
export interface VoiceServiceOptions {
  baseUrl?: string;
  timeout?: number;
  cacheTTL?: number;
  defaultVoiceId?: string;
  autoPlay?: boolean;
  autoStop?: boolean;
  debug?: boolean;
}

// Re-export VoiceCloningOptions from the index file
export type { VoiceCloningOptions } from "./types/index";
