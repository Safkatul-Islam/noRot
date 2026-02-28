import { useState } from 'react'
import { useInterventionHistory } from '../hooks/use-api'
import type { Severity } from '@norot/shared'

type DateFilter = 'today' | 'week' | 'all'

const SEVERITY_COLORS: Record<Severity, string> = {
  chill: '#4ade80',
  warning: '#facc15',
  danger: '#f87171',
  critical: '#ef4444',
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

function isThisWeek(timestamp: number): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= weekAgo
}

export default function History() {
  const { data: interventions, isLoading } = useInterventionHistory()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  const filtered = (interventions ?? []).filter((i) => {
    if (dateFilter === 'today') return isToday(i.timestamp)
    if (dateFilter === 'week') return isThisWeek(i.timestamp)
    return true
  })

  const todayInterventions = (interventions ?? []).filter((i) => isToday(i.timestamp))
  const todayAvgScore =
    todayInterventions.length > 0
      ? Math.round(
          todayInterventions.reduce((acc, i) => acc + i.score, 0) / todayInterventions.length
        )
      : 0
  const todaySnoozed = todayInterventions.filter((i) => i.snoozed).length
  const todayCommitted = todayInterventions.filter((i) => i.committedToWork).length

  const filters: { id: DateFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'all', label: 'All Time' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-white/90">Intervention History</h2>

      {/* Date filter */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setDateFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              dateFilter === f.id
                ? 'bg-white/10 border border-white/20 text-white'
                : 'bg-white/5 border border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Daily summary */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Today's Summary
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-white/90">{todayInterventions.length}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Interventions
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white/90">{todayAvgScore}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg Score</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-[#4ade80]">{todayCommitted}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Committed</p>
          </div>
        </div>
        {todaySnoozed > 0 && (
          <p className="text-[10px] text-yellow-400/60 text-center mt-2">
            Snoozed {todaySnoozed} time{todaySnoozed > 1 ? 's' : ''} today
          </p>
        )}
      </div>

      {/* Intervention list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((intervention, i) => {
              const sev = intervention.severity as Severity
              const color = SEVERITY_COLORS[sev] ?? '#facc15'
              const outcome = intervention.committedToWork
                ? 'Committed'
                : intervention.snoozed
                ? 'Snoozed'
                : intervention.dismissed
                ? 'Dismissed'
                : 'Pending'

              return (
                <div
                  key={intervention.id ?? i}
                  className="bg-white/5 rounded-xl p-4 border border-white/5 transition-all duration-200 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color }}
                      >
                        {sev}
                      </span>
                      <span className="text-xs text-white/40 font-medium">
                        Score {intervention.score}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/30">
                      {formatTimestamp(intervention.timestamp)}
                    </span>
                  </div>

                  <p className="text-sm text-white/60 mb-2 line-clamp-2">
                    {intervention.script}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">
                      {intervention.persona?.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        outcome === 'Committed'
                          ? 'bg-green-500/10 text-green-400'
                          : outcome === 'Snoozed'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : outcome === 'Dismissed'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {outcome}
                    </span>
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-white/20">
          <span className="text-3xl mb-2">{'\uD83D\uDCC5'}</span>
          <p className="text-sm">No interventions yet</p>
          <p className="text-xs mt-1">They'll appear here when triggered</p>
        </div>
      )}
    </div>
  )
}
