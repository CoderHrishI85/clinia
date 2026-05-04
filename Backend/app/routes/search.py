from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from Backend.app.ai_db import collection
from Backend.app.core.database import get_db
from Backend.app.core.dependencies import get_current_user
from Backend.app.models.patient import Patient
from Backend.app.models.user import User
from Backend.app.schemas.patient import PatientResponse


router = APIRouter(tags=["search"])


@router.get("/search", response_model=List[PatientResponse])
def search_patients(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = collection.query(query_texts=[query], n_results=3)
    ids = results.get("ids", [[]])[0]
    if not ids:
        return []

    patient_ids = [int(patient_id) for patient_id in ids]
    patients = db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
    patients_by_id = {patient.id: patient for patient in patients}

    return [
        patients_by_id[patient_id]
        for patient_id in patient_ids
        if patient_id in patients_by_id
    ]
