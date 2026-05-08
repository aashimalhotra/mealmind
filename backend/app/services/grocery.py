"""Grocery list generation and management service."""

import hashlib
import json
import logging
from typing import Optional, List, Dict, Any
from datetime import date

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
    recipe_prep_days = {}  # recipe_id -> list of prep days
    
    for day, meals in plan_data.items():
        for slot, meal in meals.items():
            if "recipe_id" in meal and meal["recipe_id"]:
                rid = meal["recipe_id"]
                recipe_occurrences[rid] = recipe_occurrences.get(rid, 0) + 1
                
                # Track prep days for attribution
                prep_day = meal.get("meal_type", "day-of")
                if rid not in recipe_prep_days:
                    recipe_prep_days[rid] = []
                if prep_day not in recipe_prep_days[rid]:
                    recipe_prep_days[rid].append(prep_day)
    
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
    # Also track recipe attribution for each ingredient
    ingredient_recipes = {}  # key: (name, unit) -> list of {recipe_id, recipe_name, prep_day, quantity_g}
    
    for recipe in recipes:
        occurrences = recipe_occurrences.get(recipe.id, 1)
        ingredients = recipe.ingredients
        if isinstance(ingredients, str):
            ingredients = json.loads(ingredients)
        
        for ing in ingredients:
            # Handle case where ing might be a string (bad data) or dict
            if isinstance(ing, str):
                try:
                    ing = json.loads(ing)
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"Skipping invalid ingredient format: {ing}")
                    continue

            if not isinstance(ing, dict):
                logger.warning(f"Skipping invalid ingredient type: {type(ing)}")
                continue

            name = ing.get("name", "")
            if not name:
                continue

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
                ingredient_recipes[key] = []
            
            ingredient_map[key]["total_quantity"] += total_qty
            
            # Add recipe attribution
            prep_days = recipe_prep_days.get(recipe.id, ["day-of"])
            ingredient_recipes[key].append({
                "recipe_id": recipe.id,
                "recipe_name": recipe.display_name,
                "prep_day": prep_days[0] if prep_days else "day-of",
                "quantity_g": total_qty
            })
    
    # Add recipe attribution to the ingredient data
    result = list(ingredient_map.values())
    for ing in result:
        key = (ing["name"], ing["unit"])
        ing["recipes"] = ingredient_recipes.get(key, [])
    
    return result


def _format_quantity(total_quantity: float, unit: str) -> str:
    """Format quantity for display (e.g., 600g, 2kg, 1.5L)."""
    if total_quantity >= 1000:
        if unit == "g":
            return f"{total_quantity/1000}kg"
        elif unit == "ml":
            return f"{total_quantity/1000}L"
        else:
            return f"{total_quantity}{unit}"
    else:
        return f"{int(total_quantity) if total_quantity.is_integer() else total_quantity}{unit}"


def _build_subtitle(recipes: List[Dict], category: str) -> str:
    """Build subtitle from recipe attribution."""
    if not recipes:
        return ""
    
    # Get unique recipe names
    recipe_names = list(set(r.get("recipe_name", "") for r in recipes if r.get("recipe_name")))
    
    if len(recipe_names) == 1:
        return recipe_names[0]
    elif len(recipe_names) <= 3:
        return ", ".join(recipe_names)
    else:
        return f"{recipe_names[0]} + {len(recipe_names)-1} more"


