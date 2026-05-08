import json
import logging
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


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
    nutrition_source: Literal["usda", "llm_estimate"] = "llm_estimate"
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

    @field_validator('ingredients', mode='before')
    @classmethod
    def parse_ingredients(cls, v):
        if isinstance(v, str):
            v = json.loads(v)
        if isinstance(v, dict):
            # If it's a dict, convert to list by extracting values
            v = list(v.values())
        if isinstance(v, list):
            # Filter out items that are not dicts (malformed data like strings)
            logger = logging.getLogger(__name__)
            valid_items = []
            for item in v:
                if isinstance(item, dict):
                    valid_items.append(item)
                else:
                    logger.warning(f"Skipping malformed ingredient item: {item}")
            return valid_items
        return v

    @field_validator('prep_steps', mode='before')
    @classmethod
    def parse_prep_steps(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        if isinstance(v, dict):
            # If it's a dict, convert to list by extracting values
            return list(v.values())
        return v

    @field_validator('serving_instructions', mode='before')
    @classmethod
    def parse_serving_instructions(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        if isinstance(v, dict):
            # If it's a dict like {'note': 'Serve...'}, extract values to list
            return list(v.values())
        return v

    @field_validator('tags', mode='before')
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            try:
                v = json.loads(v)
            except json.JSONDecodeError:
                return None
        if isinstance(v, dict):
            # Convert dict to list of values
            return list(v.values())
        if isinstance(v, list):
            return v
        return None

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


class RecipeDetailOut(RecipeOut):
    """Expanded output schema for recipe detail, includes prep_session_id."""
    prep_session_id: Optional[str] = None
