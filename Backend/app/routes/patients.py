from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from Backend.app.core.database import get_db
from Backend.app.models.patient import Patient
from Backend.app.schemas.patient import PatientCreate, PatientResponse
from Backend.app.core.dependencies import get_current_user
from Backend.app.models.user import User
from typing import List

router = APIRouter(prefix="/patients", tags=["patients"])

def _patient_payload(patient: PatientCreate) -> dict:
    return patient.model_dump()

def _raise_if_patient_conflict(db: Session, patient: PatientCreate, patient_id: int | None = None) -> None:
    filters = [Patient.phone == patient.phone]
    if patient.email:
        filters.append(Patient.email == patient.email)

    query = db.query(Patient).filter(or_(*filters))
    if patient_id is not None:
        query = query.filter(Patient.id != patient_id)

    existing = query.first()
    if not existing:
        return

    if existing.phone == patient.phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    raise HTTPException(status_code=400, detail="Email already registered")

@router.get("/", response_model=List[PatientResponse])
def get_all_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Patient).all()

@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _raise_if_patient_conflict(db, patient)
    new_patient = Patient(**_patient_payload(patient))
    db.add(new_patient)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Patient phone or email already exists")
    db.refresh(new_patient)
    return new_patient

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: int, patient: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Patient).filter(Patient.id == patient_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    _raise_if_patient_conflict(db, patient, patient_id=patient_id)
    for key, value in _patient_payload(patient).items():
        setattr(existing, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Patient phone or email already exists")
    db.refresh(existing)
    return existing

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Patient).filter(Patient.id == patient_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(existing)
    db.commit()
    return {"message": "Patient deleted successfully"}
