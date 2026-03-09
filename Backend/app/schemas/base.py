from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    service: str

class RootResponse(BaseModel):
    message: str
    version: str
    status: str

class ErrorResponse(BaseModel):
    detail: str
    status_code: int