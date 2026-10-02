const ADMIN_SERVICES_KEY = "queuesmartAdminServices";
const ADMIN_QUEUES_KEY = "queuesmartAdminQueues";

const DEFAULT_ADMIN_SERVICES = [
  {
    id: "general-examination",
    name: "General Examination",
    description: "Routine dental examination and consultation.",
    duration: 20,
    priority: "medium",
    isOpen: true
  },
  {
    id: "dental-cleaning",
    name: "Dental Cleaning",
    description: "Professional cleaning, scaling, and polishing.",
    duration: 30,
    priority: "low",
    isOpen: true
  },
  {
    id: "emergency-care",
    name: "Emergency Care",
    description: "Urgent care for pain, swelling, or dental injury.",
    duration: 15,
    priority: "high",
    isOpen: true
  },
  {
    id: "orthodontic-consultation",
    name: "Orthodontic Consultation",
    description: "Consultation for braces, aligners, and bite alignment.",
    duration: 30,
    priority: "medium",
    isOpen: false
  }
];

const DEFAULT_ADMIN_QUEUES = {
  "general-examination": [
    { username: "user1", ticket: "A-201" },
    { username: "ArthurM", ticket: "A-202" }
  ],
  "dental-cleaning": [
    { username: "SophieS", ticket: "C-115" }
  ],
  "emergency-care": [
    { username: "user2", ticket: "E-041" }
  ],
  "orthodontic-consultation": []
};

initializeAdminData();
protectAdminPage();
initializeSharedAdminUI();
initializeDashboard();
initializeServiceManagement();
initializeQueueManagement();

function initializeAdminData() {
  if (!localStorage.getItem(ADMIN_SERVICES_KEY)) {
    localStorage.setItem(
      ADMIN_SERVICES_KEY,
      JSON.stringify(DEFAULT_ADMIN_SERVICES)
    );
  }

  if (!localStorage.getItem(ADMIN_QUEUES_KEY)) {
    localStorage.setItem(
      ADMIN_QUEUES_KEY,
      JSON.stringify(DEFAULT_ADMIN_QUEUES)
    );
  }
}

function getServices() {
  return JSON.parse(localStorage.getItem(ADMIN_SERVICES_KEY)) || [];
}

function saveServices(services) {
  localStorage.setItem(ADMIN_SERVICES_KEY, JSON.stringify(services));
}

function getQueues() {
  return JSON.parse(localStorage.getItem(ADMIN_QUEUES_KEY)) || {};
}

function saveQueues(queues) {
  localStorage.setItem(ADMIN_QUEUES_KEY, JSON.stringify(queues));
}

function protectAdminPage() {
  const adminUsername = getCurrentUsername();
  const adminUser = adminUsername ? getUser(adminUsername) : null;

  if (!adminUser) {
    window.location.href = "index.html";
    return;
  }

  if (adminUser.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  document.querySelectorAll("#adminUsername").forEach((element) => {
    element.textContent = adminUsername;
  });
}

function initializeSharedAdminUI() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (sidebar && menuBtn) {
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearCurrentUser();
      window.location.href = "index.html";
    });
  }
}

function initializeDashboard() {
  const serviceOverview = document.getElementById("serviceOverview");

  if (!serviceOverview) {
    return;
  }

  renderDashboard();

  serviceOverview.addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-toggle-service]");

    if (!toggleButton) {
      return;
    }

    toggleServiceStatus(toggleButton.dataset.toggleService);
    renderDashboard();
  });
}

