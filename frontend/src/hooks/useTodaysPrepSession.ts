import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProfile } from './useProfile';
import { getTodaysPrepSession, startPrepSession } from '../api/prep';
import type { PrepSession } from '../api/prep';

// Helper to get today's weekday (lowercase, e.g., 'monday')
function getTodayWeekday(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

interface UseTodaysPrepSessionReturn {
  prepSession: PrepSession | null;
  isPrepDay: boolean;
  isLoading: boolean;
  isStarting: boolean;
  startPrep: () => void;
  error: Error | null;
}

export function useTodaysPrepSession(planId: string | undefined): UseTodaysPrepSessionReturn {
  const queryClient = useQueryClient();
  const todayWeekday = getTodayWeekday();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<Error | null>(null);

  // Get profile to check prep_days
  const profileQuery = useProfile();

  // Check if today is a prep day
  const isPrepDay = profileQuery.data?.household?.prep_days?.includes(todayWeekday) ?? false;

  // Query for today's prep session (only if it's a prep day and we have a planId)
  const sessionQuery = useQuery<PrepSession | null, Error>({
    queryKey: ['todaysPrepSession', planId],
    queryFn: async () => {
      if (!planId || !isPrepDay) return null;
      return getTodaysPrepSession(planId);
    },
    enabled: !!planId && isPrepDay,
    // Don't refetch on window focus for this query
    refetchOnWindowFocus: false,
  });

  // Start prep session
  const startPrep = useCallback(async () => {
    if (!planId || !isPrepDay) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const session = await startPrepSession(planId, todayWeekday);
      // Update the cache with the new session
      queryClient.setQueryData(['todaysPrepSession', planId], session);
      return session;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start prep session');
      setStartError(error);
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, [planId, isPrepDay, todayWeekday, queryClient]);

  return {
    prepSession: sessionQuery.data ?? null,
    isPrepDay,
    isLoading: sessionQuery.isLoading || profileQuery.isLoading,
    isStarting,
    startPrep,
    error: sessionQuery.error || startError || profileQuery.error,
  };
}
