# Fallback Audio Files

Pre-generated MP3 files used when the ElevenLabs API is unavailable (no API key, network error, etc.).
These files are checked into the repo so the demo works offline.

## File structure

```
assets/audio/
  calm_friend/
    severity-1.mp3
    severity-2.mp3
    severity-3.mp3
    severity-4.mp3
  coach/
    severity-1.mp3
    ...
  tough_love/
    severity-1.mp3
    ...
```

## How to generate

1. Get an ElevenLabs API key from https://elevenlabs.io
2. Run from the `apps/desktop/` directory:

```bash
ELEVENLABS_API_KEY=your_key_here npx tsx assets/audio/generate-fallbacks.ts
```

This calls the ElevenLabs TTS API for each persona/severity combination and saves the resulting MP3 files. It generates 12 files total (3 personas x 4 severity levels).

Note: do not commit API keys. Use environment variables (like the command above) or store the key in the app's local settings.

## Naming convention

`{persona}/severity-{N}.mp3` where:
- `persona` is one of: `calm_friend`, `coach`, `tough_love`
- `N` is the severity level: 1 (drifting), 2 (distracted), 3 (procrastinating), 4 (crisis)

Severity 0 (focused) has no audio — the user is on track.
