from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router

from database import user_db

app = FastAPI()
# python -m uvicorn main:app --reload --app-dir backend

# allow the frontend development server to communicate with this api
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"]
)

@app.get("/")
def root():
    return {"message": "Queuesense API is running"}

# connect the authentication routes to the app
app.include_router(auth_router)
