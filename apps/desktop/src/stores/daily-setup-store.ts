import { create } from 'zustand';
import type { TodoItem } from '@norot/shared';

type DailySetupStep = 'greeting' | 'chat' | 'preview';
type InputMode = 'voice' | 'manual';

interface FloatingBubble {
  id: string;
  text: string;
  spawnedAt: number;
  delayMs?: number;
}

interface DailySetupState {
  step: DailySetupStep;
  inputMode: InputMode;
  previewTodos: TodoItem[];

  isReviewing: boolean;
  isExtracting: boolean;
  missingGeminiKey: boolean;
  floatingBubbles: FloatingBubble[];

  setStep: (step: DailySetupStep) => void;
  setInputMode: (mode: InputMode) => void;
  setPreviewTodos: (todos: TodoItem[]) => void;
  addPreviewTodo: (todo: TodoItem) => void;
  removePreviewTodo: (id: string) => void;
  updatePreviewTodo: (id: string, updates: Partial<TodoItem>) => void;

  setIsReviewing: (v: boolean) => void;
  setIsExtracting: (v: boolean) => void;
  setMissingGeminiKey: (v: boolean) => void;
  setFloatingBubbles: (bubbles: FloatingBubble[]) => void;
  addFloatingBubbles: (bubbles: FloatingBubble[]) => void;
  removeFloatingBubble: (id: string) => void;
  clearFloatingBubbles: () => void;

  reset: () => void;
}

const initialState = {
  step: 'greeting' as DailySetupStep,
  inputMode: 'voice' as InputMode,
  previewTodos: [] as TodoItem[],
  isReviewing: false,
  isExtracting: false,
  missingGeminiKey: false,
  floatingBubbles: [] as FloatingBubble[],
};

export const useDailySetupStore = create<DailySetupState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setInputMode: (inputMode) => set({ inputMode }),
  setPreviewTodos: (previewTodos) => set({ previewTodos }),
  addPreviewTodo: (todo) =>
    set((state) => ({ previewTodos: [...state.previewTodos, todo] })),
  removePreviewTodo: (id) =>
    set((state) => ({ previewTodos: state.previewTodos.filter((t) => t.id !== id) })),
  updatePreviewTodo: (id, updates) =>
    set((state) => ({
      previewTodos: state.previewTodos.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    })),

  setIsReviewing: (isReviewing) => set({ isReviewing }),
  setIsExtracting: (isExtracting) => set({ isExtracting }),
  setMissingGeminiKey: (missingGeminiKey) => set({ missingGeminiKey }),
  setFloatingBubbles: (floatingBubbles) => set({ floatingBubbles }),
  addFloatingBubbles: (bubbles) =>
    set((state) => ({ floatingBubbles: [...state.floatingBubbles, ...bubbles] })),
  removeFloatingBubble: (id) =>
    set((state) => ({ floatingBubbles: state.floatingBubbles.filter((b) => b.id !== id) })),
  clearFloatingBubbles: () => set({ floatingBubbles: [] }),
  reset: () => set(initialState),
}));
