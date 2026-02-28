import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { PersonaSelector } from '@/components/PersonaSelector';
import { Button } from '@/components/ui/button';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
export function WelcomePage({ onComplete }) {
    const [persona, setPersona] = useState('calm_friend');
    const [saving, setSaving] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState(false);
    // API key drafts
    const [elevenLabsKey, setElevenLabsKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    // Pre-populate keys from saved settings (e.g. when re-running onboarding)
    useEffect(() => {
        getNorotAPI().getSettings().then((settings) => {
            if (settings.persona)
                setPersona(settings.persona);
            if (settings.elevenLabsApiKey)
                setElevenLabsKey(settings.elevenLabsApiKey);
            if (settings.geminiApiKey)
                setGeminiKey(settings.geminiApiKey);
        }).catch(() => { });
    }, []);
    const handleGetStarted = async () => {
        setSaving(true);
        try {
            const api = getNorotAPI();
            const updates = {
                persona,
            };
            if (elevenLabsKey.trim()) {
                updates.elevenLabsApiKey = elevenLabsKey.trim();
            }
            if (geminiKey.trim()) {
                updates.geminiApiKey = geminiKey.trim();
            }
            await api.updateSettings(updates);
        }
        catch (err) {
            console.error('[WelcomePage]', err);
        }
        finally {
            setSaving(false);
        }
        onComplete();
    };
    return (_jsxs("div", { className: "flex flex-col h-screen", children: [_jsx("div", { className: "h-10 shrink-0", style: { WebkitAppRegion: 'drag' } }), _jsx("div", { className: "flex-1 flex items-center justify-center p-8", children: _jsx(motion.div, { initial: { opacity: 0, y: 20, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.4, ease: 'easeOut' }, className: "w-full max-w-lg", children: _jsxs(GlassCard, { className: "items-center text-center px-8", children: [_jsx("h1", { className: "text-3xl font-bold text-text-primary tracking-tight", children: "Welcome to noRot" }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed max-w-sm", children: "noRot monitors your apps and speaks up when you drift off task. Pick a coaching style to get started." }), _jsx("div", { className: "w-full mt-2", children: _jsx(PersonaSelector, { selectedPersona: persona, onSelect: setPersona }) }), _jsx(Button, { size: "lg", className: "w-full mt-2", onClick: handleGetStarted, disabled: saving, children: saving ? 'Saving...' : 'Get Started' }), _jsxs("button", { type: "button", onClick: () => setShowApiKeys((v) => !v), disabled: saving, className: cn('mt-2 inline-flex items-center justify-center gap-1.5', 'text-xs text-text-muted hover:text-text-secondary transition-colors'), children: ["Add API keys (optional)", _jsx(ChevronDown, { className: cn('size-3.5 transition-transform duration-200', showApiKeys ? 'rotate-180' : 'rotate-0') })] }), _jsx(AnimatePresence, { initial: false, children: showApiKeys && (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.2, ease: 'easeOut' }, className: "w-full overflow-hidden", children: _jsxs("div", { className: "w-full flex flex-col gap-3 mt-3", children: [_jsx("p", { className: "text-text-secondary text-sm leading-relaxed max-w-sm mx-auto", children: elevenLabsKey || geminiKey
                                                    ? 'Your API keys are saved. You can update them below or continue.'
                                                    : 'Add API keys to unlock voice coaching and smart task suggestions. You can always add these later in Settings.' }), _jsxs("div", { className: "w-full rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-[11px] text-text-muted uppercase tracking-wider text-left", children: "ElevenLabs Key" }), elevenLabsKey && (_jsxs("div", { className: "flex items-center gap-1.5 text-emerald-400", children: [_jsx(CircleCheck, { className: "size-3" }), _jsx("span", { className: "text-[10px]", children: "Key saved" })] }))] }), _jsx("input", { type: "password", value: elevenLabsKey, onChange: (e) => setElevenLabsKey(e.target.value), placeholder: "Paste your ElevenLabs API key", spellCheck: false, className: cn('w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2', 'text-xs text-text-primary placeholder:text-text-muted', 'focus:outline-none focus:border-primary/40') }), _jsx("p", { className: "text-[10px] text-text-muted text-left leading-relaxed", children: "Enables your AI coach to talk to you with a natural voice." })] }), _jsxs("div", { className: "w-full rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-[11px] text-text-muted uppercase tracking-wider text-left", children: "Gemini AI Key" }), geminiKey && (_jsxs("div", { className: "flex items-center gap-1.5 text-emerald-400", children: [_jsx(CircleCheck, { className: "size-3" }), _jsx("span", { className: "text-[10px]", children: "Key saved" })] }))] }), _jsx("input", { type: "password", value: geminiKey, onChange: (e) => setGeminiKey(e.target.value), placeholder: "Paste your Gemini API key", spellCheck: false, className: cn('w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2', 'text-xs text-text-primary placeholder:text-text-muted', 'focus:outline-none focus:border-primary/40') }), _jsx("p", { className: "text-[10px] text-text-muted text-left leading-relaxed", children: "Enables smart task suggestions and context-aware coaching." })] })] }) })) })] }) }) })] }));
}
