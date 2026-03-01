import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleCheck } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { PersonaSelector } from '@/components/PersonaSelector';
import { Button } from '@/components/ui/button';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import type { Persona } from '@norot/shared';

interface WelcomePageProps {
  onComplete: () => void;
}

type WelcomeStep = 'persona' | 'api-keys';

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const [persona, setPersona] = useState<Persona>('calm_friend');
  const [step, setStep] = useState<WelcomeStep>('persona');
  const [saving, setSaving] = useState(false);

  // API key drafts
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // Pre-populate keys from saved settings (e.g. when re-running onboarding)
  useEffect(() => {
    getNorotAPI().getSettings().then((settings) => {
      if (settings.elevenLabsApiKey) setElevenLabsKey(settings.elevenLabsApiKey);
      if (settings.geminiApiKey) setGeminiKey(settings.geminiApiKey);
    }).catch(() => {});
  }, []);

  const handleNextStep = async () => {
    // Save persona but do NOT mark onboarding complete yet
    setSaving(true);
    try {
      const api = getNorotAPI();
      await api.updateSettings({ persona });
    } catch (err) {
      console.error('[WelcomePage]', err);
    } finally {
      setSaving(false);
    }
    setStep('api-keys');
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const api = getNorotAPI();
      const updates: Record<string, unknown> = {
        hasCompletedOnboarding: true,
      };
      if (elevenLabsKey.trim()) {
        updates.elevenLabsApiKey = elevenLabsKey.trim();
      }
      if (geminiKey.trim()) {
        updates.geminiApiKey = geminiKey.trim();
      }
      await api.updateSettings(updates);
    } catch (err) {
      console.error('[WelcomePage]', err);
    } finally {
      setSaving(false);
    }
    onComplete();
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const api = getNorotAPI();
      await api.updateSettings({ hasCompletedOnboarding: true });
    } catch (err) {
      console.error('[WelcomePage]', err);
    } finally {
      setSaving(false);
    }
    onComplete();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Draggable title bar for macOS */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex-1 flex items-center justify-center p-8">
      <AnimatePresence mode="wait">
        {step === 'persona' && (
          <motion.div
            key="persona"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            <GlassCard className="items-center text-center px-8">
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                Welcome to noRot
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
                noRot monitors your apps and speaks up when you drift off task.
                Pick a coaching style to get started.
              </p>

              <div className="w-full mt-2">
                <PersonaSelector selectedPersona={persona} onSelect={setPersona} />
              </div>

              <Button
                size="lg"
                className="w-full mt-2"
                onClick={handleNextStep}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Get Started'}
              </Button>
            </GlassCard>
          </motion.div>
        )}

        {step === 'api-keys' && (
          <motion.div
            key="api-keys"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            <GlassCard className="items-center text-center px-8">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                Power up with AI
                <span className="text-text-muted text-base font-normal ml-2">(optional)</span>
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
                {elevenLabsKey || geminiKey
                  ? 'Your API keys are saved. You can update them below or continue.'
                  : 'Add API keys to unlock voice coaching and smart task suggestions. You can always add these later in Settings.'}
              </p>

              {/* ElevenLabs key input */}
              <div className="w-full rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider text-left">
                    ElevenLabs Key
                  </p>
                  {elevenLabsKey && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CircleCheck className="size-3" />
                      <span className="text-[10px]">Key saved</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="Paste your ElevenLabs API key"
                  spellCheck={false}
                  className={cn(
                    'w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2',
                    'text-xs text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:border-primary/40'
                  )}
                />
                <p className="text-[10px] text-text-muted text-left leading-relaxed">
                  Enables your AI coach to talk to you with a natural voice.
                </p>
              </div>

              {/* Gemini key input */}
              <div className="w-full rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider text-left">
                    Gemini AI Key
                  </p>
                  {geminiKey && (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CircleCheck className="size-3" />
                      <span className="text-[10px]">Key saved</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Paste your Gemini API key"
                  spellCheck={false}
                  className={cn(
                    'w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2',
                    'text-xs text-text-primary placeholder:text-text-muted',
                    'focus:outline-none focus:border-primary/40'
                  )}
                />
                <p className="text-[10px] text-text-muted text-left leading-relaxed">
                  Enables smart task suggestions and context-aware coaching.
                </p>
              </div>

              {/* Action buttons */}
              <div className="w-full flex flex-col gap-2 mt-1">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Continue'}
                </Button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
