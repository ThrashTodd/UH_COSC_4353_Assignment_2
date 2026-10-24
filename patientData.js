const PatientData = (() => {
  const API = 'http://127.0.0.1:8000';
  const username = () => localStorage.getItem("currentUser");
  const emit = () => window.dispatchEvent(new Event('patient-data-changed'));
  async function request(path, options={}) {
    const response = await fetch(API + path, {
      ...options, headers: {'Content-Type':'application/json', ...(options.headers || {})}
    });
    if(response.status === 404 && path.startsWith('/queues/user/')) return null;
    if(!response.ok) {
      let message = `Request failed (${response.status})`;
      try { const payload=await response.json(); if(typeof payload.detail==='string') message=payload.detail; } catch(_){}
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }

  async function queue() {
    const name=username();
    if(!name) return null;
    const entry=await request('/queues/user/'+encodeURIComponent(name));
    if(!entry) return null;
    let serviceName=entry.service_id;
    let duration=null;
    try {
      const service=await request('/services/'+encodeURIComponent(entry.service_id));
      serviceName=service.name;
      duration=service.duration;
    } catch(e) { console.warn('Service details unavailable:',e); }
    return {
      ...entry,
      service:serviceName,
      wait:entry.estimated_wait,
      joinedAt:entry.joined_at,
      perPerson:duration,
      doctor:null, room:null
    };
  }

  async function leave() {
    const current=await queue();
    if(!current) return null;
    const name=username();
    const record=await request('/queues/entries/'+encodeURIComponent(current.id)+'/leave', {
      method:'POST', body:JSON.stringify({username:name})
    });
    emit();
    return record;
  }
  
  function date(record) { return record.completedAt || record.date || record.endedAt || null; }
  function status(value) {
    const s=String(value || '').toLowerCase();
    return ({'checked-in':'Checked in',complete:'Completed',completed:'Completed',served:'Completed',cancelled:'Cancelled',canceled:'Cancelled',left:'Cancelled',removed:'Removed','in-service':'In service','almost-ready':'Almost ready',waiting:'Waiting'})[s] || value || 'Not recorded';
  }
  return {username,queue,leave,date,status};
})();
