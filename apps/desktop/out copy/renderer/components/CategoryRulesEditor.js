import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
const CATEGORY_COLORS = {
    productive: '#22c55e',
    neutral: '#6b7280',
    social: '#3b82f6',
    entertainment: '#f97316',
};
export function CategoryRulesEditor() {
    const [rules, setRules] = useState([]);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const api = getNorotAPI();
        api.getSettings().then((settings) => {
            if (!cancelled && settings?.categoryRules) {
                setRules(settings.categoryRules);
            }
            setLoaded(true);
        }).catch(() => {
            setLoaded(true);
        });
        return () => { cancelled = true; };
    }, []);
    const save = (updated) => {
        setRules(updated);
        const api = getNorotAPI();
        api.updateSettings({ categoryRules: updated }).catch(() => { });
    };
    const updateRule = (index, patch) => {
        const updated = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
        save(updated);
    };
    const deleteRule = (index) => {
        save(rules.filter((_, i) => i !== index));
    };
    const addRule = () => {
        save([
            ...rules,
            {
                id: crypto.randomUUID(),
                matchType: 'app',
                pattern: '',
                category: 'neutral',
            },
        ]);
    };
    if (!loaded) {
        return _jsx("p", { className: "text-xs text-text-muted", children: "Loading..." });
    }
    return (_jsxs("div", { className: "space-y-2", children: [rules.map((rule, i) => (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] px-2.5 py-1.5", children: [_jsxs("span", { className: "text-[10px] text-text-muted w-5 text-right tabular-nums shrink-0", children: [i + 1, "."] }), _jsxs("select", { value: rule.matchType, onChange: (e) => updateRule(i, { matchType: e.target.value }), className: "bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40", children: [_jsx("option", { value: "app", children: "App" }), _jsx("option", { value: "title", children: "Title" })] }), _jsx("input", { type: "text", value: rule.pattern, onChange: (e) => updateRule(i, { pattern: e.target.value }), placeholder: "Pattern...", spellCheck: false, className: "flex-1 min-w-0 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full shrink-0", style: {
                                    backgroundColor: CATEGORY_COLORS[rule.category] ?? '#6b7280',
                                    boxShadow: `0 0 4px ${CATEGORY_COLORS[rule.category] ?? '#6b7280'}50`,
                                } }), _jsxs("select", { value: rule.category, onChange: (e) => updateRule(i, {
                                    category: e.target.value,
                                }), className: "bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40", children: [_jsx("option", { value: "productive", children: "Productive" }), _jsx("option", { value: "neutral", children: "Neutral" }), _jsx("option", { value: "social", children: "Social" }), _jsx("option", { value: "entertainment", children: "Entertainment" })] })] }), _jsx("button", { onClick: () => deleteRule(i), className: "shrink-0 p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors", children: _jsx(X, { className: "size-3.5" }) })] }, rule.id))), _jsxs(Button, { variant: "outline", size: "sm", onClick: addRule, className: "w-full text-xs", children: [_jsx(Plus, { className: "size-3.5 mr-1.5" }), "Add Rule"] })] }));
}
