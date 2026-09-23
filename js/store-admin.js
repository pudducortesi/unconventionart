import {offerURL} from './museum/social-model.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
export function mountOfferEditor(card,work,offers,{request,notice}) {
  const details=el('details'),summary=el('summary','Edizioni e NFT'),form=el('form');details.className='offer-admin';details.append(summary,form);card.append(details);
  const fields={};
  function field(key,label,tag='input'){const l=el('label',label),input=el(tag);fields[key]=input;l.append(input);form.append(l);return input;}
  const kind=field('kind','Tipo di edizione','select');for(const [value,label] of [['print','Stampa'],['digital','Edizione digitale'],['nft','NFT']])kind.append(new Option(label,value));
  const amount=field('amount','Prezzo indicativo in euro');amount.inputMode='decimal';amount.required=true;amount.placeholder='150,00';
  const rights=field('rights','Diritti inclusi e condizioni','textarea');rights.required=true;rights.minLength=10;rights.maxLength=2000;
  const chain=field('chain','Rete NFT','select');for(const [value,label] of [['ethereum','Ethereum'],['base','Base'],['matic','Polygon']])chain.append(new Option(label,value));
  const contract=field('contract','Indirizzo del contratto NFT');contract.placeholder='0x…';contract.maxLength=42;
  const token=field('token_id','ID del token');token.inputMode='numeric';token.maxLength=100;
  const url=field('checkout_url','Link di pagamento Stripe / opera su OpenSea');url.type='url';url.required=true;url.maxLength=1000;
  const state=el('p'),actions=el('div'),save=el('button','Salva bozza'),publish=el('button','Pubblica offerta'),withdraw=el('button','Ritira offerta');actions.className='actions';save.type='submit';publish.type=withdraw.type='button';actions.append(save,publish,withdraw);form.append(state,actions,el('p','La pubblicazione espone il link. Prezzo, disponibilità e consegna devono essere configurati anche su Stripe o sul marketplace. Non viene creato né trasferito alcun NFT.'));
  let current;
  function show(){current=offers.find(o=>o.work_id===work.id&&o.kind===kind.value);amount.value=current?(current.amount_minor/100).toFixed(2):'';rights.value=current?.rights||'';url.value=current?.checkout_url||'';chain.value=current?.chain||'ethereum';contract.value=current?.contract||'';token.value=current?.token_id||'';for(const input of [chain,contract,token])input.closest('label').hidden=kind.value!=='nft';state.textContent=current?.published?'Offerta pubblicata':current?'Bozza salvata':'Nessuna offerta configurata';withdraw.hidden=!current;publish.disabled=!work.published;if(!work.published)state.textContent+=' · Pubblica prima l’opera';}
  kind.onchange=show;show();
  async function persist(published){
    if(!form.reportValidity())return;
    const money=amount.value.trim().replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(money)){notice('Inserisci un prezzo con massimo due decimali.',true);return;}
    const data={work_id:work.id,kind:kind.value,amount_minor:Math.round(Number(money)*100),currency:'EUR',rights:rights.value.trim(),checkout_url:url.value.trim(),published,chain:kind.value==='nft'?chain.value:null,contract:kind.value==='nft'?contract.value.trim():null,token_id:kind.value==='nft'?token.value.trim():null};
    if(!offerURL(data)){notice('Controlla prezzo, diritti e link. Usa Stripe per stampe/file; per NFT inserisci il link OpenSea esatto del contratto e token indicati.',true);return;}
    save.disabled=publish.disabled=withdraw.disabled=true;
    try{const path=current?`/rest/v1/gallery_offers?work_id=eq.${work.id}&kind=eq.${kind.value}`:'/rest/v1/gallery_offers';await request(path,{method:current?'PATCH':'POST',body:data});if(current)Object.assign(current,data);else{current=data;offers.push(data);}notice(published?'Offerta pubblicata.':'Bozza dell’offerta salvata.');show();}catch(error){notice(error.message,true);}finally{save.disabled=withdraw.disabled=false;publish.disabled=!work.published;}
  }
  form.onsubmit=e=>{e.preventDefault();persist(false);};publish.onclick=()=>persist(true);
  withdraw.onclick=async()=>{if(!current)return;withdraw.disabled=true;try{await request(`/rest/v1/gallery_offers?work_id=eq.${work.id}&kind=eq.${kind.value}`,{method:'PATCH',body:{published:false}});current.published=false;show();notice('Offerta ritirata dalla galleria. Il link esterno va disattivato anche sul servizio di vendita.');}catch(error){notice(error.message,true);}finally{withdraw.disabled=false;}};
}
export function mountModeration({request,notice}) {
  const container=document.querySelector('#social-moderation');
  const button=el('button','Carica segnalazioni'),list=el('div');button.type='button';container.append(button,list);
  const rpc=async(action,payload={})=>(await request('/rest/v1/rpc/ua_social',{method:'POST',body:{action,payload}})).json();
  button.onclick=async()=>{button.disabled=true;try{const reports=await rpc('moderation');list.replaceChildren();if(!reports.length)list.append(el('p','Nessuna segnalazione ricevuta.'));for(const r of reports){const card=el('article'),suspend=el('button',r.suspended?'Riabilita profilo':'Sospendi profilo');card.append(el('h3',r.target_name),el('p',r.reason),el('small',new Date(r.created_at).toLocaleString('it-IT')),suspend);suspend.onclick=async()=>{suspend.disabled=true;try{await rpc('suspend',{target:r.target_id,suspended:!r.suspended});r.suspended=!r.suspended;suspend.textContent=r.suspended?'Riabilita profilo':'Sospendi profilo';notice(r.suspended?'Profilo sospeso dagli incontri.':'Profilo riabilitato.');}catch(error){notice(error.message,true);}finally{suspend.disabled=false;}};list.append(card);}}catch(error){notice(error.message,true);}finally{button.disabled=false;}};
  return {clear(){list.replaceChildren();}};
}
