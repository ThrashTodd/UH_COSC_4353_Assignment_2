const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
document.getElementById("username").textContent = currentUser


const userDB = new Map([
    // map of users for const lookup
    // username : email, password, role
    // user1 == arthurM, user2 == SophieS for histories
    [
        "admin1",
        { 
            email: "admin@example.com", 
            role: "admin",
            history: []
        }
    ],
    [
        "user1",
        { 
            email: "user1@example.com", 
            role: "user",
            history: [
                {ticket: 362, service: "Dental Cleaning", wait: 30, status: "complete"},
                {ticket: 54, service: "Emergency Care", wait: 20, status: "complete"},
                {ticket: 314, service: "Emergency Care", wait: 24, status: "complete"},
                {ticket: 731, service: "General Examination", wait: 20, status: "complete"},
                {ticket: 124, service: "Emergency Care", wait: 21, status: "complete"}
            ]
        }
    ],
    [
        "user2",
        { 
            email: "user2@example.com", 
            role: "user",
            history: [
                {ticket: 453, service: "Emergency Care", wait: 15, status: "complete"},
                {ticket: 181, service: "Emergency Care", wait: 21, status: "complete"},
                {ticket: 297, service: "General Examination", wait: 20, status: "complete"},
                {ticket: 490, service: "Emergency Care", wait: 26, status: "complete"},
                {ticket: 547, service: "Dental Cleaning", wait: 23, status: "complete"}
            ]
        }
    ],
    [
        "ArthurM",
        { 
            email: "ArthurMoore@example.com", 
            role: "user",
            history: [
                {ticket: 362, service: "Dental Cleaning", wait: 30, status: "complete"},
                {ticket: 54, service: "Emergency Care", wait: 20, status: "complete"},
                {ticket: 314, service: "Emergency Care", wait: 24, status: "complete"},
                {ticket: 731, service: "General Examination", wait: 20, status: "complete"},
                {ticket: 124, service: "Emergency Care", wait: 21, status: "complete"}
            ]
        }
    ],
    [
        "SophieS",
        { 
            email: "SophieStevens@example.com", 
            role: "user",
            history: [
                {ticket: 453, service: "Emergency Care", wait: 15, status: "complete"},
                {ticket: 181, service: "Emergency Care", wait: 21, status: "complete"},
                {ticket: 297, service: "General Examination", wait: 20, status: "complete"},
                {ticket: 490, service: "Emergency Care", wait: 26, status: "complete"},
                {ticket: 547, service: "Dental Cleaning", wait: 23, status: "complete"}
            ]
        }
    ]
])

/* Outline of the data base, bad syntax
const usersDB = [   list
    {
        user: "user1",
        currQueue: []
    },
    {
        email: "user2",

    }
]

const sevicesDB = [ list
    {
        {
            service: cleaning,
            wait: 20 min
        }

    }
]

queues [    list of prioqueues

    {
        doc1: 

        doc2:

    }
]

serviceObj {    # object
    user = user1
    service = "cleaning"
    Date = "10/2/22"
    doctors = doctor3
}

database dict  #dictionary for lookup
{
    key=user : serviceObj
}

*/
