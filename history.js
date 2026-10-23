(() => {
  const body = document.getElementById('historyTableBody');
  if (!body) return;
  const api = 'http://127.0.0.1:8000';
  const username = typeof getCurrentUsername === 'function'
    ? getCurrentUsername()
    : localStorage.getItem('currentUser');
  if (!username) return;

  function formatDate(raw) {
    if (!raw) return 'Not recorded';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString();
  }

  function statusText(raw) {
    return ({served:'Completed',complete:'Completed',completed:'Completed',
      left:'Cancelled',removed:'Removed'})[String(raw).toLowerCase()] || raw || 'Not recorded';
  }

  function td(row, value) {
    const cell = document.createElement('td');
    cell.textContent = String(value ?? 'Not recorded');
    row.append(cell);
    return cell;
  }

  function showError(message) {
    body.replaceChildren();
    const row = document.createElement('tr');
    const cell = td(row, message);
    cell.colSpan = Number(body.dataset.columns) || 5;
    body.append(row);
  }

  let generation = 0;
  async function refreshHistory() {
    const requestId = ++generation;
    try {
      const res = await fetch(`${api}/history/user/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const history = await res.json();
      if (requestId !== generation) return;
      const columns = Number(body.dataset.columns) || 5;
      const limit = Number(body.dataset.limit) || history.length;
      body.replaceChildren();
      for (const record of history.slice(0, limit)) {
        const row = document.createElement('tr');
        td(row, formatDate(record.date));
        td(row, record.service);
        if (columns === 6) td(row, record.doctor || 'Not recorded');
        td(row, record.ticket);
        td(row, record.wait === null || record.wait === undefined
          ? 'Not recorded' : `${record.wait} min`);
        const status = td(row, statusText(record.status));
        status.className = statusText(record.status) === 'Completed' ? 'history-completed' : '';
        body.append(row);
      }
      if (!history.length) showError('No previous visits recorded for your account.');
      const count = document.getElementById('visitsThisMonth');
      if (count) {
        const now = new Date();
        const visits = history.filter(r => {
          if (statusText(r.status) !== 'Completed' || !r.date) return false;
          const date = new Date(r.date);
          return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear()
            && date.getMonth() === now.getMonth();
        }).length;
        count.textContent = String(visits);
      }
    } catch (err) {
      showError(`Unable to load history from backend: ${err.message}`);
      console.error(err);
    }
  }

  refreshHistory();
  setInterval(refreshHistory, 10000);
  window.addEventListener('focus', refreshHistory);
  window.addEventListener('patient-data-changed', refreshHistory);
})();
