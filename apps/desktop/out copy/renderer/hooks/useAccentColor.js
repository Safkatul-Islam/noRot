import { useEffect } from 'react';
import { useSettingsStore, ACCENT_PRESETS } from '@/stores/settings-store';
function getPrimaryForeground(hexColor) {
    const hex = hexColor.replace('#', '');
    const normalized = hex.length === 3
        ? hex.split('').map((char) => `${char}${char}`).join('')
        : hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness >= 160 ? '#09090b' : '#f9fafb';
}
/**
 * Applies the user's selected accent color to CSS custom properties on :root.
 * Call this once near the top of the component tree (e.g., in App or ThemeProvider).
 *
 * Returns the current preset so consumers can read ether colors, etc.
 */
export function useAccentColor() {
    const accentColor = useSettingsStore((s) => s.accentColor);
    const preset = ACCENT_PRESETS[accentColor];
    const primaryForeground = getPrimaryForeground(preset.primary);
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', preset.primary);
        root.style.setProperty('--color-primary-hover', preset.primaryHover);
        root.style.setProperty('--color-glow-primary', preset.glow);
        root.style.setProperty('--color-ring', preset.primary);
        root.style.setProperty('--color-primary-foreground', primaryForeground);
    }, [preset, primaryForeground]);
    return preset;
}
