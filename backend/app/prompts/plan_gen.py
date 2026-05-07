"""
Plan generation prompt builder for LLM meal plan generation.

Takes (household, favorites, dislikes, recent_plans) and returns a system prompt string.
"""

from typing import Optional


def build_plan_gen_prompt(
    household,
    favorites: Optional[list] = None,
    dislikes: Optional[list] = None,
    recent_plans: Optional[list] = None,
) -> str:
    """
    Build the system prompt for meal plan generation.

    Args:
        household: Household ORM object with prep_days, dineout_days, cuisine_pref,
                   and related users with calorie_target, protein_pct, carbs_pct, fat_pct
        favorites: List of favorite Recipe objects (preferred options)
        dislikes: List of disliked Recipe objects (exclusions)
        recent_plans: List of recent MealPlan objects (to avoid repetition)

    Returns:
        System prompt string for the LLM
    """
    if favorites is None:
        favorites = []
    if dislikes is None:
        dislikes = []
    if recent_plans is None:
        recent_plans = []

    # Get household preferences
    prep_days = household.prep_days if household.prep_days else ["sunday", "wednesday"]
    dineout_days = household.dineout_days if household.dineout_days else ["friday_dinner", "sunday_dinner"]
    cuisine_pref = household.cuisine_pref or "indian-inspired"
    
    import json

    # Get user calorie targets (assume 2 users per household for Phase 1)
    users = household.members if hasattr(household, 'members') else []
    user_targets = []
    for user in users:
        target = getattr(user, 'calorie_target', 1500)
        protein_pct = getattr(user, 'protein_pct', 0.30)
        carbs_pct = getattr(user, 'carbs_pct', 0.30)
        fat_pct = getattr(user, 'fat_pct', 0.40)
        user_targets.append({
            "calorie_target": target,
            "macro_split": f"{int(protein_pct*100)}P/{int(carbs_pct*100)}C/{int(fat_pct*100)}F"
        })

    # Default if no users found
    if not user_targets:
        user_targets = [
            {"calorie_target": 1500, "macro_split": "30P/30C/40F"},
            {"calorie_target": 1800, "macro_split": "30P/30C/40F"}
        ]

    # Build favorites text
    favorites_text = ""
    if favorites:
        favorites_text = "\n## Favorite Recipes (prioritize these):\n"
        for r in favorites:
            favorites_text += f"- {r.display_name}"
            if r.authentic_name:
                favorites_text += f" ({r.authentic_name})"
            favorites_text += "\n"

    # Build dislikes text
    dislikes_text = ""
    if dislikes:
        dislikes_text = "\n## Disliked Recipes (do NOT include):\n"
        for r in dislikes:
            dislikes_text += f"- {r.display_name}"
            if r.authentic_name:
                dislikes_text += f" ({r.authentic_name})"
            dislikes_text += "\n"

    # Build recent plans text (to avoid repetition)
    recent_text = ""
    if recent_plans:
        recent_text = "\n## Recent Plans (avoid repeating these meals):\n"
        for plan in recent_plans[:4]:  # Last 4 weeks
            if hasattr(plan, 'plan_data') and plan.plan_data:
                import json
                try:
                    plan_data = json.loads(plan.plan_data) if isinstance(plan.plan_data, str) else plan.plan_data
                    recent_text += f"### Week of {plan.week_start}:\n"
                    for day, meals in plan_data.items():
                        for slot, meal in meals.items():
                            if 'recipe_id' in meal:
                                recent_text += f"- {day} {slot}\n"
                except (json.JSONDecodeError, AttributeError):
                    continue

    prompt = f"""You are a meal planning assistant for a household that batch cooks twice a week.

## Household Profile
- Cuisine preference: {cuisine_pref}
- User targets: {json.dumps(user_targets, indent=2)}
- Default macro split: 30P/30C/40F (30% protein, 30% carbs, 40% fat)

## Constraints
1. **Prep days**: {', '.join(prep_days)} - batch cook on these days. Meals cooked on these days will be eaten on multiple days.
2. **Dine-out days**: {', '.join(dineout_days)} - mark these as "dine-out" meals (no recipe needed).
3. **Breakfast**: Always "day-of" (cook fresh each day). Examples: eggs, crepes, pancake bake, with prepped condiments (chutneys, guac).
4. **Batch meals**: Meals cooked on prep days should be reused across multiple days (Monday-Wednesday from Sunday prep, Thursday-Saturday from Wednesday prep).
5. **Meal names**: Use universally understandable English names as the primary display name. Include authentic names (e.g., "jeera rice" for "Cumin rice") as a subtitle in the recipe's authentic_name field.
6. **Portions**: Same meals for all household members, portion-adjusted for their calorie targets (1500/1800 kcal).

## Output Format
You MUST respond with a single JSON object (no markdown, no commentary) with exactly these top-level keys:
- "plan_data": The weekly meal plan matching the schema below
- "recipes": Array of unique recipe objects used in the plan

### plan_data Schema
A JSON object with keys for each day of the week (monday through sunday). Each day has:
- "breakfast": {{ "recipe_id": "<recipe_id>", "meal_type": "day-of", "notes": "<optional>" }}
- "lunch": {{ "recipe_id": "<recipe_id>", "meal_type": "batch-sun|batch-wed|day-of", "notes": "<optional>" }}
- "dinner": {{ "recipe_id": "<recipe_id>", "meal_type": "batch-sun|batch-wed|day-of|dine-out", "notes": "<optional>" }}

For "dine-out" meals, omit recipe_id and set meal_type to "dine-out".

### recipes Schema
An array of objects, one per unique recipe in plan_data. Each recipe has:
- "id": A unique string ID (e.g., "recipe-001")
- "display_name": English meal name (e.g., "Cumin rice")
- "authentic_name": Authentic name subtitle (e.g., "jeera rice")
- "description": Brief description (e.g., "Fragrant rice with cumin seeds and ghee")
- "ingredients": Array of ingredient objects with:
  - "name": Ingredient name - use simple, clean English names (e.g., "cooking oil", "butter"). Do NOT use URL-encoded names (like "Cooking+Oil%2FButter") or special URL characters. Use spaces, not + or % codes. USDA database friendly names work best.
  - "quantity_1500": Quantity in grams for 1500 kcal person
  - "quantity_1800": Quantity in grams for 1800 kcal person
  - "unit": "g" (all quantities are in grams)
- "prep_steps": Array of strings (cooking steps)
- "serving_instructions": Array of strings (reheat and plate instructions)
- "tags": Array of strings (e.g., ["high-protein", "gluten-free", "batch-friendly"])

## Important Notes
- Generate unique recipe IDs (e.g., "recipe-001", "recipe-002") and reference them in plan_data
- All ingredient quantities must be in grams
- Ensure the plan respects the macro split (30P/30C/40F) across the week
- Batch meals should appear on multiple days with the same recipe_id{favorites_text}{dislikes_text}{recent_text}

Respond with ONLY the JSON object, no other text."""
    
    return prompt
