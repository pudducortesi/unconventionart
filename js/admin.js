import { publishingConfig, publicationPatch, validateUpload } from './publishing.js';
import { ROOM_PROFILES } from './museum/room-profiles.js';
const $ = s => document.querySelector(s);
let config, session = null, works = [], filter = 'all', refreshTimer, busy = false, renderVersion = 0;
const thumbnails = new Set();
const notice = (text, error = false) => { $('#notice').textContent = text; $('#notice').dataset.error = String(error); };
async function request(path, { method = 'GET', body, raw = false } = {}) {
  const response = await fetch(config.supabaseUrl + path, {
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
  $('#works').replaceChildren(); $('#workspace').hidden = true; $('#login').hidden = !config?.enabled;
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
function element(tag, text, className) { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; }
function field(form, text, input) { const label = element('label', text); label.append(input); form.append(label); return input; }
async function loadWorks() {
  works = await (await request('/rest/v1/gallery_artworks?select=*&order=created_at.desc')).json();
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
    photo.append(img, element('span', work.published ? 'IN GALLERIA' : 'BOZZA')); card.append(photo);
    const form = element('form');
    const title = field(form, 'Titolo', element('input')); title.value = work.title; title.required = true; title.maxLength = 160;
    const description = field(form, 'Descrizione', element('textarea')); description.value = work.description; description.maxLength = 3000;
    const hall = field(form, 'Sala', element('select')); hall.append(new Option('Assegna automaticamente', ''));
    ROOM_PROFILES.forEach((room, i) => hall.append(new Option(`${String(i + 1).padStart(2,'0')} · ${room.name}`, String(i))));
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
        await request(`/rest/v1/gallery_artworks?id=eq.${work.id}`, {method:'PATCH',body:patch});
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
async function preview(file) {
  const bitmap = await createImageBitmap(file, {imageOrientation:'from-image'});
  try {
    if (bitmap.width * bitmap.height > 80000000) throw Error('Fotografia troppo grande: esporta una copia sotto gli 80 megapixel.');
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
    if (!blob || blob.size > 4 * 1024 * 1024) throw Error('Impossibile creare l’anteprima.');
    return {blob, width:bitmap.width, height:bitmap.height};
  } finally { bitmap.close(); }
}
$('#files').addEventListener('change', async event => {
  if (busy || !session) return;
  busy = true; const files = Array.from(event.target.files); event.target.disabled = true;
  let uploaded = 0; const failures = [];
  for (const [index, file] of files.entries()) {
    if (!session) { failures.push('Caricamento interrotto: accedi di nuovo.'); break; }
    const id = crypto.randomUUID(), ext = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const master = `${id}/original.${ext}`, derivative = `${id}/preview.jpg`; const created = [];
    $('#upload-progress').textContent = `${index + 1} / ${files.length} · ${file.name}`;
    try {
      validateUpload(file); const {blob, width, height} = await preview(file);
      await request(`/storage/v1/object/gallery-originals/${master}`, {method:'POST',body:file,raw:true}); created.push(['gallery-originals',master]);
      await request(`/storage/v1/object/gallery-previews/${derivative}`, {method:'POST',body:blob,raw:true}); created.push(['gallery-previews',derivative]);
      await request('/rest/v1/gallery_artworks', {method:'POST',body:{id,title:file.name.replace(/\.[^.]+$/,'').slice(0,160),original_path:master,preview_path:derivative,width,height}});
      uploaded++;
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
      // A failed draft must not leave unreferenced private files behind.
      for (const [bucket,path] of created) try { await request(`/storage/v1/object/${bucket}`,{method:'DELETE',body:{prefixes:[path]}}); } catch {}
    }
  }
  event.target.value = ''; event.target.disabled = false; busy = false;
  $('#upload-progress').textContent = `${uploaded} fotografie caricate in bozza.`;
  try { if (session) await loadWorks(); } catch (error) { failures.push(error.message); }
  notice(failures.length ? failures.join(' · ') : 'Caricamento completato. Scegli le sale e pubblica le opere.', !!failures.length);
});
try {
  config = await publishingConfig();
  $('#setup').hidden = config.enabled; $('#login').hidden = !config.enabled;
  notice(config.enabled ? 'Accedi per gestire la tua collezione.' : 'Pannello creato · archivio privato da attivare');
} catch (error) { notice(error.message, true); }
