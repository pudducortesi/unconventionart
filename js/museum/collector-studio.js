import { WALLS, offerFor, editorialAnswer, selectionDocument, secureLink } from './experience-model.js';
let viewerImport;
export function mountStudio({ catalogue, selection, inspect, tour, halls, visit, status }) {
  const $ = s => document.querySelector(s), dialog = $('#collector-studio');
  let active = catalogue.works[0], config = {}, mode = 'discover', narration;
  let userWall = null, renderToken = 0, slideTimer = null, audioContext = null;
  function stopSequence() { clearInterval(slideTimer);slideTimer=null;$('#vision-play').textContent='Avvia sequenza'; }
  function stopAudio() { if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}$('#vision-audio').setAttribute('aria-pressed','false');$('#vision-audio').textContent='Suono ambientale'; }
  function nextWork(direction) { const index=catalogue.works.indexOf(active);showWork(catalogue.works[(index+direction+catalogue.works.length)%catalogue.works.length]); }
  $('#vision-previous').disabled=$('#vision-next').disabled=$('#vision-play').disabled=catalogue.works.length<2;
  $('#vision-previous').addEventListener('click',()=>{stopSequence();nextWork(-1);});
  $('#vision-next').addEventListener('click',()=>{stopSequence();nextWork(1);});
  $('#vision-play').addEventListener('click',()=>{if(slideTimer){stopSequence();return;}slideTimer=setInterval(()=>nextWork(1),12000);$('#vision-play').textContent='Pausa';});
  $('#vision-audio').addEventListener('click',async()=>{
    if(audioContext){stopAudio();return;}
    try {
      const Audio=window.AudioContext || window.webkitAudioContext;if(!Audio)throw Error();
      audioContext=new Audio();await audioContext.resume();
      const volume=audioContext.createGain();volume.gain.setValueAtTime(0,audioContext.currentTime);volume.gain.linearRampToValueAtTime(.018,audioContext.currentTime+2);volume.connect(audioContext.destination);
      for(const frequency of [130.81,196,261.63]){const oscillator=audioContext.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;oscillator.connect(volume);oscillator.start();}
      $('#vision-audio').setAttribute('aria-pressed','true');$('#vision-audio').textContent='Disattiva il suono';
    }catch{stopAudio();$('#studio-note').textContent='Audio non disponibile in questo browser.';}
  });
  const download = (value, name, mime='application/json') => {
    const url = URL.createObjectURL(new Blob([value], {type:mime}));
    const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
  function stopVoice() { if ('speechSynthesis' in window) speechSynthesis.cancel(); narration=null; $('#studio-voice').textContent='Ascolta'; }
  function setMode(next) {
    mode=next; stopVoice();stopSequence();stopAudio();
    for (const p of dialog.querySelectorAll('[data-studio-panel]')) p.hidden=p.dataset.studioPanel!==mode;
    for (const b of dialog.querySelectorAll('[data-studio-tab]')) b.setAttribute('aria-pressed',String(b.dataset.studioTab===mode));
    $('#studio-note').textContent='';
    if (mode!=='wall') { renderToken++; $('#ar-container').replaceChildren(); }
  }
  function showWork(work) {
    if (!work) return; active=work; stopVoice(); renderToken++;
    $('#studio-work').value=work.id;
    for (const image of dialog.querySelectorAll('[data-studio-image]')) { image.src=work.image; image.alt=work.alt || work.title; }
    $('#studio-title').textContent=work.title;
    $('#vision-count').textContent=`${catalogue.works.indexOf(work)+1} / ${catalogue.works.length} · ${work.title}`;
    $('#studio-description').textContent=work.description || work.alt || '';
    $('#studio-series').textContent=catalogue.collections.find(c=>c.id===work.collection)?.title || 'UnconventionArt';
    $('#studio-credit').textContent=work.credit || 'UnconventionArt';
    $('#studio-answer').textContent='Scegli una domanda per approfondire questa fotografia.';
    $('#studio-save').textContent=selection.has(work.id)?'♥ Nella tua selezione':'♡ Aggiungi alla selezione';
    $('#studio-save').setAttribute('aria-pressed',String(selection.has(work.id)));
    $('#ar-container').replaceChildren(); $('#studio-ar').disabled=!config.arModels?.[work.id];
    const offer=offerFor(work, config), area=$('#studio-offer'); area.replaceChildren();
    const details=document.createElement('p');
    details.textContent=offer ? [offer.label,offer.edition,offer.priceLabel,offer.description].filter(Boolean).join(' · ') : 'Questa fotografia è esposta per la visita. Un’edizione acquistabile non è ancora pubblicata.';
    area.append(details);
    if (offer?.rights) { const p=document.createElement('p');p.textContent=offer.rights;area.append(p); }
    for (const [url,label] of [[offer?.checkout,'Acquista la stampa ↗'],[offer?.nft,'Scopri l’edizione digitale ↗']]) if(url) {
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=label;a.className='studio-primary';area.append(a);
    }
    updateWall();
  }
  function updateWall() {
    const height=Number($('#print-height').value), stage=$('#wall-stage');
    const image=$('#wall-print');
    const aspect=image.naturalWidth && image.naturalHeight ? image.naturalWidth/image.naturalHeight : 2/3;
    image.style.height=`${height/270*100}%`;
    image.style.borderColor=$('#print-frame').value;
    image.style.borderWidth=$('#print-frame').value==='transparent'?'0':'6px';
    $('#print-dimensions').textContent=`${Math.round(height*aspect)} × ${height} cm · altezza parete simulata 270 cm`;
    $('#wall-scale-note').textContent=userWall?'Foto personale: sovrapposizione indicativa, senza calibrazione metrica.':'Studio di proporzioni su parete simulata. I formati mostrati non sono un’offerta di vendita.';
    stage.style.backgroundColor=$('#wall-color').value;
  }
  const select=$('#studio-work');
  for(const w of catalogue.works) { const o=document.createElement('option');o.value=w.id;o.textContent=w.title;select.append(o); }
  select.addEventListener('change',()=>showWork(catalogue.works.find(w=>w.id===select.value)));
  for(const w of WALLS){const o=document.createElement('option');o.value=w.color;o.textContent=w.label;$('#wall-color').append(o);}
  for(const id of ['print-height','print-frame','wall-color']) $('#'+id).addEventListener('input',updateWall);
  $('#wall-print').addEventListener('load',updateWall);
  for(const tab of dialog.querySelectorAll('[data-studio-tab]')) tab.addEventListener('click',()=>setMode(tab.dataset.studioTab));
  $('#studio-hd').addEventListener('click',()=>{ dialog.close();inspect(active.id); });
  $('#studio-save').addEventListener('click',()=>{ selection.toggle(active.id);showWork(active);status(); });
  $('#studio-export').addEventListener('click',()=>{
    const works=catalogue.works.filter(w=>selection.has(w.id));
    if(!works.length){$('#studio-note').textContent='Salva almeno un’opera prima di esportare la selezione.';return;}
    download(JSON.stringify(selectionDocument(works),null,2),'unconventionart-selezione.json');
    $('#studio-note').textContent='Selezione esportata: titoli, crediti e descrizioni. Non è un certificato di proprietà.';
  });
  $('#studio-route').addEventListener('click',()=>{dialog.close();tour();});
  function answer(q) { stopVoice();$('#studio-answer').textContent=editorialAnswer(q,active,catalogue.collections.find(c=>c.id===active.collection)); }
  for(const b of dialog.querySelectorAll('[data-question]')) b.addEventListener('click',()=>answer(b.dataset.question));
  $('#studio-question-form').addEventListener('submit',e=>{e.preventDefault();answer($('#studio-question').value);});
  $('#studio-voice').addEventListener('click',()=>{
    if(narration){stopVoice();return;}
    if(!('speechSynthesis' in window)){ $('#studio-note').textContent='La lettura vocale non è disponibile in questo browser.'; return; }
    const voices=speechSynthesis.getVoices().filter(v=>v.localService && v.lang.startsWith('it'));
    if(!voices.length){$('#studio-note').textContent='Nessuna voce italiana locale disponibile. Puoi leggere il racconto qui sotto.';return;}
    narration=new SpeechSynthesisUtterance($('#studio-answer').textContent);narration.voice=voices[0];narration.lang='it-IT';narration.rate=.92;
    narration.onend=()=>{narration=null;$('#studio-voice').textContent='Ascolta';};narration.onerror=()=>{stopVoice();$('#studio-note').textContent='Lettura interrotta. Il testo resta disponibile.';};
    speechSynthesis.speak(narration);$('#studio-voice').textContent='Ferma la voce';
  });
  $('#wall-upload').addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>15*1024*1024){$('#studio-note').textContent='Scegli una foto JPG, PNG o WebP fino a 15 MB.';return;}
    if(userWall)URL.revokeObjectURL(userWall);userWall=URL.createObjectURL(f);$('#wall-stage').style.backgroundImage=`url("${userWall}")`;updateWall();
  });
  $('#wall-reset').addEventListener('click',()=>{ if(userWall)URL.revokeObjectURL(userWall);userWall=null;$('#wall-stage').style.backgroundImage='';$('#wall-upload').value='';updateWall(); });
  $('#studio-ar').addEventListener('click',async()=>{
    const spec=config.arModels?.[active.id];if(!spec)return;
    const token=++renderToken;$('#studio-note').textContent='Preparazione dell’anteprima 3D…';
    try {
      viewerImport ||= import('../../ar-runtime/node_modules/@google/model-viewer/dist/model-viewer.min.js');await viewerImport;
      if(token!==renderToken || !dialog.open || mode!=='wall')return;
      const viewer=document.createElement('model-viewer');viewer.src=spec.src;viewer.alt=`${active.title}, prova di stampa ${spec.widthCm} × ${spec.heightCm} cm`;
      for(const [k,v] of Object.entries({'camera-controls':'','ar':'','ar-placement':'wall','ar-modes':'webxr scene-viewer quick-look','ar-scale':'fixed','shadow-intensity':'0.6','touch-action':'pan-y'}))viewer.setAttribute(k,v);
      viewer.addEventListener('error',()=>{$('#studio-note').textContent='Anteprima 3D non disponibile. Puoi usare la simulazione sulla parete.';});
      viewer.addEventListener('load',()=>{if(token===renderToken)$('#studio-note').textContent=`Modello dimostrativo: altezza ${spec.heightCm} cm. Usa il pulsante AR sui dispositivi compatibili.`;});
      viewer.addEventListener('ar-status',e=>{if(e.detail.status==='failed')$('#studio-note').textContent='AR non disponibile in questo browser. L’anteprima 3D resta utilizzabile.';});
      $('#ar-container').replaceChildren(viewer);
    }catch{viewerImport=null;$('#studio-note').textContent='Non è stato possibile caricare l’anteprima. Riprova.';}
  });
  for(const hall of halls){
    const b=document.createElement('button');b.className='chapter-card';b.style.setProperty('--chapter-color',`#${hall.profile.color.toString(16).padStart(6,'0')}`);
    const n=document.createElement('span');n.textContent=String(hall.index+1).padStart(2,'0');const title=document.createElement('strong');title.textContent=hall.profile.name;const p=document.createElement('p');p.textContent=hall.profile.mood;
    b.append(n,title,p);b.addEventListener('click',()=>{dialog.close();visit(hall.index);});$('#studio-chapters').append(b);
  }
  const roomLink=()=>{
    const live=secureLink(config.services?.liveRoomUrl,['meet.google.com','zoom.us','meet.jit.si']);
    if(live){const a=document.createElement('a');a.href=live;a.target='_blank';a.rel='noopener';a.textContent='Entra nella visita dal vivo ↗';$('#studio-events').append(a);}
    for(const event of config.events || []){
      const url=secureLink(event.url,['eventbrite.it','eventbrite.com','lu.ma','luma.com']);if(!url || !event.title || !event.startsAt || !Number.isFinite(Date.parse(event.startsAt)) || Date.parse(event.startsAt)<Date.now())continue;
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=`${event.title} · ${new Date(event.startsAt).toLocaleString('it-IT')} ↗`;$('#studio-events').append(a);
    }
    if(!$('#studio-events').children.length)$('#studio-events').textContent='Le prossime visite con l’autore saranno annunciate qui.';
  };
  fetch('data/experience.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{config=x;showWork(active);roomLink();}).catch(()=>{roomLink();});
  dialog.addEventListener('close',()=>{stopVoice();stopSequence();stopAudio();renderToken++;$('#ar-container').replaceChildren();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice();stopSequence();stopAudio();}});
  showWork(active);setMode('discover');
  return { open(id, next='discover'){showWork(catalogue.works.find(w=>w.id===id)||active);setMode(next);} };
}
