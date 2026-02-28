import { getNorotAPI } from '@/lib/norot-api';
const API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
export class ElevenLabsClientError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ElevenLabsClientError';
    }
}
export class ElevenLabsClient {
    async isConfigured() {
        const api = getNorotAPI();
        const hasKey = typeof api.hasElevenLabsKey === 'function'
            ? await api.hasElevenLabsKey().catch(() => false)
            : false;
        if (!hasKey) {
            console.warn('[ElevenLabs] isConfigured: false — no API key found');
        }
        return hasKey;
    }
    async synthesize(text, voiceId, settings) {
        const api = getNorotAPI();
        // In Electron we proxy through the main process to avoid renderer CORS issues.
        if (typeof api.synthesizeElevenLabsTts === 'function') {
            try {
                const base64 = await api.synthesizeElevenLabsTts(text, voiceId, settings);
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++)
                    bytes[i] = binary.charCodeAt(i);
                return bytes.buffer;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                try {
                    const parsed = JSON.parse(msg);
                    throw new ElevenLabsClientError(parsed.message ?? msg, parsed.statusCode);
                }
                catch {
                    throw new ElevenLabsClientError(msg);
                }
            }
        }
        const url = `${API_BASE}/${voiceId}`;
        const stability01 = Number.isFinite(settings.stability)
            ? settings.stability > 1
                ? Math.max(0, Math.min(settings.stability / 100, 1))
                : Math.max(0, Math.min(settings.stability, 1))
            : 0.5;
        const stability = stability01 <= 0.25 ? 0.0 : stability01 <= 0.75 ? 0.5 : 1.0;
        const modelId = settings.model || 'eleven_v3';
        console.log('[ElevenLabs] synthesize: model=%s stability=%s speed=%s voiceId=%s textLen=%d', modelId, stability, settings.speed, voiceId, text.length);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: {
                    stability,
                    similarity_boost: 0.75,
                    speed: settings.speed,
                },
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new ElevenLabsClientError(`ElevenLabs API error (${response.status}): ${errorText}`, response.status);
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('audio/')) {
            throw new ElevenLabsClientError(`ElevenLabs returned non-audio content-type: ${contentType}`);
        }
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength < 1000) {
            throw new ElevenLabsClientError(`ElevenLabs returned suspiciously small audio (${buffer.byteLength} bytes)`);
        }
        return buffer;
    }
}
