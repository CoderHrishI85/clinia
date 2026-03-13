from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True