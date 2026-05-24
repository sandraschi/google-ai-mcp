import {
  CheckCircle as CheckCircleIcon,
  Movie as MovieIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  SkipNext as SkipNextIcon,
  Videocam as VideocamIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  styled,
} from "@mui/material";
import type React from "react";
import { useState } from "react";

// Import the VideoGenerator component
import VideoGenerator from "./VideoGenerator";

// Movie styles with enhanced visual appeal
const movieStyles = [
  {
    id: "ghibli",
    name: "Studio Ghibli",
    description: "Whimsical, hand-drawn animation with deep emotional themes",
    icon: "🎨",
    color: "#4caf50",
  },
  {
    id: "pixar",
    name: "Pixar",
    description: "Heartwarming stories with cutting-edge 3D animation",
    icon: "✨",
    color: "#2196f3",
  },
  {
    id: "noir",
    name: "Film Noir",
    description:
      "Gritty black-and-white detective stories with dramatic lighting",
    icon: "🕵️",
    color: "#212121",
  },
  {
    id: "comedy",
    name: "Slapstick Comedy",
    description: "Physical humor and exaggerated situations",
    icon: "🤹",
    color: "#ff9800",
  },
  {
    id: "sci-fi",
    name: "Sci-Fi",
    description: "Futuristic technology and space exploration",
    icon: "🚀",
    color: "#9c27b0",
  },
  {
    id: "fantasy",
    name: "High Fantasy",
    description: "Epic quests in magical worlds",
    icon: "🏰",
    color: "#673ab7",
  },
];

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[8],
  },
}));

const StepContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

type SnippetStatus = "pending" | "generating" | "completed" | "error";

interface Snippet {
  id: string;
  prompt: string;
  status: SnippetStatus;
  progress: number;
  error?: string;
  videoUrl?: string;
}

interface MovieState {
  title: string;
  style: string;
  prompt: string;
  script: string;
  snippets: Snippet[];
  currentStep: number;
  isGenerating: boolean;
  error?: string;
  success?: string;
}

const initialMovieState: MovieState = {
  title: "",
  style: "pixar",
  prompt: "",
  script: "",
  snippets: [],
  currentStep: 0,
  isGenerating: false,
};

const steps = [
  "Describe Your Movie",
  "Refine Script",
  "Generate Scenes",
  "Create Movie",
];

// Define tab types
type TabType = "movie" | "video";

