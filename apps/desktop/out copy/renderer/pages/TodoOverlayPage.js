import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { TodoItemList } from '@/components/TodoItemList';
import { VoiceOrb } from '@/components/VoiceOrb';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { useScoreStore } from '@/stores/score-store';
export function TodoOverlayPage() {
    const [todos, setTodos] = useState([]);
    const [hasKey, setHasKey] = useState(false);
    const loadTodos = useCallback(async () => {
        try {
            const items = await getNorotAPI().getTodos();
            setTodos(items);
        }
        catch { /* ignore */ }
    }, []);
    useEffect(() => {
        // Make body transparent for Electron transparent window
        document.documentElement.style.background = 'transparent';
        document.body.style.background = 'transparent';
        loadTodos();
        const api = getNorotAPI();
        const unsubTodos = api.onTodosUpdated((updated) => setTodos(updated));
        // Check if ElevenLabs API key is configured
        api.hasElevenLabsKey?.().then(setHasKey).catch(() => { });
        // Listen for voice status broadcasts from main window
        const unsubVoice = api.onVoiceStatus?.((data) => {
            useVoiceStatusStore.getState().setIsSpeaking(data.isSpeaking);
            useVoiceStatusStore.getState().setAmplitude(data.amplitude);
            useScoreStore.getState().setSeverity(data.severity);
            if (data.lastWordBoundaryAt > 0) {
                useVoiceStatusStore.setState({ lastWordBoundaryAt: data.lastWordBoundaryAt });
            }
        });
        return () => {
            unsubTodos();
            unsubVoice?.();
        };
    }, [loadTodos]);
    const handleToggle = async (id) => {
        try {
            await getNorotAPI().toggleTodo(id);
        }
        catch { /* ignore */ }
    };
    const handleDelete = async (id) => {
        try {
            await getNorotAPI().deleteTodo(id);
        }
        catch { /* ignore */ }
    };
    const handleAdd = async (text, app, url) => {
        try {
            const newTodo = {
                id: crypto.randomUUID(),
                text,
                done: false,
                order: todos.length,
                ...(app ? { app } : {}),
                ...(url ? { url } : {}),
            };
            await getNorotAPI().addTodo(newTodo);
        }
        catch { /* ignore */ }
    };
    const handleUpdate = async (id, fields) => {
        try {
            await getNorotAPI().updateTodo(id, fields);
        }
        catch { /* ignore */ }
    };
    const handleOrbClick = () => {
        if (hasKey) {
            getNorotAPI().openVoiceChat();
        }
    };
    return (_jsx("div", { className: "dark", children: _jsxs("div", { className: cn('flex flex-col h-screen w-screen overflow-hidden', 'bg-[rgba(9,9,11,0.85)] backdrop-blur-[20px] rounded-xl'), children: [_jsx("div", { className: "h-8 shrink-0 flex items-center px-3", style: { WebkitAppRegion: 'drag' }, children: _jsx("span", { className: "text-xs font-medium text-text-secondary", children: "Todo" }) }), _jsx(ScrollArea, { className: "flex-1 min-h-0", children: _jsx("div", { className: "px-3 pb-3", children: _jsx(TodoItemList, { todos: todos, onToggle: handleToggle, onDelete: handleDelete, onAdd: handleAdd, onUpdate: handleUpdate, enableAppDropdown: false }) }) }), _jsx("div", { className: "shrink-0 h-[100px] flex items-center justify-center border-t border-white/[0.06] overflow-visible", children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "w-[140px] h-[140px] -mt-[20px] cursor-pointer", onClick: handleOrbClick, children: _jsx(VoiceOrb, { detail: 10 }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: -12, children: hasKey
                                    ? 'Click to talk to noRot'
                                    : 'Add your ElevenLabs API key in Settings to chat with noRot' })] }) })] }) }));
}
