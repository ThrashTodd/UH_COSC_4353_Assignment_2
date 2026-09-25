

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
        //e.preventDefault()
        errorMessage.innerText = errors.join(". ")
    } else {
        errorMessage.innerText = ""

        if(emailInput){
            window.location.href= "index.html"
        } else {
            window.location.href= "user.html"
        }
    }
    
})

// add user already taken
function getRegisterErrors(username, email, password, checkPassword){
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
// add password matching, no user found 
function getLoginErrors(username, password){
    let errors = []

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

const allInputs = [usernameInput, emailInput, passwordInput, checkPasswordInput].filter(input => input != null)

allInputs.forEach(input => {
    input.addEventListener("input", () => {
        if(input.parentElement.classList.contains("incorrect")){
            input.parentElement.classList.remove("incorrect")
            errorMessage.innerText = ""
        }
    })
})