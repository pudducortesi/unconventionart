import {mediaInfo, prepareMedia, uploadWithProgress} from './media-upload.js';
import { publishingConfig, publicationPatch } from './publishing.js';
import { ROOM_PROFILES } from './museum/room-profiles.js';
const $ = s => document.querySelector(s);
let config, session = null, works = [], filter = 'all', refreshTimer, busy = false, renderVersion = 0;
const thumbnails = new Set();
const notice = (text, error = false) => { $('#notice').textContent = text; $('#notice').dataset.error = String(error); };
async function request(path, { method = 'GET', body, raw = false } = {}) {
  const response = await fetch(config.supabaseUrl + path, {
    signal: AbortSignal.timeout(45000),
    method, headers: { apikey: config.publishableKey, ...(session ? {Authorization: `Bearer ${session.access_token}`} : {}),
      ...(body ? {'Content-Type': raw ? body.type : 'application/json'} : {}), Prefer: 'return=representation' },
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
  });
  if (!response.ok) {
    if (response.status === 401) { endSession(); throw Error('Sessione scaduta. Accedi di nuovo.'); }
    let error; try { error = await response.json(); } catch {}
    if (error?.message?.includes('gallery_capacity')) throw Error('Sala completa: scegli un’altra sala oppure ritira un’opera.');
    throw Error(response.status === 403 ? 'Account non autorizzato.' : 'Operazione non riuscita. Controlla i dati e riprova.');
  }
  return response;
}
function endSession() {
  renderVersion++;
  session = null; clearTimeout(refreshTimer); works = [];
  for (const url of thumbnails) URL.revokeObjectURL(url); thumbnails.clear();
  $('#works').replaceChildren(); $('#workspace').hidden = true; $('#set-password').hidden = true; $('#login').hidden = !config?.enabled;
}
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      session = await (await request('/auth/v1/token?grant_type=refresh_token', {method:'POST', body:{refresh_token:session.refresh_token}})).json();
      scheduleRefresh();
    } catch { endSession(); notice('Sessione scaduta. Accedi di nuovo.', true); }
  }, Math.max(1000, (session.expires_in - 90) * 1000));
}
$('#login').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    session = await (await request('/auth/v1/token?grant_type=password', {method:'POST',body:{email:$('#email').value.trim(),password:$('#password').value}})).json();
    $('#password').value = '';
    const admins = await (await request('/rest/v1/gallery_admins?select=user_id')).json();
    if (!admins.some(a => a.user_id === session.user.id)) throw Error('Questo account non è abilitato all’atelier.');
    scheduleRefresh(); $('#login').hidden = true; $('#workspace').hidden = false;
    await loadWorks(); notice(config.liveCatalogue === false ? 'Archivio collegato. Puoi preparare le bozze; il passaggio della galleria al nuovo catalogo è ancora da completare.' : 'Accesso effettuato. Le nuove fotografie resteranno in bozza fino alla pubblicazione.');
  } catch (error) { endSession(); notice(error.message, true); }
  finally { button.disabled = false; }
});
$('#logout').addEventListener('click', async () => {
  try { await request('/auth/v1/logout', {method:'POST'}); } catch {}
  endSession(); notice('Hai lasciato l’atelier.');
});
$('#set-password').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const password = $('#new-password').value;
    if (password.length < 12 || password !== $('#repeat-password').value) throw Error('Le password devono coincidere e contenere almeno 12 caratteri.');
    await request('/auth/v1/user', {method:'PUT',body:{password}});
    $('#new-password').value = $('#repeat-password').value = '';
    try { await request('/auth/v1/logout',{method:'POST'}); } catch {}
    endSession(); notice('Password salvata. Accedi con la tua email e la nuova password.');
  } catch (error) { notice(error.message,true); }
  finally { button.disabled = false; }
});
function element(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
function field(form, text, input) { const label = element('label', text); label.append(input); form.append(label); return input; }
async function loadWorks() {
  const [photos,videos] = await Promise.all(['/rest/v1/gallery_artworks?select=*&order=created_at.desc','/rest/v1/gallery_videos?select=*&order=created_at.desc'].map(async path=>(await request(path)).json()));
  works = [...photos,...videos.map(w=>({...w,isVideo:true}))];
  await render();
}
async function render() {
  const version = ++renderVersion;
  for (const url of thumbnails) URL.revokeObjectURL(url); thumbnails.clear();
  $('#works').replaceChildren();
  $('#summary').textContent = `${works.length} opere · ${works.filter(w => w.published).length} pubblicate`;
  const visible = works.filter(w => filter === 'all' || w.published === (filter === 'published'));
  $('#empty').hidden = !!visible.length;
  // Load thumbnails sequentially to keep memory and mobile network use bounded.
  for (const work of visible) {
    if (!session || version !== renderVersion) break;
    const card = element('article', '', 'work'), photo = element('div', '', 'photo'), img = element('img');
    img.alt = work.title; img.draggable = false; img.loading = 'lazy';
    photo.append(img, element('span', (work.isVideo ? 'VIDEO · ' : '') + (work.published ? 'IN GALLERIA' : 'BOZZA'))); card.append(photo);
    const form = element('form');
    const title = field(form, 'Titolo', element('input')); title.value = work.title; title.required = true; title.maxLength = 160;
    const description = field(form, 'Descrizione', element('textarea')); description.value = work.description; description.maxLength = 3000;
    const hall = field(form, 'Sala', element('select')); if (!work.isVideo) hall.append(new Option('Assegna automaticamente', ''));
    ROOM_PROFILES.forEach((room, i) => {if(!work.isVideo || [3,5].includes(i)) hall.append(new Option(`${String(i + 1).padStart(2,'0')} · ${room.name}`, String(i)));});
    hall.value = work.hall_index === null ? '' : String(work.hall_index);
    const actions = element('div', '', 'actions'), save = element('button', 'Salva', 'secondary'), publish = element('button', work.published ? 'Ritira dalla galleria' : 'Pubblica →');
    save.type = 'submit'; publish.type = 'button'; publish.disabled = config.liveCatalogue === false;
    if (publish.disabled) publish.title = 'Pubblicazione disponibile dopo il passaggio al nuovo catalogo.';
    actions.append(save, publish); form.append(actions); card.append(form); $('#works').append(card);
    async function update(published) {
      if (busy) return;
      busy = true; save.disabled = publish.disabled = true;
      try {
        const patch = publicationPatch(title.value, description.value, hall.value, published);
        await request(`/rest/v1/${work.isVideo ? 'gallery_videos' : 'gallery_artworks'}?id=eq.${work.id}`, {method:'PATCH',body:patch});
        await loadWorks(); notice(published ? 'Opera pubblicata. La galleria si aggiorna automaticamente entro un minuto.' : 'Bozza salvata. L’opera non è esposta in galleria.');
      } catch (error) { notice(error.message, true); }
      finally { busy = false; save.disabled = false; publish.disabled = config.liveCatalogue === false; }
    }
    form.addEventListener('submit', event => { event.preventDefault(); update(work.published); });
    publish.addEventListener('click', () => update(!work.published));
    try {
      const response = await request(`/storage/v1/object/authenticated/gallery-previews/${work.preview_path}`);
      if (!img.isConnected || !session || version !== renderVersion) continue;
      const url = URL.createObjectURL(await response.blob()); thumbnails.add(url); img.src = url;
    } catch { img.alt = 'Anteprima temporaneamente non disponibile'; }
  }
}
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', async () => {
  if (busy) return;
  filter = button.dataset.filter;
  for (const item of document.querySelectorAll('[data-filter]')) item.setAttribute('aria-pressed', String(item === button));
  await render();
});
let pendingFiles = [];
const uploadIds = new WeakMap();
async function uploadBatch(files) {
  if (busy || !session || !files.length) return;
  busy = true; $('#files').disabled = true; $('#retry-files').hidden = true; $('#upload-results').replaceChildren();
  let uploaded = 0; const failed = [];
  const rows = files.map(file=>{const row=element('li',file.name+' · In attesa');$('#upload-results').append(row);return row;});
  try {
    for (const [index,file] of files.entries()) {
      if(!session) { failed.push(...files.slice(index)); break; }
      const row=rows[index],retry=uploadIds.has(file),id=uploadIds.get(file)||crypto.randomUUID(),created=[];
      uploadIds.set(file,id);
      const status=text=>{row.textContent=file.name+' · '+text;$('#upload-progress').textContent=`${index+1} / ${files.length} · ${text}`;};
      try {
        const info=mediaInfo(file);status('Preparazione anteprima…');
        const {blob,width,height,duration}=await prepareMedia(file,info);
        const bucket=info.video?'gallery-videos':'gallery-originals',master=`${id}/${info.video?'clip':'original'}.${info.ext}`,derivative=`${id}/${info.video?'poster':'preview'}.jpg`;
        if(retry){
          const saved=await (await request(`/rest/v1/${info.video?'gallery_videos':'gallery_artworks'}?id=eq.${id}&select=id`)).json();
          if(saved.length){uploaded++;status('Già caricato ✓');continue;}
          for(const [b,p] of [[bucket,master],['gallery-previews',derivative]])await request(`/storage/v1/object/${b}`,{method:'DELETE',body:{prefixes:[p]}});
        }
        const upload=async(bucket,path,body,type,label)=>{
          if(!session)throw Error('Sessione scaduta. Accedi di nuovo.');
          await uploadWithProgress({url:config.supabaseUrl+`/storage/v1/object/${bucket}/${path}`,headers:{apikey:config.publishableKey,Authorization:`Bearer ${session.access_token}`,'Content-Type':type},body,onProgress:value=>status(label+(value===null?'…':` ${Math.round(value*100)}%`))});
          created.push([bucket,path]);
        };
        await upload(bucket,master,file,info.type,'Invio file');
        await upload('gallery-previews',derivative,blob,'image/jpeg','Invio anteprima');
        status('Salvataggio bozza…');
        await request('/rest/v1/'+(info.video?'gallery_videos':'gallery_artworks'),{method:'POST',body:{id,title:file.name.replace(/\.[^.]+$/,'').slice(0,160)||'Senza titolo',preview_path:derivative,width,height,...(info.video?{video_path:master,duration,hall_index:Number($('#video-hall').value)}:{original_path:master})}});
        uploaded++;status('Caricato in bozza ✓');
      } catch(error) {
        failed.push(file);row.textContent=file.name+' · '+error.message;row.dataset.error='true';
        for(const [bucket,path] of created)try{await request(`/storage/v1/object/${bucket}`,{method:'DELETE',body:{prefixes:[path]}});}catch{}
      }
    }
  } finally {
    pendingFiles=failed;busy=false;$('#files').disabled=false;$('#files').value='';$('#retry-files').hidden=!failed.length;
    $('#upload-progress').textContent=`${uploaded} caricati · ${failed.length} da riprovare`;
    notice(failed.length ? 'Alcuni file non sono stati caricati. Leggi il motivo nella lista e premi Riprova.' : 'Caricamento completato: tutti i file sono in bozza.',!!failed.length);
    try{if(session)await loadWorks();}catch(error){notice(error.message,true);}
  }
}
$('#files').addEventListener('change',event=>uploadBatch(Array.from(event.target.files)));
$('#files').addEventListener('click',()=>{if(!busy)notice('Conferma la selezione con la spunta del dispositivo. Se le foto sono su iCloud, attendi che siano scaricate prima dell’invio.');});
$('#retry-files').addEventListener('click',()=>uploadBatch(pendingFiles));
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});

