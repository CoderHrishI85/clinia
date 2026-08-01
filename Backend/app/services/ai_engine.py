"""Hybrid AI engine for Clinia.

Deterministic heuristics by default (zero dependencies, offline demo-safe).
When OPENAI_API_KEY is set AND the `openai` package is importable, the LLM
generates prose for summarize / SOAP / follow-up, with a safe fallback to the
deterministic path on any error. No-show prediction is always deterministic.
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, time

from Backend.app.core.config import get_settings

try:
    import openai as _openai
except ImportError:  # pragma: no cover
    _openai = None

settings = get_settings()


# ---------------------------------------------------------------------------
# LLM bridge (optional)
# ---------------------------------------------------------------------------

def _llm_available() -> bool:
    return bool(settings.openai_api_key) and _openai is not None


def _llm_json(system_prompt: str, user_prompt: str) -> dict | None:
    """Return parsed JSON dict from the LLM, or None on any failure."""
    if not _llm_available():
        return None
    try:
        client = _openai.OpenAI(api_key=settings.openai_api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = completion.choices[0].message.content or ""
        return json.loads(raw)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Conditions / risk factors
# ---------------------------------------------------------------------------

CONDITIONS: dict[str, dict] = {
    "diabetes": {"factor": "Diabetes", "severity": "medium"},
    "hypertension": {"factor": "Hypertension", "severity": "medium"},
    "high bp": {"factor": "Hypertension", "severity": "medium"},
    "blood pressure": {"factor": "Hypertension", "severity": "medium"},
    "asthma": {"factor": "Asthma", "severity": "medium"},
    "allergy": {"factor": "Known Allergy", "severity": "low"},
    "penicillin": {"factor": "Penicillin Allergy", "severity": "high"},
    "cardiac": {"factor": "Cardiac Condition", "severity": "high"},
    "heart": {"factor": "Cardiac Condition", "severity": "high"},
    "thyroid": {"factor": "Thyroid Disorder", "severity": "low"},
    "epilepsy": {"factor": "Epilepsy", "severity": "high"},
    "anemia": {"factor": "Anemia", "severity": "low"},
    "arthritis": {"factor": "Arthritis", "severity": "low"},
    "depression": {"factor": "Depression", "severity": "medium"},
    "kidney": {"factor": "Kidney Condition", "severity": "high"},
    "renal": {"factor": "Kidney Condition", "severity": "high"},
    "liver": {"factor": "Liver Condition", "severity": "medium"},
    "hepatic": {"factor": "Liver Condition", "severity": "medium"},
    "migraine": {"factor": "Migraine", "severity": "low"},
    "stroke": {"factor": "Stroke History", "severity": "high"},
    "cancer": {"factor": "Cancer History", "severity": "high"},
}

_NORMALIZE_RE = re.compile(r"[^a-z0-9 ]")


def _norm(text: str) -> str:
    return _NORMALIZE_RE.sub(" ", text.lower())


def _extract_conditions(text: str | None) -> list[dict]:
    if not text:
        return []
    normalized = _norm(text)
    found: dict[str, dict] = {}
    for keyword, info in CONDITIONS.items():
        if _norm(keyword) in normalized:
            found.setdefault(info["factor"], info)
    return list(found.values())


# ---------------------------------------------------------------------------
# Summarize patient
# ---------------------------------------------------------------------------

def summarize_patient(patient) -> dict:
    history = patient.medical_history or ""
    notes = patient.notes or ""
    conditions = _extract_conditions(history + " " + notes)

    name = patient.name or "Patient"
    age = f"{patient.age}-year-old" if patient.age else "Adult"
    gender = patient.gender or ""
    profile = f"{name}, {age}{' ' + gender.lower() if gender else ''}"

    history_text = history.strip() or "no documented medical history"
    if len(history_text) > 140:
        history_text = history_text[:137].rsplit(" ", 1)[0] + "…"
    note_text = notes.strip() or "no clinical notes on file"

    summary = [
        f"{profile} with {len(conditions)} flagged condition(s): {', '.join(c['factor'] for c in conditions) or 'none on record'}.",
        f"History: {history_text}.",
        f"Note: {note_text}.",
    ]

    if _llm_available():
        result = _llm_json(
            "You are a medical assistant. Return a JSON object with keys "
            '"summary" (array of exactly 3 concise executive bullets) and '
            '"risk_factors" (array of {factor, severity, detail}). Be factual, no invention.',
            json.dumps({
                "name": name,
                "age": patient.age,
                "gender": gender,
                "medical_history": history,
                "notes": notes,
            }),
        )
        if isinstance(result, dict) and isinstance(result.get("summary"), list):
            bullets = result.get("summary")
            if len(bullets) == 3 and all(isinstance(b, str) for b in bullets):
                summary = bullets

    risk_factors = [
        {**rf, "detail": rf.get("detail") or "Flagged from the patient record."}
        for rf in conditions
    ] or [
        {"factor": "None on record", "severity": "low",
         "detail": "No chronic conditions found in the patient record."}
    ]
    return {"summary": summary, "risk_factors": risk_factors}


# ---------------------------------------------------------------------------
# SOAP notes
# ---------------------------------------------------------------------------

_SOAP_KEYWORDS = {
    "subjective": {
        "symptom", "complains", "complaint", "reports", "feels", "feeling",
        "pain", "cough", "fever", "headache", "nausea", "dizzy", "dizziness",
        "fatigue", "tired", "aches", "sore", "shortness of breath", "breathing",
        "appetite", "sleep", "itch",
    },
    "objective": {
        "vitals", "bp", "blood pressure", "temp", "temperature", "pulse",
        "exam", "examination", "observed", "lab", "labs", "hba1c", "wbc",
        "weight", "height", "auscultation", "cbc", "urine", "sugar", "spo2",
        "bmi", "ecg",
    },
    "assessment": {
        "diagnosis", "diagnosed", "impression", "likely", "consistent with",
        "suggests", "suggestive", "differential", "rule out", "acute", "chronic",
        "condition", "infection", "indicates", "compatible with",
    },
    "plan": {
        "prescribe", "prescribed", "medication", "follow-up", "follow up",
        "refer", "referral", "plan", "advise", "advised", "return", "monitoring",
        "review", "repeat", "dosage", "dosage", "lifestyle", "rest", "hydrate",
        "recheck", "schedule",
    },
}


def _split_sentences(raw: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", raw.strip())
    return [p.strip() for p in parts if p.strip()]


def _classify_sentence(sentence: str) -> str | None:
    tokens = _norm(sentence)
    for section, keywords in _SOAP_KEYWORDS.items():
        if any(_norm(kw) in tokens for kw in keywords):
            return section
    return None


def generate_soap_notes(raw: str) -> dict:
    sentences = _split_sentences(raw)
    sections: dict[str, list[str]] = {
        "subjective": [], "objective": [], "assessment": [], "plan": [],
    }

    for index, sentence in enumerate(sentences):
        section = _classify_sentence(sentence)
        if section is None:
            # Positional fallback: opening lines are usually subjective,
            # closing lines are usually the plan, everything else assessment.
            if index <= len(sentences) // 3:
                section = "subjective"
            elif index >= (2 * len(sentences)) // 3:
                section = "plan"
            else:
                section = "assessment"
        sections[section].append(sentence)

    return {"sections": sections}


# ---------------------------------------------------------------------------
# No-show prediction (always deterministic)
# ---------------------------------------------------------------------------

RISK_LOW = "LOW"
RISK_MEDIUM = "MEDIUM"
RISK_HIGH = "HIGH"


def _slot_hour(appointment) -> int:
    dt = appointment.appointment_date
    if dt.tzinfo is None:
        return dt.hour
    return dt.astimezone().hour


def _slot_weekday(appointment) -> int:
    dt = appointment.appointment_date
    if dt.tzinfo is None:
        return dt.weekday()
    return dt.astimezone().weekday()


def predict_noshow(appointment, patient, completed_count: int, missed_count: int) -> dict:
    if appointment.status == "cancelled":
        return {
            "score": 0,
            "risk": RISK_LOW,
            "reasons": ["This appointment has already been cancelled."],
            "recommendations": ["Reschedule if the patient still needs care."],
        }

    score = 30
    reasons: list[str] = []
    recommendations: list[str] = []

    # Visit history.
    if missed_count:
        penalty = min(missed_count * 12, 30)
        score += penalty
        reasons.append(f"{missed_count} missed or cancelled visit(s) in history (+{penalty}).")
    if completed_count:
        credit = min(completed_count * 4, 20)
        score -= credit
        reasons.append(f"{completed_count} completed visit(s) on record (−{credit}).")

    # Slot time.
    hour = _slot_hour(appointment)
    if hour < 9:
        score += 10
        reasons.append("Early-morning slot (<9am) raises no-show likelihood (+10).")
    elif 13 <= hour <= 15:
        score += 8
        reasons.append("Lunch-hour slot (1–3pm) raises no-show likelihood (+8).")
    elif hour >= 17:
        score += 6
        reasons.append("Late-day slot (after 5pm) raises no-show likelihood (+6).")

    # Day of week.
    weekday = _slot_weekday(appointment)
    if weekday == 0:
        score += 8
        reasons.append("Monday slots historically show higher no-shows (+8).")
    elif weekday == 4:
        score += 6
        reasons.append("Friday slots historically show higher no-shows (+6).")

    # Age.
    if patient.age is not None:
        if patient.age < 18:
            score += 5
            reasons.append("Pediatric patient — higher no-show baseline (+5).")
        elif patient.age >= 65:
            score += 6
            reasons.append("Geriatric patient — mobility/transport risk (+6).")

    # Recency.
    today = date.today()
    appt_date = appointment.appointment_date.date() if appointment.appointment_date.tzinfo is None else appointment.appointment_date.date()
    days_until = (appt_date - today).days
    if days_until > 7:
        score += 6
        reasons.append("Appointment is more than a week away (+6).")
    elif days_until <= 1:
        score -= 8
        reasons.append("Appointment is within 24 hours — attendance likely (−8).")

    score = max(0, min(100, score))
    if score >= 70:
        risk = RISK_HIGH
    elif score >= 40:
        risk = RISK_MEDIUM
    else:
        risk = RISK_LOW

    if not reasons:
        reasons.append("No strong risk factors detected from the patient record.")

    if risk == RISK_HIGH:
        recommendations.append("Send a reminder and offer a quick reschedule option.")
        recommendations.append("Consider a phone confirmation 24 hours ahead.")
    elif risk == RISK_MEDIUM:
        recommendations.append("Send a WhatsApp/email reminder 24 hours before the slot.")
    else:
        recommendations.append("Standard reminder is sufficient for this patient.")

    return {"score": score, "risk": risk, "reasons": reasons, "recommendations": recommendations}


# ---------------------------------------------------------------------------
# Follow-up draft
# ---------------------------------------------------------------------------

def _first_name(name: str | None) -> str:
    return (name or "there").split()[0].strip() or "there"


def _fmt_datetime(appointment) -> str:
    dt = appointment.appointment_date
    if dt.tzinfo is not None:
        dt = dt.astimezone()
    return dt.strftime("%A, %d %b %Y at %H:%M")


def draft_followup(patient, appointment, channel: str, kind: str) -> dict:
    first = _first_name(patient.name)
    doctor = appointment.doctor_name
    when = _fmt_datetime(appointment)
    reason = appointment.reason or "your appointment"
    clinic = "Clinia Clinic"

    if channel == "email":
        subject = "Your appointment reminder" if kind == "reminder" else "Post-care follow-up"
        if kind == "reminder":
            message = (
                f"Hi {first},\n\n"
                f"This is a friendly reminder from {clinic} about your upcoming appointment "
                f"with Dr. {doctor} on {when} ({reason}).\n\n"
                f"Please arrive 10 minutes early. If you need to reschedule, reply to this "
                f"email or call us — we are happy to help.\n\n"
                f"Kind regards,\n{clinic}"
            )
        else:
            message = (
                f"Hi {first},\n\n"
                f"Thank you for visiting Dr. {doctor} at {clinic} for {reason}.\n"
                f"Following up on your care: if you experience any new or worsening "
                f"symptoms, please contact us. Continue any prescribed treatment as advised.\n\n"
                f"Take care,\n{clinic}"
            )
    else:  # whatsapp
        subject = None
        if kind == "reminder":
            message = (
                f"Hi {first}! 👋 This is a reminder from {clinic} about your appointment "
                f"with Dr. {doctor} on {when} ({reason}). Reply R to confirm, or contact us "
                f"to reschedule."
            )
        else:
            message = (
                f"Hi {first}! We hope your visit with Dr. {doctor} ({reason}) went well. "
                f"Please reach out if you have any questions about your care plan. "
                f"Stay well! 🌿"
            )

    if _llm_available():
        result = _llm_json(
            "You are a healthcare communication assistant. Return a JSON object "
            'with keys {"message": string, "subject": string|null}. '
            "Friendly, concise, HIPAA-conscious (no diagnoses in the body).",
            json.dumps({
                "patient_first_name": first,
                "doctor": doctor,
                "appointment": when,
                "reason": reason,
                "channel": channel,
                "kind": kind,
            }),
        )
        if isinstance(result, dict) and isinstance(result.get("message"), str):
            message = result["message"]
            subject = result.get("subject") or subject

    return {"channel": channel, "subject": subject, "message": message, "character_count": len(message)}


# ---------------------------------------------------------------------------
# Summarize today
# ---------------------------------------------------------------------------

def summarize_today(appointments_with_patients: list) -> dict:
    rows = []
    for appointment, patient, no_show in appointments_with_patients:
        dt = appointment.appointment_date
        if dt.tzinfo is not None:
            dt = dt.astimezone()
        rows.append({
            "patient_name": patient.name,
            "doctor": appointment.doctor_name,
            "time": dt.strftime("%H:%M"),
            "reason": appointment.reason,
            "risk": no_show["risk"],
        })
    rows.sort(key=lambda row: row["time"])
    return {"date": date.today().isoformat(), "patients": rows}
