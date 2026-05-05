from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


PHONE_PATTERN = r"^\+?[0-9][0-9\s().-]{2,29}$"


def _trim_string(value):
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _validate_email(value):
    if value is None:
        return value
    if "@" not in value or value.startswith("@") or value.endswith("@"):
        raise ValueError("Invalid email address")
    return value


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=3, max_length=30, pattern=PHONE_PATTERN)
    email: Optional[str] = Field(default=None, max_length=255)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name", "phone", "email", "gender", mode="before")
    @classmethod
    def trim_strings(cls, value):
        return _trim_string(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return _validate_email(value)


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    phone: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=30,
        pattern=PHONE_PATTERN,
    )
    email: Optional[str] = Field(default=None, max_length=255)
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = Field(default=None, max_length=40)

    @field_validator("name", "phone", "email", "gender", mode="before")
    @classmethod
    def trim_strings(cls, value):
        return _trim_string(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        return _validate_email(value)


class PatientResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientDeleteResponse(BaseModel):
    message: str
