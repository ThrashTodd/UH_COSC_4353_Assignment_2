from uuid import UUID, uuid4

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row

from db_connection import get_connection

WAITING_STATES = ("waiting", "almost-ready")
PRIORITY = {"high": 0, "medium": 1, "low": 2}

# Includes duration for wait estimates; public() strips this internal field.
ENTRY_SELECT = """
    SELECT e.entry_id::text AS id,
           q.service_id, u.username,
           e.ticket_number AS ticket,
           e.priority_level AS priority,
           e.joined_at, e.ended_at, e.status, e.position,
           e.initial_estimated_wait_min AS initial_estimated_wait,
           s.expected_duration AS _duration
    FROM queue_entry e
    JOIN queue q ON q.queue_id = e.queue_id
    JOIN service s ON s.service_id = q.service_id
    JOIN user_credentials u ON u.user_id = e.user_id
"""


def uuid(value):
    try:
        return UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        raise HTTPException(404, "Active queue entry not found")


def public(row):
    if row is None:
        return None
    item = dict(row)
    duration = item.pop("_duration")
    item["estimated_wait"] = max(0, (item["position"] - 1) * duration) if item["position"] else 0
    return item


def one(conn, entry_id, *, active=False):
    sql = ENTRY_SELECT + " WHERE e.entry_id = %s"
    if active:
        sql += " AND e.status IN ('waiting', 'almost-ready')"
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, (entry_id,))
        return public(cur.fetchone())


def queue_id_for_entry(conn, entry_id):
    with conn.cursor() as cur:
        cur.execute("SELECT queue_id FROM queue_entry WHERE entry_id = %s", (entry_id,))
        result = cur.fetchone()
    if not result:
        raise HTTPException(404, "Active queue entry not found")
    return result[0]


def lock_queue(conn, queue_id):
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT q.queue_id, q.service_id, q.status, s.expected_duration
            FROM queue q
            JOIN service s ON s.service_id = q.service_id
            WHERE q.queue_id = %s
            FOR UPDATE OF q
        """, (queue_id,))
        result = cur.fetchone()
    if result is None:
        raise HTTPException(404, "Service not found")
    return result


def lock_service_queue(conn, service_id):
    with conn.cursor() as cur:
        cur.execute("SELECT queue_id FROM queue WHERE service_id = %s", (service_id,))
        result = cur.fetchone()
    if result is None:
        raise HTTPException(404, "Service not found")
    return lock_queue(conn, result[0])


def waiting_ids(conn, queue_id):
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT entry_id, priority_level, position
              FROM queue_entry
             WHERE queue_id = %s AND status IN ('waiting', 'almost-ready')
             ORDER BY position
             FOR UPDATE
        """, (queue_id,))
        return cur.fetchall()


def reposition(conn, ordered_ids):
    # The uniqueness constraint is DEFERRABLE in queuesmart_schema.sql.
    with conn.cursor() as cur:
        cur.execute("SET CONSTRAINTS uq_queue_position DEFERRED")
        for position, entry_id in enumerate(ordered_ids, start=1):
            cur.execute("UPDATE queue_entry SET position = %s WHERE entry_id = %s",
                        (position, entry_id))


