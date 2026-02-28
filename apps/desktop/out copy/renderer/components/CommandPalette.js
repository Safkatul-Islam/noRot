import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { LayoutDashboard, Clock, Settings, Volume2, VolumeX, Palette, } from 'lucide-react';
/**
 * Cmd+K command palette — glass-styled, floats over the ether.
 * Provides keyboard-driven access to page navigation, settings, and actions.
 */
export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const { setActivePage } = useAppStore();
    const { muted, toggleMute } = useSettingsStore();
    // Cmd+K to open
    useHotkeys('meta+k, ctrl+k', (e) => {
        e.preventDefault();
        setOpen((prev) => !prev);
    }, { enableOnFormTags: true });
    // Cmd+1/2/3 for page navigation
    useHotkeys('meta+1, ctrl+1', () => setActivePage('dashboard'), { enableOnFormTags: true });
    useHotkeys('meta+2, ctrl+2', () => setActivePage('history'), { enableOnFormTags: true });
    useHotkeys('meta+3, ctrl+3', () => setActivePage('settings'), { enableOnFormTags: true });
    // Close on escape
    useEffect(() => {
        const down = (e) => {
            if (e.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-start justify-center pt-[20vh]", children: [_jsx("div", { className: "absolute inset-0 bg-black/40 backdrop-blur-[4px]", onClick: () => setOpen(false) }), _jsxs(Command, { className: "relative w-[480px] rounded-xl border border-white/[0.08] bg-[var(--color-glass)] backdrop-blur-[20px] backdrop-saturate-[1.4] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9),0_0_40px_-12px_var(--color-glow-primary)] overflow-hidden", onKeyDown: (e) => {
                    if (e.key === 'Escape')
                        setOpen(false);
                }, children: [_jsx(Command.Input, { placeholder: "Type a command...", className: "w-full bg-transparent border-b border-white/[0.06] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none" }), _jsxs(Command.List, { className: "max-h-[300px] overflow-y-auto p-2", children: [_jsx(Command.Empty, { className: "p-4 text-sm text-text-muted text-center", children: "No results." }), _jsxs(Command.Group, { heading: "Navigate", className: "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5", children: [_jsxs(CommandItem, { onSelect: () => { setActivePage('dashboard'); setOpen(false); }, children: [_jsx(LayoutDashboard, { className: "size-4" }), "Dashboard", _jsx("kbd", { className: "ml-auto text-[10px] text-text-muted", children: "Cmd+1" })] }), _jsxs(CommandItem, { onSelect: () => { setActivePage('history'); setOpen(false); }, children: [_jsx(Clock, { className: "size-4" }), "History", _jsx("kbd", { className: "ml-auto text-[10px] text-text-muted", children: "Cmd+2" })] }), _jsxs(CommandItem, { onSelect: () => { setActivePage('settings'); setOpen(false); }, children: [_jsx(Settings, { className: "size-4" }), "Settings", _jsx("kbd", { className: "ml-auto text-[10px] text-text-muted", children: "Cmd+3" })] })] }), _jsx(Command.Separator, { className: "h-px bg-white/[0.06] my-1" }), _jsxs(Command.Group, { heading: "Actions", className: "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5", children: [_jsxs(CommandItem, { onSelect: () => { toggleMute(); setOpen(false); }, children: [muted ? _jsx(VolumeX, { className: "size-4" }) : _jsx(Volume2, { className: "size-4" }), muted ? 'Unmute Voice' : 'Mute Voice'] }), _jsxs(CommandItem, { onSelect: () => { setActivePage('settings'); setOpen(false); }, children: [_jsx(Palette, { className: "size-4" }), "Change Accent Color"] })] })] }), _jsxs("div", { className: "border-t border-white/[0.06] px-4 py-2 text-[10px] text-text-muted flex items-center gap-3", children: [_jsx("span", { children: "Arrow keys to navigate" }), _jsx("span", { children: "Enter to select" }), _jsx("span", { children: "Esc to close" })] })] })] }));
}
function CommandItem({ children, onSelect }) {
    return (_jsx(Command.Item, { onSelect: onSelect, className: "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary cursor-pointer transition-colors data-[selected=true]:bg-primary/10 data-[selected=true]:text-text-primary", children: children }));
}
