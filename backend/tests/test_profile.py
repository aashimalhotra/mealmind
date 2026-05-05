import json
import pytest


@pytest.mark.asyncio
async def test_get_profile_creates_default_household_on_first_call(async_client):
    response = await async_client.get("/api/profile")
    assert response.status_code == 200
    
    data = response.json()
    assert "household" in data
    household = data["household"]
    assert household["name"] == "Home"
    assert len(household["members"]) == 2
    assert household["members"][0]["name"] == "Person 1"
    assert household["members"][0]["calorie_target"] == 1500
    assert household["members"][1]["name"] == "Person 2"
    assert household["members"][1]["calorie_target"] == 1800


@pytest.mark.asyncio
async def test_patch_profile_updates_household_cuisine_pref(async_client):
    # First get profile to create default household
    await async_client.get("/api/profile")
    
    # Update cuisine_pref
    response = await async_client.patch(
        "/api/profile",
        json={"cuisine_pref": "Indian"}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert data["household"]["cuisine_pref"] == "Indian"


@pytest.mark.asyncio
async def test_patch_profile_updates_user_calorie_target(async_client):
    # First get profile to create default household and get user IDs
    response = await async_client.get("/api/profile")
    data = response.json()
    user_id = data["household"]["members"][0]["id"]
    
    # Update user's calorie target
    response = await async_client.patch(
        "/api/profile",
        json={
            "users": [
                {
                    "id": user_id,
                    "calorie_target": 1600
                }
            ]
        }
    )
    assert response.status_code == 200
    
    data = response.json()
    updated_user = next(u for u in data["household"]["members"] if u["id"] == user_id)
    assert updated_user["calorie_target"] == 1600


@pytest.mark.asyncio
async def test_patch_profile_rejects_unknown_user_id(async_client):
    # First get profile to create default household
    await async_client.get("/api/profile")
    
    # Try to update non-existent user
    response = await async_client.patch(
        "/api/profile",
        json={
            "users": [
                {
                    "id": "nonexistent-id",
                    "calorie_target": 1600
                }
            ]
        }
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
