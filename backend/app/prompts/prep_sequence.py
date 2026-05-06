"""
Prompt builder for generating AI-optimized prep step sequences.

Takes a list of recipes with prep_steps and produces a time-optimized,
interleaved sequence that minimizes total prep time by overlapping
passive waits with active work.
"""

PREP_SEQUENCE_PROMPT = """You are a meal prep optimization assistant. Given a list of recipes with their prep steps, create an optimized, interleaved prep sequence that minimizes total time.

OPTIMIZATION RULES:
1. START passive tasks first (marinating, oven preheating, rice cooking, etc.)
2. OVERLAP passive waits with active work (chop while rice cooks)
3. GROUP similar prep together (all chopping in one block, all mixing together)
4. ALWAYS include duration_min for wait/passive steps
5. END with portioning step for batch prep recipes
6. Use depends_on_step to indicate when a step must wait for another to complete

STEP TYPES:
- active=true: Hands-on work (chopping, mixing, sauteing)
- active=false: Passive wait (marinating, baking, simmering, cooling)

INPUT:
You will receive a JSON array of recipes, each with:
- id: recipe identifier
- display_name: recipe name
- prep_steps: array of step descriptions

OUTPUT:
Respond with a JSON object containing a "steps" array. Each step must have:
- index: integer (0-based order in sequence)
- recipe_id: string (which recipe this step belongs to)
- title: string (brief step name, e.g., "Marinate chicken", "Chop vegetables")
- description: string (detailed instruction)
- active: boolean (true=hands-on, false=wait/passive)
- duration_min: integer or null (REQUIRED for passive steps, optional for active)
- depends_on_step: integer or null (step index this depends on, if any)

Example output format:
{
  "steps": [
    {
      "index": 0,
      "recipe_id": "recipe_1",
      "title": "Preheat oven",
      "description": "Preheat oven to 400°F for roasted vegetables",
      "active": false,
      "duration_min": 15,
      "depends_on_step": null
    },
    {
      "index": 1,
      "recipe_id": "recipe_2",
      "title": "Start rice",
      "description": "Combine rice and water in pot, bring to boil, then simmer",
      "active": false,
      "duration_min": 20,
      "depends_on_step": null
    },
    {
      "index": 2,
      "recipe_id": null,
      "title": "Chop all vegetables",
      "description": "Chop onions, peppers, and carrots for all recipes",
      "active": true,
      "duration_min": null,
      "depends_on_step": null
    }
  ]
}

IMPORTANT: Output ONLY the JSON object, no additional text or commentary."""


def get_prep_sequence_prompt(recipes: list[dict]) -> str:
    """
    Build a prompt for generating an optimized prep sequence.
    
    Args:
        recipes: List of dicts with recipe details (id, display_name, prep_steps)
        
    Returns:
        System prompt string with recipe data injected
    """
    import json
    
    recipes_json = json.dumps(recipes, indent=2)
    
    prompt = f"""{PREP_SEQUENCE_PROMPT}

RECIPES TO SEQUENCE:
{recipes_json}

Generate the optimized prep sequence now."""
    
    return prompt
