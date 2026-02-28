import { create } from 'zustand';
let clearTimer = null;
export const useSnoozeStore = create((set, get) => ({
    snoozedUntil: null,
    startSnooze: (durationMs) => {
        const ms = Math.max(0, Math.floor(durationMs));
        if (ms === 0) {
            get().cancelSnooze();
            return;
        }
        const until = Date.now() + ms;
        set({ snoozedUntil: until });
        if (clearTimer)
            clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
            clearTimer = null;
            set({ snoozedUntil: null });
        }, ms);
    },
    cancelSnooze: () => {
        if (clearTimer)
            clearTimeout(clearTimer);
        clearTimer = null;
        set({ snoozedUntil: null });
    },
}));
