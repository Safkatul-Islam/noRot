import type { PersonaId, Severity, TTSSettings } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'

export interface PlayAudioEvent {
  id: string
  text: string
  persona: PersonaId
  severity: Severity
  tts: TTSSettings
}

export type VoiceSource = 'elevenlabs' | 'none' | 'error'

export interface VoiceStatus {
  speaking: boolean
  amplitude: number
  source: VoiceSource
  error: string | null
}

export class VoiceService {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private gain: GainNode | null = null

  private currentSource: AudioBufferSourceNode | null = null
  private queue: PlayAudioEvent[] = []
  private processing = false

  private source: VoiceSource = 'none'
  private lastError: string | null = null

  constructor(private readonly onAudioStart: (id: string) => void) {}

  unlock(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.gain = this.audioContext.createGain()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 512
      this.gain.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)
    }
    void this.audioContext.resume()
  }

  interruptAndEnqueue(event: PlayAudioEvent): void {
    this.stop()
    this.queue = [event]
    void this.processQueue()
  }

  enqueue(event: PlayAudioEvent): void {
    this.queue.push(event)
    void this.processQueue()
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // ignore
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }
  }

  getStatus(): VoiceStatus {
    const speaking = this.currentSource !== null
    const amplitude = speaking ? this.computeAmplitude() : 0
    return { speaking, amplitude, source: this.source, error: this.lastError }
  }

  private computeAmplitude(): number {
    if (!this.analyser) return 0
    const data = new Uint8Array(this.analyser.fftSize)
    this.analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i += 1) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    return Math.max(0, Math.min(1, rms * 3))
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()
        if (!next) break
        await this.playOne(next)
      }
    } finally {
      this.processing = false
    }
  }

  private async playOne(event: PlayAudioEvent): Promise<void> {
    this.unlock()
    if (!this.audioContext || !this.gain) return

    this.source = 'none'
    this.lastError = null

    let audioBase64 = ''
    let contentType = ''
    try {
      const res = await window.norot.invoke<{ audioBase64: string; contentType: string }>(IPC_CHANNELS.elevenlabs.synthesizeTts, {
        text: event.text,
        persona: event.persona,
        tts: event.tts
      })
      audioBase64 = typeof res?.audioBase64 === 'string' ? res.audioBase64 : ''
      contentType = typeof res?.contentType === 'string' ? res.contentType : ''
    } catch (err) {
      this.source = 'error'
      this.lastError = err instanceof Error ? err.message : String(err)
      return
    }

    if (!audioBase64 || !contentType.startsWith('audio/')) {
      this.source = 'error'
      this.lastError = 'Invalid audio response'
      return
    }

    let buffer: AudioBuffer
    try {
      const audioBytes = base64ToUint8Array(audioBase64)
      const arrayBuffer = new ArrayBuffer(audioBytes.byteLength)
      new Uint8Array(arrayBuffer).set(audioBytes)
      buffer = await this.audioContext.decodeAudioData(arrayBuffer)
    } catch (err) {
      this.source = 'error'
      this.lastError = err instanceof Error ? err.message : String(err)
      return
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = clamp(event.tts.speed, 0.5, 1.5)
    source.connect(this.gain)

    this.currentSource = source
    this.source = 'elevenlabs'
    this.onAudioStart(event.id)

    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
      try {
        source.start()
      } catch {
        resolve()
      }
    })

    source.disconnect()
    if (this.currentSource === source) {
      this.currentSource = null
    }
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
