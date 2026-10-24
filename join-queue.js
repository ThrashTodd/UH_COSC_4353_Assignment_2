// Replace app.js join-queue behavior with backend API. Keep app.js on other pages for now.
(() => {
 const API='http://127.0.0.1:8000', $=id=>document.getElementById(id);
 let chosen=null;
 async function api(path,options={}){
   const r=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
   const data=await r.json();if(!r.ok)throw new Error(typeof data?.detail==='string'?data.detail:'Request failed');return data;
 }
 function error(message){$('joinMessage').textContent=message;$('joinMessage').classList.remove('hidden');}
 async function select(service){
   chosen=service;
   const status = await api('/wait-times/' + encodeURIComponent(service.id));
   $('summaryService').textContent=service.name;
   $('summaryDoctor').textContent='Not assigned';
   $('summaryPeople').textContent=status.waiting_count;
   $('summaryWait').textContent=`~${status.next_estimated_wait} minutes`;
   $('summaryEmpty').classList.add('hidden');$('summaryDetails').classList.remove('hidden');
 }
 async function load(){
   const services=await api('/services');$('serviceList').replaceChildren();
   for(const service of services.filter(s=>s.isOpen)){
     const status = await api('/wait-times/' + encodeURIComponent(service.id));
     const btn=document.createElement('button');btn.type='button';btn.className='select-service';
     const copy=document.createElement('div');copy.className='service-copy';
     const title=document.createElement('strong');title.textContent=service.name;
     const desc=document.createElement('span');desc.textContent=service.description;copy.append(title,desc);
     const info=document.createElement('div');info.className='service-wait';
     const wait=document.createElement('strong');wait.textContent=`~${status.next_estimated_wait} min`;
     const people=document.createElement('span');people.textContent=`${status.waiting_count} waiting`;info.append(wait,people);
     btn.append(copy,info);btn.addEventListener('click',()=>{
       document.querySelectorAll('.select-service').forEach(el=>el.classList.remove('selected'));
       btn.classList.add('selected');select(service).catch(e=>error(e.message));
     });$('serviceList').append(btn);
   }
   const query=new URLSearchParams(location.search).get('service');
   const target=services.find(s=>s.isOpen&&(s.id===query||s.name===query));
   if(target){const idx=services.filter(s=>s.isOpen).findIndex(s=>s.id===target.id);$('serviceList').children[idx]?.click();}
 }
 $('joinQueueBtn').addEventListener('click',async()=>{
   const username=localStorage.getItem('currentUser');
   if(!username)return error('Please log in first.');
   if(!chosen)return error('Choose a service.');
   try{
     const q=await api('/queues/join',{method:'POST',body:JSON.stringify({service_id:chosen.id,username})});
     $('confirmationService').textContent=chosen.name;
     $('confirmationTicket').textContent=q.ticket;
     $('confirmationPosition').textContent='#'+q.position;
     $('confirmationWait').textContent='~'+q.estimated_wait+' min';
     $('successModal').classList.remove('hidden');document.body.classList.add('modal-open');
   }catch(e){error(e.message);}
 });
 $('cancelSelectionBtn').addEventListener('click',()=>{chosen=null;$('summaryDetails').classList.add('hidden');$('summaryEmpty').classList.remove('hidden');document.querySelectorAll('.select-service').forEach(x=>x.classList.remove('selected'));});
 $('closeModalBtn').addEventListener('click',()=>{$('successModal').classList.add('hidden');document.body.classList.remove('modal-open');load().catch(e=>error(e.message));});
 load().catch(e=>error('Backend unavailable: '+e.message));
})();
