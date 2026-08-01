from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from Backend.app.core.database import get_db
from Backend.app.core.dependencies import get_current_user
from Backend.app.models.appointment import Appointment
from Backend.app.models.audit_log import AuditLog
from Backend.app.models.patient import Patient
from Backend.app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clinic_id = current_user.clinic_id
    patients_total = (
        db.query(func.count(Patient.id))
        .filter(Patient.clinic_id == clinic_id, Patient.is_deleted == False)
        .scalar()
        or 0
    )
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    appointments_today = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.clinic_id == clinic_id,
            Appointment.is_deleted == False,
            Appointment.appointment_date >= start,
            Appointment.appointment_date < end,
        )
        .scalar()
        or 0
    )
    searches_total = (
        db.query(func.count(AuditLog.id))
        .filter(AuditLog.clinic_id == clinic_id, AuditLog.action == "SEARCH")
        .scalar()
        or 0
    )
    return {
        "patients_total": patients_total,
        "appointments_today": appointments_today,
        "searches_total": searches_total,
    }
