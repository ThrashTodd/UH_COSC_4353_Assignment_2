/* A3 Service Management UI: backend is the only source of service data. */
(() => {
  const API = "http://127.0.0.1:8000";
  const $ = (id) => document.getElementById(id);
  let services = [];

  function showMessage(message, error = false) {
    const el = $("serviceFormMessage");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.classList.remove("hidden");
  }

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    if (response.status === 204) return null;
    const result = await response.json();
    if (!response.ok) {
      const detail = result.detail;
      const message = Array.isArray(detail)
        ? detail.map(item => `${item.loc?.slice(1).join(".") || "Input"}: ${item.msg}`).join("; ")
        : (detail || "Request failed");
      throw new Error(message);
    }
    return result;
  }

  function resetForm(clearMessage = true) {
    $("serviceForm").reset();
    $("serviceId").value = "";
    $("servicePriority").value = "low";
    $("serviceFormTitle").textContent = "Add Service";
    $("cancelEditBtn").classList.add("hidden");
    if (clearMessage) $("serviceFormMessage").classList.add("hidden");
  }

  function cell(tr, value) {
    const td = document.createElement("td");
    td.textContent = value;
    tr.append(td);
    return td;
  }
  function action(cellElement, text, key, id, danger = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.className = `small-action-btn${danger ? " danger-text" : ""}`;
    button.dataset[key] = id;
    cellElement.append(button);
  }

  function renderServices() {
    const tbody = $("serviceTableBody");
    tbody.replaceChildren();
    for (const service of services) {
      const tr = document.createElement("tr");
      const info = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = service.name;
      const desc = document.createElement("span");
      desc.className = "table-description";
      desc.textContent = service.description;
      info.append(strong, desc);tr.append(info);
      cell(tr, `${service.duration} min`);
      cell(tr, service.priority[0].toUpperCase() + service.priority.slice(1));
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge ${service.isOpen ? "success" : "neutral"}`;
      badge.textContent = service.isOpen ? "Open" : "Closed";
      statusCell.append(badge);tr.append(statusCell);
      const actions = document.createElement("td");
      const wrapper = document.createElement("div");
      wrapper.className = "table-actions";
      action(wrapper, "Edit", "editService", service.id);
      action(wrapper, service.isOpen ? "Close" : "Open", "toggleService", service.id);
      action(wrapper, "Delete", "deleteService", service.id, true);
      actions.append(wrapper);tr.append(actions);
      tbody.append(tr);
    }
  }

  async function refresh() {
    services = await request("/services");
    renderServices();
  }

  async function save(event) {
    event.preventDefault();
    const id = $("serviceId").value;
    const payload = {
      name: $("serviceName").value.trim(),
      description: $("serviceDescription").value.trim(),
      duration: Number($("serviceDuration").value),
      priority: $("servicePriority").value
    };
    try {
      await request(id ? `/services/${encodeURIComponent(id)}` : "/services", {
        method: id ? "PUT" : "POST", body: JSON.stringify(payload)
      });
      await refresh();
      resetForm(false);
      showMessage(id ? "Service updated successfully." : "Service created successfully.");
    } catch (error) { showMessage(error.message, true); }
  }

  function edit(id) {
    const service = services.find(item => item.id === id);
    if (!service) return;
    $("serviceId").value = service.id;
    $("serviceName").value = service.name;
    $("serviceDescription").value = service.description;
    $("serviceDuration").value = service.duration;
    $("servicePriority").value = service.priority;
    $("serviceFormTitle").textContent = "Edit Service";
    $("cancelEditBtn").classList.remove("hidden");
    $("serviceForm").scrollIntoView({ behavior: "smooth" });
  }

  async function handleActions(event) {
    const button = event.target.closest("button");
    if (!button) return;
    try {
      if (button.dataset.editService) return edit(button.dataset.editService);
      if (button.dataset.toggleService) {
        const service = services.find(s => s.id === button.dataset.toggleService);
        await request(`/services/${encodeURIComponent(service.id)}/status`, {
          method: "PATCH", body: JSON.stringify({ isOpen: !service.isOpen })
        });
        await refresh();
        showMessage("Service availability updated.");
      } else if (button.dataset.deleteService) {
        const service = services.find(s => s.id === button.dataset.deleteService);
        if (!confirm(`Delete ${service.name}?`)) return;
        await request(`/services/${encodeURIComponent(service.id)}`, { method: "DELETE" });
        await refresh();
        resetForm(false);
        showMessage("Service deleted.");
      }
    } catch (error) { showMessage(error.message, true); }
  }

  // A2 login remains temporary. Backend admin authorization must be added by auth teammate.
  const username = localStorage.getItem("currentUser");
  if (!username) { location.href = "index.html"; return; }
  $("adminUsername").textContent = username;
  $("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    location.href = "index.html";
  });
  $("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  $("serviceForm").addEventListener("submit", save);
  $("cancelEditBtn").addEventListener("click", () => resetForm());
  $("serviceTableBody").addEventListener("click", handleActions);
  refresh().catch(error => showMessage(`Cannot load services: ${error.message}. Start the Python backend first.`, true));
})();
