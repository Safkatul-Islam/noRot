import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Loader2, ListTodo } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { cn } from '@/lib/utils';
export function DailySetupTaskPanel({ isReviewing, isExtracting, missingGeminiKey, todos, floatingIds, onUpdateTodos, }) {
    const allCount = todos.length;
    const withTimes = todos.filter((t) => typeof t.deadline === 'string' && t.deadline).length;
    const timeProgress = allCount === 0 ? 0 : withTimes / allCount;
    const planProgress = allCount === 0 ? 0 : 0.4 + 0.6 * timeProgress;
    const visibleTodos = todos.filter((t) => !floatingIds.has(t.id));
    const title = isReviewing ? 'Your Tasks' : 'Draft Tasks';
    const showEmptyTalking = !isReviewing && visibleTodos.length === 0 && !missingGeminiKey;
    return (_jsxs(GlassCard, { variant: "dense", className: cn('w-full md:w-[340px] px-5 py-5 gap-4', 'shrink-0 overflow-hidden', 'max-h-[calc(100vh-240px)]'), children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("div", { className: "mt-0.5 flex size-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20", children: _jsx(ListTodo, { className: "size-3.5 text-primary" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: title }), isExtracting && (_jsx(Loader2, { className: "size-3.5 text-text-secondary animate-spin" })), allCount > 0 && (_jsxs("span", { className: "ml-auto text-[10px] font-medium text-text-secondary/70", children: [Math.round(planProgress * 100), "%"] }))] }), allCount > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "h-1.5 rounded-full bg-white/10 overflow-hidden", children: _jsx("div", { className: "h-full bg-primary", style: { width: `${Math.round(planProgress * 100)}%` } }) }), !isReviewing && withTimes < allCount && (_jsx("p", { className: "mt-1 text-[11px] text-text-secondary/70", children: "Add times as you go, or set them here." }))] }))] })] }), _jsx(ScrollArea, { className: "flex-1 min-h-0 pr-2", children: _jsxs("div", { className: "py-1", children: [missingGeminiKey && (_jsx("p", { className: "text-xs text-text-secondary/70 italic px-1 pb-3 text-center", children: "Add a Gemini API key in Settings to auto-extract tasks from your conversation." })), showEmptyTalking ? (_jsx("p", { className: "text-sm text-text-secondary/60 italic px-1 py-8 text-center", children: "Tasks will appear as you talk..." })) : (_jsx(TodoPreviewList, { todos: visibleTodos, onUpdate: onUpdateTodos, itemLayoutIdPrefix: "task-bubble-" }))] }) })] }));
}
