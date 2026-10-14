from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import user_db

router = APIRouter()

# defines the data required for login
class LoginRequest(BaseModel):
    username: str
    password: str

# defines the data required for registration
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    username = request.username.strip()
    user = user_db.get(username)

    # if username not in database
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    # if password doesn't match database password
    if user["password"] != request.password:
        raise HTTPException(
            status_code=401,
            detail="Password incorrect"
        )
    # successful login
    return {
        "message": "Login succesful",
        "username": username,
        "role": user["role"]
    }

@router.post("/register")
def register(request: RegisterRequest):
    username = request.username.strip()
    email = request.email.strip()

    # if missing field
    if not username or not email or not request.password:
        raise HTTPException(
            status_code=400,
            detail="All fields are required"
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
    # if username taken
    if username in user_db:
        raise HTTPException(
            status_code=409,
            detail="Username taken, try again"
        )
    # success and add to database
    user_db[username] = {
        "email": email,
        "password": request.password,
        "role": "user",
        "history": []
    }

    return {
        "message": "Registration successful",
        "username": username
    }