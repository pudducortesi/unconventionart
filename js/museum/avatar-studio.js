import {AVATAR_OPTIONS,AVATAR_RANGES,normalizeAvatar} from './social-model.js';
import {createAvatarHistory,createLookStore,STUDIO_PRESETS,BODY_PRESETS,randomAvatar,exportAvatar,importAvatar} from './avatar-studio-state.js';

const labels={model:'Modello',skin:'Carnagione',hair:'Colore dei capelli',outfit:'Colore del capo',style:'Taglio',build:'Corporatura',glasses:'Occhiali',frame:'Montatura',garment:'Capo',beard:'Barba',eyes:'Colore degli occhi',trousers:'Pantaloni',shoes:'Scarpe',height:'Altezza',shoulders:'Spalle',waist:'Vita',hips:'Fianchi',faceWidth:'Larghezza del viso',jaw:'Mascella',nose:'Naso',eyeSize:'Dimensione degli occhi',lipSize:'Labbra'};
const names={classic:'Essenziale',studio:'Studio · stilizzato',atelier:'Atelier · figura femminile',none:'Senza',round:'Tondi',square:'Rettangolari',black:'Nera',tortoise:'Tartarugata',gold:'Dorata',short:'Corti',bob:'Caschetto',long:'Lunghi',shaved:'Rasati',bald:'Senza capelli',bun:'Chignon',mohawk:'Cresta',slim:'Snella',regular:'Regolare',broad:'Robusta',jacket:'Giacca',shirt:'Camicia',tshirt:'T-shirt',dress:'Abito',stubble:'Corta',full:'Completa',moustache:'Baffi'};
const groups=[['Corpo',['model','skin','build','height','shoulders','waist','hips']],['Volto',['faceWidth','jaw','nose','eyeSize','eyes','lipSize']],['Capelli e barba',['style','hair','beard']],['Guardaroba',['garment','outfit','trousers','shoes','glasses','frame']]];
const atelierFields=new Set(['model','skin','build','height','style','hair','outfit','glasses','frame','shoulders','waist','hips','faceWidth','jaw','nose','eyeSize','lipSize','trousers','shoes','garment']);
export function mountAvatarStudio(host,{initial,onChange,note}){
  const history=createAvatarHistory(initial);let storage;try{storage=globalThis.localStorage;}catch{}
  const looks=createLookStore(storage),controls=new Map();
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
  const guarded=fn=>async()=>{try{await fn();}catch(error){note(error.message,true);}};
  const toolbar=el('div');toolbar.className='social-actions';
  const undo=button('Annulla',()=>apply(history.undo())),redo=button('Ripristina',()=>apply(history.redo()));
  toolbar.append(undo,redo,button('Sorprendimi',()=>commit(randomAvatar(Math.random,history.value.model))));host.append(toolbar);
  const status=el('p');status.className='social-caption';host.append(status);
  const presetArea=el('div');presetArea.className='social-actions';presetArea.setAttribute('aria-label','Look di partenza');
  for(const preset of STUDIO_PRESETS)presetArea.append(button(preset.name,()=>commit(preset.avatar)));host.append(presetArea);
  for(const [title,keys]of groups){
    const section=el('details');section.className='avatar-category';section.open=title==='Corpo';section.append(el('summary',title));
    if(title==='Corpo'){const shapes=el('div');shapes.className='social-actions';shapes.setAttribute('aria-label','Corporature di partenza');for(const preset of BODY_PRESETS)shapes.append(button(preset.name,()=>commit({...history.value,...preset.avatar})));section.append(shapes);}
    for(const key of keys){
      const field=el('fieldset');field.append(el('legend',labels[key]));const inputs=[];
      if(AVATAR_RANGES[key]){
        const [min,max]=AVATAR_RANGES[key],input=el('input'),output=el('output');input.type='range';input.min=min;input.max=max;input.step=1;input.name=key;input.id='avatar-'+key;input.setAttribute('aria-label',labels[key]);output.htmlFor=input.id;
        input.oninput=()=>{output.value=input.value+'%';onChange(normalizeAvatar({...history.value,[key]:Number(input.value)}));};
        input.onchange=()=>commit({...history.value,[key]:Number(input.value)});inputs.push(input);field.append(input,output);
      }else{
        for(const [i,value]of AVATAR_OPTIONS[key].entries()){
          const label=el('label'),input=el('input');input.type='radio';input.name=key;input.value=value;input.setAttribute('aria-label',names[value]||`${labels[key]} ${i+1}`);label.append(input);
          if(value.startsWith('#')){label.className='social-swatch';label.style.setProperty('--swatch',value);}else label.append(el('span',names[value]));
          input.onchange=()=>commit({...history.value,[key]:value});inputs.push(input);field.append(label);
        }
      }
      controls.set(key,{field,inputs});section.append(field);
    }
    host.append(section);
  }
  const local=el('details');local.className='avatar-category';local.append(el('summary','I miei look'));
  local.append(el('p','Fino a 8 look su questo dispositivo. “Salva avatar” pubblica il look attuale nel tuo profilo.'));
  const nameLabel=el('label','Nome del look'),nameInput=el('input');nameInput.maxLength=32;nameInput.placeholder='Es. Serata in galleria';nameLabel.append(nameInput);local.append(nameLabel);
  const list=el('div');
  local.append(button('Memorizza look',guarded(()=>{looks.save(nameInput.value,history.value);nameInput.value='';renderLooks();note('Look memorizzato sul dispositivo.');})),list);host.append(local);
  function renderLooks(){list.replaceChildren();for(const [i,look]of looks.read().entries()){const row=el('div');row.className='social-actions';row.append(button(look.name,()=>commit(look.avatar)),button('Elimina '+look.name,guarded(()=>{looks.remove(i);renderLooks();})));list.append(row);}}
  const transfer=el('div');transfer.className='social-actions';
  transfer.append(button('Esporta avatar',()=>{const url=URL.createObjectURL(new Blob([exportAvatar(history.value)],{type:'application/json'})),link=el('a');link.href=url;link.download='unconventionart-avatar.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
  const file=el('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
  file.onchange=guarded(async()=>{try{const selected=file.files[0];if(!selected)return;if(selected.size>12000)throw Error('File avatar troppo grande.');commit(importAvatar(await selected.text()));note('Avatar importato. Salvalo nel profilo per usarlo negli incontri.');}finally{file.value='';}});
  transfer.append(button('Importa avatar',()=>file.click()),file);host.append(transfer);
  function refresh(){const value=history.value;undo.disabled=!history.canUndo;redo.disabled=!history.canRedo;
    status.textContent=value.model==='atelier'?'Atelier: cinque corporature di partenza, volto e quattro capi. L’abito comprende una gonna con leggings. Barba e colore degli occhi sono disponibili in Studio.':'Studio: personalizza proporzioni, viso e capi. Le modifiche restano in bozza fino a “Salva avatar”.';
    for(const [key,{field,inputs}]of controls){field.disabled=value.model==='atelier'&&!atelierFields.has(key);for(const input of inputs){if(input.type==='range'){input.value=value[key];field.querySelector('output').value=value[key]+'%';}else input.checked=value[key]===input.value;}}
  }
  function apply(value){refresh();onChange(value);}
  function commit(value){history.set(value);apply(history.value);}
  refresh();renderLooks();
  return {load(value){history.reset(value);apply(history.value);}};
}
