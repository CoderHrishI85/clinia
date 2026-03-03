from fastapi import FastAPI

app = FastAPI(
    title="Clinia API",
    description="AI-powered CRM for clinics",
    version="0.1.0"
)

@app.get("/")
def root():
    return {
        "message": "Clinia API is running",
        "version": "0.1.0",
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}