import { useEffect, useState } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import type { CategoryRule } from '@/lib/electron-api';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  productive: '#22c55e',
  neutral: '#6b7280',
  social: '#3b82f6',
  entertainment: '#f97316',
};

export function CategoryRulesEditor() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
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

  const save = (updated: CategoryRule[]) => {
    setRules(updated);
    const api = getNorotAPI();
    api.updateSettings({ categoryRules: updated }).catch(() => {});
  };

  const updateRule = (index: number, patch: Partial<CategoryRule>) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    save(updated);
  };

  const deleteRule = (index: number) => {
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
    return <p className="text-xs text-text-muted">Loading...</p>;
  }

  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div
          key={rule.id}
          className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] px-2.5 py-1.5"
        >
          <span className="text-[10px] text-text-muted w-5 text-right tabular-nums shrink-0">
            {i + 1}.
          </span>

          <select
            value={rule.matchType}
            onChange={(e) => updateRule(i, { matchType: e.target.value as 'app' | 'title' })}
            className="bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40"
          >
            <option value="app">App</option>
            <option value="title">Title</option>
          </select>

          <input
            type="text"
            value={rule.pattern}
            onChange={(e) => updateRule(i, { pattern: e.target.value })}
            placeholder="Pattern..."
            spellCheck={false}
            className="flex-1 min-w-0 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
          />

          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: CATEGORY_COLORS[rule.category] ?? '#6b7280',
                boxShadow: `0 0 4px ${CATEGORY_COLORS[rule.category] ?? '#6b7280'}50`,
              }}
            />
            <select
              value={rule.category}
              onChange={(e) =>
                updateRule(i, {
                  category: e.target.value as CategoryRule['category'],
                })
              }
              className="bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40"
            >
              <option value="productive">Productive</option>
              <option value="neutral">Neutral</option>
              <option value="social">Social</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>

          <button
            onClick={() => deleteRule(i)}
            className="shrink-0 p-1 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addRule}
        className="w-full text-xs"
      >
        <Plus className="size-3.5 mr-1.5" />
        Add Rule
      </Button>
    </div>
  );
}
