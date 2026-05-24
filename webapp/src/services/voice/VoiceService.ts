import { EventEmitter } from "node:events";
import type {
  AudioResponse,
  VoiceCategory,
  VoiceSettings,
  VoiceStyle,
} from "./types";

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

// Voice API Client Interface
export interface IVoiceApiClient {
  getVoices(): Promise<VoiceStyle[]>;

  textToSpeech(
    text: string,
    voiceId: string,
    options?: {
      modelId?: string;
      voiceSettings?: Partial<VoiceSettings>;
    },
  ): Promise<ArrayBuffer>;
}

// Mock API client implementation
class MockVoiceApiClient implements IVoiceApiClient {
  constructor(
    public apiKey: string,
    public baseUrl: string,
    public timeout = 30000,
  ) {}

  async getVoices() {
    return [];
  }

  async textToSpeech(_text: string, _voiceId: string) {
    return new ArrayBuffer(0);
  }
}

import { DEFAULT_VOICE_SETTINGS } from "./constants/defaults";
import { AudioPlayer, createAudioUrl } from "./utils/audio";

const DEFAULT_MODEL_ID = "eleven_monolingual_v1";
const DEFAULT_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Add speech recognition types at the top
type VoiceRecognitionEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
  resultIndex: number;
};

type VoiceRecognitionError = Event & {
  error: string;
  message: string;
};

type VoiceRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: VoiceRecognitionEvent) => void;
  onerror: (event: VoiceRecognitionError) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => VoiceRecognition;
    webkitSpeechRecognition: new () => VoiceRecognition;
  }
}

type VoiceRecognitionHandler = {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
};

