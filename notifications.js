(() => {
  const API='http://127.0.0.1:8000', POLL_MS=10000;
  const $=id=>document.getElementById(id);
  const list=$('notificationList')||$('notifList');
  if(!list)return;
  const username=localStorage.getItem('currentUser')||(typeof getCurrentUsername==='function'?getCurrentUsername():null);
  if(!username)return;
  const base='/notifications/user/'+encodeURIComponent(username);
  let lastUnread=null, toastTimer;

  async function api(path,options={}){
    const r=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const data=await r.json();
    if(!r.ok)throw new Error(typeof data?.detail==='string'?data.detail:'Request failed');
    return data;
  }
  function timeText(raw){
    const date=new Date(raw);if(Number.isNaN(date.getTime()))return '';
    const sameDay=date.toDateString()===new Date().toDateString();
    return sameDay?date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):date.toLocaleDateString();
  }
  function card(title,message,time,unread){
    const box=document.createElement('div');box.className='notification'+(unread?' unread':'');
    const dot=document.createElement('div');dot.className='notif-dot';
    const copy=document.createElement('div');
    for(const [tag,value] of [['strong',title],['p',message],['span',time]]){const el=document.createElement(tag);el.textContent=value;copy.append(el);}
    box.append(dot,copy);return box;
  }
  function render(items){
    list.replaceChildren();
    if(!items.length){list.append(card('No notifications yet','Updates about your queue will show up here.','',false));return;}
    for(const n of items)list.append(card(n.title,n.message,timeText(n.created_at),!n.read));
  }
  function toast(n){
    if(!$('toast'))return;
    $('toastTitle').textContent=n.title;$('toastText').textContent=n.message;$('toast').classList.remove('hidden');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4000);
  }
  async function load(){
    try{
      const items=await api(base);
      render(items);
      const unread=items.filter(n=>!n.read).length;
      if(lastUnread!==null && unread>lastUnread && !items[0].read)toast(items[0]);
      lastUnread=unread;
    }catch(error){
      if(lastUnread===null){list.replaceChildren(card('Notifications unavailable',error.message,'',false));}
    }
  }
  $('markReadBtn')?.addEventListener('click',async()=>{
    try{await api(base+'/read-all',{method:'PATCH'});lastUnread=0;await load();}
    catch(error){console.error('Unable to mark notifications as read:',error);}
  });
  load();setInterval(load,POLL_MS);window.addEventListener('focus',load);
})();
