from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RiskFactor(BaseModel):
    factor: str
    severity: Literal["low", "medium", "high"]
    detail: str


class AISummaryResponse(BaseModel):
    patient_id: int
    name: str
    summary: list[str]
    risk_factors: list[RiskFactor]


class SOAPRequest(BaseModel):
    raw_notes: str = Field(..., min_length=1)
    patient_id: int | None = None


class SOAPSections(BaseModel):
    subjective: list[str]
    objective: list[str]
    assessment: list[str]
    plan: list[str]


class SOAPResponse(BaseModel):
    sections: SOAPSections
    summary: str


class NoShowResponse(BaseModel):
    appointment_id: int
    patient_name: str
    score: int = Field(..., ge=0, le=100)
    risk: Literal["LOW", "MEDIUM", "HIGH"]
    reasons: list[str]
    recommendations: list[str]


class FollowUpRequest(BaseModel):
    appointment_id: int
    channel: Literal["whatsapp", "email"]
    kind: Literal["reminder", "postcare"] = "reminder"


class FollowUpResponse(BaseModel):
    channel: Literal["whatsapp", "email"]
    subject: str | None
    message: str
    character_count: int


class TodayPatientRow(BaseModel):
    patient_name: str
    doctor: str
    time: str
    reason: str | None
    risk: str


class SummarizeTodayResponse(BaseModel):
    date: str
    patients: list[TodayPatientRow]

    model_config = ConfigDict(from_attributes=True)
