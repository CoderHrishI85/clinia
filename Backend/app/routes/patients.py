from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from Backend.app.core.database import get_db
from Backend.app.models.patient import Patient
from Backend.app.schemas.patient import PatientCreate, PatientResponse
from Backend.app.core.dependencies import get_current_user
from Backend.app.models.user import User

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/")
def get_all_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patients = db.query(Patient).all()
    return patients

@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Patient).filter(Patient.phone == patient.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    new_patient = Patient(
        name=patient.name,
        phone=patient.phone,
        email=patient.email
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

@router.get("/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient