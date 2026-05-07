"""
Tests for nutrition resolution service.

Tests:
- test_resolve_ingredient_uses_usda_when_available (mock USDA hit)
- test_resolve_ingredient_falls_back_to_llm (mock USDA empty, mock LLM JSON response)
- test_aggregate_macros_sums_correctly
- test_resolve_recipe_nutrition_skips_already_resolved (idempotency)
"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.nutrition import (
    resolve_ingredient,
    aggregate_macros,
    resolve_recipe_nutrition,
    ResolvedIngredient,
)
from app.services.usda import Macros as USDAMacros, FoodHit
from app.schemas.recipe import Ingredient
from app.db.models import Recipe


# ---- Fixtures ----

@pytest.fixture
def sample_ingredient():
    """An ingredient that needs nutrition resolution."""
    return Ingredient(
        name="chicken breast",
        quantity_1500=200.0,
        quantity_1800=250.0,
        unit="g",
        usda_food_id=None,
        calories_per_100g=None,
        protein_per_100g=None,
        carbs_per_100g=None,
        fat_per_100g=None,
        nutrition_source="usda",
    )


@pytest.fixture
def resolved_ingredient():
    """An ingredient that already has USDA data."""
    return Ingredient(
        name="olive oil",
        quantity_1500=30.0,
        quantity_1800=40.0,
        unit="ml",
        usda_food_id=12345,
        calories_per_100g=884.0,
        protein_per_100g=0.0,
        carbs_per_100g=0.0,
        fat_per_100g=100.0,
        nutrition_source="usda",
    )


@pytest.fixture
def recipe_with_ingredients(sample_ingredient, resolved_ingredient):
    """A Recipe ORM object with mixed ingredients."""
    recipe = Recipe(
        id="test_recipe_1",
        display_name="Test Recipe",
        ingredients=[
            sample_ingredient.model_dump(),
            resolved_ingredient.model_dump(),
        ],
    )
    return recipe


# ---- Tests for resolve_ingredient ----

@pytest.mark.asyncio
async def test_resolve_ingredient_uses_usda_when_available():
    """Test that resolve_ingredient uses USDA when there's a match."""
    # Mock USDA search to return a hit
    mock_hit = FoodHit(
        food_id=67890,
        description="Chicken breast",
        macros_per_100g={
            "calories": 165.0,
            "protein_g": 31.0,
            "carbs_g": 0.0,
            "fat_g": 3.6,
        },
    )
    
    with patch("app.services.nutrition.search_food", AsyncMock(return_value=[mock_hit])):
        result = await resolve_ingredient("chicken breast")
    
    assert isinstance(result, ResolvedIngredient)
    assert result.name == "chicken breast"
    assert result.usda_food_id == 67890
    assert result.nutrition_source == "usda"
    assert result.macros_per_100g.calories == 165.0
    assert result.macros_per_100g.protein_g == 31.0
    assert result.macros_per_100g.carbs_g == 0.0
    assert result.macros_per_100g.fat_g == 3.6


@pytest.mark.asyncio
async def test_resolve_ingredient_falls_back_to_llm():
    """Test that resolve_ingredient falls back to LLM when USDA has no match."""
    # Mock USDA search to return empty
    with patch("app.services.nutrition.search_food", AsyncMock(return_value=[])):
        # Mock LLM response
        mock_llm_response = {
            "calories_per_100g": 200.0,
            "protein_per_100g": 10.0,
            "carbs_per_100g": 20.0,
            "fat_per_100g": 8.0,
        }
        
        mock_llm = AsyncMock()
        mock_llm.chat = AsyncMock(return_value=mock_llm_response)
        
        with patch("app.services.nutrition.get_llm", return_value=mock_llm):
            result = await resolve_ingredient("mystery ingredient")
    
    assert isinstance(result, ResolvedIngredient)
    assert result.name == "mystery ingredient"
    assert result.usda_food_id is None
    assert result.nutrition_source == "llm_estimate"
    assert result.macros_per_100g.calories == 200.0
    assert result.macros_per_100g.protein_g == 10.0


@pytest.mark.asyncio
async def test_resolve_ingredient_llm_failure_returns_zeros():
    """Test that resolve_ingredient handles LLM failure gracefully."""
    # Mock USDA search to return empty
    with patch("app.services.nutrition.search_food", AsyncMock(return_value=[])):
        # Mock LLM to raise exception
        mock_llm = AsyncMock()
        mock_llm.chat = AsyncMock(side_effect=Exception("LLM unavailable"))
        
        with patch("app.services.nutrition.get_llm", return_value=mock_llm):
            result = await resolve_ingredient("mystery ingredient")
    
    assert result.nutrition_source == "llm_estimate"
    assert result.macros_per_100g is None
    assert result.note is not None  # Should have failure note


