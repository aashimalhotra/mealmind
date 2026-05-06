from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8"
    )
    
    DATABASE_URL: str = "sqlite:///./mealmind.db"
    LITELLM_PROXY_URL: str = "http://localhost:4000"
    LITELLM_PROXY_API_KEY: str = "sk-mealmind-local-dev-only"
    USDA_API_BASE: str = "https://api.nal.usda.gov/fdc/v1"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8400",
        "http://127.0.0.1:8400",
        "http://localhost:8401",
        "http://127.0.0.1:8401"
    ]


settings = Settings()
