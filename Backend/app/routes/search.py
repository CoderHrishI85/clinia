import logging
from itertools import zip_longest

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from Backend.app.ai_db import collection
from Backend.app.core.database import get_db
from Backend.app.core.dependencies import get_current_clinic, get_current_user
from Backend.app.core.phi import decrypt_patient
from Backend.app.models.patient import Patient
from Backend.app.models.user import User
from Backend.app.schemas.patient import PatientResponse


logger = logging.getLogger(__name__)
router = APIRouter(tags=["search"])

MAX_SEARCH_LIMIT = 50
DEFAULT_SEARCH_LIMIT = 10


class SearchPagination(BaseModel):
    offset: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=MAX_SEARCH_LIMIT)
    returned: int = Field(..., ge=0)
    has_more: bool


class PatientSearchResult(BaseModel):
    patient: PatientResponse
    similarity_score: float = Field(..., ge=0, le=1)
    distance: float | None = Field(
        default=None,
        description="Raw vector distance returned by ChromaDB. Lower is more similar.",
    )
    match_reasons: list[str] = Field(
        default_factory=list,
        description="Human-readable explanations of why the patient matched the query.",
    )


class PatientSearchResponse(BaseModel):
    query: str
    pagination: SearchPagination
    results: list[PatientSearchResult]

    model_config = ConfigDict(from_attributes=True)


def _normalize_search_query(query: str) -> str:
    normalized_query = " ".join(query.strip().split())
    if not normalized_query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query cannot be empty",
        )
    return normalized_query


def _distance_to_similarity_score(distance: float | None) -> float:
    if distance is None:
        return 0.0

    safe_distance = max(float(distance), 0.0)
    return round(1 / (1 + safe_distance), 4)


def _get_collection_count() -> int:
    try:
        return collection.count()
    except Exception as exc:
        logger.exception("Unable to read patient vector collection count")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Patient search index is temporarily unavailable",
        ) from exc


def _query_patient_vectors(
    query: str,
    *,
    offset: int,
    limit: int,
) -> tuple[list[int], dict[int, float | None], bool]:
    total_indexed_patients = _get_collection_count()
    if total_indexed_patients == 0 or offset >= total_indexed_patients:
        return [], {}, False

    requested_results = min(offset + limit + 1, total_indexed_patients)

    try:
        vector_results = collection.query(
            query_texts=[query],
            n_results=requested_results,
            include=["distances"],
        )
    except Exception as exc:
        logger.exception("ChromaDB patient search query failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Patient search index is temporarily unavailable",
        ) from exc

    raw_ids = vector_results.get("ids", [[]])[0] or []
    raw_distances = vector_results.get("distances", [[]])[0] or []

    ranked_matches: list[tuple[int, float | None]] = []
    for raw_id, raw_distance in zip_longest(raw_ids, raw_distances):
        try:
            patient_id = int(raw_id)
        except (TypeError, ValueError):
            logger.warning("Skipping invalid patient vector id: %s", raw_id)
            continue
        ranked_matches.append((patient_id, raw_distance))

    paginated_matches = ranked_matches[offset : offset + limit]
    has_more = len(ranked_matches) > offset + limit
    patient_ids = [patient_id for patient_id, _ in paginated_matches]
    distances_by_patient_id = dict(paginated_matches)

    return patient_ids, distances_by_patient_id, has_more


def _load_patients_by_rank(
    db: Session,
    patient_ids: list[int],
    clinic_id: int,
) -> list[Patient]:
    if not patient_ids:
        return []

    try:
        patients = (
            db.query(Patient)
            .filter(
                Patient.id.in_(patient_ids),
                Patient.clinic_id == clinic_id,
                Patient.is_deleted == False,
            )
            .all()
        )
    except SQLAlchemyError as exc:
        logger.exception("PostgreSQL patient lookup failed during semantic search")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load patient search results",
        ) from exc

    patients_by_id = {patient.id: patient for patient in patients}
    return [
        decrypt_patient(patients_by_id[patient_id])
        for patient_id in patient_ids
        if patient_id in patients_by_id
    ]


def _build_match_reasons(query: str, patient: Patient) -> list[str]:
    """Explain why a patient matched — token overlap with record fields."""
    reasons: list[str] = []
    query_tokens = [token for token in query.lower().split() if token]

    name = patient.name or ""
    if any(token in name.lower() for token in query_tokens):
        reasons.append("name matches")

    if patient.phone and any(token.isdigit() and token in patient.phone for token in query_tokens):
        reasons.append("phone matches")

    for field, label in (
        (patient.medical_history, "medical history"),
        (patient.notes, "notes"),
    ):
        if field:
            lowered = field.lower()
            matched = next((token for token in query_tokens if len(token) > 2 and token in lowered), None)
            if matched:
                reasons.append(f"{label} mentions '{matched}'")

    if patient.gender and any(token == patient.gender.lower() for token in query_tokens):
        reasons.append("gender matches")
    if patient.age is not None and any(token == str(patient.age) for token in query_tokens):
        reasons.append("age matches")

    return reasons[:3]


def _build_search_response(
    *,
    query: str,
    offset: int,
    limit: int,
    patients: list[Patient],
    distances_by_patient_id: dict[int, float | None],
    has_more: bool,
) -> PatientSearchResponse:
    results = [
        PatientSearchResult(
            patient=PatientResponse.model_validate(patient),
            similarity_score=_distance_to_similarity_score(
                distances_by_patient_id.get(patient.id)
            ),
            distance=distances_by_patient_id.get(patient.id),
            match_reasons=_build_match_reasons(query, patient),
        )
        for patient in patients
    ]

    return PatientSearchResponse(
        query=query,
        pagination=SearchPagination(
            offset=offset,
            limit=limit,
            returned=len(results),
            has_more=has_more,
        ),
        results=results,
    )


@router.get("/search", response_model=PatientSearchResponse)
def search_patients(
    query: str = Query(..., min_length=1, max_length=300),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=DEFAULT_SEARCH_LIMIT, ge=1, le=MAX_SEARCH_LIMIT),
    db: Session = Depends(get_db),
    clinic_id: int = Depends(get_current_clinic),
    current_user: User = Depends(get_current_user),
) -> PatientSearchResponse:
    _ = current_user
    normalized_query = _normalize_search_query(query)
    patient_ids, distances_by_patient_id, has_more = _query_patient_vectors(
        normalized_query,
        offset=offset,
        limit=limit,
    )
    patients = _load_patients_by_rank(db, patient_ids, clinic_id)

    return _build_search_response(
        query=normalized_query,
        offset=offset,
        limit=limit,
        patients=patients,
        distances_by_patient_id=distances_by_patient_id,
        has_more=has_more,
    )
