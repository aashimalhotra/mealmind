from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    DATABASE_URL: str = "sqlite:////app/data/mealmind.db"
    LITELLM_PROXY_URL: str = "http://localhost:4000"
    USDA_API_BASE: str = "https://api.nal.usda.gov/fdc/v1"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]


settings = Settings()
