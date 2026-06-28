from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MAX CFO AI API"
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "*"]
    SECRET_KEY: str = "super_secret_key_change_in_prod" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 
    
    SQLALCHEMY_DATABASE_URI: str = "postgresql://postgres:postgres@localhost:5432/maxcfo"

    class Config:
        case_sensitive = True

settings = Settings()
