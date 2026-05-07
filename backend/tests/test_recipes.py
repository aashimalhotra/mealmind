import pytest
import json
from typing import List, Dict
from unittest.mock import AsyncMock, patch, MagicMock


def _test_recipe_data() -> Dict:
    """Helper to generate valid test recipe data."""
    return {
        "display_name": "Tandoori Chicken",
        "authentic_name": "Tandoori Murgh",
        "description": "Yogurt-marinated spiced grilled chicken",
        "cuisine": "Indian",
        "ingredients": [
            {
                "name": "Chicken breast",
                "quantity_1500": 300,
                "quantity_1800": 400,
                "unit": "g",
                "usda_food_id": 12345,
                "calories_per_100g": 165,
                "protein_per_100g": 31,
                "carbs_per_100g": 0,
                "fat_per_100g": 3.6,
                "nutrition_source": "usda"
            }
        ],
        "prep_steps": ["Marinate chicken for 2 hours", "Grill at 200C for 25 minutes"],
        "serving_instructions": ["Reheat in oven at 180C for 10 minutes"],
        "tags": ["batch", "high-protein", "spicy"],
        "is_batch_prep": True,
        "is_favorite": False,
        "is_disliked": False
    }


@pytest.mark.asyncio
async def test_get_recipes_empty(async_client):
    """Test GET /api/recipes returns empty list when no recipes exist."""
    response = await async_client.get("/api/recipes")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_recipes_with_cuisine_filter(async_client):
    """Test GET /api/recipes filters by cuisine."""
    # Create Indian recipe
    recipe_data = _test_recipe_data()
    await async_client.post("/api/recipes", json=recipe_data)

    # Create Mexican recipe
    mexican_recipe = _test_recipe_data()
    mexican_recipe["display_name"] = "Tacos"
    mexican_recipe["cuisine"] = "Mexican"
    await async_client.post("/api/recipes", json=mexican_recipe)

    # Filter by Indian cuisine
    response = await async_client.get("/api/recipes?cuisine=Indian")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["display_name"] == "Tandoori Chicken"
    assert data[0]["cuisine"] == "Indian"

    # Filter by Mexican cuisine
    response = await async_client.get("/api/recipes?cuisine=Mexican")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["display_name"] == "Tacos"


