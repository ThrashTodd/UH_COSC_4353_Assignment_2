import logging
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from pydantic import ValidationError

import notification_logic
from database import notifications, queues, queue_history, reset_services
from main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_state():
    reset_services()
    queues.clear()
    queue_history.clear()
    notifications.clear()
    yield
    reset_services()
    queues.clear()
    queue_history.clear()
    notifications.clear()

SERVICE = "general-examination"
PATIENTS = ["user1", "user2", "ArthurM", "SophieS"]


def join(username, service_id=SERVICE, priority="medium"):
    response = client.post("/queues/join", json={"service_id": service_id, "username": username, "priority": priority})
    assert response.status_code == 201, response.text
    return response.json()


def types_for(username):
    return [n["type"] for n in notifications if n["username"] == username]


def fill_queue():
    return [join(name) for name in PATIENTS]


def test_join_creates_one_joined_notification():
    join("ArthurM")
    joined = [n for n in notifications if n["type"] == "joined"]
    assert len(joined) == 1
    note = joined[0]
    assert note["username"] == "ArthurM"
    assert note["service_id"] == SERVICE
    assert "General Examination" in note["message"]
    assert note["ticket"] in note["message"]
    assert note["read"] is False


def test_first_two_in_line_are_almost_ready_but_third_is_not():
    fill_queue()
    assert types_for("user1") == ["joined", "almost_ready"]
    assert types_for("user2") == ["joined", "almost_ready"]
    assert types_for("ArthurM") == ["joined"]
    assert types_for("SophieS") == ["joined"]


def test_position_one_gets_youre_next_message():
    join("user1")
    note = [n for n in notifications if n["type"] == "almost_ready"][0]
    assert note["message"].startswith("You're next")


def test_almost_ready_also_triggers_on_short_wait_time():
    created = client.post("/services", json={"name": "Quick Check", "description": "Fast visit",
                                             "duration": 2, "priority": "low"}).json()
    for name in ["user1", "user2", "ArthurM"]:
        join(name, created["id"])
    assert types_for("ArthurM") == ["joined", "almost_ready"]


def test_serve_next_notifies_served_patient_and_new_almost_ready():
    fill_queue()
    served = client.post(f"/queues/{SERVICE}/serve-next").json()
    assert served["username"] == "user1"
    assert types_for("user1")[-1] == "serving"
    assert types_for("ArthurM") == ["joined", "almost_ready"]
    assert types_for("SophieS") == ["joined"]


def test_almost_ready_is_only_sent_once():
    fill_queue()
    client.post(f"/queues/{SERVICE}/serve-next")
    client.post(f"/queues/{SERVICE}/serve-next")
    assert types_for("ArthurM").count("almost_ready") == 1
    assert types_for("user2").count("almost_ready") == 1


def test_leave_notifies_user_and_moves_next_person_up():
    entries = fill_queue()
    user2_entry = entries[1]
    response = client.post(f"/queues/entries/{user2_entry['id']}/leave", json={"username": "user2"})
    assert response.status_code == 200
    assert types_for("user2")[-1] == "left"
    assert types_for("ArthurM") == ["joined", "almost_ready"]


def test_admin_remove_notifies_patient():
    entries = fill_queue()
    client.delete(f"/queues/entries/{entries[3]['id']}")
    assert types_for("SophieS")[-1] == "removed"


def test_moving_up_into_position_two_sends_almost_ready():
    entries = fill_queue()
    client.patch(f"/queues/entries/{entries[2]['id']}/move", json={"direction": "up"})
    assert types_for("ArthurM") == ["joined", "almost_ready"]


def test_closing_queue_notifies_everyone_waiting_once():
    fill_queue()
    client.patch(f"/services/{SERVICE}/status", json={"isOpen": False})
    client.patch(f"/services/{SERVICE}/status", json={"isOpen": False})
    client.patch(f"/services/{SERVICE}/status", json={"isOpen": True})
    closed = [n for n in notifications if n["type"] == "queue_closed"]
    assert sorted(n["username"] for n in closed) == sorted(PATIENTS)


