import logging
import uuid

import pytest
from psycopg.errors import CheckViolation
from pydantic import ValidationError

import notification_logic
from db_connection import get_connection

SERVICE = "gen-exam"
CLOSED_SERVICE = "ortho-cons"
PATIENTS = ["user1", "ArthurM", "SophieS"]


@pytest.fixture(autouse=True)
def setup(test_users, test_services):
    yield


def join(client, username, service_id=SERVICE):
    response = client.post("/queues/join", json={"service_id": service_id, "username": username})
    assert response.status_code == 201, response.text
    return response.json()


def fill_queue(client):
    entries = []
    for name in PATIENTS:
        entries.append(join(client, name))
    return entries


def types_for(username):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT notification.notification_type
                FROM notification
                JOIN user_credentials ON user_credentials.user_id = notification.user_id
                WHERE user_credentials.username = %s
                ORDER BY notification.created_at
                """,
                (username,)
            )
            rows = cursor.fetchall()
    types = []
    for row in rows:
        types.append(row[0])
    return types


def count_notifications():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM notification")
            return cursor.fetchone()[0]


def test_join_creates_one_joined_notification(client):
    entry = join(client, "ArthurM")
    notes = notification_logic.get_notifications_for_user("ArthurM")
    joined = [n for n in notes if n["type"] == "joined"]
    assert len(joined) == 1
    assert joined[0]["username"] == "ArthurM"
    assert "General Examination" in joined[0]["message"]
    assert entry["ticket"] in joined[0]["message"]
    assert joined[0]["read"] is False


def test_first_two_in_line_are_almost_ready_but_third_is_not(client):
    fill_queue(client)
    assert types_for("user1") == ["joined", "almost_ready"]
    assert types_for("ArthurM") == ["joined", "almost_ready"]
    assert types_for("SophieS") == ["joined"]


def test_position_one_gets_youre_next_message(client):
    join(client, "user1")
    notes = notification_logic.get_all_notifications("almost_ready")
    assert notes[0]["message"].startswith("You're next")


def test_almost_ready_also_triggers_on_short_wait_time(client):
    created = client.post("/services", json={"name": "Quick Check", "description": "Fast visit",
                                             "duration": 2, "priority": "low"}).json()
    for name in PATIENTS:
        join(client, name, created["id"])
    assert types_for("SophieS") == ["joined", "almost_ready"]


def test_serve_next_notifies_served_patient_and_new_almost_ready(client):
    fill_queue(client)
    served = client.post("/queues/" + SERVICE + "/serve-next").json()
    assert served["username"] == "user1"
    assert types_for("user1")[-1] == "serving"
    assert types_for("SophieS") == ["joined", "almost_ready"]


def test_almost_ready_is_only_sent_once(client):
    fill_queue(client)
    client.post("/queues/" + SERVICE + "/serve-next")
    client.post("/queues/" + SERVICE + "/serve-next")
    assert types_for("ArthurM").count("almost_ready") == 1
    assert types_for("SophieS").count("almost_ready") == 1


def test_leave_notifies_user_and_moves_next_person_up(client):
    entries = fill_queue(client)
    response = client.post("/queues/entries/" + entries[1]["id"] + "/leave", json={"username": "ArthurM"})
    assert response.status_code == 200
    assert types_for("ArthurM")[-1] == "left"
    assert types_for("SophieS") == ["joined", "almost_ready"]


def test_admin_remove_notifies_patient(client):
    entries = fill_queue(client)
    client.delete("/queues/entries/" + entries[2]["id"])
    assert types_for("SophieS")[-1] == "removed"


def test_moving_up_into_position_two_sends_almost_ready(client):
    entries = fill_queue(client)
    client.patch("/queues/entries/" + entries[2]["id"] + "/move", json={"direction": "up"})
    assert types_for("SophieS") == ["joined", "almost_ready"]


def test_closing_queue_notifies_everyone_waiting_once(client):
    fill_queue(client)
    client.patch("/services/" + SERVICE + "/status", json={"isOpen": False})
    client.patch("/services/" + SERVICE + "/status", json={"isOpen": False})
    client.patch("/services/" + SERVICE + "/status", json={"isOpen": True})
    closed = notification_logic.get_all_notifications("queue_closed")
    names = sorted([n["username"] for n in closed])
    assert names == sorted(PATIENTS)


def test_almost_ready_updates_entry_status(client):
    fill_queue(client)
    assert client.get("/queues/user/ArthurM").json()["status"] == "almost-ready"
    assert client.get("/queues/user/SophieS").json()["status"] == "waiting"


def test_failed_join_does_not_create_notification(client):
    response = client.post("/queues/join", json={"service_id": CLOSED_SERVICE, "username": "user1"})
    assert response.status_code == 409
    assert count_notifications() == 0


def test_notifications_are_logged(client, caplog):
    with caplog.at_level(logging.INFO, logger="queuesense.notifications"):
        join(client, "user1")
    assert "Notification to user1 [joined]" in caplog.text


def test_notifications_are_saved_in_database(client):
    join(client, "user1")
    assert count_notifications() == 2
    body = client.get("/notifications/user/user1").json()
    assert len(body) == 2


def test_notifications_are_linked_to_queue_entry(client):
    entry = join(client, "ArthurM")
    notes = notification_logic.get_notifications_for_user("ArthurM")
    for note in notes:
        assert note["entry_id"] == entry["id"]


def test_notification_for_user_not_in_database_is_skipped(client):
    result = notification_logic.create_notification("ghost", "joined", "Hi", "Hello")
    assert result is None
    assert count_notifications() == 0


def test_repository_add_get_and_mark_read(client):
    user_id = notification_logic.get_user_id("user1")
    saved = notification_logic.add_notification(user_id, "joined", "Test title", "Test message")
    assert saved["username"] == "user1"
    assert saved["read"] is False

    found = notification_logic.get_notification(saved["id"])
    assert found["title"] == "Test title"

    updated = notification_logic.mark_as_read(saved["id"])
    assert updated["read"] is True


def test_repository_unknown_user_returns_none(client):
    assert notification_logic.get_user_id("nobody") is None


def test_database_rejects_bad_notification_type(client):
    user_id = notification_logic.get_user_id("user1")
    with pytest.raises(CheckViolation):
        notification_logic.add_notification(user_id, "spam", "Title", "Message")


def test_get_user_notifications_newest_first(client):
    fill_queue(client)
    client.post("/queues/" + SERVICE + "/serve-next")
    body = client.get("/notifications/user/user1").json()
    assert [n["type"] for n in body] == ["serving", "almost_ready", "joined"]


def test_users_only_see_their_own_notifications(client):
    fill_queue(client)
    body = client.get("/notifications/user/SophieS").json()
    assert len(body) > 0
    for note in body:
        assert note["username"] == "SophieS"


def test_unread_only_filter_and_unread_count(client):
    join(client, "user1")
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 2
    first = client.get("/notifications/user/user1").json()[0]
    client.patch("/notifications/" + first["id"] + "/read", json={"username": "user1"})
    unread = client.get("/notifications/user/user1", params={"unread_only": True}).json()
    assert len(unread) == 1
    assert unread[0]["id"] != first["id"]
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 1


def test_mark_one_read(client):
    join(client, "user1")
    note_id = client.get("/notifications/user/user1").json()[0]["id"]
    response = client.patch("/notifications/" + note_id + "/read", json={"username": "user1"})
    assert response.status_code == 200
    assert response.json()["read"] is True


def test_mark_all_read(client):
    join(client, "user1")
    response = client.patch("/notifications/user/user1/read-all")
    assert response.json() == {"username": "user1", "updated": 2}
    assert client.get("/notifications/user/user1/unread-count").json()["unread"] == 0


def test_mark_all_read_only_changes_that_user(client):
    fill_queue(client)
    client.patch("/notifications/user/user1/read-all")
    assert client.get("/notifications/user/ArthurM/unread-count").json()["unread"] == 2


def test_admin_log_lists_all_and_filters_by_type(client):
    fill_queue(client)
    everything = client.get("/notifications").json()
    assert len(everything) == count_notifications()
    almost = client.get("/notifications", params={"type": "almost_ready"}).json()
    names = set([n["username"] for n in almost])
    assert names == {"user1", "ArthurM"}


def test_cannot_mark_someone_elses_notification(client):
    join(client, "user1")
    note_id = client.get("/notifications/user/user1").json()[0]["id"]
    response = client.patch("/notifications/" + note_id + "/read", json={"username": "ArthurM"})
    assert response.status_code == 403
    assert notification_logic.get_notification(note_id)["read"] is False


@pytest.mark.parametrize("note_id", ["does-not-exist", str(uuid.uuid4())])
def test_unknown_notification_returns_404(client, note_id):
    response = client.patch("/notifications/" + note_id + "/read", json={"username": "user1"})
    assert response.status_code == 404


@pytest.mark.parametrize("path", ["/notifications/user/nobody",
                                  "/notifications/user/nobody/unread-count"])
def test_unknown_user_returns_404(client, path):
    assert client.get(path).status_code == 404


def test_read_all_unknown_user_returns_404(client):
    assert client.patch("/notifications/user/nobody/read-all").status_code == 404


@pytest.mark.parametrize("body", [{}, {"username": ""}, {"username": "   "}, {"username": 123},
                                  {"username": "x" * 101}])
def test_mark_read_rejects_bad_body(client, body):
    response = client.patch("/notifications/some-id/read", json=body)
    assert response.status_code == 422


def test_unread_only_must_be_boolean(client):
    response = client.get("/notifications/user/user1", params={"unread_only": "maybe"})
    assert response.status_code == 422


def test_admin_log_rejects_unknown_type(client):
    assert client.get("/notifications", params={"type": "spam"}).status_code == 422


@pytest.mark.parametrize("field, value", [("title", "x" * 101), ("message", "x" * 256),
                                          ("title", ""), ("type", "spam")])
def test_notification_model_validation(client, field, value):
    data = {"username": "user1", "type": "joined", "title": "Hi", "message": "Hello"}
    data[field] = value
    with pytest.raises(ValidationError):
        notification_logic.create_notification(**data)
    assert count_notifications() == 0


def test_service_name_fallback_for_deleted_service(client):
    assert notification_logic.service_name("missing-service") == "your service"