const form = document.getElementById("form")
const usernameInput = document.getElementById("usernameInput")
const firstNameInput = document.getElementById("firstNameInput")
const lastNameInput = document.getElementById("lastNameInput")
const emailInput = document.getElementById("emailInput")
const phoneInput = document.getElementById("phoneInput")
const passwordInput = document.getElementById("passwordInput")
const confirmPasswordInput = document.getElementById("confirmPassword")
const errorMessage = document.getElementById("errorMessage")

if (form) {
  form.addEventListener("submit", handleFormSubmit);
}

function handleFormSubmit(event) {
    event.preventDefault();

  const isRegistrationPage = Boolean(emailInput);
  const errors = isRegistrationPage
    ? getRegisterErrors(
        firstNameInput.value,
        lastNameInput.value,
        usernameInput.value,
        emailInput.value,
        phoneInput.value,
        passwordInput.value,
        confirmPasswordInput.value
      )
    : getLoginErrors(usernameInput.value, passwordInput.value);

    if (errors.length > 0) {
        showErrors(errors);
        return;
    }

    if (isRegistrationPage) {
        registerUser();
    } else {
        loginUser();
    }
}

async function loginUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      }
    )
    const data = await response.json()

    if (!response.ok) {
      showErrors([data.detail])
      return
    }

    // save username for the next page
    localStorage.setItem("currentUser", data.username)
    
    // redirect based on role returned from api
    if(data.role === "admin") {
      window.location.href = "admin.html"
    } else {
      window.location.href = "user.html"
    }
  } catch(error) {
    showErrors([
      "Unable to connect to the server. Please try again."
    ])
    console.error("Login request failed:", error)
  }
}


async function registerUser() {
  const firstName = firstNameInput.value.trim()
  const lastName = lastNameInput.value.trim()

  const username = usernameInput.value.trim()
  const email = emailInput.value.trim()
  const phone = phoneInput.value.trim()

  const password = passwordInput.value

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          phone_number: phone || null,
          password: password
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      showErrors([data.detail])
      return
    }

    // success, send the user to login
    window.location.href = "index.html"
  } catch(error) {
    showErrors([
      "Unable to connect to the server. Please try again."
    ])
    console.error("registration request failed:", error)
  }
}

function getLoginErrors(username, password) {
  const errors = [];

  if (!username.trim()) {
    errors.push("Username is required");
    markIncorrect(usernameInput);
  }


  if (!password) {
    errors.push("Password is required");
    markIncorrect(passwordInput);
  }

  return errors;
}

function getRegisterErrors(firstName, lastName, username, email, phone, password, confirmPasswordValue) {
  const errors = getLoginErrors(username, password);

  if(!firstName.trim()) {
    errors.push("First name is required")
    markIncorrect(firstNameInput)
  }

  if(!lastName.trim()) {
    errors.push("Last name is required")
    markIncorrect(lastNameInput)
  }

  if (!email.trim()) {
    errors.push("Email is required");
    markIncorrect(emailInput);
  }

  if(!(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()))) {
    errors.push("Email not valid")
    markIncorrect(emailInput)
  }
// validate phone length
if (phone.trim().length > 25) {
    errors.push("Phone number must be 25 characters or less");
    markIncorrect(phoneInput);
}

  if (password && password.length < 8) {
    errors.push("Password must be at least 8 characters");
    markIncorrect(passwordInput);
  }

  if (password !== confirmPasswordValue) {
    errors.push("Passwords don't match");
    markIncorrect(passwordInput);
    markIncorrect(confirmPasswordInput);
  }

  return errors;
}

function markIncorrect(input) {
  if (input?.parentElement) {
    input.parentElement.classList.add("incorrect");
  }
}

function showErrors(errors) {
  if (errorMessage) {
    errorMessage.textContent = errors.join(". ");
  }
}

const allInputs = [
  firstNameInput,
  lastNameInput,
  usernameInput,
  emailInput,
  phoneInput,
  passwordInput,
  confirmPasswordInput
].filter(Boolean);

allInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.parentElement?.classList.remove("incorrect");
    if (errorMessage) errorMessage.textContent = "";
  });
});
