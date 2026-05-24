import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioPlayer,
  type AudioResponse,
  VoiceService,
  type VoiceStyle,
} from "..";

type VoiceServiceState = {
  isInitialized: boolean;
  isPlaying: boolean;
  isSynthesizing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentVoice: VoiceStyle | null;
  availableVoices: VoiceStyle[];
  error: Error | null;
};

type UseVoiceOptions = {
  autoInitialize?: boolean;
  initialVolume?: number;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
};

export function useVoice(apiKey?: string, options: UseVoiceOptions = {}) {
  const {
    autoInitialize = true,
    initialVolume = 1.0,
    onPlayStart,
    onPlayEnd,
    onError,
  } = options;

  const [state, setState] = useState<VoiceServiceState>({
    isInitialized: false,
    isPlaying: false,
    isSynthesizing: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    currentVoice: null,
    availableVoices: [],
    error: null,
  });

  const animationFrameRef = useRef<number>();
  const voiceServiceRef = useRef<VoiceService>();
  const currentAudioRef = useRef<AudioResponse | null>(null);

  // Initialize voice service
  const initialize = useCallback(async () => {
    try {
      if (!apiKey) {
        throw new Error("API key is required to initialize voice service");
      }

      voiceServiceRef.current = VoiceService.getInstance();
      const service = voiceServiceRef.current;

      service.on("initialized", () => {
        setState((prev) => ({
          ...prev,
          isInitialized: true,
          availableVoices: service.getVoiceStylesSnapshot(),
          currentVoice: service.getCurrentVoiceStyleSnapshot(),
        }));
      });

      service.on("synthesizing", () => {
        setState((prev) => ({ ...prev, isSynthesizing: true }));
      });

      service.on("synthesized", () => {
        setState((prev) => ({ ...prev, isSynthesizing: false }));
      });

      service.on("voiceStyleChanged", (voiceStyle) => {
        setState((prev) => ({ ...prev, currentVoice: voiceStyle }));
      });

      service.on("voices_loaded", (voices) => {
        setState((prev) => ({
          ...prev,
          availableVoices: Array.from(voices.values()),
        }));
      });

      service.on("playback_start", () => {
        setState((prev) => ({ ...prev, isPlaying: true }));
        onPlayStart?.();
      });

      service.on("playback_end", () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        onPlayEnd?.();
      });

      service.on("playback_stop", () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
        onPlayEnd?.();
      });

      service.on("error", (error) => {
        console.error("VoiceService error:", error);
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
      });

      await service.initialize(apiKey);

      // Load voices from API
      await service.loadVoices().catch((error) => {
        console.warn("Failed to load voices from API:", error);
      });

      return true;
    } catch (error) {
      console.error("Failed to initialize voice service:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [apiKey, onError, onPlayStart, onPlayEnd]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && apiKey) {
      initialize();
    }

    return () => {
      // Clean up animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clean up voice service if needed
      voiceServiceRef.current?.cleanup();
    };
  }, [autoInitialize, apiKey, initialize]);

  // Update playback state
  useEffect(() => {
    if (!state.isInitialized) return;

    let lastTime = 0;
    let rafId: number;

    const updatePlaybackState = () => {
      const service = voiceServiceRef.current;
      if (!service) return;

      // Use type assertion to access private audioPlayer
      const audioPlayer = (service as any)._audioPlayer as
        | AudioPlayer
        | undefined;
      if (!audioPlayer) return;

      const currentTime = audioPlayer.getCurrentTime();
      const duration = audioPlayer.getDuration();
      const isPlaying = audioPlayer.isAudioPlaying();

      setState((prev) => ({
        ...prev,
        currentTime,
        duration,
        isPlaying,
      }));

      if (isPlaying) {
        rafId = requestAnimationFrame(updatePlaybackState);
      } else if (lastTime > 0 && lastTime >= duration - 0.1) {
        // Audio finished playing
        onPlayEnd?.();
      }

      lastTime = currentTime;
    };

    if (state.isPlaying) {
      rafId = requestAnimationFrame(updatePlaybackState);
      onPlayStart?.();
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [state.isInitialized, state.isPlaying, onPlayStart, onPlayEnd]);

  // Text-to-speech function
  const speak = useCallback(async (text: string, voiceId?: string) => {
    try {
      if (!voiceServiceRef.current) {
        throw new Error("Voice service not initialized");
      }

      if (voiceId) {
        // Set the voice style if provided
        const voiceStyle = voiceServiceRef.current.getVoiceStyle(voiceId);
        if (voiceStyle) {
          (voiceServiceRef.current as any)._currentVoiceStyle = voiceStyle;
          voiceServiceRef.current.emit("voiceStyleChanged", voiceStyle);
        }
      }

      const audioResponse = await voiceServiceRef.current.textToSpeech(
        text,
        voiceId,
      );
      currentAudioRef.current = audioResponse;

      // Play the audio
      await audioResponse.play();

      setState((prev) => ({
        ...prev,
        isPlaying: true,
      }));

      return audioResponse;
    } catch (error) {
      console.error("Error in speak:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      throw error;
    }
  }, []);

  // Play function
  const play = useCallback(async () => {
    if (currentAudioRef.current) {
      await currentAudioRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }
  }, []);

  // Pause function
  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Stop function
  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.stop();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  // Set voice function
  const setVoice = useCallback((voiceId: string) => {
    const service = voiceServiceRef.current;
    if (!service) return;

    const voiceStyle = service.getVoiceStyle(voiceId);
    if (voiceStyle) {
      (service as any)._currentVoiceStyle = voiceStyle;
      service.emit("voiceStyleChanged", voiceStyle);
      setState((prev) => ({ ...prev, currentVoice: voiceStyle }));
    }
  }, []);

  // Set volume function
  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume }));
    // Note: The new VoiceService doesn't have a setVolume method
    // Volume control would need to be implemented in the AudioPlayer
  }, []);

  return {
    ...state,
    speak,
    play,
    pause,
    stop,
    setVoice,
    setVolume,
  };
}

export default useVoice;
