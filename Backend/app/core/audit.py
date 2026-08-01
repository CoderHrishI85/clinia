from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from Backend.app.core.database import SessionLocal
from Backend.app.core.security import verify_token
from Backend.app.models.audit_log import AuditLog
from Backend.app.models.user import User

WRITE_METHODS = {"POST", "PUT", "DELETE"}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        method = request.method
        path = request.url.path
        if method in WRITE_METHODS or (method == "GET" and path.startswith("/search")):
            user_id = clinic_id = None
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                try:
                    email = verify_token(auth[7:])
                    db = SessionLocal()
                    try:
                        user = db.query(User).filter(User.email == email).first()
                        if user:
                            user_id, clinic_id = user.id, user.clinic_id
                    finally:
                        db.close()
                except Exception:
                    pass
            action = "SEARCH" if method == "GET" else method
            db = SessionLocal()
            try:
                db.add(AuditLog(
                    user_id=user_id,
                    clinic_id=clinic_id,
                    action=action,
                    resource=path,
                    status_code=response.status_code,
                ))
                db.commit()
            finally:
                db.close()
        return response
