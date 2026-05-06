from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PrepStepSchema(BaseModel):
    index: int
    recipe_id: str
    title: str
    description: str
    active: bool
    duration_min: Optional[int] = None
    depends_on_step: Optional[int] = None
    completed: bool = False

class PrepSessionResponse(BaseModel):
    id: str
    plan_id: str
    day: str
    status: str  # 'in_progress', 'completed'
    steps: List[PrepStepSchema]
    created_at: datetime

class StepUpdate(BaseModel):
    completed: bool
