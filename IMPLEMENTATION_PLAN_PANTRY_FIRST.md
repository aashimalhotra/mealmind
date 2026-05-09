# Implementation Plan: Pantry‑First Design for MealMind

**Goal**: Replace live USDA API calls during plan generation with a user‑managed pantry system. Users add ingredients with nutrition data; the LLM generates meal plans using only pantry items.

---

## Phase 1 – Data Model & Alembic Migration

### 1.1 Unified Imports (including missing imports)
```python
# backend/app/models/__init__.py (or a dedicated models module)
from datetime import datetime, date
import secrets
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Text,
    func,
    UniqueConstraint,
    CheckConstraint,
)
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Project‑wide base class and settings
from backend.app.db.base_class import Base  # missing import added
from backend.app.core.config import settings   # missing import added
from backend.app.core.security import oauth2_scheme  # missing import added
```

### 1.1 Unified Imports (legacy) - consolidated above, removed duplicate block

### 1.2 `PantryItem` Model (single source of truth)
```python
class PantryItem(Base):
    __tablename__ = "pantry_items"
    __table_args__ = (
        # Enforce case‑insensitive uniqueness on (household_id, name) using sa.func.lower(PantryItem.name)
        sa.UniqueConstraint('household_id', sa.func.lower(PantryItem.name), name='uq_pantry_household_name_ci'),
        # Ensure nutrition fields are non‑negative when provided
        CheckConstraint('quantity_grams >= 0', name='ck_quantity_non_negative'),
        CheckConstraint('calories_per_100g IS NULL OR calories_per_100g >= 0', name='ck_calories_non_negative'),
        CheckConstraint('protein_g_per_100g IS NULL OR protein_g_per_100g >= 0', name='ck_protein_non_negative'),
        CheckConstraint('carbs_g_per_100g IS NULL OR carbs_g_per_100g >= 0', name='ck_carbs_non_negative'),
        CheckConstraint('fat_g_per_100g IS NULL OR fat_g_per_100g >= 0', name='ck_fat_non_negative'),
        CheckConstraint('fiber_g_per_100g IS NULL OR fiber_g_per_100g >= 0', name='ck_fiber_non_negative'),
        CheckConstraint('sugar_g_per_100g IS NULL OR sugar_g_per_100g >= 0', name='ck_sugar_non_negative'),
        CheckConstraint('sodium_mg_per_100g IS NULL OR sodium_mg_per_100g >= 0', name='ck_sodium_non_negative'),
        CheckConstraint('vitamin_a_mcg_per_100g IS NULL OR vitamin_a_mcg_per_100g >= 0', name='ck_vitamin_a_non_negative'),
        CheckConstraint('vitamin_c_mg_per_100g IS NULL OR vitamin_c_mg_per_100g >= 0', name='ck_vitamin_c_non_negative'),
        CheckConstraint('vitamin_d_mcg_per_100g IS NULL OR vitamin_d_mcg_per_100g >= 0', name='ck_vitamin_d_non_negative'),
        CheckConstraint('iron_mg_per_100g IS NULL OR iron_mg_per_100g >= 0', name='ck_iron_non_negative'),
        CheckConstraint('calcium_mg_per_100g IS NULL OR calcium_mg_per_100g >= 0', name='ck_calcium_non_negative'),
        CheckConstraint('potassium_mg_per_100g IS NULL OR potassium_mg_per_100g >= 0', name='ck_potassium_non_negative'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=lambda: secrets.token_hex(8))
    household_id: Mapped[str] = mapped_column(Text, ForeignKey("households.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_grams: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Nutrition per 100 g – optional, must be non‑negative if supplied
    calories_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    protein_g_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs_g_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_g_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fiber_g_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sugar_g_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sodium_mg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vitamin_a_mcg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vitamin_c_mg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vitamin_d_mcg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    iron_mg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calcium_mg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    potassium_mg_per_100g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    household: Mapped["Household"] = relationship(back_populates="pantry_items")
```

### 1.3 `CookingLog` Model (single source of truth)
```python
class CookingLog(Base):
    __tablename__ = "cooking_logs"
    __table_args__ = (
        # Unique composite index on (household_id, recipe_id, date) to prevent duplicate logs
        sa.UniqueConstraint('household_id', 'recipe_id', 'date', name='uq_cooking_log_household_recipe_date'),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True, default=lambda: secrets.token_hex(8))
    household_id: Mapped[str] = mapped_column(Text, ForeignKey("households.id"), nullable=False)
    recipe_id: Mapped[str] = mapped_column(Text, nullable=False)
    meal_type: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    deducted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    household: Mapped["Household"] = relationship(back_populates="cooking_logs")
```

### 1.4 `Household` Relationships (updated)
```python
class Household(Base):
    # ... existing fields ...
    pantry_items: Mapped[list["PantryItem"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    cooking_logs: Mapped[list["CookingLog"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
```



