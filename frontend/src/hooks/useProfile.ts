import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api/profile';
import type { ProfileOut } from '../api/profile';

export function useProfile() {
  return useQuery<ProfileOut, Error>({
    queryKey: ['profile'],
    queryFn: getProfile,
  });
}
