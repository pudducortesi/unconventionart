// Loaded with Studio only. No request is sent until an HTTPS backend is configured.
export async function connectCollectorService(base, work, note) {
  let root;
  try { root = new URL(base); if(root.protocol !== 'https:' || root.username || root.password || root.search || root.hash) return null; }
  catch { return null; }
  const endpoint = path => new URL(path, root.origin).href;
  const response = await fetch(endpoint('/v1/catalogue'), { signal: AbortSignal.timeout(6000), credentials: 'omit' });
  if (!response.ok) return null;
  const { services } = await response.json();
  const post = async (path, value) => {
    const response = await fetch(endpoint(path), { method:'POST', credentials:'omit', headers:{'Content-Type':'application/json'}, body:JSON.stringify(value), signal:AbortSignal.timeout(16000) });
    const result = await response.json();
    if(!response.ok) throw Error(result.error || 'Servizio non disponibile.');
    return result;
  };
  const create = (tag, text) => { const node=document.createElement(tag);if(text)node.textContent=text;return node; };
  if (services?.inquiries && /^https:\/\//.test(services.privacyUrl)) {
    const form=create('form');form.className='collector-inquiry';
    form.append(create('h4','Parliamo di questa opera'), create('p','Chiedi informazioni all’autore. L’invio non è un acquisto né una prenotazione.'));
    const fields={};
    for(const [key,label,type,max] of [['name','Nome','text',100],['email','Email','email',254],['message','La tua richiesta','textarea',2000]]){
      const wrapper=create('label',label), input=create(type==='textarea'?'textarea':'input');
      if(type!=='textarea') input.type=type;
      input.name=key;input.required=true;input.maxLength=max;
      if(key!=='message')input.autocomplete=key==='name'?'name':'email';
      wrapper.append(input);form.append(wrapper);fields[key]=input;
    }
    const label=create('label'), consent=create('input');consent.type='checkbox';consent.required=true;
    const link=create('a','informativa privacy ↗');link.href=services.privacyUrl;link.target='_blank';link.rel='noopener';
    label.append(consent,document.createTextNode(' Ho letto l’'),link);form.append(label);
    const submit=create('button','Invia richiesta');submit.type='submit';form.append(submit);
    const result=create('p');result.setAttribute('role','status');form.append(result);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(submit.disabled)return;
      const selected=work();submit.disabled=true;result.textContent='Invio in corso…';
      try {
        const value=await post('/v1/inquiries',{workId:selected.id,name:fields.name.value,email:fields.email.value,message:fields.message.value,privacyAccepted:consent.checked});
        result.textContent=`${selected.title} · ${value.message} Riferimento: ${value.id}`;form.reset();
      } catch(error){result.textContent=`${error.name==='TimeoutError'?'Conferma non ricevuta: la richiesta potrebbe essere arrivata. Evita invii ripetuti.':error.message}`;}
      finally{submit.disabled=false;}
    });
    document.querySelector('#studio-offer').after(form);
  }
  if (!services?.curator) return null;
  const label=create('label'), opt=create('input');opt.type='checkbox';
  label.className='curator-opt-in';label.append(opt,document.createTextNode(' Usa il curatore AI: la domanda sarà inviata al servizio esterno. Non inserire dati personali. Le risposte possono contenere errori.'));
  document.querySelector('#studio-question-form').before(label);
  note('Curatore AI disponibile su richiesta. La guida editoriale resta attiva.');
  return { async answer(question) { if(!opt.checked)return null;return post('/v1/curator',{workId:work().id,question}); } };
}
