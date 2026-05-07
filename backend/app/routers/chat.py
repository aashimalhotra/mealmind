from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator, List
import json

from app.schemas.chat import ChatRequest, ChatMessageResponse
from app.prompts.chat_copilot import build_chat_copilot_prompt
from app.database import get_db
from app.models.chat import ChatMessage
from app.llm import stream_chat as stream_llm

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    # Persist user message
    user_message = ChatMessage(
        role="user",
        content=request.message,
        screen=request.screen,
        plan_id=request.plan_id
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Fetch context components (placeholders for now, replace with actual services)
    household_prefs = {}
    current_plan = None
    if request.plan_id:
        # TODO: Fetch plan from database: current_plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
        pass
    
    # Fetch last 10 messages for context
    last_messages = db.query(ChatMessage).order_by(ChatMessage.timestamp.desc()).limit(10).all()
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
                screen=request.screen,
                plan_id=request.plan_id
            )
            db.add(assistant_message)
            db.commit()
    
    return StreamingResponse(generate_sse(), media_type="text/event-stream")

@router.get("/history")
async def get_chat_history(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
) -> List[ChatMessageResponse]:
    messages = db.query(ChatMessage).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    return [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp.isoformat(),
            screen=msg.screen,
            plan_id=msg.plan_id
        )
        for msg in messages
    ]
