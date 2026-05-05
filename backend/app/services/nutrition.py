"""
Nutrition resolution service with USDA-first approach and LLM fallback.

For Sprint3, quantity_1500 and quantity_1800 in ingredients are assumed to be
already in grams. The LLM-generated plan in step 3.4 produces grams.
Future sprints may add unit conversion (cup, tsp, ml, piece -> grams).
"""

from dataclasses import dataclass
from typing import Optional

from app.services.usda import search_food, Macros as USDAMacros
from app.services.llm import get_llm
from app.prompts import nutrition_estimate
from app.schemas.recipe import Ingredient
from app.db.models import Recipe
from sqlalchemy.orm import Session


@dataclass
class ResolvedIngredient:
    """Resolved ingredient with nutrition information.
    
    Attributes:
        name: Ingredient name
        usda_food_id: USDA FDC ID if resolved via USDA, None if LLM fallback
        macros_per_100g: Nutrition macros per 100g
        nutrition_source: "usda" or "llm_estimate"
    """
    name: str
    usda_food_id: Optional[int]
    macros_per_100g: USDAMacros
    nutrition_source: str


def _make_macros_from_dict(data: dict) -> USDAMacros:
    """Create Macros from a dict with calories/protein/carbs/fat keys."""
    return USDAMacros(
        calories=float(data.get("calories_per_100g", data.get("calories", 0))),
        protein_g=float(data.get("protein_per_100g", data.get("protein_g", 0))),
        carbs_g=float(data.get("carbs_per_100g", data.get("carbs_g", 0))),
        fat_g=float(data.get("fat_per_100g", data.get("fat_g", 0))),
    )


async def resolve_ingredient(name: str) -> ResolvedIngredient:
    """
    Resolve an ingredient's nutrition info, trying USDA first, then LLM fallback.
    
    Args:
        name: Ingredient name (e.g., "chicken breast", "olive oil")
        
    Returns:
        ResolvedIngredient with macros per 100g and source attribution
    """
    # Try USDA search first (limit=1 for top match)
    usda_results = await search_food(name, limit=1)
    
    if usda_results:
        hit = usda_results[0]
        macros = _make_macros_from_dict(hit.macros_per_100g)
        return ResolvedIngredient(
            name=name,
            usda_food_id=hit.food_id,
            macros_per_100g=macros,
            nutrition_source="usda",
        )
    
    # Fall back to LLM estimation
    llm = get_llm()
    messages = [
        {"role": "system", "content": nutrition_estimate.NUTRITION_ESTIMATE_PROMPT},
        {"role": "user", "content": f"Ingredient: {name}"},
    ]
    
    try:
        llm_response = await llm.chat(messages, json_mode=True)
        # llm_response should be a parsed JSON dict
        macros = _make_macros_from_dict(llm_response)
        return ResolvedIngredient(
            name=name,
            usda_food_id=None,
            macros_per_100g=macros,
            nutrition_source="llm_estimate",
        )
    except Exception:
        # If LLM fails, return zero macros with llm_estimate source
        return ResolvedIngredient(
            name=name,
            usda_food_id=None,
            macros_per_100g=USDAMacros(calories=0, protein_g=0, carbs_g=0, fat_g=0),
            nutrition_source="llm_estimate",
        )


def aggregate_macros(ingredients: list[Ingredient], grams_field: str) -> USDAMacros:
    """
    Aggregate macros across all ingredients for a recipe.
    
    For Sprint 3, ingredients' quantity_1500/quantity_1800 are assumed to be
    in grams already (the LLM-generated plan in step 3.4 produces grams).
    
    Args:
        ingredients: List of Ingredient objects
        grams_field: Either "quantity_1500" or "quantity_1800"
        
    Returns:
        Macros object with total calories, protein, carbs, fat
    """
    total_calories = 0.0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    
    for ing in ingredients:
        # Get the quantity in grams for the specified field
        quantity_g = getattr(ing, grams_field, 0) or 0
        
        # Skip if no nutrition data available
        if ing.calories_per_100g is None:
            continue
            
        # Calculate scaling factor (per 100g -> quantity_g)
        scale = quantity_g / 100.0
        
        total_calories += (ing.calories_per_100g or 0) * scale
        total_protein += (ing.protein_per_100g or 0) * scale
        total_carbs += (ing.carbs_per_100g or 0) * scale
        total_fat += (ing.fat_per_100g or 0) * scale
    
    return USDAMacros(
        calories=total_calories,
        protein_g=total_protein,
        carbs_g=total_carbs,
        fat_g=total_fat,
    )


async def resolve_recipe_nutrition(recipe: Recipe, db: Session) -> None:
    """
    Resolve nutrition for all ingredients in a recipe, then compute totals.
    
    For each ingredient missing usda_food_id and calories_per_100g,
    calls resolve_ingredient and persists the result back to the JSON.
    
    Then computes and persists top-level nutrition fields using the 1500
    quantities as the per-serving baseline (UI will scale for 1800).
    
    Args:
        recipe: Recipe ORM object
        db: SQLAlchemy session
    """
    # Parse ingredients from JSON
    ingredients_data = recipe.ingredients
    if not ingredients_data:
        return
    
    from pydantic import TypeAdapter
    adapter = TypeAdapter(list[Ingredient])
    ingredients = adapter.validate_python(ingredients_data)
    
    updated = False
    
    # Resolve each ingredient that needs it
    for ing in ingredients:
        needs_resolution = (
            ing.usda_food_id is None 
            and ing.calories_per_100g is None
        )
        
        if not needs_resolution:
            continue
            
        resolved = await resolve_ingredient(ing.name)
        
        # Update ingredient with resolved data
        ing.usda_food_id = resolved.usda_food_id
        ing.calories_per_100g = resolved.macros_per_100g.calories
        ing.protein_per_100g = resolved.macros_per_100g.protein_g
        ing.carbs_per_100g = resolved.macros_per_100g.carbs_g
        ing.fat_per_100g = resolved.macros_per_100g.fat_g
        ing.nutrition_source = resolved.nutrition_source
        
        updated = True
    
    # Compute aggregate macros using 1500 quantities (baseline)
    if ingredients:
        totals = aggregate_macros(ingredients, "quantity_1500")
        recipe.calories_per_serving = int(totals.calories)
        recipe.protein_g = totals.protein_g
        recipe.carbs_g = totals.carbs_g
        recipe.fat_g = totals.fat_g
        updated = True
    
    # Persist changes
    if updated:
        # Update the JSON ingredients field
        recipe.ingredients = [ing.model_dump() for ing in ingredients]
        db.add(recipe)
        db.commit()
