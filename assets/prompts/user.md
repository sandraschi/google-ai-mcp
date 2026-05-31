# Google AI MCP — usage notes

## Setup

Set `GOOGLE_API_KEY` for Gemini API features. Set `GOOGLE_CLOUD_PROJECT` for Veo and Lyria. Optional `LEWM_API_URL` defaults to `http://127.0.0.1:10927`.

## Examples

**Chat**

```
google_ai_chat(prompt="Summarize quantum computing in three bullets")
```

**Image**

```
google_ai_image(prompt="A watercolor lighthouse at dawn", operation="generate")
```

**Status**

```
google_ai_status()
```

**TTS (one-shot only)**

```
google_ai_speech(text="Hello from Gemini TTS", operation="tts")
```

For voice agents and Live API, install and use **speech-mcp** instead.
