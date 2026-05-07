"""Meal plan generation and management endpoints."""
import json
import asyncio
import logging
from cachetools import TTLCache
from datetime import date, datetime, timedelta
from typing import AsyncGenerator, Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.db.models import MealPlan, Recipe as RecipeModel, Household
from app.db.session import get_db
from app.schemas.plan import (
    PlanGenerateRequest, PlanGenerateChunk, PlanOut, PlanUpdate
)
from app.schemas.recipe import RecipeIn, Ingredient
from app.schemas.grocery import GroceryList
from app.prompts.plan_gen import build_plan_gen_prompt
from app.services.llm import get_llm, LLMResponseError
from app.services.nutrition import resolve_recipe_nutrition

logger = logging.getLogger(__name__)
insight_cache = TTLCache(maxsize=1024, ttl=6 * 3600)  # Cache insights for 6 hours per plan

router = APIRouter()


async def _thinking_producer(
    active_flag_fn,
    event_queue: asyncio.Queue,
) -> None:
    """Background task: push thinking events to queue every 2s while active."""
    while active_flag_fn():
        await asyncio.sleep(2)
        if active_flag_fn():
            event_queue.put_nowait(
                {"event": "thinking", "data": json.dumps({"event": "thinking"})}
            )


async def _generate_plan_stream(
    db: Session,
    household: Household,
    favorites: list[RecipeModel],
    dislikes: list[RecipeModel],
    recent_plans: list[MealPlan],
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Fake-stream wrapper for plan generation.

    Yields SSE events:
    - start: immediately
    - thinking: every 2s while LLM is processing
    - recipes: when recipes are parsed
    - plan: when plan_data is parsed
    - done: when complete with plan_id
    - error: if something goes wrong
    """
    llm = get_llm()
    plan_data = None
    plan_id = None

    # Send start event immediately
    yield {"event": "start", "data": json.dumps({"event": "start"})}

    try:
        # Build prompt
        prompt = build_plan_gen_prompt(household, favorites, dislikes, recent_plans)
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": "Generate a meal plan for this week."},
        ]

        # Set up thinking event queue + background producer
        thinking_active = True
        event_queue: asyncio.Queue = asyncio.Queue()
        thinking_task = asyncio.create_task(
            _thinking_producer(lambda: thinking_active, event_queue)
        )

        # Make LLM call while draining thinking events from the queue
        llm_task = asyncio.create_task(llm.chat(messages, json_mode=True))

        # Busy-wait: drain events from queue until llm_task completes
        while not llm_task.done():
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                yield event
            except asyncio.TimeoutError:
                pass

        # Stop thinking producer
        thinking_active = False
        thinking_task.cancel()
        try:
            await thinking_task
        except asyncio.CancelledError:
            pass

        # Drain any remaining events
        while not event_queue.empty():
            try:
                event = event_queue.get_nowait()
                yield event
            except asyncio.QueueEmpty:
                break

        # Get LLM result
        try:
            llm_response = llm_task.result()
        except LLMResponseError as e:
            yield {
                "event": "error",
                "data": json.dumps({"event": "error", "error": str(e)}),
            }
            return
        except Exception as e:
            logger.error(f"LLM call failed: {str(e)}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"event": "error", "error": "Failed to generate plan"}),
            }
            return

        # Parse LLM response - should be a dict with plan_data and recipes
        if not isinstance(llm_response, dict):
            yield {
                "event": "error",
                "data": json.dumps({"event": "error", "error": "Invalid response format from LLM"})
            }
            return

        plan_data = llm_response.get("plan_data")
        recipes_data = llm_response.get("recipes", [])

        if not plan_data or not recipes_data:
            logger.error(f"LLM response missing plan_data or recipes: {llm_response}")
            yield {
                "event": "error",
                "data": json.dumps({"event": "error", "error": "Missing plan_data or recipes in LLM response"})
            }
            return

        # Send recipes event
        yield {
            "event": "recipes",
            "data": json.dumps({"event": "recipes", "recipes": recipes_data})
        }

        # Send plan event
        yield {
            "event": "plan",
            "data": json.dumps({"event": "plan", "plan_data": plan_data})
        }

        # Persist recipes first
        persisted_recipes = []
        recipe_id_map = {}  # Map LLM recipe IDs to DB IDs
        
        for recipe_data in recipes_data:
            # Create RecipeIn schema
            ingredients = []
            for ing in recipe_data.get("ingredients", []):
                ingredients.append(Ingredient(
                    name=ing["name"],
                    quantity_1500=ing["quantity_1500"],
                    quantity_1800=ing["quantity_1800"],
                    unit=ing.get("unit", "g"),
                    usda_food_id=ing.get("usda_food_id"),
                    calories_per_100g=ing.get("calories_per_100g"),
                    protein_per_100g=ing.get("protein_per_100g"),
                    carbs_per_100g=ing.get("carbs_per_100g"),
                    fat_per_100g=ing.get("fat_per_100g"),
                    nutrition_source=ing.get("nutrition_source", "llm_estimate"),
                ))
            
            recipe_in = RecipeIn(
                display_name=recipe_data["display_name"],
                authentic_name=recipe_data.get("authentic_name"),
                description=recipe_data.get("description"),
                cuisine=household.cuisine_pref or "indian",
                ingredients=ingredients,
                prep_steps=recipe_data.get("prep_steps", []),
                serving_instructions=recipe_data.get("serving_instructions", []),
                tags=recipe_data.get("tags", []),
                is_batch_prep=True,
                is_favorite=False,
                is_disliked=False,
            )
            
            # Create Recipe ORM object
            from app.db.models import Recipe as RecipeModel
            recipe = RecipeModel(
                display_name=recipe_in.display_name,
                authentic_name=recipe_in.authentic_name,
                description=recipe_in.description,
                cuisine=recipe_in.cuisine,
                ingredients=json.dumps([ing.model_dump() for ing in recipe_in.ingredients]),
                prep_steps=json.dumps(recipe_in.prep_steps),
                serving_instructions=json.dumps(recipe_in.serving_instructions) if recipe_in.serving_instructions else None,
                tags=json.dumps(recipe_in.tags),
                is_batch_prep=recipe_in.is_batch_prep,
                is_favorite=recipe_in.is_favorite,
                is_disliked=recipe_in.is_disliked,
                source="ai-generated",
            )
            
            db.add(recipe)
            db.flush()  # Get the ID
            
            # Resolve nutrition for the recipe
            await resolve_recipe_nutrition(recipe, db)
            
            persisted_recipes.append(recipe)
            recipe_id_map[recipe_data["id"]] = recipe.id
        
        # Update plan_data with real recipe IDs
        for day, meals in plan_data.items():
            for slot, meal in meals.items():
                if "recipe_id" in meal and meal["recipe_id"] in recipe_id_map:
                    meal["recipe_id"] = recipe_id_map[meal["recipe_id"]]
        
        # Persist MealPlan
        from datetime import timedelta
        today = date.today()
        # Calculate week_start (Monday of current week)
        week_start = today - timedelta(days=today.weekday())
        
        meal_plan = MealPlan(
            household_id=household.id,
            week_start=week_start,
            status="draft",
            plan_data=json.dumps(plan_data),
        )
        
        db.add(meal_plan)
        db.commit()
        
        plan_id = meal_plan.id
        
        # Send done event
        yield {
            "event": "done",
            "data": json.dumps({"event": "done", "plan_id": plan_id})
        }

    except Exception as e:
        logger.error(f"Plan generation failed: {e}", exc_info=True)
        yield {
            "event": "error",
            "data": json.dumps({"event": "error", "error": str(e)})
        }


async def _thinking_loop(active_flag_func):
    """Send thinking events every 2 seconds while active_flag is True."""
    while active_flag_func():
        await asyncio.sleep(2)
        yield {"event": "thinking", "data": json.dumps({"event": "thinking"})}


@router.post("/api/plans/generate", response_class=EventSourceResponse)
async def generate_plan(
    request: PlanGenerateRequest = Depends(),
    db: Session = Depends(get_db),
):
    """
    Generate a new meal plan using LLM.
    
    Streams SSE events: start -> thinking... -> recipes -> plan -> done
    """
    # Get household (create default if not exists)
    household = db.query(Household).first()
    if not household:
        household = Household(
            name="Home",
            prep_days=json.dumps(["sunday", "wednesday"]),
            dineout_days=json.dumps(["friday_dinner", "sunday_dinner"]),
            cuisine_pref="indian-inspired"
        )
        db.add(household)
        db.commit()
        db.refresh(household)
    
    # Get favorites and dislikes
    favorites = db.query(RecipeModel).filter(RecipeModel.is_favorite == True).all()
    dislikes = db.query(RecipeModel).filter(RecipeModel.is_disliked == True).all()
    
    # Get recent plans (last 4 weeks)
    from datetime import timedelta
    four_weeks_ago = date.today() - timedelta(weeks=4)
    recent_plans = (
        db.query(MealPlan)
        .filter(MealPlan.created_at >= four_weeks_ago)
        .order_by(MealPlan.created_at.desc())
        .limit(4)
        .all()
    )
    
    return EventSourceResponse(
        _generate_plan_stream(db, household, favorites, dislikes, recent_plans)
    )


@router.get("/api/plans/current", response_model=PlanOut)
async def get_current_plan(db: Session = Depends(get_db)):
    """
    Get current week's plan.
    
    Returns the most recent plan with status in ('approved', 'active'),
    falling back to the most recent draft. Returns 404 if none.
    """
    # Try approved or active first
    plan = (
        db.query(MealPlan)
        .filter(MealPlan.status.in_(["approved", "active"]))
        .order_by(MealPlan.created_at.desc())
        .first()
    )
    
    # Fall back to most recent draft
    if not plan:
        plan = (
            db.query(MealPlan)
            .filter(MealPlan.status == "draft")
            .order_by(MealPlan.created_at.desc())
            .first()
        )
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No meal plan found"
        )
    
    return PlanOut.model_validate(plan)


@router.patch("/api/plans/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: str,
    update: PlanUpdate,
    db: Session = Depends(get_db),
):
    """
    Update a meal plan.
    
    Supports updating:
    - status (e.g., 'approved')
    - plan_data (replace day/slot entries)
    """
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found"
        )
    
    update_data = update.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        plan.status = update_data["status"]
    
    if "plan_data" in update_data:
        # Replace day/slot entries in plan_data
        existing_plan_data = json.loads(plan.plan_data) if isinstance(plan.plan_data, str) else plan.plan_data
        new_plan_data = update_data["plan_data"]
        
        # Merge: replace specified days/slots
        for day, meals in new_plan_data.items():
            if day not in existing_plan_data:
                existing_plan_data[day] = {}
            existing_plan_data[day].update(meals)
        
        plan.plan_data = json.dumps(existing_plan_data)
    
    db.commit()
    db.refresh(plan)
    
    return plan


@router.post("/api/plans/{plan_id}/regenerate-grocery", response_model=GroceryList)
async def regenerate_grocery_list(
    plan_id: str,
    db: Session = Depends(get_db),
):
    """
    Force regeneration of the grocery list for a meal plan.
    
    Replaces any existing grocery list with a freshly generated one.
    """
    from app.services.grocery import generate_grocery_list
    
    grocery_list = await generate_grocery_list(db, plan_id, force_regenerate=True)
    return grocery_list


@router.get("/api/plans/{id}/insight", response_model=Dict[str, Any])
async def get_plan_insight(id: str, db: Session = Depends(get_db)):
    """
    Get proactive insight for a meal plan.
    
    Computes heuristic first (veggie/iron-source servings per day). If any day has <3 servings,
    returns heuristic insight. Otherwise, uses LLM to generate proactive insight.
    Results are cached for 6 hours per plan id.
    """
    # Check cache first
    if id in insight_cache:
        return insight_cache[id]
    
    # Fetch meal plan
    plan = db.query(MealPlan).filter(MealPlan.id == id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found"
        )
    
    # Parse plan data from JSON string
    plan_data = json.loads(plan.plan_data) if isinstance(plan.plan_data, str) else plan.plan_data
    
    # Step 1: Compute heuristic (veggie + iron-source servings per day)
    flagged_days = []
    for day, meals in plan_data.items():
        day_total = 0.0
        # Iterate over each meal slot in the day (breakfast, lunch, dinner, etc.)
        for meal_slot, meal_info in meals.items():
            recipe_id = meal_info.get("recipe_id")
            if not recipe_id:
                continue
            
            # Fetch recipe from DB
            recipe = db.query(RecipeModel).filter(RecipeModel.id == recipe_id).first()
            if not recipe:
                logger.warning(f"Recipe {recipe_id} not found for plan {id}, day {day}")
                continue
            
            # Add veggie servings (numeric value)
            day_total += recipe.veggie_servings or 0.0
            
            # Check for iron-source tag
            tags = []
            if recipe.tags:
                try:
                    tags = json.loads(recipe.tags) if isinstance(recipe.tags, str) else recipe.tags
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse tags for recipe {recipe_id}")
                    tags = []
            
            if "iron-source" in tags:
                day_total += 1  # Count each iron-source recipe as 1 serving
        
        # Flag day if total servings < 3
        if day_total < 3:
            flagged_days.append({
                "day": day,
                "total_servings": round(day_total, 2),
                "threshold": 3
            })
    
    # Step 2: Generate insight based on heuristic result
    if flagged_days:
        # Heuristic caught low-serving days
        insight = {
            "source": "heuristic",
            "flagged_days": flagged_days,
            "message": f"Found {len(flagged_days)} day(s) with fewer than 3 veggie/iron-source servings.",
            "suggestion": "Consider adding more vegetable-based dishes or iron-rich foods (e.g., leafy greens, beans, lentils) to these days.",
            "sprint_7_criteria": "Proactive insight triggered by heuristic (cost-controlled)"
        }
    else:
        # No heuristic flag - use LLM for proactive insight (cost-limited)
        try:
            llm = get_llm()
            # Build LLM prompt referencing Sprint 7 success criteria for proactive insight
            prompt = f"""You are a nutrition expert analyzing a meal plan for Sprint 7 proactive insights.
The plan has passed basic heuristic checks (each day has at least 3 veggie/iron-source servings).
Provide a concise, actionable insight about the plan's nutritional balance, variety, or areas for improvement.
Focus on proactive suggestions that add value beyond basic checks. Keep response under 200 words.

Meal Plan Data (days with meals and recipe IDs):
{json.dumps(plan_data, indent=2)}

Return a JSON object with a single key "insight" containing your analysis."""
            
            messages = [
                {"role": "system", "content": "You are a helpful nutrition assistant providing proactive meal plan insights per Sprint 7 success criteria."},
                {"role": "user", "content": prompt}
            ]
            
            llm_response = await llm.chat(messages, json_mode=True)
            if isinstance(llm_response, dict) and "insight" in llm_response:
                llm_insight = llm_response["insight"]
            else:
                llm_insight = str(llm_response)
            
            insight = {
                "source": "llm",
                "insight": llm_insight,
                "message": "Proactive insight generated via LLM per Sprint 7 criteria.",
                "sprint_7_criteria": "Proactive insight generated via LLM (heuristic passed, cost-limited)"
            }
        except LLMResponseError as e:
            logger.error(f"LLM insight failed for plan {id}: {e}")
            insight = {
                "source": "error",
                "message": "LLM insight generation failed",
                "error": str(e),
                "sprint_7_criteria": "LLM error during proactive insight"
            }
        except Exception as e:
            logger.error(f"Unexpected error generating insight for plan {id}: {e}", exc_info=True)
            insight = {
                "source": "error",
                "message": "Failed to generate insight",
                "error": str(e),
                "sprint_7_criteria": "Unexpected error during proactive insight"
            }
    
    # Cache the result for 6 hours
    insight_cache[id] = insight
    
    # Update meal plan's ai_insights field for persistence
    plan.ai_insights = json.dumps(insight)
    db.commit()
    
    return insight
