import {
  Book as BookIcon,
  Download as DownloadIcon,
  Favorite as FavoriteIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Style as StyleIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";

interface RomanceTropes {
  hero_types: string[];
  heroine_types: string[];
  settings: string[];
  conflicts: string[];
  writing_styles: string[];
  raunchiness_levels: string[];
  languages: string[];
  eras: string[];
}

interface NovelStatus {
  novel_id: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  title: string;
  current_chapter: number;
  total_chapters: number;
  word_count: number;
  cover_url?: string;
  novel_text?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

const RomanceNovelGenerator: React.FC = () => {
  const [tropes, setTropes] = useState<RomanceTropes | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentNovel, setCurrentNovel] = useState<NovelStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    hero_type: "",
    heroine_type: "",
    setting: "",
    conflict: "",
    writing_style: "Modern",
    raunchiness: "Steamy",
    language: "English",
    era: "Contemporary",
    word_count: 80000,
    include_cover: true,
  });

  // Load tropes on component mount
  useEffect(() => {
    loadTropes();
  }, []);

  const loadTropes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/romance/tropes");
      if (response.ok) {
        const data = await response.json();
        setTropes(data);
      } else {
        setError("Failed to load romance tropes");
      }
    } catch (err) {
      setError("Error loading tropes: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateNovel = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch("/api/v1/romance/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          client_id: Date.now().toString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentNovel({
          novel_id: data.novel_id,
          status: "generating",
          progress: 0,
          title: formData.title,
          current_chapter: 0,
          total_chapters: 20,
          word_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Start polling for status
        pollNovelStatus(data.novel_id);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to start novel generation");
      }
    } catch (err) {
      setError("Error generating novel: " + (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const pollNovelStatus = async (novelId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/romance/${novelId}/status`);
        if (response.ok) {
          const status = await response.json();
          setCurrentNovel(status);

          if (status.status === "generating") {
            // Continue polling
            setTimeout(poll, 2000);
          }
        }
      } catch (err) {
        console.error("Error polling novel status:", err);
      }
    };

    poll();
  };

  const downloadNovel = async () => {
    if (!currentNovel) return;

    try {
      const response = await fetch(
        `/api/v1/romance/${currentNovel.novel_id}/download`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentNovel.title}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError("Error downloading novel: " + (err as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      hero_type: "",
      heroine_type: "",
      setting: "",
      conflict: "",
      writing_style: "Modern",
      raunchiness: "Steamy",
      language: "English",
      era: "Contemporary",
      word_count: 80000,
      include_cover: true,
    });
    setCurrentNovel(null);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading romance tropes...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        <FavoriteIcon sx={{ fontSize: 40, color: "pink" }} />
        AI Romance Novel Generator
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Create a complete romance novel with AI! Choose your tropes, writing
        style, spice level, language, and era.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Novel Configuration */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "fit-content" }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <BookIcon />
                Novel Configuration
              </Typography>

              <TextField
                fullWidth
                label="Novel Title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                sx={{ mb: 2 }}
                placeholder="e.g., The Duke's Forbidden Love"
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Hero Type</InputLabel>
                <Select
                  value={formData.hero_type}
                  onChange={(e) =>
                    handleInputChange("hero_type", e.target.value)
                  }
                  label="Hero Type"
                >
                  {tropes?.hero_types.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Heroine Type</InputLabel>
                <Select
                  value={formData.heroine_type}
                  onChange={(e) =>
                    handleInputChange("heroine_type", e.target.value)
                  }
                  label="Heroine Type"
                >
                  {tropes?.heroine_types.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Setting</InputLabel>
                <Select
                  value={formData.setting}
                  onChange={(e) => handleInputChange("setting", e.target.value)}
                  label="Setting"
                >
                  {tropes?.settings.map((setting) => (
                    <MenuItem key={setting} value={setting}>
                      {setting}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Main Conflict</InputLabel>
                <Select
                  value={formData.conflict}
                  onChange={(e) =>
                    handleInputChange("conflict", e.target.value)
                  }
                  label="Main Conflict"
                >
                  {tropes?.conflicts.map((conflict) => (
                    <MenuItem key={conflict} value={conflict}>
                      {conflict}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Style & Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "fit-content" }}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <StyleIcon />
                Style & Settings
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Writing Style</InputLabel>
                <Select
                  value={formData.writing_style}
                  onChange={(e) =>
                    handleInputChange("writing_style", e.target.value)
                  }
                  label="Writing Style"
                >
                  {tropes?.writing_styles.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Spice Level</InputLabel>
                <Select
                  value={formData.raunchiness}
                  onChange={(e) =>
                    handleInputChange("raunchiness", e.target.value)
                  }
                  label="Spice Level"
                >
                  {tropes?.raunchiness_levels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={formData.language}
                  onChange={(e) =>
                    handleInputChange("language", e.target.value)
                  }
                  label="Language"
                >
                  {tropes?.languages.map((lang) => (
                    <MenuItem key={lang} value={lang}>
                      {lang}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Era</InputLabel>
                <Select
                  value={formData.era}
                  onChange={(e) => handleInputChange("era", e.target.value)}
                  label="Era"
                >
                  {tropes?.eras.map((era) => (
                    <MenuItem key={era} value={era}>
                      {era}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography gutterBottom>
                Word Count: {formData.word_count.toLocaleString()}
              </Typography>
              <Slider
                value={formData.word_count}
                onChange={(_, value) => handleInputChange("word_count", value)}
                min={20000}
                max={150000}
                step={10000}
                marks={[
                  { value: 20000, label: "20K" },
                  { value: 80000, label: "80K" },
                  { value: 150000, label: "150K" },
                ]}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.include_cover}
                    onChange={(e) =>
                      handleInputChange("include_cover", e.target.checked)
                    }
                  />
                }
                label="Generate Cover Art"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={generateNovel}
                  disabled={
                    generating ||
                    !formData.title ||
                    !formData.hero_type ||
                    !formData.heroine_type
                  }
                  startIcon={<BookIcon />}
                  sx={{
                    background:
                      "linear-gradient(45deg, #FF6B9D 30%, #C44569 90%)",
                    "&:hover": {
                      background:
                        "linear-gradient(45deg, #C44569 30%, #FF6B9D 90%)",
                    },
                  }}
                >
                  {generating ? "Generating..." : "Generate Romance Novel"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={resetForm}
                  startIcon={<RefreshIcon />}
                >
                  Reset Form
                </Button>

                {currentNovel?.status === "completed" && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={downloadNovel}
                    startIcon={<DownloadIcon />}
                  >
                    Download Novel
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Generation Progress */}
        {currentNovel && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Generation Progress: {currentNovel.title}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chapter {currentNovel.current_chapter} of{" "}
                    {currentNovel.total_chapters}(
                    {currentNovel.word_count.toLocaleString()} words)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={currentNovel.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={currentNovel.status}
                    color={
                      currentNovel.status === "completed"
                        ? "success"
                        : currentNovel.status === "failed"
                          ? "error"
                          : "primary"
                    }
                  />
                  <Chip
                    label={`${Math.round(currentNovel.progress)}%`}
                    variant="outlined"
                  />
                  {currentNovel.cover_url && (
                    <Chip label="Cover Generated" color="secondary" />
                  )}
                </Box>

                {currentNovel.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {currentNovel.error}
                  </Alert>
                )}

                {currentNovel.status === "completed" &&
                  currentNovel.novel_text && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setShowPreview(true)}
                        startIcon={<InfoIcon />}
                      >
                        Preview Novel
                      </Button>
                    </Box>
                  )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Novel Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Novel Preview: {currentNovel?.title}</DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 400, overflow: "auto" }}>
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              {currentNovel?.novel_text?.substring(0, 2000)}...
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
          <Button onClick={downloadNovel} variant="contained">
            Download Full Novel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RomanceNovelGenerator;
