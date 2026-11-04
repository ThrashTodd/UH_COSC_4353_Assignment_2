import pytest
from fastapi.testclient import TestClient
from main import app
from db_connection import get_connection
import bcrypt

# python -m pytest -v
# has depreciation warning but its a problem with fastAPI package

def test_login_success_admin(client, test_users):

    payload = {
        "username": "admin1",
        "password": "admin123"
    }

    response = client.post("/login", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["message"] == "Login successful"
    assert data["username"] == "admin1"
    assert data["role"] == "admin"


def test_login_success_user_with_whitespace(client, test_users):

    payload = {
        "username": "   ArthurM   ",
        "password": "passWord123"
    }

    response = client.post("/login", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["username"] == "ArthurM"
    assert data["role"] == "user"


def test_login_user_not_found(client, test_users):

    payload = {
        "username": "NonUser",
        "password": "password"
    }

    response = client.post("/login", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_login_incorrect_password(client, test_users):

    payload = {
        "username": "SophieS",
        "password": "wrong_password_123"
    }

    response = client.post("/login", json=payload)

    assert response.status_code == 401
    assert response.json()["detail"] == "Password incorrect"


def test_login_validation_error(client):

    payload = {
        "username": "admin1"
    }

    response = client.post("/login", json=payload)

    assert response.status_code == 422

def test_register_success(client):

    payload = {
        "first_name": "John",
        "last_name": "Skyrim",
        "username": "johnskyrim",
        "email": "john@example.com",
        "phone_number": "1234567890",
        "password": "Password123"
    }

    response = client.post("/register", json=payload)

    assert response.status_code == 200

    assert response.json() == {
        "message": "Registration successful",
        "username": "johnskyrim"
    }
    with get_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT user_id, password_hash, role
                FROM user_credentials
                WHERE username = %s
                """, ("johnskyrim",)
            )

            user = cursor.fetchone()

            assert user is not None
            assert user[2] == "user"

            assert bcrypt.checkpw(
                b"Password123",
                user[1].encode("utf-8")
            )

            cursor.execute(
                """
                SELECT first_name, last_name, contact_number
                FROM user_profile
                WHERE user_id = %s
                """, (user[0],)
            )

            profile = cursor.fetchone()

            assert profile == (
                "John",
                "Skyrim",
                "1234567890"
            )
    