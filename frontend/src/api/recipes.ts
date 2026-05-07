import { apiGet } from './client';

// --- Type Definitions ---
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

export interface RecipeOut {
  id: string;
  display_name: string;
  authentic_name?: string;
  description?: string;
  cuisine?: string;
  ingredients: Ingredient[];
  prep_steps: string[];
  serving_instructions?: string[];
  prep_time_min?: number;
  cook_time_min?: number;
  reheat_time_min?: number;
  shelf_life_days?: number;
  storage_notes?: string;
  tags?: string[];
  is_batch_prep: boolean;
  is_favorite: boolean;
  is_disliked: boolean;
  calories_per_serving?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  veggie_servings?: number;
}

export interface RecipeDetailOut extends RecipeOut {
  prep_session_id?: string;
}

// --- API Functions ---

/**
 * Fetch list of saved recipes with optional filters
 * GET /api/recipes
 */
export async function getRecipes(params?: {
  cuisine?: string;
  tags?: string;
  favorites?: boolean;
  limit?: number;
}): Promise<RecipeOut[]> {
  const query = new URLSearchParams();
  if (params?.cuisine) query.set('cuisine', params.cuisine);
  if (params?.tags) query.set('tags', params.tags);
  if (params?.favorites !== undefined) query.set('favorites', params.favorites.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  
  const queryString = query.toString();
  const path = `/api/recipes${queryString ? `?${queryString}` : ''}`;
  return apiGet(path) as Promise<RecipeOut[]>;
}

/**
 * Fetch single recipe by ID
 * GET /api/recipes/:id
 */
export async function getRecipe(recipeId: string): Promise<RecipeDetailOut> {
  return apiGet(`/api/recipes/${recipeId}`) as Promise<RecipeDetailOut>;
}
