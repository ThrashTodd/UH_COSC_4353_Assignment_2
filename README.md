
pre made users:

user: admin1
password: admin123

user: user1
password: user1_123


Design and implementation of backend for Queuesmart app.

"python -m uvicorn main:app --reload --app-dir backend" starts the backend server that handles the database and get and post requests. After running the server you can append docs#/ to access the documentation that shows routs and base models used.

"python -m pytest -v": runs the 73 unit tests for endpoints and funciton logic. 

database.py holds the database information that will be transfered over to a real backend server during the next assignment. The other files set up routes through fastAPI to be called by the javascript files. 

In backend tests contains all the files that create unit tests for each section of the backend.


== Assignment 3 details ==


Required Back-End Modules

Your backend must include the following modules or logical components:
1. Authentication Module

    User registration

    Login authentication

    Role handling (User vs Administrator)

    Basic input validation

2. Service Management Module

    Create, update, and list services

    Each service should include:

        Service name

        Description

        Expected duration

        Priority level

3. Queue Management Module

    Allow users to:

        Join a queue

        Leave a queue

    Allow administrators to:

        View current queue

        Serve next user

    Queue ordering should consider:

        Arrival order

        Priority (if applicable)

4. Wait-Time Estimation Logic

    Implement basic wait-time estimation

    Can be rule-based (e.g., position × expected duration)

    No advanced algorithms required

5. Notification Module

    Backend logic to trigger notifications when:

        User joins a queue

        User is close to being served

    Notifications may be logged or returned to the front end (no real email/SMS required)

6. History Module

    Track queue participation history for users

    History may be stored in memory or mocked

Important Deliverables
1. Backend Validations

Your backend must validate:

    Required fields

    Field types

    Field length limits

Invalid input should return appropriate error responses.
2. Unit Tests (Required)

    Backend code must include unit tests

    Tests should cover:

        Core business logic

        Validation rules

    Target code coverage: 70–80%

        Coverage reports may be generated using IDE tools or test frameworks

    Focus on meaningful tests, not perfect coverage.

3. Front-End Integration

    Your A2 front end must call your backend APIs

    Data displayed in the UI should come from backend responses

    Hard-coded backend data is acceptable

4. No Database Implementation

    Do not implement a real database in this assignment

    Data may be stored:

        In memory

        In collections

        As mocked objects
