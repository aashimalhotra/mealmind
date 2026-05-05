"""
Integration test for end-to-end meal plan generation with USDA + LLM integration.

Run this test with:
    MEALMIND_INTEGRATION_TESTS=1 pytest -m integration

Prerequisites:
1. LiteLLM proxy running on http://localhost:4000 (start via `docker-compose up -d litellm` if using Docker)
2. MealMind backend API running on http://localhost:8000 (adjust BASE_URL in test if different)
3. MEALMIND_INTEGRATION_TESTS environment variable set to any non-empty value
4. Database populated with sample ingredients, including at least 3 with nutrition_source="usda"
"""

import os
import json
import pytest
import httpx

# Skip test if integration test env var is not set
@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.skipif(
    os.environ.get("MEALMIND_INTEGRATION_TESTS") is None,
    reason="MEALMIND_INTEGRATION_TESTS not set, skipping opt-in integration test"
)
async def test_plan_generation_e2e():
    """Test full plan generation flow: SSE stream, 7d×3 slots, non-null macros, USDA ingredients."""
    
    # Configuration (override via env vars if needed)
    base_url = os.environ.get("MEALMIND_API_URL", "http://localhost:8000")
    plan_endpoint = f"{base_url}/api/plans/generate"
    
    # Sample payload for plan generation (adjust to match actual endpoint schema)
    payload = {
        "dietary_restrictions": [],
        "calorie_target": 2000,
        "protein_target": 150,
        "days": 7,
        "meals_per_day": 3,
        "user_id": "test-integration-user"
    }
    
    # Use httpx AsyncClient to stream SSE response
    async with httpx.AsyncClient(timeout=180.0) as client:
        # Send POST request with SSE accept header
        response = await client.post(
            plan_endpoint,
            json=payload,
            headers={"Accept": "text/event-stream"}
        )
        
        # Assert request was accepted
        assert response.status_code == 200, f"Plan generation failed with status {response.status_code}"
        content_type = response.headers.get("content-type", "")
        assert "text/event-stream" in content_type, f"Expected SSE response, got {content_type}"
        
        # Parse SSE events
        done_received = False
        plan_data = None
        
        async for line in response.aiter_lines():
            line = line.strip()
            if not line:
                continue  # Skip empty lines between events
            
            if line.startswith("event:"):
                event_type = line.split(":", 1)[1].strip()
                if event_type == "done":
                    done_received = True
            elif line.startswith("data:"):
                data_str = line.split(":", 1)[1].strip()
                if data_str == "done":
                    done_received = True
                else:
                    try:
                        data = json.loads(data_str)
                        # Capture plan data if present in SSE event
                        if "plan" in data:
                            plan_data = data["plan"]
                    except json.JSONDecodeError:
                        # Ignore non-JSON data lines (e.g., keep-alive comments)
                        pass
        
        # Assert SSE stream completed with done event
        assert done_received, "SSE stream did not send 'done' event/marker"
        
        # Assert plan structure and content
        assert plan_data is not None, "No plan data received in SSE stream"
        
        # Check 7 days × 3 slots
        days = plan_data.get("days", [])
        assert len(days) == 7, f"Expected 7 days in plan, got {len(days)}"
        
        total_filled_slots = 0
        for day_idx, day in enumerate(days):
            meals = day.get("meals", [])
            assert len(meals) == 3, f"Day {day_idx+1} has {len(meals)} meals, expected 3"
            
            for meal_idx, meal in enumerate(meals):
                recipe = meal.get("recipe")
                assert recipe is not None, f"Day {day_idx+1}, Meal {meal_idx+1} has no recipe"
                
                # Check all macros are non-null
                macros = recipe.get("macros", {})
                assert macros.get("calories") is not None, f"Recipe {recipe.get('id')} has null calories"
                assert macros.get("protein") is not None, f"Recipe {recipe.get('id')} has null protein"
                assert macros.get("fat") is not None, f"Recipe {recipe.get('id')} has null fat"
                assert macros.get("carbs") is not None, f"Recipe {recipe.get('id')} has null carbs"
                
                total_filled_slots += 1
        
        assert total_filled_slots == 7 * 3, f"Expected 21 filled slots, got {total_filled_slots}"
    
    # Check USDA ingredients in dataset (requires DB access)
    try:
        from app.db.session import SessionLocal
        from app.models.ingredient import Ingredient
    except ImportError:
        pytest.skip("Could not import database models, skipping USDA ingredient check")
    
    db = SessionLocal()
    try:
        usda_count = db.query(Ingredient).filter(Ingredient.nutrition_source == "usda").count()
        assert usda_count >= 3, f"Expected at least 3 USDA ingredients, got {usda_count}"
    finally:
        db.close()
