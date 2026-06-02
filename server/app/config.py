"""App configuration, loaded from environment / .env.

Feature flags are derived from which keys are present, so the whole API shape
exists from day one and each capability turns on as you add its credentials.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database. Prod (RDS): postgresql+asyncpg://user:pass@host:5432/dbname
    # Local dev falls back to a SQLite file so the app runs with no Postgres.
    database_url: str = "sqlite+aiosqlite:///./quarterbyte_dev.db"

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

    # Email (verification codes). console = log the code (dev); ses = AWS SES.
    email_provider: str = "console"
    email_from: str = "no-reply@quarterbyte.local"  # must be an SES-verified identity in prod
    ses_region: str = "us-west-2"
    ses_configuration_set: str = ""  # optional: enables bounce/complaint tracking
    # Gmail SMTP (email_provider=gmail). Use a Gmail App Password, not your login.
    smtp_user: str = ""
    smtp_password: str = ""

    # Swagger/OpenAPI docs are gated behind HTTP Basic auth. Set both to enable
    # /api/docs in production; if unset, docs are exposed only in local dev.
    docs_user: str = ""
    docs_password: str = ""

    # HUD Fair Market Rents API token (free, register at huduser.gov). Powers the
    # location benchmark with real published rents. If unset, the frontend uses
    # its guideline-based estimate instead.
    hud_api_token: str = ""

    # Stripe billing (Plus/Pro upgrades). All optional: billing endpoints return
    # 503 until the secret key + price ids are set, so the app runs without it.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""  # from the Stripe webhook endpoint config
    stripe_price_plus: str = ""  # price_... id for the Plus plan
    stripe_price_pro: str = ""  # price_... id for the Pro plan
    # Where Stripe sends the user back after checkout (the app's public origin).
    public_base_url: str = "http://localhost:5173"

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

    @property
    def stripe_price_for(self) -> dict[str, str]:
        """Map an upgrade tier name -> its configured Stripe price id."""
        return {"plus": self.stripe_price_plus, "pro": self.stripe_price_pro}

    @property
    def billing_enabled(self) -> bool:
        return bool(self.stripe_secret_key and (self.stripe_price_plus or self.stripe_price_pro))

    def features(self) -> dict[str, bool]:
        return {
            "ai": bool(self.anthropic_api_key),
            "market": bool(self.finnhub_api_key),
            "accounts": bool(self.plaid_client_id and self.plaid_secret),
        }


settings = Settings()
