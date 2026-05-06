"""Pydantic schemas for grocery list endpoints."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GroceryItem(BaseModel):
    """Individual item in a grocery list."""
    id: str = Field(..., description="Stable ID (hash of ingredient name + category)")
    ingredient_name: str = Field(..., description="Name of the ingredient")
    category: str = Field(..., description="Grocery category (e.g., Produce, Dairy)")
    total_quantity: float = Field(..., description="Total quantity needed")
    unit: str = Field(..., description="Unit of measurement")
    checked: bool = Field(default=False, description="Whether the item has been checked off")


class GroceryList(BaseModel):
    """Full grocery list for a meal plan."""
    items: List[GroceryItem] = Field(default_factory=list, description="List of grocery items")
    
    model_config = ConfigDict(from_attributes=True)