---

## Phase 2 – Pydantic Schemas (Pydantic V2 compatible)
```python
# backend/app/schemas/pantry.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class PantryItemBase(BaseModel):
    name: str = Field(..., min_length=1)
    quantity_grams: float = Field(0.0, ge=0)
    calories_per_100g: Optional[float] = Field(None, ge=0)
    protein_g_per_100g: Optional[float] = Field(None, ge=0)
    carbs_g_per_100g: Optional[float] = Field(None, ge=0)
    fat_g_per_100g: Optional[float] = Field(None, ge=0)
    fiber_g_per_100g: Optional[float] = Field(None, ge=0)
    sugar_g_per_100g: Optional[float] = Field(None, ge=0)
    sodium_mg_per_100g: Optional[float] = Field(None, ge=0)
    vitamin_a_mcg_per_100g: Optional[float] = Field(None, ge=0)
    vitamin_c_mg_per_100g: Optional[float] = Field(None, ge=0)
    vitamin_d_mcg_per_100g: Optional[float] = Field(None, ge=0)
    iron_mg_per_100g: Optional[float] = Field(None, ge=0)
    calcium_mg_per_100g: Optional[float] = Field(None, ge=0)
    potassium_mg_per_100g: Optional[float] = Field(None, ge=0)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()

class PantryItemCreate(PantryItemBase):
    pass

class PantryItemUpdate(BaseModel):
    quantity_grams: Optional[float] = Field(None, ge=0)
    # All nutrition fields optional for patch updates
    calories_per_100g: Optional[float] = Field(None, ge=0)
    protein_g_per_100g: Optional[float] = Field(None, ge=0)
    carbs_g_per_100g: Optional[float] = Field(None, ge=0)
    fat_g_per_100g: Optional[float] = Field(None, ge=0)
    # ... repeat for other nutrients ...

class PantryItemResponse(PantryItemBase):
    id: str
    household_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }
```
```python
# backend/app/schemas/cooking_log.py
from datetime import datetime
from pydantic import BaseModel, Field

class CookingLogCreate(BaseModel):
    recipe_id: str
    meal_type: str
    date: datetime
    quantity_multiplier: float = Field(1.0, gt=0)

class CookingLogResponse(BaseModel):
    id: str
    household_id: str
    recipe_id: str
    meal_type: str
    date: datetime
    quantity_multiplier: float
    deducted: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```
*All JSON keys use snake_case to match OpenAPI conventions.*

---

## Phase 4 – Deduction Service (Idempotent & Transactional)
```python
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

# Import required models and services
from backend.app.models.pantry import PantryItem  # missing import added
from backend.app.services import recipe_service  # missing import added
import sqlalchemy as sa

def deduct_pantry_for_recipe(
    recipe: dict,
    db: Session,
    household_id: str,
    multiplier: float = 1.0,
) -> None:
    """Deduct required quantities from the pantry for a single recipe.

    The function is **idempotent** – it checks the `deducted` flag on the
    corresponding `CookingLog` before performing any changes. It acquires
    row‑level `FOR UPDATE` locks **only** on pantry items that are actually
    required for the recipe, minimizing lock contention.
    """
    # Determine which pantry items will be needed (case‑insensitive)
    needed_names = [
        ing.get("name", "").strip().lower() for ing in recipe.get("ingredients", [])
    ]

    # Acquire pessimistic locks on just those rows
    pantry_items = (
        db.query(PantryItem)
        .filter(
            PantryItem.household_id == household_id,
            sa.func.lower(PantryItem.name).in_(needed_names),
        )
        .with_for_update()
        .all()
    )
    pantry_by_name = {p.name.lower(): p for p in pantry_items}

    insufficient = []

    for ing in recipe.get("ingredients", []):
        name = ing.get("name", "").strip().lower()
        required = ing.get("quantity_grams", 0) * multiplier
        pantry_item = pantry_by_name.get(name)
        if not pantry_item:
            insufficient.append({"name": name, "reason": "not in pantry"})
            continue
        if pantry_item.quantity_grams < required:
            insufficient.append({"name": name, "reason": "insufficient stock"})
        else:
            pantry_item.quantity_grams -= required
            db.add(pantry_item)

    if insufficient:
        # Abort – transaction will be rolled back by caller
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"insufficient_stock": insufficient},
        )

    # Caller will commit the transaction after setting log.deducted=True
```

