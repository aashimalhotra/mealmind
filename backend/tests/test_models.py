"""Tests for Phase 1 SQLAlchemy models."""

import json
import datetime
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.models import User, Household, Recipe, MealPlan, PrepSession, ChatHistory


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory SQLite database for each test."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


def test_household_json_roundtrip(db_session):
    """Test (a): insert a Household with default prep_days JSON, read it back, verify JSON round-trips correctly."""
    # Create a household with JSON data
    prep_days = ["sunday", "wednesday", "friday"]
    dineout_days = ["friday_dinner"]
    
    household = Household(
        name="Test Household",
        prep_days=json.dumps(prep_days),
        dineout_days=json.dumps(dineout_days),
        cuisine_pref="indian-inspired",
    )
    db_session.add(household)
    db_session.commit()
    
    # Read it back
    retrieved = db_session.query(Household).first()
    
    # Verify JSON round-trips correctly
    assert retrieved is not None
    assert retrieved.name == "Test Household"
    assert json.loads(retrieved.prep_days) == prep_days
    assert json.loads(retrieved.dineout_days) == dineout_days
    assert retrieved.cuisine_pref == "indian-inspired"
    assert retrieved.id is not None  # Auto-generated ID


def test_recipe_ingredients_json(db_session):
    """Test (b): insert a Recipe with ingredients JSON array, read it back."""
    # Create ingredients JSON
    ingredients = [
        {"name": "chicken", "quantity_1500": 500, "quantity_1800": 600, "unit": "g", "usda_food_id": "12345", "calories_per_100g": 165, "protein_per_100g": 31, "carbs_per_100g": 0, "fat_per_100g": 3.6, "nutrition_source": "usda"},
        {"name": "rice", "quantity_1500": 300, "quantity_1800": 360, "unit": "g", "usda_food_id": "67890", "calories_per_100g": 130, "protein_per_100g": 2.7, "carbs_per_100g": 28, "fat_per_100g": 0.3, "nutrition_source": "usda"},
    ]
    
    recipe = Recipe(
        display_name="Tandoori Chicken",
        ingredients=json.dumps(ingredients),
        cuisine="indian",
        is_batch_prep=True,
    )
    db_session.add(recipe)
    db_session.commit()
    
    # Read it back
    retrieved = db_session.query(Recipe).first()
    
    # Verify
    assert retrieved is not None
    assert retrieved.display_name == "Tandoori Chicken"
    assert json.loads(retrieved.ingredients) == ingredients
    assert retrieved.cuisine == "indian"
    assert retrieved.is_batch_prep is True


def test_foreign_key_relationship(db_session):
    """Test (c): FK works — create Household, create MealPlan with that household_id, verify relationship."""
    # Create a household first
    household = Household(
        name="Test Household",
        cuisine_pref="indian-inspired",
    )
    db_session.add(household)
    db_session.commit()
    
    # Verify household has an ID
    assert household.id is not None
    
    # Create a meal plan linked to the household
    import datetime
    meal_plan = MealPlan(
        household_id=household.id,
        week_start=datetime.date(2026, 5, 5),
        plan_data=json.dumps({"monday": {"breakfast": {"recipe_id": "test123"}}}),
        status="draft",
    )
    db_session.add(meal_plan)
    db_session.commit()
    
    # Verify the relationship works
    retrieved_household = db_session.query(Household).first()
    assert retrieved_household is not None
    
    # Check that the meal plan is associated with the household
    meal_plans = db_session.query(MealPlan).filter_by(household_id=household.id).all()
    assert len(meal_plans) == 1
    assert meal_plans[0].household_id == household.id
    assert meal_plans[0].status == "draft"
    
    # Test the relationship via the model
    assert meal_plan.household.id == household.id
    assert meal_plan.household.name == "Test Household"


def test_user_creation(db_session):
    """Test User model creation."""
    user = User(
        name="John Doe",
        calorie_target=2000,
        protein_pct=0.30,
        carbs_pct=0.30,
        fat_pct=0.40,
        veggie_target=5,
    )
    db_session.add(user)
    db_session.commit()
    
    retrieved = db_session.query(User).first()
    assert retrieved is not None
    assert retrieved.name == "John Doe"
    assert retrieved.calorie_target == 2000
    assert retrieved.protein_pct == 0.30


def test_prep_session_creation(db_session):
    """Test PrepSession model creation with foreign keys."""
    # Create required parent records
    household = Household(name="Test Household")
    db_session.add(household)
    db_session.commit()
    
    meal_plan = MealPlan(
        household_id=household.id,
        week_start=datetime.date.today(),
        plan_data=json.dumps({}),
    )
    db_session.add(meal_plan)
    db_session.commit()
    
    # Create prep session
    prep_session = PrepSession(
        meal_plan_id=meal_plan.id,
        household_id=household.id,
        day="sunday",
        recipe_ids=json.dumps(["recipe1", "recipe2"]),
        steps=json.dumps([{"step": 1, "description": "Marinate chicken"}]),
        status="pending",
    )
    db_session.add(prep_session)
    db_session.commit()
    
    retrieved = db_session.query(PrepSession).first()
    assert retrieved is not None
    assert retrieved.day == "sunday"
    assert json.loads(retrieved.recipe_ids) == ["recipe1", "recipe2"]
    assert retrieved.meal_plan_id == meal_plan.id
    assert retrieved.household_id == household.id


def test_chat_history_creation(db_session):
    """Test ChatHistory model creation."""
    # Create required parent records
    household = Household(name="Test Household")
    db_session.add(household)
    db_session.commit()
    
    chat_entry = ChatHistory(
        household_id=household.id,
        role="user",
        content="What's for dinner?",
        context=json.dumps({"screen": "dashboard"}),
    )
    db_session.add(chat_entry)
    db_session.commit()
    
    retrieved = db_session.query(ChatHistory).first()
    assert retrieved is not None
    assert retrieved.role == "user"
    assert retrieved.content == "What's for dinner?"
    assert json.loads(retrieved.context) == {"screen": "dashboard"}
    assert retrieved.household_id == household.id
