from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from Backend.app.core.database import get_db
from Backend.app.models.patient import Patient
from Backend.app.schemas.patient import PatientCreate, PatientResponse
# from Backend.app.core.dependencies import get_current_user # Auth bypass ke liye comment kiya
from Backend.app.models.user import User

router = APIRouter(prefix="/patients", tags=["patients"])

# 1. GET ALL PATIENTS (Auth bypassed)
@router.get("/")
def get_all_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return patients

# 2. CREATE PATIENT (Auth bypassed & Cleaned)
@router.post("/", response_model=PatientResponse)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    # Check if phone already exists
    existing = db.query(Patient).filter(Patient.phone == patient.contact).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    new_patient = Patient(
        name=patient.name,
        phone=patient.contact, # <--- Frontend 'contact' ko DB 'phone' mein map kiya
        age=patient.age,
        gender=patient.gender,
        email=patient.email
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient

# 3. GET SINGLE PATIENT
@router.get("/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

# 4. DELETE PATIENT
@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter(Patient.id == patient_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(existing)
    db.commit()
    return {"message": "Patient deleted successfully"}