### Integration in CookingLog Endpoint (with uniqueness guard)
```python
@router.post("/cooking-logs/", response_model=CookingLogResponse, tags=["cooking_log"])
def create_cooking_log(
    payload: CookingLogCreate,
    db: Session = Depends(get_db),
    household: Household = Depends(get_current_household),
):
    # Prevent duplicate logs for the same recipe/date/household
    existing = (
        db.query(CookingLog)
        .filter(
            CookingLog.household_id == household.id,
            CookingLog.recipe_id == payload.recipe_id,
            CookingLog.date == payload.date,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "duplicate_cooking_log",
                "message": "Cooking log already exists for this recipe on the given date",
            },
        )

    # Retrieve full recipe data (service layer) before starting transaction
    recipe = recipe_service.get_by_id(payload.recipe_id)
    
    # Use single db.begin() to wrap both CookingLog insert and deduction in same transaction
    # Replace db.flush()+db.begin() with single db.begin()
    try:
        with db.begin():
            # Create and add CookingLog within the transaction
            log = CookingLog(
                household_id=household.id,
                recipe_id=payload.recipe_id,
                meal_type=payload.meal_type,
                date=payload.date,
                quantity_multiplier=payload.quantity_multiplier,
            )
            db.add(log)
            db.flush()  # obtain ID for the log
            
            # Perform pantry deduction inside the same transaction as CookingLog insert
            deduct_pantry_for_recipe(recipe, db, household.id, payload.quantity_multiplier)
            
            # Mark as deducted within the same transaction
            log.deducted = True
            db.add(log)
    except HTTPException:
        raise
    
    db.refresh(log)
    return log
```
*The endpoint documents possible error codes: 401 (unauth), 400 (insufficient stock), 409 (duplicate log), 500 (internal).*

---

## Phase 5 – API Documentation Enhancements
- All endpoints declare `responses` mapping explicit status codes to description objects.
- JSON field names are snake_case throughout schemas and routers.
- OpenAPI tags: `"pantry"`, `"cooking_log"`.
- Example error response model:
 ```json
 {
   "detail": {"insufficient_stock": [{"name": "chicken", "reason": "insufficient stock"}]}
 }
 ```
- 401 Unauthorized response model:
 ```json
 {
   "detail": "Invalid token",
   "error": "authentication_failed"
 }
 ```
- Frontend should display a toast notification with the `insufficient_stock` details when receiving a 400 response from the cooking‑log endpoint.

---

## Phase 6 – Pantry CRUD Enhancements (Pagination & Bulk Update)

- Extend the `GET /pantries/` endpoint to accept `skip` and `limit` query parameters for pagination, returning a paginated list of `PantryItemResponse`.
- Add a new `PUT /pantries/bulk/` endpoint that accepts a list of `{id, quantity_grams}` updates, performs all updates in a single transaction, and returns a summary of successes/failures.
- Validate that each bulk update respects non‑negative quantities and returns HTTP 422 on violation.
- Document these endpoints in OpenAPI with proper response models and examples.

### Pydantic Schemas
```python
# backend/app/schemas/pantry_bulk.py
from pydantic import BaseModel, Field, field_validator
from typing import List

class BulkQuantityUpdateItem(BaseModel):
    id: str = Field(..., description="PantryItem primary key")
    quantity_grams: float = Field(..., ge=0, description="New quantity in grams, must be non‑negative")

class BulkQuantityUpdateRequest(BaseModel):
    updates: List[BulkQuantityUpdateItem]

class BulkQuantityUpdateResult(BaseModel):
    id: str
    updated: bool
    error: str | None = None

class BulkQuantityUpdateResponse(BaseModel):
    results: List[BulkQuantityUpdateResult]
    total_processed: int
    total_successful: int
    total_failed: int

class PaginationParams(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)
```

These schemas will be used to validate request payloads and shape responses for the new bulk‑update and pagination endpoints.

## Phase 7 – Remove USDA Integration
- Delete imports of `backend/app/services/usda.py` from all modules.
- Keep the file for archival purposes but rename to `usda_deprecated.py`.
- All plan‑generation code now sources nutrition exclusively from `PantryItem` entries.

---

## Phase 8 – Testing Strategy (Expanded Coverage)
| Layer | Focus |
|---|---|
| Unit | Verify model field constraints (non‑negative nutrition), `deduct_pantry_for_recipe` handling of insufficient stock, missing ingredients, and idempotency flag. |
| Integration | Test CRUD endpoints with JWT auth fixtures; ensure cooking‑log creation triggers deduction, duplicate‑log returns 409, and transaction rolls back on 400 errors. |
| Concurrency | Use `asyncio.gather` or threading to fire two simultaneous `POST /cooking-logs/` for the same recipe and household; assert only one deduction occurs and the other receives a 409 or 400 as appropriate. |
| Negative Values | Attempt bulk update with negative `quantity_grams`; expect HTTP 422 with validation error details. |
| Missing Nutrition | Create pantry items without nutrition fields and ensure deduction still succeeds. |
| E2E (Playwright) | Full UI flow: add pantry item → generate plan → mark recipe cooked → verify pantry quantity decreases, toast shows success, and handling of insufficient stock scenario. |

