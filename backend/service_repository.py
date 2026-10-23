
import database


def list_services():
    return list(database.services.values())


def get_service(service_id: str):
    return database.services.get(service_id)


def create_service(service: dict):
    database.services[service["id"]] = service
    return service


def update_service(service_id: str, updates: dict):
    service = database.services.get(service_id)

    if service is None:
        return None

    service.update(updates)
    return service


def delete_service(service_id: str):
    return database.services.pop(service_id, None)
