from datetime import datetime, timedelta, timezone
from uuid import uuid4
import bcrypt
import redis
from fastapi import HTTPException, status
from jose import JWTError, jwt
from Backend.app.core.config import get_settings

settings = get_settings()
_redis_client = None

def _get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is None and settings.redis_url:
        _redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "jti": uuid4().hex})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def verify_token_payload(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    jti = payload.get("jti")
    redis_client = _get_redis()
    if redis_client is not None and jti and redis_client.sismember("jwt_blacklist", jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

def verify_token(token: str) -> str:
    return str(verify_token_payload(token)["sub"])
