import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Palette as PaletteIcon,
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
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";

interface ImageGenerationRequest {
  prompt: string;
  model: string;
  aspect_ratio: string;
  num_images: number;
  style?: string;
  artist?: string;
  material?: string;
  client_id?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  metadata: any;
  timestamp: Date;
}

const ImageGenerator: React.FC = () => {
  const [request, setRequest] = useState<ImageGenerationRequest>({
    prompt: "",
    model: "nano-banana-2",
    aspect_ratio: "1:1",
    num_images: 1,
  });

  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedArtist, setSelectedArtist] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const aspectRatios = [
    { value: "1:1", label: "Square (1:1)" },
    { value: "4:3", label: "Classic (4:3)" },
    { value: "3:2", label: "Photo (3:2)" },
    { value: "2:3", label: "Photo portrait (2:3)" },
    { value: "3:4", label: "Tall photo (3:4)" },
    { value: "4:5", label: "Social portrait (4:5)" },
    { value: "5:4", label: "Social landscape (5:4)" },
    { value: "16:9", label: "Widescreen (16:9)" },
    { value: "9:16", label: "Portrait (9:16)" },
    { value: "21:9", label: "Ultrawide (21:9)" },
    { value: "1:4", label: "Vertical strip (1:4)" },
    { value: "4:1", label: "Horizontal strip (4:1)" },
    { value: "1:8", label: "Very tall (1:8)" },
    { value: "8:1", label: "Very wide (8:1)" },
  ];

  const models = [
    { value: "nano-banana-2", label: "Nano Banana 2 (Gemini 3.1 Flash Image)" },
    {
      value: "gemini-3.1-flash-image-preview",
      label: "gemini-3.1-flash-image-preview (same as above)",
    },
    { value: "nano-banana-pro", label: "Nano Banana Pro (Gemini 3 Pro Image)" },
    {
      value: "gemini-3-pro-image-preview",
      label: "gemini-3-pro-image-preview (same as Pro)",
    },
  ];

  const styles = [
    {
      value: "realistic",
      label: "Realistic",
      description: "Photorealistic images",
    },
    {
      value: "digital-art",
      label: "Digital Art",
      description: "Digital artwork and illustrations",
    },
    {
      value: "oil-painting",
      label: "Oil Painting",
      description: "Classical oil painting style",
    },
    {
      value: "watercolor",
      label: "Watercolor",
      description: "Soft watercolor paintings",
    },
    {
      value: "sketch",
      label: "Pencil Sketch",
      description: "Detailed pencil drawings",
    },
    {
      value: "3d-render",
      label: "3D Render",
      description: "Computer-generated 3D images",
    },
    {
      value: "pixel-art",
      label: "Pixel Art",
      description: "Retro pixel art style",
    },
    { value: "anime", label: "Anime", description: "Japanese anime style" },
    {
      value: "cartoon",
      label: "Cartoon",
      description: "Fun cartoon illustrations",
    },
    {
      value: "abstract",
      label: "Abstract",
      description: "Abstract artistic expressions",
    },
    {
      value: "minimalist",
      label: "Minimalist",
      description: "Clean, simple designs",
    },
    {
      value: "vintage",
      label: "Vintage",
      description: "Retro and vintage aesthetics",
    },
  ];

  const artists = [
    {
      value: "van-gogh",
      label: "Vincent van Gogh",
      description: "Post-impressionist master",
    },
    {
      value: "monet",
      label: "Claude Monet",
      description: "Impressionist painter",
    },
    { value: "picasso", label: "Pablo Picasso", description: "Cubist pioneer" },
    { value: "dali", label: "Salvador Dalí", description: "Surrealist artist" },
    { value: "warhol", label: "Andy Warhol", description: "Pop art icon" },
    {
      value: "hokusai",
      label: "Katsushika Hokusai",
      description: "Japanese ukiyo-e master",
    },
    {
      value: "da-vinci",
      label: "Leonardo da Vinci",
      description: "Renaissance genius",
    },
    {
      value: "rembrandt",
      label: "Rembrandt",
      description: "Dutch master painter",
    },
    {
      value: "klimt",
      label: "Gustav Klimt",
      description: "Art Nouveau painter",
    },
    { value: "kahlo", label: "Frida Kahlo", description: "Mexican surrealist" },
    {
      value: "pollock",
      label: "Jackson Pollock",
      description: "Abstract expressionist",
    },
    {
      value: "basquiat",
      label: "Jean-Michel Basquiat",
      description: "Neo-expressionist",
    },
  ];

  const materials = [
    {
      value: "oil-on-canvas",
      label: "Oil on Canvas",
      description: "Traditional oil painting",
    },
    { value: "acrylic", label: "Acrylic", description: "Modern acrylic paint" },
    {
      value: "watercolor",
      label: "Watercolor",
      description: "Transparent watercolor",
    },
    {
      value: "charcoal",
      label: "Charcoal",
      description: "Dark charcoal drawing",
    },
    { value: "pencil", label: "Pencil", description: "Graphite pencil sketch" },
    { value: "pastel", label: "Pastel", description: "Soft pastel drawing" },
    { value: "ink", label: "Ink", description: "Black ink illustration" },
    { value: "digital", label: "Digital", description: "Digital artwork" },
    {
      value: "photography",
      label: "Photography",
      description: "Photographic style",
    },
    {
      value: "sculpture",
      label: "Sculpture",
      description: "3D sculptural form",
    },
    { value: "mosaic", label: "Mosaic", description: "Tiled mosaic pattern" },
    { value: "collage", label: "Collage", description: "Mixed media collage" },
  ];

  const handleGenerate = async () => {
    if (!request.prompt.trim()) {
      setError("Please enter a prompt for image generation");
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Build enhanced prompt with style, artist, and material
    let enhancedPrompt = request.prompt;
    if (selectedStyle) {
      enhancedPrompt += `, ${styles.find((s) => s.value === selectedStyle)?.label.toLowerCase()} style`;
    }
    if (selectedArtist) {
      enhancedPrompt += `, in the style of ${artists.find((a) => a.value === selectedArtist)?.label}`;
    }
    if (selectedMaterial) {
      enhancedPrompt += `, ${materials.find((m) => m.value === selectedMaterial)?.label}`;
    }

    try {
      const response = await fetch("/api/v1/generate_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          prompt: enhancedPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Image generation failed");
      }

      if (result.mock_mode) {
        setInfoMessage(
          result.message ??
            "Imagen generation is running in mock mode. Configure GOOGLE_API_KEY (and GOOGLE_CLOUD_PROJECT if required) for live results.",
        );
      } else {
        setInfoMessage(null);
      }

      const newImages: GeneratedImage[] = result.images.map(
        (img: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          url: img.url,
          prompt: enhancedPrompt,
          metadata: {
            style: selectedStyle,
            artist: selectedArtist,
            material: selectedMaterial,
            aspect_ratio: request.aspect_ratio,
            model: request.model,
          },
          timestamp: new Date(),
        }),
      );

      setGeneratedImages((prev) => [...newImages, ...prev]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate images",
      );
      setInfoMessage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `image_${prompt.substring(0, 20).toLowerCase().replace(/\s+/g, "_")}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (_err) {
      setError("Failed to download image");
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
  };

  const handleClearImages = () => {
    setGeneratedImages([]);
    setError(null);
    setInfoMessage(null);
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        Image generation (Nano Banana 2)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Default model is <strong>Nano Banana 2</strong> (
        <code>gemini-3.1-flash-image-preview</code>) via the Gemini API native
        image modality. Use <strong>Nano Banana Pro</strong> for higher-quality
        or editing-oriented runs.
      </Typography>

      <Grid container spacing={3}>
        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
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
                  label="Image Prompt"
                  placeholder="Describe the image you want to generate..."
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
                    Number of Images: {request.num_images}
                  </Typography>
                  <Slider
                    value={request.num_images}
                    onChange={(_, value) =>
                      setRequest({ ...request, num_images: value as number })
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
                      <ImageIcon />
                    )
                  }
                  fullWidth
                >
                  {isGenerating ? "Generating..." : "Generate Images"}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Style Selection */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎭 Art Style
              </Typography>
              <Grid container spacing={1}>
                {styles.map((style) => (
                  <Grid item xs={6} key={style.value}>
                    <Chip
                      label={style.label}
                      onClick={() =>
                        setSelectedStyle(
                          selectedStyle === style.value ? "" : style.value,
                        )
                      }
                      color={
                        selectedStyle === style.value ? "primary" : "default"
                      }
                      variant={
                        selectedStyle === style.value ? "filled" : "outlined"
                      }
                      size="small"
                      sx={{ mb: 1, width: "100%" }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Artist Selection */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👨‍🎨 Artist Style
              </Typography>
              <Grid container spacing={1}>
                {artists.map((artist) => (
                  <Grid item xs={6} key={artist.value}>
                    <Chip
                      label={artist.label}
                      onClick={() =>
                        setSelectedArtist(
                          selectedArtist === artist.value ? "" : artist.value,
                        )
                      }
                      color={
                        selectedArtist === artist.value ? "primary" : "default"
                      }
                      variant={
                        selectedArtist === artist.value ? "filled" : "outlined"
                      }
                      size="small"
                      sx={{ mb: 1, width: "100%" }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Material Selection */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎨 Medium
              </Typography>
              <Grid container spacing={1}>
                {materials.map((material) => (
                  <Grid item xs={6} key={material.value}>
                    <Chip
                      label={material.label}
                      onClick={() =>
                        setSelectedMaterial(
                          selectedMaterial === material.value
                            ? ""
                            : material.value,
                        )
                      }
                      color={
                        selectedMaterial === material.value
                          ? "primary"
                          : "default"
                      }
                      variant={
                        selectedMaterial === material.value
                          ? "filled"
                          : "outlined"
                      }
                      size="small"
                      sx={{ mb: 1, width: "100%" }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Generated Images */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">
                  Generated Images ({generatedImages.length})
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleClearImages}
                  size="small"
                >
                  Clear All
                </Button>
              </Box>

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

              {generatedImages.length === 0 && !isGenerating && (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <PaletteIcon
                    sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No images generated yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter a prompt and select your preferences to generate
                    images
                  </Typography>
                </Box>
              )}

              {isGenerating && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress size={48} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Generating your images...
                  </Typography>
                </Box>
              )}

              <ImageList cols={2} gap={16}>
                {generatedImages.map((image) => (
                  <ImageListItem
                    key={image.id}
                    sx={{ borderRadius: 2, overflow: "hidden" }}
                  >
                    <img
                      src={image.url}
                      alt={image.prompt}
                      loading="lazy"
                      style={{ borderRadius: 8 }}
                    />
                    <ImageListItemBar
                      title={
                        image.prompt.substring(0, 50) +
                        (image.prompt.length > 50 ? "..." : "")
                      }
                      subtitle={new Date(image.timestamp).toLocaleString()}
                      actionIcon={
                        <Box>
                          <Tooltip title="Copy prompt">
                            <IconButton
                              sx={{ color: "white" }}
                              onClick={() => handleCopyPrompt(image.prompt)}
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download image">
                            <IconButton
                              sx={{ color: "white" }}
                              onClick={() =>
                                handleDownload(image.url, image.prompt)
                              }
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImageGenerator;
