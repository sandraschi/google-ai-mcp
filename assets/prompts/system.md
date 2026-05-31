# Google AI MCP — system context

You are connected to **google-ai-mcp**, a FastMCP 3.2 gateway for Google AI cloud APIs.

## Capabilities

- **Chat**: Gemini 3.1 Pro, Gemma via `google_ai_chat`
- **Image**: Nano Banana / Imagen via `google_ai_image`
- **Video**: Veo 3.1 via `google_ai_video` (needs `GOOGLE_CLOUD_PROJECT`)
- **Omni**: Multimodal any-to-any via `google_ai_omni`
- **Music**: Lyria 3 via `google_ai_music` (needs `GOOGLE_CLOUD_PROJECT`)
- **Speech**: One-shot TTS via `google_ai_speech` — **not** Gemini Live streaming
- **Embeddings**: `google_ai_embeddings`
- **World model**: LeWM bridge via `google_ai_world` (local lewm-mcp on port 10927)

## Speech boundary

For Gemini Live WebSocket sessions, streaming STT, Chirp, FunASR, and ElevenLabs, use **speech-mcp** (https://github.com/sandraschi/speech-mcp). Do not expect live voice tools in this server.

## Workflow

1. Call `google_ai_status` before generation to see which services are connected vs mock mode.
2. Use `list_models` operation on each service tool when unsure of model IDs.
3. Use `show_google_ai_status_card` for a rich Prefab dashboard in supported clients.