def test_almost_ready_updates_entry_status():
    fill_queue()
    assert client.get("/queues/user/user2").json()["status"] == "almost-ready"
    assert client.get("/queues/user/SophieS").json()["status"] == "waiting"


def test_failed_join_does_not_create_notification():
    response = client.post("/queues/join", json={"service_id": "orthodontic-consultation", "username": "user1"})
    assert response.status_code == 409
    assert notifications == []


def test_notifications_are_logged(caplog):
    with caplog.at_level(logging.INFO, logger="queuesense.notifications"):
        join("user1")
    assert "Notification to user1 [joined]" in caplog.text


def test_get_user_notifications_newest_first():
    fill_queue()
    client.post(f"/queues/{SERVICE}/serve-next")
    body = client.get("/notifications/user/user1").json()
    assert [n["type"] for n in body] == ["serving", "almost_ready", "joined"]


def test_users_only_see_their_own_notifications():
    fill_queue()
    body = client.get("/notifications/user/SophieS").json()
    assert body and all(n["username"] == "SophieS" for n in body)


def test_unread_only_filter_and_unread_count():
    join("user1")
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 2
    first = client.get("/notifications/user/user1").json()[0]
    client.patch(f"/notifications/{first['id']}/read", json={"username": "user1"})
    unread = client.get("/notifications/user/user1", params={"unread_only": True}).json()
    assert len(unread) == 1 and unread[0]["id"] != first["id"]
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 1


def test_mark_one_read():
    join("user1")
    note_id = notifications[0]["id"]
    response = client.patch(f"/notifications/{note_id}/read", json={"username": "user1"})
    assert response.status_code == 200
    assert response.json()["read"] is True


def test_mark_all_read():
    join("user1")
    response = client.patch("/notifications/user/user1/read-all")
    assert response.json() == {"username": "user1", "updated": 2}
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 0


def test_admin_log_lists_all_and_filters_by_type():
    fill_queue()
    everything = client.get("/notifications").json()
    assert len(everything) == len(notifications)
    almost = client.get("/notifications", params={"type": "almost_ready"}).json()
    assert {n["username"] for n in almost} == {"user1", "user2"}



def test_cannot_mark_someone_elses_notification():
    join("user1")
    note_id = notifications[0]["id"]
    response = client.patch(f"/notifications/{note_id}/read", json={"username": "user2"})
    assert response.status_code == 403
    assert notifications[0]["read"] is False


def test_unknown_notification_returns_404():
    response = client.patch("/notifications/does-not-exist/read", json={"username": "user1"})
    assert response.status_code == 404


@pytest.mark.parametrize("path", ["/notifications/user/nobody",
                                  "/notifications/user/nobody/unread-count"])
def test_unknown_user_returns_404(path):
    assert client.get(path).status_code == 404


def test_read_all_unknown_user_returns_404():
    assert client.patch("/notifications/user/nobody/read-all").status_code == 404


@pytest.mark.parametrize("body", [{}, {"username": ""}, {"username": "   "}, {"username": 123},
                                  {"username": "x" * 101}])
def test_mark_read_rejects_bad_body(body):
    response = client.patch("/notifications/some-id/read", json=body)
    assert response.status_code == 422


def test_unread_only_must_be_boolean():
    response = client.get("/notifications/user/user1", params={"unread_only": "maybe"})
    assert response.status_code == 422


def test_admin_log_rejects_unknown_type():
    assert client.get("/notifications", params={"type": "spam"}).status_code == 422


@pytest.mark.parametrize("field, value", [("title", "x" * 101), ("message", "x" * 256),
                                          ("title", ""), ("type", "spam")])
def test_notification_model_validation(field, value):
    data = {"username": "user1", "type": "joined", "title": "Hi", "message": "Hello"}
    data[field] = value
    with pytest.raises(ValidationError):
        notification_logic.create_notification(**data)
    assert notifications == []


def test_service_name_fallback_for_deleted_service():
    assert notification_logic.service_name("missing-service") == "your service"