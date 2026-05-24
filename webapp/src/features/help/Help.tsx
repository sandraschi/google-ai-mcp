import {
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Image as ImageIcon,
  Info as InfoIcon,
  MusicNote as MusicIcon,
  School as SchoolIcon,
  Movie as VideoIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import type React from "react";

const Help: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}
      >
        <HelpIcon sx={{ fontSize: 40, color: "primary.main" }} />
        Help & Documentation
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Welcome to Gemini Tools Studio! This comprehensive AI platform
          combines Google's latest AI models for text, image, music, and video
          generation. Below you'll find detailed guides for each feature.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Quick Start */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <SchoolIcon />
                Quick Start Guide
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="1. Configure API Settings"
                    secondary="Set up your Google AI Studio API key in Settings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="2. Choose Your Feature"
                    secondary="Select from Text Chat, Image, Music, or Video generation"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="3. Write Your Prompt"
                    secondary="Describe what you want to create in detail"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="4. Generate & Download"
                    secondary="Wait for generation and download your results"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* API Requirements */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <CodeIcon />
                API Requirements
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Google AI Studio API Key"
                    secondary="Required for all features"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Google Cloud Project ID"
                    secondary="For advanced features"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Rate Limits"
                    secondary="Be aware of API quotas and limits"
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 2 }}>
                <Link
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener"
                >
                  Get API Key from Google AI Studio →
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Feature Guides
        </Typography>

        {/* Text Chat Guide */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ChatIcon />
              Text Chat with Gemini
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>What it does:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Engage in natural conversations with Google's Gemini AI
                  models. Perfect for brainstorming, writing assistance, coding
                  help, and general knowledge questions.
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Best Practices:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Be specific in your questions"
                      secondary="Detailed prompts get better responses"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Use follow-up questions"
                      secondary="Build on previous responses"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Provide context"
                      secondary="Give relevant background information"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Example Prompts:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="'Write a Python function to sort a list of dictionaries by a specific key'" />
                  <Chip label="'Explain quantum computing in simple terms'" />
                  <Chip label="'Help me brainstorm ideas for a science fiction novel'" />
                  <Chip label="'Create a meal plan for a week with vegetarian options'" />
                </Box>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Available Models:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="Gemini 2.5 Pro" color="primary" />
                  <Chip label="Gemini 2.0 Flash" color="primary" />
                  <Chip label="Gemini 1.5 Pro" color="primary" />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Image Generation Guide */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <ImageIcon />
              Image Generation with Imagen
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>What it does:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Create stunning images from text descriptions using Google's
                  Imagen models. Generate artwork, illustrations, photos, and
                  concept designs.
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Prompt Writing Tips:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Describe the subject clearly"
                      secondary="What you want to see in the image"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Include style details"
                      secondary="Artistic style, lighting, mood"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Specify composition"
                      secondary="Camera angle, framing, perspective"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Mention technical details"
                      secondary="Resolution, quality, format"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Example Prompts:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="'A serene mountain landscape at sunset with golden light'" />
                  <Chip label="'Cyberpunk city street with neon lights and flying cars'" />
                  <Chip label="'Portrait of a wise old wizard in a magical library'" />
                  <Chip label="'Minimalist logo design for a tech startup'" />
                </Box>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Available Sizes:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="1024x1024 (Square)" />
                  <Chip label="1024x768 (Landscape)" />
                  <Chip label="768x1024 (Portrait)" />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Music Generation Guide */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <MusicIcon />
              Music Generation with Lyria
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>What it does:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Generate original music tracks using Google's Lyria models.
                  Create background music, jingles, ambient sounds, and full
                  compositions in various genres and styles.
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Music Description Tips:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Describe the overall feel"
                      secondary="Emotional tone and atmosphere"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Mention specific instruments"
                      secondary="What instruments should be featured"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Include tempo and rhythm"
                      secondary="Speed and rhythmic patterns"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Reference musical styles"
                      secondary="Genres, artists, or musical periods"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Example Prompts:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="'Upbeat electronic track with pulsing synths'" />
                  <Chip label="'Peaceful acoustic guitar melody for meditation'" />
                  <Chip label="'Epic orchestral piece with dramatic crescendos'" />
                  <Chip label="'Jazz fusion with saxophone and piano solos'" />
                </Box>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Available Genres:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="Electronic" />
                  <Chip label="Rock" />
                  <Chip label="Jazz" />
                  <Chip label="Classical" />
                  <Chip label="Pop" />
                  <Chip label="Ambient" />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Video Generation Guide */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <VideoIcon />
              Video Generation with Veo
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>What it does:</strong>
                </Typography>
                <Typography variant="body2" paragraph>
                  Create short videos from text descriptions using Google's Veo
                  models. Generate animations, scenes, transitions, and visual
                  effects.
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  <strong>Video Prompt Tips:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Describe actions and movements"
                      secondary="What should happen in the video"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Include lighting and atmosphere"
                      secondary="Visual mood and environment"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Specify camera angles"
                      secondary="Perspective and framing"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Mention style and effects"
                      secondary="Artistic style and visual effects"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Example Prompts:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="'A butterfly emerging from a cocoon in slow motion'" />
                  <Chip label="'Time-lapse of a city skyline from day to night'" />
                  <Chip label="'Abstract geometric shapes morphing and flowing'" />
                  <Chip label="'A car driving through a neon-lit cyberpunk street'" />
                </Box>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  <strong>Video Specifications:</strong>
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Chip label="Duration: 5-8 seconds" />
                  <Chip label="Aspect Ratios: 16:9, 9:16, 1:1, 4:3" />
                  <Chip label="Quality: Standard or HD" />
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Troubleshooting */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔧 Troubleshooting
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Common Issues:</strong>
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="API Key Error"
                    secondary="Check your Google AI Studio API key in Settings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Generation Fails"
                    secondary="Try simplifying your prompt or check API quotas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Slow Generation"
                    secondary="Complex prompts take longer. Be patient!"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Getting Better Results:</strong>
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Be Specific"
                    secondary="Detailed descriptions produce better results"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Experiment"
                    secondary="Try different prompts and settings"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Use References"
                    secondary="Mention styles, artists, or specific techniques"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Support */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📞 Support & Resources
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Documentation:</strong>
              </Typography>
              <Link
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener"
              >
                Google AI Documentation →
              </Link>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>API Reference:</strong>
              </Typography>
              <Link
                href="https://ai.google.dev/gemini-api/docs"
                target="_blank"
                rel="noopener"
              >
                Gemini API (Google Gen AI) docs →
              </Link>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Community:</strong>
              </Typography>
              <Link
                href="https://github.com/google/generative-ai-js"
                target="_blank"
                rel="noopener"
              >
                GitHub Repository →
              </Link>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Help;
