import { useState, useEffect, useRef, useCallback } from 'react'
import { useTodoStore } from '../stores/todo-store'

export default function TodoOverlay() {
  const { todos, fetchTodos, addTodo, toggleTodo, deleteTodo } = useTodoStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const [position, setPosition] = useState({ x: 20, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleAddTodo = async () => {
    const text = newTodoText.trim()
    if (!text) return
    await addTodo(text)
    setNewTodoText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo()
    }
  }

  const incompleteTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)

  return (
    <div
      ref={containerRef}
      className={`fixed z-40 w-64 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/5"
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-semibold text-white/70">Todos</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/30">
            {incompleteTodos.length} left
          </span>
          <button
            data-no-drag
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-5 h-5 flex items-center justify-center rounded text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
          >
            {isCollapsed ? '+' : '\u2013'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-2 max-h-60 overflow-y-auto">
          {/* Incomplete todos */}
          {incompleteTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 group transition-all"
            >
              <button
                data-no-drag
                onClick={() => toggleTodo(todo.id)}
                className="w-4 h-4 rounded border border-white/20 flex-shrink-0 hover:border-[#4ade80] transition-colors"
              />
              <span className="text-xs text-white/80 flex-1 truncate">{todo.text}</span>
              <button
                data-no-drag
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs transition-all"
              >
                x
              </button>
            </div>
          ))}

          {/* Completed todos */}
          {completedTodos.slice(0, 3).map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 group transition-all"
            >
              <button
                data-no-drag
                onClick={() => toggleTodo(todo.id)}
                className="w-4 h-4 rounded bg-[#4ade80]/20 border border-[#4ade80]/40 flex-shrink-0 flex items-center justify-center"
              >
                <span className="text-[8px] text-[#4ade80]">{'\u2713'}</span>
              </button>
              <span className="text-xs text-white/30 flex-1 truncate line-through">
                {todo.text}
              </span>
              <button
                data-no-drag
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 text-xs transition-all"
              >
                x
              </button>
            </div>
          ))}

          {todos.length === 0 && (
            <p className="text-[10px] text-white/20 text-center py-3">No todos yet</p>
          )}

          {/* Add input */}
          <div className="mt-2 flex gap-1" data-no-drag>
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add todo..."
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
            <button
              onClick={handleAddTodo}
              className="px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
