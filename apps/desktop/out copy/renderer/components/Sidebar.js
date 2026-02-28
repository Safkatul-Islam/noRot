import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { LayoutDashboard, AppWindow, Clock, Settings, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useVoiceChatStore } from '@/stores/voice-chat-store';
import { VoiceOrb } from '@/components/VoiceOrb';
import { getNorotAPI } from '@/lib/norot-api';
import { LogoEasterEgg } from '@/components/LogoEasterEgg';
const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apps', label: 'Apps', icon: AppWindow },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
];
export function Sidebar({ onToggleTodo }) {
    const { activePage, appFocused, setActivePage } = useAppStore();
    const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
    // Re-check key whenever active page changes (e.g. user returns from Settings)
    useEffect(() => {
        getNorotAPI().getSettings().then((s) => {
            setHasElevenLabsKey(Boolean(s.elevenLabsApiKey));
        }).catch(() => { });
    }, [activePage]);
    const handleOrbClick = () => {
        if (hasElevenLabsKey) {
            useVoiceChatStore.getState().open();
        }
        else {
            toast('Add your ElevenLabs API key in Settings to chat with noRot');
        }
    };
    return (_jsxs("aside", { className: "flex h-full w-[200px] flex-col items-center py-4 gap-3", children: [_jsx(LogoEasterEgg, {}), _jsx("div", { className: "w-px h-3 bg-gradient-to-b from-transparent via-white/8 to-transparent" }), _jsxs("nav", { className: "flex flex-col items-center gap-2 flex-1", children: [navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        return (_jsxs(motion.button, { onClick: () => setActivePage(item.id), whileHover: { scale: 1.06 }, whileTap: { scale: 0.97 }, transition: { type: 'spring', stiffness: 400, damping: 25 }, className: cn('relative flex items-center gap-2.5 rounded-full transition-all duration-200', 'backdrop-blur-[16px] backdrop-saturate-[1.3]', 'border border-transparent', 'w-full h-10 px-4 justify-start', isActive
                                ? 'bg-[var(--color-glass)] border-primary/40 text-primary'
                                : 'bg-[var(--color-glass-well)] text-text-secondary hover:text-text-primary hover:bg-[var(--color-glass)] hover:border-white/[0.06]'), style: isActive ? {
                                boxShadow: `0 0 16px -4px var(--color-glow-primary), inset 0 1px 0 rgba(255,255,255,0.06)`,
                            } : undefined, children: [isActive && (_jsx(motion.div, { layoutId: "sidebar-active", className: "absolute inset-0 rounded-full bg-primary/10 border border-primary/20", transition: { type: 'spring', stiffness: 350, damping: 30 } })), _jsx(Icon, { className: "size-[18px] shrink-0 relative z-10" }), _jsx("span", { className: "text-sm font-medium relative z-10 whitespace-nowrap overflow-hidden", children: item.label })] }, item.id));
                    }), onToggleTodo && (_jsxs(motion.button, { onClick: onToggleTodo, whileHover: { scale: 1.06 }, whileTap: { scale: 0.97 }, transition: { type: 'spring', stiffness: 400, damping: 25 }, className: cn('relative flex items-center gap-2.5 rounded-full transition-all duration-200', 'backdrop-blur-[16px] backdrop-saturate-[1.3]', 'border border-transparent', 'w-full h-10 px-4 justify-start', 'bg-[var(--color-glass-well)] text-text-secondary hover:text-text-primary hover:bg-[var(--color-glass)] hover:border-white/[0.06]'), children: [_jsx(ListTodo, { className: "size-[18px] shrink-0 relative z-10" }), _jsx("span", { className: "text-sm font-medium relative z-10 whitespace-nowrap overflow-hidden", children: "Todo" })] }))] }), _jsx("div", { className: "w-px h-3 bg-gradient-to-b from-transparent via-white/8 to-transparent" }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "shrink-0 self-center cursor-pointer", style: {
                                width: 160,
                                height: 160,
                                opacity: appFocused ? 1 : 0,
                                transition: 'opacity 0.15s',
                            }, onClick: handleOrbClick, children: _jsx(VoiceOrb, { paused: !appFocused, detail: 10 }) }) }), _jsx(TooltipContent, { side: "right", sideOffset: -12, children: hasElevenLabsKey
                            ? 'Click to talk to noRot'
                            : 'Add your ElevenLabs API key in Settings to chat with noRot' })] })] }));
}
