// A published selection must never restart an active visit or discard a form.
export function watchCatalogue({fetcher=fetch,url,options,revision,onUpdate,isHidden=()=>document.hidden,schedule=setInterval,cancel=clearInterval}) {
  let busy=false,stopped=false;
  const timer=schedule(async()=>{
    if(stopped||busy||isHidden())return;
    busy=true;
    try{
      const response=await fetcher(url,options);
      if(!response.ok)return;
      const next=await response.json();
      if(!stopped&&typeof next.revision==='string'&&next.revision!==revision){
        stopped=true;cancel(timer);onUpdate();
      }
    }catch{/* Keep the current visit when the archive is temporarily unreachable. */}
    finally{busy=false;}
  },60000);
  return ()=>{stopped=true;cancel(timer);};
}
export function announceCatalogueUpdate(){
  if(document.getElementById('catalogue-update'))return;
  const box=document.createElement('aside');box.id='catalogue-update';box.setAttribute('role','status');
  const message=document.createElement('p');message.textContent='Ci sono nuove opere. Aggiorna la galleria quando hai finito la visita.';
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Aggiorna galleria';refresh.onclick=()=>location.reload();
  const later=document.createElement('button');later.type='button';later.textContent='Più tardi';later.onclick=()=>box.remove();
  box.append(message,refresh,later);document.body.append(box);
}
