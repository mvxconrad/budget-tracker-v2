"""Pydantic models. The budget shape mirrors the frontend data model."""
from pydantic import BaseModel, EmailStr, Field


# --- auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    email: str
    role: str = "user"


# --- budget (mirrors src/defaultBudget.js) ---
class Item(BaseModel):
    id: str | None = None
    label: str = ""
    amount: float = 0


class Category(BaseModel):
    id: str | None = None
    name: str = ""
    items: list[Item] = Field(default_factory=list)


class Savings(BaseModel):
    startingBalance: float = 0
    apyPercent: float = 3.1
    months: int = 6
    overrides: dict[str, float] = Field(default_factory=dict)


class Budget(BaseModel):
    title: str = "My Budget"
    subtitle: str = ""
    location: str = ""
    income: float = 0
    savings: Savings = Field(default_factory=Savings)
    categories: list[Category] = Field(default_factory=list)


# --- AI chat ---
class ChatTurn(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str = Field(max_length=8000)
    budget: Budget
    history: list[ChatTurn] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    edits: dict | None = None  # partial budget the frontend should apply
    configured: bool = True


# --- settings (per-user AI key) ---
class SettingsUpdate(BaseModel):
    provider: str | None = None  # "anthropic" | "openai"
    api_key: str | None = Field(default=None, max_length=512)


class SettingsResponse(BaseModel):
    provider: str | None = None
    has_key: bool = False
    key_hint: str | None = None  # last 4 chars only, never the full key


class TestKeyResponse(BaseModel):
    ok: bool
    detail: str = ""
