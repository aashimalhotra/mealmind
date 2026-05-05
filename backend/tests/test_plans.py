"""
Tests for meal plan generation endpoints.
"""
import json
import pytest
import asyncio
from datetime import date, timedelta
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.db.models import Household, Recipe, MealPlan
from app.schemas.plan import PlanOut, PlanUpdate

# Canned LLM response for testing
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
            "ingredients": [{"name": "rice", "quantity_1500": 100, "quantity_1800": 120, "unit": "g"}],
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


def parse_sse_events(response: httpx.Response) -> List[Dict[str, Any]]:
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


@pytest.mark.asyncio
async def test_generate_plan_streams_done_event(async_client):
    """Test that plan generation streams start -> recipes -> plan -> done events in order."""
    # Send POST request to generate endpoint
    response = await async_client.post("/api/plans/generate")

    # Check response is successful
    assert response.status_code == 200

    # Parse SSE events
    events = parse_sse_events(response)

    # Check we have events
    assert len(events) > 0

    # Check event order: start, recipes, plan, done
    event_types = [event.get("event") for event in events]
    assert "start" in event_types
    assert "recipes" in event_types
    assert "plan" in event_types
    assert "done" in event_types

    # Check order: start first, then recipes, then plan, then done last
    start_idx = event_types.index("start")
    recipes_idx = event_types.index("recipes")
    plan_idx = event_types.index("plan")
    done_idx = event_types.index("done")

    assert start_idx < recipes_idx < plan_idx < done_idx

    # Check done event has plan_id
    done_event = events[done_idx]
    assert "plan_id" in done_event


@pytest.mark.asyncio
async def test_generate_plan_persists_recipes_and_plan(async_client, test_db_session):
    """Test that plan generation persists recipes and meal plan to database."""
    # Send POST request to generate endpoint
    response = await async_client.post("/api/plans/generate")
    assert response.status_code == 200

    # Parse SSE events to get plan_id
    events = parse_sse_events(response)
    done_event = next(event for event in events if event.get("event") == "done")
    plan_id = done_event["plan_id"]

    # Check meal plan is persisted
    meal_plan = test_db_session.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert meal_plan is not None
    assert meal_plan.status == "draft"

    # Check recipes are persisted
    recipes = test_db_session.query(Recipe).all()
    assert len(recipes) == 3  # 3 recipes in canned response

    # Check recipe names match
    recipe_names = {r.display_name for r in recipes}
    assert "Test Recipe 1" in recipe_names
    assert "Test Recipe 2" in recipe_names
    assert "Test Recipe 3" in recipe_names


@pytest.mark.asyncio
async def test_get_current_plan_returns_404_when_none(async_client):
    """Test that GET /current returns 404 when no plans exist."""
    response = await async_client.get("/api/plans/current")
    assert response.status_code == 404
    assert response.json()["detail"] == "No meal plan found"


@pytest.mark.asyncio
async def test_get_current_plan_prefers_approved_over_draft(async_client, test_db_session):
    """Test that GET /current returns approved plan over draft."""
    # Create a household first (required for meal plan)
    household = Household(
        name="Test Household",
        prep_days='["sunday", "wednesday"]',
        dineout_days='["friday_dinner", "sunday_dinner"]',
        cuisine_pref="indian-inspired"
    )
    test_db_session.add(household)
    test_db_session.commit()

    # Create a draft plan
    draft_plan = MealPlan(
        household_id=household.id,
        week_start=date.today(),
        status="draft",
        plan_data=json.dumps({"test": "draft"})
    )
    test_db_session.add(draft_plan)

    # Create an approved plan (more recent week_start)
    approved_plan = MealPlan(
        household_id=household.id,
        week_start=date.today() + timedelta(days=7),
        status="approved",
        plan_data=json.dumps({"test": "approved"})
    )
    test_db_session.add(approved_plan)
    test_db_session.commit()

    # Get current plan
    response = await async_client.get("/api/plans/current")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == approved_plan.id
    assert data["status"] == "approved"


@pytest.mark.asyncio
async def test_patch_plan_to_approved_succeeds(async_client, test_db_session):
    """Test that PATCH /{id} can update plan status to approved."""
    # Generate a plan to get a valid draft
    response = await async_client.post("/api/plans/generate")
    assert response.status_code == 200

    events = parse_sse_events(response)
    done_event = next(event for event in events if event.get("event") == "done")
    plan_id = done_event["plan_id"]

    # Patch the plan to approved
    update_data = {"status": "approved"}
    patch_response = await async_client.patch(
        f"/api/plans/{plan_id}",
        json=update_data
    )
    assert patch_response.status_code == 200

    data = patch_response.json()
    assert data["status"] == "approved"

    # Verify in database
    meal_plan = test_db_session.query(MealPlan).filter(MealPlan.id == plan_id).first()
    assert meal_plan.status == "approved"
