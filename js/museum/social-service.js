const KEY='ua-social-session-v1';
const errors={ua_login_required:'Accedi per partecipare.',ua_suspended:'Questo profilo è sospeso.',ua_rate_limit:'Attendi un momento e riprova.',ua_profile_required:'Salva prima il tuo avatar.',ua_room_limit:'Hai già tre incontri attivi. Chiudine uno prima di crearne altri.',ua_room_full:'Incontro completo: massimo 16 partecipanti.',ua_invite_invalid:'Invito scaduto o non disponibile.',ua_room_denied:'L’incontro è terminato o non è più accessibile.',ua_forbidden:'Operazione non consentita.',ua_invalid_profile:'Usa un nome tra 2 e 32 caratteri.',ua_invalid_avatar:'Seleziona le opzioni disponibili per l’avatar.',ua_target_invalid:'La persona ha lasciato l’incontro.'};
export async function createSocialService(fetcher=fetch, storage=globalThis.sessionStorage) {
  const configResponse=await fetcher('data/publishing.json',{cache:'no-store'});
  if(!configResponse.ok)throw Error('Connessione agli incontri non disponibile.');
  const config=await configResponse.json();
  if(!config.enabled||!config.supabaseUrl||!config.publishableKey)throw Error('Gli incontri non sono ancora disponibili.');
  let session=null,refreshing=null;
  try{session=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
  const save=value=>{session=value;try{if(value)storage?.setItem(KEY,JSON.stringify(value));else storage?.removeItem(KEY);}catch{}};
  async function raw(path,{method='GET',body,auth=true}={}) {
    const response=await fetcher(config.supabaseUrl+path,{method,signal:AbortSignal.timeout(15000),headers:{apikey:config.publishableKey,...(auth&&session?{Authorization:`Bearer ${session.access_token}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    let data=null;try{data=await response.json();}catch{}
    if(!response.ok){
      const code=data?.message||data?.msg||data?.error_description||data?.error;
      let message=errors[code]||'Operazione non riuscita. Controlla la connessione e riprova.';
      if(path.includes('/auth/'))message=response.status===429?'Troppi tentativi. Attendi prima di riprovare.':code?.toLowerCase().includes('signup')?'Le registrazioni non sono ancora aperte. Usa un account già abilitato.':code?.includes('Email not confirmed')?'Conferma prima la tua email.':'Accesso non riuscito. Controlla email e password.';
      if(response.status===401&&auth){save(null);message='Sessione scaduta. Accedi di nuovo.';}
      const error=Error(message);error.code=code;error.status=response.status;throw error;
    }
    return data;
  }
  async function fresh(){
    if(!session)throw Error('Accedi per partecipare.');
    if(session.expires_at*1000>Date.now()+90000)return;
    refreshing ||= raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:session.refresh_token}}).then(save).catch(error=>{save(null);throw error;}).finally(()=>{refreshing=null;});
    await refreshing;
  }
  return {
    get user(){return session?.user||null;},
    async settings(){return raw('/auth/v1/settings',{auth:false});},
    async login(email,password){save(await raw('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}}));},
    async signup(email,password){const result=await raw('/auth/v1/signup',{method:'POST',auth:false,body:{email,password}});if(result?.access_token)save(result);return !!result?.access_token;},
    async logout(){try{await raw('/auth/v1/logout?scope=local',{method:'POST'});}finally{save(null);}},
    async rpc(action,payload={}){await fresh();return raw('/rest/v1/rpc/ua_social',{method:'POST',body:{action,payload}});},
    async offers(){return raw('/rest/v1/gallery_offers?select=*&published=eq.true',{auth:false});},
  };
}
