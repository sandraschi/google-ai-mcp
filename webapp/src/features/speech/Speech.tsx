import {
  Mic as MicIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  TTS_LANGUAGE_OPTIONS,
  defaultTextForLang,
  demosForLang,
} from "./ttsLanguageDemos";

const Speech: React.FC = () => {
  const [ttsLang, setTtsLang] = useState("en");
  const [ttsText, setTtsText] = useState(() => defaultTextForLang("en"));
  const [ttsModel, setTtsModel] = useState("gemini-3.1-flash-tts-preview");
  const [voice, setVoice] = useState("Kore");
  const [ttsModels, setTtsModels] = useState<Record<string, string>>({});
  const [voices, setVoices] = useState<string[]>([]);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/speech/options");
        if (!res.ok) return;
        const data = await res.json();
        if (data.tts_models) setTtsModels(data.tts_models);
        if (data.voices) setVoices(data.voices);
      } catch {
        /* ignore */
      }
    };
    void load();
  }, []);

  const runTts = async () => {
    setTtsError(null);
    setTtsLoading(true);
    try {
      const res = await fetch("/api/v1/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ttsText,
          model: ttsModel,
          voice_name: voice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || res.statusText);
      }
      if (!data.audio_base64) {
        throw new Error("No audio in response");
      }
      const mime = data.mime || "audio/wav";
      const src = `data:${mime};base64,${data.audio_base64}`;
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = src;
      void audioRef.current.play();
    } catch (e) {
      setTtsError(e instanceof Error ? e.message : "TTS failed");
    } finally {
      setTtsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
      >
        <MicIcon fontSize="large" />
        Speech — Gemini TTS
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Gemini <strong>3.1 Flash TTS</strong> is the current native speech model
        family (preview). For stronger &quot;Pro&quot;-style speech, pick{" "}
        <strong>Gemini 2.5 Pro preview TTS</strong> in the model list.
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        For <strong>Gemini Live</strong> (streaming session), open the{" "}
        <RouterLink to="/live">Gemini Live</RouterLink> page.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Gemini TTS</Typography>
                <Typography variant="caption" color="text.secondary">
                  Docs:{" "}
                  <a
                    href="https://ai.google.dev/gemini-api/docs/speech-generation"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Speech generation
                  </a>
                </Typography>
                {ttsError && <Alert severity="error">{ttsError}</Alert>}
                <FormControl fullWidth size="small">
                  <InputLabel>Language (for demos)</InputLabel>
                  <Select
                    label="Language (for demos)"
                    value={ttsLang}
                    onChange={(e) => {
                      const code = e.target.value;
                      setTtsLang(code);
                      setTtsText(defaultTextForLang(code));
                    }}
                  >
                    {TTS_LANGUAGE_OPTIONS.map((lang) => (
                      <MenuItem key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  Gemini TTS infers language from your transcript. The selector
                  loads sample phrases in that language; you can still type
                  anything.
                </Typography>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.75 }}
                  >
                    Demo phrases
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {demosForLang(ttsLang).map((d) => (
                      <Chip
                        key={`${ttsLang}-${d.id}`}
                        label={d.label}
                        size="small"
                        variant={ttsText === d.text ? "filled" : "outlined"}
                        onClick={() => setTtsText(d.text)}
                      />
                    ))}
                  </Stack>
                </Box>
                <FormControl fullWidth size="small">
                  <InputLabel>TTS model</InputLabel>
                  <Select
                    label="TTS model"
                    value={ttsModel}
                    onChange={(e) => setTtsModel(e.target.value)}
                  >
                    {Object.keys(ttsModels).length > 0
                      ? Object.entries(ttsModels).map(([k, v]) => (
                          <MenuItem key={k} value={k}>
                            {v}
                          </MenuItem>
                        ))
                      : [
                          <MenuItem
                            key="31"
                            value="gemini-3.1-flash-tts-preview"
                          >
                            Gemini 3.1 Flash TTS (preview)
                          </MenuItem>,
                          <MenuItem
                            key="25p"
                            value="gemini-2.5-pro-preview-tts"
                          >
                            Gemini 2.5 Pro TTS (preview)
                          </MenuItem>,
                        ]}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Voice</InputLabel>
                  <Select
                    label="Voice"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                  >
                    {(voices.length ? voices : ["Kore", "Puck", "Charon"]).map(
                      (v) => (
                        <MenuItem key={v} value={v}>
                          {v}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
                <TextField
                  label="Text to speak"
                  multiline
                  minRows={4}
                  fullWidth
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<PlayIcon />}
                    disabled={ttsLoading || !ttsText.trim()}
                    onClick={() => void runTts()}
                  >
                    {ttsLoading ? "Generating…" : "Generate and play"}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<StopIcon />}
                    onClick={() => audioRef.current?.pause()}
                  >
                    Stop playback
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Speech;
