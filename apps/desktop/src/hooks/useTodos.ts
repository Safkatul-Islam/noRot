import { useCallback, useEffect, useState } from 'react'

import type { TodoItem } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  const refresh = useCallback(async () => {
    const raw = await window.norot.invoke<unknown>(IPC_CHANNELS.todos.list)
    setTodos(parseTodosList(raw))
  }, [])

  useEffect(() => {
    void refresh()
    const off = window.norot.on(IPC_CHANNELS.todos.onUpdated, (payload) => {
      const next = payload && typeof payload === 'object' ? (payload as { todos?: unknown }).todos : undefined
      setTodos(parseTodosList(next))
    })
    return () => off()
  }, [refresh])

  const createTodo = useCallback(async (text: string) => {
    await window.norot.invoke(IPC_CHANNELS.todos.create, { text })
  }, [])

  const updateTodo = useCallback(async (id: number, patch: Partial<TodoItem>) => {
    await window.norot.invoke(IPC_CHANNELS.todos.update, { id, patch })
  }, [])

  const deleteTodo = useCallback(async (id: number) => {
    await window.norot.invoke(IPC_CHANNELS.todos.delete, { id })
  }, [])

  const openOverlay = useCallback(async () => {
    await window.norot.invoke(IPC_CHANNELS.todoOverlay.open)
  }, [])

  const closeOverlay = useCallback(async () => {
    await window.norot.invoke(IPC_CHANNELS.todoOverlay.close)
  }, [])

  return { todos, refresh, createTodo, updateTodo, deleteTodo, openOverlay, closeOverlay }
}

function parseTodosList(raw: unknown): TodoItem[] {
  if (!Array.isArray(raw)) return []
  const out: TodoItem[] = []
  for (const row of raw) {
    const parsed = parseTodo(row)
    if (parsed) out.push(parsed)
  }
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseTodo(raw: unknown): TodoItem | null {
  if (!isRecord(raw)) return null
  const id = raw.id
  const text = raw.text
  const done = raw.done
  const order = raw.order
  if (typeof id !== 'number' || !Number.isFinite(id)) return null
  if (typeof text !== 'string') return null
  if (typeof done !== 'boolean') return null
  if (typeof order !== 'number' || !Number.isFinite(order)) return null

  const todo: TodoItem = { id: Math.trunc(id), text, done, order: Math.trunc(order) }

  if (typeof raw.app === 'string' && raw.app.trim()) todo.app = raw.app
  if (typeof raw.url === 'string' && raw.url.trim()) todo.url = raw.url
  if (Array.isArray(raw.allowedApps)) {
    const apps = raw.allowedApps.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean)
    if (apps.length > 0) todo.allowedApps = apps
  }
  if (typeof raw.deadline === 'number' && Number.isFinite(raw.deadline)) todo.deadline = Math.trunc(raw.deadline)
  if (typeof raw.startTime === 'number' && Number.isFinite(raw.startTime)) todo.startTime = Math.trunc(raw.startTime)
  if (typeof raw.durationMinutes === 'number' && Number.isFinite(raw.durationMinutes)) todo.durationMinutes = Math.trunc(raw.durationMinutes)

  return todo
}

