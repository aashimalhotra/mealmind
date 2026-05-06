import { apiGet } from './client';

export interface Ingredient {
  name: string;
  quantity_1500: number;
  quantity_1800: number;
  unit: string;
  usda_food_id?: number;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  nutrition_source: 'usda' | 'llm_estimate';
  note?: string;
}

export interface RecipeDetail {
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
  prep_session_id?: string | null;
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  return apiGet(`/api/recipes/${id}`);
}
