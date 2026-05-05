from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.profile import router as profile_router
from app.routers.recipes import router as recipes_router

app = FastAPI(title="MealMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(recipes_router, prefix="/api/recipes", tags=["recipes"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
