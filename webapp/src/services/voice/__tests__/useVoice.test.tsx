import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";

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

import { VoiceService } from "..";
import { useVoice } from "../hooks/useVoice";

function createServiceMock() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  const voice1 = {
    id: "voice-1",
    name: "Voice 1",
    category: "default" as const,
  };
  const voice2 = {
    id: "voice-2",
    name: "Voice 2",
    category: "premium" as const,
  };
  const mockVoices = new Map([
    ["voice-1", voice1],
    ["voice-2", voice2],
  ]);

  const playSpy = jest.fn().mockResolvedValue(undefined);
  const pauseSpy = jest.fn();
  const stopSpy = jest.fn();

  const audioResponse = {
    audio: new ArrayBuffer(0),
    text: "",
    voiceId: "",
    timestamp: Date.now(),
    duration: 10,
    play: playSpy,
    pause: pauseSpy,
    stop: stopSpy,
  };

  const emit = (event: string, ...args: unknown[]) => {
    for (const fn of listeners[event] ?? []) {
      fn(...args);
    }
  };

  const service = {
    on: jest.fn((event: string, fn: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    }),
    off: jest.fn(),
    cleanup: jest.fn(),
    initialize: jest.fn().mockImplementation(async () => {
      emit("voices_loaded", mockVoices);
      emit("initialized");
    }),
    loadVoices: jest.fn().mockImplementation(async () => {
      emit("voices_loaded", mockVoices);
    }),
    getVoiceStylesSnapshot: jest.fn(() => Array.from(mockVoices.values())),
    getCurrentVoiceStyleSnapshot: jest.fn(() => voice1),
    getVoiceStyle: jest.fn((id: string) => mockVoices.get(id)),
    textToSpeech: jest.fn().mockResolvedValue(audioResponse),
    emit: jest.fn(emit),
  };

  return {
    service: service as unknown as VoiceService,
    playSpy,
    pauseSpy,
    stopSpy,
    audioResponse,
  };
}

describe("useVoice", () => {
  const apiKey = "test-api-key";
  let getInstanceSpy: jest.SpiedFunction<typeof VoiceService.getInstance>;
  let mockReturn: ReturnType<typeof createServiceMock>;

  beforeEach(() => {
    mockReturn = createServiceMock();
    getInstanceSpy = jest
      .spyOn(VoiceService, "getInstance")
      .mockReturnValue(mockReturn.service);
  });

  afterEach(() => {
    getInstanceSpy.mockRestore();
  });

  it("should initialize with default values when autoInitialize is off", () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: false }),
    );

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isSynthesizing).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.volume).toBe(1);
    expect(result.current.availableVoices).toEqual([]);
    expect(result.current.currentVoice).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should initialize the voice service", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.availableVoices).toHaveLength(2);
    expect(result.current.currentVoice).toEqual(
      expect.objectContaining({ id: "voice-1" }),
    );
  });

  it("should handle speak functionality", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.speak("Hello, world!");
    });

    const svc = mockReturn.service as unknown as {
      textToSpeech: jest.Mock;
    };
    expect(svc.textToSpeech).toHaveBeenCalledWith("Hello, world!", undefined);
    expect(mockReturn.playSpy).toHaveBeenCalled();
  });

  it("should handle play, pause, and stop on current audio", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.speak("Hi");
    });

    mockReturn.playSpy.mockClear();

    await act(async () => {
      await result.current.play();
      result.current.pause();
      result.current.stop();
    });

    expect(mockReturn.playSpy).toHaveBeenCalled();
    expect(mockReturn.pauseSpy).toHaveBeenCalled();
    expect(mockReturn.stopSpy).toHaveBeenCalled();
  });

  it("should change voice via getVoiceStyle and emit", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => {
      result.current.setVoice("voice-2");
    });

    const svc = mockReturn.service as unknown as {
      getVoiceStyle: jest.Mock;
      emit: jest.Mock;
    };
    expect(svc.getVoiceStyle).toHaveBeenCalledWith("voice-2");
    expect(svc.emit).toHaveBeenCalled();
  });

  it("should update volume in hook state", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });

  it("should handle errors from initialize", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const failing = createServiceMock();
    failing.service.initialize = jest
      .fn()
      .mockRejectedValue(new Error("Initialization failed"));
    getInstanceSpy.mockRestore();
    getInstanceSpy = jest
      .spyOn(VoiceService, "getInstance")
      .mockReturnValue(failing.service);

    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() =>
      expect(result.current.error?.message).toBe("Initialization failed"),
    );
    errSpy.mockRestore();
  });

  it("should clean up on unmount", async () => {
    const { unmount } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() =>
      expect(mockReturn.service.initialize).toHaveBeenCalled(),
    );

    const svc = mockReturn.service as unknown as {
      cleanup: jest.Mock;
      initialize: jest.Mock;
    };
    unmount();

    expect(svc.cleanup).toHaveBeenCalled();
  });

  it("should reflect playback_start and playback_end from service", async () => {
    const { result } = renderHook(() =>
      useVoice(apiKey, { autoInitialize: true }),
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    const svc = mockReturn.service as unknown as { emit: (e: string) => void };

    act(() => {
      svc.emit("playback_start");
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      svc.emit("playback_end");
    });
    expect(result.current.isPlaying).toBe(false);
  });
});
