"""Grocery list generation and management service."""

import hashlib
import json
import logging
from typing import Optional, List, Dict, Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import MealPlan, Recipe
from app.prompts.grocery_consolidate import build_grocery_consolidate_prompt
from app.services.llm import get_llm, LLMResponseError

logger = logging.getLogger(__name__)

def _generate_item_id(ingredient_name: str, category: str) -> str:
    """Generate a stable item ID from ingredient name and category."""
    raw = f"{ingredient_name.lower().strip()}{category.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _get_plan_ingredients(db: Session, meal_plan: MealPlan) -> List[Dict[str, Any]]:
    """
    Extract and aggregate ingredients from all recipes in a meal plan.
    
    Returns list of dicts with: name, total_quantity, unit, category (if available)
    """
    # Parse plan_data to get recipe IDs with their occurrence count
    plan_data = meal_plan.plan_data
    if isinstance(plan_data, str):
        plan_data = json.loads(plan_data)
    
    # Collect recipe IDs with multiplicity (how many times each recipe is used)
    recipe_occurrences = {}  # recipe_id -> count
    for day, meals in plan_data.items():
        for slot, meal in meals.items():
            if "recipe_id" in meal and meal["recipe_id"]:
                rid = meal["recipe_id"]
                recipe_occurrences[rid] = recipe_occurrences.get(rid, 0) + 1
    
    if not recipe_occurrences:
        return []
    
    # Fetch all unique recipes
    recipe_ids = list(recipe_occurrences.keys())
    recipes = db.query(Recipe).filter(Recipe.id.in_(recipe_ids)).all()
    
    # Get household calorie target to determine quantity to use
    household = meal_plan.household
    calorie_target = household.members[0].calorie_target if household.members else 1500
    use_quantity_key = "quantity_1800" if calorie_target >= 1800 else "quantity_1500"
    
    # Aggregate ingredients considering recipe multiplicity
    ingredient_map = {}  # key: (name, unit)
    for recipe in recipes:
        occurrences = recipe_occurrences.get(recipe.id, 1)
        ingredients = recipe.ingredients
        if isinstance(ingredients, str):
            ingredients = json.loads(ingredients)
        
        for ing in ingredients:
            name = ing["name"]
            unit = ing.get("unit", "g")
            # Get quantity based on calorie target
            qty = ing.get(use_quantity_key, ing.get("quantity_1500", 0))
            if qty is None:
                qty = 0
            # Multiply by number of occurrences
            total_qty = float(qty) * occurrences
            
            key = (name, unit)
            if key not in ingredient_map:
                ingredient_map[key] = {
                    "name": name,
                    "unit": unit,
                    "total_quantity": 0.0,
                    "category": None  # Will be assigned by LLM
                }
            ingredient_map[key]["total_quantity"] += total_qty
    
    return list(ingredient_map.values())


async def generate_grocery_list(db: Session, plan_id: str, force_regenerate: bool = False) -> Dict[str, Any]:
    """
    Generate or retrieve a grocery list for a meal plan.
    
    Args:
        db: Database session
        plan_id: ID of the meal plan
        force_regenerate: If True, regenerate even if grocery_list exists
    
    Returns:
        Grocery list dict with items array
    """
    # Fetch meal plan
    meal_plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found"
        )
    
    # Return existing list if available and not forcing regeneration
    if not force_regenerate and meal_plan.grocery_list:
        grocery_list = meal_plan.grocery_list
        if isinstance(grocery_list, str):
            grocery_list = json.loads(grocery_list)
        return grocery_list
    
    # Generate new grocery list
    logger.info(f"Generating grocery list for plan {plan_id}")
    
    # Get aggregated ingredients
    ingredients = _get_plan_ingredients(db, meal_plan)
    if not ingredients:
        empty_list = {"items": []}
        meal_plan.grocery_list = json.dumps(empty_list)
        db.commit()
        return empty_list
    
    # Call LLM to consolidate ingredients
    llm = get_llm()
    messages = build_grocery_consolidate_prompt(ingredients)
    
    try:
        llm_response = await llm.chat(messages, json_mode=True)
    except LLMResponseError as e:
        logger.error(f"LLM call failed for grocery consolidation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate grocery list"
        ) from e
    
    # Parse LLM response
    if not isinstance(llm_response, dict) or "categories" not in llm_response:
        logger.error(f"Invalid LLM response for grocery consolidation: {llm_response}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid response from grocery consolidation service"
        )
    
    # Flatten items from all categories
    all_items = []
    for category in llm_response.get("categories", []):
        for item in category.get("items", []):
            item["category"] = category["name"]  # Add category name to each item
            all_items.append(item)
    
    # Add item IDs and checked status
    for item in all_items:
        item_id = _generate_item_id(item["ingredient_name"], item["category"])
        item["id"] = item_id
        item["checked"] = False
    
    grocery_list = {"items": all_items}
    
    # Persist to meal plan
    meal_plan.grocery_list = json.dumps(grocery_list)
    db.commit()
    
    return grocery_list


async def toggle_grocery_item(db: Session, plan_id: str, item_id: str) -> Dict[str, Any]:
    """
    Toggle the checked status of a grocery item.
    
    Args:
        db: Database session
        plan_id: ID of the meal plan
        item_id: ID of the item to toggle
    
    Returns:
        Updated grocery list dict
    """
    # Fetch meal plan
    meal_plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found"
        )
    
    # Check if grocery list exists
    if not meal_plan.grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery list not found for this plan"
        )
    
    # Parse grocery list
    grocery_list = meal_plan.grocery_list
    if isinstance(grocery_list, str):
        grocery_list = json.loads(grocery_list)
    
    # Find and toggle the item
    found = False
    for item in grocery_list.get("items", []):
        if item.get("id") == item_id:
            item["checked"] = not item.get("checked", False)
            found = True
            break
    
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grocery item not found"
        )
    
    # Persist updated list
    meal_plan.grocery_list = json.dumps(grocery_list)
    db.commit()
    
    return grocery_list