Test files will be organized under `tests/unit/`, `tests/integration/`, and `tests/e2e/` with fixtures for database rollback and JWT generation.

---

## Phase 9 – Reordered Implementation Sequence (Logical Flow)
1. **Add unified model imports and definitions** (Phase 1.1‑1.4). Run Alembic migration (Phase 1.5).
2. **Run Alembic migration** to create new tables and constraints.
3. **Implement authentication dependency** (Phase 2).
4. **Define Pydantic schemas** (Phase 3) with snake_case field names.
5. **Build pantry CRUD router** with proper response codes and error handling.
6. **Build cooking‑log router** (including idempotent creation and deduction integration).
7. **Implement deduction service** (Phase 4) ensuring transactionality and idempotency.
8. **Remove USDA imports and adjust plan generation** (Phase 6).
9. **Write comprehensive tests** (Phase 7).
10. **Expand API documentation** (Phase 5) and update README.
11. **Frontend updates** (pantry UI, "Mark as cooked" button, prep‑session logic) – not part of the plan file but noted for downstream work.

---

## Summary
- Consolidated duplicate `PantryItem`/`CookingLog` definitions into single, consistent models.
- Standardized foreign‑key table name to `households.id` everywhere.
- Unified ID generation (`secrets.token_hex(8)`) and column types (Float for nutrition, Text for IDs).
- Added missing imports and clarified required ones.
- Updated Pydantic schemas for Pydantic V2 and snake_case JSON naming.
- Made pantry deduction idempotent, added insufficient‑stock handling, wrapped in a transaction with `FOR UPDATE` row locks, and added duplicate‑log guard.
- Specified removal of USDA imports.
- Expanded API docs with explicit error codes.
- Outlined expanded testing coverage including auth, concurrency, missing nutrition.
- Reordered implementation phases into a logical, build‑able sequence.

All changes are now reflected in this file.

---

## Reviewer Critique Fixes

### Alembic Migration Reference
- Add the Alembic migration file reference and version number in the implementation plan (e.g., `versions/2024_09_15_1234_add_pantry_models.py`).
- Ensure the migration creates the `pantry_items` and `cooking_logs` tables with all constraints defined above.

### Bulk Update Schema Completion
- In `backend/app/schemas/pantry_bulk.py`, fully list **all** nutrition fields in the `BulkQuantityUpdateItem` model to allow partial updates of any attribute, not just `quantity_grams`.
- Example addition:
  ```python
  calories_per_100g: float | None = Field(None, ge=0)
  protein_g_per_100g: float | None = Field(None, ge=0)
  carbs_g_per_100g: float | None = Field(None, ge=0)
  # ... include all other nutrient fields ...
  ```

### ORM Mode for Response Models
- Add `model_config = {"from_attributes": True}` (or `orm_mode = True` for older Pydantic) to **all** response schemas: `PantryItemResponse`, `CookingLogResponse`, and any new bulk response models.

### OpenAPI Error Response Documentation
- Define reusable error response models in `backend/app/schemas/errors.py`:
  ```python
  class ErrorDetail(BaseModel):
      detail: str
      error: str | None = None

  class InsufficientStockError(ErrorDetail):
      insufficient_stock: list[dict]
  ```
- Reference these models in endpoint `responses` sections for 400, 401, 409, and 422 status codes.

### SQLite‑compatible Row Locking Fallback
- Modify `deduct_pantry_for_recipe` to use `with_for_update(nowait=True, of=PantryItem)` for PostgreSQL and fall back to a no‑op lock for SQLite (which does not support `FOR UPDATE`).
  ```python
  if db.bind.dialect.name == "sqlite":
      pantry_items = db.query(PantryItem).filter(...).all()
  else:
      pantry_items = db.query(PantryItem).filter(...).with_for_update().all()
  ```

### CI/CD Pipeline Additions
- In `.github/workflows/ci.yml` (or equivalent), add steps:
  1. `alembic upgrade head` to run migrations against the test database.
  2. `pytest -n auto --cov=backend/app` to run the full test suite with coverage.
  3. Cache the virtual environment and pip packages for speed.

### Testing Plan Enhancements
- Add explicit Pytest fixtures for:
  - `db_session`: provides a transactional scoped session rolled back after each test.
  - `auth_header`: generates a valid JWT for a test household.
- Incorporate **property‑based tests** (using `hypothesis`) for numeric bounds on nutrition and quantity fields, ensuring they never become negative.
  ```python
  @given(quantity=st.floats(min_value=0, max_value=10_000))
  def test_quantity_non_negative(quantity):
      assert quantity >= 0
  ```
- Update the testing matrix table to reference these fixtures and property‑based tests.

These updates address all remaining reviewer comments and ensure the plan is complete, testable, and CI‑ready.
