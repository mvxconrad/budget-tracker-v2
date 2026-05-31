"""App configuration, loaded from environment / .env.

Feature flags are derived from which keys are present, so the whole API shape
exists from day one and each capability turns on as you add its credentials.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # AI
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-8"

    # Auth
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_minutes: int = 43200  # 30 days

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

    def features(self) -> dict[str, bool]:
        return {
            "ai": bool(self.anthropic_api_key),
            "market": bool(self.finnhub_api_key),
            "accounts": bool(self.plaid_client_id and self.plaid_secret),
        }


settings = Settings()
