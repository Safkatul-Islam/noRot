export interface ElevenLabsTtsRequest {
  apiKey: string
  voiceId: string
  text: string
  modelId: string
  /** 0..1 */
  stability: number
}

export interface ElevenLabsTtsResponse {
  audioBase64: string
  contentType: string
  bytes: number
}

export async function synthesizeElevenLabsTts(req: ElevenLabsTtsRequest): Promise<ElevenLabsTtsResponse> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(req.voiceId)}`
  const body = {
    text: req.text,
    model_id: req.modelId,
    voice_settings: {
      stability: clamp01(req.stability),
      similarity_boost: 0.75
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': req.apiKey,
      'content-type': 'application/json',
      accept: 'audio/mpeg'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const message = await safeReadText(res)
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${message}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('audio/')) {
    const message = await safeReadText(res)
    throw new Error(`Unexpected ElevenLabs TTS content-type: ${contentType || '(missing)'} ${message ? `(${message})` : ''}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const maxBytes = 12 * 1024 * 1024
  if (buffer.byteLength > maxBytes) {
    throw new Error(`ElevenLabs TTS response too large: ${buffer.byteLength} bytes`)
  }

  return { audioBase64: buffer.toString('base64'), contentType, bytes: buffer.byteLength }
}

export async function getElevenLabsConversationToken(params: { apiKey: string; agentId: string }): Promise<string> {
  const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/token')
  url.searchParams.set('agent_id', params.agentId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'xi-api-key': params.apiKey
    }
  })

  if (!res.ok) {
    const message = await safeReadText(res)
    throw new Error(`ElevenLabs conversation token failed (${res.status}): ${message}`)
  }

  const json = (await res.json()) as unknown
  if (!json || typeof json !== 'object') throw new Error('Invalid ElevenLabs token response')
  const token = (json as { token?: unknown }).token
  if (typeof token !== 'string' || token.length === 0) throw new Error('Missing ElevenLabs token')
  return token
}

export async function getElevenLabsSignedUrl(params: { apiKey: string; agentId: string }): Promise<string> {
  const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url')
  url.searchParams.set('agent_id', params.agentId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'xi-api-key': params.apiKey
    }
  })

  if (!res.ok) {
    const message = await safeReadText(res)
    throw new Error(`ElevenLabs signed url failed (${res.status}): ${message}`)
  }

  const json = (await res.json()) as unknown
  if (!json || typeof json !== 'object') throw new Error('Invalid ElevenLabs signed url response')
  const signedUrl = (json as { signed_url?: unknown; signedUrl?: unknown }).signed_url ?? (json as { signedUrl?: unknown }).signedUrl
  if (typeof signedUrl !== 'string' || signedUrl.length === 0) throw new Error('Missing ElevenLabs signed url')
  return signedUrl
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

