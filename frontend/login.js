const form = document.getElementById("form")
const usernameInput = document.getElementById("usernameInput")
const emailInput = document.getElementById("emailInput")
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
        usernameInput.value,
        emailInput.value,
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
  const username = usernameInput.value.trim()
  const email = emailInput.value.trim()
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
          username: username,
          email: email,
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

function getRegisterErrors(username, email, password, confirmPasswordValue) {
  const errors = getLoginErrors(username, password);

  if (!email.trim()) {
    errors.push("Email is required");
    markIncorrect(emailInput);
  }

  if(!(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim()))) {
    errors.push("Email not valid")
    markIncorrect(emailInput)
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
  usernameInput,
  emailInput,
  passwordInput,
  confirmPasswordInput
].filter(Boolean);

allInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.parentElement?.classList.remove("incorrect");
    if (errorMessage) errorMessage.textContent = "";
  });
});