function renderDashboard() {
  const services = getServices();
  const queues = getQueues();
  const serviceOverview = document.getElementById("serviceOverview");

  const totalWaiting = services.reduce(
    (total, service) => total + (queues[service.id]?.length || 0),
    0
  );

  const openQueues = services.filter((service) => service.isOpen).length;
  const longestQueue = services.reduce(
    (longest, service) => Math.max(longest, queues[service.id]?.length || 0),
    0
  );

  document.getElementById("totalServicesStat").textContent = services.length;
  document.getElementById("openQueuesStat").textContent = openQueues;
  document.getElementById("totalWaitingStat").textContent = totalWaiting;
  document.getElementById("longestQueueStat").textContent = longestQueue;

  serviceOverview.innerHTML = services
    .map((service) => {
      const queueLength = queues[service.id]?.length || 0;
      const statusClass = service.isOpen ? "success" : "neutral";
      const statusText = service.isOpen ? "Open" : "Closed";
      const actionText = service.isOpen ? "Close Queue" : "Open Queue";

      return `
        <article class="admin-service-card">
          <div class="admin-service-card-top">
            <div>
              <p class="eyebrow">${capitalize(service.priority)} priority</p>
              <h4>${escapeHTML(service.name)}</h4>
            </div>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>

          <p>${escapeHTML(service.description)}</p>

          <div class="admin-service-details">
            <div>
              <span>Queue length</span>
              <strong>${queueLength}</strong>
            </div>
            <div>
              <span>Expected duration</span>
              <strong>${service.duration} min</strong>
            </div>
          </div>

          <div class="admin-card-actions">
            <a class="btn btn-outline" href="queue-management.html?service=${encodeURIComponent(service.id)}">View Queue</a>
            <button class="btn btn-primary" type="button" data-toggle-service="${service.id}">${actionText}</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function initializeServiceManagement() {
  const serviceForm = document.getElementById("serviceForm");
  const serviceTableBody = document.getElementById("serviceTableBody");

  if (!serviceForm || !serviceTableBody) {
    return;
  }

  renderServiceTable();

  serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveServiceFromForm();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    resetServiceForm();
  });

  serviceTableBody.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-service]");
    const deleteButton = event.target.closest("[data-delete-service]");
    const toggleButton = event.target.closest("[data-toggle-service]");

    if (editButton) {
      beginServiceEdit(editButton.dataset.editService);
    }

    if (deleteButton) {
      deleteService(deleteButton.dataset.deleteService);
    }

    if (toggleButton) {
      toggleServiceStatus(toggleButton.dataset.toggleService);
      renderServiceTable();
    }
  });
}

function saveServiceFromForm() {
  const idInput = document.getElementById("serviceId");
  const nameInput = document.getElementById("serviceName");
  const descriptionInput = document.getElementById("serviceDescription");
  const durationInput = document.getElementById("serviceDuration");
  const priorityInput = document.getElementById("servicePriority");

  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const duration = Number(durationInput.value);
  const priority = priorityInput.value;

  if (!name || name.length > 100) {
    showServiceMessage("Enter a service name between 1 and 100 characters.", true);
    return;
  }

  if (!description) {
    showServiceMessage("Description is required.", true);
    return;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    showServiceMessage("Expected duration must be greater than 0 minutes.", true);
    return;
  }

  const services = getServices();
  const queues = getQueues();
  const existingId = idInput.value;

  if (existingId) {
    const service = services.find((item) => item.id === existingId);

    if (!service) {
      return;
    }

    service.name = name;
    service.description = description;
    service.duration = duration;
    service.priority = priority;

    showServiceMessage("Service updated successfully.");
  } else {
    const id = createServiceId(name, services);

    services.push({
      id,
      name,
      description,
      duration,
      priority,
      isOpen: true
    });

    queues[id] = [];
    saveQueues(queues);
    showServiceMessage("Service created successfully.");
  }

  saveServices(services);
  resetServiceForm(false);
  renderServiceTable();
}

function renderServiceTable() {
  const services = getServices();
  const serviceTableBody = document.getElementById("serviceTableBody");

  serviceTableBody.innerHTML = services
    .map((service) => {
      const statusClass = service.isOpen ? "success" : "neutral";
      const statusText = service.isOpen ? "Open" : "Closed";
      const toggleText = service.isOpen ? "Close" : "Open";

      return `
        <tr>
          <td>
            <strong>${escapeHTML(service.name)}</strong>
            <span class="table-description">${escapeHTML(service.description)}</span>
          </td>
          <td>${service.duration} min</td>
          <td>${capitalize(service.priority)}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td>
            <div class="table-actions">
              <button class="small-action-btn" type="button" data-edit-service="${service.id}">Edit</button>
              <button class="small-action-btn" type="button" data-toggle-service="${service.id}">${toggleText}</button>
              <button class="small-action-btn danger-text" type="button" data-delete-service="${service.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function beginServiceEdit(serviceId) {
  const service = getServices().find((item) => item.id === serviceId);

  if (!service) {
    return;
  }

  document.getElementById("serviceId").value = service.id;
  document.getElementById("serviceName").value = service.name;
  document.getElementById("serviceDescription").value = service.description;
  document.getElementById("serviceDuration").value = service.duration;
  document.getElementById("servicePriority").value = service.priority;
  document.getElementById("serviceFormTitle").textContent = "Edit Service";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  document.getElementById("serviceForm").scrollIntoView({ behavior: "smooth" });
}

function resetServiceForm(clearMessage = true) {
  document.getElementById("serviceForm").reset();
  document.getElementById("serviceId").value = "";
  document.getElementById("servicePriority").value = "low";
  document.getElementById("serviceFormTitle").textContent = "Add Service";
  document.getElementById("cancelEditBtn").classList.add("hidden");

  if (clearMessage) {
    document.getElementById("serviceFormMessage").classList.add("hidden");
  }
}

function deleteService(serviceId) {
  const services = getServices();
  const service = services.find((item) => item.id === serviceId);

  if (!service) {
    return;
  }

  if (!confirm(`Delete ${service.name}?`)) {
    return;
  }

  const updatedServices = services.filter((item) => item.id !== serviceId);
  const queues = getQueues();

  delete queues[serviceId];
  saveServices(updatedServices);
  saveQueues(queues);
  renderServiceTable();
  resetServiceForm();
}

function toggleServiceStatus(serviceId) {
  const services = getServices();
  const service = services.find((item) => item.id === serviceId);

  if (!service) {
    return;
  }

  service.isOpen = !service.isOpen;
  saveServices(services);
}

function showServiceMessage(message, isError = false) {
  const messageElement = document.getElementById("serviceFormMessage");

  messageElement.textContent = message;
  messageElement.classList.remove("hidden", "error");

  if (isError) {
    messageElement.classList.add("error");
  }
}

function initializeQueueManagement() {
  const serviceSelect = document.getElementById("queueServiceSelect");
  const queueList = document.getElementById("queueList");

  if (!serviceSelect || !queueList) {
    return;
  }

  populateQueueServiceSelect();

  const requestedService = new URLSearchParams(window.location.search).get("service");
  const services = getServices();

  if (requestedService && services.some((service) => service.id === requestedService)) {
    serviceSelect.value = requestedService;
  }

  renderSelectedQueue();

  serviceSelect.addEventListener("change", renderSelectedQueue);

  document.getElementById("serveNextBtn").addEventListener("click", serveNextUser);
  document.getElementById("toggleSelectedQueueBtn").addEventListener("click", () => {
    toggleServiceStatus(serviceSelect.value);
    renderSelectedQueue();
  });

  queueList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-queue-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.queueAction;
    const index = Number(actionButton.dataset.index);

    updateQueueOrder(action, index);
  });
}

