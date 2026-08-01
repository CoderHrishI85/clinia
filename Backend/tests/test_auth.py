import uuid

from fastapi.testclient import TestClient
from Backend.app.main import app

client = TestClient(app)
TEST_EMAIL = f"test-{uuid.uuid4()}@clinia.com"

def test_register_user():
    response = client.post("/auth/register", json={
        "email": TEST_EMAIL,
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert response.json()["email"] == TEST_EMAIL

def test_login_user():
    response = client.post("/auth/login", data={
        "username": TEST_EMAIL,
        "password": "testpass123"
    })
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_login_wrong_password():
    response = client.post("/auth/login", data={
        "username": TEST_EMAIL,
        "password": "wrongpassword"
    })
    assert response.status_code == 401
