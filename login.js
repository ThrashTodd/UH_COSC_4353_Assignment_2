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

function loginUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const user = getUser(username);

  if (!user) {
    showErrors(["User not found"]);
    return;
  }

  if (user.password !== password) {
    showErrors(["Password incorrect"]);
    return;
  }

  setCurrentUser(username);

  if (user.role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "user.html";
  }
}

function registerUser() {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const created = addNewUser(username, email, password);

  if (!created) {
    showErrors(["Username taken, try again"]);
    return;
  }

  window.location.href = "index.html";
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
