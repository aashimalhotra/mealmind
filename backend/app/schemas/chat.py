from pydantic import BaseModel, Field
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    screen: str
    plan_id: Optional[int] = None

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: str
    screen: Optional[str] = None
    plan_id: Optional[int] = None
