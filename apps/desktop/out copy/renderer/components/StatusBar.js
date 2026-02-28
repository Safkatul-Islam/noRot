import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { getNorotAPI } from '@/lib/norot-api';
import { motion } from 'motion/react';
import { GlassToggle } from '@/components/GlassToggle';
const statusColors = {
    connected: 'bg-success',
    disconnected: 'bg-danger',
};
const statusLabels = {
    connected: 'Connected',
    disconnected: 'Offline',
};
const voiceConfig = {
    elevenlabs: { color: 'bg-success', label: 'AI Voice' },
    fallback: { color: 'bg-warning', label: 'Local Voice' },
    error: { color: 'bg-danger', label: 'Voice Error' },
    unknown: { color: 'bg-text-muted', label: 'Voice' },
};
export function StatusBar() {
    const { connectionStatus, telemetryActive, setTelemetryActive } = useAppStore();
    const voiceSource = useVoiceStatusStore((s) => s.voiceSource);
    const vc = voiceConfig[voiceSource] ?? voiceConfig.unknown;
    const toggleTelemetry = async () => {
        try {
            const api = getNorotAPI();
            if (telemetryActive) {
                await api.stopTelemetry();
                setTelemetryActive(false);
                await api.updateSettings({ monitoringEnabled: false });
            }
            else {
                await api.startTelemetry();
                setTelemetryActive(true);
                await api.updateSettings({ monitoringEnabled: true });
            }
        }
        catch {
            // ignore — not in Electron
        }
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 300, damping: 25 }, className: "fixed bottom-3 right-4 z-20 flex items-center rounded-full bg-[var(--color-glass-well)] backdrop-blur-[16px] border border-white/[0.06] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] hover:bg-white/[0.06] transition-colors", children: [_jsx("div", { className: "flex items-center px-3 py-1.5 min-w-[44px] justify-center", children: _jsx(GlassToggle, { checked: telemetryActive, onCheckedChange: toggleTelemetry }) }), _jsx("div", { className: "w-px h-4 bg-white/[0.08]" }), _jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted", children: [_jsx("span", { className: cn('w-1.5 h-1.5 rounded-full', vc.color), style: { boxShadow: '0 0 4px currentColor' } }), _jsx("span", { children: vc.label })] }), _jsx("div", { className: "w-px h-4 bg-white/[0.08]" }), _jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted", children: [_jsx("span", { className: cn('w-1.5 h-1.5 rounded-full', statusColors[connectionStatus]), style: { boxShadow: '0 0 4px currentColor' } }), _jsx("span", { children: statusLabels[connectionStatus] })] })] }));
}
