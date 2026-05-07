import { apiGet, apiPatch } from './client';

// --- Type Definitions ---
export interface ProfileUser {
  id: string;
  name: string;
  calorie_target: number;
  protein_pct?: number;
  carbs_pct?: number;
  fat_pct?: number;
  veggie_target?: number;
}

export interface ProfileHousehold {
  id: string;
  name: string;
  cuisine_pref?: string;
  prep_days: string[];
  dineout_days: string[];
  members: ProfileUser[];
}

export interface ProfileOut {
  household: ProfileHousehold;
}

export interface ProfileUserUpdate {
  id: string;
  calorie_target?: number;
  protein_pct?: number;
  carbs_pct?: number;
  fat_pct?: number;
  veggie_target?: number;
}

export interface ProfileUpdate {
  cuisine_pref?: string;
  prep_days?: string[];
  dineout_days?: string[];
  users?: ProfileUserUpdate[];
}

// --- API Functions ---

/**
 * Fetch current household and user profile data
 * GET /api/profile
 */
export async function getProfile(): Promise<ProfileOut> {
  return apiGet('/api/profile') as Promise<ProfileOut>;
}

/**
 * Update household and user profile data
 * PATCH /api/profile
 */
export async function updateProfile(profileUpdate: ProfileUpdate): Promise<ProfileOut> {
  return apiPatch('/api/profile', profileUpdate) as Promise<ProfileOut>;
}
