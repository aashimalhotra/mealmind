"""
USDA FoodData Central API service.

Provides search and nutrition lookup using the USDA FoodData Central API.
No API key is required for Foundation and SR Legacy data types under low rate limits.

Nutrient IDs (from USDA API):
- 1003: Protein (g)
- 1004: Total lipid (fat) (g)
- 1005: Carbohydrate, by difference (g)
- 1008: Energy (kcal)
"""

import httpx
from dataclasses import dataclass
from typing import Optional
from cachetools import TTLCache

from app.config import settings


# In-memory cache for get_macros results (max 512 entries, 1 hour TTL)
_macros_cache: TTLCache = TTLCache(maxsize=512, ttl=3600)


@dataclass
class Macros:
    """Nutrition macros per 100g of food."""
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


@dataclass
class FoodHit:
    """A food search result with macros per 100g."""
    food_id: int
    description: str
    macros_per_100g: dict  # keys: calories, protein_g, carbs_g, fat_g


def _extract_macros_from_food(food_data: dict) -> Optional[Macros]:
    """
    Extract macro nutrients from USDA food detail response.
    
    Args:
        food_data: Full food object from USDA API
        
    Returns:
        Macros object or None if nutrients not found
    """
    nutrients = food_data.get("foodNutrients", [])
    
    # Build a map of nutrient ID -> value
    nutrient_map = {}
    for n in nutrients:
        # Handle both old and new API response formats
        nutrient_id = None
        if "nutrient" in n and "id" in n["nutrient"]:
            # New format (v1 API)
            nutrient_id = n["nutrient"]["id"]
        elif "nutrientId" in n:
            # Old format
            nutrient_id = n["nutrientId"]
        
        if nutrient_id and "value" in n:
            nutrient_map[nutrient_id] = n["value"]
    
    # Extract the four key nutrients
    # 1003: Protein
    # 1004: Total lipid (fat)
    # 1005: Carbohydrate, by difference
    # 1008: Energy (kcal)
    protein = nutrient_map.get(1003)
    fat = nutrient_map.get(1004)
    carbs = nutrient_map.get(1005)
    calories = nutrient_map.get(1008)
    
    if protein is None or fat is None or carbs is None or calories is None:
        return None
    
    return Macros(
        calories=float(calories),
        protein_g=float(protein),
        carbs_g=float(carbs),
        fat_g=float(fat)
    )


def _extract_macros_from_search_hit(hit: dict) -> dict:
    """
    Extract macro nutrients from a search result hit.
    
    Search results have a different structure - nutrients are under food.foodNutrients.
    
    Args:
        hit: A food item from the search results array
        
    Returns:
        Dict with keys: calories, protein_g, carbs_g, fat_g
    """
    food = hit.get("food", {})
    nutrients = food.get("foodNutrients", []) if food else hit.get("foodNutrients", [])
    
    nutrient_map = {}
    for n in nutrients:
        nutrient_id = None
        if "nutrient" in n and "id" in n["nutrient"]:
            nutrient_id = n["nutrient"]["id"]
        elif "nutrientId" in n:
            nutrient_id = n["nutrientId"]
        
        if nutrient_id and "value" in n:
            nutrient_map[nutrient_id] = n["value"]
    
    protein = nutrient_map.get(1003, 0)
    fat = nutrient_map.get(1004, 0)
    carbs = nutrient_map.get(1005, 0)
    calories = nutrient_map.get(1008, 0)
    
    return {
        "calories": float(calories),
        "protein_g": float(protein),
        "carbs_g": float(carbs),
        "fat_g": float(fat),
    }


async def search_food(query: str, limit: int = 5) -> list[FoodHit]:
    """
    Search USDA FoodData Central for foods matching the query.
    
    Uses Foundation and SR Legacy data types which don't require an API key
    under low rate limits.
    
    Args:
        query: Search term (e.g., "chicken breast")
        limit: Maximum number of results to return (default: 5)
        
    Returns:
        List of FoodHit objects with food_id, description, and macros_per_100g
    """
    url = f"{settings.USDA_API_BASE}/foods/search"
    params = {
        "query": query,
        "pageSize": limit,
        "dataType": "Foundation,SR Legacy",
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        foods = data.get("foods", [])
        
        results = []
        for food in foods[:limit]:
            food_id = food.get("fdcId")
            description = food.get("description", "")
            
            macros_per_100g = _extract_macros_from_search_hit(food)
            
            results.append(FoodHit(
                food_id=food_id,
                description=description,
                macros_per_100g=macros_per_100g,
            ))
        
        return results


async def get_macros(food_id: int) -> Macros:
    """
    Get macro nutrients for a specific food by its USDA ID.
    
    Results are cached in-memory using TTLCache (max 512 entries, 1 hour TTL).
    
    Args:
        food_id: USDA FoodData Central ID (fdcId)
        
    Returns:
        Macros object with calories, protein_g, carbs_g, fat_g per 100g
        
    Raises:
        httpx.HTTPStatusError: If the API returns an error (e.g., 404 for not found)
    """
    # Check cache first
    if food_id in _macros_cache:
        return _macros_cache[food_id]
    
    url = f"{settings.USDA_API_BASE}/food/{food_id}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        
        data = response.json()
        macros = _extract_macros_from_food(data)
        
        if macros is None:
            # Return zero macros if nutrients not found
            macros = Macros(calories=0, protein_g=0, carbs_g=0, fat_g=0)
        
        # Cache the result
        _macros_cache[food_id] = macros
        
        return macros