// Extend the EventEmitter interface to include our custom events
export interface IVoiceService extends EventEmitter {
  on(event: "initialized", listener: () => void): this;
  on(
    event: "voices_loaded",
    listener: (voices: Map<string, VoiceStyle>) => void,
  ): this;
  on(event: "voice_added", listener: (voice: VoiceStyle) => void): this;
  on(event: "voice_removed", listener: (voiceId: string) => void): this;
  on(event: "voice_changed", listener: (voice: VoiceStyle) => void): this;
  on(event: "playback_start", listener: () => void): this;
  on(event: "playback_end", listener: () => void): this;
  on(event: "playback_pause", listener: () => void): this;
  on(event: "playback_resume", listener: () => void): this;
  on(event: "playback_stop", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(
    event: "transcript",
    listener: (transcript: string, isFinal: boolean) => void,
  ): this;
  on(event: "start", listener: () => void): this;
  on(event: "stop", listener: () => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export class VoiceService extends EventEmitter implements IVoiceService {
  private static _instance: VoiceService | null = null;
  private _apiClient: IVoiceApiClient;
  private _audioPlayer: AudioPlayer & {
    load?: (audioData: ArrayBuffer) => Promise<void>;
    play: () => Promise<void>;
    stop: () => void;
    pause?: () => void;
  };
  private _audioCache: Map<string, AudioResponse>;
  private _cacheTTL: number;
  private _voiceStyles: Map<string, VoiceStyle>;
  private _currentVoiceStyle: VoiceStyle | null = null;
  private _isInitialized = false;
  private _isSpeaking = false;
  private _isPaused = false;
  private _apiKey: string | null = null;
  private _baseUrl: string;
  private _timeout: number;

  // Speech recognition properties
  private _recognition: VoiceRecognition | null = null;
  private _isListening = false;
  private _finalTranscript = "";
  private _recognitionHandlers: VoiceRecognitionHandler = {
    onResult: () => {},
    onError: () => {},
    onEnd: () => {},
  };

  // Private constructor to enforce singleton pattern
  private constructor() {
    super();
    this._audioPlayer = new AudioPlayer() as AudioPlayer & {
      load: (audioData: ArrayBuffer) => Promise<void>;
      play: () => Promise<void>;
      stop: () => void;
      pause: () => void;
    };
    this._audioCache = new Map();
    this._cacheTTL = DEFAULT_CACHE_TTL; // 1 hour
    this._voiceStyles = new Map();
    this._baseUrl = "https://api.elevenlabs.io/v1";
    this._timeout = DEFAULT_TIMEOUT;
    this._apiClient = new MockVoiceApiClient("", this._baseUrl, this._timeout);

    // Initialize speech recognition
    this._initializeSpeechRecognition();
  }

  public static getInstance(): VoiceService {
    if (!VoiceService._instance) {
      VoiceService._instance = new VoiceService();
    }
    return VoiceService._instance;
  }

  /**
   * Initialize the voice service
   */
  public async initialize(
    apiKey?: string,
    options: VoiceServiceOptions = {},
  ): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    this._apiKey = apiKey || null;
    this._baseUrl = options.baseUrl || "https://api.elevenlabs.io/v1";
    this._timeout = options.timeout || DEFAULT_TIMEOUT;
    this._cacheTTL = options.cacheTTL || DEFAULT_CACHE_TTL; // 1 hour

    this._apiClient = this._apiKey
      ? new MockVoiceApiClient(this._apiKey, this._baseUrl, this._timeout)
      : new MockVoiceApiClient("", this._baseUrl, this._timeout);

    try {
      await this.loadVoices();
      this._isInitialized = true;
      this.emit("initialized");
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  /**
   * Load available voices
   */
  public async loadVoices(): Promise<void> {
    try {
      const voices = await this._apiClient.getVoices();
      this._voiceStyles.clear();

      for (const voice of voices) {
        this._voiceStyles.set(voice.id, voice);
      }

      this.emit("voices_loaded", this._voiceStyles);
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  private _processVoiceLabels(labels: string | undefined): Partial<VoiceStyle> {
    if (!labels) return {};

    const result: Partial<VoiceStyle> = {};
    const labelMap = new Map(
      labels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.split(":") as [string, string]),
    );

    const category = labelMap.get("category");
    if (category) {
      result.category = category as VoiceCategory;
    }

    if (labelMap.get("cloned") === "true") {
      result.isCustom = true;
    }

    return result;
  }

  /**
   * List all available voices
   */
  public async listVoices(): Promise<VoiceStyle[]> {
    if (!this._isInitialized) {
      await this.initialize();
    }

    // If we already have voices loaded, return them
    if (this._voiceStyles.size > 0) {
      return Array.from(this._voiceStyles.values());
    }

    // Otherwise load them from the API
    await this.loadVoices();
    return Array.from(this._voiceStyles.values());
  }

  /** Snapshot for hooks on init without exposing the internal voice map. */
  public getVoiceStylesSnapshot(): VoiceStyle[] {
    return Array.from(this._voiceStyles.values());
  }

  public getCurrentVoiceStyleSnapshot(): VoiceStyle | null {
    return this._currentVoiceStyle;
  }

  public async textToSpeech(
    text: string,
    voiceId: string = this._currentVoiceStyle?.id || "default",
    options: {
      modelId?: string;
      voiceSettings?: Partial<VoiceSettings>;
    } = {},
  ): Promise<AudioResponse> {
    if (!this._isInitialized) {
      throw new Error("VoiceService not initialized");
    }

    const cacheKey = this._generateCacheKey(text, { voiceId, ...options });
    const cached = this._audioCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const audioData = await this._apiClient.textToSpeech(
        text,
        voiceId,
        options,
      );

      // Create audio URL for playback
      const audioUrl = createAudioUrl(audioData);

      const audioResponse: AudioResponse = {
        audio: audioData,
        text,
        voiceId,
        timestamp: Date.now(),
        duration: 0, // Will be set after loading
        modelId: options.modelId || DEFAULT_MODEL_ID,
        settings: {
          ...DEFAULT_VOICE_SETTINGS,
          ...(options.voiceSettings || {}),
        },
        audioUrl,
        play: async () => {
          try {
            if (this._audioPlayer.load) {
              await this._audioPlayer.load(audioData);
              await this._audioPlayer.play();
            } else {
              console.warn("AudioPlayer.load() not implemented");
              await this._audioPlayer.play();
            }
            this.emit("playback_start");
          } catch (error) {
            this.emit("error", error as Error);
            throw error;
          }
        },
        stop: () => {
          this._audioPlayer.stop();
          this.emit("playback_stop");
        },
        pause: () => {
          try {
            if (this._audioPlayer.pause) {
              this._audioPlayer.pause();
              this.emit("playback_pause");
            } else {
              console.warn("AudioPlayer.pause() not implemented");
              this._audioPlayer.stop();
              this.emit("playback_stop");
            }
          } catch (error) {
            this.emit("error", error as Error);
            throw error;
          }
        },
      };

      // Cache the response
      this._audioCache.set(cacheKey, audioResponse);

      // Set up cache invalidation
      setTimeout(() => {
        this._audioCache.delete(cacheKey);
      }, this._cacheTTL);

      return audioResponse;
    } catch (error) {
      this.emit("error", error as Error);
      throw error;
    }
  }

  private _generateCacheKey(
    text: string,
    options: Record<string, unknown>,
  ): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .map((key) => `${key}:${String(options[key])}`)
      .join("|");

    return `${text}|${sortedOptions}`;
  }

  /**
   * Get a voice style by ID
   */
  public getVoiceStyle(voiceId: string): VoiceStyle | undefined {
    return this._voiceStyles.get(voiceId);
  }

  public async removeCustomVoice(voiceId: string): Promise<boolean> {
    const style = this._voiceStyles.get(voiceId);
    if (style?.isCustom) {
      // Don't allow removing the current voice
      if (this._currentVoiceStyle?.id === voiceId) {
        throw new Error("Cannot remove the currently selected voice");
      }

      this._voiceStyles.delete(voiceId);
      this.emit("voice_removed", voiceId);
      return true;
    }
    return false;
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this._audioPlayer?.stop?.();

    // Clear any pending timeouts
    this._audioCache.clear();

    // Reset state
    this._isInitialized = false;
    this._isSpeaking = false;
    this._isPaused = false;
    this._currentVoiceStyle = null;

    // Emit cleanup event
    this.emit("stop");
  }

  public destroy(): void {
    this._audioPlayer?.stop?.();

    this._audioCache.clear();
    this._voiceStyles.clear();
    this._currentVoiceStyle = null;
    this._isInitialized = false;
    this._isSpeaking = false;
    this._isPaused = false;

    this.removeAllListeners();
    VoiceService._instance = null;
    this.emit("destroyed");
  }

  public static isBrowserSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
      ("AudioContext" in window || "webkitAudioContext" in window)
    );
  }

  // Speech recognition methods
  public startListening(
    handlers: Partial<VoiceRecognitionHandler> = {},
  ): boolean {
    if (!this._checkSpeechRecognitionSupport() || !this._recognition) {
      console.error("Speech recognition is not supported");
      return false;
    }

    if (this._isListening) {
      console.warn("Already listening");
      return false;
    }

    // Update handlers
    this._recognitionHandlers = { ...this._recognitionHandlers, ...handlers };

    try {
      this._recognition.start();
      this._isListening = true;
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      this._recognitionHandlers.onError("Failed to start voice recognition");
      return false;
    }
  }

  public stopListening(): void {
    if (!this._isListening || !this._recognition) return;

    try {
      this._recognition.stop();
      this._isListening = false;
      this._finalTranscript = "";
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
  }

  public abort(): void {
    if (!this._recognition) return;

    try {
      this._recognition.abort();
      this._isListening = false;
      this._finalTranscript = "";
    } catch (error) {
      console.error("Error aborting speech recognition:", error);
    }
  }

  public isListeningNow(): boolean {
    return this._isListening;
  }

  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  private _checkSpeechRecognitionSupport(): boolean {
    return (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
  }

  private _initializeSpeechRecognition(): void {
    if (!this._checkSpeechRecognitionSupport()) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this._recognition = new SpeechRecognition();

    if (!this._recognition) {
      console.error("Speech recognition initialization failed");
      return;
    }

    this._recognition.continuous = true;
    this._recognition.interimResults = true;
    this._recognition.lang = "en-US";

    this._recognition.onresult = (event: VoiceRecognitionEvent) => {
      let interimTranscript = "";
      const results = event.results as unknown as SpeechRecognitionResultList;

      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          this._finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Send the combined final and interim results
      const combinedTranscript = this._finalTranscript + interimTranscript;
      this._recognitionHandlers.onResult(
        combinedTranscript.trim(),
        results[results.length - 1].isFinal,
      );

      // Reset the final transcript if we've processed all results
      if (results[results.length - 1].isFinal) {
        this._finalTranscript = "";
      }
    };

    this._recognition.onerror = (event: VoiceRecognitionError) => {
      console.error("Speech recognition error", event.error, event.message);
      this._recognitionHandlers.onError(
        event.error === "no-speech"
          ? "No speech detected"
          : "Error recognizing speech",
      );
      this.stopListening();
    };

    this._recognition.onend = () => {
      if (this._isListening) {
        // Restart recognition if it was stopped unexpectedly
        this._recognition?.start();
      } else {
        this._recognitionHandlers.onEnd();
      }
    };
  }
}

/**
 * Lazily forwards to {@link VoiceService.getInstance} so importing this module
 * does not eagerly construct the service before test mocks (e.g. AudioPlayer) are installed.
 */
export const voiceService = new Proxy({} as VoiceService, {
  get(_target, prop: string | symbol, receiver) {
    const inst = VoiceService.getInstance();
    const value = Reflect.get(inst as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(inst);
    }
    return value;
  },
});

// Re-export types for convenience
export * from "./types";
export * from "./constants/defaults";
