const userDB = new Map([
    // map of users for const lookup
    // username : email, password, role
    // user1 == arthurM, user2 == SophieS for histories
    [
        "admin1",
        { 
            email: "admin@example.com", 
            password: "admin123",
            role: "admin",
            history: []
        }
    ],
    [
        "user1",
        { 
            email: "user1@example.com", 
            password: "user1_123",
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
            password: "user2_123",
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
            password: "passWord123",
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
            password: "passWord123",
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

function initializeUserDatabase() {
  if (!localStorage.getItem("users")) {
    localStorage.setItem("users", JSON.stringify([...userDB]));
  }
}

function getUsersMap() {
  initializeUserDatabase();
  return new Map(JSON.parse(localStorage.getItem("users")));
}

function saveUsersMap(usersMap) {
  localStorage.setItem("users", JSON.stringify([...usersMap]));
}

function getUser(username) {
  return getUsersMap().get(username) || null;
}

function addNewUser(username, email, password, role = "user") {
  const users = getUsersMap();

  if (users.has(username)) {
    return false;
  }

  users.set(username, {
    email,
    password,
    role,
    history: []
  });

  saveUsersMap(users);
  return true;
}

function setCurrentUser(username) {
  sessionStorage.setItem("currentUser", JSON.stringify(username));
}

function getCurrentUsername() {
  return JSON.parse(sessionStorage.getItem("currentUser"));
}

function getCurrentUser() {
  const username = getCurrentUsername();
  return username ? getUser(username) : null;
}

function clearCurrentUser() {
  sessionStorage.removeItem("currentUser");
}

function changeRole(username) {
  const users = getUsersMap();
  const user = users.get(username);

  if (!user) {
    return false;
  }

  user.role = user.role === "admin" ? "user" : "admin";
  users.set(username, user);
  saveUsersMap(users);
  return true;
}

initializeUserDatabase();
