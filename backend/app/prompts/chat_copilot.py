from typing import Optional, List, Dict, Any

def build_chat_copilot_prompt(
    current_plan: Optional[Dict[str, Any]] = None,
    screen_context: Optional[str] = None,
    household_prefs: Optional[Dict[str, Any]] = None,
    last_messages: Optional[List[Dict[str, str]]] = None
) -> str:
    context_parts = []
    
    if screen_context:
        context_parts.append(f"SCREEN CONTEXT: User is currently on the {screen_context} screen.")
    
    if household_prefs:
        prefs_str = "\n".join([f"- {k}: {v}" for k, v in household_prefs.items()])
        context_parts.append(f"HOUSEHOLD PREFERENCES:\n{prefs_str}")
    
    if current_plan:
        plan_str = f"Current meal plan (ID: {current_plan.get('id')}): {current_plan.get('name')}\n"
        plan_str += f"Dates: {current_plan.get('start_date')} to {current_plan.get('end_date')}\n"
        plan_str += "Meals:\n" + "\n".join([f"- {meal['name']} (type: {meal['type']})" for meal in current_plan.get('meals', [])])
        context_parts.append(f"CURRENT PLAN:\n{plan_str}")
    
    if last_messages:
        messages_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in last_messages])
        context_parts.append(f"LAST 10 MESSAGES:\n{messages_str}")
    
    context_str = "\n\n".join(context_parts) if context_parts else "No context available."
    
    system_prompt = f"""You are MealMind's AI chat copilot, assisting users with meal planning, recipe discovery, and managing household preferences.

CONTEXT:
{context_str}

INSTRUCTIONS:
1. Use the provided context to inform your responses. Reference the current plan, screen, or preferences when relevant.
2. When suggesting a recipe, embed the structured details as fenced JSON using the format:
   ‹‹‹recipe_suggestion {{"name": "Recipe Name", "ingredients": ["ingredient 1", ...], "steps": ["step 1", ...]}}›››
3. Keep responses concise and relevant to the user's current context.
4. If the user asks about something outside the provided context, do your best to assist but note if context is missing.
5. Function calling is deferred to Phase 3; do not attempt to invoke functions.
"""
    return system_prompt
