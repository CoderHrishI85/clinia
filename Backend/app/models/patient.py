from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from Backend.app.core.database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=True)
    # Age aur Gender ko nullable=True rakho
   # age = Column(Integer, nullable=True)
    #gender = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())