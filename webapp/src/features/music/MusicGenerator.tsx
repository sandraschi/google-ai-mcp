import {
  Download,
  MusicNote,
  PlayArrow,
  Refresh,
  Timer,
  Tune,
  VolumeUp,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";

interface MusicGenerationRequest {
  prompt: string;
  model: string;
  duration: number;
  genre: string;
  mood: string;
  tempo: string;
  instrument: string;
  num_tracks: number;
}

interface MusicGenerationStatus {
  generation_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  status_message: string;
  output_path?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

const MusicGenerator: React.FC = () => {
  const [request, setRequest] = useState<MusicGenerationRequest>({
    prompt: "",
    model: "lyria-3-pro-preview",
    duration: 30,
    genre: "electronic",
    mood: "energetic",
    tempo: "medium",
    instrument: "mixed",
    num_tracks: 1,
  });

  const [generationStatus, setGenerationStatus] =
    useState<MusicGenerationStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const genres = [
    { value: "electronic", label: "Electronic" },
    { value: "rock", label: "Rock" },
    { value: "jazz", label: "Jazz" },
    { value: "classical", label: "Classical" },
    { value: "pop", label: "Pop" },
    { value: "ambient", label: "Ambient" },
    { value: "hip-hop", label: "Hip-Hop" },
    { value: "country", label: "Country" },
    { value: "blues", label: "Blues" },
    { value: "folk", label: "Folk" },
  ];

  const moods = [
    { value: "energetic", label: "Energetic" },
    { value: "calm", label: "Calm" },
    { value: "melancholic", label: "Melancholic" },
    { value: "happy", label: "Happy" },
    { value: "dramatic", label: "Dramatic" },
    { value: "mysterious", label: "Mysterious" },
    { value: "romantic", label: "Romantic" },
    { value: "epic", label: "Epic" },
  ];

  const tempos = [
    { value: "slow", label: "Slow (60-80 BPM)" },
    { value: "medium", label: "Medium (80-120 BPM)" },
    { value: "fast", label: "Fast (120-160 BPM)" },
    { value: "very-fast", label: "Very Fast (160+ BPM)" },
  ];

  const instruments = [
    { value: "mixed", label: "Mixed Ensemble" },
    { value: "piano", label: "Piano" },
    { value: "guitar", label: "Guitar" },
    { value: "strings", label: "Strings" },
    { value: "brass", label: "Brass" },
    { value: "drums", label: "Drums" },
    { value: "synth", label: "Synthesizer" },
    { value: "orchestral", label: "Orchestral" },
  ];

  const models = [
    { value: "lyria-3-pro-preview", label: "Lyria 3 Pro (full tracks)" },
    { value: "lyria-3-clip-preview", label: "Lyria 3 Clip (~30s)" },
    { value: "lyria-2.0-music-generation", label: "Legacy id → Lyria 3 Pro" },
    { value: "lyria-1.0-music-generation", label: "Legacy id → Lyria 3 Clip" },
  ];

  const handleGenerate = async () => {
    if (!request.prompt.trim()) {
      setError("Please enter a prompt for music generation");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const response = await fetch("/api/v1/music/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const status: MusicGenerationStatus & {
        mock_mode?: boolean;
        message?: string;
      } = await response.json();
      setGenerationStatus(status);

      if (status.mock_mode) {
        setInfoMessage(
          status.message ??
            "Lyra music generation is running in mock mode. Configure GOOGLE_API_KEY and GOOGLE_CLOUD_PROJECT for live audio.",
        );
      } else {
        setInfoMessage(null);
      }

      // Poll for status updates
      if (status.generation_id) {
        pollStatus(status.generation_id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start music generation",
      );
      setInfoMessage(null);
      setIsGenerating(false);
    }
  };

  const pollStatus = async (generationId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/music/status/${generationId}`);
        if (response.ok) {
          const status: MusicGenerationStatus & {
            mock_mode?: boolean;
            message?: string;
          } = await response.json();
          setGenerationStatus(status);

          if (status.mock_mode) {
            setInfoMessage(
              status.message ??
                "Lyra music generation is running in mock mode. Configure GOOGLE_API_KEY and GOOGLE_CLOUD_PROJECT for live audio.",
            );
          } else {
            setInfoMessage(null);
          }

          if (status.status === "completed") {
            setIsGenerating(false);
            clearInterval(pollInterval);
            if (status.output_path) {
              setAudioUrl(status.output_path);
            }
          } else if (status.status === "failed") {
            setIsGenerating(false);
            clearInterval(pollInterval);
            setError(status.error || "Music generation failed");
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
        setInfoMessage(null);
      }
    }, 2000);

    // Cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isGenerating) {
        setIsGenerating(false);
        setError("Generation timed out");
        setInfoMessage(null);
      }
    }, 600000);
  };

  const handleDownload = async () => {
    if (!generationStatus?.generation_id) return;

    try {
      const response = await fetch(
        `/api/v1/music/download/${generationStatus.generation_id}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `music_${generationStatus.generation_id}.mp3`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (_err) {
      setError("Failed to download music");
    }
  };

  const handleReset = () => {
    setGenerationStatus(null);
    setError(null);
    setIsGenerating(false);
    setAudioUrl(null);
    setInfoMessage(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}
      >
        <MusicNote sx={{ fontSize: 40, color: "primary.main" }} />
        Music Generation with Lyria
      </Typography>

      <Grid container spacing={3}>
        {/* Input Panel */}
        <Grid item xs={12} lg={7}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Tune />
                Generation Settings
              </Typography>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Music Prompt"
                  placeholder="Describe the music you want to generate... (e.g., 'An upbeat electronic track with pulsing synths and driving drums')"
                  value={request.prompt}
                  onChange={(e) =>
                    setRequest({ ...request, prompt: e.target.value })
                  }
                  disabled={isGenerating}
                />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={request.model}
                        label="Model"
                        onChange={(e) =>
                          setRequest({ ...request, model: e.target.value })
                        }
                        disabled={isGenerating}
                      >
                        {models.map((model) => (
                          <MenuItem key={model.value} value={model.value}>
                            {model.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Genre</InputLabel>
                      <Select
                        value={request.genre}
                        label="Genre"
                        onChange={(e) =>
                          setRequest({ ...request, genre: e.target.value })
                        }
                        disabled={isGenerating}
                      >
                        {genres.map((genre) => (
                          <MenuItem key={genre.value} value={genre.value}>
                            {genre.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Mood</InputLabel>
                      <Select
                        value={request.mood}
                        label="Mood"
                        onChange={(e) =>
                          setRequest({ ...request, mood: e.target.value })
                        }
                        disabled={isGenerating}
                      >
                        {moods.map((mood) => (
                          <MenuItem key={mood.value} value={mood.value}>
                            {mood.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tempo</InputLabel>
                      <Select
                        value={request.tempo}
                        label="Tempo"
                        onChange={(e) =>
                          setRequest({ ...request, tempo: e.target.value })
                        }
                        disabled={isGenerating}
                      >
                        {tempos.map((tempo) => (
                          <MenuItem key={tempo.value} value={tempo.value}>
                            {tempo.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl fullWidth>
                  <InputLabel>Primary Instrument</InputLabel>
                  <Select
                    value={request.instrument}
                    label="Primary Instrument"
                    onChange={(e) =>
                      setRequest({ ...request, instrument: e.target.value })
                    }
                    disabled={isGenerating}
                  >
                    {instruments.map((instrument) => (
                      <MenuItem key={instrument.value} value={instrument.value}>
                        {instrument.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Timer />
                    Duration: {request.duration} seconds
                  </Typography>
                  <Slider
                    value={request.duration}
                    onChange={(_, value) =>
                      setRequest({ ...request, duration: value as number })
                    }
                    min={10}
                    max={60}
                    step={5}
                    marks
                    disabled={isGenerating}
                  />
                </Box>

                <Box>
                  <Typography gutterBottom>
                    Number of Tracks: {request.num_tracks}
                  </Typography>
                  <Slider
                    value={request.num_tracks}
                    onChange={(_, value) =>
                      setRequest({ ...request, num_tracks: value as number })
                    }
                    min={1}
                    max={3}
                    step={1}
                    marks
                    disabled={isGenerating}
                  />
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={isGenerating || !request.prompt.trim()}
                  startIcon={
                    isGenerating ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PlayArrow />
                    )
                  }
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {isGenerating ? "Generating Music..." : "Generate Music"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Panel */}
        <Grid item xs={12} lg={5}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <VolumeUp />
                Generation Status
              </Typography>

              {infoMessage && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {infoMessage}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {generationStatus ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Generation ID
                    </Typography>
                    <Chip label={generationStatus.generation_id} size="small" />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={generationStatus.status}
                      color={
                        generationStatus.status === "completed"
                          ? "success"
                          : generationStatus.status === "failed"
                            ? "error"
                            : generationStatus.status === "processing"
                              ? "warning"
                              : "default"
                      }
                    />
                  </Box>

                  {generationStatus.status === "processing" && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Progress: {generationStatus.progress.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={generationStatus.progress}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  )}

                  <Typography variant="body2">
                    {generationStatus.status_message}
                  </Typography>

                  {audioUrl && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Preview:
                      </Typography>
                      <audio controls style={{ width: "100%" }}>
                        <source src={audioUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </Box>
                  )}

                  {generationStatus.status === "completed" && (
                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDownload}
                        fullWidth
                      >
                        Download Music
                      </Button>
                    </Box>
                  )}

                  <Button
                    variant="text"
                    startIcon={<Refresh />}
                    onClick={handleReset}
                    fullWidth
                  >
                    Start New Generation
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No active generation. Enter a prompt and click "Generate
                  Music" to start.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tips */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Tips for Better Music
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" component="div">
                <strong>Prompt Writing:</strong>
                <ul>
                  <li>Describe the overall feel and emotion</li>
                  <li>Mention specific instruments or sounds</li>
                  <li>Include tempo and rhythm details</li>
                  <li>Reference musical styles or artists</li>
                </ul>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" component="div">
                <strong>Technical Notes:</strong>
                <ul>
                  <li>Music is 10-60 seconds long</li>
                  <li>Generation takes 2-5 minutes</li>
                  <li>Use descriptive, musical language</li>
                  <li>Experiment with different genres</li>
                </ul>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MusicGenerator;
