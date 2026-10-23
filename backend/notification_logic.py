import logging
from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import uuid4
from fastapi import HTTPException
from pydantic import BaseModel, Field
from database import notifications, user_db, services, queues

logger = logging.getLogger("queuesense.notifications")

#almost ready 
ALMOST_READY_POSITION = 2
ALMOST_READY_MINUTES = 5

NotificationType = Literal["joined", "almost_ready", "serving", "left", "removed", "queue_closed"]

#for db structure
class Notification(BaseModel):
    id: str
    username: str = Field(min_length=1)
    type: NotificationType
    title: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=255)
    service_id: Optional[str] = None
    ticket: Optional[str] = None
    created_at: str
    read: bool = False


def timestamp():
    return datetime.now(timezone.utc).isoformat()

def service_name(service_id):
    service = services.get(service_id)
    return service["name"] if service else "your service"

def create_notification(username, type, title, message, service_id=None, ticket=None):
    note = Notification(id=str(uuid4()), username=username, type=type, title=title,
                        message=message, service_id=service_id, ticket=ticket,
                        created_at=timestamp())
    record = note.model_dump()
    notifications.append(record)
    logger.info("Notification to %s [%s]: %s", username, type, message)
    return record


def notify_joined(entry):
    name = service_name(entry["service_id"])
    return create_notification(
        entry["username"], "joined", "You joined a queue",
        f"You joined the {name} queue. Ticket {entry['ticket']}, position #{entry['position']}, "
        f"estimated wait ~{entry['estimated_wait']} min.",
        entry["service_id"], entry["ticket"])

#user left queue
def notify_left(record):
    return create_notification(
        record["username"], "left", "You left the queue",
        f"You left the {service_name(record['service_id'])} queue. Your spot has been released.",
        record["service_id"], record["ticket"])
def notify_serving(record):
    return create_notification(
        record["username"], "serving", "It's your turn",
        f"It's your turn for {service_name(record['service_id'])}. Please go to the front desk.",
        record["service_id"], record["ticket"])

def notify_removed(record):
    return create_notification(
        record["username"], "removed", "Removed from queue",
        f"You were removed from the {service_name(record['service_id'])} queue. "
        "Please see the front desk if this is a mistake.",
        record["service_id"], record["ticket"])

#admin closed a queue
def notify_queue_closed(service_id):
    name = service_name(service_id)
    return [create_notification(
                entry["username"], "queue_closed", "Queue closed",
                f"The {name} queue is now closed to new patients. You keep your current spot.",
                service_id, entry["ticket"])
            for entry in queues.get(service_id, [])]

def check_almost_ready(service_id):
    import queue_logic  
    line = queue_logic.waiting(service_id)
    sent = []
    for entry, info in zip(line, queue_logic.view(service_id, line)):
        if entry.get("almost_ready_sent"):
            continue
        if info["position"] <= ALMOST_READY_POSITION or info["estimated_wait"] <= ALMOST_READY_MINUTES:
            entry["almost_ready_sent"] = True
            entry["status"] = "almost-ready"
            if info["position"] == 1:
                message = f"You're next for {service_name(service_id)}! Please stay near the front desk."
            else:
                message = (f"You're almost up for {service_name(service_id)} (position #{info['position']}, "
                           f"~{info['estimated_wait']} min). Please stay near the front desk.")
            sent.append(create_notification(entry["username"], "almost_ready", "Almost your turn",
                                            message, service_id, entry["ticket"]))
    return sent


def _check_user(username):
    if username not in user_db:
        raise HTTPException(404, "User not found")

def list_for_user(username, unread_only=False):
    _check_user(username)
    items = [n for n in notifications
             if n["username"] == username and not (unread_only and n["read"])]
    return list(reversed(items))

def unread_count(username):
    _check_user(username)
    return {"username": username,
            "unread": sum(1 for n in notifications if n["username"] == username and not n["read"])}

def mark_read(notification_id, username):
    for n in notifications:
        if n["id"] == notification_id:
            if n["username"] != username:
                raise HTTPException(403, "Cannot update another user's notification")
            n["read"] = True
            return n
    raise HTTPException(404, "Notification not found")

def mark_all_read(username):
    _check_user(username)
    updated = 0
    for n in notifications:
        if n["username"] == username and not n["read"]:
            n["read"] = True
            updated += 1
    return {"username": username, "updated": updated}
def list_all(type=None):
    return [n for n in reversed(notifications) if type is None or n["type"] == type]
