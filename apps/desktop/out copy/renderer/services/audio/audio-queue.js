const INTERRUPT_SEVERITY_THRESHOLD = 3;
export class AudioQueue {
    player = null;
    queue = [];
    processing = false;
    setPlayer(player) {
        this.player = player;
        player.onEnd(() => this.playNext());
    }
    async enqueue(audioData, severity, volume = 0.8) {
        if (!this.player)
            return;
        // At severity 3+: interrupt current playback immediately
        if (severity >= INTERRUPT_SEVERITY_THRESHOLD && this.player.isPlaying()) {
            this.queue = [];
            this.player.stop();
            this.processing = false;
        }
        if (this.processing || this.player.isPlaying()) {
            // Queue it up to play after current finishes
            this.queue.push({ audioData, severity, volume });
            return;
        }
        await this.playEntry({ audioData, severity, volume });
    }
    clear() {
        this.queue = [];
        this.processing = false;
        this.player?.stop();
    }
    async playEntry(entry) {
        if (!this.player)
            return;
        this.processing = true;
        try {
            this.player.setVolume(entry.volume);
            await this.player.play(entry.audioData);
        }
        catch (err) {
            console.error('[AudioQueue] Playback failed:', err);
            this.processing = false;
            this.playNext();
        }
    }
    playNext() {
        this.processing = false;
        const next = this.queue.shift();
        if (next) {
            this.playEntry(next);
        }
    }
}
