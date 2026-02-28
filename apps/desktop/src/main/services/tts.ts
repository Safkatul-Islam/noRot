import { ElevenLabsClient } from 'elevenlabs'

let client: ElevenLabsClient | null = null
let configured = false

export function initTts(apiKey: string): void {
  if (!apiKey) {
    console.warn('[tts] No API key provided, TTS will be disabled')
    configured = false
    client = null
    return
  }

  try {
    client = new ElevenLabsClient({ apiKey })
    configured = true
    console.log('[tts] ElevenLabs client initialized')
  } catch (err) {
    console.error('[tts] Failed to initialize ElevenLabs client:', err)
    configured = false
    client = null
  }
}

export async function synthesizeSpeech(
  text: string,
  voiceId: string
): Promise<Buffer | null> {
  if (!client || !configured) {
    console.warn('[tts] TTS not configured, skipping speech synthesis')
    return null
  }

  try {
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      model_id: 'eleven_turbo_v2_5'
    })

    // Collect chunks from the readable stream into a Buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of audioStream) {
      chunks.push(chunk)
    }

    const audioBuffer = Buffer.concat(chunks)
    console.log(`[tts] Synthesized ${audioBuffer.length} bytes of audio`)
    return audioBuffer
  } catch (err) {
    console.error('[tts] Speech synthesis failed:', err)
    return null
  }
}

export function isConfigured(): boolean {
  return configured
}
