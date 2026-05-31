import { GraphicEq as LiveIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import type React from "react";
import { Link as RouterLink } from "react-router-dom";

const SPEECH_MCP_REPO = "https://github.com/sandraschi/speech-mcp";
const LIVE_API_DOCS = "https://ai.google.dev/gemini-api/docs/live";

const GeminiLive: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
      >
        <LiveIcon fontSize="large" />
        Gemini Live
      </Typography>

      <Stack spacing={2}>
        <Alert severity="info">
          Real-time Gemini Live sessions (bidirectional audio, streaming STT/TTS,
          Chirp, FunASR, ElevenLabs) live in{" "}
          <strong>
            <a href={SPEECH_MCP_REPO} target="_blank" rel="noopener noreferrer">
              speech-mcp
            </a>
          </strong>
          . This dashboard keeps thin one-shot TTS only — see{" "}
          <RouterLink to="/speech">Speech (TTS)</RouterLink>.
        </Alert>

        <Card elevation={2}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Division of responsibility</Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>google-ai-mcp</strong> — Gemini chat, image, video, music,
                embeddings, Omni, and simple TTS for quick demos.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>speech-mcp</strong> — Gemini 3.1 Flash Live WebSocket proxy,
                streaming speech I/O, voice catalogs, and fleet speech tooling.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avoid duplicating Live/STT stacks here; run speech-mcp on its fleet
                port when you need low-latency voice agents.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  href={SPEECH_MCP_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenIcon />}
                >
                  Open speech-mcp
                </Button>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to="/speech"
                >
                  One-shot TTS here
                </Button>
                <Button
                  variant="text"
                  href={LIVE_API_DOCS}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenIcon />}
                >
                  Live API docs
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default GeminiLive;
