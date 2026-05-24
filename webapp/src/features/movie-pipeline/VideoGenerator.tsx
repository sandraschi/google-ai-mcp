import {
  Download as DownloadIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Slider,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";

// Video generation styles
const videoStyles = [
  {
    value: "cinematic",
    label: "Cinematic",
    description: "High-quality, movie-like visuals",
  },
  {
    value: "realistic",
    label: "Realistic",
    description: "Photorealistic video generation",
  },
  { value: "anime", label: "Anime", description: "Japanese animation style" },
  {
    value: "watercolor",
    label: "Watercolor",
    description: "Painterly watercolor effect",
  },
  { value: "sketch", label: "Sketch", description: "Hand-drawn sketch style" },
  {
    value: "3d-render",
    label: "3D Render",
    description: "Computer generated 3D graphics",
  },
  {
    value: "pixel-art",
    label: "Pixel Art",
    description: "Retro pixel art style",
  },
];

// Video resolutions
const resolutions = [
  { value: "480p", label: "480p (SD)" },
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
  { value: "2k", label: "2K (QHD)" },
  { value: "4k", label: "4K (UHD)" },
];

interface GenerationStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  outputPath?: string;
  error?: string;
  startTime?: string;
  endTime?: string;
}

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState(8);
  const [resolution, setResolution] = useState("1080p");
  const [seed, setSeed] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Poll for generation status
  useEffect(() => {
    if (!generationStatus || generationStatus.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/video/status/${generationStatus.id}`,
        );
        if (!response.ok) throw new Error("Failed to fetch status");

        const statusData = await response.json();
        setGenerationStatus(statusData.data);

        if (
          statusData.data.status === "completed" ||
          statusData.data.status === "failed"
        ) {
          clearInterval(interval);
          setIsGenerating(false);

          if (statusData.data.status === "completed") {
            setSuccess("Video generated successfully!");
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        console.error("Error polling status:", errorMessage);
        // Don't stop polling on error, just log it
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [generationStatus]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          options: {
            style,
            duration,
            resolution,
            negativePrompt: negativePrompt || undefined,
            seed: seed || undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start video generation");
      }

      const data = await response.json();
      setGenerationStatus({
        id: data.data.generationId,
        status: "processing",
        progress: 0,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to generate video";
      console.error("Generation error:", errorMessage);
      setError(errorMessage);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generationStatus?.outputPath) return;

    try {
      // For local files, we need to fetch them first
      const response = await fetch(generationStatus.outputPath);
      if (!response.ok) throw new Error("Failed to download video");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `veo-video-${generationStatus.id}.mp4`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Download error:", errorMessage);
      setError("Failed to download video");
    }
  };

  const handleStyleChange = (event: SelectChangeEvent) => {
    setStyle(event.target.value);
  };

  const handleResolutionChange = (event: SelectChangeEvent) => {
    setResolution(event.target.value);
  };

  const handleDurationChange = (_event: Event, value: number | number[]) => {
    setDuration(value as number);
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const handleReset = () => {
    setPrompt("");
    setNegativePrompt("");
    setStyle("cinematic");
    setDuration(8);
    setResolution("1080p");
    setSeed(null);
    setGenerationStatus(null);
    setError(null);
    setSuccess(null);
  };

  const selectedStyle =
    videoStyles.find((s) => s.value === style) || videoStyles[0];
  const isProcessing = generationStatus?.status === "processing";
  const progress = generationStatus?.progress || 0;

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Veo 3 Video Generator
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Generate high-quality videos using Google's Veo 3 model. Describe the
        video you want to create, adjust the settings, and let the AI do the
        rest.
      </Typography>

      <Grid container spacing={3}>
        {/* Left column - Input form */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Video Settings
            </Typography>

            <TextField
              fullWidth
              label="Video prompt"
              placeholder="Describe the video you want to generate..."
              multiline
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              margin="normal"
              disabled={isGenerating}
              helperText="Be as descriptive as possible for better results"
            />

            <TextField
              fullWidth
              label="Negative prompt (optional)"
              placeholder="What to avoid in the video..."
              multiline
              rows={2}
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              margin="normal"
              disabled={isGenerating}
              helperText="Things you don't want to see in the video"
            />

            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" disabled={isGenerating}>
                  <InputLabel id="style-label">Style</InputLabel>
                  <Select
                    labelId="style-label"
                    value={style}
                    label="Style"
                    onChange={handleStyleChange}
                  >
                    {videoStyles.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{selectedStyle.description}</FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" disabled={isGenerating}>
                  <InputLabel id="resolution-label">Resolution</InputLabel>
                  <Select
                    labelId="resolution-label"
                    value={resolution}
                    label="Resolution"
                    onChange={handleResolutionChange}
                  >
                    {resolutions.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography id="duration-slider" gutterBottom>
                  Duration: {duration} seconds
                </Typography>
                <Slider
                  value={duration}
                  onChange={handleDurationChange}
                  aria-labelledby="duration-slider"
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={1}
                  max={60}
                  disabled={isGenerating}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    label="Seed (optional)"
                    type="number"
                    value={seed || ""}
                    onChange={(e) =>
                      setSeed(
                        e.target.value ? Number.parseInt(e.target.value) : null,
                      )
                    }
                    disabled={isGenerating}
                    fullWidth
                    helperText="For reproducible results"
                  />
                  <Button
                    variant="outlined"
                    onClick={handleRandomizeSeed}
                    disabled={isGenerating}
                    sx={{ minWidth: 120 }}
                  >
                    Randomize
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                startIcon={
                  isProcessing ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
                fullWidth
                size="large"
              >
                {isProcessing ? "Generating..." : "Generate Video"}
              </Button>

              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={isGenerating}
                fullWidth
                size="large"
              >
                Reset
              </Button>
            </Box>

            {isProcessing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Generating video... {progress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}

            {generationStatus?.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {generationStatus.error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Right column - Preview and results */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 400,
              bgcolor: "background.paper",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {!generationStatus ? (
              <Box textAlign="center" p={4}>
                <InfoIcon
                  color="action"
                  sx={{ fontSize: 60, opacity: 0.5, mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  Your generated video will appear here
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Enter a prompt and click "Generate Video" to get started
                </Typography>
              </Box>
            ) : isProcessing ? (
              <Box textAlign="center" p={4}>
                <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Generating your video...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This may take a few minutes. Please don't close this page.
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    mt: 3,
                    height: 8,
                    borderRadius: 4,
                    maxWidth: 300,
                    mx: "auto",
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 1 }}
                >
                  {progress}% complete
                </Typography>
              </Box>
            ) : generationStatus.status === "completed" ? (
              <Box width="100%" textAlign="center">
                <video
                  controls
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    borderRadius: 8,
                    backgroundColor: "#000",
                  }}
                  src={generationStatus.outputPath}
                >
                  Your browser does not support the video tag.
                </video>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownload}
                    startIcon={<DownloadIcon />}
                    sx={{ mt: 2 }}
                  >
                    Download Video
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" p={4}>
                <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h6" color="error" gutterBottom>
                  Generation Failed
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {generationStatus.error || "An unknown error occurred"}
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleReset}
                  startIcon={<RefreshIcon />}
                >
                  Try Again
                </Button>
              </Box>
            )}
          </Paper>

          {generationStatus?.status === "completed" && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Generation ID: {generationStatus.id}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {new Date(generationStatus.startTime || "").toLocaleString()}
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Error and success notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccess(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VideoGenerator;
