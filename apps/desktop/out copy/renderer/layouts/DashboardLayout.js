import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { StatusBar } from '@/components/StatusBar';
import { TodoPanel } from '@/components/TodoPanel';
import { getNorotAPI } from '@/lib/norot-api';
import { useAppStore } from '@/stores/app-store';
export function DashboardLayout({ children }) {
    const [todoPanelOpen, setTodoPanelOpen] = useState(false);
    useEffect(() => {
        const unsub = getNorotAPI().onAppFocusChanged?.((data) => {
            useAppStore.getState().setAppFocused(data.focused);
        });
        return () => { unsub?.(); };
    }, []);
    return (_jsxs("div", { className: "flex flex-col h-screen overflow-hidden", children: [_jsx("div", { className: "h-10 shrink-0 flex items-center border-b border-white/[0.04]", style: { WebkitAppRegion: 'drag' }, children: _jsx("div", { className: "w-[80px] shrink-0" }) }), _jsxs("div", { className: "flex flex-1 min-h-0 overflow-hidden", children: [_jsx(Sidebar, { onToggleTodo: () => setTodoPanelOpen((v) => !v) }), _jsx("div", { className: "flex flex-col flex-1 min-w-0", children: _jsx("main", { className: "flex-1 overflow-y-auto pt-6 px-6 pb-12 flex flex-col min-h-0", children: children }) }), _jsx(TodoPanel, { open: todoPanelOpen, onToggle: () => setTodoPanelOpen(false) })] }), _jsx(StatusBar, {})] }));
}
