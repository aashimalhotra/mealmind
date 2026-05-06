"""Prompt template for grocery list consolidation using LLM."""

import json

GROCERY_CONSOLIDATE_SYSTEM_PROMPT = """You are a grocery list consolidation assistant. Your task is to take a list of recipe ingredients and consolidate them into a single, organized grocery list.

Group ingredients by category (e.g., Produce, Dairy, Pantry, Meat, Spices). For each ingredient, sum the total quantity needed across all recipes. Use the most appropriate unit for the total quantity.

Output a JSON object with the following structure:
{
  "items": [
    {
      "ingredient_name": "string",
      "category": "string",
      "total_quantity": float,
      "unit": "string"
    }
  ]
}

Rules:
1. Group items by category. Common categories: Produce, Dairy, Pantry, Meat, Seafood, Spices, Bakery, Frozen, Canned Goods, Condiments, Other.
2. Sum quantities for the same ingredient within the same category.
3. Use the base unit for totals (e.g., grams for spices, pieces for produce).
4. Do not include checked status - that is handled by the application.
5. Ingredient names should be plural where appropriate for grocery shopping (e.g., "Carrots" not "Carrot").
"""

def build_grocery_consolidate_prompt(ingredients: list[dict]) -> list[dict]:
    """
    Build the prompt messages for grocery list consolidation.
    
    Args:
        ingredients: List of ingredient dicts with keys:
            - name: ingredient name
            - total_quantity: total quantity needed
            - unit: unit of measurement
            - category: optional pre-assigned category (if None, LLM will assign)
    
    Returns:
        List of message dicts for LLM call.
    """
    ingredients_json = []
    for ing in ingredients:
        ingredients_json.append({
            "name": ing["name"],
            "quantity": ing["total_quantity"],
            "unit": ing["unit"],
            "category": ing.get("category", None)
        })
    
    user_content = f"""Please consolidate the following ingredients into a grocery list:
{json.dumps(ingredients_json, indent=2)}

Return only the JSON object as specified, no additional text or markdown formatting.
"""
    return [
        {"role": "system", "content": GROCERY_CONSOLIDATE_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]
