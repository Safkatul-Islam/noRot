import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { PersonaSelector } from '@/components/PersonaSelector';
import { Button } from '@/components/ui/button';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import type { Persona } from '@norot/shared';

interface WelcomePageProps {
  onComplete: () => void;
}

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const [persona, setPersona] = useState<Persona>('calm_friend');
  const [saving, setSaving] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  // API key drafts
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // Pre-populate keys from saved settings (e.g. when re-running onboarding)
  useEffect(() => {
    getNorotAPI().getSettings().then((settings) => {
      if (settings.persona) setPersona(settings.persona);
      if (settings.elevenLabsApiKey) setElevenLabsKey(settings.elevenLabsApiKey);
      if (settings.geminiApiKey) setGeminiKey(settings.geminiApiKey);
    }).catch(() => {});
  }, []);

  const handleGetStarted = async () => {
    setSaving(true);
    try {
      const api = getNorotAPI();
      const updates: Record<string, unknown> = {
        persona,
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

  return (
    <div className="flex flex-col h-screen">
      {/* Draggable title bar for macOS */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
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
            onClick={handleGetStarted}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Get Started'}
          </Button>

          <button
            type="button"
            onClick={() => setShowApiKeys((v) => !v)}
            disabled={saving}
            className={cn(
              'mt-2 inline-flex items-center justify-center gap-1.5',
              'text-xs text-text-muted hover:text-text-secondary transition-colors',
            )}
          >
            Add API keys (optional)
            <ChevronDown
              className={cn(
                'size-3.5 transition-transform duration-200',
                showApiKeys ? 'rotate-180' : 'rotate-0',
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {showApiKeys && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full overflow-hidden"
              >
                <div className="w-full flex flex-col gap-3 mt-3">
                  <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
      </div>
    </div>
  );
}