def _transform_to_frontend_format(
    items: List[Dict[str, Any]], 
    plan_id: str, 
    week_start: date
) -> Dict[str, Any]:
    """
    Transform grocery items into the format expected by the frontend.
    
    Groups items by category, separates pantry items, and formats fields.
    
    Returns:
        Dict with plan_id, week_of, total_items, categories, pantry_items
    """
    # Separate pantry items from regular items
    pantry_items = []
    regular_items = []
    
    for item in items:
        transformed = {
            "id": item.get("id", _generate_item_id(item["ingredient_name"], item["category"])),
            "name": item["ingredient_name"],
            "subtitle": _build_subtitle(item.get("recipes", []), item.get("category", "")),
            "quantity": _format_quantity(item.get("total_quantity_g", item.get("total_quantity", 0)), item.get("unit", "g")),
            "checked": item.get("checked", False),
            "is_pantry_chip": item.get("is_pantry_chip", False),
            "category": item["category"],
            "prep_day": item.get("recipes", [{}])[0].get("prep_day") if item.get("recipes") else None
        }
        
        if transformed["is_pantry_chip"]:
            pantry_items.append(transformed)
        else:
            regular_items.append(transformed)
    
    # Group regular items by category
    categories_dict = {}
    for item in regular_items:
        cat_name = item["category"]
        if cat_name not in categories_dict:
            categories_dict[cat_name] = {
                "title": cat_name,
                "count": 0,
                "color": "",  # Frontend sets this based on category name
                "items": []
            }
        categories_dict[cat_name]["items"].append(item)
        categories_dict[cat_name]["count"] += 1
    
    # Convert to list and sort by category name
    categories = sorted(categories_dict.values(), key=lambda x: x["title"])
    
    # Calculate total items (non-pantry)
    total_items = sum(cat["count"] for cat in categories)
    
    # Format week_of as ISO date string
    week_of = week_start.isoformat() if week_start else date.today().isoformat()
    
    return {
        "plan_id": plan_id,
        "week_of": week_of,
        "total_items": total_items,
        "categories": categories,
        "pantry_items": pantry_items
    }


async def generate_grocery_list(db: Session, plan_id: str, force_regenerate: bool = False) -> Dict[str, Any]:
    """
    Generate or retrieve a grocery list for a meal plan.
    
    Args:
        db: Database session
        plan_id: ID of the meal plan
        force_regenerate: If True, regenerate even if grocery_list exists
    
    Returns:
        Grocery list dict with plan_id, week_of, total_items, categories, pantry_items
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
        
        # Check if the stored format is already in the new format
        if "categories" in grocery_list:
            return grocery_list
        
        # Migrate old format to new format and save it
        items = grocery_list.get("items", [])
        migrated_list = _transform_to_frontend_format(items, plan_id, meal_plan.week_start)
        meal_plan.grocery_list = json.dumps(migrated_list)
        db.commit()
        return migrated_list
    
    # Generate new grocery list
    logger.info(f"Generating grocery list for plan {plan_id}")
    
    # Get aggregated ingredients
    ingredients = _get_plan_ingredients(db, meal_plan)
    if not ingredients:
        empty_list = _transform_to_frontend_format([], plan_id, meal_plan.week_start)
        meal_plan.grocery_list = json.dumps(empty_list)
        db.commit()
        return empty_list
    
    # Call LLM to consolidate and categorize ingredients
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
    if not isinstance(llm_response, dict) or "items" not in llm_response:
        logger.error(f"Invalid LLM response for grocery consolidation: {llm_response}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid response from grocery consolidation service"
        )
    
    # Extract items from LLM response
    # The LLM should return items with: ingredient_name, category, total_quantity, unit, recipes, is_pantry_chip
    all_items = llm_response.get("items", [])
    
    # Add item IDs and checked status
    for item in all_items:
        item_id = _generate_item_id(item["ingredient_name"], item["category"])
        item["id"] = item_id
        item["checked"] = False
        # Ensure is_pantry_chip is set (LLM might not always include it)
        if "is_pantry_chip" not in item:
            # Default: items in certain categories are pantry items
            pantry_categories = ["spices", "condiments", "pantry", "spices & condiments"]
            item["is_pantry_chip"] = item.get("category", "").lower() in pantry_categories
    
    # Transform to frontend format
    grocery_list = _transform_to_frontend_format(all_items, plan_id, meal_plan.week_start)
    
    # Persist to meal plan
    meal_plan.grocery_list = json.dumps(grocery_list)
    db.commit()
    
    return grocery_list


async def toggle_grocery_item(db: Session, plan_id: str, item_id: str, checked: Optional[bool] = None) -> Dict[str, Any]:
    """
    Toggle or update the checked status of a grocery item.
    
    Args:
        db: Database session
        plan_id: ID of the meal plan
        item_id: ID of the item to toggle/update
        checked: New checked status (if None, toggle the current status)
    
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
    
    # Find and toggle the item (search in categories and pantry_items)
    found = False
    
    # Search in categories
    for category in grocery_list.get("categories", []):
        for item in category.get("items", []):
            if item.get("id") == item_id:
                item["checked"] = not item.get("checked", False)
                found = True
                break
        if found:
            break
    
    # If not found in categories, search in pantry_items
    if not found:
        for item in grocery_list.get("pantry_items", []):
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
