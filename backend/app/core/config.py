from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_ENV: str = "development"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "cashpulse"
    JWT_SECRET_KEY: str = "cashpulse_ubl_super_secret_jwt_key_2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
