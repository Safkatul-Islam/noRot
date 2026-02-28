import { create } from 'zustand';
import type { TodoItem } from '@norot/shared';

interface VoiceChatState {
  isOpen: boolean;
  proposedTodos: TodoItem[];
  isExtracting: boolean;
  missingGeminiKey: boolean;
  open: () => void;
  close: () => void;
  setProposedTodos: (todos: TodoItem[]) => void;
  clearProposedTodos: () => void;
  setIsExtracting: (v: boolean) => void;
  setMissingGeminiKey: (v: boolean) => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set) => ({
  isOpen: false,
  proposedTodos: [],
  isExtracting: false,
  missingGeminiKey: false,
  open: () => set({ isOpen: true, proposedTodos: [], isExtracting: false, missingGeminiKey: false }),
  close: () => set({ isOpen: false }),
  setProposedTodos: (todos) => set({ proposedTodos: todos }),
  clearProposedTodos: () => set({ proposedTodos: [], isExtracting: false, missingGeminiKey: false }),
  setIsExtracting: (v) => set({ isExtracting: v }),
  setMissingGeminiKey: (v) => set({ missingGeminiKey: v }),
}));

export const selectHasProposedTodos = (s: VoiceChatState) => s.proposedTodos.length > 0;

export const selectShowProposedPanel = (s: VoiceChatState) =>
  s.proposedTodos.length > 0 || s.isExtracting || s.missingGeminiKey;
