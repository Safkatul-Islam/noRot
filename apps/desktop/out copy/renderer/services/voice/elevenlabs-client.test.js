import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElevenLabsClient } from './elevenlabs-client';
describe('ElevenLabsClient', () => {
    const originalNorot = window.norot;
    const originalFetch = globalThis.fetch;
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        window.norot = originalNorot;
        globalThis.fetch = originalFetch;
    });
    it('proxies synthesis via main process when available', async () => {
        const bytes = new Uint8Array(2048);
        bytes[0] = 1;
        bytes[2047] = 255;
        let binary = '';
        for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const synthesizeElevenLabsTts = vi.fn(async () => base64);
        window.norot = {
            hasElevenLabsKey: async () => true,
            synthesizeElevenLabsTts,
        };
        const fetchSpy = vi.fn(async () => {
            throw new Error('fetch should not be called');
        });
        globalThis.fetch = fetchSpy;
        const client = new ElevenLabsClient();
        await expect(client.isConfigured()).resolves.toBe(true);
        const audio = await client.synthesize('hello', 'voice', { model: 'eleven_v3', stability: 50, speed: 1.0 });
        expect(audio).toBeInstanceOf(ArrayBuffer);
        expect(audio.byteLength).toBe(2048);
        expect(synthesizeElevenLabsTts).toHaveBeenCalledOnce();
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
