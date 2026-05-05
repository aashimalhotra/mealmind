"""SQLAlchemy models for Phase 1 schema."""

import secrets
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    func,
    Text,
    Integer,
    REAL,
    Date,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """User model for household members."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    calorie_target: Mapped[int] = mapped_column(Integer, nullable=False)
    protein_pct: Mapped[float] = mapped_column(REAL, default=0.30)
    carbs_pct: Mapped[float] = mapped_column(REAL, default=0.30)
    fat_pct: Mapped[float] = mapped_column(REAL, default=0.40)
    veggie_target: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    recipes: Mapped[list["Recipe"]] = relationship(back_populates="creator")
    chat_messages: Mapped[list["ChatHistory"]] = relationship(back_populates="user")


class Household(Base):
    """Household model for grouping users."""

    __tablename__ = "household"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prep_days: Mapped[Optional[dict]] = mapped_column(Text, nullable=True, default='["sunday","wednesday"]')
    dineout_days: Mapped[Optional[dict]] = mapped_column(Text, nullable=True, default='["friday_dinner","sunday_dinner"]')
    cuisine_pref: Mapped[Optional[str]] = mapped_column(Text, default="indian-inspired")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    meal_plans: Mapped[list["MealPlan"]] = relationship(back_populates="household")
    prep_sessions: Mapped[list["PrepSession"]] = relationship(back_populates="household")
    chat_history: Mapped[list["ChatHistory"]] = relationship(back_populates="household")


class Recipe(Base):
    """Recipe model for storing meal recipes."""

    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    authentic_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cuisine: Mapped[str] = mapped_column(Text, default="indian")
    method_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    serving_instructions: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    prep_steps: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    ingredients: Mapped[dict] = mapped_column(Text, nullable=False)
    calories_per_serving: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    protein_g: Mapped[Optional[float]] = mapped_column(REAL, nullable=True)
    carbs_g: Mapped[Optional[float]] = mapped_column(REAL, nullable=True)
    fat_g: Mapped[Optional[float]] = mapped_column(REAL, nullable=True)
    veggie_servings: Mapped[float] = mapped_column(REAL, default=0)
    prep_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cook_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reheat_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shelf_life_days: Mapped[int] = mapped_column(Integer, default=4)
    storage_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    is_batch_prep: Mapped[bool] = mapped_column(Boolean, default=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_disliked: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(Text, default="ai-generated")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Foreign keys
    creator_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("users.id"), nullable=True
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship(back_populates="recipes")


class MealPlan(Base):
    """Meal plan model for weekly meal planning."""

    __tablename__ = "meal_plans"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    household_id: Mapped[str] = mapped_column(
        Text, ForeignKey("household.id"), nullable=False
    )
    week_start: Mapped[datetime] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="draft")
    plan_data: Mapped[dict] = mapped_column(Text, nullable=False)
    grocery_list: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    ai_insights: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    household: Mapped["Household"] = relationship(back_populates="meal_plans")
    prep_sessions: Mapped[list["PrepSession"]] = relationship(back_populates="meal_plan")


class PrepSession(Base):
    """Prep session model for batch cooking sessions."""

    __tablename__ = "prep_sessions"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    meal_plan_id: Mapped[str] = mapped_column(
        Text, ForeignKey("meal_plans.id"), nullable=False
    )
    household_id: Mapped[str] = mapped_column(
        Text, ForeignKey("household.id"), nullable=False
    )
    day: Mapped[str] = mapped_column(Text, nullable=False)
    recipe_ids: Mapped[dict] = mapped_column(Text, nullable=False)
    steps: Mapped[dict] = mapped_column(Text, nullable=False)
    est_time_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    meal_plan: Mapped["MealPlan"] = relationship(back_populates="prep_sessions")
    household: Mapped["Household"] = relationship(back_populates="prep_sessions")


class ChatHistory(Base):
    """Chat history model for AI copilot conversations."""

    __tablename__ = "chat_history"

    id: Mapped[str] = mapped_column(
        Text,
        primary_key=True,
        default=lambda: secrets.token_hex(4),
    )
    household_id: Mapped[str] = mapped_column(
        Text, ForeignKey("household.id"), nullable=False
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("users.id"), nullable=True
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[Optional[dict]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    # Relationships
    household: Mapped["Household"] = relationship(back_populates="chat_history")
    user: Mapped[Optional["User"]] = relationship(back_populates="chat_messages")
