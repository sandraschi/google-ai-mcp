/**
 * Voice Service Configuration
 *
 * This file contains configuration options for the VoiceService.
 * You can customize the behavior of the voice service by modifying these values.
 */

import type { VoiceCloningOptions } from "./types";

/**
 * Default configuration for the VoiceService
 */
export const defaultConfig: VoiceCloningOptions = {
  // Base URL for the ElevenLabs API
  baseUrl: "https://api.elevenlabs.io/v1",

  // Default model ID for text-to-speech
  modelId: "eleven_monolingual_v1",

  // API request timeout in milliseconds
  timeout: 30000, // 30 seconds

  // Default voice settings
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
  },
};

/**
 * Additional service configuration
 */
export const serviceConfig = {
  // Default voice ID to use if none is specified
  defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice: Rachel

  // Audio settings
  audio: {
    sampleRate: 24000, // 24kHz sample rate
    format: "mp3", // 'mp3' | 'wav' | 'pcm' | 'ogg_vorbis' | 'aac' | 'flac'
    bitrate: "128k", // Bitrate for compressed formats
  },

  // Caching settings
  cache: {
    enabled: true, // Enable/disable response caching
    ttl: 3600000, // Cache TTL in milliseconds (1 hour)
    maxSize: 50, // Maximum number of items to cache
  },

  // Logging settings
  logging: {
    enabled: true, // Enable/disable logging
    level: "warn", // 'error' | 'warn' | 'info' | 'debug'
  },

  // UI settings
  ui: {
    showDebugInfo: false, // Show debug information in the UI
    defaultVolume: 0.8, // Default volume level (0 to 1)
  },
};

/**
 * Available voice styles
 * These can be used with the setVoiceStyle method
 */
export const voiceStyles = [
  { id: "default", name: "Default", description: "Neutral speaking style" },
  {
    id: "narrator",
    name: "Narrator",
    description: "Professional narration style",
  },
  { id: "cheerful", name: "Cheerful", description: "Happy and enthusiastic" },
  { id: "sad", name: "Sad", description: "Somber and melancholic" },
  { id: "angry", name: "Angry", description: "Frustrated or annoyed" },
  { id: "fearful", name: "Fearful", description: "Scared or anxious" },
  { id: "disgust", name: "Disgusted", description: "Displeased or repulsed" },
  { id: "surprised", name: "Surprised", description: "Amazed or excited" },
];

/**
 * Available voice categories
 * Used for organizing voices in the UI
 */
export const voiceCategories = [
  { id: "premade", name: "Premade Voices" },
  { id: "cloned", name: "Cloned Voices" },
  { id: "custom", name: "Custom Voices" },
];

/**
 * Available voice eras
 * Used for filtering voices by time period
 */
export const voiceEras = [
  { id: "contemporary", name: "Contemporary", description: "Modern voices" },
  { id: "mid-20th", name: "Mid 20th Century", description: "1950s-1970s" },
  { id: "early-20th", name: "Early 20th Century", description: "1900s-1940s" },
  { id: "victorian", name: "Victorian Era", description: "1837-1901" },
  { id: "renaissance", name: "Renaissance", description: "14th-17th century" },
  { id: "medieval", name: "Medieval", description: "5th-15th century" },
  { id: "ancient", name: "Ancient", description: "Before 5th century" },
];

/**
 * Default voices provided by ElevenLabs
 * These are available to all users
 */
export const defaultVoices = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "premade",
    description: "Professional female voice",
    previewText: "Hello, my name is Rachel. How can I help you today?",
    tags: ["female", "professional", "clear"],
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    category: "premade",
    description: "Warm female voice",
    previewText: "Hi there, I'm Domi. Nice to meet you!",
    tags: ["female", "warm", "friendly"],
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
    },
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    category: "premade",
    description: "Soft-spoken female voice",
    previewText: "Hello, my name is Bella. How are you doing today?",
    tags: ["female", "soft", "gentle"],
    settings: {
      stability: 0.7,
      similarity_boost: 0.7,
    },
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    category: "premade",
    description: "Deep male voice",
    previewText: "Hey there, I'm Antoni. What can I do for you?",
    tags: ["male", "deep", "authoritative"],
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    category: "premade",
    description: "Young female voice",
    previewText: "Hi! I'm Elli. So excited to talk to you!",
    tags: ["female", "young", "energetic"],
    settings: {
      stability: 0.4,
      similarity_boost: 0.8,
    },
  },
];

// Export types
export * from "./types";
