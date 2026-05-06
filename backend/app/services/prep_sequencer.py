"""
Prep sequence optimization service.

Uses LLM to generate time-optimized, interleaved prep sequences
from a list of recipes and their prep steps.
"""

import logging
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.services.llm import get_llm, LLMResponseError
from app.prompts.prep_sequence import get_prep_sequence_prompt
from app.db.models import Recipe

logger = logging.getLogger(__name__)


class PrepStep(BaseModel):
    """A single step in an optimized prep sequence."""
    
    index: int = Field(description="0-based order in sequence")
    recipe_id: Optional[str] = Field(None, description="Recipe ID this step belongs to, or null for shared steps")
    title: str = Field(description="Brief step name")
    description: str = Field(description="Detailed instruction")
    active: bool = Field(description="True for hands-on, False for passive wait")
    duration_min: Optional[int] = Field(None, description="Duration in minutes, required for passive steps")
    depends_on_step: Optional[int] = Field(None, description="Step index this depends on, if any")


class PrepSequenceResponse(BaseModel):
    """LLM response containing the optimized prep sequence."""
    
    model_config = ConfigDict(from_attributes=True)
    
    steps: list[PrepStep] = Field(description="Ordered list of prep steps")


async def sequence_prep(recipes: list[Recipe]) -> list[PrepStep]:
    """
    Generate an optimized prep sequence from a list of recipes.
    
    Args:
        recipes: List of Recipe ORM objects with prep_steps
        
    Returns:
        List of PrepStep objects in optimized order
        
    Raises:
        LLMResponseError: If LLM returns invalid response
        ValueError: If recipe data is invalid or response validation fails
    """
    # Build recipe data for the prompt
    recipes_data = []
    for recipe in recipes:
        # Parse prep_steps from JSON string if needed
        prep_steps = recipe.prep_steps
        if isinstance(prep_steps, str):
            import json
            try:
                prep_steps = json.loads(prep_steps)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse prep_steps for recipe {recipe.id}")
                prep_steps = []
        
        if not prep_steps:
            continue
            
        recipes_data.append({
            "id": recipe.id,
            "display_name": recipe.display_name,
            "prep_steps": prep_steps if isinstance(prep_steps, list) else []
        })
    
    if not recipes_data:
        logger.warning("No recipes with prep_steps provided to sequence_prep")
        return []
    
    # Build the prompt
    prompt = get_prep_sequence_prompt(recipes_data)
    
    # Call LLM
    llm = get_llm()
    messages = [
        {"role": "system", "content": prompt},
    ]
    
    try:
        llm_response = await llm.chat(messages, json_mode=True)
        
        # Validate and parse the response
        sequence_response = PrepSequenceResponse.model_validate(llm_response)
        
        # Sort steps by index to ensure correct order
        steps = sorted(sequence_response.steps, key=lambda s: s.index)
        
        # Re-index to ensure sequential ordering
        for i, step in enumerate(steps):
            step.index = i
        
        logger.info(f"Generated prep sequence with {len(steps)} steps for {len(recipes)} recipes")
        return steps
        
    except LLMResponseError as e:
        logger.error(f"LLM returned invalid response: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to generate prep sequence: {e}")
        raise ValueError(f"Prep sequence generation failed: {e}") from e
