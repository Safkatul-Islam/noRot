import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getNorotAPI } from '@/lib/norot-api';
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}
export function AppNameCombobox({ value, onChange, enableDropdown = true, placeholder, className, }) {
    const [open, setOpen] = useState(false);
    const [apps, setApps] = useState([]);
    const cachedRef = useRef(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    // Fetch app stats once on mount, cache in ref
    useEffect(() => {
        if (!enableDropdown)
            return;
        if (cachedRef.current) {
            setApps(cachedRef.current);
            return;
        }
        getNorotAPI().getAppStats().then((stats) => {
            // Deduplicate by appName, summing totalSeconds
            const map = new Map();
            for (const s of stats) {
                map.set(s.appName, (map.get(s.appName) ?? 0) + s.totalSeconds);
            }
            const deduped = Array.from(map.entries())
                .map(([appName, totalSeconds]) => ({ appName, totalSeconds }))
                .sort((a, b) => b.totalSeconds - a.totalSeconds);
            cachedRef.current = deduped;
            setApps(deduped);
        }).catch(() => { });
    }, [enableDropdown]);
    // Close on click outside
    useEffect(() => {
        if (!open)
            return;
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);
    // Close on escape
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    }, []);
    const filtered = apps.filter((a) => a.appName.toLowerCase().includes(value.toLowerCase()));
    // When dropdown is disabled, render as plain text input
    if (!enableDropdown) {
        return (_jsx("input", { value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: cn('px-3 py-1.5 rounded-lg text-xs', 'bg-[var(--color-glass-well)] border border-white/[0.04]', 'text-text-primary placeholder:text-text-muted focus:outline-none', className) }));
    }
    return (_jsxs("div", { ref: containerRef, className: cn('relative', className), children: [_jsx("input", { ref: inputRef, value: value, onChange: (e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true), onKeyDown: handleKeyDown, placeholder: placeholder, className: cn('w-full px-3 py-1.5 rounded-lg text-xs', 'bg-[var(--color-glass-well)] border border-white/[0.04]', 'text-text-primary placeholder:text-text-muted focus:outline-none') }), open && filtered.length > 0 && (_jsx("div", { className: cn('absolute left-0 right-0 top-full mt-1 z-[60]', 'max-h-[160px] overflow-y-auto rounded-lg', 'bg-[var(--color-glass)] border border-white/[0.08]', 'backdrop-blur-md shadow-lg'), children: filtered.map((app) => (_jsxs("button", { type: "button", onMouseDown: (e) => {
                        e.preventDefault();
                        onChange(app.appName);
                        setOpen(false);
                    }, className: cn('w-full px-3 py-1.5 text-left text-xs flex items-center justify-between', 'hover:bg-white/[0.06] transition-colors duration-100', 'text-text-primary'), children: [_jsx("span", { className: "truncate", children: app.appName }), _jsx("span", { className: "text-text-muted ml-2 shrink-0", children: formatTime(app.totalSeconds) })] }, app.appName))) }))] }));
}
