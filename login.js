// only creates list if users not in local storage
if(!localStorage.getItem("users")){
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
}
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



const form = document.getElementById("form")
const usernameInput = document.getElementById("usernameInput")
const emailInput = document.getElementById("emailInput")
const passwordInput = document.getElementById("passwordInput")
const checkPasswordInput = document.getElementById("confirmPassword")
const errorMessage = document.getElementById("errorMessage")

form.addEventListener("submit", (e) => {
    e.preventDefault()
    // array of errors
    let errors = []
    
    if(emailInput){

        // if we have a email then we're on the registeration page
        errors = getRegisterErrors(usernameInput.value, emailInput.value, passwordInput.value, checkPasswordInput.value)
    }
    else{
        // else we're on the login page
        errors = getLoginErrors(usernameInput.value, passwordInput.value)
    }
    if(errors.length > 0){
        errorMessage.innerText = errors.join(". ")
    } else { // no errors
        errorMessage.innerText = ""

        if(emailInput){ // input validated for registration screen
            let valid = validateRegister(usernameInput.value, emailInput.value, passwordInput.value)
            // if the username was valid send user to login page
            if(valid) { window.location.href= "index.html" }
            else{
                errors.push("Username taken, try again")
                errorMessage.innerText = errors.join(". ")
            }
        } else { // input validated for login screen

            let [success, msg] = validateLogin(usernameInput.value, passwordInput.value)
            
            if(success){ // sends user to proper page
                window.location.href=msg
            } else{ // shows why user was unable to login
                errors.push(msg)
                errorMessage.innerText = errors.join(". ")
            }
            
        }
    }
    
})

function getRegisterErrors(username, email, password, checkPassword){
    // adds errors for bad username, email, password and passwords that don't match
    let errors = []

    if(username === '' || username == null){
        errors.push("Username is required")
        usernameInput.parentElement.classList.add("incorrect")
    }
    if(email === '' || !email){
        errors.push("Email is required")
        emailInput.parentElement.classList.add("incorrect")
    }
    if(password === '' || !password){
        errors.push("Password is required")
        passwordInput.parentElement.classList.add("incorrect")
    }
    if(password.length < 8){
        errors.push("Password must be at least 8 characters")
        passwordInput.parentElement.classList.add("incorrect")
    }
    if(password != checkPassword){
        errors.push("Passwords don't match")
        passwordInput.parentElement.classList.add("incorrect")
        checkPasswordInput.parentElement.classList.add("incorrect")

    }
return errors
}

function getLoginErrors(username, password){
    let errors = []

    // if there isn't a username or its an empty string return error
    if(username === '' || !username){
        errors.push("Username is required")
        usernameInput.parentElement.classList.add("incorrect")
    }
    if(password === '' || !password){
        errors.push("Password is required")
        passwordInput.parentElement.classList.add("incorrect")
}
return errors
}

// checks all inputs to clear incorrect class
const allInputs = [usernameInput, emailInput, passwordInput, checkPasswordInput].filter(input => input != null)

allInputs.forEach(input => {
    input.addEventListener("input", () => {
        if(input.parentElement.classList.contains("incorrect")){
            input.parentElement.classList.remove("incorrect")
            errorMessage.innerText = ""
        }
    })
})
function validateLogin(usernameInput, passwordInput){
    // takes a valid login attempt and checks credentials
    let validateUserMap = new Map(JSON.parse(localStorage.getItem("users")))
    // if user not in database return false
    if (!validateUserMap.has(usernameInput)){
        return [false, "User not found"]
    }
    // if password doesn't match the one stored return fasle
    if (validateUserMap.get(usernameInput).password != passwordInput){
        return [false, "Password incorrect"]
    }
    // Change where user is sent depending on role
    if(validateUserMap.get(usernameInput).role == 'admin'){
        return [true, "admin.html"]
    } else { return [true, "user.html"]}
}
function validateRegister(newUsername, newEmail, newPassword){
    // takes valid register attempt and checks if user is taken if not adds to users in local storage
    let validateUserMap = new Map(JSON.parse(localStorage.getItem("users")))

    // if username is taken dont let it be overwritten
    if(validateUserMap.has(newUsername)){
        return false
    } 
    // username available, add user
    addNewUser(newUsername, newEmail, newPassword)
    return true
}
function changeRole(username){
    // toggles role between user and admin
    let userMap = new Map(JSON.parse(localStorage.getItem("users")))
    // if user not found return false and error message
    if (!userMap.has(username)){
        return [false, "User not found"]
    }
    if(userMap.get(username).role == "user") {
        userMap.get(username).role = "admin"
    } else {
        userMap.get(username).role = "user"
    }
    localStorage.setItem("users", JSON.stringify([...userMap]));
}

// REMOVE LATER: this is to show the change role function using admin1
const admin1Button = document.getElementById("roleSwitch")
admin1Button.addEventListener("click", () => changeRole("admin1"))