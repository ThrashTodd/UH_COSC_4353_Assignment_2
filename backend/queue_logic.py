"""
The queue operations is shared by patient and the administrator
"""
from fastapi import HTTPException
import queue_repository as repo
import service_repository as service_repo
import notification_logic

def _service(service_id):
    service = service_repo.get_service(service_id)
    if service is None:
        raise HTTPException(404, "Service not found")
    return service

def waiting(service_id):
    return repo.list_waiting(service_id)

def view(service_id, entries):
    return entries

def get_queue(service_id):
    service = _service(service_id)
    entries = repo.list_waiting(service_id)
    return {
        "service_id": service_id,
        "service_name": service["name"],
        "isOpen": service["isOpen"],
        "duration": service["duration"],
        "waiting_count": len(entries),
        "entries": entries,
    }

def list_queues():
    return [get_queue(service["id"]) for service in service_repo.list_services()]

def join_queue(service_id, username, priority="medium"):
    entry = repo.join_queue(service_id, username, priority)
    notification_logic.notify_joined(entry)
    notification_logic.check_almost_ready(service_id)
    return get_entry(entry["id"])

def get_entry(entry_id):
    entry = repo.get_entry(entry_id)
    if entry is None:
        raise HTTPException(404, "Active queue entry not found")
    return entry

def get_user_entry(username):
    entry = repo.get_user_entry(username)
    if entry is None:
        raise HTTPException(404, "User has no active queue")
    return entry

def leave_queue(entry_id, username):
    result = repo.leave_queue(entry_id, username)
    notification_logic.notify_left(result)
    notification_logic.check_almost_ready(result["service_id"])
    return result

def serve_next(service_id):
    result = repo.serve_next(service_id)
    notification_logic.notify_serving(result)
    notification_logic.check_almost_ready(service_id)
    return result

def remove_entry(entry_id):
    result = repo.remove_entry(entry_id)
    notification_logic.notify_removed(result)
    notification_logic.check_almost_ready(result["service_id"])
    return result

def move_entry(entry_id, direction):
    service_id = repo.move_entry(entry_id, direction)
    notification_logic.check_almost_ready(service_id)
    return get_queue(service_id)
