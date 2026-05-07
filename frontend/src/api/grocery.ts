import { apiGet, apiPatch } from './client';

export interface GroceryItem {
  id: string;
  name: string;
  subtitle: string;
  quantity: string;
  checked: boolean;
  is_pantry_chip: boolean;
  category: string;
  prep_day?: 'sun-prep' | 'wed-prep' | 'day-of';
}

export interface GroceryCategory {
  title: string;
  count: number;
  color: string;
  items: GroceryItem[];
}

export interface GroceryListResponse {
  plan_id: string;
  week_of: string;
  total_items: number;
  categories: GroceryCategory[];
  pantry_items: GroceryItem[];
}

/**
 * Fetch grocery list for a given meal plan
 * GET /api/grocery/:planId
 */
export async function getGroceryList(planId: string): Promise<GroceryListResponse> {
  return apiGet(`/api/grocery/${planId}`);
}

/**
 * Update a single grocery item (toggle checked, pantry status, etc.)
 * PATCH /api/grocery/{planId}/item/{itemId}
 */
export async function updateGroceryItem(
  planId: string,
  itemId: string,
  updates: Partial<GroceryItem>
): Promise<GroceryItem> {
  return apiPatch(`/api/grocery/${planId}/item/${itemId}`, updates);
}

/**
 * Toggle checked status of a grocery item
 */
export async function toggleItemChecked(
  planId: string,
  itemId: string,
  checked: boolean
): Promise<GroceryItem> {
  return updateGroceryItem(planId, itemId, { checked });
}

/**
 * Toggle pantry status of a grocery item (move between pantry and main list)
 */
export async function togglePantryStatus(
  planId: string,
  itemId: string,
  is_pantry_chip: boolean
): Promise<GroceryItem> {
  return updateGroceryItem(planId, itemId, { is_pantry_chip });
}

/**
 * Toggle checked status of a grocery item (optimistic update compatible)
 */
export async function toggleGroceryItemChecked(
  planId: string,
  itemId: string,
  checked: boolean
): Promise<GroceryItem> {
  return updateGroceryItem(planId, itemId, { checked });
}
