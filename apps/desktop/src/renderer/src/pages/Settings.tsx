import { useState, useEffect } from 'react'
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
    description: 'Intense, no-nonsense motivation. Will yell at you to get back to work.',
    example: '"DROP THAT PHONE AND GIVE ME 20 MINUTES OF FOCUSED WORK, MAGGOT!"',
  },
  {
    id: 'disappointed_parent',
    name: 'Disappointed Parent',
    description: 'Guilt-trip specialist. Makes you feel bad about wasting your potential.',
    example: '"I\'m not angry, I\'m just... disappointed. You had so much potential today."',
  },
  {
    id: 'chill_friend',
    name: 'Chill Friend',
    description: 'Laid-back but honest. Gently nudges you in the right direction.',
    example: '"Hey, no judgment, but you\'ve been scrolling for a while. Maybe take a break from the break?"',
  },
  {
    id: 'anime_rival',
    name: 'Anime Rival',
    description: 'Competitive and dramatic. Challenges you to surpass your limits.',
    example: '"Tch... Is this really the best you can do? I expected more from my rival!"',
  },
  {
    id: 'therapist',
    name: 'Therapist',
    description: 'Empathetic and understanding. Helps you explore why you procrastinate.',
    example: '"I notice you\'ve been avoiding your tasks. Let\'s explore what might be causing that resistance."',
  },
]

export default function Settings() {
  const {
    persona,
    visionEnabled,
    elevenLabsApiKey,
    geminiApiKey,
    updatePersona,
    updateSettings,
    fetchSettings,
  } = useSettingsStore()

  const [localElevenLabsKey, setLocalElevenLabsKey] = useState(elevenLabsApiKey)
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    setLocalElevenLabsKey(elevenLabsApiKey)
    setLocalGeminiKey(geminiApiKey)
  }, [elevenLabsApiKey, geminiApiKey])

  const handleSaveKeys = () => {
    updateSettings({
      elevenLabsApiKey: localElevenLabsKey,
      geminiApiKey: localGeminiKey,
    })
  }

  const handleToggleVision = () => {
    updateSettings({ visionEnabled: !visionEnabled })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <h2 className="text-lg font-bold text-white/90">Settings</h2>

      {/* Persona selection */}
      <div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          AI Persona
        </h3>
        <div className="space-y-2">
          {PERSONAS.map((p) => {
            const isSelected = persona === p.id
            return (
              <button
                key={p.id}
                onClick={() => updatePersona(p.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-white/10 border-[#4ade80]/30'
                    : 'bg-white/5 border-white/5 hover:bg-white/[0.07] hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-white/90">{p.name}</span>
                  {isSelected && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 mb-2">{p.description}</p>
                <p className="text-[10px] text-white/30 italic">{p.example}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Vision toggle */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white/90">Screen Vision</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Enable AI screen analysis for smarter interventions
            </p>
          </div>
          <button
            onClick={handleToggleVision}
            className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
              visionEnabled ? 'bg-[#4ade80]' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                visionEnabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          API Keys
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">ElevenLabs API Key</label>
            <input
              type="password"
              value={localElevenLabsKey}
              onChange={(e) => setLocalElevenLabsKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Gemini API Key</label>
            <input
              type="password"
              value={localGeminiKey}
              onChange={(e) => setLocalGeminiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveKeys}
            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            Save API Keys
          </button>
        </div>
      </div>

      {/* App info */}
      <div className="text-center py-4">
        <p className="text-[10px] text-white/20">noRot v1.0.0</p>
        <p className="text-[10px] text-white/15 mt-0.5">Stop rotting. Start doing.</p>
      </div>
    </div>
  )
}
