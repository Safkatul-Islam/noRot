import { useEffect, useState, useRef } from 'react'
import { useInterventionStore } from '../stores/intervention-store'
import type { Severity } from '@norot/shared'

const SEVERITY_COLORS: Record<Severity, string> = {
  chill: '#4ade80',
  warning: '#facc15',
  danger: '#f87171',
  critical: '#ef4444',
}

export default function InterventionOverlay() {
  const { activeIntervention, isOverlayVisible, dismiss, snooze, commitToWork } =
    useInterventionStore()

  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Typewriter effect
  useEffect(() => {
    if (!activeIntervention?.script) {
      setDisplayedText('')
      return
    }

    setIsTyping(true)
    setDisplayedText('')
    const text = activeIntervention.script
    let index = 0

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(interval)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [activeIntervention?.script])

  // Listen for audio playback
  useEffect(() => {
    const unsub = window.electronAPI.onPlayAudio((base64: string) => {
      if (audioRef.current) {
        audioRef.current.src = `data:audio/mp3;base64,${base64}`
        audioRef.current.play().catch(console.error)
      }
    })
    return unsub
  }, [])

  if (!isOverlayVisible || !activeIntervention) return null

  const severity = (activeIntervention.severity ?? 'warning') as Severity
  const color = SEVERITY_COLORS[severity]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      {/* Border glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 80px ${color}30, inset 0 0 200px ${color}10`,
        }}
      />

      <div
        className="relative max-w-lg w-full mx-6 p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-500"
        style={{
          boxShadow: `0 0 40px ${color}20, 0 0 80px ${color}10`,
          borderColor: `${color}40`,
        }}
      >
        {/* Severity indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color }}
          >
            {severity} - Score {activeIntervention.score}
          </span>
        </div>

        {/* Script text with typewriter */}
        <div className="mb-8 min-h-[120px]">
          <p className="text-lg text-white/90 leading-relaxed">
            {displayedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-white/70 ml-0.5 animate-pulse" />
            )}
          </p>
        </div>

        {/* Persona tag */}
        {activeIntervention.persona && (
          <p className="text-xs text-white/30 mb-6">
            -- {activeIntervention.persona.replace('_', ' ')}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => commitToWork()}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            I'll focus now
          </button>
          <button
            onClick={() => snooze(5)}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            5 min snooze
          </button>
          <button
            onClick={() => dismiss()}
            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 font-semibold text-sm hover:bg-white/10 hover:text-white/60 transition-all duration-200"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
