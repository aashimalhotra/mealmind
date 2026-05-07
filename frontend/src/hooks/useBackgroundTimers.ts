import { useState, useCallback } from 'react';
import type { BackgroundTimer } from '../components/BackgroundTimerList';

interface UseBackgroundTimersReturn {
  timers: BackgroundTimer[];
  addTimer: (timer: Omit<BackgroundTimer, 'remaining_seconds'> & { durationSec: number; startTimestamp: number }) => void;
  removeTimer: (id: string) => void;
  getTimersWithRemaining: (currentTime: number) => (BackgroundTimer & { remainingSec: number })[];
}

export const useBackgroundTimers = (): UseBackgroundTimersReturn => {
  const [timers, setTimers] = useState<BackgroundTimer[]>([]);

  const addTimer = useCallback(
    (timer: Omit<BackgroundTimer, 'remaining_seconds'> & { durationSec: number; startTimestamp: number }) => {
      setTimers((prev) => [
        ...prev,
        {
          ...timer,
          remaining_seconds: timer.durationSec,
          total_seconds: timer.durationSec,
        } as BackgroundTimer,
      ]);
    },
    []
  );

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  }, []);

  const getTimersWithRemaining = useCallback(
    (currentTime: number) => {
      const timersWithRemaining = timers
        .map((timer) => {
          const timerWithMeta = timer as BackgroundTimer & { startTimestamp?: number; durationSec?: number };
          const startTimestamp = timerWithMeta.startTimestamp;
          const durationSec = timerWithMeta.durationSec || timer.total_seconds;

          if (startTimestamp !== undefined) {
            const elapsedSec = Math.floor((currentTime - startTimestamp) / 1000);
            const remainingSec = Math.max(0, durationSec - elapsedSec);
            return { ...timer, remainingSec };
          } else {
            // Fallback to stored remaining_seconds
            return { ...timer, remainingSec: timer.remaining_seconds };
          }
        })
        .sort((a, b) => a.remainingSec - b.remainingSec);

      return timersWithRemaining;
    },
    [timers]
  );

  return { timers, addTimer, removeTimer, getTimersWithRemaining };
};
