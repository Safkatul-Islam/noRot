import type { AudioPlayer } from './audio-player';

const INTERRUPT_SEVERITY_THRESHOLD = 3;

interface QueueEntry {
  audioData: ArrayBuffer;
  severity: number;
  volume: number;
}

export class AudioQueue {
  private player: AudioPlayer | null = null;
  private queue: QueueEntry[] = [];
  private processing = false;

  setPlayer(player: AudioPlayer): void {
    this.player = player;
    player.onEnd(() => this.playNext());
  }

  async enqueue(audioData: ArrayBuffer, severity: number, volume: number = 0.8): Promise<void> {
    if (!this.player) return;

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

  clear(): void {
    this.queue = [];
    this.processing = false;
    this.player?.stop();
  }

  private async playEntry(entry: QueueEntry): Promise<void> {
    if (!this.player) return;
    this.processing = true;
    try {
      this.player.setVolume(entry.volume);
      await this.player.play(entry.audioData);
    } catch (err) {
      console.error('[AudioQueue] Playback failed:', err);
      this.processing = false;
      this.playNext();
    }
  }

  private playNext(): void {
    this.processing = false;
    const next = this.queue.shift();
    if (next) {
      this.playEntry(next);
    }
  }
}
