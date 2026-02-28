import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { FREQUENCY_PRESETS } from '@/lib/frequency-presets';
import { getNorotAPI } from '@/lib/norot-api';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore, ACCENT_PRESETS, ACCENT_IDS } from '@/stores/settings-store';
import { useStartupFlowStore } from '@/stores/startup-flow-store';
import { SEVERITY_BANDS, PERSONAS, INTERVENTION_SCRIPTS, stripEmotionTags } from '@norot/shared';
import { cn } from '@/lib/utils';
import { Settings2, Volume2, VolumeX, Wifi, WifiOff, Gauge, MessageSquare, Info, Palette, Check, Play, CheckCircle, XCircle, Loader2, Zap, Shield, ShieldCheck, ListTodo, Maximize2, RotateCcw, } from 'lucide-react';
function getPreviewMessages(persona) {
    const scripts = INTERVENTION_SCRIPTS[persona];
    return [1, 2, 3, 4].map((sev) => ({
        severity: sev,
        text: stripEmotionTags(scripts[sev] ?? ''),
    }));
}
export function SettingsPage() {
    const { persona, interventionFrequency, muted, ttsEngine, updatePersona, updateFrequency, updateMuted, updateTtsEngine, } = useSettings();
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
    const [testResult, setTestResult] = useState('idle');
    const [testingIntervention, setTestingIntervention] = useState(false);
    const [interventionTestResult, setInterventionTestResult] = useState('idle');
    const [telemetryActive, setTelemetryActive] = useState(null);
    const [permissionsGranted, setPermissionsGranted] = useState(null);
    const [screenRecordingStatus, setScreenRecordingStatus] = useState(null);
    const [requestingPermissions, setRequestingPermissions] = useState(false);
    const [permissionsRequestStarted, setPermissionsRequestStarted] = useState(false);
    const [visionEnabled, setVisionEnabled] = useState(true);
    const [savingVisionEnabled, setSavingVisionEnabled] = useState(false);
    const [scriptSource, setScriptSourceLocal] = useState('default');
    const [autoShowTodoOverlay, setAutoShowTodoOverlay] = useState(true);
    const [togglingOverlay, setTogglingOverlay] = useState(false);
    const [timeFormat, setTimeFormat] = useState('12h');
    const [timeZone, setTimeZone] = useState('system');
    const [timeZoneDraft, setTimeZoneDraft] = useState('system');
    const [savingTimePrefs, setSavingTimePrefs] = useState(false);
    const [supportedTimeZones, setSupportedTimeZones] = useState([]);
    const statusLabels = {
        connected: 'Connected to API',
        disconnected: 'Disconnected',
    };
    const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const persistTimeFormat = async (next) => {
        setTimeFormat(next);
        setSavingTimePrefs(true);
        try {
            await getNorotAPI().updateSettings({ timeFormat: next });
        }
        catch {
            // ignore
        }
        finally {
            setSavingTimePrefs(false);
        }
    };
    const persistTimeZone = async (next) => {
        const trimmed = next.trim();
        const value = trimmed ? trimmed : 'system';
        setTimeZoneDraft(value);
        setSavingTimePrefs(true);
        try {
            await getNorotAPI().updateSettings({ timeZone: value });
            setTimeZone(value);
        }
        catch {
            // ignore
        }
        finally {
            setSavingTimePrefs(false);
        }
    };
    useEffect(() => {
        let cancelled = false;
        const api = getNorotAPI();
        api.getSettings()
            .then((settings) => {
            const url = typeof settings?.apiUrl === 'string' ? settings.apiUrl.trim() : '';
            if (!cancelled && url) {
                setApiUrl(url);
                setApiUrlDraft(url);
            }
            const key = typeof settings?.elevenLabsApiKey === 'string'
                ? settings.elevenLabsApiKey.trim()
                : '';
            if (!cancelled)
                setElevenLabsConfigured(key.length > 0);
            const geminiKey = typeof settings?.geminiApiKey === 'string'
                ? settings.geminiApiKey.trim()
                : '';
            if (!cancelled)
                setGeminiConfigured(geminiKey.length > 0);
            if (!cancelled)
                setScriptSourceLocal(settings?.scriptSource ?? 'default');
            if (!cancelled)
                setVisionEnabled(settings?.visionEnabled ?? true);
            if (!cancelled)
                setAutoShowTodoOverlay(settings?.autoShowTodoOverlay ?? true);
            if (!cancelled)
                setTimeFormat(settings?.timeFormat ?? '12h');
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
            const intlAny = Intl;
            const zones = typeof intlAny.supportedValuesOf === 'function'
                ? intlAny.supportedValuesOf('timeZone')
                : [];
            if (Array.isArray(zones) && zones.length > 0)
                setSupportedTimeZones(zones);
        }
        catch {
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
            }
            catch {
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
        }
        catch {
            // ignore
        }
        finally {
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
        }
        catch {
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
        }
        catch {
            // ignore
        }
        finally {
            setSavingVisionEnabled(false);
        }
    };
    const saveApiUrl = async () => {
        const next = apiUrlDraft.trim();
        if (!next)
            return;
        setSavingApiUrl(true);
        try {
            const api = getNorotAPI();
            await api.updateSettings({ apiUrl: next });
            setApiUrl(next);
        }
        catch {
            // ignore
        }
        finally {
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
        }
        catch {
            // ignore
        }
        finally {
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
        }
        catch {
            // ignore
        }
        finally {
            setSavingGeminiApiKey(false);
        }
    };
    const updateScriptSource = async (next) => {
        setScriptSourceLocal(next);
        try {
            await getNorotAPI().updateSettings({ scriptSource: next });
        }
        catch {
            // ignore
        }
    };
    const testVoice = async () => {
        setTestingVoice(true);
        setTestResult('idle');
        try {
            if (ttsEngine === 'local') {
                if (!('speechSynthesis' in window))
                    throw new Error('Not available');
                const utter = new SpeechSynthesisUtterance('Testing local voice.');
                await new Promise((resolve, reject) => {
                    utter.onend = () => resolve();
                    utter.onerror = (e) => reject(new Error(e.error));
                    speechSynthesis.speak(utter);
                });
            }
            else {
                const player = new AudioPlayer();
                if (elevenLabsConfigured) {
                    const client = new ElevenLabsClient();
                    const audio = await client.synthesize('Testing voice.', 'EXAVITQu4vr4xnSDxMaL', { model: 'eleven_v3', stability: 50, speed: 1.0 });
                    await player.play(audio);
                }
                else {
                    await player.playUrl('audio/calm_friend/severity-1.mp3');
                }
            }
            setTestResult('success');
        }
        catch {
            setTestResult('error');
        }
        finally {
            setTestingVoice(false);
        }
    };
    const testIntervention = async () => {
        setTestingIntervention(true);
        setInterventionTestResult('idle');
        try {
            await getNorotAPI().testIntervention();
            setInterventionTestResult('success');
        }
        catch {
            setInterventionTestResult('error');
        }
        finally {
            setTestingIntervention(false);
        }
    };
    const previewMessages = getPreviewMessages(persona);
    return (_jsxs("div", { className: "flex flex-col gap-5 pb-10", children: [_jsxs("div", { className: "grid grid-cols-12 gap-5 shrink-0", children: [_jsx(BlurFade, { delay: 0, className: "col-span-7", children: _jsxs(GlassCard, { className: "h-full", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Settings2, { className: "size-5 text-primary" }), "Persona"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-text-secondary leading-relaxed", children: "Choose how noRot talks to you during interventions." }), _jsx(PersonaSelector, { selectedPersona: persona, onSelect: updatePersona })] })] }) }), _jsx(BlurFade, { delay: 0.05, className: "col-span-5", children: _jsxs(GlassCard, { variant: "well", className: "h-full", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(MessageSquare, { className: "size-5 text-primary" }), PERSONAS[persona].label, " Preview"] }), _jsx("p", { className: "text-xs text-text-muted mt-1", children: scriptSource === 'gemini'
                                                ? 'With Gemini AI selected, actual messages will vary. These are fallback examples.'
                                                : "Here's what your coach will say at each level." })] }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2.5", children: previewMessages.map(({ severity, text }) => {
                                            const band = SEVERITY_BANDS[severity];
                                            return (_jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] p-2.5 space-y-1", style: { borderLeft: `3px solid ${band.color}`, boxShadow: `inset 2px 0 6px ${band.color}15` }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] font-medium", style: { color: band.color }, children: band.label }), _jsx("span", { className: "text-[10px] text-text-muted", children: band.mode })] }), _jsxs("p", { className: "text-xs text-text-secondary leading-relaxed", children: ["\u201C", text, "\u201D"] })] }, severity));
                                        }) }) })] }) })] }), _jsxs("div", { className: "grid grid-cols-12 gap-5 items-start", children: [_jsx(BlurFade, { delay: 0.1, className: "col-span-6", children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Palette, { className: "size-5 text-primary" }), "Accent Color"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-4", children: [_jsx("p", { className: "text-sm text-text-secondary leading-relaxed", children: "Choose an accent color for the interface and fluid background." }), _jsx("div", { className: "flex flex-wrap gap-3 justify-center", children: ACCENT_IDS.map((id) => {
                                                const preset = ACCENT_PRESETS[id];
                                                const isActive = accentColor === id;
                                                return (_jsx(motion.button, { onClick: () => setAccentColor(id), whileHover: { scale: 1.15 }, whileTap: { scale: 0.95 }, transition: { type: 'spring', stiffness: 400, damping: 20 }, className: cn('relative w-10 h-10 rounded-full transition-all duration-200', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60'), style: {
                                                        backgroundColor: preset.primary,
                                                        boxShadow: isActive
                                                            ? `0 0 0 2px var(--color-background), 0 0 0 4px ${preset.primary}, 0 0 20px ${preset.glow}`
                                                            : `0 0 8px ${preset.primary}30`,
                                                    }, title: preset.label, children: isActive && (_jsx(Check, { className: "absolute inset-0 m-auto size-4 text-primary-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" })) }, id));
                                            }) }), _jsx("p", { className: "text-xs text-text-muted text-center", children: ACCENT_PRESETS[accentColor].label })] })] }) }), _jsx(BlurFade, { delay: 0.15, className: "col-span-6", children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Gauge, { className: "size-5 text-primary" }), "Intervention Frequency"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-4", children: [_jsx("p", { className: "text-sm text-text-secondary leading-relaxed", children: "How often should noRot check in with you?" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex justify-between text-[10px] text-text-muted px-1", children: [_jsx("span", { children: "Rarely" }), _jsx("span", { children: "Often" })] }), _jsx(Slider, { min: 0, max: 4, step: 1, value: [interventionFrequency], onValueChange: ([v]) => updateFrequency(v) }), _jsx("div", { className: "flex justify-between px-[10px]", children: FREQUENCY_PRESETS.map((preset) => (_jsx("div", { className: cn('size-2 rounded-full transition-all', preset.id === interventionFrequency
                                                            ? 'bg-primary scale-125'
                                                            : 'bg-text-muted/30') }, preset.id))) })] }), _jsx("p", { className: "text-center text-lg font-semibold text-text-primary", children: FREQUENCY_PRESETS[interventionFrequency].label })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-12 gap-5 items-start", children: [_jsx(BlurFade, { delay: 0.25, className: "col-span-6", children: _jsxs(GlassCard, { className: "h-full", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [muted
                                                ? _jsx(VolumeX, { className: "size-5 text-danger" })
                                                : _jsx(Volume2, { className: "size-5 text-primary" }), "Audio"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-3", children: [_jsx("div", { className: "flex gap-1 p-1 rounded-lg bg-[var(--color-glass-well)] border border-white/[0.05]", children: [
                                                { value: 'auto', label: 'Auto', desc: 'ElevenLabs with MP3 fallback' },
                                                { value: 'elevenlabs', label: 'ElevenLabs', desc: 'API voice only (uses credits)' },
                                                { value: 'local', label: 'Local (Free)', desc: 'Browser built-in voice' },
                                            ].map((opt) => (_jsx("button", { onClick: () => updateTtsEngine(opt.value), className: cn('flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all', ttsEngine === opt.value
                                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'), title: opt.desc, children: opt.label }, opt.value))) }), _jsxs("p", { className: "text-[10px] text-text-muted text-center", children: [ttsEngine === 'auto' && 'Tries ElevenLabs, falls back to local MP3s.', ttsEngine === 'elevenlabs' && 'ElevenLabs API only. Uses credits per intervention.', ttsEngine === 'local' && 'Free browser voice. No API key needed.'] }), _jsx("p", { className: "text-xs text-text-secondary leading-relaxed", children: muted
                                                ? 'Voice interventions are muted.'
                                                : 'Voice interventions enabled.' }), _jsxs(Button, { variant: "outline", className: cn('w-full', muted
                                                ? 'border-danger/30 text-danger hover:bg-danger/10'
                                                : 'border-success/30 text-success hover:bg-success/10'), onClick: updateMuted, children: [muted ? _jsx(VolumeX, { className: "size-4 mr-2" }) : _jsx(Volume2, { className: "size-4 mr-2" }), muted ? 'Unmute' : 'Mute'] }), _jsxs(Button, { variant: "outline", className: "w-full border-white/[0.06] text-text-secondary hover:text-text-primary", onClick: testVoice, disabled: testingVoice, children: [testingVoice ? (_jsx(Loader2, { className: "size-4 mr-2 animate-spin" })) : testResult === 'success' ? (_jsx(CheckCircle, { className: "size-4 mr-2 text-success" })) : testResult === 'error' ? (_jsx(XCircle, { className: "size-4 mr-2 text-danger" })) : (_jsx(Play, { className: "size-4 mr-2" })), testingVoice ? 'Testing...' : testResult === 'success' ? 'Voice OK' : testResult === 'error' ? 'Test Failed' : 'Test Voice'] }), _jsxs(Button, { variant: "outline", className: "w-full border-primary/20 text-primary hover:bg-primary/10", onClick: testIntervention, disabled: testingIntervention, children: [testingIntervention ? (_jsx(Loader2, { className: "size-4 mr-2 animate-spin" })) : interventionTestResult === 'success' ? (_jsx(CheckCircle, { className: "size-4 mr-2 text-success" })) : interventionTestResult === 'error' ? (_jsx(XCircle, { className: "size-4 mr-2 text-danger" })) : (_jsx(Zap, { className: "size-4 mr-2" })), testingIntervention ? 'Testing...' : interventionTestResult === 'success' ? 'Intervention Sent' : interventionTestResult === 'error' ? 'Test Failed' : 'Test Intervention'] }), elevenLabsConfigured && (_jsx("p", { className: "text-[10px] text-text-muted text-center", children: "Uses a small amount of API credits" })), _jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "ElevenLabs Key" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { type: "password", value: elevenLabsApiKeyDraft, onChange: (e) => setElevenLabsApiKeyDraft(e.target.value), placeholder: "Paste key", spellCheck: false, className: "flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40" }), _jsx(Button, { variant: "outline", size: "sm", onClick: saveElevenLabsApiKey, disabled: savingElevenLabsApiKey, className: "text-xs", children: savingElevenLabsApiKey ? '...' : 'Save' })] }), _jsx("p", { className: "text-[10px] text-text-muted", children: elevenLabsConfigured ? 'Live TTS enabled.' : 'Using fallback MP3s.' }), _jsx("p", { className: "text-[10px] text-text-muted leading-relaxed", children: "When enabled, short motivational messages are sent to ElevenLabs servers for voice synthesis. No app names or personal data is included." })] }), _jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "Gemini AI Key" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { type: "password", value: geminiApiKeyDraft, onChange: (e) => setGeminiApiKeyDraft(e.target.value), placeholder: "Paste key", spellCheck: false, className: "flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40" }), _jsx(Button, { variant: "outline", size: "sm", onClick: saveGeminiApiKey, disabled: savingGeminiApiKey, className: "text-xs", children: savingGeminiApiKey ? '...' : 'Save' })] }), _jsx("p", { className: "text-[10px] text-text-muted", children: geminiConfigured ? 'Dynamic AI scripts enabled.' : 'Using default scripts.' }), _jsx("p", { className: "text-[10px] text-text-muted leading-relaxed", children: "Only severity level and persona style are sent \u2014 no app names or personal data." })] }), _jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "Script Source" }), _jsxs("div", { className: "flex gap-1 p-1 rounded-lg bg-[var(--color-glass-well)] border border-white/[0.05]", children: [_jsx("button", { onClick: () => updateScriptSource('default'), className: cn('flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all', scriptSource === 'default'
                                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'), children: "Default" }), _jsx("button", { onClick: () => updateScriptSource('gemini'), disabled: !geminiConfigured, className: cn('flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all', scriptSource === 'gemini'
                                                                ? 'bg-primary/20 text-primary border border-primary/30'
                                                                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]', !geminiConfigured && 'opacity-40 cursor-not-allowed'), children: "Gemini AI" })] }), _jsx("p", { className: "text-[10px] text-text-muted", children: scriptSource === 'default'
                                                        ? 'Free, on-device scripts that name what you\'re doing.'
                                                        : 'AI-generated scripts (uses Gemini API tokens).' })] })] })] }) }), _jsx(BlurFade, { delay: 0.3, className: "col-span-6", children: _jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs(GlassCard, { variant: "well", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [connectionStatus === 'disconnected'
                                                        ? _jsx(WifiOff, { className: "size-5 text-danger" })
                                                        : _jsx(Wifi, { className: "size-5 text-primary" }), "Connection"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]", children: [_jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${connectionStatus === 'connected' ? 'bg-success' : 'bg-danger'}`, style: { boxShadow: '0 0 6px currentColor' } }), _jsx("span", { className: `text-xs font-medium ${connectionStatus === 'connected' ? 'text-success' : 'text-danger'}`, children: statusLabels[connectionStatus] })] }), _jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]", children: [_jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${telemetryActive ? 'bg-success' : 'bg-warning'}`, style: { boxShadow: '0 0 6px currentColor' } }), _jsx("span", { className: `text-xs font-medium ${telemetryActive ? 'text-success' : 'text-warning'}`, children: telemetryActive === null ? 'Checking...' : telemetryActive ? 'Monitoring: Active' : 'Monitoring: Paused' })] }), _jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-1.5", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "API URL" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { value: apiUrlDraft, onChange: (e) => setApiUrlDraft(e.target.value), placeholder: "http://127.0.0.1:8000", spellCheck: false, className: "flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40" }), _jsx(Button, { variant: "outline", size: "sm", onClick: saveApiUrl, disabled: savingApiUrl, className: "text-xs", children: savingApiUrl ? '...' : 'Save' })] })] }), _jsxs("div", { className: "flex items-start gap-1.5 p-2 rounded-lg border border-white/[0.04]", children: [_jsx(Info, { className: "size-3.5 text-text-muted shrink-0 mt-0.5" }), _jsx("p", { className: "text-[10px] text-text-muted leading-relaxed", children: connectionStatus === 'connected'
                                                                ? `API reachable at ${apiUrl}.`
                                                                : `Run \`npm run dev:api\` to start the API.` })] })] })] }), _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [permissionsGranted
                                                        ? _jsx(ShieldCheck, { className: "size-5 text-success" })
                                                        : _jsx(Shield, { className: "size-5 text-primary" }), "Permissions"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-3", children: [_jsx("p", { className: "text-xs text-text-secondary leading-relaxed", children: "noRot needs Screen Recording permission to detect which app you're using." }), permissionsGranted === null ? (_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]", children: [_jsx(Loader2, { className: "size-4 animate-spin text-text-muted" }), _jsx("span", { className: "text-xs text-text-muted", children: "Checking permissions..." })] })) : permissionsGranted ? (_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg border border-success/20 bg-success/5", children: [_jsx(ShieldCheck, { className: "size-4 text-success" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium text-success", children: "Permissions granted" }), screenRecordingStatus && (_jsxs("span", { className: "text-[10px] text-text-muted", children: ["Screen Recording: ", screenRecordingStatus] }))] })] })) : (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs(Button, { variant: "outline", className: "w-full border-primary/30 text-primary hover:bg-primary/10", disabled: requestingPermissions, onClick: requestPermissions, children: [_jsx(Shield, { className: "size-4 mr-2" }), requestingPermissions ? 'Requesting...' : 'Turn On Permissions'] }), screenRecordingStatus && (_jsxs("p", { className: "text-[10px] text-text-muted", children: ["Screen Recording status: ", _jsx("span", { className: "text-text-secondary", children: screenRecordingStatus })] })), permissionsRequestStarted && (_jsxs("div", { className: "flex items-start gap-2 p-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)]", children: [_jsx(Zap, { className: "size-4 text-text-muted shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "text-xs text-text-muted leading-relaxed", children: ["If you previously denied this permission, macOS may not show the prompt again. Enable noRot under", _jsx("span", { className: "text-text-secondary", children: " Privacy & Security \u2192 Screen Recording" }), ", then relaunch noRot."] }), _jsxs("p", { className: "text-[10px] text-text-muted leading-relaxed mt-1", children: ["Tip: if you are running the dev build, macOS may list it as ", _jsx("span", { className: "text-text-secondary", children: "Electron" }), " instead of noRot."] }), _jsx("div", { className: "mt-2", children: _jsx(Button, { variant: "outline", size: "sm", className: "border-white/[0.08]", onClick: relaunchApp, children: "Relaunch noRot" }) })] })] }))] })), _jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-2.5 space-y-2", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "On-device AI tracking" }), _jsx("p", { className: "text-xs text-text-secondary leading-relaxed", children: "Uses a local model to guess what you are doing from the active window. Screenshots stay on your computer. The model may download on first use." }), _jsx(Button, { variant: "outline", size: "sm", disabled: savingVisionEnabled, className: cn('w-full', visionEnabled ? 'border-warning/25 text-warning hover:bg-warning/10' : 'border-white/[0.10]'), onClick: toggleVisionEnabled, children: savingVisionEnabled ? '...' : visionEnabled ? 'Disable AI tracking' : 'Enable AI tracking' })] })] })] })] }) })] }), _jsx(BlurFade, { delay: 0.35, children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(ListTodo, { className: "size-5 text-primary" }), "Todo & Onboarding"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-3", children: [_jsxs(Button, { variant: "outline", className: "w-full border-white/[0.06] text-text-secondary hover:text-text-primary", onClick: async () => {
                                        try {
                                            await getNorotAPI().openTodoOverlay();
                                        }
                                        catch { /* ignore */ }
                                    }, children: [_jsx(Maximize2, { className: "size-4 mr-2" }), "Pop out todo as floating window"] }), _jsxs(Button, { variant: "outline", className: cn('w-full', autoShowTodoOverlay
                                        ? 'border-success/30 text-success hover:bg-success/10'
                                        : 'border-white/[0.06] text-text-secondary hover:text-text-primary'), disabled: togglingOverlay, onClick: async () => {
                                        setTogglingOverlay(true);
                                        try {
                                            const api = getNorotAPI();
                                            const next = !autoShowTodoOverlay;
                                            await api.updateSettings({ autoShowTodoOverlay: next });
                                            setAutoShowTodoOverlay(next);
                                            if (next) {
                                                await api.openTodoOverlay();
                                            }
                                            else {
                                                await api.closeTodoOverlay();
                                            }
                                        }
                                        catch { /* ignore */ }
                                        finally {
                                            setTogglingOverlay(false);
                                        }
                                    }, children: [_jsx(ListTodo, { className: "size-4 mr-2" }), togglingOverlay ? '...' : autoShowTodoOverlay ? 'Todo overlay: On' : 'Todo overlay: Off'] }), _jsxs("div", { className: "rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3", children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "Time display" }), _jsx("p", { className: "text-xs text-text-secondary leading-relaxed mt-1", children: "Task times show in 12-hour (AM/PM) or 24-hour format, using your chosen time zone." }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: savingTimePrefs, className: cn('flex-1', timeFormat === '12h'
                                                        ? 'border-primary/30 text-primary hover:bg-primary/10'
                                                        : 'border-white/[0.06] text-text-secondary hover:text-text-primary'), onClick: () => persistTimeFormat('12h'), children: "12-hour" }), _jsx(Button, { variant: "outline", size: "sm", disabled: savingTimePrefs, className: cn('flex-1', timeFormat === '24h'
                                                        ? 'border-primary/30 text-primary hover:bg-primary/10'
                                                        : 'border-white/[0.06] text-text-secondary hover:text-text-primary'), onClick: () => persistTimeFormat('24h'), children: "24-hour" })] }), _jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "Time zone" }), _jsxs("span", { className: "text-[10px] text-text-secondary/70", children: ["System: ", systemTimeZone] })] }), _jsx("input", { list: "norot-timezones", value: timeZoneDraft === 'system' ? '' : timeZoneDraft, onChange: (e) => setTimeZoneDraft(e.target.value), placeholder: "(leave blank for system)", className: cn('mt-2 w-full px-3 py-2 rounded-lg text-xs', 'bg-[var(--color-glass-well)] border border-white/[0.06]', 'text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary/40') }), supportedTimeZones.length > 0 && (_jsx("datalist", { id: "norot-timezones", children: supportedTimeZones.map((z) => (_jsx("option", { value: z }, z))) })), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: savingTimePrefs, className: "flex-1 border-white/[0.06] text-text-secondary hover:text-text-primary", onClick: () => persistTimeZone('system'), children: "Use system" }), _jsx(Button, { variant: "outline", size: "sm", disabled: savingTimePrefs, className: "flex-1 border-primary/30 text-primary hover:bg-primary/10", onClick: () => persistTimeZone(timeZoneDraft), children: savingTimePrefs ? 'Saving...' : 'Save' })] }), _jsxs("p", { className: "mt-1 text-[11px] text-text-secondary/70", children: ["Current: ", timeZone === 'system' ? systemTimeZone : timeZone] })] })] }), _jsxs(Button, { variant: "outline", className: "w-full border-white/[0.06] text-text-secondary hover:text-text-primary", onClick: () => {
                                        useAppStore.getState().setActivePage('dashboard');
                                        useStartupFlowStore.getState().goToDailySetup();
                                    }, children: [_jsx(RotateCcw, { className: "size-4 mr-2" }), "Re-run daily setup"] }), _jsx("p", { className: "text-[10px] text-text-muted text-center", children: "Re-enter your tasks for today. Your settings, persona, and history are not affected." })] })] }) })] }));
}
