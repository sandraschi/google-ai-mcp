import { VoiceService } from "..";

jest.mock("../utils/audio", () => ({
  AudioPlayer: jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    stop: jest.fn(),
    setVolume: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    getDuration: jest.fn(() => 30),
    isAudioPlaying: jest.fn(() => false),
    load: jest.fn().mockResolvedValue(true),
  })),
  createAudioUrl: jest.fn().mockReturnValue("blob:mock-audio-url"),
  formatDuration: jest.fn().mockImplementation((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }),
}));

describe("VoiceService", () => {
  const apiKey = "test-api-key";

  afterEach(() => {
    try {
      VoiceService.getInstance().destroy();
    } catch {
      // ignore double-destroy
    }
  });

  it("returns the same singleton instance", () => {
    const a = VoiceService.getInstance();
    const b = VoiceService.getInstance();
    expect(a).toBe(b);
  });

  it("initializes and reports initialized", async () => {
    const vs = VoiceService.getInstance();
    await vs.initialize(apiKey);
    expect(vs.isInitialized).toBe(true);
  });

  it("listVoices returns an array after initialize", async () => {
    const vs = VoiceService.getInstance();
    await vs.initialize(apiKey);
    const voices = await vs.listVoices();
    expect(Array.isArray(voices)).toBe(true);
  });

  it("destroy clears singleton", async () => {
    const vs = VoiceService.getInstance();
    await vs.initialize(apiKey);
    vs.destroy();
    const next = VoiceService.getInstance();
    expect(next).not.toBe(vs);
  });
});
