#!/usr/bin/env python3
"""Clean chat history from database"""
from app.db.session import SessionLocal
from app.db.models import ChatHistory

db = SessionLocal()
count = db.query(ChatHistory).count()
print(f"Found {count} messages in chat history")

db.query(ChatHistory).delete()
db.commit()
print("Chat history cleared!")
