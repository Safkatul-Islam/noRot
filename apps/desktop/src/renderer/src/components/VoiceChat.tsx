import { useState, useRef, useCallback, useEffect } from 'react'

export default function VoiceChat() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)'
      ctx.beginPath()

      const sliceWidth = canvas.width / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up analyser for waveform visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
        audioContext.close()

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }

        // Combine chunks into a single blob and send to main process
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        const arrayBuffer = await blob.arrayBuffer()

        try {
          await window.electronAPI.sendAudioChunk(arrayBuffer)
          setTranscript('Audio sent for processing...')
        } catch (err) {
          console.error('[VoiceChat] Failed to send audio:', err)
          setTranscript('Failed to send audio')
        }

        // Clear transcript after a delay
        setTimeout(() => setTranscript(''), 5000)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250) // Collect data every 250ms
      setIsListening(true)
      setTranscript('Listening...')

      // Start waveform animation
      drawWaveform()
    } catch (err) {
      console.error('[VoiceChat] Failed to start recording:', err)
      setTranscript('Microphone access denied')
      setTimeout(() => setTranscript(''), 3000)
    }
  }, [drawWaveform])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isListening, startRecording, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Transcript display */}
      {transcript && (
        <div
          className="max-w-xs px-4 py-2 rounded-xl text-sm text-white/80 backdrop-blur-xl border border-white/10"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          {transcript}
        </div>
      )}

      {/* Waveform visualization */}
      {isListening && (
        <div
          className="w-48 h-12 rounded-xl overflow-hidden backdrop-blur-xl border border-white/10"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          <canvas
            ref={canvasRef}
            width={192}
            height={48}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={toggleRecording}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          backdrop-blur-xl border transition-all duration-300
          hover:scale-110 active:scale-95
          ${isListening
            ? 'border-purple-400/60 shadow-[0_0_30px_rgba(139,92,246,0.4)]'
            : 'border-white/10 hover:border-white/20'
          }
        `}
        style={{
          background: isListening
            ? 'rgba(139, 92, 246, 0.2)'
            : 'rgba(255, 255, 255, 0.05)',
          boxShadow: isListening
            ? '0 0 30px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.1)'
            : '0 4px 24px rgba(0, 0, 0, 0.3)'
        }}
        title={isListening ? 'Stop recording' : 'Start voice chat'}
      >
        {isListening ? (
          /* Stop icon */
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="4"
              y="4"
              width="12"
              height="12"
              rx="2"
              fill="rgba(139, 92, 246, 0.9)"
            />
          </svg>
        ) : (
          /* Mic icon */
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="7"
              y="2"
              width="6"
              height="10"
              rx="3"
              fill="rgba(255, 255, 255, 0.7)"
            />
            <path
              d="M4 9C4 12.3137 6.68629 15 10 15C13.3137 15 16 12.3137 16 9"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="15"
              x2="10"
              y2="18"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="7"
              y1="18"
              x2="13"
              y2="18"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Pulse ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-purple-500" />
        )}
      </button>
    </div>
  )
}
