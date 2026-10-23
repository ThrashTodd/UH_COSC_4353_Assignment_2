/*Live admin dashboard, FastAPI source of truth.*/
(() => {
  const API = 'http://127.0.0.1:8000';
  const $ = id => document.getElementById(id);
  const overview = $('serviceOverview');
  if (!overview) return;

  const username = localStorage.getItem('currentUser');
  if (!username) { location.replace('index.html'); return; }
  $('adminUsername').textContent = username;
  $('menuBtn')?.addEventListener('click', () => $('sidebar')?.classList.toggle('open'));
  $('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    location.replace('index.html');
  });

  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try { const body = await response.json(); if (typeof body.detail === 'string') detail = body.detail; } catch (_) {}
      throw new Error(detail);
    }
    return response.status === 204 ? null : response.json();
  }

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function setText(id, value) { $(id).textContent = String(value); }
  function showError(text) {
    let el = $('dashboardError');
    if (!el) {
      el = make('p', 'form-feedback error');
      el.id = 'dashboardError';
      el.setAttribute('role', 'alert');
      overview.before(el);
    }
    el.textContent = text;
    el.classList.toggle('hidden', !text);
  }
  function cardFor(service, queueLength) {
    const card = make('article', 'admin-service-card');
    const top = make('div', 'admin-service-card-top');
    const heading = make('div');
    heading.append(make('p', 'eyebrow', `${service.priority} priority`), make('h4', '', service.name));
    top.append(heading, make('span', `badge ${service.isOpen ? 'success' : 'neutral'}`, service.isOpen ? 'Open' : 'Closed'));
    card.append(top, make('p', '', service.description));

    const details = make('div', 'admin-service-details');
    const waiting = make('div');
    waiting.append(make('span', '', 'Queue length'), make('strong', '', queueLength));
    const duration = make('div');
    duration.append(make('span', '', 'Expected duration'), make('strong', '', `${service.duration} min`));
    details.append(waiting, duration);
    card.append(details);

    const actions = make('div', 'admin-card-actions');
    const link = make('a', 'btn btn-outline', 'View Queue');
    link.href = `queue_management.html?service=${encodeURIComponent(service.id)}`;
    const toggle = make('button', 'btn btn-primary', service.isOpen ? 'Close Queue' : 'Open Queue');
    toggle.type = 'button';
    toggle.dataset.toggleService = service.id;
    actions.append(link, toggle);
    card.append(actions);
    return card;
  }

  let loading = false;
  async function renderDashboard() {
    if (loading) return;
    loading = true;
    try {
      const [services, queues] = await Promise.all([api('/services'), api('/queues')]);
      const counts = new Map(queues.map(q => [q.service_id, q.waiting_count]));
      const lengths = services.map(s => counts.get(s.id) ?? 0);
      setText('totalServicesStat', services.length);
      setText('openQueuesStat', services.filter(s => s.isOpen).length);
      setText('totalWaitingStat', lengths.reduce((sum, n) => sum + n, 0));
      setText('longestQueueStat', Math.max(0, ...lengths));
      overview.replaceChildren(...services.map(s => cardFor(s, counts.get(s.id) ?? 0)));
      showError('');
    } catch (e) { showError(`Unable to refresh dashboard: ${e.message}`); }
    finally { loading = false; }
  }

  overview.addEventListener('click', async event => {
    const button = event.target.closest('button[data-toggle-service]');
    if (!button || loading) return;
    const opening = button.textContent.trim() === 'Open Queue';
    button.disabled = true;
    try {
      await api(`/services/${encodeURIComponent(button.dataset.toggleService)}/status`, {
        method: 'PATCH', body: JSON.stringify({isOpen: opening})
      });
      await renderDashboard();
    } catch (e) { showError(`Unable to change status: ${e.message}`); button.disabled = false; }
  });

  renderDashboard();
  setInterval(renderDashboard, 10000);
  window.addEventListener('focus', renderDashboard);
})();
