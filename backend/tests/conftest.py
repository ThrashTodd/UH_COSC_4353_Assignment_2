import os
os.environ["TESTING"] = "true"
from db_connection import get_connection
import pytest
from main import app
from fastapi.testclient import TestClient
import bcrypt



'''
python -m pytest -v --cov=backend  
before every pytest it deletes all data and and resets auto increment for ids in the test database
'''

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(autouse=True)
def reset_test_data():

    if os.getenv("TESTING") != "true":
        raise RuntimeError("Tests must use the test database")

    with get_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                TRUNCATE TABLE
                    notification,
                    queue,
                    queue_entry,
                    queue_history,
                    service,
                    user_credentials,
                    user_profile
                """
                # removed: RESTART IDENTITY CASCADE
            )
            conn.commit()
    yield

@pytest.fixture
def test_users():

    if os.getenv("TESTING") != "true":
            raise RuntimeError("Tests must use the test database")

    users = [
        ("admin1", "Mr", "Admin", "admin@example.com", "0000000000", "admin123", "admin"),
        ("ArthurM", "Arthur", "Moore", "ArthurMoore@example.com","1111111111", "passWord123", "user"),
        ("SophieS", "Sophie", "Stevens", "SophieStevens@example.com", "2222222222", "passWord123", "user"),
        ("user1", "User", "One", "user1@example.com","3333333333", "user1_123", "user")
    ]

    with get_connection() as conn:
        with conn.cursor() as cursor:

            for username, first_name, last_name, email, phone, password, role in users:
                password_hash = bcrypt.hashpw(
                    password.encode("utf-8"),
                    bcrypt.gensalt()
                ).decode("utf-8")

                cursor.execute(
                        """
                        INSERT INTO user_credentials
                            (username, email, password_hash, role)
                        VALUES (%s, %s, %s, %s)
                        RETURNING user_id
                        """,
                        (username, email, password_hash, role)
                    )

                user_id = cursor.fetchone()[0]

                cursor.execute(
                        """
                        INSERT INTO user_profile(user_id, first_name, last_name, contact_number)
                        VALUES(%s, %s, %s, %s)
                        """,
                        (user_id, first_name, last_name, phone)
                                )

    return users

@pytest.fixture
def test_services():

    if os.getenv("TESTING") != "true":
            raise RuntimeError("Tests must use the test database")

    services = [
        (
            "gen-exam",
            "General Examination",
            "Routine dental examination and consultation.",
            20,
            "medium",
            "open"
        ),
        (
            "dental-cleaning",
            "Dental Cleaning",
            "Professional cleaning, scaling, and polishing.",
            30,
            "low",
            "open"
        ),
        (
            "er-care",
            "Emergency Care",
            "Urgent dental care.",
            15,
            "high",
            "open"
        ),
        (
            "ortho-cons",
            "Orthodontic Consultation",
            "Braces and aligner consultation.",
            30,
            "medium",
            "closed"
        )
    ]

    with get_connection() as conn:
        with conn.cursor() as cursor:

            for service in services:

                service_id, name, description, duration, priority, status = service

                cursor.execute(
                    """
                    INSERT INTO service
                        (service_id, service_name, description,
                         expected_duration, priority_level)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (service_id, name, description, duration, priority)
                )

                cursor.execute(
                    """
                    INSERT INTO queue (service_id, status)
                    VALUES (%s, %s)
                    """,
                    (service_id, status)
                )

    return services

