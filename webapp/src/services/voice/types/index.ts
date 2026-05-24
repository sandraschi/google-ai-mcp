// Core voice types
export type VoiceCategory =
  | "dramatic"
  | "elegant"
  | "sultry"
  | "commanding"
  | "playful"
  | "character"
  | "soothing";
export type VoiceEra = "classic" | "modern" | "vintage" | "timeless";
export type VoiceEmotion =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "fearful"
  | "disgust"
  | "surprised";

// Voice settings with all possible properties
export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  speaker_boost?: boolean;
  pitch?: number;
  rate?: number;
  emphasis?: number;
  breathiness?: number;
  emotion?: VoiceEmotion;
  temperature?: number;
  whisper_style?: number;
  use_speaker_boost?: boolean;
  voice_style?: string;
  speed?: number;
  pause?: number;
  clarity?: number;
  [key: string]: unknown; // Allow additional properties
}

// Voice style definition
export interface VoiceStyle {
  id: string;
  name: string;
  description: string;
  category: VoiceCategory;
  era: VoiceEra;
  tags: string[];
  settings: VoiceSettings;
  isActive?: boolean;
  isCustom?: boolean;
  accent?: string;
  [key: string]: unknown; // Allow additional properties
}

// Audio response from TTS service
export interface AudioResponse {
  audio: ArrayBuffer;
  duration: number;
  sampleRate: number;
  format: string;
  voiceId: string;
  modelId: string;
  text: string;
  metadata: {
    voiceId: string;
    modelId: string;
    style: VoiceStyle;
    timestamp: number;
    [key: string]: unknown;
  };
}

// Voice cloning options
export interface VoiceCloningOptions {
  apiKey?: string;
  voiceId?: string;
  voiceStyle?: string | VoiceStyle;
  text?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
  outputFormat?: string;
  sampleRate?: number;
  pitch?: number;
  rate?: number;
  emphasis?: number;
  breathiness?: number;
  temperature?: number;
  voiceSettings?: VoiceSettings;
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  debug?: boolean;
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onComplete?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
}
