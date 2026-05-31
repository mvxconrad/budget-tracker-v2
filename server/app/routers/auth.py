"""Auth skeleton: register, login, me. JWT bearer tokens, bcrypt-hashed
passwords, in-memory user store (swap for a DB later — see store.py)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from ..deps import get_current_user
from ..limiter import limiter
from ..schemas import RegisterRequest, TokenResponse, UserResponse
from ..security import create_token, hash_password, verify_password
from ..store import create_user, get_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest):
    if get_user(body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    create_user(body.email, hash_password(body.password))
    return TokenResponse(access_token=create_token(body.email.lower()))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")  # throttle credential-stuffing / brute force
def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    # OAuth2 form uses "username"; we treat it as the email.
    user = get_user(form.username)
    if not user or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return TokenResponse(access_token=create_token(user["email"]))


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return UserResponse(email=user["email"])
