""" Current scope is to develop a wait time calculator for the patient queue that base on the fact that each service has ONE provider, patients are served sequentially. 
This module will be used to calculate the wait time for a patient based on the current queue state and the service duration. However, the wait time calculation will be further 
improve later in the project to consider the priority of the patients in the queue. """

from fastapi import HTTPException
from database import services, queues

def _duration(service_id: str) -> int:
    service = services.get(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    duration = service.get("duration")
    if type(duration) is not int or duration <= 0:
        raise HTTPException(status_code=422, detail="Service duration must be a positive integer")
    return duration

#The wait time is calcuated as (position -1) * duration, where position is the patient's position in the queue and duration is the service duration.
def estimate_wait_minutes(position: int, duration: int) -> int:
    if type(position) is not int or position < 1:
        raise ValueError("Position must be a positive integer")
    if type(duration) is not int or duration <= 0:
        raise ValueError("Duration must be a positive integer")
    return (position - 1) * duration

#This function estimates the wait time for each patient in the queue based on their position and the service duration.  
def estimate_entries(service_id: str, entries: list[dict]) -> list[dict]:
    duration = _duration(service_id)
    return [
        {**entry, "position": index, "estimated_wait": estimate_wait_minutes(index, duration)}
        for index, entry in enumerate(entries, start=1)
    ]

#Preview wait for the next patient along with current patients' live time estimate 
def estimate_service(service_id: str) -> dict:
    duration = _duration(service_id)
    service = services[service_id]
    entries = estimate_entries(service_id, queues.get(service_id, []))
    return {
        "service_id": service_id,
        "service_name": service["name"],
        "isOpen": service["isOpen"],
        "duration": duration,
        "waiting_count": len(entries),
        "next_position": len(entries) + 1,
        "next_estimated_wait": len(entries) * duration,
        "method": "single_provider_expected_duration",
        "entries": entries,
    }
