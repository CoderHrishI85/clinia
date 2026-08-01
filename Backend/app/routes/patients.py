from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from Backend.app.ai_db import collection
from Backend.app.core.dependencies import (
    get_current_clinic,
    get_current_user,
    require_role,
)
from Backend.app.core.database import get_db
from Backend.app.core.phi import decrypt_patient, encrypt_payload
from Backend.app.models.patient import Patient
from Backend.app.models.user import User
from Backend.app.schemas.patient import (
    PatientCreate,
    PatientDeleteResponse,
    PatientResponse,
    PatientUpdate,
)

router = APIRouter(prefix="/patients", tags=["patients"])


def _create_payload(patient: PatientCreate) -> dict[str, Any]:
    return patient.model_dump()


def _update_payload(patient: PatientUpdate) -> dict[str, Any]:
    return patient.model_dump(exclude_unset=True, exclude_none=True)


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
    return patient


def _patient_search_text(patient: Patient) -> str:
    parts = [
        f"Name: {patient.name}",
        f"Phone: {patient.phone}",
        f"Email: {patient.email}" if patient.email else None,
        f"Age: {patient.age}" if patient.age is not None else None,
        f"Gender: {patient.gender}" if patient.gender else None,
    ]
    return ". ".join(part for part in parts if part)


def _sync_patient_search(patient: Patient) -> None:
    collection.upsert(
        documents=[_patient_search_text(patient)],
        ids=[str(patient.id)],
    )


def _delete_patient_search(patient_id: int) -> None:
    collection.delete(ids=[str(patient_id)])


def _raise_if_patient_conflict(
    db: Session,
    payload: dict[str, Any],
    clinic_id: int,
    patient_id: int | None = None,
) -> None:
    filters = []
    if "phone" in payload:
        filters.append(Patient.phone == payload["phone"])
    if payload.get("email"):
        filters.append(Patient.email == payload["email"])

    if not filters:
        return

    query = db.query(Patient).filter(
        or_(*filters),
        Patient.clinic_id == clinic_id,
        Patient.is_deleted == False,
    )
    if patient_id is not None:
        query = query.filter(Patient.id != patient_id)

    existing = query.first()
    if not existing:
        return

    if existing.phone == payload.get("phone"):
        raise HTTPException(status_code=400, detail="Phone number already registered")
    raise HTTPException(status_code=400, detail="Email already registered")


def _commit_patient(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Patient phone or email already exists")


@router.get("", response_model=list[PatientResponse])
def get_all_patients(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(get_current_user),
):
    patients = (
        db.query(Patient)
        .filter(Patient.clinic_id == clinic_id, Patient.is_deleted == False)
        .order_by(Patient.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [decrypt_patient(p) for p in patients]


@router.post("", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(require_role(["admin", "doctor", "receptionist"])),
):
    payload = encrypt_payload(_create_payload(patient))
    _raise_if_patient_conflict(db, payload, clinic_id)

    new_patient = Patient(**payload, clinic_id=clinic_id)
    db.add(new_patient)
    _commit_patient(db)
    db.refresh(new_patient)
    _sync_patient_search(new_patient)
    return decrypt_patient(new_patient)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(get_current_user),
):
    return decrypt_patient(_get_patient_or_404(db, patient_id, clinic_id))


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient: PatientUpdate,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(require_role(["admin", "doctor", "receptionist"])),
):
    existing = _get_patient_or_404(db, patient_id, clinic_id)
    payload = encrypt_payload(_update_payload(patient))
    if not payload:
        raise HTTPException(status_code=400, detail="No patient fields provided")

    _raise_if_patient_conflict(db, payload, clinic_id, patient_id=patient_id)
    for key, value in payload.items():
        setattr(existing, key, value)

    _commit_patient(db)
    db.refresh(existing)
    _sync_patient_search(existing)
    return decrypt_patient(existing)


@router.delete("/{patient_id}", response_model=PatientDeleteResponse)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(require_role(["admin"])),
):
    existing = _get_patient_or_404(db, patient_id, clinic_id)
    existing.is_deleted = True
    _commit_patient(db)
    _delete_patient_search(patient_id)
    return {"message": "Patient deleted successfully"}
