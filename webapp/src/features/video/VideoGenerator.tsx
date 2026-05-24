import { Download, PlayArrow, Refresh } from "@mui/icons-material";
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
import { useEffect, useState } from "react";

interface VideoGenerationRequest {
  prompt: string;
  model: string;
  duration: number;
  aspect_ratio: string;
  num_videos: number;
  client_id?: string;
}

interface VideoGenerationStatus {
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

const VideoGenerator: React.FC = () => {
  const [request, setRequest] = useState<VideoGenerationRequest>({
    prompt: "",
    model: "veo-3.1-preview-002",
    duration: 6,
    aspect_ratio: "16:9",
    num_videos: 1,
  });

  const [generationStatus, setGenerationStatus] =
    useState<VideoGenerationStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  const aspectRatios = [
    { value: "16:9", label: "Widescreen (16:9)" },
    { value: "9:16", label: "Portrait (9:16)" },
    { value: "1:1", label: "Square (1:1)" },
    { value: "4:3", label: "Classic (4:3)" },
  ];

  const models = [
    { value: "veo-3.1-preview-002", label: "Veo 3.1 Preview" },
    { value: "veo-3.0-generate-preview", label: "Veo 3.0 (Legacy)" },
    { value: "veo-2.0-generate-001", label: "Veo 2.0 (Stable)" },
  ];

  const handleGenerate = async () => {
    if (!request.prompt.trim()) {
      setError("Please enter a prompt for video generation");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const status: VideoGenerationStatus = await response.json();
      setGenerationStatus(status);

      // Connect to WebSocket for real-time updates
      if (status.generation_id) {
        connectWebSocket(status.generation_id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start video generation",
      );
      setIsGenerating(false);
    }
  };

  const connectWebSocket = (generationId: string) => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/${generationId}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "generation_update") {
        setGenerationStatus(data.data);
        if (data.data.status === "completed" || data.data.status === "failed") {
          setIsGenerating(false);
          ws.close();
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWsConnection(ws);
  };

  const handleDownload = async () => {
    if (!generationStatus?.generation_id) return;

    try {
      const response = await fetch(
        `/api/v1/video/${generationStatus.generation_id}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `video_${generationStatus.generation_id}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (_err) {
      setError("Failed to download video");
    }
  };

  const handleReset = () => {
    setGenerationStatus(null);
    setError(null);
    setIsGenerating(false);
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
  };

  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        🎬 Video Generation with Veo
      </Typography>

      <Grid container spacing={3}>
        {/* Input Panel */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Settings
              </Typography>

              <Stack spacing={3}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Video Prompt"
                  placeholder="Describe the video you want to generate..."
                  value={request.prompt}
                  onChange={(e) =>
                    setRequest({ ...request, prompt: e.target.value })
                  }
                  disabled={isGenerating}
                />

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

                <FormControl fullWidth>
                  <InputLabel>Aspect Ratio</InputLabel>
                  <Select
                    value={request.aspect_ratio}
                    label="Aspect Ratio"
                    onChange={(e) =>
                      setRequest({ ...request, aspect_ratio: e.target.value })
                    }
                    disabled={isGenerating}
                  >
                    {aspectRatios.map((ratio) => (
                      <MenuItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography gutterBottom>
                    Duration: {request.duration} seconds
                  </Typography>
                  <Slider
                    value={request.duration}
                    onChange={(_, value) =>
                      setRequest({ ...request, duration: value as number })
                    }
                    min={5}
                    max={8}
                    step={1}
                    marks
                    disabled={isGenerating}
                  />
                </Box>

                <Box>
                  <Typography gutterBottom>
                    Number of Videos: {request.num_videos}
                  </Typography>
                  <Slider
                    value={request.num_videos}
                    onChange={(_, value) =>
                      setRequest({ ...request, num_videos: value as number })
                    }
                    min={1}
                    max={4}
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
                >
                  {isGenerating ? "Generating..." : "Generate Video"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Panel */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Status
              </Typography>

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

                  {generationStatus.status === "completed" && (
                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDownload}
                        fullWidth
                      >
                        Download Video
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
                  Video" to start.
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
            💡 Tips for Better Videos
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" component="div">
                <strong>Prompt Writing:</strong>
                <ul>
                  <li>Be specific about actions and movements</li>
                  <li>Include lighting and atmosphere details</li>
                  <li>Specify camera angles and perspectives</li>
                  <li>Mention style (cinematic, artistic, etc.)</li>
                </ul>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" component="div">
                <strong>Technical Notes:</strong>
                <ul>
                  <li>Videos are 5-8 seconds long</li>
                  <li>Generation takes 1-3 minutes</li>
                  <li>Use descriptive, action-oriented prompts</li>
                  <li>Experiment with different aspect ratios</li>
                </ul>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VideoGenerator;