function populateQueueServiceSelect() {
  const serviceSelect = document.getElementById("queueServiceSelect");
  const services = getServices();

  serviceSelect.innerHTML = services
    .map(
      (service) =>
        `<option value="${service.id}">${escapeHTML(service.name)}</option>`
    )
    .join("");
}

function renderSelectedQueue() {
  const serviceSelect = document.getElementById("queueServiceSelect");
  const service = getServices().find((item) => item.id === serviceSelect.value);

  if (!service) {
    return;
  }

  const queues = getQueues();
  const queue = queues[service.id] || [];

  document.getElementById("selectedServiceStat").textContent = service.name;
  document.getElementById("selectedQueueLengthStat").textContent = queue.length;
  document.getElementById("selectedDurationStat").textContent = `${service.duration} min`;
  document.getElementById("selectedQueueStatusStat").textContent = service.isOpen ? "Open" : "Closed";
  document.getElementById("queueListTitle").textContent = `${service.name} Queue`;
  document.getElementById("toggleSelectedQueueBtn").textContent = service.isOpen
    ? "Close Queue"
    : "Open Queue";

  const queueList = document.getElementById("queueList");

  if (queue.length === 0) {
    queueList.innerHTML = `
      <div class="admin-empty-state">
        <h4>No users are waiting</h4>
        <p>This queue is currently empty.</p>
      </div>
    `;
    return;
  }

  queueList.innerHTML = queue
    .map(
      (entry, index) => `
        <article class="queue-admin-row">
          <div class="queue-position-number">${index + 1}</div>
          <div class="queue-user-copy">
            <strong>${escapeHTML(entry.username)}</strong>
            <span>Ticket ${escapeHTML(entry.ticket)}</span>
          </div>
          <div class="queue-row-actions">
            <button class="small-action-btn" type="button" data-queue-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>Move Up</button>
            <button class="small-action-btn" type="button" data-queue-action="down" data-index="${index}" ${index === queue.length - 1 ? "disabled" : ""}>Move Down</button>
            <button class="small-action-btn danger-text" type="button" data-queue-action="remove" data-index="${index}">Remove</button>
          </div>
        </article>
      `
    )
    .join("");
}

function updateQueueOrder(action, index) {
  const serviceId = document.getElementById("queueServiceSelect").value;
  const queues = getQueues();
  const queue = queues[serviceId] || [];

  if (action === "up" && index > 0) {
    [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
  }

  if (action === "down" && index < queue.length - 1) {
    [queue[index + 1], queue[index]] = [queue[index], queue[index + 1]];
  }

  if (action === "remove") {
    queue.splice(index, 1);
    showQueueMessage("User removed from the queue.");
  }

  queues[serviceId] = queue;
  saveQueues(queues);
  renderSelectedQueue();
}

function serveNextUser() {
  const serviceId = document.getElementById("queueServiceSelect").value;
  const queues = getQueues();
  const queue = queues[serviceId] || [];

  if (queue.length === 0) {
    showQueueMessage("There is no user to serve in this queue.", true);
    return;
  }

  const servedUser = queue.shift();
  queues[serviceId] = queue;
  saveQueues(queues);

  showQueueMessage(`${servedUser.username} has been served.`);
  renderSelectedQueue();
}

function showQueueMessage(message, isError = false) {
  const messageElement = document.getElementById("queueMessage");

  messageElement.textContent = message;
  messageElement.classList.remove("hidden", "error");

  if (isError) {
    messageElement.classList.add("error");
  }
}

function createServiceId(name, services) {
  const baseId = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "service";

  let id = baseId;
  let counter = 2;

  while (services.some((service) => service.id === id)) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }

  return id;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
