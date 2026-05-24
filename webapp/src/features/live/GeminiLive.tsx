import { GraphicEq as LiveIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { liveWebSocketUrl } from "../speech/liveWebSocketUrl";

const GeminiLive: React.FC = () => {
  const [liveModel, setLiveModel] = useState("gemini-live-2.5-flash-preview");
  const [liveModalities, setLiveModalities] = useState<string[]>(["TEXT"]);
  const [liveModels, setLiveModels] = useState<Record<string, string>>({});
  const [liveText, setLiveText] = useState(
    "Hello from the Gemini Live API proxy.",
  );
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [liveConnected, setLiveConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/speech/options");
        if (!res.ok) return;
        const data = await res.json();
        if (data.live_models) setLiveModels(data.live_models);
      } catch {
        /* ignore */
      }
    };
    void load();
  }, []);

  const appendLive = useCallback((line: string) => {
    setLiveLog((prev) => [...prev.slice(-400), line]);
  }, []);

  const disconnectLive = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setLiveConnected(false);
  }, []);

  const connectLive = useCallback(() => {
    disconnectLive();
    const url = liveWebSocketUrl();
    appendLive(`Connecting: ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "config",
          model: liveModel,
          response_modalities: liveModalities,
        }),
      );
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "ready") {
          setLiveConnected(true);
          appendLive(`Ready: model=${msg.model}`);
          return;
        }
        if (msg.type === "live_message") {
          const t =
            msg.text ?? JSON.stringify(msg.payload ?? msg).slice(0, 4000);
          appendLive(t);
          return;
        }
        appendLive(JSON.stringify(msg));
      } catch {
        appendLive(String(ev.data));
      }
    };
    ws.onerror = () =>
      appendLive(
        "WebSocket error (set REACT_APP_WS_URL to your API host if needed).",
      );
    ws.onclose = () => {
      setLiveConnected(false);
      appendLive("WebSocket closed.");
    };
  }, [appendLive, disconnectLive, liveModel, liveModalities]);

  const sendLiveText = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      appendLive("Not connected.");
      return;
    }
    ws.send(JSON.stringify({ type: "user_text", text: liveText }));
    appendLive(`> ${liveText}`);
  }, [appendLive, liveText]);

  useEffect(() => () => disconnectLive(), [disconnectLive]);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
      >
        <LiveIcon fontSize="large" />
        Gemini Live
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Low-latency session via the official Live API (proxied over WebSocket
        from this app). See{" "}
        <a
          href="https://ai.google.dev/gemini-api/docs/live"
          target="_blank"
          rel="noopener noreferrer"
        >
          Live API overview
        </a>
        . For one-shot speech synthesis, use{" "}
        <RouterLink to="/speech">Speech (TTS)</RouterLink>.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card elevation={2}>
            <CardContent>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Live model</InputLabel>
                  <Select
                    label="Live model"
                    value={liveModel}
                    onChange={(e) => setLiveModel(e.target.value)}
                    disabled={liveConnected}
                  >
                    {Object.keys(liveModels).length > 0
                      ? Object.entries(liveModels).map(([k, v]) => (
                          <MenuItem key={k} value={k}>
                            {v}
                          </MenuItem>
                        ))
                      : [
                          <MenuItem
                            key="l25"
                            value="gemini-live-2.5-flash-preview"
                          >
                            gemini-live-2.5-flash-preview
                          </MenuItem>,
                        ]}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Response modalities</InputLabel>
                  <Select
                    label="Response modalities"
                    value={liveModalities.join(",")}
                    onChange={(e) =>
                      setLiveModalities(e.target.value.split(","))
                    }
                    disabled={liveConnected}
                  >
                    <MenuItem value="TEXT">TEXT</MenuItem>
                    <MenuItem value="TEXT,AUDIO">
                      TEXT + AUDIO (if your key supports it)
                    </MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Message to send"
                  fullWidth
                  multiline
                  minRows={3}
                  value={liveText}
                  onChange={(e) => setLiveText(e.target.value)}
                  disabled={!liveConnected}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    onClick={connectLive}
                    disabled={liveConnected}
                  >
                    Connect
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={disconnectLive}
                  >
                    Disconnect
                  </Button>
                  <Button
                    variant="contained"
                    onClick={sendLiveText}
                    disabled={!liveConnected}
                  >
                    Send text turn
                  </Button>
                </Stack>
                <Alert severity="info">
                  First configure the socket, then send turns. If the UI runs on
                  a different port than the API, set{" "}
                  <code>REACT_APP_WS_URL</code> (e.g.{" "}
                  <code>http://localhost:11014</code>
                  ).
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card elevation={2}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Session log</Typography>
                <Divider />
                <TextField
                  multiline
                  minRows={20}
                  fullWidth
                  value={liveLog.join("\n")}
                  InputProps={{ readOnly: true }}
                  variant="filled"
                  placeholder="Connect to see server and model messages…"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GeminiLive;
