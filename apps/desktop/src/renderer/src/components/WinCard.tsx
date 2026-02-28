import type { Win } from '@norot/shared'

const TYPE_LABELS: Record<Win['type'], string> = {
  focus_streak: 'Focus Streak',
  todo_complete: 'Todo Complete',
  improvement: 'Improvement',
  custom: 'Custom',
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

interface WinCardProps {
  win: Win
}

export default function WinCard({ win }: WinCardProps) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-yellow-500/10 transition-all duration-200 hover:border-yellow-500/20 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-sm">{'\u2605'}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
            {TYPE_LABELS[win.type]}
          </span>
        </div>
        <span className="text-[10px] text-white/30">{formatTimestamp(win.timestamp)}</span>
      </div>

      <p className="text-sm text-white/80 mb-2">{win.description}</p>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/30">Score at time:</span>
        <span className="text-xs font-semibold text-yellow-400/80">{win.score}</span>
      </div>
    </div>
  )
}