# ---- Tests for aggregate_macros ----

def test_aggregate_macros_sums_correctly():
    """Test that aggregate_macros correctly sums macros across ingredients."""
    ingredients = [
        Ingredient(
            name="chicken",
            quantity_1500=200.0,
            quantity_1800=250.0,
            unit="g",
            calories_per_100g=165.0,
            protein_per_100g=31.0,
            carbs_per_100g=0.0,
            fat_per_100g=3.6,
            nutrition_source="usda",
        ),
        Ingredient(
            name="rice",
            quantity_1500=150.0,
            quantity_1800=200.0,
            unit="g",
            calories_per_100g=130.0,
            protein_per_100g=2.7,
            carbs_per_100g=28.0,
            fat_per_100g=0.3,
            nutrition_source="usda",
        ),
    ]
    
    # Aggregate using quantity_1500
    result = aggregate_macros(ingredients, "quantity_1500")
    
    # Expected:
    # chicken: (200/100) * (165 cal, 31p, 0c, 3.6f) = (330, 62, 0, 7.2)
    # rice: (150/100) * (130 cal, 2.7p, 28c, 0.3f) = (195, 4.05, 42, 0.45)
    # Total: (525, 66.05, 42, 7.65)
    
    assert abs(result.calories - 525.0) < 0.01
    assert abs(result.protein_g - 66.05) < 0.01
    assert abs(result.carbs_g - 42.0) < 0.01
    assert abs(result.fat_g - 7.65) < 0.01


def test_aggregate_macros_uses_1800_field():
    """Test that aggregate_macros uses the specified grams field."""
    ingredients = [
        Ingredient(
            name="chicken",
            quantity_1500=200.0,
            quantity_1800=300.0,
            unit="g",
            calories_per_100g=165.0,
            protein_per_100g=31.0,
            carbs_per_100g=0.0,
            fat_per_100g=3.6,
            nutrition_source="usda",
        ),
    ]
    
    # Using quantity_1500
    result_1500 = aggregate_macros(ingredients, "quantity_1500")
    assert abs(result_1500.calories - 330.0) < 0.01  # 200/100 * 165
    
    # Using quantity_1800
    result_1800 = aggregate_macros(ingredients, "quantity_1800")
    assert abs(result_1800.calories - 495.0) < 0.01  # 300/100 * 165


def test_aggregate_macros_skips_ingredients_without_nutrition():
    """Test that ingredients without nutrition data are skipped."""
    ingredients = [
        Ingredient(
            name="chicken",
            quantity_1500=200.0,
            quantity_1800=250.0,
            unit="g",
            calories_per_100g=165.0,
            protein_per_100g=31.0,
            carbs_per_100g=0.0,
            fat_per_100g=3.6,
            nutrition_source="usda",
        ),
        Ingredient(
            name="unknown",
            quantity_1500=100.0,
            quantity_1800=150.0,
            unit="g",
            calories_per_100g=None,  # No nutrition data
            protein_per_100g=None,
            carbs_per_100g=None,
            fat_per_100g=None,
            nutrition_source="usda",
        ),
    ]
    
    result = aggregate_macros(ingredients, "quantity_1500")
    
    # Only chicken should contribute: 200/100 * 165 = 330
    assert abs(result.calories - 330.0) < 0.01


# ---- Tests for resolve_recipe_nutrition ----

