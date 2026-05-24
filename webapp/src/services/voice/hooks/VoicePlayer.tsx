import { Pause, PlayArrow, Stop, VolumeUp } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type React from "react";
import { useEffect, useState } from "react";
import useVoice from "./useVoice";

interface VoicePlayerProps {
  apiKey?: string;
  text?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onError?: (error: Error) => void;
  style?: React.CSSProperties;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  apiKey,
  text = "",
  autoPlay = false,
  showControls = true,
  onError,
  style,
}) => {
  const [inputText, setInputText] = useState(text);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  const {
    isInitialized,
    isPlaying,
    isSynthesizing,
    currentTime,
    duration,
    volume,
    availableVoices,
    error,
    speak,
    pause,
    stop,
    setVoice,
    setVolume,
  } = useVoice(apiKey, {
    onError: (error) => {
      console.error("VoicePlayer error:", error);
      onError?.(error);
    },
  });

  // Handle auto-play when text changes
  useEffect(() => {
    if (
      autoPlay &&
      inputText &&
      isInitialized &&
      !isPlaying &&
      !isSynthesizing
    ) {
      speak(inputText, selectedVoice || undefined);
    }
  }, [
    autoPlay,
    inputText,
    isInitialized,
    isPlaying,
    isSynthesizing,
    speak,
    selectedVoice,
  ]);

  // Update selected voice when voices are loaded
  useEffect(() => {
    if (availableVoices.length > 0 && !selectedVoice) {
      const defaultVoice =
        availableVoices.find((v) => v.isActive) || availableVoices[0];
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.id);
      }
    }
  }, [availableVoices, selectedVoice]);

  const handleVoiceChange = (event: SelectChangeEvent) => {
    const voiceId = event.target.value as string;
    setSelectedVoice(voiceId);
    setVoice(voiceId);
  };

  const handleVolumeChange = (_: Event, value: number | number[]) => {
    setVolume(Array.isArray(value) ? value[0] : value);
  };

  const handleSpeak = () => {
    if (inputText) {
      speak(inputText, selectedVoice || undefined);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <Paper elevation={2} style={{ padding: "16px", ...style }}>
        <Typography color="error">Error: {error.message}</Typography>
      </Paper>
    );
  }

  if (!isInitialized) {
    return (
      <Paper
        elevation={2}
        style={{ padding: "16px", textAlign: "center", ...style }}
      >
        <CircularProgress size={24} />
        <Typography variant="body2" style={{ marginTop: "8px" }}>
          Initializing voice service...
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} style={{ padding: "16px", ...style }}>
      {showControls && (
        <>
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="subtitle1" style={{ minWidth: "80px" }}>
              Voice:
            </Typography>
            <Select<string>
              value={selectedVoice || ""}
              onChange={handleVoiceChange}
              size="small"
              fullWidth
              disabled={isSynthesizing || isPlaying}
            >
              {availableVoices.map((voice) => (
                <MenuItem key={voice.id} value={voice.id}>
                  {voice.name}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <VolumeUp color="action" style={{ marginRight: "8px" }} />
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              min={0}
              max={1}
              step={0.01}
              style={{ width: "100%" }}
              disabled={isSynthesizing}
            />
          </Box>
        </>
      )}

      <Box display="flex" alignItems="center" mb={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={isPlaying ? pause : handleSpeak}
          disabled={isSynthesizing || !inputText}
          startIcon={isPlaying ? <Pause /> : <PlayArrow />}
          style={{ marginRight: "8px" }}
        >
          {isSynthesizing ? "Synthesizing..." : isPlaying ? "Pause" : "Speak"}
        </Button>

        <Button
          variant="outlined"
          onClick={stop}
          disabled={!isPlaying && !isSynthesizing}
          startIcon={<Stop />}
        >
          Stop
        </Button>

        {(isPlaying || isSynthesizing) && (
          <Typography
            variant="body2"
            color="textSecondary"
            style={{ marginLeft: "16px" }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        )}
      </Box>

      {!text && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Enter text to speak:
          </Typography>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontFamily: "inherit",
              fontSize: "14px",
              resize: "vertical",
            }}
            placeholder="Type something to speak..."
          />
        </Box>
      )}
    </Paper>
  );
};

export default VoicePlayer;
