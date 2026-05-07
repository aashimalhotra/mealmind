"""Pydantic schemas for meal plan endpoints."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import date, datetime
import json


class PlanGenerateRequest(BaseModel):
    """
    Request schema for plan generation.
    
    No body required for Phase 1 - uses household defaults.
    Future phases may add override parameters here.
    """
    pass


class RecipeChunk(BaseModel):
    """Recipe data sent in SSE recipe events."""
    id: str
    display_name: str
    authentic_name: Optional[str] = None
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]] = Field(
        description="List of ingredients with quantity_1500 and quantity_1800 in grams"
    )
    prep_steps: List[str] = Field(default_factory=list)
    serving_instructions: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class DayChunk(BaseModel):
    """Day data sent in SSE day events."""
    day: str
    meals: Dict[str, Dict[str, Any]]


class PlanGenerateChunk(BaseModel):
    """
    SSE event chunk for plan generation streaming.
    
    Event types:
    - start: Generation started
    - thinking: LLM is processing (sent every 2s)
    - recipes: Batch of recipes parsed from LLM response
    - plan: Final plan_data parsed from LLM response
    - done: Generation complete with plan_id
    - error: Error occurred
    """
    event: str
    data: Optional[Any] = None


class PlanOut(BaseModel):
    """Output schema for meal plan responses."""
    id: str
    household_id: str
    week_start: date
    status: str
    plan_data: Dict[str, Any]
    grocery_list: Optional[Dict[str, Any]] = None
    ai_insights: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator('plan_data', mode='before')
    def parse_plan_data(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator('grocery_list', mode='before')
    def parse_grocery_list(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class PlanUpdate(BaseModel):
    """Partial update schema for meal plans."""
    status: Optional[str] = None
    plan_data: Optional[Dict[str, Any]] = None
