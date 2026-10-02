// Authentication / current user management
const currentUsername = getCurrentUsername();
const currentUser = currentUsername ? getUser(currentUsername) : null;

if (!currentUser) {
  window.location.href = "index.html";
} else if (currentUser.role === "admin") {
  window.location.href = "admin.html";
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

// Give each signed-in user a separate saved queue.
const stateKey = `queuesmartQueue:${currentUsername}`;

function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(stateKey));
  } catch {
    return null;
  }
}

function saveQueue(queue) {
  localStorage.setItem(stateKey, JSON.stringify(queue));
}

function clearQueue() {
  localStorage.removeItem(stateKey);
}

// Dashboard behavior
const currentQueueStat = document.getElementById("currentQueueStat");

if (currentQueueStat) {
  const queue = getQueue();
  const empty = document.getElementById("emptyQueueState");
  const active = document.getElementById("activeQueueState");
  const badge = document.getElementById("queueBadge");
  const waitStat = document.getElementById("waitStat");
  const positionStat = document.getElementById("positionStat");

  if (queue) {
    currentQueueStat.textContent = queue.service;
    waitStat.textContent = `${queue.wait} min`;
    positionStat.textContent = `#${queue.position}`;

    empty.classList.add("hidden");
    active.classList.remove("hidden");
    badge.textContent = "Active";
    badge.className = "badge success";

    document.getElementById("activeService").textContent = queue.service;
    document.getElementById("ticketNumber").textContent = queue.ticket;
    document.getElementById("queuePosition").textContent = queue.position;
    document.getElementById("queueWait").textContent = `${queue.wait} min`;
    document.getElementById("progressText").textContent =
      `${Math.max(queue.position - 1, 0)} patients ahead`;
    document.getElementById("progressBar").style.width =
      `${Math.max(20, 100 - queue.position * 12)}%`;

    const notificationList = document.getElementById("notificationList");

    if (notificationList) {
      const notice = document.createElement("div");
      notice.className = "notification unread";
      notice.innerHTML = `
        <div class="notif-dot"></div>
        <div>
          <strong>You joined a queue</strong>
          <p>${queue.service} · Ticket ${queue.ticket} · Position #${queue.position} · Estimated wait ${queue.wait} min</p>
          <span>${new Date(queue.joinedAt).toLocaleString()}</span>
        </div>
      `;
      notificationList.prepend(notice);
    }
  }

  const leaveBtn = document.getElementById("leaveQueueBtn");

  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to leave this queue?")) {
        clearQueue();
        location.reload();
      }
    });
  }

  const markReadBtn = document.getElementById("markReadBtn");

  if (markReadBtn) {
    markReadBtn.addEventListener("click", () => {
      document
        .querySelectorAll(".notification")
        .forEach((notification) => notification.classList.remove("unread"));
    });
  }
}

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
        ...selectedService,
        position: selectedService.people + 1,
        ticket,
        joinedAt: new Date().toISOString()
      };

      saveQueue(queue);

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
