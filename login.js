

const users = [
    {
        email: "admin@example.com",
        password: "admin123",
        role: "admin"
    },
    {
        email: "user1@example.com",
        password: "user1_123",
        role: "user"
    },
    {
        email: "user2@example.com",
        password: "user2_123",
        role: "user"
    }
]

localStorage.setItem("users", JSON.stringify(users));

function addNewUser(newEmail, newPassword, newRole= "user"){
    let addUserList = JSON.parse(localStorage.getItem("users")) || [];

    addUserList.push({
        email: newEmail,
        password: newPassword,
        role: newRole
    })
    localStorage.setItem("users", JSON.stringify(addUserList))
}



const resgisterForm = document.getElementById("register_form")
const newEmail = document.getElementById("email")
const newPassword = document.getElementById("password")
const checkPassword = document.getElementById("confirmPassword")


/*  FIX ME

resgisterForm.addEventListener("submit", function(event)) {
    event.preventDefault()

    const typedEmail = newEmail.value;
    const typedPassword = typedPassword.value;
    const typedConfirmPassword = typedConfirmPassword.value;

    addNewUser(typedEmail, typedPassword)

    
}
*/