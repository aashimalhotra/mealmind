"""
Tests for USDA FoodData Central service.

Uses pytest-httpx to mock USDA API responses.
"""

import pytest
import httpx
import re
from app.services import usda
from app.services.usda import FoodHit, Macros


# Sample USDA search response
SAMPLE_SEARCH_RESPONSE = {
    "foods": [
        {
            "fdcId": 171077,
            "description": "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw",
            "foodNutrients": [
                {"nutrientId": 1003, "nutrientName": "Protein", "value": 23.1},
                {"nutrientId": 1004, "nutrientName": "Total lipid (fat)", "value": 1.95},
                {"nutrientId": 1005, "nutrientName": "Carbohydrate, by difference", "value": 0.0},
                {"nutrientId": 1008, "nutrientName": "Energy", "value": 110.0},
            ],
        },
        {
            "fdcId": 171083,
            "description": "Chicken, broiler or fryers, thigh, meat only, raw",
            "foodNutrients": [
                {"nutrientId": 1003, "nutrientName": "Protein", "value": 19.6},
                {"nutrientId": 1004, "nutrientName": "Total lipid (fat)", "value": 8.8},
                {"nutrientId": 1005, "nutrientName": "Carbohydrate, by difference", "value": 0.0},
                {"nutrientId": 1008, "nutrientName": "Energy", "value": 148.0},
            ],
        },
    ]
}


# Sample USDA food detail response
SAMPLE_FOOD_DETAIL = {
    "fdcId": 171077,
    "description": "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw",
    "foodNutrients": [
        {"nutrient": {"id": 1003, "name": "Protein"}, "value": 23.1},
        {"nutrient": {"id": 1004, "name": "Total lipid (fat)"}, "value": 1.95},
        {"nutrient": {"id": 1005, "name": "Carbohydrate, by difference"}, "value": 0.0},
        {"nutrient": {"id": 1008, "name": "Energy"}, "value": 110.0},
    ],
}


@pytest.mark.asyncio
async def test_search_food_returns_top_hits(httpx_mock):
    """Test that search_food returns the correct number of hits with macros."""
    # Mock the search endpoint - match any URL starting with the search endpoint
    httpx_mock.add_response(
        url=re.compile(r"https://api\.nal\.usda\.gov/fdc/v1/foods/search.*"),
        json=SAMPLE_SEARCH_RESPONSE,
    )
    
    results = await usda.search_food("chicken breast", limit=2)
    
    assert len(results) == 2
    assert isinstance(results[0], FoodHit)
    assert results[0].food_id == 171077
    assert "Chicken" in results[0].description
    assert results[0].macros_per_100g["calories"] == 110.0
    assert results[0].macros_per_100g["protein_g"] == 23.1
    assert results[0].macros_per_100g["fat_g"] == 1.95
    assert results[0].macros_per_100g["carbs_g"] == 0.0


@pytest.mark.asyncio
async def test_search_food_handles_empty_results(httpx_mock):
    """Test that search_food handles empty results gracefully."""
    httpx_mock.add_response(
        url=re.compile(r"https://api\.nal\.usda\.gov/fdc/v1/foods/search.*"),
        json={"foods": []},
    )
    
    results = await usda.search_food("nonexistent_food_xyz", limit=5)
    
    assert results == []


@pytest.mark.asyncio
async def test_get_macros_extracts_nutrient_numbers(httpx_mock):
    """Test that get_macros correctly extracts nutrient values from food detail."""
    # Clear cache before test
    usda._macros_cache.clear()
    
    httpx_mock.add_response(
        url="https://api.nal.usda.gov/fdc/v1/food/171077",
        json=SAMPLE_FOOD_DETAIL,
    )
    
    macros = await usda.get_macros(171077)
    
    assert isinstance(macros, Macros)
    assert macros.calories == 110.0
    assert macros.protein_g == 23.1
    assert macros.fat_g == 1.95
    assert macros.carbs_g == 0.0


@pytest.mark.asyncio
async def test_get_macros_raises_on_404(httpx_mock):
    """Test that get_macros raises HTTPStatusError on 404."""
    # Clear cache before test
    usda._macros_cache.clear()
    
    httpx_mock.add_response(
        url="https://api.nal.usda.gov/fdc/v1/food/99999999",
        status_code=404,
    )
    
    with pytest.raises(httpx.HTTPStatusError):
        await usda.get_macros(99999999)


@pytest.mark.asyncio
async def test_get_macros_caches_results(httpx_mock):
    """Test that get_macros caches results (second call doesn't hit API)."""
    # Clear cache before test
    usda._macros_cache.clear()
    
    httpx_mock.add_response(
        url="https://api.nal.usda.gov/fdc/v1/food/171077",
        json=SAMPLE_FOOD_DETAIL,
    )
    
    # First call - should hit the API
    macros1 = await usda.get_macros(171077)
    
    # Second call - should use cache (no new mock response added)
    macros2 = await usda.get_macros(171077)
    
    assert macros1.calories == macros2.calories == 110.0
    # Verify only one HTTP call was made
    assert len(httpx_mock.get_requests()) == 1


@pytest.mark.asyncio
async def test_search_food_limits_results(httpx_mock):
    """Test that search_food respects the limit parameter."""
    # Create a response with more items than the limit
    many_foods = {
        "foods": [
            {
                "fdcId": i,
                "description": f"Food {i}",
                "foodNutrients": [
                    {"nutrientId": 1003, "value": 10.0},
                    {"nutrientId": 1004, "value": 5.0},
                    {"nutrientId": 1005, "value": 15.0},
                    {"nutrientId": 1008, "value": 120.0},
                ],
            }
            for i in range(10)
        ]
    }
    
    httpx_mock.add_response(
        url=re.compile(r"https://api\.nal\.usda\.gov/fdc/v1/foods/search.*"),
        json=many_foods,
    )
    
    results = await usda.search_food("food", limit=3)
    
    assert len(results) == 3
