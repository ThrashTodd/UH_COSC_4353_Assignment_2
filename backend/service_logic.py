import re
from fastapi import HTTPException

# don't import the database instead import the service_repository
from database import services
import notification_logic
# import service_repository as repo

#Generate a unique service ID based on the service name
def make_id(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "service"
    candidate, index = base, 2
    while candidate in services:
        candidate = f"{base}-{index}"
        index += 1
    return candidate

#Get all services
def list_services():
    return list(services.values())

#Get one specific service by its ID, raise 404 if not found
def get_service(service_id: str):
    service = services.get(service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

#Create a new service
def create_service(data):
    service_id = make_id(data.name)
    service = {"id": service_id, **data.model_dump(), "isOpen": True}
    services[service_id] = service
    return service

#Update an existing service by its ID
def update_service(service_id: str, data):
    service = get_service(service_id)
    service.update(data.model_dump())
    return service

#Open or close a service
def change_status(service_id: str, is_open: bool):
    service = get_service(service_id)
    was_open = service["isOpen"]
    service["isOpen"] = is_open
    if was_open and not is_open:
        notification_logic.notify_queue_closed(service_id)
    return service

#Delete a service by its ID
def delete_service(service_id: str):
    get_service(service_id)
    del services[service_id]

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