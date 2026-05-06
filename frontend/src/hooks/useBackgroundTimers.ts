import { useState, useEffect, useCallback } from 'react';
import { BackgroundTimer } from '../components/BackgroundTimerList';

interface UseBackgroundTimersReturn {
  timers: BackgroundTimer[];
  addTimer: (timer: Omit<BackgroundTimer, 'remaining_seconds'> & { duration_min: number }) => void;
  removeTimer: (id: string) => void;
}

export const useBackgroundTimers = (): UseBackgroundTimersReturn => {
  const [timers, setTimers] = useState<BackgroundTimer[]>([]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev
          .map((timer) => ({
            ...timer,
            remaining_seconds: Math.max(0, timer.remaining_seconds - 1),
          }))
          .filter((timer) => timer.remaining_seconds > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTimer = useCallback(
    (timer: Omit<BackgroundTimer, 'remaining_seconds'> & { duration_min: number }) => {
      setTimers((prev) => [
        ...prev,
        {
          ...timer,
          remaining_seconds: timer.duration_min * 60,
          total_seconds: timer.duration_min * 60,
        },
      ]);
    },
    []
  );

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  }, []);

  return { timers, addTimer, removeTimer };
};
