import * as T from '../../vendor/three.module.js';
import {AVATAR_OPTIONS,DEFAULT_AVATAR,normalizeAvatar,inviteCode,safePose,offerURL} from './social-model.js';
import {createSocialService} from './social-service.js';
import {createAvatar,createAvatarLayer} from './social-avatar.js';

export async function mountSocial({getScene,getPose,getCatalogue,wake}) {
  const dialog=document.querySelector('#social-space');
  dialog.innerHTML=`<div class="social-heading"><div><span class="eyebrow">UNCONVENTIONART · SOCIAL BETA</span><h2>Il tuo posto in galleria.</h2></div><button type="button" class="social-close" aria-label="Chiudi incontri">×</button></div>
    <nav class="social-tabs" aria-label="Il tuo spazio"><button data-social-tab="avatar" aria-pressed="true">Il mio avatar</button><button data-social-tab="visits" aria-pressed="false">Incontri <span id="social-count"></span></button><button data-social-tab="editions" aria-pressed="false">Edizioni e NFT</button></nav>
    <p id="social-notice" role="status" aria-live="polite"></p>
    <section data-social-panel="avatar" class="social-avatar-layout"><div class="social-preview-area"><div id="social-preview" aria-label="Anteprima tridimensionale del tuo avatar"></div><p>Trascina per ruotare il personaggio.</p><p id="social-model-status" role="status"></p><div class="social-actions"><button type="button" id="social-avatar-detail" aria-pressed="false">Mostra viso</button><button type="button" id="social-avatar-idle" aria-pressed="true">In posa</button><button type="button" id="social-avatar-walk" aria-pressed="false">Cammina</button></div></div><div>
      <form id="social-profile"><label>Nome nella galleria<input id="social-name" required minlength="2" maxlength="32" autocomplete="nickname" placeholder="Come vuoi essere chiamato?"></label><div id="social-wardrobe"></div><button type="submit" class="social-primary">Salva avatar</button></form>
      <div id="social-identity" hidden><p id="social-identity-name"></p><button id="social-logout" type="button">Esci dall’account</button></div>
      <form id="social-login"><h3>Porta il tuo avatar negli incontri</h3><p>Accedi con il tuo account. La visita individuale resta libera.</p><label>Email<input id="social-email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input id="social-password" type="password" autocomplete="current-password" required></label><div class="social-actions"><button type="submit" class="social-primary">Accedi</button><button type="submit" name="signup" value="signup" disabled>Crea account</button></div><p id="social-signup-note">Per creare un account usa almeno 12 caratteri e conferma l’email ricevuta.</p></form>
    </div></section>
    <section data-social-panel="visits" hidden><div id="social-room-start"><h3>Visita la mostra insieme.</h3><p>Crea un incontro e condividi l’invito. Fino a 16 persone, avatar visibili e chat di gruppo. Gli inviti scadono dopo 24 ore.</p><div class="social-room-forms"><form id="social-create"><label>Nome dell’incontro<input id="social-room-name" required minlength="2" maxlength="60" placeholder="Una sera in galleria"></label><button class="social-primary">Crea incontro</button></form><form id="social-join"><label>Invito ricevuto<input id="social-invite" required placeholder="Incolla il link o il codice" autocomplete="off" maxlength="500"></label><button>Partecipa</button></form></div></div>
      <div id="social-room-active" hidden><div class="social-room-title"><div><span class="eyebrow">INCONTRO PRIVATO</span><h3 id="social-room-title"></h3><p id="social-connection" role="status"></p></div><button id="social-copy">Copia invito</button></div><input id="social-share-link" readonly aria-label="Link di invito" hidden><div class="social-room-layout"><div><h4>Presenti</h4><ul id="social-people"></ul></div><div><div id="social-messages" role="log" aria-label="Messaggi dell’incontro" aria-live="polite"></div><form id="social-chat"><label class="sr-only" for="social-message">Messaggio</label><input id="social-message" placeholder="Scrivi al gruppo…" maxlength="500" required autocomplete="off"><button>Invia</button></form></div></div><p class="social-caption">I messaggi sono visibili ai partecipanti. Nessun microfono viene attivato.</p><div class="social-actions"><button id="social-return" class="social-primary">Torna nella galleria</button><button id="social-leave">Lascia incontro</button><button id="social-end" hidden>Termina per tutti</button></div></div>
      <details id="social-blocked"><summary>Persone bloccate</summary><ul id="social-blocks"></ul></details>
      <form id="social-report" hidden><h4>Segnala un comportamento</h4><label>Descrivi cosa è successo<textarea id="social-report-reason" required minlength="3" maxlength="500"></textarea></label><div class="social-actions"><button>Invia segnalazione</button><button type="button" id="social-report-cancel">Annulla</button></div></form>
    </section>
    <section data-social-panel="editions" hidden><h3>Opere da collezionare.</h3><p>Stampe, edizioni digitali e NFT. Ogni offerta riporta prezzo e diritti inclusi; il pagamento si completa sulla pagina del venditore.</p><button id="social-store-refresh">Aggiorna disponibilità</button><div id="social-editions"></div><p class="social-caption">Il possesso di un NFT non attribuisce automaticamente i diritti d’autore. Consulta i termini della singola opera.</p></section>`;
  const $=s=>dialog.querySelector(s),note=(text,error=false)=>{$('#social-notice').textContent=text;$('#social-notice').dataset.error=String(error);};
  const element=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  let avatar={...DEFAULT_AVATAR},profile=null,room=null,service,layer=null,timer,version=0,failures=0,reportTarget=null,rosterKey='',messagesKey='',previewRenderer,previewScene,previewCamera,previewMesh,previewWalking=false,previewFrame=0,previewTime=0;
  try{avatar=normalizeAvatar(JSON.parse(localStorage.getItem('ua-avatar-draft')||'null'));}catch{}
  let serviceError;
  try{service=await createSocialService();}catch(error){serviceError=error.message;note(error.message,true);}
  function refreshIdentity(){const user=service?.user;$('#social-login').hidden=!!user;$('#social-identity').hidden=!user;$('#social-identity-name').textContent=user?'Account collegato'+(profile?` · ${profile.name}`:''):'';}
  async function run(button,work){if(button)button.disabled=true;try{await work();}catch(error){note(error.message,true);refreshIdentity();if(!service?.user)resetRoom();}finally{if(button)button.disabled=false;}}
  const requireAccount=()=>{if(!service)throw Error(serviceError||'Connessione non disponibile.');if(!service.user)throw Error('Accedi dalla scheda Il mio avatar.');if(!profile)throw Error('Salva il tuo avatar prima di creare o raggiungere un incontro.');};
  function renderPreview(){
    if(!previewRenderer)return;
    if(previewMesh){previewScene.remove(previewMesh);previewMesh.userData.dispose();}
    previewMesh=createAvatar(avatar,'',mesh=>{if(mesh!==previewMesh)return;$('#social-model-status').textContent=mesh.userData.status==='ready'?'Modello Atelier pronto.':'Modello Atelier non disponibile: anteprima essenziale attiva.';drawPreview();animatePreview();});$('#social-model-status').textContent=avatar.model==='atelier'?'Caricamento del modello Atelier…':'';previewMesh.rotation.y=-.32;previewMesh.userData.animate(.1,0);previewScene.add(previewMesh);drawPreview();animatePreview();
  }
  function drawPreview(){if(!previewRenderer)return;const width=Math.max(160,$('#social-preview').clientWidth),height=330;previewRenderer.setSize(width,height,false);previewCamera.aspect=width/height;previewCamera.updateProjectionMatrix();previewRenderer.render(previewScene,previewCamera);}
  function animatePreview(){
    if(previewFrame||!previewMesh)return;
    const frame=time=>{
      previewFrame=0;
      if(!dialog.open||document.hidden||$('[data-social-panel=avatar]').hidden)return;
      if(time-previewTime>=33){previewMesh.userData.animate(Math.min(.1,(time-previewTime)/1000),time,previewWalking?1:0);previewTime=time;previewRenderer.render(previewScene,previewCamera);}
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)previewFrame=requestAnimationFrame(frame);
    };
    previewFrame=requestAnimationFrame(frame);
  }
  dialog.addEventListener('close',()=>{cancelAnimationFrame(previewFrame);previewFrame=0;});
  function startPreview(){
    if(previewRenderer){drawPreview();animatePreview();return;}
    try{previewRenderer=new T.WebGLRenderer({antialias:true,alpha:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewScene=new T.Scene();previewScene.add(new T.HemisphereLight(0xffffff,0x777080,2.5));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-2,3,-4);previewScene.add(light);previewCamera=new T.PerspectiveCamera(34,1,.1,20);previewCamera.position.set(0,1.05,-3.7);previewCamera.lookAt(0,.95,0);const canvas=previewRenderer.domElement;canvas.setAttribute('aria-label','Avatar personalizzabile');$('#social-preview').append(canvas);let last=null;canvas.addEventListener('pointerdown',e=>{last=e.clientX;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(last===null)return;previewMesh.rotation.y+=(e.clientX-last)*.015;last=e.clientX;drawPreview();});for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{last=null;});renderPreview();}catch{$('#social-preview').textContent='Anteprima 3D non disponibile su questo dispositivo. Puoi comunque personalizzare e salvare l’avatar.';}
  }
  for(const [id,walking] of [['social-avatar-idle',false],['social-avatar-walk',true]])$('#'+id).onclick=()=>{previewWalking=walking;$('#social-avatar-idle').setAttribute('aria-pressed',String(!walking));$('#social-avatar-walk').setAttribute('aria-pressed',String(walking));animatePreview();};
  $('#social-avatar-detail').onclick=()=>{if(!previewCamera)return;const button=$('#social-avatar-detail'),detail=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(detail));button.textContent=detail?'Mostra corpo':'Mostra viso';previewCamera.position.set(0,detail?1.52:1.05,detail?-1.15:-3.7);previewCamera.lookAt(0,detail?1.52:.95,0);drawPreview();};
  const labels={model:'Modello',skin:'Carnagione',hair:'Colore dei capelli',outfit:'Abbigliamento',style:'Taglio',build:'Corporatura'};
  const optionLabels={classic:'Essenziale',atelier:'Atelier · figura femminile',short:'Corti',bob:'Caschetto',long:'Lunghi',shaved:'Rasati',slim:'Snella',regular:'Regolare',broad:'Robusta'};
  for(const [key,options] of Object.entries(AVATAR_OPTIONS)){
    const field=element('fieldset'),legend=element('legend',labels[key]);field.append(legend);
    for(const [i,value] of options.entries()){const label=element('label'),input=element('input');input.type='radio';input.name=key;input.value=value;input.checked=avatar[key]===value;input.setAttribute('aria-label',optionLabels[value]||`${labels[key]} ${i+1}`);label.append(input);if(value.startsWith('#')){label.className='social-swatch';label.style.setProperty('--swatch',value);}else label.append(element('span',optionLabels[value]));input.addEventListener('change',()=>{avatar[key]=value;renderPreview();try{localStorage.setItem('ua-avatar-draft',JSON.stringify(avatar));}catch{}});field.append(label);}$('#social-wardrobe').append(field);
  }
  function applyAvatar(value){avatar=normalizeAvatar(value);for(const input of $('#social-wardrobe').querySelectorAll('input'))input.checked=avatar[input.name]===input.value;renderPreview();}
  async function loadProfile(){if(!service?.user){refreshIdentity();return;}const data=await service.rpc('profile');profile=data.profile;if(profile){$('#social-name').value=profile.name;applyAvatar(profile.avatar);}$('#social-blocks').replaceChildren();for(const blocked of data.blocks){const li=element('li',blocked.name+' '),button=element('button','Sblocca');button.onclick=()=>run(button,async()=>{await service.rpc('unblock',{target:blocked.id});li.remove();note('Blocco rimosso.');});li.append(button);$('#social-blocks').append(li);}refreshIdentity();}
  $('#social-profile').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{if(!service?.user)throw Error('Accedi per salvare l’avatar nel tuo account. Le scelte restano su questo dispositivo.');profile=await service.rpc('save_profile',{name:$('#social-name').value.trim(),avatar});refreshIdentity();note('Avatar salvato. Ora puoi partecipare agli incontri.');});});
  $('#social-login').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{if(!service)throw Error(serviceError);const email=$('#social-email').value.trim(),password=$('#social-password').value;if(e.submitter?.value==='signup'){if(password.length<12)throw Error('Usa una password di almeno 12 caratteri.');const logged=await service.signup(email,password);$('#social-password').value='';if(!logged){note('Controlla la tua email per confermare l’account, poi torna qui e accedi.');return;}}else{await service.login(email,password);$('#social-password').value='';}await loadProfile();note(profile?'Bentornato. Il tuo avatar è pronto.':'Accesso effettuato. Scegli il nome e salva il tuo avatar.');});});
  function resetRoom(){version++;clearTimeout(timer);room=null;layer?.clear();$('#social-room-start').hidden=false;$('#social-room-active').hidden=true;$('#social-count').textContent='';document.querySelector('#social-open').textContent='Incontri';rosterKey=messagesKey='';$('#social-people').replaceChildren();$('#social-messages').replaceChildren();$('#social-report').hidden=true;}
  $('#social-logout').onclick=()=>run($('#social-logout'),async()=>{if(room)try{await service.rpc('leave',{room:room.id});}catch{}resetRoom();try{await service.logout();}finally{profile=null;refreshIdentity();}note('Hai lasciato l’account.');});
  function renderState(data){
    const participants=data.participants.filter(p=>safePose(p));
    if(!layer&&getScene())layer=createAvatarLayer(getScene(),wake);
    layer?.sync(participants,service.user?.id);
    $('#social-count').textContent=String(participants.length);document.querySelector('#social-open').textContent=`Incontri · ${participants.length}`;
    const nextRoster=JSON.stringify(participants.map(p=>[p.id,p.name]));
    if(nextRoster!==rosterKey){rosterKey=nextRoster;$('#social-people').replaceChildren();for(const p of participants){const li=element('li'),name=element('strong',p.name+(p.id===service.user.id?' · tu':''));li.append(name);if(p.id!==service.user.id){const block=element('button','Blocca'),report=element('button','Segnala');block.onclick=()=>run(block,async()=>{await service.rpc('block',{room:room.id,target:p.id});await loadProfile();note('Persona bloccata: avatar e messaggi sono nascosti a entrambi.');});report.onclick=()=>{reportTarget=p.id;$('#social-report').hidden=false;$('#social-report-reason').focus();};li.append(block,report);}$('#social-people').append(li);}}
    const nextMessages=JSON.stringify(data.messages.map(m=>m.id));if(nextMessages!==messagesKey){messagesKey=nextMessages;const log=$('#social-messages'),nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80;log.replaceChildren();for(const m of data.messages){const p=element('p'),strong=element('strong',m.name+' '),span=element('span',m.body);p.append(strong,span);log.append(p);}if(nearBottom)log.scrollTop=log.scrollHeight;}
  }
  async function poll(token){
    if(token!==version||!room)return;
    if(document.hidden){timer=setTimeout(()=>poll(token),1500);return;}
    try{const pose=safePose(getPose());if(!pose)throw Error('La galleria sta ancora caricando.');const data=await service.rpc('tick',{room:room.id,position:pose});if(token!==version)return;failures=0;renderState(data);$('#social-connection').textContent=`Collegato · ${data.participants.length} presenti`;}
    catch(error){if(token!==version)return;failures++;layer?.clear();$('#social-connection').textContent='Connessione interrotta · nuovo tentativo…';if(['ua_room_denied','ua_suspended','ua_room_full'].includes(error.code)||!service?.user){resetRoom();note(error.message,true);refreshIdentity();return;}}
    if(token===version)timer=setTimeout(()=>poll(token),Math.min(10000,1000*Math.max(1,failures)));
  }
  async function activate(next){if(room&&room.id!==next.id)try{await service.rpc('leave',{room:room.id});}catch{}resetRoom();room=next;$('#social-room-start').hidden=true;$('#social-room-active').hidden=false;$('#social-room-title').textContent=room.name;$('#social-end').hidden=!room.owner;$('#social-share-link').hidden=true;note('Incontro aperto. Torna nella galleria per muoverti insieme agli altri.');poll(version);}
  $('#social-create').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{requireAccount();await activate(await service.rpc('create',{name:$('#social-room-name').value.trim()}));});});
  $('#social-join').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{requireAccount();const invite=inviteCode($('#social-invite').value);if(!invite)throw Error('Inserisci un invito valido.');await activate(await service.rpc('join',{invite}));});});
  $('#social-copy').onclick=()=>run($('#social-copy'),async()=>{const url=new URL(location.href);url.search='';url.hash='visit='+room.invite;$('#social-share-link').value=url.href;try{await navigator.clipboard.writeText(url.href);note('Invito copiato. Condividilo con chi vuoi incontrare.');}catch{$('#social-share-link').hidden=false;$('#social-share-link').select();note('Copia il link mostrato.');}});
  $('#social-chat').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{if(!room)throw Error('Partecipa prima a un incontro.');await service.rpc('chat',{room:room.id,body:$('#social-message').value.trim()});$('#social-message').value='';});});
  $('#social-leave').onclick=()=>run($('#social-leave'),async()=>{await service.rpc('leave',{room:room.id});resetRoom();note('Hai lasciato l’incontro.');});
  $('#social-end').onclick=()=>run($('#social-end'),async()=>{await service.rpc('close',{room:room.id});resetRoom();note('Incontro terminato per tutti.');});
  $('#social-report').addEventListener('submit',e=>{e.preventDefault();run(e.submitter,async()=>{await service.rpc('report',{room:room.id,target:reportTarget,reason:$('#social-report-reason').value.trim()});$('#social-report').hidden=true;$('#social-report-reason').value='';note('Segnalazione registrata per la revisione.');});});
  $('#social-report-cancel').onclick=()=>{$('#social-report').hidden=true;};
  async function loadOffers(){
    const area=$('#social-editions');area.replaceChildren(element('p','Caricamento delle edizioni…'));
    try{if(!service)throw Error(serviceError);const offers=await service.offers(),works=getCatalogue()?.works||[];area.replaceChildren();let count=0;
      for(const offer of offers){const url=offerURL(offer),work=works.find(w=>w.id===offer.work_id);if(!url||!work)continue;count++;const card=element('article'),image=element('img');image.src=work.preview||work.image;image.alt=work.title;image.loading='lazy';const type={print:'Stampa',digital:'Edizione digitale',nft:'NFT'}[offer.kind];card.append(image,element('span',type),element('h4',work.title),element('p',new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(offer.amount_minor/100)),element('p',offer.rights));if(offer.kind==='nft')card.append(element('p',`${offer.chain} · Token ${offer.token_id}`),element('small',`Contratto: ${offer.contract}`));const link=element('a',offer.kind==='nft'?'Vedi su OpenSea ↗':'Vai al pagamento ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);area.append(card);}
      if(!count)area.append(element('p','Le opere sono visitabili. Non ci sono ancora edizioni o NFT messi in vendita.'));
    }catch(error){area.replaceChildren(element('p','Disponibilità non verificabile in questo momento. Riprova.'));}
  }
  $('#social-store-refresh').onclick=()=>run($('#social-store-refresh'),loadOffers);
  function tab(name){for(const panel of dialog.querySelectorAll('[data-social-panel]'))panel.hidden=panel.dataset.socialPanel!==name;for(const button of dialog.querySelectorAll('[data-social-tab]'))button.setAttribute('aria-pressed',String(button.dataset.socialTab===name));if(name==='avatar')startPreview();if(name==='editions')loadOffers();}
  for(const button of dialog.querySelectorAll('[data-social-tab]'))button.onclick=()=>tab(button.dataset.socialTab);
  $('.social-close').onclick=$('#social-return').onclick=()=>dialog.close();
  window.addEventListener('resize',()=>{if(dialog.open)drawPreview();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){layer?.clear();return;}animatePreview();if(room){clearTimeout(timer);version++;poll(version);}});
  window.addEventListener('pagehide',()=>{version++;clearTimeout(timer);layer?.clear();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&room){clearTimeout(timer);version++;poll(version);}});
  const incoming=inviteCode(location.hash.startsWith('#visit=')?location.hash.slice(7):'');if(incoming)$('#social-invite').value=incoming;
  refreshIdentity();
  if(service) {
    service.settings().then(settings=>{
      const signup=$('button[name="signup"]');
      signup.disabled=settings.disable_signup===true||settings.external?.email===false;
      $('#social-signup-note').textContent=signup.disabled?'Registrazioni su invito: usa un account già abilitato.':'Per creare un account usa almeno 12 caratteri e conferma l’email ricevuta.';
    }).catch(()=>{$('#social-signup-note').textContent='Registrazioni temporaneamente non verificabili. Riprova più tardi.';});
  }
  if(service?.user)await run(null,loadProfile);
  return {open(){tab(incoming&&!room?'visits':'avatar');if(incoming&&!room)note('Hai un invito. Accedi, salva il tuo avatar e premi Partecipa.');},update(dt,time){return layer?.update(dt,time)||false;}};
}
