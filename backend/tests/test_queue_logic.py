import pytest
from fastapi.testclient import TestClient
from main import app
import database
import queue_logic

client = TestClient(app)

def test_list_queues(monkeypatch):
    mock_queue = [
        {
            "service_id": "genExam",
            "service_name": "General Exam",
            "isOpen": True,
            "duration": 20,
            "waiting_count": 0,
            "entries": []
        }
    ]

    monkeypatch.setattr(queue_logic, "list_queues", lambda: mock_queue)

    response = client.get("/queues")

    assert response.status_code == 200
    assert response.json() == mock_queue

def test_get_service_queue(monkeypatch):
    mock_queue = {
        "service_id": "genExam",
        "service_name": "General Exam",
        "isOpen": True,
        "duration": 20,
        "waiting_count": 0,
        "entries": []
    }

    monkeypatch.setattr(queue_logic, "get_queue", lambda service_id: mock_queue)

    response = client.get("/queues/genExam")

    assert response.status_code == 200
    assert response.json() == mock_queue

def test_get_user_queue(monkeypatch):
    mock_entry = {
        "id": "test_id",
        "username": "testUser",
        "service_id": "genExam",
        "ticket": "Q-12345678",
        "priority": "medium",
        "status": "waiting",
        "position": 1,
        "estimated_wait": 0
    }

    monkeypatch.setattr(queue_logic, "get_user_entry", lambda username: mock_entry)

    response = client.get("/queues/user/testUser")

    assert response.status_code == 200
    assert response.json() == mock_entry

def test_get_queue_entry(monkeypatch):
    mock_entry = {
        "id": "test_id",
        "username": "testUser",
        "position": 1,
        "estimated_wait": 0,
    }

    monkeypatch.setattr(queue_logic, "get_entry", lambda entry_id: mock_entry)

    response = client.get("/queues/entries/test_id")

    assert response.status_code == 200
    assert response.json() == mock_entry

def test_join_queue(monkeypatch):
    payload = {
        "service_id": "genExam",
        "username": "testUser",
        "priority": "medium"
    }

    mock_entry = {
        "id": "entry-123",
        "service_id": "genExam",
        "username": "testUser",
        "priority": "medium",
        "status": "waiting"
    }

    monkeypatch.setattr(queue_logic, "join_queue", lambda service_id, username, priority: mock_entry)

    response = client.post("/queues/join", json=payload)

    assert response.status_code == 201
    assert response.json() == mock_entry

def test_join_queue_invalid_priority():
    payload = {
        "service_id": "genExam",
        "username": "testUser",
        "priority": "urgent"
    }

    response = client.post("/queues/join", json=payload)

    assert response.status_code == 422


def test_serve_next(monkeypatch):
    mock_record = {
        "id": "entry-123",
        "username": "user1",
        "service_id": "genExam",
        "status": "served"
    }

    monkeypatch.setattr(queue_logic, "serve_next", lambda service_id: mock_record)

    response = client.post("/queues/genExam/serve-next")

    assert response.status_code == 200
    assert response.json() == mock_record


def test_leave_queue(monkeypatch):
    payload = {"username": "user1"}

    mock_record = {
        "id": "test_id",
        "username": "testUser",
        "status": "left",
    }

    monkeypatch.setattr(queue_logic, "leave_queue", lambda entry_id, username: mock_record)

    response = client.post("/queues/entries/test_id/leave", json=payload)

    assert response.status_code == 200
    assert response.json() == mock_record


def test_remove_queue_entry(monkeypatch):
    mock_record = {
        "id": "test_id",
        "username": "testUser",
        "status": "removed",
    }

    monkeypatch.setattr(queue_logic, "remove_entry", lambda entry_id: mock_record)

    response = client.delete("/queues/entries/test_id")

    assert response.status_code == 200
    assert response.json() == mock_record


def test_move_queue_entry(monkeypatch):
    mock_queue = {
        "service_id": "genExam",
        "entries": [
            {"id": "test_id", "position": 1},
            {"id": "test_id_2", "position": 2}
        ]
    }

    monkeypatch.setattr(queue_logic, "move_entry", lambda entry_id, direction: mock_queue)

    response = client.patch(
        "/queues/entries/test_id/move",
        json={"direction": "down"}
    )

    assert response.status_code == 200
    assert response.json() == mock_queue


def test_move_queue_entry_invalid_direction():
    response = client.patch("/queues/entries/test_id/move", json={"direction": "sideways"})

    assert response.status_code == 422