

const usersMap = new Map([
    // map of users for const lookup
    // username : email, password, role
    [
        "admin1",
        { email: "admin@example.com", password: "admin123", role: "admin" }
    ],
    [
        "user1",
    { email: "user1@example.com", password: "user1_123", role: "user" }
    ],
    [
        "user2",
        { email: "user2@example.com", password: "user2_123", role: "user" }
    ]
])

// turns map into array to be stored as string
localStorage.setItem("users", JSON.stringify([...usersMap]));


function addNewUser( userName, newEmail, newPassword, newRole= "user") {
    // function to add a new user

    // takes users from local storage and turns it into map
    let addUserMap = new Map(JSON.parse(localStorage.getItem("users")))

    addUserMap.set(
        userName, 
    { email: newEmail, password: newPassword, role: newRole }
    )

    // changes map into array to be stored as string
    localStorage.setItem("users", JSON.stringify([...addUserMap]));
}



const resgisterForm = document.getElementById("register_form")
const newEmail = document.getElementById("email")
const newPassword = document.getElementById("password")
const checkPassword = document.getElementById("confirmPassword")



/*
resgisterForm.addEventListener("submit", function(event)) {
    #event.preventDefault()

    const typedEmail = newEmail.value;
    const typedPassword = typedPassword.value;
    const typedConfirmPassword = typedConfirmPassword.value;

    addNewUser(typedEmail, typedPassword)

    
}
*/
