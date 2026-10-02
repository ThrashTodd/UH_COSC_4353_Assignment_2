/* Shared patient-side storage for the latest uploaded, per-user queue prototype. */
const PatientData = (() => {
  function username() { return getCurrentUsername(); }
  function key() { return `queuesmartQueue:${username()}`; }
  function emit() { window.dispatchEvent(new Event('patient-data-changed')); }
  function queue() {
    if (!username()) return null;
    const raw=localStorage.getItem(key());
    if (!raw) return null;
    const saved=JSON.parse(raw);
    if (!saved || typeof saved.service!=='string') return null;
    return saved;
  }
  function save(value) {
    if (!username()) throw new Error('Please sign in.');
    value.id ||= crypto.randomUUID();
    value.status ||= 'waiting';
    value.initialWait ??= Number(value.wait)||0;
    value.startPosition ??= Math.max(1,Number(value.position)||1);
    if(value.perPerson===undefined && value.startPosition>1)value.perPerson=value.initialWait/(value.startPosition-1);
    localStorage.setItem(key(),JSON.stringify(value));emit();
  }
  function history() { return getUser(username())?.history || []; }
  function date(record) { return record.completedAt || record.date || record.endedAt || null; }
  function status(value) {
    const s=String(value || '').toLowerCase();
    return ({'checked-in':'Checked in',complete:'Completed',completed:'Completed',served:'Completed',cancelled:'Cancelled',canceled:'Cancelled',left:'Cancelled','in-service':'In service','almost-ready':'Almost ready',waiting:'Waiting'})[s] || value || 'Not recorded';
  }
  function archive(value,outcome) {
    const users=getUsersMap(), user=users.get(username());
    if (!user) throw new Error('Account not found.');
    user.history ||= [];
    const visitId=value.id || `${value.ticket}:${value.joinedAt || ''}`;
    // Repeated refresh or repeated completion cannot add the same visit twice.
    if (user.history.some(record=>record.visitId===visitId)) return;
    user.history.unshift({visitId,ticket:value.ticket,service:value.service,doctor:value.doctor || null,
      wait:Number.isFinite(value.initialWait)?value.initialWait:value.wait,
      waitType:'estimate-at-join',status:outcome,joinedAt:value.joinedAt || null,
      endedAt:new Date().toISOString(),...(outcome==='complete'?{completedAt:new Date().toISOString()}:{})});
    saveUsersMap(users);
  }
  function leave() {
    const value=queue();
    if (value) archive(value,value.status==='served'?'complete':'cancelled');
    localStorage.removeItem(key());emit();
  }
  function advance() {
    const value=queue();if(!value || value.status==='served')return;
    value.id ||= crypto.randomUUID();
    value.initialWait ??= Number(value.wait)||0;
    value.startPosition ??= Math.max(1,Number(value.position)||1);
    value.perPerson ??= value.startPosition>1 ? value.initialWait/(value.startPosition-1):0;
    if(value.status==='in-service') {value.status='served';value.wait=0;archive(value,'complete');}
    else if(Number(value.position)>1) {
      value.position=Number(value.position)-1;
      value.wait=Math.max(0,Math.round((value.position-1)*value.perPerson));
      value.status=value.position<=2?'almost-ready':'waiting';
    } else {value.status='in-service';value.wait=0;}
    value.notifications ||= [];
    value.notifications.unshift({title:status(value.status),message:`${value.service} · Position #${value.position} · Estimated wait ${value.wait} min`,time:new Date().toISOString(),read:false});
    save(value);
  }
  return {username,key,queue,save,history,date,status,leave,advance};
})();
