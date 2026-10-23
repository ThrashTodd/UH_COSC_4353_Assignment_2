from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator
import notification_logic
from notification_logic import NotificationType

router = APIRouter(prefix="/notifications", tags=["notifications"])

class ReadInput(BaseModel):
    username: str = Field(min_length=1, max_length=100)

    @field_validator("username")
    @classmethod
    def not_just_whitespace(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Must not be empty or whitespace")
        return value

@router.get("")
def all_notifications(type: Optional[NotificationType] = None):
    return notification_logic.list_all(type)

@router.get("/user/{username}")
def user_notifications(username: str, unread_only: bool = False):
    return notification_logic.list_for_user(username, unread_only)

@router.get("/user/{username}/unread-count")
def user_unread_count(username: str):
    return notification_logic.unread_count(username)

@router.patch("/user/{username}/read-all")
def read_all(username: str):
    return notification_logic.mark_all_read(username)

@router.patch("/{notification_id}/read")
def read_one(notification_id: str, body: ReadInput):
    return notification_logic.mark_read(notification_id, body.username)
