import json
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import PrepSession, MealPlan, Recipe
from app.db.session import get_db
from app.schemas.prep import PrepStepSchema, PrepSessionResponse, StepUpdate
from app.services.prep_sequencer import sequence_prep

router = APIRouter(prefix="/api/prep", tags=["prep"])


@router.post("/from-plan/{plan_id}/{day}", response_model=PrepSessionResponse, status_code=201)
def create_prep_session(plan_id: str, day: str, db: Session = Depends(get_db)):
    """Create a new prep session from a meal plan's day."""
    # Fetch meal plan
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")

    # Parse plan data to get day's meals
    try:
        plan_data = json.loads(plan.plan_data) if plan.plan_data else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid meal plan data format")

    day_meals = plan_data.get(day, [])
    if not day_meals:
        raise HTTPException(status_code=400, detail=f"No meals scheduled for {day}")

    # Extract recipe IDs from day's meals
    recipe_ids = []
    for meal in day_meals:
        if isinstance(meal, str):
            recipe_ids.append(meal)
        elif isinstance(meal, dict):
            recipe_id = meal.get("recipe_id") or meal.get("id")
            if recipe_id:
                recipe_ids.append(recipe_id)

    if not recipe_ids:
        raise HTTPException(status_code=400, detail="No valid recipe IDs found for day")

    # Fetch recipes from DB
    recipes = db.query(Recipe).filter(Recipe.id.in_(recipe_ids)).all()
    if not recipes:
        raise HTTPException(status_code=400, detail="No valid recipes found in database")

    # Generate prep steps using sequencer
    try:
        steps = sequence_prep(recipes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sequence prep steps: {str(e)}")

    # Convert steps to dicts for JSON storage
    steps_dicts = []
    for step in steps:
        if isinstance(step, PrepStepSchema):
            step_dict = step.model_dump()
        else:
            step_dict = step
        steps_dicts.append(step_dict)

    # Create new prep session
    session_id = str(uuid.uuid4())
    db_session = PrepSession(
        id=session_id,
        plan_id=plan_id,
        day=day,
        status="in_progress",
        steps_json=json.dumps(steps_dicts),
        created_at=datetime.utcnow()
    )

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # Return response with parsed steps
    return PrepSessionResponse(
        id=db_session.id,
        plan_id=db_session.plan_id,
        day=db_session.day,
        status=db_session.status,
        steps=[PrepStepSchema(**step) for step in steps_dicts],
        created_at=db_session.created_at
    )


@router.get("/{session_id}", response_model=PrepSessionResponse)
def get_prep_session(session_id: str, db: Session = Depends(get_db)):
    """Get a prep session by ID."""
    session = db.query(PrepSession).filter(PrepSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Prep session not found")

    # Parse steps from JSON
    try:
        steps_data = json.loads(session.steps_json)
        steps = [PrepStepSchema(**step) for step in steps_data]
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid steps data stored")

    return PrepSessionResponse(
        id=session.id,
        plan_id=session.plan_id,
        day=session.day,
        status=session.status,
        steps=steps,
        created_at=session.created_at
    )


@router.patch("/{session_id}/step/{step_index}")
def update_step_status(
    session_id: str,
    step_index: int,
    update: StepUpdate,
    db: Session = Depends(get_db)
):
    """Update a step's completed status, mark session as completed if all steps done."""
    session = db.query(PrepSession).filter(PrepSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Prep session not found")

    # Parse steps
    try:
        steps_data = json.loads(session.steps_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid steps data stored")

    # Find and update target step
    step_found = False
    for step in steps_data:
        if step.get("index") == step_index:
            step["completed"] = update.completed
            step_found = True
            break

    if not step_found:
        raise HTTPException(status_code=404, detail=f"Step with index {step_index} not found")

    # Check if all steps are completed
    all_completed = all(step.get("completed", False) for step in steps_data)
    if all_completed:
        session.status = "completed"

    # Save updated steps
    session.steps_json = json.dumps(steps_data)
    db.commit()
    db.refresh(session)

    # Return updated session
    steps = [PrepStepSchema(**step) for step in steps_data]
    return PrepSessionResponse(
        id=session.id,
        plan_id=session.plan_id,
        day=session.day,
        status=session.status,
        steps=steps,
        created_at=session.created_at
    )
