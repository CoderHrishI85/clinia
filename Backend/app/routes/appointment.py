from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from Backend.app.core.database import get_db
from Backend.app.core.dependencies import (
    get_current_clinic,
    get_current_user,
    require_role,
)
from Backend.app.models.appointment import Appointment
from Backend.app.models.user import User
from Backend.app.schemas.appointment import AppointmentCreate, AppointmentResponse

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _assert_no_overlap(
    db: Session,
    clinic_id: int,
    doctor_name: str,
    appointment_date,
    duration_minutes: int,
    exclude_id: int | None = None,
) -> None:
    new_end = appointment_date + timedelta(minutes=duration_minutes)
    # Naive params are interpreted by Postgres in the session timezone, matching how
    # appointment_date is stored, so overlap is compared on the same instant basis.
    query = db.query(Appointment.id).filter(
        Appointment.clinic_id == clinic_id,
        Appointment.doctor_name == doctor_name,
        Appointment.is_deleted == False,
        Appointment.appointment_date < new_end,
        appointment_date
        < Appointment.appointment_date
        + func.make_interval(0, 0, 0, 0, 0, Appointment.duration_minutes, 0),
    )
    if exclude_id is not None:
        query = query.filter(Appointment.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=409,
            detail="Doctor already has an overlapping appointment",
        )


@router.post("", response_model=AppointmentResponse)
def create_appointment(appointment: AppointmentCreate, db: Session = Depends(get_db), clinic_id: int = Depends(get_current_clinic), current_user: User = Depends(require_role(["admin", "doctor", "receptionist"]))):
    _assert_no_overlap(
        db, clinic_id, appointment.doctor_name,
        appointment.appointment_date, appointment.duration_minutes,
    )
    new_appointment = Appointment(
        clinic_id=clinic_id,
        patient_id=appointment.patient_id,
        doctor_name=appointment.doctor_name,
        appointment_date=appointment.appointment_date,
        reason=appointment.reason,
        duration_minutes=appointment.duration_minutes,
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    return new_appointment

@router.get("", response_model=list[AppointmentResponse])
def get_appointments(db: Session = Depends(get_db), clinic_id: int = Depends(get_current_clinic), current_user: User = Depends(get_current_user)):
    appointments = db.query(Appointment).filter(Appointment.clinic_id == clinic_id, Appointment.is_deleted == False).all()
    return appointments

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db), clinic_id: int = Depends(get_current_clinic), current_user: User = Depends(get_current_user)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.clinic_id == clinic_id, Appointment.is_deleted == False).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(appointment_id: int, appointment: AppointmentCreate, db: Session = Depends(get_db), clinic_id: int = Depends(get_current_clinic), current_user: User = Depends(require_role(["admin", "doctor", "receptionist"]))):
    existing = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.clinic_id == clinic_id, Appointment.is_deleted == False).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Appointment not found")
    _assert_no_overlap(
        db, clinic_id, appointment.doctor_name,
        appointment.appointment_date, appointment.duration_minutes,
        exclude_id=appointment_id,
    )
    existing.patient_id = appointment.patient_id
    existing.doctor_name = appointment.doctor_name
    existing.appointment_date = appointment.appointment_date
    existing.reason = appointment.reason
    existing.duration_minutes = appointment.duration_minutes
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db), clinic_id: int = Depends(get_current_clinic), current_user: User = Depends(require_role(["admin"]))):
    existing = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.clinic_id == clinic_id, Appointment.is_deleted == False).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Appointment not found")
    existing.is_deleted = True
    db.commit()
    return {"message": "Appointment deleted successfully"}