@pytest.mark.asyncio
async def test_resolve_recipe_nutrition_resolves_unresolved_ingredients():
    """Test that resolve_recipe_nutrition resolves ingredients missing nutrition data."""
    # Create a recipe with one unresolved ingredient (ingredients as JSON string)
    recipe = Recipe(
        id="test_recipe_2",
        display_name="Test Recipe",
        ingredients=json.dumps([
            {
                "name": "chicken breast",
                "quantity_1500": 200.0,
                "quantity_1800": 250.0,
                "unit": "g",
                "usda_food_id": None,
                "calories_per_100g": None,
                "protein_per_100g": None,
                "carbs_per_100g": None,
                "fat_per_100g": None,
                "nutrition_source": "usda",
            }
        ]),
    )
    
    # Mock resolve_ingredient
    mock_resolved = ResolvedIngredient(
        name="chicken breast",
        usda_food_id=67890,
        macros_per_100g=USDAMacros(calories=165.0, protein_g=31.0, carbs_g=0.0, fat_g=3.6),
        nutrition_source="usda",
    )
    
    with patch("app.services.nutrition.resolve_ingredient", AsyncMock(return_value=mock_resolved)):
        # Mock db session
        mock_db = MagicMock()
        
        await resolve_recipe_nutrition(recipe, mock_db)
    
    # Check that ingredient was updated (ingredients is now a JSON string)
    ing_data = json.loads(recipe.ingredients)[0]
    assert ing_data["usda_food_id"] == 67890
    assert ing_data["calories_per_100g"] == 165.0
    assert ing_data["nutrition_source"] == "usda"
    
    # Check that recipe totals were computed
    assert recipe.calories_per_serving is not None
    assert recipe.protein_g is not None
    
    # Verify db.add and db.commit were called
    mock_db.add.assert_called_once_with(recipe)
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_resolve_recipe_nutrition_skips_already_resolved():
    """Test idempotency: already-resolved ingredients are skipped."""
    # Create a recipe with already-resolved ingredients (as JSON string)
    recipe = Recipe(
        id="test_recipe_3",
        display_name="Test Recipe",
        ingredients=json.dumps([
            {
                "name": "olive oil",
                "quantity_1500": 30.0,
                "quantity_1800": 40.0,
                "unit": "ml",
                "usda_food_id": 12345,
                "calories_per_100g": 884.0,
                "protein_per_100g": 0.0,
                "carbs_per_100g": 0.0,
                "fat_per_100g": 100.0,
                "nutrition_source": "usda",
            }
        ]),
        calories_per_serving=265,  # 30/100 * 884
        protein_g=0.0,
        carbs_g=0.0,
        fat_g=30.0,  # 30/100 * 100
    )

    with patch("app.services.nutrition.resolve_ingredient", AsyncMock()) as mock_resolve:
        mock_db = MagicMock()
        
        await resolve_recipe_nutrition(recipe, mock_db)
    
    # resolve_ingredient should NOT have been called (ingredient already resolved)
    mock_resolve.assert_not_called()
    
    # Calories should still be computed (using the existing data)
    assert recipe.calories_per_serving is not None


@pytest.mark.asyncio
async def test_resolve_recipe_nutrition_computes_totals_correctly():
    """Test that resolve_recipe_nutrition computes correct macro totals."""
    recipe = Recipe(
        id="test_recipe_4",
        display_name="Two Ingredient Recipe",
        ingredients=json.dumps([
            {
                "name": "chicken",
                "quantity_1500": 200.0,
                "quantity_1800": 250.0,
                "unit": "g",
                "usda_food_id": None,
                "calories_per_100g": None,
                "protein_per_100g": None,
                "carbs_per_100g": None,
                "fat_per_100g": None,
                "nutrition_source": "usda",
            },
            {
                "name": "rice",
                "quantity_1500": 150.0,
                "quantity_1800": 200.0,
                "unit": "g",
                "usda_food_id": None,
                "calories_per_100g": None,
                "protein_per_100g": None,
                "carbs_per_100g": None,
                "fat_per_100g": None,
                "nutrition_source": "usda",
            },
        ]),
    )
    
    # Mock resolve_ingredient to return pre-defined values
    async def mock_resolve(name):
        if name == "chicken":
            return ResolvedIngredient(
                name="chicken",
                usda_food_id=111,
                macros_per_100g=USDAMacros(calories=165.0, protein_g=31.0, carbs_g=0.0, fat_g=3.6),
                nutrition_source="usda",
            )
        else:
            return ResolvedIngredient(
                name="rice",
                usda_food_id=222,
                macros_per_100g=USDAMacros(calories=130.0, protein_g=2.7, carbs_g=28.0, fat_g=0.3),
                nutrition_source="usda",
            )
    
    with patch("app.services.nutrition.resolve_ingredient", side_effect=mock_resolve):
        mock_db = MagicMock()
        await resolve_recipe_nutrition(recipe, mock_db)
    
    # Expected totals (using quantity_1500):
    # chicken: 200/100 * (165, 31, 0, 3.6) = (330, 62, 0, 7.2)
    # rice: 150/100 * (130, 2.7, 28, 0.3) = (195, 4.05, 42, 0.45)
    # Total: (525, 66.05, 42, 7.65)
    
    assert recipe.calories_per_serving == 525
    assert abs(recipe.protein_g - 66.05) < 0.01
    assert abs(recipe.carbs_g - 42.0) < 0.01
    assert abs(recipe.fat_g - 7.65) < 0.01
