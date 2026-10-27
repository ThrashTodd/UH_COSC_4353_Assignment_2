/* This file handles and displays the saved data on the dashboard and history pages. */
(function () {
  const username = localStorage.getItem("currentUser");
  if (!username) {
    window.location.replace("index.html");
    return;
  }
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{if($(id))$(id).textContent=value;};
  function formatDate(value) {
    if(!value)return 'Not recorded';
    const date=new Date(value);return Number.isNaN(date.getTime())?'Not recorded':date.toLocaleDateString();
  }

  async function renderQueueCard() {
    if(!$('activeQueueState'))return;
    const q=await PatientData.queue();
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
  
  async function render() {
    try {
        await renderQueueCard();
    } catch (error) {
        console.error(error);
        text('currentQueueStat', 'Unable to load queue');
    }
}
  $('leaveQueueBtn')?.addEventListener('click',async()=>{
    if(!confirm('Leave this queue? You will lose your position.')) return;
    try { await PatientData.leave(); await render(); }
    catch(error) { alert(error.message); }
  });
  $('markReadBtn')?.addEventListener('click',()=>document.querySelectorAll('#notificationList .notification').forEach(el=>el.classList.remove('unread')));
  window.addEventListener('storage',e=>{if(e.key==='users'||e.key==='currentUser'||e.key===null)render();});
  window.addEventListener('patient-data-changed',render);window.addEventListener('focus',render);render();setInterval(render,10000);
})();
