import { useState } from 'react'
import { useSettingsStore } from '../stores/settings-store'
import type { PersonaId } from '@norot/shared'

interface PersonaOption {
  id: PersonaId
  name: string
  description: string
  example: string
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    description: 'Intense, no-nonsense motivation',
    example: '"DROP THAT PHONE AND GIVE ME 20 MINUTES OF FOCUSED WORK!"',
  },
  {
    id: 'disappointed_parent',
    name: 'Disappointed Parent',
    description: 'Guilt-trip specialist',
    example: '"I\'m not angry... just disappointed."',
  },
  {
    id: 'chill_friend',
    name: 'Chill Friend',
    description: 'Laid-back but honest nudges',
    example: '"Hey, you\'ve been scrolling a while. Maybe take a break from the break?"',
  },
  {
    id: 'anime_rival',
    name: 'Anime Rival',
    description: 'Competitive and dramatic challenges',
    example: '"Tch... Is this really the best you can do?!"',
  },
  {
    id: 'therapist',
    name: 'Therapist',
    description: 'Empathetic exploration of why you procrastinate',
    example: '"Let\'s explore what might be causing that resistance."',
  },
]

export default function Onboarding() {
  const { updatePersona, updateSettings, completeOnboarding } = useSettingsStore()

  const [step, setStep] = useState(0)
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('chill_friend')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')

  const totalSteps = 4

  const handleNext = async () => {
    if (step === 1) {
      await updatePersona(selectedPersona)
    }
    if (step === 2) {
      if (elevenLabsKey || geminiKey) {
        await updateSettings({
          elevenLabsApiKey: elevenLabsKey,
          geminiApiKey: geminiKey,
        })
      }
    }
    if (step === totalSteps - 1) {
      await completeOnboarding()
      return
    }
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a1a]">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === step
                ? 'bg-[#4ade80] w-6'
                : i < step
                ? 'bg-[#4ade80]/40'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-6 opacity-80">{'\uD83E\uDDE0'}</div>
            <h1 className="text-3xl font-bold text-white mb-3">noRot</h1>
            <p className="text-sm text-white/50 max-w-xs leading-relaxed mb-2">
              Your AI-powered procrastination monitor that actually gets you back on track.
            </p>
            <p className="text-xs text-white/30 max-w-xs leading-relaxed">
              We track your app usage, detect when you're brain-rotting, and send personalized
              AI interventions to snap you out of it.
            </p>
          </div>
        )}

        {/* Step 1: Persona selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1 text-center">
              Choose Your AI Persona
            </h2>
            <p className="text-xs text-white/40 text-center mb-6">
              This determines how the AI talks to you during interventions
            </p>
            <div className="space-y-2">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersona(p.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-white/10 border-[#4ade80]/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white/90">{p.name}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#4ade80] flex items-center justify-center">
                          <span className="text-[8px] text-black font-bold">{'\u2713'}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mb-1">{p.description}</p>
                    <p className="text-[10px] text-white/30 italic">{p.example}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: API Keys */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-xl font-bold text-white mb-1 text-center">API Keys</h2>
            <p className="text-xs text-white/40 text-center mb-6 max-w-xs">
              Optional: Add API keys for voice and AI features. You can add these later in
              Settings.
            </p>
            <div className="w-full max-w-xs space-y-4">
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  ElevenLabs API Key
                </label>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="For voice interventions..."
                  className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="For AI analysis..."
                  className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <p className="text-[10px] text-white/20 text-center">
                Keys are stored locally on your machine
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-6 opacity-80">{'\uD83D\uDE80'}</div>
            <h2 className="text-2xl font-bold text-white mb-3">You're All Set!</h2>
            <p className="text-sm text-white/50 max-w-xs leading-relaxed mb-2">
              noRot will monitor your app usage and intervene when it detects you're
              procrastinating.
            </p>
            <p className="text-xs text-white/30 max-w-xs leading-relaxed">
              Click "Start Monitoring" on the dashboard to begin. Stay focused. Stop rotting.
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between px-6 py-4">
        {step > 0 ? (
          <button
            onClick={handleBack}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/10 hover:text-white/70 transition-all duration-200"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          className="px-6 py-2.5 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 text-[#4ade80] text-sm font-semibold hover:bg-[#4ade80]/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {step === totalSteps - 1
            ? "Let's Go!"
            : step === 2
            ? elevenLabsKey || geminiKey
              ? 'Save & Continue'
              : 'Skip for Now'
            : 'Next'}
        </button>
      </div>
    </div>
  )
}
