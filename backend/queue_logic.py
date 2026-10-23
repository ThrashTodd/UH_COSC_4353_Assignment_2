"""
The queue operations is shared by patient and the administrator
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from database import services, user_db, queues, queue_history
import notification_logic

PRIORITY = {"low": 0, "medium": 1, "high": 2}

#Support function to records the current date and time in UTC format
def timestamp():
    return datetime.now(timezone.utc).isoformat()

#Look up a service using its UNIQUE ID
def _service(service_id):
    service = services.get(service_id)
    if service is None:
        raise HTTPException(404, "Service not found")
    return service

#Get the waiting list from a particular service queue
def waiting(service_id):
    return queues.setdefault(service_id, [])

#Find a particiular queue entry 
def find(entry_id):
    for sid, entries in queues.items():
        for index, entry in enumerate(entries):
            if entry["id"] == entry_id:
                return sid, entries, index, entry
    raise HTTPException(404, "Active queue entry not found")

#Produce a list of queue entries with their positions and estimated wait times
def view(service_id, entries):
    duration = _service(service_id)["duration"]
    return [{**item, "position": idx + 1,
             "estimated_wait": idx * duration}
            for idx, item in enumerate(entries)]

#Retrive the complete information about one service's queue
def get_queue(service_id):
    service = _service(service_id)
    entries = view(service_id, waiting(service_id))
    return {"service_id": service_id, "service_name": service["name"],
            "isOpen": service["isOpen"], "duration": service["duration"],
            "waiting_count": len(entries), "entries": entries}

#Retrive the queue information for every service
def list_queues():
    return [get_queue(sid) for sid in services]

#Allow a patient to join a service queue 
def join_queue(service_id, username, priority="medium"):
    service = _service(service_id)
    if not service["isOpen"]:
        raise HTTPException(409, "This service queue is closed")
    if username not in user_db:
        raise HTTPException(404, "User not found")
    if user_db[username]["role"] != "user":
        raise HTTPException(403, "Only patients may join a queue")
    if any(e["username"] == username for q in queues.values() for e in q):
        raise HTTPException(409, "User already has an active queue entry")
    entry = {"id": str(uuid4()), "service_id": service_id,
             "username": username, "ticket": "Q-" + uuid4().hex[:8].upper(),
             "priority": priority, "joined_at": timestamp(), "status": "waiting"}
    line = waiting(service_id)
    insert_at = next((i for i, item in enumerate(line)
                      if PRIORITY[priority] > PRIORITY[item["priority"]]), len(line))
    line.insert(insert_at, entry)
    notification_logic.notify_joined(get_entry(entry["id"]))
    notification_logic.check_almost_ready(service_id)
    return get_entry(entry["id"])

#Retrieve a specific queue entry by its unique ID
def get_entry(entry_id):
    sid, entries, index, entry = find(entry_id)
    return view(sid, entries)[index]

#Retrieve the queue entry for a specific user
def get_user_entry(username):
    for q in queues.values():
        for e in q:
            if e["username"] == username:
                return get_entry(e["id"])
    raise HTTPException(404, "User has no active queue")

#Allow patients to voluntarily leave a queue they have joined
def leave_queue(entry_id, username):
    sid, entries, index, entry = find(entry_id)
    if entry["username"] != username:
        raise HTTPException(403, "Cannot leave another user's queue")
    removed = entries.pop(index)
    record = {**removed, "status": "left", "ended_at": timestamp()}
    queue_history.append(record)
    notification_logic.notify_left(record)
    notification_logic.check_almost_ready(sid)
    return record

#Allow an adminstrator to serve the first waiting patient in a service queue
def serve_next(service_id):
    _service(service_id)
    entries = waiting(service_id)
    if not entries:
        raise HTTPException(409, "Queue is empty")
    entry = entries.pop(0)
    record = {**entry, "status": "served", "ended_at": timestamp()}
    queue_history.append(record)
    notification_logic.notify_serving(record)
    notification_logic.check_almost_ready(service_id)
    return record

#Remove a specific queue entry from a service
def remove_entry(entry_id):
    sid, entries, index, entry = find(entry_id)
    entries.pop(index)
    record = {**entry, "status": "removed", "ended_at": timestamp()}
    queue_history.append(record)
    notification_logic.notify_removed(record)
    notification_logic.check_almost_ready(sid)
    return record

#Move patients up or down in a queue
def move_entry(entry_id, direction):
    sid, entries, index, entry = find(entry_id)
    other = index + (-1 if direction == "up" else 1)
    if other < 0 or other >= len(entries):
        raise HTTPException(409, "Cannot move entry farther")
    if entries[index]["priority"] != entries[other]["priority"]:
        raise HTTPException(409, "Cannot move across priority groups")
    entries[index], entries[other] = entries[other], entries[index]
    notification_logic.check_almost_ready(sid)
    return get_queue(sid)
