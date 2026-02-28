import { create } from 'zustand';

type SnoozeStore = {
  snoozedUntil: number | null;
  startSnooze: (durationMs: number) => void;
  cancelSnooze: () => void;
};

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useSnoozeStore = create<SnoozeStore>((set, get) => ({
  snoozedUntil: null,

  startSnooze: (durationMs) => {
    const ms = Math.max(0, Math.floor(durationMs));
    if (ms === 0) {
      get().cancelSnooze();
      return;
    }

    const until = Date.now() + ms;
    set({ snoozedUntil: until });

    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      clearTimer = null;
      set({ snoozedUntil: null });
    }, ms);
  },

  cancelSnooze: () => {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = null;
    set({ snoozedUntil: null });
  },
}));

