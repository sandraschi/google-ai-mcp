import {
  AutoAwesome as OmniIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
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
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";

interface OmniOutput {
  url: string;
  filename: string;
}

const OmniGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gemini-omni-flash");
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageUrls, setImageUrls] = useState("");
  const [audioUrls, setAudioUrls] = useState("");
  const [videoUrls, setVideoUrls] = useState("");
  const [editHistory, setEditHistory] = useState("");
  const [outputs, setOutputs] = useState<OmniOutput[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const parseUrls = (raw: string) =>
    raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Enter a prompt describing what to create or how to edit");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/v1/omni/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          duration,
          aspect_ratio: aspectRatio,
          image_urls: parseUrls(imageUrls),
          audio_urls: parseUrls(audioUrls),
          video_urls: parseUrls(videoUrls),
          edit_history: parseUrls(editHistory),
          num_outputs: 1,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Generation failed");
      if (result.mock_mode) {
        setInfoMessage(
          result.message ??
            "Gemini Omni API is not GA yet — mock output returned. Set GOOGLE_API_KEY + GOOGLE_CLOUD_PROJECT when available.",
        );
      }
      setOutputs(result.outputs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Omni generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box sx={{ flex: 1, overflow: "auto" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <OmniIcon color="primary" /> Gemini Omni
          </Typography>
          <Typography color="text.secondary">
            Create video from any input — text, images, audio, and reference video. Conversational editing supported.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip label="Text" size="small" />
            <Chip label="Image" size="small" />
            <Chip label="Audio" size="small" />
            <Chip label="Video" size="small" variant="outlined" />
            <Chip label="→ Video out" size="small" color="primary" />
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {infoMessage && <Alert severity="info">{infoMessage}</Alert>}

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Prompt / edit instruction"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A 10-second timelapse of a city transforming from day to night..."
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
                    <MenuItem value="gemini-omni-flash">Gemini Omni Flash</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (s, max 10)"
                  value={duration}
                  inputProps={{ min: 1, max: 10 }}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Aspect ratio</InputLabel>
                  <Select value={aspectRatio} label="Aspect ratio" onChange={(e) => setAspectRatio(e.target.value)}>
                    <MenuItem value="16:9">16:9</MenuItem>
                    <MenuItem value="9:16">9:16</MenuItem>
                    <MenuItem value="1:1">1:1</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Image URLs (one per line)"
                  value={imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Audio URLs (one per line)"
                  value={audioUrls}
                  onChange={(e) => setAudioUrls(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Video URLs (one per line)"
                  value={videoUrls}
                  onChange={(e) => setVideoUrls(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Edit history (prior turns, one per line)"
                  value={editHistory}
                  onChange={(e) => setEditHistory(e.target.value)}
                  placeholder="Original scene: sunset over mountains"
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleGenerate}
                disabled={isGenerating}
                startIcon={isGenerating ? <CircularProgress size={20} /> : <OmniIcon />}
              >
                {isGenerating ? "Generating..." : "Generate with Omni"}
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setOutputs([])}>
                Clear outputs
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {outputs.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Outputs
              </Typography>
              <Stack spacing={2}>
                {outputs.map((out) => (
                  <Stack key={out.filename} direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2">{out.filename}</Typography>
                    <Button size="small" startIcon={<DownloadIcon />} href={out.url} download>
                      Download
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export default OmniGenerator;
