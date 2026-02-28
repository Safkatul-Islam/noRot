import type { Severity } from '@norot/shared'

const SEVERITY_COLORS: Record<Severity, string> = {
  chill: '#4ade80',
  warning: '#facc15',
  danger: '#f87171',
  critical: '#ef4444',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  chill: 'Chill',
  warning: 'Warning',
  danger: 'Danger',
  critical: 'Critical',
}

interface ScoreGaugeProps {
  score: number
  severity: Severity
  size?: number
}

export default function ScoreGauge({ score, severity, size = 200 }: ScoreGaugeProps) {
  const color = SEVERITY_COLORS[severity]
  const label = SEVERITY_LABELS[severity]

  const center = size / 2
  const strokeWidth = 10
  const radius = center - strokeWidth
  // 270 degrees arc
  const circumference = 2 * Math.PI * radius
  const arcLength = (270 / 360) * circumference
  const progress = Math.min(Math.max(score, 0), 100)
  const dashOffset = arcLength - (progress / 100) * arcLength

  // Rotation: start from bottom-left (135 degrees)
  const rotation = 135

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative pulse-glow"
        style={{
          width: size,
          height: size,
          '--glow-color': `${color}66`,
        } as React.CSSProperties}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform"
          style={{ filter: `drop-shadow(0 0 12px ${color}40)` }}
        >
          {/* Background arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${center} ${center})`}
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${center} ${center})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold tabular-nums transition-colors duration-500"
            style={{ color }}
          >
            {score}
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-widest mt-1 transition-colors duration-500"
            style={{ color: `${color}cc` }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
