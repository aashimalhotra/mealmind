from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator, List
import json

from app.schemas.chat import ChatRequest, ChatMessageResponse
from app.prompts.chat_copilot import build_chat_copilot_prompt
from app.db.session import get_db
from app.db.models import ChatHistory as ChatMessage, Household, MealPlan, User
from app.llm import stream_chat as stream_llm

router = APIRouter(tags=["chat"])

@router.post("/")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    # Get or create household (same pattern as profile.py)
    household = db.query(Household).first()
    if not household:
        household = Household(name="Home")
        db.add(household)
        db.commit()
        db.refresh(household)
    
    # Build context dict from request
    context = {}
    if request.screen:
        context["screen"] = request.screen
    if request.plan_id:
        context["plan_id"] = request.plan_id
    
    # Persist user message
    user_message = ChatMessage(
        role="user",
        content=request.message,
        household_id=household.id,
        context=json.dumps(context) if context else None
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Fetch household preferences
    household_prefs = {}
    if household:
        household_prefs = {
            "cuisine_preference": household.cuisine_pref,
            "prep_days": json.loads(household.prep_days) if household.prep_days else ["sunday", "wednesday"],
            "dineout_days": json.loads(household.dineout_days) if household.dineout_days else ["friday_dinner", "sunday_dinner"],
        }
        # Add household members
        members = db.query(User).filter(User.household_id == household.id).all()
        if members:
            household_prefs["members"] = [{"name": m.name, "calorie_target": m.calorie_target} for m in members]

    # Fetch current meal plan - use provided plan_id or get latest for household
    current_plan = None
    
    if request.plan_id:
        plan = db.query(MealPlan).filter(MealPlan.id == request.plan_id).first()
    else:
        # Auto-fetch latest meal plan for the household
        plan = db.query(MealPlan).filter(MealPlan.household_id == household.id).order_by(MealPlan.week_start.desc()).first()
        # Fallback: try any plan if none found for household (handles data migration cases)
        if not plan:
            plan = db.query(MealPlan).order_by(MealPlan.week_start.desc()).first()
    
    if plan:
        current_plan = {
            "id": plan.id,
            "name": "Meal Plan",
            "start_date": plan.week_start.isoformat() if plan.week_start else None,
            "end_date": (plan.week_start.replace(day=plan.week_start.day + 6)).isoformat() if plan.week_start else None,
            "status": plan.status,
            "meals": [],
        }
        
        # Parse plan_data to extract meals
        if plan.plan_data:
            try:
                plan_data = json.loads(plan.plan_data) if isinstance(plan.plan_data, str) else plan.plan_data
                current_plan["name"] = plan_data.get("week_of", "Meal Plan")
                
                # Extract meals from plan_data structure
                # Actual structure: { "monday": {"breakfast": {"display_name": "..."}, ...}, ...}
                for day_name, day_meals in plan_data.items():
                    if day_name == "week_of":  # Skip metadata
                        continue
                    if isinstance(day_meals, dict):
                        for meal_type, meal_info in day_meals.items():
                            if isinstance(meal_info, dict) and "display_name" in meal_info:
                                current_plan["meals"].append({
                                    "name": meal_info["display_name"],
                                    "type": meal_type,
                                })
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"Error parsing plan_data: {e}")
        
        # Also include grocery list summary if available
        if plan.grocery_list:
            try:
                grocery_data = json.loads(plan.grocery_list) if isinstance(plan.grocery_list, str) else plan.grocery_list
                current_plan["grocery_summary"] = {
                    "total_items": grocery_data.get("total_items", 0),
                    "week_of": grocery_data.get("week_of", ""),
                }
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"Error parsing grocery_list: {e}")
    
    # Fetch last 10 messages for context
    last_messages = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(10).all()
    last_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(last_messages)  # Chronological order (oldest first)
    ]
    
    # Build system prompt with context
    system_prompt = build_chat_copilot_prompt(
        current_plan=current_plan,
        screen_context=request.screen,
        household_prefs=household_prefs,
        last_messages=last_messages
    )
    
    # Prepare messages for LLM
    llm_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.message}
    ]
    
    # Stream LLM response and persist assistant message
    async def generate_sse():
        full_response = []
        try:
            async for token in stream_llm(llm_messages):
                full_response.append(token)
                yield f"data: {json.dumps({'delta': token})}\n\n"
            # Send done signal
            yield f"data: {json.dumps({'done': True})}\n\n"
        finally:
            # Persist assistant message
            assistant_message = ChatMessage(
                role="assistant",
                content="".join(full_response),
                household_id=household.id,
                context=json.dumps(context) if context else None
            )
            db.add(assistant_message)
            db.commit()
    
    return StreamingResponse(generate_sse(), media_type="text/event-stream")

@router.get("/history")
async def get_chat_history(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
) -> List[ChatMessageResponse]:
    messages = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    return [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.created_at.isoformat(),
            screen=json.loads(msg.context).get("screen") if msg.context else None,
            plan_id=json.loads(msg.context).get("plan_id") if msg.context else None
        )
        for msg in messages
    ]

@router.delete("/history")
async def clear_chat_history(
    db: Session = Depends(get_db)
):
    """Clear all chat history."""
    deleted_count = db.query(ChatMessage).delete()
    db.commit()
    return {"message": f"Deleted {deleted_count} messages"}
