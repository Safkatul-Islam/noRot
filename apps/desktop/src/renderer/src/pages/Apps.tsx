import { useState } from 'react'
import { useAppStats } from '../hooks/use-api'
import AppCard from '../components/AppCard'
import type { AppCategory } from '@norot/shared'

type FilterTab = 'all' | 'productive' | 'distraction' | 'neutral'

const PRODUCTIVE_CATEGORIES: AppCategory[] = [
  'productive',
  'development',
  'design',
  'writing',
  'research',
]

const DISTRACTION_CATEGORIES: AppCategory[] = [
  'distraction',
  'social_media',
  'gaming',
  'entertainment',
]

const NEUTRAL_CATEGORIES: AppCategory[] = ['neutral', 'communication', 'unknown']

export default function Apps() {
  const { data: appStats, isLoading } = useAppStats()
  const [filter, setFilter] = useState<FilterTab>('all')

  const filteredStats = (appStats ?? []).filter((stat) => {
    if (filter === 'all') return true
    if (filter === 'productive') return PRODUCTIVE_CATEGORIES.includes(stat.category)
    if (filter === 'distraction') return DISTRACTION_CATEGORIES.includes(stat.category)
    if (filter === 'neutral') return NEUTRAL_CATEGORIES.includes(stat.category)
    return true
  })

  const filters: { id: FilterTab; label: string; color: string }[] = [
    { id: 'all', label: 'All', color: 'white' },
    { id: 'productive', label: 'Productive', color: '#4ade80' },
    { id: 'distraction', label: 'Distraction', color: '#f87171' },
    { id: 'neutral', label: 'Neutral', color: '#9ca3af' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-white/90">App Usage</h2>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              filter === f.id
                ? 'bg-white/10 border border-white/20'
                : 'bg-white/5 border border-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07]'
            }`}
            style={filter === f.id ? { color: f.color } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {appStats && appStats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-lg font-bold text-white/90">{appStats.length}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Apps Used</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-lg font-bold text-white/90">
              {Math.round(
                appStats.reduce((acc, s) => acc + s.totalSeconds, 0) / 60
              )}m
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Time</p>
          </div>
        </div>
      )}

      {/* App list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : filteredStats.length > 0 ? (
        <div className="space-y-2">
          {filteredStats
            .sort((a, b) => b.totalSeconds - a.totalSeconds)
            .map((stat) => (
              <AppCard
                key={stat.app}
                app={stat.app}
                category={stat.category}
                totalSeconds={stat.totalSeconds}
                percentage={stat.percentage}
              />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-white/20">
          <span className="text-3xl mb-2">{'\uD83D\uDCCA'}</span>
          <p className="text-sm">No app data yet</p>
          <p className="text-xs mt-1">Start monitoring to track usage</p>
        </div>
      )}
    </div>
  )
}
