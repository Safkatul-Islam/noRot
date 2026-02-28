import type { AppCategory } from '@norot/shared'

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  productive: { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-500' },
  development: { bg: 'bg-green-500/10', text: 'text-green-400', bar: 'bg-green-500' },
  design: { bg: 'bg-purple-500/10', text: 'text-purple-400', bar: 'bg-purple-500' },
  writing: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: 'bg-blue-500' },
  research: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  communication: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  neutral: { bg: 'bg-gray-500/10', text: 'text-gray-400', bar: 'bg-gray-500' },
  distraction: { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-500' },
  social_media: { bg: 'bg-pink-500/10', text: 'text-pink-400', bar: 'bg-pink-500' },
  gaming: { bg: 'bg-orange-500/10', text: 'text-orange-400', bar: 'bg-orange-500' },
  entertainment: { bg: 'bg-red-500/10', text: 'text-red-400', bar: 'bg-red-500' },
  unknown: { bg: 'bg-gray-500/10', text: 'text-gray-400', bar: 'bg-gray-500' },
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface AppCardProps {
  app: string
  category: AppCategory
  totalSeconds: number
  percentage: number
}

export default function AppCard({ app, category, totalSeconds, percentage }: AppCardProps) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/5 transition-all duration-200 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/90 truncate flex-1">{app}</span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
        >
          {formatCategoryLabel(category)}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{formatTime(totalSeconds)}</span>
        <span className="text-xs text-white/30">{percentage.toFixed(1)}%</span>
      </div>

      {/* Usage bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
