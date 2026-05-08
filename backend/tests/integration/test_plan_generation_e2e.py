"""
Integration test for end-to-end meal plan generation.

This test uses mocks for LLM calls and tests the full API flow
including SSE streaming, database persistence, and response validation.
"""

import json
import pytest
import asyncio
from datetime import date, timedelta
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock, patch

from app.db.models import Household, Recipe, MealPlan


# Canned LLM response matching the format expected by the plans router
CANNED_LLM_RESPONSE = {
    "plan_data": {
        "monday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "tuesday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "wednesday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "thursday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "friday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "saturday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        },
        "sunday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "day-of"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "batch-sun"},
            "dinner": {"recipe_id": "recipe-003", "meal_type": "batch-sun"}
        }
    },
    "recipes": [
        {
            "id": "recipe-001",
            "display_name": "Test Recipe 1",
            "ingredients": [{"name": "rice", "quantity_1500": 100, "quantity_1800": 120, "unit": "g", "nutrition_source": "usda"}],
            "prep_steps": ["Step 1"],
            "serving_instructions": ["Serve hot"],
            "tags": ["test"]
        },
        {
            "id": "recipe-002",
            "display_name": "Test Recipe 2",
            "ingredients": [{"name": "chicken", "quantity_1500": 200, "quantity_1800": 240, "unit": "g"}],
            "prep_steps": ["Step A"],
            "serving_instructions": ["Serve with rice"],
            "tags": ["test"]
        },
        {
            "id": "recipe-003",
            "display_name": "Test Recipe 3",
            "ingredients": [{"name": "vegetables", "quantity_1500": 150, "quantity_1800": 180, "unit": "g"}],
            "prep_steps": ["Step X"],
            "serving_instructions": ["Steam"],
            "tags": ["test"]
        }
    ]
}


def parse_sse_events(response: object) -> List[Dict[str, Any]]:
    """Parse SSE events from httpx response."""
    events = []
    for line in response.text.split("\n"):
        line = line.strip()
        if line.startswith("data:"):
            data_str = line[5:].strip()
            if data_str:
                try:
                    event_data = json.loads(data_str)
                    events.append(event_data)
                except json.JSONDecodeError:
                    pass
    return events


@pytest.fixture(autouse=True)
def mock_services():
    """Mock LLM and nutrition services for all tests."""
    # Create mock LLM client with chat method
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(return_value=CANNED_LLM_RESPONSE)

    # Create async mock for nutrition resolution
    mock_resolve_nutrition = AsyncMock(return_value=None)

    # Patch at the location where the functions are used (in the plans router)
    with patch("app.routers.plans.get_llm", return_value=mock_llm), \
         patch("app.routers.plans.resolve_recipe_nutrition", mock_resolve_nutrition):
        yield


@pytest.fixture
def setup_test_recipes(test_db_session):
    """Add test recipes with nutrition data to the database."""
    # The recipes will be created by the plan generation endpoint
    # This fixture is just a placeholder for any pre-existing recipe setup
    yield


@pytest.mark.asyncio
async def test_plan_generation_e2e(async_client, test_db_session, setup_test_recipes):
    """
    Test full plan generation flow: SSE stream, 7d×3 slots, DB persistence, USDA ingredients.
    """
    # Send POST request to generate endpoint
    response = await async_client.post("/api/plans/generate")

    # Check response is successful
    assert response.status_code == 200, f"Plan generation failed with status {response.status_code}"

    # Check content type is SSE
    content_type = response.headers.get("content-type", "")
    assert "text/event-stream" in content_type, f"Expected SSE response, got {content_type}"

    # Parse SSE events
    events = parse_sse_events(response)

    # Check we have events
    assert len(events) > 0, "No SSE events received"

    # Check event order: start, recipes, plan, done
    event_types = [event.get("event") for event in events]
    assert "start" in event_types, f"Missing 'start' event in {event_types}"
    assert "recipes" in event_types, f"Missing 'recipes' event in {event_types}"
    assert "plan" in event_types, f"Missing 'plan' event in {event_types}"
    assert "done" in event_types, f"Missing 'done' event in {event_types}"

    # Check order: start first, then recipes, then plan, then done last
    start_idx = event_types.index("start")
    recipes_idx = event_types.index("recipes")
    plan_idx = event_types.index("plan")
    done_idx = event_types.index("done")

    assert start_idx < recipes_idx < plan_idx < done_idx, "SSE events out of order"

    # Check done event has plan_id
    done_event = events[done_idx]
    assert "plan_id" in done_event, "Done event missing plan_id"
    plan_id = done_event["plan_id"]

    # Verify meal plan is persisted in database
    meal_plan = test_db_session.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert meal_plan is not None, f"Meal plan {plan_id} not found in database"
    assert meal_plan.status == "draft", f"Expected status 'draft', got '{meal_plan.status}'"

    # Verify recipes are persisted
    recipes = test_db_session.query(Recipe).all()
    assert len(recipes) == 3, f"Expected 3 recipes in database, got {len(recipes)}"

    # Check recipe names match
    recipe_names = {r.display_name for r in recipes}
    assert "Test Recipe 1" in recipe_names
    assert "Test Recipe 2" in recipe_names
    assert "Test Recipe 3" in recipe_names

    # Verify plan data structure (7 days)
    plan_data_str = meal_plan.plan_data
    plan_data = json.loads(plan_data_str) if isinstance(plan_data_str, str) else plan_data_str
    assert len(plan_data) == 7, f"Expected 7 days in plan, got {len(plan_data)}"

    # Verify each day has 3 meals
    total_filled_slots = 0
    for day_name, day_data in plan_data.items():
        meals = day_data
        assert len(meals) == 3, f"Day {day_name} has {len(meals)} meals, expected 3"
        total_filled_slots += len(meals)

        # Verify each meal has a recipe_id
        for meal_type, meal_info in meals.items():
            assert "recipe_id" in meal_info, f"Day {day_name}, {meal_type} missing recipe_id"
            assert meal_info["recipe_id"] is not None, f"Day {day_name}, {meal_type} has null recipe_id"

    assert total_filled_slots == 21, f"Expected 21 filled slots, got {total_filled_slots}"

    # Check USDA ingredients in dataset (ingredients are stored as JSON in Recipe.ingredients)
    # Verify at least one recipe has ingredients with nutrition_source="usda"
    recipes = test_db_session.query(Recipe).all()
    usda_found = False
    for recipe in recipes:
        ingredients = json.loads(recipe.ingredients) if isinstance(recipe.ingredients, str) else recipe.ingredients
        for ing in ingredients:
            if ing.get("nutrition_source") == "usda":
                usda_found = True
                break
        if usda_found:
            break
    assert usda_found, "No recipes with USDA ingredients found"
