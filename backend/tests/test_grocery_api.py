"""Tests for grocery list endpoints."""

import json
import hashlib
import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.db.models import Household, Recipe, MealPlan, User
from app.schemas.grocery import GroceryListResponse, GroceryCategory, GroceryItem


# Canned LLM response for grocery consolidation (new format expected from LLM)
CANNED_GROCERY_LLM_RESPONSE = {
    "items": [
        {
            "ingredient_name": "Rice",
            "category": "Pantry",
            "total_quantity": 700.0,
            "unit": "g",
            "is_pantry_chip": True,
            "recipes": [
                {"recipe_id": "recipe-001", "recipe_name": "Rice Bowl", "prep_day": "sunday", "quantity_g": 700}
            ]
        },
        {
            "ingredient_name": "Chicken Breast",
            "category": "Meat",
            "total_quantity": 1400.0,
            "unit": "g",
            "is_pantry_chip": False,
            "recipes": [
                {"recipe_id": "recipe-001", "recipe_name": "Rice Bowl", "prep_day": "sunday", "quantity_g": 1400}
            ]
        },
        {
            "ingredient_name": "Mixed Vegetables",
            "category": "Produce",
            "total_quantity": 1050.0,
            "unit": "g",
            "is_pantry_chip": False,
            "recipes": [
                {"recipe_id": "recipe-002", "recipe_name": "Vegetable Curry", "prep_day": "sunday", "quantity_g": 1050}
            ]
        }
    ]
}


def _create_test_household(db_session):
    """Create a test household with a user."""
    household = Household(
        name="Test Household",
        prep_days='["sunday", "wednesday"]',
        dineout_days='["friday_dinner", "sunday_dinner"]',
        cuisine_pref="indian-inspired"
    )
    db_session.add(household)
    db_session.commit()
    db_session.refresh(household)
    
    # Create a user with calorie target 1500 (so uses quantity_1500)
    user = User(
        name="Test User",
        calorie_target=1500,
        protein_pct=0.3,
        carbs_pct=0.3,
        fat_pct=0.4,
        household_id=household.id
    )
    db_session.add(user)
    db_session.commit()
    
    return household


def _create_test_recipes(db_session):
    """Create test recipes with ingredients."""
    recipes = []
    recipe_data = [
        {
            "id": "recipe-001",
            "display_name": "Rice Bowl",
            "ingredients": [
                {"name": "rice", "quantity_1500": 100, "quantity_1800": 120, "unit": "g"},
                {"name": "chicken", "quantity_1500": 200, "quantity_1800": 240, "unit": "g"}
            ]
        },
        {
            "id": "recipe-002",
            "display_name": "Vegetable Curry",
            "ingredients": [
                {"name": "rice", "quantity_1500": 300, "quantity_1800": 360, "unit": "g"},
                {"name": "vegetables", "quantity_1500": 150, "quantity_1800": 180, "unit": "g"}
            ]
        },
        {
            "id": "recipe-003",
            "display_name": "Chicken Stir Fry",
            "ingredients": [
                {"name": "chicken", "quantity_1500": 400, "quantity_1800": 480, "unit": "g"},
                {"name": "vegetables", "quantity_1500": 300, "quantity_1800": 360, "unit": "g"}
            ]
        }
    ]
    
    for data in recipe_data:
        recipe = Recipe(
            id=data["id"],
            display_name=data["display_name"],
            ingredients=json.dumps(data["ingredients"]),
            cuisine="indian",
            is_batch_prep=True
        )
        db_session.add(recipe)
        recipes.append(recipe)
    
    db_session.commit()
    return recipes


def _create_test_meal_plan(db_session, household_id, recipe_ids=None):
    """Create a test meal plan with sample plan_data."""
    if recipe_ids is None:
        recipe_ids = ["recipe-001", "recipe-002", "recipe-003"]
    
    # Create plan_data with each day using one of the recipes
    plan_data = {}
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day in enumerate(days):
        recipe_id = recipe_ids[i % len(recipe_ids)]
        plan_data[day] = {
            "breakfast": {"recipe_id": recipe_id, "meal_type": "day-of"},
            "lunch": {"recipe_id": recipe_id, "meal_type": "batch-sun"},
            "dinner": {"recipe_id": recipe_id, "meal_type": "batch-sun"}
        }
    
    meal_plan = MealPlan(
        household_id=household_id,
        week_start=date.today() - timedelta(days=date.today().weekday()),
        status="draft",
        plan_data=json.dumps(plan_data)
    )
    db_session.add(meal_plan)
    db_session.commit()
    db_session.refresh(meal_plan)
    return meal_plan


