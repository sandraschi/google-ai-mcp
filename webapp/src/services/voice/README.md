# Voice Service

A modular, type-safe voice service for text-to-speech functionality using the ElevenLabs API.

## Features

- 🎤 Text-to-speech conversion
- 🎚️ Voice style management
- 🔊 Audio playback controls
- 🔄 React hooks and components
- 🔒 Type-safe implementation
- 🎛️ Volume and playback controls
- 🔄 Audio caching for better performance

## Installation

```bash
# If you need to install dependencies
npm install @mui/material @emotion/react @emotion/styled
```

## Usage

### Basic Usage

```typescript
import { voiceService } from './services/voice';

// Initialize with your API key
await voiceService.initialize('your-elevenlabs-api-key');

// Convert text to speech
const audioResponse = await voiceService.textToSpeech('Hello, world!');

// Play the audio
voiceService.playAudio(audioResponse.audio);
```

### Using React Hooks

```typescript
import { useVoice } from './services/voice';

function MyComponent() {
  const {
    isInitialized,
    isPlaying,
    currentVoice,
    availableVoices,
    speak,
    play,
    pause,
    stop,
    setVoice,
    setVolume,
  } = useVoice('your-elevenlabs-api-key');

  // Speak immediately when component mounts
  useEffect(() => {
    if (isInitialized) {
      speak('Hello from React!');
    }
  }, [isInitialized, speak]);

  return (
    <div>
      <button onClick={() => speak('Hello!')}>Speak</button>
      <button onClick={isPlaying ? pause : play}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={stop}>Stop</button>
      
      <select 
        value={currentVoice?.id || ''}
        onChange={(e) => setVoice(e.target.value)}
      >
        {availableVoices.map(voice => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Using the VoicePlayer Component

```typescript
import { VoicePlayer } from './services/voice';

function App() {
  return (
    <div>
      <h1>Voice Player Demo</h1>
      <VoicePlayer 
        apiKey="your-elevenlabs-api-key"
        text="This is a demo of the VoicePlayer component."
        autoPlay
        showControls
      />
    </div>
  );
}
```

## API Reference

### VoiceService

#### Methods

- `initialize(apiKey: string, options?: VoiceCloningOptions): Promise<void>`
  - Initializes the voice service with your API key.

- `textToSpeech(text: string, options?: VoiceCloningOptions): Promise<AudioResponse>`
  - Converts text to speech and returns the audio data.

- `playAudio(audioData: ArrayBuffer): void`
  - Plays the provided audio data.

- `pauseAudio(): void`
  - Pauses the currently playing audio.

- `stopAudio(): void`
  - Stops the currently playing audio.

- `setVolume(volume: number): void`
  - Sets the playback volume (0 to 1).

- `setVoiceStyle(voiceId: string): boolean`
  - Sets the current voice style by ID.
  - Returns `true` if the voice was found and set.

### useVoice Hook

#### Parameters

- `apiKey` (string, required): Your ElevenLabs API key
- `options` (object, optional): Configuration options
  - `autoInitialize` (boolean): Whether to initialize automatically (default: `true`)
  - `initialVolume` (number): Initial volume level (0-1, default: 1)
  - `onPlayStart` (function): Callback when playback starts
  - `onPlayEnd` (function): Callback when playback ends
  - `onError` (function): Error handler

#### Return Value

An object containing:

- `isInitialized` (boolean): Whether the service is ready
- `isPlaying` (boolean): Whether audio is currently playing
- `isSynthesizing` (boolean): Whether text is being converted to speech
- `currentTime` (number): Current playback position in seconds
- `duration` (number): Total duration of current audio in seconds
- `volume` (number): Current volume level (0-1)
- `currentVoice` (VoiceStyle | null): Currently selected voice
- `availableVoices` (VoiceStyle[]): List of available voices
- `error` (Error | null): Any error that occurred
- `speak` (function): Convert text to speech and play it
- `play` (function): Start or resume playback
- `pause` (function): Pause playback
- `stop` (function): Stop playback
- `setVoice` (function): Change the current voice
- `setVolume` (function): Change the volume
- `seek` (function): Seek to a specific position (not yet implemented)

### VoicePlayer Component

#### Props

- `apiKey` (string, required): Your ElevenLabs API key
- `text` (string, optional): Text to speak
- `autoPlay` (boolean, optional): Whether to start playing automatically (default: `false`)
- `showControls` (boolean, optional): Whether to show playback controls (default: `true`)
- `onError` (function, optional): Error handler
- `style` (object, optional): Custom styles

## Voice Styles

The service comes with several built-in voice styles, and you can also load custom voices from the ElevenLabs API.

### Built-in Voice Styles

- **Default Voice**: A clear, neutral voice for general use
- **Narrator**: Professional narration voice
- **Character**: Expressive voice for dialogues
- **Dramatic**: Voice with dramatic emphasis
- **Soothing**: Calm and relaxing voice

### Custom Voices

You can use custom voices from your ElevenLabs account by their voice ID:

```typescript
// Set a custom voice by ID
voiceService.setVoiceStyle('custom-voice-id');
```

## Error Handling

The service provides several ways to handle errors:

1. **Try/Catch Blocks**:
   ```typescript
   try {
     await voiceService.textToSpeech('Hello');
   } catch (error) {
     console.error('Text-to-speech failed:', error);
   }
   ```

2. **Error Event Listener**:
   ```typescript
   voiceService.on('error', (error) => {
     console.error('Voice service error:', error);
   });
   ```

3. **React Error Boundary**:
   Wrap your components with an ErrorBoundary to catch and display errors gracefully.

## Performance Tips

- **Caching**: The service caches audio responses to avoid redundant API calls.
- **Preloading**: You can preload voices to reduce latency when speaking.
- **Batch Processing**: For multiple texts, consider batching them together.

## Browser Support

The service works in all modern browsers that support the Web Audio API:

- Chrome 35+
- Firefox 25+
- Edge 12+
- Safari 11+
- Opera 22+

## License

MIT
