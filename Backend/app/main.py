from fastapi import FastAPI
from Backend.app.routes.health import router as health_router
from Backend.app.schemas.base import RootResponse

app = FastAPI(
    title="Clinia API",
    description="AI-powered CRM for clinics",
    version="0.1.0"
)

app.include_router(health_router)

@app.get("/", response_model=RootResponse)
def root():
    return {
        "message": "Clinia API is running",
        "version": "0.1.0",
        "status": "healthy"
    }