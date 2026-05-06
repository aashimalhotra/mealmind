"""
Tests for prep sequence optimization service.

Tests:
- test_sequence_prep_parses_llm_response_correctly (mock LLM JSON response)
- test_sequence_prep_rejects_malformed_json (mock LLM invalid response)
- test_sequence_prep_handles_empty_recipes
- test_sequence_prep_handles_recipes_without_prep_steps
- test_sequence_prep_validates_step_schema
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.prep_sequencer import (
    sequence_prep,
    PrepStep,
    PrepSequenceResponse,
)
from app.db.models import Recipe


# ---- Fixtures ----

@pytest.fixture
def sample_recipes():
    """Two sample recipes with prep steps."""
    recipe1 = Recipe(
        id="recipe_1",
        display_name="Chicken Curry",
        prep_steps=["Marinate chicken", "Chop onions", "Chop tomatoes", "Cook curry"],
    )
    recipe2 = Recipe(
        id="recipe_2",
        display_name="Rice Pilaf",
        prep_steps=["Rinse rice", "Saute vegetables", "Add rice and water", "Simmer"],
    )
    return [recipe1, recipe2]


@pytest.fixture
def mock_llm_response_valid():
    """Valid LLM response with optimized sequence."""
    return {
        "steps": [
            {
                "index": 0,
                "recipe_id": "recipe_2",
                "title": "Start rice",
                "description": "Rinse rice, then add to pot with water and bring to boil",
                "active": False,
                "duration_min": 20,
                "depends_on_step": None,
            },
            {
                "index": 1,
                "recipe_id": "recipe_1",
                "title": "Marinate chicken",
                "description": "Mix chicken with spices and yogurt, let sit",
                "active": False,
                "duration_min": 30,
                "depends_on_step": None,
            },
            {
                "index": 2,
                "recipe_id": None,
                "title": "Chop all vegetables",
                "description": "Chop onions and tomatoes for curry, and vegetables for pilaf",
                "active": True,
                "duration_min": None,
                "depends_on_step": None,
            },
            {
                "index": 3,
                "recipe_id": "recipe_1",
                "title": "Cook curry",
                "description": "Heat oil, add onions, then tomatoes and marinated chicken",
                "active": True,
                "duration_min": None,
                "depends_on_step": 1,
            },
            {
                "index": 4,
                "recipe_id": "recipe_2",
                "title": "Saute vegetables",
                "description": "Saute vegetables while rice simmers",
                "active": True,
                "duration_min": None,
                "depends_on_step": 0,
            },
        ]
    }


# ---- Tests for sequence_prep ----

@pytest.mark.asyncio
async def test_sequence_prep_parses_llm_response_correctly(sample_recipes, mock_llm_response_valid):
    """Test that sequence_prep correctly parses valid LLM response."""
    mock_llm = AsyncMock()
    mock_llm.chat = AsyncMock(return_value=mock_llm_response_valid)
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        steps = await sequence_prep(sample_recipes)
    
    assert isinstance(steps, list)
    assert len(steps) == 5
    
    # Check that steps are PrepStep instances
    assert all(isinstance(step, PrepStep) for step in steps)
    
    # Check that steps are re-indexed sequentially
    assert steps[0].index == 0
    assert steps[1].index == 1
    assert steps[2].index == 2
    assert steps[3].index == 3
    assert steps[4].index == 4
    
    # Check step properties
    assert steps[0].recipe_id == "recipe_2"
    assert steps[0].active == False
    assert steps[0].duration_min == 20
    
    assert steps[2].recipe_id is None  # Shared step
    assert steps[2].active == True
    
    # Check depends_on_step
    assert steps[3].depends_on_step == 1
    assert steps[4].depends_on_step == 0


@pytest.mark.asyncio
async def test_sequence_prep_rejects_malformed_json(sample_recipes):
    """Test that sequence_prep raises error on malformed LLM response."""
    # Response missing required 'steps' field
    malformed_response = {
        "sequence": []  # Wrong field name
    }
    
    mock_llm = AsyncMock()
    mock_llm.chat = AsyncMock(return_value=malformed_response)
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        with pytest.raises(Exception) as exc_info:
            await sequence_prep(sample_recipes)
    
    # Should raise ValueError due to validation failure
    assert "validation error" in str(exc_info.value).lower() or "prep sequence" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_sequence_prep_rejects_invalid_step_data(sample_recipes):
    """Test that sequence_prep rejects response with invalid step data."""
    # Step missing required 'title' field
    invalid_response = {
        "steps": [
            {
                "index": 0,
                "recipe_id": "recipe_1",
                # Missing 'title'
                "description": "Some step",
                "active": True,
                "duration_min": None,
                "depends_on_step": None,
            }
        ]
    }
    
    mock_llm = AsyncMock()
    mock_llm.chat = AsyncMock(return_value=invalid_response)
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        with pytest.raises(Exception) as exc_info:
            await sequence_prep(sample_recipes)
    
    # Should raise ValueError due to validation failure
    assert "validation error" in str(exc_info.value).lower() or "prep sequence" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_sequence_prep_handles_empty_recipes():
    """Test that sequence_prep returns empty list for no recipes."""
    mock_llm = AsyncMock()
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        steps = await sequence_prep([])
    
    assert steps == []
    # LLM should not be called
    mock_llm.chat.assert_not_called()


@pytest.mark.asyncio
async def test_sequence_prep_handles_recipes_without_prep_steps():
    """Test that sequence_prep handles recipes with no prep steps."""
    recipe = Recipe(
        id="recipe_3",
        display_name="Simple Salad",
        prep_steps=None,  # No prep steps
    )
    
    mock_llm = AsyncMock()
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        steps = await sequence_prep([recipe])
    
    assert steps == []
    # LLM should not be called
    mock_llm.chat.assert_not_called()


@pytest.mark.asyncio
async def test_sequence_prep_handles_json_string_prep_steps():
    """Test that sequence_prep parses prep_steps from JSON string."""
    import json
    
    recipe = Recipe(
        id="recipe_4",
        display_name="Soup",
        prep_steps=json.dumps(["Chop vegetables", "Boil water", "Add ingredients"]),
    )
    
    mock_response = {
        "steps": [
            {
                "index": 0,
                "recipe_id": "recipe_4",
                "title": "Chop vegetables",
                "description": "Chop all vegetables for soup",
                "active": True,
                "duration_min": None,
                "depends_on_step": None,
            }
        ]
    }
    
    mock_llm = AsyncMock()
    mock_llm.chat = AsyncMock(return_value=mock_response)
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        steps = await sequence_prep([recipe])
    
    assert len(steps) == 1
    assert steps[0].recipe_id == "recipe_4"
    assert steps[0].title == "Chop vegetables"


@pytest.mark.asyncio
async def test_sequence_prep_calls_llm_with_json_mode(sample_recipes, mock_llm_response_valid):
    """Test that sequence_prep calls LLM with json_mode=True."""
    mock_llm = AsyncMock()
    mock_llm.chat = AsyncMock(return_value=mock_llm_response_valid)
    
    with patch("app.services.prep_sequencer.get_llm", return_value=mock_llm):
        await sequence_prep(sample_recipes)
    
    # Verify LLM was called with json_mode=True
    mock_llm.chat.assert_called_once()
    call_args = mock_llm.chat.call_args
    assert call_args.kwargs.get("json_mode") == True or call_args[1].get("json_mode") == True


# ---- Tests for PrepStep schema ----

def test_prep_step_validates_active_field():
    """Test that PrepStep correctly validates active field."""
    step_data = {
        "index": 0,
        "recipe_id": "test",
        "title": "Test step",
        "description": "Test description",
        "active": True,
        "duration_min": None,
        "depends_on_step": None,
    }
    
    step = PrepStep.model_validate(step_data)
    assert step.active == True
    
    # Test with active=False
    step_data["active"] = False
    step = PrepStep.model_validate(step_data)
    assert step.active == False


def test_prep_step_allows_null_recipe_id():
    """Test that PrepStep allows null recipe_id for shared steps."""
    step_data = {
        "index": 0,
        "recipe_id": None,
        "title": "Shared step",
        "description": "This step is shared across recipes",
        "active": True,
        "duration_min": None,
        "depends_on_step": None,
    }
    
    step = PrepStep.model_validate(step_data)
    assert step.recipe_id is None


def test_prep_sequence_response_validates_steps():
    """Test that PrepSequenceResponse validates the steps array."""
    response_data = {
        "steps": [
            {
                "index": 0,
                "recipe_id": "recipe_1",
                "title": "Step 1",
                "description": "First step",
                "active": True,
                "duration_min": None,
                "depends_on_step": None,
            }
        ]
    }
    
    response = PrepSequenceResponse.model_validate(response_data)
    assert len(response.steps) == 1
    assert isinstance(response.steps[0], PrepStep)
