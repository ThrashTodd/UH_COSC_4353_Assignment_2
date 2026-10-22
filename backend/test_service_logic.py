from fastapi.testclient import TestClient
from main import app
import database
import service_logic

client = TestClient(app)

# python -m pytest backend/test_service_logic.py -v

def test_list_services(monkeypatch):
    # test listing services
    # mock data
    mock_db_data = {
        "support" : { "id" : "genExam", "name" : "General Exam", "description" : "General Exam" }
    }

    monkeypatch.setattr(service_logic, "services", mock_db_data)

    response = client.get('/services')

    assert response.status_code == 200
    assert response.json() == list(mock_db_data.values())

def test_get_service_success(monkeypatch):
    # test get service by id success
    # mock data
        mock_data = {
            "genExam" : { "id" : "genExam", "name" : "General Exam", "description" : "General Exam" }
        }

        monkeypatch.setattr(service_logic, "services", mock_data)

        response = client.get('/services/genExam')

        assert response.status_code == 200
        assert response.json() == { "id" : "genExam", "name" : "General Exam", "description" : "General Exam" }

def test_get_service_failure(monkeypatch):
    # test get service by id failure
    # mock data
        mock_data = {
            "genExam" : { "id" : "genExam", "name" : "General Exam", "description" : "General Exam" }
        }

        monkeypatch.setattr(service_logic, "services", mock_data)

        response = client.get('/services/missingService')

        assert response.status_code == 404
        assert response.json()['detail'] == "Service not found"

def test_create_service(monkeypatch):
       payload = {
              "name" : "Consultation",
              "description" : "General consultation meeting",
              "duration" : 30,
              "priority" : "low"
       }
       expected_service = {
              "id": "consultation",
              **payload,
              "isOpen": True
       }
       monkeypatch.setattr(service_logic, "create_service", lambda body: expected_service)

       response = client.post("/services", json=payload)

       assert response.status_code == 201
       assert response.json() == expected_service

def test_create_service_invalid_duration():
    payload = {
        "name": "Consultation",
        "description": "General consultation meeting",
        "duration": 0,
        "priority": "low",
    }

    response = client.post("/services", json=payload)

    assert response.status_code == 422


def test_create_service_invalid_priority():
    payload = {
        "name": "Consultation",
        "description": "General consultation meeting",
        "duration": 30,
        "priority": "urgent",
    }

    response = client.post("/services", json=payload)

    assert response.status_code == 422


def test_create_service_whitespace_name():
    payload = {
        "name": "   ",
        "description": "General consultation meeting",
        "duration": 30,
        "priority": "low",
    }

    response = client.post("/services", json=payload)

    assert response.status_code == 422

def test_update_service(monkeypatch):
    payload = {
        "name": "Updated Consultation",
        "description": "Updated description",
        "duration": 45,
        "priority": "high"
    }

    expected_service = {
        "id": "consultation",
        **payload,
        "isOpen": True
    }

    monkeypatch.setattr(service_logic, "update_service", lambda service_id, body: expected_service)

    response = client.put("/services/consultation", json=payload)

    assert response.status_code == 200
    assert response.json() == expected_service

def test_change_service_status(monkeypatch):
    expected_service = {
        "id": "genExam",
        "name": "General Exam",
        "isOpen": False
    }

    monkeypatch.setattr(service_logic, "change_status", lambda service_id, is_open: expected_service)

    response = client.patch("services/genExam/status", json={"isOpen": False})

    assert response.status_code == 200
    assert response.json()["isOpen"] is False

def test_delete_service(monkeypatch):
    deleted = []

    def mock_delete(service_id):
          deleted.append(service_id)

    monkeypatch.setattr(service_logic, "delete_service", mock_delete)

    response = client.delete("/services/genExam")

    assert response.status_code == 204
    assert response.content == b""
    assert deleted == ["genExam"]
    



'''
#Update an existing service by its ID
def update_service(service_id: str, data):
    service = get_service(service_id)
    service.update(data.model_dump())
    return service

#Open or close a service
def change_status(service_id: str, is_open: bool):
    service = get_service(service_id)
    service["isOpen"] = is_open
    return service

#Delete a service by its ID
def delete_service(service_id: str):
    get_service(service_id)
    del services[service_id]
'''