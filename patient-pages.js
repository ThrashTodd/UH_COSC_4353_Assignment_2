(function () {
  const username=getCurrentUsername(), user=username?getUser(username):null;
  if(!user || user.role==='admin')return; // app.js handles redirection.
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{if($(id))$(id).textContent=value;};
  function formatDate(value) {
    if(!value)return 'Not recorded';
    const date=new Date(value);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleDateString();
  }
  function renderHistory() {
    const history=PatientData.history();
    const sorted=history.map((record,index)=>({record,index})).sort((a,b)=>{
      const stamp=r=>{const d=PatientData.date(r);return d?(Date.parse(d)||0):0;};
      return stamp(b.record)-stamp(a.record)||a.index-b.index;
    }).map(x=>x.record);
    const body=$('historyTableBody');
    if(body){
      body.replaceChildren();const columns=Number(body.dataset.columns)||5;
      const limit=Number(body.dataset.limit)||sorted.length;
      for(const record of sorted.slice(0,limit)) {
        const row=document.createElement('tr');
        const cells=[formatDate(PatientData.date(record)),record.service || 'Not recorded'];
        if(columns===6)cells.push(record.doctor || record.physician || 'Not recorded');
        cells.push(record.ticket ?? 'Not recorded',record.wait!==null && record.wait!==undefined && Number.isFinite(Number(record.wait))?`${record.wait} min`:'Not recorded');
        for(const value of cells){const td=document.createElement('td');td.textContent=value;row.append(td);}
        const td=document.createElement('td'),badge=document.createElement('span');
        const status=PatientData.status(record.status);badge.className=`badge ${status==='Completed'?'success':'neutral'}`;badge.textContent=status;td.append(badge);row.append(td);body.append(row);
      }
      if(!sorted.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=columns;cell.textContent='No previous visits recorded for your account.';row.append(cell);body.append(row);}
    }
    const now=new Date();
    text('visitsThisMonth',history.filter(r=>{
      const raw=PatientData.date(r);if(!raw || PatientData.status(r.status)!=='Completed')return false;
      const d=new Date(raw);return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
    }).length);
  }
  function renderQueueCard() {
    if(!$('activeQueueState'))return;
    const q=PatientData.queue();
    $('emptyQueueState').classList.toggle('hidden',Boolean(q));$('activeQueueState').classList.toggle('hidden',!q);
    text('currentQueueStat',q?.service || 'Not joined');text('waitStat',q?`${q.wait} min`:'—');
    const waiting=q && !['in-service','served'].includes(q.status);
    text('positionStat',waiting?`#${q.position}`:'—');text('queueBadge',q?PatientData.status(q.status || 'waiting'):'Inactive');
    if(!q)return;
    text('activeService',q.service);text('ticketNumber',q.ticket);text('queuePosition',waiting?q.position:'—');text('queueWait',`${q.wait} min`);
    text('progressText',waiting?`${Math.max(0,q.position-1)} patients ahead`:PatientData.status(q.status));
    if($('progressBar'))$('progressBar').style.width=`${waiting?Math.min(100,100/Math.max(1,q.position)):100}%`;
    const badge=$('activeQueueState').querySelector('.queue-title-row .badge');if(badge)badge.textContent=PatientData.status(q.status || 'waiting');
    text('leaveQueueBtn',q.status==='served'?'Close visit':'Leave Queue');
  }
  function render(){try{renderHistory();renderQueueCard();}catch(error){console.error(error);text('currentQueueStat','Unable to read saved data');}}
  $('leaveQueueBtn')?.addEventListener('click',()=>{
    const q=PatientData.queue();if(!q)return;
    if(q.status==='served' || confirm('Leave this queue? You will lose your position.')){try{PatientData.leave();}catch(error){alert(error.message);}}
  });
  $('markReadBtn')?.addEventListener('click',()=>document.querySelectorAll('#notificationList .notification').forEach(el=>el.classList.remove('unread')));
  window.addEventListener('storage',e=>{if(e.key==='users'||e.key===PatientData.key()||e.key===null)render();});
  window.addEventListener('patient-data-changed',render);window.addEventListener('focus',render);render();
})();
