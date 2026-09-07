// lib/stores/achievementStore.ts
import { create } from 'zustand';
import type { Achievement } from '@/lib/achievements/types';

/** How long a toast stays on screen before auto-dismissing. */
export const TOAST_DURATION_MS = 10_000;

/**
 * An achievement queued for display.
 *
 * `evaluateAchievements` / `evaluateVisitAchievements` return plain `Achievement` definitions,
 * which carry no per-user unlock count. Callers that know the count (repeatable achievements)
 * may supply it; the toast falls back to 1.
 *
 * `toastId` is assigned by `showToast` so each queued toast has a stable identity — the
 * auto-dismiss timer removes *its own* toast rather than whichever one happens to sit at a
 * given index when it fires.
 */
export interface AchievementToast extends Achievement {
  count?: number;
  toastId: number;
}

interface AchievementStore {
  pendingToasts: AchievementToast[];
  showToast: (achievement: Achievement & { count?: number }) => void;
  dismissToast: (index: number) => void;
  clearToasts: () => void;
}

let nextToastId = 0;

export const useAchievementStore = create<AchievementStore>((set) => ({
  pendingToasts: [],

  showToast: (achievement) => {
    const toastId = nextToastId++;
    set((state) => ({
      pendingToasts: [...state.pendingToasts, { ...achievement, toastId }],
    }));

    setTimeout(() => {
      set((state) => ({
        pendingToasts: state.pendingToasts.filter((t) => t.toastId !== toastId),
      }));
    }, TOAST_DURATION_MS);
  },

  dismissToast: (index) =>
    set((state) => ({
      pendingToasts: state.pendingToasts.filter((_, i) => i !== index),
    })),

  clearToasts: () => set({ pendingToasts: [] }),
}));
