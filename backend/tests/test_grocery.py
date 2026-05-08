"""Tests for the grocery list service (backend/app/services/grocery.py)."""

import json
import hashlib
import pytest
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch

from app.db.models import Household, Recipe, MealPlan, User
from app.services.grocery import (
    generate_grocery_list,
    toggle_grocery_item,
    _generate_item_id,
    _get_plan_ingredients,
    _transform_to_frontend_format
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_household(test_db_session):
    """Create a test household with users."""
    household = Household(
        name="Test Household",
        prep_days='["sunday", "wednesday"]',
        dineout_days='["friday"]',
        cuisine_pref="indian-inspired"
    )
    test_db_session.add(household)
    test_db_session.commit()
    test_db_session.refresh(household)
    
    # Add users
    user1 = User(
        name="Person 1",
        calorie_target=1500,
        protein_pct=0.3,
        carbs_pct=0.3,
        fat_pct=0.4,
        household_id=household.id
    )
    user2 = User(
        name="Person 2",
        calorie_target=1800,
        protein_pct=0.25,
        carbs_pct=0.35,
        fat_pct=0.4,
        household_id=household.id
    )
    test_db_session.add_all([user1, user2])
    test_db_session.commit()
    
    return household


@pytest.fixture
def test_recipes(test_db_session):
    """Create test recipes with ingredients."""
    recipes = []
    recipe_data = [
        {
            "id": "recipe-001",
            "display_name": "Tandoori Chicken",
            "ingredients": [
                {"name": "chicken thigh", "quantity_1500": 300, "quantity_1800": 400, "unit": "g"},
                {"name": "yogurt", "quantity_1500": 100, "quantity_1800": 150, "unit": "g"},
            ]
        },
        {
            "id": "recipe-002",
            "display_name": "Cumin Rice",
            "ingredients": [
                {"name": "rice", "quantity_1500": 200, "quantity_1800": 250, "unit": "g"},
                {"name": "cumin seeds", "quantity_1500": 5, "quantity_1800": 7, "unit": "g"},
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
        test_db_session.add(recipe)
        recipes.append(recipe)
    
    test_db_session.commit()
    return recipes


@pytest.fixture
def test_meal_plan(test_db_session, test_household, test_recipes):
    """Create a test meal plan with recipes assigned."""
    from datetime import date
    
    plan_data = {
        "monday": {
            "breakfast": {"recipe_id": "recipe-001", "meal_type": "breakfast"},
            "lunch": {"recipe_id": "recipe-002", "meal_type": "lunch"},
        },
        "tuesday": {
            "breakfast": {"recipe_id": "recipe-002", "meal_type": "breakfast"},
        }
    }
    
    plan = MealPlan(
        household_id=test_household.id,
        week_start=date.today(),
        plan_data=json.dumps(plan_data),
        status="approved"
    )
    test_db_session.add(plan)
    test_db_session.commit()
    test_db_session.refresh(plan)
    return plan


@pytest.fixture
def llm_response_json():
    """Return a fake LLM response that matches the expected grocery JSON schema."""
    return {
        "items": [
            {
                "ingredient_name": "chicken thigh",
                "category": "Protein",
                "total_quantity": 300.0,
                "unit": "g",
                "recipes": [
                    {"recipe_id": "recipe-001", "recipe_name": "Tandoori Chicken", "prep_day": "sunday", "quantity_g": 300}
                ],
                "is_pantry_chip": False,
            },
            {
                "ingredient_name": "cumin seeds",
                "category": "Spices",
                "total_quantity": 5.0,
                "unit": "g",
                "recipes": [
                    {"recipe_id": "recipe-002", "recipe_name": "Cumin Rice", "prep_day": "sunday", "quantity_g": 5}
                ],
                "is_pantry_chip": True,
            }
        ]
    }


# ---------------------------------------------------------------------------
# Tests for _generate_item_id
# ---------------------------------------------------------------------------

class TestGenerateItemId:
    def test_generates_stable_id(self):
        """Same name + category should produce same ID."""
        id1 = _generate_item_id("Chicken Thigh", "Protein")
        id2 = _generate_item_id("chicken thigh", "protein")  # case/space difference
        assert id1 == id2

    def test_different_inputs_different_ids(self):
        id1 = _generate_item_id("Chicken", "Protein")
        id2 = _generate_item_id("Chicken", "Produce")
        assert id1 != id2


# ---------------------------------------------------------------------------
# Tests for _get_plan_ingredients
# ---------------------------------------------------------------------------

class TestGetPlanIngredients:
    def test_extracts_ingredients(self, test_db_session, test_meal_plan, test_recipes):
        """Should extract ingredients from plan recipes."""
        ingredients = _get_plan_ingredients(test_db_session, test_meal_plan)
        
        assert len(ingredients) > 0
        assert any(i["name"] == "chicken thigh" for i in ingredients)

    def test_aggregates_quantities(self, test_db_session, test_meal_plan, test_recipes):
        """Same ingredient in multiple meals should be summed (rice appears in recipe-002 used multiple times)."""
        # recipe-002 (Cumin Rice) is used in:
        # - monday lunch (from fixture)
        # - tuesday breakfast (from fixture)
        # - wednesday lunch (added below)
        # Rice quantity_1500 = 200g per recipe occurrence
        # Total: 200g x 3 = 600g
        plan_data = json.loads(test_meal_plan.plan_data)
        plan_data["wednesday"] = {"lunch": {"recipe_id": "recipe-002", "meal_type": "lunch"}}
        test_meal_plan.plan_data = json.dumps(plan_data)
        test_db_session.commit()
        
        ingredients = _get_plan_ingredients(test_db_session, test_meal_plan)
        rice = next(i for i in ingredients if i["name"] == "rice")
        
        # 200g x 3 occurrences = 600g for 1500 cal target
        assert rice["total_quantity"] == 600.0

    def test_returns_empty_for_no_recipes(self, test_db_session):
        """Should return empty list when plan has no recipe IDs."""
        from datetime import date
        plan_data = {"monday": {"breakfast": {"meal_type": "dine-out"}}}  # No recipe_id
        plan = MealPlan(
            household_id="test",
            week_start=date.today(),
            plan_data=json.dumps(plan_data),
            status="approved"
        )
        test_db_session.add(plan)
        test_db_session.commit()
        
        ingredients = _get_plan_ingredients(test_db_session, plan)
        assert ingredients == []


# ---------------------------------------------------------------------------
# Tests for _transform_to_frontend_format
# ---------------------------------------------------------------------------

class TestTransformToFrontendFormat:
    def test_transforms_items_correctly(self, test_meal_plan):
        """Should transform items to frontend format with categories and pantry_items."""
        items = [
            {
                "ingredient_name": "Chicken",
                "category": "Protein",
                "total_quantity": 500.0,
                "unit": "g",
                "is_pantry_chip": False,
                "recipes": [{"recipe_id": "r1", "recipe_name": "Chicken Curry", "prep_day": "sunday", "quantity_g": 500}]
            },
            {
                "ingredient_name": "Salt",
                "category": "Spices",
                "total_quantity": 10.0,
                "unit": "g",
                "is_pantry_chip": True,
                "recipes": [{"recipe_id": "r1", "recipe_name": "Chicken Curry", "prep_day": "sunday", "quantity_g": 10}]
            }
        ]
        
        result = _transform_to_frontend_format(items, test_meal_plan.id, test_meal_plan.week_start)
        
        assert "plan_id" in result
        assert "week_of" in result
        assert "total_items" in result
        assert "categories" in result
        assert "pantry_items" in result
        
        # Pantry item should be in pantry_items
        assert len(result["pantry_items"]) == 1
        assert result["pantry_items"][0]["name"] == "Salt"
        
        # Non-pantry item should be in categories
        assert len(result["categories"]) == 1
        assert result["categories"][0]["title"] == "Protein"
        assert len(result["categories"][0]["items"]) == 1
        assert result["categories"][0]["items"][0]["name"] == "Chicken"
        
        # total_items should count only non-pantry items
        assert result["total_items"] == 1

    def test_formats_quantity_correctly(self, test_meal_plan):
        """Should format quantity as string (e.g., '500g', '1.5kg')."""
        items = [
            {
                "ingredient_name": "Flour",
                "category": "Pantry",
                "total_quantity": 1500.0,
                "unit": "g",
                "is_pantry_chip": True,
                "recipes": []
            }
        ]
        
        result = _transform_to_frontend_format(items, test_meal_plan.id, test_meal_plan.week_start)
        pantry_item = result["pantry_items"][0]
        
        # 1500g should be formatted as 1.5kg
        assert "1.5" in pantry_item["quantity"] or "1500" in pantry_item["quantity"]

    def test_generates_ids(self, test_meal_plan):
        """Each item should have a stable id field."""
        items = [
            {
                "ingredient_name": "Chicken",
                "category": "Protein",
                "total_quantity": 500.0,
                "unit": "g",
                "is_pantry_chip": False,
                "recipes": []
            }
        ]
        
        result = _transform_to_frontend_format(items, test_meal_plan.id, test_meal_plan.week_start)
        
        item = result["categories"][0]["items"][0]
        assert "id" in item
        assert isinstance(item["id"], str)
        assert len(item["id"]) > 0


# ---------------------------------------------------------------------------
# Tests for generate_grocery_list
# ---------------------------------------------------------------------------

class TestGenerateGroceryList:
    @pytest.mark.asyncio
    async def test_generates_list_from_scratch(self, test_db_session, test_meal_plan, llm_response_json):
        """Should call LLM and persist grocery list when none exists."""
        with patch("app.services.grocery.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.chat.return_value = llm_response_json
            mock_get_llm.return_value = mock_llm

            result = await generate_grocery_list(test_db_session, test_meal_plan.id)

        # Check new format
        assert "plan_id" in result
        assert "week_of" in result
        assert "total_items" in result
        assert "categories" in result
        assert "pantry_items" in result
        
        # Should have items in categories or pantry_items
        total = sum(cat["count"] for cat in result["categories"]) + len(result["pantry_items"])
        assert total > 0
        
        # Should have persisted to plan
        test_db_session.refresh(test_meal_plan)
        assert test_meal_plan.grocery_list is not None

    @pytest.mark.asyncio
    async def test_returns_existing_list_when_present(self, test_db_session, test_meal_plan):
        """Should return existing grocery list without calling LLM."""
        existing_list = {
            "plan_id": test_meal_plan.id,
            "week_of": str(test_meal_plan.week_start),
            "total_items": 0,
            "categories": [],
            "pantry_items": []
        }
        test_meal_plan.grocery_list = json.dumps(existing_list)
        test_db_session.commit()

        with patch("app.services.grocery.get_llm") as mock_get_llm:
            result = await generate_grocery_list(test_db_session, test_meal_plan.id)

        assert result == existing_list
        mock_get_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_items_have_prep_day_attribution(self, test_db_session, test_meal_plan, llm_response_json):
        """Each item should list which recipes/prep-days it comes from."""
        with patch("app.services.grocery.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.chat.return_value = llm_response_json
            mock_get_llm.return_value = mock_llm

            result = await generate_grocery_list(test_db_session, test_meal_plan.id)

        # Find chicken item (non-pantry)
        chicken_item = None
        for cat in result["categories"]:
            for item in cat["items"]:
                if item["name"] == "chicken thigh":
                    chicken_item = item
                    break
            if chicken_item:
                break
        
        assert chicken_item is not None
        assert "subtitle" in chicken_item  # Contains recipe name

    @pytest.mark.asyncio
    async def test_pantry_chips_identified(self, test_db_session, test_meal_plan, llm_response_json):
        """Spices and staples should be marked is_pantry_chip=True."""
        with patch("app.services.grocery.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.chat.return_value = llm_response_json
            mock_get_llm.return_value = mock_llm

            result = await generate_grocery_list(test_db_session, test_meal_plan.id)

        # Find spice item (cumin seeds should have is_pantry_chip=True)
        spice_item = next((item for item in result["pantry_items"] if item["name"] == "cumin seeds"), None)
        assert spice_item is not None
        assert spice_item.get("is_pantry_chip") is True

    @pytest.mark.asyncio
    async def test_items_have_stable_ids(self, test_db_session, test_meal_plan, llm_response_json):
        """Each item should have a stable id field."""
        with patch("app.services.grocery.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.chat.return_value = llm_response_json
            mock_get_llm.return_value = mock_llm

            result = await generate_grocery_list(test_db_session, test_meal_plan.id)

        # Check all items have ids
        for cat in result["categories"]:
            for item in cat["items"]:
                assert "id" in item
                assert isinstance(item["id"], str)
                assert len(item["id"]) > 0
        
        for item in result["pantry_items"]:
            assert "id" in item
            assert isinstance(item["id"], str)
            assert len(item["id"]) > 0

    @pytest.mark.asyncio
    async def test_handles_llm_failure(self, test_db_session, test_meal_plan):
        """Should raise exception on LLM failure."""
        from fastapi import HTTPException
        from app.services.llm import LLMResponseError

        with patch("app.services.grocery.get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_llm.chat.side_effect = LLMResponseError("LLM failed")
            mock_get_llm.return_value = mock_llm

            with pytest.raises(HTTPException) as exc_info:
                await generate_grocery_list(test_db_session, test_meal_plan.id)

            assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# Tests for toggle_grocery_item
# ---------------------------------------------------------------------------

class TestToggleGroceryItem:
    @pytest.mark.asyncio
    async def test_toggles_checked_status_in_categories(self, test_db_session, test_meal_plan):
        """Should flip the checked status of an item in categories."""
        # First generate a grocery list
        item_id = _generate_item_id("chicken thigh", "Protein")
        grocery_list = {
            "plan_id": test_meal_plan.id,
            "week_of": str(test_meal_plan.week_start),
            "total_items": 1,
            "categories": [
                {
                    "title": "Protein",
                    "count": 1,
                    "color": "",
                    "items": [
                        {"id": item_id, "name": "chicken thigh", "subtitle": "Test", "quantity": "300g", "checked": False, "is_pantry_chip": False, "category": "Protein", "prep_day": "sunday"}
                    ]
                }
            ],
            "pantry_items": []
        }
        test_meal_plan.grocery_list = json.dumps(grocery_list)
        test_db_session.commit()

        result = await toggle_grocery_item(test_db_session, test_meal_plan.id, item_id)

        # Find the item
        toggled_item = None
        for cat in result["categories"]:
            for item in cat["items"]:
                if item["id"] == item_id:
                    toggled_item = item
                    break
            if toggled_item:
                break
        
        assert toggled_item is not None
        assert toggled_item["checked"] is True

    @pytest.mark.asyncio
    async def test_toggles_checked_status_in_pantry(self, test_db_session, test_meal_plan):
        """Should flip the checked status of an item in pantry_items."""
        item_id = _generate_item_id("cumin seeds", "Spices")
        grocery_list = {
            "plan_id": test_meal_plan.id,
            "week_of": str(test_meal_plan.week_start),
            "total_items": 0,
            "categories": [],
            "pantry_items": [
                {"id": item_id, "name": "cumin seeds", "subtitle": "Test", "quantity": "5g", "checked": False, "is_pantry_chip": True, "category": "Spices", "prep_day": None}
            ]
        }
        test_meal_plan.grocery_list = json.dumps(grocery_list)
        test_db_session.commit()

        result = await toggle_grocery_item(test_db_session, test_meal_plan.id, item_id)

        # Find the item in pantry_items
        toggled_item = next((item for item in result["pantry_items"] if item["id"] == item_id), None)
        assert toggled_item is not None
        assert toggled_item["checked"] is True

    @pytest.mark.asyncio
    async def test_toggle_back_and_forth(self, test_db_session, test_meal_plan):
        """Should toggle off after being toggled on."""
        item_id = _generate_item_id("chicken thigh", "Protein")
        grocery_list = {
            "plan_id": test_meal_plan.id,
            "week_of": str(test_meal_plan.week_start),
            "total_items": 1,
            "categories": [
                {
                    "title": "Protein",
                    "count": 1,
                    "color": "",
                    "items": [
                        {"id": item_id, "name": "chicken thigh", "subtitle": "Test", "quantity": "300g", "checked": True, "is_pantry_chip": False, "category": "Protein", "prep_day": "sunday"}
                    ]
                }
            ],
            "pantry_items": []
        }
        test_meal_plan.grocery_list = json.dumps(grocery_list)
        test_db_session.commit()

        result = await toggle_grocery_item(test_db_session, test_meal_plan.id, item_id)

        # Find the item
        toggled_item = None
        for cat in result["categories"]:
            for item in cat["items"]:
                if item["id"] == item_id:
                    toggled_item = item
                    break
            if toggled_item:
                break
        
        assert toggled_item is not None
        assert toggled_item["checked"] is False

    @pytest.mark.asyncio
    async def test_raises_404_for_missing_plan(self, test_db_session):
        """Should raise 404 if plan not found."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await toggle_grocery_item(test_db_session, "nonexistent", "item1")

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_raises_404_for_missing_grocery_list(self, test_db_session, test_meal_plan):
        """Should raise 404 if no grocery list exists."""
        from fastapi import HTTPException

        # Don't set grocery_list on the plan
        with pytest.raises(HTTPException) as exc_info:
            await toggle_grocery_item(test_db_session, test_meal_plan.id, "item1")

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_raises_404_for_missing_item(self, test_db_session, test_meal_plan):
        """Should raise 404 if item ID not found."""
        from fastapi import HTTPException

        grocery_list = {
            "plan_id": test_meal_plan.id,
            "week_of": str(test_meal_plan.week_start),
            "total_items": 1,
            "categories": [
                {
                    "title": "Protein",
                    "count": 1,
                    "color": "",
                    "items": [
                        {"id": "item1", "name": "chicken", "subtitle": "", "quantity": "300g", "checked": False, "is_pantry_chip": False, "category": "Protein", "prep_day": None}
                    ]
                }
            ],
            "pantry_items": []
        }
        test_meal_plan.grocery_list = json.dumps(grocery_list)
        test_db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            await toggle_grocery_item(test_db_session, test_meal_plan.id, "nonexistent-item")

        assert exc_info.value.status_code == 404
