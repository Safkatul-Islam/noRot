import { useEffect, useState } from 'react'
import { useScoreStore } from '../stores/score-store'
import { useTodoStore } from '../stores/todo-store'
import { useInterventionStore } from '../stores/intervention-store'
import ScoreGauge from '../components/ScoreGauge'
import type { Severity } from '@norot/shared'

const SEVERITY_COLORS: Record<Severity, string> = {
  chill: '#4ade80',
  warning: '#facc15',
  danger: '#f87171',
  critical: '#ef4444',
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

export default function Dashboard() {
  const {
    score,
    severity,
    distractionRatio,
    switchRate,
    topDistraction,
    minutesMonitored,
    isMonitoring,
    startPolling,
    stopPolling,
  } = useScoreStore()

  const { todos, fetchTodos, addTodo, toggleTodo } = useTodoStore()
  const { interventionHistory, fetchHistory } = useInterventionStore()

  const [newTodoText, setNewTodoText] = useState('')

  useEffect(() => {
    fetchTodos()
    fetchHistory()
  }, [fetchTodos, fetchHistory])

  const handleAddTodo = async () => {
    const text = newTodoText.trim()
    if (!text) return
    await addTodo(text)
    setNewTodoText('')
  }

  const incompleteTodos = todos.filter((t) => !t.completed).slice(0, 3)
  const recentInterventions = interventionHistory.slice(0, 2)

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Score Gauge */}
      <div className="flex flex-col items-center py-4">
        <ScoreGauge score={score} severity={severity} size={180} />
      </div>

      {/* Monitoring toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => (isMonitoring ? stopPolling() : startPolling())}
          className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
            isMonitoring
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
              : 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/20'
          }`}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-lg font-bold text-white/90">{minutesMonitored.toFixed(0)}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Minutes</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-lg font-bold text-white/90">
            {(distractionRatio * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Distraction</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
          <p className="text-lg font-bold text-white/90">{switchRate.toFixed(1)}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Switches/min</p>
        </div>
      </div>

      {/* Top distraction */}
      {topDistraction && (
        <div className="bg-red-500/5 rounded-xl p-3 border border-red-500/10">
          <p className="text-[10px] text-red-400/60 uppercase tracking-wider mb-1">
            Top Distraction
          </p>
          <p className="text-sm text-red-400 font-medium">{topDistraction}</p>
        </div>
      )}

      {/* Mini todo list */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Todos
        </h3>
        <div className="space-y-1.5">
          {incompleteTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className="w-4 h-4 rounded border border-white/20 flex-shrink-0 hover:border-[#4ade80] transition-colors"
              />
              <span className="text-xs text-white/80 truncate">{todo.text}</span>
            </div>
          ))}
          {incompleteTodos.length === 0 && (
            <p className="text-[10px] text-white/20 text-center py-2">All clear!</p>
          )}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="Quick add..."
            className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <button
            onClick={handleAddTodo}
            className="px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            +
          </button>
        </div>
      </div>

      {/* Recent interventions */}
      {recentInterventions.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Recent Interventions
          </h3>
          <div className="space-y-2">
            {recentInterventions.map((intervention, i) => {
              const intSeverity = intervention.severity as Severity
              const color = SEVERITY_COLORS[intSeverity] ?? '#facc15'
              return (
                <div
                  key={intervention.id ?? i}
                  className="p-3 rounded-lg bg-white/[0.03] border border-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color }}
                      >
                        {intSeverity}
                      </span>
                      <span className="text-[10px] text-white/30">
                        Score {intervention.score}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/20">
                      {formatTimestamp(intervention.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 truncate">
                    {intervention.script}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
