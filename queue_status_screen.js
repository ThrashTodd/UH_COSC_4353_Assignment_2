(function () {
  const username=getCurrentUsername(), user=username?getUser(username):null;
  if(!user || user.role==='admin')return;
  const $=id=>document.getElementById(id);
  const text=(id,value)=>{if($(id))$(id).textContent=value;};
  const statuses=['checked-in','waiting','almost-ready','in-service','served'];
  let toastTimer;
  function timeText(raw) {
    if(!raw)return 'Not recorded';
    const date=new Date(raw);return Number.isNaN(date.getTime())?raw:date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  }
  function toast(title,message){
    text('toastTitle',title);text('toastText',message);$('toast').classList.remove('hidden');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500);
  }
  function closeLeave(){ $('leaveModal').classList.add('hidden');document.body.classList.remove('modal-open');$('leaveBtn').focus(); }
  function person(type,label,title){const el=document.createElement('div');el.className=`person ${type}`;el.textContent=label;el.title=title;$('lineViz').append(el);}
  function renderNotifications(q){
    $('notifList').replaceChildren();
    const records=q.notifications?.length?q.notifications:[{title:'You joined a queue',message:`${q.service} · Ticket ${q.ticket} · Estimated wait ${q.wait} min`,time:q.joinedAt,read:false}];
    for(const n of records){
      const box=document.createElement('div');box.className=`notification ${n.read?'':'unread'}`;
      const dot=document.createElement('div');dot.className='notif-dot';box.append(dot);
      const copy=document.createElement('div');
      for(const [tag,value] of [['strong',n.title],['p',n.message],['span',timeText(n.time)]]){const el=document.createElement(tag);el.textContent=value || '';copy.append(el);}
      box.append(copy);$('notifList').append(box);
    }
  }
  function render(){
    let q;
    try{q=PatientData.queue();}catch(error){toast('Unable to load queue',error.message);return;}
    $('activeView').classList.toggle('hidden',!q);$('emptyView').classList.toggle('hidden',Boolean(q));
    if(!q){$('leaveModal').classList.add('hidden');document.body.classList.remove('modal-open');return;}
    const status=q.status || 'waiting';
    const waiting=!['in-service','served'].includes(status);
    const position=Math.max(1,Number(q.position)||1),ahead=waiting?position-1:0;
    const wait=Math.max(0,Number(q.wait)||0);
    const copy={waiting:["You're in line",'Your saved position and estimate are shown below.'],
      'almost-ready':['Almost your turn','Please stay near the front desk.'],
      'in-service':["It's your turn",q.room?`Please go to ${q.room}.`:'Please check with the front desk.'],
      served:['Visit complete','Your completed visit has been saved to your history.'],
      'checked-in':['Checked in','You have joined the queue.']};
    const [title,message]=copy[status] || copy.waiting;
    $('hero').className=`hero-card ${status}`;text('heroEyebrow',title);
    text('heroTitle',q.doctor?`${q.service} with ${q.doctor}`:q.service);text('heroMessage',message);
    text('ticketNumber',q.ticket);text('ticketRoom',q.room || 'Room not assigned');
    text('statPosition',waiting?`#${position}`:'—');text('statAhead',ahead);
    text('statWait',status==='served'?'Done':status==='in-service'?'Now':`~${wait} min`);
    text('statCheckedIn',timeText(q.joinedAt));
    text('statusBadge',PatientData.status(status));$('statusBadge').className=`badge ${status==='almost-ready'?'warning':status==='in-service'?'info':status==='served'?'neutral':'success'}`;
    const stage=Math.max(0,statuses.indexOf(status));
    document.querySelectorAll('#stepper li').forEach((el,index)=>{el.classList.toggle('done',index<stage || status==='served');el.classList.toggle('current',index===stage && status!=='served');});
    $('lineViz').replaceChildren();
    if(status==='served')$('lineViz').textContent='Your visit is complete.';
    else {

      for(let i=1;i<=Math.min(ahead,30);i++)person('',`#${i}`,'Ahead of you');
      if(ahead>30)person('',`+${ahead-30}`,'Additional patients ahead');
      person(status==='in-service'?'serving':'you','You',status==='in-service'?'Being served':'Your position');
    }
    text('lineTitle',`${q.service} queue`);text('lineCount',waiting?`${ahead} ahead of you`:PatientData.status(status));
    const percent=stage*25; text('progressPct',`${percent}%`);$('progressBar').style.width=`${percent}%`;
    text('dService',q.service);text('dDoctor',q.doctor || 'Not assigned');text('dRoom',q.room || 'Not assigned');
    text('dAvg',Number.isFinite(q.perPerson)?`~${Math.round(q.perPerson*10)/10} min (estimated)`:'Not recorded');text('dJoined',timeText(q.joinedAt));
    text('leaveBtn',status==='served'?'Close visit':'Leave Queue');text('modalTicket',q.ticket);
    $('advanceDemoBtn').disabled=status==='served';
    renderNotifications(q);
  }
  $('refreshBtn').addEventListener('click',()=>{render();toast('Queue refreshed','Loaded your latest saved queue.');});
  $('advanceDemoBtn').addEventListener('click',()=>{try{PatientData.advance();}catch(error){toast('Unable to update',error.message);}});
  $('leaveBtn').addEventListener('click',()=>{
    const q=PatientData.queue();if(!q)return;
    if(q.status==='served'){PatientData.leave();toast('Visit closed','You can join another queue.');return;}
    $('leaveModal').classList.remove('hidden');document.body.classList.add('modal-open');$('cancelLeave').focus();
  });
  $('cancelLeave').addEventListener('click',closeLeave);
  $('confirmLeave').addEventListener('click',()=>{try{PatientData.leave();closeLeave();toast('You left the queue','Your cancelled visit is saved in history.');}catch(error){toast('Unable to leave',error.message);}});
  $('leaveModal').addEventListener('click',e=>{if(e.target===$('leaveModal'))closeLeave();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && !$('leaveModal').classList.contains('hidden'))closeLeave();});
  $('markReadBtn').addEventListener('click',()=>{
    const q=PatientData.queue();if(!q)return;
    q.notifications=q.notifications?.length?q.notifications:[{title:'You joined a queue',message:`${q.service} · Ticket ${q.ticket} · Estimated wait ${q.wait} min`,time:q.joinedAt,read:false}];
    q.notifications.forEach(n=>n.read=true);PatientData.save(q);
  });
  window.addEventListener('storage',e=>{if(e.key===PatientData.key()||e.key===null)render();});
  window.addEventListener('patient-data-changed',render);window.addEventListener('focus',render);render();
})();
