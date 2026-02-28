import { create } from 'zustand';
export const useVoiceChatStore = create((set) => ({
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
export const selectHasProposedTodos = (s) => s.proposedTodos.length > 0;
export const selectShowProposedPanel = (s) => s.proposedTodos.length > 0 || s.isExtracting || s.missingGeminiKey;
