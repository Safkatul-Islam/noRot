import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { getNorotAPI } from '@/lib/norot-api';
import { BarChart3 } from 'lucide-react';

interface UsagePoint {
  timestamp: string;
  productive: number;
  distracting: number;
  label: string;
}

export function UsageChart() {
  const [data, setData] = useState<UsagePoint[]>([]);
  const formatNumber = (value: unknown): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    return (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
  };

  useEffect(() => {
    const api = getNorotAPI();
    api.getUsageHistory().then(
      (history: { timestamp: string; productive: number; distracting: number }[]) => {
        setData(
          history.map((p) => ({
            ...p,
            label: new Date(p.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }))
        );
      }
    );
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-text-muted">
        <BarChart3 className="size-10 mb-3 opacity-30" />
        <p className="text-sm">No usage data yet.</p>
        <p className="text-xs mt-1">Usage data will appear as you work.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="colorProductive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDistracting" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          {/* Glow filters for neon lines */}
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* No CartesianGrid — let the ether texture serve as background pattern */}
        <XAxis
          dataKey="label"
          stroke="var(--color-text-muted)"
          tick={{ fontSize: 9 }}
          interval={9}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="var(--color-text-muted)"
          tick={{ fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
        />
        <Tooltip content={<ChartTooltip />} />
        {/* Glow lines (behind main lines) */}
        <Area
          type="monotone"
          dataKey="productive"
          stroke="#22c55e"
          fill="none"
          strokeWidth={6}
          opacity={0.2}
          name="Productive"
          filter="url(#glow-green)"
        />
        <Area
          type="monotone"
          dataKey="distracting"
          stroke="#f97316"
          fill="none"
          strokeWidth={6}
          opacity={0.2}
          name="Distracting"
          filter="url(#glow-orange)"
        />
        {/* Main lines */}
        <Area
          type="monotone"
          dataKey="productive"
          stroke="#22c55e"
          fill="url(#colorProductive)"
          strokeWidth={2}
          name="Productive"
        />
        <Area
          type="monotone"
          dataKey="distracting"
          stroke="#f97316"
          fill="url(#colorDistracting)"
          strokeWidth={2}
          name="Distracting"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
