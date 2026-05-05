import { apiGet, apiPatch } from './client';

// --- Type Definitions ---

/** Meal slot in plan_data (breakfast, lunch, dinner) */
export interface MealSlot {
  recipe_id?: string;
  meal_type?: string;
  notes?: string;
}

/** Daily meal structure in plan_data */
export interface DayMeals {
  breakfast?: MealSlot;
  lunch?: MealSlot;
  dinner?: MealSlot;
}

/** Full plan_data JSON structure (key: lowercase day name) */
export type PlanData = Record<string, DayMeals>;

/** Backend PlanOut response matching GET /api/plans/current */
export interface PlanOut {
  id: string;
  household_id: string;
  week_start: string; // YYYY-MM-DD (Monday)
  status: 'draft' | 'approved' | 'active' | 'completed';
  plan_data: PlanData;
  grocery_list?: string; // JSON string
  ai_insights?: string; // JSON string
  created_at: string;
  updated_at: string;
}

// --- API Functions ---

/**
 * Fetch current week's active plan
 * GET /api/plans/current
 */
export async function getCurrentPlan(): Promise<PlanOut> {
  return apiGet('/api/plans/current') as Promise<PlanOut>;
}

/**
 * Trigger plan generation and return EventSource for SSE progress updates
 * SSE events include stages: "Drafting recipes…", "Building plan…", "Resolving nutrition…"
 * POST /api/plans/generate (SSE stream)
 */
export function generatePlan(): EventSource {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8400';
  // Note: EventSource only supports GET; if backend requires POST, use fetch with ReadableStream instead
  // Assuming backend exposes SSE via GET for EventSource compatibility
  return new EventSource(`${API_BASE}/api/plans/generate`);
}

/**
 * Fetch a specific plan by ID
 * GET /api/plans/{id}
 */
export async function getPlan(planId: string): Promise<PlanOut> {
  return apiGet(`/api/plans/${planId}`) as Promise<PlanOut>;
}

/**
 * Approve a plan by ID (sets status to 'approved')
 * PATCH /api/plans/{id}
 */
export async function approvePlan(planId: string): Promise<PlanOut> {
  return apiPatch(`/api/plans/${planId}`, { status: 'approved' }) as Promise<PlanOut>;
}
