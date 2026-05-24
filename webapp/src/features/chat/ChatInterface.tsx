import {
  AddPhotoAlternate as AddPhotoIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface ImageAttachment {
  id: string;
  dataUrl: string;
  name: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  persona?: string;
  /** Data URLs for user multimodal turns */
  imageUrls?: string[];
}

interface Persona {
  id: string;
  name: string;
  description: string;
  preprompt: string;
  avatar: string;
}

const personas: Persona[] = [
  {
    id: "general",
    name: "General Assistant",
    description: "Helpful and informative AI assistant",
    preprompt:
      "You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and helpful responses.",
    avatar: "🤖",
  },
  {
    id: "creative",
    name: "Creative Writer",
    description: "Imaginative and artistic writing assistant",
    preprompt:
      "You are a creative writer and storyteller. Help users develop ideas, write stories, and explore creative concepts with imagination and flair.",
    avatar: "✍️",
  },
  {
    id: "technical",
    name: "Technical Expert",
    description: "Programming and technical problem solver",
    preprompt:
      "You are a technical expert specializing in programming, software development, and problem-solving. Provide detailed, accurate technical guidance.",
    avatar: "💻",
  },
  {
    id: "business",
    name: "Business Consultant",
    description: "Strategic business and marketing advisor",
    preprompt:
      "You are a business consultant with expertise in strategy, marketing, and business development. Provide practical business advice and insights.",
    avatar: "📊",
  },
  {
    id: "educational",
    name: "Educational Tutor",
    description: "Patient and thorough educational guide",
    preprompt:
      "You are an educational tutor who explains complex topics in simple terms. Be patient, thorough, and encourage learning through examples.",
    avatar: "📚",
  },
  {
    id: "humorous",
    name: "Witty Companion",
    description: "Funny and entertaining conversation partner",
    preprompt:
      "You are a witty and entertaining conversation partner. Use humor, clever wordplay, and engaging storytelling while being helpful.",
    avatar: "😄",
  },
];

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<Persona>(personas[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>(
    [],
  );

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const MAX_ATTACHMENTS = 4;

  const [models, setModels] = useState([
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (recommended)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { value: "gemma-4-31b-it", label: "Gemma 4 31B IT" },
    { value: "gemma-4-26b-a4b-it", label: "Gemma 4 26B MoE IT" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Legacy)" },
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Legacy)" },
    { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Legacy)" },
  ]);

  const [selectedModel, setSelectedModel] = useState("gemini-3.1-pro-preview");

  // Fetch available models from API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/v1/chat/models");
        if (response.ok) {
          const data = await response.json();
          if (data.models && Array.isArray(data.models)) {
            const modelOptions = data.models.map((model: string) => {
              // Generate display label from model name dynamically
              const generateLabel = (modelName: string): string => {
                // Known model mappings for better display names
                const labelMap: Record<string, string> = {
                  "gemini-3.1-pro-preview": "Gemini 3.1 Pro (recommended)",
                  "gemini-3-flash-preview": "Gemini 3 Flash",
                  "gemini-3-pro-preview": "Gemini 3 Pro (legacy id)",
                  "gemini-3-pro": "Gemini 3 Pro",
                  "gemma-4-31b-it": "Gemma 4 31B IT (multimodal)",
                  "gemma-4-26b-a4b-it": "Gemma 4 26B MoE IT (multimodal)",
                  "gemma-3-27b-it": "Gemma 3 id → Gemma 4 31B",
                  "gemini-2.5-pro": "Gemini 2.5 Pro",
                  "gemini-2.0-flash-exp": "Gemini 2.0 Flash (Experimental)",
                  "gemini-1.5-pro-latest": "Gemini 1.5 Pro (Latest)",
                  "gemini-1.5-flash-latest": "Gemini 1.5 Flash (Latest)",
                };

                // If we have a known mapping, use it
                if (labelMap[modelName]) {
                  return labelMap[modelName];
                }

                // Otherwise, generate a readable label from the model name
                // Convert "gemini-3-pro-preview" to "Gemini 3 Pro Preview"
                return modelName
                  .split("-")
                  .map((part) => {
                    // Capitalize first letter of each part
                    const capitalized =
                      part.charAt(0).toUpperCase() + part.slice(1);
                    // Handle version numbers (e.g., "3" stays as "3")
                    if (part.match(/^\d+(\.\d+)?$/)) {
                      return part;
                    }
                    return capitalized;
                  })
                  .join(" ");
              };

              return {
                value: model,
                label: generateLabel(model),
              };
            });
            setModels(modelOptions);
            if (data.default_model) {
              setSelectedModel(data.default_model);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch chat models:", error);
      }
    };
    fetchModels();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files).slice(0, MAX_ATTACHMENTS)) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are supported.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(
          `Each image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
        );
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageAttachments((prev) => {
          if (prev.length >= MAX_ATTACHMENTS) return prev;
          return [
            ...prev,
            {
              id: `${Date.now()}-${file.name}`,
              dataUrl,
              name: file.name,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setImageAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async () => {
    if (isLoading) return;
    const trimmed = input.trim();
    if (!trimmed && imageAttachments.length === 0) return;

    const effectivePrompt =
      trimmed ||
      (imageAttachments.length > 0 ? "Describe this image in detail." : "");

    const dataUrls = imageAttachments.map((a) => a.dataUrl);
    const attachmentSnapshot = imageAttachments.map((a) => ({ ...a }));
    const savedInput = trimmed;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content:
        trimmed ||
        (imageAttachments.length > 0
          ? `(${imageAttachments.length} image${imageAttachments.length > 1 ? "s" : ""})`
          : ""),
      sender: "user",
      timestamp: new Date(),
      imageUrls: dataUrls.length > 0 ? dataUrls : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImageAttachments([]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: effectivePrompt,
          model: selectedModel,
          persona: selectedPersona.preprompt,
          ...(dataUrls.length > 0 ? { images: dataUrls } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Chat failed");
      }

      if (result.mock_mode) {
        setInfoMessage(
          result.message ??
            "Gemini chat is running in mock mode. Configure GOOGLE_API_KEY to enable live responses.",
        );
      } else {
        setInfoMessage(null);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: result.response,
        sender: "assistant",
        timestamp: new Date(),
        persona: selectedPersona.name,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInfoMessage(null);
      setInput(savedInput);
      setImageAttachments(attachmentSnapshot);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    setImageAttachments([]);
  };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        💬 Chat & Text Generation
      </Typography>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Settings Panel */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Chat Settings
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>AI Model</InputLabel>
                  <Select
                    value={selectedModel}
                    label="AI Model"
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {models.map((model) => (
                      <MenuItem key={model.value} value={model.value}>
                        {model.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="caption" color="text.secondary">
                  Gemma 4 and recent Gemini models support images: use the photo
                  button next to the message box, then ask about the picture.
                </Typography>

                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Persona
                  </Typography>
                  <Grid container spacing={1}>
                    {personas.map((persona) => (
                      <Grid item xs={6} key={persona.id}>
                        <Card
                          sx={{
                            cursor: "pointer",
                            border: selectedPersona.id === persona.id ? 2 : 1,
                            borderColor:
                              selectedPersona.id === persona.id
                                ? "primary.main"
                                : "divider",
                            "&:hover": {
                              borderColor: "primary.main",
                            },
                          }}
                          onClick={() => setSelectedPersona(persona)}
                        >
                          <CardContent sx={{ p: 2, textAlign: "center" }}>
                            <Typography variant="h4" sx={{ mb: 1 }}>
                              {persona.avatar}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {persona.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {persona.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleClearChat}
                  fullWidth
                >
                  Clear Chat
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Persona Details */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedPersona.avatar} {selectedPersona.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedPersona.description}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  backgroundColor: "action.hover",
                  p: 2,
                  borderRadius: 1,
                  fontStyle: "italic",
                }}
              >
                "{selectedPersona.preprompt}"
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chat Panel */}
        <Grid
          item
          xs={12}
          md={8}
          sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <Card
            elevation={2}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <CardContent
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                p: 0,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {infoMessage && (
                <Box sx={{ p: 2, flexShrink: 0 }}>
                  <Alert severity="warning" sx={{ mb: 0 }}>
                    {infoMessage}
                  </Alert>
                </Box>
              )}
              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minHeight: 0,
                }}
              >
                {messages.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      gutterBottom
                    >
                      Start a conversation with {selectedPersona.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type a message below to begin chatting
                    </Typography>
                  </Box>
                )}

                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      display: "flex",
                      justifyContent:
                        message.sender === "user" ? "flex-end" : "flex-start",
                      mb: 2,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: "70%",
                        backgroundColor:
                          message.sender === "user"
                            ? "primary.main"
                            : "background.paper",
                        color:
                          message.sender === "user"
                            ? "primary.contrastText"
                            : "text.primary",
                        borderRadius: 2,
                        position: "relative",
                      }}
                    >
                      {message.sender === "assistant" && message.persona && (
                        <Chip
                          label={message.persona}
                          size="small"
                          sx={{ mb: 1, fontSize: "0.7rem" }}
                        />
                      )}

                      <Typography
                        variant="body1"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {message.content}
                      </Typography>

                      {message.imageUrls && message.imageUrls.length > 0 && (
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                          sx={{ mt: 1 }}
                        >
                          {message.imageUrls.map((url, idx) => (
                            <Box
                              component="img"
                              key={`${message.id}-img-${idx}`}
                              src={url}
                              alt=""
                              sx={{
                                maxHeight: 120,
                                maxWidth: 160,
                                borderRadius: 1,
                                objectFit: "cover",
                              }}
                            />
                          ))}
                        </Stack>
                      )}

                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1,
                          opacity: 0.7,
                        }}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>

                      <Tooltip title="Copy message">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMessage(message.content)}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            opacity: 0.7,
                            "&:hover": { opacity: 1 },
                          }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  </Box>
                ))}

                {isLoading && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-start",
                      mb: 2,
                    }}
                  >
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          {selectedPersona.name} is thinking...
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Divider sx={{ flexShrink: 0 }} />
              <Box sx={{ p: 2, flexShrink: 0 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {imageAttachments.length > 0 && (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.75}
                    sx={{ mb: 1 }}
                  >
                    {imageAttachments.map((a) => (
                      <Chip
                        key={a.id}
                        label={a.name}
                        size="small"
                        onDelete={() => removeAttachment(a.id)}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                )}

                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handlePickImages}
                  />
                  <IconButton
                    color="primary"
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach images"
                    sx={{ mb: 0.5 }}
                  >
                    <AddPhotoIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={`Chat with ${selectedPersona.name}… (optional text if you attach images)`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={
                      isLoading ||
                      (!input.trim() && imageAttachments.length === 0)
                    }
                    sx={{ borderRadius: 2, minWidth: 56 }}
                  >
                    {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatInterface;
