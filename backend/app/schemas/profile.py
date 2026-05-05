from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class UserOut(BaseModel):
    id: str
    name: str
    calorie_target: int
    protein_pct: float = Field(default=0.30)
    carbs_pct: float = Field(default=0.30)
    fat_pct: float = Field(default=0.40)
    veggie_target: int = Field(default=5)

    model_config = ConfigDict(from_attributes=True)


class HouseholdOut(BaseModel):
    id: str
    name: str
    cuisine_pref: Optional[str] = None
    prep_days: List[str] = Field(default_factory=list)
    dineout_days: List[str] = Field(default_factory=list)
    members: List[UserOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProfileOut(BaseModel):
    household: HouseholdOut


class UserUpdate(BaseModel):
    id: str
    calorie_target: Optional[int] = None
    protein_pct: Optional[float] = None
    carbs_pct: Optional[float] = None
    fat_pct: Optional[float] = None
    veggie_target: Optional[int] = None


class ProfileUpdate(BaseModel):
    cuisine_pref: Optional[str] = None
    prep_days: Optional[List[str]] = None
    dineout_days: Optional[List[str]] = None
    users: Optional[List[UserUpdate]] = None