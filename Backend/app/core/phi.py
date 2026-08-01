import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from Backend.app.core.config import get_settings

settings = get_settings()
_fernet_instance = None

PHI_FIELDS = ("medical_history", "notes")


def _get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        if settings.phi_encryption_key:
            _fernet_instance = Fernet(settings.phi_encryption_key.encode())
        else:
            digest = hashlib.sha256(settings.secret_key.encode()).digest()
            _fernet_instance = Fernet(base64.urlsafe_b64encode(digest))
    return _fernet_instance


def encrypt_text(value: str | None) -> str | None:
    if not value:
        return value
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_text(value: str | None) -> str | None:
    if not value:
        return value
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        # Pre-encryption rows are plaintext; wrong key surfaces as unchanged value.
        return value


def encrypt_payload(payload: dict) -> dict:
    for field in PHI_FIELDS:
        if field in payload:
            payload[field] = encrypt_text(payload.get(field))
    return payload


def decrypt_patient(patient) -> object:
    for field in PHI_FIELDS:
        value = getattr(patient, field, None)
        if value:
            setattr(patient, field, decrypt_text(value))
    return patient
