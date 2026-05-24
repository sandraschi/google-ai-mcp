export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    if (typeof window !== "undefined" && !this.audioContext) {
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContext();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
      } catch (error) {
        console.error("Failed to initialize audio context:", error);
      }
    }
  }

  async loadAudio(audioData: ArrayBuffer): Promise<boolean> {
    if (!this.audioContext) {
      console.error("AudioContext not initialized");
      return false;
    }

    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(
        audioData.slice(0),
      );
      return true;
    } catch (error) {
      console.error("Error decoding audio data:", error);
      return false;
    }
  }

  play() {
    if (!this.audioContext || !this.audioBuffer) {
      console.error("Audio not loaded");
      return;
    }

    if (this.isPlaying) {
      this.pause();
      return;
    }

    const gainNode = this.gainNode;
    if (!gainNode) {
      console.error("Gain node not initialized");
      return;
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(gainNode);

    this.sourceNode.onended = () => {
      this.isPlaying = false;
      this.startTime = 0;
      this.pauseTime = 0;
    };

    this.sourceNode.start(0, this.pauseTime);
    this.startTime = this.audioContext.currentTime - this.pauseTime;
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying || !this.sourceNode || !this.audioContext) return;

    this.sourceNode.stop();
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;
  }

  stop() {
    if (!this.sourceNode) return;

    this.sourceNode.stop();
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.min(Math.max(volume, 0), 1);
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    return this.isPlaying
      ? this.audioContext.currentTime - this.startTime
      : this.pauseTime;
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  cleanup() {
    this.stop();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.audioBuffer = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.audioContext = null;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function createAudioUrl(
  audioData: ArrayBuffer,
  mimeType = "audio/mp3",
): string {
  const blob = new Blob([audioData], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function getAudioMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: "audio/mp3",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    webm: "audio/webm",
    m4a: "audio/mp4",
  };

  return mimeTypes[format.toLowerCase()] || "application/octet-stream";
}
