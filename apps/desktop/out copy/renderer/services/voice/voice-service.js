import { PERSONAS } from '@norot/shared';
import { ElevenLabsClient, ElevenLabsClientError } from './elevenlabs-client';
import { LocalTTS } from './local-tts';
import { getScript } from './script-builder';
import { AudioPlayer } from '../audio/audio-player';
import { AudioQueue } from '../audio/audio-queue';
export class VoiceService {
    client;
    player;
    queue;
    localTts;
    ttsEngine = 'auto';
    muted = false;
    toughLoveExplicitAllowed = false;
    constructor() {
        this.client = new ElevenLabsClient();
        this.player = new AudioPlayer();
        this.queue = new AudioQueue();
        this.queue.setPlayer(this.player);
        this.localTts = new LocalTTS();
    }
    setTtsEngine(engine) {
        this.ttsEngine = engine;
    }
    setToughLoveExplicitAllowed(allowed) {
        this.toughLoveExplicitAllowed = allowed;
    }
    async speak(response, onBoundary) {
        if (this.muted)
            return { source: 'none' };
        const text = getScript(response);
        const voiceId = PERSONAS[response.recommendation.persona].voiceId;
        const ttsSettings = response.recommendation.tts;
        const isExplicitToughLove = response.recommendation.persona === 'tough_love' && this.toughLoveExplicitAllowed;
        const volume = isExplicitToughLove
            ? (response.severity >= 3 ? 1.0 : 0.9)
            : 0.8;
        // Local TTS mode — use browser SpeechSynthesis
        if (this.ttsEngine === 'local') {
            try {
                await this.localTts.speak(text, onBoundary);
                return { source: 'local' };
            }
            catch (err) {
                console.warn('[VoiceService] Local TTS failed:', err);
                return { source: 'none', error: err instanceof Error ? err.message : String(err) };
            }
        }
        let elevenLabsError;
        // Try ElevenLabs (for 'auto' and 'elevenlabs' modes)
        if (await this.client.isConfigured()) {
            try {
                const audioData = await this.client.synthesize(text, voiceId, ttsSettings);
                await this.queue.enqueue(audioData, response.severity, volume);
                return { source: 'elevenlabs' };
            }
            catch (err) {
                console.warn('[VoiceService] ElevenLabs failed, trying fallback:', err);
                if (err instanceof ElevenLabsClientError) {
                    elevenLabsError = { message: err.message, statusCode: err.statusCode };
                }
                else {
                    elevenLabsError = { message: err instanceof Error ? err.message : String(err) };
                }
            }
        }
        // Prefer speaking the actual script via local TTS whenever ElevenLabs isn't available,
        // so the voice always matches the on-screen message.
        if (this.localTts.isAvailable()) {
            try {
                await this.localTts.speak(text, onBoundary);
                return {
                    source: 'local',
                    error: elevenLabsError?.message,
                    errorCode: elevenLabsError?.statusCode,
                };
            }
            catch (err) {
                console.warn('[VoiceService] Local TTS fallback failed:', err);
            }
        }
        // ElevenLabs-only mode — last-resort fallback audio only
        if (this.ttsEngine === 'elevenlabs') {
            try {
                await this.speakFallback(response.recommendation.persona, response.severity);
                return {
                    source: 'fallback',
                    error: elevenLabsError?.message ?? 'ElevenLabs not configured',
                    errorCode: elevenLabsError?.statusCode,
                };
            }
            catch {
                return {
                    source: 'none',
                    error: elevenLabsError?.message ?? 'ElevenLabs not configured',
                    errorCode: elevenLabsError?.statusCode,
                };
            }
        }
        // Auto mode — last-resort MP3 fallback
        try {
            await this.speakFallback(response.recommendation.persona, response.severity);
            return {
                source: 'fallback',
                error: elevenLabsError?.message,
                errorCode: elevenLabsError?.statusCode,
            };
        }
        catch (err) {
            console.warn('[VoiceService] Fallback also failed:', err);
            return { source: 'none', error: 'All voice sources failed' };
        }
    }
    async speakFallback(persona, severity) {
        if (this.muted)
            throw new Error('Muted');
        // Local MP3 path: shipped in renderer public assets.
        // Avoid leading "/" so it works for both dev server and packaged file:// builds.
        const url = `audio/${persona}/severity-${severity}.mp3`;
        await this.player.playUrl(url);
    }
    isSpeaking() {
        return this.player.isPlaying() || this.localTts.isSpeaking();
    }
    getAnalyser() {
        return this.player.getAnalyser();
    }
    stop() {
        this.queue.clear();
        this.localTts.stop();
        this.player.stop();
    }
    mute() {
        this.muted = true;
        this.stop();
    }
    unmute() {
        this.muted = false;
    }
    isMuted() {
        return this.muted;
    }
    getPlayer() {
        return this.player;
    }
}
