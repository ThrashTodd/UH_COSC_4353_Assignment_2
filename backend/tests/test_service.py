import pytest
from fastapi.testclient import TestClient
from main import app
import service_logic


def test_list_services(client, test_services):

    expected_services = [
        {
            "id": service[0],
            "name": service[1],
            "description": service[2],
            "duration": service[3],
            "priority": service[4],
            "isOpen": service[5] == "open"
        }
        for service in test_services
    ]

    response = client.get('/services')

    assert response.status_code == 200
    assert sorted(response.json(), key=lambda s: s["id"]) == sorted(expected_services, key=lambda s: s["id"])


def test_get_service_success(client, test_services):

     service = test_services[0]

     expected_service = [
             {
                 "id": service[0],
                 "name": service[1],
                 "description": service[2],
                 "duration": service[3],
                 "priority": service[4],
                 "isOpen": service[5] == "open"
             }
     ]

     response = client.get('/services/gen-exam')

     assert response.status_code == 200
     assert response.json() == expected_service[0]


def test_get_service_failure(client, test_services):

    service = test_services[0]

    response = client.get('/services/bad_exam')

    assert response.status_code == 404
    assert response.json()['detail'] == "Service not found"


def test_create_service(client):

    payload = {
        "name": "Consultation",
        "description": "General consultation meeting",
        "duration": 30,
        "priority": "low",
        "isOpen": "open" == "open"
    }

    response = client.post('/services', json=payload)

    assert response.status_code == 201

    expected = payload
    expected["id"] = "consultation"

    assert response.json() == expected

    get_response = client.get('/services/consultation')

    assert get_response.status_code == 200
    assert get_response.json() == expected


def test_create_service_invalid_duration(client):

    payload = {
        "name": "Consultation",
        "description": "General consultation meeting",
        "duration": "hour",
        "priority": "low",
        "isOpen": "open" == "open"
    }
    
    response = client.post('/services', json=payload)
    
    assert response.status_code == 422


def test_create_service_invalid_priority(client):

    payload = {
        "name": "Consultation",
        "description": "General consultation meeting",
        "duration": 30,
        "priority": "huge",
        "isOpen": "open" == "open"
    }
    
    response = client.post('/services', json=payload)
    
    assert response.status_code == 422


def test_create_service_whitespace_name(client):

    payload = {
        "name": "   ",
        "description": "General consultation meeting",
        "duration": 30,
        "priority": "low",
    }
    
    response = client.post('/services', json=payload)
    
    assert response.status_code == 422

def test_update_service(client, test_services):

    service_id = "gen-exam"

    payload = {
        "name": "updated name",
        "description": "updated desc",
        "duration": 60,
        "priority": "high"
    }
    
    expected_service = payload
    expected_service["id"] = "gen-exam"
    expected_service["isOpen"] = 1

    response = client.put('/services/gen-exam', json=payload)

    assert response.status_code == 200
    assert response.json() == expected_service

    get_response = client.get('/services/gen-exam')

    assert get_response.status_code == 200
    assert get_response.json() == expected_service


def test_update_missing_service(client):

    payload = {
            "name": "updated name",
            "description": "updated desc",
            "duration": 60,
            "priority": "high"
        }

    response = client.put('/services/missing_service', json=payload)

    assert response.status_code == 404
    assert response.json()['detail'] == "Service not found"


def test_change_service_status(client, test_services):

    service = test_services[0]
    expected_service = {
            "id": service[0],
            "name": service[1],
            "description": service[2],
            "duration": service[3],
            "priority": service[4],
            "isOpen": service[5] == "false"
        }
    

    response = client.patch("/services/gen-exam/status", json={"isOpen":False})

    assert response.status_code == 200
    assert response.json()["isOpen"] is False

    get_response = client.get('/services/gen-exam')
    
    assert get_response.status_code == 200
    assert get_response.json() == expected_service


def test_delete_service(client, test_services):

    response = client.delete('/services/gen-exam')

    assert response.status_code == 204

    get_response = client.get('/services/gen-exam')

    assert get_response.status_code == 404
