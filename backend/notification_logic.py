import logging
import uuid
from typing import Literal
from fastapi import HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel, Field
from db_connection import get_connection
import queue_repository as queue_repo
import service_repository as service_repo

logger = logging.getLogger("queuesense.notifications")

ALMOST_READY_POSITION = 2
ALMOST_READY_MINUTES = 5

NotificationType = Literal["joined", "almost_ready", "serving", "left", "removed", "queue_closed"]

SELECT_NOTIFICATIONS = """
    SELECT
        notification.notification_id::text AS id,
        user_credentials.username,
        notification.notification_type AS type,
        notification.title,
        notification.message,
        notification.entry_id::text AS entry_id,
        notification.created_at,
        notification.is_read AS read
    FROM notification
    JOIN user_credentials ON user_credentials.user_id = notification.user_id
"""


class Notification(BaseModel):
    username: str = Field(min_length=1)
    type: NotificationType
    title: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1, max_length=255)


def get_user_id(username):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT user_id FROM user_credentials WHERE username = %s",
                (username,)
            )
            row = cursor.fetchone()

    if row is None:
        return None
    return row[0]


def add_notification(user_id, notification_type, title, message, entry_id=None):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO notification (user_id, entry_id, notification_type, title, message)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING notification_id
                """,
                (user_id, entry_id, notification_type, title, message)
            )
            new_id = cursor.fetchone()[0]

    return get_notification(str(new_id))


def get_notification(notification_id):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                SELECT_NOTIFICATIONS + " WHERE notification.notification_id = %s",
                (notification_id,)
            )
            return cursor.fetchone()


def get_notifications_for_user(username, unread_only=False):
    query = SELECT_NOTIFICATIONS + " WHERE user_credentials.username = %s"
    if unread_only:
        query = query + " AND notification.is_read = FALSE"
    query = query + " ORDER BY notification.created_at DESC"

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (username,))
            return cursor.fetchall()


def count_unread(username):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM notification
                JOIN user_credentials ON user_credentials.user_id = notification.user_id
                WHERE user_credentials.username = %s AND notification.is_read = FALSE
                """,
                (username,)
            )
            return cursor.fetchone()[0]


def mark_as_read(notification_id):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE notification SET is_read = TRUE WHERE notification_id = %s",
                (notification_id,)
            )

    return get_notification(notification_id)


def mark_all_as_read(username):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE notification
                SET is_read = TRUE
                FROM user_credentials
                WHERE user_credentials.user_id = notification.user_id
                  AND user_credentials.username = %s
                  AND notification.is_read = FALSE
                """,
                (username,)
            )
            return cursor.rowcount


def get_all_notifications(notification_type=None):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            if notification_type is None:
                cursor.execute(SELECT_NOTIFICATIONS + " ORDER BY notification.created_at DESC")
            else:
                cursor.execute(
                    SELECT_NOTIFICATIONS
                    + " WHERE notification.notification_type = %s"
                    + " ORDER BY notification.created_at DESC",
                    (notification_type,)
                )
            return cursor.fetchall()


def service_name(service_id):
    service = service_repo.get_service(service_id)
    if service is None:
        return "your service"
    return service["name"]


def create_notification(username, type, title, message, service_id=None, ticket=None, entry_id=None):
    note = Notification(username=username, type=type, title=title, message=message)

    user_id = get_user_id(note.username)
    if user_id is None:
        logger.warning("Notification not saved, user %s is not in the database", note.username)
        return None

    saved = add_notification(user_id, note.type, note.title, note.message, entry_id)
    logger.info("Notification to %s [%s]: %s", note.username, note.type, note.message)
    return saved


def notify_joined(entry):
    name = service_name(entry["service_id"])
    message = ("You joined the " + name + " queue. Ticket " + entry["ticket"]
               + ", position #" + str(entry["position"])
               + ", estimated wait ~" + str(entry["estimated_wait"]) + " min.")
    return create_notification(entry["username"], "joined", "You joined a queue", message, entry_id=entry.get("id"))


def notify_left(record):
    name = service_name(record["service_id"])
    message = "You left the " + name + " queue. Your spot has been released."
    return create_notification(record["username"], "left", "You left the queue", message, entry_id=record.get("id"))


def notify_serving(record):
    name = service_name(record["service_id"])
    message = "It's your turn for " + name + ". Please go to the front desk."
    return create_notification(record["username"], "serving", "It's your turn", message, entry_id=record.get("id"))


def notify_removed(record):
    name = service_name(record["service_id"])
    message = ("You were removed from the " + name + " queue. "
               "Please see the front desk if this is a mistake.")
    return create_notification(record["username"], "removed", "Removed from queue", message, entry_id=record.get("id"))


def notify_queue_closed(service_id):
    name = service_name(service_id)
    sent = []
    for entry in queue_repo.list_waiting(service_id):
        message = "The " + name + " queue is now closed to new patients. You keep your current spot."
        sent.append(create_notification(entry["username"], "queue_closed", "Queue closed", message, entry_id=entry.get("id")))
    return sent


def check_almost_ready(service_id):
    newly_ready = queue_repo.promote_almost_ready(service_id)
    name = service_name(service_id)
    sent = []

    for entry in newly_ready:
        position = entry["position"]
        if position == 1:
            message = "You're next for " + name + "! Please stay near the front desk."
        else:
            message = ("You're almost up for " + name + " (position #" + str(position)
                       + ", ~" + str(entry["estimated_wait"]) + " min). Please stay near the front desk.")
        sent.append(create_notification(entry["username"], "almost_ready", "Almost your turn", message, entry_id=entry.get("id")))

    return sent


def check_user(username):
    if get_user_id(username) is None:
        raise HTTPException(404, "User not found")


def is_valid_id(notification_id):
    try:
        uuid.UUID(notification_id)
        return True
    except ValueError:
        return False


def list_for_user(username, unread_only=False):
    check_user(username)
    return get_notifications_for_user(username, unread_only)


def unread_count(username):
    check_user(username)
    return {"username": username, "unread": count_unread(username)}


def mark_read(notification_id, username):
    if not is_valid_id(notification_id):
        raise HTTPException(404, "Notification not found")

    note = get_notification(notification_id)
    if note is None:
        raise HTTPException(404, "Notification not found")
    if note["username"] != username:
        raise HTTPException(403, "Cannot update another user's notification")

    return mark_as_read(notification_id)


def mark_all_read(username):
    check_user(username)
    updated = mark_all_as_read(username)
    return {"username": username, "updated": updated}


def list_all(type=None):
    return get_all_notifications(type)