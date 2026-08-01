from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.core.dependencies import get_current_clinic, get_current_user
from Backend.app.core.phi import decrypt_patient
from Backend.app.models.appointment import Appointment
from Backend.app.models.patient import Patient
from Backend.app.models.user import User
from Backend.app.schemas.ai import (
    AISummaryResponse,
    FollowUpRequest,
    FollowUpResponse,
    NoShowResponse,
    SOAPRequest,
    SOAPResponse,
    SummarizeTodayResponse,
)
from Backend.app.services import ai_engine

router = APIRouter(prefix="/ai", tags=["ai"])

MISSED_STATUSES = ("cancelled", "missed")
COMPLETED_STATUS = "completed"


def _get_patient_or_404(db: Session, patient_id: int, clinic_id: int) -> Patient:
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == patient_id,
            Patient.clinic_id == clinic_id,
            Patient.is_deleted == False,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return decrypt_patient(patient)


def _get_appointment_or_404(db: Session, appointment_id: int, clinic_id: int) -> Appointment:
    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id,
            Appointment.clinic_id == clinic_id,
            Appointment.is_deleted == False,
        )
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def _visit_counts(db: Session, patient_id: int, clinic_id: int) -> tuple[int, int]:
    """Return (completed_count, missed_count) for a patient across the clinic."""
    statuses = [
        s[0]
        for s in db.query(Appointment.status).filter(
            Appointment.patient_id == patient_id,
            Appointment.clinic_id == clinic_id,
            Appointment.is_deleted == False,
        ).all()
    ]
    counter = Counter(statuses)
    completed = sum(v for k, v in counter.items() if k == COMPLETED_STATUS)
    missed = sum(v for k, v in counter.items() if k in MISSED_STATUSES)
    return completed, missed


@router.get("/summarize-patient/{patient_id}", response_model=AISummaryResponse)
def summarize_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    user: User = Depends(get_current_user),
):
    patient = _get_patient_or_404(db, patient_id, clinic_id)
    result = ai_engine.summarize_patient(patient)
    return {
        "patient_id": patient.id,
        "name": patient.name,
        "summary": result["summary"],
        "risk_factors": result["risk_factors"],
    }


@router.post("/generate-soap-notes", response_model=SOAPResponse)
def generate_soap_notes(
    payload: SOAPRequest,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    user: User = Depends(get_current_user),
):
    if not payload.raw_notes.strip():
        raise HTTPException(status_code=422, detail="raw_notes cannot be empty")

    result = ai_engine.generate_soap_notes(payload.raw_notes)
    sections = result["sections"]
    counts = {
        k: len(v) for k, v in sections.items() if v
    }
    summary = (
        f"Structured {len(counts)} section(s): "
        + ", ".join(f"{k.capitalize()} ({v})" for k, v in counts.items())
    )
    return {"sections": sections, "summary": summary}


@router.get("/predict-noshow/{appointment_id}", response_model=NoShowResponse)
def predict_noshow(
    appointment_id: int,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    user: User = Depends(get_current_user),
):
    appointment = _get_appointment_or_404(db, appointment_id, clinic_id)
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == appointment.patient_id,
            Patient.clinic_id == clinic_id,
            Patient.is_deleted == False,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    completed, missed = _visit_counts(db, appointment.patient_id, clinic_id)
    result = ai_engine.predict_noshow(appointment, patient, completed, missed)
    return {
        "appointment_id": appointment.id,
        "patient_name": patient.name,
        "score": result["score"],
        "risk": result["risk"],
        "reasons": result["reasons"],
        "recommendations": result["recommendations"],
    }


@router.post("/draft-followup", response_model=FollowUpResponse)
def draft_followup(
    payload: FollowUpRequest,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    user: User = Depends(get_current_user),
):
    appointment = _get_appointment_or_404(db, payload.appointment_id, clinic_id)
    patient = (
        db.query(Patient)
        .filter(
            Patient.id == appointment.patient_id,
            Patient.clinic_id == clinic_id,
            Patient.is_deleted == False,
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return ai_engine.draft_followup(patient, appointment, payload.channel, payload.kind)


@router.get("/summarize-today", response_model=SummarizeTodayResponse)
def summarize_today(
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    user: User = Depends(get_current_user),
):
    today_appointments = (
        db.query(Appointment)
        .filter(
            Appointment.clinic_id == clinic_id,
            Appointment.is_deleted == False,
            func.date(Appointment.appointment_date) == date.today(),
        )
        .all()
    )

    # Precompute visit counts once per patient to avoid N+1 lookups.
    statuses = [
        s[0]
        for s in db.query(Appointment.status).filter(
            Appointment.clinic_id == clinic_id,
            Appointment.is_deleted == False,
        ).all()
    ]
    counter = Counter(statuses)
    completed_total = sum(v for k, v in counter.items() if k == COMPLETED_STATUS)
    missed_total = sum(v for k, v in counter.items() if k in MISSED_STATUSES)

    rows = []
    for appointment in today_appointments:
        patient = (
            db.query(Patient)
            .filter(
                Patient.id == appointment.patient_id,
                Patient.clinic_id == clinic_id,
                Patient.is_deleted == False,
            )
            .first()
        )
        if not patient:
            continue
        no_show = ai_engine.predict_noshow(appointment, patient, completed_total, missed_total)
        rows.append((appointment, patient, no_show))

    return ai_engine.summarize_today(rows)
