import { create } from 'zustand';
const initialState = {
    step: 'greeting',
    inputMode: 'voice',
    previewTodos: [],
    isReviewing: false,
    isExtracting: false,
    missingGeminiKey: false,
    floatingBubbles: [],
};
export const useDailySetupStore = create((set) => ({
    ...initialState,
    setStep: (step) => set({ step }),
    setInputMode: (inputMode) => set({ inputMode }),
    setPreviewTodos: (previewTodos) => set({ previewTodos }),
    addPreviewTodo: (todo) => set((state) => ({ previewTodos: [...state.previewTodos, todo] })),
    removePreviewTodo: (id) => set((state) => ({ previewTodos: state.previewTodos.filter((t) => t.id !== id) })),
    updatePreviewTodo: (id, updates) => set((state) => ({
        previewTodos: state.previewTodos.map((t) => t.id === id ? { ...t, ...updates } : t),
    })),
    setIsReviewing: (isReviewing) => set({ isReviewing }),
    setIsExtracting: (isExtracting) => set({ isExtracting }),
    setMissingGeminiKey: (missingGeminiKey) => set({ missingGeminiKey }),
    setFloatingBubbles: (floatingBubbles) => set({ floatingBubbles }),
    addFloatingBubbles: (bubbles) => set((state) => ({ floatingBubbles: [...state.floatingBubbles, ...bubbles] })),
    removeFloatingBubble: (id) => set((state) => ({ floatingBubbles: state.floatingBubbles.filter((b) => b.id !== id) })),
    clearFloatingBubbles: () => set({ floatingBubbles: [] }),
    reset: () => set(initialState),
}));
