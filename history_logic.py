from fastapi import HTTPException
from psycopg.rows import dict_row ##

from database import queue_history, services, user_db
from db_connection import get_connection ##

def normalize_queue(record):
    service_id = record.get('service_id')
    return {
        'id': record['id'],
        'username': record['username'],
        'ticket': record.get('ticket'),
        'service_id': service_id,
        'service': services.get(service_id, {}).get('name', service_id or 'Unknown service'),
        'status': record['status'],
        'joined_at': record.get('joined_at'),
        'ended_at': record.get('ended_at'),
        'date': record.get('ended_at'),
        'wait': record.get("initial_estimated_wait", record.get('estimated_wait')),
        'initial_estimated_wait': record.get('initial_estimated_wait'),
        'final_estimated_wait': record.get('estimated_wait'),
        'doctor': record.get('doctor'),
        'source': 'queue',
    }

def normalize_legacy(username, index, record):
    return {
        'id': f'legacy-{username}-{index}',
        'username': username,
        'ticket': record.get('ticket'),
        'service_id': None,
        'service': record.get('service', 'Unknown service'),
        'status': record.get('status', 'complete'),
        'joined_at': None,
        'ended_at': None,
        'date': record.get('date'),
        'wait': record.get('wait'),
        'doctor': record.get('doctor'),
        'source': 'legacy',
    }

## old list_for_user
# def list_for_user(username: str, include_legacy: bool = True):
    if username not in user_db:
        raise HTTPException(status_code=404, detail='User not found')
    results = [normalize_queue(r) for r in queue_history if r['username'] == username]
    if include_legacy:
        results.extend(normalize_legacy(username, i, r)
                       for i, r in enumerate(user_db[username].get('history', [])))
    # New visits first; legacy seed records have no dates and sort last.
    return sorted(results, key=lambda item: item['ended_at'] or item['date'] or '', reverse=True)
##

## updated list_for_user 11/4

def list_for_user(username: str, include_legacy: bool = True):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                "SELECT user_id FROM user_credentials WHERE username = %s",
                (username,),
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="User not found")

            cursor.execute(
                """
                SELECT
                    qe.entry_id::text AS id,
                    uc.username,
                    qe.ticket_number AS ticket,
                    q.service_id,
                    s.service_name AS service,
                    qe.status,
                    qe.joined_at,
                    qe.ended_at,
                    qe.initial_estimated_wait_min AS initial_estimated_wait
                FROM queue_entry AS qe
                JOIN user_credentials AS uc ON uc.user_id = qe.user_id
                JOIN queue AS q ON q.queue_id = qe.queue_id
                JOIN service AS s ON s.service_id = q.service_id
                WHERE uc.username = %s
                  AND qe.status IN ('served', 'left', 'removed')
                ORDER BY qe.ended_at DESC NULLS LAST, qe.joined_at DESC
                """,
                (username,),
            )
            rows = cursor.fetchall()

    results = []
    for row in rows:
        ended_at = row["ended_at"]
        joined_at = row["joined_at"]
        wait = row["initial_estimated_wait"]

        results.append({
            "id": row["id"],
            "username": row["username"],
            "ticket": row["ticket"],
            "service_id": row["service_id"],
            "service": row["service"],
            "status": row["status"],
            "joined_at": joined_at.isoformat() if joined_at else None,
            "ended_at": ended_at.isoformat() if ended_at else None,
            "date": ended_at.isoformat() if ended_at else None,
            "wait": wait,
            "initial_estimated_wait": wait,
            "final_estimated_wait": None,
            "doctor": None,
            "source": "database",
        })

    if include_legacy and username in user_db:
        results.extend(
            normalize_legacy(username, i, record)
            for i, record in enumerate(user_db[username].get("history", []))
        )

    return sorted(
        results,
        key=lambda item: item["ended_at"] or item["date"] or "",
        reverse=True,
    )

def list_all(include_legacy: bool = False):
    results = [normalize_queue(r) for r in queue_history]
    if include_legacy:
        for username in user_db:
            results.extend(normalize_legacy(username, i, r)
                           for i, r in enumerate(user_db[username].get('history', [])))
    return sorted(results, key=lambda item: item['ended_at'] or item['date'] or '', reverse=True)

def get_one(entry_id: str):
    for record in queue_history:
        if record['id'] == entry_id:
            return normalize_queue(record)
    raise HTTPException(status_code=404, detail='History entry not found')