@pytest.mark.asyncio
async def test_get_recipes_with_tags_filter(async_client):
    """Test GET /api/recipes filters by tags (comma-separated, match any)."""
    # Create recipe with tags batch, high-protein, spicy
    recipe_data = _test_recipe_data()
    await async_client.post("/api/recipes", json=recipe_data)

    # Create recipe with no matching tags
    no_tag_recipe = _test_recipe_data()
    no_tag_recipe["display_name"] = "Plain Rice"
    no_tag_recipe["tags"] = ["side"]
    await async_client.post("/api/recipes", json=no_tag_recipe)

    # Filter by tag "batch" (should match first recipe)
    response = await async_client.get("/api/recipes?tags=batch")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["display_name"] == "Tandoori Chicken"

    # Filter by tag "spicy" (should match first recipe)
    response = await async_client.get("/api/recipes?tags=spicy")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

    # Filter by tag "vegan" (no matches)
    response = await async_client.get("/api/recipes?tags=vegan")
    assert response.status_code == 200
    assert response.json() == []

    # Filter by multiple tags (match any)
    response = await async_client.get("/api/recipes?tags=batch,side")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_recipes_with_favorites_filter(async_client):
    """Test GET /api/recipes filters by favorites flag."""
    # Create favorite recipe
    recipe_data = _test_recipe_data()
    recipe_data["is_favorite"] = True
    await async_client.post("/api/recipes", json=recipe_data)

    # Create non-favorite recipe
    non_fav_recipe = _test_recipe_data()
    non_fav_recipe["display_name"] = "Everyday Dal"
    non_fav_recipe["is_favorite"] = False
    await async_client.post("/api/recipes", json=non_fav_recipe)

    # Filter favorites only
    response = await async_client.get("/api/recipes?favorites=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["is_favorite"] is True
    assert data[0]["display_name"] == "Tandoori Chicken"

    # Filter non-favorites (favorites=false)
    response = await async_client.get("/api/recipes?favorites=false")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["is_favorite"] is False


@pytest.mark.asyncio
async def test_get_recipe_by_id(async_client):
    """Test GET /api/recipes/{id} returns correct recipe."""
    # Create a recipe
    recipe_data = _test_recipe_data()
    create_resp = await async_client.post("/api/recipes", json=recipe_data)
    assert create_resp.status_code == 201
    created = create_resp.json()
    recipe_id = created["id"]

    # Fetch by ID
    response = await async_client.get(f"/api/recipes/{recipe_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == recipe_id
    assert data["display_name"] == "Tandoori Chicken"
    assert len(data["ingredients"]) == 1
    assert data["ingredients"][0]["name"] == "Chicken breast"
    assert data["tags"] == ["batch", "high-protein", "spicy"]


@pytest.mark.asyncio
async def test_get_recipe_404(async_client):
    """Test GET /api/recipes/{id} returns 404 for non-existent ID."""
    response = await async_client.get("/api/recipes/nonexistent-id")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_post_recipe(async_client):
    """Test POST /api/recipes creates a new recipe and calls nutrition resolution."""
    recipe_data = _test_recipe_data()
    
    # Mock the nutrition resolution to avoid external calls
    with patch("app.routers.recipes.nutrition.resolve_recipe_nutrition", new_callable=AsyncMock) as mock_resolve:
        response = await async_client.post("/api/recipes", json=recipe_data)
        assert response.status_code == 201
        data = response.json()
        
        # Verify nutrition service was called
        assert mock_resolve.called
        # Verify it was called with a Recipe object and db session
        assert mock_resolve.call_count == 1
        
        # Verify returned fields
        assert "id" in data
        assert data["display_name"] == "Tandoori Chicken"
        assert data["cuisine"] == "Indian"
        assert data["is_batch_prep"] is True
        assert data["is_favorite"] is False
        assert len(data["ingredients"]) == 1
        assert data["ingredients"][0]["nutrition_source"] == "usda"
        assert data["prep_steps"] == ["Marinate chicken for 2 hours", "Grill at 200C for 25 minutes"]
        assert data["tags"] == ["batch", "high-protein", "spicy"]


@pytest.mark.asyncio
async def test_patch_recipe(async_client):
    """Test PATCH /api/recipes/{id} partially updates a recipe and calls nutrition resolution when ingredients change."""
    # Create a recipe
    recipe_data = _test_recipe_data()
    create_resp = await async_client.post("/api/recipes", json=recipe_data)
    created = create_resp.json()
    recipe_id = created["id"]

    # Patch display name and favorite status (no ingredient changes)
    # Should NOT trigger nutrition resolution
    with patch("app.routers.recipes.nutrition.resolve_recipe_nutrition", new_callable=AsyncMock) as mock_resolve:
        patch_data = {
            "display_name": "Tandoori Chicken (Extra Spicy)",
            "is_favorite": True
        }
        response = await async_client.patch(f"/api/recipes/{recipe_id}", json=patch_data)
        assert response.status_code == 200
        data = response.json()

        # Verify updates
        assert data["display_name"] == "Tandoori Chicken (Extra Spicy)"
        assert data["is_favorite"] is True
        # Verify unpatched fields remain unchanged
        assert data["cuisine"] == "Indian"
        assert data["is_batch_prep"] is True
        
        # Nutrition resolution should NOT be called (no ingredient changes)
        assert not mock_resolve.called


@pytest.mark.asyncio
async def test_patch_recipe_with_ingredients_calls_nutrition(async_client):
    """Test PATCH with ingredient changes triggers nutrition resolution."""
    # Create a recipe
    recipe_data = _test_recipe_data()
    create_resp = await async_client.post("/api/recipes", json=recipe_data)
    created = create_resp.json()
    recipe_id = created["id"]

    # Patch ingredients
    with patch("app.routers.recipes.nutrition.resolve_recipe_nutrition", new_callable=AsyncMock) as mock_resolve:
        patch_data = {
            "ingredients": [
                {
                    "name": "Chicken thighs",
                    "quantity_1500": 400,
                    "quantity_1800": 500,
                    "unit": "g",
                    "usda_food_id": None,
                    "calories_per_100g": None,
                    "protein_per_100g": None,
                    "carbs_per_100g": None,
                    "fat_per_100g": None,
                    "nutrition_source": "usda"
                }
            ]
        }
        response = await async_client.patch(f"/api/recipes/{recipe_id}", json=patch_data)
        assert response.status_code == 200
        
        # Nutrition resolution should be called (ingredients changed)
        assert mock_resolve.called
        assert mock_resolve.call_count == 1


@pytest.mark.asyncio
async def test_patch_recipe_404(async_client):
    """Test PATCH /api/recipes/{id} returns 404 for non-existent ID."""
    patch_data = {"display_name": "New Name"}
    response = await async_client.patch("/api/recipes/nonexistent-id", json=patch_data)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_recipe_with_prep_session_id(async_client, test_db_session):
    """Test GET /api/recipes/{id} returns prep_session_id when recipe is in a prep session."""
    from app.db.models import Recipe, PrepSession
    from datetime import datetime
    
    # Create a recipe via API
    recipe_data = _test_recipe_data()
    create_resp = await async_client.post("/api/recipes", json=recipe_data)
    assert create_resp.status_code == 201
    created = create_resp.json()
    recipe_id = created["id"]
    
    # Create a PrepSession directly in the test DB with this recipe_id
    prep_session = PrepSession(
        plan_id="test_plan_123",  # Use plan_id not meal_plan_id
        day="sunday",
        recipe_ids=json.dumps([recipe_id]),
        steps_json=json.dumps([]),  # Use steps_json not steps
        status="active"
    )
    test_db_session.add(prep_session)
    test_db_session.commit()
    test_db_session.refresh(prep_session)
    
    # Fetch recipe by ID
    response = await async_client.get(f"/api/recipes/{recipe_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Verify prep_session_id is returned and matches
    assert "prep_session_id" in data
    assert data["prep_session_id"] == prep_session.id


@pytest.mark.asyncio
async def test_get_recipe_without_prep_session(async_client):
    """Test GET /api/recipes/{id} returns prep_session_id=None when no prep session contains recipe."""
    # Create a recipe
    recipe_data = _test_recipe_data()
    create_resp = await async_client.post("/api/recipes", json=recipe_data)
    assert create_resp.status_code == 201
    created = create_resp.json()
    recipe_id = created["id"]
    
    # Fetch recipe by ID (no prep session exists)
    response = await async_client.get(f"/api/recipes/{recipe_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Verify prep_session_id is None
    assert "prep_session_id" in data
    assert data["prep_session_id"] is None