def event(conn, entry_id, event, details=None):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO queue_history (entry_id, event_type, details)
            VALUES (%s, %s, %s)
        """, (entry_id, event, details))


def list_waiting(service_id):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(ENTRY_SELECT + """
                WHERE q.service_id = %s
                  AND e.status IN ('waiting', 'almost-ready')
                ORDER BY e.position
            """, (service_id,))
            return [public(row) for row in cur.fetchall()]


def get_entry(entry_id):
    entry_id = uuid(entry_id)
    with get_connection() as conn:
        return one(conn, entry_id, active=True)


def get_user_entry(username):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(ENTRY_SELECT + """
                WHERE u.username = %s
                  AND e.status IN ('waiting', 'almost-ready')
                ORDER BY e.joined_at DESC LIMIT 1
            """, (username,))
            return public(cur.fetchone())


def join_queue(service_id, username, priority="medium"):
    if priority not in PRIORITY:
        raise HTTPException(422, "Invalid priority")
    try:
        with get_connection() as conn:
            q = lock_service_queue(conn, service_id)
            if q["status"] != "open":
                raise HTTPException(409, "This service queue is closed")
            with conn.cursor() as cur:
                cur.execute("SELECT user_id, role FROM user_credentials WHERE username = %s", (username,))
                user = cur.fetchone()
            if user is None:
                raise HTTPException(404, "User not found")
            if user[1] != "user":
                raise HTTPException(403, "Only patients may join a queue")

            existing = waiting_ids(conn, q["queue_id"])
            # Higher priority ahead; FIFO among patients with equal priority.
            index = next((i for i, item in enumerate(existing)
                          if PRIORITY[priority] < PRIORITY[item["priority_level"]]),
                         len(existing))
            entry_id = uuid4()
            ticket = "Q-" + uuid4().hex[:16].upper()
            initial_wait = index * q["expected_duration"]
            with conn.cursor() as cur:
                cur.execute("SET CONSTRAINTS uq_queue_position DEFERRED")
                cur.execute("""
                    INSERT INTO queue_entry (
                        entry_id, queue_id, user_id, ticket_number, position,
                        priority_level, status, initial_estimated_wait_min
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'waiting', %s)
                """, (entry_id, q["queue_id"], user[0], ticket,
                      len(existing) + 1, priority, initial_wait))
            ids = [row["entry_id"] for row in existing]
            ids.insert(index, entry_id)
            reposition(conn, ids)
            event(conn, entry_id, "joined")
            result = one(conn, entry_id)
        return result
    except UniqueViolation:
        # The partial unique index enforces one active queue entry per user.
        raise HTTPException(409, "User already has an active queue entry or ticket conflict")


def finish(conn, entry_id, state, username=None):
    entry = one(conn, entry_id, active=True)
    if entry is None:
        raise HTTPException(404, "Active queue entry not found")
    if username is not None and username != entry["username"]:
        raise HTTPException(403, "Cannot leave another user's queue")

    queue_id = queue_id_for_entry(conn, entry_id)
    with conn.cursor() as cur:
        cur.execute("SET CONSTRAINTS uq_queue_position DEFERRED")
        cur.execute("""
            UPDATE queue_entry SET status = %s, position = NULL, ended_at = NOW()
            WHERE entry_id = %s
        """, (state, entry_id))
    rows = waiting_ids(conn, queue_id)
    reposition(conn, [row["entry_id"] for row in rows])
    event(conn, entry_id, state)
    finished = one(conn, entry_id)
    # Preserve what was displayed immediately before the operation.
    finished["estimated_wait"] = entry["estimated_wait"]
    return finished


def leave_queue(entry_id, username):
    entry_id = uuid(entry_id)
    with get_connection() as conn:
        queue_id = queue_id_for_entry(conn, entry_id)
        lock_queue(conn, queue_id)
        return finish(conn, entry_id, "left", username=username)


def serve_next(service_id):
    with get_connection() as conn:
        q = lock_service_queue(conn, service_id)
        rows = waiting_ids(conn, q["queue_id"])
        if not rows:
            raise HTTPException(409, "Queue is empty")
        return finish(conn, rows[0]["entry_id"], "served")


def remove_entry(entry_id):
    entry_id = uuid(entry_id)
    with get_connection() as conn:
        queue_id = queue_id_for_entry(conn, entry_id)
        lock_queue(conn, queue_id)
        return finish(conn, entry_id, "removed")


def move_entry(entry_id, direction):
    if direction not in ("up", "down"):
        raise HTTPException(422, "Invalid direction")
    entry_id = uuid(entry_id)
    with get_connection() as conn:
        queue_id = queue_id_for_entry(conn, entry_id)
        lock_queue(conn, queue_id)
        rows = waiting_ids(conn, queue_id)
        ids = [row["entry_id"] for row in rows]
        if entry_id not in ids:
            raise HTTPException(404, "Active queue entry not found")
        index = ids.index(entry_id)
        neighbor = index + (-1 if direction == "up" else 1)
        if neighbor < 0 or neighbor >= len(ids):
            raise HTTPException(409, "Cannot move entry farther")
        if rows[index]["priority_level"] != rows[neighbor]["priority_level"]:
            raise HTTPException(409, "Cannot move across priority groups")
        ids[index], ids[neighbor] = ids[neighbor], ids[index]
        reposition(conn, ids)
        event(conn, entry_id, "moved", f"Moved {direction} from {index + 1} to {neighbor + 1}")
        service_id = one(conn, entry_id)["service_id"]
    return service_id


def promote_almost_ready(service_id):
    with get_connection() as conn:
        q = lock_service_queue(conn, service_id)
        rows = waiting_ids(conn, q["queue_id"])
        promoted = []
        for row in rows:
            minutes = (row["position"] - 1) * q["expected_duration"]
            if row["position"] <= 2 or minutes <= 5:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE queue_entry
                        SET status = 'almost-ready'
                        WHERE entry_id = %s AND status = 'waiting'
                        RETURNING entry_id
                    """, (row["entry_id"],))
                    changed = cur.fetchone()
                if changed:
                    event(conn, row["entry_id"], "almost_ready")
                    promoted.append(one(conn, row["entry_id"]))
        return promoted
