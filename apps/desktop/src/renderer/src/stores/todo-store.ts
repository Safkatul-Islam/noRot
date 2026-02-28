import { create } from 'zustand'
import type { Todo } from '@norot/shared'

interface TodoState {
  todos: Todo[]
}

interface TodoActions {
  fetchTodos: () => Promise<void>
  addTodo: (text: string) => Promise<void>
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
}

export const useTodoStore = create<TodoState & TodoActions>((set) => ({
  todos: [],

  fetchTodos: async () => {
    try {
      const todos = (await window.electronAPI.getTodos()) as Todo[]
      set({ todos })
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    }
  },

  addTodo: async (text: string) => {
    try {
      await window.electronAPI.addTodo(text)
      const todos = (await window.electronAPI.getTodos()) as Todo[]
      set({ todos })
    } catch (err) {
      console.error('Failed to add todo:', err)
    }
  },

  toggleTodo: async (id: number) => {
    try {
      await window.electronAPI.toggleTodo(id)
      const todos = (await window.electronAPI.getTodos()) as Todo[]
      set({ todos })
    } catch (err) {
      console.error('Failed to toggle todo:', err)
    }
  },

  deleteTodo: async (id: number) => {
    try {
      await window.electronAPI.deleteTodo(id)
      const todos = (await window.electronAPI.getTodos()) as Todo[]
      set({ todos })
    } catch (err) {
      console.error('Failed to delete todo:', err)
    }
  },
}))
