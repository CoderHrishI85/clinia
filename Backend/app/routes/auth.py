from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from Backend.app.core.config import get_settings
from Backend.app.core.database import get_db
from Backend.app.core.dependencies import COOKIE_NAME, get_current_user
from Backend.app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
    verify_token_payload,
)
from Backend.app.models.user import User
from Backend.app.schemas.auth import MeResponse, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
settings = get_settings()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        path="/",
        secure=settings.environment == "production",
    )


@router.post("/register", response_model=UserResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        role="receptionist"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email})
    _set_auth_cookie(response, token)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=MeResponse)
def me(request: Request, current_user: User = Depends(get_current_user)):
    expires_at = None
    token = request.cookies.get(COOKIE_NAME)
    if token:
        try:
            payload = verify_token_payload(token)
            expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        except HTTPException:
            pass
    return MeResponse(user=current_user, expires_at=expires_at)


@router.post("/logout")
@limiter.limit("10/minute")
def logout(request: Request, response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"message": "Signed out"}


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("5/minute")
def refresh(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session")
    payload = verify_token_payload(token)
    new_token = create_access_token(data={"sub": payload["sub"]})
    _set_auth_cookie(response, new_token)
    return {"access_token": new_token, "token_type": "bearer"}
