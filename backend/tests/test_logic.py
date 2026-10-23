
import copy
import pytest
from pydantic import BaseModel
from fastapi import HTTPException

import database
import service_logic
import queue_logic


# keeps a static starting state for users
_DEFAULT_USERS = copy.deepcopy(database.user_db)


@pytest.fixture(autouse=True)
def reset_test_data():
    # reset everything before each test

    # restores services to default
    database.services.clear()
    database.services.update({
        item["id"]: copy.deepcopy(item)
        for item in database.INITIAL_SERVICES
    })

    # restores queues to default
    database.queues.clear()
    database.queue_history.clear()

    # restores users to default
    database.user_db.clear()
    database.user_db.update(copy.deepcopy(_DEFAULT_USERS))


class serviceData(BaseModel):
    name: str
    description: str
    duration: int
    priority: str

def make_service_data(
        name= "testService",
        description= "service for testing",
        duration= 30,
        priority= "medium"
):
    return serviceData(
        name= name,
        description= description,
        duration= duration,
        priority= priority
    )

def test_list_services():
    result = service_logic.list_services()

    assert isinstance(result, list)
    assert len(result) == len(database.INITIAL_SERVICES)

def test_get_service():
    expected = database.services["general-examination"]

    result = service_logic.get_service("general-examination")

    assert result['id'] == expected['id']
    assert result['name'] == expected['name']

def test_create_service():
    result = service_logic.create_service(make_service_data())

    assert result["id"] == "testservice"
    assert result["name"] == "testService"
    assert result["description"] == "service for testing"
    assert result["duration"] == 30
    assert result["priority"] == "medium"
    assert result["isOpen"] is True

    # check to make sure it was saved to database
    assert "testservice" in database.services

def test_make_id_normalizes_name():
    result = service_logic.make_id("  Special & Medical Service! ")

    assert result == "special-medical-service"

def test_update_service():
    result = service_logic.update_service(
        "general-examination",
        make_service_data(
            name="Updated Examination",
            description="Updated description",
            duration=45,
            priority="high",
        ),
    )

    assert result["name"] == "Updated Examination"
    assert result["description"] == "Updated description"
    assert result["duration"] == 45
    assert result["priority"] == "high"
    assert result["isOpen"] is True

def test_change_status_to_closed():
    result = service_logic.change_status("general-examination", False)

    assert result["isOpen"] is False
    assert database.services["general-examination"]["isOpen"] is False


def test_change_status_to_open():
    service_logic.change_status("general-examination", False)

    result = service_logic.change_status("general-examination", True)

    assert result["isOpen"] is True


def test_delete_service():
    service_logic.delete_service("general-examination")

    assert "general-examination" not in database.services





# starting tests for queue_logic

def test_join_queue():
    result = queue_logic.join_queue("general-examination", "ArthurM", "medium")

    assert result is not None
    assert result["service_id"] == "general-examination"
    assert result["username"] == "ArthurM"
    assert result["priority"] == "medium"


def test_join_queue_with_default_priority():
    result = queue_logic.join_queue("general-examination", "ArthurM")

    assert result["priority"] == "medium"

def test_serve_next_uses_priority_order():
    queue_logic.join_queue("general-examination", "ArthurM", "low")
    queue_logic.join_queue("general-examination", "SophieS", "high")

    served = queue_logic.serve_next("general-examination")

    assert served["username"] == "SophieS"

