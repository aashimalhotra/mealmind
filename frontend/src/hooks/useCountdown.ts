import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCountdownReturn {
  remaining: number;
  isComplete: boolean;
  extend: (sec: number) => void;
}

export function useCountdown(durationSec: number, paused: boolean = false): UseCountdownReturn {
  const [remaining, setRemaining] = useState(durationSec);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef(durationSec);
  const rafRef = useRef<number | null>(null);

  const extend = useCallback((sec: number) => {
    setRemaining((prev) => {
      const newRemaining = prev + sec;
      pausedRemainingRef.current = newRemaining;
      return newRemaining;
    });
  }, []);

  useEffect(() => {
    if (paused || isComplete) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now();
    const initialRemaining = pausedRemainingRef.current;

    const tick = (now: number) => {
      if (startTimeRef.current === null) return;

      const elapsed = (now - startTimeRef.current) / 1000;
      const newRemaining = Math.max(0, initialRemaining - elapsed);

      if (newRemaining <= 0) {
        setRemaining(0);
        setIsComplete(true);
        pausedRemainingRef.current = 0;
        return;
      }

      setRemaining(Math.ceil(newRemaining));
      pausedRemainingRef.current = newRemaining;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [paused, isComplete]);

  return { remaining, isComplete, extend };
}
