"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "Walcano Inventory Management"
    APP_VERSION: str = "1.0.0"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # QuickBooks Online
    QBO_CLIENT_ID: Optional[str] = None
    QBO_CLIENT_SECRET: Optional[str] = None
    QBO_REDIRECT_URI: str = "http://localhost:8000/api/v1/quickbooks/callback"
    QBO_ENVIRONMENT: str = "sandbox"
    QBO_REALM_ID: Optional[str] = None
    QBO_ACCESS_TOKEN: Optional[str] = None
    QBO_REFRESH_TOKEN: Optional[str] = None

    # Google Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql://walcano_app:walcano_db_pass_2026@localhost:5432/walcano_inventory"

    # JWT Authentication
    JWT_SECRET_KEY: str = "walcano_secret_jwt_key_2026_super_secure_surfaces_tiles_platform"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # SMTP Email Service (for Password Reset OTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@wallcano.com"
    SMTP_TLS: bool = True

    # Initial Admin Account Seeding
    INITIAL_ADMIN_EMAIL: str = "admin@wallcano.com"
    INITIAL_ADMIN_PASSWORD: str = "Admin@Wallcano2026!"
    INITIAL_ADMIN_NAME: str = "Wallcano Administrator"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
