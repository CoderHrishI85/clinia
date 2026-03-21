from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_name: str
    appointment_date: datetime
    reason: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_name: str
    appointment_date: datetime
    reason: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True