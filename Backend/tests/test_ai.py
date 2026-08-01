import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from Backend.app.main import app

client = TestClient(app)
TEST_EMAIL = f"ai-test-{uuid.uuid4()}@clinia.com"
TEST_PASSWORD = "testpass123"

# Register + login ONCE per process. The TestClient keeps the session cookie for
# all tests, and one login keeps us well under the /auth/login rate limit.
_reg = client.post("/auth/register", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
assert _reg.status_code == 200, _reg.text
_login = client.post("/auth/login", data={"username": TEST_EMAIL, "password": TEST_PASSWORD})
assert _login.status_code == 200, _login.text


def _create_patient_and_appointment():
    stamp = str(uuid.uuid4().int % 10**8).zfill(8)
    patient = client.post("/patients", json={
        "name": "Aravind Test",
        "phone": f"+91 9{stamp[:4]} {stamp[4:]}",
        "email": f"aravind-{stamp}@clinia.com",
        "age": 42,
        "gender": "male",
        "medical_history": "Type 2 diabetes and hypertension, allergic to penicillin.",
        "notes": "Follow-up after last visit.",
    })
    assert patient.status_code == 200, patient.text
    patient_id = patient.json()["id"]

    appointment = client.post("/appointments", json={
        "patient_id": patient_id,
        "doctor_name": f"Dr. {stamp[:6]}",
        "appointment_date": (datetime.now() + timedelta(days=3)).isoformat(),
        "reason": "diabetes review",
        "duration_minutes": 30,
    })
    assert appointment.status_code == 200, appointment.text
    appointment_id = appointment.json()["id"]
    return patient_id, appointment_id


def test_ai_summarize_patient():
    patient_id, _ = _create_patient_and_appointment()

    response = client.get(f"/ai/summarize-patient/{patient_id}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["patient_id"] == patient_id
    assert len(body["summary"]) == 3
    assert any(rf["factor"] == "Diabetes" for rf in body["risk_factors"])
    assert body["risk_factors"][0]["severity"] in ("low", "medium", "high")


def test_ai_summarize_patient_404():
    response = client.get("/ai/summarize-patient/999999")
    assert response.status_code == 404


def test_ai_generate_soap_notes():
    response = client.post("/ai/generate-soap-notes", json={
        "raw_notes": (
            "Patient reports fever and persistent cough since 3 days. "
            "Temp is 101.2F, pulse 92. "
            "Likely viral infection. "
            "Prescribe paracetamol and advise rest, follow-up in 3 days."
        ),
    })
    assert response.status_code == 200, response.text
    body = response.json()
    sections = body["sections"]
    assert set(sections.keys()) == {"subjective", "objective", "assessment", "plan"}
    assert sections["subjective"], "expected subjective sentences"
    assert sections["plan"], "expected plan sentences"
    assert body["summary"]


def test_ai_generate_soap_notes_blank():
    response = client.post("/ai/generate-soap-notes", json={"raw_notes": ""})
    assert response.status_code in (422, 400)


def test_ai_predict_noshow():
    _, appointment_id = _create_patient_and_appointment()

    response = client.get(f"/ai/predict-noshow/{appointment_id}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["appointment_id"] == appointment_id
    assert 0 <= body["score"] <= 100
    assert body["risk"] in ("LOW", "MEDIUM", "HIGH")
    assert body["reasons"]


def test_ai_predict_noshow_404():
    response = client.get("/ai/predict-noshow/999999")
    assert response.status_code == 404


def test_ai_draft_followup():
    _, appointment_id = _create_patient_and_appointment()

    for channel in ("whatsapp", "email"):
        response = client.post("/ai/draft-followup", json={
            "appointment_id": appointment_id,
            "channel": channel,
            "kind": "reminder",
        })
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["channel"] == channel
        assert body["message"]
        assert body["character_count"] == len(body["message"])


def test_ai_summarize_today():
    _create_patient_and_appointment()

    response = client.get("/ai/summarize-today")
    assert response.status_code == 200, response.text
    body = response.json()
    assert "date" in body
    assert isinstance(body["patients"], list)
