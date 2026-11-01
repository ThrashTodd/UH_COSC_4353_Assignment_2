-- QueueSmart starter data copied from backend/database.py.

BEGIN;
INSERT INTO service
    (service_id, service_name, description, expected_duration, priority_level)
VALUES
    ('general-examination', 'General Examination',
     'Routine dental examination and consultation.', 20, 'medium'),
    ('dental-cleaning', 'Dental Cleaning',
     'Professional cleaning, scaling, and polishing.', 30, 'low'),
    ('emergency-care', 'Emergency Care',
     'Urgent care for pain, swelling, or dental injury.', 15, 'high'),
    ('orthodontic-consultation', 'Orthodontic Consultation',
     'Consultation for braces, aligners, and bite alignment.', 30, 'medium')
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO queue (service_id, status)
VALUES
    ('general-examination', 'open'),
    ('dental-cleaning', 'open'),
    ('emergency-care', 'open'),
    ('orthodontic-consultation', 'closed')
ON CONFLICT (service_id) DO NOTHING;
COMMIT;

-- Verify that the four service queues were created.
SELECT s.service_id, s.service_name, s.expected_duration,
       s.priority_level, q.queue_id, q.status AS queue_status
FROM service AS s
JOIN queue AS q ON q.service_id = s.service_id
ORDER BY s.service_name;
