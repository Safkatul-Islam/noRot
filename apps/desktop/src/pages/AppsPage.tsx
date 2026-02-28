import { useMemo, useState } from 'react'

import { useAppStats } from '../hooks/useAppStats'

function formatMinutesFromCount(count: number): string {
  // telemetry snapshots are stored every ~5 seconds
  const seconds = count * 5
  const minutes = seconds / 60
  return minutes.toFixed(minutes >= 10 ? 0 : 1)
}

export function AppsPage() {
  const [minutes, setMinutes] = useState(60)
  const { rows, loading, error } = useAppStats(minutes)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => `${r.appName} ${r.domain ?? ''} ${r.category}`.toLowerCase().includes(q))
  }, [query, rows])

  return (
    <div className="space-y-6">
      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-white/70">Apps</div>
            <div className="mt-1 text-xs text-white/60">Counts are derived from stored telemetry snapshots.</div>
          </div>
          <div className="flex gap-2">
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              <option value={60}>Last 60 min</option>
              <option value={240}>Last 4 hours</option>
              <option value={1440}>Last 24 hours</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-56 rounded border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
            />
          </div>
        </div>

        {loading ? <div className="mt-3 text-sm text-white/60">Loading…</div> : null}
        {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}

        <div className="mt-4 overflow-auto rounded border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-3 py-2">App</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Minutes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r) => (
                <tr key={`${r.appName}|${r.domain ?? ''}|${r.category}`} className="border-t border-white/10">
                  <td className="px-3 py-2">{r.appName}</td>
                  <td className="px-3 py-2 text-white/70">{r.domain ?? '—'}</td>
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2">{formatMinutesFromCount(r.count)}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-white/60" colSpan={4}>No data yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

