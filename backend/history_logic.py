from fastapi import HTTPException
from database import queue_history, services, user_db

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
        'wait': record.get('estimated_wait'),
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

def list_for_user(username: str, include_legacy: bool = True):
    if username not in user_db:
        raise HTTPException(status_code=404, detail='User not found')
    results = [normalize_queue(r) for r in queue_history if r['username'] == username]
    if include_legacy:
        results.extend(normalize_legacy(username, i, r)
                       for i, r in enumerate(user_db[username].get('history', [])))
    # New visits first; legacy seed records have no dates and sort last.
    return sorted(results, key=lambda item: item['ended_at'] or item['date'] or '', reverse=True)

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