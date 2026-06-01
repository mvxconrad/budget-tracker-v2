"""App configuration, loaded from environment / .env.

Feature flags are derived from which keys are present, so the whole API shape
exists from day one and each capability turns on as you add its credentials.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database. Prod (RDS): postgresql+asyncpg://user:pass@host:5432/dbname
    # Local dev falls back to a SQLite file so the app runs with no Postgres.
    database_url: str = "sqlite+aiosqlite:///./ledger_dev.db"

    # Encryption-at-rest key for per-user API keys (Fernet, urlsafe-base64 32 bytes).
    # If unset, a key is derived from JWT_SECRET (fine for dev; set explicitly in prod).
    app_encryption_key: str = ""

    # AI
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"

    # Auth — short-lived access token + long-lived refresh token.
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 60  # access token
    refresh_expire_days: int = 30  # refresh token

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # Market data / bank linking (later)
    finnhub_api_key: str = ""
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def features(self) -> dict[str, bool]:
        return {
            "ai": bool(self.anthropic_api_key),
            "market": bool(self.finnhub_api_key),
            "accounts": bool(self.plaid_client_id and self.plaid_secret),
        }


settings = Settings()
