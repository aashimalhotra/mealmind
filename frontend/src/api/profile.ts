import { apiGet, apiPatch } from './client';

// --- Type Definitions ---

export interface ProfileOut {
  household_id: string;
  name: string;
  cuisine_pref: string[];
  prep_days: string[];
  dineout_days: string[];
  users: UserOut[];
}

export interface UserOut {
  id: string;
  name: string;
  calorie_target: number;
}

export interface ProfileUpdate {
  name?: string;
  cuisine_pref?: string[];
  prep_days?: string[];
  dineout_days?: string[];
}

// --- API Functions ---

/**
 * Get the current household profile
 * GET /api/profile
 */
export async function getProfile(): Promise<ProfileOut> {
  return apiGet('/api/profile') as Promise<ProfileOut>;
}

/**
 * Update the household profile
 * PATCH /api/profile
 */
export async function updateProfile(data: ProfileUpdate): Promise<ProfileOut> {
  return apiPatch('/api/profile', data) as Promise<ProfileOut>;
}
