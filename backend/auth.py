from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg.errors import UniqueViolation

import bcrypt

from db_connection import get_connection

router = APIRouter(tags=["auth"])

# defines the data required for login
class LoginRequest(BaseModel):
    username: str
    password: str

# defines the data required for registration
class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    phone_number: str | None = None
    password: str

@router.post("/login")
def login(request: LoginRequest):
    username = request.username.strip()

    # get user from database
    with get_connection() as conn:
        with conn.cursor() as cursor:

            cursor.execute(
                """
                SELECT username, password_hash, role
                FROM user_credentials
                WHERE username = %s
                """,
                (username,)
            )

            user = cursor.fetchone()

    # user doesn't exist
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    stored_username = user[0]
    stored_hash = user[1]
    role = user[2]

    # verify password
    password_bytes = request.password.encode("utf-8")

    if(
        len(password_bytes) > 72 or 
            not bcrypt.checkpw(password_bytes, stored_hash.encode("utf-8"))
        ):
        raise HTTPException(
            status_code=401,
            detail="Password incorrect"
        )

    # successful login
    return {
        "message": "Login successful",
        "username": stored_username,
        "role": role
    }

@router.post("/register")
def register(request: RegisterRequest):
    first_name = request.first_name.strip()
    last_name = request.last_name.strip()

    username = request.username.strip()
    email = request.email.strip()

    phone = request.phone_number.strip() if request.phone_number else None

    # if missing field
    if not first_name or not last_name or not username or not email or not request.password:
        raise HTTPException(
            status_code=400,
            detail="All fields are required"
        )
    # validate email and username lengths
    if (
        len(first_name) > 100 or
        len(last_name) > 100 or
        len(username) > 50 or 
        len(email) > 255 or
        (phone is not None and len(phone) > 25)
        ):
        raise HTTPException(
            status_code=400,
            detail="One or more fields exceed the max allowed length"
        )
    # if email not valid
    if(
        "@" not in email or
        "." not in email.rsplit("@", 1)[-1] or
        any(char.isspace() for char in email)
    ):
        raise HTTPException(
            status_code=400,
            detail="Email not valid"
        )
    # if password is too short
    if len(request.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

    # bcrypt supports passwords up to 72 bytes
    password_bytes = request.password.encode("utf-8")

    if len(password_bytes) > 72:
        raise HTTPException(
            status_code= 400,
            detail="Password must not exceed 72 bytes"
        )


    # generate bcrypt password hash
    hashed_password = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")

    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:

                cursor.execute(
                    """
                    INSERT INTO user_credentials(username, email, password_hash, role)
                    VALUES(%s, %s, %s, %s)
                    RETURNING user_id
                    """,
                    (username, email, hashed_password, "user")
                )

                # get generated user_id
                user_id = cursor.fetchone()[0]

                # insert additional info into user_profile
                cursor.execute(
                    """
                    INSERT INTO user_profile(user_id, first_name, last_name, contact_number)
                    VALUES(%s, %s, %s, %s)
                    """,
                    (user_id, first_name, last_name, phone)
                )

        return {
            "message": "Registration successful",
            "username": username
        }
    except UniqueViolation:
        raise HTTPException(
            status_code= 409,
            detail= "Username or email already exists"
        )

@router.get("/users/{username}")
def get_user(username: str):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.username,
                    u.role,
                    p.first_name,
                    p.last_name
                FROM user_credentials u
                LEFT JOIN user_profile p
                    ON u.user_id = p.user_id
                WHERE u.username = %s
                """,
                (username,)
            )

            user = cursor.fetchone()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "username": user[0],
        "role": user[1],
        "first_name": user[2],
        "last_name": user[3]
    }
