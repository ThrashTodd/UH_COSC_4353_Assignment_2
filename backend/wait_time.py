""" Current scope is to develop a wait time calculator for the patient queue that base on the fact that each service has ONE provider, patients are served sequentially. 
This module will be used to calculate the wait time for a patient based on the current queue state and the service duration. However, the wait time calculation will be further 
improve later in the project to consider the priority of the patients in the queue. """

from fastapi import HTTPException
import queue_repository as queue_repo
import service_repository as service_repo

def _service(service_id):
    service = service_repo.get_service(service_id)
    if service is None:
        raise HTTPException(404, "Service not found")
    return service

#The wait time is calcuated as (position -1) * duration, where position is the patient's position in the queue and duration is the service duration.
def estimate_wait_minutes(position: int, duration: int) -> int:
    if type(position) is not int or position < 1:
        raise ValueError("Position must be a positive integer")
    if type(duration) is not int or duration <= 0:
        raise ValueError("Duration must be a positive integer")
    return (position - 1) * duration

#This function estimates the wait time for each patient in the queue based on their position and the service duration.  
def estimate_entries(service_id: str, entries: list[dict]) -> list[dict]:
    duration = _service(service_id)["duration"]
    return [
        {**entry,
         "estimated_wait": estimate_wait_minutes(entry.get("position") or i, duration)}
        for i, entry in enumerate(entries, start=1)
    ]

#Preview wait for the next patient along with current patients' live time estimate 
def estimate_service(service_id: str) -> dict:
    service = _service(service_id)
    entries = queue_repo.list_waiting(service_id)
    count = len(entries)
    return {
        "service_id": service_id,
        "service_name": service["name"],
        "isOpen": service["isOpen"],
        "duration": service["duration"],
        "waiting_count": count,
        "next_position": count + 1,
        "next_estimated_wait": count * service["duration"],
        "method": "single_provider_expected_duration",
        "entries": entries,
    }
