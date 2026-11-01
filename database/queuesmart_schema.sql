-- QueueSmart Assignment 4 


BEGIN;

-- 1. Authentication and account ownership.
CREATE TABLE user_credentials (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_nonblank CHECK (LENGTH(BTRIM(username)) > 0),
    CONSTRAINT email_nonblank CHECK (LENGTH(BTRIM(email)) > 0)
);

-- 2. Optional 1:1 profile. Email belongs in user_credentials only.
CREATE TABLE user_profile (
    user_id BIGINT PRIMARY KEY
        REFERENCES user_credentials(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    contact_number VARCHAR(25),
    preferences TEXT
);

-- 3. Dental services.
CREATE TABLE service (
    service_id VARCHAR(100) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NOT NULL,
    expected_duration INTEGER NOT NULL
        CHECK (expected_duration BETWEEN 1 AND 480),
    priority_level VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority_level IN ('low', 'medium', 'high')),
    CONSTRAINT service_id_nonblank CHECK (LENGTH(BTRIM(service_id)) > 0),
    CONSTRAINT service_name_nonblank CHECK (LENGTH(BTRIM(service_name)) > 0),
    CONSTRAINT service_description_nonblank CHECK (LENGTH(BTRIM(description)) > 0)
);

-- 4. Operational queue per service.
CREATE TABLE queue (
    queue_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id VARCHAR(100) NOT NULL UNIQUE
        REFERENCES service(service_id) ON DELETE RESTRICT,
    status VARCHAR(10) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Individual visits/queue participations. 
CREATE TABLE queue_entry (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id BIGINT NOT NULL
        REFERENCES queue(queue_id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL
        REFERENCES user_credentials(user_id) ON DELETE RESTRICT,
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    position INTEGER,
    priority_level VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority_level IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting'
        CHECK (status IN (
            'waiting', 'almost-ready', 'in-service',
            'served', 'left', 'removed'
        )),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    initial_estimated_wait_min INTEGER
        CHECK (initial_estimated_wait_min IS NULL OR initial_estimated_wait_min >= 0),
    CONSTRAINT queue_position_positive CHECK (position IS NULL OR position > 0),
    CONSTRAINT queue_position_by_status CHECK (
        (status IN ('waiting', 'almost-ready') AND position IS NOT NULL)
        OR
        (status NOT IN ('waiting', 'almost-ready') AND position IS NULL)
    ),
    CONSTRAINT queue_entry_end_state CHECK (
        (status IN ('served', 'left', 'removed') AND ended_at IS NOT NULL)
        OR
        (status NOT IN ('served', 'left', 'removed') AND ended_at IS NULL)
    ),
    CONSTRAINT queue_entry_time_order CHECK (ended_at IS NULL OR ended_at >= joined_at),
    -- Nullable positions allow completed entries to remain in this table.
    -- This DEFERRABLE constraint allows atomic position swaps/reorders.
    CONSTRAINT uq_queue_position UNIQUE (queue_id, position)
        DEFERRABLE INITIALLY IMMEDIATE
);

-- Prevent a patient from having multiple active queue participations.
CREATE UNIQUE INDEX uq_queue_entry_active_user
    ON queue_entry (user_id)
    WHERE status IN ('waiting', 'almost-ready', 'in-service');

CREATE INDEX idx_queue_entry_queue_status
    ON queue_entry(queue_id, status);
CREATE INDEX idx_queue_entry_user_history
    ON queue_entry(user_id, joined_at DESC);

-- 6. Backend notifications. 
CREATE TABLE notification (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL
        REFERENCES user_credentials(user_id) ON DELETE RESTRICT,
    entry_id UUID
        REFERENCES queue_entry(entry_id) ON DELETE SET NULL,
    notification_type VARCHAR(30) NOT NULL
        CHECK (notification_type IN (
            'joined', 'almost_ready', 'serving', 'left',
            'removed', 'queue_closed'
        )),
    title VARCHAR(100) NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_notification_user_created
    ON notification(user_id, created_at DESC);

-- 7. Audit events for each participation; 
CREATE TABLE queue_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL
        REFERENCES queue_entry(entry_id) ON DELETE RESTRICT,
    event_type VARCHAR(30) NOT NULL
        CHECK (event_type IN (
            'joined', 'almost_ready', 'serving', 'served',
            'left', 'removed', 'moved', 'queue_closed'
        )),
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details TEXT
);
CREATE INDEX idx_queue_history_entry_time
    ON queue_history(entry_id, event_time DESC);

COMMIT;
