from pydantic import BaseModel
from typing import Optional

class PatientCreate(BaseModel):
    name: str
    contact: str  # Frontend se 'contact' aayega
    email: Optional[str] = "no-email@clinia.com"

class PatientResponse(BaseModel):
    id: int
    name: str
    phone: str # DB mein 'phone' naam se save hai
    # Age aur Gender yahan se bhi hata diye taaki mismatch na ho

    class Config:
        from_attributes = True