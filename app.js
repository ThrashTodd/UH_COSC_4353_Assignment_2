(function () {
// Authentication / current user management
const currentUsername = getCurrentUsername();
const currentUser = currentUsername ? getUser(currentUsername) : null;

if (!currentUser) {
  window.location.href = "index.html";
  return;
} else if (currentUser.role === "admin") {
  window.location.href = "admin.html";
  return;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

document.querySelectorAll("[data-current-username]").forEach((element) => {
  element.textContent = currentUsername || "User";
});

document.querySelectorAll("[data-current-initials]").forEach((element) => {
  element.textContent = getInitials(currentUsername || "User");
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearCurrentUser();
    window.location.href = "index.html";
  });
}

// Shared navigation
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// Shared patient data; the dashboard, history and status page use the same key.
function getQueue() { return PatientData.queue(); }
function saveQueue(queue) { PatientData.save(queue); }

// Join Queue behavior
const serviceButtons = document.querySelectorAll(".select-service");

if (serviceButtons.length) {
  let selectedService = null;

  const summaryEmpty = document.getElementById("summaryEmpty");
  const summaryDetails = document.getElementById("summaryDetails");
  const joinMessage = document.getElementById("joinMessage");

  function selectService(button) {
    serviceButtons.forEach((serviceButton) => {
      serviceButton.classList.remove("selected");
    });

    button.classList.add("selected");

    selectedService = {
      service: button.dataset.service,
      wait: Number(button.dataset.wait),
      people: Number(button.dataset.people),
      doctor: button.dataset.doctor
    };

    document.getElementById("summaryService").textContent = selectedService.service;
    document.getElementById("summaryDoctor").textContent = selectedService.doctor;
    document.getElementById("summaryPeople").textContent = selectedService.people;
    document.getElementById("summaryWait").textContent = `~${selectedService.wait} minutes`;

    summaryEmpty.classList.add("hidden");
    summaryDetails.classList.remove("hidden");

    if (joinMessage) joinMessage.classList.add("hidden");
  }

  serviceButtons.forEach((button) => {
    button.addEventListener("click", () => selectService(button));
  });

  // Automatically select a service when the dashboard passes it in the URL.
  const params = new URLSearchParams(location.search);
  const requestedService = params.get("service");

  if (requestedService) {
    const matchingButton = [...serviceButtons].find(
      (button) => button.dataset.service === requestedService
    );

    if (matchingButton) selectService(matchingButton);
  }

  const cancelSelectionBtn = document.getElementById("cancelSelectionBtn");

  if (cancelSelectionBtn) {
    cancelSelectionBtn.addEventListener("click", () => {
      selectedService = null;
      serviceButtons.forEach((button) => button.classList.remove("selected"));
      summaryDetails.classList.add("hidden");
      summaryEmpty.classList.remove("hidden");
    });
  }

  const joinQueueBtn = document.getElementById("joinQueueBtn");

  if (joinQueueBtn) {
    joinQueueBtn.addEventListener("click", () => {
      if (!selectedService) return;

      if (getQueue()) {
        if (joinMessage) {
          joinMessage.textContent =
            "You already have an active queue. Leave it from your dashboard before joining another.";
          joinMessage.classList.remove("hidden");
          joinMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        return;
      }

      const prefixes = {
        "General Examination": "A",
        "Dental Cleaning": "C",
        "Emergency Care": "E",
        "Orthodontic Consultation": "O"
      };

      const prefix = prefixes[selectedService.service] || "Q";
      const ticketNumber = Math.floor(100 + Math.random() * 899);
      const ticket = `${prefix}-${ticketNumber}`;

      const queue = {
        id: crypto.randomUUID(),
        status: "waiting",
        ...selectedService,
        position: selectedService.people + 1,
        ticket,
        joinedAt: new Date().toISOString()
      };

      try { saveQueue(queue); } catch (error) {
        joinMessage.textContent = error.message;
        joinMessage.classList.remove("hidden");
        return;
      }

      document.getElementById("confirmationService").textContent = queue.service;
      document.getElementById("confirmationTicket").textContent = queue.ticket;
      document.getElementById("confirmationPosition").textContent = `#${queue.position}`;
      document.getElementById("confirmationWait").textContent = `~${queue.wait} min`;

      const successModal = document.getElementById("successModal");
      successModal.classList.remove("hidden");
      document.body.classList.add("modal-open");
      document.getElementById("closeModalBtn")?.focus();
    });
  }

  const closeModalBtn = document.getElementById("closeModalBtn");

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      document.getElementById("successModal").classList.add("hidden");
      document.body.classList.remove("modal-open");
    });
  }
}

})();
