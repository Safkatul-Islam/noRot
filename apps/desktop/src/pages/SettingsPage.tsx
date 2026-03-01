import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PersonaSelector } from '@/components/PersonaSelector';
import { BlurFade } from '@/components/effects/BlurFade';
import { AudioPlayer } from '@/services/audio/audio-player';
import { ElevenLabsClient } from '@/services/voice/elevenlabs-client';
import { useSettings } from '@/hooks/useSettings';
import { getNorotAPI } from '@/lib/norot-api';
import type { UserSettings } from '@/lib/electron-api';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore, ACCENT_PRESETS, ACCENT_IDS } from '@/stores/settings-store';
import type { AccentColorId } from '@/stores/settings-store';
import { useStartupFlowStore } from '@/stores/startup-flow-store';
import { SEVERITY_BANDS, PERSONAS, stripEmotionTags, VOICE_PRESETS, resolveVoiceId } from '@norot/shared';
import type { Severity, Persona } from '@norot/shared';
import { cn } from '@/lib/utils';
import {
  Settings2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  MessageSquare,
  Info,
  Palette,
  Check,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Shield,
  ShieldCheck,
  ListTodo,
  Maximize2,
  RotateCcw,
  Mic,
} from 'lucide-react';

// Representative preview variants per persona×severity (mirrors intervention-text.ts).
// Randomly sampled so the settings page shows varied examples.
const PREVIEW_VARIANTS: Record<Persona, Record<1 | 2 | 3 | 4, string[]>> = {
  calm_friend: {
    1: [
      'Quick check-in: looks like you\'ve been off task for a bit. Want to refocus?',
      'No judgment — you\'re drifting. What\'s one tiny next step you can do right now?',
      'Small nudge: you\'re off task. Can you do 60 seconds of the real task first?',
    ],
    2: [
      'I notice you\'ve been off task for a while. What\'s the next small step on your task?',
      'You\'re getting pulled away. Can you name the task you meant to do?',
      'Looks like distraction is winning right now. Want to pick one 5-minute step?',
    ],
    3: [
      'You\'ve been off task for a bit now. What\'s making it hard to start?',
      'You\'re deep in distraction. What\'s one "minimum effort" version of your task?',
      'Let\'s interrupt the loop. What\'s the next step you\'d tell a friend to do?',
    ],
    4: [
      'Hey. I can see things feel heavy right now. Can we do one tiny grounding step together?',
      'This looks like a rough moment. Do you need a break, or a smaller version of the task?',
      'You don\'t have to fix everything. What\'s one tiny action that helps Future You?',
    ],
  },
  coach: {
    1: [
      'Check-in: you\'re drifting. Reset your posture and pick the next action.',
      'Heads up — you\'re off task. What\'s the goal for the next 5 minutes?',
      'Drift detected. Tighten the loop: one task, one step, go.',
    ],
    2: [
      'You\'ve been off task a while. What\'s one thing you can finish in 5 minutes?',
      'Focus up. Name the task and do the first step.',
      'Set a timer for 10 minutes and start the hardest 30 seconds.',
    ],
    3: [
      'You\'ve been off task instead of working. What\'s the smallest piece you can tackle?',
      'Enough. Pick one step and start it in the next 10 seconds.',
      'What are you avoiding — confusion, boredom, or fear of messing up?',
    ],
    4: [
      'You\'re in a rough patch. Do a 60-second reset: stand up, drink water, breathe.',
      'Stop the spiral. Pick the smallest possible action and do it slowly.',
      'Crisis means simplify. One task. One step. Then reassess.',
    ],
  },
  tough_love: {
    1: [
      'BRUH. You\'re off task. WHAT THE FUCK were you actually about to work on?',
      'Quick reality check: is this the plan, or is your brain freelancing again?',
      'That\'s not "research." That\'s procrastination with extra steps. What\'s next?',
    ],
    2: [
      'Still off task? Cool. Pick ONE 5-minute step and do it. No more messing around.',
      'CLOSE IT and open the work. What\'s the next tiny deliverable?',
      'That dopamine snack isn\'t free — it costs your day. What\'s the fix?',
    ],
    3: [
      'ENOUGH. What\'s the tiniest thing you can finish right now?',
      'I\'m done being polite. Start the task — ugly, messy, whatever. Step one?',
      'Your brain is lying to you. You can start badly. What\'s step one?',
    ],
    4: [
      'Crisis mode. Stop torturing yourself. Stand up, water, breathe — then one micro-step.',
      'Your brain is on fire. Lower the bar to "tiny" and do one micro-step right now.',
      'No more punishment scrolling. Two minutes of real progress. What are you starting?',
    ],
  },
};

