import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { PERSONAS } from '@norot/shared';
import { cn } from '@/lib/utils';
import { CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/GlassCard';
import { ShineBorder } from '@/components/effects/ShineBorder';
import { PERSONA_ICON_MAP } from '@/lib/persona-icons';
import { getNorotAPI } from '@/lib/norot-api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/settings-store';
const personas = ['calm_friend', 'coach', 'tough_love'];
export function PersonaSelector({ selectedPersona, onSelect, compact }) {
    const [toughLoveAllowed, setToughLoveAllowed] = useState(false);
    const [gateOpen, setGateOpen] = useState(false);
    const [enabling, setEnabling] = useState(false);
    useEffect(() => {
        let cancelled = false;
        getNorotAPI()
            .getSettings()
            .then((s) => {
            if (cancelled)
                return;
            setToughLoveAllowed(Boolean(s.toughLoveExplicitAllowed));
            useSettingsStore.getState().setToughLoveExplicitAllowed(Boolean(s.toughLoveExplicitAllowed));
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    const handleSelect = useMemo(() => {
        return (key) => {
            if (key !== 'tough_love') {
                onSelect(key);
                return;
            }
            if (toughLoveAllowed) {
                onSelect(key);
                return;
            }
            setGateOpen(true);
        };
    }, [onSelect, toughLoveAllowed]);
    const enableToughLove = async () => {
        setEnabling(true);
        try {
            await getNorotAPI().updateSettings({ toughLoveExplicitAllowed: true });
            setToughLoveAllowed(true);
            useSettingsStore.getState().setToughLoveExplicitAllowed(true);
            setGateOpen(false);
            onSelect('tough_love');
        }
        catch {
            // ignore
        }
        finally {
            setEnabling(false);
        }
    };
    if (compact) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex gap-2", children: personas.map((key) => {
                        const persona = PERSONAS[key];
                        const Icon = PERSONA_ICON_MAP[key];
                        const isSelected = selectedPersona === key;
                        return (_jsxs("button", { onClick: () => handleSelect(key), className: cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium', 'transition-all duration-200', isSelected
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-[var(--color-glass-well)] border-white/[0.06] text-text-secondary hover:border-white/[0.1]'), children: [_jsx(Icon, { className: "size-3.5" }), persona.label] }, key));
                    }) }), _jsx(Dialog, { open: gateOpen, onOpenChange: setGateOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Explicit language (18+)" }), _jsx(DialogDescription, { children: "Tough Love uses profanity and aggressive humor. Are you 18 or older and want to enable it?" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setGateOpen(false), disabled: enabling, children: "Cancel" }), _jsx(Button, { onClick: enableToughLove, disabled: enabling, children: enabling ? 'Enabling…' : 'I’m 18+ — Enable' })] })] }) })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-3 gap-3", children: personas.map((key) => {
                    const persona = PERSONAS[key];
                    const Icon = PERSONA_ICON_MAP[key];
                    const isSelected = selectedPersona === key;
                    const card = (_jsx("div", { onClick: () => handleSelect(key), className: "cursor-pointer", children: _jsx(GlassCard, { className: cn('border transition-colors py-4', isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-border-hover'), children: _jsxs(CardContent, { className: "flex flex-col items-center text-center gap-2", children: [_jsx(Icon, { className: cn(isSelected ? 'size-10 text-primary' : 'size-8 text-text-secondary') }), _jsx("span", { className: cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-text-primary'), children: persona.label }), _jsx("span", { className: cn('text-xs text-text-muted', '[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden'), children: persona.description })] }) }) }));
                    return (_jsx(motion.div, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, children: isSelected ? (_jsx(ShineBorder, { children: card })) : (card) }, key));
                }) }), _jsx(Dialog, { open: gateOpen, onOpenChange: setGateOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Explicit language (18+)" }), _jsx(DialogDescription, { children: "Tough Love uses profanity and aggressive humor. Are you 18 or older and want to enable it?" })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setGateOpen(false), disabled: enabling, children: "Cancel" }), _jsx(Button, { onClick: enableToughLove, disabled: enabling, children: enabling ? 'Enabling…' : 'I’m 18+ — Enable' })] })] }) })] }));
}
