"""
Nutrition estimation prompt for LLM fallback.

When USDA FoodData Central API has no match for an ingredient,
this prompt is used with the LLM to estimate nutrition per 100g.
"""

NUTRITION_ESTIMATE_PROMPT = """You are a nutrition database assistant. Given an ingredient name, provide the estimated nutrition information per 100 grams.

Respond with a JSON object containing exactly these fields (no additional text or commentary):
- calories_per_100g: float (kilocalories)
- protein_per_100g: float (grams)
- carbs_per_100g: float (grams)
- fat_per_100g: float (grams)

Example response:
{"calories_per_100g": 165.0, "protein_per_100g": 31.0, "carbs_per_100g": 0.0, "fat_per_100g": 3.6}
"""
