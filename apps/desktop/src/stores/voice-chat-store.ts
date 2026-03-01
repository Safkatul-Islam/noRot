import { create } from 'zustand';
import type { TodoItem } from '@norot/shared';

interface VoiceChatState {
  isOpen: boolean;
  mode: 'coach' | 'checkin';
  proposedTodos: TodoItem[];
  dbTodos: TodoItem[];
  isExtracting: boolean;
  missingGeminiKey: boolean;
  open: (mode?: 'coach' | 'checkin') => void;
  openCoach: () => void;
  openCheckin: () => void;
  close: () => void;
  setProposedTodos: (todos: TodoItem[]) => void;
  clearProposedTodos: () => void;
  setDbTodos: (todos: TodoItem[]) => void;
  setIsExtracting: (v: boolean) => void;
  setMissingGeminiKey: (v: boolean) => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set) => ({
  isOpen: false,
  mode: 'coach',
  proposedTodos: [],
  dbTodos: [],
  isExtracting: false,
  missingGeminiKey: false,
  open: (mode = 'coach') => set((state) => ({
    isOpen: true,
    mode,
    proposedTodos: mode === 'coach' && state.proposedTodos.length > 0 ? state.proposedTodos : [],
    isExtracting: false,
    missingGeminiKey: false,
  })),
  openCoach: () => set((state) => ({
    isOpen: true,
    mode: 'coach',
    proposedTodos: state.proposedTodos.length > 0 ? state.proposedTodos : [],
    isExtracting: false,
    missingGeminiKey: false,
  })),
  openCheckin: () => set({ isOpen: true, mode: 'checkin', proposedTodos: [], dbTodos: [], isExtracting: false, missingGeminiKey: false }),
  close: () => set({ isOpen: false }),
  setProposedTodos: (todos) => set({ proposedTodos: todos }),
  clearProposedTodos: () => set({ proposedTodos: [], isExtracting: false, missingGeminiKey: false }),
  setDbTodos: (todos) => set({ dbTodos: todos }),
  setIsExtracting: (v) => set({ isExtracting: v }),
  setMissingGeminiKey: (v) => set({ missingGeminiKey: v }),
}));

export const selectHasProposedTodos = (s: VoiceChatState) => s.proposedTodos.length > 0;
