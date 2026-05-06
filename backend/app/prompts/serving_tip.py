"""
Prompt builder for generating AI serving tips for recipes.
"""

def get_serving_tip_prompt(recipe: dict, household: dict, calorie_target: int) -> str:
    """
    Build a prompt for generating a concise serving tip.
    
    Args:
        recipe: dict with recipe details (display_name, macros, etc.)
        household: dict with household preferences (name, cuisine_pref, members, etc.)
        calorie_target: 1500 or 1800
        
    Returns:
        System prompt string
    """
    recipe_name = recipe.get('display_name', 'this dish')
    protein = recipe.get('protein_g', 0) or 0
    carbs = recipe.get('carbs_g', 0) or 0
    fat = recipe.get('fat_g', 0) or 0
    calories = recipe.get('calories_per_serving', 0) or 0
    
    # Build household context if available
    household_context = ""
    if household and household.get('members'):
        members = household.get('members', [])
        household_context = f"\nHousehold has {len(members)} member(s)."
        if household.get('cuisine_pref'):
            household_context += f" Cuisine preference: {household['cuisine_pref']}."
    
    prompt = f"""You are a helpful meal planning assistant. 

Given this recipe and household context, provide ONE concise serving tip in under 25 words.

Recipe: {recipe_name}
Macros per serving: {calories} kcal, {protein}g protein, {carbs}g carbs, {fat}g fat
Household calorie target: {calorie_target}{household_context}

The tip should be specific to hitting their macro targets. Examples:
- For 1800 target with low carbs: "Add an extra 50g rice or a roti to hit your 1800 target."
- For 1500 target on track: "This meal fits your 1500 cal target perfectly as-is!"
- For low protein: "Pair with a bowl of Greek yogurt to boost protein by 15g."

Output ONLY the tip text, no quotes, no explanation."""
    
    return prompt
