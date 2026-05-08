"""
Grocery list endpoints.
"""

import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.grocery import generate_grocery_list, toggle_grocery_item
from app.schemas.grocery import GroceryListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/grocery", tags=["grocery"])


@router.get("/{plan_id}", response_model=GroceryListResponse)
async def get_grocery_list(
    plan_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the grocery list for a meal plan.
    
    If the grocery list doesn't exist, generates it on-the-fly and persists it.
    Returns data in the format expected by the frontend:
    {
        "plan_id": "...",
        "week_of": "...",
        "total_items": 0,
        "categories": [...],
        "pantry_items": [...]
    }
    """
    grocery_list = await generate_grocery_list(db, plan_id, force_regenerate=False)
    return grocery_list


@router.patch("/{plan_id}/item/{item_id}", response_model=GroceryListResponse)
async def toggle_grocery_item_checked(
    plan_id: str,
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Toggle the checked status of a grocery item.
    
    Item ID is a stable hash of ingredient_name + category.
    Searches through both categories and pantry_items.
    
    The request body can optionally contain a "checked" field to explicitly
    set the checked status. If not provided, the status is toggled.
    """
    # Read the request body (if any)
    checked = None
    try:
        body = await request.json()
        if "checked" in body:
            checked = body["checked"]
    except Exception:
        pass
    
    grocery_list = await toggle_grocery_item(db, plan_id, item_id, checked)
    return grocery_list
