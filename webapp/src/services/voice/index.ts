// Core exports
export { VoiceService, voiceService } from "./VoiceService";

// Type exports
export type {
  VoiceCategory,
  VoiceEra,
  VoiceSettings,
  VoiceStyle,
  AudioResponse,
} from "./types";

// Utility exports
export { AudioPlayer, createAudioUrl, formatDuration } from "./utils/audio";
export { validateVoiceSettings, validateVoiceStyle } from "./utils/validation";

// Hooks and Components
export { default as useVoice } from "./hooks/useVoice";
export { default as VoicePlayer } from "./hooks/VoicePlayer";

// Constants
export {
  DEFAULT_MODEL_ID,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_SAMPLE_RATES,
} from "./constants/defaults";

export { VoiceServiceEvent } from "./types";