function getPreviewMessages(persona: Persona): { severity: Severity; text: string }[] {
  const variants = PREVIEW_VARIANTS[persona];
  return ([1, 2, 3, 4] as Severity[]).map((sev) => {
    const pool = variants[sev as 1 | 2 | 3 | 4];
    const text = pool[Math.floor(Math.random() * pool.length)];
    return { severity: sev, text: stripEmotionTags(text) };
  });
}

export function SettingsPage() {
  const {
    persona,
    muted,
    ttsEngine,
    updatePersona,
    updateMuted,
    updateTtsEngine,
    selectedVoiceId,
    updateSelectedVoiceId,
  } = useSettings();

  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);

  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000');
  const [apiUrlDraft, setApiUrlDraft] = useState('http://127.0.0.1:8000');
  const [savingApiUrl, setSavingApiUrl] = useState(false);

  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false);
  const [elevenLabsApiKeyDraft, setElevenLabsApiKeyDraft] = useState('');
  const [savingElevenLabsApiKey, setSavingElevenLabsApiKey] = useState(false);

  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [geminiApiKeyDraft, setGeminiApiKeyDraft] = useState('');
  const [savingGeminiApiKey, setSavingGeminiApiKey] = useState(false);

  const [testingVoice, setTestingVoice] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');

  const [testingIntervention, setTestingIntervention] = useState(false);
  const [interventionTestResult, setInterventionTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const [telemetryActive, setTelemetryActive] = useState<boolean | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [screenRecordingStatus, setScreenRecordingStatus] = useState<string | null>(null);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [permissionsRequestStarted, setPermissionsRequestStarted] = useState(false);
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [savingVisionEnabled, setSavingVisionEnabled] = useState(false);
  const [scriptSource, setScriptSourceLocal] = useState<'default' | 'gemini'>('default');
  const [autoShowTodoOverlay, setAutoShowTodoOverlay] = useState(true);
  const [togglingOverlay, setTogglingOverlay] = useState(false);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [timeZone, setTimeZone] = useState('system');
  const [timeZoneDraft, setTimeZoneDraft] = useState('system');
  const [savingTimePrefs, setSavingTimePrefs] = useState(false);
  const [supportedTimeZones, setSupportedTimeZones] = useState<string[]>([]);

  const statusLabels: Record<string, string> = {
    connected: 'Connected to API',
    disconnected: 'Disconnected',
  };

  const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const persistTimeFormat = async (next: '12h' | '24h') => {
    setTimeFormat(next);
    setSavingTimePrefs(true);
    try {
      await getNorotAPI().updateSettings({ timeFormat: next });
    } catch {
      // ignore
    } finally {
      setSavingTimePrefs(false);
    }
  };

  const persistTimeZone = async (next: string) => {
    const trimmed = next.trim();
    const value = trimmed ? trimmed : 'system';
    setTimeZoneDraft(value);
    setSavingTimePrefs(true);
    try {
      await getNorotAPI().updateSettings({ timeZone: value });
      setTimeZone(value);
    } catch {
      // ignore
    } finally {
      setSavingTimePrefs(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const api = getNorotAPI();
    api.getSettings()
      .then((settings: UserSettings) => {
        const url = typeof settings?.apiUrl === 'string' ? settings.apiUrl.trim() : '';
        if (!cancelled && url) {
          setApiUrl(url);
          setApiUrlDraft(url);
        }

        const key =
          typeof settings?.elevenLabsApiKey === 'string'
            ? settings.elevenLabsApiKey.trim()
            : '';
        if (!cancelled) setElevenLabsConfigured(key.length > 0);

        const geminiKey =
          typeof settings?.geminiApiKey === 'string'
            ? settings.geminiApiKey.trim()
            : '';
        if (!cancelled) setGeminiConfigured(geminiKey.length > 0);
        if (!cancelled) setScriptSourceLocal(settings?.scriptSource ?? 'default');

        if (!cancelled) setVisionEnabled(settings?.visionEnabled ?? true);
        if (!cancelled) setAutoShowTodoOverlay(settings?.autoShowTodoOverlay ?? true);

        if (!cancelled) setTimeFormat(settings?.timeFormat ?? '12h');
        const tz = typeof settings?.timeZone === 'string' && settings.timeZone.trim()
          ? settings.timeZone.trim()
          : 'system';
        if (!cancelled) {
          setTimeZone(tz);
          setTimeZoneDraft(tz);
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      const zones = typeof intlAny.supportedValuesOf === 'function'
        ? intlAny.supportedValuesOf('timeZone')
        : [];
      if (Array.isArray(zones) && zones.length > 0) setSupportedTimeZones(zones);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    getNorotAPI().isTelemetryActive()
      .then((active) => setTelemetryActive(active))
      .catch(() => setTelemetryActive(false));
  }, []);

  useEffect(() => {
    const check = () => {
      try {
        const api = getNorotAPI();
        if (typeof api.checkPermissions !== 'function') {
          setPermissionsGranted(false);
          return;
        }
        api.checkPermissions()
          .then((p) => {
            setPermissionsGranted(p.screenRecording);
            setScreenRecordingStatus(typeof p.status === 'string' ? p.status : null);
          })
          .catch(() => setPermissionsGranted(false));
      } catch {
        setPermissionsGranted(false);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const requestPermissions = async () => {
    setPermissionsRequestStarted(true);
    setRequestingPermissions(true);
    try {
      const api = getNorotAPI();
      if (typeof api.requestPermissions === 'function') {
        await api.requestPermissions();
      }
    } catch {
      // ignore
    } finally {
      setRequestingPermissions(false);
    }
  };

  const relaunchApp = async () => {
    try {
      const api = getNorotAPI();
      if (typeof api.relaunchApp === 'function') {
        const href = typeof window !== 'undefined' ? window.location.href : '';
        const url = href ? new URL(href) : null;
        const rendererUrl = url && url.protocol.startsWith('http') ? url.origin : undefined;
        await api.relaunchApp(rendererUrl);
      }
    } catch {
      // ignore
    }
  };

  const toggleVisionEnabled = async () => {
    setSavingVisionEnabled(true);
    try {
      const api = getNorotAPI();
      const next = !visionEnabled;
      setVisionEnabled(next);
      await api.updateSettings({ visionEnabled: next });
    } catch {
      // ignore
    } finally {
      setSavingVisionEnabled(false);
    }
  };

  const saveApiUrl = async () => {
    const next = apiUrlDraft.trim();
    if (!next) return;
    setSavingApiUrl(true);
    try {
      const api = getNorotAPI();
      await api.updateSettings({ apiUrl: next });
      setApiUrl(next);
    } catch {
      // ignore
    } finally {
      setSavingApiUrl(false);
    }
  };

  const saveElevenLabsApiKey = async () => {
    const next = elevenLabsApiKeyDraft.trim();
    setSavingElevenLabsApiKey(true);
    try {
      const api = getNorotAPI();
      await api.updateSettings({ elevenLabsApiKey: next });
      setElevenLabsConfigured(next.length > 0);
      setElevenLabsApiKeyDraft('');
    } catch {
      // ignore
    } finally {
      setSavingElevenLabsApiKey(false);
    }
  };

  const saveGeminiApiKey = async () => {
    const next = geminiApiKeyDraft.trim();
    setSavingGeminiApiKey(true);
    try {
      const api = getNorotAPI();
      await api.updateSettings({ geminiApiKey: next });
      setGeminiConfigured(next.length > 0);
      if (next.length === 0 && scriptSource === 'gemini') {
        setScriptSourceLocal('default');
        await api.updateSettings({ scriptSource: 'default' });
      }
      setGeminiApiKeyDraft('');
    } catch {
      // ignore
    } finally {
      setSavingGeminiApiKey(false);
    }
  };

  const updateScriptSource = async (next: 'default' | 'gemini') => {
    setScriptSourceLocal(next);
    try {
      await getNorotAPI().updateSettings({ scriptSource: next });
    } catch {
      // ignore
    }
  };

  const testVoice = async () => {
    setTestingVoice(true);
    setTestResult('idle');
    try {
      if (ttsEngine === 'local') {
        if (!('speechSynthesis' in window)) throw new Error('Not available');
        const utter = new SpeechSynthesisUtterance('Testing local voice.');
        await new Promise<void>((resolve, reject) => {
          utter.onend = () => resolve();
          utter.onerror = (e) => reject(new Error(e.error));
          speechSynthesis.speak(utter);
        });
      } else {
        const player = new AudioPlayer();
        if (elevenLabsConfigured) {
          const client = new ElevenLabsClient();
          const testVoiceId = resolveVoiceId(selectedVoiceId, persona);
          const audio = await client.synthesize('Testing voice.', testVoiceId, { model: 'eleven_v3', stability: 50, speed: 1.0 });
          await player.play(audio);
        } else {
          await player.playUrl('audio/calm_friend/severity-1.mp3');
        }
      }
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally {
      setTestingVoice(false);
    }
  };

  const testIntervention = async () => {
    setTestingIntervention(true);
    setInterventionTestResult('idle');
    try {
      await getNorotAPI().testIntervention();
      setInterventionTestResult('success');
    } catch {
      setInterventionTestResult('error');
    } finally {
      setTestingIntervention(false);
    }
  };

  const previewVoice = async (presetId: string) => {
    const preset = VOICE_PRESETS.find((v) => v.id === presetId);
    if (!preset) return;
    setPreviewingVoice(presetId);
    try {
      if (ttsEngine === 'local') {
        if (!('speechSynthesis' in window)) throw new Error('Not available');
        const utter = new SpeechSynthesisUtterance(preset.previewText);
        await new Promise<void>((resolve, reject) => {
          utter.onend = () => resolve();
          utter.onerror = (e) => reject(new Error(e.error));
          speechSynthesis.speak(utter);
        });
      } else if (elevenLabsConfigured) {
        const client = new ElevenLabsClient();
        const player = new AudioPlayer();
        const audio = await client.synthesize(preset.previewText, preset.voiceId, { model: 'eleven_v3', stability: 50, speed: 1.0 });
        await player.play(audio);
      }
    } catch {
      // ignore preview errors
    } finally {
      setPreviewingVoice(null);
    }
  };

  const previewMessages = getPreviewMessages(persona);

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Top row: Persona selector + Preview */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        <BlurFade delay={0} className="col-span-7">
          <GlassCard className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-5 text-primary" />
                Persona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Choose how noRot talks to you during interventions.
              </p>
              <PersonaSelector selectedPersona={persona} onSelect={updatePersona} />
            </CardContent>
          </GlassCard>
        </BlurFade>

        <BlurFade delay={0.05} className="col-span-5">
          <GlassCard variant="well" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                {PERSONAS[persona].label} Preview
              </CardTitle>
              <p className="text-xs text-text-muted mt-1">
                {scriptSource === 'gemini'
                  ? 'With Gemini AI selected, actual messages will vary. These are fallback examples.'
                  : "Here's what your coach will say at each level."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {previewMessages.map(({ severity, text }) => {
                  const band = SEVERITY_BANDS[severity];
                  return (
                    <div
                      key={severity}
                      className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] p-2.5 space-y-1"
                      style={{ borderLeft: `3px solid ${band.color}`, boxShadow: `inset 2px 0 6px ${band.color}15` }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium" style={{ color: band.color }}>
                          {band.label}
                        </span>
                        <span className="text-[10px] text-text-muted">{band.mode}</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        &ldquo;{text}&rdquo;
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </GlassCard>
        </BlurFade>
      </div>

      {/* Voice Selection */}
      <BlurFade delay={0.07}>
        <GlassCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="size-5 text-primary" />
              Voice
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary leading-relaxed">
              Choose a voice independently from persona. Persona controls personality; voice controls how it sounds.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {/* Persona default option */}
              <button
                onClick={() => updateSelectedVoiceId('')}
                className={cn(
                  'relative rounded-lg border p-3 text-left transition-all',
                  selectedVoiceId === ''
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-white/[0.06] bg-[var(--color-glass-well)] hover:border-white/[0.12]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">Default</span>
                  {selectedVoiceId === '' && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </div>
                <p className="text-[10px] text-text-muted mt-1">Use persona voice</p>
              </button>

              {/* Voice preset cards */}
              {VOICE_PRESETS.map((preset) => {
                const isActive = selectedVoiceId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSelectedVoiceId(preset.id)}
                    className={cn(
                      'relative rounded-lg border p-3 text-left transition-all',
                      isActive
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/[0.06] bg-[var(--color-glass-well)] hover:border-white/[0.12]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-primary">{preset.label}</span>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
                          preset.gender === 'F'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-blue-500/15 text-blue-400',
                        )}>
                          {preset.gender}
                        </span>
                        {isActive && <Check className="size-3.5 text-primary" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">{preset.tone}</p>
                    {elevenLabsConfigured && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewVoice(preset.id);
                        }}
                        disabled={previewingVoice !== null}
                        className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        {previewingVoice === preset.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Play className="size-3" />
                        )}
                        {previewingVoice === preset.id ? 'Playing...' : 'Preview'}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
            {!elevenLabsConfigured && (
              <p className="text-[10px] text-text-muted text-center">
                Add your ElevenLabs key below to preview voices.
              </p>
            )}
          </CardContent>
        </GlassCard>
      </BlurFade>

      {/* Row 2: Accent Color + stacked Threshold/Cooldown */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <BlurFade delay={0.1} className="col-span-6">
          <GlassCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5 text-primary" />
                Accent Color
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                Choose an accent color for the interface and fluid background.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {ACCENT_IDS.map((id) => {
                  const preset = ACCENT_PRESETS[id];
                  const isActive = accentColor === id;
                  return (
                    <motion.button
                      key={id}
                      onClick={() => setAccentColor(id)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={cn(
                        'relative w-10 h-10 rounded-full transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                      )}
                      style={{
                        backgroundColor: preset.primary,
                        boxShadow: isActive
                          ? `0 0 0 2px var(--color-background), 0 0 0 4px ${preset.primary}, 0 0 20px ${preset.glow}`
                          : `0 0 8px ${preset.primary}30`,
                      }}
                      title={preset.label}
                    >
                      {isActive && (
                        <Check className="absolute inset-0 m-auto size-4 text-primary-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-xs text-text-muted text-center">
                {ACCENT_PRESETS[accentColor].label}
              </p>
            </CardContent>
          </GlassCard>
        </BlurFade>


      </div>

      {/* Row 3: Audio + Connection — equal halves */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <BlurFade delay={0.25} className="col-span-6">
          <GlassCard className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {muted
                  ? <VolumeX className="size-5 text-danger" />
                  : <Volume2 className="size-5 text-primary" />}
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* TTS Engine selector */}
              <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-glass-well)] border border-white/[0.05]">
                {([
                  { value: 'auto' as const, label: 'Auto', desc: 'ElevenLabs with MP3 fallback' },
                  { value: 'elevenlabs' as const, label: 'ElevenLabs', desc: 'API voice only (uses credits)' },
                  { value: 'local' as const, label: 'Local (Free)', desc: 'Browser built-in voice' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateTtsEngine(opt.value)}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                      ttsEngine === opt.value
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                    )}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-muted text-center">
                {ttsEngine === 'auto' && 'Tries ElevenLabs, falls back to local MP3s.'}
                {ttsEngine === 'elevenlabs' && 'ElevenLabs API only. Uses credits per intervention.'}
                {ttsEngine === 'local' && 'Free browser voice. No API key needed.'}
              </p>

              <p className="text-xs text-text-secondary leading-relaxed">
                {muted
                  ? 'Voice interventions are muted.'
                  : 'Voice interventions enabled.'}
              </p>

              <Button
                variant="outline"
                className={cn(
                  'w-full',
                  muted
                    ? 'border-danger/30 text-danger hover:bg-danger/10'
                    : 'border-success/30 text-success hover:bg-success/10'
                )}
                onClick={updateMuted}
              >
                {muted ? <VolumeX className="size-4 mr-2" /> : <Volume2 className="size-4 mr-2" />}
                {muted ? 'Unmute' : 'Mute'}
              </Button>

              <Button
                variant="outline"
                className="w-full border-white/[0.06] text-text-secondary hover:text-text-primary"
                onClick={testVoice}
                disabled={testingVoice}
              >
                {testingVoice ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle className="size-4 mr-2 text-success" />
                ) : testResult === 'error' ? (
                  <XCircle className="size-4 mr-2 text-danger" />
                ) : (
                  <Play className="size-4 mr-2" />
                )}
                {testingVoice ? 'Testing...' : testResult === 'success' ? 'Voice OK' : testResult === 'error' ? 'Test Failed' : 'Test Voice'}
              </Button>
              <Button
                variant="outline"
                className="w-full border-primary/20 text-primary hover:bg-primary/10"
                onClick={testIntervention}
                disabled={testingIntervention}
              >
                {testingIntervention ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : interventionTestResult === 'success' ? (
                  <CheckCircle className="size-4 mr-2 text-success" />
                ) : interventionTestResult === 'error' ? (
                  <XCircle className="size-4 mr-2 text-danger" />
                ) : (
                  <Zap className="size-4 mr-2" />
                )}
                {testingIntervention ? 'Testing...' : interventionTestResult === 'success' ? 'Intervention Sent' : interventionTestResult === 'error' ? 'Test Failed' : 'Test Intervention'}
              </Button>
              {elevenLabsConfigured && (
                <p className="text-[10px] text-text-muted text-center">Uses a small amount of API credits</p>
              )}

              <div className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  ElevenLabs Key
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={elevenLabsApiKeyDraft}
                    onChange={(e) => setElevenLabsApiKeyDraft(e.target.value)}
                    placeholder="Paste key"
                    spellCheck={false}
                    className="flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveElevenLabsApiKey}
                    disabled={savingElevenLabsApiKey}
                    className="text-xs"
                  >
                    {savingElevenLabsApiKey ? '...' : 'Save'}
                  </Button>
                </div>
                <p className="text-[10px] text-text-muted">
                  {elevenLabsConfigured ? 'Live TTS enabled.' : 'Using fallback MP3s.'}
                </p>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  When enabled, short motivational messages are sent to ElevenLabs servers for voice synthesis. No app names or personal data is included.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  Gemini AI Key
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={geminiApiKeyDraft}
                    onChange={(e) => setGeminiApiKeyDraft(e.target.value)}
                    placeholder="Paste key"
                    spellCheck={false}
                    className="flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveGeminiApiKey}
                    disabled={savingGeminiApiKey}
                    className="text-xs"
                  >
                    {savingGeminiApiKey ? '...' : 'Save'}
                  </Button>
                </div>
                <p className="text-[10px] text-text-muted">
                  {geminiConfigured ? 'Dynamic AI scripts enabled.' : 'Using default scripts.'}
                </p>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Only severity level and persona style are sent — no app names or personal data.
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  Script Source
                </p>
                <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-glass-well)] border border-white/[0.05]">
                  <button
                    onClick={() => updateScriptSource('default')}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                      scriptSource === 'default'
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                    )}
                  >
                    Default
                  </button>
                  <button
                    onClick={() => updateScriptSource('gemini')}
                    disabled={!geminiConfigured}
                    className={cn(
                      'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                      scriptSource === 'gemini'
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]',
                      !geminiConfigured && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    Gemini AI
                  </button>
                </div>
                <p className="text-[10px] text-text-muted">
                  {scriptSource === 'default'
                    ? 'Free, on-device scripts that name what you\'re doing.'
                    : 'AI-generated scripts (uses Gemini API tokens).'}
                </p>
              </div>
            </CardContent>
          </GlassCard>
        </BlurFade>

        <BlurFade delay={0.3} className="col-span-6">
          <div className="flex flex-col gap-5">
            <GlassCard variant="well">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {connectionStatus === 'disconnected'
                    ? <WifiOff className="size-5 text-danger" />
                    : <Wifi className="size-5 text-primary" />}
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    connectionStatus === 'connected' ? 'bg-success' : 'bg-danger'
                  }`} style={{ boxShadow: '0 0 6px currentColor' }} />
                  <span className={`text-xs font-medium ${
                    connectionStatus === 'connected' ? 'text-success' : 'text-danger'
                  }`}>
                    {statusLabels[connectionStatus]}
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    telemetryActive ? 'bg-success' : 'bg-warning'
                  }`} style={{ boxShadow: '0 0 6px currentColor' }} />
                  <span className={`text-xs font-medium ${
                    telemetryActive ? 'text-success' : 'text-warning'
                  }`}>
                    {telemetryActive === null ? 'Checking...' : telemetryActive ? 'Monitoring: Active' : 'Monitoring: Paused'}
                  </span>
                </div>

                <div className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">API URL</p>
                  <div className="flex gap-1.5">
                    <input
                      value={apiUrlDraft}
                      onChange={(e) => setApiUrlDraft(e.target.value)}
                      placeholder="http://127.0.0.1:8000"
                      spellCheck={false}
                      className="flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveApiUrl}
                      disabled={savingApiUrl}
                      className="text-xs"
                    >
                      {savingApiUrl ? '...' : 'Save'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 p-2 rounded-lg border border-white/[0.04]">
                  <Info className="size-3.5 text-text-muted shrink-0 mt-0.5" />
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    {connectionStatus === 'connected'
                      ? `API reachable at ${apiUrl}.`
                      : `Run \`npm run dev:api\` to start the API.`}
                  </p>
                </div>
              </CardContent>
            </GlassCard>

            <GlassCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {permissionsGranted
                    ? <ShieldCheck className="size-5 text-success" />
                    : <Shield className="size-5 text-primary" />}
                  Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  noRot needs Screen Recording permission to detect which app you're using.
                </p>

                {permissionsGranted === null ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]">
                    <Loader2 className="size-4 animate-spin text-text-muted" />
                    <span className="text-xs text-text-muted">Checking permissions...</span>
                  </div>
                ) : permissionsGranted ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-success/20 bg-success/5">
                    <ShieldCheck className="size-4 text-success" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-success">Permissions granted</span>
                      {screenRecordingStatus && (
                        <span className="text-[10px] text-text-muted">Screen Recording: {screenRecordingStatus}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                      disabled={requestingPermissions}
                      onClick={requestPermissions}
                    >
                      <Shield className="size-4 mr-2" />
                      {requestingPermissions ? 'Requesting...' : 'Turn On Permissions'}
                    </Button>

                    {screenRecordingStatus && (
                      <p className="text-[10px] text-text-muted">
                        Screen Recording status: <span className="text-text-secondary">{screenRecordingStatus}</span>
                      </p>
                    )}

                    {permissionsRequestStarted && (
                      <div className="flex items-start gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]">
                        <Zap className="size-4 text-text-muted shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-text-muted leading-relaxed">
                            If you previously denied this permission, macOS may not show the prompt again. Enable noRot under
                            <span className="text-text-secondary"> Privacy &amp; Security → Screen Recording</span>, then relaunch noRot.
                          </p>
                          <p className="text-[10px] text-text-muted leading-relaxed mt-1">
                            Tip: if you are running the dev build, macOS may list it as <span className="text-text-secondary">Electron</span> instead of noRot.
                          </p>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/[0.08]"
                              onClick={relaunchApp}
                            >
                              Relaunch noRot
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-2">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">On-device AI tracking</p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Uses a local model to guess what you are doing from the active window. Screenshots stay on your computer.
                    The model may download on first use.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingVisionEnabled}
                    className={cn(
                      'w-full',
                      visionEnabled ? 'border-warning/25 text-warning hover:bg-warning/10' : 'border-white/[0.10]'
                    )}
                    onClick={toggleVisionEnabled}
                  >
                    {savingVisionEnabled ? '...' : visionEnabled ? 'Disable AI tracking' : 'Enable AI tracking'}
                  </Button>
                </div>
              </CardContent>
            </GlassCard>
          </div>
        </BlurFade>
      </div>

      {/* Row 4: Todo & Onboarding */}
      <BlurFade delay={0.35}>
        <GlassCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="size-5 text-primary" />
              Todo & Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full border-white/[0.06] text-text-secondary hover:text-text-primary"
              onClick={async () => {
                try {
                  await getNorotAPI().openTodoOverlay();
                } catch { /* ignore */ }
              }}
            >
              <Maximize2 className="size-4 mr-2" />
              Pop out todo as floating window
            </Button>
            <Button
              variant="outline"
              className={cn(
                'w-full',
                autoShowTodoOverlay
                  ? 'border-success/30 text-success hover:bg-success/10'
                  : 'border-white/[0.06] text-text-secondary hover:text-text-primary',
              )}
              disabled={togglingOverlay}
              onClick={async () => {
                setTogglingOverlay(true);
                try {
                  const api = getNorotAPI();
                  const next = !autoShowTodoOverlay;
                  await api.updateSettings({ autoShowTodoOverlay: next });
                  setAutoShowTodoOverlay(next);

                  if (next) {
                    await api.openTodoOverlay();
                  } else {
                    await api.closeTodoOverlay();
                  }
                } catch { /* ignore */ }
                finally { setTogglingOverlay(false); }
              }}
            >
              <ListTodo className="size-4 mr-2" />
              {togglingOverlay ? '...' : autoShowTodoOverlay ? 'Todo overlay: On' : 'Todo overlay: Off'}
            </Button>

            <div className="rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Time display</p>
              <p className="text-xs text-text-secondary leading-relaxed mt-1">
                Task times show in 12-hour (AM/PM) or 24-hour format, using your chosen time zone.
              </p>

              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingTimePrefs}
                  className={cn(
                    'flex-1',
                    timeFormat === '12h'
                      ? 'border-primary/30 text-primary hover:bg-primary/10'
                      : 'border-white/[0.06] text-text-secondary hover:text-text-primary',
                  )}
                  onClick={() => persistTimeFormat('12h')}
                >
                  12-hour
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingTimePrefs}
                  className={cn(
                    'flex-1',
                    timeFormat === '24h'
                      ? 'border-primary/30 text-primary hover:bg-primary/10'
                      : 'border-white/[0.06] text-text-secondary hover:text-text-primary',
                  )}
                  onClick={() => persistTimeFormat('24h')}
                >
                  24-hour
                </Button>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Time zone</span>
                  <span className="text-[10px] text-text-secondary/70">System: {systemTimeZone}</span>
                </div>
                <input
                  list="norot-timezones"
                  value={timeZoneDraft === 'system' ? '' : timeZoneDraft}
                  onChange={(e) => setTimeZoneDraft(e.target.value)}
                  placeholder="(leave blank for system)"
                  className={cn(
                    'mt-2 w-full px-3 py-2 rounded-lg text-xs',
                    'bg-[var(--color-glass-well)] border border-white/[0.06]',
                    'text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary/40',
                  )}
                />
                {supportedTimeZones.length > 0 && (
                  <datalist id="norot-timezones">
                    {supportedTimeZones.map((z) => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                )}

                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingTimePrefs}
                    className="flex-1 border-white/[0.06] text-text-secondary hover:text-text-primary"
                    onClick={() => persistTimeZone('system')}
                  >
                    Use system
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingTimePrefs}
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => persistTimeZone(timeZoneDraft)}
                  >
                    {savingTimePrefs ? 'Saving...' : 'Save'}
                  </Button>
                </div>

                <p className="mt-1 text-[11px] text-text-secondary/70">
                  Current: {timeZone === 'system' ? systemTimeZone : timeZone}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/[0.06] text-text-secondary hover:text-text-primary"
              onClick={() => {
                useAppStore.getState().setActivePage('dashboard');
                useStartupFlowStore.getState().goToDailySetup();
              }}
            >
              <RotateCcw className="size-4 mr-2" />
              Re-run daily setup
            </Button>
            <p className="text-[10px] text-text-muted text-center">
              Re-enter your tasks for today. Your settings, persona, and history are not affected.
            </p>
          </CardContent>
        </GlassCard>
      </BlurFade>

    </div>
  );
}
