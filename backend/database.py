
user_db = {
    # map of users for const lookup
    # username : email, password, role
    # user1 == arthurM, user2 == SophieS for histories
    "admin1": { 
        "email": "admin@example.com", 
        "password": "admin123",
        "role": "admin",
        "history": []
    },
    "user1": { 
        "email": "user1@example.com", 
        "password": "user1_123",
        "role": "user",
        "history": [
            {"ticket": 362, "service": "Dental Cleaning", "wait": 30, "status": "complete"},
            {"ticket": 54, "service": "Emergency Care", "wait": 20, "status": "complete"},
            {"ticket": 314, "service": "Emergency Care", "wait": 24, "status": "complete"},
            {"ticket": 731, "service": "General Examination", "wait": 20, "status": "complete"},
            {"ticket": 124, "service": "Emergency Care", "wait": 21, "status": "complete"}
        ]
    },
    "user2": { 
        "email": "user2@example.com", 
        "password": "user2_123",
        "role": "user",
        "history": [
            {"ticket": 453, "service": "Emergency Care", "wait": 15, "status": "complete"},
            {"ticket": 181, "service": "Emergency Care", "wait": 21, "status": "complete"},
            {"ticket": 297, "service": "General Examination", "wait": 20, "status": "complete"},
            {"ticket": 490, "service": "Emergency Care", "wait": 26, "status": "complete"},
            {"ticket": 547, "service": "Dental Cleaning", "wait": 23, "status": "complete"}
        ]
    },
    "ArthurM": { 
        "email": "ArthurMoore@example.com", 
        "password": "passWord123",
        "role": "user",
        "history": [
            {"ticket": 362, "service": "Dental Cleaning", "wait": 30, "status": "complete"},
            {"ticket": 54, "service": "Emergency Care", "wait": 20, "status": "complete"},
            {"ticket": 314, "service": "Emergency Care", "wait": 24, "status": "complete"},
            {"ticket": 731, "service": "General Examination", "wait": 20, "status": "complete"},
            {"ticket": 124, "service": "Emergency Care", "wait": 21, "status": "complete"}
        ]
    },
    "SophieS": { 
        "email": "SophieStevens@example.com", 
        "password": "passWord123",
        "role": "user",
        "history": [
            {"ticket": 453, "service": "Emergency Care", "wait": 15, "status": "complete"},
            {"ticket": 181, "service": "Emergency Care", "wait": 21, "status": "complete"},
            {"ticket": 297, "service": "General Examination", "wait": 20, "status": "complete"},
            {"ticket": 490, "service": "Emergency Care", "wait": 26, "status": "complete"},
            {"ticket": 547, "service": "Dental Cleaning", "wait": 23, "status": "complete"}
        ]
    }
}

INITIAL_SERVICES = [
    {"id": "general-examination", "name": "General Examination", "description": "Routine dental examination and consultation.", "duration": 20, "priority": "medium", "isOpen": True},
    {"id": "dental-cleaning", "name": "Dental Cleaning", "description": "Professional cleaning, scaling, and polishing.", "duration": 30, "priority": "low", "isOpen": True},
    {"id": "emergency-care", "name": "Emergency Care", "description": "Urgent care for pain, swelling, or dental injury.", "duration": 15, "priority": "high", "isOpen": True},
    {"id": "orthodontic-consultation", "name": "Orthodontic Consultation", "description": "Consultation for braces, aligners, and bite alignment.", "duration": 30, "priority": "medium", "isOpen": False},
]
services = {item["id"]: item.copy() for item in INITIAL_SERVICES}

def reset_services():
    services.clear()
    services.update({item["id"]: item.copy() for item in INITIAL_SERVICES})

queues = {}
queue_history = []
notifications = []
