(() => {
 const BASE='http://127.0.0.1:8000', $=id=>document.getElementById(id);
 let services=[], current=null;
 async function api(path,options={}) {
  const r=await fetch(BASE+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=r.status===204?null:await r.json();
  if(!r.ok)throw new Error(typeof data?.detail==='string'?data.detail:'Request failed');
  return data;
 } 

 function message(s){$('queueMessage').textContent=s;$('queueMessage').classList.remove('hidden');}
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function loadServices(){
   services=await api('/services');
   const wanted=new URLSearchParams(location.search).get('service');
   const selection=$('queueServiceSelect'),prev=selection.value||wanted;
   selection.replaceChildren();
   for(const svc of services){const o=document.createElement('option');o.value=svc.id;o.textContent=svc.name;selection.append(o);}
   if(services.some(s=>s.id===prev))selection.value=prev;
 }

 async function refresh(){
   const sid=$('queueServiceSelect').value;if(!sid)return;
   current=await api('/queues/'+encodeURIComponent(sid));
   $('selectedServiceStat').textContent=current.service_name;
   $('selectedQueueLengthStat').textContent=current.waiting_count;
   $('selectedDurationStat').textContent=current.duration+' min';
   $('selectedQueueStatusStat').textContent=current.isOpen?'Open':'Closed';
   $('queueListTitle').textContent=current.service_name+' Queue';
   $('toggleSelectedQueueBtn').textContent=current.isOpen?'Close Queue':'Open Queue';
   const list=$('queueList');list.replaceChildren();
   if(!current.entries.length){list.textContent='No users are waiting.';return;}
   current.entries.forEach((e,i)=>{
     const article=document.createElement('article');article.className='queue-admin-row';
     const position=document.createElement('div');position.className='queue-position-number';position.textContent=e.position;
     const copy=document.createElement('div');copy.className='queue-user-copy';
     const name=document.createElement('strong');name.textContent=e.username;
     const info=document.createElement('span');info.textContent=`Ticket ${e.ticket} · ${e.priority} priority · ~${e.estimated_wait} min`;
     copy.append(name,info);
     const actions=document.createElement('div');actions.className='queue-row-actions';
     for(const [label,action] of [['Move Up','up'],['Move Down','down'],['Remove','remove']]){
       const btn=document.createElement('button');btn.type='button';btn.className='small-action-btn';btn.textContent=label;
       btn.dataset.entry=e.id;btn.dataset.action=action;
       if((action==='up'&&i===0)||(action==='down'&&i===current.entries.length-1))btn.disabled=true;
       actions.append(btn);
     }
     article.append(position,copy,actions);list.append(article);
   });
 }
 
 async function perform(callback){try{await callback();await refresh();}catch(e){message(e.message);}}
 $('queueServiceSelect').addEventListener('change',()=>perform(async()=>{}));
 $('serveNextBtn').addEventListener('click',()=>perform(async()=>{
   const e=await api('/queues/'+encodeURIComponent($('queueServiceSelect').value)+'/serve-next',{method:'POST'});
   message(`${e.username} served.`);
 }));
 $('toggleSelectedQueueBtn').addEventListener('click',()=>perform(async()=>{
   const s=services.find(x=>x.id===$('queueServiceSelect').value);
   await api('/services/'+encodeURIComponent(s.id)+'/status',{method:'PATCH',body:JSON.stringify({isOpen:!s.isOpen})});
   await loadServices();message('Queue availability updated.');
 }));
 $('queueList').addEventListener('click',e=>{
   const btn=e.target.closest('button[data-action]');if(!btn)return;
   perform(async()=>{
     const id=encodeURIComponent(btn.dataset.entry);
     if(btn.dataset.action==='remove'){
       if(!confirm('Remove this patient from the queue?'))return;
       await api('/queues/entries/'+id,{method:'DELETE'});
     }else await api('/queues/entries/'+id+'/move',{method:'PATCH',body:JSON.stringify({direction:btn.dataset.action})});
   });
 });
 $('menuBtn')?.addEventListener('click',()=>$('sidebar').classList.toggle('open'));
 $('adminUsername').textContent=localStorage.getItem('currentUser')||'Administrator';
 $('logoutBtn')?.addEventListener('click',()=>{localStorage.removeItem('currentUser');location.href='index.html';});
 loadServices().then(refresh).catch(e=>message('Backend unavailable: '+e.message));
})();
