import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getCurrentPlan, PlanOut } from '../api/plans';

export function useCurrentPlan(): UseQueryResult<PlanOut, Error> & { refetch: () => void } {
  return useQuery<PlanOut, Error>({
    queryKey: ['currentPlan'],
    queryFn: getCurrentPlan,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no plan exists)
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