try {
  config = await publishingConfig();
  $('#setup').hidden = config.enabled; $('#login').hidden = !config.enabled;
  notice(config.enabled ? 'Accedi per gestire la tua collezione.' : 'Pannello creato · archivio privato da attivare');
  const callback = new URLSearchParams(location.hash.slice(1));
  if (callback.has('access_token') || callback.has('error')) {
    history.replaceState(null,'',location.pathname);
    if (!config.enabled || callback.has('error') || !['invite','recovery'].includes(callback.get('type')) || !callback.get('refresh_token')) throw Error('Link non valido o scaduto. Richiedi un nuovo invito.');
    session = {access_token:callback.get('access_token'),refresh_token:callback.get('refresh_token'),expires_in:Number(callback.get('expires_in')) || 3600};
    try {
      const user = await (await request('/auth/v1/user')).json();
      const admins = await (await request('/rest/v1/gallery_admins?select=user_id')).json();
      if (!admins.some(a=>a.user_id === user.id)) throw Error('Questo account non è abilitato all’atelier.');
      session.user = user; scheduleRefresh(); $('#login').hidden = true; $('#set-password').hidden = false;
      notice('Indirizzo verificato. Scegli la password per il tuo atelier.');
    } catch (error) { endSession(); throw error; }
  }
} catch (error) { notice(error.message, true); }
