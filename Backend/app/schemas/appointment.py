from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_name: str
    appointment_date: datetime
    reason: Optional[str] = None
    duration_minutes: int = Field(default=30, ge=5, le=480)

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_name: str
    appointment_date: datetime
    reason: Optional[str]
    status: str
    duration_minutes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)