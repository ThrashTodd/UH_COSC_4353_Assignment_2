from typing import Literal
from fastapi import FastAPI, Response
from pydantic import BaseModel, Field, field_validator
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
import service_logic 
import queue_logic
from database import user_db, services

app = FastAPI(title= "Queuesense API", description= "API for Queuesense, a queue management system", version= "0.1.0")
# python -m uvicorn workspace.main:app --reload --app-dir backend

# allow the frontend development server to communicate with this api
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=False,
    allow_methods=["POST", "GET", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization"]
)

#Data validation model for the service input
class ServiceInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    duration: int = Field(ge=1, le=480, strict=True)
    priority: Literal["low", "medium", "high"]

    @field_validator("name", "description")
    @classmethod
    def not_just_whitespace(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Must not be empty or whitespace")
        return value

class StatusInput(BaseModel):
    isOpen: bool


@app.get("/health")
def health():
    return {"status": "ok"}

#Get all services
@app.get("/services")
def list_services():
    return service_logic.list_services()

#Get a specific service by its ID
@app.get("/services/{service_id}")
def get_service(service_id: str):
    return service_logic.get_service(service_id)

#Create a new service
@app.post("/services", status_code=201)
def create_service(body: ServiceInput):
    return service_logic.create_service(body)

#Update an existing service by its ID
@app.put("/services/{service_id}")
def update_service(service_id: str, body: ServiceInput):
    return service_logic.update_service(service_id, body)

#Change the status of a service (open/closed) by its ID
@app.patch("/services/{service_id}/status")
def set_service_status(service_id: str, body: StatusInput):
    return service_logic.change_status(service_id, body.isOpen)

#Delete a service by its ID
@app.delete("/services/{service_id}", status_code=204)
def remove_service(service_id: str):
    service_logic.delete_service(service_id)
    return Response(status_code=204)

@app.get("/")
def root():
    return {"message": "Queuesense API is running"}

# connect the authentication routes to the app
app.include_router(auth_router)

#Queue management routes
class JoinQueueInput(BaseModel):
    service_id: str
    username: str = Field(min_length=1)
    priority: Literal["low", "medium", "high"] = "medium"

class LeaveQueueInput(BaseModel):
    username: str = Field(min_length=1)

class MoveQueueInput(BaseModel):
    direction: Literal["up", "down"]

@app.get("/queues")
def all_queues():
    return queue_logic.list_queues()

@app.get("/queues/user/{username}")
def my_queue(username: str):
    return queue_logic.get_user_entry(username)

@app.get("/queues/entries/{entry_id}")
def entry_status(entry_id: str):
    return queue_logic.get_entry(entry_id)

@app.post("/queues/join", status_code=201)
def join_queue(body: JoinQueueInput):
    return queue_logic.join_queue(body.service_id, body.username, body.priority)

@app.post("/queues/{service_id}/serve-next")
def serve_next(service_id: str):
    return queue_logic.serve_next(service_id)

@app.get("/queues/{service_id}")
def service_queue(service_id: str):
    return queue_logic.get_queue(service_id)

@app.post("/queues/entries/{entry_id}/leave")
def leave_queue(entry_id: str, body: LeaveQueueInput):
    return queue_logic.leave_queue(entry_id, body.username)

@app.delete("/queues/entries/{entry_id}")
def remove_queue_entry(entry_id: str):
    return queue_logic.remove_entry(entry_id)

@app.patch("/queues/entries/{entry_id}/move")
def move_queue_entry(entry_id: str, body: MoveQueueInput):
    return queue_logic.move_entry(entry_id, body.direction)
