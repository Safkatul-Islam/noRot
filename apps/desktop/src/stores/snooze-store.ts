import { create } from 'zustand';
import { getNorotAPI, isElectron } from '@/lib/norot-api';

type SnoozeStore = {
  snoozedUntil: number | null;
  setSnoozedUntil: (until: number | null) => void;
  startSnooze: (durationMs: number) => void;
  cancelSnooze: () => void;
};

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useSnoozeStore = create<SnoozeStore>((set, get) => ({
  snoozedUntil: null,
  setSnoozedUntil: (snoozedUntil) => set({ snoozedUntil }),

  startSnooze: (durationMs) => {
    const ms = Math.max(0, Math.floor(durationMs));
    if (ms === 0) {
      get().cancelSnooze();
      return;
    }

	    const until = Date.now() + ms;
	    set({ snoozedUntil: until });

	    if (isElectron()) {
	      const api = getNorotAPI() as any;
	      if (typeof api.setSnooze === 'function') {
	        api.setSnooze(ms).catch(() => {});
	        return;
	      }
	    }

    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      clearTimer = null;
      set({ snoozedUntil: null });
    }, ms);
  },

	  cancelSnooze: () => {
	    set({ snoozedUntil: null });

	    if (isElectron()) {
	      const api = getNorotAPI() as any;
	      if (typeof api.cancelSnooze === 'function') {
	        api.cancelSnooze().catch(() => {});
	        return;
	      }
	    }

    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = null;
  },
}));
