"""Grocery list endpoints."""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.grocery import generate_grocery_list, toggle_grocery_item
from app.schemas.grocery import GroceryList

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/grocery", tags=["grocery"])


@router.get("/{plan_id}", response_model=GroceryList)
async def get_grocery_list(
    plan_id: str,
    db: Session = Depends(get_db),
):
    """
    Get the grocery list for a meal plan.
    
    If the grocery list doesn't exist, generates it on-the-fly and persists it.
    """
    grocery_list = await generate_grocery_list(db, plan_id, force_regenerate=False)
    return grocery_list


@router.patch("/{plan_id}/item/{item_id}", response_model=GroceryList)
async def toggle_grocery_item_checked(
    plan_id: str,
    item_id: str,
    db: Session = Depends(get_db),
):
    """
    Toggle the checked status of a grocery item.
    
    Item ID is a stable hash of ingredient_name + category.
    """
    grocery_list = await toggle_grocery_item(db, plan_id, item_id)
    return grocery_list
