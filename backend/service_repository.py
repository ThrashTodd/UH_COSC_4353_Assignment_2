from db_connection import get_connection
from psycopg.rows import dict_row

_SERVICE_QUERY = """
    SELECT
        s.service_id AS id,
        s.service_name AS name,
        s.description,
        s.expected_duration AS duration,
        s.priority_level AS priority,
        (q.status = 'open') AS "isOpen"
    FROM service AS s
    JOIN queue AS q ON q.service_id = s.service_id
"""


def _get_service(conn, service_id):
    with conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(_SERVICE_QUERY + " WHERE s.service_id = %s", (service_id,))
        return cursor.fetchone()


def list_services():
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(_SERVICE_QUERY + " ORDER BY s.service_name")
            return cursor.fetchall()


def get_service(service_id):
    with get_connection() as conn:
        return _get_service(conn, service_id)


def create_service(service):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO service (
                    service_id, service_name, description,
                    expected_duration, priority_level
                ) VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    service["id"], service["name"], service["description"],
                    service["duration"], service["priority"],
                ),
            )
            cursor.execute(
                "INSERT INTO queue (service_id, status) VALUES (%s, %s)",
                (service["id"], "open" if service.get("isOpen", True) else "closed"),
            )
        return _get_service(conn, service["id"])


def update_service(service_id, updates):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE service
                   SET service_name = %s,
                       description = %s,
                       expected_duration = %s,
                       priority_level = %s
                 WHERE service_id = %s
                 RETURNING service_id
                """,
                (
                    updates["name"], updates["description"],
                    updates["duration"], updates["priority"], service_id,
                ),
            )
            if cursor.fetchone() is None:
                return None
        return _get_service(conn, service_id)


def change_status(service_id, is_open):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE queue SET status = %s
                 WHERE service_id = %s
                 RETURNING queue_id
                """,
                ("open" if is_open else "closed", service_id),
            )
            if cursor.fetchone() is None:
                return None
        return _get_service(conn, service_id)


def delete_service(service_id):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM service WHERE service_id = %s FOR UPDATE",
                (service_id,),
            )
            if cursor.fetchone() is None:
                return False
            cursor.execute("DELETE FROM queue WHERE service_id = %s", (service_id,))
            cursor.execute("DELETE FROM service WHERE service_id = %s", (service_id,))
        return True