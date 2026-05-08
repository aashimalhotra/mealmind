"""Pydantic schemas for grocery list endpoints."""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GroceryItem(BaseModel):
    """Individual item in a grocery list."""
    id: str = Field(..., description="Stable ID (hash of ingredient name + category)")
    name: str = Field(..., description="Name of the ingredient (matches ingredient_name from LLM)")
    subtitle: str = Field(default="", description="Subtitle with prep day info or additional details")
    quantity: str = Field(..., description="Formatted quantity string (e.g., '600g', '2 tbsp')")
    checked: bool = Field(default=False, description="Whether the item has been checked off")
    is_pantry_chip: bool = Field(default=False, description="Whether this is a pantry staple item")
    category: str = Field(..., description="Grocery category (e.g., Produce, Dairy)")
    prep_day: Optional[str] = Field(default=None, description="Prep day for batch prep items")

    model_config = ConfigDict(from_attributes=True)


class GroceryCategory(BaseModel):
    """Category grouping for grocery items."""
    title: str = Field(..., description="Category name (e.g., 'Protein', 'Produce')")
    count: int = Field(default=0, description="Number of items in this category")
    color: str = Field(default="", description="Color for UI display (set by frontend)")
    items: List[GroceryItem] = Field(default_factory=list, description="Items in this category")


class GroceryListResponse(BaseModel):
    """Full grocery list response matching frontend expectations."""
    plan_id: str = Field(..., description="Meal plan ID")
    week_of: str = Field(..., description="Week start date (e.g., '2026-05-07')")
    total_items: int = Field(default=0, description="Total number of non-pantry items")
    categories: List[GroceryCategory] = Field(default_factory=list, description="Categorized grocery items")
    pantry_items: List[GroceryItem] = Field(default_factory=list, description="Pantry staple items")
    
    model_config = ConfigDict(from_attributes=True)
