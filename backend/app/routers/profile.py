import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Household, User
from app.db.session import get_db
from app.schemas.profile import ProfileOut, ProfileUpdate

router = APIRouter()


@router.get("", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    # Get existing household or create default
    household = db.query(Household).first()
    if not household:
        household = Household(
            name="Home",
            prep_days=json.dumps(["sunday", "wednesday"]),
            dineout_days=json.dumps([])
        )
        db.add(household)
        db.commit()
        db.refresh(household)
    
    # Auto-create default users if household has none
    if not household.members:
        user1 = User(
            name="Person 1",
            calorie_target=1500,
            household_id=household.id
        )
        user2 = User(
            name="Person 2",
            calorie_target=1800,
            household_id=household.id
        )
        db.add_all([user1, user2])
        db.commit()
        db.refresh(household)
    
    # Parse JSON string fields to lists for response
    prep_days = json.loads(household.prep_days) if household.prep_days else []
    dineout_days = json.loads(household.dineout_days) if household.dineout_days else []
    
    # Build response structure
    household_data = {
        "id": household.id,
        "name": household.name,
        "cuisine_pref": household.cuisine_pref,
        "prep_days": prep_days,
        "dineout_days": dineout_days,
        "members": [
            {
                "id": user.id,
                "name": user.name,
                "calorie_target": user.calorie_target,
                "protein_pct": user.protein_pct,
                "carbs_pct": user.carbs_pct,
                "fat_pct": user.fat_pct,
                "veggie_target": user.veggie_target
            }
            for user in household.members
        ]
    }
    
    return {"household": household_data}


@router.patch("", response_model=ProfileOut)
def update_profile(profile_update: ProfileUpdate, db: Session = Depends(get_db)):
    # Get existing household
    household = db.query(Household).first()
    if not household:
        # Create default household if missing (should not happen if GET was called first)
        household = Household(
            name="Home",
            prep_days=json.dumps(["sunday", "wednesday"]),
            dineout_days=json.dumps([])
        )
        db.add(household)
        db.commit()
        db.refresh(household)
    
    # Update household fields if provided
    if profile_update.cuisine_pref is not None:
        household.cuisine_pref = profile_update.cuisine_pref
    if profile_update.prep_days is not None:
        household.prep_days = json.dumps(profile_update.prep_days)
    if profile_update.dineout_days is not None:
        household.dineout_days = json.dumps(profile_update.dineout_days)
    
    # Update user fields if provided
    if profile_update.users is not None:
        for user_update in profile_update.users:
            user = db.query(User).filter(User.id == user_update.id).first()
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail=f"User with id {user_update.id} not found"
                )
            if user_update.calorie_target is not None:
                user.calorie_target = user_update.calorie_target
            if user_update.protein_pct is not None:
                user.protein_pct = user_update.protein_pct
            if user_update.carbs_pct is not None:
                user.carbs_pct = user_update.carbs_pct
            if user_update.fat_pct is not None:
                user.fat_pct = user_update.fat_pct
            if user_update.veggie_target is not None:
                user.veggie_target = user_update.veggie_target
    
    db.commit()
    db.refresh(household)
    
    # Build response (same structure as GET)
    prep_days = json.loads(household.prep_days) if household.prep_days else []
    dineout_days = json.loads(household.dineout_days) if household.dineout_days else []
    
    household_data = {
        "id": household.id,
        "name": household.name,
        "cuisine_pref": household.cuisine_pref,
        "prep_days": prep_days,
        "dineout_days": dineout_days,
        "members": [
            {
                "id": user.id,
                "name": user.name,
                "calorie_target": user.calorie_target,
                "protein_pct": user.protein_pct,
                "carbs_pct": user.carbs_pct,
                "fat_pct": user.fat_pct,
                "veggie_target": user.veggie_target
            }
            for user in household.members
        ]
    }
    
    return {"household": household_data}
