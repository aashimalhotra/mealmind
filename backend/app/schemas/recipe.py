from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class Ingredient(BaseModel):
    """Ingredient schema matching the recipes table structure."""
    name: str
    quantity_1500: float
    quantity_1800: float
    unit: str
    usda_food_id: Optional[int] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    nutrition_source: Literal["usda", "llm_estimate"]
    note: Optional[str] = None


class RecipeIn(BaseModel):
    """Input schema for creating a new recipe."""
    display_name: str
    authentic_name: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    ingredients: List[Ingredient]
    prep_steps: List[str]
    serving_instructions: Optional[List[str]] = None
    prep_time_min: Optional[int] = None
    cook_time_min: Optional[int] = None
    reheat_time_min: Optional[int] = None
    shelf_life_days: Optional[int] = None
    storage_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_batch_prep: bool = False
    is_favorite: bool = False
    is_disliked: bool = False


class RecipeOut(BaseModel):
    """Output schema for recipe responses, maps to ORM model."""
    id: str
    display_name: str
    authentic_name: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    ingredients: List[Ingredient]
    prep_steps: List[str]
    serving_instructions: Optional[List[str]] = None
    prep_time_min: Optional[int] = None
    cook_time_min: Optional[int] = None
    reheat_time_min: Optional[int] = None
    shelf_life_days: Optional[int] = None
    storage_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_batch_prep: bool = False
    is_favorite: bool = False
    is_disliked: bool = False
    calories_per_serving: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    veggie_servings: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class RecipeUpdate(BaseModel):
    """Partial update schema for recipes, all fields optional."""
    display_name: Optional[str] = None
    authentic_name: Optional[str] = None
    description: Optional[str] = None
    cuisine: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
    prep_steps: Optional[List[str]] = None
    serving_instructions: Optional[List[str]] = None
    prep_time_min: Optional[int] = None
    cook_time_min: Optional[int] = None
    reheat_time_min: Optional[int] = None
    shelf_life_days: Optional[int] = None
    storage_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_batch_prep: Optional[bool] = None
    is_favorite: Optional[bool] = None
    is_disliked: Optional[bool] = None
