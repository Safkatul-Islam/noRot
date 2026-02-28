import { useMemo } from 'react'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useHistory } from '../hooks/useHistory'

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function HistoryPage() {
  const { rows, loading, error } = useHistory(200)

  const stats = useMemo(() => {
    if (rows.length === 0) return null
    const scores = rows.map(r => r.score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const worst = Math.max(...scores)
    const best = Math.min(...scores)
    return { avg, worst, best }
  }, [rows])

  const chartData = useMemo(() => {
    return [...rows].reverse().map(r => ({
      t: formatTime(r.timestamp),
      score: Math.round(r.score * 10) / 10
    }))
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">History</div>
        {loading ? <div className="mt-2 text-sm text-white/60">Loading…</div> : null}
        {error ? <div className="mt-2 text-sm text-red-200">{error}</div> : null}
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded bg-white/5 p-3">
            <div className="text-white/60">Avg</div>
            <div className="mt-1 text-lg font-semibold">{stats ? String(Math.round(stats.avg)) : '–'}</div>
          </div>
          <div className="rounded bg-white/5 p-3">
            <div className="text-white/60">Worst</div>
            <div className="mt-1 text-lg font-semibold">{stats ? String(Math.round(stats.worst)) : '–'}</div>
          </div>
          <div className="rounded bg-white/5 p-3">
            <div className="text-white/60">Best</div>
            <div className="mt-1 text-lg font-semibold">{stats ? String(Math.round(stats.best)) : '–'}</div>
          </div>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Score (recent)</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="rgba(255,255,255,0.8)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Recent entries</div>
        <div className="mt-3 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Score</th>
                <th className="py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map(r => (
                <tr key={r.timestamp} className="border-t border-white/10">
                  <td className="py-2">{formatTime(r.timestamp)}</td>
                  <td className="py-2">{Math.round(r.score)}</td>
                  <td className="py-2">{r.severity}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="py-3 text-white/60" colSpan={3}>No data yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