def _generate_item_id(ingredient_name: str, category: str) -> str:
    """Generate a stable item ID matching the service implementation."""
    raw = f"{ingredient_name.lower().strip()}{category.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


@pytest.fixture(autouse=True)
def mock_grocery_llm():
    """Mock LLM service for grocery consolidation."""
    mock_llm = MagicMock()
    mock_llm.chat = AsyncMock(return_value=CANNED_GROCERY_LLM_RESPONSE)
    
    with patch("app.services.grocery.get_llm", return_value=mock_llm):
        yield


@pytest.mark.asyncio
async def test_get_grocery_list_generates_on_demand(async_client, test_db_session):
    """Test GET /api/grocery/{plan_id} generates list if not exists."""
    # Setup test data
    household = _create_test_household(test_db_session)
    _create_test_recipes(test_db_session)
    meal_plan = _create_test_meal_plan(test_db_session, household.id)
    
    # Verify no grocery list exists yet
    assert meal_plan.grocery_list is None
    
    # Call GET endpoint
    response = await async_client.get(f"/api/grocery/{meal_plan.id}")
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    
    # Check new format
    assert "plan_id" in data
    assert "week_of" in data
    assert "total_items" in data
    assert "categories" in data
    assert "pantry_items" in data
    
    # Check that items are in categories or pantry_items
    total_items_in_categories = sum(cat["count"] for cat in data["categories"])
    assert total_items_in_categories + len(data["pantry_items"]) == 3  # Matches canned LLM response
    
    # Verify grocery list was persisted
    test_db_session.refresh(meal_plan)
    assert meal_plan.grocery_list is not None
    persisted_list = json.loads(meal_plan.grocery_list)
    assert "categories" in persisted_list
    assert "pantry_items" in persisted_list


@pytest.mark.asyncio
async def test_get_grocery_list_returns_existing(async_client, test_db_session):
    """Test GET /api/grocery/{plan_id} returns existing list without regenerating."""
    # Setup test data
    household = _create_test_household(test_db_session)
    _create_test_recipes(test_db_session)
    meal_plan = _create_test_meal_plan(test_db_session, household.id)
    
    # Pre-populate grocery list in new format
    existing_list = {
        "plan_id": meal_plan.id,
        "week_of": str(meal_plan.week_start),
        "total_items": 1,
        "categories": [
            {
                "title": "Pantry",
                "count": 1,
                "color": "",
                "items": [
                    {
                        "id": "existing-item-001",
                        "name": "Existing Item",
                        "subtitle": "Test",
                        "quantity": "100g",
                        "checked": False,
                        "is_pantry_chip": False,
                        "category": "Pantry",
                        "prep_day": "day-of"
                    }
                ]
            }
        ],
        "pantry_items": []
    }
    meal_plan.grocery_list = json.dumps(existing_list)
    test_db_session.commit()
    
    # Call GET endpoint
    response = await async_client.get(f"/api/grocery/{meal_plan.id}")
    
    # Verify response returns existing list
    assert response.status_code == 200
    data = response.json()
    assert data["plan_id"] == meal_plan.id
    assert len(data["categories"]) == 1
    assert data["categories"][0]["items"][0]["name"] == "Existing Item"


@pytest.mark.asyncio
async def test_regenerate_grocery_list(async_client, test_db_session):
    """Test POST /api/plans/{plan_id}/regenerate-grocery forces regeneration."""
    # Setup test data
    household = _create_test_household(test_db_session)
    _create_test_recipes(test_db_session)
    meal_plan = _create_test_meal_plan(test_db_session, household.id)
    
    # Pre-populate with old grocery list
    old_list = {
        "plan_id": meal_plan.id,
        "week_of": str(meal_plan.week_start),
        "total_items": 1,
        "categories": [],
        "pantry_items": [
            {
                "id": "old-item",
                "name": "Old",
                "subtitle": "",
                "quantity": "10g",
                "checked": False,
                "is_pantry_chip": True,
                "category": "Pantry",
                "prep_day": None
            }
        ]
    }
    meal_plan.grocery_list = json.dumps(old_list)
    test_db_session.commit()
    
    # Call regenerate endpoint
    response = await async_client.post(f"/api/plans/{meal_plan.id}/regenerate-grocery")
    
    # Verify new list was generated
    assert response.status_code == 200
    data = response.json()
    
    # Check new format
    assert "categories" in data
    assert "pantry_items" in data
    
    # Verify old item is gone (new list has 3 items from canned response)
    all_item_names = []
    for cat in data["categories"]:
        all_item_names.extend([item["name"] for item in cat["items"]])
    all_item_names.extend([item["name"] for item in data["pantry_items"]])
    assert "Old" not in all_item_names


