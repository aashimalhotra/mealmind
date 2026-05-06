from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.profile import router as profile_router
from app.routers.recipes import router as recipes_router
from app.routers.plans import router as plans_router
from app.routers.prep import router as prep_router
from app.routers.grocery import router as grocery_router

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
app.include_router(plans_router, tags=["plans"])
app.include_router(prep_router, prefix="/api/prep", tags=["prep"])
app.include_router(grocery_router, tags=["grocery"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}
