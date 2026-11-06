from uuid import UUID
from fastapi import HTTPException
from psycopg.rows import dict_row
from db_connection import get_connection

#Retrieve completed queue records from PostgreSQL
_HISTORY_SELECT = """
    SELECT
        e.entry_id::text AS id,
        u.username,
        e.ticket_number AS ticket,
        q.service_id,
        s.service_name AS service,
        e.status,
        e.joined_at,
        e.ended_at,
        e.initial_estimated_wait_min AS initial_estimated_wait
    FROM queue_entry e
    JOIN queue q
        ON q.queue_id = e.queue_id
    JOIN service s
        ON s.service_id = q.service_id
    JOIN user_credentials u
        ON u.user_id = e.user_id
    WHERE e.status IN ('served', 'left', 'removed')
"""

def _normalize(row):
    wait = row["initial_estimated_wait"]
    ended = row["ended_at"]

    return {
        "id": row["id"],
        "username": row["username"],
        "ticket": row["ticket"],
        "service_id": row["service_id"],
        "service": row["service"],
        "status": row["status"],
        "joined_at": (
            row["joined_at"].isoformat()
            if row["joined_at"] else None
        ),
        "ended_at": (
            ended.isoformat() if ended else None
        ),
        "date": (
            ended.isoformat() if ended else None
        ),
        "wait": wait,
        "initial_estimated_wait": wait,
        "final_estimated_wait": None,
        "doctor": None,
        "source": "queue",
    }


#Retrieve completed queue history for a specific user
def list_for_user(username: str, include_legacy: bool = False):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:

            # Verify that the user exists
            cursor.execute(
                """
                SELECT 1
                FROM user_credentials
                WHERE username = %s
                """,
                (username,)
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="User not found"
                )

            # Retrieve completed queue records
            cursor.execute(
                _HISTORY_SELECT +
                " AND u.username = %s ORDER BY e.ended_at DESC",
                (username,)
            )

            records = cursor.fetchall()

    return [_normalize(record) for record in records]


#Retrieve all completed queue records
def list_all(include_legacy: bool = False):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:

            cursor.execute(
                _HISTORY_SELECT +
                " ORDER BY e.ended_at DESC"
            )

            records = cursor.fetchall()

    return [_normalize(record) for record in records]


#Retrieve one completed queue record using its UUID
def get_one(entry_id: str):
    try:
        entry_uuid = UUID(entry_id)

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=404,
            detail="History entry not found"
        )

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:

            cursor.execute(
                _HISTORY_SELECT + " AND e.entry_id = %s",
                (entry_uuid,)
            )

            record = cursor.fetchone()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="History entry not found"
        )
    return _normalize(record)
