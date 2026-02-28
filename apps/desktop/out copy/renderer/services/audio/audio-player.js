const DEFAULT_VOLUME = 0.8;
const MAX_VOLUME = 1.0;
export class AudioPlayer {
    context = null;
    gainNode = null;
    analyserNode = null;
    currentSource = null;
    currentMediaEl = null;
    currentMediaNode = null;
    playing = false;
    endCallback = null;
    async ensureContext() {
        if (!this.context) {
            this.context = new AudioContext();
            this.gainNode = this.context.createGain();
            this.gainNode.gain.value = DEFAULT_VOLUME;
            this.analyserNode = this.context.createAnalyser();
            this.analyserNode.fftSize = 256;
            // Chain: source -> gainNode -> analyserNode -> destination
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.context.destination);
        }
        // Resume if suspended (browsers require user gesture)
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        return this.context;
    }
    // Prime/unlock audio playback in browsers that require a user gesture.
    // Call this from a click/keydown handler at least once after startup.
    async prime() {
        const ctx = await this.ensureContext();
        const prevGain = this.gainNode?.gain.value ?? DEFAULT_VOLUME;
        if (this.gainNode)
            this.gainNode.gain.value = 0;
        try {
            const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.gainNode);
            source.start(0);
            source.stop(ctx.currentTime + 0.01);
        }
        finally {
            if (this.gainNode)
                this.gainNode.gain.value = prevGain;
        }
    }
    async play(audioData) {
        const ctx = await this.ensureContext();
        // Stop anything currently playing
        this.stopCurrentSource();
        const audioBuffer = await ctx.decodeAudioData(audioData.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
        source.onended = () => {
            if (this.currentSource === source) {
                this.playing = false;
                this.currentSource = null;
                this.endCallback?.();
            }
        };
        this.currentSource = source;
        this.playing = true;
        source.start(0);
    }
    async playUrl(url) {
        const ctx = await this.ensureContext();
        // Stop anything currently playing
        this.stopCurrentSource();
        // NOTE: In packaged Electron builds, the renderer often runs on `file://`.
        // `fetch()` can fail for `file://` URLs, so use an <audio> element instead.
        const resolvedUrl = this.resolvePlaybackUrl(url);
        const el = new Audio();
        el.src = resolvedUrl;
        el.preload = 'auto';
        // Allows analyser piping for remote URLs; harmless for file://
        el.crossOrigin = 'anonymous';
        el.volume = 1.0;
        const node = ctx.createMediaElementSource(el);
        node.connect(this.gainNode);
        el.onended = () => {
            if (this.currentMediaEl === el) {
                this.playing = false;
                this.currentMediaEl = null;
                try {
                    this.currentMediaNode?.disconnect();
                }
                catch {
                    // ignore
                }
                this.currentMediaNode = null;
                this.endCallback?.();
            }
        };
        el.onerror = () => {
            if (this.currentMediaEl === el) {
                this.playing = false;
                this.currentMediaEl = null;
                try {
                    this.currentMediaNode?.disconnect();
                }
                catch {
                    // ignore
                }
                this.currentMediaNode = null;
            }
        };
        this.currentMediaEl = el;
        this.currentMediaNode = node;
        this.playing = true;
        try {
            await el.play();
        }
        catch (err) {
            this.stopCurrentSource();
            throw err;
        }
    }
    stop() {
        this.stopCurrentSource();
    }
    setVolume(vol) {
        const clamped = Math.max(0, Math.min(MAX_VOLUME, vol));
        if (this.gainNode) {
            this.gainNode.gain.value = clamped;
        }
    }
    isPlaying() {
        return this.playing;
    }
    getAnalyser() {
        return this.analyserNode;
    }
    onEnd(callback) {
        this.endCallback = callback;
    }
    dispose() {
        this.stopCurrentSource();
        if (this.context) {
            this.context.close().catch(() => { });
            this.context = null;
            this.gainNode = null;
            this.analyserNode = null;
        }
    }
    stopCurrentSource() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            }
            catch {
                // Already stopped — ignore
            }
            this.currentSource = null;
        }
        if (this.currentMediaEl) {
            try {
                this.currentMediaEl.pause();
            }
            catch {
                // ignore
            }
            try {
                this.currentMediaEl.src = '';
                this.currentMediaEl.load();
            }
            catch {
                // ignore
            }
            this.currentMediaEl.onended = null;
            this.currentMediaEl.onerror = null;
            this.currentMediaEl = null;
        }
        if (this.currentMediaNode) {
            try {
                this.currentMediaNode.disconnect();
            }
            catch {
                // ignore
            }
            this.currentMediaNode = null;
        }
        this.playing = false;
    }
    resolvePlaybackUrl(url) {
        const raw = (url ?? '').trim();
        if (!raw)
            return raw;
        // If it already has a scheme (http:, https:, file:, blob:, data:), keep it.
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw))
            return raw;
        // Avoid leading-slash absolute paths (break on file://, e.g. file:///audio/...).
        const normalized = raw.startsWith('/') ? raw.slice(1) : raw;
        return new URL(normalized, window.location.href).toString();
    }
}