@pytest.mark.asyncio
async def test_toggle_grocery_item_checked(async_client, test_db_session):
    """Test PATCH /api/grocery/{plan_id}/item/{item_id} toggles checked status."""
    # Setup test data
    household = _create_test_household(test_db_session)
    _create_test_recipes(test_db_session)
    meal_plan = _create_test_meal_plan(test_db_session, household.id)
    
    # Generate initial grocery list
    await async_client.get(f"/api/grocery/{meal_plan.id}")
    test_db_session.refresh(meal_plan)
    
    # Get an item ID from the generated list
    grocery_list = json.loads(meal_plan.grocery_list)
    
    # Find an item ID from categories or pantry_items
    item_id = None
    if grocery_list["categories"]:
        item_id = grocery_list["categories"][0]["items"][0]["id"]
    elif grocery_list["pantry_items"]:
        item_id = grocery_list["pantry_items"][0]["id"]
    
    assert item_id is not None
    
    # Find the item to check its initial state
    initial_checked = None
    for cat in grocery_list["categories"]:
        for item in cat["items"]:
            if item["id"] == item_id:
                initial_checked = item["checked"]
                break
    if initial_checked is None:
        for item in grocery_list["pantry_items"]:
            if item["id"] == item_id:
                initial_checked = item["checked"]
                break
    
    assert initial_checked is False
    
    # Toggle item (first toggle: should become True)
    response = await async_client.patch(f"/api/grocery/{meal_plan.id}/item/{item_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Find the item in response
    toggled_item = None
    for cat in data["categories"]:
        for item in cat["items"]:
            if item["id"] == item_id:
                toggled_item = item
                break
    if toggled_item is None:
        for item in data["pantry_items"]:
            if item["id"] == item_id:
                toggled_item = item
                break
    
    assert toggled_item is not None
    assert toggled_item["checked"] is True
    
    # Toggle again (should become False)
    response = await async_client.patch(f"/api/grocery/{meal_plan.id}/item/{item_id}")
    assert response.status_code == 200
    data = response.json()
    
    # Find the item again
    toggled_item = None
    for cat in data["categories"]:
        for item in cat["items"]:
            if item["id"] == item_id:
                toggled_item = item
                break
    if toggled_item is None:
        for item in data["pantry_items"]:
            if item["id"] == item_id:
                toggled_item = item
                break
    
    assert toggled_item["checked"] is False


@pytest.mark.asyncio
async def test_toggle_nonexistent_item_returns_404(async_client, test_db_session):
    """Test PATCH returns 404 for nonexistent item ID."""
    # Setup test data
    household = _create_test_household(test_db_session)
    _create_test_recipes(test_db_session)
    meal_plan = _create_test_meal_plan(test_db_session, household.id)
    
    # Generate initial grocery list
    await async_client.get(f"/api/grocery/{meal_plan.id}")
    
    # Try to toggle nonexistent item
    response = await async_client.patch(f"/api/grocery/{meal_plan.id}/item/nonexistent-id")
    assert response.status_code == 404
    assert "Grocery item not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_grocery_nonexistent_plan_returns_404(async_client):
    """Test GET /api/grocery/{plan_id} returns 404 for nonexistent plan."""
    response = await async_client.get("/api/grocery/nonexistent-plan-id")
    assert response.status_code == 404
    assert "Meal plan not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_regenerate_grocery_nonexistent_plan_returns_404(async_client):
    """Test POST /api/plans/{plan_id}/regenerate-grocery returns 404 for nonexistent plan."""
    response = await async_client.post("/api/plans/nonexistent-plan-id/regenerate-grocery")
    assert response.status_code == 404
    assert "Meal plan not found" in response.json()["detail"]
