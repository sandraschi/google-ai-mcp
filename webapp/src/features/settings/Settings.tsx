import {
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Image as ImageIcon,
  MusicNote as MusicIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Movie as VideoIcon,
  Wifi as WifiIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";

interface SettingsConfig {
  // API Configuration
  apiKey: string;
  projectId: string;
  apiEndpoint: string;

  // Text Chat Settings
  chat: {
    model: string;
    maxTokens: number;
    temperature: number;
    enableHistory: boolean;
    autoSave: boolean;
  };

  // Image Generation Settings
  image: {
    model: string;
    defaultSize: string;
    quality: string;
    style: string;
    safetyLevel: string;
  };

  // Music Generation Settings
  music: {
    model: string;
    defaultDuration: number;
    defaultGenre: string;
    defaultMood: string;
  };

  // Video Generation Settings
  video: {
    model: string;
    defaultDuration: number;
    defaultAspectRatio: string;
    quality: string;
  };

  // General Settings
  general: {
    theme: "light" | "dark" | "auto";
    language: string;
    autoSave: boolean;
    notifications: boolean;
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsConfig>({
    apiKey: "",
    projectId: "",
    apiEndpoint: "google-gen-ai-sdk",

    chat: {
      model: "gemini-3.1-pro-preview",
      maxTokens: 2048,
      temperature: 0.7,
      enableHistory: true,
      autoSave: true,
    },

    image: {
      model: "nano-banana-2",
      defaultSize: "1024x1024",
      quality: "standard",
      style: "natural",
      safetyLevel: "medium",
    },

    music: {
      model: "lyria-3-pro-preview",
      defaultDuration: 30,
      defaultGenre: "electronic",
      defaultMood: "energetic",
    },

    video: {
      model: "veo-3.1-preview-002",
      defaultDuration: 6,
      defaultAspectRatio: "16:9",
      quality: "standard",
    },

    general: {
      theme: "auto",
      language: "en",
      autoSave: true,
      notifications: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [connectionMessage, setConnectionMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/v1/settings");
      if (response.ok) {
        const savedSettings = await response.json();
        setSettings((prev) => ({ ...prev, ...savedSettings }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/v1/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (
    section: keyof SettingsConfig,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [key]: value,
      },
    }));
  };

  const handleApiSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const testConnection = async () => {
    setConnectionStatus("testing");
    setConnectionMessage("");

    try {
      const response = await fetch("/api/v1/settings/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus("success");
        setConnectionMessage(result.message);
      } else {
        setConnectionStatus("error");
        setConnectionMessage(result.error);
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionMessage(
        "Failed to test connection: " + (error as Error).message,
      );
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}
      >
        <SettingsIcon sx={{ fontSize: 40, color: "primary.main" }} />
        Settings
      </Typography>

      {saveStatus === "success" && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {saveStatus === "error" && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* API Configuration */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <SettingsIcon />
              API Configuration
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Google AI Studio API Key"
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) =>
                    handleApiSettingChange("apiKey", e.target.value)
                  }
                  helperText="Your Google AI Studio API key"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Project ID"
                  value={settings.projectId}
                  onChange={(e) =>
                    handleApiSettingChange("projectId", e.target.value)
                  }
                  helperText="Your Google Cloud Project ID"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Endpoint"
                  value={settings.apiEndpoint}
                  onChange={(e) =>
                    handleApiSettingChange("apiEndpoint", e.target.value)
                  }
                  helperText="Use google-gen-ai-sdk for Google Gen AI defaults (google-genai); optional REST base override"
                />
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={testConnection}
                    disabled={
                      connectionStatus === "testing" ||
                      !settings.apiKey ||
                      !settings.projectId
                    }
                    startIcon={
                      connectionStatus === "testing" ? (
                        <RefreshIcon />
                      ) : connectionStatus === "success" ? (
                        <CheckCircleIcon />
                      ) : connectionStatus === "error" ? (
                        <ErrorIcon />
                      ) : (
                        <WifiIcon />
                      )
                    }
                    sx={{
                      ...(connectionStatus === "success" && {
                        color: "success.main",
                        borderColor: "success.main",
                        "&:hover": {
                          borderColor: "success.dark",
                          backgroundColor: "success.light",
                        },
                      }),
                      ...(connectionStatus === "error" && {
                        color: "error.main",
                        borderColor: "error.main",
                        "&:hover": {
                          borderColor: "error.dark",
                          backgroundColor: "error.light",
                        },
                      }),
                    }}
                  >
                    {connectionStatus === "testing"
                      ? "Testing..."
                      : connectionStatus === "success"
                        ? "Connection OK"
                        : connectionStatus === "error"
                          ? "Connection Failed"
                          : "Test Connection"}
                  </Button>

                  {connectionMessage && (
                    <Typography
                      variant="body2"
                      color={
                        connectionStatus === "success"
                          ? "success.main"
                          : "error.main"
                      }
                      sx={{ fontStyle: "italic" }}
                    >
                      {connectionMessage}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Text Chat Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ChatIcon />
              Text Chat Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={settings.chat.model}
                    label="Model"
                    onChange={(e) =>
                      handleSettingChange("chat", "model", e.target.value)
                    }
                  >
                    <MenuItem value="gemini-3.1-pro-preview">
                      Gemini 3.1 Pro (recommended)
                    </MenuItem>
                    <MenuItem value="gemini-3-flash-preview">
                      Gemini 3 Flash
                    </MenuItem>
                    <MenuItem value="gemma-4-31b-it">Gemma 4 31B IT</MenuItem>
                    <MenuItem value="gemma-4-26b-a4b-it">
                      Gemma 4 26B MoE IT
                    </MenuItem>
                    <MenuItem value="gemma-3-27b-it">
                      Gemma 3 legacy id → Gemma 4
                    </MenuItem>
                    <MenuItem value="gemini-2.5-pro">
                      Gemini 2.5 Pro (Legacy)
                    </MenuItem>
                    <MenuItem value="gemini-2.0-flash-exp">
                      Gemini 2.0 Flash (Deprecated)
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Tokens"
                  type="number"
                  value={settings.chat.maxTokens}
                  onChange={(e) =>
                    handleSettingChange(
                      "chat",
                      "maxTokens",
                      Number.parseInt(e.target.value),
                    )
                  }
                  inputProps={{ min: 1, max: 8192 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Temperature"
                  type="number"
                  value={settings.chat.temperature}
                  onChange={(e) =>
                    handleSettingChange(
                      "chat",
                      "temperature",
                      Number.parseFloat(e.target.value),
                    )
                  }
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.chat.enableHistory}
                      onChange={(e) =>
                        handleSettingChange(
                          "chat",
                          "enableHistory",
                          e.target.checked,
                        )
                      }
                    />
                  }
                  label="Enable Chat History"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Image Generation Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ImageIcon />
              Image Generation Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={settings.image.model}
                    label="Model"
                    onChange={(e) =>
                      handleSettingChange("image", "model", e.target.value)
                    }
                  >
                    <MenuItem value="nano-banana-2">
                      Nano Banana 2 (Gemini 3.1 Flash Image)
                    </MenuItem>
                    <MenuItem value="gemini-3.1-flash-image-preview">
                      gemini-3.1-flash-image-preview
                    </MenuItem>
                    <MenuItem value="nano-banana-pro">
                      Nano Banana Pro (Gemini 3 Pro Image)
                    </MenuItem>
                    <MenuItem value="gemini-3-pro-image-preview">
                      gemini-3-pro-image-preview
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Default Size</InputLabel>
                  <Select
                    value={settings.image.defaultSize}
                    label="Default Size"
                    onChange={(e) =>
                      handleSettingChange(
                        "image",
                        "defaultSize",
                        e.target.value,
                      )
                    }
                  >
                    <MenuItem value="1024x1024">1024x1024 (Square)</MenuItem>
                    <MenuItem value="1024x768">1024x768 (Landscape)</MenuItem>
                    <MenuItem value="768x1024">768x1024 (Portrait)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={settings.image.quality}
                    label="Quality"
                    onChange={(e) =>
                      handleSettingChange("image", "quality", e.target.value)
                    }
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="hd">HD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={settings.image.style}
                    label="Style"
                    onChange={(e) =>
                      handleSettingChange("image", "style", e.target.value)
                    }
                  >
                    <MenuItem value="natural">Natural</MenuItem>
                    <MenuItem value="artistic">Artistic</MenuItem>
                    <MenuItem value="photographic">Photographic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Music Generation Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <MusicIcon />
              Music Generation Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={settings.music.model}
                    label="Model"
                    onChange={(e) =>
                      handleSettingChange("music", "model", e.target.value)
                    }
                  >
                    <MenuItem value="music-lyra-1.1">Lyra 1.1</MenuItem>
                    <MenuItem value="lyria-1-0-generate-001">
                      Lyra 1.0 (Legacy)
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Duration (seconds)"
                  type="number"
                  value={settings.music.defaultDuration}
                  onChange={(e) =>
                    handleSettingChange(
                      "music",
                      "defaultDuration",
                      Number.parseInt(e.target.value),
                    )
                  }
                  inputProps={{ min: 10, max: 60, step: 5 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Default Genre</InputLabel>
                  <Select
                    value={settings.music.defaultGenre}
                    label="Default Genre"
                    onChange={(e) =>
                      handleSettingChange(
                        "music",
                        "defaultGenre",
                        e.target.value,
                      )
                    }
                  >
                    <MenuItem value="electronic">Electronic</MenuItem>
                    <MenuItem value="rock">Rock</MenuItem>
                    <MenuItem value="jazz">Jazz</MenuItem>
                    <MenuItem value="classical">Classical</MenuItem>
                    <MenuItem value="pop">Pop</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Default Mood</InputLabel>
                  <Select
                    value={settings.music.defaultMood}
                    label="Default Mood"
                    onChange={(e) =>
                      handleSettingChange(
                        "music",
                        "defaultMood",
                        e.target.value,
                      )
                    }
                  >
                    <MenuItem value="energetic">Energetic</MenuItem>
                    <MenuItem value="calm">Calm</MenuItem>
                    <MenuItem value="melancholic">Melancholic</MenuItem>
                    <MenuItem value="happy">Happy</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Video Generation Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <VideoIcon />
              Video Generation Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={settings.video.model}
                    label="Model"
                    onChange={(e) =>
                      handleSettingChange("video", "model", e.target.value)
                    }
                  >
                    <MenuItem value="veo-3.1-preview-002">
                      Veo 3.1 Preview
                    </MenuItem>
                    <MenuItem value="veo-3.0-generate-preview">
                      Veo 3.0 Legacy
                    </MenuItem>
                    <MenuItem value="veo-2.0-generate-001">
                      Veo 2.0 Legacy
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Duration (seconds)"
                  type="number"
                  value={settings.video.defaultDuration}
                  onChange={(e) =>
                    handleSettingChange(
                      "video",
                      "defaultDuration",
                      Number.parseInt(e.target.value),
                    )
                  }
                  inputProps={{ min: 5, max: 8, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Default Aspect Ratio</InputLabel>
                  <Select
                    value={settings.video.defaultAspectRatio}
                    label="Default Aspect Ratio"
                    onChange={(e) =>
                      handleSettingChange(
                        "video",
                        "defaultAspectRatio",
                        e.target.value,
                      )
                    }
                  >
                    <MenuItem value="16:9">16:9 (Widescreen)</MenuItem>
                    <MenuItem value="9:16">9:16 (Portrait)</MenuItem>
                    <MenuItem value="1:1">1:1 (Square)</MenuItem>
                    <MenuItem value="4:3">4:3 (Classic)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={settings.video.quality}
                    label="Quality"
                    onChange={(e) =>
                      handleSettingChange("video", "quality", e.target.value)
                    }
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="hd">HD</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* General Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <SettingsIcon />
              General Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={settings.general.theme}
                    label="Theme"
                    onChange={(e) =>
                      handleSettingChange("general", "theme", e.target.value)
                    }
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={settings.general.language}
                    label="Language"
                    onChange={(e) =>
                      handleSettingChange("general", "language", e.target.value)
                    }
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="ja">Japanese</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.general.autoSave}
                      onChange={(e) =>
                        handleSettingChange(
                          "general",
                          "autoSave",
                          e.target.checked,
                        )
                      }
                    />
                  }
                  label="Auto-save"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.general.notifications}
                      onChange={(e) =>
                        handleSettingChange(
                          "general",
                          "notifications",
                          e.target.checked,
                        )
                      }
                    />
                  }
                  label="Enable Notifications"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Action Buttons */}
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadSettings}
                disabled={isLoading}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveSettings}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default Settings;
