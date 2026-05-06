import { create } from 'zustand';

export interface BackgroundTimer {
  id: string;
  label: string;
  recipeColor: string;
  startedAtStep: number;
  durationSec: number;
  startTimestamp: number;
}

interface BackgroundTimersState {
  timers: BackgroundTimer[];
  addTimer: (timer: BackgroundTimer) => void;
  removeTimer: (id: string) => void;
  getTimersWithRemaining: (currentTime: number) => (BackgroundTimer & { remainingSec: number })[];
}

export const useBackgroundTimers = create<BackgroundTimersState>((set, get) => ({
  timers: [],
  addTimer: (timer) => set((state) => ({ timers: [...state.timers, timer] })),
  removeTimer: (id) => set((state) => ({ timers: state.timers.filter((t) => t.id !== id) })),
  getTimersWithRemaining: (currentTime: number) => {
    const timers = get().timers;
    return timers
      .map((timer) => {
        const elapsedSec = (currentTime - timer.startTimestamp) / 1000;
        const remainingSec = Math.max(0, timer.durationSec - elapsedSec);
        return { ...timer, remainingSec };
      })
      .sort((a, b) => a.remainingSec - b.remainingSec);
  },
}));
