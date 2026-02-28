import { useState, useMemo } from 'react'
import { useTodoStore } from '../stores/todo-store'

const MOTIVATIONAL_QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Unknown' },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: 'Albert Einstein' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Don\'t count the days, make the days count.', author: 'Muhammad Ali' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 17) return 'Good afternoon!'
  return 'Good evening!'
}

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface DailySetupProps {
  onComplete: () => void
}

export default function DailySetup({ onComplete }: DailySetupProps) {
  const { addTodo } = useTodoStore()

  const [focusIntent, setFocusIntent] = useState('')
  const [todo1, setTodo1] = useState('')
  const [todo2, setTodo2] = useState('')
  const [todo3, setTodo3] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const quote = useMemo(
    () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)],
    []
  )

  const handleStart = async () => {
    setIsSubmitting(true)
    try {
      const todosToAdd = [focusIntent, todo1, todo2, todo3].filter((t) => t.trim() !== '')
      for (const text of todosToAdd) {
        await addTodo(text.trim())
      }
    } catch (err) {
      console.error('Failed to save daily setup todos:', err)
    }
    setIsSubmitting(false)
    onComplete()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-[#4ade80] mb-1">{getGreeting()}</h1>
        <p className="text-xs text-white/40">{formatDate()}</p>
      </div>

      {/* Motivational quote */}
      <div className="bg-[#4ade80]/5 rounded-xl p-4 border border-[#4ade80]/10 text-center animate-slide-up">
        <p className="text-sm text-white/70 italic leading-relaxed">"{quote.text}"</p>
        <p className="text-[10px] text-white/30 mt-2">-- {quote.author}</p>
      </div>

      {/* Focus intent */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block">
          What's your main goal today?
        </label>
        <input
          type="text"
          value={focusIntent}
          onChange={(e) => setFocusIntent(e.target.value)}
          placeholder="e.g. Finish the project proposal..."
          className="w-full text-sm bg-white/5 border border-[#4ade80]/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-[#4ade80]/40 transition-colors"
        />
      </div>

      {/* Quick todos */}
      <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block">
          Quick Todos
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={todo1}
            onChange={(e) => setTodo1(e.target.value)}
            placeholder="Todo 1..."
            className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <input
            type="text"
            value={todo2}
            onChange={(e) => setTodo2(e.target.value)}
            placeholder="Todo 2..."
            className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <input
            type="text"
            value={todo3}
            onChange={(e) => setTodo3(e.target.value)}
            placeholder="Todo 3..."
            className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Start button */}
      <div className="pt-2 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
        <button
          onClick={handleStart}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80] text-sm font-bold hover:bg-[#4ade80]/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : "Let's get started!"}
        </button>
        <button
          onClick={onComplete}
          className="w-full mt-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