export const MoviePipeline: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("movie");
  const [movieState, setMovieState] = useState<MovieState>(initialMovieState);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setMovieState((prev) => ({ ...prev, [name]: value }));
  };

  const handleStyleChange = (event: SelectChangeEvent) => {
    setMovieState((prev) => ({ ...prev, style: event.target.value as string }));
  };

  const generateScript = async () => {
    if (!movieState.prompt.trim()) {
      setMovieState((prev) => ({
        ...prev,
        error: "Please enter a movie idea",
      }));
      return;
    }

    setMovieState((prev) => ({
      ...prev,
      isGenerating: true,
      error: undefined,
    }));

    try {
      const selectedStyle = movieStyles.find((s) => s.id === movieState.style);

      const response = await fetch("/api/v1/movie/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story_prompt: movieState.prompt,
          style_reference: selectedStyle?.name || "cinematic",
          music_style: "epic orchestral",
          genre: movieState.style,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();

      const script =
        result.refined_story ||
        `Title: "${movieState.title || "Untitled Movie"}"

Unable to generate detailed script. Please try again or configure API credentials.`;

      setMovieState((prev) => ({
        ...prev,
        script: script,
        currentStep: 1,
        success: "Script generated successfully!",
      }));
      setOpenSnackbar(true);
    } catch (error) {
      console.error("Script generation error:", error);
      setMovieState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate script. Please try again.",
      }));
    } finally {
      setMovieState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const generateSnippets = async () => {
    if (!movieState.script.trim()) {
      setMovieState((prev) => ({
        ...prev,
        error: "Please generate a script first",
      }));
      return;
    }

    setMovieState((prev) => ({
      ...prev,
      isGenerating: true,
      error: undefined,
    }));

    try {
      // Parse SEGMENT prompts from the refined script
      // Format from API: SEGMENT 1: [detailed prompt]
      const segmentRegex =
        /SEGMENT\s*(\d+):\s*([^\n]+(?:\n(?!SEGMENT)[^\n]*)*)/gi;
      const matches = [...movieState.script.matchAll(segmentRegex)];

      let snippets: Snippet[] = [];

      if (matches.length > 0) {
        // Use parsed segments from the LLM-generated script
        snippets = matches.map((match, index) => ({
          id: String(index + 1),
          prompt: match[2].trim().replace(/\n/g, " ").substring(0, 500),
          status: "pending" as SnippetStatus,
          progress: 0,
        }));
      } else {
        // Fallback: Split by "Scene" if no SEGMENT format found
        const sceneRegex =
          /Scene\s*(\d+)[:\s]*([^\n]+(?:\n(?!Scene)[^\n]*)*)/gi;
        const sceneMatches = [...movieState.script.matchAll(sceneRegex)];

        if (sceneMatches.length > 0) {
          snippets = sceneMatches.map((match, index) => ({
            id: String(index + 1),
            prompt: match[2].trim().replace(/\n/g, " ").substring(0, 500),
            status: "pending" as SnippetStatus,
            progress: 0,
          }));
        } else {
          // Last fallback: Split script into chunks
          const lines = movieState.script
            .split("\n")
            .filter((line) => line.trim().length > 20);
          snippets = lines.slice(0, 8).map((line, index) => ({
            id: String(index + 1),
            prompt: line.trim().substring(0, 500),
            status: "pending" as SnippetStatus,
            progress: 0,
          }));
        }
      }

      if (snippets.length === 0) {
        throw new Error(
          "Could not parse any scenes from the script. Please edit the script to include clear scene descriptions.",
        );
      }

      setMovieState((prev) => ({
        ...prev,
        snippets: snippets,
        currentStep: 2,
        success: `${snippets.length} scenes extracted successfully!`,
      }));
      setOpenSnackbar(true);
    } catch (error) {
      console.error("Snippet generation error:", error);
      setMovieState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate scenes. Please try again.",
      }));
    } finally {
      setMovieState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  const generateVideos = async () => {
    if (movieState.snippets.length === 0) {
      setMovieState((prev) => ({ ...prev, error: "No scenes to generate" }));
      return;
    }

    setMovieState((prev) => ({
      ...prev,
      isGenerating: true,
      currentStep: 3,
      snippets: prev.snippets.map((s) => ({
        ...s,
        status: "generating" as SnippetStatus,
        progress: 0,
      })),
    }));

    try {
      // Prepare segments for the movie generation API
      const segments = movieState.snippets.map((snippet, index) => ({
        segment_number: index + 1,
        prompt: snippet.prompt,
        approved: true,
      }));

      const response = await fetch("/api/v1/movie/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          story_overview: movieState.script.substring(0, 500),
          segments: segments,
          user_id: `user-${Date.now()}`,
          movie_title: movieState.title || "Untitled Movie",
          style_reference: movieState.style,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();
      const movieId = result.movie_id;

      if (!movieId) {
        throw new Error("No movie ID returned from API");
      }

      // Poll for movie generation status
      let completed = false;
      let pollCount = 0;
      const maxPolls = 120; // 10 minutes max (5s intervals)

      while (!completed && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        pollCount++;

        try {
          const statusResponse = await fetch(`/api/v1/movie/${movieId}/status`);
          if (!statusResponse.ok) continue;

          const statusData = await statusResponse.json();

          // Update snippet statuses based on API response
          if (statusData.segments) {
            setMovieState((prev) => ({
              ...prev,
              snippets: prev.snippets.map((s, idx) => {
                const apiSegment = statusData.segments[idx];
                if (!apiSegment) return s;

                return {
                  ...s,
                  status:
                    apiSegment.status === "completed"
                      ? "completed"
                      : apiSegment.status === "failed"
                        ? "error"
                        : apiSegment.status === "generating"
                          ? "generating"
                          : "pending",
                  progress: apiSegment.progress || 0,
                  videoUrl: apiSegment.video_path,
                  error: apiSegment.error,
                };
              }),
            }));
          }

          if (statusData.status === "completed") {
            completed = true;
            setMovieState((prev) => ({
              ...prev,
              isGenerating: false,
              success: "Movie generated successfully!",
            }));
            setOpenSnackbar(true);
          } else if (statusData.status === "failed") {
            throw new Error("Movie generation failed");
          }
        } catch (pollError) {
          console.error("Status poll error:", pollError);
        }
      }

      if (!completed) {
        throw new Error(
          "Movie generation timed out. Check the status page for updates.",
        );
      }
    } catch (error) {
      console.error("Video generation error:", error);
      setMovieState((prev) => ({
        ...prev,
        isGenerating: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate videos. Please try again.",
        snippets: prev.snippets.map((s) =>
          s.status === "generating"
            ? { ...s, status: "error" as SnippetStatus }
            : s,
        ),
      }));
    }
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  const selectedStyle =
    movieStyles.find((style) => style.id === movieState.style) ||
    movieStyles[0];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabType) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {activeTab === "movie" ? "Movie Pipeline" : "Video Generator"}
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab
            value="movie"
            label="Movie Pipeline"
            icon={<MovieIcon />}
            iconPosition="start"
          />
          <Tab
            value="video"
            label="Video Generator"
            icon={<VideocamIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Describe your movie idea, and Gemini will help you bring it to life with
        AI-generated video snippets.
      </Typography>

      {activeTab === "movie" ? (
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Stepper
            activeStep={movieState.currentStep}
            alternativeLabel
            sx={{ mb: 4 }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {movieState.error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() =>
                setMovieState((prev) => ({ ...prev, error: undefined }))
              }
            >
              {movieState.error}
            </Alert>
          )}

          <StepContainer>
            {movieState.currentStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Describe Your Movie
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Movie Title (Optional)"
                      name="title"
                      value={movieState.title}
                      onChange={handleInputChange}
                      margin="normal"
                    />

                    <FormControl fullWidth margin="normal">
                      <InputLabel>Style</InputLabel>
                      <Select
                        value={movieState.style}
                        label="Style"
                        onChange={handleStyleChange}
                      >
                        {movieStyles.map((style) => (
                          <MenuItem key={style.id} value={style.id}>
                            {style.icon} {style.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      label="Describe your movie idea"
                      name="prompt"
                      value={movieState.prompt}
                      onChange={handleInputChange}
                      margin="normal"
                      placeholder="A heartwarming story about a robot learning to love in a post-apocalyptic world..."
                    />

                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={generateScript}
                        disabled={
                          movieState.isGenerating || !movieState.prompt.trim()
                        }
                        startIcon={
                          movieState.isGenerating ? (
                            <CircularProgress size={20} />
                          ) : (
                            <PlayArrowIcon />
                          )
                        }
                      >
                        {movieState.isGenerating
                          ? "Generating..."
                          : "Generate Script"}
                      </Button>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper
                      elevation={0}
                      sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}
                    >
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        {selectedStyle.icon} {selectedStyle.name}
                      </Typography>
                      <Typography variant="body2">
                        {selectedStyle.description}
                      </Typography>
                    </Paper>

                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="subtitle2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Tips for better results:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        <li>
                          <Typography variant="body2">
                            Be specific about characters and setting
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Describe the mood and tone
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="body2">
                            Mention any specific visual elements
                          </Typography>
                        </li>
                      </ul>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {movieState.currentStep === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Refine Your Script
                </Typography>

                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={movieState.script}
                  onChange={(e) =>
                    setMovieState((prev) => ({
                      ...prev,
                      script: e.target.value,
                    }))
                  }
                  margin="normal"
                  sx={{ mb: 2 }}
                />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setMovieState((prev) => ({ ...prev, currentStep: 0 }))
                    }
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={generateSnippets}
                    disabled={movieState.isGenerating}
                    startIcon={
                      movieState.isGenerating ? (
                        <CircularProgress size={20} />
                      ) : (
                        <SkipNextIcon />
                      )
                    }
                  >
                    {movieState.isGenerating
                      ? "Analyzing..."
                      : "Generate Scenes"}
                  </Button>
                </Box>
              </Box>
            )}

            {movieState.currentStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Generated Scenes
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Review the scenes that will be used to generate your movie.
                  You can edit the prompts for better results.
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {movieState.snippets.map((snippet, index) => (
                    <Grid item xs={12} sm={6} md={4} key={snippet.id}>
                      <StyledCard>
                        <CardContent>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            Scene {index + 1}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1, mb: 1.5 }}>
                            {snippet.prompt}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={snippet.progress}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </CardContent>
                        <CardActions
                          sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                        >
                          <Box>
                            {snippet.status === "completed" && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <CheckCircleIcon
                                  fontSize="small"
                                  sx={{ mr: 0.5 }}
                                />{" "}
                                Ready
                              </Typography>
                            )}
                            {snippet.status === "generating" && (
                              <Typography
                                variant="caption"
                                color="info.main"
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <CircularProgress size={14} sx={{ mr: 1 }} />{" "}
                                {snippet.progress}%
                              </Typography>
                            )}
                            {snippet.status === "pending" && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Pending
                              </Typography>
                            )}
                          </Box>
                          <Box>
                            <Tooltip title="Regenerate">
                              <IconButton
                                size="small"
                                disabled={movieState.isGenerating}
                              >
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardActions>
                      </StyledCard>
                    </Grid>
                  ))}
                </Grid>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 4,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setMovieState((prev) => ({ ...prev, currentStep: 1 }))
                    }
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={generateVideos}
                    disabled={
                      movieState.isGenerating ||
                      movieState.snippets.some((s) => s.status === "generating")
                    }
                    startIcon={
                      movieState.isGenerating ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PlayArrowIcon />
                      )
                    }
                  >
                    {movieState.isGenerating
                      ? "Generating..."
                      : "Generate Movie"}
                  </Button>
                </Box>
              </Box>
            )}

            {movieState.currentStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Your Movie is Ready!
                </Typography>

                <Box
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    p: 3,
                    textAlign: "center",
                    border: "2px dashed",
                    borderColor: "divider",
                    minHeight: 300,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Typography variant="h5" color="primary">
                    🎬 {movieState.title || "Your Movie Title"}
                  </Typography>

                  <Box sx={{ width: "100%", maxWidth: 600, mx: "auto", my: 2 }}>
                    <video
                      controls
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                    >
                      <source src="" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Preview of your generated movie will appear here
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrowIcon />}
                      disabled={movieState.snippets.some(
                        (s) => s.status !== "completed",
                      )}
                    >
                      Play Movie
                    </Button>

                    <Button
                      variant="outlined"
                      color="primary"
                      disabled={movieState.snippets.some(
                        (s) => s.status !== "completed",
                      )}
                    >
                      Download
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={() => setMovieState(initialMovieState)}
                    >
                      Start Over
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Generated Scenes
                  </Typography>

                  <Grid container spacing={2}>
                    {movieState.snippets.map((snippet, index) => (
                      <Grid item xs={12} sm={6} md={3} key={snippet.id}>
                        <Card>
                          <Box
                            sx={{
                              height: 120,
                              bgcolor: "action.hover",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative",
                            }}
                          >
                            {snippet.status === "completed" ? (
                              <Box sx={{ textAlign: "center", p: 2 }}>
                                <CheckCircleIcon
                                  color="success"
                                  fontSize="large"
                                />
                                <Typography variant="caption" display="block">
                                  Scene {index + 1}
                                </Typography>
                              </Box>
                            ) : (
                              <CircularProgress />
                            )}
                          </Box>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="body2" noWrap>
                              {snippet.prompt.substring(0, 50)}
                              {snippet.prompt.length > 50 ? "..." : ""}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            )}
          </StepContainer>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          <VideoGenerator />
        </Paper>
      )}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {movieState.success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MoviePipeline;
