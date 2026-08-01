from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from Backend.app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, nullable=True)
    clinic_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    status_code = Column(Integer, nullable=True)
