from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from Backend.app.core.database import get_db
from Backend.app.core.security import hash_password
from Backend.app.models.user import User
from Backend.app.schemas.auth import RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user