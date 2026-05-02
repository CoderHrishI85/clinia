from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=3, max_length=30)
    email: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name", "phone", "email", "gender", mode="before")
    @classmethod
    def trim_strings(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

class PatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
