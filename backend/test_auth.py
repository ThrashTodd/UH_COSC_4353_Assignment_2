import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# python -m pytest backend/test_auth.py -v
# has depreciation warning but its a problem with fastAPI package

def test_login_success_admin():
    # admin login successful
    payload = {
        "username" : "admin1",
        "password" : "admin123"
    }
    response = client.post("/login", json=payload)

    assert response.status_code == 200

    data = response.json()
    assert data["message"] == "Login succesful"
    assert data["username"] == "admin1"
    assert data["role"] == "admin"

def test_login_success_user_with_whitespace():
    # user login successful with whitespace
    payload = {
        "username" : "   ArthurM    ",
        "password" : "passWord123"
    }
    response = client.post("/login", json=payload)

    assert response.status_code == 200

    data = response.json()
    assert data["username"] == "ArthurM"
    assert data["role"] == "user"

def test_login_user_not_found():
   # username not found in database
    payload = {
        "username": "NonExistentUser",
        "password": "some_password"
    }
    response = client.post("/login", json=payload)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_login_incorrect_password():
    """Test that an incorrect password returns a 401 error."""
    payload = {
        "username": "SophieS",
        "password": "wrong_password_123"
    }
    response = client.post("/login", json=payload)
    
    
    assert response.status_code == 401
    assert response.json()["detail"] == "Password incorrect"

def test_login_validation_error():
    """Test that a missing payload field returns a 422 validation error from FastAPI."""
    # Omitting the password field completely to trigger Pydantic schema failure
    payload = {
        "username": "admin1"
    }
    response = client.post("/login", json=payload)
    
    # FastAPI automatically responds with a 422 if the JSON body is invalid
    assert response.status_code == 422