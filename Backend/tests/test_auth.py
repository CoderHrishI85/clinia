from fastapi.testclient import TestClient
from Backend.app.main import app

client = TestClient(app)

def test_register_user():
    response = client.post("/auth/register", json={
        "email": "testuser@clinia.com",
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "testuser@clinia.com"

def test_login_user():
    response = client.post("/auth/login", json={
        "email": "testuser@clinia.com",
        "password": "testpass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password():
    response = client.post("/auth/login", json={
        "email": "testuser@clinia.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401