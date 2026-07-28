# google-ai-mcp (MCPB Bundle)

FastMCP 3.2 server for Google AI services — Gemini Chat, Nano Banana image gen, Veo video, Lyria music, TTS, Live, Embeddings

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "google-ai-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "google_ai_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **generate_video_alias**: generate_video_alias
- **video_status**: video_status
- **music_generate_alias**: music_generate_alias
- **music_status**: music_status
- **music_download**: music_download
- **test_connection**: test_connection
- **movie_refine**: movie_refine
- **movie_generate**: movie_generate
- **movie_status**: movie_status
- **romance_tropes**: romance_tropes
- **romance_generate**: romance_generate
- **romance_status**: romance_status
- **romance_download**: romance_download
- **show_google_ai_status_card**: show_google_ai_status_card
- **health**: health
- **api_status**: api_status
- **chat**: chat
- **chat_models**: chat_models
- **generate_image**: generate_image
- **image_models**: image_models
- **generate_video**: generate_video
- **video_models**: video_models
- **generate_music**: generate_music
- **music_models**: music_models
- **text_to_speech**: text_to_speech
- **speech_options**: speech_options
- **omni_generate**: omni_generate
- **omni_models**: omni_models
- **omni_status**: omni_status
- **embeddings**: embeddings
- **list_all_models**: list_all_models
- **get_settings**: get_settings
- **save_settings**: save_settings
- **world_status**: world_status

## Requirements

- Python 3.12+
- uv
