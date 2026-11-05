import re
from fastapi import HTTPException
from psycopg.errors import ForeignKeyViolation, UniqueViolation
from database import queues as memory_queues  # Temporary until Queue Management migrates
import notification_logic
import service_repository as repo

#Generate a unique service ID based on the service name
def make_id(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:100] or "service"
    candidate = base
    index = 2
    while repo.get_service(candidate) is not None:
        suffix = f"-{index}"
        candidate = base[:100 - len(suffix)] + suffix
        index += 1
    return candidate


#Get all services
def list_services():
    return repo.list_services()

#Get one specific service by its ID, raise 404 if not found
def get_service(service_id: str):
    service = repo.get_service(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

#Create a new service
def create_service(data):
    new_service = {"id": make_id(data.name), **data.model_dump(), "isOpen": True}
    try:
        return repo.create_service(new_service)
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Service name or ID already exists")

#Update an existing service by its ID
def update_service(service_id: str, data):
    try:
        updated = repo.update_service(service_id, data.model_dump())
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Service name already exists")
    if updated is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return updated


#Open or close a service
def change_status(service_id: str, is_open: bool):
    previous = get_service(service_id)
    updated = repo.change_status(service_id, is_open)
    if updated is None:
        raise HTTPException(status_code=404, detail="Service not found")
    if previous["isOpen"] and not is_open:
        notification_logic.notify_queue_closed(service_id)
    return updated

#Delete a service by its ID
def delete_service(service_id: str):
    # Do not orphan patients in the old in-memory queues during migration.
    if memory_queues.get(service_id):
        raise HTTPException(status_code=409, detail="Service has active queue entries")
    try:
        deleted = repo.delete_service(service_id)
    except ForeignKeyViolation:
        raise HTTPException(status_code=409, detail="Service is referenced by queue history")
    if not deleted:
        raise HTTPException(status_code=404, detail="Service not found")


'''
#Generate a unique service ID based on the service name
def make_id(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "service"
    candidate, index = base, 2

    while repo.get_service(candidate) is not None:
        candidate = f"{base}-{index}"
        index += 1

    return candidate

#Get all services
def list_services():
    return repo.list_services()

#Get one specific service by its ID, raise 404 if not found
def get_service(service_id: str):
    service = repo.get_service(service_id)

    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")

    return service

#Create a new service
def create_service(data):
    service_id = make_id(data.name)
    service = {"id": service_id, **data.model_dump(), "isOpen": True}

    return repo.create_service(service)

#Update an existing service by its ID
def update_service(service_id: str, data):
    service = get_service(service_id)
    
    updated = repo.update_service(service_id, data.model_dump())

    if updated is None:
    raise HTTPException(status_code=404, detail="Service not found")

    return updated

#Open or close a service
def change_status(service_id: str, is_open: bool):
    service = repo.get_service(service_id)
    
    updated = repo.update_service(service_id, {"isOpen: is_Open})

    if updated is None: 
    raise HTTPException(status_code=404, detail="Service not found")

    return updated

#Delete a service by its ID
def delete_service(service_id: str):
    service = repo.get_service(service_id)

    deleted = repo.delete_service(service_id)

    if deleted is None: 
        raise HTTPException(status_code=404, detail="Service not found")
'''