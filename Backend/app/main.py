from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from Backend.app.core.audit import AuditMiddleware
from Backend.app.routes.analytics import router as analytics_router
from Backend.app.routes.auth import limiter
from Backend.app.routes.health import router as health_router
from Backend.app.routes.patients import router as patients_router
from Backend.app.routes.auth import router as auth_router
from Backend.app.routes.appointment import router as appointments_router
from Backend.app.routes.search import router as search_router
from Backend.app.routes.ai import router as ai_router
from Backend.app.schemas.base import RootResponse
from Backend.app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Clinia API",
    description="AI-powered CRM for clinics",
    version="0.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuditMiddleware)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(health_router)
app.include_router(analytics_router)
app.include_router(patients_router)
app.include_router(auth_router)
app.include_router(appointments_router)
app.include_router(search_router)
app.include_router(ai_router)

@app.get("/", response_model=RootResponse)
def root():
    return {
        "message": "Clinia API is running",
        "version": "0.2.0",
        "status": "healthy"
    }
